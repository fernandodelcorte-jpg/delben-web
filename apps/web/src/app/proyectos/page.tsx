import type { Metadata } from 'next'
import Link from 'next/link'
import { Reveal } from '@/components/reveal'
import { ImageWell } from '@/components/image-well'
import { HeroPagina, EncabezadoSeccion } from '@/components/ui-secciones'

export const metadata: Metadata = {
  title: 'Proyectos',
  description:
    'Trayectoria con Corona y constructoras. Proyectos residenciales grandes, hoteles internacionales y residencial de alto valor. Presencia en Colombia, Venezuela y EE. UU.',
}

const tipos = [
  {
    indice: '01',
    titulo: 'Residenciales grandes',
    texto: 'Proyectos de vivienda a gran escala, con volumen y estándares constantes.',
    foto: 'foto: proyecto residencial',
    tono: 'stone' as const,
  },
  {
    indice: '02',
    titulo: 'Hoteles internacionales',
    texto: 'Mobiliario para hotelería, con exigencias de durabilidad y acabado.',
    foto: 'foto: proyecto hotelero',
    tono: 'oscuro' as const,
  },
  {
    indice: '03',
    titulo: 'Residencial de alto valor',
    texto: 'Carpintería a medida para residencias donde el detalle define todo.',
    foto: 'foto: residencia de alto valor',
    tono: 'stone' as const,
  },
]

// Presencia por país (ciudades provistas — no inventar).
const presencia = [
  { pais: 'Colombia', ciudades: ['Cúcuta', 'Bucaramanga', 'Bogotá', 'Barranquilla'] },
  { pais: 'Venezuela', ciudades: ['San Cristóbal', 'Mérida', 'Barquisimeto', 'Caracas', 'Puerto La Cruz'] },
  { pais: 'EE. UU.', ciudades: ['Miami', 'Tampa'] },
]

export default function Proyectos() {
  return (
    <>
      <HeroPagina
        eyebrow="Proyectos"
        indice="Proyectos — 05"
        label="foto: proyecto entregado"
        titulo={
          <>
            Una trayectoria{' '}
            <span className="font-display font-normal italic text-caoba-200">que se ve en obra.</span>
          </>
        }
        subtitulo="Hemos acompañado a Corona y a constructoras en proyectos de gran escala, en tres países."
      />

      {/* Trayectoria */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 py-16 lg:px-10 lg:py-20">
          <Reveal className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.22em] text-caoba-700">Trayectoria</p>
            <h2 className="mt-4 text-xl font-medium leading-snug tracking-tight text-stone-900 sm:text-2xl">
              Trabajamos con marcas y constructoras que exigen volumen, cumplimiento y un acabado
              parejo en cada entrega.
            </h2>
          </Reveal>
        </div>
      </section>

      {/* Tipos de proyecto */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 pb-16 lg:px-10 lg:pb-20">
          <EncabezadoSeccion eyebrow="Tipos de proyecto" titulo="Distintas escalas, un mismo estándar." aside="03 tipos" />
          <div className="mt-10 grid grid-cols-1 divide-y divide-stone-200 border-x border-b border-stone-200 md:grid-cols-3 md:divide-x md:divide-y-0">
            {tipos.map((t, i) => (
              <Reveal key={t.indice} delay={i * 110} className="flex flex-col p-5 lg:p-6">
                <ImageWell label={t.foto} ratio="4 / 5" tone={t.tono} />
                <div className="mt-5 flex items-baseline gap-3">
                  <span className="font-display text-base text-caoba-600">{t.indice}</span>
                  <span className="regla-caoba mt-2 flex-1" />
                </div>
                <h3 className="mt-3 text-base font-semibold uppercase tracking-[0.04em] text-stone-900">
                  {t.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{t.texto}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Presencia por país */}
      <section className="bg-stone-900 text-stone-100">
        <div className="mx-auto max-w-editorial px-6 py-16 lg:px-10 lg:py-20">
          <Reveal className="border-b border-stone-700 pb-6">
            <p className="text-xs uppercase tracking-[0.22em] text-caoba-300">Presencia</p>
            <h2 className="mt-3 text-xl font-medium tracking-tight text-stone-50 sm:text-2xl">
              Dónde hemos llegado.
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 divide-y divide-stone-700 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {presencia.map((p, i) => (
              <Reveal key={p.pais} delay={i * 100} as="div" className="py-8 sm:px-6 sm:first:pl-0">
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-caoba-300">
                  <span className="h-px w-5 bg-caoba-400" />
                  {p.pais}
                </p>
                <ul className="mt-4 space-y-1.5">
                  {p.ciudades.map((c) => (
                    <li key={c} className="text-sm text-stone-300">
                      {c}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 py-16 lg:px-10 lg:py-20">
          <Reveal className="flex flex-col items-start gap-4 border border-stone-200 p-8 sm:flex-row sm:items-center sm:justify-between lg:p-12">
            <p className="font-display text-xl font-light text-stone-900 lg:text-2xl">
              ¿Tiene un proyecto en mente?
            </p>
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2 rounded-full bg-caoba-600 px-6 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-caoba-700"
            >
              Hablemos
              <span aria-hidden>→</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  )
}
