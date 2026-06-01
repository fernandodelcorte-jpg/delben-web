# Plataforma Delben — Resumen completo del proyecto

> Documento generado para análisis externo. Es un retrato técnico y de negocio
> del estado actual del proyecto, con el mayor detalle posible y basado en el
> código real (no en suposiciones). Fecha de corte: 2026-06-01.

---

## 0. Resumen ejecutivo

**Plataforma Delben** es un SaaS B2B de cotización para **Delben**, una fábrica
de carpintería colombiana (45 años). Delben administra; **~10-20 distribuidores**
(centros de diseño en Colombia, Venezuela y USA) son los usuarios reales: cotizan
a sus clientes finales. El cliente final no entra al sistema.

Cada cotización genera **dos documentos**:
1. **Orden de compra a Delben** — lo que el distribuidor compra a fábrica (su *costo*).
2. **Cotización al cliente final** — documento comercial con la marca del distribuidor (el *precio de venta*).

El corazón del sistema es un **motor de cálculo de dos capas** (Capa Delben →
costo del distribuidor; Capa Distribuidor → precio al cliente final), validado
numéricamente (caso de referencia: 1.000.000 → 1.562.495).

Estado: las 7 rebanadas planificadas (0–6 + proyectos) están cerradas. El sistema
está en uso real haciendo cotizaciones. En la sesión del 2026-06-01 se corrigió a
fondo el cálculo de totales y los muebles especiales (total único y consistente,
persistencia de especiales, cálculo por el motor completo, y desglose por capas
que los incluye). Ver §9 y §12.

---

## 1. Stack tecnológico e infraestructura

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | ^15.1.0 |
| Lenguaje | TypeScript estricto (sin `any`) | ^5.5.4 |
| UI runtime | React | ^19.0.0 |
| Estilos | Tailwind + shadcn/ui | — |
| Iconos | @phosphor-icons/react | ^2.1.7 |
| Tipografía | Geist | ^1.3.1 |
| Backend / datos | Firebase (Firestore + Auth + Storage) | firebase ^10.13.0 |
| Estado servidor | (TanStack Query — previsto) · lectura directa Firestore en la práctica | — |
| Estado cliente | Zustand (carrito) | ^5.0.0 |
| Formularios | React Hook Form + Zod | ^7.53 / ^3.23 |
| PDF | @react-pdf/renderer | ^4.3.0 |
| Excel (import) | xlsx | ^0.18.5 |
| Tests | Vitest | ^2.1.0 |
| Monorepo | Turborepo + npm workspaces | turbo ^2.1.3 |
| Hosting | Netlify (`@netlify/plugin-nextjs`) | — |
| Node | >= 20 | — |

**Idioma del dominio:** todo en español (comentarios, commits, nombres de dominio:
`modulo`, `cotizacion`, `distribuidor`, `herraje`, etc.). El código (keywords) en inglés.

**Convenciones:** Server Components por defecto; Client Components solo con
interactividad. Validación Zod en toda entrada. camelCase (variables/funciones),
PascalCase (componentes/tipos), kebab-case (archivos). Commits convencionales en
español (feat:, fix:, refactor:, docs:).

---

## 2. Estructura del monorepo

```
delben-web/
├── apps/
│   └── portal/        ← Next.js: portal distribuidores + admin Delben (ÚNICA app activa)
│       └── src/
│           ├── app/
│           │   ├── (auth)/login/
│           │   └── (portal)/
│           │       ├── page.tsx                 home distribuidor
│           │       ├── cotizaciones/            lista, nueva, borrador, [id]
│           │       ├── configuracion/           config del distribuidor (admin)
│           │       └── admin/                    panel Delben (super_admin/facturación)
│           │           ├── catalogo/ acabados/ categorias/ campanas/ config/
│           │           ├── distribuidores/ equipo/ importar/
│           │           ├── cotizaciones/        vista global + detalle por distribuidor
│           │           └── valoraciones/        valoraciones internas (delben_facturacion)
│           ├── api/logo-proxy/                   proxy server-side para logos (evita CORS en PDF)
│           ├── components/
│           │   ├── cotizador/   buscador-modulos, ficha-modulo, *-pdf, *-pdf-button
│           │   ├── admin/       importar-modulos, importar-herrajes, subir-imagenes
│           │   ├── providers/   auth-provider
│           │   └── nav-portal, logo-delben
│           ├── lib/
│           │   ├── firebase/    client, tipos-firestore (modelo de datos canónico)
│           │   ├── firestore/   catalogo, modulos, distribuidores, cotizaciones,
│           │   │                valoraciones, campanas, config, proyectos, recalcular
│           │   ├── importar/    parser-modulos, parser-herrajes, writer-firestore, slugify
│           │   └── pdf-helpers, datos-demo
│           └── store/           carrito.ts (Zustand, fuente de verdad del carrito)
├── packages/
│   ├── core/          motor-calculo.ts + tests Vitest (el motor validado)
│   ├── firebase/      roles.ts (definición de roles y helpers)
│   ├── ui/            stub (compartido shadcn — sin uso fuerte aún)
│   └── config/        tsconfig base + nextjs
├── apps/web/          ← web institucional: PLANIFICADA, no construida
├── firestore.rules    reglas de seguridad (desplegadas)
├── storage.rules
├── firestore.indexes.json
├── netlify.toml · turbo.json
└── docs/              ESTADO_ACTUAL.md, DISENO_SISTEMA.md (+ este resumen)
```

> Nota: `apps/web/` (web institucional pública) aparece en el diseño pero **no
> está construida**. La única app activa es `apps/portal/`.

---

## 3. Modelo de negocio (reglas cerradas y validadas)

### 3.1 Los dos modelos de negocio (modalidades)

El distribuidor elige **una modalidad por cotización** (no por módulo). Mismo
precio base de **módulos** (de la lista de Excel); distinta lógica de descuento.
Los **herrajes** sí tienen precio distinto por modalidad.

| | Tradicional (armado) | Desarmado (despiezado) |
|---|---|---|
| Producto | Ensamblado, listo para instalar | Despiezado, cantos aplicados, embalado |
| Herrajes | NO incluidos (el comercial los agrega) | NO incluidos |
| Descuento | Pactado por distribuidor, dividido: % muebles y % herrajes | Fijo por categoría (tabla) |
| Precio herrajes | Lista de herrajes tradicional | Lista de herrajes desarmado |

Entrega siempre en puerta de fábrica. Acumulación tradicional+desarmado: hoy NO
(switch parametrizable a futuro). El super_admin define a qué modalidades tiene
acceso cada distribuidor (`acceso_tradicional` / `acceso_desarmado`); si solo
tiene una, el selector no aparece.

### 3.2 Tabla de descuentos — Modelo Desarmado (por categoría)

| Categoría | Base | Adicional acabado magenta |
|---|---|---|
| Cocinas | 30% | +12% |
| Cocinas curvas | 10% | — (van armadas) |
| Zonas de ropas | 30% | +12% |
| Closets | 30% | +12% |
| Entretenimiento | 30% | +12% |
| Baños | 15% | +25% |
| Complementos cocina | 25% | +25% |
| Complementos closets | 25% | +25% |
| Herrajes/accesorios/perfilería | 10% | — |

Acabado magenta en Tradicional: +12% adicional (igual en ambos modelos).

### 3.3 Jerarquía de acabados (3 niveles)

```
TIPO DE FACHADA   (define el precio base; viene de la lista de Excel)
  └── SUBCATEGORÍA (pertenece a UN tipo de fachada; usa SU precio;
                    define el AJUSTE: descuento %, recargo %, o sin ajuste)
        └── ACABADO / COLOR (el color que se fabrica)
```

El motor lee el ajuste de la **subcategoría** seleccionada. Ej.: "Magenta" es
subcategoría dentro de "Laminado Acrílico/PVC/PET", usa su precio y aplica +12%.

> **Premium de estructura:** el sobreprecio Premium YA está en el precio base del
> Excel (verificado: 15mm Blanca $388.400 vs 15mm Premium $505.800). El motor NO
> calcula recargo premium aparte. Estructura "Blanca" → acabado fijo; "Premium" →
> el comercial escoge color de la lista Melamina.

### 3.4 Multimoneda e IVA

Se **derivan del país**, no se eligen al cotizar:
- **Distribuidor** (cliente de Delben): el super_admin configura su ubicación → IVA/exportación para la Capa Delben.
- **Cliente final** (cliente del distribuidor): el distribuidor_admin configura sus condiciones → IVA/exportación para la Capa Distribuidor.
- Colombia: COP con IVA (hoy 19%, configurable). Exportación: USD sin IVA, con tasa configurada por el super_admin (con histórico).

### 3.5 Campañas

El super_admin crea campañas: nombre, % descuento, fecha desde/hasta,
segmentación combinable (global / distribuidor(es) / categoría(s) /
subcategoría(s) de acabado). El motor la aplica si la fecha de cotización está
vigente y la segmentación coincide. Si varias aplican, gana la de mayor %.

---

## 4. Motor de cálculo (`packages/core/src/motor-calculo.ts`)

**Regla de oro #1 del proyecto: NO tocar la lógica del motor sin aprobación.**
Está validado numéricamente. Todo es **secuencial** (cada paso sobre el resultado
del anterior).

### 4.1 Las dos capas

```
PRECIO BASE (lista de Excel, en COP)
│
├─ CAPA DELBEN ──────────────────────────► COSTO AL DISTRIBUIDOR (= orden de compra)
│   0. Moneda: si cliente final es exportación → USD (÷ tasa_usd del super_admin)
│   1. Descuento principal:
│        tradicional → % distribuidor (muebles | herrajes según el ítem)
│        desarmado   → % categoría (desc_base_pct)
│   2. Ajuste de la SUBCATEGORÍA de acabado (descuento / nada / recargo)
│        (desarmado + es_premium → usa desc_premium_pct de la categoría)
│   3. Campaña activa (si fecha + segmentación aplican; la de mayor %)
│      costo_tras_descuentos = base × (1−desc1) × ajusteAcabado × (1−campaña)
│   4. Servicios Delben:
│        grupo1 = diseño + cotización + producción + logística   (SE SUMAN)
│        subtotal1 = costo_tras_descuentos × (1 + grupo1)
│        gestión comercial = MARGIN:
│           COSTO_DELBEN = subtotal1 ÷ (1 − gestión_comercial%)
│
└─ CAPA DISTRIBUIDOR ────────────────────► PRECIO AL CLIENTE FINAL
    5. grupo2 = transporte + instalación + imprevistos   (SE SUMAN)
       subtotal2 = COSTO_DELBEN × (1 + grupo2)
    6. utilidad = MARGIN:
       precio_sin_iva = subtotal2 ÷ (1 − utilidad%)
    7. IVA (ÚLTIMO paso):
       Colombia    → precio_final = precio_sin_iva × (1 + iva%)
       Exportación → precio_final = precio_sin_iva
```

**Dos "margin":** gestión comercial y utilidad se aplican como división por (1−%),
NO multiplicación. Garantiza que el % sea real sobre el precio de venta.

### 4.2 Caso validado (test obligatorio — da exacto)

| Paso | Operación | Resultado |
|---|---|---|
| Base | — | 1.000.000 |
| Descuento desarmado cocina | × (1 − 0.30) | 700.000 |
| Servicios grupo1 (14%) | × 1.14 | 798.000 |
| Gestión comercial 6% (margin) | ÷ 0.94 | **848.936 ← COSTO DELBEN** |
| Universo grupo2 (16%) | × 1.16 | 984.766 |
| Utilidad 25% (margin) | ÷ 0.75 | 1.313.021 |
| IVA 19% Colombia | × 1.19 | **1.562.495 ← precio cliente** |

Exportación (sin IVA) = 1.313.021. Tests Vitest: **6/6 verde**.

### 4.3 Firma e interfaz de salida

```ts
function calcularItem(input: ItemInput): ResultadoCalculo

interface ResultadoCalculo {
  moneda: 'COP' | 'USD'
  // --- Capa Delben (NO exponer a distribuidor_comercial) ---
  costo_tras_descuentos: number
  servicios_subtotal1: number
  costo_delben: number              // ← ORDEN DE COMPRA
  // --- Capa Distribuidor ---
  distribuidor_subtotal2: number
  precio_sin_iva: number
  iva_aplicado: boolean
  iva_monto: number
  precio_final_unitario: number     // ← COTIZACIÓN (con IVA)
  cantidad: number
  subtotal_linea: number            // ← precio_final_unitario × cantidad
}
```

Redondeo: 0 decimales en COP, 2 en USD. El motor expone también
`filtrarPorRol(resultado, rol)`: para `distribuidor_comercial` devuelve solo los
campos de la capa distribuidor (sin `costo_delben`, `costo_tras_descuentos`,
`servicios_subtotal1`). **Ver hallazgo de seguridad en §10.**

---

## 5. Modelo de datos (Firestore) — `lib/firebase/tipos-firestore.ts`

### 5.1 Catálogo (escritura solo super_admin)

- **`tipos_estructura`** — nombre, espesor_mm (15/18/null), es_premium, colores_premium[], orden, activo.
- **`tipos_fachada`** — nombre, es_aluminio_vidrio, colores_vidrio[], colores_metal[], orden, activo.
- **`subcategorias`** — tipo_fachada_id, nombre, **tipo_ajuste** ('descuento'|'ninguno'|'recargo'), ajuste_pct, es_premium, activo.
- **`acabados`** — subcategoria_id, tipo_fachada_id, nombre, activo.
- **`categorias_macro`** — nombre, orden, mostrar_todas (agrupador visual).
- **`categorias`** — nombre, **desc_desarmado_base_pct**, **desc_desarmado_premium_pct**, categorias_macro_ids[], mostrar_en_todas, orden.
- **`modulos`** — codigo_excel, categoria_id, tipologia, nombre, altura, profundidad, imagen_url, search_keywords[], requiere_fachada?, requiere_estructura?, precio_min?.
  - Subcolección **`modulos/{id}/precios`** — tipo_estructura_id, tipo_fachada_id, **precio_cop** (la matriz de precios por combinación).
- **`accesorios`** (herrajes) — codigo, nombre, nombre_normalizado, **precio_tradicional_cop**, **precio_desarmado_cop** (dos listas), disponibilidad por modalidad, imagen_url, activo.

Volumen aproximado en producción: **~2.076 módulos** y **~447 herrajes**
(importados desde Excel; imágenes en Storage).

### 5.2 Configuración global y por distribuidor

- **`config/*`** — config global (p. ej. logo Delben). Lectura: autenticados; escritura: super_admin.
- **`tasa_usd_historial`** — valor, vigente_desde, creado_por (histórico de tasa USD).
- **`campanas`** — nombre, descuento_pct, fecha_desde/hasta, segmentacion{tipo, distribuidores[], categorias[], lineas_acabado[]}, activa.
- **`distribuidores/{id}`** (DistribuidorDoc):
  - nombre, pais, ciudad, logo_url, acceso_tradicional/desarmado.
  - **descuento_muebles_pct**, **descuento_herrajes_pct** (capa Delben).
  - **servicios**: diseno_pct, cotizacion_pct, produccion_pct, logistica_pct, gestion_comercial_pct.
  - **universo**: iva_pct + sub-objetos `tradicional` / `desarmado`, cada uno con:
    transporte_tipo ('porcentual'|'fijo'), transporte_pct, instalacion_tipo, instalacion_pct,
    imprevistos_pct, utilidad_pct.
    - `getUniversoParaModalidad()` lee el universo por modalidad con fallback al esquema plano antiguo.
  - Subcolección **`historial_condiciones`** — snapshot de descuentos/servicios con vigencia (auditoría).

### 5.3 Proyectos y cotizaciones (snapshots completos)

- **`distribuidores/{id}/proyectos/{proyectoId}`** — clienteNombre, clienteDireccion/Ciudad, proyectoNombre, estado ('en_proceso'|'aceptado'|'perdido').
- **`distribuidores/{id}/proyectos/{proyectoId}/cotizaciones/{id}`** (CotizacionDoc) — y un path legacy `distribuidores/{id}/cotizaciones/{id}` para cotizaciones antiguas.
  - Campos: distribuidor_id, cliente/proyecto, categoría, modalidad, fecha, estado ('borrador'|'enviada'|'aceptada'), proyecto_id, espacio_nombre, version, version_nombre.
  - **`items`**: ItemCotizacionSnapshot[] (módulo + config + `resultado` del motor + herrajesAsociados[]).
  - **`itemsHerraje`**: ItemHerraCotizacionSnapshot[] (herrajes sueltos + `resultado`).
  - **`itemsEspeciales`**: ItemEspecialSnapshot[] (muebles especiales — **agregado recientemente**, ver §9).
  - **`totales`**: TotalesCotizacion (ver §9).
- **`valoraciones/{id}`** (ValoracionDoc) — valoraciones internas de Delben (delben_facturacion): mismos items/itemsHerraje/itemsEspeciales/totales + distribuidor_nombre + estado ('borrador'|'facturada').

> Las cotizaciones guardan **snapshots** del resultado del motor (no recalculan al
> leer). Existe `lib/firestore/recalcular.ts` que reconstruye el carrito desde el
> catálogo y re-ejecuta el motor con los parámetros vigentes (botón "Actualizar
> precios").

### 5.4 Usuarios

- **`usuarios/{uid}`** — nombre, email, **rol**, **distribuidor_id** (null para Delben), activo. Es la fuente de verdad de permisos que consultan las Security Rules.

---

## 6. Roles y seguridad

### 6.1 Roles REALES en el código (`packages/firebase/src/roles.ts`)

```
super_admin          (Delben) — configura todo; ve costos Delben y precios de venta.
delben_facturacion   (Delben) — valida órdenes; ve costos Delben; valoraciones internas.
distribuidor_admin   — configura el "universo" de su empresa; crea sus usuarios; ve costo y precio.
distribuidor_costos  — ve costo Delben (para órdenes de compra).
distribuidor_comercial — ve SOLO precio de venta; NUNCA costo Delben; cotiza al cliente final.
```

`ROLES_VEN_COSTO_DELBEN` = super_admin, delben_facturacion, distribuidor_admin,
distribuidor_costos. Helpers: `puedeVerCostoDelben(rol)`, `esRolDelben`, `esRolDistribuidor`.

> ⚠️ **Inconsistencia documentación ↔ código:** CLAUDE.md y el documento de
> diseño mencionan un rol **`delben_comercial`** (soporte a distribuidores), pero
> **no existe en el código** (solo hay 5 roles). Decidir si se implementa o se
> elimina de la documentación.

### 6.2 Multi-tenant y aislamiento

Aislamiento estricto entre distribuidores (un tenant nunca ve otro). Las Security
Rules hacen `get()` al doc `/usuarios/{uid}` para leer rol y distribuidor_id, y:
- Catálogo, config, tasa USD, campañas: lectura para autenticados; escritura solo super_admin.
- `distribuidores/{id}`: lectura super_admin + miembros del tenant; escritura super_admin + distribuidor_admin del tenant (editar universo).
- Cotizaciones y proyectos: lectura/escritura super_admin + miembros del tenant.
- Valoraciones: solo super_admin + delben_facturacion.
- Usuarios: super_admin total; distribuidor_admin crea/edita solo costos/comercial de su tenant; un usuario no puede auto-cambiarse el rol ni el tenant.

---

## 7. Mapa de rutas (App Router)

### Portal del distribuidor
- `/(auth)/login` — login (split asimétrico, acento caoba OKLCH).
- `/` — home distribuidor.
- `/cotizaciones` — lista de cotizaciones (muestra `totales.total`).
- `/cotizaciones/nueva` — inicia cotización (cliente, proyecto, modalidad, categoría).
- `/cotizaciones/borrador` — el **carrito** (pantalla viva del cotizador): módulos, herrajes, especiales, costos fijos, totales, PDFs, guardar.
- `/cotizaciones/[id]` — detalle de cotización guardada: desglose por rol, "Actualizar precios", PDFs.
- `/configuracion` — el distribuidor_admin configura su universo.

### Panel Delben (admin)
- `/admin` — dashboard.
- `/admin/catalogo`, `/admin/categorias`, `/admin/acabados` — gestión de catálogo y jerarquía de acabados.
- `/admin/campanas` — campañas.
- `/admin/config` — config global (logo, tasa USD, IVA).
- `/admin/distribuidores`, `/admin/distribuidores/nuevo`, `/admin/distribuidores/[id]` — alta y configuración de distribuidores (descuentos, servicios, universo).
- `/admin/equipo` — usuarios Delben.
- `/admin/importar` — importación masiva desde Excel (módulos, herrajes, imágenes).
- `/admin/cotizaciones` + `/admin/cotizaciones/[distribuidorId]/[id]` — vista global de cotizaciones de todos los distribuidores (inteligencia de negocio) con desglose de costo Delben.
- `/admin/valoraciones` (+ `/nueva`, `/borrador`, `/[id]`) — valoraciones internas (delben_facturacion).
- `/api/logo-proxy` — proxy server-side para servir logos de Storage en los PDFs (evita CORS).

---

## 8. Flujo de cotización end-to-end

1. **Iniciar** (`/cotizaciones/nueva`): cliente, proyecto, modalidad, categoría. Se crea `cotizacionInfo` en el store Zustand (`store/carrito.ts`, persistido en localStorage).
2. **Agregar ítems** (`buscador-modulos.tsx` + `ficha-modulo.tsx`):
   - Módulos del catálogo (elige estructura × fachada → precio base; acabado/subcategoría; herrajes asociados). Cada add ejecuta `calcularItem()` y guarda el `resultado`.
   - Herrajes sueltos.
   - **Muebles especiales** (panel manual): precio de lista Delben + medidas + herrajes; el costo se deriva aplicando el descuento de muebles del distribuidor (ver §9).
3. **Carrito** (`/cotizaciones/borrador`): muestra el **total canónico** y, para roles con permiso, el costo Delben. Genera los dos PDFs.
4. **Guardar** (`store/carrito.ts → guardar()`): serializa items + itemsHerraje + itemsEspeciales + totales y los escribe a Firestore (`lib/firestore/cotizaciones.ts`).
5. **Detalle guardado** (`/cotizaciones/[id]`): re-lee el snapshot, muestra desglose según rol, permite "Actualizar precios" (recalcular con parámetros vigentes) y regenerar PDFs.

**Documentos PDF** (`@react-pdf/renderer`):
- **Cotización al cliente** (`cotizacion-pdf.tsx`): precio de venta con IVA; incluye módulos, herrajes, **muebles especiales** y costos fijos (transporte/instalación).
- **Orden de compra** (`orden-compra-pdf.tsx`): costo Delben (sin IVA, sin margen distribuidor); NO incluye transporte/instalación fijos (son costo propio del distribuidor). Marcada "CONFIDENCIAL — uso interno".
- **Resumen de proyecto** (`resumen-proyecto-pdf.tsx`): PDF consolidado de varias versiones seleccionadas.

---

## 9. El total de la cotización (modelo canónico — tras el fix reciente)

**Una única función** `calcularTotalesCotizacion()` (en `store/carrito.ts`) es la
fuente de verdad. La usan la pantalla del carrito, `guardar()` y `guardarValoracion()`;
los PDFs derivan el mismo total.

```
total = totalModulos                (Σ subtotal_linea de módulos)
      + totalHerrajesAsociados      (Σ herrajes dentro de módulos)
      + totalHerrajes               (Σ herrajes sueltos)
      + totalEspeciales             (Σ precioClienteUnitario × cantidad)
      + transporteFijo              (costo fijo, capa distribuidor)
      + instalacionFija             (costo fijo, capa distribuidor)
```

**Muebles especiales** (pieza a medida; SÍ pasan por el motor):
- Campo de entrada = **precio de lista base** (como el `precio_cop` del catálogo).
- El especial pasa por `calcularItem()` con `tipo_item: 'mueble'`: descuento +
  ajuste de acabado (subcategoría) + campaña + servicios Delben → costo Delben, y
  la capa distribuidor → precio al cliente. Su costo queda **idéntico** al de un
  módulo del catálogo con el mismo precio de lista. (Decisión confirmada con el
  dueño: "motor completo", reemplaza una versión previa "lista − descuento" que
  dejaba el costo bajo por omitir los servicios.)
- La categoría (descuento en desarmado + segmentación de campañas) se resuelve del
  módulo de referencia, o de la categoría de la cotización.
- Se persisten en Firestore (`itemsEspeciales`), incluyendo el `resultado` del
  motor, y se muestran como ítems en el detalle y en ambos PDFs (cotización =
  precio cliente; orden de compra = costo Delben, sin los costos fijos).
- En el desglose de la cotización guardada se **funden por capas** igual que un
  módulo; los especiales viejos (sin `resultado`) se reconstruyen desde su costo
  Delben con `reconstruirResultadoEspecial()`.

---

## 10. Hallazgos / deuda técnica / riesgos (para el análisis)

### 10.1 ⚠️ Seguridad: el costo Delben es alcanzable por `distribuidor_comercial`
El principio rector dice que `distribuidor_comercial` **jamás** debe recibir el
costo Delben ("separación REAL en backend, no visual"). Sin embargo:
- Las cotizaciones guardadas almacenan `costo_delben` (y pasos internos) **dentro
  de cada `resultado`** en el snapshot de Firestore.
- Las Security Rules de cotizaciones permiten leer a **cualquier miembro del
  tenant** (`esDeDistribuidor`), lo que **incluye al `distribuidor_comercial`**.
- `filtrarPorRol()` del motor existe pero **solo se aplica en la UI** (la pantalla
  oculta el costo con `puedeVerCosto`); el dato sí sale del servidor.

**Conclusión:** un `distribuidor_comercial` con acceso directo a Firestore (o
inspeccionando la respuesta) podría leer el costo Delben de las cotizaciones de su
tenant. Esto contradice la regla de oro #2. **Mitigación posible:** no persistir
los campos de costo en el snapshot que ese rol puede leer, o separar el costo en un
documento/colección con reglas que excluyan a comercial, o servir cálculos por un
endpoint server-side que aplique `filtrarPorRol` antes de responder.

### 10.2 Inconsistencia de roles documentación ↔ código
`delben_comercial` aparece en CLAUDE.md y el diseño, pero no existe en el código
(solo 5 roles). Decidir e igualar.

### 10.3 Pérdida histórica de muebles especiales (ya mitigado hacia adelante)
Antes del fix reciente, los muebles especiales **nunca se persistían** (el código
de guardado no los leía). Las cotizaciones guardadas antes del fix no los tienen y
**no se pueden recuperar** (no hay respaldo). Desde el fix sí se guardan, se
restauran al reabrir/copiar/recalcular, sobreviven al refresco y se muestran como
ítems en el detalle. Las cotizaciones viejas deben rehacerse para incluirlos.

### 10.4 Totales históricos congelados
El total guardado es un snapshot: cotizaciones guardadas con el código anterior
conservan totales mal sumados (sin especiales o sin costos fijos consistentes).
Para corregir una: abrir → "Actualizar precios" → guardar.

### 10.5 Auth server-side aún parcial
El middleware de auth fue un STUB en la Rebanada 0; la verificación fuerte
server-side con Admin SDK estaba prevista para la fase multi-tenant. Conviene
confirmar el estado actual de la verificación de sesión en servidor.

### 10.6 Estado de servidor
El diseño menciona TanStack Query, pero en la práctica las páginas leen Firestore
directamente (client SDK). No es un bug, pero conviene tenerlo presente para
caché/revalidación.

### 10.7 Despliegue de reglas
Las reglas de Firestore/Storage viven en el repo; verificar que la versión
desplegada coincide con la del repo (`firebase deploy --only firestore:rules`).

---

## 11. Cómo correr y verificar

```bash
# Desde la raíz
npm run dev         # turbo dev (portal en local)
npm run build       # turbo build
npm run typecheck   # tsc --noEmit en todos los paquetes
npm run lint
npm test            # turbo test (incluye los tests del motor)

# Solo el motor (crítico)
cd packages/core && npx vitest run    # 6/6 verde, incluye el caso 1.562.495
```

**Checklist antes de dar una tarea por terminada (de CLAUDE.md):**
- `npm test` en `packages/core` pasa (incluido 1.562.495).
- TypeScript compila sin errores ni `any`.
- No se rompió ninguna rebanada anterior.
- Si tocó seguridad por rol, verificar que el comercial no recibe costo Delben.

---

## 12. Trabajo reciente (sesión 2026-06-01)

Corrección a partir de cotizaciones reales (detalle en `docs/ESTADO_ACTUAL.md`):

1. **Total único y consistente:** una sola función `calcularTotalesCotizacion()`
   (carrito = guardado = PDFs). Antes había tres fórmulas distintas.
2. **Persistencia de muebles especiales:** antes no se guardaban (se perdían);
   ahora se persisten con su `resultado` del motor, sobreviven al refresco, se
   restauran al reabrir/copiar/recalcular y se muestran como ítems en el detalle
   y en ambos PDFs.
3. **Especiales por el motor completo:** el costo del especial ahora incluye
   descuento + servicios Delben (vía `calcularItem`), quedando consistente con un
   módulo del catálogo (antes salía bajo).
4. **Desglose de la cotización guardada:** bug de utilidad corregido
   (`precio_sin_iva − distribuidor_subtotal2`); los especiales se funden por capas
   (incluyendo costo Delben y utilidad), reconstruyendo los viejos desde su costo.

Archivos clave tocados: `store/carrito.ts`, `lib/firebase/tipos-firestore.ts`,
`lib/firestore/{cotizaciones,valoraciones,recalcular}.ts`, `lib/pdf-helpers.ts`,
`components/cotizador/{buscador-modulos,cotizacion-pdf,orden-compra-pdf,
cotizacion-pdf-button,orden-compra-pdf-button}.tsx`,
`cotizaciones/{borrador,[id]}/page.tsx`,
`admin/cotizaciones/[distribuidorId]/[id]/page.tsx`.

> Limitaciones conocidas: "Actualizar precios" no recalcula los especiales (no se
> guarda su precio de lista base); la reconstrucción del desglose de especiales
> viejos usa parámetros actuales del distribuidor (el costo Delben y el total se
> mantienen exactos).

---

## 13. Estado por rebanadas (de docs/ESTADO_ACTUAL.md)

| Rebanada | Estado |
|---|---|
| 0 — Cimiento (motor + estructura) | ✅ Cerrada |
| 1 — Camino mínimo punta a punta | ✅ Cerrada |
| 2 — Ancho de catálogo (Firestore + Storage) | ✅ Cerrada |
| 3 — Multi-tenant + cotizador real | ✅ Cerrada |
| 4 — Persistencia + documentos + roles | ✅ Cerrada |
| 5 — Config avanzada + campañas | ✅ Cerrada |
| 6 — Seguridad + configuración global | ✅ Cerrada |
| 7 — Proyectos (versiones, resumen PDF) | ✅ Cerrada |
| Mejoras transversales + design polish | ✅ Entregadas |

**Pendientes mayores conocidos:** web institucional (`apps/web/`), verificación de
despliegue de Security Rules, y los hallazgos de §10 (especialmente la separación
real del costo Delben para el rol comercial).
```
