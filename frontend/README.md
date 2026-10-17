# Frontend de BUKIOO

Aplicación web de BUKIOO desarrollada con React, TypeScript y Vite.

## Tecnologías y dependencias relevantes

- React 19 y React DOM
- Vite 8 con `@vitejs/plugin-react`
- TypeScript 6
- React Router para el enrutado de la aplicacion
- Lucide React para iconos de interfaz
- Lucide Animated y Motion para los iconos animados de navegación
- Mantine para componentes y tema visual de la aplicacion
- Mantine Dates para los selectores de fecha y rangos
- Day.js para el locale en castellano de los controles de fecha
- Mantine Notifications para toasts de exito y error
- ESLint con las configuraciones de TypeScript, React Hooks y React Refresh

El tema de Mantine se define en `src/theme.ts`. Durante la definicion visual,
los componentes se revisan en la ruta interna `/design-system`; no forma parte
de las pantallas de producto.

## Rutas de acceso

- `/platform/access`: acceso interno a la plataforma. Tras iniciar sesión se
  comprueba que la cuenta sea superadmin.
- `/:organizationSlug/staff`: entrada del equipo; sin sesión redirige al login y
  con sesión abre `/app`.
- `/:organizationSlug/staff/login`: acceso del equipo de una organización.
- `/:organizationSlug/login`: acceso de clientes de una organización. La vista
  ya está diferenciada y se conectará al flujo customer en el siguiente bloque.

No existe una ruta genérica `/login`.

El dashboard de `/platform` consulta las métricas reales de
`/superadmin/dashboard`. La sección `/platform/organizations` lista tenants
reales mediante `/superadmin/organizations`, con búsqueda, filtros por estado
y plan, paginación y suscripciones. La ficha de cada organización usa
`/superadmin/organizations/:organizationId` para consultar detalle y permite
actualizar el estado de la organización y su suscripción. También consulta
`/superadmin/plans` para ofrecer y asignar planes. Desde la organización se
accede a sus empresas y, desde cada empresa, a «Equipo y accesos» mediante rutas
anidadas. Esas pantallas consumen los endpoints superadmin anidados de empresas
y empleados, con búsqueda, filtros de estado y paginación. No hay un punto de
menú global para Planes, Empresas o Empleados.

El botón «Nueva organización» crea el entorno, propietario y empresa inicial
mediante `POST /superadmin/organizations` y abre su ficha. «Nueva empresa», dentro
de la lista de empresas de una organización, usa
`POST /superadmin/organizations/:organizationId/businesses`. «Invitar usuario»,
en la ficha de empresa, usa
`POST /superadmin/organizations/:organizationId/businesses/:businessId/employees`
y actualiza la lista y contadores. Los roles de invitación son Empleado
(`EMPLOYEE`) y Responsable (`MANAGER`). Estos formularios usan Bearer staff;
no necesitan la clave privada de onboarding. El alta de organización no admite
logo en su contrato actual; el alta de empresa admite `logoUrl` opcional.
Ambas altas permiten elegir una zona horaria IANA. Los mensajes de error
conservan los valores introducidos y los avisos de éxito duran 15 segundos.

En la ficha de cada empresa de Plataforma se muestran los enlaces copiables y
abribles de **Reserva pública** (`/book/:organizationSlug/:businessSlug`) y
**Acceso del equipo** (`/:organizationSlug/staff/login`). El primero abre la
empresa concreta; el segundo pertenece a la organización para permitir el
acceso del personal con más de una empresa asignada.

### Equipo y accesos (plataforma)

En `/platform/organizations/:organizationId/businesses/:businessId`,
`PlatformTeamAccess` separa dos pestañas:

- **Usuarios y permisos**: todos los miembros de la organización mediante
  `GET /superadmin/organizations/:organizationId/members`. Incluye nombre,
  correo, rol, estado de membresía y de cuenta por separado, empresas accesibles
  y fichas de agenda. Búsqueda con espera de 350 ms, filtros por rol, membresía
  y empresa dentro de «Filtros», y paginación de 10/25/50/100 elementos.
- **Empleados**: mantiene el endpoint de empleados de la empresa, sin
  interpretar un permiso de agenda revocado como revocación de acceso al panel.

En la fila del propietario, el menú permite **Transferir propiedad**. Solo se
ofrecen miembros de la organización con membresía y cuenta activas y rol de
administrador, responsable o empleado. La confirmación explica que el nuevo
miembro pasa a `OWNER` y el propietario actual a `ADMIN`; la API ejecuta la
transferencia y su auditoría en una transacción y rechaza cualquier situación
que no permita garantizar que exista exactamente un propietario.

La acción principal es **Ver**. Las acciones secundarias se agrupan en un botón
de tres puntos: cambiar el rol, añadirlo a la agenda, gestionar las empresas
asignadas y suspender o restablecer el acceso cuando el permiso lo permita.

Para superadmin, ese menú también ofrece **Cambiar correo de acceso**. Envía un
código al correo nuevo y solo lo sustituye cuando se confirma el código; al
terminar, las sesiones de esa persona se cierran y deberá iniciar sesión otra vez.

«Cambiar rol» utiliza el PATCH de miembros y confirma su alcance organizativo.
No permite cambiar al propietario ni gestionar cuentas/membresías inactivas.
Al quitar ADMIN se envía una selección explícita de `businessIds`, incluso `[]`;
al asignar ADMIN no se envían empresas porque el acceso es global.

«Añadir usuario como empleado» selecciona un miembro y una empresa con
acceso y sin ficha previa. Envía únicamente `userId` y `color` al POST de empleados:
conserva perfil, contraseña y rol. Los empleados con permiso de agenda activo o
revocado se consultan sin ofrecer duplicarlos.
«Invitar usuario» sigue creando
cuenta y ficha en la empresa abierta con EMPLOYEE o MANAGER.

Se actualizan miembros, fichas y contador tras las operaciones, y `/auth/me` si
afectan a la sesión actual o hay un 403. Los errores 404/409 recargan sin repetir
la mutación; los errores inciertos de invitación (incluido 503) bloquean otro
envío en el formulario y piden comprobar el listado antes de reintentar.

El listado superadmin de empleados devuelve `userId`: cuando es `null`, muestra
«Sin acceso al panel». Un usuario vinculado no implica que tenga permisos activos;
estos se consultan en «Usuarios y permisos».

«Ver empleado» abre `PlatformEmployeeModal`, con GET y PATCH sobre
`/superadmin/organizations/:organizationId/businesses/:businessId/employees/:employeeId`.
Permite editar nombre, apellidos, correo de contacto, teléfono, color y notas,
y revocar/restablecer el permiso de agenda con confirmación. Estos campos editan
la ficha de agenda, no la cuenta de acceso; el correo de contacto no cambia el
email de login. En sentido inverso, los cambios de nombre, apellidos y teléfono
hechos desde «Mis datos» de la cuenta se sincronizan con las fichas activas.
Los campos opcionales se pueden vaciar con `null`. Se envía `expectedUpdatedAt`
para detectar ediciones concurrentes; un 409 obliga a recargar antes de guardar.
Revocar el permiso de agenda conserva historial y citas existentes, sin
cancelarlas ni revocar accesos. En cambio, **Suspender acceso** conserva el rol,
las empresas asignadas y la ficha de empleado, pero bloquea el acceso a esta
organización; las otras organizaciones no cambian. **Gestionar empresas** solo
modifica las empresas accesibles para responsables y empleados.
Restablecer el permiso conserva el mismo empleado y comprueba la capacidad del plan.

En «Añadir usuario como empleado», la selección del usuario queda fija; para
elegir otro se cierra el formulario y se vuelve a abrir. Los textos de producto
usan «Empresa»; las rutas, identificadores y contratos `businesses` no cambian.
La pantalla de **Equipo** de `/app` lista las fichas activas de la empresa
seleccionada y permite crear o editar nombre, contacto, color y notas. Al crear,
un `OWNER` o `ADMIN` puede decidir si solo crea una ficha de agenda o si además
invita a la persona al panel. La asignación de servicios, horarios, bloqueos y
acciones de seguridad se incorporarán en los siguientes bloques.

Las reglas puras de permisos/vinculación tienen pruebas sin dependencias extra.
Desde la raíz, con Node compatible con borrado de tipos:

```bash
node --experimental-strip-types --test frontend/tests/team-access.test.mjs
```

Estas pruebas se ejecutan aparte de `npm run check`, que mantiene sus scripts actuales.

La sesión staff conserva el access token únicamente en memoria. Al cargar la
aplicación intenta restaurarla con la cookie HttpOnly mediante `/auth/refresh`.
Las llamadas protegidas añaden el header Bearer y, ante un único `401`, renuevan
el token y repiten la petición. Las rutas `/app` y `/platform` requieren sesión;
la segunda también exige una cuenta superadmin.

Desde el menú de cuenta de plataforma se pueden editar el nombre, los apellidos
y el teléfono propio con `PATCH /auth/me`. El correo electrónico se muestra como
dato de consulta y no puede cambiarse desde ese formulario.

El área interna `/app` carga el perfil mediante `/auth/me` y utiliza sus
organizaciones y empresas accesibles para establecer el contexto de trabajo. La
empresa activa se indica como `?business=<uuid>` en la URL y se conserva solo
durante la pestaña actual; si la cuenta solo tiene una empresa, se selecciona
automáticamente. El selector permite cambiar de empresa y deja preparadas estas
rutas:

- `/app` o `/app/dashboard`: resumen;
- `/app/agenda`, `/app/appointments` y `/app/customers`;
- `/app/team` y `/app/settings`, visibles solo para `OWNER` y `ADMIN`.

Agenda, citas y clientes se conectarán a sus datos específicos en los bloques
posteriores.
Al cerrar sesión desde este espacio se vuelve al acceso staff de la organización
desde la que se inició sesión.

`OWNER` y `ADMIN` disponen además de **Configuración → Gestionar empresas**
(`/app/settings/businesses`): lista las empresas de la organización activa y
permite crear, editar, suspender o reactivar una empresa. El alta valida en API
el permiso organizativo, los campos y el slug duplicado; el logo sigue siendo
una URL pública de imagen. `MANAGER` y `EMPLOYEE` no ven esta sección ni pueden
abrir esa ruta.

En **Configuración → Gestionar empresas**, al abrir una empresa existente,
`OWNER` y `ADMIN` ven sin poder editar los enlaces de reserva de esa empresa
(`/book/<organizationSlug>/<businessSlug>`) y de acceso del equipo
(`/<organizationSlug>/staff/login`), con acciones para abrirlos o copiarlos.
El modal de gestión usa ancho ampliado para mostrar esos enlaces sin comprimir
los campos de configuración.

En **Configuración → Gestionar servicios** (`/app/settings/services`), `OWNER`
y `ADMIN` pueden crear y renombrar categorías en un listado independiente,
además de crear servicios para la empresa activa. El formulario cubre categoría,
duración, precio base, buffers y confirmación automática; los servicios se pueden
editar o suspender.

El tipo de precio puede ser **cerrado** o **desde**. El segundo exige un precio
mínimo y se muestra como «Desde X €» en los listados; no representa todavía el
importe final de una cita.

Cada servicio también puede definir hasta 20 **datos configurables** que se
mostrarán en el futuro flujo de reserva: número (con unidad y límites), selector,
texto o sí/no. Un número puede sumar un importe por unidad y un selector puede
definir un suplemento por opción. De forma independiente, ambos pueden sumar
tiempo por unidad u opción. Por ejemplo, ruedas, litros, tipo de pelo o
número de personas. Esta configuración ya se guarda por empresa y se expone en el
catálogo público; el paso que recoge respuestas, calcula el total final y conserva
su instantánea en la cita se implementará con la pantalla de reservas.

La asignación de empleados y la eliminación con sus conflictos se incorporarán en
el bloque de Equipo.

## Instalación

Desde este directorio:

```bash
npm install
```

O instala todos los paquetes del monorepositorio desde la raíz:

```bash
npm run setup
```

## Ejecución

```bash
npm run dev
```

Vite sirve la aplicación en `http://localhost:5173` por defecto.

## Compilación, vista previa y lint

```bash
npm run build
npm run preview
npm run lint
```

`build` ejecuta primero la comprobación de TypeScript (`tsc -b`) y después genera la compilación de Vite en `dist/`.

El script `lint:check` también está definido, pero usa un patrón pensado para fuentes TypeScript sin incluir archivos `.tsx`; para comprobar el frontend completo utiliza `npm run lint`.

## Perfil y administración de plataforma

Desde **Mi perfil**, un usuario puede cambiar su correo de acceso en dos pasos:
solicita el envío del código al correo nuevo y lo confirma. Al completarlo se
cierra la sesión y se debe acceder con la dirección nueva.

La plataforma incluye detalle y edición de empresas, fechas e historial paginado
de suscripciones, y la ruta `/platform/audit` para consultar operaciones
administrativas y eventos de seguridad. El historial se muestra de más reciente
a más antiguo, en páginas de cinco registros. En «Gestionar empresas», los diálogos
de permisos se mantienen abiertos al cerrarse el menú de acciones.

## Variables de entorno

El archivo [`.env.example`](.env.example) incluye:

| Variable | Valor de ejemplo |
| --- | --- |
| `VITE_API_URL` | `http://localhost:3000` |

Puedes copiarlo a `.env` para configurar valores locales. El cliente HTTP usa `VITE_API_URL` como origen de la API y añade `/api/v1` si no está incluido. El acceso staff usa cookies HttpOnly para refresh y conserva el access token solo en memoria.
