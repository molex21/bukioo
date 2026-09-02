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

Puedes copiarlo a `.env` para configurar valores locales. Actualmente el código del frontend no lee `VITE_API_URL`, por lo que esa variable no cambia el comportamiento de la aplicación todavía.
