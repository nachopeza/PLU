// Servidor de la API de la PLU.
// Sirve: comprobación de salud, provincias, inscripciones públicas, intranet (equipo) y la web de prototipo.
import { existsSync, readFileSync } from 'node:fs';
import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { URL_PUBLICA } from './config.js';
import { crearAdminInicial } from './admin-inicial.js';
import { publicas } from './rutas-publicas.js';
import { intranet } from './rutas-intranet.js';
import { gestion } from './rutas-gestion.js';
import { encuestasIntranet, encuestasPublicas } from './rutas-encuestas.js';
import { portal } from './rutas-portal.js';
import { contenidoIntranet, contenidoPublico, medios } from './rutas-contenido.js';
import { participacionIntranet, participacionPortal, participacionPublica } from './rutas-participacion.js';
import { rutasCarne } from './rutas-carne.js';
import { soloJson } from './sesion.js';
import { sembrarNoticias } from './noticias-ejemplo.js';
import { perfilIntranet, perfilPortal } from './rutas-perfil.js';
import { donacionesPublicas, donacionesIntranet } from './rutas-donaciones.js';
import { legalesIntranet, paginaLegal, SLUGS as SLUGS_LEGALES } from './rutas-legales.js';
import { privacidad, WEB_PRIVADA } from './privacidad.js';

const aquí = dirname(fileURLToPath(import.meta.url));
const publicDir = join(aquí, '..', '..', 'web', 'public');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // detrás del proxy del hosting, para ver la IP real
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use(express.json({ limit: '100kb' }));
// Solo la subida de la plantilla del carné es binaria (PDF); el resto de peticiones que cambian datos deben ser JSON
app.use('/api', (req, res, next) => (req.method === 'POST' && (((req.path === '/intranet/plantillas' || req.path === '/intranet/documentos') && req.is('application/pdf')) || (req.path === '/intranet/medios' && req.is(['image/png', 'image/jpeg', 'image/webp']))) ? next() : soloJson(req, res, next)));
// Los datos de la API nunca se guardan en caché
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

privacidad(app); // web en privado si PLU_WEB_PRIVADA lo indica
app.get('/api/health', (_req, res) => {
  const { total } = db.prepare("SELECT COUNT(*) AS total FROM territorios WHERE tipo = 'provincia'").get();
  res.json({ ok: true, servicio: 'plu-api', version: '0.5.0', provincias: total });
});

// Lista de provincias con su comunidad (formulario de afiliación). El código INE va en el número de afiliado.
app.get('/api/provincias', (_req, res) => {
  res.json(db.prepare(
    `SELECT p.id, p.codigo_num AS codigo, p.nombre, c.nombre AS comunidad
       FROM territorios p JOIN territorios c ON c.id = p.padre_id
      WHERE p.tipo = 'provincia' ORDER BY p.nombre`,
  ).all());
});

app.use('/api', publicas);
app.use('/api', encuestasPublicas);
app.use('/api', contenidoPublico);
app.use('/api', participacionPublica);
app.use('/api/donaciones', donacionesPublicas);
app.use('/api/portal', participacionPortal);
app.use('/api/portal', portal);
app.use('/api/portal', perfilPortal);
app.use('/api/intranet', intranet);
app.use('/api/intranet', gestion);
app.use('/api/intranet', encuestasIntranet);
app.use('/api/intranet', rutasCarne);
app.use('/api/intranet', contenidoIntranet);
app.use('/api/intranet', participacionIntranet);
app.use('/api/intranet', perfilIntranet);
app.use('/api/intranet', legalesIntranet);
app.use('/api/intranet', donacionesIntranet);
app.use('/api', (_req, res) => res.status(404).json({ error: 'No existe' }));

app.use(medios);
// Web con URLs limpias: somosplu.com/afiliate (sin /prototipo ni .html). Las URLs antiguas redirigen.
const webDir = join(publicDir, 'prototipo');
const sufijo = (req) => { const i = req.originalUrl.indexOf('?'); return i >= 0 ? req.originalUrl.slice(i) : ''; };
const limpia = (nombre) => (nombre === 'index' ? '/' : '/' + nombre);
app.use('/prototipo', (req, res, next) => {
  const m = /^\/([a-z0-9-]+)(?:\.html)?\/?$/.exec(req.path);
  if (m) return res.redirect(301, limpia(m[1]) + sufijo(req));
  if (req.path === '/') return res.redirect(301, '/' + sufijo(req));
  // recursos (css, js, fotos…) que aún se pidan con la ruta antigua
  return res.redirect(301, req.path + sufijo(req));
});
app.get(/^\/([a-z0-9-]+)\.html$/, (req, res) => res.redirect(301, limpia(req.params[0]) + sufijo(req)));
app.use(express.static(webDir, { index: false, extensions: [] }));
// Las páginas llevan __URL__ como marcador; se sustituye por la dirección pública (canonical, og:url, imagen para compartir)
const conUrl = (html) => html.replaceAll('__URL__', URL_PUBLICA.replace(/\/$/, ''));
const enviaHtml = (res, f) => res.type('html').send(conUrl(readFileSync(f, 'utf8')));
const PAGINAS_SITEMAP = ['proyecto', 'propuestas', 'ideas', 'eventos', 'participa', 'democracia', 'consultas', 'debate', 'voluntariado', 'como-funciona', 'afiliate', 'noticias', 'donar', 'privacidad', 'terminos', 'cookies', 'normas', 'faq', 'contacto'];
app.get('/robots.txt', (_req, res) => res.type('text/plain').send(`User-agent: *\nDisallow: /intranet\nDisallow: /portal\nDisallow: /api/\nDisallow: /encuesta\nSitemap: ${URL_PUBLICA.replace(/\/$/, '')}/sitemap.xml\n`));
app.get('/sitemap.xml', (_req, res) => {
  const base = URL_PUBLICA.replace(/\/$/, ''), x = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const u = [[`${base}/`, null, '1.0']].concat(PAGINAS_SITEMAP.filter((p) => existsSync(join(webDir, p + '.html'))).map((p) => [`${base}/${p}`, null, '0.7']));
  for (const n of db.prepare('SELECT id, fecha FROM noticias WHERE publicada = 1 ORDER BY fecha DESC LIMIT 500').all()) u.push([`${base}/noticias?id=${n.id}`, String(n.fecha ?? '').slice(0, 10), '0.6']);
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    u.map(([l, m, p]) => `<url><loc>${x(l)}</loc>${/^\d{4}-\d{2}-\d{2}$/.test(m ?? '') ? `<lastmod>${m}</lastmod>` : ''}<priority>${p}</priority></url>`).join('\n') + '\n</urlset>\n');
});
app.get('/', (_req, res) => enviaHtml(res, join(webDir, 'index.html')));
// Cada noticia lleva su vista previa al compartirla (WhatsApp, X, Facebook…): título, resumen e imagen en la propia página
const escAttr = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
app.get('/noticias', (req, res, next) => {
  const id = Number(req.query.id);
  if (!Number.isInteger(id) || id < 1) return next();
  const n = db.prepare('SELECT titulo, resumen, cuerpo, imagen FROM noticias WHERE id = ? AND publicada = 1').get(id);
  const f = join(webDir, 'noticias.html');
  if (!n || !existsSync(f)) return next();
  const desc = (n.resumen || n.cuerpo).replace(/\s+/g, ' ').slice(0, 200);
  const meta = `<title>${escAttr(n.titulo)} · PLU</title>\n<meta property="og:type" content="article"><meta property="og:site_name" content="PLU · Plataforma Liberal Unida">` +
    `<meta property="og:title" content="${escAttr(n.titulo)}"><meta property="og:description" content="${escAttr(desc)}"><meta property="og:url" content="${escAttr(`${URL_PUBLICA}/noticias?id=${id}`)}">` +
    (n.imagen ? `<meta property="og:image" content="${escAttr(/^https?:/.test(n.imagen) ? n.imagen : URL_PUBLICA + n.imagen)}"><meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">') +
    `<meta name="description" content="${escAttr(desc)}">`;
  const limpia = conUrl(readFileSync(f, 'utf8'))
    .replace(/<meta name="description"[^>]*>\n?|<link rel="canonical"[^>]*>\n?|<meta property="og:(title|description|url)"[^>]*>|<meta name="twitter:(title|description)"[^>]*>/g, '')
    .replace(n.imagen ? /<meta (property="og:(type|image[^"]*)"|name="twitter:(card|image)")[^>]*>/g : /(?!)/g, '');
  res.type('html').send(limpia.replace(/<title>[^<]*<\/title>/, () => meta));
});
app.get(SLUGS_LEGALES.map((s) => '/' + s), (req, res, next) => {
  const html = paginaLegal(req.path.slice(1));
  return html ? res.type('html').send(conUrl(html)) : next();
});
app.get(/^\/([a-z0-9-]+)$/, (req, res, next) => {
  const f = join(webDir, req.params[0] + '.html');
  return existsSync(f) ? enviaHtml(res, f) : next();
});
app.use(express.static(publicDir));

crearAdminInicial();
sembrarNoticias().catch((e) => console.error('Noticias de ejemplo:', e.message));

const puerto = Number(process.env.PORT ?? 8787);
app.listen(puerto, () => console.log(`PLU API escuchando en http://localhost:${puerto}${WEB_PRIVADA ? ' · web PRIVADA (solo equipo)' : ''}`));
