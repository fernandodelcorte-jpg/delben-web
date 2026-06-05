import type { Metadata } from 'next'
import Link from 'next/link'
import { Reveal } from '@/components/reveal'
import { ImageWell } from '@/components/image-well'
import { HeroPagina, EncabezadoSeccion } from '@/components/ui-secciones'
import { NuestraRed } from '@/components/nuestra-red'
import { PORTAL_URL } from '@/lib/config'

export const metadata: Metadata = {
  title: 'Distribuidores',
  description:
    'Un modelo de autonomía: manuales de diseño, portafolio amplio, cotización en línea y capacitación. Relaciones de largo plazo.',
}

const apoyos = [
  { titulo: 'Manuales de diseño', texto: 'Guías para diseñar bien, desde el primer trazo hasta la entrega.' },
  { titulo: 'Portafolio amplio', texto: 'Todo el catálogo a su disposición, con acabados y combinaciones.' },
  { titulo: 'Cotización en línea', texto: 'Cotice usted mismo a su cliente final, en el portal, cuando quiera.' },
  { titulo: 'Capacitación', texto: 'Acompañamiento para que su equipo domine producto y herramienta.' },
]

export default function Distribuidores() {
  return (
    <>
      <HeroPagina
        eyebrow="Distribuidores"
        indice="Distribuidores — 06"
        label="foto: distribuidor con cliente"
        titulo={
          <>
            Su negocio,{' '}
            <span className="font-display font-normal italic text-caoba-200">con el respaldo de la fábrica.</span>
          </>
        }
        subtitulo="Trabajamos a través de distribuidores autónomos. Usted vende y atiende a su cliente; nosotros fabricamos y lo respaldamos."
      />

      {/* Modelo de autonomía */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 py-16 lg:px-10 lg:py-20">
          <EncabezadoSeccion eyebrow="El modelo" titulo="Autonomía, con respaldo de fábrica." aside="01 — 04" />
          <div className="mt-10 grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
            {apoyos.map((a, i) => (
              <Reveal key={a.titulo} delay={i * 90} className="flex flex-col bg-stone-50 p-6">
                <span className="font-display text-base text-caoba-600">0{i + 1}</span>
                <span className="regla-caoba mt-2" />
                <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.06em] text-stone-900">
                  {a.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{a.texto}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Relación de largo plazo */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 pb-16 lg:px-10 lg:pb-20">
          <Reveal className="grid grid-cols-1 items-stretch border border-stone-200 md:grid-cols-2">
            <ImageWell
              label="foto: equipo Delben"
              tone="caoba"
              className="min-h-[20rem] border-b border-stone-200 md:border-b-0 md:border-r"
            />
            <div className="flex flex-col justify-center p-8 lg:p-12">
              <p className="text-xs uppercase tracking-[0.22em] text-caoba-700">Largo plazo</p>
              <h2 className="mt-4 text-xl font-medium tracking-tight text-stone-900 sm:text-2xl">
                Relaciones que duran.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-stone-600">
                No buscamos una venta: buscamos un socio. Nuestra red crece con distribuidores que se
                quedan, porque el respaldo se nota proyecto tras proyecto.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Dos CTAs */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 pb-16 lg:px-10 lg:pb-20">
          <div className="grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 md:grid-cols-2">
            <Reveal className="flex flex-col items-start gap-4 bg-stone-50 p-8 lg:p-12">
              <p className="text-xs uppercase tracking-[0.22em] text-caoba-700">¿Ya es distribuidor?</p>
              <p className="font-display text-xl font-light text-stone-900 lg:text-2xl">
                Entre al portal y cotice a su cliente.
              </p>
              <a
                href={PORTAL_URL}
                className="mt-auto inline-flex items-center gap-2 rounded-full bg-caoba-600 px-6 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-caoba-700"
              >
                Portal de distribuidores
                <span aria-hidden>→</span>
              </a>
            </Reveal>
            <Reveal delay={100} className="flex flex-col items-start gap-4 bg-stone-50 p-8 lg:p-12">
              <p className="text-xs uppercase tracking-[0.22em] text-caoba-700">¿Quiere ser distribuidor?</p>
              <p className="font-display text-xl font-light text-stone-900 lg:text-2xl">
                Conversemos sobre representar a Delben.
              </p>
              <Link
                href="/contacto"
                className="mt-auto inline-flex items-center gap-2 rounded-full border border-stone-300 px-6 py-3 text-sm font-medium text-stone-800 transition-colors hover:border-stone-900"
              >
                Contáctenos
                <span aria-hidden>→</span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Nuestra red (canal público) — vive en esta página */}
      <NuestraRed />
    </>
  )
}
