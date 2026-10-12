# 04 · Afiliación y carné

Es la columna vertebral del área privada. Se basa en el flujo de IDENTIA (inscripción, aprobación, carné con QR, portal y roles), con estas decisiones propias de la PLU:

- **La afiliación es gratuita.** No hay cuota. Solo hay donaciones voluntarias (ver [10 · Donaciones](10-donaciones.md)).
- **No hay verificación pública de carnés.** Solo se verifica desde la intranet, con sesión de equipo.
- **Los simpatizantes no tienen portal.** Solo reciben avisos por correo.
- **Requisitos:** mínimo 16 años, residir en España y DNI o NIE.
- **El territorio es la provincia.**
- **La contraseña la genera el sistema**, se envía por correo y hay que cambiarla en el primer acceso.

## Flujo

```mermaid
sequenceDiagram
  actor P as Persona
  participant W as Web pública
  participant API as API
  actor G as Gestor
  participant M as Correo

  P->>W: Rellena el formulario (afiliado o simpatizante)
  W->>API: POST /api/inscripciones (datos + consentimientos)
  API-->>P: Confirmación. Estado: pendiente
  G->>API: Revisa la bandeja y aprueba
  API->>API: Asigna número de afiliado y código de verificación
  API->>API: Crea la cuenta con contraseña temporal
  API->>API: Genera el carné PDF con QR
  API->>M: Envía carné y contraseña temporal
  P->>API: Entra al portal con la contraseña temporal
  API-->>P: Obliga a elegir una contraseña nueva
  P->>API: Descarga su carné cuando quiera
```

## Tipos y estados

- **Simpatizante**: se apunta con datos básicos (nombre, correo y provincia). No tiene carné, ni cuenta, ni portal, ni contraseña. Recibe por correo avisos de campañas en la calle, encuestas directas (enlace de un solo uso) y eventos.
- **Afiliado**: miembro con número de afiliado, carné, cuenta y portal.
- Un simpatizante que quiere afiliarse **vuelve a rellenar el formulario de afiliación con el mismo correo**: queda como cambio de tipo en su historial.
- Estados: `pendiente`, `activo`, `suspendido`, `baja`, `rechazado`.

## Requisitos para afiliarse

- **Edad mínima: 16 años.** La API la comprueba con la fecha de nacimiento. Está pendiente de confirmar con asesoría si los de 16 y 17 años necesitan autorización de sus representantes.
- **Residir en España.**
- **DNI o NIE.** Se valida el formato y la letra. El número se guarda **cifrado** y no se guarda ninguna foto del documento. Un hash con clave impide afiliar dos veces el mismo documento sin tener que descifrarlo.
- **Provincia**: la de residencia, de entre las 52 provincias.
- Consentimientos explícitos y separados.

## Contraseña

1. Al aprobar a una persona se crea su cuenta con una **contraseña temporal aleatoria** (12 caracteres, sin letras ambiguas como `O`, `0`, `l`, `1`).
2. Se guarda solo el hash (scrypt), nunca la contraseña. La persona la recibe por correo junto con el carné.
3. La contraseña temporal **caduca** (propuesta: 7 días) y solo sirve para el primer acceso.
4. Al entrar con ella, el portal **no deja ver nada** hasta que la persona elige una nueva (mínimo 10 caracteres y distinta de la temporal).
5. «He olvidado mi contraseña» genera otra temporal y la envía al correo de la cuenta. La respuesta de la web es siempre la misma exista o no el correo, y se limita el número de peticiones.
6. Cada cambio de contraseña cierra las demás sesiones abiertas.

Esto es lo que se pidió. Como el correo no es un canal seguro, las medidas de caducidad, un solo uso y cambio obligatorio son las que reducen el riesgo.

## Movimientos de afiliación

Cada cambio queda registrado y no se borra:

| Movimiento | Cuándo |
|---|---|
| `inscripcion` | La persona envía el formulario |
| `alta` | El gestor aprueba y la persona pasa a activa |
| `cambio_tipo` | Simpatizante a afiliado, o al revés |
| `cambio_territorio` | Cambia de territorio |
| `suspension` / `reactivacion` | Suspensión y vuelta a activo |
| `baja` | Baja voluntaria o de oficio |
| `rechazo` | Inscripción rechazada |

La persona ve su propio historial en el portal.

## Número de afiliado

Inspirado en el de IDENTIA (`A-00.000.000`: letra de control, comunidad y 6 cifras), pero más corto, sin letra y con la **provincia**:

```
28-482915
│  └──── 6 cifras aleatorias, únicas dentro de la provincia
└─────── código INE de la provincia (28 = Madrid)
```

- **Provincia**: el código oficial del INE (01 Araba/Álava ... 50 Zaragoza, 51 Ceuta, 52 Melilla). Está en `territorios.codigo_num`. El número ya dice de dónde es.
- **Cifras**: aleatorias, no correlativas, para que no revelen cuánta gente hay ni en qué orden se afilió. Se comprueba que no exista.
- **Capacidad**: un millón por provincia.
- En la base de datos se guarda sin guion (`28482915`); en pantalla y en el carné, con guion.
- Si una persona cambia de provincia, **conserva su número**: el prefijo es el de la provincia de alta.
- **Propuesta, pendiente de confirmar.**

Aparte, cada persona tiene un `codigo_verificacion` aleatorio largo, que es lo que lleva el QR. No se deduce del número de afiliado.

## Carné

### Campos de la plantilla PDF

Igual que en IDENTIA, el motor rellena **campos de formulario PDF por nombre**, no por coordenadas. Una plantilla diseñada en Illustrator y preparada en Acrobat Pro debe tener estos campos:

| Campo | Tipo | Contenido |
|---|---|---|
| `nombre` | Texto | Nombre |
| `apellidos` | Texto | Apellidos |
| `numeroAfiliado` | Texto | Número de afiliado, con guion |
| `territorio` | Texto | Territorio |
| `fechaAlta` | Texto | DD/MM/AAAA |
| `validoHasta` | Texto | DD/MM/AAAA |
| `qr` | Botón (imagen) | QR hacia la verificación de la intranet |

**El carné no lleva foto** (decidido el 12 oct 2026). Al verificar, la pantalla de la intranet comprueba nombre, número, provincia y estado; la persona se identifica con su documento oficial.

Un campo ausente se ignora sin romper el resto. Una plantilla general sirve para todos los territorios; se pueden añadir plantillas por territorio (`plantillas_carne.territorio_id`).

### Vida del carné

- Se emite al activar a un afiliado y se envía por correo.
- Se guarda cada versión en `carnes`. Reemitir crea una versión nueva y **revoca** la anterior.
- **Vigencia**: el carné vale hasta que la persona se da de baja o hasta que caduca.
  - **5 años** si la persona tiene menos de 30 años el día de la emisión.
  - **10 años** si tiene 30 o más.
  - `carnes.valido_hasta` guarda la fecha.
- **Renovación**: la persona la solicita desde el portal (solicitud `renovacion_carne`). Al aprobarla se emite un carné nuevo y se vuelve a calcular la vigencia con su edad ese día. Un aviso por correo se envía antes de la caducidad.
- Un carné revocado o caducado aparece como no válido al verificarlo.
- **Baja**: la persona la solicita desde el portal (solicitud `baja`) y un gestor la tramita. Al darse de baja el carné se revoca.

### Verificación (solo intranet)

No existe una página pública para comprobar carnés. La verificación se hace en una **pantalla de la intranet**, pensada para usarse con el móvil en **eventos y mítines**, tanto en la entrada de acceso libre como en la de prensa:

1. Un verificador, gestor o admin inicia sesión en `/intranet` (con doble verificación).
2. Abre la pantalla **Verificar carné** y escanea el QR con la cámara, o escribe el número de afiliado.
3. La pantalla muestra, en grande y con color, si el carné es **válido** (verde), **caducado**, **revocado** o **inexistente** (rojo).
4. Si es válido, enseña lo mínimo para comprobar a la persona: **nombre, número de afiliado, provincia y estado**. Nada de teléfono, correo ni documento.
5. Cada verificación queda en `auditoria` con quién la hizo y cuándo.

El QR contiene una dirección de la intranet con el código aleatorio. Quien lo escanee sin sesión de equipo solo ve la pantalla de inicio de sesión: la dirección no revela ningún dato personal.

**Eventos y prensa (por definir)**: si se quiere registrar la asistencia a cada evento, o emitir acreditaciones para periodistas, hará falta un módulo de eventos. Ver [decisiones](09-decisiones-pendientes.md).

### Seguridad del carné

- El carné no sustituye a un documento oficial de identidad. Debe decirlo claramente.
- Se limita el número de intentos de verificación por sesión.
- Los datos que ve un verificador dependen de su rol.

## Ideas para después

- Carné en la cartera del móvil (Apple Wallet y Google Wallet).
- Exportación también en PNG.
- Renovación automática con aviso por correo.
