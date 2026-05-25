'use client'

import { useEffect, useState } from 'react'
import { Plus, CircleNotch, CaretDown, CaretUp, Eye, EyeSlash } from '@phosphor-icons/react'
import {
  getTiposFachada,
  getSubcategoriasAdmin,
  getAcabadosAdmin,
  crearSubcategoria,
  crearAcabado,
  toggleSubcategoriaActivo,
  toggleAcabadoActivo,
} from '@/lib/firestore/catalogo'
import type { TipoFachada, Subcategoria, Acabado } from '@/lib/firebase/tipos-firestore'

const ETIQUETA_AJUSTE: Record<string, { label: string; clases: string }> = {
  ninguno:   { label: 'Sin ajuste', clases: 'bg-stone-100 text-stone-500' },
  descuento: { label: 'Descuento',  clases: 'bg-emerald-100 text-emerald-700' },
  recargo:   { label: 'Recargo',    clases: 'bg-amber-100 text-amber-700' },
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AcabadosPage() {
  const [tiposFachada, setTiposFachada] = useState<TipoFachada[]>([])
  const [tabActiva, setTabActiva] = useState<string>('')
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)

  useEffect(() => {
    getTiposFachada()
      .then((tf) => {
        setTiposFachada(tf)
        if (tf[0]) setTabActiva(tf[0].id)
      })
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    if (!tabActiva) return
    setSubcategorias([])
    getSubcategoriasAdmin(tabActiva).then(setSubcategorias)
  }, [tabActiva])

  function handleSubcatCreada(nueva: Subcategoria) {
    setSubcategorias((prev) =>
      [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    )
    setMostrarForm(false)
  }

  function handleToggleSubcat(id: string, activo: boolean) {
    setSubcategorias((prev) => prev.map((s) => (s.id === id ? { ...s, activo } : s)))
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-stone-400 text-sm">
        <CircleNotch size={18} className="animate-spin" />
        Cargando…
      </div>
    )
  }

  const tabFachada = tiposFachada.find((t) => t.id === tabActiva)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Subcategorías y acabados</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Define líneas de acabado (ej. Magenta) y sus colores disponibles.
          </p>
        </div>
      </div>

      {/* Tabs por tipo de fachada */}
      <div className="flex gap-1 border-b border-stone-200 mb-6 overflow-x-auto">
        {tiposFachada.map((tf) => (
          <button
            key={tf.id}
            onClick={() => { setTabActiva(tf.id); setMostrarForm(false) }}
            className={[
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              tabActiva === tf.id
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800',
            ].join(' ')}
          >
            {tf.nombre}
          </button>
        ))}
      </div>

      {/* Lista de subcategorías */}
      {tabFachada && (
        <div className="space-y-3">
          {subcategorias.length === 0 && (
            <div className="rounded-xl border border-dashed border-stone-200 py-10 text-center text-sm text-stone-400">
              Sin subcategorías para {tabFachada.nombre}
            </div>
          )}
          {subcategorias.map((s) => (
            <SubcategoriaCard
              key={s.id}
              subcat={s}
              onToggleActivo={handleToggleSubcat}
            />
          ))}

          {/* Formulario nueva subcategoría */}
          {mostrarForm ? (
            <FormNuevaSubcategoria
              tipoFachadaId={tabActiva}
              onCreada={handleSubcatCreada}
              onCancelar={() => setMostrarForm(false)}
            />
          ) : (
            <button
              onClick={() => setMostrarForm(true)}
              className="tactil flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-800 mt-2"
            >
              <Plus size={15} weight="bold" />
              Nueva subcategoría en {tabFachada.nombre}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tarjeta de subcategoría ──────────────────────────────────────────────────

function SubcategoriaCard({
  subcat,
  onToggleActivo,
}: {
  subcat: Subcategoria
  onToggleActivo: (id: string, activo: boolean) => void
}) {
  const [expandida, setExpandida] = useState(false)
  const [acabados, setAcabados] = useState<Acabado[]>([])
  const [cargandoAcabados, setCargandoAcabados] = useState(false)
  const [mostrarFormAcabado, setMostrarFormAcabado] = useState(false)
  const [toggling, setToggling] = useState(false)

  async function handleToggle() {
    if (!expandida && acabados.length === 0) {
      setCargandoAcabados(true)
      await getAcabadosAdmin(subcat.id).then(setAcabados).finally(() => setCargandoAcabados(false))
    }
    setExpandida((v) => !v)
  }

  async function handleToggleActivo(e: React.MouseEvent) {
    e.stopPropagation()
    setToggling(true)
    const nuevoActivo = !subcat.activo
    try {
      await toggleSubcategoriaActivo(subcat.id, nuevoActivo)
      onToggleActivo(subcat.id, nuevoActivo)
    } finally {
      setToggling(false)
    }
  }

  function handleAcabadoCreado(nuevo: Acabado) {
    setAcabados((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setMostrarFormAcabado(false)
  }

  function handleToggleAcabado(id: string, activo: boolean) {
    setAcabados((prev) => prev.map((a) => (a.id === id ? { ...a, activo } : a)))
  }

  const etiq = ETIQUETA_AJUSTE[subcat.tipo_ajuste]!

  return (
    <div className={['rounded-xl border bg-white overflow-hidden transition-opacity', !subcat.activo && 'opacity-60'].filter(Boolean).join(' ')}
      style={{ borderColor: subcat.activo ? '#e7e5e4' : '#d6d3d1' }}>
      {/* Cabecera */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button onClick={handleToggle} className="flex-1 flex items-center gap-3 text-left min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-stone-900">{subcat.nombre}</span>
              <span className={['rounded-full px-2 py-0.5 text-xs font-semibold', etiq.clases].join(' ')}>
                {etiq.label}
                {subcat.tipo_ajuste !== 'ninguno' && ` ${subcat.ajuste_pct}%`}
              </span>
              {subcat.es_premium && (
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-stone-900 text-white">
                  Premium
                </span>
              )}
              {!subcat.activo && (
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-600">
                  Inactiva
                </span>
              )}
            </div>
          </div>
          <div className="ml-auto shrink-0">
            {expandida ? (
              <CaretUp size={14} className="text-stone-400" weight="bold" />
            ) : (
              <CaretDown size={14} className="text-stone-400" weight="bold" />
            )}
          </div>
        </button>
        <button
          onClick={handleToggleActivo}
          disabled={toggling}
          title={subcat.activo ? 'Desactivar' : 'Activar'}
          className="tactil shrink-0 rounded-md p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-50 transition-colors"
        >
          {toggling ? (
            <CircleNotch size={14} className="animate-spin" />
          ) : subcat.activo ? (
            <Eye size={14} weight="bold" />
          ) : (
            <EyeSlash size={14} weight="bold" />
          )}
        </button>
      </div>

      {/* Acabados expandidos */}
      {expandida && (
        <div className="border-t border-stone-100 px-4 py-4 bg-stone-50">
          {cargandoAcabados ? (
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <CircleNotch size={13} className="animate-spin" />
              Cargando colores…
            </div>
          ) : (
            <>
              {acabados.length === 0 && !mostrarFormAcabado && (
                <p className="text-xs text-stone-400 mb-3">Sin colores / acabados definidos.</p>
              )}
              <div className="space-y-1 mb-3">
                {acabados.map((a) => (
                  <AcabadoRow
                    key={a.id}
                    acabado={a}
                    onToggleActivo={handleToggleAcabado}
                  />
                ))}
              </div>
              {mostrarFormAcabado ? (
                <FormNuevoAcabado
                  subcategoriaId={subcat.id}
                  tipoFachadaId={subcat.tipo_fachada_id}
                  onCreado={handleAcabadoCreado}
                  onCancelar={() => setMostrarFormAcabado(false)}
                />
              ) : (
                <button
                  onClick={() => setMostrarFormAcabado(true)}
                  className="tactil flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800"
                >
                  <Plus size={12} weight="bold" />
                  Agregar color / acabado
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Fila de acabado ──────────────────────────────────────────────────────────

function AcabadoRow({
  acabado,
  onToggleActivo,
}: {
  acabado: Acabado
  onToggleActivo: (id: string, activo: boolean) => void
}) {
  const [toggling, setToggling] = useState(false)

  async function handleToggle() {
    setToggling(true)
    const nuevo = !acabado.activo
    try {
      await toggleAcabadoActivo(acabado.id, nuevo)
      onToggleActivo(acabado.id, nuevo)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className={['flex items-center justify-between rounded-lg px-3 py-2 bg-white border border-stone-200', !acabado.activo && 'opacity-50'].filter(Boolean).join(' ')}>
      <span className="text-xs text-stone-700 font-medium">{acabado.nombre}</span>
      <button
        onClick={handleToggle}
        disabled={toggling}
        title={acabado.activo ? 'Desactivar' : 'Activar'}
        className="tactil rounded p-1 text-stone-400 hover:text-stone-700 disabled:opacity-50 transition-colors"
      >
        {toggling ? (
          <CircleNotch size={12} className="animate-spin" />
        ) : acabado.activo ? (
          <Eye size={12} weight="bold" />
        ) : (
          <EyeSlash size={12} weight="bold" />
        )}
      </button>
    </div>
  )
}

// ─── Formulario nueva subcategoría ───────────────────────────────────────────

function FormNuevaSubcategoria({
  tipoFachadaId,
  onCreada,
  onCancelar,
}: {
  tipoFachadaId: string
  onCreada: (s: Subcategoria) => void
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [tipoAjuste, setTipoAjuste] = useState<'ninguno' | 'descuento' | 'recargo'>('ninguno')
  const [ajustePct, setAjustePct] = useState(0)
  const [esPremium, setEsPremium] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGuardar() {
    const nom = nombre.trim()
    if (!nom) { setError('El nombre es obligatorio.'); return }
    setGuardando(true)
    setError(null)
    try {
      const nueva = await crearSubcategoria({
        tipo_fachada_id: tipoFachadaId,
        nombre: nom,
        tipo_ajuste: tipoAjuste,
        ajuste_pct: tipoAjuste === 'ninguno' ? 0 : ajustePct,
        es_premium: esPremium,
      })
      onCreada(nueva)
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-xl border border-stone-300 bg-white px-4 py-4 space-y-3">
      <p className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Nueva subcategoría</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-stone-500 mb-1">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleGuardar(); if (e.key === 'Escape') onCancelar() }}
            placeholder="ej. Magenta"
            autoFocus
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Tipo de ajuste</label>
          <select
            value={tipoAjuste}
            onChange={(e) => setTipoAjuste(e.target.value as typeof tipoAjuste)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500 bg-white"
          >
            <option value="ninguno">Sin ajuste</option>
            <option value="descuento">Descuento</option>
            <option value="recargo">Recargo</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Porcentaje de ajuste</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={tipoAjuste === 'ninguno' ? 0 : ajustePct}
            onChange={(e) => setAjustePct(parseFloat(e.target.value) || 0)}
            disabled={tipoAjuste === 'ninguno'}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500 disabled:bg-stone-50 disabled:text-stone-400"
          />
        </div>
        <div className="flex items-end pb-1.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={esPremium}
              onChange={(e) => setEsPremium(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 accent-stone-900"
            />
            <span className="text-sm text-stone-700">
              Línea premium
              <span className="ml-1 text-xs text-stone-400">(usa descuento premium por categoría)</span>
            </span>
          </label>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="tactil flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50 transition-colors"
        >
          {guardando && <CircleNotch size={13} className="animate-spin" />}
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          onClick={onCancelar}
          className="tactil rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Formulario nuevo acabado ─────────────────────────────────────────────────

function FormNuevoAcabado({
  subcategoriaId,
  tipoFachadaId,
  onCreado,
  onCancelar,
}: {
  subcategoriaId: string
  tipoFachadaId: string
  onCreado: (a: Acabado) => void
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGuardar() {
    const nom = nombre.trim()
    if (!nom) { setError('El nombre es obligatorio.'); return }
    setGuardando(true)
    setError(null)
    try {
      const nuevo = await crearAcabado({ subcategoria_id: subcategoriaId, tipo_fachada_id: tipoFachadaId, nombre: nom })
      onCreado(nuevo)
    } catch {
      setError('No se pudo guardar.')
      setGuardando(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mt-1">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleGuardar(); if (e.key === 'Escape') onCancelar() }}
        placeholder="ej. Blanco Brillo"
        autoFocus
        className="rounded-md border border-stone-300 px-2 py-1.5 text-xs outline-none focus:border-stone-500 w-44"
      />
      <button
        onClick={handleGuardar}
        disabled={guardando}
        className="tactil flex items-center gap-1 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {guardando ? <CircleNotch size={12} className="animate-spin" /> : null}
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
      <button
        onClick={onCancelar}
        className="tactil rounded-md border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-50"
      >
        Cancelar
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
