/**
 * Modelo de roles de la plataforma Delben.
 * Roles Delben: super_admin, delben_facturacion
 * Roles Distribuidor: distribuidor_admin, distribuidor_costos, distribuidor_comercial
 *
 * SEGURIDAD: distribuidor_comercial NUNCA recibe campos de costo Delben.
 * Usar filtrarPorRol() del motor antes de devolver cualquier cálculo.
 */

export const ROLES = [
  'super_admin',
  'delben_facturacion',
  'distribuidor_admin',
  'distribuidor_costos',
  'distribuidor_comercial',
] as const

export type Rol = (typeof ROLES)[number]

export const ROLES_DELBEN = [
  'super_admin',
  'delben_facturacion',
] as const satisfies readonly Rol[]

export const ROLES_DISTRIBUIDOR = [
  'distribuidor_admin',
  'distribuidor_costos',
  'distribuidor_comercial',
] as const satisfies readonly Rol[]

/** Roles que pueden ver el costo Delben (capa Delben del cálculo). */
export const ROLES_VEN_COSTO_DELBEN = [
  'super_admin',
  'delben_facturacion',
  'distribuidor_admin',
  'distribuidor_costos',
] as const satisfies readonly Rol[]

export function puedeVerCostoDelben(rol: Rol): boolean {
  return (ROLES_VEN_COSTO_DELBEN as readonly Rol[]).includes(rol)
}

export function esRolDelben(rol: Rol): boolean {
  return (ROLES_DELBEN as readonly Rol[]).includes(rol)
}

export function esRolDistribuidor(rol: Rol): boolean {
  return (ROLES_DISTRIBUIDOR as readonly Rol[]).includes(rol)
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  super_admin: 'Super Admin',
  delben_facturacion: 'Facturación Delben',
  distribuidor_admin: 'Administrador',
  distribuidor_costos: 'Costos',
  distribuidor_comercial: 'Comercial',
}
