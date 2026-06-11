'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CircleNotch, PencilSimple, Check, X, UploadSimple, Image, MapPin, CaretDown, CaretUp } from '@phosphor-icons/react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { InputPassword } from '@/components/ui/input-password'
import {
  getDistribuidor,
  getUsuariosDistribuidor,
  actualizarDistribuidor,
  crearUsuarioFirestore,
  actualizarSedesUsuario,
} from '@/lib/firestore/distribuidores'
import { getSedes, actualizarSede } from '@/lib/firestore/sedes'
import { crearUsuarioAuth } from '@/lib/firebase/client'
import type { Distribuidor, Sede, Usuario } from '@/lib/firebase/tipos-firestore'
import {
  getUniversoParaModalidad,
  universoCompletoParaModalidad,
  sedeHabilitada,
} from '@/lib/firebase/tipos-firestore'

// ─── Schema universo ──────────────────────────────────────────────────────────

const schemaModalidad = z.object({
  transporte_tipo:  z.enum(['porcentual', 'fijo']),
  transporte_pct:   z.coerce.number().min(0).max(100),
  instalacion_tipo: z.enum(['porcentual', 'fijo']),
  instalacion_pct:  z.coerce.number().min(0).max(100),
  imprevistos_pct:  z.coerce.number().min(0).max(100),
  utilidad_pct:     z.coerce.number().min(0).max(100),
})

const schemaUniverso = z.object({
  iva_pct:     z.coerce.number().min(0).max(100),
  desarmado:   schemaModalidad.optional(),
  tradicional: schemaModalidad.optional(),
})
type FormUniverso = z.infer<typeof schemaUniverso>
type ModalidadPrefijo = 'desarmado' | 'tradicional'

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
  const [sedes, setSedes] = useState<Sede[]>([])
  const [sedeSelId, setSedeSelId] = useState<string | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [editandoUniverso, setEditandoUniverso] = useState(false)
  const [guardandoUniverso, setGuardandoUniverso] = useState(false)
  const [mostrarFormUsuario, setMostrarFormUsuario] = useState(false)
  const [creandoUsuario, setCreandoUsuario] = useState(false)
  const [errorUsuario, setErrorUsuario] = useState<string | null>(null)
  // Sedes del nuevo usuario
  const [nuevoTodasSedes, setNuevoTodasSedes] = useState(false)
  const [nuevoSedes, setNuevoSedes] = useState<string[]>([])
  // Edición de sedes de un usuario existente
  const [editSedesUid, setEditSedesUid] = useState<string | null>(null)
  const [editTodasSedes, setEditTodasSedes] = useState(false)
  const [editSedes, setEditSedes] = useState<string[]>([])
  const [guardandoSedes, setGuardandoSedes] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [errorLogo, setErrorLogo] = useState<string | null>(null)
  const inputLogoRef = useRef<HTMLInputElement>(null)

  const sedeSel = sedes.find((s) => s.id === sedeSelId) ?? null

  useEffect(() => {
    if (cargandoAuth) return
    if (rol !== 'distribuidor_admin') {
      router.replace('/')
      return
    }
    if (!distribuidorId) return
    Promise.all([
      getDistribuidor(distribuidorId),
      getSedes(distribuidorId).catch(() => [] as Sede[]),
      getUsuariosDistribuidor(distribuidorId),
    ]).then(([dist, seds, usrs]) => {
      setDistribuidor(dist)
      setSedes(seds)
      // Una sola sede → tarjeta abierta por defecto; varias → todas colapsadas.
      setSedeSelId(seds.length === 1 ? seds[0]!.id : null)
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
    if (!sedeSel) return
    const resetData: FormUniverso = { iva_pct: sedeSel.universo.iva_pct }
    const toForm = (m: ModalidadPrefijo) => {
      const u = getUniversoParaModalidad(sedeSel.universo, m)
      return {
        transporte_tipo:  u.transporte_tipo ?? 'porcentual' as const,
        transporte_pct:   u.transporte_pct,
        instalacion_tipo: u.instalacion_tipo ?? 'porcentual' as const,
        instalacion_pct:  u.instalacion_pct,
        imprevistos_pct:  u.imprevistos_pct,
        utilidad_pct:     u.utilidad_pct,
      }
    }
    if (sedeSel.acceso_desarmado)   resetData.desarmado   = toForm('desarmado')
    if (sedeSel.acceso_tradicional) resetData.tradicional = toForm('tradicional')
    universoForm.reset(resetData)
    setEditandoUniverso(true)
  }

  function toggleSedeCard(id: string) {
    setEditandoUniverso(false)
    setSedeSelId((prev) => (prev === id ? null : id))
  }

  async function onGuardarUniverso(data: FormUniverso) {
    if (!sedeSel || !distribuidorId) return
    setGuardandoUniverso(true)
    try {
      await actualizarSede(distribuidorId, sedeSel.id, { universo: data })
      setSedes((prev) =>
        prev.map((s) => (s.id === sedeSel.id ? { ...s, universo: data } : s)),
      )
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
        sedes_asignadas: nuevoTodasSedes ? [] : nuevoSedes,
        todas_las_sedes: nuevoTodasSedes,
        activo: true,
      })
      const nuevos = await getUsuariosDistribuidor(distribuidorId)
      setUsuarios(nuevos)
      setMostrarFormUsuario(false)
      setNuevoTodasSedes(false)
      setNuevoSedes([])
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

  function abrirEditorSedes(u: Usuario) {
    setEditSedesUid(u.id)
    setEditTodasSedes(u.todas_las_sedes ?? false)
    setEditSedes(u.sedes_asignadas ?? [])
  }

  async function onGuardarSedesUsuario() {
    if (!editSedesUid) return
    setGuardandoSedes(true)
    try {
      const sedesFinal = editTodasSedes ? [] : editSedes
      await actualizarSedesUsuario(editSedesUid, sedesFinal, editTodasSedes)
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === editSedesUid
            ? { ...u, sedes_asignadas: sedesFinal, todas_las_sedes: editTodasSedes }
            : u,
        ),
      )
      setEditSedesUid(null)
    } finally {
      setGuardandoSedes(false)
    }
  }

  function descripcionSedes(u: Usuario): string {
    if (u.todas_las_sedes) return 'Todas las sedes'
    const ids = u.sedes_asignadas ?? []
    if (ids.length === 0) return 'Sin sede asignada'
    return sedes
      .filter((s) => ids.includes(s.id))
      .map((s) => s.nombre)
      .join(' · ')
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

        {/* Sin sedes */}
        {sedes.length === 0 && (
          <div className="rounded-xl border border-stone-200 bg-white px-6 py-10 text-center">
            <MapPin size={22} className="mx-auto text-stone-300 mb-2" />
            <p className="text-sm text-stone-500">
              Aún no hay sedes. Delben crea las sedes de tu empresa; cuando exista una,
              podrás configurar su universo aquí.
            </p>
          </div>
        )}

        {/* Sedes (tarjetas-acordeón) */}
        {sedes.length > 0 && (
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
              {sedes.length === 1 ? 'Sede' : 'Sedes'}
            </h2>
            <div className="space-y-3">
              {sedes.map((sede) => {
                const abierta = sede.id === sedeSelId
                return (
                  <div key={sede.id} className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                    {/* Cabecera colapsada */}
                    <button
                      type="button"
                      onClick={() => toggleSedeCard(sede.id)}
                      aria-expanded={abierta}
                      className="tactil w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      <MapPin size={16} className="text-stone-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-900 truncate">{sede.nombre}</p>
                        <p className="text-xs text-stone-400 truncate">{sede.ciudad}, {sede.pais}</p>
                      </div>
                      <BadgeEstadoSede sede={sede} />
                      {abierta ? (
                        <CaretUp size={14} weight="bold" className="text-stone-400 shrink-0" />
                      ) : (
                        <CaretDown size={14} weight="bold" className="text-stone-400 shrink-0" />
                      )}
                    </button>

                    {/* Contenido expandido */}
                    {abierta && (
                      <div className="border-t border-stone-100 px-4 py-4 space-y-6 animate-desplegarse origin-top">
                        {/* Datos de la sede (solo lectura) */}
                        <div>
                          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                            Datos de la sede
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-8 text-sm">
                            <Dato label="Sede" valor={sede.nombre} />
                            <Dato label="País" valor={sede.pais} />
                            <Dato label="Ciudad" valor={sede.ciudad} />
                            <Dato
                              label="Modalidades habilitadas"
                              valor={[
                                sede.acceso_desarmado && 'Desarmado',
                                sede.acceso_tradicional && 'Tradicional',
                              ].filter(Boolean).join(' · ') || '—'}
                            />
                          </div>
                        </div>

                        {/* Condiciones Delben (solo lectura) */}
                        <div className="pt-4 border-t border-stone-100">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                              Condiciones Delben
                            </p>
                            <span className="text-xs text-stone-400">Configurado por Delben</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-8 text-sm">
                            <Dato label="Desc. muebles"      valor={`${sede.descuento_muebles_pct}%`} />
                            <Dato label="Desc. herrajes"     valor={`${sede.descuento_herrajes_pct}%`} />
                            <Dato label="Diseño"             valor={`${sede.servicios.diseno_pct}%`} />
                            <Dato label="Cotización"         valor={`${sede.servicios.cotizacion_pct}%`} />
                            <Dato label="Producción"         valor={`${sede.servicios.produccion_pct}%`} />
                            <Dato label="Logística"          valor={`${sede.servicios.logistica_pct}%`} />
                            <Dato label="Gestión comercial"  valor={`${sede.servicios.gestion_comercial_pct}% (margin)`} />
                          </div>
                        </div>

                        {/* Universo de la sede (editable) */}
                        <div className="pt-4 border-t border-stone-100">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                              Universo de la sede
                            </p>
                            {!editandoUniverso && (
                              <button
                                onClick={abrirEditarUniverso}
                                className="tactil flex items-center gap-1.5 text-xs font-medium text-caoba-600 hover:text-caoba-700"
                              >
                                <PencilSimple size={13} weight="bold" />
                                Editar
                              </button>
                            )}
                          </div>

                          {editandoUniverso ? (
                            <form onSubmit={universoForm.handleSubmit(onGuardarUniverso)} className="space-y-6">
                              {sede.acceso_desarmado && (
                                <SeccionModalidadForm titulo="Desarmado" prefijo="desarmado" form={universoForm} />
                              )}
                              {sede.acceso_tradicional && (
                                <SeccionModalidadForm titulo="Tradicional" prefijo="tradicional" form={universoForm} conSeparador={sede.acceso_desarmado} />
                              )}
                              <div className={sede.acceso_desarmado || sede.acceso_tradicional ? 'pt-4 border-t border-stone-100' : ''}>
                                <label className="block text-xs text-stone-500 mb-1">IVA % (compartido)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min={0}
                                  max={100}
                                  {...universoForm.register('iva_pct')}
                                  className="w-28 rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
                                />
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button
                                  type="submit"
                                  disabled={guardandoUniverso}
                                  className="tactil flex items-center gap-1.5 rounded-lg bg-caoba-600 px-4 py-2 text-sm font-semibold text-white hover:bg-caoba-700 disabled:opacity-50 transition-colors"
                                >
                                  {guardandoUniverso ? <CircleNotch size={14} className="animate-spin" /> : <Check size={14} weight="bold" />}
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
                            <div className="space-y-5">
                              {sede.acceso_desarmado && (
                                <SeccionModalidadVista titulo="Desarmado" universo={sede.universo} modalidad="desarmado" />
                              )}
                              {sede.acceso_tradicional && (
                                <SeccionModalidadVista titulo="Tradicional" universo={sede.universo} modalidad="tradicional" conSeparador={sede.acceso_desarmado} />
                              )}
                              <div className={sede.acceso_desarmado || sede.acceso_tradicional ? 'pt-4 border-t border-stone-100' : ''}>
                                <Dato label="IVA" valor={`${sede.universo.iva_pct}%`} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

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
            {usuarios.map((u) => {
              const esAdmin = u.rol === 'distribuidor_admin'
              return (
                <div key={u.id} className="py-3">
                  <div className="flex items-center justify-between">
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

                  {/* Sedes asignadas (no aplica al admin: ve todas) */}
                  {sedes.length > 0 && !esAdmin && (
                    <div className="mt-2 pl-0.5">
                      {editSedesUid === u.id ? (
                        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-3">
                          <SelectorSedes
                            sedes={sedes}
                            todas={editTodasSedes}
                            seleccionadas={editSedes}
                            onToggleTodas={(v) => setEditTodasSedes(v)}
                            onToggleSede={(id) =>
                              setEditSedes((prev) =>
                                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                              )
                            }
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={onGuardarSedesUsuario}
                              disabled={guardandoSedes}
                              className="tactil flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-700 disabled:opacity-50 transition-colors"
                            >
                              {guardandoSedes ? (
                                <CircleNotch size={12} className="animate-spin" />
                              ) : (
                                <Check size={12} weight="bold" />
                              )}
                              Guardar sedes
                            </button>
                            <button
                              onClick={() => setEditSedesUid(null)}
                              className="text-xs text-stone-500 hover:text-stone-700"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-stone-500">
                            <span className="text-stone-400">Sedes: </span>
                            {descripcionSedes(u)}
                          </span>
                          <button
                            onClick={() => abrirEditorSedes(u)}
                            className="font-medium text-stone-500 hover:text-stone-800 underline underline-offset-2"
                          >
                            Editar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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
                  <InputPassword
                    {...usuarioForm.register('contrasena')}
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

              {sedes.length > 0 && (
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <p className="text-xs font-medium text-stone-600 mb-2">Sedes en las que puede cotizar</p>
                  <SelectorSedes
                    sedes={sedes}
                    todas={nuevoTodasSedes}
                    seleccionadas={nuevoSedes}
                    onToggleTodas={(v) => setNuevoTodasSedes(v)}
                    onToggleSede={(id) =>
                      setNuevoSedes((prev) =>
                        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                      )
                    }
                  />
                </div>
              )}

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

function modalidadesPendientes(sede: Sede): string[] {
  const faltan: string[] = []
  if (sede.acceso_desarmado && !universoCompletoParaModalidad(sede, 'desarmado'))
    faltan.push('Desarmado')
  if (sede.acceso_tradicional && !universoCompletoParaModalidad(sede, 'tradicional'))
    faltan.push('Tradicional')
  return faltan
}

// Estado calculado (no guardado): verde si la sede es cotizable, ámbar si falta
// configurar el universo de alguna modalidad. Colores semánticos de DESIGN.md.
function BadgeEstadoSede({ sede }: { sede: Sede }) {
  if (sedeHabilitada(sede)) {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        Lista para cotizar
      </span>
    )
  }
  const faltan = modalidadesPendientes(sede)
  const detalle =
    faltan.length > 0 ? `el universo de ${faltan.join(' y ')}` : 'el universo'
  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      Falta configurar {detalle}
    </span>
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

function SelectorSedes({
  sedes,
  todas,
  seleccionadas,
  onToggleTodas,
  onToggleSede,
}: {
  sedes: Sede[]
  todas: boolean
  seleccionadas: string[]
  onToggleTodas: (v: boolean) => void
  onToggleSede: (id: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={todas}
          onChange={(e) => onToggleTodas(e.target.checked)}
          className="accent-stone-800"
        />
        Todas las sedes
      </label>
      {!todas && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 pl-1">
          {sedes.map((s) => (
            <label key={s.id} className="flex items-center gap-1.5 text-sm text-stone-600">
              <input
                type="checkbox"
                checked={seleccionadas.includes(s.id)}
                onChange={() => onToggleSede(s.id)}
                className="accent-stone-800"
              />
              {s.nombre}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function FilaTipoConPct({
  label,
  campo,
  prefijo,
  form,
}: {
  label: string
  campo: 'transporte' | 'instalacion'
  prefijo: ModalidadPrefijo
  form: ReturnType<typeof useForm<FormUniverso>>
}) {
  const campoTipo = `${prefijo}.${campo}_tipo` as `${ModalidadPrefijo}.transporte_tipo`
  const campoPct  = `${prefijo}.${campo}_pct`  as `${ModalidadPrefijo}.transporte_pct`
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

function SeccionModalidadForm({
  titulo,
  prefijo,
  form,
  conSeparador = false,
}: {
  titulo: string
  prefijo: ModalidadPrefijo
  form: ReturnType<typeof useForm<FormUniverso>>
  conSeparador?: boolean
}) {
  return (
    <div className={conSeparador ? 'pt-5 border-t border-stone-100 space-y-4' : 'space-y-4'}>
      <p className="text-xs font-semibold text-stone-700 uppercase tracking-wider">{titulo}</p>
      <FilaTipoConPct label="Transporte" campo="transporte" prefijo={prefijo} form={form} />
      <FilaTipoConPct label="Instalación" campo="instalacion" prefijo={prefijo} form={form} />
      <div className="grid grid-cols-2 gap-4">
        {([
          [`${prefijo}.imprevistos_pct` as const, 'Imprevistos %'],
          [`${prefijo}.utilidad_pct`    as const, 'Utilidad % (margin)'],
        ] as const).map(([campo, etiqueta]) => (
          <div key={campo}>
            <label className="block text-xs text-stone-500 mb-1">{etiqueta}</label>
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              {...form.register(campo)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function SeccionModalidadVista({
  titulo,
  universo,
  modalidad,
  conSeparador = false,
}: {
  titulo: string
  universo: Sede['universo']
  modalidad: ModalidadPrefijo
  conSeparador?: boolean
}) {
  const u = getUniversoParaModalidad(universo, modalidad)
  return (
    <div className={conSeparador ? 'pt-4 border-t border-stone-100' : ''}>
      <p className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-3">{titulo}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-8 text-sm">
        <Dato
          label="Transporte"
          valor={(u.transporte_tipo ?? 'porcentual') === 'fijo' ? 'Valor fijo' : `${u.transporte_pct}%`}
        />
        <Dato
          label="Instalación"
          valor={(u.instalacion_tipo ?? 'porcentual') === 'fijo' ? 'Valor fijo' : `${u.instalacion_pct}%`}
        />
        <Dato label="Imprevistos" valor={`${u.imprevistos_pct}%`} />
        <Dato label="Utilidad"    valor={`${u.utilidad_pct}% (margin)`} />
      </div>
    </div>
  )
}
