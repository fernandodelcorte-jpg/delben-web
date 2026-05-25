import {
  collection,
  getDocs,
  addDoc,
  getDoc,
  setDoc,
  doc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { TasaUsdDoc, TasaUsd } from '@/lib/firebase/tipos-firestore'

const TASA_USD_FALLBACK = 4000

export async function getTasaUsdActual(): Promise<number> {
  const snap = await getDocs(
    query(collection(db, 'tasa_usd_historial'), orderBy('created_at', 'desc'), limit(1)),
  )
  if (snap.empty) return TASA_USD_FALLBACK
  return (snap.docs[0]!.data() as TasaUsdDoc).valor
}

export async function getTasaUsdHistorial(): Promise<TasaUsd[]> {
  const snap = await getDocs(
    query(collection(db, 'tasa_usd_historial'), orderBy('created_at', 'desc')),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as TasaUsdDoc) }))
}

export async function actualizarTasaUsd(
  valor: number,
  creado_por: string,
): Promise<TasaUsd> {
  const ahora = Date.now()
  const data: TasaUsdDoc = { valor, vigente_desde: ahora, creado_por, created_at: ahora }
  const ref = await addDoc(collection(db, 'tasa_usd_historial'), data)
  return { id: ref.id, ...data }
}

// ─── Logo Delben ──────────────────────────────────────────────────────────────

export async function getLogoDelben(): Promise<string | null> {
  const snap = await getDoc(doc(db, 'config', 'delben'))
  if (!snap.exists()) return null
  return (snap.data() as { logo_url?: string }).logo_url ?? null
}

export async function setLogoDelben(logo_url: string): Promise<void> {
  await setDoc(doc(db, 'config', 'delben'), { logo_url }, { merge: true })
}
