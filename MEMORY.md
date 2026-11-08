# Memoria de BUKIOO

Actualizada: 08/11/2026. Estado real, decisiones y continuidad; sin secretos.

## Primer paso de la próxima sesión: validar las correcciones

Acuerdo de cierre del 08/11: preparar commit de esta entrega y dedicar la
próxima sesión a probarla con la guía, antes de continuar con otros puntos.
Priorizar guardado real y recarga, conflictos con citas, borradores y móvil.

08/11: el usuario pidió resolver todos los hallazgos del repaso frontend.
F01–F14 implementados: borrador único, vigencia independiente, avisos de
descarte/recarga, accesibilidad, contraste, enlaces, semana/día móvil, selector
buscable de empleados con versiones individuales y estado de consulta en URL.
Plan: specs/008-cuadrante-equipo/frontend-review-fixes.md.
Informe histórico: docs/frontend-review-2026-11-08.md.
Revisar paso a paso: docs/frontend-review-checklist-2026-11-08.md.

Controles completos correctos: 12 pruebas de scripts, 459 backend, 28 frontend,
lint y builds. Repetido frontend tras últimos ajustes. Playwright: escritorio
1440×900 y móvil emulado 390×844; cambios de selección/fecha conservan horas,
guardado interceptado comprueba/envía el mismo borrador, cierre con descarte,
ausencias sin Pausa y URL tras recarga. Texto secundario: 4,55:1 medido.
Sin escrituras reales durante estas pruebas. Persistencia, conflictos con citas,
roles alternativos, lector de pantalla, zoom y móvil físico pendientes.
No se añadieron dependencias ni migraciones. Logo aplazado y sin modo oscuro.
Sin commit/push de estos cambios. Último commit a19c4fc; consultar Git.
Capturas/helpers en tmp/frontend-review y .playwright-cli: no incluirlos en Git.

Retirada "Pausa" de nuevas ausencias. Las pausas de turnos/plantillas y los
bloqueos BREAK anteriores se conservan; su opción antigua queda deshabilitada
al editar. Comprobado que no se ofrece para crear una nueva ausencia.

### Entregas anteriores (histórico)

### Entrega de usabilidad, 02/11/2026

Pendiente para la revisión futura del frontend: rediseñar el selector de
empleados de "Asignar ciclo", además del cuadrante y selector de semana.
Anotado en specs/008-cuadrante-equipo/redesign-week-editor-plan.md; no cambiarlo
ahora por esta petición.

Último ajuste solicitado: simplificar asignación de ciclos a elegir plantilla y
empleados, manteniendo inicio/fin. Añadida creación de rotación dentro de la
asignación; al guardar queda seleccionada y conserva empleados y fechas.
Semana inicial por empleado queda en opciones desplegables, solo en rotaciones
de más de una semana. El resto del flujo se mantiene; sin cambios de esquema.

Último ajuste aprobado mediante "go": editor de turnos abierto automáticamente
al seleccionar días; sin botón "Definir turnos". Si los horarios difieren,
empieza vacío y exige edición explícita o plantilla antes de sustituirlos.
Revisados formularios: plantilla diaria sin fechas/días; rotación define semanas
y las fechas se eligen al asignarla. Textos aclarados en biblioteca y horario
del empleado. No requiere migración. Pendiente comprobar visualmente este ajuste.

Nuevo feedback manual: el usuario rechaza el selector para editar plantillas y
los controles de copia de días. Requisitos aprobados mediante "go" en
specs/008-cuadrante-equipo/redesign-week-editor.md: biblioteca con botón "Nueva",
semana tipo cuadrante con selección múltiple para aplicar plantilla/turno,
horas estimadas y casilla por pausa para computarla como trabajo, y rotaciones
con inicio/fin obligatorios en la interfaz. Las pausas siempre bloquean citas,
computen o no. Plan técnico aprobado mediante "sí" e implementado:
specs/008-cuadrante-equipo/redesign-week-editor-plan.md. Evidencia actual en
specs/008-cuadrante-equipo/verification-week-editor.md. Biblioteca, selección
semanal y de fechas, horas estimadas y límites de rotaciones listos para repaso.

Migración 20261102150000 probada primero en bukioo_scheduling_20261027_test y
aplicada después a localhost/bukioo con autorización separada mediante "go".
Desarrollo: 37 aplicadas, ninguna pendiente. Función de cálculo y lectura real
verificadas. No volver a ejecutar migraciones a ciegas. Controles completos correctos:
12 pruebas de scripts, 459 backend, 22 helpers frontend y 50 E2E aislados.
La estimación nominal cubre todo el intervalo; el detalle/cálculo real de preview
se limita explícitamente a 42 días. Revisión visual/manual aún pendiente.

Requisitos y plan aprobados. Implementados plantillas diarias/rotaciones
separadas, carga automática de turnos, selección de fechas concretas, guardado
con comprobación automática, alerta al restablecer, reasignación atómica de
citas y nuevo editor semanal con pausas/noches/copia/vigencia. Evidencia y
límites: specs/008-cuadrante-equipo/verification-usability.md.

Migración 20261102120000 probada primero en bukioo_scheduling_20261027_test y
aplicada después a localhost/bukioo con autorización separada mediante "go".
Desarrollo: 36 migraciones aplicadas, ninguna pendiente; esquema y lectura del
horario efectivo verificados. No se ha hecho commit/push de esta entrega.
Pruebas: 45 E2E correctos en base aislada; comprobación completa en evidencia.
La revisión visual/manual del nuevo flujo sigue pendiente; Playwright pausado.

Observaciones que motivaron la entrega (implementadas salvo el diseño global):

- Avatar aprobado por el usuario en el tema disponible. No tiene modo oscuro;
  su comprobación visual sigue sin realizarse, no añadirlo por esta observación.
- Pendiente para la revisión de frontend: mejorar visualmente el cuadrante y
  replantear el selector de semana; todavía no se ha acordado su diseño.
- La creación de plantillas resulta confusa. Se necesitan plantillas de turno
  aplicables a días elegidos, además de los ciclos repetitivos actuales.
- Al elegir una plantilla, cargar sus turnos automáticamente en el borrador,
  sin un botón adicional de copia y sin guardar hasta confirmar.
- Aprobado e implementado: un solo botón "Confirmar y guardar" que
  compruebe primero los cambios y guarde solo si son válidos; conservar la
  revalidación transaccional y mostrar conflictos comprensibles.
- Aclarar "Horario habitual": retirar la excepción de una fecha recupera el
  ciclo asignado o, si no existe, el horario semanal; no elimina ausencias.
- El usuario pide también rediseñar el editor del horario habitual, no solo
  cambiar su nombre. Usar "Restablecer horario previsto" para recuperar un día
  y mostrar antes de confirmar una alerta con fecha, turnos y pausas resultantes
  o "Día libre", origen del horario y ausencias que continúan aplicándose.
- Incorporar al diseño la opción de reasignar una cita afectada a otra persona:
  comprobar servicio asignado, disponibilidad, pausas, ausencias, solapamientos,
  permisos y alcance de empresa. No reasignar automáticamente ni presentar
  una cita como resuelta hasta confirmar el cambio. Definir transacción y
  concurrencia según el plan técnico del flujo conjunto ya implementado.
- Explicar que tener citas no impide cualquier edición: el cambio se rechaza
  si deja citas fuera del horario de atención. Cualquier opción de guardar
  aun con citas afectadas requiere acordar una política antes de implementarla.


Por petición del usuario, revisar primero todo lo implementado en esta sesión.
No empezar otra funcionalidad ni dar por comprobada la interfaz solo por compilar.

1. Avatar en Equipo y cuadrante: borde e iniciales del color elegido, fondo
   suave al 12 %, temas claro/oscuro y aviso de contraste sin cambios automáticos.
2. Cuadrante en escritorio y móvil: navegación semanal, filtro/paginación,
   empleados correctos, turnos, ausencias y totales de presencia/atención.
3. Edición por fecha: turnos partidos y nocturnos, pausas, día libre explícito,
   copia de plantilla, vuelta al horario habitual y cancelación sin guardar.
4. Plantillas de 1 a 12 semanas y asignación de ciclos: fechas, desfase por
   empleado, copia independiente y conservación del tramo anterior/posterior.
5. Vacaciones y permisos por horas/días: crear, editar y retirar; privacidad
   de notas, extremos de fecha y cambio horario en la zona de la empresa.
6. Confirmaciones y errores: citas afectadas, doble envío, versiones, recarga,
   fallo de red y cambio de empresa. No cancelar ni mover citas automáticamente.
7. Revisión de textos naturales, teclado, foco, lectores de pantalla y responsive.
8. Retomar comprobaciones pendientes de catálogo (borrar/desactivar/reactivar),
   acciones de empleados, asignaciones a servicios, editor semanal, Slug y rutas.

Usar cuentas/datos de prueba y registrar evidencia, fallos y bloqueos. Existen
QA Norte 181026, QA Sur 181026 y QA Formulario 181026 editada en la base local.
No se han validado visualmente los formularios nuevos. Playwright continúa en
pausa hasta indicación del usuario. La revisión global con skills sigue pendiente.

## Estado actual comprobado

- Rama de trabajo mvp. Último commit d6950d3, sincronizado con origin/mvp;
  la entrega de usabilidad del 02/11 está sin commit. Comprobar Git en cada sesión.
- SaaS multiempresa: React/TypeScript/Vite/Mantine y NestJS/PostgreSQL/dbmate,
  SQL parametrizado. Contratos reales prevalecen sobre documentación histórica.
- Cuadrante completo implementado el 27/10: excepciones por fecha, plantillas,
  ciclos/desfase individual, pausas, vacaciones/permisos y horario efectivo
  compartido con disponibilidad y validación de citas, versiones y auditoría.
- Dos migraciones nuevas, 20261027190000 y 20261027191000, probadas primero en
  bukioo_scheduling_20261027_test y aplicadas después con autorización explícita
  a localhost/bukioo. Estado al terminar: 35 aplicadas, 0 pendientes. Consulta
  de lectura del horario efectivo correcta. No volver a aplicarlas a ciegas.
- Migraciones aditivas; down automático bloqueado para evitar pérdida de datos.
  Reversión requiere plan específico. Las consultas nuevas requieren ese esquema.
- Evidencia y límites: specs/008-cuadrante-equipo/verification-full.md.
  Contratos/despliegue: backend/docs/SCHEDULING_API.md.
- Los textos de horarios ya no muestran la numeración interna de los días.
  Revisar el resto de textos sin afirmar que se ha hecho una auditoría global.

## Última validación

- 27/10: npm run check correcto: 12 pruebas de scripts, 458 backend, 8 frontend,
  lint y compilaciones. Aviso de bundle frontend: 1605,67 kB (362,08 kB gzip).
- E2E completos correctos: 32 casos, 3 suites, en base aislada autorizada _test.
  Incluyen horario efectivo, permisos, días completos, SQL/HTTP, conflictos y
  concurrencia. Los tests SQL/HTTP no sustituyen las pruebas de interfaz.
- Pendientes: navegador/Playwright, responsive visual, teclado y accesibilidad,
  dispositivos reales, arranque desde cero y revisión global con skills.

## Decisiones y reglas de continuidad

- Usar comillas dobles rectas en textos y mensajes; conservar sintaxis de código.
- README como resumen público y uso real. Valoraciones/aprobaciones en specs,
  seguimiento y memoria; no convertir README en conversación interna.
- Seguir SDD para cambios relevantes: especificación y después plan/tareas,
  con aprobaciones. No migrar otras bases sin autorización correspondiente.
- Commit: DD/MM/AAAA Descripción (A), sin coautorías. Mostrar título, archivos,
  pruebas y pendientes; confirmar cada commit y autorizar push por separado.
- No incluir .playwright-cli ni tmp con capturas/perfiles/ayudantes en commits
  de producto sin revisión específica. No guardar cookies, tokens o credenciales.
- Logos y subida de imágenes aplazados; hoy solo URL. Propuesta documental en
  docs/logo-storage-proposal.md; no hay almacenamiento nuevo implementado.

## Después del repaso y de corregir lo necesario

1. Usuarios y permisos en /app (bloque 4).
2. Activación voluntaria de 2FA en Mi perfil; no confundir con exigirlo a toda
   una organización ni con el reset administrativo (bloque 5 por actualizar).
3. Mano de obra opcional por servicio y categoría: cerrar herencia, coste/precio,
   minutos cobrables, cero/vacío, cálculo e histórico antes de implementar.
4. Accesibilidad/textos: buscador de organizaciones y botón de contraseña en
   español, más los hallazgos de la revisión global.
5. Reenvío de invitaciones sigue pendiente de endpoint; no reutilizar invite
   sobre una cuenta vinculada ni presentar recuperación como reenvío.

Agenda/citas completas, clientes e historial siguen en roadmap; no confundir
cuadrante de trabajo con agenda operativa. Ticketing y soporte temporal auditado
permanecen pendientes, sin acceso permanente por defecto. Reserva pública y área
cliente contienen pantallas provisionales. Roadmap: frontend/FRONTEND_ROADMAP.md.
