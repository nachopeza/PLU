// Lógica compartida: números, contraseñas temporales, vigencia y emisión del carné.
import { randomInt } from 'node:crypto';
import { db } from './db.js';
import { hashPassword } from './seguridad.js';
import { edadEn } from './validar.js';

export const formatoNumero = (n) => (n ? `${n.slice(0, 2)}-${n.slice(2)}` : null);
export const ahoraISO = () => new Date().toISOString();
export const hoyISO = () => new Date().toISOString().slice(0, 10);

// Sin letras ambiguas (O/0, l/1/I)
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
export function passwordTemporal(n = 12) {
  let s = '';
  for (let i = 0; i < n; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}

// Asigna una contraseña temporal a un afiliado (caduca en 7 días y hay que cambiarla). Devuelve el texto UNA sola vez.
export function asignarPasswordTemporal(personaId) {
  const pw = passwordTemporal();
  const caduca = new Date(Date.now() + 7 * 86400_000).toISOString();
  db.prepare('UPDATE personas SET password_hash = ?, debe_cambiar_password = 1, password_temporal_expira_en = ?, actualizado_en = ? WHERE id = ?')
    .run(hashPassword(pw), caduca, ahoraISO(), personaId);
  db.prepare("DELETE FROM sesiones WHERE tipo = 'persona' AND sujeto_id = ?").run(personaId);
  return { password: pw, caduca };
}

// Vigencia: 5 años si tiene menos de 30 el día de la emisión, 10 si tiene 30 o más.
export function validoHasta(fechaNacimiento, desde = new Date()) {
  const años = (edadEn(fechaNacimiento, desde) ?? 30) < 30 ? 5 : 10;
  const d = new Date(desde); d.setUTCFullYear(d.getUTCFullYear() + años);
  return d.toISOString().slice(0, 10);
}

// Emite una versión nueva del carné y revoca la anterior.
export function emitirCarne(persona, motivoRevocacion = 'sustituido') {
  const ahora = ahoraISO();
  const ult = db.prepare('SELECT COALESCE(MAX(version), 0) AS v FROM carnes WHERE persona_id = ?').get(persona.id).v;
  db.prepare("UPDATE carnes SET revocado_en = ?, motivo_revocacion = ? WHERE persona_id = ? AND revocado_en IS NULL").run(ahora, motivoRevocacion, persona.id);
  const hasta = validoHasta(persona.fecha_nacimiento);
  db.prepare('INSERT INTO carnes (persona_id, version, numero_afiliado, emitido_en, valido_hasta) VALUES (?, ?, ?, ?, ?)')
    .run(persona.id, ult + 1, persona.numero_afiliado, ahora, hasta);
  return { version: ult + 1, valido_hasta: hasta };
}
export function revocarCarnes(personaId, motivo) {
  db.prepare('UPDATE carnes SET revocado_en = ?, motivo_revocacion = ? WHERE persona_id = ? AND revocado_en IS NULL').run(ahoraISO(), motivo, personaId);
}
export const carneVigente = (personaId) => db.prepare('SELECT * FROM carnes WHERE persona_id = ? AND revocado_en IS NULL ORDER BY version DESC LIMIT 1').get(personaId);

export function moverEstado(personaId, nuevo, tipoMov, motivo, usuarioId) {
  const p = db.prepare('SELECT estado FROM personas WHERE id = ?').get(personaId);
  db.prepare('UPDATE personas SET estado = ?, actualizado_en = ?, fecha_baja = CASE WHEN ? = \'baja\' THEN ? ELSE fecha_baja END WHERE id = ?')
    .run(nuevo, ahoraISO(), nuevo, ahoraISO(), personaId);
  db.prepare('INSERT INTO movimientos_afiliacion (persona_id, tipo, desde, hasta, motivo, usuario_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(personaId, tipoMov, p.estado, nuevo, motivo || null, usuarioId ?? null);
  // Al causar baja se borran los datos opcionales de opinión: el resultado de la Brújula (categoría especial) y los intereses
  if (nuevo === 'baja') {
    db.prepare('DELETE FROM brujula WHERE persona_id = ?').run(personaId);
    db.prepare('DELETE FROM intereses_persona WHERE persona_id = ?').run(personaId);
  }
}

export const transaccion = (fn) => {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
};
