# Eliminar servicios y categorías

Estado: alcance aprobado con ajustes y «go» final del usuario, 18/10/2026.
Implementación frontend realizada; verificación manual y concurrencia pendientes.

## Ajuste solicitado en valoración (18/10/2026)

Ante un 409 ofrecer «Desactivar» con confirmación explícita; no desactivar de
forma automática ni volver a intentar borrar referencias. Servicio y categoría
admiten isActive en PATCH. Añadir esa capacidad al cliente de categorías y
reutilizar suspensión de servicios. Mantener el recurso y sus referencias,
recargar listados y permitir reactivarlo. Verificar disponibilidad/branding público
para explicar el efecto real de desactivar categorías: no asumir cascada sobre
sus servicios. Probar cancelar, error de PATCH, permisos, reactivación y recarga.

## Objetivo

Permitir a OWNER/ADMIN eliminar servicios y categorías desde el catálogo de la empresa activa, con confirmación y sin alterar las reglas de conservación existentes.

## Estado comprobado

Backend DELETE disponible. Servicios con asignaciones a empleados o cualquier cita devuelven 409; categorías con cualquier servicio también. El frontend no expone DELETE.

## Alcance y límites propuestos

Se conserva el rechazo por referencias; no habrá borrado en cascada, desvinculación automática ni borrado lógico nuevo. Ante historial se ofrece la suspensión existente del servicio.

## Criterios de aceptación

Cancelar no envía DELETE; éxito elimina del listado tras recarga; conflictos conservan todos los datos; IDs cruzados y roles no autorizados se rechazan. Probar referencias simultáneas y recurso borrado en otra pestaña.

## Decisiones pendientes

Sin dependencias ni migraciones previstas. Base: docs/catalog-deletion-impact.md. Decidir si se muestra una explicación previa de referencias o basta el conflicto devuelto; propuesta: mensaje específico disponible, sin inventar un contador.
