# 10 · Modelo de Negocio

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
por módulo). Mismo precio base (de la lista de Excel); distinta lógica de descuento.

| | Tradicional (armado) | Desarmado (despiezado) |
|---|---|---|
| Producto | Ensamblado, listo para instalar | Despiezado, cantos aplicados, embalado |
| Herrajes | NO incluidos | NO incluidos |
| Descuento | Pactado por distribuidor, dividido: % muebles y % herrajes | Fijo por categoría, igual para todos |
| Alcance | Todo el catálogo | Todo el catálogo |

Común: herrajes nunca incluidos (el comercial los agrega). Entrega en puerta de
fábrica. Acumulación tradicional+desarmado: hoy NO; switch parametrizable a futuro.

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
