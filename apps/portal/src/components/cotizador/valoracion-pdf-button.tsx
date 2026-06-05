'use client'

import dynamic from 'next/dynamic'
import { FileText } from '@phosphor-icons/react'
import { OrdenCompraPDF } from './orden-compra-pdf'
import type { ItemPDF, HerrajePDF, EspecialPDF, InfoPDF } from '@/lib/pdf-helpers'

// PDF de la VALORACIÓN (documento interno de Delben para facturación). Reusa el
// layout de la orden de compra: costo Delben únicamente, sin precio de venta y sin
// IVA (regla de oro #2 — facturación nunca ve la venta al cliente final).

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
  { ssr: false, loading: () => <BtnCargando /> },
)

function BtnCargando() {
  return (
    <button
      disabled
      className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-400"
    >
      <FileText size={16} />
      Preparando PDF…
    </button>
  )
}

type Props = {
  info: InfoPDF
  items: ItemPDF[]
  herrajesSueltos: HerrajePDF[]
  especiales?: EspecialPDF[]
  distribuidorNombre?: string
}

export function ValoracionPDFButton({ info, items, herrajesSueltos, especiales = [], distribuidorNombre }: Props) {
  const nombreArchivo = `Valoracion_${info.clienteNombre.replace(/\s+/g, '_')}_${info.proyectoNombre.replace(/\s+/g, '_')}.pdf`

  return (
    <PDFDownloadLink
      document={
        <OrdenCompraPDF
          info={info}
          items={items}
          herrajesSueltos={herrajesSueltos}
          especiales={especiales}
          distribuidorNombre={distribuidorNombre}
          titulo="Valoración"
        />
      }
      fileName={nombreArchivo}
    >
      {({ loading }) =>
        loading ? (
          <BtnCargando />
        ) : (
          <button className="tactil flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition-all hover:border-stone-400 hover:bg-stone-50">
            <FileText size={16} />
            Valoración PDF
          </button>
        )
      }
    </PDFDownloadLink>
  )
}
