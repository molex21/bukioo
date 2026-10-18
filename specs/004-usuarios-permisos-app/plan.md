# Plan provisional: Usuarios y permisos en /app

Borrador para valorar junto con la especificación; no autoriza implementación.
Debe ratificarse después de aprobar spec.md, conforme a docs/development.md.

## Implementación propuesta

Crear cliente tenant de miembros, reutilizar tipos y reglas de presentación sin copiar permisos de plataforma. Añadir entrada de organización en /app que conserve contexto. Confirmar cambios con impacto y recargar perfil, menú y contexto cuando afectan al actor. Revisar restricciones de OWNER, autoedición y cambio de ADMIN con selección de empresas.

## Validación

OWNER/ADMIN/EMPLOYEE, organización ajena, protección de propietario, propia suspensión o pérdida de permisos según backend. Estado de acceso distinto de permiso de agenda. Paginación/filtros, errores y cambios simultáneos; pruebas E2E de organización existentes como base.

Ejecutar npm run check tras código/configuración; E2E en base aislada _test
cuando corresponda a permisos o persistencia. Probar responsive y teclado en
los flujos nuevos; la revisión global con skills será posterior. Playwright
permanece en pausa hasta indicación del usuario. No declarar evidencia no obtenida.

## Dependencias y decisiones

Decidir ubicación: propuesta Configuración > Usuarios y permisos, explicando alcance organizativo. No asumir que invitación/reenvío o transferencia de propiedad pueden añadirse solo cambiando el prefijo de plataforma.

## Documentación y entrega

Actualizar API reference si cambia contrato, README si cambia funcionamiento,
roadmap, memoria y changelog según cambios reales. Registrar pendientes y
pruebas por requisito. Commit y push con aprobaciones separadas; no automáticos.
