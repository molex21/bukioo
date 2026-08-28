# Backend de BUKIOO

API REST de **BUKIOO** desarrollada con NestJS y TypeScript.

El backend será responsable de la autenticación, gestión multiempresa, usuarios, empleados, clientes, servicios, calendarios, reservas, fidelización, licencias, notificaciones y demás lógica de negocio.

## Arquitectura

La arquitectura prevista para el acceso a datos es:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
pg
    ↓
PostgreSQL
```

BUKIOO utiliza **SQL directo**, sin ORM.

No se utilizarán Prisma, TypeORM, Drizzle ni Sequelize.

## Tecnologías y dependencias relevantes

- Node.js
- NestJS 11
- TypeScript 5
- Express como adaptador HTTP de NestJS
- PostgreSQL
- `pg` como cliente PostgreSQL
- `dbmate` para migraciones SQL
- `@nestjs/jwt` para access tokens JWT de corta duracion
- `otplib` para codigos TOTP de segundo factor
- Supertest para pruebas de API
- ESLint
- TypeScript ESLint
- Prettier

Actualmente `pg` está instalado, pero todavía debe implementarse la capa de conexión de NestJS con PostgreSQL.

El esquema de la base de datos se gestionará mediante migraciones SQL con `dbmate`.

## Instalación

Desde este directorio:

```bash
npm install
```

También puedes instalar todos los paquetes del repositorio desde la raíz:

```bash
npm run setup
```

## PostgreSQL

PostgreSQL se ejecuta mediante Docker Compose desde la raíz del repositorio.

Antes de ejecutar el backend o las migraciones, asegúrate de que **Docker Desktop esté iniciado y Docker Engine esté funcionando**.

Desde la raíz del proyecto:

```bash
npm run docker:up
```

Comprueba el estado:

```bash
npm run docker:ps
```

Para consultar los logs:

```bash
npm run docker:logs
```

Para detener PostgreSQL:

```bash
npm run docker:down
```

## Variables de entorno

El backend necesita conocer la conexión con PostgreSQL.

Crea:

```text
backend/.env
```

a partir de:

```text
backend/.env.example
```

Ejemplo:

```env
PORT=3000

DATABASE_URL=postgres://bukioo:change_me@localhost:5432/bukioo?sslmode=disable
```

Variables:

| Variable       | Uso                             | Ejemplo                                                             |
| -------------- | ------------------------------- | ------------------------------------------------------------------- |
| `PORT`         | Puerto HTTP de NestJS           | `3000`                                                              |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL | `postgres://bukioo:change_me@localhost:5432/bukioo?sslmode=disable` |

La contraseña debe coincidir con la configurada para PostgreSQL en el `.env` de la raíz utilizado por Docker Compose.

No subas ningún archivo `.env` real al repositorio.

Los archivos `.env.example` deben contener únicamente valores de ejemplo.

> Actualmente NestJS lee `PORT` desde el entorno del proceso. La carga automática del archivo `.env` dentro de la aplicación deberá configurarse cuando se implemente la configuración del backend.

## Migraciones de base de datos

BUKIOO utiliza **dbmate** para versionar y aplicar los cambios del esquema de PostgreSQL.

Las migraciones se almacenan en:

```text
backend/
└── db/
    └── migrations/
```

Los comandos de `dbmate` deben ejecutarse desde:

```text
backend/
```

Antes de ejecutar cualquier migración, PostgreSQL debe estar iniciado.

Desde la raíz:

```bash
npm run docker:up
```

Después entra en el backend:

```bash
cd backend
```

### Crear una migración

```bash
npx dbmate new nombre_migracion
```

Ejemplo para crear el esquema inicial:

```bash
npx dbmate new init_schema
```

Dbmate generará un archivo similar a:

```text
db/migrations/20260819090000_init_schema.sql
```

Dentro del archivo se escribe directamente SQL.

Ejemplo:

```sql
-- migrate:up

CREATE TABLE example (
    id UUID PRIMARY KEY
);

-- migrate:down

DROP TABLE example;
```

`migrate:up` contiene los cambios que deben aplicarse.

`migrate:down` contiene los cambios necesarios para revertirlos.

### Aplicar migraciones

```bash
npx dbmate up
```

Dbmate aplicará todas las migraciones pendientes en orden.

### Consultar el estado

```bash
npx dbmate status
```

### Revertir la última migración

```bash
npx dbmate rollback
```

### Crear cambios posteriores

Una migración que ya haya sido aplicada **no debe modificarse**.

Si posteriormente necesitamos cambiar el esquema:

```bash
npx dbmate new add_loyalty_levels
```

Por ejemplo:

```text
db/migrations/
├── 20260819090000_init_schema.sql
├── 20260820100000_add_loyalty_levels.sql
└── 20260821120000_add_notifications.sql
```

Después:

```bash
npx dbmate up
```

## Acceso manual a PostgreSQL

Para acceder directamente a PostgreSQL desde la terminal:

```bash
docker exec -it bukioo-postgres psql -U bukioo -d bukioo
```

Una vez dentro de `psql`, puedes listar las tablas:

```sql
\dt
```

Consultar la estructura de una tabla:

```sql
\d nombre_tabla
```

Ejecutar una consulta:

```sql
SELECT * FROM organizations;
```

Salir:

```sql
\q
```

## Ejecución

Antes de iniciar NestJS, asegúrate de que PostgreSQL esté funcionando.

Desde este directorio:

```bash
npm run start
npm run start:dev
npm run start:debug
npm run start:prod
```

- `start`: inicia NestJS.
- `start:dev`: inicia NestJS en modo observación.
- `start:debug`: inicia NestJS en modo depuración y observación.
- `start:prod`: ejecuta `dist/main`; requiere haber compilado previamente.

Por defecto, la API escucha en:

```text
http://localhost:3000
```

Para desarrollo normal desde la raíz del repositorio se recomienda:

```bash
npm run dev
```

Ese comando inicia el entorno de desarrollo del proyecto, incluyendo PostgreSQL, backend y frontend.

## Compilación

```bash
npm run build
```

El resultado compilado de NestJS se genera en:

```text
dist/
```

Desde la raíz también puede ejecutarse:

```bash
npm run compile:backend
```

## Pruebas

Actualmente el proyecto dispone de la configuración de pruebas generada con NestJS.

Comandos disponibles:

```bash
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e
```

La estrategia de testing prevista para BUKIOO es:

```text
Vitest
→ tests unitarios

Supertest
→ API / integración

Playwright
→ E2E desde navegador
```

La configuración actual de Jest deberá sustituirse progresivamente por Vitest para ajustarse al stack definitivo del proyecto.

## Lint y formato

```bash
npm run lint
npm run format
```

Actualmente `lint` aplica correcciones automáticamente mediante `--fix`.

No existe todavía:

```bash
npm run lint:check
```

Por este motivo, el script raíz:

```bash
npm run check:backend
```

y, por extensión:

```bash
npm run check
```

no funcionarán correctamente hasta que se añada un script de comprobación de lint sin modificaciones automáticas.

## Estructura prevista del backend

La aplicación se organizará mediante módulos de NestJS.

Estructura aproximada:

```text
src/
├── auth/
├── database/
├── organizations/
├── users/
├── employees/
├── customers/
├── services/
├── appointments/
├── schedules/
├── calendar/
├── loyalty/
├── subscriptions/
├── notifications/
├── reports/
├── audit/
└── health/
```

Cada módulo seguirá aproximadamente:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
PostgreSQL
```

Las consultas SQL deberán estar encapsuladas principalmente en repositories.

## SQL

Todas las consultas que contengan valores externos deberán ser parametrizadas.

Correcto:

```ts
await pool.query(
  `
  SELECT *
  FROM appointments
  WHERE employee_id = $1
  `,
  [employeeId],
);
```

No utilizar concatenación directa de valores introducidos por usuarios.

Incorrecto:

```ts
`SELECT * FROM appointments WHERE employee_id = '${employeeId}'`;
```

## Seguridad

El backend deberá aplicar como mínimo:

- validación mediante DTOs;
- `class-validator`;
- `class-transformer`;
- `ValidationPipe`;
- autenticación JWT;
- refresh token mediante cookie HttpOnly;
- autorización mediante roles y permisos;
- aislamiento por `organization_id`;
- SQL parametrizado;
- rate limiting;
- Helmet;
- CORS configurado;
- protección frente a brute force;
- 2FA TOTP;
- secretos mediante variables de entorno.

Nunca subir al repositorio:

- contraseñas;
- tokens;
- secretos TOTP;
- claves API;
- `.env` reales;
- credenciales de PostgreSQL.

## Base de datos multiempresa

La organización es la cuenta titular, la suscripción y el límite principal de
aislamiento. Cada organización contiene uno o varios negocios (`businesses`).
Las entidades operativas conservan `organization_id` y ahora incorporan
`business_id`; un negocio siempre pertenece a la organización indicada.

Las personas tienen una membresía de organización y una o varias asignaciones
en `business_memberships`. Esto permite que una cuenta gestione varios negocios
sin poder acceder a los de otra organización.

El aislamiento principal sigue asociado a:

```text
organization_id
```

## JWT

La infraestructura de JWT usa `@nestjs/jwt` y firma los access tokens con
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` y `JWT_EMAIL_VERIFICATION_SECRET`.
Define valores aleatorios,
distintos y de al menos 32 caracteres en `backend/.env` para cada entorno.
Estas variables se validan al arrancar y nunca deben subirse al repositorio.

Para enviar correos de verificacion, configura tambien estas variables:

```env
JWT_EMAIL_VERIFICATION_SECRET=replace_with_another_random_value_at_least_32_characters
TOTP_ENCRYPTION_KEY=replace_with_a_random_value_at_least_32_characters
ONBOARDING_SECRET=replace_with_a_random_onboarding_value_at_least_32_characters
RESEND_API_KEY=re_replace_with_your_resend_api_key
RESEND_FROM_EMAIL=no-reply@your-verified-domain.example
```

En produccion ambas son obligatorias. `RESEND_FROM_EMAIL` debe pertenecer a un
dominio verificado en Resend.

Los access tokens tienen una duracion de 15 minutos. El endpoint
`POST /api/v1/auth/login` valida las credenciales y responde con un access
token Bearer.

`POST /api/v1/auth/onboard` crea en una transaccion un usuario, una
organización, su primer negocio con el mismo nombre y slug, sus settings
iniciales, el locale `es`, una membresía `OWNER` y el acceso del OWNER a ese
negocio. Exige la cabecera `X-Onboarding-Key` con el valor de
`ONBOARDING_SECRET`. La misma clave permite crear varias organizaciones; debe
tratarse como una credencial administrativa privada y no enviarse al frontend.

`POST /api/v1/auth/register` requiere `Authorization: Bearer <accessToken>`.
Un `OWNER` o `ADMIN` activo puede crear un empleado indicando `organizationId`,
uno o más `businessIds` a los que ya tenga acceso y el rol `EMPLOYEE` o
`MANAGER`. La API rechaza altas en negocios ajenos.

`GET /api/v1/auth/me` incluye las organizaciones activas asociadas al usuario,
con su `id`, `name` y `role`, para que el cliente pueda seleccionar el contexto
de trabajo sin recibir datos de organizaciones ajenas.

Los endpoints de negocios requieren `Authorization: Bearer <accessToken>` y
un rol activo `OWNER` o `ADMIN` de la organización:

```text
POST   /api/v1/businesses
GET    /api/v1/businesses?organizationId=<uuid>
GET    /api/v1/businesses/<businessId>
PATCH  /api/v1/businesses/<businessId>
DELETE /api/v1/businesses/<businessId>
```

La autorización de las operaciones de gestión usa `RolesGuard`: resuelve el rol
activo del usuario contra PostgreSQL usando el `organizationId` del body o query,
o el `businessId` de la ruta. Las consultas del servicio mantienen sus propios
filtros de tenant como segunda barrera.

Al crear un negocio, el creador queda asignado automáticamente. Los slugs son
únicos dentro de cada organización. `DELETE` solo elimina negocios sin datos
asociados y nunca permite eliminar el último negocio de una organización; usa
`PATCH` con `status: "SUSPENDED"` para retirar un negocio con actividad.
La consulta por ID admite tanto usuarios asignados directamente al negocio como
`OWNER` y `ADMIN` de su organización.

`GET /api/v1/auth/me` incluye las organizaciones activas del usuario y, dentro
de cada una, sus negocios accesibles. `OWNER` y `ADMIN` reciben todos los
negocios activos de su organización; el resto de roles solo sus asignaciones
directas.

Los perfiles operativos de empleados se gestionan por negocio. `OWNER` y
`ADMIN` pueden crearlos, editarlos y archivarlos; los usuarios con acceso al
negocio pueden consultarlos. La eliminación es lógica: el empleado conserva su
historial y deja de aparecer en las consultas normales.

Las operaciones de gestión de empleados usan `RolesGuard` con el `businessId`
de la ruta. Los `GET` mantienen el acceso de los usuarios asignados al negocio.

Al crear un empleado, `inviteUser: true` requiere su email y crea también su
cuenta, membresías y perfil en una transacción. Recibe por email una contraseña
temporal de un solo uso y completa el flujo de verificación y nueva contraseña
en su primer acceso. Si se omite o es `false`, se crea únicamente el perfil.
`OWNER` y `ADMIN` pueden resetear una configuración TOTP perdida; el reset
elimina los recovery codes y revoca todas las sesiones del empleado, sin revelar
el secreto TOTP al administrador. Cada usuario decide si activa 2FA en su propia
cuenta; la plataforma no lo impone por rol ni por empleado.

```text
GET    /api/v1/businesses/<businessId>/employees
POST   /api/v1/businesses/<businessId>/employees
POST   /api/v1/businesses/<businessId>/employees/<employeeId>/invite
POST   /api/v1/businesses/<businessId>/employees/<employeeId>/2fa/reset
GET    /api/v1/businesses/<businessId>/employees/<employeeId>
PATCH  /api/v1/businesses/<businessId>/employees/<employeeId>
DELETE /api/v1/businesses/<businessId>/employees/<employeeId>
```

Las categorias de servicios se gestionan por negocio. `PATCH` permite activar o
desactivar una categoria mediante `isActive`. `DELETE` solo se permite cuando
no hay servicios asociados; en caso contrario devuelve `409 Conflict`.
Crear, editar y borrar categorias requiere `OWNER` o `ADMIN`; listarlas admite
usuarios con acceso al negocio.

```text
GET    /api/v1/businesses/<businessId>/service-categories
POST   /api/v1/businesses/<businessId>/service-categories
PATCH  /api/v1/businesses/<businessId>/service-categories/<categoryId>
DELETE /api/v1/businesses/<businessId>/service-categories/<categoryId>
```

Los servicios se gestionan por negocio y pueden pertenecer opcionalmente a una
categoria del mismo negocio. `PATCH` permite activar o desactivar un servicio.
`DELETE` lo elimina fisicamente solo cuando no tiene empleados ni citas
asociadas; de otro modo devuelve `409 Conflict`.
Crear, editar, borrar y sustituir sus empleados requiere `OWNER` o `ADMIN`;
las consultas admiten usuarios con acceso al negocio.

```text
GET    /api/v1/businesses/<businessId>/services
POST   /api/v1/businesses/<businessId>/services
PATCH  /api/v1/businesses/<businessId>/services/<serviceId>
DELETE /api/v1/businesses/<businessId>/services/<serviceId>
```

Los empleados habilitados para un servicio se consultan y reemplazan con:

```text
GET /api/v1/businesses/<businessId>/services/<serviceId>/employees
PUT /api/v1/businesses/<businessId>/services/<serviceId>/employees
```

Los clientes se gestionan por negocio. `DELETE` anonimiza sus datos personales
para conservar el historial sin retener nombre, email, teléfono ni notas.

```text
GET    /api/v1/businesses/<businessId>/customers
POST   /api/v1/businesses/<businessId>/customers
GET    /api/v1/businesses/<businessId>/customers/<customerId>
PATCH  /api/v1/businesses/<businessId>/customers/<customerId>
DELETE /api/v1/businesses/<businessId>/customers/<customerId>
```

Crear, editar y anonimizar clientes requiere el rol `OWNER` o `ADMIN`; las
consultas admiten a cualquier usuario con acceso al negocio.

Los horarios semanales de empleados usan la convención de JavaScript: `0` es
domingo y `6` sábado. El `PUT` reemplaza todos los turnos del empleado y admite
turnos partidos sin solapamientos.

```text
GET /api/v1/businesses/<businessId>/employees/<employeeId>/working-hours
PUT /api/v1/businesses/<businessId>/employees/<employeeId>/working-hours
```

Sustituir horarios requiere `OWNER` o `ADMIN`; la consulta admite a cualquier
usuario con acceso al negocio.

Los bloqueos de calendario siempre pertenecen a un empleado activo del negocio.
Pueden representar vacaciones, descansos, reuniones o ausencias y se eliminan
físicamente con `DELETE`.

```text
GET    /api/v1/businesses/<businessId>/calendar/blocks
POST   /api/v1/businesses/<businessId>/calendar/blocks
PATCH  /api/v1/businesses/<businessId>/calendar/blocks/<blockId>
DELETE /api/v1/businesses/<businessId>/calendar/blocks/<blockId>
```

Crear, editar y eliminar bloqueos requiere `OWNER` o `ADMIN`; las consultas
admiten a cualquier usuario con acceso al negocio.

Los `GET` de bloqueos aceptan `from` y `to` ISO opcionales y devuelven los
bloqueos que se solapan con el rango. Para un empleado concreto:

```text
GET /api/v1/businesses/<businessId>/calendar/blocks/employees/<employeeId>?from=<iso>&to=<iso>
```

Las citas se crean a partir de un cliente, empleado, servicio y un instante de
inicio. El backend toma el precio, duracion y buffers como una instantanea del
servicio; comprueba que el empleado presta ese servicio, su horario local, los
bloqueos y las citas solapadas. PostgreSQL aplica tambien una exclusion para
que dos solicitudes simultaneas no puedan reservar el mismo intervalo ocupado.

```text
GET    /api/v1/businesses/<businessId>/appointments?from=<iso>&to=<iso>&employeeId=<uuid>&customerId=<uuid>&status=<status>
POST   /api/v1/businesses/<businessId>/appointments
GET    /api/v1/businesses/<businessId>/appointments/<appointmentId>
PATCH  /api/v1/businesses/<businessId>/appointments/<appointmentId>
POST   /api/v1/businesses/<businessId>/appointments/<appointmentId>/confirm
POST   /api/v1/businesses/<businessId>/appointments/<appointmentId>/complete
POST   /api/v1/businesses/<businessId>/appointments/<appointmentId>/no-show
DELETE /api/v1/businesses/<businessId>/appointments/<appointmentId>
```

`DELETE` cancela la cita y conserva su historico. Puede incluir opcionalmente
`{ "reason": "..." }`. Los estados son `PENDING`, `CONFIRMED`, `COMPLETED`,
`CANCELLED` y `NO_SHOW`.

Crear, editar, completar, marcar ausencia y cancelar una cita requiere
`OWNER` o `ADMIN`. Las consultas mantienen el acceso de usuarios asignados al
negocio; la confirmacion y las propuestas de reubicacion tambien admiten al
empleado asignado por la cita.

Cada servicio puede definir `autoConfirmAppointments`: `true` crea sus citas
como `CONFIRMED`, `false` como `PENDING` y, al omitirlo, hereda
`organization_settings.auto_confirm_appointments`. En `PATCH`, enviar `null`
vuelve a usar la configuracion heredada. Una cita pendiente puede
confirmarla el `OWNER`, `ADMIN` o el empleado asignado.

El calendario operativo consulta ocupacion en vez de solo franjas libres. El
endpoint devuelve citas pendientes o confirmadas y bloqueos que se solapan con
el rango solicitado:

```text
GET /api/v1/businesses/<businessId>/appointments/occupancy?from=<iso>&to=<iso>&employeeId=<uuid>
```

La disponibilidad interna genera franjas para un empleado y servicio concretos
en la zona horaria del negocio. Respeta turnos, buffers, antelacion, limite de
reserva, bloqueos y citas `PENDING` o `CONFIRMED`. Solo la pueden consultar
usuarios con acceso al negocio y el rango maximo es de 31 dias.

```text
GET /api/v1/businesses/<businessId>/availability?employeeId=<uuid>&serviceId=<uuid>&from=<iso>&to=<iso>
```

La reserva publica comienza con un catalogo sin autenticacion. Solo expone
organizaciones y negocios activos, junto con servicios activos y sus datos de
reserva. El `business.id` de cada servicio se usara para elegir empleado y
consultar disponibilidad en los siguientes pasos.

```text
GET /api/v1/public/<organizationSlug>/services?businessId=<uuid>
GET /api/v1/public/<organizationSlug>/employees?businessId=<uuid>&serviceId=<uuid>
GET /api/v1/public/<organizationSlug>/availability?businessId=<uuid>&employeeId=<uuid>&serviceId=<uuid>&from=<iso>&to=<iso>
```

Una cita solicitada sobre otra cita o un bloqueo se guarda como `PENDING` con
`requiresApproval: true`, incluso cuando el servicio se auto-confirma. Al
confirmarla manualmente, el empleado asignado, `OWNER` o `ADMIN` acepta la
excepcion y la cita queda con `conflictOverride: true`.

El personal puede proponer una reubicacion sin modificar la cita original. La
propuesta admite cambiar fecha, hora y empleado; se envia al cliente por email
con un token de un solo uso que caduca a las 48 horas. La aceptacion vuelve a
validar disponibilidad antes de aplicar el cambio.

```text
POST /api/v1/businesses/<businessId>/appointments/<appointmentId>/reschedule-proposals
POST /api/v1/appointments/reschedule-proposals/accept
POST /api/v1/appointments/reschedule-proposals/reject
```

Al iniciar sesion, BUKIOO guarda el hash del refresh token en `user_sessions`
y envia el token raw en una cookie HttpOnly. `POST /api/v1/auth/refresh`
verifica y rota el token, actualiza su hash y devuelve un access token nuevo.
`POST /api/v1/auth/logout` revoca la sesion del refresh token y elimina la
cookie HttpOnly.
`GET /api/v1/auth/me` requiere `Authorization: Bearer <accessToken>` y
devuelve el perfil seguro del usuario autenticado.

`POST /api/v1/auth/email/verification/request` genera un codigo numerico de
seis digitos, de un solo uso y 10 minutos de validez para un email activo no
verificado. El hash se guarda en `user_tokens`; `POST /api/v1/auth/email/verify`
consume el codigo y marca `email_verified_at`. Los correos se envian con Resend mediante
`EmailProvider`; el texto plano de cada correo reside en `src/email/templates`.

Las cuentas creadas por Register u Onboard reciben por email una contrasena
temporal de ocho caracteres y un solo uso. El primer `POST /auth/login` con esa contrasena envia
el token de verificacion y responde `202`; tambien guarda una cookie HttpOnly
temporal ligada al navegador. `POST /auth/activate/verify` recibe el codigo de
email y exige esa cookie. Si es correcto, crea una segunda cookie HttpOnly de
corta duración. `POST /auth/activate/password` recibe la contrasena definitiva,
exige la segunda cookie, invalida la contrasena temporal y crea la sesion sin un
segundo Login.

`POST /auth/refresh` y `GET /auth/me` rechazan cuentas sin email verificado o
pendientes de cambiar su contrasena temporal.

`POST /api/v1/auth/password/forgot` siempre responde `202` para no revelar si
un email tiene cuenta. Para las cuentas activas, envia un codigo numerico de
seis digitos, de un solo uso y con 10 minutos de validez. `POST
/api/v1/auth/password/reset` consume ese codigo, establece la nueva contrasena
con Argon2id y revoca todas las sesiones activas del usuario.

Las cuentas con 2FA activo, los superadmins y los `OWNER`/`ADMIN` cuando su
organizacion activa `require_2fa_for_admins` pausan el Login y responden `202`.
La API guarda un intento temporal en una cookie HttpOnly de 10 minutos y no
crea una sesion hasta completar uno de estos endpoints:

```text
POST /api/v1/auth/2fa/verify
POST /api/v1/auth/2fa/recovery
```

Un usuario autenticado inicia la configuracion con `POST /api/v1/auth/2fa/setup`
y la confirma con `POST /api/v1/auth/2fa/setup/verify`. El secreto TOTP se guarda
cifrado con AES-256-GCM usando `TOTP_ENCRYPTION_KEY`; la respuesta de confirmacion
incluye ocho recovery codes, que deben guardarse una sola vez por el usuario. En
base de datos solo se almacenan hashes Argon2id y cada recovery code se consume al usarlo.

Esto permitirá mantener aislados los datos de cada negocio.

Ejemplo:

```text
Organization A
├── employees
├── customers
├── services
└── appointments

Organization B
├── employees
├── customers
├── services
└── appointments
```
