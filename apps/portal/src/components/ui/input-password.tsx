'use client'

import { forwardRef, useState, type ComponentPropsWithoutRef } from 'react'
import { Eye, EyeSlash } from '@phosphor-icons/react'

type Props = Omit<ComponentPropsWithoutRef<'input'>, 'type'>

/**
 * Campo de contraseña con botón-ojo para mostrar/ocultar el texto.
 *
 * - Compatible con react-hook-form: reenvía `ref` y el resto de props al <input>
 *   (basta con `{...register('campo')}`).
 * - El estado de visibilidad es local a cada campo (un input por instancia).
 * - El `className` recibido se aplica al input tal cual; se le añade `pr-10`
 *   para que el texto no quede bajo el ícono.
 *
 * Solo cambia la VISIBILIDAD del valor; no toca el envío ni la validación.
 */
export const InputPassword = forwardRef<HTMLInputElement, Props>(
  function InputPassword({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false)

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={className ? `${className} pr-10` : 'pr-10'}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors duration-150 active:scale-95"
        >
          {visible ? <EyeSlash size={16} /> : <Eye size={16} />}
        </button>
      </div>
    )
  },
)
