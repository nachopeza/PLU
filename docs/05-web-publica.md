# 05 · Web pública

El prototipo está en [`apps/web/public/prototipo-landing.html`](../apps/web/public/prototipo-landing.html). Se migrará a React manteniendo el diseño.

## Mapa del sitio

| Ruta | Contenido | Estado |
|---|---|---|
| `/` | Portada con el lema, resumen y llamadas a la acción | Prototipo |
| `/manifiesto` | Manifiesto fundacional completo | Prototipo (dentro de la portada) |
| `/principios` | Los 10 principios | Prototipo |
| `/democracia` | Democracia mixta: elecciones, iniciativa, referéndums, asambleas, digital | Prototipo |
| `/territorio` | Organización territorial y ficha de competencia | Prototipo |
| `/bienestar` | Los cuatro pilares: vivienda, sanidad, educación, transporte | Prototipo |
| `/gobierno` | Gobierno profesionalizado y esquema de áreas | Prototipo |
| `/organizacion` | Organización interna de la PLU | Prototipo |
| `/opina` | Los 7 dilemas, con deslizadores | Prototipo (demo, no guarda) |
| `/camino` | Hoja de ruta del movimiento | Prototipo |
| `/afiliate` | Formulario de afiliación | Por hacer |
| `/simpatizante` | Formulario de simpatizante | Por hacer |
| `/novedades` | Alta a novedades | Prototipo de formulario |
| `/verificar` | Verificación de carné | Por hacer |
| `/privacidad`, `/cookies`, `/aviso-legal` | Textos legales | Por redactar con asesoría |
| `/contacto` | Contacto | Por hacer |

## Formularios

- **Afiliación**: nombre, apellidos, correo, teléfono (opcional), fecha de nacimiento, país, código postal y población, territorio, foto (opcional). Consentimientos separados: tratamiento de datos para la afiliación y comunicaciones.
- **Simpatizante**: solo lo necesario (nombre, correo, territorio) y consentimiento de comunicaciones.
- **Novedades**: nombre, correo y consentimiento.
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
