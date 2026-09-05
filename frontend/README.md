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
accede a sus negocios y, desde cada negocio, a sus empleados mediante rutas
anidadas. Esas pantallas consumen los endpoints superadmin anidados de negocios
y empleados, con búsqueda, filtros de estado y paginación. No hay un punto de
menú global para Planes, Negocios o Empleados.

La sesión staff conserva el access token únicamente en memoria. Al cargar la
aplicación intenta restaurarla con la cookie HttpOnly mediante `/auth/refresh`.
Las llamadas protegidas añaden el header Bearer y, ante un único `401`, renuevan
el token y repiten la petición. Las rutas `/app` y `/platform` requieren sesión;
la segunda también exige una cuenta superadmin.

Desde el menú de cuenta de plataforma se pueden editar el nombre, los apellidos
y el teléfono propio con `PATCH /auth/me`. El correo electrónico se muestra como
dato de consulta y no puede cambiarse desde ese formulario.

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

## Variables de entorno

El archivo [`.env.example`](.env.example) incluye:

| Variable | Valor de ejemplo |
| --- | --- |
| `VITE_API_URL` | `http://localhost:3000` |

Puedes copiarlo a `.env` para configurar valores locales. El cliente HTTP usa `VITE_API_URL` como origen de la API y añade `/api/v1` si no está incluido. El acceso staff usa cookies HttpOnly para refresh y conserva el access token solo en memoria.
