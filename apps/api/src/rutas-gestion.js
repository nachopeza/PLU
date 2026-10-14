// Gestión del equipo: personas, solicitudes, verificación de carné, equipo, auditoría y exportación.
import { Router } from 'express';
import { db } from './db.js';
import { descifrar, hashPassword, limitar } from './seguridad.js';
import { auditar, requerirEquipo } from './sesion.js';
import {
  ahoraISO, asignarPasswordTemporal, carneVigente, emitirCarne, formatoNumero, moverEstado, passwordTemporal, revocarCarnes, transaccion,
} from './servicios.js';
import { datosPerfil, enmascarar, esEmail, limpio } from './validar.js';
import { enviarCorreo, textoAcceso } from './correo.js';
import { datosCarne, generarCarnePdf, generarCertificadoPdf } from './carne.js';

export const gestion = Router();
const GESTION = ['admin', 'gestor', 'coordinador'];
const ROLES = ['admin', 'gestor', 'moderador', 'coordinador', 'verificador', 'tesoreria', 'auditor'];

const alcance = (eq) => (eq.rol === 'coordinador' ? { sql: ' AND p.territorio_id = ?', args: [eq.territorio_id ?? -1] } : { sql: '', args: [] });

// ---------- Personas ----------
gestion.get('/personas', requerirEquipo(...GESTION), (req, res) => {
  const f = alcance(req.equipo);
  const q = [];
  const args = [];
  if (['afiliado', 'simpatizante'].includes(req.query.tipo)) { q.push('p.tipo = ?'); args.push(req.query.tipo); }
  if (['pendiente', 'activo', 'suspendido', 'baja', 'rechazado'].includes(req.query.estado)) { q.push('p.estado = ?'); args.push(req.query.estado); }
  if (req.query.provincia && req.equipo.rol !== 'coordinador') { q.push('p.territorio_id = ?'); args.push(Number(req.query.provincia)); }
  const texto = limpio(req.query.q, 80);
  if (texto) {
    const like = `%${texto.replace(/[%_]/g, '')}%`;
    q.push('(p.nombre LIKE ? OR p.apellidos LIKE ? OR p.email LIKE ? OR p.numero_afiliado LIKE ?)');
    args.push(like, like, like, like.replace('-', ''));
  }
  const filas = db.prepare(
    `SELECT p.id, p.tipo, p.estado, p.nombre, p.apellidos, p.email, p.numero_afiliado, p.creado_en, t.nombre AS provincia
       FROM personas p LEFT JOIN territorios t ON t.id = p.territorio_id
      WHERE 1=1${f.sql}${q.length ? ` AND ${q.join(' AND ')}` : ''} ORDER BY p.creado_en DESC LIMIT 200`,
  ).all(...f.args, ...args);
  res.json(filas.map((p) => ({ ...p, numero_afiliado: formatoNumero(p.numero_afiliado) })));
});

function personaVisible(req) {
  const f = alcance(req.equipo);
  return db.prepare(`SELECT p.*, t.nombre AS provincia FROM personas p LEFT JOIN territorios t ON t.id = p.territorio_id WHERE p.id = ?${f.sql}`)
    .get(Number(req.params.id), ...f.args);
}

gestion.get('/personas/:id', requerirEquipo(...GESTION), (req, res) => {
  const p = personaVisible(req);
  if (!p) return res.status(404).json({ error: 'No encontrada' });
  let doc = '';
  try { doc = p.documento_cifrado ? descifrar(p.documento_cifrado) : ''; } catch { /* ilegible */ }
  const completo = ['admin', 'gestor'].includes(req.equipo.rol);
  if (completo && doc) auditar(req.equipo.id, 'ver_documento', 'persona', p.id);
  const carne = carneVigente(p.id);
  res.json({
    id: p.id, tipo: p.tipo, estado: p.estado, nombre: p.nombre, apellidos: p.apellidos, email: p.email, telefono: p.telefono,
    fecha_nacimiento: p.fecha_nacimiento, documento_tipo: p.documento_tipo, documento: completo ? doc : enmascarar(doc),
    codigo_postal: p.codigo_postal, poblacion: p.poblacion, direccion: p.direccion, ocupacion: p.ocupacion, situacion_laboral: p.situacion_laboral, sector: p.sector,
    provincia: p.provincia, territorio_id: p.territorio_id,
    numero_afiliado: formatoNumero(p.numero_afiliado), creado_en: p.creado_en, fecha_alta: p.fecha_alta, fecha_baja: p.fecha_baja,
    carne: carne ? { version: carne.version, emitido_en: carne.emitido_en, valido_hasta: carne.valido_hasta } : null,
    movimientos: db.prepare('SELECT tipo, desde, hasta, motivo, fecha FROM movimientos_afiliacion WHERE persona_id = ? ORDER BY fecha, id').all(p.id),
    solicitudes: db.prepare('SELECT id, tipo, estado, creada_en FROM solicitudes WHERE persona_id = ? ORDER BY creada_en DESC').all(p.id),
  });
});

// Corrección de datos de la persona (no del documento ni de la fecha de nacimiento)
gestion.patch('/personas/:id', requerirEquipo('admin', 'gestor'), (req, res) => {
  const p = personaVisible(req);
  if (!p) return res.status(404).json({ error: 'No encontrada' });
  const nombre = limpio(req.body?.nombre ?? p.nombre, 80);
  const apellidos = limpio(req.body?.apellidos ?? p.apellidos, 120);
  const email = limpio(req.body?.email ?? p.email, 254).toLowerCase();
  const errores = {};
  if (!nombre) errores.nombre = 'Escribe el nombre';
  if (p.tipo === 'afiliado' && !apellidos) errores.apellidos = 'Escribe los apellidos';
  if (!esEmail(email)) errores.email = 'Correo no válido';
  const perfil = datosPerfil(req.body, { parcial: true, exigirResidencia: p.tipo === 'afiliado' });
  Object.assign(errores, perfil.errores);
  if (Object.keys(errores).length) return res.status(400).json({ error: 'Revisa los datos', errores });
  if (email !== p.email && db.prepare('SELECT 1 FROM personas WHERE email = ? AND id <> ?').get(email, p.id)) return res.status(409).json({ error: 'Ese correo ya está en uso' });
  const campos = { nombre, apellidos, email, ...perfil.datos };
  const antes = {};
  for (const k of Object.keys(campos)) antes[k] = p[k] ?? null;
  const cambiados = Object.keys(campos).filter((k) => (campos[k] ?? null) !== (antes[k] ?? null));
  if (cambiados.length) {
    db.prepare(`UPDATE personas SET ${cambiados.map((k) => `${k} = ?`).join(', ')}, actualizado_en = ? WHERE id = ?`).run(...cambiados.map((k) => campos[k]), ahoraISO(), p.id);
  }
  // Solo se registran los nombres de los campos cambiados, no su contenido
  auditar(req.equipo.id, 'editar_persona', 'persona', p.id, { campos: cambiados });
  res.json({ ok: true, cambiados });
});

// Carné: ver/descargar el vigente y emitir duplicado o renovación
gestion.get('/personas/:id/carne.pdf', requerirEquipo('admin', 'gestor'), async (req, res) => {
  const p = personaVisible(req);
  const c = p && carneVigente(p.id);
  if (!p || p.estado !== 'activo' || !c) return res.status(404).json({ error: 'No tiene un carné vigente' });
  try {
    const { bytes } = await generarCarnePdf(datosCarne(p, c));
    auditar(req.equipo.id, 'descargar_carne', 'persona', p.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="carne-plu-${p.numero_afiliado}.pdf"`);
    res.send(Buffer.from(bytes));
  } catch (e) { console.error('Error carné:', e.message); res.status(500).json({ error: 'No se pudo generar el carné' }); }
});
gestion.post('/personas/:id/carne', requerirEquipo('admin', 'gestor'), (req, res) => {
  const p = personaVisible(req);
  if (!p || p.tipo !== 'afiliado' || p.estado !== 'activo') return res.status(409).json({ error: 'Solo se puede emitir carné a una persona afiliada activa' });
  const accion = req.body?.accion;
  if (!['duplicado', 'renovacion'].includes(accion)) return res.status(400).json({ error: 'Acción no válida' });
  const nuevo = transaccion(() => emitirCarne(p, accion === 'duplicado' ? 'duplicado' : 'renovación'));
  auditar(req.equipo.id, accion === 'duplicado' ? 'carne_duplicado' : 'carne_renovacion', 'persona', p.id, { version: nuevo.version });
  res.json({ ok: true, ...nuevo });
});
gestion.get('/personas/:id/certificado.pdf', requerirEquipo('admin', 'gestor'), async (req, res) => {
  const p = personaVisible(req);
  if (!p || p.tipo !== 'afiliado' || !['activo', 'suspendido', 'baja'].includes(p.estado)) return res.status(404).json({ error: 'No encontrada' });
  try {
    const bytes = await generarCertificadoPdf(p);
    auditar(req.equipo.id, 'certificado_afiliacion', 'persona', p.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="certificado-plu-${p.numero_afiliado}.pdf"`);
    res.send(Buffer.from(bytes));
  } catch (e) { console.error('Error certificado:', e.message); res.status(500).json({ error: 'No se pudo generar el certificado' }); }
});

gestion.post('/personas/:id/estado', requerirEquipo('admin', 'gestor'), async (req, res) => {
  const p = personaVisible(req);
  if (!p || p.tipo !== 'afiliado') return res.status(404).json({ error: 'No encontrada' });
  const accion = req.body?.accion;
  const motivo = limpio(req.body?.motivo, 300);
  if (accion === 'suspender' && p.estado === 'activo') transaccion(() => moverEstado(p.id, 'suspendido', 'suspension', motivo, req.equipo.id));
  else if (accion === 'reactivar' && p.estado === 'suspendido') transaccion(() => moverEstado(p.id, 'activo', 'reactivacion', motivo, req.equipo.id));
  else if (accion === 'readmitir' && p.estado === 'baja') {
    let t;
    transaccion(() => {
      moverEstado(p.id, 'activo', 'reactivacion', motivo || 'readmitida', req.equipo.id);
      emitirCarne(p, 'readmisión');
      t = asignarPasswordTemporal(p.id);
    });
    auditar(req.equipo.id, 'persona_readmitir', 'persona', p.id, { motivo });
    const envio = await enviarCorreo({ personaId: p.id, tipo: 'readmision', para: p.email, asunto: 'Tu afiliación a PLU se ha reactivado', texto: textoAcceso({ nombre: p.nombre, email: p.email, password: t.password, caduca: t.caduca, motivo: 'Tu afiliación a PLU se ha reactivado.' }) });
    return res.json({ ok: true, password_temporal: t.password, caduca: t.caduca, correo: envio.ok ? 'enviado' : 'no enviado', correo_motivo: envio.ok ? undefined : envio.motivo });
  } else if (accion === 'baja' && ['activo', 'suspendido'].includes(p.estado)) {
    transaccion(() => {
      moverEstado(p.id, 'baja', 'baja', motivo, req.equipo.id);
      revocarCarnes(p.id, 'baja');
      db.prepare("DELETE FROM sesiones WHERE tipo = 'persona' AND sujeto_id = ?").run(p.id);
    });
  } else return res.status(409).json({ error: 'Esa acción no es posible en el estado actual' });
  auditar(req.equipo.id, `persona_${accion}`, 'persona', p.id, { motivo });
  res.json({ ok: true });
});

// Cambio de provincia: conserva el número de afiliado (el carné se reemite con el nuevo territorio)
gestion.post('/personas/:id/provincia', requerirEquipo('admin', 'gestor'), (req, res) => {
  const p = personaVisible(req);
  const destino = db.prepare("SELECT id, nombre FROM territorios WHERE id = ? AND tipo = 'provincia'").get(Number(req.body?.provincia_id));
  if (!p || !destino) return res.status(404).json({ error: 'No encontrado' });
  cambiarProvincia(p, destino.id, limpio(req.body?.motivo, 300), req.equipo.id);
  auditar(req.equipo.id, 'cambio_provincia', 'persona', p.id, { destino: destino.nombre });
  res.json({ ok: true });
});
function cambiarProvincia(p, territorioId, motivo, usuarioId) {
  transaccion(() => {
    db.prepare('UPDATE personas SET territorio_id = ?, actualizado_en = ? WHERE id = ?').run(territorioId, ahoraISO(), p.id);
    db.prepare("INSERT INTO movimientos_afiliacion (persona_id, tipo, desde, hasta, motivo, usuario_id) VALUES (?, 'cambio_territorio', ?, ?, ?, ?)")
      .run(p.id, String(p.territorio_id), String(territorioId), motivo || null, usuarioId);
    if (p.estado === 'activo') emitirCarne(p, 'cambio de provincia');
  });
}


// Supresión definitiva de una persona y de TODOS sus datos (derecho de supresión). Solo administración.
// Se pide escribir el correo de la persona para confirmar. En la auditoría solo queda el id, no datos personales.
gestion.post('/personas/:id/eliminar', requerirEquipo('admin'), (req, res) => {
  const p = personaVisible(req);
  if (!p) return res.status(404).json({ error: 'No encontrada' });
  const conf = String(req.body?.confirmacion ?? '').trim().toLowerCase();
  if (conf !== String(p.email).toLowerCase()) return res.status(400).json({ error: 'Escribe el correo de la persona para confirmar.' });
  try {
    transaccion(() => {
      const id = p.id, email = p.email;
      db.prepare('DELETE FROM denuncias WHERE persona_id = ? OR comentario_id IN (SELECT id FROM comentarios WHERE persona_id = ?)').run(id, id);
      db.prepare('DELETE FROM comentarios WHERE persona_id = ?').run(id);
      db.prepare('DELETE FROM propuesta_apoyos WHERE persona_id = ?').run(id);
      db.prepare('DELETE FROM participaciones WHERE persona_id = ?').run(id);
      db.prepare('DELETE FROM enlaces_encuesta WHERE persona_id = ?').run(id);
      db.prepare('UPDATE respuestas SET persona_id = NULL WHERE persona_id = ?').run(id);
      db.prepare('UPDATE donaciones SET persona_id = NULL WHERE persona_id = ?').run(id);
      db.prepare('DELETE FROM correos WHERE persona_id = ? OR destinatario = ?').run(id, email);
      db.prepare('DELETE FROM solicitudes WHERE persona_id = ?').run(id);
      db.prepare('DELETE FROM carnes WHERE persona_id = ?').run(id);
      db.prepare('DELETE FROM movimientos_afiliacion WHERE persona_id = ?').run(id);
      db.prepare('DELETE FROM consentimientos WHERE persona_id = ?').run(id);
      db.prepare("DELETE FROM sesiones WHERE tipo = 'persona' AND sujeto_id = ?").run(id);
      db.prepare('DELETE FROM eventos_inscripciones WHERE lower(email) = lower(?)').run(email);
      db.prepare('DELETE FROM voluntarios WHERE lower(email) = lower(?)').run(email);
      db.prepare('UPDATE propuestas SET autor_nombre = \'Anónimo\', autor_email = \'eliminado@invalid\' WHERE lower(autor_email) = lower(?)').run(email);
      db.prepare('DELETE FROM personas WHERE id = ?').run(id);
    });
  } catch (e) { console.error('eliminar persona:', e.message); return res.status(500).json({ error: 'No se pudo eliminar: ' + e.message.slice(0, 120) }); }
  auditar(req.equipo.id, 'persona_eliminada', 'persona', p.id);
  res.json({ ok: true });
});

gestion.post('/personas/:id/reset-password', requerirEquipo('admin', 'gestor'), async (req, res) => {
  const p = personaVisible(req);
  if (!p || p.tipo !== 'afiliado' || p.estado !== 'activo') return res.status(404).json({ error: 'No encontrada' });
  const t = asignarPasswordTemporal(p.id);
  auditar(req.equipo.id, 'reset_password_afiliado', 'persona', p.id);
  const envio = await enviarCorreo({ personaId: p.id, tipo: 'reset_password', para: p.email, asunto: 'Nueva contraseña temporal de PLU', texto: textoAcceso({ nombre: p.nombre, email: p.email, password: t.password, caduca: t.caduca, motivo: 'Se ha generado una contraseña temporal para tu acceso.' }) });
  res.json({ ok: true, password_temporal: t.password, caduca: t.caduca, correo: envio.ok ? 'enviado' : 'no enviado', correo_motivo: envio.ok ? undefined : envio.motivo });
});

// ---------- Solicitudes ----------
gestion.get('/solicitudes', requerirEquipo(...GESTION), (req, res) => {
  const f = alcance(req.equipo);
  const estado = ['abierta', 'en_revision', 'resuelta', 'rechazada'].includes(req.query.estado) ? req.query.estado : 'abierta';
  const filas = db.prepare(
    `SELECT s.id, s.tipo, s.estado, s.detalle, s.resolucion, s.creada_en, p.id AS persona_id, p.nombre, p.apellidos, p.numero_afiliado
       FROM solicitudes s JOIN personas p ON p.id = s.persona_id
      WHERE s.estado = ?${f.sql} ORDER BY s.creada_en LIMIT 200`,
  ).all(estado, ...f.args);
  res.json(filas.map((s) => ({ ...s, numero_afiliado: formatoNumero(s.numero_afiliado) })));
});

gestion.post('/solicitudes/:id/resolver', requerirEquipo('admin', 'gestor'), (req, res) => {
  const s = db.prepare('SELECT * FROM solicitudes WHERE id = ?').get(Number(req.params.id));
  if (!s || !['abierta', 'en_revision'].includes(s.estado)) return res.status(404).json({ error: 'No encontrada o ya resuelta' });
  const aceptar = req.body?.aceptar !== false;
  const resolucion = limpio(req.body?.resolucion, 400);
  const p = db.prepare('SELECT * FROM personas WHERE id = ?').get(s.persona_id);
  transaccion(() => {
    if (aceptar) {
      if (s.tipo === 'baja' && ['activo', 'suspendido'].includes(p.estado)) {
        moverEstado(p.id, 'baja', 'baja', 'solicitada por la persona', req.equipo.id);
        revocarCarnes(p.id, 'baja');
        db.prepare("DELETE FROM sesiones WHERE tipo = 'persona' AND sujeto_id = ?").run(p.id);
      } else if (['renovacion_carne', 'duplicado_carne'].includes(s.tipo) && p.estado === 'activo') {
        emitirCarne(p, s.tipo === 'duplicado_carne' ? 'duplicado' : 'renovación');
      } else if (s.tipo === 'cambio_datos' && ['activo', 'suspendido'].includes(p.estado)) {
        let pedido = null;
        try { pedido = JSON.parse(s.detalle || '{}').cambios; } catch { /* texto libre */ }
        if (pedido && typeof pedido === 'object') {
          const perfil = datosPerfil(pedido, { parcial: true });
          if (Object.keys(perfil.errores).length) throw new Error('DATOS_NO_VALIDOS');
          const ks = Object.keys(perfil.datos);
          if (ks.length) db.prepare(`UPDATE personas SET ${ks.map((k) => `${k} = ?`).join(', ')}, actualizado_en = ? WHERE id = ?`).run(...ks.map((k) => perfil.datos[k]), ahoraISO(), p.id);
        }
      } else if (s.tipo === 'cambio_provincia' && p.estado === 'activo') {
        let destino = null;
        try { destino = JSON.parse(s.detalle || '{}').provincia_id; } catch { /* sin datos */ }
        const t = destino && db.prepare("SELECT id FROM territorios WHERE id = ? AND tipo = 'provincia'").get(Number(destino));
        if (!t) throw new Error('SIN_PROVINCIA');
        cambiarProvincia(p, t.id, 'solicitado por la persona', req.equipo.id);
      }
    }
    db.prepare('UPDATE solicitudes SET estado = ?, resolucion = ?, resuelta_por = ?, resuelta_en = ? WHERE id = ?')
      .run(aceptar ? 'resuelta' : 'rechazada', resolucion || null, req.equipo.id, ahoraISO(), s.id);
  });
  auditar(req.equipo.id, aceptar ? 'solicitud_resuelta' : 'solicitud_rechazada', 'solicitud', s.id, { tipo: s.tipo });
  res.json({ ok: true });
});
gestion.use((e, _req, res, next) => {
  if (e?.message === 'SIN_PROVINCIA') return res.status(400).json({ error: 'La solicitud no indica una provincia válida' });
  if (e?.message === 'DATOS_NO_VALIDOS') return res.status(400).json({ error: 'Los datos de la solicitud no son válidos; edítalos en la ficha de la persona' });
  next(e);
});

// ---------- Verificación de carné (eventos, mítines, prensa) ----------
gestion.get('/verificar', requerirEquipo('admin', 'gestor', 'verificador'), (req, res) => {
  if (!limitar(`verif:${req.equipo.id}`, 120, 60_000)) return res.status(429).json({ error: 'Demasiadas consultas' });
  const codigo = limpio(req.query.codigo, 80);
  const numero = limpio(req.query.numero, 12).replace('-', '');
  if (!codigo && !numero) return res.status(400).json({ error: 'Indica el código del QR o el número de afiliado' });
  const p = codigo
    ? db.prepare('SELECT * FROM personas WHERE codigo_verificacion = ?').get(codigo)
    : db.prepare('SELECT * FROM personas WHERE numero_afiliado = ?').get(numero);
  let resultado = 'no_existe';
  let datos = null;
  if (p) {
    const c = carneVigente(p.id);
    const hoy = ahoraISO().slice(0, 10);
    if (p.estado === 'baja') resultado = 'baja';
    else if (p.estado === 'suspendido') resultado = 'suspendido';
    else if (p.estado !== 'activo') resultado = 'no_existe';
    else if (!c) resultado = 'revocado';
    else if (c.valido_hasta && c.valido_hasta < hoy) resultado = 'caducado';
    else resultado = 'valido';
    // Con el código del QR solo se acepta el carné vigente: un código antiguo no vale tras una reemisión (el código no cambia, la versión sí).
    if (resultado !== 'no_existe') {
      datos = {
        nombre: `${p.nombre} ${p.apellidos}`, numero_afiliado: formatoNumero(p.numero_afiliado),
        provincia: db.prepare('SELECT nombre FROM territorios WHERE id = ?').get(p.territorio_id)?.nombre,
        valido_hasta: c?.valido_hasta ?? null,
      };
    }
  }
  auditar(req.equipo.id, 'verificar_carne', 'persona', p?.id, { resultado, por: codigo ? 'qr' : 'numero' });
  res.json({ resultado, datos });
});

// ---------- Equipo (usuarios de la intranet) ----------
gestion.get('/usuarios', requerirEquipo('admin'), (_req, res) => {
  res.json(db.prepare(
    `SELECT u.id, u.username, u.nombre, u.email, u.rol, u.activo, u.totp_activo, u.ultimo_acceso, u.debe_cambiar_password, t.nombre AS provincia, u.territorio_id
       FROM usuarios_intranet u LEFT JOIN territorios t ON t.id = u.territorio_id ORDER BY u.creado_en`,
  ).all());
});

gestion.post('/usuarios', requerirEquipo('admin'), (req, res) => {
  const username = limpio(req.body?.username, 40).toLowerCase();
  const nombre = limpio(req.body?.nombre, 80);
  const rol = req.body?.rol;
  const email = limpio(req.body?.email, 254).toLowerCase() || null;
  const territorio = req.body?.territorio_id ? Number(req.body.territorio_id) : null;
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || !nombre || !ROLES.includes(rol)) return res.status(400).json({ error: 'Datos no válidos' });
  if (email && !esEmail(email)) return res.status(400).json({ error: 'Correo no válido' });
  if (rol === 'coordinador' && !db.prepare("SELECT 1 FROM territorios WHERE id = ? AND tipo = 'provincia'").get(territorio)) return res.status(400).json({ error: 'El coordinador necesita una provincia' });
  if (db.prepare('SELECT 1 FROM usuarios_intranet WHERE username = ?').get(username)) return res.status(409).json({ error: 'Ese usuario ya existe' });
  const pw = passwordTemporal(14);
  const r = db.prepare('INSERT INTO usuarios_intranet (username, nombre, email, password_hash, rol, territorio_id, debe_cambiar_password) VALUES (?, ?, ?, ?, ?, ?, 1)')
    .run(username, nombre, email, hashPassword(pw), rol, rol === 'coordinador' ? territorio : null);
  auditar(req.equipo.id, 'crear_usuario', 'usuario', Number(r.lastInsertRowid), { username, rol });
  res.json({ ok: true, id: Number(r.lastInsertRowid), password_temporal: pw });
});

gestion.patch('/usuarios/:id', requerirEquipo('admin'), (req, res) => {
  const id = Number(req.params.id);
  const u = db.prepare('SELECT * FROM usuarios_intranet WHERE id = ?').get(id);
  if (!u) return res.status(404).json({ error: 'No encontrado' });
  const rol = req.body?.rol ?? u.rol;
  const activo = req.body?.activo === undefined ? u.activo : (req.body.activo ? 1 : 0);
  const territorio = rol === 'coordinador' ? (req.body?.territorio_id ?? u.territorio_id) : null;
  if (!ROLES.includes(rol)) return res.status(400).json({ error: 'Rol no válido' });
  if (id === req.equipo.id && (!activo || rol !== 'admin')) return res.status(400).json({ error: 'No puedes quitarte a ti mismo el acceso de administrador' });
  if (u.rol === 'admin' && (rol !== 'admin' || !activo) && db.prepare("SELECT COUNT(*) AS n FROM usuarios_intranet WHERE rol = 'admin' AND activo = 1").get().n <= 1) {
    return res.status(400).json({ error: 'Debe quedar al menos un administrador activo' });
  }
  db.prepare('UPDATE usuarios_intranet SET rol = ?, activo = ?, territorio_id = ? WHERE id = ?').run(rol, activo, territorio, id);
  if (!activo || rol !== u.rol) db.prepare("DELETE FROM sesiones WHERE tipo = 'staff' AND sujeto_id = ?").run(id);
  auditar(req.equipo.id, 'editar_usuario', 'usuario', id, { rol, activo });
  res.json({ ok: true });
});

// Restablece contraseña y doble verificación (p. ej. si pierde el móvil y los códigos de recuperación)
gestion.post('/usuarios/:id/reset', requerirEquipo('admin'), (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM usuarios_intranet WHERE id = ?').get(id)) return res.status(404).json({ error: 'No encontrado' });
  const pw = passwordTemporal(14);
  db.prepare('UPDATE usuarios_intranet SET password_hash = ?, debe_cambiar_password = 1, totp_activo = 0, totp_secreto_cifrado = NULL, codigos_recuperacion_hash = NULL WHERE id = ?')
    .run(hashPassword(pw), id);
  db.prepare("DELETE FROM sesiones WHERE tipo = 'staff' AND sujeto_id = ?").run(id);
  auditar(req.equipo.id, 'reset_usuario', 'usuario', id);
  res.json({ ok: true, password_temporal: pw });
});

// ---------- Auditoría ----------
gestion.get('/auditoria', requerirEquipo('admin', 'auditor'), (req, res) => {
  const accion = limpio(req.query.accion, 60);
  const filas = db.prepare(
    `SELECT a.id, a.fecha, a.accion, a.entidad, a.entidad_id, a.detalle_json, u.username
       FROM auditoria a LEFT JOIN usuarios_intranet u ON u.id = a.usuario_id
      ${accion ? 'WHERE a.accion = ?' : ''} ORDER BY a.id DESC LIMIT 300`,
  ).all(...(accion ? [accion] : []));
  res.json(filas);
});

// ---------- Exportación (sin documento de identidad) ----------
const celdaCsv = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // evita fórmulas en hojas de cálculo
  return `"${s.replace(/"/g, '""')}"`;
};
gestion.get('/export/afiliados.csv', requerirEquipo('admin', 'gestor'), (req, res) => {
  const filas = db.prepare(
    `SELECT p.numero_afiliado, p.nombre, p.apellidos, p.email, p.telefono, p.estado, p.fecha_alta, t.nombre AS provincia,
            p.poblacion, p.codigo_postal, p.direccion, p.ocupacion, p.situacion_laboral, p.sector
       FROM personas p LEFT JOIN territorios t ON t.id = p.territorio_id WHERE p.tipo = 'afiliado' ORDER BY p.creado_en`,
  ).all();
  const cab = ['numero_afiliado', 'nombre', 'apellidos', 'email', 'telefono', 'estado', 'fecha_alta', 'provincia', 'poblacion', 'codigo_postal', 'direccion', 'ocupacion', 'situacion_laboral', 'sector'];
  const csv = [cab.join(',')].concat(filas.map((f) => cab.map((c) => celdaCsv(c === 'numero_afiliado' ? formatoNumero(f[c]) : f[c])).join(','))).join('\r\n');
  auditar(req.equipo.id, 'exportar_afiliados', 'persona', null, { filas: filas.length });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="afiliados.csv"');
  res.send('﻿' + csv);
});
