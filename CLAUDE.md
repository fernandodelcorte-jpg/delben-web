# CLAUDE.md — Plataforma Delben

> Este archivo vive en la raíz del repositorio. Claude Code lo lee
> automáticamente en cada sesión. Son las reglas permanentes del proyecto.

## Documentación del proyecto

Los dos documentos de obra (en `docs/`):

- `docs/ESTADO_ACTUAL.md` — dónde va la obra HOY: foto del estado, **deuda
  técnica y riesgos**, y la **bitácora** cronológica. **Léelo PRIMERO** en cada
  sesión. Al cerrar trabajo importante, agrega una entrada en la bitácora.
- `docs/DISENO_SISTEMA.md` — el diseño completo en 6 secciones numeradas
  (1 negocio, 2 motor, 3 datos, 4 interfaz, 5 plan, 6 herrajes). Consúltalo
  según la tarea; no hace falta leerlo entero cada vez.

Apoyo: `README.md` (entrada al repo: stack, estructura, comandos),
`docs/PRODUCT.md` y `docs/DESIGN.md` (producto y sistema de diseño),
`docs/_referencia_codigo/CASOS_PRUEBA_MOTOR.md` (casos del motor).

No hay más documentos de diseño. Si algo no está aquí, pregunta.

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

## Modelo de cálculo (resumen — detalle en docs/DISENO_SISTEMA.md §2)

Dos capas, todo SECUENCIAL:

- **Capa Delben** (→ costo al distribuidor): descuento por modelo →
  ajuste de subcategoría de acabado → campaña → servicios Delben
  (diseño+cotización+producción+logística se SUMAN; gestión comercial
  es MARGIN: ÷(1−%)).
- **Capa Distribuidor** (→ precio cliente final): transporte+instalación+
  imprevistos se SUMAN → utilidad MARGIN ÷(1−%) → IVA último
  (según el `iva_pct` de la sede, en CUALQUIER país; 0 = sin IVA).

La MONEDA se deriva del país (Colombia COP, exportación USD). El IVA NO: se aplica
según el `iva_pct` configurado por la sede (regla 2026-06-04; antes "exportación sin IVA").

## Roles

- Delben: `super_admin`, `delben_facturacion`, `delben_comercial`
  - ⚠️ `delben_comercial` está en el diseño pero **no en el código** (hoy son 5
    roles). Inconsistencia a resolver — ver deuda técnica §2 en `ESTADO_ACTUAL.md`.
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

## Estilo de trabajo

- **Piensa antes de actuar. Lee los archivos relevantes antes de escribir
  código.** No asumas el contenido de un archivo: léelo.
- **Edita solo lo que cambia.** No reescribas archivos enteros para un
  cambio puntual.
- **No releas innecesariamente** archivos sin cambios. PERO si editaste un
  archivo, o no estás seguro de su estado actual, vuelve a leerlo antes de
  modificarlo. La prudencia vale más que ahorrar una lectura.
- **No repitas en tus respuestas** código que no cambió.
- **Sé conciso:** sin preámbulos ni resúmenes innecesarios, no expliques lo
  obvio. EXCEPCIÓN: si una decisión tiene implicaciones de arquitectura,
  seguridad o integridad de datos, explica brevemente el porqué antes de
  actuar, y avisa si algo contradice los documentos de `docs/`.
- **Testea antes de dar por terminado.** Ver la sección siguiente.
- Cambios pequeños y verificables. No grandes refactors sin pedirlos.

## Antes de dar una tarea por terminada

- `npm test` en `packages/core` pasa (incluido el caso 1.562.495).
- TypeScript compila sin errores ni `any`.
- No se rompió ninguna rebanada anterior.
- Si tocó algo de seguridad por rol, verificar que el comercial no recibe
  costo Delben.
