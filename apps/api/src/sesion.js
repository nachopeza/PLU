// Sesiones de la intranet: cookie HttpOnly con un token aleatorio. En la base de datos solo se guarda su hash.
import { db } from './db.js';
import { COOKIE_SEGURA } from './config.js';
import { sha256, tokenAleatorio } from './seguridad.js';

const DURACION_H = 8;
const NOMBRE = 'plu_equipo';

export function leerCookie(req, nombre) {
  for (const parte of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function iniciarSesion(res, usuarioId) {
  const token = tokenAleatorio();
  const expira = new Date(Date.now() + DURACION_H * 3600_000).toISOString();
  db.prepare("INSERT INTO sesiones (id, tipo, sujeto_id, expira_en) VALUES (?, 'staff', ?, ?)").run(sha256(token), usuarioId, expira);
  res.setHeader('Set-Cookie', `${NOMBRE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DURACION_H * 3600}${COOKIE_SEGURA ? '; Secure' : ''}`);
}

export function cerrarSesion(req, res) {
  const token = leerCookie(req, NOMBRE);
  if (token) db.prepare('DELETE FROM sesiones WHERE id = ?').run(sha256(token));
  res.setHeader('Set-Cookie', `${NOMBRE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${COOKIE_SEGURA ? '; Secure' : ''}`);
}

// Middleware: exige sesión de equipo y, si se indican, uno de los roles permitidos.
export function requerirEquipo(...roles) {
  return (req, res, next) => {
    const token = leerCookie(req, NOMBRE);
    const fila = token && db.prepare(
      `SELECT u.id, u.username, u.nombre, u.rol, u.territorio_id
         FROM sesiones s JOIN usuarios_intranet u ON u.id = s.sujeto_id
        WHERE s.id = ? AND s.tipo = 'staff' AND s.expira_en > ? AND u.activo = 1`,
    ).get(sha256(token), new Date().toISOString());
    if (!fila) return res.status(401).json({ error: 'Sesión no válida' });
    if (roles.length && !roles.includes(fila.rol)) return res.status(403).json({ error: 'No tienes permiso para esto' });
    req.equipo = fila;
    next();
  };
}

// Las peticiones que cambian datos deben ser JSON (un formulario de otra web no puede enviarlo así).
export function soloJson(req, res, next) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({ error: 'Se esperaba JSON' });
  }
  next();
}

export function auditar(usuarioId, accion, entidad, entidadId, detalle) {
  db.prepare('INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle_json) VALUES (?, ?, ?, ?, ?)')
    .run(usuarioId ?? null, accion, entidad, entidadId ?? null, detalle ? JSON.stringify(detalle) : null);
}
