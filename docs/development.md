# Desarrollo de BUKIOO

## Flujo y aprobaciones

- Trabaja en pasos coherentes, sin avanzar automáticamente al siguiente bloque
  grande. Consulta `MEMORY.md`, el roadmap y los archivos afectados.
- Para funcionalidad relevante, arquitectura, seguridad, migraciones o bugs
  complejos, usa SDD: `specs/NNN-nombre/spec.md` describe objetivo, requisitos,
  límites y criterios; se aprueba. Después `plan.md` y `tasks.md` explican
  implementación, dependencias, pruebas y trazabilidad; se aprueban. Ejecuta
  el alcance aprobado y registra evidencia por requisito. Si cambia el alcance,
  acuerda la modificación antes de implementarla.
- Para consultas, revisión o bugs claros y ajustes pequeños, usa el flujo breve:
  analizar, actuar solo si se ha solicitado, verificar e informar. Una revisión
  pedida como solo lectura no modifica archivos.
- No instales dependencias, ejecutes migraciones ni cambies arquitectura sin
  aprobación, salvo que ya estén incluidas expresamente en el plan aprobado.
- Mantén el MVP acotado: SMS, passkeys, WebSockets/SSE, Redis, pagos reales,
  roles personalizados, API keys, webhooks externos, lista de espera,
  marketplace, multimoneda e integraciones complejas requieren una decisión
  explícita antes de incorporarse. No confundir esta lista con funcionalidades
  ya implementadas o con una prohibición permanente.
- Para producción, planificar copias de seguridad, retención y una restauración
  comprobada; una copia nunca probada no demuestra recuperabilidad.

## Agentes, herramientas y consumo

Los roles son coordinador, planificador, implementador y revisor; pueden ser
fases del mismo agente. La delegación en subagentes se hace cuando el usuario
la solicite o una instrucción aplicable la exija; evita escrituras concurrentes
sobre los mismos archivos. No se fijan modelos: dependen de la disponibilidad y
se acuerdan antes de establecer una distribución permanente.

Los flujos de preguntar, planificar, corregir, revisar, estado y commit se
solicitan en lenguaje natural. No se presentan como comandos nativos inexistentes.
Codex usa `AGENTS.md`; Claude Code y OpenCode no están configurados para este
proyecto. No activar proveedores, MCP, credenciales o plugins sin autorización.

Las siguientes skills se instalaron el 17/10/2026 en `.agents/skills/` desde
la rama `main` de sus repositorios; no se registró un commit específico.
Verifica que Codex las detecta en la siguiente sesión. Examina sus instrucciones
y límites antes de utilizarlas; su instalación no concede permisos adicionales.
Los avisos de terceros y una comprobación pendiente antes de distribuirlas están
en `docs/third-party-skills.md`.

- [Taste Skill](https://github.com/Leonxlnx/taste-skill): `design-taste-frontend`
  es para páginas públicas, no para el dashboard; no imponer su estilo o stack.
  Sus scripts necesitan Node 22+ y Chrome, Edge o Chromium; algunos usan red.
- [Vercel Web Design Guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines):
  `web-design-guidelines` revisa interfaz y accesibilidad; consulta sus reglas
  actuales en red al utilizarla.
- [Awesome DESIGN.md](https://github.com/VoltAgent/awesome-design-md): referencias
  visuales, no una skill; elegir una referencia antes de incorporarla.
- [Playwright CLI](https://github.com/microsoft/playwright-cli): para navegador
  y comprobaciones visuales; la skill `playwright-cli` está instalada,
  pero no se detectó el comando global ni un paquete Playwright en la raíz. Hay
  que comprobar si existe una instalación local compatible o pedir aprobación
  para instalar la herramienta y los navegadores necesarios. No asumir que la
  instalación de la skill equivale a tener Playwright operativo.

Avisar al 75 % solo si hay una cuota de suscripción o presupuesto medible y
autorizado, con fuente y ventana; si no existe acceso, indicarlo sin estimar ni
confundir cuota con ocupación de contexto.

## Validación y documentación

- Los README son documentación pública de presentación y uso del proyecto o
  componente. Mantener decisiones de trabajo, valoraciones y aprobaciones en
  especificaciones, documentos de seguimiento y MEMORY.md, no en los README.
- Código, scripts o configuración: ejecutar `npm run check`; si falla, no
  declarar el cambio válido y comunicar fallos preexistentes o bloqueos.
- Markdown puro: comprobar coherencia, formato y enlaces; informar que no se
  ejecutó la suite. Los E2E del backend requieren una base aislada terminada
  en `_test` y se ejecutan aparte, como explica `backend/README.md`.
- Crear o adaptar pruebas automáticas para la lógica modificada y casos límite.
  La revisión frontend incluye responsive, teclado, accesibilidad, instalación
  desde cero y las pruebas manuales de `docs/frontend-verification.md`.
- Los README describen dependencias y comandos realmente existentes. Revisa
  los afectados cuando cambien arquitectura, entorno, scripts, ejecución,
  compilación, pruebas o funcionalidades importantes. `backend/docs/API_REFERENCE.md`
  conserva contratos; el roadmap conserva tareas; `MEMORY.md` conserva estado y
  decisiones necesarias, sin límite artificial de líneas ni secretos.
- `CHANGELOG.md` registra cambios relevantes sin inventar releases ni cambiar
  versiones automáticamente. La versión declarada en raíz es `0.1.0`; no se
  afirma que sea una publicación. La licencia vigente está en `LICENSE`.

## Git y protección del trabajo

- No descartar, esconder ni incluir cambios ajenos automáticamente. Revisa
  estado, rama y contenido; no hagas `reset --hard`, `git clean`, force push,
  reescritura o borrados sin autorización específica.
- Formato acordado: `DD/MM/AAAA Descripción (A)`, fecha local e inicial fija;
  una sola línea. Nunca añadir `Co-authored-by` ni otras atribuciones de
  coautoría. Antes de cada commit muestra título, archivos, pruebas y
  pendientes, y espera confirmación explícita.
- `npm run commit` utiliza exclusivamente cambios ya preparados con `git add`;
  no prepara archivos automáticamente. Revisa el diff, evita secretos y no
  continúes si cambia el contenido preparado después de la propuesta.
- Tras el commit, pregunta por separado si hacer push, indicando remoto, rama
  y commits pendientes si son conocidos. No hacer push sin confirmación.
- Crear ramas desde el origen explícito; verificar ramas y diferencias antes de
  integrar y solicitar aprobación antes de fusionar en la rama principal.
