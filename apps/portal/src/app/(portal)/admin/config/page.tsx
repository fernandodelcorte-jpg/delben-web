'use client'

import { useEffect, useRef, useState } from 'react'
import { CircleNotch, Check, UploadSimple, Image } from '@phosphor-icons/react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { getTasaUsdHistorial, actualizarTasaUsd, getLogoDelben, setLogoDelben } from '@/lib/firestore/config'
import type { TasaUsd } from '@/lib/firebase/tipos-firestore'

function formatFecha(ts: number) {
  return new Date(ts).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ConfigPage() {
  const { usuario } = useAuth()
  const [historial, setHistorial] = useState<TasaUsd[]>([])
  const [cargando, setCargando] = useState(true)
  const [nuevaTasa, setNuevaTasa] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [logoDelben, setLogoDelbenState] = useState<string | null>(null)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [errorLogo, setErrorLogo] = useState<string | null>(null)
  const inputLogoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      getTasaUsdHistorial(),
      getLogoDelben(),
    ]).then(([h, logo]) => {
      setHistorial(h)
      setLogoDelbenState(logo)
    }).finally(() => setCargando(false))
  }, [])

  const tasaActual = historial[0]?.valor ?? null

  async function handleSubirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrorLogo('Solo se admiten imágenes (PNG, JPG, SVG).')
      return
    }
    setSubiendoLogo(true)
    setErrorLogo(null)
    try {
      const storageRef = ref(storage, 'logos/delben')
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await setLogoDelben(url)
      setLogoDelbenState(url)
    } catch {
      setErrorLogo('No se pudo subir el logo. Intenta de nuevo.')
    } finally {
      setSubiendoLogo(false)
      if (inputLogoRef.current) inputLogoRef.current.value = ''
    }
  }

  async function handleGuardar() {
    const valor = parseFloat(nuevaTasa.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) {
      setError('Ingresa una tasa válida mayor a 0.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const nueva = await actualizarTasaUsd(valor, usuario?.uid ?? '')
      setHistorial((prev) => [nueva, ...prev])
      setNuevaTasa('')
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">Configuración global</h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Parámetros que afectan a todos los distribuidores.
        </p>
      </div>

      {/* Logo Delben */}
      <section className="rounded-xl border border-stone-200 bg-white p-6 space-y-5">
        <div>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
            Logo de Delben
          </h2>
          <p className="text-xs text-stone-400">
            Aparece en las órdenes de compra de todos los distribuidores.
          </p>
        </div>

        {cargando ? (
          <div className="flex items-center gap-2 text-sm text-stone-400">
            <CircleNotch size={16} className="animate-spin" />
            Cargando…
          </div>
        ) : (
          <>
            {logoDelben ? (
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoDelben} alt="Logo Delben" className="h-12 w-auto object-contain" />
                <p className="text-xs text-stone-400">Logo actual</p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-stone-200 p-6 flex flex-col items-center gap-2 text-center">
                <Image size={24} className="text-stone-300" />
                <p className="text-xs text-stone-400">Sin logo configurado</p>
              </div>
            )}

            <div>
              <input
                ref={inputLogoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSubirLogo}
              />
              <button
                onClick={() => inputLogoRef.current?.click()}
                disabled={subiendoLogo}
                className="tactil flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50 disabled:opacity-50 transition-colors"
              >
                {subiendoLogo ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <UploadSimple size={14} weight="bold" />
                )}
                {subiendoLogo ? 'Subiendo…' : logoDelben ? 'Cambiar logo' : 'Subir logo'}
              </button>
              {errorLogo && <p className="mt-2 text-xs text-red-600">{errorLogo}</p>}
            </div>
          </>
        )}
      </section>

      {/* Tasa USD */}
      <section className="rounded-xl border border-stone-200 bg-white p-6 space-y-5">
        <div>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
            Tasa de cambio USD → COP
          </h2>
          <p className="text-xs text-stone-400">
            Se aplica a todas las cotizaciones de distribuidores en Venezuela y USA.
          </p>
        </div>

        {cargando ? (
          <div className="flex items-center gap-2 text-sm text-stone-400">
            <CircleNotch size={16} className="animate-spin" />
            Cargando…
          </div>
        ) : (
          <>
            {/* Tasa actual */}
            <div className="rounded-lg bg-stone-50 border border-stone-200 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-400">Tasa actual</p>
                {tasaActual ? (
                  <p className="text-2xl font-bold text-stone-900 tabular-nums mt-0.5">
                    1 USD = {tasaActual.toLocaleString('es-CO')} COP
                  </p>
                ) : (
                  <p className="text-sm text-amber-600 font-medium mt-0.5">
                    Sin configurar — usando valor por defecto (4.000 COP)
                  </p>
                )}
              </div>
              {historial[0] && (
                <p className="text-xs text-stone-400 text-right shrink-0 ml-4">
                  Actualizada<br />
                  {formatFecha(historial[0].created_at)}
                </p>
              )}
            </div>

            {/* Actualizar */}
            <div>
              <label className="block text-xs text-stone-500 mb-2">
                Nueva tasa (COP por 1 USD)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={nuevaTasa}
                  onChange={(e) => setNuevaTasa(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGuardar() }}
                  placeholder="ej. 4200"
                  className="w-40 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500 tabular-nums"
                />
                <button
                  onClick={handleGuardar}
                  disabled={guardando || !nuevaTasa}
                  className="tactil flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50 transition-colors"
                >
                  {guardando ? (
                    <CircleNotch size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} weight="bold" />
                  )}
                  {guardando ? 'Guardando…' : 'Actualizar'}
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            </div>

            {/* Historial */}
            {historial.length > 1 && (
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                  Historial
                </p>
                <div className="divide-y divide-stone-100">
                  {historial.slice(1).map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2.5">
                      <span className="text-sm font-medium text-stone-600 tabular-nums">
                        {t.valor.toLocaleString('es-CO')} COP
                      </span>
                      <span className="text-xs text-stone-400">
                        {formatFecha(t.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
