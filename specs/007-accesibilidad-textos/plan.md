# Plan provisional: Etiqueta de buscador y texto de contraseña

Borrador para valorar junto con la especificación; no autoriza implementación.
Debe ratificarse después de aprobar spec.md, conforme a docs/development.md.

## Implementación propuesta

Añadir nombre accesible Buscar organizaciones; localizar Mostrar contraseña/Ocultar contraseña en los controles correspondientes con las propiedades de Mantine disponibles. No cambiar componentes de terceros ni instalar paquetes.

## Validación

Árbol accesible con nombre descriptivo; teclado activa visibilidad, estado y etiqueta coherentes; foco conservado y formulario sigue enviando. Revisión manual y automática apropiada sin duplicar tests de Mantine.

Ejecutar npm run check tras código/configuración; E2E en base aislada _test
cuando corresponda a permisos o persistencia. Probar responsive y teclado en
los flujos nuevos; la revisión global con skills será posterior. Playwright
permanece en pausa hasta indicación del usuario. No declarar evidencia no obtenida.

## Dependencias y decisiones

Sin backend ni migraciones. Ejecutable como último bloque de esta secuencia; revisión global con skills después.

## Documentación y entrega

Actualizar API reference si cambia contrato, README si cambia funcionamiento,
roadmap, memoria y changelog según cambios reales. Registrar pendientes y
pruebas por requisito. Commit y push con aprobaciones separadas; no automáticos.
