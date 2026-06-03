/**
 * Mantenimiento manual: el super_admin resetea la contraseña de un usuario.
 *
 * Busca el usuario en Firebase Auth por su correo (getUserByEmail) y le
 * actualiza la contraseña con el Admin SDK (updateUser). NO toca la app, el
 * motor ni las reglas: es una herramienta aparte para correr a mano.
 *
 * Uso (desde apps/portal, para resolver firebase-admin + ADC):
 *   node ../../scripts/reset-password.mjs <correo>
 *   node ../../scripts/reset-password.mjs          # pregunta también el correo
 *
 * La contraseña NUNCA se pasa por argumento (quedaría en el historial de la
 * terminal): se pide por prompt oculto y se confirma escribiéndola dos veces.
 *
 * Credenciales: ADC (gcloud auth application-default login).
 *   Si falla con un error de credenciales, corre primero:
 *     gcloud auth application-default login
 *
 * Validación: la contraseña nueva debe tener mínimo 6 caracteres (mínimo de
 * Firebase). Si es más corta, error claro y NO se intenta el cambio.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { createInterface } from 'readline'
import { Writable } from 'stream'

const MIN_LONGITUD = 6

/** Pregunta visible (eco normal). */
function pregunta(texto) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(texto, (valor) => {
      rl.close()
      resolve(valor.trim())
    })
  })
}

/** Pregunta oculta: el prompt se imprime, pero lo tecleado no se muestra. */
function preguntaOculta(texto) {
  return new Promise((resolve) => {
    const salidaMuteable = new Writable({
      write(chunk, encoding, cb) {
        if (!salidaMuteable.muted) process.stdout.write(chunk, encoding)
        cb()
      },
    })
    salidaMuteable.muted = false
    const rl = createInterface({
      input: process.stdin,
      output: salidaMuteable,
      terminal: true,
    })
    rl.question(texto, (valor) => {
      rl.close()
      process.stdout.write('\n')
      resolve(valor)
    })
    // El prompt ya se escribió; a partir de aquí se silencia el eco.
    salidaMuteable.muted = true
  })
}

// 1) Correo: por argumento o prompt.
let correo = process.argv[2]?.trim()
if (!correo) {
  correo = await pregunta('Correo del usuario: ')
}
if (!correo) {
  console.error('ERROR: Falta el correo del usuario.')
  process.exit(1)
}

// 2) Contraseña nueva: prompt oculto, confirmada dos veces.
const nueva = await preguntaOculta('Contraseña nueva: ')
const confirmacion = await preguntaOculta('Confirma la contraseña: ')

if (nueva !== confirmacion) {
  console.error('ERROR: Las contraseñas no coinciden. No se realizó ningún cambio.')
  process.exit(1)
}
if (nueva.length < MIN_LONGITUD) {
  console.error(
    `ERROR: La contraseña debe tener mínimo ${MIN_LONGITUD} caracteres. No se realizó ningún cambio.`,
  )
  process.exit(1)
}

// 3) Inicializa el Admin SDK con ADC.
initializeApp({ credential: applicationDefault(), projectId: 'delben---web' })
const auth = getAuth()

// 4) Busca el usuario y actualiza la contraseña.
let usuario
try {
  usuario = await auth.getUserByEmail(correo)
} catch (err) {
  if (err.code === 'auth/user-not-found') {
    console.error(`ERROR: No existe un usuario con ese correo (${correo}).`)
    process.exit(1)
  }
  console.error('ERROR al buscar el usuario:', err.message)
  process.exit(1)
}

try {
  await auth.updateUser(usuario.uid, { password: nueva })
} catch (err) {
  if (err.code === 'auth/invalid-password') {
    console.error('ERROR: La contraseña nueva no es válida para Firebase.')
    process.exit(1)
  }
  console.error('ERROR al actualizar la contraseña:', err.message)
  process.exit(1)
}

// 5) Confirmación SIN imprimir la contraseña.
console.log(`✓ Contraseña actualizada para ${correo}`)
process.exit(0)
