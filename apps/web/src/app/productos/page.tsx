import type { Metadata } from 'next'
import Link from 'next/link'
import { Reveal } from '@/components/reveal'
import { ImageWell } from '@/components/image-well'
import { HeroPagina, EncabezadoSeccion } from '@/components/ui-secciones'

export const metadata: Metadata = {
  title: 'Productos',
  description:
    'Cocinas y closets, baños, entretenimiento, zonas de ropas y carpintería a medida. El sello de Delben está en el manejo de los acabados. Entrega en 45 días.',
}

// Estrella del portafolio: cocinas y closets, a gran tamaño.
const estrella = [
  { nombre: 'Cocinas', texto: 'El corazón de la casa.', foto: 'foto: cocina — galería' },
  { nombre: 'Closets', texto: 'Orden hecho a la medida.', foto: 'foto: closet — galería' },
]

// Resto del portafolio.
const portafolio = [
  { nombre: 'Baños', foto: 'foto: mueble de baño' },
  { nombre: 'Entretenimiento', foto: 'foto: mueble de TV' },
  { nombre: 'Zonas de ropas', foto: 'foto: zona de ropas' },
  { nombre: 'Carpintería a medida', foto: 'foto: pieza a medida' },
]

export default function Productos() {
  return (
    <>
      <HeroPagina
        eyebrow="Productos"
        indice="Productos — 03"
        label="foto: portafolio — pieza destacada"
        titulo={
          <>
            Cocinas y closets,{' '}
            <span className="font-display font-normal italic text-caoba-200">y todo el mobiliario del hogar.</span>
          </>
        }
        subtitulo="Un portafolio amplio, pensado para mostrarse con fotografía grande. El sello de Delben está en el manejo de los acabados."
      />

      {/* Estrella del portafolio */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 py-16 lg:px-10 lg:py-20">
          <EncabezadoSeccion eyebrow="Portafolio" titulo="Cocinas y closets, nuestra especialidad." aside="Galería" />
          <div className="mt-10 grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 md:grid-cols-2">
            {estrella.map((e, i) => (
              <Reveal key={e.nombre} delay={i * 120}>
                <ImageWell label={e.foto} tone={i === 0 ? 'oscuro' : 'stone'} overlay className="h-[60vh] min-h-[24rem] w-full">
                  <div className="flex h-full flex-col justify-end p-7 lg:p-8">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-caoba-300">
                      <span className="h-px w-6 bg-caoba-400" />
                      {e.nombre}
                    </p>
                    <p className="mt-2 font-display text-2xl font-light text-stone-50">{e.texto}</p>
                  </div>
                </ImageWell>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Resto del portafolio */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 pb-16 lg:px-10 lg:pb-20">
          <div className="grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
            {portafolio.map((p, i) => (
              <Reveal key={p.nombre} delay={i * 90} className="bg-stone-50">
                <ImageWell label={p.foto} ratio="4 / 5" tone="stone" />
                <p className="px-5 py-4 text-sm font-semibold uppercase tracking-[0.06em] text-stone-900">
                  {p.nombre}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* El sello: manejo de acabados */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 pb-16 lg:px-10 lg:pb-20">
          <Reveal className="grid grid-cols-1 items-stretch border border-stone-200 md:grid-cols-2">
            <div className="flex flex-col justify-center p-8 lg:p-12">
              <p className="text-xs uppercase tracking-[0.22em] text-caoba-700">El sello</p>
              <h2 className="mt-4 text-xl font-medium tracking-tight text-stone-900 sm:text-2xl">
                El manejo de los acabados.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-stone-600">
                Una amplia variedad de acabados y combinaciones, con estándares de ergonomía y
                funcionalidad. Diseño que no pasa de moda.
              </p>
            </div>
            <ImageWell
              label="foto: muestrario de acabados"
              tone="caoba"
              className="min-h-[20rem] border-t border-stone-200 md:border-l md:border-t-0"
            />
          </Reveal>
        </div>
      </section>

      {/* Entrega en 45 días */}
      <section className="bg-stone-900 text-stone-100">
        <div className="mx-auto flex max-w-editorial flex-col items-center gap-3 px-6 py-20 text-center lg:px-10 lg:py-24">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.22em] text-caoba-300">Tiempo de entrega</p>
            <p className="font-display mt-5 text-6xl font-light leading-none text-stone-50 lg:text-7xl">
              45<span className="ml-2 text-2xl text-caoba-300 lg:text-3xl">días</span>
            </p>
            <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-stone-300">
              Del pedido a la entrega, con manufactura propia que nos deja cumplir los tiempos.
            </p>
            <Link
              href="/distribuidores"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-caoba-600 px-6 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-caoba-700"
            >
              Cotice como distribuidor
              <span aria-hidden>→</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  )
}
