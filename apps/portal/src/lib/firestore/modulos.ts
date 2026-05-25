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
  Precio,
  PrecioDoc,
  Accesorio,
  AccesorioDoc,
} from '@/lib/firebase/tipos-firestore'

// ─── Caché de sesión ──────────────────────────────────────────────────────────

let _modulosCache: Modulo[] | null = null
let _accesoriosCache: Accesorio[] | null = null

async function cargarModulos(): Promise<Modulo[]> {
  if (_modulosCache) return _modulosCache
  const snap = await getDocs(
    query(collection(db, 'modulos'), where('activo', '==', true)),
  )
  _modulosCache = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ModuloDoc) }))
  return _modulosCache
}

async function cargarAccesorios(): Promise<Accesorio[]> {
  if (_accesoriosCache) return _accesoriosCache
  const snap = await getDocs(
    query(collection(db, 'accesorios'), where('activo', '==', true)),
  )
  _accesoriosCache = snap.docs.map((d) => ({ id: d.id, ...(d.data() as AccesorioDoc) }))
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
  let todos = await cargarModulos()

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
  const todos = await cargarModulos()
  return todos
    .filter((m) => m.nombre === nombre)
    .sort((a, b) => a.altura - b.altura || a.profundidad - b.profundidad)
}

// ─── Precios de un módulo ─────────────────────────────────────────────────────

export async function getPreciosModulo(moduloId: string): Promise<Precio[]> {
  const snap = await getDocs(collection(db, `modulos/${moduloId}/precios`))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as PrecioDoc) }))
}
