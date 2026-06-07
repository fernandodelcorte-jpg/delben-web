import type { CSSProperties, ReactNode } from 'react'

type ImageWellProps = {
  /** Texto del marcador, ej: "foto: planta de producción" */
  label: string
  /** Proporción CSS, ej: "4 / 5", "16 / 9". Omítela si fijas la altura por className. */
  ratio?: string
  /** Tono del pozo de imagen */
  tone?: 'stone' | 'caoba' | 'oscuro'
  className?: string
  /** Contenido superpuesto (p. ej. el bloque de texto del hero) */
  children?: ReactNode
  /** Gradiente inferior para legibilidad del texto superpuesto */
  overlay?: boolean
  /** En móvil (<sm) oculta la etiqueta y los ticks de encuadre para aligerar la
   *  composición. Desktop queda intacto. */
  mobileMinimal?: boolean
}

const tones: Record<NonNullable<ImageWellProps['tone']>, string> = {
  stone: 'bg-stone-200/80 text-stone-500',
  caoba: 'bg-caoba-100 text-caoba-700',
  oscuro: 'bg-stone-800 text-stone-300',
}

/**
 * Pozo de imagen protagonista: marcador con proporción/altura fija, listo para
 * recibir fotografía grande de calidad. Marco hairline + ticks de encuadre +
 * etiqueta sutil en esquina. Acepta texto superpuesto y gradiente de legibilidad.
 */
export function ImageWell({
  label,
  ratio,
  tone = 'stone',
  className,
  children,
  overlay = false,
  mobileMinimal = false,
}: ImageWellProps) {
  const soloDesktop = mobileMinimal ? ' hidden sm:block' : ''
  return (
    <div
      className={`group relative isolate overflow-hidden ${tones[tone]}${className ? ` ${className}` : ''}`}
      style={ratio ? ({ aspectRatio: ratio } as CSSProperties) : undefined}
    >
      {/* Textura de rejilla muy tenue: insinúa estructura/material bajo la foto */}
      <div
        className={`pointer-events-none absolute inset-0 ${tone === 'oscuro' ? 'rejilla-oscura' : 'rejilla'}`}
        aria-hidden
      />

      {/* Marco interior hairline */}
      <div className="pointer-events-none absolute inset-4 border border-current opacity-15" aria-hidden />

      {/* Ticks de esquina — lenguaje de encuadre / fabricación */}
      <span className={`pointer-events-none absolute left-4 top-4 h-3.5 w-3.5 border-l border-t border-current opacity-40${soloDesktop}`} aria-hidden />
      <span className={`pointer-events-none absolute bottom-4 right-4 h-3.5 w-3.5 border-b border-r border-current opacity-40${soloDesktop}`} aria-hidden />

      {/* Etiqueta del marcador, en esquina para no estorbar al texto */}
      <span className={`absolute right-4 top-4 z-10 font-sans text-[0.65rem] uppercase tracking-[0.16em] opacity-70${soloDesktop}`}>
        [{label}]
      </span>

      {/* Gradiente de legibilidad para texto superpuesto */}
      {overlay && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-950/75 via-stone-950/20 to-transparent"
          aria-hidden
        />
      )}

      {children && <div className="absolute inset-0 z-10">{children}</div>}
    </div>
  )
}
