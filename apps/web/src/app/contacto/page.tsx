import type { Metadata } from 'next'
import { Reveal } from '@/components/reveal'
import { HeroPagina } from '@/components/ui-secciones'

export const metadata: Metadata = {
  title: 'Contacto',
  description:
    'Escríbanos a facturacion@delben.co o llame al +57 320 499 7451. Zona Franca de Cúcuta, Norte de Santander, Colombia.',
}

export default function Contacto() {
  return (
    <>
      <HeroPagina
        eyebrow="Contacto"
        indice="Contacto — 05"
        label="foto: recepción / planta"
        src="/fotos/nosotros-planta.jpg"
        alt="Sede de Delben en la Zona Franca de Cúcuta"
        priority
        alto="h-[50vh] min-h-[20rem]"
        titulo={
          <>
            Hablemos de{' '}
            <span className="font-display font-normal italic text-caoba-200">su próximo proyecto.</span>
          </>
        }
        subtitulo="Estamos en la Zona Franca de Cúcuta. Escríbanos o llámenos; con gusto le orientamos."
      />

      {/* Datos de contacto */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 py-16 lg:px-10 lg:py-20">
          <div className="grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 md:grid-cols-3">
            {/* Correo */}
            <Reveal className="flex flex-col gap-3 bg-stone-50 p-7 lg:p-8">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-caoba-700">
                <span className="h-px w-5 bg-caoba-500" />
                Correo
              </p>
              <a
                href="mailto:facturacion@delben.co"
                className="text-base text-stone-900 transition-colors hover:text-caoba-700"
              >
                facturacion@delben.co
              </a>
            </Reveal>

            {/* Teléfono */}
            <Reveal delay={90} className="flex flex-col gap-3 bg-stone-50 p-7 lg:p-8">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-caoba-700">
                <span className="h-px w-5 bg-caoba-500" />
                Teléfono
              </p>
              <a
                href="tel:+573204997451"
                className="text-base text-stone-900 transition-colors hover:text-caoba-700"
              >
                +57 320 499 7451
              </a>
            </Reveal>

            {/* Dirección */}
            <Reveal delay={180} className="flex flex-col gap-3 bg-stone-50 p-7 lg:p-8">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-caoba-700">
                <span className="h-px w-5 bg-caoba-500" />
                Dirección
              </p>
              <p className="text-sm leading-relaxed text-stone-700">
                Avenida Libertadores, Zona Franca Cúcuta — Bodega D 1-1.
                <br />
                Cúcuta, Norte de Santander, Colombia.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Ubicación + espacio reservado para el formulario futuro */}
      <section className="bg-stone-50">
        <div className="mx-auto max-w-editorial px-6 pb-20 lg:px-10 lg:pb-28">
          <Reveal className="grid grid-cols-1 items-stretch border border-stone-200 md:grid-cols-2">
            {/* Mapa de la Zona Franca (DELBEN SAS). Responsive: el iframe llena el
                contenedor; sin width/height fijos. */}
            <div className="relative min-h-[22rem] border-b border-stone-200 md:border-b-0 md:border-r">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6349.543780474082!2d-72.4975584!3d7.921995099999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e6645bf41b83565%3A0x304eb579ac2ef5a3!2sDELBEN%20SAS!5e1!3m2!1ses-419!2sco!4v1781213743430!5m2!1ses-419!2sco"
                title="Ubicación de DELBEN SAS en la Zona Franca de Cúcuta"
                className="absolute inset-0 h-full w-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            {/* Reserva visible para un formulario que se añadirá después */}
            <div className="flex min-h-[22rem] flex-col justify-center p-8 lg:p-12">
              <p className="text-xs uppercase tracking-[0.22em] text-caoba-700">Escríbanos</p>
              <h2 className="mt-4 text-xl font-medium tracking-tight text-stone-900 sm:text-2xl">
                Cuéntenos qué necesita.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-stone-600">
                Pronto habilitaremos un formulario aquí mismo. Por ahora, la vía más rápida es el
                correo o el teléfono.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="mailto:facturacion@delben.co"
                  className="inline-flex items-center gap-2 rounded-full bg-caoba-600 px-6 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-caoba-700"
                >
                  Enviar un correo
                  <span aria-hidden>→</span>
                </a>
                <a
                  href="tel:+573204997451"
                  className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-6 py-3 text-sm font-medium text-stone-800 transition-colors hover:border-stone-900"
                >
                  Llamar
                </a>
              </div>
              {/* Marcador del formulario futuro */}
              <div className="mt-8 rounded-none border border-dashed border-stone-300 px-4 py-3">
                <p className="text-[0.7rem] uppercase tracking-[0.16em] text-stone-400">
                  Formulario de contacto · próximamente
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
