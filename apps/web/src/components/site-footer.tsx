import Link from 'next/link'
import { PORTAL_URL } from '@/lib/config'

const PAGINAS = [
  ['Nosotros', '/nosotros'],
  ['Manufactura', '/manufactura'],
  ['Productos', '/productos'],
  ['Proyectos', '/proyectos'],
  ['Distribuidores', '/distribuidores'],
  ['Contacto', '/contacto'],
] as const

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-stone-100">
      <div className="mx-auto max-w-editorial px-6 py-14 lg:px-10">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Marca */}
          <div>
            <p className="font-sans text-sm font-semibold uppercase tracking-marca text-stone-900">
              Delben
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-stone-500">
              Carpintería arquitectónica con manufactura propia. Tres generaciones de oficio.
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-stone-400">
              Colombia · Venezuela · EE. UU.
            </p>
          </div>

          {/* Navegación */}
          <nav className="grid grid-cols-2 gap-x-6 gap-y-3 self-start">
            {PAGINAS.map(([rotulo, href]) => (
              <Link
                key={href}
                href={href}
                className="text-xs uppercase tracking-[0.14em] text-stone-500 transition-colors hover:text-stone-900"
              >
                {rotulo}
              </Link>
            ))}
          </nav>

          {/* Contacto + portal */}
          <div className="md:text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Contacto</p>
            <a
              href="mailto:facturacion@delben.co"
              className="mt-3 block text-sm text-stone-700 transition-colors hover:text-caoba-700"
            >
              facturacion@delben.co
            </a>
            <a
              href="tel:+573204997451"
              className="mt-1 block text-sm text-stone-700 transition-colors hover:text-caoba-700"
            >
              +57 320 499 7451
            </a>
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              Zona Franca de Cúcuta, Norte de Santander, Colombia
            </p>
            <a
              href={PORTAL_URL}
              className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-caoba-600 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.12em] text-stone-50 transition-colors hover:bg-caoba-700 md:ml-auto"
            >
              Portal
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-stone-200 pt-6 text-xs uppercase tracking-[0.14em] text-stone-400 sm:flex-row sm:justify-between">
          <span>© 2026 Delben S.A.S.</span>
          <span>Tres generaciones de oficio</span>
        </div>
      </div>
    </footer>
  )
}
