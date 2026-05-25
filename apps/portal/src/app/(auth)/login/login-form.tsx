'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeSlash, Warning } from '@phosphor-icons/react'
import { iniciarSesion } from '@/lib/firebase/client'

const esquema = z.object({
  correo: z
    .string()
    .min(1, 'El correo es obligatorio')
    .email('Correo electrónico inválido'),
  contrasena: z
    .string()
    .min(1, 'La contraseña es obligatoria')
    .min(6, 'Mínimo 6 caracteres'),
})

type Campos = z.infer<typeof esquema>

function cn(...clases: (string | boolean | undefined | null)[]) {
  return clases.filter(Boolean).join(' ')
}

export function LoginForm() {
  const [verContrasena, setVerContrasena] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Campos>({
    resolver: zodResolver(esquema),
  })

  async function onSubmit(datos: Campos) {
    try {
      await iniciarSesion(datos.correo, datos.contrasena)
      router.replace('/')
    } catch {
      setError('root', {
        message: 'Correo o contraseña incorrectos. Verifica tus datos.',
      })
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5"
      style={{ animation: 'aparecer 0.5s cubic-bezier(0.23,1,0.32,1) 80ms both' }}
    >

      {/* Correo */}
      <div className="space-y-1.5">
        <label
          htmlFor="correo"
          className="block text-sm font-medium text-stone-700"
        >
          Correo electrónico
        </label>
        <input
          id="correo"
          type="email"
          autoComplete="email"
          placeholder="nombre@empresa.com"
          {...register('correo')}
          className={cn(
            'w-full rounded-lg border bg-white px-3.5 py-2.5',
            'text-sm text-stone-900 placeholder:text-stone-400',
            'outline-none',
            'transition-[border-color,box-shadow] duration-150',
            errors.correo
              ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-400/20'
              : 'border-stone-200 hover:border-stone-300 focus:border-caoba-500 focus:ring-2 focus:ring-caoba-500/15',
          )}
        />
        {errors.correo && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <Warning size={12} weight="fill" />
            {errors.correo.message}
          </p>
        )}
      </div>

      {/* Contraseña */}
      <div className="space-y-1.5">
        <label
          htmlFor="contrasena"
          className="block text-sm font-medium text-stone-700"
        >
          Contraseña
        </label>
        <div className="relative">
          <input
            id="contrasena"
            type={verContrasena ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            {...register('contrasena')}
            className={cn(
              'w-full rounded-lg border bg-white px-3.5 py-2.5 pr-10',
              'text-sm text-stone-900 placeholder:text-stone-400',
              'outline-none',
              'transition-[border-color,box-shadow] duration-150',
              errors.contrasena
                ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-400/20'
                : 'border-stone-200 hover:border-stone-300 focus:border-caoba-500 focus:ring-2 focus:ring-caoba-500/15',
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={verContrasena ? 'Ocultar contraseña' : 'Ver contraseña'}
            onClick={() => setVerContrasena((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors duration-150 active:scale-95"
          >
            {verContrasena ? <EyeSlash size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.contrasena && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <Warning size={12} weight="fill" />
            {errors.contrasena.message}
          </p>
        )}
      </div>

      {/* Error de autenticación */}
      {errors.root && (
        <div
          className="flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50 px-3.5 py-3 animate-aparecer"
          role="alert"
        >
          <Warning size={15} weight="fill" className="text-red-400 shrink-0 mt-px" />
          <p className="text-sm text-red-600">{errors.root.message}</p>
        </div>
      )}

      {/* Botón de ingreso — scale(0.97) en active, ease-out 160ms */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          'relative w-full rounded-lg px-4 py-2.5',
          'text-sm font-medium text-white',
          'transition-[transform,background-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
          'active:scale-[0.97]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          isSubmitting
            ? 'cursor-not-allowed bg-stone-400'
            : 'bg-caoba-600 hover:bg-caoba-700 focus-visible:ring-caoba-600',
        )}
      >
        <span
          className={cn(
            'transition-[filter,opacity] duration-200',
            isSubmitting && 'opacity-0 blur-sm',
          )}
        >
          Ingresar
        </span>

        {/* Estado de carga: spinner centrado con opacidad */}
        {isSubmitting && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          </span>
        )}
      </button>

    </form>
  )
}
