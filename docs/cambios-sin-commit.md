# Cambios sin commit: instantánea para la próxima sesión

Fecha de la comprobación: **17/10/2026**. Es una fotografía del árbol de
trabajo, no una lista que Git actualice automáticamente. Antes de continuar,
ejecutar `git status --short --untracked-files=all`, revisar los diffs y los
archivos nuevos, y tratar todo el trabajo existente como perteneciente al
usuario. No preparar, confirmar, descartar ni publicar cambios sin permiso.

Al comprobarlo, la rama era `mvp`, sin archivos preparados para commit y con
16 commits por delante de la referencia local `origin/mvp`; esto último se
refiere a commits ya creados, no a los cambios sin commit. La situación remota
puede haber cambiado desde la última actualización de esa referencia.

## 1. Servicios: precio fijo o «desde»

- Se añade `priceType` (`FIXED` o `FROM`), con validación de precio mínimo para
  `FROM`, persistencia en servicios y devolución en el catálogo público.
- Se añade una migración para `services.price_type`. Comprobar su estado en cada
  entorno antes de usarlo; no ejecutar migraciones sin la autorización aplicable.
- El cálculo del precio/duración final y su instantánea en una cita siguen
  pendientes; los cambios del catálogo no demuestran que ese flujo funcione.

Archivos modificados:

```text
backend/README.md
backend/docs/API_REFERENCE.md
backend/src/public-booking/public-booking.repository.ts
backend/src/public-booking/public-booking.service.spec.ts
backend/src/public-booking/public-booking.service.ts
backend/src/services/dto/create-service.dto.ts
backend/src/services/dto/update-service.dto.ts
backend/src/services/services.repository.ts
backend/src/services/services.service.spec.ts
backend/src/services/services.service.ts
frontend/src/lib/workspace-catalog-api.ts
```

Archivos nuevos, aún sin seguimiento:

```text
backend/db/migrations/20261008100000_add_service_price_type.sql
backend/src/services/dto/service-price.types.ts
```

## 2. Frontend: catálogo y equipo

- Cambios del catálogo: edición de categorías, formularios de servicio y datos
  configurables, opciones y suplementos de precio/tiempo, incluido precio fijo
  o «desde». Revisar el diff completo: no todos los componentes de esta
  funcionalidad son necesariamente nuevos respecto al último commit.
- Pantalla de equipo `/app/team`: lista y edición de empleados de la empresa
  seleccionada, creación de ficha y opción de invitación al panel. La asignación
  de servicios, horarios, bloqueos y otras acciones siguen pendientes.
- Los README y el roadmap se actualizaron para reflejar estos avances y enlazar
  la revisión pendiente. Comprobar permisos y aislamiento multiempresa en pruebas.

Archivos modificados:

```text
frontend/FRONTEND_ROADMAP.md
frontend/README.md
frontend/src/pages/WorkspaceCatalogPage.tsx
frontend/src/pages/WorkspacePage.tsx
```

Archivos nuevos, aún sin seguimiento:

```text
frontend/src/lib/workspace-employees-api.ts
frontend/src/pages/WorkspaceTeamPage.tsx
```

## 3. Instrucciones, memoria y skills

- Reorganización de las instrucciones de agentes, memoria, guía de desarrollo,
  constitución y lista de revisión visual/manual del frontend. La memoria y este
  documento describen decisiones y estado; el código y Git prevalecen si cambian.
- Skills instaladas localmente para páginas públicas, revisión de interfaz y
  Playwright. La skill de Playwright no instala por sí sola el ejecutable ni el
  navegador. Revisar los avisos de licencia antes de compartir estas copias.
- `CODEX_INSTRUCTIONS_BUKIOO.md` figura eliminado como parte de la sustitución
  acordada; su versión anterior se puede consultar con
  `git show HEAD:CODEX_INSTRUCTIONS_BUKIOO.md`. No volver a eliminar ni restaurar
  archivos sin revisar y acordar la operación.

Archivos modificados o eliminados:

```text
.gitignore
AGENTS.md
CODEX_INSTRUCTIONS_BUKIOO.md  [eliminado]
README.md
```

Archivos nuevos, aún sin seguimiento:

```text
CHANGELOG.md
MEMORY.md
docs/cambios-sin-commit.md
docs/constitution.md
docs/development.md
docs/frontend-verification.md
docs/licenses/Apache-2.0.txt
docs/third-party-skills.md
.agents/skills/design-taste-frontend/  [29 archivos]
.agents/skills/playwright-cli/          [11 archivos]
.agents/skills/web-design-guidelines/  [1 archivo]
```

Los archivos de cada carpeta de skill se pueden enumerar con el `git status`
indicado arriba. Su inclusión en un commit requiere revisar contenido y licencias;
en particular, la atribución pendiente de Vercel consta en `docs/third-party-skills.md`.

## 4. Comando de commit y pruebas

- El usuario confirma que quiere conservar su formato
  `DD/MM/AAAA Descripción (A)`. `npm run commit` actúa sobre archivos ya
  preparados, pide confirmación antes del commit y otra independiente para push.
- `npm run check` incluye las pruebas del script; revisar la selección de archivos
  y el diff preparado antes de ejecutarlo. No preparar cambios automáticamente.

Archivos modificados:

```text
package.json
scripts/commit.mjs
```

Archivos nuevos, aún sin seguimiento:

```text
scripts/commit-cli.test.mjs
scripts/commit-helpers.mjs
scripts/commit.test.mjs
```

## Validación y siguiente paso

- El 17/10/2026 pasó `npm run check`: 12 pruebas de scripts, 449 de backend,
  lint y compilaciones. El frontend mostró un aviso de bundle mayor de 500 kB.
  Esta evidencia corresponde al estado probado, no valida futuros cambios.
- No se han realizado aquí los E2E contra base de pruebas, el entorno desde cero
  ni las pruebas visuales y funcionales en escritorio y móvil. Usar
  `docs/frontend-verification.md` para planificarlas y registrar resultados.
- Antes de avanzar con otra funcionalidad, revisar el frontend y presentar los
  hallazgos al usuario; seguir las prioridades de `MEMORY.md` y el roadmap.
