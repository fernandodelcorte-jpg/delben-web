// Medición de la carga inicial del catálogo (caché FRÍA) con el SDK CLIENTE real
// (firebase/firestore) — el mismo camino que usa la app. Autentica anónimo (las
// reglas solo exigen request.auth != null). Separa RED vs CPU. No toca la app.
// Correr: node apps/portal/bench/catalog-load-client.mjs
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore'

function parseEnv(path) {
  const env = {}
  for (const linea of readFileSync(path, 'utf8').split('\n')) {
    const m = linea.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    env[m[1]] = v
  }
  return env
}

const env = parseEnv(new URL('../.env.local', import.meta.url).pathname)
const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
})
const db = getFirestore(app)

// Réplica EXACTA del dedup de buscarModulos (camino sin texto de búsqueda).
function dedupPorNombre(todos) {
  const vistos = new Set()
  const unicos = []
  for (const m of todos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    if (!vistos.has(m.nombre)) { vistos.add(m.nombre); unicos.push(m) }
  }
  return unicos
}
// Réplica del recorte a disco de Tanda 2 (#2).
function aDisco({ imagen_url, search_keywords, ...resto }) { return resto }

const prom = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length
const kb = (b) => (b / 1024).toFixed(1) + ' KB'
const ms = (n) => n.toFixed(2) + ' ms'
const B = (o) => Buffer.byteLength(JSON.stringify(o), 'utf8')

async function medirRed(coleccion) {
  const get = [], materialize = []
  let datos = null, n = 0
  for (let r = 0; r < 3; r++) {
    const q = query(collection(db, coleccion), where('activo', '==', true))
    const t0 = performance.now()
    const snap = await getDocs(q)          // RED + recepción
    const t1 = performance.now()
    const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() })) // materializar (CPU)
    const t2 = performance.now()
    get.push(t1 - t0); materialize.push(t2 - t1)
    datos = arr; n = snap.size
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
  await signInAnonymously(getAuth(app))
  console.log('Catálogo real · proyecto', env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, '· caché fría · 3 corridas (SDK cliente)\n')

  // ── MÓDULOS ──
  const mod = await medirRed('modulos')
  const modJson = JSON.stringify(mod.datos)
  const modDisco = mod.datos.map(aDisco)
  const discoJson = JSON.stringify(modDisco)
  const blobLs = JSON.stringify({ data: modDisco, ts: Date.now() })

  const parseFull = medirCPU(() => JSON.parse(modJson))
  const parseDisco = medirCPU(() => JSON.parse(discoJson))
  const dedup = medirCPU(() => dedupPorNombre(mod.datos.slice()))
  const stringifyDisco = medirCPU(() => JSON.stringify(modDisco))
  const nUnicos = dedup.out.length

  // ── ACCESORIOS ──
  const acc = await medirRed('accesorios')
  const accJson = JSON.stringify(acc.datos)
  const parseAcc = medirCPU(() => JSON.parse(accJson))

  console.log('═══════════════════════ MÓDULOS ═══════════════════════')
  console.log(`Docs: ${mod.n}  ·  nombres únicos tras dedup: ${nUnicos}  ·  redundantes: ${mod.n - nUnicos} (${((1 - nUnicos / mod.n) * 100).toFixed(0)}%)\n`)
  console.log('PAYLOAD (bytes reales, UTF-8)')
  console.log(`  full (materializado de getDocs):     ${kb(B(mod.datos))}`)
  console.log(`  recortado (sin imagen_url/keywords): ${kb(Buffer.byteLength(discoJson))}`)
  console.log(`  blob localStorage {data,ts}:         ${kb(Buffer.byteLength(blobLs))}`)
  console.log(`  ahorro del recorte:                  ${(100 * (1 - Buffer.byteLength(discoJson) / Buffer.byteLength(modJson))).toFixed(0)}%\n`)
  console.log('RED — getDocs(modulos)  [corrida 1 incluye setup de conexión]')
  console.log(`  [${mod.get.map(ms).join(', ')}]  ·  prom ${ms(prom(mod.get))}  ·  prom corridas 2-3 ${ms(prom(mod.get.slice(1)))}\n`)
  console.log('CPU — hilo principal (prom de 3)')
  console.log(`  materializar docs (.map+.data()):      ${ms(prom(mod.materialize))}  [${mod.materialize.map(ms).join(', ')}]`)
  console.log(`  dedup por nombre (full → únicos):      ${ms(prom(dedup.ts))}  [${dedup.ts.map(ms).join(', ')}]`)
  console.log(`  JSON.parse payload full:               ${ms(prom(parseFull.ts))}  [${parseFull.ts.map(ms).join(', ')}]`)
  console.log(`  JSON.parse blob recortado (cache-hit): ${ms(prom(parseDisco.ts))}  [${parseDisco.ts.map(ms).join(', ')}]`)
  console.log(`  JSON.stringify blob recortado (write): ${ms(prom(stringifyDisco.ts))}  [${stringifyDisco.ts.map(ms).join(', ')}]`)

  console.log('\n═══════════════════════ ACCESORIOS ═══════════════════════')
  console.log(`Docs: ${acc.n}`)
  console.log(`PAYLOAD full: ${kb(B(acc.datos))}`)
  console.log('RED — getDocs(accesorios)')
  console.log(`  [${acc.get.map(ms).join(', ')}]  ·  prom ${ms(prom(acc.get))}  ·  prom 2-3 ${ms(prom(acc.get.slice(1)))}`)
  console.log('CPU')
  console.log(`  materializar docs:        ${ms(prom(acc.materialize))}  [${acc.materialize.map(ms).join(', ')}]`)
  console.log(`  JSON.parse payload full:  ${ms(prom(parseAcc.ts))}  [${parseAcc.ts.map(ms).join(', ')}]`)
}

main().then(() => process.exit(0)).catch((e) => { console.error('ERROR:', e?.code || e?.message || e); process.exit(1) })
