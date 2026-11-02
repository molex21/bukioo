# Tareas propuestas

Última revisión: tareas de biblioteca, semana seleccionable y pausas computables
en [redesign-week-editor-plan.md](redesign-week-editor-plan.md). Implementadas y
probadas; migración 20261102150000 aplicada en desarrollo con autorización separada.

## Ampliación de usabilidad, 02/11/2026

- [x] Aprobar requisitos y después plan de revision-usabilidad.md.
- [x] Comprobación automática antes de guardar y resumen al restablecer.
- [x] Plantillas diarias separadas de rotaciones, carga automática y fechas elegidas.
- [x] Reasignación de citas junto al horario, con disponibilidad, versiones y auditoría.
- [x] Editor semanal con fecha de inicio, pausas/noches, plantillas y copia de días.
- [x] Autorizar y aplicar migración 20261102120000 solo en base aislada de pruebas.
- [x] Pruebas de integración y helper de guardado; evidencia en verification-usability.md.
- [x] Autorizar y aplicar la migración nueva en desarrollo; 36 aplicadas, 0 pendientes.
- [ ] Validación manual/visual de esta entrega; rediseño global del cuadrante y selector.

## Entrega original

Implementación completada para pruebas de integración, 27/10/2026. Verificación
de interfaz pendiente; migraciones aplicadas en desarrollo con autorización.

- [x] Aprobar alcance completo y ratificar diseño técnico mediante "go".
- [x] Detallar modelo, contratos, migraciones y decisiones de producto.
- [x] Preparar diseño técnico completo en technical-plan.md, con contratos,
  tablas propuestas, reglas de fechas, conflictos, concurrencia y pruebas.
- [x] Ratificar technical-plan.md antes de cambiar backend/esquema.
- [x] Implementar avatar con borde/texto del color y fondo suave.
- [x] Aplicar borde e iniciales del color elegido y fondo al 12 %, sin opacidad
  global. Color de marca como alternativa cuando no se ha elegido uno.
- [x] Comprobar cálculo de contraste claro/oscuro y ofrecer corrección voluntaria.
- [ ] Verificar contraste y apariencia en navegador con temas reales.
- [x] Implementar cuadrante semanal/móvil con lectura y edición por fecha.
- [x] 2A: vista de consulta semanal/móvil con turnos y bloqueos, filtro,
  navegación, datos en zona de empresa y paginación.
- [x] 2B: edición diaria, descanso y vuelta al horario habitual.
- [x] Resolver disponibilidad efectiva y conflictos antes de nuevas escrituras.
- [x] Entrega 3: plantillas, rotaciones y asignaciones con vista previa y versión.
- [x] Entrega 4: pausas recurrentes, vacaciones y permisos por rango/horas.
- [x] Comprobar disponibilidad y validación de citas con las mismas reglas.
- [x] Añadir pruebas de cálculo, aislamiento, concurrencia, DST y compatibilidad.
- [x] Aplicar y probar migraciones exclusivamente en la base aislada autorizada.
- [x] Autorizar y aplicar migraciones en desarrollo; 35 aplicadas y 0 pendientes.
- [ ] Verificar interfaz, responsive, teclado y accesibilidad por entrega.
- [ ] Revisar los textos de toda la interfaz: lenguaje natural, claro y útil
  para el negocio. Quitar convenciones internas, nombres técnicos y explicaciones
  de implementación; explicar solo consecuencias y acciones relevantes.
- [x] Documentar resultados y límites en verification-full.md.
