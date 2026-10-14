// Encuestas: creación y resultados (equipo), respuesta de afiliados (portal) y enlaces de un solo uso para simpatizantes.
import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { db } from './db.js';
import { limitar, sha256, tokenAleatorio } from './seguridad.js';
import { auditar, requerirEquipo } from './sesion.js';
import { ahoraISO, hoyISO, transaccion } from './servicios.js';
import { limpio } from './validar.js';

export const encuestasIntranet = Router();
export const encuestasPublicas = Router();
const GESTIONAN = ['admin', 'moderador'];
const MINIMO_ANONIMA = 5; // por debajo de este número no se muestran resultados de una encuesta anónima

// ---------- Validación y lectura ----------
function validarVotacion(d, pr) {
  if (d.tipo !== 'votacion') return;
  if (pr.length !== 1 || pr[0].tipo !== 'opcion_unica') throw new Error('Una votación tiene una sola pregunta de opción única');
  d.anonima = 1; d.solo_afiliados = 1;
}

function validarPreguntas(lista) {
  if (!Array.isArray(lista) || lista.length < 1 || lista.length > 30) throw new Error('La encuesta necesita entre 1 y 30 preguntas');
  return lista.map((q, i) => {
    const texto = limpio(q?.texto, 300);
    if (!texto) throw new Error(`La pregunta ${i + 1} no tiene texto`);
    const tipo = q?.tipo;
    let opciones = null;
    if (tipo === 'opcion_unica' || tipo === 'opcion_multiple') {
      const ops = Array.isArray(q.opciones) ? q.opciones.map((o) => limpio(o, 150)).filter(Boolean) : [];
      if (ops.length < 2 || ops.length > 12 || new Set(ops).size !== ops.length) throw new Error(`La pregunta ${i + 1} necesita entre 2 y 12 opciones distintas`);
      opciones = ops;
    } else if (tipo === 'escala') {
      const min = Number(q.min ?? 1), max = Number(q.max ?? 5);
      if (!Number.isInteger(min) || !Number.isInteger(max) || max <= min || max - min > 10) throw new Error(`La escala de la pregunta ${i + 1} no es válida`);
      opciones = { min, max, etiqueta_min: limpio(q.etiqueta_min, 40), etiqueta_max: limpio(q.etiqueta_max, 40) };
    } else if (tipo !== 'texto') throw new Error(`Tipo de pregunta no válido (${i + 1})`);
    return { tipo, texto, opciones, obligatoria: q.obligatoria === false ? 0 : 1 };
  });
}

function leerPreguntas(encuestaId) {
  return db.prepare('SELECT id, orden, tipo, texto, opciones_json, obligatoria FROM preguntas WHERE encuesta_id = ? ORDER BY orden').all(encuestaId)
    .map((q) => ({ id: q.id, tipo: q.tipo, texto: q.texto, obligatoria: !!q.obligatoria, opciones: q.opciones_json ? JSON.parse(q.opciones_json) : null }));
}

function guardarPreguntas(encuestaId, lista) {
  const ins = db.prepare('INSERT INTO preguntas (encuesta_id, orden, tipo, texto, opciones_json, obligatoria) VALUES (?, ?, ?, ?, ?, ?)');
  lista.forEach((q, i) => ins.run(encuestaId, i + 1, q.tipo, q.texto, q.opciones ? JSON.stringify(q.opciones) : null, q.obligatoria));
}

function datosEncuesta(body) {
  const titulo = limpio(body?.titulo, 150);
  if (!titulo) throw new Error('Falta el título');
  let cierra = null;
  if (body?.cierra_en) {
    const d = new Date(body.cierra_en);
    if (Number.isNaN(d.getTime())) throw new Error('Fecha de cierre no válida');
    cierra = d.toISOString();
  }
  let ambito = null;
  if (body?.ambito_territorio_id) {
    ambito = Number(body.ambito_territorio_id);
    if (!db.prepare("SELECT 1 FROM territorios WHERE id = ? AND tipo = 'provincia'").get(ambito)) throw new Error('Provincia no válida');
  }
  return {
    titulo, descripcion: limpio(body?.descripcion, 600) || null, ambito, cierra,
    solo_afiliados: body?.solo_afiliados === false ? 0 : 1, anonima: body?.anonima === false ? 0 : 1,
    tipo: body?.tipo === 'votacion' ? 'votacion' : 'encuesta',
    quorum: Number.isInteger(Number(body?.quorum)) && Number(body.quorum) > 0 ? Number(body.quorum) : null,
    vinculante: body?.vinculante ? 1 : 0, resultados_publicos: body?.resultados_publicos ? 1 : 0,
    propuesta_id: Number(body?.propuesta_id) > 0 ? Number(body.propuesta_id) : null,
  };
}

const resumenEncuesta = (e) => ({
  id: e.id, titulo: e.titulo, descripcion: e.descripcion, estado: e.estado, ambito_territorio_id: e.ambito_territorio_id,
  solo_afiliados: !!e.solo_afiliados, anonima: !!e.anonima, cierra_en: e.cierra_en, creada_en: e.creada_en,
  tipo: e.tipo, quorum: e.quorum, vinculante: !!e.vinculante, resultados_publicos: !!e.resultados_publicos, propuesta_id: e.propuesta_id,
});

// ---------- Equipo ----------
encuestasIntranet.get('/encuestas', requerirEquipo(...GESTIONAN, 'auditor'), (_req, res) => {
  const filas = db.prepare(
    `SELECT e.*, t.nombre AS provincia,
            (SELECT COUNT(*) FROM participaciones p WHERE p.encuesta_id = e.id) AS participaciones,
            (SELECT COUNT(*) FROM preguntas q WHERE q.encuesta_id = e.id) AS preguntas
       FROM encuestas e LEFT JOIN territorios t ON t.id = e.ambito_territorio_id ORDER BY e.creada_en DESC`,
  ).all();
  res.json(filas.map((e) => ({ ...resumenEncuesta(e), provincia: e.provincia, participaciones: e.participaciones, preguntas: e.preguntas })));
});

encuestasIntranet.post('/encuestas', requerirEquipo(...GESTIONAN), (req, res) => {
  try {
    const d = datosEncuesta(req.body);
    const pr = validarPreguntas(req.body?.preguntas);
    validarVotacion(d, pr);
    const id = transaccion(() => {
      const r = db.prepare('INSERT INTO encuestas (titulo, descripcion, ambito_territorio_id, solo_afiliados, anonima, cierra_en, creada_por, tipo, quorum, vinculante, resultados_publicos, propuesta_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(d.titulo, d.descripcion, d.ambito, d.solo_afiliados, d.anonima, d.cierra, req.equipo.id, d.tipo, d.quorum, d.vinculante, d.resultados_publicos, d.propuesta_id);
      guardarPreguntas(Number(r.lastInsertRowid), pr);
      return Number(r.lastInsertRowid);
    });
    auditar(req.equipo.id, 'crear_encuesta', 'encuesta', id);
    res.status(201).json({ ok: true, id });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

encuestasIntranet.get('/encuestas/:id', requerirEquipo(...GESTIONAN, 'auditor'), (req, res) => {
  const e = db.prepare('SELECT * FROM encuestas WHERE id = ?').get(Number(req.params.id));
  if (!e) return res.status(404).json({ error: 'No encontrada' });
  res.json({ ...resumenEncuesta(e), preguntas: leerPreguntas(e.id) });
});

encuestasIntranet.patch('/encuestas/:id', requerirEquipo(...GESTIONAN), (req, res) => {
  const e = db.prepare('SELECT * FROM encuestas WHERE id = ?').get(Number(req.params.id));
  if (!e) return res.status(404).json({ error: 'No encontrada' });
  if (e.estado !== 'borrador') return res.status(409).json({ error: 'Solo se puede editar una encuesta en borrador' });
  try {
    const d = datosEncuesta(req.body);
    const pr = validarPreguntas(req.body?.preguntas);
    validarVotacion(d, pr);
    transaccion(() => {
      db.prepare('UPDATE encuestas SET titulo = ?, descripcion = ?, ambito_territorio_id = ?, solo_afiliados = ?, anonima = ?, cierra_en = ?, tipo = ?, quorum = ?, vinculante = ?, resultados_publicos = ?, propuesta_id = ? WHERE id = ?')
        .run(d.titulo, d.descripcion, d.ambito, d.solo_afiliados, d.anonima, d.cierra, d.tipo, d.quorum, d.vinculante, d.resultados_publicos, d.propuesta_id, e.id);
      db.prepare('DELETE FROM preguntas WHERE encuesta_id = ?').run(e.id);
      guardarPreguntas(e.id, pr);
    });
    auditar(req.equipo.id, 'editar_encuesta', 'encuesta', e.id);
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

encuestasIntranet.delete('/encuestas/:id', requerirEquipo(...GESTIONAN), (req, res) => {
  const e = db.prepare('SELECT * FROM encuestas WHERE id = ?').get(Number(req.params.id));
  if (!e) return res.status(404).json({ error: 'No encontrada' });
  if (e.estado !== 'borrador') return res.status(409).json({ error: 'Solo se puede borrar una encuesta en borrador' });
  db.prepare('DELETE FROM encuestas WHERE id = ?').run(e.id);
  auditar(req.equipo.id, 'borrar_encuesta', 'encuesta', e.id);
  res.json({ ok: true });
});

encuestasIntranet.post('/encuestas/:id/estado', requerirEquipo(...GESTIONAN), (req, res) => {
  const e = db.prepare('SELECT * FROM encuestas WHERE id = ?').get(Number(req.params.id));
  if (!e) return res.status(404).json({ error: 'No encontrada' });
  const accion = req.body?.accion;
  if (accion === 'abrir' && e.estado === 'borrador') db.prepare("UPDATE encuestas SET estado = 'abierta', abre_en = ? WHERE id = ?").run(ahoraISO(), e.id);
  else if (accion === 'cerrar' && e.estado === 'abierta') db.prepare("UPDATE encuestas SET estado = 'cerrada' WHERE id = ?").run(e.id);
  else return res.status(409).json({ error: 'Esa acción no es posible en el estado actual' });
  auditar(req.equipo.id, `encuesta_${accion}`, 'encuesta', e.id);
  res.json({ ok: true });
});

function mezclar(a) { for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Calcula los resultados de una encuesta respetando el anonimato (mínimo de participaciones).
export function calcularResultados(e) {
  const total = db.prepare('SELECT COUNT(*) AS n FROM participaciones WHERE encuesta_id = ?').get(e.id).n;
  const directas = db.prepare('SELECT COUNT(*) AS n FROM enlaces_encuesta WHERE encuesta_id = ? AND usado_en IS NOT NULL').get(e.id).n;
  const base = { ...resumenEncuesta(e), participaciones: total, de_enlaces: directas, quorum_alcanzado: e.quorum ? total >= e.quorum : null };
  if (e.anonima && total < MINIMO_ANONIMA) {
    return { ...base, ocultos: true, aviso: `Los resultados de una encuesta anónima se muestran a partir de ${MINIMO_ANONIMA} participaciones, para que nadie pueda deducir lo que votó una persona.` };
  }
  const resultados = leerPreguntas(e.id).map((q) => {
    const filas = db.prepare('SELECT valor FROM respuestas WHERE pregunta_id = ?').all(q.id).map((r) => r.valor);
    if (q.tipo === 'texto') return { ...q, respuestas: mezclar(filas) };
    const cuenta = {};
    if (q.tipo === 'escala') for (let v = q.opciones.min; v <= q.opciones.max; v++) cuenta[v] = 0;
    else for (const o of q.opciones) cuenta[o] = 0;
    for (const v of filas) if (v in cuenta) cuenta[v]++;
    const out = { ...q, cuenta, respondidas: filas.length };
    if (q.tipo === 'escala' && filas.length) out.media = Math.round((filas.reduce((s, v) => s + Number(v), 0) / filas.length) * 100) / 100;
    return out;
  });
  return { ...base, ocultos: false, resultados };
}

encuestasIntranet.get('/encuestas/:id/resultados', requerirEquipo(...GESTIONAN, 'auditor'), (req, res) => {
  const e = db.prepare('SELECT * FROM encuestas WHERE id = ?').get(Number(req.params.id));
  if (!e) return res.status(404).json({ error: 'No encontrada' });
  const r = calcularResultados(e);
  if (!r.ocultos) auditar(req.equipo.id, 'ver_resultados_encuesta', 'encuesta', e.id);
  res.json(r);
});

// Enlaces de un solo uso para simpatizantes (no tienen portal). Se devuelven una sola vez; en la base solo queda el hash.
encuestasIntranet.post('/encuestas/:id/enlaces', requerirEquipo(...GESTIONAN), (req, res) => {
  const e = db.prepare('SELECT * FROM encuestas WHERE id = ?').get(Number(req.params.id));
  if (!e || e.estado !== 'abierta') return res.status(409).json({ error: 'La encuesta debe estar abierta' });
  if (e.solo_afiliados) return res.status(409).json({ error: 'Esta encuesta es solo para afiliados. Desmarca "solo afiliados" en el borrador.' });
  const base = process.env.PLU_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  const personas = db.prepare(
    `SELECT p.id, p.nombre, p.email FROM personas p
      WHERE p.tipo = 'simpatizante' AND p.estado = 'activo'
        AND (SELECT otorgado FROM consentimientos c WHERE c.persona_id = p.id AND c.finalidad = 'novedades' ORDER BY c.id DESC LIMIT 1) = 1
        ${e.ambito_territorio_id ? 'AND p.territorio_id = ' + Number(e.ambito_territorio_id) : ''}
        AND NOT EXISTS (SELECT 1 FROM enlaces_encuesta l WHERE l.encuesta_id = ? AND l.persona_id = p.id)`,
  ).all(e.id);
  const expira = e.cierra_en || new Date(Date.now() + 30 * 86400_000).toISOString();
  const ins = db.prepare('INSERT INTO enlaces_encuesta (encuesta_id, persona_id, token_hash, expira_en) VALUES (?, ?, ?, ?)');
  const lista = transaccion(() => personas.map((p) => {
    const t = tokenAleatorio(24);
    ins.run(e.id, p.id, sha256(t), expira);
    return { nombre: p.nombre, email: p.email, enlace: `${base}/encuesta?t=${t}` };
  }));
  auditar(req.equipo.id, 'generar_enlaces_encuesta', 'encuesta', e.id, { cantidad: lista.length });
  res.json({ ok: true, cantidad: lista.length, enlaces: lista });
});

// ---------- Respuesta (lógica compartida con el portal) ----------
export function encuestaAbierta(e) {
  return e && e.estado === 'abierta' && (!e.cierra_en || e.cierra_en > ahoraISO());
}

// Convierte las respuestas recibidas {preguntaId: valor} en filas válidas o lanza un error con mensaje para la persona.
function validarRespuestas(encuestaId, enviado) {
  const filas = [];
  for (const q of leerPreguntas(encuestaId)) {
    const v = enviado?.[q.id];
    const vacio = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
    if (vacio) { if (q.obligatoria) throw new Error(`Falta responder: ${q.texto}`); continue; }
    if (q.tipo === 'opcion_unica') {
      if (typeof v !== 'string' || !q.opciones.includes(v)) throw new Error(`Respuesta no válida: ${q.texto}`);
      filas.push([q.id, v]);
    } else if (q.tipo === 'opcion_multiple') {
      if (!Array.isArray(v) || new Set(v).size !== v.length || v.some((o) => !q.opciones.includes(o))) throw new Error(`Respuesta no válida: ${q.texto}`);
      v.forEach((o) => filas.push([q.id, o]));
    } else if (q.tipo === 'escala') {
      const n = Number(v);
      if (!Number.isInteger(n) || n < q.opciones.min || n > q.opciones.max) throw new Error(`Respuesta no válida: ${q.texto}`);
      filas.push([q.id, String(n)]);
    } else filas.push([q.id, limpio(v, 1000)]);
  }
  return filas;
}

// Guarda participación y respuestas. En encuestas anónimas la respuesta NO lleva persona_id y la fecha de participación es solo el día.
export function registrarParticipacion(e, personaId, enviado, tokenHash) {
  const filas = validarRespuestas(e.id, enviado);
  if (!filas.length) throw new Error('No hay respuestas');
  transaccion(() => {
    try {
      db.prepare('INSERT INTO participaciones (encuesta_id, persona_id, fecha) VALUES (?, ?, ?)').run(e.id, personaId, hoyISO());
    } catch { throw new Error('Ya has participado en esta encuesta'); }
    const ins = db.prepare('INSERT INTO respuestas (encuesta_id, pregunta_id, valor, persona_id) VALUES (?, ?, ?, ?)');
    for (const [pid, valor] of mezclar([...filas])) ins.run(e.id, pid, valor, e.anonima ? null : personaId);
    if (tokenHash) db.prepare('UPDATE enlaces_encuesta SET usado_en = ? WHERE token_hash = ?').run(hoyISO(), tokenHash);
  });
}

export const encuestaPublica = (e) => ({ id: e.id, titulo: e.titulo, descripcion: e.descripcion, anonima: !!e.anonima, cierra_en: e.cierra_en, preguntas: leerPreguntas(e.id) });

// ---------- Enlace directo (simpatizantes) ----------
function porToken(t) {
  const l = db.prepare('SELECT * FROM enlaces_encuesta WHERE token_hash = ?').get(sha256(String(t)));
  if (!l || l.usado_en || l.expira_en < ahoraISO()) return null;
  const e = db.prepare('SELECT * FROM encuestas WHERE id = ?').get(l.encuesta_id);
  return encuestaAbierta(e) ? { l, e } : null;
}
encuestasPublicas.get('/encuesta-directa/:token', (req, res) => {
  if (!limitar(`enc:${req.ip}`, 60, 15 * 60_000)) return res.status(429).json({ error: 'Demasiados intentos' });
  const r = porToken(req.params.token);
  if (!r) return res.status(404).json({ error: 'Este enlace no es válido, ya se ha usado o la encuesta está cerrada.' });
  res.json(encuestaPublica(r.e));
});
encuestasPublicas.post('/encuesta-directa/:token', (req, res) => {
  if (!limitar(`enc:${req.ip}`, 60, 15 * 60_000)) return res.status(429).json({ error: 'Demasiados intentos' });
  const r = porToken(req.params.token);
  if (!r) return res.status(404).json({ error: 'Este enlace no es válido, ya se ha usado o la encuesta está cerrada.' });
  try { registrarParticipacion(r.e, r.l.persona_id, req.body?.respuestas, r.l.token_hash); } catch (e) { return res.status(400).json({ error: e.message }); }
  res.json({ ok: true, mensaje: 'Gracias por participar.' });
});
