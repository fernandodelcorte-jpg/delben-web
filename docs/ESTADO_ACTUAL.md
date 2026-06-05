# Estado Actual del Proyecto

> El "reporte de avance de obra" y la **bitácora** del proyecto. `DISENO_SISTEMA.md`
> describe la visión completa; ESTE dice qué existe HOY, qué falta y qué se tocó
> cada día. Es lo primero que Claude Code debe leer al empezar una sesión.
>
> Estructura del documento:
> - **Foto del estado** — tabla de rebanadas + qué se construyó (por bloque).
> - **Deuda técnica y riesgos** — lo que falta o hay que vigilar.
> - **Bitácora cronológica** — registro inverso de cambios, fecha a fecha.
>   Agregar una entrada aquí al cerrar cada trabajo importante.

Última actualización: 2026-06-04 — ver **Estado de despliegue** abajo. Sesión de hoy
(mucho código, deploy parcial): seguridad por rol, IVA por sede, PDFs, consecutivo.

---

## Estado de despliegue — 2026-06-04 ⚠️ LEER ANTES DE TOCAR

> **"Implementado" ≠ "desplegado".** Casi todo lo de hoy se hizo en sesión de código; el
> deploy a producción es aparte y **NO está completo**. Los ítems marcados `[confirmar]`
> dependen de lo que el dueño efectivamente desplegó/verificó — ajustar al confirmarlo.

### (1) Desplegado y verificado en producción
- `[confirmar con el dueño]` — qué quedó realmente desplegado y verificado hoy.

### (2) Desplegado hoy, pendiente de configuración operativa
- **Reglas de seguridad de `delben_facturacion`** `[confirmar deploy]`: lectura de
  `distribuidores` (selector de sede al valorar) y **corte del acceso a cotizaciones de
  distribuidores** (quitado `esFacturacionDelben()` del `collectionGroup` + gate del dashboard).
  Si se desplegaron las reglas, la fuga de precio de venta a facturación está cerrada en backend.

### (3) Implementado en código, NO desplegado
- **⛔ Consecutivo de cotización — IMPLEMENTADO, NO DESPLEGADO.** Completo en código (transacción
  `runTransaction` + contador con constraint +1 en reglas + field-lock de siglas + UI de siglas +
  número en detalle/lista). **Su deploy DEPENDE de tres cosas:**
  1. **Agregar el número al PDF** (`cotizacion-pdf.tsx`) — aún NO está; es requisito antes de desplegar.
  2. **Configurar las siglas de TODOS los distribuidores y sedes activos.** Hoy **solo se puso
     Del Corte Angarita**; faltan los demás. Sin sigla, guardar lanza `SiglaFaltanteError`.
  3. **Orden obligatorio del deploy: reglas → siglas → app.** Las reglas del contador deben estar
     desplegadas ANTES que el app (si no, el guardado falla al escribir el contador). Las siglas
     deben existir ANTES de que los comerciales guarden.
- **Motor de IVA por sede** (reemplaza "exportación sin IVA"; `packages/core`, 6/6 tests verde) +
  **tanda de PDFs** (moneda/IVA reales, totales Opción A, pie sin Delben, marca del distribuidor;
  orden de compra sin IVA): implementados, **pendientes de deploy**. **Tras desplegar el motor**, hay
  que **configurar `iva_pct` en las sedes de exportación** (ej. Venezuela) para que cobren IVA — hoy
  el default de export sigue sembrando 0, así que sin esa config no se cobra IVA al exterior.
- **Resto de la sesión** (rendimiento del carrito, catálogo `modulos_busqueda` —requiere reimport—,
  campo "N.º de OP" en valoraciones): también en código, **sin desplegar** salvo indicación del dueño.

---

## Resumen rápido

| Rebanada | Estado |
|---|---|
| 0 — Cimiento | ✅ Cerrada — motor validado en 5 caminos, 6/6 tests verde |
| 1 — Camino mínimo | ✅ Cerrada — cotizador completo punta a punta |
| 2 — Ancho de catálogo | ✅ Cerrada — catálogo real en Firestore, imágenes en Storage |
| 3 — Multi-tenant + cotizador real | ✅ Cerrada — panel distribuidores, usuarios, cotizador conectado |
| 4 — Persistencia + documentos + roles | ✅ Cerrada — ver detalle abajo |
| 5 — Config avanzada + campañas | ✅ Cerrada — ver detalle abajo |
| 6 — Seguridad + configuración global | ✅ Cerrada — ver detalle abajo |
| Mejoras transversales | ✅ Entregadas — categoría en cotización, costos fijos, desglose Delben |
| Vista Delben cotizaciones | ✅ Entregada — lista global + detalle con desglose Delben |
| Mejoras PDF | ✅ Entregadas — logos, sin precio u., dirección cliente, categoría |
| 7 — Proyectos (R8) | ✅ Cerrada — ver detalle abajo |
| Design polish | ✅ Entregado — sistema de diseño, animaciones, skeletons, logos, home |
| Resumen de proyecto PDF | ✅ Entregado — PDF consolidado con versiones seleccionadas desde ProyectoCard |
| Muebles especiales + totales canónicos | ✅ Entregado — total único, especiales por el motor (2026-06-01) |
| Sedes por distribuidor | ✅ Entregada — config de cálculo por sede, aislamiento por sede (2026-06-02) |
| Catálogo de consulta de precios | ✅ Entregado — `/catalogo` con costo filtrado server-side (2026-06-02) |

## Rebanada 0 — qué se construyó (verificado en navegador)

Estructura real creada:

```
delben-web/
├── package.json + turbo.json       npm workspaces + Turborepo
├── netlify.toml                    @netlify/plugin-nextjs
├── .env.example / .env.local       Firebase conectado
├── packages/
│   ├── core/      motor-calculo.ts + 8 tests Vitest (8/8 verde)
│   ├── firebase/  tipos Rol, ETIQUETA_ROL, 6 roles definidos
│   ├── ui/        stub vacío (para Rebanada 1+)
│   └── config/    tsconfig base + nextjs
└── apps/portal/
    ├── /login     split asimétrico, Geist, acento caoba OKLCH
    └── /          dashboard protegido, NavBar con email + badge rol
```

## Decisiones técnicas tomadas durante la construcción

Estas NO estaban en el diseño original (que las dejaba abiertas); se
resolvieron así durante la Rebanada 0. Son razonables y quedan registradas:

- **Auth**: Firebase JS SDK client-side + `AuthProvider` context. El
  middleware es un STUB. La verificación real server-side con Admin SDK
  llega en Rebanada 4 (cuando entra el multi-tenant real). Coherente con
  el plan: la seguridad estricta por rol es de esa rebanada.
- **Motor**: copiado exacto desde `docs/_referencia_codigo/`, sin tocar la
  lógica. Tests en archivo separado. (Cumple la regla de oro del CLAUDE.md.)
- **Diseño visual**: Geist Sans, paleta stone + caoba OKLCH, layout
  asimétrico. Decisión deliberada de NO usar Inter ni púrpura "IA".
- **Packages**: `@delben/firebase` por ahora solo exporta tipos de roles.
  El Firebase SDK vive en `apps/portal`, no en el package. Se reevaluará
  si otra app necesita Firebase.

Ninguna de estas decisiones contradice el diseño; son detalles de
implementación que el diseño dejaba abiertos.

## Afinamientos del diseño hechos después de Rebanada 0

Estos se descubrieron afinando el diseño con el usuario; ya están
reflejados en `DISENO_SISTEMA.md`. Relevantes al construir la ficha del
módulo (Rebanada 1):

- **Acabado de estructura es CONDICIONAL al tipo de estructura**: si el
  tipo es "Blanca" → estructura blanca fija, sin selector. Si es
  "Premium" → el comercial escoge color de la lista de colores Melamina.
  Mismo patrón condicional que vidrio/metal. Ver §4 de DISENO_SISTEMA.
- **El sobreprecio Premium ya está en el precio base del Excel** (no es
  un ajuste del motor). Verificado con datos reales. El motor NO se toca.
  Ver nota en §2 de DISENO_SISTEMA.
- Colores de estructura premium = misma lista de colores del tipo de
  fachada Melamina (base de trabajo).

## ✅ Validación del motor — 5 CAMINOS VERIFICADOS

El motor (motor_calculo.ts compilado, el real) fue ejecutado y verificado
contra cálculo a mano en sus 5 caminos principales. TODOS coinciden:

| Caso | Camino | Precio final |
|---|---|---|
| 1 | desarmado / cocina / Colombia | 1.562.495 ✓ |
| 2 | tradicional / mueble 35% / Colombia | 1.450.889 ✓ |
| 3 | exportación / Venezuela / IVA sede 16% / USD (tasa 4000) | 380,78 USD ✓ (sin IVA: 328,26) |
| 4 | magenta +12% recargo / desarmado / Colombia | 1.749.995 ✓ |
| 5 | campaña global −10% / desarmado / Colombia | 1.406.246 ✓ |

Esto confirma que el motor NO tiene errores de cálculo (orden de pasos,
margin vs markup, IVA al final, conversión USD, recargo magenta, campaña).
La mecánica del motor está verificada.

**Matiz honesto (no bloquea):** la verificación confirma que el motor es
internamente correcto y consistente con las reglas del diseño. NO puede
confirmar que los números base de las reglas (ej. "cocina desarmado = 30%",
"gestión comercial = margin") sean los que Delben usa en la realidad —
eso solo lo confirma el usuario con Delben. Es una verificación de
MECÁNICA, no de si las reglas de negocio son las reales. Pendiente
menor: que el usuario confirme los números base con su papá cuando pueda.
Ya NO es bloqueante: la mecánica está sólida.

## Estos 5 casos = los tests del motor

Reemplazan los 8 tests de ejemplo en `packages/core`. Claude Code debe
volverlos tests de Vitest, SIN tocar la lógica del motor. Datos exactos
de cada caso en la conversación de diseño / se pueden regenerar.

## Verificación recomendada (independiente)

1. `npm test` en `packages/core`: 8/8 verde, caso 1.562.495 correcto.
2. Rebanada 3 (vistas por rol): `distribuidor_comercial` nunca recibe
   costo Delben.

## Rebanada 1 — qué se construyó

Cotizador mínimo punta a punta:

```
apps/portal/src/
├── app/(portal)/cotizaciones/
│   ├── nueva/page.tsx    form: cliente, proyecto, modalidad
│   └── page.tsx          carrito principal (módulos + totales + PDF)
├── components/cotizador/
│   ├── buscador-modulos.tsx   overlay: búsqueda de módulos (5 cocina demo)
│   ├── ficha-modulo.tsx       overlay: configuración completa (estructura,
│   │                          fachada, subcategoría, acabado, condicionales)
│   ├── cotizacion-pdf.tsx     documento PDF (react-pdf/renderer)
│   └── cotizacion-pdf-button.tsx  botón descarga (dynamic, ssr: false)
├── lib/datos-demo.ts          seed data: módulos, fachadas, categorías
└── store/carrito.ts           Zustand store (cotización, ítems, overlays)
```

Decisiones técnicas:
- **Datos**: hardcoded para R1 (5 módulos cocina, 3 fachadas, subcategorías).
  Se reemplaza con Firestore en Rebanada 2.
- **Estado**: Zustand en memoria (sin persistencia). Suficiente para feedback
  con un comercial real. Firestore en R3.
- **PDF**: @react-pdf/renderer v4. Importado dinámico con ssr:false para
  evitar conflictos ESM. transpilePackages en next.config.ts.
- **Precio en ficha**: NO se muestra en la ficha (solo en el carrito).
  Cumple el diseño de §4 DISENO_SISTEMA.
- **Campos condicionales**: acabado de estructura (solo si Premium);
  vidrio + metal (solo si Aluminio Vidrio). Idéntico al §4 del diseño.
- **filtrarPorRol**: aún no aplicado en R1 (un solo rol de demo). Se aplica
  con los roles reales en R4.

## Rebanada 2 — qué se construyó

Catálogo real en Firestore + panel de importación:

```
apps/portal/src/
├── app/(portal)/admin/
│   ├── layout.tsx              guarda: solo super_admin
│   └── importar/page.tsx       3 pestañas: Módulos / Herrajes / Imágenes
├── components/admin/
│   ├── importar-modulos.tsx    upload → parse → preview → confirm → Firestore
│   ├── importar-herrajes.tsx   ídem para herrajes
│   └── subir-imagenes.tsx      upload a Storage + actualiza imagen_url en Firestore
├── lib/importar/
│   ├── parser-modulos.ts       lee LISTA DE PRECIOS TOTALES.xlsx
│   ├── parser-herrajes.ts      lee Excel de herrajes (columnas con espacios)
│   ├── writer-firestore.ts     escribe en lotes de 400 (idempotente)
│   └── slugify.ts              IDs deterministas
├── lib/firestore/
│   ├── catalogo.ts             getTiposEstructura, getTiposFachada, getSubcategorias,
│   │                           getAcabados, getCategorias
│   └── modulos.ts              buscarModulos, getPreciosModulo
├── lib/firebase/tipos-firestore.ts  tipos canónicos de todos los documentos
└── components/providers/auth-provider.tsx  fallback de rol a Firestore
                                            (sin custom claims en bootstrap)
```

Colecciones Firestore creadas:
- `tipos_estructura` (5 docs)
- `tipos_fachada` (5 docs)
- `categorias` (12 docs)
- `subcategorias` (5 docs — una "Estándar" por fachada)
- `acabados` (colores por subcategoría)
- `modulos` (~2.076 docs) + subcolección `precios` por módulo
- `accesorios` (447 docs)
- `usuarios` (doc del super_admin con `rol: "super_admin"`)

Firebase Storage:
- `imagenes/modulos/` — imágenes de módulos
- `imagenes/herrajes/` — imágenes de herrajes
- `imagen_url` actualizado en Firestore vía matching por `imagen_nombre`

Decisiones técnicas:
- **Importación desde el browser** (no CLI): el super_admin reimporta
  directamente desde `/admin/importar` cuando cambian los precios.
  Idempotente — reimportar actualiza sin duplicar.
- **`imagen_nombre`** guardado en cada documento para hacer matching al
  subir imágenes. Se actualiza a `imagen_url` (URL de Storage) al subir.
- **Subcategorías auto-creadas**: una "Estándar" por tipo de fachada.
  Delben agrega Magenta +12% etc. en el panel admin (Rebanada 4).
- **Rol desde Firestore**: mientras no hay custom claims configurados,
  `auth-provider` lee el rol desde `usuarios/{uid}`. Cuando en R3/R4 se
  implemente gestión de usuarios con Admin SDK, el JWT claim toma precedencia.
- **`packageManager`** añadido al `package.json` raíz (requerido por Turbo 2.x).

## Rebanada 3 — qué se construyó

Multi-tenant completo + cotizador conectado a datos reales:

```
apps/portal/src/
├── app/(portal)/admin/
│   ├── layout.tsx                    nav con pestañas admin
│   ├── distribuidores/page.tsx       lista de distribuidores
│   ├── distribuidores/nuevo/page.tsx form crear distribuidor (Zod)
│   └── distribuidores/[id]/page.tsx  detalle: config + usuarios + crear usuario
├── lib/firestore/
│   ├── distribuidores.ts             CRUD distribuidores + usuarios
│   └── modulos.ts                    caché sesión, buscarModulos, buscarAccesorios,
│                                     getVariantesModulo, getPreciosModulo
├── components/cotizador/
│   ├── buscador-modulos.tsx          2 tabs: Módulos + Herrajes (busqueda real)
│   └── ficha-modulo.tsx              dimensiones por catálogo (mm), herrajes borrador
├── store/carrito.ts                  HerrajeAsociado, ItemHerrajeCarrito,
│                                     buildMotorParams(dist), datos reales del motor
└── app/(portal)/cotizaciones/
    └── page.tsx                      total con herrajesAsociados + herrajes sueltos
```

Decisiones técnicas:
- **Caché de módulos en sesión**: los 2.076 módulos y 447 herrajes se cargan
  una sola vez y quedan en memoria del módulo (no en React state). Búsquedas
  subsecuentes son instantáneas.
- **Deduplicación de módulos**: el buscador muestra un resultado por nombre único;
  las dimensiones se eligen en la ficha vía `getVariantesModulo`.
- **Dimensiones por catálogo**: la ficha muestra solo los combos altura × profundidad
  disponibles en Firestore (no input libre), en mm.
- **Herrajes en ficha**: el comercial agrega herrajes asociados al módulo desde dentro
  de la ficha. Al guardar en carrito, van embebidos como `herrajesAsociados[]`.
- **Motor conectado**: `buildMotorParams(dist)` construye los parámetros del motor
  desde el doc real del distribuidor en Firestore. Si no hay distribuidor, cae a DEMO.
- **Creación de usuarios**: app Firebase secundaria para `createUserWithEmailAndPassword`
  sin cerrar sesión del admin.
- **Sin `orderBy` en queries `where`**: Firestore no tiene los índices compuestos
  necesarios. Se ordena client-side en todos los casos.

Colecciones Firestore nuevas:
- `distribuidores/{id}` — config completa del distribuidor (descuentos, servicios,
  universo, flags acceso_tradicional/desarmado, ciudad, país)
- `usuarios/{uid}` — existente, ahora incluye `distribuidor_id`

## Rebanada 4 — qué se construyó

Persistencia completa + dos PDFs + vistas por rol + herramientas de gestión:

```
apps/portal/src/
├── app/(portal)/cotizaciones/
│   ├── nueva/page.tsx          form: cliente, proyecto, modalidad → /borrador
│   ├── borrador/page.tsx       carrito activo: módulos, herrajes, guardar, PDFs
│   ├── [id]/page.tsx           vista detalle: snapshot, PDFs, acciones
│   └── page.tsx                lista con edición inline de nombre
├── components/cotizador/
│   ├── cotizacion-pdf.tsx      PDF cotización cliente (refactorizado a tipos normalizados)
│   ├── cotizacion-pdf-button.tsx
│   ├── orden-compra-pdf.tsx    PDF orden de compra (CONFIDENCIAL, solo roles con costo)
│   └── orden-compra-pdf-button.tsx
├── lib/
│   ├── pdf-helpers.ts          tipos normalizados ItemPDF/HerrajePDF/InfoPDF + conversores
│   ├── firestore/cotizaciones.ts  guardar, actualizar, listar, detalle, renombrar, cambiarEstado
│   └── firestore/recalcular.ts   recalcularCotizacion (motor + Firestore fresco)
└── store/carrito.ts            + cotizacionGuardadaId, guardar, reabrirBorrador,
                                  copiarBorrador, cargarBorrador (persist en localStorage)
```

Funcionalidades entregadas:
- **Guardar cotización** como snapshot inmutable en Firestore (todos los números congelados)
- **Lista** de cotizaciones por distribuidor con badges de estado/modalidad y total
- **Vista detalle** con desglose expandible de ítems, herrajes, costo Delben (solo roles con acceso)
- **Vista borrador** activo con motor conectado, buscador, ficha, guardar/actualizar
- **Dos PDFs**: cotización cliente + orden de compra Delben (esta última solo para roles con costo)
- **Continuar editando** un borrador guardado desde cualquier sesión/dispositivo
- **Duplicar** cotización (carga en borrador para revisar antes de guardar nueva)
- **Actualizar precios**: refetcha distribuidor + catálogo actual + re-corre el motor completo
- **Edición inline de nombre** (proyecto + cliente) en lista y vista detalle
- **Vistas por rol**: `distribuidor_comercial` nunca ve costo Delben en ninguna pantalla ni PDF

Decisiones técnicas:
- **Snapshot inmutable**: los campos calculados (costo_delben, precio_final_unitario, etc.)
  se guardan como números planos. Cambiar precios en el catálogo NO afecta cotizaciones viejas.
- **Persistencia localStorage**: el borrador activo sobrevive recarga de página (Zustand persist).
- **Sin Security Rules reales**: reglas permisivas temporales (`if request.auth != null`).
  Es la deuda técnica más crítica — queda para cierre antes de producción.
- **IDs en snapshot**: a partir de R4 los snapshots incluyen `tipoEstructuraId`, `tipoFachadaId`,
  `subcategoriaId` en config, permitiendo el recálculo de precios en cotizaciones futuras.
  Las cotizaciones anteriores sin IDs usan el resultado original como fallback.
- **Recálculo paralelo**: `Promise.all` para los fetches de items y herrajes.

## Rebanada 5 — qué se construyó

```
apps/portal/src/
├── app/(portal)/admin/
│   ├── acabados/page.tsx        panel subcategorías y acabados (super_admin)
│   └── campanas/page.tsx        panel campañas (super_admin)
├── app/(portal)/configuracion/
│   └── page.tsx                 configuración del distribuidor_admin
├── lib/firestore/
│   ├── catalogo.ts              + crearSubcategoria, crearAcabado, toggle activo,
│   │                              getAllSubcategoriasAdmin
│   └── campanas.ts              getCampanas, getCampanasActivas, crearCampana,
│                                toggleCampanaActiva, campanaToMotor
└── store/carrito.ts             + campanasDisponibles (no persistido), setCampanas
```

Funcionalidades entregadas:
- **Panel subcategorías y acabados**: crear líneas (ej. Magenta +12%) por tipo de fachada,
  agregar colores, activar/desactivar sin borrar.
- **Configuración del distribuidor_admin**: ver condiciones Delben (solo lectura), editar
  universo propio (transporte/instalación/imprevistos/utilidad/IVA), gestionar equipo
  (crear costos y comercial; admin solo lo crea Delben).
- **Campañas**: el super_admin crea descuentos temporales por distribuidor (segmentada)
  o para todos (global), con filtro opcional por categoría y línea de acabado.
  Motor conectado: borrador y recálculo reciben campañas activas reales.
  Estado automático en UI: Vigente / Programada / Vencida / Inactiva.

Decisiones técnicas:
- **campanasDisponibles no persiste** en localStorage: se refresca en cada sesión
  al abrir el borrador. Evita campañas vencidas aplicándose desde caché vieja.
- **cambiarEstado descartado**: prematuro sin CRM ni emails reales. La función
  `cambiarEstado` queda en `cotizaciones.ts` para uso futuro sin UI.

## Rebanada 6 — qué se construyó ✅

```
apps/portal/src/
├── app/(portal)/admin/
│   ├── config/page.tsx              tasa USD: historial, actualizar, fallback 4000 COP
│   └── distribuidores/[id]/page.tsx + condiciones Delben editables (form Zod),
│                                      sección universo solo-lectura, historial de condiciones
├── app/(portal)/configuracion/
│   └── page.tsx                     + transporte/instalación: toggle porcentual/fijo
├── lib/firestore/
│   ├── config.ts                    getTasaUsdActual, getTasaUsdHistorial, actualizarTasaUsd
│   └── distribuidores.ts            + guardarHistorialCondiciones, getHistorialCondiciones
└── firestore.rules                  reglas completas desplegadas en Firebase Console
```

Funcionalidades entregadas:
- **Firestore Security Rules** desplegadas manualmente en Firebase Console. Aislamiento
  completo por tenant. Catálogo solo lectura para usuarios; escritura solo super_admin.
  Cotizaciones solo accesibles por el propio tenant. Usuarios: reglas granulares por rol.
  Subcoleción `historial_condiciones` y `tasa_usd_historial` cubiertas.
- **Tasa USD configurable**: el super_admin actualiza la tasa desde `/admin/config`.
  Se guarda en `tasa_usd_historial` con historial completo. El motor y el recálculo
  siempre usan la tasa más reciente de Firestore (fallback: 4000 COP).
- **Historial de condiciones**: al guardar condiciones Delben de un distribuidor
  (descuentos + servicios), se crea automáticamente un snapshot en
  `/distribuidores/{id}/historial_condiciones`. La UI muestra los últimos 10.
- **Universo configurable con modo fijo**: el distribuidor_admin puede configurar
  transporte e instalación como porcentual (% del subtotal) o fijo por proyecto.

Mecanismo de reglas: `get(/usuarios/{uid})` para rol + distribuidor_id. Cacheado por request.

---

## Mejoras transversales entregadas (post-R6)

### 1. Categoría obligatoria al crear cotización

`cotizaciones/nueva/page.tsx` — ahora tiene 4 campos: cliente, proyecto, **categoría**
(selección visual de tarjetas cargadas de Firestore), modalidad. La categoría es obligatoria.

El buscador de módulos filtra automáticamente por la categoría seleccionada. El placeholder
del buscador muestra la categoría activa. `CotizacionInfo` ahora incluye `categoriaId` +
`categoriaNombre`; se persiste con la cotización en Firestore.

### 2. Costos fijos de transporte e instalación por proyecto

Cuando el distribuidor configura modo "fijo" en `/configuracion`, el borrador muestra
una sección "Costos fijos del proyecto" con inputs de transporte e instalación (en la
moneda del país del distribuidor). El motor recibe 0 para esos porcentajes; los montos
se suman al total del proyecto y se guardan en `TotalesCotizacion.transporteFijo` e
`instalacionFija`. La vista detalle los muestra como líneas separadas.

### 3. Desglose completo de costos por ítem (roles con acceso)

En la vista detalle de una cotización (`/cotizaciones/[id]/page.tsx`), al expandir un
módulo, los roles `distribuidor_costos`, `distribuidor_admin`, `super_admin` y
`delben_*` ven el desglose completo derivado matemáticamente del snapshot:

```
Precio base (tras descuentos y campaña)
+ Diseño X%
+ Cotización X%
+ Producción X%
+ Logística X%
+ Gestión comercial X% (margin)
→ Costo Delben
+ Transporte X%  (si porcentual; si fijo: se muestra a nivel de proyecto)
+ Instalación X%
+ Imprevistos X%
+ Utilidad X% (margin)
→ Sin IVA
+ IVA X%
→ Precio final
```

El desglose se calcula en el cliente usando el snapshot (`costo_tras_descuentos`,
`servicios_subtotal1`, `costo_delben`, `distribuidor_subtotal2`) + las condiciones
actuales del distribuidor (cargadas al abrir el detalle). Nota: si las condiciones
cambiaron desde que se guardó la cotización, los montos individuales son aproximados;
los subtotales del snapshot siguen siendo los valores reales.

### Archivos modificados en mejoras transversales

- `lib/firebase/tipos-firestore.ts` — universo con `transporte_tipo?/instalacion_tipo?`,
  `TotalesCotizacion` con `transporteFijo?/instalacionFija?`, `CotizacionDoc` con
  `categoriaId?/categoriaNombre?`
- `store/carrito.ts` — `CotizacionInfo` con los 4 campos nuevos, `buildMotorParams`
  pasa 0 cuando modo fijo, nuevo action `actualizarCostosProyecto`
- `lib/firestore/cotizaciones.ts` — `guardarCotizacion` y `actualizarCotizacion`
  guardan los nuevos campos
- `lib/firestore/recalcular.ts` — `recalcularCotizacion` mapea los nuevos campos
- `cotizaciones/nueva/page.tsx` — selector de categoría
- `components/cotizador/buscador-modulos.tsx` — filtra por categoría
- `cotizaciones/borrador/page.tsx` — sección costos fijos + moneda derivada del país
- `cotizaciones/[id]/page.tsx` — carga distribuidor, desglose completo por ítem,
  muestra costos fijos del proyecto en totales
- `configuracion/page.tsx` — toggle porcentual/fijo para transporte e instalación

---

## Vista Delben de cotizaciones — qué se construyó

```
apps/portal/src/app/(portal)/admin/
├── layout.tsx                               + link "Cotizaciones" en nav admin
├── cotizaciones/page.tsx                    lista global con filtro por distribuidor
└── cotizaciones/[distribuidorId]/[id]/page.tsx  detalle completo: desglose Delben por proyecto,
                                                 módulos expandibles, herrajes sueltos (solo lectura)
lib/firestore/cotizaciones.ts                + getCotizacionesTodas() (collectionGroup)
firestore.rules                              + regla collectionGroup para super_admin
```

Desglose de costos: nivel de proyecto (suma de todos los ítems y herrajes), no por módulo.
El detalle es de solo lectura — las ediciones las hace el distribuidor desde su propia vista.

## Mejoras PDF — qué se construyó

```
apps/portal/src/
├── components/cotizador/
│   ├── cotizacion-pdf.tsx   logo distribuidor en cabecera, sin columna "Precio u.",
│   │                        dirección del cliente bajo el nombre, categoría en cabecera
│   └── orden-compra-pdf.tsx logo distribuidor + logo Delben en cabecera izquierda
├── lib/pdf-helpers.ts       InfoPDF ampliado: logoDistribuidorUrl, logoDelbenUrl,
│                            clienteDireccion, categoriaNombre
│                            cotizacionInfoToInfoPDF acepta logos opcionales
├── lib/firebase/tipos-firestore.ts  DistribuidorDoc.logo_url, CotizacionDoc.clienteDireccion
├── lib/firestore/config.ts  + getLogoDelben, setLogoDelben (colección config/delben)
├── store/carrito.ts         CotizacionInfo.clienteDireccion
├── cotizaciones/nueva/page.tsx  campo dirección del cliente (opcional)
├── cotizaciones/borrador/page.tsx  pasa logos (distribuidor + Delben) al PDF
├── cotizaciones/[id]/page.tsx      ídem
├── app/(portal)/admin/config/page.tsx      sección "Logo de Delben" con upload a Storage
└── app/(portal)/configuracion/page.tsx    sección "Logo de la empresa" con upload a Storage
firestore.rules              + regla colección /config (lectura: autenticados, escritura: super_admin)
```

**Pendiente post-despliegue**: actualizar reglas en Firebase Console (`firebase deploy --only firestore:rules`). Las reglas de Storage (logos en `logos/delben` y `logos/distribuidores/{id}`) deben permitir escritura a usuarios autenticados con el rol correcto — verificar en Firebase Console si están restrictivas.

## Rebanada 7 (R8) — qué se construyó ✅

```
apps/portal/src/
├── app/(portal)/cotizaciones/
│   ├── nueva/page.tsx      form 2 pasos con Suspense: paso 1 datos proyecto,
│   │                       paso 2 selección macro categoría + modalidad
│   ├── page.tsx            ProyectoCard: espacios × versiones agrupados, estado editable
│   └── [id]/page.tsx       + Suspense + useSearchParams para ?pid= (ruta directa Firestore)
├── lib/firestore/
│   ├── proyectos.ts        crearProyecto, getProyectos, getProyecto, actualizarProyecto
│   └── cotizaciones.ts     getCotizaciones sin collectionGroup (fetch por proyecto)
└── lib/firebase/tipos-firestore.ts  ProyectoDoc, CategoriaMacroDoc, CategoriaDoc extendido
```

```
apps/portal/src/app/(portal)/admin/
└── categorias/page.tsx     CRUD macros + asignación categorías de lista a macros + Sembrar
```

Colecciones Firestore nuevas:
- `/distribuidores/{id}/proyectos/{id}` — documento de proyecto (cliente, estado, timestamps)
- `/distribuidores/{id}/proyectos/{id}/cotizaciones/{id}` — cotizaciones anidadas
- `categorias_macro` — 6 macros: Cocina, Closet, Muebles de Baño, Centros de Entretenimiento, Carpintería, Otros
- `categorias` — actualizado con `categorias_macro_ids[]` y `mostrar_en_todas`

Funcionalidades entregadas:
- **Proyectos y espacios**: nueva cotización crea/reutiliza proyecto; espacios agrupan versiones del mismo ambiente
- **Estado del proyecto editable**: badge "En proceso / Aceptado / Perdido" con dropdown inline en la tarjeta
- **Macro categorías**: el cotizador muestra Cocina/Closet/etc. en paso 2; el buscador filtra módulos por macro → categorías de lista
- **Admin macros**: super_admin crea/edita/elimina macros y asigna categorías de lista a cada macro
- **Sembrar datos**: botón idempotente que crea macros + categorías de lista si no existen

## Design polish — qué se construyó ✅

Sistema de diseño documentado y aplicado en todo el portal:

```
PRODUCT.md                       descripción del producto, usuarios, registro, anti-referencias
DESIGN.md                        paleta stone + caoba OKLCH, tipografía Geist, tokens de animación,
                                 patrones de componentes, reglas de skeleton loaders

apps/portal/src/
├── components/
│   ├── logo-delben.tsx          LogoDelbenNav + LogoDelbenAdmin: carga logo desde
│   │                            Firestore (config/delben.logo_url), caché a nivel módulo
│   └── nav-portal.tsx           NavLink con active state real (usePathname), logo dinámico,
│                                redirect super_admin/delben_facturacion a /admin
├── app/(portal)/
│   ├── page.tsx                 Home distribuidor: saludo, 3 stats, proyectos recientes,
│   │                            CTA "Nuevo proyecto". super_admin → redirect /admin
│   ├── layout.tsx               bg-stone-50 min-h-[100dvh], NavPortal, max-w-7xl px py-10
│   ├── admin/layout.tsx         LogoDelbenAdmin en sidebar; animate-aparecer en secciones
│   ├── cotizaciones/
│   │   ├── page.tsx             SkeletonProyectoCard (animate-pulse), stagger en ProyectoCards
│   │   ├── [id]/page.tsx        Skeleton header + 4 content cards (animate-pulse)
│   │   ├── nueva/page.tsx       Sin double wrapper, skeleton grid para categorías,
│   │   │                        skeleton list para proyectos
│   │   └── borrador/page.tsx    Sin double wrapper/padding, breadcrumb con ArrowLeft,
│   │                            animate-aparecer en outer container
│   └── components/cotizador/
│       └── ficha-modulo.tsx     Skeleton form completo al cargar catálogo (en lugar de spinner)
└── tailwind.config.ts           animate-desplegarse (dropdowns), animate-aparecer
                                 (stagger con animationDelay), --ease-out-fuerte,
                                 .tactil (scale 0.97 en :active)
```

Principios aplicados (Emil Kowalski / impeccable skill):
- Skeletons que coinciden en forma con el contenido real (no spinners genéricos para estados lentos)
- `.tactil` en todos los elementos interactivos: `transform: scale(0.97)` en `:active`
- `animate-aparecer` con stagger escalonado (0/60/120/180ms) para entradas de lista
- Nunca `scale(0)` en animaciones de entrada — siempre `scale(0.96)` + opacity
- `animate-desplegarse` en dropdowns con `origin-top-left`
- Logos cargados desde Firestore con caché a nivel módulo (sin re-fetch entre navegaciones)

---

## Resumen de proyecto PDF — qué se construyó ✅

```
apps/portal/src/
├── components/cotizador/
│   ├── resumen-proyecto-pdf.tsx        Documento @react-pdf/renderer: header logos,
│   │                                   info proyecto/cliente, tabla versiones
│   │                                   (Espacio | Ver. | Descripción | Modalidad | Total),
│   │                                   total consolidado, nota al pie
│   └── resumen-proyecto-pdf-button.tsx Botón descarga, mismo patrón dynamic + PDFDownloadLink
│                                       que los otros PDFs del sistema
└── app/(portal)/cotizaciones/page.tsx  ProyectoCard ampliada:
                                        · Botón "Resumen" (solo si hay cotizaciones)
                                        · Panel expandido con:
                                          - Checkboxes por versión
                                          - Campo descripción editable (pre-relleno con version_nombre)
                                          - Total en vivo de versiones seleccionadas
                                          - Botón PDF cuando hay ≥1 seleccionada
                                        · Logos cargados de forma diferida al abrir el panel
                                        · Versiones ordenadas: por espacio → por número de versión
```

Caso de uso: el distribuidor tiene "Apartamento 302" con Cocina v1/v2 y Closet v1. Abre el panel "Resumen", desmarca la versión que no quiere presentar, agrega descripciones ("Con isla grande", "Sin isla"), descarga el PDF consolidado para el cliente final.

---

## Muebles especiales + totales canónicos — qué se construyó ✅ (2026-06-01)

Sesión de corrección a partir de cotizaciones reales. Cuatro arreglos
encadenados sobre el cotizador y las cotizaciones guardadas:

### 1. Total único y consistente (carrito = guardado = PDFs)
Antes el total se calculaba con tres fórmulas distintas (el carrito sumaba
especiales pero no costos fijos; `guardar()` sumaba fijos pero descartaba
especiales; el PDF no sumaba ni uno ni otro). Ahora hay UNA función,
`calcularTotalesCotizacion()` en `store/carrito.ts`, fuente de verdad del total:

```
total = módulos + herrajes asociados + herrajes sueltos
      + muebles especiales + transporte fijo + instalación fija
```

La usan la pantalla del carrito, `guardar()`, `guardarValoracion()` y de ahí
derivan los PDFs. Los cuatro números coinciden.

### 2. Muebles especiales: persistencia
Antes NO se guardaban en Firestore (solo vivían en memoria del carrito y se
perdían al guardar/reabrir). Ahora se persisten (`itemsEspeciales` en
cotizaciones y valoraciones), sobreviven al refresco (`partialize`), se
restauran al reabrir/copiar/recalcular y se muestran como ítems en el detalle
(distribuidor y admin) y en ambos PDFs (cotización = precio cliente; orden de
compra = costo Delben; los fijos NO entran en la orden de compra).

> Pérdida histórica: las cotizaciones guardadas ANTES de este cambio no tienen
> especiales (nunca se escribieron). No recuperables; hay que rehacerlas.

### 3. Muebles especiales: cálculo por el MOTOR completo
Regla de negocio confirmada con el dueño. El campo que se ingresa es el
**precio de lista base** (como el `precio_cop` del catálogo). El especial pasa
por `calcularItem()` (el motor validado, sin tocarlo) con `tipo_item: 'mueble'`:
descuento + ajuste de acabado + campaña + servicios Delben → costo Delben, y
luego la capa distribuidor → precio al cliente. Así su costo queda idéntico al
de un módulo del catálogo del mismo precio de lista. La categoría (para el
descuento en desarmado y la segmentación de campañas) se resuelve del módulo de
referencia, o de la categoría de la cotización.

> Decisión previa descartada: "lista − descuento" (dejaba el costo demasiado
> bajo porque omitía los servicios Delben).

### 4. Desglose de la cotización guardada
- Bug corregido en `calcularDesglose`: la utilidad daba ≈0 (`subtotal2 −
  universo_aditivo`, valores idénticos). Ahora es `precio_sin_iva − subtotal2`.
- Los especiales se **funden** en el desglose por capas (entran en Precio base,
  Precio Delben, utilidad e IVA). Los nuevos guardan su `resultado` del motor;
  los viejos se reconstruyen con `reconstruirResultadoEspecial()` desde su costo
  Delben + parámetros del distribuidor. Desaparece la línea suelta "Muebles
  especiales" del desglose por capas.

### Archivos clave
`store/carrito.ts`, `lib/firebase/tipos-firestore.ts`,
`lib/firestore/{cotizaciones,valoraciones,recalcular}.ts`, `lib/pdf-helpers.ts`,
`components/cotizador/{buscador-modulos,cotizacion-pdf,orden-compra-pdf,
cotizacion-pdf-button,orden-compra-pdf-button}.tsx`,
`cotizaciones/{borrador,[id]}/page.tsx`,
`admin/cotizaciones/[distribuidorId]/[id]/page.tsx`.

### Limitaciones conocidas
- "Actualizar precios" recalcula los módulos pero NO los especiales (guardan su
  costo/precio unitario, no el precio de lista base). Si cambian servicios o
  descuentos, los especiales conservan su valor; habría que recrearlos o, a
  futuro, guardar también el precio de lista base.
- La reconstrucción del desglose de especiales viejos usa los parámetros
  ACTUALES del distribuidor; si cambiaron desde el guardado, el reparto entre
  capas puede variar (el costo Delben y el total se mantienen exactos).

---

## Sedes por distribuidor — qué se construyó ✅ (2026-06-02)

Las condiciones de cálculo pasaron del distribuidor a una subcolección
`distribuidores/{id}/sedes/{sedeId}`. Diseño completo en `DISENO_SISTEMA.md`
(§1 Sedes y §3 datos).

```
apps/portal/src/
├── lib/firebase/tipos-firestore.ts   SedeDoc; config de cálculo movida del
│                                      DistribuidorDoc a la sede; sede_id en
│                                      cotización/valoración; sedes en usuarios
├── lib/firestore/sedes.ts            CRUD de sedes + lectura de la sede activa
├── lib/firestore/distribuidores.ts   distribuidor identitario; helpers por sede
├── app/(portal)/admin/distribuidores/[id]/page.tsx  super_admin crea/edita sedes (capa Delben)
├── app/(portal)/configuracion/page.tsx              distribuidor_admin: universo POR sede
├── app/(portal)/cotizaciones/nueva/page.tsx         selector de sede al iniciar
├── store/carrito.ts                  arrastra sede_id; el motor lee condiciones de la sede
└── firestore.rules                   aislamiento por sede (comercial de A no ve cotizaciones de B)
```

- **Capa Delben** (descuentos, servicios, gestión comercial): la define el super_admin por sede.
- **Capa Distribuidor** (universo): la configura el distribuidor_admin por sede; la sede queda
  "lista para cotizar" cuando el universo está completo.
- **País/moneda/IVA** se derivan de la sede. El motor NO se tocó (caso 1.562.495 intacto).
- **Sin migración legacy**: la data previa era de prueba; no se construyó compatibilidad
  con el esquema plano viejo del distribuidor.
- Pregunta operativa que quedó abierta en el diseño: la asignación de usuarios a sedes
  (pantalla de equipo existente vs. nueva). Verificar cómo se resolvió en la implementación.

## Catálogo de consulta de precios — qué se construyó ✅ (2026-06-02)

```
apps/portal/src/
├── app/(portal)/catalogo/page.tsx    módulos y herrajes con precio lista − descuento
│                                      por modalidad; módulos muestran "Desde {precio_min}"
├── app/api/catalogo/route.ts         calcula y FILTRA el costo server-side (Admin SDK vía ADC):
│                                      el distribuidor_comercial NO recibe el costo
├── lib/firebase/admin.ts             init del Firebase Admin SDK
├── lib/catalogo-precios.ts           lista − descuento principal por modalidad
├── lib/catalogo-tipos.ts             tipos del catálogo de consulta
└── lib/importar/parser-modulos.ts    + backfill de precio_min sobre el catálogo existente
tests/catalogo/SEGURIDAD.md           verificación de la regla de oro #2 (ver el doc)
tests/catalogo/check-comercial.mjs    script: falla si el comercial recibe el costo
```

- Delben elige distribuidor → sede → modalidad; el distribuidor ve su propia sede.
- **Separación real (regla de oro #2)**: `precioConDescuento`/`descuentoPct` solo se adjuntan
  a la respuesta si el rol puede ver costo; para el comercial el campo no existe en el JSON.
  El rol sale del token verificado, no del cliente. Detalle y verificación en
  `tests/catalogo/SEGURIDAD.md`.
- Límite conocido: el catálogo aplica solo lista − descuento principal (no expone servicios
  ni gestión comercial). Ver deuda técnica §1.

---

## Deuda técnica y riesgos

> Absorbido del antiguo `RESUMEN_PROYECTO_COMPLETO.md`. Lo accionable que falta o
> hay que vigilar.

### 1. ⚠️ Seguridad: el costo Delben es alcanzable por `distribuidor_comercial`
La regla de oro #2 dice que el comercial **jamás** debe recibir el costo Delben
("separación real en backend, no visual"). Sin embargo, las cotizaciones guardadas
almacenan `costo_delben` y los pasos internos **dentro de cada `resultado`** del
snapshot, y las Security Rules de cotizaciones permiten leer a cualquier miembro
del tenant (incluido el comercial). `filtrarPorRol()` existe pero hoy solo se
aplica en la UI. **Mitigación posible**: no persistir los campos de costo en el
snapshot legible por ese rol, separarlos en otro documento/colección con reglas
que excluyan al comercial, o servir los cálculos por un endpoint que filtre antes
de responder (como ya hace `/api/catalogo`). El catálogo de consulta ya sigue el
patrón correcto; las cotizaciones aún no.

**Caso inverso relacionado (valoraciones de `delben_facturacion`):** la regla de oro
dice que facturación ve costo Delben pero **nunca** precio de venta. La UI del borrador
de valoración lo respeta (solo muestra `costo_delben`/`costo_tras_descuentos`). Pero el
motor calcula `precio_final_unitario` y `guardarValoracion` lo **persiste dentro de
`resultado`** en el doc de la valoración; no se muestra, pero el dato de venta queda
almacenado y sería alcanzable por facturación si algún día se expone `resultado` crudo.
Misma clase de problema que arriba (campos sensibles dentro de `resultado` del snapshot).
**No se arregla ahora**; mitigación futura: no persistir los campos de venta en
valoraciones, o separarlos. Detectado al arreglar el bug de selectores (2026-06-04).

**Mitad facturación↔precio de venta — CERRADA (2026-06-04):** se cortó la fuga por la que
`delben_facturacion` alcanzaba el precio de venta de cotizaciones de distribuidores (regla del
`collectionGroup` + dashboard sin gate). Quitado `esFacturacionDelben()` de los reads de cotizaciones
y gateado el dashboard. **La mitad de ESTA sección (comercial↔`costo_delben`) sigue abierta** con la
misma causa raíz (snapshot monolítico). Solución sistémica común: Opción C. Ver bitácora 2026-06-04.

### 2. Inconsistencia de roles documentación ↔ código
`delben_comercial` aparece en `CLAUDE.md` y `DISENO_SISTEMA.md`, pero el código
tiene **5 roles** (`packages/firebase/src/roles.ts`), sin ese rol. Decidir si se
implementa o se elimina de la documentación, e igualar.

### 3. Auth server-side parcial
El middleware de auth fue un STUB en la Rebanada 0; la verificación fuerte
server-side con Admin SDK estaba prevista para multi-tenant. `/api/catalogo` ya
verifica el token con Admin SDK; conviene confirmar el estado de la verificación
de sesión en el resto de rutas server-side.

### 4. Estado de servidor
El diseño menciona TanStack Query, pero en la práctica las páginas leen Firestore
directamente (client SDK). No es un bug; tenerlo presente para caché/revalidación.

### 5. Despliegue de Security Rules
Las reglas (`firestore.rules`, `storage.rules`) viven en el repo. Verificar que la
versión desplegada coincide (`firebase deploy --only firestore:rules`). `.firebaserc`
tenía placeholder `REEMPLAZA_CON_TU_PROJECT_ID`: confirmar el project ID real.

### 6. Snapshots históricos congelados
Cotizaciones guardadas con código anterior conservan totales viejos (sin especiales
o sin costos fijos consistentes) y no tienen muebles especiales (nunca se escribieron).
Para corregir una: abrir → "Actualizar precios" → guardar. Los especiales viejos no
son recuperables; hay que rehacerlos.

### 7. Pendientes de obra
- **Web institucional** (`apps/web/`): la ruta existe en el monorepo pero está vacía.
- **Tipo MELAMINA PREMIUM en `tipos_estructura`**: el usuario lo eliminará manualmente
  desde Firebase Console (no tiene datos de precios asociados).
- ✅ **GitHub**: conectado, `origin/main` con el trabajo pusheado.

### 8. Pendientes funcionales abiertos (de la sesión 2026-06-04)
- **Número de consecutivo en el PDF**: el `numero_consecutivo` se guarda y se muestra en
  detalle/lista, pero **falta mostrarlo en `cotizacion-pdf.tsx`** (y dónde aplique). Es
  **requisito** para desplegar el consecutivo (ver "Estado de despliegue").
- **Saludo con nombre**: el saludo del home/dashboard debe usar el **nombre real** del usuario,
  no el prefijo del email u otro placeholder.
- **Mueble especial en pesos en pantalla**: revisar que el mueble especial se muestre/ingrese
  en **pesos** en la pantalla (hoy no es consistente). Solo display/entrada; no toca el motor.
- **Configurar `iva_pct` en sedes de exportación** tras desplegar el motor de IVA (ver despliegue).
- **Configurar siglas** de todos los distribuidores/sedes activos (hoy solo Del Corte Angarita).

### 9. Permisos del `distribuidor_admin`
Revisar y acotar el alcance de lo que el `distribuidor_admin` puede escribir/editar. Hoy escribe
el doc del distribuidor (p. ej. su logo en `/configuracion`), por lo que la `sigla` se protegió con
**field-lock** (solo super_admin la cambia) en vez de restringir todo el doc. Verificar que no haya
otros campos sensibles que el admin pueda tocar y que el conjunto de permisos sea el deseado.

### 10. Seguridad §1 sigue abierta: `distribuidor_comercial` ↔ `costo_delben`
La mitad **facturación↔precio de venta** se cerró el 2026-06-04 (ver §1). La mitad
**`distribuidor_comercial` alcanza el `costo_delben`** del snapshot de cotización **sigue abierta**,
con la misma causa raíz (snapshot monolítico legible entero; `filtrarPorRol` solo en UI). Solución
sistémica común (Opción C): separar costo/venta en otro doc/colección o servir por endpoint que
filtre por rol. Ver §1 y bitácora 2026-06-04.

---

## Bitácora cronológica

> Registro inverso de cambios relevantes (lo más nuevo arriba). Agregar una entrada
> cada vez que se implemente o corrija algo importante: fecha, qué cambió, archivos.
> Antes vivía en la sección "Actualizaciones" de `README.md`; se consolidó aquí.

### 2026-06-05 — Backfill de números consecutivos para las cotizaciones viejas de DCA
Las 11 cotizaciones de Del Corte Angarita (`o29oR2xWsChtrYwyGNGd`) guardadas antes del
consecutivo no tenían `numero_consecutivo`. Se numeraron con Admin SDK (ignora Security
Rules, correcto para un script de una vez). Decisiones del dueño: las 7 sin `sede_id`
(anteriores a sedes) son todas de Colombia → se les asignó `sede_id = pD2WuYjnQpYYCQ8FTc0a`;
todas con formato uniforme `DCA-COL-2026-####`; orden cronológico ascendente por `createdAt`.

- **Diagnóstico previo** (`tests/catalogo/diagnostico-consecutivos.mjs`, SOLO LECTURA):
  recorre `collectionGroup('cotizaciones')` y reporta con/sin número, agrupación por
  distribuidor/sede, casos sin `sede_id`, estado de siglas y contadores, rangos de `numero_seq`
  y de fechas. Reutilizable para futuros backfills.
- **Backfill** (`tests/catalogo/backfill-consecutivos.mjs`, dry-run por defecto, `--write` para
  aplicar): asignó `DCA-COL-2026-0001…0011` (siglas LEÍDAS del doc dist/sede, no hardcodeadas;
  aborta si no coinciden con DCA/COL). Resultado: 7 viejas → 0001–0007 (+ `sede_id`), 4 con sede
  → 0008–0011. Escritura todo-o-nada en un batch (11 updates + contador). Idempotente
  (segunda corrida: 0 a numerar). Aborta si el contador ya tuviera `ultimo > 0`.
- **Contador** `distribuidores/o29oR2xWsChtrYwyGNGd/sedes/pD2WuYjnQpYYCQ8FTc0a/contadores/2026`
  creado con `ultimo = 11`. La próxima cotización nueva por el SDK cliente escribirá 11→12
  (paso +1), cumpliendo el constraint de `firestore.rules`. No se tocó el motor, ni las reglas,
  ni `guardarCotizacion`.

> Pendiente relacionado (deuda §8): el número de consecutivo aún NO se muestra en el PDF
> (`cotizacion-pdf.tsx`), requisito previo al deploy del consecutivo.

### 2026-06-04 — Rendimiento: primera tanda (throttle persist, caché herrajes, waterfall, memo)
Cuatro mejoras de rendimiento del cotizador, sin tocar el motor (`packages/core`)
ni reglas de negocio. Diagnóstico previo en sesión aparte.

1. **Throttle de la escritura de `persist`** (`store/carrito.ts`): el persist
   serializaba TODO el carrito a localStorage en cada `set`, incluido cada tick de
   cantidad. Ahora un storage custom (`crearAlmacenThrottled`) difiere 400ms las
   escrituras de alta frecuencia (las tres acciones `cambiarCantidad*`, envueltas en
   `conPersistenciaDiferida`) y escribe de inmediato el resto (agregar/eliminar/
   guardar/reabrir). Flush en `beforeunload`/`pagehide` para no perder el último
   cambio diferido. Mismo `partialize` (no cambia QUÉ se persiste, solo CUÁNDO).
   Medición (store+persist, carrito 25 ítems, sin render React): subir cantidad ±0,5
   pasó de **0,22 ms → 0,02 ms media (~11×)**; agregar ítem se mantiene en ~0,5 ms
   (esperado: sigue siendo escritura inmediata).
2. **Caché de accesorios + recorte del blob de módulos** (`lib/firestore/modulos.ts`):
   los 447 herrajes ahora se cachean en localStorage (`delben_accesorios_v1`, TTL 24h),
   ya no se re-descargan en cada sesión/pestaña. El blob de módulos (`delben_modulos_v2`)
   ya NO guarda `imagen_url` ni `search_keywords` en disco: `search_keywords` es
   redundante con el nombre (la búsqueda matchea contra `normalizar(nombre)`) y
   `imagen_url` son URLs largas de Storage que arriesgan la cuota. La caché en memoria
   conserva el objeto completo; al rehidratar desde disco, `imagen_url`→null (miniatura
   con fallback de iniciales) y `search_keywords`→[] (búsqueda intacta).
3. **`getLogoDelben` fuera del waterfall + `?pid=` al guardar**
   (`cotizaciones/[id]/page.tsx`, `cotizaciones/borrador/page.tsx`): el logo de Delben
   ya no espera a que resuelva la cotización (no depende de ella). El `push` tras
   guardar ahora incluye `?pid=` para leer el doc directo y no caer al fallback que
   escanea todo el tenant. (La fila legacy sin `proyecto_id` SÍ debe usar el fallback;
   se deja como está, es correcto por diseño.)
4. **`React.memo` + `useCallback` en filas del carrito** (`cotizaciones/borrador/page.tsx`):
   `CarritoItemRow`/`HerrajeItemRow`/`EspecialItemRow` memoizadas; los handlers pasan
   referencias estables (acciones del store + `toggleExpandido` con `useCallback`) y la
   firma cambió a basada en `id`. Cambiar la cantidad de un ítem ya no re-renderiza las
   demás filas. Sin cambios de lógica.

Pendiente (no se hizo, queda para revisión): #5 recálculo N+1, #6 búsqueda
server-side por categoría, #7 TanStack Query. Herramienta de medición reproducible
en `apps/portal/bench/` (no se incluye en el build; bundle vía esbuild).
Archivos: `store/carrito.ts`, `lib/firestore/modulos.ts`,
`cotizaciones/[id]/page.tsx`, `cotizaciones/borrador/page.tsx`, `apps/portal/bench/*`.

### 2026-06-04 — Número consecutivo de cotización (anti-duplicados blindado)
Identificador para contratos: `SIGLA_DIST-SIGLA_SEDE-AÑO-####` (ej. PIE-BOG-2026-0001).
- **Consecutivo por distribuidor + sede + año**, reinicia el 1 de enero (contador por año).
- **Anti-duplicados:** contador en `distribuidores/{id}/sedes/{sedeId}/contadores/{anio}` (`ContadorDoc`),
  incrementado en `runTransaction` junto con la escritura del doc de cotización (todo o nada). Firestore
  reintenta ante concurrencia → sin duplicados; transacción atómica → sin huecos. Regla con **constraint +1**
  (`create` exige `ultimo==1`, `update` exige `ultimo==prev+1`) que blinda contra reinicios/saltos por SDK.
- **Asignación al PRIMER `guardarCotizacion`** (no al borrador en memoria, no en re-guardados:
  `actualizarCotizacion` no toca el número).
- **Siglas explícitas** (`DistribuidorDoc.sigla`, `SedeDoc.sigla`), las define el super_admin, editables al
  crear y editar (UI en `admin/distribuidores/nuevo` y `[id]`). **Si falta alguna, la transacción aborta**
  (`SiglaFaltanteError`) sin consumir número y muestra mensaje al comercial. Las siglas se guardan en MAYÚSCULA.
- **Snapshot:** `CotizacionDoc.numero_consecutivo/numero_seq/numero_anio` (opcionales). **Cotizaciones
  existentes NO se renumeran** (se quedan sin número; solo las nuevas lo llevan). Se muestra en detalle y lista.
- **Seguridad:** la `sigla` del distribuidor y de la sede quedan **bloqueadas para el distribuidor_admin**
  (solo super_admin las edita) — en el distribuidor por field-lock (`distribuidor_admin` sí escribe el doc para
  su logo, así que no se pudo restringir todo a super_admin); en la sede, sumando `sigla` a la lista de campos
  fijados. El contador no tiene datos sensibles (regla #2 intacta).
- **DEPLOY (NO hoy):** `firebase deploy --only firestore:rules` **debe ir primero o junto con el app** (la
  transacción escribe el contador; sin la regla desplegada el guardado fallaría). Luego configurar las siglas
  de los distribuidores/sedes activos (por la UI nueva, o manualmente en Firebase Console antes del app deploy
  para que no haya ventana sin número). Hasta que estén configuradas, guardar muestra el `SiglaFaltanteError`.
- Archivos: `tipos-firestore.ts`, `lib/firestore/cotizaciones.ts`, `firestore.rules`,
  `admin/distribuidores/{nuevo,[id]}/page.tsx`, `cotizaciones/borrador/page.tsx`, `cotizaciones/[id]/page.tsx`,
  `cotizaciones/page.tsx`. tsc limpio; el motor no se tocó.

### 2026-06-04 — PDFs: moneda real, IVA real, totales esenciales, marca correcta (display)
Cierra el pendiente que dejó la tanda de IVA. Solo display; no toca el motor.
1. **Moneda real:** los PDFs formatean con la moneda del snapshot (USD en exportación) vía nuevo
   `formatMoneda(n, moneda)`; se acabó el `formatCOP` hardcodeado. `InfoPDF` lleva `moneda`.
2. **IVA real:** el % se deriva de los renglones (`ivaSubtotal`/base gravada), no "19%" fijo. En
   exportación con IVA de sede muestra ese %; donde el IVA es 0 no se muestra la línea. Se agregó
   `ivaSubtotal` (IVA del renglón = `iva_monto × cantidad`) a `ItemPDF`/`HerrajePDF`/`EspecialPDF`
   (esto además corrige un bug latente: el IVA del total no multiplicaba por cantidad).
3. **Totales Opción A:** bloque reducido a lo esencial. Cotización (COP y exportación) = Subtotal/IVA/Total.
   Orden de compra = **Subtotal/Total SIN IVA en todos los casos** (Colombia y exportación por igual; es el
   costo de fábrica Delben al distribuidor, nunca lleva IVA — confirmado con el dueño). Se quitaron las líneas
   redundantes (muebles especiales, herrajes de módulos vs sueltos, transporte/instalación).
4. **Pie:** se quitó "Cotización generada por Plataforma Delben · Precios en COP con IVA" SOLO de la
   cotización al cliente (queda la paginación). La orden de compra (interna) conserva su pie y marca Delben.
5. **Marca:** la cotización al cliente muestra logo/nombre del **distribuidor** (nunca "DELBEN" ni el
   tagline). `InfoPDF.distribuidorNombre` se usa como fallback cuando no hay logo.
- Archivos: `lib/datos-demo.ts` (`formatMoneda`), `lib/pdf-helpers.ts` (InfoPDF + `ivaSubtotal` + converters),
  `components/cotizador/{cotizacion-pdf,orden-compra-pdf}.tsx`, `cotizaciones/borrador/page.tsx`,
  `cotizaciones/[id]/page.tsx`. tsc limpio.

### 2026-06-04 — Regla de negocio: IVA por sede (cualquier país), reemplaza "exportación sin IVA"
- **Cambio confirmado con el dueño:** el IVA se aplica según el `iva_pct` que el distribuidor
  configura por sede, en CUALQUIER país (Colombia y exportación por igual; `iva_pct = 0` → sin IVA).
  Ya NO existe "solo Colombia lleva IVA". Reemplaza `DISENO_SISTEMA.md §2`.
- **Motor (`packages/core/motor-calculo.ts`):** una línea — `ivaAplicado = esColombia && u.iva > 0`
  → `ivaAplicado = u.iva > 0`. **La moneda/conversión a USD NO se tocó** (sigue dependiendo del país).
  La rama Colombia es idéntica (el caso **1.562.495 no se movió**). Único comportamiento que cambia:
  exportación con `iva_pct > 0` ahora SÍ cobra IVA.
- **Test (`packages/core`):** el Caso 3 (antes "exportación USA sin IVA → 328,26 USD") se reemplazó por
  exportación **Venezuela / IVA sede 16% / USD** → `precio_sin_iva` 328,26 (cadena pre-IVA idéntica),
  `iva_monto` 52,52, `precio_final` **380,78 USD**. `npm test` en `packages/core`: **6/6 verde**
  (1.562.495 y los otros 3 caminos Colombia intactos; `filtrarPorRol` intacto).
- **Docs:** actualizados `DISENO_SISTEMA.md` (§1 sedes y §2 motor), `CLAUDE.md`, este doc (tabla de
  validación) y `CASOS_PRUEBA_MOTOR.md`. La copia histórica `docs/_referencia_codigo/motor_calculo.ts`
  se dejó con nota "(regla superada 2026-06-04)".
- **Cotizaciones guardadas:** NO se alteran — el `resultado` se guarda como números congelados; el cambio
  solo afecta cotizaciones **nuevas** o **recalculadas** ("Actualizar precios"). Las de exportación viejas
  siguen sin IVA tal como se guardaron. (Nota: `reconstruirResultadoEspecial` en las vistas detalle conserva
  la regla vieja para reconstruir desgloses de especiales históricos — correcto por fidelidad; deuda de
  lógica duplicada.)
- **UI:** etiqueta engañosa "Total con IVA" → **"Total final"** en borrador y detalles de cotización
  (`cotizaciones/borrador`, `cotizaciones/[id]`, `admin/cotizaciones/[distribuidorId]/[id]`).
- **Operativo:** el motor solo cobra IVA en exportación si la sede tiene `iva_pct > 0` configurado; el default
  al crear sede sigue sembrando 0 en export (por decisión: el distribuidor configura el real). Verificar las
  sedes de exportación reales (ej. Venezuela) tras el cambio.
- **PENDIENTE (siguiente tanda):** arreglar el PDF (`cotizacion-pdf.tsx`) — moneda USD + IVA reales del
  snapshot ("IVA 19%" y `formatCOP` hoy hardcodeados). NO se tocó en esta tanda.
- Archivos: `packages/core/src/motor-calculo.ts`, `packages/core/src/__tests__/motor-calculo.test.ts`,
  `docs/{DISENO_SISTEMA,ESTADO_ACTUAL,_referencia_codigo/CASOS_PRUEBA_MOTOR,_referencia_codigo/motor_calculo}`,
  `CLAUDE.md`, `cotizaciones/borrador/page.tsx`, `cotizaciones/[id]/page.tsx`, `admin/cotizaciones/[distribuidorId]/[id]/page.tsx`.

### 2026-06-04 — Seguridad: `delben_facturacion` veía el dashboard del super_admin con precios de venta
- **Síntoma:** facturación caía en `/admin` (dashboard super_admin) y veía "Volumen cotizado" (~$332M),
  "Cotizaciones recientes" con montos por proyecto/cliente y accesos rápidos de admin. Esos montos son
  **precio de venta al cliente final** (`totales.total` = Σ `precio_final_unitario`), dato prohibido para
  ese rol (regla de oro #2).
- **Causa raíz (3 capas):** (A) la home redirige a facturación a `/admin`; (B) `admin/page.tsx` y
  `admin/cotizaciones/page.tsx` no gateaban por rol; (C) **la regla del `collectionGroup('cotizaciones')`
  incluía `esFacturacionDelben()`** → el backend entregaba el doc completo (con precio de venta). Falla de
  backend, no solo UI. El cambio de hoy (dar lectura de `distribuidores` a facturación) **destapó** la fuga:
  antes, el `Promise.all` del dashboard rechazaba al pedir `distribuidores` (denegado) y enmascaraba los
  datos; al permitir `distribuidores`, resolvió y los montos se renderizaron.
- **Arreglo B (backend, fuga real):** se quitó `esFacturacionDelben()` de los 3 reads de cotizaciones en
  `firestore.rules` (collectionGroup + cotizaciones legacy + cotizaciones anidadas en proyectos). Facturación
  ya no lee cotizaciones de distribuidores ni por SDK ni por URL. **Se conservó** su acceso a valoraciones,
  distribuidores (selector de sede) y sedes/historial.
- **Arreglo A (UI/routing):** `admin/page.tsx` y `admin/cotizaciones/page.tsx` ramifican por rol; para
  facturación **no se llama** a `getCotizacionesTodas()` (evita el permission-denied que volvería a romper el
  `Promise.all` en silencio) y se redirige a `/admin/valoraciones`.
- **Pendiente operativo:** desplegar reglas — `firebase deploy --only firestore:rules` (lo corre el dueño).
- **Estructural:** esto cierra la mitad **facturación↔precio de venta** del problema de fondo. La otra mitad
  (**deuda §1: `distribuidor_comercial`↔`costo_delben`**) sigue **abierta** y comparte la misma causa raíz:
  snapshot de cotización monolítico (costo + venta en un doc legible entero) con separación solo visual. La
  solución sistémica de ambas es la **Opción C** (separar campos costo/venta en otro doc/colección, o servir
  cálculos por endpoint que filtre por rol como `/api/catalogo`).
- Archivos: `firestore.rules`, `app/(portal)/admin/page.tsx`, `app/(portal)/admin/cotizaciones/page.tsx`.

### 2026-06-04 — Valoraciones: campo "N.º de OP" (Orden de Producción)
- Nuevo campo `numero_op` en las valoraciones internas de `delben_facturacion`: texto libre
  alfanumérico, uno por valoración, lo escribe facturación. **Obligatorio al crear** (validación
  Zod en `/admin/valoraciones/nueva`), **opcional en el tipo** (`ValoracionDoc.numero_op?: string`)
  para no romper la lectura de valoraciones guardadas antes de esto (las viejas no lo tienen y abren
  sin problema). Dato interno de referencia: **NO va en ningún PDF**.
- Flujo: viaja por `CotizacionInfo.numeroOp` (nueva → store → `guardarValoracion`); editable en el
  borrador (la superficie de "Editar" que ya existía) vía nueva acción `actualizarNumeroOp`, y
  persistido también por `actualizarValoracion`. Editar una valoración vieja permite backfillear su OP.
  `reabrirValoracion` restaura el OP al editar.
- Se muestra en la lista (`· OP …` bajo el cliente) y en el detalle (línea "OP:" en el encabezado).
- No se tocó el motor ni la seguridad por rol (facturación escribiendo en su propio flujo; no expone nada).
- Archivos: `lib/firebase/tipos-firestore.ts`, `store/carrito.ts`, `lib/firestore/valoraciones.ts`,
  `app/(portal)/admin/valoraciones/{nueva,borrador,[id]}/page.tsx`, `app/(portal)/admin/valoraciones/page.tsx`.

### 2026-06-04 — Fix: `delben_facturacion` no veía selectores de distribuidor/sede al valorar
- **Síntoma:** en `/admin/valoraciones/nueva`, facturación no veía el selector de distribuidor ni el de sede.
- **Causa raíz:** al introducir sedes (2026-06-02) se agregó `esFacturacionDelben()` a la lectura de
  `sedes` en `firestore.rules`, pero **no** a la del padre `distribuidores`. `getDistribuidores()` (list query)
  quedaba en permission-denied para facturación → lista vacía → sin distribuidor seleccionable, el selector de
  sede (gated por el distribuidor) nunca aparecía. Agravado por falta de `.catch` en la página (fallo mudo).
- **Arreglo:** (1) `firestore.rules` — `distribuidores` read ahora incluye `esFacturacionDelben()` (el doc es
  identitario, sin precio de venta; completa lo que ya tenía `sedes`). (2) `valoraciones/nueva/page.tsx` —
  `.catch` + banner de error y estado vacío (el fallo deja de ser mudo).
- **Pendiente operativo:** desplegar reglas — `firebase deploy --only firestore:rules` (lo corre el dueño).
- **Regla de oro:** el borrador de valoración solo muestra costo Delben (no precio de venta); el arreglo no
  expone precios. Matiz registrado en deuda técnica §1: `precio_final_unitario` se persiste en `resultado`
  de las valoraciones (no se muestra, pero queda almacenado) — no se arregla ahora.
- Archivos: `firestore.rules`, `app/(portal)/admin/valoraciones/nueva/page.tsx`.

### 2026-06-03 — Consolidación de la documentación
- Se unificaron los documentos del repo para reducir desorden: el changelog del
  README se movió a esta bitácora; `RESUMEN_PROYECTO_COMPLETO.md` se absorbió en
  "Deuda técnica y riesgos" y el estado por rebanadas; `REBANADA_SEDES.md` se volcó
  en `DISENO_SISTEMA.md` (§1 Sedes, §3 datos) + la sección de sedes de este doc;
  `LEEME.md` y `_LEEME.md` se retiraron (su contenido vivo ya está en `CLAUDE.md`).
- Toda la documentación de lectura quedó en `docs/`; en la raíz solo permanecen los dos
  archivos con función técnica: `CLAUDE.md` (lo lee Claude Code automáticamente desde la
  raíz) y `README.md` (portada del repo). `PRODUCT.md` y `DESIGN.md` se movieron a `docs/`,
  y los archivos de referencia sueltos a `docs/_referencia_codigo/`.
- Documentos resultantes: raíz → `CLAUDE.md`, `README.md`; `docs/` → `DISENO_SISTEMA.md`,
  `ESTADO_ACTUAL.md`, `PRODUCT.md`, `DESIGN.md`, `_referencia_codigo/` (casos del motor +
  motor de referencia + spec del importador + prototipo).

### 2026-06-02 — Sedes por distribuidor + catálogo de consulta de precios
- **Sedes**: las condiciones de cálculo pasan del distribuidor a `sedes/{id}` (país,
  accesos, capa Delben, universo). El super_admin crea/edita sedes (capa Delben) y el
  distribuidor_admin configura el universo por sede. El cotizador, la persistencia y
  las vistas Delben arrastran `sede_id`. Aislamiento por sede en `firestore.rules`. El
  motor no se tocó (1.562.495 intacto). Ver sección "Sedes por distribuidor" arriba.
- **Catálogo `/catalogo`**: módulos y herrajes con precio lista − descuento por
  modalidad; el costo se calcula y filtra server-side (`/api/catalogo` con Admin SDK):
  el comercial no lo recibe. Ver "Catálogo de consulta de precios" arriba y
  `tests/catalogo/SEGURIDAD.md`.
- Archivos: ver las dos secciones "qué se construyó" correspondientes.

### 2026-06-01 — Desglose de cotización guardada: especiales fundidos + fix de utilidad
- Síntomas en el detalle guardado (no en el carrito): "Utilidad (margin)" mostraba ~$5; el "Precio base" no incluía los muebles especiales; aparecía una línea suelta "Muebles especiales" confusa. El total final SÍ era correcto.
- **Bug de utilidad:** en `calcularDesglose` la utilidad se calculaba como `distribuidor_subtotal2 − universo_aditivo`, pero `universo_aditivo` era idéntico a `distribuidor_subtotal2` → ≈0. Corregido a `precio_sin_iva − distribuidor_subtotal2`. (Era solo de visualización; el total nunca dependió de esto.)
- **Especiales fundidos en el desglose (incl. costo Delben y utilidad):** cada mueble especial nuevo guarda su `resultado` del motor; `calcularResumenTotal` lo descompone por capas igual que un módulo. Para los especiales **viejos** (sin `resultado`), `reconstruirResultadoEspecial()` reconstruye la descomposición desde su costo Delben unitario + parámetros del distribuidor. Desaparece la línea suelta "Muebles especiales" del desglose por capas.
- Archivos: `lib/firebase/tipos-firestore.ts`, `store/carrito.ts`, `components/cotizador/buscador-modulos.tsx`, `lib/firestore/cotizaciones.ts`, `valoraciones.ts`, `cotizaciones/[id]/page.tsx`, `admin/cotizaciones/[distribuidorId]/[id]/page.tsx`.

### 2026-06-01 — Muebles especiales pasan por el motor completo (costo consistente con el catálogo)
- Síntoma: el costo total a Delben salía **más bajo** en cotizaciones con muebles especiales. Causa: los especiales solo restaban el descuento, pero NO sumaban los servicios Delben que sí incluye un módulo normal en su `costo_delben`.
- Fix: el panel de especiales ahora llama a `calcularItem()` (el motor validado) con el precio de lista como `precio_base_cop` y `tipo_item: 'mueble'`. El costo del especial queda **idéntico** al de un módulo del catálogo con el mismo precio de lista.
- Decisión confirmada con el dueño: "motor completo" (reemplaza la decisión previa de "lista − descuento").
- **Limitación conocida:** "Actualizar precios" no recalcula los especiales (guardan su costo/precio unitario, no el precio de lista base).
- Archivo: `components/cotizador/buscador-modulos.tsx`.

### 2026-05-30 — Fix crítico: un único total consistente en carrito, lista, PDF cotización y orden de compra
- **Causa raíz:** el total se calculaba con tres fórmulas distintas. **Solución:** función única `calcularTotalesCotizacion()` en `store/carrito.ts` (fuente de verdad del total). La usan la pantalla del carrito, `guardar()` y `guardarValoracion()`. Los PDFs derivan el mismo total.
- **Muebles especiales** ahora se persisten en Firestore (`itemsEspeciales`), sobreviven al refresco, se restauran al reabrir/copiar/recalcular, y aparecen en el PDF de cotización (precio cliente) y en la orden de compra (costo Delben). La orden de compra NO incluye transporte/instalación fijos.
- **Pendiente operativo:** cotizaciones guardadas ANTES de este fix conservan su total viejo; para corregirlas, abrir → "Actualizar precios" → guardar.
- Archivos: `lib/firebase/tipos-firestore.ts`, `store/carrito.ts`, `lib/firestore/{cotizaciones,valoraciones,recalcular}.ts`, `lib/pdf-helpers.ts`, `components/cotizador/{cotizacion-pdf,orden-compra-pdf,cotizacion-pdf-button,orden-compra-pdf-button}.tsx`, `cotizaciones/{borrador,[id]}/page.tsx`, `admin/cotizaciones/[distribuidorId]/[id]/page.tsx`.

### 2026-05-30 — Fix: el costo de muebles especiales ahora aplica el descuento del distribuidor
- Antes, "Precio Delben al distribuidor" se usaba tal cual como costo (sin descuento), inflando el costo y el precio al cliente. Ahora el campo es **"Precio de lista Delben (antes de descuento)"** y el costo real = lista × (1 − `descuento_muebles_pct`). (Esta decisión fue reemplazada el 2026-06-01 por "motor completo".)
- Archivo: `components/cotizador/buscador-modulos.tsx`.

### 2026-05-29 — Polish pass: shimmer consistente, stagger cap, page title, DESIGN.md sincronizado
- `SkeletonProyectoCard` migrado de `animate-pulse` a `.skeleton`. Stagger cap a 5 ítems (`Math.min(i, 4) * 40ms`). `h1 "Proyectos"` corregido a `text-2xl`. DESIGN.md sincronizado con los valores de animación actuales.
- Archivos: `cotizaciones/page.tsx`, `cotizaciones/borrador/page.tsx`, `valoraciones/borrador/page.tsx`, `DESIGN.md`.

### 2026-05-29 — Design engineering: correcciones de animación (Emil Kowalski)
- `aparecer` 500ms → 200ms, `translateY(10px)` → `5px`. `aparecer-lento` eliminado. `shimmer` `ease-in-out` → `linear`. `FichaModulo` panel lateral: `animate-deslizarse-derecha`. `transition-all` → `transition-colors` en inputs/selects. `prefers-reduced-motion` añadido. Nuevo keyframe `deslizarse-derecha`.
- Archivos: `tailwind.config.ts`, `globals.css`, `ficha-modulo.tsx`, `buscador-modulos.tsx`.

### 2026-05-29 — Design polish: 7 mejoras de UI (caoba, divide-y, shimmer, stagger, nav, empty states)
- Color caoba en CTAs primarios; cards → `divide-y` en borrador; shimmer en skeletons; stagger en listas; nav con indicador de ruta activa (`border-b-2 border-caoba-500`); avatar de usuario; empty states con jerarquía.
- Archivos: `tailwind.config.ts`, `globals.css`, `nav-portal.tsx`, `cotizaciones/page.tsx`, `cotizaciones/borrador/page.tsx`, `valoraciones/borrador/page.tsx`, `buscador-modulos.tsx`, `ficha-modulo.tsx`.

### 2026-05-29 — UX: mejoras al cotizador (observaciones, staging herrajes, costos unitarios)
- Observaciones visibles en la fila del carrito; staging de herrajes en el buscador antes de confirmar; costo unitario por ítem para roles con acceso a costo cuando la cantidad > 1.
- Archivos: `buscador-modulos.tsx`, `cotizaciones/borrador/page.tsx`, `valoraciones/borrador/page.tsx`.

### 2026-05-28/29 — Fixes de fecha al rehidratar el store
- Al rehidratar desde localStorage, `fecha`/`cotizacionInfo.fecha` quedaba como string ISO; el motor llamaba `.getTime()` y fallaba. Solución: `new Date(...)` en los puntos donde se construye `motorBase` / payload de herrajes y al duplicar.
- Archivos: `store/carrito.ts`, `lib/firestore/cotizaciones.ts`.

### 2026-05-28 — Cantidades decimales en todos los campos
- Soporte decimal en todos los controles de cantidad (herrajes, especiales, store): botones ±0.5, input editable, mínimo 0.1.
- Archivos: `carrito.ts`, `buscador-modulos.tsx`, `cotizaciones/borrador/page.tsx`.

### 2026-05-27 — Arreglos solicitados por Cindy
- Correcciones varias en UI/UX del cotizador según revisión interna.

### 2026-05 — Hitos previos
- **Resumen de proyecto PDF**: PDF consolidado con versiones seleccionadas desde `ProyectoCard`.
- **Design polish pass**: `PRODUCT.md` y `DESIGN.md` creados; skeletons, stagger, nav activo, home distribuidor.
- **Valoraciones internas** (`delben_facturacion`): colección `valoraciones/`, 4 páginas `/admin/valoraciones/*`, Security Rules.
- **Mejoras transversales (R6)**: Security Rules con aislamiento por tenant, tasa USD con historial, historial de condiciones, categoría en cotización, costos fijos transporte/instalación, desglose por ítem.

### 2026-04 — Multi-tenant y cotizador conectado (Rebanada 3) / Catálogo en Firestore (Rebanada 2)
- R3: panel de distribuidores y gestión de usuarios por tenant; cotizador conectado a Firestore (módulos, precios, herrajes); deduplicación por variantes; herrajes asociados en la ficha.
- R2: panel admin de importación desde Excel (idempotente); ~2.076 módulos + ~447 herrajes; imágenes en Storage con matching automático.
