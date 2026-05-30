'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Plus, Minus, Trash, CaretDown, CaretUp, FloppyDisk, CircleNotch, PencilSimple, ArrowLeft, Sparkle } from '@phosphor-icons/react'
import { useCarrito, calcularTotalesCotizacion } from '@/store/carrito'
import type { ItemCarrito, ItemHerrajeCarrito, HerrajeAsociado, ItemEspecial } from '@/store/carrito'
import { useAuth } from '@/components/providers/auth-provider'
import { getCampanasActivas } from '@/lib/firestore/campanas'
import { getTasaUsdActual, getLogoDelben } from '@/lib/firestore/config'
import { getDistribuidor } from '@/lib/firestore/distribuidores'
import { BuscadorModulos } from '@/components/cotizador/buscador-modulos'
import { FichaModulo } from '@/components/cotizador/ficha-modulo'
import { ModuloImagen } from '@/components/cotizador/modulo-imagen'
import { formatCOP } from '@/lib/datos-demo'
import {
  itemCarritoToPDF,
  herrajeCarritoToPDF,
  especialCarritoToPDF,
  cotizacionInfoToInfoPDF,
  urlADataUrl,
} from '@/lib/pdf-helpers'
import { getUniversoParaModalidad } from '@/lib/firebase/tipos-firestore'

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

export default function BorradorPage() {
  const router = useRouter()
  const { usuario, rol, distribuidorId } = useAuth()
  const cotizacionInfo = useCarrito((s) => s.cotizacionInfo)
  const items = useCarrito((s) => s.items)
  const itemsHerraje = useCarrito((s) => s.itemsHerraje)
  const pantallaActiva = useCarrito((s) => s.pantallaActiva)
  const cotizacionGuardadaId = useCarrito((s) => s.cotizacionGuardadaId)
  const abrirBuscador = useCarrito((s) => s.abrirBuscador)
  const eliminarItem = useCarrito((s) => s.eliminarItem)
  const eliminarHerraje = useCarrito((s) => s.eliminarHerraje)
  const editarModulo = useCarrito((s) => s.editarModulo)
  const cambiarCantidadItem = useCarrito((s) => s.cambiarCantidadItem)
  const cambiarCantidadHerraje = useCarrito((s) => s.cambiarCantidadHerraje)
  const itemsEspeciales = useCarrito((s) => s.itemsEspeciales)
  const eliminarEspecial = useCarrito((s) => s.eliminarEspecial)
  const cambiarCantidadEspecial = useCarrito((s) => s.cambiarCantidadEspecial)
  const guardar = useCarrito((s) => s.guardar)
  const setCampanas = useCarrito((s) => s.setCampanas)
  const setTasaUsd = useCarrito((s) => s.setTasaUsd)
  const actualizarCostosProyecto = useCarrito((s) => s.actualizarCostosProyecto)
  const distribuidorData = useCarrito((s) => s.distribuidorData)

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)
  const [logoDelben, setLogoDelben] = useState<string | null>(null)
  const [logoDistribuidorData, setLogoDistribuidorData] = useState<string | null>(null)
  const [logoDelbenData, setLogoDelbenData] = useState<string | null>(null)

  const modalidadBorrador = cotizacionInfo?.modalidad ?? 'desarmado'
  const universoModal = distribuidorData ? getUniversoParaModalidad(distribuidorData.universo, modalidadBorrador) : null
  const usaTransporteFijo = (universoModal?.transporte_tipo ?? 'porcentual') === 'fijo'
  const usaInstalacionFija = (universoModal?.instalacion_tipo ?? 'porcentual') === 'fijo'
  const [transporteInput, setTransporteInput] = useState(
    cotizacionInfo?.transporteFijo ? String(cotizacionInfo.transporteFijo) : '',
  )
  const [instalacionInput, setInstalacionInput] = useState(
    cotizacionInfo?.instalacionFija ? String(cotizacionInfo.instalacionFija) : '',
  )

  function onCambiarCostosProyecto(transp: string, instal: string) {
    const t = parseFloat(transp.replace(/\./g, '').replace(',', '.')) || 0
    const i = parseFloat(instal.replace(/\./g, '').replace(',', '.')) || 0
    actualizarCostosProyecto(t, i)
  }

  const puedeVerCosto = rol !== 'distribuidor_comercial'

  useEffect(() => {
    if (!cotizacionInfo) {
      router.replace('/cotizaciones/nueva')
    }
  }, [cotizacionInfo, router])

  useEffect(() => {
    getCampanasActivas().then(setCampanas).catch(() => {})
    getTasaUsdActual().then(setTasaUsd).catch(() => {})
    getLogoDelben().then((url) => {
      setLogoDelben(url)
      if (url) urlADataUrl(url).then(setLogoDelbenData).catch(() => {})
    }).catch(() => {})
  }, [setCampanas, setTasaUsd])

  useEffect(() => {
    if (!distribuidorId) return
    getDistribuidor(distribuidorId).then((dist) => {
      const url = dist?.logo_url
      if (url) urlADataUrl(url).then(setLogoDistribuidorData).catch(() => setLogoDistribuidorData(null))
      else setLogoDistribuidorData(null)
    }).catch(() => {})
  }, [distribuidorId])

  if (!cotizacionInfo) return null

  // Total canónico: misma función que usa guardar() y los PDFs. Incluye
  // muebles especiales + transporte/instalación fijos.
  const { total } = calcularTotalesCotizacion(
    items,
    itemsHerraje,
    itemsEspeciales,
    cotizacionInfo.transporteFijo,
    cotizacionInfo.instalacionFija,
  )
  const hayItems = items.length > 0 || itemsHerraje.length > 0 || itemsEspeciales.length > 0

  const totalCostoDelben = puedeVerCosto
    ? items.reduce((s, i) => s + i.resultado.costo_delben * i.config.cantidad, 0) +
      items.reduce(
        (s, i) =>
          s + i.herrajesAsociados.reduce((hs, h) => hs + h.resultado.costo_delben * h.cantidad, 0),
        0,
      ) +
      itemsHerraje.reduce((s, i) => s + i.resultado.costo_delben * i.cantidad, 0) +
      itemsEspeciales.reduce((s, i) => s + i.precioDelbenUnitario * i.cantidad, 0)
    : 0

  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleGuardar() {
    if (!distribuidorId || !usuario) {
      setErrorGuardar('No tienes un distribuidor asociado.')
      return
    }
    setGuardando(true)
    setErrorGuardar(null)
    try {
      const id = await guardar(distribuidorId, usuario.uid)
      router.push(`/cotizaciones/${id}`)
    } catch {
      setErrorGuardar('Error al guardar. Intenta de nuevo.')
      setGuardando(false)
    }
  }

  const yaGuardada = !!cotizacionGuardadaId

  return (
    <>
      <div className="max-w-4xl animate-aparecer">
      {/* Breadcrumb + contexto */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/cotizaciones"
            className="tactil flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors shrink-0"
          >
            <ArrowLeft size={12} weight="bold" />
            Cotizaciones
          </Link>
          <div className="h-3.5 w-px bg-stone-200" />
          <div className="min-w-0">
            <p className="text-xs text-stone-400 truncate">
              {cotizacionInfo.clienteNombre}
            </p>
            <p className="text-sm font-semibold text-stone-900 truncate">
              {cotizacionInfo.proyectoNombre}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={[
              'rounded-full px-2.5 py-1 text-xs font-semibold',
              cotizacionInfo.modalidad === 'desarmado'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600',
            ].join(' ')}
          >
            {cotizacionInfo.modalidad === 'desarmado' ? 'Desarmado' : 'Tradicional'}
          </span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
            {yaGuardada ? 'Actualizar' : 'Borrador'}
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div>
        {/* Módulos */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-stone-900 tracking-tight">Módulos</h2>
          <button
            onClick={abrirBuscador}
            className="tactil flex items-center gap-1.5 rounded-lg bg-caoba-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-caoba-700 transition-all"
          >
            <Plus size={13} weight="bold" />
            Agregar producto
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 bg-white py-14 text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-caoba-50 mb-3">
              <Plus size={18} weight="bold" className="text-caoba-500" />
            </div>
            <p className="text-sm font-semibold text-stone-700">Sin módulos aún</p>
            <p className="mt-1 text-xs text-stone-400">
              Usa &ldquo;Agregar producto&rdquo; para comenzar.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden divide-y divide-stone-100">
            {items.map((item, i) => (
              <div key={item.id} className="animate-aparecer" style={{ animationDelay: `${Math.min(i, 4) * 40}ms` }}>
                <CarritoItemRow
                  item={item}
                  expandido={expandidos.has(item.id)}
                  onToggle={() => toggleExpandido(item.id)}
                  onEliminar={() => eliminarItem(item.id)}
                  onEditar={() => editarModulo(item)}
                  onCambiarCantidad={(delta) => cambiarCantidadItem(item.id, delta)}
                  puedeVerCosto={puedeVerCosto}
                />
              </div>
            ))}
          </div>
        )}

        {/* Herrajes sueltos */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-900 tracking-tight">Herrajes</h2>
          </div>

          {itemsHerraje.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-200 bg-white py-8 text-center">
              <p className="text-xs text-stone-500 font-medium">Sin herrajes</p>
              <p className="mt-1 text-xs text-stone-400">Búscalos en Agregar producto → Herrajes.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-white overflow-hidden divide-y divide-stone-100">
              {itemsHerraje.map((item, i) => (
                <div key={item.id} className="animate-aparecer" style={{ animationDelay: `${Math.min(i, 4) * 40}ms` }}>
                  <HerrajeItemRow
                    item={item}
                    onEliminar={() => eliminarHerraje(item.id)}
                    onCambiarCantidad={(delta) => cambiarCantidadHerraje(item.id, delta)}
                    puedeVerCosto={puedeVerCosto}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Módulos especiales */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-900 tracking-tight flex items-center gap-1.5">
              <Sparkle size={14} weight="fill" className="text-stone-400" />
              Especiales
            </h2>
          </div>
          {itemsEspeciales.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-200 bg-white py-8 text-center">
              <p className="text-xs text-stone-500 font-medium">Sin especiales</p>
              <p className="mt-1 text-xs text-stone-400">Agregar producto → Crear módulo especial.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-white overflow-hidden divide-y divide-stone-100">
              {itemsEspeciales.map((item, i) => (
                <div key={item.id} className="animate-aparecer" style={{ animationDelay: `${Math.min(i, 4) * 40}ms` }}>
                  <EspecialItemRow
                    item={item}
                    onEliminar={() => eliminarEspecial(item.id)}
                    onCambiarCantidad={(delta) => cambiarCantidadEspecial(item.id, delta)}
                    puedeVerCosto={puedeVerCosto}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Costos fijos de proyecto (transporte/instalación manual) */}
        {(usaTransporteFijo || usaInstalacionFija) && puedeVerCosto && (
          <div className="mt-8 rounded-xl border border-stone-200 bg-white p-5">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
              Costos fijos del proyecto
            </p>
            <div className="grid grid-cols-2 gap-4">
              {usaTransporteFijo && (
                <div>
                  <label className="block text-xs text-stone-500 mb-1.5">
                    Transporte ({distribuidorData?.pais === 'Venezuela' || distribuidorData?.pais === 'USA' ? 'USD' : 'COP'})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={transporteInput}
                    onChange={(e) => {
                      setTransporteInput(e.target.value)
                      onCambiarCostosProyecto(e.target.value, instalacionInput)
                    }}
                    placeholder="0"
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400 tabular-nums"
                  />
                </div>
              )}
              {usaInstalacionFija && (
                <div>
                  <label className="block text-xs text-stone-500 mb-1.5">
                    Instalación ({distribuidorData?.pais === 'Venezuela' || distribuidorData?.pais === 'USA' ? 'USD' : 'COP'})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={instalacionInput}
                    onChange={(e) => {
                      setInstalacionInput(e.target.value)
                      onCambiarCostosProyecto(transporteInput, e.target.value)
                    }}
                    placeholder="0"
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400 tabular-nums"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Totales + acciones */}
        {hayItems && (
          <div className="mt-10 space-y-4">
            {/* Costo Delben (orden de compra) — solo visible para roles con acceso */}
            {puedeVerCosto && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-4">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                  Resumen orden de compra (costo Delben)
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-stone-600">Total costo a Delben</p>
                  <p className="text-sm font-bold text-stone-900 tabular-nums">
                    {formatCOP(totalCostoDelben)}
                  </p>
                </div>
              </div>
            )}

            {/* Totales cliente + PDF + guardar */}
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <CotizacionPDFButton
                  info={cotizacionInfoToInfoPDF(cotizacionInfo, {
                    logoDistribuidorUrl: logoDistribuidorData,
                    logoDelbenUrl: logoDelbenData,
                  })}
                  items={items.map(itemCarritoToPDF)}
                  herrajesSueltos={itemsHerraje.map(herrajeCarritoToPDF)}
                  especiales={itemsEspeciales.map(especialCarritoToPDF)}
                />
                {puedeVerCosto && (
                  <OrdenCompraPDFButton
                    info={cotizacionInfoToInfoPDF(cotizacionInfo, {
                      logoDistribuidorUrl: logoDistribuidorData,
                      logoDelbenUrl: logoDelbenData,
                    })}
                    items={items.map(itemCarritoToPDF)}
                    herrajesSueltos={itemsHerraje.map(herrajeCarritoToPDF)}
                    especiales={itemsEspeciales.map(especialCarritoToPDF)}
                    distribuidorNombre={distribuidorData?.nombre}
                  />
                )}
                <button
                  onClick={handleGuardar}
                  disabled={guardando || !hayItems}
                  className="tactil flex items-center gap-2 rounded-lg bg-caoba-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-caoba-700 disabled:opacity-50 transition-colors"
                >
                  {guardando ? (
                    <CircleNotch size={16} className="animate-spin" />
                  ) : (
                    <FloppyDisk size={16} />
                  )}
                  {guardando ? 'Guardando…' : yaGuardada ? 'Actualizar' : 'Guardar cotización'}
                </button>
                {errorGuardar && (
                  <p className="text-xs text-red-600">{errorGuardar}</p>
                )}
              </div>

              <div className="text-right">
                <p className="text-xs text-stone-400 mb-1">Total con IVA</p>
                <p className="text-2xl font-bold text-stone-900 tabular-nums">
                  {formatCOP(total)}
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  {items.length} módulo{items.length !== 1 ? 's' : ''}
                  {itemsHerraje.length > 0 &&
                    ` · ${itemsHerraje.length} herraje${itemsHerraje.length !== 1 ? 's' : ''}`}{' '}
                  · COP
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
      {pantallaActiva === 'buscador' && <BuscadorModulos />}
      {pantallaActiva === 'ficha' && <FichaModulo />}
    </>
  )
}

// ─── Fila de ítem ─────────────────────────────────────────────────────────────

function CarritoItemRow({
  item,
  expandido,
  onToggle,
  onEliminar,
  onEditar,
  onCambiarCantidad,
  puedeVerCosto,
}: {
  item: ItemCarrito
  expandido: boolean
  onToggle: () => void
  onEliminar: () => void
  onEditar: () => void
  onCambiarCantidad: (delta: number) => void
  puedeVerCosto: boolean
}) {
  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          onClick={onToggle}
          className="tactil flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <ModuloImagen url={item.modulo.imagen_url} nombre={item.modulo.nombre} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-800 leading-snug truncate">
              {item.modulo.nombre}
            </p>
            <p className="text-xs text-stone-400 truncate mt-0.5">
              {item.config.tipoEstructuraNombre} · {item.config.tipoFachadaNombre} ·{' '}
              {item.config.acabadoNombre}
            </p>
            {item.config.observaciones && (
              <p className="text-xs text-stone-500 italic truncate mt-0.5">
                {item.config.observaciones}
              </p>
            )}
          </div>
          {expandido ? (
            <CaretUp size={14} className="shrink-0 text-stone-400" weight="bold" />
          ) : (
            <CaretDown size={14} className="shrink-0 text-stone-400" weight="bold" />
          )}
        </button>

        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-stone-900 tabular-nums">
            {formatCOP(item.resultado.subtotal_linea)}
          </p>
          {item.config.cantidad > 1 && (
            <p className="text-xs text-stone-400 tabular-nums">
              {formatCOP(item.resultado.precio_final_unitario)} c/u
            </p>
          )}
          {puedeVerCosto && (
            <p className="text-xs text-stone-400 tabular-nums">
              costo: {formatCOP(item.resultado.costo_delben * item.config.cantidad)}
              {item.config.cantidad > 1 && ` · ${formatCOP(item.resultado.costo_delben)} c/u`}
            </p>
          )}
        </div>

        {/* Controles de cantidad */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onCambiarCantidad(-0.5)}
            className="tactil flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-400 hover:bg-stone-50 hover:text-stone-700 transition-colors"
          >
            <Minus size={11} weight="bold" />
          </button>
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={item.config.cantidad}
            onChange={(e) => {
              const n = parseFloat(e.target.value)
              if (!isNaN(n) && n > 0) onCambiarCantidad(parseFloat((n - item.config.cantidad).toFixed(4)))
            }}
            className="w-10 text-center text-xs font-semibold text-stone-700 tabular-nums bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onClick={() => onCambiarCantidad(0.5)}
            className="tactil flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-400 hover:bg-stone-50 hover:text-stone-700 transition-colors"
          >
            <Plus size={11} weight="bold" />
          </button>
        </div>

        <button
          onClick={onEditar}
          className="tactil shrink-0 rounded-md p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          title="Editar módulo"
        >
          <PencilSimple size={15} weight="bold" />
        </button>

        <button
          onClick={onEliminar}
          className="tactil shrink-0 rounded-md p-1.5 text-stone-300 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <Trash size={15} weight="bold" />
        </button>
      </div>

      {expandido && (
        <div className="border-t border-stone-100 px-4 py-4 bg-stone-50 space-y-4">
          <DetalleGrid item={item} puedeVerCosto={puedeVerCosto} />
          {item.herrajesAsociados.length > 0 && (
            <HerrajesAsociadosList herrajes={item.herrajesAsociados} puedeVerCosto={puedeVerCosto} />
          )}
        </div>
      )}
    </div>
  )
}

function HerrajeItemRow({
  item,
  onEliminar,
  onCambiarCantidad,
  puedeVerCosto,
}: {
  item: ItemHerrajeCarrito
  onEliminar: () => void
  onCambiarCantidad: (delta: number) => void
  puedeVerCosto: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-100 text-xs font-semibold text-stone-500">
          {String(item.accesorio.codigo).slice(0, 3)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 leading-snug truncate">
            {item.accesorio.nombre}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            cód. {item.accesorio.codigo}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-stone-900 tabular-nums">
            {formatCOP(item.resultado.subtotal_linea)}
          </p>
          {item.cantidad > 1 && !puedeVerCosto && (
            <p className="text-xs text-stone-400 tabular-nums">
              {formatCOP(item.resultado.precio_final_unitario)} c/u
            </p>
          )}
          {puedeVerCosto && (
            <p className="text-xs text-stone-400 tabular-nums">
              costo: {formatCOP(item.resultado.costo_delben * item.cantidad)}
              {item.cantidad > 1 && ` · ${formatCOP(item.resultado.costo_delben)} c/u`}
            </p>
          )}
        </div>

        {/* Controles de cantidad */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onCambiarCantidad(-0.5)}
            className="tactil flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-400 hover:bg-stone-50 hover:text-stone-700 transition-colors"
          >
            <Minus size={11} weight="bold" />
          </button>
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={item.cantidad}
            onChange={(e) => {
              const n = parseFloat(e.target.value)
              if (!isNaN(n) && n > 0) onCambiarCantidad(parseFloat((n - item.cantidad).toFixed(4)))
            }}
            className="w-10 text-center text-xs font-semibold text-stone-700 tabular-nums bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onClick={() => onCambiarCantidad(0.5)}
            className="tactil flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-400 hover:bg-stone-50 hover:text-stone-700 transition-colors"
          >
            <Plus size={11} weight="bold" />
          </button>
        </div>

        <button
          onClick={onEliminar}
          className="tactil shrink-0 rounded-md p-1.5 text-stone-300 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <Trash size={15} weight="bold" />
        </button>
      </div>
  )
}

function HerrajesAsociadosList({
  herrajes,
  puedeVerCosto,
}: {
  herrajes: HerrajeAsociado[]
  puedeVerCosto: boolean
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
        Herrajes del módulo
      </p>
      <div className="space-y-1">
        {herrajes.map((h) => (
          <div key={h.accesorio.id} className="flex items-center justify-between text-xs">
            <span className="text-stone-600 truncate pr-3">
              {h.accesorio.nombre}
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

function EspecialItemRow({
  item,
  onEliminar,
  onCambiarCantidad,
  puedeVerCosto,
}: {
  item: ItemEspecial
  onEliminar: () => void
  onCambiarCantidad: (delta: number) => void
  puedeVerCosto: boolean
}) {
  const dims = [
    item.ancho ? `${item.ancho}` : null,
    `${item.alto}`,
    `${item.profundidad}`,
  ].filter(Boolean).join(' × ')

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100">
          <Sparkle size={14} weight="fill" className="text-stone-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 leading-snug truncate">{item.nombre}</p>
          <p className="text-xs text-stone-400 truncate mt-0.5">
            {[
              item.tipoEstructuraNombre,
              item.tipoFachadaNombre,
              item.acabadoNombre,
              dims ? `${dims} mm` : null,
            ].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-stone-900 tabular-nums">
            {formatCOP(item.precioClienteUnitario * item.cantidad)}
          </p>
          {puedeVerCosto && (
            <p className="text-xs text-stone-400 tabular-nums">
              costo: {formatCOP(item.precioDelbenUnitario * item.cantidad)}
            </p>
          )}
          {item.cantidad > 1 && (
            <p className="text-xs text-stone-400 tabular-nums">
              {formatCOP(item.precioClienteUnitario)} c/u
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onCambiarCantidad(-0.5)}
            className="tactil flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-400 hover:bg-stone-50 hover:text-stone-700 transition-colors"
          >
            <Minus size={11} weight="bold" />
          </button>
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={item.cantidad}
            onChange={(e) => {
              const n = parseFloat(e.target.value)
              if (!isNaN(n) && n > 0) onCambiarCantidad(parseFloat((n - item.cantidad).toFixed(4)))
            }}
            className="w-10 text-center text-xs font-semibold text-stone-700 tabular-nums bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onClick={() => onCambiarCantidad(0.5)}
            className="tactil flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-400 hover:bg-stone-50 hover:text-stone-700 transition-colors"
          >
            <Plus size={11} weight="bold" />
          </button>
        </div>

        <button
          onClick={onEliminar}
          className="tactil shrink-0 rounded-md p-1.5 text-stone-300 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <Trash size={15} weight="bold" />
        </button>
      </div>
      {(item.observaciones || item.moduloReferenciaNombre) && (
        <div className="border-t border-stone-100 px-4 py-2.5 bg-stone-50 flex items-center gap-4 flex-wrap text-xs text-stone-400">
          {item.moduloReferenciaNombre && (
            <span>Ref: <span className="text-stone-600">{item.moduloReferenciaNombre}</span></span>
          )}
          {item.observaciones && <span>{item.observaciones}</span>}
        </div>
      )}
    </div>
  )
}

function DetalleGrid({
  item,
  puedeVerCosto,
}: {
  item: ItemCarrito
  puedeVerCosto: boolean
}) {
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
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
      {filas.map(([label, valor]) => (
        <div key={label} className="flex gap-2">
          <span className="text-stone-400 shrink-0">{label}:</span>
          <span className="text-stone-700 font-medium">{valor}</span>
        </div>
      ))}

      {/* Precios */}
      <div className="col-span-2 mt-2 pt-2 border-t border-stone-200">
        <div className="flex gap-6 flex-wrap">
          <div>
            <span className="text-stone-400">Sin IVA:</span>{' '}
            <span className="font-medium text-stone-700">
              {formatCOP(item.resultado.precio_sin_iva)}
            </span>
          </div>
          <div>
            <span className="text-stone-400">Con IVA:</span>{' '}
            <span className="font-semibold text-stone-900">
              {formatCOP(item.resultado.precio_final_unitario)}
            </span>
          </div>
          {puedeVerCosto && (
            <div>
              <span className="text-stone-400">Costo Delben:</span>{' '}
              <span className="font-medium text-stone-500">
                {formatCOP(item.resultado.costo_delben)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
