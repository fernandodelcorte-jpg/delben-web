# 📦 Plataforma Delben — Paquete de Construcción

> **Empieza aquí.** Este índice te dice qué es cada archivo y en qué orden usarlo.
> Generado al cierre de la fase de diseño. Todo lo anterior queda obsoleto.

---

## Qué es este paquete

El resultado completo de la fase de diseño de la **Plataforma Delben**: un SaaS B2B
de cotización para la red de distribuidores de Delben (fábrica de carpintería).
Todo el modelo de negocio está cerrado, el motor de cálculo validado
numéricamente, y la arquitectura definida. Esto es lo que necesitas para
construir, sin tener que releer ninguna conversación.

## Estructura del paquete

```
📁 paquete_final/
├── 00_INDICE.md                    ← este archivo (empieza aquí)
├── 01_QUE_HACER_AHORA.md           ← pasos concretos antes y al construir
├── CLAUDE.md                       ← reglas permanentes (va en raíz del repo)
├── 📁 docs/
│   ├── 10_MODELO_NEGOCIO.md        ← qué es, roles, modelos, jerarquías
│   ├── 11_MOTOR_CALCULO.md         ← las 2 capas, fórmulas, caso validado
│   ├── 12_DATOS_FIRESTORE.md       ← modelo de datos completo
│   ├── 13_FLUJO_INTERFAZ.md        ← carrito, ficha de módulo, prototipos
│   └── 14_PLAN_CONSTRUCCION.md     ← rebanadas, orden, pendientes
├── 📁 codigo/
│   ├── motor_calculo.ts            ← motor validado (va en packages/core)
│   └── importar_excel.js           ← script de importación del catálogo
└── 📁 prototipos/
    └── (los HTML de referencia visual ya entregados)
```

## Orden de lectura

| # | Archivo | Para qué |
|---|---|---|
| 1 | `01_QUE_HACER_AHORA.md` | Tus próximos pasos concretos |
| 2 | `docs/10_MODELO_NEGOCIO.md` | Entender el negocio completo |
| 3 | `docs/11_MOTOR_CALCULO.md` | El corazón del sistema |
| 4 | `docs/12_DATOS_FIRESTORE.md` | Cómo se guardan los datos |
| 5 | `docs/13_FLUJO_INTERFAZ.md` | Cómo se ve y se usa |
| 6 | `docs/14_PLAN_CONSTRUCCION.md` | En qué orden construir |
| 7 | `CLAUDE.md` | Reglas que Claude Code seguirá siempre |

## Cómo usar esto con Claude Code

1. Crea el repositorio del proyecto.
2. Copia `CLAUDE.md` a la raíz del repo. Claude Code lo lee automáticamente
   en cada sesión: nunca tendrás que repetir el contexto.
3. Copia `codigo/motor_calculo.ts` a `packages/core/` cuando llegues a esa
   rebanada.
4. Para arrancar, dale a Claude Code el `CLAUDE.md` + `docs/14_PLAN_CONSTRUCCION.md`
   y pídele la Rebanada 0.
5. En cada rebanada, adjunta el documento de `docs/` que corresponda.

## ⚠️ Archivos obsoletos

Todo lo que NO esté en `paquete_final/` es de versiones anteriores y **no debe
usarse**. En la carpeta de salida hay archivos viejos (documento maestro v1/v2,
prompts antiguos, motor de una sola capa). Están marcados con prefijo
`OBSOLETO_` o listados en `_ARCHIVOS_OBSOLETOS.md`. Ignóralos por completo.

## Estado del proyecto

✅ Modelo de negocio cerrado y validado
✅ Motor de cálculo de 2 capas validado numéricamente
✅ Jerarquías (roles, acabados) definidas
✅ Modelo de datos diseñado
✅ Flujo de interfaz validado con prototipos
✅ Plan de construcción por rebanadas
⏳ Pendientes del usuario (no bloquean construir): ver `01_QUE_HACER_AHORA.md`

**Siguiente paso real: construir la Rebanada 0. La fase de diseño terminó.**
