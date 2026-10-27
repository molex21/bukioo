# Plan provisional: colores y cuadrante

27/10/2026. Para valorar junto a spec.md. Aprobar primero requisitos y decisiones;
después ratificar diseño técnico, migraciones y tareas antes de implementar.

"Go" del usuario el 27/10/2026: comenzar por entrega 1. Cambio de avatar
aplicado; verificación visual y contraste pendientes. El cuadrante y sus
ampliaciones requieren cerrar el diseño técnico antes de modificar datos.

## Entrega 1: identidad visual del empleado

Cambiar Avatar de WorkspaceTeamPage: borde y texto del color seleccionado,
fondo de ese tono al 12 % como punto de partida. Usar capacidades existentes de
Mantine/CSS; no opacity global. Revisar también muestra en selector y lugares
que identifican empleados. Valorar contraste sin cambiar la preferencia del
usuario a escondidas. Esta entrega no necesita cambiar backend ni base de datos.

## Entrega 2: cuadrante básico útil

27/10: usuario pide continuar. Implementada subentrega 2A de consulta con
endpoints existentes; tabla semanal, lista móvil por día, filtro, navegación y
paginación. No modifica planificación ni requiere migraciones. Resto de la
entrega (edición diaria/excepciones) pendiente de plan técnico ratificado.

Preparar componente de cuadrante semanal en Equipo y editor de día, con vista
móvil equivalente, carga, vacío, errores y filtros. Mostrar horario base y
bloqueos actuales sin inventar rotaciones. Añadir edición por fecha y descanso
explícito mediante contratos ampliados; no usar el PUT de reemplazo semanal para
guardar una celda. Conservar editor anterior hasta comprobar compatibilidad.

Antes de habilitar escritura fechada, definir modelo y resolver disponibilidad
efectiva en backend. La vista inicial de lectura puede entregarse por separado,
identificando claramente las acciones todavía no disponibles.

## Entrega 3: plantillas y rotaciones

Modelo SQL propuesto: plantillas de turnos/tramos y pausas; patrones de N semanas;
asignaciones por empleado con vigencia, fecha ancla, desfase y versión del patrón;
excepciones por fecha que incluyan día sin trabajo explícito. Tipos y tablas
exactos quedan para el plan técnico ratificado; no migrar automáticamente.

API parametrizada y autorizada por empresa/organización para consultar cuadrante
por rango, gestionar plantillas y asignar/reemplazar ciclos. Operación masiva con
previsualización de empleados, fechas y conflictos, y confirmación de alcance.
Editar "este día" o "desde esta fecha" como opciones explícitas; no actualizar
todo el pasado al retocar un ciclo. Copiar/revisar patrón al asignarlo.

## Entrega 4: pausas, vacaciones y permisos

Pausas de plantilla recurrentes; bloqueos actuales para excepciones fechadas.
Mapear etiquetas del producto a tipos reales; si permiso requiere nuevo tipo,
aprobar extensión de contrato y persistencia. Soportar horas y días completos,
listados/edición/retirada con confirmación e información de citas afectadas.
No instalar motor de nómina, control de presencia o aprobación de solicitudes.

## Disponibilidad, seguridad y compatibilidad

Auditar todos los lectores de employee_working_hours y calendar_blocks, incluidos
disponibilidad pública/interna, validación al crear/editar/reprogramar citas y
ocupación. Diseñar una única regla efectiva: excepción fechada, ciclo vigente,
base compatible; después restar pausas, ausencias y citas con buffers.
No basta con pintar la nueva cuadrícula si la reserva sigue leyendo otra regla.

Normalizar fechas en zona de empresa, turnos nocturnos y DST en backend; no
calcular rotaciones con UTC ni zona del navegador. Revisar dayjs/Intl/PostgreSQL
existentes antes de proponer librerías. Cambios estructurales requieren aprobación.

Transacciones y control de versión para aplicación masiva y carreras con citas;
auditoría por actor/empresa/alcance y motivos con privacidad adecuada. Las
consultas públicas no devuelven motivos internos. Preparar migraciones aditivas,
compatibilidad con datos previos y estrategia de reversión sin borrar datos.

## Pruebas y entregables

- Unitarias del calendario efectivo: turnos partidos, adyacentes, pausas,
  rotaciones A/B y N, desfase, ancla, cambio de año y día de descanso explícito.
- Integración SQL/HTTP en base aislada: alcance/roles, vigencias, concurrencia,
  citas afectadas, auditoría y compatibilidad con horarios actuales.
- DST Canarias y Madrid, noche entre días, rango de vacaciones inclusive en UI
  con fin exclusivo interno; verificar casos ambiguos/inexistentes acordados.
- Interfaz: operaciones por teclado, foco y etiquetas, filtros, móvil, color
  claro/oscuro, errores, recarga y cancelación. No depender solo del color.
- Ejecutar npm run check y E2E aplicables; registrar lo no probado. Playwright
  sigue en pausa hasta indicación del usuario; revisión global con skills al final.

Actualizar API reference, README público con funciones reales, roadmap, memoria
y changelog por cada entrega. Logos y otros bloques permanecen fuera del alcance.
Este borrador no incluye aprobación de paquetes, migraciones, commit o push.
