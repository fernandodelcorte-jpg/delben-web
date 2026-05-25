'use client'

import { useState, useEffect } from 'react'
import { X, MagnifyingGlass, CircleNotch, Plus, Minus } from '@phosphor-icons/react'
import { useCarrito } from '@/store/carrito'
import { buscarModulos, buscarAccesorios } from '@/lib/firestore/modulos'
import { resolverCategoriasParaMacro } from '@/lib/firestore/catalogo'
import { formatCOP } from '@/lib/datos-demo'
import type { Modulo, Accesorio } from '@/lib/firebase/tipos-firestore'
import { ModuloImagen } from './modulo-imagen'

type Tab = 'modulos' | 'herrajes'

// ─── Tab Módulos ──────────────────────────────────────────────────────────────

function TabModulos({ onSeleccionar }: { onSeleccionar: (m: Modulo) => void }) {
  const categoriaId = useCarrito((s) => s.cotizacionInfo?.categoriaId)
  const categoriaNombre = useCarrito((s) => s.cotizacionInfo?.categoriaNombre)
  const [busqueda, setBusqueda] = useState('')
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // undefined = resolución pendiente; null = sin filtro (macro mostrar_todas); string[] = filtro activo
  const [categoriaIds, setCategoriaIds] = useState<string[] | null | undefined>(undefined)

  // Resuelve macro → IDs de categorías de lista; se convierte en dependencia de la búsqueda
  useEffect(() => {
    setCategoriaIds(undefined)
    if (!categoriaId) { setCategoriaIds(null); return }
    let cancelado = false
    resolverCategoriasParaMacro(categoriaId)
      .then((ids) => { if (!cancelado) setCategoriaIds(ids) })
      .catch(() => { if (!cancelado) setCategoriaIds(null) })
    return () => { cancelado = true }
  }, [categoriaId])

  useEffect(() => {
    // Esperar a que la resolución de macro esté lista antes de buscar
    if (categoriaIds === undefined) return

    if (busqueda.trim().length < 2) {
      setModulos([])
      return
    }

    let cancelado = false
    setCargando(true)
    setError(null)

    const delay = setTimeout(async () => {
      try {
        // null → sin filtro (mostrar_todas); string[] → filtrar por esos IDs
        const res = await buscarModulos(busqueda, categoriaIds ?? undefined)
        if (!cancelado) setModulos(res)
      } catch {
        if (!cancelado) setError('No se pudo cargar el catálogo.')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }, 300)

    return () => {
      cancelado = true
      clearTimeout(delay)
    }
  }, [busqueda, categoriaIds])

  return (
    <>
      <div className="border-b border-stone-100 px-5 py-3">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            weight="bold"
          />
          <input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={categoriaNombre ? `Buscar en ${categoriaNombre}…` : 'Ej: alto cocina, bajo 60, esquinero…'}
            className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-300 focus:bg-white focus:ring-2 focus:ring-stone-100 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {cargando && (
          <div className="flex items-center justify-center py-12 gap-2 text-stone-400 text-sm">
            <CircleNotch size={16} className="animate-spin" />
            Buscando…
          </div>
        )}
        {!cargando && error && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        )}
        {!cargando && !error && busqueda.trim().length < 2 && (
          <p className="py-10 text-center text-sm text-stone-400">
            Escribe al menos 2 letras para buscar.
          </p>
        )}
        {!cargando && !error && busqueda.trim().length >= 2 && modulos.length === 0 && (
          <p className="py-10 text-center text-sm text-stone-400">
            Sin resultados para &ldquo;{busqueda}&rdquo;
          </p>
        )}
        {!cargando && !error && modulos.map((modulo) => (
          <button
            key={modulo.id}
            onClick={() => onSeleccionar(modulo)}
            className="tactil w-full flex items-center gap-3 rounded-lg p-3 text-left hover:bg-stone-50 transition-colors group"
          >
            <ModuloImagen url={modulo.imagen_url} nombre={modulo.nombre} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800 leading-snug">{modulo.nombre}</p>
              <p className="mt-0.5 text-xs text-stone-400 capitalize">
                {modulo.tipologia}
              </p>
            </div>
            <span className="shrink-0 text-xs text-stone-300 group-hover:text-stone-500 transition-colors">
              →
            </span>
          </button>
        ))}
      </div>

      <div className="border-t border-stone-100 px-5 py-3">
        <p className="text-xs text-stone-400">
          {cargando
            ? 'Buscando…'
            : busqueda.trim().length < 2
              ? 'Catálogo Delben'
              : `${modulos.length} módulo${modulos.length !== 1 ? 's' : ''}`}
        </p>
      </div>
    </>
  )
}

// ─── Tab Herrajes ─────────────────────────────────────────────────────────────

function TabHerrajes() {
  const agregarHerraje = useCarrito((s) => s.agregarHerraje)
  const modalidad = useCarrito((s) => s.cotizacionInfo?.modalidad ?? 'desarmado')

  const [busqueda, setBusqueda] = useState('')
  const [accesorios, setAccesorios] = useState<Accesorio[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cantidades, setCantidades] = useState<Record<string, number>>({})

  function getCantidad(id: string) {
    return cantidades[id] ?? 1
  }
  function setCantidad(id: string, val: number) {
    setCantidades((prev) => ({ ...prev, [id]: Math.max(1, val) }))
  }

  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setAccesorios([])
      return
    }

    let cancelado = false
    setCargando(true)
    setError(null)

    const delay = setTimeout(async () => {
      try {
        const res = await buscarAccesorios(busqueda, modalidad)
        if (!cancelado) setAccesorios(res)
      } catch {
        if (!cancelado) setError('No se pudo cargar el catálogo de herrajes.')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }, 300)

    return () => {
      cancelado = true
      clearTimeout(delay)
    }
  }, [busqueda, modalidad])

  function precio(a: Accesorio): number | null {
    return modalidad === 'tradicional' ? a.precio_tradicional_cop : a.precio_desarmado_cop
  }

  return (
    <>
      <div className="border-b border-stone-100 px-5 py-3">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            weight="bold"
          />
          <input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej: bisagra, corredera, jalador…"
            className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-300 focus:bg-white focus:ring-2 focus:ring-stone-100 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {cargando && (
          <div className="flex items-center justify-center py-12 gap-2 text-stone-400 text-sm">
            <CircleNotch size={16} className="animate-spin" />
            Buscando…
          </div>
        )}
        {!cargando && error && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        )}
        {!cargando && !error && busqueda.trim().length < 2 && (
          <p className="py-10 text-center text-sm text-stone-400">
            Escribe al menos 2 letras para buscar.
          </p>
        )}
        {!cargando && !error && busqueda.trim().length >= 2 && accesorios.length === 0 && (
          <p className="py-10 text-center text-sm text-stone-400">
            Sin resultados para &ldquo;{busqueda}&rdquo;
          </p>
        )}
        {!cargando &&
          !error &&
          accesorios.map((a) => {
            const p = precio(a)
            const cant = getCantidad(a.id)
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg p-3.5 hover:bg-stone-50 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-stone-100 text-xs font-semibold text-stone-500">
                  {String(a.codigo).slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 leading-snug">{a.nombre}</p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {p ? formatCOP(p) : 'Sin precio'} · cód. {a.codigo}
                  </p>
                </div>
                {p && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center rounded-lg border border-stone-200 bg-white overflow-hidden">
                      <button
                        onClick={() => setCantidad(a.id, cant - 1)}
                        className="px-2 py-1.5 text-stone-400 hover:bg-stone-50 transition-colors"
                      >
                        <Minus size={12} weight="bold" />
                      </button>
                      <span className="w-7 text-center text-sm font-medium text-stone-700">
                        {cant}
                      </span>
                      <button
                        onClick={() => setCantidad(a.id, cant + 1)}
                        className="px-2 py-1.5 text-stone-400 hover:bg-stone-50 transition-colors"
                      >
                        <Plus size={12} weight="bold" />
                      </button>
                    </div>
                    <button
                      onClick={() => agregarHerraje(a, cant)}
                      className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
                    >
                      Agregar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
      </div>

      <div className="border-t border-stone-100 px-5 py-3">
        <p className="text-xs text-stone-400">
          {cargando
            ? 'Buscando…'
            : busqueda.trim().length < 2
              ? `Herrajes · modalidad ${modalidad}`
              : `${accesorios.length} herraje${accesorios.length !== 1 ? 's' : ''}`}
        </p>
      </div>
    </>
  )
}

// ─── Buscador principal ───────────────────────────────────────────────────────

export function BuscadorModulos() {
  const seleccionarModulo = useCarrito((s) => s.seleccionarModulo)
  const cerrarBuscador = useCarrito((s) => s.cerrarBuscador)
  const [tab, setTab] = useState<Tab>('modulos')

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={cerrarBuscador}
      />

      <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-aparecer">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <h2 className="text-base font-semibold text-stone-900">Agregar producto</h2>
          <button
            onClick={cerrarBuscador}
            className="tactil rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-stone-100 px-5 pt-3 pb-0">
          {(['modulos', 'herrajes'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'pb-3 px-1 text-sm font-medium border-b-2 transition-colors capitalize',
                tab === t
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-400 hover:text-stone-600',
              ].join(' ')}
            >
              {t === 'modulos' ? 'Módulos' : 'Herrajes'}
            </button>
          ))}
        </div>

        {tab === 'modulos' ? (
          <TabModulos onSeleccionar={seleccionarModulo} />
        ) : (
          <TabHerrajes />
        )}
      </div>
    </div>
  )
}
