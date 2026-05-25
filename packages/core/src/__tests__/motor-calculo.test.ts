import { describe, it, expect } from 'vitest'
import { calcularItem, filtrarPorRol } from '../motor-calculo'
import type { ItemInput } from '../motor-calculo'

// ============================================================
// 5 CASOS VERIFICADOS — motor ejecutado y comprobado a mano
// Fuente: docs/_referencia_codigo/CASOS_PRUEBA_MOTOR.md
// NO modificar estos valores sin reverificar manualmente.
// ============================================================

const SV = { diseno: 3, cotizacion: 2, produccion: 5, logistica: 4, gestion_comercial: 6 }
const U = { transporte: 5, instalacion: 8, imprevistos: 3, utilidad: 25, iva: 19 }
const DIST = { id: 'd1', descuento_muebles_pct: 35, descuento_herrajes_pct: 15 }
const CAT_COCINA = { id: 'cocina', desc_base_pct: 30, desc_premium_pct: 12 }
const LINEA_STD = { id: 'std', tipo_ajuste: 'ninguno' as const, ajuste_pct: 0, es_premium: false }

const BASE: Omit<ItemInput, 'pais_cliente_final'> = {
  precio_base_cop: 1_000_000,
  cantidad: 1,
  tipo_item: 'mueble',
  modelo: 'desarmado',
  distribuidor: DIST,
  categoria: CAT_COCINA,
  linea_acabado: LINEA_STD,
  fecha_cotizacion: new Date('2026-03-15'),
  campanas_disponibles: [],
  servicios_delben: SV,
  universo: U,
  tasa_usd: 4000,
}

// ----------------------------------------------------------
// Caso 1 — desarmado / cocina / Colombia
// ----------------------------------------------------------
describe('Caso 1 — desarmado / cocina / Colombia', () => {
  it('produce el precio final 1.562.495 y los pasos intermedios exactos', () => {
    const r = calcularItem({ ...BASE, pais_cliente_final: 'Colombia' })
    expect(r.costo_tras_descuentos).toBe(700_000)
    expect(r.costo_delben).toBe(848_936)
    expect(r.precio_sin_iva).toBe(1_313_021)
    expect(r.precio_final_unitario).toBe(1_562_495)
    expect(r.iva_aplicado).toBe(true)
    expect(r.moneda).toBe('COP')
  })
})

// ----------------------------------------------------------
// Caso 2 — tradicional / mueble / Colombia
// ----------------------------------------------------------
describe('Caso 2 — tradicional / mueble / Colombia', () => {
  it('aplica descuento_muebles_pct 35% y produce 1.450.889', () => {
    const r = calcularItem({
      ...BASE,
      modelo: 'tradicional',
      pais_cliente_final: 'Colombia',
    })
    expect(r.costo_tras_descuentos).toBe(650_000)
    expect(r.costo_delben).toBe(788_298)
    expect(r.precio_final_unitario).toBe(1_450_889)
    expect(r.moneda).toBe('COP')
  })
})

// ----------------------------------------------------------
// Caso 3 — exportación / USA / sin IVA / USD
// ----------------------------------------------------------
describe('Caso 3 — exportación / USA / sin IVA / USD', () => {
  it('convierte a USD, suprime IVA y produce ≈ 328,26 USD', () => {
    const r = calcularItem({ ...BASE, pais_cliente_final: 'USA' })
    expect(r.moneda).toBe('USD')
    expect(r.iva_aplicado).toBe(false)
    expect(r.iva_monto).toBe(0)
    expect(r.precio_final_unitario).toBeCloseTo(328.26, 1)
  })
})

// ----------------------------------------------------------
// Caso 4 — magenta (+12% recargo) / desarmado / cocina / Colombia
// ----------------------------------------------------------
describe('Caso 4 — magenta recargo 12% / desarmado / Colombia', () => {
  it('aplica recargo 12% sobre el costo tras descuento y produce 1.749.995', () => {
    const r = calcularItem({
      ...BASE,
      linea_acabado: { id: 'magenta', tipo_ajuste: 'recargo', ajuste_pct: 12, es_premium: false },
      pais_cliente_final: 'Colombia',
    })
    expect(r.costo_tras_descuentos).toBe(784_000)
    expect(r.precio_final_unitario).toBe(1_749_995)
  })
})

// ----------------------------------------------------------
// Caso 5 — campaña global −10% / desarmado / cocina / Colombia
// ----------------------------------------------------------
describe('Caso 5 — campaña global −10% / desarmado / Colombia', () => {
  it('aplica descuento de campaña y produce 1.406.246', () => {
    const campana = {
      id: 'nav',
      pct: 10,
      desde: new Date('2026-01-01'),
      hasta: new Date('2026-12-31'),
      activa: true,
      segmentacion: {
        tipo: 'global' as const,
        distribuidores: null,
        categorias: null,
        lineas_acabado: null,
      },
    }
    const r = calcularItem({
      ...BASE,
      campanas_disponibles: [campana],
      pais_cliente_final: 'Colombia',
    })
    expect(r.costo_tras_descuentos).toBe(630_000)
    expect(r.precio_final_unitario).toBe(1_406_246)
  })
})

// ----------------------------------------------------------
// Regla de seguridad — filtrarPorRol
// ----------------------------------------------------------
describe('filtrarPorRol — distribuidor_comercial no recibe costo Delben', () => {
  it('oculta costo_delben y costo_tras_descuentos al comercial', () => {
    const r = calcularItem({ ...BASE, pais_cliente_final: 'Colombia' })
    const f = filtrarPorRol(r, 'distribuidor_comercial')
    expect(f.costo_delben).toBeUndefined()
    expect(f.costo_tras_descuentos).toBeUndefined()
    expect(f.precio_final_unitario).toBe(1_562_495)
  })
})
