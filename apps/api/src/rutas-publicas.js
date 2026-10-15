// Rutas públicas: inscripción de afiliados y alta de simpatizantes.
import { Router } from 'express';
import { db } from './db.js';
import { cifrar, huella } from './seguridad.js';
import { limitar } from './seguridad.js';
import { CATALOGOS, datosPerfil, edadEn, esEmail, limpio, normalizarDocumento, tipoDocumento } from './validar.js';

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
  const perfil = datosPerfil(b);

  if (!nombre) errores.nombre = 'Escribe tu nombre';
  if (!apellidos) errores.apellidos = 'Escribe tus apellidos';
  if (!esEmail(email)) errores.email = 'Correo no válido';
  if (!docTipo) errores.documento = 'DNI o NIE no válido (revisa el número y la letra)';
  if (edad === null) errores.fecha_nacimiento = 'Fecha no válida';
  else if (edad < 16) errores.fecha_nacimiento = 'Hay que tener al menos 16 años';
  else if (edad > 120) errores.fecha_nacimiento = 'Fecha no válida';
  Object.assign(errores, perfil.errores);
  if (!provinciaValida(b.provincia_id)) errores.provincia_id = 'Elige una provincia';
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
                             documento_tipo, documento_cifrado, documento_hash, codigo_postal, territorio_id,
                             direccion, poblacion, ocupacion, situacion_laboral, sector)
       VALUES ('afiliado', 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(nombre, apellidos, email, perfil.datos.telefono, b.fecha_nacimiento, docTipo, cifrar(doc), huella(doc), perfil.datos.codigo_postal, Number(b.provincia_id),
      perfil.datos.direccion, perfil.datos.poblacion, perfil.datos.ocupacion, perfil.datos.situacion_laboral, perfil.datos.sector);
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

// (El alta de simpatizantes se eliminó: ahora todo el mundo se afilia, y es gratis.)

// Listas para los desplegables (situación laboral y sector)
publicas.get('/catalogos', (_req, res) => { res.setHeader('Cache-Control', 'public, max-age=3600'); res.json(CATALOGOS); });
