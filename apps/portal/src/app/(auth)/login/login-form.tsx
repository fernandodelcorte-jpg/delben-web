'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Warning, CheckCircle, ArrowLeft } from '@phosphor-icons/react'
import { iniciarSesion, recuperarContrasena } from '@/lib/firebase/client'
import { InputPassword } from '@/components/ui/input-password'

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

const esquemaRecuperar = z.object({
  correo: z
    .string()
    .min(1, 'El correo es obligatorio')
    .email('Correo electrónico inválido'),
})

type CamposRecuperar = z.infer<typeof esquemaRecuperar>

function cn(...clases: (string | boolean | undefined | null)[]) {
  return clases.filter(Boolean).join(' ')
}

export function LoginForm() {
  const [modo, setModo] = useState<'login' | 'recuperar'>('login')

  if (modo === 'recuperar') {
    return <RecuperarForm volver={() => setModo('login')} />
  }

  return <IngresarForm irARecuperar={() => setModo('recuperar')} />
}

function IngresarForm({ irARecuperar }: { irARecuperar: () => void }) {
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
    <>
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
        <InputPassword
          id="contrasena"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register('contrasena')}
          className={cn(
            'w-full rounded-lg border bg-white px-3.5 py-2.5',
            'text-sm text-stone-900 placeholder:text-stone-400',
            'outline-none',
            'transition-[border-color,box-shadow] duration-150',
            errors.contrasena
              ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-400/20'
              : 'border-stone-200 hover:border-stone-300 focus:border-caoba-500 focus:ring-2 focus:ring-caoba-500/15',
          )}
        />
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

    {/* Enlace de recuperación — link ghost en caoba */}
    <div
      className="mt-4 text-center"
      style={{ animation: 'aparecer 0.5s cubic-bezier(0.23,1,0.32,1) 140ms both' }}
    >
      <button
        type="button"
        onClick={irARecuperar}
        className="text-sm text-caoba-600 hover:text-caoba-700 transition-colors duration-150"
      >
        ¿Olvidaste tu contraseña?
      </button>
    </div>
    </>
  )
}

function RecuperarForm({ volver }: { volver: () => void }) {
  const [enviado, setEnviado] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CamposRecuperar>({
    resolver: zodResolver(esquemaRecuperar),
  })

  async function onSubmit(datos: CamposRecuperar) {
    try {
      await recuperarContrasena(datos.correo)
    } catch (e) {
      // Por seguridad NO revelamos si el correo existe: un correo no
      // registrado (auth/user-not-found) se trata igual que un envío exitoso.
      // Solo mostramos error en fallos operativos reales (red, rate limit).
      const codigo =
        e && typeof e === 'object' && 'code' in e ? String(e.code) : ''
      if (
        codigo === 'auth/too-many-requests' ||
        codigo === 'auth/network-request-failed'
      ) {
        setError('root', {
          message:
            'No pudimos completar la solicitud en este momento. Inténtalo de nuevo en unos minutos.',
        })
        return
      }
    }
    // Mensaje idéntico exista o no la cuenta.
    setEnviado(datos.correo)
  }

  if (enviado) {
    return (
      <div
        className="space-y-5"
        style={{ animation: 'aparecer 0.5s cubic-bezier(0.23,1,0.32,1) 80ms both' }}
      >
        <div
          className="flex items-start gap-2.5 rounded-lg border border-green-100 bg-green-50 px-3.5 py-3"
          role="status"
        >
          <CheckCircle size={16} weight="fill" className="text-green-500 shrink-0 mt-px" />
          <p className="text-sm text-green-700">
            Te enviamos un enlace para restablecer tu contraseña a{' '}
            <span className="font-medium">{enviado}</span>. Revisa tu bandeja y
            la carpeta de spam.
          </p>
        </div>
        <button
          type="button"
          onClick={volver}
          className="flex items-center gap-1.5 text-sm text-caoba-600 hover:text-caoba-700 transition-colors duration-150"
        >
          <ArrowLeft size={14} />
          Volver al inicio de sesión
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5"
      style={{ animation: 'aparecer 0.5s cubic-bezier(0.23,1,0.32,1) 80ms both' }}
    >
      <div className="space-y-1.5">
        <p className="text-sm text-stone-500">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu
          contraseña.
        </p>
      </div>

      {/* Correo */}
      <div className="space-y-1.5">
        <label
          htmlFor="correo-recuperar"
          className="block text-sm font-medium text-stone-700"
        >
          Correo electrónico
        </label>
        <input
          id="correo-recuperar"
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

      {/* Error operativo */}
      {errors.root && (
        <div
          className="flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50 px-3.5 py-3 animate-aparecer"
          role="alert"
        >
          <Warning size={15} weight="fill" className="text-red-400 shrink-0 mt-px" />
          <p className="text-sm text-red-600">{errors.root.message}</p>
        </div>
      )}

      {/* Botón de envío */}
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
          Enviar enlace
        </span>

        {isSubmitting && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          </span>
        )}
      </button>

      {/* Volver */}
      <button
        type="button"
        onClick={volver}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors duration-150"
      >
        <ArrowLeft size={14} />
        Volver al inicio de sesión
      </button>
    </form>
  )
}
