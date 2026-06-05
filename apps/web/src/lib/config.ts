/**
 * Configuración de entorno de la web institucional.
 *
 * PORTAL_URL es el origen del portal de distribuidores. Sirve para DOS cosas con
 * el mismo valor (mismo origen): (1) el destino de todos los botones "Portal" y
 * (2) la base del fetch a /api/red de la sección "Nuestra red". Por eso una sola
 * variable basta — no hace falta separarlas.
 *
 * Se configura con NEXT_PUBLIC_PORTAL_URL (inlineada en build). Default: el portal
 * desplegado en Netlify. Para cambiar a app.delben.co más adelante basta editar la
 * variable en el panel de Netlify y volver a desplegar; no hay que tocar código.
 *
 * Se normaliza quitando la barra final para evitar `//api/red` al concatenar.
 */
export const PORTAL_URL = (
  process.env['NEXT_PUBLIC_PORTAL_URL'] ?? 'https://charming-panda-75306f.netlify.app'
).replace(/\/+$/, '')
