# CLAUDE.md — Plataforma Delben

> Este archivo vive en la raíz del repositorio. Claude Code lo lee
> automáticamente en cada sesión. Son las reglas permanentes del proyecto.

## Qué es este proyecto

Plataforma SaaS B2B de cotización para Delben (fábrica de carpintería, 45 años,
Colombia). Delben administra; ~10-20 distribuidores en Colombia/Venezuela/USA
son los usuarios reales: cotizan a sus clientes finales. Cada cotización genera
dos documentos: orden de compra a Delben y cotización al cliente final.

El usuario principal del sistema es **el distribuidor**, no Delben.

## Stack (NO cambiar sin aprobación explícita del dueño del proyecto)

- Next.js 15 (App Router) + TypeScript estricto (sin `any`)
- Firebase: Firestore + Auth + Storage
- Tailwind + shadcn/ui
- Netlify (`@netlify/plugin-nextjs`)
- Monorepo Turborepo
- TanStack Query (estado servidor) · Zustand (carrito)
- React Hook Form + Zod
- @react-pdf/renderer (PDF)
- Vitest (tests)

## Estructura del monorepo

```
delben/
├── apps/portal/      ← portal distribuidores + admin Delben
├── apps/web/         ← web institucional (futuro, NO ahora)
├── packages/core/    ← motor de cálculo + tipos compartidos
├── packages/ui/      ← componentes shadcn compartidos
├── packages/firebase/← config y helpers Firebase
└── packages/config/  ← tsconfig, eslint, tailwind base
```

## Reglas de oro (inviolables)

1. **NO tocar el motor de cálculo sin aprobación.** `packages/core/motor_calculo.ts`
   está validado numéricamente (caso confirmado da 1.562.495). No reescribir,
   no "mejorar", no refactorizar su lógica. Si crees que hay un bug, dilo; no
   lo cambies por iniciativa propia.

2. **Separación de seguridad REAL en backend.** El rol `distribuidor_comercial`
   JAMÁS debe recibir el costo Delben ni los pasos internos de cálculo. No es
   ocultar en UI: el dato no sale del servidor hacia ese rol. Usar la función
   `filtrarPorRol` y reforzar en Firestore Security Rules. Todo endpoint que
   devuelva cálculos filtra por rol ANTES de responder.

3. **No inventar reglas de negocio.** Si algo no está en los documentos de
   `docs/`, preguntar. No asumir.

4. **No grandes refactors sin pedirlos.** Cambios pequeños y verificables.

5. **Construcción por rebanadas verticales**, no capas horizontales. Cada
   rebanada usable de punta a punta. No avanzar de rebanada sin confirmación.

6. **Avisar si una petición contradice los documentos** de `docs/` o es un
   anti-patrón. La honestidad técnica está por encima de complacer.

## Modelo de cálculo (resumen — detalle en docs/11_MOTOR_CALCULO.md)

Dos capas, todo SECUENCIAL:

- **Capa Delben** (→ costo al distribuidor): descuento por modelo →
  ajuste de subcategoría de acabado → campaña → servicios Delben
  (diseño+cotización+producción+logística se SUMAN; gestión comercial
  es MARGIN: ÷(1−%)).
- **Capa Distribuidor** (→ precio cliente final): transporte+instalación+
  imprevistos se SUMAN → utilidad MARGIN ÷(1−%) → IVA último
  (Colombia con IVA; exportación sin IVA).

Moneda e IVA se derivan del país: el distribuidor lo configura el super_admin;
el cliente final lo configura el admin del distribuidor.

## Roles

- Delben: `super_admin`, `delben_facturacion`, `delben_comercial`
- Distribuidor: `distribuidor_admin`, `distribuidor_costos`, `distribuidor_comercial`
- Delben crea: los 3 de Delben + el admin de cada distribuidor.
- El distribuidor_admin crea: costos y comercial de su empresa.
- Aislamiento estricto entre distribuidores (un tenant nunca ve otro).

## Convenciones de código

- TypeScript estricto, sin `any`.
- Server Components por defecto; Client Components solo si hay interactividad.
- Validación con Zod en toda entrada.
- camelCase variables/funciones; PascalCase componentes/tipos; kebab-case archivos.
- Tests en Vitest, obligatorios para `packages/core`.
- Commits convencionales en español (feat:, fix:, refactor:, docs:).

## Idioma

Todo en español: comentarios, commits, nombres de dominio (modulo, cotizacion,
distribuidor, etc.), mensajes de UI. El código (keywords) en inglés por sintaxis.

## Antes de dar una tarea por terminada

- `npm test` en `packages/core` pasa (incluido el caso 1.562.495).
- TypeScript compila sin errores ni `any`.
- No se rompió ninguna rebanada anterior.
- Si tocó algo de seguridad por rol, verificar que el comercial no recibe
  costo Delben.
