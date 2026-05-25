'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Minus, Trash, CaretDown, CaretUp, FloppyDisk, CircleNotch, PencilSimple } from '@phosphor-icons/react'
import { useCarrito } from '@/store/carrito'
import type { ItemCarrito, ItemHerrajeCarrito, HerrajeAsociado } from '@/store/carrito'
import { useAuth } from '@/components/providers/auth-provider'
import { getCampanasActivas } from '@/lib/firestore/campanas'
import { getTasaUsdActual } from '@/lib/firestore/config'
import { BuscadorModulos } from '@/components/cotizador/buscador-modulos'
import { FichaModulo } from '@/components/cotizador/ficha-modulo'
import { ModuloImagen } from '@/components/cotizador/modulo-imagen'
import { formatCOP } from '@/lib/datos-demo'

export default function ValoracionBorradorPage() {
  const router = useRouter()
  const { usuario } = useAuth()
  const cotizacionInfo = useCarrito((s) => s.cotizacionInfo)
  const items = useCarrito((s) => s.items)
  const itemsHerraje = useCarrito((s) => s.itemsHerraje)
  const pantallaActiva = useCarrito((s) => s.pantallaActiva)
  const valoracionGuardadaId = useCarrito((s) => s.valoracionGuardadaId)
  const distribuidorData = useCarrito((s) => s.distribuidorData)
  const abrirBuscador = useCarrito((s) => s.abrirBuscador)
  const eliminarItem = useCarrito((s) => s.eliminarItem)
  const eliminarHerraje = useCarrito((s) => s.eliminarHerraje)
  const editarModulo = useCarrito((s) => s.editarModulo)
  const cambiarCantidadItem = useCarrito((s) => s.cambiarCantidadItem)
  const cambiarCantidadHerraje = useCarrito((s) => s.cambiarCantidadHerraje)
  const guardarValoracion = useCarrito((s) => s.guardarValoracion)
  const setCampanas = useCarrito((s) => s.setCampanas)
  const setTasaUsd = useCarrito((s) => s.setTasaUsd)

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)

  useEffect(() => {
    if (!cotizacionInfo) {
      router.replace('/admin/valoraciones/nueva')
    }
  }, [cotizacionInfo, router])

  useEffect(() => {
    getCampanasActivas().then(setCampanas).catch(() => {})
    getTasaUsdActual().then(setTasaUsd).catch(() => {})
  }, [setCampanas, setTasaUsd])

  if (!cotizacionInfo) return null

  const hayItems = items.length > 0 || itemsHerraje.length > 0

  const totalCostoTrasDescuentos =
    items.reduce((s, i) => s + i.resultado.costo_tras_descuentos * i.config.cantidad, 0) +
    items.reduce(
      (s, i) => s + i.herrajesAsociados.reduce((hs, h) => hs + h.resultado.costo_tras_descuentos * h.cantidad, 0),
      0,
    ) +
    itemsHerraje.reduce((s, i) => s + i.resultado.costo_tras_descuentos * i.cantidad, 0)

  const totalCostoDelben =
    items.reduce((s, i) => s + i.resultado.costo_delben * i.config.cantidad, 0) +
    items.reduce(
      (s, i) => s + i.herrajesAsociados.reduce((hs, h) => hs + h.resultado.costo_delben * h.cantidad, 0),
      0,
    ) +
    itemsHerraje.reduce((s, i) => s + i.resultado.costo_delben * i.cantidad, 0)

  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleGuardar() {
    if (!usuario || !distribuidorData) {
      setErrorGuardar('Falta información del distribuidor.')
      return
    }
    setGuardando(true)
    setErrorGuardar(null)
    try {
      const id = await guardarValoracion(distribuidorData.id, distribuidorData.nombre, usuario.uid)
      router.push(`/admin/valoraciones/${id}`)
    } catch {
      setErrorGuardar('Error al guardar. Intenta de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/admin/valoraciones"
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors shrink-0"
            >
              ← Valoraciones
            </Link>
            <div className="h-4 w-px bg-stone-200" />
            <div className="min-w-0">
              <p className="text-xs text-stone-400 truncate">
                {distribuidorData?.nombre ?? '—'} · {cotizacionInfo.clienteNombre}
              </p>
              <p className="text-sm font-semibold text-stone-900 truncate">
                {cotizacionInfo.proyectoNombre}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
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
              {valoracionGuardadaId ? 'Actualizar' : 'Borrador'}
            </span>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Módulos */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-stone-900 tracking-tight">Módulos</h2>
          <button
            onClick={abrirBuscador}
            className="tactil flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:border-stone-300 hover:bg-stone-50 transition-all"
          >
            <Plus size={13} weight="bold" />
            Agregar producto
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 bg-white py-16 text-center">
            <p className="text-sm text-stone-400">Sin módulos aún.</p>
            <p className="mt-1 text-xs text-stone-300">
              Presiona &ldquo;Agregar producto&rdquo; para comenzar.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <CarritoItemRow
                key={item.id}
                item={item}
                expandido={expandidos.has(item.id)}
                onToggle={() => toggleExpandido(item.id)}
                onEliminar={() => eliminarItem(item.id)}
                onEditar={() => editarModulo(item)}
                onCambiarCantidad={(delta) => cambiarCantidadItem(item.id, delta)}
              />
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
              <p className="text-xs text-stone-400">
                Sin herrajes. Búscalos en &ldquo;Agregar producto → Herrajes&rdquo;.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {itemsHerraje.map((item) => (
                <HerrajeItemRow
                  key={item.id}
                  item={item}
                  onEliminar={() => eliminarHerraje(item.id)}
                  onCambiarCantidad={(delta) => cambiarCantidadHerraje(item.id, delta)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Totales internos Delben */}
        {hayItems && (
          <div className="mt-10 space-y-4">
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-4 space-y-3">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Resumen interno Delben
              </p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-stone-500">Costo de producción</p>
                <p className="text-sm font-medium text-stone-700 tabular-nums">
                  {formatCOP(totalCostoTrasDescuentos)}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-stone-200 pt-3">
                <p className="text-sm text-stone-800 font-medium">Precio Delben al distribuidor</p>
                <p className="text-base font-bold text-stone-900 tabular-nums">
                  {formatCOP(totalCostoDelben)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-6 flex-wrap">
              <p className="text-xs text-stone-400">
                {items.length} módulo{items.length !== 1 ? 's' : ''}
                {itemsHerraje.length > 0 &&
                  ` · ${itemsHerraje.length} herraje${itemsHerraje.length !== 1 ? 's' : ''}`}{' '}
                · COP
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGuardar}
                  disabled={guardando || !hayItems}
                  className="tactil flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
                >
                  {guardando ? (
                    <CircleNotch size={16} className="animate-spin" />
                  ) : (
                    <FloppyDisk size={16} />
                  )}
                  {guardando ? 'Guardando…' : valoracionGuardadaId ? 'Actualizar valoración' : 'Guardar valoración'}
                </button>
                {errorGuardar && (
                  <p className="text-xs text-red-600">{errorGuardar}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {pantallaActiva === 'buscador' && <BuscadorModulos />}
      {pantallaActiva === 'ficha' && <FichaModulo />}
    </div>
  )
}

// ─── Fila módulo ──────────────────────────────────────────────────────────────

function CarritoItemRow({
  item,
  expandido,
  onToggle,
  onEliminar,
  onEditar,
  onCambiarCantidad,
}: {
  item: ItemCarrito
  expandido: boolean
  onToggle: () => void
  onEliminar: () => void
  onEditar: () => void
  onCambiarCantidad: (delta: number) => void
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button onClick={onToggle} className="tactil flex-1 flex items-center gap-3 text-left min-w-0">
          <ModuloImagen url={item.modulo.imagen_url} nombre={item.modulo.nombre} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-800 leading-snug truncate">{item.modulo.nombre}</p>
            <p className="text-xs text-stone-400 truncate mt-0.5">
              {item.config.tipoEstructuraNombre} · {item.config.tipoFachadaNombre} · {item.config.acabadoNombre}
            </p>
          </div>
          {expandido ? (
            <CaretUp size={14} className="shrink-0 text-stone-400" weight="bold" />
          ) : (
            <CaretDown size={14} className="shrink-0 text-stone-400" weight="bold" />
          )}
        </button>

        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-stone-900 tabular-nums">
            {formatCOP(item.resultado.costo_delben * item.config.cantidad)}
          </p>
          {item.config.cantidad > 1 && (
            <p className="text-xs text-stone-400 tabular-nums">
              {formatCOP(item.resultado.costo_delben)} c/u
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onCambiarCantidad(-1)}
            className="tactil flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-400 hover:bg-stone-50 hover:text-stone-700 transition-colors"
          >
            <Minus size={11} weight="bold" />
          </button>
          <span className="w-6 text-center text-xs font-semibold text-stone-700 tabular-nums">
            {item.config.cantidad}
          </span>
          <button
            onClick={() => onCambiarCantidad(1)}
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
          <DetalleGrid item={item} />
          {item.herrajesAsociados.length > 0 && (
            <HerrajesAsociadosList herrajes={item.herrajesAsociados} />
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
}: {
  item: ItemHerrajeCarrito
  onEliminar: () => void
  onCambiarCantidad: (delta: number) => void
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-100 text-xs font-semibold text-stone-500">
          {String(item.accesorio.codigo).slice(0, 3)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 leading-snug truncate">{item.accesorio.nombre}</p>
          <p className="text-xs text-stone-400 mt-0.5">cód. {item.accesorio.codigo}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-stone-900 tabular-nums">
            {formatCOP(item.resultado.costo_delben * item.cantidad)}
          </p>
          {item.cantidad > 1 && (
            <p className="text-xs text-stone-400 tabular-nums">
              {formatCOP(item.resultado.costo_delben)} c/u
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onCambiarCantidad(-1)}
            className="tactil flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-400 hover:bg-stone-50 hover:text-stone-700 transition-colors"
          >
            <Minus size={11} weight="bold" />
          </button>
          <span className="w-6 text-center text-xs font-semibold text-stone-700 tabular-nums">
            {item.cantidad}
          </span>
          <button
            onClick={() => onCambiarCantidad(1)}
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
    </div>
  )
}

function HerrajesAsociadosList({ herrajes }: { herrajes: HerrajeAsociado[] }) {
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
            <span className="font-medium text-stone-700 tabular-nums shrink-0">
              {formatCOP(h.resultado.costo_delben * h.cantidad)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DetalleGrid({ item }: { item: ItemCarrito }) {
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
      <div className="col-span-2 mt-2 pt-2 border-t border-stone-200">
        <div className="flex gap-6 flex-wrap">
          <div>
            <span className="text-stone-400">Costo producción:</span>{' '}
            <span className="font-medium text-stone-700">{formatCOP(item.resultado.costo_tras_descuentos)}</span>
          </div>
          <div>
            <span className="text-stone-400">Precio Delben:</span>{' '}
            <span className="font-semibold text-stone-900">{formatCOP(item.resultado.costo_delben)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
