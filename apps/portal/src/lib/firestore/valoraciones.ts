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
  ValoracionItemSnapshot,
  ValoracionItemHerrajeSnapshot,
  ValoracionEspecialSnapshot,
  ValoracionResultadoSnapshot,
  ValoracionTotales,
} from '@/lib/firebase/tipos-firestore'
import type { ItemCarrito, ItemHerrajeCarrito, ItemEspecial, CotizacionInfo } from '@/store/carrito'

// ─── Serialización SOLO-COSTO ───────────────────────────────────────────────────
// La valoración es un documento interno de Delben: NUNCA persiste precio de venta,
// utilidad ni IVA (regla de oro #2 / deuda §1-§10). El resultado del motor se recorta
// a la capa de costo. Los campos de venta (distribuidor_subtotal2, precio_sin_iva,
// iva_*, precio_final_unitario, subtotal_linea) simplemente NO se escriben (patrón omit).

function resultadoCosto(r: ValoracionResultadoSnapshot): ValoracionResultadoSnapshot {
  return {
    moneda: r.moneda,
    costo_tras_descuentos: r.costo_tras_descuentos,
    servicios_subtotal1: r.servicios_subtotal1,
    costo_delben: r.costo_delben,
    cantidad: r.cantidad,
  }
}

function serializarItems(items: ItemCarrito[]): ValoracionItemSnapshot[] {
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
    resultado: resultadoCosto(item.resultado),
    herrajesAsociados: item.herrajesAsociados.map((h) => ({
      accesorio_id: h.accesorio.id,
      codigo: h.accesorio.codigo,
      nombre: h.accesorio.nombre,
      cantidad: h.cantidad,
      resultado: resultadoCosto(h.resultado),
    })),
  }))
}

function serializarItemsHerraje(items: ItemHerrajeCarrito[]): ValoracionItemHerrajeSnapshot[] {
  return items.map((item) => ({
    accesorio_id: item.accesorio.id,
    codigo: item.accesorio.codigo,
    nombre: item.accesorio.nombre,
    cantidad: item.cantidad,
    resultado: resultadoCosto(item.resultado),
  }))
}

// Solo costo: se conserva precioDelbenUnitario; se OMITEN precioClienteUnitario y
// el `resultado` (venta). Firestore rechaza `undefined`: las refs a módulo se omiten.
function serializarEspeciales(items: ItemEspecial[]): ValoracionEspecialSnapshot[] {
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
    observaciones: item.observaciones,
    herrajes: item.herrajes.map((h) => ({
      accesorioId: h.accesorioId,
      nombre: h.nombre,
      codigo: h.codigo,
      cantidad: h.cantidad,
    })),
    ...(item.moduloReferenciaId ? { moduloReferenciaId: item.moduloReferenciaId } : {}),
    ...(item.moduloReferenciaNombre ? { moduloReferenciaNombre: item.moduloReferenciaNombre } : {}),
  }))
}

// Costo Delben canónico (antes de IVA) de una valoración GUARDADA. Para docs nuevos
// usa el campo persistido; para los viejos (sin totalCostoDelben) lo deriva de los
// costo_delben del snapshot — NUNCA del `total` viejo (venta). Mismo número en ambos.
export function totalCostoDelbenDeValoracion(v: Valoracion): number {
  const persistido = v.totales?.totalCostoDelben
  if (typeof persistido === 'number') return persistido
  const modulos = v.items.reduce((s, it) => s + it.resultado.costo_delben * it.config.cantidad, 0)
  const herrajesAsociados = v.items.reduce(
    (s, it) => s + it.herrajesAsociados.reduce((hs, h) => hs + h.resultado.costo_delben * h.cantidad, 0),
    0,
  )
  const herrajes = v.itemsHerraje.reduce((s, it) => s + it.resultado.costo_delben * it.cantidad, 0)
  const especiales = (v.itemsEspeciales ?? []).reduce((s, e) => s + e.precioDelbenUnitario * e.cantidad, 0)
  return modulos + herrajesAsociados + herrajes + especiales
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
  totales: ValoracionTotales,
): Promise<string> {
  const ahora = Date.now()
  const data: ValoracionDoc = {
    distribuidor_id: distribuidorId,
    sede_id: info.sedeId,
    distribuidor_nombre: distribuidorNombre,
    clienteNombre: info.clienteNombre,
    proyectoNombre: info.proyectoNombre,
    // Firestore rechaza undefined: solo se escribe si viene (obligatorio en creación).
    ...(info.numeroOp ? { numero_op: info.numeroOp } : {}),
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
  totales: ValoracionTotales,
): Promise<void> {
  await updateDoc(doc(db, 'valoraciones', id), {
    clienteNombre: info.clienteNombre,
    proyectoNombre: info.proyectoNombre,
    ...(info.numeroOp ? { numero_op: info.numeroOp } : {}),
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
