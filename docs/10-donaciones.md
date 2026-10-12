# 10 · Donaciones

La afiliación a la PLU es **gratuita**. No hay cuota. Lo único que puede aportar dinero son las **donaciones voluntarias**, que se reciben **por transferencia bancaria**.

## Qué se sabe

- Afiliarse y ser simpatizante no cuesta nada.
- Donar es opcional y no da ningún privilegio: no cambia el rol, el voto en encuestas ni el acceso.
- El método es la **transferencia**. No hay pasarela de pago ni tarjeta, así que la plataforma **no maneja datos bancarios de nadie**.

## Cómo funcionaría

1. La web (`/dona`) muestra el IBAN de la entidad receptora, el concepto sugerido y un texto claro de que es voluntario.
2. La persona hace la transferencia desde su banco.
3. **Tesorería** revisa el extracto bancario y registra cada donación en la intranet: quién, cuánto, cuándo y referencia.
4. Si hace falta justificante, tesorería lo genera desde la ficha de la donación.
5. Todo queda en la auditoría.

La tabla `donaciones` ya existe en el esquema (importes en céntimos, estado pendiente, confirmada o rechazada, justificante).

## Lo que falta decidir

Las donaciones a un partido o movimiento político están reguladas (financiación de partidos, identificación de quien dona, límites, información a las autoridades). **Hay que confirmarlo con asesoría jurídica y contable antes de aceptar ningún euro.** Hasta entonces la web no debería mostrar ningún IBAN.

- [ ] ¿Qué entidad recibe las donaciones? Hoy la PLU no está constituida (fase 7 del documento general) y necesita su propia cuenta bancaria.
- [ ] ¿Se aceptan donaciones de personas que no son afiliadas?
- [ ] ¿Qué datos hay que pedir a quien dona para poder identificarlo y justificar la donación?
- [ ] ¿Hay justificante o certificado de donación para la declaración de la renta?
- [ ] ¿Importe mínimo y máximo?
- [ ] ¿Quién hace la conciliación y cada cuánto?
- [ ] ¿Se publican las cuentas y las donaciones recibidas? La doctrina de la PLU pide transparencia (sección 9 del documento general).
