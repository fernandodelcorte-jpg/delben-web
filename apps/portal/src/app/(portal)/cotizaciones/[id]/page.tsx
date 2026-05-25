'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { CaretDown, CaretUp, CircleNotch, Copy, ArrowsClockwise, PencilSimple, Check, X } from '@phosphor-icons/react'
import { useAuth } from '@/components/providers/auth-provider'
import { useCarrito } from '@/store/carrito'
import { getCotizacion, renombrarCotizacion } from '@/lib/firestore/cotizaciones'
import { recalcularCotizacion } from '@/lib/firestore/recalcular'
import { getDistribuidor } from '@/lib/firestore/distribuidores'
import { getLogoDelben } from '@/lib/firestore/config'
import { formatCOP } from '@/lib/datos-demo'
import { itemSnapshotToPDF, herrajeSnapshotToPDF, urlADataUrl } from '@/lib/pdf-helpers'
import { getUniversoParaModalidad } from '@/lib/firebase/tipos-firestore'
import type {
  Cotizacion,
  Distribuidor,
  ItemCotizacionSnapshot,
  ItemHerraCotizacionSnapshot,
  HerrajeAsociadoSnapshot,
  ResultadoSnapshot,
} from '@/lib/firebase/tipos-firestore'

const CotizacionPDFButton = dynamic(
  () => import('@/components/cotizador/cotizacion-pdf-button').then((m) => m.CotizacionPDFButton),
  { ssr: false, loading: () => <BtnPDFCargando label="Cotización PDF" /> },
)

const OrdenCompraPDFButton = dynamic(
  () => import('@/components/cotizador/orden-compra-pdf-button').then((m) => m.OrdenCompraPDFButton),
  { ssr: false, loading: () => <BtnPDFCargando label="Orden de compra PDF" /> },
)

function BtnPDFCargando({ label }: { label: string }) {
  return (
    <button
      disabled
      className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-400"
    >
      {label}
    </button>
  )
}

const ETIQUETA_ESTADO: Record<string, { label: string; clases: string }> = {
  borrador: { label: 'Borrador', clases: 'bg-amber-100 text-amber-700' },
  enviada: { label: 'Enviada', clases: 'bg-blue-100 text-blue-700' },
  aceptada: { label: 'Aceptada', clases: 'bg-emerald-100 text-emerald-700' },
}

export default function CotizacionDetallePage() {
  return (
    <Suspense>
      <CotizacionDetalleContent />
    </Suspense>
  )
}

function CotizacionDetalleContent() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const proyectoId = searchParams.get('pid') ?? undefined
  const { distribuidorId, rol, cargando: cargandoAuth } = useAuth()
  const router = useRouter()
  const cotizacionGuardadaId = useCarrito((s) => s.cotizacionGuardadaId)
  const reabrirBorrador = useCarrito((s) => s.reabrirBorrador)
  const copiarBorrador = useCarrito((s) => s.copiarBorrador)
  const cargarBorrador = useCarrito((s) => s.cargarBorrador)
  const [actualizando, setActualizando] = useState(false)
  const [errorActualizar, setErrorActualizar] = useState<string | null>(null)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [editProyecto, setEditProyecto] = useState('')
  const [editCliente, setEditCliente] = useState('')
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null)
  const [distribuidor, setDistribuidor] = useState<Distribuidor | null>(null)
  const [logoDistribuidorData, setLogoDistribuidorData] = useState<string | null>(null)
  const [logoDelbenData, setLogoDelbenData] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())

  const puedeVerCosto = rol !== 'distribuidor_comercial'

  useEffect(() => {
    if (cargandoAuth || !distribuidorId) return
    getCotizacion(distribuidorId, id, proyectoId)
      .then((c) => {
        if (!c) setError('Cotización no encontrada.')
        else {
          setCotizacion(c)
          setEditProyecto(c.proyectoNombre)
          setEditCliente(c.clienteNombre)
          getDistribuidor(c.distribuidor_id).then((dist) => {
            setDistribuidor(dist)
            if (dist?.logo_url) urlADataUrl(dist.logo_url).then(setLogoDistribuidorData).catch(() => {})
          }).catch(() => {})
          getLogoDelben().then((url) => {
            if (url) urlADataUrl(url).then(setLogoDelbenData).catch(() => {})
          }).catch(() => {})
        }
      })
      .catch(() => setError('No se pudo cargar la cotización.'))
      .finally(() => setCargando(false))
  }, [id, distribuidorId, cargandoAuth])

  async function handleGuardarNombre() {
    if (!cotizacion || !distribuidorId) return
    const proy = editProyecto.trim()
    const cli = editCliente.trim()
    if (!proy || !cli) return
    setGuardandoNombre(true)
    try {
      await renombrarCotizacion(distribuidorId, cotizacion.id, cli, proy, cotizacion.proyecto_id)
      setCotizacion({ ...cotizacion, proyectoNombre: proy, clienteNombre: cli })
      setEditandoNombre(false)
    } finally {
      setGuardandoNombre(false)
    }
  }

  const handleActualizarPrecios = useCallback(async () => {
    if (!cotizacion || !distribuidorId) return
    setActualizando(true)
    setErrorActualizar(null)
    try {
      const result = await recalcularCotizacion(cotizacion, distribuidorId)
      cargarBorrador({
        cotizacionInfo: result.cotizacionInfo,
        cotizacionGuardadaId: cotizacion.id,
        distribuidorData: result.distribuidorData,
        items: result.items,
        itemsHerraje: result.itemsHerraje,
      })
      router.push('/cotizaciones/borrador')
    } catch {
      setErrorActualizar('No se pudieron actualizar los precios. Intenta de nuevo.')
      setActualizando(false)
    }
  }, [cotizacion, distribuidorId, cargarBorrador, router])

  function toggleExpandido(i: number) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  if (cargando || cargandoAuth) {
    return (
      <div className="animate-pulse space-y-0">
        <div className="border-b border-stone-200 bg-white px-6 py-4">
          <div className="mx-auto max-w-4xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-3 w-20 rounded-md bg-stone-100" />
              <div className="h-4 w-px bg-stone-200" />
              <div className="space-y-1.5">
                <div className="h-3 w-40 rounded-md bg-stone-100" />
                <div className="h-4 w-56 rounded-md bg-stone-100" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-28 rounded-lg bg-stone-100" />
              <div className="h-8 w-32 rounded-lg bg-stone-100" />
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
          <div className="h-5 w-32 rounded-md bg-stone-100" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-4 w-8 rounded-md bg-stone-100" />
                <div className="h-4 w-48 rounded-md bg-stone-100" />
                <div className="h-4 w-24 rounded-md bg-stone-100 ml-auto" />
              </div>
              <div className="h-3 w-64 rounded-md bg-stone-100" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !cotizacion) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <p className="text-sm text-stone-500 mb-4">{error ?? 'Cotización no encontrada.'}</p>
          <Link href="/cotizaciones" className="text-sm font-medium text-stone-900 underline">
            Volver a cotizaciones
          </Link>
        </div>
      </div>
    )
  }

  const estado = ETIQUETA_ESTADO[cotizacion.estado] ?? ETIQUETA_ESTADO['borrador']!
  const fecha = new Date(cotizacion.fecha).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const hayItems = cotizacion.items.length > 0 || cotizacion.itemsHerraje.length > 0

  const infoParaPDF = {
    clienteNombre: cotizacion.clienteNombre,
    clienteDireccion: cotizacion.clienteDireccion,
    proyectoNombre: cotizacion.proyectoNombre,
    categoriaNombre: cotizacion.categoriaNombre,
    modalidad: cotizacion.modalidad,
    fecha: new Date(cotizacion.fecha),
    logoDistribuidorUrl: logoDistribuidorData,
    logoDelbenUrl: logoDelbenData,
  }
  const itemsPDF = cotizacion.items.map(itemSnapshotToPDF)
  const herrajesSueltosPDF = cotizacion.itemsHerraje.map(herrajeSnapshotToPDF)

  return (
    <div>
      {/* Header */}
      <div className="border-b border-stone-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/cotizaciones"
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors shrink-0"
            >
              ← Cotizaciones
            </Link>
            <div className="h-4 w-px bg-stone-200" />

            {editandoNombre ? (
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <input
                  value={editProyecto}
                  onChange={(e) => setEditProyecto(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGuardarNombre() ; if (e.key === 'Escape') setEditandoNombre(false) }}
                  placeholder="Proyecto"
                  className="rounded-md border border-stone-300 px-2 py-1 text-sm font-semibold text-stone-900 outline-none focus:border-stone-500 w-44"
                  autoFocus
                />
                <input
                  value={editCliente}
                  onChange={(e) => setEditCliente(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGuardarNombre() ; if (e.key === 'Escape') setEditandoNombre(false) }}
                  placeholder="Cliente"
                  className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-500 outline-none focus:border-stone-500 w-36"
                />
                <button
                  onClick={handleGuardarNombre}
                  disabled={guardandoNombre}
                  className="tactil rounded-md bg-stone-900 p-1.5 text-white hover:bg-stone-700 disabled:opacity-50"
                >
                  {guardandoNombre ? <CircleNotch size={14} className="animate-spin" /> : <Check size={14} weight="bold" />}
                </button>
                <button
                  onClick={() => { setEditandoNombre(false); setEditProyecto(cotizacion.proyectoNombre); setEditCliente(cotizacion.clienteNombre) }}
                  className="tactil rounded-md border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditandoNombre(true)}
                className="group min-w-0 text-left"
              >
                <p className="text-xs text-stone-400 truncate">
                  {cotizacion.clienteNombre} · {fecha}
                </p>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-900 truncate">
                  {cotizacion.proyectoNombre}
                  <PencilSimple size={12} className="shrink-0 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" weight="bold" />
                </p>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <span
              className={[
                'rounded-full px-2.5 py-1 text-xs font-semibold',
                estado.clases,
              ].join(' ')}
            >
              {estado.label}
            </span>
            <span
              className={[
                'rounded-full px-2.5 py-1 text-xs font-semibold',
                cotizacion.modalidad === 'desarmado'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600',
              ].join(' ')}
            >
              {cotizacion.modalidad === 'desarmado' ? 'Desarmado' : 'Tradicional'}
            </span>

            {/* Duplicar — disponible para cualquier estado */}
            <button
              onClick={() => {
                copiarBorrador(cotizacion)
                router.push('/cotizaciones/borrador')
              }}
              className="tactil flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:border-stone-300 hover:bg-stone-50 transition-colors"
            >
              <Copy size={13} weight="bold" />
              Duplicar
            </button>

            {/* Continuar editando — solo borradores */}
            {cotizacion.estado === 'borrador' && (
              <button
                onClick={() => {
                  if (cotizacionGuardadaId !== id) reabrirBorrador(cotizacion)
                  router.push('/cotizaciones/borrador')
                }}
                className="tactil rounded-lg border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:border-stone-300 hover:bg-stone-50 transition-colors"
              >
                Continuar editando →
              </button>
            )}

            {/* Actualizar precios — solo borradores, solo roles con acceso a costos */}
            {cotizacion.estado === 'borrador' && puedeVerCosto && (
              <button
                onClick={handleActualizarPrecios}
                disabled={actualizando}
                className="tactil flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:border-stone-300 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                {actualizando ? (
                  <CircleNotch size={13} className="animate-spin" />
                ) : (
                  <ArrowsClockwise size={13} weight="bold" />
                )}
                {actualizando ? 'Actualizando…' : 'Actualizar precios'}
              </button>
            )}
            {errorActualizar && (
              <p className="w-full text-xs text-red-600 mt-1">{errorActualizar}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Módulos */}
        <h2 className="text-sm font-semibold text-stone-900 tracking-tight mb-4">Módulos</h2>

        {cotizacion.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 bg-white py-12 text-center">
            <p className="text-sm text-stone-400">Sin módulos.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cotizacion.items.map((item, i) => (
              <ItemGuardadoRow
                key={i}
                item={item}
                expandido={expandidos.has(i)}
                onToggle={() => toggleExpandido(i)}
                puedeVerCosto={puedeVerCosto}
                distribuidor={distribuidor}
              />
            ))}
          </div>
        )}

        {/* Herrajes sueltos */}
        {cotizacion.itemsHerraje.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-stone-900 tracking-tight mb-4">Herrajes</h2>
            <div className="space-y-2">
              {cotizacion.itemsHerraje.map((item, i) => (
                <HerrajeGuardadoRow key={i} item={item} puedeVerCosto={puedeVerCosto} />
              ))}
            </div>
          </div>
        )}

        {/* Totales + PDF */}
        {hayItems && (
          <div className="mt-10 space-y-4">
            {puedeVerCosto && distribuidor && (() => {
              const s = distribuidor.servicios
              const u = getUniversoParaModalidad(distribuidor.universo, cotizacion.modalidad)
              const t = calcularResumenTotal(cotizacion, distribuidor)
              const transp_fijo = (u.transporte_tipo ?? 'porcentual') === 'fijo'
              const instal_fija = (u.instalacion_tipo ?? 'porcentual') === 'fijo'
              return (
                <div className="rounded-xl border border-stone-200 bg-white px-5 py-5">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                    Desglose de costos del proyecto
                  </p>
                  <div className="space-y-0 text-sm divide-y divide-stone-50">
                    <FilaCosto label="Precio base (tras descuentos y campaña)" valor={t.base} resaltado />
                    <FilaCosto label={`Diseño (${s.diseno_pct}%)`} valor={t.diseno} signo="+" />
                    <FilaCosto label={`Cotización (${s.cotizacion_pct}%)`} valor={t.cotizacion} signo="+" />
                    <FilaCosto label={`Producción (${s.produccion_pct}%)`} valor={t.produccion} signo="+" />
                    <FilaCosto label={`Logística (${s.logistica_pct}%)`} valor={t.logistica} signo="+" />
                    <FilaCosto label={`Gestión comercial (${s.gestion_comercial_pct}% margin)`} valor={t.gestion} signo="+" />
                    <FilaCosto label="→ Costo Delben" valor={t.costoDelben} resaltado />
                    {!transp_fijo && <FilaCosto label={`Transporte (${u.transporte_pct}%)`} valor={t.transporte} signo="+" />}
                    {!instal_fija && <FilaCosto label={`Instalación (${u.instalacion_pct}%)`} valor={t.instalacion} signo="+" />}
                    <FilaCosto label={`Imprevistos (${u.imprevistos_pct}%)`} valor={t.imprevistos} signo="+" />
                    <FilaCosto label={`Utilidad (${u.utilidad_pct}% margin)`} valor={t.utilidad} signo="+" />
                    <FilaCosto label="Sin IVA" valor={t.sinIva} resaltado />
                    {t.iva > 0 && <FilaCosto label={`IVA (${u.iva_pct}%)`} valor={t.iva} signo="+" />}
                    {t.transporteFijo > 0 && <FilaCosto label="Transporte fijo" valor={t.transporteFijo} signo="+" />}
                    {t.instalacionFija > 0 && <FilaCosto label="Instalación fija" valor={t.instalacionFija} signo="+" />}
                    <div className="pt-1">
                      <FilaCosto label="→ Total del proyecto" valor={cotizacion.totales.total} resaltado destacado />
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Costos fijos del proyecto */}
            {((cotizacion.totales.transporteFijo ?? 0) > 0 || (cotizacion.totales.instalacionFija ?? 0) > 0) && puedeVerCosto && (
              <div className="rounded-xl border border-stone-200 bg-white px-5 py-4 space-y-2">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                  Costos fijos del proyecto
                </p>
                {(cotizacion.totales.transporteFijo ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Transporte</span>
                    <span className="font-medium tabular-nums">{formatCOP(cotizacion.totales.transporteFijo!)}</span>
                  </div>
                )}
                {(cotizacion.totales.instalacionFija ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Instalación</span>
                    <span className="font-medium tabular-nums">{formatCOP(cotizacion.totales.instalacionFija!)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <CotizacionPDFButton info={infoParaPDF} items={itemsPDF} herrajesSueltos={herrajesSueltosPDF} />
                {puedeVerCosto && (
                  <OrdenCompraPDFButton
                    info={infoParaPDF}
                    items={itemsPDF}
                    herrajesSueltos={herrajesSueltosPDF}
                    distribuidorNombre={distribuidor?.nombre}
                  />
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-stone-400 mb-1">Total con IVA</p>
                <p className="text-2xl font-bold text-stone-900 tabular-nums">
                  {formatCOP(cotizacion.totales.total)}
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  {cotizacion.items.length} módulo{cotizacion.items.length !== 1 ? 's' : ''}
                  {cotizacion.itemsHerraje.length > 0 &&
                    ` · ${cotizacion.itemsHerraje.length} herraje${cotizacion.itemsHerraje.length !== 1 ? 's' : ''}`}{' '}
                  · COP
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Fila de ítem guardado ────────────────────────────────────────────────────

function ItemGuardadoRow({
  item,
  expandido,
  onToggle,
  puedeVerCosto,
  distribuidor,
}: {
  item: ItemCotizacionSnapshot
  expandido: boolean
  onToggle: () => void
  puedeVerCosto: boolean
  distribuidor: Distribuidor | null
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="tactil w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-100 text-xs font-semibold text-stone-500">
          {item.modulo_tipologia.slice(0, 2).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 leading-snug truncate">
            {item.modulo_nombre}
          </p>
          <p className="text-xs text-stone-400 truncate mt-0.5">
            {item.config.tipoEstructuraNombre} · {item.config.tipoFachadaNombre} ·{' '}
            {item.config.acabadoNombre} · ×{item.config.cantidad}
          </p>
        </div>
        <div className="shrink-0 text-right ml-4">
          <p className="text-sm font-bold text-stone-900 tabular-nums">
            {formatCOP(item.resultado.subtotal_linea)}
          </p>
          {item.config.cantidad > 1 && (
            <p className="text-xs text-stone-400 tabular-nums">
              {formatCOP(item.resultado.precio_final_unitario)} c/u
            </p>
          )}
        </div>
        {expandido ? (
          <CaretUp size={14} className="shrink-0 text-stone-400 ml-2" weight="bold" />
        ) : (
          <CaretDown size={14} className="shrink-0 text-stone-400 ml-2" weight="bold" />
        )}
      </button>

      {expandido && (
        <div className="border-t border-stone-100 px-4 py-4 bg-stone-50 space-y-4">
          <DetalleGridSnapshot item={item} />
          {item.herrajesAsociados.length > 0 && (
            <HerrajesAsociadosSnapshot
              herrajes={item.herrajesAsociados}
              puedeVerCosto={puedeVerCosto}
            />
          )}
        </div>
      )}
    </div>
  )
}

function HerrajeGuardadoRow({
  item,
  puedeVerCosto,
}: {
  item: ItemHerraCotizacionSnapshot
  puedeVerCosto: boolean
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-100 text-xs font-semibold text-stone-500">
          {String(item.codigo).slice(0, 3)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 truncate">{item.nombre}</p>
          <p className="text-xs text-stone-400 mt-0.5">cód. {item.codigo} · ×{item.cantidad}</p>
        </div>
        <div className="shrink-0 text-right ml-4">
          <p className="text-sm font-bold text-stone-900 tabular-nums">
            {formatCOP(item.resultado.subtotal_linea)}
          </p>
          {puedeVerCosto && (
            <p className="text-xs text-stone-400 tabular-nums">
              costo: {formatCOP(item.resultado.costo_delben * item.cantidad)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function calcularDesglose(r: ResultadoSnapshot, dist: Distribuidor, modalidad: 'desarmado' | 'tradicional') {
  const base = r.costo_tras_descuentos
  const s = dist.servicios
  const u = getUniversoParaModalidad(dist.universo, modalidad)
  const transp_pct = (u.transporte_tipo ?? 'porcentual') === 'fijo' ? 0 : u.transporte_pct
  const instal_pct = (u.instalacion_tipo ?? 'porcentual') === 'fijo' ? 0 : u.instalacion_pct
  const universo_aditivo = r.costo_delben * (1 + (transp_pct + instal_pct + u.imprevistos_pct) / 100)
  return {
    diseno:           base * s.diseno_pct / 100,
    cotizacion:       base * s.cotizacion_pct / 100,
    produccion:       base * s.produccion_pct / 100,
    logistica:        base * s.logistica_pct / 100,
    gestion_comercial: r.costo_delben - r.servicios_subtotal1,
    transporte:       r.costo_delben * transp_pct / 100,
    instalacion:      r.costo_delben * instal_pct / 100,
    imprevistos:      r.costo_delben * u.imprevistos_pct / 100,
    utilidad:         r.distribuidor_subtotal2 - universo_aditivo,
    iva:              r.iva_monto,
  }
}

function calcularResumenTotal(cotizacion: Cotizacion, dist: Distribuidor) {
  let base = 0, diseno = 0, cotiz = 0, produccion = 0, logistica = 0,
    gestion = 0, transporte = 0, instalacion = 0, imprevistos = 0,
    utilidad = 0, iva = 0, costoDelben = 0, sinIva = 0

  function acumular(r: ResultadoSnapshot, cantidad: number) {
    const d = calcularDesglose(r, dist, cotizacion.modalidad)
    base        += r.costo_tras_descuentos * cantidad
    diseno      += d.diseno * cantidad
    cotiz       += d.cotizacion * cantidad
    produccion  += d.produccion * cantidad
    logistica   += d.logistica * cantidad
    gestion     += d.gestion_comercial * cantidad
    transporte  += d.transporte * cantidad
    instalacion += d.instalacion * cantidad
    imprevistos += d.imprevistos * cantidad
    utilidad    += d.utilidad * cantidad
    iva         += r.iva_monto * cantidad
    costoDelben += r.costo_delben * cantidad
    sinIva      += r.precio_sin_iva * cantidad
  }

  for (const item of cotizacion.items) {
    acumular(item.resultado, item.config.cantidad)
    for (const h of item.herrajesAsociados) acumular(h.resultado, h.cantidad)
  }
  for (const h of cotizacion.itemsHerraje) acumular(h.resultado, h.cantidad)

  return {
    base, diseno, cotizacion: cotiz, produccion, logistica, gestion,
    transporte, instalacion, imprevistos, utilidad, iva, costoDelben, sinIva,
    transporteFijo: cotizacion.totales.transporteFijo ?? 0,
    instalacionFija: cotizacion.totales.instalacionFija ?? 0,
  }
}

function DetalleGridSnapshot({ item }: { item: ItemCotizacionSnapshot }) {
  const filas: [string, string][] = [
    ['Estructura', item.config.tipoEstructuraNombre],
    ['Fachada', item.config.tipoFachadaNombre],
    ['Subcategoría', item.config.subcategoriaNombre],
    ['Acabado fachada', item.config.acabadoNombre],
    ['Alto × Prof.', `${item.config.altura} × ${item.config.profundidad} mm`],
  ]
  if (item.config.acabadoEstructura) filas.push(['Color estructura', item.config.acabadoEstructura])
  if (item.config.colorVidrio) filas.push(['Vidrio', item.config.colorVidrio])
  if (item.config.colorMetal) filas.push(['Metal', item.config.colorMetal])
  if (item.config.observaciones) filas.push(['Observaciones', item.config.observaciones])

  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {filas.map(([label, valor]) => (
          <div key={label} className="flex gap-2">
            <span className="text-stone-400 shrink-0">{label}:</span>
            <span className="text-stone-700 font-medium">{valor}</span>
          </div>
        ))}
      </div>
      <div className="pt-2 border-t border-stone-200 flex gap-6 flex-wrap">
        <div>
          <span className="text-stone-400">Sin IVA:</span>{' '}
          <span className="font-medium text-stone-700">{formatCOP(item.resultado.precio_sin_iva)}</span>
        </div>
        <div>
          <span className="text-stone-400">Con IVA:</span>{' '}
          <span className="font-semibold text-stone-900">{formatCOP(item.resultado.precio_final_unitario)}</span>
        </div>
        {item.config.cantidad > 1 && (
          <div>
            <span className="text-stone-400">Subtotal:</span>{' '}
            <span className="font-semibold text-stone-900">{formatCOP(item.resultado.subtotal_linea)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function FilaCosto({
  label,
  valor,
  signo,
  resaltado,
  destacado,
}: {
  label: string
  valor: number
  signo?: '+'
  resaltado?: boolean
  destacado?: boolean
}) {
  return (
    <div className={[
      'flex items-center justify-between py-0.5',
      resaltado ? 'font-semibold' : '',
    ].join(' ')}>
      <span className={resaltado ? 'text-stone-700' : 'text-stone-400'}>
        {signo && <span className="mr-1 text-stone-300">{signo}</span>}
        {label}
      </span>
      <span className={[
        'tabular-nums',
        destacado ? 'text-stone-900 text-sm' : resaltado ? 'text-stone-700' : 'text-stone-500',
      ].join(' ')}>
        {formatCOP(valor)}
      </span>
    </div>
  )
}

function HerrajesAsociadosSnapshot({
  herrajes,
  puedeVerCosto,
}: {
  herrajes: HerrajeAsociadoSnapshot[]
  puedeVerCosto: boolean
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
        Herrajes del módulo
      </p>
      <div className="space-y-1">
        {herrajes.map((h, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-stone-600 truncate pr-3">
              {h.nombre}
              <span className="text-stone-400 ml-1.5">×{h.cantidad}</span>
            </span>
            <div className="shrink-0 text-right">
              <span className="font-medium text-stone-700 tabular-nums">
                {formatCOP(h.resultado.subtotal_linea)}
              </span>
              {puedeVerCosto && (
                <span className="block text-stone-400 tabular-nums">
                  costo: {formatCOP(h.resultado.costo_delben * h.cantidad)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
