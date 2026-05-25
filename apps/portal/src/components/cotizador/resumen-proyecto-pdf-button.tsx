'use client'

import dynamic from 'next/dynamic'
import { FilePdf } from '@phosphor-icons/react'
import { ResumenProyectoPDF } from './resumen-proyecto-pdf'
import type { VersionResumenPDF, InfoResumenPDF } from './resumen-proyecto-pdf'

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
  info: InfoResumenPDF
  versiones: VersionResumenPDF[]
}

export function ResumenProyectoPDFButton({ info, versiones }: Props) {
  const nombreArchivo = `Resumen_${info.proyectoNombre.replace(/\s+/g, '_')}_${info.clienteNombre.replace(/\s+/g, '_')}.pdf`

  return (
    <PDFDownloadLink
      document={<ResumenProyectoPDF info={info} versiones={versiones} />}
      fileName={nombreArchivo}
    >
      {({ loading }) =>
        loading ? (
          <BtnCargando />
        ) : (
          <button className="tactil flex items-center gap-2 rounded-lg bg-caoba-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-caoba-700">
            <FilePdf size={16} weight="fill" />
            Descargar resumen PDF
          </button>
        )
      }
    </PDFDownloadLink>
  )
}
