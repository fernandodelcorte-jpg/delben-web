/**
 * Canal PÚBLICO de solo lectura para la sección «Nuestra red» de la web.
 *
 * Es el ÚNICO canal por el que sale información de distribuidores hacia el exterior.
 * Usa el Admin SDK (privilegios de servidor) y devuelve EXCLUSIVAMENTE lo público:
 * nombre, logo y, por sede visible, ciudad y país. Nada de descuentos, servicios,
 * universo, sigla ni IDs internos. Las Security Rules de distribuidores NO se abren
 * a lectura pública: este endpoint filtra en el servidor antes de responder.
 *
 * Visible = distribuidor con activo === true Y mostrar_en_web === true Y con logo_url;
 * sus sedes con activo === true Y mostrar_en_web === true.
 */
import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import type { DistribuidorDoc, SedeDoc } from '@/lib/firebase/tipos-firestore'

type SedePublica = { ciudad: string; pais: string }
type DistribuidorPublico = { nombre: string; logo_url: string; sedes: SedePublica[] }

export async function GET() {
  try {
    const db = adminDb()

    // Dos filtros de igualdad: no requieren índice compuesto. `== true` solo casa
    // documentos donde el campo existe y es true (los que no lo tienen = ocultos).
    const distSnap = await db
      .collection('distribuidores')
      .where('activo', '==', true)
      .where('mostrar_en_web', '==', true)
      .get()

    const distribuidores: DistribuidorPublico[] = []

    for (const docSnap of distSnap.docs) {
      const d = docSnap.data() as DistribuidorDoc
      // Sin logo no se publica: la sección es de logos.
      if (!d.logo_url) continue

      const sedesSnap = await docSnap.ref
        .collection('sedes')
        .where('activo', '==', true)
        .where('mostrar_en_web', '==', true)
        .get()

      const sedes: SedePublica[] = sedesSnap.docs.map((s) => {
        const sd = s.data() as SedeDoc
        return { ciudad: sd.ciudad, pais: sd.pais }
      })

      distribuidores.push({ nombre: d.nombre, logo_url: d.logo_url, sedes })
    }

    // Orden estable por nombre (no expone orden interno ni fechas).
    distribuidores.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

    return NextResponse.json(
      { distribuidores },
      {
        headers: {
          // Contenido público que cambia poco: cacheable en CDN/navegador.
          'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
          // Lo consume la web institucional desde otro origen (puerto distinto).
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  } catch (e) {
    console.error('Error en /api/red:', e)
    return NextResponse.json({ error: 'No disponible' }, { status: 500 })
  }
}
