'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CircleNotch, ArrowLeft } from '@phosphor-icons/react'
import { useCarrito } from '@/store/carrito'
import { useAuth } from '@/components/providers/auth-provider'
import { getCategoriasMacro } from '@/lib/firestore/catalogo'
import { getProyectos, crearProyecto } from '@/lib/firestore/proyectos'
import { getSiguienteVersion } from '@/lib/firestore/cotizaciones'
import type { CategoriaMacro, Proyecto } from '@/lib/firebase/tipos-firestore'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const schemaProyectoNuevo = z.object({
  clienteNombre: z.string().min(2, 'Mínimo 2 caracteres'),
  clienteDireccion: z.string().optional(),
  clienteCiudad: z.string().optional(),
  proyectoNombre: z.string().min(2, 'Mínimo 2 caracteres'),
})

const schemaEspacio = z.object({
  espacioNombre: z.string().min(2, 'Mínimo 2 caracteres'),
  modalidad: z.enum(['tradicional', 'desarmado']),
  categoriaId: z.string().min(1, 'Selecciona una categoría'),
  categoriaNombre: z.string(),
})

type FormProyecto = z.infer<typeof schemaProyectoNuevo>
type FormEspacio = z.infer<typeof schemaEspacio>

// ─── Página ───────────────────────────────────────────────────────────────────

export default function NuevaCotizacionPage() {
  return (
    <Suspense>
      <NuevaCotizacionContent />
    </Suspense>
  )
}

function NuevaCotizacionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const iniciarCotizacion = useCarrito((s) => s.iniciarCotizacion)
  const { usuario, distribuidorId, distribuidor } = useAuth()

  // Si llega ?proyecto=ID (y opcionalmente ?espacio=nombre), saltar al paso 2
  const proyectoParamId = searchParams.get('proyecto') ?? ''
  const espacioParam = searchParams.get('espacio') ?? ''

  const [paso, setPaso] = useState<1 | 2>(proyectoParamId ? 2 : 1)
  const [modoProyecto, setModoProyecto] = useState<'nuevo' | 'existente'>(
    proyectoParamId ? 'existente' : 'nuevo',
  )
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [proyectoSeleccionadoId, setProyectoSeleccionadoId] = useState<string>(proyectoParamId)
  const [categorias, setCategorias] = useState<CategoriaMacro[]>([])
  const [cargandoCats, setCargandoCats] = useState(true)
  const [cargandoProyectos, setCargandoProyectos] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // Datos del proyecto cuando se crea nuevo (guardados entre pasos)
  const [datosProyectoNuevo, setDatosProyectoNuevo] = useState<FormProyecto | null>(null)

  useEffect(() => {
    getCategoriasMacro()
      .then(setCategorias)
      .finally(() => setCargandoCats(false))
    if (espacioParam) {
      formEspacio.setValue('espacioNombre', espacioParam)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!distribuidorId) return
    getProyectos(distribuidorId)
      .then(setProyectos)
      .finally(() => setCargandoProyectos(false))
  }, [distribuidorId])

  // ─── Formulario paso 1 (proyecto nuevo) ────────────────────────────────────

  const formProyecto = useForm<FormProyecto>({
    resolver: zodResolver(schemaProyectoNuevo),
  })

  function onSubmitProyecto(data: FormProyecto) {
    setDatosProyectoNuevo(data)
    setPaso(2)
  }

  function onElegirExistente() {
    if (!proyectoSeleccionadoId) return
    setPaso(2)
  }

  // ─── Formulario paso 2 (espacio) ────────────────────────────────────────────

  const formEspacio = useForm<FormEspacio>({
    resolver: zodResolver(schemaEspacio),
    defaultValues: { modalidad: 'desarmado', categoriaId: '', categoriaNombre: '' },
  })

  const modalidad = formEspacio.watch('modalidad')
  const categoriaIdSeleccionada = formEspacio.watch('categoriaId')

  async function onSubmitEspacio(data: FormEspacio) {
    if (!distribuidorId || !usuario) return
    setGuardando(true)
    try {
      let proyectoId: string
      let clienteNombre: string
      let clienteDireccion: string | undefined
      let proyectoNombre: string

      if (modoProyecto === 'nuevo' && datosProyectoNuevo) {
        proyectoId = await crearProyecto(distribuidorId, usuario.uid, {
          clienteNombre: datosProyectoNuevo.clienteNombre,
          clienteDireccion: datosProyectoNuevo.clienteDireccion,
          clienteCiudad: datosProyectoNuevo.clienteCiudad,
          proyectoNombre: datosProyectoNuevo.proyectoNombre,
        })
        clienteNombre = datosProyectoNuevo.clienteNombre
        clienteDireccion = datosProyectoNuevo.clienteDireccion
        proyectoNombre = datosProyectoNuevo.proyectoNombre
      } else {
        const p = proyectos.find((pr) => pr.id === proyectoSeleccionadoId)
        if (!p) return
        proyectoId = p.id
        clienteNombre = p.clienteNombre
        clienteDireccion = p.clienteDireccion
        proyectoNombre = p.proyectoNombre
      }

      const version = await getSiguienteVersion(distribuidorId, proyectoId, data.espacioNombre)

      iniciarCotizacion(
        {
          clienteNombre,
          clienteDireccion,
          proyectoNombre,
          modalidad: data.modalidad,
          categoriaId: data.categoriaId,
          categoriaNombre: data.categoriaNombre,
          transporteFijo: 0,
          instalacionFija: 0,
          proyectoId,
          espacioNombre: data.espacioNombre,
          version,
        },
        distribuidor,
      )
      router.push('/cotizaciones/borrador')
    } finally {
      setGuardando(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex justify-center pt-4 pb-12">
      <div className="w-full max-w-md">

        {/* ── Paso 1: Proyecto ─────────────────────────────────────────────── */}
        {paso === 1 && (
          <>
            <div className="mb-8">
              <p className="text-xs font-medium tracking-widest text-stone-400 uppercase mb-2">
                Paso 1 de 2
              </p>
              <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
                Proyecto
              </h1>
              <p className="mt-2 text-sm text-stone-500">
                Agrupa todas las cotizaciones de una misma obra.
              </p>
            </div>

            {/* Toggle nuevo / existente */}
            <div className="flex rounded-lg border border-stone-200 bg-white p-1 mb-6">
              {(['nuevo', 'existente'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModoProyecto(m)}
                  className={[
                    'flex-1 rounded-md py-2 text-sm font-medium transition-all',
                    modoProyecto === m
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-500 hover:text-stone-700',
                  ].join(' ')}
                >
                  {m === 'nuevo' ? 'Nuevo proyecto' : 'Proyecto existente'}
                </button>
              ))}
            </div>

            {modoProyecto === 'nuevo' ? (
              <form onSubmit={formProyecto.handleSubmit(onSubmitProyecto)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Nombre del cliente
                  </label>
                  <input
                    {...formProyecto.register('clienteNombre')}
                    placeholder="Ej. María González"
                    className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
                  />
                  {formProyecto.formState.errors.clienteNombre && (
                    <p className="mt-1.5 text-xs text-red-600">{formProyecto.formState.errors.clienteNombre.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Ciudad <span className="text-xs font-normal text-stone-400">(opcional)</span>
                    </label>
                    <input
                      {...formProyecto.register('clienteCiudad')}
                      placeholder="Ej. Bogotá"
                      className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Dirección <span className="text-xs font-normal text-stone-400">(opcional)</span>
                    </label>
                    <input
                      {...formProyecto.register('clienteDireccion')}
                      placeholder="Ej. Calle 80 #15-32"
                      className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Nombre del proyecto / obra
                  </label>
                  <input
                    {...formProyecto.register('proyectoNombre')}
                    placeholder="Ej. Apartamento 302 — Torres del Parque"
                    className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
                  />
                  {formProyecto.formState.errors.proyectoNombre && (
                    <p className="mt-1.5 text-xs text-red-600">{formProyecto.formState.errors.proyectoNombre.message}</p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="tactil w-full rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-stone-800"
                  >
                    Siguiente →
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {cargandoProyectos ? (
                  <div className="space-y-2 animate-pulse">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-14 rounded-lg bg-stone-100" />
                    ))}
                  </div>
                ) : proyectos.length === 0 ? (
                  <p className="text-sm text-stone-500 py-4">
                    No tienes proyectos aún. Crea uno nuevo.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {proyectos.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProyectoSeleccionadoId(p.id)}
                        className={[
                          'w-full text-left rounded-lg border px-4 py-3 transition-all',
                          proyectoSeleccionadoId === p.id
                            ? 'border-stone-900 bg-stone-900 text-white'
                            : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300',
                        ].join(' ')}
                      >
                        <p className="text-sm font-semibold">{p.proyectoNombre}</p>
                        <p className={[
                          'text-xs mt-0.5',
                          proyectoSeleccionadoId === p.id ? 'text-stone-300' : 'text-stone-400',
                        ].join(' ')}>
                          {p.clienteNombre}{p.clienteCiudad ? ` · ${p.clienteCiudad}` : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onElegirExistente}
                    disabled={!proyectoSeleccionadoId}
                    className="tactil w-full rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-stone-800 disabled:opacity-40"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Paso 2: Espacio ──────────────────────────────────────────────── */}
        {paso === 2 && (
          <>
            <div className="mb-8">
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-700 mb-4 transition-colors"
              >
                <ArrowLeft size={14} />
                Volver
              </button>
              <p className="text-xs font-medium tracking-widest text-stone-400 uppercase mb-2">
                Paso 2 de 2
              </p>
              <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
                Cotización
              </h1>
              <p className="mt-2 text-sm text-stone-500">
                ¿Qué espacio vas a cotizar dentro de este proyecto?
              </p>
            </div>

            <form onSubmit={formEspacio.handleSubmit(onSubmitEspacio)} className="space-y-5">
              {/* Nombre del espacio */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Espacio o producto
                </label>
                <input
                  {...formEspacio.register('espacioNombre')}
                  placeholder="Ej. Cocina, Closet principal, Sala-comedor…"
                  className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
                />
                {formEspacio.formState.errors.espacioNombre && (
                  <p className="mt-1.5 text-xs text-red-600">{formEspacio.formState.errors.espacioNombre.message}</p>
                )}
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Categoría del producto
                </label>
                {cargandoCats ? (
                  <div className="grid grid-cols-2 gap-2 animate-pulse">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-14 rounded-lg bg-stone-100" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {categorias.map((cat) => {
                      const seleccionada = categoriaIdSeleccionada === cat.id
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            formEspacio.setValue('categoriaId', cat.id, { shouldValidate: true })
                            formEspacio.setValue('categoriaNombre', cat.nombre)
                          }}
                          className={[
                            'rounded-lg border px-3 py-3 text-left transition-all',
                            seleccionada
                              ? 'border-stone-900 bg-stone-900 text-white'
                              : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300',
                          ].join(' ')}
                        >
                          <span className="text-sm font-semibold leading-snug block">
                            {cat.nombre}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
                {formEspacio.formState.errors.categoriaId && (
                  <p className="mt-1.5 text-xs text-red-600">{formEspacio.formState.errors.categoriaId.message}</p>
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
                        {...formEspacio.register('modalidad')}
                        className="sr-only"
                      />
                      <span className="text-sm font-semibold capitalize">{m}</span>
                      <span className={['mt-1 text-xs', modalidad === m ? 'text-stone-300' : 'text-stone-400'].join(' ')}>
                        {m === 'desarmado'
                          ? 'Despiezado, descuento fijo por categoría'
                          : 'Armado, descuento pactado por distribuidor'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="tactil w-full rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {guardando && <CircleNotch size={14} className="animate-spin" />}
                  Comenzar cotización →
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
