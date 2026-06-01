# Rebanada — Sedes por distribuidor (multi-sede)

> Documento de diseño para Claude Code. Define el QUÉ y el PORQUÉ de la rebanada
> de sedes. Decisiones cerradas con el dueño del proyecto. Construcción por
> rebanada vertical, sin tocar el motor de cálculo.

## Problema

Un distribuidor puede operar en varios países con condiciones distintas
(ej. Del Corte Angarita: Colombia, USA, Venezuela). Hoy el modelo asume
**un distribuidor = un conjunto de condiciones** (descuentos, servicios,
universo, país, moneda, IVA viven en `distribuidores/{id}`). Necesitamos que
cada distribuidor pueda tener **sedes**, cada una con sus propias condiciones.

## Decisiones de negocio (cerradas — NO reinterpretar)

1. **Una cotización pertenece a UNA sede.** Siempre. Se elige al iniciar la
   cotización.
2. **Un usuario puede pertenecer a una sede, a varias, o a todas.** Si tiene más
   de una sede disponible, debe seleccionar la sede al iniciar la cotización
   (mismo patrón que el selector de modalidad: si solo hay una opción, se
   autoselecciona y no se muestra el selector).
3. **NO hay migración de datos reales.** Nada se ha desplegado a clientes; la data
   existente es de prueba y se puede descartar. No construir compatibilidad
   legacy hacia atrás para el esquema viejo plano del distribuidor.
4. **Toda la configuración de cálculo vive en la sede:**
   - **Capa Delben** (descuentos muebles/herrajes, servicios, gestión comercial):
     la define el **super_admin** al crear/editar la sede.
   - **Capa Distribuidor** (universo: transporte, instalación, imprevistos,
     utilidad, IVA): la configura el **distribuidor_admin**, una vez por sede.
   - **País, moneda e IVA** se derivan de la sede (no del distribuidor). Colombia
     → COP con IVA; USA/Venezuela → USD exportación sin IVA.
5. **El catálogo es global de Delben.** NO cambia por sede. No tocar catálogo,
   precios base ni el import de Excel.
6. **Reparto de responsabilidades:**
   - **super_admin** (Delben): crea las sedes, define país + capa Delben de cada sede.
   - **distribuidor_admin**: asigna usuarios a sedes, configura el universo de cada sede.

## Regla de oro respetada

**El motor de cálculo (`packages/core/motor-calculo.ts`) NO se toca.** Su lógica
queda intacta. Lo único que cambia es el ORIGEN de los parámetros que recibe:
antes salían de `distribuidores/{id}`, ahora salen de
`distribuidores/{id}/sedes/{sedeId}`. El caso validado (1.562.495) debe seguir
pasando idéntico.

## Modelo de datos propuesto

### `distribuidores/{id}` (queda identitario)
- `nombre`
- `logo_url`
- (se le quitan: descuentos, servicios, universo, pais, ciudad,
  acceso_tradicional/desarmado → todo eso se mueve a la sede)

### `distribuidores/{id}/sedes/{sedeId}` (NUEVA subcolección)
- `nombre` (ej. "Bogotá", "Miami", "Caracas")
- `pais`, `ciudad`
- `acceso_tradicional`, `acceso_desarmado`
- **Capa Delben (super_admin):** `descuento_muebles_pct`, `descuento_herrajes_pct`,
  `servicios { diseno_pct, cotizacion_pct, produccion_pct, logistica_pct, gestion_comercial_pct }`
- **Capa Distribuidor (distribuidor_admin):** `universo { iva_pct, tradicional{...}, desarmado{...} }`
  con la misma forma que hoy (transporte_tipo/pct, instalacion_tipo/pct,
  imprevistos_pct, utilidad_pct por modalidad).
- `activo`
- Subcolección `historial_condiciones` (auditoría, igual que hoy pero por sede).

### `usuarios/{uid}`
- Agregar `sedes_asignadas: string[]` (IDs de sede) y `todas_las_sedes: boolean`.
- Si `todas_las_sedes` es true, ignora `sedes_asignadas` y puede operar en todas.

### Cotización (CotizacionDoc) y Valoración
- Agregar `sede_id: string`. Snapshot inmutable como el resto.

## Seguridad (Firestore Security Rules) — aislamiento por sede desde el día 1

- Una cotización solo es legible/escribible por:
  - super_admin (todo),
  - delben_facturacion (lectura, como hoy),
  - miembros del MISMO distribuidor cuyo `sede_id` esté en sus `sedes_asignadas`
    (o que tengan `todas_las_sedes: true`).
- Un comercial de la sede A NO puede leer cotizaciones de la sede B aunque sean
  del mismo distribuidor.
- El `distribuidor_admin` ve todas las sedes de su distribuidor (gestiona el equipo).
- NOTA: esto NO resuelve el hallazgo §10.1 (costo_delben en el snapshot alcanzable
  por comercial), pero deja las reglas listas y no lo empeora. Atacar §10.1 en
  rebanada aparte.

## Plan de la rebanada vertical (punta a punta, verificable)

1. **Tipos** (`lib/firebase/tipos-firestore.ts`): definir `SedeDoc`, mover los
   campos de cálculo del `DistribuidorDoc` a `SedeDoc`, añadir `sede_id` a
   cotización/valoración y los campos de sede a `usuarios`.
2. **Lectura de sede** (`lib/firestore/`): helper para leer la sede activa y pasar
   sus condiciones al motor (sustituye donde hoy se leen del distribuidor).
3. **Admin — crear/editar sede** (super_admin): pantalla bajo
   `/admin/distribuidores/[id]` para gestionar sedes (país + capa Delben).
4. **Config distribuidor** (distribuidor_admin): el universo se configura POR sede.
5. **Asignación de usuarios a sedes** (distribuidor_admin) en `/admin/equipo` o el
   equivalente del distribuidor.
6. **Cotizador**: selector de sede al iniciar (`/cotizaciones/nueva`), guardar
   `sede_id`, y que `calcularItem` reciba las condiciones de la sede.
7. **Security Rules**: aislamiento por sede + actualizar tests/manual de verificación.

## Checklist de cierre (de CLAUDE.md)
- `npm test` en `packages/core` pasa (caso 1.562.495 idéntico — el motor no cambió).
- TypeScript estricto, sin `any`.
- No se rompió ninguna rebanada anterior.
- Verificar que `distribuidor_comercial` de una sede no lee cotizaciones de otra.

## Pregunta abierta para confirmar antes de empezar
- ¿La asignación de usuarios a sedes se gestiona en la pantalla de equipo del
  distribuidor_admin que ya existe, o se quiere una pantalla nueva?
