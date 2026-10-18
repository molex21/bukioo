# Evidencia 3A: asignaciones

18/10/2026. Acción "Empleados" en cada servicio existente del catálogo.
Carga empleados activos y asignaciones mediante los GET existentes; guardar
reemplaza la selección con PUT. Cancelar no guarda. Una lista vacía se permite
con aviso de ausencia de franjas hasta completar asignaciones y horarios.

Estados de carga y error bloquean guardar para evitar sustituir asignaciones
que no se pudieron consultar. Un error de guardado exige recarga antes de
reintentar. Protección de doble envío y resultados tardíos al desmontar.
No se modificaron contratos backend ni citas, ni se añadieron dependencias.
La API existente filtra asignados activos; guardar reemplaza también las
relaciones anteriores con empleados que ya no estén activos.

Prueba añadida: contrato de retirada completa de asignaciones; las existentes
cubren duplicados y rechazo de empleados ajenos/inactivos. Tras corregir un
error inicial de lint por setState síncrono en efecto, npm run check completo
correcto: 12 pruebas scripts, 450 backend, lint y ambos builds. Persiste el
aviso de bundle grande (1553,79 kB; 344,38 kB gzip).

No ejecutados: navegador/Playwright en pausa, teclado, responsive, E2E aislados
y cambios reales de asignaciones. Tests backend no validan el diálogo frontend.
Pendientes: abrir con selección existente, añadir/quitar/retirar todos,
cancelar, recargar, cambiar empresa, errores de red y empleado archivado durante
la edición. No se detectan ediciones concurrentes mediante versión; el PUT
existente reemplaza la selección completa y debe probarse esa limitación.

3B horarios y 3C bloqueos no implementados en esta entrega.
