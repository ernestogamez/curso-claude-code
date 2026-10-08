# Gestión de mesas — web-empleados

| | |
|---|---|
| **Issue** | #6 — https://github.com/ernestogamez/curso-claude-code/issues/6 |
| **Rama** | `feat/gestion-de-mesas` (`implement-issue` creará su propia rama por aplicación) |
| **Worktree** | `.claude/worktrees/feat-gestion-de-mesas` |
| **Fecha** | 2026-10-08 |
| **Plan** | web-empleados (planes hermanos: api, web-admin, web-clientes, web-empleados) |

## Objetivo

Que el personal vea el estado de las mesas del restaurante, lo cambie, y consulte los pedidos de las mesas ocupadas.

### Criterios de aceptación

- [ ] Existe una página «Mesas» que muestra todas las mesas (número, descripción, capacidad, estado con color).
- [ ] Admin, manager y camarero pueden cambiar el estado (`libre`, `ocupada`, `reservada`); el cocinero solo lo ve.
- [ ] Las mesas ocupadas muestran sus pedidos activos con el estado de cada ítem.
- [ ] Los datos se refrescan solos (polling de 30 s, como `OrderStore`).
- [ ] Las insignias «Mesa …» de cocina, barra y salón muestran el número de mesa, no el id.
- [ ] `npm run build -w @resttek/web-empleados` termina sin errores.

## Alcance

**Incluido**
- Feature `tables` con modelos, servicio, store, página y ruta; enlace en el menú según rol; uso de `tableNumber` en las páginas de pedidos existentes.

**Excluido**
- Alta, edición y borrado de mesas (es del administrador).
- Websockets.
- Cambios en la API u otros frontends.

## Paquetes afectados

`web-empleados` (Angular standalone, signals, zoneless; patrón **Store** con polling a 30 s; menú condicionado por rol en `core/layout/shell`). Depende del plan `api`.

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

Sin tests en el paquete: verificación con `npm run build -w @resttek/web-empleados` y comprobación manual con `npm run dev:api` + `npm run dev:empleados` (login `camarero` del seed; `cocinero` para el caso solo lectura).

- [ ] 1. Modelo `Table` y `TableService` (`list`, `changeStatus`) — verificación: build — toca: `features/tables/models/table.model.ts`, `features/tables/services/table.service.ts`
- [ ] 2. Añadir `tableNumber?: number` al modelo de pedido existente — verificación: build — toca: `features/orders/models/order.model.ts`
- [ ] 3. `TableStore` (signals `tables`/`loading`/`error` con `asReadonly()`, `load`, `changeStatus`, polling de 30 s con limpieza al destruir) — verificación: build — toca: `features/tables/store/table.store.ts`
- [ ] 4. Página `mesas`: cuadrícula de tarjetas con color por estado, selector de estado visible solo para admin/manager/camarero — verificación: build + manual (cambiar estado como camarero; ver solo lectura como cocinero) — toca: `features/tables/pages/mesas/*`
- [ ] 5. Pedidos de las mesas ocupadas: en cada tarjeta `ocupada`, listar los ítems de los pedidos activos cuyo `tableId` coincide (reutilizando `OrderStore`) con su estado — verificación: build + manual (crear un pedido desde `web-clientes` y verlo) — toca: `features/tables/pages/mesas/*`, `features/orders/store/order.store.ts` si hace falta exponer el listado
- [ ] 6. Ruta `mesas` en `app.routes.ts` y enlace «Mesas» en el menú para todos los roles de empleado — verificación: build + manual — toca: `app.routes.ts`, `core/layout/shell.component.ts`, `core/layout/shell.component.html`
- [ ] 7. Cocina, barra y salón muestran `Mesa {{ order.tableNumber ?? order.tableId }}` — verificación: build + manual — toca: `features/orders/pages/{cocina,barra,salon}/*.html`

## Riesgos y preguntas abiertas

- **Roles de cambio de estado**: supuesto admin, manager y camarero (cocinero solo lectura). Confirmar.
- Si hay varios pedidos activos para una misma mesa se muestran todos; no se agrupan.
- `GET /orders/active` solo devuelve pedidos con ítems no entregados: una mesa `ocupada` sin pedidos pendientes aparecerá sin pedidos.
- Implementar después del plan `api`.
