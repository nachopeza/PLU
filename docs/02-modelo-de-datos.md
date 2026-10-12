# 02 · Modelo de datos

El esquema ejecutable está en [`apps/api/src/schema.sql`](../apps/api/src/schema.sql). Este documento explica las decisiones.

```mermaid
erDiagram
  territorios ||--o{ personas : "pertenece a"
  territorios ||--o{ territorios : "contiene"
  personas ||--o{ consentimientos : "otorga"
  personas ||--o{ movimientos_afiliacion : "historial"
  personas ||--o{ carnes : "recibe"
  personas ||--o{ solicitudes : "envía"
  personas ||--o{ participaciones : "participa"
  usuarios_intranet ||--o{ movimientos_afiliacion : "registra"
  usuarios_intranet ||--o{ solicitudes : "resuelve"
  usuarios_intranet ||--o{ encuestas : "crea"
  plantillas_carne ||--o{ carnes : "usa"
  encuestas ||--o{ preguntas : "tiene"
  encuestas ||--o{ participaciones : "registra"
  preguntas ||--o{ respuestas : "recibe"
```

## Tablas

| Tabla | Qué guarda |
|---|---|
| `territorios` | 19 comunidades y ciudades autónomas y **52 provincias** con su código INE, precargadas. Cada provincia cuelga de su comunidad (`padre_id`). La persona pertenece a una provincia |
| `personas` | Simpatizantes y afiliados en la misma tabla. Cambian `tipo` y `estado`. Solo los afiliados tienen contraseña |
| `consentimientos` | Qué aceptó cada persona, con qué versión de texto y cuándo |
| `usuarios_intranet` | Equipo con rol. Los afiliados **no** están aquí |
| `movimientos_afiliacion` | Historial inmutable: inscripción, alta, cambio de tipo o territorio, suspensión, reactivación, baja, rechazo |
| `plantillas_carne` | Plantillas PDF, generales o por territorio |
| `carnes` | Carnés emitidos con versión, caducidad y revocación |
| `solicitudes` | Peticiones de la persona desde el portal y su resolución |
| `encuestas`, `preguntas` | Definición de encuestas |
| `participaciones` | Quién participó en cada encuesta, para impedir doble respuesta |
| `respuestas` | Qué se respondió |
| `enlaces_encuesta` | Enlaces de un solo uso para encuestas directas a simpatizantes |
| `donaciones` | Donaciones recibidas por transferencia, registradas por tesorería |
| `sesiones` | Sesiones de persona y de equipo |
| `auditoria` | Acciones del equipo sobre datos |
| `correos` | Registro de correos enviados |

## Estados de una persona

`pendiente` → `activo` → `suspendido` ↔ `activo` → `baja`. Desde `pendiente` también se puede pasar a `rechazado`.

Cada cambio escribe una fila en `movimientos_afiliacion` con quién lo hizo, cuándo y por qué.

## Encuestas anónimas

Si una encuesta es anónima, `respuestas.persona_id` queda vacío y la lista de quién participó está en `participaciones`, sin ninguna columna que apunte a las respuestas. Así nadie puede reconstruir quién respondió qué, ni siquiera con acceso a la base de datos.

Si la encuesta es nominal (`anonima = 0`), se guarda `persona_id` en cada respuesta. Hay que avisarlo claramente a quien la responde.

> Una votación interna vinculante (por ejemplo elegir cargos) es otro problema y requiere un diseño propio: censo, secreto del voto, auditoría y encaje con los estatutos. No está en este esquema.

## Número de afiliado y código de verificación

- `numero_afiliado`: 8 cifras sin guion. Las 2 primeras son el código INE de la provincia (`territorios.codigo_num`) y las 6 siguientes son aleatorias y únicas. Se muestra como `28-482915`. Ver [04](04-afiliacion-y-carne.md).
- `codigo_verificacion`: cadena aleatoria larga que va en el QR. No se deduce del número ni de los datos de la persona.

## Documento de identidad

Se exige DNI o NIE para afiliarse. `documento_cifrado` guarda el número **cifrado** (AES-GCM, con la clave en una variable de entorno y fuera de la base de datos) y `documento_hash` guarda un HMAC con clave para impedir duplicados sin descifrar. No se guarda ninguna imagen del documento.

## Contraseñas

`password_hash` guarda solo el hash y solo existe para afiliados (los simpatizantes no tienen cuenta). `debe_cambiar_password` vale 1 mientras la persona use la contraseña temporal que se le envió por correo, y `password_temporal_expira_en` marca cuándo caduca. Al cambiarla, la primera pasa a 0 y la segunda se vacía.

## Datos que todavía no se guardan

- Eventos y asistencia: pendiente de decidir si se registra la asistencia al verificar. Ver [decisiones](09-decisiones-pendientes.md).
- Acreditaciones de prensa.
- Votaciones internas.
