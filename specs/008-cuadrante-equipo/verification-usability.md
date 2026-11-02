# Evidencia de la revisión de horarios

02/11/2026. Requisitos y plan aprobados con "go". Entrega implementada sin
dependencias nuevas. Activación en desarrollo completada; no equivale a validación visual.

## Funciones entregadas

- Un solo botón comprueba automáticamente el borrador antes de solicitar guardar.
  Mantiene protección de doble envío y revalidación transaccional. Un resultado
  incierto requiere recarga, sin repetir escrituras automáticamente.
- Restablecer consulta el resultado real del backend: horario semanal o rotación,
  tramos/pausas, descanso y atención tras ausencias. No se habilita antes de obtener
  el resumen. Si el resumen cambia al comprobar de nuevo, requiere nueva revisión.
- Plantillas diarias y rotaciones con creación explícita. Seleccionar carga una
  copia editable, sin botón extra. El turno diario puede aplicarse a 1–42 fechas
  elegidas sin recurrencia, con escritura atómica y versiones.
- Citas afectadas con servicio/fecha y personas activas habilitadas/disponibles.
  Resumen de reasignaciones antes de guardar, opción de retirarlas y conservación
  del borrador. Mantiene fecha, hora, servicio, duración, precio y estado.
- Reasignaciones y horario en una sola transacción, con bloqueo ordenado de
  empleados y comprobación de la cita actual, servicio, buffers, horario, pausas,
  ausencias y solapes. Auditoría APPOINTMENT_UPDATED y SCHEDULE_CHANGED conjunta.
  Preview revierte también citas, versiones y auditorías.
- Editor semanal por días, plantillas, copia a otros días, descansos, pausas y
  turnos nocturnos, con fecha de inicio y aviso de próximas bases programadas.
  Conserva el pasado y la prioridad de ciclos/excepciones. Los horarios legados
  con futuras vigencias o segundos se mantienen sin conversión automática.

## Esquema y autorización

Migración 20261102120000_add_daily_templates_and_weekly_bases.sql: tipo DAY/CYCLE
de plantilla (existentes CYCLE), bases semanales con vigencia, claves de alcance,
triggers de bloqueo/versión/citas y actualización del resolutor canónico. No
edita migraciones anteriores. Reversión automática bloqueada para preservar datos.

El usuario autorizó expresamente aplicarla solo en
bukioo_scheduling_20261027_test. Aplicada correctamente allí, 36 migraciones.
Después, el usuario autorizó mediante "go" aplicarla también en localhost/bukioo.
Se verificaron destino y única migración pendiente antes de ejecutarla. Desarrollo
queda con 36 aplicadas y 0 pendientes; esquema y lectura del horario comprobados.
No se modificó .env ni se copiaron datos ni se editaron horarios o citas de prueba
en desarrollo para esta comprobación.

## Validación

- npm run check: 12 pruebas de scripts, 458 unitarias backend, 14 helpers frontend,
  lint y compilaciones. La invocación en PowerShell usa npm.cmd por su política
  de ejecución de scripts.
- E2E completos: 45 pruebas, tres suites, sobre la base aislada autorizada.
- Cobertura nueva: restauración real sin persistencia, plantillas diarias frente
  a ciclos, aplicación por fechas y rollback de lotes, bases con vigencia y noche,
  preview/guardado conjunto de citas, preservación de snapshots, cita cancelada,
  servicio retirado, vacaciones, solape, buffers, alcance/permisos y compatibilidad
  de horarios legados. Pruebas de helper del botón verifican orden, conflicto,
  revisión de resumen cambiado, errores y ausencia de reintentos de escritura.
- Revisados contratos, referencias documentales y diff sin errores de espacios.

## Pendientes y límites

- Activación en desarrollo completada con autorización separada.
- No se han probado navegador, responsive visual, teclado ni lector de pantalla
  de esta entrega. Playwright sigue pausado. No se ha comprobado el tema oscuro.
- Rediseño visual global del cuadrante y selector de semana reservado para la
  revisión frontend; no se ha aplicado por anticipado un diseño sin validar.
- Sin nuevas notificaciones al cliente, cancelaciones automáticas ni cambio de
  día de citas. El nuevo flujo solo reasigna a una persona disponible.
- Aviso previo de tamaño del bundle frontend sigue presente; no se ha abordado
  una división de bundles en este alcance. Commit y push pendientes de permiso.
