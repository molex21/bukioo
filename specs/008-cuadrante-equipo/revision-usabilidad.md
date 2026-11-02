# Revisión de horarios y plantillas

02/11/2026. Requisitos y plan aprobados mediante sendos "go". Entregas
implementadas; evidencia y límites en verification-usability.md. No sustituye
la evidencia de la entrega anterior. Migración nueva autorizada solo en la
base aislada de pruebas y después en desarrollo con autorización separada.

## Resultado esperado

Separar plantillas de turno reutilizables en fechas elegidas de rotaciones
semanales. Simplificar el guardado, explicar el horario recuperado y permitir
resolver citas afectadas mediante reasignación explícita. Rediseñar también el
editor semanal habitual. La mejora visual global del cuadrante y el selector
de semana quedan para la revisión de frontend acordada, con diseño por validar.

## Plan por entregas

### 1. Guardado y restablecimiento comprensibles

- Sustituir los dos botones actuales por "Confirmar y guardar". Ejecutar preview
  con el borrador exacto; aplicar solo si es válido. Mantener bloqueo de doble
  envío, versiones y revalidación transaccional al guardar.
- Ante conflictos, conservar el borrador y mostrar las citas afectadas. Ante
  resultado de escritura incierto, pedir recarga antes de repetir.
- Cambiar "Horario habitual" del editor diario a "Restablecer horario previsto".
- Antes de confirmar, mostrar fecha, turnos, pausas y origen que se recuperan,
  incluido "Día libre". Explicar las ausencias que siguen aplicándose.
- Obtener el resultado de quitar la excepción desde la resolución canónica del
  backend en preview; no inferirlo del horario actual ni duplicar precedencias
  en frontend. Extender la respuesta con el día resultante cuando corresponda.

### 2. Plantillas diarias y rotaciones separadas

- Entradas explícitas "Nueva plantilla de turno" y "Nueva rotación"; no usar
  un selector vacío con "Crear nueva" como única acción de creación.
- Plantilla diaria con nombre, tramos y pausas, sin día de semana obligatorio.
  Permitir elegir empleado y fechas concretas futuras, sin repetición.
- Rotaciones conservan sus semanas, desfases y vigencias actuales. Las existentes
  se conservan como rotaciones, sin convertirlas a turnos diarios por su nombre.
- Elegir una plantilla carga automáticamente una copia en el borrador. Permitir
  ajustarla antes de guardar; quitar el botón adicional de copia. No sobrescribir
  cambios manuales al refrescar datos de fondo.
- Guardar una asignación diaria como excepciones por fecha con versiones y
  auditoría. El lote es atómico: si una fecha falla, no guardar otras en silencio.
- Planificar una migración aditiva para distinguir tipo de plantilla y guardar
  el patrón diario; conservar datos existentes como ciclos. No editar migraciones
  aplicadas. Presentar SQL y reversión antes de solicitar su ejecución.

### 3. Resolver citas afectadas

- Mostrar fecha, hora y servicio de cada cita afectada, con "Reasignar".
- Listar personas activas de la misma empresa habilitadas para ese servicio y
  disponibles durante todo el intervalo ocupado, incluidos buffers. Comprobar
  pausas, ausencias, otras citas y conflictos entre las propias reasignaciones.
- Mantener fecha, hora, servicio y precio/duración históricos. No utilizar este
  flujo para trasladar una cita de día ni cambiar silenciosamente su estado.
- Preparar las reasignaciones en el borrador. Preview y confirmación abarcan el
  horario y todas las citas: guardar juntos en una transacción o no guardar nada.
- No encadenar PATCH de citas y PUT de horario independientes. La actualización
  genérica actual puede permitir solapes como PENDING: este flujo debe rechazarlos.
- Reutilizar reglas de reservas existentes mediante funciones que acepten la
  misma transacción; bloquear empleados implicados en orden estable, comprobar
  versiones de horarios y estado actual de citas, y auditar ambos cambios.
- Si no hay persona disponible, permitir volver al turno sin perder el borrador.
  No mover ni cancelar citas automáticamente.

### 4. Editor del horario semanal

- Mostrar los siete días de lunes a domingo con sus tramos y pausas visibles,
  descanso explícito y posibilidad de copiar un día a otros días elegidos.
- Ofrecer plantillas de turno y edición de turnos partidos/nocturnos sin números
  internos de días. Explicar desde qué fecha se aplicará el cambio.
- Mostrar antes de guardar el resumen semanal y advertir que una rotación o un
  cambio de una fecha concreta puede prevalecer sobre este horario base.
- Revisar el contrato legado antes de habilitar pausas o vigencias que no pueda
  representar. Ampliar backend y pruebas expresamente; no perder campos al guardar.
- Preparar estructura para escritorio y móvil y comprobar teclado/foco. El diseño
  visual global y el selector semanal se valorarán en la revisión frontend.

## Pruebas y límites

- Probar preview automático fallido, borrador cambiado, doble clic, escritura
  incierta y una cita nueva entre comprobación y guardado.
- Restablecer sobre ciclo/base, descanso, pausas y ausencias; mostrar resultado
  real en zona de empresa, incluidos turnos nocturnos y cambios de hora.
- Plantilla diaria independiente del día semanal, fechas múltiples, conservación
  de rotaciones existentes y rechazo atómico de un lote conflictivo.
- Reasignación permitida, servicio no asignado, otra empresa, persona inactiva,
  solape, buffers, vacaciones, citas modificadas concurrentemente y rollback total.
- Ejecutar npm run check y E2E en base aislada autorizada cuando se implemente.
  No ejecutar migraciones en desarrollo sin autorización correspondiente.
- Verificar manualmente textos, teclado y responsive. Playwright sigue pausado.
  No añadir modo oscuro ni almacenamiento de imágenes por este alcance.

## Orden y aprobaciones

Tras aprobar este plan, implementar las entregas en orden y registrar evidencia
sin dar por probada la interfaz solo por compilar. Preparar y revisar las
migraciones antes de aplicarlas. Commit y push conservan aprobaciones separadas.
