# Referencia de código (TEMPORAL)

Esta carpeta NO es el lugar definitivo de estos archivos. Son referencia
mientras no exista la estructura del monorepo.

## motor_calculo.ts

El motor de cálculo de las dos capas, ya validado numéricamente (el caso
confirmado da 1.562.495). Su lugar DEFINITIVO es `packages/core/` dentro del
monorepo, que Claude Code creará en la Rebanada 0.

Cuando Claude Code arme el monorepo:
1. Mueve este archivo a `packages/core/src/motor_calculo.ts` (o donde
   corresponda según la estructura que genere).
2. Activa los tests que están comentados al final del archivo.
3. Reemplaza los casos de ejemplo por 5-10 cotizaciones REALES de Delben.
4. Verifica que `npm test` pase con el caso 1.562.495 en verde.

REGLA DE ORO: no reescribir la lógica de cálculo de este archivo sin
aprobación. Está validado. Ver CLAUDE.md.

## importar_excel_ESPECIFICACION.js

NO es un script ejecutable. Es la especificación de lo que el script de
importación debe hacer. Claude Code generará el script real en la Rebanada 2,
contra el modelo de datos de `docs/12_DATOS_FIRESTORE.md`. No uses scripts
de importación de descargas anteriores: usaban un modelo de datos viejo.
