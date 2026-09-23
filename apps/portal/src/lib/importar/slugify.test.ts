import { describe, it, expect } from 'vitest'
import { slugify } from './slugify'

// Nombres reales del Excel que provocaron el bug: el slug completo pasa de 80
// caracteres y el corte caía ANTES del "ANCHO …", la parte que distingue las dos
// variantes. Firestore acababa con un solo doc y un producto perdido.
const VETA_CONTINUA_1000 =
  'PUERTAS DE PASO PUERTA DE PASO COMPLEMENTO SUPERIOR E INFERIOR VETA CONTINUA ANCHO 1000 2800 0'
const VETA_CONTINUA_700 =
  'PUERTAS DE PASO PUERTA DE PASO COMPLEMENTO SUPERIOR E INFERIOR VETA CONTINUA ANCHO 700/800/900 2800 0'

describe('slugify', () => {
  it('no cambia los ids que ya caben en 80 caracteres', () => {
    // Si estos cambiaran, el reimport duplicaría docs y los `modulo_id` guardados
    // en las cotizaciones dejarían de resolver.
    expect(slugify('PUERTAS DE PASO')).toBe('puertas-de-paso')
    expect(slugify('COCINA MODULO BAJO 2 PUERTAS 600 720 580')).toBe(
      'cocina-modulo-bajo-2-puertas-600-720-580',
    )
    expect(slugify('Melamina 18MM Premium')).toBe('melamina-18mm-premium')
    expect(slugify('ACABADOS X M2')).toBe('acabados-x-m2')
  })

  it('quita tildes, signos y guiones sobrantes de los extremos', () => {
    expect(slugify('  DECORACIÓN / MUEBLES  ')).toBe('decoracion-muebles')
    expect(slugify('MUEBLES DE BAÑO')).toBe('muebles-de-bano')
  })

  it('respeta el límite de 80 caracteres', () => {
    expect(slugify(VETA_CONTINUA_1000).length).toBe(80)
    expect(slugify('x'.repeat(200)).length).toBe(80)
  })

  it('da ids distintos a dos nombres largos que antes colisionaban', () => {
    const a = slugify(VETA_CONTINUA_1000)
    const b = slugify(VETA_CONTINUA_700)
    expect(a).not.toBe(b)
    // Antes del fix ambos se truncaban al mismo prefijo: eso sigue siendo cierto,
    // lo que los separa es el sufijo.
    expect(a.substring(0, 71)).toBe(b.substring(0, 71))
  })

  it('es estable: el mismo nombre da siempre el mismo id', () => {
    expect(slugify(VETA_CONTINUA_700)).toBe(slugify(VETA_CONTINUA_700))
    expect(slugify(VETA_CONTINUA_700)).toBe(slugify(` ${VETA_CONTINUA_700} `))
  })

  it('el sufijo son 8 hex tras un guion', () => {
    expect(slugify(VETA_CONTINUA_1000)).toMatch(/^[a-z0-9-]+-[0-9a-f]{8}$/)
  })

  it('no colisiona en un lote de nombres largos con prefijo común', () => {
    const base = 'COCINA MODULO SUPERIOR CON ENTREPANO Y PUERTA ABATIBLE EN MELAMINA BLANCA ANCHO'
    const ids = new Set(
      Array.from({ length: 200 }, (_, i) => slugify(`${base} ${600 + i} 720 320`)),
    )
    expect(ids.size).toBe(200)
  })
})
