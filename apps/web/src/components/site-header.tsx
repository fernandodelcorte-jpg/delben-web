'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { PORTAL_URL } from '@/lib/config'

// Las 7 páginas de la web. El botón "Portal" va aparte (no es una página).
const NAV = [
  ['Inicio', '/'],
  ['Nosotros', '/nosotros'],
  ['Manufactura', '/manufactura'],
  ['Productos', '/productos'],
  ['Proyectos', '/proyectos'],
  ['Distribuidores', '/distribuidores'],
  ['Contacto', '/contacto'],
] as const

export function SiteHeader() {
  const pathname = usePathname()
  const [abierto, setAbierto] = useState(false)
  const esActivo = (href: string) => pathname === href

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/70 bg-stone-50/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-editorial items-center justify-between px-6 lg:px-10">
        <Link
          href="/"
          onClick={() => setAbierto(false)}
          className="font-sans text-sm font-semibold uppercase tracking-marca text-stone-900"
        >
          Delben
        </Link>

        {/* Navegación de escritorio */}
        <nav className="hidden items-center gap-6 lg:flex xl:gap-8">
          {NAV.map(([rotulo, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={esActivo(href) ? 'page' : undefined}
              className={[
                'relative py-1 text-xs uppercase tracking-[0.16em] transition-colors',
                esActivo(href)
                  ? 'text-stone-900 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-caoba-500'
                  : 'text-stone-500 hover:text-stone-900',
              ].join(' ')}
            >
              {rotulo}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={PORTAL_URL}
            className="group hidden items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-stone-700 transition-colors hover:border-caoba-500 hover:text-caoba-700 sm:inline-flex"
          >
            Portal
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
          </a>

          {/* Botón de menú móvil */}
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={abierto}
            className="flex h-9 w-9 items-center justify-center text-stone-700 lg:hidden"
          >
            <span className="relative block h-3.5 w-5">
              <span
                className={[
                  'absolute left-0 h-px w-full bg-current transition-all duration-300',
                  abierto ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0',
                ].join(' ')}
              />
              <span
                className={[
                  'absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current transition-opacity duration-200',
                  abierto ? 'opacity-0' : 'opacity-100',
                ].join(' ')}
              />
              <span
                className={[
                  'absolute left-0 h-px w-full bg-current transition-all duration-300',
                  abierto ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-0',
                ].join(' ')}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Panel de navegación móvil */}
      {abierto && (
        <div className="border-t border-stone-200 bg-stone-50 lg:hidden">
          <nav className="mx-auto flex max-w-editorial flex-col px-6 py-2">
            {NAV.map(([rotulo, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setAbierto(false)}
                aria-current={esActivo(href) ? 'page' : undefined}
                className={[
                  'flex items-center gap-3 border-b border-stone-200/70 py-3.5 text-sm uppercase tracking-[0.14em] transition-colors',
                  esActivo(href) ? 'text-caoba-700' : 'text-stone-600 hover:text-stone-900',
                ].join(' ')}
              >
                {esActivo(href) && <span className="h-px w-4 bg-caoba-500" />}
                {rotulo}
              </Link>
            ))}
            <a
              href={PORTAL_URL}
              onClick={() => setAbierto(false)}
              className="mt-5 mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-caoba-600 px-6 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-caoba-700"
            >
              Portal de distribuidores
              <span aria-hidden>→</span>
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
