// Servidor de la API de la PLU.
// Sirve: comprobación de salud, provincias, inscripciones públicas, intranet (equipo) y la web de prototipo.
import { existsSync } from 'node:fs';
import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import './config.js';
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
app.use('/api', (req, res, next) => (req.method === 'POST' && ((req.path === '/intranet/plantillas' && req.is('application/pdf')) || (req.path === '/intranet/medios' && req.is(['image/png', 'image/jpeg', 'image/webp']))) ? next() : soloJson(req, res, next)));
// Los datos de la API nunca se guardan en caché
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

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
app.use('/api/portal', participacionPortal);
app.use('/api/portal', portal);
app.use('/api/intranet', intranet);
app.use('/api/intranet', gestion);
app.use('/api/intranet', encuestasIntranet);
app.use('/api/intranet', rutasCarne);
app.use('/api/intranet', contenidoIntranet);
app.use('/api/intranet', participacionIntranet);
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
app.get('/', (_req, res) => res.sendFile(join(webDir, 'index.html')));
app.get(/^\/([a-z0-9-]+)$/, (req, res, next) => {
  const f = join(webDir, req.params[0] + '.html');
  return existsSync(f) ? res.sendFile(f) : next();
});
app.use(express.static(publicDir));

crearAdminInicial();

const puerto = Number(process.env.PORT ?? 8787);
app.listen(puerto, () => console.log(`PLU API escuchando en http://localhost:${puerto}`));
