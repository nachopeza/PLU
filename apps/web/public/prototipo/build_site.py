import pathlib
OUT = pathlib.Path(__file__).parent

def I(pid, w, alt, duo=True, extra=''):
    src = f'https://images.unsplash.com/{pid}?auto=format&fit=crop&w={w}&q=70'
    return f'<div class="ph{" duo" if duo else ""} {extra}"><img src="{src}" alt="{alt}" loading="lazy" decoding="async"></div>'

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

NAV = [('proyecto.html', 'El proyecto'), ('propuestas.html', 'Propuestas'), ('participa.html', 'Participa'), ('como-funciona.html', 'Transparencia')]

def page(fname, title, body, hero=''):
    links = ''.join(f'<a href="{h}"{" aria-current=\"page\"" if h == fname else ""}>{t}</a>' for h, t in NAV)
    mlinks = ''.join(f'<a href="{h}">{t}</a>' for h, t in NAV) + '<a href="debate.html">Debate abierto</a><a href="portal.html">Portal del afiliado</a>'
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Figtree:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="styles.css">
<script>document.documentElement.classList.add("js")</script>
</head>
<body>
<div id="progress" aria-hidden="true"></div><div class="glow" id="glow" aria-hidden="true"></div>
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
<main>
{hero}{body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a class="brand" href="index.html" aria-label="PLU, inicio"><span class="clover" role="img" aria-label="Trébol de la PLU"></span><img class="wordmark" src="brand/word.png" alt="PLU"></a>
        <p class="muted" style="margin-top:14px;max-width:26rem">Plataforma Liberal Unida. La libertad de las personas. La identidad de los territorios. El bienestar de todos.</p>
      </div>
      <div><h3>Explora</h3><ul class="footer-links"><li><a href="proyecto.html">El proyecto</a></li><li><a href="propuestas.html">Propuestas</a></li><li><a href="democracia.html">Cómo participar</a></li><li><a href="como-funciona.html">Transparencia</a></li><li><a href="debate.html">Debate abierto</a></li></ul></div>
      <div><h3>Acceso</h3><ul class="footer-links"><li><a href="participa.html">Participa</a></li><li><a href="afiliate.html">Afíliate</a></li><li><a href="portal.html">Portal del afiliado</a></li><li><a href="intranet.html">Acceso del equipo</a></li></ul></div>
    </div>
    <p class="legal">Versión de trabajo de octubre de 2026. Base doctrinal, no un programa electoral definitivo ni un texto jurídico aprobado. Nombre, siglas y lema son provisionales. Fotografías de Unsplash, provisionales. Prototipo: ningún formulario envía ni guarda datos.</p>
  </div>
</footer>
<script src="site.js"></script>
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

home_hero = f'''<section class="hero">{ph('walk', 1800)}
  <div class="wrap hero-grid">
    <div style="display:grid;gap:22px">
      <h1><span class="split">Una política</span> <span class="split">que funcione</span> <span class="split"><em>para las personas.</em></span></h1>
      <p data-r>Más libertad para decidir. Más claridad sobre quién responde. Más participación en las decisiones que afectan a tu vida.</p>
      <div class="cta-row" data-r><a class="btn btn-light magnet" href="proyecto.html">Conoce el proyecto</a><a class="btn btn-line-light magnet" href="participa.html">Participa →</a></div>
      <div class="lema" data-r><span><b>La libertad</b> de las personas.</span><span><b>La identidad</b> de los territorios.</span><span>El <b>bienestar</b> de todos.</span></div>
    </div>
    <div class="hero-clover clover" data-parallax="-30" aria-hidden="true"></div>
  </div>
</section>
<div class="ticker" aria-hidden="true"><div class="ticker-track"><span>Libertad</span><span>Participación</span><span>Cuentas claras</span><span>Vivienda</span><span>Sanidad</span><span>Educación</span><span>Transporte</span><span>Territorio</span><span>Libertad</span><span>Participación</span><span>Cuentas claras</span><span>Vivienda</span><span>Sanidad</span><span>Educación</span><span>Transporte</span><span>Territorio</span></div></div>'''

PRIN = [('Libertad individual','Tus decisiones, tus derechos.'),('Democracia real','Participa, decide, exige.'),('Igualdad de oportunidades','El origen no define tu futuro.'),('Estado de derecho','La ley protege a todos.'),('Economía de mercado','Más empleo, más innovación.'),('Servicios esenciales','Sanidad, educación, vivienda, transporte.'),('Competencias claras','Cada quién lo que le corresponde.'),('Profesionalización del gobierno','Mérito, transparencia, resultados.'),('Sostenibilidad','Hoy y para las próximas generaciones.'),('Transparencia','Qué se decide, cuánto cuesta, quién responde.')]
prin_li = ''.join(f'<li data-r><b>{a}</b><span>{b}</span></li>' for a, b in PRIN)

home = f'''
<section class="section">
  <div class="wrap sec-split">
    <div class="txt"><span class="eyebrow" data-r>¿Por qué PLU?</span><h2 data-r>Porque la política actual no está resolviendo los problemas reales.</h2>
      <p class="lede" data-r>Queremos un sistema más libre, más justo y más eficiente, que devuelva el poder a la ciudadanía y ponga a las personas en el centro.</p>
      <a class="link-arrow" data-r href="proyecto.html">Descubre cómo lo haremos →</a></div>
    <div data-r="img">{I(P['street'][0], 1000, P['street'][1], extra='corner')}</div>
  </div>
</section>

<section class="section alt">
  <div class="wrap">
    <div class="head"><span class="eyebrow" data-r>Principios</span><h2 class="h2" data-r>Diez principios para una España mejor.</h2><p class="lede" data-r>Una base sólida para construir el futuro.</p></div>
    <ol class="principios10">{prin_li}</ol>
    <p style="margin-top:22px"><a class="link-arrow" href="proyecto.html#principios">Ver todos los principios →</a></p>
  </div>
</section>

<section class="section">
  <div class="wrap sec-split">
    <div class="txt"><h2 data-r>Tu voz también cuenta.</h2><p class="lede" data-r>La política no termina en las elecciones. Queremos que debatas y participes en las decisiones compartidas.</p><a class="link-arrow" data-r href="democracia.html">Cómo participar →</a></div>
    <div class="icons4">{icoitem('vote','Elecciones')}{icoitem('spark','Iniciativas ciudadanas')}{icoitem('group','Asambleas deliberativas')}{icoitem('ballot','Referéndums')}</div>
  </div>
</section>

<section class="section greenband">
  <div class="wrap sec-split">
    <div class="txt"><span class="eyebrow">Tu día a día</span><h2 data-r>Vivienda, sanidad, educación y transporte. <em style="font-style:normal;text-decoration:underline;text-decoration-color:var(--hl);text-underline-offset:6px">Cuatro pilares, un mismo compromiso.</em></h2>
      <p data-r style="opacity:.85">Servicios públicos accesibles, de calidad y pensados para tu vida, no para los problemas de la política.</p><a class="link-arrow" style="color:var(--hl)" href="propuestas.html">Ver propuestas →</a></div>
    <div class="photo4">
      <a class="ptile tilt" href="propuestas.html#vivienda">{ph('viv', 600)}<span>Vivienda</span></a>
      <a class="ptile tilt" href="propuestas.html#sanidad">{ph('san', 600)}<span>Sanidad</span></a>
      <a class="ptile tilt" href="propuestas.html#educacion">{ph('edu', 600)}<span>Educación</span></a>
      <a class="ptile tilt" href="propuestas.html#transporte">{ph('tra', 600)}<span>Transporte</span></a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap sec-split">
    <div class="txt"><h2 data-r>Profesionales al frente, con mandato democrático.</h2><p class="lede" data-r>La última palabra la tiene la ciudadanía. La gestión, quienes saben hacerla bien.</p><a class="link-arrow" data-r href="como-funciona.html#responsables">Cómo funciona →</a></div>
    <ol class="steps5">
      <li data-r>{ico('doc')}Requisitos públicos</li><li data-r>{ico('scale')}Evaluación independiente</li><li data-r>{ico('check')}Nombramiento legítimo</li><li data-r>{ico('chart')}Objetivos y resultados</li><li data-r>{ico('eye')}Control y rendición de cuentas</li>
    </ol>
  </div>
</section>

<section class="section alt">
  <div class="wrap sec-split">
    <div class="txt"><h2 data-r>Las reglas también se aplican a PLU.</h2><p class="lede" data-r>Transparencia, rendición de cuentas y una estructura abierta a la ciudadanía.</p><a class="link-arrow" data-r href="como-funciona.html#transparencia">Ver cómo funcionamos →</a></div>
    <div class="icons4">{icoitem('wallet','Financiación abierta')}{icoitem('conflict','Conflictos de interés')}{icoitem('doc','Decisiones publicadas')}{icoitem('scale','Órgano de garantías')}</div>
  </div>
</section>

<section class="joinband">{ph('park', 1800)}
  <div class="wrap">
    <div style="display:grid;gap:18px;justify-items:start">
      <h2 data-r>Únete a PLU. <em>Gratis.</em></h2>
      <p data-r style="max-width:30rem;opacity:.9">No se trata de afiliarse a un partido. Es un movimiento ciudadano para construir una mejor España.</p>
      <a class="btn btn-light magnet" href="afiliate.html">Únete ahora</a>
    </div>
    <div class="big clover" data-parallax="25" aria-hidden="true"></div>
  </div>
</section>

<section class="section band" id="acceso">
  <div class="wrap">
    <div class="head"><span class="eyebrow">Accede</span><h2 class="h2" data-r>Tu sitio en PLU.</h2><p class="lede">Afiliarse es gratis, con 16 años o más y residiendo en España.</p></div>
    <div class="gates">
      <a class="gate main tilt" href="afiliate.html"><div><small>Nuevo</small><h3>Quiero afiliarme</h3><p>Recibirás tu carné por correo.</p></div><span class="go">Afiliarme →</span></a>
      <a class="gate tilt" href="portal.html"><div><small>Afiliados</small><h3>Portal del afiliado</h3><p>Tu carné, encuestas y solicitudes.</p></div><span class="go">Entrar →</span></a>
      <a class="gate tilt" href="intranet.html"><div><small>Equipo</small><h3>Intranet</h3><p>Acceso restringido con doble verificación.</p></div><span class="go">Acceso equipo →</span></a>
    </div>
  </div>
</section>
'''

# ================= PROYECTO =================
FAM = [('Libertad', ['Libertad individual: tu proyecto de vida, con respeto a los derechos ajenos.', 'Pluralismo y convivencia: nadie impone una única forma de vivir o pensar.', 'Economía de mercado: iniciativa privada con reglas claras.']),
 ('Democracia', ['Soberanía ciudadana: el poder viene de la ciudadanía.', 'Estado de derecho: todos, también quien manda, sometidos a la ley.', 'Diversidad territorial: lenguas y culturas con derechos comunes.']),
 ('Bienestar', ['Oportunidades reales: vivienda, educación, sanidad y transporte.', 'Responsabilidad fiscal: cada política explica su coste.']),
 ('Responsabilidad', ['Profesionalidad pública: decisiones con conocimiento y evidencia.', 'Transparencia: qué se decide, cuánto cuesta, quién responde.'])]
fams = ''.join(f'<div class="family" data-r><h3>{n}</h3><ul class="leaf-list">{"".join(f"<li>{x}</li>" for x in xs)}</ul></div>' for n, xs in FAM)
road = '''<li class="now" data-r><span class="phase">Estamos aquí</span><h3>Definición doctrinal</h3><p>Se debate antes de comprometerse.</p></li>
<li data-r><span class="phase">Fase 1-2</span><h3>Cimientos y democracia</h3><p>Principios, participación y controles.</p></li>
<li data-r><span class="phase">Fase 3-4</span><h3>Territorio y modelo social</h3><p>Competencias, financiación y servicios esenciales.</p></li>
<li data-r><span class="phase">Fase 5-6</span><h3>Instituciones y programa</h3><p>Propuestas con coste, responsables e indicadores.</p></li>
<li data-r><span class="phase">Fase 7</span><h3>Organización y viabilidad legal</h3><p>Estatutos, financiación y requisitos legales.</p></li>'''
proyecto = f'''
<section class="section">
  <div class="wrap sec-split">
    <div class="txt"><span class="eyebrow" data-r>Nuestra visión</span><h2 data-r>Una España más libre, más justa, más fuerte.</h2>
      <p class="lede" data-r>Un país donde cada persona pueda desarrollar su proyecto de vida con libertad, responsabilidad y oportunidades reales.</p>
      <p class="muted" data-r>El cambio no es un eslogan. Es un compromiso.</p>
      <details class="more" data-r><summary>Leer el manifiesto completo</summary><div>
        <p>Creemos en una sociedad donde cada persona pueda desarrollar su proyecto de vida con libertad, responsabilidad y oportunidades reales. Las instituciones deben proteger derechos, garantizar servicios esenciales y rendir cuentas.</p>
        <p>Defendemos una democracia que no se limite a elegir representantes cada cuatro años: con mecanismos para participar, deliberar, proponer y decidir sobre cuestiones relevantes.</p>
        <p>Entendemos España como una comunidad compartida de territorios con identidades, culturas y lenguas propias.</p>
        <p>Queremos instituciones profesionales, transparentes y evaluables. La competencia técnica acompaña a la legitimidad democrática, nunca la sustituye.</p>
        <p><b>Una ciudadanía con poder. Un Estado responsable. Un país que reconoce su diversidad.</b></p></div></details></div>
    <div class="clover visionclover" data-parallax="-20" style="width:min(70%,260px)" aria-hidden="true"></div>
  </div>
</section>
<section class="section alt"><div class="wrap"><div class="head"><span class="eyebrow">Lo que nos diferencia</span><h2 class="h2" data-r>Cuatro ideas que lo cambian todo.</h2></div>
  <div class="icons4">{icoitem('group','Democracia mixta')}{icoitem('map','Modelo territorial de competencias')}{icoitem('euro','Economía de mercado')}{icoitem('people','Gobierno profesionalizado')}</div></div></section>
<section class="section" id="principios"><div class="wrap">
  <div class="head"><span class="eyebrow">Los principios que nos guían</span><h2 class="h2" data-r>Una base sólida para construir el futuro.</h2></div>
  <div class="vidblock tilt" style="margin-bottom:28px">{ph('circle', 1600)}<div class="cap">Una España más libre, más justa, más fuerte.</div></div>
  <div class="families">{fams}</div></div></section>
<section class="section alt"><div class="wrap"><div class="head"><span class="eyebrow">Hoja de ruta</span><h2 class="h2" data-r>De las ideas a una organización abierta y responsable.</h2></div><ol class="road">{road}</ol></div></section>
'''

# ================= PROPUESTAS =================
def prow(cat, k, name, title, short, bullets):
    lis = ''.join(f'<li>{b}</li>' for b in bullets)
    return f'''<details class="rowitem" id="{cat}" data-cat="{cat}" data-r><summary><div class="ph duo thumb"><img src="https://images.unsplash.com/{P[k][0]}?auto=format&fit=crop&w=300&q=70" alt="{P[k][1]}" loading="lazy"></div><div><span class="tag">{name}</span><h3>{title}</h3><p class="s">{short}</p></div><span class="chev">›</span></summary>
 <div class="body"><ul class="leaf-list">{lis}</ul><span class="status">En desarrollo</span>
 <div class="pcard"><div class="pcard-head">Ficha · ejemplo de estructura, no es propuesta aprobada</div><dl>
 <div class="row"><dt>El problema</dt><dd>Por definir con datos.</dd></div><div class="row"><dt>La medida</dt><dd>Por definir: qué cambia y quién responde.</dd></div>
 <div class="row"><dt>Coste y viabilidad</dt><dd>Por definir.</dd></div><div class="row"><dt>Cómo se medirá</dt><dd>Indicadores y plazo, por definir.</dd></div></dl></div></div></details>'''
propuestas = f'''
<section class="section"><div class="wrap">
  <div class="filters" role="group" aria-label="Filtrar propuestas"><button class="fbtn" aria-pressed="true" data-f="all">Todas</button><button class="fbtn" aria-pressed="false" data-f="vivienda">Vivienda</button><button class="fbtn" aria-pressed="false" data-f="sanidad">Sanidad</button><button class="fbtn" aria-pressed="false" data-f="educacion">Educación</button><button class="fbtn" aria-pressed="false" data-f="transporte">Transporte</button><button class="fbtn" aria-pressed="false" data-f="instituciones">Instituciones</button></div>
  <div class="rows" id="filterlist">
  {prow('vivienda','viv','Vivienda','Que independizarte no sea una barrera','Más oferta, menos burocracia y ayudas dirigidas a quienes más lo necesitan.',['Más vivienda asequible','Colaboración pública y privada','Rehabilitar lo que está vacío'])}
  {prow('sanidad','san','Sanidad','Un sistema sanitario más eficiente','Mejores tiempos de espera, más prevención y gestión transparente.',['Atención primaria y prevención','Listas de espera transparentes','Continuidad asistencial'])}
  {prow('educacion','edu','Educación','Educación para el futuro','Más calidad, más innovación y menos desigualdad.',['Formación profesional y continua','Menos abandono educativo','Atención a cada forma de aprender'])}
  {prow('transporte','tra','Transporte','Movilidad sostenible y accesible','Conexiones entre territorios y ciudades, y un transporte público de calidad.',['Conexiones entre barrios y pueblos','Frecuencias útiles y tarifas integradas','Accesible y asequible'])}
  {prow('instituciones','meet','Instituciones','Participación ciudadana real','Mecanismos de consulta, iniciativa popular y asambleas ciudadanas.',['Iniciativas ciudadanas con respuesta','Asambleas deliberativas','Cuentas y decisiones públicas'])}
  </div>
  <p class="muted" style="margin-top:26px;max-width:40rem">Hoy son objetivos, no promesas de resultado. Las medidas, el coste y la forma de evaluarlas se están desarrollando, y tú puedes opinar.</p>
  <p style="margin-top:18px"><a class="btn btn-primary magnet" href="debate.html">Aportar mi opinión</a></p>
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
  <div class="head"><span class="eyebrow">Así tomamos decisiones</span><h2 class="h2" data-r>Así tomamos decisiones, así nos organizamos, así rendimos cuentas.</h2></div>
  <ol class="steps5">
    <li data-r>{ico('spark')}1. Propuesta ciudadana<small>Cualquier persona puede proponer una idea o plantear un problema.</small></li>
    <li data-r>{ico('chart')}2. Evaluación de viabilidad<small>Se analiza su encaje legal, económico y social.</small></li>
    <li data-r>{ico('group')}3. Deliberación<small>Se debate en la comunidad y en los órganos de PLU.</small></li>
    <li data-r>{ico('ballot')}4. Decisión<small>Se define la propuesta y su implementación.</small></li>
    <li data-r>{ico('eye')}5. Seguimiento<small>Se publican los resultados y se evalúa su impacto.</small></li>
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
    <span class="status">Compromiso · aún no implantado</span><p class="muted">PLU está en fase fundacional. Aquí publicaremos qué existe ya y qué todavía no.</p></div>
  {ph('street', 1000, 'r')}
</div></section>'''

# ================= DEBATE =================
def drow(state, label, ico_k, title, q, l, r):
    return f'''<details class="rowitem" data-state="{state}" data-r><summary class="noimg">{ico(ico_k)}<div><span class="tag">{label}</span><h3>{title}</h3><p class="s">{q}</p></div><span class="chev">›</span></summary>
<div class="body"><div class="dilema" style="border:0;padding:0;background:none"><div class="poles"><span>{l}</span><span>{r}</span></div><input type="range" min="0" max="100" value="50" aria-label="{l} o {r}"><p class="dilema-out" aria-live="polite">Equilibrio</p></div><p class="muted" style="font-size:.9rem">Demostración: tu postura no se guarda ni cuenta como voto.</p></div></details>'''
debate = f'''
<section class="section"><div class="wrap">
  <div class="head"><span class="eyebrow">Qué es firme y qué no</span><h2 class="h2" data-r>¿Qué está en debate?</h2><p class="lede">Hay decisiones importantes que aún tenemos que tomar. Queremos escucharte.</p></div>
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
    <a class="opt tilt" href="proyecto.html" data-r>{ico('doc')}<span><b>Quiero conocer el proyecto</b><small>Lee, infórmate, hazte una idea.</small></span></a>
    <a class="opt tilt" href="#participa-form" data-r>{ico('speech')}<span><b>Quiero dar mi opinión</b><small>Comparte tu punto de vista.</small></span></a>
    <a class="opt tilt" href="#participa-form" data-r>{ico('mail')}<span><b>Quiero recibir novedades</b><small>Mantente al día del proyecto.</small></span></a>
    <a class="opt tilt" href="#participa-form" data-r>{ico('group')}<span><b>Quiero colaborar</b><small>Únete a los grupos de trabajo.</small></span></a>
  </div>
</div></section>
<section class="joinband">{ph('floor', 1800)}
  <div class="wrap"><div style="display:grid;gap:18px;justify-items:start"><h2 data-r>Tu voz puede marcar <em>la diferencia.</em></h2><p data-r style="opacity:.9;max-width:30rem">Rellena el formulario y ayúdanos a construir una mejor España.</p><a class="btn btn-light magnet" href="#participa-form">Participa ahora</a></div><div class="big clover" data-parallax="25" aria-hidden="true"></div></div>
</section>
<section class="section" id="participa-form"><div class="wrap formwrap">
  <div style="display:grid;gap:22px;align-content:start">
    <div class="head" style="margin:0"><span class="eyebrow">Escríbenos</span><h2 class="h2" data-r>Construyamos PLU entre todos.</h2></div>
    <ol class="steps"><li><div><h3>Dar tu opinión</h3><p>Publicaremos las aportaciones y qué pasa con ellas.</p></div></li><li><div><h3>Seguir el proyecto</h3><p>Un boletín con avances y decisiones.</p></div></li><li><div><h3>Colaborar</h3><p>Grupos de trabajo y revisión de propuestas.</p></div></li><li><div><h3>Incorporarte</h3><p><a class="link-arrow" href="afiliate.html">Cómo formar parte de PLU →</a></p></div></li></ol>
  </div>
  <form class="form-card" data-demo="Prototipo: nada se ha enviado ni guardado." novalidate>
    <h2>Participa</h2>
    <fieldset class="choices"><legend>¿Cómo te gustaría participar?</legend>
      <label class="choice"><input type="radio" name="modo" checked><span>Compartir una idea</span></label>
      <label class="choice"><input type="radio" name="modo"><span>Opinar sobre una cuestión abierta</span></label>
      <label class="choice"><input type="radio" name="modo"><span>Recibir novedades</span></label>
      <label class="choice"><input type="radio" name="modo"><span>Colaborar en el proyecto</span></label></fieldset>
    <div class="field"><label for="f-aporte">¿Qué te gustaría aportar?</label><textarea id="f-aporte" placeholder="Opcional"></textarea></div>
    <div class="field"><label for="f-correo">Correo electrónico</label><input id="f-correo" type="email" autocomplete="email" required></div>
    <label class="consent"><input type="checkbox" required><span>Acepto que PLU use mi correo para responderme y enviarme novedades. Puedo darme de baja cuando quiera. Política de privacidad pendiente.</span></label>
    <button class="btn btn-primary" type="submit">Enviar</button><p class="form-status" role="status" aria-live="polite"></p>
  </form>
</div></section>'''
# ================= AFÍLIATE =================
afiliate = f'''
<section class="section"><div class="wrap formwrap">
  <div style="display:grid;gap:22px;align-content:start">
    <div class="head" style="margin:0"><span class="eyebrow">Afíliate</span><h2 class="h2">Forma parte de PLU.</h2><p class="lede">Recibirás tu carné de afiliado por correo y acceso al portal.</p></div>
    <div class="chips"><span class="chip">Gratis</span><span class="chip">16 años o más</span><span class="chip">Residir en España</span><span class="chip">DNI o NIE</span></div>
    {ph('fence', 1000, 'r')}
    <p class="muted">¿Solo quieres recibir avisos de campañas, eventos y encuestas? <a class="link" href="participa.html">Hazte simpatizante →</a></p>
  </div>
  <form class="form-card" data-demo="Prototipo: nada se ha enviado ni guardado. Al aprobar tu solicitud recibirías el carné y una contraseña temporal por correo." novalidate>
    <div class="stepper" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="step">
      <h3>1. Tus datos</h3>
      <div class="field-pair"><div class="field"><label for="a-n">Nombre</label><input id="a-n" autocomplete="given-name" required></div><div class="field"><label for="a-a">Apellidos</label><input id="a-a" autocomplete="family-name" required></div></div>
      <div class="field"><label for="a-c">Correo</label><input id="a-c" type="email" autocomplete="email" required></div>
      <div class="field"><label for="a-t">Teléfono</label><input id="a-t" type="tel" placeholder="Opcional"></div>
      <button class="btn btn-primary" type="button" data-next>Siguiente</button>
    </div>
    <div class="step" hidden>
      <h3>2. Identificación y provincia</h3>
      <div class="field"><label for="a-d">DNI o NIE</label><input id="a-d" required></div>
      <div class="field"><label for="a-f">Fecha de nacimiento (mínimo 16 años)</label><input id="a-f" type="date" required></div>
      <div class="field-pair"><div class="field"><label for="f-prov">Provincia de residencia</label><select id="f-prov" required><option value="">Elige…</option></select></div><div class="field"><label for="a-cp">Código postal</label><input id="a-cp" inputmode="numeric" required></div></div>
      <p class="muted" style="font-size:.92rem">Tu documento se guarda cifrado y no pedimos foto del DNI.</p>
      <div class="row-btns"><button class="btn btn-ghost" type="button" data-prev>Atrás</button><button class="btn btn-primary" type="button" data-next>Siguiente</button></div>
    </div>
    <div class="step" hidden>
      <h3>3. Consentimientos</h3>
      <label class="consent"><input type="checkbox" required><span>Acepto que PLU trate mis datos para gestionar mi afiliación. Mi afiliación es un dato especialmente protegido y solo la verá el equipo autorizado.</span></label>
      <label class="consent"><input type="checkbox"><span>Quiero recibir avisos de campañas, eventos y encuestas por correo (opcional).</span></label>
      <div class="row-btns"><button class="btn btn-ghost" type="button" data-prev>Atrás</button><button class="btn btn-primary" type="submit">Solicitar afiliación</button></div>
      <p class="form-status" role="status" aria-live="polite"></p>
    </div>
  </form>
</div></section>'''

# ================= PORTAL / INTRANET =================
portal = f'''
<section class="section login-page"><div class="wrap formwrap" style="align-items:center">
  <div style="display:grid;gap:18px"><span class="eyebrow">Portal del afiliado</span><h1 class="h2">Tu carné, tus encuestas, tus solicitudes.</h1>
    <p class="lede">Entra con tu correo y la contraseña que te enviamos. La primera vez te pediremos que elijas una nueva.</p>
    <p class="muted">¿Todavía no eres afiliado? <a class="link" href="afiliate.html">Afíliate →</a></p></div>
  <form class="form-card" data-demo="Prototipo: aquí se validaría tu cuenta." novalidate>
    <h2>Entrar</h2>
    <div class="field"><label for="p-c">Correo</label><input id="p-c" type="email" autocomplete="username" required></div>
    <div class="field"><label for="p-p">Contraseña</label><input id="p-p" type="password" autocomplete="current-password" required></div>
    <button class="btn btn-primary" type="submit">Entrar</button><p class="form-status" role="status" aria-live="polite"></p>
    <a class="link" href="#" onclick="return false">He olvidado mi contraseña</a>
    <p class="proto-note">Prototipo. No hay verificación pública de carnés: solo el equipo puede comprobarlos.</p>
  </form>
</div></section>'''
intranet = f'''
<section class="section login-page"><div class="wrap formwrap" style="align-items:center">
  <div style="display:grid;gap:18px"><span class="eyebrow">Intranet · Solo equipo</span><h1 class="h2">Gestión de PLU.</h1>
    <p class="lede">Acceso restringido a personas autorizadas, con doble verificación obligatoria. Cada acción queda registrada.</p></div>
  <form class="form-card" data-demo="Prototipo: aquí se validaría usuario, contraseña y código." novalidate>
    <h2>Acceso del equipo</h2>
    <div class="field"><label for="i-u">Usuario</label><input id="i-u" autocomplete="username" required></div>
    <div class="field"><label for="i-p">Contraseña</label><input id="i-p" type="password" autocomplete="current-password" required></div>
    <div class="field"><label for="i-k">Código de la app autenticadora</label><input id="i-k" inputmode="numeric" maxlength="6" autocomplete="one-time-code" required></div>
    <button class="btn btn-primary" type="submit">Entrar</button><p class="form-status" role="status" aria-live="polite"></p>
    <p class="proto-note">Prototipo. En la plataforma real este acceso vive en /intranet.</p>
  </form>
</div></section>'''

PAGES = {
  'index.html': ('PLU · Plataforma Liberal Unida', home, home_hero),
  'proyecto.html': ('El proyecto · PLU', proyecto, hero_page('bench', 'El proyecto', 'Una nueva forma de hacer <em>política.</em>', 'Más libre, más democrática y más cercana a la gente.')),
  'propuestas.html': ('Propuestas · PLU', propuestas, hero_page('walk', 'Propuestas', 'Ideas concretas para mejorar <em>la vida de las personas.</em>')),
  'democracia.html': ('Cómo participar · PLU', democracia, hero_page('circle', 'Democracia y participación', 'Votar es el principio, <em>no el final.</em>')),
  'como-funciona.html': ('Cómo funciona PLU', como, hero_page('meet', 'Cómo funciona PLU', 'Así tomamos decisiones, <em>así rendimos cuentas.</em>')),
  'debate.html': ('Debate abierto · PLU', debate, ''),
  'participa.html': ('Participa · PLU', participa, hero_page('phone', 'Participa', 'Ayúdanos a construir <em>el proyecto.</em>')),
  'afiliate.html': ('Afíliate · PLU', afiliate, ''),
  'portal.html': ('Portal del afiliado · PLU', portal, ''),
  'intranet.html': ('Intranet · PLU', intranet, ''),
}
for f, (t, b, h) in PAGES.items():
    (OUT / f).write_text(page(f, t, b, h))
print('ok', len(PAGES))
