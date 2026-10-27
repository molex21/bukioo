# Roadmap del frontend de BUKIOO

Guia de implementacion del frontend. Se actualiza durante el desarrollo:
marcar con `[x]` cada accion terminada y mantener este documento alineado con
el estado real del repositorio y de la API.

## Principios de implementacion

- La API se consume desde `VITE_API_URL`, cuya base local es
  `http://localhost:3000/api/v1`.
- El access token solo vive en memoria. Los refresh tokens son cookies HttpOnly.
- Separar siempre las sesiones de staff y customer.
- Ante un `401` protegido, intentar un unico refresh antes de volver al login.
- Mostrar los errores de validacion (`400`), conflictos (`409`) y limite de
  peticiones (`429`) de forma util para la persona usuaria.
- No guardar ni registrar tokens publicos de citas o reprogramaciones.

El estado de trabajo y la revisión previa a la siguiente funcionalidad están
en [`MEMORY.md`](../MEMORY.md). Las comprobaciones manuales de escritorio,
móvil y entorno limpio están en [`docs/frontend-verification.md`](../docs/frontend-verification.md).

## Bloque 0 — Base tecnica y sistema visual

### 0.1 Arquitectura

- [ ] Definir estructura de carpetas por dominios y componentes compartidos.
- [x] Instalar y configurar el enrutado del frontend.
- [x] Crear rutas publicas, privadas, customer y superadmin.
- [ ] Crear layouts independientes para panel interno, reserva publica, area
      customer y superadmin.
- [ ] Crear paginas de no encontrado, sin permisos y error de aplicacion.

### 0.2 Cliente API y contratos

- [ ] Leer `VITE_API_URL` desde configuracion del frontend.
- [ ] Crear un cliente HTTP centralizado.
- [ ] Adjuntar el Bearer token a llamadas staff y customer protegidas.
- [ ] Usar cookies solo en login, refresh y logout.
- [ ] Implementar refresh unico y reintento controlado ante `401`.
- [ ] Centralizar el parseo de errores HTTP y el request id.
- [ ] Definir tipos TypeScript y servicios API por dominio.

### 0.3 Sesion, contexto y permisos

- [ ] Cargar la sesion staff con `/auth/me` al iniciar el panel.
- [ ] Mantener el negocio y la organizacion activos.
- [ ] Proteger rutas y acciones por rol.
- [ ] Separar estado y refresh de customer auth.
- [ ] Implementar cierre de sesion y limpieza de estado local.

### 0.4 Sistema de diseno

- [x] Definir colores, tipografia, iconografia, espaciados y sombras.
- [x] Definir escala reutilizable de radios, bordes, elevacion, tamaños de
      control, estados y espaciado.
- [x] Configurar Mantine y sus componentes base: boton, campo, select,
      textarea y checkbox.
- [x] Crear modal, menu, tabs, badge y tooltip.
- [x] Crear badge reutilizable.
- [x] Crear alertas reutilizables.
- [x] Crear tabla, paginacion, skeleton, empty state y toast.
- [x] Crear DataTable visual con busqueda, filtros, orden y estado vacio.
- [ ] Asegurar foco visible, teclado, labels y mensajes de error accesibles.
- [ ] Definir comportamiento responsive para movil, tablet y escritorio.
- [x] Crear laboratorio interno `/design-system` para validar componentes.

## Bloque 1 — Acceso staff

### 1.1 Autenticacion

- [ ] Crear pantalla de login.
- [ ] Gestionar login correcto y persistencia de la cookie refresh.
- [ ] Crear pantalla de solicitud de recuperacion de contrasena.
- [ ] Crear pantalla de restablecimiento con codigo y nueva contrasena.
- [ ] Mostrar estados de cuenta bloqueada, codigo invalido y sesion expirada.

### 1.2 Activacion e email

- [ ] Crear pantalla para validar el codigo de activacion.
- [ ] Crear pantalla para establecer la contrasena definitiva.
- [ ] Completar automaticamente la sesion al finalizar la activacion.
- [ ] Crear pantalla de verificacion de email cuando corresponda.

### 1.3 Segundo factor

- [ ] Crear desafio TOTP posterior al login.
- [ ] Crear configuracion de 2FA desde el perfil.
- [ ] Mostrar QR, confirmar el codigo y reflejar la activacion de 2FA.
- [ ] Indicar que quien pierda el autenticador debe contactar con un administrador.

## Bloque 2 — Panel interno y puesta en marcha

### 2.1 Shell del panel

- [x] Crear barra lateral con navegación por permisos.
- [x] Crear cabecera con empresa activa, perfil y cierre de sesión.
- [x] Crear selector de organización/empresa cuando aplique y conservar el contexto durante la sesión.
- [ ] Crear migas de pan y contenedor de contenido.
- [ ] Crear avisos globales para exito, error y conflictos de agenda.

### 2.2 Inicio

- [ ] Crear dashboard con resumen diario de citas y bloqueos.
- [ ] Mostrar proximas citas y acciones rapidas.
- [ ] Crear estados vacios que guien la configuracion inicial.

### 2.3 Negocio

- [x] Crear listado y selector de empresas disponibles.
- [x] Crear formulario de alta de empresa para OWNER/ADMIN.
- [x] Crear ficha de empresa para editar datos, zona horaria, logo y estado.
- [x] Añadir suspensión/reactivación desde la ficha de empresa.
- [ ] Añadir eliminación con confirmación y manejo de `409`.
- [ ] Sustituir la URL manual del logo por subida de archivo a almacenamiento de objetos, con previsualización, límites de tipo/tamaño y limpieza del archivo anterior.
      Propuesta pendiente de aprobación: `docs/logo-storage-proposal.md`.
- [ ] Validar manualmente el flujo multiempresa y multiorganización: cambio de contexto, persistencia por pestaña, aislamiento de listados y permisos por organización.

## Bloque 3 — Catalogo, equipo y calendario laboral

### 3.1 Categorias y servicios

- [x] Crear listado y formulario de categorías.
- [ ] Añadir filtros de estado y categoría al listado de servicios.
- [x] Crear formulario de servicio: duración, precio, buffers y confirmación.
- [ ] Definir e implementar precio por hora de mano de obra opcional, solicitado
      el 18/10/2026. Acordar si se configura por empresa, servicio o empleado;
      si es coste interno o precio al cliente; y su relación con precio fijo,
      «desde», duración y suplementos. Definir vacío frente a cero, redondeo y
      conservación histórica en citas. Requiere especificación y revisión de
      contratos backend antes de implementar; no se considera disponible.
- [x] Permitir editar y suspender servicios.
- [x] Configurar datos adicionales por servicio: número, lista, texto o sí/no; suplementos de precio y tiempo por unidad u opción.
- [ ] **Pendiente de pruebas manuales:** crear, editar y conservar datos adicionales, opciones, suplementos de precio y tiempo, y sus interruptores en varias empresas. Verificar después su cálculo, edición por empleado e instantánea al implementar las citas y la reserva pública.
- [x] Añadir eliminación de servicios y categorías con confirmación, permisos
      OWNER/ADMIN y manejo de conflictos 409. Backend ya dispone de DELETE;
      integrado en el cliente API y la interfaz. Servicios con empleados
      asignados o citas y categorías con servicios no se pueden borrar según
      la regla actual. Revisar concurrencia e histórico antes de implementar.
      Impacto: `docs/catalog-deletion-impact.md`.
- [ ] Verificar manualmente eliminación, cancelación, conflictos 409,
      desactivación/reactivación y responsive/teclado; concurrencia con nuevas
      referencias pendiente. No se ha ejecutado Playwright para esta entrega.

### 3.2 Empleados

- [x] Crear listado de empleados.
- [x] Crear alta y edicion de empleado, incluyendo color y notas.
- [x] Permitir elegir entre crear solo la ficha de agenda o invitar al empleado al panel.
- [ ] Permitir invitar y reenviar invitacion.
- [x] Conectar invitación de ficha existente sin cuenta y con email; confirmación
      y gestión de resultado incierto. Reenvío sigue pendiente de contrato backend.
- [x] Permitir reset de 2FA solo a usuarios autorizados.
- [x] Permitir solicitar recuperación de contraseña solo a usuarios autorizados.
- [x] Archivar ficha con confirmación e historial preservado según DELETE actual;
      no elimina la cuenta ni revoca sus permisos.
- [ ] Verificar manualmente acciones de empleados, correos de prueba, permisos,
      errores y archivo. Revisar cómo se ve el color del empleado en la tabla.

### 3.3 Asignaciones y horarios

- [x] Mostrar cuadrante de consulta semanal en Equipo con turnos y bloqueos,
      filtro de empleado, navegación y lista por día en móvil.
- [x] Implementar edición de días, plantillas y rotaciones desde cuadrante;
      requiere migraciones de planificación antes de usarlo en desarrollo.
- [x] Valorar y aprobar nuevo cuadrante con plantillas, rotaciones, pausas,
      vacaciones y permisos; sustituirá progresivamente al editor semanal.
      Requisitos y plan propuestos en specs/008-cuadrante-equipo/.
- [x] Avatar compartido con borde/iniciales del color y fondo suave; cálculo de
      contraste y corrección voluntaria. Verificación visual de temas pendiente.
- [x] Crear selector de empleados activos asignados a cada servicio existente.
- [x] Avisar cuando un servicio queda sin empleados: el backend admite guardar
      configuración incompleta. Para obtener franjas reservables necesita
      empleados asignados y horarios; no se impone un mínimo nuevo en la API.
- [ ] Verificar manualmente asignación, sustitución, retirada, recarga, permisos,
      aislamiento y errores de red en escritorio, móvil y teclado.
- [x] Crear editor semanal de horarios, incluidos turnos partidos.
- [x] Representar claramente la convención domingo (0) a sábado (6).
- [x] Guardar el reemplazo completo de horarios del empleado, con confirmación
      adicional al dejar la semana vacía y bloqueo ante cargas fallidas.
- [ ] Verificar editor en navegador: responsive/teclado, recarga, permisos,
      turnos partidos y errores. No se ha reactivado Playwright.

### 3.4 Bloqueos

- [x] Mostrar bloqueos por rango y empleado en cuadrante.
- [x] Formulario de pausas, vacaciones, permisos, reunión y otras ausencias.
- [x] Editar y retirar ausencias futuras del empleado con comprobación de citas.
- [x] Actualizar el cuadrante tras cambios y compartir horario efectivo con
      disponibilidad/validación de citas. Agenda operativa completa sigue pendiente.
- [ ] Aplicar migraciones en desarrollo con autorización y verificar flujos
      visuales, responsive, teclado y permisos desde navegador.

## Bloque 4 — Agenda y citas

### 4.1 Agenda operativa

- [ ] Crear vistas diaria y semanal.
- [ ] Mostrar citas y bloqueos mediante occupancy.
- [ ] Añadir filtros de empleado, estado y rango de fechas.
- [ ] Definir leyenda visual de estados de cita.
- [ ] Abrir el detalle de cita desde cada evento de agenda.

### 4.2 Crear cita interna

- [ ] Crear flujo de seleccion de cliente, servicio, empleado y hora.
- [ ] Consultar disponibilidad interna antes de guardar.
- [ ] Mostrar si la nueva cita queda pendiente o confirmada.
- [ ] Gestionar `409` recargando la agenda y proponiendo otra franja.

### 4.3 Detalle y ciclo de vida

- [ ] Crear ficha de cita: cliente, servicio, empleado, precio, notas y estado.
- [ ] Permitir confirmar una cita pendiente.
- [ ] Permitir editar segun las reglas temporales de la API.
- [ ] Permitir cancelar con motivo y confirmacion.
- [ ] Permitir completar y marcar como no asistio.
- [ ] Mostrar conflictos que requieren aprobacion.
- [ ] Permitir configurar si una cita cuenta para fidelizacion.

### 4.4 Reprogramacion

- [ ] Permitir reubicacion directa dentro del mismo dia cuando sea valida.
- [ ] Crear propuesta para cambiar de dia u empleado.
- [ ] Mostrar el estado de la propuesta enviada.
- [ ] Refrescar la cita cuando el cliente acepte o rechace.

## Bloque 5 — Clientes y fidelizacion

### 5.1 Clientes

- [ ] Crear listado de clientes con busqueda, filtros y paginacion.
- [ ] Crear alta de cliente.
- [ ] Crear ficha de cliente y edicion de datos/notas.
- [ ] Mostrar historial de citas del cliente cuando este disponible.
- [ ] Añadir anonimización/eliminacion con explicacion de conservacion historica.

### 5.2 Fidelizacion del cliente

- [ ] Mostrar saldo, nivel e historial de movimientos en la ficha.
- [ ] Permitir ajuste manual de puntos con motivo obligatorio.
- [ ] Permitir canje con validacion de saldo.
- [ ] Gestionar el conflicto por saldo insuficiente.

### 5.3 Configuracion de fidelizacion

- [ ] Crear pantalla de configuracion del programa.
- [ ] Configurar activacion, reglas de obtencion, caducidad y limites.
- [ ] Gestionar niveles: crear, editar, ordenar y eliminar.

## Bloque 6 — Notificaciones, auditoria e informes

### 6.1 Notificaciones

- [ ] Crear pantalla de configuracion de recordatorios.
- [ ] Crear historial filtrable de notificaciones con paginacion.
- [ ] Mostrar estado, canal, tipo, cita, cliente y fechas.

### 6.2 Auditoria

- [ ] Crear listado de auditoria para OWNER/ADMIN.
- [ ] Añadir filtros por accion, entidad, actor y rango de fechas.
- [ ] Añadir paginacion y enlaces a entidades existentes cuando sea posible.

### 6.3 Informes

- [ ] Crear filtros globales de fechas, empleado y servicio.
- [ ] Crear resumen de citas y facturacion.
- [ ] Crear informe de rendimiento por empleado.
- [ ] Crear tabla paginada de citas.
- [ ] Implementar descargas CSV y XLSX.
- [ ] Advertir sobre rangos de exportacion demasiado grandes.

## Bloque 7 — Reserva publica

### 7.1 Descubrimiento y disponibilidad

- [ ] Resolver la ruta publica directa `/book/:organizationSlug/:businessSlug`, validar que ambos slugs pertenecen a una empresa activa y preseleccionarla.
- [ ] Mantener `/book/:organizationSlug` como entrada general para elegir negocio, servicio y empleado.
- [ ] Crear selector de fecha y franjas disponibles.
- [ ] Mantener un resumen visible de la reserva seleccionada.

### 7.2 Confirmacion de reserva

- [ ] Crear formulario invitado: nombre, apellidos, email, telefono y notas.
- [ ] Enviar reserva publica.
- [ ] Mostrar resultado confirmado o pendiente de aprobacion.
- [ ] Gestionar `409` llevando de vuelta a la seleccion de franja.

### 7.3 Enlaces publicos

- [ ] Crear detalle de cita mediante access token publico.
- [ ] Crear cancelacion desde enlace publico.
- [ ] Crear estados de token invalido, caducado o cita no cancelable.

### 7.4 Reprogramacion publica

- [ ] Crear ruta `/appointments/reschedule?token=...`.
- [ ] Mostrar propuesta, horario anterior y nuevo horario.
- [ ] Permitir aceptar o rechazar la propuesta.
- [ ] Gestionar conflictos de disponibilidad al aceptar.

## Bloque 8 — Area customer

### 8.1 Sesion customer

- [ ] Crear registro e inicio de sesion por `organizationSlug`.
- [ ] Implementar refresh y logout con su cookie especifica.
- [ ] Recuperar la sesion customer al entrar en el area privada.

### 8.2 Mis citas

- [ ] Crear listado de citas propias con filtros.
- [ ] Crear detalle de una cita propia.
- [ ] Permitir cancelar segun las reglas de negocio.
- [ ] Enlazar a una nueva reserva publica.

## Bloque 9 — Superadmin

### 9.1 Dashboard y organizaciones

- [x] Añadir creación de organización con propietario y negocio inicial desde superadmin.
- [x] Añadir creación de negocio dentro de una organización, con zona horaria y logo opcional.
- [x] Añadir invitación de empleado dentro de un negocio, con rol Empleado o Responsable.
- [x] Crear dashboard global de plataforma y listado de organizaciones con búsqueda, filtros y paginación.
- [x] Crear ficha de organización con datos, contadores, estado y suscripción.
- [x] Permitir activar/suspender una organización.
- [x] Permitir cambiar manualmente el plan y estado de suscripción.
- [x] Transferir la propiedad a un miembro activo; el propietario anterior pasa a ADMIN y el backend garantiza una única propiedad.
- [ ] Permitir exigir 2FA a administradores desde la ficha de la organización.

### 9.2 Planes

- [ ] Crear sección de planes con listado, búsqueda y estado.
- [ ] Crear formularios de alta y edición con límites (empleados, empresas, citas), funciones y días de prueba.
- [ ] Permitir activar/desactivar o eliminar planes, mostrando conflictos por suscripciones asociadas.

### 9.3 Equipo y accesos dentro del negocio

- [x] Separar «Usuarios y permisos» de la organización y «Empleados» del negocio en plataforma.
- [x] Conectar miembros, búsqueda, filtros por rol/membresía/negocio y paginación.
- [x] Ofrecer «Invitar usuario» y «Añadir usuario como empleado» por userId como acciones distintas.
- [x] Cambiar rol con confirmación organizativa y selección de negocios al quitar ADMIN.
- [x] Mostrar empleados existentes sin duplicarlos, incluso con el permiso de agenda revocado.
- [x] Gestionar recargas y bloquear reenvíos de invitaciones con resultado incierto.
- [x] Añadir pruebas de las reglas de permisos y vinculación.
- [x] Mostrar «Sin acceso al panel» con el userId nulo confirmado por el listado de empleados.
- [x] Editar datos, contacto, color y notas del empleado desde plataforma.
- [x] Revocar/restablecer permiso de agenda con confirmación, historial preservado, auditoría y control de concurrencia/capacidad.
- [x] Unificar textos de producto con «Empresa» y fijar el usuario seleccionado al añadirlo como empleado.
- [x] Añadir transferencia de propiedad desde el usuario OWNER, con selección de miembro apto, confirmación explícita y recarga tras la operación.
- [ ] Conectar la vista equivalente de `/app` con los endpoints de organización y sus permisos.
- [ ] Validar visualmente estos flujos con datos reales, en escritorio y móvil.

### 9.4 Gestión completa de suscripciones

- [x] Asignar manualmente plan y estado desde la ficha de la organización.
- [x] Editar fecha de fin de prueba y vencimiento desde la ficha de la organización.
- [ ] Mostrar uso actual frente a límites del plan y avisar antes de excederlos.
- [x] Consultar el historial paginado de suscripciones y cambios, ordenado del más reciente al más antiguo.
- [ ] Aclarar visualmente que la gestión es manual y no procesa cobros.

### 9.5 Edición de empresas desde plataforma

- [x] Listar empresas y consultar sus datos básicos desde una organización.
- [x] Añadir detalle editable de nombre, contacto, zona horaria y logo mediante URL pública.
- [x] Gestionar estado activo/suspendido y mostrar impacto antes de guardar.
- [x] Añadir endpoints superadmin para lectura y edición de empresas, con sus contratos documentados.

### 9.6 Auditoría, accesos y seguridad

- [x] Gestionar roles, empresas asignadas y suspensión/restablecimiento de acceso de miembros.
- [x] Registrar la transferencia de propiedad y otras mutaciones de plataforma en auditoría.
- [x] Permitir a superadmin cambiar el correo de acceso de un miembro tras confirmar un código enviado al correo nuevo.
- [ ] Añadir ajuste de seguridad para exigir 2FA a OWNER/ADMIN (endpoint existente, falta UI).
- [x] Crear visor global de auditoría de plataforma, con filtros por organización, actor, acción y fecha, paginación y detalle de cambios.
- [ ] Añadir vista de sesiones y controles de revocación/reinicio de acceso; verificar o definir endpoints superadmin antes de integrarla.

## Orden de entrega recomendado

1. Bloque 0: base tecnica y sistema visual.
2. Bloque 1 y 2: sesion staff, shell y configuracion minima.
3. Bloque 3: catalogo, equipo y calendario laboral.
4. Bloque 4: agenda y citas.
5. Bloque 5: clientes y fidelizacion.
6. Bloque 7: reserva publica.
7. Bloque 8: area customer.
8. Bloque 6: notificaciones, auditoria e informes.
9. Bloque 9: superadmin.

La primera version operativa se alcanza al completar los bloques 0 a 4: un
negocio puede configurar equipo y servicios, definir horarios, crear citas y
gestionar la agenda diaria.

## Bloque 10 — Sistema interno de ticketing

### 10.1 Solicitudes y seguimiento

- [ ] Crear un área interna para que las organizaciones abran solicitudes a soporte.
- [ ] Permitir clasificar tickets por categoría, prioridad, estado, organización y persona responsable.
- [ ] Añadir conversación, adjuntos y cronología de cambios por ticket.
- [ ] Mostrar al solicitante el estado y las respuestas de sus tickets.

### 10.2 Operación de soporte

- [ ] Crear una bandeja para superadmin con búsqueda, filtros, asignación y cambios masivos de estado.
- [ ] Registrar en auditoría las asignaciones, cambios de prioridad/estado y respuestas del equipo interno.
- [ ] Añadir avisos de nuevos mensajes, vencimientos y SLA cuando se definan las reglas de soporte.
- [ ] Añadir sesiones temporales de soporte para superadmin, acotadas a organización o empresa, con motivo obligatorio, caducidad, banner visible, acceso de solo lectura por defecto y auditoría de apertura, acciones y cierre. No otorgar acceso permanente ni reutilizar membresías normales de clientes.
