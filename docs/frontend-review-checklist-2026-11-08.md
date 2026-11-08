# Comprobación manual de las correcciones del frontend

Usa la empresa local de pruebas. Revisa en este orden y comunica el número del
paso y qué esperabas si algo falla. El logo y las funcionalidades siguientes
quedan fuera de este repaso.

1. **Cuadrante y semanas.** En Equipo, abre "Cuadrante". Cambia de semana con
   las flechas, elige una fecha y pulsa "Hoy". Debe mostrar la semana correcta.
   Filtra un empleado y recarga: conserva vista, semana, filtro y empresa.
2. **Horario semanal sin perder cambios.** Vuelve a "Empleados" y abre
   "Horario semanal". Selecciona lunes, define 09:00–17:00, cambia a martes y
   vuelve a lunes. Las horas deben seguir ahí. Cambia la fecha de aplicación:
   tampoco debe borrar los turnos. Ya no hay que pulsar "Aplicar".
3. **Turnos y pausas.** Añade un segundo turno y una pausa. Activa y desactiva
   "Cuenta como tiempo de trabajo": solo cambia la estimación; la pausa sigue
   sin admitir citas. Prueba también "Termina al día siguiente". Revisa el total.
4. **Cerrar sin perder trabajo.** Con cambios, pulsa la X o Escape. "Seguir
   editando" conserva todo; "Descartar y cerrar" lo elimina. Hazlo también en
   un día, varias fechas seleccionadas, una plantilla y una rotación nueva.
   Recargar con un borrador debe mostrar el aviso del navegador.
5. **Plantillas.** En el cuadrante abre "Plantillas": lista y botón "Nueva".
   Una plantilla diaria lleva nombre, turnos y pausas, sin fechas. Una rotación
   permite configurar semanas. Selecciona varios días para aplicar un turno;
   comprueba que los demás conservan sus horas.
6. **Asignar ciclo.** Busca personas por nombre, selecciona varias, elige una
   rotación y fechas de inicio/fin. La selección debe conservarse al buscar otra
   persona y debe incluir empleados fuera de la primera página del cuadrante.
   Si no puede comprobar el equipo, debe impedir el guardado y mostrar el error.
7. **Ausencias.** En una fecha futura, "Editar día" → "Ausencia". Deben aparecer
   vacaciones y permisos; "Pausa" no se ofrece para crear una ausencia. Las
   pausas se gestionan dentro del turno. El cuadrante muestra el motivo de la
   ausencia sin desplegar el detalle.
8. **Guardar de verdad.** En QA, prepara un cambio reconocible y pulsa
   "Confirmar y guardar". Recarga y vuelve a abrirlo: debe persistir exactamente
   ese horario. Prueba un conflicto con una cita de prueba: debe ofrecer su
   resolución, sin guardar un horario incompatible. Si reasignas la cita, revisa
   también el empleado final. Este paso con persistencia real queda pendiente de
   tu comprobación: durante la revisión automática se interceptaron los envíos.
9. **Móvil.** Repite los pasos principales con pantalla estrecha. En el cuadrante
   elige el día que quieres ver. Comprueba que puedes seleccionar fechas,
   editar, cerrar y alcanzar el botón de guardar sin cortes ni scroll horizontal
   de toda la página. La tabla de escritorio conserva su scroll interno.
10. **Textos y accesibilidad.** Comprueba el contraste del texto gris y colores
    de avatar, los cierres y la navegación con Tab. En acceso, el botón de mostrar
    contraseña debe ser accesible por Tab y estar en español. En plataforma,
    "Buscar organizaciones" tiene etiqueta. El primer enlace permite saltar al
    contenido; el menú marca la sección actual.

## Evidencia automática y límites

08/11/2026: controles completos correctos: 12 pruebas de scripts, 459 de backend,
28 de helpers frontend, lint y compilación de ambos proyectos. Después de los
últimos ajustes visuales se repitieron controles y build de frontend. Se mantiene
el aviso previo de tamaño del bundle.

Edge: escritorio 1440×900 y móvil emulado 390×844. Borrador conservado al cambiar
selección/fecha; continuar tras aviso conserva horas. Envíos de preview POST y
guardado PUT interceptados: mismo comando, lunes 09:15–17:15 y vigencia elegida.
Sin escrituras reales en esta verificación. Cierre limpio, descarte de ausencia
y plantilla, ausencia sin Pausa y restauración de vista/semana tras recarga
comprobados. Texto secundario medido: #64748b sobre #f8fafc, 4,55:1.

Equipo simulado de 12 personas: selección por búsqueda de la persona 12, fuera
de la página de diez; versión 42 incluida en el comando y guardado interceptado
tras comprobar. Se retiraron las simulaciones y se restauró la vista QA real.
Buscador de organizaciones con etiqueta, salto al contenido con foco en main,
enlace activo con aria-current y contraseña accesible con Tab/Enter comprobados.
Cuadrante sin desbordamiento horizontal de página a 320 y 390 px.

No equivale a una auditoría de toda la aplicación. Pendientes móvil físico,
lector de pantalla, zoom 200/400 %, distintos roles, persistencia real y el flujo
completo con citas afectadas. No se ha añadido modo oscuro.
