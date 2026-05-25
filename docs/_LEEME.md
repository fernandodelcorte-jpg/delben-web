# Referencia de código

Material de apoyo. NO es código activo del proyecto.

## motor_calculo.ts

El motor de cálculo de dos capas, validado numéricamente (el caso
confirmado da 1.562.495). Este archivo es la **referencia original**.

En la Rebanada 0 ya se copió a `packages/core/` del repo. Si necesitas
consultar la versión de referencia (para comparar que no se desvió), es
esta. REGLA DE ORO (ver CLAUDE.md): no reescribir su lógica sin aprobación.

Pendiente crítico: reemplazar los tests de ejemplo por 5-10 cotizaciones
REALES de Delben. Ver `docs/ESTADO_ACTUAL.md`.

## importar_excel_ESPECIFICACION.js

NO es un script ejecutable. Es la especificación de qué debe hacer el
importador de módulos. Claude Code generará el script real en la
Rebanada 2, contra la sección 3 (datos) y sección 6 (herrajes) de
`docs/DISENO_SISTEMA.md`.

## prototipos/

`Prototipo_Cotizador_Delben_v4_final.html` — referencia visual del flujo
del cotizador (carrito, ficha de módulo con subcategoría y herrajes,
vistas por rol). Es guía de cómo debe verse y comportarse, no código.
