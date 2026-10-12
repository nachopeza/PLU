# 09 · Decisiones

Cada respuesta cierra una parte del diseño. Lo decidido está marcado y con su fecha.

## Decidido

- [x] **Verificación de afiliación no pública.** Solo desde la intranet, con una pantalla de verificación del QR del carné. (12 oct 2026)
- [x] **Contraseña generada automáticamente**, enviada por correo, con cambio obligatorio en el primer acceso. (12 oct 2026)
- [x] **No hay cuota.** La afiliación es gratuita y solo hay donaciones voluntarias, por **transferencia**. (12 oct 2026)
- [x] **Simpatizantes sin portal.** Solo reciben avisos de campañas en la calle, encuestas directas y eventos. (12 oct 2026)
- [x] **Requisitos para afiliarse:** mínimo 16 años y residir en España. (12 oct 2026)
- [x] **Se exige DNI** (o NIE). (12 oct 2026)
- [x] **Verificadores** para eventos y mítines con acceso libre o de prensa. La pantalla de verificación vive en la intranet. (12 oct 2026)
- [x] **Carné:** vale hasta que la persona se da de baja o caduca. Duración 5 años si tiene menos de 30 años y 10 si tiene 30 o más. Hay que solicitar la renovación. (12 oct 2026)
- [x] **Territorio por provincias** (52, con su comunidad). (12 oct 2026)
- [x] **La baja se solicita desde el portal.** (12 oct 2026)
- [x] **Doble verificación obligatoria para el equipo.** (12 oct 2026)
- [x] **Equipo de gestión** (varias personas, no una sola). (12 oct 2026)
- [x] **Número de afiliado corto**, con provincia: `28-482915` (28 = Madrid). Falta confirmar el formato exacto.

- [x] **Formulario de afiliación en 3 pasos** (datos, DNI y provincia, consentimientos). (12 oct 2026)
- [x] **El carné no lleva foto.** (12 oct 2026)
- [x] **Primero inscripción y bandeja de gestión con datos reales.** El correo se activa cuando haya dominio propio. (12 oct 2026)

## Pendiente por producto

- [ ] **Edad del carné**: la edad de 30 años, ¿se mira el día de la emisión o de la renovación? Propuesta: sí, ese día.
- [ ] **Aviso de caducidad**: cuántos días antes se avisa y qué pasa si no se renueva (pasa a «caducado» y sigue siendo afiliado, o causa baja).
- [ ] **16 y 17 años**: confirmar con asesoría si necesitan autorización de sus representantes legales.
- [ ] **DNI**: cómo se comprueba. Propuesta: el gestor valida el formato y la letra, y no se guarda foto del DNI.
- [ ] **NIE**: ¿se acepta para personas extranjeras que residen en España?
- [ ] **Eventos**: ¿se registra la asistencia al escanear el QR?
- [ ] **Prensa**: acreditaciones para periodistas, ¿quién las emite y cómo se verifican?
- [ ] **Provincia de afiliación**: ¿la de residencia o la que elija la persona? ¿Qué pasa al mudarse? Propuesta: la de residencia, y se cambia con una solicitud.
- [ ] **Agrupaciones locales** dentro de cada provincia (municipios o comarcas).
- [ ] **Encuestas directas a simpatizantes**: por enlace en el correo. ¿También por SMS o WhatsApp?
- [ ] **Quién envía avisos masivos** y cómo se da de baja una persona de los avisos.
- [ ] **Datos tras la baja**: cuánto tiempo se conservan.
- [ ] **Idiomas** de la web (lenguas cooficiales).
- [ ] **Votaciones internas vinculantes**: ¿se quieren más adelante?

## Donaciones

Ver [10 · Donaciones](10-donaciones.md).

- [ ] Entidad receptora e IBAN, justificantes, límites, conciliación y transparencia de las cuentas.

## Visión y tono

- [ ] Público objetivo: edad y perfil.
- [ ] Plataforma principal: web, móvil, redes.
- [ ] Tono: cercano, serio o mixto. Referencias que gusten.
- [ ] Estilo visual: mantener el actual o más atrevido.
- [ ] Formato de contenido: vídeo corto, newsletter, podcast.
- [ ] Ideas innovadoras a priorizar: test de afinidad, calculadora de costes, seguimiento de promesas, asamblea ciudadana digital, mapa de competencias, asistente de IA.
- [ ] Quién escribe y publica los contenidos.

## Legal y organización

- [ ] Entidad jurídica y responsable del tratamiento de datos.
- [ ] Constitución formal (fase 7 del documento general) y su efecto en el registro de afiliados.
- [ ] Revisión del nombre, siglas y lema (disponibilidad jurídica y registral).
- [ ] Textos legales: privacidad, cookies, aviso legal.
- [ ] Banner de cookies: solo si se usan analíticas u otras cookies no necesarias.

## Técnicas

- [ ] Hosting y región (Railway como en IDENTIA, u otro). Recomendación: servidores en la Unión Europea.
- [ ] Dominio y correo propios (necesario para enviar el carné y las contraseñas a cualquier persona).
- [ ] Política de copias de seguridad.
- [ ] Cuándo pasar de SQLite a PostgreSQL.
