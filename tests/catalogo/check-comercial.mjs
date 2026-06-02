/**
 * Prueba de seguridad de C2 (separación REAL en backend).
 *
 * Verifica que la respuesta de RED de /api/catalogo NO contiene el precio con
 * descuento cuando el llamante es distribuidor_comercial. Inspecciona el JSON crudo
 * que llega al navegador, no la pantalla.
 *
 * Uso:
 *   BASE_URL=http://localhost:3000 \
 *   ID_TOKEN_COMERCIAL=<idToken de un distribuidor_comercial> \
 *   SEDE_ID=<sede habilitada asignada a ese comercial> \
 *   MODALIDAD=desarmado \
 *   node tests/catalogo/check-comercial.mjs
 *
 * Cómo obtener el ID token del comercial: inicia sesión como ese usuario en el
 * navegador y en la consola corre:
 *   await firebase.auth().currentUser.getIdToken()
 * o, más simple, copia el header Authorization de la petición /api/catalogo en la
 * pestaña Network de DevTools.
 *
 * Opcional (contraste): exporta ID_TOKEN_COSTOS para confirmar que un rol con costo
 * SÍ recibe precioConDescuento.
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const SEDE_ID = process.env.SEDE_ID
const MODALIDAD = process.env.MODALIDAD ?? 'desarmado'

function fail(msg) {
  console.error(`❌ ${msg}`)
  process.exit(1)
}

async function pedir(token) {
  const res = await fetch(`${BASE_URL}/api/catalogo?sedeId=${SEDE_ID}&modalidad=${MODALIDAD}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) fail(`HTTP ${res.status} — ${await res.text()}`)
  return res.json()
}

if (!SEDE_ID) fail('Falta SEDE_ID')

const tokenComercial = process.env.ID_TOKEN_COMERCIAL
if (!tokenComercial) fail('Falta ID_TOKEN_COMERCIAL')

const data = await pedir(tokenComercial)

// 1) El servidor declaró que este rol NO ve costo.
if (data.puedeVerCosto !== false) {
  fail(`puedeVerCosto debería ser false para el comercial; llegó: ${data.puedeVerCosto}`)
}

// 2) NINGÚN ítem debe traer el número con descuento ni el % (no basta con que sea null:
//    el campo NO debe existir en el JSON que viajó al navegador).
const fugados = data.items.filter(
  (it) => 'precioConDescuento' in it || 'descuentoPct' in it,
)
if (fugados.length > 0) {
  fail(
    `${fugados.length} ítems FILTRARON el costo al comercial. Ejemplo: ${JSON.stringify(fugados[0])}`,
  )
}

console.log(`✅ Comercial: ${data.items.length} ítems, ninguno con precioConDescuento/descuentoPct. Solo precioLista.`)

// 3) Contraste opcional: un rol con costo SÍ debe recibir el descuento.
const tokenCostos = process.env.ID_TOKEN_COSTOS
if (tokenCostos) {
  const dataCostos = await pedir(tokenCostos)
  if (dataCostos.puedeVerCosto !== true) fail('puedeVerCosto debería ser true para costos')
  const conDescuento = dataCostos.items.filter((it) => typeof it.precioConDescuento === 'number')
  if (conDescuento.length === 0) fail('El rol con costo no recibió ningún precioConDescuento')
  console.log(`✅ Costos: ${conDescuento.length}/${dataCostos.items.length} ítems con precioConDescuento.`)
}

console.log('✅ PRUEBA DE SEGURIDAD C2 OK')
