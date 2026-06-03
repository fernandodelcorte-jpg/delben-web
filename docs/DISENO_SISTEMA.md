# DISEÑO DEL SISTEMA — Plataforma Delben

> Documento maestro único. Reúne todo el diseño del proyecto (negocio,
> motor, datos, interfaz, plan, herrajes). Antes estaban separados en 6
> archivos; se unificaron aquí para evitar confusión.
>
> Para el ESTADO ACTUAL de la obra (qué está construido hoy) ver
> `ESTADO_ACTUAL.md`. Para las REGLAS de trabajo ver `CLAUDE.md` (raíz).
>
> Índice:
> 1. Modelo de negocio
> 2. Motor de cálculo
> 3. Modelo de datos (Firestore)
> 4. Flujo de interfaz
> 5. Plan de construcción
> 6. Importación de herrajes

---


# 1. MODELO DE NEGOCIO

Todo el modelo de negocio de la Plataforma Delben. Cerrado y validado.

---

## Qué es

Plataforma SaaS B2B. **Delben** (fábrica de carpintería) administra. Los
**distribuidores** (~10-20 centros de diseño en Colombia, Venezuela, USA) son
los usuarios reales: cotizan a sus clientes finales. El **cliente final** no
entra al sistema; recibe una cotización formal del distribuidor.

Cada cotización produce **dos documentos**:
1. **Orden de compra a Delben**: lo que el distribuidor compra a fábrica y su costo.
2. **Cotización al cliente final**: documento comercial con la marca del distribuidor.

Delben (super_admin) ve todo lo que cotizan los distribuidores (inteligencia de negocio).

## Jerarquía organizacional y roles

```
DELBEN
├── super_admin (Gerente)
│     Configura TODO. Ve costos Delben Y precios de venta de los distribuidores.
├── delben_facturacion
│     Valida órdenes de compra. Ve SOLO costos Delben. Nunca precios de venta.
├── delben_comercial
│     Ve costos Delben + cotizaciones. Da soporte a distribuidores.
│     [Matiz pendiente: ¿ve precio de venta al cliente final? Resolver antes
│      de multi-tenant. No bloquea construir.]
│
└── DISTRIBUIDOR (tenant aislado)
    ├── distribuidor_admin   (lo crea Delben)
    │     Configura el "universo" de su empresa. Crea sus usuarios.
    │     Ve costo Delben Y precio de venta.
    ├── distribuidor_costos  (lo crea el admin del distribuidor)
    │     Ve costo Delben (para órdenes de compra).
    └── distribuidor_comercial (lo crea el admin del distribuidor)
          Ve SOLO precio de venta. NUNCA costo Delben.
          (separación REAL en backend, no visual)
          Cotiza al cliente final.
```

Aislamiento estricto: un distribuidor nunca ve datos de otro.

## Principio de seguridad crítico

El `distribuidor_comercial` jamás debe ver el costo Delben. Esto NO es ocultarlo
en pantalla: el dato no debe salir del servidor hacia ese rol (ni en API, ni en
datos embebidos, ni en el PDF que él genera). Separación real en backend +
Firestore Security Rules. Mismo principio en los dos niveles: Delben protege su
info de los distribuidores; cada distribuidor protege la suya de sus comerciales.

## Los dos modelos de negocio

El distribuidor elige uno por cotización (es único para toda la cotización, no
por módulo). Mismo precio base de MÓDULOS (de la lista de Excel); distinta
lógica de descuento. Los HERRAJES sí tienen precio distinto por modalidad
(ver abajo).

| | Tradicional (armado) | Desarmado (despiezado) |
|---|---|---|
| Producto | Ensamblado, listo para instalar | Despiezado, cantos aplicados, embalado |
| Herrajes | NO incluidos | NO incluidos |
| Descuento | Pactado por distribuidor, dividido: % muebles y % herrajes | Fijo por categoría, igual para todos |
| Alcance | Todo el catálogo | Todo el catálogo |
| Precio herrajes | Lista de herrajes tradicional | Lista de herrajes desarmado |

Común: herrajes nunca incluidos (el comercial los agrega). Entrega en puerta de
fábrica. Acumulación tradicional+desarmado: hoy NO; switch parametrizable a futuro.

### Acceso a modalidades por distribuidor

El super_admin (gerente Delben) define en el perfil de cada distribuidor a
qué modalidad(es) tiene acceso: solo tradicional, solo desarmado, o ambas
(banderas `acceso_tradicional` / `acceso_desarmado`). El distribuidor y sus
comerciales solo ven y cotizan las modalidades habilitadas. Si solo tiene
una, el selector de modalidad no aparece (queda fija).

### Precios de herrajes por modalidad

Los herrajes tienen DOS listas de precios: una tradicional y una desarmado
(dos Excel separados). El mismo herraje existe en ambas con precio distinto.
Al cotizar, el motor toma el precio del herraje según la modalidad de la
cotización. Esto NO cambia la lógica del motor: solo cambia de qué campo
lee el precio base del herraje (`precio_tradicional_cop` o
`precio_desarmado_cop`).

## Tabla de descuentos — Modelo Desarmado

| Categoría | Base | Adicional acabado magenta |
|---|---|---|
| Cocinas | 30% | +12% |
| Cocinas curvas | 10% | — (van armadas) |
| Zonas de ropas | 30% | +12% |
| Closets | 30% | +12% |
| Entretenimiento | 30% | +12% |
| Baños | 15% | +25% |
| Complementos cocina | 25% | +25% |
| Complementos closets | 25% | +25% |
| Herrajes/accesorios/perfilería | 10% | — |

Acabado magenta en Tradicional: +12% adicional (igual en ambos modelos).

## Jerarquía de acabados (3 niveles)

La gestiona Delben (super_admin):

```
TIPO DE FACHADA   (define el precio base; viene de la lista de Excel)
  └── SUBCATEGORÍA (la crea Delben; pertenece a UN tipo de fachada;
                    usa el precio de ESE tipo; define el AJUSTE de precio:
                    descuento %, recargo %, o sin ajuste. Delben le asigna
                    qué acabados/colores le pertenecen)
        └── ACABADO / COLOR (el color que se fabrica)
```

Ej: "Magenta" es subcategoría dentro de "Laminado Acrílico/PVC/PET", usa el
precio de Laminado, aplica +12%. NO hereda precio de otro tipo de fachada.
El motor lee el ajuste de la SUBCATEGORÍA seleccionada.

## Multi-moneda e IVA

Se derivan del país, NO se eligen al cotizar:
- **Distribuidor** (cliente de Delben): el super_admin configura su ubicación →
  determina IVA / exportación para la Capa Delben.
- **Cliente final** (cliente del distribuidor): el admin del distribuidor
  configura sus condiciones → determina IVA / exportación para la Capa Distribuidor.

Colombia: COP con IVA (configurable, hoy 19%). Exportación: USD sin IVA, con
tasa configurada por el super_admin (con histórico).

## Sedes (multi-sede por distribuidor)

Un distribuidor puede operar en varios países con condiciones distintas (ej. Del
Corte Angarita: Colombia, USA, Venezuela). Por eso **toda la configuración de
cálculo vive en la SEDE, no en el distribuidor**. El distribuidor queda como
entidad identitaria (nombre, logo); la sede tiene país, moneda/IVA, accesos a
modalidad y las dos capas de condiciones.

Decisiones cerradas:

1. **Una cotización pertenece a UNA sede**, elegida al iniciar la cotización
   (mismo patrón que el selector de modalidad: si el usuario tiene una sola sede
   disponible, se autoselecciona y no se muestra el selector).
2. **Un usuario puede pertenecer a una, varias o todas las sedes** de su
   distribuidor (`sedes_asignadas[]` + `todas_las_sedes`).
3. **País, moneda e IVA se derivan de la SEDE** (no del distribuidor): Colombia →
   COP con IVA; USA/Venezuela → USD exportación sin IVA.
4. **Reparto de configuración por sede:**
   - **Capa Delben** (descuentos muebles/herrajes, servicios, gestión comercial):
     la define el **super_admin** al crear/editar la sede.
   - **Capa Distribuidor** (universo: transporte, instalación, imprevistos,
     utilidad, IVA): la configura el **distribuidor_admin**, una vez por sede.
     Una sede queda "lista para cotizar" cuando su universo está completo.
5. **El catálogo es global de Delben**: NO cambia por sede (mismos precios base).
6. **Aislamiento por sede**: un `distribuidor_comercial` de la sede A no puede leer
   cotizaciones de la sede B aunque sean del mismo distribuidor (Security Rules).

El motor de cálculo NO cambió: solo cambia el ORIGEN de sus parámetros (antes
`distribuidores/{id}`, ahora `distribuidores/{id}/sedes/{sedeId}`). El caso
validado (1.562.495) sigue idéntico.

## Servicios y costos (las dos capas)

- **Servicios Delben** (Capa Delben, configurables, pueden variar por
  distribuidor): diseño, cotización, producción, logística, gestión comercial.
- **Universo del distribuidor** (Capa Distribuidor, lo configura el
  distribuidor_admin): transporte, instalación, imprevistos, utilidad, su IVA.

El detalle exacto de cómo se combinan está en `11_MOTOR_CALCULO.md`.

## Campañas

El super_admin crea campañas por temporada: nombre, % descuento, fecha
desde/hasta, segmentación combinable (global / distribuidor(es) /
categoría(s) / subcategoría(s) de acabado). El motor la aplica si la fecha de
cotización está vigente y la segmentación coincide. Si varias aplican, la de
mayor %.

---


# 2. MOTOR DE CÁLCULO

El componente más crítico del sistema. Validado numéricamente. Todo SECUENCIAL
(cada paso sobre el resultado del anterior).

> NOTA sobre el PRECIO BASE: el precio base ya viene del Excel según la
> combinación de tipo de estructura × tipo de fachada elegida. Esto
> incluye el sobreprecio de la estructura Premium (verificado: mismo
> módulo y fachada, 15mm Blanca $388.400 vs 15mm Premium $505.800). El
> motor NO calcula ningún ajuste por "premium de estructura": ya está en
> el precio base. NO inventar un recargo premium creyendo que falta.

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

---


# 3. MODELO DE DATOS (FIRESTORE)

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

/accesorios/{id}                              # id = código del herraje (inmutable)
  { codigo, nombre,
    precio_tradicional_cop,                   # 0/vacío en Excel → null
    precio_desarmado_cop,                     # 0/vacío en Excel → null
    disponible_tradicional,                   # bool: precio_tradicional > 0
    disponible_desarmado,                     # bool: precio_desarmado > 0
    imagen_url, activo }
  # Un solo Excel unificado lo pobla (ver docs/15). El código (ex-"Orden"
  # del Excel) es inmutable. Precio 0/vacío en una modalidad = no se vende
  # en esa modalidad: el motor no lo ofrece ahí. El motor usa el precio
  # según la modalidad de la cotización.
  # ELIMINACIÓN LÓGICA: "eliminar" un herraje = activo:false (NUNCA borrado
  # físico). Un herraje inactivo no aparece en el buscador ni se puede
  # agregar a cotizaciones nuevas, pero el registro y su código permanecen
  # para que las cotizaciones viejas que lo referencian sigan siendo
  # correctas. Un código liberado JAMÁS se reutiliza para otro herraje.

/servicios_delben/{id}
  { nombre, pct_default }                     # diseño, cotización, producción,
                                              # logística, gestión_comercial

/distribuidores/{id}                          # entidad IDENTITARIA (ver Sedes en §1)
  { nombre, logo_url, activo, created_at }
  # La configuración de cálculo NO vive aquí: vive en cada sede.

/distribuidores/{id}/sedes/{sedeId}           # toda la config de cálculo, por sede
  { nombre,                       # ej "Bogotá", "Miami", "Caracas"
    pais, ciudad,                 # derivan moneda/IVA (Colombia→COP+IVA; resto→USD export)
    acceso_tradicional: bool,     # el super_admin define a qué
    acceso_desarmado: bool,       # modalidad(es) accede esta sede
    # --- Capa Delben (la define el super_admin) ---
    descuento_muebles_pct, descuento_herrajes_pct,     # modelo tradicional
    servicios: { diseno_pct, cotizacion_pct,
                 produccion_pct, logistica_pct,
                 gestion_comercial_pct },
    # --- Capa Distribuidor / universo (lo configura el distribuidor_admin) ---
    universo: { iva_pct,
                tradicional: { transporte_tipo, transporte_pct,
                               instalacion_tipo, instalacion_pct,
                               imprevistos_pct, utilidad_pct },
                desarmado:   { ...igual forma... } },
    activo, created_at }
/distribuidores/{id}/sedes/{sedeId}/historial_condiciones/{id}
  { ...snapshot, vigente_desde, creado_por }    # auditoría, por sede

/campanas/{id}
  { nombre, descuento_pct, fecha_desde, fecha_hasta,
    segmentacion: { tipo: 'global'|'segmentada',
                    distribuidores: [ids]|null,
                    categorias: [ids]|null,
                    subcategorias: [ids]|null },
    activa, creado_por, created_at }

/usuarios/{uid}
  { nombre, email, rol, distribuidor_id (null si es Delben),
    sedes_asignadas: [sedeId],    # sedes a las que accede (ver §1 Sedes)
    todas_las_sedes: bool,        # si true, opera en todas las sedes del distribuidor
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
    sede_id,                                  # sede a la que pertenece (ver §1 Sedes)
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
- Aislamiento por sede: un usuario solo lee cotizaciones cuya `sede_id` esté en sus
  `sedes_asignadas` (o con `todas_las_sedes`). Comercial de sede A no ve la sede B.
- `distribuidor_comercial`: las reglas + el backend nunca le entregan campos de
  `capa_delben`. Separación real, no visual.
- `delben_facturacion`: ve `capa_delben` y órdenes de compra, no precios de venta.

---


# 4. FLUJO DE INTERFAZ

Cómo se ve y se usa el cotizador. Prioridad: equilibrio profesional sin
exagerar (B2B de uso diario). Base shadcn/ui sobria. Pulido fino al final.

---

## Principio

El **carrito es la pantalla principal**. No hay asistente de pasos largo. El
comercial ve su carrito limpio y agrega ítems con un botón que abre un buscador
en ventana (no una parrilla permanente que satura). Patrón de e-commerce que
el usuario ya conoce.

## Flujo del comercial

1. **Elige el cliente final** (o lo crea). Sus condiciones (país → moneda, IVA
   de la Capa Distribuidor) vienen heredadas de cómo lo configuró el
   distribuidor_admin. El comercial no decide eso.

2. **Datos del proyecto** (mínimos): nombre del proyecto + modalidad
   (tradicional/desarmado, **única para toda la cotización**).
   ⚠ El nombre del concepto "modalidad" y de sus 2 opciones está PENDIENTE de
   que el usuario lo defina (hoy provisional "Mueble armado/desarmado").

3. **Carrito** (pantalla principal): botón "+ Agregar módulo" abre el buscador.
   Busca por nombre → clic en el módulo → se abre la **ficha de configuración**.

## Ficha del módulo (el corazón)

Al hacer clic en un módulo se abre su ficha. Campos, en orden:

1. **Tipo de estructura** → 4 opciones de la lista de Excel:
   Melamina 15mm Blanca · Melamina 15mm Premium ·
   Melamina 18mm Blanca · Melamina 18mm Premium.
   El precio base ya cambia según esta elección (verificado en el Excel:
   p.ej. mismo módulo y fachada → 15mm Blanca $388.400 vs 15mm Premium
   $505.800). El sobreprecio Premium YA viene en el precio del Excel.
2. **Tipo de fachada** → define el precio base (junto con la estructura)
3. **Subcategoría** → define el ajuste de precio (de las que Delben creó para
   ese tipo de fachada; el comercial la selecciona, no se adivina)
4. **Acabado / color de fachada** → de los que Delben asignó a esa
   subcategoría (depende del tipo de fachada elegido)
5. **Acabado de estructura** → CONDICIONAL según el tipo de estructura:
   - Si eligió una opción **Blanca** (15 o 18mm) → estructura siempre
     blanca. NO se muestra selector (o aparece fijo en "Blanco").
   - Si eligió una opción **Premium** (15 o 18mm) → DEBE escoger un color
     de la lista de colores de Melamina. Aparece el selector.
   - Los colores de estructura premium son la MISMA lista de colores del
     tipo de fachada "Melamina" (base de trabajo confirmada; ajustar solo
     si surge un caso contrario).
   - Esto NO requiere cálculo extra: el sobreprecio premium ya está en el
     precio base del Excel. El motor NO se toca por esto.
6. Altura / profundidad / cantidad
7. **Color de vidrio + color de metal** → SOLO si tipo de fachada = "Aluminio
   Vidrio". En cualquier otro caso, ocultos.
8. Observaciones del comercial (para ese módulo)
9. **Herrajes de este módulo**: sección dentro de la misma ficha. Se agregan
   los herrajes que lleva ese mueble. Se eliminan si se elimina el módulo.
   (A futuro, el Manual de Diseño podrá sugerirlos automáticamente — la
   estructura ya queda preparada para eso.)

Patrón de interfaz: los campos 5 y 7 son CONDICIONALES (aparecen/desaparecen
según otra selección), igual de explícitos que la regla de vidrio/metal.

El **precio NO se muestra en la ficha**. Solo en el carrito.

## Carrito

- **Dos secciones en la misma pantalla**: "Módulos" arriba, "Herrajes sueltos"
  abajo (no asociados a ningún módulo).
- Cada módulo en el carrito es **desplegable**: muestra un contador de herrajes
  asociados y se expande para ver el detalle. Mantiene el carrito limpio.
- **Dos vistas por rol**: "cliente final" (precio de venta) y "costo Delben".
  El `distribuidor_comercial` solo ve la primera; nunca la de costo. Separación
  real en backend.
- Genera los **dos documentos**: orden de compra Delben y cotización cliente final.

## Prototipos de referencia

Hay 4 HTML de referencia visual (evolución del flujo). El vigente es el último:

- `Prototipo_Cotizador_Delben_v4_final.html` ← **este es el correcto**
  - Carrito como pantalla principal
  - Ficha con tipo fachada → subcategoría → acabado
  - Vidrio/metal solo en Aluminio Vidrio
  - Herrajes dentro de la ficha + secciones separadas en el carrito
  - Dos vistas por rol

Los v1, v2, v3 muestran la evolución y quedan como histórico. No son la
referencia. Úsalos solo para entender por qué se llegó al v4.

## Recomendación de método

El refinamiento visual fino (espaciado, color exacto, sensación de agilidad con
muchos módulos, microinteracciones) se hace iterando en Claude Code con la
pantalla en vivo, NO especificándolo más por documento. El v4 da la estructura
y el comportamiento correctos; el pulido es trabajo de implementación.

Antes de pulir, validar el v4 con un comercial real usándolo sin explicación.
Donde dude, ahí hay algo que ajustar en el flujo.

---


# 5. PLAN DE CONSTRUCCIÓN

Cómo construir, en qué orden, y qué queda pendiente. Método: rebanadas
verticales (caminos completos delgados y usables), NO capas horizontales.

---

## Por qué rebanadas y no capas

Una rebanada vertical = un camino completo de punta a punta que funciona de
verdad, aunque sea angosto. Lo opuesto (construir toda la BD, luego todo el
catálogo, luego todo el cálculo) deja sin nada usable hasta el final y el
proyecto muere por agotamiento. Con rebanadas tienes algo que un distribuidor
real puede tocar en pocas semanas.

## Rebanadas

### Rebanada 0 — Cimiento
Monorepo Turborepo + Next.js 15 + Firebase + Netlify. Motor de cálculo en
`packages/core` con sus tests pasando (caso 1.562.495 en verde). Auth Firebase
+ modelo de roles. Sin interfaz de negocio aún.
**Validación crítica aquí**: reemplazar los tests de ejemplo del motor por
5-10 cotizaciones reales de Delben. Si reproduce los números, seguir.

### Rebanada 1 — Camino mínimo punta a punta
Un distribuidor_comercial entra → su universo ya está configurado → cotiza UN
módulo (ficha completa) → lo ve en el carrito con su precio de venta → genera
el PDF de cotización cliente. Solo cocina, solo COP, sin campañas. Ya es usable
para feedback real con un comercial.

### Rebanada 2 — Ancho de catálogo
Importar catálogo completo desde DOS Excel separados, con DOS scripts
independientes:
  - Script de módulos: lee LISTA_DE_PRECIOS_TOTALES.xlsx → 1.628 módulos
    únicos, ~16.790 precios, 263 imágenes a Storage. (Especificación en
    docs/_referencia_codigo/importar_excel_ESPECIFICACION.js)
  - Script de herrajes: lee el Excel UNIFICADO de herrajes (columnas
    Código, PRODUCTO, TRADICIONAL, DESARMADO, Imagen) → crea la
    colección /accesorios con doble precio por modalidad. 447 herrajes en
    el de tradicional analizado; el unificado lo está armando el usuario.
    (Especificación completa en docs/15_IMPORTACION_HERRAJES.md)
Más: búsqueda por nombre, ficha completa con jerarquía tipo fachada →
subcategoría → acabado, los dos modelos de negocio.

### Rebanada 3 — Capa Delben completa
Servicios Delben, multi-moneda, IVA por país, segundo documento (orden de
compra). Vistas por rol (cliente/costo) con separación real en backend.

### Rebanada 4 — Multi-tenant real
Los 6 roles completos, aislamiento estricto entre distribuidores, panel
súper admin (distribuidores, tasa USD, jerarquía de acabados, servicios).

### Rebanada 5 — Configuración avanzada
Campañas, históricos de condiciones, accesorios/herrajes desde listas Delben,
universo del distribuidor configurable por el distribuidor_admin.

### Rebanada 6 — Pulido y producción
Security Rules exhaustivas, manejo de errores, performance, despliegue.

### Sofisticación (única aprobada): Dashboard Gerencial
Después de que las rebanadas estén estables. KPIs, cotizaciones por
distribuidor, pipeline, top productos, exportación.

## Regla de avance

No avanzar de rebanada sin que el dueño del proyecto confirme la anterior.
Cada rebanada termina con: tests pasando, TypeScript limpio, nada roto de
rebanadas previas.

## Pendientes (no bloquean Rebanada 0)

- [ ] 5-10 cotizaciones reales para validar el motor (lo más importante).
- [ ] Nombre del concepto "modalidad" y de sus 2 opciones.
- [ ] Logo vectorial + cotización de ejemplo (para diseñar los 2 PDF).
- [ ] Matiz: ¿delben_comercial ve precio de venta o solo costo Delben?
      (antes de Rebanada 4).
- [ ] ¿Cliente final ve precio único o desglose? (antes de diseñar el PDF).
- [ ] Numeración legal, validez por defecto, términos legales de los documentos.
- [x] ~~Terminar y verificar el Excel UNIFICADO de herrajes.~~ HECHO:
      447 herrajes verificados, códigos 1-447 sin duplicados/huecos,
      precios coherentes. 77 sin precio se cargan ocultos. Ver docs/15.
- [ ] Manual de Diseño: formato actual (para la idea futura de sugerir herrajes).
- [ ] Reunir las 263 imágenes en una carpeta.

## Ideas capturadas (no diseñadas a fondo, no se pierden)

- Manual de Diseño interactivo / visor en el portal.
- Sugerencia automática de herrajes por módulo (desde el Manual de Diseño).
- Switch de acumulación tradicional+desarmado.
- Histórico de pedidos por distribuidor.
- Material de marketing descargable para distribuidores.

Cuando surja una idea nueva durante la construcción: anótala aquí, NO la
construyas sobre la marcha. Primero termina lo definido.

## El riesgo real

No es técnico ni de definición (resueltos). Es **alcance y constancia**.
Disciplina de rebanadas + algo usable pronto en manos de un distribuidor real
= el proyecto sobrevive. Construirlo todo de una vez = no se termina nunca.

---


# 6. IMPORTACIÓN DE HERRAJES

Cómo entran los herrajes/accesorios al sistema. Proceso SEPARADO de la
importación de módulos. Modelo: UN solo Excel unificado con doble precio.

---

## Decisión final: Excel unificado (reemplaza el plan de dos archivos)

Tras analizar el Excel real de herrajes tradicional, se decidió un **único
Excel de herrajes** con esta estructura:

| Columna | Qué es | Reglas |
|---|---|---|
| **Código** | Identidad única e inmutable (era la columna "Orden") | Números actuales FIJOS. Nuevos = siguiente número libre. NUNCA reordenar ni reutilizar. |
| **PRODUCTO** | Nombre del herraje | Se conserva. Ya no se usa para match (hay código). |
| **TRADICIONAL** | Precio en línea tradicional | 0 o vacío = NO se vende en tradicional |
| **DESARMADO** | Precio en línea desarmado | 0 o vacío = NO se vende en desarmado |
| **Imagen** | Nombre del archivo de imagen | Como está (ej. 1.jpg, 2.png) |

Sin columna de categoría: el comercial encuentra los herrajes con el
buscador por nombre. No se justifica la carga de clasificar y mantener
categorías para 447+ herrajes si el buscador es suficiente.

### Compromiso del código (CRÍTICO)

El usuario se comprometió a que el código (ex-"Orden") es **inmutable**:
los números actuales no cambian, los herrajes nuevos reciben el siguiente
número libre, nunca se reordena ni se reutiliza un número. Si un herraje se
descontinúa, su código queda retirado pero NO se reasigna a otro.

Razón: las cotizaciones guardan "herraje código N". Si el código cambiara,
las cotizaciones viejas apuntarían a otro herraje y se corromperían. El
orden de visualización en pantalla, si se necesita, se maneja en el sistema
(panel admin), NO reasignando códigos.

## Datos reales del Excel analizado (herrajes tradicional)

- Hoja única "HERRAJES " (con espacio al final — el script debe normalizar
  nombres de hoja o contemplarlo).
- 447 herrajes, todos con PRODUCTO. Sin duplicados de nombre.
- Columnas originales: PRODUCTO, PVP, Orden, Imagen.
- 366 con precio > 0; 81 con precio = 0.
- 446 con imagen (mayoría .png, algunos .jpg, 1 .jpeg); 1 sin imagen.
- Nombres con inconsistencias de mayúsculas/tildes ("CAJON"/"Cajón"/"CAJÓN")
  → normalizar para mostrar consistente, sin perder el original.
- NO había columna de código → se resuelve renombrando "Orden" a "Código".

El Excel entregado es solo el de tradicional. El usuario está construyendo
el unificado: agrega columnas DESARMADO y Código (ex-Orden). Sin categoría.

## Reglas de negocio confirmadas

- **Precio 0 o vacío en una modalidad = el herraje NO se vende en esa
  modalidad.** El motor no lo ofrece cuando la cotización es de esa
  modalidad. Esto REEMPLAZA, para herrajes, la idea anterior de "precio
  pendiente / cotización incompleta": ya no aplica. Es simplemente
  "no disponible en esa modalidad".
- Un herraje puede venderse solo en tradicional, solo en desarmado, o en
  ambas (según dónde tenga precio > 0).
- El comercial encuentra los herrajes por **búsqueda por nombre** (sin
  categorías ni filtros: información innecesaria para este caso).
- Descuento: 10% en desarmado (ver tabla en docs/10_MODELO_NEGOCIO.md). En
  tradicional, el % de herrajes es el pactado por distribuidor.

## En el sistema, los herrajes se usan así

- Dentro de la **ficha de un módulo** (herrajes asociados; se eliminan si se
  elimina el módulo).
- O como **herrajes sueltos** (no asociados a módulo) en su sección aparte
  del carrito.
- Al cotizar, el motor toma el precio del herraje según la modalidad de la
  cotización (`precio_tradicional_cop` o `precio_desarmado_cop`). No cambia
  la lógica del motor.

## Mapeo Excel unificado → /accesorios

```
/accesorios/{id}              # id = código del herraje (inmutable)
  { codigo,                   # columna Código (ex-Orden)
    nombre,                   # columna PRODUCTO (normalizado)
    precio_tradicional_cop,   # columna TRADICIONAL (0/vacío → null)
    precio_desarmado_cop,     # columna DESARMADO (0/vacío → null)
    imagen_url,               # columna Imagen, resuelta a Storage
    disponible_tradicional,   # derivado: precio_tradicional_cop > 0
    disponible_desarmado,     # derivado: precio_desarmado_cop > 0
    activo }
```

## Especificación del script de importación de herrajes

- UN solo script (un solo Excel). Separado del de módulos.
- ID del documento = código del herraje (determinista → idempotente:
  reimportar actualiza, no duplica).
- Normalizar nombres (trim, colapsar espacios, consistencia de mayúsculas
  para mostrar, conservando el original).
- Derivar `disponible_tradicional` / `disponible_desarmado` del precio > 0.
- Subir imágenes de herrajes a Storage (mismo enfoque que módulos:
  optimizar, reportar las que no hagan match).
- Soportar `--dry-run`.
- Reportar: herrajes con ambos precios en 0 (no se vende en ninguna
  modalidad → revisar si es error), imágenes faltantes, filas sin código.

## ✅ Verificación del Excel unificado — COMPLETADA

El Excel unificado fue entregado y verificado a fondo. Resultado:

**Correcto (listo para producción):**
- 447 herrajes. Columnas: CODIGO, PRODUCTO, TRADICIONAL, DESARMADO, Imagen.
- Códigos del 1 al 447: sin duplicados, sin huecos, todos numéricos.
  Los nuevos herrajes serán 448+ (compromiso de inmutabilidad).
- 446 con imagen, 1 sin imagen.
- Extensiones imagen: 392 .png, 53 .jpg, 1 .jpeg.
- Coherencia de precios: el precio DESARMADO siempre es menor que el
  TRADICIONAL (entre 79% y 90%, promedio ~83%). Cero casos anómalos
  (ninguno con desarmado ≥ tradicional). Señal de carga correcta.

**Disponibilidad por modalidad:**
- Solo en tradicional: 2 herrajes.
- Solo en desarmado: 4 herrajes.
- En ambas: 364 herrajes.
- Sin precio en ninguna (ocultos): 77 herrajes.

**Los 77 sin precio — REGLA DEFINIDA:**
Son productos premium reales (Aventos, Legrabox, Magic Corner/Pegasus,
sistemas deslizantes, cajones AvanTech, etc.). Algunos están sin precio a
propósito (códigos 135 y 136 dicen literalmente "( NO DISPONIBLE )" en su
nombre); otros probablemente solo les falta cargar precio. No se decide
caso por caso ahora; el sistema lo maneja así:

- El importador los **CARGA** (no los omite), con
  `disponible_tradicional=false` y `disponible_desarmado=false`.
- Quedan **ocultos**: no aparecen en el buscador del comercial, no se
  pueden cotizar.
- Su **código queda apartado** desde el día uno (protege el compromiso de
  código inmutable: si se omitieran y entraran después, se arriesgaría el
  orden de los códigos).
- Cuando Delben les cargue precio en el Excel y se reimporte, se vuelven
  visibles automáticamente, sin tocar código.
- El importador genera un **reporte de estos 77** para que Delben los
  revise (ponerles precio a los que sí se venden, dejar inactivos los que
  de verdad no).

Esto es coherente con la regla general (precio 0/vacío = no disponible en
esa modalidad) y con la eliminación lógica de herrajes (nunca borrado
físico, nunca reutilizar código).

## Especificación del script — actualizada con la verificación

- UN script, un Excel. ID del documento = código del herraje.
- Cargar TODOS los 447 (incluidos los 77 sin precio, como inactivos).
- Derivar `disponible_tradicional`/`disponible_desarmado` (precio > 0).
- Normalizar nombres conservando el original.
- Subir imágenes a Storage; reportar la que falta (1).
- Idempotente (reimportar actualiza por código, no duplica).
- `--dry-run` y reporte de: los 77 sin precio, imagen faltante, cualquier
  fila futura sin código.

---
