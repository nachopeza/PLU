// Utilidades de seguridad: cifrado, hashes de contraseña, TOTP (doble verificación) y tickets firmados.
import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { CLAVE_CIFRADO, CLAVE_HMAC } from './config.js';

// ---- Cifrado de datos sensibles (DNI/NIE, secreto TOTP): AES-256-GCM ----
export function cifrar(texto) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', CLAVE_CIFRADO, iv);
  const datos = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), datos]).toString('base64');
}
export function descifrar(b64) {
  const b = Buffer.from(b64, 'base64');
  const d = createDecipheriv('aes-256-gcm', CLAVE_CIFRADO, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}
// Huella con clave: sirve para detectar documentos repetidos sin descifrarlos.
export const huella = (texto) => createHmac('sha256', CLAVE_HMAC).update(texto).digest('hex');
export const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');

// ---- Contraseñas: scrypt con sal ----
export function hashPassword(pw) {
  const sal = randomBytes(16);
  return `scrypt$${sal.toString('hex')}$${scryptSync(pw, sal, 64).toString('hex')}`;
}
export function verificarPassword(pw, guardado) {
  const [alg, sal, hash] = String(guardado).split('$');
  if (alg !== 'scrypt' || !sal || !hash) return false;
  const calc = scryptSync(pw, Buffer.from(sal, 'hex'), 64);
  const esperado = Buffer.from(hash, 'hex');
  return calc.length === esperado.length && timingSafeEqual(calc, esperado);
}

// ---- Aleatorios ----
export const tokenAleatorio = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const digitosAleatorios = (n) => String(randomInt(0, 10 ** n)).padStart(n, '0');

// ---- TOTP (RFC 6238): el código de 6 cifras de la app autenticadora ----
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function nuevoSecretoTotp() {
  const b = randomBytes(20); let bits = '', s = '';
  for (const x of b) bits += x.toString(2).padStart(8, '0');
  for (let i = 0; i + 5 <= bits.length; i += 5) s += B32[parseInt(bits.slice(i, i + 5), 2)];
  return s;
}
function base32ABuffer(s) {
  let bits = ''; for (const ch of s) bits += B32.indexOf(ch).toString(2).padStart(5, '0');
  const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
function codigoTotp(secreto, contador) {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(contador));
  const h = createHmac('sha1', base32ABuffer(secreto)).update(msg).digest();
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, '0');
}
export function verificarTotp(secreto, codigo) {
  if (!/^\d{6}$/.test(String(codigo))) return false;
  const t = Math.floor(Date.now() / 30000);
  return [-1, 0, 1].some((d) => codigoTotp(secreto, t + d) === codigo);
}
export const urlOtpauth = (secreto, cuenta) =>
  `otpauth://totp/PLU:${encodeURIComponent(cuenta)}?secret=${secreto}&issuer=PLU&digits=6&period=30`;

// ---- Tickets firmados de corta vida (entre contraseña y código 2FA) ----
export function crearTicket(usuarioId, minutos = 5) {
  const cuerpo = Buffer.from(JSON.stringify({ u: usuarioId, e: Date.now() + minutos * 60000 })).toString('base64url');
  return `${cuerpo}.${createHmac('sha256', CLAVE_HMAC).update(cuerpo).digest('base64url')}`;
}
export function leerTicket(t) {
  const [cuerpo, firma] = String(t ?? '').split('.');
  if (!cuerpo || !firma) return null;
  const esperada = createHmac('sha256', CLAVE_HMAC).update(cuerpo).digest('base64url');
  if (firma.length !== esperada.length || !timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;
  try { const d = JSON.parse(Buffer.from(cuerpo, 'base64url').toString()); return d.e > Date.now() ? d.u : null; } catch { return null; }
}

// ---- Límite de intentos en memoria (se reinicia con el servidor) ----
const intentos = new Map();
export function limitar(clave, max, ventanaMs) {
  const ahora = Date.now();
  const lista = (intentos.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (lista.length >= max) { intentos.set(clave, lista); return false; }
  lista.push(ahora); intentos.set(clave, lista); return true;
}
