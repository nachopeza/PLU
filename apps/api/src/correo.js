// Envío de correo por SMTP (cualquier proveedor: Google Workspace, Zoho, IONOS, Brevo…).
// Si no hay SMTP configurado, no falla: registra "omitido" y la gestión entrega la contraseña a mano.
import nodemailer from 'nodemailer';
import { db } from './db.js';
import { URL_PUBLICA } from './config.js';
import { carneVigente } from './servicios.js';
import { datosCarne, generarCarnePdf } from './carne.js';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
export const CORREO_ACTIVO = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
const DESDE = SMTP_FROM || (SMTP_USER ? `PLU <${SMTP_USER}>` : '');

const transporte = CORREO_ACTIVO
  ? nodemailer.createTransport({
      host: SMTP_HOST, port: Number(SMTP_PORT || 465), secure: Number(SMTP_PORT || 465) === 465,
      requireTLS: Number(SMTP_PORT || 465) === 587, auth: { user: SMTP_USER, pass: SMTP_PASS }, connectionTimeout: 4000, greetingTimeout: 4000, socketTimeout: 8000
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
export async function enviarCorreo(datos) {
  const espera = new Promise((res) => setTimeout(() => res({ ok: false, motivo: 'El servidor de correo tarda demasiado en responder.' }), 5000));
  return Promise.race([enviarCorreoInterno(datos), espera]);
}
async function enviarCorreoInterno({ personaId, tipo, para, asunto, texto, adjuntos }) {
  if (!CORREO_DISPONIBLE) { registrar(personaId, tipo, para, 'omitido', 'correo no configurado'); return { ok: false, motivo: 'Correo no configurado en el servidor.' }; }
  try {
    if (CORREO_ACTIVO_API) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: DESDE_API, to: [para], subject: asunto, text: texto, ...(adjuntos?.length ? { attachments: adjuntos.map((a) => ({ filename: a.nombre, content: Buffer.from(a.bytes).toString('base64') })) } : {}) }), signal: AbortSignal.timeout(6000)
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || ('HTTP ' + r.status)); }
    } else {
      await transporte.sendMail({ from: DESDE, to: para, subject: asunto, text: texto, attachments: (adjuntos ?? []).map((a) => ({ filename: a.nombre, content: Buffer.from(a.bytes) })) });
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
    `Entra en ${URL_PUBLICA}/portal\nCorreo: ${email}\nContraseña temporal: ${password}\n\nAl entrar por primera vez te pediremos que la cambies por una tuya.${dias}\nSi tienes cualquier duda, responde a este correo o escribe a hola@somosplu.com. Y si no esperabas este mensaje, puedes ignorarlo.` + PIE;
}

// Aviso a una persona afiliada sobre algo que ha cambiado en su afiliación (carné, estado, provincia, solicitudes…).
// Con { carne: true } adjunta su carné vigente en PDF. Devuelve { ok, motivo } y nunca lanza.
export async function adjuntoCarne(p) {
  try {
    const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(p.id), c = carneVigente(p.id);
    if (!c) return undefined;
    const { bytes } = await generarCarnePdf(datosCarne(persona, c));
    return [{ nombre: `carne-plu-${persona.numero_afiliado}.pdf`, bytes }];
  } catch (e) { console.error('adjuntar carné:', e.message); return undefined; }
}
export async function avisarPersona(p, tipo, asunto, mensaje, { carne = false, portal = true } = {}) {
  let adjuntos;
  if (carne) {
    try {
      const c = carneVigente(p.id);
      if (c) { const { bytes } = await generarCarnePdf(datosCarne(p, c)); adjuntos = [{ nombre: `carne-plu-${p.numero_afiliado}.pdf`, bytes }]; }
    } catch (e) { console.error('adjuntar carné:', e.message); }
  }
  const texto = `Hola ${p.nombre},\n\n${mensaje}` + (adjuntos ? '\n\nTu carné actualizado va adjunto en este correo.' : '') +
    (portal ? `\n\nPuedes verlo todo en tu portal: ${URL_PUBLICA}/portal` : '') + '\n\nSi tienes cualquier duda o no esperabas este mensaje, escríbenos a hola@somosplu.com y te ayudamos.' + PIE;
  return enviarCorreo({ personaId: p.id, tipo, para: p.email, asunto, texto, adjuntos });
}
export const estadoCorreo = (envio) => ({ correo: envio.ok ? 'enviado' : 'no enviado', correo_motivo: envio.ok ? undefined : envio.motivo });
