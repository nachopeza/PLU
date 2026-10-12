// Servidor de la API de la PLU (esqueleto).
// De momento: comprobación de salud, listado de provincias y el prototipo de la web en "/".
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
  const { total } = db.prepare("SELECT COUNT(*) AS total FROM territorios WHERE tipo = 'provincia'").get();
  res.json({ ok: true, servicio: 'plu-api', version: '0.1.0', provincias: total });
});

// Lista pública de provincias con su comunidad (se usará en el formulario de afiliación).
// El código INE de 2 dígitos es el que va dentro del número de afiliado.
app.get('/api/provincias', (_req, res) => {
  const filas = db
    .prepare(
      `SELECT p.id, p.codigo_num AS codigo, p.nombre, c.nombre AS comunidad
         FROM territorios p JOIN territorios c ON c.id = p.padre_id
        WHERE p.tipo = 'provincia' ORDER BY p.nombre`,
    )
    .all();
  res.json(filas);
});

// Ficheros estáticos de la web (logo, prototipo...) y el prototipo como página de inicio
app.use(express.static(publicDir));
app.get('/', (_req, res) => res.sendFile(join(publicDir, 'prototipo-landing.html')));

const puerto = Number(process.env.PORT ?? 8787);
app.listen(puerto, () => {
  console.log(`PLU API escuchando en http://localhost:${puerto}`);
});
