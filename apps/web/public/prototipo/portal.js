/* Portal del afiliado: carné, encuestas, solicitudes e historial. Habla con /api/portal. */
(function () {
  var app = document.getElementById('app-portal');
  if (!app) return;
  function $(id) { return document.getElementById(id); }
  var vistas = ['w-login', 'w-cambio', 'w-panel', 'w-recuperar', 'w-nueva'];
  function ver(id) { vistas.forEach(function (v) { $(v).hidden = v !== id; }); window.scrollTo({ top: 0 }); }
  var provincias = [], yo = null;
  function api(ruta, cuerpo) {
    return fetch('/api/portal' + ruta, { method: cuerpo === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || 'Error'); e.status = r.status; e.datos = d; throw e; }return d; }); },
        function () { throw new Error('No se puede conectar con el servidor.'); });
  }
  function h(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (k === 'class') e.className = attrs[k]; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]); else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]); });
    (function añadir(lista) { lista.forEach(function (c) { if (c == null || c === false) return; if (Array.isArray(c)) return añadir(c); e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); })(Array.prototype.slice.call(arguments, 2));
    return e;
  }
  function fecha(iso) { return iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : ''; }
  function msg(f, t) { f.querySelector('.form-status').textContent = t || ''; }
  var MOV = { inscripcion: 'Solicitud de afiliación', alta: 'Alta como afiliado', cambio_territorio: 'Cambio de provincia', suspension: 'Suspensión', reactivacion: 'Reactivación', baja: 'Baja', rechazo: 'Rechazo' };
  var catalogos = { situaciones: [], sectores: [] };
  var TIPOS = { cambio_datos: 'Cambio de datos', cambio_provincia: 'Cambio de provincia', baja: 'Darme de baja', duplicado_carne: 'Duplicado del carné', renovacion_carne: 'Renovar el carné', certificado: 'Certificado de afiliación', otra: 'Otra consulta' };
  var ESTSOL = { abierta: 'En espera', en_revision: 'En revisión', resuelta: 'Resuelta', rechazada: 'Rechazada' };

  $('f-login').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target; msg(f);
    api('/login', { email: $('p-c').value, password: $('p-p').value }).then(function (d) {
      if (d.cambiar_password) { $('c-a').value = $('p-p').value; $('p-p').value = ''; ver('w-cambio'); $('c-n').focus(); } else { $('p-p').value = ''; entrar(); }
    }).catch(function (err) { msg(f, err.message); });
  });
  $('f-cambio').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target; msg(f);
    api('/password', { actual: $('c-a').value, nueva: $('c-n').value }).then(function () { $('c-a').value = $('c-n').value = ''; entrar(); }).catch(function (err) { msg(f, err.message); });
  });

  // Recuperación de contraseña por correo
  var tokenRec = (new URLSearchParams(location.search)).get('recuperar');
  $('l-olvido').addEventListener('click', function (e) { e.preventDefault(); $('r-c').value = $('p-c').value; ver('w-recuperar'); $('r-c').focus(); });
  $('l-volver').addEventListener('click', function (e) { e.preventDefault(); ver('w-login'); });
  $('f-recuperar').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target; msg(f);
    var b = f.querySelector('button'); b.disabled = true;
    api('/recuperar', { email: $('r-c').value }).then(function () { msg(f, 'Si ese correo es de un afiliado, te hemos enviado un enlace. Revisa también la carpeta de spam.'); }).catch(function (err) { msg(f, err.message); }).then(function () { b.disabled = false; });
  });
  $('f-nueva').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target; msg(f);
    api('/recuperar/confirmar', { token: tokenRec, nueva: $('n-n').value }).then(function () {
      $('n-n').value = ''; history.replaceState(null, '', location.pathname); tokenRec = null; ver('w-login');
      var s = $('f-login').querySelector('.form-status'); s.classList.remove('err'); s.textContent = 'Contraseña cambiada. Ya puedes entrar con la nueva.';
    }).catch(function (err) { msg(f, err.message); });
  });
  $('w-salir').addEventListener('click', function () { api('/logout', {}).finally(function () { ver('w-login'); }); });
  document.querySelectorAll('[data-w]').forEach(function (b) { b.addEventListener('click', function () { irA(b.dataset.w); }); });

  function entrar() {
    api('/me').then(function (d) {
      if (d.cambiar_password) { ver('w-cambio'); return; }
      yo = d; $('w-nombre').textContent = 'Hola, ' + d.nombre + '.';
      $('w-estado').textContent = (d.estado === 'suspendido' ? 'Afiliación suspendida' : 'Afiliado') + ' · Nº ' + d.numero_afiliado;
      ver('w-panel');
      var inicial = (location.hash || '').replace('#', ''); irA(SECCIONES[inicial] ? inicial : 'inicio');
      fetch('/api/provincias').then(function (r) { return r.json(); }).then(function (p) { provincias = p; }).catch(function () {});
      fetch('/api/catalogos').then(function (r) { return r.json(); }).then(function (c) { catalogos = c; }).catch(function () {});
    }).catch(function () { ver('w-login'); });
  }
  var SECCIONES = { inicio: sInicio, carne: sCarne, participa: sParticipa, brujula: sBrujula, datos: sDatos, solicitudes: sSolicitudes, cuenta: sCuenta };
  function irA(s, extra) {
    if (!SECCIONES[s]) s = 'inicio';
    document.querySelectorAll('[data-w]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.w === s)); });
    var c = $('w-sec'); c.textContent = '';
    try { history.replaceState(null, '', '#' + s); } catch (e) { /* sin historial */ }
    SECCIONES[s](c, extra);
    if (extra !== 'sin-scroll') { var top = $('w-panel').getBoundingClientRect().top + window.scrollY - 90; if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }); }
  }
  function fechaHora(iso) { return iso ? new Date(iso).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }
  function vacio(t) { return h('p', { class: 'muted pt-vacio' }, t); }
  function tarjeta(titulo, hijos, extra) { return h('section', { class: 'panel pt-card' + (extra ? ' ' + extra : '') }, titulo ? h('h2', { class: 'pt-h' }, titulo) : null, hijos); }
  function carnetMini() {
    var k = yo.carne;
    return h('div', { class: 'carnet' }, h('small', null, 'PLU · Carné de afiliado'), h('strong', null, yo.nombre + ' ' + yo.apellidos), h('span', null, 'Nº ' + yo.numero_afiliado + ' · ' + yo.provincia),
      h('small', null, 'Alta ' + fecha(yo.fecha_alta) + (k ? ' · válido hasta ' + fecha(k.valido_hasta) : '')));
  }

  // ---------- Inicio ----------
  function sInicio(c) {
    var cargando = vacio('Cargando…'); c.appendChild(cargando);
    api('/resumen').then(function (r) {
      c.textContent = '';
      var tiles = h('div', { class: 'pt-tiles' });
      [['Encuestas pendientes', r.encuestas_pendientes, 'participa', r.encuestas_pendientes > 0], ['Solicitudes abiertas', r.solicitudes_abiertas, 'solicitudes', false], ['Propuestas apoyadas', r.apoyos, 'participa', false], ['Comentarios', r.comentarios, 'participa', false]].forEach(function (t) {
        tiles.appendChild(h('button', { type: 'button', class: 'pt-tile' + (t[3] ? ' hot' : ''), onclick: function () { irA(t[2]); } }, h('b', null, String(t[1])), h('span', null, t[0])));
      });
      c.appendChild(tiles);

      var g = h('div', { class: 'pt-grid' });
      // Columna principal
      var izq = h('div', { class: 'pt-col' }), der = h('div', { class: 'pt-col' });
      izq.appendChild(h('div', { class: 'pt-cta' + (r.brujula_hecha ? ' hecha' : '') },
        h('div', null, h('span', { class: 'eyebrow' }, 'Brújula PLU · opcional'),
          h('h2', { class: 'pt-h' }, r.brujula_hecha ? 'Ya conoces tu afinidad con PLU' : 'Descubre tu afinidad con las ideas de PLU'),
          h('p', { class: 'muted' }, r.brujula_hecha ? 'Puedes repetir el test cuando quieras o borrar tu resultado.' : '16 preguntas, unos 3 minutos. Compara tu posición en economía, libertades, territorio y participación. Tú decides si guardas el resultado.')),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: function () { irA('brujula'); } }, r.brujula_hecha ? 'Ver mi resultado' : 'Hacer el test')));

      var ev = tarjeta('Próximos eventos', null);
      if (!r.eventos.length) ev.appendChild(vacio('No hay eventos convocados ahora mismo.'));
      r.eventos.forEach(function (e) { ev.appendChild(filaEvento(e, function () { irA('inicio', 'sin-scroll'); })); });
      ev.appendChild(h('a', { class: 'link', href: '/eventos' }, 'Ver toda la agenda →'));
      izq.appendChild(ev);

      var pr = tarjeta('Propuestas con más apoyo', null);
      if (!r.propuestas.length) pr.appendChild(vacio('Todavía no hay propuestas publicadas.'));
      r.propuestas.forEach(function (p) { pr.appendChild(filaPropuesta(p)); });
      pr.appendChild(h('a', { class: 'link', href: '/ideas' }, 'Ver todas y proponer la tuya →'));
      izq.appendChild(pr);

      // Columna lateral
      der.appendChild(tarjeta('Tu carné', [carnetMini(), h('p', { class: 'row-btns' }, h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { irA('carne'); } }, 'Abrir carné'))]));
      var inter = tarjeta('Tus intereses', null);
      if (r.intereses.length) inter.appendChild(h('div', { class: 'pt-chips' }, r.intereses.map(function (a) { return h('span', { class: 'pt-chip' }, a); })));
      else inter.appendChild(vacio('Cuéntanos qué áreas te importan y te mostraremos lo más relevante.'));
      inter.appendChild(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { irA('brujula'); } }, r.intereses.length ? 'Cambiar' : 'Elegir áreas'));
      der.appendChild(inter);
      var no = tarjeta('Últimas noticias', null);
      if (!r.noticias.length) no.appendChild(vacio('Sin noticias todavía.'));
      r.noticias.forEach(function (n) { no.appendChild(h('a', { class: 'pt-noti', href: '/noticias?id=' + encodeURIComponent(n.id) }, h('small', { class: 'tag' }, fecha(n.fecha)), h('span', null, n.titulo))); });
      no.appendChild(h('a', { class: 'link', href: '/noticias' }, 'Todas las noticias →'));
      der.appendChild(no);
      g.appendChild(izq); g.appendChild(der); c.appendChild(g);
    }).catch(function (err) { c.textContent = ''; c.appendChild(h('p', { class: 'form-status err' }, err.message)); });
  }
  function filaEvento(e, alCambiar) {
    var st = h('span', { class: 'form-status' });
    var b = h('button', { class: 'btn btn-sm ' + (e.inscrito ? 'btn-ghost' : 'btn-primary'), type: 'button' }, e.inscrito ? 'Apuntado · cancelar' : 'Apuntarme');
    if (!e.inscrito && e.plazas_libres === 0) { b.disabled = true; b.textContent = 'Completo'; }
    b.addEventListener('click', function () {
      b.disabled = true;
      api('/eventos/' + e.id + (e.inscrito ? '/cancelar' : '/inscripcion'), {}).then(function () { alCambiar(); }).catch(function (err) { b.disabled = false; st.textContent = err.message; });
    });
    return h('div', { class: 'pt-fila' }, h('div', null, h('strong', null, e.titulo), h('small', { class: 'muted' }, fechaHora(e.inicio) + (e.lugar ? ' · ' + e.lugar : '') + (e.plazas_libres != null ? ' · ' + e.plazas_libres + ' plazas' : ''))), b, st);
  }
  function filaPropuesta(p) {
    var n = p.apoyos, b = h('button', { class: 'btn btn-sm ' + (p.apoyada ? 'btn-primary' : 'btn-ghost'), type: 'button', 'aria-pressed': String(p.apoyada) });
    function pinta() { b.textContent = (p.apoyada ? '✓ Apoyada' : 'Apoyar') + ' · ' + n; b.className = 'btn btn-sm ' + (p.apoyada ? 'btn-primary' : 'btn-ghost'); b.setAttribute('aria-pressed', String(p.apoyada)); }
    pinta();
    b.addEventListener('click', function () { b.disabled = true; api('/propuestas/' + p.id + '/apoyo', {}).then(function (r) { p.apoyada = r.apoyada; n = r.apoyos; pinta(); }).catch(function () {}).then(function () { b.disabled = false; }); });
    return h('div', { class: 'pt-fila' }, h('div', null, h('a', { class: 'pt-tit', href: '/idea?id=' + encodeURIComponent(p.id) }, p.titulo), h('small', { class: 'muted' }, p.area || 'Sin área')), b);
  }

  // ---------- Mi carné ----------
  function sCarne(c) {
    var k = yo.carne;
    if (!k || yo.estado !== 'activo') { c.appendChild(vacio('Ahora mismo no tienes un carné vigente. Si crees que es un error, escríbenos desde Solicitudes.')); return; }
    var wrap = h('div', { class: 'pt-carne' });
    wrap.appendChild(h('div', null, carnetMini()));
    wrap.appendChild(h('div', { class: 'pt-col' },
      h('p', { class: 'row-btns' }, h('a', { class: 'btn btn-primary', href: '/api/portal/carne.pdf' }, 'Descargar carné (PDF)'), h('a', { class: 'btn btn-ghost', href: '/api/portal/certificado.pdf' }, 'Certificado de afiliación (PDF)')),
      h('p', { class: 'muted' }, 'El carné lleva un QR que el equipo puede comprobar en eventos y mítines. No es un documento oficial y no sustituye al DNI.'),
      h('p', { class: 'muted' }, 'Emitido el ' + fecha(k.emitido_en) + ' · versión ' + k.version + '. ¿Lo has perdido o ha cambiado algún dato? '), 
      h('p', null, h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { irA('solicitudes', 'duplicado_carne'); } }, 'Pedir un duplicado'))));
    c.appendChild(wrap);
  }

  // ---------- Participa ----------
  function sParticipa(c) {
    var ev = tarjeta('Eventos', null), pr = tarjeta('Propuestas para apoyar', null);
    c.appendChild(h('div', { class: 'pt-grid pt-grid-2' }, h('div', { class: 'pt-col' }, sEncuestasCard(), pr), h('div', { class: 'pt-col' }, ev, tarjeta('¿Tienes una idea?', [h('p', { class: 'muted' }, 'Cualquier necesidad o propuesta cuenta. Las más apoyadas llegan más lejos.'), h('p', { class: 'row-btns' }, h('a', { class: 'btn btn-primary btn-sm', href: '/ideas' }, 'Proponer una idea'), h('a', { class: 'btn btn-ghost btn-sm', href: '/debate' }, 'Ir al debate'))]))));
    api('/eventos').then(function (es) {
      if (!es.length) ev.appendChild(vacio('No hay eventos convocados ahora mismo.'));
      es.forEach(function (e) { ev.appendChild(filaEvento(e, function () { irA('participa', 'sin-scroll'); })); });
    }).catch(function (err) { ev.appendChild(h('p', { class: 'form-status err' }, err.message)); });
    api('/resumen').then(function (r) {
      if (!r.propuestas.length) pr.appendChild(vacio('Todavía no hay propuestas publicadas.'));
      r.propuestas.forEach(function (p) { pr.appendChild(filaPropuesta(p)); });
      pr.appendChild(h('a', { class: 'link', href: '/ideas' }, 'Ver todas →'));
    }).catch(function () {});
  }
  function sEncuestasCard() { var t = tarjeta('Encuestas y votaciones', null); sEncuestas(t); return t; }

  // ---------- Brújula PLU ----------
  function sBrujula(c) {
    c.appendChild(vacio('Cargando…'));
    api('/brujula').then(function (d) {
      c.textContent = '';
      if (d.mio) { pintaResultado(c, d, { ejes: d.mio.ejes, afinidad: d.mio.afinidad, guardado: true, fecha: d.mio.fecha }); } else { pintaTest(c, d); }
    }).catch(function (err) { c.textContent = ''; c.appendChild(h('p', { class: 'form-status err' }, err.message)); });
  }
  function intereses(d, c) {
    var sel = {}; (d.intereses || []).forEach(function (a) { sel[a] = true; });
    var wrap = h('div', { class: 'pt-chips pt-chips-sel' }), st = h('p', { class: 'form-status', role: 'status' });
    d.areas.forEach(function (a) {
      var b = h('button', { type: 'button', class: 'pt-chip' + (sel[a] ? ' on' : ''), 'aria-pressed': String(!!sel[a]) }, a);
      b.addEventListener('click', function () {
        if (!sel[a] && Object.keys(sel).filter(function (k) { return sel[k]; }).length >= 6) { st.textContent = 'Elige un máximo de 6 áreas.'; return; }
        sel[a] = !sel[a]; b.classList.toggle('on', sel[a]); b.setAttribute('aria-pressed', String(sel[a])); st.textContent = '';
      });
      wrap.appendChild(b);
    });
    var guardar = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () {
      api('/intereses', { areas: Object.keys(sel).filter(function (k) { return sel[k]; }) }).then(function () { st.classList.remove('err'); st.textContent = 'Intereses guardados.'; }).catch(function (e) { st.classList.add('err'); st.textContent = e.message; });
    } }, 'Guardar intereses');
    c.appendChild(tarjeta('Tus áreas de interés', [h('p', { class: 'muted' }, 'Elige hasta 6. Nos ayuda a mostrarte lo más relevante. Puedes cambiarlas o quitarlas cuando quieras.'), wrap, h('p', { class: 'row-btns' }, guardar), st]));
  }
  function pintaTest(c, d) {
    c.appendChild(tarjeta('Brújula PLU', [
      h('p', { class: 'lede' }, 'Un test breve para ver en qué puntos coincides con las ideas de PLU y en cuáles no. No es un examen ni una etiqueta: no hay respuestas correctas.'),
      h('ul', { class: 'pt-lista' },
        h('li', null, 'Es opcional y puedes dejar preguntas sin responder.'),
        h('li', null, 'Ves el resultado sin guardar nada. Solo se guarda si tú lo decides, con tu consentimiento expreso.'),
        h('li', null, 'Las opiniones políticas son datos especialmente protegidos: el equipo solo ve estadísticas anónimas de grupos de al menos 5 personas, nunca tu resultado con tu nombre.'),
        h('li', null, 'Puedes borrar tu resultado cuando quieras.'))]));
    var respuestas = {}, ejesVistos = {}, total = d.preguntas.length;
    var progreso = h('div', { class: 'pt-prog' }, h('i')), contador = h('span', { class: 'muted' }, '0 de ' + total + ' respondidas');
    function actualiza() { var n = Object.keys(respuestas).length; progreso.firstChild.style.width = (n / total * 100) + '%'; contador.textContent = n + ' de ' + total + ' respondidas'; }
    var form = h('form', { class: 'pt-test', novalidate: true });
    var orden = ['eco', 'lib', 'ter', 'par'];
    orden.forEach(function (eje) {
      var gr = h('fieldset', { class: 'panel pt-preg-grupo' }, h('legend', null, d.ejes[eje].nombre));
      d.preguntas.filter(function (p) { return p.eje === eje; }).forEach(function (p) {
        var fila = h('div', { class: 'pt-preg', role: 'radiogroup', 'aria-labelledby': 'q' + p.id }, h('p', { id: 'q' + p.id }, p.texto));
        var op = h('div', { class: 'pt-escala' });
        d.escala.forEach(function (e) {
          var id = 'q' + p.id + '_' + e[0];
          var inp = h('input', { type: 'radio', name: 'q' + p.id, id: id, value: String(e[0]) });
          inp.addEventListener('change', function () { respuestas[p.id] = e[0]; actualiza(); });
          op.appendChild(h('label', { for: id, class: 'pt-op' }, inp, h('span', null, e[1])));
        });
        fila.appendChild(op); gr.appendChild(fila);
      });
      form.appendChild(gr);
    });
    var st = h('p', { class: 'form-status err', role: 'alert' });
    var verBtn = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Ver mi resultado');
    form.appendChild(h('div', { class: 'pt-barra' }, progreso, contador));
    form.appendChild(h('p', { class: 'row-btns' }, verBtn, h('button', { class: 'btn btn-ghost', type: 'button', onclick: function () { form.reset(); respuestas = {}; actualiza(); } }, 'Empezar de nuevo')));
    form.appendChild(st);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); st.textContent = ''; verBtn.disabled = true;
      api('/brujula', { respuestas: respuestas }).then(function (r) {
        c.textContent = ''; pintaResultado(c, d, { ejes: r.ejes, afinidad: r.afinidad, guardado: false, respuestas: respuestas });
        window.scrollTo({ top: $('w-panel').getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
      }).catch(function (err) { verBtn.disabled = false; st.textContent = err.message; });
    });
    c.appendChild(form);
    intereses(d, c);
  }
  function texto(afin) {
    if (afin >= 75) return 'Coincides con la mayoría de las ideas de partida de PLU.';
    if (afin >= 55) return 'Compartes una parte importante de las ideas de PLU y difieres en algunas.';
    if (afin >= 35) return 'Tienes puntos en común con PLU, pero también diferencias claras.';
    return 'Tu posición se aleja bastante de las ideas de partida de PLU. Tu opinión también cuenta en el debate.';
  }
  function barraEje(d, k, valor) {
    var meta = d.ejes[k], pct = function (v) { return ((v + 100) / 2) + '%'; };
    var barra = h('div', { class: 'pt-eje-barra', role: 'img', 'aria-label': meta.nombre + ': tu posición ' + valor + ' sobre 100 hacia ' + (valor < 0 ? meta.izq : meta.der) });
    var ref = h('i', { class: 'ref', title: 'Posición de partida de PLU' }), marca = h('b', { class: 'yo', title: 'Tú' });
    ref.style.left = pct(meta.referencia); marca.style.left = pct(valor);
    barra.appendChild(ref); barra.appendChild(marca);
    return h('div', { class: 'pt-eje' }, h('strong', null, meta.nombre), barra, h('div', { class: 'pt-eje-ext' }, h('span', null, meta.izq), h('span', null, meta.der)));
  }
  function pintaResultado(c, d, r) {
    var cab = h('div', { class: 'pt-res-cab' },
      h('div', { class: 'pt-afin', role: 'img', style: '--v:' + Number(r.afinidad), 'aria-label': 'Afinidad con PLU: ' + r.afinidad + ' por ciento' }, h('b', null, r.afinidad + '%'), h('small', null, 'afinidad')),
      h('div', null, h('h2', { class: 'pt-h' }, 'Tu resultado'), h('p', { class: 'lede' }, texto(r.afinidad)),
        h('p', { class: 'muted' }, 'Es una orientación sencilla, no una etiqueta. La referencia de PLU (rombo) es provisional: sus ideas están abiertas a debate.' + (r.fecha ? ' · Guardado el ' + fecha(r.fecha) : ''))));
    var ejes = h('div', { class: 'pt-ejes' });
    Object.keys(d.ejes).forEach(function (k) { if (typeof r.ejes[k] === 'number') ejes.appendChild(barraEje(d, k, r.ejes[k])); });
    ejes.appendChild(h('p', { class: 'pt-leyenda' }, h('span', null, h('b', { class: 'yo' }), ' Tú'), h('span', null, h('i', { class: 'ref' }), ' Punto de partida de PLU')));
    c.appendChild(h('section', { class: 'panel pt-card' }, cab, ejes));

    var st = h('p', { class: 'form-status', role: 'status' });
    if (r.guardado) {
      c.appendChild(tarjeta('Tu resultado está guardado', [
        h('p', { class: 'muted' }, 'Solo tú lo ves con tu nombre. El equipo solo ve estadísticas anónimas de grupos de 5 o más personas.'),
        h('p', { class: 'row-btns' },
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: function () { c.textContent = ''; pintaTest(c, Object.assign({}, d, { mio: null })); } }, 'Repetir el test'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: function () {
            if (!confirm('¿Borrar tu resultado? Dejaremos de tener este dato y el consentimiento queda retirado.')) return;
            api('/brujula/borrar', {}).then(function () { sBrujula(c); }).catch(function (e) { st.classList.add('err'); st.textContent = e.message; });
          } }, 'Borrar mi resultado')), st]));
    } else {
      var cons = h('input', { type: 'checkbox', id: 'b-cons' });
      var guardar = h('button', { class: 'btn btn-primary', type: 'button' }, 'Guardar mi resultado');
      guardar.addEventListener('click', function () {
        st.classList.add('err'); st.textContent = '';
        if (!cons.checked) { st.textContent = 'Marca la casilla para dar tu consentimiento.'; return; }
        guardar.disabled = true;
        api('/brujula', { respuestas: r.respuestas, guardar: true, consentimiento: true }).then(function () { sBrujula(c); }).catch(function (e) { guardar.disabled = false; st.textContent = e.message; });
      });
      c.appendChild(tarjeta('¿Quieres guardar el resultado?', [
        h('p', { class: 'muted' }, 'No hace falta. Si lo guardas, podrás verlo cuando quieras y PLU podrá hacer estadísticas anónimas (nunca individuales) para conocer mejor a la comunidad.'),
        h('label', { class: 'consent', for: 'b-cons' }, cons, h('span', null, 'Doy mi consentimiento expreso para que PLU guarde mi resultado de la Brújula, que refleja opiniones políticas (datos de categoría especial). Puedo retirarlo en cualquier momento y se borrará.')),
        h('p', { class: 'row-btns' }, guardar, h('button', { class: 'btn btn-ghost', type: 'button', onclick: function () { sBrujula(c); } }, 'No guardar y volver')), st]));
    }
    intereses(d, c);
  }

  // ---------- Mis datos ----------
  function sDatos(c) {
    var ficha = h('dl', { class: 'ficha-dl pt-dl' });
    [['Nombre', yo.nombre + ' ' + yo.apellidos], ['Correo', yo.email], ['Teléfono', yo.telefono || '—'], ['Dirección', [yo.direccion, yo.codigo_postal, yo.poblacion].filter(Boolean).join(', ') || '—'], ['Provincia', yo.provincia || '—'], ['Ocupación', yo.ocupacion || '—'], ['Nº de afiliado', yo.numero_afiliado], ['Alta', fecha(yo.fecha_alta)]]
      .forEach(function (f) { ficha.appendChild(h('dt', null, f[0])); ficha.appendChild(h('dd', null, f[1])); });
    c.appendChild(h('div', { class: 'pt-grid pt-grid-2' },
      h('div', { class: 'pt-col' }, tarjeta('Tus datos', [ficha, h('p', { class: 'muted' }, 'Tu documento de identidad se guarda cifrado y no se muestra. Para cambiar cualquier dato, haz una solicitud: el equipo la revisa.'), h('p', { class: 'row-btns' }, h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { irA('solicitudes', 'cambio_datos'); } }, 'Pedir un cambio'))]), tarjeta('Historial de tu afiliación', histo())),
      h('div', { class: 'pt-col' }, avisosCard(), tarjeta('Tus datos son tuyos', [h('p', { class: 'muted' }, 'Descarga una copia de todo lo que PLU guarda sobre ti (perfil, consentimientos, actividad…) en formato JSON.'), h('p', { class: 'row-btns' }, h('a', { class: 'btn btn-ghost btn-sm', href: '/api/portal/mis-datos.json' }, 'Descargar mis datos')), h('p', { class: 'muted' }, 'Puedes pedir la rectificación, la limitación o la supresión de tus datos desde Solicitudes o en la página de ', h('a', { class: 'link', href: '/privacidad' }, 'privacidad'), '.')]))));
  }
  function histo() {
    if (!yo.historial.length) return vacio('Sin movimientos.');
    var ul = h('ul', { class: 'hist' });
    yo.historial.forEach(function (m) { ul.appendChild(h('li', null, h('strong', null, MOV[m.tipo] || m.tipo), h('span', { class: 'muted' }, ' · ' + fecha(m.fecha) + (m.motivo ? ' · ' + m.motivo : '')))); });
    return ul;
  }
  function avisosCard() {
    var box = tarjeta('Avisos por correo', null), st = h('p', { class: 'form-status', role: 'status' });
    var cb = h('input', { type: 'checkbox', id: 'pref-avisos', disabled: true });
    box.appendChild(h('label', { class: 'consent', for: 'pref-avisos' }, cb, h('span', null, 'Quiero recibir novedades, convocatorias y encuestas de PLU por correo.')));
    box.appendChild(st);
    api('/resumen').then(function (r) { cb.checked = r.avisos; cb.disabled = false; }).catch(function () {});
    cb.addEventListener('change', function () { cb.disabled = true; api('/preferencias', { avisos: cb.checked }).then(function () { st.classList.remove('err'); st.textContent = cb.checked ? 'Recibirás los avisos.' : 'No recibirás avisos.'; }).catch(function (e) { cb.checked = !cb.checked; st.classList.add('err'); st.textContent = e.message; }).then(function () { cb.disabled = false; }); });
    return box;
  }

  // ---------- Cuenta ----------
  function sCuenta(c) {
    var pw = h('form', { novalidate: true }, h('div', { class: 'field' }, h('label', { for: 'x-a' }, 'Contraseña actual'), h('input', { id: 'x-a', type: 'password', autocomplete: 'current-password' })),
      h('div', { class: 'field' }, h('label', { for: 'x-n' }, 'Nueva (mín. 10 caracteres)'), h('input', { id: 'x-n', type: 'password', autocomplete: 'new-password', minlength: '10' })),
      h('button', { class: 'btn btn-primary', type: 'submit' }, 'Cambiar contraseña'), h('p', { class: 'form-status', role: 'status' }));
    pw.addEventListener('submit', function (e) { e.preventDefault(); var s = pw.querySelector('.form-status'); s.classList.add('err'); s.textContent = ''; api('/password', { actual: $('x-a').value, nueva: $('x-n').value }).then(function () { $('x-a').value = $('x-n').value = ''; s.classList.remove('err'); s.textContent = 'Contraseña cambiada. Hemos cerrado tus otras sesiones.'; }).catch(function (err) { s.textContent = err.message; }); });
    var st = h('p', { class: 'form-status', role: 'status' });
    c.appendChild(h('div', { class: 'pt-grid pt-grid-2' },
      h('div', { class: 'pt-col' }, tarjeta('Cambiar contraseña', pw)),
      h('div', { class: 'pt-col' },
        tarjeta('Sesiones', [h('p', { class: 'muted' }, 'Si has entrado desde un dispositivo que no es tuyo, ciérralo desde aquí.'), h('p', { class: 'row-btns' },
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { api('/sesiones/cerrar-otras', {}).then(function (r) { st.textContent = r.cerradas ? 'Sesiones cerradas: ' + r.cerradas + '.' : 'No había otras sesiones abiertas.'; }).catch(function (e) { st.textContent = e.message; }); } }, 'Cerrar mis otras sesiones'),
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { $('w-salir').click(); } }, 'Cerrar esta sesión')), st]),
        tarjeta('Darme de baja', [h('p', { class: 'muted' }, 'Puedes dejar PLU cuando quieras. Lo gestiona el equipo para borrar o conservar solo lo que la ley exige.'), h('p', null, h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { irA('solicitudes', 'baja'); } }, 'Solicitar la baja'))]))));
  }

  // ---------- Solicitudes ----------
  function sSolicitudes(c, tipoInicial) {
    var form = h('form', { class: 'panel pt-card', novalidate: true });
    var tipo = h('select', { id: 's-t' }, Object.keys(TIPOS).map(function (k) { return h('option', { value: k }, TIPOS[k]); }));
    if (tipoInicial && TIPOS[tipoInicial]) tipo.value = tipoInicial;
    var prov = h('select', { id: 's-p' }, [h('option', { value: '' }, 'Elige provincia…')].concat(provincias.map(function (p) { return h('option', { value: p.id }, p.nombre); })));
    var provCampo = h('div', { class: 'field', hidden: true }, h('label', { for: 's-p' }, 'Nueva provincia'), prov);
    var CAMPOS = [['direccion', 'Dirección', 'text'], ['poblacion', 'Municipio', 'text'], ['codigo_postal', 'Código postal', 'text'], ['telefono', 'Teléfono', 'tel'], ['ocupacion', 'Ocupación o profesión', 'text']];
    var datosCampo = h('div', { class: 'datos-cambio', hidden: true }), refs = {};
    CAMPOS.forEach(function (k) { refs[k[0]] = h('input', { id: 'd-' + k[0], type: k[2], value: yo[k[0]] || '', maxlength: '160' }); datosCampo.appendChild(h('div', { class: 'field' }, h('label', { for: 'd-' + k[0] }, k[1]), refs[k[0]])); });
    function lista2(id, etiqueta, opciones, actual) {
      var s = h('select', { id: id }, [h('option', { value: '' }, 'Sin indicar')].concat(opciones.map(function (o) { return h('option', { value: o[0] }, o[1]); }))); s.value = actual || '';
      datosCampo.appendChild(h('div', { class: 'field' }, h('label', { for: id }, etiqueta), s)); return s;
    }
    refs.situacion_laboral = lista2('d-situacion', 'Situación laboral', catalogos.situaciones, yo.situacion_laboral);
    refs.sector = lista2('d-sector', 'Sector', catalogos.sectores, yo.sector);
    datosCampo.appendChild(h('p', { class: 'muted' }, 'Cambia solo lo que haya cambiado. El equipo lo revisará y lo actualizará.'));
    var aviso = h('p', { class: 'muted pt-aviso', hidden: true });
    function cambia() {
      provCampo.hidden = tipo.value !== 'cambio_provincia'; datosCampo.hidden = tipo.value !== 'cambio_datos';
      aviso.hidden = tipo.value !== 'baja'; aviso.textContent = tipo.value === 'baja' ? 'Al darte de baja se cierra tu acceso al portal. El equipo confirmará la gestión.' : '';
    }
    tipo.addEventListener('change', cambia); cambia();
    var det = h('textarea', { id: 's-d', rows: '3', maxlength: '800' });
    form.appendChild(h('h2', { class: 'pt-h' }, 'Nueva solicitud'));
    form.appendChild(h('div', { class: 'field' }, h('label', { for: 's-t' }, 'Qué necesitas'), tipo)); form.appendChild(provCampo); form.appendChild(datosCampo); form.appendChild(aviso);
    form.appendChild(h('div', { class: 'field' }, h('label', { for: 's-d' }, 'Detalles (opcional)'), det));
    form.appendChild(h('button', { class: 'btn btn-primary', type: 'submit' }, 'Enviar')); form.appendChild(h('p', { class: 'form-status', role: 'status' }));
    var lista = h('div', { class: 'rows' });
    function cargar() {
      lista.textContent = '';
      api('/solicitudes').then(function (s) {
        if (!s.length) lista.appendChild(vacio('Todavía no has hecho ninguna solicitud.'));
        s.forEach(function (x) { lista.appendChild(h('div', { class: 'audit-row' }, h('span', { class: 'tag' }, fecha(x.creada_en)), h('strong', null, TIPOS[x.tipo] || x.tipo), h('span', { class: 'pt-est ' + x.estado }, ESTSOL[x.estado] || x.estado), x.resolucion ? h('span', { class: 'muted' }, x.resolucion) : null)); });
      }).catch(function () {});
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var s = form.querySelector('.form-status'); s.classList.add('err'); s.textContent = '';
      var cuerpo = { tipo: tipo.value, detalle: det.value, provincia_id: prov.value || undefined };
      if (tipo.value === 'cambio_datos') {
        var cambios = {}; Object.keys(refs).forEach(function (k) { var v = refs[k].value.trim(); if (v !== String(yo[k] || '')) cambios[k] = v; });
        if (Object.keys(cambios).length) cuerpo.cambios = cambios;
      }
      api('/solicitudes', cuerpo).then(function () { det.value = ''; s.classList.remove('err'); s.textContent = 'Solicitud enviada. El equipo la revisará.'; cargar(); }).catch(function (err) { s.textContent = err.message; });
    });
    c.appendChild(h('div', { class: 'pt-grid pt-grid-2' }, h('div', { class: 'pt-col' }, form), h('div', { class: 'pt-col' }, tarjeta('Tus solicitudes', lista))));
    cargar();
  }

  // ---------- Encuestas (se pintan dentro de una tarjeta) ----------
  function sEncuestas(c) {
    var lista = h('div', { class: 'rows' }); c.appendChild(lista);
    api('/encuestas').then(function (es) {
      if (!es.length) lista.appendChild(vacio('No hay encuestas abiertas ahora mismo.'));
      es.forEach(function (e) {
        var d = h('details', { class: 'rowitem' }), cuerpo = h('div', { class: 'body' });
        d.appendChild(h('summary', { class: 'noimg' }, h('span', { class: 'icoc' }, '?'), h('div', null, h('span', { class: 'tag' }, (e.respondida ? 'Respondida' : 'Pendiente') + (e.cierra_en ? ' · cierra ' + fecha(e.cierra_en) : '')), h('h3', null, e.titulo), e.descripcion ? h('p', { class: 's' }, e.descripcion) : null), h('span', { class: 'chev' }, '›')));
        d.appendChild(cuerpo);
        var hecho = false;
        d.addEventListener('toggle', function () {
          if (!d.open || hecho) return; hecho = true;
          if (e.respondida) { cuerpo.appendChild(h('p', { class: 'muted' }, 'Ya has participado. Gracias.')); return; }
          api('/encuestas/' + e.id).then(function (q) {
            cuerpo.appendChild(h('p', { class: 'muted' }, q.anonima ? 'Anónima: no guardamos qué has respondido junto a tu nombre.' : 'Tus respuestas quedan asociadas a ti.'));
            var zona = h('div', { style: 'display:grid;gap:22px' }), st = h('p', { class: 'form-status err' });
            var leer = window.PLUEncuesta.pintar(zona, q);
            var b = h('button', { class: 'btn btn-primary', type: 'button', onclick: function () {
              b.disabled = true;
              api('/encuestas/' + e.id + '/responder', { respuestas: leer() }).then(function () { cuerpo.textContent = ''; cuerpo.appendChild(h('p', { class: 'lede' }, 'Gracias por participar.')); })
                .catch(function (err) { b.disabled = false; st.textContent = err.message; });
            } }, 'Enviar respuestas');
            cuerpo.appendChild(zona); cuerpo.appendChild(b); cuerpo.appendChild(st);
          }).catch(function (err) { cuerpo.textContent = err.message; });
        });
        lista.appendChild(d);
      });
    }).catch(function (err) { c.appendChild(h('p', { class: 'form-status err' }, err.message)); });
  }

  if (tokenRec) ver('w-nueva'); else entrar();
})();
