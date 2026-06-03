'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  MapPin,
  MagnifyingGlass,
  CircleNotch,
  Warning,
  Cube,
  Wrench,
  Buildings,
} from '@phosphor-icons/react'
import { useAuth } from '@/components/providers/auth-provider'
import { getSedes } from '@/lib/firestore/sedes'
import { getFiltroSedesUsuario, getDistribuidores } from '@/lib/firestore/distribuidores'
import { getCategorias } from '@/lib/firestore/catalogo'
import { getModulosTodos, buscarAccesorios } from '@/lib/firestore/modulos'
import { getTasaUsdActual } from '@/lib/firestore/config'
import {
  aplicarDescuento,
  descuentoModuloPct,
  descuentoHerrajePct,
  convertirMoneda,
} from '@/lib/catalogo-precios'
import { puedeVerCostoDelben } from '@delben/firebase'
import { sedeHabilitada } from '@/lib/firebase/tipos-firestore'
import type { Sede, Categoria, Distribuidor } from '@/lib/firebase/tipos-firestore'
import type { ItemCatalogo } from '@/lib/catalogo-tipos'
import { TablaPreciosModulo } from '@/components/catalogo/tabla-precios-modulo'

type Modalidad = 'tradicional' | 'desarmado'

// Catálogo construido en el cliente (antes era la respuesta de /api/catalogo).
// El precio con descuento se calcula aquí y solo se incluye para roles con acceso
// a costo; para distribuidor_comercial el campo no se calcula (misma protección de
// de-render que el resto del portal — ver tests/catalogo/SEGURIDAD.md).
interface CatalogoData {
  moneda: 'COP' | 'USD'
  tasaUsd: number
  puedeVerCosto: boolean
  items: ItemCatalogo[]
}

function normalizar(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function formatPrecio(n: number, moneda: 'COP' | 'USD'): string {
  if (moneda === 'USD') {
    return 'US$ ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return '$' + Math.round(n).toLocaleString('es-CO')
}

export default function CatalogoPage() {
  const { usuario, rol, distribuidorId, cargando: cargandoAuth } = useAuth()

  // Delben (super_admin / delben_facturacion) no tiene sede propia: elige distribuidor.
  const esDelben = rol === 'super_admin' || rol === 'delben_facturacion'

  // ── Delben: selección de distribuidor ─────────────────────────────────────────
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([])
  const [distribuidorSelId, setDistribuidorSelId] = useState<string | null>(null)
  const [cargandoDistribuidores, setCargandoDistribuidores] = useState(true)

  // Distribuidor sobre el que se consulta: Delben → el elegido; distribuidor → el propio.
  const distribuidorIdEfectivo = esDelben ? distribuidorSelId : distribuidorId ?? null

  // ── C1: sedes disponibles (∩ habilitadas) + modalidad ─────────────────────────
  const [sedesDisponibles, setSedesDisponibles] = useState<Sede[]>([])
  const [sedeSelId, setSedeSelId] = useState<string | null>(null)
  const [modalidad, setModalidad] = useState<Modalidad | null>(null)
  const [cargandoSedes, setCargandoSedes] = useState(true)
  const [hayVisiblesSinConfig, setHayVisiblesSinConfig] = useState(false)

  // ── Catálogo ──────────────────────────────────────────────────────────────────
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [data, setData] = useState<CatalogoData | null>(null)
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false)
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null)

  // ── Filtros UI ──────────────────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'modulo' | 'herraje'>('todos')
  const [catFiltro, setCatFiltro] = useState<string>('')

  // Tabla de precios por variante (detalle al clic en una tarjeta de módulo).
  // Solo para roles con costo; guarda el `nombre` del producto elegido.
  const [productoTabla, setProductoTabla] = useState<string | null>(null)

  const sedeSel = sedesDisponibles.find((s) => s.id === sedeSelId) ?? null

  // Categorías (una vez) + distribuidores (solo Delben).
  useEffect(() => {
    if (cargandoAuth) return
    getCategorias().then(setCategorias).catch(() => {})
    if (esDelben) {
      getDistribuidores()
        .then(setDistribuidores)
        .catch(() => {})
        .finally(() => setCargandoDistribuidores(false))
    } else {
      setCargandoDistribuidores(false)
    }
  }, [cargandoAuth, esDelben])

  // Cargar sedes del distribuidor efectivo (Delben: el elegido; distribuidor: el propio).
  useEffect(() => {
    if (cargandoAuth || !usuario) return
    if (!distribuidorIdEfectivo) {
      setSedesDisponibles([])
      setSedeSelId(null)
      return
    }
    ;(async () => {
      setCargandoSedes(true)
      try {
        // Delben ve todas las sedes del distribuidor; los roles de distribuidor,
        // solo las suyas (getFiltroSedesUsuario). Encima, solo las habilitadas.
        const filtro = esDelben ? null : await getFiltroSedesUsuario(usuario.uid, rol)
        const todas = await getSedes(distribuidorIdEfectivo)
        const visibles = filtro === null ? todas : todas.filter((s) => filtro.includes(s.id))
        const habilitadas = visibles.filter(sedeHabilitada)
        setSedesDisponibles(habilitadas)
        setHayVisiblesSinConfig(visibles.length > 0 && habilitadas.length === 0)
        setSedeSelId(habilitadas.length === 1 ? habilitadas[0]!.id : null)
      } finally {
        setCargandoSedes(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distribuidorIdEfectivo, esDelben, usuario, rol, cargandoAuth])

  // Al elegir sede, derivar modalidades; autoselección si solo hay una.
  useEffect(() => {
    if (!sedeSel) {
      setModalidad(null)
      return
    }
    const ms: Modalidad[] = []
    if (sedeSel.acceso_desarmado) ms.push('desarmado')
    if (sedeSel.acceso_tradicional) ms.push('tradicional')
    setModalidad(ms.length === 1 ? ms[0]! : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sedeSelId])

  // Cargar catálogo cuando hay sede + modalidad. Lectura client-side directa de
  // Firestore (mismas colecciones y reglas que el cotizador). El precio con descuento
  // se calcula aquí con la lógica pura de catalogo-precios y SOLO se incluye para roles
  // con acceso a costo; para distribuidor_comercial el campo no se calcula.
  useEffect(() => {
    if (!sedeSel || !modalidad) {
      setData(null)
      return
    }
    const sede = sedeSel
    const mod = modalidad
    ;(async () => {
      setCargandoCatalogo(true)
      setErrorCatalogo(null)
      try {
        const verCosto = rol ? puedeVerCostoDelben(rol) : false
        const esColombia = sede.pais.trim().toLowerCase() === 'colombia'
        const moneda: 'COP' | 'USD' = esColombia ? 'COP' : 'USD'
        const tasaUsd = esColombia ? 4000 : await getTasaUsdActual()

        // Descuento de desarmado por categoría del módulo.
        const descBaseDesarmado = new Map<string, number>()
        for (const c of categorias) descBaseDesarmado.set(c.id, c.desc_desarmado_base_pct)

        const [modulos, accesorios] = await Promise.all([
          getModulosTodos(),
          buscarAccesorios('', mod),
        ])

        const items: ItemCatalogo[] = []

        // Módulos: dedup por nombre (igual que el buscador y el endpoint anterior).
        const vistosMod = new Set<string>()
        for (const m of modulos) {
          if (vistosMod.has(m.nombre)) continue
          vistosMod.add(m.nombre)
          const precioMin = typeof m.precio_min === 'number' ? m.precio_min : null
          const item: ItemCatalogo = {
            tipo: 'modulo',
            id: m.id,
            nombre: m.nombre,
            subtitulo: m.tipologia ?? '',
            categoria_id: m.categoria_id ?? null,
            imagen_url: m.imagen_url ?? null,
            precioLista: precioMin === null ? null : convertirMoneda(precioMin, moneda, tasaUsd),
          }
          // Solo se calcula el precio con descuento si el rol puede ver costo.
          if (verCosto && precioMin !== null) {
            const cat = m.categoria_id
              ? { desc_desarmado_base_pct: descBaseDesarmado.get(m.categoria_id) ?? 0 }
              : null
            const pct = descuentoModuloPct(mod, sede, cat)
            item.precioConDescuento = convertirMoneda(aplicarDescuento(precioMin, pct), moneda, tasaUsd)
            item.descuentoPct = pct
          }
          items.push(item)
        }

        // Herrajes disponibles en la modalidad (buscarAccesorios ya filtró por disponibilidad).
        for (const a of accesorios) {
          const listaCop = mod === 'tradicional' ? a.precio_tradicional_cop : a.precio_desarmado_cop
          const lista = typeof listaCop === 'number' ? listaCop : null
          const item: ItemCatalogo = {
            tipo: 'herraje',
            id: a.id,
            nombre: a.nombre ?? '',
            subtitulo: `cód. ${a.codigo ?? ''}`,
            categoria_id: null,
            imagen_url: a.imagen_url ?? null,
            precioLista: lista === null ? null : convertirMoneda(lista, moneda, tasaUsd),
          }
          if (verCosto && lista !== null) {
            const pct = descuentoHerrajePct(mod, sede)
            item.precioConDescuento = convertirMoneda(aplicarDescuento(lista, pct), moneda, tasaUsd)
            item.descuentoPct = pct
          }
          items.push(item)
        }

        setData({ moneda, tasaUsd, puedeVerCosto: verCosto, items })
      } catch (e) {
        setErrorCatalogo(e instanceof Error ? e.message : 'No se pudo cargar el catálogo')
        setData(null)
      } finally {
        setCargandoCatalogo(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sedeSelId, modalidad, distribuidorIdEfectivo])

  const nombreCategoria = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categorias) map.set(c.id, c.nombre)
    return map
  }, [categorias])

  const itemsFiltrados = useMemo(() => {
    if (!data) return []
    const q = normalizar(busqueda.trim())
    return data.items.filter((it) => {
      if (tipoFiltro !== 'todos' && it.tipo !== tipoFiltro) return false
      if (catFiltro && it.categoria_id !== catFiltro) return false
      if (q && !normalizar(it.nombre).includes(q)) return false
      return true
    })
  }, [data, busqueda, tipoFiltro, catFiltro])

  const categoriasPresentes = useMemo(() => {
    if (!data) return []
    const ids = new Set<string>()
    for (const it of data.items) if (it.tipo === 'modulo' && it.categoria_id) ids.add(it.categoria_id)
    return categorias.filter((c) => ids.has(c.id))
  }, [data, categorias])

  const distribuidorSelNombre = distribuidores.find((d) => d.id === distribuidorSelId)?.nombre ?? null

  // ── Estados de carga / gating ─────────────────────────────────────────────────

  if (cargandoAuth || (esDelben && cargandoDistribuidores)) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-stone-400 text-sm">
        <CircleNotch size={18} className="animate-spin" />
        Cargando…
      </div>
    )
  }

  const modalidadesSede: Modalidad[] = sedeSel
    ? ([
        sedeSel.acceso_desarmado && 'desarmado',
        sedeSel.acceso_tradicional && 'tradicional',
      ].filter(Boolean) as Modalidad[])
    : []

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Catálogo de precios</h1>
        <p className="mt-1 text-sm text-stone-400">
          Consulta de precios por sede y modalidad. No es una cotización.
        </p>
      </div>

      {/* Selección: (Delben) distribuidor → sede → modalidad */}
      <section className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        {/* Delben: distribuidor */}
        {esDelben && (
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Distribuidor</p>
            {distribuidores.length === 0 ? (
              <p className="text-sm text-stone-400">No hay distribuidores registrados.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {distribuidores.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setDistribuidorSelId(d.id)
                      setSedeSelId(null)
                      setModalidad(null)
                    }}
                    className={[
                      'tactil flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all',
                      d.id === distribuidorSelId
                        ? 'border-caoba-600 bg-caoba-600 text-white'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300',
                    ].join(' ')}
                  >
                    <Buildings size={14} weight={d.id === distribuidorSelId ? 'fill' : 'regular'} />
                    {d.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sede + modalidad (cuando hay distribuidor efectivo) */}
        {distribuidorIdEfectivo && (
          cargandoSedes ? (
            <div className="flex items-center gap-2 text-sm text-stone-400 py-1">
              <CircleNotch size={14} className="animate-spin" /> Cargando sedes…
            </div>
          ) : sedesDisponibles.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2">
              <Warning size={16} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-stone-600">
                {hayVisiblesSinConfig
                  ? `${esDelben && distribuidorSelNombre ? distribuidorSelNombre + ': sus' : 'Tus'} sedes aún no tienen el universo configurado.`
                  : esDelben
                    ? 'Este distribuidor no tiene sedes habilitadas.'
                    : 'No tienes ninguna sede habilitada asignada. Contacta a tu administrador.'}
              </p>
            </div>
          ) : (
            <>
              {sedesDisponibles.length > 1 && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Sede</p>
                  <div className="flex flex-wrap gap-2">
                    {sedesDisponibles.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSedeSelId(s.id)}
                        className={[
                          'tactil flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all',
                          s.id === sedeSelId
                            ? 'border-caoba-600 bg-caoba-600 text-white'
                            : 'border-stone-200 text-stone-600 hover:border-stone-300',
                        ].join(' ')}
                      >
                        <MapPin size={14} weight={s.id === sedeSelId ? 'fill' : 'regular'} />
                        {s.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {sedeSel && (
                <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                  {sedesDisponibles.length === 1 && (
                    <div className="flex items-center gap-1.5 text-sm text-stone-700">
                      <MapPin size={16} className="text-stone-400" />
                      <span className="font-medium">{sedeSel.nombre}</span>
                      <span className="text-stone-400">· {sedeSel.ciudad}, {sedeSel.pais}</span>
                    </div>
                  )}
                  {modalidadesSede.length > 1 && (
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Modalidad</p>
                      <div className="flex gap-2">
                        {modalidadesSede.map((m) => (
                          <button
                            key={m}
                            onClick={() => setModalidad(m)}
                            className={[
                              'tactil rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-all',
                              modalidad === m
                                ? 'border-caoba-600 bg-caoba-600 text-white'
                                : 'border-stone-200 text-stone-600 hover:border-stone-300',
                            ].join(' ')}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {modalidad && modalidadesSede.length === 1 && (
                    <span className="text-sm text-stone-500 capitalize">Modalidad: {modalidad}</span>
                  )}
                </div>
              )}
            </>
          )
        )}
        {esDelben && !distribuidorSelId && (
          <p className="text-sm text-stone-400">Elige un distribuidor para ver sus sedes.</p>
        )}
      </section>

      {/* Catálogo */}
      {!modalidad ? (
        distribuidorIdEfectivo && sedesDisponibles.length > 0 ? (
          <p className="text-sm text-stone-400 text-center py-10">
            Elige sede y modalidad para ver el catálogo.
          </p>
        ) : null
      ) : cargandoCatalogo ? (
        <div className="flex items-center justify-center py-16 gap-2 text-stone-400 text-sm">
          <CircleNotch size={18} className="animate-spin" />
          Cargando catálogo…
        </div>
      ) : errorCatalogo ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorCatalogo}
        </div>
      ) : data ? (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre…"
                className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
              />
            </div>
            <div className="flex rounded-lg border border-stone-200 bg-white p-0.5">
              {(['todos', 'modulo', 'herraje'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipoFiltro(t)}
                  className={[
                    'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                    tipoFiltro === t ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-700',
                  ].join(' ')}
                >
                  {t === 'modulo' ? 'Módulos' : t === 'herraje' ? 'Herrajes' : 'Todos'}
                </button>
              ))}
            </div>
            {tipoFiltro !== 'herraje' && categoriasPresentes.length > 0 && (
              <select
                value={catFiltro}
                onChange={(e) => setCatFiltro(e.target.value)}
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
              >
                <option value="">Todas las categorías</option>
                {categoriasPresentes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            )}
          </div>

          {/* Aviso de visibilidad de precio */}
          {!data.puedeVerCosto && (
            <p className="text-xs text-stone-400">
              Mostrando precio de lista. El precio con descuento solo está disponible para
              roles con acceso a costo.
            </p>
          )}

          {/* Grid */}
          <p className="text-xs text-stone-400 tabular-nums">{itemsFiltrados.length} resultados</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {itemsFiltrados.map((it) => (
              <TarjetaItem
                key={`${it.tipo}-${it.id}`}
                item={it}
                moneda={data.moneda}
                puedeVerCosto={data.puedeVerCosto}
                categoriaNombre={it.categoria_id ? nombreCategoria.get(it.categoria_id) ?? null : null}
                onVerTabla={
                  data.puedeVerCosto && it.tipo === 'modulo' ? () => setProductoTabla(it.nombre) : undefined
                }
              />
            ))}
          </div>
        </>
      ) : null}

      {/* Tabla de precios por variante (solo roles con costo) */}
      {productoTabla && sedeSel && modalidad && data && (
        <TablaPreciosModulo
          nombre={productoTabla}
          sede={sedeSel}
          modalidad={modalidad}
          moneda={data.moneda}
          tasaUsd={data.tasaUsd}
          categorias={categorias}
          onClose={() => setProductoTabla(null)}
        />
      )}
    </div>
  )
}

// ─── Tarjeta de ítem ─────────────────────────────────────────────────────────

function Miniatura({ url, nombre, tipo }: { url: string | null; nombre: string; tipo: 'modulo' | 'herraje' }) {
  const [error, setError] = useState(false)
  if (url && !error) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={nombre} onError={() => setError(true)} className="h-10 w-10 rounded object-cover shrink-0 border border-stone-100" />
  }
  return (
    <div className="h-10 w-10 rounded bg-stone-100 shrink-0 flex items-center justify-center text-stone-400 border border-stone-100">
      {tipo === 'modulo' ? <Cube size={16} /> : <Wrench size={16} />}
    </div>
  )
}

function TarjetaItem({
  item,
  moneda,
  puedeVerCosto,
  categoriaNombre,
  onVerTabla,
}: {
  item: ItemCatalogo
  moneda: 'COP' | 'USD'
  puedeVerCosto: boolean
  categoriaNombre: string | null
  onVerTabla?: () => void
}) {
  const esModulo = item.tipo === 'modulo'
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3 flex gap-3">
      <Miniatura url={item.imagen_url} nombre={item.nombre} tipo={item.tipo} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800 leading-snug truncate">{item.nombre}</p>
        <p className="text-xs text-stone-400 capitalize truncate">
          {item.subtitulo}{categoriaNombre ? ` · ${categoriaNombre}` : ''}
        </p>
        <div className="mt-2">
          {puedeVerCosto && item.precioConDescuento != null ? (
            <div className="flex items-baseline gap-2">
              {/* Módulo: "Desde" (precio mínimo de la matriz, sin estructura/fachada elegidas). */}
              {esModulo && (
                <span className="text-[10px] uppercase tracking-wide text-stone-400">Desde</span>
              )}
              <span className="font-mono tabular-nums text-sm font-semibold text-stone-900">
                {formatPrecio(item.precioConDescuento, moneda)}
              </span>
              {item.precioLista != null && (
                <span className="font-mono tabular-nums text-xs text-stone-400 line-through">
                  {formatPrecio(item.precioLista, moneda)}
                </span>
              )}
              {item.descuentoPct != null && item.descuentoPct > 0 && (
                <span className="text-[10px] font-semibold text-caoba-600">−{item.descuentoPct}%</span>
              )}
            </div>
          ) : item.precioLista != null ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-stone-400">
                {esModulo ? 'Desde' : 'Lista'}
              </span>
              <span className="font-mono tabular-nums text-sm font-semibold text-stone-900">
                {formatPrecio(item.precioLista, moneda)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-stone-300">Sin precio</span>
          )}
        </div>
        {onVerTabla && (
          <button
            onClick={onVerTabla}
            className="tactil mt-2 text-xs font-medium text-caoba-600 hover:text-caoba-700 underline underline-offset-2"
          >
            Ver precios →
          </button>
        )}
      </div>
    </div>
  )
}
