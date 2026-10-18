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

## Pruebas de catálogo, Equipo y calendario pendientes

Guía manual sin Playwright. Usar QA Norte 181026 y QA Sur 181026 de la base
local de pruebas. Son empresas de una misma organización, no entornos aislados.
Crear cuentas independientes para OWNER/ADMIN y EMPLOYEE cuando corresponda.
Una acción sin interfaz se marca bloqueada en frontend; puede probarse su API
con la colección de `postman/` y los contratos de `backend/docs/API_REFERENCE.md`.
No confundir una respuesta API correcta con un flujo de interfaz validado.

| Área | Pasos y resultado que comprobar |
| --- | --- |
| Categorías y servicios | Crear y editar en Norte; recargar y comprobar valores. Cambiar a Sur y comprobar que no aparecen. Probar precio fijo y «desde», duración y buffers. |
| Datos adicionales | Crear número, lista, texto y sí/no; guardar, reabrir y revisar obligatoriedad, límites, opciones y suplementos de precio/tiempo. Cambiar interruptores y comprobar persistencia. El cálculo final en citas sigue pendiente de implementación/verificación. |
| Empleados | Crear ficha sin invitación, editar color/notas y recargar. Verificar empresa y ausencia de acceso al panel. Probar cancelación del formulario sin guardar. |
| Invitación y recuperación | Cuando exista UI, invitar a una cuenta controlada y completar el acceso. Probar reenvío y recuperación, resultado visible y errores. Sin proveedor de correo de pruebas, la recepción y uso del enlace/código quedan bloqueados, aunque la API responda correctamente. |
| Reset de 2FA | Usar exclusivamente una cuenta de prueba con 2FA; confirmar reset por OWNER/ADMIN y comprobar el flujo posterior según contrato. EMPLOYEE no debe poder ejecutar la operación. |
| Eliminación | Usar una ficha desechable: cancelar primero y comprobar que se conserva; confirmar después. Probar referencias existentes y el conflicto previsto por API, preservando historial. |
| Asignaciones | Cuando exista UI, asignar empleados de la misma empresa a un servicio, guardar y recargar. Probar sustitución y retirada del último empleado conforme a la regla que se acuerde. Rechazar empleados de otra empresa. |
| Horarios | Guardar lunes 09:00–13:00 y 16:00–19:00; recargar y comprobar ambos turnos. Probar domingo 0 y sábado 6, intervalos invertidos y solapados. Verificar que guardar reemplaza el horario completo y no duplica turnos. |
| Bloqueos | Crear descanso/vacaciones de un empleado de prueba, editar fechas y eliminar; comprobar listados por rango y empleado y efecto en disponibilidad. Registrar zona horaria y probar límites de día. Agenda sin implementar queda bloqueada como verificación visual. |
| Permisos y alcance | Repetir acciones con EMPLOYEE y comprobar rechazo por API además de controles visuales. Probar IDs de Norte bajo rutas de Sur. Otra organización requiere cuenta y datos separados. |

Para cada caso anotar entrada, resultado esperado/observado, recarga, rol,
empresa, anchura o dispositivo y estado. Repetir los flujos críticos a ancho
móvil y con teclado. No enviar invitaciones a terceros.

### Futuro precio por hora de mano de obra

No implementado. Tras aprobar su especificación, comprobar campo vacío frente
a cero, decimales, rechazo de negativos, edición y persistencia por alcance.
Si se acuerda cálculo proporcional sin mínimo ni redondeo intermedio, 40 €/h
y 90 minutos deberían producir 60 € de mano de obra; este ejemplo no fija la
regla de negocio. Verificar convivencia con precio fijo/«desde» y suplementos,
permisos, aislamiento e histórico de citas al cambiar la tarifa.
