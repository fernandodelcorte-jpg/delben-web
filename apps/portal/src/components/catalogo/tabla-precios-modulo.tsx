'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, CircleNotch } from '@phosphor-icons/react'
import { getVariantesModulo, getPreciosModulo } from '@/lib/firestore/modulos'
import { getTiposEstructura, getTiposFachada } from '@/lib/firestore/catalogo'
import {
  aplicarDescuento,
  descuentoModuloPct,
  convertirMoneda,
  type ModalidadCatalogo,
} from '@/lib/catalogo-precios'
import type { Sede, Categoria, Precio } from '@/lib/firebase/tipos-firestore'

function formatPrecio(n: number, moneda: 'COP' | 'USD'): string {
  if (moneda === 'USD') {
    return 'US$ ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return '$' + Math.round(n).toLocaleString('es-CO')
}

type Fila = {
  altura: number
  profundidad: number
  estructuraId: string
  fachadaId: string
  lista: number
}

/**
 * Tabla de consulta de precios de un producto (un `nombre`): todas sus variantes
 * altura × profundidad cruzadas con la matriz estructura × fachada, con columnas
 * de precio de lista y costo (lista − descuento principal de la sede/modalidad).
 *
 * SOLO se monta para roles con costo (lo decide el llamador con puedeVerCostoDelben).
 * No corre el motor, no hay precio de venta, no aplica acabado/campaña.
 */
export function TablaPreciosModulo({
  nombre,
  sede,
  modalidad,
  moneda,
  tasaUsd,
  categorias,
  onClose,
}: {
  nombre: string
  sede: Sede
  modalidad: ModalidadCatalogo
  moneda: 'COP' | 'USD'
  tasaUsd: number
  categorias: Categoria[]
  onClose: () => void
}) {
  const [filas, setFilas] = useState<Fila[]>([])
  const [nombreEstr, setNombreEstr] = useState<Map<string, string>>(new Map())
  const [nombreFach, setNombreFach] = useState<Map<string, string>>(new Map())
  const [pct, setPct] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filtroEstr, setFiltroEstr] = useState('')
  const [filtroFach, setFiltroFach] = useState('')

  useEffect(() => {
    ;(async () => {
      setCargando(true)
      setError(null)
      try {
        const [variantes, estructuras, fachadas] = await Promise.all([
          getVariantesModulo(nombre),
          getTiposEstructura(),
          getTiposFachada(),
        ])
        setNombreEstr(new Map(estructuras.map((e) => [e.id, e.nombre])))
        setNombreFach(new Map(fachadas.map((f) => [f.id, f.nombre])))

        // Descuento principal: igual para todas las filas del producto (depende de
        // modalidad/sede/categoría, no de estructura/fachada/dimensión).
        const categoriaId = variantes[0]?.categoria_id ?? null
        const cat = categoriaId ? categorias.find((c) => c.id === categoriaId) ?? null : null
        setPct(descuentoModuloPct(modalidad, sede, cat ? { desc_desarmado_base_pct: cat.desc_desarmado_base_pct } : null))

        // Una lista de precios por variante → filas (variante × combo de la matriz).
        const matrices = await Promise.all(
          variantes.map((v) => getPreciosModulo(v.id).then((ps): [typeof v, Precio[]] => [v, ps])),
        )
        const fs: Fila[] = []
        for (const [v, ps] of matrices) {
          for (const p of ps) {
            fs.push({
              altura: v.altura,
              profundidad: v.profundidad,
              estructuraId: p.tipo_estructura_id,
              fachadaId: p.tipo_fachada_id,
              lista: p.precio_cop,
            })
          }
        }
        fs.sort(
          (a, b) =>
            a.altura - b.altura ||
            a.profundidad - b.profundidad ||
            a.estructuraId.localeCompare(b.estructuraId) ||
            a.fachadaId.localeCompare(b.fachadaId),
        )
        setFilas(fs)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudieron cargar los precios')
      } finally {
        setCargando(false)
      }
    })()
  }, [nombre, modalidad, sede, categorias])

  // Estructuras/fachadas presentes (para los filtros opcionales).
  const estrPresentes = useMemo(() => [...new Set(filas.map((f) => f.estructuraId))], [filas])
  const fachPresentes = useMemo(() => [...new Set(filas.map((f) => f.fachadaId))], [filas])

  const filasFiltradas = useMemo(
    () =>
      filas.filter(
        (f) =>
          (!filtroEstr || f.estructuraId === filtroEstr) &&
          (!filtroFach || f.fachadaId === filtroFach),
      ),
    [filas, filtroEstr, filtroFach],
  )

  const etiquetaEstr = (id: string) => nombreEstr.get(id) ?? id
  const etiquetaFach = (id: string) => nombreFach.get(id) ?? id

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl rounded-xl border border-stone-200 bg-white shadow-xl animate-desplegarse origin-top">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-caoba-600 uppercase tracking-wider">Precios por variante</p>
            <h2 className="text-base font-semibold text-stone-900 truncate">{nombre}</h2>
            <p className="mt-0.5 text-xs text-stone-400">
              {sede.nombre} · <span className="capitalize">{modalidad}</span> · descuento principal {pct}%
            </p>
          </div>
          <button onClick={onClose} className="tactil text-stone-400 hover:text-stone-700 shrink-0" aria-label="Cerrar">
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Filtros opcionales */}
        {!cargando && !error && filas.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-stone-100">
            <select
              value={filtroEstr}
              onChange={(e) => setFiltroEstr(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-stone-400"
            >
              <option value="">Todas las estructuras</option>
              {estrPresentes.map((id) => (
                <option key={id} value={id}>{etiquetaEstr(id)}</option>
              ))}
            </select>
            <select
              value={filtroFach}
              onChange={(e) => setFiltroFach(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-stone-400"
            >
              <option value="">Todas las fachadas</option>
              {fachPresentes.map((id) => (
                <option key={id} value={id}>{etiquetaFach(id)}</option>
              ))}
            </select>
            <span className="text-xs text-stone-400 tabular-nums ml-auto">{filasFiltradas.length} filas</span>
          </div>
        )}

        {/* Cuerpo */}
        <div className="max-h-[60vh] overflow-y-auto">
          {cargando ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-400">
              <CircleNotch size={18} className="animate-spin" /> Cargando precios…
            </div>
          ) : error ? (
            <div className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : filas.length === 0 ? (
            <p className="py-16 text-center text-sm text-stone-400">Este producto no tiene precios cargados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr className="border-b border-stone-100">
                  <th className="px-5 py-2 text-left font-semibold">Alto × Prof. (mm)</th>
                  <th className="px-3 py-2 text-left font-semibold">Estructura</th>
                  <th className="px-3 py-2 text-left font-semibold">Fachada</th>
                  <th className="px-3 py-2 text-right font-semibold">Lista</th>
                  <th className="px-5 py-2 text-right font-semibold">Costo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filasFiltradas.map((f, i) => {
                  const lista = convertirMoneda(f.lista, moneda, tasaUsd)
                  const costo = convertirMoneda(aplicarDescuento(f.lista, pct), moneda, tasaUsd)
                  return (
                    <tr key={i} className="hover:bg-stone-50">
                      <td className="px-5 py-2 tabular-nums text-stone-700 whitespace-nowrap">{f.altura} × {f.profundidad}</td>
                      <td className="px-3 py-2 text-stone-600">{etiquetaEstr(f.estructuraId)}</td>
                      <td className="px-3 py-2 text-stone-600">{etiquetaFach(f.fachadaId)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-stone-400">{formatPrecio(lista, moneda)}</td>
                      <td className="px-5 py-2 text-right font-mono tabular-nums font-semibold text-stone-900">{formatPrecio(costo, moneda)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-stone-100 px-5 py-2.5">
          <p className="text-[11px] text-stone-400">
            Costo = lista − descuento principal de la sede ({pct}%). No incluye servicios, acabado,
            campaña ni utilidad — no es precio de venta.
          </p>
        </div>
      </div>
    </div>
  )
}
