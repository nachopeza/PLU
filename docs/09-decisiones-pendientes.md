# 09 · Decisiones

Cada respuesta cierra una parte del diseño. Lo decidido está marcado y con su fecha.

## Decidido

- [x] **La verificación de afiliación no es pública.** Solo se hace desde la intranet, con sesión de equipo. (12 oct 2026)
- [x] **Contraseña generada automáticamente**, enviada por correo, con cambio obligatorio en el primer acceso. (12 oct 2026)
- [x] **No hay cuota.** La afiliación es gratuita y solo hay donaciones voluntarias. (12 oct 2026)
- [x] **Número de afiliado más corto y simple que el de IDENTIA** y que identifique. Propuesta: `09-482915`, ver [04](04-afiliacion-y-carne.md). Falta confirmar el formato exacto.

## Producto

- [ ] **Nombres de las áreas**: propuesta `/portal` (afiliados y simpatizantes) e `/intranet` (equipo).
- [ ] **Quién puede afiliarse**: edad mínima, residencia, nacionalidad.
- [ ] **Simpatizante frente a afiliado**: qué puede hacer cada uno, si los simpatizantes tienen cuenta y portal, y si votan en encuestas.
- [ ] **Verificación de identidad**: ¿basta el correo y la aprobación del gestor, o se pide DNI/NIE? Pedirlo aumenta mucho la responsabilidad sobre los datos.
- [ ] **Duración del carné**: anual, bianual, indefinido. Y qué pasa al caducar.
- [ ] **Caducidad de la contraseña temporal**: propuesta 7 días.
- [ ] **Territorios**: ¿solo comunidades autónomas o también provincia y municipio desde el principio?
- [ ] **Idiomas** de la web (lenguas cooficiales).
- [ ] **Votaciones internas vinculantes**: ¿se quieren más adelante (elegir cargos, aprobar estatutos)? Es otro nivel de exigencia.
- [ ] **Foto en el carné**: obligatoria, opcional o ninguna.
- [ ] **Doble verificación (2FA) para el equipo**: recomendada para gestores y admins, porque ven datos de afiliación.
- [ ] **Baja**: ¿se da de baja la persona sola desde el portal, o la solicita y la tramita un gestor?
- [ ] **Datos tras la baja**: cuánto tiempo se conservan.

## Donaciones

Ver [10 · Donaciones](10-donaciones.md).

- [ ] Método de cobro, justificantes, límites, rol de tesorería, transparencia de las cuentas.

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

- [ ] Hosting y región (Railway como en IDENTIA, u otro).
- [ ] Dominio y correo propios (necesario para enviar el carné y las contraseñas a cualquier persona).
- [ ] Política de copias de seguridad.
- [ ] Cuándo pasar de SQLite a PostgreSQL.
