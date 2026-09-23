'use client'

import { useState, useRef } from 'react'
import { UploadSimple, CheckCircle, Warning, CircleNotch } from '@phosphor-icons/react'
import { parsearExcelModulos } from '@/lib/importar/parser-modulos'
import { escribirModulos, analizarAntesDeImportar } from '@/lib/importar/writer-firestore'
import { limpiarCacheModulos } from '@/lib/firestore/modulos'
import type { ResultadoParserModulos } from '@/lib/importar/parser-modulos'
import type { PrevioImportacion } from '@/lib/importar/writer-firestore'

type Fase = 'idle' | 'parseando' | 'previo' | 'importando' | 'listo' | 'error'

export function ImportarModulos() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fase, setFase] = useState<Fase>('idle')
  const [progreso, setProgreso] = useState(0)
  const [mensajeProgreso, setMensajeProgreso] = useState('')
  const [resultado, setResultado] = useState<ResultadoParserModulos | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Lectura de Firestore previa al import: bajas por confirmar y qué categorías ya
  // existen (para no pisar su configuración). Sin esto no se puede importar.
  const [previo, setPrevio] = useState<PrevioImportacion | null>(null)
  const [calculandoBajas, setCalculandoBajas] = useState(false)

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    setFase('parseando')
    setError(null)
    setProgreso(0)
    setPrevio(null)
    setMensajeProgreso('Leyendo Excel…')

    try {
      const buffer = await archivo.arrayBuffer()
      const datos = await parsearExcelModulos(buffer)
      setResultado(datos)
      setFase('previo')

      // Con colisiones no se importa nada, así que no vale la pena leer Firestore.
      if (datos.colisiones.length === 0) {
        setCalculandoBajas(true)
        try {
          setPrevio(await analizarAntesDeImportar(datos))
        } finally {
          setCalculandoBajas(false)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al leer el archivo')
      setFase('error')
    }
  }

  async function handleImportar() {
    if (!resultado || !previo) return
    setFase('importando')
    setProgreso(0)

    try {
      await escribirModulos(resultado, (pct, msg) => {
        setProgreso(pct)
        setMensajeProgreso(msg)
      }, previo)
      limpiarCacheModulos() // invalidar caché para que el buscador use datos frescos
      setFase('listo')
      setProgreso(100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al escribir en Firestore')
      setFase('error')
    }
  }

  function reiniciar() {
    setFase('idle')
    setResultado(null)
    setError(null)
    setProgreso(0)
    setPrevio(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      {/* Upload */}
      {(fase === 'idle' || fase === 'error') && (
        <div>
          <label
            htmlFor="modulos-file"
            className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-stone-200 bg-white px-8 py-12 text-center hover:border-stone-300 hover:bg-stone-50 transition-all"
          >
            <UploadSimple size={28} className="text-stone-400" />
            <div>
              <p className="text-sm font-medium text-stone-700">
                Selecciona el Excel de módulos
              </p>
              <p className="mt-1 text-xs text-stone-400">
                LISTA DE PRECIOS TOTALES.xlsx · Hoja1
              </p>
            </div>
          </label>
          <input
            id="modulos-file"
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            onChange={handleArchivo}
          />
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <Warning size={16} className="mt-0.5 shrink-0" weight="fill" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Leyendo */}
      {fase === 'parseando' && (
        <div className="flex items-center gap-3 text-sm text-stone-600">
          <CircleNotch size={18} className="animate-spin text-stone-400" />
          Leyendo Excel…
        </div>
      )}

      {/* Preview */}
      {fase === 'previo' && resultado && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100">
            <div className="px-5 py-4">
              <p className="text-sm font-semibold text-stone-900 mb-3">
                Resumen de lo que se importará
              </p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {[
                  ['Filas válidas', resultado.estadisticas.filasValidas.toLocaleString('es-CO')],
                  ['Módulos únicos', resultado.estadisticas.modulosUnicos.toLocaleString('es-CO')],
                  ['Módulos de búsqueda (derivados)', resultado.estadisticas.modulosBusqueda.toLocaleString('es-CO')],
                  ['Tipos de estructura', resultado.tiposEstructura.length],
                  ['Tipos de fachada', resultado.tiposFachada.length],
                  ['Categorías', resultado.categorias.length],
                  ['Subcategorías (auto)', resultado.subcategorias.length],
                  ['Acabados / colores', resultado.acabados.length],
                  ['Precios', resultado.precios.length.toLocaleString('es-CO')],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between gap-2">
                    <span className="text-stone-500">{label}</span>
                    <span className="font-semibold text-stone-900 tabular-nums">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Estructuras encontradas */}
            <div className="px-5 py-3">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
                Tipos de estructura detectados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {resultado.tiposEstructura.map((e) => (
                  <span
                    key={e.id}
                    className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600"
                  >
                    {e.doc.nombre}
                  </span>
                ))}
              </div>
            </div>

            {/* Fachadas encontradas */}
            <div className="px-5 py-3">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
                Tipos de fachada detectados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {resultado.tiposFachada.map((f) => (
                  <span
                    key={f.id}
                    className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600"
                  >
                    {f.doc.nombre}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Colisiones de id — BLOQUEAN el import */}
          {resultado.colisiones.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 space-y-2">
              <p className="text-xs font-semibold text-red-800 uppercase tracking-wide">
                Importación bloqueada: {resultado.colisiones.length} colisión(es) de id
              </p>
              <p className="text-xs text-red-700 leading-relaxed">
                Dos productos distintos generan el mismo id de Firestore. Si se importara, uno
                pisaría al otro y se perdería en silencio. Revisa estos nombres en el Excel:
              </p>
              {resultado.colisiones.map((c) => (
                <div key={`${c.coleccion}-${c.id}`} className="text-xs text-red-700 leading-relaxed">
                  <p className="font-medium">
                    {c.coleccion} · {c.id}
                  </p>
                  <p>· {c.claves[0]}</p>
                  <p>· {c.claves[1]}</p>
                </div>
              ))}
            </div>
          )}

          {/* Bajas — docs que dejarán de estar activos */}
          {calculandoBajas && (
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <CircleNotch size={14} className="animate-spin text-stone-400" />
              Comparando con lo que ya hay en Firestore…
            </div>
          )}
          {previo &&
            (previo.desactivaciones.modulos.length > 0 ||
              previo.desactivaciones.modulosBusqueda.length > 0) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 space-y-2">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                  {previo.desactivaciones.modulos.length} módulos se desactivarán
                  {previo.desactivaciones.modulosBusqueda.length > 0 &&
                    ` · ${previo.desactivaciones.modulosBusqueda.length} en el buscador`}
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Están en Firestore y no vienen en este Excel. NO se borran: quedan con
                  `activo: false`, así que dejan de aparecer en el cotizador pero las
                  cotizaciones ya guardadas los siguen encontrando para recalcular.
                </p>
                <details className="text-xs text-amber-700">
                  <summary className="cursor-pointer font-medium">Ver la lista</summary>
                  <div className="mt-1.5 max-h-48 overflow-y-auto space-y-0.5">
                    {previo.desactivaciones.modulos.map((m) => (
                      <p key={m.id}>· {m.nombre}</p>
                    ))}
                  </div>
                </details>
              </div>
            )}

          {/* Descuento 0% — con el valor REAL de Firestore para las categorías que ya
              existen (el import ya no las pisa, así que la tabla del parser no manda). */}
          {previo && previo.categoriasConDescuento0.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1.5">
                Categorías con descuento 0%
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Pendientes de configurar en /admin/categorias:{' '}
                {previo.categoriasConDescuento0.join(', ')}.
              </p>
            </div>
          )}

          {/* Advertencias */}
          {resultado.advertencias.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 space-y-1.5">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                Advertencias (no bloquean el import)
              </p>
              {resultado.advertencias.map((a, i) => (
                <p key={i} className="text-xs text-amber-700 leading-relaxed">
                  · {a}
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleImportar}
              disabled={resultado.colisiones.length > 0 || calculandoBajas || !previo}
              className="tactil rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {previo && previo.desactivaciones.modulos.length > 0
                ? `Confirmar: importar y desactivar ${previo.desactivaciones.modulos.length}`
                : 'Confirmar e importar a Firestore'}
            </button>
            <button
              onClick={reiniciar}
              className="tactil rounded-lg border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Progreso */}
      {fase === 'importando' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-600">{mensajeProgreso}</span>
            <span className="font-semibold text-stone-900 tabular-nums">{progreso}%</span>
          </div>
          <div className="h-2 rounded-full bg-stone-100">
            <div
              className="h-2 rounded-full bg-stone-900 transition-all duration-300"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <p className="text-xs text-stone-400">No cierres esta ventana durante la importación.</p>
        </div>
      )}

      {/* Éxito */}
      {fase === 'listo' && resultado && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-4">
            <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" weight="fill" />
            <div>
              <p className="text-sm font-semibold text-green-800">Importación completada</p>
              <p className="text-xs text-green-700 mt-1">
                {resultado.estadisticas.modulosUnicos.toLocaleString('es-CO')} módulos y{' '}
                {resultado.precios.length.toLocaleString('es-CO')} precios en Firestore.
              </p>
            </div>
          </div>
          <button
            onClick={reiniciar}
            className="tactil rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-all"
          >
            Importar otro archivo
          </button>
        </div>
      )}
    </div>
  )
}
