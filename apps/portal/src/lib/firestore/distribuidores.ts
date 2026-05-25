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
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type {
  Distribuidor,
  DistribuidorDoc,
  Usuario,
  UsuarioDoc,
  HistorialCondicionesDoc,
  HistorialCondiciones,
} from '@/lib/firebase/tipos-firestore'

// ─── Distribuidores ───────────────────────────────────────────────────────────

export async function getDistribuidores(): Promise<Distribuidor[]> {
  const snap = await getDocs(
    query(collection(db, 'distribuidores'), orderBy('nombre')),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as DistribuidorDoc) }))
}

export async function getDistribuidor(id: string): Promise<Distribuidor | null> {
  const snap = await getDoc(doc(db, 'distribuidores', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as DistribuidorDoc) }
}

export async function crearDistribuidor(
  data: Omit<DistribuidorDoc, 'created_at'>,
): Promise<string> {
  const ref = doc(collection(db, 'distribuidores'))
  await setDoc(ref, { ...data, created_at: Date.now() })
  return ref.id
}

export async function actualizarDistribuidor(
  id: string,
  data: Partial<DistribuidorDoc>,
): Promise<void> {
  await updateDoc(doc(db, 'distribuidores', id), data)
}

// ─── Usuarios por distribuidor ────────────────────────────────────────────────

export async function getUsuariosDistribuidor(distribuidorId: string): Promise<Usuario[]> {
  const snap = await getDocs(
    query(
      collection(db, 'usuarios'),
      where('distribuidor_id', '==', distribuidorId),
    ),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as UsuarioDoc) }))
}

// ─── Historial de condiciones ─────────────────────────────────────────────────

export async function guardarHistorialCondiciones(
  distribuidorId: string,
  data: Omit<HistorialCondicionesDoc, 'vigente_desde' | 'creado_por'>,
  creadoPor: string,
): Promise<void> {
  await addDoc(
    collection(db, 'distribuidores', distribuidorId, 'historial_condiciones'),
    { ...data, vigente_desde: Date.now(), creado_por: creadoPor },
  )
}

export async function getHistorialCondiciones(
  distribuidorId: string,
): Promise<HistorialCondiciones[]> {
  const snap = await getDocs(
    query(
      collection(db, 'distribuidores', distribuidorId, 'historial_condiciones'),
      orderBy('vigente_desde', 'desc'),
    ),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as HistorialCondicionesDoc) }))
}

// ─── Usuarios por distribuidor ────────────────────────────────────────────────

export async function crearUsuarioFirestore(
  uid: string,
  data: Omit<UsuarioDoc, 'created_at'>,
): Promise<void> {
  await setDoc(doc(db, 'usuarios', uid), { ...data, created_at: Date.now() })
}

export async function getUsuariosDelben(): Promise<Usuario[]> {
  const snap = await getDocs(
    query(collection(db, 'usuarios'), where('distribuidor_id', '==', null)),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as UsuarioDoc) }))
}

export async function toggleUsuarioActivo(uid: string, activo: boolean): Promise<void> {
  await updateDoc(doc(db, 'usuarios', uid), { activo })
}
