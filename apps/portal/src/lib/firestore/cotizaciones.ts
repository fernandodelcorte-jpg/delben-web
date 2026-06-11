import {
  collection,
  collectionGroup,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  query,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type {
  CotizacionDoc,
  Cotizacion,
  DistribuidorDoc,
  SedeDoc,
  ContadorDoc,
  ItemCotizacionSnapshot,
  ItemHerraCotizacionSnapshot,
  ItemEspecialSnapshot,
  TotalesCotizacion,
} from '@/lib/firebase/tipos-firestore'

// Se lanza cuando el distribuidor o la sede no tienen sigla configurada: sin sigla
// no se puede formar el número consecutivo, así que NO se guarda (ni se consume número).
export class SiglaFaltanteError extends Error {
  constructor() {
    super(
      'El distribuidor o la sede no tienen sigla configurada (necesaria para el número de cotización). ' +
        'Pide al super_admin de Delben que la configure antes de guardar.',
    )
    this.name = 'SiglaFaltanteError'
  }
}
import type { ItemCarrito, ItemHerrajeCarrito, ItemEspecial, CotizacionInfo } from '@/store/carrito'

// ─── Path helper ──────────────────────────────────────────────────────────────

function cotizacionPath(distribuidorId: string, proyectoId: string, cotizacionId?: string) {
  const base = `distribuidores/${distribuidorId}/proyectos/${proyectoId}/cotizaciones`
  return cotizacionId ? `${base}/${cotizacionId}` : base
}

// ─── Serialización ────────────────────────────────────────────────────────────

function serializarItems(items: ItemCarrito[]): ItemCotizacionSnapshot[] {
  return items.map((item) => ({
    modulo_id: item.modulo.id,
    modulo_nombre: item.modulo.nombre,
    modulo_tipologia: item.modulo.tipologia,
    config: {
      tipoEstructuraId: item.config.tipoEstructuraId,
      tipoEstructuraNombre: item.config.tipoEstructuraNombre,
      tipoFachadaId: item.config.tipoFachadaId,
      tipoFachadaNombre: item.config.tipoFachadaNombre,
      subcategoriaId: item.config.subcategoriaId,
      subcategoriaNombre: item.config.subcategoriaNombre,
      acabadoId: item.config.acabadoId,
      acabadoNombre: item.config.acabadoNombre,
      acabadoEstructura: item.config.acabadoEstructura,
      colorVidrio: item.config.colorVidrio,
      colorMetal: item.config.colorMetal,
      altura: item.config.altura,
      profundidad: item.config.profundidad,
      cantidad: item.config.cantidad,
      observaciones: item.config.observaciones,
    },
    resultado: { ...item.resultado },
    herrajesAsociados: item.herrajesAsociados.map((h) => ({
      accesorio_id: h.accesorio.id,
      codigo: h.accesorio.codigo,
      nombre: h.accesorio.nombre,
      cantidad: h.cantidad,
      resultado: { ...h.resultado },
    })),
  }))
}

function serializarItemsHerraje(items: ItemHerrajeCarrito[]): ItemHerraCotizacionSnapshot[] {
  return items.map((item) => ({
    accesorio_id: item.accesorio.id,
    codigo: item.accesorio.codigo,
    nombre: item.accesorio.nombre,
    cantidad: item.cantidad,
    resultado: { ...item.resultado },
  }))
}

// Firestore rechaza `undefined`: las refs a módulo se omiten cuando no existen.
function serializarEspeciales(items: ItemEspecial[]): ItemEspecialSnapshot[] {
  return items.map((item) => ({
    nombre: item.nombre,
    tipoEstructuraNombre: item.tipoEstructuraNombre,
    tipoFachadaNombre: item.tipoFachadaNombre,
    acabadoNombre: item.acabadoNombre,
    acabadoEstructura: item.acabadoEstructura,
    colorVidrio: item.colorVidrio,
    ancho: item.ancho,
    alto: item.alto,
    profundidad: item.profundidad,
    cantidad: item.cantidad,
    precioDelbenUnitario: item.precioDelbenUnitario,
    precioClienteUnitario: item.precioClienteUnitario,
    observaciones: item.observaciones,
    herrajes: item.herrajes.map((h) => ({
      accesorioId: h.accesorioId,
      nombre: h.nombre,
      codigo: h.codigo,
      cantidad: h.cantidad,
    })),
    ...(item.moduloReferenciaId ? { moduloReferenciaId: item.moduloReferenciaId } : {}),
    ...(item.moduloReferenciaNombre ? { moduloReferenciaNombre: item.moduloReferenciaNombre } : {}),
    ...(item.resultado ? { resultado: { ...item.resultado } } : {}),
  }))
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function guardarCotizacion(
  distribuidorId: string,
  createdBy: string,
  info: CotizacionInfo,
  items: ItemCarrito[],
  itemsHerraje: ItemHerrajeCarrito[],
  itemsEspeciales: ItemEspecial[],
  totales: TotalesCotizacion,
): Promise<string> {
  if (!info.proyectoId) throw new Error('proyectoId requerido para guardar una cotización')
  const proyectoId = info.proyectoId
  const sedeId = info.sedeId

  const ahora = Date.now()
  const data: CotizacionDoc = {
    distribuidor_id: distribuidorId,
    sede_id: sedeId,
    clienteNombre: info.clienteNombre,
    ...(info.clienteDireccion ? { clienteDireccion: info.clienteDireccion } : {}),
    proyectoNombre: info.proyectoNombre,
    categoriaId: info.categoriaId,
    categoriaNombre: info.categoriaNombre,
    modalidad: info.modalidad,
    fecha: new Date(info.fecha).getTime(),
    estado: 'borrador',
    proyecto_id: proyectoId,
    // Campos opcionales: se OMITEN si no existen (Firestore rechaza `undefined`).
    // Mismo patrón que clienteDireccion arriba. Una cotización legacy sin
    // espacio_nombre, o sin versión, no debe bloquear el guardado (p. ej. al duplicar).
    ...(info.espacioNombre ? { espacio_nombre: info.espacioNombre } : {}),
    ...(info.version !== undefined ? { version: info.version } : {}),
    items: serializarItems(items),
    itemsHerraje: serializarItemsHerraje(itemsHerraje),
    itemsEspeciales: serializarEspeciales(itemsEspeciales),
    totales,
    createdBy,
    createdAt: ahora,
    updatedAt: ahora,
  }

  // ── Guardar SIEMPRE primero (esencial) ──────────────────────────────────────
  // La cotización se escribe de inmediato. Numerar es una operación APARTE y
  // best-effort: un permiso del contador desactualizado (reglas no desplegadas),
  // una sigla faltante o cualquier error de la numeración NO deben impedir que el
  // comercial guarde su trabajo (decisión 2026-06-05 — "guardar siempre"). Si el
  // número no se puede asignar ahora, la cotización queda guardada sin número y se
  // le asigna después, al abrirla (getCotizacion auto-sana). Ver asignarNumeroConsecutivo.
  const cotRef = doc(collection(db, cotizacionPath(distribuidorId, proyectoId)))
  await setDoc(cotRef, data)

  try {
    await asignarNumeroConsecutivo(distribuidorId, proyectoId, cotRef.id)
  } catch (e) {
    // No-op deliberado: la cotización YA quedó guardada. El número queda pendiente
    // y se asignará en la próxima apertura. Solo se registra para diagnóstico.
    console.warn('Cotización guardada sin número consecutivo (queda pendiente):', e)
  }

  return cotRef.id
}

// Asigna (idempotentemente) el número consecutivo a una cotización que aún no lo tiene.
// Formato SIGLA_DIST-SIGLA_SEDE-AÑO-####. Atómica: el contador
// (distribuidores/{id}/sedes/{sedeId}/contadores/{anio}) y el doc se actualizan en UNA
// transacción → sin duplicados ni huecos. Idempotente: si la cotización ya tiene número,
// no hace nada. LANZA si no se puede numerar (sin sede, siglas faltantes, permiso denegado);
// el llamador decide si eso es un error o solo "queda pendiente" (best-effort).
export async function asignarNumeroConsecutivo(
  distribuidorId: string,
  proyectoId: string,
  cotizacionId: string,
): Promise<string | null> {
  const cotRef = doc(db, cotizacionPath(distribuidorId, proyectoId, cotizacionId))
  const distRef = doc(db, 'distribuidores', distribuidorId)

  return runTransaction(db, async (tx) => {
    // Todas las LECTURAS antes de cualquier escritura (requisito de Firestore).
    const cotSnap = await tx.get(cotRef)
    if (!cotSnap.exists()) return null // la cotización no existe: nada que numerar
    const cot = cotSnap.data() as CotizacionDoc
    if (cot.numero_consecutivo) return cot.numero_consecutivo // ya numerada → idempotente

    const sedeId = cot.sede_id
    if (!sedeId) throw new SiglaFaltanteError() // sin sede no hay sigla de sede para el formato

    // El año se deriva de la fecha de creación de la cotización (no del momento de
    // numerar): una pendiente numerada más tarde conserva el año en que se creó y
    // casa con el contador de ese año.
    const baseMs = typeof cot.createdAt === 'number' ? cot.createdAt : cot.fecha
    const anio = new Date(typeof baseMs === 'number' ? baseMs : Date.now()).getFullYear()

    const sedeRef = doc(db, `distribuidores/${distribuidorId}/sedes/${sedeId}`)
    const contadorRef = doc(db, `distribuidores/${distribuidorId}/sedes/${sedeId}/contadores/${anio}`)

    const distSnap = await tx.get(distRef)
    const sedeSnap = await tx.get(sedeRef)
    const contSnap = await tx.get(contadorRef)

    const siglaDist = (distSnap.data() as DistribuidorDoc | undefined)?.sigla?.trim()
    const siglaSede = (sedeSnap.data() as SedeDoc | undefined)?.sigla?.trim()
    if (!siglaDist || !siglaSede) throw new SiglaFaltanteError()

    const ultimo = contSnap.exists() ? (contSnap.data() as ContadorDoc).ultimo : 0
    const nuevo = ultimo + 1
    const numero = `${siglaDist}-${siglaSede}-${anio}-${String(nuevo).padStart(4, '0')}`

    tx.set(contadorRef, { ultimo: nuevo, anio, updatedAt: Date.now() }, { merge: true })
    tx.update(cotRef, { numero_consecutivo: numero, numero_seq: nuevo, numero_anio: anio })
    return numero
  })
}

export async function actualizarCotizacion(
  distribuidorId: string,
  cotizacionId: string,
  info: CotizacionInfo,
  items: ItemCarrito[],
  itemsHerraje: ItemHerrajeCarrito[],
  itemsEspeciales: ItemEspecial[],
  totales: TotalesCotizacion,
): Promise<void> {
  if (!info.proyectoId) throw new Error('proyectoId requerido para actualizar una cotización')

  const ref = doc(db, cotizacionPath(distribuidorId, info.proyectoId, cotizacionId))
  await updateDoc(ref, {
    clienteNombre: info.clienteNombre,
    clienteDireccion: info.clienteDireccion ?? '',
    proyectoNombre: info.proyectoNombre,
    modalidad: info.modalidad,
    espacio_nombre: info.espacioNombre,
    version: info.version,
    items: serializarItems(items),
    itemsHerraje: serializarItemsHerraje(itemsHerraje),
    itemsEspeciales: serializarEspeciales(itemsEspeciales),
    totales,
    updatedAt: Date.now(),
  })
}

// Obtiene todas las cotizaciones de un distribuidor.
// Busca en: (1) path legacy /distribuidores/{id}/cotizaciones y
//           (2) /distribuidores/{id}/proyectos/{id}/cotizaciones
// Evita collectionGroup para no depender de índices de Firestore.
//
// sedesFiltro: aislamiento por sede para la query `list` (las reglas no son filtros).
//   • null     → sin filtro (super_admin, distribuidor_admin o todas_las_sedes).
//   • []        → el usuario no tiene sedes asignadas → no ve cotizaciones.
//   • [ids...]  → solo cotizaciones cuyo sede_id ∈ ids (where('sede_id','in', …)).
export async function getCotizaciones(
  distribuidorId: string,
  sedesFiltro?: string[] | null,
): Promise<Cotizacion[]> {
  // Sin sedes asignadas: nada que listar (evita un `in` con array vacío, que falla).
  if (sedesFiltro && sedesFiltro.length === 0) return []

  const colCot = (path: string) => {
    const col = collection(db, path)
    return sedesFiltro && sedesFiltro.length > 0
      ? query(col, where('sede_id', 'in', sedesFiltro))
      : col
  }

  const [legacySnap, proyectosSnap] = await Promise.all([
    getDocs(colCot(`distribuidores/${distribuidorId}/cotizaciones`)),
    getDocs(collection(db, `distribuidores/${distribuidorId}/proyectos`)),
  ])

  const legacy = legacySnap.docs.map((d) => ({ id: d.id, ...(d.data() as CotizacionDoc) }))

  const cotPorProyecto = await Promise.all(
    proyectosSnap.docs.map((p) =>
      getDocs(colCot(`distribuidores/${distribuidorId}/proyectos/${p.id}/cotizaciones`)),
    ),
  )
  const nested = cotPorProyecto.flatMap((snap) =>
    snap.docs.map((d) => ({ id: d.id, ...(d.data() as CotizacionDoc) })),
  )

  return [...legacy, ...nested].sort((a, b) => b.createdAt - a.createdAt)
}

export async function getCotizacion(
  distribuidorId: string,
  cotizacionId: string,
  proyectoId?: string,
): Promise<Cotizacion | null> {
  if (proyectoId) {
    const snap = await getDoc(doc(db, cotizacionPath(distribuidorId, proyectoId, cotizacionId)))
    if (!snap.exists()) return null
    const cot: Cotizacion = { id: snap.id, ...(snap.data() as CotizacionDoc) }
    // Auto-sana números pendientes: si la cotización quedó sin número (p. ej. se
    // guardó cuando las reglas del contador no estaban desplegadas), intenta asignarlo
    // ahora. Best-effort: si no se puede, se devuelve tal cual y se reintenta al abrirla.
    if (!cot.numero_consecutivo && cot.sede_id) {
      try {
        const numero = await asignarNumeroConsecutivo(distribuidorId, proyectoId, cotizacionId)
        if (numero) cot.numero_consecutivo = numero
      } catch {
        // queda pendiente
      }
    }
    return cot
  }
  // Fallback: busca en todos los proyectos (menos eficiente, solo para legacy)
  const todas = await getCotizaciones(distribuidorId)
  return todas.find((c) => c.id === cotizacionId) ?? null
}

export async function getSiguienteVersion(
  distribuidorId: string,
  proyectoId: string,
  espacioNombre: string,
): Promise<number> {
  const snap = await getDocs(
    query(
      collection(db, cotizacionPath(distribuidorId, proyectoId)),
      where('espacio_nombre', '==', espacioNombre),
    ),
  )
  if (snap.empty) return 1
  const versiones = snap.docs.map((d) => (d.data() as CotizacionDoc).version ?? 1)
  return Math.max(...versiones) + 1
}

export async function renombrarCotizacion(
  distribuidorId: string,
  cotizacionId: string,
  clienteNombre: string,
  proyectoNombre: string,
  proyectoId?: string,
): Promise<void> {
  const ref = proyectoId
    ? doc(db, cotizacionPath(distribuidorId, proyectoId, cotizacionId))
    : doc(db, `distribuidores/${distribuidorId}/cotizaciones/${cotizacionId}`)
  await updateDoc(ref, { clienteNombre, proyectoNombre, updatedAt: Date.now() })
}

export async function renombrarVersionCotizacion(
  distribuidorId: string,
  proyectoId: string,
  cotizacionId: string,
  nombre: string,
): Promise<void> {
  const ref = doc(db, cotizacionPath(distribuidorId, proyectoId, cotizacionId))
  await updateDoc(ref, { version_nombre: nombre, updatedAt: Date.now() })
}

export async function cambiarEstado(
  distribuidorId: string,
  cotizacionId: string,
  estado: CotizacionDoc['estado'],
  proyectoId?: string,
): Promise<void> {
  const ref = proyectoId
    ? doc(db, cotizacionPath(distribuidorId, proyectoId, cotizacionId))
    : doc(db, `distribuidores/${distribuidorId}/cotizaciones/${cotizacionId}`)
  await updateDoc(ref, { estado, updatedAt: Date.now() })
}

// Para la vista global de Delben (super_admin)
export async function getCotizacionesTodas(): Promise<Cotizacion[]> {
  const snap = await getDocs(collectionGroup(db, 'cotizaciones'))
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as CotizacionDoc) }))
    .sort((a, b) => b.createdAt - a.createdAt)
}
