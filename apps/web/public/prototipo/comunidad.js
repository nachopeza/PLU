/* Páginas públicas de participación: ideas, ficha de idea, votaciones, agenda, noticias y cifras de transparencia. */
(function () {
  function $(id) { return document.getElementById(id); }
  function h(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (k === 'class') e.className = attrs[k]; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]); else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]); });
    (function add(l) { l.forEach(function (c) { if (c == null || c === false) return; if (Array.isArray(c)) return add(c); e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); }); })(Array.prototype.slice.call(arguments, 2));
    return e;
  }
  function api(ruta, cuerpo, metodo) {
    return fetch('/api' + ruta, { method: metodo || (cuerpo === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || 'Error'); e.status = r.status; throw e; } return d; }); },
        function () { throw new Error('No se puede conectar con el servidor.'); });
  }
  function fecha(iso, hora) { if (!iso) return ''; var o = { day: 'numeric', month: 'long', year: 'numeric' }; if (hora) { o.hour = '2-digit'; o.minute = '2-digit'; } return new Date(iso).toLocaleString('es-ES', o); }
  var ESTADOS = { en_estudio: 'En estudio', en_debate: 'En debate', en_votacion: 'En votación', aprobada: 'Aprobada', descartada: 'Descartada', en_marcha: 'En marcha', recibida: 'Recibida' };
  function compartir(titulo, url) {
    if (navigator.share) { navigator.share({ title: titulo, url: url }).catch(function () {}); return; }
    try { navigator.clipboard.writeText(url); alert('Enlace copiado'); } catch (e) { window.prompt('Copia el enlace:', url); }
  }
  function vacioError(cont, err) { cont.appendChild(h('p', { class: 'form-status err' }, err.message)); }
  var parametros = new URLSearchParams(location.search);

  // ---------- Portada: contadores y propuestas más apoyadas ----------
  if ($('home-contadores')) {
    api('/transparencia').then(function (d) {
      var c = $('home-contadores');
      [['Necesidades y propuestas recogidas', d.necesidades_recogidas], ['Estudiadas y publicadas', d.propuestas_publicas], ['Aprobadas o en marcha', d.propuestas_aprobadas], ['Personas afiliadas', d.afiliados]].forEach(function (x) { c.appendChild(h('div', { class: 'counter' }, h('b', null, String(x[1])), h('span', null, x[0]))); });
    }).catch(function () { $('home-contadores').hidden = true; });
    api('/propuestas?limite=5').then(function (l) {
      var c = $('home-ideas');
      if (!l.length) { c.appendChild(h('p', { class: 'muted' }, 'Aquí aparecerán las propuestas que la gente vaya apoyando. Sé la primera persona en contar qué necesitas.')); return; }
      l.forEach(function (x) { c.appendChild(h('a', { class: 'rowitem', href: 'idea.html?id=' + x.id, style: 'text-decoration:none;color:inherit' }, h('div', { style: 'display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 16px' }, h('span', { class: 'icoc' }, String(x.apoyos)), h('div', null, h('span', { style: 'font:500 .72rem var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--accent)' }, (ESTADOS[x.estado] || x.estado) + (x.provincia ? ' · ' + x.provincia : '')), h('h3', { style: 'font-size:1.1rem' }, x.titulo)), h('span', { class: 'chev', style: 'color:var(--accent)' }, '›')))); });
    }).catch(function () { $('home-ideas').closest('section').hidden = true; });
  }

  // ---------- Transparencia en cifras ----------
  if ($('t-datos')) {
    api('/transparencia').then(function (d) {
      var c = $('t-datos');
      [['Afiliados activos', d.afiliados], ['Simpatizantes', d.simpatizantes], ['Ideas publicadas', d.propuestas_publicas], ['Ideas aprobadas o en marcha', d.propuestas_aprobadas], ['Votaciones cerradas', d.consultas_cerradas], ['Actos celebrados', d.eventos_realizados], ['Personas voluntarias', d.voluntarios]].forEach(function (x) {
        c.appendChild(h('div', { class: 'counter' }, h('b', null, String(x[1])), h('span', null, x[0])));
      });
      $('t-fecha').textContent = 'Actualizado: ' + fecha(d.actualizado, true);
    }).catch(function () { var s = $('t-datos').closest('section'); if (s) s.hidden = true; });
  }

  // ---------- Listado de ideas ----------
  if ($('i-lista')) {
    var espera;
    var cargar = function () {
      var p = new URLSearchParams(); [['q', 'i-q'], ['area', 'i-a'], ['estado', 'i-e'], ['orden', 'i-o']].forEach(function (x) { if ($(x[1]).value) p.set(x[0], $(x[1]).value); });
      api('/propuestas?' + p).then(function (lista) {
        var c = $('i-lista'); c.textContent = ''; $('i-vacio').hidden = lista.length > 0;
        lista.forEach(function (x) {
          c.appendChild(h('a', { class: 'rowitem', href: 'idea.html?id=' + x.id, style: 'text-decoration:none;color:inherit' },
            h('div', { class: 'summary-like', style: 'display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 16px' },
              h('span', { class: 'icoc' }, String(x.apoyos)),
              h('div', null, h('span', { class: 'tag', style: 'font:500 .72rem var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--accent)' }, (x.tipo === 'necesidad' ? 'Necesidad · ' : '') + (ESTADOS[x.estado] || x.estado) + (x.provincia ? ' · ' + x.provincia : (x.area ? ' · ' + x.area : ''))), h('h3', { style: 'font-size:1.1rem' }, x.titulo), h('p', { class: 'muted', style: 'font-size:.92rem' }, 'Por ' + x.autor + ' · ' + x.comentarios + ' comentarios · ' + x.apoyos + (x.apoyos === 1 ? ' apoyo' : ' apoyos'))),
              h('span', { class: 'chev', style: 'color:var(--accent)' }, '›'))));
        });
      }).catch(function (e) { vacioError($('i-lista'), e); });
    };
    ['i-q', 'i-a', 'i-e', 'i-o'].forEach(function (id) { $(id).addEventListener('input', function () { clearTimeout(espera); espera = setTimeout(cargar, 250); }); });
    cargar();
  }

  // ---------- Ficha de idea ----------
  if ($('app-idea')) {
    var id = parametros.get('id'), logueado = false, apoyada = false;
    if (!id) { $('d-titulo').textContent = 'Idea no encontrada'; return; }
    var pintarApoyo = function (n) { $('d-contador').textContent = n + (n === 1 ? ' apoyo' : ' apoyos'); $('d-apoyo').textContent = apoyada ? 'Quitar mi apoyo' : 'Apoyar esta idea'; $('d-apoyo').className = 'btn ' + (apoyada ? 'btn-ghost' : 'btn-primary'); };
    var cargarIdea = function () {
      api('/propuestas/' + encodeURIComponent(id)).then(function (p) {
        document.title = p.titulo + ' · PLU';
        $('d-estado').textContent = ESTADOS[p.estado] || p.estado; $('d-titulo').textContent = p.titulo; $('d-meta').textContent = (p.tipo === 'necesidad' ? 'Necesidad recogida' : 'Por ' + p.autor) + ' · ' + fecha(p.creada_en) + (p.provincia ? ' · ' + p.provincia : '') + (p.area ? ' · ' + p.area : '');
        $('d-texto').textContent = p.texto; pintarApoyo(p.apoyos);
        if (p.votacion_id) { $('d-votacion').hidden = false; $('d-votacion-a').href = 'consultas.html?id=' + p.votacion_id; }
        var hist = $('d-historial'); hist.textContent = '';
        p.historial.forEach(function (x) { hist.appendChild(h('li', null, h('strong', null, ESTADOS[x.estado] || x.estado), h('span', { class: 'muted' }, ' · ' + fecha(x.fecha) + (x.nota ? ' · ' + x.nota : '')))); });
        if (!p.historial.length) hist.appendChild(h('li', { class: 'muted' }, 'Sin movimientos todavía.'));
        var cc = $('d-comentarios'); cc.textContent = ''; $('d-sin-com').hidden = p.comentarios_lista.length > 0;
        p.comentarios_lista.forEach(function (c) {
          var fila = h('div', { class: 'audit-row' }, h('strong', null, c.autor), h('span', { class: 'muted' }, fecha(c.creado_en)), h('span', { style: 'flex-basis:100%;white-space:pre-wrap' }, c.texto));
          if (logueado) fila.appendChild(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function (ev) { api('/portal/comentarios/' + c.id + '/denunciar', {}).then(function () { ev.target.textContent = 'Denunciado'; ev.target.disabled = true; }); } }, 'Denunciar'));
          cc.appendChild(fila);
        });
        $('d-form').hidden = !(logueado && ['en_estudio', 'en_debate', 'en_votacion'].indexOf(p.estado) >= 0);
      }).catch(function (e) { $('d-titulo').textContent = 'Idea no encontrada'; $('d-meta').textContent = e.message; });
    };
    api('/portal/propuestas/' + encodeURIComponent(id) + '/mio').then(function (m) { logueado = true; apoyada = m.apoyada; $('d-apoyo').hidden = false; }).catch(function () { $('d-login').hidden = false; }).then(cargarIdea);
    $('d-apoyo').addEventListener('click', function () { api('/portal/propuestas/' + encodeURIComponent(id) + '/apoyo', {}).then(function (r) { apoyada = r.apoyada; pintarApoyo(r.apoyos); }).catch(function (e) { alert(e.message); }); });
    $('d-compartir').addEventListener('click', function () { compartir($('d-titulo').textContent, location.href); });
    $('d-form').addEventListener('submit', function (e) {
      e.preventDefault(); var st = e.target.querySelector('.form-status'); st.textContent = '';
      api('/portal/propuestas/' + encodeURIComponent(id) + '/comentarios', { texto: $('d-c').value }).then(function () { $('d-c').value = ''; cargarIdea(); }).catch(function (er) { st.textContent = er.message; });
    });
  }

  // ---------- Votaciones y consultas ----------
  if ($('app-consultas')) {
    var cid = parametros.get('id');
    if (cid) {
      $('c-lista').hidden = true; $('c-detalle').hidden = false;
      api('/consultas/' + encodeURIComponent(cid)).then(function (r) {
        var c = $('c-cuerpo');
        c.appendChild(h('span', { class: 'eyebrow' }, (r.tipo === 'votacion' ? 'Votación' : 'Consulta') + (r.vinculante ? ' · vinculante' : ' · consultiva')));
        c.appendChild(h('h1', { class: 'h2' }, r.titulo)); if (r.descripcion) c.appendChild(h('p', { class: 'lede' }, r.descripcion));
        if (r.resultados_pendientes) { c.appendChild(h('p', { class: 'secret' }, r.estado === 'abierta' ? 'Esta consulta está abierta. Las personas afiliadas pueden participar desde el portal' + (r.cierra_en ? ' hasta el ' + fecha(r.cierra_en) : '') + '. Los resultados se publicarán al cerrar.' : 'Los resultados de esta consulta no son públicos.')); c.appendChild(h('p', null, h('a', { class: 'btn btn-primary', href: 'portal.html' }, 'Ir al portal'))); return; }
        c.appendChild(h('p', { class: 'muted' }, r.participaciones + ' participaciones' + (r.quorum ? ' · quórum ' + r.quorum + (r.quorum_alcanzado ? ' alcanzado' : ' NO alcanzado') : '')));
        if (r.ocultos) { c.appendChild(h('p', { class: 'secret' }, r.aviso)); return; }
        r.resultados.forEach(function (q) {
          var caja = h('div', { class: 'res-q' }, h('strong', null, q.texto));
          if (q.tipo === 'texto') { var ul = h('ul', { class: 'res-texto' }); q.respuestas.forEach(function (t) { ul.appendChild(h('li', null, t)); }); caja.appendChild(ul); }
          else {
            var total = Math.max(1, Object.keys(q.cuenta).reduce(function (s, k) { return s + q.cuenta[k]; }, 0));
            Object.keys(q.cuenta).forEach(function (k) { var pc = Math.round(q.cuenta[k] * 100 / total); caja.appendChild(h('div', { class: 'barra' }, h('span', null, k), h('div', { class: 'barra-fondo' }, h('i', { style: 'width:' + pc + '%' })), h('b', null, q.cuenta[k] + ' · ' + pc + '%'))); });
            if (q.media) caja.appendChild(h('p', { class: 'muted' }, 'Media: ' + q.media));
          }
          c.appendChild(caja);
        });
      }).catch(function (e) { $('c-cuerpo').appendChild(h('p', { class: 'form-status err' }, e.message)); });
    } else {
      api('/consultas').then(function (lista) {
        var c = $('c-lista'); if (!lista.length) { c.appendChild(h('p', { class: 'muted' }, 'Todavía no hay votaciones ni consultas públicas.')); return; }
        var rows = h('div', { class: 'rows' }); c.appendChild(rows);
        lista.forEach(function (x) {
          rows.appendChild(h('a', { class: 'rowitem', href: 'consultas.html?id=' + x.id, style: 'text-decoration:none;color:inherit' }, h('div', { style: 'padding:14px 18px;display:grid;gap:4px' },
            h('span', { style: 'font:500 .72rem var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--accent)' }, (x.estado === 'abierta' ? 'Abierta' : 'Cerrada') + ' · ' + (x.vinculante ? 'vinculante' : 'consultiva')), h('h3', { style: 'font-size:1.1rem' }, x.titulo), x.descripcion ? h('p', { class: 'muted' }, x.descripcion) : null)));
        });
      }).catch(function (e) { vacioError($('c-lista'), e); });
    }
  }

  // ---------- Agenda ----------
  if ($('app-eventos')) {
    api('/eventos').then(function (lista) {
      $('e-vacio').hidden = lista.length > 0; var c = $('e-lista');
      lista.forEach(function (e) {
        var pasado = new Date(e.inicio) < new Date(), cancelado = e.estado === 'cancelado';
        var d = h('details', { class: 'rowitem' }), cuerpo = h('div', { class: 'body' });
        d.appendChild(h('summary', { class: 'noimg' }, h('span', { class: 'icoc' }, String(new Date(e.inicio).getDate())), h('div', null, h('span', { class: 'tag' }, fecha(e.inicio, true) + (e.lugar ? ' · ' + e.lugar : '') + (cancelado ? ' · CANCELADO' : pasado ? ' · celebrado' : '')), h('h3', null, e.titulo)), h('span', { class: 'chev' }, '›')));
        if (e.descripcion) cuerpo.appendChild(h('p', { style: 'white-space:pre-wrap' }, e.descripcion));
        if (!pasado && !cancelado) {
          if (e.con_aforo) cuerpo.appendChild(h('p', { class: 'muted' }, e.plazas_libres > 0 ? 'Plazas libres: ' + e.plazas_libres : 'Aforo completo'));
          if (!e.con_aforo || e.plazas_libres > 0) {
            var f = h('form', { novalidate: true }, h('div', { class: 'field-pair' }, h('div', { class: 'field' }, h('label', { for: 'en' + e.id }, 'Nombre'), h('input', { id: 'en' + e.id, required: true, maxlength: '80' })), h('div', { class: 'field' }, h('label', { for: 'ee' + e.id }, 'Correo'), h('input', { id: 'ee' + e.id, type: 'email', required: true }))),
              h('label', { class: 'consent' }, h('input', { type: 'checkbox', id: 'ea' + e.id }), h('span', null, 'Acepto que PLU use estos datos para gestionar mi asistencia. ', h('a', { class: 'link', href: 'privacidad.html' }, 'Privacidad'))),
              h('button', { class: 'btn btn-primary btn-sm', type: 'submit' }, 'Apuntarme'), h('p', { class: 'form-status', role: 'status' }));
            f.addEventListener('submit', function (ev) {
              ev.preventDefault(); var st = f.querySelector('.form-status'); st.style.color = '';
              api('/eventos/' + e.id + '/inscripcion', { nombre: $('en' + e.id).value, email: $('ee' + e.id).value, acepta: $('ea' + e.id).checked }).then(function (r) { st.textContent = r.mensaje; }).catch(function (er) { st.style.color = '#ff8a80'; st.textContent = er.message; });
            });
            cuerpo.appendChild(f);
          }
        }
        d.appendChild(cuerpo); c.appendChild(d);
      });
    }).catch(function (e) { vacioError($('e-lista'), e); });
  }

  // ---------- Noticias (blog) ----------
  if ($('app-noticias')) {
    var CATS = ['Noticia', 'Nota de prensa', 'Comunicado', 'Opinión', 'Evento'];
    var nid = parametros.get('id');
    var tam = function (b) { return b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; };
    // Texto → elementos: "## " título, "- " lista, **negrita**, [texto](https://…) y enlaces sueltos; sin HTML libre
    var inline = function (t) {
      var f = document.createDocumentFragment(), re = /(\*\*[^*]+\*\*|\[[^\]]+\]\((?:https?:\/\/|\/)[^\s)]+\)|https?:\/\/[^\s<]+)/g, i = 0, m;
      var enlace = function (url, txt) { return url.charAt(0) === '/' ? h('a', { href: url, class: 'link' }, txt) : h('a', { href: url, target: '_blank', rel: 'noopener noreferrer nofollow', class: 'link' }, txt); };
      while ((m = re.exec(t))) {
        if (m.index > i) f.appendChild(document.createTextNode(t.slice(i, m.index)));
        var x = m[0];
        if (x.indexOf('**') === 0) f.appendChild(h('strong', null, x.slice(2, -2)));
        else if (x.charAt(0) === '[') { var q = /^\[([^\]]+)\]\((.+)\)$/.exec(x); f.appendChild(enlace(q[2], q[1])); }
        else f.appendChild(enlace(x, x));
        i = m.index + x.length;
      }
      if (i < t.length) f.appendChild(document.createTextNode(t.slice(i)));
      return f;
    };
    var cuerpoHtml = function (texto, cont) {
      texto.split(/\n{2,}/).forEach(function (b) {
        b = b.trim(); if (!b) return;
        if (/^###\s/.test(b)) cont.appendChild(h('h3', null, b.replace(/^###\s+/, '')));
        else if (/^##\s/.test(b)) cont.appendChild(h('h2', null, b.replace(/^##\s+/, '')));
        else if (/^>\s/.test(b)) cont.appendChild(h('blockquote', null, inline(b.replace(/^>\s?/gm, ''))));
        else if (b.split('\n').every(function (l) { return /^[-•]\s/.test(l.trim()); })) { var ul = h('ul'); b.split('\n').forEach(function (l) { ul.appendChild(h('li', null, inline(l.trim().replace(/^[-•]\s+/, '')))); }); cont.appendChild(ul); }
        else { var p = h('p'); b.split('\n').forEach(function (l, k) { if (k) p.appendChild(h('br')); p.appendChild(inline(l)); }); cont.appendChild(p); }
      });
    };
    var etiqueta = function (n) { return h('span', { class: 'post-cat' }, n.categoria || 'Noticia'); };
    var tarjeta = function (n, grande) {
      var meta = [fecha(n.fecha)]; if (n.minutos) meta.push(n.minutos + ' min de lectura');
      var pie = []; if (n.documentos) pie.push(n.documentos + (n.documentos === 1 ? ' documento adjunto' : ' documentos adjuntos')); if (n.comentarios) pie.push(n.comentarios + (n.comentarios === 1 ? ' comentario' : ' comentarios'));
      return h('a', { class: 'bcard' + (grande ? ' grande' : '') + (n.imagen ? '' : ' sin-img'), href: '/noticias?id=' + n.id },
        n.imagen ? h('span', { class: 'bcard-img' }, h('img', { src: n.imagen, alt: '', loading: 'lazy' })) : null,
        h('span', { class: 'bcard-t' }, etiqueta(n), h('span', { class: 'bcard-fecha' }, meta.join(' · ')), h('h3', null, n.titulo), n.resumen ? h('p', null, n.resumen) : null, pie.length ? h('span', { class: 'bcard-pie' }, pie.join(' · ')) : null));
    };
    if (nid) {
      $('n-listado').hidden = true;
      var logueadoN = false, likeN = false, canon = location.origin + '/noticias?id=' + encodeURIComponent(nid);
      var pintarLike = function (t) { $('n-likes').textContent = t; $('n-like').setAttribute('aria-pressed', String(likeN)); };
      var cargarNoticia = function () {
        api('/noticias/' + encodeURIComponent(nid)).then(function (n) {
          $('n-detalle').hidden = false; document.title = n.titulo + ' · PLU';
          $('n-cat').textContent = n.categoria || 'Noticia'; document.body.classList.add('articulo');
          $('n-fecha').textContent = fecha(n.fecha); $('n-min').textContent = n.minutos + ' min de lectura';
          $('n-ncom').textContent = String(n.comentarios_lista.length);
          $('n-titulo').textContent = n.titulo; if (n.resumen) { $('n-resumen').hidden = false; $('n-resumen').textContent = n.resumen; }
          if (n.imagen) { $('n-img').src = n.imagen; $('n-img').hidden = false; }
          var c = $('n-cuerpo'); c.textContent = ''; cuerpoHtml(n.cuerpo, c);
          var dl = $('n-docs-l'); dl.textContent = ''; $('n-docs').hidden = !n.adjuntos.length;
          n.adjuntos.forEach(function (d) {
            dl.appendChild(h('div', { class: 'doc' }, h('span', { class: 'doc-ic', 'aria-hidden': 'true' }, 'PDF'), h('span', { class: 'doc-n' }, h('strong', null, d.nombre), h('small', null, tam(d.bytes))),
              h('a', { class: 'doc-a', href: d.url, target: '_blank', rel: 'noopener' }, 'Ver'), h('a', { class: 'doc-a fuerte', href: d.url, download: d.nombre.replace(/[^\w.\- ]+/g, '') + '.pdf' }, 'Descargar')));
          });
          pintarLike(n.me_gusta); $('n-ncom').textContent = n.comentarios_lista.length; $('n-sin-com').hidden = n.comentarios_lista.length > 0;
          var cc = $('n-comentarios'); cc.textContent = '';
          n.comentarios_lista.forEach(function (x) { cc.appendChild(h('div', { class: 'audit-row' }, h('strong', null, x.autor), h('span', { class: 'muted' }, fecha(x.creado_en)), h('span', { style: 'flex-basis:100%;white-space:pre-wrap' }, x.texto))); });
          $('n-form').hidden = !logueadoN; $('n-login').hidden = logueadoN;
          var mas = $('n-mas'); mas.textContent = ''; $('n-mas-t').hidden = !n.mas.length; n.mas.forEach(function (m) { mas.appendChild(tarjeta(m)); });
          // Compartir: iconos discretos; en el móvil, el menú nativo del sistema
          var sh = $('n-share'); if (!sh.firstChild) {
            var u = encodeURIComponent(canon), t = encodeURIComponent(n.titulo);
            var ico = function (d, relleno) { var sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('viewBox', '0 0 24 24'); sv.setAttribute('aria-hidden', 'true'); if (relleno) sv.setAttribute('class', 'rel'); d.forEach(function (x) { var pa = document.createElementNS('http://www.w3.org/2000/svg', 'path'); pa.setAttribute('d', x); sv.appendChild(pa); }); return sv; };
            var G = {
              compartir: [['M12 3v12', 'M8 7l4-4 4 4', 'M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7'], false],
              enlace: [['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'], false],
              correo: [['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M22 6l-10 7L2 6'], false],
              whatsapp: [['M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z'], true],
              x: [['M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'], true],
              facebook: [['M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z'], true],
              linkedin: [['M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'], true],
              telegram: [['M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z'], true]
            };
            var boton = function (clave, nombre, extra) { var g = G[clave], e = h('a', Object.assign({ class: 'ib', 'aria-label': nombre, title: nombre }, extra)); e.appendChild(ico(g[0], g[1])); return e; };
            if (navigator.share) {
              var nat = h('button', { class: 'ib ib-main', type: 'button', 'aria-label': 'Compartir', title: 'Compartir', onclick: function () { navigator.share({ title: n.titulo, url: canon }).catch(function () {}); } }); nat.appendChild(ico(G.compartir[0], false)); sh.appendChild(nat);
            }
            sh.appendChild(boton('whatsapp', 'WhatsApp', { href: 'https://wa.me/?text=' + t + '%20' + u, target: '_blank', rel: 'noopener noreferrer' }));
            if (!navigator.share) {
              sh.appendChild(boton('x', 'X', { href: 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u, target: '_blank', rel: 'noopener noreferrer' }));
              sh.appendChild(boton('facebook', 'Facebook', { href: 'https://www.facebook.com/sharer/sharer.php?u=' + u, target: '_blank', rel: 'noopener noreferrer' }));
              sh.appendChild(boton('linkedin', 'LinkedIn', { href: 'https://www.linkedin.com/sharing/share-offsite/?url=' + u, target: '_blank', rel: 'noopener noreferrer' }));
              sh.appendChild(boton('telegram', 'Telegram', { href: 'https://t.me/share/url?url=' + u + '&text=' + t, target: '_blank', rel: 'noopener noreferrer' }));
              sh.appendChild(boton('correo', 'Correo', { href: 'mailto:?subject=' + t + '&body=' + u }));
            }
            var cb = h('button', { class: 'ib', type: 'button', 'aria-label': 'Copiar enlace', title: 'Copiar enlace', onclick: function () { var ok = function () { cb.classList.add('hecho'); cb.title = 'Enlace copiado'; setTimeout(function () { cb.classList.remove('hecho'); }, 1800); }; try { navigator.clipboard.writeText(canon).then(ok); } catch (e) { window.prompt('Copia el enlace:', canon); } } });
            cb.appendChild(ico(G.enlace[0], false)); sh.appendChild(cb);
          }
        }).catch(function (e) { $('n-listado').hidden = false; $('n-filtros').hidden = true; vacioError($('n-lista'), e); });
      };
      api('/portal/noticias/' + encodeURIComponent(nid) + '/mio').then(function (m) { logueadoN = true; likeN = m.me_gusta; }).catch(function () {}).then(cargarNoticia);
      $('n-like').addEventListener('click', function () {
        if (!logueadoN) { $('n-login').hidden = false; $('n-login').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
        api('/portal/noticias/' + encodeURIComponent(nid) + '/megusta', {}).then(function (r) { likeN = r.me_gusta; pintarLike(r.total); }).catch(function (e) { alert(e.message); });
      });
      $('n-form').addEventListener('submit', function (e) {
        e.preventDefault(); var st = e.target.querySelector('.form-status'); st.textContent = '';
        api('/portal/noticias/' + encodeURIComponent(nid) + '/comentarios', { texto: $('n-c').value }).then(function () { $('n-c').value = ''; cargarNoticia(); }).catch(function (er) { st.textContent = er.message; });
      });
    } else {
      var cat = parametros.get('categoria') || '';
      var filtros = $('n-filtros');
      [''].concat(CATS).forEach(function (c) {
        filtros.appendChild(h('a', { class: 'tab', href: c ? '/noticias?categoria=' + encodeURIComponent(c) : '/noticias', 'aria-pressed': String(c === cat) }, c || 'Todas'));
      });
      api('/noticias' + (cat ? '?categoria=' + encodeURIComponent(cat) : '')).then(function (l) {
        $('n-vacio').hidden = l.length > 0;
        l.forEach(function (n, i) { (i === 0 && !cat ? $('n-destacada') : $('n-lista')).appendChild(tarjeta(n, i === 0 && !cat)); });
      }).catch(function (e) { vacioError($('n-lista'), e); });
    }
  }
})();
