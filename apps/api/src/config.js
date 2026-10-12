// Configuración y claves. Las claves de cifrado NUNCA van en el código ni en git.
// - En producción (NODE_ENV=production) se exigen en variables de entorno.
// - En local, si faltan, se generan una vez y se guardan en data/secretos.json (que git ignora).
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

import { DATA_DIR } from './db.js';

export const PRODUCCION = process.env.NODE_ENV === 'production';
export const URL_PUBLICA = process.env.PLU_PUBLIC_URL ?? 'http://localhost:8787';
export const COOKIE_SEGURA = URL_PUBLICA.startsWith('https://');

function claveHex(nombreEnv, clave, guardado) {
  const v = process.env[nombreEnv];
  if (v) {
    if (!/^[0-9a-f]{64}$/i.test(v)) throw new Error(`${nombreEnv} debe ser 64 caracteres hexadecimales (32 bytes).`);
    return Buffer.from(v, 'hex');
  }
  if (PRODUCCION) throw new Error(`Falta ${nombreEnv} en producción.`);
  if (!guardado[clave]) guardado[clave] = randomBytes(32).toString('hex');
  return Buffer.from(guardado[clave], 'hex');
}

const ruta = join(DATA_DIR, 'secretos.json');
const guardado = existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : {};
const antes = JSON.stringify(guardado);

export const CLAVE_CIFRADO = claveHex('PLU_CLAVE_CIFRADO', 'cifrado', guardado);
export const CLAVE_HMAC = claveHex('PLU_CLAVE_HMAC', 'hmac', guardado);

if (JSON.stringify(guardado) !== antes) {
  writeFileSync(ruta, JSON.stringify(guardado, null, 2));
  try { chmodSync(ruta, 0o600); } catch { /* en Windows no aplica */ }
  console.log('Claves de desarrollo generadas en data/secretos.json (no se suben a git).');
}
