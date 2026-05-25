import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { ProyectoDoc, Proyecto } from '@/lib/firebase/tipos-firestore'

export async function crearProyecto(
  distribuidorId: string,
  createdBy: string,
  data: Pick<ProyectoDoc, 'clienteNombre' | 'clienteDireccion' | 'clienteCiudad' | 'proyectoNombre'>,
): Promise<string> {
  const ahora = Date.now()
  const doc_data: ProyectoDoc = {
    distribuidor_id: distribuidorId,
    clienteNombre: data.clienteNombre,
    ...(data.clienteDireccion ? { clienteDireccion: data.clienteDireccion } : {}),
    ...(data.clienteCiudad ? { clienteCiudad: data.clienteCiudad } : {}),
    proyectoNombre: data.proyectoNombre,
    estado: 'en_proceso',
    createdBy,
    createdAt: ahora,
    updatedAt: ahora,
  }
  const ref = await addDoc(collection(db, `distribuidores/${distribuidorId}/proyectos`), doc_data)
  return ref.id
}

export async function getProyectos(distribuidorId: string): Promise<Proyecto[]> {
  const snap = await getDocs(collection(db, `distribuidores/${distribuidorId}/proyectos`))
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as ProyectoDoc) }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getProyecto(distribuidorId: string, proyectoId: string): Promise<Proyecto | null> {
  const snap = await getDoc(doc(db, `distribuidores/${distribuidorId}/proyectos/${proyectoId}`))
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as ProyectoDoc) }
}

export async function actualizarProyecto(
  distribuidorId: string,
  proyectoId: string,
  data: Partial<Pick<ProyectoDoc, 'clienteNombre' | 'clienteDireccion' | 'clienteCiudad' | 'proyectoNombre' | 'estado'>>,
): Promise<void> {
  const ref = doc(db, `distribuidores/${distribuidorId}/proyectos/${proyectoId}`)
  await updateDoc(ref, { ...data, updatedAt: Date.now() })
}
