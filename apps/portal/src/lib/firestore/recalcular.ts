import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { calcularItem } from '@delben/core'
import type { ResultadoCalculo } from '@delben/core'
import { db } from '@/lib/firebase/client'
import { getDistribuidor } from '@/lib/firestore/distribuidores'
import { getCampanasActivas } from '@/lib/firestore/campanas'
import { getTasaUsdActual } from '@/lib/firestore/config'
import type {
  Cotizacion,
  Distribuidor,
  ModuloDoc,
  CategoriaDoc,
  SubcategoriaDoc,
  AccesorioDoc,
  PrecioDoc,
  ItemCotizacionSnapshot,
  HerrajeAsociadoSnapshot,
  ItemHerraCotizacionSnapshot,
} from '@/lib/firebase/tipos-firestore'
import type {
  ItemCarrito,
  ItemHerrajeCarrito,
  CotizacionInfo,
  HerrajeAsociado,
} from '@/store/carrito'

// ─── Parámetros del motor ─────────────────────────────────────────────────────

function buildMotorParams(dist: Distribuidor) {
  return {
    distribuidorMotor: {
      id: dist.id,
      descuento_muebles_pct: dist.descuento_muebles_pct,
      descuento_herrajes_pct: dist.descuento_herrajes_pct,
    },
    serviciosMotor: {
      diseno: dist.servicios.diseno_pct,
      cotizacion: dist.servicios.cotizacion_pct,
      produccion: dist.servicios.produccion_pct,
      logistica: dist.servicios.logistica_pct,
      gestion_comercial: dist.servicios.gestion_comercial_pct,
    },
    universoMotor: {
      transporte: dist.universo.transporte_pct,
      instalacion: dist.universo.instalacion_pct,
      imprevistos: dist.universo.imprevistos_pct,
      utilidad: dist.universo.utilidad_pct,
      iva: dist.universo.iva_pct,
    },
    pais: dist.pais,
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

function buildItemCarritoStub(snap: ItemCotizacionSnapshot): ItemCarrito {
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
      es_premium: false,
      activo: true,
    },
    resultado: snap.resultado as ResultadoCalculo,
    herrajesAsociados: snap.herrajesAsociados.map(buildHerrajeAsociadoStub),
  }
}

function buildHerrajeCarritoStub(snap: ItemHerraCotizacionSnapshot): ItemHerrajeCarrito {
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

// ─── Recálculo completo ───────────────────────────────────────────────────────

export type RecalculoResult = {
  cotizacionInfo: CotizacionInfo
  distribuidorData: Distribuidor
  items: ItemCarrito[]
  itemsHerraje: ItemHerrajeCarrito[]
}

export async function recalcularCotizacion(
  cotizacion: Cotizacion,
  distribuidorId: string,
): Promise<RecalculoResult> {
  const [dist, campanasActivas, tasaUsd] = await Promise.all([
    getDistribuidor(distribuidorId),
    getCampanasActivas(),
    getTasaUsdActual(),
  ])
  if (!dist) throw new Error('Distribuidor no encontrado')

  const cotizacionInfo: CotizacionInfo = {
    clienteNombre: cotizacion.clienteNombre,
    clienteDireccion: cotizacion.clienteDireccion,
    proyectoNombre: cotizacion.proyectoNombre,
    modalidad: cotizacion.modalidad,
    fecha: new Date(cotizacion.fecha),
    categoriaId: cotizacion.categoriaId ?? '',
    categoriaNombre: cotizacion.categoriaNombre ?? '',
    transporteFijo: cotizacion.totales.transporteFijo ?? 0,
    instalacionFija: cotizacion.totales.instalacionFija ?? 0,
    proyectoId: cotizacion.proyecto_id,
    espacioNombre: cotizacion.espacio_nombre,
    version: cotizacion.version,
  }

  const { distribuidorMotor, serviciosMotor, universoMotor, pais } = buildMotorParams(dist)
  const motorBase = {
    modelo: cotizacionInfo.modalidad,
    distribuidor: distribuidorMotor,
    fecha_cotizacion: cotizacionInfo.fecha,
    campanas_disponibles: campanasActivas,
    servicios_delben: serviciosMotor,
    universo: universoMotor,
    pais_cliente_final: pais,
    tasa_usd: tasaUsd,
  }

  const items: ItemCarrito[] = await Promise.all(
    cotizacion.items.map(async (snap): Promise<ItemCarrito> => {
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
          desc_premium_pct: catData.desc_desarmado_premium_pct,
        },
        linea_acabado: {
          id: subcat.id,
          tipo_ajuste: subcat.tipo_ajuste,
          ajuste_pct: subcat.ajuste_pct,
          es_premium: subcat.es_premium,
        },
        ...motorBase,
      })

      const herrajesAsociados: HerrajeAsociado[] = await Promise.all(
        snap.herrajesAsociados.map(async (h) => {
          const accDoc = await getDoc(doc(db, 'accesorios', h.accesorio_id))
          if (!accDoc.exists()) return buildHerrajeAsociadoStub(h)
          const acc = { id: accDoc.id, ...(accDoc.data() as AccesorioDoc) }
          const precioCopH =
            cotizacion.modalidad === 'tradicional'
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
              categoria: { id: 'herraje', desc_base_pct: 0, desc_premium_pct: 0 },
              linea_acabado: { id: 'herraje', tipo_ajuste: 'ninguno', ajuste_pct: 0, es_premium: false },
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
    }),
  )

  const itemsHerraje: ItemHerrajeCarrito[] = await Promise.all(
    cotizacion.itemsHerraje.map(async (snap): Promise<ItemHerrajeCarrito> => {
      const accDoc = await getDoc(doc(db, 'accesorios', snap.accesorio_id))
      if (!accDoc.exists()) return buildHerrajeCarritoStub(snap)
      const acc = { id: accDoc.id, ...(accDoc.data() as AccesorioDoc) }
      const precioCop =
        cotizacion.modalidad === 'tradicional'
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
          categoria: { id: 'herraje', desc_base_pct: 0, desc_premium_pct: 0 },
          linea_acabado: { id: 'herraje', tipo_ajuste: 'ninguno', ajuste_pct: 0, es_premium: false },
          ...motorBase,
        }),
      }
    }),
  )

  return { cotizacionInfo, distribuidorData: dist, items, itemsHerraje }
}
