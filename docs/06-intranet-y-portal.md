# 06 · Portal del afiliado e intranet de gestión

Las dos zonas son privadas y comparten API. Su estructura se basa en IDENTIA, que tiene un portal para la persona y una intranet con roles para el equipo.

## Portal del afiliado (`/portal`)

Para afiliados y simpatizantes. Cada persona solo ve lo suyo.

| Módulo | Qué hace |
|---|---|
| Inicio | Estado de su afiliación, avisos y encuestas abiertas |
| Mi ficha | Ver y pedir cambios de sus datos |
| Mi carné | Ver y descargar el carné vigente (solo afiliados) |
| Encuestas | Listado de encuestas abiertas para ella, y responder |
| Solicitudes | Crear y seguir solicitudes: cambio de datos o territorio, duplicado de carné, certificado, baja, hacerse afiliado |
| Mi historial | Movimientos de afiliación: alta, cambios, suspensiones |
| Novedades | Comunicados del movimiento |
| Privacidad | Qué ha consentido, descargar sus datos, pedir su supresión |

Acceso: con el correo y una contraseña que genera el sistema y llega por correo. Al entrar la primera vez hay que elegir una nueva (ver [04](04-afiliacion-y-carne.md)).

## Intranet de gestión (`/intranet`)

Para el equipo. Lo que se ve depende del rol (ver [roles y permisos](03-roles-y-permisos.md)).

| Módulo | Qué hace | Roles |
|---|---|---|
| Inicio | Pendientes: inscripciones, solicitudes abiertas, encuestas por cerrar | Todos los de gestión |
| Inscripciones | Bandeja de pendientes. Aprobar o rechazar, con motivo | Admin, Gestor, Coordinador |
| Personas | Buscar, ver y editar afiliados y simpatizantes. Suspender, reactivar, baja | Admin, Gestor, Coordinador |
| Movimientos | Historial completo de movimientos de afiliación, con filtros | Admin, Gestor, Coordinador, Auditor |
| Solicitudes | Bandeja de solicitudes y su resolución | Admin, Gestor, Coordinador |
| Encuestas | Crear, publicar, cerrar y ver resultados agregados | Admin, Moderador |
| Plantillas de carné | Subir plantillas PDF por territorio, activarlas, probarlas | Admin, Gestor |
| Verificar carné | Escanear el QR o escribir el número. Muestra válido, caducado, revocado o inexistente y los datos mínimos. Queda en auditoría. **Es la única forma de verificar** | Admin, Gestor, Verificador |
| Comunicaciones | Enviar avisos y novedades a grupos (afiliados, simpatizantes, un territorio) | Admin, Moderador |
| Territorios | Ver y mantener la lista de territorios | Admin |
| Usuarios y roles | Crear cuentas del equipo y asignar rol | Admin |
| Auditoría | Registro de acciones sobre datos | Admin, Auditor |
| Configuración | Datos de la organización, textos legales, correo | Admin |

## Estados y pantallas clave

- **Bandeja de inscripciones**: tabla con nombre, territorio, tipo, fecha y foto. Acciones rápidas aprobar o rechazar; el rechazo pide motivo.
- **Ficha de persona**: datos, estado, historial, carnés emitidos, solicitudes, consentimientos.
- **Resultados de encuesta**: gráficos agregados. En encuestas anónimas no hay forma de ver respuestas individuales.

## Pendientes de producto

- Campana de alertas con lo pendiente, en lugar de depender de la pantalla de inicio.
- Cambio de contraseña por la propia persona desde el portal.
- Exportaciones (CSV) con control de permisos y registro en auditoría.
- Mensajes entre la persona y el gestor dentro de una solicitud.
