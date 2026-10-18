# Plan provisional: Eliminar servicios y categorías

Ratificado por «go» del usuario, 18/10/2026. Implementación frontend realizada.
Verificación visual/manual y concurrencia pendientes; backend sin cambios.

## Ajuste solicitado en valoración (18/10/2026)

Ante un 409 ofrecer «Desactivar» con confirmación explícita; no desactivar de
forma automática ni volver a intentar borrar referencias. Servicio y categoría
admiten isActive en PATCH. Añadir esa capacidad al cliente de categorías y
reutilizar suspensión de servicios. Mantener el recurso y sus referencias,
recargar listados y permitir reactivarlo. Verificar disponibilidad/branding público
para explicar el efecto real de desactivar categorías: no asumir cascada sobre
sus servicios. Probar cancelar, error de PATCH, permisos, reactivación y recarga.
Debe ratificarse después de aprobar spec.md, conforme a docs/development.md.

## Implementación propuesta

Ampliar workspace-catalog-api.ts con deleteService/deleteCategory. Añadir acciones y confirmación en WorkspaceCatalogPage.tsx; bloquear doble envío y gestionar 403/404/409 y error de red. Recargar listas y limpiar selecciones tras éxito. Revisar la carrera entre countReferences y DELETE y los errores SQL; si exige ampliar backend, concretar el ajuste antes de aplicarlo.

## Validación

Cancelar no envía DELETE; éxito elimina del listado tras recarga; conflictos conservan todos los datos; IDs cruzados y roles no autorizados se rechazan. Probar referencias simultáneas y recurso borrado en otra pestaña.

Ejecutar npm run check tras código/configuración; E2E en base aislada _test
cuando corresponda a permisos o persistencia. Probar responsive y teclado en
los flujos nuevos; la revisión global con skills será posterior. Playwright
permanece en pausa hasta indicación del usuario. No declarar evidencia no obtenida.

## Dependencias y decisiones

Sin dependencias ni migraciones previstas. Base: docs/catalog-deletion-impact.md. Decidir si se muestra una explicación previa de referencias o basta el conflicto devuelto; propuesta: mensaje específico disponible, sin inventar un contador.

## Documentación y entrega

Actualizar API reference si cambia contrato, README si cambia funcionamiento,
roadmap, memoria y changelog según cambios reales. Registrar pendientes y
pruebas por requisito. Commit y push con aprobaciones separadas; no automáticos.
