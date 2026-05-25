'use client'

import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import { formatCOP } from '@/lib/datos-demo'

export type VersionResumenPDF = {
  espacioNombre: string
  version: number
  descripcion: string
  total: number
  modalidad: 'desarmado' | 'tradicional'
}

export type InfoResumenPDF = {
  proyectoNombre: string
  clienteNombre: string
  clienteCiudad?: string
  fecha: Date
  logoDistribuidorUrl?: string | null
  logoDelbenUrl?: string | null
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    padding: 48,
    fontSize: 9,
    color: '#1c1917',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingBottom: 20,
    borderBottom: '1 solid #e7e5e4',
  },
  logo: { width: 120, height: 40, objectFit: 'contain' },
  logoDelben: { width: 70, height: 24, objectFit: 'contain', marginTop: 8 },
  marca: { fontSize: 18, fontFamily: 'Helvetica-Bold', letterSpacing: 1, color: '#1c1917' },
  headerRight: { alignItems: 'flex-end' },
  docTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1c1917', marginBottom: 3 },
  docSub: { fontSize: 7.5, color: '#78716c' },
  infoGrid: { flexDirection: 'row', gap: 24, marginBottom: 28 },
  infoBloque: { flex: 1 },
  infoLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#a8a29e',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValor: { fontSize: 9.5, color: '#1c1917', fontFamily: 'Helvetica-Bold' },
  infoSub: { fontSize: 8, color: '#78716c', marginTop: 1 },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottom: '1 solid #1c1917',
    marginBottom: 2,
  },
  thText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#78716c',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tableRow: { flexDirection: 'row', paddingVertical: 7, borderBottom: '0.5 solid #f5f5f4' },
  tableRowLast: { borderBottom: 'none' },
  colEspacio: { flex: 1.3 },
  colVersion: { width: 32 },
  colDescripcion: { flex: 2 },
  colModalidad: { width: 68 },
  colTotal: { width: 84, alignItems: 'flex-end' },
  cell: { fontSize: 9, color: '#1c1917' },
  cellMuted: { fontSize: 9, color: '#78716c' },
  cellBold: { fontSize: 9, color: '#1c1917', fontFamily: 'Helvetica-Bold' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 10,
    borderTop: '1 solid #1c1917',
  },
  totalLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#78716c' },
  totalValor: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1c1917' },
  nota: {
    marginTop: 40,
    paddingTop: 16,
    borderTop: '0.5 solid #e7e5e4',
    fontSize: 7.5,
    color: '#a8a29e',
  },
})

type Props = { info: InfoResumenPDF; versiones: VersionResumenPDF[] }

export function ResumenProyectoPDF({ info, versiones }: Props) {
  const fecha = info.fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const total = versiones.reduce((s, v) => s + v.total, 0)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            {info.logoDistribuidorUrl ? (
              <Image src={info.logoDistribuidorUrl} style={s.logo} />
            ) : (
              <Text style={s.marca}>DISTRIBUIDORA</Text>
            )}
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>COTIZACIÓN DE PROYECTO</Text>
            <Text style={s.docSub}>{fecha}</Text>
            {info.logoDelbenUrl && (
              <Image src={info.logoDelbenUrl} style={s.logoDelben} />
            )}
          </View>
        </View>

        {/* Info */}
        <View style={s.infoGrid}>
          <View style={s.infoBloque}>
            <Text style={s.infoLabel}>Proyecto</Text>
            <Text style={s.infoValor}>{info.proyectoNombre}</Text>
          </View>
          <View style={s.infoBloque}>
            <Text style={s.infoLabel}>Cliente</Text>
            <Text style={s.infoValor}>{info.clienteNombre}</Text>
            {info.clienteCiudad && <Text style={s.infoSub}>{info.clienteCiudad}</Text>}
          </View>
        </View>

        {/* Tabla */}
        <View style={s.tableHeader}>
          <View style={s.colEspacio}><Text style={s.thText}>Espacio</Text></View>
          <View style={s.colVersion}><Text style={s.thText}>Ver.</Text></View>
          <View style={s.colDescripcion}><Text style={s.thText}>Descripción</Text></View>
          <View style={s.colModalidad}><Text style={s.thText}>Modalidad</Text></View>
          <View style={s.colTotal}><Text style={s.thText}>Total</Text></View>
        </View>

        {versiones.map((v, i) => (
          <View
            key={i}
            style={[s.tableRow, i === versiones.length - 1 ? s.tableRowLast : {}]}
          >
            <View style={s.colEspacio}><Text style={s.cell}>{v.espacioNombre}</Text></View>
            <View style={s.colVersion}><Text style={s.cellMuted}>v{v.version}</Text></View>
            <View style={s.colDescripcion}>
              <Text style={s.cell}>{v.descripcion || `Versión ${v.version}`}</Text>
            </View>
            <View style={s.colModalidad}>
              <Text style={s.cellMuted}>
                {v.modalidad === 'desarmado' ? 'Desarmado' : 'Tradicional'}
              </Text>
            </View>
            <View style={s.colTotal}><Text style={s.cellBold}>{formatCOP(v.total)}</Text></View>
          </View>
        ))}

        {/* Total */}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>
            Total · {versiones.length} versión{versiones.length !== 1 ? 'es' : ''}
          </Text>
          <Text style={s.totalValor}>{formatCOP(total)}</Text>
        </View>

        <Text style={s.nota}>
          Este documento presenta un resumen de las versiones seleccionadas. Los valores corresponden al total de cada cotización.
        </Text>
      </Page>
    </Document>
  )
}
