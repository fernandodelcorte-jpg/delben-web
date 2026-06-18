/**
 * "Actualizar precios" para VALORACIONES. Reusa el núcleo compartido recompute-core
 * (recomputeItemModulo / recomputeItemHerraje): re-lee catálogo + corre el motor con
 * la config vigente. NO duplica lógica de recálculo. NO toca el motor.
 *
 * SEGURIDAD (regla de oro #2 / deuda §1): la valoración es SOLO COSTO DELBEN. En
 * memoria el motor produce el resultado completo (incluye venta), pero ese resultado
 * NUNCA se persiste ni se muestra: el guardado recorta con resultadoCosto y la UI solo
 * renderiza costo. Este módulo solo entrega ItemCarrito[] para cargar al borrador.
 */

import { getDistribuidor } from '@/lib/firestore/distribuidores'
import { getSede } from '@/lib/firestore/sedes'
import { getCampanasActivas } from '@/lib/firestore/campanas'
import { getTasaUsdActual } from '@/lib/firestore/config'
import type {
  Valoracion,
  Distribuidor,
  Sede,
  ItemCotizacionSnapshot,
  HerrajeAsociadoSnapshot,
  ItemHerraCotizacionSnapshot,
  ResultadoSnapshot,
  ValoracionItemSnapshot,
  ValoracionItemHerrajeSnapshot,
} from '@/lib/firebase/tipos-firestore'
import { buildEspecialDesdeSnapshot } from '@/store/carrito'
import type {
  ItemCarrito,
  ItemHerrajeCarrito,
  ItemEspecial,
  CotizacionInfo,
} from '@/store/carrito'
import {
  buildMotorParams,
  recomputeItemModulo,
  recomputeItemHerraje,
} from '@/lib/firestore/recompute-core'

// ─── Adaptadores de snapshot ──────────────────────────────────────────────────
// El snapshot de valoración tiene la MISMA config/ids que el de cotización; solo
// difiere el `resultado` (la valoración guarda costo-only). El helper solo lee ese
// `resultado` en la rama stub (ítems sin IDs); en la rama normal recalcula desde el
// catálogo. El cast a ResultadoSnapshot es seguro: si se usa (stub), la persistencia
// lo recorta a costo igual; nunca se persiste venta. Mismo cast que reabrirValoracion.

function aItemSnapshot(v: ValoracionItemSnapshot): ItemCotizacionSnapshot {
  return {
    modulo_id: v.modulo_id,
    modulo_nombre: v.modulo_nombre,
    modulo_tipologia: v.modulo_tipologia,
    config: v.config,
    resultado: v.resultado as ResultadoSnapshot,
    herrajesAsociados: v.herrajesAsociados.map(
      (h): HerrajeAsociadoSnapshot => ({
        accesorio_id: h.accesorio_id,
        codigo: h.codigo,
        nombre: h.nombre,
        cantidad: h.cantidad,
        resultado: h.resultado as ResultadoSnapshot,
      }),
    ),
  }
}

function aHerrajeSnapshot(v: ValoracionItemHerrajeSnapshot): ItemHerraCotizacionSnapshot {
  return {
    accesorio_id: v.accesorio_id,
    codigo: v.codigo,
    nombre: v.nombre,
    cantidad: v.cantidad,
    resultado: v.resultado as ResultadoSnapshot,
  }
}

// ─── Recálculo completo de una valoración ─────────────────────────────────────

export type RecalculoValoracionResult = {
  cotizacionInfo: CotizacionInfo
  distribuidorData: Distribuidor
  sedeData: Sede
  items: ItemCarrito[]
  itemsHerraje: ItemHerrajeCarrito[]
  itemsEspeciales: ItemEspecial[]
}

export async function recalcularValoracion(
  valoracion: Valoracion,
): Promise<RecalculoValoracionResult> {
  const [dist, sede, campanasActivas, tasaUsd] = await Promise.all([
    getDistribuidor(valoracion.distribuidor_id),
    getSede(valoracion.distribuidor_id, valoracion.sede_id),
    getCampanasActivas(),
    getTasaUsdActual(),
  ])
  if (!dist) throw new Error('Distribuidor no encontrado')
  if (!sede) throw new Error('Sede no encontrada')

  // Misma forma de CotizacionInfo que reabrirValoracion: la valoración (costo Delben)
  // no maneja categoría ni costos fijos de transporte/instalación.
  const cotizacionInfo: CotizacionInfo = {
    clienteNombre: valoracion.clienteNombre,
    proyectoNombre: valoracion.proyectoNombre,
    modalidad: valoracion.modalidad,
    fecha: new Date(valoracion.createdAt),
    sedeId: valoracion.sede_id,
    categoriaId: '',
    categoriaNombre: '',
    transporteFijo: 0,
    instalacionFija: 0,
    numeroOp: valoracion.numero_op,
  }

  const { distribuidorMotor, serviciosMotor, universoMotor, pais } = buildMotorParams(
    valoracion.distribuidor_id,
    sede,
    valoracion.modalidad,
  )
  const motorBase = {
    modelo: cotizacionInfo.modalidad,
    distribuidor: distribuidorMotor,
    fecha_cotizacion: cotizacionInfo.fecha,
    campanas_disponibles: campanasActivas,
    servicios_delben: serviciosMotor,
    universo: universoMotor,
    pais_cliente_final: pais,
    tasa_usd: tasaUsd,
  }

  const items: ItemCarrito[] = await Promise.all(
    valoracion.items.map((snap) => recomputeItemModulo(aItemSnapshot(snap), motorBase)),
  )

  const itemsHerraje: ItemHerrajeCarrito[] = await Promise.all(
    valoracion.itemsHerraje.map((snap) => recomputeItemHerraje(aHerrajeSnapshot(snap), motorBase)),
  )

  // Los muebles especiales tienen precio fijo a mano (el motor no los recalcula): se
  // arrastran tal cual desde el snapshot guardado. Mismo trato que en cotización.
  const itemsEspeciales: ItemEspecial[] = (valoracion.itemsEspeciales ?? []).map(buildEspecialDesdeSnapshot)

  return { cotizacionInfo, distribuidorData: dist, sedeData: sede, items, itemsHerraje, itemsEspeciales }
}
