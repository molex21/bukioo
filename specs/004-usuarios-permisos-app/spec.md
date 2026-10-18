# Usuarios y permisos en /app

Estado: alcance aprobado por el usuario («go»), 18/10/2026. Plan final pendiente de ratificación; no implementado.

## Objetivo

Permitir gestión de miembros de la organización desde el panel tenant, separada de las fichas de empleados por empresa.

## Estado comprobado

OrganizationsController expone listado y PATCH de rol, estado y empresas; la autorización en servicio limita gestión a OWNER/ADMIN. Plataforma ya tiene componentes y reglas reutilizables, pero no todas sus acciones tienen equivalente tenant.

## Alcance y límites propuestos

Primera entrega: listar, buscar/filtrar/paginar, cambiar rol, estado y empresas según contratos tenant. No reutilizar endpoints superadmin. Transferencia de propiedad, cambio de correo e invitación de usuario sin ficha quedan fuera salvo confirmar endpoint tenant y ampliar alcance.

## Criterios de aceptación

OWNER/ADMIN/EMPLOYEE, organización ajena, protección de propietario, propia suspensión o pérdida de permisos según backend. Estado de acceso distinto de permiso de agenda. Paginación/filtros, errores y cambios simultáneos; pruebas E2E de organización existentes como base.

## Decisiones pendientes

Decidir ubicación: propuesta Configuración > Usuarios y permisos, explicando alcance organizativo. No asumir que invitación/reenvío o transferencia de propiedad pueden añadirse solo cambiando el prefijo de plataforma.
