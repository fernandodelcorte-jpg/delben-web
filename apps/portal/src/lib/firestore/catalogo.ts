/**
 * Queries de lectura del catálogo (tipos_estructura, tipos_fachada,
 * subcategorias, acabados). Usado por la ficha del módulo.
 */

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type {
  TipoEstructura,
  TipoEstructuraDoc,
  TipoFachada,
  TipoFachadaDoc,
  Subcategoria,
  SubcategoriaDoc,
  Acabado,
  AcabadoDoc,
  Categoria,
  CategoriaDoc,
  CategoriaMacro,
  CategoriaMacroDoc,
} from '@/lib/firebase/tipos-firestore'

export async function getTiposEstructura(): Promise<TipoEstructura[]> {
  const snap = await getDocs(
    query(collection(db, 'tipos_estructura'), where('activo', '==', true)),
  )
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as TipoEstructuraDoc) }))
  return docs.sort((a, b) => a.orden - b.orden)
}

export async function getTiposFachada(): Promise<TipoFachada[]> {
  const snap = await getDocs(
    query(collection(db, 'tipos_fachada'), where('activo', '==', true)),
  )
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as TipoFachadaDoc) }))
  return docs.sort((a, b) => a.orden - b.orden)
}

export async function getSubcategorias(tipoFachadaId: string): Promise<Subcategoria[]> {
  const snap = await getDocs(
    query(
      collection(db, 'subcategorias'),
      where('tipo_fachada_id', '==', tipoFachadaId),
      where('activo', '==', true),
    ),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SubcategoriaDoc) }))
}

export async function getAcabados(subcategoriaId: string): Promise<Acabado[]> {
  const snap = await getDocs(
    query(
      collection(db, 'acabados'),
      where('subcategoria_id', '==', subcategoriaId),
      where('activo', '==', true),
    ),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as AcabadoDoc) }))
}

// ─── Admin: sin filtro activo ─────────────────────────────────────────────────

export async function getAllSubcategoriasAdmin(): Promise<Subcategoria[]> {
  const snap = await getDocs(collection(db, 'subcategorias'))
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as SubcategoriaDoc) }))
  return docs.sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export async function getSubcategoriasAdmin(tipoFachadaId: string): Promise<Subcategoria[]> {
  const snap = await getDocs(
    query(collection(db, 'subcategorias'), where('tipo_fachada_id', '==', tipoFachadaId)),
  )
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as SubcategoriaDoc) }))
  return docs.sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export async function getAcabadosAdmin(subcategoriaId: string): Promise<Acabado[]> {
  const snap = await getDocs(
    query(collection(db, 'acabados'), where('subcategoria_id', '==', subcategoriaId)),
  )
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as AcabadoDoc) }))
  return docs.sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export async function crearSubcategoria(data: {
  tipo_fachada_id: string
  nombre: string
  tipo_ajuste: 'descuento' | 'ninguno' | 'recargo'
  ajuste_pct: number
  es_premium: boolean
}): Promise<Subcategoria> {
  const ref = await addDoc(collection(db, 'subcategorias'), { ...data, activo: true })
  return { id: ref.id, ...data, activo: true }
}

export async function crearAcabado(data: {
  subcategoria_id: string
  tipo_fachada_id: string
  nombre: string
}): Promise<Acabado> {
  const ref = await addDoc(collection(db, 'acabados'), { ...data, activo: true })
  return { id: ref.id, ...data, activo: true }
}

export async function toggleSubcategoriaActivo(id: string, activo: boolean): Promise<void> {
  await updateDoc(doc(db, 'subcategorias', id), { activo })
}

export async function toggleAcabadoActivo(id: string, activo: boolean): Promise<void> {
  await updateDoc(doc(db, 'acabados', id), { activo })
}

// ─── Categorías macro ─────────────────────────────────────────────────────────

export async function getCategoriasMacro(): Promise<CategoriaMacro[]> {
  const snap = await getDocs(
    query(collection(db, 'categorias_macro'), where('activo', '==', true)),
  )
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as CategoriaMacroDoc) }))
    .sort((a, b) => a.orden - b.orden)
}

export async function getCategoriasMacroAdmin(): Promise<CategoriaMacro[]> {
  const snap = await getDocs(collection(db, 'categorias_macro'))
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as CategoriaMacroDoc) }))
    .sort((a, b) => a.orden - b.orden)
}

export async function crearCategoriaMacro(data: {
  nombre: string
  orden: number
  mostrar_todas: boolean
}): Promise<CategoriaMacro> {
  const ref = await addDoc(collection(db, 'categorias_macro'), { ...data, activo: true })
  return { id: ref.id, ...data, activo: true }
}

export async function actualizarCategoriaMacro(
  id: string,
  data: Partial<Pick<CategoriaMacroDoc, 'nombre' | 'orden' | 'activo' | 'mostrar_todas'>>,
): Promise<void> {
  await updateDoc(doc(db, 'categorias_macro', id), data)
}

export async function eliminarCategoriaMacro(id: string): Promise<void> {
  await deleteDoc(doc(db, 'categorias_macro', id))
}

// ─── Categorías de lista de precios ──────────────────────────────────────────

export async function getCategorias(): Promise<Categoria[]> {
  const snap = await getDocs(
    query(collection(db, 'categorias'), where('activo', '==', true)),
  )
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as CategoriaDoc) }))
  return docs.sort((a, b) => a.orden - b.orden)
}

export async function getCategoriasAdmin(): Promise<Categoria[]> {
  const snap = await getDocs(collection(db, 'categorias'))
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as CategoriaDoc) }))
    .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'))
}

export async function crearCategoria(data: {
  nombre: string
  desc_desarmado_base_pct: number
  desc_desarmado_premium_pct: number
  orden: number
  categorias_macro_ids: string[]
  mostrar_en_todas: boolean
}): Promise<Categoria> {
  const ref = await addDoc(collection(db, 'categorias'), { ...data, activo: true })
  return { id: ref.id, ...data, activo: true }
}

export async function actualizarCategoria(
  id: string,
  data: Partial<Pick<CategoriaDoc,
    | 'nombre'
    | 'desc_desarmado_base_pct'
    | 'desc_desarmado_premium_pct'
    | 'orden'
    | 'activo'
    | 'categorias_macro_ids'
    | 'mostrar_en_todas'
  >>,
): Promise<void> {
  await updateDoc(doc(db, 'categorias', id), data)
}

// ─── Sembrar datos iniciales ──────────────────────────────────────────────────

const MACROS_INICIALES: Array<CategoriaMacroDoc & { id: string }> = [
  { id: 'cocina',                     nombre: 'Cocina',                     orden: 1, activo: true, mostrar_todas: false },
  { id: 'closet',                     nombre: 'Closet',                     orden: 2, activo: true, mostrar_todas: false },
  { id: 'muebles-de-bano',            nombre: 'Muebles de Baño',            orden: 3, activo: true, mostrar_todas: false },
  { id: 'centros-de-entretenimiento', nombre: 'Centros de Entretenimiento', orden: 4, activo: true, mostrar_todas: false },
  { id: 'carpinteria',                nombre: 'Carpintería',                orden: 5, activo: true, mostrar_todas: false },
  { id: 'otros',                      nombre: 'Otros',                      orden: 6, activo: true, mostrar_todas: true  },
]

// Mapeo nombre normalizado (sin acentos, uppercase, trim) → asignación de macros.
// Se busca por nombre en los documentos reales de Firestore para evitar dependencias
// del ID que generó el import del Excel.
const ASIGNACIONES_POR_NOMBRE: Array<{
  nombre: string
  categorias_macro_ids: string[]
  mostrar_en_todas: boolean
}> = [
  { nombre: 'COCINA',                     categorias_macro_ids: ['cocina'],                          mostrar_en_todas: false },
  { nombre: 'COMPLEMENTO COCINAS',        categorias_macro_ids: ['cocina'],                          mostrar_en_todas: false },
  { nombre: 'CLOSETS',                    categorias_macro_ids: ['closet'],                          mostrar_en_todas: false },
  { nombre: 'QUALITA',                    categorias_macro_ids: ['closet'],                          mostrar_en_todas: false },
  { nombre: 'COMPLEMENTO CLOSETS',        categorias_macro_ids: ['closet'],                          mostrar_en_todas: false },
  { nombre: 'MULTI STORE',               categorias_macro_ids: ['closet', 'carpinteria'],            mostrar_en_todas: false },
  { nombre: 'MUEBLES DE BANO',           categorias_macro_ids: ['muebles-de-bano'],                  mostrar_en_todas: false },
  { nombre: 'MUEBLES DE ENTRETENIMIENTO', categorias_macro_ids: ['centros-de-entretenimiento'],      mostrar_en_todas: false },
  { nombre: 'ZONA ROPAS',                categorias_macro_ids: ['carpinteria'],                      mostrar_en_todas: false },
  { nombre: 'PUERTAS DE PASO',           categorias_macro_ids: ['carpinteria'],                      mostrar_en_todas: false },
  { nombre: 'DECORACION',                categorias_macro_ids: ['carpinteria'],                      mostrar_en_todas: false },
  { nombre: 'ACABADOS X M2',             categorias_macro_ids: [],                                   mostrar_en_todas: true  },
]

function normCat(s: string): string {
  return s.toUpperCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export async function sembrarCategoriasMacro(): Promise<{ macrosCreadas: number; categoriasActualizadas: number; noEncontradas: string[] }> {
  let macrosCreadas = 0
  let categoriasActualizadas = 0
  const noEncontradas: string[] = []

  // 1. Crear/actualizar macros con IDs fijos
  await Promise.all(
    MACROS_INICIALES.map(({ id, ...data }) =>
      setDoc(doc(db, 'categorias_macro', id), data, { merge: true }).then(() => macrosCreadas++),
    ),
  )

  // 2. Leer los documentos reales de la colección categorías (creados por el import del Excel)
  const catSnap = await getDocs(collection(db, 'categorias'))

  // Índice: nombre normalizado → docId real en Firestore
  const porNombre = new Map<string, string>()
  catSnap.docs.forEach((d) => {
    const nombre = (d.data() as CategoriaDoc).nombre
    if (nombre) porNombre.set(normCat(nombre), d.id)
  })

  // 3. Actualizar los documentos reales con la asignación de macros (por nombre, no por ID)
  await Promise.all(
    ASIGNACIONES_POR_NOMBRE.map(async ({ nombre, categorias_macro_ids, mostrar_en_todas }) => {
      const docId = porNombre.get(nombre)
      if (!docId) { noEncontradas.push(nombre); return }
      await updateDoc(doc(db, 'categorias', docId), { categorias_macro_ids, mostrar_en_todas })
      categoriasActualizadas++
    }),
  )

  _macroResolucionCache.clear()
  return { macrosCreadas, categoriasActualizadas, noEncontradas }
}

// ─── Resolución macro → IDs de categorías ────────────────────────────────────
// Devuelve null si la macro muestra todos los módulos (sin filtro).
// Devuelve string[] con los IDs de categorías de lista aplicables.

// Caché de sesión: evita 2 queries a Firestore cada vez que se abre el buscador
const _macroResolucionCache = new Map<string, string[] | null>()

export async function resolverCategoriasParaMacro(macroId: string): Promise<string[] | null> {
  if (_macroResolucionCache.has(macroId)) return _macroResolucionCache.get(macroId)!

  const [macroSnap, categoriasSnap] = await Promise.all([
    getDocs(query(collection(db, 'categorias_macro'), where('activo', '==', true))),
    getDocs(collection(db, 'categorias')),
  ])

  const macro = macroSnap.docs.find((d) => d.id === macroId)
  if (!macro) {
    _macroResolucionCache.set(macroId, null)
    return null
  }
  const macroData = macro.data() as CategoriaMacroDoc
  if (macroData.mostrar_todas) {
    _macroResolucionCache.set(macroId, null)
    return null // sin filtro → todos los módulos
  }

  const categorias = categoriasSnap.docs.map((d) => ({ id: d.id, ...(d.data() as CategoriaDoc) }))
  const resultado = categorias
    .filter((c) => c.mostrar_en_todas || (c.categorias_macro_ids ?? []).includes(macroId))
    .map((c) => c.id)
  _macroResolucionCache.set(macroId, resultado)
  return resultado
}
