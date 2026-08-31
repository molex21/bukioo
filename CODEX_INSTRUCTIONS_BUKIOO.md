# CODEX_INSTRUCTIONS.md — BUKIOO

## 0. Propósito de este archivo

Este archivo contiene el contexto maestro y las instrucciones de trabajo para desarrollar **BUKIOO** con Codex.

BUKIOO es un proyecto portfolio y un SaaS multiempresa para la gestión de citas, reservas, clientes, empleados, servicios y negocios de servicios.

Codex debe usar este documento como fuente principal de contexto técnico y de producto antes de realizar cambios.

---

# 1. REGLA PRINCIPAL DE TRABAJO

## Trabajar SIEMPRE paso a paso

NO implementar grandes bloques de golpe.

Codex debe:

1. Revisar el estado actual del repositorio.
2. Identificar el siguiente punto pendiente del roadmap.
3. Explicar brevemente:
   - qué va a cambiar;
   - por qué;
   - qué archivos tocará;
   - cómo se validará.
4. Implementar SOLO ese paso o una unidad pequeña y coherente.
5. Ejecutar las comprobaciones necesarias.
6. Corregir cualquier error encontrado.
7. Mostrar el resultado.
8. Dejar el repositorio en un estado funcional.
9. NO continuar automáticamente con el siguiente bloque grande.

Cada paso debe quedar VALIDADO antes de considerar que está terminado.

## Validaciones mínimas tras cambios de backend

Según corresponda:

```bash
npm run build
npm run lint
```

Y cuando existan tests adecuados:

```bash
npm run test
npm run test:e2e
```

También probar los endpoints modificados con `curl`, Supertest o el mecanismo apropiado.

Cuando el cambio afecte PostgreSQL:

```bash
npx dbmate status
```

Y validar consultas o migraciones cuando sea necesario.

## No ocultar errores

Si algo falla:

- investigar la causa;
- explicar el problema;
- corregirlo;
- volver a ejecutar la validación.

NO marcar un paso como terminado si la compilación o comprobación correspondiente falla.

---

# 2. REGLAS DE SEGURIDAD PARA CODEX

Está PROHIBIDO:

```text
git reset --hard
git clean
```

o cualquier comando destructivo que pueda eliminar trabajo sin autorización explícita.

Nunca borrar o sobrescribir cambios existentes sin revisarlos.

Antes de modificar Git:

```bash
git status
git branch --show-current
```

Antes de commits importantes:

```bash
git diff
git status
```

Nunca incluir secretos en Git.

Revisar especialmente:

```text
.env
backend/.env
frontend/.env
passwords
DATABASE_URL reales
JWT secrets
refresh tokens
TOTP secrets
API keys
Resend keys
Sentry credentials
```

Los `.env.example` sí pueden versionarse.

---

# 3. PROPIEDAD Y LICENCIA

BUKIOO NO es software open source.

No utilizar:

- MIT
- Apache
- GPL
- BSD
- Creative Commons
- ninguna licencia open source

El proyecto utiliza licencia propietaria:

```text
Copyright © 2026 Alejandro Hernandez.
All Rights Reserved.
```

El repositorio puede ser público para portfolio y demostración, pero no concede permiso para copiar, modificar, distribuir, sublicenciar, vender o reutilizar el software.

Debe existir en la raíz:

```text
LICENSE
```

con una declaración equivalente a:

```text
BUKIOO

Copyright © 2026 Alejandro Hernandez.
All Rights Reserved.

This source code is publicly available for viewing and portfolio purposes only.

No permission is granted to copy, modify, distribute, sublicense,
sell, or use this software or any substantial portion of it
without prior written permission from the copyright holder.

For permission requests, contact the copyright holder.
```

El README principal debe incluir una sección de licencia indicando que BUKIOO es software propietario.

---

# 4. ESTRATEGIA GIT

Usar:

```text
main
└── develop
    └── feature/*
```

## `main`

- versión estable;
- visible en portfolio;
- no desarrollar directamente aquí;
- debe contener README y LICENSE;
- no mezclar trabajo incompleto.

## `develop`

- rama de integración;
- las features terminadas entran mediante Pull Request.

## Features

Ejemplos:

```text
feature/security
feature/auth
feature/organizations
feature/employees
feature/services
feature/appointments
```

Flujo:

```text
feature/*
   ↓
Pull Request
   ↓
develop
   ↓
Pull Request
   ↓
main
```

No hacer merges automáticos sin revisar.

Si existen rulesets en GitHub:

### `main`

- Require pull request before merging
- Block force pushes
- Restrict deletions
- posteriormente Require status checks to pass

### `develop`

- Require pull request before merging
- Block force pushes
- Restrict deletions

---

# 5. DESCRIPCIÓN DEL PRODUCTO

BUKIOO es un SaaS multiempresa de reservas/citas.

Debe poder utilizarse para:

- peluquerías;
- barberías;
- centros de estética;
- fisioterapia;
- clínicas;
- talleres;
- servicios técnicos;
- academias;
- entrenadores;
- consultorías;
- otros negocios basados en citas.

Áreas principales:

```text
SUPERADMIN
OWNER / ADMIN / MANAGER
EMPLOYEE
CLIENT
```

---

# 6. MULTITENANCY

BUKIOO es multiempresa.

Las entidades de negocio deben estar aisladas mediante:

```text
organization_id
```

Un usuario de la empresa A nunca debe poder leer o modificar recursos de la empresa B.

No confiar únicamente en:

```text
organizationId
```

recibido por URL, body o frontend.

El backend debe validar la pertenencia/autorización del usuario.

Siempre que corresponda, las consultas SQL deben incluir el tenant:

```sql
WHERE id = $1
AND organization_id = $2
```

Además, la base de datos utiliza constraints/FK tenant-aware cuando es posible.

---

# 7. STACK DEFINITIVO

## Frontend

- React
- Vite
- TypeScript
- Mantine
- Mantine Form
- Mantine Charts
- Font Awesome
- TanStack Query
- FullCalendar
- i18next
- react-i18next
- PWA básica
- polling de 30–60 segundos en V1

No implementar WebSockets/SSE en MVP salvo cambio explícito.

## Backend

- Node.js
- TypeScript
- NestJS 11
- Express adapter
- REST API
- class-validator
- class-transformer
- ValidationPipe
- JWT corto
- refresh token HttpOnly
- TOTP + recovery codes
- Argon2id para passwords
- Resend
- pg-boss
- Pino / nestjs-pino
- Sentry

## Base de datos

- PostgreSQL 17
- SQL directo
- driver `pg`
- `pg.Pool`
- dbmate
- SIN ORM

NO introducir:

- Prisma
- TypeORM
- Sequelize
- Drizzle

salvo autorización explícita.

## Testing

Objetivo final:

- Vitest → unitarios
- Supertest → API/integración
- Playwright → E2E

El proyecto puede conservar temporalmente Jest generado por NestJS hasta completar la migración a Vitest.

## Infraestructura

- Docker
- Docker Compose
- Dockge
- Nginx Proxy Manager
- GitHub Actions
- deployment manual mediante Dockge
- servidor propio / mini-PC con OpenMediaVault
- Cloudflare Tunnel recomendado para exposición pública
- PostgreSQL NO debe exponerse públicamente

---

# 8. ARQUITECTURA BACKEND

Usar esta separación:

```text
HTTP Request
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
DatabaseService
    ↓
pg.Pool
    ↓
PostgreSQL
```

## Controller

Responsabilidad:

- HTTP;
- parámetros;
- DTO;
- status codes;
- llamar al Service.

NO incluir SQL ni lógica de negocio compleja.

## Service

Responsabilidad:

- lógica de negocio;
- reglas;
- coordinación;
- autorizaciones específicas;
- transacciones cuando corresponda.

## Repository

Responsabilidad:

- SQL;
- consultas parametrizadas;
- mapping básico de filas.

No concatenar nunca entrada del usuario en SQL.

Correcto:

```ts
await databaseService.query(
  'SELECT * FROM users WHERE id = $1',
  [id],
);
```

Incorrecto:

```ts
`SELECT * FROM users WHERE id = '${id}'`
```

## DatabaseService

Debe encapsular `pg.Pool`.

Ya está implementado.

## Module

Registra controllers/providers del módulo.

## `.spec.ts`

Archivos de tests.

---

# 9. ESTADO ACTUAL DEL PROYECTO

## Completado

- [x] PostgreSQL mediante Docker
- [x] `postgres:17`
- [x] migración inicial creada
- [x] migración inicial aplicada
- [x] `dbmate`
- [x] `DatabaseModule`
- [x] `DatabaseService`
- [x] `pg.Pool`
- [x] `DATABASE_URL`
- [x] conexión PostgreSQL comprobada
- [x] prefijo global `/api/v1`
- [x] módulo Health
- [x] `GET /api/v1/health`
- [x] Health comprueba PostgreSQL
- [x] `ValidationPipe`
- [x] `whitelist: true`
- [x] `forbidNonWhitelisted: true`
- [x] `transform: true`
- [x] Helmet
- [x] CORS
- [x] `FRONTEND_URL`
- [x] rate limiting global con `@nestjs/throttler`
- [x] mensaje de retry / `Retry-After`
- [x] límite global de body
- [x] configuración/validación de variables de entorno prevista con Joi
- [x] rama de trabajo de seguridad planificada como `feature/security`

## Comprobar antes de continuar

Codex debe inspeccionar el repositorio real y confirmar cuáles de estos cambios están efectivamente presentes y comiteados.

NO asumir que una instrucción previa equivale a código aplicado.

Ejecutar como mínimo:

```bash
git status
git branch --show-current
npm run build
npx dbmate status
```

y revisar:

```text
backend/src/main.ts
backend/src/app.module.ts
backend/src/database/
backend/src/health/
backend/.env.example
```

---

# 10. DATABASE SERVICE

La conexión utiliza `pg.Pool`.

Debe existir conceptualmente:

```text
backend/src/database/
├── database.module.ts
└── database.service.ts
```

`DatabaseService`:

- obtiene `DATABASE_URL`;
- crea un único Pool;
- permite `query<T>()`;
- comprueba conexión;
- cierra pool al apagar Nest.

No crear un Pool nuevo por request.

---

# 11. HEALTH

Endpoint:

```http
GET /api/v1/health
```

Debe comprobar realmente PostgreSQL, por ejemplo mediante:

```sql
SELECT 1
```

Respuesta saludable:

```json
{
  "status": "ok",
  "database": "connected"
}
```

Si PostgreSQL falla, devolver un error apropiado, preferentemente `503 Service Unavailable`.

---

# 12. SEGURIDAD BASE GLOBAL

Configurar globalmente:

## ValidationPipe

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
})
```

Objetivo:

- rechazar propiedades no declaradas;
- validar DTOs;
- transformar correctamente entradas.

## Helmet

Usar:

```ts
app.use(helmet());
```

No desactivar protecciones sin motivo.

## CORS

Durante desarrollo:

```text
FRONTEND_URL=http://localhost:5173
```

Configurar:

```ts
credentials: true
```

porque se utilizarán cookies HttpOnly para refresh token.

No usar `origin: '*'` junto con credenciales.

## Rate limiting

Usar `@nestjs/throttler`.

Objetivo global aproximado:

```text
100 requests / 60 segundos
```

Con límites específicos más estrictos posteriormente:

```text
login           ~5/min
2FA             ~5/min
password forgot ~3/min
booking público límite propio
```

La respuesta 429 debe permitir conocer cuándo reintentar.

## Body size

Mantener un límite global razonable.

Aproximadamente:

```text
1 MB
```

Para uploads se usarán endpoints/límites específicos, no aumentar globalmente sin necesidad.

## Variables de entorno

Validar al arranque.

Variables base:

```text
NODE_ENV
PORT
DATABASE_URL
FRONTEND_URL
```

Posteriormente:

```text
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
TOTP_ENCRYPTION_KEY
RESEND_API_KEY
SENTRY_DSN
```

La aplicación debe fallar al arrancar si falta una variable crítica.

---

# 13. AUTENTICACIÓN

Este es el siguiente gran bloque pendiente.

No tratar Auth como CRUD.

Generar con Nest si hace falta:

```bash
npx nest g resource auth
```

Seleccionar:

```text
REST API
No CRUD
```

Estructura esperada:

```text
src/auth/
├── dto/
├── auth.controller.ts
├── auth.controller.spec.ts
├── auth.service.ts
├── auth.service.spec.ts
├── auth.module.ts
└── users.repository.ts
```

---

# 14. PASSWORDS

Usar:

```text
Argon2id
```

Paquete:

```bash
npm install argon2
```

Nunca guardar passwords en texto plano.

Nunca usar SHA-256 directamente para contraseñas.

Nunca devolver:

```text
password_hash
```

al cliente.

---

# 15. REGISTER

Endpoint:

```http
POST /api/v1/auth/register
```

DTO aproximado:

```text
email
password
```

Validaciones:

- email válido;
- máximo 320 chars;
- password mínimo 12;
- password máximo 128.

Normalizar email:

```text
trim
lowercase
```

Comprobar duplicados.

La DB ya tiene índice unique case-insensitive en `LOWER(email)`.

Ante duplicado:

```text
409 Conflict
```

Usar SQL parametrizado.

Respuesta NO debe incluir password hash.

---

# 16. LOGIN

Pendiente:

```http
POST /api/v1/auth/login
```

Flujo:

```text
LoginDto
↓
buscar usuario por email
↓
argon2.verify()
↓
comprobar estado
↓
comprobar 2FA si aplica
↓
generar access token
↓
generar refresh token
↓
guardar hash del refresh token en user_sessions
↓
enviar refresh token por cookie HttpOnly
```

Evitar enumeración innecesaria de usuarios.

Aplicar rate limit específico.

---

# 17. JWT Y REFRESH TOKENS

## Access token

- corta duración;
- enviado como Bearer token;
- contiene únicamente claims necesarios.

## Refresh token

- mayor duración;
- cookie HttpOnly;
- `Secure` en producción;
- `SameSite` configurado adecuadamente;
- NO almacenar token raw en DB;
- guardar hash en `user_sessions`.

Endpoints:

```http
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

Rotar refresh tokens cuando corresponda.

Permitir revocación de sesiones.

---

# 18. USER SESSIONS

Tabla ya creada:

```text
user_sessions
```

Campos principales:

```text
id
user_id
refresh_token_hash
user_agent
ip_address
expires_at
last_used_at
revoked_at
created_at
```

Objetivos:

- sesiones por dispositivo;
- revocación;
- logout;
- refresh token rotation;
- trazabilidad de sesión.

---

# 19. EMAIL VERIFICATION

Endpoint previsto:

```http
POST /api/v1/auth/email/verify
```

Usar `user_tokens`.

Nunca guardar token raw.

Flujo:

```text
generar token criptográficamente seguro
↓
guardar hash
↓
enviar raw token por email
↓
usuario lo devuelve
↓
hash
↓
comparar
↓
validar expiración / used_at
↓
marcar email_verified_at
```

---

# 20. PASSWORD RESET

Endpoints:

```http
POST /api/v1/auth/password/forgot
POST /api/v1/auth/password/reset
```

Usar `user_tokens`.

Después de cambiar password:

- marcar token usado;
- considerar revocar sesiones anteriores;
- no revelar fácilmente si un email existe.

Rate limiting específico.

---

# 21. 2FA

Usar TOTP + recovery codes.

SUPERADMIN:

```text
2FA obligatorio
```

OWNER/ADMIN:

```text
configurable
```

Endpoints:

```http
POST /api/v1/auth/2fa/setup
POST /api/v1/auth/2fa/verify
POST /api/v1/auth/2fa/recovery
```

Tabla:

```text
user_two_factor
user_recovery_codes
```

TOTP secret:

- cifrado;
- nunca texto plano.

Recovery codes:

- guardar hash;
- one-time use.

---

# 22. AUTORIZACIÓN

Después de Auth:

## JwtAuthGuard

Debe:

- validar JWT;
- cargar usuario;
- colocar identidad en request.

## CurrentUser

Crear decorador:

```text
@CurrentUser()
```

para evitar repetir acceso manual a request.

## Roles

Roles tenant:

```text
OWNER
ADMIN
MANAGER
EMPLOYEE
CLIENT
```

SUPERADMIN es global.

Crear:

```text
@Roles(...)
RolesGuard
```

## Permissions

Preferir permisos explícitos para operaciones.

Ejemplos:

```text
appointments.create
appointments.update
appointments.cancel
appointments.reassign
calendar.block
employees.manage
customers.manage
reports.view
reports.export
settings.manage
```

Para MVP, mapear permisos en código NestJS.

No crear sistema de roles custom complejo en V1.

---

# 23. ORGANIZATION GUARD / MULTITENANT SECURITY

Validar:

```text
organization_memberships
```

Un usuario sólo puede acceder a un organizationId si corresponde.

Devolver:

```text
403 Forbidden
```

cuando proceda.

También mantener aislamiento en SQL.

Nunca confiar exclusivamente en un Guard si la query puede filtrar por tenant.

---

# 24. DATA MODEL EXISTENTE

La migración inicial contiene aproximadamente estas tablas:

```text
organizations
organization_settings
organization_locales
users
user_sessions
user_two_factor
user_recovery_codes
user_tokens
organization_memberships
employees
service_categories
services
employee_services
customers
loyalty_levels
loyalty_transactions
employee_working_hours
calendar_blocks
appointments
appointment_access_tokens
plans
organization_subscriptions
notifications
audit_logs
```

---

# 25. CONVENCIONES DE BASE DE DATOS

Usar:

```text
UUID
TIMESTAMPTZ
DATE
TIME
NUMERIC(10,2)
INTEGER para minutos
BOOLEAN
VARCHAR
INET
JSONB
```

IDs:

```sql
UUID DEFAULT gen_random_uuid()
```

Extensiones:

```text
pgcrypto
btree_gist
```

---

# 26. ORGANIZATIONS

Campos principales:

```text
id
name
slug
email
phone
timezone
currency_code
status
logo_url
primary_color
created_at
updated_at
```

Slugs case-insensitive unique.

Estados principales:

```text
ACTIVE
SUSPENDED
```

---

# 27. ORGANIZATION SETTINGS

Contiene:

```text
minimum_booking_notice_minutes
maximum_booking_advance_days
same_day_booking
slot_interval_minutes
minimum_cancel_notice_minutes
minimum_reschedule_notice_minutes
auto_confirm_appointments
allow_guest_booking
require_2fa_for_admins
loyalty_enabled
loyalty_earning_mode
points_per_currency_unit
points_per_completed_appointment
```

---

# 28. USERS

Campos principales:

```text
id
email
password_hash
email_verified_at
preferred_locale
is_superadmin
status
last_login_at
created_at
updated_at
```

Email unique case-insensitive.

---

# 29. ORGANIZATION MEMBERSHIPS

Relaciona:

```text
user
organization
role
status
```

Roles:

```text
OWNER
ADMIN
MANAGER
EMPLOYEE
CLIENT
```

---

# 30. EMPLOYEES

Campos:

```text
id
organization_id
user_id nullable
first_name
last_name
email
phone
color
is_active
notes
created_at
updated_at
archived_at
```

Un empleado puede existir sin cuenta.

OWNER/ADMIN puede potencialmente ser también empleado si se modela mediante employee asociado a su user.

---

# 31. SERVICES

Campos:

```text
id
organization_id
category_id
name
description
price
duration_minutes
buffer_before_minutes
buffer_after_minutes
minimum_booking_notice_minutes
maximum_booking_advance_days
same_day_booking
is_active
created_at
updated_at
archived_at
```

Overrides en `NULL` heredan settings de la organización.

---

# 32. EMPLOYEE SERVICES

Many-to-many:

```text
employee_services
```

Valida que empleado y servicio pertenezcan a la misma organización.

---

# 33. CUSTOMERS

Campos:

```text
id
organization_id
user_id nullable
loyalty_level_id
first_name
last_name
email
phone
notes
points_balance
created_at
updated_at
anonymized_at
```

Guest:

```text
user_id IS NULL
```

Registered:

```text
user_id IS NOT NULL
```

No necesita `is_registered`.

---

# 34. EMPLOYEE WORKING HOURS

Turnos recurrentes:

```text
employee_id
day_of_week
start_time
end_time
valid_from
valid_to
```

Permitir turnos partidos mediante varias filas.

---

# 35. CALENDAR BLOCKS

Tipos:

```text
BREAK
MEETING
VACATION
ABSENCE
PERSONAL
HOLIDAY
MANUAL_BLOCK
OTHER
```

`employee_id NULL` puede representar cierre/bloqueo global de empresa.

---

# 36. APPOINTMENTS

Campos principales:

```text
id
organization_id
reference_code
customer_id
employee_id
service_id
status
start_at
end_at
occupied_start_at
occupied_end_at
duration_minutes
buffer_before_minutes
buffer_after_minutes
price_amount
currency_code
customer_notes
internal_notes
created_by_user_id
cancellation_actor
cancellation_reason
cancelled_at
completed_at
created_at
updated_at
```

Statuses:

```text
PENDING
CONFIRMED
COMPLETED
CANCELLED
NO_SHOW
```

Snapshot:

- precio;
- duración;
- buffers;
- moneda.

Así los cambios futuros del servicio no alteran el histórico.

---

# 37. PREVENCIÓN DE DOBLE RESERVA

Existe/está previsto constraint PostgreSQL mediante:

```text
EXCLUDE USING gist
```

sobre:

```text
employee_id
organization_id
tstzrange(occupied_start_at, occupied_end_at)
```

aplicable a:

```text
PENDING
CONFIRMED
```

La API además debe comprobar disponibilidad antes de insertar.

La constraint es la última barrera frente a condiciones de carrera.

Debe existir test concurrente.

---

# 38. APPOINTMENT ACCESS TOKENS

Sirven para clientes invitados.

Flujo:

```text
guest reserva
↓
generar token
↓
guardar hash
↓
enviar raw token por email
↓
cliente accede a enlace
↓
validar hash + expiry + revoked_at
```

No confundir con `user_tokens`.

---

# 39. LOYALTY

V1:

La configuracion de Loyalty es por `business_id`. Cada empresa define una
regla por defecto y cada servicio puede usar `INHERIT`, `NONE`, `FIXED`,
`AMOUNT_MULTIPLIER` o `BOTH`. La regla efectiva debe guardarse como snapshot
en la cita para que los cambios posteriores del servicio no alteren el
historico.

Una cita solo concede puntos cuando esta `COMPLETED` y
`counts_toward_membership` es `true`. El ledger es inmutable: cambiar esa
elegibilidad debe crear una concesion o una reversion, nunca editar o borrar
movimientos anteriores. Cada cambio de saldo recalcula el nivel activo del
cliente segun el nivel activo con mayor `minimum_points` alcanzado.

- gana puntos;
- categorías/niveles;
- no se pagan servicios con puntos todavía.

Modes:

```text
MONEY
APPOINTMENTS
BOTH
```

No dar puntos a:

```text
CANCELLED
NO_SHOW
```

Tabla ledger:

```text
loyalty_transactions
```

Mantener consistencia con:

```text
customers.points_balance
```

Pendiente posterior a Loyalty V1:

- canje de puntos, consumiendo primero los que caducan antes (FIFO);
- recompensas, cupones o pago parcial con puntos.

---

# 40. PLANS / SUBSCRIPTIONS

Planes previstos:

```text
TRIAL
BASIC
PRO
BUSINESS
```

Estados:

```text
TRIAL
ACTIVE
EXPIRED
SUSPENDED
```

No integrar pagos reales/Stripe en MVP.

---

# 41. NOTIFICATIONS

Tabla:

```text
notifications
```

Canales:

```text
EMAIL
```

SMS reservado para V2 aunque el schema pueda contemplarlo.

Usar:

```text
Resend
pg-boss
```

Emails:

- email verification;
- password reset;
- appointment created;
- appointment modified;
- appointment cancelled;
- reminders.

---

# 42. AUDIT LOG

Tabla:

```text
audit_logs
```

Registrar:

```text
organization_id
actor_user_id
action
entity_type
entity_id
old_values
new_values
request_id
ip_address
created_at
```

Separar auditoría de negocio de logs técnicos.

---

# 43. ENDPOINTS V1

Prefijo:

```text
/api/v1
```

## Health

```http
GET /health
```

## Auth

```http
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
POST /auth/email/verify
POST /auth/password/forgot
POST /auth/password/reset
POST /auth/2fa/setup
POST /auth/2fa/verify
POST /auth/2fa/recovery
```

## Organizations

```http
POST  /organizations
GET   /organizations
GET   /organizations/:organizationId
PATCH /organizations/:organizationId
GET   /organizations/:organizationId/settings
PATCH /organizations/:organizationId/settings
GET   /organizations/:organizationId/members
```

## Employees

```http
GET    /organizations/:organizationId/employees
POST   /organizations/:organizationId/employees
GET    /organizations/:organizationId/employees/:employeeId
PATCH  /organizations/:organizationId/employees/:employeeId
DELETE /organizations/:organizationId/employees/:employeeId
```

DELETE preferentemente soft-delete:

```text
is_active = false
archived_at = NOW()
```

## Working hours

```http
GET /organizations/:organizationId/employees/:employeeId/working-hours
PUT /organizations/:organizationId/employees/:employeeId/working-hours
```

## Calendar blocks

```http
GET    /organizations/:organizationId/calendar/blocks
POST   /organizations/:organizationId/calendar/blocks
PATCH  /organizations/:organizationId/calendar/blocks/:blockId
DELETE /organizations/:organizationId/calendar/blocks/:blockId
```

## Service categories

```http
GET    /organizations/:organizationId/service-categories
POST   /organizations/:organizationId/service-categories
PATCH  /organizations/:organizationId/service-categories/:categoryId
DELETE /organizations/:organizationId/service-categories/:categoryId
```

## Services

```http
GET    /organizations/:organizationId/services
POST   /organizations/:organizationId/services
GET    /organizations/:organizationId/services/:serviceId
PATCH  /organizations/:organizationId/services/:serviceId
DELETE /organizations/:organizationId/services/:serviceId
PUT    /organizations/:organizationId/services/:serviceId/employees
```

## Customers

```http
GET    /organizations/:organizationId/customers
POST   /organizations/:organizationId/customers
GET    /organizations/:organizationId/customers/:customerId
PATCH  /organizations/:organizationId/customers/:customerId
DELETE /organizations/:organizationId/customers/:customerId
```

## Availability

```http
GET /organizations/:organizationId/availability
```

Debe considerar:

- servicio;
- duración;
- buffers;
- empleados capaces;
- working hours;
- blocks;
- vacation;
- absence;
- holidays;
- appointments;
- minimum notice;
- maximum advance;
- same-day booking;
- slots;
- timezone;
- impedir pasado.

## Appointments

```http
GET  /organizations/:organizationId/appointments
POST /organizations/:organizationId/appointments
GET   /organizations/:organizationId/appointments/:appointmentId
PATCH /organizations/:organizationId/appointments/:appointmentId
POST  /organizations/:organizationId/appointments/:appointmentId/cancel
POST  /organizations/:organizationId/appointments/:appointmentId/complete
POST  /organizations/:organizationId/appointments/:appointmentId/no-show
POST  /organizations/:organizationId/appointments/:appointmentId/reassign
```

## Public booking

```http
GET  /public/:organizationSlug/services
GET  /public/:organizationSlug/employees
GET  /public/:organizationSlug/availability
POST /public/:organizationSlug/appointments

GET   /public/appointments/:token
PATCH /public/appointments/:token
POST  /public/appointments/:token/cancel
```

## Loyalty

```http
GET    /organizations/:organizationId/loyalty/levels
POST   /organizations/:organizationId/loyalty/levels
PATCH  /organizations/:organizationId/loyalty/levels/:levelId
DELETE /organizations/:organizationId/loyalty/levels/:levelId

GET  /organizations/:organizationId/customers/:customerId/loyalty
POST /organizations/:organizationId/customers/:customerId/loyalty/adjust
```

## Reports

```http
GET /organizations/:organizationId/reports/overview
GET /organizations/:organizationId/reports/appointments
GET /organizations/:organizationId/reports/employees
```

Filtros:

```text
from
to
```

Export:

```text
CSV
XLSX
```

## Audit

```http
GET /organizations/:organizationId/audit-logs
```

## SUPERADMIN

```http
GET   /admin/dashboard
GET   /admin/metrics
GET   /admin/organizations
GET   /admin/organizations/:organizationId
PATCH /admin/organizations/:organizationId/status
GET   /admin/plans
GET   /admin/organizations/:organizationId/subscription
PATCH /admin/organizations/:organizationId/subscription
```

Requerir:

```text
is_superadmin = true
2FA
```

---

# 44. FULLCALENDAR Y DISPONIBILIDAD

Calendario:

- día;
- semana;
- mes;
- citas;
- bloques.

Availability debe calcularse en backend.

No confiar en slots calculados sólo por frontend.

El backend debe volver a verificar disponibilidad al:

- crear;
- modificar;
- reasignar.

---

# 45. REASIGNACIÓN

OWNER/ADMIN puede mover cita:

- de empleado;
- de hora;
- ambos.

Validar:

- servicio compatible;
- employee_services;
- working hours;
- blocks;
- buffers;
- citas existentes.

Registrar en audit log.

---

# 46. RESTRICCIONES DE RESERVA

Configurable por organización:

```text
minimum_booking_notice_minutes
maximum_booking_advance_days
same_day_booking
minimum_cancel_notice_minutes
minimum_reschedule_notice_minutes
slot_interval_minutes
```

Los servicios pueden tener overrides.

Nunca reservar en el pasado.

---

# 47. TIMEZONES

Cada organización tiene timezone IANA, por ejemplo:

```text
Atlantic/Canary
Europe/Madrid
```

Guardar instantes reales en:

```text
TIMESTAMPTZ
```

Tratar conversión de timezone explícitamente.

No asumir timezone del servidor.

---

# 48. FRONTEND

Frontend:

```text
frontend/
```

React + Vite + TS.

UI:

- Mantine;
- limpia;
- profesional;
- responsive;
- PWA;
- sidebar desktop;
- drawer/compact mobile.

Inspiración conceptual:

- Linear
- Stripe Dashboard
- Calendly
- Vercel

No copiar diseños.

Evitar:

- exceso de gradientes;
- sombras fuertes;
- botones gigantes;
- demasiados colores;
- animaciones innecesarias.

---

# 49. BRANDING

Nombre:

```text
BUKIOO
```

Producto:

```text
SaaS de citas/reservas multiempresa
```

La identidad visual debe mantenerse coherente cuando se implemente.

---

# 50. API RESPONSE SAFETY

Nunca devolver:

```text
password_hash
refresh_token_hash
TOTP secret
recovery code hash
token hash
secrets
internal credentials
```

No exponer detalles internos de errores en producción.

---

# 51. LOGGING

Usar:

```text
Pino / nestjs-pino
```

Logs técnicos.

No registrar:

- passwords;
- tokens;
- Authorization headers;
- cookies sensibles;
- secrets.

Usar request IDs cuando sea posible.

---

# 52. SENTRY

Usar para excepciones.

No enviar secretos ni payloads sensibles.

Configurar por entorno.

---

# 53. PGBOSS

Usar `pg-boss` sobre PostgreSQL.

NO añadir Redis en MVP.

Jobs:

- caducidad individual de puntos cada hora;
- avisos de puntos proximos a caducar a 30 y 7 dias;
- emails;
- recordatorios de citas confirmadas a 24 horas;
- background work.

Worker separado si resulta limpio:

```text
api
worker
postgres
frontend
```

---

# 54. TESTING OBLIGATORIO

No dejar toda la cobertura para el final.

Añadir tests al completar módulos importantes.

Especialmente:

## Auth

- register válido;
- email inválido;
- password corto;
- duplicate email;
- login válido;
- login incorrecto;
- refresh;
- logout;
- JWT expirado;
- sesiones revocadas.

## Multiempresa

Caso crítico:

```text
usuario organization A
intenta acceder a organization B
→ 403 / no datos
```

## Availability

- horario;
- blocks;
- appointments;
- buffers;
- past;
- min notice;
- max advance;
- same day.

## Concurrency

Simular dos reservas simultáneas para mismo employee/time.

Sólo una debe sobrevivir.

---

# 55. MIGRACIONES

Usar:

```bash
npx dbmate new nombre_migracion
npx dbmate up
npx dbmate status
npx dbmate rollback
```

Las migraciones se encuentran en:

```text
backend/db/migrations/
```

Nunca modificar migraciones ya aplicadas y compartidas.

Para cambios nuevos:

```bash
npx dbmate new add_x
```

Las migraciones deben tener:

```sql
-- migrate:up

...

-- migrate:down

...
```

Sólo un marcador exacto de cada tipo por migración.

---

# 56. MIGRATION SAFETY

Antes de una migración destructiva:

- explicar el impacto;
- comprobar datos;
- proporcionar rollback cuando sea razonable.

No borrar tablas/columnas con datos sin revisar.

---

# 57. DOCKER

PostgreSQL:

```text
bukioo-postgres
postgres:17
```

Comandos raíz:

```bash
npm run docker:up
npm run docker:ps
npm run docker:logs
npm run docker:down
```

Para desarrollo:

```bash
npm run dev
```

Docker Desktop debe estar iniciado en Windows.

---

# 58. DESARROLLO LOCAL

URLs:

```text
Frontend:
http://localhost:5173

Backend:
http://localhost:3000

Health:
http://localhost:3000/api/v1/health
```

Un `404 Cannot GET /` en `localhost:3000/` es normal si no existe endpoint raíz.

---

# 59. ENVIRONMENT

No asumir que root `.env` y backend `.env` son iguales.

Root `.env`:

principalmente Docker Compose.

Backend `.env`:

configuración de NestJS.

Ejemplo backend:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://bukioo:change_me@localhost:5432/bukioo?sslmode=disable
FRONTEND_URL=http://localhost:5173
```

Posteriormente añadir secretos Auth.

---

# 60. README

Mantener documentación actualizada cuando cambie:

- instalación;
- comandos;
- variables;
- migraciones;
- arquitectura;
- scripts;
- licencia.

No documentar como completado algo que todavía no existe.

---

# 61. ROADMAP OFICIAL DE BACKEND

## Fase 0 — Infraestructura

- [x] PostgreSQL Docker
- [x] migraciones
- [x] DatabaseModule
- [x] DatabaseService
- [x] pg.Pool
- [x] health

## Fase 1 — Seguridad base

- [x] ValidationPipe
- [x] whitelist
- [x] forbidNonWhitelisted
- [x] transform
- [x] Helmet
- [x] CORS
- [x] rate limiting
- [x] body limit
- [x] verificar/terminar validación env si falta
- [ ] revisar configuración final de seguridad base

## Fase 2 — Auth

- [ ] AuthModule
- [ ] UsersRepository
- [ ] RegisterDto
- [ ] register
- [ ] LoginDto
- [ ] login
- [ ] JWT
- [ ] refresh
- [ ] user_sessions
- [ ] logout
- [ ] `/auth/me`
- [ ] email verification
- [ ] forgot/reset password
- [ ] 2FA

## Fase 3 — Autorización

- [ ] JwtAuthGuard
- [ ] CurrentUser
- [ ] RolesGuard
- [ ] PermissionsGuard
- [ ] Organization membership guard
- [ ] tenant isolation

## Fase 4 — Organizations

- [ ] resource
- [ ] repository
- [ ] CRUD necesario
- [ ] settings
- [ ] members

## Fase 5 — Employees

- [ ] resource
- [ ] repository
- [ ] CRUD
- [ ] soft delete

## Fase 6 — Services

- [ ] categories
- [ ] services
- [ ] employee_services

## Fase 7 — Customers

- [ ] CRUD
- [ ] guest/registered handling
- [ ] anonymization

## Fase 8 — Working Hours

- [ ] GET
- [ ] PUT
- [ ] split shifts

## Fase 9 — Calendar Blocks

- [ ] CRUD
- [ ] organization-wide blocks

## Fase 10 — Availability

- [ ] engine
- [ ] tests

## Fase 11 — Appointments

- [ ] CRUD/actions
- [ ] concurrency
- [ ] reassign
- [ ] auditing

## Fase 12 — Public Booking

- [ ] services
- [x] employees
- [ ] availability
- [ ] create
- [ ] manage token

## Fase 13 — Notifications

- [x] Resend
- [x] pg-boss
- [x] worker de caducidad de Loyalty
- [x] avisos de puntos proximos a caducar
- [x] reminders
- [x] internal notification history
- [x] per-business reminder settings

## Fase 14 — Loyalty

- [x] levels
- [x] earning
- [x] ledger
- [x] adjustments
- [x] expiration worker
- [x] expiration notices and reminders
- [x] point redemption FIFO

## Fase 15 — Reports

- [x] overview
- [x] appointments
- [x] employees
- [x] CSV
- [x] XLSX

## Fase 16 — Audit

- [x] write service
- [x] read endpoint

## Fase 17 — SUPERADMIN

- [x] dashboard
- [x] metrics
- [x] organizations
- [x] plans/subscriptions
- [x] required 2FA

## Fase 18 — Hardening final

- [x] Pino
- [ ] Sentry
- [ ] brute force tuning
- [x] cookie review
- [x] HTTPS/proxy awareness
- [x] dependency review
- [x] secret review

## Fase 19 — Testing completo

- [ ] Vitest
- [x] Supertest
- [ ] Playwright
- [ ] concurrency
- [ ] tenant isolation

## Fase 20 — Deployment

- [ ] Docker production
- [ ] Dockge
- [ ] Nginx Proxy Manager
- [ ] Cloudflare Tunnel si procede
- [ ] backups
- [ ] restore test
- [ ] GitHub Actions

---

# 62. FUNCIONALIDADES V2 — NO IMPLEMENTAR EN MVP SIN PEDIRLO

Mantener fuera de V1 si no hay cambio explícito:

- SMS real
- WebAuthn / Passkeys
- SSE / WebSockets
- Redis
- pagos con puntos
- rewards/redemptions complejos
- Stripe real
- roles custom
- API keys
- webhooks externos
- waiting list
- marketplace
- multimoneda avanzada
- analítica avanzada
- integraciones externas complejas
- multi-location completo si complica el MVP

---

# 63. BACKUPS

Producción debe contemplar:

```text
pg_dump
compresión
retención
restore script
restore probado
```

Un backup no se considera fiable si nunca se ha probado restaurarlo.

---

# 64. REGLA DE SIMPLICIDAD

El proyecto es portfolio y originalmente tiene objetivo aproximado de:

```text
3 semanas / ~100 horas
```

Por tanto:

- evitar sobrearquitectura;
- evitar microservicios;
- evitar Redis;
- evitar event-driven complejo;
- evitar sistemas custom de permisos demasiado sofisticados;
- mantener Nest modular;
- mantener SQL claro;
- priorizar seguridad y funcionalidad core.

---

# 65. CÓMO USAR `nest g resource`

Para módulos CRUD:

```bash
npx nest g resource organizations
npx nest g resource employees
npx nest g resource services
npx nest g resource customers
npx nest g resource appointments
```

Seleccionar REST API.

Generar CRUD sólo cuando el recurso realmente sea CRUD.

Para:

```text
health
auth
availability
reports
audit
```

puede ser mejor `No` al CRUD y crear endpoints específicos.

Los resources generados pueden crear `entities/`.

Como no usamos ORM:

- no añadir decoradores TypeORM;
- no utilizar entities como ORM models;
- pueden sustituirse por interfaces/types cuando convenga.

IDs son UUID, no números.

Eliminar conversiones generadas como:

```ts
+id
```

Usar:

```text
ParseUUIDPipe
```

cuando corresponda.

---

# 66. NOTAS SOBRE CORS

CORS NO bloquea curl, Postman o llamadas server-to-server.

Seguridad real:

```text
authentication
authorization
tenant isolation
validation
rate limiting
```

No intentar detectar/bloquear herramientas como curl.

---

# 67. STATUS CODES

Usar códigos HTTP coherentes.

Ejemplos:

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 si se decide usar para alguna validación semántica
429 Too Many Requests
503 Service Unavailable
```

No devolver 200 para errores.

---

# 68. EMAIL ENUMERATION

En endpoints como forgot password, evitar respuestas que permitan saber fácilmente si un email existe.

Ejemplo conceptual:

```text
"Si existe una cuenta asociada, recibirás un email."
```

---

# 69. SOFT DELETE

Preferir soft delete para entidades con histórico importante:

```text
employees
services
```

Campos:

```text
is_active
archived_at
```

No borrar citas históricas asociadas.

---

# 70. REPORTS

Métricas de empresa:

- citas/día;
- citas por rango;
- cancelaciones;
- no-shows;
- occupancy;
- popular services;
- employee performance;
- available hours;
- occupied hours.

Exports:

- CSV primero;
- XLSX;
- PDF sólo si sobra tiempo o se solicita.

---

# 71. SUPERADMIN

SUPERADMIN es global.

Debe tener:

- métricas globales;
- empresas;
- trials;
- subscriptions;
- suspensiones;
- planes.

2FA obligatorio.

No confundir `is_superadmin` con tenant roles.

---

# 72. CLIENTE INVITADO

Cliente puede reservar sin cuenta.

Datos mínimos:

```text
name
email
phone
```

Después recibe link seguro para gestionar esa cita.

No crear una cuenta silenciosamente salvo diseño explícito.

---

# 73. REGISTERED CLIENT

Si tiene cuenta:

- próximas citas;
- histórico;
- cancelación/reprogramación según reglas;
- puntos;
- nivel;
- perfil.

---

# 74. EMAIL PROVIDER ABSTRACTION

No acoplar toda la aplicación directamente a Resend.

Crear:

```text
EmailProvider / EmailService
```

de forma que proveedor sea reemplazable.

---

# 75. AUDITORÍA VS LOGS

No mezclar:

```text
Pino
```

con:

```text
audit_logs
```

Pino:

- diagnóstico técnico.

Audit:

- acciones de negocio.

Ejemplo audit:

```text
APPOINTMENT_REASSIGNED
```

con old/new values.

---

# 76. DISPONIBILIDAD Y CONCURRENCIA

Availability sirve para UX.

La constraint de PostgreSQL sirve como garantía final.

Nunca asumir:

```text
"si hace 10 segundos estaba libre, seguirá libre"
```

Crear cita dentro de una operación segura y capturar conflicto de constraint.

---

# 77. RESPUESTAS DEL API

Mantener nombres consistentes.

DB puede usar snake_case.

API puede usar camelCase.

No mezclar arbitrariamente.

Ejemplo:

DB:

```text
email_verified_at
```

API:

```text
emailVerifiedAt
```

Crear mapping explícito cuando sea necesario.

---

# 78. README BACKEND

Debe documentar:

- NestJS
- pg
- dbmate
- migraciones
- PostgreSQL
- env
- comandos
- arquitectura Controller → Service → Repository
- seguridad
- testing real actual

No afirmar que PostgreSQL no está integrado si ya lo está.

---

# 79. ESTADO DE GITHUB

Codex debe comprobar el estado real antes de asumir:

```bash
git remote -v
git branch -vv
```

Si GitHub aún no está configurado, seguir estrategia definida.

Repo deseado:

```text
bukioo
Public
All Rights Reserved
```

No crear repo duplicado.

---

# 80. COMMIT STYLE

Usar Conventional Commits de forma sencilla.

Ejemplos:

```text
feat: add backend security foundation
feat: add user registration
feat: add jwt authentication
fix: handle appointment overlap
docs: update backend setup
test: add tenant isolation tests
chore: configure linting
```

Commits pequeños y coherentes.

---

# 81. CI FUTURA

GitHub Actions debe ejecutar aproximadamente:

```text
install
lint
tests
build
```

No desplegar automáticamente al servidor en MVP si no se solicita.

Deployment manual via Dockge.

---

# 82. REVISIÓN DE DEPENDENCIAS

Antes de añadir una librería:

1. comprobar si Nest/Node ya lo resuelve;
2. justificar por qué es necesaria;
3. evitar dependencias duplicadas;
4. preferir librerías mantenidas.

No añadir paquetes “por si acaso”.

---

# 83. PRIORIDADES DE SEGURIDAD

Especial atención a:

- SQL injection;
- broken access control;
- tenant leakage;
- JWT handling;
- refresh token theft;
- brute force;
- password storage;
- 2FA;
- CORS;
- CSRF del flujo de cookie refresh;
- secrets;
- logs;
- rate limiting;
- concurrency bookings;
- object-level authorization.

---

# 84. CSRF

El access token irá normalmente mediante Authorization header.

Refresh token mediante HttpOnly cookie.

Cuando se implemente el flujo completo de refresh, revisar explícitamente riesgo CSRF y la configuración:

```text
SameSite
Secure
origin checks
cookie scope
```

No dar por resuelto CSRF sólo por usar JWT.

---

# 85. OBJETIVO DE CADA PASO CON CODEX

Ejemplo de cómo debe trabajar Codex:

```text
Paso actual: POST /auth/register

1. inspeccionar archivos actuales;
2. explicar plan;
3. instalar argon2 si no existe;
4. crear RegisterDto;
5. crear UsersRepository;
6. registrar provider;
7. implementar AuthService.register;
8. implementar AuthController;
9. ejecutar build;
10. probar:
   - válido;
   - email inválido;
   - password corto;
   - campo extra;
   - duplicado;
11. corregir errores;
12. mostrar resumen;
13. STOP.
```

NO continuar automáticamente con login.

Después el usuario puede indicar:

```text
continúa
```

y entonces avanzar al siguiente punto.

---

# 86. FORMATO DE RESPUESTA DE CODEX TRAS CADA PASO

Al terminar un paso, responder brevemente con:

```text
Paso completado:
- ...

Archivos modificados:
- ...

Validaciones:
- npm run build ✅
- endpoint ... ✅
- test ... ✅

Pendiente / observaciones:
- ...

Siguiente paso recomendado:
- ...
```

No ocultar warnings relevantes.

---

# 87. PRIMERA ACCIÓN AL RECIBIR ESTE ARCHIVO

Codex debe:

1. leer este documento completo;
2. ejecutar:

```bash
git status
git branch --show-current
git log --oneline --decorate -10
```

3. inspeccionar:

```text
backend/src/main.ts
backend/src/app.module.ts
backend/src/database/
backend/src/health/
backend/src/auth/
backend/package.json
backend/.env.example
backend/db/migrations/
```

4. ejecutar:

```bash
npm --prefix backend run build
```

5. ejecutar:

```bash
cd backend
npx dbmate status
```

6. comparar el estado REAL con este documento;
7. informar de diferencias;
8. retomar desde el primer punto realmente pendiente.

No reimplementar cosas que ya funcionan.

---

# 88. SIGUIENTE BLOQUE ESPERADO

Salvo que el repositorio real indique otra cosa, el trabajo debería continuar por:

```text
Auth → Register
```

y después, uno a uno:

```text
Register
↓
Login
↓
JWT access token
↓
Refresh token + user_sessions
↓
Logout
↓
/auth/me
↓
Email verification
↓
Password reset
↓
2FA
↓
JwtAuthGuard
↓
Roles / permissions
↓
tenant isolation
```

Cada uno validado antes de continuar.

---

# 89. PRINCIPIO FINAL

BUKIOO debe priorizar:

```text
seguridad
claridad
mantenibilidad
funcionalidad real
simplicidad
```

sobre:

```text
sobrearquitectura
abstracciones innecesarias
tecnologías extra
complejidad sin beneficio
```

Siempre explicar el porqué de las decisiones importantes y mantener el proyecto compilable y verificable tras cada paso.
