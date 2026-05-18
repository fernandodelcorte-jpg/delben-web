# 11 · Motor de Cálculo

El componente más crítico del sistema. Validado numéricamente. Todo SECUENCIAL
(cada paso sobre el resultado del anterior).

---

## Las dos capas

```
PRECIO BASE (de la lista de Excel, en COP)
│
├─ CAPA DELBEN  ──────────────────────────────►  COSTO AL DISTRIBUIDOR
│   0. Moneda: si cliente final es exportación → USD con tasa del super_admin
│   1. Descuento principal:
│        tradicional → % distribuidor (muebles | herrajes según el ítem)
│        desarmado   → % categoría (tabla de condiciones)
│   2. Ajuste de la SUBCATEGORÍA de acabado (descuento / nada / recargo)
│   3. Campaña activa (si fecha + segmentación aplican)
│   4. Servicios Delben:
│        grupo1 = diseño% + cotización% + producción% + logística%   (SE SUMAN)
│        subtotal1 = costo_tras_descuentos × (1 + grupo1)
│        gestión comercial = MARGIN:
│           COSTO_DELBEN = subtotal1 ÷ (1 − gestión_comercial%)
│   ► COSTO_DELBEN = valor de la ORDEN DE COMPRA
│
└─ CAPA DISTRIBUIDOR  ───────────────────────►  PRECIO AL CLIENTE FINAL
    5. grupo2 = transporte% + instalación% + imprevistos%   (SE SUMAN)
       subtotal2 = COSTO_DELBEN × (1 + grupo2)
    6. utilidad = MARGIN:
       precio_sin_iva = subtotal2 ÷ (1 − utilidad%)
    7. IVA (ÚLTIMO paso):
       Colombia    → PRECIO_FINAL = precio_sin_iva × (1 + iva%)
       Exportación → PRECIO_FINAL = precio_sin_iva  (sin IVA)
```

## Punto clave: dos "margin"

Gestión comercial y utilidad se aplican como **margin**: división por (1 − %),
NO multiplicación. Esto es deliberado y financieramente correcto: garantiza
que el % deseado sea real sobre el precio de venta, no un markup que parece
ese % pero es menos.

## Caso validado (ejecutado, da exacto)

| Paso | Operación | Resultado |
|---|---|---|
| Base | — | 1.000.000 |
| Descuento desarmado cocina | × (1 − 0.30) | 700.000 |
| Servicios grupo1 (14%) | × 1.14 | 798.000 |
| Gestión comercial 6% (margin) | ÷ 0.94 | **848.936** ← COSTO DELBEN |
| Universo grupo2 (16%) | × 1.16 | 984.766 |
| Utilidad 25% (margin) | ÷ 0.75 | 1.313.021 |
| IVA 19% Colombia | × 1.19 | **1.562.495** ← precio cliente |

Exportación (sin IVA) = 1.313.021. Utilidad real comprobada = 25% (confirma
que es margin, no markup). Los 8 puntos de verificación pasaron.

## ⚠️ Tu tarea crítica antes de construir alrededor

El caso de arriba usa porcentajes de ejemplo. **Reemplaza los tests por 5-10
cotizaciones REALES de Delben** con sus números finales conocidos. Si el motor
reproduce esos números exactos, tienes certeza matemática de que está bien.
Si no, encontramos la regla faltante ANTES de construir la app. Este es el
principio rector del proyecto. No lo saltes.

## Reglas para Claude Code

- El motor está implementado en `codigo/motor_calculo.ts` → va a `packages/core/`.
- NO reescribir su lógica sin aprobación. Está validado.
- Incluye `filtrarPorRol()`: úsala SIEMPRE antes de devolver cálculos a un
  usuario. El `distribuidor_comercial` no recibe campos de costo Delben.
- Los tests de Vitest deben pasar antes de dar cualquier tarea por terminada.

## Pendientes que afinan (no rompen el motor)

- Switch de acumulación tradicional+desarmado: parametrizado en datos, sin UI
  por ahora.
- ¿El distribuidor ve el desglose de servicios Delben o solo su costo final?
  (afecta UI, no el cálculo).
