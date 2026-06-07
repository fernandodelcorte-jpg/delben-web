/**
 * Inicio — web institucional Delben (dirección "showroom arquitectónico cálido").
 *
 * Manda la IMAGEN y la ESTRUCTURA, no la palabra. Rejilla modular visible
 * (bloques con límites claros, hairlines, ticks de encuadre) que evoca la precisión
 * de fábrica sin frialdad: stone cálido + caoba (acento ≤10%) sostienen el oficio
 * familiar. La fotografía es protagonista; la Fraunces solo acompaña.
 * El header y el footer viven en el layout compartido (apps/web/src/app/layout.tsx).
 */
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { Reveal } from '@/components/reveal'
import { ImageWell } from '@/components/image-well'
import { PORTAL_URL } from '@/lib/config'

const materiales = ['Madera', 'Laminados', 'Metal', 'Vidrio', 'Pintura']

const sintesis = [
  {
    indice: '01',
    titulo: 'Todo bajo un mismo techo',
    texto:
      'Madera, laminados, metal, vidrio y pintura se transforman en nuestra planta, con personal propio. No tercerizamos.',
    foto: 'foto: planta de producción',
    tono: 'stone' as const,
    href: '/manufactura',
  },
  {
    indice: '02',
    titulo: 'Diseño que no pasa de moda',
    texto:
      'Combinamos una amplia variedad de acabados con estándares de ergonomía y funcionalidad.',
    foto: 'foto: cocina terminada',
    tono: 'oscuro' as const,
    href: '/productos',
  },
  {
    indice: '03',
    titulo: 'Pensado para el distribuidor',
    texto: 'Manuales de diseño, portafolio amplio y cotización en línea.',
    foto: 'foto: detalle de herraje',
    tono: 'stone' as const,
    href: '/distribuidores',
  },
]

const cifras = [
  { valor: '2007', unidad: '', etiqueta: 'Fundación de Delben' },
  { valor: '1976', unidad: '', etiqueta: 'La familia en el oficio' },
  { valor: '1.500', unidad: 'm²', etiqueta: 'Planta' },
  { valor: '70', unidad: '', etiqueta: 'Colaboradores' },
  { valor: '3', unidad: 'países', etiqueta: 'Colombia · Venezuela · EE. UU.' },
]

/** Helper para el animation-delay tipado en la entrada al cargar */
const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` })

export default function Inicio() {
  return (
    <>
      {/* ───────────────── Hero a sangre (imagen protagonista) ───────────────── */}
      <section className="relative">
        <ImageWell
          label="foto: cocina a sangre — showroom"
          tone="oscuro"
          overlay
          mobileMinimal
          className="animate-subir-aparecer h-[86vh] min-h-[34rem] w-full"
        >
          <div className="mx-auto flex h-full max-w-editorial flex-col justify-between px-6 py-8 lg:px-10 lg:py-10">
            <div
              className="animate-subir-aparecer flex items-center justify-between text-[0.7rem] uppercase tracking-[0.2em] text-stone-200/90"
              style={delay(120)}
            >
              <span>Zona Franca de Cúcuta · Colombia</span>
              <span className="hidden sm:inline">Inicio — 01</span>
            </div>

            <div className="max-w-3xl">
              <p
                className="animate-subir-aparecer flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-caoba-300"
                style={delay(220)}
              >
                <span className="h-px w-8 bg-caoba-400" />
                Manufactura exclusiva · desde 2007
              </p>
              <h1
                className="animate-subir-aparecer mt-5 text-3xl font-medium leading-[1.15] tracking-tight text-stone-50 sm:text-4xl sm:leading-[1.1] lg:text-5xl"
                style={delay(320)}
              >
                Carpintería arquitectónica, de principio a fin, elaboramos todo{' '}
                <span className="font-display font-normal italic text-caoba-200">
                  bajo un mismo techo.
                </span>
              </h1>
              <p
                className="animate-subir-aparecer mt-5 max-w-xl text-base leading-relaxed text-stone-200/85"
                style={delay(420)}
              >
                Diseño contemporáneo, manufactura exclusiva para cocinas, closets y mobiliario para
                el hogar. Tres generaciones con oficio al servicio de nuestros aliados comerciales.
              </p>
              <div className="animate-subir-aparecer mt-8 flex flex-wrap items-center gap-4" style={delay(520)}>
                <a
                  href={PORTAL_URL}
                  className="inline-flex items-center gap-2 rounded-full bg-caoba-600 px-7 py-3.5 text-sm font-medium text-stone-50 shadow-sm transition-all duration-200 hover:bg-caoba-700 active:scale-[0.98]"
                >
                  Portal de distribuidores
                  <span aria-hidden>→</span>
                </a>
                <Link
                  href="/nosotros"
                  className="inline-flex items-center gap-2 rounded-full border border-stone-300/60 px-7 py-3.5 text-sm font-medium text-stone-100 transition-colors duration-200 hover:border-stone-100 active:scale-[0.98]"
                >
                  Conozca Delben
                </Link>
              </div>
            </div>
          </div>
        </ImageWell>
      </section>

      {/* ───────────────── Tira de materiales (estructura / ficha) ─────────────────
          Oculta en móvil (<sm): aligera el primer pliegue en pantallas angostas. */}
      <section className="hidden border-b border-stone-200 bg-stone-50 sm:block">
        <div className="mx-auto max-w-editorial px-6 lg:px-10">
          <ul className="flex flex-wrap items-stretch divide-x divide-stone-200 border-x border-stone-200">
            <li className="flex items-center px-5 py-4 text-[0.7rem] uppercase tracking-[0.2em] text-caoba-700">
              Todo se transforma aquí
            </li>
            {materiales.map((m) => (
              <li
                key={m}
                className="flex items-center px-5 py-4 text-[0.7rem] uppercase tracking-[0.2em] text-stone-500"
              >
                {m}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────────── Síntesis: rejilla de 3 módulos (enlazan a páginas) ───────────────── */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 py-16 lg:px-10 lg:py-20">
          <Reveal className="flex items-end justify-between gap-6 border-b border-stone-200 pb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-caoba-700">El oficio</p>
              <h2 className="mt-3 text-xl font-medium tracking-tight text-stone-900 sm:text-2xl">
                Una sola casa, de la materia prima al detalle.
              </h2>
            </div>
            <span className="hidden font-display text-sm text-stone-400 sm:block">03 módulos</span>
          </Reveal>

          <div className="grid grid-cols-1 divide-y divide-stone-200 border-x border-b border-stone-200 md:grid-cols-3 md:divide-x md:divide-y-0">
            {sintesis.map((bloque, i) => (
              <Reveal key={bloque.indice} delay={i * 110}>
                <Link href={bloque.href} className="group flex h-full flex-col p-5 lg:p-6">
                  <ImageWell label={bloque.foto} ratio="4 / 5" tone={bloque.tono} />
                  <div className="mt-5 flex items-baseline gap-3">
                    <span className="font-display text-base text-caoba-600">{bloque.indice}</span>
                    <span className="regla-caoba mt-2 flex-1" />
                  </div>
                  <h3 className="mt-3 text-base font-semibold uppercase tracking-[0.04em] text-stone-900">
                    {bloque.titulo}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{bloque.texto}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-caoba-700">
                    Ver más
                    <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── Banda showcase a sangre (impacto puro de imagen) ───────────────── */}
      <section aria-label="Showroom" className="relative">
        <Reveal>
          <ImageWell
            label="foto: showroom — pieza terminada"
            tone="stone"
            className="h-[58vh] min-h-[22rem] w-full"
          >
            <div className="mx-auto flex h-full max-w-editorial items-end px-6 py-8 lg:px-10 lg:py-10">
              <p className="max-w-sm text-xs uppercase tracking-[0.2em] text-stone-600">
                Acabados cuidados · ensamble de precisión
              </p>
            </div>
          </ImageWell>
        </Reveal>
      </section>

      {/* ───────────────── Cifras: rejilla de datos sobre oscuro ───────────────── */}
      <section className="bg-stone-900 text-stone-100">
        <div className="mx-auto max-w-editorial px-6 py-16 lg:px-10 lg:py-20">
          <Reveal className="border-b border-stone-700 pb-6">
            <p className="text-xs uppercase tracking-[0.22em] text-caoba-300">En números</p>
          </Reveal>
          <dl className="grid grid-cols-2 divide-stone-700 border-stone-700 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
            {cifras.map((cifra, i) => (
              <Reveal key={cifra.etiqueta} delay={i * 90} as="div" className="px-1 py-8 lg:px-6">
                <dt className="sr-only">{cifra.etiqueta}</dt>
                <dd>
                  <div className="font-display text-4xl font-light leading-none text-stone-50 lg:text-5xl">
                    {cifra.valor}
                    {cifra.unidad && (
                      <span className="ml-1 text-lg text-caoba-300 lg:text-xl">{cifra.unidad}</span>
                    )}
                  </div>
                  <div className="mt-4 h-px w-8 bg-caoba-500/60" />
                  <p className="mt-4 text-[0.7rem] uppercase leading-relaxed tracking-[0.14em] text-stone-400">
                    {cifra.etiqueta}
                  </p>
                </dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* ───────────────── Cierre: cita + imagen, en módulo bordeado ───────────────── */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 py-16 lg:px-10 lg:py-24">
          <Reveal className="grid grid-cols-1 items-stretch border border-stone-200 md:grid-cols-2">
            <div className="flex flex-col justify-center p-8 lg:p-12">
              <span className="font-display text-5xl leading-none text-caoba-400" aria-hidden>
                “
              </span>
              <blockquote className="font-display mt-2 text-xl font-light leading-snug text-stone-900 lg:text-2xl">
                Somos una empresa familiar que ha pasado por tres generaciones comprometidas con el
                trabajo duro, responsable y honesto.
              </blockquote>
              <p className="mt-6 text-xs uppercase tracking-[0.22em] text-stone-500">— Delben S.A.S.</p>
            </div>
            <ImageWell
              label="foto: taller — manos al oficio"
              tone="caoba"
              className="min-h-[18rem] border-t border-stone-200 md:border-l md:border-t-0"
            />
          </Reveal>
        </div>
      </section>
    </>
  )
}
