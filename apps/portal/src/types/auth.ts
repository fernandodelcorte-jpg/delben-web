import type { User } from 'firebase/auth'
import type { Rol } from '@delben/firebase'
import type { Distribuidor } from '@/lib/firebase/tipos-firestore'

export interface EstadoAuth {
  usuario: User | null
  rol: Rol | null
  distribuidorId: string | null
  distribuidor: Distribuidor | null
  cargando: boolean
}
