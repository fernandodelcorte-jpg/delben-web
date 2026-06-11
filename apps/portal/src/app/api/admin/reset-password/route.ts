import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

// firebase-admin requiere el runtime de Node (no edge). Sin cache: muta estado
// y la autorización depende del token del llamante.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const esquema = z.object({
  email: z.string().email(),
  contrasena: z.string().min(6, 'La contraseña debe tener mínimo 6 caracteres.'),
})

/** Extrae el `code` de un error de firebase-admin de forma type-safe. */
function codigoError(err: unknown): string {
  return err && typeof err === 'object' && 'code' in err
    ? String((err as { code: unknown }).code)
    : ''
}

/**
 * ¿El fallo es de INICIALIZACIÓN/credenciales del Admin SDK (configuración del
 * servidor) y no del llamante? En Netlify, sin las env vars del service account
 * ni ADC, el SDK no puede resolver el project id y arroja "Unable to detect a
 * Project Id" — error que aflora al primer uso (p. ej. verifyIdToken), no antes.
 * Distinguirlo evita reportar un 401 "Token inválido" engañoso.
 */
function esErrorDeCredenciales(err: unknown): boolean {
  const code = codigoError(err)
  const msg = err instanceof Error ? err.message : String(err)
  return (
    code.startsWith('app/') ||
    /unable to detect a project id/i.test(msg) ||
    /could not (load|refresh) .*default credentials/i.test(msg) ||
    /failed to (determine|detect).*project/i.test(msg) ||
    /default credentials/i.test(msg)
  )
}

export async function POST(request: NextRequest) {
  // ───────────────────────────────────────────────────────────────────────
  // CAPA 0 — Inicializar el Admin SDK. Si faltan las credenciales en el
  // servidor (env vars del service account o ADC), el SDK no arranca: es un
  // fallo de CONFIGURACIÓN, no del llamante → 503 (no 401/500 engañoso).
  // ───────────────────────────────────────────────────────────────────────
  let auth: ReturnType<typeof adminAuth>
  let db: ReturnType<typeof adminDb>
  try {
    auth = adminAuth()
    db = adminDb()
  } catch (err) {
    console.error('Admin SDK no inicializó (¿faltan credenciales en el servidor?):', err)
    return NextResponse.json(
      { error: 'Servicio no configurado: faltan credenciales del Admin SDK en el servidor.' },
      { status: 503 },
    )
  }

  // ───────────────────────────────────────────────────────────────────────
  // CAPA 1 — Autenticar al llamante. Lo ÚNICO que se acepta del cliente es su
  // ID token; se verifica con el Admin SDK (firmado por Firebase, infalsificable).
  // No se ejecuta NADA del negocio hasta superar esta capa.
  // ───────────────────────────────────────────────────────────────────────
  const authz = request.headers.get('authorization') ?? ''
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  let uidLlamante: string
  try {
    uidLlamante = (await auth.verifyIdToken(token)).uid
  } catch (err) {
    // El error de project id/credenciales puede aflorar aquí (init perezosa del
    // SDK): se clasifica como 503, NO como token inválido.
    if (esErrorDeCredenciales(err)) {
      console.error('Admin SDK sin credenciales al verificar el token:', err)
      return NextResponse.json(
        { error: 'Servicio no configurado: faltan credenciales del Admin SDK en el servidor.' },
        { status: 503 },
      )
    }
    // Token realmente inválido/expirado: fallo del llamante → 401.
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 })
  }

  // ───────────────────────────────────────────────────────────────────────
  // CAPA 2 — Autorizar: SOLO super_admin. El rol se lee VIVO desde Firestore
  // (usuarios/{uid}), NO del claim del token: una degradación tiene efecto
  // inmediato sin esperar a que el token se refresque.
  // ───────────────────────────────────────────────────────────────────────
  const llamanteSnap = await db.doc(`usuarios/${uidLlamante}`).get()
  if (!llamanteSnap.exists || llamanteSnap.data()?.['rol'] !== 'super_admin') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  // ───────────────────────────────────────────────────────────────────────
  // CAPA 3 — Validar el cuerpo (email válido + contraseña ≥6). Recién tras
  // las tres capas se toca Firebase Auth.
  // ───────────────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido.' }, { status: 400 })
  }
  const parsed = esquema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          'Datos inválidos: el correo debe tener formato válido y la contraseña mínimo 6 caracteres.',
      },
      { status: 400 },
    )
  }
  const { email, contrasena } = parsed.data

  // ── Operación privilegiada: buscar el usuario y actualizar su contraseña. ──
  let usuario
  try {
    usuario = await auth.getUserByEmail(email)
  } catch (err) {
    if (codigoError(err) === 'auth/user-not-found') {
      // El llamante es super_admin de confianza: el mensaje es explícito.
      return NextResponse.json(
        { error: 'No existe un usuario con ese correo.' },
        { status: 404 },
      )
    }
    // Fallo inesperado: se loguea el error real en el servidor (sin filtrarlo al cliente).
    console.error('Error al buscar el usuario para reset de contraseña:', err)
    return NextResponse.json({ error: 'No se pudo buscar el usuario.' }, { status: 500 })
  }

  try {
    await auth.updateUser(usuario.uid, { password: contrasena })
  } catch (err) {
    if (codigoError(err) === 'auth/invalid-password') {
      return NextResponse.json(
        { error: 'La contraseña no es válida para Firebase (mínimo 6 caracteres).' },
        { status: 400 },
      )
    }
    // Fallo inesperado: se loguea el error real en el servidor (sin filtrarlo al cliente).
    console.error('Error al actualizar la contraseña:', err)
    return NextResponse.json(
      { error: 'No se pudo actualizar la contraseña.' },
      { status: 500 },
    )
  }

  // ── Auditoría: quién reseteó a quién y cuándo. NUNCA la contraseña. ──
  // Best-effort: el cambio ya ocurrió; un fallo del log no lo revierte ni
  // debe devolver error al usuario, pero se reporta en el servidor.
  try {
    await db.collection('auditoria').add({
      accion: 'reset_password',
      actor_uid: uidLlamante,
      objetivo_uid: usuario.uid,
      objetivo_email: email,
      timestamp: FieldValue.serverTimestamp(),
    })
  } catch (err) {
    console.error('No se pudo registrar la auditoría del reset de contraseña:', err)
  }

  return NextResponse.json({ ok: true, email })
}
