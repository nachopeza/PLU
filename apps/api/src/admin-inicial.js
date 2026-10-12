// Crea el usuario maestro (rol admin) a partir de variables de entorno, solo si todavía no existe.
// No hay contraseñas por defecto: si las variables no están, no se crea ningún usuario.
import { db } from './db.js';
import { hashPassword } from './seguridad.js';

export function crearAdminInicial() {
  const usuario = (process.env.PLU_ADMIN_USERNAME ?? '').trim().toLowerCase();
  const password = process.env.PLU_ADMIN_PASSWORD ?? '';
  if (!usuario || !password) {
    const hay = db.prepare('SELECT COUNT(*) AS n FROM usuarios_intranet').get().n;
    if (!hay) console.warn('⚠ No hay usuarios de intranet. Define PLU_ADMIN_USERNAME y PLU_ADMIN_PASSWORD en apps/api/.env y reinicia.');
    return;
  }
  if (password.length < 12) { console.warn('⚠ PLU_ADMIN_PASSWORD debe tener al menos 12 caracteres. No se crea el administrador.'); return; }
  if (db.prepare('SELECT 1 FROM usuarios_intranet WHERE username = ?').get(usuario)) return;
  db.prepare("INSERT INTO usuarios_intranet (username, nombre, password_hash, rol) VALUES (?, 'Administración', ?, 'admin')").run(usuario, hashPassword(password));
  console.log(`Administrador "${usuario}" creado. Al entrar por primera vez se te pedirá activar la doble verificación.`);
}
