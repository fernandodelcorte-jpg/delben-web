/**
 * Diagnóstico (SOLO LECTURA) para planear el backfill de números consecutivos.
 *
 * NO escribe nada en Firestore. NO toca reglas, contadores ni docs. Solo recorre
 * todas las cotizaciones de todos los distribuidores e imprime un reporte para
 * decidir cómo numerar las cotizaciones viejas (las guardadas antes de que existiera
 * el consecutivo no tienen `numero_consecutivo`).
 *
 * Qué reporta:
 *   1. Conteo total: con `numero_consecutivo` vs sin él.
 *   2. Cotizaciones SIN número, agrupadas por distribuidor y por sede.
 *   3. Cotizaciones SIN número que NO tienen `sede_id` (anteriores a sedes): caso
 *      especial, sin sede no hay sigla de sede para el formato SIGLA_DIST-SIGLA_SEDE-AÑO-####.
 *   4. Siglas: qué distribuidores y sedes involucrados tienen `sigla` y cuáles no.
 *   5. Para las que YA tienen número: rango (mín/máx de `numero_seq`) por sede/año,
 *      contrastado con el contador (`ultimo`) de esa sede/año.
 *   6. Rango de fechas (`createdAt`, con fallback a `fecha`) de las SIN número, por sede/año.
 *
 * Forma de los docs (leída de tipos-firestore.ts y cotizaciones.ts):
 *   • Cotizaciones: collectionGroup('cotizaciones') →
 *       distribuidores/{id}/proyectos/{pid}/cotizaciones/{cid}
 *     Campos: distribuidor_id, sede_id?, numero_consecutivo?, numero_seq?, numero_anio?,
 *             createdAt (ms), fecha (ms).
 *   • Distribuidor: distribuidores/{id} → { nombre, sigla? }
 *   • Sede: distribuidores/{id}/sedes/{sedeId} → { nombre, sigla? }
 *   • Contador: distribuidores/{id}/sedes/{sedeId}/contadores/{anio} → { ultimo }
 *
 * Uso (desde apps/portal, para resolver firebase-admin + ADC):
 *   node ../../tests/catalogo/diagnostico-consecutivos.mjs
 *
 * Credenciales: ADC (gcloud auth application-default login).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ credential: applicationDefault(), projectId: 'delben---web' })
const db = getFirestore()

const SIN = '(sin sede_id)'

function fmtFecha(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '—'
  return new Date(ms).toISOString().slice(0, 10)
}

console.log('\n=== Diagnóstico de números consecutivos — SOLO LECTURA (no escribe nada) ===\n')

// ── 1. Mapas de distribuidores y sedes (nombre + sigla) ─────────────────────────
const distSnap = await db.collection('distribuidores').get()
const distInfo = new Map() // distId → { nombre, sigla }
const sedeInfo = new Map() // `${distId}/${sedeId}` → { nombre, sigla }
const contadores = new Map() // `${distId}/${sedeId}/${anio}` → ultimo

for (const d of distSnap.docs) {
  const data = d.data()
  distInfo.set(d.id, { nombre: data.nombre ?? d.id, sigla: data.sigla?.trim() || null })

  const sedesSnap = await d.ref.collection('sedes').get()
  for (const s of sedesSnap.docs) {
    const sd = s.data()
    sedeInfo.set(`${d.id}/${s.id}`, { nombre: sd.nombre ?? s.id, sigla: sd.sigla?.trim() || null })

    const contSnap = await s.ref.collection('contadores').get()
    for (const c of contSnap.docs) {
      const ultimo = c.data().ultimo
      if (typeof ultimo === 'number') contadores.set(`${d.id}/${s.id}/${c.id}`, ultimo)
    }
  }
}

console.log(`Distribuidores: ${distInfo.size}`)
console.log(`Sedes:          ${sedeInfo.size}`)
console.log(`Contadores:     ${contadores.size}\n`)

// ── 2. Recorrer TODAS las cotizaciones ──────────────────────────────────────────
const cotsSnap = await db.collectionGroup('cotizaciones').get()
const total = cotsSnap.size

let conNumero = 0
let sinNumero = 0

// Agrupaciones para SIN número
const sinPorDist = new Map() // distId → count
const sinPorSede = new Map() // `${distId}/${sedeId}` → count
let sinSinSede = 0 // sin número Y sin sede_id
// rango de fechas SIN número, por sede/año → { min, max, count }
const fechasSinNum = new Map() // `${distId}/${sedeId}/${anio}` → { min, max, n }

// rango de numero_seq CON número, por sede/año → { min, max, n }
const seqConNum = new Map() // `${distId}/${sedeId}/${anio}` → { min, max, n }

// pares (dist, sede) involucrados en CUALQUIER cotización (para chequear siglas)
const sedesInvolucradas = new Set() // `${distId}/${sedeId}`
const distsInvolucrados = new Set()

for (const doc of cotsSnap.docs) {
  const c = doc.data()
  // distribuidor_id: campo, con fallback a la ruta (…/distribuidores/{id}/proyectos/…)
  const distId = c.distribuidor_id ?? doc.ref.parent.parent?.parent.parent?.id ?? '(?)'
  const sedeId = c.sede_id ?? null
  distsInvolucrados.add(distId)
  if (sedeId) sedesInvolucradas.add(`${distId}/${sedeId}`)

  const fechaMs = typeof c.createdAt === 'number' ? c.createdAt : c.fecha
  const anio = c.numero_anio ?? (typeof fechaMs === 'number' ? new Date(fechaMs).getFullYear() : '?')

  if (c.numero_consecutivo) {
    conNumero++
    if (sedeId && typeof c.numero_seq === 'number') {
      const k = `${distId}/${sedeId}/${c.numero_anio ?? anio}`
      const r = seqConNum.get(k) ?? { min: Infinity, max: -Infinity, n: 0 }
      r.min = Math.min(r.min, c.numero_seq)
      r.max = Math.max(r.max, c.numero_seq)
      r.n++
      seqConNum.set(k, r)
    }
  } else {
    sinNumero++
    sinPorDist.set(distId, (sinPorDist.get(distId) ?? 0) + 1)
    if (sedeId) {
      sinPorSede.set(`${distId}/${sedeId}`, (sinPorSede.get(`${distId}/${sedeId}`) ?? 0) + 1)
      const k = `${distId}/${sedeId}/${anio}`
      const r = fechasSinNum.get(k) ?? { min: Infinity, max: -Infinity, n: 0 }
      if (typeof fechaMs === 'number') {
        r.min = Math.min(r.min, fechaMs)
        r.max = Math.max(r.max, fechaMs)
      }
      r.n++
      fechasSinNum.set(k, r)
    } else {
      sinSinSede++
    }
  }
}

const nombreDist = (id) => distInfo.get(id)?.nombre ?? id
const nombreSede = (k) => sedeInfo.get(k)?.nombre ?? k.split('/')[1]

// ── Reporte 1: totales ──────────────────────────────────────────────────────────
console.log('───────────────────────────────────────────────────────')
console.log('1. TOTALES')
console.log('───────────────────────────────────────────────────────')
console.log(`Cotizaciones totales:        ${total}`)
console.log(`  con numero_consecutivo:    ${conNumero}`)
console.log(`  SIN numero_consecutivo:    ${sinNumero}`)

// ── Reporte 2: SIN número por distribuidor y por sede ─────────────────────────────
console.log('\n───────────────────────────────────────────────────────')
console.log('2. SIN NÚMERO — por distribuidor')
console.log('───────────────────────────────────────────────────────')
if (sinPorDist.size === 0) console.log('  (ninguna)')
for (const [distId, n] of [...sinPorDist.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${nombreDist(distId)} [${distId}]: ${n}`)
}

console.log('\n   SIN NÚMERO — por sede')
if (sinPorSede.size === 0) console.log('   (ninguna con sede_id)')
for (const [k, n] of [...sinPorSede.entries()].sort((a, b) => b[1] - a[1])) {
  const [distId] = k.split('/')
  console.log(`  ${nombreDist(distId)} › ${nombreSede(k)} [${k}]: ${n}`)
}

// ── Reporte 3: SIN número Y SIN sede_id ──────────────────────────────────────────
console.log('\n───────────────────────────────────────────────────────')
console.log('3. CASO ESPECIAL — SIN número y SIN sede_id (anteriores a sedes)')
console.log('───────────────────────────────────────────────────────')
console.log(`  Cotizaciones sin sede_id: ${sinSinSede}`)
console.log('  (sin sede no hay sigla de sede → el formato SIGLA_DIST-SIGLA_SEDE-AÑO-#### no se')
console.log('   puede formar tal cual; requieren decisión: asignar sede, o un formato alterno.)')

// ── Reporte 4: siglas de los involucrados ─────────────────────────────────────────
console.log('\n───────────────────────────────────────────────────────')
console.log('4. SIGLAS de distribuidores y sedes involucrados')
console.log('───────────────────────────────────────────────────────')
console.log('  Distribuidores con cotizaciones:')
for (const distId of [...distsInvolucrados].sort()) {
  const sig = distInfo.get(distId)?.sigla
  console.log(`    ${sig ? '✓' : '✗'} ${nombreDist(distId)} [${distId}] — sigla: ${sig ?? '(falta)'}`)
}
console.log('  Sedes con cotizaciones:')
if (sedesInvolucradas.size === 0) console.log('    (ninguna sede involucrada — todas sin sede_id)')
for (const k of [...sedesInvolucradas].sort()) {
  const [distId] = k.split('/')
  const sig = sedeInfo.get(k)?.sigla
  const existe = sedeInfo.has(k)
  console.log(
    `    ${sig ? '✓' : '✗'} ${nombreDist(distId)} › ${nombreSede(k)} [${k}] — sigla: ${
      sig ?? (existe ? '(falta)' : '(SEDE NO EXISTE)')
    }`,
  )
}

// ── Reporte 5: rango de numero_seq (CON número) vs contador ────────────────────────
console.log('\n───────────────────────────────────────────────────────')
console.log('5. CON NÚMERO — rango de numero_seq por sede/año vs contador (ultimo)')
console.log('───────────────────────────────────────────────────────')
if (seqConNum.size === 0) console.log('  (ninguna con número y sede)')
for (const [k, r] of [...seqConNum.entries()].sort()) {
  const [distId, sedeId, anio] = k.split('/')
  const ult = contadores.get(k)
  const aviso = ult === undefined ? '⚠ sin contador' : ult < r.max ? `⚠ contador(${ult}) < máx(${r.max})` : 'ok'
  console.log(
    `  ${nombreDist(distId)} › ${nombreSede(`${distId}/${sedeId}`)} ${anio}: ` +
      `seq ${r.min}–${r.max} (${r.n} cot) · contador.ultimo=${ult ?? '—'} [${aviso}]`,
  )
}
// Contadores existentes que NO aparecieron arriba (por si hay huecos)
const contadoresHuérfanos = [...contadores.keys()].filter((k) => !seqConNum.has(k))
if (contadoresHuérfanos.length) {
  console.log('  Contadores sin cotizaciones numeradas asociadas:')
  for (const k of contadoresHuérfanos.sort()) {
    const [distId, sedeId, anio] = k.split('/')
    console.log(`    ${nombreDist(distId)} › ${nombreSede(`${distId}/${sedeId}`)} ${anio}: ultimo=${contadores.get(k)}`)
  }
}

// ── Reporte 6: rango de fechas SIN número por sede/año ─────────────────────────────
console.log('\n───────────────────────────────────────────────────────')
console.log('6. SIN NÚMERO — rango de fechas (createdAt/fecha) por sede/año')
console.log('───────────────────────────────────────────────────────')
if (fechasSinNum.size === 0) console.log('  (ninguna con sede)')
for (const [k, r] of [...fechasSinNum.entries()].sort()) {
  const [distId, sedeId, anio] = k.split('/')
  const min = r.min === Infinity ? '—' : fmtFecha(r.min)
  const max = r.max === -Infinity ? '—' : fmtFecha(r.max)
  console.log(
    `  ${nombreDist(distId)} › ${nombreSede(`${distId}/${sedeId}`)} ${anio}: ${min} → ${max} (${r.n} cot)`,
  )
}

console.log('\n=== Fin del diagnóstico (no se escribió nada) ===\n')
process.exit(0)
