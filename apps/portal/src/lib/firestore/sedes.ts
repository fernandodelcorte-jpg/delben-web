import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type {
  Sede,
  SedeDoc,
  HistorialCondicionesDoc,
  HistorialCondiciones,
} from '@/lib/firebase/tipos-firestore'

// Las condiciones de cálculo viven en la sede (subcolección del distribuidor).
function sedesPath(distribuidorId: string): string {
  return `distribuidores/${distribuidorId}/sedes`
}

// ─── Sedes ──────────────────────────────────────────────────────────────────

export async function getSedes(distribuidorId: string): Promise<Sede[]> {
  const snap = await getDocs(
    query(collection(db, sedesPath(distribuidorId)), orderBy('nombre')),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SedeDoc) }))
}

export async function getSede(
  distribuidorId: string,
  sedeId: string,
): Promise<Sede | null> {
  const snap = await getDoc(doc(db, sedesPath(distribuidorId), sedeId))
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as SedeDoc) }
}

export async function crearSede(
  distribuidorId: string,
  data: Omit<SedeDoc, 'created_at'>,
): Promise<string> {
  const ref = doc(collection(db, sedesPath(distribuidorId)))
  await setDoc(ref, { ...data, created_at: Date.now() })
  return ref.id
}

export async function actualizarSede(
  distribuidorId: string,
  sedeId: string,
  data: Partial<SedeDoc>,
): Promise<void> {
  await updateDoc(doc(db, sedesPath(distribuidorId), sedeId), data)
}

// ─── Historial de condiciones (por sede) ──────────────────────────────────────

export async function guardarHistorialCondiciones(
  distribuidorId: string,
  sedeId: string,
  data: Omit<HistorialCondicionesDoc, 'vigente_desde' | 'creado_por'>,
  creadoPor: string,
): Promise<void> {
  await addDoc(
    collection(db, sedesPath(distribuidorId), sedeId, 'historial_condiciones'),
    { ...data, vigente_desde: Date.now(), creado_por: creadoPor },
  )
}

export async function getHistorialCondiciones(
  distribuidorId: string,
  sedeId: string,
): Promise<HistorialCondiciones[]> {
  const snap = await getDocs(
    query(
      collection(db, sedesPath(distribuidorId), sedeId, 'historial_condiciones'),
      orderBy('vigente_desde', 'desc'),
    ),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as HistorialCondicionesDoc) }))
}
