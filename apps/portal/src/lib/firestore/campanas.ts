import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { CampanaDoc, CampanaFirestore } from '@/lib/firebase/tipos-firestore'
import type { Campana as CampanaMotor } from '@delben/core'

// ─── Conversión Firestore → motor ─────────────────────────────────────────────

export function campanaToMotor(c: CampanaFirestore): CampanaMotor {
  return {
    id: c.id,
    pct: c.descuento_pct,
    desde: new Date(c.fecha_desde),
    hasta: new Date(c.fecha_hasta),
    activa: c.activa,
    segmentacion: c.segmentacion,
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getCampanas(): Promise<CampanaFirestore[]> {
  const snap = await getDocs(
    query(collection(db, 'campanas'), orderBy('created_at', 'desc')),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as CampanaDoc) }))
}

export async function getCampanasActivas(): Promise<CampanaMotor[]> {
  const snap = await getDocs(
    query(collection(db, 'campanas'), where('activa', '==', true)),
  )
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as CampanaDoc) }))
    .map(campanaToMotor)
}

// ─── Escritura ────────────────────────────────────────────────────────────────

export async function crearCampana(
  data: Omit<CampanaDoc, 'created_at'>,
): Promise<CampanaFirestore> {
  const ahora = Date.now()
  const ref = await addDoc(collection(db, 'campanas'), { ...data, created_at: ahora })
  return { id: ref.id, ...data, created_at: ahora }
}

export async function toggleCampanaActiva(id: string, activa: boolean): Promise<void> {
  await updateDoc(doc(db, 'campanas', id), { activa })
}
