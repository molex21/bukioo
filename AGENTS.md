
# BUKIOO - Codex Instructions

## Proyecto

BUKIOO es un SaaS multiempresa para la gestión de citas, reservas,
clientes y negocios de servicios.

## Estructura

- `/frontend`: aplicación React + TypeScript + Vite.
- `/backend`: API REST NestJS + TypeScript.
- PostgreSQL se ejecuta mediante Docker Compose.
- `/scripts`: automatizaciones del proyecto.

## Documentación

Existen tres archivos principales de documentación:

- `README.md`: documentación general.
- `frontend/README.md`: documentación del frontend.
- `backend/README.md`: documentación del backend.

La documentación debe representar siempre el estado REAL del repositorio.

No documentar una dependencia como instalada si no aparece realmente
en el package.json correspondiente.

## Actualización de README

Cuando cambie cualquiera de estos elementos:

- dependencias;
- scripts npm;
- arquitectura;
- Docker;
- variables de entorno;
- configuración;
- forma de iniciar el proyecto;
- forma de compilar;
- forma de ejecutar tests;
- estructura importante;
- funcionalidades importantes;

revisar los README afectados.

Responsabilidades:

### README.md

Mantener:

- descripción general;
- arquitectura;
- estructura;
- requisitos;
- instalación;
- comandos globales;
- Docker;
- flujo de desarrollo.

### frontend/README.md

Mantener:

- tecnologías frontend;
- dependencias relevantes;
- instalación;
- ejecución;
- build;
- lint;
- variables de entorno.

### backend/README.md

Mantener:

- tecnologías backend;
- dependencias relevantes;
- instalación;
- ejecución;
- build;
- tests;
- lint;
- PostgreSQL;
- migraciones;
- variables de entorno.

## Código

- Usar TypeScript.
- Mantener código sencillo y legible.
- Evitar dependencias innecesarias.
- No añadir una dependencia sin una razón clara.
- No guardar secretos en el repositorio.
- No modificar archivos `.env` con credenciales reales.

## Validación

Antes de considerar terminado un cambio ejecutar:

npm run check

El proyecto no debe considerarse válido si falla:

- lint;
- tests;
- compilación del backend;
- compilación del frontend.

## Commits

Usar Conventional Commits.

Tipos permitidos:

- feat
- fix
- refactor
- docs
- test
- chore
- build
- ci
- perf
- style

Los mensajes de commit deben:

- estar en inglés;
- ser breves;
- describir el cambio principal;
- no terminar en punto;
- usar una sola línea en commits normales.

Ejemplos:

feat: add appointment creation endpoint
fix: validate duplicate customer email
docs: update development setup
refactor: simplify database connection

## Seguridad

Nunca incluir en Git:

- `.env`;
- contraseñas;
- API keys;
- tokens;
- secretos;
- credenciales reales.