# Qué hacer ahora

Pasos concretos para pasar de diseño a construcción. La fase de definición
terminó; esto es ejecución.

---

## Antes de escribir código (tareas tuyas, no técnicas)

Ninguna bloquea empezar la Rebanada 0, pero conviene resolverlas pronto:

1. **Conseguir 5-10 cotizaciones reales** que Delben ya haya hecho a mano, con
   sus números finales conocidos. Son los casos de prueba REALES del motor.
   Esto es lo más importante de todo. (Detalle en `docs/11_MOTOR_CALCULO.md`.)

2. **Definir el nombre de la "modalidad"** y de sus 2 opciones. Hoy es
   provisional "Mueble armado / Mueble desarmado" y no te convencía. Es solo
   texto de interfaz, no afecta el motor, pero hay que decidirlo.

3. **Conseguir el logo** (vectorial: SVG/AI/EPS) y **una cotización de ejemplo**
   actual de Delben, para diseñar los dos PDF (orden de compra y cotización
   cliente final).

4. **Resolver con tu equipo** (no me necesitas para esto):
   - Numeración legal de órdenes de compra y cotizaciones (consecutivo).
   - Días de validez por defecto de una cotización.
   - Términos legales para el pie de cada documento.
   - Matiz: ¿el rol `delben_comercial` ve el precio de venta al cliente final
     o solo el costo Delben? (resolver antes de la rebanada multi-tenant).

5. **Reunir las 263 imágenes** de módulos en una carpeta (ya sabes que son 263,
   no 1.628; los nombres coinciden con la columna IMAGEN del Excel).

## Para empezar a construir

1. **Crea cuentas/proyectos**: Firebase (Firestore + Auth + Storage), Netlify,
   repositorio en GitHub.

2. **Prepara el repo**:
   - Copia `CLAUDE.md` a la raíz del repositorio.
   - Ten a mano `docs/` y `codigo/`.

3. **Abre Claude Code** en el repo. Como `CLAUDE.md` está en la raíz, Claude
   Code lo lee solo. Para arrancar, dale además `docs/14_PLAN_CONSTRUCCION.md`
   y pídele explícitamente: *"Construye la Rebanada 0 según el plan. No avances
   a la siguiente sin que yo confirme."*

4. **Rebanada 0** (cimiento): monorepo Turborepo + Next.js + Firebase + Netlify,
   motor de cálculo en `packages/core` con sus tests pasando, auth y roles.
   Sin interfaz de negocio todavía.

5. **Validación crítica**: apenas el motor esté en `packages/core`, reemplaza
   los casos de prueba de ejemplo por las cotizaciones reales (paso 1 de
   arriba). Si el motor reproduce los números reales de Delben, tienes certeza
   matemática de que está bien. Si no, encontramos la regla faltante ANTES de
   construir lo demás.

6. **Sigue rebanada por rebanada** según `docs/14_PLAN_CONSTRUCCION.md`. No
   construyas todo de una vez. Cada rebanada debe ser usable de punta a punta.

## Validación con usuarios reales

- **Prototipos**: ya tienes 4 HTML de referencia visual. El último
  (`v4_final`) refleja el flujo correcto: carrito como pantalla principal,
  ficha de módulo con subcategoría y herrajes, secciones separadas.
- **Pruébalo con un comercial real** de un distribuidor: que lo use sin que le
  expliques nada. Anota dónde duda. Ese feedback vale más que cualquier
  ronda de ajustes teóricos.

## El riesgo real del proyecto

No es técnico ni de definición (ambos están resueltos). Es de **alcance y
constancia**. El sistema es grande. La única forma de que llegue a producción
es construir en rebanadas delgadas y usables, resistir la tentación de
hacerlo todo de una vez, y tener algo real en manos de un distribuidor pronto.

Las ideas nuevas que surjan: anótalas en la sección "Ideas capturadas" de
`docs/14_PLAN_CONSTRUCCION.md`. No las construyas sobre la marcha. Primero
termina lo definido.
