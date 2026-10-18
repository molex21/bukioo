# Plan provisional: Completar acciones de empleados

Alcance aprobado y plan ratificado al pedir seguir con el siguiente punto,
18/10/2026. Conectadas las cuatro acciones con contrato vigente. Reenvío separado
y pendiente de contrato backend; no se presenta recuperación como reenvío.

## Implementación propuesta

Ampliar workspace-employees-api.ts y añadir menú de acciones en WorkspaceTeamPage.tsx. Confirmar reset y archivo; mostrar efectos y errores; recargar estado. Revisar semántica del archivo sobre disponibilidad/asignaciones y acceso del usuario. Separar reenvío como tarea condicional: reutilizar endpoint probado o proponer extensión backend con permisos, límite de envíos y auditoría.

## Validación

Ficha sin email, sin cuenta, con cuenta y con/sin 2FA; éxito y rechazo por rol/empresa; archivo preserva historial. Recepción y uso de invitación/recuperación con buzón controlado; sin transporte de pruebas se declara bloqueado, no validado.

Ejecutar npm run check tras código/configuración; E2E en base aislada _test
cuando corresponda a permisos o persistencia. Probar responsive y teclado en
los flujos nuevos; la revisión global con skills será posterior. Playwright
permanece en pausa hasta indicación del usuario. No declarar evidencia no obtenida.

## Dependencias y decisiones

Decidir alcance del reenvío y si la retirada debe además revocar acceso: propuesta inicial, mantener contrato actual y explicar que son acciones distintas. No enviar correos reales durante preparación. Sin migraciones o paquetes nuevos por defecto.

## Documentación y entrega

Actualizar API reference si cambia contrato, README si cambia funcionamiento,
roadmap, memoria y changelog según cambios reales. Registrar pendientes y
pruebas por requisito. Commit y push con aprobaciones separadas; no automáticos.
