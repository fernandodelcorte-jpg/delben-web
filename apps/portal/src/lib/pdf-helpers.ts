/**
 * Tipos normalizados para los dos PDFs (cotización cliente + orden de compra).
 * Permite que ambos PDFs sean alimentados desde el store de Zustand (borrador)
 * o desde snapshots de Firestore ([id] guardada), sin duplicar lógica.
 */

import type { ItemCarrito, ItemHerrajeCarrito, ItemEspecial, CotizacionInfo } from '@/store/carrito'
import type {
  ItemCotizacionSnapshot,
  ItemHerraCotizacionSnapshot,
  ItemEspecialSnapshot,
} from '@/lib/firebase/tipos-firestore'

// ─── Utilidad: convierte una URL remota a data URL (evita CORS en react-pdf) ──
// Para URLs de Firebase Storage usa el proxy /api/logo-proxy (server-side, sin CORS).

const FIREBASE_STORAGE_HOST = 'firebasestorage.googleapis.com'

function proxyUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === FIREBASE_STORAGE_HOST || parsed.hostname.endsWith('.' + FIREBASE_STORAGE_HOST)) {
      return `/api/logo-proxy?url=${encodeURIComponent(url)}`
    }
  } catch { /* URL inválida — usa tal cual */ }
  return url
}

export async function urlADataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(proxyUrl(url))
    if (!resp.ok) return null
    const blob = await resp.blob()
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ─── Tipos normalizados ───────────────────────────────────────────────────────

export type HerrajePDF = {
  nombre: string
  cantidad: number
  precioSubtotal: number
  ivaSubtotal: number   // IVA del renglón (precio cliente): iva_monto × cantidad
  costoSubtotal: number
}

export type EspecialPDF = {
  id: string
  nombre: string
  configLinea: string
  cantidad: number
  // Capa Distribuidor (precio cliente)
  precioSubtotal: number
  ivaSubtotal: number   // IVA del renglón (0 si el especial viejo no guardó resultado)
  // Capa Delben (no mostrar a distribuidor_comercial)
  costoSubtotal: number
  observaciones: string
  herrajes: { nombre: string; cantidad: number }[]
}

export type ItemPDF = {
  id: string
  nombre: string
  codigoExcel: string
  configLinea: string
  cantidad: number
  // Capa Distribuidor
  precioSinIva: number
  ivaMonto: number       // por unidad
  ivaSubtotal: number    // del renglón: iva_monto × cantidad
  precioUnitario: number
  precioSubtotal: number
  // Capa Delben (no mostrar a distribuidor_comercial)
  costoUnitario: number
  costoSubtotal: number
  observaciones: string
  herrajes: HerrajePDF[]
}

export type InfoPDF = {
  clienteNombre: string
  clienteDireccion?: string
  proyectoNombre: string
  espacioNombre?: string
  categoriaNombre?: string
  modalidad: 'tradicional' | 'desarmado'
  fecha: Date
  // Moneda real de la cotización (COP Colombia, USD exportación). El IVA % se
  // deriva en el PDF de los renglones (ivaSubtotal / sin IVA), no del país.
  moneda: 'COP' | 'USD'
  // Para que la cotización al cliente muestre el nombre del distribuidor (no Delben)
  // cuando no hay logo.
  distribuidorNombre?: string
  transporteFijo?: number
  instalacionFija?: number
  logoDistribuidorUrl?: string | null
  logoDelbenUrl?: string | null
}

// ─── Helpers de configuración (línea legible) ─────────────────────────────────

function configLineaFromConfig(c: {
  tipoEstructuraNombre: string
  tipoFachadaNombre: string
  subcategoriaNombre: string
  acabadoNombre: string
  acabadoEstructura: string | null
  colorVidrio: string | null
  colorMetal: string | null
}): string {
  const partes = [
    c.tipoEstructuraNombre,
    c.tipoFachadaNombre,
    c.subcategoriaNombre !== 'Estándar' ? c.subcategoriaNombre : null,
    c.acabadoNombre,
  ].filter(Boolean) as string[]
  if (c.acabadoEstructura) partes.push(`Estr. ${c.acabadoEstructura}`)
  if (c.colorVidrio) partes.push(`Vidrio: ${c.colorVidrio}`)
  if (c.colorMetal) partes.push(`Metal: ${c.colorMetal}`)
  return partes.join(' · ')
}

// ─── Conversores ──────────────────────────────────────────────────────────────

export function itemCarritoToPDF(item: ItemCarrito): ItemPDF {
  return {
    id: item.id,
    nombre: item.modulo.nombre,
    codigoExcel: item.modulo.codigo_excel ?? '',
    configLinea: configLineaFromConfig(item.config),
    cantidad: item.config.cantidad,
    precioSinIva: item.resultado.precio_sin_iva,
    ivaMonto: item.resultado.iva_monto,
    ivaSubtotal: item.resultado.iva_monto * item.config.cantidad,
    precioUnitario: item.resultado.precio_final_unitario,
    precioSubtotal: item.resultado.subtotal_linea,
    costoUnitario: item.resultado.costo_delben,
    costoSubtotal: item.resultado.costo_delben * item.config.cantidad,
    observaciones: item.config.observaciones,
    herrajes: item.herrajesAsociados.map((h) => ({
      nombre: h.accesorio.nombre,
      cantidad: h.cantidad,
      precioSubtotal: h.resultado.subtotal_linea,
      ivaSubtotal: h.resultado.iva_monto * h.cantidad,
      costoSubtotal: h.resultado.costo_delben * h.cantidad,
    })),
  }
}

export function itemSnapshotToPDF(item: ItemCotizacionSnapshot): ItemPDF {
  return {
    id: item.modulo_id,
    nombre: item.modulo_nombre,
    codigoExcel: '',
    configLinea: configLineaFromConfig(item.config),
    cantidad: item.config.cantidad,
    precioSinIva: item.resultado.precio_sin_iva,
    ivaMonto: item.resultado.iva_monto,
    ivaSubtotal: item.resultado.iva_monto * item.config.cantidad,
    precioUnitario: item.resultado.precio_final_unitario,
    precioSubtotal: item.resultado.subtotal_linea,
    costoUnitario: item.resultado.costo_delben,
    costoSubtotal: item.resultado.costo_delben * item.config.cantidad,
    observaciones: item.config.observaciones,
    herrajes: item.herrajesAsociados.map((h) => ({
      nombre: h.nombre,
      cantidad: h.cantidad,
      precioSubtotal: h.resultado.subtotal_linea,
      ivaSubtotal: h.resultado.iva_monto * h.cantidad,
      costoSubtotal: h.resultado.costo_delben * h.cantidad,
    })),
  }
}

export function herrajeCarritoToPDF(item: ItemHerrajeCarrito): HerrajePDF {
  return {
    nombre: item.accesorio.nombre,
    cantidad: item.cantidad,
    precioSubtotal: item.resultado.subtotal_linea,
    ivaSubtotal: item.resultado.iva_monto * item.cantidad,
    costoSubtotal: item.resultado.costo_delben * item.cantidad,
  }
}

export function herrajeSnapshotToPDF(item: ItemHerraCotizacionSnapshot): HerrajePDF {
  return {
    nombre: item.nombre,
    cantidad: item.cantidad,
    precioSubtotal: item.resultado.subtotal_linea,
    ivaSubtotal: item.resultado.iva_monto * item.cantidad,
    costoSubtotal: item.resultado.costo_delben * item.cantidad,
  }
}

function configLineaEspecial(e: {
  tipoEstructuraNombre: string
  tipoFachadaNombre: string
  acabadoNombre: string
  acabadoEstructura: string | null
  colorVidrio: string | null
  ancho: number | null
  alto: number
  profundidad: number
}): string {
  const partes = [e.tipoEstructuraNombre, e.tipoFachadaNombre, e.acabadoNombre].filter(Boolean) as string[]
  if (e.acabadoEstructura) partes.push(`Estr. ${e.acabadoEstructura}`)
  if (e.colorVidrio) partes.push(`Vidrio: ${e.colorVidrio}`)
  const dim = `${e.ancho ? `${e.ancho} × ` : ''}${e.alto} × ${e.profundidad} mm`
  partes.push(dim)
  return partes.join(' · ')
}

export function especialCarritoToPDF(item: ItemEspecial): EspecialPDF {
  return {
    id: item.id,
    nombre: item.nombre,
    configLinea: configLineaEspecial(item),
    cantidad: item.cantidad,
    precioSubtotal: item.precioClienteUnitario * item.cantidad,
    // IVA del especial: del resultado del motor si existe (los viejos sin resultado → 0).
    ivaSubtotal: item.resultado ? item.resultado.iva_monto * item.cantidad : 0,
    costoSubtotal: item.precioDelbenUnitario * item.cantidad,
    observaciones: item.observaciones,
    herrajes: item.herrajes.map((h) => ({ nombre: h.nombre, cantidad: h.cantidad })),
  }
}

export function especialSnapshotToPDF(item: ItemEspecialSnapshot): EspecialPDF {
  return {
    id: crypto.randomUUID(),
    nombre: item.nombre,
    configLinea: configLineaEspecial(item),
    cantidad: item.cantidad,
    precioSubtotal: item.precioClienteUnitario * item.cantidad,
    ivaSubtotal: item.resultado ? item.resultado.iva_monto * item.cantidad : 0,
    costoSubtotal: item.precioDelbenUnitario * item.cantidad,
    observaciones: item.observaciones,
    herrajes: item.herrajes.map((h) => ({ nombre: h.nombre, cantidad: h.cantidad })),
  }
}

export function cotizacionInfoToInfoPDF(
  info: CotizacionInfo,
  opts?: {
    logoDistribuidorUrl?: string | null
    logoDelbenUrl?: string | null
    moneda?: 'COP' | 'USD'
    distribuidorNombre?: string
  },
): InfoPDF {
  return {
    clienteNombre: info.clienteNombre,
    clienteDireccion: info.clienteDireccion,
    proyectoNombre: info.proyectoNombre,
    espacioNombre: info.espacioNombre,
    categoriaNombre: info.categoriaNombre,
    modalidad: info.modalidad,
    fecha: new Date(info.fecha),
    moneda: opts?.moneda ?? 'COP',
    distribuidorNombre: opts?.distribuidorNombre,
    transporteFijo: info.transporteFijo,
    instalacionFija: info.instalacionFija,
    logoDistribuidorUrl: opts?.logoDistribuidorUrl,
    logoDelbenUrl: opts?.logoDelbenUrl,
  }
}
