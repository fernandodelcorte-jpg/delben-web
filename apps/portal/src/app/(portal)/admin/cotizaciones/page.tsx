'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleNotch, MagnifyingGlass, X } from '@phosphor-icons/react'
import { getCotizacionesTodas } from '@/lib/firestore/cotizaciones'
import { getDistribuidores } from '@/lib/firestore/distribuidores'
import { formatCOP } from '@/lib/datos-demo'
import type { Cotizacion, Distribuidor } from '@/lib/firebase/tipos-firestore'

function normalizar(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const ETIQUETA_ESTADO: Record<string, { label: string; clases: string }> = {
  borrador: { label: 'Borrador', clases: 'bg-amber-100 text-amber-700' },
  enviada: { label: 'Enviada', clases: 'bg-blue-100 text-blue-700' },
  aceptada: { label: 'Aceptada', clases: 'bg-emerald-100 text-emerald-700' },
}

function formatFecha(ts: number) {
  return new Date(ts).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function AdminCotizacionesPage() {
  const router = useRouter()
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroDistribuidor, setFiltroDistribuidor] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    Promise.all([getCotizacionesTodas(), getDistribuidores()])
      .then(([cots, dists]) => {
        setCotizaciones(cots)
        setDistribuidores(dists)
      })
      .finally(() => setCargando(false))
  }, [])

  const mapaDistribuidor = Object.fromEntries(distribuidores.map((d) => [d.id, d]))

  const cotizacionesFiltradas = useMemo(() => {
    let r = cotizaciones
    if (filtroDistribuidor !== 'todos') r = r.filter((c) => c.distribuidor_id === filtroDistribuidor)
    if (busqueda.trim()) {
      const ts = normalizar(busqueda.trim()).split(/\s+/).filter(Boolean)
      r = r.filter((c) => {
        const h = normalizar(c.proyectoNombre) + ' ' + normalizar(c.clienteNombre)
        return ts.every((t) => h.includes(t))
      })
    }
    return r
  }, [cotizaciones, filtroDistribuidor, busqueda])

  const hayFiltrosActivos = filtroDistribuidor !== 'todos' || busqueda.trim() !== ''

  function limpiarFiltros() {
    setFiltroDistribuidor('todos')
    setBusqueda('')
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Cotizaciones</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {!cargando && (
              hayFiltrosActivos
                ? `${cotizacionesFiltradas.length} de ${cotizaciones.length} cotización${cotizaciones.length !== 1 ? 'es' : ''}`
                : `${cotizaciones.length} cotización${cotizaciones.length !== 1 ? 'es' : ''} en total`
            )}
          </p>
        </div>
        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors shrink-0"
          >
            <X size={12} weight="bold" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar proyecto o cliente…"
            className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
          />
        </div>

        {/* Distribuidor */}
        <select
          value={filtroDistribuidor}
          onChange={(e) => setFiltroDistribuidor(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
        >
          <option value="todos">Todos los distribuidores</option>
          {distribuidores.map((d) => (
            <option key={d.id} value={d.id}>{d.nombre}</option>
          ))}
        </select>

      </div>

      {/* Lista */}
      {cargando ? (
        <div className="flex items-center justify-center py-16 gap-2 text-stone-400 text-sm">
          <CircleNotch size={18} className="animate-spin" />
          Cargando…
        </div>
      ) : cotizacionesFiltradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white py-16 text-center">
          <p className="text-sm text-stone-400">
            {hayFiltrosActivos ? 'Sin resultados para los filtros aplicados.' : 'No hay cotizaciones.'}
          </p>
          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="mt-2 text-xs text-stone-400 underline hover:text-stone-700"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100 overflow-hidden">
          {cotizacionesFiltradas.map((c) => {
            const dist = mapaDistribuidor[c.distribuidor_id]
            const estado = ETIQUETA_ESTADO[c.estado] ?? ETIQUETA_ESTADO['borrador']!
            return (
              <button
                key={c.id}
                onClick={() =>
                  router.push(`/admin/cotizaciones/${c.distribuidor_id}/${c.id}`)
                }
                className="tactil w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50 transition-colors"
              >
                {/* Distribuidor */}
                <div className="w-36 shrink-0">
                  <p className="text-xs font-semibold text-stone-700 truncate">
                    {dist?.nombre ?? c.distribuidor_id}
                  </p>
                </div>

                {/* Cliente / Proyecto */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {c.proyectoNombre}
                  </p>
                  <p className="text-xs text-stone-400 truncate">{c.clienteNombre}</p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={[
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      estado.clases,
                    ].join(' ')}
                  >
                    {estado.label}
                  </span>
                  <span
                    className={[
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      c.modalidad === 'desarmado'
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600',
                    ].join(' ')}
                  >
                    {c.modalidad === 'desarmado' ? 'Desarmado' : 'Tradicional'}
                  </span>
                </div>

                {/* Total + fecha */}
                <div className="shrink-0 text-right w-36">
                  <p className="text-sm font-bold text-stone-900 tabular-nums">
                    {formatCOP(c.totales.total)}
                  </p>
                  <p className="text-xs text-stone-400">{formatFecha(c.createdAt)}</p>
                </div>

                <span className="text-stone-300 text-xs shrink-0">→</span>
              </button>
            )
          })}
        </div>
      )}

      {!cargando && cotizacionesFiltradas.length > 0 && hayFiltrosActivos && (
        <p className="text-xs text-stone-400 text-center">
          {cotizacionesFiltradas.length} de {cotizaciones.length} cotización{cotizaciones.length !== 1 ? 'es' : ''}
        </p>
      )}
    </div>
  )
}
