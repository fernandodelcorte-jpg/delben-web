'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CaretDown, CaretUp, CircleNotch } from '@phosphor-icons/react'
import { getCotizacion } from '@/lib/firestore/cotizaciones'
import { getDistribuidor } from '@/lib/firestore/distribuidores'
import { formatCOP } from '@/lib/datos-demo'
import type {
  Cotizacion,
  Distribuidor,
  ItemCotizacionSnapshot,
  ItemHerraCotizacionSnapshot,
  ResultadoSnapshot,
} from '@/lib/firebase/tipos-firestore'

const ETIQUETA_ESTADO: Record<string, { label: string; clases: string }> = {
  borrador: { label: 'Borrador', clases: 'bg-amber-100 text-amber-700' },
  enviada: { label: 'Enviada', clases: 'bg-blue-100 text-blue-700' },
  aceptada: { label: 'Aceptada', clases: 'bg-emerald-100 text-emerald-700' },
}

function formatFecha(ts: number) {
  return new Date(ts).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

// ─── Cálculo de resumen total del proyecto ────────────────────────────────────

function calcularDesglose(r: ResultadoSnapshot, dist: Distribuidor) {
  const base = r.costo_tras_descuentos
  const s = dist.servicios
  const u = dist.universo
  const transp_pct = (u.transporte_tipo ?? 'porcentual') === 'fijo' ? 0 : u.transporte_pct
  const instal_pct = (u.instalacion_tipo ?? 'porcentual') === 'fijo' ? 0 : u.instalacion_pct
  const universo_aditivo = r.costo_delben * (1 + (transp_pct + instal_pct + u.imprevistos_pct) / 100)
  return {
    diseno: base * s.diseno_pct / 100,
    cotizacion: base * s.cotizacion_pct / 100,
    produccion: base * s.produccion_pct / 100,
    logistica: base * s.logistica_pct / 100,
    gestion_comercial: r.costo_delben - r.servicios_subtotal1,
    transporte: r.costo_delben * transp_pct / 100,
    instalacion: r.costo_delben * instal_pct / 100,
    imprevistos: r.costo_delben * u.imprevistos_pct / 100,
    utilidad: r.distribuidor_subtotal2 - universo_aditivo,
    iva: r.iva_monto,
  }
}

function calcularResumenTotal(cotizacion: Cotizacion, dist: Distribuidor) {
  let base = 0, diseno = 0, cotiz = 0, produccion = 0, logistica = 0,
    gestion = 0, transporte = 0, instalacion = 0, imprevistos = 0,
    utilidad = 0, iva = 0, costoDelben = 0, sinIva = 0

  function acumular(r: ResultadoSnapshot, cantidad: number) {
    const d = calcularDesglose(r, dist)
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

// ─── Componentes de display ───────────────────────────────────────────────────

function FilaCosto({
  label, valor, signo, resaltado, destacado,
}: {
  label: string; valor: number; signo?: '+'; resaltado?: boolean; destacado?: boolean
}) {
  return (
    <div className={['flex items-center justify-between py-1', resaltado ? 'font-semibold' : ''].join(' ')}>
      <span className={resaltado ? 'text-stone-700' : 'text-stone-500'}>
        {signo && <span className="mr-1 text-stone-300">{signo}</span>}
        {label}
      </span>
      <span className={[
        'tabular-nums',
        destacado ? 'text-stone-900 text-base' : resaltado ? 'text-stone-700' : 'text-stone-500',
      ].join(' ')}>
        {formatCOP(valor)}
      </span>
    </div>
  )
}

function ResumenCostos({ cotizacion, distribuidor }: { cotizacion: Cotizacion; distribuidor: Distribuidor }) {
  const s = distribuidor.servicios
  const u = distribuidor.universo
  const t = calcularResumenTotal(cotizacion, distribuidor)
  const transp_fijo = (u.transporte_tipo ?? 'porcentual') === 'fijo'
  const instal_fija = (u.instalacion_tipo ?? 'porcentual') === 'fijo'

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6">
      <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
        Desglose de costos del proyecto
      </h2>
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
    </section>
  )
}

function ModuloRow({
  item, expandido, onToggle,
}: {
  item: ItemCotizacionSnapshot; expandido: boolean; onToggle: () => void
}) {
  const filas: [string, string][] = [
    ['Estructura', item.config.tipoEstructuraNombre],
    ['Fachada', item.config.tipoFachadaNombre],
    ['Subcategoría', item.config.subcategoriaNombre],
    ['Acabado', item.config.acabadoNombre],
    ['Alto × Prof.', `${item.config.altura} × ${item.config.profundidad} mm`],
  ]
  if (item.config.acabadoEstructura) filas.push(['Color estructura', item.config.acabadoEstructura])
  if (item.config.colorVidrio) filas.push(['Vidrio', item.config.colorVidrio])
  if (item.config.colorMetal) filas.push(['Metal', item.config.colorMetal])
  if (item.config.observaciones) filas.push(['Observaciones', item.config.observaciones])

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <button onClick={onToggle} className="tactil w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-100 text-xs font-semibold text-stone-500">
          {item.modulo_tipologia.slice(0, 2).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 truncate">{item.modulo_nombre}</p>
          <p className="text-xs text-stone-400 truncate mt-0.5">
            {item.config.tipoEstructuraNombre} · {item.config.tipoFachadaNombre} · {item.config.acabadoNombre} · ×{item.config.cantidad}
          </p>
        </div>
        <div className="shrink-0 text-right ml-4">
          <p className="text-sm font-bold text-stone-900 tabular-nums">{formatCOP(item.resultado.subtotal_linea)}</p>
          <p className="text-xs text-stone-400 tabular-nums">costo: {formatCOP(item.resultado.costo_delben * item.config.cantidad)}</p>
        </div>
        {expandido
          ? <CaretUp size={14} className="shrink-0 text-stone-400 ml-2" weight="bold" />
          : <CaretDown size={14} className="shrink-0 text-stone-400 ml-2" weight="bold" />}
      </button>

      {expandido && (
        <div className="border-t border-stone-100 px-4 py-4 bg-stone-50 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {filas.map(([label, valor]) => (
              <div key={label} className="flex gap-2">
                <span className="text-stone-400 shrink-0">{label}:</span>
                <span className="text-stone-700 font-medium">{valor}</span>
              </div>
            ))}
            <div className="flex gap-2">
              <span className="text-stone-400 shrink-0">Cantidad:</span>
              <span className="text-stone-700 font-medium">{item.config.cantidad}</span>
            </div>
          </div>

          {item.herrajesAsociados.length > 0 && (
            <div className="pt-2 border-t border-stone-200">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Herrajes del módulo
              </p>
              <div className="space-y-1">
                {item.herrajesAsociados.map((h, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-stone-600 truncate pr-3">
                      {h.nombre} <span className="text-stone-400">×{h.cantidad}</span>
                    </span>
                    <span className="font-medium text-stone-700 tabular-nums shrink-0">
                      {formatCOP(h.resultado.subtotal_linea)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HerrajeSueltoRow({ item }: { item: ItemHerraCotizacionSnapshot }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white flex items-center gap-3 px-4 py-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-100 text-xs font-semibold text-stone-500">
        {String(item.codigo).slice(0, 3)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800 truncate">{item.nombre}</p>
        <p className="text-xs text-stone-400 mt-0.5">cód. {item.codigo} · ×{item.cantidad}</p>
      </div>
      <div className="shrink-0 text-right ml-4">
        <p className="text-sm font-bold text-stone-900 tabular-nums">{formatCOP(item.resultado.subtotal_linea)}</p>
        <p className="text-xs text-stone-400 tabular-nums">costo: {formatCOP(item.resultado.costo_delben * item.cantidad)}</p>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AdminCotizacionDetallePage() {
  const { distribuidorId, id } = useParams<{ distribuidorId: string; id: string }>()
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null)
  const [distribuidor, setDistribuidor] = useState<Distribuidor | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())

  useEffect(() => {
    Promise.all([getCotizacion(distribuidorId, id), getDistribuidor(distribuidorId)])
      .then(([cot, dist]) => {
        if (!cot) { setError('Cotización no encontrada.'); return }
        setCotizacion(cot)
        setDistribuidor(dist)
      })
      .catch(() => setError('No se pudo cargar la cotización.'))
      .finally(() => setCargando(false))
  }, [distribuidorId, id])

  function toggleExpandido(i: number) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(i)) { next.delete(i) } else { next.add(i) }
      return next
    })
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-stone-400 text-sm">
        <CircleNotch size={18} className="animate-spin" /> Cargando…
      </div>
    )
  }

  if (error || !cotizacion || !distribuidor) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-stone-500 mb-4">{error ?? 'Cotización no encontrada.'}</p>
        <Link href="/admin/cotizaciones" className="text-sm font-medium text-stone-900 underline">
          ← Volver a cotizaciones
        </Link>
      </div>
    )
  }

  const estado = ETIQUETA_ESTADO[cotizacion.estado] ?? ETIQUETA_ESTADO['borrador']!

  return (
    <div className="max-w-3xl space-y-6">
      {/* Cabecera */}
      <div>
        <Link href="/admin/cotizaciones" className="text-xs text-stone-400 hover:text-stone-600 mb-3 flex items-center gap-1">
          ← Cotizaciones
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-stone-400 mb-0.5">
              {distribuidor.nombre} · {distribuidor.ciudad}, {distribuidor.pais}
            </p>
            <h1 className="text-xl font-semibold text-stone-900">{cotizacion.proyectoNombre}</h1>
            <p className="text-sm text-stone-500 mt-0.5">
              {cotizacion.clienteNombre} · {formatFecha(cotizacion.fecha)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={['rounded-full px-2.5 py-1 text-xs font-semibold', estado.clases].join(' ')}>
              {estado.label}
            </span>
            <span className={[
              'rounded-full px-2.5 py-1 text-xs font-semibold',
              cotizacion.modalidad === 'desarmado' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600',
            ].join(' ')}>
              {cotizacion.modalidad === 'desarmado' ? 'Desarmado' : 'Tradicional'}
            </span>
          </div>
        </div>
      </div>

      {/* Desglose de costos del proyecto */}
      <ResumenCostos cotizacion={cotizacion} distribuidor={distribuidor} />

      {/* Módulos */}
      {cotizacion.items.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Módulos ({cotizacion.items.length})
          </h2>
          <div className="space-y-2">
            {cotizacion.items.map((item, i) => (
              <ModuloRow
                key={i}
                item={item}
                expandido={expandidos.has(i)}
                onToggle={() => toggleExpandido(i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Herrajes sueltos */}
      {cotizacion.itemsHerraje.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Herrajes sueltos ({cotizacion.itemsHerraje.length})
          </h2>
          <div className="space-y-2">
            {cotizacion.itemsHerraje.map((item, i) => (
              <HerrajeSueltoRow key={i} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Totales */}
      <div className="rounded-xl border border-stone-200 bg-white px-5 py-5 space-y-2">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
          Totales
        </h2>
        <div className="flex justify-between text-sm">
          <span className="text-stone-600">Módulos</span>
          <span className="font-medium tabular-nums">{formatCOP(cotizacion.totales.totalModulos)}</span>
        </div>
        {cotizacion.totales.totalHerrajesAsociados > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">Herrajes de módulos</span>
            <span className="font-medium tabular-nums">{formatCOP(cotizacion.totales.totalHerrajesAsociados)}</span>
          </div>
        )}
        {cotizacion.totales.totalHerrajes > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">Herrajes sueltos</span>
            <span className="font-medium tabular-nums">{formatCOP(cotizacion.totales.totalHerrajes)}</span>
          </div>
        )}
        {(cotizacion.totales.transporteFijo ?? 0) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">Transporte (fijo)</span>
            <span className="font-medium tabular-nums">{formatCOP(cotizacion.totales.transporteFijo!)}</span>
          </div>
        )}
        {(cotizacion.totales.instalacionFija ?? 0) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">Instalación (fija)</span>
            <span className="font-medium tabular-nums">{formatCOP(cotizacion.totales.instalacionFija!)}</span>
          </div>
        )}
        <div className="border-t border-stone-200 pt-2 flex justify-between">
          <span className="text-sm font-semibold text-stone-900">Total con IVA</span>
          <span className="text-lg font-bold text-stone-900 tabular-nums">{formatCOP(cotizacion.totales.total)}</span>
        </div>
      </div>
    </div>
  )
}
