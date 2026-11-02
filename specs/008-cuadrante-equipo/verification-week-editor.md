# Evidencia: biblioteca y semana seleccionable

02/11/2026. Requisitos aprobados mediante "go", plan técnico mediante "sí".
Implementación terminada; migración 20261102150000 aplicada en pruebas y desarrollo.

## Resultado

Asignación simplificada: selección de plantilla, empleados e intervalo como
controles principales; semana inicial en opciones desplegables. Se puede crear
una rotación dentro del flujo y volver con ella seleccionada, conservando los
empleados y fechas. Usa el formulario y API existentes. Controles completos
correctos; revisión visual de este ajuste pendiente.

Ajuste posterior aprobado mediante "go": el editor de turnos aparece abierto
al seleccionar días, sin botón "Definir turnos". En selección heterogénea se
muestra vacío y no permite aplicar sin edición explícita o selección de plantilla.
Revisado el formulario diario: no contiene fechas ni días semanales. Se aclaró
que las fechas pertenecen a la asignación del horario o la rotación. Sin cambio
de backend/esquema; comprobación visual de este ajuste todavía pendiente.

- Biblioteca de plantillas/rotaciones en listado, botón "Nueva", horarios y horas
  estimadas, acciones de editar/archivar y confirmaciones antes de descartar
  cambios del formulario o cerrar el modal de plantillas con cambios pendientes.
- Semana lunes–domingo con selección múltiple, controles de selección accesibles,
  plantillas diarias, edición manual y descanso para los días elegidos. Copias
  independientes, borradores heterogéneos explícitos y conservación de los demás
  días. Eliminados los controles de copiar días del editor semanal.
- Selección de fechas de un empleado en el cuadrante y editor conjunto; comando
  dates conserva turnos diferentes por fecha y se guarda atómicamente. Retirada
  la adición manual de fechas del editor diario. Rotaciones no aparecen como
  plantillas diarias en ese editor.
- countsAsWork booleano opcional por pausa, false por defecto, conservado por
  todos los normalizadores y editores. La casilla modifica horas de trabajo
  estimadas; todas las pausas continúan impidiendo citas.
- Totales nominales de turno, día, semana, ciclo e intervalo de rotación. Turnos
  nocturnos y pausas mixtas; errores de borrador sin totales negativos ni NaN.
- SQL canónico para minutos reales de trabajo por fecha, sin descontar ausencias
  de ese indicador de trabajo programado (se muestran separadas y sí afectan a
  atención). Reparte noches entre fechas y usa la zona de empresa/DST. Ante
  ambigüedad devuelve null para el total, no cero silencioso.
- Inicio y fin obligatorios en la nueva interfaz de rotaciones, desfase por
  empleado, resumen de días y semanas. Se mantiene la API compatible con ciclos
  antiguos sin fin. La última noche se recorta a la medianoche posterior al fin
  inclusive; se conserva el horario base que corresponda después.
- Conservados comprobación automática, permisos, versiones, auditoría y flujo de
  citas/reasignaciones atómicas de la entrega anterior.

## SQL y alcance de autorización

Migración 20261102150000_add_estimated_work_time.sql presentada al usuario y
autorizada expresamente SOLO en bukioo_scheduling_20261027_test. Aplicada con
éxito allí (37 migraciones). Añade scheduling_intervals y scheduling_work_minutes
y adapta scheduling_day sin cambiar su contrato. No rellena ni borra datos.
Antes de completar valida citas futuras y aborta si el recorte nocturno las
deja fuera del horario. Reversión automática bloqueada para exigir revisión.

Después el usuario autorizó mediante "go" aplicarla en localhost/bukioo.
Se comprobó que era la única pendiente y se aplicó correctamente: 37 aplicadas,
ninguna pendiente. Verificadas la función y una consulta de lectura del cálculo
real sobre un empleado local. No se modificó .env ni horarios o citas para
esta comprobación, no se copiaron datos y las suites siguen ejecutadas solo en pruebas.

## Controles

- npm run check correcto (invocación npm.cmd por política de PowerShell): 12
  pruebas de scripts, 459 backend, 22 helpers frontend, lint y ambos builds.
- E2E completos correctos: 50 casos, tres suites, en la base aislada autorizada.
- Pruebas nuevas de dominio/SQL/helpers: pausas computables/no computables/mixtas,
  persistencia en plantillas/bases/excepciones/snapshots, selección parcial y
  copias independientes, borradores heterogéneos, rangos y desfase, noche y su
  límite final, DST de primavera/otoño, horas ambiguas y disponibilidad idéntica
  durante pausas computables. Se conserva la cobertura previa de citas y permisos.
- Compilación frontend: bundle 1620,57 kB, 366,12 kB gzip; persiste el aviso previo
  de tamaño. No se introdujeron dependencias ni se cambió el empaquetado.
- Diff y referencias locales comprobados. README público actualizado al código,
  sin trasladar decisiones de aprobación a esos archivos.

## Límites explícitos y revisión pendiente

- La estimación nominal de una rotación cubre todo el intervalo. Su detalle y el
  cálculo real mostrado por preview se limitan a 42 días para acotar la consulta;
  se indica el recorte en pantalla y mediante estimatedTruncated. No se presenta
  el subtotal real parcial como el total real de un intervalo mayor.
- No se han comprobado visualmente navegador/móvil, teclado, lector de pantalla
  ni contrastes de la selección. Playwright sigue pausado. No afirmar validación
  visual por pasar pruebas de helpers o compilar.
- Activación en desarrollo completada con autorización separada. Sin commit ni push de las
  entregas del 02/11. Snapshots y ayudantes temporales no se incluyen en producto.
- El diseño global del cuadrante y el selector de semana permanecen reservados
  para la revisión frontend acordada. No se añade modo oscuro ni imágenes.
