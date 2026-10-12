// Servidor de la API de la PLU (esqueleto).
// De momento: comprobación de salud, listado de territorios y el prototipo de la web en "/".
import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const aquí = dirname(fileURLToPath(import.meta.url));
const publicDir = join(aquí, '..', '..', 'web', 'public');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// ¿Está viva la API y la base de datos responde?
app.get('/api/health', (_req, res) => {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM territorios').get();
  res.json({ ok: true, servicio: 'plu-api', version: '0.1.0', territorios: total });
});

// Lista pública de territorios (se usará en el formulario de afiliación)
app.get('/api/territorios', (_req, res) => {
  const filas = db.prepare('SELECT id, codigo, nombre, tipo FROM territorios ORDER BY nombre').all();
  res.json(filas);
});

// Ficheros estáticos de la web (logo, prototipo...) y el prototipo como página de inicio
app.use(express.static(publicDir));
app.get('/', (_req, res) => res.sendFile(join(publicDir, 'prototipo-landing.html')));

const puerto = Number(process.env.PORT ?? 8787);
app.listen(puerto, () => {
  console.log(`PLU API escuchando en http://localhost:${puerto}`);
});
