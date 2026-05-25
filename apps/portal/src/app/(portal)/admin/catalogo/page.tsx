'use client'

import { useEffect, useState, useMemo } from 'react'
import { CaretRight, MagnifyingGlass, CircleNotch, WarningCircle } from '@phosphor-icons/react'
import { getCategoriasMacroAdmin, getCategoriasAdmin } from '@/lib/firestore/catalogo'
import { getModulosTodos } from '@/lib/firestore/modulos'
import type { CategoriaMacro, Categoria, Modulo } from '@/lib/firebase/tipos-firestore'

function normalizar(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// ─── Miniatura de imagen ──────────────────────────────────────────────────────

function Miniatura({ url, nombre }: { url: string | null; nombre: string }) {
  const [error, setError] = useState(false)
  if (url && !error) {
    return (
      <img
        src={url}
        alt={nombre}
        onError={() => setError(true)}
        className="h-8 w-8 rounded object-cover shrink-0 border border-stone-100"
      />
    )
  }
  return (
    <div className="h-8 w-8 rounded bg-stone-100 shrink-0 flex items-center justify-center text-[10px] font-bold text-stone-400 border border-stone-100">
      {nombre.slice(0, 2).toUpperCase()}
    </div>
  )
}

// ─── Fila de módulo ───────────────────────────────────────────────────────────

function FilaModulo({ modulo }: { modulo: Modulo }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-stone-50 transition-colors">
      <Miniatura url={modulo.imagen_url} nombre={modulo.nombre} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-800 truncate">{modulo.nombre}</p>
        <p className="text-xs text-stone-400 capitalize">{modulo.tipologia}</p>
      </div>
      {modulo.imagen_url && (
        <span className="text-[10px] text-emerald-500 font-medium shrink-0">foto</span>
      )}
    </div>
  )
}

// ─── Sección de categoría de lista ───────────────────────────────────────────

function SeccionCategoria({
  categoria,
  modulos,
  busquedaNorm,
}: {
  categoria: Categoria
  modulos: Modulo[]
  busquedaNorm: string
}) {
  const [abierto, setAbierto] = useState(false)

  const modulosFiltrados = useMemo(() => {
    if (!busquedaNorm) return modulos
    return modulos.filter((m) => normalizar(m.nombre).includes(busquedaNorm))
  }, [modulos, busquedaNorm])

  // Auto-expandir si hay búsqueda activa y hay resultados
  const mostrarAbierto = busquedaNorm ? modulosFiltrados.length > 0 : abierto

  // Dedup por nombre para la vista
  const modulosUnicos = useMemo(() => {
    const vistos = new Set<string>()
    return modulosFiltrados.filter((m) => {
      if (vistos.has(m.nombre)) return false
      vistos.add(m.nombre)
      return true
    })
  }, [modulosFiltrados])

  const sinModulos = modulos.length === 0

  return (
    <div className={sinModulos ? 'opacity-50' : ''}>
      <button
        onClick={() => !busquedaNorm && setAbierto((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-stone-50 transition-colors text-left"
      >
        <CaretRight
          size={12}
          weight="bold"
          className={['text-stone-400 transition-transform shrink-0', mostrarAbierto ? 'rotate-90' : ''].join(' ')}
        />
        <span className="flex-1 text-sm text-stone-700 min-w-0 truncate">{categoria.nombre}</span>
        <span className={[
          'text-xs font-medium shrink-0 tabular-nums',
          sinModulos ? 'text-red-400' : 'text-stone-400',
        ].join(' ')}>
          {modulos.length}
          {sinModulos && <WarningCircle size={12} weight="fill" className="inline ml-1" />}
        </span>
      </button>

      {mostrarAbierto && modulosUnicos.length > 0 && (
        <div className="border-t border-stone-100">
          {modulosUnicos.map((m) => (
            <FilaModulo key={m.id} modulo={m} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sección de macro ─────────────────────────────────────────────────────────

function SeccionMacro({
  macro,
  categorias,
  modulosPorCategoria,
  busquedaNorm,
}: {
  macro: CategoriaMacro | null
  categorias: Categoria[]
  modulosPorCategoria: Map<string, Modulo[]>
  busquedaNorm: string
}) {
  const [abierto, setAbierto] = useState(false)

  const totalModulos = categorias.reduce(
    (sum, c) => sum + (modulosPorCategoria.get(c.id)?.length ?? 0),
    0,
  )

  const hayResultados = busquedaNorm
    ? categorias.some((c) =>
        (modulosPorCategoria.get(c.id) ?? []).some((m) =>
          normalizar(m.nombre).includes(busquedaNorm),
        ),
      )
    : true

  if (busquedaNorm && !hayResultados) return null

  const mostrarAbierto = busquedaNorm || abierto

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-stone-50 transition-colors text-left"
      >
        <CaretRight
          size={14}
          weight="bold"
          className={['text-stone-500 transition-transform shrink-0', mostrarAbierto ? 'rotate-90' : ''].join(' ')}
        />
        <span className="flex-1 text-sm font-semibold text-stone-800">
          {macro ? macro.nombre : 'Sin macro asignada'}
        </span>
        {macro?.mostrar_todas && (
          <span className="text-xs text-blue-500 font-medium shrink-0">Muestra todo</span>
        )}
        <span className="text-xs text-stone-400 tabular-nums shrink-0">
          {categorias.length} cat · {totalModulos} mód
        </span>
      </button>

      {mostrarAbierto && (
        <div className="divide-y divide-stone-100 border-t border-stone-100">
          {categorias.map((c) => (
            <SeccionCategoria
              key={c.id}
              categoria={c}
              modulos={modulosPorCategoria.get(c.id) ?? []}
              busquedaNorm={busquedaNorm}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CatalogoAdminPage() {
  const [macros, setMacros] = useState<CategoriaMacro[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    Promise.all([getCategoriasMacroAdmin(), getCategoriasAdmin(), getModulosTodos()])
      .then(([ms, cs, mods]) => {
        setMacros(ms)
        setCategorias(cs)
        setModulos(mods)
      })
      .finally(() => setCargando(false))
  }, [])

  const modulosPorCategoria = useMemo(() => {
    const map = new Map<string, Modulo[]>()
    for (const m of modulos) {
      const list = map.get(m.categoria_id) ?? []
      list.push(m)
      map.set(m.categoria_id, list)
    }
    return map
  }, [modulos])

  const categoriasPorMacro = useMemo(() => {
    const map = new Map<string, Categoria[]>()
    for (const c of categorias) {
      if (c.mostrar_en_todas) continue
      for (const macroId of c.categorias_macro_ids ?? []) {
        const list = map.get(macroId) ?? []
        list.push(c)
        map.set(macroId, list)
      }
    }
    return map
  }, [categorias])

  const categoriasEnTodas = useMemo(
    () => categorias.filter((c) => c.mostrar_en_todas),
    [categorias],
  )

  const categoriasHuerfanas = useMemo(
    () =>
      categorias.filter(
        (c) => !c.mostrar_en_todas && (c.categorias_macro_ids ?? []).length === 0,
      ),
    [categorias],
  )

  const busquedaNorm = normalizar(busqueda.trim())

  const totalConFoto = modulos.filter((m) => m.imagen_url).length

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-stone-400 text-sm">
        <CircleNotch size={18} className="animate-spin" />
        Cargando catálogo…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Catálogo</h1>
          <p className="mt-1 text-sm text-stone-400">
            {modulos.length} módulos activos · {totalConFoto} con foto ·{' '}
            {categorias.length} categorías
          </p>
        </div>
        <div className="relative w-64">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar módulo…"
            className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
          />
        </div>
      </div>

      {/* Macros con sus categorías */}
      {macros.map((macro) => (
        <SeccionMacro
          key={macro.id}
          macro={macro}
          categorias={categoriasPorMacro.get(macro.id) ?? []}
          modulosPorCategoria={modulosPorCategoria}
          busquedaNorm={busquedaNorm}
        />
      ))}

      {/* Categorías "mostrar en todas" */}
      {categoriasEnTodas.length > 0 && (
        <SeccionMacro
          macro={null}
          categorias={categoriasEnTodas}
          modulosPorCategoria={modulosPorCategoria}
          busquedaNorm={busquedaNorm}
        />
      )}

      {/* Categorías sin macro asignada */}
      {categoriasHuerfanas.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-red-200">
            <WarningCircle size={16} weight="fill" className="text-red-400 shrink-0" />
            <span className="text-sm font-semibold text-red-700">Sin macro asignada</span>
            <span className="text-xs text-red-400 ml-auto">
              {categoriasHuerfanas.length} categoría{categoriasHuerfanas.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-red-100">
            {categoriasHuerfanas.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-2.5">
                <p className="text-sm text-red-700">{c.nombre}</p>
                <span className="text-xs text-red-400 tabular-nums">
                  {modulosPorCategoria.get(c.id)?.length ?? 0} módulos
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
