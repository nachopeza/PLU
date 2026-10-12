# 07 · Privacidad y seguridad

> Este documento no es asesoramiento jurídico. Antes de recoger datos reales hay que revisarlo con una persona especializada en protección de datos y en la normativa de partidos políticos y asociaciones.

## Por qué importa tanto

La afiliación a un partido o movimiento político revela opiniones políticas. En el RGPD (art. 9) las opiniones políticas son una **categoría especial de datos**, con una protección reforzada. Una filtración tendría un daño mucho mayor que la de una lista de correo normal.

## Lo que hay que resolver antes de publicar

- [ ] **Responsable del tratamiento**: quién es, con qué entidad jurídica. Hoy la PLU no está constituida (fase 7 del documento general).
- [ ] **Base jurídica y consentimiento**: consentimiento explícito, separado por finalidad (afiliación, novedades, participación), con versión del texto guardada.
- [ ] **Registro de actividades de tratamiento** y, si procede, **evaluación de impacto**.
- [ ] **Delegado de protección de datos** si corresponde.
- [ ] **Textos legales**: política de privacidad, cookies y aviso legal.
- [ ] **Registro de afiliados** conforme a la normativa de partidos, una vez constituida la organización.
- [ ] **Donaciones**: normativa de financiación de partidos, identificación de quien dona y justificantes (ver [10](10-donaciones.md)).
- [ ] **16 y 17 años**: la edad mínima para afiliarse es 16. Confirmar con asesoría si necesitan autorización de sus representantes y cómo se trata su consentimiento.
- [ ] **Conservación**: cuánto tiempo se guardan los datos tras la baja.
- [ ] **Encargados del tratamiento**: contratos con el hosting y el servicio de correo, y dónde están los servidores.

## Derechos de las personas

Acceso, rectificación, supresión, limitación, oposición y portabilidad. El portal debe permitir ejercerlos sin tener que escribir un correo: ver sus datos, descargarlos, corregirlos y pedir la baja o la supresión.

## Medidas técnicas

| Medida | Cómo |
|---|---|
| Datos fuera de git | `apps/api/data/` y `.env` en `.gitignore` |
| Mínimo de datos | Pedir solo lo necesario. Lo opcional, marcado como opcional |
| Contraseñas | Hash robusto (scrypt o argon2). Nunca en claro |
| Sesiones | Cookie `httpOnly`, `secure` y `sameSite`; caducidad y cierre en todos los dispositivos |
| Permisos | Comprobados en el servidor, mínimo privilegio, coordinadores limitados a su territorio |
| Documento de identidad | DNI o NIE **cifrado** en la base de datos, clave fuera de ella, hash con clave para detectar duplicados, sin imagen del documento y visible solo para admin y gestor |
| Doble verificación | Obligatoria para todo el equipo (app autenticadora y códigos de recuperación) |
| Simpatizantes | Sin cuenta ni contraseña: menos datos y menos superficie de ataque |
| Contraseña temporal | Aleatoria, un solo uso, caduca, cambio obligatorio al entrar y aviso en el correo de que no se comparta |
| Límite de intentos | En login, olvido de contraseña, verificación de carné e inscripciones |
| Verificación de carné | Solo con sesión de equipo y registrada en auditoría. No hay verificación pública |
| Auditoría | Quién hizo qué sobre datos de personas, y cuándo |
| Encuestas anónimas | Esquema que impide enlazar respuesta y persona |
| Copias de seguridad | Cifradas, probadas y con política de retención |
| Cifrado en tránsito | Solo HTTPS |
| Secretos | Solo por variables de entorno. Nada por defecto |
| Ficheros subidos | Validar tipo y tamaño, no servirlos desde una ruta pública adivinable |
| Correo | Dominio propio con SPF, DKIM y DMARC |
| Registros (logs) | Sin datos personales innecesarios |
| Dependencias | Revisión periódica de vulnerabilidades |

## Brechas de seguridad

Debe existir un procedimiento escrito: quién decide, cómo se contiene, y cómo y cuándo se avisa a la autoridad de control y a las personas afectadas (el RGPD fija un plazo de 72 horas para notificar a la autoridad cuando proceda).

## Lo que la plataforma no debe hacer

- Decir que un carné es un documento oficial de identidad.
- Mostrar públicamente nombres de afiliados.
- Exportar listas sin control de permisos y sin dejar registro.
- Guardar el sentido del voto o de la respuesta de una persona en encuestas anónimas.
- Usar los datos de afiliación para algo distinto de lo consentido.
