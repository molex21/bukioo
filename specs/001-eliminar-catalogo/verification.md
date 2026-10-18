# Evidencia de la entrega 1

18/10/2026. Frontend implementado, backend y migraciones sin cambios.

- Cliente: DELETE de servicio/categoría y PATCH de estado de categoría.
- Interfaz: confirmación con nombre, bloqueo de reenvío durante petición,
  conflicto de borrado con alternativa desactivar y segunda confirmación,
  reactivación de inactivos y recarga del catálogo.
- Error de red, 404 o 5xx: pedir actualización del catálogo, sin anunciar éxito
  ni repetir automáticamente la operación. 403 conserva mensaje de API.
- Permisos: la pantalla sigue restringida a gestión OWNER/ADMIN y los endpoints
  mantienen su autorización y filtros existentes de empresa/organización.
- Verificación estática del catálogo público: filtra servicios activos, sin
  filtrar por estado de categoría. El diálogo explica que desactivar categoría
  no desactiva automáticamente sus servicios.

`npm run check` correcto: 12 pruebas de scripts, 449 pruebas backend (74 suites),
lint y builds. Persiste el aviso de bundle grande, 1546,45 kB (342,61 kB gzip).
No se añadieron dependencias ni se modificaron contratos backend.

Los controles existentes no prueban interacciones de los nuevos diálogos.
No ejecutados: navegador/Playwright (en pausa por petición del usuario),
responsive/teclado, borrados reales, rechazo por roles con la interfaz nueva,
E2E contra base _test y carreras de referencias simultáneas. No se presenta
el conteo previo y DELETE del backend como operación atómica.

Checklist manual pendiente: cancelar sin petición; borrar recurso desechable;
409 con servicio asignado/cita o categoría con servicio; cancelar y confirmar
desactivación; reactivar; error PATCH/red; 404 en otra pestaña; recarga y
aislamiento. Consultar spec.md para criterios completos.
