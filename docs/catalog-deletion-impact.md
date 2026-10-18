# Pendiente: eliminar servicios y categorías

Solicitado el 18/10/2026. Revisión estática del código; no implementado en
frontend y no se han borrado datos ni ejecutado migraciones en esta revisión.

## Estado actual

Ambos recursos tienen DELETE en backend bajo el businessId:

- `/businesses/:businessId/services/:serviceId`.
- `/businesses/:businessId/service-categories/:categoryId`.

Servicios y categorías comprueban permisos de gestión, empresa y organización.
El cliente `frontend/src/lib/workspace-catalog-api.ts` no expone estas acciones;
falta añadirlas y conectarlas en `WorkspaceCatalogPage.tsx`.

| Recurso | Regla actual del backend | Impacto |
| --- | --- | --- |
| Servicio | 409 si tiene filas en employee_services o appointments | Las asignaciones también bloquean el borrado aunque no existan citas. Las citas cuentan con cualquier estado, incluidas las históricas. No borrar citas para habilitar la eliminación. |
| Categoría | 409 si existe cualquier servicio asociado | Incluye servicios suspendidos. No se eliminan automáticamente sus servicios. La posible desvinculación o reasignación requiere decidir un flujo específico. |
| Servicio sin referencias | Eliminación física | Desaparecen su configuración, campos adicionales, opciones y suplementos almacenados en el propio servicio. |

La suspensión de servicios ya existe como alternativa para retirarlos de la
operativa conservando referencias. La eliminación no debe sustituir ese flujo
cuando existe historial. El futuro precio por hora debe incorporarse al análisis
de histórico cuando se defina dónde se almacena y cómo se calcula.

## Trabajo necesario

- Integrar DELETE en cliente API e interfaz, con confirmación que identifique
  el recurso y advierta del borrado definitivo; cancelar no envía la petición.
- Mostrar conflictos 409 comprensibles, impedir reenvíos mientras se guarda,
  manejar 403/404 y errores de red sin anunciar éxito incierto.
- Actualizar listados y selectores de categorías/servicios tras éxito, sin
  dejar formularios apuntando a un recurso eliminado. Comprobar la reserva
  pública y disponibilidad API; la reserva pública visual sigue provisional.
- Preservar permisos OWNER/ADMIN y alcance de empresa/organización en API;
  ocultar un botón no sustituye estos controles.
- Revisar concurrencia: el conteo de referencias y DELETE son consultas
  separadas. Una asignación o cita simultánea puede cambiar el resultado o
  provocar una restricción SQL; comprobar traducción a conflicto y atomicidad
  antes de dar por robusto el flujo. No se ha ejecutado esta prueba.
- Verificar la política de auditoría aplicable antes de afirmar que el borrado
  queda registrado. La revisión actual no demuestra ese registro.

No se necesita una migración solo para conectar los endpoints existentes.
Cambiar a borrado lógico o cambiar reglas de referencias requiere especificación
y análisis adicional, sin asumir aprobación de ese cambio.

## Pruebas previstas

1. Crear servicio desechable sin referencias: cancelar, confirmar y recargar;
   desaparece solo al confirmar. Probar categoría vacía de la misma forma.
2. Servicio con empleado asignado y servicio con cita histórica: 409 y datos
   conservados. Categoría con servicio activo o suspendido: 409.
3. Probar permisos insuficientes e IDs cruzados entre empresas y organizaciones.
4. Repetir con red fallida, recurso eliminado en otra pestaña y alta simultánea
   de referencias; verificar mensajes y consistencia, sin falsos éxitos.
5. Revisar selects abiertos, listas, teclado, foco de la confirmación y móvil.

Referencias revisadas: services.service.ts (remove), services.repository.ts
(countReferences/remove), service-categories.service.ts (remove) y su repository,
controladores de ambos módulos y cliente de catálogo del frontend. Existen tests
unitarios de rechazo por referencias; no se ha ejecutado la suite en esta tarea
documental ni validado borrado real por HTTP o navegador.
