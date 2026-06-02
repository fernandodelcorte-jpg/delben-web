/**
 * Parser del Excel de módulos (LISTA DE PRECIOS TOTALES.xlsx).
 * Corre en el browser — no usa Node.js APIs.
 * Devuelve datos estructurados listos para escribir en Firestore.
 */

import { slugify, normalizarNombre, generarKeywords } from './slugify'
import type {
  TipoEstructuraDoc,
  TipoFachadaDoc,
  SubcategoriaDoc,
  AcabadoDoc,
  CategoriaDoc,
  ModuloDoc,
  PrecioDoc,
} from '@/lib/firebase/tipos-firestore'

// ─── Descuento por categoría (reglas de negocio Delben) ──────────────────────
// 0% = sin confirmar → el admin debe configurarlo después del import.
const DESC_CATEGORIA: Record<string, { base: number; premium: number }> = {
  COCINA: { base: 30, premium: 12 },
  'ZONA ROPAS': { base: 30, premium: 12 },
  'COMPLEMENTO COCINAS': { base: 25, premium: 25 },
  CLOSETS: { base: 30, premium: 12 },
  'MUEBLES DE ENTRETENIMIENTO': { base: 30, premium: 0 },
  'MUEBLES DE BAÑO': { base: 15, premium: 25 },
  'COMPLEMENTO CLOSETS': { base: 25, premium: 25 },
  'ACABADOS X M2': { base: 0, premium: 0 },
  QUALITA: { base: 0, premium: 0 },
  DECORACIÓN: { base: 0, premium: 0 },
  'MULTI STORE': { base: 0, premium: 0 },
  'PUERTAS DE PASO': { base: 0, premium: 0 },
}

// ─── Tipos para el resultado del parser ──────────────────────────────────────

export type ItemConId<T> = { id: string; doc: T }

export type ResultadoParserModulos = {
  tiposEstructura: ItemConId<TipoEstructuraDoc>[]
  tiposFachada: ItemConId<TipoFachadaDoc>[]
  categorias: ItemConId<CategoriaDoc>[]
  subcategorias: ItemConId<SubcategoriaDoc>[]
  acabados: ItemConId<AcabadoDoc>[]
  modulos: ItemConId<ModuloDoc>[]
  precios: (ItemConId<PrecioDoc> & { modulo_id: string })[]
  estadisticas: {
    totalFilas: number
    filasValidas: number
    modulosUnicos: number
    categoriasConDescuento0: string[]
  }
  advertencias: string[]
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export async function parsearExcelModulos(
  buffer: ArrayBuffer,
): Promise<ResultadoParserModulos> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]!]!
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: '',
  })

  const SIN_ESTRUCTURA_ID = 'sin-estructura'
  const SIN_FACHADA_ID = 'sin-fachada'

  // Acepta cualquier fila con CODIGO numérico y NOMBRE no vacío.
  // Productos sin fachada/estructura (regletas, entrepaños, tubos…) se importan
  // con sentinel sin-fachada / sin-estructura para que el cotizador los reconozca.
  const filasValidas = rawRows.filter((r) => {
    if (typeof r['CODIGO'] !== 'number') return false
    const nombre = r['NOMBRE']?.toString().trim() ?? ''
    return nombre !== ''
  })

  // ── Tipos de estructura ────────────────────────────────────────────────────
  const estructuraOrden: Record<string, number> = {
    'MELAMINA 15MM BLANCA': 1,
    'MELAMINA 15MM PREMIUM': 2,
    'MELAMINA 18MM BLANCA': 3,
    'MELAMINA 18MM PREMIUM': 4,
    'MELAMINA PREMIUM': 5,
  }

  function parsearEspesor(nombre: string): 15 | 18 | null {
    if (nombre.includes('15MM')) return 15
    if (nombre.includes('18MM')) return 18
    return null
  }

  const estructurasMap = new Map<string, ItemConId<TipoEstructuraDoc>>()
  // Primero recolectar colores premium por estructura
  const coloresPorEstructura = new Map<string, Set<string>>()

  for (const r of filasValidas) {
    const nombre = r['TIPO ESTRUCTURA']?.toString().toUpperCase().trim() ?? ''
    if (!nombre) continue
    const coloresRaw = r['ACABADO ESTRUCTURA']?.toString() ?? ''
    const colores = coloresRaw
      .split(',')
      .map((c: string) => c.trim())
      .filter(Boolean)

    if (!coloresPorEstructura.has(nombre)) {
      coloresPorEstructura.set(nombre, new Set())
    }
    colores.forEach((c: string) => coloresPorEstructura.get(nombre)!.add(c))
  }

  for (const [nombre, coloresSet] of coloresPorEstructura) {
    const id = slugify(nombre)
    estructurasMap.set(nombre, {
      id,
      doc: {
        nombre,
        espesor_mm: parsearEspesor(nombre),
        es_premium: nombre.includes('PREMIUM'),
        colores_premium: Array.from(coloresSet).sort(),
        orden: estructuraOrden[nombre] ?? 99,
        activo: true,
      },
    })
  }

  // ── Tipos de fachada ────────────────────────────────────────────────────────
  const fachadaOrden: Record<string, number> = {
    MELAMINA: 1,
    'PINTURA SATINADA': 2,
    'LAMINADO ACRILICO, PVC O PET': 3,
    'PINTURA ALTO BRILLO': 4,
    'ALUMINIO VIDRIO': 5,
  }

  const fachadasMap = new Map<string, ItemConId<TipoFachadaDoc>>()
  const coloresFachada = new Map<string, Set<string>>()
  const coloresVidrio = new Set<string>()
  const coloresMetal = new Set<string>()

  for (const r of filasValidas) {
    const nombre = r['TIPO FACHADA']?.toString().trim() ?? ''
    if (!nombre || nombre === 'NO INCLUYE ACCESORIO') continue
    const acabadosRaw = r['ACABADO FACHADA']?.toString() ?? ''
    const acabados = acabadosRaw
      .split(',')
      .map((c: string) => c.trim())
      .filter(Boolean)

    if (!coloresFachada.has(nombre)) coloresFachada.set(nombre, new Set())
    acabados.forEach((c: string) => coloresFachada.get(nombre)!.add(c))

    if (nombre === 'ALUMINIO VIDRIO') {
      const vidRaw = r['COLOR VIDRIO']?.toString() ?? ''
      vidRaw
        .split(',')
        .map((c: string) => c.trim())
        .filter(Boolean)
        .forEach((c: string) => coloresVidrio.add(c))

      const metRaw = r['COLOR METAL']?.toString() ?? ''
      metRaw
        .split(',')
        .map((c: string) => c.trim())
        .filter(Boolean)
        .forEach((c: string) => coloresMetal.add(c))
    }
  }

  for (const [nombre, coloresSet] of coloresFachada) {
    const id = slugify(nombre)
    const esAv = nombre === 'ALUMINIO VIDRIO'
    fachadasMap.set(nombre, {
      id,
      doc: {
        nombre,
        es_aluminio_vidrio: esAv,
        colores_vidrio: esAv ? Array.from(coloresVidrio).sort() : [],
        colores_metal: esAv ? Array.from(coloresMetal).sort() : [],
        orden: fachadaOrden[nombre] ?? 99,
        activo: true,
      },
    })
  }

  // ── Categorías ────────────────────────────────────────────────────────────
  const categoriasMap = new Map<string, ItemConId<CategoriaDoc>>()
  let ordenCat = 1
  for (const r of filasValidas) {
    const nombre = r['CATEGORIA']!.toString().trim()
    if (!categoriasMap.has(nombre)) {
      const desc = DESC_CATEGORIA[nombre] ?? { base: 0, premium: 0 }
      categoriasMap.set(nombre, {
        id: slugify(nombre),
        doc: {
          nombre,
          desc_desarmado_base_pct: desc.base,
          desc_desarmado_premium_pct: desc.premium,
          orden: ordenCat++,
          activo: true,
          categorias_macro_ids: [],
          mostrar_en_todas: false,
        },
      })
    }
  }

  // ── Subcategorías por defecto (una "Estándar" por tipo de fachada) ─────────
  // NO se crean automáticamente: las configura Delben en el admin.
  // EXCEPCIÓN: creamos UNA subcategoria "Estándar" por tipo de fachada para
  // que el sistema funcione inmediatamente tras el import. Delben puede agregar
  // más (ej. Magenta +12%) desde el panel admin en Rebanada 4.
  const subcategoriasMap = new Map<string, ItemConId<SubcategoriaDoc>>()
  for (const [nombre, fachada] of fachadasMap) {
    const id = `${fachada.id}-estandar`
    subcategoriasMap.set(nombre, {
      id,
      doc: {
        tipo_fachada_id: fachada.id,
        nombre: 'Estándar',
        tipo_ajuste: 'ninguno',
        ajuste_pct: 0,
        es_premium: false,
        activo: true,
      },
    })
  }

  // ── Acabados (colores) por subcategoria Estándar ─────────────────────────
  const acabadosMap = new Map<string, ItemConId<AcabadoDoc>>()
  for (const [nombreFachada, coloresSet] of coloresFachada) {
    const fachada = fachadasMap.get(nombreFachada)!
    const subcat = subcategoriasMap.get(nombreFachada)!
    for (const color of coloresSet) {
      const id = `${subcat.id}-${slugify(color)}`
      if (!acabadosMap.has(id)) {
        acabadosMap.set(id, {
          id,
          doc: {
            subcategoria_id: subcat.id,
            tipo_fachada_id: fachada.id,
            nombre: color,
            activo: true,
          },
        })
      }
    }
  }

  // ── Módulos (deduplicados) + Precios ─────────────────────────────────────
  // Clave de unicidad: categoria + nombre normalizado + altura + profundidad
  const modulosMap = new Map<string, ItemConId<ModuloDoc>>()
  const preciosMap = new Map<string, ItemConId<PrecioDoc> & { modulo_id: string }>()

  // Rastrea qué módulos tienen precios reales (no sentinel) por dimensión
  const moduloTieneFachada = new Map<string, boolean>()
  const moduloTieneEstructura = new Map<string, boolean>()
  // Precio mínimo por módulo (para mostrar "Desde $X" en el buscador)
  const moduloPrecioMin = new Map<string, number>()

  for (const r of filasValidas) {
    const nombreRaw = normalizarNombre(r['NOMBRE']?.toString() ?? '')
    const altura = Number(r['ALTURA'])
    const profundidad = Number(r['PROFUNDIDAD'])
    const categoriaNombre = r['CATEGORIA']!.toString().trim()
    const tipologia = r['TIPOLOGIA']?.toString().trim() ?? 'M'
    const imagenNombre = r['IMAGEN']?.toString().trim() || null
    const tipoEstrNombre = r['TIPO ESTRUCTURA']?.toString().toUpperCase().trim() ?? ''
    const tipoFachNombre = r['TIPO FACHADA']?.toString().trim() ?? ''
    const precio = Number(r['PRECIO'])

    const categoriaId = slugify(categoriaNombre)
    const moduloKey = `${categoriaId}|${nombreRaw}|${altura}|${profundidad}`
    const moduloId = slugify(
      `${categoriaNombre} ${nombreRaw} ${altura} ${profundidad}`,
    )

    if (!modulosMap.has(moduloKey)) {
      modulosMap.set(moduloKey, {
        id: moduloId,
        doc: {
          codigo_excel: r['CODIGO']!.toString(),
          categoria_id: categoriaId,
          tipologia,
          nombre: nombreRaw,
          altura,
          profundidad,
          imagen_nombre: imagenNombre,
          imagen_url: null,
          search_keywords: generarKeywords(nombreRaw),
          activo: true,
        },
      })
    }

    // Precio para este módulo en esta combo estructura×fachada (sentinel cuando falta una)
    const tieneFach = tipoFachNombre && tipoFachNombre !== 'NO INCLUYE ACCESORIO'
    const estrId = tipoEstrNombre ? slugify(tipoEstrNombre) : SIN_ESTRUCTURA_ID
    const fachId = tieneFach ? slugify(tipoFachNombre) : SIN_FACHADA_ID
    const precioId = `${moduloId}_${estrId}_${fachId}`

    if (estrId !== SIN_ESTRUCTURA_ID) moduloTieneEstructura.set(moduloKey, true)
    if (fachId !== SIN_FACHADA_ID) moduloTieneFachada.set(moduloKey, true)

    if (!preciosMap.has(precioId) && precio > 0) {
      preciosMap.set(precioId, {
        id: precioId,
        modulo_id: moduloId,
        doc: { tipo_estructura_id: estrId, tipo_fachada_id: fachId, precio_cop: precio },
      })
      // Actualizar precio mínimo del módulo
      const pMin = moduloPrecioMin.get(moduloKey)
      if (pMin === undefined || precio < pMin) moduloPrecioMin.set(moduloKey, precio)
    }
  }

  // Anotar flags requiere_fachada / requiere_estructura / precio_min en cada módulo.
  // Nota: si tras un reimport algún módulo quedara sin precio_min, rehazlo con
  // tests/catalogo/backfill-precio-min.mjs (lo lee el catálogo y el "Desde $X").
  for (const [key, item] of modulosMap) {
    item.doc.requiere_fachada = moduloTieneFachada.get(key) ?? false
    item.doc.requiere_estructura = moduloTieneEstructura.get(key) ?? false
    const pMin = moduloPrecioMin.get(key)
    if (pMin !== undefined) item.doc.precio_min = pMin
  }

  const categoriasConDescuento0 = Array.from(categoriasMap.values())
    .filter((c) => c.doc.desc_desarmado_base_pct === 0)
    .map((c) => c.doc.nombre)

  const advertencias: string[] = []
  if (categoriasConDescuento0.length > 0) {
    advertencias.push(
      `Las siguientes categorías tienen descuento 0% (pendiente de configurar en el admin): ${categoriasConDescuento0.join(', ')}`,
    )
  }

  return {
    tiposEstructura: Array.from(estructurasMap.values()),
    tiposFachada: Array.from(fachadasMap.values()),
    categorias: Array.from(categoriasMap.values()),
    subcategorias: Array.from(subcategoriasMap.values()),
    acabados: Array.from(acabadosMap.values()),
    modulos: Array.from(modulosMap.values()),
    precios: Array.from(preciosMap.values()),
    estadisticas: {
      totalFilas: rawRows.length,
      filasValidas: filasValidas.length,
      modulosUnicos: modulosMap.size,
      categoriasConDescuento0,
    },
    advertencias,
  }
}
