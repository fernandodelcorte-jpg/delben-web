'use client'

import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import { formatCOP } from '@/lib/datos-demo'
import type { ItemPDF, HerrajePDF, InfoPDF } from '@/lib/pdf-helpers'

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
  logo: {
    width: 120,
    height: 40,
    objectFit: 'contain',
  },
  marca: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    color: '#1c1917',
  },
  marcaSub: {
    fontSize: 7.5,
    color: '#a8a29e',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1c1917',
    marginBottom: 3,
  },
  docSub: {
    fontSize: 7.5,
    color: '#78716c',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 28,
  },
  infoBloque: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#a8a29e',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValor: {
    fontSize: 9.5,
    color: '#1c1917',
    fontFamily: 'Helvetica-Bold',
  },
  infoSub: {
    fontSize: 8,
    color: '#78716c',
    marginTop: 1,
  },
  seccionTitulo: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#a8a29e',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tabla: {
    marginBottom: 24,
  },
  tablaHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f4',
    borderRadius: 4,
    padding: '6 8',
    marginBottom: 2,
  },
  thNombre: { flex: 3, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#78716c' },
  thConfig: { flex: 2.5, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#78716c' },
  thQty: { width: 40, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#78716c', textAlign: 'right' },
  tablaFila: {
    flexDirection: 'row',
    padding: '7 8',
    borderBottom: '0.5 solid #f5f5f4',
    alignItems: 'flex-start',
  },
  tdNombre: { flex: 3 },
  tdNombreTexto: { fontSize: 8.5, color: '#1c1917', fontFamily: 'Helvetica-Bold', marginBottom: 1.5 },
  tdCodigo: { fontSize: 7, color: '#a8a29e' },
  tdConfig: { flex: 2.5 },
  tdConfigTexto: { fontSize: 7.5, color: '#57534e', lineHeight: 1.5 },
  tdQty: { width: 40, fontSize: 8.5, color: '#1c1917', textAlign: 'right', paddingTop: 1 },
  herrajesFila: {
    flexDirection: 'row',
    padding: '4 8 4 20',
    borderBottom: '0.5 solid #f5f5f4',
    backgroundColor: '#fafaf9',
    alignItems: 'center',
  },
  herrajeNombre: { flex: 5, fontSize: 7.5, color: '#78716c' },
  herrajeQty: { width: 40, fontSize: 7.5, color: '#78716c', textAlign: 'right' },
  totalesBloque: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  totalesInner: {
    width: 200,
  },
  totalFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalLabel: { fontSize: 8, color: '#78716c' },
  totalValor: { fontSize: 8, color: '#1c1917' },
  totalFinalFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderTop: '1 solid #e7e5e4',
    marginTop: 4,
  },
  totalFinalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1c1917' },
  totalFinalValor: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1c1917' },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 48,
    right: 48,
    borderTop: '0.5 solid #e7e5e4',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerTexto: { fontSize: 7, color: '#a8a29e' },
  observaciones: {
    marginTop: 4,
    fontSize: 7.5,
    color: '#78716c',
    fontStyle: 'italic',
  },
})

type Props = {
  info: InfoPDF
  items: ItemPDF[]
  herrajesSueltos?: HerrajePDF[]
}

export function CotizacionPDF({ info, items, herrajesSueltos = [] }: Props) {
  const subtotalSinIva = items.reduce((s, i) => s + i.precioSinIva * i.cantidad, 0)
  const ivaTotal = items.reduce((s, i) => s + i.ivaMonto, 0)
  const totalModulos = items.reduce((s, i) => s + i.precioSubtotal, 0)
  const totalHerrajesAsoc = items.reduce(
    (s, i) => s + i.herrajes.reduce((hs, h) => hs + h.precioSubtotal, 0),
    0,
  )
  const totalHerrajesSueltos = herrajesSueltos.reduce((s, h) => s + h.precioSubtotal, 0)
  const total = totalModulos + totalHerrajesAsoc + totalHerrajesSueltos

  const fecha = info.fecha.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            {info.logoDistribuidorUrl ? (
              <Image src={info.logoDistribuidorUrl} style={s.logo} />
            ) : (
              <>
                <Text style={s.marca}>DELBEN</Text>
                <Text style={s.marcaSub}>Carpintería de alta calidad · Desde 1979</Text>
              </>
            )}
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>Cotización</Text>
            <Text style={s.docSub}>{fecha}</Text>
            <Text style={[s.docSub, { marginTop: 2 }]}>
              Modalidad: {info.modalidad === 'desarmado' ? 'Desarmado' : 'Tradicional'}
            </Text>
            {info.categoriaNombre ? (
              <Text style={[s.docSub, { marginTop: 2 }]}>{info.categoriaNombre}</Text>
            ) : null}
          </View>
        </View>

        {/* Info cliente / proyecto */}
        <View style={s.infoGrid}>
          <View style={s.infoBloque}>
            <Text style={s.infoLabel}>Cliente</Text>
            <Text style={s.infoValor}>{info.clienteNombre}</Text>
            {info.clienteDireccion ? (
              <Text style={s.infoSub}>{info.clienteDireccion}</Text>
            ) : null}
          </View>
          <View style={s.infoBloque}>
            <Text style={s.infoLabel}>Proyecto</Text>
            <Text style={s.infoValor}>{info.proyectoNombre}</Text>
          </View>
          <View style={s.infoBloque}>
            <Text style={s.infoLabel}>Moneda</Text>
            <Text style={s.infoValor}>COP — Pesos colombianos</Text>
            <Text style={s.infoSub}>IVA incluido en precio final</Text>
          </View>
        </View>

        {/* Tabla de módulos */}
        {items.length > 0 && (
          <>
            <Text style={s.seccionTitulo}>Módulos</Text>
            <View style={s.tabla}>
              <View style={s.tablaHeader}>
                <Text style={s.thNombre}>Módulo</Text>
                <Text style={s.thConfig}>Configuración</Text>
                <Text style={s.thQty}>Cant</Text>
              </View>
              {items.map((item, i) => (
                <View key={i}>
                  <View style={s.tablaFila}>
                    <View style={s.tdNombre}>
                      <Text style={s.tdNombreTexto}>{item.nombre}</Text>
                      {item.codigoExcel ? (
                        <Text style={s.tdCodigo}>{item.codigoExcel}</Text>
                      ) : null}
                      {item.observaciones ? (
                        <Text style={s.observaciones}>{item.observaciones}</Text>
                      ) : null}
                    </View>
                    <View style={s.tdConfig}>
                      <Text style={s.tdConfigTexto}>{item.configLinea}</Text>
                    </View>
                    <Text style={s.tdQty}>{item.cantidad}</Text>
                  </View>
                  {item.herrajes.map((h, j) => (
                    <View key={j} style={s.herrajesFila}>
                      <Text style={s.herrajeNombre}>↳ {h.nombre}</Text>
                      <Text style={s.herrajeQty}>×{h.cantidad}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Herrajes sueltos */}
        {herrajesSueltos.length > 0 && (
          <>
            <Text style={s.seccionTitulo}>Herrajes</Text>
            <View style={s.tabla}>
              <View style={s.tablaHeader}>
                <Text style={[s.thNombre, { flex: 5 }]}>Herraje</Text>
                <Text style={s.thQty}>Cant</Text>
              </View>
              {herrajesSueltos.map((h, i) => (
                <View key={i} style={s.tablaFila}>
                  <Text style={[s.tdNombreTexto, { flex: 5 }]}>{h.nombre}</Text>
                  <Text style={s.tdQty}>{h.cantidad}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Totales */}
        <View style={s.totalesBloque}>
          <View style={s.totalesInner}>
            <View style={s.totalFila}>
              <Text style={s.totalLabel}>Subtotal sin IVA</Text>
              <Text style={s.totalValor}>{formatCOP(subtotalSinIva)}</Text>
            </View>
            <View style={s.totalFila}>
              <Text style={s.totalLabel}>IVA 19%</Text>
              <Text style={s.totalValor}>{formatCOP(ivaTotal)}</Text>
            </View>
            <View style={s.totalFinalFila}>
              <Text style={s.totalFinalLabel}>Total</Text>
              <Text style={s.totalFinalValor}>{formatCOP(total)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerTexto}>
            Cotización generada por Plataforma Delben · Precios en COP con IVA
          </Text>
          <Text
            style={s.footerTexto}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
