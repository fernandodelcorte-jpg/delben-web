'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  X,
  MagnifyingGlass,
  CircleNotch,
  Plus,
  Minus,
  Trash,
  CaretDown,
  Package,
  Sparkle,
  ArrowLeft,
} from '@phosphor-icons/react'
import { useCarrito } from '@/store/carrito'
import type { ConfiguracionItem, ItemEspecial, HerrajeEspecial } from '@/store/carrito'
import { calcularItem } from '@delben/core'
import { getUniversoParaModalidad } from '@/lib/firebase/tipos-firestore'
import { buscarModulos, buscarAccesorios, getPreciosModulo, getVariantesModulo } from '@/lib/firestore/modulos'
import {
  resolverCategoriasParaMacro,
  getTiposEstructura,
  getTiposFachada,
  getSubcategorias,
  getAcabados,
  getCategorias,
} from '@/lib/firestore/catalogo'
import { formatCOP } from '@/lib/datos-demo'
import type {
  Modulo,
  Accesorio,
  TipoEstructura,
  TipoFachada,
  Subcategoria,
  Acabado,
  Categoria,
  Precio,
} from '@/lib/firebase/tipos-firestore'
import { ModuloImagen } from './modulo-imagen'

type Tab = 'modulos' | 'herrajes'

// ─── Sub-componentes internos de formulario ───────────────────────────────────

function Campo({
  label,
  nota,
  children,
}: {
  label: string
  nota?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <label className="text-sm font-medium text-stone-700">{label}</label>
        {nota && <span className="text-xs text-stone-400">{nota}</span>}
      </div>
      {children}
    </div>
  )
}

function Select({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-stone-900 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-colors disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <CaretDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
        weight="bold"
      />
    </div>
  )
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

type ReferenciaEspecial = {
  nombre: string
  alto: number
  profundidad: number
  precioBaseRef: number
  moduloId: string
  moduloNombre: string
  varianteId: string
  categoriaId: string
}

// ─── Panel para módulo especial (precio y medidas manuales) ───────────────────

function PanelEspecial({
  referencia,
  onVolver,
}: {
  referencia: ReferenciaEspecial | null
  onVolver: () => void
}) {
  const agregarEspecial = useCarrito((s) => s.agregarEspecial)
  const distribuidorData = useCarrito((s) => s.distribuidorData)
  const cotizacionInfo = useCarrito((s) => s.cotizacionInfo)
  const campanasDisponibles = useCarrito((s) => s.campanasDisponibles)
  const tasaUsd = useCarrito((s) => s.tasaUsd)

  // Catálogo
  const [tiposEstructura, setTiposEstructura] = useState<TipoEstructura[]>([])
  const [tiposFachada, setTiposFachada] = useState<TipoFachada[]>([])
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([])
  const [acabados, setAcabados] = useState<Acabado[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true)

  // Form
  const [nombre, setNombre] = useState(referencia?.nombre ?? '')
  const [anchoStr, setAnchoStr] = useState('')
  const [altoStr, setAltoStr] = useState(referencia?.alto ? String(referencia.alto) : '')
  const [profStr, setProfStr] = useState(referencia?.profundidad ? String(referencia.profundidad) : '')
  const [cantidadStr, setCantidadStr] = useState('1')
  const cantidad = Math.max(0.1, parseFloat(cantidadStr) || 0.1)
  const [precioDelbenStr, setPrecioDelbenStr] = useState(
    referencia?.precioBaseRef ? String(Math.round(referencia.precioBaseRef)) : '',
  )
  const [observaciones, setObservaciones] = useState('')

  // Estructura / fachada
  const [tipoEstructuraId, setTipoEstructuraId] = useState('')
  const [tipoFachadaId, setTipoFachadaId] = useState('')
  const [subcategoriaId, setSubcategoriaId] = useState('')
  const [acabadoId, setAcabadoId] = useState('')
  const [acabadoEstructura, setAcabadoEstructura] = useState<string | null>(null)
  const [colorVidrio, setColorVidrio] = useState<string | null>(null)

  // Herrajes
  const [herrajes, setHerrajes] = useState<HerrajeEspecial[]>([])
  const [busquedaHerraje, setBusquedaHerraje] = useState('')
  const [resultadosHerraje, setResultadosHerraje] = useState<Accesorio[]>([])
  const [buscandoHerraje, setBuscandoHerraje] = useState(false)
  const herrajeRef = useRef<HTMLInputElement>(null)

  const [errores, setErrores] = useState<Record<string, string>>({})
  const [preciosRef, setPreciosRef] = useState<Precio[]>([])

  // Carga inicial catálogo
  useEffect(() => {
    setCargandoCatalogo(true)
    Promise.all([getTiposEstructura(), getTiposFachada(), getCategorias()])
      .then(([estructuras, fachadas, cats]) => {
        setTiposEstructura(estructuras)
        setTiposFachada(fachadas)
        setCategorias(cats)
        if (estructuras[0]) setTipoEstructuraId(estructuras[0].id)
        if (fachadas[0]) setTipoFachadaId(fachadas[0].id)
      })
      .finally(() => setCargandoCatalogo(false))
  }, [])

  useEffect(() => {
    if (!tipoFachadaId) return
    setSubcategorias([])
    setSubcategoriaId('')
    setAcabados([])
    setAcabadoId('')
    setColorVidrio(null)
    getSubcategorias(tipoFachadaId).then((subs) => {
      setSubcategorias(subs)
      if (subs[0]) setSubcategoriaId(subs[0].id)
    })
  }, [tipoFachadaId])

  useEffect(() => {
    if (!subcategoriaId) return
    setAcabados([])
    setAcabadoId('')
    getAcabados(subcategoriaId).then((abs) => {
      setAcabados(abs)
      if (abs[0]) setAcabadoId(abs[0].id)
    })
  }, [subcategoriaId])

  useEffect(() => {
    const est = tiposEstructura.find((e) => e.id === tipoEstructuraId)
    setAcabadoEstructura(est?.es_premium ? (est.colores_premium[0] ?? null) : null)
  }, [tipoEstructuraId, tiposEstructura])

  // Carga precios del módulo de referencia para actualizar al cambiar estructura/fachada
  useEffect(() => {
    if (!referencia) return
    getPreciosModulo(referencia.varianteId).then(setPreciosRef).catch(() => {})
  }, [referencia?.varianteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Actualiza precio Delben cuando cambia la combinación estructura+fachada
  useEffect(() => {
    if (!referencia || preciosRef.length === 0 || !tipoEstructuraId || !tipoFachadaId) return
    const precio = preciosRef.find(
      (p) => p.tipo_estructura_id === tipoEstructuraId && p.tipo_fachada_id === tipoFachadaId,
    )
    if (precio) setPrecioDelbenStr(String(Math.round(precio.precio_cop)))
  }, [preciosRef, tipoEstructuraId, tipoFachadaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Búsqueda herrajes
  useEffect(() => {
    if (busquedaHerraje.trim().length < 2) { setResultadosHerraje([]); return }
    let cancelado = false
    setBuscandoHerraje(true)
    const modalidad = cotizacionInfo?.modalidad ?? 'desarmado'
    const timer = setTimeout(async () => {
      try {
        const res = await buscarAccesorios(busquedaHerraje, modalidad)
        if (!cancelado) setResultadosHerraje(res.slice(0, 8))
      } finally {
        if (!cancelado) setBuscandoHerraje(false)
      }
    }, 300)
    return () => { cancelado = true; clearTimeout(timer) }
  }, [busquedaHerraje, cotizacionInfo?.modalidad])

  const estructura = tiposEstructura.find((e) => e.id === tipoEstructuraId)
  const fachada = tiposFachada.find((f) => f.id === tipoFachadaId)
  const esAluminioVidrio = fachada?.es_aluminio_vidrio ?? false
  const esPremium = estructura?.es_premium ?? false

  const precioRefActual = referencia
    ? (preciosRef.find(
        (p) => p.tipo_estructura_id === tipoEstructuraId && p.tipo_fachada_id === tipoFachadaId,
      ) ?? null)
    : null

  const precioBase = parseFloat(precioDelbenStr) || 0

  // El número ingresado es el precio de LISTA base (como el precio_cop del
  // catálogo). El especial pasa por el MISMO motor que un módulo normal:
  // descuento + ajuste de acabado + campaña + servicios Delben → costo_delben,
  // y luego la capa distribuidor → precio al cliente. Así su costo queda
  // consistente con un módulo del catálogo del mismo precio de lista.
  const { costoDelben, precioClienteCalculado, resultadoMotor } = useMemo(() => {
    if (precioBase <= 0 || !distribuidorData || !cotizacionInfo) {
      return { costoDelben: 0, precioClienteCalculado: 0, resultadoMotor: null }
    }
    const u = getUniversoParaModalidad(distribuidorData.universo, cotizacionInfo.modalidad)
    const subcat = subcategorias.find((sx) => sx.id === subcategoriaId)
    // Categoría para el descuento (desarmado) y la segmentación de campañas:
    // la del módulo de referencia si lo hay; si no, la de la cotización.
    const catId = referencia?.categoriaId || cotizacionInfo.categoriaId || ''
    const cat = categorias.find((c) => c.id === catId)
    const resultado = calcularItem({
      precio_base_cop: precioBase,
      cantidad: 1,
      tipo_item: 'mueble',
      modelo: cotizacionInfo.modalidad,
      distribuidor: {
        id: distribuidorData.id,
        descuento_muebles_pct: distribuidorData.descuento_muebles_pct,
        descuento_herrajes_pct: distribuidorData.descuento_herrajes_pct,
      },
      categoria: {
        id: cat?.id ?? '',
        desc_base_pct: cat?.desc_desarmado_base_pct ?? 0,
        desc_premium_pct: cat?.desc_desarmado_premium_pct ?? 0,
      },
      linea_acabado: {
        id: subcat?.id ?? '',
        tipo_ajuste: subcat?.tipo_ajuste ?? 'ninguno',
        ajuste_pct: subcat?.ajuste_pct ?? 0,
        es_premium: subcat?.es_premium ?? false,
      },
      fecha_cotizacion: new Date(cotizacionInfo.fecha),
      campanas_disponibles: campanasDisponibles,
      servicios_delben: {
        diseno: distribuidorData.servicios.diseno_pct,
        cotizacion: distribuidorData.servicios.cotizacion_pct,
        produccion: distribuidorData.servicios.produccion_pct,
        logistica: distribuidorData.servicios.logistica_pct,
        gestion_comercial: distribuidorData.servicios.gestion_comercial_pct,
      },
      universo: {
        transporte: (u.transporte_tipo ?? 'porcentual') === 'fijo' ? 0 : u.transporte_pct,
        instalacion: (u.instalacion_tipo ?? 'porcentual') === 'fijo' ? 0 : u.instalacion_pct,
        imprevistos: u.imprevistos_pct,
        utilidad: u.utilidad_pct,
        iva: u.iva_pct,
      },
      pais_cliente_final: distribuidorData.pais,
      tasa_usd: tasaUsd,
    })
    return {
      costoDelben: resultado.costo_delben,
      precioClienteCalculado: resultado.precio_final_unitario,
      resultadoMotor: resultado,
    }
  }, [precioBase, distribuidorData, cotizacionInfo, subcategoriaId, subcategorias, categorias, referencia, campanasDisponibles, tasaUsd])

  function agregarHerrajeLocal(a: Accesorio) {
    setHerrajes((prev) => {
      const existente = prev.find((h) => h.accesorioId === a.id)
      if (existente) return prev.map((h) => h.accesorioId === a.id ? { ...h, cantidad: h.cantidad + 1 } : h)
      return [...prev, { accesorioId: a.id, nombre: a.nombre, codigo: String(a.codigo), cantidad: 1 }]
    })
    setBusquedaHerraje('')
    setResultadosHerraje([])
    herrajeRef.current?.focus()
  }

  function validar(): boolean {
    const e: Record<string, string> = {}
    if (!nombre.trim()) e.nombre = 'Requerido'
    if (!altoStr || Number(altoStr) <= 0) e.alto = 'Valor inválido'
    if (!profStr || Number(profStr) <= 0) e.prof = 'Valor inválido'
    if (precioBase <= 0) e.precioDelben = 'Ingresa un precio'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  function handleAgregar() {
    if (!validar()) return
    const item: Omit<ItemEspecial, 'id'> = {
      nombre: nombre.trim(),
      tipoEstructuraNombre: estructura?.nombre ?? '',
      tipoFachadaNombre: fachada?.nombre ?? '',
      acabadoNombre: acabados.find((a) => a.id === acabadoId)?.nombre ?? '',
      acabadoEstructura: esPremium ? acabadoEstructura : null,
      colorVidrio: esAluminioVidrio ? colorVidrio : null,
      ancho: anchoStr ? Number(anchoStr) : null,
      alto: Number(altoStr),
      profundidad: Number(profStr),
      cantidad,
      precioDelbenUnitario: costoDelben,
      precioClienteUnitario: precioClienteCalculado,
      observaciones: observaciones.trim(),
      herrajes,
      moduloReferenciaId: referencia?.moduloId,
      moduloReferenciaNombre: referencia?.moduloNombre,
      ...(resultadoMotor ? { resultado: resultadoMotor } : {}),
    }
    agregarEspecial(item)
  }

  const inputCls = 'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all'
  const errorCls = 'mt-1 text-xs text-red-600'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 pt-4 pb-3 border-b border-stone-100">
        <button type="button" onClick={onVolver}
          className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors mb-3"
        >
          <ArrowLeft size={12} weight="bold" />
          Volver al catálogo
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900">
            <Sparkle size={14} className="text-white" weight="fill" />
          </div>
          <div>
            <p className="text-xs text-stone-400">Módulo especial</p>
            <h3 className="text-sm font-semibold text-stone-900 leading-tight">Medidas y precio manual</h3>
          </div>
        </div>
        {referencia && (
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-stone-400 min-w-0 truncate">
              Ref: <span className="font-medium text-stone-600">{referencia.moduloNombre}</span>
            </p>
            {precioRefActual ? (
              <span className="text-xs font-bold text-stone-800 tabular-nums shrink-0">
                {formatCOP(precioRefActual.precio_cop)}
              </span>
            ) : preciosRef.length > 0 ? (
              <span className="text-xs text-stone-400 shrink-0">Sin precio</span>
            ) : null}
          </div>
        )}
      </div>

      {/* Formulario */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {/* Nombre */}
        <Campo label="Nombre del mueble">
          <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Alacena esquinera especial" className={inputCls} />
          {errores.nombre && <p className={errorCls}>{errores.nombre}</p>}
        </Campo>

        {/* Dimensiones */}
        <Campo label="Dimensiones (mm)">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Ancho', val: anchoStr, set: setAnchoStr, err: undefined },
              { label: 'Alto', val: altoStr, set: setAltoStr, err: errores.alto },
              { label: 'Prof.', val: profStr, set: setProfStr, err: errores.prof },
            ].map(({ label, val, set, err }) => (
              <div key={label}>
                <input type="number" value={val} onChange={(e) => set(e.target.value)}
                  placeholder={label} min={1} className={inputCls} />
                {err && <p className={errorCls}>{err}</p>}
                <p className="mt-1 text-xs text-stone-400 text-center">{label}</p>
              </div>
            ))}
          </div>
        </Campo>

        {/* Estructura */}
        {!cargandoCatalogo && tiposEstructura.length > 0 && (
          <Campo label="Tipo de estructura">
            <div className="grid grid-cols-2 gap-2">
              {tiposEstructura.map((e) => (
                <button key={e.id} type="button" onClick={() => setTipoEstructuraId(e.id)}
                  className={['tactil rounded-lg border px-3 py-2.5 text-left text-xs transition-all',
                    tipoEstructuraId === e.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-600 hover:border-stone-300',
                  ].join(' ')}
                >
                  <span className="font-medium">{e.nombre}</span>
                </button>
              ))}
            </div>
          </Campo>
        )}

        {/* Color estructura (si premium) */}
        {esPremium && estructura && estructura.colores_premium.length > 0 && (
          <Campo label="Color de estructura">
            <Select
              value={acabadoEstructura ?? ''}
              onChange={setAcabadoEstructura}
              options={estructura.colores_premium.map((c) => ({ value: c, label: c }))}
            />
          </Campo>
        )}

        {/* Fachada */}
        {!cargandoCatalogo && tiposFachada.length > 0 && (
          <Campo label="Tipo de fachada">
            <div className="grid grid-cols-3 gap-2">
              {tiposFachada.map((f) => (
                <button key={f.id} type="button" onClick={() => setTipoFachadaId(f.id)}
                  className={['tactil rounded-lg border px-3 py-2.5 text-xs font-medium transition-all',
                    tipoFachadaId === f.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-600 hover:border-stone-300',
                  ].join(' ')}
                >
                  {f.nombre}
                </button>
              ))}
            </div>
          </Campo>
        )}

        {/* Subcategoría y acabado */}
        {subcategorias.length > 0 && (
          <Campo label="Subcategoría de acabado">
            <Select value={subcategoriaId} onChange={setSubcategoriaId}
              options={subcategorias.map((s) => ({
                value: s.id,
                label: s.nombre + (s.tipo_ajuste !== 'ninguno' ? ` (${s.tipo_ajuste === 'recargo' ? '+' : '−'}${s.ajuste_pct}%)` : ''),
              }))}
            />
          </Campo>
        )}
        {acabados.length > 0 && (
          <Campo label="Acabado de fachada">
            <Select value={acabadoId} onChange={setAcabadoId}
              options={acabados.map((a) => ({ value: a.id, label: a.nombre }))}
            />
          </Campo>
        )}

        {/* Color vidrio (aluminio-vidrio) */}
        {esAluminioVidrio && (
          <Campo label="Color de vidrio">
            <input value={colorVidrio ?? ''} onChange={(e) => setColorVidrio(e.target.value || null)}
              placeholder="Ej: Claro, bronce, azul…" className={inputCls} />
          </Campo>
        )}

        {/* Precio de lista base (pasa por el motor, igual que un módulo del catálogo) */}
        <Campo label="Precio de lista Delben (COP)" nota="precio base de catálogo">
          <input type="number" value={precioDelbenStr}
            onChange={(e) => setPrecioDelbenStr(e.target.value)}
            placeholder="0" min={0} className={inputCls} />
          {errores.precioDelben && <p className={errorCls}>{errores.precioDelben}</p>}
          {costoDelben > 0 && (
            <p className="mt-1.5 text-xs text-stone-500">
              Costo Delben (con descuento + servicios):{' '}
              <span className="font-semibold">{formatCOP(costoDelben)}</span>
            </p>
          )}
          {precioClienteCalculado > 0 && (
            <p className="mt-0.5 text-xs text-stone-500">
              Precio al cliente calculado: <span className="font-semibold">{formatCOP(precioClienteCalculado)}</span>
            </p>
          )}
        </Campo>

        {/* Herrajes */}
        <Campo label="Herrajes" nota="opcional">
          <div className="relative mb-2">
            <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" weight="bold" />
            <input
              ref={herrajeRef}
              value={busquedaHerraje}
              onChange={(e) => setBusquedaHerraje(e.target.value)}
              placeholder="Buscar herraje…"
              className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-stone-300 focus:bg-white transition-all"
            />
            {buscandoHerraje && (
              <CircleNotch size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 animate-spin" />
            )}
          </div>
          {resultadosHerraje.length > 0 && (
            <div className="mb-2 rounded-lg border border-stone-200 bg-white shadow-sm divide-y divide-stone-100 max-h-40 overflow-y-auto">
              {resultadosHerraje.map((a) => (
                <button key={a.id} type="button" onClick={() => agregarHerrajeLocal(a)}
                  className="tactil w-full flex items-center justify-between px-3 py-2 text-left hover:bg-stone-50 transition-colors"
                >
                  <p className="text-xs font-medium text-stone-800 truncate">{a.nombre}</p>
                  <Plus size={12} weight="bold" className="text-stone-400 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          )}
          {herrajes.length > 0 && (
            <div className="space-y-1.5">
              {herrajes.map((h) => (
                <div key={h.accesorioId} className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
                  <p className="flex-1 min-w-0 text-xs font-medium text-stone-700 truncate">{h.nombre}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => setHerrajes((p) => p.map((x) => x.accesorioId === h.accesorioId ? { ...x, cantidad: Math.max(0.1, parseFloat((x.cantidad - 0.5).toFixed(4))) } : x))}
                      className="tactil flex h-6 w-6 items-center justify-center rounded-md text-stone-400 hover:bg-stone-200 transition-colors"
                    >
                      <Minus size={10} weight="bold" />
                    </button>
                    <input
                      type="number"
                      min="0.1"
                      step="0.5"
                      value={h.cantidad}
                      onChange={(e) => {
                        const n = parseFloat(e.target.value)
                        if (!isNaN(n) && n > 0)
                          setHerrajes((p) => p.map((x) => x.accesorioId === h.accesorioId ? { ...x, cantidad: parseFloat(n.toFixed(4)) } : x))
                      }}
                      className="w-10 text-center text-xs font-semibold text-stone-700 bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button type="button" onClick={() => setHerrajes((p) => p.map((x) => x.accesorioId === h.accesorioId ? { ...x, cantidad: parseFloat((x.cantidad + 0.5).toFixed(4)) } : x))}
                      className="tactil flex h-6 w-6 items-center justify-center rounded-md text-stone-400 hover:bg-stone-200 transition-colors"
                    >
                      <Plus size={10} weight="bold" />
                    </button>
                    <button type="button" onClick={() => setHerrajes((p) => p.filter((x) => x.accesorioId !== h.accesorioId))}
                      className="tactil ml-1 flex h-6 w-6 items-center justify-center rounded-md text-stone-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash size={11} weight="bold" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Campo>

        {/* Cantidad y observaciones */}
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Cantidad">
            <div className="flex items-center gap-1.5">
              <button type="button"
                onClick={() => setCantidadStr(String(Math.max(0.1, parseFloat((cantidad - 0.5).toFixed(4)))))}
                className="tactil flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:bg-stone-50 transition-colors"
              >
                <Minus size={12} weight="bold" />
              </button>
              <input
                type="text"
                inputMode="decimal"
                value={cantidadStr}
                onChange={(e) => setCantidadStr(e.target.value)}
                onBlur={() => {
                  const v = parseFloat(cantidadStr)
                  setCantidadStr(String(isNaN(v) || v < 0.1 ? 0.1 : parseFloat(v.toFixed(4))))
                }}
                className="flex-1 min-w-0 text-center text-sm font-semibold text-stone-900 border border-stone-200 rounded-lg py-2 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
              />
              <button type="button"
                onClick={() => setCantidadStr(String(parseFloat((cantidad + 0.5).toFixed(4))))}
                className="tactil flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:bg-stone-50 transition-colors"
              >
                <Plus size={12} weight="bold" />
              </button>
            </div>
          </Campo>
          <Campo label="Observaciones">
            <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Opcional" className={inputCls} />
          </Campo>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-stone-100 px-6 py-4 bg-white">
        <button type="button" onClick={handleAgregar}
          className="tactil w-full rounded-lg bg-caoba-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-caoba-700 flex items-center justify-center gap-2"
        >
          <Sparkle size={14} weight="fill" />
          Agregar especial al carrito
        </button>
      </div>
    </div>
  )
}

// ─── Banner de imagen del módulo ─────────────────────────────────────────────

function BannerModulo({ url, nombre }: { url: string | null; nombre: string }) {
  const [imgError, setImgError] = useState(false)
  if (url && !imgError) {
    return (
      <div className="shrink-0 bg-stone-50 border-b border-stone-100">
        <img
          src={url}
          alt={nombre}
          onError={() => setImgError(true)}
          className="w-full h-44 object-contain"
        />
      </div>
    )
  }
  return (
    <div className="shrink-0 h-24 bg-stone-100 border-b border-stone-100 flex items-center justify-center">
      <span className="text-3xl font-bold text-stone-300">{nombre.slice(0, 2).toUpperCase()}</span>
    </div>
  )
}

// ─── Panel de configuración de módulo (solo modo agregar) ─────────────────────

function PanelConfigModulo({
  modulo,
  onCrearEspecial,
}: {
  modulo: Modulo
  onCrearEspecial?: (ref: ReferenciaEspecial) => void
}) {
  const agregarItem = useCarrito((s) => s.agregarItem)
  const cotizacionInfo = useCarrito((s) => s.cotizacionInfo)

  const [tiposEstructura, setTiposEstructura] = useState<TipoEstructura[]>([])
  const [tiposFachada, setTiposFachada] = useState<TipoFachada[]>([])
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([])
  const [acabados, setAcabados] = useState<Acabado[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [precios, setPrecios] = useState<Precio[]>([])
  const [variantes, setVariantes] = useState<Modulo[]>([])
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true)
  const [cargandoPrecios, setCargandoPrecios] = useState(false)
  const [errorPrecios, setErrorPrecios] = useState<string | null>(null)

  const [alturaSeleccionada, setAlturaSeleccionada] = useState<number | null>(null)
  const [profundidadSeleccionada, setProfundidadSeleccionada] = useState<number | null>(null)
  const [moduloActual, setModuloActual] = useState<Modulo | null>(null)

  const [tipoEstructuraId, setTipoEstructuraId] = useState('')
  const [tipoFachadaId, setTipoFachadaId] = useState('')
  const [subcategoriaId, setSubcategoriaId] = useState('')
  const [acabadoId, setAcabadoId] = useState('')
  const [acabadoEstructura, setAcabadoEstructura] = useState<string | null>(null)
  const [colorVidrio, setColorVidrio] = useState<string | null>(null)
  const [colorMetal, setColorMetal] = useState<string | null>(null)
  const [cantidadStr, setCantidadStr] = useState('1')
  const cantidad = Math.max(0.1, parseFloat(cantidadStr) || 0.1)
  const [observaciones, setObservaciones] = useState('')

  const [herrajesBorrador, setHerrajesBorrador] = useState<
    { accesorio: Accesorio; cantidad: number }[]
  >([])
  const [busquedaHerraje, setBusquedaHerraje] = useState('')
  const [resultadosHerraje, setResultadosHerraje] = useState<Accesorio[]>([])
  const [buscandoHerraje, setBuscandoHerraje] = useState(false)
  const busquedaRef = useRef<HTMLInputElement>(null)

  // Carga inicial al montar (key={modulo.id} garantiza instancia nueva por módulo)
  useEffect(() => {
    setCargandoCatalogo(true)
    const reqEstr = modulo.requiere_estructura ?? true
    const reqFach = modulo.requiere_fachada ?? true

    Promise.all([
      getTiposEstructura(),
      getTiposFachada(),
      getCategorias(),
      getVariantesModulo(modulo.nombre),
    ]).then(([estructuras, fachadas, cats, vars]) => {
      setTiposEstructura(estructuras)
      setTiposFachada(fachadas)
      setCategorias(cats)
      setVariantes(vars)

      if (reqEstr && estructuras[0]) setTipoEstructuraId(estructuras[0].id)
      else if (!reqEstr) setTipoEstructuraId('sin-estructura')
      if (reqFach && fachadas[0]) setTipoFachadaId(fachadas[0].id)
      else if (!reqFach) setTipoFachadaId('sin-fachada')

      const varActual = vars.find((v) => v.id === modulo.id) ?? vars[0]
      if (varActual) {
        setAlturaSeleccionada(varActual.altura)
        setProfundidadSeleccionada(varActual.profundidad)
        setModuloActual(varActual)
      }

      setCargandoCatalogo(false)
    })
  }, [modulo.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (alturaSeleccionada === null || profundidadSeleccionada === null || variantes.length === 0) return
    const variante = variantes.find(
      (v) => v.altura === alturaSeleccionada && v.profundidad === profundidadSeleccionada,
    )
    if (!variante) return
    setModuloActual(variante)
    setPrecios([])
    setErrorPrecios(null)
    setCargandoPrecios(true)
    getPreciosModulo(variante.id)
      .then((ps) => {
        setPrecios(ps)
      })
      .catch((err) => {
        console.error('[BuscadorModulos] Error cargando precios:', err)
        const msg = (err as { code?: string })?.code === 'permission-denied'
          ? 'Sin permiso para leer precios. Contacta al administrador.'
          : 'Error al cargar precios. Intenta de nuevo.'
        setErrorPrecios(msg)
      })
      .finally(() => setCargandoPrecios(false))
  }, [alturaSeleccionada, profundidadSeleccionada, variantes])

  useEffect(() => {
    if (!tipoFachadaId || tipoFachadaId === 'sin-fachada') return
    setSubcategorias([])
    setSubcategoriaId('')
    setAcabadoId('')
    setColorVidrio(null)
    setColorMetal(null)
    getSubcategorias(tipoFachadaId).then((subs) => {
      setSubcategorias(subs)
      if (subs[0]) setSubcategoriaId(subs[0].id)
    })
  }, [tipoFachadaId])

  useEffect(() => {
    if (!subcategoriaId) return
    setAcabados([])
    setAcabadoId('')
    getAcabados(subcategoriaId).then((abs) => {
      setAcabados(abs)
      if (abs[0]) setAcabadoId(abs[0].id)
    })
  }, [subcategoriaId])

  useEffect(() => {
    const est = tiposEstructura.find((e) => e.id === tipoEstructuraId)
    if (est?.es_premium) {
      setAcabadoEstructura(est.colores_premium[0] ?? null)
    } else {
      setAcabadoEstructura(null)
    }
  }, [tipoEstructuraId, tiposEstructura])

  useEffect(() => {
    if (busquedaHerraje.trim().length < 2) {
      setResultadosHerraje([])
      return
    }
    let cancelado = false
    setBuscandoHerraje(true)
    const modalidad = cotizacionInfo?.modalidad ?? 'desarmado'
    const timer = setTimeout(async () => {
      try {
        const res = await buscarAccesorios(busquedaHerraje, modalidad)
        if (!cancelado) setResultadosHerraje(res.slice(0, 8))
      } finally {
        if (!cancelado) setBuscandoHerraje(false)
      }
    }, 300)
    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [busquedaHerraje, cotizacionInfo?.modalidad])

  const requiereFachada = modulo.requiere_fachada ?? true
  const requiereEstructura = modulo.requiere_estructura ?? true

  const estructura = tiposEstructura.find((e) => e.id === tipoEstructuraId)
  const fachada = tiposFachada.find((f) => f.id === tipoFachadaId)
  const subcategoria = subcategorias.find((s) => s.id === subcategoriaId) ?? null
  const esAluminioVidrio = fachada?.es_aluminio_vidrio ?? false
  const esPremium = estructura?.es_premium ?? false

  const alturasDisponibles = [...new Set(variantes.map((v) => v.altura))].sort((a, b) => a - b)
  const profundidadesDisponibles = alturaSeleccionada !== null
    ? [...new Set(
        variantes.filter((v) => v.altura === alturaSeleccionada).map((v) => v.profundidad),
      )].sort((a, b) => a - b)
    : []
  const hayVarianteSeleccionada =
    alturaSeleccionada !== null &&
    profundidadSeleccionada !== null &&
    variantes.some(
      (v) => v.altura === alturaSeleccionada && v.profundidad === profundidadSeleccionada,
    )

  const precioActual = (!cargandoPrecios && tipoEstructuraId && tipoFachadaId)
    ? precios.find(
        (p) => p.tipo_estructura_id === tipoEstructuraId && p.tipo_fachada_id === tipoFachadaId,
      )
    : undefined

  // Debug: log mismatch cuando hay precios pero no coincide la combinación seleccionada
  if (!cargandoPrecios && !errorPrecios && hayVarianteSeleccionada && precios.length > 0 && !precioActual) {
    console.warn('[BuscadorModulos] Sin match precio. Buscando:', tipoEstructuraId, '×', tipoFachadaId,
      '| Disponibles:', precios.map(p => `${p.tipo_estructura_id}×${p.tipo_fachada_id}`))
  }

  const listo =
    !cargandoCatalogo &&
    !cargandoPrecios &&
    !errorPrecios &&
    !!precioActual &&
    hayVarianteSeleccionada &&
    (!requiereFachada || (!!subcategoriaId && !!acabadoId)) &&
    (!esPremium || !!acabadoEstructura)

  function handleAgregar() {
    if (!moduloActual || !listo || !precioActual) return

    const precio = precioActual

    const categoria = categorias.find((c) => c.id === moduloActual.categoria_id)
    if (!categoria) return

    const subcategoriaEfectiva: Subcategoria = requiereFachada && subcategoria
      ? subcategoria
      : {
          id: 'sin-fachada',
          tipo_fachada_id: 'sin-fachada',
          nombre: 'Sin fachada',
          tipo_ajuste: 'ninguno',
          ajuste_pct: 0,
          es_premium: false,
          activo: true,
        }

    const acabadoEfectivo = requiereFachada ? acabados.find((a) => a.id === acabadoId) : null
    if (requiereFachada && !acabadoEfectivo) return

    const config: ConfiguracionItem = {
      tipoEstructuraId,
      tipoEstructuraNombre: requiereEstructura ? (estructura?.nombre ?? '') : 'Sin estructura',
      tipoFachadaId,
      tipoFachadaNombre: requiereFachada ? (fachada?.nombre ?? '') : 'Sin fachada',
      subcategoriaId: subcategoriaEfectiva.id,
      subcategoriaNombre: subcategoriaEfectiva.nombre,
      acabadoId: acabadoEfectivo?.id ?? 'sin-fachada',
      acabadoNombre: acabadoEfectivo?.nombre ?? '',
      acabadoEstructura: esPremium ? acabadoEstructura : null,
      colorVidrio: esAluminioVidrio ? colorVidrio : null,
      colorMetal: esAluminioVidrio ? colorMetal : null,
      altura: moduloActual.altura,
      profundidad: moduloActual.profundidad,
      cantidad,
      observaciones,
    }

    agregarItem(
      moduloActual,
      config,
      subcategoriaEfectiva,
      precio.precio_cop,
      {
        id: categoria.id,
        desc_base_pct: categoria.desc_desarmado_base_pct,
        desc_premium_pct: categoria.desc_desarmado_premium_pct,
      },
      herrajesBorrador,
    )
  }

  function agregarHerrajeLocal(accesorio: Accesorio) {
    setHerrajesBorrador((prev) => {
      const existente = prev.find((h) => h.accesorio.id === accesorio.id)
      if (existente) {
        return prev.map((h) =>
          h.accesorio.id === accesorio.id ? { ...h, cantidad: h.cantidad + 1 } : h,
        )
      }
      return [...prev, { accesorio, cantidad: 1 }]
    })
    setBusquedaHerraje('')
    setResultadosHerraje([])
    busquedaRef.current?.focus()
  }

  function cambiarCantidadHerraje(id: string, delta: number) {
    setHerrajesBorrador((prev) =>
      prev
        .map((h) =>
          h.accesorio.id === id
            ? { ...h, cantidad: Math.max(0.1, parseFloat((h.cantidad + delta).toFixed(4))) }
            : h,
        )
        .filter((h) => h.cantidad > 0),
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Module header */}
      <BannerModulo url={modulo.imagen_url} nombre={modulo.nombre} />
      <div className="shrink-0 px-6 pt-4 pb-4 border-b border-stone-100">
        <p className="text-xs font-medium text-stone-400 tracking-wide uppercase mb-0.5">
          {modulo.tipologia}
        </p>
        <h3 className="text-base font-semibold text-stone-900 leading-snug">{modulo.nombre}</h3>
      </div>

      {/* Scrollable form */}
      {cargandoCatalogo ? (
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 rounded-lg skeleton" />
            <div className="h-10 rounded-lg skeleton" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-28 rounded skeleton" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-9 rounded-lg skeleton" />
              <div className="h-9 rounded-lg skeleton" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-28 rounded skeleton" />
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-9 rounded-lg skeleton" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-36 rounded skeleton" />
            <div className="h-10 rounded-lg skeleton" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-40 rounded skeleton" />
            <div className="flex gap-2 flex-wrap">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-7 w-20 rounded-full skeleton" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Dimensiones */}
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Alto (mm)">
              <Select
                value={alturaSeleccionada?.toString() ?? ''}
                onChange={(v) => {
                  const nuevaAltura = Number(v)
                  setAlturaSeleccionada(nuevaAltura)
                  const profsDisponibles = [
                    ...new Set(
                      variantes
                        .filter((va) => va.altura === nuevaAltura)
                        .map((va) => va.profundidad),
                    ),
                  ].sort((a, b) => a - b)
                  if (!profsDisponibles.includes(profundidadSeleccionada ?? -1)) {
                    setProfundidadSeleccionada(profsDisponibles[0] ?? null)
                  }
                }}
                options={alturasDisponibles.map((a) => ({
                  value: a.toString(),
                  label: `${a} mm`,
                }))}
              />
            </Campo>
            <Campo label="Prof. (mm)">
              <Select
                value={profundidadSeleccionada?.toString() ?? ''}
                onChange={(v) => setProfundidadSeleccionada(Number(v))}
                options={profundidadesDisponibles.map((p) => ({
                  value: p.toString(),
                  label: `${p} mm`,
                }))}
                disabled={profundidadesDisponibles.length === 0}
              />
            </Campo>
          </div>

          {/* Tipo de estructura */}
          {requiereEstructura && (
            <Campo label="Tipo de estructura">
              <div className="grid grid-cols-2 gap-2">
                {tiposEstructura.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setTipoEstructuraId(e.id)}
                    className={[
                      'tactil rounded-lg border px-3 py-2.5 text-left text-xs transition-all',
                      tipoEstructuraId === e.id
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300',
                    ].join(' ')}
                  >
                    <span className="font-medium">{e.nombre}</span>
                  </button>
                ))}
              </div>
            </Campo>
          )}

          {/* Tipo de fachada */}
          {requiereFachada && (
            <Campo label="Tipo de fachada">
              <div className="grid grid-cols-3 gap-2">
                {tiposFachada.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTipoFachadaId(f.id)}
                    className={[
                      'tactil rounded-lg border px-3 py-2.5 text-xs font-medium transition-all',
                      tipoFachadaId === f.id
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300',
                    ].join(' ')}
                  >
                    {f.nombre}
                  </button>
                ))}
              </div>
            </Campo>
          )}

          {/* Subcategoría */}
          {requiereFachada && subcategorias.length > 0 && (
            <Campo label="Subcategoría de acabado">
              <Select
                value={subcategoriaId}
                onChange={setSubcategoriaId}
                options={subcategorias.map((s) => ({
                  value: s.id,
                  label:
                    s.nombre +
                    (s.tipo_ajuste !== 'ninguno'
                      ? ` (${s.tipo_ajuste === 'recargo' ? '+' : '−'}${s.ajuste_pct}%)`
                      : ''),
                }))}
              />
            </Campo>
          )}

          {/* Acabado */}
          {requiereFachada && acabados.length > 0 && (
            <Campo label="Acabado / color de fachada">
              <div className="flex flex-wrap gap-2">
                {acabados.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAcabadoId(a.id)}
                    className={[
                      'tactil rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                      acabadoId === a.id
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300',
                    ].join(' ')}
                  >
                    {a.nombre}
                  </button>
                ))}
              </div>
            </Campo>
          )}

          {/* Color de estructura premium */}
          {esPremium && estructura && estructura.colores_premium.length > 0 && (
            <Campo label="Color de estructura" nota="Solo si estructura Premium">
              <Select
                value={acabadoEstructura ?? ''}
                onChange={setAcabadoEstructura}
                options={estructura.colores_premium.map((c) => ({ value: c, label: c }))}
              />
            </Campo>
          )}

          {/* Color vidrio + metal */}
          {esAluminioVidrio && fachada && (
            <>
              {fachada.colores_vidrio.length > 0 && (
                <Campo label="Color de vidrio">
                  <Select
                    value={colorVidrio ?? ''}
                    onChange={setColorVidrio}
                    options={fachada.colores_vidrio.map((c) => ({ value: c, label: c }))}
                  />
                </Campo>
              )}
              {fachada.colores_metal.length > 0 && (
                <Campo label="Color de metal / perfil">
                  <Select
                    value={colorMetal ?? ''}
                    onChange={setColorMetal}
                    options={fachada.colores_metal.map((c) => ({ value: c, label: c }))}
                  />
                </Campo>
              )}
            </>
          )}

          {/* Cantidad */}
          <Campo label="Cantidad">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCantidadStr(String(Math.max(0.1, parseFloat((cantidad - 0.5).toFixed(4)))))}
                className="tactil flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors text-lg font-medium"
              >
                −
              </button>
              <input
                type="text"
                inputMode="decimal"
                value={cantidadStr}
                onChange={(e) => setCantidadStr(e.target.value)}
                onBlur={() => {
                  const v = parseFloat(cantidadStr)
                  setCantidadStr(String(isNaN(v) || v < 0.1 ? 0.1 : parseFloat(v.toFixed(4))))
                }}
                className="w-16 text-center text-sm font-semibold text-stone-900 border border-stone-200 rounded-lg py-2 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setCantidadStr(String(parseFloat((cantidad + 0.5).toFixed(4))))}
                className="tactil flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors text-lg font-medium"
              >
                +
              </button>
            </div>
          </Campo>

          {/* Observaciones */}
          <Campo label="Observaciones" nota="Opcional">
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas para este módulo…"
              rows={2}
              className="w-full rounded-lg border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all resize-none"
            />
          </Campo>

          {/* Herrajes del módulo */}
          <div className="border-t border-stone-100 pt-5">
            <p className="text-sm font-medium text-stone-700 mb-3">Herrajes del módulo</p>

            <div className="relative mb-3">
              <MagnifyingGlass
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                weight="bold"
              />
              {buscandoHerraje && (
                <CircleNotch
                  size={13}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 animate-spin"
                />
              )}
              <input
                ref={busquedaRef}
                value={busquedaHerraje}
                onChange={(e) => setBusquedaHerraje(e.target.value)}
                placeholder="Buscar herraje (bisagra, corredera…)"
                className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-8 pr-8 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-300 focus:bg-white focus:ring-2 focus:ring-stone-100 transition-colors"
              />
            </div>

            {resultadosHerraje.length > 0 && (
              <div className="mb-3 rounded-lg border border-stone-200 bg-white shadow-sm divide-y divide-stone-100 max-h-48 overflow-y-auto">
                {resultadosHerraje.map((a) => {
                  const modalidad = cotizacionInfo?.modalidad ?? 'desarmado'
                  const p =
                    modalidad === 'tradicional'
                      ? a.precio_tradicional_cop
                      : a.precio_desarmado_cop
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => agregarHerrajeLocal(a)}
                      className="tactil w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-stone-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-stone-800 truncate">{a.nombre}</p>
                        <p className="text-xs text-stone-400">cód. {a.codigo}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {p && <span className="text-xs text-stone-500">{formatCOP(p)}</span>}
                        <Plus size={13} weight="bold" className="text-stone-400" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            {busquedaHerraje.trim().length >= 2 &&
              !buscandoHerraje &&
              resultadosHerraje.length === 0 && (
                <p className="mb-3 text-xs text-stone-400">
                  Sin resultados para &ldquo;{busquedaHerraje}&rdquo;
                </p>
              )}

            {herrajesBorrador.length === 0 ? (
              <p className="text-xs text-stone-400">Sin herrajes para este módulo.</p>
            ) : (
              <div className="space-y-2">
                {herrajesBorrador.map(({ accesorio, cantidad: cant }) => (
                  <div
                    key={accesorio.id}
                    className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2"
                  >
                    <p className="flex-1 min-w-0 text-xs font-medium text-stone-700 truncate">
                      {accesorio.nombre}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => cambiarCantidadHerraje(accesorio.id, -0.5)}
                        className="tactil flex h-6 w-6 items-center justify-center rounded-md text-stone-400 hover:bg-stone-200 transition-colors"
                      >
                        <Minus size={11} weight="bold" />
                      </button>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={cant}
                        onChange={(e) => {
                          const n = parseFloat(e.target.value)
                          if (!isNaN(n) && n > 0)
                            setHerrajesBorrador((prev) =>
                              prev.map((h) =>
                                h.accesorio.id === accesorio.id ? { ...h, cantidad: parseFloat(n.toFixed(4)) } : h,
                              ),
                            )
                        }}
                        className="w-10 text-center text-xs font-semibold text-stone-700 bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => cambiarCantidadHerraje(accesorio.id, 0.5)}
                        className="tactil flex h-6 w-6 items-center justify-center rounded-md text-stone-400 hover:bg-stone-200 transition-colors"
                      >
                        <Plus size={11} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setHerrajesBorrador((prev) =>
                            prev.filter((h) => h.accesorio.id !== accesorio.id),
                          )
                        }
                        className="tactil ml-1 flex h-6 w-6 items-center justify-center rounded-md text-stone-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash size={12} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="shrink-0 border-t border-stone-100 px-6 py-4 bg-white">
        {errorPrecios && (
          <p className="mb-3 text-xs text-red-600">{errorPrecios}</p>
        )}
        {!cargandoCatalogo && !cargandoPrecios && !errorPrecios && !precioActual && hayVarianteSeleccionada && (
          <p className="mb-3 text-xs text-amber-600">
            {precios.length === 0
              ? 'No hay precios importados para este módulo.'
              : 'Sin precio para esta combinación de estructura y fachada.'}
          </p>
        )}
        <button
          type="button"
          onClick={handleAgregar}
          disabled={!listo}
          className="tactil w-full rounded-lg bg-caoba-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-caoba-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {(cargandoCatalogo || cargandoPrecios) && (
            <CircleNotch size={14} className="animate-spin" />
          )}
          Agregar al carrito
        </button>
        {onCrearEspecial && listo && precioActual && moduloActual && (
          <button
            type="button"
            onClick={() =>
              onCrearEspecial({
                nombre: modulo.nombre,
                alto: moduloActual.altura,
                profundidad: moduloActual.profundidad,
                precioBaseRef: precioActual.precio_cop,
                moduloId: modulo.id,
                moduloNombre: modulo.nombre,
                varianteId: moduloActual.id,
                categoriaId: moduloActual.categoria_id,
              })
            }
            className="tactil mt-2 w-full rounded-lg border border-stone-200 px-4 py-2.5 text-xs font-medium text-stone-500 hover:border-stone-300 hover:text-stone-700 transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkle size={12} weight="fill" />
            Usar como referencia para especial
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Panel izquierdo: búsqueda y lista de módulos ─────────────────────────────

function PanelBusquedaModulos({
  moduloSeleccionado,
  onSeleccionar,
}: {
  moduloSeleccionado: Modulo | null
  onSeleccionar: (m: Modulo) => void
}) {
  const categoriaId = useCarrito((s) => s.cotizacionInfo?.categoriaId)
  const categoriaNombre = useCarrito((s) => s.cotizacionInfo?.categoriaNombre)
  const [busqueda, setBusqueda] = useState('')
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoriaIds, setCategoriaIds] = useState<string[] | null | undefined>(undefined)

  useEffect(() => {
    setCategoriaIds(undefined)
    if (!categoriaId) {
      setCategoriaIds(null)
      return
    }
    let cancelado = false
    resolverCategoriasParaMacro(categoriaId)
      .then((ids) => {
        if (!cancelado) setCategoriaIds(ids)
      })
      .catch(() => {
        if (!cancelado) setCategoriaIds(null)
      })
    return () => {
      cancelado = true
    }
  }, [categoriaId])

  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setModulos([])
      return
    }
    let cancelado = false
    setCargando(true)
    setError(null)
    const delay = setTimeout(async () => {
      try {
        // categoriaIds undefined = aún cargando → buscar sin filtro de categoría
        const res = await buscarModulos(busqueda, categoriaIds ?? undefined)
        if (!cancelado) setModulos(res)
      } catch {
        if (!cancelado) setError('No se pudo cargar el catálogo.')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }, 300)
    return () => {
      cancelado = true
      clearTimeout(delay)
    }
  }, [busqueda, categoriaIds])

  return (
    <div className="w-72 shrink-0 flex flex-col border-r border-stone-100 h-full">
      <div className="shrink-0 px-3 py-3 border-b border-stone-100">
        <div className="relative">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            weight="bold"
          />
          <input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={
              categoriaNombre ? `Buscar en ${categoriaNombre}…` : 'Ej: alto cocina, bajo 60…'
            }
            className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2.5 pl-8 pr-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-300 focus:bg-white focus:ring-2 focus:ring-stone-100 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {cargando && (
          <div className="flex items-center justify-center py-10 gap-2 text-stone-400 text-xs">
            <CircleNotch size={13} className="animate-spin" />
            Buscando…
          </div>
        )}
        {!cargando && error && (
          <div className="mx-3 my-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-700">
            {error}
          </div>
        )}
        {!cargando && !error && busqueda.trim().length < 2 && (
          <p className="py-10 text-center text-xs text-stone-400">
            Escribe al menos 2 letras.
          </p>
        )}
        {!cargando && !error && busqueda.trim().length >= 2 && modulos.length === 0 && (
          <p className="py-10 text-center text-xs text-stone-400">Sin resultados.</p>
        )}
        {!cargando &&
          !error &&
          modulos.map((m) => (
            <button
              key={m.id}
              onClick={() => onSeleccionar(m)}
              className={[
                'tactil w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                moduloSeleccionado?.id === m.id
                  ? 'bg-stone-900'
                  : 'hover:bg-stone-50',
              ].join(' ')}
            >
              <ModuloImagen url={m.imagen_url} nombre={m.nombre} size="sm" />
              <div className="flex-1 min-w-0">
                <p
                  className={[
                    'text-xs font-medium leading-snug line-clamp-2',
                    moduloSeleccionado?.id === m.id ? 'text-white' : 'text-stone-800',
                  ].join(' ')}
                >
                  {m.nombre}
                </p>
                <p
                  className={[
                    'text-xs capitalize mt-0.5',
                    moduloSeleccionado?.id === m.id ? 'text-stone-300' : 'text-stone-400',
                  ].join(' ')}
                >
                  {m.tipologia}
                </p>
                {m.precio_min ? (
                  <p className={[
                    'text-xs tabular-nums mt-0.5',
                    moduloSeleccionado?.id === m.id ? 'text-stone-400' : 'text-stone-400',
                  ].join(' ')}>
                    Desde {formatCOP(m.precio_min)}
                  </p>
                ) : null}
              </div>
            </button>
          ))}
      </div>

      <div className="shrink-0 border-t border-stone-100 px-3 py-2.5">
        <p className="text-xs text-stone-400">
          {cargando
            ? 'Buscando…'
            : busqueda.trim().length < 2
              ? 'Catálogo Delben'
              : `${modulos.length} módulo${modulos.length !== 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  )
}

// ─── Panel de herrajes (ancho completo) ───────────────────────────────────────

type HerrajeStagiado = { accesorio: Accesorio; cantidad: number }

function PanelHerrajes() {
  const agregarHerraje = useCarrito((s) => s.agregarHerraje)
  const cerrarBuscador = useCarrito((s) => s.cerrarBuscador)
  const modalidad = useCarrito((s) => s.cotizacionInfo?.modalidad ?? 'desarmado')

  const [busqueda, setBusqueda] = useState('')
  const [accesorios, setAccesorios] = useState<Accesorio[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [staged, setStaged] = useState<HerrajeStagiado[]>([])

  function getCantidad(id: string) {
    return cantidades[id] ?? 1
  }
  function setCantidad(id: string, val: number) {
    setCantidades((prev) => ({ ...prev, [id]: Math.max(0.1, parseFloat(val.toFixed(4))) }))
  }

  function agregarAlStaging(a: Accesorio) {
    const cant = getCantidad(a.id)
    setStaged((prev) => {
      const existente = prev.find((h) => h.accesorio.id === a.id)
      if (existente) {
        return prev.map((h) =>
          h.accesorio.id === a.id
            ? { ...h, cantidad: parseFloat((h.cantidad + cant).toFixed(4)) }
            : h,
        )
      }
      return [...prev, { accesorio: a, cantidad: cant }]
    })
  }

  function setCantidadStaged(id: string, val: number) {
    setStaged((prev) =>
      prev.map((h) =>
        h.accesorio.id === id ? { ...h, cantidad: Math.max(0.1, parseFloat(val.toFixed(4))) } : h,
      ),
    )
  }

  function eliminarDelStaging(id: string) {
    setStaged((prev) => prev.filter((h) => h.accesorio.id !== id))
  }

  function confirmarAgregarAlCarrito() {
    staged.forEach((h) => agregarHerraje(h.accesorio, h.cantidad))
    cerrarBuscador()
  }

  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setAccesorios([])
      return
    }
    let cancelado = false
    setCargando(true)
    setError(null)
    const delay = setTimeout(async () => {
      try {
        const res = await buscarAccesorios(busqueda, modalidad)
        if (!cancelado) setAccesorios(res)
      } catch {
        if (!cancelado) setError('No se pudo cargar el catálogo de herrajes.')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }, 300)
    return () => {
      cancelado = true
      clearTimeout(delay)
    }
  }, [busqueda, modalidad])

  function precio(a: Accesorio): number | null {
    return modalidad === 'tradicional' ? a.precio_tradicional_cop : a.precio_desarmado_cop
  }

  return (
    <div className="flex flex-col h-full">
      {/* Barra de búsqueda */}
      <div className="shrink-0 px-6 py-4 border-b border-stone-100">
        <div className="relative max-w-sm">
          <MagnifyingGlass
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            weight="bold"
          />
          <input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej: bisagra, corredera, jalador…"
            className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-300 focus:bg-white focus:ring-2 focus:ring-stone-100 transition-colors"
          />
        </div>
      </div>

      {/* Resultados de búsqueda */}
      <div className="flex-1 overflow-y-auto px-6 py-2">
        {cargando && (
          <div className="flex items-center justify-center py-16 gap-2 text-stone-400 text-sm">
            <CircleNotch size={16} className="animate-spin" />
            Buscando…
          </div>
        )}
        {!cargando && error && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        )}
        {!cargando && !error && busqueda.trim().length < 2 && staged.length === 0 && (
          <p className="py-16 text-center text-sm text-stone-400">
            Escribe al menos 2 letras para buscar herrajes.
          </p>
        )}
        {!cargando && !error && busqueda.trim().length >= 2 && accesorios.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-400">
            Sin resultados para &ldquo;{busqueda}&rdquo;
          </p>
        )}
        {!cargando && !error && accesorios.length > 0 && (
          <div className="divide-y divide-stone-100">
            {accesorios.map((a) => {
              const p = precio(a)
              const cant = getCantidad(a.id)
              const yaEnStaging = staged.some((h) => h.accesorio.id === a.id)
              return (
                <div key={a.id} className="flex items-center gap-4 py-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-xs font-semibold text-stone-500">
                    {String(a.codigo).slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800">{a.nombre}</p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {p ? formatCOP(p) : 'Sin precio'} · cód. {a.codigo}
                    </p>
                  </div>
                  {p && (
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center rounded-lg border border-stone-200 bg-white overflow-hidden">
                        <button
                          onClick={() => setCantidad(a.id, cant - 0.5)}
                          className="px-2.5 py-2 text-stone-400 hover:bg-stone-50 transition-colors"
                        >
                          <Minus size={12} weight="bold" />
                        </button>
                        <input
                          type="number"
                          min="0.1"
                          step="0.5"
                          value={cant}
                          onChange={(e) => {
                            const n = parseFloat(e.target.value)
                            if (!isNaN(n) && n > 0) setCantidad(a.id, n)
                          }}
                          className="w-10 text-center text-sm font-medium text-stone-700 bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => setCantidad(a.id, cant + 0.5)}
                          className="px-2.5 py-2 text-stone-400 hover:bg-stone-50 transition-colors"
                        >
                          <Plus size={12} weight="bold" />
                        </button>
                      </div>
                      <button
                        onClick={() => agregarAlStaging(a)}
                        className={[
                          'tactil rounded-lg px-4 py-2 text-xs font-semibold transition-colors',
                          yaEnStaging
                            ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            : 'bg-caoba-600 text-white hover:bg-caoba-700',
                        ].join(' ')}
                      >
                        {yaEnStaging ? '+ Sumar' : 'Seleccionar'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Lista de herrajes seleccionados (staging) */}
        {staged.length > 0 && (
          <div className="mt-4 border-t border-stone-100 pt-4">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
              Seleccionados ({staged.length})
            </p>
            <div className="space-y-2">
              {staged.map((h) => {
                const p = precio(h.accesorio)
                return (
                  <div
                    key={h.accesorio.id}
                    className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-stone-800 truncate">{h.accesorio.nombre}</p>
                      {p && (
                        <p className="text-xs text-stone-400 tabular-nums">
                          {formatCOP(p * h.cantidad)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setCantidadStaged(h.accesorio.id, h.cantidad - 0.5)}
                        className="tactil flex h-6 w-6 items-center justify-center rounded-md text-stone-400 hover:bg-stone-200 transition-colors"
                      >
                        <Minus size={10} weight="bold" />
                      </button>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={h.cantidad}
                        onChange={(e) => {
                          const n = parseFloat(e.target.value)
                          if (!isNaN(n) && n > 0) setCantidadStaged(h.accesorio.id, n)
                        }}
                        className="w-10 text-center text-xs font-semibold text-stone-700 bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => setCantidadStaged(h.accesorio.id, h.cantidad + 0.5)}
                        className="tactil flex h-6 w-6 items-center justify-center rounded-md text-stone-400 hover:bg-stone-200 transition-colors"
                      >
                        <Plus size={10} weight="bold" />
                      </button>
                      <button
                        onClick={() => eliminarDelStaging(h.accesorio.id)}
                        className="tactil ml-1 flex h-6 w-6 items-center justify-center rounded-md text-stone-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash size={11} weight="bold" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-stone-100 px-6 py-3 flex items-center justify-between gap-4">
        <p className="text-xs text-stone-400">
          {cargando
            ? 'Buscando…'
            : busqueda.trim().length < 2
              ? `Herrajes · modalidad ${modalidad}`
              : `${accesorios.length} herraje${accesorios.length !== 1 ? 's' : ''}`}
        </p>
        {staged.length > 0 && (
          <button
            onClick={confirmarAgregarAlCarrito}
            className="tactil flex items-center gap-2 rounded-lg bg-caoba-600 px-4 py-2 text-xs font-semibold text-white hover:bg-caoba-700 transition-colors"
          >
            <Plus size={12} weight="bold" />
            Agregar {staged.length} al carrito
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Buscador principal ───────────────────────────────────────────────────────

export function BuscadorModulos() {
  const cerrarBuscador = useCarrito((s) => s.cerrarBuscador)
  const [tab, setTab] = useState<Tab>('modulos')
  const [moduloSeleccionado, setModuloSeleccionado] = useState<Modulo | null>(null)
  const [panelDerecho, setPanelDerecho] = useState<'catalogo' | 'especial'>('catalogo')
  const [refEspecial, setRefEspecial] = useState<ReferenciaEspecial | null>(null)

  function handleTabChange(t: Tab) {
    setTab(t)
    setModuloSeleccionado(null)
    setPanelDerecho('catalogo')
    setRefEspecial(null)
  }

  function handleCrearEspecial(ref: ReferenciaEspecial) {
    setRefEspecial(ref)
    setPanelDerecho('especial')
  }

  function handleCrearEspecialSinRef() {
    setRefEspecial(null)
    setPanelDerecho('especial')
  }

  function handleVolverCatalogo() {
    setPanelDerecho('catalogo')
    setRefEspecial(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/75" onClick={cerrarBuscador} />

      <div className="relative w-full max-w-5xl h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-aparecer">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-4 border-b border-stone-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-stone-900 mr-auto">Agregar producto</h2>

          <div className="flex items-center rounded-lg bg-stone-100 p-1 gap-0.5">
            {(['modulos', 'herrajes'] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={[
                  'rounded-md px-4 py-1.5 text-xs font-semibold transition-all',
                  tab === t
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700',
                ].join(' ')}
              >
                {t === 'modulos' ? 'Módulos' : 'Herrajes'}
              </button>
            ))}
          </div>

          <button
            onClick={cerrarBuscador}
            className="tactil rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {tab === 'modulos' ? (
            <>
              <PanelBusquedaModulos
                moduloSeleccionado={moduloSeleccionado}
                onSeleccionar={(m) => {
                  setModuloSeleccionado(m)
                  setPanelDerecho('catalogo')
                }}
              />
              <div className="flex-1 border-l border-stone-100 overflow-hidden">
                {panelDerecho === 'especial' ? (
                  <PanelEspecial
                    referencia={refEspecial}
                    onVolver={handleVolverCatalogo}
                  />
                ) : moduloSeleccionado ? (
                  <PanelConfigModulo
                    key={moduloSeleccionado.id}
                    modulo={moduloSeleccionado}
                    onCrearEspecial={handleCrearEspecial}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-6">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center mb-4 mx-auto">
                        <Package size={22} className="text-stone-400" />
                      </div>
                      <p className="text-sm font-medium text-stone-600">Selecciona un módulo</p>
                      <p className="mt-1.5 text-xs text-stone-400 max-w-[200px] leading-relaxed">
                        Busca en el catálogo y haz clic en el módulo que quieres configurar.
                      </p>
                    </div>
                    <div className="w-full max-w-[220px]">
                      <div className="border-t border-stone-100 pt-6">
                        <p className="text-xs text-stone-400 mb-3">¿Mueble a medida?</p>
                        <button
                          type="button"
                          onClick={handleCrearEspecialSinRef}
                          className="tactil w-full flex items-center justify-center gap-2 rounded-lg border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-600 hover:border-stone-300 hover:bg-stone-50 transition-all"
                        >
                          <Sparkle size={13} weight="fill" />
                          Crear módulo especial
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-hidden">
              <PanelHerrajes />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
