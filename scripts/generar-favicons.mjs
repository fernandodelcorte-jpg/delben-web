/**
 * Generador de favicons de Delben — primer paso simple (sin recorte fino).
 *
 * Toma el logo (negro) y lo coloca TAL CUAL sobre fondo BLANCO, centrado y con un
 * margen pequeño. Así se ve en pestañas claras y oscuras. Genera:
 *   • favicon.ico        (multi-tamaño 16 / 32 / 48, PNG embebido)
 *   • apple-touch-icon.png (180×180)
 *   • icon-512.png       (512×512)
 * y los escribe en public/ de apps/web Y de apps/portal.
 *
 * Uso:
 *   node scripts/generar-favicons.mjs <ruta-o-URL-del-logo>
 *
 * Ej. con la URL de Storage (config/delben.logo_url):
 *   node scripts/generar-favicons.mjs "https://firebasestorage.googleapis.com/.../logo.png?alt=media&token=..."
 *
 * Si más adelante queremos recortar solo el símbolo "db", se hace aquí (cambiando
 * la fuente) sin tocar nada del resto del sitio.
 */
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DESTINOS = [
  path.join(RAIZ, 'apps/web/public'),
  path.join(RAIZ, 'apps/portal/public'),
]
const BLANCO = { r: 255, g: 255, b: 255, alpha: 1 }

async function cargarLogo(fuente) {
  if (/^https?:\/\//.test(fuente)) {
    const res = await fetch(fuente)
    if (!res.ok) throw new Error(`No se pudo descargar el logo (${res.status})`)
    return Buffer.from(await res.arrayBuffer())
  }
  const { readFile } = await import('node:fs/promises')
  return readFile(fuente)
}

/** Logo centrado sobre fondo blanco, cuadrado de `size`px, con margen ~12%. */
async function componer(logo, size) {
  const margen = Math.round(size * 0.12)
  const interior = size - margen * 2
  const cuadrado = await sharp(logo)
    .resize(interior, interior, { fit: 'contain', background: BLANCO })
    .toBuffer()
  return sharp(cuadrado)
    .extend({ top: margen, bottom: margen, left: margen, right: margen, background: BLANCO })
    .flatten({ background: BLANCO })
    .png()
    .toBuffer()
}

/** Empaqueta varios PNG en un .ico (cada entrada lleva su PNG embebido). */
function construirIco(imagenes) {
  const n = imagenes.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reservado
  header.writeUInt16LE(1, 2) // tipo: icono
  header.writeUInt16LE(n, 4)

  const entradas = []
  const cuerpos = []
  let offset = 6 + n * 16
  for (const { size, png } of imagenes) {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0) // ancho (0 = 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1) // alto
    e.writeUInt8(0, 2) // paleta
    e.writeUInt8(0, 3) // reservado
    e.writeUInt16LE(1, 4) // planos
    e.writeUInt16LE(32, 6) // bits por píxel
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += png.length
    entradas.push(e)
    cuerpos.push(png)
  }
  return Buffer.concat([header, ...entradas, ...cuerpos])
}

async function main() {
  const fuente = process.argv[2]
  if (!fuente) {
    console.error('Uso: node scripts/generar-favicons.mjs <ruta-o-URL-del-logo>')
    process.exit(1)
  }
  const logo = await cargarLogo(fuente)

  const ico = construirIco([
    { size: 16, png: await componer(logo, 16) },
    { size: 32, png: await componer(logo, 32) },
    { size: 48, png: await componer(logo, 48) },
  ])
  const apple = await componer(logo, 180)
  const icon512 = await componer(logo, 512)

  for (const dir of DESTINOS) {
    await writeFile(path.join(dir, 'favicon.ico'), ico)
    await writeFile(path.join(dir, 'apple-touch-icon.png'), apple)
    await writeFile(path.join(dir, 'icon-512.png'), icon512)
    console.log('✓ favicons escritos en', path.relative(RAIZ, dir))
  }
}

main().catch((e) => {
  console.error('Error generando favicons:', e.message)
  process.exit(1)
})
