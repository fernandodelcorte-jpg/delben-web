'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { crearDistribuidor } from '@/lib/firestore/distribuidores'

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  // Sigla para el consecutivo de cotización (ej. PIE). Opcional al crear; se puede
  // completar luego en el detalle. Obligatoria para poder guardar cotizaciones.
  sigla: z.string().trim().max(8, 'Máximo 8 caracteres').optional(),
})

type FormValues = z.infer<typeof schema>

function inputCls(error?: string) {
  return [
    'w-full rounded-lg border px-3.5 py-2.5 text-sm text-stone-900 outline-none transition-all',
    error
      ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
      : 'border-stone-200 bg-white focus:border-stone-400 focus:ring-2 focus:ring-stone-100',
  ].join(' ')
}

export default function NuevoDistribuidorPage() {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { nombre: '', sigla: '' } })

  async function onSubmit(data: FormValues) {
    setGuardando(true)
    setErrorGuardado(null)
    try {
      const sigla = data.sigla?.trim().toUpperCase()
      const nuevoId = await crearDistribuidor({
        nombre: data.nombre,
        activo: true,
        ...(sigla ? { sigla } : {}),
      })
      // Las condiciones viven en las sedes: se crean desde el detalle.
      router.push(`/admin/distribuidores/${nuevoId}`)
    } catch {
      setErrorGuardado('Error al guardar el distribuidor. Intenta de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <p className="text-xs font-medium tracking-widest text-stone-400 uppercase mb-2">
          Distribuidores
        </p>
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
          Nuevo distribuidor
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Crea la empresa. Luego, en su detalle, agregas las sedes con su país y condiciones.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <section className="rounded-xl border border-stone-200 bg-white p-6 space-y-5">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Datos generales
          </h2>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Nombre de la empresa
            </label>
            <input
              {...register('nombre')}
              placeholder="Ej. Muebles del Norte S.A.S."
              className={inputCls(errors.nombre?.message)}
            />
            {errors.nombre && (
              <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Sigla <span className="text-stone-400 font-normal">(para el N.º de cotización, ej. PIE)</span>
            </label>
            <input
              {...register('sigla')}
              placeholder="Ej. PIE"
              maxLength={8}
              className={[inputCls(errors.sigla?.message), 'uppercase'].join(' ')}
            />
            {errors.sigla && (
              <p className="mt-1 text-xs text-red-600">{errors.sigla.message}</p>
            )}
          </div>
        </section>

        {errorGuardado && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorGuardado}
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            {guardando ? 'Guardando...' : 'Crear distribuidor'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
