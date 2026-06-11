'use client'

import { create } from 'zustand'
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware'
import { calcularItem } from '@delben/core'
import type { ResultadoCalculo, Campana as CampanaMotor } from '@delben/core'
import {
  DISTRIBUIDOR_DEMO,
  SERVICIOS_DELBEN_DEMO,
  UNIVERSO_DEMO,
} from '@/lib/datos-demo'
import type { Accesorio, Cotizacion, Distribuidor, Sede, Modulo, Subcategoria, Valoracion, TotalesCotizacion, ValoracionTotales, ItemEspecialSnapshot, ValoracionEspecialSnapshot } from '@/lib/firebase/tipos-firestore'
import { getUniversoParaModalidad } from '@/lib/firebase/tipos-firestore'
import {
  guardarCotizacion as _guardarCotizacion,
  actualizarCotizacion as _actualizarCotizacion,
  getSiguienteVersion as _getSiguienteVersion,
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
  // Resultado unitario del motor (para descomponer el especial por capas).
  resultado?: ResultadoCalculo
}

export type CotizacionInfo = {
  clienteNombre: string
  clienteDireccion?: string
  proyectoNombre: string
  modalidad: 'tradicional' | 'desarmado'
  fecha: Date
  // Sede a la que pertenece la cotización (snapshot inmutable). De aquí salen
  // las condiciones de cálculo (capa Delben + universo) y país/moneda/IVA.
  sedeId: string
  categoriaId: string
  categoriaNombre: string
  transporteFijo: number
  instalacionFija: number
  // Número de OP — solo aplica a valoraciones internas (delben_facturacion).
  // Las cotizaciones no lo usan.
  numeroOp?: string
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
  sedeData: Sede | null
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
  iniciarCotizacion: (info: Omit<CotizacionInfo, 'fecha'>, distribuidor: Distribuidor | null, sede: Sede | null) => void
  actualizarCostosProyecto: (transporteFijo: number, instalacionFija: number) => void
  actualizarNumeroOp: (numeroOp: string) => void
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
  reabrirBorrador: (cotizacion: Cotizacion, sede: Sede | null) => void
  reabrirValoracion: (valoracion: Valoracion, sede: Sede | null) => void
  copiarBorrador: (cotizacion: Cotizacion, sede: Sede | null, nuevoNombre?: string) => Promise<void>
  copiarValoracion: (valoracion: Valoracion, sede: Sede | null, nuevoNombre?: string) => void
  cargarBorrador: (payload: {
    cotizacionInfo: CotizacionInfo
    cotizacionGuardadaId: string | null
    distribuidorData: Distribuidor | null
    sedeData: Sede | null
    items: ItemCarrito[]
    itemsHerraje: ItemHerrajeCarrito[]
    itemsEspeciales?: ItemEspecial[]
  }) => void
  limpiar: () => void
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

// Las condiciones de cálculo salen de la SEDE; el id del DISTRIBUIDOR se conserva
// porque el motor lo usa para segmentar campañas (no el id de la sede).
function buildMotorParams(
  dist: Distribuidor | null,
  sede: Sede | null,
  modalidad: 'desarmado' | 'tradicional',
) {
  if (!sede) {
    return {
      distribuidorMotor: DISTRIBUIDOR_DEMO,
      serviciosMotor: SERVICIOS_DELBEN_DEMO,
      universoMotor: UNIVERSO_DEMO,
      pais: 'Colombia',
    }
  }
  const u = getUniversoParaModalidad(sede.universo, modalidad)
  return {
    distribuidorMotor: { id: dist?.id ?? 'demo', descuento_muebles_pct: sede.descuento_muebles_pct, descuento_herrajes_pct: sede.descuento_herrajes_pct },
    serviciosMotor: { diseno: sede.servicios.diseno_pct, cotizacion: sede.servicios.cotizacion_pct, produccion: sede.servicios.produccion_pct, logistica: sede.servicios.logistica_pct, gestion_comercial: sede.servicios.gestion_comercial_pct },
    universoMotor: {
      transporte: (u.transporte_tipo ?? 'porcentual') === 'fijo' ? 0 : u.transporte_pct,
      instalacion: (u.instalacion_tipo ?? 'porcentual') === 'fijo' ? 0 : u.instalacion_pct,
      imprevistos: u.imprevistos_pct,
      utilidad: u.utilidad_pct,
      iva: u.iva_pct,
    },
    pais: sede.pais,
  }
}

// ─── Total canónico ───────────────────────────────────────────────────────────
// ÚNICA fuente de verdad del total al cliente. La usan la pantalla del carrito,
// guardar() y guardarValoracion(). El total incluye TODO lo que paga el cliente:
// módulos + herrajes asociados + herrajes sueltos + muebles especiales +
// transporte fijo + instalación fija.
export function calcularTotalesCotizacion(
  items: ItemCarrito[],
  itemsHerraje: ItemHerrajeCarrito[],
  itemsEspeciales: ItemEspecial[],
  transporteFijo: number,
  instalacionFija: number,
): TotalesCotizacion {
  const totalModulos = items.reduce((s, i) => s + i.resultado.subtotal_linea, 0)
  const totalHerrajesAsociados = items.reduce(
    (s, i) => s + i.herrajesAsociados.reduce((hs, h) => hs + h.resultado.subtotal_linea, 0),
    0,
  )
  const totalHerrajes = itemsHerraje.reduce((s, i) => s + i.resultado.subtotal_linea, 0)
  const totalEspeciales = itemsEspeciales.reduce((s, i) => s + i.precioClienteUnitario * i.cantidad, 0)
  return {
    totalModulos,
    totalHerrajesAsociados,
    totalHerrajes,
    totalEspeciales,
    transporteFijo,
    instalacionFija,
    total:
      totalModulos +
      totalHerrajesAsociados +
      totalHerrajes +
      totalEspeciales +
      transporteFijo +
      instalacionFija,
  }
}

// ─── Total canónico de la VALORACIÓN ──────────────────────────────────────────
// Costo Delben ANTES de IVA (sin venta, sin utilidad, sin IVA). Es la suma de
// costo_delben de módulos + herrajes asociados + herrajes sueltos + el costo
// (precioDelbenUnitario) de los especiales. NO incluye transporte/instalación
// fijos (son capa distribuidor, no costo Delben). Misma fórmula que el "Precio
// Delben al distribuidor" del borrador de valoración.
export function calcularTotalCostoDelben(
  items: ItemCarrito[],
  itemsHerraje: ItemHerrajeCarrito[],
  itemsEspeciales: ItemEspecial[],
): number {
  const modulos = items.reduce((s, i) => s + i.resultado.costo_delben * i.config.cantidad, 0)
  const herrajesAsociados = items.reduce(
    (s, i) => s + i.herrajesAsociados.reduce((hs, h) => hs + h.resultado.costo_delben * h.cantidad, 0),
    0,
  )
  const herrajes = itemsHerraje.reduce((s, i) => s + i.resultado.costo_delben * i.cantidad, 0)
  const especiales = itemsEspeciales.reduce((s, i) => s + i.precioDelbenUnitario * i.cantidad, 0)
  return modulos + herrajesAsociados + herrajes + especiales
}

// Reconstruye un ItemEspecial (del carrito) desde su snapshot de Firestore.
// Acepta el snapshot de cotización (con venta) o el de valoración (solo-costo,
// sin precioClienteUnitario ni resultado). En valoración la venta no se usa:
// precioClienteUnitario cae a 0 (placeholder en memoria; no se vuelve a persistir).
export function buildEspecialDesdeSnapshot(
  snap: ItemEspecialSnapshot | ValoracionEspecialSnapshot,
): ItemEspecial {
  const precioClienteUnitario = 'precioClienteUnitario' in snap ? snap.precioClienteUnitario : 0
  const resultado = 'resultado' in snap ? snap.resultado : undefined
  return {
    id: crypto.randomUUID(),
    nombre: snap.nombre,
    tipoEstructuraNombre: snap.tipoEstructuraNombre,
    tipoFachadaNombre: snap.tipoFachadaNombre,
    acabadoNombre: snap.acabadoNombre,
    acabadoEstructura: snap.acabadoEstructura,
    colorVidrio: snap.colorVidrio,
    ancho: snap.ancho,
    alto: snap.alto,
    profundidad: snap.profundidad,
    cantidad: snap.cantidad,
    precioDelbenUnitario: snap.precioDelbenUnitario,
    precioClienteUnitario,
    observaciones: snap.observaciones,
    herrajes: snap.herrajes.map((h) => ({ ...h })),
    moduloReferenciaId: snap.moduloReferenciaId,
    moduloReferenciaNombre: snap.moduloReferenciaNombre,
    ...(resultado ? { resultado: resultado as ResultadoCalculo } : {}),
  }
}

// ─── Persistencia con escritura diferida ────────────────────────────────────
// El persist de Zustand serializa TODO el carrito a localStorage en cada `set`.
// Para los cambios de alta frecuencia (cantidad ±0,5) eso es un JSON.stringify
// repetido en el hilo principal. Diferimos esas escrituras (debounce); los
// eventos importantes (agregar, eliminar, guardar, reabrir…) escriben de
// inmediato para no perder datos si el usuario recarga justo después.

const RETRASO_PERSIST_MS = 400

// Por defecto las escrituras son inmediatas. Solo las acciones de cantidad las
// marcan como diferidas mientras corren. Zustand llama a storage.setItem de
// forma SÍNCRONA dentro de `set` (middleware.mjs), así que el flag se lee en el
// momento exacto de la escritura.
let escrituraInmediata = true

function conPersistenciaDiferida(accion: () => void): void {
  escrituraInmediata = false
  try {
    accion()
  } finally {
    escrituraInmediata = true
  }
}

// Storage custom para persist: difiere el JSON.stringify + write de las
// escrituras de alta frecuencia y lo hace inmediato para el resto. Conserva
// exactamente el mismo `partialize` (lo aplica Zustand antes de llamar aquí).
function crearAlmacenThrottled<S>(retrasoMs: number): PersistStorage<S> {
  let pendiente: { name: string; value: StorageValue<S> } | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const escribir = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!pendiente) return
    try {
      localStorage.setItem(pendiente.name, JSON.stringify(pendiente.value))
    } catch {
      /* cuota excedida — se descarta esta escritura */
    }
    pendiente = null
  }

  // No perder el último cambio diferido si el usuario recarga o cierra la pestaña.
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', escribir)
    window.addEventListener('pagehide', escribir)
  }

  return {
    getItem: (name) => {
      try {
        const str = localStorage.getItem(name)
        return str ? (JSON.parse(str) as StorageValue<S>) : null
      } catch {
        return null
      }
    },
    setItem: (name, value) => {
      pendiente = { name, value }
      if (escrituraInmediata) {
        escribir()
      } else {
        if (timer) clearTimeout(timer)
        timer = setTimeout(escribir, retrasoMs)
      }
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name)
      } catch {
        /* noop */
      }
    },
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCarrito = create<CarritoState>()(
  persist(
    (set, get) => ({
  cotizacionInfo: null,
  distribuidorData: null,
  sedeData: null,
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

  iniciarCotizacion: (info, distribuidor, sede) =>
    set({
      cotizacionInfo: { ...info, fecha: new Date() },
      distribuidorData: distribuidor,
      sedeData: sede,
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

  actualizarNumeroOp: (numeroOp) =>
    set((state) => ({
      cotizacionInfo: state.cotizacionInfo
        ? { ...state.cotizacionInfo, numeroOp }
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
    conPersistenciaDiferida(() =>
      set((state) => ({
        items: state.items.map((i) => {
          if (i.id !== id) return i
          const nuevaCantidad = Math.max(0.1, parseFloat((i.config.cantidad + delta).toFixed(4)))
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
    ),

  cambiarCantidadHerraje: (id, delta) =>
    conPersistenciaDiferida(() =>
      set((state) => ({
        itemsHerraje: state.itemsHerraje.map((i) => {
          if (i.id !== id) return i
          const nuevaCantidad = Math.max(0.1, parseFloat((i.cantidad + delta).toFixed(4)))
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
    ),

  agregarItem: (modulo, config, subcategoria, precioCop, categoriaCalculo, herrajesBorrador) => {
    const { cotizacionInfo, distribuidorData: dist, sedeData: sede, campanasDisponibles, tasaUsd, itemEditando } = get()
    if (!cotizacionInfo) return

    const { distribuidorMotor, serviciosMotor, universoMotor, pais } = buildMotorParams(dist, sede, cotizacionInfo.modalidad)

    const motorBase = {
      modelo: cotizacionInfo.modalidad,
      distribuidor: distribuidorMotor,
      fecha_cotizacion: new Date(cotizacionInfo.fecha),
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
    const { cotizacionInfo, distribuidorData: dist, sedeData: sede, campanasDisponibles, tasaUsd } = get()
    if (!cotizacionInfo) return

    const precioCop =
      cotizacionInfo.modalidad === 'tradicional'
        ? accesorio.precio_tradicional_cop
        : accesorio.precio_desarmado_cop

    if (!precioCop) return

    const { distribuidorMotor, serviciosMotor, universoMotor, pais } = buildMotorParams(dist, sede, cotizacionInfo.modalidad)

    const resultado = calcularItem({
      precio_base_cop: precioCop,
      cantidad,
      tipo_item: 'herraje',
      modelo: cotizacionInfo.modalidad,
      distribuidor: distribuidorMotor,
      categoria: { id: 'herraje', desc_base_pct: 0, desc_premium_pct: 0 },
      linea_acabado: { id: 'herraje', tipo_ajuste: 'ninguno', ajuste_pct: 0, es_premium: false },
      fecha_cotizacion: new Date(cotizacionInfo.fecha),
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
    conPersistenciaDiferida(() =>
      set((state) => ({
        itemsEspeciales: state.itemsEspeciales.map((i) =>
          i.id === id ? { ...i, cantidad: Math.max(0.1, parseFloat((i.cantidad + delta).toFixed(4))) } : i,
        ),
      })),
    ),

  guardar: async (distribuidorId, userId) => {
    const { cotizacionInfo, cotizacionGuardadaId, items, itemsHerraje, itemsEspeciales } = get()
    if (!cotizacionInfo) throw new Error('Sin cotización activa')

    const totales = calcularTotalesCotizacion(
      items,
      itemsHerraje,
      itemsEspeciales,
      cotizacionInfo.transporteFijo,
      cotizacionInfo.instalacionFija,
    )

    if (cotizacionGuardadaId) {
      await _actualizarCotizacion(distribuidorId, cotizacionGuardadaId, cotizacionInfo, items, itemsHerraje, itemsEspeciales, totales)
      return cotizacionGuardadaId
    }

    const id = await _guardarCotizacion(distribuidorId, userId, cotizacionInfo, items, itemsHerraje, itemsEspeciales, totales)
    set({ cotizacionGuardadaId: id })
    return id
  },

  guardarValoracion: async (distribuidorId, distribuidorNombre, userId) => {
    const { cotizacionInfo, valoracionGuardadaId, items, itemsHerraje, itemsEspeciales } = get()
    if (!cotizacionInfo) throw new Error('Sin cotización activa')

    // Total canónico de la valoración = COSTO DELBEN antes de IVA (no venta).
    const totales: ValoracionTotales = {
      totalCostoDelben: calcularTotalCostoDelben(items, itemsHerraje, itemsEspeciales),
    }

    if (valoracionGuardadaId) {
      await _actualizarValoracion(valoracionGuardadaId, cotizacionInfo, items, itemsHerraje, itemsEspeciales, totales)
      return valoracionGuardadaId
    }

    const id = await _guardarValoracion(userId, cotizacionInfo, distribuidorId, distribuidorNombre, items, itemsHerraje, itemsEspeciales, totales)
    set({ valoracionGuardadaId: id })
    return id
  },

  reabrirValoracion: (valoracion, sede) => {
    const cotizacionInfo: CotizacionInfo = {
      clienteNombre: valoracion.clienteNombre,
      proyectoNombre: valoracion.proyectoNombre,
      modalidad: valoracion.modalidad,
      fecha: new Date(valoracion.createdAt),
      sedeId: valoracion.sede_id,
      categoriaId: '',
      categoriaNombre: '',
      // La valoración (costo Delben) no maneja costos fijos de transporte/instalación.
      transporteFijo: 0,
      instalacionFija: 0,
      numeroOp: valoracion.numero_op,
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
      sedeData: sede,
      cotizacionGuardadaId: null,
      valoracionGuardadaId: valoracion.id,
      items,
      itemsHerraje,
      itemsEspeciales: (valoracion.itemsEspeciales ?? []).map(buildEspecialDesdeSnapshot),
      pantallaActiva: 'carrito',
      moduloPendiente: null,
      itemEditando: null,
    })
  },

  copiarValoracion: (valoracion, sede, nuevoNombre) => {
    // Copia para crear una valoración NUEVA: se fuerza doc nuevo
    // (valoracionGuardadaId: null) y fecha de hoy. El numero_op NO se hereda
    // (es identificador único de OP; facturación asigna uno nuevo) → queda vacío.
    // El nombre de la copia se aplica al proyectoNombre (título en la lista de
    // valoraciones). Fallback al original si llega vacío.
    const proyectoNombre = nuevoNombre?.trim() || valoracion.proyectoNombre
    const cotizacionInfo: CotizacionInfo = {
      clienteNombre: valoracion.clienteNombre,
      proyectoNombre,
      modalidad: valoracion.modalidad,
      fecha: new Date(),
      sedeId: valoracion.sede_id,
      categoriaId: '',
      categoriaNombre: '',
      // La valoración (costo Delben) no maneja costos fijos de transporte/instalación.
      transporteFijo: 0,
      instalacionFija: 0,
      // numeroOp omitido a propósito: no se arrastra (queda vacío para una OP nueva).
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
      sedeData: sede,
      cotizacionGuardadaId: null,
      valoracionGuardadaId: null,
      items,
      itemsHerraje,
      itemsEspeciales: (valoracion.itemsEspeciales ?? []).map(buildEspecialDesdeSnapshot),
      pantallaActiva: 'carrito',
      moduloPendiente: null,
      itemEditando: null,
    })
  },

  reabrirBorrador: (cotizacion, sede) => {
    const cotizacionInfo: CotizacionInfo = {
      clienteNombre: cotizacion.clienteNombre,
      clienteDireccion: cotizacion.clienteDireccion,
      proyectoNombre: cotizacion.proyectoNombre,
      modalidad: cotizacion.modalidad,
      fecha: new Date(cotizacion.fecha),
      sedeId: cotizacion.sede_id,
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
      sedeData: sede,
      cotizacionGuardadaId: cotizacion.id,
      items,
      itemsHerraje,
      itemsEspeciales: (cotizacion.itemsEspeciales ?? []).map(buildEspecialDesdeSnapshot),
      pantallaActiva: 'carrito',
      moduloPendiente: null,
      itemEditando: null,
    })
  },

  copiarBorrador: async (cotizacion, sede, nuevoNombre) => {
    // Nombre de la copia: en la lista, las cotizaciones de un proyecto se
    // distinguen por su ESPACIO (cabecera de grupo). El nuevo nombre se aplica
    // ahí. Fallback al original si llega vacío (nunca queda solo-undefined).
    const espacioNombre = nuevoNombre?.trim() || cotizacion.espacio_nombre

    // La copia es una NUEVA versión del espacio elegido: se calcula la siguiente
    // versión (igual que el flujo de "nueva cotización") CONTRA ese nombre, para
    // no colisionar. version NUNCA debe quedar undefined: Firestore lo rechaza al
    // hacer setDoc en guardarCotizacion. Si no se puede consultar (sin
    // proyecto/espacio o error de red), cae a un default válido.
    let version = cotizacion.version ?? 1
    if (cotizacion.proyecto_id && espacioNombre) {
      try {
        version = await _getSiguienteVersion(
          cotizacion.distribuidor_id,
          cotizacion.proyecto_id,
          espacioNombre,
        )
      } catch {
        // se conserva el default válido (no undefined)
      }
    }

    const cotizacionInfo: CotizacionInfo = {
      clienteNombre: cotizacion.clienteNombre,
      clienteDireccion: cotizacion.clienteDireccion,
      proyectoNombre: cotizacion.proyectoNombre,
      modalidad: cotizacion.modalidad,
      fecha: new Date(),
      sedeId: cotizacion.sede_id,
      categoriaId: cotizacion.categoriaId ?? '',
      categoriaNombre: cotizacion.categoriaNombre ?? '',
      transporteFijo: cotizacion.totales.transporteFijo ?? 0,
      instalacionFija: cotizacion.totales.instalacionFija ?? 0,
      proyectoId: cotizacion.proyecto_id,
      espacioNombre,
      version,
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
      sedeData: sede,
      cotizacionGuardadaId: null,
      items,
      itemsHerraje,
      itemsEspeciales: (cotizacion.itemsEspeciales ?? []).map(buildEspecialDesdeSnapshot),
      pantallaActiva: 'carrito',
      moduloPendiente: null,
      itemEditando: null,
    })
  },

  cargarBorrador: ({ cotizacionInfo, cotizacionGuardadaId, distribuidorData, sedeData, items, itemsHerraje, itemsEspeciales }) =>
    set({
      cotizacionInfo,
      cotizacionGuardadaId,
      distribuidorData,
      sedeData,
      items,
      itemsHerraje,
      ...(itemsEspeciales ? { itemsEspeciales } : {}),
      pantallaActiva: 'carrito',
      moduloPendiente: null,
    }),

  limpiar: () =>
    set({
      cotizacionInfo: null,
      sedeData: null,
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
    storage: crearAlmacenThrottled(RETRASO_PERSIST_MS),
    // campanasDisponibles: no se persiste, se refresca en cada sesión
    partialize: (state) => ({
      cotizacionInfo: state.cotizacionInfo,
      distribuidorData: state.distribuidorData,
      sedeData: state.sedeData,
      cotizacionGuardadaId: state.cotizacionGuardadaId,
      valoracionGuardadaId: state.valoracionGuardadaId,
      items: state.items,
      itemsHerraje: state.itemsHerraje,
      itemsEspeciales: state.itemsEspeciales,
    }),
  },
))
