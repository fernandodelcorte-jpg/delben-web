'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDistribuidores } from '@/lib/firestore/distribuidores'
import type { Distribuidor } from '@/lib/firebase/tipos-firestore'

export default function DistribuidoresPage() {
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDistribuidores()
      .then(setDistribuidores)
      .catch(() => setError('No se pudieron cargar los distribuidores.'))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-stone-400 uppercase mb-2">
            Administración
          </p>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
            Distribuidores
          </h1>
          <p className="mt-1.5 text-sm text-stone-500">
            Empresas distribuidoras con acceso a la plataforma.
          </p>
        </div>
        <Link
          href="/admin/distribuidores/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 transition-colors"
        >
          + Nuevo distribuidor
        </Link>
      </div>

      {cargando && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-700" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!cargando && !error && distribuidores.length === 0 && (
        <div className="rounded-lg border border-stone-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-stone-500">
            No hay distribuidores registrados.{' '}
            <Link href="/admin/distribuidores/nuevo" className="underline text-stone-700">
              Crea el primero.
            </Link>
          </p>
        </div>
      )}

      <div className="space-y-3">
        {distribuidores.map((d) => (
          <Link
            key={d.id}
            href={`/admin/distribuidores/${d.id}`}
            className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-5 py-4 hover:border-stone-300 hover:shadow-sm transition-all"
          >
            <div>
              <p className="text-sm font-semibold text-stone-900">{d.nombre}</p>
              <p className="mt-0.5 text-xs text-stone-500">
                {d.ciudad}, {d.pais}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-xs text-stone-400">
                <span>{d.descuento_muebles_pct}% muebles</span>
                <span className="mx-1.5">·</span>
                <span>{d.descuento_herrajes_pct}% herrajes</span>
              </div>
              <span
                className={[
                  'rounded-full px-2.5 py-0.5 text-xs font-medium',
                  d.activo
                    ? 'bg-green-50 text-green-700'
                    : 'bg-stone-100 text-stone-500',
                ].join(' ')}
              >
                {d.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
