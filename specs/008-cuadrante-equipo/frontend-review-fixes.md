# Ejecución del repaso frontend

08/11/2026. El usuario autoriza expresamente resolver todos los hallazgos del
informe docs/frontend-review-2026-11-08.md y entregar después pruebas manuales
paso a paso. Este documento concreta esa ejecución, sin ampliar funcionalidades.

- F01–F03: unificar el borrador de días y turnos; cualquier edición actualiza
  el estado que se guarda. Seleccionar días conserva cambios; fecha de vigencia
  independiente de la carga inicial. Retirar el paso intermedio "Aplicar".
- F04: confirmar descarte en todos los editores de horarios y rotaciones; avisar
  ante recarga/salida del documento con cambios sin guardar.
- F05–F09: etiquetas de búsqueda, contraseña por teclado/en español, nombres de
  cierres, token de contraste, navegación con enlaces y salto al contenido.
- F10–F13: semana con fecha y navegación agrupada, día activo móvil, contenido
  resumido, edición compacta junto a selección, selector de empleados buscable
  con seleccionados persistentes y versiones para todas las personas elegidas,
  estado de vista/semana/filtro/página en URL, preservando empresa.
- F14: textos de negocio comprensibles y pantallas provisionales claras.
- Sin nuevas dependencias, migraciones, cuentas ni cambios de arquitectura.
  Mantener comprobación de citas, versiones, auditoría y alcance del backend.
- Añadir regresiones de borradores, selección, URL y contraste. Ejecutar
  npm run check y verificación Playwright en escritorio/móvil emulado. Pruebas
  de guardado en navegador interceptadas o con datos QA autorizados, indicando
  cuál se realizó. No afirmar pruebas de móvil físico/lector de pantalla.
- Registrar evidencia, límites y guía manual. Commit y push requieren sus
  autorizaciones separadas habituales.

## Resultado

- F01–F14 implementados. Evidencia y comprobaciones pendientes en
  [guía manual](../../docs/frontend-review-checklist-2026-11-08.md).
- Controles completos correctos: 12 scripts, 459 backend, 28 frontend y builds.
  Repetidos controles/build frontend tras ajustes finales de presentación.
- Playwright confirma conservación del borrador, igualdad de payload entre
  comprobación y guardado interceptado, descarte y recarga de vista/semana.
  Capturas inspeccionadas en escritorio y móvil emulado. No hubo escrituras reales.
- Pendiente validación del usuario sobre diseño y persistencia real con citas.
