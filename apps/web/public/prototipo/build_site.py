import re
import pathlib
OUT = pathlib.Path(__file__).parent

def imgtag(pid, w, alt):
    # Primero la foto local (fotos/<id>.jpg, la deja descargar-fotos.sh); si no existe, la carga de Unsplash.
    remote = f'https://images.unsplash.com/{pid}?auto=format&fit=crop&w={w}&q=70'
    return f'<img src="fotos/{pid}.jpg" alt="{alt}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'{remote}\'">'

def I(pid, w, alt, duo=True, extra=''):
    return f'<div class="ph{" duo" if duo else ""} {extra}">{imgtag(pid, w, alt)}</div>'

# Fotos (Unsplash, enlazadas por id). Se pueden cambiar o sustituir por las propias.
P = {
  'hero':   ('photo-1520880867055-1e30d1cb001c', 'Cuatro personas jóvenes de pie al borde de una montaña'),
  'bench':  ('photo-1520127877998-122c33e8eb38', 'Cuatro jóvenes sentados en un banco frente al agua'),
  'park':   ('photo-1758613171176-ea64579c2dcf', 'Cuatro amigos sonriendo en un parque en otoño'),
  'fence':  ('photo-1761839262867-af53d08b0eb5', 'Cuatro amigos saltando una valla de madera'),
  'libre':  ('photo-1593250785690-dcb40957506f', 'Mujer con los brazos en alto'),
  'libre2': ('photo-1520095972714-909e91b038e5', 'Mujer con los brazos en alto delante de tiendas de campaña'),
  'meet':   ('photo-1517048676732-d65bc937f952', 'Personas sentadas en una reunión con bolígrafos'),
  'floor':  ('photo-1529209076408-5a115ec9f1c6', 'Personas sentadas en el suelo alrededor de una mesa'),
  'circle': ('photo-1555069855-e580a9adbf43', 'Círculo de personas sentadas sobre la hierba'),
  'cafe':   ('photo-1590650046871-92c887180603', 'Cuatro mujeres conversando en una mesa de café'),
  'viv':    ('photo-1741156386380-0236c72eb6f9', 'Una persona sostiene las llaves de casa en la entrada'),
  'san':    ('photo-1758691461935-202e2ef6b69f', 'Médico hablando con un paciente en la consulta'),
  'edu':    ('photo-1752747115265-1e4cfb2c1212', 'Dos personas estudiando en un espacio luminoso'),
  'tra':    ('photo-1519313825-713a373f2bce', 'Grupo de personas en el metro'),
  'street': ('photo-1556798542-13bfa5d6d01e', 'Gente en una calle durante el día'),
  'walk':   ('photo-1663162550938-60f70fab5d31', 'Un grupo de personas caminando por una acera'),
  'phone':  ('photo-1768299947895-06b676197f74', 'Tres amigos riendo mirando un móvil'),
}
def ph(k, w=1200, extra=''): return I(P[k][0], w, P[k][1], extra=extra)

ICON0 = {
 'mail': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
 'idea': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/></svg>',
 'hands': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14.5c3 0 6 1.5 6 5.5"/></svg>',
}

import json as _json
CATALOGOS = _json.load(open(pathlib.Path(__file__).resolve().parents[3] / 'api' / 'src' / 'catalogos.json', encoding='utf-8'))
def opciones(k): return ''.join(f'<option value="{v}">{t}</option>' for v, t in CATALOGOS[k])

NAV = [('proyecto.html', 'El proyecto'), ('escucha.html', 'Escucha'), ('propuestas.html', 'Ámbitos'), ('eventos.html', 'Agenda'), ('participa.html', 'Participa'), ('como-funciona.html', 'Transparencia')]

DESCS = {
  'index.html': 'Plataforma Liberal Unida: un movimiento ciudadano que empieza por escuchar. Cuéntanos qué te gustaría cambiar.',
  'proyecto.html': 'El proyecto de PLU: principios, valores y cómo queremos devolver el poder a las personas y a los territorios.',
  'propuestas.html': 'Ámbitos de trabajo de PLU: vivienda, sanidad, educación, transporte, trabajo e instituciones. No son promesas: son temas en los que queremos escuchar.',
  'escucha.html': 'Lo que nos cuenta la gente: cómo agrupamos las necesidades y propuestas ciudadanas por tema para estudiarlas y darles respuesta.',
  'ideas.html': 'Ideas ciudadanas: propón, apoya y comenta ideas para mejorar tu entorno. Las personas afiliadas votan.',
  'eventos.html': 'Agenda de PLU: actos, charlas y quedadas. Inscríbete con tu nombre y tu correo.',
  'participa.html': 'Formas de participar en PLU: proponer ideas, debatir, votar, ser voluntario o afiliarte.',
  'democracia.html': 'Democracia y participación: elecciones, iniciativa ciudadana, consultas y asambleas, explicadas con claridad.',
  'consultas.html': 'Votaciones y consultas de PLU: resultados, quórum y si la decisión es vinculante o consultiva.',
  'debate.html': 'Debate abierto: los temas en discusión en PLU y cómo se toman las decisiones.',
  'voluntariado.html': 'Voluntariado en PLU: comunicación, diseño, tecnología, eventos y más. No hace falta ser afiliado.',
  'como-funciona.html': 'Cómo funciona PLU: decisiones, transparencia y rendición de cuentas, con datos reales de la plataforma.',
  'afiliate.html': 'Afíliate a PLU: es gratis, sin compromiso, y recibes tu carné digital por correo.',
  'noticias.html': 'Noticias y comunicados de PLU.',
  'donar.html': 'Dona a PLU por transferencia. Financiación a la vista de todos: identificación obligatoria y total publicado.',
  'privacidad.html': 'Política de privacidad de PLU: qué datos tratamos, para qué y cuáles son tus derechos.',
  'terminos.html': 'Términos de uso de la plataforma de PLU.',
  'cookies.html': 'Política de cookies de PLU.',
  'normas.html': 'Normas de participación en PLU: respeto, veracidad y moderación.',
  'faq.html': 'Preguntas frecuentes sobre PLU, la afiliación y la participación.',
  'contacto.html': 'Contacta con PLU.',
}
NOINDEX = {'portal.html', 'intranet.html', 'encuesta.html', 'idea.html'}
def seo(fname, title):
    ruta = '' if fname == 'index.html' else fname[:-5]
    desc = DESCS.get(fname, 'Plataforma Liberal Unida: la libertad de las personas, la identidad de los territorios, el bienestar de todos.')
    t = title.replace('"', '&quot;')
    if fname in NOINDEX:
        return '<meta name="robots" content="noindex,nofollow">'
    out = (f'<meta name="description" content="{desc}">\n<link rel="canonical" href="__URL__/{ruta}">\n'
           f'<meta property="og:type" content="website"><meta property="og:site_name" content="PLU · Plataforma Liberal Unida"><meta property="og:locale" content="es_ES">'
           f'<meta property="og:title" content="{t}"><meta property="og:description" content="{desc}"><meta property="og:url" content="__URL__/{ruta}">'
           f'<meta property="og:image" content="__URL__/brand/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="PLU · Plataforma Liberal Unida">'
           f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{t}"><meta name="twitter:description" content="{desc}"><meta name="twitter:image" content="__URL__/brand/og.png">')
    if fname == 'index.html':
        out += ('\n<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"PLU · Plataforma Liberal Unida","alternateName":"PLU","url":"__URL__/","logo":"__URL__/apple-touch-icon.png"}</script>')
    return out

def page(fname, title, body, hero=''):
    links = ''.join(f'<a href="{h}"{" aria-current=\"page\"" if h == fname else ""}>{t}</a>' for h, t in NAV)
    mlinks = ('<span class="menu-t">La web</span>' + ''.join(f'<a href="{h}">{t}</a>' for h, t in NAV)
              + '<span class="menu-t">Participa</span><a href="ideas.html">Ideas ciudadanas</a><a href="debate.html">Debate abierto</a><a href="consultas.html">Votaciones</a><a href="noticias.html">Noticias</a><a href="voluntariado.html">Voluntariado</a>'
              + '<span class="menu-t">Tu cuenta</span><a href="portal.html">Portal del afiliado</a><a href="afiliate.html">Afíliate</a>')
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Figtree:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap">
<link rel="icon" href="favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="favicon-16.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<meta name="theme-color" content="#0a1810">
{seo(fname, title)}
<link rel="stylesheet" href="styles.css">
<script>document.documentElement.classList.add("js","cms-pendiente");setTimeout(function(){{document.documentElement.classList.remove("cms-pendiente")}},1500)</script>
</head>
<body>
<div id="progress" aria-hidden="true"></div><div class="glow" id="glow" aria-hidden="true"></div>
<a class="skip-link" href="#main">Saltar al contenido</a>
<header class="site-header">
  <div class="wrap">
    <div class="nav-pill">
      <a class="brand" href="index.html" aria-label="PLU, inicio"><span class="clover" role="img" aria-label="Trébol de la PLU"></span><img class="wordmark" src="brand/word.png" alt="PLU"></a>
      <nav class="nav-links" aria-label="Principal">{links}</nav>
      <div class="nav-actions">
        <button class="icon-btn" id="themeBtn" type="button" aria-label="Cambiar tema claro u oscuro"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></button>
        <a class="btn btn-ghost btn-sm hide-s" href="portal.html">Soy afiliado</a>
        <a class="btn btn-primary btn-sm" href="afiliate.html">Únete</a>
        <button class="icon-btn menu-btn" id="menuBtn" type="button" aria-expanded="false" aria-controls="menu" aria-label="Abrir menú"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg></button>
      </div>
    </div>
    <nav class="menu" id="menu" aria-label="Menú móvil" hidden>{mlinks}</nav>
  </div>
</header>
<main id="main" tabindex="-1">
{hero}{body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a class="brand" href="index.html" aria-label="PLU, inicio"><span class="clover" role="img" aria-label="Trébol de la PLU"></span><img class="wordmark" src="brand/word.png" alt="PLU"></a>
        <p class="muted" style="margin-top:14px;max-width:26rem">Plataforma Liberal Unida. La libertad de las personas. La identidad de los territorios. El bienestar de todos.<br>Un proyecto ciudadano en construcción, abierto a escuchar, aprender y desarrollar propuestas con responsabilidad.</p>
      </div>
      <div><h2 class="footer-h">Explora</h2><ul class="footer-links"><li><a href="proyecto.html">El proyecto</a></li><li><a href="escucha.html">Lo que nos cuenta la gente</a></li><li><a href="propuestas.html">Ámbitos de trabajo</a></li><li><a href="democracia.html">Cómo participar</a></li><li><a href="como-funciona.html">Transparencia</a></li><li><a href="debate.html">Debate abierto</a></li></ul></div>
      <div><h2 class="footer-h">Comunidad</h2><ul class="footer-links"><li><a href="ideas.html">Ideas ciudadanas</a></li><li><a href="consultas.html">Votaciones</a></li><li><a href="eventos.html">Agenda</a></li><li><a href="noticias.html">Noticias</a></li><li><a href="voluntariado.html">Voluntariado</a></li><li><a href="donar.html">Donar</a></li></ul></div>
      <div><h2 class="footer-h">Acceso</h2><ul class="footer-links"><li><a href="afiliate.html">Afíliate (es gratis)</a></li><li><a href="donar.html">Donar</a></li><li><a href="portal.html">Portal del afiliado</a></li><li><a href="intranet.html">Acceso del equipo</a></li></ul></div>
      <div><h2 class="footer-h">Legal</h2><ul class="footer-links"><li><a href="privacidad.html">Privacidad</a></li><li><a href="terminos.html">Términos</a></li><li><a href="cookies.html">Cookies</a></li><li><a href="normas.html">Normas de participación</a></li><li><a href="faq.html">Preguntas frecuentes</a></li><li><a href="contacto.html">Contacto</a></li></ul></div>
    </div>
    <p class="legal">Versión de trabajo de octubre de 2026. Proyecto en construcción: no es un programa electoral ni un texto jurídico aprobado. Nombre, siglas y lema son provisionales. Fotografías de Unsplash, provisionales. Versión de pruebas: no introduzcas datos reales hasta el lanzamiento.</p>
  </div>
</footer>
<script src="cms.js"></script>
<script src="site.js"></script>
<script src="comunidad.js"></script>
<script src="fx.js"></script>
</body>
</html>
'''


def svg(d): return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{d}</svg>'
IC = {
 'vote': svg('<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M12 3v8M9 8l3 3 3-3"/>'),
 'spark': svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>'),
 'group': svg('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14.5c3 0 6 1.5 6 5.5"/>'),
 'ballot': svg('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="m9 12 2 2 4-4"/>'),
 'doc': svg('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'),
 'scale': svg('<path d="M12 4v16M6 20h12M5 8h14M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z"/>'),
 'chart': svg('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'),
 'eye': svg('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
 'check': svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'),
 'map': svg('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>'),
 'euro': svg('<path d="M17 6a6 6 0 1 0 0 12M5 10h9M5 14h9"/>'),
 'mail': svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
 'wallet': svg('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12h5M3 10h18"/>'),
 'conflict': svg('<path d="M12 3 2 20h20zM12 10v4M12 17h.01"/>'),
 'people': svg('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5"/>'),
 'speech': svg('<path d="M4 5h16v11H9l-5 4z"/>'),
 'building': svg('<path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6M8 11h.01M12 11h.01M16 11h.01"/>'),
}
def ico(k): return f'<span class="icoc">{IC[k]}</span>'
def icoitem(k, t, sm=''): return f'<div class="icoitem">{ico(k)}<span>{t}{f"<small>{sm}</small>" if sm else ""}</span></div>'

def hero_page(k, eyebrow, h1, sub=''):
    return f'<section class="page-hero">{ph(k, 1600)}<div class="wrap"><span class="eyebrow">{eyebrow}</span><h1>{h1}</h1>{f"<p>{sub}</p>" if sub else ""}</div></section>'

def tile(href, k, h, p, arrow='Saber más →', wide=False):
    return f'<a class="tile{" wide" if wide else ""}" href="{href}">{ph(k, 800)}<div class="in"><h3>{h}</h3><p>{p}</p><span class="arrow">{arrow}</span></div></a>'

# ================= INICIO =================
def R(extra=''): return f' data-r="{extra}"' if extra is not None else ''
CL = '<div class="clover big" aria-hidden="true"></div>'

def form_necesidad(clase='', titulo='¿Qué te gustaría cambiar?'):
    temas = ['Vivienda', 'Sanidad', 'Educación', 'Transporte', 'Empleo y vida cotidiana', 'Servicios públicos', 'Instituciones y participación', 'Otro']
    corto = {'Empleo y vida cotidiana': 'Trabajo', 'Instituciones y participación': 'Instituciones'}
    chips = ''.join(f'<label class="tema"><input type="radio" name="area" value="{t}" required><span>{corto.get(t, t)}</span></label>' for t in temas)
    return f'''<form class="form-card {clase}" id="contar" data-api="/api/necesidades" data-ok="Gracias por compartirlo con PLU." novalidate>
      <h2>{titulo}</h2>
      <div class="field"><label for="h-t">Cuéntanos qué ocurre y por qué debería cambiar</label><textarea id="h-t" name="texto" rows="2" required minlength="10" maxlength="600" placeholder="Ej.: Que haya transporte público para volver a casa después de las nueve de la noche."></textarea></div>
      <details class="mas tema-d"><summary>Tema <small class="tsel">elige uno</small></summary><div class="tema-chips" role="radiogroup" aria-label="Tema">{chips}</div></details>
      <details class="mas"><summary>Provincia o correo <small>(opcional)</small></summary>
        <div class="field-pair"><div class="field"><label for="f-prov">¿Dónde ocurre?</label><select id="f-prov" name="provincia_id" data-vacio="Provincia (opcional)"><option value="">Provincia (opcional)</option></select></div>
        <div class="field"><label for="h-e">Correo electrónico</label><input id="h-e" name="email" type="email" autocomplete="email" placeholder="Para contarte novedades"></div></div>
      </details>
      <details class="mas"><summary>Publicación y qué pasará con tu aportación</summary>
        <label class="consent"><input type="checkbox" name="acepta_publicar"><span>Autorizo que se publique de forma anónima, sin mi nombre ni mis datos de contacto <small>(opcional)</small>.</span></label>
        <p class="nota-p">Será revisada antes de publicarse. No mostraremos tu identidad ni tus datos de contacto. Si queremos publicarla de forma anónima, te explicaremos cómo y bajo qué condiciones.</p>
      </details>
      <label class="consent"><input type="checkbox" name="acepta" required><span>Acepto la <a class="link" href="privacidad.html">política de privacidad</a> para que PLU estudie mi aportación.</span></label>
      <button class="btn btn-primary" type="submit">Enviar mi propuesta</button><p class="form-status" role="status" aria-live="polite"></p>
    </form>'''

home_hero = f'''<section class="hero">{ph('walk', 1800)}
  <div class="aurora" aria-hidden="true"><i></i><i></i><i></i><svg class="trefoil" viewBox="0 0 24 24"><path d="M12 12c-3-5-8-4-8 0s5 5 8 0zm0 0c5-3 4-8 0-8s-5 5 0 8zm0 0c3 5 8 4 8 0s-5-5-8 0zm0 0c-5 3-4 8 0 8s5-5 0-8z" fill="currentColor"/></svg></div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <span class="eyebrow" data-r>Un movimiento ciudadano</span>
      <h1><span class="split">Tu voz merece</span> <span class="split">llegar más lejos.</span> <span class="split"><em>Empecemos por escuchar.</em></span></h1>
      <p class="hero-p" data-r>Queremos conocer los problemas que afectan a tu vida y trabajar para que las buenas ideas se conviertan en cambios reales.</p>
      <p class="rota" data-r>Hoy escuchamos sobre <b class="rot" data-words="vivienda|sanidad|educación|transporte|empleo|servicios públicos|instituciones">vivienda</b></p>
      <div class="cta-row" data-r><a class="btn btn-light magnet" href="#contar">Cuéntanos qué cambiarías</a><a class="btn btn-line-light magnet" href="#como-trabajamos">Cómo trabajamos →</a></div>
    </div>
    {form_necesidad('hero-form')}
  </div>
</section>
'''

PRIN = [('Libertad individual','Tus decisiones, tus derechos.'),('Democracia real','Participa, decide, exige.'),('Igualdad de oportunidades','El origen no define tu futuro.'),('Estado de derecho','La ley protege a todos.'),('Economía de mercado','Más empleo, más innovación.'),('Servicios esenciales','Sanidad, educación, vivienda, transporte.'),('Competencias claras','Cada quién lo que le corresponde.'),('Profesionalización del gobierno','Mérito, transparencia, resultados.'),('Sostenibilidad','Hoy y para las próximas generaciones.'),('Transparencia','Qué se decide, cuánto cuesta, quién responde.')]
prin_li = ''.join(f'<li data-r><b>{a}</b><span>{b}</span></li>' for a, b in PRIN)



road = '''<li class="now" data-r><span class="phase">Ahora</span><h3>Definimos los principios</h3><p>Se debate antes de comprometerse.</p></li>
<li data-r><span class="phase">Después</span><h3>Cómo se participa y se decide</h3><p>Participación, reglas y controles.</p></li>
<li data-r><span class="phase">Más adelante</span><h3>Territorio y servicios</h3><p>Quién responde de qué y cómo se financia.</p></li>
<li data-r><span class="phase">Más adelante</span><h3>Propuestas con coste</h3><p>Medidas concretas, responsables e indicadores.</p></li>
<li data-r><span class="phase">Al final</span><h3>Organización legal</h3><p>Estatutos, financiación y requisitos legales.</p></li>'''

AMBITOS = [
 ('vivienda', 'map', 'Vivienda', 'Escuchar las dificultades para acceder a una vivienda, mantener un hogar y construir un proyecto de vida independiente.'),
 ('sanidad', 'people', 'Sanidad', 'Conocer las necesidades de pacientes, familias y profesionales, y estudiar qué mejoras pueden llevarse a cabo.'),
 ('educacion', 'doc', 'Educación', 'Comprender qué impide aprender, formarse y progresar, independientemente del origen o las circunstancias personales.'),
 ('transporte', 'map', 'Transporte', 'Dar voz a quienes viven con conexiones insuficientes, servicios lejanos o dificultades para desplazarse.'),
 ('empleo', 'euro', 'Trabajo', 'Escuchar las dificultades para conciliar, llegar a fin de mes y desarrollar una vida estable.'),
 ('instituciones', 'vote', 'Instituciones', 'Explorar cómo mejorar la participación, aclarar responsabilidades y exigir que las decisiones públicas se expliquen y rindan cuentas.'),
]
ambitos_html = ''.join(f'<a class="opt tilt ambito" href="propuestas.html#{c}" data-r>{ico(i)}<span><b>{t}</b><small>{d}</small></span></a>' for c, i, t, d in AMBITOS)
PASOS = [('speech', 'Escuchamos', 'Sin exigir ninguna ideología.', 'Recogemos experiencias, problemas y propuestas sin exigir que las personas compartan una determinada ideología.'),
 ('group', 'Comprendemos', 'Causas, a quién afecta, qué se intentó.', 'Intentamos conocer las causas, a quién afecta el problema, qué se ha intentado hasta ahora y qué información necesitamos.'),
 ('chart', 'Estudiamos', 'Con datos, experiencia y costes.', 'Contrastamos las ideas con datos, experiencia profesional, normativa, costes y posibles consecuencias.'),
 ('doc', 'Desarrollamos propuestas', 'Medidas concretas y viables.', 'Cuando una idea tiene fundamento y encaja con los principios del proyecto, trabajamos para definir medidas concretas y viables.'),
 ('eye', 'Damos cuenta', 'Qué avanza y qué sigue pendiente.', 'Comunicamos qué estamos estudiando, qué hemos aprendido, qué decisiones se han tomado y qué cuestiones siguen pendientes.')]
pasos_html = ''.join(f'<li data-r style="--i:{n}">{ico(i)}<span><b>{t}</b><em>{c}</em></span></li>' for n, (i, t, c, d) in enumerate(PASOS))

PRIN = [('Libertad individual','Tus decisiones, tus derechos.'),('Democracia real','Participa, decide, exige.'),('Igualdad de oportunidades','El origen no define tu futuro.'),('Estado de derecho','La ley protege a todos.'),('Economía de mercado','Más empleo, más innovación.'),('Servicios esenciales','Sanidad, educación, vivienda, transporte.'),('Competencias claras','Cada quién lo que le corresponde.'),('Profesionalización del gobierno','Mérito, transparencia, resultados.'),('Sostenibilidad','Hoy y para las próximas generaciones.'),('Transparencia','Qué se decide, cuánto cuesta, quién responde.')]
prin_li = ''.join(f'<li data-r><b>{a}</b><span>{b}</span></li>' for a, b in PRIN)

home = f'''
<div class="marquee" aria-hidden="true"><div class="mq"><span>Vivienda</span><span>Sanidad</span><span>Educación</span><span>Transporte</span><span>Empleo</span><span>Servicios públicos</span><span>Instituciones</span><span>Vivienda</span><span>Sanidad</span><span>Educación</span><span>Transporte</span><span>Empleo</span><span>Servicios públicos</span><span>Instituciones</span></div></div>
<section class="section strip"><div class="wrap"><p class="strip-t" data-r>No necesitas pertenecer a un partido ni tener todas las respuestas. <em>Solo tienes que saber qué te gustaría mejorar.</em></p></div></section>

<section class="section" id="que-es">
  <div class="wrap sec-split">
    <div class="txt"><span class="eyebrow" data-r>¿Qué es PLU?</span><h2 data-r>Un movimiento que empieza por escuchar.</h2>
      <p class="lede" data-r>La política debe estar más cerca de la vida real de las personas.</p>
      <ul class="puntos" data-r>
        <li>{ico('speech')}<span><b>Escuchamos</b>a quien vive los problemas</span></li>
        <li>{ico('chart')}<span><b>Estudiamos</b>las soluciones con rigor</span></li>
        <li>{ico('building')}<span><b>Las llevamos</b>hacia las instituciones</span></li>
      </ul>
      <details class="mas-texto"><summary>Leer más</summary>
        <p>A menudo, los problemas cotidianos son conocidos por quienes los viven y por quienes trabajan directamente con ellos. Queremos abrir un espacio para escuchar esas experiencias, estudiar las posibles soluciones y ayudar a que las propuestas con fundamento encuentren un camino hacia las instituciones.</p>
        <p>Partimos de una idea sencilla de libertad: que cada persona pueda decidir sobre su vida, con instituciones que rindan cuentas. Son principios de partida, abiertos al debate. <a class="link" href="proyecto.html#principios">Conócelos →</a></p>
        <p>Estamos empezando. No tenemos todas las respuestas ni pretendemos tenerlas.</p>
      </details></div>
    {ph('cafe', 1000, 'r')}
  </div>
</section>

<section class="section alt" id="estamos-construyendo">
  <div class="wrap">
    <div class="head"><span class="eyebrow" data-r>Dónde estamos</span><h2 class="h2" data-r>Estamos construyendo PLU.</h2>
      <p class="lede" data-r>Una iniciativa ciudadana en fase de desarrollo: definimos principios, escuchamos necesidades y estudiamos cómo convertirlas en propuestas concretas.</p></div>
    <ol class="road swipe">{road}</ol>
    <p class="callout" data-r>La confianza se construye con transparencia, responsabilidad y hechos. Ese es el compromiso con el que empezamos.</p>
    <details class="mas-texto"><summary>Leer más</summary>
      <p>No queremos aparentar que tenemos todas las respuestas ni presentar como definitivas decisiones que todavía están abiertas. Queremos avanzar paso a paso, explicar lo que hacemos y aprender de las personas que quieran participar.</p>
    </details>
  </div>
</section>

<section class="section" id="areas">
  <div class="wrap">
    <div class="head"><span class="eyebrow" data-r>¿Qué queremos cambiar?</span><h2 class="h2" data-r>Que los problemas reales tengan espacio en las decisiones públicas.</h2></div>
    <div class="optgrid ambitos">{ambitos_html}</div>
    <p class="muted nota-corta" data-r>No son promesas de soluciones ya aprobadas: son ámbitos en los que queremos escuchar, investigar y desarrollar propuestas.</p>
  </div>
</section>

<section class="cifras" aria-label="PLU en cifras"><div class="wrap"><ul>
  <li data-r><b><i data-count="0">0</i> €</b><span>de cuota para afiliarte</span></li>
  <li data-r><b><i data-count="6">6</i></b><span>ámbitos de trabajo</span></li>
  <li data-r><b><i data-count="10">10</i></b><span>principios de partida</span></li>
  <li data-r><b><i data-count="1">1</i></b><span>voz que cuenta: la tuya</span></li>
</ul></div></section>

<section class="section alt" id="lo-que-cuenta">
  <div class="wrap">
    <div class="head row"><div><span class="eyebrow" data-r>Lo que nos cuenta la gente</span><h2 class="h2" data-r>Los problemas no deberían quedarse en una conversación.</h2></div><a class="link-arrow" href="escucha.html">Ver las necesidades compartidas →</a></div>
    <p class="lede" data-r>Reunimos lo que nos trasladáis, vemos qué tiene en común y conocemos las distintas perspectivas sobre cada problema.</p>
    <div class="rows" id="home-ideas" style="margin-top:22px"></div>
    <div id="home-contadores" hidden></div>
    <details class="mas-texto"><summary>Cómo tratamos tus aportaciones</summary>
      <p>Cuando sea posible y exista autorización para hacerlo, publicaremos aportaciones de forma anónima y agruparemos los temas para que cualquiera pueda conocer qué se está planteando.</p>
      <p>No todas las propuestas podrán convertirse en medidas. Nos comprometemos a explicar cómo las estudiamos, cuáles seguimos desarrollando y qué dificultades encontramos.</p>
    </details>
  </div>
</section>

<section class="section" id="como-trabajamos">
  <div class="wrap">
    <div class="head"><span class="eyebrow" data-r>Cómo trabajamos</span><h2 class="h2" data-r>Escuchar es el principio. Dar respuesta también importa.</h2></div>
    <ol class="pasos">{pasos_html}</ol>
    <p class="callout" data-r>Escuchar no significa prometer que todo se resolverá. Significa tomar en serio lo que se nos cuenta y tratar cada aportación con respeto.</p>
  </div>
</section>

<section class="section alt" id="participar">
  <div class="wrap sec-split">
    <div class="txt"><span class="eyebrow" data-r>Quién puede participar</span><h2 data-r>Tu experiencia también cuenta.</h2>
      <p class="lede" data-r>No hace falta ser político, experto ni pertenecer a una organización para aportar algo útil.</p>
      <ul class="puntos" data-r>
        <li>{ico('spark')}<span><b>Cuenta</b>una dificultad que vives</span></li>
        <li>{ico('group')}<span><b>Explica</b>un problema que conoces por tu trabajo</span></li>
        <li>{ico('doc')}<span><b>Propón</b>una mejora o cuestiona la nuestra</span></li>
      </ul>
      <p data-r><a class="btn btn-primary magnet" href="#contar">Compartir una idea</a></p></div>
    {ph('floor', 1000, 'r')}
  </div>
</section>

<section class="section" id="home-noticias-sec">
  <div class="wrap">
    <div class="head row"><div><span class="eyebrow" data-r>Noticias</span><h2 class="h2" data-r>Lo último en PLU.</h2></div><a class="link-arrow" href="noticias.html">Todas las noticias →</a></div>
    <div class="carrusel" id="home-noticias"></div>
  </div>
</section>

<section class="section alt">
  <div class="wrap">
    <div class="head"><span class="eyebrow" data-r>Principios de partida</span><h2 class="h2" data-r>Diez ideas para empezar a hablar.</h2><p class="lede" data-r>Abiertas al debate: se concretan con lo que aporte la gente.</p></div>
    <ol class="principios10">{prin_li}</ol>
    <p style="margin-top:22px"><a class="link-arrow" href="proyecto.html#principios">Ver todos los principios →</a></p>
  </div>
</section>

<section class="section" id="transparencia-home">
  <div class="wrap sec-split">
    <div class="txt"><span class="eyebrow" data-r>Transparencia</span><h2 data-r>Las mismas exigencias que pedimos a las instituciones.</h2>
      <p class="lede" data-r>Explicaremos quién impulsa PLU, cómo se toman las decisiones, qué está definido y qué sigue abierto.</p>
      <p class="callout" data-r>La confianza no se pide. Se construye con hechos, explicaciones claras y responsabilidades asumidas.</p>
      <details class="mas-texto"><summary>Leer más</summary>
        <p>PLU está en construcción. A medida que el proyecto avance, publicaremos sus reglas de organización, sus compromisos de transparencia y la información económica que corresponda.</p>
      </details>
      <p data-r><a class="btn btn-ghost magnet" href="como-funciona.html">Conoce cómo funciona PLU</a></p></div>
    {ph('street', 1000, 'r')}
  </div>
</section>

<section class="joinband">{ph('park', 1800)}
  <div class="wrap">
    <div style="display:grid;gap:18px;justify-items:start">
      <span class="eyebrow" data-r>Únete a PLU</span>
      <h2 data-r>Si crees que merece la pena escuchar más y mejor, <em>puedes formar parte.</em></h2>
      <p data-r style="max-width:32rem;opacity:.92">Empieza compartiendo una idea, sigue la evolución del proyecto o participa en su desarrollo. Sin comprometerte más de lo que quieras. Afiliarte es gratis; si un día quieres apoyar el proyecto, también puedes hacer una <a class="link" style="color:inherit;text-decoration:underline" href="donar.html">donación</a>.</p>
      <div class="cta-row"><a class="btn btn-light magnet" href="afiliate.html">Quiero participar</a><a class="btn btn-line-light" href="portal.html">Ya soy afiliado</a></div>
    </div>
    <div class="big clover" data-parallax="25" aria-hidden="true"></div>
  </div>
</section>

<section class="section" id="contacto-home">
  <div class="wrap" style="max-width:44rem">
    <div class="head"><span class="eyebrow" data-r>Contacto</span><h2 class="h2" data-r>Estamos empezando. Hablemos.</h2><p class="lede" data-r>¿Una pregunta, una propuesta o ganas de conocer mejor el proyecto? Escríbenos y te respondemos en cuanto podamos.</p></div>
    <p data-r><a class="btn btn-primary magnet" href="contacto.html">Enviar mensaje</a></p>
  </div>
</section>
'''


# ================= PROYECTO =================
FAM = [('Libertad', ['Libertad individual: tu proyecto de vida, con respeto a los derechos ajenos.', 'Pluralismo y convivencia: nadie impone una única forma de vivir o pensar.', 'Economía de mercado: iniciativa privada con reglas claras.']),
 ('Democracia', ['Soberanía ciudadana: el poder viene de la ciudadanía.', 'Estado de derecho: todos, también quien manda, sometidos a la ley.', 'Diversidad territorial: lenguas y culturas con derechos comunes.']),
 ('Bienestar', ['Oportunidades reales: vivienda, educación, sanidad y transporte.', 'Responsabilidad fiscal: cada política explica su coste.']),
 ('Responsabilidad', ['Profesionalidad pública: decisiones con conocimiento y evidencia.', 'Transparencia: qué se decide, cuánto cuesta, quién responde.'])]
fams = ''.join(f'<div class="family" data-r><h3>{n}</h3><ul class="leaf-list">{"".join(f"<li>{x}</li>" for x in xs)}</ul></div>' for n, xs in FAM)
# ================= PROYECTO =================
FAM = [('Libertad', ['Libertad individual: tu proyecto de vida, con respeto a los derechos ajenos.', 'Pluralismo y convivencia: nadie impone una única forma de vivir o pensar.', 'Economía de mercado: iniciativa privada con reglas claras.']),
 ('Democracia', ['Soberanía ciudadana: el poder viene de la ciudadanía.', 'Estado de derecho: todos, también quien manda, sometidos a la ley.', 'Diversidad territorial: lenguas y culturas con derechos comunes.']),
 ('Bienestar', ['Oportunidades reales: vivienda, educación, sanidad y transporte.', 'Responsabilidad fiscal: cada política explica su coste.']),
 ('Responsabilidad', ['Profesionalidad pública: decisiones con conocimiento y evidencia.', 'Transparencia: qué se decide, cuánto cuesta, quién responde.'])]
fams = ''.join(f'<div class="family" data-r><h3>{n}</h3><ul class="leaf-list">{"".join(f"<li>{x}</li>" for x in xs)}</ul></div>' for n, xs in FAM)
proyecto = f'''
<section class="section"><div class="wrap sec-split">
  <div class="txt"><span class="eyebrow" data-r>Qué es PLU ahora</span><h2 data-r>Un movimiento que empieza por escuchar.</h2>
    <p class="lede" data-r>Sabemos qué ámbitos preocupan: vivienda, sanidad, educación, transporte, trabajo e instituciones. Lo que queremos es recoger la experiencia de quienes los viven y los conocen desde dentro.</p>
    <p class="muted" data-r>Escuchamos aportaciones, las estudiamos con quienes saben del asunto y trabajamos para que las propuestas con fundamento encuentren un camino hacia las instituciones. No prometemos soluciones cerradas: las vamos construyendo con quienes quieran participar.</p>
    <a class="link-arrow" data-r href="index.html#contar">Contarnos qué cambiarías →</a></div>
  <div class="icons4">{icoitem('speech','Escuchamos')}{icoitem('chart','Estudiamos')}{icoitem('people','Aprendemos de quien sabe')}{icoitem('doc','Desarrollamos propuestas')}</div>
</div></section>
<section class="section alt">
  <div class="wrap sec-split">
    <div class="txt"><span class="eyebrow" data-r>Nuestra visión</span><h2 data-r>Una España más libre, más justa, más fuerte.</h2>
      <p class="lede" data-r>Un país donde cada persona pueda desarrollar su proyecto de vida con libertad, responsabilidad y oportunidades reales.</p>
      <p class="muted" data-r>El cambio empieza escuchando.</p>
      <details class="more" data-r><summary>Leer el manifiesto completo</summary><div>
        <p>Creemos en una sociedad donde cada persona pueda desarrollar su proyecto de vida con libertad, responsabilidad y oportunidades reales. Las instituciones deben proteger derechos, garantizar servicios esenciales y rendir cuentas.</p>
        <p>Defendemos una democracia que no se limite a elegir representantes cada cuatro años: con mecanismos para participar, deliberar, proponer y decidir sobre cuestiones relevantes.</p>
        <p>Entendemos España como una comunidad compartida de territorios con identidades, culturas y lenguas propias.</p>
        <p>Queremos instituciones profesionales, transparentes y evaluables. La competencia técnica acompaña a la legitimidad democrática, nunca la sustituye.</p>
        <p><b>Una ciudadanía con poder. Un Estado responsable. Un país que reconoce su diversidad.</b></p></div></details></div>
    <div class="clover visionclover" data-parallax="-20" style="width:min(70%,260px)" aria-hidden="true"></div>
  </div>
</section>
<section class="section alt"><div class="wrap"><div class="head"><span class="eyebrow">Lo que nos diferencia</span><h2 class="h2" data-r>Cuatro ideas de partida, abiertas a debate.</h2></div>
  <div class="icons4">{icoitem('group','Democracia mixta')}{icoitem('map','Modelo territorial de competencias')}{icoitem('euro','Economía de mercado')}{icoitem('people','Gobierno profesionalizado')}</div></div></section>
<section class="section" id="principios"><div class="wrap">
  <div class="head"><span class="eyebrow">Los principios que nos guían</span><h2 class="h2" data-r>Los principios de partida, que se concretan con lo que aporte la gente.</h2></div>
  <div class="vidblock tilt" style="margin-bottom:28px">{ph('circle', 1600)}<div class="cap">Una España más libre, más justa, más fuerte.</div></div>
  <div class="families">{fams}</div></div></section>
<section class="section alt"><div class="wrap"><div class="head"><span class="eyebrow">Hoja de ruta</span><h2 class="h2" data-r>De las ideas a una organización abierta y responsable.</h2></div><ol class="road">{road}</ol></div></section>
'''

# ================= PROPUESTAS =================
def prow(cat, k, name, title, short, bullets):
    lis = ''.join(f'<li>{b}</li>' for b in bullets)
    return f'''<details class="rowitem" id="{cat}" data-cat="{cat}" data-r><summary><div class="ph duo thumb">{imgtag(P[k][0], 300, P[k][1])}</div><div><span class="tag">{name}</span><h3>{title}</h3><p class="s">{short}</p></div><span class="chev">›</span></summary>
 <div class="body"><ul class="leaf-list">{lis}</ul><span class="status">Estamos escuchando</span>
 <div class="pcard"><div class="pcard-head">Así iremos documentando cada propuesta · ejemplo, no es una propuesta aprobada</div><dl>
 <div class="row"><dt>El problema</dt><dd>Por entender: escuchamos y buscamos datos.</dd></div><div class="row"><dt>La medida</dt><dd>Por definir: qué cambia y quién responde.</dd></div>
 <div class="row"><dt>Coste y viabilidad</dt><dd>Por definir.</dd></div><div class="row"><dt>Cómo se medirá</dt><dd>Indicadores y plazo, por definir.</dd></div></dl></div></div></details>'''
propuestas = f'''
<section class="section"><div class="wrap">
  <div class="head" style="margin-bottom:22px"><span class="eyebrow">Ámbitos de trabajo</span><h2 class="h2" data-r>Donde queremos escuchar, investigar y desarrollar propuestas.</h2><p class="lede" data-r>No son promesas de soluciones ya aprobadas. Cada ámbito es un punto de partida: lo que ya sabemos, lo que nos falta por entender y cómo puedes ayudarnos.</p></div>
  <div class="filters" role="group" aria-label="Filtrar ámbitos"><button class="fbtn" aria-pressed="true" data-f="all">Todos</button><button class="fbtn" aria-pressed="false" data-f="vivienda">Vivienda</button><button class="fbtn" aria-pressed="false" data-f="sanidad">Sanidad</button><button class="fbtn" aria-pressed="false" data-f="educacion">Educación</button><button class="fbtn" aria-pressed="false" data-f="transporte">Transporte</button><button class="fbtn" aria-pressed="false" data-f="empleo">Trabajo</button><button class="fbtn" aria-pressed="false" data-f="instituciones">Instituciones</button></div>
  <div class="rows" id="filterlist">
  {prow('vivienda','viv','Vivienda','La vivienda y el coste de vivir','Escuchar las dificultades para acceder a una vivienda, mantener un hogar y construir un proyecto de vida independiente.',['Qué te impide alquilar o comprar','Qué trámites y costes se interponen','Qué se ha intentado ya y qué ha funcionado'])}
  {prow('sanidad','san','Sanidad','La sanidad y los cuidados','Conocer las necesidades de pacientes, familias y profesionales, y estudiar qué mejoras pueden llevarse a cabo.',['Esperas y acceso a la atención','La experiencia de quien cuida y de quien trabaja en el sistema','Qué mejoras serían viables'])}
  {prow('educacion','edu','Educación','La educación y las oportunidades','Comprender qué impide aprender, formarse y progresar, independientemente del origen o las circunstancias personales.',['Barreras para estudiar y formarse','Conexión entre formación y empleo','La mirada del profesorado y de las familias'])}
  {prow('transporte','tra','Transporte','El transporte y los servicios','Dar voz a quienes viven con conexiones insuficientes, servicios lejanos o dificultades para desplazarse.',['Horarios y conexiones que faltan','Servicios lejos de donde vives','Accesibilidad y coste'])}
  {prow('empleo','floor','Trabajo','El trabajo y la vida cotidiana','Escuchar las dificultades para conciliar, llegar a fin de mes y desarrollar una vida estable.',['Conciliar trabajo y vida personal','Estabilidad y fin de mes','Lo que ven quienes emprenden o contratan'])}
  {prow('instituciones','meet','Instituciones','La política y las instituciones','Explorar cómo mejorar la participación, aclarar responsabilidades y exigir que las decisiones públicas se expliquen y rindan cuentas.',['Quién responde de cada servicio','Participación con efectos reales','Decisiones públicas que se explican'])}
  </div>
  <p class="muted" style="margin-top:26px;max-width:40rem">Hoy son ámbitos de escucha, no promesas de resultado. Las medidas, su coste y la forma de evaluarlas se irán definiendo con lo que nos cuentes.</p>
  <p style="margin-top:18px"><a class="btn btn-primary magnet" href="index.html#contar">Cuéntanos qué cambiarías</a> <a class="btn btn-ghost magnet" href="escucha.html">Ver lo que cuenta la gente</a></p>
</div></section>'''

# ================= DEMOCRACIA =================
democracia = '''
<section class="section"><div class="wrap">
  <div class="head"><span class="eyebrow">Mecanismos</span><h2 class="h2" data-r>«Participar» puede significar muchas cosas. Aquí, cada una con su efecto.</h2></div>
  <div class="demo"><div class="tabs" id="tabs" role="tablist" aria-label="Mecanismos de participación"></div><div class="panel" id="tabpanel" role="tabpanel" tabindex="0"></div></div>
  <ol class="flow" aria-label="Recorrido de una propuesta ciudadana"><li>Propuesta ciudadana</li><li>Evaluación de viabilidad</li><li>Deliberación</li><li>Decisión</li><li>Publicación del resultado</li><li>Seguimiento</li></ol>
</div></section>'''

# ================= CÓMO FUNCIONA / TRANSPARENCIA =================
como = f'''
<section class="section"><div class="wrap">
  <div class="head"><span class="eyebrow">Cómo trabajamos</span><h2 class="h2" data-r>Escuchar es el principio. Dar respuesta también importa.</h2></div>
  <ol class="steps5">
    <li data-r>{ico('speech')}<span>1. Escuchamos</span><small>Recogemos experiencias, problemas y propuestas sin exigir ninguna ideología.</small></li>
    <li data-r>{ico('group')}<span>2. Comprendemos</span><small>Buscamos las causas, a quién afecta y qué se ha intentado ya.</small></li>
    <li data-r>{ico('chart')}<span>3. Estudiamos</span><small>Contrastamos con datos, experiencia profesional, normativa y costes.</small></li>
    <li data-r>{ico('doc')}<span>4. Desarrollamos propuestas</span><small>Si la idea tiene fundamento, definimos medidas concretas y viables.</small></li>
    <li data-r>{ico('eye')}<span>5. Damos cuenta</span><small>Contamos qué estudiamos, qué decidimos y qué sigue pendiente.</small></li>
  </ol>
</div></section>
<section class="section alt"><div class="wrap">
  <div class="head"><span class="eyebrow">La organización de PLU</span><h2 class="h2" data-r>Una estructura abierta, horizontal y transparente.</h2></div>
  <div class="org"><div class="center"><span class="clover"></span><img class="wordmark" src="brand/word.png" alt="PLU"></div>
  <div class="nodes"><div class="node" data-r><b>Ciudadanía</b><span>Decide y participa.</span></div><div class="node" data-r><b>Órganos de dirección</b><span>Coordina y ejecuta.</span></div><div class="node" data-r><b>Grupos de trabajo</b><span>Desarrollan propuestas.</span></div><div class="node" data-r><b>Órganos de control</b><span>Garantizan la transparencia.</span></div></div></div>
  <p class="muted" style="margin-top:18px;max-width:40rem">Estos órganos son lo que PLU se compromete a crear. Todavía no existen como estructuras en funcionamiento.</p>
</div></section>
<section class="section" id="responsables"><div class="wrap sec-split">
  <div class="txt"><span class="eyebrow">Responsables públicos</span><h2 data-r>Experiencia para gestionar. Democracia para decidir.</h2><p class="lede" data-r>La experiencia técnica mejora las decisiones; no sustituye la legitimidad de las urnas. Procedimiento transparente, criterios públicos y controles.</p></div>
  <ol class="steps"><li data-r><div><h3>Requisitos públicos</h3><p>Qué experiencia exige cada puesto.</p></div></li><li data-r><div><h3>Evaluación independiente</h3><p>Con criterios conocidos de antemano.</p></div></li><li data-r><div><h3>Nombramiento legítimo</h3><p>Lo decide el órgano democrático competente.</p></div></li><li data-r><div><h3>Objetivos y resultados</h3><p>Se publican y se evalúan.</p></div></li><li data-r><div><h3>Control de conflictos de interés</h3><p>Incompatibilidades revisadas.</p></div></li></ol>
</div></section>
<section class="section alt" id="competencias"><div class="wrap sec-split">
  <div class="txt"><span class="eyebrow">Competencias</span><h2 data-r>Responsabilidades claras. Cuentas claras.</h2><p class="lede" data-r>Cuando un servicio falla, debería ser fácil saber quién responde.</p><p class="muted">Las competencias actuales dependen de la Constitución y los estatutos. Esto es el modelo que PLU propone, no el marco vigente.</p></div>
  <div class="pcard" data-r><div class="pcard-head">Ficha pública de competencia · plantilla</div><dl><div class="row"><dt>Responsable</dt><dd>por definir</dd></div><div class="row"><dt>Financiación</dt><dd>por definir</dd></div><div class="row"><dt>Ejecución</dt><dd>por definir</dd></div><div class="row"><dt>Estándares y evaluación</dt><dd>por definir</dd></div><div class="row"><dt>Dónde reclamar</dt><dd>por definir</dd></div></dl></div>
</div></section>
<section class="section" id="transparencia"><div class="wrap sec-split">
  <div class="txt"><span class="eyebrow">Transparencia</span><h2 data-r>Las reglas también se aplican a PLU.</h2><p class="lede" data-r>Información pública, presupuestos abiertos y evaluación constante.</p>
    <ul class="checks" data-r><li>Cuentas y fuentes de financiación</li><li>Declaraciones de intereses</li><li>Procesos de selección</li><li>Informes de gestión y resultados</li><li>Canal de reclamaciones</li></ul>
    <span class="status">Compromiso · aún no implantado</span><p class="muted">PLU está en construcción. Aquí publicaremos con claridad qué existe ya y qué todavía no, y lo iremos actualizando.</p></div>
  {ph('street', 1000, 'r')}
</div></section>'''

# ================= DEBATE =================
def drow(state, label, ico_k, title, q, l, r):
    return f'''<details class="rowitem" data-state="{state}" data-r><summary class="noimg">{ico(ico_k)}<div><span class="tag">{label}</span><h3>{title}</h3><p class="s">{q}</p></div><span class="chev">›</span></summary>
<div class="body"><div class="dilema" style="border:0;padding:0;background:none"><div class="poles"><span>{l}</span><span>{r}</span></div><input type="range" min="0" max="100" value="50" aria-label="{l} o {r}"><p class="dilema-out" aria-live="polite">Equilibrio</p></div><p class="muted" style="font-size:.9rem">Demostración: tu postura no se guarda ni cuenta como voto.</p></div></details>'''
debate = f'''
<section class="section"><div class="wrap">
  <div class="head"><span class="eyebrow">Qué es firme y qué no</span><h1 class="h2" data-r>¿Qué está en debate?</h1><p class="lede">Hay decisiones importantes que aún tenemos que tomar. Queremos escucharte.</p></div>
  <div class="filters" role="group" aria-label="Filtrar por estado"><button class="fbtn" aria-pressed="true" data-f="debate">En debate</button><button class="fbtn" aria-pressed="false" data-f="desarrollo">En desarrollo</button><button class="fbtn" aria-pressed="false" data-f="definido">Decidido</button></div>
  <div class="rows" id="statelist">
  {drow('debate','Decisión abierta','building','Alcance del Estado social','¿Qué servicios debe garantizar y cómo?','Libertad','Protección social')}
  {drow('debate','Decisión abierta','map','Uniformidad territorial','¿Qué competencias deben ser comunes y cuáles adaptarse a cada región?','Competencias iguales','Diversidad territorial')}
  {drow('debate','Decisión abierta','ballot','Democracia directa','¿Cuándo y cómo deben ser vinculantes los referéndums?','Democracia directa','Representación')}
  {drow('debate','Decisión abierta','euro','Financiación de las propuestas','¿Qué recursos se necesitan y cómo se obtienen?','Disciplina fiscal','Inversión social')}
  {drow('debate','Decisión abierta','people','Criterio experto y mandato','¿Cómo tener experiencia sin que gobiernen expertos sin mandato?','Criterio experto','Mandato democrático')}
  {drow('debate','Decisión abierta','building','Tamaño del Estado','¿Cómo reducir duplicidades sin debilitar justicia o sanidad?','Estado compacto','Capacidad pública')}
  {drow('debate','Decisión abierta','scale','Mercado y servicio público','¿Qué presta el Estado y qué empresas reguladas?','Mercado','Servicio público directo')}
  {drow('desarrollo','Propuesta en desarrollo','spark','Iniciativa ciudadana','Umbral de apoyos y efectos jurídicos.','Umbral bajo','Umbral alto')}
  {drow('desarrollo','Propuesta en desarrollo','group','Asambleas ciudadanas','¿Permanentes o convocadas según el asunto?','Permanentes','Según el asunto')}
  <details class="rowitem" data-state="definido" hidden data-r><summary class="noimg">{ico('check')}<div><span class="tag">Principio definido</span><h3>Estado de derecho y derechos fundamentales</h3><p class="s">Ninguna mayoría puede eliminar los derechos fundamentales de una minoría.</p></div><span class="chev">›</span></summary><div class="body"><p class="muted">Es un principio fundacional de PLU: no está en discusión.</p></div></details>
  <details class="rowitem" data-state="definido" hidden data-r><summary class="noimg">{ico('check')}<div><span class="tag">Principio definido</span><h3>La competencia técnica no sustituye a la democracia</h3><p class="s">La experiencia mejora las decisiones; no tiene la última palabra.</p></div><span class="chev">›</span></summary><div class="body"><p class="muted">Principio fundacional.</p></div></details>
  </div>
  <p style="margin-top:26px"><a class="btn btn-primary magnet" href="participa.html">Aportar mi opinión sobre estos temas →</a></p>
</div></section>'''

# ================= PARTICIPA =================
participa = f'''
<section class="section"><div class="wrap">
  <div class="head"><span class="eyebrow">Participa</span><h2 class="h2" data-r>Tu opinión, tu idea, tu compromiso.</h2><p class="lede">Hay muchas formas de formar parte de PLU.</p></div>
  <div class="optgrid">
    <a class="opt tilt" href="index.html#contar" data-r>{ico('spark')}<span><b>Quiero contar qué cambiaría</b><small>Sin cuenta. Te explicamos qué pasa con tu aportación.</small></span></a>
    <a class="opt tilt" href="ideas.html" data-r>{ico('speech')}<span><b>Quiero apoyar y debatir</b><small>Apoya y comenta ideas desde el portal.</small></span></a>
    <a class="opt tilt" href="consultas.html" data-r>{ico('ballot')}<span><b>Quiero ver las votaciones</b><small>Resultados, quórum y decisiones.</small></span></a>
    <a class="opt tilt" href="eventos.html" data-r>{ico('people')}<span><b>Quiero ir a un acto</b><small>Agenda e inscripción.</small></span></a>
    <a class="opt tilt" href="voluntariado.html" data-r>{ico('group')}<span><b>Quiero ayudar</b><small>Comunicación, diseño, tecnología, eventos…</small></span></a>
    <a class="opt tilt" href="afiliate.html" data-r>{ico('mail')}<span><b>Quiero formar parte</b><small>Afíliate gratis y recibe novedades.</small></span></a>
  </div>
</div></section>
<section class="joinband">{ph('floor', 1800)}
  <div class="wrap"><div style="display:grid;gap:18px;justify-items:start"><h2 data-r>Tu voz puede marcar <em>la diferencia.</em></h2><p data-r style="opacity:.9;max-width:30rem">Rellena el formulario y ayúdanos a construir una mejor España.</p><a class="btn btn-light magnet" href="#participa-form">Participa ahora</a></div><div class="big clover" data-parallax="25" aria-hidden="true"></div></div>
</section>
<section class="section" id="participa-form"><div class="wrap" style="max-width:48rem">
  <div class="head"><span class="eyebrow">Afiliarse es gratis</span><h2 class="h2" data-r>Construyamos PLU entre todos.</h2><p class="lede" data-r>Una sola forma de formar parte: afiliarte. No tiene cuota. Recibes tu carné digital, acceso a un portal para apoyar ideas, votar y seguir lo que pasa con ellas, y avisos de lo que hacemos.</p></div>
  <ol class="steps"><li><div><h3>Dar tu opinión</h3><p>Cuéntanos qué cambiarías y te explicamos qué pasa con tu aportación.</p></div></li><li><div><h3>Seguir el proyecto</h3><p>Avances, decisiones y cuestiones que siguen abiertas.</p></div></li><li><div><h3>Colaborar</h3><p>Grupos de trabajo, voluntariado y, si quieres, una donación para sostener el proyecto.</p></div></li></ol>
  <p style="margin-top:22px"><a class="btn btn-primary magnet" href="afiliate.html">Afiliarme gratis</a> <a class="btn btn-ghost magnet" href="donar.html">Apoyar con una donación</a></p>
</div>
</section>'''
# ================= AFÍLIATE =================
afiliate = f'''
<section class="section"><div class="wrap formwrap">
  <div style="display:grid;gap:22px;align-content:start">
    <div class="head" style="margin:0"><span class="eyebrow">Afíliate</span><h1 class="h2">Forma parte de PLU.</h1><p class="lede">Es gratis y sin compromiso. Recibirás tu carné de afiliado por correo y acceso al portal, para participar cuando quieras.</p></div>
    <div class="chips"><span class="chip">Gratis</span><span class="chip">16 años o más</span><span class="chip">Residir en España</span><span class="chip">DNI o NIE</span></div>
    {ph('fence', 1000, 'r')}
    <p class="muted">Afiliarse es gratis y no te obliga a nada. Si algún día quieres apoyar económicamente el proyecto, puedes hacerlo con una <a class="link" href="donar.html">donación</a>.</p>
  </div>
  <form class="form-card" data-api="/api/inscripciones" novalidate>
    <div class="stepper" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
    <div class="step">
      <h3>1. Tus datos</h3>
      <div class="field-pair"><div class="field"><label for="a-n">Nombre</label><input id="a-n" name="nombre" autocomplete="given-name" required maxlength="80"></div><div class="field"><label for="a-a">Apellidos</label><input id="a-a" name="apellidos" autocomplete="family-name" required maxlength="120"></div></div>
      <div class="field"><label for="a-c">Correo</label><input id="a-c" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="a-t">Teléfono</label><input id="a-t" name="telefono" type="tel" placeholder="Opcional"></div>
      <button class="btn btn-primary" type="button" data-next>Siguiente</button>
    </div>
    <div class="step" hidden>
      <h3>2. Identificación</h3>
      <div class="field"><label for="a-d">DNI o NIE</label><input id="a-d" name="documento" required autocomplete="off" maxlength="12"></div>
      <div class="field"><label for="a-f">Fecha de nacimiento (mínimo 16 años)</label><input id="a-f" name="fecha_nacimiento" type="date" required></div>
      <p class="muted" style="font-size:.92rem">Tu documento se guarda cifrado. No pedimos foto del DNI ni foto para el carné.</p>
      <div class="row-btns"><button class="btn btn-ghost" type="button" data-prev>Atrás</button><button class="btn btn-primary" type="button" data-next>Siguiente</button></div>
    </div>
    <div class="step" hidden>
      <h3>3. Dónde vives y a qué te dedicas</h3>
      <div class="field"><label for="a-dir">Dirección</label><input id="a-dir" name="direccion" autocomplete="street-address" required maxlength="160" placeholder="Calle, número, piso"></div>
      <div class="field"><label for="f-prov">Provincia</label><select id="f-prov" name="provincia_id" required><option value="">Elige…</option></select></div>
      <div class="field"><label for="a-mun">Municipio</label><input id="a-mun" name="poblacion" autocomplete="off" required maxlength="80" list="a-mun-l" placeholder="Empieza a escribir y elige"><datalist id="a-mun-l"></datalist></div>
      <div class="field"><label for="a-cp">Código postal</label><input id="a-cp" name="codigo_postal" inputmode="numeric" autocomplete="postal-code" required maxlength="5" pattern="[0-9]{{5}}" list="a-cp-l" placeholder="5 cifras"><datalist id="a-cp-l"></datalist><span class="muted" id="a-cp-h" style="font-size:.85rem"></span></div>
      <div class="field"><label for="a-ocu">Ocupación o profesión (opcional)</label><input id="a-ocu" name="ocupacion" maxlength="80" placeholder="Ej.: enfermera, profesor, conductor…"></div>
      <div class="field-pair"><div class="field"><label for="a-sit">Situación laboral (opcional)</label><select id="a-sit" name="situacion_laboral"><option value="">Elige…</option>{opciones('situaciones')}</select></div><div class="field"><label for="a-sec">Sector (opcional)</label><select id="a-sec" name="sector"><option value="">Elige…</option>{opciones('sectores')}</select></div></div>
      <p class="muted" style="font-size:.92rem">Con la ocupación y el sector sabremos de quién aprender en cada materia. Solo las verá el equipo autorizado.</p>
      <div class="row-btns"><button class="btn btn-ghost" type="button" data-prev>Atrás</button><button class="btn btn-primary" type="button" data-next>Siguiente</button></div>
    </div>
    <div class="step" hidden>
      <h3>4. Consentimientos</h3>
      <label class="consent"><input type="checkbox" name="consentimiento_afiliacion" required><span>Acepto que PLU trate mis datos para gestionar mi afiliación. Mi afiliación es un dato especialmente protegido y solo la verá el equipo autorizado.</span></label>
      <label class="consent"><input type="checkbox" name="consentimiento_avisos"><span>Quiero recibir avisos de campañas, eventos y encuestas por correo (opcional).</span></label>
      <div class="row-btns"><button class="btn btn-ghost" type="button" data-prev>Atrás</button><button class="btn btn-primary" type="submit">Solicitar afiliación</button></div>
      <p class="form-status" role="status" aria-live="polite"></p>
    </div>
  </form>
</div></section>'''

# ================= PORTAL / INTRANET =================
portal = '''
<section class="section login-page"><div class="wrap">
  <div id="app-portal" class="intra">
    <div id="w-login" class="intra-view">
      <div class="formwrap" style="align-items:center">
        <div style="display:grid;gap:18px"><span class="eyebrow">Portal del afiliado</span><h1 class="h2">Tu carné, tus encuestas, tus solicitudes.</h1>
          <p class="lede">Entra con tu correo y la contraseña que te entregó la organización al aprobar tu afiliación. La primera vez elegirás una nueva.</p>
          <p class="muted">¿Todavía no eres afiliado? <a class="link" href="afiliate.html">Afíliate →</a></p></div>
        <form class="form-card" id="f-login" novalidate>
          <h2>Entrar</h2>
          <div class="field"><label for="p-c">Correo</label><input id="p-c" type="email" autocomplete="username" required></div>
          <div class="field"><label for="p-p">Contraseña</label><input id="p-p" type="password" autocomplete="current-password" required></div>
          <button class="btn btn-primary" type="submit">Entrar</button><p class="form-status err" role="alert"></p>
          <p class="muted" style="font-size:.9rem"><a class="link" href="#" id="l-olvido">¿Has olvidado tu contraseña?</a></p>
        </form>
      </div>
    </div>

    <div id="w-recuperar" class="intra-view" hidden>
      <form class="form-card" id="f-recuperar" style="max-width:32rem;margin-inline:auto" novalidate>
        <h2>Recuperar contraseña</h2>
        <p class="muted">Escribe tu correo de afiliado. Si existe, te enviaremos un enlace para elegir una contraseña nueva (caduca en 1 hora).</p>
        <div class="field"><label for="r-c">Correo</label><input id="r-c" type="email" autocomplete="username" required></div>
        <button class="btn btn-primary" type="submit">Enviarme el enlace</button><p class="form-status" role="status"></p>
        <p class="muted" style="font-size:.9rem"><a class="link" href="#" id="l-volver">← Volver a entrar</a></p>
      </form>
    </div>

    <div id="w-nueva" class="intra-view" hidden>
      <form class="form-card" id="f-nueva" style="max-width:32rem;margin-inline:auto" novalidate>
        <h2>Elige tu nueva contraseña</h2>
        <p class="muted">Usa al menos 10 caracteres.</p>
        <div class="field"><label for="n-n">Nueva contraseña</label><input id="n-n" type="password" autocomplete="new-password" minlength="10" required></div>
        <button class="btn btn-primary" type="submit">Guardar contraseña</button><p class="form-status err" role="alert"></p>
      </form>
    </div>

    <div id="w-cambio" class="intra-view" hidden>
      <form class="form-card" id="f-cambio" style="max-width:32rem;margin-inline:auto" novalidate>
        <h2>Elige tu contraseña</h2>
        <p class="muted">La contraseña temporal solo sirve para este primer paso. Usa al menos 10 caracteres.</p>
        <div class="field"><label for="c-a">Contraseña temporal</label><input id="c-a" type="password" autocomplete="current-password" required></div>
        <div class="field"><label for="c-n">Nueva contraseña</label><input id="c-n" type="password" autocomplete="new-password" minlength="10" required></div>
        <button class="btn btn-primary" type="submit">Guardar y entrar</button><p class="form-status err" role="alert"></p>
      </form>
    </div>

    <div id="w-panel" class="intra-view" hidden>
      <div class="panel-head"><div><span class="eyebrow" id="w-estado"></span><h1 class="h2" id="w-nombre"></h1></div><button class="btn btn-ghost btn-sm" type="button" id="w-salir">Cerrar sesión</button></div>
      <div class="filters pt-tabs" role="group" aria-label="Secciones"><button class="fbtn" aria-pressed="true" data-w="inicio">Inicio</button><button class="fbtn" aria-pressed="false" data-w="carne">Mi carné</button><button class="fbtn" aria-pressed="false" data-w="participa">Participa</button><button class="fbtn" aria-pressed="false" data-w="brujula">Brújula</button><button class="fbtn" aria-pressed="false" data-w="datos">Mis datos</button><button class="fbtn" aria-pressed="false" data-w="solicitudes">Solicitudes</button><button class="fbtn" aria-pressed="false" data-w="cuenta">Cuenta</button></div>
      <div id="w-sec"></div>
    </div>
  </div>
</div></section>
<script src="form-encuesta.js"></script>
<script src="portal.js"></script>'''

encuesta = '''
<section class="section login-page"><div class="wrap">
  <div id="app-encuesta" class="intra">
    <div class="form-card" style="max-width:40rem;margin-inline:auto" id="e-caja">
      <span class="eyebrow">Encuesta PLU</span>
      <h1 class="h2" id="e-titulo">Cargando…</h1>
      <p class="muted" id="e-desc"></p>
      <p class="muted" id="e-anon" hidden></p>
      <form id="e-form" novalidate hidden><div id="e-preguntas" style="display:grid;gap:26px"></div>
        <button class="btn btn-primary" type="submit" style="margin-top:22px">Enviar respuestas</button><p class="form-status err" role="alert"></p></form>
      <p id="e-fin" class="lede" hidden></p>
    </div>
  </div>
</div></section>
<script src="form-encuesta.js"></script>
<script src="encuesta.js"></script>'''

BARRA_SECCIONES = '''<div class="filters" id="p-tabs" role="group" aria-label="Secciones"></div>'''

intranet = '''
<section class="section login-page"><div class="wrap">
  <div id="app-intranet" class="intra">
    <div id="v-login" class="intra-view">
      <div class="formwrap" style="align-items:center">
        <div style="display:grid;gap:18px"><span class="eyebrow">Intranet · Solo equipo</span><h1 class="h2">Gestión de PLU.</h1>
          <p class="lede">Acceso restringido a personas autorizadas, con doble verificación obligatoria. Cada acción queda registrada.</p></div>
        <form class="form-card" id="f-login" novalidate>
          <h2>Acceso del equipo</h2>
          <div class="field"><label for="i-u">Usuario</label><input id="i-u" autocomplete="username" required></div>
          <div class="field"><label for="i-p">Contraseña</label><input id="i-p" type="password" autocomplete="current-password" required></div>
          <button class="btn btn-primary" type="submit">Continuar</button><p class="form-status err" role="alert"></p>
        </form>
      </div>
    </div>

    <div id="v-cambio" class="intra-view" hidden>
      <form class="form-card" id="f-cambio" style="max-width:32rem;margin-inline:auto" novalidate>
        <h2>Elige tu contraseña</h2>
        <p class="muted">Tu cuenta es nueva o ha sido restablecida. Elige una contraseña propia de al menos 12 caracteres.</p>
        <div class="field"><label for="i-n">Nueva contraseña</label><input id="i-n" type="password" autocomplete="new-password" minlength="12" required></div>
        <button class="btn btn-primary" type="submit">Guardar y continuar</button><p class="form-status err" role="alert"></p>
      </form>
    </div>

    <div id="v-codigo" class="intra-view" hidden>
      <form class="form-card" id="f-codigo" style="max-width:30rem;margin-inline:auto" novalidate>
        <h2>Doble verificación</h2>
        <p class="muted">Escribe el código de 6 cifras de tu app autenticadora, o un código de recuperación (0000-0000).</p>
        <div class="field"><label for="i-k">Código</label><input id="i-k" inputmode="numeric" autocomplete="one-time-code" maxlength="9" required></div>
        <button class="btn btn-primary" type="submit">Entrar</button><p class="form-status err" role="alert"></p>
        <button class="btn btn-ghost btn-sm" type="button" data-volver>Volver</button>
      </form>
    </div>

    <div id="v-config" class="intra-view" hidden>
      <form class="form-card" id="f-config" style="max-width:34rem;margin-inline:auto" novalidate>
        <h2>Activa la doble verificación</h2>
        <p class="muted">Es obligatoria para todo el equipo. Escanea el QR con una app autenticadora (Google Authenticator, Microsoft Authenticator, 1Password...) y escribe el código que te muestre.</p>
        <img id="qr" alt="Código QR para la app autenticadora" width="220" height="220" style="background:#fff;border-radius:12px;padding:8px;justify-self:start">
        <p class="muted" style="font-size:.9rem">¿No puedes escanear? Clave manual: <code id="secreto" style="user-select:all"></code></p>
        <div class="field"><label for="i-k2">Código de 6 cifras</label><input id="i-k2" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></div>
        <button class="btn btn-primary" type="submit">Activar y entrar</button><p class="form-status err" role="alert"></p>
      </form>
    </div>

    <div id="v-recuperacion" class="intra-view" hidden>
      <div class="form-card" style="max-width:34rem;margin-inline:auto">
        <h2>Guarda tus códigos de recuperación</h2>
        <p class="muted">Cada uno sirve una sola vez si pierdes el móvil. No se vuelven a mostrar. Guárdalos en un gestor de contraseñas.</p>
        <ul id="codigos" class="chips" style="list-style:none;padding:0;margin:0"></ul>
        <button class="btn btn-primary" type="button" id="b-recuperacion">Ya los he guardado</button>
      </div>
    </div>

    <div id="v-panel" class="intra-view" hidden>
      <div class="ip-top">
        <div class="ip-user"><span class="ip-avatar" aria-hidden="true"></span><div><b id="p-nombre"></b><span id="p-rol" class="ip-rol"></span></div></div>
        <div class="ip-acciones"><a class="btn btn-ghost btn-sm" href="index.html">Ver la web</a><button class="btn btn-ghost btn-sm" type="button" id="b-salir">Cerrar sesión</button></div>
      </div>
      <div class="ip-layout">
        <nav class="ip-nav" id="p-tabs" aria-label="Secciones de la intranet"></nav>
        <div class="ip-main"><h1 class="ip-title" id="p-titulo"></h1><div id="sec"></div></div>
      </div>
    </div>
  </div>
</div></section>
<script src="intranet.js"></script>'''

exec(open(pathlib.Path(__file__).parent / 'paginas_comunidad.py').read())
como = transparencia_datos + como
PAGES = {
  'index.html': ('PLU · Plataforma Liberal Unida', home, home_hero),
  'proyecto.html': ('El proyecto · PLU', proyecto, hero_page('bench', 'El proyecto', 'Una nueva forma de hacer <em>política.</em>', 'Más libre, más democrática y más cercana a la gente.')),
  'propuestas.html': ('Ámbitos de trabajo · PLU', propuestas, hero_page('walk', 'Ámbitos de trabajo', 'Donde queremos <em>escuchar primero.</em>')),
  'escucha.html': ('Lo que nos cuenta la gente · PLU', escucha, hero_page('circle', 'Escucha ciudadana · PLU', '¿Qué necesita <em>cambiar?</em>', 'Queremos identificar los problemas que se repiten, comprender sus causas y estudiar posibles soluciones.')),
  'democracia.html': ('Cómo participar · PLU', democracia, hero_page('circle', 'Democracia y participación', 'Votar es el principio, <em>no el final.</em>')),
  'como-funciona.html': ('Cómo funciona PLU', como, hero_page('meet', 'Cómo funciona PLU', 'Así tomamos decisiones, <em>así rendimos cuentas.</em>')),
  'debate.html': ('Debate abierto · PLU', debate, ''),
  'participa.html': ('Participa · PLU', participa, hero_page('phone', 'Participa', 'Ayúdanos a construir <em>el proyecto.</em>')),
  'afiliate.html': ('Afíliate · PLU', afiliate, ''),
  'portal.html': ('Portal del afiliado · PLU', portal, ''),
  'intranet.html': ('Intranet · PLU', intranet, ''),
  'ideas.html': ('Ideas ciudadanas · PLU', ideas, hero_page('circle', 'Ideas ciudadanas', 'Propón, apoya y <em>decide.</em>', 'Cualquiera puede proponer. Las personas afiliadas apoyan, comentan y votan.')),
  'idea.html': ('Idea · PLU', idea, ''),
  'consultas.html': ('Votaciones y consultas · PLU', consultas, hero_page('meet', 'Votaciones y consultas', 'Cuando decidimos, <em>lo publicamos.</em>', 'Resultados, quórum y si la decisión es vinculante o consultiva.')),
  'eventos.html': ('Agenda · PLU', eventos, hero_page('bench', 'Agenda', 'Actos, charlas y <em>quedadas.</em>', 'Inscríbete con tu nombre y tu correo.')),
  'noticias.html': ('Noticias · PLU', noticias, hero_page('walk', 'Noticias', 'Lo que está <em>pasando.</em>')),
  'voluntariado.html': ('Voluntariado · PLU', voluntariado, hero_page('floor', 'Voluntariado', '¿Cómo puedo <em>ayudar?</em>')),
  'donar.html': ('Donar · PLU', donar, hero_page('circle', 'Donaciones', 'Financiación <em>a la vista.</em>')),
  'privacidad.html': ('Privacidad · PLU', privacidad, ''),
  'terminos.html': ('Términos de uso · PLU', terminos, ''),
  'cookies.html': ('Cookies · PLU', cookies, ''),
  'normas.html': ('Normas de participación · PLU', normas, ''),
  'faq.html': ('Preguntas frecuentes · PLU', faq, ''),
  'contacto.html': ('Contacto · PLU', contacto, ''),
  'encuesta.html': ('Encuesta · PLU', encuesta, ''),
}
exec(open(pathlib.Path(__file__).parent / 'cms_marcar.py').read())
for f, (t, b, h) in PAGES.items():
    html = page(f, t, b, h)
    if f != 'intranet.html':
        html = marcar(html, f[:-5])
    html = re.sub(r'href="([a-z0-9-]+)\.html(?=["?#])', lambda m: 'href="' + ('/' if m.group(1) == 'index' else '/' + m.group(1)), html)
    (OUT / f).write_text(html)
indice_paginas([(f, v[0]) for f, v in PAGES.items()], OUT / 'paginas.json')
print('ok', len(PAGES))
ids = sorted({v[0] for v in P.values()})
sh = '#!/bin/bash\n# Descarga las fotos de Unsplash a la carpeta fotos/ (macOS o Linux). Ejecutar desde esta carpeta:\n#   cd apps/web/public/prototipo && bash descargar-fotos.sh\nset -e\nmkdir -p fotos\nfor id in ' + ' '.join(ids) + '; do\n  echo "Descargando $id"\n  curl -fsSL "https://images.unsplash.com/$id?auto=format&fit=crop&w=1800&q=75" -o "fotos/$id.jpg" || echo "  (no se pudo: $id)"\ndone\necho "Listo. Abre index.html"\n'
(OUT / 'descargar-fotos.sh').write_text(sh)
