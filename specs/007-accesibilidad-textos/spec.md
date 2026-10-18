# Etiqueta de buscador y texto de contraseña

Estado: alcance aprobado por el usuario («go»), 18/10/2026. Plan final pendiente de ratificación; no implementado.

## Objetivo

Dar nombre accesible descriptivo al buscador de organizaciones y traducir el control de visibilidad de contraseña.

## Estado comprobado

Buscador de organizaciones en PlatformPage.tsx sin label/aria-label; control de contraseña anunciado en inglés. Revisar componentes de acceso para localizar todas las instancias afectadas.

## Alcance y límites propuestos

Ajuste pequeño sin cambio de permisos, autenticación o estilo. Mantener entrada de texto, envío y foco existentes.

## Criterios de aceptación

Árbol accesible con nombre descriptivo; teclado activa visibilidad, estado y etiqueta coherentes; foco conservado y formulario sigue enviando. Revisión manual y automática apropiada sin duplicar tests de Mantine.

## Decisiones pendientes

Sin backend ni migraciones. Ejecutable como último bloque de esta secuencia; revisión global con skills después.
