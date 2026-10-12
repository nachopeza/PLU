# 05 · Web pública

El prototipo está en [`apps/web/public/prototipo-landing.html`](../apps/web/public/prototipo-landing.html). Se migrará a React manteniendo el diseño.

## Enfoque de la web (decidido el 12 oct 2026)

Tras un análisis de marca, comunicación y UX, la web pasa de «presentación de ideas» a **invitación a participar**:

- **Posicionamiento**: movimiento ciudadano como idea principal («Una política que funcione para las personas») y reforma institucional como método (competencias claras, rendición de cuentas, participación con efecto real). El lema se mantiene, pero debajo de la propuesta.
- **No prometer resultados**: las propuestas se presentan como objetivos hasta tener medidas, coste y evaluación.
- **Tres estados** para cada contenido: principio definido, propuesta en desarrollo y decisión abierta a debate. Y distinguir lo que PLU ya hace de lo que se compromete a implantar.
- **Escala de participación**: entender, opinar, seguir (novedades), colaborar, incorporarse formalmente. Afiliarse es el último escalón, no la primera petición.
- **Imágenes**: pocas fotos. Diagramas de proceso, iconos y mapa; fotos propias solo cuando existan encuentros reales.
- **Título de hoja de ruta**: «De las ideas a una organización abierta y responsable» (no se proponen cambios constitucionales).
- Pendiente: probar la web con 5-10 personas que no conozcan PLU y medir comprensión, participación y confianza, no visitas.

## Orden de la portada (prototipo)

1. Portada: propuesta, dos botones y lema.
2. El problema y la promesa.
3. El proyecto y tres compromisos.
4. Principios definidos (10, en 4 familias).
5. Propuestas: los cuatro pétalos y la ficha de propuesta.
6. Democracia y participación, con recorrido de una propuesta.
7. Cómo funcionaría: competencias y responsables públicos.
8. Transparencia y garantías de PLU.
9. Debate abierto, con los tres estados.
10. Hoja de ruta.
11. Participa: escala de participación y formulario (solo correo y consentimiento).

## Mapa del sitio

| Ruta | Contenido | Estado |
|---|---|---|
| `/` | Portada, problema, propuestas y participa | Prototipo |
| `/propuestas` | Fichas de propuesta (vivienda, sanidad, educación, transporte, reformas) | Por desarrollar |
| `/democracia` | Mecanismos de participación y su efecto | Prototipo (dentro de la portada) |
| `/como-funciona` | Competencias, responsables públicos y funcionamiento interno de PLU | Prototipo (parte en la portada) |
| `/transparencia` | Compromisos, financiación, decisiones, canal de reclamaciones | Por hacer |
| `/debate` | Cuestiones abiertas con «Aportar mi opinión» y resumen de aportaciones | Prototipo (demo, no guarda) |
| `/participa` | Escala de participación y formularios | Prototipo de formulario |
| `/afiliate` | Formulario de afiliación | Por hacer |
| `/simpatizante` | Formulario de simpatizante | Por hacer |
| `/dona` | Información sobre donaciones voluntarias | Por decidir (ver [10](10-donaciones.md)) |
| `/privacidad`, `/cookies`, `/aviso-legal` | Textos legales | Por redactar con asesoría |
| `/contacto` | Contacto | Por hacer |

## Formularios

- **Afiliación**: nombre, apellidos, correo, teléfono (opcional), **DNI o NIE**, fecha de nacimiento (mínimo 16 años), código postal y población, **provincia** (residencia en España), foto para el carné. Consentimientos separados: tratamiento de datos para la afiliación y comunicaciones.
- **Simpatizante**: solo nombre, correo y provincia, y consentimiento para recibir avisos de campañas en la calle, encuestas y eventos. No crea cuenta.
- **Participa (novedades, idea, opinión, colaborar)**: solo correo y consentimiento, más el mensaje opcional. Se pide más información solo cuando hace falta.
- Casillas de consentimiento **sin marcar** por defecto, con el texto exacto versionado.
- Mensajes de error claros y accesibles. Nada de decir que se ha enviado algo si no se ha guardado.

## Diseño

- Verde `#209548` y negro `#1e1e1e` del logo. El logo se tiñe con el color del texto para funcionar en tema claro y oscuro.
- Tipografías: Bricolage Grotesque (títulos), Figtree (texto), DM Mono (etiquetas).
- Pétalos del trébol como metáfora de los cuatro pilares.
- Claro y oscuro, adaptable a móvil, con teclado y lectores de pantalla.

## Ideas para atraer a gente joven

Pendientes de decidir con el equipo. Ver [decisiones pendientes](09-decisiones-pendientes.md).

- Test de afinidad con la doctrina.
- Calculadora de costes: elegir prioridades y ver qué cuestan.
- Mapa interactivo de competencias por comunidad.
- Seguimiento público de compromisos.
- Contenido corto en vídeo en la portada.
- Asistente que responde dudas sobre la doctrina, siempre citando el documento.

## SEO y compartir

Títulos y descripciones por página, imagen para redes, `sitemap.xml`, `robots.txt` y datos estructurados de organización.
