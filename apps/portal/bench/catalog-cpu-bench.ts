/* eslint-disable no-console */
// Mitad CPU de la medición de carga del catálogo. Datos SINTÉTICOS del mismo
// shape/volumen real (2.076 ModuloDoc + 447 AccesorioDoc, con search_keywords e
// imagen_url de longitud realista). La deduplicación usa la LÓGICA REAL de la app
// (buscarModulos), cebando la caché por localStorage para no tocar red.
// Bundle (esbuild browser) -> node. Comando en el informe.
import './bench-setup'
import { getModulosTodos, buscarModulos } from '@/lib/firestore/modulos'
import type { ModuloDoc, AccesorioDoc } from '@/lib/firebase/tipos-firestore'

// ── Generadores sintéticos (shape real) ──
const FAMILIAS = [
  'Mueble bajo', 'Mueble alto', 'Torre', 'Cajonera', 'Módulo esquinero',
  'Vitrina', 'Repisa', 'Optimizador', 'Zapatera', 'Entrepaño', 'Despensero',
  'Mueble microondas', 'Columna horno', 'Bajo fregadero', 'Alacena',
]
const COLORES = ['blanco', 'wengue', 'nogal', 'gris perla', 'roble natural', 'arena']

function urlImagen(i: number): string {
  // URL de descarga de Firebase Storage representativa (~165 chars).
  const token = `8f3c1a2b-4d5e-6789-abcd-${String(i).padStart(12, '0')}`
  return `https://firebasestorage.googleapis.com/v0/b/delben---web.appspot.com/o/imagenes%2Fmodulos%2Fmod-${i}.jpg?alt=media&token=${token}`
}

const N_MODULOS = 2076
const N_ACCESORIOS = 447
// Modelo de variantes: cada nombre base se repite con distintas dimensiones.
// El COSTO del dedup es insensible a este número (domina el sort O(n log n));
// la fracción redundante REAL se mide en el browser (snippet en el informe).
const N_NOMBRES_UNICOS = 600

function generarModulos(): (ModuloDoc & { id: string })[] {
  const out: (ModuloDoc & { id: string })[] = []
  for (let i = 0; i < N_MODULOS; i++) {
    const base = i % N_NOMBRES_UNICOS // colapsa a N_NOMBRES_UNICOS nombres
    const familia = FAMILIAS[base % FAMILIAS.length]!
    const color = COLORES[base % COLORES.length]!
    const ancho = 30 + (base % 90)
    const nombre = `${familia} ${ancho} cm ${color} serie ${base}`
    const altura = 360 + (i % 6) * 180
    const profundidad = 300 + (i % 4) * 80
    out.push({
      id: `mod-${i}`,
      codigo_excel: `EX-${10000 + i}`,
      categoria_id: `cat-${base % 12}`,
      tipologia: familia,
      nombre,
      altura,
      profundidad,
      imagen_nombre: `mod-${i}.jpg`,
      imagen_url: i % 4 === 0 ? null : urlImagen(i), // ~75% con imagen (mezcla realista)
      search_keywords: nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 1),
      activo: true,
      requiere_fachada: true,
      requiere_estructura: true,
      precio_min: 150000 + (i % 50) * 12000,
    })
  }
  // Orden NO alfabético, para que la 1.ª corrida del dedup pague el sort completo.
  return out.sort((a, b) => (a.id < b.id ? 1 : -1))
}

function generarAccesorios(): (AccesorioDoc & { id: string })[] {
  const out: (AccesorioDoc & { id: string })[] = []
  const tipos = ['Bisagra', 'Corredera', 'Tirador', 'Manija', 'Riel', 'Soporte', 'Tornillo', 'Patín']
  for (let i = 0; i < N_ACCESORIOS; i++) {
    const nombre = `${tipos[i % tipos.length]} ${100 + i} mm acero inoxidable`
    out.push({
      id: `acc-${i}`,
      codigo: 1000 + i,
      nombre,
      nombre_normalizado: nombre.toLowerCase(),
      precio_tradicional_cop: 5000 + (i % 40) * 800,
      precio_desarmado_cop: 4200 + (i % 40) * 750,
      imagen_nombre: i % 3 === 0 ? `acc-${i}.jpg` : null,
      imagen_url: i % 3 === 0 ? urlImagen(i) : null,
      disponible_tradicional: true,
      disponible_desarmado: true,
      activo: true,
    })
  }
  return out
}

// Recorte a disco de Tanda 2 (#2): el blob de localStorage no lleva imagen_url/keywords.
function aDisco({ imagen_url, search_keywords, ...resto }: ModuloDoc & { id: string }) {
  return resto
}

const prom = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
const ms = (n: number) => n.toFixed(2) + ' ms'
const kb = (b: number) => (b / 1024).toFixed(1) + ' KB'
const bytes = (o: unknown) => Buffer.byteLength(JSON.stringify(o), 'utf8')

function medir(fn: () => void, runs = 3): number[] {
  const ts: number[] = []
  for (let r = 0; r < runs; r++) {
    const t0 = performance.now()
    fn()
    ts.push(performance.now() - t0)
  }
  return ts
}

async function main() {
  const modulos = generarModulos()
  const accesorios = generarAccesorios()

  // Payloads (referencia de volumen sintético; los BYTES REALES salen del browser).
  const modFullJson = JSON.stringify(modulos)
  const modDisco = modulos.map(aDisco)
  const modDiscoJson = JSON.stringify(modDisco)
  const accFullJson = JSON.stringify(accesorios)

  // ── CEBAR la caché real por localStorage (blob v2 recortado) ──
  localStorage.setItem('delben_modulos_v2', JSON.stringify({ data: modDisco, ts: Date.now() }))
  // getModulosTodos = cargarModulos(): carga el cache (parse + map desdeDisco), SIN dedup.
  await getModulosTodos()

  // ── DEDUP con la lógica REAL (buscarModulos sin texto → colapso por nombre) ──
  // 1.ª corrida = sort completo (búsqueda fría); 2-3 = ya ordenado (búsquedas siguientes).
  const dedupTs: number[] = []
  let unicos = 0
  for (let r = 0; r < 3; r++) {
    const t0 = performance.now()
    const res = await buscarModulos('') // lógica real de la app
    const t1 = performance.now()
    dedupTs.push(t1 - t0)
    unicos = res.length
  }

  // ── CPU aislado: parse / stringify ──
  const parseFull = medir(() => { JSON.parse(modFullJson) })
  const parseDisco = medir(() => { JSON.parse(modDiscoJson) })
  const stringifyDisco = medir(() => { JSON.stringify(modDisco) })
  const materializar = medir(() => { modulos.map((m) => ({ ...m })) })
  const parseAcc = medir(() => { JSON.parse(accFullJson) })

  console.log('═══════════ MITAD CPU (sintético, shape/volumen real, prom de 3) ═══════════\n')
  console.log(`MÓDULOS: ${N_MODULOS} docs`)
  console.log(`  volumen sintético — full ${kb(bytes(modulos))} · recortado ${kb(bytes(modDisco))} (los BYTES reales salen del browser)`)
  console.log(`  nombres únicos (SINTÉTICO, modelado): ${unicos}  → la fracción redundante REAL se mide en el browser\n`)
  console.log('  CPU hilo principal:')
  console.log(`    materializar 2076 objetos (.map spread):   ${ms(prom(materializar))}   [${materializar.map(ms).join(', ')}]`)
  console.log(`    dedup REAL buscarModulos — 1.ª búsqueda:   ${ms(dedupTs[0]!)}  (incluye sort completo)`)
  console.log(`    dedup REAL buscarModulos — siguientes:     ${ms(prom(dedupTs.slice(1)))}   [${dedupTs.slice(1).map(ms).join(', ')}]`)
  console.log(`    JSON.parse payload full (proxy red→objetos): ${ms(prom(parseFull))}   [${parseFull.map(ms).join(', ')}]`)
  console.log(`    JSON.parse blob recortado (cache-hit):     ${ms(prom(parseDisco))}   [${parseDisco.map(ms).join(', ')}]`)
  console.log(`    JSON.stringify blob recortado (write LS):  ${ms(prom(stringifyDisco))}   [${stringifyDisco.map(ms).join(', ')}]`)
  console.log('')
  console.log(`ACCESORIOS: ${N_ACCESORIOS} docs`)
  console.log(`    JSON.parse payload full:                   ${ms(prom(parseAcc))}   [${parseAcc.map(ms).join(', ')}]`)
  console.log('')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
