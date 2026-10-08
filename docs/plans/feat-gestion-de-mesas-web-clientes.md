# Gestión de mesas — web-clientes

| | |
|---|---|
| **Issue** | #6 — https://github.com/ernestogamez/curso-claude-code/issues/6 |
| **Rama** | `feat/gestion-de-mesas` (`implement-issue` creará su propia rama por aplicación) |
| **Worktree** | `.claude/worktrees/feat-gestion-de-mesas` |
| **Fecha** | 2026-10-08 |
| **Plan** | web-clientes (planes hermanos: api, web-admin, web-clientes, web-empleados) |

## Objetivo

Que el cliente, al elegir restaurante, indique cuántas personas son, vea las mesas libres con capacidad suficiente, elija una, la ocupe al continuar y pase a la carta con esa mesa asociada a su pedido.

### Criterios de aceptación

- [ ] Al pulsar un restaurante se pide el número de personas (entero ≥ 1) antes de ver la carta.
- [ ] Se listan solo mesas `libre` con `capacity >= personas`; si no hay ninguna, se informa.
- [ ] Al continuar con una mesa seleccionada, se ocupa (`POST .../occupy`) y se navega a la carta.
- [ ] Si la mesa ya no está libre (409) se avisa, se recarga la lista y no se navega.
- [ ] Los pedidos enviados desde ese flujo llevan el `tableId` de la mesa ocupada.
- [ ] `npm run build -w @resttek/web-clientes` termina sin errores.

## Alcance

**Incluido**
- Servicio de mesas en `core/`, pantalla de selección de mesa, ruta y cambio del enlace de la lista de restaurantes, `tableId` en el carrito y en el envío del pedido.

**Excluido**
- Liberar la mesa desde el cliente.
- Reservar mesas.
- Cambios en la API u otros frontends.

## Paquetes afectados

`web-clientes` (distinto a los otros dos: modelos y servicios en `core/`, features como componentes sueltos que consumen `Observable`; el único store es `CartStore`; el componente raíz es `App`). Depende del plan `api`.

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

Sin tests en el paquete: verificación con `npm run build -w @resttek/web-clientes` y comprobación manual con `npm run dev:api` + `npm run dev:clientes` (login `cliente` del seed).

- [ ] 1. Modelo `Table` y `TableService` en `core/` (`list(restaurantId, { status, minCapacity })` y `occupy(restaurantId, tableId, partySize)` devolviendo `Observable`) — verificación: build — toca: `core/models/table.model.ts`, `core/services/table.service.ts`
- [ ] 2. `CartStore` guarda `tableId` y `tableNumber` (se vacían al cambiar de restaurante, igual que el carrito) — verificación: build + manual — toca: `core/store/cart.store.ts`
- [ ] 3. Componente `table-selection` en `features/tables/`: formulario de nº de personas, lista de mesas libres con capacidad suficiente, estados cargando/vacío/error — verificación: build + manual — toca: `features/tables/table-selection.component.ts`
- [ ] 4. Botón «Continuar»: llama a `occupy`, guarda la mesa en `CartStore` y navega a `/restaurants/:id`; el 409 muestra aviso y recarga la lista — verificación: build + manual (probar con dos sesiones sobre la misma mesa) — toca: `features/tables/table-selection.component.ts`
- [ ] 5. Ruta `restaurants/:id/tables` en `app.routes.ts` y la lista de restaurantes enlaza a ella en lugar de a la carta — verificación: build + manual — toca: `app.routes.ts`, `features/restaurants/restaurant-list.component.ts`
- [ ] 6. Guard de la carta: si no hay mesa en `CartStore` para ese restaurante, redirige a `restaurants/:id/tables` — verificación: build + manual (acceso directo a la URL de la carta) — toca: `app.routes.ts` (guard funcional), `core/store/cart.store.ts`
- [ ] 7. `OrderService.create` envía el `tableId` del `CartStore` en lugar de `null`; el detalle del pedido muestra «Mesa N» — verificación: build + manual (crear pedido y ver el `tableId` en la respuesta) — toca: `core/services/order.service.ts`, `features/cart/cart.component.ts`, `features/orders/order-detail.component.ts`

## Riesgos y preguntas abiertas

- **Estado en recarga**: `CartStore` es local; si el cliente recarga la página pierde la mesa (que sigue `ocupada` en el servidor). Se acepta o hay que persistirlo (p. ej. `sessionStorage`). Confirmar.
- **Abandono**: si el cliente sale sin pedir, la mesa queda ocupada hasta que el personal la libere.
- La carta pública (`/public/...`) se mantiene: esta app ya exige login, así que el flujo siempre es con sesión.
- Implementar después del plan `api`.
