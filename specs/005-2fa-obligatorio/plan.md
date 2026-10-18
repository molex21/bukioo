# Plan provisional: 2FA obligatorio desde plataforma

Borrador ajustado para valoración; no autoriza implementación.

## Corrección de alcance solicitada (18/10/2026)

El usuario indica «opcional, no obligatorio». Se sustituye la propuesta de
imponer 2FA como objetivo general: no se activará ni exigirá automáticamente.
Antes de cerrar implementación confirmar si desea un control opcional de la
política require2faForAdmins por organización (que al activarse sí exige 2FA)
o únicamente 2FA voluntario por usuario. Este segundo alcance requiere revisar
la configuración de perfil y no equivale a conectar el endpoint de exigencia.
No desactivar políticas actuales ni cambiar seguridad de superadmin por defecto.
Debe ratificarse después de aprobar spec.md, conforme a docs/development.md.

## Implementación propuesta

Completar tipo/cliente de plataforma y control con valor cargado, confirmación explicativa, estado guardando y recarga. Si la lectura no expone la política, definir ampliación mínima de contrato. Revisar backend para describir exactamente cuándo entra en vigor y cómo se configura 2FA antes de exigirla.

## Validación

Persistencia activación/desactivación; superadmin frente a tenant; OWNER/ADMIN con y sin TOTP, empleado no afectado según regla vigente. Verificar transición y recuperación sin bloquear cuentas de prueba; documentar sesiones existentes y no afirmar revocación si no sucede.

Ejecutar npm run check tras código/configuración; E2E en base aislada _test
cuando corresponda a permisos o persistencia. Probar responsive y teclado en
los flujos nuevos; la revisión global con skills será posterior. Playwright
permanece en pausa hasta indicación del usuario. No declarar evidencia no obtenida.

## Dependencias y decisiones

Decisión: aprobar el texto de impacto después de verificar política efectiva y flujo de alta de TOTP. Sin activar la política en organizaciones existentes durante planificación.

## Documentación y entrega

Actualizar API reference si cambia contrato, README si cambia funcionamiento,
roadmap, memoria y changelog según cambios reales. Registrar pendientes y
pruebas por requisito. Commit y push con aprobaciones separadas; no automáticos.
