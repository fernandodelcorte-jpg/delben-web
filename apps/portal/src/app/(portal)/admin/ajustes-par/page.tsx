'use client'

import { useEffect, useState } from 'react'
import { CircleNotch, Check, Warning } from '@phosphor-icons/react'
import {
  getAllSubcategoriasAdmin,
  getCategoriasAdmin,
} from '@/lib/firestore/catalogo'
import {
  listarAjustesParPorSubcategoria,
  upsertAjustePar,
  eliminarAjustePar,
} from '@/lib/firestore/ajustes-par'
import type { Subcategoria, Categoria } from '@/lib/firebase/tipos-firestore'

type TipoAjuste = 'ninguno' | 'descuento' | 'recargo'

type Fila = {
  categoriaId: string
  nombre: string
  tipo: TipoAjuste
  pct: number
}

// Restringe un porcentaje al rango válido [0, 100].
function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, n))
}

export default function AjustesParAdminPage() {
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [subId, setSubId] = useState('')
  const [filas, setFilas] = useState<Fila[]>([])
  const [cargando, setCargando] = useState(true)
  const [cargandoMatriz, setCargandoMatriz] = useState(false)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  // Carga inicial: subcategorías activas + categorías de lista activas.
  useEffect(() => {
    async function cargar() {
      setErrorCarga(null)
      try {
        const [subs, cats] = await Promise.all([
          getAllSubcategoriasAdmin(),
          getCategoriasAdmin(),
        ])
        setSubcategorias(subs.filter((s) => s.activo !== false))
        setCategorias(
          cats
            .filter((c) => c.activo !== false)
            .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99) || a.nombre.localeCompare(b.nombre, 'es')),
        )
      } catch (e) {
        setErrorCarga(`Error al cargar datos: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  // Construye/recarga la matriz para la subcategoría elegida.
  async function cargarMatriz(subcategoriaId: string) {
    if (!subcategoriaId) {
      setFilas([])
      return
    }
    setCargandoMatriz(true)
    setMensaje(null)
    try {
      const pares = await listarAjustesParPorSubcategoria(subcategoriaId)
      const porCategoria = new Map(pares.map((p) => [p.categoria_id, p]))
      setFilas(
        categorias.map((c) => {
          const par = porCategoria.get(c.id)
          return {
            categoriaId: c.id,
            nombre: c.nombre,
            tipo: par ? par.tipo_ajuste : 'ninguno',
            pct: par ? par.ajuste_pct : 0,
          }
        }),
      )
    } catch (e) {
      setMensaje({ tipo: 'error', texto: `Error al cargar la matriz: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setCargandoMatriz(false)
    }
  }

  function handleSelectSub(id: string) {
    setSubId(id)
    cargarMatriz(id)
  }

  function setTipo(categoriaId: string, tipo: TipoAjuste) {
    setFilas((prev) => prev.map((f) => (f.categoriaId === categoriaId ? { ...f, tipo } : f)))
  }

  function setPct(categoriaId: string, pct: number) {
    setFilas((prev) =>
      prev.map((f) => (f.categoriaId === categoriaId ? { ...f, pct: clampPct(pct) } : f)),
    )
  }

  async function handleGuardar() {
    if (!subId) return
    setGuardando(true)
    setMensaje(null)
    try {
      await Promise.all(
        filas.map((f) => {
          if (f.tipo === 'ninguno') {
            // 'ninguno' → el par no debe existir (modelo "solo excepciones").
            return eliminarAjustePar(subId, f.categoriaId)
          }
          return upsertAjustePar({
            categoria_id: f.categoriaId,
            subcategoria_id: subId,
            tipo_ajuste: f.tipo,
            ajuste_pct: clampPct(f.pct),
            activo: true,
          })
        }),
      )
      const conAjuste = filas.filter((f) => f.tipo !== 'ninguno').length
      setMensaje({
        tipo: 'ok',
        texto: `Guardado · ${conAjuste} ${conAjuste === 1 ? 'categoría con ajuste' : 'categorías con ajuste'}`,
      })
      await cargarMatriz(subId)
    } catch (e) {
      setMensaje({ tipo: 'error', texto: `Error al guardar: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-stone-400 text-sm">
        <CircleNotch size={18} className="animate-spin" />
        Cargando…
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Cabecera */}
      <div>
        <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Ajustes por categoría</h1>
        <p className="mt-1 text-sm text-stone-400">
          Ajuste adicional por par categoría × subcategoría.{' '}
          <span className="font-medium text-stone-500">Solo aplica a la línea DESARMADO</span> — no afecta tradicional.
        </p>
      </div>

      {errorCarga && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <Warning size={16} weight="fill" />
          {errorCarga}
        </div>
      )}

      {/* Selector de subcategoría */}
      <div className="max-w-md">
        <label className="block text-xs font-medium text-stone-500 mb-1.5">Subcategoría</label>
        <select
          value={subId}
          onChange={(e) => handleSelectSub(e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500 bg-white"
        >
          <option value="">Elige una subcategoría…</option>
          {subcategorias.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Matriz de la subcategoría elegida */}
      {subId && (
        <div className="space-y-4">
          {cargandoMatriz ? (
            <div className="flex items-center gap-2 py-12 justify-center text-stone-400 text-sm">
              <CircleNotch size={16} className="animate-spin" />
              Cargando matriz…
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-stone-200 bg-white overflow-hidden divide-y divide-stone-100">
                <div className="flex items-center gap-3 px-5 py-2.5 bg-stone-50 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  <span className="flex-1">Categoría de lista de precios</span>
                  <span className="w-36">Ajuste</span>
                  <span className="w-28 text-right">%</span>
                </div>
                {filas.map((f) => (
                  <div key={f.categoriaId} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex-1 text-sm font-medium text-stone-800">{f.nombre}</span>
                    <select
                      value={f.tipo}
                      onChange={(e) => setTipo(f.categoriaId, e.target.value as TipoAjuste)}
                      className="w-36 rounded-md border border-stone-300 px-2.5 py-1.5 text-sm outline-none focus:border-stone-500 bg-white"
                    >
                      <option value="ninguno">Ninguno</option>
                      <option value="descuento">Descuento</option>
                      <option value="recargo">Recargo</option>
                    </select>
                    <div className="w-28 flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={f.pct}
                        disabled={f.tipo === 'ninguno'}
                        onChange={(e) => setPct(f.categoriaId, parseFloat(e.target.value) || 0)}
                        className="w-20 rounded-md border border-stone-300 px-2.5 py-1.5 text-sm text-right outline-none focus:border-stone-500 disabled:bg-stone-50 disabled:text-stone-300"
                      />
                      <span className={['text-sm', f.tipo === 'ninguno' ? 'text-stone-300' : 'text-stone-500'].join(' ')}>%</span>
                    </div>
                  </div>
                ))}
                {filas.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-stone-400">
                    No hay categorías de lista de precios activas.
                  </div>
                )}
              </div>

              {/* Guardado global + feedback */}
              <div className="flex items-center justify-end gap-3">
                {mensaje && (
                  <span
                    className={[
                      'flex items-center gap-1.5 text-sm',
                      mensaje.tipo === 'ok' ? 'text-emerald-600' : 'text-red-600',
                    ].join(' ')}
                  >
                    {mensaje.tipo === 'ok' ? <Check size={14} weight="bold" /> : <Warning size={14} weight="fill" />}
                    {mensaje.texto}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleGuardar}
                  disabled={guardando || filas.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 transition-colors"
                >
                  {guardando ? <CircleNotch size={14} className="animate-spin" /> : <Check size={14} weight="bold" />}
                  Guardar
                </button>
              </div>

              <p className="text-xs text-stone-400">
                Solo se guardan las categorías con ajuste. Poner una categoría en «Ninguno» elimina su excepción.
              </p>
            </>
          )}
        </div>
      )}

      {!subId && !errorCarga && (
        <p className="text-sm text-stone-400">
          Elige una subcategoría para definir su ajuste por categoría.
        </p>
      )}
    </div>
  )
}
