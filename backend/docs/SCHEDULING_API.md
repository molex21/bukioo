# API del cuadrante laboral

Implementación ampliada el 02/11/2026. Requiere las migraciones 20261027190000,
20261027191000, 20261102120000 y 20261102150000. La 20261102120000 añade plantillas diarias y bases
semanales con vigencia; se probó en base aislada y se aplicó después en
localhost/bukioo con autorización separada. Desarrollo tiene 37 aplicadas y
ninguna pendiente.
La 20261102150000 incorpora estimación de trabajo y límites nocturnos de ciclos;
se probó en base aislada y después se aplicó en desarrollo con permiso separado.

Base: /api/v1/businesses/:businessId/scheduling. Autenticación staff; gestión
y lectura de este cuadrante interno restringidas a OWNER/ADMIN de la organización
activa, con empresa y cuenta activas. No expone motivos en la reserva pública.

## Consultas y plantillas

| Método/ruta | Entrada y respuesta |
| --- | --- |
| GET /quadrant | from/to: fechas locales inclusivas, máximo 42 días; employeeId opcional, offset entero. Diez empleados por página, total, timezone, employees/version y days. |
| GET /templates | Plantillas no archivadas: id, name, pattern, version, kind (DAY/CYCLE). |
| POST /templates | name, pattern, kind opcional (CYCLE por defecto). Devuelve plantilla creada. |
| PATCH /templates/:id | name, pattern, kind y expectedVersion. No permite convertir el tipo de una plantilla existente. |
| DELETE /templates/:id | Body command.expectedVersion. Archiva; conserva las copias ya asignadas. |
| GET /weekly-base/:employeeId | from opcional (fecha local, hoy por defecto). Devuelve week, version, timezone, from, today y nextDate. No incorpora ciclos ni excepciones. |
| GET /reassignment-options/:appointmentId | Cita futura activa de la empresa: appointmentId, expectedEmployeeId, expectedUpdatedAt, serviceName, startAt y employees disponibles (id/name). La lista se revalida al guardar. |

El patrón es un array de 1 a 12 semanas, cada una con siete días ordenados
domingo a sábado. Cada día contiene tramos: start y end en minutos desde la
medianoche de origen, con end hasta el día siguiente; pauses contiene intervalos
start/end del mismo origen. Máximo 28 tramos por semana, duración positiva de
hasta 24 horas por tramo, pausas contenidas y sin solapamientos.
Cada pausa admite countsAsWork booleano opcional, false por defecto. Se conserva
en plantillas, bases, excepciones y snapshots. Todas las pausas bloquean citas;
solo las no computables se restan de las horas de trabajo estimadas.

La API almacena un formato normalizado por minutos; el frontend presenta
nombres de días, horas y selección explícita de fin al día siguiente. No mostrar
índices ni este formato al usuario.

Cada día consultado devuelve employeeId, date, origin (base/cycle/exception),
draft editable, presence/attention como intervalos UTC, presenceMinutes,
attentionMinutes, workMinutes (numérico o null si ambiguo), ambiguous y blocks. Los totales son planificación, no nómina
ni duración efectivamente trabajada; tampoco descuentan las citas como fichaje.

## Comprobar y aplicar cambios

POST /preview y PUT /changes reciben el mismo cuerpo con objeto command.
Preview ejecuta la validación en transacción y deshace los cambios con savepoint;
guardar revalida y registra auditoría. Los endpoints de día, asignación y
ausencia se consolidaron en estas dos rutas para compartir validación y no
tener validaciones diferentes de conflictos según la operación. La interfaz
exige previsualización; el guardado siempre vuelve a validar en servidor.

Campos comunes: type, employeeIds (1–50; uno salvo asignación), expectedVersions
con versión de cada empleado obtenida del cuadrante. No admite días pasados.

| type | Campos de command |
| --- | --- |
| day | date y spans. Lista vacía = descanso explícito. |
| days | date de referencia, dates (1–42 fechas concretas), spans. Copia independiente por fecha, sin repetición; lote atómico. |
| dates | date de referencia y entries (1–42 objetos date/spans, sin fechas repetidas). Permite turnos diferentes por fecha en un lote atómico. |
| weekly | from y week (siete días). Repite esa semana desde from hasta la siguiente base programada; conserva pasado y programaciones posteriores. |
| resetDay | date. Retira excepción; vuelve al patrón/ciclo sin borrar ausencias. |
| assignment | templateId, templateVersion, from, to opcional, anchor opcional, phase opcional y/o phases por empleado. La fecha ancla se normaliza a lunes. |
| absence | from/to locales, blockType, fullDays booleano, start/end en minutos cuando no son días completos, reason opcional (255), blockId para editar. |
| deleteBlock | date y blockId; solo un bloque futuro del empleado/empresa correspondientes. |

La fecha final de una ausencia por días completos está incluida: se convierte
en medianoche local del día siguiente. Las horas ambiguas/inexistentes por DST
se rechazan; patrones recurrentes ambiguos no ofrecen franjas para ese día y
el cuadrante muestra aviso. PERMISSION se añade a los tipos previos.

Preview devuelve ok, preview, employees y conflicts con id/empleado/inicio de
citas autorizadas. 409 por versión/conflicto; error SCHEDULE_CONFLICT incluye
conflicts al guardar. La interfaz no permite ignorarlos ni cancelar citas sola.
Ante resultado incierto hay que actualizar y revisar, no repetir automáticamente.

Para DAY, pattern tiene una sola semana con el turno en el índice de día 0 y
los otros seis vacíos. Es un contenedor de persistencia: no obliga a aplicarlo
en domingo. CYCLE conserva el formato semanal anterior; solo CYCLE admite
assignment. Las plantillas existentes quedan como CYCLE por la migración.

Todos los comandos admiten reassignments opcional (máximo 50), con
appointmentId, employeeId destino, expectedEmployeeId origen y expectedUpdatedAt
exacto devuelto por reassignment-options (no convertirlo a fecha JavaScript).
El origen debe estar incluido en employeeIds. La operación mantiene horario,
servicio, precio, duración y estado de la cita; no admite cambios de día.
Comprueba servicio activo/asignado, empleado activo de la empresa, horario
efectivo con buffers y ausencia de solapes. No transforma solapes en PENDING.
Retira conflict_override al reasignar a un destino libre, para mantener activa
la protección SQL de solapes de las citas confirmadas.
Horario, citas y auditorías se aplican en una transacción, o se revierten juntos.
Preview prueba también las reasignaciones y revierte todas sus escrituras.

Preview de resetDay incluye restoredDay: spans, origin, ambiguous y attention
resultantes, incluso cuando se detectan citas afectadas. La interfaz consulta
ese resultado antes de habilitar la confirmación y muestra tramos/pausas,
descanso y atención restante tras ausencias. Si cambia el resumen, exige volver
a revisarlo. El botón único comprueba el borrador y solo después solicita guardar;
la segunda petición vuelve a validar versiones y conflictos en servidor.

Preview añade estimatedDays (employeeId/date/minutes), estimatedTotalMinutes,
estimatedFrom/estimatedTo y estimatedTruncated. El detalle real se limita a
42 días, para acotar el coste; no presentar ese subtotal como el intervalo
completo cuando estimatedTruncated=true. En weekly resume los primeros siete
días desde from; en fechas elegidas incluye esas fechas y su arrastre nocturno.
No descuenta ausencias del trabajo programado: las muestra separadas y sí las
resta de atención disponible. Una fecha ambigua tiene minutes=null y total null.

La interfaz exige inicio y fin al asignar una rotación, aunque el contrato API
conserve asignaciones abiertas anteriores. Muestra una estimación nominal de
todo el intervalo y un detalle real acotado. Las noches del último día se
recortan a la medianoche siguiente; el horario base posterior se mantiene.

## Integridad, compatibilidad y despliegue

- Excepción sustituye día completo; ciclo vigente después; base semanal si no
  hay ninguno. Se usa la última employee_weekly_bases vigente y, si no existe,
  employee_working_hours. Un descanso explícito suprime el arrastre nocturno previo.
- Los horarios antiguos con futuras vigencias o precisión inferior al minuto
  se conservan: el nuevo editor rechaza su conversión automática para no borrar
  cambios previstos. El PUT legado sigue escribiendo solo employee_working_hours;
  no sustituye bases nuevas, rotaciones ni excepciones que tengan prioridad.
- Copia del patrón al asignar, con versión de origen. Reemplazo finito conserva
  la parte anterior y posterior de asignaciones existentes.
- Funciones compartidas scheduling_day y scheduling_covers para consulta,
  disponibilidad y validación de citas con buffers; restan pausas/bloqueos.
- Triggers con bloqueos de empleado, versiones y comprobación diferida de citas
  protegen también escrituras antiguas de horarios/bloqueos y citas concurrentes.
- Las transacciones de cambios registran auditoría y no exponen notas privadas
  en las funciones usadas para disponibilidad pública.
- No ejecutar el código nuevo contra un esquema antiguo. Aplicar primero las
  cuatro migraciones revisadas, reiniciar backend y después probar frontend.
- La 20261102150000 aborta si el nuevo límite nocturno deja alguna cita futura
  fuera de horario. No mueve ni cancela esas citas; revisar el conflicto antes
  de volver a aplicar. El código nuevo requiere esa función de estimación.
- No se añadió dependencia. Las migraciones son aditivas. El down automático
  está bloqueado intencionadamente: se requiere reversión revisada preservando
  los datos nuevos; no usar rollback destructivo como recuperación automática.

Pruebas: suite scheduling de PostgreSQL/HTTP y suite E2E existente sobre base
aislada terminada en _test; nunca contra la base de desarrollo/producción.
