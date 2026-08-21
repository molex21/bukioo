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

* Node.js
* NestJS 11
* TypeScript 5
* Express como adaptador HTTP de NestJS
* PostgreSQL
* `pg` como cliente PostgreSQL
* `dbmate` para migraciones SQL
* `@nestjs/jwt` para access tokens JWT de corta duracion
* Supertest para pruebas de API
* ESLint
* TypeScript ESLint
* Prettier

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

* `start`: inicia NestJS.
* `start:dev`: inicia NestJS en modo observación.
* `start:debug`: inicia NestJS en modo depuración y observación.
* `start:prod`: ejecuta `dist/main`; requiere haber compilado previamente.

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
`SELECT * FROM appointments WHERE employee_id = '${employeeId}'`
```

## Seguridad

El backend deberá aplicar como mínimo:

* validación mediante DTOs;
* `class-validator`;
* `class-transformer`;
* `ValidationPipe`;
* autenticación JWT;
* refresh token mediante cookie HttpOnly;
* autorización mediante roles y permisos;
* aislamiento por `organization_id`;
* SQL parametrizado;
* rate limiting;
* Helmet;
* CORS configurado;
* protección frente a brute force;
* 2FA TOTP;
* secretos mediante variables de entorno.

Nunca subir al repositorio:

* contraseñas;
* tokens;
* secretos TOTP;
* claves API;
* `.env` reales;
* credenciales de PostgreSQL.

## Base de datos multiempresa

La mayor parte de las entidades de negocio estarán asociadas a:

```text
organization_id
```

## JWT

La infraestructura de JWT usa `@nestjs/jwt` y firma los access tokens con
`JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`. Define valores aleatorios,
distintos y de al menos 32 caracteres en `backend/.env` para cada entorno.
Estas variables se validan al arrancar y nunca deben subirse al repositorio.

Los access tokens tienen una duracion de 15 minutos. El endpoint
`POST /api/v1/auth/login` valida las credenciales y responde con un access
token Bearer.

`POST /api/v1/auth/onboard` crea en una transaccion un usuario, una empresa,
sus settings iniciales, el locale `es` y una membresia `OWNER`.

Al iniciar sesion, BUKIOO guarda el hash del refresh token en `user_sessions`
y envia el token raw en una cookie HttpOnly. `POST /api/v1/auth/refresh`
verifica y rota el token, actualiza su hash y devuelve un access token nuevo.
`POST /api/v1/auth/logout` revoca la sesion del refresh token y elimina la
cookie HttpOnly.

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
