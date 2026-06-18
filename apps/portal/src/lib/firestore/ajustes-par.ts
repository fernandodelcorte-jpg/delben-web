/**
 * CRUD de /ajustes_par — ajuste adicional por par (categoría × subcategoría),
 * SOLO desarmado (rebanada B). Solo se guardan los pares CON ajuste: un par
 * ausente significa "sin adicional".
 *
 * ID determinista: /ajustes_par/{categoria_id}__{subcategoria_id}
 *   - Permite upsert idempotente y lookup directo por (categoria, subcategoria).
 *   - Separador `__` (doble guion bajo): los ids de /categorias y /subcategorias
 *     son slugs [a-z0-9-] o auto-ids de Firestore [A-Za-z0-9]; ninguno contiene
 *     `_`, así que `__` nunca es ambiguo. Se valida de forma defensiva igual.
 *
 * NOTA: esta fase NO toca el motor ni el cableado de cálculo. Es puramente
 * aditiva; los cálculos no cambian hasta el corte del motor (Push 2).
 */

import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { AjusteParDoc, AjustePar } from '@/lib/firebase/tipos-firestore'

const SEPARADOR = '__'

/**
 * Construye el id determinista del par. Lanza si algún id contiene el separador
 * (no debería pasar con slugs/auto-ids, pero blinda contra ids inesperados).
 */
function idDePar(categoriaId: string, subcategoriaId: string): string {
  if (!categoriaId || !subcategoriaId) {
    throw new Error('categoria_id y subcategoria_id son obligatorios')
  }
  if (categoriaId.includes(SEPARADOR) || subcategoriaId.includes(SEPARADOR)) {
    throw new Error(
      `id inválido para el par: '${SEPARADOR}' está reservado como separador y no puede aparecer en un id`,
    )
  }
  return `${categoriaId}${SEPARADOR}${subcategoriaId}`
}

function validarAjuste(tipoAjuste: string, ajustePct: number): void {
  if (tipoAjuste !== 'descuento' && tipoAjuste !== 'recargo') {
    throw new Error("tipo_ajuste debe ser 'descuento' o 'recargo'")
  }
  if (typeof ajustePct !== 'number' || Number.isNaN(ajustePct) || ajustePct < 0 || ajustePct > 100) {
    throw new Error('ajuste_pct debe ser un número entre 0 y 100')
  }
}

/** Todos los pares con ajuste (para la UI). */
export async function listarAjustesPar(): Promise<AjustePar[]> {
  const snap = await getDocs(collection(db, 'ajustes_par'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as AjusteParDoc) }))
}

/** Los pares de una subcategoría concreta. */
export async function listarAjustesParPorSubcategoria(
  subcategoriaId: string,
): Promise<AjustePar[]> {
  const snap = await getDocs(
    query(collection(db, 'ajustes_par'), where('subcategoria_id', '==', subcategoriaId)),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as AjusteParDoc) }))
}

/**
 * Crea o actualiza el par usando el id determinista. created_at se setea solo
 * al crear; updated_at siempre. Devuelve el doc resultante con su id.
 */
export async function upsertAjustePar(data: {
  categoria_id: string
  subcategoria_id: string
  tipo_ajuste: 'descuento' | 'recargo'
  ajuste_pct: number
  activo: boolean
}): Promise<AjustePar> {
  validarAjuste(data.tipo_ajuste, data.ajuste_pct)
  const id = idDePar(data.categoria_id, data.subcategoria_id)
  const ref = doc(db, 'ajustes_par', id)
  const ahora = Date.now()

  const existente = await getDoc(ref)
  if (existente.exists()) {
    const campos = {
      categoria_id: data.categoria_id,
      subcategoria_id: data.subcategoria_id,
      tipo_ajuste: data.tipo_ajuste,
      ajuste_pct: data.ajuste_pct,
      activo: data.activo,
      updated_at: ahora,
    }
    await updateDoc(ref, campos)
    const created_at = (existente.data() as AjusteParDoc).created_at
    return { id, created_at, ...campos }
  }

  const docNuevo: AjusteParDoc = {
    categoria_id: data.categoria_id,
    subcategoria_id: data.subcategoria_id,
    tipo_ajuste: data.tipo_ajuste,
    ajuste_pct: data.ajuste_pct,
    activo: data.activo,
    created_at: ahora,
    updated_at: ahora,
  }
  await setDoc(ref, docNuevo)
  return { id, ...docNuevo }
}

/**
 * Borra el par (se usa cuando el super_admin pone "ninguno" en una categoría que
 * antes tenía ajuste). Idempotente: borrar un par inexistente no falla.
 */
export async function eliminarAjustePar(
  categoriaId: string,
  subcategoriaId: string,
): Promise<void> {
  const id = idDePar(categoriaId, subcategoriaId)
  await deleteDoc(doc(db, 'ajustes_par', id))
}
