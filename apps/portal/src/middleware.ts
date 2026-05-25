import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rebanada 0: middleware sin verificación de sesión.
// En Rebanada 4 se implementará verificación real con Firebase Admin SDK
// y cookies de sesión (__session) para protección a nivel de servidor.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
