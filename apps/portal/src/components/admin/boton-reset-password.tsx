'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Key, CircleNotch, CheckCircle, Warning, X } from '@phosphor-icons/react'
import { restablecerContrasenaUsuario } from '@/lib/firebase/client'
import { InputPassword } from '@/components/ui/input-password'

const esquema = z.object({
  contrasena: z.string().min(6, 'Mínimo 6 caracteres'),
})
type Campos = z.infer<typeof esquema>

/**
 * Botón + popover para que un super_admin restablezca la contraseña de un usuario.
 * El control de acceso real vive en el endpoint; renderizar este botón es cosmético,
 * por eso el padre solo lo monta cuando rol === 'super_admin'.
 */
export function BotonResetPassword({ email }: { email: string }) {
  const [abierto, setAbierto] = useState(false)
  const [exito, setExito] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Campos>({ resolver: zodResolver(esquema) })

  function cerrar() {
    setAbierto(false)
    setExito(false)
    setErrorServidor(null)
    reset()
  }

  async function onSubmit(datos: Campos) {
    setErrorServidor(null)
    try {
      await restablecerContrasenaUsuario(email, datos.contrasena)
      setExito(true)
      reset()
    } catch (e) {
      setErrorServidor(
        e instanceof Error ? e.message : 'No se pudo restablecer la contraseña.',
      )
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        className="flex items-center gap-1 text-xs font-medium text-caoba-600 hover:text-caoba-700 transition-colors"
      >
        <Key size={13} />
        Restablecer contraseña
      </button>

      {abierto && (
        <div
          className="absolute right-0 top-full z-20 mt-1.5 w-72 rounded-xl border border-stone-200 bg-white p-3.5 shadow-lg"
          style={{ animation: 'aparecer 0.18s cubic-bezier(0.23,1,0.32,1) both' }}
        >
          <div className="mb-2.5 flex items-start justify-between gap-2">
            <p className="text-xs text-stone-500">
              Nueva contraseña para{' '}
              <span className="font-medium text-stone-700">{email}</span>
            </p>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar"
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X size={14} weight="bold" />
            </button>
          </div>

          {exito ? (
            <div className="space-y-3">
              <div
                className="flex items-start gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-2.5"
                role="status"
              >
                <CheckCircle size={15} weight="fill" className="mt-px shrink-0 text-green-500" />
                <p className="text-xs text-green-700">
                  Contraseña actualizada para {email}.
                </p>
              </div>
              <button
                type="button"
                onClick={cerrar}
                className="w-full rounded-lg bg-caoba-600 px-3 py-2 text-xs font-medium text-white hover:bg-caoba-700 transition-colors"
              >
                Listo
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-2.5">
              <div>
                <InputPassword
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  {...register('contrasena')}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-[border-color,box-shadow] duration-150 hover:border-stone-300 focus:border-caoba-500 focus:ring-2 focus:ring-caoba-500/15"
                />
                {errors.contrasena && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                    <Warning size={11} weight="fill" />
                    {errors.contrasena.message}
                  </p>
                )}
              </div>

              {errorServidor && (
                <div
                  className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2"
                  role="alert"
                >
                  <Warning size={13} weight="fill" className="mt-px shrink-0 text-red-400" />
                  <p className="text-xs text-red-600">{errorServidor}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={[
                  'flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white transition-colors',
                  isSubmitting
                    ? 'cursor-not-allowed bg-stone-400'
                    : 'bg-caoba-600 hover:bg-caoba-700',
                ].join(' ')}
              >
                {isSubmitting && <CircleNotch size={13} className="animate-spin" />}
                {isSubmitting ? 'Restableciendo…' : 'Restablecer contraseña'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
