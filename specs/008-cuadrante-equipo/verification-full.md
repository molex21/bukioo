# Evidencia del cuadrante completo

27/10/2026. Implementado el alcance de colores, excepciones, plantillas/ciclos,
pausas, vacaciones/permisos, versiones, auditoría y horario efectivo compartido.
El diseño técnico fue aprobado mediante "go" antes de modificar backend.

## Implementación

- Avatar compartido entre Equipo y cuadrante; borde/texto del color seleccionado,
  fondo al 12 %. Cálculo de contraste y botón voluntario para mejorarlo; no se
  cambia la elección silenciosamente. Apariencia visual no validada aún.
- Editor de día: tramos partidos/nocturnos, pausas con inicio/fin al día siguiente,
  descanso explícito, copia de un día de plantilla y vuelta al patrón habitual.
- Plantillas de 1–12 semanas; se copian al asignar, con fecha inicial/final y
  desfase individual. La UI asigna a empleados seleccionados de la página actual.
  Editar o archivar plantillas conserva las asignaciones previas.
- Ausencias por horas/días inclusivos, permiso específico, edición/retirada y
  notas internas. Solo gestión directa por OWNER/ADMIN, sin saldos/aprobaciones.
- Consulta de presencia/atención por día, origen del horario, navegación y
  filtros, matriz escritorio/lista móvil. No muestra ni descuenta citas como fichaje.
- Preview con savepoint y rollback; cambios con expectedVersions, comprobación
  final, lote atómico y auditoría con actor y datos de planificación pertinentes.
- scheduling_day/covers unifican consulta, franjas y validación de citas. Los
  triggers bloquean empleados y comprueban al confirmar transacción; protegen
  también los editores previos. Un cambio incompatible con citas se rechaza.

## Ajustes técnicos respecto al borrador

- Patrón normalizado por minutos en JSON, no HH:mm en persistencia. La interfaz
  siempre presenta horas/días. Los endpoints mutantes se unifican en preview y
  PUT changes, manteniendo discriminador y validación por operación.
- Segunda migración afina el bloqueo de ausencias individuales para evitar
  bloquear empleados ajenos al cambio e invertir el orden de locks.
- La suite E2E previa usaba una cita fija en septiembre de 2026, ya pasada;
  se cambió a un lunes futuro para que siga probando concurrencia y no falle
  por validación temporal antes de llegar al caso que pretende verificar.
- Ajustados textos de horarios y dos expresiones técnicas públicas ("tenants"
  y "Base de interfaz preparada"). La revisión global de textos sigue pendiente;
  no se declara realizada por haber corregido estos ejemplos.

## Base y pruebas

Autorizada explícitamente por el usuario: creación de
"bukioo_scheduling_20261027_test" y migraciones solo allí. Migraciones completas
aplicadas correctamente, incluidas 20261027190000 y 20261027191000. No se alteró
la base de desarrollo "bukioo" ni se copiaron sus datos. Fixtures sintéticos.

La suite nueva comprueba SQL y HTTP: turno partido/pausa, descanso y retirada,
arrastre nocturno, rotación con desfase, DST, preview sin persistencia, alcance,
versiones, protección de citas y concurrencia, reemplazo finito preservando
tramos, permisos, días completos y auditoría. Además verifica que las franjas
devueltas se aceptan por el validador de citas del mismo horario.

Suite E2E completa correcta: 3 suites, 32 casos, en esa base aislada. Las pruebas
unitarias backend de dominio y las de fechas/contraste frontend se integran en
la comprobación general. npm run check final correcto: 12 pruebas de scripts,
458 de backend, 8 de frontend, lint y ambas compilaciones. Persiste el aviso
de bundle grande: 1605,67 kB, 362,08 kB gzip.

## Límites y puesta en marcha

Después de los controles, el usuario autorizó aplicar las dos migraciones en
localhost/bukioo. Ambas se aplicaron correctamente: 35 aplicadas, 0 pendientes,
funciones presentes y comprobación de lectura del horario efectivo correcta.
No se modificaron turnos, asignaciones ni citas como parte de esa comprobación.
Las nuevas consultas de reservas requieren este esquema actualizado.
El down automático está bloqueado: reversión requiere preservar datos y revisión.

No ejecutados: navegador/Playwright (permanece en pausa), comprobaciones visuales,
responsive, teclado, lectores de pantalla ni móviles reales. Los tests SQL/HTTP
no prueban los nuevos formularios. La revisión de skills global también queda
pendiente conforme al orden acordado. No se ha hecho commit ni push.
