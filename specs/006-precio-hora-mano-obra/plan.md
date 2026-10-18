# Plan provisional: Precio por hora de mano de obra opcional

Borrador ajustado para valoración; no autoriza implementación.

## Alcance confirmado y propuesta restante (18/10/2026)

El usuario solicita tarifa opcional tanto por servicio como por categoría;
esta decisión sustituye la pregunta inicial sobre empresa/servicio/empleado.
Propuesta para valorar: servicio con tarifa explícita prevalece; vacío hereda
categoría; ambos vacíos conservan comportamiento actual. Cero no equivale a
vacío: debe acordarse si anula la herencia o si no se permite.

Revisar DTO, SQL y migración de ambos recursos, edición de categoría y servicio,
lectura de tarifa efectiva y procedencia. No sumar ni sustituir el precio actual
sin decidir primero coste interno/cobro, minutos, redondeo e histórico. Probar
cambio de categoría, cambio de tarifa de categoría, override de servicio y
conservación de citas históricas. La herencia es propuesta, no aprobación.
Debe ratificarse después de aprobar spec.md, conforme a docs/development.md.

## Implementación propuesta

Propuesta para valorar, no decisión: tarifa por servicio y vacía por defecto; solo avanzar con cálculo cuando se acuerde su relación con precio existente. Tras decisiones, detallar DTO/SQL/migración si procede, formulario, permisos y cálculo centralizado en backend. Si solo se registra tarifa en primera fase, no anunciar totales de citas. Preservar snapshot histórico cuando se implemente el cálculo de citas.

## Validación

Vacío conserva precio anterior; cero según decisión; negativos/precisión/límites; guardado y edición por alcance; aislamiento. Si cálculo proporcional aprobado: 40 €/h por 90 min = 60 € antes de otros componentes. Probar redondeo y cambios de tarifa sin alterar citas históricas.

Ejecutar npm run check tras código/configuración; E2E en base aislada _test
cuando corresponda a permisos o persistencia. Probar responsive y teclado en
los flujos nuevos; la revisión global con skills será posterior. Playwright
permanece en pausa hasta indicación del usuario. No declarar evidencia no obtenida.

## Dependencias y decisiones

Bloqueado para implementación hasta decidir reglas y aprobar migración/plan específico. No añadir ORM, proveedor ni dependencia. La especificación se actualizará con ejemplos de negocio antes de la aprobación definitiva.

## Documentación y entrega

Actualizar API reference si cambia contrato, README si cambia funcionamiento,
roadmap, memoria y changelog según cambios reales. Registrar pendientes y
pruebas por requisito. Commit y push con aprobaciones separadas; no automáticos.
