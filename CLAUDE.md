# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Resttek: plataforma de gestión de restaurantes. Monorepo con npm workspaces (`packages/*`): una API (`api`, Express 5 + TypeScript + SQLite) y cuatro paquetes Angular 21 (`web-admin`, `web-empleados`, `web-clientes` y la librería `web-shared`). La documentación (en español) está en `docs/` (`arquitectura/`, `dominio/`, `revisiones/`); léela antes de cambios grandes.

## Comandos

Todos desde la raíz:

```bash
npm install            # instala todos los workspaces
npm run seed           # puebla SQLite (idempotente, INSERT OR IGNORE)
npm run dev:api        # API en :3000 (tsx watch); healthcheck: GET /health
npm run dev:admin      # :4200
npm run dev:empleados  # :4201
npm run dev:clientes   # :4202
npm test               # vitest de la API (única suite de tests del repo)
```

- Un solo test: `cd packages/api && npx vitest run src/services/order.service.test.ts` (o `-t "nombre"`). Modo watch: `npm run test:watch` en `packages/api`.
- Build de un frontend: `npm run build -w @resttek/web-admin` (idem para los otros). No hay lint configurado; los frontends no tienen tests.
- Los frontends hacen proxy de `/api` a `localhost:3000` (`proxy.conf.json`). Cambios en `web-shared` requieren reiniciar el dev server.
- Credenciales de seed: la contraseña de cada usuario es su email (p. ej. `admin@resttek.com`).
- `scripts/seed-issues.sh` crea issues de GitHub desde `scripts/issues.json` (`--dry-run` para simular).

## Arquitectura de la API (`packages/api/src`)

Conviven **dos estilos**; identifica cuál aplica antes de editar:

1. **Hexagonal + DDD, solo `contexts/employee`** (domain / application / infrastructure). `Employee` es la única entidad con comportamiento (constructor privado + `Employee.create()`); casos de uso con un único `execute()` (`LoginUseCase`, `CreateEmployeeUseCase`, `RegisterClientUseCase`); interfaces con prefijo `I` (`IEmployeeRepository`). El cableado de dependencias está en `infrastructure/http/dependencies.ts`. `contexts/shared` contiene el value object `Email`, middlewares y `errorHandler`.
2. **Por capas, para `restaurant`, `dish`, `ingredient`, `order`**: `models/` (interfaces planas + `normalizeX()`), `repositories/` (interfaz sin prefijo `I` + implementación Sqlite en el mismo fichero), `services/` (lógica y validación), `controllers/`, `routes/`. Aquí no hay entidades con comportamiento; los "value objects" son tipos unión + funciones `normalizeX()` que lanzan errores de dominio.

Detalles que requieren leer varios ficheros:
- La composición de dependencias se hace en el propio fichero de rutas (`new SqliteXRepository(dbConfig)` → servicio → controlador). Los routers anidados bajo `/restaurants/:restaurantId/...` necesitan `Router({ mergeParams: true })`.
- Todo cuelga de `/api/v1` excepto `/health`. Auth por JWT con `authenticate` + `authorize([...roles])`. Roles: admin, manager, camarero, cocinero, cliente.
- Las rutas de `orders` **no** usan `authorize()` (cualquier autenticado puede cambiar el estado de un ítem). `POST /orders` toma `clientId` del JWT. `GET /orders/active` exige `?restaurantId=`.
- Al crear un pedido, un ítem con `quantity: 3` se guarda como 3 filas `order_items` con `quantity: 1` (estado por unidad).
- Los repositorios hacen `save()` como UPDATE-o-INSERT y mapean `snake_case` → `camelCase` con alias en el SQL. Las tablas se crean al arrancar el servidor.
- Los tests (`*.test.ts`) conviven junto al código; los de `employee` usan mocks en `application/mocks/`.

## Arquitectura de los frontends

Angular standalone, signals, **zoneless**, guards/interceptors funcionales. Lo compartido (auth, http, componentes, estilos, tokens) vive en `@resttek/web-shared` (`main: src/index.ts`, sin build propio).

- `web-admin` y `web-empleados`: `features/<feature>/{models,pages,services,store}`. Patrón **Store**: servicio `providedIn: 'root'` con signals privadas expuestas con `asReadonly()` (`loading`/`error`/datos); el store envuelve el service con `firstValueFrom` y los componentes solo hablan con el store. `OrderStore` de empleados hace polling cada 30 s (no hay websockets).
- `web-clientes` es distinta: modelos y servicios en `core/`, features como componentes sueltos que consumen los `Observable` del service directamente; el único store es `CartStore` (local, se vacía al cambiar de restaurante). `my-orders` hace polling de 10 s con `setInterval`. El componente raíz se llama `App` (no `AppComponent`).

## Notas

- `docs/revisiones/inconsistencias-*.md` listan inconsistencias conocidas del código; consúltalas antes de "arreglar" algo que parezca raro.
- `packages/api/resttek.db` es la base SQLite local.
