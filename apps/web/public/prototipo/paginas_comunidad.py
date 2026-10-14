# Páginas de participación y legales. Este archivo lo carga build_site.py (comparte sus funciones).
AVISO_LEGAL = '<p class="proto-note">Borrador de trabajo: debe revisarlo una persona con formación jurídica antes del lanzamiento. Los datos entre corchetes están por definir.</p>'

def cab(eyebrow, h1, lede=''):
    return f'<div class="head"><span class="eyebrow">{eyebrow}</span><h1 class="h2" data-r>{h1}</h1>{f"<p class=lede>{lede}</p>" if lede else ""}</div>'

AREAS_OPC = ''.join(f'<option>{a}</option>' for a in ['Libertades y derechos','Economía y empleo','Vivienda','Educación y juventud','Sanidad','Medio ambiente','Democracia y transparencia','Territorio','Otra'])
AREAS_VOL = ''.join(f'<option>{a}</option>' for a in ['Comunicación y redes','Programa y propuestas','Diseño','Tecnología','Eventos y logística','Territorio y contacto local','Traducción','Otra'])

ideas = f'''
<section class="section"><div class="wrap">
  <div class="toolbar" id="i-filtros">
    <div class="field"><label for="i-q">Buscar</label><input id="i-q" type="search" placeholder="Palabra clave"></div>
    <div class="field"><label for="i-a">Área</label><select id="i-a"><option value="">Todas</option>{AREAS_OPC}</select></div>
    <div class="field"><label for="i-e">Estado</label><select id="i-e"><option value="">Todos</option><option value="en_estudio">En estudio</option><option value="en_debate">En debate</option><option value="en_votacion">En votación</option><option value="aprobada">Aprobada</option><option value="en_marcha">En marcha</option><option value="descartada">Descartada</option></select></div>
    <div class="field"><label for="i-o">Orden</label><select id="i-o"><option value="apoyos">Más apoyadas</option><option value="recientes">Más recientes</option></select></div>
  </div>
  <div class="rows" id="i-lista"></div><p class="muted" id="i-vacio" hidden>Todavía no hay ideas publicadas con estos filtros. ¡Sé la primera persona en proponer una!</p>
</div></section>
<section class="section alt" id="proponer"><div class="wrap formwrap">
  <div style="display:grid;gap:18px;align-content:start"><div class="head" style="margin:0"><span class="eyebrow">Propón una idea</span><h2 class="h2" data-r>Cualquiera puede proponer. Todo el mundo ve qué pasa con ella.</h2></div>
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
    <p><a class="link" href="/noticias">← Todas las noticias</a></p>
    <p class="post-meta"><span class="post-cat" id="n-cat"></span><span id="n-fecha"></span><span id="n-min"></span></p>
    <h1 class="post-title" id="n-titulo"></h1>
    <p class="post-lede" id="n-resumen" hidden></p>
    <img id="n-img" class="post-cover" alt="" hidden>
    <div class="post-body" id="n-cuerpo"></div>
    <section class="post-docs" id="n-docs" hidden><h2>Documentos</h2><div id="n-docs-l"></div></section>
    <div class="post-actions">
      <button class="act" type="button" id="n-like" aria-pressed="false" aria-label="Me gusta"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><span id="n-likes">0</span></button>
      <div class="share" id="n-share" role="group" aria-label="Compartir esta noticia"></div>
    </div>
    <p class="muted" id="n-login" hidden>Para comentar y dar me gusta, <a class="link" href="/portal">entra en el portal del afiliado</a>. ¿Aún no eres afiliado? <a class="link" href="/afiliate">Afíliate</a>.</p>
    <h2 class="post-h">Comentarios <small id="n-ncom">0</small></h2>
    <div class="rows" id="n-comentarios"></div><p class="muted" id="n-sin-com">Sé la primera persona en comentar.</p>
    <form class="form-card" id="n-form" hidden novalidate><div class="field"><label for="n-c">Tu comentario (respetuoso y sobre la noticia)</label><textarea id="n-c" rows="3" maxlength="1000" required></textarea></div><button class="btn btn-primary" type="submit">Comentar</button><p class="form-status err" role="alert"></p></form>
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

privacidad = legal('Legal', 'Política de privacidad', '''
<h2>Quién es el responsable</h2><p>[Denominación de la organización], con domicilio en [dirección] y contacto [correo de protección de datos]. Pendiente de constitución.</p>
<h2>Qué datos tratamos y para qué</h2>
<ul><li><b>Simpatizantes:</b> nombre, correo y provincia, para enviarte avisos de campañas, eventos y encuestas. Base: tu consentimiento.</li>
<li><b>Afiliados:</b> nombre, apellidos, correo, teléfono, fecha de nacimiento, DNI o NIE, código postal y provincia, para gestionar tu afiliación, emitir tu carné y permitir tu participación interna. Base: tu solicitud de afiliación y consentimiento.</li>
<li><b>Ideas y comentarios:</b> el texto que publicas y tu nombre de pila. Tu correo no se publica.</li>
<li><b>Eventos y voluntariado:</b> nombre y correo (y teléfono, si lo indicas) para gestionar tu inscripción u ofrecimiento.</li></ul>
<p>El carné no lleva foto y no pedimos copia de tu documento de identidad. El DNI o NIE se guarda cifrado.</p>
<h2>Votaciones y encuestas</h2><p>Las encuestas anónimas no guardan qué ha respondido cada persona: se registra que has participado, pero no tu respuesta. Los resultados de encuestas anónimas no se muestran hasta que hay un número mínimo de participaciones.</p>
<h2>Cuánto tiempo guardamos los datos</h2><p>Mientras mantengas la relación con la organización y, tras la baja, [plazo por definir] por obligaciones legales, tras el cual se suprimen o anonimizan.</p>
<h2>A quién se comunican</h2><p>No vendemos datos. Pueden acceder proveedores técnicos necesarios (alojamiento, correo) con contrato de encargo de tratamiento, y las autoridades cuando la ley lo exija.</p>
<h2>Tus derechos</h2><p>Acceso, rectificación, supresión, oposición, limitación y portabilidad, escribiendo a [correo de protección de datos]. Si tienes cuenta, puedes pedir la baja desde el portal. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>
<h2>Menores</h2><p>Para afiliarse hay que tener 16 años o más. [Condiciones para 16 y 17 años por definir.]</p>''')

terminos = legal('Legal', 'Términos de uso', '''
<h2>Qué es esta plataforma</h2><p>Un espacio de información, participación y gestión de afiliación de [organización]. Su nombre, siglas y lema son provisionales.</p>
<h2>Cuentas</h2><p>La afiliación es gratuita y se solicita con datos veraces. La organización puede rechazar solicitudes y suspender o dar de baja cuentas que incumplan estas condiciones o las normas de participación. Las credenciales son personales e intransferibles.</p>
<h2>El carné</h2><p>Acredita tu pertenencia a la organización. No es un documento oficial ni sustituye al documento de identidad. Se revoca al causar baja.</p>
<h2>Contenido que publicas</h2><p>Eres responsable de lo que escribes. Nos autorizas a mostrarlo en la plataforma mientras dure el debate. Podemos ocultar contenido que incumpla las normas.</p>
<h2>Donaciones</h2><p>La afiliación no tiene cuota. Las donaciones, cuando se habiliten, serán voluntarias y se regirán por la normativa aplicable. [Pendiente de asesoría jurídica.]</p>
<h2>Cambios</h2><p>Podemos actualizar estos términos y lo indicaremos en la plataforma.</p>''')

cookies = legal('Legal', 'Cookies', '''
<p>Esta plataforma usa solo <b>cookies técnicas</b>, imprescindibles para funcionar:</p>
<ul><li><b>plu_persona</b> y <b>plu_equipo</b>: mantienen tu sesión iniciada en el portal o la intranet. Caducan solas.</li><li><b>Preferencia de tema</b> (claro/oscuro), guardada en tu navegador.</li></ul>
<p>No usamos cookies de publicidad, ni de seguimiento, ni analítica de terceros. Si en el futuro se añaden, pediremos tu consentimiento antes.</p>
<p>Las tipografías se cargan desde Google Fonts, lo que puede enviar tu dirección IP a ese proveedor. [Valorar alojarlas en nuestro propio servidor antes del lanzamiento.]</p>''')

normas = legal('Participación', 'Normas de participación', '''
<p>Queremos un debate libre y útil. Para ello:</p>
<ul><li><b>Respeto:</b> discute ideas, no personas. No se admiten insultos, acoso, amenazas ni discursos de odio.</li>
<li><b>Veracidad:</b> no difundas datos que sepas falsos. Si citas cifras, indica la fuente.</li>
<li><b>Sin datos personales de terceros</b> ni contenido ilegal.</li>
<li><b>Sin spam</b> ni publicidad.</li>
<li><b>Una persona, una voz:</b> no crees cuentas múltiples ni votes por otros.</li></ul>
<h2>Qué pasa si no se cumplen</h2><p>El equipo de moderación puede ocultar un comentario o no publicar una idea, y debe indicar el motivo. Cualquier persona afiliada puede denunciar un comentario. Las decisiones de moderación quedan registradas.</p>
<h2>Cómo se decide una idea</h2><p>Recibida → revisada → debate → (opcional) votación de afiliados → decisión publicada con su motivo → seguimiento.</p>''')

faq = legal('Preguntas frecuentes', 'FAQ', '''
<h2>¿Afiliarse cuesta algo?</h2><p>No. Es gratuito.</p>
<h2>¿Quién puede afiliarse?</h2><p>Personas de 16 años o más residentes en España, con DNI o NIE.</p>
<h2>¿Cuál es la diferencia entre simpatizante y afiliado?</h2><p>Un simpatizante recibe avisos y puede participar por enlace en encuestas abiertas. Un afiliado tiene carné, accede al portal, apoya y comenta ideas y vota.</p>
<h2>¿Cuánto tarda en aprobarse mi afiliación?</h2><p>El equipo revisa las solicitudes manualmente. Te daremos acceso al portal cuando se apruebe.</p>
<h2>¿Quién puede proponer ideas?</h2><p>Cualquier persona, sin cuenta. Apoyar, comentar y votar es cosa de las personas afiliadas.</p>
<h2>¿Mi voto es secreto?</h2><p>En las votaciones y encuestas anónimas, sí: no se guarda qué has votado junto a tu identidad.</p>
<h2>¿Cómo me doy de baja?</h2><p>Desde el portal, en Solicitudes.</p>
<h2>¿Y si pierdo la contraseña?</h2><p>Escribe a la organización y te daremos una temporal. La recuperación automática llegará con el correo propio.</p>''')

contacto = legal('Contacto', 'Contacto', '''
<p>Escríbenos a [correo de contacto, pendiente de dominio propio].</p>
<p>Para temas de protección de datos: [correo de protección de datos].</p>
<p>Prensa: [correo de prensa]. Si necesitas acreditación para un acto, indícalo en el mensaje.</p>''')
