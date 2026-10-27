# Colores de empleados y cuadrante laboral

27/10/2026. Alcance aprobado y diseño técnico ratificado con "go" del usuario.
Implementación preparada y probada en base aislada. Migraciones aplicadas también
en desarrollo con autorización explícita. Ver verification-full.md; falta revisión
de los formularios en navegador.

## Objetivo y estado real

Mostrar la identidad de color del empleado y planificar el trabajo en un
cuadrante: turnos partidos, plantillas asignables, rotaciones, pausas y ausencias.
El editor semanal anterior sigue disponible mientras se diseña el reemplazo.

Hoy existen asignaciones servicio/empleado, horarios por día de semana y
bloqueos fechados. La lectura de horarios incluye vigencias, pero el PUT actual
solo recibe día/hora y reemplaza todo. No hay contratos de plantillas ni ciclos
rotativos. Los bloqueos permiten descanso, reunión, vacaciones, ausencia,
personal, festivo, manual y otros; no existe un flujo de solicitudes/aprobación.

## A. Color del empleado

- Borde e iniciales usan el color elegido por el usuario.
- Fondo del círculo del mismo tono con transparencia propuesta del 12 %.
  La transparencia solo afecta al fondo, no al círculo completo ni al texto.
- Aplicar el mismo patrón al identificar empleados en el cuadrante. Mantener
  nombre, iniciales y etiquetas para no depender únicamente del color.
- Un color muy claro puede no contrastar: avisar y ofrecer oscurecerlo; no
  cambiar silenciosamente el color elegido. Usar color de marca si falta uno.
- Validar apariencia en temas claro/oscuro y colores extremos antes de fijar
  opacidad y regla de contraste definitivas.

## B. Cuadrante propuesto

- Entrada "Cuadrante" dentro de Equipo, independiente de la agenda de citas.
- Escritorio: semana con filas de empleados, columnas de lunes a domingo,
  navegación anterior/hoy/siguiente y filtros por empleado/empresa.
- Celdas muestran bloques horarios y estado: trabajo, pausa, descanso,
  vacaciones, permiso o ausencia. Varios tramos por día, con texto y leyenda.
- Pulsar una celda abre edición del día; asignar una plantilla, introducir
  tramos manuales o añadir ausencia. No exigir arrastrar: botones y teclado.
- Móvil: lista por día/empleado con las mismas acciones, sin comprimir toda la
  matriz en una pantalla estrecha. Sin calendario nuevo por defecto.
- Mostrar total de horas de presencia y de atención por separado si hay pausas;
  no presentar estos totales como nómina ni tiempo efectivamente trabajado.

## Reglas de planificación propuestas

1. Horario semanal actual como base compatible con lo ya guardado.
2. Asignación de ciclo por empleado con fecha de inicio y fin opcional;
   ciclo de N semanas y desfase inicial por empleado. Ejemplo: semana A mañana,
   B tarde, C descanso. Limitar N y horizonte a valores acordados.
3. Excepción por fecha sustituye el día completo del patrón. Día de descanso
   explícito distinto de "sin excepción": no debe reaparecer el horario base.
4. Pausas y ausencias restan disponibilidad al horario efectivo. No crean
   trabajo fuera del turno. Para guardar un permiso no se exige modificar
   la plantilla ni la rotación.
5. Cambiar plantilla o ciclo no altera asignaciones ya guardadas sin confirmación:
   propuesta copiar el patrón/versionarlo al asignar para evitar cambios ocultos.
6. Turno partido: varios intervalos de trabajo, p. ej. 09:00–13:00/16:00–20:00.
   Pausa recurrente incluida en plantilla; pausa puntual como excepción/bloqueo.
7. Turnos nocturnos identifican fin al día siguiente y se resuelven en backend;
   no tratarlos como inicio posterior al fin. Definir límites y fecha de origen.
8. Fechas y horas en zona IANA de empresa; intervalos sin duplicar bordes.
   Días completos son medianoche local hasta la siguiente, no siempre 24 horas.
   Horas ambiguas/inexistentes en cambio horario requieren política explícita.

## Ausencias y protección de citas

- Vacaciones y permisos por horas, días o rango; confirmar empleado y alcance.
- Propuesta primera versión: gestión directa por OWNER/ADMIN, sin saldo de
  vacaciones ni flujo de aprobación. Distinguir descanso programado de ausencia.
- Un cambio no borra, mueve ni cancela citas automáticamente. Propuesta:
  si deja citas futuras fuera de disponibilidad, bloquear aplicación y listar
  conflictos para resolverlos; mostrar el impacto antes de confirmar.
- Proteger también frente a una cita creada entre previsualización y guardado,
  con comprobación transaccional, aislamiento y auditoría de cambios.
- Listar motivos privados solo a perfiles autorizados; no exponerlos en reserva
  pública. Control de versión para evitar sobrescribir trabajo de otra persona.

## Criterios de aceptación

Todos los textos de la interfaz deben usar lenguaje natural orientado al negocio.
Explicar qué se puede hacer y qué consecuencias tiene, sin mostrar convenciones
internas como numeración de días, tipos de API, claves de datos o detalles de
implementación. Revisar etiquetas, ayudas, errores, confirmaciones y estados
vacíos en el conjunto del frontend, no solo en el cuadrante.

Avatar respeta color y fondo suave sin opacidad global. Un lunes partido,
una pausa recurrente, una rotación A/B con empleados desfasados, una excepción
de un día, vacaciones de varios días y un permiso por horas se guardan y se
recuperan igual tras recargar. Un descanso explícito no hereda horario base.
Disponibilidad y validación de citas coinciden con el cuadrante; conflictos,
roles e IDs cruzados se rechazan. Conservar horarios existentes y citas históricas.

## Decisiones a validar

- Confirmar cuadrante semanal y móvil por día, y ubicación en Equipo.
- Confirmar plantillas copiadas al asignar y rotación de N semanas con desfase.
- Confirmar ausencias directas por administración, sin solicitudes/saldos por ahora.
- Confirmar bloqueo de cambios con citas afectadas, sin cancelación automática.
- Acordar máximo de semanas del ciclo, horizonte de asignación y política DST.
- Decidir si permisos necesitan subtipo propio o etiqueta sobre ausencia/personal;
  no afirmar que ya existe un tipo de permiso específico en API.
