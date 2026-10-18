# 2FA obligatorio desde plataforma

Estado: en valoración, ajustado según comentarios del usuario. Fecha: 18/10/2026.

## Corrección de alcance solicitada (18/10/2026)

El usuario indica «opcional, no obligatorio». Se sustituye la propuesta de
imponer 2FA como objetivo general: no se activará ni exigirá automáticamente.
Antes de cerrar implementación confirmar si desea un control opcional de la
política require2faForAdmins por organización (que al activarse sí exige 2FA)
o únicamente 2FA voluntario por usuario. Este segundo alcance requiere revisar
la configuración de perfil y no equivale a conectar el endpoint de exigencia.
No desactivar políticas actuales ni cambiar seguridad de superadmin por defecto.

## Objetivo

Añadir control para exigir 2FA a OWNER/ADMIN desde la ficha de organización de plataforma.

## Estado comprobado

Existe PATCH superadmin/organizations/:organizationId/security con require2faForAdmins booleano y lógica backend de seguridad. Debe comprobarse el dato en lectura y su efecto real sobre login, activación, recuperación y sesiones existentes.

## Alcance y límites propuestos

No modificar la política de autenticación como efecto lateral de crear el interruptor. No confundir desactivar obligatoriedad con quitar 2FA individual. Solo superadmin.

## Criterios de aceptación

Persistencia activación/desactivación; superadmin frente a tenant; OWNER/ADMIN con y sin TOTP, empleado no afectado según regla vigente. Verificar transición y recuperación sin bloquear cuentas de prueba; documentar sesiones existentes y no afirmar revocación si no sucede.

## Decisiones pendientes

Decisión: aprobar el texto de impacto después de verificar política efectiva y flujo de alta de TOTP. Sin activar la política en organizaciones existentes durante planificación.
