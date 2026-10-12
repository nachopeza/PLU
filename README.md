# PLU — Plataforma Liberal Unida

> La libertad de las personas. La identidad de los territorios. El bienestar de todos.

Repositorio de la plataforma digital de la PLU. Tiene dos grandes partes:

1. **Web pública**: información del movimiento (manifiesto, principios, democracia, territorio, bienestar...) y formularios para afiliarse, hacerse simpatizante o recibir novedades.
2. **Área privada**: un **portal** para afiliados y simpatizantes (carné, encuestas, solicitudes, historial de afiliación) y una **intranet de gestión** para el equipo (inscripciones, personas, movimientos, plantillas de carné, verificación, usuarios y roles).

La estructura técnica se basa en el proyecto IDENTIA: monorepo con `apps/web` y `apps/api`, roles en la intranet, carné en PDF con QR y envío por correo.

> Estado: **fase de construcción inicial**. El nombre, las siglas y el lema son provisionales. Ya funcionan: la inscripción de afiliados (guarda la solicitud con el DNI cifrado), el acceso del equipo a la intranet con doble verificación y la bandeja para aprobar o rechazar. Todavía no: envío de correo, carné PDF, portal del afiliado, encuestas.

## Estructura

```
plu/
  README.md
  docs/                          Documentación de producto y técnica (empieza por aquí)
    00-documento-general-del-movimiento.md
    01-arquitectura.md
    02-modelo-de-datos.md
    03-roles-y-permisos.md
    04-afiliacion-y-carne.md
    05-web-publica.md
    06-intranet-y-portal.md
    07-rgpd-y-seguridad.md
    08-hoja-de-ruta.md
    09-decisiones-pendientes.md
    10-donaciones.md
  apps/
    web/                         Web pública + portal + intranet (por construir: React + TypeScript + Vite + Tailwind)
      public/
        prototipo/               Web de varias páginas (inicio, proyecto, propuestas, afiliación, intranet...)
        prototipo-landing.html   Primer prototipo de una sola página
        brand/logo-plu.png       Logo original
    api/                         API (Express + node:sqlite)
      src/server.js              Servidor: API, intranet y la web de prototipo
      src/rutas-publicas.js      Inscripciones y simpatizantes
      src/rutas-intranet.js      Acceso del equipo (2FA) y bandeja de inscripciones
      src/seguridad.js           Cifrado, contraseñas, TOTP
      src/db.js                  Abre la base de datos y crea las tablas
      src/schema.sql             Esquema inicial (personas, movimientos, carnés, solicitudes, encuestas...)
```

## Arrancarlo en local (macOS)

Necesitas **Node 22.10 o superior** (`node -v` te dice cuál tienes). Abre la app Terminal:

```bash
# 1. Entra en la carpeta de la API (ajusta la ruta si clonaste en otro sitio)
cd ~/Documents/GitHub/plu/apps/api

# 2. Instala las dependencias (solo la primera vez)
npm install

# 3. Crea tu archivo de configuración (solo la primera vez) y ábrelo para editarlo
cp .env.example .env
open -e .env
```

En `.env` rellena **solo** estas dos líneas con tus propios valores (la contraseña, de al menos 12 caracteres, no la compartas ni la subas a git):

```
PLU_ADMIN_USERNAME=el-usuario-que-quieras
PLU_ADMIN_PASSWORD=una-contraseña-larga-y-única
```

```bash
# 4. Arranca la API en modo desarrollo (se reinicia sola al guardar cambios)
npm run dev
```

Cuando veas `PLU API escuchando en http://localhost:8787`:

- **Web**: `http://localhost:8787` (te lleva al prototipo).
- **Afiliarse**: `http://localhost:8787/prototipo/afiliate.html`. La solicitud queda pendiente.
- **Intranet**: `http://localhost:8787/intranet`. La primera vez, entra con tu usuario y contraseña de `.env`; te pedirá activar la doble verificación (escanea el QR con una app autenticadora y **guarda los códigos de recuperación**). Después podrás aprobar o rechazar solicitudes.
- Comprobar la API: `http://localhost:8787/api/health`.

Las claves de cifrado de desarrollo se generan solas en `apps/api/data/secretos.json`. En producción son obligatorias en variables de entorno (`PLU_CLAVE_CIFRADO`, `PLU_CLAVE_HMAC`) y si se pierden no se pueden recuperar los DNI guardados.

La base de datos se crea sola en `apps/api/data/plu.db`. Esa carpeta **no se sube a git** a propósito: contiene datos de personas.

Fotos de la web: `cd apps/web/public/prototipo && bash descargar-fotos.sh`.

## Guardar y subir cambios

```bash
cd ~/Documents/GitHub/plu
git status          # qué ha cambiado
git add .           # prepara todos los cambios
git commit -m "Describe el cambio"
git push            # sube a GitHub
```

## Documentación

Lee los documentos de `docs/` en orden. El `09-decisiones-pendientes.md` recoge lo ya decidido y las preguntas abiertas que condicionan el resto del diseño.


## Qué incluye la versión 0.3 (base de gestión)
- **Intranet** (`/intranet`): inscripciones, personas, solicitudes, encuestas (crear, abrir, cerrar, resultados, enlaces para simpatizantes), verificación de carné (móvil/QR), plantilla del carné, equipo y auditoría. Las secciones dependen del rol.
- **Portal del afiliado** (`/portal`): entrada con contraseña temporal + cambio obligatorio, carné en PDF, encuestas, solicitudes e historial.
- **Encuesta por enlace** (`/prototipo/encuesta.html?t=...`): para simpatizantes, un solo uso.
- Sin correo todavía: al aprobar una afiliación o crear un usuario, la contraseña temporal se muestra **una sola vez** en pantalla.
- Plantilla del carné: ver `docs/11-plantilla-carne.md`.

## Versión 0.4: participación
- **Ideas ciudadanas** (`/prototipo/ideas.html`): cualquiera propone (nombre + correo, pasa por moderación); las personas afiliadas apoyan y comentan desde el portal; ciclo público *en estudio → debate → votación → aprobada / descartada → en marcha*.
- **Votaciones** (`consultas.html`): una pregunta, voto secreto, solo afiliados, quórum, vinculante o consultiva; resultados públicos al cerrar.
- **Agenda** (`eventos.html`) con inscripción y aforo, **noticias**, **voluntariado**, **transparencia en cifras** (`como-funciona.html`).
- **Legal (borradores a revisar):** privacidad, términos, cookies, normas de participación, FAQ, contacto.
- Intranet: secciones nuevas Ideas (moderación y denuncias), Agenda, Noticias, Voluntariado y editor de votaciones.
- Quedan fuera por ahora: páginas por provincia, correo (necesita dominio) y donaciones.

## Versión 0.5: contenido editable
- **Editor visual** (como Elementor, versión sencilla): en la intranet → *Contenido web* eliges una página y se abre la propia web con `?editar=1`. Haces clic en cualquier texto para cambiarlo (negrita, cursiva, enlaces) y en *Cambiar foto* sobre cualquier imagen. *Guardar* publica al momento. Ctrl/Cmd+S también guarda.
- Los cambios se guardan **aparte** del HTML original (tabla `contenidos`), con historial; *Restaurar* devuelve el texto original de un elemento o de toda la página. Cabecera y pie son globales (se cambian en todas las páginas a la vez).
- Pueden editar administración y moderación. El HTML guardado se limpia en el servidor (solo negrita, cursiva, saltos de línea y enlaces seguros).
- **Imágenes** subidas desde la intranet: PNG, JPG o WebP de hasta 6 MB (se valida el contenido real del archivo; no se admite SVG). Se sirven en `/media/…`.
- **Noticias** con imagen de portada, gestionadas desde Intranet → Noticias.
- Si cambias a mano un texto en `build_site.py` y reconstruyes, ese texto recibe una clave nueva y deja de aplicarse el cambio guardado desde el editor. Los textos editables se generan solos al ejecutar `python3 build_site.py`.

## Versión 0.6: necesidades y portada

PLU es un movimiento: la política se construye a partir de lo que pide la ciudadanía.
- `POST /api/necesidades`: formulario rápido de la portada (texto 10–600 caracteres, provincia, email opcional, límite 8/hora por IP). Entra como `propuestas.tipo='necesidad'`, sin publicar hasta moderar en Intranet → Ideas.
- Portada reorientada: recoger → estudiar y clasificar → llevar a la ley → aplicar, con contadores y "Lo que pide la gente".
- `/api/transparencia` incluye `necesidades_recogidas`.
- Vía legal prevista: iniciativa legislativa popular.
