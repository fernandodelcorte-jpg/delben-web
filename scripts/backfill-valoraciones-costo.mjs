/**
 * Backfill: total canónico de VALORACIÓN = COSTO DELBEN antes de IVA, y limpieza
 * de la venta persistida (cierra deuda §1/§10 para los docs existentes).
 *
 * Qué hace por cada doc de la colección `valoraciones`:
 *   1. Recalcula `totalCostoDelben` SOLO desde los costo_delben YA persistidos en el
 *      snapshot (módulos + herrajes asociados + herrajes sueltos) + precioDelbenUnitario
 *      de los especiales. NO corre el motor ni lee catálogo.
 *   2. Reescribe `totales` a `{ totalCostoDelben }` (elimina total/subtotales de venta y
 *      transporte/instalación fijos).
 *   3. Elimina de cada `resultado` los campos de VENTA (distribuidor_subtotal2,
 *      precio_sin_iva, iva_aplicado, iva_monto, precio_final_unitario, subtotal_linea) y,
 *      en los especiales, `precioClienteUnitario` y su `resultado`. Conserva la capa de
 *      costo (moneda, costo_tras_descuentos, servicios_subtotal1, costo_delben, cantidad).
 *
 * Uso (desde apps/portal, para resolver firebase-admin + ADC):
 *   node ../../scripts/backfill-valoraciones-costo.mjs            # DRY-RUN (no escribe)
 *   node ../../scripts/backfill-valoraciones-costo.mjs --write    # aplica los cambios
 *   FIREBASE_PROJECT_ID=delben---web node ../../scripts/backfill-valoraciones-costo.mjs
 *
 * Credenciales: ADC (gcloud auth application-default login). Mismo patrón que
 * scripts/reset-password.mjs y lib/firebase/admin.ts (sin clave de service account).
 */
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const WRITE = process.argv.includes('--write')

// Campos de VENTA a eliminar de cada `resultado` (se conserva solo la capa de costo).
const CAMPOS_VENTA_RESULTADO = [
  'distribuidor_subtotal2',
  'precio_sin_iva',
  'iva_aplicado',
  'iva_monto',
  'precio_final_unitario',
  'subtotal_linea',
]

function n(x) {
  return typeof x === 'number' && Number.isFinite(x) ? x : 0
}

/** Devuelve un resultado recortado a la capa de costo + cuántos campos de venta tenía. */
function limpiarResultado(r) {
  if (!r || typeof r !== 'object') return { limpio: r, quitados: 0 }
  const quitados = CAMPOS_VENTA_RESULTADO.reduce((c, k) => c + (k in r ? 1 : 0), 0)
  const limpio = {
    moneda: r.moneda,
    costo_tras_descuentos: n(r.costo_tras_descuentos),
    servicios_subtotal1: n(r.servicios_subtotal1),
    costo_delben: n(r.costo_delben),
    cantidad: n(r.cantidad),
  }
  return { limpio, quitados }
}

function backfillDoc(data) {
  let quitados = 0
  let totalCostoDelben = 0

  const items = (data.items ?? []).map((it) => {
    const { limpio, quitados: q } = limpiarResultado(it.resultado)
    quitados += q
    const cant = n(it.config?.cantidad)
    totalCostoDelben += n(limpio.costo_delben) * cant
    const herrajesAsociados = (it.herrajesAsociados ?? []).map((h) => {
      const { limpio: lh, quitados: qh } = limpiarResultado(h.resultado)
      quitados += qh
      totalCostoDelben += n(lh.costo_delben) * n(h.cantidad)
      return { ...h, resultado: lh }
    })
    return { ...it, resultado: limpio, herrajesAsociados }
  })

  const itemsHerraje = (data.itemsHerraje ?? []).map((it) => {
    const { limpio, quitados: q } = limpiarResultado(it.resultado)
    quitados += q
    totalCostoDelben += n(limpio.costo_delben) * n(it.cantidad)
    return { ...it, resultado: limpio }
  })

  const itemsEspeciales = (data.itemsEspeciales ?? []).map((e) => {
    // Quita venta del especial: precioClienteUnitario + su resultado (si lo tuviera).
    if ('precioClienteUnitario' in e) quitados += 1
    if ('resultado' in e) quitados += 1
    const { precioClienteUnitario, resultado, ...resto } = e
    totalCostoDelben += n(e.precioDelbenUnitario) * n(e.cantidad)
    return resto
  })

  const totales = { totalCostoDelben }
  return { items, itemsHerraje, itemsEspeciales, totales, quitados }
}

async function main() {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      ...(process.env.FIREBASE_PROJECT_ID ? { projectId: process.env.FIREBASE_PROJECT_ID } : {}),
    })
  }
  const db = getFirestore()

  console.log(`\nBackfill valoraciones → costo Delben  [${WRITE ? 'WRITE' : 'DRY-RUN'}]\n`)

  const snap = await db.collection('valoraciones').get()
  if (snap.empty) {
    console.log('No hay valoraciones.')
    process.exit(0)
  }

  let totalQuitados = 0
  for (const doc of snap.docs) {
    const data = doc.data()
    const totalViejo = data?.totales?.total // venta (puede no existir en docs ya migrados)
    const { items, itemsHerraje, itemsEspeciales, totales, quitados } = backfillDoc(data)
    totalQuitados += quitados

    const viejoStr = typeof totalViejo === 'number' ? totalViejo.toLocaleString('es-CO') : '—'
    console.log(
      `• ${doc.id}  ${data.proyectoNombre ?? ''}\n` +
        `    total viejo (venta): ${viejoStr}  →  totalCostoDelben: ${totales.totalCostoDelben.toLocaleString('es-CO')}\n` +
        `    campos de venta a eliminar: ${quitados}`,
    )

    if (WRITE) {
      await doc.ref.update({ items, itemsHerraje, itemsEspeciales, totales })
      console.log('    ✓ escrito')
    }
  }

  console.log(
    `\n${snap.size} valoración(es). Campos de venta ${WRITE ? 'eliminados' : 'a eliminar'}: ${totalQuitados}.`,
  )
  if (!WRITE) console.log('DRY-RUN: no se escribió nada. Repite con --write para aplicar.\n')
  process.exit(0)
}

main().catch((err) => {
  console.error('ERROR en el backfill:', err?.message ?? err)
  // Casi siempre es ADC: credenciales ausentes o expiradas (invalid_rapt/reauth).
  console.error('Sugerencia: refresca las credenciales con  gcloud auth application-default login')
  process.exit(1)
})
