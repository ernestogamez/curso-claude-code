# Gestión de mesas — API

| | |
|---|---|
| **Issue** | #6 — https://github.com/ernestogamez/curso-claude-code/issues/6 |
| **Rama** | `feat/gestion-de-mesas` (`implement-issue` creará su propia rama por aplicación) |
| **Worktree** | `.claude/worktrees/feat-gestion-de-mesas` |
| **Fecha** | 2026-10-08 |
| **Plan** | api (planes hermanos: api, web-admin, web-clientes, web-empleados) |

## Objetivo

Añadir a la API la entidad **mesa** con CRUD para el administrador, cambio de estado para el personal y una operación atómica de ocupación para el cliente, y vincular los pedidos a una mesa válida.

### Criterios de aceptación

- [ ] Una mesa tiene `id`, `number`, `description`, `capacity` y `status` (`libre`, `ocupada`, `reservada`), y pertenece a un restaurante.
- [ ] El admin puede crear, listar, ver, editar y borrar mesas; no puede haber dos mesas con el mismo `number` en un restaurante.
- [ ] Se pueden listar mesas filtrando por `status` y `minCapacity`.
- [ ] Admin, manager y camarero pueden cambiar el estado; cocinero solo lo ve.
- [ ] `POST /:id/occupy` solo funciona si la mesa está `libre` y `capacity >= partySize`; dos peticiones simultáneas no pueden ocupar la misma mesa.
- [ ] `POST /orders` con `tableId` exige que la mesa exista en ese restaurante y esté `ocupada`.
- [ ] Los pedidos devuelven `tableNumber`.
- [ ] La suite `npm test` pasa en verde.

## Alcance

**Incluido**
- Tabla `tables`, modelo, repositorio, servicio, controlador, rutas, errores de dominio y seed.
- Validación de `tableId` en la creación de pedidos y `tableNumber` en las lecturas de pedidos.
- Actualizar `docs/dominio/modelo-datos.md` y `docs/arquitectura/arquitectura-api.md`.

**Excluido**
- Liberar la mesa automáticamente al entregar el pedido (el personal la cambia a mano, según la issue).
- Reservas con fecha/hora: `reservada` es solo un estado.
- Interfaces de usuario (planes `web-admin`, `web-clientes`, `web-empleados`).

## Paquetes afectados

`api`, estilo **por capas** (`models` → `repositories` → `services` → `controllers` → `routes`), igual que `ingredient`. Nombre de tabla SQL `tables`, modelo `Table` en `table.model.ts`.

## Tareas

- [ ] 1. Modelo `Table`, tipo `TableStatusType`, `normalizeTableStatus()` y errores de dominio (`InvalidTableStatusError`, `TableNotFoundError`, `TableNumberRequiredError`, `DuplicateTableNumberError`, `InvalidTableCapacityError`, `TableNotAvailableError`) — test: `models/table.model.test.ts` — toca: `models/table.model.ts`, `errors/DomainErrors.ts`
- [ ] 2. Tabla `tables` (con `UNIQUE(restaurant_id, number)`) y `SqliteTableRepository` con `save`, `findById`, `findByRestaurant(restaurantId, { status?, minCapacity? })` y `delete` — test: `repositories/table.repository.test.ts` (`:memory:`, siembra un restaurante como `ingredient.repository.test.ts`) — toca: `config/database.ts`, `repositories/table.repository.ts`
- [ ] 3. Método atómico `occupyIfFree(id)` del repositorio (`UPDATE ... WHERE id = ? AND status = 'libre'`, devuelve si cambió una fila) — test: `repositories/table.repository.test.ts` (segunda llamada devuelve `false`) — toca: `repositories/table.repository.ts`
- [ ] 4. `MockTableRepository` y `TableService.create/update/delete/getById` con validaciones (número entero > 0, capacidad entero ≥ 1, número único por restaurante, estado válido) — test: `services/table.service.test.ts` — toca: `repositories/mocks/MockTableRepository.ts`, `services/table.service.ts`
- [ ] 5. `TableService.list` (filtros `status` y `minCapacity`) y `changeStatus` — test: `services/table.service.test.ts` — toca: `services/table.service.ts`
- [ ] 6. `TableService.occupy(id, partySize)`: valida `partySize` ≥ 1 y que cabe, usa `occupyIfFree` y lanza `TableNotAvailableError` si ya no está libre — test: `services/table.service.test.ts` — toca: `services/table.service.ts`
- [ ] 7. `TableController`, `table.routes.ts` con `Router({ mergeParams: true })` y roles según el contrato, montado en `app.ts`; `errorHandler` devuelve 404 para `TableNotFoundError` y 409 para `TableNotAvailableError` — test: `contexts/shared/infrastructure/http/errorHandler.test.ts` (mapeo de códigos); el resto se comprueba con `curl` tras `npm run dev:api` — toca: `controllers/table.controller.ts`, `routes/table.routes.ts`, `app.ts`, `errorHandler.ts`
- [ ] 8. `OrderService.create` valida que `tableId`, si viene, exista en el restaurante y esté `ocupada` (inyecta `TableRepository`; actualiza `order.routes.ts` y los tests existentes) — test: `services/order.service.test.ts` — toca: `services/order.service.ts`, `routes/order.routes.ts`
- [ ] 9. Los pedidos devuelven `tableNumber` (`LEFT JOIN tables` en las consultas de `order.repository.ts`; campo opcional en `Order`) — test: `repositories/order.repository.test.ts` (nuevo, `:memory:`) — toca: `models/order.model.ts`, `repositories/order.repository.ts`
- [ ] 10. Seed: 5-6 mesas por restaurante (`INSERT OR IGNORE`, ids fijos) — verificación: `npm run seed` dos veces seguidas sin errores ni duplicados — toca: `scripts/seed.ts`
- [ ] 11. Documentar la entidad y los endpoints — verificación: revisión manual de que rutas y roles coinciden con el código — toca: `docs/dominio/modelo-datos.md`, `docs/arquitectura/arquitectura-api.md`, `docs/dominio/glosario.md`

## Riesgos y preguntas abiertas

- **Roles de cambio de estado**: la issue dice «empleados». Supongo admin, manager y camarero (cocinero solo ve). Confirmar.
- **Ocupar y reservada**: `occupy` solo acepta mesas `libre`; una `reservada` no puede ocuparla un cliente. Confirmar.
- **Pedido sin mesa**: se mantiene `tableId: null` permitido para no romper pedidos existentes ni el seed.
- **Borrar una mesa con pedidos**: `orders.table_id` no tiene FK, así que se permite borrar y los pedidos antiguos quedan con `tableNumber` nulo.
- **Mesas que nunca se liberan**: si el cliente abandona, la mesa queda `ocupada` hasta que el personal la libere.
- **BD existente**: `CREATE TABLE IF NOT EXISTS` crea `tables` sin tocar el resto; no hace falta borrar `resttek.db`.
- Las rutas de `orders` no usan `authorize()` (ver `CLAUDE.md`); no se cambia aquí.
