/**
 * Tipos TypeScript que mapean exactamente a los documentos de Firestore.
 * Son los tipos canónicos del catálogo. El portal los usa para leer;
 * el importador los usa para escribir.
 */

export interface TipoEstructuraDoc {
  nombre: string
  espesor_mm: 15 | 18 | null
  es_premium: boolean
  colores_premium: string[]
  orden: number
  activo: boolean
}

export interface TipoFachadaDoc {
  nombre: string
  es_aluminio_vidrio: boolean
  colores_vidrio: string[]
  colores_metal: string[]
  orden: number
  activo: boolean
}

export interface SubcategoriaDoc {
  tipo_fachada_id: string
  nombre: string
  tipo_ajuste: 'descuento' | 'ninguno' | 'recargo'
  ajuste_pct: number
  es_premium: boolean
  activo: boolean
}

export interface AcabadoDoc {
  subcategoria_id: string
  tipo_fachada_id: string
  nombre: string
  activo: boolean
}

export interface CategoriaMacroDoc {
  nombre: string
  orden: number
  activo: boolean
  mostrar_todas: boolean // si true, muestra todos los módulos sin filtrar (ej. "Otros")
}

export interface CategoriaDoc {
  nombre: string
  desc_desarmado_base_pct: number
  desc_desarmado_premium_pct: number
  orden: number
  activo: boolean
  categorias_macro_ids: string[]  // macros a las que pertenece
  mostrar_en_todas: boolean        // si true, aparece en todas las macros (ej. "ACABADOS X M2")
}

export interface ModuloDoc {
  codigo_excel: string
  categoria_id: string
  tipologia: string
  nombre: string
  altura: number
  profundidad: number
  imagen_nombre: string | null
  imagen_url: string | null
  search_keywords: string[]
  activo: boolean
  requiere_fachada?: boolean    // false → sin selector fachada; precio usa sentinel sin-fachada
  requiere_estructura?: boolean // false → sin selector estructura; precio usa sentinel sin-estructura
  precio_min?: number           // precio mínimo del catálogo (denormalizado del import para mostrar en buscador)
}

export interface PrecioDoc {
  tipo_estructura_id: string
  tipo_fachada_id: string
  precio_cop: number
}

export interface AccesorioDoc {
  codigo: number
  nombre: string
  nombre_normalizado: string
  precio_tradicional_cop: number | null
  precio_desarmado_cop: number | null
  imagen_nombre: string | null
  imagen_url: string | null
  disponible_tradicional: boolean
  disponible_desarmado: boolean
  activo: boolean
}

export interface UniversoModalidad {
  transporte_tipo?: 'porcentual' | 'fijo'
  transporte_pct: number
  instalacion_tipo?: 'porcentual' | 'fijo'
  instalacion_pct: number
  imprevistos_pct: number
  utilidad_pct: number
}

export interface DistribuidorDoc {
  nombre: string
  pais: string
  ciudad: string
  logo_url?: string | null
  acceso_tradicional: boolean
  acceso_desarmado: boolean
  descuento_muebles_pct: number
  descuento_herrajes_pct: number
  servicios: {
    diseno_pct: number
    cotizacion_pct: number
    produccion_pct: number
    logistica_pct: number
    gestion_comercial_pct: number
  }
  universo: {
    iva_pct: number
    desarmado?: UniversoModalidad
    tradicional?: UniversoModalidad
  }
  activo: boolean
  created_at: number
}

// Lee el universo de la modalidad correcta con fallback al esquema plano antiguo.
export function getUniversoParaModalidad(
  universo: DistribuidorDoc['universo'],
  modalidad: 'desarmado' | 'tradicional',
): UniversoModalidad & { iva_pct: number } {
  const data = universo[modalidad]
  if (data) return { ...data, iva_pct: universo.iva_pct }
  // Compatibilidad con docs Firestore creados antes de la separación por modalidad
  const flat = universo as unknown as {
    transporte_tipo?: 'porcentual' | 'fijo'
    transporte_pct?: number
    instalacion_tipo?: 'porcentual' | 'fijo'
    instalacion_pct?: number
    imprevistos_pct?: number
    utilidad_pct?: number
  }
  return {
    transporte_tipo: flat.transporte_tipo,
    transporte_pct: flat.transporte_pct ?? 0,
    instalacion_tipo: flat.instalacion_tipo,
    instalacion_pct: flat.instalacion_pct ?? 0,
    imprevistos_pct: flat.imprevistos_pct ?? 0,
    utilidad_pct: flat.utilidad_pct ?? 0,
    iva_pct: universo.iva_pct,
  }
}

export interface HistorialCondicionesDoc {
  descuento_muebles_pct: number
  descuento_herrajes_pct: number
  servicios: {
    diseno_pct: number
    cotizacion_pct: number
    produccion_pct: number
    logistica_pct: number
    gestion_comercial_pct: number
  }
  vigente_desde: number
  creado_por: string
}
export type HistorialCondiciones = HistorialCondicionesDoc & { id: string }

export interface TasaUsdDoc {
  valor: number
  vigente_desde: number
  creado_por: string
  created_at: number
}
export type TasaUsd = TasaUsdDoc & { id: string }

export interface CampanaDoc {
  nombre: string
  descuento_pct: number
  fecha_desde: number
  fecha_hasta: number
  segmentacion: {
    tipo: 'global' | 'segmentada'
    distribuidores: string[] | null
    categorias: string[] | null
    lineas_acabado: string[] | null
  }
  activa: boolean
  creado_por: string
  created_at: number
}

export interface UsuarioDoc {
  nombre: string
  email: string
  rol: string
  distribuidor_id: string | null
  activo: boolean
  created_at: number
}

// ─── Con ID (lo que devuelve Firestore) ──────────────────────────────────────

export type TipoEstructura = TipoEstructuraDoc & { id: string }
export type TipoFachada = TipoFachadaDoc & { id: string }
export type Subcategoria = SubcategoriaDoc & { id: string }
export type Acabado = AcabadoDoc & { id: string }
export type CategoriaMacro = CategoriaMacroDoc & { id: string }
export type Categoria = CategoriaDoc & { id: string }
export type Modulo = ModuloDoc & { id: string }
export type Precio = PrecioDoc & { id: string }
export type Accesorio = AccesorioDoc & { id: string }
export type Distribuidor = DistribuidorDoc & { id: string }
export type Usuario = UsuarioDoc & { id: string }
export type CampanaFirestore = CampanaDoc & { id: string }

// ─── Cotizaciones (snapshots completos) ──────────────────────────────────────

export interface ResultadoSnapshot {
  moneda: 'COP' | 'USD'
  costo_tras_descuentos: number
  servicios_subtotal1: number
  costo_delben: number
  distribuidor_subtotal2: number
  precio_sin_iva: number
  iva_aplicado: boolean
  iva_monto: number
  precio_final_unitario: number
  cantidad: number
  subtotal_linea: number
}

export interface HerrajeAsociadoSnapshot {
  accesorio_id: string
  codigo: number
  nombre: string
  cantidad: number
  resultado: ResultadoSnapshot
}

export interface ItemCotizacionSnapshot {
  modulo_id: string
  modulo_nombre: string
  modulo_tipologia: string
  config: {
    tipoEstructuraId?: string
    tipoEstructuraNombre: string
    tipoFachadaId?: string
    tipoFachadaNombre: string
    subcategoriaId?: string
    subcategoriaNombre: string
    acabadoId?: string
    acabadoNombre: string
    acabadoEstructura: string | null
    colorVidrio: string | null
    colorMetal: string | null
    altura: number
    profundidad: number
    cantidad: number
    observaciones: string
  }
  resultado: ResultadoSnapshot
  herrajesAsociados: HerrajeAsociadoSnapshot[]
}

export interface ItemHerraCotizacionSnapshot {
  accesorio_id: string
  codigo: number
  nombre: string
  cantidad: number
  resultado: ResultadoSnapshot
}

export interface HerrajeEspecialSnapshot {
  accesorioId: string
  nombre: string
  codigo: string
  cantidad: number
}

export interface ItemEspecialSnapshot {
  nombre: string
  tipoEstructuraNombre: string
  tipoFachadaNombre: string
  acabadoNombre: string
  acabadoEstructura: string | null
  colorVidrio: string | null
  ancho: number | null
  alto: number
  profundidad: number
  cantidad: number
  precioDelbenUnitario: number
  precioClienteUnitario: number
  observaciones: string
  herrajes: HerrajeEspecialSnapshot[]
  moduloReferenciaId?: string
  moduloReferenciaNombre?: string
}

export interface TotalesCotizacion {
  totalModulos: number
  totalHerrajesAsociados: number
  totalHerrajes: number
  totalEspeciales?: number
  transporteFijo?: number
  instalacionFija?: number
  total: number
}

// ─── Valoraciones internas (delben_facturacion) ───────────────────────────────

export interface ValoracionDoc {
  distribuidor_id: string
  distribuidor_nombre: string
  clienteNombre: string
  proyectoNombre: string
  modalidad: 'tradicional' | 'desarmado'
  items: ItemCotizacionSnapshot[]
  itemsHerraje: ItemHerraCotizacionSnapshot[]
  itemsEspeciales?: ItemEspecialSnapshot[]
  totales: TotalesCotizacion
  estado: 'borrador' | 'facturada'
  createdBy: string
  createdAt: number
  updatedAt: number
}

export type Valoracion = ValoracionDoc & { id: string }

// ─── Proyectos ────────────────────────────────────────────────────────────────

export interface ProyectoDoc {
  distribuidor_id: string
  clienteNombre: string
  clienteDireccion?: string
  clienteCiudad?: string
  proyectoNombre: string
  estado: 'en_proceso' | 'aceptado' | 'perdido'
  createdBy: string
  createdAt: number
  updatedAt: number
}

export type Proyecto = ProyectoDoc & { id: string }

// ─── Cotizaciones (snapshots completos) ──────────────────────────────────────

export interface CotizacionDoc {
  distribuidor_id: string
  clienteNombre: string
  clienteDireccion?: string
  proyectoNombre: string
  categoriaId?: string
  categoriaNombre?: string
  modalidad: 'tradicional' | 'desarmado'
  fecha: number
  estado: 'borrador' | 'enviada' | 'aceptada'
  // Campos de proyecto/versión (opcionales — cotizaciones antiguas no los tienen)
  proyecto_id?: string
  espacio_nombre?: string
  version?: number
  version_nombre?: string
  items: ItemCotizacionSnapshot[]
  itemsHerraje: ItemHerraCotizacionSnapshot[]
  itemsEspeciales?: ItemEspecialSnapshot[]
  totales: TotalesCotizacion
  createdBy: string
  createdAt: number
  updatedAt: number
}

export type Cotizacion = CotizacionDoc & { id: string }
