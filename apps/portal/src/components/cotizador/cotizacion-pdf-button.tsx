'use client'

import dynamic from 'next/dynamic'
import { FilePdf } from '@phosphor-icons/react'
import { CotizacionPDF } from './cotizacion-pdf'
import type { ItemPDF, HerrajePDF, InfoPDF } from '@/lib/pdf-helpers'

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
      <FilePdf size={16} />
      Preparando PDF…
    </button>
  )
}

type Props = {
  info: InfoPDF
  items: ItemPDF[]
  herrajesSueltos?: HerrajePDF[]
}

export function CotizacionPDFButton({ info, items, herrajesSueltos = [] }: Props) {
  const nombreArchivo = `Cotizacion_${info.clienteNombre.replace(/\s+/g, '_')}_${info.proyectoNombre.replace(/\s+/g, '_')}.pdf`

  return (
    <PDFDownloadLink
      document={<CotizacionPDF info={info} items={items} herrajesSueltos={herrajesSueltos} />}
      fileName={nombreArchivo}
    >
      {({ loading }) =>
        loading ? (
          <BtnCargando />
        ) : (
          <button className="tactil flex items-center gap-2 rounded-lg bg-caoba-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-caoba-700">
            <FilePdf size={16} weight="fill" />
            Cotización PDF
          </button>
        )
      }
    </PDFDownloadLink>
  )
}
