# 03 · Roles y permisos

Hay dos mundos separados: **personas** (afiliados y simpatizantes) y **equipo** (usuarios de la intranet, con rol).

## Personas

| | Simpatizante | Afiliado |
|---|---|---|
| Cuenta y portal | **No** | Sí (`/portal`) |
| Contraseña | No | Sí, generada por el sistema y cambiada en el primer acceso |
| Avisos por correo: campañas en la calle, eventos | Sí | Sí |
| Encuestas | Directas, con enlace de un solo uso por correo | En el portal |
| Carné | No | Sí |
| Ficha, historial, solicitudes | No | Sí |

Un simpatizante que quiera afiliarse vuelve a rellenar el formulario de afiliación con el mismo correo y queda registrado como un cambio de tipo.

## Equipo (intranet)

| Capacidad | Admin | Gestor | Moderador | Coordinador provincial | Verificador | Tesorería | Auditor |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Ver bandeja de inscripciones | ✔ | ✔ | | ✔ (su provincia) | | | |
| Aprobar o rechazar inscripciones | ✔ | ✔ | | ✔ (su provincia) | | | |
| Ver y editar personas | ✔ | ✔ | | ✔ (su provincia) | | | |
| Ver el documento de identidad completo | ✔ | ✔ | | | | | |
| Suspender, reactivar, dar de baja | ✔ | ✔ | | ✔ (su provincia) | | | |
| Resolver solicitudes (baja, renovación, cambio de datos o provincia) | ✔ | ✔ | | ✔ (su provincia) | | | |
| Crear y cerrar encuestas | ✔ | | ✔ | | | | |
| Ver resultados agregados | ✔ | | ✔ | ✔ (su provincia) | | | ✔ |
| Gestionar plantillas de carné | ✔ | ✔ | | | | | |
| Verificar carnés (pantalla de verificación) | ✔ | ✔ | | | ✔ | | |
| Enviar comunicaciones y avisos | ✔ | | ✔ | | | | |
| Gestionar eventos | ✔ | | ✔ | ✔ (su provincia) | | | |
| Ver y registrar donaciones | ✔ | | | | | ✔ | |
| Crear usuarios y asignar roles | ✔ | | | | | | |
| Ver auditoría | ✔ | | | | | | ✔ |
| Configuración | ✔ | | | | | | |

## Reglas

1. Los permisos se comprueban **en el servidor**, en cada ruta. Ocultar un botón en la web no es una medida de seguridad.
2. El coordinador provincial solo ve y toca personas de su provincia (`territorio_id`).
3. Ningún rol ve respuestas individuales de una encuesta anónima, ni siquiera el admin: el esquema no lo permite.
4. El auditor puede leer, nunca modificar.
5. Cada acción de escritura del equipo queda en `auditoria`.
6. El usuario maestro (admin) se define por variables de entorno. No hay contraseñas por defecto.
7. Principio de mínimo privilegio: en caso de duda, el rol menos potente.
8. **Doble verificación obligatoria** (app autenticadora) para todo el equipo. Es lo que más protege, porque el equipo ve datos de afiliación.
9. No existe verificación pública de carnés. Cada verificación queda en auditoría.
10. Tesorería ve donaciones y justificantes, y **no** ve el resto de datos de las personas.
11. El número completo del DNI/NIE solo lo ven admin y gestor. Los demás roles ven una versión parcial (por ejemplo `****123A`).
