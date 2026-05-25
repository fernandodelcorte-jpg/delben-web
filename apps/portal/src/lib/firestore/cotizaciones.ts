import {
  collection,
  collectionGroup,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type {
  CotizacionDoc,
  Cotizacion,
  ItemCotizacionSnapshot,
  ItemHerraCotizacionSnapshot,
} from '@/lib/firebase/tipos-firestore'
import type { ItemCarrito, ItemHerrajeCarrito, CotizacionInfo } from '@/store/carrito'

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

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function guardarCotizacion(
  distribuidorId: string,
  createdBy: string,
  info: CotizacionInfo,
  items: ItemCarrito[],
  itemsHerraje: ItemHerrajeCarrito[],
  totales: {
    totalModulos: number
    totalHerrajesAsociados: number
    totalHerrajes: number
    transporteFijo: number
    instalacionFija: number
    total: number
  },
): Promise<string> {
  if (!info.proyectoId) throw new Error('proyectoId requerido para guardar una cotización')

  const ahora = Date.now()
  const data: CotizacionDoc = {
    distribuidor_id: distribuidorId,
    clienteNombre: info.clienteNombre,
    ...(info.clienteDireccion ? { clienteDireccion: info.clienteDireccion } : {}),
    proyectoNombre: info.proyectoNombre,
    categoriaId: info.categoriaId,
    categoriaNombre: info.categoriaNombre,
    modalidad: info.modalidad,
    fecha: info.fecha.getTime(),
    estado: 'borrador',
    proyecto_id: info.proyectoId,
    espacio_nombre: info.espacioNombre,
    version: info.version,
    items: serializarItems(items),
    itemsHerraje: serializarItemsHerraje(itemsHerraje),
    totales,
    createdBy,
    createdAt: ahora,
    updatedAt: ahora,
  }
  const ref = await addDoc(
    collection(db, cotizacionPath(distribuidorId, info.proyectoId)),
    data,
  )
  return ref.id
}

export async function actualizarCotizacion(
  distribuidorId: string,
  cotizacionId: string,
  info: CotizacionInfo,
  items: ItemCarrito[],
  itemsHerraje: ItemHerrajeCarrito[],
  totales: {
    totalModulos: number
    totalHerrajesAsociados: number
    totalHerrajes: number
    transporteFijo: number
    instalacionFija: number
    total: number
  },
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
    totales,
    updatedAt: Date.now(),
  })
}

// Obtiene todas las cotizaciones de un distribuidor.
// Busca en: (1) path legacy /distribuidores/{id}/cotizaciones y
//           (2) /distribuidores/{id}/proyectos/{id}/cotizaciones
// Evita collectionGroup para no depender de índices de Firestore.
export async function getCotizaciones(distribuidorId: string): Promise<Cotizacion[]> {
  const [legacySnap, proyectosSnap] = await Promise.all([
    getDocs(collection(db, `distribuidores/${distribuidorId}/cotizaciones`)),
    getDocs(collection(db, `distribuidores/${distribuidorId}/proyectos`)),
  ])

  const legacy = legacySnap.docs.map((d) => ({ id: d.id, ...(d.data() as CotizacionDoc) }))

  const cotPorProyecto = await Promise.all(
    proyectosSnap.docs.map((p) =>
      getDocs(collection(db, `distribuidores/${distribuidorId}/proyectos/${p.id}/cotizaciones`)),
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
    return { id: snap.id, ...(snap.data() as CotizacionDoc) }
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
