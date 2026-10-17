# Memoria de BUKIOO

Actualizada: 17/10/2026. Documento vivo; mantener las líneas necesarias sin
duplicar el roadmap ni guardar secretos, transcripciones o reglas obsoletas.

## Primer paso de la próxima sesión: pendiente temporal

- Antes de avanzar con otras tareas del proyecto, revisar con el usuario los
  cambios sin commit descritos en `docs/cambios-sin-commit.md`: comprobar el
  estado real de Git, los diffs y archivos nuevos, y presentar un resumen de
  lo revisado y lo que requiera decisión. No preparar ni confirmar cambios sin
  autorización. Si la revisión no se completa, conservar este recordatorio.
- Cuando la revisión esté realizada y el resumen entregado, borrar esta sección
  temporal de `MEMORY.md`. No borrar cambios de código ni el inventario por
  confundirlos con el recordatorio; actualizar el inventario si corresponde.

## Estado y decisiones

- SaaS multiempresa: frontend React/Vite/Mantine; backend NestJS, PostgreSQL y
  dbmate. El detalle de instalación y API está en los README y API reference.
- La rama observada al configurar estas instrucciones es `mvp`; hay cambios
  de producto sin commit. No suponer que siguen iguales en sesiones posteriores.
- El inventario de cambios sin commit observado el 17/10/2026, con archivos,
  pruebas y pendientes, está en `docs/cambios-sin-commit.md`. Es una foto del
  momento: consultar el estado y los diffs actuales antes de trabajar o confirmar.
- El panel dispone de contexto de organización y empresa, configuración de
  empresas, catálogo por empresa y pantalla de equipo `/app/team`. Estos flujos
  requieren las pruebas pendientes; no se considera validado todo el producto.
- El catálogo incorpora precio fijo o «desde», datos configurables y suplementos
  de precio/tiempo. El cálculo final y edición en citas aún deben verificarse e
  implementarse donde corresponda; consultar el roadmap antes de afirmar estado.
- El formato de commit acordado es `DD/MM/AAAA Descripción (A)`; se mantiene
  confirmación previa del contenido y otra independiente para push.
- La memoria no tiene límite artificial de líneas; conservar lo necesario y
  eliminar o actualizar información obsoleta sin perder decisiones importantes.

## Última verificación

- 17/10/2026: `npm run check` correcto; 12 tests de scripts y 449 tests del
  backend, lint y compilación de backend y frontend. El build frontend avisa
  de un bundle superior a 500 kB; revisar su impacto en la revisión pendiente.
- E2E contra base de pruebas, entorno desde cero y pruebas visuales/manuales
  en escritorio y móvil no se han ejecutado en esta configuración.

## Prioridad antes de la siguiente funcionalidad

- Revisar el frontend existente y lo que sea posible con las skills elegidas,
  antes de avanzar a otra feature. Presentar hallazgos, riesgos, pruebas y
  propuesta al usuario; acordar las correcciones o el siguiente paso.
- Las skills Taste, Vercel Web Design Guidelines y Playwright CLI se instalaron
  en `.agents/skills/` el 17/10/2026; esta sesión las reconoce. Taste es para
  páginas públicas, no para el dashboard. Playwright
  CLI necesita un ejecutable o instalación local compatible, aún no verificados.
  El catálogo, requisitos y licencias están en `docs/development.md` y
  `docs/third-party-skills.md`. Awesome DESIGN.md es una colección de
  referencias, no una skill; elegir una referencia con el usuario.
- Crear o ampliar los tests necesarios para los hallazgos y preparar pruebas
  finales: responsive, escritorio, móvil real o emulado, funcionamiento visual,
  flujos críticos y puesta en marcha en entorno limpio y aislado. Checklist:
  `docs/frontend-verification.md`. Registrar lo que el usuario debe probar.
- Validar manualmente multiempresa, empresas, empleados, categorías, precio
  «desde», campos configurables y suplementos; no marcarlo hecho sin evidencia.

## Después de la revisión, sujeto a aprobación

1. Asignar servicios a empleados y configurar horarios y bloqueos.
2. Avanzar en agenda/citas: cálculo e instantánea de precio y duración, con
   ajustes auditados cuando se acuerden.
3. Continuar con clientes e historial. Mantener en el roadmap el ticketing y
   el acceso temporal y auditado de soporte, sin acceso permanente por defecto.

La lista detallada de tareas y pruebas pendientes permanece en
`frontend/FRONTEND_ROADMAP.md`; las rutas públicas de reserva y área cliente son
pantallas provisionales según `frontend/src/App.tsx`.
