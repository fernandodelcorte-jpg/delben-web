# 12 · Modelo de Datos (Firestore)

Esquema completo. NoSQL documental. Las cotizaciones guardan snapshot completo
para quedar congeladas ante cambios futuros.

---

## Colecciones

```
/config/global
  { switch_acumulacion: bool, ... }
/config/tasa_usd_historial/{id}
  { valor, vigente_desde, creado_por, created_at }
/config/iva_pais/{pais}
  { iva_pct, aplica_iva: bool }

/categorias/{id}
  { nombre, desc_desarmado_base_pct, desc_desarmado_premium_pct, orden, activo }

# --- Jerarquía de acabados (3 niveles, la gestiona super_admin) ---
/tipos_fachada/{id}
  { nombre, orden, activo }                 # nivel 1: define precio base
/subcategorias/{id}
  { tipo_fachada_id,                         # pertenece a UN tipo de fachada
    nombre,                                  # ej "Magenta" (la crea Delben)
    tipo_ajuste: 'descuento'|'ninguno'|'recargo',
    ajuste_pct,                              # el motor lee el ajuste de AQUÍ
    activo }                                 # nivel 2: define el ajuste
/acabados/{id}
  { subcategoria_id, nombre, activo }        # nivel 3: color que se fabrica

/tipos_estructura/{id}
  { nombre, espesor_mm, orden, activo }

/modulos/{id}
  { codigo_excel, categoria_id, tipologia, nombre,
    altura, profundidad, imagen_url, search_keywords[], activo }
/modulos/{moduloId}/precios/{precioId}
  { tipo_estructura_id, tipo_fachada_id, precio_cop, codigo_excel }

/accesorios/{id}                              # herrajes, perfilería, etc.
  { codigo, nombre, descripcion, precio_pvp_cop,
    categoria_accesorio, fuente, activo }

/servicios_delben/{id}
  { nombre, pct_default }                     # diseño, cotización, producción,
                                              # logística, gestión_comercial

/distribuidores/{id}
  { nombre, pais, ciudad, moneda_derivada,
    descuento_muebles_pct, descuento_herrajes_pct,     # modelo tradicional
    servicios_override: { diseno_pct, cotizacion_pct,
                          produccion_pct, logistica_pct,
                          gestion_comercial_pct },
    universo: { transporte_pct, instalacion_pct,
                imprevistos_pct, utilidad_pct, iva_pct },
    activo, created_at }
/distribuidores/{id}/historial_condiciones/{id}
  { ...snapshot, vigente_desde, creado_por }

/campanas/{id}
  { nombre, descuento_pct, fecha_desde, fecha_hasta,
    segmentacion: { tipo: 'global'|'segmentada',
                    distribuidores: [ids]|null,
                    categorias: [ids]|null,
                    subcategorias: [ids]|null },
    activa, creado_por, created_at }

/usuarios/{uid}
  { nombre, email, rol, distribuidor_id (null si es Delben),
    activo, created_at, last_login }

/distribuidores/{id}/clientes/{id}
  { nombre, pais, documento, contacto, condiciones, created_at }
  # cliente final del distribuidor; su país define moneda/IVA de Capa Distribuidor

/distribuidores/{id}/proyectos/{id}
  { cliente_id, cliente_nombre_snapshot, nombre, codigo,
    modalidad: 'tradicional'|'desarmado',   # única para toda la cotización
    estado, created_at, updated_at }

/distribuidores/{id}/proyectos/{id}/cotizaciones/{id}
  { version, fecha, validez_dias, moneda, tasa_usd_aplicada, modalidad,
    modulos: [ {
       modulo_codigo, nombre, tipo_estructura, tipo_fachada,
       subcategoria, ajuste_subcategoria_pct, acabado_color,
       acabado_estructura, color_vidrio, color_metal,   # vidrio/metal solo
       altura, profundidad, cantidad, observaciones,     # si Aluminio Vidrio
       herrajes_asociados: [ { codigo, nombre, cantidad } ],
       ...snapshot de cada paso de cálculo...
    } ],
    herrajes_sueltos: [ { codigo, nombre, cantidad, ... } ],
    capa_delben: { subtotal_costo, servicios{...}, total_costo_delben },
    capa_distribuidor: { transporte, instalacion, imprevistos,
                         utilidad, iva, total_venta },
    snapshot_reglas: { ...todas las condiciones al momento... },
    estado, doc_orden_compra_url, doc_cotizacion_cliente_url,
    created_by, created_at }
```

## Decisiones de modelado

- **Snapshot completo en cada cotización**: aunque cambien descuentos pactados,
  campañas o tasa USD, las cotizaciones viejas quedan exactas. Crítico legal y
  operativamente.
- **Herrajes asociados embebidos en cada módulo**: si se elimina el módulo, se
  van con él. Herrajes sueltos en array aparte.
- **search_keywords[]**: Firestore no tiene full-text nativo; array de palabras
  normalizadas para búsqueda por nombre con `array-contains`.
- **Snapshots de nombres** (cliente, vendedor): para que el histórico no se
  rompa si se renombra/elimina.
- **Subcategoría guardada con su ajuste**: la cotización registra qué ajuste se
  aplicó, no solo el id (parte del snapshot).

## Seguridad (Firestore Rules — conceptual)

- Catálogos: lectura autenticada, escritura solo super_admin.
- Distribuidores aislados: cada uno solo ve sus clientes/proyectos/cotizaciones.
- `distribuidor_comercial`: las reglas + el backend nunca le entregan campos de
  `capa_delben`. Separación real, no visual.
- `delben_facturacion`: ve `capa_delben` y órdenes de compra, no precios de venta.
