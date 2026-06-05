'use client'

import { useState } from 'react'
import { MicrosoftExcelLogo } from '@phosphor-icons/react'
import type { ItemPDF, HerrajePDF, EspecialPDF, InfoPDF } from '@/lib/pdf-helpers'

// Export de la VALORACIÓN a Excel (.xlsx). Documento interno de Delben para facturación:
// SOLO costo Delben — nunca precio de venta al cliente ni IVA (regla de oro #2). Aunque
// los tipos *PDF traen también campos de venta, aquí se escriben EXCLUSIVAMENTE los de
// costo. exceljs se importa de forma diferida (solo al hacer clic) para no inflar el bundle.

type Props = {
  info: InfoPDF
  items: ItemPDF[]
  herrajesSueltos: HerrajePDF[]
  especiales?: EspecialPDF[]
  distribuidorNombre?: string
  numeroOp?: string
}

export function ValoracionExcelButton({
  info,
  items,
  herrajesSueltos,
  especiales = [],
  distribuidorNombre,
  numeroOp,
}: Props) {
  const [generando, setGenerando] = useState(false)

  async function handleDescargar() {
    setGenerando(true)
    try {
      // Interop CJS/ESM: según el bundler, exceljs llega en .default o en el namespace.
      const mod = await import('exceljs')
      const ExcelJS = mod.default ?? mod
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Valoración')

      const numFmt = info.moneda === 'USD' ? '#,##0.00' : '#,##0'
      const fecha = info.fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })

      // ── Bloque de metadatos ──────────────────────────────────────────────────
      const meta: [string, string][] = [
        ['Documento', 'Valoración (costo Delben — uso interno)'],
        ['Proyecto', info.proyectoNombre],
        ['Cliente final', info.clienteNombre],
        ['Distribuidor', distribuidorNombre ?? ''],
        ['N.º OP', numeroOp ?? ''],
        ['Fecha', fecha],
        ['Modalidad', info.modalidad === 'desarmado' ? 'Desarmado' : 'Tradicional'],
        ['Moneda', info.moneda],
      ]
      for (const [k, v] of meta) {
        const row = ws.addRow([k, v])
        row.getCell(1).font = { bold: true, color: { argb: 'FF78716C' } }
      }
      ws.addRow([])

      // ── Encabezado de la tabla ───────────────────────────────────────────────
      const headerRow = ws.addRow(['Ítem', 'Código', 'Configuración', 'Cant.', 'Costo unit.', 'Costo subtotal'])
      headerRow.font = { bold: true }
      headerRow.eachCell((c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F4' } }
      })

      let total = 0
      const filaCosto = (
        nombre: string,
        codigo: string,
        config: string,
        cantidad: number,
        costoUnit: number,
        costoSubtotal: number,
        opts?: { sub?: boolean },
      ) => {
        const row = ws.addRow([nombre, codigo, config, cantidad, costoUnit, costoSubtotal])
        row.getCell(5).numFmt = numFmt
        row.getCell(6).numFmt = numFmt
        if (opts?.sub) row.getCell(1).font = { color: { argb: 'FFA8A29E' } }
        total += costoSubtotal
      }

      // Módulos (+ sus herrajes asociados como sub-filas)
      for (const it of items) {
        filaCosto(it.nombre, it.codigoExcel, it.configLinea, it.cantidad, it.costoUnitario, it.costoSubtotal)
        for (const h of it.herrajes) {
          const unit = h.cantidad ? h.costoSubtotal / h.cantidad : h.costoSubtotal
          filaCosto(`   ↳ ${h.nombre}`, '', 'Herraje asociado', h.cantidad, unit, h.costoSubtotal, { sub: true })
        }
      }
      // Herrajes sueltos
      for (const h of herrajesSueltos) {
        const unit = h.cantidad ? h.costoSubtotal / h.cantidad : h.costoSubtotal
        filaCosto(h.nombre, '', 'Herraje suelto', h.cantidad, unit, h.costoSubtotal)
      }
      // Muebles especiales
      for (const e of especiales) {
        const unit = e.cantidad ? e.costoSubtotal / e.cantidad : e.costoSubtotal
        filaCosto(e.nombre, '', e.configLinea || 'Mueble especial', e.cantidad, unit, e.costoSubtotal)
      }

      // ── Total ────────────────────────────────────────────────────────────────
      ws.addRow([])
      const totalRow = ws.addRow(['', '', '', '', 'TOTAL COSTO DELBEN', total])
      totalRow.getCell(5).font = { bold: true }
      totalRow.getCell(6).font = { bold: true }
      totalRow.getCell(6).numFmt = numFmt

      // Anchos de columna
      ws.columns = [
        { width: 34 },
        { width: 14 },
        { width: 30 },
        { width: 8 },
        { width: 16 },
        { width: 16 },
      ]

      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Valoracion_${info.clienteNombre.replace(/\s+/g, '_')}_${info.proyectoNombre.replace(/\s+/g, '_')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <button
      onClick={handleDescargar}
      disabled={generando}
      className="tactil flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition-all hover:border-stone-400 hover:bg-stone-50 disabled:opacity-50"
    >
      <MicrosoftExcelLogo size={16} />
      {generando ? 'Generando…' : 'Valoración Excel'}
    </button>
  )
}
