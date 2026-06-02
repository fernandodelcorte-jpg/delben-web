# Catálogo de precios — verificación de seguridad (C2)

El catálogo cumple la **regla de oro #2** (separación real en backend): el precio con
descuento se calcula en el servidor (`/api/catalogo`) y **solo se adjunta a la respuesta
para roles con acceso a costo**. Para `distribuidor_comercial` el campo no existe en el
JSON — no viaja al navegador. "No se ve en pantalla" NO es la prueba; la prueba es
inspeccionar la respuesta de red.

## Cómo se garantiza (no en el render)

- El cliente solo manda su **ID token** de Firebase (`Authorization: Bearer …`).
- El route handler [`/api/catalogo`](../../apps/portal/src/app/api/catalogo/route.ts):
  1. `adminAuth().verifyIdToken(token)` → uid (no se confía en ningún `rol` del cliente).
  2. Lee `rol` y `distribuidor_id` de `usuarios/{uid}` con el Admin SDK (fuente de verdad).
  3. `verCosto = puedeVerCostoDelben(rol)`.
  4. Adjunta `precioConDescuento`/`descuentoPct` **solo si `verCosto`**. Para el comercial
     esos campos nunca se asignan al objeto → no están en el JSON.
- No es falsificable: no hay parámetro de rol; el rol sale del token verificado.
- **Quién entra:** roles de distribuidor (sobre su propio tenant) y roles de Delben
  (eligen distribuidor vía `?distribuidorId=`). Aislamiento intacto: para un rol de
  distribuidor el servidor **ignora** el `distribuidorId` del cliente y usa el suyo;
  solo los roles de Delben pueden consultar otro distribuidor. `verCosto` no cambió
  (Delben y distribuidor_admin/costos ven costo; comercial no).

## Verificación manual (DevTools)

1. Inicia sesión como un **distribuidor_comercial** con una sede habilitada asignada.
2. Abre `/catalogo`, elige sede + modalidad.
3. DevTools → **Network** → request `GET /api/catalogo?sedeId=…&modalidad=…`.
4. Pestaña **Response/Preview**, revisa el JSON:
   - `puedeVerCosto: false`.
   - cada objeto de `items` tiene **solo** `precioLista` (y datos de producto). **No** debe
     aparecer `precioConDescuento` ni `descuentoPct`.
5. Contraste: inicia sesión como **distribuidor_costos** o **distribuidor_admin** y repite:
   `puedeVerCosto: true` y los ítems sí traen `precioConDescuento`.

## Verificación con script

Con el dev server corriendo (`npm run dev` en `apps/portal`):

```bash
BASE_URL=http://localhost:3000 \
ID_TOKEN_COMERCIAL=<token del comercial> \
SEDE_ID=<sede habilitada del comercial> \
MODALIDAD=desarmado \
node tests/catalogo/check-comercial.mjs
```

El token se copia del header `Authorization` de la petición `/api/catalogo` en DevTools
(o `await firebase.auth().currentUser.getIdToken()` en la consola). El script falla
(exit ≠0) si algún ítem trae `precioConDescuento`/`descuentoPct` para el comercial.
Opcional: `ID_TOKEN_COSTOS=<token>` para confirmar el contraste.

## Requisito de entorno

`/api/catalogo` necesita el **Firebase Admin SDK** con un service account en
`apps/portal/.env.local`:

```
FIREBASE_PROJECT_ID=delben---web
FIREBASE_CLIENT_EMAIL=<…>@<…>.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n"
```

(Las llaves ya existen vacías en `.env.local`; pega el service account de Firebase
Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.)
Sin estas credenciales el endpoint responde 500 y el catálogo no carga.

## Límite conocido (no empeora §10.1)

El catálogo aplica **solo lista − descuento principal**; NO expone servicios ni gestión
comercial (los márgenes Delben confidenciales de §10.1). El número con descuento no se
envía al comercial. Matiz: los porcentajes de descuento (`sede.descuento_*`,
`categoria.desc_desarmado_base_pct`) hoy son legibles por el comercial vía las reglas de
Firestore (el cotizador los usa), así que en teoría podría recalcular lista − descuento.
Cerrar eso exigiría tocar reglas/datos; se deja como deuda de §10.1, sin empeorarla.
