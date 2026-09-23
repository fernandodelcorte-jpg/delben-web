// Los ids de Firestore que genera el importador salen de aquí. Un id NO puede
// cambiar entre importaciones: `modulo_id` queda guardado en el snapshot de cada
// cotización y el recálculo lee `modulos/{id}`. Por eso el corte a 80 caracteres
// se conserva tal cual para todo lo que ya cabe; lo único que cambia es qué pasa
// cuando NO cabe.
const LARGO_MAX = 80
const LARGO_HASH = 8
const LARGO_PREFIJO = LARGO_MAX - LARGO_HASH - 1 // 71 + '-' + 8 = 80

// FNV-1a de 32 bits. Sirve para desambiguar, no para seguridad: se necesita
// síncrono (el parser corre en el browser dentro de un bucle) y sin dependencias;
// `crypto.subtle` es async. `Math.imul` hace la multiplicación en 32 bits.
function hashFnv1a(texto: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(LARGO_HASH, '0')
}

export function slugify(text: string): string {
  const completo = text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  // Cabe entero: id idéntico al de siempre.
  if (completo.length <= LARGO_MAX) return completo

  // No cabe: truncar PIERDE la parte que distingue las variantes (dos productos
  // distintos acababan con el mismo id y el segundo pisaba al primero en
  // `modulos`, en sus `precios` y en `modulos_busqueda`). El hash del slug
  // COMPLETO los separa y es estable: el mismo nombre da siempre el mismo id.
  const prefijo = completo.substring(0, LARGO_PREFIJO).replace(/-+$/g, '')
  return `${prefijo}-${hashFnv1a(completo)}`
}

export function normalizarNombre(nombre: string): string {
  return nombre.toString().trim().replace(/\s+/g, ' ').toUpperCase()
}

export function generarKeywords(nombre: string): string[] {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1)
}
