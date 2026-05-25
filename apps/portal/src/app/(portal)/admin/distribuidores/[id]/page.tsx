'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CircleNotch, Check } from '@phosphor-icons/react'
import { useAuth } from '@/components/providers/auth-provider'
import {
  getDistribuidor,
  getUsuariosDistribuidor,
  actualizarDistribuidor,
  crearUsuarioFirestore,
  guardarHistorialCondiciones,
  getHistorialCondiciones,
} from '@/lib/firestore/distribuidores'
import { crearUsuarioAuth } from '@/lib/firebase/client'
import type {
  Distribuidor,
  Usuario,
  HistorialCondiciones,
} from '@/lib/firebase/tipos-firestore'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const pct = z.coerce.number().min(0).max(100)

const schemaCondiciones = z.object({
  descuento_muebles_pct: pct,
  descuento_herrajes_pct: pct,
  diseno_pct: pct,
  cotizacion_pct: pct,
  produccion_pct: pct,
  logistica_pct: pct,
  gestion_comercial_pct: pct,
})
type FormCondiciones = z.infer<typeof schemaCondiciones>

const schemaUsuario = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  contrasena: z.string().min(8, 'Mínimo 8 caracteres'),
  rol: z.enum(['distribuidor_admin', 'distribuidor_costos', 'distribuidor_comercial']),
})
type FormUsuario = z.infer<typeof schemaUsuario>

const ETIQUETA_ROL: Record<string, string> = {
  distribuidor_admin: 'Admin',
  distribuidor_costos: 'Costos',
  distribuidor_comercial: 'Comercial',
}

function formatFecha(ts: number) {
  return new Date(ts).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DetalleDistribuidorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { usuario } = useAuth()

  const [distribuidor, setDistribuidor] = useState<Distribuidor | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [historial, setHistorial] = useState<HistorialCondiciones[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarFormUsuario, setMostrarFormUsuario] = useState(false)
  const [creandoUsuario, setCreandoUsuario] = useState(false)
  const [errorUsuario, setErrorUsuario] = useState<string | null>(null)
  const [actualizando, setActualizando] = useState(false)
  const [guardandoCondiciones, setGuardandoCondiciones] = useState(false)
  const [errorCondiciones, setErrorCondiciones] = useState<string | null>(null)
  const [guardadoOk, setGuardadoOk] = useState(false)

  const formCondiciones = useForm<FormCondiciones>({
    resolver: zodResolver(schemaCondiciones),
  })

  const formUsuario = useForm<FormUsuario>({
    resolver: zodResolver(schemaUsuario),
    defaultValues: { rol: 'distribuidor_comercial' },
  })

  useEffect(() => {
    Promise.all([
      getDistribuidor(id),
      getUsuariosDistribuidor(id).catch(() => [] as Usuario[]),
      getHistorialCondiciones(id).catch(() => [] as HistorialCondiciones[]),
    ]).then(([dist, usrs, hist]) => {
      setDistribuidor(dist)
      setUsuarios(usrs)
      setHistorial(hist)
      if (dist) {
        formCondiciones.reset({
          descuento_muebles_pct: dist.descuento_muebles_pct,
          descuento_herrajes_pct: dist.descuento_herrajes_pct,
          diseno_pct: dist.servicios.diseno_pct,
          cotizacion_pct: dist.servicios.cotizacion_pct,
          produccion_pct: dist.servicios.produccion_pct,
          logistica_pct: dist.servicios.logistica_pct,
          gestion_comercial_pct: dist.servicios.gestion_comercial_pct,
        })
      }
    }).finally(() => setCargando(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function toggleActivo() {
    if (!distribuidor) return
    setActualizando(true)
    try {
      await actualizarDistribuidor(id, { activo: !distribuidor.activo })
      setDistribuidor({ ...distribuidor, activo: !distribuidor.activo })
    } finally {
      setActualizando(false)
    }
  }

  async function onGuardarCondiciones(data: FormCondiciones) {
    if (!distribuidor) return
    setGuardandoCondiciones(true)
    setErrorCondiciones(null)
    setGuardadoOk(false)
    try {
      const condicionesActualizadas = {
        descuento_muebles_pct: data.descuento_muebles_pct,
        descuento_herrajes_pct: data.descuento_herrajes_pct,
        servicios: {
          diseno_pct: data.diseno_pct,
          cotizacion_pct: data.cotizacion_pct,
          produccion_pct: data.produccion_pct,
          logistica_pct: data.logistica_pct,
          gestion_comercial_pct: data.gestion_comercial_pct,
        },
      }

      await Promise.all([
        actualizarDistribuidor(id, condicionesActualizadas),
        guardarHistorialCondiciones(
          id,
          {
            descuento_muebles_pct: data.descuento_muebles_pct,
            descuento_herrajes_pct: data.descuento_herrajes_pct,
            servicios: {
              diseno_pct: data.diseno_pct,
              cotizacion_pct: data.cotizacion_pct,
              produccion_pct: data.produccion_pct,
              logistica_pct: data.logistica_pct,
              gestion_comercial_pct: data.gestion_comercial_pct,
            },
          },
          usuario?.uid ?? '',
        ),
      ])

      setDistribuidor({
        ...distribuidor,
        ...condicionesActualizadas,
      })

      const nuevoHistorial = await getHistorialCondiciones(id)
      setHistorial(nuevoHistorial)
      setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 3000)
    } catch {
      setErrorCondiciones('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setGuardandoCondiciones(false)
    }
  }

  async function onCrearUsuario(data: FormUsuario) {
    setCreandoUsuario(true)
    setErrorUsuario(null)
    try {
      const uid = await crearUsuarioAuth(data.email, data.contrasena)
      await crearUsuarioFirestore(uid, {
        nombre: data.nombre,
        email: data.email,
        rol: data.rol,
        distribuidor_id: id,
        activo: true,
      })
      const nuevosUsuarios = await getUsuariosDistribuidor(id)
      setUsuarios(nuevosUsuarios)
      setMostrarFormUsuario(false)
      formUsuario.reset()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      if (msg.includes('email-already-in-use')) {
        setErrorUsuario('Ya existe una cuenta con ese email.')
      } else {
        setErrorUsuario(`Error al crear el usuario: ${msg}`)
      }
    } finally {
      setCreandoUsuario(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-700" />
      </div>
    )
  }

  if (!distribuidor) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Distribuidor no encontrado.
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push('/admin/distribuidores')}
            className="text-xs text-stone-400 hover:text-stone-600 mb-3 flex items-center gap-1"
          >
            ← Distribuidores
          </button>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
            {distribuidor.nombre}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {distribuidor.ciudad}, {distribuidor.pais} ·{' '}
            {[
              distribuidor.acceso_tradicional && 'Tradicional',
              distribuidor.acceso_desarmado && 'Desarmado',
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <button
          onClick={toggleActivo}
          disabled={actualizando}
          className={[
            'rounded-full px-3.5 py-1 text-xs font-semibold transition-colors',
            distribuidor.activo
              ? 'bg-green-50 text-green-700 hover:bg-green-100'
              : 'bg-stone-100 text-stone-500 hover:bg-stone-200',
          ].join(' ')}
        >
          {distribuidor.activo ? 'Activo' : 'Inactivo'}
        </button>
      </div>

      {/* Condiciones Delben */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
              Condiciones Delben
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Descuentos y servicios que Delben aplica a este distribuidor.
            </p>
          </div>
          {guardadoOk && (
            <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
              <Check size={13} weight="bold" /> Guardado
            </span>
          )}
        </div>

        <form onSubmit={formCondiciones.handleSubmit(onGuardarCondiciones)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <CampoNumero
              label="Desc. muebles (%)"
              campo="descuento_muebles_pct"
              form={formCondiciones}
            />
            <CampoNumero
              label="Desc. herrajes (%)"
              campo="descuento_herrajes_pct"
              form={formCondiciones}
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
              Servicios Delben
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <CampoNumero label="Diseño (%)" campo="diseno_pct" form={formCondiciones} />
              <CampoNumero label="Cotización (%)" campo="cotizacion_pct" form={formCondiciones} />
              <CampoNumero label="Producción (%)" campo="produccion_pct" form={formCondiciones} />
              <CampoNumero label="Logística (%)" campo="logistica_pct" form={formCondiciones} />
              <CampoNumero
                label="Gestión comercial (% margin)"
                campo="gestion_comercial_pct"
                form={formCondiciones}
              />
            </div>
          </div>

          {errorCondiciones && (
            <p className="text-xs text-red-600">{errorCondiciones}</p>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={guardandoCondiciones}
              className="tactil flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50 transition-colors"
            >
              {guardandoCondiciones ? (
                <CircleNotch size={14} className="animate-spin" />
              ) : (
                <Check size={14} weight="bold" />
              )}
              {guardandoCondiciones ? 'Guardando…' : 'Guardar condiciones'}
            </button>
          </div>
        </form>
      </section>

      {/* Universo (solo lectura; lo edita el distribuidor_admin) */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Universo
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Lo configura el administrador del distribuidor en su panel.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm sm:grid-cols-3">
          <Dato label="Transporte" valor={`${distribuidor.universo.transporte_pct}%`} />
          <Dato label="Instalación" valor={`${distribuidor.universo.instalacion_pct}%`} />
          <Dato label="Imprevistos" valor={`${distribuidor.universo.imprevistos_pct}%`} />
          <Dato label="Utilidad (margin)" valor={`${distribuidor.universo.utilidad_pct}%`} />
          <Dato label="IVA" valor={`${distribuidor.universo.iva_pct}%`} />
        </div>
      </section>

      {/* Historial de condiciones */}
      {historial.length > 0 && (
        <section className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">
            Historial de condiciones
          </h2>
          <div className="divide-y divide-stone-100">
            {historial.slice(0, 10).map((h) => (
              <div key={h.id} className="py-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                <div className="col-span-2 sm:col-span-4 mb-0.5">
                  <span className="text-xs text-stone-400">{formatFecha(h.vigente_desde)}</span>
                </div>
                <Dato label="Desc. muebles" valor={`${h.descuento_muebles_pct}%`} />
                <Dato label="Desc. herrajes" valor={`${h.descuento_herrajes_pct}%`} />
                <Dato label="Diseño" valor={`${h.servicios.diseno_pct}%`} />
                <Dato label="Cotización" valor={`${h.servicios.cotizacion_pct}%`} />
                <Dato label="Producción" valor={`${h.servicios.produccion_pct}%`} />
                <Dato label="Logística" valor={`${h.servicios.logistica_pct}%`} />
                <Dato
                  label="Gest. comercial"
                  valor={`${h.servicios.gestion_comercial_pct}% (m)`}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Usuarios */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Usuarios
          </h2>
          {!mostrarFormUsuario && (
            <button
              onClick={() => setMostrarFormUsuario(true)}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline underline-offset-2"
            >
              + Agregar usuario
            </button>
          )}
        </div>

        {usuarios.length === 0 && !mostrarFormUsuario && (
          <p className="text-sm text-stone-400 text-center py-4">
            No hay usuarios. Agrega el primero.
          </p>
        )}

        <div className="divide-y divide-stone-100">
          {usuarios.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-stone-900">{u.nombre}</p>
                <p className="text-xs text-stone-400">{u.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                  {ETIQUETA_ROL[u.rol] ?? u.rol}
                </span>
                <span
                  className={[
                    'rounded-full px-2.5 py-0.5 text-xs font-medium',
                    u.activo ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-400',
                  ].join(' ')}
                >
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {mostrarFormUsuario && (
          <form
            onSubmit={formUsuario.handleSubmit(onCrearUsuario)}
            className="mt-5 pt-5 border-t border-stone-100 space-y-4"
          >
            <h3 className="text-sm font-semibold text-stone-700">Nuevo usuario</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-600 mb-1">Nombre</label>
                <input
                  {...formUsuario.register('nombre')}
                  placeholder="Nombre completo"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
                />
                {formUsuario.formState.errors.nombre && (
                  <p className="mt-1 text-xs text-red-600">
                    {formUsuario.formState.errors.nombre.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
                <input
                  {...formUsuario.register('email')}
                  type="email"
                  placeholder="correo@empresa.com"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
                />
                {formUsuario.formState.errors.email && (
                  <p className="mt-1 text-xs text-red-600">
                    {formUsuario.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Contraseña temporal
                </label>
                <input
                  {...formUsuario.register('contrasena')}
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
                />
                {formUsuario.formState.errors.contrasena && (
                  <p className="mt-1 text-xs text-red-600">
                    {formUsuario.formState.errors.contrasena.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Rol</label>
                <select
                  {...formUsuario.register('rol')}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
                >
                  <option value="distribuidor_comercial">Comercial</option>
                  <option value="distribuidor_costos">Costos</option>
                  <option value="distribuidor_admin">Admin</option>
                </select>
              </div>
            </div>

            {errorUsuario && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {errorUsuario}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={creandoUsuario}
                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
              >
                {creandoUsuario ? 'Creando...' : 'Crear usuario'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarFormUsuario(false)
                  setErrorUsuario(null)
                  formUsuario.reset()
                }}
                className="text-sm text-stone-500 hover:text-stone-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-stone-800">{valor}</p>
    </div>
  )
}

function CampoNumero({
  label,
  campo,
  form,
}: {
  label: string
  campo: keyof FormCondiciones
  form: ReturnType<typeof useForm<FormCondiciones>>
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <input
        {...form.register(campo)}
        type="number"
        min={0}
        max={100}
        step={0.01}
        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 tabular-nums"
      />
      {form.formState.errors[campo] && (
        <p className="mt-1 text-xs text-red-600">
          {form.formState.errors[campo]?.message}
        </p>
      )}
    </div>
  )
}
