'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, onAuthStateChanged, extraerRol } from '@/lib/firebase/client'
import { getDistribuidor } from '@/lib/firestore/distribuidores'
import type { EstadoAuth } from '@/types/auth'
import type { Distribuidor } from '@/lib/firebase/tipos-firestore'
import type { Rol } from '@delben/firebase'

const AuthContext = createContext<EstadoAuth>({
  usuario: null,
  rol: null,
  distribuidorId: null,
  distribuidor: null,
  cargando: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoAuth>({
    usuario: null,
    rol: null,
    distribuidorId: null,
    distribuidor: null,
    cargando: true,
  })

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, async (usuario) => {
      if (usuario) {
        // Marcar cargando=true antes del primer await para evitar que la guardia
        // del portal layout redirija a /login mientras se resuelve el estado.
        setEstado((prev) => ({ ...prev, cargando: true }))
        const token = await usuario.getIdTokenResult()
        let rol = extraerRol(token)
        let distribuidorId =
          typeof token.claims['distribuidorId'] === 'string'
            ? token.claims['distribuidorId']
            : null

        // Si el token no trae rol (bootstrap o desarrollo sin custom claims),
        // lo leemos desde Firestore como fallback.
        if (!rol) {
          try {
            const snap = await getDoc(doc(db, 'usuarios', usuario.uid))
            if (snap.exists()) {
              const data = snap.data()
              if (typeof data['rol'] === 'string') rol = data['rol'] as Rol
              if (!distribuidorId && typeof data['distribuidor_id'] === 'string') {
                distribuidorId = data['distribuidor_id']
              }
            }
          } catch {
            // Firestore no disponible o reglas bloqueadas — continúa sin rol
          }
        }

        // Cargar datos completos del distribuidor si el usuario pertenece a uno
        let distribuidor: Distribuidor | null = null
        if (distribuidorId) {
          try {
            distribuidor = await getDistribuidor(distribuidorId)
          } catch {
            // Firestore no disponible — el cotizador usará datos demo como fallback
          }
        }

        setEstado({ usuario, rol, distribuidorId, distribuidor, cargando: false })
      } else {
        setEstado({ usuario: null, rol: null, distribuidorId: null, distribuidor: null, cargando: false })
      }
    })
    return cancelar
  }, [])

  return <AuthContext.Provider value={estado}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
