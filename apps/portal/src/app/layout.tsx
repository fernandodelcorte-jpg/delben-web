import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { AuthProvider } from '@/components/providers/auth-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Delben — Plataforma de cotización',
  description: 'Herramienta de cotización para distribuidores autorizados de Delben.',
  // Favicons estáticos generados desde el logo (ver scripts/generar-favicons.mjs).
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="font-sans bg-stone-50 text-stone-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
