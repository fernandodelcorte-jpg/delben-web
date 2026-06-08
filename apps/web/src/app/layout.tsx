/**
 * PAREJA TIPOGRÁFICA — el corazón del carácter de la web Delben
 * ------------------------------------------------------------------
 * Display:  Fraunces (serif).  Es una serif "old-style" de alto contraste
 *           con terminaciones suaves y eje óptico (opsz): en titulares grandes
 *           se vuelve señorial y cálida, no fría ni de alta costura. Transmite
 *           tradición, oficio y permanencia — las "tres generaciones" — sin caer
 *           en el cliché de Playfair. Su calidez encaja con la madera y el trabajo
 *           manual de Delben.
 * Cuerpo:   Hanken Grotesk (sans humanista).  Refinada, de rasgos abiertos y
 *           lectura tranquila; es prima del Geist que usa el portal (mismo aire
 *           neutro-moderno) pero con un punto más editorial. Mantiene el ADN de la
 *           familia "hermana, no gemela": el cuerpo dialoga con el portal y la
 *           Fraunces aporta la voz editorial propia de la web institucional.
 * Ambas se sirven desde Google Fonts (next/font/google) → fonts.googleapis.com,
 * auto-hospedadas por Next para evitar saltos de layout.
 *
 * NOTA DE REEQUILIBRIO (dirección "showroom"): aquí la Fraunces ACOMPAÑA, no
 * domina. Manda la imagen y la rejilla; el cuerpo y los titulares contenidos van
 * en Hanken, y la serif aparece solo como acento — cifras, la cita de cierre y
 * algún detalle puntual. Menos palabra, más composición.
 */
import type { Metadata } from 'next'
import { Fraunces, Hanken_Grotesk } from 'next/font/google'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  // Fuente variable: el eje de peso (wght) queda fluido y añadimos opsz + SOFT
  // para que los titulares grandes ganen porte y calidez en las terminaciones.
  axes: ['opsz', 'SOFT'],
  style: ['normal', 'italic'],
})

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
})

export const metadata: Metadata = {
  title: {
    default: 'Delben — Carpintería arquitectónica',
    template: '%s · Delben',
  },
  description:
    'Diseño contemporáneo y manufactura propia para cocinas, closets y mobiliario del hogar. Tres generaciones de oficio.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`no-js ${fraunces.variable} ${hanken.variable}`}>
      <body className="grano min-h-screen bg-stone-50 font-sans text-stone-800 antialiased">
        {/* Activa los reveals al cargar: sin JS, el contenido permanece visible */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.remove('no-js')",
          }}
        />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
