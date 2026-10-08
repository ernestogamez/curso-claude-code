---
name: new-feature
description: Recibe el número de una issue de GitHub, la lee con gh, crea un git worktree aislado, redacta un plan por tareas pequeñas en docs/plans, lo publica como comentario de la issue, y avisa por Slack (canal planes-generales). Solo planifica, no implementa: la implementación la hace la skill implement-issue. Úsala cuando se pida planificar una issue.
---

# new-feature

Issue a planificar: $ARGUMENTS

**Esta skill solo planifica. No escribe código de producción ni tests**: la implementación (TDD, commits) la realiza la skill `implement-issue` a partir del plan publicado en la issue.

`$ARGUMENTS` debe ser el **número de la issue** del repositorio (por ejemplo `42` o `#42`). Si está vacío o no es un número, pide el número al usuario antes de continuar.

## 0. Leer la issue

1. Comprueba que `gh` está disponible y autenticado (`gh auth status`). Si no, díselo al usuario y detente.
2. Lee la issue: `gh issue view <numero> --json number,title,body,labels,state,comments,url`.
   - Si no existe o está cerrada, avisa al usuario y pregunta si continúa.
3. Usa el título, el cuerpo, las etiquetas y los comentarios como fuente de la tarea: de ahí salen el `<tipo>`, la `<descripcion>`, el objetivo y los criterios de aceptación. No inventes requisitos que no estén en la issue; las dudas van a «Riesgos y preguntas abiertas».

## Reglas generales

- **El plan se guarda dentro del worktree** creado en el paso 1 (rutas absolutas o `git -C`/`cd` al worktree). Nunca edites ficheros en el checkout principal.
- No modifiques código ni tests: lo único que se crea es el fichero del plan.
- El plan, los mensajes de Slack y los mensajes al usuario, en español.
- No hagas commit ni push salvo que el usuario lo pida (para commits está la skill `commit`).

## 1. Crear el worktree

1. Deduce el `<tipo>` de la issue (etiquetas y contenido): `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, etc. (tipos de Conventional Commits).
2. Deduce una `<descripcion>` corta en kebab-case a partir del título (por ejemplo `anadir-filtro-por-canal`), sin tildes ni espacios.
3. Rama: `<tipo>/<descripcion>`. Directorio del worktree: `.claude/worktrees/<tipo>-<descripcion>` (ya está en `.gitignore`).
4. Elige la rama base: `development` si existe (`git rev-parse --verify --quiet development` o `origin/development`); si no, `master`.
5. Comprueba que la base tiene al menos un commit (`git rev-parse --verify --quiet <base>`). Si no, avisa al usuario: un worktree necesita un commit inicial y no lo crees tú sin su permiso.
6. Crea el worktree: `git worktree add -b <tipo>/<descripcion> .claude/worktrees/<tipo>-<descripcion> <base>`.
   - Si la rama o el directorio ya existen, avisa al usuario en lugar de sobrescribirlos.
   - Los cambios sin commitear del checkout principal no pasan al worktree; no los descartes ni los muevas.

## 2. Crear el plan

Antes de escribir, lee `CLAUDE.md`, la documentación relevante de `docs/` y explora el código afectado para que las tareas sean realistas. Consulta `docs/revisiones/inconsistencias-*.md` antes de "arreglar" algo que parezca raro.

Guarda el plan en `<worktree>/docs/plans/<tipo>-<descripcion>.md` (crea la carpeta si no existe) con la estructura de `assets/TEMPLATE.md`. Incluye en la cabecera el enlace a la issue (`#<numero>`).

Reglas para las tareas:

- Cada tarea debe poder implementarse en **5-10 minutos como máximo**. Si es más grande, divídela.
- Cada tarea describe un único cambio verificable, indicando el test que lo cubre y los ficheros que toca.
- Ordénalas para que el proyecto funcione tras cada una.
- Respeta la arquitectura del paquete afectado (hexagonal en `contexts/employee`; por capas `routes` → `controllers` → `services` → `repositories` en el resto) y las convenciones de `CLAUDE.md`.
- Solo la API tiene tests (vitest). Si el cambio afecta a un frontend, la lógica testeable debe vivir en la API o el plan debe decir explícitamente cómo se verifica.

### Comentario en la issue

Nada más guardar el plan, publícalo como comentario de la issue con el contenido completo del fichero:

`gh issue comment <numero> --body-file <worktree>/docs/plans/<tipo>-<descripcion>.md`

- Si falla (permisos, issue bloqueada...), díselo al usuario y continúa; no inventes que se ha publicado.
- Guarda la URL del comentario que devuelve `gh` para citarla en los avisos y en el resumen.

### Aviso por Slack (plan)

Después, avisa en el canal **`planes-generales`** con las herramientas del MCP `slack`:

1. Obtén el ID del canal con `slack_list_channels` (busca el de nombre `planes-generales`; si hay más de una página, usa el cursor).
2. Publica con `slack_post_message` un mensaje en español con: issue (`#<numero>` y título), rama, ruta del plan, enlace al comentario, nº de tareas y el objetivo en una frase. Ejemplo:
   `📝 Plan listo: #<numero> <título> · rama <tipo>/<descripcion> · <N> tareas · docs/plans/<fichero>.md · <url del comentario> — <objetivo>`
   Termina siempre el mensaje con la firma `-- Ernesto` en una línea aparte.
3. Si el canal no existe o las herramientas de Slack no están disponibles (faltan `BOT_SLACK_TOKEN`/`TEAMID_SLACK`), dilo al usuario y continúa; no inventes que se ha enviado.

Después muestra el plan al usuario. No lo implementes: para ello, el usuario invocará `implement-issue <numero>`.

## 3. Cierre

Resume al usuario: issue, rama, ruta del worktree y del plan, nº de tareas y enlace al comentario. Indícale que, para implementarlo, use la skill `implement-issue <numero>`. No hagas commit, push ni borres el worktree salvo que lo pida.
