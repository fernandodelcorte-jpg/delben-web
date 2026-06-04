# Casos de prueba del motor — VERIFICADOS

Estos 5 casos fueron ejecutados sobre el motor real (motor_calculo.ts
compilado) y verificados contra cálculo a mano paso por paso. Todos
coinciden. Reemplazan los 8 tests de ejemplo en `packages/core`.

REGLA: Claude Code convierte esto en tests de Vitest SIN tocar la lógica
del motor. Si algún test no pasa, NO ajustar el motor: avisar.

## Datos base comunes (salvo que el caso indique otra cosa)

```
cantidad: 1
tipo_item: 'mueble'
linea_acabado: { id:'std', tipo_ajuste:'ninguno', ajuste_pct:0, es_premium:false }
fecha_cotizacion: 2026-03-15
campanas_disponibles: []
servicios_delben: { diseno:3, cotizacion:2, produccion:5, logistica:4, gestion_comercial:6 }
universo: { transporte:5, instalacion:8, imprevistos:3, utilidad:25, iva:19 }
tasa_usd: 4000
distribuidor: { id:'d1', descuento_muebles_pct:35, descuento_herrajes_pct:15 }
categoria (cocina): { id:'cocina', desc_base_pct:30, desc_premium_pct:12 }
```

## Caso 1 — desarmado / cocina / Colombia

Entrada: precio_base_cop 1.000.000, modelo 'desarmado',
pais_cliente_final 'Colombia', resto = base.

Esperado:
- costo_tras_descuentos = 700.000
- costo_delben = 848.936
- precio_sin_iva = 1.313.021
- precio_final_unitario = **1.562.495**

## Caso 2 — tradicional / mueble / Colombia

Entrada: precio_base_cop 1.000.000, modelo 'tradicional',
pais_cliente_final 'Colombia'. (Usa descuento_muebles_pct 35%.)

Esperado:
- costo_tras_descuentos = 650.000
- costo_delben = 788.298
- precio_final_unitario = **1.450.889**

## Caso 3 — exportación / Venezuela / con IVA de sede 16% / USD

> Regla actualizada 2026-06-04: el IVA se aplica según el `iva_pct` de la sede en
> CUALQUIER país (ya NO "exportación sin IVA"). La conversión a USD no cambia.

Entrada: precio_base_cop 1.000.000, modelo 'desarmado',
pais_cliente_final 'Venezuela', tasa_usd 4000, universo.iva 16.

Esperado:
- moneda = 'USD'
- iva_aplicado = true
- precio_sin_iva ≈ **328,26 USD** (cadena pre-IVA idéntica al caso anterior)
- iva_monto ≈ **52,52 USD**
- precio_final_unitario ≈ **380,78 USD** (= 328,26 × 1,16; tolerancia 0,5 por redondeo)

## Caso 4 — magenta (+12% recargo) / desarmado / cocina / Colombia

Entrada: precio_base_cop 1.000.000, modelo 'desarmado',
pais_cliente_final 'Colombia',
linea_acabado { id:'magenta', tipo_ajuste:'recargo', ajuste_pct:12, es_premium:false }.

Esperado:
- costo_tras_descuentos = 784.000  (700.000 × 1,12)
- precio_final_unitario = **1.749.995**

## Caso 5 — campaña global −10% / desarmado / cocina / Colombia

Entrada: precio_base_cop 1.000.000, modelo 'desarmado',
pais_cliente_final 'Colombia',
campanas_disponibles: [{ id:'nav', pct:10, desde:2026-01-01,
hasta:2026-12-31, activa:true, segmentacion:{ tipo:'global',
distribuidores:null, categorias:null, lineas_acabado:null } }].

Esperado:
- costo_tras_descuentos = 630.000  (700.000 × 0,90)
- precio_final_unitario = **1.406.246**

## Nota de alcance

Esta verificación confirma que el motor es internamente correcto (mecánica
de cálculo). NO confirma que los números base de las reglas (ej. 30%
cocina, 35% muebles) sean los reales de Delben — eso lo confirma el
usuario con Delben. Pendiente menor, no bloqueante. Ver ESTADO_ACTUAL.md.
