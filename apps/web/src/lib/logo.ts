/**
 * Lectura server-side del logo de marca de Delben.
 *
 * Lee config/delben.logo_url desde Firestore con el client SDK ejecutándose EN EL
 * SERVIDOR (Server Component → este módulo se importa solo desde el layout server).
 * El visitante recibe el HTML ya con la URL del logo: nada de fetch en el cliente.
 *
 * Robustez: si la URL viene vacía o la lectura falla (Firestore caído, env sin
 * configurar, regla no desplegada…), devuelve null y el header cae a su fallback
 * de texto "Delben". Nunca rompe la página.
 *
 * Caché: envuelto en unstable_cache con revalidate de 1h, para no pegarle a
 * Firestore en cada request. El logo es un dato que cambia rarísimo.
 */
import { unstable_cache } from 'next/cache'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

async function leerLogoUrl(): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, 'config', 'delben'))
    if (!snap.exists()) return null
    const url = (snap.data() as { logo_url?: string }).logo_url
    return typeof url === 'string' && url.trim() !== '' ? url : null
  } catch {
    return null
  }
}

export const getLogoUrl = unstable_cache(leerLogoUrl, ['delben-logo-url'], {
  revalidate: 3600,
})
