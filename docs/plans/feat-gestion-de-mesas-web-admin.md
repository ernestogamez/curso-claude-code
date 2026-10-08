# Gestión de mesas — web-admin

| | |
|---|---|
| **Issue** | #6 — https://github.com/ernestogamez/curso-claude-code/issues/6 |
| **Rama** | `feat/gestion-de-mesas` (`implement-issue` creará su propia rama por aplicación) |
| **Worktree** | `.claude/worktrees/feat-gestion-de-mesas` |
| **Fecha** | 2026-10-08 |
| **Plan** | web-admin (planes hermanos: api, web-admin, web-clientes, web-empleados) |

## Objetivo

Que el administrador gestione (CRUD) las mesas de su restaurante desde `web-admin`, con listado, alta, edición y borrado.

### Criterios de aceptación

- [ ] Desde el menú se accede a «Mesas» del restaurante.
- [ ] El listado muestra número, descripción, capacidad y estado, con mensaje de vacío y de error.
- [ ] Se puede crear y editar una mesa con validación de formulario (número y capacidad enteros > 0).
- [ ] Se puede borrar con confirmación.
- [ ] Los errores de la API (p. ej. número duplicado) se muestran al usuario.
- [ ] `npm run build -w @resttek/web-admin` termina sin errores.

## Alcance

**Incluido**
- Feature `tables` con el patrón del paquete (`models`, `services`, `store`, `pages`, `*.routes.ts`), copiando la estructura de `ingredients`.

**Excluido**
- Cambio rápido de estado desde el listado (lo hace `web-empleados`); aquí el estado se edita en el formulario.
- Cualquier cambio en la API (plan `api`) o en otros frontends.

## Paquetes afectados

`web-admin` (Angular standalone, signals, zoneless; patrón **Store**: el store envuelve el service con `firstValueFrom` y los componentes solo hablan con el store). Depende del plan `api`; no se toca `web-shared`.

## Contrato de la API (definido en el plan `api`)

`Table`: `{ id, number, description, capacity, status: 'libre' | 'ocupada' | 'reservada', restaurantId, createdAt, updatedAt }`

Base: `/api/v1/restaurants/:restaurantId/tables` (JWT obligatorio)

| Método y ruta | Roles | Descripción |
|---|---|---|
| `GET /?status=&minCapacity=` | admin, manager, camarero, cocinero, cliente | Lista ordenada por `number` |
| `GET /:id` | los mismos | Detalle |
| `POST /` | admin | Body `{ number, description, capacity, status? }` (por defecto `libre`) → 201 |
| `PUT /:id` | admin | Body `{ number, description, capacity, status }` |
| `DELETE /:id` | admin | → 204 |
| `PATCH /:id/status` | admin, manager, camarero | Body `{ status }` |
| `POST /:id/occupy` | cliente | Body `{ partySize }`; pasa `libre` → `ocupada`. 409 si ya no está libre, 400 si no cabe |

Errores: `{ error, message }`; 404 mesa inexistente, 409 mesa no disponible, 400 validación.
Los pedidos (`GET /orders/active`, `GET /orders/:id`, `GET /orders/mine`) incluyen `tableId` (id de la mesa) y el nuevo `tableNumber`.

## Tareas

Los frontends no tienen tests: cada tarea se verifica con `npm run build -w @resttek/web-admin` y, donde se indica, comprobación manual con `npm run dev:api` + `npm run dev:admin` (login `admin@resttek.com`).

- [ ] 1. Modelo `Table`, `TableStatus` y DTO de creación/edición — verificación: build — toca: `features/tables/models/table.model.ts`
- [ ] 2. `TableService` (HTTP: list, getById, create, update, delete) sobre `/api/v1/restaurants/:restaurantId/tables` — verificación: build — toca: `features/tables/services/table.service.ts`
- [ ] 3. `TableStore` (`providedIn: 'root'`, signals `tables`/`loading`/`error` con `asReadonly()`, métodos `load`, `create`, `update`, `remove`) — verificación: build — toca: `features/tables/store/table.store.ts`
- [ ] 4. Página `table-list` (tabla con número, descripción, capacidad, estado; botones editar/borrar con confirmación; estados cargando/vacío/error) — verificación: build + manual — toca: `features/tables/pages/table-list/*`
- [ ] 5. Página `table-form` (alta y edición, validación, error de la API visible) — verificación: build + manual (crear, editar, número duplicado) — toca: `features/tables/pages/table-form/*`
- [ ] 6. `tables.routes.ts` (`''`, `new`, `:id/edit`), ruta en `app.routes.ts` y enlace «Mesas» en el menú / dashboard del restaurante — verificación: build + manual (navegación completa) — toca: `features/tables/tables.routes.ts`, `app.routes.ts`, `core/layout/shell.component.html` o `restaurant-dashboard.component.html`

## Riesgos y preguntas abiertas

- Hay que ver cómo `ingredients` obtiene el `restaurantId` (ruta o sesión) y replicarlo exactamente; no se ha verificado en este plan.
- El contrato puede cambiar si se corrigen los roles o los errores en el plan `api`; implementar después de él.
- Sin tests en el paquete: la verificación es manual.
