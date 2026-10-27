# API del cuadrante laboral

Implementación del 27/10/2026. Requiere aplicar las migraciones
20261027190000 y 20261027191000 antes de ejecutar estas rutas o las nuevas
consultas de disponibilidad. Se comprobaron en una base aislada y después
se aplicaron en desarrollo con autorización explícita.

Base: /api/v1/businesses/:businessId/scheduling. Autenticación staff; gestión
y lectura de este cuadrante interno restringidas a OWNER/ADMIN de la organización
activa, con empresa y cuenta activas. No expone motivos en la reserva pública.

## Consultas y plantillas

| Método/ruta | Entrada y respuesta |
| --- | --- |
| GET /quadrant | from/to: fechas locales inclusivas, máximo 42 días; employeeId opcional, offset entero. Diez empleados por página, total, timezone, employees/version y days. |
| GET /templates | Plantillas no archivadas: id, name, pattern, version. |
| POST /templates | name y pattern. Devuelve plantilla creada. |
| PATCH /templates/:id | name, pattern y expectedVersion obligatoria para actualizar. |
| DELETE /templates/:id | Body command.expectedVersion. Archiva; conserva las copias ya asignadas. |

El patrón es un array de 1 a 12 semanas, cada una con siete días ordenados
domingo a sábado. Cada día contiene tramos: start y end en minutos desde la
medianoche de origen, con end hasta el día siguiente; pauses contiene intervalos
start/end del mismo origen. Máximo 28 tramos por semana, duración positiva de
hasta 24 horas por tramo, pausas contenidas y sin solapamientos.

La API almacena un formato normalizado por minutos; el frontend presenta
nombres de días, horas y selección explícita de fin al día siguiente. No mostrar
índices ni este formato al usuario.

Cada día consultado devuelve employeeId, date, origin (base/cycle/exception),
draft editable, presence/attention como intervalos UTC, presenceMinutes,
attentionMinutes, ambiguous y blocks. Los totales son planificación, no nómina
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

## Integridad, compatibilidad y despliegue

- Excepción sustituye día completo; ciclo vigente después; base semanal si no
  hay ninguno. Un descanso explícito también suprime el arrastre nocturno previo.
- Copia del patrón al asignar, con versión de origen. Reemplazo finito conserva
  la parte anterior y posterior de asignaciones existentes.
- Funciones compartidas scheduling_day y scheduling_covers para consulta,
  disponibilidad y validación de citas con buffers; restan pausas/bloqueos.
- Triggers con bloqueos de empleado, versiones y comprobación diferida de citas
  protegen también escrituras antiguas de horarios/bloqueos y citas concurrentes.
- Las transacciones de cambios registran auditoría y no exponen notas privadas
  en las funciones usadas para disponibilidad pública.
- No ejecutar el código nuevo contra un esquema antiguo. Aplicar primero las
  dos migraciones revisadas, reiniciar backend y después probar frontend.
- No se añadió dependencia. Las migraciones son aditivas. El down automático
  está bloqueado intencionadamente: se requiere reversión revisada preservando
  los datos nuevos; no usar rollback destructivo como recuperación automática.

Pruebas: suite scheduling de PostgreSQL/HTTP y suite E2E existente sobre base
aislada terminada en _test; nunca contra la base de desarrollo/producción.
