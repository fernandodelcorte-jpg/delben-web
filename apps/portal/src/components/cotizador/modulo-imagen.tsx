'use client'

import { useState } from 'react'

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-11 w-11 text-xs',
  lg: 'h-14 w-14 text-base',
}

export function ModuloImagen({
  url,
  nombre,
  size = 'md',
}: {
  url: string | null
  nombre: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const [error, setError] = useState(false)
  const cls = SIZES[size]

  if (url && !error) {
    return (
      <img
        src={url}
        alt={nombre}
        onError={() => setError(true)}
        className={`${cls} shrink-0 rounded-md object-cover border border-stone-100`}
      />
    )
  }
  return (
    <div
      className={`${cls} shrink-0 flex items-center justify-center rounded-md bg-stone-100 font-semibold text-stone-400 border border-stone-100`}
    >
      {nombre.slice(0, 2).toUpperCase()}
    </div>
  )
}
