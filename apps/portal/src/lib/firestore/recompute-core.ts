/**
 * Núcleo de recálculo por-ítem, COMPARTIDO entre cotizaciones y (futuro) valoraciones.
 *
 * Re-lee el catálogo (modulos/precios/subcategorias/categorias) y corre el motor
 * con la config vigente ya leída (motorBase). NO depende del tipo Cotizacion ni de
 * campos exclusivos de cotización (proyecto_id, version, costos fijos): recibe solo
 * los ítems con sus IDs/config + el motorBase, y devuelve los ítems recalculados.
 *
 * Extraído de recalcular.ts sin cambio de comportamiento (mismo orden de lecturas,
 * mismos stubs, misma llamada a calcularItem). NO toca el motor (packages/core).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { calcularItem } from '@delben/core'
import type { ItemInput, ResultadoCalculo } from '@delben/core'
import { db } from '@/lib/firebase/client'
import type {
  Sede,
  ModuloDoc,
  CategoriaDoc,
  SubcategoriaDoc,
  AccesorioDoc,
  PrecioDoc,
  ItemCotizacionSnapshot,
  HerrajeAsociadoSnapshot,
  ItemHerraCotizacionSnapshot,
} from '@/lib/firebase/tipos-firestore'
import { getUniversoParaModalidad } from '@/lib/firebase/tipos-firestore'
import type {
  ItemCarrito,
  ItemHerrajeCarrito,
  HerrajeAsociado,
} from '@/store/carrito'

// ─── Parámetros del motor ─────────────────────────────────────────────────────

// La "base" del motor común a todos los ítems de un recálculo: es el ItemInput del
// motor menos lo que varía por ítem (precio base, cantidad, tipo, categoría, acabado).
export type MotorBase = Omit<
  ItemInput,
  'precio_base_cop' | 'cantidad' | 'tipo_item' | 'categoria' | 'linea_acabado'
>

// Las condiciones salen de la SEDE; el id del distribuidor se conserva para la
// segmentación de campañas en el motor.
export function buildMotorParams(
  distribuidorId: string,
  sede: Sede,
  modalidad: 'desarmado' | 'tradicional',
) {
  const u = getUniversoParaModalidad(sede.universo, modalidad)
  return {
    distribuidorMotor: {
      id: distribuidorId,
      descuento_muebles_pct: sede.descuento_muebles_pct,
      descuento_herrajes_pct: sede.descuento_herrajes_pct,
    },
    serviciosMotor: {
      diseno: sede.servicios.diseno_pct,
      cotizacion: sede.servicios.cotizacion_pct,
      produccion: sede.servicios.produccion_pct,
      logistica: sede.servicios.logistica_pct,
      gestion_comercial: sede.servicios.gestion_comercial_pct,
    },
    universoMotor: {
      transporte: u.transporte_pct,
      instalacion: u.instalacion_pct,
      imprevistos: u.imprevistos_pct,
      utilidad: u.utilidad_pct,
      iva: u.iva_pct,
    },
    pais: sede.pais,
  }
}

// ─── Stubs para ítems sin IDs (snapshots anteriores al fix) ──────────────────

function buildHerrajeAsociadoStub(h: HerrajeAsociadoSnapshot): HerrajeAsociado {
  return {
    accesorio: {
      id: h.accesorio_id,
      codigo: h.codigo,
      nombre: h.nombre,
      nombre_normalizado: h.nombre.toLowerCase(),
      precio_tradicional_cop: null,
      precio_desarmado_cop: null,
      imagen_nombre: null,
      imagen_url: null,
      disponible_tradicional: true,
      disponible_desarmado: true,
      activo: true,
    },
    cantidad: h.cantidad,
    resultado: h.resultado as ResultadoCalculo,
  }
}

export function buildItemCarritoStub(snap: ItemCotizacionSnapshot): ItemCarrito {
  return {
    id: crypto.randomUUID(),
    modulo: {
      id: snap.modulo_id,
      nombre: snap.modulo_nombre,
      tipologia: snap.modulo_tipologia,
      codigo_excel: '',
      categoria_id: '',
      altura: snap.config.altura,
      profundidad: snap.config.profundidad,
      imagen_nombre: null,
      imagen_url: null,
      search_keywords: [],
      activo: true,
    },
    config: {
      tipoEstructuraId: snap.config.tipoEstructuraId ?? '',
      tipoEstructuraNombre: snap.config.tipoEstructuraNombre,
      tipoFachadaId: snap.config.tipoFachadaId ?? '',
      tipoFachadaNombre: snap.config.tipoFachadaNombre,
      subcategoriaId: snap.config.subcategoriaId ?? '',
      subcategoriaNombre: snap.config.subcategoriaNombre,
      acabadoId: snap.config.acabadoId ?? '',
      acabadoNombre: snap.config.acabadoNombre,
      acabadoEstructura: snap.config.acabadoEstructura,
      colorVidrio: snap.config.colorVidrio,
      colorMetal: snap.config.colorMetal,
      altura: snap.config.altura,
      profundidad: snap.config.profundidad,
      cantidad: snap.config.cantidad,
      observaciones: snap.config.observaciones,
    },
    subcategoria: {
      id: snap.config.subcategoriaId ?? '',
      tipo_fachada_id: snap.config.tipoFachadaId ?? '',
      nombre: snap.config.subcategoriaNombre,
      tipo_ajuste: 'ninguno',
      ajuste_pct: 0,
      activo: true,
    },
    resultado: snap.resultado as ResultadoCalculo,
    herrajesAsociados: snap.herrajesAsociados.map(buildHerrajeAsociadoStub),
  }
}

export function buildHerrajeCarritoStub(snap: ItemHerraCotizacionSnapshot): ItemHerrajeCarrito {
  return {
    id: crypto.randomUUID(),
    accesorio: {
      id: snap.accesorio_id,
      codigo: snap.codigo,
      nombre: snap.nombre,
      nombre_normalizado: snap.nombre.toLowerCase(),
      precio_tradicional_cop: null,
      precio_desarmado_cop: null,
      imagen_nombre: null,
      imagen_url: null,
      disponible_tradicional: true,
      disponible_desarmado: true,
      activo: true,
    },
    cantidad: snap.cantidad,
    resultado: snap.resultado as ResultadoCalculo,
  }
}

// ─── Recálculo por-ítem ───────────────────────────────────────────────────────

// Re-lee el catálogo del módulo y corre el motor. Ítems sin IDs o con docs faltantes
// conservan su resultado original (stub). La modalidad para el precio de herrajes sale
// de motorBase.modelo (idéntico a la modalidad de la cotización).
export async function recomputeItemModulo(
  snap: ItemCotizacionSnapshot,
  motorBase: MotorBase,
): Promise<ItemCarrito> {
  const { tipoEstructuraId, tipoFachadaId, subcategoriaId } = snap.config

  // Ítems sin IDs (guardados antes del fix) usan el resultado original
  if (!tipoEstructuraId || !tipoFachadaId || !subcategoriaId) {
    return buildItemCarritoStub(snap)
  }

  const [moduloDoc, subcatDoc, preciosDocs] = await Promise.all([
    getDoc(doc(db, 'modulos', snap.modulo_id)),
    getDoc(doc(db, 'subcategorias', subcategoriaId)),
    getDocs(
      query(
        collection(db, 'modulos', snap.modulo_id, 'precios'),
        where('tipo_estructura_id', '==', tipoEstructuraId),
        where('tipo_fachada_id', '==', tipoFachadaId),
      ),
    ),
  ])

  if (!moduloDoc.exists() || !subcatDoc.exists() || preciosDocs.empty) {
    return buildItemCarritoStub(snap)
  }

  const modulo = { id: moduloDoc.id, ...(moduloDoc.data() as ModuloDoc) }
  const subcat = { id: subcatDoc.id, ...(subcatDoc.data() as SubcategoriaDoc) }
  const precio_cop = (preciosDocs.docs[0]!.data() as PrecioDoc).precio_cop

  const categoriaDoc = await getDoc(doc(db, 'categorias', modulo.categoria_id))
  if (!categoriaDoc.exists()) return buildItemCarritoStub(snap)
  const catData = categoriaDoc.data() as CategoriaDoc

  const nuevoResultado = calcularItem({
    precio_base_cop: precio_cop,
    cantidad: snap.config.cantidad,
    tipo_item: 'mueble',
    categoria: {
      id: modulo.categoria_id,
      desc_base_pct: catData.desc_desarmado_base_pct,
    },
    linea_acabado: {
      id: subcat.id,
      tipo_ajuste: subcat.tipo_ajuste,
      ajuste_pct: subcat.ajuste_pct,
    },
    ...motorBase,
  })

  const herrajesAsociados: HerrajeAsociado[] = await Promise.all(
    snap.herrajesAsociados.map(async (h) => {
      const accDoc = await getDoc(doc(db, 'accesorios', h.accesorio_id))
      if (!accDoc.exists()) return buildHerrajeAsociadoStub(h)
      const acc = { id: accDoc.id, ...(accDoc.data() as AccesorioDoc) }
      const precioCopH =
        motorBase.modelo === 'tradicional'
          ? acc.precio_tradicional_cop
          : acc.precio_desarmado_cop
      if (!precioCopH) return buildHerrajeAsociadoStub(h)
      return {
        accesorio: acc,
        cantidad: h.cantidad,
        resultado: calcularItem({
          precio_base_cop: precioCopH,
          cantidad: h.cantidad,
          tipo_item: 'herraje',
          categoria: { id: 'herraje', desc_base_pct: 0 },
          linea_acabado: { id: 'herraje', tipo_ajuste: 'ninguno', ajuste_pct: 0 },
          ...motorBase,
        }),
      }
    }),
  )

  return {
    id: crypto.randomUUID(),
    modulo,
    config: {
      tipoEstructuraId,
      tipoEstructuraNombre: snap.config.tipoEstructuraNombre,
      tipoFachadaId,
      tipoFachadaNombre: snap.config.tipoFachadaNombre,
      subcategoriaId,
      subcategoriaNombre: snap.config.subcategoriaNombre,
      acabadoId: snap.config.acabadoId ?? '',
      acabadoNombre: snap.config.acabadoNombre,
      acabadoEstructura: snap.config.acabadoEstructura,
      colorVidrio: snap.config.colorVidrio,
      colorMetal: snap.config.colorMetal,
      altura: snap.config.altura,
      profundidad: snap.config.profundidad,
      cantidad: snap.config.cantidad,
      observaciones: snap.config.observaciones,
    },
    subcategoria: subcat,
    resultado: nuevoResultado,
    herrajesAsociados,
  }
}

// Re-lee el accesorio y corre el motor para un herraje suelto. Doc faltante o sin
// precio → conserva el resultado original (stub).
export async function recomputeItemHerraje(
  snap: ItemHerraCotizacionSnapshot,
  motorBase: MotorBase,
): Promise<ItemHerrajeCarrito> {
  const accDoc = await getDoc(doc(db, 'accesorios', snap.accesorio_id))
  if (!accDoc.exists()) return buildHerrajeCarritoStub(snap)
  const acc = { id: accDoc.id, ...(accDoc.data() as AccesorioDoc) }
  const precioCop =
    motorBase.modelo === 'tradicional'
      ? acc.precio_tradicional_cop
      : acc.precio_desarmado_cop
  if (!precioCop) return buildHerrajeCarritoStub(snap)
  return {
    id: crypto.randomUUID(),
    accesorio: acc,
    cantidad: snap.cantidad,
    resultado: calcularItem({
      precio_base_cop: precioCop,
      cantidad: snap.cantidad,
      tipo_item: 'herraje',
      categoria: { id: 'herraje', desc_base_pct: 0 },
      linea_acabado: { id: 'herraje', tipo_ajuste: 'ninguno', ajuste_pct: 0 },
      ...motorBase,
    }),
  }
}
