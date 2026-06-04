/**
 * ============================================================
 * MOTOR DE CÁLCULO DELBEN — DOS CAPAS (DEFINITIVO)
 * ============================================================
 *
 * VALIDADO numéricamente. Da los resultados confirmados por el
 * usuario en la fase de definición. NO modificar la lógica de
 * cálculo sin aprobación explícita y revalidación de tests.
 *
 * CAPA DELBEN (→ costo al distribuidor = ORDEN DE COMPRA):
 *   A. Descuentos (secuencial): modelo → acabado → campaña
 *   B. Servicios Delben:
 *        grupo1 = diseño+cotización+producción+logística (SUMAN)
 *        subtotal1 = costo_desc × (1 + grupo1)
 *        gestión comercial = MARGIN: costoDelben = subtotal1 / (1 - gc)
 *
 * CAPA DISTRIBUIDOR (→ precio al cliente final):
 *   grupo2 = transporte+instalación+imprevistos (SUMAN)
 *   subtotal2 = costoDelben × (1 + grupo2)
 *   utilidad = MARGIN: precioSinIva = subtotal2 / (1 - utilidad)
 *   IVA (último): se aplica u.iva del universo de la sede en CUALQUIER país
 *     (Colombia y exportación por igual); iva 0 = sin IVA. La MONEDA sí depende
 *     del país (Colombia COP, exportación USD con conversión por tasa).
 *
 * SEGURIDAD: el costo Delben y los pasos A/B nunca deben enviarse
 * al rol distribuidor_comercial. Ejecutar en servidor y devolver,
 * según rol, solo los campos permitidos mediante filtrarPorRol().
 * ============================================================
 */

export type ModeloNegocio = 'tradicional' | 'desarmado'
export type TipoItem = 'mueble' | 'herraje'

export interface Distribuidor {
  id: string
  descuento_muebles_pct: number
  descuento_herrajes_pct: number
}

export interface Categoria {
  id: string
  desc_base_pct: number
  desc_premium_pct: number
}

export interface LineaAcabado {
  id: string
  tipo_ajuste: 'descuento' | 'ninguno' | 'recargo'
  ajuste_pct: number
  es_premium: boolean
}

export interface Campana {
  id: string
  pct: number
  desde: Date
  hasta: Date
  activa: boolean
  segmentacion: {
    tipo: 'global' | 'segmentada'
    distribuidores: string[] | null
    categorias: string[] | null
    lineas_acabado: string[] | null
  }
}

export interface ServiciosDelben {
  diseno: number
  cotizacion: number
  produccion: number
  logistica: number
  gestion_comercial: number
}

export interface UniversoDistribuidor {
  transporte: number
  instalacion: number
  imprevistos: number
  utilidad: number
  iva: number
}

export interface ItemInput {
  precio_base_cop: number
  cantidad: number
  tipo_item: TipoItem
  modelo: ModeloNegocio
  distribuidor: Distribuidor
  categoria: Categoria
  linea_acabado: LineaAcabado
  fecha_cotizacion: Date
  campanas_disponibles: Campana[]
  servicios_delben: ServiciosDelben
  universo: UniversoDistribuidor
  pais_cliente_final: string
  tasa_usd: number
}

export interface ResultadoCalculo {
  moneda: 'COP' | 'USD'
  // --- Capa Delben (NO exponer a distribuidor_comercial) ---
  costo_tras_descuentos: number
  servicios_subtotal1: number
  costo_delben: number
  // --- Capa Distribuidor ---
  distribuidor_subtotal2: number
  precio_sin_iva: number
  iva_aplicado: boolean
  iva_monto: number
  precio_final_unitario: number
  cantidad: number
  subtotal_linea: number
}

function red(n: number, dec: number): number {
  const f = Math.pow(10, dec)
  return Math.round(n * f) / f
}

function campanaAplicable(input: ItemInput): Campana | null {
  const f = input.fecha_cotizacion.getTime()
  const apl = input.campanas_disponibles.filter((c) => {
    if (!c.activa) return false
    if (f < c.desde.getTime() || f > c.hasta.getTime()) return false
    const s = c.segmentacion
    if (s.tipo === 'global') return true
    const md = !s.distribuidores || s.distribuidores.includes(input.distribuidor.id)
    const mc = !s.categorias || s.categorias.includes(input.categoria.id)
    const ml = !s.lineas_acabado || s.lineas_acabado.includes(input.linea_acabado.id)
    return md && mc && ml
  })
  if (!apl.length) return null
  return apl.reduce((a, b) => (b.pct > a.pct ? b : a))
}

export function calcularItem(input: ItemInput): ResultadoCalculo {
  const esColombia = input.pais_cliente_final.trim().toLowerCase() === 'colombia'
  const moneda: 'COP' | 'USD' = esColombia ? 'COP' : 'USD'
  const dec = moneda === 'USD' ? 2 : 0

  let base = input.precio_base_cop
  if (!esColombia) {
    if (input.tasa_usd <= 0) throw new Error('Tasa USD inválida')
    base = base / input.tasa_usd
  }

  // ===== CAPA DELBEN — A. Descuentos =====
  const desc1 =
    input.modelo === 'tradicional'
      ? input.tipo_item === 'mueble'
        ? input.distribuidor.descuento_muebles_pct
        : input.distribuidor.descuento_herrajes_pct
      : input.categoria.desc_base_pct
  let x = base * (1 - desc1 / 100)

  let at = input.linea_acabado.tipo_ajuste
  let ap = input.linea_acabado.ajuste_pct
  if (input.modelo === 'desarmado' && input.linea_acabado.es_premium) {
    at = 'descuento'
    ap = input.categoria.desc_premium_pct
  }
  if (at === 'descuento') x = x * (1 - ap / 100)
  else if (at === 'recargo') x = x * (1 + ap / 100)

  const camp = campanaAplicable(input)
  if (camp) x = x * (1 - camp.pct / 100)
  const costoTrasDescuentos = x

  // ===== CAPA DELBEN — B. Servicios =====
  const sv = input.servicios_delben
  const grupo1 = (sv.diseno + sv.cotizacion + sv.produccion + sv.logistica) / 100
  const subtotal1 = costoTrasDescuentos * (1 + grupo1)
  if (sv.gestion_comercial >= 100) throw new Error('Gestión comercial % inválido')
  const costoDelben = subtotal1 / (1 - sv.gestion_comercial / 100)

  // ===== CAPA DISTRIBUIDOR =====
  const u = input.universo
  const grupo2 = (u.transporte + u.instalacion + u.imprevistos) / 100
  const subtotal2 = costoDelben * (1 + grupo2)
  if (u.utilidad >= 100) throw new Error('Utilidad % inválida')
  const precioSinIva = subtotal2 / (1 - u.utilidad / 100)

  // IVA por sede: se aplica el u.iva configurado en CUALQUIER país (Colombia y
  // exportación por igual). iva 0 = sin IVA. La moneda/conversión sí dependen del país.
  const ivaAplicado = u.iva > 0
  const precioFinal = ivaAplicado ? precioSinIva * (1 + u.iva / 100) : precioSinIva
  const ivaMonto = ivaAplicado ? precioFinal - precioSinIva : 0

  const pf = red(precioFinal, dec)

  return {
    moneda,
    costo_tras_descuentos: red(costoTrasDescuentos, dec),
    servicios_subtotal1: red(subtotal1, dec),
    costo_delben: red(costoDelben, dec),
    distribuidor_subtotal2: red(subtotal2, dec),
    precio_sin_iva: red(precioSinIva, dec),
    iva_aplicado: ivaAplicado,
    iva_monto: red(ivaMonto, dec),
    precio_final_unitario: pf,
    cantidad: input.cantidad,
    subtotal_linea: red(pf * input.cantidad, dec),
  }
}

/**
 * Filtra el resultado según el rol.
 * CRÍTICO para seguridad: distribuidor_comercial NUNCA recibe campos de costo Delben.
 */
export function filtrarPorRol(
  r: ResultadoCalculo,
  rol: string,
): Partial<ResultadoCalculo> {
  if (rol === 'distribuidor_comercial') {
    return {
      moneda: r.moneda,
      iva_aplicado: r.iva_aplicado,
      iva_monto: r.iva_monto,
      precio_sin_iva: r.precio_sin_iva,
      precio_final_unitario: r.precio_final_unitario,
      cantidad: r.cantidad,
      subtotal_linea: r.subtotal_linea,
    }
  }
  return r
}
