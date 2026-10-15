# Páginas de participación y legales. Este archivo lo carga build_site.py (comparte sus funciones).
AVISO_LEGAL = '<p class="proto-note">Borrador de trabajo: debe revisarlo una persona con formación jurídica antes del lanzamiento. Los datos entre corchetes están por definir.</p>'

def cab(eyebrow, h1, lede=''):
    return f'<div class="head"><span class="eyebrow">{eyebrow}</span><h1 class="h2" data-r>{h1}</h1>{f"<p class=lede>{lede}</p>" if lede else ""}</div>'

AREAS_OPC = ''.join(f'<option>{a}</option>' for a in ['Vivienda','Sanidad','Educación','Transporte','Empleo y vida cotidiana','Servicios públicos','Instituciones y participación','Otro'])
AREAS_VOL = ''.join(f'<option>{a}</option>' for a in ['Comunicación y redes','Programa y propuestas','Diseño','Tecnología','Eventos y logística','Territorio y contacto local','Traducción','Otra'])

ideas = f'''
<section class="section"><div class="wrap">
  <div class="toolbar" id="i-filtros">
    <div class="field"><label for="i-q">Buscar</label><input id="i-q" type="search" placeholder="Palabra clave"></div>
    <div class="field"><label for="i-a">Área</label><select id="i-a"><option value="">Todas</option>{AREAS_OPC}</select></div>
    <div class="field"><label for="i-e">Estado</label><select id="i-e"><option value="">Todos</option><option value="en_estudio">En estudio</option><option value="en_debate">En debate</option><option value="en_votacion">En votación</option><option value="aprobada">Aprobada</option><option value="en_marcha">En marcha</option><option value="descartada">Descartada</option></select></div>
    <div class="field"><label for="i-o">Orden</label><select id="i-o"><option value="apoyos">Más apoyadas</option><option value="recientes">Más recientes</option></select></div>
  </div>
  <div class="rows" id="i-lista"></div><p class="muted" id="i-vacio" hidden>Todavía no hay ideas publicadas con estos filtros. Si tienes una, cuéntanosla: puede ser la primera.</p>
</div></section>
<section class="section alt" id="proponer"><div class="wrap formwrap">
  <div style="display:grid;gap:18px;align-content:start"><div class="head" style="margin:0"><span class="eyebrow">Propón una idea</span><h2 class="h2" data-r>Cualquiera puede proponer. Te contamos qué pasa con ella.</h2></div>
    <ol class="steps"><li><div><h3>La envías</h3><p>Sin cuenta: solo tu nombre y correo (el correo nunca se publica).</p></div></li><li><div><h3>La revisa el equipo</h3><p>Comprobamos que cumple las <a class="link" href="normas.html">normas de participación</a>. Si no, te decimos por qué.</p></div></li><li><div><h3>Se debate y se apoya</h3><p>Las personas afiliadas la apoyan y comentan.</p></div></li><li><div><h3>Se decide</h3><p>Puede pasar a votación. El resultado y el motivo son públicos.</p></div></li></ol></div>
  <form class="form-card" data-api="/api/propuestas" data-ok="¡Idea recibida!" novalidate>
    <h2>Proponer una idea</h2>
    <div class="field-pair"><div class="field"><label for="p-n">Nombre</label><input id="p-n" name="nombre" autocomplete="name" required maxlength="80"></div><div class="field"><label for="p-e">Correo (no se publica)</label><input id="p-e" name="email" type="email" autocomplete="email" required></div></div>
    <div class="field"><label for="p-t">Título de tu idea</label><input id="p-t" name="titulo" required minlength="8" maxlength="120"></div>
    <div class="field"><label for="p-a">Área</label><select id="p-a" name="area">{AREAS_OPC}</select></div>
    <div class="field"><label for="p-x">Explícala (qué problema resuelve y cómo)</label><textarea id="p-x" name="texto" required minlength="40" maxlength="3000" rows="6"></textarea></div>
    <label class="consent"><input type="checkbox" name="acepta_normas" required><span>He leído las <a class="link" href="normas.html">normas de participación</a> y la <a class="link" href="privacidad.html">política de privacidad</a>. Acepto que se publique mi idea con mi nombre de pila.</span></label>
    <button class="btn btn-primary" type="submit">Enviar idea</button><p class="form-status" role="status" aria-live="polite"></p>
  </form>
</div></section>'''

idea = '''
<section class="section"><div class="wrap" id="app-idea" style="max-width:52rem">
  <p><a class="link" href="ideas.html">← Todas las ideas</a></p>
  <div id="d-cabecera"><span class="eyebrow" id="d-estado"></span><h1 class="h2" id="d-titulo">Cargando…</h1><p class="muted" id="d-meta"></p></div>
  <p id="d-texto" style="white-space:pre-wrap;font-size:1.1rem;margin-block:22px"></p>
  <div class="row-btns" id="d-acciones"><button class="btn btn-primary" type="button" id="d-apoyo" hidden></button><span class="chip" id="d-contador"></span><button class="btn btn-ghost btn-sm" type="button" id="d-compartir">Compartir</button></div>
  <p class="muted" id="d-login" hidden>Para apoyar y comentar, <a class="link" href="portal.html">entra en el portal del afiliado</a>. ¿Aún no eres afiliado? <a class="link" href="afiliate.html">Afíliate</a>.</p>
  <p id="d-votacion" hidden><a class="btn btn-ghost btn-sm" id="d-votacion-a" href="#">Ver la votación →</a></p>
  <h2 style="margin-top:34px;font-size:1.4rem">Recorrido</h2><ul class="hist" id="d-historial"></ul>
  <h2 style="margin-top:34px;font-size:1.4rem">Comentarios</h2><div class="rows" id="d-comentarios"></div><p class="muted" id="d-sin-com">Aún no hay comentarios.</p>
  <form class="form-card" id="d-form" hidden style="margin-top:18px" novalidate><div class="field"><label for="d-c">Tu comentario (respetuoso y sobre la propuesta)</label><textarea id="d-c" rows="3" maxlength="1000" required></textarea></div><button class="btn btn-primary" type="submit">Comentar</button><p class="form-status err" role="alert"></p></form>
</div></section>'''

consultas = '''
<section class="section"><div class="wrap" id="app-consultas" style="max-width:56rem">
  <div id="c-lista"></div>
  <div id="c-detalle" hidden><p><a class="link" href="consultas.html">← Todas las consultas</a></p><div id="c-cuerpo"></div></div>
</div></section>'''

eventos = '''
<section class="section"><div class="wrap" id="app-eventos" style="max-width:56rem"><div class="rows" id="e-lista"></div><p class="muted" id="e-vacio" hidden>No hay actos publicados todavía. Suscríbete en <a class="link" href="participa.html">Participa</a> y te avisaremos.</p></div></section>'''

noticias = '''
<section class="section"><div class="wrap blog" id="app-noticias">
  <div id="n-listado">
    <div class="blog-filtros" id="n-filtros" role="group" aria-label="Filtrar por tipo"></div>
    <div id="n-destacada"></div>
    <div class="blog-grid" id="n-lista"></div>
    <p class="muted" id="n-vacio" hidden>Todavía no hay publicaciones en esta categoría.</p>
  </div>
  <article id="n-detalle" class="post" hidden>
    <p class="post-back"><a class="link" href="/noticias">← Todas las noticias</a></p>
    <header class="post-head">
      <p class="post-meta"><span class="post-cat" id="n-cat"></span><span id="n-fecha"></span><span id="n-min"></span></p>
      <h1 class="post-title" id="n-titulo"></h1>
      <p class="post-lede" id="n-resumen" hidden></p>
    </header>
    <figure class="post-cover" id="n-cover"><img id="n-img" alt="" hidden><div class="cover-fb" id="n-cover-fb" hidden><span class="clover" aria-hidden="true"></span></div></figure>
    <div class="post-grid">
      <div class="post-main">
        <div class="post-body" id="n-cuerpo"></div>
    <p class="muted" id="n-login" hidden>Para comentar y dar me gusta, <a class="link" href="/portal">entra en el portal del afiliado</a>. ¿Aún no eres afiliado? <a class="link" href="/afiliate">Afíliate</a>.</p>
    <h2 class="post-h">Comentarios <small id="n-ncom">0</small></h2>
    <div class="rows" id="n-comentarios"></div><p class="muted" id="n-sin-com">Sé la primera persona en comentar.</p>
    <form class="form-card" id="n-form" hidden novalidate><div class="field"><label for="n-c">Tu comentario (respetuoso y sobre la noticia)</label><textarea id="n-c" rows="3" maxlength="1000" required></textarea></div><button class="btn btn-primary" type="submit">Comentar</button><p class="form-status err" role="alert"></p></form>
      </div>
      <aside class="post-side">
    <section class="post-docs" id="n-docs" hidden><h2>Documentos</h2><div id="n-docs-l"></div></section>
    <div class="post-actions">
      <button class="act" type="button" id="n-like" aria-pressed="false" aria-label="Me gusta"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><span id="n-likes">0</span></button>
      <div class="share" id="n-share" role="group" aria-label="Compartir esta noticia"></div>
    </div>
      </aside>
    </div>
    <h2 class="post-h" id="n-mas-t" hidden>Sigue leyendo</h2><div class="blog-grid" id="n-mas"></div>
  </article>
</div></section>'''

voluntariado = f'''
<section class="section"><div class="wrap formwrap">
  <div style="display:grid;gap:18px;align-content:start"><div class="head" style="margin:0"><span class="eyebrow">Voluntariado</span><h2 class="h2" data-r>¿Cómo puedo ayudar?</h2><p class="lede">No hace falta ser afiliado ni tener experiencia. Dinos qué se te da bien y cuánto tiempo tienes.</p></div>
    <div class="chips"><span class="chip">Comunicación</span><span class="chip">Programa</span><span class="chip">Diseño</span><span class="chip">Tecnología</span><span class="chip">Eventos</span><span class="chip">Traducción</span></div></div>
  <form class="form-card" data-api="/api/voluntariado" data-ok="¡Gracias por ofrecerte!" novalidate>
    <h2>Quiero ayudar</h2>
    <div class="field-pair"><div class="field"><label for="v-n">Nombre</label><input id="v-n" name="nombre" required maxlength="80"></div><div class="field"><label for="v-e">Correo</label><input id="v-e" name="email" type="email" required></div></div>
    <div class="field-pair"><div class="field"><label for="v-t">Teléfono (opcional)</label><input id="v-t" name="telefono" type="tel" maxlength="30"></div><div class="field"><label for="v-a">Área</label><select id="v-a" name="area" required>{AREAS_VOL}</select></div></div>
    <div class="field"><label for="v-m">Cuéntanos (opcional)</label><textarea id="v-m" name="mensaje" rows="4" maxlength="800"></textarea></div>
    <label class="consent"><input type="checkbox" name="acepta" required><span>Acepto que PLU use estos datos para contactarme sobre voluntariado. <a class="link" href="privacidad.html">Privacidad</a>.</span></label>
    <button class="btn btn-primary" type="submit">Enviar</button><p class="form-status" role="status" aria-live="polite"></p>
  </form>
</div></section>'''

transparencia_datos = '''
<section class="section"><div class="wrap"><div class="head"><span class="eyebrow">En cifras</span><h2 class="h2" data-r>Lo que hacemos, con números.</h2><p class="lede">Datos reales de la plataforma, actualizados en directo. No incluyen datos personales.</p></div>
<div class="counters" id="t-datos"></div><p class="muted" id="t-fecha"></p></div></section>'''

def legal(eyebrow, titulo, cuerpo):
    return f'<section class="section"><div class="wrap" style="max-width:48rem">{cab(eyebrow, titulo)}{AVISO_LEGAL}<div class="legal-text">{cuerpo}</div></div></section>'


import json, re as _re, html as _html, pathlib as _pl
LEGALES = json.loads((_pl.Path(__file__).parent / 'legales_defecto.json').read_text(encoding='utf8'))

def md_html(md):
    """Mismo formato que apps/api/src/markdown.js: ## títulos, - listas, **negrita**, [texto](enlace). Todo lo demás se escapa."""
    def inline(t):
        t = _html.escape(t, quote=True)
        t = _re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
        t = _re.sub(r'\[([^\]]+)\]\(((?:https?://|/|mailto:)[^)\s]*)\)', r'<a class="link" href="\2">\1</a>', t)
        return t
    out, lista, par = [], [], []
    def cierra():
        nonlocal lista, par
        if par: out.append('<p>' + inline(' '.join(par)) + '</p>'); par = []
        if lista: out.append('<ul>' + ''.join('<li>' + inline(x) + '</li>' for x in lista) + '</ul>'); lista = []
    for linea in md.replace('\r', '').split('\n'):
        l = linea.rstrip()
        if not l.strip(): cierra(); continue
        m = _re.match(r'^(#{2,3})\s+(.*)$', l)
        if m: cierra(); n = len(m.group(1)); out.append(f'<h{n}>' + inline(m.group(2)) + f'</h{n}>'); continue
        m = _re.match(r'^[-*]\s+(.*)$', l)
        if m:
            if par: cierra()
            lista.append(m.group(1)); continue
        if lista: cierra()
        par.append(l.strip())
    cierra()
    return '\n'.join(out)

def legal_json(slug):
    d = LEGALES[slug]
    return (f'<section class="section"><div class="wrap" style="max-width:48rem">{cab(d["eyebrow"], d["titulo"])}<!--AVISO-->{AVISO_LEGAL}<!--/AVISO-->'
            f'<div class="legal-text" data-legal="{slug}" data-cms-skip><!--LEGAL-->{md_html(d["md"])}<!--/LEGAL--></div></div></section>')

privacidad = legal_json('privacidad')

terminos = legal_json('terminos')

cookies = legal_json('cookies')

normas = legal_json('normas')

faq = legal_json('faq')

contacto = legal_json('contacto')


donar = f'''
<section class="section"><div class="wrap formwrap">
  <div style="display:grid;gap:18px;align-content:start"><div class="head" style="margin:0"><span class="eyebrow">Apoya a PLU</span><h2 class="h2" data-r>Una plataforma que se financia a la vista de todos.</h2><p class="lede">Las donaciones se hacen por transferencia bancaria. Por ley hay que identificar a quien dona, así que te pedimos nombre y DNI/NIE. Publicaremos el total recibido.</p></div>
    <ul class="check-list"><li>Sin donaciones anónimas ni en efectivo.</li><li>Tu documento se guarda cifrado y nunca se publica.</li><li>El dinero y su destino se publican en transparencia.</li></ul>
    <p class="muted" id="d-total"></p></div>
  <form class="form-card" data-api="/api/donaciones" data-ok="¡Gracias por tu apoyo!" data-donar novalidate>
    <h2>Quiero donar</h2>
    <p class="muted" id="d-off" hidden>Las donaciones todavía no están habilitadas. Vuelve pronto.</p>
    <div class="field"><label for="d-n">Nombre y apellidos</label><input id="d-n" name="nombre" required maxlength="160" autocomplete="name"></div>
    <div class="field-pair"><div class="field"><label for="d-d">DNI o NIE</label><input id="d-d" name="documento" required maxlength="12" autocomplete="off"></div><div class="field"><label for="d-e">Correo</label><input id="d-e" name="email" type="email" required autocomplete="email"></div></div>
    <div class="field"><label for="d-i">Importe (€)</label><input id="d-i" name="importe" type="number" min="1" max="50000" step="0.01" inputmode="decimal" required></div>
    <label class="consent"><input type="checkbox" name="acepta" required><span>Acepto que PLU trate estos datos para registrar mi donación. <a class="link" href="privacidad.html">Privacidad</a>.</span></label>
    <button class="btn btn-primary" type="submit">Continuar</button><p class="form-status" role="status" aria-live="polite"></p>
  </form>
</div></section>'''


CATS_ESCUCHA = [
 ('Transporte', 'Transporte y movilidad', 'Conexiones insuficientes, horarios y acceso a servicios.'),
 ('Vivienda', 'Acceso a la vivienda', 'Dificultades para alquilar, emanciparse y mantener un hogar.'),
 ('Sanidad', 'Sanidad y cuidados', 'Experiencias y propuestas relacionadas con la atención y los servicios.'),
 ('Educación', 'Educación y oportunidades', 'Qué impide aprender, formarse y progresar.'),
 ('Empleo y vida cotidiana', 'Trabajo y vida cotidiana', 'Conciliar, llegar a fin de mes y tener una vida estable.'),
 ('Servicios públicos', 'Servicios públicos', 'Servicios que quedan lejos o funcionan peor de lo que deberían.'),
 ('Instituciones y participación', 'Instituciones y participación', 'Cómo mejorar la participación y exigir que las decisiones se expliquen.'),
 ('Otro', 'Otros asuntos', 'Lo que no encaja en ningún otro tema.'),
]
cats_html = ''.join(f'<div class="esc-cat" data-area="{a}" data-r><h3>{t}</h3><p>{d}</p><span class="tag esc-n" hidden></span></div>' for a, t, d in CATS_ESCUCHA)
escucha = f'''
<section class="section"><div class="wrap">
  <div class="head"><span class="eyebrow">Escucha ciudadana · PLU</span><h2 class="h2" data-r>Cómo vamos agrupando lo que nos contáis.</h2><p class="lede" data-r>Los problemas no deberían quedarse en una conversación. Agrupamos las aportaciones por tema para ver qué se repite y quién lo vive.</p></div>
  <div class="esc-grid" id="esc-areas">{cats_html}</div>
  <p class="muted" id="esc-nota" style="margin-top:18px">Estos son ejemplos de categorías, no resultados reales de aportaciones recibidas.</p>
  <div id="esc-publicas" hidden><div class="head" style="margin-top:42px"><span class="eyebrow">Aportaciones publicadas</span><h2 class="h2">Lo que ya estamos estudiando.</h2></div><div class="rows" id="esc-lista"></div></div>
  <p class="muted" style="margin-top:22px;max-width:44rem">Solo publicamos aportaciones cuando la persona lo ha autorizado y de forma anónima. No todas las propuestas podrán convertirse en medidas: explicaremos cómo las estudiamos, cuáles seguimos desarrollando y qué dificultades encontramos.</p>
</div></section>
<section class="section alt"><div class="wrap formwrap">
  <div style="display:grid;gap:18px;align-content:start"><div class="head" style="margin:0"><span class="eyebrow">¿Hay algo que quieras añadir?</span><h2 class="h2" data-r>Comparte tu experiencia o una propuesta.</h2><p class="lede">Tu experiencia también cuenta. No hace falta ser experto ni tener la solución: basta con contarnos qué ocurre.</p></div></div>
  {form_necesidad('')}
</div></section>'''
