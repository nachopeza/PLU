// Portal del afiliado, parte 2: inicio, preferencias, eventos, descarga de datos y Brújula PLU.
// Más el panel agregado (anónimo) de la Brújula para el equipo.
import { Router } from 'express';
import { db } from './db.js';
import { limitar } from './seguridad.js';
import { auditar, requerirEquipo, requerirPersona } from './sesion.js';
import { ahoraISO, formatoNumero, carneVigente } from './servicios.js';
import { limpio } from './validar.js';
import { AREAS_INTERES, EJES, ESCALA, PREGUNTAS, REFERENCIA, VERSION_CONSENTIMIENTO, VERSION_TEST, calcular } from './brujula.js';

export const perfilPortal = Router();
export const perfilIntranet = Router();
const activo = (req, res) => (req.persona.estado === 'activo' ? true : (res.status(403).json({ error: 'Tu cuenta está suspendida' }), false));
const jsonSeguro = (t, defecto) => { try { return JSON.parse(t); } catch { return defecto; } };

const avisosActivos = (id) => !!db.prepare("SELECT otorgado FROM consentimientos WHERE persona_id = ? AND finalidad = 'novedades' ORDER BY id DESC LIMIT 1").get(id)?.otorgado;
const plazas = (e) => (e.aforo ? Math.max(0, e.aforo - db.prepare('SELECT COUNT(*) AS n FROM eventos_inscripciones WHERE evento_id = ?').get(e.id).n) : null);

// ---------- Inicio ----------
perfilPortal.get('/resumen', requerirPersona(), (req, res) => {
  const id = req.persona.id, ahora = ahoraISO();
  const count = (sql, ...a) => db.prepare(sql).get(...a).n;
  const eventos = db.prepare("SELECT * FROM eventos WHERE estado = 'publicado' AND inicio >= ? ORDER BY inicio LIMIT 3").all(ahora).map((e) => ({
    id: e.id, titulo: e.titulo, lugar: e.lugar, inicio: e.inicio, plazas_libres: plazas(e),
    inscrito: !!db.prepare('SELECT 1 FROM eventos_inscripciones WHERE evento_id = ? AND email = ?').get(e.id, req.persona.email),
  }));
  const propuestas = db.prepare(
    `SELECT p.id, p.titulo, p.area, p.estado,
            (SELECT COUNT(*) FROM propuesta_apoyos a WHERE a.propuesta_id = p.id) AS apoyos,
            EXISTS (SELECT 1 FROM propuesta_apoyos a WHERE a.propuesta_id = p.id AND a.persona_id = ?) AS apoyada
       FROM propuestas p WHERE p.estado IN ('en_estudio','en_debate','en_votacion','aprobada','en_marcha')
      ORDER BY apoyos DESC, p.creada_en DESC LIMIT 4`,
  ).all(id).map((p) => ({ ...p, apoyada: !!p.apoyada }));
  res.json({
    encuestas_pendientes: count(
      `SELECT COUNT(*) AS n FROM encuestas e WHERE e.estado = 'abierta' AND (e.cierra_en IS NULL OR e.cierra_en > ?)
         AND (e.ambito_territorio_id IS NULL OR e.ambito_territorio_id = ?)
         AND NOT EXISTS (SELECT 1 FROM participaciones p WHERE p.encuesta_id = e.id AND p.persona_id = ?)`, ahora, req.persona.territorio_id, id),
    solicitudes_abiertas: count("SELECT COUNT(*) AS n FROM solicitudes WHERE persona_id = ? AND estado IN ('abierta','en_revision')", id),
    apoyos: count('SELECT COUNT(*) AS n FROM propuesta_apoyos WHERE persona_id = ?', id),
    comentarios: count('SELECT COUNT(*) AS n FROM comentarios WHERE persona_id = ? AND oculto = 0', id)
      + count('SELECT COUNT(*) AS n FROM noticia_comentarios WHERE persona_id = ?', id),
    brujula_hecha: !!db.prepare('SELECT 1 FROM brujula WHERE persona_id = ?').get(id),
    intereses: jsonSeguro(db.prepare('SELECT areas_json FROM intereses_persona WHERE persona_id = ?').get(id)?.areas_json, []),
    avisos: avisosActivos(id),
    eventos, propuestas,
    noticias: db.prepare('SELECT id, titulo, fecha, imagen FROM noticias WHERE publicada = 1 ORDER BY fecha DESC LIMIT 3').all(),
  });
});

// ---------- Preferencias y sesiones ----------
perfilPortal.post('/preferencias', requerirPersona(), (req, res) => {
  if (typeof req.body?.avisos !== 'boolean') return res.status(400).json({ error: 'Indica si quieres recibir avisos' });
  if (avisosActivos(req.persona.id) !== req.body.avisos) {
    db.prepare("INSERT INTO consentimientos (persona_id, finalidad, version_texto, otorgado) VALUES (?, 'novedades', 'portal-v1', ?)").run(req.persona.id, req.body.avisos ? 1 : 0);
  }
  res.json({ ok: true, avisos: req.body.avisos });
});
perfilPortal.post('/sesiones/cerrar-otras', requerirPersona(), (req, res) => {
  const r = db.prepare("DELETE FROM sesiones WHERE tipo = 'persona' AND sujeto_id = ? AND id <> ?").run(req.persona.id, req.persona.sesion_id);
  res.json({ ok: true, cerradas: Number(r.changes) });
});

// ---------- Eventos desde el portal (sin reescribir nombre y correo) ----------
perfilPortal.get('/eventos', requerirPersona(), (req, res) => {
  res.json(db.prepare("SELECT * FROM eventos WHERE estado = 'publicado' AND inicio >= ? ORDER BY inicio LIMIT 50").all(ahoraISO()).map((e) => ({
    id: e.id, titulo: e.titulo, descripcion: e.descripcion, lugar: e.lugar, inicio: e.inicio, fin: e.fin, plazas_libres: plazas(e), con_aforo: !!e.aforo,
    inscrito: !!db.prepare('SELECT 1 FROM eventos_inscripciones WHERE evento_id = ? AND email = ?').get(e.id, req.persona.email),
  })));
});
perfilPortal.post('/eventos/:id/inscripcion', requerirPersona(), (req, res) => {
  if (!activo(req, res)) return;
  if (!limitar(`pev:${req.persona.id}`, 20, 3600_000)) return res.status(429).json({ error: 'Demasiados intentos' });
  const e = db.prepare("SELECT * FROM eventos WHERE id = ? AND estado = 'publicado'").get(Number(req.params.id));
  if (!e || e.inicio < ahoraISO()) return res.status(404).json({ error: 'Este evento no admite inscripciones' });
  const ya = db.prepare('SELECT 1 FROM eventos_inscripciones WHERE evento_id = ? AND email = ?').get(e.id, req.persona.email);
  if (!ya) {
    if (plazas(e) === 0) return res.status(409).json({ error: 'El aforo está completo' });
    db.prepare('INSERT INTO eventos_inscripciones (evento_id, nombre, email) VALUES (?, ?, ?)').run(e.id, `${req.persona.nombre} ${req.persona.apellidos}`.slice(0, 80), req.persona.email);
  }
  res.status(201).json({ ok: true, plazas_libres: plazas(e) });
});
perfilPortal.post('/eventos/:id/cancelar', requerirPersona(), (req, res) => {
  db.prepare('DELETE FROM eventos_inscripciones WHERE evento_id = ? AND email = ?').run(Number(req.params.id), req.persona.email);
  res.json({ ok: true });
});

// ---------- Derecho de acceso y portabilidad: todo lo que PLU guarda de ti ----------
perfilPortal.get('/mis-datos.json', requerirPersona(), (req, res) => {
  if (!limitar(`pdatos:${req.persona.id}`, 10, 3600_000)) return res.status(429).json({ error: 'Demasiadas descargas' });
  const id = req.persona.id;
  const p = db.prepare('SELECT * FROM personas WHERE id = ?').get(id);
  const t = db.prepare('SELECT nombre FROM territorios WHERE id = ?').get(p.territorio_id);
  const todo = {
    generado_en: ahoraISO(),
    aviso: 'Copia de los datos que la Plataforma Liberal Unida guarda sobre ti. El documento de identidad se guarda cifrado y no se incluye aquí.',
    perfil: {
      nombre: p.nombre, apellidos: p.apellidos, email: p.email, telefono: p.telefono, fecha_nacimiento: p.fecha_nacimiento, direccion: p.direccion,
      poblacion: p.poblacion, codigo_postal: p.codigo_postal, provincia: t?.nombre, ocupacion: p.ocupacion, situacion_laboral: p.situacion_laboral, sector: p.sector,
      numero_afiliado: formatoNumero(p.numero_afiliado), estado: p.estado, fecha_alta: p.fecha_alta,
    },
    carne_vigente: (() => { const c = carneVigente(id); return c ? { version: c.version, emitido_en: c.emitido_en, valido_hasta: c.valido_hasta } : null; })(),
    consentimientos: db.prepare('SELECT finalidad, version_texto, otorgado, fecha FROM consentimientos WHERE persona_id = ? ORDER BY id').all(id),
    movimientos: db.prepare('SELECT tipo, motivo, fecha FROM movimientos_afiliacion WHERE persona_id = ? ORDER BY fecha, id').all(id),
    solicitudes: db.prepare('SELECT tipo, estado, detalle, resolucion, creada_en, resuelta_en FROM solicitudes WHERE persona_id = ? ORDER BY creada_en').all(id),
    propuestas_apoyadas: db.prepare('SELECT a.propuesta_id, pr.titulo, a.fecha FROM propuesta_apoyos a JOIN propuestas pr ON pr.id = a.propuesta_id WHERE a.persona_id = ?').all(id),
    comentarios: db.prepare('SELECT propuesta_id, texto, creado_en FROM comentarios WHERE persona_id = ?').all(id),
    comentarios_noticias: db.prepare('SELECT noticia_id, texto, creado_en FROM noticia_comentarios WHERE persona_id = ?').all(id),
    encuestas_en_las_que_has_participado: db.prepare('SELECT e.titulo, pa.fecha FROM participaciones pa JOIN encuestas e ON e.id = pa.encuesta_id WHERE pa.persona_id = ?').all(id),
    eventos: db.prepare('SELECT e.titulo, e.inicio, i.creada_en FROM eventos_inscripciones i JOIN eventos e ON e.id = i.evento_id WHERE i.email = ?').all(p.email),
    brujula: (() => { const b = db.prepare('SELECT ejes_json, afinidad, version_test, consentido_en FROM brujula WHERE persona_id = ?').get(id); return b ? { ejes: jsonSeguro(b.ejes_json, {}), afinidad: b.afinidad, version_test: b.version_test, consentido_en: b.consentido_en } : null; })(),
    intereses: jsonSeguro(db.prepare('SELECT areas_json FROM intereses_persona WHERE persona_id = ?').get(id)?.areas_json, []),
  };
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="mis-datos-plu-${p.numero_afiliado}.json"`);
  res.send(JSON.stringify(todo, null, 2));
});

// ---------- Brújula PLU ----------
perfilPortal.get('/brujula', requerirPersona(), (req, res) => {
  const b = db.prepare('SELECT ejes_json, afinidad, version_test, actualizado_en FROM brujula WHERE persona_id = ?').get(req.persona.id);
  res.json({
    version: VERSION_TEST, escala: ESCALA, areas: AREAS_INTERES,
    ejes: Object.fromEntries(Object.entries(EJES).map(([k, v]) => [k, { ...v, referencia: REFERENCIA[k] }])),
    preguntas: PREGUNTAS.map((p) => ({ id: p.id, texto: p.texto, eje: p.eje })),
    mio: b ? { ejes: jsonSeguro(b.ejes_json, {}), afinidad: b.afinidad, fecha: b.actualizado_en, version: b.version_test } : null,
    intereses: jsonSeguro(db.prepare('SELECT areas_json FROM intereses_persona WHERE persona_id = ?').get(req.persona.id)?.areas_json, []),
  });
});
// Calcula siempre; solo guarda si la persona lo pide Y da su consentimiento explícito
perfilPortal.post('/brujula', requerirPersona(), (req, res) => {
  if (!activo(req, res)) return;
  if (!limitar(`pbru:${req.persona.id}`, 30, 3600_000)) return res.status(429).json({ error: 'Demasiados intentos' });
  const r = calcular(req.body?.respuestas);
  if (!r.afinidad && r.afinidad !== 0) return res.status(400).json({ error: 'Responde al menos dos preguntas de algún apartado para ver tu resultado' });
  let guardado = false;
  if (req.body?.guardar === true) {
    if (req.body?.consentimiento !== true) return res.status(400).json({ error: 'Para guardar tu resultado necesitamos tu consentimiento expreso' });
    const ahora = ahoraISO();
    db.prepare(
      `INSERT INTO brujula (persona_id, ejes_json, afinidad, version_test, version_consentimiento, consentido_en, actualizado_en) VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(persona_id) DO UPDATE SET ejes_json = excluded.ejes_json, afinidad = excluded.afinidad, version_test = excluded.version_test,
         version_consentimiento = excluded.version_consentimiento, consentido_en = excluded.consentido_en, actualizado_en = excluded.actualizado_en`,
    ).run(req.persona.id, JSON.stringify(r.ejes), r.afinidad, VERSION_TEST, VERSION_CONSENTIMIENTO, ahora, ahora);
    auditar(null, 'brujula_guardada', 'persona', req.persona.id, null);
    guardado = true;
  }
  res.json({ ok: true, ejes: r.ejes, afinidad: r.afinidad, guardado });
});
// Retirar el consentimiento = borrar el resultado
perfilPortal.post('/brujula/borrar', requerirPersona(), (req, res) => {
  const r = db.prepare('DELETE FROM brujula WHERE persona_id = ?').run(req.persona.id);
  if (Number(r.changes)) auditar(null, 'brujula_borrada', 'persona', req.persona.id, null);
  res.json({ ok: true });
});
perfilPortal.post('/intereses', requerirPersona(), (req, res) => {
  if (!activo(req, res)) return;
  const lista = Array.isArray(req.body?.areas) ? [...new Set(req.body.areas.map((a) => limpio(a, 60)))] : null;
  if (!lista || lista.some((a) => !AREAS_INTERES.includes(a))) return res.status(400).json({ error: 'Áreas no válidas' });
  if (lista.length > 6) return res.status(400).json({ error: 'Elige un máximo de 6 áreas' });
  if (!lista.length) db.prepare('DELETE FROM intereses_persona WHERE persona_id = ?').run(req.persona.id);
  else db.prepare(
    `INSERT INTO intereses_persona (persona_id, areas_json, actualizado_en) VALUES (?,?,?)
     ON CONFLICT(persona_id) DO UPDATE SET areas_json = excluded.areas_json, actualizado_en = excluded.actualizado_en`,
  ).run(req.persona.id, JSON.stringify(lista), ahoraISO());
  res.json({ ok: true, intereses: lista });
});

// ---------- Agregado anónimo para el equipo ----------
const N_MIN = 5; // nunca se muestran grupos de menos de 5 personas
perfilIntranet.get('/brujula/agregado', requerirEquipo('admin', 'gestor', 'coordinador', 'auditor'), (req, res) => {
  const filas = db.prepare(
    `SELECT b.ejes_json, b.afinidad, p.territorio_id, t.nombre AS provincia
       FROM brujula b JOIN personas p ON p.id = b.persona_id AND p.estado IN ('activo','suspendido') LEFT JOIN territorios t ON t.id = p.territorio_id`,
  ).all().map((f) => ({ ...f, ejes: jsonSeguro(f.ejes_json, {}) }));
  const resumen = (lista) => {
    const ejes = {};
    for (const e of Object.keys(EJES)) {
      const v = lista.map((f) => f.ejes[e]).filter((x) => typeof x === 'number');
      if (v.length >= N_MIN) ejes[e] = { media: Math.round(v.reduce((a, b) => a + b, 0) / v.length), izquierda: v.filter((x) => x < -33).length, centro: v.filter((x) => x >= -33 && x <= 33).length, derecha: v.filter((x) => x > 33).length, personas: v.length };
    }
    const af = lista.map((f) => f.afinidad).filter((x) => typeof x === 'number');
    return { personas: lista.length, afinidad_media: af.length ? Math.round(af.reduce((a, b) => a + b, 0) / af.length) : null, ejes };
  };
  const out = { minimo: N_MIN, ejes: EJES, total_suficiente: filas.length >= N_MIN, global: null, provincias: [], intereses: [] };
  if (filas.length >= N_MIN) {
    out.global = resumen(filas);
    const por = new Map();
    for (const f of filas) { if (!por.has(f.provincia)) por.set(f.provincia, []); por.get(f.provincia).push(f); }
    out.provincias = [...por.entries()].filter(([, l]) => l.length >= N_MIN).map(([nombre, l]) => ({ provincia: nombre, ...resumen(l) })).sort((a, b) => b.personas - a.personas);
  }
  const ints = db.prepare("SELECT i.areas_json FROM intereses_persona i JOIN personas p ON p.id = i.persona_id AND p.estado IN ('activo','suspendido')").all();
  if (ints.length >= N_MIN) {
    const c = {};
    for (const i of ints) for (const a of jsonSeguro(i.areas_json, [])) c[a] = (c[a] ?? 0) + 1;
    out.intereses = Object.entries(c).filter(([, n]) => n >= N_MIN).map(([area, personas]) => ({ area, personas })).sort((a, b) => b.personas - a.personas);
    out.intereses_personas = ints.length;
  }
  auditar(req.equipo.id, 'ver_brujula_agregado', 'brujula', null, null);
  res.json(out);
});
