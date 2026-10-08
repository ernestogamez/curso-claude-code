---
name: implement-issue
description: Implementa el plan comentado en una issue de GitHub (indicada por su número). Crea un git worktree (uno por agente si la feature afecta a varios), aplica TDD estricto y hace un commit por cada tarea completada del plan. Úsala cuando se pida implementar/ejecutar el plan de la issue #N.
---

# implement-issue

Issue a implementar: $ARGUMENTS

`$ARGUMENTS` debe contener el **número** de la issue (admite `42` o `#42`). Si está vacío o no es un número, pregunta al usuario cuál es antes de continuar. No adivines ni elijas una issue por tu cuenta.

## Reglas generales

- El código y los tests se escriben en inglés; los mensajes al usuario y los ficheros de texto, en español.
- **Nunca edites ficheros en el checkout principal**: todo el trabajo se hace dentro de un worktree (paso 2).
- Commits con Conventional Commits, un commit por tarea (paso 4). Sigue la skill/comando `commit` del proyecto y añade la atribución que indique el entorno.
- Nada de `git push`, merge ni force-push salvo que el usuario lo pida expresamente.

## 1. Leer la issue y localizar el plan

1. Obtén la issue con sus comentarios: `gh issue view <N> --comments` (y `--json title,body,comments,labels,state` si necesitas estructura).
2. Identifica el **plan** dentro de los comentarios (lista de tareas, normalmente con checkboxes o pasos numerados). Si hay varios comentarios con planes o versiones, usa el más reciente y dile al usuario cuál has elegido; si hay ambigüedad real, pregunta.
3. Si la issue no existe, está cerrada o no contiene ningún plan, **detente** e infórmalo al usuario. No inventes un plan.
4. Antes de implementar, lee `CLAUDE.md`, la documentación relevante de `docs/` y `docs/revisiones/inconsistencias-*.md`, y explora el código afectado.
5. Extrae la lista ordenada de tareas. Para cada una anota: descripción, ficheros afectados y paquete/agente al que pertenece. Si una tarea es demasiado grande (más de ~10 min), divídela en subtareas manteniendo el orden.
6. Resume al usuario el plan que vas a ejecutar (tareas y reparto por agentes) y continúa; solo espera confirmación si había ambigüedad.

## 2. Crear los worktrees

Deduce `<tipo>` (Conventional Commits: `feat`, `fix`, `refactor`…) y una `<descripcion>` corta en kebab-case sin tildes, a partir del título de la issue.

### Feature de un solo agente (caso por defecto)

- Rama `<tipo>/<N>-<descripcion>` y directorio `.claude/worktrees/<tipo>-<N>-<descripcion>`.
- Crea con la herramienta `EnterWorktree` o con `git worktree add -b <rama> <dir> <base>`.

### Feature que afecta a varios agentes

Se considera que afecta a varios agentes cuando el plan toca partes independientes que pueden hacerlas agentes distintos (p. ej. `api` + `web-admin`, o `api` + `web-clientes`).

- **Cada agente trabaja en su propio worktree y su propia rama**: `<tipo>/<N>-<descripcion>-<agente>` (p. ej. `feat/42-pedidos-api`, `feat/42-pedidos-web-admin`) en `.claude/worktrees/<tipo>-<N>-<descripcion>-<agente>`.
- Lanza un subagente por agente (herramienta `Agent`), en paralelo cuando las tareas sean independientes. Dale en el prompt: el número de issue, **solo sus tareas**, la ruta de su worktree, y estas mismas reglas de TDD y commits. Los subagentes no deben tocar otro worktree.
- Si hay dependencias (p. ej. el frontend necesita el endpoint de la API), ejecuta primero el agente del que dependen y pasa el contrato (rutas, payloads) al siguiente.
- Al terminar, recoge el informe de cada agente (rama, tareas hechas, resultado de tests).

### Comprobaciones comunes

1. Rama base: `development` si existe; si no, `main`/`master` (la que sea la principal). Verifica que tiene commits.
2. Si la rama o el directorio ya existen, avisa al usuario en lugar de sobrescribirlos.
3. Los cambios sin commitear del checkout principal no pasan al worktree; no los descartes ni los muevas.
4. En cada worktree: `npm install` y `npm test` en verde como línea base. Si falla, díselo al usuario antes de seguir.

## 3. TDD estricto (por cada tarea)

Dentro del worktree correspondiente, para **cada** tarea y en orden:

1. **Red**: escribe primero el test del comportamiento esperado. Ejecútalo y comprueba que **falla por el motivo correcto**. Si pasa sin código nuevo, el test no sirve: corrígelo.
2. **Green**: escribe el mínimo código de producción para que pase. Nada más.
3. **Refactor**: limpia código y tests manteniendo todo en verde.
4. Ejecuta la **suite completa** (`npm test`) y comprueba que todo pasa.
5. **Commit de la tarea** (paso 4).
6. Marca la tarea como completada: si el plan está en un fichero del repo, `- [ ]` → `- [x]` dentro del mismo commit; el plan de la issue no se modifica salvo que el usuario lo pida.

Notas:

- No escribas código de producción sin un test en rojo que lo justifique. No avances si la suite no está en verde.
- Los tests conviven junto al código (`*.test.ts`); en `contexts/employee` usa los mocks de `application/mocks/`.
- Los tests no deben tocar `packages/api/resttek.db`: usa una base temporal o `:memory:`.
- Solo la API tiene tests (vitest). Para tareas de frontend sin tests posibles, extrae la lógica testeable a la API si el diseño lo permite; si no, verifica con `npm run build -w @resttek/<paquete>` y dilo explícitamente en el commit/informe. No es excusa para saltarte TDD en la API.
- Respeta la arquitectura del paquete (hexagonal en `contexts/employee`; por capas en el resto; Store en los frontends).

## 4. Un commit por tarea

Al terminar cada tarea (con la suite en verde), haz **un commit** que contenga únicamente los cambios de esa tarea (test + código):

- Mensaje en Conventional Commits, `<tipo>(<ámbito>): <descripción>`, referenciando la issue en el cuerpo (`Refs #<N>`). Usa `Closes #<N>` solo en el último commit si el plan se completa entero.
- Añade solo los ficheros de la tarea (`git add <ficheros>`), no `git add -A` a ciegas.
- Nunca hagas commit con tests en rojo, ni agrupes varias tareas en un commit.
- No uses `--no-verify` ni reescribas commits anteriores.

## 5. Cierre

1. Ejecuta la suite completa una última vez en cada worktree (`npm test`) y, si se tocó un frontend, su build.
2. Comprueba que todas las tareas del plan están completadas (o enumera las que no, con el motivo).
3. Informa al usuario, en español, de: número y título de la issue, tareas completadas `X/N`, rama y ruta de cada worktree, resultado de tests y commits creados (`git log --oneline <base>..HEAD`). Si hay varios agentes, una línea por agente.
4. No hagas push, PR ni borres worktrees salvo que el usuario lo pida; sugiere como siguiente paso abrir un PR por rama.
