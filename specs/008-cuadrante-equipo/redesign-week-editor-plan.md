# Plan técnico: biblioteca y semana seleccionable

02/11/2026. Requisitos aprobados mediante "go" en redesign-week-editor.md.
Plan aprobado mediante "sí". Implementado; evidencia en verification-week-editor.md.
Sin dependencias nuevas. Presentar SQL y obtener permiso antes de aplicarlo.

## 1. Pausas y horas estimadas

- Añadir countsAsWork booleano a cada pausa, false por defecto en datos antiguos.
  Validarlo y preservarlo en normalización, edición, copias, plantillas, bases,
  excepciones y snapshots. Revisar los callbacks que reconstruyen pausas para
  que no pierdan el nuevo campo al cambiar horas o día de inicio.
- Calcular en borradores y plantillas la suma de tramos menos las pausas no
  computables. Mostrar día, semana y ciclo. Ante datos inválidos, explicar el
  error sin mostrar NaN ni horas negativas.
- Para fechas concretas, cálculo canónico SQL con scheduling_instant y zona de
  empresa: duración real, DST y reparto nocturno sin doble cómputo. Si hay horas
  ambiguas/inexistentes, avisar que el total no puede calcularse.
- Extender quadrant/preview con minutos estimados y resumen del rango. Etiqueta
  "Horas programadas estimadas"; plantillas nominales frente a fechas reales.
  Mantener ausencias y atención disponible diferenciadas; no es nómina ni fichaje.
- Todas las pausas bloquean citas, computen o no. El campo cabe en el JSON actual;
  la función SQL nueva requiere migración aditiva, sin editar migraciones previas.

## 2. Biblioteca de plantillas

- Separar listado y formulario en ScheduleTemplateManager. Mostrar nombre, tipo,
  turnos y horas por día/semana/ciclo; acciones de editar y archivar.
- Un botón "Nueva" permite escoger turno o rotación. Eliminar el selector como
  navegación de edición. Avisar antes de descartar un borrador con cambios.
- Reutilizar API, versiones y archivo existentes. Conservar copias ya asignadas.
  Añadir estados de carga, vacío, errores y guardado.

## 3. Semana con selección múltiple

- Crear componente semanal para EmployeeWeeklyBaseEditor y semanas de rotaciones:
  siete celdas lunes–domingo con turnos, pausas y horas estimadas.
- Selección con controles accesibles, estado visible, contador, seleccionar todo
  y quitar selección. Adaptación móvil sin depender de arrastre o teclas especiales.
- Sobre los días elegidos: aplicar plantilla de turno, definir turnos manuales
  o día libre. Si sus horarios difieren, mostrar "Horarios distintos" y exigir
  definir el nuevo contenido; no tomar silenciosamente el horario del primero.
- Aplicar copias independientes al borrador, mostrando los días que se sustituyen.
  Conservar los demás días y permitir cancelar. Guardar con el flujo automático
  de comprobación, versiones y reasignaciones ya implementado.
- Retirar "Copiar un día" y sus selectores de origen/destinos.
- En SchedulingQuadrant permitir seleccionar fechas de un empleado para abrir
  ese editor con el alcance visible. No mezclar empleados en lotes diarios.
  Sustituir la adición manual de fechas del editor diario por esta selección.
- Distinguir siempre días semanales repetidos de fechas puntuales.

## 4. Rotaciones entre fechas

- Exigir inicio y fin en ScheduleAssignmentEditor, fin>=inicio. Mostrar sucesión
  de semanas, desfase por empleado y días parciales de los extremos antes de guardar.
- Mantener compatibles las asignaciones antiguas sin fin; no recortarlas ni
  imponer un cambio masivo. La nueva interfaz siempre envía fecha final.
- Revisar noches en el último día: limitar el tramo de rotación al intervalo
  asignado, fin inclusive y medianoche siguiente exclusiva, sin bloquear el
  horario base posterior. Mostrar cualquier recorte en la previsualización.
- Incluir la corrección SQL en la migración aditiva con regresiones de citas,
  ancla de lunes y conservación de tramos anteriores/posteriores.

## 5. Pruebas y entrega

- Dominio/helpers: pausa computable/no computable/mixta, 7 h 30 min frente a 8 h,
  turnos nocturnos, borradores heterogéneos, copias independientes y selección parcial.
- SQL/HTTP: persistencia de la casilla en todas las entidades, disponibilidad
  idéntica al cambiarla, DST, reparto nocturno, límites del intervalo, aislamiento,
  permisos, versiones y reasignación atómica con citas.
- Ejecutar npm run check y E2E en base aislada tras autorizar el SQL definitivo.
  Desarrollo necesita permiso separado para aplicar esa migración.
- Revisar manualmente textos, teclado, foco y móvil; Playwright sigue pausado.
  No declarar validada la interfaz por compilar.
- Actualizar API, README afectados, roadmap, memoria y evidencia. Mantener para
  la revisión frontend el diseño visual global y el selector de semana.

## Tareas en orden

Pendiente para el futuro rediseño visual del frontend, a petición del usuario:
revisar el selector de empleados de "Asignar ciclo". Valorar una selección
clara y cómoda de una o varias personas, búsqueda, identificación de empleados
y presentación móvil/teclado. Diseñar y validar la propuesta antes de aplicarla;
este apunte no modifica el selector actual.

- [x] Aprobar este plan técnico y tareas.
- [x] Modelo de pausa y cálculos nominales con pruebas.
- [x] Preparar migración/cálculo real, revisar SQL y autorizar pruebas aisladas.
- [x] Biblioteca de plantillas con listado y botón "Nueva".
- [x] Semana seleccionable en horario base y rotaciones, retirando copia de días.
- [x] Selección de fechas en cuadrante y aplicación en lote.
- [x] Inicio/fin, previsualización y límites nocturnos de rotaciones.
- [x] Controles completos, documentación y evidencia.
- [x] Autorizar y aplicar activación en desarrollo; 37 migraciones, ninguna pendiente.
- [ ] Realizar revisión manual y visual.
