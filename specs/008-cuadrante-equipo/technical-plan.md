# Diseño técnico completo del cuadrante

27/10/2026. Segunda aprobación recibida mediante "go". Implementación preparada;
ver verification-full.md para evidencia, decisiones finales y límites.
El usuario autorizó primero la base de pruebas y, después de los controles,
confirmó aplicar las dos migraciones en localhost/bukioo. Ambas están aplicadas.

## Decisiones propuestas para todo el alcance

- Gestión directa por OWNER/ADMIN; empleados no modifican el cuadrante.
- Ciclos de 1 a 12 semanas, con desfase por empleado. Vista/consulta de hasta
  42 días; asignaciones con fin opcional, sin generar filas infinitas.
- Jornada con uno o varios tramos; cada tramo indica si finaliza al día siguiente.
  Duración de un tramo mayor que cero y como máximo 24 horas; máximo 28 tramos
  semanales para mantener el límite del editor actual. Pausas contenidas en
  un tramo de presencia, no solapadas entre sí.
- Plantilla guardada no cambia lo ya asignado. Cada asignación guarda una copia
  del ciclo y su procedencia; actualizarla exige una nueva asignación explícita.
- Primera versión sin solicitudes de vacaciones, aprobación del empleado,
  saldo de días, nómina ni fichaje. "Permiso" es una categoría propia de ausencia,
  no un rol de usuario ni una recuperación de acceso.
- No permitir aplicar cambios que invaliden citas futuras activas. Mostrar
  conflictos con enlaces al detalle cuando exista; no cancelarlas ni moverlas.
- Fechas pasadas solo de consulta en este editor; no reescribir historia para
  configurar el futuro. La fecha inicial del nuevo patrón se elige expresamente.

## Modelo aditivo propuesto

Todas las tablas nuevas incluyen organización y empresa; las referencias de
empleado son compuestas y se verifican contra esas pertenencias. SQL parametrizado,
sin ORM ni infraestructura nueva. Migración dbmate nueva, nunca editar aplicadas.

| Tabla | Campos principales y reglas |
| --- | --- |
| employee_shift_templates | id, organization_id, business_id, name, cycle_weeks (1–12), pattern JSONB validado, version, archived_at, created/updated_at. Patrón con semanas, días, tramos y pausas. |
| employee_shift_assignments | id, organization_id, business_id, employee_id, template_id opcional, template_version, pattern_snapshot JSONB, anchor_date, phase_weeks, valid_from, valid_to opcional, version y fechas. No solapar vigencias activas del mismo empleado. |
| employee_schedule_exceptions | id, organization_id, business_id, employee_id, work_date, spans JSONB, version y fechas. Única por empleado/fecha; lista vacía significa descanso explícito. |
| employee_schedule_versions | organization_id, business_id, employee_id, version. Una versión por empleado para coordinar excepciones, asignaciones y cambios semanales previos. |

Se conservan employee_working_hours como horario base y calendar_blocks para
ausencias/bloqueos fechados. Añadir tipo PERMISSION a su validación/restricción
SQL si se confirma la restricción existente; no usar textos libres como tipo.
Las pausas recurrentes se almacenan dentro de la copia del patrón, sin crear
un bloqueo por cada día del futuro.

Validación compartida de patrón: valores enteros para semana/día, HH:mm,
fin al día siguiente explícito, límites y orden de tramos/pausas. No aceptar
JSON arbitrario sin DTO y validación de negocio. Poner versión también en
plantillas; archivar plantillas no borra asignaciones ni snapshots.

## Regla única del horario efectivo

Crear módulo de planificación siguiendo controller/service/repository.
Exponer cálculo del horario efectivo para reutilizarlo en consulta y reservas.

Para cada fecha local de la empresa:

1. Si hay excepción, esta sustituye el día completo. Vacía significa descanso;
   no recurrir al horario base ni a una rotación para rellenar ese día.
2. En otro caso usar la asignación vigente. La semana del ciclo resulta de la
   diferencia de semanas locales desde anchor_date y phase_weeks, normalizada
   al número de semanas del ciclo.
3. Si no hay asignación, usar horario semanal previo y sus vigencias.
4. Resolver tramos nocturnos y dividir por medianoche para la proyección diaria.
   Una excepción del día siguiente prevalece también sobre el tramo que arrastra
   el día anterior; así un descanso explícito no contiene trabajo oculto.
5. Restar pausas del patrón y bloques que se solapen. Un bloque de empresa
   sin employee_id afecta a todos; nunca crea tiempo de trabajo.
6. Para ofrecer franjas, restar citas activas y aplicar duración y buffers del
   servicio. Unir intervalos adyacentes antes de comprobar cobertura; ninguna
   pausa puede quedar oculta al comprobar una cita que la cruza.

Calcular presencia (tramos antes de pausas/ausencias) y atención planificada
(después de pausas/ausencias) como magnitudes diferentes. No son horas de
fichaje ni nómina. Calcular duración en instantes para días con cambio horario.

Usar fechas locales para ancla y selección de día, e instantes UTC para reservas.
Validar con zona IANA de empresa, nunca zona del navegador. En una edición de
hora local inexistente o ambigua por DST, rechazar con explicación y pedir una
hora inequívoca; no elegir un desplazamiento silenciosamente. Los patrones
recurrentes que caen en transición se marcan como conflicto de planificación
para esa fecha, sin ofrecer franjas del intervalo ambiguo hasta corregirlo.
Los días completos abarcan medianoche local a la siguiente, aunque duren 23/25 h.

## Contratos API propuestos

Base autenticada de gestión: /businesses/:businessId/scheduling.

| Método y ruta relativa | Finalidad |
| --- | --- |
| GET /quadrant?from=YYYY-MM-DD&to=YYYY-MM-DD&employeeId=... | Proyección por fechas, horas de empresa, tramos y pausas, tipo de origen, ausencias y totales. Paginación de empleados; máximo 42 días. |
| GET /templates | Plantillas activas y filtro de archivadas. |
| POST /templates | Nombre y ciclo validado. |
| PATCH /templates/:id | Editar con expectedVersion; no alterar snapshots ya asignados. |
| DELETE /templates/:id | Archivar plantilla, conservando asignaciones. |
| POST /preview | Validar cambio propuesto y devolver impacto, versiones y conflictos sin escribir. |
| PUT /assignments | Aplicar patrón copiado a empleados, desde fecha y fin opcional, desfases y expectedVersions. Transacción de todo el lote; límite propuesto 50 empleados. |
| PUT /employees/:employeeId/days/:date | Sustituir el día con tramos/pausas y expectedVersion; lista vacía es descanso. |
| DELETE /employees/:employeeId/days/:date | Quitar excepción y volver al patrón vigente, con expectedVersion y nueva comprobación de conflictos. |

Body de día: spans con startTime, endTime, endDayOffset (0/1) y pauses;
expectedVersion del empleado. Respuesta de consulta indica timezone, date,
origin (base/cycle/exception), shifts, breaks, blocks, presenceMinutes,
attentionMinutes y version. Las claves técnicas no aparecen como etiquetas UI.

Ausencias: ampliar CRUD calendar/blocks para aceptar PERMISSION, edición por
horas y rango de días completos. Convertir días locales en servidor; no sumar
24 horas en cliente. Conservar endpoints actuales para compatibilidad. Añadir
versión de bloqueo y control de conflicto cuando se edita o elimina.

Preview y guardado aplican la misma validación; preview no es una reserva ni
permiso para saltarse la revisión final. Errores 400 por formato/reglas, 403
por permisos, 404 por recurso fuera del alcance y 409 por versión o citas.
409 incluye código de negocio y detalles limitados a los recursos autorizados.
Los motivos internos de ausencias nunca forman parte de la disponibilidad pública.

## Integración y concurrencia que deben completarse

Lectores confirmados al revisar código:

- AvailabilityRepository.listSlots consulta employee_working_hours y bloqueos
  directamente. Debe usar intervalos efectivos del nuevo resolver.
- AppointmentsRepository.isWithinWorkingHours también consulta la tabla base
  directamente. Debe validar con el mismo resolver al crear, editar y reprogramar.
- PublicBookingService delega disponibilidad en AvailabilityService; comprobar
  tanto consulta como reserva final y no solo el cuadrante interno.
- Ocupación consulta citas/bloqueos; ampliar visualización si debe mostrar
  pausas recurrentes sin duplicarlas como calendar_blocks.

Transacción de cambio de planificación:

1. Autorizar y bloquear filas de empleados afectados en orden estable.
2. Comprobar expectedVersions y snapshot de plantilla.
3. Cargar citas futuras activas afectadas, con intervalos ocupados y buffers.
   Si el patrón tiene fin abierto, incluir todas las citas ya existentes a
   futuro, aunque queden fuera de la semana visible.
4. Validar cada cita frente al horario posterior y bloqueos; si hay conflicto,
   devolver 409 y no escribir parte del lote.
5. Guardar cambio, versiones y auditoría en la misma transacción.

La creación/edición/reprogramación de citas debe usar el mismo bloqueo de
empleado, volver a validar el horario efectivo y escribir en la transacción.
No basta un mutex en memoria ni un SELECT previo fuera de la transacción.
Al mover una cita entre empleados, bloquear ambos en orden estable para no
introducir interbloqueos. Mantener restricción de solapamiento de PostgreSQL.

Aplicar la protección también a los endpoints previos de horarios/bloqueos:
de lo contrario el editor anterior permitiría saltarse los conflictos.
Auditoría debe incluir actor, empresa, empleado/rango y cambios pertinentes;
evitar motivos sensibles o credenciales en logs técnicos.

## Interfaz completa por entregar

- Celdas editables con botón accesible; escritorio matriz y móvil por día.
- Editor de tramos y pausas, opción "Día libre" y "Volver al horario habitual".
- Gestión de plantillas con nombre, N semanas, turnos partidos/nocturnos y pausas.
- Asistente de asignación a empleados: patrón, fechas, desfase y vista previa.
- Editor de ausencias: vacaciones, permiso, pausa, reunión y otros; por horas
  o días completos; cancelar/editar/retirar sin borrar horario base.
- Mostrar conflicto con opciones reales de volver a editar o consultar citas,
  sin botón para ignorar y guardar de todas formas.
- Actualización de versión/lectura tras error incierto; no repetir operaciones
  masivas automáticamente. Guardar no deja mensajes de éxito dentro de tablas.
- Avatar unificado en tabla y cuadrante: borde e iniciales del color elegido,
  fondo al 12 %. Aviso y acción explícita para oscurecer tonos con bajo contraste.
- Textos naturales de etiquetas, ayudas, errores, confirmaciones y vacíos;
  no mostrar numeración de días, JSON, snapshots ni nombres de endpoints.

## Migración y despliegue

1. Crear migración aditiva revisable, con índices y referencias compuestas;
   no borrar ni reescribir datos actuales. Acordar reversión preservando datos
   nuevos, nunca ejecutar down destructivo para simular rollback seguro.
2. Probarla en PostgreSQL aislado con base terminada en _test, sin copiar secretos.
3. Mantener respuesta y rutas previas; introducir nuevas consultas después de
   que el esquema esté disponible y comprobado.
4. Ejecutar migración local solo con autorización explícita. Si no se autoriza,
   entregar código/migración con esa dependencia y pruebas de integración bloqueadas.
5. README público refleja solo lo que pueda ejecutarse con los pasos publicados.
   Planes y aprobaciones quedan en specs, no en README de presentación.

## Pruebas que cierran cada punto

| Punto | Casos necesarios |
| --- | --- |
| Color | Elegido, ausente, blanco/negro, tema claro/oscuro, borde/texto/fondo, aviso sin cambiar preferencia. |
| Cuadrante | Semana/móvil, filtro, límites de fechas, errores, paginación, foco y teclado. |
| Día | Turnos partidos, descanso explícito, quitar excepción, preservación de otro día y conflictos de versión. |
| Ciclo | 1/2/12 semanas, desfase, ancla, fin abierto/cerrado, cambio de año, copia independiente de plantilla. |
| Pausa | Recurrente/puntual, incluida en turno, intervalos adyacentes y cita que cruza pausa. |
| Ausencia | Permiso por horas, vacaciones por días, extremos exclusivos, edición/retirada y privacidad. |
| Noche y DST | Tramos cruzando medianoche, excepción al día siguiente, Canarias/Madrid, 23/25 h y horas ambiguas/inexistentes. |
| Citas | Consulta y guardado coinciden, buffers, carrera cita/horario, propuesta y aceptación de reprogramación, citas históricas intactas. |
| Aislamiento | OWNER/ADMIN/EMPLOYEE, recursos cruzados de empresa/organización, lote atómico y auditoría. |

Ejecutar npm run check y E2E HTTP/SQL aislados; las pruebas unitarias no sustituyen
esa integración. Documentar resultados por requisito, con pendientes explícitos.
La revisión global con skills sigue al final; Playwright en pausa hasta permiso.

## Puerta de implementación

Ratificar este diseño como segunda aprobación antes de modificar arquitectura,
contratos o esquema. Su aprobación permite preparar código y migraciones nuevas;
no implica ejecutar migraciones, publicar, hacer commit/push ni declarar pruebas
visuales realizadas. Ningún punto se marca terminado por existir este documento.
