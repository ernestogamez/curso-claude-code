---
name: new-feature
description: Crea un git worktree aislado, redacta un plan por tareas pequeñas en docs/plans, avisa por Slack (canal planes-generales), lo implementa con TDD estricto y vuelve a avisar por Slack. Úsala cuando se pida una nueva funcionalidad, corrección o refactor.
---

# new-feature

Tarea a resolver: $ARGUMENTS

Si `$ARGUMENTS` está vacío o es ambiguo, pregunta al usuario qué quiere hacer antes de continuar.

## Reglas generales

- **Todos los cambios se hacen dentro del worktree** creado en el paso 1 (rutas absolutas o `git -C`/`cd` al worktree). Nunca edites ficheros en el checkout principal, ni el plan ni el código.
- El código y los tests se escriben en inglés; el plan, los mensajes de Slack y los mensajes al usuario, en español.
- No hagas commit ni push salvo que el usuario lo pida (para commits está la skill `commit`).

## 1. Crear el worktree

1. Deduce el `<tipo>` de la tarea: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, etc. (tipos de Conventional Commits).
2. Deduce una `<descripcion>` corta en kebab-case (por ejemplo `anadir-filtro-por-canal`), sin tildes ni espacios.
3. Rama: `<tipo>/<descripcion>`. Directorio del worktree: `.claude/worktrees/<tipo>-<descripcion>` (ya está en `.gitignore`).
4. Elige la rama base: `development` si existe (`git rev-parse --verify --quiet development` o `origin/development`); si no, `master`.
5. Comprueba que la base tiene al menos un commit (`git rev-parse --verify --quiet <base>`). Si no, avisa al usuario: un worktree necesita un commit inicial y no lo crees tú sin su permiso.
6. Crea el worktree: `git worktree add -b <tipo>/<descripcion> .claude/worktrees/<tipo>-<descripcion> <base>`.
   - Si la rama o el directorio ya existen, avisa al usuario en lugar de sobrescribirlos.
   - Los cambios sin commitear del checkout principal no pasan al worktree; no los descartes ni los muevas.
7. Instala dependencias en el worktree: `npm install` (desde su raíz).
8. Comprueba la línea base: `npm test` en el worktree debe estar en verde antes de empezar. Si falla, díselo al usuario.

## 2. Crear el plan

Antes de escribir, lee `CLAUDE.md`, la documentación relevante de `docs/` y explora el código afectado para que las tareas sean realistas. Consulta `docs/revisiones/inconsistencias-*.md` antes de "arreglar" algo que parezca raro.

Guarda el plan en `<worktree>/docs/plans/<tipo>-<descripcion>.md` (crea la carpeta si no existe) con la estructura de `assets/TEMPLATE.md`.

Reglas para las tareas:

- Cada tarea debe poder implementarse en **5-10 minutos como máximo**. Si es más grande, divídela.
- Cada tarea describe un único cambio verificable, indicando el test que lo cubre y los ficheros que toca.
- Ordénalas para que el proyecto funcione tras cada una.
- Respeta la arquitectura del paquete afectado (hexagonal en `contexts/employee`; por capas `routes` → `controllers` → `services` → `repositories` en el resto) y las convenciones de `CLAUDE.md`.
- Solo la API tiene tests (vitest). Si el cambio afecta a un frontend, la lógica testeable debe vivir en la API o el plan debe decir explícitamente cómo se verifica.

### Aviso por Slack (plan)

Nada más guardar el plan, avisa en el canal **`planes-generales`** con las herramientas del MCP `slack`:

1. Obtén el ID del canal con `slack_list_channels` (busca el de nombre `planes-generales`; si hay más de una página, usa el cursor).
2. Publica con `slack_post_message` un mensaje en español con: título de la tarea, rama, ruta del plan, nº de tareas y el objetivo en una frase. Ejemplo:
   `📝 Plan listo: <título> · rama <tipo>/<descripcion> · <N> tareas · docs/plans/<fichero>.md — <objetivo>`
   Termina siempre el mensaje con la firma `-- Ernesto` en una línea aparte.
3. Si el canal no existe o las herramientas de Slack no están disponibles (faltan `BOT_SLACK_TOKEN`/`TEAMID_SLACK`), dilo al usuario y continúa; no inventes que se ha enviado.

Después muestra el plan al usuario y **espera su confirmación** antes de implementar.

## 3. Implementar con TDD estricto

Dentro del worktree, para **cada** tarea, en orden, sigue el ciclo completo sin saltarte ningún paso:

1. **Red**: escribe primero el test que describe el comportamiento esperado. Ejecútalo y comprueba que **falla** por el motivo correcto. Si pasa sin código nuevo, el test no sirve: corrígelo.
2. **Green**: escribe el mínimo código de producción necesario para que el test pase. Nada más.
3. **Refactor**: limpia el código y los tests manteniendo todo en verde.
4. Ejecuta la **suite completa** (`npm test`) y comprueba que todo pasa.
5. Marca la tarea en el plan (`- [ ]` → `- [x]`) **inmediatamente**, antes de empezar la siguiente.

Notas:

- No escribas código de producción sin un test en rojo que lo justifique.
- No avances a la siguiente tarea si la suite no está en verde.
- Los tests conviven junto al código (`*.test.ts`). En `contexts/employee` usa los mocks de `application/mocks/`.
- Los tests no deben tocar `packages/api/resttek.db`: usa una base temporal o `:memory:`.

## 4. Cierre

1. Ejecuta la suite completa una última vez (`npm test` en el worktree) y, si se tocó un frontend, su build (`npm run build -w @resttek/<paquete>`).
2. Avisa de nuevo en **`planes-generales`** con `slack_post_message`: tarea, rama, tareas completadas (`X/N`), resultado de la suite y ruta del worktree. Ejemplo:
   `✅ Implementación terminada: <título> · rama <tipo>/<descripcion> · <N>/<N> tareas · tests en verde · .claude/worktrees/<tipo>-<descripcion>`
   Termina siempre el mensaje con la firma `-- Ernesto` en una línea aparte.
   Si algo quedó sin completar o los tests fallan, dilo en el mensaje (no marques como terminado lo que no lo está).
3. Resume al usuario qué se ha hecho e indica la ruta del worktree y la rama. No hagas commit, push ni borres el worktree salvo que lo pida.
