/**
 * Datos de demostración para Rebanada 1.
 * Reemplazar con Firestore en Rebanada 2 (importación de catálogo real).
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TipoEstructura = {
  id: string
  nombre: string
  espesor_mm: 15 | 18
  es_premium: boolean
}

export type TipoFachada = {
  id: string
  nombre: string
  es_aluminio_vidrio: boolean
}

export type Subcategoria = {
  id: string
  tipo_fachada_id: string
  nombre: string
  tipo_ajuste: 'descuento' | 'ninguno' | 'recargo'
  ajuste_pct: number
  es_premium: boolean
}

export type Acabado = {
  id: string
  subcategoria_id: string
  nombre: string
}

export type PrecioModulo = {
  tipo_estructura_id: string
  tipo_fachada_id: string
  precio_cop: number
}

export type ModuloDemo = {
  id: string
  codigo_excel: string
  categoria_id: string
  tipologia: string
  nombre: string
  altura_cm: number
  profundidad_cm: number
  precios: PrecioModulo[]
}

export type CategoriaDemo = {
  id: string
  nombre: string
  desc_desarmado_base_pct: number
  desc_desarmado_premium_pct: number
}

// ─── Catálogos ────────────────────────────────────────────────────────────────

export const TIPOS_ESTRUCTURA: TipoEstructura[] = [
  { id: 'mel15b', nombre: 'Melamina 15mm Blanca', espesor_mm: 15, es_premium: false },
  { id: 'mel15p', nombre: 'Melamina 15mm Premium', espesor_mm: 15, es_premium: true },
  { id: 'mel18b', nombre: 'Melamina 18mm Blanca', espesor_mm: 18, es_premium: false },
  { id: 'mel18p', nombre: 'Melamina 18mm Premium', espesor_mm: 18, es_premium: true },
]

export const TIPOS_FACHADA: TipoFachada[] = [
  { id: 'melamina', nombre: 'Melamina', es_aluminio_vidrio: false },
  { id: 'laminado-mate', nombre: 'Laminado Mate', es_aluminio_vidrio: false },
  { id: 'aluminio-vidrio', nombre: 'Aluminio Vidrio', es_aluminio_vidrio: true },
]

export const SUBCATEGORIAS: Subcategoria[] = [
  // Melamina
  { id: 'mel-std', tipo_fachada_id: 'melamina', nombre: 'Estándar', tipo_ajuste: 'ninguno', ajuste_pct: 0, es_premium: false },
  { id: 'mel-magenta', tipo_fachada_id: 'melamina', nombre: 'Magenta', tipo_ajuste: 'recargo', ajuste_pct: 12, es_premium: false },
  // Laminado Mate
  { id: 'lam-std', tipo_fachada_id: 'laminado-mate', nombre: 'Estándar', tipo_ajuste: 'ninguno', ajuste_pct: 0, es_premium: false },
  { id: 'lam-brillo', tipo_fachada_id: 'laminado-mate', nombre: 'Brillo Especial', tipo_ajuste: 'recargo', ajuste_pct: 8, es_premium: false },
  // Aluminio Vidrio
  { id: 'av-std', tipo_fachada_id: 'aluminio-vidrio', nombre: 'Estándar', tipo_ajuste: 'ninguno', ajuste_pct: 0, es_premium: false },
]

export const ACABADOS: Acabado[] = [
  // mel-std
  { id: 'mel-std-blanco', subcategoria_id: 'mel-std', nombre: 'Blanco Perla' },
  { id: 'mel-std-arena', subcategoria_id: 'mel-std', nombre: 'Arena' },
  { id: 'mel-std-gris', subcategoria_id: 'mel-std', nombre: 'Gris Oxford' },
  { id: 'mel-std-wengue', subcategoria_id: 'mel-std', nombre: 'Wengué' },
  // mel-magenta
  { id: 'mel-mag-rojo', subcategoria_id: 'mel-magenta', nombre: 'Rojo Intenso' },
  { id: 'mel-mag-azul', subcategoria_id: 'mel-magenta', nombre: 'Azul Noche' },
  { id: 'mel-mag-verde', subcategoria_id: 'mel-magenta', nombre: 'Verde Esmeralda' },
  // lam-std
  { id: 'lam-concreto', subcategoria_id: 'lam-std', nombre: 'Concreto Gris' },
  { id: 'lam-madera', subcategoria_id: 'lam-std', nombre: 'Madera Natural' },
  { id: 'lam-negro', subcategoria_id: 'lam-std', nombre: 'Negro Mate' },
  // lam-brillo
  { id: 'lam-bri-blanco', subcategoria_id: 'lam-brillo', nombre: 'Blanco Brillo' },
  { id: 'lam-bri-negro', subcategoria_id: 'lam-brillo', nombre: 'Negro Brillo' },
  // av-std
  { id: 'av-claro', subcategoria_id: 'av-std', nombre: 'Vidrio Claro' },
  { id: 'av-esmerilado', subcategoria_id: 'av-std', nombre: 'Vidrio Esmerilado' },
]

export const COLORES_ESTRUCTURA_PREMIUM: string[] = [
  'Arena', 'Gris Oxford', 'Wengué', 'Cerezo', 'Nogal', 'Capuccino',
]

export const COLORES_VIDRIO: string[] = ['Claro', 'Esmerilado', 'Bronce', 'Negro']
export const COLORES_METAL: string[] = ['Aluminio Natural', 'Negro Mate', 'Champagne']

export const CATEGORIAS: CategoriaDemo[] = [
  { id: 'cocina', nombre: 'Cocinas', desc_desarmado_base_pct: 30, desc_desarmado_premium_pct: 12 },
]

// ─── Módulos de cocina (demo) ─────────────────────────────────────────────────
// Precios: mel15b es la base. mel15p +30%, mel18b +10%, mel18p +40%.
// laminado-mate: +15% sobre el precio de la misma estructura en melamina.
// aluminio-vidrio: +60% (solo fachadas "vidriadas").

function precios(base: number): PrecioModulo[] {
  const e = {
    mel15b: base,
    mel15p: Math.round(base * 1.30),
    mel18b: Math.round(base * 1.10),
    mel18p: Math.round(base * 1.40),
  }
  const lam = {
    mel15b: Math.round(base * 1.15),
    mel15p: Math.round(base * 1.30 * 1.15),
    mel18b: Math.round(base * 1.10 * 1.15),
    mel18p: Math.round(base * 1.40 * 1.15),
  }
  const av = {
    mel15b: Math.round(base * 1.60),
    mel15p: Math.round(base * 1.30 * 1.60),
    mel18b: Math.round(base * 1.10 * 1.60),
    mel18p: Math.round(base * 1.40 * 1.60),
  }
  return [
    { tipo_estructura_id: 'mel15b', tipo_fachada_id: 'melamina', precio_cop: e.mel15b },
    { tipo_estructura_id: 'mel15p', tipo_fachada_id: 'melamina', precio_cop: e.mel15p },
    { tipo_estructura_id: 'mel18b', tipo_fachada_id: 'melamina', precio_cop: e.mel18b },
    { tipo_estructura_id: 'mel18p', tipo_fachada_id: 'melamina', precio_cop: e.mel18p },
    { tipo_estructura_id: 'mel15b', tipo_fachada_id: 'laminado-mate', precio_cop: lam.mel15b },
    { tipo_estructura_id: 'mel15p', tipo_fachada_id: 'laminado-mate', precio_cop: lam.mel15p },
    { tipo_estructura_id: 'mel18b', tipo_fachada_id: 'laminado-mate', precio_cop: lam.mel18b },
    { tipo_estructura_id: 'mel18p', tipo_fachada_id: 'laminado-mate', precio_cop: lam.mel18p },
    { tipo_estructura_id: 'mel15b', tipo_fachada_id: 'aluminio-vidrio', precio_cop: av.mel15b },
    { tipo_estructura_id: 'mel15p', tipo_fachada_id: 'aluminio-vidrio', precio_cop: av.mel15p },
    { tipo_estructura_id: 'mel18b', tipo_fachada_id: 'aluminio-vidrio', precio_cop: av.mel18b },
    { tipo_estructura_id: 'mel18p', tipo_fachada_id: 'aluminio-vidrio', precio_cop: av.mel18p },
  ]
}

export const MODULOS_DEMO: ModuloDemo[] = [
  {
    id: 'mod-alac-6070',
    codigo_excel: 'K-AL-6070',
    categoria_id: 'cocina',
    tipologia: 'Alacena',
    nombre: 'Alacena 60 × 70 cm',
    altura_cm: 70,
    profundidad_cm: 35,
    precios: precios(480_000),
  },
  {
    id: 'mod-base-6090',
    codigo_excel: 'K-BA-6090',
    categoria_id: 'cocina',
    tipologia: 'Base',
    nombre: 'Base 60 × 90 cm',
    altura_cm: 90,
    profundidad_cm: 60,
    precios: precios(560_000),
  },
  {
    id: 'mod-torre-horno',
    codigo_excel: 'K-TH-6230',
    categoria_id: 'cocina',
    tipologia: 'Torre',
    nombre: 'Torre Horno 60 × 230 cm',
    altura_cm: 230,
    profundidad_cm: 60,
    precios: precios(1_200_000),
  },
  {
    id: 'mod-fregadero-90',
    codigo_excel: 'K-BF-9090',
    categoria_id: 'cocina',
    tipologia: 'Base',
    nombre: 'Base Fregadero 90 × 90 cm',
    altura_cm: 90,
    profundidad_cm: 60,
    precios: precios(620_000),
  },
  {
    id: 'mod-alac-esquinera',
    codigo_excel: 'K-AE-9070',
    categoria_id: 'cocina',
    tipologia: 'Alacena',
    nombre: 'Alacena Esquinera 90 × 70 cm',
    altura_cm: 70,
    profundidad_cm: 35,
    precios: precios(780_000),
  },
]

// ─── Configuración del distribuidor demo ──────────────────────────────────────
// Matches the verified motor test cases (35% muebles, 15% herrajes).

export const DISTRIBUIDOR_DEMO = {
  id: 'demo',
  nombre: 'Distribuidor Demo',
  descuento_muebles_pct: 35,
  descuento_herrajes_pct: 15,
}

export const SERVICIOS_DELBEN_DEMO = {
  diseno: 3,
  cotizacion: 2,
  produccion: 5,
  logistica: 4,
  gestion_comercial: 6,
}

export const UNIVERSO_DEMO = {
  transporte: 5,
  instalacion: 8,
  imprevistos: 3,
  utilidad: 25,
  iva: 19,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getPrecioBase(
  modulo: ModuloDemo,
  tipoEstructuraId: string,
  tipoFachadaId: string,
): number | null {
  const p = modulo.precios.find(
    (x) => x.tipo_estructura_id === tipoEstructuraId && x.tipo_fachada_id === tipoFachadaId,
  )
  return p?.precio_cop ?? null
}

export function subcategoriasDe(tipoFachadaId: string): Subcategoria[] {
  return SUBCATEGORIAS.filter((s) => s.tipo_fachada_id === tipoFachadaId)
}

export function acabadosDe(subcategoriaId: string): Acabado[] {
  return ACABADOS.filter((a) => a.subcategoria_id === subcategoriaId)
}

export function formatCOP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CO')
}
