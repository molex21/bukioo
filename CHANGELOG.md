# Cambios de BUKIOO

## Sin publicar

- Borrador único de turnos: cambiar selección o vigencia conserva las horas;
  guardar comprueba y envía el horario visible. Avisos de descarte y recarga.
- Cuadrante con selector semanal agrupado, día activo en móvil y estado en URL;
  asignación con búsqueda de empleados y comprobación de versiones por persona.
- Etiquetas accesibles, contraseña en español y por teclado, cierres con nombre,
  enlaces de navegación, salto al contenido y mayor contraste de texto secundario.

- Retirada la opción de pausa al crear ausencias; las pausas se configuran en
  turnos y plantillas. Se conservan los bloqueos de pausa existentes.

- Editor de turnos abierto al seleccionar días y textos que distinguen la
  plantilla diaria sin fechas de la asignación del horario a un empleado.

- Biblioteca de plantillas con listado y botón "Nueva", edición semanal por
  selección de días y aplicación de turnos o plantillas en lote.
- Horas programadas estimadas con pausas computables opcionales; las pausas
  siguen bloqueando citas. Cálculo nominal y cálculo real por fecha con DST.
- Rotaciones con inicio/fin en interfaz, resumen del intervalo y recorte de
  la última noche al finalizar la asignación. Migración 20261102150000 requerida.

- Plantillas de turno aplicables a fechas elegidas, separadas de rotaciones;
  carga automática del turno en el borrador al seleccionar la plantilla.
- Guardado del cuadrante con comprobación automática y reasignación explícita
  de citas afectadas a empleados disponibles, en una transacción conjunta.
- Restablecimiento con resumen del horario previsto y nuevo editor semanal
  con pausas, turnos nocturnos, copia de días y fecha de inicio.
- Migración aditiva 20261102120000 para tipos de plantilla y bases semanales;
  requiere aplicación explícita antes de usar el nuevo código.

- Cuadrante editable por día, descansos explícitos, plantillas/ciclos con desfase
  individual, pausas y ausencias por horas/días, con previsualización y versiones.
- Horario efectivo compartido con reservas y protección SQL ante cambios
  incompatibles con citas futuras, con pruebas HTTP y PostgreSQL aisladas.
- Avatar compartido de empleado y aviso de contraste con corrección voluntaria.
- Vista semanal de consulta del cuadrante en Equipo: turnos, bloqueos,
  navegación por semanas, filtro de empleado y presentación por días en móvil.
- Identidad de empleados en Equipo con borde e iniciales del color seleccionado
  y fondo suave del mismo tono.
- Editor semanal de horarios de empleados, con turnos partidos, validación y confirmación de semana vacía.

- Asignación de empleados activos a servicios desde el catálogo, con selección
  actual cargada y aviso al guardar sin empleados.
- Acciones de Equipo para invitar fichas sin cuenta, solicitar recuperación,
  restablecer 2FA y archivar con confirmación e historial preservado.
- Eliminación confirmada de servicios y categorías en el panel de empresa,
  con alternativa de desactivación ante conflictos y reactivación de inactivos.
- Selector visual de color de agenda en Equipo y corrección de la escritura
  de guiones en el slug de empresa, conservando la validación al enviar.
- Corregidos el fallo al escribir en los formularios de empresa y la pérdida
  de ruta al cargar directamente Equipo o Configuración antes de resolver permisos.
- Organización de instrucciones operativas, memoria del proyecto y guía de
  revisión y pruebas del frontend.
- Instalación en el proyecto de las skills Taste, Web Design Guidelines y
  Playwright CLI; la herramienta de navegador requiere comprobación aparte.
- El comando de commit utiliza el formato con fecha acordado y trabaja con los
  archivos preparados explícitamente, con confirmaciones separadas para commit
  y push.

No se reconstruye aquí el historial de publicaciones anteriores. La versión
declarada en el `package.json` raíz no implica que exista una release publicada.
