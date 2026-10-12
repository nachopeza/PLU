# 03 · Roles y permisos

Hay dos mundos separados: **personas** (afiliados y simpatizantes, que usan el portal) y **equipo** (usuarios de la intranet, con rol).

## Personas (portal)

| | Simpatizante | Afiliado |
|---|---|---|
| Ver y editar su ficha | Sí | Sí |
| Recibir novedades | Sí | Sí |
| Carné | No | Sí |
| Responder encuestas abiertas a simpatizantes | Sí | Sí |
| Responder encuestas solo de afiliados | No | Sí |
| Solicitudes | Pedir ser afiliado, baja | Cambio de datos o territorio, duplicado de carné, certificado, baja |
| Historial de afiliación | Sí | Sí |

## Equipo (intranet)

| Capacidad | Admin | Gestor | Moderador | Coordinador | Verificador | Auditor |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Ver bandeja de inscripciones | ✔ | ✔ | | ✔ (su territorio) | | |
| Aprobar o rechazar inscripciones | ✔ | ✔ | | ✔ (su territorio) | | |
| Ver y editar personas | ✔ | ✔ | | ✔ (su territorio) | | |
| Suspender, reactivar, dar de baja | ✔ | ✔ | | ✔ (su territorio) | | |
| Resolver solicitudes | ✔ | ✔ | | ✔ (su territorio) | | |
| Crear y cerrar encuestas | ✔ | | ✔ | | | |
| Ver resultados agregados | ✔ | | ✔ | ✔ (su territorio) | | ✔ |
| Gestionar plantillas de carné | ✔ | ✔ | | | | |
| Verificar carnés (solo desde la intranet) | ✔ | ✔ | | | ✔ | |
| Enviar comunicaciones | ✔ | | ✔ | | | |
| Crear usuarios y asignar roles | ✔ | | | | | |
| Ver auditoría | ✔ | | | | | ✔ |
| Configuración | ✔ | | | | | |

## Reglas

1. Los permisos se comprueban **en el servidor**, en cada ruta. Ocultar un botón en la web no es una medida de seguridad.
2. El coordinador solo ve y toca personas de su `territorio_id`.
3. Ningún rol ve respuestas individuales de una encuesta anónima, ni siquiera el admin: el esquema no lo permite.
4. El auditor puede leer, nunca modificar.
5. Cada acción de escritura del equipo queda en `auditoria`.
6. El usuario maestro (admin) se define por variables de entorno. No hay contraseñas por defecto.
7. Principio de mínimo privilegio: en caso de duda, el rol menos potente.
8. No existe verificación pública de carnés. Cada verificación queda en auditoría.
9. Se prevé un rol de **tesorería** para las donaciones (ver [10](10-donaciones.md)).
