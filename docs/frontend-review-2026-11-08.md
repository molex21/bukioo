# Revisión del frontend, 08/11/2026

Estado: F01–F14 corregidos tras la autorización del usuario para resolver todo.
El cuerpo conserva los hallazgos iniciales como evidencia histórica. La
validación posterior y sus límites están en
[guía de comprobación](frontend-review-checklist-2026-11-08.md).
Base revisada: a19c4fc más el cambio local que retira "Pausa" de nuevas ausencias.

## Método y alcance

Skills utilizadas: web-design-guidelines y playwright-cli de .agents/skills/.
Reglas recuperadas el día de la revisión desde
[Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).
Se conservan el español y las comillas dobles rectas acordadas con el usuario.
Para el contraste se consultó [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

El usuario reactivó expresamente Playwright. Edge, escritorio 1440×900 y móvil
emulado 390×844; no dispositivo físico. Acceso manual por el usuario, sin recibir
contraseñas ni códigos. Interacciones de horarios en QA Norte 181026: solo
borradores descartados, sin guardar registros de negocio. No se probaron envíos
de invitaciones, recuperación real ni operaciones destructivas.

Inspección de código: acceso y rutas, plataforma, contenedor /app, Equipo,
cuadrante y editores, catálogo/empresas, componentes de acciones y estilos/tema.
Inspección visual: acceso, lista de organizaciones, Equipo/cuadrante, asignación,
horario semanal, nuevo servicio y nueva empresa. No es una auditoría exhaustiva
de todos los estados ni una certificación de accesibilidad.

## Hallazgos prioritarios

### Horarios: conservación de borradores

- F01 / P1 — frontend/src/components/ScheduleWeekEditor.tsx:43 — cambiar la
  selección elimina el turno que se está editando sin avisar. Reproducido:
  seleccionar lunes, añadir turno, cambiar 09:00 a 10:15, quitar y volver a marcar
  lunes: vuelve a "Día libre". Conservar el borrador o confirmar su descarte.
- F02 / P1 — frontend/src/components/ScheduleDatesEditor.tsx:49 y
  frontend/src/components/EmployeeWeeklyBaseEditor.tsx:128 — el guardado exterior
  usa el estado de días, mientras el turno visible puede seguir solo en el estado
  interno del editor. Confirmado en código: onChange exterior se llama al pulsar
  "Aplicar a los días seleccionados", no al escribir horas. El flujo permite
  interpretar "Confirmar y guardar" como guardado del turno recién escrito.
  No se pulsó guardar para reproducirlo contra datos reales. Unificar el borrador
  o impedir guardar hasta aplicar/descartar explícitamente los cambios visibles.
- F03 / P1 — frontend/src/components/EmployeeWeeklyBaseEditor.tsx:87 — cambiar
  "Aplicar este horario al empleado desde" recarga el horario y borra cambios ya
  aplicados al borrador. Reproducido: aplicar 10:15 al lunes y cambiar la fecha a
  09/11; el lunes vuelve sin turno. Hay explicación bajo el campo, pero ninguna
  confirmación. Separar la fecha de vigencia del acto de cargar otro horario.
- F04 / P2 — frontend/src/components/EmployeeWorkingHours.tsx:34 y
  frontend/src/components/SchedulingQuadrant.tsx:465 — cierre por Escape/X descarta
  borradores de horarios; la protección de cambios pendientes del cuadrante solo
  cubre el modo "templates". Extenderla al horario semanal, fechas y creación de
  rotación dentro de asignación. No bloquear el cierre cuando no hay cambios.

### Accesibilidad

- F05 / P1 — frontend/src/pages/PlatformPage.tsx:178 — buscador de organizaciones
  sin label ni aria-label. DOM confirmado: placeholder "Escribe aquí", labels=[]
  y ariaLabel=null. Añadir nombre visible "Buscar organizaciones" y ayuda útil.
- F06 / P1 — frontend/src/pages/LoginPage.tsx:119 — botón de mostrar contraseña
  con nombre "Toggle password visibility" y tabIndex=-1. Confirmado en navegador:
  Tab desde la contraseña salta a "He olvidado mi contraseña". Localizar el nombre
  y habilitar el acceso por teclado en PasswordInput; revisar también los pasos
  de creación/restablecimiento de contraseña (líneas 125 y 131).
- F07 / P1 — frontend/src/pages/WorkspaceBusinessesPage.tsx:99 — botón X del modal
  sin nombre accesible. Confirmado en "Nueva empresa": sin texto, aria-label,
  aria-labelledby ni title. El tema no configura un nombre por defecto. Añadir
  "Cerrar" a los cierres de Modal/Drawer y revisar también avisos cerrables.
- F08 / P1 — frontend/src/pages/WorkspaceBusinessesPage.tsx:115 y
  frontend/src/theme.ts:3 — texto secundario activo con contraste insuficiente.
  Medido en la descripción de Empresas: rgb(134,142,150) sobre rgb(248,250,252),
  16 px/400, contraste aproximado 3,17:1. Para este tamaño corresponde 4,5:1.
  Unificar el token de texto secundario entre CSS y Mantine, y volver a medir;
  no oscurecer indiscriminadamente controles deshabilitados o colores de empleado.
- F09 / P2 — frontend/src/pages/WorkspacePage.tsx:378 y
  frontend/src/pages/PlatformPage.tsx:602 — navegación por botones con navigate,
  sin enlaces nativos ni aria-current. Añadir enlaces y estado de página actual;
  permitir abrir destino en otra pestaña. Falta además enlace para saltar al
  contenido principal en frontend/src/pages/WorkspacePage.tsx:634 y contenedor
  de plataforma. El foco visible global sí existe: no se reporta como ausente.

## Rediseño acordado: propuestas para valorar

- F10 / P2 — frontend/src/components/SchedulingQuadrant.tsx:270 — selector semanal
  repartido en tres botones, rango mostrado más abajo. Agrupar rango y flechas,
  acceso directo a fecha/semana y acción "Hoy". La lista móvil del cuadrante tiene
  mucha altura incluso con una persona: se midieron 2839 px de documento. Valorar
  día activo/semana compacta y resumen de turnos, con detalles bajo demanda.
- F11 / P2 — frontend/src/components/ScheduleAssignmentEditor.tsx:86 — selección
  mediante lista de checkboxes sin búsqueda ni resumen de personas elegidas;
  recibe empleados de la página actual del cuadrante. Rediseñar con búsqueda,
  contador y alcance claro, sin perder seleccionados al paginar. Con un empleado
  QA no se ha validado el comportamiento visual de una lista grande.
- F12 / P2 — frontend/src/components/ScheduleWeekEditor.tsx:72 — siete columnas
  estrechas en modal de escritorio y siete tarjetas antes del editor en móvil.
  La acción sobre el día seleccionado queda alejada. Valorar editor junto a la
  selección, resumen compacto y acciones persistentes, conservando teclado/foco.
- F13 / P2 — frontend/src/pages/WorkspaceTeamPage.tsx:89 y
  frontend/src/components/SchedulingQuadrant.tsx:62 — vista, semana y filtro viven
  solo en useState; recargar no recupera ese contexto. Llevar el estado navegable
  a la URL, conservando el alcance de empresa ya existente.
- F14 / P2 — frontend/src/pages/WorkspaceBusinessesPage.tsx:103,
  frontend/src/pages/WorkspacePage.tsx:461 y
  frontend/src/pages/CustomerAccessPage.tsx:25 — textos por humanizar: "Slug",
  "buffers" y explicaciones de desarrollo en pantallas provisionales. Proponer
  "Dirección pública", una explicación de márgenes entre citas y "Próximamente".

## Comprobaciones positivas y límites

- Acceso, lista de organizaciones y cuadrante: sin desbordamiento horizontal de
  la página en las anchuras comprobadas. Las tablas con scroll interno se mantienen;
  esto no demuestra que sus acciones sean cómodas en móvil.
- Formularios de empresa, servicio y horario: modal de 351 px dentro de 390 px.
  Escape cerró los modales inspeccionados; al cerrar Nueva empresa se devolvió el
  foco a "Nueva empresa". El guardado de negocio no se ejecutó en esta revisión.
- Las plantillas diarias no incluyen fechas ni días semanales. Las fechas se
  muestran al asignar horarios/ciclos, conforme al acuerdo.
- Alert de Mantine sí tiene role="alert" por defecto en la versión instalada;
  no se registra como fallo una ausencia general de avisos accesibles. Queda
  revisar si los avisos informativos deben usar anuncios menos intrusivos.
- El 401 inicial de auth/refresh se produjo sin sesión antes del acceso manual;
  no se cuenta como fallo del cuadrante. No se observaron otros errores API en
  las lecturas de las pantallas QA visitadas.
- Capturas y helpers solo en tmp/frontend-review y .playwright-cli; no incorporar
  al repositorio capturas con datos de cuentas ni perfiles/sesiones de navegador.
- Sin pruebas con lector de pantalla, móvil físico, zoom 200/400 %, listas grandes,
  roles alternativos, recepción de correo, conflictos de citas ni persistencia.
  Estas comprobaciones siguen pendientes. Reserva pública/cliente/agenda provisional
  no se declaran funcionales. No se ha añadido ni validado un modo oscuro.
- No se han cambiado componentes de producto durante el repaso ni ejecutado de
  nuevo npm run check: los cambios del informe son documentales. La modificación
  previa que quita Pausa de nuevas ausencias ya había pasado los controles.

## Orden recomendado inicialmente (histórico)

1. Corregir pérdida de borradores y ambigüedad aplicar/guardar (F01–F04), con
   pruebas de regresión antes de continuar con otras funcionalidades.
2. Corregir etiquetas, teclado, cierres y contraste (F05–F09).
3. Acordar el diseño del cuadrante, selector semanal y selector de empleados;
   aplicar después la propuesta visual y los textos/estado navegable (F10–F14).
4. Repetir comprobaciones visuales y manuales, incluyendo estados con datos,
   errores y roles; después retomar los bloques funcionales pendientes.
