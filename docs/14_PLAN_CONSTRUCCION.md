# 14 · Plan de Construcción

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
Importar catálogo completo (1.628 módulos, 263 imágenes a Storage), búsqueda
por nombre, ficha completa con jerarquía tipo fachada → subcategoría → acabado,
los dos modelos de negocio.

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
