# Precio por hora de mano de obra opcional

Estado: en valoración, ajustado según comentarios del usuario. Fecha: 18/10/2026.

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

## Objetivo

Registrar una tarifa opcional de mano de obra, conservando el comportamiento actual al quedar vacía.

## Estado comprobado

Solicitud nueva; no se ha identificado contrato ni esquema vigente para esta tarifa. Requiere definir semántica y revisar backend, frontend y eventual persistencia de citas. No es un pendiente exclusivamente frontend.

## Alcance y límites propuestos

Decisiones obligatorias: tarifa por empresa/servicio/empleado; coste interno o cobro al cliente; minutos cobrables; suma o alternativa al precio fijo/desde; buffers, suplementos, impuestos y moneda; cero frente a vacío; precisión/redondeo; cambios históricos.

## Criterios de aceptación

Vacío conserva precio anterior; cero según decisión; negativos/precisión/límites; guardado y edición por alcance; aislamiento. Si cálculo proporcional aprobado: 40 €/h por 90 min = 60 € antes de otros componentes. Probar redondeo y cambios de tarifa sin alterar citas históricas.

## Decisiones pendientes

Bloqueado para implementación hasta decidir reglas y aprobar migración/plan específico. No añadir ORM, proveedor ni dependencia. La especificación se actualizará con ejemplos de negocio antes de la aprobación definitiva.
