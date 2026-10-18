# Asignaciones, horarios y bloqueos

Estado: alcance aprobado por el usuario («go»), 18/10/2026. Plan final pendiente de ratificación; no implementado.

## Objetivo

Configurar quién presta cada servicio, turnos semanales y ausencias de cada empleado desde el panel.

## Estado comprobado

GET/PUT services/:serviceId/employees; GET/PUT employees/:employeeId/working-hours; CRUD calendar/blocks. employeeIds admite lista vacía en el DTO; no imponer mínimo de uno sin revisar regla real. Horarios usan domingo 0 a sábado 6 y PUT reemplaza la semana.

## Alcance y límites propuestos

Dividir entrega en 3A asignaciones, 3B horarios y 3C bloqueos. Mantener zona horaria de empresa y permisos actuales; la agenda visual completa no forma parte de este bloque.

## Criterios de aceptación

Asignaciones cruzadas, duplicadas, vacías y empleado inactivo según contrato. Turnos partidos, límites de día, orden e intersecciones y semana vacía. Bloqueos que cruzan medianoche y cambio horario, conflictos y persistencia. Disponibilidad API refleja cambios; no declarar validada agenda todavía provisional.

## Decisiones pendientes

Decidir si un servicio sin empleado debe guardarse como configuración incompleta: propuesta permitirlo si backend lo admite y advertir que no será reservable. Definir dónde aparecen horarios/bloqueos: propuesta ficha del empleado. Sin instalar calendario nuevo.
