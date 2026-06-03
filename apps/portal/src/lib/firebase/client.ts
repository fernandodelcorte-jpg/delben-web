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

/**
 * Reset de contraseña de OTRO usuario por un super_admin (vía endpoint server-side).
 * Adjunta el ID token del llamante; la autorización real (solo super_admin) la
 * decide el servidor en /api/admin/reset-password, no este cliente.
 */
export async function restablecerContrasenaUsuario(
  email: string,
  contrasena: string,
): Promise<{ ok: true; email: string }> {
  const usuario = auth.currentUser
  if (!usuario) throw new Error('No hay una sesión activa.')
  const token = await usuario.getIdToken()

  const res = await fetch('/api/admin/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email, contrasena }),
  })

  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const mensaje =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : 'No se pudo restablecer la contraseña.'
    throw new Error(mensaje)
  }
  return data as { ok: true; email: string }
}

export function extraerRol(token: IdTokenResult): Rol | null {
  const rol = token.claims['rol']
  return typeof rol === 'string' ? (rol as Rol) : null
}

export { onAuthStateChanged }
