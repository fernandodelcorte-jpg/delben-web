'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { CircleNotch, PencilSimple, CheckCircle } from '@phosphor-icons/react'
import { getValoracion, marcarComoFacturada, totalCostoDelbenDeValoracion } from '@/lib/firestore/valoraciones'
import { getSede } from '@/lib/firestore/sedes'
import { BotonDuplicar } from '@/components/cotizador/boton-duplicar'
import { formatCOP } from '@/lib/datos-demo'
import { useCarrito } from '@/store/carrito'
import {
  itemValoracionSnapshotToPDF,
  herrajeValoracionSnapshotToPDF,
  especialValoracionSnapshotToPDF,
  type InfoPDF,
} from '@/lib/pdf-helpers'
import { ValoracionPDFButton } from '@/components/cotizador/valoracion-pdf-button'
import { ValoracionExcelButton } from '@/components/cotizador/valoracion-excel-button'
import type { Valoracion } from '@/lib/firebase/tipos-firestore'
import type { ValoracionItemSnapshot, ValoracionItemHerrajeSnapshot } from '@/lib/firebase/tipos-firestore'

function formatFecha(ts: number) {
  return new Date(ts).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default function ValoracionDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const reabrirValoracion = useCarrito((s) => s.reabrirValoracion)
  const copiarValoracion = useCarrito((s) => s.copiarValoracion)
  const [valoracion, setValoracion] = useState<Valoracion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [marcando, setMarcando] = useState(false)

  useEffect(() => {
    getValoracion(id)
      .then(setValoracion)
      .finally(() => setCargando(false))
  }, [id])

  async function handleMarcarFacturada() {
    if (!valoracion) return
    setMarcando(true)
    try {
      await marcarComoFacturada(valoracion.id)
      setValoracion((v) => v ? { ...v, estado: 'facturada' } : v)
    } finally {
      setMarcando(false)
    }
  }

  async function handleEditar() {
    if (!valoracion) return
    // La sede viaja con la valoración para que el motor use sus condiciones al editar.
    const sede = await getSede(valoracion.distribuidor_id, valoracion.sede_id).catch(() => null)
    reabrirValoracion(valoracion, sede)
    router.push('/admin/valoraciones/borrador')
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-stone-400 text-sm">
        <CircleNotch size={18} className="animate-spin" />
        Cargando…
      </div>
    )
  }

  if (!valoracion) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-stone-500">Valoración no encontrada.</p>
        <Link href="/admin/valoraciones" className="mt-2 inline-block text-xs text-stone-400 underline hover:text-stone-700">
          Volver a valoraciones
        </Link>
      </div>
    )
  }

  // Subtotales de COSTO Delben (la valoración es interna: nunca muestra venta/IVA).
  const costoModulos = valoracion.items.reduce(
    (s, it) => s + it.resultado.costo_delben * it.config.cantidad,
    0,
  )
  const costoHerrajesAsociados = valoracion.items.reduce(
    (s, it) => s + it.herrajesAsociados.reduce((hs, h) => hs + h.resultado.costo_delben * h.cantidad, 0),
    0,
  )
  const costoHerrajesSueltos = valoracion.itemsHerraje.reduce(
    (s, it) => s + it.resultado.costo_delben * it.cantidad,
    0,
  )
  const costoEspeciales = (valoracion.itemsEspeciales ?? []).reduce(
    (s, e) => s + e.precioDelbenUnitario * e.cantidad,
    0,
  )
  const totalCostoDelben = totalCostoDelbenDeValoracion(valoracion)

  // Datos para PDF/Excel de la valoración: SOLO costo Delben (conversores solo-costo).
  const moneda: 'COP' | 'USD' =
    valoracion.items[0]?.resultado.moneda ??
    valoracion.itemsHerraje[0]?.resultado.moneda ??
    'COP'
  const infoParaPDF: InfoPDF = {
    clienteNombre: valoracion.clienteNombre,
    proyectoNombre: valoracion.proyectoNombre,
    fecha: new Date(valoracion.createdAt),
    modalidad: valoracion.modalidad,
    moneda,
    distribuidorNombre: valoracion.distribuidor_nombre,
  }
  const itemsPDF = valoracion.items.map(itemValoracionSnapshotToPDF)
  const herrajesPDF = valoracion.itemsHerraje.map(herrajeValoracionSnapshotToPDF)
  const especialesPDF = (valoracion.itemsEspeciales ?? []).map(especialValoracionSnapshotToPDF)

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin/valoraciones"
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            ← Valoraciones
          </Link>
          <h1 className="mt-2 text-lg font-semibold text-stone-900">{valoracion.proyectoNombre}</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {valoracion.distribuidor_nombre} · {valoracion.clienteNombre}
          </p>
          {valoracion.numero_op && (
            <p className="text-xs text-stone-500 mt-1">
              OP: <span className="font-semibold text-stone-700 tabular-nums">{valoracion.numero_op}</span>
            </p>
          )}
          <p className="text-xs text-stone-400 mt-1">{formatFecha(valoracion.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={[
              'rounded-full px-3 py-1 text-xs font-semibold',
              valoracion.modalidad === 'desarmado' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600',
            ].join(' ')}
          >
            {valoracion.modalidad === 'desarmado' ? 'Desarmado' : 'Tradicional'}
          </span>
          <span
            className={[
              'rounded-full px-3 py-1 text-xs font-semibold',
              valoracion.estado === 'facturada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
            ].join(' ')}
          >
            {valoracion.estado === 'facturada' ? 'Facturada' : 'Borrador'}
          </span>
          {/* Duplicar — pide nombre de la copia; disponible para cualquier estado */}
          <BotonDuplicar
            nombreActual={valoracion.proyectoNombre}
            onConfirmar={async (nombre) => {
              // La sede viaja para que el motor use sus condiciones. No toca la original.
              const sede = await getSede(valoracion.distribuidor_id, valoracion.sede_id).catch(() => null)
              copiarValoracion(valoracion, sede, nombre)
              router.push('/admin/valoraciones/borrador')
            }}
          />
          {valoracion.estado === 'borrador' && (
            <button
              onClick={handleEditar}
              className="tactil flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:border-stone-300 transition-colors"
            >
              <PencilSimple size={13} weight="bold" />
              Editar
            </button>
          )}
          {valoracion.estado === 'borrador' && (
            <button
              onClick={handleMarcarFacturada}
              disabled={marcando}
              className="tactil flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {marcando ? (
                <CircleNotch size={13} className="animate-spin" />
              ) : (
                <CheckCircle size={13} weight="bold" />
              )}
              Marcar como facturada
            </button>
          )}
        </div>
      </div>

      {/* Descargas — documento interno de Delben: SOLO costo Delben, sin venta ni IVA */}
      <div className="flex items-center gap-3 flex-wrap">
        <ValoracionPDFButton
          info={infoParaPDF}
          items={itemsPDF}
          herrajesSueltos={herrajesPDF}
          especiales={especialesPDF}
          distribuidorNombre={valoracion.distribuidor_nombre}
        />
        <ValoracionExcelButton
          info={infoParaPDF}
          items={itemsPDF}
          herrajesSueltos={herrajesPDF}
          especiales={especialesPDF}
          distribuidorNombre={valoracion.distribuidor_nombre}
          numeroOp={valoracion.numero_op}
        />
      </div>

      {/* Módulos */}
      {valoracion.items.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Módulos ({valoracion.items.length})
          </h2>
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100 overflow-hidden">
            {valoracion.items.map((item, i) => (
              <ItemRow key={i} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Herrajes sueltos */}
      {valoracion.itemsHerraje.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Herrajes sueltos ({valoracion.itemsHerraje.length})
          </h2>
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100 overflow-hidden">
            {valoracion.itemsHerraje.map((item, i) => (
              <HerrajeRow key={i} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Totales — documento interno: COSTO DELBEN antes de IVA (sin venta, sin IVA) */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-3">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
          Resumen económico
        </h2>
        {costoModulos > 0 && <FilaTotales label="Módulos" valor={costoModulos} />}
        {costoHerrajesAsociados > 0 && (
          <FilaTotales label="Herrajes asociados" valor={costoHerrajesAsociados} />
        )}
        {costoHerrajesSueltos > 0 && (
          <FilaTotales label="Herrajes sueltos" valor={costoHerrajesSueltos} />
        )}
        {costoEspeciales > 0 && (
          <FilaTotales label="Muebles especiales" valor={costoEspeciales} />
        )}
        <div className="border-t border-stone-100 pt-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-900">Total costo Delben</p>
          <p className="text-lg font-bold text-stone-900 tabular-nums">{formatCOP(totalCostoDelben)}</p>
        </div>
      </div>
    </div>
  )
}

function ItemRow({ item }: { item: ValoracionItemSnapshot }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800">{item.modulo_nombre}</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {item.config.tipoEstructuraNombre} · {item.config.tipoFachadaNombre} · {item.config.acabadoNombre}
            {item.config.cantidad > 1 && ` · ×${item.config.cantidad}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-stone-900 tabular-nums">
            {formatCOP(item.resultado.costo_delben * item.config.cantidad)}
          </p>
        </div>
      </div>
      {item.herrajesAsociados.length > 0 && (
        <div className="mt-2 pl-3 border-l border-stone-100 space-y-1">
          {item.herrajesAsociados.map((h, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-stone-500 truncate pr-3">
                {h.nombre} <span className="text-stone-400">×{h.cantidad}</span>
              </span>
              <span className="text-stone-600 tabular-nums shrink-0">
                {formatCOP(h.resultado.costo_delben * h.cantidad)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HerrajeRow({ item }: { item: ValoracionItemHerrajeSnapshot }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div>
        <p className="text-sm font-medium text-stone-800">{item.nombre}</p>
        <p className="text-xs text-stone-400">cód. {item.codigo} · ×{item.cantidad}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-stone-900 tabular-nums">
          {formatCOP(item.resultado.costo_delben * item.cantidad)}
        </p>
      </div>
    </div>
  )
}

function FilaTotales({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium text-stone-900 tabular-nums">{formatCOP(valor)}</span>
    </div>
  )
}
