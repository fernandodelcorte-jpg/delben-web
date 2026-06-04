// Medición de la carga inicial del catálogo (caché FRÍA) sobre datos REALES.
// Lee Firestore con el Admin SDK (service account de .env.local) — bypassa las
// reglas, pero la data es idéntica a la que materializa el cliente. Separa:
//   · RED  (round-trip a Firestore, vía gRPC del Admin SDK)
//   · CPU  (materializar docs · dedup por nombre · JSON.parse · JSON.stringify)
// No modifica código de la app. Correr: node apps/portal/bench/catalog-load-bench.mjs
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// ── Cargar credenciales del service account desde apps/portal/.env.local ──
function parseEnv(path) {
  const env = {}
  for (const linea of readFileSync(path, 'utf8').split('\n')) {
    const m = linea.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    env[m[1]] = v
  }
  return env
}

const env = parseEnv(new URL('../.env.local', import.meta.url).pathname)
// ADC (Application Default Credentials): requiere `gcloud auth application-default login`.
initializeApp({
  credential: applicationDefault(),
  projectId: env.FIREBASE_PROJECT_ID,
})
const db = getFirestore()

// ── Réplica EXACTA de la lógica de buscarModulos (camino sin texto) ──
function dedupPorNombre(todos) {
  const vistos = new Set()
  const unicos = []
  for (const m of todos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    if (!vistos.has(m.nombre)) {
      vistos.add(m.nombre)
      unicos.push(m)
    }
  }
  return unicos
}

// ── Réplica del recorte a disco de Tanda 2 (#2) ──
function aDisco({ imagen_url, search_keywords, ...resto }) {
  return resto
}

const prom = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length
const kb = (bytes) => (bytes / 1024).toFixed(1) + ' KB'
const ms = (n) => n.toFixed(2) + ' ms'
const bytesDe = (obj) => Buffer.byteLength(JSON.stringify(obj), 'utf8')

async function medirRed(coleccion) {
  const get = []
  const materialize = []
  let datos = null
  let n = 0
  for (let r = 0; r < 3; r++) {
    const q = db.collection(coleccion).where('activo', '==', true)
    const t0 = performance.now()
    const snap = await q.get() // RED + recepción del stream
    const t1 = performance.now()
    const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() })) // materializar (CPU)
    const t2 = performance.now()
    get.push(t1 - t0)
    materialize.push(t2 - t1)
    datos = arr
    n = snap.size
  }
  return { get, materialize, datos, n }
}

function medirCPU(fn, runs = 3) {
  const ts = []
  let out
  for (let r = 0; r < runs; r++) {
    const t0 = performance.now()
    out = fn()
    ts.push(performance.now() - t0)
  }
  return { ts, out }
}

async function main() {
  console.log('Catálogo real · proyecto', env.FIREBASE_PROJECT_ID, '· caché fría · 3 corridas\n')

  // ── MÓDULOS ──
  const mod = await medirRed('modulos')
  const modJson = JSON.stringify(mod.datos)
  const modDisco = mod.datos.map(aDisco)
  const blobLs = JSON.stringify({ data: modDisco, ts: Date.now() })

  const parseFull = medirCPU(() => JSON.parse(modJson))
  const parseDisco = medirCPU(() => JSON.parse(JSON.stringify(modDisco)))
  const dedup = medirCPU(() => dedupPorNombre(mod.datos.slice())) // slice: sort no muta el original
  const stringifyDisco = medirCPU(() => JSON.stringify(modDisco))
  const nUnicos = dedup.out.length

  // ── ACCESORIOS ──
  const acc = await medirRed('accesorios')
  const accJson = JSON.stringify(acc.datos)
  const parseAcc = medirCPU(() => JSON.parse(accJson))

  // ── REPORTE ──
  console.log('═══════════════════════ MÓDULOS ═══════════════════════')
  console.log(`Docs: ${mod.n}  ·  nombres únicos tras dedup: ${nUnicos}  ·  redundantes: ${mod.n - nUnicos} (${((1 - nUnicos / mod.n) * 100).toFixed(0)}%)`)
  console.log('')
  console.log('PAYLOAD (bytes reales, serializado UTF-8)')
  console.log(`  full (como lo trae getDocs):        ${kb(Buffer.byteLength(modJson))}`)
  console.log(`  recortado (sin imagen_url/keywords): ${kb(Buffer.byteLength(JSON.stringify(modDisco)))}`)
  console.log(`  blob localStorage {data,ts}:         ${kb(Buffer.byteLength(blobLs))}`)
  console.log(`  ahorro del recorte:                  ${(100 * (1 - Buffer.byteLength(JSON.stringify(modDisco)) / Buffer.byteLength(modJson))).toFixed(0)}%`)
  console.log('')
  console.log('RED  — getDocs(modulos) round-trip (Admin SDK/gRPC)')
  console.log(`  corridas: [${mod.get.map(ms).join(', ')}]  ·  prom ${ms(prom(mod.get))}`)
  console.log('')
  console.log('CPU  — hilo principal (prom de 3)')
  console.log(`  materializar docs (.map + .data()):  ${ms(prom(mod.materialize))}   corridas [${mod.materialize.map(ms).join(', ')}]`)
  console.log(`  dedup por nombre (2076 → únicos):    ${ms(prom(dedup.ts))}   corridas [${dedup.ts.map(ms).join(', ')}]`)
  console.log(`  JSON.parse payload full:             ${ms(prom(parseFull.ts))}   corridas [${parseFull.ts.map(ms).join(', ')}]`)
  console.log(`  JSON.parse blob recortado (cache-hit): ${ms(prom(parseDisco.ts))}   corridas [${parseDisco.ts.map(ms).join(', ')}]`)
  console.log(`  JSON.stringify blob recortado (write): ${ms(prom(stringifyDisco.ts))}   corridas [${stringifyDisco.ts.map(ms).join(', ')}]`)

  console.log('\n═══════════════════════ ACCESORIOS ═══════════════════════')
  console.log(`Docs: ${acc.n}`)
  console.log(`PAYLOAD full: ${kb(Buffer.byteLength(accJson))}`)
  console.log('RED  — getDocs(accesorios) round-trip')
  console.log(`  corridas: [${acc.get.map(ms).join(', ')}]  ·  prom ${ms(prom(acc.get))}`)
  console.log('CPU')
  console.log(`  materializar docs:        ${ms(prom(acc.materialize))}   corridas [${acc.materialize.map(ms).join(', ')}]`)
  console.log(`  JSON.parse payload full:  ${ms(prom(parseAcc.ts))}   corridas [${parseAcc.ts.map(ms).join(', ')}]`)
  console.log('')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
