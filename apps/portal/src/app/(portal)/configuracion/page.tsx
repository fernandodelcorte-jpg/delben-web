'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CircleNotch, PencilSimple, Check, X, UploadSimple, Image } from '@phosphor-icons/react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase/client'
import { useAuth } from '@/components/providers/auth-provider'
import {
  getDistribuidor,
  getUsuariosDistribuidor,
  actualizarDistribuidor,
  crearUsuarioFirestore,
} from '@/lib/firestore/distribuidores'
import { crearUsuarioAuth } from '@/lib/firebase/client'
import type { Distribuidor, Usuario } from '@/lib/firebase/tipos-firestore'

// ─── Schema universo ──────────────────────────────────────────────────────────

const schemaUniverso = z.object({
  transporte_tipo:  z.enum(['porcentual', 'fijo']),
  transporte_pct:   z.coerce.number().min(0).max(100),
  instalacion_tipo: z.enum(['porcentual', 'fijo']),
  instalacion_pct:  z.coerce.number().min(0).max(100),
  imprevistos_pct:  z.coerce.number().min(0).max(100),
  utilidad_pct:     z.coerce.number().min(0).max(100),
  iva_pct:          z.coerce.number().min(0).max(100),
})
type FormUniverso = z.infer<typeof schemaUniverso>

// ─── Schema nuevo usuario ─────────────────────────────────────────────────────

const schemaUsuario = z.object({
  nombre:    z.string().min(2, 'Mínimo 2 caracteres'),
  email:     z.string().email('Email inválido'),
  contrasena: z.string().min(8, 'Mínimo 8 caracteres'),
  rol: z.enum(['distribuidor_costos', 'distribuidor_comercial']),
})
type FormUsuario = z.infer<typeof schemaUsuario>

const ETIQUETA_ROL: Record<string, string> = {
  distribuidor_admin:     'Admin',
  distribuidor_costos:    'Costos',
  distribuidor_comercial: 'Comercial',
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const { distribuidorId, rol, cargando: cargandoAuth } = useAuth()
  const router = useRouter()
  const [distribuidor, setDistribuidor] = useState<Distribuidor | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [editandoUniverso, setEditandoUniverso] = useState(false)
  const [guardandoUniverso, setGuardandoUniverso] = useState(false)
  const [mostrarFormUsuario, setMostrarFormUsuario] = useState(false)
  const [creandoUsuario, setCreandoUsuario] = useState(false)
  const [errorUsuario, setErrorUsuario] = useState<string | null>(null)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [errorLogo, setErrorLogo] = useState<string | null>(null)
  const inputLogoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (cargandoAuth) return
    if (rol !== 'distribuidor_admin') {
      router.replace('/')
      return
    }
    if (!distribuidorId) return
    Promise.all([
      getDistribuidor(distribuidorId),
      getUsuariosDistribuidor(distribuidorId),
    ]).then(([dist, usrs]) => {
      setDistribuidor(dist)
      setUsuarios(usrs)
    }).finally(() => setCargando(false))
  }, [distribuidorId, rol, cargandoAuth, router])

  const universoForm = useForm<FormUniverso>({
    resolver: zodResolver(schemaUniverso),
  })

  const usuarioForm = useForm<FormUsuario>({
    resolver: zodResolver(schemaUsuario),
    defaultValues: { rol: 'distribuidor_comercial' },
  })

  function abrirEditarUniverso() {
    if (!distribuidor) return
    universoForm.reset({
      transporte_tipo: distribuidor.universo.transporte_tipo ?? 'porcentual',
      transporte_pct:  distribuidor.universo.transporte_pct,
      instalacion_tipo: distribuidor.universo.instalacion_tipo ?? 'porcentual',
      instalacion_pct: distribuidor.universo.instalacion_pct,
      imprevistos_pct: distribuidor.universo.imprevistos_pct,
      utilidad_pct:    distribuidor.universo.utilidad_pct,
      iva_pct:         distribuidor.universo.iva_pct,
    })
    setEditandoUniverso(true)
  }

  async function onGuardarUniverso(data: FormUniverso) {
    if (!distribuidor || !distribuidorId) return
    setGuardandoUniverso(true)
    try {
      await actualizarDistribuidor(distribuidorId, { universo: data })
      setDistribuidor({ ...distribuidor, universo: data })
      setEditandoUniverso(false)
    } finally {
      setGuardandoUniverso(false)
    }
  }

  async function onCrearUsuario(data: FormUsuario) {
    if (!distribuidorId) return
    setCreandoUsuario(true)
    setErrorUsuario(null)
    try {
      const uid = await crearUsuarioAuth(data.email, data.contrasena)
      await crearUsuarioFirestore(uid, {
        nombre: data.nombre,
        email: data.email,
        rol: data.rol,
        distribuidor_id: distribuidorId,
        activo: true,
      })
      const nuevos = await getUsuariosDistribuidor(distribuidorId)
      setUsuarios(nuevos)
      setMostrarFormUsuario(false)
      usuarioForm.reset()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      setErrorUsuario(
        msg.includes('email-already-in-use')
          ? 'Ya existe una cuenta con ese email.'
          : `Error: ${msg}`,
      )
    } finally {
      setCreandoUsuario(false)
    }
  }

  async function handleSubirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    if (!distribuidorId) return
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrorLogo('Solo se admiten imágenes (PNG, JPG, SVG).')
      return
    }
    setSubiendoLogo(true)
    setErrorLogo(null)
    try {
      const storageRef = ref(storage, `logos/distribuidores/${distribuidorId}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await actualizarDistribuidor(distribuidorId, { logo_url: url })
      setDistribuidor((prev) => (prev ? { ...prev, logo_url: url } : prev))
    } catch {
      setErrorLogo('No se pudo subir el logo. Intenta de nuevo.')
    } finally {
      setSubiendoLogo(false)
      if (inputLogoRef.current) inputLogoRef.current.value = ''
    }
  }

  if (cargandoAuth || cargando) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-2 text-stone-400 text-sm">
        <CircleNotch size={18} className="animate-spin" />
        Cargando…
      </div>
    )
  }

  if (!distribuidor) return null

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Configuración</h1>
          <p className="mt-0.5 text-sm text-stone-400">{distribuidor.nombre}</p>
        </div>

        {/* Mi empresa (solo lectura) */}
        <section className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-5">
            Mi empresa
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-8 text-sm">
            <Dato label="Nombre" valor={distribuidor.nombre} />
            <Dato label="País" valor={distribuidor.pais} />
            <Dato label="Ciudad" valor={distribuidor.ciudad} />
            <Dato
              label="Modalidades habilitadas"
              valor={[
                distribuidor.acceso_desarmado && 'Desarmado',
                distribuidor.acceso_tradicional && 'Tradicional',
              ].filter(Boolean).join(' · ') || '—'}
            />
          </div>
        </section>

        {/* Logo de la empresa */}
        <section className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
          <div>
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
              Logo de la empresa
            </h2>
            <p className="text-xs text-stone-400">
              Aparece en las cotizaciones y órdenes de compra PDF.
            </p>
          </div>

          {distribuidor.logo_url ? (
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={distribuidor.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
              <p className="text-xs text-stone-400">Logo actual</p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-stone-200 p-5 flex flex-col items-center gap-2 text-center">
              <Image size={22} className="text-stone-300" />
              <p className="text-xs text-stone-400">Sin logo configurado</p>
            </div>
          )}

          <div>
            <input
              ref={inputLogoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSubirLogo}
            />
            <button
              onClick={() => inputLogoRef.current?.click()}
              disabled={subiendoLogo}
              className="tactil flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50 disabled:opacity-50 transition-colors"
            >
              {subiendoLogo ? (
                <CircleNotch size={14} className="animate-spin" />
              ) : (
                <UploadSimple size={14} weight="bold" />
              )}
              {subiendoLogo ? 'Subiendo…' : distribuidor.logo_url ? 'Cambiar logo' : 'Subir logo'}
            </button>
            {errorLogo && <p className="mt-2 text-xs text-red-600">{errorLogo}</p>}
          </div>
        </section>

        {/* Condiciones Delben (solo lectura) */}
        <section className="rounded-xl border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Condiciones Delben
            </h2>
            <span className="text-xs text-stone-400">Configurado por Delben</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-8 text-sm">
            <Dato label="Desc. muebles"      valor={`${distribuidor.descuento_muebles_pct}%`} />
            <Dato label="Desc. herrajes"     valor={`${distribuidor.descuento_herrajes_pct}%`} />
            <Dato label="Diseño"             valor={`${distribuidor.servicios.diseno_pct}%`} />
            <Dato label="Cotización"         valor={`${distribuidor.servicios.cotizacion_pct}%`} />
            <Dato label="Producción"         valor={`${distribuidor.servicios.produccion_pct}%`} />
            <Dato label="Logística"          valor={`${distribuidor.servicios.logistica_pct}%`} />
            <Dato label="Gestión comercial"  valor={`${distribuidor.servicios.gestion_comercial_pct}% (margin)`} />
          </div>
        </section>

        {/* Mi universo (editable) */}
        <section className="rounded-xl border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Mi universo
            </h2>
            {!editandoUniverso && (
              <button
                onClick={abrirEditarUniverso}
                className="tactil flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800"
              >
                <PencilSimple size={13} weight="bold" />
                Editar
              </button>
            )}
          </div>

          {editandoUniverso ? (
            <form onSubmit={universoForm.handleSubmit(onGuardarUniverso)} className="space-y-5">
              {/* Transporte */}
              <FilaUniversoConTipo
                label="Transporte"
                campoPct="transporte_pct"
                campoTipo="transporte_tipo"
                form={universoForm}
              />
              {/* Instalación */}
              <FilaUniversoConTipo
                label="Instalación"
                campoPct="instalacion_pct"
                campoTipo="instalacion_tipo"
                form={universoForm}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {(
                  [
                    ['imprevistos_pct', 'Imprevistos %'],
                    ['utilidad_pct',    'Utilidad % (margin)'],
                    ['iva_pct',         'IVA %'],
                  ] as const
                ).map(([campo, etiqueta]) => (
                  <div key={campo}>
                    <label className="block text-xs text-stone-500 mb-1">{etiqueta}</label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={100}
                      {...universoForm.register(campo)}
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                    />
                    {universoForm.formState.errors[campo] && (
                      <p className="mt-1 text-xs text-red-600">
                        {universoForm.formState.errors[campo]?.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={guardandoUniverso}
                  className="tactil flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50 transition-colors"
                >
                  {guardandoUniverso ? (
                    <CircleNotch size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} weight="bold" />
                  )}
                  {guardandoUniverso ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoUniverso(false)}
                  className="tactil flex items-center gap-1 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
                >
                  <X size={14} weight="bold" />
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-8 text-sm">
              <Dato
                label="Transporte"
                valor={(distribuidor.universo.transporte_tipo ?? 'porcentual') === 'fijo'
                  ? 'Valor fijo por proyecto'
                  : `${distribuidor.universo.transporte_pct}%`}
              />
              <Dato
                label="Instalación"
                valor={(distribuidor.universo.instalacion_tipo ?? 'porcentual') === 'fijo'
                  ? 'Valor fijo por proyecto'
                  : `${distribuidor.universo.instalacion_pct}%`}
              />
              <Dato label="Imprevistos" valor={`${distribuidor.universo.imprevistos_pct}%`} />
              <Dato label="Utilidad"    valor={`${distribuidor.universo.utilidad_pct}% (margin)`} />
              <Dato label="IVA"         valor={`${distribuidor.universo.iva_pct}%`} />
            </div>
          )}
        </section>

        {/* Mi equipo */}
        <section className="rounded-xl border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Mi equipo
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
              Sin usuarios adicionales.
            </p>
          )}

          <div className="divide-y divide-stone-100">
            {usuarios.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-stone-900">{u.nombre}</p>
                  <p className="text-xs text-stone-400">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                    {ETIQUETA_ROL[u.rol] ?? u.rol}
                  </span>
                  <span
                    className={[
                      'rounded-full px-2.5 py-0.5 text-xs font-medium',
                      u.activo
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-stone-100 text-stone-400',
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
              onSubmit={usuarioForm.handleSubmit(onCrearUsuario)}
              className="mt-5 pt-5 border-t border-stone-100 space-y-4"
            >
              <h3 className="text-sm font-semibold text-stone-700">Nuevo usuario</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-stone-600 mb-1">Nombre</label>
                  <input
                    {...usuarioForm.register('nombre')}
                    placeholder="Nombre completo"
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                  />
                  {usuarioForm.formState.errors.nombre && (
                    <p className="mt-1 text-xs text-red-600">
                      {usuarioForm.formState.errors.nombre.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
                  <input
                    {...usuarioForm.register('email')}
                    type="email"
                    placeholder="correo@empresa.com"
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                  />
                  {usuarioForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-600">
                      {usuarioForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Contraseña temporal
                  </label>
                  <input
                    {...usuarioForm.register('contrasena')}
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                  />
                  {usuarioForm.formState.errors.contrasena && (
                    <p className="mt-1 text-xs text-red-600">
                      {usuarioForm.formState.errors.contrasena.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Rol</label>
                  <select
                    {...usuarioForm.register('rol')}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400 bg-white"
                  >
                    <option value="distribuidor_comercial">Comercial</option>
                    <option value="distribuidor_costos">Costos</option>
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
                  className="tactil rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
                >
                  {creandoUsuario ? 'Creando…' : 'Crear usuario'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFormUsuario(false)
                    setErrorUsuario(null)
                    usuarioForm.reset()
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
    </div>
  )
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-stone-800">{valor}</p>
    </div>
  )
}

function FilaUniversoConTipo({
  label,
  campoPct,
  campoTipo,
  form,
}: {
  label: string
  campoPct: 'transporte_pct' | 'instalacion_pct'
  campoTipo: 'transporte_tipo' | 'instalacion_tipo'
  form: ReturnType<typeof useForm<FormUniverso>>
}) {
  const tipo = form.watch(campoTipo)
  return (
    <div className="space-y-2">
      <p className="text-xs text-stone-500">{label}</p>
      <div className="flex items-center gap-2">
        {(['porcentual', 'fijo'] as const).map((t) => (
          <label
            key={t}
            className={[
              'flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all',
              tipo === t
                ? 'border-stone-900 bg-stone-900 text-white'
                : 'border-stone-200 text-stone-600 hover:border-stone-300',
            ].join(' ')}
          >
            <input type="radio" value={t} {...form.register(campoTipo)} className="sr-only" />
            {t === 'porcentual' ? 'Porcentual' : 'Valor fijo por proyecto'}
          </label>
        ))}
      </div>
      {tipo === 'porcentual' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            min={0}
            max={100}
            {...form.register(campoPct)}
            className="w-28 rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
          />
          <span className="text-xs text-stone-400">%</span>
        </div>
      )}
      {tipo === 'fijo' && (
        <p className="text-xs text-stone-400 italic">
          El monto se ingresará manualmente en cada proyecto al cotizar.
        </p>
      )}
    </div>
  )
}
