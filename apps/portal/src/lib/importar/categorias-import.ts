/**
 * Reglas de escritura de `categorias` en el import. Módulo aparte —sin Firebase—
 * para poder testearlas sin levantar el cliente.
 */

// ─── Categorías: el import no manda sobre la configuración del admin ─────────
// El Excel solo sabe el nombre y el orden de aparición. Todo lo demás
// (desc_desarmado_base_pct, activo, categorias_macro_ids, mostrar_en_todas) lo
// configura Delben en /admin/categorias, así que se escribe SOLO al crear la
// categoría; en un reimport esos campos ni se tocan. La tabla DESC_CATEGORIA del
// parser es un valor de arranque, no la verdad.
export const CAMPOS_CATEGORIA_NUEVA = [
  'nombre', 'orden', 'desc_desarmado_base_pct', 'activo',
  'categorias_macro_ids', 'mostrar_en_todas',
]
export const CAMPOS_CATEGORIA_EXISTENTE = ['nombre', 'orden']

export function camposCategoria(id: string, existentes: ReadonlySet<string>): string[] {
  return existentes.has(id) ? CAMPOS_CATEGORIA_EXISTENTE : CAMPOS_CATEGORIA_NUEVA
}

// Descuento efectivo de cada categoría: el REAL de Firestore si ya existe (que es
// el que usará el motor), el del parser solo si se va a crear. Con esto la
// advertencia de "descuento 0%" deja de mentir cuando el admin ya lo configuró.
export function categoriasConDescuentoCero(
  categoriasExcel: { id: string; doc: { nombre: string; desc_desarmado_base_pct: number } }[],
  descuentosEnFirestore: ReadonlyMap<string, number>,
): string[] {
  return categoriasExcel
    .filter((c) => {
      const real = descuentosEnFirestore.get(c.id)
      return (real ?? c.doc.desc_desarmado_base_pct) === 0
    })
    .map((c) => c.doc.nombre)
}
