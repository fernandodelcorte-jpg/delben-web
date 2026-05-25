'use client'

import { useEffect, useState } from 'react'
import { getLogoDelben } from '@/lib/firestore/config'

// Caché a nivel de módulo: Firestore se consulta una sola vez por sesión de página.
let _cachedUrl: string | null | undefined = undefined

function useLogoUrl() {
  const [url, setUrl] = useState<string | null | undefined>(_cachedUrl)

  useEffect(() => {
    if (_cachedUrl !== undefined) {
      setUrl(_cachedUrl)
      return
    }
    getLogoDelben()
      .then((u) => {
        _cachedUrl = u
        setUrl(u)
      })
      .catch(() => {
        _cachedUrl = null
        setUrl(null)
      })
  }, [])

  return url
}

// ─── Logo en nav (fondo blanco) ───────────────────────────────────────────────

export function LogoDelbenNav() {
  const url = useLogoUrl()

  if (url) {
    return (
      <img
        src={url}
        alt="Delben"
        className="h-7 w-auto object-contain"
        draggable={false}
      />
    )
  }

  // Fallback texto mientras carga o si no hay logo configurado
  return (
    <span className="text-base font-semibold tracking-tight text-stone-900">
      Delben
    </span>
  )
}

// ─── Logo en sidebar admin (fondo blanco, badge "Admin" al lado) ──────────────

export function LogoDelbenAdmin() {
  const url = useLogoUrl()

  if (url) {
    return (
      <img
        src={url}
        alt="Delben"
        className="h-6 w-auto object-contain"
        draggable={false}
      />
    )
  }

  return (
    <span className="text-sm font-semibold tracking-tight text-stone-900">
      Delben
    </span>
  )
}
