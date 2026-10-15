// Textos legales editables: la intranet los guarda en la base de datos y la web los muestra ya renderizados (sin JavaScript, bueno para buscadores).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { db } from './db.js';
import { auditar, requerirEquipo } from './sesion.js';
import { ahoraISO } from './servicios.js';
import { mdHtml, pendientes } from './markdown.js';

const aquí = dirname(fileURLToPath(import.meta.url));
export const webDir = join(aquí, '..', '..', 'web', 'public', 'prototipo');
const defectos = () => JSON.parse(readFileSync(join(webDir, 'legales_defecto.json'), 'utf8'));
export const SLUGS = Object.keys(defectos());
const EDITAN = ['admin', 'moderador'];
const MAX = 60_000;

export const legalesIntranet = Router();
const valido = (slug) => SLUGS.includes(slug);

function ficha(slug) {
  const d = defectos()[slug], f = db.prepare('SELECT * FROM textos_legales WHERE slug = ?').get(slug);
  const md = f?.cuerpo_md ?? d.md;
  return { slug, titulo: d.titulo, md, defecto_md: d.md, modificado: !!f, revisado: !!f?.revisado, actualizado_en: f?.actualizado_en ?? null, pendientes: pendientes(md).length };
}

legalesIntranet.get('/legales', requerirEquipo(...EDITAN, 'auditor'), (_req, res) => {
  res.json(SLUGS.map((s) => { const { md, defecto_md, ...resto } = ficha(s); return resto; }));
});
legalesIntranet.get('/legales/:slug', requerirEquipo(...EDITAN, 'auditor'), (req, res) => {
  if (!valido(req.params.slug)) return res.status(404).json({ error: 'No existe ese texto' });
  const hist = db.prepare(
    `SELECT h.id, h.fecha, h.revisado, u.nombre AS usuario FROM textos_legales_historial h LEFT JOIN usuarios_intranet u ON u.id = h.usuario_id
      WHERE h.slug = ? ORDER BY h.id DESC LIMIT 30`).all(req.params.slug);
  res.json({ ...ficha(req.params.slug), historial: hist, lista_pendientes: pendientes(ficha(req.params.slug).md) });
});
legalesIntranet.post('/legales/vista-previa', requerirEquipo(...EDITAN), (req, res) => {
  const md = String(req.body?.md ?? '');
  if (md.length > MAX) return res.status(400).json({ error: 'Texto demasiado largo' });
  res.json({ html: mdHtml(md), pendientes: pendientes(md).length });
});
function guardar(slug, md, revisado, usuarioId) {
  const ahora = ahoraISO();
  db.prepare(
    `INSERT INTO textos_legales (slug, cuerpo_md, revisado, actualizado_en, usuario_id) VALUES (?,?,?,?,?)
     ON CONFLICT(slug) DO UPDATE SET cuerpo_md = excluded.cuerpo_md, revisado = excluded.revisado, actualizado_en = excluded.actualizado_en, usuario_id = excluded.usuario_id`,
  ).run(slug, md, revisado ? 1 : 0, ahora, usuarioId);
  db.prepare('INSERT INTO textos_legales_historial (slug, cuerpo_md, revisado, fecha, usuario_id) VALUES (?,?,?,?,?)').run(slug, md, revisado ? 1 : 0, ahora, usuarioId);
}
legalesIntranet.post('/legales/:slug', requerirEquipo(...EDITAN), (req, res) => {
  const slug = req.params.slug;
  if (!valido(slug)) return res.status(404).json({ error: 'No existe ese texto' });
  const md = String(req.body?.md ?? '').replace(/\r/g, '');
  if (md.trim().length < 20) return res.status(400).json({ error: 'El texto es demasiado corto' });
  if (md.length > MAX) return res.status(400).json({ error: 'Texto demasiado largo' });
  guardar(slug, md, req.body?.revisado === true, req.equipo.id);
  auditar(req.equipo.id, 'editar_texto_legal', 'texto_legal', null, { slug, caracteres: md.length });
  res.json({ ok: true, ...ficha(slug) });
});
// Volver al texto original o a una versión anterior del historial
legalesIntranet.post('/legales/:slug/restaurar', requerirEquipo(...EDITAN), (req, res) => {
  const slug = req.params.slug;
  if (!valido(slug)) return res.status(404).json({ error: 'No existe ese texto' });
  if (req.body?.original === true) {
    db.prepare('DELETE FROM textos_legales WHERE slug = ?').run(slug);
    db.prepare('INSERT INTO textos_legales_historial (slug, cuerpo_md, revisado, usuario_id) VALUES (?,?,0,?)').run(slug, defectos()[slug].md, req.equipo.id);
  } else {
    const h = db.prepare('SELECT * FROM textos_legales_historial WHERE id = ? AND slug = ?').get(Number(req.body?.historial_id), slug);
    if (!h) return res.status(404).json({ error: 'Versión no encontrada' });
    guardar(slug, h.cuerpo_md, !!h.revisado, req.equipo.id);
  }
  auditar(req.equipo.id, 'restaurar_texto_legal', 'texto_legal', null, { slug, original: req.body?.original === true });
  res.json({ ok: true, ...ficha(slug) });
});

// ---- Páginas públicas: se sirve el HTML estático con el texto editado dentro ----
const fechaEs = (iso) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
export function paginaLegal(slug) {
  const f = join(webDir, slug + '.html');
  if (!existsSync(f)) return null;
  let html = readFileSync(f, 'utf8');
  const fila = db.prepare('SELECT cuerpo_md, revisado, actualizado_en FROM textos_legales WHERE slug = ?').get(slug);
  if (!fila) return html;
  html = html.replace(/<!--LEGAL-->[\s\S]*?<!--\/LEGAL-->/, () => `<!--LEGAL-->${mdHtml(fila.cuerpo_md)}\n<p class="muted legal-fecha">Última actualización: ${fechaEs(fila.actualizado_en)}</p><!--/LEGAL-->`);
  if (fila.revisado) html = html.replace(/<!--AVISO-->[\s\S]*?<!--\/AVISO-->/, '');
  return html;
}
