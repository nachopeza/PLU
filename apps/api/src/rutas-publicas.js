// Rutas públicas: inscripción de afiliados y alta de simpatizantes.
import { Router } from 'express';
import { db } from './db.js';
import { cifrar, huella } from './seguridad.js';
import { limitar } from './seguridad.js';
import { edadEn, esEmail, limpio, normalizarDocumento, tipoDocumento } from './validar.js';

export const publicas = Router();
const VERSION_TEXTO = '2026-10-borrador'; // se cambiará cuando exista el texto legal definitivo

const OK = { ok: true, mensaje: 'Solicitud recibida. El equipo la revisará y te avisaremos por correo.' };

function provinciaValida(id) {
  return db.prepare("SELECT id FROM territorios WHERE id = ? AND tipo = 'provincia'").get(Number(id));
}

// Solicitud de afiliación. Queda "pendiente" hasta que un gestor la apruebe.
publicas.post('/inscripciones', (req, res) => {
  if (!limitar(`insc:${req.ip}`, 10, 3600_000)) return res.status(429).json({ error: 'Demasiados intentos. Prueba más tarde.' });
  const b = req.body ?? {};
  const errores = {};
  const nombre = limpio(b.nombre, 80), apellidos = limpio(b.apellidos, 120);
  const email = limpio(b.email, 254).toLowerCase();
  const doc = normalizarDocumento(b.documento);
  const docTipo = tipoDocumento(doc);
  const edad = edadEn(b.fecha_nacimiento);
  const cp = limpio(b.codigo_postal, 5);
  const tel = limpio(b.telefono, 20);

  if (!nombre) errores.nombre = 'Escribe tu nombre';
  if (!apellidos) errores.apellidos = 'Escribe tus apellidos';
  if (!esEmail(email)) errores.email = 'Correo no válido';
  if (!docTipo) errores.documento = 'DNI o NIE no válido (revisa el número y la letra)';
  if (edad === null) errores.fecha_nacimiento = 'Fecha no válida';
  else if (edad < 16) errores.fecha_nacimiento = 'Hay que tener al menos 16 años';
  else if (edad > 120) errores.fecha_nacimiento = 'Fecha no válida';
  if (!/^\d{5}$/.test(cp)) errores.codigo_postal = 'Código postal de 5 cifras';
  if (!provinciaValida(b.provincia_id)) errores.provincia_id = 'Elige una provincia';
  if (tel && !/^[+\d\s]{6,20}$/.test(tel)) errores.telefono = 'Teléfono no válido';
  if (b.consentimiento_afiliacion !== true) errores.consentimiento_afiliacion = 'Hace falta aceptar el tratamiento de datos para afiliarte';
  if (Object.keys(errores).length) return res.status(400).json({ error: 'Revisa el formulario', errores });

  // Si el correo o el documento ya existen, respondemos igual que si fuera nuevo,
  // para que nadie pueda averiguar quién está afiliado.
  const yaEmail = db.prepare('SELECT id FROM personas WHERE email = ?').get(email);
  const yaDoc = db.prepare('SELECT id FROM personas WHERE documento_hash = ?').get(huella(doc));
  if (yaEmail || yaDoc) return res.status(201).json(OK);

  db.exec('BEGIN');
  try {
    const r = db.prepare(
      `INSERT INTO personas (tipo, estado, nombre, apellidos, email, telefono, fecha_nacimiento,
                             documento_tipo, documento_cifrado, documento_hash, codigo_postal, territorio_id)
       VALUES ('afiliado', 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(nombre, apellidos, email, tel || null, b.fecha_nacimiento, docTipo, cifrar(doc), huella(doc), cp, Number(b.provincia_id));
    const id = Number(r.lastInsertRowid);
    const cons = db.prepare('INSERT INTO consentimientos (persona_id, finalidad, version_texto, otorgado) VALUES (?, ?, ?, ?)');
    cons.run(id, 'afiliacion', VERSION_TEXTO, 1);
    cons.run(id, 'novedades', VERSION_TEXTO, b.consentimiento_avisos === true ? 1 : 0);
    db.prepare("INSERT INTO movimientos_afiliacion (persona_id, tipo, hasta) VALUES (?, 'inscripcion', 'pendiente')").run(id);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    console.error('Error al guardar inscripción:', e.message);
    return res.status(500).json({ error: 'No se pudo guardar. Inténtalo de nuevo.' });
  }
  res.status(201).json(OK);
});

// Simpatizante: solo nombre, correo y provincia. No tiene cuenta ni portal.
publicas.post('/simpatizantes', (req, res) => {
  if (!limitar(`simp:${req.ip}`, 10, 3600_000)) return res.status(429).json({ error: 'Demasiados intentos. Prueba más tarde.' });
  const b = req.body ?? {};
  const nombre = limpio(b.nombre, 80), email = limpio(b.email, 254).toLowerCase();
  const errores = {};
  if (!nombre) errores.nombre = 'Escribe tu nombre';
  if (!esEmail(email)) errores.email = 'Correo no válido';
  if (!provinciaValida(b.provincia_id)) errores.provincia_id = 'Elige una provincia';
  if (b.consentimiento_avisos !== true) errores.consentimiento_avisos = 'Hace falta aceptar para recibir avisos';
  if (Object.keys(errores).length) return res.status(400).json({ error: 'Revisa el formulario', errores });
  if (!db.prepare('SELECT id FROM personas WHERE email = ?').get(email)) {
    db.exec('BEGIN');
    try {
      const r = db.prepare("INSERT INTO personas (tipo, estado, nombre, apellidos, email, territorio_id) VALUES ('simpatizante', 'activo', ?, '', ?, ?)")
        .run(nombre, email, Number(b.provincia_id));
      db.prepare("INSERT INTO consentimientos (persona_id, finalidad, version_texto, otorgado) VALUES (?, 'novedades', ?, 1)").run(Number(r.lastInsertRowid), VERSION_TEXTO);
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); return res.status(500).json({ error: 'No se pudo guardar.' }); }
  }
  res.status(201).json({ ok: true, mensaje: 'Listo. Te avisaremos de campañas, eventos y encuestas.' });
});
