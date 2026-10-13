// Rutas de la intranet: acceso con doble verificación (TOTP) y bandeja de inscripciones.
import { Router } from 'express';
import QRCode from 'qrcode';
import { db } from './db.js';
import {
  cifrar, crearTicket, descifrar, digitosAleatorios, hashPassword, leerTicket, limitar,
  nuevoSecretoTotp, tokenAleatorio, urlOtpauth, verificarPassword, verificarTotp,
} from './seguridad.js';
import { auditar, cerrarSesion, iniciarSesion, requerirEquipo } from './sesion.js';
import { enmascarar, limpio } from './validar.js';
import { asignarPasswordTemporal, emitirCarne, formatoNumero as fmtNum, transaccion } from './servicios.js';

export const intranet = Router();

// Contraseña ficticia para gastar el mismo tiempo cuando el usuario no existe
const FALSO = hashPassword('no-existe');

function usuarioPorNombre(u) { return db.prepare('SELECT * FROM usuarios_intranet WHERE username = ? AND activo = 1').get(u); }
function usuarioTicket(t) { const u = usuarioPorId(leerTicket(t)); return u && !u.debe_cambiar_password ? u : null; }
function usuarioPorId(id) { return db.prepare('SELECT * FROM usuarios_intranet WHERE id = ? AND activo = 1').get(id); }
const datosUsuario = (u) => ({ id: u.id, username: u.username, nombre: u.nombre, rol: u.rol });

// 1) Usuario y contraseña. Devuelve un "ticket" de 5 minutos para el segundo paso.
intranet.post('/login', (req, res) => {
  const usuario = limpio(req.body?.usuario, 60).toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!limitar(`login:${req.ip}`, 20, 15 * 60_000) || !limitar(`login-u:${usuario}`, 8, 15 * 60_000)) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
  }
  const u = usuarioPorNombre(usuario);
  const ok = verificarPassword(password, u?.password_hash ?? FALSO) && u;
  if (!ok) { auditar(u?.id, 'login_fallido', 'usuario', u?.id, { usuario }); return res.status(401).json({ error: 'Usuario o contraseña incorrectos' }); }
  const ticket = crearTicket(u.id);
  if (u.debe_cambiar_password) return res.json({ paso: 'cambiar_password', ticket });
  if (u.totp_activo) return res.json({ paso: 'codigo', ticket });
  res.json({ paso: 'configurar', ticket }); // primera vez: hay que activar la doble verificación
});

// 1b) Cuenta nueva o restablecida: hay que elegir contraseña propia antes de seguir
intranet.post('/cambiar-password', (req, res) => {
  const u = usuarioPorId(leerTicket(req.body?.ticket));
  if (!u || !u.debe_cambiar_password) return res.status(401).json({ error: 'El paso ha caducado. Vuelve a empezar.' });
  const nueva = String(req.body?.nueva ?? '');
  if (nueva.length < 12) return res.status(400).json({ error: 'La contraseña debe tener al menos 12 caracteres' });
  if (verificarPassword(nueva, u.password_hash)) return res.status(400).json({ error: 'Elige una contraseña distinta de la temporal' });
  db.prepare('UPDATE usuarios_intranet SET password_hash = ?, debe_cambiar_password = 0 WHERE id = ?').run(hashPassword(nueva), u.id);
  db.prepare("DELETE FROM sesiones WHERE tipo = 'staff' AND sujeto_id = ?").run(u.id);
  auditar(u.id, 'cambiar_password', 'usuario', u.id);
  const ticket = crearTicket(u.id);
  res.json({ paso: u.totp_activo ? 'codigo' : 'configurar', ticket });
});

// 2a) Primera vez: genera el secreto y el QR para la app autenticadora
intranet.post('/2fa/preparar', async (req, res) => {
  const u = usuarioTicket(req.body?.ticket);
  if (!u) return res.status(401).json({ error: 'El paso ha caducado. Vuelve a empezar.' });
  if (u.totp_activo) return res.status(400).json({ error: 'La doble verificación ya está activa.' });
  const secreto = nuevoSecretoTotp();
  db.prepare('UPDATE usuarios_intranet SET totp_secreto_cifrado = ? WHERE id = ?').run(cifrar(secreto), u.id);
  const uri = urlOtpauth(secreto, u.username);
  res.json({ secreto, uri, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) });
});

// 2b) Confirma el primer código: activa la doble verificación, abre sesión y entrega códigos de recuperación
intranet.post('/2fa/activar', (req, res) => {
  const u = usuarioTicket(req.body?.ticket);
  if (!u || !u.totp_secreto_cifrado) return res.status(401).json({ error: 'El paso ha caducado. Vuelve a empezar.' });
  if (!limitar(`totp:${u.id}`, 8, 15 * 60_000)) return res.status(429).json({ error: 'Demasiados intentos.' });
  if (!verificarTotp(descifrar(u.totp_secreto_cifrado), String(req.body?.codigo ?? '').trim())) return res.status(401).json({ error: 'Código incorrecto' });
  const recuperacion = Array.from({ length: 8 }, () => `${digitosAleatorios(4)}-${digitosAleatorios(4)}`);
  db.prepare('UPDATE usuarios_intranet SET totp_activo = 1, codigos_recuperacion_hash = ? WHERE id = ?')
    .run(JSON.stringify(recuperacion.map((c) => hashPassword(c))), u.id);
  iniciarSesion(res, u.id);
  auditar(u.id, 'activar_2fa', 'usuario', u.id);
  res.json({ ok: true, usuario: datosUsuario(u), codigos_recuperacion: recuperacion });
});

// 3) Siguientes accesos: código de 6 cifras (o un código de recuperación, que se gasta)
intranet.post('/2fa/verificar', (req, res) => {
  const u = usuarioTicket(req.body?.ticket);
  if (!u || !u.totp_activo) return res.status(401).json({ error: 'El paso ha caducado. Vuelve a empezar.' });
  if (!limitar(`totp:${u.id}`, 8, 15 * 60_000)) return res.status(429).json({ error: 'Demasiados intentos.' });
  const codigo = String(req.body?.codigo ?? '').trim();
  let valido = verificarTotp(descifrar(u.totp_secreto_cifrado), codigo);
  if (!valido && /^\d{4}-\d{4}$/.test(codigo)) {
    const lista = JSON.parse(u.codigos_recuperacion_hash ?? '[]');
    const i = lista.findIndex((h) => verificarPassword(codigo, h));
    if (i >= 0) { lista.splice(i, 1); db.prepare('UPDATE usuarios_intranet SET codigos_recuperacion_hash = ? WHERE id = ?').run(JSON.stringify(lista), u.id); valido = true; auditar(u.id, 'usar_codigo_recuperacion', 'usuario', u.id); }
  }
  if (!valido) { auditar(u.id, 'login_2fa_fallido', 'usuario', u.id); return res.status(401).json({ error: 'Código incorrecto' }); }
  iniciarSesion(res, u.id);
  db.prepare('UPDATE usuarios_intranet SET ultimo_acceso = ? WHERE id = ?').run(new Date().toISOString(), u.id);
  auditar(u.id, 'login', 'usuario', u.id);
  res.json({ ok: true, usuario: datosUsuario(u) });
});

intranet.post('/logout', (req, res) => { cerrarSesion(req, res); res.json({ ok: true }); });
intranet.get('/me', requerirEquipo(), (req, res) => res.json({ usuario: req.equipo }));

// ---- Bandeja de inscripciones (admin, gestor, y coordinador solo de su provincia) ----
const GESTION = ['admin', 'gestor', 'coordinador'];
function filtroAlcance(eq) {
  return eq.rol === 'coordinador' ? { sql: ' AND p.territorio_id = ?', args: [eq.territorio_id ?? -1] } : { sql: '', args: [] };
}
const formatoNumero = fmtNum;

intranet.get('/resumen', requerirEquipo(...GESTION), (req, res) => {
  const f = filtroAlcance(req.equipo);
  const filas = db.prepare(`SELECT p.estado, COUNT(*) AS n FROM personas p WHERE p.tipo = 'afiliado'${f.sql} GROUP BY p.estado`).all(...f.args);
  const simp = db.prepare(`SELECT COUNT(*) AS n FROM personas p WHERE p.tipo = 'simpatizante'${f.sql}`).get(...f.args).n;
  res.json({ afiliados: Object.fromEntries(filas.map((r) => [r.estado, r.n])), simpatizantes: simp });
});

intranet.get('/inscripciones', requerirEquipo(...GESTION), (req, res) => {
  const estado = ['pendiente', 'activo', 'rechazado'].includes(req.query.estado) ? req.query.estado : 'pendiente';
  const f = filtroAlcance(req.equipo);
  const filas = db.prepare(
    `SELECT p.id, p.nombre, p.apellidos, p.email, p.telefono, p.fecha_nacimiento, p.documento_tipo, p.codigo_postal,
            p.estado, p.numero_afiliado, p.creado_en, t.nombre AS provincia
       FROM personas p LEFT JOIN territorios t ON t.id = p.territorio_id
      WHERE p.tipo = 'afiliado' AND p.estado = ?${f.sql} ORDER BY p.creado_en DESC LIMIT 200`,
  ).all(estado, ...f.args);
  res.json(filas.map((p) => ({ ...p, numero_afiliado: formatoNumero(p.numero_afiliado) })));
});

// Ficha: el documento completo solo lo ven admin y gestor, y queda en auditoría. Los demás ven una máscara.
intranet.get('/inscripciones/:id', requerirEquipo(...GESTION), (req, res) => {
  const f = filtroAlcance(req.equipo);
  const p = db.prepare(
    `SELECT p.*, t.nombre AS provincia FROM personas p LEFT JOIN territorios t ON t.id = p.territorio_id
      WHERE p.id = ? AND p.tipo = 'afiliado'${f.sql}`,
  ).get(Number(req.params.id), ...f.args);
  if (!p) return res.status(404).json({ error: 'No encontrada' });
  let doc = '';
  try { doc = descifrar(p.documento_cifrado); } catch { /* dato ilegible */ }
  const completo = ['admin', 'gestor'].includes(req.equipo.rol);
  if (completo) auditar(req.equipo.id, 'ver_documento', 'persona', p.id);
  const movimientos = db.prepare('SELECT tipo, desde, hasta, motivo, fecha FROM movimientos_afiliacion WHERE persona_id = ? ORDER BY fecha, id').all(p.id);
  res.json({
    id: p.id, nombre: p.nombre, apellidos: p.apellidos, email: p.email, telefono: p.telefono, fecha_nacimiento: p.fecha_nacimiento,
    documento_tipo: p.documento_tipo, documento: completo ? doc : enmascarar(doc), codigo_postal: p.codigo_postal, provincia: p.provincia,
    direccion: p.direccion, poblacion: p.poblacion, ocupacion: p.ocupacion, situacion_laboral: p.situacion_laboral, sector: p.sector,
    estado: p.estado, numero_afiliado: formatoNumero(p.numero_afiliado), creado_en: p.creado_en, movimientos,
  });
});

// Número de afiliado: código INE de la provincia + 6 cifras aleatorias, sin repetir.
function nuevoNumeroAfiliado(codigoProvincia) {
  for (let i = 0; i < 50; i++) {
    const n = `${codigoProvincia}${digitosAleatorios(6)}`;
    if (!db.prepare('SELECT 1 FROM personas WHERE numero_afiliado = ?').get(n)) return n;
  }
  throw new Error('No se pudo generar un número libre');
}

intranet.post('/inscripciones/:id/aprobar', requerirEquipo(...GESTION), (req, res) => {
  const f = filtroAlcance(req.equipo);
  const p = db.prepare(`SELECT p.*, t.codigo_num FROM personas p JOIN territorios t ON t.id = p.territorio_id WHERE p.id = ? AND p.tipo = 'afiliado'${f.sql}`)
    .get(Number(req.params.id), ...f.args);
  if (!p) return res.status(404).json({ error: 'No encontrada' });
  if (p.estado !== 'pendiente') return res.status(409).json({ error: 'Esta solicitud ya está resuelta' });
  const numero = nuevoNumeroAfiliado(p.codigo_num);
  const ahora = new Date().toISOString();
  let temp;
  try {
    temp = transaccion(() => {
      db.prepare("UPDATE personas SET estado = 'activo', numero_afiliado = ?, codigo_verificacion = ?, fecha_alta = ?, actualizado_en = ? WHERE id = ?")
        .run(numero, tokenAleatorio(24), ahora, ahora, p.id);
      db.prepare("INSERT INTO movimientos_afiliacion (persona_id, tipo, desde, hasta, usuario_id) VALUES (?, 'alta', 'pendiente', 'activo', ?)").run(p.id, req.equipo.id);
      emitirCarne({ ...p, numero_afiliado: numero });
      return asignarPasswordTemporal(p.id);
    });
  } catch (e) { console.error(e.message); return res.status(500).json({ error: 'No se pudo aprobar' }); }
  db.prepare("INSERT INTO correos (persona_id, tipo, destinatario, estado, error) VALUES (?, 'bienvenida', ?, 'omitido', 'envío de correo no activo')").run(p.id, p.email);
  auditar(req.equipo.id, 'aprobar_inscripcion', 'persona', p.id, { numero });
  // Sin correo todavía: la contraseña temporal se muestra UNA vez al equipo para que la entregue a la persona.
  res.json({ ok: true, numero_afiliado: formatoNumero(numero), password_temporal: temp.password, caduca: temp.caduca, correo: 'pendiente: el envío de correo todavía no está activo' });
});

intranet.post('/inscripciones/:id/rechazar', requerirEquipo(...GESTION), (req, res) => {
  const f = filtroAlcance(req.equipo);
  const p = db.prepare(`SELECT p.id, p.estado FROM personas p WHERE p.id = ? AND p.tipo = 'afiliado'${f.sql}`).get(Number(req.params.id), ...f.args);
  if (!p) return res.status(404).json({ error: 'No encontrada' });
  if (p.estado !== 'pendiente') return res.status(409).json({ error: 'Esta solicitud ya está resuelta' });
  const motivo = limpio(req.body?.motivo, 300);
  db.exec('BEGIN');
  try {
    db.prepare("UPDATE personas SET estado = 'rechazado', actualizado_en = ? WHERE id = ?").run(new Date().toISOString(), p.id);
    db.prepare("INSERT INTO movimientos_afiliacion (persona_id, tipo, desde, hasta, motivo, usuario_id) VALUES (?, 'rechazo', 'pendiente', 'rechazado', ?, ?)").run(p.id, motivo || null, req.equipo.id);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); return res.status(500).json({ error: 'No se pudo rechazar' }); }
  auditar(req.equipo.id, 'rechazar_inscripcion', 'persona', p.id, { motivo });
  res.json({ ok: true });
});
