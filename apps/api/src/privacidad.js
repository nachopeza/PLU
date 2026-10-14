// Web en privado ("modo mantenimiento"): mientras está activo, quien no tenga acceso solo ve una página de
// "estamos trabajando" y no puede leer ni textos ni datos públicos. Entran:
//   1) el equipo con la sesión de la intranet iniciada (cookie plu_equipo), o
//   2) quien introduzca la clave de vista previa (variable PLU_ACCESO_WEB) en la propia página de espera.
// Se controla con PLU_WEB_PRIVADA: "1" privada, "0" pública. Si no se define: privada en producción, pública en local.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from './db.js';
import { PRODUCCION, CLAVE_HMAC, COOKIE_SEGURA } from './config.js';
import { sha256 } from './seguridad.js';
import { leerCookie } from './sesion.js';

const env = process.env.PLU_WEB_PRIVADA;
export const WEB_PRIVADA = env === undefined || env === '' ? PRODUCCION : !['0', 'false', 'no'].includes(env.toLowerCase());
const CLAVE = process.env.PLU_ACCESO_WEB ?? '';
const COOKIE = 'plu_vista';
const DIAS = 30;

const firma = () => createHmac('sha256', CLAVE_HMAC).update('vista-previa:' + CLAVE).digest('hex');
const igual = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

function esEquipo(req) {
  const token = leerCookie(req, 'plu_equipo');
  if (!token) return false;
  return !!db.prepare(
    `SELECT 1 FROM sesiones s JOIN usuarios_intranet u ON u.id = s.sujeto_id
      WHERE s.id = ? AND s.tipo = 'staff' AND s.expira_en > ? AND u.activo = 1`,
  ).get(sha256(token), new Date().toISOString());
}
const tieneVista = (req) => !!CLAVE && igual(leerCookie(req, COOKIE) ?? '', firma());

// Recursos que no revelan contenido (estilos, scripts, fuentes, imágenes). Las páginas y los datos sí se protegen.
const RECURSO = /\.(css|js|mjs|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|webmanifest|map)$/i;
// Rutas que siguen abiertas para que el equipo pueda entrar a trabajar
const ABIERTA = /^\/(intranet|intranet\.html)\/?$/;

const intentos = new Map(); // ip -> [marcas de tiempo]
function demasiados(ip) {
  const ahora = Date.now(); const lista = (intentos.get(ip) ?? []).filter((t) => ahora - t < 10 * 60_000);
  lista.push(ahora); intentos.set(ip, lista); return lista.length > 8;
}

const PAGINA = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#0a1810">
<title>PLU · Estamos trabajando</title>
<link rel="icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%}
body{min-height:100dvh;display:grid;place-items:center;padding:32px 20px;background:#0a1810 radial-gradient(60vw 45vh at 12% 8%,rgba(35,150,90,.28),transparent 70%) no-repeat;background-attachment:fixed;color:#eef2ea;font:400 1.0625rem/1.6 -apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
main{width:min(100%,520px);text-align:left}
.logo{display:flex;align-items:center;gap:12px;margin-bottom:40px}.logo img.c{width:40px;height:40px}.logo img.w{height:26px;filter:brightness(0) invert(1)}
.tag{font:500 .72rem ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:#3dd070;margin:0 0 14px}
h1{font-size:clamp(2.1rem,8vw,3.1rem);line-height:1.04;letter-spacing:-.035em;margin:0 0 18px;font-weight:800}
h1 em{font-style:normal;color:#3dd070}
p{color:#a7b8ab;margin:0 0 28px;max-width:46ch}
details{margin-top:36px;border-radius:20px;background:rgba(255,255,255,.07);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);padding:4px 18px}
summary{cursor:pointer;list-style:none;padding:14px 0;font-weight:600;color:#d5e0d7;font-size:.95rem}summary::-webkit-details-marker{display:none}
summary::after{content:"+";float:right;color:#3dd070}details[open] summary::after{content:"–"}
form{display:flex;gap:10px;padding:0 0 18px;flex-wrap:wrap}
input{flex:1 1 180px;min-width:0;font:inherit;color:#fff;background:rgba(255,255,255,.1);border:0;border-radius:14px;padding:13px 16px;outline:none}
input:focus{box-shadow:0 0 0 2px #3dd070}
button{font:inherit;font-weight:700;background:#3dd070;color:#06180e;border:0;border-radius:14px;padding:13px 20px;cursor:pointer}
.msg{flex-basis:100%;margin:0;font-size:.9rem;color:#ff9b92;min-height:1.2em}
.eq{display:block;padding:0 0 18px;font-size:.92rem;color:#a7b8ab}.eq a{color:#3dd070}
</style></head><body><main>
<div class="logo"><img class="c" src="/brand/clover.png" alt=""><img class="w" src="/brand/word.png" alt="PLU"></div>
<p class="tag">Plataforma Liberal Unida</p>
<h1>Estamos trabajando <em>en la plataforma.</em></h1>
<p>Estamos preparando los textos y los cimientos de PLU. Muy pronto estará disponible para todo el mundo.</p>
<details id="d"><summary>Acceso del equipo</summary>
<form id="f" autocomplete="off"><input type="password" id="k" placeholder="Clave de acceso" aria-label="Clave de acceso" required><button type="submit">Entrar</button><p class="msg" id="m" role="status"></p></form>
<span class="eq">¿Tienes cuenta de equipo? <a href="/intranet">Entra a la intranet</a> y vuelve aquí.</span></details>
<script>
document.getElementById('f').addEventListener('submit',function(e){e.preventDefault();var m=document.getElementById('m');m.textContent='';
fetch('/api/vista-previa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clave:document.getElementById('k').value})})
.then(function(r){if(r.ok){location.reload();}else{return r.json().catch(function(){return{}}).then(function(d){m.textContent=d.error||'Clave incorrecta';});}})
.catch(function(){m.textContent='No se pudo comprobar. Inténtalo de nuevo.';});});
</script></main></body></html>`;

export function privacidad(app) {
  // Clave de vista previa
  app.post('/api/vista-previa', (req, res) => {
    if (!WEB_PRIVADA) return res.json({ ok: true });
    if (!CLAVE) return res.status(403).json({ error: 'Acceso por clave no activado. Entra con tu cuenta de equipo.' });
    if (demasiados(req.ip)) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
    if (!igual(String(req.body?.clave ?? ''), CLAVE)) return res.status(401).json({ error: 'Clave incorrecta' });
    res.setHeader('Set-Cookie', `${COOKIE}=${firma()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${DIAS * 86400}${COOKIE_SEGURA ? '; Secure' : ''}`);
    res.json({ ok: true });
  });

  app.use((req, res, next) => {
    if (!WEB_PRIVADA) return next();
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const p = req.path;
    if (p === '/robots.txt') return res.type('text/plain').send('User-agent: *\nDisallow: /\n');
    if (p === '/api/health' || p === '/api/vista-previa') return next();
    if (esEquipo(req) || tieneVista(req)) return next();
    if (p.startsWith('/api/intranet')) return next(); // la intranet tiene su propia seguridad
    if (p.startsWith('/api')) return res.status(503).json({ error: 'Web en preparación' });
    if (RECURSO.test(p) || ABIERTA.test(p)) return next();
    res.status(503).set({ 'Retry-After': '86400', 'Cache-Control': 'no-store' }).type('html').send(PAGINA);
  });
}
