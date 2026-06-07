import type { Metadata } from 'next'
import Link from 'next/link'
import { Reveal } from '@/components/reveal'
import { ImageWell } from '@/components/image-well'
import { HeroPagina, EncabezadoSeccion } from '@/components/ui-secciones'

export const metadata: Metadata = {
  title: 'Manufactura',
  description:
    'Producción propia y control total: corte CNC, ensamble con tarugos, cantos enchapados. 1.500 m² de planta, 70 colaboradores.',
}

const proceso = [
  {
    indice: '01',
    titulo: 'Corte CNC',
    texto: 'Precisión de máquina en cada pieza, para un calce exacto en el ensamble.',
    foto: 'foto: router CNC en operación',
    tono: 'oscuro' as const,
  },
  {
    indice: '02',
    titulo: 'Ensamble con tarugos',
    texto: 'Uniones con tarugos, sin tornillos a la vista: más limpio y más resistente.',
    foto: 'foto: ensamble con tarugos',
    tono: 'stone' as const,
  },
  {
    indice: '03',
    titulo: 'Cantos enchapados',
    texto: 'Cantos enchapados para un acabado continuo, sellado y durable.',
    foto: 'foto: enchapado de cantos',
    tono: 'stone' as const,
  },
]

const cifras = [
  { valor: '1.500', unidad: 'm²', etiqueta: 'Planta de producción' },
  { valor: '70', unidad: '', etiqueta: 'Colaboradores' },
  { valor: '5', unidad: 'materiales', etiqueta: 'Madera · laminados · metal · vidrio · pintura' },
]

const herrajes = ['Blum', 'Salice', 'Häfele']

export default function Manufactura() {
  return (
    <>
      <HeroPagina
        eyebrow="Manufactura"
        indice="Manufactura — 03"
        label="foto: planta de producción"
        titulo={
          <>
            Producción propia.{' '}
            <span className="font-display font-normal italic text-caoba-200">Control total.</span>
          </>
        }
        subtitulo="Madera, laminados, metal, vidrio y pintura se transforman en nuestra planta, con personal propio. No tercerizamos."
      />

      {/* Cómo fabricamos */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 py-16 lg:px-10 lg:py-20">
          <EncabezadoSeccion eyebrow="Cómo fabricamos" titulo="De la pieza al mueble, con método." aside="03 pasos" />
          <div className="mt-10 grid grid-cols-1 divide-y divide-stone-200 border-x border-b border-stone-200 md:grid-cols-3 md:divide-x md:divide-y-0">
            {proceso.map((p, i) => (
              <Reveal key={p.indice} delay={i * 110} className="flex flex-col p-5 lg:p-6">
                <ImageWell label={p.foto} ratio="4 / 5" tone={p.tono} />
                <div className="mt-5 flex items-baseline gap-3">
                  <span className="font-display text-base text-caoba-600">{p.indice}</span>
                  <span className="regla-caoba mt-2 flex-1" />
                </div>
                <h3 className="mt-3 text-base font-semibold uppercase tracking-[0.04em] text-stone-900">
                  {p.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{p.texto}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Capacidad industrial — banda de cifras */}
      <section className="bg-stone-900 text-stone-100">
        <div className="mx-auto max-w-editorial px-6 py-16 lg:px-10 lg:py-20">
          <Reveal className="border-b border-stone-700 pb-6">
            <p className="text-xs uppercase tracking-[0.22em] text-caoba-300">Capacidad industrial</p>
            <h2 className="mt-3 text-xl font-medium tracking-tight text-stone-50 sm:text-2xl">
              Todo bajo un mismo techo.
            </h2>
          </Reveal>
          <dl className="grid grid-cols-1 divide-stone-700 sm:grid-cols-3 sm:divide-x">
            {cifras.map((c, i) => (
              <Reveal key={c.etiqueta} delay={i * 90} as="div" className="py-8 sm:px-6 sm:first:pl-0">
                <dt className="sr-only">{c.etiqueta}</dt>
                <dd>
                  <div className="font-display text-4xl font-light leading-none text-stone-50 lg:text-5xl">
                    {c.valor}
                    {c.unidad && <span className="ml-1 text-lg text-caoba-300 lg:text-xl">{c.unidad}</span>}
                  </div>
                  <div className="mt-4 h-px w-8 bg-caoba-500/60" />
                  <p className="mt-4 text-[0.7rem] uppercase leading-relaxed tracking-[0.14em] text-stone-400">
                    {c.etiqueta}
                  </p>
                </dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* Control de calidad por etapas */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 py-16 lg:px-10 lg:py-20">
          <Reveal className="grid grid-cols-1 items-stretch border border-stone-200 md:grid-cols-2">
            <ImageWell
              label="foto: revisión de calidad"
              tone="stone"
              className="min-h-[20rem] border-b border-stone-200 md:border-b-0 md:border-r"
            />
            <div className="flex flex-col justify-center p-8 lg:p-12">
              <p className="text-xs uppercase tracking-[0.22em] text-caoba-700">Control de calidad</p>
              <h2 className="mt-4 text-xl font-medium tracking-tight text-stone-900 sm:text-2xl">
                Revisamos en cada etapa.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-stone-600">
                El control de la calidad no se deja para el final: se controla en cada etapa, desde la
                compra de los insumos hasta el embalaje y despacho.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Herrajes */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 pb-20 lg:px-10 lg:pb-28">
          <EncabezadoSeccion eyebrow="Herrajes" titulo="Componentes de referencia mundial." />
          <Reveal className="mt-10 grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-3">
            {herrajes.map((marca) => (
              <div key={marca} className="flex h-28 items-center justify-center bg-white">
                <span className="font-display text-2xl font-light tracking-tight text-stone-700">{marca}</span>
              </div>
            ))}
          </Reveal>
          <Reveal className="mt-10">
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 rounded-full bg-caoba-600 px-6 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-caoba-700"
            >
              Ver el portafolio
              <span aria-hidden>→</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  )
}
