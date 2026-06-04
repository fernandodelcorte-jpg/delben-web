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
 *   IVA (último): Colombia × (1+iva); Exportación sin IVA
 *   ⚠️ REGLA SUPERADA (2026-06-04): el motor vivo (packages/core) ahora aplica el
 *      IVA según el iva_pct de la sede en CUALQUIER país. Esta copia de referencia
 *      se conserva como registro histórico del diseño original; no refleja la regla actual.
 *
 * SEGURIDAD: el costo Delben y los pasos A/B nunca deben enviarse
 * al rol distribuidor_comercial. Esta función debe ejecutarse en
 * servidor y devolver, según rol, solo los campos permitidos.
 * ============================================================
 */

export type ModeloNegocio = 'tradicional' | 'desarmado';
export type TipoItem = 'mueble' | 'herraje';

export interface Distribuidor {
  id: string;
  descuento_muebles_pct: number;
  descuento_herrajes_pct: number;
}

export interface Categoria {
  id: string;
  desc_base_pct: number;       // desarmado: 30/25/15/10
  desc_premium_pct: number;    // desarmado: 12 / 25 si acabado premium
}

export interface LineaAcabado {
  id: string;
  tipo_ajuste: 'descuento' | 'ninguno' | 'recargo';
  ajuste_pct: number;
  es_premium: boolean;
}

export interface Campana {
  id: string;
  pct: number;
  desde: Date;
  hasta: Date;
  activa: boolean;
  segmentacion: {
    tipo: 'global' | 'segmentada';
    distribuidores: string[] | null;
    categorias: string[] | null;
    lineas_acabado: string[] | null;
  };
}

export interface ServiciosDelben {
  diseno: number;            // %
  cotizacion: number;        // %
  produccion: number;        // %
  logistica: number;         // %
  gestion_comercial: number; // % — se aplica como MARGIN
}

export interface UniversoDistribuidor {
  transporte: number;   // %
  instalacion: number;  // %
  imprevistos: number;  // %
  utilidad: number;     // % — se aplica como MARGIN
  iva: number;          // % — solo si país = Colombia
}

export interface ItemInput {
  precio_base_cop: number;
  cantidad: number;
  tipo_item: TipoItem;
  modelo: ModeloNegocio;
  distribuidor: Distribuidor;
  categoria: Categoria;
  linea_acabado: LineaAcabado;
  fecha_cotizacion: Date;
  campanas_disponibles: Campana[];
  servicios_delben: ServiciosDelben;
  universo: UniversoDistribuidor;
  pais_cliente_final: string;     // 'Colombia' aplica IVA; otro = exportación
  tasa_usd: number;               // COP por 1 USD
}

export interface ResultadoCalculo {
  moneda: 'COP' | 'USD';
  // --- Capa Delben (NO exponer a distribuidor_comercial) ---
  costo_tras_descuentos: number;
  servicios_subtotal1: number;
  costo_delben: number;            // = valor ORDEN DE COMPRA
  // --- Capa Distribuidor ---
  distribuidor_subtotal2: number;
  precio_sin_iva: number;
  iva_aplicado: boolean;
  iva_monto: number;
  precio_final_unitario: number;   // lo que ve el cliente final
  cantidad: number;
  subtotal_linea: number;          // precio_final_unitario × cantidad
}

function red(n: number, dec: number): number {
  const f = Math.pow(10, dec);
  return Math.round(n * f) / f;
}

function campanaAplicable(input: ItemInput): Campana | null {
  const f = input.fecha_cotizacion.getTime();
  const apl = input.campanas_disponibles.filter(c => {
    if (!c.activa) return false;
    if (f < c.desde.getTime() || f > c.hasta.getTime()) return false;
    const s = c.segmentacion;
    if (s.tipo === 'global') return true;
    const md = !s.distribuidores || s.distribuidores.includes(input.distribuidor.id);
    const mc = !s.categorias || s.categorias.includes(input.categoria.id);
    const ml = !s.lineas_acabado || s.lineas_acabado.includes(input.linea_acabado.id);
    return md && mc && ml;
  });
  if (!apl.length) return null;
  return apl.reduce((a, b) => (b.pct > a.pct ? b : a));
}

export function calcularItem(input: ItemInput): ResultadoCalculo {
  const esColombia = input.pais_cliente_final.trim().toLowerCase() === 'colombia';
  const moneda: 'COP' | 'USD' = esColombia ? 'COP' : 'USD';
  const dec = moneda === 'USD' ? 2 : 0;

  // Base (convertir si exportación)
  let base = input.precio_base_cop;
  if (!esColombia) {
    if (input.tasa_usd <= 0) throw new Error('Tasa USD inválida');
    base = base / input.tasa_usd;
  }

  // ===== CAPA DELBEN — A. Descuentos =====
  let desc1 = input.modelo === 'tradicional'
    ? (input.tipo_item === 'mueble'
        ? input.distribuidor.descuento_muebles_pct
        : input.distribuidor.descuento_herrajes_pct)
    : input.categoria.desc_base_pct;
  let x = base * (1 - desc1 / 100);

  let at = input.linea_acabado.tipo_ajuste;
  let ap = input.linea_acabado.ajuste_pct;
  if (input.modelo === 'desarmado' && input.linea_acabado.es_premium) {
    at = 'descuento';
    ap = input.categoria.desc_premium_pct;
  }
  if (at === 'descuento') x = x * (1 - ap / 100);
  else if (at === 'recargo') x = x * (1 + ap / 100);

  const camp = campanaAplicable(input);
  if (camp) x = x * (1 - camp.pct / 100);
  const costoTrasDescuentos = x;

  // ===== CAPA DELBEN — B. Servicios =====
  const sv = input.servicios_delben;
  const grupo1 = (sv.diseno + sv.cotizacion + sv.produccion + sv.logistica) / 100;
  const subtotal1 = costoTrasDescuentos * (1 + grupo1);
  // gestión comercial = MARGIN
  if (sv.gestion_comercial >= 100) throw new Error('Gestión comercial % inválido');
  const costoDelben = subtotal1 / (1 - sv.gestion_comercial / 100);

  // ===== CAPA DISTRIBUIDOR =====
  const u = input.universo;
  const grupo2 = (u.transporte + u.instalacion + u.imprevistos) / 100;
  const subtotal2 = costoDelben * (1 + grupo2);
  // utilidad = MARGIN
  if (u.utilidad >= 100) throw new Error('Utilidad % inválida');
  const precioSinIva = subtotal2 / (1 - u.utilidad / 100);

  // IVA (último, solo Colombia)
  const ivaAplicado = esColombia && u.iva > 0;
  const precioFinal = ivaAplicado ? precioSinIva * (1 + u.iva / 100) : precioSinIva;
  const ivaMonto = ivaAplicado ? precioFinal - precioSinIva : 0;

  const pf = red(precioFinal, dec);

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
  };
}

/**
 * Filtra el resultado según el rol. CRÍTICO para seguridad:
 * distribuidor_comercial NUNCA recibe campos de costo Delben.
 */
export function filtrarPorRol(
  r: ResultadoCalculo,
  rol: string
): Partial<ResultadoCalculo> {
  if (rol === 'distribuidor_comercial') {
    // Solo lo necesario para vender. Sin costo Delben ni pasos internos.
    return {
      moneda: r.moneda,
      iva_aplicado: r.iva_aplicado,
      iva_monto: r.iva_monto,
      precio_sin_iva: r.precio_sin_iva,
      precio_final_unitario: r.precio_final_unitario,
      cantidad: r.cantidad,
      subtotal_linea: r.subtotal_linea,
    };
  }
  // super_admin, distribuidor_admin, distribuidor_costos,
  // delben_facturacion, delben_comercial → resultado completo
  return r;
}

/* ============================================================
 * TESTS (Vitest). Reemplazar por casos REALES de Delben antes
 * de construir las rebanadas que dependen del motor.
 * ============================================================

import { describe, it, expect } from 'vitest';

const DIST = { id:'x', descuento_muebles_pct:35, descuento_herrajes_pct:15 };
const CAT = { id:'cocina', desc_base_pct:30, desc_premium_pct:12 };
const LINEA = { id:'estandar', tipo_ajuste:'ninguno' as const, ajuste_pct:0, es_premium:false };
const SV = { diseno:3, cotizacion:2, produccion:5, logistica:4, gestion_comercial:6 };
const U = { transporte:5, instalacion:8, imprevistos:3, utilidad:25, iva:19 };

const BASE = {
  precio_base_cop: 1_000_000, cantidad: 1, tipo_item: 'mueble' as const,
  modelo: 'desarmado' as const, distribuidor: DIST, categoria: CAT,
  linea_acabado: LINEA, fecha_cotizacion: new Date('2026-03-15'),
  campanas_disponibles: [], servicios_delben: SV, universo: U,
  tasa_usd: 4000,
};

describe('Motor 2 capas — caso confirmado por el usuario', () => {
  it('Colombia: cadena completa da 1.562.495', () => {
    const r = calcularItem({ ...BASE, pais_cliente_final: 'Colombia' });
    expect(r.costo_tras_descuentos).toBe(700_000);
    expect(r.servicios_subtotal1).toBe(798_000);
    expect(r.costo_delben).toBe(848_936);
    expect(r.distribuidor_subtotal2).toBe(984_766);
    expect(r.precio_sin_iva).toBe(1_313_021);
    expect(r.precio_final_unitario).toBe(1_562_495);
  });

  it('Exportación: sin IVA, USD con tasa 4000', () => {
    const r = calcularItem({ ...BASE, pais_cliente_final: 'USA' });
    expect(r.moneda).toBe('USD');
    expect(r.iva_aplicado).toBe(false);
    // mismos % pero en USD: base 1.000.000/4000 = 250
    // 250 → desc 30% = 175 → ×1.14 = 199.5 → /0.94 = 212.23
    //  → ×1.16 = 246.19 → /0.75 = 328.25
    expect(r.precio_final_unitario).toBeCloseTo(328.25, 1);
  });

  it('filtrarPorRol oculta costo Delben al comercial', () => {
    const r = calcularItem({ ...BASE, pais_cliente_final: 'Colombia' });
    const f = filtrarPorRol(r, 'distribuidor_comercial') as any;
    expect(f.costo_delben).toBeUndefined();
    expect(f.costo_tras_descuentos).toBeUndefined();
    expect(f.precio_final_unitario).toBe(1_562_495);
  });

  it('utilidad MARGIN: 25% real sobre precio sin IVA', () => {
    const r = calcularItem({ ...BASE, pais_cliente_final: 'Colombia' });
    const utilidadReal =
      (r.precio_sin_iva - r.distribuidor_subtotal2) / r.precio_sin_iva * 100;
    expect(Math.round(utilidadReal)).toBe(25);
  });
});

============================================================ */
