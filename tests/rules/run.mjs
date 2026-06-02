/**
 * Pruebas de las Firestore Security Rules — aislamiento por sede (regla de oro #2).
 *
 * Se ejecuta dentro del emulador:
 *   firebase emulators:exec --only firestore "node tests/rules/run.mjs"
 *
 * No es un framework: imprime VERDE/ROJO por caso y sale con código !=0 si algo
 * falla, para que un hueco de seguridad rompa el build.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
} from 'firebase/firestore'

const aqui = dirname(fileURLToPath(import.meta.url))
const rulesPath = resolve(aqui, '../../firestore.rules')

const resultados = []
async function caso(nombre, fn) {
  try {
    await fn()
    resultados.push({ nombre, ok: true })
    console.log(`  ✅ ${nombre}`)
  } catch (e) {
    resultados.push({ nombre, ok: false, error: e?.message ?? String(e) })
    console.log(`  ❌ ${nombre}\n       ${e?.message ?? e}`)
  }
}

// ── Sede de ejemplo (forma SedeDoc completa, como la crea el super_admin) ──────
const SEDE_A = {
  nombre: 'Bogotá',
  pais: 'Colombia',
  ciudad: 'Bogotá',
  acceso_tradicional: true,
  acceso_desarmado: true,
  descuento_muebles_pct: 35,
  descuento_herrajes_pct: 15,
  servicios: { diseno_pct: 3, cotizacion_pct: 2, produccion_pct: 5, logistica_pct: 4, gestion_comercial_pct: 6 },
  universo: { iva_pct: 19 },
  activo: true,
  created_at: 1000,
}
const SEDE_B = { ...SEDE_A, nombre: 'Miami', pais: 'USA', ciudad: 'Miami', universo: { iva_pct: 0 } }

function cotizacion(sedeId) {
  return {
    distribuidor_id: 'D1',
    sede_id: sedeId,
    clienteNombre: 'Cliente',
    proyectoNombre: 'Proyecto',
    modalidad: 'desarmado',
    fecha: 1000,
    estado: 'borrador',
    items: [],
    itemsHerraje: [],
    totales: { totalModulos: 0, totalHerrajesAsociados: 0, totalHerrajes: 0, total: 0 },
    createdBy: 'x',
    createdAt: 1000,
    updatedAt: 1000,
  }
}

const env = await initializeTestEnvironment({
  projectId: 'demo-delben',
  firestore: { rules: readFileSync(rulesPath, 'utf8') },
})

// ── Semilla (con reglas desactivadas) ─────────────────────────────────────────
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  await setDoc(doc(db, 'usuarios/super'), { rol: 'super_admin', distribuidor_id: null })
  await setDoc(doc(db, 'usuarios/admin1'), { rol: 'distribuidor_admin', distribuidor_id: 'D1' })
  await setDoc(doc(db, 'usuarios/comA'), { rol: 'distribuidor_comercial', distribuidor_id: 'D1', sedes_asignadas: ['A'], todas_las_sedes: false })
  await setDoc(doc(db, 'usuarios/comOtro'), { rol: 'distribuidor_comercial', distribuidor_id: 'D2', sedes_asignadas: ['X'], todas_las_sedes: false })
  await setDoc(doc(db, 'distribuidores/D1'), { nombre: 'Del Corte Angarita', activo: true, created_at: 1000 })
  await setDoc(doc(db, 'distribuidores/D1/sedes/A'), SEDE_A)
  await setDoc(doc(db, 'distribuidores/D1/sedes/B'), SEDE_B)
  await setDoc(doc(db, 'distribuidores/D1/proyectos/P1/cotizaciones/cotA'), cotizacion('A'))
  await setDoc(doc(db, 'distribuidores/D1/proyectos/P1/cotizaciones/cotB'), cotizacion('B'))
})

const cotsP1 = (db) => collection(db, 'distribuidores/D1/proyectos/P1/cotizaciones')

const sa = env.authenticatedContext('super').firestore()
const admin1 = env.authenticatedContext('admin1').firestore()
const comA = env.authenticatedContext('comA').firestore()
const comOtro = env.authenticatedContext('comOtro').firestore()

console.log('\nFirestore Rules — aislamiento por sede\n')

// 1. super_admin crea/edita sede
await caso('super_admin CREA sede nueva (C)', () =>
  assertSucceeds(setDoc(doc(sa, 'distribuidores/D1/sedes/C'), { ...SEDE_A, nombre: 'Cali', ciudad: 'Cali' })))
await caso('super_admin EDITA sede A completa (país + capa Delben)', () =>
  assertSucceeds(updateDoc(doc(sa, 'distribuidores/D1/sedes/A'), { descuento_muebles_pct: 40, pais: 'Colombia' })))

// 2. distribuidor_admin: solo universo
await caso('distribuidor_admin actualiza SOLO universo de su sede → permitido', () =>
  assertSucceeds(updateDoc(doc(admin1, 'distribuidores/D1/sedes/A'), {
    universo: { iva_pct: 19, desarmado: { transporte_pct: 5, instalacion_pct: 8, imprevistos_pct: 3, utilidad_pct: 25 } },
  })))
await caso('distribuidor_admin intenta cambiar NOMBRE de la sede → denegado', () =>
  assertFails(updateDoc(doc(admin1, 'distribuidores/D1/sedes/A'), { nombre: 'Hackeada' })))
await caso('distribuidor_admin intenta cambiar capa Delben (descuento) → denegado', () =>
  assertFails(updateDoc(doc(admin1, 'distribuidores/D1/sedes/A'), { descuento_muebles_pct: 99 })))

// 3. comercial sede A: get cotización de su sede vs otra (CASO CRÍTICO)
await caso('comercial(sede A) LEE cotización de sede A → permitido', () =>
  assertSucceeds(getDoc(doc(comA, 'distribuidores/D1/proyectos/P1/cotizaciones/cotA'))))
await caso('comercial(sede A) LEE cotización de sede B (mismo distribuidor) → DENEGADO', () =>
  assertFails(getDoc(doc(comA, 'distribuidores/D1/proyectos/P1/cotizaciones/cotB'))))

// 4. list con/sin filtro
await caso('comercial(sede A) LISTA sin filtro de sede → denegado', () =>
  assertFails(getDocs(cotsP1(comA))))
await caso('comercial(sede A) LISTA con where(sede_id in [A]) → permitido y solo sede A', async () => {
  const snap = await assertSucceeds(getDocs(query(cotsP1(comA), where('sede_id', 'in', ['A']))))
  if (snap.size !== 1) throw new Error(`esperaba 1 doc, vinieron ${snap.size}`)
  if (snap.docs[0].id !== 'cotA') throw new Error(`esperaba cotA, vino ${snap.docs[0].id}`)
})

// 5. distribuidor_admin lista todo su tenant
await caso('distribuidor_admin LISTA todas las cotizaciones del tenant (sin filtro) → permitido', async () => {
  const snap = await assertSucceeds(getDocs(cotsP1(admin1)))
  if (snap.size !== 2) throw new Error(`esperaba 2 docs, vinieron ${snap.size}`)
})

// 6. comercial de otro distribuidor no ve nada
await caso('comercial de OTRO distribuidor (D2) LEE cotización de D1 → denegado', () =>
  assertFails(getDoc(doc(comOtro, 'distribuidores/D1/proyectos/P1/cotizaciones/cotA'))))
await caso('comercial de OTRO distribuidor (D2) intenta listar cotizaciones de D1 → denegado', () =>
  assertFails(getDocs(cotsP1(comOtro))))

await env.cleanup()

// ── Resumen ────────────────────────────────────────────────────────────────────
const fallidos = resultados.filter((r) => !r.ok)
console.log(`\n${resultados.length - fallidos.length}/${resultados.length} casos en verde`)
if (fallidos.length) {
  console.log('\nROJOS:')
  for (const f of fallidos) console.log(`  • ${f.nombre}`)
  process.exit(1)
}
console.log('Todos los casos en verde ✅')
