# BUKIOO

BUKIOO es un SaaS multiempresa para la gestión de citas, reservas, clientes y negocios de servicios.

## Arquitectura

El repositorio contiene una aplicación React que consume una API REST de NestJS. PostgreSQL se ejecuta como servicio mediante Docker Compose.

```text
Frontend (React + Vite) -> API REST (NestJS) -> PostgreSQL
```

Actualmente, el backend no incluye una integración con PostgreSQL en su módulo de aplicación.

## Estructura

- `frontend/`: aplicación web React con Vite y TypeScript.
- `backend/`: API REST NestJS con TypeScript.
- `scripts/`: automatizaciones para desarrollo, documentación y commits.
- `docker-compose.yml`: servicio PostgreSQL para desarrollo.
- `.env.example`: ejemplo de configuración para Docker Compose.

## Requisitos

- Node.js LTS y npm
- Docker Desktop con Docker Compose

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

## Desarrollo

El siguiente comando inicia PostgreSQL, el backend en modo observación y el frontend de Vite. Cuando ambos servicios responden, abre `http://localhost:5173` y `http://localhost:3000` en el navegador.

```bash
npm run dev
```

También puedes controlar únicamente el servicio Docker:

```bash
npm run docker:up
npm run docker:ps
npm run docker:logs
npm run docker:down
```

`npm run stop` es un alias de `npm run docker:down`.

## Compilación y comprobaciones

```bash
npm run compile
npm run compile:backend
npm run compile:frontend
npm run check:frontend
```

El script `npm run check` está definido para ejecutar las comprobaciones y la compilación, pero actualmente no es operativo: `check:backend` llama a `npm run lint:check` dentro de `backend`, y ese script no existe en `backend/package.json`. Consulta el README del backend para ejecutar sus comprobaciones disponibles por separado.

## Docker y variables de entorno

`docker-compose.yml` crea un contenedor `bukioo-postgres` con la imagen `postgres:17`, un volumen persistente llamado `bukioo_postgres_data` y un healthcheck con `pg_isready`.

Las variables que utiliza el servicio son:

| Variable | Uso | Valor de ejemplo |
| --- | --- | --- |
| `POSTGRES_DB` | Nombre de la base de datos | `bukioo` |
| `POSTGRES_USER` | Usuario de PostgreSQL | `bukioo` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `change_me` |
| `POSTGRES_PORT` | Puerto publicado en el host | `5432` |

Si `POSTGRES_PORT` no está definido, Docker Compose publica el puerto `5432`.

## Scripts de mantenimiento

```bash
npm run docs:update
npm run commit
```

`docs:update` ejecuta una revisión de los README mediante Codex. `commit` ejecuta la automatización de commits del proyecto.
