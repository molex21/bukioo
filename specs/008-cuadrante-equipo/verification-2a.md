# Evidencia: consulta del cuadrante

27/10/2026. Subentrega 2A, sin migraciones ni cambios en contratos backend.

Equipo permite alternar lista/cuadrante. La vista consulta zona horaria real
de la empresa, empleados activos, horarios y bloqueos. Tabla semanal en
escritorio y lista por días en pantallas pequeñas; filtro y páginas de diez
empleados para acotar peticiones. Se consultan horarios en lotes de cuatro.

Las celdas muestran turnos previstos y bloques por separado, no una promesa
de disponibilidad de citas. No exponen motivos privados de bloques ni muestran
citas. No se representan rotaciones que el backend todavía no soporta.
Solo lectura: conserva la edición semanal existente, sin usar PUT para
simular excepciones por fecha. Esa escritura requiere siguiente plan técnico.

Fechas locales calculadas con Intl y días de calendario independientes de la
zona del navegador. Fin de bloqueo exclusivo; cambio de día/horario y vigencias
probados en helpers. La API de horarios se interpreta conforme a sus tipos
actuales; revisar integración real de vigencias antes de declarar validada la
representación de horarios antiguos con límites de fecha.

Controles: npm run check correcto, 12 tests de scripts, 452 backend y 5 tests
nuevos de fechas del cuadrante, lint y compilaciones. Los nuevos tests se
integran en check:frontend usando Node con soporte nativo TypeScript, sin
dependencias. Persiste aviso de bundle grande (1565,42 kB; 347,71 kB gzip).

No ejecutados: navegador/Playwright, responsive real, teclado, cuentas con
distintos permisos ni E2E. No se han alterado horarios ni bloques de la base.
Pendiente validación de los nuevos componentes en esas condiciones.
