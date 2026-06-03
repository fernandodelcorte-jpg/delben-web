import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type IdTokenResult,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import type { Rol } from '@delben/firebase'

const firebaseConfig = {
  apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY'],
  authDomain: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  storageBucket: process.env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: process.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  appId: process.env['NEXT_PUBLIC_FIREBASE_APP_ID'],
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// App secundaria — usada para crear usuarios sin cerrar la sesión del admin
const appSecundaria =
  getApps().find((a) => a.name === 'secondary') ??
  initializeApp(firebaseConfig, 'secondary')
const authSecundaria = getAuth(appSecundaria)

export async function crearUsuarioAuth(
  email: string,
  password: string,
): Promise<string> {
  const cred = await createUserWithEmailAndPassword(authSecundaria, email, password)
  await signOut(authSecundaria)
  return cred.user.uid
}

export async function iniciarSesion(correo: string, contrasena: string) {
  return signInWithEmailAndPassword(auth, correo, contrasena)
}

export async function cerrarSesion() {
  return signOut(auth)
}

export async function recuperarContrasena(correo: string) {
  return sendPasswordResetEmail(auth, correo)
}

export function extraerRol(token: IdTokenResult): Rol | null {
  const rol = token.claims['rol']
  return typeof rol === 'string' ? (rol as Rol) : null
}

export { onAuthStateChanged }
