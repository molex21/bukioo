# Evidencia 3B: horarios

18/10/2026. Editor "Horarios" por empleado desde Equipo. GET consulta y PUT
reemplaza toda la semana con turnos locales de la empresa. Varios turnos por
día, máximo 28 semanales. Domingo 0, sábado 6; presentación lunes a domingo.
Valida horas completas, inicio anterior al fin y solapamientos; no convierte
las horas semanales usando la zona del navegador.

Cancelar no guarda; vaciar toda la semana requiere segunda confirmación.
Error de carga impide guardar; error de guardado exige recargar antes de
repetir. Sin mensaje de éxito dentro de la tabla. Vigencias específicas o
segundos no representables bloquean la edición para evitar sobrescribir datos.
No cambia citas existentes, contratos, dependencias ni migraciones.

Controles correctos: npm run check, con 12 pruebas de scripts y 452 backend,
lint y builds. Añadidas pruebas de semana vacía y turnos contiguos en domingo;
las existentes cubren turnos partidos, solapamientos y empleado ajeno.
Sigue el aviso de bundle grande (1558,65 kB; 345,68 kB gzip).

No ejecutados: navegador/Playwright en pausa, responsive, teclado, persistencia
real y E2E aislados. No se valida el diálogo con tests backend. Pendiente
comprobar recarga, cancelación, errores de red, roles y empresas, fechas de
vigencia, turnos alrededor del cambio horario y ediciones concurrentes.
El contrato PUT no tiene versión: guardar reemplaza la semana vigente.

La siguiente entrega es 3C: bloqueos.
