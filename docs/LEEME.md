# LÉEME — Plataforma Delben

Paquete de documentación consolidado. Antes había 14 archivos sueltos y
generaba confusión. Ahora son **solo 3 cosas que importan**:

```
delben-web/                         (tu repositorio, ya existe)
│
├── CLAUDE.md                       ← REGLAS. Va en la raíz del repo.
│                                     Claude Code lo lee solo en cada sesión.
│
└── docs/
    ├── DISENO_SISTEMA.md           ← EL DISEÑO completo (negocio, motor,
    │                                 datos, interfaz, plan, herrajes).
    │                                 Todo en un solo documento.
    │
    ├── ESTADO_ACTUAL.md            ← DÓNDE VA LA OBRA hoy. Qué está
    │                                 construido, qué falta. Se actualiza
    │                                 al cerrar cada rebanada.
    │
    └── _referencia_codigo/         ← El motor validado + especificación
        prototipos/                   importador + prototipo visual.
```

## Las 3 cosas, explicadas simple

1. **CLAUDE.md** = las reglas que Claude Code nunca debe romper (stack, no
   tocar el motor, seguridad por rol, estilo de trabajo). Va en la raíz.

2. **docs/DISENO_SISTEMA.md** = todo lo que el sistema DEBE ser. Es la
   visión completa. Se consulta cuando se necesita, no se lee entero cada
   vez. Tiene 6 secciones numeradas (negocio, motor, datos, interfaz,
   plan, herrajes).

3. **docs/ESTADO_ACTUAL.md** = dónde estás HOY en la construcción. Esto es
   lo que Claude Code lee PRIMERO al empezar una sesión, para saber en qué
   punto va sin releer todo el diseño.

## Cómo reemplazar lo viejo (UNA sola operación)

Para acabar con el enredo de versiones mezcladas, haz esto UNA vez:

1. En tu repo `delben-web`, **borra la carpeta `docs/` completa** y el
   `CLAUDE.md` viejo de la raíz.
2. Copia el `CLAUDE.md` de este paquete a la raíz del repo.
3. Copia la carpeta `docs/` de este paquete completa al repo.
4. Commit: `docs: consolidación de documentación en paquete único`.

No toques nada de `apps/`, `packages/`, ni el resto del código. Eso
funciona y no se reemplaza. Solo cambian los documentos.

## Cómo trabajar con Claude Code de ahora en adelante

**Al empezar una sesión nueva:**
> "Lee docs/ESTADO_ACTUAL.md para saber dónde vamos. No construyas nada
> hasta que te lo pida."

**Para una tarea concreta:** además dile qué sección del diseño aplica,
ej: *"Para esto usa la sección 3 (datos) y 6 (herrajes) de
docs/DISENO_SISTEMA.md"*.

**Al cerrar una rebanada:** pídele que actualice docs/ESTADO_ACTUAL.md
con lo nuevo, y verifica tú mismo en el repo los puntos críticos
(que el motor siga intacto, que la seguridad por rol esté bien).

## El estado real del proyecto (para tu tranquilidad)

- El diseño está cerrado y validado. No falta definir nada.
- El motor de cálculo está validado numéricamente.
- Los datos (módulos y herrajes) están analizados y verificados.
- La Rebanada 0 está construida y funciona (monorepo, motor, login,
  dashboard), siguiendo el diseño.
- **Pendiente crítico**: validar el motor con 5-10 cotizaciones reales
  de Delben antes de iniciar la Rebanada 1. Está en ESTADO_ACTUAL.md.

No hay nada roto. No hace falta empezar de cero. Solo estaba desordenada
la documentación, y eso ya quedó resuelto con este paquete.
