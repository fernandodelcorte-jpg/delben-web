import { describe, it, expect } from 'vitest'
import {
  camposCategoria,
  categoriasConDescuentoCero,
  CAMPOS_CATEGORIA_EXISTENTE,
} from './categorias-import'

// El import no manda sobre /admin/categorias: en una categoría que YA existe solo
// puede tocar nombre y orden. Si el mask volviera a incluir desc_desarmado_base_pct
// o activo, un reimport borraría lo que configuró Delben — y el motor cobraría mal.
describe('camposCategoria', () => {
  const existentes = new Set(['cocina', 'closets'])

  it('en una categoría existente escribe solo nombre y orden', () => {
    expect(camposCategoria('cocina', existentes)).toEqual(CAMPOS_CATEGORIA_EXISTENTE)
    expect(camposCategoria('cocina', existentes)).not.toContain('desc_desarmado_base_pct')
    expect(camposCategoria('cocina', existentes)).not.toContain('activo')
    expect(camposCategoria('cocina', existentes)).not.toContain('categorias_macro_ids')
    expect(camposCategoria('cocina', existentes)).not.toContain('mostrar_en_todas')
  })

  it('en una categoría nueva escribe también la configuración de arranque', () => {
    const campos = camposCategoria('puertas-de-paso', existentes)
    expect(campos).toContain('desc_desarmado_base_pct')
    expect(campos).toContain('activo')
    expect(campos).toContain('categorias_macro_ids')
    expect(campos).toContain('mostrar_en_todas')
  })

  it('segundo import de la misma categoría: ya existe → mask reducido', () => {
    // Simula las dos pasadas: tras crear, el id entra en el set de existentes.
    const tras1erImport = new Set([...existentes, 'puertas-de-paso'])
    expect(camposCategoria('puertas-de-paso', tras1erImport)).toEqual(CAMPOS_CATEGORIA_EXISTENTE)
  })
})

describe('categoriasConDescuentoCero', () => {
  const excel = [
    { id: 'cocina', doc: { nombre: 'COCINA', desc_desarmado_base_pct: 30 } },
    { id: 'puertas-de-paso', doc: { nombre: 'PUERTAS DE PASO', desc_desarmado_base_pct: 0 } },
    { id: 'qualita', doc: { nombre: 'QUALITA', desc_desarmado_base_pct: 0 } },
  ]

  it('usa el valor REAL de Firestore cuando la categoría ya existe', () => {
    // El admin ya configuró PUERTAS DE PASO al 18%: no debe aparecer como 0%,
    // aunque la tabla del parser siga diciendo 0.
    const enFirestore = new Map([['puertas-de-paso', 18]])
    expect(categoriasConDescuentoCero(excel, enFirestore)).toEqual(['QUALITA'])
  })

  it('usa el valor del parser solo para categorías que aún no existen', () => {
    expect(categoriasConDescuentoCero(excel, new Map())).toEqual(['PUERTAS DE PASO', 'QUALITA'])
  })

  it('avisa de una categoría que existe en Firestore con descuento 0', () => {
    const enFirestore = new Map([
      ['cocina', 0],
      ['puertas-de-paso', 18],
      ['qualita', 5],
    ])
    expect(categoriasConDescuentoCero(excel, enFirestore)).toEqual(['COCINA'])
  })
})
