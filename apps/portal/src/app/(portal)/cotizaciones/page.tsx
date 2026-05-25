'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Plus,
  CircleNotch,
  CaretDown,
  CaretUp,
  FolderOpen,
  Tag,
  PencilSimple,
  Check,
  X,
  MagnifyingGlass,
  FileText,
  FilePdf,
} from '@phosphor-icons/react'
import { useAuth } from '@/components/providers/auth-provider'
import { getCotizaciones, renombrarVersionCotizacion } from '@/lib/firestore/cotizaciones'
import { getProyectos, actualizarProyecto } from '@/lib/firestore/proyectos'
import { getDistribuidor } from '@/lib/firestore/distribuidores'
import { getLogoDelben } from '@/lib/firestore/config'
import { urlADataUrl } from '@/lib/pdf-helpers'
import { formatCOP } from '@/lib/datos-demo'
import type { Cotizacion, Proyecto } from '@/lib/firebase/tipos-firestore'
import type { VersionResumenPDF, InfoResumenPDF } from '@/components/cotizador/resumen-proyecto-pdf'

const ResumenProyectoPDFButton = dynamic(
  () => import('@/components/cotizador/resumen-proyecto-pdf-button').then((m) => m.ResumenProyectoPDFButton),
  {
    ssr: false,
    loading: () => (
      <button disabled className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-400">
        <FilePdf size={16} />
        Preparando PDF…
      </button>
    ),
  },
)

type VersionResumen = {
  cotizacionId: string
  espacioNombre: string
  version: number
  versionNombre: string
  descripcion: string
  total: number
  modalidad: 'desarmado' | 'tradicional'
  seleccionada: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizar(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const ESTADO_COT: Record<string, { label: string; clases: string }> = {
  borrador: { label: 'Borrador', clases: 'bg-amber-100 text-amber-700' },
  enviada: { label: 'Enviada', clases: 'bg-blue-100 text-blue-700' },
  aceptada: { label: 'Aceptada', clases: 'bg-emerald-100 text-emerald-700' },
}

function fmtFecha(ts: number) {
  return new Date(ts).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CotizacionesPage() {
  const { distribuidorId, cargando: cargandoAuth } = useAuth()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    if (cargandoAuth) return
    if (!distribuidorId) { setCargando(false); return }

    Promise.all([
      getProyectos(distribuidorId),
      getCotizaciones(distribuidorId),
    ])
      .then(([ps, cs]) => { setProyectos(ps); setCotizaciones(cs) })
      .catch(() => setError('No se pudieron cargar los proyectos.'))
      .finally(() => setCargando(false))
  }, [distribuidorId, cargandoAuth])

  const cotPorProyecto = new Map<string, Cotizacion[]>()
  const cotSinProyecto: Cotizacion[] = []
  for (const c of cotizaciones) {
    if (c.proyecto_id) {
      const arr = cotPorProyecto.get(c.proyecto_id) ?? []
      arr.push(c)
      cotPorProyecto.set(c.proyecto_id, arr)
    } else {
      cotSinProyecto.push(c)
    }
  }

  const hayContenido = proyectos.length > 0 || cotSinProyecto.length > 0

  const proyectosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return proyectos
    const ts = normalizar(busqueda.trim()).split(/\s+/).filter(Boolean)
    return proyectos.filter((p) => {
      const h =
        normalizar(p.proyectoNombre) +
        ' ' +
        normalizar(p.clienteNombre) +
        ' ' +
        normalizar(p.clienteCiudad ?? '')
      return ts.every((t) => h.includes(t))
    })
  }, [proyectos, busqueda])

  const cotSinProyectoFiltradas = useMemo(() => {
    if (!busqueda.trim()) return cotSinProyecto
    const ts = normalizar(busqueda.trim()).split(/\s+/).filter(Boolean)
    return cotSinProyecto.filter((c) => {
      const h = normalizar(c.proyectoNombre) + ' ' + normalizar(c.clienteNombre)
      return ts.every((t) => h.includes(t))
    })
  }, [cotSinProyecto, busqueda])

  const hayFiltrosActivos = busqueda.trim() !== ''
  const hayResultadosFiltro = proyectosFiltrados.length > 0 || cotSinProyectoFiltradas.length > 0

  return (
    <div className="max-w-4xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Proyectos</h1>
            {!cargando && !error && hayContenido && (
              <p className="mt-0.5 text-sm text-stone-400">
                {hayFiltrosActivos
                  ? `${proyectosFiltrados.length} de ${proyectos.length} proyecto${proyectos.length !== 1 ? 's' : ''}`
                  : `${proyectos.length} proyecto${proyectos.length !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>
          <a
            href="/cotizaciones/nueva"
            className="tactil flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 transition-colors"
          >
            <Plus size={15} weight="bold" />
            Nuevo proyecto
          </a>
        </div>

        {/* Filtros — solo si hay datos */}
        {!cargando && !error && hayContenido && (
          <div className="flex items-center gap-2 mb-6">
            <div className="relative flex-1">
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
            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors shrink-0"
              >
                <X size={12} weight="bold" />
                Limpiar
              </button>
            )}
          </div>
        )}

        {(cargando || cargandoAuth) && (
          <div className="space-y-4">
            <SkeletonProyectoCard />
            <SkeletonProyectoCard />
            <SkeletonProyectoCard />
          </div>
        )}

        {!cargando && !cargandoAuth && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!cargando && !cargandoAuth && !error && !hayContenido && (
          <div className="rounded-xl border border-dashed border-stone-200 bg-white py-24 text-center">
            <FolderOpen size={32} className="mx-auto mb-3 text-stone-300" />
            <p className="text-sm font-medium text-stone-400">Sin proyectos aún</p>
            <p className="mt-1 text-xs text-stone-300">
              Crea tu primera cotización con el botón de arriba.
            </p>
          </div>
        )}

        {!cargando && !cargandoAuth && !error && (
          <div className="space-y-4">
            {/* Sin resultados para el filtro activo */}
            {hayContenido && hayFiltrosActivos && !hayResultadosFiltro && (
              <div className="rounded-xl border border-dashed border-stone-200 bg-white py-16 text-center">
                <p className="text-sm text-stone-400">Sin resultados para los filtros aplicados.</p>
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="mt-2 text-xs text-stone-400 underline hover:text-stone-700"
                >
                  Limpiar búsqueda
                </button>
              </div>
            )}

            {/* Proyectos filtrados */}
            {proyectosFiltrados.map((p, i) => (
              <ProyectoCard
                key={p.id}
                proyecto={p}
                cotizaciones={cotPorProyecto.get(p.id) ?? []}
                animDelay={i < 5 ? i * 60 : 0}
              />
            ))}

            {/* Cotizaciones antiguas (sin proyecto) */}
            {cotSinProyectoFiltradas.length > 0 && (
              <div className="mt-8">
                <p className="text-xs font-medium tracking-widest text-stone-400 uppercase mb-3">
                  Cotizaciones anteriores
                </p>
                <div className="space-y-2">
                  {cotSinProyectoFiltradas.map((c) => (
                    <CotizacionFilaLegacy key={c.id} cotizacion={c} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  )
}

// ─── Tarjeta de proyecto ──────────────────────────────────────────────────────

function SkeletonProyectoCard() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden animate-pulse">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-sm bg-stone-100" />
            <div className="h-4 w-40 rounded-md bg-stone-100" />
            <div className="h-4 w-16 rounded-full bg-stone-100" />
          </div>
          <div className="h-3 w-52 rounded-md bg-stone-100 ml-6" />
          <div className="h-3 w-32 rounded-md bg-stone-100 ml-6" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-7 w-28 rounded-md bg-stone-100" />
          <div className="h-7 w-7 rounded-md bg-stone-100" />
        </div>
      </div>
      <div className="border-t border-stone-100">
        <div className="flex items-center justify-between px-5 py-2.5 bg-stone-50">
          <div className="h-3 w-32 rounded-md bg-stone-200" />
          <div className="h-3 w-16 rounded-md bg-stone-200" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3 border-t border-stone-100">
            <div className="flex items-center gap-3">
              <div className="h-5 w-8 rounded-md bg-stone-100" />
              <div className="h-3 w-32 rounded-md bg-stone-100" />
              <div className="h-3 w-16 rounded-full bg-stone-100" />
            </div>
            <div className="h-4 w-20 rounded-md bg-stone-100" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ProyectoCard({
  proyecto: p,
  cotizaciones,
  animDelay = 0,
}: {
  proyecto: Proyecto
  cotizaciones: Cotizacion[]
  animDelay?: number
}) {
  const router = useRouter()
  const { distribuidorId } = useAuth()
  const [expandido, setExpandido] = useState(true)
  const [estadoLocal, setEstadoLocal] = useState(p.estado)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)

  // ─── Resumen de proyecto ───────────────────────────────────────────────────
  const [panelResumen, setPanelResumen] = useState(false)
  const [versionesResumen, setVersionesResumen] = useState<VersionResumen[]>([])
  const [logoDelbenData, setLogoDelbenData] = useState<string | null | undefined>(undefined)
  const [logoDistData, setLogoDistData] = useState<string | null | undefined>(undefined)

  function inicializarVersiones() {
    setVersionesResumen(
      [...cotizaciones]
        .sort((a, b) => {
          const esp = (a.espacio_nombre ?? '').localeCompare(b.espacio_nombre ?? '')
          if (esp !== 0) return esp
          return (a.version ?? 1) - (b.version ?? 1)
        })
        .map((c) => ({
          cotizacionId: c.id,
          espacioNombre: c.espacio_nombre ?? 'Sin espacio',
          version: c.version ?? 1,
          versionNombre: c.version_nombre ?? '',
          descripcion: c.version_nombre ?? '',
          total: c.totales.total,
          modalidad: c.modalidad,
          seleccionada: true,
        })),
    )
  }

  async function cargarLogos() {
    if (logoDelbenData !== undefined && logoDistData !== undefined) return
    if (!distribuidorId) return
    const [delbenUrl, dist] = await Promise.all([
      getLogoDelben().catch(() => null),
      getDistribuidor(distribuidorId).catch(() => null),
    ])
    const [dData, distData] = await Promise.all([
      delbenUrl ? urlADataUrl(delbenUrl).catch(() => null) : Promise.resolve(null),
      dist?.logo_url ? urlADataUrl(dist.logo_url).catch(() => null) : Promise.resolve(null),
    ])
    setLogoDelbenData(dData)
    setLogoDistData(distData)
  }

  function handleAbrirResumen(e: React.MouseEvent) {
    e.stopPropagation()
    inicializarVersiones()
    setPanelResumen(true)
    cargarLogos()
  }

  const seleccionadas = versionesResumen.filter((v) => v.seleccionada)
  const totalSeleccionadas = seleccionadas.reduce((s, v) => s + v.total, 0)

  async function handleCambiarEstado(nuevoEstado: Proyecto['estado']) {
    if (nuevoEstado === estadoLocal || !distribuidorId) return
    const prev = estadoLocal
    setCambiandoEstado(true)
    setEstadoLocal(nuevoEstado)
    try {
      await actualizarProyecto(distribuidorId, p.id, { estado: nuevoEstado })
    } catch {
      setEstadoLocal(prev)
    } finally {
      setCambiandoEstado(false)
    }
  }

  // Agrupar por espacio_nombre
  const porEspacio = new Map<string, Cotizacion[]>()
  for (const c of cotizaciones) {
    const nombre = c.espacio_nombre ?? 'Sin espacio'
    const arr = porEspacio.get(nombre) ?? []
    arr.push(c)
    porEspacio.set(nombre, arr)
  }
  // Ordenar versiones dentro de cada espacio
  for (const arr of porEspacio.values()) {
    arr.sort((a, b) => (a.version ?? 1) - (b.version ?? 1))
  }

  const totalVersiones = cotizaciones.length
  const espacios = [...porEspacio.entries()]

  return (
    <div
      className="rounded-xl border border-stone-200 bg-white overflow-hidden hover:border-stone-300 transition-colors animate-aparecer"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Cabecera del proyecto */}
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <FolderOpen size={15} weight="fill" className="text-stone-400 shrink-0" />
            <p className="text-sm font-semibold text-stone-900">{p.proyectoNombre}</p>
            <EstadoSelector
              estado={estadoLocal}
              onChange={handleCambiarEstado}
              cargando={cambiandoEstado}
            />
          </div>
          <p className="mt-0.5 text-xs text-stone-400 ml-[23px]">
            {p.clienteNombre}
            {p.clienteCiudad ? ` · ${p.clienteCiudad}` : ''}
            {p.clienteDireccion ? ` · ${p.clienteDireccion}` : ''}
          </p>
          {totalVersiones > 0 && (
            <p className="mt-1 text-xs text-stone-400 ml-[23px]">
              {espacios.length} espacio{espacios.length !== 1 ? 's' : ''} · {totalVersiones} versión{totalVersiones !== 1 ? 'es' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {cotizaciones.length > 0 && (
            <button
              type="button"
              onClick={handleAbrirResumen}
              title="Resumen del proyecto"
              className={[
                'tactil flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-all',
                panelResumen
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50',
              ].join(' ')}
            >
              <FileText size={11} weight="bold" />
              Resumen
            </button>
          )}
          <a
            href={`/cotizaciones/nueva?proyecto=${p.id}`}
            onClick={(e) => {
              e.preventDefault()
              router.push(`/cotizaciones/nueva?proyecto=${p.id}`)
            }}
            className="tactil flex items-center gap-1 rounded-md border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:border-stone-300 hover:bg-stone-50 transition-all"
          >
            <Plus size={11} weight="bold" />
            Nueva cotización
          </a>
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="tactil rounded-md border border-stone-200 p-1.5 text-stone-400 hover:text-stone-600 transition-colors"
          >
            {expandido ? <CaretUp size={13} /> : <CaretDown size={13} />}
          </button>
        </div>
      </div>

      {/* Espacios y versiones */}
      {expandido && espacios.length > 0 && (
        <div className="border-t border-stone-100">
          {espacios.map(([espacioNombre, versiones], idx) => (
            <div
              key={espacioNombre}
              className={idx > 0 ? 'border-t border-stone-100' : ''}
            >
              {/* Cabecera del espacio */}
              <div className="flex items-center justify-between px-5 py-2.5 bg-stone-50">
                <div className="flex items-center gap-2">
                  <Tag size={12} className="text-stone-400" />
                  <span className="text-xs font-semibold text-stone-600">{espacioNombre}</span>
                  <span className="text-xs text-stone-400">
                    · {versiones[0]?.categoriaNombre ?? ''} · {versiones[0]?.modalidad === 'desarmado' ? 'Desarmado' : 'Tradicional'}
                  </span>
                </div>
                <a
                  href={`/cotizaciones/nueva?proyecto=${p.id}&espacio=${encodeURIComponent(espacioNombre)}`}
                  onClick={(e) => {
                    e.preventDefault()
                    router.push(`/cotizaciones/nueva?proyecto=${p.id}&espacio=${encodeURIComponent(espacioNombre)}`)
                  }}
                  className="tactil flex items-center gap-1 rounded text-xs text-stone-400 hover:text-stone-700 transition-colors px-1"
                >
                  <Plus size={10} weight="bold" />
                  Nueva versión
                </a>
              </div>

              {/* Versiones */}
              {versiones.map((c) => (
                <VersionFila key={c.id} cotizacion={c} />
              ))}
            </div>
          ))}
        </div>
      )}

      {expandido && cotizaciones.length === 0 && (
        <div className="border-t border-stone-100 px-5 py-5 text-center">
          <p className="text-xs text-stone-400">
            Sin cotizaciones en este proyecto.{' '}
            <button
              type="button"
              onClick={() => router.push(`/cotizaciones/nueva?proyecto=${p.id}`)}
              className="text-stone-600 underline underline-offset-2 hover:text-stone-900"
            >
              Crear primera cotización
            </button>
          </p>
        </div>
      )}

      {/* Panel resumen del proyecto */}
      {panelResumen && (
        <div className="border-t border-stone-200 bg-stone-50 p-5 space-y-4 animate-aparecer">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Resumen del proyecto
            </p>
            <button
              type="button"
              onClick={() => setPanelResumen(false)}
              className="tactil rounded-md p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition-colors"
            >
              <X size={13} weight="bold" />
            </button>
          </div>

          {/* Versiones seleccionables */}
          <div className="space-y-2">
            {versionesResumen.map((v, i) => (
              <div
                key={v.cotizacionId}
                className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2.5"
              >
                <input
                  type="checkbox"
                  checked={v.seleccionada}
                  onChange={(e) =>
                    setVersionesResumen((prev) =>
                      prev.map((vr, j) =>
                        j === i ? { ...vr, seleccionada: e.target.checked } : vr,
                      ),
                    )
                  }
                  className="h-3.5 w-3.5 rounded border-stone-300 accent-stone-900 shrink-0"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-bold text-stone-500 tabular-nums">
                    v{v.version}
                  </span>
                  <span className="text-xs text-stone-600 max-w-[90px] truncate">
                    {v.espacioNombre}
                  </span>
                </div>
                <input
                  type="text"
                  value={v.descripcion}
                  onChange={(e) =>
                    setVersionesResumen((prev) =>
                      prev.map((vr, j) =>
                        j === i ? { ...vr, descripcion: e.target.value } : vr,
                      ),
                    )
                  }
                  placeholder="Descripción opcional…"
                  disabled={!v.seleccionada}
                  className="flex-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs outline-none focus:border-stone-400 transition-colors disabled:opacity-40 disabled:bg-stone-50"
                />
                <span className="shrink-0 text-xs font-semibold text-stone-700 tabular-nums">
                  {formatCOP(v.total)}
                </span>
              </div>
            ))}
          </div>

          {/* Total + botón PDF */}
          {seleccionadas.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between pt-1 border-t border-stone-200">
                <span className="text-xs text-stone-500">
                  {seleccionadas.length} versión{seleccionadas.length !== 1 ? 'es' : ''} seleccionada{seleccionadas.length !== 1 ? 's' : ''}
                </span>
                <span className="text-sm font-bold text-stone-900 tabular-nums">
                  {formatCOP(totalSeleccionadas)}
                </span>
              </div>
              <ResumenProyectoPDFButton
                info={{
                  proyectoNombre: p.proyectoNombre,
                  clienteNombre: p.clienteNombre,
                  clienteCiudad: p.clienteCiudad,
                  fecha: new Date(),
                  logoDistribuidorUrl: logoDistData ?? null,
                  logoDelbenUrl: logoDelbenData ?? null,
                }}
                versiones={seleccionadas.map(
                  (v): VersionResumenPDF => ({
                    espacioNombre: v.espacioNombre,
                    version: v.version,
                    descripcion: v.descripcion || v.versionNombre || `Versión ${v.version}`,
                    total: v.total,
                    modalidad: v.modalidad,
                  }),
                )}
              />
            </div>
          ) : (
            <p className="text-xs text-stone-400">
              Selecciona al menos una versión para generar el PDF.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Fila de versión ──────────────────────────────────────────────────────────

function VersionFila({ cotizacion: c }: { cotizacion: Cotizacion }) {
  const router = useRouter()
  const { distribuidorId } = useAuth()
  const estado = ESTADO_COT[c.estado] ?? ESTADO_COT['borrador']!
  const nModulos = c.items.length
  const nHerrajes = c.itemsHerraje.length
  const [editando, setEditando] = useState(false)
  const [nombreLocal, setNombreLocal] = useState(c.version_nombre ?? '')
  const [guardando, setGuardando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function iniciarEdicion(e: React.MouseEvent) {
    e.stopPropagation()
    setNombreLocal(c.version_nombre ?? '')
    setEditando(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function guardar(e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!distribuidorId || !c.proyecto_id) { setEditando(false); return }
    setGuardando(true)
    try {
      await renombrarVersionCotizacion(distribuidorId, c.proyecto_id, c.id, nombreLocal.trim())
    } catch {
      setNombreLocal(c.version_nombre ?? '')
    } finally {
      setGuardando(false)
      setEditando(false)
    }
  }

  function cancelar(e?: React.MouseEvent) {
    e?.stopPropagation()
    setNombreLocal(c.version_nombre ?? '')
    setEditando(false)
  }

  const navegar = () => {
    if (!editando) router.push(`/cotizaciones/${c.id}${c.proyecto_id ? `?pid=${c.proyecto_id}` : ''}`)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={navegar}
      onKeyDown={(e) => { if (e.key === 'Enter') navegar() }}
      className="group w-full flex items-center justify-between gap-4 px-5 py-3 hover:bg-stone-50 transition-colors cursor-pointer border-t border-stone-100 first:border-t-0"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0 rounded-md bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-500 tabular-nums">
          v{c.version ?? 1}
        </span>
        <div className="min-w-0 flex-1">
          {editando ? (
            <div
              className="flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                ref={inputRef}
                value={nombreLocal}
                onChange={(e) => setNombreLocal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') guardar()
                  if (e.key === 'Escape') cancelar()
                }}
                placeholder="Nombre de la versión…"
                className="rounded-md border border-stone-300 px-2 py-0.5 text-xs font-medium text-stone-800 outline-none focus:border-stone-500 w-44"
              />
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="tactil rounded-md bg-stone-900 p-1 text-white hover:bg-stone-700 disabled:opacity-50"
              >
                {guardando
                  ? <CircleNotch size={11} className="animate-spin" />
                  : <Check size={11} weight="bold" />}
              </button>
              <button
                type="button"
                onClick={cancelar}
                className="tactil rounded-md border border-stone-200 p-1 text-stone-500 hover:bg-stone-50"
              >
                <X size={11} weight="bold" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {nombreLocal && (
                <span className="text-xs font-semibold text-stone-700">{nombreLocal}</span>
              )}
              <span className={['rounded-full px-2 py-0.5 text-xs font-semibold', estado.clases].join(' ')}>
                {estado.label}
              </span>
              <span className="text-xs text-stone-400">
                {nModulos} módulo{nModulos !== 1 ? 's' : ''}
                {nHerrajes > 0 ? ` · ${nHerrajes} herraje${nHerrajes !== 1 ? 's' : ''}` : ''}
              </span>
              <span className="text-xs text-stone-400">{fmtFecha(c.fecha)}</span>
              <button
                type="button"
                onClick={iniciarEdicion}
                title="Renombrar versión"
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 text-stone-300 hover:text-stone-600"
              >
                <PencilSimple size={11} weight="bold" />
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="shrink-0 text-sm font-bold text-stone-900 tabular-nums">
        {formatCOP(c.totales.total)}
      </p>
    </div>
  )
}

// ─── Cotizaciones sin proyecto (legacy) ───────────────────────────────────────

function CotizacionFilaLegacy({ cotizacion: c }: { cotizacion: Cotizacion }) {
  const router = useRouter()
  const estado = ESTADO_COT[c.estado] ?? ESTADO_COT['borrador']!
  const nModulos = c.items.length

  return (
    <button
      type="button"
      onClick={() => router.push(`/cotizaciones/${c.id}`)}
      className="tactil w-full rounded-xl border border-stone-200 bg-white px-5 py-4 hover:border-stone-300 hover:shadow-sm transition-all text-left"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-stone-900 truncate">{c.proyectoNombre}</p>
            <span className={['rounded-full px-2 py-0.5 text-xs font-semibold', estado.clases].join(' ')}>
              {estado.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-stone-400">
            {c.clienteNombre} · {fmtFecha(c.fecha)} · {nModulos} módulo{nModulos !== 1 ? 's' : ''}
          </p>
        </div>
        <p className="shrink-0 text-base font-bold text-stone-900 tabular-nums">
          {formatCOP(c.totales.total)}
        </p>
      </div>
    </button>
  )
}

// ─── Selector de estado de proyecto ──────────────────────────────────────────

const ESTADOS_PROYECTO: Array<{ value: Proyecto['estado']; label: string; clases: string }> = [
  { value: 'en_proceso', label: 'En proceso', clases: 'bg-blue-50 text-blue-600' },
  { value: 'aceptado',   label: 'Aceptado',   clases: 'bg-emerald-50 text-emerald-700' },
  { value: 'perdido',    label: 'Perdido',     clases: 'bg-red-50 text-red-600' },
]

function EstadoSelector({
  estado,
  onChange,
  cargando,
}: {
  estado: Proyecto['estado']
  onChange: (e: Proyecto['estado']) => void
  cargando: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function cerrar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [abierto])

  const actual = ESTADOS_PROYECTO.find((e) => e.value === estado)!

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { if (!cargando) setAbierto((v) => !v) }}
        className={[
          'rounded-full px-2 py-0.5 text-xs font-semibold transition-opacity',
          actual.clases,
          cargando ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:ring-1 hover:ring-current hover:ring-offset-1',
        ].join(' ')}
      >
        {actual.label}
      </button>
      {abierto && (
        <div className="absolute left-0 top-full mt-1 z-10 rounded-lg border border-stone-200 bg-white shadow-md py-1 min-w-[130px] animate-desplegarse origin-top-left">
          {ESTADOS_PROYECTO.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => { onChange(e.value); setAbierto(false) }}
              className={[
                'w-full text-left px-3 py-1.5 text-xs',
                e.value === estado ? 'bg-stone-50' : 'hover:bg-stone-50',
              ].join(' ')}
            >
              <span className={['rounded-full px-2 py-0.5 text-xs font-semibold', e.clases].join(' ')}>
                {e.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
