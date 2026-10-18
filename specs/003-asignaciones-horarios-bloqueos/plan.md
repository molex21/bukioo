# Plan provisional: Asignaciones, horarios y bloqueos

Entrega 3A ratificada con "dale", 18/10/2026, e implementada en frontend.
Lista vacía permitida con aviso según contrato actual. 3B ratificado al pedir
siguiente punto e implementado; ver verification-3b.md. 3C sigue pendiente.
No se presenta todo el bloque como terminado ni la interfaz como probada.

## Implementación propuesta

3A: selector de empleados activos de la misma empresa y reemplazo de asignaciones. 3B: editor por día con varios turnos y envío de semana completa. 3C: lista por rango/empleado y formularios de tipo, inicio, fin y motivo. Reutilizar Mantine/dates y dayjs existentes; verificar conversión de zona horaria y DST antes de elegir utilidades o añadir plugins. Actualizar consultas afectadas tras cada operación.

## Validación

Asignaciones cruzadas, duplicadas, vacías y empleado inactivo según contrato. Turnos partidos, límites de día, orden e intersecciones y semana vacía. Bloqueos que cruzan medianoche y cambio horario, conflictos y persistencia. Disponibilidad API refleja cambios; no declarar validada agenda todavía provisional.

Ejecutar npm run check tras código/configuración; E2E en base aislada _test
cuando corresponda a permisos o persistencia. Probar responsive y teclado en
los flujos nuevos; la revisión global con skills será posterior. Playwright
permanece en pausa hasta indicación del usuario. No declarar evidencia no obtenida.

## Dependencias y decisiones

Decidir si un servicio sin empleado debe guardarse como configuración incompleta: propuesta permitirlo si backend lo admite y advertir que no será reservable. Definir dónde aparecen horarios/bloqueos: propuesta ficha del empleado. Sin instalar calendario nuevo.

## Documentación y entrega

Actualizar API reference si cambia contrato, README si cambia funcionamiento,
roadmap, memoria y changelog según cambios reales. Registrar pendientes y
pruebas por requisito. Commit y push con aprobaciones separadas; no automáticos.
