'use client'

import { useState, useEffect, useRef } from 'react'
import { X, CaretDown, CircleNotch, MagnifyingGlass, Plus, Minus, Trash } from '@phosphor-icons/react'
import { useCarrito } from '@/store/carrito'
import type { ConfiguracionItem } from '@/store/carrito'
import { ModuloImagen } from './modulo-imagen'
import {
  getTiposEstructura,
  getTiposFachada,
  getSubcategorias,
  getAcabados,
  getCategorias,
} from '@/lib/firestore/catalogo'
import { getPreciosModulo, getVariantesModulo, buscarAccesorios } from '@/lib/firestore/modulos'
import { formatCOP } from '@/lib/datos-demo'
import type {
  TipoEstructura,
  TipoFachada,
  Subcategoria,
  Acabado,
  Categoria,
  Precio,
  Accesorio,
  Modulo,
} from '@/lib/firebase/tipos-firestore'


export function FichaModulo() {
  const moduloPendiente = useCarrito((s) => s.moduloPendiente)
  const itemEditando = useCarrito((s) => s.itemEditando)
  const cerrarFicha = useCarrito((s) => s.cerrarFicha)
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

  // Selección de dimensiones
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

  // Herrajes del módulo
  const [herrajesBorrador, setHerrajesBorrador] = useState<
    { accesorio: Accesorio; cantidad: number }[]
  >([])
  const [busquedaHerraje, setBusquedaHerraje] = useState('')
  const [resultadosHerraje, setResultadosHerraje] = useState<Accesorio[]>([])
  const [buscandoHerraje, setBuscandoHerraje] = useState(false)
  const busquedaRef = useRef<HTMLInputElement>(null)

  // Pending refs para pre-rellenar el formulario en modo edición
  const pendingSubcategoriaId = useRef<string | null>(null)
  const pendingAcabadoId = useRef<string | null>(null)
  const pendingColorVidrio = useRef<string | null>(null)
  const pendingColorMetal = useRef<string | null>(null)
  const pendingAcabadoEstructura = useRef<string | null>(null)

  // Carga inicial: catálogo base + variantes del módulo
  useEffect(() => {
    if (!moduloPendiente) return
    setCargandoCatalogo(true)
    setBusquedaHerraje('')
    setResultadosHerraje([])

    if (itemEditando) {
      // Pre-rellenar refs para que los efectos reactivos los consuman al cargar
      pendingSubcategoriaId.current = itemEditando.config.subcategoriaId
      pendingAcabadoId.current = itemEditando.config.acabadoId
      pendingColorVidrio.current = itemEditando.config.colorVidrio
      pendingColorMetal.current = itemEditando.config.colorMetal
      pendingAcabadoEstructura.current = itemEditando.config.acabadoEstructura
      setCantidadStr(String(itemEditando.config.cantidad))
      setObservaciones(itemEditando.config.observaciones)
      setHerrajesBorrador(
        itemEditando.herrajesAsociados.map((h) => ({ accesorio: h.accesorio, cantidad: h.cantidad })),
      )
    } else {
      setHerrajesBorrador([])
    }

    const reqEstr = itemEditando
      ? itemEditando.config.tipoEstructuraId !== 'sin-estructura'
      : (moduloPendiente.requiere_estructura ?? true)
    const reqFach = itemEditando
      ? itemEditando.config.tipoFachadaId !== 'sin-fachada'
      : (moduloPendiente.requiere_fachada ?? true)

    Promise.all([
      getTiposEstructura(),
      getTiposFachada(),
      getCategorias(),
      getVariantesModulo(moduloPendiente.nombre),
    ]).then(([estructuras, fachadas, cats, vars]) => {
      setTiposEstructura(estructuras)
      setTiposFachada(fachadas)
      setCategorias(cats)
      setVariantes(vars)

      if (itemEditando) {
        setTipoEstructuraId(itemEditando.config.tipoEstructuraId)
        setTipoFachadaId(itemEditando.config.tipoFachadaId)
        const varActual =
          vars.find((v) => v.id === moduloPendiente.id) ??
          vars.find(
            (v) =>
              v.altura === itemEditando.config.altura &&
              v.profundidad === itemEditando.config.profundidad,
          ) ??
          vars[0]
        if (varActual) {
          setAlturaSeleccionada(varActual.altura)
          setProfundidadSeleccionada(varActual.profundidad)
          setModuloActual(varActual)
        }
      } else {
        if (reqEstr && estructuras[0]) setTipoEstructuraId(estructuras[0].id)
        else if (!reqEstr) setTipoEstructuraId('sin-estructura')
        if (reqFach && fachadas[0]) setTipoFachadaId(fachadas[0].id)
        else if (!reqFach) setTipoFachadaId('sin-fachada')
        const varActual = vars.find((v) => v.id === moduloPendiente.id) ?? vars[0]
        if (varActual) {
          setAlturaSeleccionada(varActual.altura)
          setProfundidadSeleccionada(varActual.profundidad)
          setModuloActual(varActual)
        }
      }

      setCargandoCatalogo(false)
    })
  }, [moduloPendiente?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Al cambiar dimensiones → buscar variante coincidente y cargar sus precios
  useEffect(() => {
    if (alturaSeleccionada === null || profundidadSeleccionada === null || variantes.length === 0)
      return
    const variante = variantes.find(
      (v) => v.altura === alturaSeleccionada && v.profundidad === profundidadSeleccionada,
    )
    if (!variante) return
    setModuloActual(variante)
    getPreciosModulo(variante.id).then(setPrecios)
  }, [alturaSeleccionada, profundidadSeleccionada, variantes])

  // Subcategorías reactivas al cambio de fachada
  useEffect(() => {
    if (!tipoFachadaId || tipoFachadaId === 'sin-fachada') return
    setSubcategorias([])
    setSubcategoriaId('')
    setAcabadoId('')
    setColorVidrio(null)
    setColorMetal(null)
    getSubcategorias(tipoFachadaId).then((subs) => {
      setSubcategorias(subs)
      // Restaurar color vidrio/metal pendiente (efecto los limpia antes)
      if (pendingColorVidrio.current !== null) {
        setColorVidrio(pendingColorVidrio.current)
        pendingColorVidrio.current = null
      }
      if (pendingColorMetal.current !== null) {
        setColorMetal(pendingColorMetal.current)
        pendingColorMetal.current = null
      }
      if (pendingSubcategoriaId.current) {
        const target = pendingSubcategoriaId.current
        pendingSubcategoriaId.current = null
        setSubcategoriaId(subs.find((s) => s.id === target) ? target : (subs[0]?.id ?? ''))
      } else if (subs[0]) {
        setSubcategoriaId(subs[0].id)
      }
    })
  }, [tipoFachadaId])

  // Acabados reactivos al cambio de subcategoría
  useEffect(() => {
    if (!subcategoriaId) return
    setAcabados([])
    setAcabadoId('')
    getAcabados(subcategoriaId).then((abs) => {
      setAcabados(abs)
      if (pendingAcabadoId.current) {
        const target = pendingAcabadoId.current
        pendingAcabadoId.current = null
        setAcabadoId(abs.find((a) => a.id === target) ? target : (abs[0]?.id ?? ''))
      } else if (abs[0]) {
        setAcabadoId(abs[0].id)
      }
    })
  }, [subcategoriaId])

  // Reset color de estructura cuando cambia tipo de estructura
  useEffect(() => {
    const est = tiposEstructura.find((e) => e.id === tipoEstructuraId)
    if (est?.es_premium) {
      if (pendingAcabadoEstructura.current !== null) {
        setAcabadoEstructura(pendingAcabadoEstructura.current)
        pendingAcabadoEstructura.current = null
      } else {
        setAcabadoEstructura(est.colores_premium[0] ?? null)
      }
    } else {
      setAcabadoEstructura(null)
    }
  }, [tipoEstructuraId, tiposEstructura])

  // Búsqueda de herrajes con debounce
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

  if (!moduloPendiente) return null

  // Para módulos stub (reabrirBorrador), derivar flags desde la config guardada
  const requiereFachada = itemEditando
    ? itemEditando.config.tipoFachadaId !== 'sin-fachada'
    : (moduloPendiente.requiere_fachada ?? true)
  const requiereEstructura = itemEditando
    ? itemEditando.config.tipoEstructuraId !== 'sin-estructura'
    : (moduloPendiente.requiere_estructura ?? true)

  const estructura = tiposEstructura.find((e) => e.id === tipoEstructuraId)
  const fachada = tiposFachada.find((f) => f.id === tipoFachadaId)
  const subcategoria = subcategorias.find((s) => s.id === subcategoriaId) ?? null
  const esAluminioVidrio = fachada?.es_aluminio_vidrio ?? false
  const esPremium = estructura?.es_premium ?? false

  // Dimensiones disponibles para los selectors
  const alturasDisponibles = [...new Set(variantes.map((v) => v.altura))].sort((a, b) => a - b)
  const profundidadesDisponibles = alturaSeleccionada
    ? [...new Set(variantes.filter((v) => v.altura === alturaSeleccionada).map((v) => v.profundidad))].sort(
        (a, b) => a - b,
      )
    : []
  const hayVarianteSeleccionada =
    alturaSeleccionada !== null &&
    profundidadSeleccionada !== null &&
    variantes.some(
      (v) => v.altura === alturaSeleccionada && v.profundidad === profundidadSeleccionada,
    )

  const listo =
    !cargandoCatalogo &&
    hayVarianteSeleccionada &&
    (!requiereFachada || (!!subcategoriaId && !!acabadoId)) &&
    (!esPremium || !!acabadoEstructura)

  function handleAgregar() {
    if (!moduloPendiente || !moduloActual || !listo) return

    const precio = precios.find(
      (p) => p.tipo_estructura_id === tipoEstructuraId && p.tipo_fachada_id === tipoFachadaId,
    )
    if (!precio) return

    const categoria = categorias.find((c) => c.id === moduloActual.categoria_id)
    if (!categoria) return

    // Subcategoría y acabado: usar sentinels cuando el módulo no requiere fachada
    const subcategoriaEfectiva: Subcategoria = requiereFachada && subcategoria
      ? subcategoria
      : { id: 'sin-fachada', tipo_fachada_id: 'sin-fachada', nombre: 'Sin fachada', tipo_ajuste: 'ninguno', ajuste_pct: 0, es_premium: false, activo: true }

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

    agregarItem(moduloActual, config, subcategoriaEfectiva, precio.precio_cop, {
      id: categoria.id,
      desc_base_pct: categoria.desc_desarmado_base_pct,
      desc_premium_pct: categoria.desc_desarmado_premium_pct,
    }, herrajesBorrador)
  }

  function agregarHerraje(accesorio: Accesorio) {
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
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={cerrarFicha}
      />

      <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-aparecer overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5 gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <ModuloImagen url={moduloPendiente.imagen_url} nombre={moduloPendiente.nombre} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-stone-400 tracking-wide uppercase mb-0.5">
                {moduloPendiente.tipologia}
              </p>
              <h2 className="text-base font-semibold text-stone-900 leading-snug">
                {moduloPendiente.nombre}
              </h2>
            </div>
          </div>
          <button
            onClick={cerrarFicha}
            className="tactil -mr-1 shrink-0 rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Formulario — scrollable */}
        {cargandoCatalogo ? (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 animate-pulse">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 rounded-lg bg-stone-100" />
              <div className="h-10 rounded-lg bg-stone-100" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-28 rounded bg-stone-100" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-9 rounded-lg bg-stone-100" />
                <div className="h-9 rounded-lg bg-stone-100" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-28 rounded bg-stone-100" />
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => <div key={i} className="h-9 rounded-lg bg-stone-100" />)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-36 rounded bg-stone-100" />
              <div className="h-10 rounded-lg bg-stone-100" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-40 rounded bg-stone-100" />
              <div className="flex gap-2 flex-wrap">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-7 w-20 rounded-full bg-stone-100" />)}
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
                    const n = Number(v)
                    setAlturaSeleccionada(n)
                    setProfundidadSeleccionada(null)
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

            {/* Tipo de estructura — oculto en módulos sin estructura (ej. complementos) */}
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

            {/* Tipo de fachada — oculto en módulos sin fachada (ej. MULTI STORE) */}
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

            {/* Acabado / color de fachada */}
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

            {/* Color de estructura — solo si Premium */}
            {esPremium && estructura && estructura.colores_premium.length > 0 && (
              <Campo label="Color de estructura" nota="Solo si estructura Premium">
                <Select
                  value={acabadoEstructura ?? ''}
                  onChange={setAcabadoEstructura}
                  options={estructura.colores_premium.map((c) => ({ value: c, label: c }))}
                />
              </Campo>
            )}

            {/* Color vidrio + metal — solo si Aluminio Vidrio */}
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
                  className="w-12 text-center text-sm font-semibold text-stone-900 bg-transparent border-none outline-none"
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

            {/* ─── Herrajes de este módulo ─────────────────────────────────── */}
            <div className="border-t border-stone-100 pt-5">
              <p className="text-sm font-medium text-stone-700 mb-3">Herrajes del módulo</p>

              {/* Buscador de herrajes */}
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
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-8 pr-8 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-300 focus:bg-white focus:ring-2 focus:ring-stone-100 transition-all"
                />
              </div>

              {/* Resultados de búsqueda */}
              {resultadosHerraje.length > 0 && (
                <div className="mb-3 rounded-lg border border-stone-200 bg-white shadow-sm divide-y divide-stone-100 max-h-52 overflow-y-auto">
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
                        onClick={() => agregarHerraje(a)}
                        className="tactil w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-stone-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-stone-800 truncate">{a.nombre}</p>
                          <p className="text-xs text-stone-400">cód. {a.codigo}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {p && (
                            <span className="text-xs text-stone-500">{formatCOP(p)}</span>
                          )}
                          <Plus size={13} weight="bold" className="text-stone-400" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {busquedaHerraje.trim().length >= 2 && !buscandoHerraje && resultadosHerraje.length === 0 && (
                <p className="mb-3 text-xs text-stone-400">Sin resultados para &ldquo;{busquedaHerraje}&rdquo;</p>
              )}

              {/* Lista de herrajes agregados */}
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
        <div className="shrink-0 border-t border-stone-100 px-6 py-4 bg-white flex gap-3">
          <button
            type="button"
            onClick={cerrarFicha}
            className="rounded-lg border border-stone-200 px-4 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAgregar}
            disabled={!listo}
            className="tactil flex-1 rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {itemEditando ? 'Actualizar módulo' : 'Agregar al carrito'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes internos ─────────────────────────────────────────────────

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
        className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-stone-900 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all disabled:opacity-50"
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
