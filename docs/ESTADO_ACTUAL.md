# 16 · Estado Actual del Proyecto

> Este documento es el "reporte de avance de obra". Los docs 10-15 describen
> el diseño completo (la visión). ESTE dice qué existe HOY y qué falta.
> Actualízalo al cerrar cada rebanada. Es lo primero que Claude Code debe
> leer al empezar una sesión, para saber dónde está parado.

Última actualización: Design polish completo + resumen de proyecto PDF. 2026-05-22.

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
| 3 | exportación / USA / sin IVA / USD (tasa 4000) | 328,26 USD ✓ |
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

## Próximo — pendiente

- **Firestore Security Rules no desplegadas**: las reglas locales (`firestore.rules`) son
  correctas pero no están en producción. `.firebaserc` tiene placeholder `REEMPLAZA_CON_TU_PROJECT_ID`.
  El usuario debe poner el project ID real y correr `firebase deploy --only firestore:rules`.
  Mientras tanto, `super_admin` ve error de permisos en `/admin/valoraciones`.

- **Web institucional** (`apps/web/`): la ruta existe en el monorepo pero está vacía.
  Pendiente construirla (siguiente sesión).

- **Conectar a GitHub**: el repositorio local no tiene remote configurado.
  Pendiente crear repo en GitHub y hacer push (siguiente sesión).

- **Tipo MELAMINA PREMIUM en tipos_estructura**: el usuario la eliminará manualmente
  desde Firebase Console (no tiene datos de precios asociados).
