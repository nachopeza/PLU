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

// Proveedor por API web (puerto 443): funciona aunque el hosting bloquee SMTP. Resend: https://resend.com
const { RESEND_API_KEY } = process.env;
export const CORREO_ACTIVO_API = Boolean(RESEND_API_KEY);
export const CORREO_DISPONIBLE = CORREO_ACTIVO || CORREO_ACTIVO_API;
const DESDE_API = SMTP_FROM || 'PLU <hola@somosplu.com>';
console.log('Correo:', CORREO_ACTIVO_API ? 'API Resend activa' : CORREO_ACTIVO ? 'SMTP activo (' + SMTP_HOST + ')' : 'no configurado (las contraseñas se entregan a mano)');

function motivo(e) {
  const m = String(e && e.message || e);
  if (/ETIMEDOUT|ECONNREFUSED|ENETUNREACH|timeout|Greeting never received/i.test(m)) return 'No hay conexión con el servidor de correo (el hosting puede bloquear SMTP). Usa RESEND_API_KEY.';
  if (/EAUTH|Invalid login|535|authentication/i.test(m)) return 'Usuario o contraseña SMTP incorrectos.';
  if (/ENOTFOUND/i.test(m)) return 'Servidor de correo no encontrado: revisa SMTP_HOST.';
  if (/domain.*not verified|not verified/i.test(m)) return 'El dominio aún no está verificado en el proveedor de correo.';
  return m.slice(0, 160);
}

// Devuelve { ok, motivo }. Nunca lanza.
export async function enviarCorreo({ personaId, tipo, para, asunto, texto }) {
  if (!CORREO_DISPONIBLE) { registrar(personaId, tipo, para, 'omitido', 'correo no configurado'); return { ok: false, motivo: 'Correo no configurado en el servidor.' }; }
  try {
    if (CORREO_ACTIVO_API) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: DESDE_API, to: [para], subject: asunto, text: texto }), signal: AbortSignal.timeout(15000)
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || ('HTTP ' + r.status)); }
    } else {
      await transporte.sendMail({ from: DESDE, to: para, subject: asunto, text: texto });
    }
    registrar(personaId, tipo, para, 'enviado'); return { ok: true };
  } catch (e) {
    console.error('correo:', e.message); registrar(personaId, tipo, para, 'error', String(e.message).slice(0, 200)); return { ok: false, motivo: motivo(e) };
  }
}

const PIE = '\n\nPlataforma Liberal Unida\n' + URL_PUBLICA;
export function textoAcceso({ nombre, email, password, caduca, numero, motivo }) {
  const dias = caduca ? ` Caduca el ${new Date(caduca).toLocaleDateString('es-ES')}.` : '';
  return `Hola ${nombre},\n\n${motivo}\n\n` + (numero ? `Tu número de afiliado es ${numero}.\n` : '') +
    `Entra en ${URL_PUBLICA}/portal\nCorreo: ${email}\nContraseña temporal: ${password}\n\nTe pediremos cambiarla en el primer acceso.${dias}\nSi no esperabas este mensaje, ignóralo.` + PIE;
}
