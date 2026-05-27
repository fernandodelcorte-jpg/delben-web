'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { cerrarSesion } from '@/lib/firebase/client'
import { LogoDelbenAdmin } from '@/components/logo-delben'
import {
  Buildings,
  FileText,
  Receipt,
  Users,
  Package,
  Tag,
  Swatches,
  Megaphone,
  Gear,
  UploadSimple,
  SignOut,
} from '@phosphor-icons/react'

const ROLES_ADMIN = ['super_admin', 'delben_facturacion']

const NAV_PRINCIPAL = [
  { href: '/admin/distribuidores', label: 'Distribuidores', icon: Buildings },
  { href: '/admin/cotizaciones', label: 'Cotizaciones', icon: FileText },
  { href: '/admin/valoraciones', label: 'Valoraciones', icon: Receipt },
  { href: '/admin/equipo', label: 'Equipo', icon: Users },
]

const NAV_HERRAMIENTAS = [
  { href: '/admin/catalogo', label: 'Catálogo', icon: Package },
  { href: '/admin/categorias', label: 'Categorías', icon: Tag },
  { href: '/admin/acabados', label: 'Subcategorías', icon: Swatches },
  { href: '/admin/campanas', label: 'Campañas', icon: Megaphone },
  { href: '/admin/config', label: 'Configuración', icon: Gear },
  { href: '/admin/importar', label: 'Importar', icon: UploadSimple },
]

const NAV_FACTURACION = [
  { href: '/admin/valoraciones', label: 'Valoraciones', icon: Receipt },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { usuario, rol, cargando } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (cargando) return
    if (!usuario || !ROLES_ADMIN.includes(rol ?? '')) {
      router.replace('/')
    }
  }, [usuario, rol, cargando, router])

  async function handleSalir() {
    await cerrarSesion()
    router.replace('/login')
  }

  if (cargando || !usuario || !ROLES_ADMIN.includes(rol ?? '')) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-stone-700" />
      </div>
    )
  }

  const esSuperAdmin = rol === 'super_admin'
  const navPrincipal = esSuperAdmin ? NAV_PRINCIPAL : NAV_FACTURACION
  const navHerramientas = esSuperAdmin ? NAV_HERRAMIENTAS : []

  return (
    <div className="flex min-h-screen bg-stone-50">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 flex flex-col border-r border-stone-200 bg-white">

        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-stone-100 gap-2">
          <LogoDelbenAdmin />
          <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-500">
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">

          <NavSection
            items={navPrincipal}
            pathname={pathname}
          />

          {navHerramientas.length > 0 && (
            <NavSection
              label="Herramientas"
              items={navHerramientas}
              pathname={pathname}
            />
          )}
        </nav>

        {/* Footer usuario */}
        <div className="border-t border-stone-100 px-3 py-3">
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <div className="h-6 w-6 rounded-full bg-stone-900 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-semibold text-white uppercase leading-none">
                {usuario.email?.charAt(0) ?? '?'}
              </span>
            </div>
            <p className="flex-1 min-w-0 text-xs text-stone-600 truncate">
              {usuario.email?.split('@')[0] ?? ''}
            </p>
            <button
              onClick={handleSalir}
              aria-label="Cerrar sesión"
              className="shrink-0 rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
            >
              <SignOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}

// ─── Sección de nav ───────────────────────────────────────────────────────────

function NavSection({
  label,
  items,
  pathname,
}: {
  label?: string
  items: { href: string; label: string; icon: React.ElementType }[]
  pathname: string
}) {
  return (
    <div className="space-y-0.5">
      {label && (
        <p className="px-2 pb-1 text-xs font-semibold text-stone-400 uppercase tracking-wider">
          {label}
        </p>
      )}
      {items.map(({ href, label: itemLabel, icon: Icon }) => {
        const activo = pathname === href || (pathname.startsWith(href + '/') && href !== '/admin')
        return (
          <Link
            key={href}
            href={href}
            className={[
              'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
              activo
                ? 'bg-stone-100 text-stone-900 font-medium'
                : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800',
            ].join(' ')}
          >
            <Icon size={15} weight={activo ? 'fill' : 'regular'} className="shrink-0" />
            {itemLabel}
          </Link>
        )
      })}
    </div>
  )
}
