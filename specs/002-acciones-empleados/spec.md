# Completar acciones de empleados

Estado: alcance aprobado por el usuario («go»), 18/10/2026. Plan final pendiente de ratificación; no implementado.

## Objetivo

Añadir invitación de ficha existente, recuperación de acceso, reset de 2FA y retirada de empleados, distinguiendo ficha de agenda y cuenta de usuario.

## Estado comprobado

Existen POST invite, password-reset, 2fa/reset y DELETE bajo businesses/:businessId/employees. invite rechaza user_id existente; DELETE archiva. Recuperación exige usuario vinculado; reset puede devolver 404 si no tiene 2FA.

## Alcance y límites propuestos

Respetar OWNER/ADMIN y las restricciones backend. Presentar la retirada como archivo de la ficha; no anunciar borrado de usuario ni revocación de sesiones. Reenvío no se da por implementado: revisar contratos de activación/invitación y definirlo antes de habilitar el botón.

## Criterios de aceptación

Ficha sin email, sin cuenta, con cuenta y con/sin 2FA; éxito y rechazo por rol/empresa; archivo preserva historial. Recepción y uso de invitación/recuperación con buzón controlado; sin transporte de pruebas se declara bloqueado, no validado.

## Decisiones pendientes

Decidir alcance del reenvío y si la retirada debe además revocar acceso: propuesta inicial, mantener contrato actual y explicar que son acciones distintas. No enviar correos reales durante preparación. Sin migraciones o paquetes nuevos por defecto.
