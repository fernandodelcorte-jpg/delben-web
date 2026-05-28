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
