import { getDistribuidor } from '@/lib/firestore/distribuidores'
import { getSede } from '@/lib/firestore/sedes'
import { getCampanasActivas } from '@/lib/firestore/campanas'
import { getTasaUsdActual } from '@/lib/firestore/config'
import type {
  Cotizacion,
  Distribuidor,
  Sede,
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

// ─── Recálculo completo ───────────────────────────────────────────────────────

export type RecalculoResult = {
  cotizacionInfo: CotizacionInfo
  distribuidorData: Distribuidor
  sedeData: Sede
  items: ItemCarrito[]
  itemsHerraje: ItemHerrajeCarrito[]
  itemsEspeciales: ItemEspecial[]
}

export async function recalcularCotizacion(
  cotizacion: Cotizacion,
  distribuidorId: string,
): Promise<RecalculoResult> {
  const [dist, sede, campanasActivas, tasaUsd] = await Promise.all([
    getDistribuidor(distribuidorId),
    getSede(distribuidorId, cotizacion.sede_id),
    getCampanasActivas(),
    getTasaUsdActual(),
  ])
  if (!dist) throw new Error('Distribuidor no encontrado')
  if (!sede) throw new Error('Sede no encontrada')

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

  const { distribuidorMotor, serviciosMotor, universoMotor, pais } = buildMotorParams(distribuidorId, sede, cotizacion.modalidad)
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
    cotizacion.items.map((snap) => recomputeItemModulo(snap, motorBase)),
  )

  const itemsHerraje: ItemHerrajeCarrito[] = await Promise.all(
    cotizacion.itemsHerraje.map((snap) => recomputeItemHerraje(snap, motorBase)),
  )

  // Los muebles especiales tienen precio fijo ingresado a mano (el motor no los
  // recalcula): se arrastran tal cual desde el snapshot guardado.
  const itemsEspeciales: ItemEspecial[] = (cotizacion.itemsEspeciales ?? []).map(buildEspecialDesdeSnapshot)

  return { cotizacionInfo, distribuidorData: dist, sedeData: sede, items, itemsHerraje, itemsEspeciales }
}
