import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      animation: {
        aparecer: 'aparecer 0.5s cubic-bezier(0.23, 1, 0.32, 1) both',
        'aparecer-lento': 'aparecer 0.7s cubic-bezier(0.23, 1, 0.32, 1) both',
        sacudir: 'sacudir 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        desplegarse: 'desplegarse 150ms cubic-bezier(0.23, 1, 0.32, 1) both',
      },
      keyframes: {
        aparecer: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        desplegarse: {
          from: { opacity: '0', transform: 'scale(0.96) translateY(-4px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        sacudir: {
          '10%, 90%': { transform: 'translateX(-1px)' },
          '20%, 80%': { transform: 'translateX(2px)' },
          '30%, 50%, 70%': { transform: 'translateX(-3px)' },
          '40%, 60%': { transform: 'translateX(3px)' },
        },
      },
      colors: {
        // Caoba: acento cálido de madera colombiana
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
