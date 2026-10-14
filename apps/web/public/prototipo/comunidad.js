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
      var f = document.createDocumentFragment(), re = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<]+)/g, i = 0, m;
      var enlace = function (url, txt) { return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer nofollow', class: 'link' }, txt); };
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
    var etiqueta = function (n) { return h('span', { class: 'post-cat' + (n.categoria === 'Nota de prensa' || n.categoria === 'Comunicado' ? ' oficial' : '') }, n.categoria || 'Noticia'); };
    var tarjeta = function (n, grande) {
      var meta = [fecha(n.fecha)]; if (n.minutos) meta.push(n.minutos + ' min de lectura');
      var pie = []; if (n.comentarios) pie.push('💬 ' + n.comentarios); if (n.me_gusta) pie.push('♥ ' + n.me_gusta); if (n.documentos) pie.push('📎 ' + n.documentos + (n.documentos === 1 ? ' documento' : ' documentos'));
      return h('a', { class: 'bcard' + (grande ? ' grande' : '') + (n.imagen ? '' : ' sin-img'), href: '/noticias?id=' + n.id },
        n.imagen ? h('span', { class: 'bcard-img' }, h('img', { src: n.imagen, alt: '', loading: 'lazy' })) : null,
        h('span', { class: 'bcard-t' }, etiqueta(n), h('span', { class: 'bcard-fecha' }, meta.join(' · ')), h('h3', null, n.titulo), n.resumen ? h('p', null, n.resumen) : null, pie.length ? h('span', { class: 'bcard-pie' }, pie.join('   ')) : null));
    };
    if (nid) {
      $('n-listado').hidden = true;
      var logueadoN = false, likeN = false, canon = location.origin + '/noticias?id=' + encodeURIComponent(nid);
      var pintarLike = function (t) { $('n-likes').textContent = t; $('n-like').setAttribute('aria-pressed', String(likeN)); };
      var cargarNoticia = function () {
        api('/noticias/' + encodeURIComponent(nid)).then(function (n) {
          $('n-detalle').hidden = false; document.title = n.titulo + ' · PLU';
          $('n-cat').textContent = n.categoria || 'Noticia'; if (n.categoria === 'Nota de prensa' || n.categoria === 'Comunicado') $('n-cat').classList.add('oficial');
          $('n-fecha').textContent = fecha(n.fecha); $('n-min').textContent = n.minutos + ' min de lectura';
          $('n-titulo').textContent = n.titulo; if (n.resumen) { $('n-resumen').hidden = false; $('n-resumen').textContent = n.resumen; }
          if (n.imagen) { $('n-img').src = n.imagen; $('n-img').hidden = false; }
          var c = $('n-cuerpo'); c.textContent = ''; cuerpoHtml(n.cuerpo, c);
          var dl = $('n-docs-l'); dl.textContent = ''; $('n-docs').hidden = !n.adjuntos.length;
          n.adjuntos.forEach(function (d) {
            dl.appendChild(h('div', { class: 'doc' }, h('span', { class: 'doc-ic', 'aria-hidden': 'true' }, 'PDF'), h('span', { class: 'doc-n' }, h('strong', null, d.nombre), h('small', null, tam(d.bytes))),
              h('a', { class: 'btn btn-ghost btn-sm', href: d.url, target: '_blank', rel: 'noopener' }, 'Ver'), h('a', { class: 'btn btn-primary btn-sm', href: d.url, download: d.nombre.replace(/[^\w.\- ]+/g, '') + '.pdf' }, 'Descargar')));
          });
          pintarLike(n.me_gusta); $('n-ncom').textContent = n.comentarios_lista.length; $('n-sin-com').hidden = n.comentarios_lista.length > 0;
          var cc = $('n-comentarios'); cc.textContent = '';
          n.comentarios_lista.forEach(function (x) { cc.appendChild(h('div', { class: 'audit-row' }, h('strong', null, x.autor), h('span', { class: 'muted' }, fecha(x.creado_en)), h('span', { style: 'flex-basis:100%;white-space:pre-wrap' }, x.texto))); });
          $('n-form').hidden = !logueadoN; $('n-login').hidden = logueadoN;
          var mas = $('n-mas'); mas.textContent = ''; $('n-mas-t').hidden = !n.mas.length; n.mas.forEach(function (m) { mas.appendChild(tarjeta(m)); });
          // Compartir
          var sh = $('n-share'); if (!sh.firstChild) {
            var u = encodeURIComponent(canon), t = encodeURIComponent(n.titulo), redes = [['WhatsApp', 'https://wa.me/?text=' + t + '%20' + u], ['X', 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u], ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + u], ['LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + u], ['Telegram', 'https://t.me/share/url?url=' + u + '&text=' + t], ['Correo', 'mailto:?subject=' + t + '&body=' + u]];
            sh.appendChild(h('span', { class: 'share-t' }, 'Compartir'));
            if (navigator.share) sh.appendChild(h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: function () { navigator.share({ title: n.titulo, url: canon }).catch(function () {}); } }, 'Compartir…'));
            redes.forEach(function (r) { sh.appendChild(h('a', { class: 'btn btn-ghost btn-sm', href: r[1], target: '_blank', rel: 'noopener noreferrer' }, r[0])); });
            var cb = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { try { navigator.clipboard.writeText(canon).then(function () { cb.textContent = 'Enlace copiado ✓'; }); } catch (e) { window.prompt('Copia el enlace:', canon); } } }, 'Copiar enlace');
            sh.appendChild(cb);
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
        filtros.appendChild(h('a', { class: 'fbtn', href: c ? '/noticias?categoria=' + encodeURIComponent(c) : '/noticias', 'aria-pressed': String(c === cat) }, c || 'Todas'));
      });
      api('/noticias' + (cat ? '?categoria=' + encodeURIComponent(cat) : '')).then(function (l) {
        $('n-vacio').hidden = l.length > 0;
        l.forEach(function (n, i) { (i === 0 && !cat ? $('n-destacada') : $('n-lista')).appendChild(tarjeta(n, i === 0 && !cat)); });
      }).catch(function (e) { vacioError($('n-lista'), e); });
    }
  }
})();
