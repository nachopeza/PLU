# PLU — Plataforma Liberal Unida

> La libertad de las personas. La identidad de los territorios. El bienestar de todos.

Repositorio de la plataforma digital de la PLU. Tiene dos grandes partes:

1. **Web pública**: información del movimiento (manifiesto, principios, democracia, territorio, bienestar...) y formularios para afiliarse, hacerse simpatizante o recibir novedades.
2. **Área privada**: un **portal** para afiliados y simpatizantes (carné, encuestas, solicitudes, historial de afiliación) y una **intranet de gestión** para el equipo (inscripciones, personas, movimientos, plantillas de carné, verificación, usuarios y roles).

La estructura técnica se basa en el proyecto IDENTIA: monorepo con `apps/web` y `apps/api`, roles en la intranet, carné en PDF con QR y envío por correo.

> Estado: **fase de definición**. El nombre, las siglas y el lema son provisionales. La web pública es todavía un prototipo estático y el código de la API es un esqueleto con la base de datos inicial.

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
  apps/
    web/                         Web pública + portal + intranet (por construir: React + TypeScript + Vite + Tailwind)
      public/
        prototipo-landing.html   Prototipo de la web pública (una sola página, ya diseñada)
        brand/logo-plu.png       Logo original
    api/                         API (Express + node:sqlite)
      src/server.js              Servidor: /api/health, /api/territorios y el prototipo en /
      src/db.js                  Abre la base de datos y crea las tablas
      src/schema.sql             Esquema inicial (personas, movimientos, carnés, solicitudes, encuestas...)
```

## Arrancarlo en local (macOS)

Necesitas **Node 22 o superior** (`node -v` te dice cuál tienes). Abre la app Terminal:

```bash
# 1. Entra en la carpeta de la API (ajusta la ruta si clonaste en otro sitio)
cd ~/Documents/GitHub/plu/apps/api

# 2. Instala las dependencias (solo la primera vez)
npm install

# 3. Arranca la API en modo desarrollo (se reinicia sola al guardar cambios)
npm run dev
```

Cuando veas `PLU API escuchando en http://localhost:8787`, abre esa dirección en el navegador. Verás el prototipo de la web. Para comprobar la API: `http://localhost:8787/api/health`.

La base de datos se crea sola en `apps/api/data/plu.db`. Esa carpeta **no se sube a git** a propósito: contiene datos de personas.

## Guardar y subir cambios

```bash
cd ~/Documents/GitHub/plu
git status          # qué ha cambiado
git add .           # prepara todos los cambios
git commit -m "Describe el cambio"
git push            # sube a GitHub
```

## Documentación

Lee los documentos de `docs/` en orden. El `09-decisiones-pendientes.md` recoge las preguntas abiertas que condicionan el resto del diseño.
