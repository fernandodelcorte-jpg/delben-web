/**
 * Backfill de `precio_min` en los módulos.
 *
 * Para cada módulo calcula el mínimo de precio_cop (> 0) de su subcolección `precios`
 * y lo escribe en el campo `precio_min` del doc. Es lo que el parser del import ya hace;
 * este script lo aplica a los datos existentes (importados antes de que el campo existiera).
 *
 * CUÁNDO CORRERLO: tras cada reimport del catálogo desde /admin/importar. El catálogo
 * (/catalogo) y el "Desde $X" del cotizador leen `precio_min`; si un reimport deja
 * módulos sin ese campo, corre este script (dry-run y luego --write) para rehacerlo.
 * Es idempotente: si ya está correcto, no escribe nada.
 *
 * Salvaguardas:
 *   • DRY-RUN por defecto: solo reporta, NO escribe. Corre la real con `--write`.
 *   • Idempotente: solo escribe si el valor calculado difiere del actual (correrlo dos
 *     veces → 0 escrituras la segunda vez).
 *   • Módulo con subcolección `precios` vacía (o sin precio > 0): NO se le inventa precio,
 *     se deja SIN precio_min (mostrará "Sin precio", correcto). Se reporta el conteo.
 *
 * Rendimiento: lee las subcolecciones en lotes concurrentes (no secuencial) para no
 * tardar minutos ni agotar memoria.
 *
 * Uso (desde apps/portal, para resolver firebase-admin + ADC):
 *   node ../../tests/catalogo/backfill-precio-min.mjs            # dry-run
 *   node ../../tests/catalogo/backfill-precio-min.mjs --write    # escribe
 *
 * Credenciales: ADC (gcloud auth application-default login).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const ESCRIBIR = process.argv.includes('--write')
const CONCURRENCIA = 50 // lecturas de subcolección en paralelo por lote

initializeApp({ credential: applicationDefault(), projectId: 'delben---web' })
const db = getFirestore()

function minPrecio(preciosSnap) {
  let min
  preciosSnap.forEach((p) => {
    const v = p.data().precio_cop
    if (typeof v === 'number' && v > 0 && (min === undefined || v < min)) min = v
  })
  return min // undefined si no hay ningún precio > 0
}

console.log(`\n=== Backfill precio_min — ${ESCRIBIR ? 'CORRIDA REAL (--write)' : 'DRY-RUN (no escribe)'} ===\n`)

const modsSnap = await db.collection('modulos').get()
const docs = modsSnap.docs
const total = docs.length
console.log(`Módulos a revisar: ${total}\n`)

let aEscribir = 0
let yaCorrecto = 0
let sinPrecios = 0
const ejemplos = []

let batch = db.batch()
let pendientesLote = 0
let escritos = 0

for (let i = 0; i < docs.length; i += CONCURRENCIA) {
  const chunk = docs.slice(i, i + CONCURRENCIA)
  const resultados = await Promise.all(
    chunk.map(async (d) => {
      const ps = await d.ref.collection('precios').get()
      return { d, min: minPrecio(ps) }
    }),
  )

  for (const { d, min } of resultados) {
    if (min === undefined) {
      sinPrecios++
      continue
    }
    const actual = d.data().precio_min
    if (typeof actual === 'number' && actual === min) {
      yaCorrecto++
      continue
    }
    aEscribir++
    if (ejemplos.length < 10) ejemplos.push({ codigo: d.data().codigo_excel ?? d.id, precio_min: min })

    if (ESCRIBIR) {
      batch.update(d.ref, { precio_min: min })
      pendientesLote++
      if (pendientesLote >= 400) {
        await batch.commit()
        escritos += pendientesLote
        batch = db.batch()
        pendientesLote = 0
      }
    }
  }

  if ((i / CONCURRENCIA) % 10 === 0) process.stdout.write(`  …${Math.min(i + CONCURRENCIA, total)}/${total}\r`)
}

if (ESCRIBIR && pendientesLote > 0) {
  await batch.commit()
  escritos += pendientesLote
}

console.log(`\n`)
console.log(`Módulos totales:             ${total}`)
console.log(`Ya tenían el valor correcto: ${yaCorrecto} (idempotencia)`)
console.log(`Sin precios (se omiten):     ${sinPrecios} → quedan SIN precio_min`)
console.log(`${ESCRIBIR ? 'Escritos' : 'Se escribirían'}:               ${aEscribir}`)
if (ESCRIBIR) console.log(`Confirmados en Firestore:     ${escritos}`)
console.log(`\nEjemplos (codigo_excel → precio_min):`)
for (const e of ejemplos) console.log(`  ${e.codigo} → ${e.precio_min.toLocaleString('es-CO')}`)
if (!ESCRIBIR) console.log(`\n(DRY-RUN: no se escribió nada. Revisa los números y corre con --write para aplicar.)`)
process.exit(0)
