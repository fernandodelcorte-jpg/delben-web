/**
 * Parser del Excel unificado de herrajes.
 * Columnas esperadas: CODIGO, PRODUCTO, TRADICIONAL, DESARMADO, Imagen
 */

import { slugify } from './slugify'
import type { AccesorioDoc } from '@/lib/firebase/tipos-firestore'
import type { ItemConId } from './parser-modulos'

export type ResultadoParserHerrajes = {
  accesorios: ItemConId<AccesorioDoc>[]
  estadisticas: {
    total: number
    conPrecioTradicional: number
    conPrecioDesarmado: number
    sinPrecioNinguno: number
    sinImagen: number
  }
  advertencias: string[]
}

function parsePrice(val: unknown): number | null {
  if (val === '' || val === null || val === undefined) return null
  const n = Number(val)
  if (isNaN(n) || n <= 0) return null
  return n
}

function normalizarNombreHerraje(nombre: string): string {
  return nombre
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export async function parsearExcelHerrajes(
  buffer: ArrayBuffer,
): Promise<ResultadoParserHerrajes> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buffer, { type: 'array' })

  // La hoja tiene un espacio al final — normalizamos el nombre
  const nombreHoja = wb.SheetNames.find((n) =>
    n.toLowerCase().trim().includes('herraje'),
  ) ?? wb.SheetNames[0]!

  const ws = wb.Sheets[nombreHoja]!
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: '',
  })

  const accesorios: ItemConId<AccesorioDoc>[] = []
  const advertencias: string[] = []
  let sinImagen = 0
  let conTradicional = 0
  let conDesarmado = 0
  let sinPrecioNinguno = 0

  // Normaliza claves del objeto ignorando espacios en los nombres de columna
  function col(r: Record<string, unknown>, nombre: string): unknown {
    const key = Object.keys(r).find((k) => k.trim().toUpperCase() === nombre.toUpperCase())
    return key ? r[key] : undefined
  }

  for (const r of rawRows) {
    const codigo = col(r, 'CODIGO')
    if (typeof codigo !== 'number') continue

    const nombre = col(r, 'PRODUCTO')?.toString().trim() ?? ''
    if (!nombre) {
      advertencias.push(`Código ${codigo}: sin nombre, se omite.`)
      continue
    }

    const precioTrad = parsePrice(col(r, 'TRADICIONAL'))
    const precioDesarm = parsePrice(col(r, 'DESARMADO'))
    const imagenRaw = col(r, 'IMAGEN')?.toString().trim() ?? ''
    const imagen = imagenRaw || null

    if (!imagen) sinImagen++
    if (precioTrad !== null) conTradicional++
    if (precioDesarm !== null) conDesarmado++
    if (precioTrad === null && precioDesarm === null) sinPrecioNinguno++

    accesorios.push({
      id: (codigo as number).toString(),
      doc: {
        codigo: codigo as number,
        nombre,
        nombre_normalizado: normalizarNombreHerraje(nombre),
        precio_tradicional_cop: precioTrad,
        precio_desarmado_cop: precioDesarm,
        imagen_nombre: imagenRaw || null,
        imagen_url: null,
        disponible_tradicional: precioTrad !== null,
        disponible_desarmado: precioDesarm !== null,
        activo: true,
      },
    })
  }

  if (sinPrecioNinguno > 0) {
    advertencias.push(
      `${sinPrecioNinguno} herrajes sin precio en ninguna modalidad — se cargan como ocultos. Revisar con Delben cuáles tienen precio pendiente.`,
    )
  }
  if (sinImagen > 0) {
    advertencias.push(`${sinImagen} herrajes sin imagen.`)
  }

  return {
    accesorios,
    estadisticas: {
      total: accesorios.length,
      conPrecioTradicional: conTradicional,
      conPrecioDesarmado: conDesarmado,
      sinPrecioNinguno,
      sinImagen,
    },
    advertencias,
  }
}
