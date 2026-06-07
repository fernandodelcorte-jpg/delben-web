import type { Metadata } from 'next'
import Link from 'next/link'
import { Reveal } from '@/components/reveal'
import { ImageWell } from '@/components/image-well'
import { HeroPagina, EncabezadoSeccion } from '@/components/ui-secciones'

export const metadata: Metadata = {
  title: 'Nosotros',
  description:
    'La familia en la carpintería desde 1976. En 2007 nace Delben en Cúcuta. Tres generaciones de oficio.',
}

const hitos = [
  {
    anio: '1976',
    titulo: 'La familia entra al oficio',
    texto: 'El trabajo de la carpintería empieza en familia, mucho antes de que existiera la empresa.',
    foto: 'foto: taller de los inicios',
    tono: 'stone' as const,
  },
  {
    anio: '2007',
    titulo: 'Nace Delben en Cúcuta',
    texto: 'El oficio se vuelve empresa en la Zona Franca de Cúcuta, con manufactura exclusiva.',
    foto: 'foto: planta en Cúcuta',
    tono: 'oscuro' as const,
  },
]

const principios = [
  { titulo: 'Manufactura exclusiva', texto: 'Fabricamos en nuestra planta, con personal propio. No tercerizamos.' },
  { titulo: 'Precisión', texto: 'Acabados cuidados y ensamble de precisión en cada pieza.' },
  { titulo: 'Honestidad', texto: 'Cumplimos lo que prometemos, en cada entrega.' },
  { titulo: 'Largo plazo', texto: 'Relaciones que duran, con nuestros aliados comerciales y sus clientes.' },
]

export default function Nosotros() {
  return (
    <>
      <HeroPagina
        eyebrow="Nosotros"
        indice="Nosotros — 02"
        label="foto: familia en el taller"
        titulo={
          <>
            Tres generaciones con oficio,{' '}
            <span className="font-display font-normal italic text-caoba-200">una empresa hecha en Cúcuta.</span>
          </>
        }
      />

      {/* Historia — dos hitos */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 py-16 lg:px-10 lg:py-20">
          <EncabezadoSeccion eyebrow="Historia" titulo="De un oficio de familia a una empresa." aside="1976 → 2007" />

          <Reveal className="mt-8 max-w-3xl">
            <p className="text-base leading-relaxed text-stone-600 sm:text-lg">
              La familia Del Corte, desde 1976 en la industria de la producción, completa ya tres
              generaciones entregadas con pasión a la fabricación de mobiliario. Es así como nace en
              el año 2007 Delben, en la Zona Franca de Cúcuta, Colombia.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 divide-y divide-stone-200 border-x border-b border-stone-200 md:grid-cols-2 md:divide-x md:divide-y-0">
            {hitos.map((h, i) => (
              <Reveal key={h.anio} delay={i * 120} className="flex flex-col p-5 lg:p-6">
                <ImageWell label={h.foto} ratio="16 / 11" tone={h.tono} />
                <div className="mt-5 flex items-baseline gap-3">
                  <span className="font-display text-2xl font-light text-caoba-600">{h.anio}</span>
                  <span className="regla-caoba mt-3 flex-1" />
                </div>
                <h3 className="mt-3 text-base font-semibold uppercase tracking-[0.04em] text-stone-900">
                  {h.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{h.texto}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Tres generaciones — cita + imagen */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 py-16 lg:px-10 lg:py-20">
          <Reveal className="grid grid-cols-1 items-stretch border border-stone-200 md:grid-cols-2">
            <div className="flex flex-col justify-center p-8 lg:p-12">
              <p className="text-xs uppercase tracking-[0.22em] text-caoba-700">Tres generaciones</p>
              <blockquote className="font-display mt-5 text-xl font-light leading-snug text-stone-900 lg:text-2xl">
                Trabajo duro, responsable y honesto. Lo que siempre nos ha caracterizado.
              </blockquote>
              <p className="mt-6 text-xs uppercase tracking-[0.22em] text-stone-500">— Delben S.A.S.</p>
            </div>
            <ImageWell
              label="foto: tres generaciones"
              tone="caoba"
              className="min-h-[18rem] border-t border-stone-200 md:border-l md:border-t-0"
            />
          </Reveal>
        </div>
      </section>

      {/* Lo que no negociamos */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 pb-20 lg:px-10 lg:pb-28">
          <EncabezadoSeccion eyebrow="Lo que no negociamos" titulo="Cuatro cosas que no cambian." aside="01 — 04" />
          <div className="mt-10 grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
            {principios.map((p, i) => (
              <Reveal key={p.titulo} delay={i * 90} className="flex flex-col bg-stone-50 p-6">
                <span className="font-display text-base text-caoba-600">0{i + 1}</span>
                <span className="regla-caoba mt-2" />
                <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.06em] text-stone-900">
                  {p.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{p.texto}</p>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/manufactura"
              className="inline-flex items-center gap-2 rounded-full bg-caoba-600 px-6 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-caoba-700"
            >
              Cómo fabricamos
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-6 py-3 text-sm font-medium text-stone-800 transition-colors hover:border-stone-900"
            >
              Ver el portafolio
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  )
}
