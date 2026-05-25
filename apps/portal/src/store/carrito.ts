'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { calcularItem } from '@delben/core'
import type { ResultadoCalculo, Campana as CampanaMotor } from '@delben/core'
import {
  DISTRIBUIDOR_DEMO,
  SERVICIOS_DELBEN_DEMO,
  UNIVERSO_DEMO,
} from '@/lib/datos-demo'
import type { Accesorio, Cotizacion, Distribuidor, Modulo, Subcategoria, Valoracion } from '@/lib/firebase/tipos-firestore'
import { getUniversoParaModalidad } from '@/lib/firebase/tipos-firestore'
import {
  guardarCotizacion as _guardarCotizacion,
  actualizarCotizacion as _actualizarCotizacion,
} from '@/lib/firestore/cotizaciones'
import {
  guardarValoracion as _guardarValoracion,
  actualizarValoracion as _actualizarValoracion,
} from '@/lib/firestore/valoraciones'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ConfiguracionItem = {
  tipoEstructuraId: string
  tipoEstructuraNombre: string
  tipoFachadaId: string
  tipoFachadaNombre: string
  subcategoriaId: string
  subcategoriaNombre: string
  acabadoId: string
  acabadoNombre: string
  acabadoEstructura: string | null
  colorVidrio: string | null
  colorMetal: string | null
  altura: number
  profundidad: number
  cantidad: number
  observaciones: string
}

export type HerrajeAsociado = {
  accesorio: Accesorio
  cantidad: number
  resultado: ResultadoCalculo
}

export type ItemCarrito = {
  id: string
  modulo: Modulo
  config: ConfiguracionItem
  subcategoria: Subcategoria
  resultado: ResultadoCalculo
  herrajesAsociados: HerrajeAsociado[]
}

export type ItemHerrajeCarrito = {
  id: string
  accesorio: Accesorio
  cantidad: number
  resultado: ResultadoCalculo
}

export type HerrajeEspecial = {
  accesorioId: string
  nombre: string
  codigo: string
  cantidad: number
}

export type ItemEspecial = {
  id: string
  nombre: string
  tipoEstructuraNombre: string
  tipoFachadaNombre: string
  acabadoNombre: string
  acabadoEstructura: string | null
  colorVidrio: string | null
  ancho: number | null
  alto: number
  profundidad: number
  cantidad: number
  precioDelbenUnitario: number
  precioClienteUnitario: number
  observaciones: string
  herrajes: HerrajeEspecial[]
  moduloReferenciaId?: string
  moduloReferenciaNombre?: string
}

export type CotizacionInfo = {
  clienteNombre: string
  clienteDireccion?: string
  proyectoNombre: string
  modalidad: 'tradicional' | 'desarmado'
  fecha: Date
  categoriaId: string
  categoriaNombre: string
  transporteFijo: number
  instalacionFija: number
  // Proyecto / versión (opcionales — cotizaciones sin proyecto no los tienen)
  proyectoId?: string
  espacioNombre?: string
  version?: number
}

type CategoriaCalculo = {
  id: string
  desc_base_pct: number
  desc_premium_pct: number
}

// ─── Estado ───────────────────────────────────────────────────────────────────

type CarritoState = {
  cotizacionInfo: CotizacionInfo | null
  distribuidorData: Distribuidor | null
  cotizacionGuardadaId: string | null
  valoracionGuardadaId: string | null
  items: ItemCarrito[]
  itemsHerraje: ItemHerrajeCarrito[]
  itemsEspeciales: ItemEspecial[]
  pantallaActiva: 'carrito' | 'buscador' | 'ficha'
  moduloPendiente: Modulo | null
  itemEditando: ItemCarrito | null
  campanasDisponibles: CampanaMotor[]
  tasaUsd: number

  setCampanas: (campanas: CampanaMotor[]) => void
  setTasaUsd: (tasa: number) => void
  iniciarCotizacion: (info: Omit<CotizacionInfo, 'fecha'>, distribuidor: Distribuidor | null) => void
  actualizarCostosProyecto: (transporteFijo: number, instalacionFija: number) => void
  abrirBuscador: () => void
  cerrarBuscador: () => void
  seleccionarModulo: (modulo: Modulo) => void
  cerrarFicha: () => void
  editarModulo: (item: ItemCarrito) => void
  cambiarCantidadItem: (id: string, delta: number) => void
  cambiarCantidadHerraje: (id: string, delta: number) => void
  agregarItem: (
    modulo: Modulo,
    config: ConfiguracionItem,
    subcategoria: Subcategoria,
    precioCop: number,
    categoriaCalculo: CategoriaCalculo,
    herrajesBorrador: { accesorio: Accesorio; cantidad: number }[],
  ) => void
  eliminarItem: (id: string) => void
  agregarHerraje: (accesorio: Accesorio, cantidad: number) => void
  eliminarHerraje: (id: string) => void
  agregarEspecial: (item: Omit<ItemEspecial, 'id'>) => void
  editarEspecial: (id: string, cambios: Omit<ItemEspecial, 'id'>) => void
  eliminarEspecial: (id: string) => void
  cambiarCantidadEspecial: (id: string, delta: number) => void
  guardar: (distribuidorId: string, userId: string) => Promise<string>
  guardarValoracion: (distribuidorId: string, distribuidorNombre: string, userId: string) => Promise<string>
  reabrirBorrador: (cotizacion: Cotizacion) => void
  reabrirValoracion: (valoracion: Valoracion) => void
  copiarBorrador: (cotizacion: Cotizacion) => void
  cargarBorrador: (payload: {
    cotizacionInfo: CotizacionInfo
    cotizacionGuardadaId: string | null
    distribuidorData: Distribuidor | null
    items: ItemCarrito[]
    itemsHerraje: ItemHerrajeCarrito[]
  }) => void
  limpiar: () => void
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function buildMotorParams(dist: Distribuidor | null, modalidad: 'desarmado' | 'tradicional') {
  if (!dist) {
    return {
      distribuidorMotor: DISTRIBUIDOR_DEMO,
      serviciosMotor: SERVICIOS_DELBEN_DEMO,
      universoMotor: UNIVERSO_DEMO,
      pais: 'Colombia',
    }
  }
  const u = getUniversoParaModalidad(dist.universo, modalidad)
  return {
    distribuidorMotor: { id: dist.id, descuento_muebles_pct: dist.descuento_muebles_pct, descuento_herrajes_pct: dist.descuento_herrajes_pct },
    serviciosMotor: { diseno: dist.servicios.diseno_pct, cotizacion: dist.servicios.cotizacion_pct, produccion: dist.servicios.produccion_pct, logistica: dist.servicios.logistica_pct, gestion_comercial: dist.servicios.gestion_comercial_pct },
    universoMotor: {
      transporte: (u.transporte_tipo ?? 'porcentual') === 'fijo' ? 0 : u.transporte_pct,
      instalacion: (u.instalacion_tipo ?? 'porcentual') === 'fijo' ? 0 : u.instalacion_pct,
      imprevistos: u.imprevistos_pct,
      utilidad: u.utilidad_pct,
      iva: u.iva_pct,
    },
    pais: dist.pais,
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCarrito = create<CarritoState>()(
  persist(
    (set, get) => ({
  cotizacionInfo: null,
  distribuidorData: null,
  cotizacionGuardadaId: null,
  valoracionGuardadaId: null,
  items: [],
  itemsHerraje: [],
  itemsEspeciales: [],
  pantallaActiva: 'carrito',
  moduloPendiente: null,
  itemEditando: null,
  campanasDisponibles: [],
  tasaUsd: 4000,

  setCampanas: (campanas) => set({ campanasDisponibles: campanas }),
  setTasaUsd: (tasa) => set({ tasaUsd: tasa }),

  iniciarCotizacion: (info, distribuidor) =>
    set({
      cotizacionInfo: { ...info, fecha: new Date() },
      distribuidorData: distribuidor,
      cotizacionGuardadaId: null,
      valoracionGuardadaId: null,
      items: [],
      itemsHerraje: [],
      itemsEspeciales: [],
      pantallaActiva: 'carrito',
    }),

  actualizarCostosProyecto: (transporteFijo, instalacionFija) =>
    set((state) => ({
      cotizacionInfo: state.cotizacionInfo
        ? { ...state.cotizacionInfo, transporteFijo, instalacionFija }
        : null,
    })),

  abrirBuscador: () => set({ pantallaActiva: 'buscador' }),
  cerrarBuscador: () => set({ pantallaActiva: 'carrito' }),

  seleccionarModulo: (modulo) =>
    set({ moduloPendiente: modulo, pantallaActiva: 'ficha' }),

  cerrarFicha: () =>
    set({ pantallaActiva: 'carrito', moduloPendiente: null, itemEditando: null }),

  editarModulo: (item) =>
    set({ itemEditando: item, moduloPendiente: item.modulo, pantallaActiva: 'ficha' }),

  cambiarCantidadItem: (id, delta) =>
    set((state) => ({
      items: state.items.map((i) => {
        if (i.id !== id) return i
        const nuevaCantidad = Math.max(1, i.config.cantidad + delta)
        return {
          ...i,
          config: { ...i.config, cantidad: nuevaCantidad },
          resultado: {
            ...i.resultado,
            cantidad: nuevaCantidad,
            subtotal_linea: i.resultado.precio_final_unitario * nuevaCantidad,
          },
        }
      }),
    })),

  cambiarCantidadHerraje: (id, delta) =>
    set((state) => ({
      itemsHerraje: state.itemsHerraje.map((i) => {
        if (i.id !== id) return i
        const nuevaCantidad = Math.max(1, i.cantidad + delta)
        return {
          ...i,
          cantidad: nuevaCantidad,
          resultado: {
            ...i.resultado,
            cantidad: nuevaCantidad,
            subtotal_linea: i.resultado.precio_final_unitario * nuevaCantidad,
          },
        }
      }),
    })),

  agregarItem: (modulo, config, subcategoria, precioCop, categoriaCalculo, herrajesBorrador) => {
    const { cotizacionInfo, distribuidorData: dist, campanasDisponibles, tasaUsd, itemEditando } = get()
    if (!cotizacionInfo) return

    const { distribuidorMotor, serviciosMotor, universoMotor, pais } = buildMotorParams(dist, cotizacionInfo.modalidad)

    const motorBase = {
      modelo: cotizacionInfo.modalidad,
      distribuidor: distribuidorMotor,
      fecha_cotizacion: cotizacionInfo.fecha,
      campanas_disponibles: campanasDisponibles,
      servicios_delben: serviciosMotor,
      universo: universoMotor,
      pais_cliente_final: pais,
      tasa_usd: tasaUsd,
    }

    const resultado = calcularItem({
      precio_base_cop: precioCop,
      cantidad: config.cantidad,
      tipo_item: 'mueble',
      categoria: categoriaCalculo,
      linea_acabado: {
        id: subcategoria.id,
        tipo_ajuste: subcategoria.tipo_ajuste,
        ajuste_pct: subcategoria.ajuste_pct,
        es_premium: subcategoria.es_premium,
      },
      ...motorBase,
    })

    const herrajesAsociados: HerrajeAsociado[] = herrajesBorrador
      .map(({ accesorio, cantidad }) => {
        const precioCopH =
          cotizacionInfo.modalidad === 'tradicional'
            ? accesorio.precio_tradicional_cop
            : accesorio.precio_desarmado_cop
        if (!precioCopH) return null
        return {
          accesorio,
          cantidad,
          resultado: calcularItem({
            precio_base_cop: precioCopH,
            cantidad,
            tipo_item: 'herraje',
            categoria: { id: 'herraje', desc_base_pct: 0, desc_premium_pct: 0 },
            linea_acabado: { id: 'herraje', tipo_ajuste: 'ninguno', ajuste_pct: 0, es_premium: false },
            ...motorBase,
          }),
        }
      })
      .filter((h): h is HerrajeAsociado => h !== null)

    const nuevoItem = {
      id: itemEditando ? itemEditando.id : crypto.randomUUID(),
      modulo,
      config,
      subcategoria,
      resultado,
      herrajesAsociados,
    }

    set((state) => ({
      items: itemEditando
        ? state.items.map((i) => (i.id === itemEditando.id ? nuevoItem : i))
        : [...state.items, nuevoItem],
      pantallaActiva: 'carrito',
      moduloPendiente: null,
      itemEditando: null,
    }))
  },

  eliminarItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  agregarHerraje: (accesorio, cantidad) => {
    const { cotizacionInfo, distribuidorData: dist, campanasDisponibles, tasaUsd } = get()
    if (!cotizacionInfo) return

    const precioCop =
      cotizacionInfo.modalidad === 'tradicional'
        ? accesorio.precio_tradicional_cop
        : accesorio.precio_desarmado_cop

    if (!precioCop) return

    const { distribuidorMotor, serviciosMotor, universoMotor, pais } = buildMotorParams(dist, cotizacionInfo.modalidad)

    const resultado = calcularItem({
      precio_base_cop: precioCop,
      cantidad,
      tipo_item: 'herraje',
      modelo: cotizacionInfo.modalidad,
      distribuidor: distribuidorMotor,
      categoria: { id: 'herraje', desc_base_pct: 0, desc_premium_pct: 0 },
      linea_acabado: { id: 'herraje', tipo_ajuste: 'ninguno', ajuste_pct: 0, es_premium: false },
      fecha_cotizacion: cotizacionInfo.fecha,
      campanas_disponibles: campanasDisponibles,
      servicios_delben: serviciosMotor,
      universo: universoMotor,
      pais_cliente_final: pais,
      tasa_usd: tasaUsd,
    })

    set((state) => ({
      itemsHerraje: [
        ...state.itemsHerraje,
        { id: crypto.randomUUID(), accesorio, cantidad, resultado },
      ],
      pantallaActiva: 'carrito',
    }))
  },

  eliminarHerraje: (id) =>
    set((state) => ({ itemsHerraje: state.itemsHerraje.filter((i) => i.id !== id) })),

  agregarEspecial: (item) =>
    set((state) => ({
      itemsEspeciales: [...state.itemsEspeciales, { ...item, id: crypto.randomUUID() }],
      pantallaActiva: 'carrito',
    })),

  editarEspecial: (id, cambios) =>
    set((state) => ({
      itemsEspeciales: state.itemsEspeciales.map((i) => (i.id === id ? { ...cambios, id } : i)),
    })),

  eliminarEspecial: (id) =>
    set((state) => ({ itemsEspeciales: state.itemsEspeciales.filter((i) => i.id !== id) })),

  cambiarCantidadEspecial: (id, delta) =>
    set((state) => ({
      itemsEspeciales: state.itemsEspeciales.map((i) =>
        i.id === id ? { ...i, cantidad: Math.max(1, i.cantidad + delta) } : i,
      ),
    })),

  guardar: async (distribuidorId, userId) => {
    const { cotizacionInfo, cotizacionGuardadaId, items, itemsHerraje } = get()
    if (!cotizacionInfo) throw new Error('Sin cotización activa')

    const totalModulos = items.reduce((s, i) => s + i.resultado.subtotal_linea, 0)
    const totalHerrajesAsociados = items.reduce(
      (s, i) => s + i.herrajesAsociados.reduce((hs, h) => hs + h.resultado.subtotal_linea, 0),
      0,
    )
    const totalHerrajes = itemsHerraje.reduce((s, i) => s + i.resultado.subtotal_linea, 0)
    const transporteFijo = cotizacionInfo.transporteFijo
    const instalacionFija = cotizacionInfo.instalacionFija
    const totales = {
      totalModulos,
      totalHerrajesAsociados,
      totalHerrajes,
      transporteFijo,
      instalacionFija,
      total: totalModulos + totalHerrajesAsociados + totalHerrajes + transporteFijo + instalacionFija,
    }

    if (cotizacionGuardadaId) {
      await _actualizarCotizacion(distribuidorId, cotizacionGuardadaId, cotizacionInfo, items, itemsHerraje, totales)
      return cotizacionGuardadaId
    }

    const id = await _guardarCotizacion(distribuidorId, userId, cotizacionInfo, items, itemsHerraje, totales)
    set({ cotizacionGuardadaId: id })
    return id
  },

  guardarValoracion: async (distribuidorId, distribuidorNombre, userId) => {
    const { cotizacionInfo, valoracionGuardadaId, items, itemsHerraje } = get()
    if (!cotizacionInfo) throw new Error('Sin cotización activa')

    const totalModulos = items.reduce((s, i) => s + i.resultado.subtotal_linea, 0)
    const totalHerrajesAsociados = items.reduce(
      (s, i) => s + i.herrajesAsociados.reduce((hs, h) => hs + h.resultado.subtotal_linea, 0),
      0,
    )
    const totalHerrajes = itemsHerraje.reduce((s, i) => s + i.resultado.subtotal_linea, 0)
    const transporteFijo = cotizacionInfo.transporteFijo
    const instalacionFija = cotizacionInfo.instalacionFija
    const totales = {
      totalModulos,
      totalHerrajesAsociados,
      totalHerrajes,
      transporteFijo,
      instalacionFija,
      total: totalModulos + totalHerrajesAsociados + totalHerrajes + transporteFijo + instalacionFija,
    }

    if (valoracionGuardadaId) {
      await _actualizarValoracion(valoracionGuardadaId, cotizacionInfo, items, itemsHerraje, totales)
      return valoracionGuardadaId
    }

    const id = await _guardarValoracion(userId, cotizacionInfo, distribuidorId, distribuidorNombre, items, itemsHerraje, totales)
    set({ valoracionGuardadaId: id })
    return id
  },

  reabrirValoracion: (valoracion) => {
    const cotizacionInfo: CotizacionInfo = {
      clienteNombre: valoracion.clienteNombre,
      proyectoNombre: valoracion.proyectoNombre,
      modalidad: valoracion.modalidad,
      fecha: new Date(valoracion.createdAt),
      categoriaId: '',
      categoriaNombre: '',
      transporteFijo: valoracion.totales.transporteFijo ?? 0,
      instalacionFija: valoracion.totales.instalacionFija ?? 0,
    }

    const items: ItemCarrito[] = valoracion.items.map((snap) => ({
      id: crypto.randomUUID(),
      modulo: {
        id: snap.modulo_id,
        nombre: snap.modulo_nombre,
        tipologia: snap.modulo_tipologia,
        codigo_excel: '',
        categoria_id: '',
        altura: snap.config.altura,
        profundidad: snap.config.profundidad,
        imagen_nombre: null,
        imagen_url: null,
        search_keywords: [],
        activo: true,
      } satisfies Modulo,
      config: {
        tipoEstructuraId: snap.config.tipoEstructuraId ?? '',
        tipoEstructuraNombre: snap.config.tipoEstructuraNombre,
        tipoFachadaId: snap.config.tipoFachadaId ?? '',
        tipoFachadaNombre: snap.config.tipoFachadaNombre,
        subcategoriaId: snap.config.subcategoriaId ?? '',
        subcategoriaNombre: snap.config.subcategoriaNombre,
        acabadoId: snap.config.acabadoId ?? '',
        acabadoNombre: snap.config.acabadoNombre,
        acabadoEstructura: snap.config.acabadoEstructura,
        colorVidrio: snap.config.colorVidrio,
        colorMetal: snap.config.colorMetal,
        altura: snap.config.altura,
        profundidad: snap.config.profundidad,
        cantidad: snap.config.cantidad,
        observaciones: snap.config.observaciones,
      },
      subcategoria: {
        id: snap.config.subcategoriaId ?? '',
        tipo_fachada_id: snap.config.tipoFachadaId ?? '',
        nombre: snap.config.subcategoriaNombre,
        tipo_ajuste: 'ninguno',
        ajuste_pct: 0,
        es_premium: false,
        activo: true,
      } satisfies Subcategoria,
      resultado: snap.resultado as ResultadoCalculo,
      herrajesAsociados: snap.herrajesAsociados.map((h) => ({
        accesorio: {
          id: h.accesorio_id,
          codigo: h.codigo,
          nombre: h.nombre,
          nombre_normalizado: h.nombre.toLowerCase(),
          precio_tradicional_cop: null,
          precio_desarmado_cop: null,
          imagen_nombre: null,
          imagen_url: null,
          disponible_tradicional: true,
          disponible_desarmado: true,
          activo: true,
        } satisfies Accesorio,
        cantidad: h.cantidad,
        resultado: h.resultado as ResultadoCalculo,
      })),
    }))

    const itemsHerraje: ItemHerrajeCarrito[] = valoracion.itemsHerraje.map((snap) => ({
      id: crypto.randomUUID(),
      accesorio: {
        id: snap.accesorio_id,
        codigo: snap.codigo,
        nombre: snap.nombre,
        nombre_normalizado: snap.nombre.toLowerCase(),
        precio_tradicional_cop: null,
        precio_desarmado_cop: null,
        imagen_nombre: null,
        imagen_url: null,
        disponible_tradicional: true,
        disponible_desarmado: true,
        activo: true,
      } satisfies Accesorio,
      cantidad: snap.cantidad,
      resultado: snap.resultado as ResultadoCalculo,
    }))

    set({
      cotizacionInfo,
      cotizacionGuardadaId: null,
      valoracionGuardadaId: valoracion.id,
      items,
      itemsHerraje,
      itemsEspeciales: [],
      pantallaActiva: 'carrito',
      moduloPendiente: null,
      itemEditando: null,
    })
  },

  reabrirBorrador: (cotizacion) => {
    const cotizacionInfo: CotizacionInfo = {
      clienteNombre: cotizacion.clienteNombre,
      clienteDireccion: cotizacion.clienteDireccion,
      proyectoNombre: cotizacion.proyectoNombre,
      modalidad: cotizacion.modalidad,
      fecha: new Date(cotizacion.fecha),
      categoriaId: cotizacion.categoriaId ?? '',
      categoriaNombre: cotizacion.categoriaNombre ?? '',
      transporteFijo: cotizacion.totales.transporteFijo ?? 0,
      instalacionFija: cotizacion.totales.instalacionFija ?? 0,
      proyectoId: cotizacion.proyecto_id,
      espacioNombre: cotizacion.espacio_nombre,
      version: cotizacion.version,
    }

    const items: ItemCarrito[] = cotizacion.items.map((snap) => ({
      id: crypto.randomUUID(),
      modulo: {
        id: snap.modulo_id,
        nombre: snap.modulo_nombre,
        tipologia: snap.modulo_tipologia,
        codigo_excel: '',
        categoria_id: '',
        altura: snap.config.altura,
        profundidad: snap.config.profundidad,
        imagen_nombre: null,
        imagen_url: null,
        search_keywords: [],
        activo: true,
      } satisfies Modulo,
      config: {
        tipoEstructuraId: snap.config.tipoEstructuraId ?? '',
        tipoEstructuraNombre: snap.config.tipoEstructuraNombre,
        tipoFachadaId: snap.config.tipoFachadaId ?? '',
        tipoFachadaNombre: snap.config.tipoFachadaNombre,
        subcategoriaId: snap.config.subcategoriaId ?? '',
        subcategoriaNombre: snap.config.subcategoriaNombre,
        acabadoId: snap.config.acabadoId ?? '',
        acabadoNombre: snap.config.acabadoNombre,
        acabadoEstructura: snap.config.acabadoEstructura,
        colorVidrio: snap.config.colorVidrio,
        colorMetal: snap.config.colorMetal,
        altura: snap.config.altura,
        profundidad: snap.config.profundidad,
        cantidad: snap.config.cantidad,
        observaciones: snap.config.observaciones,
      },
      subcategoria: {
        id: snap.config.subcategoriaId ?? '',
        tipo_fachada_id: snap.config.tipoFachadaId ?? '',
        nombre: snap.config.subcategoriaNombre,
        tipo_ajuste: 'ninguno',
        ajuste_pct: 0,
        es_premium: false,
        activo: true,
      } satisfies Subcategoria,
      resultado: snap.resultado as ResultadoCalculo,
      herrajesAsociados: snap.herrajesAsociados.map((h) => ({
        accesorio: {
          id: h.accesorio_id,
          codigo: h.codigo,
          nombre: h.nombre,
          nombre_normalizado: h.nombre.toLowerCase(),
          precio_tradicional_cop: null,
          precio_desarmado_cop: null,
          imagen_nombre: null,
          imagen_url: null,
          disponible_tradicional: true,
          disponible_desarmado: true,
          activo: true,
        } satisfies Accesorio,
        cantidad: h.cantidad,
        resultado: h.resultado as ResultadoCalculo,
      })),
    }))

    const itemsHerraje: ItemHerrajeCarrito[] = cotizacion.itemsHerraje.map((snap) => ({
      id: crypto.randomUUID(),
      accesorio: {
        id: snap.accesorio_id,
        codigo: snap.codigo,
        nombre: snap.nombre,
        nombre_normalizado: snap.nombre.toLowerCase(),
        precio_tradicional_cop: null,
        precio_desarmado_cop: null,
        imagen_nombre: null,
        imagen_url: null,
        disponible_tradicional: true,
        disponible_desarmado: true,
        activo: true,
      } satisfies Accesorio,
      cantidad: snap.cantidad,
      resultado: snap.resultado as ResultadoCalculo,
    }))

    set({
      cotizacionInfo,
      cotizacionGuardadaId: cotizacion.id,
      items,
      itemsHerraje,
      itemsEspeciales: [],
      pantallaActiva: 'carrito',
      moduloPendiente: null,
      itemEditando: null,
    })
  },

  copiarBorrador: (cotizacion) => {
    const cotizacionInfo: CotizacionInfo = {
      clienteNombre: cotizacion.clienteNombre,
      clienteDireccion: cotizacion.clienteDireccion,
      proyectoNombre: cotizacion.proyectoNombre,
      modalidad: cotizacion.modalidad,
      fecha: new Date(),
      categoriaId: cotizacion.categoriaId ?? '',
      categoriaNombre: cotizacion.categoriaNombre ?? '',
      transporteFijo: cotizacion.totales.transporteFijo ?? 0,
      instalacionFija: cotizacion.totales.instalacionFija ?? 0,
      proyectoId: cotizacion.proyecto_id,
      espacioNombre: cotizacion.espacio_nombre,
    }

    const items: ItemCarrito[] = cotizacion.items.map((snap) => ({
      id: crypto.randomUUID(),
      modulo: {
        id: snap.modulo_id,
        nombre: snap.modulo_nombre,
        tipologia: snap.modulo_tipologia,
        codigo_excel: '',
        categoria_id: '',
        altura: snap.config.altura,
        profundidad: snap.config.profundidad,
        imagen_nombre: null,
        imagen_url: null,
        search_keywords: [],
        activo: true,
      } satisfies Modulo,
      config: {
        tipoEstructuraId: snap.config.tipoEstructuraId ?? '',
        tipoEstructuraNombre: snap.config.tipoEstructuraNombre,
        tipoFachadaId: snap.config.tipoFachadaId ?? '',
        tipoFachadaNombre: snap.config.tipoFachadaNombre,
        subcategoriaId: snap.config.subcategoriaId ?? '',
        subcategoriaNombre: snap.config.subcategoriaNombre,
        acabadoId: snap.config.acabadoId ?? '',
        acabadoNombre: snap.config.acabadoNombre,
        acabadoEstructura: snap.config.acabadoEstructura,
        colorVidrio: snap.config.colorVidrio,
        colorMetal: snap.config.colorMetal,
        altura: snap.config.altura,
        profundidad: snap.config.profundidad,
        cantidad: snap.config.cantidad,
        observaciones: snap.config.observaciones,
      },
      subcategoria: {
        id: snap.config.subcategoriaId ?? '',
        tipo_fachada_id: snap.config.tipoFachadaId ?? '',
        nombre: snap.config.subcategoriaNombre,
        tipo_ajuste: 'ninguno',
        ajuste_pct: 0,
        es_premium: false,
        activo: true,
      } satisfies Subcategoria,
      resultado: snap.resultado as ResultadoCalculo,
      herrajesAsociados: snap.herrajesAsociados.map((h) => ({
        accesorio: {
          id: h.accesorio_id,
          codigo: h.codigo,
          nombre: h.nombre,
          nombre_normalizado: h.nombre.toLowerCase(),
          precio_tradicional_cop: null,
          precio_desarmado_cop: null,
          imagen_nombre: null,
          imagen_url: null,
          disponible_tradicional: true,
          disponible_desarmado: true,
          activo: true,
        } satisfies Accesorio,
        cantidad: h.cantidad,
        resultado: h.resultado as ResultadoCalculo,
      })),
    }))

    const itemsHerraje: ItemHerrajeCarrito[] = cotizacion.itemsHerraje.map((snap) => ({
      id: crypto.randomUUID(),
      accesorio: {
        id: snap.accesorio_id,
        codigo: snap.codigo,
        nombre: snap.nombre,
        nombre_normalizado: snap.nombre.toLowerCase(),
        precio_tradicional_cop: null,
        precio_desarmado_cop: null,
        imagen_nombre: null,
        imagen_url: null,
        disponible_tradicional: true,
        disponible_desarmado: true,
        activo: true,
      } satisfies Accesorio,
      cantidad: snap.cantidad,
      resultado: snap.resultado as ResultadoCalculo,
    }))

    set({
      cotizacionInfo,
      cotizacionGuardadaId: null,
      items,
      itemsHerraje,
      pantallaActiva: 'carrito',
      moduloPendiente: null,
      itemEditando: null,
    })
  },

  cargarBorrador: ({ cotizacionInfo, cotizacionGuardadaId, distribuidorData, items, itemsHerraje }) =>
    set({
      cotizacionInfo,
      cotizacionGuardadaId,
      distribuidorData,
      items,
      itemsHerraje,
      pantallaActiva: 'carrito',
      moduloPendiente: null,
    }),

  limpiar: () =>
    set({
      cotizacionInfo: null,
      cotizacionGuardadaId: null,
      valoracionGuardadaId: null,
      items: [],
      itemsHerraje: [],
      itemsEspeciales: [],
      pantallaActiva: 'carrito',
      moduloPendiente: null,
      itemEditando: null,
    }),
  }),
  {
    name: 'delben-carrito',
    storage: createJSONStorage(() => localStorage),
    // campanasDisponibles: no se persiste, se refresca en cada sesión
    partialize: (state) => ({
      cotizacionInfo: state.cotizacionInfo,
      distribuidorData: state.distribuidorData,
      cotizacionGuardadaId: state.cotizacionGuardadaId,
      valoracionGuardadaId: state.valoracionGuardadaId,
      items: state.items,
      itemsHerraje: state.itemsHerraje,
    }),
  },
))
