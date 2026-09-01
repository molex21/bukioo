# Frontend de BUKIOO

Aplicación web de BUKIOO desarrollada con React, TypeScript y Vite.

## Tecnologías y dependencias relevantes

- React 19 y React DOM
- Vite 8 con `@vitejs/plugin-react`
- TypeScript 6
- React Router para el enrutado de la aplicacion
- Lucide React para iconos de interfaz
- ESLint con las configuraciones de TypeScript, React Hooks y React Refresh

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
