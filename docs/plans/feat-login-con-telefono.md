# Login con teléfono (alternativa al email)

| | |
|---|---|
| **Rama** | `feat/login-con-telefono` |
| **Worktree** | `.claude/worktrees/feat-login-con-telefono` |
| **Fecha** | 2026-10-07 |

## Objetivo

Hoy el login (`POST /api/v1/auth/login`) solo acepta `email` + `password`. Se quiere que el usuario pueda identificarse **con su teléfono en lugar del email**: `{ phone, password }` o `{ email, password }`. Para ello `Employee` (empleados y clientes) gana un `phone` **opcional** y único, que se guarda en BD y se puede indicar al crear empleados y al registrar clientes. El login actual por email sigue funcionando sin cambios.

### Criterios de aceptación

- [ ] `POST /auth/login` con `phone` + `password` correctos devuelve 200 con token y `phone` en `employee`.
- [ ] `POST /auth/login` con `email` + `password` sigue funcionando igual.
- [ ] Teléfono inexistente o contraseña incorrecta → 401 `InvalidCredentialsError` (mismo error, no revela qué falló).
- [ ] Un teléfono con formato inválido al crear/registrar → 400 `InvalidPhoneError`.
- [ ] Dos cuentas no pueden compartir teléfono (error de duplicado al crear/registrar).
- [ ] `phone` es opcional en `POST /auth/register` y `POST /employees`.
- [ ] Las BDs SQLite existentes se migran sin perder datos; el seed asigna teléfono a los usuarios.
- [ ] `npm test` en verde.

## Alcance

**Incluido**
- API, solo `contexts/employee` (hexagonal) y `contexts/shared`: value object `Phone`, entidad, repositorio (`findByPhone`), casos de uso, controladores, esquema SQLite con migración, seed y docs.

**Excluido**
- Los frontends (`web-admin`, `web-empleados`, `web-clientes`): el formulario de login seguirá usando email, así que **no se rompe nada**. Añadir el selector de teléfono en la UI va en otra tarea (los frontends no tienen tests y requieren decidir el diseño).
- Verificación por SMS/OTP: el teléfono es solo un identificador.

## Paquetes afectados

`api`. Estilo **hexagonal + DDD** (`contexts/employee`), siguiendo el precedente del value object `Email` en `contexts/shared/domain/value-objects/Email.ts`. `InvalidPhoneError` ya existe en `errors/DomainErrors.ts`.

## Tareas

- [x] 1. Value object `Phone` (quita espacios, `+` opcional, 9-15 dígitos; lanza el `InvalidPhoneError` existente) — test: `contexts/shared/domain/value-objects/Phone.test.ts` — toca: `Phone.ts`, `Phone.test.ts`
- [x] 2. `Employee` con `phone` opcional (`string | null`; `Employee.create` lo valida con `Phone` si viene; getter `phone`) — test: `contexts/employee/domain/Employee.test.ts` (con teléfono, sin teléfono, inválido) — toca: `Employee.ts`
- [x] 3. Persistencia: columna `phone TEXT` nullable en `employees`, migración `ALTER TABLE` idempotente para BDs existentes, índice único parcial (`WHERE phone IS NOT NULL`) y mapeo de `phone` en `SqliteEmployeeRepository` (SELECT/INSERT/UPDATE) — test: `SqliteEmployeeRepository.test.ts` (guarda y recupera con y sin teléfono; BD de test) — toca: `config/database.ts`, `SqliteEmployeeRepository.ts`
- [x] 4. `findByPhone` en `IEmployeeRepository`, `SqliteEmployeeRepository` y `MockEmployeeRepository` — test: `SqliteEmployeeRepository.test.ts` (encuentra / devuelve null) — toca: los tres ficheros
- [x] 5. `LoginUseCase` acepta `email` o `phone` (si viene `phone` busca por teléfono; si no, por email) y devuelve `phone` en la respuesta — test: `EmployeeUseCases.test.ts` (login por teléfono ok, teléfono inexistente → `InvalidCredentialsError`, contraseña incorrecta, login por email intacto) — toca: `LoginUseCase.ts`
- [x] 6. `CreateEmployeeUseCase` y `RegisterClientUseCase` aceptan `phone` opcional y rechazan teléfonos ya usados (mismo patrón que el email duplicado) — test: `EmployeeUseCases.test.ts`, `RegisterClientUseCase.test.ts` — toca: ambos casos de uso
- [x] 7. Controladores: `AuthController` (login/register) y `EmployeeController` leen `phone` del body y lo devuelven en las respuestas — verificación: `tsc` + prueba manual con curl (los controladores no tienen tests propios) — toca: `AuthController.ts`, `EmployeeController.ts`
- [x] 8. Seed con teléfono para el admin y los demás usuarios, y actualizar `docs/arquitectura/arquitectura-api.md`, `docs/dominio/modelo-datos.md` y `CLAUDE.md` (credenciales de seed) — verificación: `npm run seed` sobre una BD temporal + suite completa — toca: `scripts/seed.ts`, docs

## Riesgos y preguntas abiertas

**Suposiciones** (revisar antes de implementar)
- "Opción de teléfono" = el teléfono **sustituye al email** como identificador (email *o* teléfono + contraseña), no se exigen los dos.
- El teléfono es único por cuenta (necesario para poder buscar por él) y opcional.
- Formato aceptado: `+34 612345678` o `612345678` (9-15 dígitos, espacios ignorados), coherente con el teléfono de restaurantes. Se guarda normalizado, sin espacios.
- Las cuentas existentes se migran con `phone = NULL`: siguen entrando por email. El seed es `INSERT OR IGNORE`, así que no actualiza usuarios ya creados; para ver los teléfonos de seed hay que recrear la BD local.

**Preguntas abiertas**
- ¿Quieres incluir después el selector email/teléfono en los formularios de login de los frontends?
- Los endpoints de login siguen sin rate limiting; el teléfono es un dato más fácil de enumerar que un email (queda fuera de alcance).
