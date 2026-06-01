import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type {
  ValoracionDoc,
  Valoracion,
  ItemCotizacionSnapshot,
  ItemHerraCotizacionSnapshot,
  ItemEspecialSnapshot,
  TotalesCotizacion,
} from '@/lib/firebase/tipos-firestore'
import type { ItemCarrito, ItemHerrajeCarrito, ItemEspecial, CotizacionInfo } from '@/store/carrito'

// ─── Serialización ─────────────────────────────────────────────────────────────

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

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export async function guardarValoracion(
  userId: string,
  info: CotizacionInfo,
  distribuidorId: string,
  distribuidorNombre: string,
  items: ItemCarrito[],
  itemsHerraje: ItemHerrajeCarrito[],
  itemsEspeciales: ItemEspecial[],
  totales: TotalesCotizacion,
): Promise<string> {
  const ahora = Date.now()
  const data: ValoracionDoc = {
    distribuidor_id: distribuidorId,
    distribuidor_nombre: distribuidorNombre,
    clienteNombre: info.clienteNombre,
    proyectoNombre: info.proyectoNombre,
    modalidad: info.modalidad,
    items: serializarItems(items),
    itemsHerraje: serializarItemsHerraje(itemsHerraje),
    itemsEspeciales: serializarEspeciales(itemsEspeciales),
    totales,
    estado: 'borrador',
    createdBy: userId,
    createdAt: ahora,
    updatedAt: ahora,
  }
  const ref = await addDoc(collection(db, 'valoraciones'), data)
  return ref.id
}

export async function actualizarValoracion(
  id: string,
  info: CotizacionInfo,
  items: ItemCarrito[],
  itemsHerraje: ItemHerrajeCarrito[],
  itemsEspeciales: ItemEspecial[],
  totales: TotalesCotizacion,
): Promise<void> {
  await updateDoc(doc(db, 'valoraciones', id), {
    clienteNombre: info.clienteNombre,
    proyectoNombre: info.proyectoNombre,
    modalidad: info.modalidad,
    items: serializarItems(items),
    itemsHerraje: serializarItemsHerraje(itemsHerraje),
    itemsEspeciales: serializarEspeciales(itemsEspeciales),
    totales,
    updatedAt: Date.now(),
  })
}

export async function getValoraciones(): Promise<Valoracion[]> {
  const snap = await getDocs(
    query(collection(db, 'valoraciones'), orderBy('createdAt', 'desc')),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as ValoracionDoc) }))
}

export async function getValoracion(id: string): Promise<Valoracion | null> {
  const snap = await getDoc(doc(db, 'valoraciones', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as ValoracionDoc) }
}

export async function marcarComoFacturada(id: string): Promise<void> {
  await updateDoc(doc(db, 'valoraciones', id), { estado: 'facturada', updatedAt: Date.now() })
}
