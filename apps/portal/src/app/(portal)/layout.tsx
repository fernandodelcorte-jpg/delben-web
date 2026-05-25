'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { NavPortal } from '@/components/nav-portal'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { usuario, cargando } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace('/login')
    }
  }, [usuario, cargando, router])

  // Cargando estado inicial de auth
  if (cargando) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-stone-50">
        <span
          className="h-5 w-5 rounded-full border-2 border-stone-200 border-t-caoba-600 animate-spin"
          role="status"
          aria-label="Cargando"
        />
      </div>
    )
  }

  // No autenticado — redirige, render vacío mientras
  if (!usuario) return null

  return (
    <div className="min-h-[100dvh] bg-stone-50">
      <NavPortal />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>
    </div>
  )
}
