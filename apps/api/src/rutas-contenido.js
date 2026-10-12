// Contenido editable de la web: textos e imágenes guardados aparte del HTML original, y biblioteca de medios.
import express, { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR, db } from './db.js';
import { limitar } from './seguridad.js';
import { auditar, requerirEquipo } from './sesion.js';
import { transaccion } from './servicios.js';

export const contenidoPublico = Router();
export const contenidoIntranet = Router();
export const medios = Router();
const EDITORES = ['admin', 'moderador'];
const CARPETA_MEDIOS = join(DATA_DIR, 'media');
const PAGINA = /^[a-z0-9-]{1,40}$/;
const CLAVE = /^(?:[a-z0-9-]{1,40}|g|img):[a-f0-9]{8}(?:~\d{1,3})?$/;

// Deja solo em, strong, b, i, br y enlaces con destino seguro. Todo lo demás se elimina (el texto se conserva).
export function limpiarHtml(entrada) {
  const texto = String(entrada ?? '').replace(/<(div|p)[^>]*>/gi, '<br>').replace(/<\/(div|p)>/gi, '');
  let salida = '', i = 0;
  const etiqueta = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
  let m;
  while ((m = etiqueta.exec(texto))) {
    salida += escapar(texto.slice(i, m.index));
    i = m.index + m[0].length;
    const [, cierre, nombre, attrs] = m, t = nombre.toLowerCase();
    if (['em', 'strong', 'b', 'i'].includes(t)) salida += cierre ? `</${t}>` : `<${t}>`;
    else if (t === 'br') { if (!cierre) salida += '<br>'; }
    else if (t === 'a') {
      if (cierre) salida += '</a>';
      else {
        const h = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
        const url = (h?.[1] ?? h?.[2] ?? '').replace(/&amp;/g, '&').trim();
        if (/^(https?:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|[A-Za-z0-9_\-./#?=&%]+)$/.test(url) && !/^\s*javascript:/i.test(url)) salida += `<a href="${url.replace(/&/g, '&amp;')}" rel="noopener">`;
        else salida += '<a>';
      }
    }
  }
  salida += escapar(texto.slice(i));
  const abiertas = [];
  for (const t of salida.matchAll(/<(\/?)(em|strong|b|i|a)\b[^>]*>/g)) { if (t[1]) abiertas.pop(); else abiertas.push(t[2]); }
  while (abiertas.length) salida += `</${abiertas.pop()}>`;
  return salida.replace(/(<br>\s*){3,}/g, '<br><br>').trim();
}
function escapar(t) {
  // Conserva entidades ya escritas (&amp; &nbsp; &#8217;…) y escapa lo demás
  return t.replace(/&(?!(?:[a-zA-Z]{2,8}|#\d{1,6}|#x[0-9a-fA-F]{1,6});)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
const soloTexto = (h) => h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

// ---------- Lectura pública (la web aplica estos textos encima del original) ----------
contenidoPublico.get('/contenido', (req, res) => {
  const pagina = String(req.query.pagina ?? '');
  if (!PAGINA.test(pagina)) return res.status(400).json({ error: 'Página no válida' });
  const filas = db.prepare("SELECT clave, valor FROM contenidos WHERE pagina IN (?, 'global')").all(pagina);
  res.setHeader('Cache-Control', 'no-store');
  res.json(Object.fromEntries(filas.map((f) => [f.clave, f.valor])));
});

// ---------- Edición (administración y moderación) ----------
contenidoIntranet.put('/contenido', requerirEquipo(...EDITORES), (req, res) => {
  const pagina = String(req.body?.pagina ?? '');
  const cambios = req.body?.cambios;
  if (!PAGINA.test(pagina) || !cambios || typeof cambios !== 'object') return res.status(400).json({ error: 'Datos no válidos' });
  const entradas = Object.entries(cambios);
  if (!entradas.length || entradas.length > 300) return res.status(400).json({ error: 'Número de cambios no válido' });
  const guardados = {};
  try {
    transaccion(() => {
      for (const [clave, bruto] of entradas) {
        if (!CLAVE.test(clave)) throw new Error('Clave no válida');
        const esImg = clave.startsWith('img:');
        let valor;
        if (esImg) {
          valor = String(bruto);
          if (!/^\/media\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(valor)) throw new Error('Imagen no válida');
        } else {
          valor = limpiarHtml(bruto);
          if (valor.length > 4000) throw new Error('Un texto es demasiado largo');
          if (!soloTexto(valor)) throw new Error('Un texto no puede quedar vacío (usa "Restaurar" para volver al original)');
        }
        const donde = clave.startsWith('g:') ? 'global' : pagina;
        const ant = db.prepare('SELECT valor FROM contenidos WHERE pagina = ? AND clave = ?').get(donde, clave);
        if (ant?.valor === valor) continue;
        db.prepare('INSERT INTO contenidos_historial (pagina, clave, valor_anterior, usuario_id) VALUES (?, ?, ?, ?)').run(donde, clave, ant?.valor ?? null, req.equipo.id);
        db.prepare(`INSERT INTO contenidos (pagina, clave, valor, usuario_id) VALUES (?, ?, ?, ?)
                    ON CONFLICT(pagina, clave) DO UPDATE SET valor = excluded.valor, actualizado_en = strftime('%Y-%m-%dT%H:%M:%SZ','now'), usuario_id = excluded.usuario_id`)
          .run(donde, clave, valor, req.equipo.id);
        guardados[clave] = valor;
      }
    });
  } catch (e) { return res.status(400).json({ error: e.message }); }
  auditar(req.equipo.id, 'editar_contenido', 'pagina', null, { pagina, cambios: Object.keys(guardados).length });
  res.json({ ok: true, guardados });
});

contenidoIntranet.get('/contenido', requerirEquipo(...EDITORES, 'auditor'), (_req, res) => {
  res.json(db.prepare('SELECT c.pagina, c.clave, c.valor, c.actualizado_en, u.username FROM contenidos c LEFT JOIN usuarios_intranet u ON u.id = c.usuario_id ORDER BY c.actualizado_en DESC LIMIT 500').all());
});

// Restaurar: un texto concreto, o todos los de una página
contenidoIntranet.delete('/contenido', requerirEquipo(...EDITORES), (req, res) => {
  const pagina = String(req.body?.pagina ?? ''), clave = req.body?.clave ? String(req.body.clave) : null;
  if (!PAGINA.test(pagina) && pagina !== 'global') return res.status(400).json({ error: 'Página no válida' });
  const filas = clave ? db.prepare('SELECT * FROM contenidos WHERE pagina = ? AND clave = ?').all(pagina, clave) : db.prepare('SELECT * FROM contenidos WHERE pagina = ?').all(pagina);
  transaccion(() => {
    for (const f of filas) db.prepare('INSERT INTO contenidos_historial (pagina, clave, valor_anterior, usuario_id) VALUES (?, ?, ?, ?)').run(f.pagina, f.clave, f.valor, req.equipo.id);
    if (clave) db.prepare('DELETE FROM contenidos WHERE pagina = ? AND clave = ?').run(pagina, clave); else db.prepare('DELETE FROM contenidos WHERE pagina = ?').run(pagina);
  });
  auditar(req.equipo.id, 'restaurar_contenido', 'pagina', null, { pagina, clave, filas: filas.length });
  res.json({ ok: true, restaurados: filas.length });
});

// ---------- Medios (imágenes) ----------
const FIRMAS = [['png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], ['jpg', Buffer.from([0xff, 0xd8, 0xff])]];
function extension(b) {
  for (const [ext, firma] of FIRMAS) if (b.subarray(0, firma.length).equals(firma)) return ext;
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null; // SVG y otros formatos no se aceptan: podrían llevar código
}
contenidoIntranet.post('/medios', requerirEquipo(...EDITORES), express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '6mb' }), (req, res) => {
  if (!limitar(`medios:${req.equipo.id}`, 60, 3600_000)) return res.status(429).json({ error: 'Demasiadas subidas' });
  const b = req.body;
  const ext = Buffer.isBuffer(b) && b.length > 100 ? extension(b) : null;
  if (!ext) return res.status(400).json({ error: 'Sube una imagen PNG, JPG o WebP de hasta 6 MB' });
  mkdirSync(CARPETA_MEDIOS, { recursive: true });
  const id = randomBytes(16).toString('hex');
  writeFileSync(join(CARPETA_MEDIOS, `${id}.${ext}`), b);
  db.prepare('INSERT INTO medios (id, ext, bytes, usuario_id) VALUES (?, ?, ?, ?)').run(id, ext, b.length, req.equipo.id);
  auditar(req.equipo.id, 'subir_medio', 'medio', null, { id });
  res.status(201).json({ ok: true, url: `/media/${id}.${ext}` });
});
contenidoIntranet.get('/medios', requerirEquipo(...EDITORES), (_req, res) => {
  res.json(db.prepare('SELECT id, ext, bytes, subido_en FROM medios ORDER BY subido_en DESC LIMIT 200').all().map((m) => ({ ...m, url: `/media/${m.id}.${m.ext}` })));
});

// Entrega pública de las imágenes subidas
medios.get('/media/:archivo', (req, res) => {
  const m = /^([a-f0-9]{32})\.(png|jpg|webp)$/.exec(req.params.archivo);
  if (!m || !db.prepare('SELECT 1 FROM medios WHERE id = ?').get(m[1])) return res.status(404).end();
  const ruta = join(CARPETA_MEDIOS, req.params.archivo);
  if (!existsSync(ruta)) return res.status(404).end();
  res.setHeader('Content-Type', { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[m[2]]);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(readFileSync(ruta));
});
