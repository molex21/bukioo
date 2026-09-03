# BUKIOO API Reference

Guia operativa para frontend e integraciones. Refleja los controllers y DTOs
actuales. Base URL local: `http://localhost:3000/api/v1`.

Con `NODE_ENV=development` y `SWAGGER_ENABLED=true`, hay documentacion
interactiva en `http://localhost:3000/api/docs` y OpenAPI en
`http://localhost:3000/api/docs-json`. Swagger nunca se publica en produccion.
Esta guia sigue siendo la referencia de flujos, limites y casos limite que
Swagger no expresa.

## Convenciones globales

- Cuerpo: JSON UTF-8, maximo `1mb`. Campos desconocidos devuelven `400`.
- Fechas: ISO-8601 con zona, por ejemplo `2026-09-07T10:00:00.000Z`.
- IDs: UUID. Todos los `:businessId`, `:employeeId`, etc. deben ser UUID.
- Access token: `Authorization: Bearer <accessToken>`. No se usa en login,
  refresh, flujos publicos ni health.
- Todas las rutas llevan el prefijo `/api/v1`. `POST` devuelve normalmente
  `201`; los `DELETE` y `PUT` declarados como `204` no llevan cuerpo.
- El frontend debe mostrar el array `message` de un `400` de validacion y usar
  `error`/`message` para el resto. Forma Nest habitual:
  `{"statusCode":400,"message":["..."],"error":"Bad Request"}`.

| Codigo | Significado y accion frontend |
| --- | --- |
| 200/201/202/204 | Exito. `202` significa que hay un paso adicional (email, password o 2FA). |
| 400 | Corregir campos; no reintentar automaticamente. |
| 401 | Token/cookie/codigo invalido o expirado; refrescar sesion una vez o volver a login. |
| 403 | Usuario autenticado sin permiso o fuera del tenant; no revelar el recurso. |
| 404 | Recurso inexistente, token publico invalido/caducado o entidad no accesible. |
| 409 | Duplicado, estado incompatible o conflicto de agenda; recargar datos. |
| 429 | Esperar `X-RateLimit-Reset` segundos antes de reintentar. |
| 500 | Error inesperado; mostrar error generico y conservar el `X-Request-Id`. |

La API limita a **100 peticiones por 60 segundos por IP**. Las respuestas
incluyen `X-RateLimit-Limit`, `X-RateLimit-Remaining` y
`X-RateLimit-Reset`. El frontend usa `cache: "no-store"` en todas las llamadas
de API y `GET /auth/me` responde `Cache-Control: no-store`; no se debe cachear
el perfil de sesion. No hay cache HTTP de aplicacion, webhooks ni idempotency
keys. Los GET pueden reintentarse de forma segura; no reintentes automaticamente POST/PATCH/
DELETE salvo que primero consultes el estado final.

## Autenticacion, cookies y seguridad

- Access JWT: 15 minutos. El JSON de login contiene `accessToken`,
  `tokenType: "Bearer"` y `expiresIn: 900`.
- Refresh token: 30 dias, solo cookie `refresh_token` HttpOnly; nunca llega en
  el JSON. `POST /auth/refresh` y el equivalente customer lo rotan.
- En navegador, usar `credentials: "include"` solo para login/refresh/logout y
  `Authorization` para la API protegida. En Postman, activar el cookie jar.
- Tras cinco contrasenas incorrectas consecutivas, una cuenta staff o customer
  queda bloqueada 15 minutos. Un login correcto limpia el contador. El error se
  mantiene generico para no enumerar cuentas.
- Los intentos de verificacin de email, activacion y 2FA usan cookies HttpOnly
  de 10 minutos. Un codigo de email y TOTP tiene seis digitos.
- Roles tenant: `OWNER`, `ADMIN`, `MANAGER`, `EMPLOYEE`, `CLIENT`. Las mutaciones
  de configuracion indican `OWNER, ADMIN`; lecturas sin etiqueta permiten al
  usuario con acceso al negocio. Superadmin es independiente: `is_superadmin`
  activo, no un rol de organizacion.

## Flujos que debe implementar el frontend

### Staff

1. `POST /auth/login` con email/password.
2. Si `201`, guardar solo `accessToken` en memoria y usar cookie refresh.
3. Si `202` con `emailVerificationRequired`, mostrar codigo y llamar
   `/auth/activate/verify`; despues establecer password con
   `/auth/activate/password`. Si devuelve tokens, la sesion ya esta completada.
4. Si `202` con `passwordChangeRequired`, el email ya fue verificado: llamar
   directamente a `/auth/activate/password` con la cookie HttpOnly recibida.
5. Si `202` con `twoFactorRequired`, pedir TOTP y llamar `/auth/2fa/verify`, o
   contactar con OWNER/ADMIN si ha perdido el autenticador para restablecer 2FA.
6. Ante `401` en una llamada protegida: ejecutar un solo `/auth/refresh`; si
   falla, borrar estado local y mostrar login.

### Customer por negocio publico

La cuenta customer esta aislada por `organizationSlug`: el mismo email puede
existir en negocios de organizaciones distintas. Registro/login/refresh se
realizan bajo `/public/:organizationSlug/auth`. Una reserva sin login no crea
sesion; la ficha publica se consulta mediante el `accessToken` de la URL de
notificacion, no con JWT.

### Agenda y concurrencia

Una cita puede ser `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED` o
`NO_SHOW`. Los solapes o bloqueos se pueden solicitar como `PENDING` cuando
requieren aprobacion. Dos reservas simultaneas del mismo empleado/hora nunca
dejan dos `CONFIRMED`: una puede devolver `201` y la otra `409`. Actualiza la
agenda despues de cualquier `409`. No modificar ni cancelar citas de dias
anteriores; dentro del dia se aplican las reglas de reprogramacion del recurso.

## Contratos reutilizables

Los ejemplos usan variables Postman (`{{businessId}}`, etc.). Campos omitidos
son opcionales.

| Contrato | JSON de ejemplo |
| --- | --- |
| Login | `{"email":"owner@example.com","password":"password-de-12-caracteres"}` |
| Onboard | `{"email":"owner@example.com","firstName":"Alejandro","lastName":"Hernandez Escudero","organizationName":"Mi Empresa","organizationSlug":"mi-empresa","timezone":"Atlantic/Canary"}` |
| Employee | `{"firstName":"Ana","lastName":"Diaz","email":"ana@example.com","phone":"600000000","color":"#228B22","inviteUser":true}` |
| Customer | `{"firstName":"Lucia","lastName":"Perez","email":"lucia@example.com","phone":"600000001","notes":""}` |
| Service category | `{"name":"Cortes","sortOrder":0}` |
| Service | `{"name":"Corte","categoryId":"{{categoryId}}","durationMinutes":60,"price":"25.00","bufferBeforeMinutes":0,"bufferAfterMinutes":0,"autoConfirmAppointments":true}` |
| Branding | `{"logoUrl":"https://cdn.example.com/logo.png"}`. Enviar `{"logoUrl":null}` elimina el logo. |
| Working hours | `{"items":[{"dayOfWeek":1,"startTime":"09:00","endTime":"18:00"}]}` |
| Calendar block | `{"employeeId":"{{employeeId}}","type":"BREAK","startAt":"2026-09-07T12:00:00.000Z","endAt":"2026-09-07T13:00:00.000Z","reason":"Comida"}` |
| Appointment | `{"customerId":"{{customerId}}","employeeId":"{{employeeId}}","serviceId":"{{serviceId}}","startAt":"2026-09-07T10:00:00.000Z"}` |
| Public appointment | `{"businessId":"{{businessId}}","employeeId":"{{employeeId}}","serviceId":"{{serviceId}}","startAt":"2026-09-07T10:00:00.000Z","firstName":"Lucia","lastName":"Perez","email":"lucia@example.com","phone":"600000001"}` |
| Loyalty adjustment | `{"points":100,"reason":"Compensacion"}` |

Campos habituales: email maximo 320, password 12-128, texto corto 100-255,
notas de cliente 5000, notas de cita/empleado 2000. Slugs: minusculas,
numeros y guiones (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). Colores: `#RRGGBB`.

## Catalogo completo de endpoints

`Auth` significa header Bearer staff; `Customer auth` significa Bearer customer
del slug; `Public` no requiere header. Todas las rutas protegidas pueden dar
`401`, `403` o `429`; las rutas con UUID pueden dar `400` si el formato es malo.

### Sistema y staff auth

| Metodo y ruta | Auth / entrada | Uso, respuestas principales y UI |
| --- | --- | --- |
| GET `/` | Public | Texto de bienvenida, `200`; no usar como health. |
| GET `/health` | Public | Estado de API/DB, `200`; usar para healthcheck. |
| POST `/auth/onboard` | Header `X-Onboarding-Secret`; Onboard `{email,firstName,lastName,organizationName,organizationSlug,timezone?}` | Crea tenant/owner y envia password temporal. `201`, `400`, `401`, `409`. Solo provisioning. |
| POST `/auth/register` | Auth OWNER/ADMIN; `{email,organizationId,businessIds,role?:MANAGER|EMPLOYEE}` | Invita staff, `201`; conflicto email/membership `409`. |
| POST `/auth/login` | Login | `201` tokens/cookie, o `202` con `emailVerificationRequired`, `passwordChangeRequired` o `twoFactorRequired`. `401` invalido/bloqueado. |
| POST `/auth/refresh` | Cookie refresh | `201` nuevo access token y cookie rotada; `401` limpiar sesion. |
| POST `/auth/logout` | Cookie refresh | `204`, elimina cookie/sesion; idempotente de cara al frontend. |
| GET `/auth/me` | Auth; `Cache-Control: no-store` | Perfil, incluidos `firstName`, `lastName`, organizaciones, businesses, rol, 2FA y `isSuperadmin`; `200`. Cargar al iniciar app. |
| POST `/auth/email/verification/request` | `{email}` | Solicita codigo; respuesta generica `202` para no enumerar email. |
| POST `/auth/email/verify` | Cookie de intento; `{token:"123456"}` | Verifica email; `200`, `400/401` codigo/cookie expirado. |
| POST `/auth/activate/verify` | Cookie email; `{token:"123456"}` | Valida email inicial y crea cookie de password; `200`. |
| POST `/auth/activate/password` | Cookie activacion; `{password}` | Cambia password temporal y completa login, `200` tokens/cookie. |
| POST `/auth/password/forgot` | `{email}` | Solicita reset; `202` generico. |
| POST `/auth/password/reset/verify` | `{token:"123456"}` | Comprueba el código de recuperación sin consumirlo, `200`; `400` token. |
| POST `/auth/password/reset` | `{token:"123456",password}` | Restablece y revoca sesiones, `200`; `400` token. |
| POST `/auth/2fa/setup` | Auth | `200` con `otpauthUrl` y secreto para QR; no activar hasta verify. |
| POST `/auth/2fa/setup/verify` | Auth; `{code:"123456"}` | Activa 2FA y devuelve `{twoFactorEnabled:true}`, `200`. |
| POST `/auth/2fa/verify` | Cookie 2FA; `{code:"123456"}` | Completa login, `201` tokens. |

### Customer auth y reserva publica

| Metodo y ruta | Auth / entrada | Uso, respuestas principales y UI |
| --- | --- | --- |
| POST `/public/:organizationSlug/auth/register` | `{email,password}` | Cuenta customer del tenant, `201`; `409` duplicado. |
| POST `/public/:organizationSlug/auth/login` | Login | `201` access token/customer refresh cookie; `401` invalido/bloqueado. |
| POST `/public/:organizationSlug/auth/refresh` | Cookie customer refresh | `201` token rotado; `401` cerrar sesion customer. |
| POST `/public/:organizationSlug/auth/logout` | Cookie customer refresh | `204`. |
| GET `/public/:organizationSlug/auth/me` | Customer auth | `200` perfil customer. |
| GET `/public/:organizationSlug/auth/appointments` | Customer auth; query `from,to,businessId,status` | Citas de esa cuenta/tenant, `200`. |
| GET `/public/:organizationSlug/auth/appointments/:appointmentId` | Customer auth | Detalle propio, `200`, `403/404` si ajena. |
| POST `/public/:organizationSlug/auth/appointments/:appointmentId/cancel` | Customer auth | Cancela su cita, `200/204` segun flujo; `409` si estado/plazo no permite. |
| GET `/public/:organizationSlug/branding` | Public | Identidad de organizacion para pantallas sin sesion: `{organization:{name,slug,logoUrl}}`. `404` si esta suspendida o no existe. |
| GET `/public/:organizationSlug/businesses/:businessSlug/branding` | Public | Identidad de un negocio activo de esa organizacion: `{organization:{name,slug,logoUrl},business:{name,slug,logoUrl}}`. `404` si no existe, esta suspendido o es de otro tenant. |
| GET `/public/:organizationSlug/services?businessId` | Public | Servicios activos e identidad visual: `organization.logoUrl` y `service.business.logoUrl`. |
| GET `/public/:organizationSlug/employees?businessId&serviceId` | Public | Empleados disponibles para servicio. |
| GET `/public/:organizationSlug/availability?businessId&employeeId&serviceId&from&to` | Public | Franjas libres; rango maximo 31 dias. |
| POST `/public/:organizationSlug/appointments` | Public appointment | Reserva invitado, `201` o `409`; puede quedar `PENDING`. |
| GET `/public/appointments/:accessToken` | Public token URL | Detalle compartible de cita; no guardar token en logs. |
| POST `/public/appointments/:accessToken/cancel` | Public token URL | Cancelacion sin login si token vigente. |

### Negocios, personas y configuracion

Los logos se guardan como URL absoluta `http` o `https` de hasta 2048
caracteres; la API no recibe archivos ni Base64. El frontend debe subir el
archivo a su proveedor de almacenamiento y enviar despues su URL. La
organizacion representa la marca comun y cada negocio puede definir su propio
logo.

| Metodo y ruta | Auth / entrada | Uso, respuestas principales y UI |
| --- | --- | --- |
| PATCH `/organizations/:organizationId/branding` | OWNER/ADMIN; `{logoUrl}` | Guarda o elimina (`null`) el logo comun de la organizacion. `200`; `400` URL o body invalido, `403` fuera del tenant, `404` inexistente. |
| POST `/businesses` | OWNER/ADMIN; `{organizationId,name,slug,email?,phone?,timezone?,logoUrl?}` | Crea empresa, `201`, `409` slug. |
| GET `/businesses?organizationId` | Auth | Lista empresas gestionables, `200`. |
| GET/PATCH/DELETE `/businesses/:businessId` | Auth; PATCH Business incluye `logoUrl` | Lee/edita/suspende/elimina. `logoUrl:null` elimina el logo. DELETE `204`, `409` si es ultima o tiene datos. |
| POST/GET `/businesses/:businessId/employees` | OWNER/ADMIN para POST; Employee | Crear/listar. `inviteUser:true` envia activacion. |
| GET/PATCH/DELETE `/businesses/:businessId/employees/:employeeId` | Auth; PATCH Employee | Detalle/edicion/borrado `204`; DELETE solo sin referencias. |
| POST `/businesses/:businessId/employees/:employeeId/invite` | OWNER/ADMIN | Reenvia invitacion. |
| POST `/businesses/:businessId/employees/:employeeId/2fa/reset` | OWNER/ADMIN | Revoca 2FA/sesiones del empleado. |
| POST `/businesses/:businessId/employees/:employeeId/password-reset` | OWNER/ADMIN | Envia el codigo de seis digitos de recuperacion al empleado activo con cuenta asociada. `202` sin cuerpo sensible; `409` si no tiene cuenta activa. |
| POST/GET `/businesses/:businessId/customers` | OWNER/ADMIN para POST; GET acepta `q,sortBy,sortDirection,limit,offset` | Crea clientes o lista paginada `{data,pagination}`. `q` busca nombre, apellido, email y telefono sin mayusculas. `sortBy`: `firstName,lastName,email,phone,createdAt`; `sortDirection`: `asc,desc`; `limit`: `10,25,50,100` (25 por defecto); `offset >= 0`. Orden estable con `id ASC`. |
| GET/PATCH/DELETE `/businesses/:businessId/customers/:customerId` | Auth; PATCH Customer | Detalle, actualizar o anonimizar/eliminar segun referencias. |
| POST/GET `/businesses/:businessId/service-categories` | OWNER/ADMIN para POST; category | Crear/listar categorias. |
| PATCH/DELETE `/businesses/:businessId/service-categories/:categoryId` | OWNER/ADMIN | Editar/eliminar `204`; `409` si tiene servicios. |
| POST/GET `/businesses/:businessId/services` | OWNER/ADMIN para POST; Service | Crear/listar servicios. |
| GET `/businesses/:businessId/services/:serviceId/employees` | Auth | Empleados asignados. |
| PUT `/businesses/:businessId/services/:serviceId/employees` | OWNER/ADMIN; `{employeeIds:[uuid]}` | Reemplaza asignacion, `204`; lista no vacia. |
| PATCH/DELETE `/businesses/:businessId/services/:serviceId` | OWNER/ADMIN; PATCH Service | Editar/suspender/eliminar `204`. |
| GET/PUT `/businesses/:businessId/employees/:employeeId/working-hours` | Auth / OWNER-ADMIN; Working hours | Leer/reemplazar todo calendario, PUT `204`. `dayOfWeek` sigue JS: 0 domingo. |
| POST/GET `/businesses/:businessId/calendar/blocks` | OWNER/ADMIN para POST; block / `from,to?` | Crear/listar bloqueos. |
| GET `/businesses/:businessId/calendar/blocks/employees/:employeeId?from&to` | Auth | Bloqueos del empleado. |
| PATCH/DELETE `/businesses/:businessId/calendar/blocks/:blockId` | OWNER/ADMIN; PATCH block | Editar/eliminar `204`. |
| GET `/businesses/:businessId/availability?employeeId&serviceId&from&to` | Auth | Disponibilidad interna; respeta buffers, turnos, bloques y reservas. |
| GET/PATCH `/businesses/:businessId/notification-settings` | Auth / OWNER-ADMIN | Configuracion de reminders. |
| GET `/businesses/:businessId/notifications?...` | OWNER/ADMIN | Historial: `status,type,channel,appointmentId,customerId,from,to,limit(1-100),offset`. |

### Citas, fidelizacion, informes y auditoria

| Metodo y ruta | Auth / entrada | Uso, respuestas principales y UI |
| --- | --- | --- |
| POST/GET `/businesses/:businessId/appointments` | OWNER/ADMIN para POST; Appointment / filtros `from,to,employeeId,customerId,status` | Crear/listar. En conflicto `409`; solape permitido puede ser `PENDING`. |
| GET `/businesses/:businessId/appointments/occupancy?from&to&employeeId?` | Auth | Devuelve ocupado/bloqueos para UI de agenda. |
| GET/PATCH/DELETE `/businesses/:businessId/appointments/:appointmentId` | Auth; PATCH Appointment / cancel `{reason?}` | Detalle, modificar, cancelar `204`. |
| PATCH `/businesses/:businessId/appointments/:appointmentId/membership-eligibility` | OWNER/ADMIN; `{countsTowardMembership:boolean}` | Decide si cuenta para puntos/membresia. |
| POST `.../:appointmentId/confirm`, `/complete`, `/no-show` | Auth con permisos de agenda | Cambia estado; `409` si la transicion ya no es valida. |
| POST `.../:appointmentId/reschedule-proposals` | Auth; `{startAt,employeeId?,message?}` | Propone cambio que debe aceptar customer si cambia de dia. |
| POST `/appointments/reschedule-proposals/accept` o `/reject` | Public; `{token}` | Respuesta a propuesta por token. |
| POST/GET `/businesses/:businessId/loyalty/levels` | OWNER/ADMIN para POST; `{name,minimumPoints,sortOrder?}` | Crear/listar niveles. |
| PATCH/DELETE `/businesses/:businessId/loyalty/levels/:levelId` | OWNER/ADMIN | Actualizar/eliminar `204`. |
| GET `/businesses/:businessId/loyalty/settings` | Auth | Programa de puntos. |
| PATCH `/businesses/:businessId/loyalty/settings` | OWNER/ADMIN | Activa, reglas, expiracion y niveles. |
| GET `/businesses/:businessId/customers/:customerId/loyalty` | Auth | Saldo, nivel, movimientos y citas relacionadas. |
| POST `.../loyalty/adjust` | OWNER/ADMIN; Loyalty adjustment | Ajuste manual auditado. |
| POST `.../loyalty/redeem` | OWNER/ADMIN; `{points:1..1000000,reason}` | Canje FIFO, `409` saldo insuficiente. |
| GET `/businesses/:businessId/reports/overview?from&to&employeeId?&serviceId?` | OWNER/ADMIN | Totales y facturacion completada. |
| GET `/businesses/:businessId/reports/appointments?...&status?&limit(1-100)&offset` | OWNER/ADMIN | Detalle paginado, orden `startAt DESC,id DESC`. |
| GET `/businesses/:businessId/reports/appointments.csv?...` | OWNER/ADMIN | Descarga CSV sin paginacion. |
| GET `/businesses/:businessId/reports/appointments.xlsx?...` | OWNER/ADMIN | Descarga XLSX sin paginacion. |
| GET `/businesses/:businessId/reports/employees?from&to&serviceId?` | OWNER/ADMIN | Rendimiento por empleado. |
| GET `/businesses/:businessId/audit-logs?...` | OWNER/ADMIN | Filtros `action,entityType,entityId,actorUserId,from,to,limit,offset`. |

### Superadmin

| Metodo y ruta | Entrada | Uso |
| --- | --- | --- |
| GET `/superadmin/dashboard` | Superadmin | Metricas globales. |
| GET `/superadmin/organizations?search&status&planCode&limit&offset` | Superadmin | Lista paginada de tenants. |
| GET `/superadmin/organizations/:organizationId` | Superadmin | Detalle y suscripcion. |
| PATCH `/superadmin/organizations/:organizationId/status` | `{status:"ACTIVE"|"SUSPENDED"}` | Activa/suspende tenant. |
| PATCH `/superadmin/organizations/:organizationId/security` | `{require2faForAdmins:boolean}` | Obliga 2FA a OWNER/ADMIN del tenant. |
| PUT `/superadmin/organizations/:organizationId/subscription` | `{planCode,status:"TRIAL"|"ACTIVE"|"SUSPENDED",trialEndsAt?,expiresAt?}` | Asigna suscripcion manual e historica. |
| GET/POST `/superadmin/plans` | POST Plan | Lista/crea planes. |
| PATCH/DELETE `/superadmin/plans/:planCode` | PATCH Plan | Edita/elimina. DELETE `409` si tiene suscripciones. |

## Procesos asincronos y limites

Con `PGBOSS_ENABLED=true`, pg-boss ejecuta cada hora la expiracion de puntos y
genera avisos de puntos proximos a caducar. Las notificaciones/reminders se
persisten y se pueden consultar; el proveedor de email puede estar desactivado
con `EMAIL_DELIVERY_ENABLED=false`, en cuyo caso no sale correo pero el flujo
no falla. No hay webhook saliente ni endpoint de webhook entrante.

Los listados que exponen paginacion usan `offset` desde 0. Salvo que la ruta
indique otra cosa, `limit` tiene por defecto 50 y maximo 100. El listado de
clientes admite solo `10`, `25`, `50` o `100`, con 25 por defecto. Informes y
disponibilidad exigen `from < to`; disponibilidad limita rango a 31 dias. Las
descargas de informe no se paginan: frontend debe restringir rangos grandes.

El listado de clientes usa un indice parcial por negocio/nombre y `pg_trgm`
para la busqueda parcial sobre nombre, apellidos, email y telefono. Antes de
anadir nuevos indices de ordenacion, medir las consultas reales con `EXPLAIN
ANALYZE`.

## Tecnologias aplicadas

NestJS 11, TypeScript 5, Express, PostgreSQL y SQL directo con `pg`; dbmate
para migraciones; JWT y Argon2id; `otplib` para TOTP cifrado AES-256-GCM;
`nestjs-pino`/Pino para logs JSON con redaccion; Helmet, CORS y throttling;
pg-boss para jobs; Resend para email; ExcelJS para XLSX; Jest/Supertest para
unitarias e integracion. Frontend: React, TypeScript, Vite, Mantine y Lucide
React.
