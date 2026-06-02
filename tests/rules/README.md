# Pruebas de Firestore Security Rules

Prueban el **aislamiento por sede** (regla de oro #2: seguridad real en backend) contra
el emulador de Firestore. No se despliegan reglas sin que estas pruebas estén en verde.

Proyecto **aislado a propósito** del monorepo (no es un workspace `apps/*`/`packages/*`):
tiene su propio `node_modules` para no chocar con `firebase@10` del portal.

## Requisitos: Java (Temurin 17)

El emulador de Firestore necesita un JRE. En esta máquina (macOS 12, Intel) Homebrew
no tiene bottle de `openjdk` y lo compila desde fuente (lento y frágil), así que usamos
un **Temurin 17 prebuilt** descargado localmente (no toca el sistema; queda en
`tests/rules/.jdk/`, ignorado por git).

```bash
# Desde la raíz del repo. Descarga e instala Temurin 17 (macOS x64) en tests/rules/.jdk/
cd tests/rules
mkdir -p .jdk
curl -fsSL -o jdk.tar.gz "https://api.adoptium.net/v3/binary/latest/17/ga/mac/x64/jdk/hotspot/normal/eclipse"
tar -xzf jdk.tar.gz -C .jdk
cd ../..
```

Esto crea `tests/rules/.jdk/jdk-17.0.19+10/` (la versión exacta puede variar; ajusta la
ruta de `JAVA_HOME` abajo a la carpeta que quede).

## Instalar dependencias de prueba (una vez)

```bash
cd tests/rules && npm install && cd ../..
```

## Correr las pruebas

Desde la **raíz del repo** (ahí vive `firebase.json` con la ruta de `firestore.rules`):

```bash
export JAVA_HOME="$(pwd)/tests/rules/.jdk/jdk-17.0.19+10/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
tests/rules/node_modules/.bin/firebase emulators:exec --only firestore --project demo-delben \
  "node tests/rules/run.mjs"
```

El emulador arranca, corre [`run.mjs`](./run.mjs) y se apaga solo. Cada caso imprime
✅/❌ y el proceso sale con código ≠0 si algún caso falla (un rojo aquí = hueco de
seguridad real: se arregla la **regla**, no la prueba).

## Qué cubre `run.mjs`

12 casos: creación/edición de sede por super_admin; distribuidor_admin acotado al
universo; lectura por sede de cotizaciones (sede A sí / sede B no — caso crítico);
`list` con y sin filtro `where('sede_id','in',[…])`; admin que ve todas las sedes;
aislamiento entre distribuidores.
