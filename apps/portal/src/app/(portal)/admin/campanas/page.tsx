'use client'

import { useEffect, useState } from 'react'
import { Plus, CircleNotch, Eye, EyeSlash } from '@phosphor-icons/react'
import { getCampanas, crearCampana, toggleCampanaActiva } from '@/lib/firestore/campanas'
import { getDistribuidores } from '@/lib/firestore/distribuidores'
import { getCategorias, getAllSubcategoriasAdmin } from '@/lib/firestore/catalogo'
import { useAuth } from '@/components/providers/auth-provider'
import type { CampanaFirestore } from '@/lib/firebase/tipos-firestore'
import type { Distribuidor, Categoria, Subcategoria } from '@/lib/firebase/tipos-firestore'

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function formatFecha(ts: number) {
  return new Date(ts).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function estadoCampana(c: CampanaFirestore): { label: string; clases: string } {
  if (!c.activa) return { label: 'Inactiva', clases: 'bg-stone-100 text-stone-400' }
  const ahora = Date.now()
  if (ahora < c.fecha_desde) return { label: 'Programada', clases: 'bg-blue-100 text-blue-700' }
  if (ahora > c.fecha_hasta) return { label: 'Vencida', clases: 'bg-red-100 text-red-500' }
  return { label: 'Vigente', clases: 'bg-emerald-100 text-emerald-700' }
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CampanasPage() {
  const { usuario } = useAuth()
  const [campanas, setCampanas] = useState<CampanaFirestore[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)

  // Datos para el formulario
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([])

  useEffect(() => {
    Promise.all([
      getCampanas(),
      getDistribuidores(),
      getCategorias(),
      getAllSubcategoriasAdmin(),
    ]).then(([camps, dists, cats, subs]) => {
      setCampanas(camps)
      setDistribuidores(dists)
      setCategorias(cats)
      setSubcategorias(subs)
    }).finally(() => setCargando(false))
  }, [])

  function handleCreada(nueva: CampanaFirestore) {
    setCampanas((prev) => [nueva, ...prev])
    setMostrarForm(false)
  }

  function handleToggle(id: string, activa: boolean) {
    setCampanas((prev) => prev.map((c) => (c.id === id ? { ...c, activa } : c)))
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-stone-400 text-sm">
        <CircleNotch size={18} className="animate-spin" />
        Cargando…
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Campañas de descuento</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Descuentos temporales por distribuidor, categoría o línea de acabado.
          </p>
        </div>
        {!mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            className="tactil flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 transition-colors"
          >
            <Plus size={14} weight="bold" />
            Nueva campaña
          </button>
        )}
      </div>

      {mostrarForm && (
        <FormNuevaCampana
          distribuidores={distribuidores}
          categorias={categorias}
          subcategorias={subcategorias}
          creado_por={usuario?.uid ?? ''}
          onCreada={handleCreada}
          onCancelar={() => setMostrarForm(false)}
        />
      )}

      {/* Lista */}
      {campanas.length === 0 && !mostrarForm ? (
        <div className="rounded-xl border border-dashed border-stone-200 py-16 text-center text-sm text-stone-400">
          Sin campañas creadas
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {campanas.map((c) => (
            <CampanaCard key={c.id} campana={c} distribuidores={distribuidores} onToggle={handleToggle} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tarjeta de campaña ───────────────────────────────────────────────────────

function CampanaCard({
  campana: c,
  distribuidores,
  onToggle,
}: {
  campana: CampanaFirestore
  distribuidores: Distribuidor[]
  onToggle: (id: string, activa: boolean) => void
}) {
  const [toggling, setToggling] = useState(false)
  const estado = estadoCampana(c)

  const distNombres = c.segmentacion.distribuidores
    ?.map((id) => distribuidores.find((d) => d.id === id)?.nombre ?? id)
    .join(', ') ?? null

  async function handleToggle() {
    setToggling(true)
    const nuevo = !c.activa
    try {
      await toggleCampanaActiva(c.id, nuevo)
      onToggle(c.id, nuevo)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className={['rounded-xl border bg-white px-5 py-4 transition-opacity', !c.activa && 'opacity-60'].filter(Boolean).join(' ')}
      style={{ borderColor: c.activa ? '#e7e5e4' : '#d6d3d1' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-stone-900">{c.nombre}</span>
            <span className={['rounded-full px-2 py-0.5 text-xs font-semibold', estado.clases].join(' ')}>
              {estado.label}
            </span>
            <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-xs font-semibold">
              −{c.descuento_pct}%
            </span>
            <span className={['rounded-full px-2 py-0.5 text-xs font-semibold',
              c.segmentacion.tipo === 'global'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600',
            ].join(' ')}>
              {c.segmentacion.tipo === 'global' ? 'Global' : 'Segmentada'}
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            {formatFecha(c.fecha_desde)} → {formatFecha(c.fecha_hasta)}
          </p>
          {c.segmentacion.tipo === 'segmentada' && distNombres && (
            <p className="text-xs text-stone-400 mt-0.5">
              Distribuidores: <span className="text-stone-600">{distNombres}</span>
            </p>
          )}
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          title={c.activa ? 'Desactivar' : 'Activar'}
          className="tactil shrink-0 rounded-md p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-50 transition-colors"
        >
          {toggling ? (
            <CircleNotch size={15} className="animate-spin" />
          ) : c.activa ? (
            <Eye size={15} weight="bold" />
          ) : (
            <EyeSlash size={15} weight="bold" />
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Formulario nueva campaña ─────────────────────────────────────────────────

function FormNuevaCampana({
  distribuidores,
  categorias,
  subcategorias,
  creado_por,
  onCreada,
  onCancelar,
}: {
  distribuidores: Distribuidor[]
  categorias: Categoria[]
  subcategorias: Subcategoria[]
  creado_por: string
  onCreada: (c: CampanaFirestore) => void
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [descuentoPct, setDescuentoPct] = useState(10)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [tipo, setTipo] = useState<'global' | 'segmentada'>('segmentada')
  const [distSel, setDistSel] = useState<Set<string>>(new Set())
  const [catSel, setCatSel] = useState<Set<string>>(new Set())
  const [subSel, setSubSel] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleSet<T>(set: Set<T>, val: T): Set<T> {
    const next = new Set(set)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    return next
  }

  async function handleGuardar() {
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (!fechaDesde || !fechaHasta) { setError('Las fechas son obligatorias.'); return }
    if (fechaDesde > fechaHasta) { setError('La fecha de inicio debe ser anterior al fin.'); return }
    if (tipo === 'segmentada' && distSel.size === 0) {
      setError('Selecciona al menos un distribuidor para una campaña segmentada.')
      return
    }

    setGuardando(true)
    setError(null)
    try {
      const nueva = await crearCampana({
        nombre: nombre.trim(),
        descuento_pct: descuentoPct,
        fecha_desde: new Date(fechaDesde + 'T00:00:00').getTime(),
        fecha_hasta: new Date(fechaHasta + 'T23:59:59').getTime(),
        segmentacion: {
          tipo,
          distribuidores: tipo === 'global' ? null : Array.from(distSel),
          categorias: catSel.size > 0 ? Array.from(catSel) : null,
          lineas_acabado: subSel.size > 0 ? Array.from(subSel) : null,
        },
        activa: true,
        creado_por,
      })
      onCreada(nueva)
    } catch {
      setError('No se pudo guardar la campaña. Intenta de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-xl border border-stone-300 bg-white px-5 py-5 mb-4 space-y-5">
      <p className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Nueva campaña</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nombre */}
        <div className="sm:col-span-2">
          <label className="block text-xs text-stone-500 mb-1">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="ej. Temporada Baja 2025"
            autoFocus
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
          />
        </div>

        {/* Descuento */}
        <div>
          <label className="block text-xs text-stone-500 mb-1">Descuento %</label>
          <input
            type="number"
            min={1}
            max={99}
            step={0.5}
            value={descuentoPct}
            onChange={(e) => setDescuentoPct(parseFloat(e.target.value) || 0)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-xs text-stone-500 mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500 bg-white"
          >
            <option value="segmentada">Segmentada (por distribuidor)</option>
            <option value="global">Global (todos los distribuidores)</option>
          </select>
        </div>

        {/* Fechas */}
        <div>
          <label className="block text-xs text-stone-500 mb-1">Fecha inicio</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Fecha fin</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
          />
        </div>
      </div>

      {/* Distribuidores (solo si segmentada) */}
      {tipo === 'segmentada' && (
        <div>
          <p className="text-xs text-stone-500 mb-2">
            Distribuidores <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {distribuidores.map((d) => (
              <label key={d.id} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={distSel.has(d.id)}
                  onChange={() => setDistSel(toggleSet(distSel, d.id))}
                  className="h-4 w-4 rounded border-stone-300 accent-stone-900"
                />
                <span className="text-sm text-stone-700 truncate">{d.nombre}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Categorías (opcional) */}
      <div>
        <p className="text-xs text-stone-500 mb-2">
          Categorías <span className="text-stone-300">(vacío = todas)</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categorias.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={catSel.has(cat.id)}
                onChange={() => setCatSel(toggleSet(catSel, cat.id))}
                className="h-4 w-4 rounded border-stone-300 accent-stone-900"
              />
              <span className="text-sm text-stone-700 truncate">{cat.nombre}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Líneas de acabado / subcategorías (opcional) */}
      <div>
        <p className="text-xs text-stone-500 mb-2">
          Líneas de acabado <span className="text-stone-300">(vacío = todas)</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {subcategorias.map((s) => (
            <label key={s.id} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={subSel.has(s.id)}
                onChange={() => setSubSel(toggleSet(subSel, s.id))}
                className="h-4 w-4 rounded border-stone-300 accent-stone-900"
              />
              <span className="text-sm text-stone-700 truncate">{s.nombre}</span>
            </label>
          ))}
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
          {guardando ? 'Guardando…' : 'Guardar campaña'}
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
