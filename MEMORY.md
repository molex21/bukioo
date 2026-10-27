# Memoria de BUKIOO

Actualizada: 27/10/2026. Estado real, decisiones y continuidad; sin secretos.

## Primer paso de la próxima sesión: revisar antes de avanzar

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

- Rama de trabajo mvp. Último commit confirmado antes de esta entrega: 7504c6a,
  sincronizado con origin/mvp el 18/10. Comprobar Git en cada sesión.
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
