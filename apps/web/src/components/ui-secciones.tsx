import type { CSSProperties, ReactNode } from 'react'
import { ImageWell } from '@/components/image-well'
import { Reveal } from '@/components/reveal'

/** Helper para el animation-delay tipado en la entrada al cargar */
const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` })

type HeroPaginaProps = {
  eyebrow: string
  titulo: ReactNode
  subtitulo?: ReactNode
  /** Rótulo de ficha técnica a la derecha, ej. "Nosotros — 02" */
  indice: string
  /** Etiqueta del pozo de imagen, ej. "foto: planta de producción" */
  label: string
  tone?: 'stone' | 'caoba' | 'oscuro'
  /** Clases de altura del hero (a sangre). Más bajo que el Inicio. */
  alto?: string
  /** Foto real de fondo (opcional). Sin ella, el hero queda como placeholder. */
  src?: string
  /** Texto alternativo de la foto. */
  alt?: string
  /** Carga prioritaria (para el hero, primero que se ve). */
  priority?: boolean
}

/**
 * Hero a sangre con texto contenido superpuesto, hermano del Inicio. Entrada
 * orquestada sobria (escalonada). La imagen es protagonista; la Fraunces solo
 * acompaña vía el acento del titular que cada página le pase.
 */
export function HeroPagina({
  eyebrow,
  titulo,
  subtitulo,
  indice,
  label,
  tone = 'oscuro',
  alto = 'h-[60vh] min-h-[24rem]',
  src,
  alt,
  priority = false,
}: HeroPaginaProps) {
  return (
    <section className="relative">
      <ImageWell label={label} src={src} alt={alt} priority={priority} tone={tone} overlay className={`animate-subir-aparecer w-full ${alto}`}>
        <div className="mx-auto flex h-full max-w-editorial flex-col justify-between px-6 py-8 lg:px-10 lg:py-10">
          <div
            className="animate-subir-aparecer flex items-center justify-between text-[0.7rem] uppercase tracking-[0.2em] text-stone-200/90"
            style={delay(120)}
          >
            <span>Zona Franca de Cúcuta · Colombia</span>
            <span className="hidden sm:inline">{indice}</span>
          </div>

          <div className="max-w-3xl">
            <p
              className="animate-subir-aparecer flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-caoba-300"
              style={delay(220)}
            >
              <span className="h-px w-8 bg-caoba-400" />
              {eyebrow}
            </p>
            <h1
              className="animate-subir-aparecer mt-5 text-3xl font-medium leading-[1.1] tracking-tight text-stone-50 sm:text-4xl lg:text-5xl"
              style={delay(320)}
            >
              {titulo}
            </h1>
            {subtitulo && (
              <p
                className="animate-subir-aparecer mt-5 max-w-xl text-base leading-relaxed text-stone-200/85"
                style={delay(420)}
              >
                {subtitulo}
              </p>
            )}
          </div>
        </div>
      </ImageWell>
    </section>
  )
}

type EncabezadoSeccionProps = {
  eyebrow: string
  titulo: ReactNode
  aside?: ReactNode
}

/** Cabecera de sección estándar (eyebrow + titular contenido + dato a la derecha). */
export function EncabezadoSeccion({ eyebrow, titulo, aside }: EncabezadoSeccionProps) {
  return (
    <Reveal className="flex items-end justify-between gap-6 border-b border-stone-200 pb-6">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-caoba-700">{eyebrow}</p>
        <h2 className="mt-3 text-xl font-medium tracking-tight text-stone-900 sm:text-2xl">{titulo}</h2>
      </div>
      {aside && <span className="hidden font-display text-sm text-stone-400 sm:block">{aside}</span>}
    </Reveal>
  )
}
