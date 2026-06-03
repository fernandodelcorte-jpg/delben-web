# Plataforma Delben

SaaS B2B de cotización para distribuidores de Delben, fábrica colombiana de carpintería de alta calidad (desde 1976). El distribuidor cotiza a su cliente final; el sistema genera automáticamente una cotización para el cliente y una orden de compra interna para Delben.

---

## Documentación

Este README es la entrada al repo (stack, estructura, cómo correrlo). El detalle vive en:

- **[CLAUDE.md](CLAUDE.md)** — reglas permanentes del proyecto (las lee Claude Code en cada sesión).
- **[docs/DISENO_SISTEMA.md](docs/DISENO_SISTEMA.md)** — el diseño completo (negocio, motor, datos, interfaz, plan, herrajes).
- **[docs/ESTADO_ACTUAL.md](docs/ESTADO_ACTUAL.md)** — qué existe HOY, deuda técnica y la **bitácora** cronológica. Léelo primero al empezar una sesión y agrega una entrada al cerrar trabajo importante.
- **[docs/PRODUCT.md](docs/PRODUCT.md)** · **[docs/DESIGN.md](docs/DESIGN.md)** — referencia de producto y sistema de diseño.

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

### Sedes y configuración por sede
- Un distribuidor puede tener varias **sedes** (ej. Bogotá, Miami, Caracas), cada una con su país, moneda/IVA y condiciones de cálculo
- Capa Delben (descuentos + servicios) por sede, con historial de cambios — la define el super_admin
- Universo por sede: transporte, instalación, imprevistos, utilidad, IVA — lo configura el distribuidor_admin
- Transporte e instalación con modo porcentual o fijo por proyecto
- Aislamiento por sede: un comercial no ve cotizaciones de otra sede
- Logo propio del distribuidor

### Catálogo de consulta de precios (`/catalogo`)
- Módulos y herrajes con precio lista − descuento por modalidad
- El costo se calcula y filtra **server-side** (`/api/catalogo`): el `distribuidor_comercial` nunca lo recibe

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

- **Firestore Security Rules**: desplegar con `firebase deploy --only firestore:rules` (requiere `.firebaserc` con el project ID real).
- **Web institucional** (`apps/web/`): pendiente de construir.

> El detalle de pendientes y deuda técnica está en [docs/ESTADO_ACTUAL.md](docs/ESTADO_ACTUAL.md) (sección "Deuda técnica y riesgos"). El historial de cambios vive en la **bitácora** del mismo documento.
