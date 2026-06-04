/**
 * Queries de módulos y accesorios para el buscador del cotizador.
 * Los catálogos se cargan completos en memoria la primera vez y se cachean
 * para el resto de la sesión (evita queries repetidas al escribir).
 */

import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type {
  Modulo,
  ModuloDoc,
  ModuloBusquedaDoc,
  Precio,
  PrecioDoc,
  Accesorio,
  AccesorioDoc,
} from '@/lib/firebase/tipos-firestore'

// ─── Caché de sesión + localStorage ──────────────────────────────────────────
// Sesión: evita re-queries al tipear. localStorage: evita descarga en cada sesión nueva.

// v2: el blob en disco cambió de forma (se recorta imagen_url + search_keywords).
const CACHE_KEY = 'delben_modulos_v2'
const CACHE_KEY_ACC = 'delben_accesorios_v1'
// Caché skinny del buscador (colección derivada modulos_busqueda, ≈727 docs).
const CACHE_KEY_BUSQUEDA = 'delben_modulos_busqueda_v1'
const CACHE_KEY_HUERFANA = 'delben_modulos_v1' // Tanda 1: nunca se borró al subir a v2.
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 horas

let _modulosCache: Modulo[] | null = null
let _accesoriosCache: Accesorio[] | null = null
let _modulosBusquedaCache: Modulo[] | null = null

// En DISCO no guardamos imagen_url ni search_keywords:
//  · search_keywords es redundante con el nombre (son sus mismos tokens, ver
//    generarKeywords); la búsqueda ya matchea contra normalizar(nombre), así que
//    omitirlo NO cambia los resultados.
//  · imagen_url son URLs largas de Storage que inflan el blob y arriesgan la cuota
//    de localStorage (si se excede, el catch fuerza re-descarga en cada sesión).
// La caché EN MEMORIA conserva el objeto completo recién traído de Firestore; solo
// se recorta lo que va a disco. Al rehidratar desde disco, imagen_url cae a null
// (la miniatura usa su fallback de iniciales) y search_keywords a [].
type ModuloDisco = Omit<Modulo, 'imagen_url' | 'search_keywords'>

function aDisco({ imagen_url: _i, search_keywords: _s, ...resto }: Modulo): ModuloDisco {
  return resto
}

function desdeDisco(m: ModuloDisco): Modulo {
  return { ...m, imagen_url: null, search_keywords: [] }
}

/** Limpia la caché de sesión y localStorage. Llamar tras reimportar el catálogo. */
export function limpiarCacheModulos(): void {
  _modulosCache = null
  _accesoriosCache = null
  _modulosBusquedaCache = null
  try { localStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
  try { localStorage.removeItem(CACHE_KEY_ACC) } catch { /* ignore */ }
  try { localStorage.removeItem(CACHE_KEY_BUSQUEDA) } catch { /* ignore */ }
  try { localStorage.removeItem(CACHE_KEY_HUERFANA) } catch { /* ignore */ }
}

// Mapea el doc skinny de modulos_busqueda a la forma `Modulo` que espera el resto
// del cotizador (store, ficha, lista). Los campos de relleno NUNCA se consumen de
// moduloPendiente aguas abajo: la ficha usa las variantes reales de
// getVariantesModulo. Así no se tocan store/carrito.ts ni ficha-modulo.tsx.
function busquedaAModulo(d: ModuloBusquedaDoc & { id: string }): Modulo {
  return {
    id: d.id,
    nombre: d.nombre,
    categoria_id: d.categoria_id,
    tipologia: d.tipologia,
    imagen_url: d.imagen_url,
    requiere_estructura: d.requiere_estructura,
    requiere_fachada: d.requiere_fachada,
    ...(d.precio_min !== undefined ? { precio_min: d.precio_min } : {}),
    activo: d.activo,
    // Relleno (no consumido de moduloPendiente):
    codigo_excel: '',
    altura: 0,
    profundidad: 0,
    imagen_nombre: null,
    search_keywords: [],
  }
}

// Caché skinny self-priming para el buscador: memoria → localStorage → Firestore.
// Baja ≈727 docs de modulos_busqueda en vez de los ≈2.076 de `modulos`.
async function cargarModulosBusqueda(): Promise<Modulo[]> {
  if (_modulosBusquedaCache) return _modulosBusquedaCache

  // Limpieza única de la caché huérfana v1 (Tanda 1), aunque no haya reimport.
  try { localStorage.removeItem(CACHE_KEY_HUERFANA) } catch { /* ignore */ }

  try {
    const raw = localStorage.getItem(CACHE_KEY_BUSQUEDA)
    if (raw) {
      const { data, ts } = JSON.parse(raw) as { data: Modulo[]; ts: number }
      if (Date.now() - ts < CACHE_TTL) {
        _modulosBusquedaCache = data
        return _modulosBusquedaCache
      }
    }
  } catch { /* localStorage no disponible o dato corrupto */ }

  const snap = await getDocs(
    query(collection(db, 'modulos_busqueda'), where('activo', '==', true)),
  )
  _modulosBusquedaCache = snap.docs.map((d) =>
    busquedaAModulo({ id: d.id, ...(d.data() as ModuloBusquedaDoc) }),
  )

  try {
    localStorage.setItem(
      CACHE_KEY_BUSQUEDA,
      JSON.stringify({ data: _modulosBusquedaCache, ts: Date.now() }),
    )
  } catch { /* cuota excedida — continuar sin caché persistente */ }

  return _modulosBusquedaCache
}

async function cargarModulos(): Promise<Modulo[]> {
  if (_modulosCache) return _modulosCache

  // Intentar desde localStorage (evita Firestore en sesiones posteriores)
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const { data, ts } = JSON.parse(raw) as { data: ModuloDisco[]; ts: number }
      if (Date.now() - ts < CACHE_TTL) {
        _modulosCache = data.map(desdeDisco)
        return _modulosCache
      }
    }
  } catch { /* localStorage no disponible o dato corrupto */ }

  const snap = await getDocs(
    query(collection(db, 'modulos'), where('activo', '==', true)),
  )
  _modulosCache = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ModuloDoc) }))

  // Persistir en localStorage (recortado) para la próxima sesión
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data: _modulosCache.map(aDisco), ts: Date.now() }),
    )
  } catch { /* cuota excedida — continuar sin caché persistente */ }

  return _modulosCache
}

async function cargarAccesorios(): Promise<Accesorio[]> {
  if (_accesoriosCache) return _accesoriosCache

  // Intentar desde localStorage (evita re-descargar los 447 en cada sesión/pestaña)
  try {
    const raw = localStorage.getItem(CACHE_KEY_ACC)
    if (raw) {
      const { data, ts } = JSON.parse(raw) as { data: Accesorio[]; ts: number }
      if (Date.now() - ts < CACHE_TTL) {
        _accesoriosCache = data
        return _accesoriosCache
      }
    }
  } catch { /* localStorage no disponible o dato corrupto */ }

  const snap = await getDocs(
    query(collection(db, 'accesorios'), where('activo', '==', true)),
  )
  _accesoriosCache = snap.docs.map((d) => ({ id: d.id, ...(d.data() as AccesorioDoc) }))

  try {
    localStorage.setItem(CACHE_KEY_ACC, JSON.stringify({ data: _accesoriosCache, ts: Date.now() }))
  } catch { /* cuota excedida — continuar sin caché persistente */ }

  return _accesoriosCache
}

// ─── Normalización ────────────────────────────────────────────────────────────

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export async function getModulosTodos(): Promise<Modulo[]> {
  return cargarModulos()
}

// ─── Búsqueda de módulos ──────────────────────────────────────────────────────

export async function buscarModulos(
  busqueda: string,
  categoriaIds?: string[], // IDs de categorías de lista de precios; undefined = sin filtro
): Promise<Modulo[]> {
  // Fuente: la colección derivada skinny (≈727), no los ≈2.076 de `modulos`.
  let todos = await cargarModulosBusqueda()

  if (categoriaIds && categoriaIds.length > 0) {
    const set = new Set(categoriaIds)
    todos = todos.filter((m) => set.has(m.categoria_id))
  }

  const texto = normalizar(busqueda.trim())
  if (texto) {
    const terminos = texto.split(/\s+/).filter(Boolean)
    todos = todos.filter((m) => {
      const haystack =
        normalizar(m.nombre) +
        ' ' +
        (m.search_keywords ?? []).map(normalizar).join(' ')
      return terminos.every((t) => haystack.includes(t))
    })
  }

  // Deduplicar por nombre: el buscador muestra un resultado por nombre único.
  // Las variantes de dimensiones (altura × profundidad) se configuran en la ficha.
  const vistos = new Set<string>()
  const unicos: Modulo[] = []
  for (const m of todos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    if (!vistos.has(m.nombre)) {
      vistos.add(m.nombre)
      unicos.push(m)
    }
  }
  return unicos
}

// ─── Búsqueda de accesorios ───────────────────────────────────────────────────

export async function buscarAccesorios(
  busqueda: string,
  modalidad: 'tradicional' | 'desarmado',
): Promise<Accesorio[]> {
  let todos = await cargarAccesorios()

  // Filtrar por disponibilidad según modalidad
  todos = todos.filter((a) =>
    modalidad === 'tradicional' ? a.disponible_tradicional : a.disponible_desarmado,
  )

  const texto = normalizar(busqueda.trim())
  if (!texto) return todos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const terminos = texto.split(/\s+/).filter(Boolean)

  return todos
    .filter((a) => {
      const haystack = normalizar(a.nombre) + ' ' + normalizar(a.nombre_normalizado ?? '')
      return terminos.every((t) => haystack.includes(t))
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

// ─── Variantes de un módulo (mismo nombre, distintas dimensiones) ─────────────

export async function getVariantesModulo(nombre: string): Promise<Modulo[]> {
  // Query a `modulos` por nombre (campo simple → auto-indexado, sin índice
  // compuesto). El filtro `activo` va en memoria sobre las ~3 variantes para
  // evitar un segundo `where`. SIN filtro de categoría: replica el comportamiento
  // previo (la versión que filtraba la caché solo comparaba por nombre).
  const snap = await getDocs(
    query(collection(db, 'modulos'), where('nombre', '==', nombre)),
  )
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as ModuloDoc) }))
    .filter((m) => m.activo)
    .sort((a, b) => a.altura - b.altura || a.profundidad - b.profundidad)
}

// ─── Precios de un módulo ─────────────────────────────────────────────────────

export async function getPreciosModulo(moduloId: string): Promise<Precio[]> {
  const snap = await getDocs(collection(db, `modulos/${moduloId}/precios`))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as PrecioDoc) }))
}
