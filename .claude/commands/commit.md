---
description: Crea un commit de git con un mensaje claro a partir de los cambios actuales
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

## Contexto

- Estado del repositorio: !`git status --short`
- Cambios (staged y unstaged): !`git diff HEAD`
- Rama actual: !`git branch --show-current`
- Últimos commits (para seguir el estilo): !`git log --oneline -10`

## Tarea

Crea un único commit con los cambios actuales siguiendo estos pasos:

1. Analiza los cambios y decide qué ficheros pertenecen al commit. Si hay cambios sin relación entre sí, propón dividirlos en varios commits.
2. No incluyas ficheros que no deban versionarse (secretos, `.env`, `.DS_Store`, `node_modules`, bases de datos locales como `resttek.db`). Avísame si aparecen.
3. Añade los ficheros relevantes con `git add <rutas>` (evita `git add -A` a ciegas).
4. Escribe el mensaje siguiendo [Conventional Commits](https://www.conventionalcommits.org/):
   - Formato: `tipo(ámbito): descripción` con `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, etc.
   - El ámbito es el paquete afectado cuando aplique (`api`, `web-admin`, `web-empleados`, `web-clientes`, `web-shared`).
   - Primera línea en imperativo, en minúsculas y de máximo 72 caracteres.
   - Si hace falta, añade un cuerpo explicando el **porqué** del cambio, no el qué.
5. Termina el mensaje con la línea de coautoría que indique la configuración de la sesión.
6. Ejecuta `git commit` y muestra el resultado con `git log -1 --stat`.

## Reglas

- No hagas `git push` ni cambies de rama.
- No uses `--amend`, `--no-verify` ni ninguna opción que reescriba historia o se salte hooks.
- Si no hay cambios, dilo y no crees un commit vacío.
- Si un hook falla, corrige el problema y crea un commit nuevo.
