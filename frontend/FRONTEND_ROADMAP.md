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
- [ ] Crear acceso mediante recovery code.
- [ ] Crear configuracion de 2FA desde el perfil.
- [ ] Mostrar QR, confirmar el codigo y entregar recovery codes una unica vez.

## Bloque 2 — Panel interno y puesta en marcha

### 2.1 Shell del panel

- [ ] Crear barra lateral con navegacion por permisos.
- [ ] Crear cabecera con negocio activo, perfil y logout.
- [ ] Crear selector de organizacion/negocio cuando aplique.
- [ ] Crear migas de pan y contenedor de contenido.
- [ ] Crear avisos globales para exito, error y conflictos de agenda.

### 2.2 Inicio

- [ ] Crear dashboard con resumen diario de citas y bloqueos.
- [ ] Mostrar proximas citas y acciones rapidas.
- [ ] Crear estados vacios que guien la configuracion inicial.

### 2.3 Negocio

- [ ] Crear listado y selector de negocios disponibles.
- [ ] Crear formulario de alta de negocio para OWNER/ADMIN.
- [ ] Crear ficha de negocio para editar datos, zona horaria y estado.
- [ ] Añadir suspension/eliminacion con confirmacion y manejo de `409`.

## Bloque 3 — Catalogo, equipo y calendario laboral

### 3.1 Categorias y servicios

- [ ] Crear listado y formulario de categorias.
- [ ] Crear listado de servicios con filtros de estado y categoria.
- [ ] Crear formulario de servicio: duracion, precio, buffers y confirmacion.
- [ ] Permitir editar, suspender y eliminar servicios.
- [ ] Mostrar explicacion ante conflictos de eliminacion.

### 3.2 Empleados

- [ ] Crear listado de empleados.
- [ ] Crear alta y edicion de empleado, incluyendo color y notas.
- [ ] Permitir invitar y reenviar invitacion.
- [ ] Permitir reset de 2FA solo a usuarios autorizados.
- [ ] Permitir eliminar con confirmacion y manejo de referencias existentes.

### 3.3 Asignaciones y horarios

- [ ] Crear selector de empleados asignados a cada servicio.
- [ ] Validar que un servicio tenga al menos un empleado asignado.
- [ ] Crear editor semanal de horarios, incluidos turnos partidos.
- [ ] Representar claramente la convención domingo (`0`) a sabado (`6`).
- [ ] Guardar el reemplazo completo de horarios del empleado.

### 3.4 Bloqueos

- [ ] Crear listado de bloqueos por rango y empleado.
- [ ] Crear formulario para descanso, vacaciones, reunion y ausencia.
- [ ] Permitir editar y eliminar bloqueos.
- [ ] Refrescar agenda y disponibilidad tras cada cambio.

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

- [ ] Crear ruta publica basada en `organizationSlug`.
- [ ] Permitir seleccionar negocio, servicio y empleado.
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

- [ ] Crear dashboard global de plataforma.
- [ ] Crear listado paginado de organizaciones con busqueda y filtros.
- [ ] Crear ficha de organizacion y suscripcion.
- [ ] Permitir activar/suspender una organizacion.
- [ ] Permitir exigir 2FA a administradores de una organizacion.
- [ ] Permitir actualizar plan, estado y fechas de suscripcion.

### 9.2 Planes

- [ ] Crear listado de planes.
- [ ] Crear formularios de alta y edicion de plan.
- [ ] Permitir eliminar con manejo de suscripciones asociadas.

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
