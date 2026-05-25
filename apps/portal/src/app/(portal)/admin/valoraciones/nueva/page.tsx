'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CircleNotch, ArrowLeft } from '@phosphor-icons/react'
import { useCarrito } from '@/store/carrito'
import { getDistribuidores } from '@/lib/firestore/distribuidores'
import type { Distribuidor } from '@/lib/firebase/tipos-firestore'

const schema = z.object({
  distribuidorId: z.string().min(1, 'Selecciona un distribuidor'),
  clienteNombre: z.string().min(2, 'Mínimo 2 caracteres'),
  proyectoNombre: z.string().min(2, 'Mínimo 2 caracteres'),
  modalidad: z.enum(['tradicional', 'desarmado']),
})

type FormData = z.infer<typeof schema>

export default function NuevaValoracionPage() {
  const router = useRouter()
  const iniciarCotizacion = useCarrito((s) => s.iniciarCotizacion)
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    getDistribuidores()
      .then(setDistribuidores)
      .finally(() => setCargando(false))
  }, [])

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { modalidad: 'desarmado' },
  })

  const modalidad = watch('modalidad')
  const distribuidorIdSel = watch('distribuidorId')

  function onSubmit(data: FormData) {
    const dist = distribuidores.find((d) => d.id === data.distribuidorId)
    iniciarCotizacion(
      {
        clienteNombre: data.clienteNombre,
        proyectoNombre: data.proyectoNombre,
        modalidad: data.modalidad,
        categoriaId: '',
        categoriaNombre: '',
        transporteFijo: 0,
        instalacionFija: 0,
      },
      dist ?? null,
    )
    router.push('/admin/valoraciones/borrador')
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-start justify-center px-4 pt-16 pb-24">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push('/admin/valoraciones')}
            className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-700 mb-4 transition-colors"
          >
            <ArrowLeft size={14} />
            Valoraciones
          </button>
          <p className="text-xs font-medium tracking-widest text-stone-400 uppercase mb-2">
            Valoración interna
          </p>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
            Nueva valoración
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Para facturación Delben. No visible para el distribuidor.
          </p>
        </div>

        {cargando ? (
          <div className="flex items-center gap-2 text-sm text-stone-400 py-8">
            <CircleNotch size={15} className="animate-spin" />
            Cargando distribuidores…
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Distribuidor */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Distribuidor
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {distribuidores.map((d) => (
                  <label
                    key={d.id}
                    className={[
                      'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all',
                      distribuidorIdSel === d.id
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      value={d.id}
                      {...register('distribuidorId')}
                      className="sr-only"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{d.nombre}</p>
                      <p className={[
                        'text-xs mt-0.5',
                        distribuidorIdSel === d.id ? 'text-stone-300' : 'text-stone-400',
                      ].join(' ')}>
                        {d.ciudad}, {d.pais}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.distribuidorId && (
                <p className="mt-1.5 text-xs text-red-600">{errors.distribuidorId.message}</p>
              )}
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Nombre del cliente final
              </label>
              <input
                {...register('clienteNombre')}
                placeholder="Ej. María González"
                className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm placeholder:text-stone-400 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
              />
              {errors.clienteNombre && (
                <p className="mt-1.5 text-xs text-red-600">{errors.clienteNombre.message}</p>
              )}
            </div>

            {/* Proyecto */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Nombre del proyecto / obra
              </label>
              <input
                {...register('proyectoNombre')}
                placeholder="Ej. Apartamento 302 — Torres del Parque"
                className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm placeholder:text-stone-400 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
              />
              {errors.proyectoNombre && (
                <p className="mt-1.5 text-xs text-red-600">{errors.proyectoNombre.message}</p>
              )}
            </div>

            {/* Modalidad */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Modalidad
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['desarmado', 'tradicional'] as const).map((m) => (
                  <label
                    key={m}
                    className={[
                      'relative flex cursor-pointer flex-col rounded-lg border p-4 transition-all',
                      modalidad === m
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      value={m}
                      {...register('modalidad')}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold capitalize">{m}</span>
                    <span className={['mt-1 text-xs', modalidad === m ? 'text-stone-300' : 'text-stone-400'].join(' ')}>
                      {m === 'desarmado' ? 'Despiezado' : 'Armado completo'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="tactil w-full rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting && <CircleNotch size={14} className="animate-spin" />}
                Comenzar valoración →
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
