'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { SignOut } from '@phosphor-icons/react'
import { useAuth } from '@/components/providers/auth-provider'
import { cerrarSesion } from '@/lib/firebase/client'
import { ETIQUETA_ROL } from '@delben/firebase'
import { LogoDelbenNav } from '@/components/logo-delben'

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const activo = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={[
        'tactil flex items-center h-14 px-2.5 text-sm transition-colors border-b-2 -mb-px',
        activo
          ? 'border-caoba-500 text-stone-900 font-medium'
          : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}

export function NavPortal() {
  const { usuario, rol } = useAuth()
  const router = useRouter()

  async function handleSalir() {
    await cerrarSesion()
    router.replace('/login')
  }

  return (
    <nav className="border-b border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="tactil opacity-100 hover:opacity-80 transition-opacity">
          <LogoDelbenNav />
        </Link>

        {/* Navegación + acciones */}
        <div className="flex items-center gap-4">

          {/* Cotizaciones — roles distribuidor */}
          {rol && rol !== 'super_admin' && rol !== 'delben_facturacion' && (
            <NavLink href="/cotizaciones" label="Cotizaciones" />
          )}

          {/* Catálogo de precios — distribuidor y Delben (Delben elige distribuidor) */}
          {rol && <NavLink href="/catalogo" label="Catálogo" />}

          {/* Configuración — solo distribuidor_admin */}
          {rol === 'distribuidor_admin' && (
            <NavLink href="/configuracion" label="Configuración" />
          )}

          {/* Admin — roles Delben */}
          {(rol === 'super_admin' || rol === 'delben_facturacion') && (
            <NavLink href="/admin" label="Admin" />
          )}

          {/* Separador visual */}
          <div className="h-4 w-px bg-stone-200" />

          {/* Badge de rol */}
          {rol && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
              {ETIQUETA_ROL[rol]}
            </span>
          )}

          {/* Avatar + usuario */}
          {usuario && (
            <div className="hidden md:flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-stone-900 flex items-center justify-center shrink-0 ring-2 ring-stone-200">
                <span className="text-[10px] font-semibold text-white uppercase leading-none">
                  {usuario.email?.charAt(0) ?? '?'}
                </span>
              </div>
              <span className="text-sm text-stone-600">
                {usuario.email?.split('@')[0] ?? ''}
              </span>
            </div>
          )}

          {/* Botón salir */}
          <button
            onClick={handleSalir}
            aria-label="Cerrar sesión"
            className="tactil flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-700 transition-colors"
          >
            <SignOut size={15} />
            <span className="hidden sm:inline">Salir</span>
          </button>

        </div>
      </div>
    </nav>
  )
}
