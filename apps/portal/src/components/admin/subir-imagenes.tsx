'use client'

import { useState } from 'react'
import { Images, CheckCircle, Warning, ArrowsClockwise } from '@phosphor-icons/react'
import { subirImagenes, revincularImagenes } from '@/lib/importar/writer-firestore'
import type { ResultadoImagen, ResultadoRevincular } from '@/lib/importar/writer-firestore'

type Fase = 'idle' | 'subiendo' | 'listo' | 'revinculando' | 'revinculado'

export function SubirImagenes() {
  const [tipo, setTipo] = useState<'modulos' | 'herrajes'>('modulos')
  const [fase, setFase] = useState<Fase>('idle')
  const [progreso, setProgreso] = useState(0)
  const [mensaje, setMensaje] = useState('')
  const [resultados, setResultados] = useState<ResultadoImagen[]>([])
  const [resultadoRevincular, setResultadoRevincular] = useState<ResultadoRevincular | null>(null)

  async function handleArchivos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? [])
    if (archivos.length === 0) return

    setFase('subiendo')
    setProgreso(0)
    setResultados([])

    const res = await subirImagenes(archivos, tipo, (pct, msg) => {
      setProgreso(pct)
      setMensaje(msg)
    })

    setResultados(res)
    setFase('listo')
  }

  async function handleRevincular() {
    setFase('revinculando')
    setProgreso(0)
    setResultadoRevincular(null)

    const res = await revincularImagenes(tipo, (pct, msg) => {
      setProgreso(pct)
      setMensaje(msg)
    })

    setResultadoRevincular(res)
    setFase('revinculado')
  }

  const errores = resultados.filter((r) => r.error)
  const exitosos = resultados.filter((r) => !r.error)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
        <p className="text-sm font-medium text-stone-700 mb-3">Tipo de imágenes</p>
        <div className="flex gap-2">
          {(['modulos', 'herrajes'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={[
                'tactil rounded-lg border px-4 py-2 text-sm font-medium transition-all capitalize',
                tipo === t
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 text-stone-600 hover:border-stone-300',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {fase === 'idle' && (
        <div className="space-y-3">
          <label
            htmlFor="imagenes-input"
            className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-stone-200 bg-white px-8 py-12 text-center hover:border-stone-300 hover:bg-stone-50 transition-all"
          >
            <Images size={28} className="text-stone-400" />
            <div>
              <p className="text-sm font-medium text-stone-700">
                Selecciona las imágenes de {tipo}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                Puedes seleccionar múltiples archivos · JPG, PNG, WebP
              </p>
            </div>
          </label>
          <input
            id="imagenes-input"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handleArchivos}
          />

          {/* Re-vincular: restaura imagen_url desde Storage sin re-subir archivos */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-4">
            <p className="text-sm font-medium text-stone-700 mb-1">
              ¿Reimportaste el Excel y las imágenes desaparecieron?
            </p>
            <p className="text-xs text-stone-400 mb-3">
              Las imágenes siguen en Storage. Este botón lee los archivos existentes y actualiza los documentos de Firestore sin re-subir nada.
            </p>
            <button
              type="button"
              onClick={handleRevincular}
              className="tactil flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-300 hover:bg-white transition-all"
            >
              <ArrowsClockwise size={15} weight="bold" />
              Re-vincular imágenes de {tipo}
            </button>
          </div>
        </div>
      )}

      {(fase === 'subiendo' || fase === 'revinculando') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-600 truncate">{mensaje}</span>
            <span className="ml-2 shrink-0 font-semibold text-stone-900 tabular-nums">
              {progreso}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-stone-100">
            <div
              className="h-2 rounded-full bg-stone-900 transition-all duration-300"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      )}

      {fase === 'listo' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-4">
            <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" weight="fill" />
            <div>
              <p className="text-sm font-semibold text-green-800">
                {exitosos.length} imágenes subidas correctamente
              </p>
              {errores.length > 0 && (
                <p className="text-xs text-green-700 mt-1">
                  {errores.length} con error — ver detalle abajo.
                </p>
              )}
            </div>
          </div>

          {errores.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
                Errores
              </p>
              {errores.map((r) => (
                <div key={r.archivo} className="flex items-start gap-2 text-xs text-amber-700">
                  <Warning size={13} className="mt-0.5 shrink-0" weight="fill" />
                  <span>
                    <strong>{r.archivo}</strong>: {r.error}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => { setFase('idle'); setResultados([]) }}
            className="tactil rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-all"
          >
            Subir más imágenes
          </button>
        </div>
      )}

      {fase === 'revinculado' && resultadoRevincular && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-4">
            <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" weight="fill" />
            <div>
              <p className="text-sm font-semibold text-green-800">
                Re-vinculación completada
              </p>
              <p className="text-xs text-green-700 mt-1">
                {resultadoRevincular.vinculadas} documentos actualizados con su URL de imagen.
                {resultadoRevincular.sinDocumento > 0 && (
                  <> · {resultadoRevincular.sinDocumento} archivos en Storage sin documento correspondiente (imágenes huérfanas).</>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setFase('idle'); setResultadoRevincular(null) }}
            className="tactil rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-all"
          >
            Volver
          </button>
        </div>
      )}
    </div>
  )
}
