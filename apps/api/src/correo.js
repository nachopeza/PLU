// Envío de correo por SMTP (cualquier proveedor: Google Workspace, Zoho, IONOS, Brevo…).
// Si no hay SMTP configurado, no falla: registra "omitido" y la gestión entrega la contraseña a mano.
import nodemailer from 'nodemailer';
import { db } from './db.js';
import { URL_PUBLICA } from './config.js';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
export const CORREO_ACTIVO = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
const DESDE = SMTP_FROM || (SMTP_USER ? `PLU <${SMTP_USER}>` : '');

const transporte = CORREO_ACTIVO
  ? nodemailer.createTransport({
      host: SMTP_HOST, port: Number(SMTP_PORT || 465), secure: Number(SMTP_PORT || 465) === 465,
      requireTLS: Number(SMTP_PORT || 465) === 587, auth: { user: SMTP_USER, pass: SMTP_PASS }, connectionTimeout: 10000, socketTimeout: 15000
    })
  : null;

function registrar(personaId, tipo, para, estado, error) {
  try { db.prepare('INSERT INTO correos (persona_id, tipo, destinatario, estado, error) VALUES (?, ?, ?, ?, ?)').run(personaId ?? null, tipo, para, estado, error ?? null); } catch { /* registro best-effort */ }
}

// Devuelve true si salió el correo. Nunca lanza.
export async function enviarCorreo({ personaId, tipo, para, asunto, texto }) {
  if (!CORREO_ACTIVO) { registrar(personaId, tipo, para, 'omitido', 'SMTP no configurado'); return false; }
  try {
    await transporte.sendMail({ from: DESDE, to: para, subject: asunto, text: texto });
    registrar(personaId, tipo, para, 'enviado'); return true;
  } catch (e) {
    console.error('correo:', e.message); registrar(personaId, tipo, para, 'error', String(e.message).slice(0, 200)); return false;
  }
}

const PIE = '\n\nPlataforma Liberal Unida\n' + URL_PUBLICA;
export function textoAcceso({ nombre, email, password, caduca, numero, motivo }) {
  const dias = caduca ? ` Caduca el ${new Date(caduca).toLocaleDateString('es-ES')}.` : '';
  return `Hola ${nombre},\n\n${motivo}\n\n` + (numero ? `Tu número de afiliado es ${numero}.\n` : '') +
    `Entra en ${URL_PUBLICA}/prototipo/portal.html\nCorreo: ${email}\nContraseña temporal: ${password}\n\nTe pediremos cambiarla en el primer acceso.${dias}\nSi no esperabas este mensaje, ignóralo.` + PIE;
}
