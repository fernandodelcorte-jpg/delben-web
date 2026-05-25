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
        'tactil text-sm transition-colors',
        activo
          ? 'text-stone-900 font-medium'
          : 'text-stone-500 hover:text-stone-800',
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

          {/* Email */}
          <span className="hidden md:block text-sm text-stone-400 tabular-nums">
            {usuario?.email}
          </span>

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
