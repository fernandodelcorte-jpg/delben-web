/**
 * Script de un solo uso: asigna rol 'super_admin' a un usuario de Firebase Auth.
 *
 * Uso:
 *   node scripts/set-super-admin.mjs <UID_DEL_USUARIO>
 *
 * Requiere:
 *   - scripts/service-account.json  (descargado de Firebase Console)
 *   - npm install firebase-admin --no-save  (ejecutar antes)
 */

import { readFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const uid = process.argv[2]
if (!uid) {
  console.error('ERROR: Falta el UID. Uso: node scripts/set-super-admin.mjs <UID>')
  process.exit(1)
}

let serviceAccount
try {
  serviceAccount = JSON.parse(
    readFileSync(new URL('./service-account.json', import.meta.url))
  )
} catch {
  console.error('ERROR: No se encontró scripts/service-account.json')
  console.error('Descárgalo de: Firebase Console → Configuración del proyecto → Cuentas de servicio')
  process.exit(1)
}

let admin
try {
  admin = require('firebase-admin')
} catch {
  console.error('ERROR: firebase-admin no instalado.')
  console.error('Ejecuta primero: npm install firebase-admin --no-save')
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

try {
  await admin.auth().setCustomUserClaims(uid, { rol: 'super_admin' })
  const user = await admin.auth().getUser(uid)
  console.log(`✓ Rol 'super_admin' asignado a: ${user.email} (${uid})`)
  console.log('  Ahora cierra sesión en el navegador y vuelve a entrar para que el token se actualice.')
} catch (err) {
  console.error('ERROR al asignar el rol:', err.message)
  process.exit(1)
}

process.exit(0)
