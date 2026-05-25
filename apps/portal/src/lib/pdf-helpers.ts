/**
 * Tipos normalizados para los dos PDFs (cotización cliente + orden de compra).
 * Permite que ambos PDFs sean alimentados desde el store de Zustand (borrador)
 * o desde snapshots de Firestore ([id] guardada), sin duplicar lógica.
 */

import type { ItemCarrito, ItemHerrajeCarrito, CotizacionInfo } from '@/store/carrito'
import type {
  ItemCotizacionSnapshot,
  ItemHerraCotizacionSnapshot,
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
  costoSubtotal: number
}

export type ItemPDF = {
  id: string
  nombre: string
  codigoExcel: string
  configLinea: string
  cantidad: number
  // Capa Distribuidor
  precioSinIva: number
  ivaMonto: number
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
  categoriaNombre?: string
  modalidad: 'tradicional' | 'desarmado'
  fecha: Date
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
    precioUnitario: item.resultado.precio_final_unitario,
    precioSubtotal: item.resultado.subtotal_linea,
    costoUnitario: item.resultado.costo_delben,
    costoSubtotal: item.resultado.costo_delben * item.config.cantidad,
    observaciones: item.config.observaciones,
    herrajes: item.herrajesAsociados.map((h) => ({
      nombre: h.accesorio.nombre,
      cantidad: h.cantidad,
      precioSubtotal: h.resultado.subtotal_linea,
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
    precioUnitario: item.resultado.precio_final_unitario,
    precioSubtotal: item.resultado.subtotal_linea,
    costoUnitario: item.resultado.costo_delben,
    costoSubtotal: item.resultado.costo_delben * item.config.cantidad,
    observaciones: item.config.observaciones,
    herrajes: item.herrajesAsociados.map((h) => ({
      nombre: h.nombre,
      cantidad: h.cantidad,
      precioSubtotal: h.resultado.subtotal_linea,
      costoSubtotal: h.resultado.costo_delben * h.cantidad,
    })),
  }
}

export function herrajeCarritoToPDF(item: ItemHerrajeCarrito): HerrajePDF {
  return {
    nombre: item.accesorio.nombre,
    cantidad: item.cantidad,
    precioSubtotal: item.resultado.subtotal_linea,
    costoSubtotal: item.resultado.costo_delben * item.cantidad,
  }
}

export function herrajeSnapshotToPDF(item: ItemHerraCotizacionSnapshot): HerrajePDF {
  return {
    nombre: item.nombre,
    cantidad: item.cantidad,
    precioSubtotal: item.resultado.subtotal_linea,
    costoSubtotal: item.resultado.costo_delben * item.cantidad,
  }
}

export function cotizacionInfoToInfoPDF(
  info: CotizacionInfo,
  logos?: { logoDistribuidorUrl?: string | null; logoDelbenUrl?: string | null },
): InfoPDF {
  return {
    clienteNombre: info.clienteNombre,
    clienteDireccion: info.clienteDireccion,
    proyectoNombre: info.proyectoNombre,
    categoriaNombre: info.categoriaNombre,
    modalidad: info.modalidad,
    fecha: new Date(info.fecha),
    logoDistribuidorUrl: logos?.logoDistribuidorUrl,
    logoDelbenUrl: logos?.logoDelbenUrl,
  }
}
