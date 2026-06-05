/**
 * Cliente del canal público «Nuestra red». La web no toca Firestore: solo consume
 * el endpoint del portal (único canal autorizado), que ya devolvió lo público.
 */
import { PORTAL_URL } from '@/lib/config'

export type SedePublica = { ciudad: string; pais: string }
export type DistribuidorPublico = { nombre: string; logo_url: string; sedes: SedePublica[] }
export type RedResponse = { distribuidores: DistribuidorPublico[] }

export async function getRed(signal?: AbortSignal): Promise<DistribuidorPublico[]> {
  const res = await fetch(`${PORTAL_URL}/api/red`, { signal })
  if (!res.ok) throw new Error(`Red no disponible (${res.status})`)
  const data = (await res.json()) as RedResponse
  return Array.isArray(data.distribuidores) ? data.distribuidores : []
}

// Orden de presentación de los países (los no listados van al final, alfabéticos).
const ORDEN_PAISES = ['Colombia', 'Venezuela', 'Estados Unidos', 'EE. UU.', 'EEUU', 'USA']

function rankPais(pais: string): number {
  const i = ORDEN_PAISES.findIndex((p) => p.toLowerCase() === pais.trim().toLowerCase())
  return i === -1 ? ORDEN_PAISES.length : i
}

export type GrupoPais = { pais: string; ciudades: string[] }

/** Agrupa las sedes de un distribuidor por país, con ciudades únicas y ordenadas. */
export function agruparPorPais(sedes: SedePublica[]): GrupoPais[] {
  const mapa = new Map<string, Set<string>>()
  for (const s of sedes) {
    const pais = s.pais.trim()
    const ciudad = s.ciudad.trim()
    if (!pais || !ciudad) continue
    const set = mapa.get(pais) ?? new Set<string>()
    set.add(ciudad)
    mapa.set(pais, set)
  }
  return [...mapa.entries()]
    .map(([pais, ciudades]) => ({
      pais,
      ciudades: [...ciudades].sort((a, b) => a.localeCompare(b, 'es')),
    }))
    .sort((a, b) => rankPais(a.pais) - rankPais(b.pais) || a.pais.localeCompare(b.pais, 'es'))
}
