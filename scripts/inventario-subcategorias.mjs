/**
 * Script de SOLO LECTURA: inventario de ajustes de subcategoría en producción.
 *
 * Lee /subcategorias y /categorias y reporta por consola. NO escribe, NO
 * actualiza, NO borra nada. No existe modo write: solo usa .get() y console.log.
 *
 * Credenciales: ADC (Application Default Credentials) del usuario ya logueado.
 *   Requiere haber corrido antes:  gcloud auth application-default login
 *   (cuenta fernandodelcorte@delben.co, quota project delben---web).
 *   El WARNING de quota project es inofensivo para lectura.
 *
 * Uso:
 *   node scripts/inventario-subcategorias.mjs
 *
 * NO usa service-account.json (la org policy bloquea generar llaves; no se toca).
 */

import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const PROJECT_ID = 'delben---web'

let admin
try {
  admin = require('firebase-admin')
} catch {
  console.error('ERROR: firebase-admin no instalado.')
  console.error('Ejecuta primero: npm install firebase-admin --no-save')
  process.exit(1)
}

// Credencial ADC (gcloud auth application-default login). Sin service account.
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID,
  })
} catch (err) {
  console.error('ERROR al inicializar con ADC:', err.message)
  console.error('Si las credenciales expiraron, corre: gcloud auth application-default login')
  process.exit(1)
}

const db = admin.firestore()

function fmtPct(n) {
  return typeof n === 'number' ? `${n}%` : String(n)
}

try {
  // ── /subcategorias (solo lectura) ──────────────────────────────────────────
  const snap = await db.collection('subcategorias').get()
  const subs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  INVENTARIO DE SUBCATEGORÍAS — /subcategorias (SOLO LECTURA)')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Total de subcategorías: ${subs.length}`)

  // Con ajuste real (tipo_ajuste != 'ninguno' O ajuste_pct != 0)
  const conAjuste = subs.filter(
    (s) => (s.tipo_ajuste && s.tipo_ajuste !== 'ninguno') || (s.ajuste_pct && s.ajuste_pct !== 0),
  )

  console.log(`\nCon ajuste (tipo_ajuste != 'ninguno' o ajuste_pct != 0): ${conAjuste.length}`)
  console.log('───────────────────────────────────────────────────────────────')
  if (conAjuste.length === 0) {
    console.log('  (ninguna)')
  } else {
    for (const s of conAjuste) {
      const activo = s.activo === false ? ' [INACTIVA]' : ''
      console.log(
        `  • ${s.nombre ?? '(sin nombre)'} — ${s.tipo_ajuste} ${fmtPct(s.ajuste_pct)} ` +
          `· fachada: ${s.tipo_fachada_id ?? '(?)'} · id: ${s.id}${activo}`,
      )
    }
  }

  // Conteo descuento vs recargo
  const nDescuento = conAjuste.filter((s) => s.tipo_ajuste === 'descuento').length
  const nRecargo = conAjuste.filter((s) => s.tipo_ajuste === 'recargo').length
  console.log('\nConteo por tipo de ajuste:')
  console.log(`  descuento: ${nDescuento}`)
  console.log(`  recargo:   ${nRecargo}`)

  // Subcategorías activas vs inactivas (informativo)
  const activas = subs.filter((s) => s.activo !== false).length
  console.log(`\nSubcategorías activas: ${activas} / ${subs.length}`)

  // ── /categorias (solo lectura) — dimensionar la matriz ──────────────────────
  const catSnap = await db.collection('categorias').get()
  const cats = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const catsActivas = cats.filter((c) => c.activo !== false)

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  CATEGORÍAS DE LISTA DE PRECIOS — /categorias (SOLO LECTURA)')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Total de categorías: ${cats.length}`)
  console.log(`Categorías activas:  ${catsActivas.length}`)

  // Tamaño potencial de la matriz (categorías activas × subcategorías-con-ajuste)
  console.log('\nTamaño potencial de la matriz categoría × subcategoría-con-ajuste:')
  console.log(`  ${catsActivas.length} categorías activas × ${conAjuste.length} subcategorías con ajuste`)
  console.log(`  = hasta ${catsActivas.length * conAjuste.length} pares posibles (cota superior)`)

  console.log('\n✓ Lectura completada. No se escribió nada.')
} catch (err) {
  console.error('ERROR durante la lectura:', err.message)
  process.exit(1)
}

process.exit(0)
