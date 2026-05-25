'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Check,
  X,
  CircleNotch,
  Rocket,
  PencilSimple,
  CheckSquare,
  Square,
} from '@phosphor-icons/react'
import {
  getCategoriasMacroAdmin,
  getCategoriasAdmin,
  crearCategoriaMacro,
  actualizarCategoriaMacro,
  eliminarCategoriaMacro,
  crearCategoria,
  actualizarCategoria,
  sembrarCategoriasMacro,
} from '@/lib/firestore/catalogo'
import type { CategoriaMacro, Categoria } from '@/lib/firebase/tipos-firestore'

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CategoriasAdminPage() {
  const [macros, setMacros] = useState<CategoriaMacro[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [sembrando, setSembrando] = useState(false)
  const [msgSiembra, setMsgSiembra] = useState<string | null>(null)

  async function cargar() {
    setErrorCarga(null)
    try {
      const [ms, cs] = await Promise.all([getCategoriasMacroAdmin(), getCategoriasAdmin()])
      setMacros(ms)
      setCategorias(cs)
    } catch (e) {
      setErrorCarga(`Error al cargar datos: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  useEffect(() => {
    cargar().finally(() => setCargando(false))
  }, [])

  async function handleSembrar() {
    setSembrando(true)
    setMsgSiembra(null)
    try {
      const { macrosCreadas, categoriasActualizadas, noEncontradas } = await sembrarCategoriasMacro()
      const base = `✓ ${macrosCreadas} macros · ${categoriasActualizadas} categorías actualizadas`
      const extra = noEncontradas.length > 0
        ? ` · No encontradas: ${noEncontradas.join(', ')}`
        : ''
      setMsgSiembra(base + extra)
      await cargar()
    } catch {
      setMsgSiembra('Error al sembrar datos. Revisa la consola.')
    } finally {
      setSembrando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-stone-400 text-sm">
        <CircleNotch size={18} className="animate-spin" />
        Cargando categorías…
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Categorías</h1>
          <p className="mt-1 text-sm text-stone-400">
            Categorías macro (lo que ve el distribuidor) y categorías de lista de precios.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSembrar}
          disabled={sembrando}
          className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50 transition-colors"
        >
          {sembrando ? <CircleNotch size={14} className="animate-spin" /> : <Rocket size={14} weight="bold" />}
          Sembrar datos iniciales
        </button>
      </div>

      {errorCarga && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorCarga}
        </div>
      )}

      {msgSiembra && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {msgSiembra}
        </div>
      )}

      {/* Sección macros */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-widest">
            Categorías macro
          </h2>
          <NuevaMacroInline onCreada={(m) => setMacros((prev) => [...prev, m].sort((a, b) => a.orden - b.orden))} />
        </div>
        <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white overflow-hidden">
          {macros.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-stone-400">
              Sin categorías macro. Usa "Sembrar datos iniciales" o crea una manualmente.
            </p>
          ) : (
            macros.map((m) => (
              <MacroFila
                key={m.id}
                macro={m}
                onActualizada={(updated) =>
                  setMacros((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
                }
                onEliminada={(id) =>
                  setMacros((prev) => prev.filter((x) => x.id !== id))
                }
              />
            ))
          )}
        </div>
      </section>

      {/* Sección categorías de lista */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-widest">
            Categorías de lista de precios
          </h2>
          <NuevaCategoriaInline
            macros={macros}
            onCreada={(c) => setCategorias((prev) => [...prev, c].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))}
          />
        </div>
        <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white overflow-hidden">
          {categorias.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-stone-400">
              Sin categorías. Importa el catálogo o crea una manualmente.
            </p>
          ) : (
            categorias.map((c) => (
              <CategoriaFila
                key={c.id}
                categoria={c}
                macros={macros}
                onActualizada={(updated) =>
                  setCategorias((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
                }
              />
            ))
          )}
        </div>
      </section>
    </div>
  )
}

// ─── Fila de macro ────────────────────────────────────────────────────────────

function MacroFila({
  macro,
  onActualizada,
  onEliminada,
}: {
  macro: CategoriaMacro
  onActualizada: (m: CategoriaMacro) => void
  onEliminada: (id: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState(macro.nombre)
  const [orden, setOrden] = useState(String(macro.orden))
  const [mostrarTodas, setMostrarTodas] = useState(macro.mostrar_todas)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  async function guardar() {
    setGuardando(true)
    try {
      const data = { nombre: nombre.trim(), orden: Number(orden), mostrar_todas: mostrarTodas }
      await actualizarCategoriaMacro(macro.id, data)
      onActualizada({ ...macro, ...data })
      setEditando(false)
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo() {
    await actualizarCategoriaMacro(macro.id, { activo: !macro.activo })
    onActualizada({ ...macro, activo: !macro.activo })
  }

  async function handleEliminar() {
    if (!confirm(`¿Eliminar la macro "${macro.nombre}"? Esta acción no se puede deshacer.`)) return
    setEliminando(true)
    try {
      await eliminarCategoriaMacro(macro.id)
      onEliminada(macro.id)
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="flex items-center gap-4 px-5 py-3">
      <span className="w-6 text-center text-xs font-mono text-stone-400">{macro.orden}</span>

      {editando ? (
        <>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="flex-1 rounded-md border border-stone-300 px-2.5 py-1 text-sm outline-none focus:border-stone-500"
            autoFocus
          />
          <input
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            type="number"
            className="w-16 rounded-md border border-stone-300 px-2 py-1 text-sm outline-none focus:border-stone-500 text-center"
          />
          <label className="flex items-center gap-1.5 text-xs text-stone-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mostrarTodas}
              onChange={(e) => setMostrarTodas(e.target.checked)}
              className="rounded"
            />
            Mostrar todas
          </label>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={guardar}
              disabled={guardando}
              className="rounded-md bg-stone-900 p-1.5 text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {guardando ? <CircleNotch size={13} className="animate-spin" /> : <Check size={13} weight="bold" />}
            </button>
            <button
              onClick={() => { setEditando(false); setNombre(macro.nombre); setOrden(String(macro.orden)) }}
              className="rounded-md border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50"
            >
              <X size={13} weight="bold" />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={['flex-1 text-sm font-medium', macro.activo ? 'text-stone-800' : 'text-stone-400 line-through'].join(' ')}>
            {macro.nombre}
          </p>
          {macro.mostrar_todas && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
              Muestra todo
            </span>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setEditando(true)}
              className="rounded-md border border-stone-200 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <PencilSimple size={13} weight="bold" />
            </button>
            <button
              onClick={toggleActivo}
              className={[
                'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                macro.activo
                  ? 'border-stone-200 text-stone-500 hover:bg-stone-50'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
              ].join(' ')}
            >
              {macro.activo ? 'Desactivar' : 'Activar'}
            </button>
            <button
              onClick={handleEliminar}
              disabled={eliminando}
              className="rounded-md border border-red-200 p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
              title="Eliminar macro"
            >
              {eliminando ? <CircleNotch size={13} className="animate-spin" /> : <X size={13} weight="bold" />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Fila de categoría de lista ───────────────────────────────────────────────

function CategoriaFila({
  categoria,
  macros,
  onActualizada,
}: {
  categoria: Categoria
  macros: CategoriaMacro[]
  onActualizada: (c: Categoria) => void
}) {
  const [editando, setEditando] = useState(false)
  const [macroIds, setMacroIds] = useState<string[]>(categoria.categorias_macro_ids ?? [])
  const [mostrarEnTodas, setMostrarEnTodas] = useState(categoria.mostrar_en_todas ?? false)
  const [guardando, setGuardando] = useState(false)

  function toggleMacro(id: string) {
    setMacroIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function guardar() {
    setGuardando(true)
    try {
      const data = { categorias_macro_ids: macroIds, mostrar_en_todas: mostrarEnTodas }
      await actualizarCategoria(categoria.id, data)
      onActualizada({ ...categoria, ...data })
      setEditando(false)
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo() {
    await actualizarCategoria(categoria.id, { activo: !categoria.activo })
    onActualizada({ ...categoria, activo: !categoria.activo })
  }

  const macrosAsignadas = macros.filter((m) => (categoria.categorias_macro_ids ?? []).includes(m.id))

  return (
    <div className="px-5 py-3">
      {editando ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-stone-800">{categoria.nombre}</p>
            <div className="flex items-center gap-1">
              <button
                onClick={guardar}
                disabled={guardando}
                className="rounded-md bg-stone-900 p-1.5 text-white hover:bg-stone-700 disabled:opacity-50"
              >
                {guardando ? <CircleNotch size={13} className="animate-spin" /> : <Check size={13} weight="bold" />}
              </button>
              <button
                onClick={() => { setEditando(false); setMacroIds(categoria.categorias_macro_ids ?? []); setMostrarEnTodas(categoria.mostrar_en_todas ?? false) }}
                className="rounded-md border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50"
              >
                <X size={13} weight="bold" />
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mostrarEnTodas}
              onChange={(e) => setMostrarEnTodas(e.target.checked)}
              className="rounded"
            />
            Mostrar en todas las macros (como ACABADOS X M2)
          </label>

          <div className="flex flex-wrap gap-2">
            {macros.map((m) => {
              const sel = macroIds.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMacro(m.id)}
                  className={[
                    'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                    sel
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300',
                  ].join(' ')}
                >
                  {sel ? <CheckSquare size={12} weight="fill" /> : <Square size={12} />}
                  {m.nombre}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className={['text-sm font-medium', categoria.activo ? 'text-stone-800' : 'text-stone-400 line-through'].join(' ')}>
              {categoria.nombre}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {categoria.mostrar_en_todas ? (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 font-medium">
                  Todas las macros
                </span>
              ) : macrosAsignadas.length === 0 ? (
                <span className="text-xs text-stone-400">Sin macro asignada</span>
              ) : (
                macrosAsignadas.map((m) => (
                  <span key={m.id} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                    {m.nombre}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditando(true)}
              className="rounded-md border border-stone-200 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <PencilSimple size={13} weight="bold" />
            </button>
            <button
              onClick={toggleActivo}
              className={[
                'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                categoria.activo
                  ? 'border-stone-200 text-stone-500 hover:bg-stone-50'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700',
              ].join(' ')}
            >
              {categoria.activo ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Formulario inline nueva macro ───────────────────────────────────────────

function NuevaMacroInline({ onCreada }: { onCreada: (m: CategoriaMacro) => void }) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [orden, setOrden] = useState('')
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const [guardando, setGuardando] = useState(false)

  async function handleCrear() {
    if (!nombre.trim() || !orden) return
    setGuardando(true)
    try {
      const nueva = await crearCategoriaMacro({
        nombre: nombre.trim(),
        orden: Number(orden),
        mostrar_todas: mostrarTodas,
      })
      onCreada(nueva)
      setNombre('')
      setOrden('')
      setMostrarTodas(false)
      setAbierto(false)
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
      >
        <Plus size={11} weight="bold" />
        Nueva macro
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre"
        autoFocus
        className="rounded-md border border-stone-300 px-2.5 py-1 text-sm outline-none focus:border-stone-500 w-40"
      />
      <input
        value={orden}
        onChange={(e) => setOrden(e.target.value)}
        placeholder="Orden"
        type="number"
        className="w-16 rounded-md border border-stone-300 px-2 py-1 text-sm outline-none focus:border-stone-500 text-center"
      />
      <label className="flex items-center gap-1.5 text-xs text-stone-500 cursor-pointer">
        <input type="checkbox" checked={mostrarTodas} onChange={(e) => setMostrarTodas(e.target.checked)} className="rounded" />
        Mostrar todas
      </label>
      <button
        onClick={handleCrear}
        disabled={guardando || !nombre.trim() || !orden}
        className="rounded-md bg-stone-900 p-1.5 text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {guardando ? <CircleNotch size={13} className="animate-spin" /> : <Check size={13} weight="bold" />}
      </button>
      <button
        onClick={() => setAbierto(false)}
        className="rounded-md border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50"
      >
        <X size={13} weight="bold" />
      </button>
    </div>
  )
}

// ─── Formulario inline nueva categoría de lista ───────────────────────────────

function NuevaCategoriaInline({
  macros,
  onCreada,
}: {
  macros: CategoriaMacro[]
  onCreada: (c: Categoria) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [macroIds, setMacroIds] = useState<string[]>([])
  const [mostrarEnTodas, setMostrarEnTodas] = useState(false)
  const [guardando, setGuardando] = useState(false)

  function toggleMacro(id: string) {
    setMacroIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function handleCrear() {
    if (!nombre.trim()) return
    setGuardando(true)
    try {
      const nueva = await crearCategoria({
        nombre: nombre.trim().toUpperCase(),
        desc_desarmado_base_pct: 0,
        desc_desarmado_premium_pct: 0,
        orden: 99,
        categorias_macro_ids: macroIds,
        mostrar_en_todas: mostrarEnTodas,
      })
      onCreada(nueva)
      setNombre('')
      setMacroIds([])
      setMostrarEnTodas(false)
      setAbierto(false)
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
      >
        <Plus size={11} weight="bold" />
        Nueva categoría
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre (ej. VESTIER)"
          autoFocus
          className="rounded-md border border-stone-300 px-2.5 py-1 text-sm outline-none focus:border-stone-500 w-48"
        />
        <label className="flex items-center gap-1.5 text-xs text-stone-500 cursor-pointer">
          <input type="checkbox" checked={mostrarEnTodas} onChange={(e) => setMostrarEnTodas(e.target.checked)} className="rounded" />
          Todas las macros
        </label>
        <button
          onClick={handleCrear}
          disabled={guardando || !nombre.trim()}
          className="rounded-md bg-stone-900 p-1.5 text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {guardando ? <CircleNotch size={13} className="animate-spin" /> : <Check size={13} weight="bold" />}
        </button>
        <button
          onClick={() => setAbierto(false)}
          className="rounded-md border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50"
        >
          <X size={13} weight="bold" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 justify-end">
        {macros.map((m) => {
          const sel = macroIds.includes(m.id)
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleMacro(m.id)}
              className={[
                'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all',
                sel ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-500 hover:border-stone-300',
              ].join(' ')}
            >
              {m.nombre}
            </button>
          )
        })}
      </div>
    </div>
  )
}
