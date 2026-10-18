# Evidencia del bloque 2

18/10/2026. Conectadas acciones frontend mediante endpoints existentes.

- Invitar solo ficha sin usuario y con correo; mostrar destinatario y confirmar.
- Recuperación y reset de 2FA solo para cuenta vinculada; el backend comprueba
  autorización y aplica sus restricciones. La tabla muestra cuenta vinculada,
  sin afirmar permisos efectivos de acceso que no están en el listado.
- Archivo: confirma conservación del historial y que no cancela citas ni elimina
  cuenta/permisos. DELETE archiva la ficha en backend.
- Resultados inciertos impiden repetir directamente y piden actualizar equipo;
  los errores de invitación requieren actualización porque la cuenta podría
  haberse creado antes del fallo de envío. No se muestran credenciales.
- No existe endpoint de reenvío; pendiente separado, sin sustituirlo por reset.

Controles: npm run check correcto (12 pruebas scripts, 449 backend, lint y
compilaciones). Persiste el aviso de bundle grande. Backend sin cambios, sin
migraciones ni dependencias. No se enviaron correos ni archivaron fichas durante
esta tarea. No se ejecutaron Playwright, navegador, E2E aislados ni prueba de
recepción de correos. Los tests existentes no validan los nuevos diálogos.

Pendientes: casos manuales de permisos, sin correo/cuenta/2FA, éxito y fallos,
doble clic, resultados inciertos, cambios de empresa, teclado y responsive.
Revisar visualmente los colores de empleados en la tabla, incluido contraste
de iniciales; anotado también en memoria y roadmap.
