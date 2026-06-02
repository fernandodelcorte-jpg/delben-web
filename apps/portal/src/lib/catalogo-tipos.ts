// Forma de la respuesta del endpoint /api/catalogo. La comparten cliente y servidor.
//
// SEGURIDAD: precioConDescuento y descuentoPct son OPCIONALES a propósito. Para el rol
// distribuidor_comercial el servidor los OMITE por completo (no viajan al navegador).
// Para los roles con acceso a costo, vienen poblados.

export interface ItemCatalogo {
  tipo: 'modulo' | 'herraje'
  id: string
  nombre: string
  subtitulo: string
  categoria_id: string | null
  imagen_url: string | null
  precioLista: number | null
  precioConDescuento?: number
  descuentoPct?: number
}

export interface RespuestaCatalogo {
  moneda: 'COP' | 'USD'
  puedeVerCosto: boolean
  items: ItemCatalogo[]
}
