import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { puedeVerCostoDelben, esRolDistribuidor, esRolDelben, type Rol } from '@delben/firebase'
import {
  aplicarDescuento,
  descuentoModuloPct,
  descuentoHerrajePct,
  convertirMoneda,
  type ModalidadCatalogo,
} from '@/lib/catalogo-precios'
import type { ItemCatalogo, RespuestaCatalogo } from '@/lib/catalogo-tipos'

// firebase-admin necesita el runtime de Node (no edge). Sin cache: la respuesta
// depende del rol del usuario.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // 1. Identidad: lo ÚNICO que se acepta del cliente es su ID token. Se verifica
  //    con el Admin SDK; el rol NO se toma de ningún parámetro del cliente.
  const authz = request.headers.get('authorization') ?? ''
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let uid: string
  try {
    uid = (await adminAuth().verifyIdToken(token)).uid
  } catch {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  // 2. Parámetros.
  const sedeId = request.nextUrl.searchParams.get('sedeId')
  const distribuidorIdParam = request.nextUrl.searchParams.get('distribuidorId')
  const modalidadParam = request.nextUrl.searchParams.get('modalidad')
  if (!sedeId || (modalidadParam !== 'tradicional' && modalidadParam !== 'desarmado')) {
    return NextResponse.json({ error: 'Faltan sedeId o modalidad' }, { status: 400 })
  }
  const modalidad: ModalidadCatalogo = modalidadParam

  // 3. Rol desde Firestore (fuente de verdad en servidor; no del cliente).
  const db = adminDb()
  const userSnap = await db.doc(`usuarios/${uid}`).get()
  if (!userSnap.exists) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 })
  const u = userSnap.data()!
  const rol = u['rol'] as Rol
  const esDelben = esRolDelben(rol)
  const esDist = esRolDistribuidor(rol)
  if (!esDelben && !esDist) {
    return NextResponse.json({ error: 'Catálogo no disponible para este rol' }, { status: 403 })
  }

  // ¿Sobre qué distribuidor se consulta?
  //   • Distribuidor: SIEMPRE su propio tenant (se ignora cualquier param → aislamiento).
  //   • Delben: elige distribuidor (param), puede ver cualquiera.
  let distribuidorId: string
  if (esDist) {
    const propio = u['distribuidor_id'] as string | null
    if (!propio) return NextResponse.json({ error: 'Usuario sin distribuidor' }, { status: 403 })
    distribuidorId = propio
  } else {
    if (!distribuidorIdParam) {
      return NextResponse.json({ error: 'Falta distribuidorId' }, { status: 400 })
    }
    distribuidorId = distribuidorIdParam
  }

  // 4. Sede dentro de ese distribuidor + control de acceso por sede.
  const sedeSnap = await db.doc(`distribuidores/${distribuidorId}/sedes/${sedeId}`).get()
  if (!sedeSnap.exists) return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
  const sede = sedeSnap.data() as {
    descuento_muebles_pct: number
    descuento_herrajes_pct: number
    pais: string
  }
  // Delben ve cualquier sede del distribuidor elegido. Para roles de distribuidor:
  // el admin ve todas las suyas; costos/comercial solo las asignadas.
  const accesoSede =
    esDelben ||
    rol === 'distribuidor_admin' ||
    u['todas_las_sedes'] === true ||
    (Array.isArray(u['sedes_asignadas']) && u['sedes_asignadas'].includes(sedeId))
  if (!accesoSede) return NextResponse.json({ error: 'Sin acceso a esta sede' }, { status: 403 })

  // 5. ¿Este rol puede ver el precio con descuento? Decide qué se ENVÍA (no qué se oculta).
  const verCosto = puedeVerCostoDelben(rol)

  // 6. Moneda derivada de la sede + tasa vigente (mismo criterio de moneda que el motor).
  const esColombia = sede.pais.trim().toLowerCase() === 'colombia'
  const moneda: 'COP' | 'USD' = esColombia ? 'COP' : 'USD'
  let tasaUsd = 4000
  if (!esColombia) {
    const tasaSnap = await db
      .collection('tasa_usd_historial')
      .orderBy('vigente_desde', 'desc')
      .limit(1)
      .get()
    const v = tasaSnap.empty ? null : tasaSnap.docs[0]!.data()['valor']
    if (typeof v === 'number' && v > 0) tasaUsd = v
  }

  // 7. Catálogo: categorías (para el descuento de desarmado), módulos y herrajes activos.
  const [catsSnap, modsSnap, accsSnap] = await Promise.all([
    db.collection('categorias').get(),
    db.collection('modulos').where('activo', '==', true).get(),
    db.collection('accesorios').where('activo', '==', true).get(),
  ])

  const descBaseDesarmado = new Map<string, number>()
  catsSnap.forEach((d) => {
    const c = d.data()
    if (typeof c['desc_desarmado_base_pct'] === 'number') {
      descBaseDesarmado.set(d.id, c['desc_desarmado_base_pct'])
    }
  })

  const items: ItemCatalogo[] = []

  // Módulos (dedup por nombre, igual que el buscador admin).
  const vistosMod = new Set<string>()
  modsSnap.forEach((d) => {
    const m = d.data()
    const nombre = (m['nombre'] as string) ?? ''
    if (vistosMod.has(nombre)) return
    vistosMod.add(nombre)
    const precioMin = typeof m['precio_min'] === 'number' ? (m['precio_min'] as number) : null
    const categoriaId = (m['categoria_id'] as string) ?? null
    const item: ItemCatalogo = {
      tipo: 'modulo',
      id: d.id,
      nombre,
      subtitulo: (m['tipologia'] as string) ?? '',
      categoria_id: categoriaId,
      imagen_url: (m['imagen_url'] as string) ?? null,
      precioLista: precioMin === null ? null : convertirMoneda(precioMin, moneda, tasaUsd),
    }
    // Solo se adjunta el precio con descuento si el rol puede verlo. Para el
    // comercial el campo NO existe en la respuesta — no viaja al navegador.
    if (verCosto && precioMin !== null) {
      const cat = categoriaId
        ? { desc_desarmado_base_pct: descBaseDesarmado.get(categoriaId) ?? 0 }
        : null
      const pct = descuentoModuloPct(modalidad, sede, cat)
      item.precioConDescuento = convertirMoneda(aplicarDescuento(precioMin, pct), moneda, tasaUsd)
      item.descuentoPct = pct
    }
    items.push(item)
  })

  // Herrajes disponibles en la modalidad elegida.
  accsSnap.forEach((d) => {
    const a = d.data()
    const disponible =
      modalidad === 'tradicional' ? a['disponible_tradicional'] : a['disponible_desarmado']
    if (!disponible) return
    const listaCop =
      modalidad === 'tradicional' ? a['precio_tradicional_cop'] : a['precio_desarmado_cop']
    const lista = typeof listaCop === 'number' ? (listaCop as number) : null
    const item: ItemCatalogo = {
      tipo: 'herraje',
      id: d.id,
      nombre: (a['nombre'] as string) ?? '',
      subtitulo: `cód. ${a['codigo'] ?? ''}`,
      categoria_id: null,
      imagen_url: (a['imagen_url'] as string) ?? null,
      precioLista: lista === null ? null : convertirMoneda(lista, moneda, tasaUsd),
    }
    if (verCosto && lista !== null) {
      const pct = descuentoHerrajePct(modalidad, sede)
      item.precioConDescuento = convertirMoneda(aplicarDescuento(lista, pct), moneda, tasaUsd)
      item.descuentoPct = pct
    }
    items.push(item)
  })

  const respuesta: RespuestaCatalogo = { moneda, puedeVerCosto: verCosto, items }
  return NextResponse.json(respuesta)
}
