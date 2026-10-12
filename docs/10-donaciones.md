# 10 · Donaciones

La afiliación a la PLU es **gratuita**. No hay cuota. Lo único que puede aportar dinero son las **donaciones voluntarias**.

## Qué se sabe

- Afiliarse y ser simpatizante no cuesta nada ni implica pagar.
- Donar es opcional y no da ningún privilegio dentro del movimiento: no cambia el rol, el voto en encuestas ni el acceso al portal.

## Lo que falta decidir

Las donaciones a un partido o movimiento político están reguladas (financiación de partidos, identificación de quien dona, límites, información a las autoridades). **Hay que confirmarlo con asesoría jurídica y contable antes de aceptar ningún euro.** Hasta entonces la web solo debería informar de que se están preparando.

- [ ] ¿Cómo se recibe el dinero? Transferencia, Bizum, tarjeta con una pasarela de pago, o varias.
- [ ] ¿La entidad que las recibe existe ya? Hoy la PLU no está constituida (fase 7 del documento general).
- [ ] ¿Se aceptan donaciones de personas que no son afiliadas?
- [ ] ¿Se piden datos de la persona (nombre, DNI) para poder emitir justificante?
- [ ] ¿Hay justificante o certificado de donación para la declaración de la renta?
- [ ] ¿Importe mínimo y máximo?
- [ ] ¿Se admiten donaciones periódicas o solo puntuales?
- [ ] ¿Quién ve los importes dentro de la intranet y con qué rol? Propuesta: un rol de tesorería aparte del gestor.
- [ ] ¿Se publican las cuentas y las donaciones recibidas? La doctrina de la PLU pide transparencia (ver sección 9 del documento general).

## Cómo encajaría en la plataforma

- Página pública `/dona` con la información y, cuando se decida, el método de pago.
- Tabla `donaciones` (todavía no está en el esquema): persona (opcional), importe, fecha, método, referencia externa del pago, estado y justificante.
- Si se usa una pasarela de pago, **la plataforma no guarda datos de tarjeta**: los gestiona la pasarela.
- Rol nuevo de **tesorería**, con acceso a donaciones y justificantes y sin acceso al resto de datos de personas.
- Informes de donaciones para la rendición de cuentas.
- Todo movimiento de dinero queda en la auditoría.
