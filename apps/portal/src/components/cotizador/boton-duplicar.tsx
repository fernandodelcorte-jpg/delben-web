'use client'

import { useEffect, useRef, useState } from 'react'
import { Copy, X, CircleNotch } from '@phosphor-icons/react'

/**
 * Botón "Duplicar" con popover que pide el NOMBRE de la copia antes de continuar.
 *
 * - El input viene pre-relleno con `${nombreActual} (copia)` (editable).
 * - Valida nombre no vacío (trim). Si vacío, no deja confirmar.
 * - Al confirmar llama `onConfirmar(nombre)` (el caller carga el borrador con ese
 *   nombre y enruta). Si el nombre llegara vacío, se usa `nombreActual` como
 *   fallback — nunca undefined.
 * - Cancelar / Escape / click fuera: cierra sin duplicar.
 *
 * Mismo patrón de popover + form que `boton-reset-password.tsx`.
 */
export function BotonDuplicar({
  nombreActual,
  onConfirmar,
  triggerClassName,
}: {
  nombreActual: string
  onConfirmar: (nuevoNombre: string) => void | Promise<void>
  triggerClassName?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function abrir() {
    setNombre(`${nombreActual} (copia)`)
    setAbierto(true)
    // Enfoca y selecciona para que el usuario pueda sobrescribir de inmediato.
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }

  function cerrar() {
    if (ocupado) return
    setAbierto(false)
  }

  // Cerrar al hacer click fuera del popover.
  useEffect(() => {
    if (!abierto) return
    function fuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierto])

  const valido = nombre.trim().length > 0

  async function confirmar() {
    if (!valido || ocupado) return
    const elegido = nombre.trim() || nombreActual // fallback defensivo: nunca vacío
    setOcupado(true)
    try {
      await onConfirmar(elegido)
      setAbierto(false)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => (abierto ? cerrar() : abrir())}
        className={
          triggerClassName ??
          'tactil flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:border-stone-300 transition-colors'
        }
      >
        <Copy size={13} weight="bold" />
        Duplicar
      </button>

      {abierto && (
        <div
          className="absolute right-0 top-full z-20 mt-1.5 w-72 rounded-xl border border-stone-200 bg-white p-3.5 shadow-lg"
          style={{ animation: 'aparecer 0.18s cubic-bezier(0.23,1,0.32,1) both' }}
        >
          <div className="mb-2.5 flex items-start justify-between gap-2">
            <p className="text-xs text-stone-500">Nombre de la copia</p>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar"
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X size={14} weight="bold" />
            </button>
          </div>

          <input
            ref={inputRef}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void confirmar()
              }
              if (e.key === 'Escape') cerrar()
            }}
            placeholder="Nombre de la copia"
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-[border-color,box-shadow] duration-150 hover:border-stone-300 focus:border-caoba-500 focus:ring-2 focus:ring-caoba-500/15"
          />

          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={cerrar}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={!valido || ocupado}
              className={[
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors',
                !valido || ocupado ? 'cursor-not-allowed bg-stone-400' : 'bg-caoba-600 hover:bg-caoba-700',
              ].join(' ')}
            >
              {ocupado && <CircleNotch size={12} className="animate-spin" />}
              {ocupado ? 'Duplicando…' : 'Duplicar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
