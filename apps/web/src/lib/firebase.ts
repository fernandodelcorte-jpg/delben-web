/**
 * Init mínimo de Firebase para la web institucional.
 *
 * La web NO usa Auth, Storage ni el Admin SDK: lo único que necesita de Firebase
 * es leer un dato público de marca (config/delben.logo_url). Por eso aquí solo se
 * exporta `db` (Firestore). La lectura ocurre server-side (ver lib/logo.ts) contra
 * la regla de lectura pública del doc config/delben (ver firestore.rules).
 *
 * Usa la misma config pública (NEXT_PUBLIC_FIREBASE_*) que el portal. Estas claves
 * se exponen al cliente por diseño en Firebase; la seguridad real vive en las
 * Security Rules. En el sitio Netlify de la web hay que configurar al menos
 * NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID y
 * NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN para que la lectura funcione.
 */
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY'],
  authDomain: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  storageBucket: process.env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: process.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  appId: process.env['NEXT_PUBLIC_FIREBASE_APP_ID'],
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
export const db = getFirestore(app)
