'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CircleNotch, Plus, X } from '@phosphor-icons/react'
import { getUsuariosDelben, crearUsuarioFirestore, toggleUsuarioActivo } from '@/lib/firestore/distribuidores'
import { crearUsuarioAuth } from '@/lib/firebase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { BotonResetPassword } from '@/components/admin/boton-reset-password'
import type { Usuario } from '@/lib/firebase/tipos-firestore'

const schemaUsuario = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  contrasena: z.string().min(8, 'Mínimo 8 caracteres'),
  rol: z.enum(['super_admin', 'delben_facturacion']),
})
type FormUsuario = z.infer<typeof schemaUsuario>

const ETIQUETA_ROL: Record<string, { label: string; desc: string }> = {
  super_admin: { label: 'Super Admin', desc: 'Acceso total al sistema' },
  delben_facturacion: { label: 'Facturación', desc: 'Valoraciones internas' },
}

function formatFecha(ts: number) {
  return new Date(ts).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function EquipoDelbenPage() {
  const { rol } = useAuth()
  const esSuperAdmin = rol === 'super_admin'
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const form = useForm<FormUsuario>({
    resolver: zodResolver(schemaUsuario),
    defaultValues: { rol: 'delben_facturacion' },
  })

  const rolSeleccionado = form.watch('rol')

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      setUsuarios(await getUsuariosDelben())
    } finally {
      setCargando(false)
    }
  }

  async function onCrear(data: FormUsuario) {
    setCreando(true)
    setError(null)
    try {
      const uid = await crearUsuarioAuth(data.email, data.contrasena)
      await crearUsuarioFirestore(uid, {
        nombre: data.nombre,
        email: data.email,
        rol: data.rol,
        distribuidor_id: null,
        activo: true,
      })
      await cargar()
      setMostrarForm(false)
      form.reset()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      if (msg.includes('email-already-in-use')) {
        setError('Ya existe una cuenta con ese email.')
      } else {
        setError(`Error al crear el usuario: ${msg}`)
      }
    } finally {
      setCreando(false)
    }
  }

  async function handleToggleActivo(u: Usuario) {
    setToggling(u.id)
    try {
      await toggleUsuarioActivo(u.id, !u.activo)
      setUsuarios((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, activo: !u.activo } : x)),
      )
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Equipo Delben</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Usuarios internos con acceso al panel de administración.
          </p>
        </div>
        {!mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
          >
            <Plus size={13} weight="bold" />
            Nuevo usuario
          </button>
        )}
      </div>

      {/* Lista de usuarios */}
      {cargando ? (
        <div className="flex items-center justify-center py-16 gap-2 text-stone-400 text-sm">
          <CircleNotch size={18} className="animate-spin" />
          Cargando…
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100 overflow-hidden">
          {usuarios.length === 0 && !mostrarForm ? (
            <div className="py-12 text-center">
              <p className="text-sm text-stone-400">No hay usuarios Delben aún.</p>
            </div>
          ) : (
            usuarios.map((u) => {
              const etiqueta = ETIQUETA_ROL[u.rol]
              return (
                <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900">{u.nombre}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-semibold text-stone-700">
                        {etiqueta?.label ?? u.rol}
                      </p>
                      <p className="text-xs text-stone-400">{etiqueta?.desc}</p>
                    </div>
                    <span className="hidden sm:block h-4 w-px bg-stone-200" />
                    <p className="text-xs text-stone-400 hidden sm:block">{formatFecha(u.created_at)}</p>
                    {esSuperAdmin && (
                      <>
                        <span className="hidden sm:block h-4 w-px bg-stone-200" />
                        <BotonResetPassword email={u.email} />
                      </>
                    )}
                    <button
                      onClick={() => handleToggleActivo(u)}
                      disabled={toggling === u.id}
                      className={[
                        'rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
                        u.activo
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-stone-100 text-stone-400 hover:bg-stone-200',
                      ].join(' ')}
                    >
                      {toggling === u.id ? (
                        <CircleNotch size={11} className="animate-spin inline" />
                      ) : u.activo ? (
                        'Activo'
                      ) : (
                        'Inactivo'
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}

          {/* Formulario inline */}
          {mostrarForm && (
            <div className="px-5 py-5 bg-stone-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-stone-800">Nuevo usuario Delben</h3>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarForm(false)
                    setError(null)
                    form.reset()
                  }}
                  className="text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              <form onSubmit={form.handleSubmit(onCrear)} className="space-y-4">
                {/* Rol */}
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-2">Rol</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['super_admin', 'delben_facturacion'] as const).map((r) => (
                      <label
                        key={r}
                        className={[
                          'flex cursor-pointer flex-col rounded-lg border p-3 transition-all',
                          rolSeleccionado === r
                            ? 'border-stone-900 bg-stone-900 text-white'
                            : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300',
                        ].join(' ')}
                      >
                        <input
                          type="radio"
                          value={r}
                          {...form.register('rol')}
                          className="sr-only"
                        />
                        <span className="text-xs font-semibold">{ETIQUETA_ROL[r]!.label}</span>
                        <span
                          className={[
                            'mt-0.5 text-xs',
                            rolSeleccionado === r ? 'text-stone-300' : 'text-stone-400',
                          ].join(' ')}
                        >
                          {ETIQUETA_ROL[r]!.desc}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-stone-600 mb-1">Nombre completo</label>
                    <input
                      {...form.register('nombre')}
                      placeholder="Ej. Valentina Rodríguez"
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
                    />
                    {form.formState.errors.nombre && (
                      <p className="mt-1 text-xs text-red-600">{form.formState.errors.nombre.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
                    <input
                      {...form.register('email')}
                      type="email"
                      placeholder="correo@delben.com"
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
                    />
                    {form.formState.errors.email && (
                      <p className="mt-1 text-xs text-red-600">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  {/* Contraseña */}
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">Contraseña temporal</label>
                    <input
                      {...form.register('contrasena')}
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
                    />
                    {form.formState.errors.contrasena && (
                      <p className="mt-1 text-xs text-red-600">{form.formState.errors.contrasena.message}</p>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={creando}
                    className="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
                  >
                    {creando && <CircleNotch size={14} className="animate-spin" />}
                    {creando ? 'Creando…' : 'Crear usuario'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarForm(false)
                      setError(null)
                      form.reset()
                    }}
                    className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Nota informativa */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-1">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Roles disponibles</p>
        {Object.entries(ETIQUETA_ROL).map(([rol, info]) => (
          <div key={rol} className="flex items-start gap-3 text-xs py-1">
            <span className="font-semibold text-stone-700 w-28 shrink-0">{info.label}</span>
            <span className="text-stone-400">{info.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
