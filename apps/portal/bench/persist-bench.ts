/* eslint-disable no-console */
// Benchmark de las operaciones del carrito que el usuario percibe lentas:
//  (1) agregar un ítem   (2) subir cantidad ±0,5
// Ejercita el STORE real (Zustand + persist). Mide store + persistencia a
// localStorage; NO incluye el render de React (eso lo cubre el punto #4).
// Correr: esbuild bundle -> node. Ver comando en el informe.
import './bench-setup'
import { useCarrito } from '@/store/carrito'
import type {
  Modulo,
  Subcategoria,
  Accesorio,
} from '@/lib/firebase/tipos-firestore'
import type { ConfiguracionItem } from '@/store/carrito'

// URL larga representativa de Firebase Storage (lo que infla el payload de disco).
const IMG =
  'https://firebasestorage.googleapis.com/v0/b/delben.appspot.com/o/imagenes%2Fmodulos%2Fmueble-bajo-60.jpg?alt=media&token=8f3c1a2b-4d5e-6789-abcd-ef0123456789'

function nuevoModulo(i: number): Modulo {
  return {
    id: `mod-${i}`,
    codigo_excel: `EX-${i}`,
    categoria_id: 'cocina',
    tipologia: 'Bajo',
    nombre: `Mueble bajo ${60 + (i % 40)} cm referencia ${i}`,
    altura: 720,
    profundidad: 580,
    imagen_nombre: 'mueble-bajo-60.jpg',
    imagen_url: IMG,
    search_keywords: ['mueble', 'bajo', `${60 + (i % 40)}`, 'cocina', `ref${i}`],
    activo: true,
  }
}

const SUBCAT: Subcategoria = {
  id: 'sub-1',
  tipo_fachada_id: 'fac-1',
  nombre: 'Estándar',
  tipo_ajuste: 'ninguno',
  ajuste_pct: 0,
  es_premium: false,
  activo: true,
}

function nuevaConfig(): ConfiguracionItem {
  return {
    tipoEstructuraId: 'est-1',
    tipoEstructuraNombre: 'Blanca',
    tipoFachadaId: 'fac-1',
    tipoFachadaNombre: 'Melamina',
    subcategoriaId: 'sub-1',
    subcategoriaNombre: 'Estándar',
    acabadoId: 'aca-1',
    acabadoNombre: 'Blanco',
    acabadoEstructura: null,
    colorVidrio: null,
    colorMetal: null,
    altura: 720,
    profundidad: 580,
    cantidad: 1,
    observaciones: 'Observación de ejemplo para representar texto del comercial.',
  }
}

function herraje(id: string, nombre: string): Accesorio {
  return {
    id,
    codigo: 1000 + id.length,
    nombre,
    nombre_normalizado: nombre.toLowerCase(),
    precio_tradicional_cop: 8000,
    precio_desarmado_cop: 7000,
    imagen_nombre: null,
    imagen_url: null,
    disponible_tradicional: true,
    disponible_desarmado: true,
    activo: true,
  }
}

const HERRAJES_BORRADOR = [
  { accesorio: herraje('her-1', 'Bisagra cierre suave'), cantidad: 2 },
  { accesorio: herraje('her-2', 'Corredera telescópica'), cantidad: 1 },
]

const CATEGORIA_CALCULO = { id: 'cocina', desc_base_pct: 30, desc_premium_pct: 20 }
const PRECIO_COP = 520000

function agregarUno(i: number): void {
  useCarrito.getState().agregarItem(
    nuevoModulo(i),
    nuevaConfig(),
    SUBCAT,
    PRECIO_COP,
    CATEGORIA_CALCULO,
    HERRAJES_BORRADOR,
  )
}

function stats(muestras: number[]): { media: number; p50: number; min: number; max: number } {
  const ord = [...muestras].sort((a, b) => a - b)
  const media = muestras.reduce((s, x) => s + x, 0) / muestras.length
  const p50 = ord[Math.floor(ord.length / 2)]!
  return { media, p50, min: ord[0]!, max: ord[ord.length - 1]! }
}

function fmt(n: number): string {
  return n.toFixed(4) + ' ms'
}

function main(): void {
  const store = useCarrito.getState()
  store.iniciarCotizacion(
    {
      clienteNombre: 'Cliente de prueba',
      proyectoNombre: 'Proyecto benchmark',
      modalidad: 'desarmado',
      sedeId: 'sede-1',
      categoriaId: 'cocina',
      categoriaNombre: 'Cocina',
      transporteFijo: 0,
      instalacionFija: 0,
      proyectoId: 'proy-1',
    },
    null,
    null,
  )

  // Carrito base representativo de una cotización cargada: 25 ítems.
  const N_BASE = 25
  for (let i = 0; i < N_BASE; i++) agregarUno(i)

  const blob = localStorage.getItem('delben-carrito') ?? ''
  const tamKB = (blob.length / 1024).toFixed(1)

  // Warm-up (estabilizar JIT) — no medido.
  const id0 = useCarrito.getState().items[0]!.id
  for (let k = 0; k < 50; k++) {
    useCarrito.getState().cambiarCantidadItem(id0, k % 2 === 0 ? 0.5 : -0.5)
  }

  // ── Medición: subir cantidad ±0,5 (carrito fijo en 25 ítems) ──
  const NCANT = 400
  const tCant: number[] = []
  for (let k = 0; k < NCANT; k++) {
    const delta = k % 2 === 0 ? 0.5 : -0.5
    const t0 = performance.now()
    useCarrito.getState().cambiarCantidadItem(id0, delta)
    tCant.push(performance.now() - t0)
  }

  // ── Medición: agregar ítem (25 → 75 ítems) ──
  const NADD = 50
  const tAdd: number[] = []
  for (let k = 0; k < NADD; k++) {
    const t0 = performance.now()
    agregarUno(1000 + k)
    tAdd.push(performance.now() - t0)
  }

  const c = stats(tCant)
  const a = stats(tAdd)
  console.log('─────────────────────────────────────────────')
  console.log(`Carrito base: ${N_BASE} ítems · blob localStorage: ${tamKB} KB`)
  console.log('')
  console.log(`Subir cantidad ±0,5  (n=${NCANT}, carrito=25)`)
  console.log(`  media ${fmt(c.media)} · p50 ${fmt(c.p50)} · min ${fmt(c.min)} · max ${fmt(c.max)}`)
  console.log('')
  console.log(`Agregar ítem         (n=${NADD}, carrito 25→75)`)
  console.log(`  media ${fmt(a.media)} · p50 ${fmt(a.p50)} · min ${fmt(a.min)} · max ${fmt(a.max)}`)
  console.log('─────────────────────────────────────────────')
}

main()
