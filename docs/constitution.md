# Constitución de BUKIOO

Estos principios guían las especificaciones, planes, cambios y revisiones.
El código y los contratos reales deben comprobarse antes de afirmar su estado.

1. **Aislamiento y permisos.** El backend debe comprobar identidad, pertenencia,
   autorización y alcance de organización y empresa en cada recurso. Los IDs
   recibidos del cliente no son prueba de acceso; prueba accesos cruzados.
2. **Seguridad y privacidad.** No guardar secretos ni credenciales reales en Git,
   logs o memoria; no modificar `.env` reales. Considerar sesiones, cookies,
   CSRF, fuerza bruta, enumeración de correo y autorización por objeto. No
   devolver hashes o secretos ni registrar contraseñas, tokens o cookies;
   conservar contraseñas y tokens de forma segura según su función.
3. **Datos e histórico.** Usar SQL parametrizado y dbmate, sin ORM nuevo sin
   aprobación. No alterar migraciones aplicadas y compartidas; analizar impacto,
   datos y reversión antes de cambios destructivos. Preservar historial relevante.
4. **Arquitectura sencilla.** Mantener la separación HTTP/controller, lógica de
   negocio/service y persistencia/repository; evitar dependencias, infraestructura
   o abstracciones innecesarias. Las fechas respetan la zona del negocio.
5. **Reservas fiables.** La disponibilidad mostrada no sustituye el control de
   concurrencia en persistencia. Probar conflictos, límites y aislamiento;
   preservar el precio y duración históricos de la cita y distinguir los logs
   técnicos de la auditoría de acciones de negocio.
6. **Calidad demostrable.** Acordar alcance y criterios de cambios relevantes,
   comprobar los requisitos y comunicar límites. La documentación debe reflejar
   el repositorio real y las pruebas y revisiones no realizadas quedan pendientes.

La licencia de BUKIOO es propietaria; la declaración vigente está en `LICENSE`.
