# Plataforma Delben

SaaS B2B de cotización para distribuidores de Delben, fábrica colombiana de carpintería de alta calidad (desde 1976). El distribuidor cotiza a su cliente final; el sistema genera automáticamente una cotización para el cliente y una orden de compra interna para Delben.

---

> **Para Claude Code — protocolo de sesión**
>
> 1. **Al iniciar una sesión nueva:** leer este README completo para entender el estado actual del proyecto antes de tocar cualquier código.
> 2. **Al terminar trabajo importante:** agregar una entrada en la sección **Actualizaciones** al final de este archivo con fecha, descripción del cambio y archivos modificados.
> 3. Este documento es la fuente de verdad de qué está construido y qué no. Mantenerlo al día es tan importante como el código mismo.

---

## Stack

- **Next.js 15** (App Router) + TypeScript estricto
- **Firebase**: Firestore + Auth + Storage
- **Tailwind CSS** + shadcn/ui
- **Netlify** (`@netlify/plugin-nextjs`)
- **Turborepo** (monorepo)
- **Zustand** (carrito/estado global) · TanStack Query (estado servidor)
- **React Hook Form** + Zod
- **@react-pdf/renderer** (generación de PDFs)
- **Vitest** (tests del motor de cálculo)

## Estructura del monorepo

```
delben-web/
├── apps/
│   ├── portal/          Portal distribuidores + admin Delben
│   └── web/             Web institucional (pendiente)
├── packages/
│   ├── core/            Motor de cálculo + tipos compartidos
│   ├── ui/              Componentes shadcn compartidos
│   ├── firebase/        Config y helpers Firebase
│   └── config/          tsconfig, eslint, tailwind base
```

## Roles

| Rol | Acceso |
|---|---|
| `super_admin` | Delben: todo el sistema, configuración global |
| `delben_facturacion` | Delben: valoraciones internas, vista cotizaciones |
| `delben_comercial` | Delben: vista cotizaciones |
| `distribuidor_admin` | Distribuidor: gestión del equipo y configuración |
| `distribuidor_costos` | Distribuidor: ve costos Delben |
| `distribuidor_comercial` | Distribuidor: **nunca ve costos Delben** |

## Funcionalidades implementadas

### Cotizador
- Búsqueda de módulos del catálogo real (~2.076 módulos) con filtro por macro-categoría
- Configuración de dimensiones, estructura, fachada, subcategoría, acabado y herrajes asociados
- Herrajes sueltos independientes de módulos
- Productos especiales con precio manual
- Cantidades decimales (para productos por m² o metro lineal)
- Caché localStorage del catálogo con TTL 24h

### Cotizaciones
- Flujo nueva cotización: proyecto/cliente → categoría → borrador
- Borrador activo con motor conectado (todos los cálculos en tiempo real)
- Guardar como snapshot inmutable en Firestore
- Lista de proyectos con espacios y versiones agrupadas
- Estado del proyecto editable (En proceso / Aceptado / Perdido)
- Duplicar y reabrir borradores

### PDFs generados
- **Cotización para el cliente final**: logo distribuidor, módulos + herrajes + cantidad, totales con IVA
- **Orden de compra Delben** (confidencial): costos de fábrica por ítem, solo roles con acceso
- **Resumen de proyecto PDF**: versiones seleccionables con descripción y total consolidado

### Motor de cálculo (`packages/core`)
Dos capas secuenciales:
1. **Capa Delben** → costo al distribuidor: descuento por modelo → ajuste subcategoría → campaña → servicios (diseño/cotización/producción/logística sumados; gestión comercial como margin)
2. **Capa Distribuidor** → precio cliente final: transporte/instalación/imprevistos sumados → utilidad (margin) → IVA al final

Motor validado en 5 caminos (caso base = $1.562.495 ✓).

### Administración (Delben)
- Importación de catálogo desde Excel (módulos y herrajes) — idempotente
- Subida de imágenes a Firebase Storage con matching automático
- Gestión de distribuidores y usuarios
- Panel subcategorías y acabados (Magenta +12%, etc.)
- Campañas de descuento (por distribuidor o globales, con filtro por categoría)
- Tasa USD configurable con historial
- Logo Delben configurable
- Valoraciones internas (precios de fábrica) con flujo borrador → guardada

### Configuración por distribuidor
- Condiciones Delben (descuentos + servicios) con historial de cambios
- Universo propio: transporte, instalación, imprevistos, utilidad, IVA
- Transporte e instalación con modo porcentual o fijo por proyecto
- Logo propio del distribuidor

### Seguridad
- Firestore Security Rules: aislamiento completo por tenant
- `distribuidor_comercial` nunca recibe costos Delben (ni en API ni en UI)
- Roles desde Firestore con fallback a custom JWT claims

## Comandos

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Tests del motor
npm test --filter=@delben/core

# Build
npm run build
```

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar con las credenciales de Firebase:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Pendientes

- Firestore Security Rules: desplegar con `firebase deploy --only firestore:rules` (requiere configurar `.firebaserc` con el project ID real)
- Web institucional (`apps/web/`) pendiente de construir
- Conectar repositorio a GitHub

---

## Actualizaciones

> Registro cronológico inverso de cambios relevantes. Agregar una entrada cada vez que se implemente o corrija algo importante.

### 2026-05-29 — Polish pass: shimmer consistente, stagger cap, page title, DESIGN.md sincronizado
- `SkeletonProyectoCard` migrado de `animate-pulse` a `.skeleton` en cada placeholder — igual que el resto del sistema.
- Stagger cap a 5 ítems (`Math.min(i, 4) * 40ms`) en cotizaciones y valoraciones borrador. Carrito con 10+ ítems ya no espera 400ms.
- `h1 "Proyectos"` corregido a `text-2xl` (design system compliance).
- DESIGN.md sincronizado: animation values actuales, `.skeleton` pattern, caoba como botón primario, `transition-colors` en inputs, `deslizarse-derecha` documentado.
- Archivos: `cotizaciones/page.tsx`, `cotizaciones/borrador/page.tsx`, `valoraciones/borrador/page.tsx`, `DESIGN.md`.

### 2026-05-29 — Design engineering: correcciones de animación (Emil Kowalski)
- `aparecer` 500ms → 200ms, `translateY(10px)` → `translateY(5px)`: bajo 300ms, offset más sutil.
- `aparecer-lento` eliminado: 700ms nunca es correcto en una app de trabajo diario.
- `shimmer` `ease-in-out` → `linear`: los loops infinitos deben ser constantes, sin pulso irregular.
- `FichaModulo` panel lateral: `animate-aparecer` (sube) → `animate-deslizarse-derecha` (entra desde derecha). Coherencia espacial.
- `transition-all` → `transition-colors` en todos los inputs y selects: no animar layout, solo color/borde.
- `prefers-reduced-motion` añadido a globals.css: accesibilidad para usuarios con sensibilidad al movimiento.
- Nuevo keyframe `deslizarse-derecha` en tailwind.config.ts.
- Archivos: `tailwind.config.ts`, `globals.css`, `ficha-modulo.tsx`, `buscador-modulos.tsx`.

### 2026-05-29 — Design polish: 7 mejoras de UI (caoba, divide-y, shimmer, stagger, nav, empty states)
- **P1 — Color caoba en CTAs primarios**: todos los botones de acción principal (Guardar, Agregar al carrito, Nuevo proyecto) usan ahora `bg-caoba-600` en vez de `bg-stone-900`. Diferenciación clara de jerarquía.
- **P2 — Cards → divide-y en borrador**: las listas de módulos, herrajes y especiales en borrador (cotizaciones y valoraciones) usan ahora un único contenedor con `divide-y` en lugar de cards individuales. Menos ruido visual.
- **P3 — Shimmer en skeletons**: reemplazado `animate-pulse` por clase `.skeleton` con gradiente barrido de izquierda a derecha. Nuevo keyframe `shimmer` en tailwind.config.ts y clase en globals.css.
- **P4 — Stagger en listas**: ítems del carrito aparecen con `animationDelay` escalonado de 40ms por ítem usando `animate-aparecer`.
- **P5 — Nav: indicador de ruta activa**: cambio de pill `bg-stone-100` a `border-b-2 border-caoba-500` de altura completa. Más refinado.
- **P6 — Avatar de usuario**: `h-7 w-7` con `ring-2 ring-stone-200`. Legible en retina.
- **P7 — Empty states**: ícono en contenedor `bg-caoba-50` + jerarquía tipográfica en 2 niveles. Cotizaciones, borrador (módulos, herrajes, especiales) y valoraciones.
- Archivos: `tailwind.config.ts`, `globals.css`, `nav-portal.tsx`, `cotizaciones/page.tsx`, `cotizaciones/borrador/page.tsx`, `valoraciones/borrador/page.tsx`, `buscador-modulos.tsx`, `ficha-modulo.tsx`.

### 2026-05-29 — UX: mejoras al cotizador (observaciones, staging herrajes, costos unitarios)
- **Observaciones visibles en carrito**: el texto de observaciones de cada módulo aparece ahora directamente en la fila del carrito (cursiva, debajo del subtítulo), sin necesidad de expandir el ítem. Aplica en cotizaciones y valoraciones.
- **Staging de herrajes en buscador**: en la pestaña Herrajes del buscador, el botón ya no agrega directamente al carrito. Se acumulan en una lista "Seleccionados" donde se puede ajustar la cantidad o quitar antes de confirmar. Botón "Agregar N al carrito" en el footer cierra el buscador y agrega todos de una vez.
- **Costos unitarios por producto**: para roles con acceso a costos (`super_admin`, `delben_facturacion`, `distribuidor_admin`, `distribuidor_costos`), se muestra ahora el costo unitario por ítem (módulo y herraje) además del total de línea, cuando la cantidad es mayor a 1.
- Archivos: `buscador-modulos.tsx`, `cotizaciones/borrador/page.tsx`, `valoraciones/borrador/page.tsx`.

### 2026-05-29 — Fix: guardar cotización duplicada fallaba (fecha.getTime)
- `guardarCotizacion` en `cotizaciones.ts` llamaba `info.fecha.getTime()`. Al duplicar desde localStorage, `fecha` era string → error en runtime.
- Solución: `new Date(info.fecha).getTime()`.
- Archivo: `apps/portal/src/lib/firestore/cotizaciones.ts`.

### 2026-05-28 — Fix: fecha_cotizacion.getTime is not a function
- Al rehidratar el store desde `localStorage`, `cotizacionInfo.fecha` quedaba como string ISO en vez de `Date`. El motor de cálculo llamaba `.getTime()` y fallaba al agregar herrajes o módulos.
- Solución: `new Date(cotizacionInfo.fecha)` en los dos puntos donde se construye `motorBase` y el payload de `agregarHerraje`.
- Archivo modificado: `apps/portal/src/store/carrito.ts`.

### 2026-05-28 — Cantidades decimales en todos los campos
- Extendido soporte decimal a **todos** los controles de cantidad: buscador de herrajes (`PanelHerrajes`), módulos especiales en borrador de cotización (`EspecialItemRow`) y acción `cambiarCantidadEspecial` del store.
- Todos los controles tienen ahora: botones ±0.5, input editable (`type="number" min=0.1 step=0.5`), mínimo 0.1.
- Archivos modificados: `carrito.ts`, `buscador-modulos.tsx`, `cotizaciones/borrador/page.tsx`.

### 2026-05-27 — Arreglos solicitados por Cindy
- Correcciones varias en UI/UX del cotizador según revisión interna.

### 2026-05 — Resumen de proyecto PDF
- Botón en `ProyectoCard`: selecciona versiones, agrega descripciones individuales, genera PDF consolidado con totales por versión y gran total.

### 2026-05 — Design polish pass
- `PRODUCT.md` y `DESIGN.md` creados como documentos de referencia visual.
- Skeleton loaders y animaciones stagger en listas.
- Nav con estado activo por ruta.
- Página de inicio para distribuidores.

### 2026-05 — Valoraciones internas (delben_facturacion)
- Colección `valoraciones/` en Firestore con flujo borrador → guardada.
- 4 páginas `/admin/valoraciones/*`: nueva, borrador, lista, detalle.
- Navegación condicionada al rol `delben_facturacion` / `super_admin`.
- Security Rules actualizadas para la nueva colección.

### 2026-05 — Mejoras transversales (R6)
- Firestore Security Rules completas con aislamiento por tenant.
- Tasa USD configurable con historial de valores.
- Historial de condiciones del distribuidor (descuentos y servicios).
- Categoría registrada en cada cotización guardada.
- Costos fijos de transporte e instalación por proyecto (modo fijo).
- Desglose completo de precios por ítem en el borrador.

### 2026-04 — Multi-tenant y cotizador conectado (Rebanada 3)
- Panel de distribuidores y gestión de usuarios por tenant.
- Cotizador conectado a datos reales de Firestore (módulos, precios, herrajes).
- Deduplicación de módulos por variantes de dimensión.
- Herrajes asociados visibles en la ficha del módulo.

### 2026-04 — Catálogo en Firestore (Rebanada 2)
- Panel admin de importación desde Excel (idempotente).
- ~2.076 módulos + ~447 herrajes en Firestore.
- Imágenes en Firebase Storage con matching automático por nombre.
