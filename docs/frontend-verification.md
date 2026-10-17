# Revisión y pruebas del frontend

Esta guía sirve para la revisión pendiente antes de la siguiente funcionalidad.
No marca ninguna prueba como superada: registra fecha, entorno, resultado,
evidencia y errores encontrados. Usa únicamente cuentas y datos de prueba.

## Revisión y pruebas automáticas

- Inventariar rutas implementadas y pantallas provisionales, permisos y estados
  de carga/error; revisar el diseño existente, responsive, teclado y contraste.
- Revisar autenticación, sesión, navegación y aislamiento entre organizaciones
  y empresas. No asumir que un control visual sustituye la autorización API.
- Crear o ampliar pruebas automáticas para los riesgos detectados con las
  herramientas disponibles y justificadas; comprobar regresiones, errores y
  casos límite. Proponer dependencias nuevas antes de instalarlas.
- Usar las skills aprobadas y disponibles cuando corresponda. Si aún no están
  instaladas o no se puede acceder a ellas, indicarlo y realizar las comprobaciones
  posibles sin afirmar que se utilizó una skill.
- Ejecutar `npm run check` y, cuando afecte a integración, E2E del backend contra
  una base de pruebas aislada conforme a `backend/README.md`.

## Entorno desde cero

1. Preparar una copia limpia y aislada del estado que se quiere probar, incluidos
   los cambios sin commit que corresponda, con Node/npm y Docker según
   `README.md`; usar bases, volúmenes y cuentas de prueba independientes.
2. Configurar ejemplos de entorno sin copiar secretos reales, instalar las
   dependencias y aplicar todas las migraciones a la base de pruebas nueva.
3. Iniciar frontend y backend, revisar errores de arranque y ejecutar los
   controles automáticos. Registrar comandos, versiones y resultado.
4. No borrar volúmenes, bases o datos existentes ni ejecutar comandos de
   limpieza destructivos sin identificar el objetivo y recibir autorización.

## Lista manual: escritorio y móvil

Realizar cada caso tanto en escritorio como en móvil real cuando sea posible;
si solo se usa emulación, indicarlo. En móvil, `localhost` apunta al propio
teléfono: usar una dirección de red accesible y configuración de desarrollo
apropiada, sin exponer credenciales ni servicios públicamente. Registrar si no
se dispone de dispositivo, red, cuentas o servicios necesarios.

Para un móvil real hay que comprobar por separado que el frontend escuche en la
red local, que `VITE_API_URL` apunte a una dirección del backend accesible desde
el teléfono y que `FRONTEND_URL` del backend coincida con el origen usado en el
móvil. La configuración actual apunta por defecto a `localhost` y la política
CORS admite el origen configurado; no basta con abrir la IP del ordenador en
el navegador. Preparar estos ajustes solo en un entorno de pruebas seguro y
revisar también cookies/sesión y firewall. Este acceso aún no se ha validado.

- [ ] Abrir `/platform/access`, iniciar/cerrar sesión y comprobar redirecciones.
- [ ] Abrir `/<slug-organización>/staff` sin sesión y comprobar el acceso del
      equipo; iniciar/cerrar sesión y revisar el comportamiento de la pestaña.
- [ ] Navegar por el panel, menús, selector de empresa y configuración. Probar
      permisos con cuentas adecuadas, carga, errores y estados vacíos.
- [ ] Crear/editar empresas de prueba; verificar enlaces, datos y aislamiento
      al cambiar entre al menos dos empresas y, si es posible, organizaciones.
- [ ] Crear/editar categorías y servicios por empresa; comprobar precio fijo o
      «desde», datos configurables, opciones y suplementos de precio y tiempo.
- [ ] Crear/editar empleados de prueba, con y sin invitación cuando sea posible;
      confirmar que los datos permanecen en la empresa correcta.
- [ ] Revisar en plataforma organizaciones, empresas, suscripciones y auditoría
      con datos de prueba, filtros, paginación, modales y confirmaciones.
- [ ] Comprobar anchuras, desplazamiento horizontal, texto cortado, botones,
      modales, tablas y selectores; verificar teclado, foco visible y etiquetas.
- [ ] Probar recargas, navegación atrás, pantallas pequeñas y errores de red;
      revisar consola y peticiones cuando se dispone de herramientas.
- [ ] Identificar pantallas aún provisionales: reserva pública, área de cliente
      y otros apartados pendientes no deben anotarse como funcionales sin prueba.

Resultado por caso: **pendiente / correcto / falla / bloqueado**, dispositivo,
ruta, pasos, resultado observado y captura sin datos personales si procede.
