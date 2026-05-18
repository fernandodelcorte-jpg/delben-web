# LÉEME — Cómo montar este repositorio

Esta carpeta ya tiene la estructura EXACTA que debe tener tu repositorio.
Solo tienes que copiar su contenido a la carpeta de tu repo. No muevas
archivos uno por uno: copia todo tal cual está aquí.

---

## Qué hacer (paso a paso)

### 1. Crea cuentas y proyectos (antes de tocar código)
- Firebase: proyecto nuevo con Firestore + Authentication + Storage
- Netlify: cuenta lista
- GitHub: repositorio nuevo (vacío)

### 2. Clona el repo vacío en tu computador y ábrelo en VS Code

### 3. Copia el contenido de esta carpeta al repo
Copia TODO lo que está aquí (este archivo no hace falta copiarlo, es solo
la guía) manteniendo la estructura de carpetas:

```
tu-repositorio/
├── CLAUDE.md                  ← va en la RAÍZ (no lo metas en ninguna carpeta)
│
└── docs/                      ← toda la documentación agrupada aquí
    ├── 00_INDICE.md           ← empieza leyendo este
    ├── 01_QUE_HACER_AHORA.md
    ├── 10_MODELO_NEGOCIO.md
    ├── 11_MOTOR_CALCULO.md
    ├── 12_DATOS_FIRESTORE.md
    ├── 13_FLUJO_INTERFAZ.md
    ├── 14_PLAN_CONSTRUCCION.md
    │
    ├── prototipos/
    │   └── Prototipo_Cotizador_Delben_v4_final.html
    │
    └── _referencia_codigo/
        ├── motor_calculo.ts
        └── importar_excel_ESPECIFICACION.js
```

### 4. Por qué cada cosa está donde está

- **`CLAUDE.md` en la raíz**: Claude Code lo lee automáticamente en cada
  sesión SOLO si está en la raíz del repo. Es la regla más importante de
  la organización. No lo metas dentro de `docs/`.

- **`docs/`**: toda la documentación de referencia. La consultas tú y se la
  pasas a Claude Code según la rebanada en la que estés. No es código que
  se ejecute.

- **`docs/_referencia_codigo/`**: el motor de cálculo y la especificación de
  importación están aquí TEMPORALMENTE, como referencia. NO es su lugar
  definitivo. Cuando Claude Code construya la Rebanada 0 y cree la estructura
  del monorepo, el motor se moverá a `packages/core/`. Por eso la carpeta
  empieza con guion bajo: para recordar que es referencia, no código activo.

### 5. Primer commit
Haz un commit inicial con esta estructura ("docs: estructura inicial del
proyecto y documentación de diseño"). Así queda el punto de partida limpio
en el historial.

### 6. Abre Claude Code en el repo
Como `CLAUDE.md` está en la raíz, Claude Code ya tiene el contexto del
proyecto. Para arrancar, dale también `docs/14_PLAN_CONSTRUCCION.md` y pide:

> "Lee CLAUDE.md y docs/14_PLAN_CONSTRUCCION.md. Construye la Rebanada 0
> según el plan. No avances a la siguiente rebanada sin que yo confirme."

### 7. A partir de ahí
Claude Code irá creando las carpetas reales del proyecto (`apps/`,
`packages/`, etc.) junto a `CLAUDE.md` y `docs/`. Tu repo crecerá así:

```
tu-repositorio/
├── CLAUDE.md
├── docs/                      ← tu documentación (no cambia)
├── apps/portal/               ← lo crea Claude Code
├── packages/core/             ← lo crea Claude Code (aquí irá el motor)
├── package.json               ← lo crea Claude Code
└── ...                        ← resto del monorepo
```

## Importante

- NO copies la carpeta `_OBSOLETO_no_usar` (si la tienes de descargas
  anteriores). Esos archivos son de versiones viejas. Solo usa lo de aquí.
- El `Cuestionario_Delben_Gerente.docx` NO va al repo. Es para tu papá.
  Guárdalo aparte en tu computador.
- Empieza siempre leyendo `docs/00_INDICE.md`: es el mapa de todo.

## El orden mental correcto

No vas a "trabajar en mejoras". Vas a CONSTRUIR desde cero, en orden, una
rebanada a la vez. La Rebanada 0 es el cimiento. No saltes pasos. La
disciplina de construir en rebanadas es lo que hará que el proyecto llegue
a producción en vez de quedarse a medias.
