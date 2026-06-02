/**
 * Firebase Admin SDK (solo servidor). NUNCA importar desde un componente cliente.
 *
 * Se usa para verificar el ID token del usuario en route handlers y leer Firestore
 * con privilegios de servidor. Es la base de la separación REAL por rol: el servidor
 * decide qué campos (p. ej. el precio con descuento) viajan al navegador, sin confiar
 * en datos que mande el cliente.
 *
 * Selección de credenciales (en orden):
 *   1. Service account explícito por variables de entorno
 *      (FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY).
 *      Útil en producción (Netlify) si se quiere inyectar la cuenta por env.
 *   2. Application Default Credentials (ADC) — fallback.
 *      En local: `gcloud auth application-default login` (sin JSON descargable,
 *      compatible con la política de la organización que prohíbe claves de SA).
 *      En GCP/Cloud Run, etc.: la identidad del entorno.
 *      El project id se toma de FIREBASE_PROJECT_ID si está, o del proyecto por
 *      defecto de ADC (GOOGLE_CLOUD_PROJECT / quota project del login).
 */
import 'server-only'
import { getApps, initializeApp, cert, applicationDefault, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getAdminApp(): App {
  const existente = getApps()
  if (existente.length > 0) return existente[0]!

  const projectId = process.env['FIREBASE_PROJECT_ID']
  const clientEmail = process.env['FIREBASE_CLIENT_EMAIL']
  // La clave privada suele venir con \n escapados al guardarse en una sola línea.
  const privateKey = process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n')

  // 1. Service account explícito por env (las tres variables presentes).
  if (projectId && clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  }

  // 2. Fallback: Application Default Credentials (ADC). project id de env o de ADC.
  return initializeApp({
    credential: applicationDefault(),
    ...(projectId ? { projectId } : {}),
  })
}

export function adminAuth() {
  return getAuth(getAdminApp())
}

export function adminDb() {
  return getFirestore(getAdminApp())
}
