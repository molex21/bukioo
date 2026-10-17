# BUKIOO

BUKIOO es un SaaS multiempresa para la gestión de citas, reservas, clientes y negocios de servicios.

## Arquitectura

El repositorio contiene una aplicación React con Vite y Mantine que consume una API REST de NestJS. PostgreSQL se ejecuta como servicio mediante Docker Compose.

```text
Frontend (React + Vite) -> API REST (NestJS) -> PostgreSQL
```

El backend integra PostgreSQL mediante `DatabaseModule` y SQL directo con `pg`.

La administración de plataforma permite navegar por organizaciones y empresas.
Dentro de cada empresa, «Equipo y accesos» separa «Usuarios y permisos» de la
organización y «Empleados» de la empresa, con invitación de usuarios, incorporación
como empleados de usuarios existentes, cambios de rol y edición auditada de datos
y estado del empleado. El alcance y las limitaciones de esta vista se
describen en [frontend/README.md](frontend/README.md).

## Estructura

* `frontend/`: aplicación web React con Vite y TypeScript.
* `backend/`: API REST NestJS con TypeScript.
* `backend/db/migrations/`: migraciones SQL de PostgreSQL gestionadas con dbmate.
* `scripts/`: automatizaciones para desarrollo, documentación y commits.
* `docker-compose.yml`: servicio PostgreSQL para desarrollo.
* `.env.example`: ejemplo de configuración para Docker Compose.

## Requisitos

* Node.js LTS y npm.
* Docker Desktop con Docker Compose.
* Docker Desktop iniciado y con Docker Engine en ejecución antes de levantar el proyecto.

En Linux, en lugar de Docker Desktop, asegúrate de que el daemon de Docker esté iniciado:

```bash
sudo systemctl start docker
```

Puedes comprobar que Docker está funcionando con:

```bash
docker info
```

## Instalación

Instala las dependencias de los tres paquetes desde la raíz:

```bash
npm run setup
```

Configura PostgreSQL para Docker Compose a partir del ejemplo:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

No subas el archivo `.env` al repositorio.

## Base de datos

PostgreSQL se ejecuta mediante Docker Compose.

Antes de trabajar con la base de datos, asegúrate de que Docker Desktop esté iniciado.

Desde la raíz del proyecto:

```bash
npm run docker:up
```

Comprueba el estado del contenedor:

```bash
npm run docker:ps
```

El contenedor debería aparecer como iniciado y, tras unos segundos, saludable.

Para consultar sus logs:

```bash
npm run docker:logs
```

## Migraciones de base de datos

BUKIOO utiliza `dbmate` para gestionar la evolución del esquema de PostgreSQL mediante migraciones escritas directamente en SQL.

Las migraciones se almacenan en:

```text
backend/db/migrations/
```

### Crear una migración

Antes de crear o ejecutar migraciones, PostgreSQL debe estar iniciado:

```bash
npm run docker:up
```

Después entra en el backend:

```bash
cd backend
```

Crea una migración con:

```bash
npx dbmate new nombre_migracion
```

Por ejemplo, para crear el esquema inicial:

```bash
npx dbmate new init_schema
```

Dbmate generará un archivo similar a:

```text
backend/db/migrations/20260819090000_init_schema.sql
```

Dentro del archivo se escribirá directamente el SQL.

Ejemplo:

```sql
-- migrate:up

CREATE TABLE ejemplo (
    id UUID PRIMARY KEY
);

-- migrate:down

DROP TABLE ejemplo;
```

La sección `migrate:up` contiene los cambios que deben aplicarse.

La sección `migrate:down` contiene los cambios necesarios para revertir la migración.

### Aplicar migraciones

Desde:

```text
backend/
```

ejecuta:

```bash
npx dbmate up
```

Dbmate comprobará qué migraciones todavía no se han ejecutado y las aplicará en orden.

### Consultar el estado

```bash
npx dbmate status
```

Esto permite comprobar qué migraciones están aplicadas y cuáles siguen pendientes.

### Revertir la última migración

```bash
npx dbmate rollback
```

Esto ejecutará la sección `migrate:down` de la última migración aplicada.

### Crear cambios posteriores

Una migración que ya haya sido aplicada no debe modificarse.

Si posteriormente hay que añadir una tabla o modificar el esquema, se crea una migración nueva.

Ejemplo:

```bash
npx dbmate new add_loyalty_levels
```

La estructura podría quedar:

```text
backend/
└── db/
    └── migrations/
        ├── 20260819090000_init_schema.sql
        ├── 20260820100000_add_loyalty_levels.sql
        └── 20260821120000_add_notifications.sql
```

Después se aplican los cambios:

```bash
npx dbmate up
```

## Desarrollo

Antes de iniciar BUKIOO en local, abre **Docker Desktop** y espera a que Docker Engine esté completamente iniciado.

Puedes comprobarlo con:

```bash
docker info
```

Si Docker no está funcionando, el proyecto no podrá iniciar PostgreSQL.

En Linux:

```bash
sudo systemctl start docker
```

Una vez Docker esté funcionando, inicia el proyecto desde la raíz:

```bash
npm run dev
```

El comando inicia:

```text
PostgreSQL mediante Docker
        +
Backend NestJS en modo desarrollo
        +
Frontend Vite en modo desarrollo
```

Cuando los servicios estén disponibles:

* Frontend: `http://localhost:5173`
* Swagger API: `http://localhost:3000/api/docs`

También puedes controlar únicamente PostgreSQL mediante los scripts Docker:

```bash
npm run docker:up
npm run docker:ps
npm run docker:logs
npm run docker:down
```

`npm run stop` es un alias de:

```bash
npm run docker:down
```

## Flujo recomendado para iniciar el proyecto

Cada vez que quieras trabajar en BUKIOO en local:

### 1. Iniciar Docker Desktop

Abre Docker Desktop y espera hasta que Docker Engine esté funcionando.

Comprueba:

```bash
docker info
```

### 2. Abrir el proyecto

Abre la carpeta de BUKIOO en VS Code.

### 3. Comprobar variables de entorno

Verifica que exista:

```text
.env
```

en la raíz del proyecto.

Si no existe:

```powershell
Copy-Item .env.example .env
```

En Linux/macOS:

```bash
cp .env.example .env
```

### 4. Iniciar BUKIOO

Desde la raíz:

```bash
npm run dev
```

### 5. Aplicar migraciones si existen cambios pendientes

En otra terminal:

```bash
cd backend
npx dbmate status
```

Si existen migraciones pendientes:

```bash
npx dbmate up
```

### 6. Abrir la aplicación

Frontend:

```text
http://localhost:5173
```

Swagger API:

```text
http://localhost:3000/api/docs
```

## Compilación y comprobaciones

```bash
npm run compile
npm run compile:backend
npm run compile:frontend
npm run check:frontend
```

El script `npm run check` ejecuta las pruebas de scripts, el lint y las pruebas
unitarias del backend, el lint del frontend y las compilaciones de ambos paquetes. Las pruebas E2E,
que requieren `DATABASE_URL_TEST` y PostgreSQL, se ejecutan por separado.

## Docker y variables de entorno

`docker-compose.yml` crea un contenedor:

```text
bukioo-postgres
```

utilizando:

```text
postgres:17
```

También crea:

* un volumen persistente `bukioo_postgres_data`;
* un healthcheck mediante `pg_isready`.

Las variables utilizadas por PostgreSQL son:

| Variable            | Uso                         | Valor de ejemplo |
| ------------------- | --------------------------- | ---------------- |
| `POSTGRES_DB`       | Nombre de la base de datos  | `bukioo`         |
| `POSTGRES_USER`     | Usuario de PostgreSQL       | `bukioo`         |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL    | `change_me`      |
| `POSTGRES_PORT`     | Puerto publicado en el host | `5432`           |

Si `POSTGRES_PORT` no está definido, Docker Compose publica el puerto:

```text
5432
```

## Acceso manual a PostgreSQL

Si necesitas entrar directamente en PostgreSQL para comprobar tablas o ejecutar consultas:

```bash
docker exec -it bukioo-postgres psql -U bukioo -d bukioo
```

Una vez dentro de `psql`, puedes listar las tablas con:

```sql
\dt
```

Consultar información de una tabla:

```sql
\d nombre_tabla
```

Salir de PostgreSQL:

```sql
\q
```

## Comandos habituales

### Proyecto completo

```bash
npm run setup
npm run dev
npm run stop
```

### Docker

```bash
npm run docker:up
npm run docker:ps
npm run docker:logs
npm run docker:down
```

### Migraciones

Desde `backend/`:

```bash
npx dbmate new nombre_migracion
npx dbmate up
npx dbmate status
npx dbmate rollback
```

### Compilación

```bash
npm run compile
npm run compile:backend
npm run compile:frontend
```

## Scripts de mantenimiento

```bash
npm run docs:update
npm run commit
```

`docs:update` ejecuta una revisión de los README mediante Codex.

`commit` utiliza únicamente los archivos que hayas preparado previamente con
`git add`. Muestra el contenido propuesto, ejecuta `npm run check` y solicita
confirmación del título `DD/MM/AAAA Descripción (A)` y los archivos. Puedes
escribir la descripción o generarla con Codex (esto envía el diff preparado a
Codex). Antes revisa con `git diff --cached` que no incluya secretos. El push
se consulta y confirma por separado; el script no prepara todos los archivos.

Las reglas de desarrollo están en [AGENTS.md](AGENTS.md) y
[docs/development.md](docs/development.md). El estado y la revisión pendiente
se mantienen en [MEMORY.md](MEMORY.md); las pruebas manuales para escritorio y
móvil están en [docs/frontend-verification.md](docs/frontend-verification.md).

## Seguridad

No subir al repositorio:

* `.env`
* contraseñas
* tokens
* credenciales
* secretos de API

El archivo:

```text
.env.example
```

debe contener únicamente valores de ejemplo.

PostgreSQL se expone actualmente en desarrollo mediante el puerto configurado por `POSTGRES_PORT`.

En producción, PostgreSQL no deberá exponerse directamente a Internet.

## License

Copyright © 2026 Alejandro Hernandez. All Rights Reserved.

BUKIOO is proprietary software. The source code is publicly available
for portfolio and demonstration purposes only.

No permission is granted to copy, modify, distribute or use the
software without prior written authorization.
# Documentacion de API

La referencia de integracion para frontend se encuentra en
[`backend/docs/API_REFERENCE.md`](backend/docs/API_REFERENCE.md). La coleccion
importable y el entorno local seguro de Postman estan en [`postman/`](postman/).
