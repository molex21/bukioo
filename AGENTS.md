# BUKIOO: instrucciones de trabajo

BUKIOO es un SaaS multiempresa de citas, clientes y negocios de servicios.
Frontend: React, TypeScript, Vite y Mantine en `frontend/`. Backend: NestJS y
SQL parametrizado con `pg` en `backend/`. PostgreSQL usa Docker y dbmate.

## Antes de empezar

- Lee `MEMORY.md`, incluido cualquier primer paso temporal, y la documentación
  pertinente. El estado del código prevalece sobre documentos antiguos;
  distingue lo implementado de lo pendiente.
- Consulta `docs/constitution.md` y `docs/development.md` para seguridad,
  proceso, SDD, documentación, agentes y Git. El roadmap está en
  `frontend/FRONTEND_ROADMAP.md` y la API en `backend/docs/API_REFERENCE.md`.
- Antes de iniciar otra funcionalidad, realiza la revisión de frontend pendiente
  descrita en `MEMORY.md`; presenta resultados y acuerda el siguiente paso.

## Comandos desde la raíz

- `npm run setup`: instalar dependencias; `npm run dev`: iniciar desarrollo.
- `npm run check`: pruebas de scripts, lint, tests backend y builds de ambos.
- `npm run check:frontend` / `npm run check:backend`: controles parciales.
- `npm run docker:up`, `npm run docker:ps`, `npm run docker:down`: PostgreSQL.
- Desde `backend/`: `npx dbmate status` y `npx dbmate up`; no ejecutar
  migraciones o cambios destructivos sin autorización cuando corresponda.
- `npm run commit`: trabaja con los cambios ya preparados; pide aprobación.
  El push requiere otra aprobación separada. Detalles en `docs/development.md`.

## Reglas esenciales

- Trabaja paso a paso; usa SDD para cambios relevantes y pide las dos
  aprobaciones descritas en `docs/development.md`. No implementes lo no pedido.
- Mantén TypeScript sencillo, arquitectura existente y dependencias mínimas.
  Consulta antes de añadir dependencias, cambiar arquitectura o migraciones,
  salvo que ya estén expresamente aprobadas en el plan.
- Autoriza y filtra siempre por organización y empresa según corresponda;
  nunca confíes solo en identificadores recibidos del cliente.
- No expongas secretos ni modifiques `.env` con credenciales reales. No
  sobrescribas trabajo ajeno ni ejecutes operaciones destructivas sin permiso.
- Para código, scripts o configuración ejecuta `npm run check`; para cambios
  solo documentales verifica las referencias y comunica lo que no se ejecutó.
  Añade pruebas específicas, E2E y manuales cuando corresponda.
- Revisa los README afectados por cambios importantes de dependencias, scripts,
  arquitectura, entorno, ejecución, build, tests o funcionalidades. Documenta
  solo el estado real. Actualiza `MEMORY.md`, roadmap y changelog cuando aplique.
- El formato de commit acordado es `DD/MM/AAAA Descripción (A)`; presenta
  título, archivos, pruebas y pendientes y espera confirmación para cada commit.
- Nunca añadas `Co-authored-by` ni atribuciones de coautoría a los commits.
- La validación frontend incluye responsive y accesibilidad, además de pruebas
  manuales en escritorio y móvil; no declares comprobado lo que no probaste.
  Consulta `docs/frontend-verification.md`.
