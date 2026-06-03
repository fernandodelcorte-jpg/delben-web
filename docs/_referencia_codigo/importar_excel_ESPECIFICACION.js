/**
 * ============================================================
 * IMPORTACIÓN DEL CATÁLOGO — NOTA DE DISEÑO (no es código final)
 * ============================================================
 *
 * El script de importación NO se entrega como código terminado a
 * propósito. Debe generarse con Claude Code durante la Rebanada 2,
 * contra el modelo de datos definitivo (ver docs/12_DATOS_FIRESTORE.md),
 * porque la jerarquía de acabados de 3 niveles (tipo_fachada →
 * subcategoria → acabado) la define Delben en el panel súper admin,
 * NO se infiere automáticamente del Excel.
 *
 * Lo que el script debe hacer (especificación):
 *
 * FUENTE: LISTA_DE_PRECIOS_TOTALES.xlsx, hoja "Hoja1".
 *   ~16.790 filas válidas (con CODIGO numérico).
 *   Filtrar filas sin CODIGO.
 *
 * DATOS CONFIRMADOS DEL ANÁLISIS DEL EXCEL:
 *   - 1.628 módulos únicos (clave: categoría + nombre + alto + profundidad).
 *   - Por módulo: 4 tipos de estructura × 4-5 tipos de fachada = variantes.
 *   - Precio = estructura interna + fachada (ya viene calculado por fila).
 *   - 263 imágenes únicas (NO 1.628; se reutilizan entre variantes).
 *     La columna IMAGEN ya trae el nombre del archivo y coincide con
 *     los archivos físicos. 16.787/16.790 con imagen; 3 sin imagen,
 *     4 sin extensión (casos a manejar con placeholder + reporte).
 *   - Tipos de fachada exactos en la lista: MELAMINA, PINTURA SATINADA,
 *     LAMINADO ACRILICO PVC O PET, PINTURA ALTO BRILLO, ALUMINIO VIDRIO,
 *     (NO INCLUYE ACCESORIO = casos especiales, 8 filas).
 *   - Nombres de módulo con espacios inconsistentes al final → normalizar
 *     (trim + colapsar espacios + MAYÚSCULAS) antes de deduplicar.
 *
 * DESTINO (ver docs/12_DATOS_FIRESTORE.md):
 *   /categorias            ← desde columna CATEGORIA
 *   /tipos_estructura      ← desde columna TIPO ESTRUCTURA
 *   /tipos_fachada         ← desde columna TIPO FACHADA (nivel 1)
 *   /modulos               ← 1.628 deduplicados
 *   /modulos/{id}/precios  ← una por combinación estructura×fachada
 *
 *   NO crear /subcategorias ni /acabados automáticamente: esos los
 *   crea Delben manualmente en el panel súper admin (la subcategoría
 *   define el ajuste de precio y a qué acabados aplica). El importador
 *   solo deja los tipos de fachada; las subcategorías son trabajo de
 *   configuración posterior, no de importación.
 *
 * IMÁGENES:
 *   Subir las 263 imágenes únicas a Firebase Storage una sola vez.
 *   Optimizar (redimensionar ~800px, WebP) al subir.
 *   Cada módulo guarda imagen_url resolviendo el nombre de la columna
 *   IMAGEN. Reportar los que no hagan match (los 3 + 4 + typos).
 *
 * IDEMPOTENCIA (obligatoria):
 *   IDs deterministas (slug de los datos, no autogenerados) para que
 *   correr el script dos veces actualice en vez de duplicar. Esto
 *   permite actualizar precios masivamente reimportando el Excel.
 *
 * EJECUCIÓN:
 *   Soportar --dry-run que reporta qué haría sin escribir nada.
 *   Batches de máx 400-500 operaciones (límite de Firestore).
 *   firebase-admin + xlsx.
 *
 * ============================================================
 * Cuando llegues a la Rebanada 2, pide a Claude Code que genere este
 * script siguiendo esta especificación y el modelo de datos. No uses
 * versiones viejas que circulen en carpetas de salida anteriores:
 * usaban un modelo de "colores" plano que ya NO es el vigente.
 * ============================================================
 */
