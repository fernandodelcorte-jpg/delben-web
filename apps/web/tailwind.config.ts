import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Cuerpo: sans humanista refinada (hermana del Geist del portal)
        sans: ['var(--font-hanken)', 'system-ui', 'sans-serif'],
        // Titulares editoriales: serif con carácter de oficio
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      letterSpacing: {
        marca: '0.34em',
      },
      maxWidth: {
        editorial: '74rem',
      },
      animation: {
        // Entrada orquestada al cargar — escalonada vía animation-delay
        'subir-aparecer': 'subir-aparecer 0.9s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        'subir-aparecer': {
          from: { opacity: '0', transform: 'translateY(22px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      colors: {
        // Caoba: acento cálido de madera colombiana (idéntico al portal)
        caoba: {
          50: 'oklch(0.97 0.01 50)',
          100: 'oklch(0.92 0.03 50)',
          200: 'oklch(0.84 0.06 50)',
          300: 'oklch(0.73 0.10 50)',
          400: 'oklch(0.63 0.14 50)',
          500: 'oklch(0.54 0.15 45)',
          600: 'oklch(0.48 0.14 42)',
          700: 'oklch(0.40 0.12 40)',
          800: 'oklch(0.32 0.09 38)',
          900: 'oklch(0.24 0.06 36)',
          950: 'oklch(0.16 0.04 34)',
        },
      },
    },
  },
  plugins: [],
}

export default config
