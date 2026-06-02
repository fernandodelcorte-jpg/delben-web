/**
 * Precio del catálogo de consulta = precio de lista × (1 − descuento principal).
 *
 * REGLA DE NEGOCIO (cerrada): solo se aplica el descuento principal. NO hay ajuste
 * de acabado, NI campañas, NI servicios, NI gestión comercial — el catálogo muestra
 * productos sueltos sin acabado elegido, así que el costo completo no está definido.
 *
 * El descuento principal depende de la modalidad:
 *   • Módulo  tradicional → descuento_muebles_pct de la sede
 *   • Módulo  desarmado   → desc_desarmado_base_pct de la categoría del módulo
 *   • Herraje tradicional → descuento_herrajes_pct de la sede
 *   • Herraje desarmado   → 0 (los herrajes no tienen categoría y su precio_desarmado
 *                              ya es el de esa modalidad; coincide con el motor, que
 *                              usa desc_base=0 para herrajes).
 *
 * Es lógica pura (sin Firebase) para poder testearla y reutilizarla en el servidor.
 */

export type ModalidadCatalogo = 'tradicional' | 'desarmado'

export function aplicarDescuento(lista: number, pct: number): number {
  return Math.round(lista * (1 - pct / 100))
}

export function descuentoModuloPct(
  modalidad: ModalidadCatalogo,
  sede: { descuento_muebles_pct: number },
  categoria: { desc_desarmado_base_pct: number } | null,
): number {
  return modalidad === 'tradicional'
    ? sede.descuento_muebles_pct
    : categoria?.desc_desarmado_base_pct ?? 0
}

export function descuentoHerrajePct(
  modalidad: ModalidadCatalogo,
  sede: { descuento_herrajes_pct: number },
): number {
  return modalidad === 'tradicional' ? sede.descuento_herrajes_pct : 0
}

// Convierte un valor en COP a la moneda de la sede. Colombia → COP (sin cambio);
// exportación → USD con la tasa vigente (misma derivación de moneda que el motor).
export function convertirMoneda(
  copValue: number,
  moneda: 'COP' | 'USD',
  tasaUsd: number,
): number {
  if (moneda === 'COP') return Math.round(copValue)
  return Math.round((copValue / tasaUsd) * 100) / 100
}
