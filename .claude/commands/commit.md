---
description: Crea un commit siguiendo la especificación Conventional Commits
argument-hint: "[tipo(ámbito)] [pista opcional sobre el cambio]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

## Contexto

- Estado del repositorio: !`git status --short`
- Cambios preparados (staged): !`git diff --cached`
- Cambios sin preparar: !`git diff`
- Últimos commits (para seguir el estilo): !`git log --oneline -10 2>/dev/null || echo "(sin commits todavía)"`

Indicaciones adicionales del usuario: $ARGUMENTS

## Tarea

Crea **un único commit** que siga la especificación [Conventional Commits 1.0.0](https://www.conventionalcommits.org/es/v1.0.0/).

### Pasos

1. Si no hay cambios preparados, analiza los cambios sin preparar y añade con `git add` solo los archivos relacionados con un mismo cambio lógico. Nunca añadas archivos con secretos (`.env`, credenciales) ni bases de datos locales como `packages/api/resttek.db`.
2. Si los cambios mezclan propósitos distintos (por ejemplo, una funcionalidad y una refactorización sin relación), no los juntes: avisa y propón dividirlos en varios commits.
3. Elige el tipo y el ámbito adecuados y redacta el mensaje.
4. Ejecuta el commit con un heredoc para conservar el formato:
   ```bash
   git commit -m "$(cat <<'EOF'
   tipo(ámbito): descripción

   Cuerpo opcional.
   EOF
   )"
   ```
5. Muestra el resultado con `git log -1 --stat`.

### Formato del mensaje

```
<tipo>[(ámbito)][!]: <descripción>

[cuerpo opcional]

[pie(s) opcional(es)]
```

**Tipos permitidos:**

| Tipo       | Uso                                                        |
|------------|------------------------------------------------------------|
| `feat`     | Nueva funcionalidad                                        |
| `fix`      | Corrección de un error                                     |
| `docs`     | Solo documentación                                         |
| `style`    | Formato, espacios, punto y coma (sin cambios de lógica)    |
| `refactor` | Cambio de código que no corrige errores ni añade funciones |
| `perf`     | Mejora de rendimiento                                      |
| `test`     | Añadir o corregir tests                                    |
| `build`    | Sistema de build o dependencias (`package.json`, npm)      |
| `ci`       | Configuración de integración continua                      |
| `chore`    | Tareas de mantenimiento que no tocan `src/` ni tests       |
| `revert`   | Revierte un commit anterior                                |

**Ámbitos sugeridos** (paquetes del monorepo): `api`, `web-admin`, `web-empleados`, `web-clientes`, `web-shared`; también `docs`, `mcp` o `claude` para configuración. Omítelo si el cambio es transversal.

**Reglas:**

- Descripción en inglés, en imperativo y minúsculas (`add`, `fix`, `remove`), sin punto final y con un máximo de 72 caracteres en la primera línea.
- Cuerpo opcional, separado por una línea en blanco: explica el **qué** y el **porqué**, no el cómo. Líneas de unos 72 caracteres.
- Cambios incompatibles (por ejemplo, renombrar una ruta o un campo JSON del contrato público): añade `!` tras el tipo/ámbito **y** un pie `BREAKING CHANGE: <explicación>`.
- Referencias a issues en el pie: `Refs: #123` o `Closes: #123`.
- Termina el mensaje con la línea de coautoría que indique la configuración de la sesión.

### Ejemplos

```
feat(api): add pagination to the active orders endpoint
```

```
fix(api): reject expired tokens in authenticate middleware

Tokens past their expiration were still accepted because the
comparison used seconds instead of milliseconds.
```

```
feat(api)!: rename /orders/active query param to restaurantId

BREAKING CHANGE: clients must send ?restaurantId= instead of ?restaurant=.
```

Si `$ARGUMENTS` indica un tipo o ámbito, respétalo salvo que sea claramente incorrecto para los cambios (en ese caso, avisa). No hagas `git push` ni uses `--amend` o `--no-verify` salvo petición explícita.
