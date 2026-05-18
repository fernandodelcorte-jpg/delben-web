# 13 · Flujo de Interfaz

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

1. Tipo de estructura
2. **Tipo de fachada** → define el precio base
3. **Subcategoría** → define el ajuste de precio (de las que Delben creó para
   ese tipo de fachada; el comercial la selecciona, no se adivina)
4. **Acabado / color** → de los que Delben asignó a esa subcategoría
5. Acabado de estructura
6. Altura / profundidad / cantidad
7. **Color de vidrio + color de metal** → SOLO si tipo de fachada = "Aluminio
   Vidrio". En cualquier otro caso, ocultos.
8. Observaciones del comercial (para ese módulo)
9. **Herrajes de este módulo**: sección dentro de la misma ficha. Se agregan
   los herrajes que lleva ese mueble. Se eliminan si se elimina el módulo.
   (A futuro, el Manual de Diseño podrá sugerirlos automáticamente — la
   estructura ya queda preparada para eso.)

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
