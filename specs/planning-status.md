# Planes de funcionalidades pendientes

27/10: cuadrante completo implementado y probado con migraciones en base aislada;
ambas aplicadas después en desarrollo con autorización. Evidencia actual en
[verification-full.md](008-cuadrante-equipo/verification-full.md). Habilitación
en desarrollo completada con autorización de las migraciones; verificación de interfaz
y revisión global de textos/skills pendientes, sin commit/push.

27/10/2026: propuesta nueva pendiente de validación en
[cuadrante y colores](008-cuadrante-equipo/spec.md) y su
[plan](008-cuadrante-equipo/plan.md). Amplía el alcance de horarios/bloqueos a
plantillas, rotaciones y ausencias; no se ha implementado. El usuario ha
solicitado aprobar antes de aplicar.

Entrega 3A implementada y con controles automáticos correctos; evidencia y
pruebas pendientes en 003-asignaciones-horarios-bloqueos/verification-3a.md.

18/10/2026. Bloque 1 implementado en frontend tras «go» final; evidencia y
límites en 001-eliminar-catalogo/verification.md. Resto sin implementar.
El usuario ha dado «go»
a los puntos 2, 3, 4 y 7, y ha pedido ajustes en 1, 5 y 6.
Primero aprobar alcance/spec; después ajustar y aprobar plan/tareas antes de
ejecutar. Se entregan planes provisionales de todos los puntos porque el usuario
solicita valorarlos en conjunto. La aprobación de uno no aprueba los restantes.

| Orden | Especificación | Plan | Decisión destacada |
| --- | --- | --- | --- |
| 1 | [Eliminar catálogo](001-eliminar-catalogo/spec.md) | [Plan](001-eliminar-catalogo/plan.md) | Mantener bloqueo por referencias y suspensión como alternativa. |
| 2 | [Acciones de empleados](002-acciones-empleados/spec.md) | [Plan](002-acciones-empleados/plan.md) | Resolver reenvío; archivo de ficha no equivale a borrar cuenta. |
| 3 | [Asignaciones, horarios y bloqueos](003-asignaciones-horarios-bloqueos/spec.md) | [Plan](003-asignaciones-horarios-bloqueos/plan.md) | Tres entregas; definir tratamiento de servicio sin empleados. |
| 4 | [Usuarios y permisos /app](004-usuarios-permisos-app/spec.md) | [Plan](004-usuarios-permisos-app/plan.md) | Primera fase limitada a endpoints tenant existentes. |
| 5 | [2FA configurable](005-2fa-obligatorio/spec.md) | [Plan](005-2fa-obligatorio/plan.md) | Opcional; no imponer su activación. Confirmar si se desea conservar la opción de exigirlo. |
| 6 | [Mano de obra](006-precio-hora-mano-obra/spec.md) | [Plan](006-precio-hora-mano-obra/plan.md) | Tarifa opcional por servicio y categoría; definir herencia y cálculo. |
| 7 | [Accesibilidad y textos](007-accesibilidad-textos/spec.md) | [Plan](007-accesibilidad-textos/plan.md) | Nombre del buscador y mostrar/ocultar contraseña en español. |

Cada carpeta contiene tasks.md para registrar aprobaciones, implementación y
evidencia. Ninguna casilla se considera completada por escribir el plan.

## Decisiones para la valoración

1. Empleados: reenvío de invitación separado de recuperación de contraseña;
   no asumir que el endpoint invite sirve para usuarios ya vinculados.
2. Asignaciones: propuesta permitir configuración sin empleados si el contrato
   real lo admite y mostrar aviso de no reservable; validar regla al detallar 3A.
3. Usuarios: propuesta Configuración > Usuarios y permisos, de alcance organizativo.
   Sin añadir por defecto acciones exclusivas de plataforma.
4. Mano de obra: alcance confirmado por servicio y categoría. Propuesta para
   valorar: tarifa del servicio prevalece y, si queda vacía, hereda la categoría;
   sin ninguna tarifa, comportamiento actual. Falta decidir coste/precio,
   relación con importe actual, minutos cobrables, cero, redondeo e histórico.

## Ajustes solicitados al valorar los siete puntos

- 1: ante 409, ofrecer desactivar con confirmación; conservar referencias.
  Tanto servicio como categoría admiten isActive en backend. Desactivar categoría
  no implica desactivar automáticamente sus servicios; verificar efecto público.
- 2, 3, 4 y 7: «go» registrado como aprobación de alcance. Se mantienen las
  limitaciones técnicas descritas; ratificar el plan final antes de implementar.
- 5: 2FA opcional, sin activarlo ni imponerlo por defecto. Confirmar si el
  alcance es permitir activar/desactivar la exigencia por organización o
  mantenerlo exclusivamente voluntario para cada usuario.
- 6: tarifa opcional tanto por servicio como por categoría. La herencia anterior
  es propuesta, no decisión aprobada; no se implementa cálculo todavía.

## Cierre acordado

La revisión global de frontend con skills se hará después de estas funcionalidades.
Se mantienen las comprobaciones necesarias de cada cambio; no se declaran hechas
las verificaciones visuales o manuales que no se ejecuten. Playwright en pausa.
La subida y almacenamiento de logos queda para más adelante. No se autorizan
instalaciones, migraciones, commits ni push por el hecho de preparar estos planes.
