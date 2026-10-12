// Portal del afiliado: acceso, ficha, carné, solicitudes y encuestas.
import { Router } from 'express';
import { db } from './db.js';
import { hashPassword, limitar, verificarPassword } from './seguridad.js';
import { cerrarSesionPersona, iniciarSesionPersona, requerirPersona } from './sesion.js';
import { ahoraISO, carneVigente, formatoNumero } from './servicios.js';
import { datosCarne, generarCarnePdf } from './carne.js';
import { encuestaAbierta, encuestaPublica, registrarParticipacion } from './rutas-encuestas.js';
import { limpio } from './validar.js';

export const portal = Router();
const FALSO = hashPassword('no-existe');

portal.post('/login', (req, res) => {
  const email = limpio(req.body?.email, 254).toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!limitar(`plogin:${req.ip}`, 20, 15 * 60_000) || !limitar(`plogin-u:${email}`, 8, 15 * 60_000)) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
  const p = db.prepare("SELECT * FROM personas WHERE email = ? AND tipo = 'afiliado' AND estado IN ('activo','suspendido')").get(email);
  const ok = verificarPassword(password, p?.password_hash ?? FALSO) && p?.password_hash;
  if (!ok) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  if (p.debe_cambiar_password && p.password_temporal_expira_en && p.password_temporal_expira_en < ahoraISO()) {
    return res.status(403).json({ error: 'La contraseña temporal ha caducado. Pide una nueva a la organización.' });
  }
  iniciarSesionPersona(res, p.id);
  res.json({ ok: true, cambiar_password: !!p.debe_cambiar_password });
});

portal.post('/logout', (req, res) => { cerrarSesionPersona(req, res); res.json({ ok: true }); });

portal.post('/password', requerirPersona({ permiteCambio: true }), (req, res) => {
  const p = db.prepare('SELECT * FROM personas WHERE id = ?').get(req.persona.id);
  const actual = String(req.body?.actual ?? ''), nueva = String(req.body?.nueva ?? '');
  if (!limitar(`ppw:${p.id}`, 10, 15 * 60_000)) return res.status(429).json({ error: 'Demasiados intentos' });
  if (!verificarPassword(actual, p.password_hash)) return res.status(401).json({ error: 'La contraseña actual no es correcta' });
  if (nueva.length < 10) return res.status(400).json({ error: 'La contraseña debe tener al menos 10 caracteres' });
  if (nueva === actual) return res.status(400).json({ error: 'Elige una contraseña distinta' });
  db.prepare('UPDATE personas SET password_hash = ?, debe_cambiar_password = 0, password_temporal_expira_en = NULL, actualizado_en = ? WHERE id = ?')
    .run(hashPassword(nueva), ahoraISO(), p.id);
  db.prepare("DELETE FROM sesiones WHERE tipo = 'persona' AND sujeto_id = ? AND id <> ?").run(p.id, req.persona.sesion_id);
  res.json({ ok: true });
});

portal.get('/me', requerirPersona({ permiteCambio: true }), (req, res) => {
  const p = db.prepare('SELECT * FROM personas WHERE id = ?').get(req.persona.id);
  if (p.debe_cambiar_password) return res.json({ cambiar_password: true, nombre: p.nombre });
  const c = carneVigente(p.id);
  const t = db.prepare('SELECT nombre FROM territorios WHERE id = ?').get(p.territorio_id);
  res.json({
    nombre: p.nombre, apellidos: p.apellidos, email: p.email, telefono: p.telefono, estado: p.estado,
    numero_afiliado: formatoNumero(p.numero_afiliado), provincia: t?.nombre, fecha_alta: p.fecha_alta,
    carne: c ? { version: c.version, emitido_en: c.emitido_en, valido_hasta: c.valido_hasta } : null,
    historial: db.prepare('SELECT tipo, motivo, fecha FROM movimientos_afiliacion WHERE persona_id = ? ORDER BY fecha DESC, id DESC').all(p.id),
  });
});

portal.get('/carne.pdf', requerirPersona(), async (req, res) => {
  const p = db.prepare('SELECT * FROM personas WHERE id = ?').get(req.persona.id);
  const c = carneVigente(p.id);
  if (p.estado !== 'activo' || !c) return res.status(404).json({ error: 'No tienes un carné vigente' });
  try {
    const { bytes } = await generarCarnePdf(datosCarne(p, c));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="carne-plu-${p.numero_afiliado}.pdf"`);
    res.send(Buffer.from(bytes));
  } catch (e) { console.error('Error carné:', e.message); res.status(500).json({ error: 'No se pudo generar el carné' }); }
});

// ---- Solicitudes ----
const TIPOS = ['cambio_datos', 'cambio_provincia', 'baja', 'duplicado_carne', 'renovacion_carne', 'certificado', 'otra'];
portal.get('/solicitudes', requerirPersona(), (req, res) => {
  res.json(db.prepare('SELECT id, tipo, estado, detalle, resolucion, creada_en, resuelta_en FROM solicitudes WHERE persona_id = ? ORDER BY creada_en DESC').all(req.persona.id));
});
portal.post('/solicitudes', requerirPersona(), (req, res) => {
  const tipo = req.body?.tipo;
  if (!TIPOS.includes(tipo)) return res.status(400).json({ error: 'Tipo de solicitud no válido' });
  if (!limitar(`psol:${req.persona.id}`, 10, 3600_000)) return res.status(429).json({ error: 'Demasiadas solicitudes seguidas' });
  if (db.prepare("SELECT 1 FROM solicitudes WHERE persona_id = ? AND tipo = ? AND estado IN ('abierta','en_revision')").get(req.persona.id, tipo)) {
    return res.status(409).json({ error: 'Ya tienes una solicitud abierta de este tipo' });
  }
  let detalle = limpio(req.body?.detalle, 800) || null;
  if (tipo === 'cambio_provincia') {
    const t = db.prepare("SELECT id FROM territorios WHERE id = ? AND tipo = 'provincia'").get(Number(req.body?.provincia_id));
    if (!t) return res.status(400).json({ error: 'Elige una provincia' });
    detalle = JSON.stringify({ provincia_id: t.id, nota: limpio(req.body?.detalle, 300) });
  }
  const r = db.prepare('INSERT INTO solicitudes (persona_id, tipo, detalle) VALUES (?, ?, ?)').run(req.persona.id, tipo, detalle);
  res.status(201).json({ ok: true, id: Number(r.lastInsertRowid) });
});

// ---- Encuestas ----
function elegible(personaId, territorioId) {
  return db.prepare(
    `SELECT e.* FROM encuestas e WHERE e.estado = 'abierta' AND (e.cierra_en IS NULL OR e.cierra_en > ?)
        AND (e.ambito_territorio_id IS NULL OR e.ambito_territorio_id = ?)
      ORDER BY e.creada_en DESC`,
  ).all(ahoraISO(), territorioId).map((e) => ({
    ...e,
    respondida: !!db.prepare('SELECT 1 FROM participaciones WHERE encuesta_id = ? AND persona_id = ?').get(e.id, personaId),
  }));
}
portal.get('/encuestas', requerirPersona(), (req, res) => {
  res.json(elegible(req.persona.id, req.persona.territorio_id).map((e) => ({ tipo: e.tipo, id: e.id, titulo: e.titulo, descripcion: e.descripcion, anonima: !!e.anonima, cierra_en: e.cierra_en, respondida: e.respondida })));
});
function encuestaDePersona(req) {
  const e = db.prepare('SELECT * FROM encuestas WHERE id = ?').get(Number(req.params.id));
  if (!encuestaAbierta(e)) return null;
  if (e.ambito_territorio_id && e.ambito_territorio_id !== req.persona.territorio_id) return null;
  return e;
}
portal.get('/encuestas/:id', requerirPersona(), (req, res) => {
  const e = encuestaDePersona(req);
  if (!e) return res.status(404).json({ error: 'Encuesta no disponible' });
  res.json(encuestaPublica(e));
});
portal.post('/encuestas/:id/responder', requerirPersona(), (req, res) => {
  const e = encuestaDePersona(req);
  if (!e) return res.status(404).json({ error: 'Encuesta no disponible' });
  if (req.persona.estado !== 'activo') return res.status(403).json({ error: 'Tu cuenta está suspendida' });
  try { registrarParticipacion(e, req.persona.id, req.body?.respuestas); } catch (err) { return res.status(400).json({ error: err.message }); }
  res.json({ ok: true });
});
