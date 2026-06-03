// Ítem del catálogo de consulta de precios (módulo o herraje), tal como lo pinta
// la página /catalogo. Se construye en el cliente leyendo Firestore directamente.
//
// SEGURIDAD: precioConDescuento y descuentoPct son OPCIONALES a propósito. Para el rol
// distribuidor_comercial NO se calculan (el campo no existe en el ítem). Para los roles
// con acceso a costo, vienen poblados. Es la misma protección de de-render que usa el
// resto del portal — ver tests/catalogo/SEGURIDAD.md.

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
