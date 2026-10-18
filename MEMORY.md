# Memoria de BUKIOO

Actualizada: 18/10/2026. Documento vivo; mantener las líneas necesarias sin
duplicar el roadmap ni guardar secretos, transcripciones o reglas obsoletas.

## Primer paso de la próxima sesión

- Por petición del usuario, comprobar primero lo implementado en esta sesión:
  eliminación/desactivación/reactivación de catálogo, acciones de empleados,
  asignaciones y horarios semanales. Incluir el aspecto de colores de empleados
  en la tabla, selector de color, guiones del slug y rutas directas.
- Usar datos QA existentes y registrar resultados reales, errores y bloqueos;
  las pruebas de los nuevos diálogos, roles, responsive y teclado siguen
  pendientes. Playwright continúa en pausa hasta indicación del usuario.
- Después de comprobar y corregir lo necesario, continuar con 3C bloqueos,
  usuarios/permisos en /app, 2FA opcional desde perfil, tarifa por servicio y
  categoría y accesibilidad/textos. Revisión global con skills al terminar;
  logos aplazados. No dar por probadas las funciones solo porque compilan.

## Estado y decisiones

- Preferencia de textos: usar comillas dobles rectas; evitar comillas angulares
  y comillas invertidas como delimitadores de citas en mensajes y textos UI.
  Conservar la sintaxis de código necesaria.
- Pendiente de revisión visual: cómo se muestra el color de cada empleado en
  la tabla de Equipo, incluidos contraste, visibilidad de muestra e iniciales.
- SaaS multiempresa: frontend React/Vite/Mantine; backend NestJS, PostgreSQL y
  dbmate. El detalle de instalación y API está en los README y API reference.
- 18/10/2026: rama `mvp`, árbol limpio al iniciar la revisión; el inventario
  del 17/10 es histórico. Se comprobó Git y se comunicó al usuario.
- El inventario de cambios sin commit observado el 17/10/2026, con archivos,
  pruebas y pendientes, está en `docs/cambios-sin-commit.md`. Es una foto del
  momento: consultar el estado y los diffs actuales antes de trabajar o confirmar.
- El panel dispone de contexto de organización y empresa, configuración de
  empresas, catálogo por empresa y pantalla de equipo `/app/team`. Estos flujos
  requieren las pruebas pendientes; no se considera validado todo el producto.
- El catálogo incorpora precio fijo o «desde», datos configurables y suplementos
  de precio/tiempo. El cálculo final y edición en citas aún deben verificarse e
  implementarse donde corresponda; consultar el roadmap antes de afirmar estado.
- El formato de commit acordado es `DD/MM/AAAA Descripción (A)`; se mantiene
  confirmación previa del contenido y otra independiente para push.
- La memoria no tiene límite artificial de líneas; conservar lo necesario y
  eliminar o actualizar información obsoleta sin perder decisiones importantes.

## Última verificación

- 18/10/2026: última ejecución de npm run check correcta; 12 tests de scripts y 452 tests del
  backend, lint y compilación de backend y frontend. El build frontend avisa
  de un bundle superior a 500 kB; revisar su impacto en la revisión pendiente.
- E2E contra base de pruebas, entorno desde cero y pruebas visuales/manuales
  en escritorio y móvil no se han ejecutado en esta configuración.

## Prioridad antes de la siguiente funcionalidad

- Revisar el frontend existente y lo que sea posible con las skills elegidas,
  antes de avanzar a otra feature. Presentar hallazgos, riesgos, pruebas y
  propuesta al usuario; acordar las correcciones o el siguiente paso.
- Las skills Taste, Vercel Web Design Guidelines y Playwright CLI se instalaron
  en `.agents/skills/` el 17/10/2026; esta sesión las reconoce. Taste es para
  páginas públicas, no para el dashboard. Playwright
  CLI 0.1.22 instalado globalmente y Edge comprobado el 18/10/2026; ahora en pausa.
  El catálogo, requisitos y licencias están en `docs/development.md` y
  `docs/third-party-skills.md`. Awesome DESIGN.md es una colección de
  referencias, no una skill; elegir una referencia con el usuario.
- Crear o ampliar los tests necesarios para los hallazgos y preparar pruebas
  finales: responsive, escritorio, móvil real o emulado, funcionamiento visual,
  flujos críticos y puesta en marcha en entorno limpio y aislado. Checklist:
  `docs/frontend-verification.md`. Registrar lo que el usuario debe probar.
- Validar manualmente multiempresa, empresas, empleados, categorías, precio
  «desde», campos configurables y suplementos; no marcarlo hecho sin evidencia.

## Después de la revisión, sujeto a aprobación

- 3B ratificado al pedir siguiente punto: editor Horarios en Equipo con turnos partidos, validación y confirmación de semana vacía. Vigencias/precisión incompatible bloquean guardado. Pendiente revisión de interfaz y persistencia real; siguiente 3C bloqueos. Playwright sigue en pausa.

- Ratificado 3A con "dale": asignaciones desde acción Empleados de servicios
  existentes. Lista vacía permitida con aviso conforme al backend, sin cambiar
  citas. Prueba de contrato para retirada completa. Pendiente prueba visual y
  manual; horarios 3B y bloqueos 3C todavía sin implementar. Playwright en pausa.
- Usuario autoriza continuar con bloque 2. Conectadas invitación de ficha sin
  cuenta, recuperación, reset de 2FA y archivo mediante contratos actuales.
  Reenvío de invitación pendiente: no hay endpoint y el invite actual crea
  cuenta, por lo que no debe reutilizarse para cuentas ya vinculadas.
- «Go» final del usuario: implementado bloque 1 de eliminación catálogo en
  frontend, con confirmación, alternativa desactivar tras 409 y reactivación.
  Backend sin cambios; desactivar categoría no oculta servicios públicos.
  Pendiente verificación manual/visual y carrera de referencias. No avanzar
  al bloque 2 como si esas pruebas estuvieran realizadas. Logos aplazados.
- Valoración de planes: «go» de alcance en 2, 3, 4 y 7. En 1, ofrecer desactivar
  tras 409 con confirmación; en 5, 2FA opcional (aclarar política organizativa
  frente a activación individual); en 6, tarifa por servicio y categoría,
  herencia/cálculo pendientes. Ver specs/planning-status.md. Sin implementación nueva.
- Secuencia acordada: eliminación catálogo; acciones empleados; asignaciones,
  horarios y bloqueos; usuarios/permisos /app; 2FA obligatorio plataforma;
  mano de obra opcional; etiqueta buscador/texto contraseña. Borradores por
  bloque en specs/planning-status.md, pendientes de valoración y dos aprobaciones SDD.
- El usuario da por realizado el repaso inicial y pide funcionalidades primero;
  la revisión global con skills será después. Logos aplazados. No confundir
  esta decisión de secuencia con evidencia de las pruebas todavía pendientes.
- 18/10/2026: solicitado mostrar selector visual de color de agenda y corregir
  escritura de guiones en slug de empresa; cambios aplicados en frontend.
  Playwright sigue en pausa; pendiente prueba manual visual de estos cambios.
- Almacenamiento de logos: propuesta en docs/logo-storage-proposal.md, pendiente
  aprobación. Actualmente solo URL; propuesta archivo en objetos y referencia
  en PostgreSQL, sin elegir proveedor ni implementar subida.
- 18/10/2026: pendiente eliminar servicios y categorías desde frontend; DELETE
  ya existe en backend. Reglas actuales bloquean servicios con empleados/citas
  y categorías con servicios. Impacto y pruebas: docs/catalog-deletion-impact.md.
- 18/10/2026: solicitado precio por hora de mano de obra opcional. Anotado en
  roadmap 3.1; pendiente definir alcance (empresa/servicio/empleado), coste o
  precio de venta, cálculo e histórico. No implementado.
- Playwright en pausa por petición del usuario; continuar con los pendientes
  backend sin interfaz y conservar las pruebas restantes como pendientes.

1. Asignar servicios a empleados y configurar horarios y bloqueos.
2. Avanzar en agenda/citas: cálculo e instantánea de precio y duración, con
   ajustes auditados cuando se acuerden.
3. Continuar con clientes e historial. Mantener en el roadmap el ticketing y
   el acceso temporal y auditado de soporte, sin acceso permanente por defecto.

La lista detallada de tareas y pruebas pendientes permanece en
`frontend/FRONTEND_ROADMAP.md`; las rutas públicas de reserva y área cliente son
pantallas provisionales según `frontend/src/App.tsx`.

## Revisión parcial del 18/10/2026

- Playwright CLI 0.1.22 instalado globalmente con aprobación; Edge operativo.
- Informe y límites: [revisión frontend](docs/frontend-review-2026-10-18.md).
- npm run check correcto: 12 tests de scripts, 449 backend, lint y builds.
- Usuario autoriza la base local como datos de prueba e inicia sesión en Edge.
- Revisadas rutas sin sesión, plataforma, Equipo y catálogo a 1440 y 390 px;
  sin desbordamiento observado. Por petición del usuario se crearon empresas
  QA Norte 181026 y QA Sur 181026 con categorías, servicios y empleados sin
  invitación en la base local. IDs y resultados en el informe.
- Verificados listados separados, cambio de empresa, persistencia API de
  suplementos/notas y rechazo 404 de IDs de servicio/empleado cruzados.
- Corregidos la lectura diferida del evento en formularios de empresa y la
  pérdida de ruta por comprobar permisos antes de cargar perfil/empresa.
  Playwright verifica alta y edición con recarga, y rutas directas en escritorio
  y viewport móvil. Nueva empresa QA Formulario 181026 editada para esta prueba.
- Pendientes: resto de formularios, aislamiento entre
  organizaciones y roles, accesibilidad completa, móvil real, E2E y entorno limpio.
