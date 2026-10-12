// Participación: propuestas ciudadanas, apoyos y comentarios, eventos, noticias, voluntariado, consultas y transparencia.
import { Router } from 'express';
import { db } from './db.js';
import { limitar } from './seguridad.js';
import { auditar, requerirEquipo, requerirPersona } from './sesion.js';
import { ahoraISO, transaccion } from './servicios.js';
import { calcularResultados } from './rutas-encuestas.js';
import { esEmail, limpio } from './validar.js';

export const participacionPublica = Router();
export const participacionPortal = Router();
export const participacionIntranet = Router();

const AREAS = ['Libertades y derechos', 'Economía y empleo', 'Vivienda', 'Educación y juventud', 'Sanidad', 'Medio ambiente', 'Democracia y transparencia', 'Territorio', 'Otra'];
const AREAS_VOLUNTARIADO = ['Comunicación y redes', 'Programa y propuestas', 'Diseño', 'Tecnología', 'Eventos y logística', 'Territorio y contacto local', 'Traducción', 'Otra'];
const PUBLICOS = ['en_estudio', 'en_debate', 'en_votacion', 'aprobada', 'descartada', 'en_marcha'];
const ESTADOS = ['recibida', 'rechazada', ...PUBLICOS];
const MODERAN = ['admin', 'moderador'];
const primerNombre = (n) => String(n).split(' ')[0];

participacionPublica.get('/areas', (_req, res) => res.json({ propuestas: AREAS, voluntariado: AREAS_VOLUNTARIADO }));

// ---------- Propuestas (público) ----------
const fichaPublica = (p) => ({
  tipo: p.tipo, provincia: p.provincia ?? null,
  id: p.id, titulo: p.titulo, texto: p.texto, area: p.area, autor: primerNombre(p.autor_nombre), estado: p.estado,
  creada_en: p.creada_en, apoyos: p.apoyos ?? 0, comentarios: p.comentarios ?? 0, votacion_id: p.votacion_id,
});

participacionPublica.get('/propuestas', (req, res) => {
  const q = [`p.estado IN (${PUBLICOS.map(() => '?').join(',')})`], args = [...PUBLICOS];
  if (PUBLICOS.includes(req.query.estado)) { q.push('p.estado = ?'); args.push(req.query.estado); }
  if (AREAS.includes(req.query.area)) { q.push('p.area = ?'); args.push(req.query.area); }
  if (['necesidad', 'propuesta'].includes(req.query.tipo)) { q.push('p.tipo = ?'); args.push(req.query.tipo); }
  if (Number(req.query.limite) > 0) { /* se aplica abajo */ }
  const texto = limpio(req.query.q, 60);
  if (texto) { q.push('(p.titulo LIKE ? OR p.texto LIKE ?)'); const l = `%${texto.replace(/[%_]/g, '')}%`; args.push(l, l); }
  const orden = req.query.orden === 'recientes' ? 'p.creada_en DESC' : 'apoyos DESC, p.creada_en DESC';
  const filas = db.prepare(
    `SELECT p.*, (SELECT nombre FROM territorios t WHERE t.id = p.provincia_id) AS provincia,
            (SELECT COUNT(*) FROM propuesta_apoyos a WHERE a.propuesta_id = p.id) AS apoyos,
            (SELECT COUNT(*) FROM comentarios c WHERE c.propuesta_id = p.id AND c.oculto = 0) AS comentarios
       FROM propuestas p WHERE ${q.join(' AND ')} ORDER BY ${orden} LIMIT ${Math.min(100, Number(req.query.limite) || 100)}`,
  ).all(...args);
  res.json(filas.map(fichaPublica));
});

participacionPublica.get('/propuestas/:id', (req, res) => {
  const p = db.prepare(
    `SELECT p.*, (SELECT nombre FROM territorios t WHERE t.id = p.provincia_id) AS provincia, (SELECT COUNT(*) FROM propuesta_apoyos a WHERE a.propuesta_id = p.id) AS apoyos FROM propuestas p WHERE p.id = ?`,
  ).get(Number(req.params.id));
  if (!p || !PUBLICOS.includes(p.estado)) return res.status(404).json({ error: 'Propuesta no encontrada' });
  const comentarios = db.prepare(
    `SELECT c.id, c.texto, c.creado_en, pe.nombre FROM comentarios c JOIN personas pe ON pe.id = c.persona_id
      WHERE c.propuesta_id = ? AND c.oculto = 0 ORDER BY c.creado_en LIMIT 200`,
  ).all(p.id).map((c) => ({ id: c.id, texto: c.texto, creado_en: c.creado_en, autor: primerNombre(c.nombre) }));
  const historial = db.prepare('SELECT estado, nota, fecha FROM propuesta_historial WHERE propuesta_id = ? ORDER BY fecha, id').all(p.id)
    .filter((h) => PUBLICOS.includes(h.estado));
  res.json({ ...fichaPublica({ ...p, comentarios: comentarios.length }), comentarios_lista: comentarios, historial });
});

// Cualquier persona puede proponer (nombre + correo). La propuesta no se ve hasta que el equipo la modera.
participacionPublica.post('/propuestas', (req, res) => {
  if (!limitar(`prop:${req.ip}`, 5, 3600_000)) return res.status(429).json({ error: 'Demasiadas propuestas seguidas. Prueba más tarde.' });
  const b = req.body ?? {};
  const nombre = limpio(b.nombre, 80), email = limpio(b.email, 254).toLowerCase(), titulo = limpio(b.titulo, 120);
  const texto = String(b.texto ?? '').trim().slice(0, 3000), area = AREAS.includes(b.area) ? b.area : 'Otra';
  const errores = {};
  if (!nombre) errores.nombre = 'Escribe tu nombre';
  if (!esEmail(email)) errores.email = 'Correo no válido';
  if (titulo.length < 8) errores.titulo = 'El título es demasiado corto';
  if (texto.length < 40) errores.texto = 'Explica tu idea con al menos 40 caracteres';
  if (b.acepta_normas !== true) errores.acepta_normas = 'Hace falta aceptar las normas de participación';
  if (Object.keys(errores).length) return res.status(400).json({ error: 'Revisa el formulario', errores });
  if (limitar(`prop-e:${email}`, 5, 24 * 3600_000)) {
    const r = db.prepare('INSERT INTO propuestas (titulo, texto, area, autor_nombre, autor_email) VALUES (?, ?, ?, ?, ?)').run(titulo, texto, area, nombre, email);
    db.prepare("INSERT INTO propuesta_historial (propuesta_id, estado, nota) VALUES (?, 'recibida', NULL)").run(Number(r.lastInsertRowid));
  }
  res.status(201).json({ ok: true, mensaje: 'Gracias. El equipo revisará tu propuesta y, si cumple las normas, la verás publicada en el listado.' });
});

// Necesidad rápida: una frase y la provincia. Es la puerta de entrada de la web; el equipo la estudia y clasifica.
participacionPublica.post('/necesidades', (req, res) => {
  if (!limitar(`nec:${req.ip}`, 8, 3600_000)) return res.status(429).json({ error: 'Demasiados envíos seguidos. Prueba más tarde.' });
  const b = req.body ?? {};
  const texto = String(b.texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 600);
  const email = limpio(b.email, 254).toLowerCase();
  const nombre = limpio(b.nombre, 80);
  const provincia = db.prepare("SELECT id FROM territorios WHERE id = ? AND tipo = 'provincia'").get(Number(b.provincia_id));
  const errores = {};
  if (texto.length < 10) errores.texto = 'Cuéntanos un poco más (al menos 10 caracteres)';
  if (!provincia) errores.provincia_id = 'Elige tu provincia';
  if (email && !esEmail(email)) errores.email = 'Correo no válido';
  if (b.acepta !== true) errores.acepta = 'Hace falta aceptar la política de privacidad';
  if (Object.keys(errores).length) return res.status(400).json({ error: 'Revisa el formulario', errores });
  let titulo = texto.length > 90 ? `${texto.slice(0, 90).replace(/\s+\S*$/, '')}…` : texto;
  if (titulo.length < 8) titulo = texto;
  const r = db.prepare("INSERT INTO propuestas (titulo, texto, autor_nombre, autor_email, tipo, provincia_id) VALUES (?, ?, ?, ?, 'necesidad', ?)").run(titulo, texto, nombre || 'Una persona', email, provincia.id);
  db.prepare("INSERT INTO propuesta_historial (propuesta_id, estado, nota) VALUES (?, 'recibida', NULL)").run(Number(r.lastInsertRowid));
  res.status(201).json({ ok: true, mensaje: 'Gracias. Tu necesidad está recibida: la estudiaremos, la clasificaremos y verás aquí qué pasa con ella. Cuantas más personas la compartan, más fuerza tiene.' });
});

// ---------- Propuestas (afiliados: apoyar y comentar) ----------
participacionPortal.get('/propuestas/:id/mio', requerirPersona(), (req, res) => {
  const id = Number(req.params.id);
  res.json({ apoyada: !!db.prepare('SELECT 1 FROM propuesta_apoyos WHERE propuesta_id = ? AND persona_id = ?').get(id, req.persona.id) });
});

participacionPortal.post('/propuestas/:id/apoyo', requerirPersona(), (req, res) => {
  const p = db.prepare('SELECT * FROM propuestas WHERE id = ?').get(Number(req.params.id));
  if (!p || !PUBLICOS.includes(p.estado)) return res.status(404).json({ error: 'Propuesta no encontrada' });
  if (req.persona.estado !== 'activo') return res.status(403).json({ error: 'Tu cuenta está suspendida' });
  const ya = db.prepare('SELECT 1 FROM propuesta_apoyos WHERE propuesta_id = ? AND persona_id = ?').get(p.id, req.persona.id);
  if (ya) db.prepare('DELETE FROM propuesta_apoyos WHERE propuesta_id = ? AND persona_id = ?').run(p.id, req.persona.id);
  else db.prepare('INSERT INTO propuesta_apoyos (propuesta_id, persona_id) VALUES (?, ?)').run(p.id, req.persona.id);
  res.json({ ok: true, apoyada: !ya, apoyos: db.prepare('SELECT COUNT(*) AS n FROM propuesta_apoyos WHERE propuesta_id = ?').get(p.id).n });
});

participacionPortal.post('/propuestas/:id/comentarios', requerirPersona(), (req, res) => {
  const p = db.prepare('SELECT * FROM propuestas WHERE id = ?').get(Number(req.params.id));
  if (!p || !['en_estudio', 'en_debate', 'en_votacion'].includes(p.estado)) return res.status(404).json({ error: 'Esta propuesta no admite comentarios' });
  if (req.persona.estado !== 'activo') return res.status(403).json({ error: 'Tu cuenta está suspendida' });
  if (!limitar(`com:${req.persona.id}`, 10, 3600_000)) return res.status(429).json({ error: 'Demasiados comentarios seguidos' });
  const texto = String(req.body?.texto ?? '').trim().slice(0, 1000);
  if (texto.length < 3) return res.status(400).json({ error: 'Escribe un comentario' });
  db.prepare('INSERT INTO comentarios (propuesta_id, persona_id, texto) VALUES (?, ?, ?)').run(p.id, req.persona.id, texto);
  res.status(201).json({ ok: true });
});

participacionPortal.post('/comentarios/:id/denunciar', requerirPersona(), (req, res) => {
  const c = db.prepare('SELECT id FROM comentarios WHERE id = ?').get(Number(req.params.id));
  if (!c) return res.status(404).json({ error: 'No existe' });
  db.prepare('INSERT OR IGNORE INTO denuncias (comentario_id, persona_id, motivo) VALUES (?, ?, ?)').run(c.id, req.persona.id, limpio(req.body?.motivo, 200) || null);
  res.json({ ok: true });
});

// ---------- Moderación de propuestas (equipo) ----------
participacionIntranet.get('/propuestas', requerirEquipo(...MODERAN, 'auditor'), (req, res) => {
  const estado = ESTADOS.includes(req.query.estado) ? req.query.estado : 'recibida';
  res.json(db.prepare(
    `SELECT p.id, p.titulo, p.texto, p.area, p.tipo, (SELECT nombre FROM territorios t WHERE t.id = p.provincia_id) AS provincia, p.autor_nombre, p.autor_email, p.estado, p.motivo_rechazo, p.votacion_id, p.creada_en,
            (SELECT COUNT(*) FROM propuesta_apoyos a WHERE a.propuesta_id = p.id) AS apoyos
       FROM propuestas p WHERE p.estado = ? ORDER BY p.creada_en DESC LIMIT 200`,
  ).all(estado));
});

participacionIntranet.post('/propuestas/:id/estado', requerirEquipo(...MODERAN), (req, res) => {
  const p = db.prepare('SELECT * FROM propuestas WHERE id = ?').get(Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'No encontrada' });
  const estado = req.body?.estado, nota = limpio(req.body?.nota, 400) || null;
  if (!ESTADOS.includes(estado) || estado === 'recibida') return res.status(400).json({ error: 'Estado no válido' });
  if (estado === 'rechazada' && !nota) return res.status(400).json({ error: 'Indica el motivo del rechazo' });
  let votacion = p.votacion_id;
  if (estado === 'en_votacion') {
    votacion = Number(req.body?.votacion_id) || null;
    if (votacion && !db.prepare("SELECT 1 FROM encuestas WHERE id = ? AND tipo = 'votacion'").get(votacion)) return res.status(400).json({ error: 'La votación indicada no existe' });
  }
  transaccion(() => {
    db.prepare('UPDATE propuestas SET estado = ?, motivo_rechazo = ?, votacion_id = ?, actualizada_en = ? WHERE id = ?').run(estado, estado === 'rechazada' ? nota : null, votacion, ahoraISO(), p.id);
    db.prepare('INSERT INTO propuesta_historial (propuesta_id, estado, nota, usuario_id) VALUES (?, ?, ?, ?)').run(p.id, estado, nota, req.equipo.id);
  });
  auditar(req.equipo.id, 'propuesta_estado', 'propuesta', p.id, { estado });
  res.json({ ok: true });
});

participacionIntranet.get('/denuncias', requerirEquipo(...MODERAN), (_req, res) => {
  res.json(db.prepare(
    `SELECT c.id, c.texto, c.oculto, c.creado_en, c.propuesta_id, COUNT(d.id) AS denuncias
       FROM comentarios c JOIN denuncias d ON d.comentario_id = c.id AND d.resuelta = 0 GROUP BY c.id ORDER BY denuncias DESC, c.creado_en DESC LIMIT 100`,
  ).all());
});
participacionIntranet.post('/comentarios/:id/moderar', requerirEquipo(...MODERAN), (req, res) => {
  const c = db.prepare('SELECT id FROM comentarios WHERE id = ?').get(Number(req.params.id));
  if (!c) return res.status(404).json({ error: 'No existe' });
  db.prepare('UPDATE comentarios SET oculto = ? WHERE id = ?').run(req.body?.ocultar === false ? 0 : 1, c.id);
  db.prepare('UPDATE denuncias SET resuelta = 1 WHERE comentario_id = ?').run(c.id);
  auditar(req.equipo.id, req.body?.ocultar === false ? 'comentario_mostrar' : 'comentario_ocultar', 'comentario', c.id);
  res.json({ ok: true });
});

// ---------- Eventos ----------
const lugaresLibres = (e) => (e.aforo ? Math.max(0, e.aforo - db.prepare('SELECT COUNT(*) AS n FROM eventos_inscripciones WHERE evento_id = ?').get(e.id).n) : null);
const eventoPublico = (e) => ({ id: e.id, titulo: e.titulo, descripcion: e.descripcion, lugar: e.lugar, inicio: e.inicio, fin: e.fin, estado: e.estado, plazas_libres: lugaresLibres(e), con_aforo: !!e.aforo });

participacionPublica.get('/eventos', (_req, res) => {
  res.json(db.prepare("SELECT * FROM eventos WHERE estado IN ('publicado','cancelado') ORDER BY inicio DESC LIMIT 100").all().map(eventoPublico));
});
participacionPublica.get('/eventos/:id', (req, res) => {
  const e = db.prepare("SELECT * FROM eventos WHERE id = ? AND estado IN ('publicado','cancelado')").get(Number(req.params.id));
  if (!e) return res.status(404).json({ error: 'Evento no encontrado' });
  res.json(eventoPublico(e));
});
participacionPublica.post('/eventos/:id/inscripcion', (req, res) => {
  if (!limitar(`ev:${req.ip}`, 20, 3600_000)) return res.status(429).json({ error: 'Demasiados intentos' });
  const e = db.prepare("SELECT * FROM eventos WHERE id = ? AND estado = 'publicado'").get(Number(req.params.id));
  if (!e || e.inicio < ahoraISO()) return res.status(404).json({ error: 'Este evento no admite inscripciones' });
  const nombre = limpio(req.body?.nombre, 80), email = limpio(req.body?.email, 254).toLowerCase();
  if (!nombre || !esEmail(email)) return res.status(400).json({ error: 'Revisa nombre y correo' });
  if (req.body?.acepta !== true) return res.status(400).json({ error: 'Hace falta aceptar el tratamiento de tus datos para el evento' });
  const ya = db.prepare('SELECT 1 FROM eventos_inscripciones WHERE evento_id = ? AND email = ?').get(e.id, email);
  if (!ya) {
    if (lugaresLibres(e) === 0) return res.status(409).json({ error: 'El aforo está completo' });
    db.prepare('INSERT INTO eventos_inscripciones (evento_id, nombre, email) VALUES (?, ?, ?)').run(e.id, nombre, email);
  }
  res.status(201).json({ ok: true, mensaje: 'Inscripción registrada. Te esperamos.' });
});

const EVENTOS_ROLES = ['admin', 'moderador', 'gestor'];
function datosEvento(b) {
  const titulo = limpio(b?.titulo, 150);
  const inicio = new Date(b?.inicio); const fin = b?.fin ? new Date(b.fin) : null;
  if (!titulo || Number.isNaN(inicio.getTime())) throw new Error('Faltan el título o la fecha de inicio');
  if (fin && (Number.isNaN(fin.getTime()) || fin < inicio)) throw new Error('La fecha de fin no es válida');
  const aforo = b?.aforo ? Number(b.aforo) : null;
  if (aforo !== null && (!Number.isInteger(aforo) || aforo < 1)) throw new Error('Aforo no válido');
  return { titulo, descripcion: String(b?.descripcion ?? '').trim().slice(0, 2000) || null, lugar: limpio(b?.lugar, 150) || null, inicio: inicio.toISOString(), fin: fin ? fin.toISOString() : null, aforo };
}
participacionIntranet.get('/eventos', requerirEquipo(...EVENTOS_ROLES), (_req, res) => {
  res.json(db.prepare('SELECT e.*, (SELECT COUNT(*) FROM eventos_inscripciones i WHERE i.evento_id = e.id) AS inscritos FROM eventos e ORDER BY inicio DESC').all());
});
participacionIntranet.post('/eventos', requerirEquipo(...EVENTOS_ROLES), (req, res) => {
  try {
    const d = datosEvento(req.body);
    const r = db.prepare('INSERT INTO eventos (titulo, descripcion, lugar, inicio, fin, aforo) VALUES (?, ?, ?, ?, ?, ?)').run(d.titulo, d.descripcion, d.lugar, d.inicio, d.fin, d.aforo);
    auditar(req.equipo.id, 'crear_evento', 'evento', Number(r.lastInsertRowid));
    res.status(201).json({ ok: true, id: Number(r.lastInsertRowid) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
participacionIntranet.patch('/eventos/:id', requerirEquipo(...EVENTOS_ROLES), (req, res) => {
  const e = db.prepare('SELECT * FROM eventos WHERE id = ?').get(Number(req.params.id));
  if (!e) return res.status(404).json({ error: 'No encontrado' });
  try {
    if (req.body?.estado) {
      if (!['borrador', 'publicado', 'cancelado'].includes(req.body.estado)) throw new Error('Estado no válido');
      db.prepare('UPDATE eventos SET estado = ? WHERE id = ?').run(req.body.estado, e.id);
    } else {
      const d = datosEvento({ ...e, ...req.body });
      db.prepare('UPDATE eventos SET titulo = ?, descripcion = ?, lugar = ?, inicio = ?, fin = ?, aforo = ? WHERE id = ?').run(d.titulo, d.descripcion, d.lugar, d.inicio, d.fin, d.aforo, e.id);
    }
    auditar(req.equipo.id, 'editar_evento', 'evento', e.id);
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});
participacionIntranet.get('/eventos/:id/inscritos', requerirEquipo(...EVENTOS_ROLES), (req, res) => {
  auditar(req.equipo.id, 'ver_inscritos_evento', 'evento', Number(req.params.id));
  res.json(db.prepare('SELECT nombre, email, creada_en FROM eventos_inscripciones WHERE evento_id = ? ORDER BY creada_en').all(Number(req.params.id)));
});

// ---------- Noticias ----------
participacionPublica.get('/noticias', (_req, res) => {
  res.json(db.prepare('SELECT id, titulo, resumen, imagen, fecha FROM noticias WHERE publicada = 1 ORDER BY fecha DESC LIMIT 50').all());
});
participacionPublica.get('/noticias/:id', (req, res) => {
  const n = db.prepare('SELECT id, titulo, resumen, cuerpo, imagen, fecha FROM noticias WHERE id = ? AND publicada = 1').get(Number(req.params.id));
  if (!n) return res.status(404).json({ error: 'Noticia no encontrada' });
  res.json(n);
});
participacionIntranet.get('/noticias', requerirEquipo(...MODERAN), (_req, res) => res.json(db.prepare('SELECT id, titulo, resumen, cuerpo, imagen, publicada, fecha FROM noticias ORDER BY fecha DESC').all()));
function datosNoticia(b) {
  const titulo = limpio(b?.titulo, 150), cuerpo = String(b?.cuerpo ?? '').trim().slice(0, 20000);
  if (!titulo || !cuerpo) throw new Error('Faltan el título o el texto');
  const imagen = b?.imagen ? String(b.imagen) : null;
  if (imagen && !/^\/media\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(imagen)) throw new Error('Imagen no válida');
  return { titulo, resumen: limpio(b?.resumen, 300) || null, cuerpo, imagen, publicada: b?.publicada ? 1 : 0 };
}
participacionIntranet.post('/noticias', requerirEquipo(...MODERAN), (req, res) => {
  try {
    const d = datosNoticia(req.body);
    const r = db.prepare('INSERT INTO noticias (titulo, resumen, cuerpo, imagen, publicada, autor_id) VALUES (?, ?, ?, ?, ?, ?)').run(d.titulo, d.resumen, d.cuerpo, d.imagen, d.publicada, req.equipo.id);
    auditar(req.equipo.id, 'crear_noticia', 'noticia', Number(r.lastInsertRowid));
    res.status(201).json({ ok: true, id: Number(r.lastInsertRowid) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
participacionIntranet.patch('/noticias/:id', requerirEquipo(...MODERAN), (req, res) => {
  const n = db.prepare('SELECT * FROM noticias WHERE id = ?').get(Number(req.params.id));
  if (!n) return res.status(404).json({ error: 'No encontrada' });
  try {
    const d = datosNoticia({ ...n, ...req.body });
    db.prepare('UPDATE noticias SET titulo = ?, resumen = ?, cuerpo = ?, imagen = ?, publicada = ? WHERE id = ?').run(d.titulo, d.resumen, d.cuerpo, d.imagen, d.publicada, n.id);
    auditar(req.equipo.id, 'editar_noticia', 'noticia', n.id);
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
participacionIntranet.delete('/noticias/:id', requerirEquipo(...MODERAN), (req, res) => {
  db.prepare('DELETE FROM noticias WHERE id = ?').run(Number(req.params.id));
  auditar(req.equipo.id, 'borrar_noticia', 'noticia', Number(req.params.id));
  res.json({ ok: true });
});

// ---------- Voluntariado ----------
participacionPublica.post('/voluntariado', (req, res) => {
  if (!limitar(`vol:${req.ip}`, 5, 3600_000)) return res.status(429).json({ error: 'Demasiados intentos. Prueba más tarde.' });
  const b = req.body ?? {};
  const nombre = limpio(b.nombre, 80), email = limpio(b.email, 254).toLowerCase();
  const errores = {};
  if (!nombre) errores.nombre = 'Escribe tu nombre';
  if (!esEmail(email)) errores.email = 'Correo no válido';
  if (!AREAS_VOLUNTARIADO.includes(b.area)) errores.area = 'Elige un área';
  if (b.acepta !== true) errores.acepta = 'Hace falta aceptar el tratamiento de tus datos';
  if (Object.keys(errores).length) return res.status(400).json({ error: 'Revisa el formulario', errores });
  if (!db.prepare('SELECT 1 FROM voluntarios WHERE email = ? AND area = ?').get(email, b.area)) {
    db.prepare('INSERT INTO voluntarios (nombre, email, telefono, area, mensaje) VALUES (?, ?, ?, ?, ?)').run(nombre, email, limpio(b.telefono, 30) || null, b.area, String(b.mensaje ?? '').trim().slice(0, 800) || null);
  }
  res.status(201).json({ ok: true, mensaje: 'Gracias por ofrecerte. Alguien del equipo te escribirá.' });
});
const VOL_ROLES = ['admin', 'moderador', 'gestor'];
participacionIntranet.get('/voluntarios', requerirEquipo(...VOL_ROLES), (req, res) => {
  const estado = ['nuevo', 'contactado', 'incorporado', 'descartado'].includes(req.query.estado) ? req.query.estado : 'nuevo';
  res.json(db.prepare('SELECT id, nombre, email, telefono, area, mensaje, estado, creada_en FROM voluntarios WHERE estado = ? ORDER BY creada_en DESC LIMIT 300').all(estado));
});
participacionIntranet.post('/voluntarios/:id/estado', requerirEquipo(...VOL_ROLES), (req, res) => {
  if (!['nuevo', 'contactado', 'incorporado', 'descartado'].includes(req.body?.estado)) return res.status(400).json({ error: 'Estado no válido' });
  db.prepare('UPDATE voluntarios SET estado = ? WHERE id = ?').run(req.body.estado, Number(req.params.id));
  auditar(req.equipo.id, 'voluntario_estado', 'voluntario', Number(req.params.id), { estado: req.body.estado });
  res.json({ ok: true });
});

// ---------- Consultas y votaciones: resultados públicos ----------
participacionPublica.get('/consultas', (_req, res) => {
  const filas = db.prepare(
    `SELECT id, titulo, descripcion, tipo, estado, cierra_en, vinculante, quorum, propuesta_id FROM encuestas
      WHERE tipo = 'votacion' OR resultados_publicos = 1 ORDER BY (estado = 'abierta') DESC, creada_en DESC LIMIT 100`,
  ).all().filter((e) => e.estado !== 'borrador');
  res.json(filas.map((e) => ({ ...e, vinculante: !!e.vinculante })));
});
participacionPublica.get('/consultas/:id', (req, res) => {
  const e = db.prepare('SELECT * FROM encuestas WHERE id = ?').get(Number(req.params.id));
  if (!e || e.estado === 'borrador' || !(e.tipo === 'votacion' || e.resultados_publicos)) return res.status(404).json({ error: 'Consulta no encontrada' });
  // Los resultados solo se publican cuando la consulta está cerrada y el equipo ha marcado que sean públicos
  if (e.estado !== 'cerrada' || !e.resultados_publicos) {
    return res.json({ id: e.id, titulo: e.titulo, descripcion: e.descripcion, tipo: e.tipo, estado: e.estado, vinculante: !!e.vinculante, quorum: e.quorum, cierra_en: e.cierra_en, resultados_pendientes: true });
  }
  res.json(calcularResultados(e));
});

// ---------- Transparencia con datos ----------
participacionPublica.get('/transparencia', (_req, res) => {
  const n = (sql, ...a) => db.prepare(sql).get(...a).n;
  const porEstado = Object.fromEntries(db.prepare(`SELECT estado, COUNT(*) AS n FROM propuestas WHERE estado IN (${PUBLICOS.map(() => '?').join(',')}) GROUP BY estado`).all(...PUBLICOS).map((r) => [r.estado, r.n]));
  res.json({
    actualizado: ahoraISO(),
    afiliados: n("SELECT COUNT(*) AS n FROM personas WHERE tipo = 'afiliado' AND estado = 'activo'"),
    simpatizantes: n("SELECT COUNT(*) AS n FROM personas WHERE tipo = 'simpatizante' AND estado = 'activo'"),
    necesidades_recogidas: n("SELECT COUNT(*) AS n FROM propuestas WHERE estado <> 'rechazada'"),
    propuestas_publicas: Object.values(porEstado).reduce((a, b) => a + b, 0), propuestas_por_estado: porEstado,
    propuestas_aprobadas: (porEstado.aprobada || 0) + (porEstado.en_marcha || 0),
    consultas_cerradas: n("SELECT COUNT(*) AS n FROM encuestas WHERE estado = 'cerrada' AND (tipo = 'votacion' OR resultados_publicos = 1)"),
    eventos_realizados: n("SELECT COUNT(*) AS n FROM eventos WHERE estado = 'publicado' AND inicio < ?", ahoraISO()),
    voluntarios: n("SELECT COUNT(*) AS n FROM voluntarios WHERE estado IN ('contactado','incorporado')"),
  });
});
