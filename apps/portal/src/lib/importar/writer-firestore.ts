/**
 * Escribe los datos parseados en Firestore en lotes de 400 operaciones.
 * Es idempotente: reimportar actualiza sin duplicar (IDs deterministas).
 */

import {
  collection,
  doc,
  writeBatch,
  getFirestore,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { ResultadoParserModulos, ItemConId } from './parser-modulos'
import type { ResultadoParserHerrajes } from './parser-herrajes'

const BATCH_SIZE = 400

type Progreso = (pct: number, mensaje: string) => void

// camposPreservados: si se especifica, solo actualiza esos campos (los demás se preservan).
// Útil para categorías: el import no debe borrar categorias_macro_ids ni mostrar_en_todas.
async function escribirLotes<T extends object>(
  coleccionPath: string,
  items: ItemConId<T>[],
  onProgress: Progreso,
  offsetPct: number,
  rangoPct: number,
  etiqueta: string,
  camposPreservados?: string[],
) {
  let escritas = 0
  const total = items.length

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const lote = writeBatch(db)
    const chunk = items.slice(i, i + BATCH_SIZE)

    for (const item of chunk) {
      const ref = doc(collection(db, coleccionPath), item.id)
      if (camposPreservados) {
        // mergeFields: actualiza solo estos campos; deja el resto intacto en Firestore
        lote.set(ref, item.doc, { mergeFields: camposPreservados })
      } else {
        lote.set(ref, item.doc)
      }
    }

    await lote.commit()
    escritas += chunk.length
    const pct = offsetPct + Math.round((escritas / total) * rangoPct)
    onProgress(pct, `${etiqueta}: ${escritas} / ${total}`)
  }
}

// ─── Módulos ─────────────────────────────────────────────────────────────────

export async function escribirModulos(
  datos: ResultadoParserModulos,
  onProgress: Progreso,
): Promise<void> {
  // categorias_macro_ids y mostrar_en_todas son gestionados por el admin, no por el import.
  const CAMPOS_CATEGORIA = ['nombre', 'desc_desarmado_base_pct', 'desc_desarmado_premium_pct', 'orden', 'activo']

  // imagen_url la gestiona subirImagenes; reimportar el Excel nunca debe pisarla.
  const CAMPOS_MODULO = [
    'codigo_excel', 'categoria_id', 'tipologia', 'nombre',
    'altura', 'profundidad', 'imagen_nombre', 'search_keywords', 'activo',
    'requiere_fachada', 'requiere_estructura', 'precio_min', 'colores_metal',
  ]

  const pasos: Array<{
    items: ItemConId<object>[]
    path: string
    label: string
    peso: number
    campos?: string[]
  }> = [
    { items: datos.tiposEstructura, path: 'tipos_estructura', label: 'Tipos estructura', peso: 2 },
    { items: datos.tiposFachada, path: 'tipos_fachada', label: 'Tipos fachada', peso: 2 },
    { items: datos.categorias as ItemConId<object>[], path: 'categorias', label: 'Categorías', peso: 2, campos: CAMPOS_CATEGORIA },
    { items: datos.subcategorias, path: 'subcategorias', label: 'Subcategorías', peso: 2 },
    { items: datos.acabados, path: 'acabados', label: 'Acabados', peso: 4 },
    { items: datos.modulos as ItemConId<object>[], path: 'modulos', label: 'Módulos', peso: 20, campos: CAMPOS_MODULO },
  ]

  // Calcular offset de progreso por paso
  const pesoTotal = pasos.reduce((s, p) => s + p.peso, 0) + 60 // 60 para precios
  let offsetAcum = 0

  for (const paso of pasos) {
    if (paso.items.length === 0) {
      offsetAcum += (paso.peso / pesoTotal) * 40
      continue
    }
    const rango = Math.round((paso.peso / pesoTotal) * 40)
    await escribirLotes(paso.path, paso.items, onProgress, Math.round(offsetAcum), rango, paso.label, paso.campos)
    offsetAcum += rango
  }

  // Precios — subcollection por módulo (la más larga)
  onProgress(40, 'Escribiendo precios…')
  let escritos = 0
  const totalPrecios = datos.precios.length

  for (let i = 0; i < datos.precios.length; i += BATCH_SIZE) {
    const lote = writeBatch(db)
    const chunk = datos.precios.slice(i, i + BATCH_SIZE)

    for (const precio of chunk) {
      const ref = doc(
        collection(db, `modulos/${precio.modulo_id}/precios`),
        precio.id,
      )
      lote.set(ref, precio.doc)
    }

    await lote.commit()
    escritos += chunk.length
    const pct = 40 + Math.round((escritos / totalPrecios) * 58)
    onProgress(pct, `Precios: ${escritos} / ${totalPrecios}`)
  }

  onProgress(100, 'Importación de módulos completada.')
}

// ─── Herrajes ─────────────────────────────────────────────────────────────────

export async function escribirHerrajes(
  datos: ResultadoParserHerrajes,
  onProgress: Progreso,
): Promise<void> {
  // imagen_url la gestiona subirImagenes; reimportar el Excel nunca debe pisarla.
  const CAMPOS_ACCESORIO = [
    'codigo', 'nombre', 'nombre_normalizado',
    'precio_tradicional_cop', 'precio_desarmado_cop',
    'imagen_nombre', 'disponible_tradicional', 'disponible_desarmado', 'activo',
  ]
  await escribirLotes(
    'accesorios',
    datos.accesorios as ItemConId<object>[],
    onProgress,
    0,
    98,
    'Herrajes',
    CAMPOS_ACCESORIO,
  )
  onProgress(100, 'Importación de herrajes completada.')
}

// ─── Imágenes ────────────────────────────────────────────────────────────────
// Sube archivos a Firebase Storage y actualiza imagen_url en Firestore.

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase/client'
import { updateDoc } from 'firebase/firestore'

export type ResultadoImagen = {
  archivo: string
  url: string | null
  error: string | null
  documentosActualizados: number
}

export type ResultadoRevincular = {
  vinculadas: number
  sinDocumento: number
}

export async function revincularImagenes(
  tipo: 'modulos' | 'herrajes',
  onProgress: Progreso,
): Promise<ResultadoRevincular> {
  const { listAll, ref: sRef, getDownloadURL: getURL } = await import('firebase/storage')
  const { getDocs, query, where, writeBatch: wb2 } = await import('firebase/firestore')

  const carpeta = `imagenes/${tipo}`
  const coleccion = tipo === 'modulos' ? 'modulos' : 'accesorios'

  onProgress(0, 'Listando archivos en Storage…')
  const lista = await listAll(sRef(storage, carpeta))
  const archivos = lista.items

  if (archivos.length === 0) {
    onProgress(100, 'No hay archivos en Storage para esta carpeta.')
    return { vinculadas: 0, sinDocumento: 0 }
  }

  let vinculadas = 0
  let sinDocumento = 0

  for (let i = 0; i < archivos.length; i++) {
    const item = archivos[i]!
    const pct = Math.round(((i + 1) / archivos.length) * 95)
    onProgress(pct, `Vinculando: ${item.name} (${i + 1}/${archivos.length})`)

    try {
      const url = await getURL(item)
      const q = query(collection(db, coleccion), where('imagen_nombre', '==', item.name))
      const snap = await getDocs(q)

      if (snap.docs.length > 0) {
        const lote = wb2(db)
        snap.docs.forEach((d) => lote.update(d.ref, { imagen_url: url }))
        await lote.commit()
        vinculadas += snap.docs.length
      } else {
        sinDocumento++
      }
    } catch {
      // Skip archivos que no se puedan procesar
    }
  }

  onProgress(100, `Re-vinculación completa: ${vinculadas} docs actualizados.`)
  return { vinculadas, sinDocumento }
}

export async function subirImagenes(
  archivos: File[],
  tipo: 'modulos' | 'herrajes',
  onProgress: Progreso,
): Promise<ResultadoImagen[]> {
  const resultados: ResultadoImagen[] = []
  const carpeta = `imagenes/${tipo}`
  const coleccion = tipo === 'modulos' ? 'modulos' : 'accesorios'
  const { getDocs, query, where, writeBatch: wb2 } = await import('firebase/firestore')

  for (let i = 0; i < archivos.length; i++) {
    const archivo = archivos[i]!
    const pct = Math.round((i / archivos.length) * 95)
    onProgress(pct, `Subiendo: ${archivo.name} (${i + 1}/${archivos.length})`)

    try {
      // 1. Subir a Storage
      const storageRef = ref(storage, `${carpeta}/${archivo.name}`)
      await uploadBytes(storageRef, archivo)
      const url = await getDownloadURL(storageRef)

      // 2. Buscar documentos que tienen este nombre de imagen y actualizar imagen_url
      const q = query(
        collection(db, coleccion),
        where('imagen_nombre', '==', archivo.name),
      )
      const snap = await getDocs(q)

      if (snap.docs.length > 0) {
        const lote = wb2(db)
        snap.docs.forEach((d) => lote.update(d.ref, { imagen_url: url }))
        await lote.commit()
      }

      resultados.push({
        archivo: archivo.name,
        url,
        error: null,
        documentosActualizados: snap.docs.length,
      })
    } catch (err) {
      resultados.push({
        archivo: archivo.name,
        url: null,
        error: err instanceof Error ? err.message : 'Error desconocido',
        documentosActualizados: 0,
      })
    }
  }

  onProgress(100, 'Imágenes subidas.')
  return resultados
}
