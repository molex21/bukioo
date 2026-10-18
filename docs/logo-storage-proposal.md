# Propuesta de almacenamiento de logos

18/10/2026. Propuesta pendiente de aprobación; no implementa subida de archivos.

## Estado actual

La empresa guarda `logo_url` en PostgreSQL; el frontend acepta una URL HTTP/HTTPS
y muestra una previsualización. No guarda el contenido de la imagen. El DTO
actual limita la URL a 2048 caracteres y no admite una imagen base64/data URL.

## Alternativas

| Opción | Consecuencias |
| --- | --- |
| Imagen binaria en PostgreSQL | Centraliza archivo y metadatos en copias de la base, pero aumenta su tamaño y requiere endpoints para subir/servir imágenes, límites y política de caché. No consiste en rellenar logo_url con base64. |
| Almacenamiento de objetos y referencia en PostgreSQL | Separa la entrega de imágenes de las consultas de negocio; requiere configurar almacenamiento, permisos y coordinar sustitución, limpieza y copias de ambos sistemas. |
| Mantener URL externa | No requiere nueva infraestructura, pero depende de que el propietario del enlace mantenga la imagen disponible. Es la opción implementada actualmente. |

Propuesta: archivo en almacenamiento de objetos y referencia/metadatos en
PostgreSQL. No se elige proveedor ni se instala infraestructura en esta tarea.
Si se prioriza evitar ese servicio para un MVP pequeño, evaluar binario en
PostgreSQL con un límite estricto; requiere otro diseño de API y persistencia.

## Alcance a acordar antes de implementar

- Empresas y organizaciones, incluidos edición en plataforma y branding de
  accesos públicos. Revisar si ambos compartirán el mismo flujo de medios.
- Tipos permitidos y tamaño máximo; propuesta inicial PNG/JPEG/WebP, sin SVG
  hasta definir saneamiento. Validar contenido real en backend, no solo extensión.
- Permisos por organización/empresa, nombres generados por servidor, lectura
  pública del logo si se usa antes de iniciar sesión y escritura restringida.
- Subida, previsualización, sustitución y retirada; conservar la imagen anterior
  hasta completar el guardado. No eliminar URLs o archivos externos ajenos.
- Control de archivos huérfanos y fallos parciales, caché y actualización de URL,
  migración compatible de logos por URL y respaldo/restauración de archivos.
- Especificación, plan y aprobaciones del proyecto antes de cambiar contratos,
  dependencias, configuración o migraciones.

Pruebas previstas: subida válida, tipo/tamaño inválido, permisos y alcance,
fallo de red, sustituciones simultáneas, retirada, branding público, caché y
restauración. No se han ejecutado porque la funcionalidad no está implementada.
