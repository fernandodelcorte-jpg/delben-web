/**
 * Backfill de números consecutivos para las cotizaciones VIEJAS de Del Corte Angarita.
 *
 * Contexto (del diagnóstico tests/catalogo/diagnostico-consecutivos.mjs):
 *   • 11 cotizaciones sin `numero_consecutivo`, todas del distribuidor Del Corte Angarita
 *     (o29oR2xWsChtrYwyGNGd, sigla DCA).
 *   • 4 tienen sede_id de DCA Colombia (pD2WuYjnQpYYCQ8FTc0a, sigla COL).
 *   • 7 NO tienen sede_id (anteriores a sedes) → el dueño decidió que son todas de Colombia
 *     y se les asigna sede_id = pD2WuYjnQpYYCQ8FTc0a.
 *   • El contador 2026 de esa sede no existe (está en 0).
 *
 * Qué hace (decisiones del dueño, ya tomadas):
 *   1. Recorre collectionGroup('cotizaciones'), filtra las de DCA SIN numero_consecutivo.
 *   2. Idempotente: salta cualquiera que ya tenga numero_consecutivo (no renumera ni duplica).
 *      Si no hay ninguna sin número, lo dice y termina sin escribir.
 *   3. Las ordena por createdAt (fallback fecha) ASCENDENTE — la más vieja recibe el seq más bajo.
 *   4. Asigna en orden numero_seq = 1..N, numero_anio = 2026, numero_consecutivo =
 *      `${SIGLA_DIST}-${SIGLA_SEDE}-2026-${seq.padStart(4,'0')}`.
 *   5. A las que les falte sede_id, además asigna sede_id = pD2WuYjnQpYYCQ8FTc0a.
 *   6. Crea/actualiza el contador distribuidores/{dist}/sedes/{sede}/contadores/2026 con
 *      ultimo = N (forma de ContadorDoc: { ultimo, anio, updatedAt }), para que la próxima
 *      cotización nueva por el SDK cliente encaje con la regla constraint +1 (ultimo+1).
 *
 * Salvaguardas:
 *   • DRY-RUN por defecto: imprime la tabla y el estado del contador, NO escribe nada.
 *     Corre la real con `--write`.
 *   • Las siglas NO se hardcodean: se LEEN del doc del distribuidor y de la sede. Si faltan
 *     o no coinciden con lo esperado (DCA / COL), aborta sin escribir.
 *   • Escritura todo-o-nada: un único batch (11 updates + 1 contador).
 *
 * Uso (desde apps/portal, para resolver firebase-admin + ADC):
 *   node ../../tests/catalogo/backfill-consecutivos.mjs            # dry-run (no escribe)
 *   node ../../tests/catalogo/backfill-consecutivos.mjs --write    # aplica (tras aprobación)
 *
 * Credenciales: ADC (gcloud auth application-default login). Admin SDK ignora Security Rules
 * (correcto para un script de una sola vez).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const ESCRIBIR = process.argv.includes('--write')

// Constantes del caso (del diagnóstico + decisión del dueño).
const DIST_ID = 'o29oR2xWsChtrYwyGNGd' // Del Corte Angarita
const SEDE_ID = 'pD2WuYjnQpYYCQ8FTc0a' // DCA Colombia
const ANIO = 2026
const SIGLA_DIST_ESPERADA = 'DCA'
const SIGLA_SEDE_ESPERADA = 'COL'

initializeApp({ credential: applicationDefault(), projectId: 'delben---web' })
const db = getFirestore()

function abortar(msg) {
  console.error(`\n✗ ABORTADO: ${msg}\n`)
  process.exit(1)
}

function fmtFecha(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '—'
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ')
}

console.log(`\n=== Backfill consecutivos DCA — ${ESCRIBIR ? 'CORRIDA REAL (--write)' : 'DRY-RUN (no escribe)'} ===\n`)

// ── Leer siglas reales (no hardcodear el formato) ────────────────────────────────
const distRef = db.doc(`distribuidores/${DIST_ID}`)
const sedeRef = db.doc(`distribuidores/${DIST_ID}/sedes/${SEDE_ID}`)
const [distSnap, sedeSnap] = await Promise.all([distRef.get(), sedeRef.get()])

if (!distSnap.exists) abortar(`el distribuidor ${DIST_ID} no existe`)
if (!sedeSnap.exists) abortar(`la sede ${SEDE_ID} no existe`)

const siglaDist = distSnap.data().sigla?.trim()
const siglaSede = sedeSnap.data().sigla?.trim()
if (!siglaDist) abortar(`el distribuidor ${DIST_ID} no tiene sigla configurada`)
if (!siglaSede) abortar(`la sede ${SEDE_ID} no tiene sigla configurada`)
if (siglaDist !== SIGLA_DIST_ESPERADA)
  abortar(`la sigla del distribuidor es "${siglaDist}", se esperaba "${SIGLA_DIST_ESPERADA}"`)
if (siglaSede !== SIGLA_SEDE_ESPERADA)
  abortar(`la sigla de la sede es "${siglaSede}", se esperaba "${SIGLA_SEDE_ESPERADA}"`)

console.log(`Distribuidor: ${distSnap.data().nombre ?? DIST_ID} [${DIST_ID}] — sigla ${siglaDist}`)
console.log(`Sede:         ${sedeSnap.data().nombre ?? SEDE_ID} [${SEDE_ID}] — sigla ${siglaSede}`)

// ── Recolectar cotizaciones de DCA sin número ────────────────────────────────────
const cotsSnap = await db.collectionGroup('cotizaciones').get()

const pendientes = []
let yaNumeradas = 0
let deOtrosDist = 0

for (const d of cotsSnap.docs) {
  const c = d.data()
  const distId = c.distribuidor_id ?? d.ref.parent.parent?.parent.parent?.id
  if (distId !== DIST_ID) {
    deOtrosDist++
    continue
  }
  if (c.numero_consecutivo) {
    yaNumeradas++
    continue
  }
  const ordenMs = typeof c.createdAt === 'number' ? c.createdAt : typeof c.fecha === 'number' ? c.fecha : 0
  pendientes.push({
    ref: d.ref,
    id: d.id,
    path: d.ref.path,
    sedeActual: c.sede_id ?? null,
    ordenMs,
    ordenFuente: typeof c.createdAt === 'number' ? 'createdAt' : typeof c.fecha === 'number' ? 'fecha' : '(ninguna)',
  })
}

console.log(`\nCotizaciones recorridas (collectionGroup): ${cotsSnap.size}`)
console.log(`  de otros distribuidores (ignoradas):     ${deOtrosDist}`)
console.log(`  de DCA ya numeradas (idempotencia):      ${yaNumeradas}`)
console.log(`  de DCA SIN número (a numerar):           ${pendientes.length}`)

if (pendientes.length === 0) {
  console.log('\n✓ No hay cotizaciones de DCA sin número. Nada que hacer.\n')
  process.exit(0)
}

// ── Ordenar cronológico ascendente y asignar números ─────────────────────────────
pendientes.sort((a, b) => a.ordenMs - b.ordenMs)

const N = pendientes.length
const ahora = Date.now()
const plan = pendientes.map((p, i) => {
  const seq = i + 1
  const numero = `${siglaDist}-${siglaSede}-${ANIO}-${String(seq).padStart(4, '0')}`
  return { ...p, seq, numero, asignaSede: p.sedeActual === null }
})

// ── Tabla ─────────────────────────────────────────────────────────────────────
console.log('\n#   fecha-orden          fuente     sede_id (actual → nuevo)                       numero')
console.log('─'.repeat(110))
for (const p of plan) {
  const sedeCol = p.asignaSede
    ? `${'(falta)'.padEnd(22)} → ${SEDE_ID}`
    : `${(p.sedeActual ?? '').padEnd(22)}   (sin cambio)`
  console.log(
    `${String(p.seq).padStart(2)}  ${fmtFecha(p.ordenMs).padEnd(19)}  ${p.ordenFuente.padEnd(9)}  ${sedeCol.padEnd(46)}  ${p.numero}`,
  )
}
console.log('─'.repeat(110))
for (const p of plan) console.log(`     ${p.numero}  ←  ${p.path}`)

const conSedeAsignada = plan.filter((p) => p.asignaSede).length
console.log(`\nResumen: ${N} cotizaciones a numerar (${plan[0].numero} … ${plan[N - 1].numero})`)
console.log(`  · sede_id asignado a ${conSedeAsignada} (las que no tenían)`)
console.log(`  · contador distribuidores/${DIST_ID}/sedes/${SEDE_ID}/contadores/${ANIO} → ultimo = ${N}`)
console.log(`    (próxima cotización nueva por el cliente recibirá seq ${N + 1})`)

// ── Verificación del contador actual ─────────────────────────────────────────────
const contadorRef = db.doc(`distribuidores/${DIST_ID}/sedes/${SEDE_ID}/contadores/${ANIO}`)
const contSnap = await contadorRef.get()
const ultimoActual = contSnap.exists ? contSnap.data().ultimo : undefined
console.log(`\nContador actual: ${contSnap.exists ? `existe (ultimo=${ultimoActual})` : 'no existe (=0)'}`)
if (typeof ultimoActual === 'number' && ultimoActual > 0) {
  abortar(
    `el contador ya tiene ultimo=${ultimoActual} (>0). Este backfill asume contador en 0; ` +
      `revisar manualmente para no pisar números ya emitidos.`,
  )
}

if (!ESCRIBIR) {
  console.log('\n(DRY-RUN: no se escribió nada. Revisa la tabla y corre con --write para aplicar.)\n')
  process.exit(0)
}

// ── Escritura todo-o-nada ─────────────────────────────────────────────────────────
const batch = db.batch()
for (const p of plan) {
  const update = {
    numero_consecutivo: p.numero,
    numero_seq: p.seq,
    numero_anio: ANIO,
    updatedAt: ahora,
  }
  if (p.asignaSede) update.sede_id = SEDE_ID
  batch.update(p.ref, update)
}
batch.set(contadorRef, { ultimo: N, anio: ANIO, updatedAt: ahora }, { merge: true })

await batch.commit()

console.log(`\n✓ Escrito: ${N} cotizaciones numeradas + contador en ${N}. Backfill completo.\n`)
process.exit(0)
