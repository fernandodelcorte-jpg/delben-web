import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
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

// ─── Usuarios por distribuidor ────────────────────────────────────────────────

export async function crearUsuarioFirestore(
  uid: string,
  data: Omit<UsuarioDoc, 'created_at'>,
): Promise<void> {
  await setDoc(doc(db, 'usuarios', uid), { ...data, created_at: Date.now() })
}

export async function getUsuario(uid: string): Promise<Usuario | null> {
  const snap = await getDoc(doc(db, 'usuarios', uid))
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as UsuarioDoc) }
}

// Sedes por las que filtrar las cotizaciones del usuario (para que la query `list`
// cumpla el aislamiento por sede de las reglas). Devuelve null si puede ver todas
// (super_admin, distribuidor_admin o todas_las_sedes); o el array de sedes asignadas.
export async function getFiltroSedesUsuario(
  uid: string,
  rol: string | null,
): Promise<string[] | null> {
  if (rol === 'super_admin' || rol === 'distribuidor_admin') return null
  const u = await getUsuario(uid)
  if (!u || u.todas_las_sedes) return null
  return u.sedes_asignadas ?? []
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

// Asigna sedes a un usuario. Si todasLasSedes es true, opera en todas las sedes
// del distribuidor (sedes_asignadas se ignora).
export async function actualizarSedesUsuario(
  uid: string,
  sedesAsignadas: string[],
  todasLasSedes: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'usuarios', uid), {
    sedes_asignadas: sedesAsignadas,
    todas_las_sedes: todasLasSedes,
  })
}
