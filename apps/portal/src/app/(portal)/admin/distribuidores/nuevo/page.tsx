'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { crearDistribuidor } from '@/lib/firestore/distribuidores'

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  pais: z.enum(['Colombia', 'Venezuela', 'USA'], { required_error: 'Selecciona un país' }),
  ciudad: z.string().min(2, 'Mínimo 2 caracteres'),
  acceso_tradicional: z.boolean(),
  acceso_desarmado: z.boolean(),
  descuento_muebles_pct: z.coerce.number().min(0).max(100),
  descuento_herrajes_pct: z.coerce.number().min(0).max(100),
  diseno_pct: z.coerce.number().min(0).max(100),
  cotizacion_pct: z.coerce.number().min(0).max(100),
  produccion_pct: z.coerce.number().min(0).max(100),
  logistica_pct: z.coerce.number().min(0).max(100),
  gestion_comercial_pct: z.coerce.number().min(0).max(100),
  transporte_pct: z.coerce.number().min(0).max(100),
  instalacion_pct: z.coerce.number().min(0).max(100),
  imprevistos_pct: z.coerce.number().min(0).max(100),
  utilidad_pct: z.coerce.number().min(0).max(100),
  iva_pct: z.coerce.number().min(0).max(100),
})

type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = {
  nombre: '',
  pais: 'Colombia',
  ciudad: '',
  acceso_tradicional: true,
  acceso_desarmado: true,
  descuento_muebles_pct: 35,
  descuento_herrajes_pct: 15,
  diseno_pct: 3,
  cotizacion_pct: 2,
  produccion_pct: 5,
  logistica_pct: 4,
  gestion_comercial_pct: 6,
  transporte_pct: 5,
  instalacion_pct: 8,
  imprevistos_pct: 3,
  utilidad_pct: 25,
  iva_pct: 19,
}

function Campo({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function inputCls(error?: string) {
  return [
    'w-full rounded-lg border px-3.5 py-2.5 text-sm text-stone-900 outline-none transition-all',
    error
      ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
      : 'border-stone-200 bg-white focus:border-stone-400 focus:ring-2 focus:ring-stone-100',
  ].join(' ')
}

function numInput(
  register: ReturnType<typeof useForm<FormValues>>['register'],
  field: keyof FormValues,
  error?: string,
) {
  return (
    <input
      type="number"
      step="0.1"
      min="0"
      max="100"
      {...register(field)}
      className={inputCls(error)}
    />
  )
}

export default function NuevoDistribuidorPage() {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })

  async function onSubmit(data: FormValues) {
    setGuardando(true)
    setErrorGuardado(null)
    try {
      await crearDistribuidor({
        nombre: data.nombre,
        pais: data.pais,
        ciudad: data.ciudad,
        acceso_tradicional: data.acceso_tradicional,
        acceso_desarmado: data.acceso_desarmado,
        descuento_muebles_pct: data.descuento_muebles_pct,
        descuento_herrajes_pct: data.descuento_herrajes_pct,
        servicios: {
          diseno_pct: data.diseno_pct,
          cotizacion_pct: data.cotizacion_pct,
          produccion_pct: data.produccion_pct,
          logistica_pct: data.logistica_pct,
          gestion_comercial_pct: data.gestion_comercial_pct,
        },
        universo: {
          iva_pct: data.iva_pct,
          desarmado: {
            transporte_pct: data.transporte_pct,
            instalacion_pct: data.instalacion_pct,
            imprevistos_pct: data.imprevistos_pct,
            utilidad_pct: data.utilidad_pct,
          },
          tradicional: {
            transporte_pct: data.transporte_pct,
            instalacion_pct: data.instalacion_pct,
            imprevistos_pct: data.imprevistos_pct,
            utilidad_pct: data.utilidad_pct,
          },
        },
        activo: true,
      })
      router.push('/admin/distribuidores')
    } catch {
      setErrorGuardado('Error al guardar el distribuidor. Intenta de nuevo.')
    } finally {
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
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Datos generales */}
        <section className="rounded-xl border border-stone-200 bg-white p-6 space-y-5">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Datos generales
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Campo label="Nombre de la empresa" error={errors.nombre?.message}>
                <input
                  {...register('nombre')}
                  placeholder="Ej. Muebles del Norte S.A.S."
                  className={inputCls(errors.nombre?.message)}
                />
              </Campo>
            </div>
            <Campo label="País" error={errors.pais?.message}>
              <select {...register('pais')} className={inputCls(errors.pais?.message)}>
                <option value="Colombia">Colombia</option>
                <option value="Venezuela">Venezuela</option>
                <option value="USA">USA</option>
              </select>
            </Campo>
            <Campo label="Ciudad" error={errors.ciudad?.message}>
              <input
                {...register('ciudad')}
                placeholder="Ej. Bogotá"
                className={inputCls(errors.ciudad?.message)}
              />
            </Campo>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input type="checkbox" {...register('acceso_tradicional')} className="rounded" />
              Acceso tradicional
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input type="checkbox" {...register('acceso_desarmado')} className="rounded" />
              Acceso desarmado
            </label>
          </div>
        </section>

        {/* Descuentos */}
        <section className="rounded-xl border border-stone-200 bg-white p-6 space-y-5">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Descuentos al distribuidor (%)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Descuento muebles %" error={errors.descuento_muebles_pct?.message}>
              {numInput(register, 'descuento_muebles_pct', errors.descuento_muebles_pct?.message)}
            </Campo>
            <Campo label="Descuento herrajes %" error={errors.descuento_herrajes_pct?.message}>
              {numInput(register, 'descuento_herrajes_pct', errors.descuento_herrajes_pct?.message)}
            </Campo>
          </div>
        </section>

        {/* Servicios Delben */}
        <section className="rounded-xl border border-stone-200 bg-white p-6 space-y-5">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Servicios Delben (%)
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Campo label="Diseño %" error={errors.diseno_pct?.message}>
              {numInput(register, 'diseno_pct', errors.diseno_pct?.message)}
            </Campo>
            <Campo label="Cotización %" error={errors.cotizacion_pct?.message}>
              {numInput(register, 'cotizacion_pct', errors.cotizacion_pct?.message)}
            </Campo>
            <Campo label="Producción %" error={errors.produccion_pct?.message}>
              {numInput(register, 'produccion_pct', errors.produccion_pct?.message)}
            </Campo>
            <Campo label="Logística %" error={errors.logistica_pct?.message}>
              {numInput(register, 'logistica_pct', errors.logistica_pct?.message)}
            </Campo>
            <Campo label="Gestión comercial %" error={errors.gestion_comercial_pct?.message}>
              {numInput(register, 'gestion_comercial_pct', errors.gestion_comercial_pct?.message)}
            </Campo>
          </div>
        </section>

        {/* Universo distribuidor */}
        <section className="rounded-xl border border-stone-200 bg-white p-6 space-y-5">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Universo del distribuidor (%)
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Campo label="Transporte %" error={errors.transporte_pct?.message}>
              {numInput(register, 'transporte_pct', errors.transporte_pct?.message)}
            </Campo>
            <Campo label="Instalación %" error={errors.instalacion_pct?.message}>
              {numInput(register, 'instalacion_pct', errors.instalacion_pct?.message)}
            </Campo>
            <Campo label="Imprevistos %" error={errors.imprevistos_pct?.message}>
              {numInput(register, 'imprevistos_pct', errors.imprevistos_pct?.message)}
            </Campo>
            <Campo label="Utilidad % (margin)" error={errors.utilidad_pct?.message}>
              {numInput(register, 'utilidad_pct', errors.utilidad_pct?.message)}
            </Campo>
            <Campo label="IVA %" error={errors.iva_pct?.message}>
              {numInput(register, 'iva_pct', errors.iva_pct?.message)}
            </Campo>
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
