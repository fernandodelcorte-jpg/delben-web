'use client'

import { useState, useRef } from 'react'
import { UploadSimple, CheckCircle, Warning, CircleNotch } from '@phosphor-icons/react'
import { parsearExcelHerrajes } from '@/lib/importar/parser-herrajes'
import { escribirHerrajes } from '@/lib/importar/writer-firestore'
import type { ResultadoParserHerrajes } from '@/lib/importar/parser-herrajes'

type Fase = 'idle' | 'parseando' | 'previo' | 'importando' | 'listo' | 'error'

export function ImportarHerrajes() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fase, setFase] = useState<Fase>('idle')
  const [progreso, setProgreso] = useState(0)
  const [mensajeProgreso, setMensajeProgreso] = useState('')
  const [resultado, setResultado] = useState<ResultadoParserHerrajes | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    setFase('parseando')
    setError(null)
    setMensajeProgreso('Leyendo Excel…')

    try {
      const buffer = await archivo.arrayBuffer()
      const datos = await parsearExcelHerrajes(buffer)
      setResultado(datos)
      setFase('previo')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al leer el archivo')
      setFase('error')
    }
  }

  async function handleImportar() {
    if (!resultado) return
    setFase('importando')
    setProgreso(0)

    try {
      await escribirHerrajes(resultado, (pct, msg) => {
        setProgreso(pct)
        setMensajeProgreso(msg)
      })
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
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      {(fase === 'idle' || fase === 'error') && (
        <div>
          <label
            htmlFor="herrajes-file"
            className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-stone-200 bg-white px-8 py-12 text-center hover:border-stone-300 hover:bg-stone-50 transition-all"
          >
            <UploadSimple size={28} className="text-stone-400" />
            <div>
              <p className="text-sm font-medium text-stone-700">
                Selecciona el Excel unificado de herrajes
              </p>
              <p className="mt-1 text-xs text-stone-400">
                Columnas: CODIGO · PRODUCTO · TRADICIONAL · DESARMADO · Imagen
              </p>
            </div>
          </label>
          <input
            id="herrajes-file"
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

      {fase === 'parseando' && (
        <div className="flex items-center gap-3 text-sm text-stone-600">
          <CircleNotch size={18} className="animate-spin text-stone-400" />
          Leyendo Excel…
        </div>
      )}

      {fase === 'previo' && resultado && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100">
            <div className="px-5 py-4">
              <p className="text-sm font-semibold text-stone-900 mb-3">
                Resumen de lo que se importará
              </p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {[
                  ['Total herrajes', resultado.estadisticas.total],
                  ['Con precio tradicional', resultado.estadisticas.conPrecioTradicional],
                  ['Con precio desarmado', resultado.estadisticas.conPrecioDesarmado],
                  ['Sin precio (ocultos)', resultado.estadisticas.sinPrecioNinguno],
                  ['Sin imagen', resultado.estadisticas.sinImagen],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between gap-2">
                    <span className="text-stone-500">{label}</span>
                    <span className="font-semibold text-stone-900 tabular-nums">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {resultado.advertencias.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 space-y-1.5">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                Advertencias
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
              className="tactil rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 transition-all"
            >
              Confirmar e importar a Firestore
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

      {fase === 'listo' && resultado && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-4">
            <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" weight="fill" />
            <div>
              <p className="text-sm font-semibold text-green-800">Importación completada</p>
              <p className="text-xs text-green-700 mt-1">
                {resultado.estadisticas.total} herrajes en Firestore.{' '}
                {resultado.estadisticas.sinPrecioNinguno} sin precio cargados como ocultos.
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
