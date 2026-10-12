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
