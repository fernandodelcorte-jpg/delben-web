'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, FolderOpen, ArrowUpRight, ArrowRight } from '@phosphor-icons/react'
import { useAuth } from '@/components/providers/auth-provider'
import { getProyectos } from '@/lib/firestore/proyectos'
import { getCotizaciones } from '@/lib/firestore/cotizaciones'
import { formatCOP } from '@/lib/datos-demo'
import type { Proyecto, Cotizacion } from '@/lib/firebase/tipos-firestore'

const ROLES_ADMIN = ['super_admin', 'delben_facturacion']

function fmtFecha(ts: number) {
  return new Date(ts).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export default function PortalHomePage() {
  const { usuario, rol, distribuidorId, cargando: cargandoAuth } = useAuth()
  const router = useRouter()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [cargando, setCargando] = useState(true)

  // Roles Delben van directo al panel de administración
  useEffect(() => {
    if (cargandoAuth) return
    if (rol && ROLES_ADMIN.includes(rol)) {
      router.replace('/admin')
    }
  }, [rol, cargandoAuth, router])

  // Cargar datos del distribuidor
  useEffect(() => {
    if (cargandoAuth) return
    if (!distribuidorId) { setCargando(false); return }

    Promise.all([
      getProyectos(distribuidorId),
      getCotizaciones(distribuidorId),
    ])
      .then(([ps, cs]) => { setProyectos(ps); setCotizaciones(cs) })
      .finally(() => setCargando(false))
  }, [distribuidorId, cargandoAuth])

  // No renderizar mientras redirige
  if (!cargandoAuth && rol && ROLES_ADMIN.includes(rol)) return null

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = usuario?.email?.split('@')[0] ?? ''

  // Cotizaciones por proyecto
  const cotPorProyecto = new Map<string, Cotizacion[]>()
  for (const c of cotizaciones) {
    if (c.proyecto_id) {
      const arr = cotPorProyecto.get(c.proyecto_id) ?? []
      arr.push(c)
      cotPorProyecto.set(c.proyecto_id, arr)
    }
  }

  const proyectosActivos = proyectos.filter((p) => p.estado === 'en_proceso')
  const volumenTotal = cotizaciones.reduce((s, c) => s + c.totales.total, 0)
  const recientes = proyectos.slice(0, 4)

  return (
    <div className="max-w-2xl space-y-8">

      {/* Saludo */}
      <div className="animate-aparecer">
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
          {saludo}{nombre ? `, ${nombre}` : ''}
        </h1>
        <p className="mt-1 text-sm text-stone-400">
          {new Date().toLocaleDateString('es-CO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      {/* Stats */}
      <div
        className="grid grid-cols-3 gap-3 animate-aparecer"
        style={{ animationDelay: '60ms' }}
      >
        {[
          {
            label: 'Proyectos activos',
            value: cargando ? '—' : String(proyectosActivos.length),
          },
          {
            label: 'Proyectos en total',
            value: cargando ? '—' : String(proyectos.length),
          },
          {
            label: 'Volumen cotizado',
            value: cargando ? '—' : formatCOP(volumenTotal),
            small: true,
          },
        ].map(({ label, value, small }) => (
          <div key={label} className="rounded-xl border border-stone-200 bg-white px-4 py-4">
            <p className={[
              'font-semibold tabular-nums leading-none text-stone-900',
              small ? 'text-base' : 'text-2xl',
            ].join(' ')}>
              {value}
            </p>
            <p className="mt-1.5 text-xs text-stone-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Proyectos recientes */}
      <div className="animate-aparecer" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Proyectos recientes
          </p>
          <Link
            href="/cotizaciones"
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors"
          >
            Ver todos
            <ArrowUpRight size={12} weight="bold" />
          </Link>
        </div>

        {cargando ? (
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100 animate-pulse overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5 gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-4 w-44 rounded-md bg-stone-100" />
                  <div className="h-3 w-32 rounded-md bg-stone-100" />
                </div>
                <div className="h-3 w-14 rounded-md bg-stone-100 shrink-0" />
              </div>
            ))}
          </div>
        ) : recientes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 bg-white py-16 text-center">
            <FolderOpen size={28} className="mx-auto mb-3 text-stone-300" />
            <p className="text-sm text-stone-400">Aún no tienes proyectos</p>
            <p className="mt-0.5 text-xs text-stone-300">
              Crea el primero con el botón de abajo
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden divide-y divide-stone-100">
            {recientes.map((p) => {
              const nCots = cotPorProyecto.get(p.id)?.length ?? 0
              return (
                <Link
                  key={p.id}
                  href="/cotizaciones"
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-stone-50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-800 truncate">
                      {p.proyectoNombre}
                    </p>
                    <p className="text-xs text-stone-400 truncate mt-0.5">
                      {p.clienteNombre}
                      {p.clienteCiudad ? ` · ${p.clienteCiudad}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right flex items-center gap-3">
                    <div>
                      <p className="text-xs text-stone-500 tabular-nums">
                        {nCots} versión{nCots !== 1 ? 'es' : ''}
                      </p>
                      <p className="text-xs text-stone-400">
                        {fmtFecha(p.updatedAt)}
                      </p>
                    </div>
                    <ArrowUpRight
                      size={13}
                      className="text-stone-200 group-hover:text-stone-400 transition-colors"
                    />
                  </div>
                </Link>
              )
            })}
            {proyectos.length > 4 && (
              <Link
                href="/cotizaciones"
                className="block px-5 py-3 text-xs text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors"
              >
                +{proyectos.length - 4} proyecto{proyectos.length - 4 !== 1 ? 's' : ''} más
              </Link>
            )}
          </div>
        )}
      </div>

      {/* CTA principal */}
      <div className="animate-aparecer" style={{ animationDelay: '180ms' }}>
        <Link
          href="/cotizaciones/nueva"
          className="tactil group flex items-center justify-between rounded-xl bg-stone-900 px-6 py-4 text-white hover:bg-stone-800 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0">
              <Plus size={16} weight="bold" />
            </div>
            <p className="text-sm font-semibold">Nuevo proyecto</p>
          </div>
          <ArrowRight
            size={17}
            className="text-stone-400 shrink-0 group-hover:translate-x-0.5 transition-transform"
          />
        </Link>
      </div>

    </div>
  )
}
