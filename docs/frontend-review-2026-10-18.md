# Revisión frontend: 18/10/2026

Revisión parcial con Playwright CLI 0.1.22 y Microsoft Edge local. Base local
autorizada por el usuario como entorno de pruebas. En la primera pasada no se
modificaron registros; la segunda crea y edita exclusivamente datos QA por
petición del usuario. No se han ejecutado migraciones.

## Comprobaciones realizadas

- `npm run check`: correcto; 12 pruebas de scripts, 449 pruebas del backend,
  lint y compilaciones de ambos paquetes.
- Navegador con anchuras de 1440 y 390 px y altura de 900 px. Es comprobación
  de viewport; no representa una prueba de dispositivo móvil real ni de tacto.
- `/platform/access`: presenta acceso a plataforma.
- `/app/team` sin sesión ni contexto de organización: redirige a `/`.
- `/platform` sin sesión: redirige a `/platform/access`.
- `/no-existe`: muestra la página 404.
- `/book/prueba`: muestra la reserva provisional.
- `/prueba/staff`: redirige a `/prueba/staff/login`.
- Sin desbordamiento horizontal del documento en esas rutas y anchuras.

## Hallazgos y límites

- El botón de visibilidad de contraseña tiene nombre accesible en inglés:
  `Toggle password visibility`, dentro de una pantalla en español.
- Build: JavaScript principal de 1543,02 kB (341,59 kB gzip); Vite avisa de
  chunks superiores a 500 kB. Falta medir el impacto real en carga y navegación.
- Se observa `401` en refresh sin sesión. La organización ficticia `prueba`
  produce `404` de branding; no demuestra un fallo con una organización válida.
- No se ha completado una auditoría de teclado ni contraste. La ausencia de
  desbordamiento no valida toda la interfaz.
- Pendientes: permisos por rol, aislamiento y cambio multiempresa, persistencia,
  errores de negocio, E2E backend, arranque desde cero y móvil real.
  No se han usado mocks para declarar válidos esos flujos.

## Pasada autenticada

El usuario inicia sesión directamente; la cuenta tiene acceso a plataforma
y a una empresa como propietario. No se guardan credenciales ni estado de sesión.

- Dashboard, organizaciones y auditoría de plataforma navegables a 1440 y
  390 px, sin desbordamiento del documento. Menú móvil operativo.
- Buscador de organizaciones sin `label`, `aria-label` ni `aria-labelledby`;
  solo placeholder «Escribe aquí». Añadir nombre accesible descriptivo.
- Equipo abre sin alertas; formulario de alta abre y se cierra sin guardar.
  Vista móvil sin desbordamiento observado.
- Configuración permite abrir catálogo sin alertas. La empresa revisada no
  tiene categorías ni servicios: solo se valida su estado vacío y formulario.
- Capturas del catálogo inspeccionadas en `tmp/frontend-review/` (ignoradas
  por Git), con cabecera enmascarada. Sin texto cortado ni solapamientos
  observados en esas capturas; los botones se distribuyen en filas en móvil.
- Formulario de servicio móvil sin desbordamiento del documento; campos
  visibles con etiquetas. Escape cierra y devuelve foco al botón de apertura
  una vez terminada la animación.
- Abrir `/app/team` inicialmente sin empresa en la URL llevó al resumen con
  empresa seleccionada; el botón Equipo sí abrió la ruta con `business`.
  Investigar la conservación de la ruta solicitada al inicializar contexto.

## Herramientas y continuación

CLI global instalada con aprobación; se usa Edge existente, sin añadir
dependencias al proyecto. Frontend iniciado en localhost:5173; backend ya
disponible en localhost:3000. Un intento adicional de arranque encontró
`EADDRINUSE`; no se detuvo el backend existente.

La sesión de navegador `bukioo-review` queda abierta en el catálogo. Los snapshots
locales de `.playwright-cli/` no se han preparado para commit; revisar su contenido
antes de compartirlos. No guardar credenciales, cookies ni tokens en el informe.

## Datos QA y segunda pasada

Preparados en la base local existente, dentro de la organización BUKIOO; no son
bases, contenedores ni organizaciones independientes. No se han enviado invitaciones.

| Empresa | ID | Zona horaria |
| --- | --- | --- |
| QA Norte 181026 | `0be84361-ce0e-4917-9950-05c6f703a4ad` | Atlantic/Canary |
| QA Sur 181026 | `6800b8da-0a95-42b2-8d7b-9175fb3972a1` | Europe/Madrid |

Cada empresa contiene una categoría `QA Norte` o `QA Sur`, un servicio `FIXED`
de 25 € y otro `FROM` de 15 €, de 30 minutos y buffers de 5/10 minutos, y un
empleado `QA Norte Pruebas` o `QA Sur Pruebas`, sin usuario ni invitación.
El servicio FROM contiene un número obligatorio de 1 a 5 unidades con suplemento.
Sur conserva 3 €/5 minutos por unidad; Norte se editó a 4 €/6 minutos para probar
persistencia, junto con descripción del servicio y notas del empleado.

### Resultados

- **Bloqueo de alta de empresas por UI:** al pulsar Nueva empresa y rellenar
  Nombre mediante Playwright, React lanza `Cannot read properties of null
  (reading 'value')` y deja la pantalla vacía. El stack señala un actualizador
  de estado en `WorkspaceBusinessesPage`; revisar el uso diferido de
  `event.currentTarget.value`. No se había enviado el alta.
- Se recuperó con recarga y se prepararon los datos mediante los clientes API
  de la aplicación, en la sesión autenticada. Esto valida la API, no el alta
  ni la edición de formularios por UI.
- Listados de Equipo y catálogo de ambas empresas: datos propios visibles,
  datos de la otra empresa ausentes, sin alertas ni desbordamiento horizontal
  del documento a 1440 y 390 px. Precio «Desde» visible en ambos catálogos.
- Selector de empresa: cambio de Sur a Norte mantiene la pantalla de catálogo,
  cambia el parámetro business y presenta solo los servicios de Norte.
- API: editar servicio de Norte bajo ruta de Sur devuelve 404; editar empleado
  de Norte bajo ruta de Sur devuelve 404. No demuestra permisos de otro rol
  ni aislamiento entre organizaciones, ya que la cuenta es OWNER de ambas.
- Nueva lectura API confirma edición de descripción, suplemento y notas en
  Norte; Sur conserva su suplemento original.
- **Navegación directa reproducida:** cargar Equipo o catálogo con business
  válido lleva al resumen. Navegar desde los botones sí abre la sección correcta.
  Las primeras mediciones tras acceso directo se descartan como validación de
  Equipo/catálogo, y se repitieron navegando desde el menú.

No se han corregido bugs ni modificado código. Pendientes: reparación del alta,
pruebas completas de formularios y sus interruptores, otros tipos de datos
configurables, roles y otra organización, móvil real y entorno desde cero.
No se ha repetido `npm run check`: solo cambian documentación y datos de prueba;
la última ejecución correcta de esta sesión sigue siendo la de la primera pasada.

## Corrección posterior de los dos fallos

Con autorización del usuario se corrigen los dos bugs concretos:

- Los campos de empresa capturan el valor antes del actualizador de estado,
  evitando acceder al evento cuando currentTarget ya es nulo.
- La redirección por permisos espera a que el perfil y la empresa estén
  resueltos; conserva la comprobación de permisos tras la carga.

Verificado con Playwright sobre backend real y sesión existente:

- Apertura directa de Equipo, catálogo y empresas con business de QA Norte:
  conserva la ruta y presenta el encabezado correspondiente.
- Alta mediante formulario de `QA Formulario 181026`, slug
  `qa-formulario-181026`, correo sintético `qa-formulario@example.invalid`,
  teléfono sintético y zona Atlantic/Canary: guarda y cierra sin alertas.
- Recarga y edición mediante formulario a 390 px: nombre final
  `QA Formulario 181026 editada`, zona Europe/Madrid y teléfono modificado.
  Nueva recarga confirma nombre y zona en el listado. Sin desbordamiento del
  documento con el formulario abierto.
- Apertura directa de Equipo y catálogo con QA Sur a 390 px: conserva ambas
  rutas, encabezados correctos y sin desbordamiento del documento.

Esta tercera empresa QA queda disponible en la base local. No se han borrado
datos ni enviado invitaciones. No se ha probado un móvil real ni otros roles
en esta corrección; permanece pendiente esa parte de la revisión.

Validación final tras los cambios: `npm run check` correcto (12 pruebas de
scripts, 449 del backend, lint y ambas compilaciones); `git diff --check` sin
errores. Persiste el aviso de bundle grande (1543,07 kB, 341,60 kB gzip).
