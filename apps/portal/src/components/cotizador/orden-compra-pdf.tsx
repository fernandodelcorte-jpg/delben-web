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
  headerLeft: {
    flexDirection: 'column',
    gap: 6,
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: 'contain',
  },
  logoDelben: {
    width: 90,
    height: 30,
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
  separador: {
    fontSize: 7,
    color: '#d4d0cc',
    marginTop: 6,
    marginBottom: 2,
  },
  proveedorLabel: {
    fontSize: 7,
    color: '#a8a29e',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
  badge: {
    marginTop: 4,
    backgroundColor: '#1c1917',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeTexto: {
    fontSize: 7,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
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
  thNombre: { flex: 2.5, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#78716c' },
  thConfig: { flex: 2, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#78716c' },
  thQty: { width: 30, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#78716c', textAlign: 'right' },
  thCosto: { width: 70, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#78716c', textAlign: 'right' },
  thSubtotal: { width: 75, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#78716c', textAlign: 'right' },
  tablaFila: {
    flexDirection: 'row',
    padding: '7 8',
    borderBottom: '0.5 solid #f5f5f4',
    alignItems: 'flex-start',
  },
  tdNombre: { flex: 2.5 },
  tdNombreTexto: { fontSize: 8.5, color: '#1c1917', fontFamily: 'Helvetica-Bold', marginBottom: 1.5 },
  tdCodigo: { fontSize: 7, color: '#a8a29e' },
  tdConfig: { flex: 2 },
  tdConfigTexto: { fontSize: 7.5, color: '#57534e', lineHeight: 1.5 },
  tdQty: { width: 30, fontSize: 8.5, color: '#1c1917', textAlign: 'right', paddingTop: 1 },
  tdCosto: { width: 70, fontSize: 8.5, color: '#1c1917', textAlign: 'right', paddingTop: 1 },
  tdSubtotal: { width: 75, fontSize: 8.5, color: '#1c1917', fontFamily: 'Helvetica-Bold', textAlign: 'right', paddingTop: 1 },
  herrajesFila: {
    flexDirection: 'row',
    padding: '4 8 4 20',
    borderBottom: '0.5 solid #f5f5f4',
    backgroundColor: '#fafaf9',
    alignItems: 'center',
  },
  herrajeNombre: { flex: 4.5, fontSize: 7.5, color: '#78716c' },
  herrajeQty: { width: 30, fontSize: 7.5, color: '#78716c', textAlign: 'right' },
  herrajeCosto: { width: 75, fontSize: 7.5, color: '#78716c', textAlign: 'right' },
  totalesBloque: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  totalesInner: {
    width: 220,
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
    paddingVertical: 6,
    borderTop: '1.5 solid #1c1917',
    marginTop: 4,
  },
  totalFinalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1c1917' },
  totalFinalValor: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1c1917' },
  notaConfidencial: {
    marginTop: 20,
    padding: '8 10',
    backgroundColor: '#fafaf9',
    borderRadius: 4,
    border: '0.5 solid #e7e5e4',
  },
  notaTexto: {
    fontSize: 7.5,
    color: '#78716c',
    lineHeight: 1.5,
  },
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
  herrajesSueltos: HerrajePDF[]
  distribuidorNombre?: string
}

export function OrdenCompraPDF({ info, items, herrajesSueltos, distribuidorNombre }: Props) {
  const fecha = info.fecha.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const totalModulos = items.reduce((s, i) => s + i.costoSubtotal, 0)
  const totalHerrajesAsociados = items.reduce(
    (s, i) => s + i.herrajes.reduce((hs, h) => hs + h.costoSubtotal, 0),
    0,
  )
  const totalHerrajesSueltos = herrajesSueltos.reduce((s, h) => s + h.costoSubtotal, 0)
  const totalCosto = totalModulos + totalHerrajesAsociados + totalHerrajesSueltos

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          {/* Izquierda: logo distribuidor + separador + logo/texto Delben */}
          <View style={s.headerLeft}>
            {info.logoDistribuidorUrl ? (
              <Image src={info.logoDistribuidorUrl} style={s.logo} />
            ) : (
              <Text style={s.marca}>{distribuidorNombre ?? 'DISTRIBUIDOR'}</Text>
            )}
            <Text style={s.separador}>──────────────</Text>
            <Text style={s.proveedorLabel}>Proveedor</Text>
            {info.logoDelbenUrl ? (
              <Image src={info.logoDelbenUrl} style={s.logoDelben} />
            ) : (
              <Text style={[s.marca, { fontSize: 13, marginTop: 2 }]}>DELBEN</Text>
            )}
          </View>

          {/* Derecha: título + fecha + badge */}
          <View style={s.headerRight}>
            <Text style={s.docTitle}>Orden de Compra</Text>
            <Text style={s.docSub}>{fecha}</Text>
            <Text style={[s.docSub, { marginTop: 2 }]}>
              Modalidad: {info.modalidad === 'desarmado' ? 'Desarmado' : 'Tradicional'}
            </Text>
            <View style={s.badge}>
              <Text style={s.badgeTexto}>CONFIDENCIAL — USO INTERNO</Text>
            </View>
          </View>
        </View>

        {/* Info distribuidor / proyecto */}
        <View style={s.infoGrid}>
          {distribuidorNombre && !info.logoDistribuidorUrl && (
            <View style={s.infoBloque}>
              <Text style={s.infoLabel}>Distribuidor</Text>
              <Text style={s.infoValor}>{distribuidorNombre}</Text>
            </View>
          )}
          <View style={s.infoBloque}>
            <Text style={s.infoLabel}>Cliente final</Text>
            <Text style={s.infoValor}>{info.clienteNombre}</Text>
          </View>
          <View style={s.infoBloque}>
            <Text style={s.infoLabel}>Proyecto</Text>
            <Text style={s.infoValor}>{info.proyectoNombre}</Text>
          </View>
          <View style={s.infoBloque}>
            <Text style={s.infoLabel}>Moneda</Text>
            <Text style={s.infoValor}>COP — Sin IVA</Text>
            <Text style={s.infoSub}>Costo de fábrica al distribuidor</Text>
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
                <Text style={s.thCosto}>Costo u.</Text>
                <Text style={s.thSubtotal}>Subtotal</Text>
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
                    <Text style={s.tdCosto}>{formatCOP(item.costoUnitario)}</Text>
                    <Text style={s.tdSubtotal}>{formatCOP(item.costoSubtotal)}</Text>
                  </View>

                  {item.herrajes.map((h, j) => (
                    <View key={j} style={s.herrajesFila}>
                      <Text style={s.herrajeNombre}>↳ {h.nombre}</Text>
                      <Text style={s.herrajeQty}>×{h.cantidad}</Text>
                      <Text style={s.herrajeCosto}>{formatCOP(h.costoSubtotal)}</Text>
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
            <Text style={s.seccionTitulo}>Herrajes sueltos</Text>
            <View style={s.tabla}>
              <View style={s.tablaHeader}>
                <Text style={[s.thNombre, { flex: 4 }]}>Herraje</Text>
                <Text style={s.thQty}>Cant</Text>
                <Text style={s.thSubtotal}>Costo</Text>
              </View>
              {herrajesSueltos.map((h, i) => (
                <View key={i} style={s.tablaFila}>
                  <Text style={[s.tdNombreTexto, { flex: 4 }]}>{h.nombre}</Text>
                  <Text style={s.tdQty}>{h.cantidad}</Text>
                  <Text style={s.tdSubtotal}>{formatCOP(h.costoSubtotal)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Totales */}
        <View style={s.totalesBloque}>
          <View style={s.totalesInner}>
            {totalHerrajesAsociados > 0 && (
              <View style={s.totalFila}>
                <Text style={s.totalLabel}>Módulos</Text>
                <Text style={s.totalValor}>{formatCOP(totalModulos)}</Text>
              </View>
            )}
            {totalHerrajesAsociados > 0 && (
              <View style={s.totalFila}>
                <Text style={s.totalLabel}>Herrajes de módulos</Text>
                <Text style={s.totalValor}>{formatCOP(totalHerrajesAsociados)}</Text>
              </View>
            )}
            {totalHerrajesSueltos > 0 && (
              <View style={s.totalFila}>
                <Text style={s.totalLabel}>Herrajes sueltos</Text>
                <Text style={s.totalValor}>{formatCOP(totalHerrajesSueltos)}</Text>
              </View>
            )}
            <View style={s.totalFinalFila}>
              <Text style={s.totalFinalLabel}>Total orden de compra</Text>
              <Text style={s.totalFinalValor}>{formatCOP(totalCosto)}</Text>
            </View>
          </View>
        </View>

        {/* Nota confidencial */}
        <View style={s.notaConfidencial}>
          <Text style={s.notaTexto}>
            Documento de uso interno. Los valores corresponden al costo de fábrica Delben al
            distribuidor, sin IVA. No compartir con el cliente final.
          </Text>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerTexto}>
            Orden de compra · Plataforma Delben · Uso interno
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
