'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CircleNotch, MagnifyingGlass, Plus, X } from '@phosphor-icons/react'
import { getValoraciones, totalCostoDelbenDeValoracion } from '@/lib/firestore/valoraciones'
import { getDistribuidores } from '@/lib/firestore/distribuidores'
import { formatCOP } from '@/lib/datos-demo'
import type { Valoracion, Distribuidor } from '@/lib/firebase/tipos-firestore'

function normalizar(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function formatFecha(ts: number) {
  return new Date(ts).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function ValoracionesPage() {
  const router = useRouter()
  const [valoraciones, setValoraciones] = useState<Valoracion[]>([])
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroDistribuidor, setFiltroDistribuidor] = useState<string>('todos')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    Promise.all([getValoraciones(), getDistribuidores()])
      .then(([vals, dists]) => {
        setValoraciones(vals)
        setDistribuidores(dists)
      })
      .finally(() => setCargando(false))
  }, [])

  const valoracionesFiltradas = useMemo(() => {
    let r = valoraciones
    if (filtroDistribuidor !== 'todos') r = r.filter((v) => v.distribuidor_id === filtroDistribuidor)
    if (filtroEstado !== 'todos') r = r.filter((v) => v.estado === filtroEstado)
    if (busqueda.trim()) {
      const ts = normalizar(busqueda.trim()).split(/\s+/).filter(Boolean)
      r = r.filter((v) => {
        const h = normalizar(v.proyectoNombre) + ' ' + normalizar(v.clienteNombre) + ' ' + normalizar(v.distribuidor_nombre)
        return ts.every((t) => h.includes(t))
      })
    }
    return r
  }, [valoraciones, filtroDistribuidor, filtroEstado, busqueda])

  const hayFiltros = filtroDistribuidor !== 'todos' || filtroEstado !== 'todos' || busqueda.trim() !== ''

  function limpiarFiltros() {
    setFiltroDistribuidor('todos')
    setFiltroEstado('todos')
    setBusqueda('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Valoraciones internas</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {!cargando && (
              hayFiltros
                ? `${valoracionesFiltradas.length} de ${valoraciones.length}`
                : `${valoraciones.length} valoración${valoraciones.length !== 1 ? 'es' : ''} en total`
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hayFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors"
            >
              <X size={12} weight="bold" />
              Limpiar
            </button>
          )}
          <Link
            href="/admin/valoraciones/nueva"
            className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
          >
            <Plus size={13} weight="bold" />
            Nueva valoración
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar proyecto, cliente o distribuidor…"
            className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
          />
        </div>
        <select
          value={filtroDistribuidor}
          onChange={(e) => setFiltroDistribuidor(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 transition-all"
        >
          <option value="todos">Todos los distribuidores</option>
          {distribuidores.map((d) => (
            <option key={d.id} value={d.id}>{d.nombre}</option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 transition-all"
        >
          <option value="todos">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="facturada">Facturada</option>
        </select>
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="flex items-center justify-center py-16 gap-2 text-stone-400 text-sm">
          <CircleNotch size={18} className="animate-spin" />
          Cargando…
        </div>
      ) : valoracionesFiltradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white py-16 text-center">
          <p className="text-sm text-stone-400">
            {hayFiltros ? 'Sin resultados para los filtros aplicados.' : 'No hay valoraciones aún.'}
          </p>
          {hayFiltros ? (
            <button type="button" onClick={limpiarFiltros} className="mt-2 text-xs text-stone-400 underline hover:text-stone-700">
              Limpiar filtros
            </button>
          ) : (
            <Link href="/admin/valoraciones/nueva" className="mt-2 inline-block text-xs text-stone-400 underline hover:text-stone-700">
              Crear primera valoración
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100 overflow-hidden">
          {valoracionesFiltradas.map((v) => (
            <button
              key={v.id}
              onClick={() => router.push(`/admin/valoraciones/${v.id}`)}
              className="tactil w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50 transition-colors"
            >
              <div className="w-36 shrink-0">
                <p className="text-xs font-semibold text-stone-700 truncate">{v.distribuidor_nombre}</p>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate">{v.proyectoNombre}</p>
                <p className="text-xs text-stone-400 truncate">
                  {v.clienteNombre}
                  {v.numero_op && <span className="text-stone-500"> · OP {v.numero_op}</span>}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={[
                    'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    v.estado === 'facturada'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700',
                  ].join(' ')}
                >
                  {v.estado === 'facturada' ? 'Facturada' : 'Borrador'}
                </span>
                <span
                  className={[
                    'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    v.modalidad === 'desarmado' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600',
                  ].join(' ')}
                >
                  {v.modalidad === 'desarmado' ? 'Desarmado' : 'Tradicional'}
                </span>
              </div>

              <div className="shrink-0 text-right w-36">
                <p className="text-sm font-bold text-stone-900 tabular-nums">{formatCOP(totalCostoDelbenDeValoracion(v))}</p>
                <p className="text-xs text-stone-400">{formatFecha(v.createdAt)}</p>
              </div>

              <span className="text-stone-300 text-xs shrink-0">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
