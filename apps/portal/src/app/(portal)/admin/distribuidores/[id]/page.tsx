'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CircleNotch, Check, Plus, MapPin, CaretDown, CaretUp } from '@phosphor-icons/react'
import { useAuth } from '@/components/providers/auth-provider'
import {
  getDistribuidor,
  getUsuariosDistribuidor,
  actualizarDistribuidor,
  crearUsuarioFirestore,
} from '@/lib/firestore/distribuidores'
import {
  getSedes,
  crearSede,
  actualizarSede,
  guardarHistorialCondiciones,
  getHistorialCondiciones,
} from '@/lib/firestore/sedes'
import { crearUsuarioAuth } from '@/lib/firebase/client'
import type {
  Distribuidor,
  Sede,
  Usuario,
  HistorialCondiciones,
} from '@/lib/firebase/tipos-firestore'
import {
  getUniversoParaModalidad,
  universoCompletoParaModalidad,
  sedeHabilitada,
} from '@/lib/firebase/tipos-firestore'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const pct = z.coerce.number().min(0).max(100)

const schemaSede = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  pais: z.string().min(2, 'Requerido'),
  ciudad: z.string().min(2, 'Requerido'),
  acceso_tradicional: z.boolean(),
  acceso_desarmado: z.boolean(),
  descuento_muebles_pct: pct,
  descuento_herrajes_pct: pct,
  diseno_pct: pct,
  cotizacion_pct: pct,
  produccion_pct: pct,
  logistica_pct: pct,
  gestion_comercial_pct: pct,
})
type FormSede = z.infer<typeof schemaSede>

const SEDE_DEFAULTS: FormSede = {
  nombre: '',
  pais: 'Colombia',
  ciudad: '',
  acceso_tradicional: true,
  acceso_desarmado: true,
  descuento_muebles_pct: 0,
  descuento_herrajes_pct: 0,
  diseno_pct: 0,
  cotizacion_pct: 0,
  produccion_pct: 0,
  logistica_pct: 0,
  gestion_comercial_pct: 0,
}

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

function esColombia(pais: string) {
  return pais.trim().toLowerCase() === 'colombia'
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DetalleDistribuidorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { usuario } = useAuth()

  const [distribuidor, setDistribuidor] = useState<Distribuidor | null>(null)
  const [sedes, setSedes] = useState<Sede[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)

  // Sede: una tarjeta-acordeón por sede. sedeEditando = la tarjeta abierta (editar);
  // creandoSede = el formulario separado de "Nueva sede". Mutuamente excluyentes.
  const [creandoSede, setCreandoSede] = useState(false)
  const [sedeEditando, setSedeEditando] = useState<Sede | null>(null)
  const [historialSede, setHistorialSede] = useState<HistorialCondiciones[]>([])
  const [guardandoSede, setGuardandoSede] = useState(false)
  const [errorSede, setErrorSede] = useState<string | null>(null)
  const [guardadoOk, setGuardadoOk] = useState(false)

  // Usuarios
  const [mostrarFormUsuario, setMostrarFormUsuario] = useState(false)
  const [creandoUsuario, setCreandoUsuario] = useState(false)
  const [errorUsuario, setErrorUsuario] = useState<string | null>(null)

  const formSede = useForm<FormSede>({
    resolver: zodResolver(schemaSede),
    defaultValues: SEDE_DEFAULTS,
  })

  const formUsuario = useForm<FormUsuario>({
    resolver: zodResolver(schemaUsuario),
    defaultValues: { rol: 'distribuidor_comercial' },
  })

  useEffect(() => {
    Promise.all([
      getDistribuidor(id),
      getSedes(id).catch(() => [] as Sede[]),
      getUsuariosDistribuidor(id).catch(() => [] as Usuario[]),
    ])
      .then(([dist, seds, usrs]) => {
        setDistribuidor(dist)
        setSedes(seds)
        setUsuarios(usrs)
        // Una sola sede → se abre expandida (no tiene sentido colapsar lo único que hay).
        if (seds.length === 1) abrirEditarSede(seds[0]!)
      })
      .finally(() => setCargando(false))
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

  function abrirNuevaSede() {
    setSedeEditando(null)
    setHistorialSede([])
    setErrorSede(null)
    setGuardadoOk(false)
    formSede.reset(SEDE_DEFAULTS)
    setCreandoSede(true)
  }

  function toggleSedeCard(sede: Sede) {
    if (sedeEditando?.id === sede.id) {
      setSedeEditando(null)
      setHistorialSede([])
    } else {
      abrirEditarSede(sede)
    }
  }

  async function abrirEditarSede(sede: Sede) {
    setCreandoSede(false)
    setSedeEditando(sede)
    setErrorSede(null)
    setGuardadoOk(false)
    formSede.reset({
      nombre: sede.nombre,
      pais: sede.pais,
      ciudad: sede.ciudad,
      acceso_tradicional: sede.acceso_tradicional,
      acceso_desarmado: sede.acceso_desarmado,
      descuento_muebles_pct: sede.descuento_muebles_pct,
      descuento_herrajes_pct: sede.descuento_herrajes_pct,
      diseno_pct: sede.servicios.diseno_pct,
      cotizacion_pct: sede.servicios.cotizacion_pct,
      produccion_pct: sede.servicios.produccion_pct,
      logistica_pct: sede.servicios.logistica_pct,
      gestion_comercial_pct: sede.servicios.gestion_comercial_pct,
    })
    const hist = await getHistorialCondiciones(id, sede.id).catch(
      () => [] as HistorialCondiciones[],
    )
    setHistorialSede(hist)
  }

  function cerrarFormSede() {
    setCreandoSede(false)
    setSedeEditando(null)
    setHistorialSede([])
    setErrorSede(null)
  }

  async function onGuardarSede(data: FormSede) {
    setGuardandoSede(true)
    setErrorSede(null)
    setGuardadoOk(false)
    try {
      const servicios = {
        diseno_pct: data.diseno_pct,
        cotizacion_pct: data.cotizacion_pct,
        produccion_pct: data.produccion_pct,
        logistica_pct: data.logistica_pct,
        gestion_comercial_pct: data.gestion_comercial_pct,
      }
      const capaDelben = {
        descuento_muebles_pct: data.descuento_muebles_pct,
        descuento_herrajes_pct: data.descuento_herrajes_pct,
        servicios,
      }

      if (sedeEditando) {
        // Editar: NO se toca el universo (lo configura el distribuidor_admin).
        await Promise.all([
          actualizarSede(id, sedeEditando.id, {
            nombre: data.nombre,
            pais: data.pais,
            ciudad: data.ciudad,
            acceso_tradicional: data.acceso_tradicional,
            acceso_desarmado: data.acceso_desarmado,
            ...capaDelben,
          }),
          guardarHistorialCondiciones(id, sedeEditando.id, capaDelben, usuario?.uid ?? ''),
        ])
      } else {
        // Crear: universo inicial vacío (modalidades sin configurar) con IVA
        // derivado del país. El distribuidor_admin lo completa en su panel.
        const sedeId = await crearSede(id, {
          nombre: data.nombre,
          pais: data.pais,
          ciudad: data.ciudad,
          acceso_tradicional: data.acceso_tradicional,
          acceso_desarmado: data.acceso_desarmado,
          ...capaDelben,
          universo: { iva_pct: esColombia(data.pais) ? 19 : 0 },
          activo: true,
        })
        await guardarHistorialCondiciones(id, sedeId, capaDelben, usuario?.uid ?? '')
      }

      const nuevasSedes = await getSedes(id)
      setSedes(nuevasSedes)
      setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 3000)
      if (!sedeEditando) setCreandoSede(false)
      else {
        const actualizada = nuevasSedes.find((s) => s.id === sedeEditando.id) ?? null
        setSedeEditando(actualizada)
        const hist = await getHistorialCondiciones(id, sedeEditando.id).catch(
          () => [] as HistorialCondiciones[],
        )
        setHistorialSede(hist)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('Error al guardar la sede:', e)
      setErrorSede(`No se pudo guardar la sede: ${msg}`)
    } finally {
      setGuardandoSede(false)
    }
  }

  async function toggleSedeActiva(sede: Sede) {
    await actualizarSede(id, sede.id, { activo: !sede.activo })
    setSedes((prev) =>
      prev.map((s) => (s.id === sede.id ? { ...s, activo: !s.activo } : s)),
    )
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
            {sedes.length === 0
              ? 'Sin sedes'
              : `${sedes.length} ${sedes.length === 1 ? 'sede' : 'sedes'}`}
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

      {/* Sedes */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
              Sedes
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Cada sede tiene su país y su capa Delben (descuentos y servicios).
            </p>
          </div>
          {!creandoSede && (
            <button
              onClick={abrirNuevaSede}
              className="tactil flex items-center gap-1 text-xs font-semibold text-caoba-600 hover:text-caoba-700 underline underline-offset-2"
            >
              <Plus size={13} weight="bold" /> Nueva sede
            </button>
          )}
        </div>

        {sedes.length === 0 && !creandoSede && (
          <p className="text-sm text-stone-400 text-center py-4">
            No hay sedes. Crea la primera.
          </p>
        )}

        {/* Tarjetas-acordeón: una por sede */}
        {sedes.length > 0 && (
          <div className="space-y-3">
            {sedes.map((sede) => {
              const abierta = sedeEditando?.id === sede.id
              return (
                <div key={sede.id} className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                  {/* Cabecera colapsada */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSedeCard(sede)}
                      aria-expanded={abierta}
                      className="tactil flex items-center gap-2.5 text-left flex-1 min-w-0"
                    >
                      <MapPin size={16} className="text-stone-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-900 truncate">{sede.nombre}</p>
                        <p className="text-xs text-stone-400 truncate">
                          {sede.ciudad}, {sede.pais} ·{' '}
                          {[
                            sede.acceso_tradicional && 'Tradicional',
                            sede.acceso_desarmado && 'Desarmado',
                          ].filter(Boolean).join(' · ') || 'Sin modalidades'}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <BadgeEstadoSede sede={sede} />
                      <button
                        type="button"
                        onClick={() => toggleSedeActiva(sede)}
                        className={[
                          'rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                          sede.activo
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-stone-100 text-stone-400 hover:bg-stone-200',
                        ].join(' ')}
                      >
                        {sede.activo ? 'Activa' : 'Inactiva'}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSedeCard(sede)}
                        aria-label={abierta ? 'Colapsar' : 'Expandir'}
                        className="tactil text-stone-400 hover:text-stone-600"
                      >
                        {abierta ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />}
                      </button>
                    </div>
                  </div>

                  {/* Contenido expandido: edición capa Delben + universo RO + historial */}
                  {abierta && (
                    <div className="border-t border-stone-100 px-4 py-4 animate-desplegarse origin-top">
                      <form onSubmit={formSede.handleSubmit(onGuardarSede)} className="space-y-5">
                        {guardadoOk && (
                          <div className="flex justify-end">
                            <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                              <Check size={13} weight="bold" /> Guardado
                            </span>
                          </div>
                        )}

                        <CamposSedeForm form={formSede} />

                        {errorSede && <p className="text-xs text-red-600">{errorSede}</p>}

                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="submit"
                            disabled={guardandoSede}
                            className="tactil flex items-center gap-1.5 rounded-lg bg-caoba-600 px-4 py-2 text-sm font-semibold text-white hover:bg-caoba-700 disabled:opacity-50 transition-colors"
                          >
                            {guardandoSede ? <CircleNotch size={14} className="animate-spin" /> : <Check size={14} weight="bold" />}
                            {guardandoSede ? 'Guardando…' : 'Guardar cambios'}
                          </button>
                          <button type="button" onClick={cerrarFormSede} className="text-sm text-stone-500 hover:text-stone-700">
                            Cerrar
                          </button>
                        </div>

                        {/* Universo (solo lectura; lo configura el distribuidor_admin) */}
                        <div className="pt-5 border-t border-stone-100">
                          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                            Universo del distribuidor
                          </p>
                          <p className="text-xs text-stone-400 mb-3">
                            Lo configura el administrador del distribuidor en su panel.
                          </p>
                          <div className="space-y-4">
                            {(['desarmado', 'tradicional'] as const)
                              .filter((m) => (m === 'desarmado' ? sede.acceso_desarmado : sede.acceso_tradicional))
                              .map((m, idx) => {
                                const u = getUniversoParaModalidad(sede.universo, m)
                                return (
                                  <div key={m} className={idx > 0 ? 'pt-3 border-t border-stone-100' : ''}>
                                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                                      {m === 'desarmado' ? 'Desarmado' : 'Tradicional'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm sm:grid-cols-4">
                                      <Dato label="Transporte" valor={(u.transporte_tipo ?? 'porcentual') === 'fijo' ? 'Fijo' : `${u.transporte_pct}%`} />
                                      <Dato label="Instalación" valor={(u.instalacion_tipo ?? 'porcentual') === 'fijo' ? 'Fijo' : `${u.instalacion_pct}%`} />
                                      <Dato label="Imprevistos" valor={`${u.imprevistos_pct}%`} />
                                      <Dato label="Utilidad" valor={`${u.utilidad_pct}% (m)`} />
                                    </div>
                                  </div>
                                )
                              })}
                            <div className="pt-3 border-t border-stone-100">
                              <Dato label="IVA" valor={`${sede.universo.iva_pct}%`} />
                            </div>
                          </div>
                        </div>

                        {/* Historial de condiciones de la sede */}
                        {historialSede.length > 0 && (
                          <div className="pt-5 border-t border-stone-100">
                            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                              Historial de condiciones
                            </p>
                            <div className="divide-y divide-stone-100">
                              {historialSede.slice(0, 10).map((h) => (
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
                                  <Dato label="Gest. comercial" valor={`${h.servicios.gestion_comercial_pct}% (m)`} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </form>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Formulario de NUEVA sede (separado del acordeón) */}
        {creandoSede && (
          <form
            onSubmit={formSede.handleSubmit(onGuardarSede)}
            className="mt-5 pt-5 border-t border-stone-100 space-y-5 animate-desplegarse origin-top"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-700">Nueva sede</h3>
              {guardadoOk && (
                <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                  <Check size={13} weight="bold" /> Guardado
                </span>
              )}
            </div>

            <CamposSedeForm form={formSede} />

            {errorSede && <p className="text-xs text-red-600">{errorSede}</p>}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={guardandoSede}
                className="tactil flex items-center gap-1.5 rounded-lg bg-caoba-600 px-4 py-2 text-sm font-semibold text-white hover:bg-caoba-700 disabled:opacity-50 transition-colors"
              >
                {guardandoSede ? <CircleNotch size={14} className="animate-spin" /> : <Check size={14} weight="bold" />}
                {guardandoSede ? 'Guardando…' : 'Crear sede'}
              </button>
              <button type="button" onClick={cerrarFormSede} className="text-sm text-stone-500 hover:text-stone-700">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>

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

function modalidadesPendientes(sede: Sede): string[] {
  const faltan: string[] = []
  if (sede.acceso_desarmado && !universoCompletoParaModalidad(sede, 'desarmado')) faltan.push('Desarmado')
  if (sede.acceso_tradicional && !universoCompletoParaModalidad(sede, 'tradicional')) faltan.push('Tradicional')
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
  const detalle = faltan.length > 0 ? `el universo de ${faltan.join(' y ')}` : 'el universo'
  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      Falta configurar {detalle}
    </span>
  )
}

// Campos editables de la sede (identidad + modalidades + capa Delben), compartidos
// por el formulario de edición (dentro del acordeón) y el de nueva sede.
function CamposSedeForm({ form }: { form: ReturnType<typeof useForm<FormSede>> }) {
  return (
    <>
      {/* Identidad */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <CampoTexto label="Nombre de la sede" campo="nombre" form={form} placeholder="Bogotá" />
        <CampoTexto label="País" campo="pais" form={form} placeholder="Colombia" />
        <CampoTexto label="Ciudad" campo="ciudad" form={form} placeholder="Bogotá" />
      </div>

      {/* Modalidades */}
      <div>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
          Modalidades habilitadas
        </p>
        <div className="flex gap-5">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" {...form.register('acceso_tradicional')} className="accent-caoba-600" />
            Tradicional
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" {...form.register('acceso_desarmado')} className="accent-caoba-600" />
            Desarmado
          </label>
        </div>
      </div>

      {/* Capa Delben */}
      <div>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
          Descuentos Delben
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <CampoNumero label="Desc. muebles (%)" campo="descuento_muebles_pct" form={form} />
          <CampoNumero label="Desc. herrajes (%)" campo="descuento_herrajes_pct" form={form} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
          Servicios Delben
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <CampoNumero label="Diseño (%)" campo="diseno_pct" form={form} />
          <CampoNumero label="Cotización (%)" campo="cotizacion_pct" form={form} />
          <CampoNumero label="Producción (%)" campo="produccion_pct" form={form} />
          <CampoNumero label="Logística (%)" campo="logistica_pct" form={form} />
          <CampoNumero label="Gestión comercial (% margin)" campo="gestion_comercial_pct" form={form} />
        </div>
      </div>
    </>
  )
}

function CampoTexto({
  label,
  campo,
  form,
  placeholder,
}: {
  label: string
  campo: 'nombre' | 'pais' | 'ciudad'
  form: ReturnType<typeof useForm<FormSede>>
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <input
        {...form.register(campo)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
      />
      {form.formState.errors[campo] && (
        <p className="mt-1 text-xs text-red-600">{form.formState.errors[campo]?.message}</p>
      )}
    </div>
  )
}

function CampoNumero({
  label,
  campo,
  form,
}: {
  label: string
  campo: keyof FormSede
  form: ReturnType<typeof useForm<FormSede>>
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
        <p className="mt-1 text-xs text-red-600">{form.formState.errors[campo]?.message}</p>
      )}
    </div>
  )
}
