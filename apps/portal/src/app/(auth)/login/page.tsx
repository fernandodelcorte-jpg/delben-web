import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Ingresar — Delben',
}

export default function LoginPage() {
  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[42%_1fr]">

      {/* ── Panel izquierdo: identidad de marca ─────────────────── */}
      <aside className="hidden lg:flex flex-col justify-between p-14 bg-stone-950 text-stone-50 relative overflow-hidden select-none">

        {/* Cuadrícula decorativa sutil */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,transparent,transparent 48px,oklch(0.8 0 0) 48px,oklch(0.8 0 0) 49px),repeating-linear-gradient(90deg,transparent,transparent 48px,oklch(0.8 0 0) 48px,oklch(0.8 0 0) 49px)',
          }}
        />

        {/* Acento caoba en la esquina superior derecha */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 right-0 w-px h-full"
          style={{ background: 'oklch(0.54 0.15 45 / 0.4)' }}
        />

        {/* Wordmark */}
        <div className="relative z-10">
          <span className="text-xl font-semibold tracking-tight text-stone-100">
            Delben
          </span>
        </div>

        {/* Contenido central */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-1">
            <p
              className="text-xs tracking-[0.2em] uppercase text-stone-500 font-medium"
              style={{ letterSpacing: '0.18em' }}
            >
              Plataforma de cotización
            </p>
          </div>

          <h1 className="text-[3.25rem] font-light leading-[1.08] tracking-tight text-stone-50">
            Fabricación<br />
            con tradición<br />
            <span style={{ color: 'oklch(0.63 0.14 50)' }}>desde 1976.</span>
          </h1>

          <p className="text-stone-500 text-sm leading-relaxed max-w-[36ch]">
            Herramienta exclusiva para distribuidores autorizados.
            Cotiza, genera documentos y gestiona tu operación.
          </p>
        </div>

        {/* Pie */}
        <div className="relative z-10 flex items-center justify-between">
          <p className="text-stone-700 text-xs">
            © {new Date().getFullYear()} Delben. Todos los derechos reservados.
          </p>
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'oklch(0.54 0.15 45)' }}
          />
        </div>
      </aside>

      {/* ── Panel derecho: formulario ─────────────────────────────── */}
      <section className="flex flex-col items-center justify-center bg-stone-50 px-6 py-16 lg:px-20">

        {/* Logo visible solo en móvil */}
        <div className="lg:hidden mb-12 self-start">
          <span className="text-lg font-semibold tracking-tight text-stone-900">
            Delben
          </span>
        </div>

        <div className="w-full max-w-[22rem]">

          {/* Encabezado del formulario */}
          <div
            className="mb-10 animate-aparecer"
            style={{ animationDelay: '0ms' }}
          >
            <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">
              Bienvenido
            </h2>
            <p className="mt-1 text-stone-500 text-sm">
              Ingresa a tu cuenta de distribuidor
            </p>
          </div>

          <LoginForm />

        </div>
      </section>

    </div>
  )
}
