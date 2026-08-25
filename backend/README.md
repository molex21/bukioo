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

Al crear un empleado, `inviteUser: true` requiere su email y crea también su
cuenta, membresías y perfil en una transacción. Recibe por email una contraseña
temporal de un solo uso y completa el flujo de verificación y nueva contraseña
en su primer acceso. Si se omite o es `false`, se crea únicamente el perfil.

```text
GET    /api/v1/businesses/<businessId>/employees
POST   /api/v1/businesses/<businessId>/employees
POST   /api/v1/businesses/<businessId>/employees/<employeeId>/invite
GET    /api/v1/businesses/<businessId>/employees/<employeeId>
PATCH  /api/v1/businesses/<businessId>/employees/<employeeId>
DELETE /api/v1/businesses/<businessId>/employees/<employeeId>
```

Las categorias de servicios se gestionan por negocio. `PATCH` permite activar o
desactivar una categoria mediante `isActive`. `DELETE` solo se permite cuando
no hay servicios asociados; en caso contrario devuelve `409 Conflict`.

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

```text
GET    /api/v1/businesses/<businessId>/services
POST   /api/v1/businesses/<businessId>/services
PATCH  /api/v1/businesses/<businessId>/services/<serviceId>
DELETE /api/v1/businesses/<businessId>/services/<serviceId>
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
