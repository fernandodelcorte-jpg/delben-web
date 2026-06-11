'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { getDistribuidores } from '@/lib/firestore/distribuidores'
import { getCotizacionesTodas } from '@/lib/firestore/cotizaciones'
import { getValoraciones, totalCostoDelbenDeValoracion } from '@/lib/firestore/valoraciones'
import { formatCOP } from '@/lib/datos-demo'
import type { Cotizacion, Valoracion, Distribuidor } from '@/lib/firebase/tipos-firestore'
import { ArrowUpRight } from '@phosphor-icons/react'

function formatFecha(ts: number) {
  return new Date(ts).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  })
}

type Stats = {
  distribuidoresActivos: number
  cotizacionesTotal: number
  valoracionesBorrador: number
  volumenTotal: number
}

export default function AdminDashboardPage() {
  const { usuario, rol, cargando: cargandoAuth } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [cotizacionesRecientes, setCotizacionesRecientes] = useState<Cotizacion[]>([])
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([])
  const [valoracionesRecientes, setValoracionesRecientes] = useState<Valoracion[]>([])
  const [cargando, setCargando] = useState(true)

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  // Este dashboard global es SOLO para super_admin. delben_facturacion no debe ver
  // volumen cotizado ni cotizaciones de distribuidores (precio de venta — regla #2),
  // y con las reglas actuales getCotizacionesTodas() le daría permission-denied
  // (que haría rechazar el Promise.all en silencio). Por eso: para facturación NO
  // se hace ninguna llamada y se redirige a su home real (valoraciones).
  useEffect(() => {
    if (cargandoAuth) return
    if (rol !== 'super_admin') {
      if (rol === 'delben_facturacion') router.replace('/admin/valoraciones')
      return
    }
    Promise.all([
      getDistribuidores(),
      getCotizacionesTodas(),
      getValoraciones(),
    ]).then(([dists, cots, vals]) => {
      setDistribuidores(dists)
      setCotizacionesRecientes(cots.slice(0, 5))
      setValoracionesRecientes(vals.filter((v) => v.estado === 'borrador').slice(0, 3))
      setStats({
        distribuidoresActivos: dists.filter((d) => d.activo).length,
        cotizacionesTotal: cots.length,
        valoracionesBorrador: vals.filter((v) => v.estado === 'borrador').length,
        volumenTotal: cots.reduce((s, c) => s + c.totales.total, 0),
      })
    }).finally(() => setCargando(false))
  }, [cargandoAuth, rol, router])

  const mapaDistribuidor = Object.fromEntries(distribuidores.map((d) => [d.id, d]))

  const nombreUsuario = usuario?.email?.split('@')[0] ?? ''

  // Mientras carga el rol, o si NO es super_admin (facturación se está redirigiendo
  // a /admin/valoraciones), no renderizamos el dashboard global ni su data.
  if (cargandoAuth || rol !== 'super_admin') {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-stone-700" />
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* Saludo */}
      <div className="animate-aparecer">
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
          {saludo}{nombreUsuario ? `, ${nombreUsuario}` : ''}
        </h1>
        <p className="mt-1 text-sm text-stone-400">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stat cards */}
      <div
        className="rounded-xl border border-stone-200 bg-white overflow-hidden animate-aparecer"
        style={{ animationDelay: '60ms' }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 sm:divide-x sm:divide-stone-100 [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-stone-100 sm:[&>*:nth-child(-n+2)]:border-b-0">
          <StatCard
            label="Distribuidores activos"
            value={cargando ? '—' : String(stats?.distribuidoresActivos ?? 0)}
            href="/admin/distribuidores"
          />
          <StatCard
            label="Cotizaciones"
            value={cargando ? '—' : String(stats?.cotizacionesTotal ?? 0)}
            href="/admin/cotizaciones"
          />
          <StatCard
            label="Valoraciones pendientes"
            value={cargando ? '—' : String(stats?.valoracionesBorrador ?? 0)}
            href="/admin/valoraciones"
            highlight={!!stats && stats.valoracionesBorrador > 0}
          />
          <StatCard
            label="Volumen cotizado"
            value={cargando ? '—' : formatCOP(stats?.volumenTotal ?? 0)}
            href="/admin/cotizaciones"
            small
          />
        </div>
      </div>

      {/* Dos columnas: cotizaciones recientes + acciones rápidas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 animate-aparecer" style={{ animationDelay: '120ms' }}>

        {/* Cotizaciones recientes */}
        <div className="lg:col-span-2 rounded-xl border border-stone-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-800">Cotizaciones recientes</h2>
            <Link
              href="/admin/cotizaciones"
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors"
            >
              Ver todas
              <ArrowUpRight size={12} weight="bold" />
            </Link>
          </div>
          {cargando ? (
            <div className="py-12 flex items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-stone-500" />
            </div>
          ) : cotizacionesRecientes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-stone-400">Sin cotizaciones aún.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {cotizacionesRecientes.map((c) => {
                const dist = mapaDistribuidor[c.distribuidor_id]
                return (
                  <Link
                    key={c.id}
                    href={`/admin/cotizaciones/${c.distribuidor_id}/${c.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-stone-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{c.proyectoNombre}</p>
                      <p className="text-xs text-stone-400 truncate mt-0.5">
                        {dist?.nombre ?? c.distribuidor_id} · {c.clienteNombre}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-stone-900 tabular-nums">
                        {formatCOP(c.totales.total)}
                      </p>
                      <p className="text-xs text-stone-400">{formatFecha(c.createdAt)}</p>
                    </div>
                    <ArrowUpRight
                      size={13}
                      className="shrink-0 text-stone-200 group-hover:text-stone-400 transition-colors"
                    />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">

          {/* Valoraciones pendientes */}
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="text-sm font-semibold text-stone-800">Valoraciones sin facturar</h2>
              <Link
                href="/admin/valoraciones"
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors"
              >
                Ver todas
                <ArrowUpRight size={12} weight="bold" />
              </Link>
            </div>
            {cargando ? (
              <div className="py-8 flex items-center justify-center">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-200 border-t-stone-500" />
              </div>
            ) : valoracionesRecientes.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-stone-400">Todo facturado.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {valoracionesRecientes.map((v) => (
                  <Link
                    key={v.id}
                    href={`/admin/valoraciones/${v.id}`}
                    className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-stone-50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-stone-800 truncate">{v.proyectoNombre}</p>
                      <p className="text-xs text-stone-400 truncate mt-0.5">{v.distribuidor_nombre}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold text-stone-900 tabular-nums">
                        {formatCOP(totalCostoDelbenDeValoracion(v))}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <div className="px-5 py-3 border-t border-stone-100">
              <Link
                href="/admin/valoraciones/nueva"
                className="text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
              >
                + Nueva valoración
              </Link>
            </div>
          </div>

          {/* Accesos rápidos */}
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="text-sm font-semibold text-stone-800">Accesos rápidos</h2>
            </div>
            <div className="divide-y divide-stone-100">
              {[
                { href: '/admin/distribuidores/nuevo', label: 'Nuevo distribuidor' },
                { href: '/admin/campanas', label: 'Gestionar campañas' },
                { href: '/admin/importar', label: 'Importar catálogo' },
                { href: '/admin/config', label: 'Configuración global' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 transition-colors group"
                >
                  <span className="text-sm text-stone-600 group-hover:text-stone-900 transition-colors">
                    {label}
                  </span>
                  <ArrowUpRight size={13} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  href,
  highlight = false,
  small = false,
}: {
  label: string
  value: string
  href: string
  highlight?: boolean
  small?: boolean
}) {
  return (
    <Link href={href} className="block px-5 py-4 hover:bg-stone-50 transition-colors">
      <p className={[
        'font-semibold tabular-nums leading-none',
        small ? 'text-lg' : 'text-2xl',
        highlight ? 'text-amber-600' : 'text-stone-900',
      ].join(' ')}>
        {value}
      </p>
      <p className={['mt-1.5 text-xs', highlight ? 'text-amber-500' : 'text-stone-400'].join(' ')}>
        {label}
      </p>
    </Link>
  )
}
