# Catálogo de precios — nota de seguridad

> **Actualización (catálogo client-side).** El catálogo dejó de usar el endpoint
> server-side (`/api/catalogo`) y el Admin SDK. Ahora lee Firestore directamente
> desde el cliente, igual que el cotizador, y el control de acceso lo dan las
> Firestore Security Rules. Esto elimina la dependencia de credenciales ADC que
> expiraban a diario. Este documento describe **honestamente** qué protección
> queda y cuál no — sin simular una separación que ya no existe.

## Qué muestra el catálogo

Por sede y modalidad: **precio de lista** (todos los roles con acceso) y, para roles
con costo, **precio de lista − descuento principal** (`lista × (1 − %)`). NO incluye
ajuste de acabado, campañas, servicios ni gestión comercial — es decir, **el catálogo
nunca expone el costo Delben completo** (el margen confidencial de la regla de oro #2).
El cálculo es la lógica pura de [`catalogo-precios.ts`](../../apps/portal/src/lib/catalogo-precios.ts).

## Qué protección es REAL (a nivel de reglas) y cuál es DE-RENDER

Hay que ser claros, porque antes el endpoint daba una impresión de "separación real"
que para este dato no era cierta (ya estaba documentado como límite conocido):

- **DE-RENDER (no es separación real):** para `distribuidor_comercial`, el cliente
  simplemente **no calcula ni muestra** `precioConDescuento`/`descuentoPct`. Pero el
  comercial **puede leer los insumos** (precio de lista en `modulos/precios` y
  `accesorios`; porcentajes de descuento en `sede.descuento_*` y
  `categoria.desc_desarmado_base_pct`), porque las reglas se los permiten — el
  **cotizador los necesita**. Con esos insumos podría recalcular `lista − descuento`
  por su cuenta. Por tanto, ocultar el descuento al comercial es **cosmético**, igual
  en la versión client-side de hoy que en la versión server-side anterior.
- **REAL (lo garantizan las reglas):** el **aislamiento por tenant y por sede**. Un
  comercial solo lee la(s) sede(s) y cotizaciones de su distribuidor y de su(s) sede(s)
  asignada(s); nunca las de otro distribuidor ni de otra sede. Esto sí está enforced en
  `firestore.rules` y se prueba en [`tests/rules/`](../rules/README.md) (casos:
  "comercial(sede A) LEE cotización de sede B → DENEGADO", "comercial de OTRO
  distribuidor → denegado", etc.).

## El hueco real (regla de oro #2) — deuda técnica, no de este catálogo

El número genuinamente confidencial es el **costo Delben completo** (descuento +
servicios + gestión comercial). El catálogo nunca lo expone. Pero el **cotizador sí**:
hoy carga el documento completo de la sede client-side (incluido `servicios` y
`gestion_comercial_pct`) y corre el motor en el navegador del comercial, produciendo
`costo_delben`; la UI solo lo oculta con `puedeVerCosto`. Es decir, la regla de oro #2,
en su sentido estricto ("el dato no sale del servidor hacia ese rol"), **ya se incumple
en el cotizador**, independientemente del catálogo.

Cerrar esto de verdad (restringir en reglas la lectura de `sede.servicios` /
`sede.descuento_*` para el comercial, y/o calcular el costo server-side donde haga
falta) es una rebanada aparte. Está registrado como **deuda técnica §1** en
[`docs/ESTADO_ACTUAL.md`](../../docs/ESTADO_ACTUAL.md). Mover el catálogo a client-side
**no empeora** ese hueco: expone exactamente lo mismo que ya expone el cotizador.

## Cómo verificar

- **Aislamiento (lo que importa):** `tests/rules/` contra el emulador de Firestore.
  No se despliegan reglas sin esas pruebas en verde.
- **De-render del descuento:** es comportamiento de UI. Inicia sesión como
  `distribuidor_comercial` y confirma en `/catalogo` que solo se ve "Lista/Desde {precio}",
  sin precio con descuento ni `−%`. (No es una garantía de datos: ver arriba.)
