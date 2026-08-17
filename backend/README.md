# Backend de BUKIOO

API REST de BUKIOO creada con NestJS y TypeScript.

## Tecnologías y dependencias relevantes

- NestJS 11 con el adaptador Express
- TypeScript 5
- PostgreSQL mediante el cliente `pg`
- Jest y Supertest para pruebas
- ESLint, TypeScript ESLint y Prettier

Aunque `pg` está instalado y PostgreSQL se ofrece mediante Docker Compose en la raíz, el módulo de la aplicación no configura todavía una conexión a la base de datos.

## Instalación

Desde este directorio:

```bash
npm install
```

O instala todos los paquetes del repositorio desde la raíz:

```bash
npm run setup
```

## Ejecución

```bash
npm run start
npm run start:dev
npm run start:debug
npm run start:prod
```

- `start` inicia NestJS.
- `start:dev` inicia NestJS en modo observación.
- `start:debug` inicia NestJS en modo depuración y observación.
- `start:prod` ejecuta `dist/main`; antes requiere `npm run build`.

Por defecto, la API escucha en `http://localhost:3000`.

## Compilación

```bash
npm run build
```

El comando genera la salida de NestJS en `dist/`.

## Pruebas y lint

```bash
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e
npm run lint
npm run format
```

`lint` aplica correcciones automáticamente con `--fix`. No existe un script `lint:check` en este paquete. Como consecuencia, el comando raíz `npm run check:backend` y, por extensión, `npm run check` no funcionan actualmente.

## PostgreSQL

El servicio de desarrollo se define en [`../docker-compose.yml`](../docker-compose.yml) y se inicia desde la raíz con:

```bash
npm run docker:up
```

La dependencia `dbmate` está instalada, pero este paquete no define scripts de migración ni contiene migraciones en el repositorio.

## Variables de entorno

| Variable | Uso | Valor predeterminado |
| --- | --- | --- |
| `PORT` | Puerto HTTP en el que escucha NestJS | `3000` |

`PORT` se lee directamente del entorno del proceso; el backend no incluye un archivo `.env.example` ni carga archivos `.env` por sí mismo.
