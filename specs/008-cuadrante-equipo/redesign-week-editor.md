# Propuesta: edición visual de semanas y biblioteca de turnos

02/11/2026. Requisitos aprobados mediante "go" y plan técnico mediante "sí".
Implementado; tareas en redesign-week-editor-plan.md y evidencia en
verification-week-editor.md. Migración nueva aplicada en pruebas y después en
desarrollo con autorización separada; revisión visual pendiente.
Sustituye la propuesta de interfaz de copia de
días y edición de plantillas mediante selector de revision-usabilidad.md.
Después de aprobar estos requisitos, preparar plan técnico y tareas antes de
implementar, según docs/development.md.

## Biblioteca de plantillas

- Ver todas las plantillas y rotaciones en un listado, con nombre, tipo,
  resumen del horario y horas estimadas. Acciones explícitas de editar/archivar.
- Un botón "Nueva" abre la elección entre plantilla de turno y rotación.
  No utilizar el selector actual como navegación del editor.
- La plantilla diaria define tramos y pausas reutilizables; la rotación organiza
  semanas. Editarlas no modifica las copias previamente asignadas.

## Semana editable como cuadrante

- Sustituir los siete formularios largos y los controles "Copiar un día" por
  una semana de lunes a domingo con turnos, pausas y horas estimadas visibles.
- Permitir seleccionar uno o varios días, con estado seleccionado explícito,
  selección por teclado, deselección y adaptación móvil.
- Sobre los días seleccionados: aplicar plantilla, definir un turno manual o
  dejarlos libres. Cargar una copia para revisar; persistir solo al confirmar.
- Mostrar el alcance antes de aplicar: días seleccionados y sustitución de sus
  turnos anteriores. Editar un solo día no modifica los otros ni la plantilla.
- En horario semanal se seleccionan días de la semana; en el cuadrante fechado
  se seleccionan fechas concretas. Mantener esa diferencia visible para evitar
  crear una repetición cuando se pretendía modificar días puntuales.

## Horas estimadas y pausas

- Mostrar horas por día y total semanal. En rotaciones, por semana y total del
  ciclo; en rangos fechados, total del rango aplicado.
- Cada pausa tendrá una casilla "Cuenta como tiempo de trabajo", desmarcada por
  defecto para conservar el cálculo anterior. Permite mezclar pausas computables
  y no computables en un mismo turno.
- Tiempo estimado = duración de los turnos menos pausas no computables.
  Una pausa computable cuenta para ese total, pero sigue impidiendo reservar
  citas en ella. No confundir horas estimadas, atención disponible y fichaje.
- El cálculo respeta turnos nocturnos. El resumen de una plantilla es teórico;
  los rangos fechados usan la zona de la empresa y la duración real de las fechas,
  incluidos los cambios de hora. Indicar la diferencia cuando corresponda.
- Conservar la decisión de cada pausa en plantillas, copias, ediciones y
  restablecimientos. La persistencia y compatibilidad requieren plan técnico;
  no basta añadir una casilla que se pierda al guardar.

## Rotaciones entre fechas

- Asignar una rotación a uno o varios empleados con fecha de inicio y fecha de
  fin obligatorias en la nueva interfaz, ambas incluidas en el alcance mostrado.
- Repetir las semanas del patrón dentro de ese intervalo; no extenderlo fuera
  de las fechas elegidas. Mostrar el resultado antes de confirmar.
- Si el intervalo empieza o termina a mitad de semana, aplicar solo esos días,
  conservando el día de semana del patrón. Mostrar semana inicial por empleado
  cuando haya desfase y conservar los tramos anteriores/posteriores existentes.
- Las asignaciones antiguas sin fecha final se conservan; no recortarlas ni
  eliminarlas automáticamente al introducir este nuevo flujo.

## Criterios de aceptación

- Se accede a editar desde un listado; "Nueva" es la acción única de creación.
- Se seleccionan lunes, miércoles y viernes y se aplica un turno en una acción,
  sin modificar martes/jueves ni guardar sin confirmación.
- Turno de 09:00 a 17:00 con pausa de 30 minutos: 7 h 30 min estimadas si no
  computa, 8 h si computa. En ambos casos no se ofrecen citas durante la pausa.
- Un turno nocturno conserva sus pausas y totales después de guardar/recargar.
- La rotación se aplica únicamente entre inicio y fin; el resumen muestra qué
  ocurrirá en los extremos y no pierde asignaciones fuera del intervalo.
- Mantener comprobación automática de conflictos, reasignación conjunta de
  citas, versiones, aislamiento de empresas y auditoría de la entrega anterior.
- Verificar interfaz, textos, responsive y teclado antes de declararlos probados.
