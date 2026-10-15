/* Intranet de PLU: acceso con doble verificación y gestión por secciones según el rol. Habla con /api/intranet. */
(function () {
  var app = document.getElementById('app-intranet');
  if (!app) return;
  function $(id) { return document.getElementById(id); }
  var vistas = ['v-login', 'v-cambio', 'v-codigo', 'v-config', 'v-recuperacion', 'v-panel'];
  function ver(id) { vistas.forEach(function (v) { $(v).hidden = v !== id; }); window.scrollTo({ top: 0 }); }
  var ticket = null, usuario = null, provincias = null;

  // ---------- Utilidades ----------
  var ultimoCorreo = null, ultimoMotivo = null;
  function arriba() { try { window.scrollTo(0, 0); } catch (e) {} }
  function api(ruta, cuerpo, metodo) {
    return fetch('/api/intranet' + ruta, {
      method: metodo || (cuerpo === undefined ? 'GET' : 'POST'),
      headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: cuerpo === undefined ? (metodo && metodo !== 'GET' ? '{}' : undefined) : JSON.stringify(cuerpo)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || 'Error'); e.status = r.status; e.datos = d; throw e; } ultimoCorreo = d.correo || null; ultimoMotivo = d.correo_motivo || null; if ((metodo || (cuerpo === undefined ? 'GET' : 'POST')) !== 'GET') arriba(); return d; });
    }, function () { throw new Error('No se puede conectar con la API. Arranca el servidor (npm run dev) y abre http://localhost:8787/intranet'); });
  }
  function msg(form, texto) { form.querySelector('.form-status').textContent = texto || ''; }
  // h('div', {class:'x', onclick:fn}, hijo1, 'texto', ...)
  function h(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (function añadir(lista) {
      lista.forEach(function (c) {
        if (c == null || c === false) return;
        if (Array.isArray(c)) return añadir(c);
        e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
      });
    })(Array.prototype.slice.call(arguments, 2));
    return e;
  }
  function limpiar(n) { n.textContent = ''; return n; }
  function fecha(iso) { return iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; }
  function fechaHora(iso) { return iso ? new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }
  function campo(id, etiqueta, attrs, tipo) {
    var control = tipo === 'textarea' ? h('textarea', Object.assign({ id: id }, attrs)) : h('input', Object.assign({ id: id }, attrs));
    return h('div', { class: 'field' }, h('label', { for: id }, etiqueta), control);
  }
  function selectProvincias(id, etiqueta, conTodas) {
    var s = h('select', { id: id }); if (conTodas) s.appendChild(h('option', { value: '' }, conTodas));
    (provincias || []).forEach(function (p) { s.appendChild(h('option', { value: p.id }, p.nombre)); });
    return h('div', { class: 'field' }, h('label', { for: id }, etiqueta), s);
  }
  var catalogos = { situaciones: [], sectores: [] };
  function cargarProvincias() {
    if (provincias) return Promise.resolve();
    fetch('/api/catalogos').then(function (r) { return r.json(); }).then(function (c) { catalogos = c; }).catch(function () { /* sin listas */ });
    return fetch('/api/provincias').then(function (r) { return r.json(); }).then(function (d) { provincias = d; }).catch(function () { provincias = []; });
  }
  function etiquetaDe(lista, v) { var x = (lista || []).filter(function (o) { return o[0] === v; })[0]; return x ? x[1] : (v || '—'); }
  // Caja para datos que se muestran UNA sola vez (contraseñas temporales, enlaces)
  function secreto(titulo, texto, ayuda) {
    var area = h('textarea', { class: 'secret-area', readonly: true, rows: Math.min(8, texto.split('\n').length + 1) }); area.value = texto;
    var copiar = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { area.select(); try { navigator.clipboard.writeText(texto); copiar.textContent = 'Copiado'; } catch (e) { document.execCommand('copy'); } } }, 'Copiar');
    var nota = ultimoCorreo === 'enviado' ? 'Se ha enviado también por correo a la persona.' : (ultimoCorreo === 'no enviado' ? 'El correo no se ha podido enviar' + (ultimoMotivo ? ' (' + ultimoMotivo + ')' : '') + ': entrégale tú la contraseña.' : null); ultimoCorreo = null; ultimoMotivo = null;
    return h('div', { class: 'secret' }, h('strong', null, titulo), ayuda ? h('p', { class: 'muted' }, ayuda) : null, nota ? h('p', { class: 'muted' }, nota) : null, area, copiar);
  }
  // Resultado del último aviso por correo a la persona (tras duplicado, baja, cambio de provincia…)
  function avisoCorreo() {
    var c = ultimoCorreo, m = ultimoMotivo; ultimoCorreo = ultimoMotivo = null;
    if (!c) return null;
    return h('p', { class: 'chip-correo ' + (c === 'enviado' ? 'ok' : 'aviso') }, c === 'enviado' ? '✉ Se ha avisado a la persona por correo.' : '✉ No se ha podido avisar por correo' + (m ? ' (' + m + ')' : '') + '. Avísale tú.');
  }
  function fila(titulo, sub, etiqueta, onAbrir) {
    var d = h('details', { class: 'rowitem' }), cuerpo = h('div', { class: 'body' });
    var t = h('div', null, etiqueta ? h('span', { class: 'tag' }, etiqueta) : null, h('h3', null, titulo), sub ? h('p', { class: 's' }, sub) : null);
    d.appendChild(h('summary', { class: 'noimg' }, h('span', { class: 'icoc' }, (titulo[0] || '?').toUpperCase()), t, h('span', { class: 'chev' }, '›')));
    d.appendChild(cuerpo);
    var hecho = false;
    d.addEventListener('toggle', function () { if (d.open && !hecho) { hecho = true; onAbrir(cuerpo, d); } });
    return d;
  }
  function filtros(opciones, actual, onCambio) {
    var g = h('div', { class: 'filters', role: 'group' });
    opciones.forEach(function (o) {
      var b = h('button', { class: 'fbtn', type: 'button', 'aria-pressed': String(o[0] === actual), onclick: function () {
        Array.prototype.forEach.call(g.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); onCambio(o[0]);
      } }, o[1]);
      g.appendChild(b);
    });
    return g;
  }
  function errorSeccion(cont, err) {
    if (err.status === 401) { ver('v-login'); return; }
    cont.appendChild(h('p', { class: 'form-status err' }, err.message));
  }
  function confirmar(texto) { return window.confirm(texto); }

  var ROLES = { admin: 'Administración', gestor: 'Gestión', moderador: 'Moderación y contenido', coordinador: 'Coordinación provincial', verificador: 'Verificación', tesoreria: 'Tesorería', auditor: 'Auditoría' };
  var ESTADOS = { pendiente: 'Pendiente', activo: 'Activo', suspendido: 'Suspendido', baja: 'Baja', rechazado: 'Rechazado' };
  var MOV = { inscripcion: 'Inscripción', alta: 'Alta', cambio_tipo: 'Cambio de tipo', cambio_territorio: 'Cambio de provincia', suspension: 'Suspensión', reactivacion: 'Reactivación', baja: 'Baja', rechazo: 'Rechazo' };
  var TIPOS_SOL = { cambio_datos: 'Cambio de datos', cambio_provincia: 'Cambio de provincia', baja: 'Baja', duplicado_carne: 'Duplicado de carné', renovacion_carne: 'Renovación de carné', certificado: 'Certificado', otra: 'Otra' };

  // ---------- Acceso ----------
  $('f-login').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target; msg(f);
    api('/login', { usuario: $('i-u').value, password: $('i-p').value }).then(function (d) { ticket = d.ticket; $('i-p').value = ''; return siguientePaso(d.paso); })
      .catch(function (err) { msg(f, err.message); });
  });
  function siguientePaso(paso) {
    if (paso === 'cambiar_password') { ver('v-cambio'); $('i-n').focus(); return; }
    if (paso === 'configurar') {
      return api('/2fa/preparar', { ticket: ticket }).then(function (c) { $('qr').src = c.qr; $('secreto').textContent = c.secreto; ver('v-config'); $('i-k2').focus(); });
    }
    ver('v-codigo'); $('i-k').focus();
  }
  $('f-cambio').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target; msg(f);
    api('/cambiar-password', { ticket: ticket, nueva: $('i-n').value }).then(function (d) { ticket = d.ticket; $('i-n').value = ''; return siguientePaso(d.paso); })
      .catch(function (err) { msg(f, err.message); });
  });
  $('f-codigo').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target; msg(f);
    api('/2fa/verificar', { ticket: ticket, codigo: $('i-k').value }).then(function (d) { $('i-k').value = ''; abrirPanel(d.usuario); })
      .catch(function (err) { msg(f, err.message); if (err.status === 401 && /caducado/.test(err.message)) ver('v-login'); });
  });
  $('f-config').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target; msg(f);
    api('/2fa/activar', { ticket: ticket, codigo: $('i-k2').value }).then(function (d) {
      usuario = d.usuario; $('i-k2').value = '';
      var ul = limpiar($('codigos')); d.codigos_recuperacion.forEach(function (c) { ul.appendChild(h('li', { class: 'chip' }, c)); });
      ver('v-recuperacion');
    }).catch(function (err) { msg(f, err.message); });
  });
  $('b-recuperacion').addEventListener('click', function () { limpiar($('codigos')); abrirPanel(usuario); });
  document.querySelectorAll('[data-volver]').forEach(function (b) { b.addEventListener('click', function () { ver('v-login'); }); });
  $('b-salir').addEventListener('click', function () { try { localStorage.removeItem('plu_editor'); } catch (e) { /* nada */ } api('/logout', {}).finally(function () { usuario = null; ver('v-login'); }); });

  // ---------- Panel y secciones por rol ----------
  // [id, título, roles, grupo]
  var GRUPOS = ['Afiliación', 'Participación', 'Web', 'Carné', 'Sistema'];
  var SECCIONES = [
    ['panel', 'Resumen', ['admin', 'gestor', 'coordinador', 'moderador', 'auditor', 'verificador'], -1],
    ['personas', 'Personas e inscripciones', ['admin', 'gestor', 'coordinador'], 0],
    ['solicitudes', 'Solicitudes', ['admin', 'gestor', 'coordinador'], 0],
    ['propuestas', 'Ideas', ['admin', 'moderador', 'auditor'], 1],
    ['donaciones', 'Donaciones', ['admin', 'gestor', 'auditor'], 0],
    ['legales', 'Textos legales', ['admin', 'moderador', 'auditor'], 2],
    ['brujula', 'Brújula (estadísticas)', ['admin', 'gestor', 'coordinador', 'auditor'], 1],
    ['encuestas', 'Encuestas y votaciones', ['admin', 'moderador', 'auditor'], 1],
    ['eventos', 'Agenda', ['admin', 'moderador', 'gestor'], 1],
    ['voluntarios', 'Voluntariado', ['admin', 'moderador', 'gestor'], 1],
    ['contenido', 'Contenido web', ['moderador'], 2],
    ['noticias', 'Noticias y blog', ['admin', 'moderador'], 2],
    ['verificar', 'Verificar carné', ['admin', 'gestor', 'verificador'], 3],
    ['carne', 'Plantilla del carné', ['admin', 'gestor'], 3],
    ['equipo', 'Equipo', ['admin'], 4],
    ['auditoria', 'Registro de auditoría', ['admin', 'auditor'], 4]
  ];
  var VISTAS = { panel: sResumen, donaciones: sDonaciones, legales: sLegales, brujula: sBrujula, contenido: sContenido, propuestas: sPropuestas, eventos: sEventos, noticias: sNoticias, voluntarios: sVoluntarios, resumen: sResumen, inscripciones: sInscripciones, personas: sPersonas, solicitudes: sSolicitudes, encuestas: sEncuestas, verificar: sVerificar, carne: sCarne, equipo: sEquipo, auditoria: sAuditoria };
  var detenerCamara = function () {};

  function abrirPanel(u) {
    usuario = u; try { localStorage.setItem('plu_editor', u.rol === 'moderador' ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
    var rolTxt = ROLES[u.rol] || u.rol; $('p-nombre').textContent = u.nombre;
    // Si el nombre ya es el nombre del rol (p. ej. "Administración") no se repite
    $('p-rol').textContent = String(u.nombre).trim().toLowerCase() === String(rolTxt).toLowerCase() ? '' : rolTxt;
    var tabs = limpiar($('p-tabs'));
    // En móvil el menú es un desplegable con el nombre de la sección actual (sin deslizar)
    var viejo = $('p-menu-btn'); if (viejo) viejo.remove();
    var mb = h('button', { id: 'p-menu-btn', class: 'ip-menu-btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'p-tabs' }, h('span', { id: 'p-menu-t' }, 'Menú'), h('span', { class: 'ip-n ip-dot', id: 'p-menu-n', hidden: true }), h('span', { class: 'ip-menu-chev', 'aria-hidden': 'true' }, '▾'));
    mb.addEventListener('click', function () { var ab = tabs.classList.toggle('abierto'); mb.setAttribute('aria-expanded', String(ab)); });
    tabs.parentNode.insertBefore(mb, tabs);
    var propias = SECCIONES.filter(function (s) { return s[2].indexOf(u.rol) >= 0; });
    [-1].concat(GRUPOS.map(function (_g, k) { return k; })).forEach(function (gi) {
      var g = gi < 0 ? '' : GRUPOS[gi], items = propias.filter(function (s) { return s[3] === gi; });
      if (!items.length) return;
      var lista = h('div', { class: 'ip-grupo' }, g ? h('span', { class: 'ip-grupo-t' }, g) : null);
      items.forEach(function (s) { lista.appendChild(h('button', { class: 'ip-btn', type: 'button', 'data-s': s[0], 'aria-pressed': 'false', onclick: function () { irA(s[0]); } }, h('span', { class: 'ip-btn-t' }, s[1]), (s[0] === 'personas' || s[0] === 'solicitudes') ? h('span', { class: 'ip-n', 'data-n': s[0], hidden: true, 'aria-live': 'polite' }) : null)); });
      tabs.appendChild(lista);
    });
    // Si venimos de la web para editar, volvemos a la página que se estaba editando
    var volver = new URLSearchParams(location.search).get('volver');
    if (volver && /^[a-z0-9-]+\.html\?editar=1$/.test(volver) && u.rol === 'moderador') { location.replace(volver); return; }
    ver('v-panel');
    avisos(); if (!avisosTimer) avisosTimer = setInterval(avisos, 45000);
    cargarProvincias().then(function () {
      var codigo = new URLSearchParams(location.search).get('v'); // viene del QR de un carné
      if (codigo && propias.some(function (s) { return s[0] === 'verificar'; })) irA('verificar', codigo);
      else if (propias.length) irA(propias[0][0]);
      else limpiar($('sec')).appendChild(h('p', { class: 'muted' }, 'Tu rol todavía no tiene secciones disponibles.'));
    });
  }
  // Indicadores del menú: inscripciones pendientes (personas nuevas) y solicitudes abiertas
  var avisosTimer = null, avisosPrev = { personas: 0, solicitudes: 0 };
  function avisos() {
    if (!usuario || ['admin', 'gestor', 'coordinador'].indexOf(usuario.rol) < 0 || !$('p-tabs')) return;
    Promise.all([api('/resumen'), api('/solicitudes?estado=abierta')]).then(function (r) {
      var n = { personas: (r[0].afiliados && r[0].afiliados.pendiente) || 0, solicitudes: (r[1] || []).length };
      Array.prototype.forEach.call(document.querySelectorAll('.ip-n[data-n]'), function (el) {
        var k = el.getAttribute('data-n'), v = n[k];
        el.hidden = !v; el.textContent = v > 99 ? '99+' : String(v);
        el.setAttribute('aria-label', v + (k === 'personas' ? (v === 1 ? ' inscripción pendiente' : ' inscripciones pendientes') : (v === 1 ? ' solicitud abierta' : ' solicitudes abiertas')));
        if (v > avisosPrev[k]) { el.classList.remove('nuevo'); void el.offsetWidth; el.classList.add('nuevo'); }
      });
      avisosPrev = n;
      var dot = $('p-menu-n'); if (dot) dot.hidden = !(n.personas + n.solicitudes);
      document.title = (n.personas + n.solicitudes ? '(' + (n.personas + n.solicitudes) + ') ' : '') + 'Intranet PLU';
    }).catch(function () { /* los indicadores son opcionales */ });
  }
  function irA(id, arg) {
    detenerCamara();
    var sec = SECCIONES.filter(function (s) { return s[0] === id; })[0];
    Array.prototype.forEach.call($('p-tabs').querySelectorAll('.ip-btn'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.s === id)); if (b.dataset.s === id && b.scrollIntoView) { try { b.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* sin scroll */ } } });
    $('p-titulo').textContent = sec ? sec[1] : '';
    var mt = $('p-menu-t'); if (mt) mt.textContent = sec ? sec[1] : 'Menú';
    $('p-tabs').classList.remove('abierto'); var mbb = $('p-menu-btn'); if (mbb) mbb.setAttribute('aria-expanded', 'false');
    var cont = limpiar($('sec')); VISTAS[id](cont, arg);
    avisos();
  }

  // --- Resumen: pendientes, evolución y actividad reciente (cada rol ve lo suyo) ---
  function sResumen(c) {
    var caja = h('div', { class: 'dash' }); c.appendChild(caja);
    api('/panel').then(function (r) {
      var tarj = h('div', { class: 'counters' });
      function t(n, etiqueta, destino, urgente) {
        var el = h(destino ? 'button' : 'div', { class: 'counter' + (urgente && n ? ' counter-hot' : ''), type: destino ? 'button' : undefined, onclick: destino ? function () { irA(destino); } : undefined }, h('b', null, String(n)), h('span', null, etiqueta));
        tarj.appendChild(el);
      }
      if (r.afiliados) { t(r.afiliados.pendiente || 0, 'Inscripciones pendientes', 'personas', true); t(r.solicitudes_abiertas || 0, 'Solicitudes abiertas', 'solicitudes', true); t(r.afiliados.activo || 0, 'Afiliados activos', 'personas'); }
      if (r.propuestas_nuevas !== undefined) { t(r.propuestas_nuevas, 'Ideas por revisar', 'propuestas', true); t(r.denuncias_abiertas, 'Comentarios denunciados', 'propuestas', true); }
      if (r.voluntarios_nuevos !== undefined) t(r.voluntarios_nuevos, 'Voluntarios nuevos', 'voluntarios', true);
      if (r.donaciones) t(r.donaciones.pendientes, 'Donaciones por confirmar', 'donaciones', true);
      if (tarj.children.length) caja.appendChild(tarj);
      var cols = h('div', { class: 'dash-cols' }); caja.appendChild(cols);
      if (r.altas_semanas) {
        var max = Math.max.apply(null, r.altas_semanas.concat([1]));
        var barras = h('div', { class: 'dash-bars', role: 'img', 'aria-label': 'Altas por semana, últimas 8 semanas: ' + r.altas_semanas.join(', ') });
        r.altas_semanas.forEach(function (n, i) { barras.appendChild(h('div', { class: 'dash-bar' }, h('i', { style: 'height:' + Math.max(4, n / max * 100) + '%' }), h('small', null, String(n)), h('small', { class: 'muted' }, i === 7 ? 'Esta' : '-' + (7 - i) + 's'))); });
        cols.appendChild(h('div', { class: 'panel', style: 'min-height:0;gap:12px' }, h('h3', { style: 'font-size:1.1rem' }, 'Altas por semana'), barras));
      }
      if (r.provincias && r.provincias.length) {
        var pm = r.provincias[0].n, lp = h('div', { style: 'display:grid;gap:8px' });
        r.provincias.forEach(function (p) { lp.appendChild(h('div', { class: 'dash-hbar' }, h('span', null, p.nombre), h('i', { style: 'width:' + (p.n / pm * 100) + '%' }), h('b', null, String(p.n)))); });
        cols.appendChild(h('div', { class: 'panel', style: 'min-height:0;gap:12px' }, h('h3', { style: 'font-size:1.1rem' }, 'Afiliados activos por provincia'), lp));
      }
      if (r.donaciones) caja.appendChild(h('p', { class: 'muted' }, 'Donaciones confirmadas: ' + r.donaciones.confirmadas_eur.toLocaleString('es-ES') + ' € · pendientes de confirmar: ' + r.donaciones.pendientes_eur.toLocaleString('es-ES') + ' €.'));
      if (r.actividad) {
        var act = h('div', { class: 'rows' });
        if (!r.actividad.length) act.appendChild(h('p', { class: 'muted' }, 'Sin actividad todavía.'));
        r.actividad.forEach(function (a) { act.appendChild(h('div', { class: 'audit-row' }, h('span', { class: 'tag' }, fechaHora(a.fecha)), h('span', null, '@' + (a.username || 'sistema')), h('strong', null, a.accion), h('span', { class: 'muted' }, a.entidad))); });
        caja.appendChild(h('div', { class: 'panel', style: 'min-height:0;gap:12px' }, h('h3', { style: 'font-size:1.1rem' }, 'Actividad reciente del equipo'), act));
      }
      if (!caja.children.length) caja.appendChild(h('p', { class: 'muted' }, 'Elige una sección del menú para empezar.'));
    }).catch(function (e) { errorSeccion(c, e); });
    c.appendChild(h('p', { class: 'proto-note' }, 'Al aprobar una afiliación, la contraseña temporal se envía por correo a la persona. Si el envío falla, aquí verás la contraseña una sola vez para entregársela tú.'));
  }

  // --- Inscripciones ---
  function sInscripciones(c) {
    var estado = 'pendiente', lista = h('div', { class: 'rows' }), vacio = h('p', { class: 'muted', hidden: true }, 'No hay solicitudes en este estado.');
    c.appendChild(filtros([['pendiente', 'Pendientes'], ['activo', 'Aprobadas'], ['rechazado', 'Rechazadas']], estado, function (v) { estado = v; cargar(); }));
    c.appendChild(lista); c.appendChild(vacio);
    function cargar() {
      limpiar(lista);
      api('/inscripciones?estado=' + estado).then(function (filas) {
        vacio.hidden = filas.length > 0;
        filas.forEach(function (p) {
          lista.appendChild(fila(p.nombre + ' ' + p.apellidos, p.email, p.provincia + ' · ' + fecha(p.creado_en) + (p.numero_afiliado ? ' · Nº ' + p.numero_afiliado : ''), function (body) { fichaInscripcion(p, body, cargar); }));
        });
      }).catch(function (e) { errorSeccion(c, e); });
    }
    cargar();
  }
  function datosFicha(f) {
    var dl = h('dl', { class: 'ficha-dl' });
    [['Documento', (f.documento_tipo || '') + ' ' + (f.documento || '')], ['Nacimiento', f.fecha_nacimiento || '—'], ['Correo', f.email], ['Teléfono', f.telefono || '—'],
      ['Dirección', f.direccion || '—'], ['Municipio', f.poblacion || '—'], ['Provincia', (f.provincia || '') + (f.codigo_postal ? ' (' + f.codigo_postal + ')' : '')],
      ['Ocupación', f.ocupacion || '—'], ['Situación laboral', etiquetaDe(catalogos.situaciones, f.situacion_laboral)], ['Sector', etiquetaDe(catalogos.sectores, f.sector)], ['Estado', ESTADOS[f.estado] || f.estado]].forEach(function (x) {
      dl.appendChild(h('div', null, h('dt', null, x[0]), h('dd', null, x[1])));
    });
    return dl;
  }
  function fichaInscripcion(p, body, recargar) {
    api('/inscripciones/' + p.id).then(function (f) {
      limpiar(body).appendChild(datosFicha(f));
      if (f.estado !== 'pendiente') return;
      var st = h('p', { class: 'form-status err' }), salida = h('div');
      var ok = h('button', { class: 'btn btn-primary btn-sm', type: 'button' }, 'Aprobar'), no = h('button', { class: 'btn btn-ghost btn-sm', type: 'button' }, 'Rechazar');
      body.appendChild(h('div', { class: 'row-btns' }, ok, no)); body.appendChild(st); body.appendChild(salida);
      ok.addEventListener('click', function () {
        ok.disabled = no.disabled = true; ok.textContent = 'Aprobando…'; ok.classList.add('cargando');
        api('/inscripciones/' + f.id + '/aprobar', {}).then(function (r) {
          f.estado = 'activo'; f.numero_afiliado = r.numero_afiliado;
          var d = body.closest('details'), tag = d && d.querySelector('.tag'); if (tag) tag.textContent = 'Aprobada · ' + r.numero_afiliado;
          var enviado = r.correo === 'enviado';
          var cab = h('div', { class: 'aprobada', role: 'status' },
            h('span', { class: 'aprobada-ic', 'aria-hidden': 'true' }, '✓'),
            h('div', null, h('strong', null, 'Afiliación aprobada'), h('p', null, 'Nº ' + r.numero_afiliado + ' · carné emitido')));
          var estadoCorreo = h('p', { class: 'chip-correo ' + (enviado ? 'ok' : 'aviso') },
            enviado ? '✉ Correo enviado a ' + f.email : '✉ Correo no enviado' + (r.correo_motivo ? ' · ' + r.correo_motivo : '') + ' — entrégale tú la contraseña.');
          var datos = h('details', { class: 'datos-plegable' }, h('summary', null, 'Ver datos de la persona'), datosFicha(f));
          limpiar(body).appendChild(cab);
          body.appendChild(estadoCorreo);
          ultimoCorreo = null; ultimoMotivo = null;
          if (!enviado) body.appendChild(secreto('Contraseña temporal · solo se muestra ahora', 'Correo: ' + f.email + '\nContraseña: ' + r.password_temporal, 'Caduca en 7 días; deberá cambiarla al entrar.'));
          else body.appendChild(h('p', { class: 'muted' }, 'La persona ya tiene su contraseña temporal por correo (caduca en 7 días).'));
          body.appendChild(datos);
          body.appendChild(h('div', { class: 'row-btns' }, h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: function () { recargar(); } }, 'Hecho · siguiente inscripción')));
          try { cab.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) { /* sin scroll */ }
        }).catch(function (e) { ok.disabled = no.disabled = false; ok.textContent = 'Aprobar'; ok.classList.remove('cargando'); st.textContent = e.message; });
      });
      no.addEventListener('click', function () {
        var motivo = window.prompt('Motivo del rechazo (opcional):'); if (motivo === null) return;
        ok.disabled = no.disabled = true;
        api('/inscripciones/' + f.id + '/rechazar', { motivo: motivo }).then(recargar).catch(function (e) { ok.disabled = no.disabled = false; st.textContent = e.message; });
      });
    }).catch(function (e) { body.textContent = e.message; });
  }

  // --- Personas ---
  // Ventana para dar de alta una persona afiliada desde la intranet (admin y gestor). Queda activa al momento.
  function abrirAlta(alTerminar) {
    var dlg = h('dialog', { class: 'modal', 'aria-labelledby': 'alta-t' }), cuerpo = h('div', { class: 'modal-in' });
    dlg.appendChild(cuerpo); document.body.appendChild(dlg);
    dlg.addEventListener('close', function () { dlg.remove(); });
    function cerrar() { dlg.close(); }
    function selectCat(id, etiqueta, lista) {
      var s = h('select', { id: id }, h('option', { value: '' }, '—'));
      (lista || []).forEach(function (o) { s.appendChild(h('option', { value: o[0] }, o[1])); });
      return h('div', { class: 'field' }, h('label', { for: id }, etiqueta), s);
    }
    function formulario() {
      limpiar(cuerpo);
      var estado = h('p', { class: 'form-status', role: 'status', 'aria-live': 'polite' });
      var consent = h('input', { type: 'checkbox', id: 'a-cons' }), avisos = h('input', { type: 'checkbox', id: 'a-avisos' }), correo = h('input', { type: 'checkbox', id: 'a-correo', checked: true });
      var envio = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Crear afiliado');
      var form = h('form', { class: 'modal-form', novalidate: true },
        h('div', { class: 'field-pair' }, campo('a-nom', 'Nombre', { required: true, maxlength: 80, autocomplete: 'off' }), campo('a-ape', 'Apellidos', { required: true, maxlength: 120, autocomplete: 'off' })),
        h('div', { class: 'field-pair' }, campo('a-mail', 'Correo electrónico', { type: 'email', required: true, autocomplete: 'off' }), campo('a-doc', 'DNI o NIE', { required: true, maxlength: 12, autocomplete: 'off' })),
        h('div', { class: 'field-pair' }, campo('a-nac', 'Fecha de nacimiento', { type: 'date', required: true }), selectProvincias('a-prov', 'Provincia', 'Elige…')),
        h('div', { class: 'field-pair' }, campo('a-cp', 'Código postal', { inputmode: 'numeric', maxlength: 5, required: true, autocomplete: 'off' }), campo('a-tel', 'Teléfono (opcional)', { type: 'tel', maxlength: 20, autocomplete: 'off' })),
        h('details', { class: 'mas-filtros' }, h('summary', null, 'Más datos (opcional)'),
          h('div', { class: 'field-pair' }, campo('a-pob', 'Municipio', { maxlength: 80 }), campo('a-dir', 'Dirección', { maxlength: 160 })),
          h('div', { class: 'field-pair' }, campo('a-ocu', 'Ocupación', { maxlength: 80 }), selectCat('a-sit', 'Situación laboral', catalogos.situaciones)),
          selectCat('a-sec', 'Sector', catalogos.sectores)),
        h('label', { class: 'consent' }, consent, h('span', null, 'Confirmo que la persona me ha dado su consentimiento para tratar sus datos y afiliarse a PLU.')),
        h('label', { class: 'consent' }, avisos, h('span', null, 'Acepta recibir novedades por correo (opcional).')),
        h('label', { class: 'consent' }, correo, h('span', null, 'Enviarle ahora el correo de bienvenida con su carné y su contraseña temporal.')),
        estado,
        h('div', { class: 'modal-acc' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: cerrar }, 'Cancelar'), envio));
      form.addEventListener('submit', function (ev) {
        ev.preventDefault(); estado.className = 'form-status'; estado.textContent = '';
        form.querySelectorAll('.err-campo').forEach(function (n) { n.remove(); });
        var v = function (id) { return ($(id).value || '').trim(); };
        var datos = { nombre: v('a-nom'), apellidos: v('a-ape'), email: v('a-mail'), documento: v('a-doc'), fecha_nacimiento: v('a-nac'), provincia_id: v('a-prov'), codigo_postal: v('a-cp'), telefono: v('a-tel'),
          poblacion: v('a-pob'), direccion: v('a-dir'), ocupacion: v('a-ocu'), situacion_laboral: v('a-sit'), sector: v('a-sec'),
          consentimiento: consent.checked, consentimiento_avisos: avisos.checked, enviar_correo: correo.checked };
        envio.disabled = true; envio.textContent = 'Creando…';
        api('/afiliados', datos).then(function (r) { exito(r, datos); }).catch(function (e) {
          envio.disabled = false; envio.textContent = 'Crear afiliado';
          estado.className = 'form-status err'; estado.textContent = e.message || 'No se pudo crear';
          var mapa = { nombre: 'a-nom', apellidos: 'a-ape', email: 'a-mail', documento: 'a-doc', fecha_nacimiento: 'a-nac', provincia_id: 'a-prov', codigo_postal: 'a-cp', telefono: 'a-tel', consentimiento: 'a-cons', poblacion: 'a-pob', direccion: 'a-dir', situacion_laboral: 'a-sit', sector: 'a-sec' };
          var errs = (e.datos && e.datos.errores) || {}, primero = null;
          Object.keys(errs).forEach(function (k) {
            var el = mapa[k] && $(mapa[k]); if (!el) return;
            var caja = el.closest('.field') || el.closest('.consent');
            if (caja) caja.appendChild(h('small', { class: 'err-campo' }, errs[k]));
            if (!primero) primero = el;
          });
          if (primero) primero.focus();
        });
      });
      cuerpo.appendChild(h('div', { class: 'modal-cab' }, h('h2', { id: 'alta-t' }, 'Nuevo afiliado'), h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Cerrar', onclick: cerrar }, '×')));
      cuerpo.appendChild(h('p', { class: 'muted' }, 'La persona quedará afiliada al momento: se le asigna número y carné, y se genera una contraseña temporal para el portal.'));
      cuerpo.appendChild(form);
      setTimeout(function () { $('a-nom').focus(); }, 50);
    }
    function exito(r, datos) {
      limpiar(cuerpo);
      cuerpo.appendChild(h('div', { class: 'modal-cab' }, h('h2', { id: 'alta-t' }, 'Afiliado creado'), h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Cerrar', onclick: cerrar }, '×')));
      cuerpo.appendChild(h('p', null, h('strong', null, datos.nombre + ' ' + datos.apellidos), ' ya es afiliado/a con el número ', h('strong', null, r.numero_afiliado), '.'));
      cuerpo.appendChild(avisoCorreo());
      cuerpo.appendChild(secreto('Contraseña temporal · solo se muestra ahora', 'Correo: ' + datos.email + '\nContraseña: ' + r.password_temporal, 'Caduca en 7 días; tendrá que cambiarla al entrar en el portal.'));
      cuerpo.appendChild(h('div', { class: 'modal-acc' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: formulario }, 'Crear otro'), h('button', { class: 'btn btn-primary', type: 'button', onclick: cerrar }, 'Listo')));
      if (alTerminar) alTerminar();
    }
    cargarProvincias().then(function () { formulario(); dlg.showModal(); });
  }
  function sPersonas(c) {
    // Vista única de afiliación: contadores que sirven de filtro + buscador + lista (las pendientes se aprueban desde aquí)
    var q = campo('f-q', 'Buscar por nombre, correo o nº', { type: 'search' }), tipo = h('select', { id: 'f-t' }), est = h('select', { id: 'f-e' });
    [['', 'Todos'], ['afiliado', 'Afiliados'], ['simpatizante', 'Simpatizantes']].forEach(function (o) { tipo.appendChild(h('option', { value: o[0] }, o[1])); });
    [['', 'Cualquier estado'], ['pendiente', 'Pendiente'], ['activo', 'Activo'], ['suspendido', 'Suspendido'], ['baja', 'Baja'], ['rechazado', 'Rechazado']].forEach(function (o) { est.appendChild(h('option', { value: o[0] }, o[1])); });
    var prov = usuario.rol === 'coordinador' ? null : selectProvincias('f-p', 'Provincia', 'Todas');
    var chips = h('div', { class: 'chips-estado', role: 'group', 'aria-label': 'Filtrar por estado' });
    var defs = [['pendiente', 'Pendientes', 'pendiente', ''], ['activo', 'Activos', 'activo', ''], ['suspendido', 'Suspendidos', 'suspendido', ''], ['simp', 'Simpatizantes', '', 'simpatizante'], ['todos', 'Todos', '', '']], botones = {};
    defs.forEach(function (d) {
      var b = h('button', { class: 'chip-e', type: 'button', 'aria-pressed': 'false', 'data-k': d[0], onclick: function () { est.value = d[2]; tipo.value = d[3]; marcar(); cargar(); } }, h('b', null, '–'), h('span', null, d[1]));
      botones[d[0]] = b; chips.appendChild(b);
    });
    function marcar() {
      var k = est.value === 'pendiente' && !tipo.value ? 'pendiente' : est.value === 'activo' && !tipo.value ? 'activo' : est.value === 'suspendido' && !tipo.value ? 'suspendido' : tipo.value === 'simpatizante' && !est.value ? 'simp' : (!est.value && !tipo.value ? 'todos' : '');
      defs.forEach(function (d) { botones[d[0]].setAttribute('aria-pressed', String(d[0] === k)); });
    }
    var mas = h('details', { class: 'mas-filtros' }, h('summary', null, 'Más filtros'), h('div', { class: 'toolbar' }, h('div', { class: 'field' }, h('label', { for: 'f-t' }, 'Tipo'), tipo), h('div', { class: 'field' }, h('label', { for: 'f-e' }, 'Estado'), est), prov));
    if (['admin', 'gestor'].indexOf(usuario.rol) >= 0) c.appendChild(h('div', { class: 'acciones-vista' }, h('button', { class: 'btn btn-primary btn-sm', type: 'button', id: 'b-nuevo-afiliado', onclick: function () { abrirAlta(function () { contadores(); cargar(); }); } }, '+ Nuevo afiliado')));
    c.appendChild(chips); c.appendChild(q); c.appendChild(mas);
    if (['admin', 'gestor'].indexOf(usuario.rol) >= 0) c.appendChild(h('p', { class: 'csv-link' }, h('a', { class: 'link', href: '/api/intranet/export/afiliados.csv' }, 'Descargar listado de afiliados (CSV, sin documento) →')));
    var lista = h('div', { class: 'rows' }), vacio = h('p', { class: 'muted', hidden: true }, 'Sin resultados.'); c.appendChild(lista); c.appendChild(vacio);
    var espera;
    function contadores() {
      api('/resumen').then(function (r) {
        var n = { pendiente: r.afiliados.pendiente || 0, activo: r.afiliados.activo || 0, suspendido: r.afiliados.suspendido || 0, simp: r.simpatizantes || 0 };
        Object.keys(n).forEach(function (k) { botones[k].querySelector('b').textContent = String(n[k]); });
        botones.todos.querySelector('b').textContent = String(Object.keys(n).reduce(function (a, k) { return a + n[k]; }, 0));
        botones.pendiente.classList.toggle('hay', n.pendiente > 0);
      }).catch(function () { /* los contadores son opcionales */ });
    }
    function cargar() {
      marcar(); contadores();
      var p = new URLSearchParams(); if (q.querySelector('input').value) p.set('q', q.querySelector('input').value); if (tipo.value) p.set('tipo', tipo.value); if (est.value) p.set('estado', est.value);
      if (prov && prov.querySelector('select').value) p.set('provincia', prov.querySelector('select').value);
      api('/personas?' + p).then(function (filas) {
        limpiar(lista); vacio.hidden = filas.length > 0;
        filas.forEach(function (x) {
          var pendiente = x.estado === 'pendiente' && x.tipo === 'afiliado';
          lista.appendChild(fila((x.nombre + ' ' + x.apellidos).trim(), x.email, (x.tipo === 'afiliado' ? 'Afiliado' : 'Simpatizante') + ' · ' + (ESTADOS[x.estado] || x.estado) + ' · ' + (x.provincia || '') + (x.numero_afiliado ? ' · Nº ' + x.numero_afiliado : ''), function (body) {
            if (pendiente) fichaInscripcion(x, body, cargar); else fichaPersona(x.id, body, cargar);
          }));
        });
      }).catch(function (e) { errorSeccion(c, e); });
    }
    [q.querySelector('input'), tipo, est].concat(prov ? [prov.querySelector('select')] : []).forEach(function (n) { n.addEventListener('input', function () { clearTimeout(espera); espera = setTimeout(cargar, 250); }); });
    // Si hay inscripciones por aprobar se muestran primero; si no, todo el listado
    api('/resumen').then(function (r) { if (!(r.afiliados.pendiente > 0)) { est.value = ''; tipo.value = ''; } else { est.value = 'pendiente'; } cargar(); }).catch(function () { cargar(); });
  }
  function fichaPersona(id, body, recargar, extra) {
    api('/personas/' + id).then(function (f) {
      limpiar(body);
      var fd = body.parentNode, etq = fd && fd.querySelector ? fd.querySelector('summary .tag') : null;
      if (etq) etq.textContent = (f.tipo === 'afiliado' ? 'Afiliado' : 'Simpatizante') + ' · ' + (ESTADOS[f.estado] || f.estado) + ' · ' + (f.provincia || '') + (f.numero_afiliado ? ' · Nº ' + f.numero_afiliado : '');
      var puede = ['admin', 'gestor'].indexOf(usuario.rol) >= 0, afiliado = f.tipo === 'afiliado';
      var st = h('p', { class: 'form-status err', role: 'status' }), salida = h('div');
      function bloque(titulo) { var b = h('section', { class: 'ficha-bloque' }, h('h3', null, titulo)); body.appendChild(b); return b; }
      function boton(texto, fn, cls) { return h('button', { class: 'btn ' + (cls || 'btn-ghost') + ' btn-sm', type: 'button', onclick: fn }, texto); }
      function fallo(e) { st.textContent = e.message; }

      // 1) Datos (con edición para gestión)
      var bd = bloque('Datos');
      var vista = h('div'); vista.appendChild(datosFicha(f)); bd.appendChild(vista);
      if (puede) {
        var editar = boton('Editar datos', function () { formulario(); }, 'btn-ghost'); bd.appendChild(h('div', { class: 'row-btns' }, editar));
      }
      function formulario() {
        var campos = [['nombre', 'Nombre', 'text'], ['apellidos', 'Apellidos', 'text'], ['email', 'Correo', 'email'], ['telefono', 'Teléfono', 'tel'], ['direccion', 'Dirección', 'text'], ['poblacion', 'Municipio', 'text'], ['codigo_postal', 'Código postal', 'text'], ['ocupacion', 'Ocupación o profesión', 'text']];
        var refs = {}, form = h('form', { class: 'ficha-form', novalidate: true });
        campos.forEach(function (k) { if (!afiliado && ['direccion', 'poblacion', 'ocupacion'].indexOf(k[0]) >= 0) return; refs[k[0]] = h('input', { id: 'e' + id + k[0], type: k[2], value: f[k[0]] || '', maxlength: '160' }); form.appendChild(h('div', { class: 'field' }, h('label', { for: 'e' + id + k[0] }, k[1]), refs[k[0]])); });
        if (afiliado) {
          [['situacion_laboral', 'Situación laboral', catalogos.situaciones], ['sector', 'Sector', catalogos.sectores]].forEach(function (k) {
            var s = h('select', { id: 'e' + id + k[0] }, [h('option', { value: '' }, 'Sin indicar')].concat(k[2].map(function (o) { return h('option', { value: o[0] }, o[1]); }))); s.value = f[k[0]] || ''; refs[k[0]] = s;
            form.appendChild(h('div', { class: 'field' }, h('label', { for: 'e' + id + k[0] }, k[1]), s));
          });
        }
        var aviso = h('p', { class: 'form-status err', role: 'status' });
        form.appendChild(h('div', { class: 'row-btns' }, h('button', { class: 'btn btn-primary btn-sm', type: 'submit' }, 'Guardar cambios'), boton('Cancelar', function () { recargar ? fichaPersona(id, body, recargar) : null; })));
        form.appendChild(aviso);
        form.addEventListener('submit', function (ev) {
          ev.preventDefault(); aviso.textContent = '';
          var cuerpo = {}; Object.keys(refs).forEach(function (k) { cuerpo[k] = refs[k].value.trim(); });
          api('/personas/' + id, cuerpo, 'PATCH').then(function () { fichaPersona(id, body, recargar); })
            .catch(function (e) { aviso.textContent = e.datos && e.datos.errores ? Object.keys(e.datos.errores).map(function (k) { return e.datos.errores[k]; }).join(' · ') : e.message; });
        });
        limpiar(vista).appendChild(form); if (editar) editar.hidden = true;
      }

      // 2) Carné y certificado
      if (afiliado) {
        var bc = bloque('Carné y certificado'), fila1 = h('div', { class: 'row-btns' });
        if (f.carne) bc.appendChild(h('p', { class: 'muted' }, 'Carné v' + f.carne.version + ' · emitido ' + fecha(f.carne.emitido_en) + ' · válido hasta ' + fecha(f.carne.valido_hasta)));
        else bc.appendChild(h('p', { class: 'muted' }, f.estado === 'activo' ? 'No tiene carné vigente.' : 'Sin carné vigente (la persona no está activa).'));
        if (puede) {
          if (f.carne && f.estado === 'activo') fila1.appendChild(h('a', { class: 'btn btn-ghost btn-sm', href: '/api/intranet/personas/' + id + '/carne.pdf', target: '_blank', rel: 'noopener' }, 'Ver carné (PDF)'));
          if (f.estado === 'activo') {
            fila1.appendChild(boton('Emitir duplicado', function () { if (!confirmar('Se emitirá un carné nuevo y el anterior dejará de ser válido. ¿Continuar?')) return; api('/personas/' + id + '/carne', { accion: 'duplicado' }).then(function () { fichaPersona(id, body, recargar, avisoCorreo()); }).catch(fallo); }));
            fila1.appendChild(boton('Renovar carné', function () { if (!confirmar('Se renovará el carné con una nueva fecha de validez. ¿Continuar?')) return; api('/personas/' + id + '/carne', { accion: 'renovacion' }).then(function () { fichaPersona(id, body, recargar, avisoCorreo()); }).catch(fallo); }));
          }
          if (['activo', 'suspendido', 'baja'].indexOf(f.estado) >= 0) fila1.appendChild(h('a', { class: 'btn btn-ghost btn-sm', href: '/api/intranet/personas/' + id + '/certificado.pdf', target: '_blank', rel: 'noopener' }, 'Certificado de afiliación (PDF)'));
          bc.appendChild(fila1);
        }
      }

      // 3) Estado, provincia y acceso
      if (puede && afiliado) {
        var be = bloque('Afiliación y acceso'), acciones = h('div', { class: 'row-btns' });
        function estadoBtn(texto, accion, aviso) {
          acciones.appendChild(boton(texto, function () {
            if (!confirmar(aviso)) return; var motivo = window.prompt('Motivo (opcional):'); if (motivo === null) return;
            api('/personas/' + id + '/estado', { accion: accion, motivo: motivo }).then(function (r) {
              var nodo = (r && r.password_temporal) ? secreto('Contraseña temporal (solo se muestra ahora)', 'Correo: ' + f.email + '\nContraseña: ' + r.password_temporal, 'Entrégala por un canal seguro. Caduca en 7 días.') : null;
              fichaPersona(id, body, recargar, nodo || avisoCorreo());
            }).catch(fallo);
          }));
        }
        if (f.estado === 'activo') estadoBtn('Suspender', 'suspender', '¿Suspender a esta persona?');
        if (f.estado === 'suspendido') estadoBtn('Reactivar', 'reactivar', '¿Reactivar a esta persona?');
        if (f.estado === 'activo' || f.estado === 'suspendido') estadoBtn('Dar de baja', 'baja', 'La baja revoca el carné y cierra sus sesiones. ¿Continuar?');
        if (f.estado === 'baja') estadoBtn('Readmitir', 'readmitir', 'Se reactivará la afiliación, se emitirá un carné nuevo y una contraseña temporal. ¿Continuar?');
        if (f.estado === 'activo') {
          acciones.appendChild(boton('Nueva contraseña', function () {
            if (!confirmar('Se generará una contraseña temporal nueva y se cerrarán sus sesiones. ¿Continuar?')) return;
            api('/personas/' + id + '/reset-password', {}).then(function (r) { fichaPersona(id, body, recargar, secreto('Contraseña temporal (solo se muestra ahora)', 'Correo: ' + f.email + '\nContraseña: ' + r.password_temporal)); }).catch(fallo);
          }));
        }
        be.appendChild(acciones);
        if (f.estado === 'activo') {
          var sel = selectProvincias('pp-' + id, 'Cambiar de provincia', 'Elegir…');
          sel.querySelector('select').addEventListener('change', function (ev) {
            var v = ev.target.value; if (!v || !confirmar('Se cambiará la provincia y se emitirá un carné nuevo (el número de afiliado se mantiene). ¿Continuar?')) { ev.target.value = ''; return; }
            api('/personas/' + id + '/provincia', { provincia_id: Number(v) }).then(function () { fichaPersona(id, body, recargar, avisoCorreo()); }).catch(fallo);
          });
          be.appendChild(sel);
        }
      }

      // 4) Historial y solicitudes
      if (f.movimientos.length || (f.solicitudes && f.solicitudes.length)) {
        var bh = bloque('Historial');
        if (f.movimientos.length) bh.appendChild(h('p', { class: 'muted' }, f.movimientos.map(function (m) { return (MOV[m.tipo] || m.tipo) + ' (' + fecha(m.fecha) + ')'; }).join(' · ')));
        if (f.solicitudes && f.solicitudes.length) bh.appendChild(h('p', { class: 'muted' }, 'Solicitudes: ' + f.solicitudes.map(function (s) { return (TIPOS_SOL[s.tipo] || s.tipo) + ' (' + s.estado + ')'; }).join(' · ')));
      }
      if (usuario.rol === 'admin') {
        var bz = bloque('Zona de riesgo');
        bz.appendChild(h('p', { class: 'muted' }, 'Elimina definitivamente a esta persona y todos sus datos (carné, sesiones, apoyos, comentarios, correos). No se puede deshacer.'));
        bz.appendChild(boton('Eliminar persona y sus datos', function () {
          var t = window.prompt('Para confirmar la eliminación definitiva escribe el correo de la persona:\n' + f.email);
          if (t === null) return;
          api('/personas/' + id + '/eliminar', { confirmacion: t }).then(function () {
            var d = body.parentNode; if (d && d.remove) d.remove(); else limpiar(body).appendChild(h('p', null, 'Eliminada.'));
            window.scrollTo(0, 0);
          }).catch(fallo);
        }, 'btn-ghost btn-peligro'));
      }
      body.appendChild(st); body.appendChild(salida);
      if (extra) { salida.appendChild(extra); st.textContent = ''; }
    }).catch(function (e) { body.textContent = e.message; });
  }

  // --- Solicitudes ---
  function sSolicitudes(c) {
    var estado = 'abierta', lista = h('div', { class: 'rows' }), vacio = h('p', { class: 'muted', hidden: true }, 'No hay solicitudes.');
    c.appendChild(filtros([['abierta', 'Abiertas'], ['resuelta', 'Resueltas'], ['rechazada', 'Rechazadas']], estado, function (v) { estado = v; cargar(); }));
    c.appendChild(lista); c.appendChild(vacio);
    function cargar() {
      limpiar(lista);
      api('/solicitudes?estado=' + estado).then(function (filas) {
        vacio.hidden = filas.length > 0;
        filas.forEach(function (s) {
          lista.appendChild(fila(TIPOS_SOL[s.tipo] || s.tipo, s.nombre + ' ' + s.apellidos + ' · Nº ' + (s.numero_afiliado || '—'), fecha(s.creada_en), function (body) {
            var detalle = s.detalle; try { var j = JSON.parse(s.detalle); if (j && j.provincia_id) { var pr = (provincias || []).filter(function (x) { return x.id === j.provincia_id; })[0]; detalle = 'Nueva provincia: ' + (pr ? pr.nombre : j.provincia_id) + (j.nota ? ' — ' + j.nota : ''); } else if (j && j.cambios) { var NOM = { direccion: 'Dirección', poblacion: 'Municipio', codigo_postal: 'Código postal', telefono: 'Teléfono', ocupacion: 'Ocupación', situacion_laboral: 'Situación laboral', sector: 'Sector' }; detalle = Object.keys(j.cambios).map(function (k) { var v = j.cambios[k]; if (k === 'situacion_laboral') v = etiquetaDe(catalogos.situaciones, v); if (k === 'sector') v = etiquetaDe(catalogos.sectores, v); return (NOM[k] || k) + ': ' + v; }).join(' · ') + (j.nota ? ' — ' + j.nota : ''); } } catch (e) { /* texto libre */ }
            body.appendChild(h('p', null, detalle || 'Sin detalle.'));
            if (s.resolucion) body.appendChild(h('p', { class: 'muted' }, 'Resolución: ' + s.resolucion));
            if (s.estado !== 'abierta' && s.estado !== 'en_revision') return;
            if (['admin', 'gestor'].indexOf(usuario.rol) < 0) { body.appendChild(h('p', { class: 'muted' }, 'Solo gestión puede resolver solicitudes.')); return; }
            var st = h('p', { class: 'form-status err' });
            function resolver(aceptar) {
              var r = window.prompt(aceptar ? 'Nota para la persona (opcional):' : 'Motivo del rechazo:'); if (r === null) return;
              api('/solicitudes/' + s.id + '/resolver', { aceptar: aceptar, resolucion: r }).then(cargar).catch(function (e) { st.textContent = e.message; });
            }
            body.appendChild(h('div', { class: 'row-btns' }, h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: function () { resolver(true); } }, 'Aceptar y aplicar'), h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { resolver(false); } }, 'Rechazar')));
            body.appendChild(st);
          }));
        });
      }).catch(function (e) { errorSeccion(c, e); });
    }
    cargar();
  }

  // --- Verificar carné (pensado para el móvil en la puerta del acto) ---
  function sVerificar(c, codigoInicial) {
    var res = h('div', { class: 'verif', 'aria-live': 'polite' });
    var num = h('input', { id: 'v-num', inputmode: 'numeric', placeholder: '28-482915', autocomplete: 'off' });
    var cod = h('input', { id: 'v-cod', placeholder: 'Código del QR', autocomplete: 'off', hidden: true });
    function consulta(q) {
      limpiar(res);
      api('/verificar?' + q).then(function (r) {
        var t = { valido: ['ok', 'CARNÉ VÁLIDO'], caducado: ['warn', 'CARNÉ CADUCADO'], revocado: ['bad', 'CARNÉ REVOCADO'], suspendido: ['warn', 'AFILIACIÓN SUSPENDIDA'], baja: ['bad', 'DE BAJA'], no_existe: ['bad', 'NO EXISTE'] }[r.resultado];
        var caja = h('div', { class: 'verif-res ' + t[0] }, h('strong', null, t[1]));
        if (r.datos) { caja.appendChild(h('span', null, r.datos.nombre)); caja.appendChild(h('small', null, 'Nº ' + r.datos.numero_afiliado + ' · ' + (r.datos.provincia || '') + (r.datos.valido_hasta ? ' · hasta ' + fecha(r.datos.valido_hasta) : ''))); }
        res.appendChild(caja);
      }).catch(function (e) { if (e.status === 401) ver('v-login'); else res.appendChild(h('div', { class: 'verif-res bad' }, h('strong', null, e.message))); });
    }
    var form = h('form', { class: 'verif-form', novalidate: true, onsubmit: function (ev) { ev.preventDefault(); if (num.value.trim()) consulta('numero=' + encodeURIComponent(num.value.trim())); } },
      h('div', { class: 'field' }, h('label', { for: 'v-num' }, 'Número de afiliado'), num), h('button', { class: 'btn btn-primary', type: 'submit' }, 'Comprobar'));
    c.appendChild(h('p', { class: 'muted' }, 'Escanea el QR del carné o escribe el número de afiliado. Cada comprobación queda registrada.'));
    c.appendChild(form);
    var video = h('video', { class: 'scan', playsinline: true, muted: true, hidden: true });
    var btnCam = h('button', { class: 'btn btn-ghost', type: 'button' }, 'Escanear QR con la cámara');
    // Lector de QR: BarcodeDetector si existe (Chrome/Android); si no (Safari de iPhone, Firefox), jsQR sobre un lienzo.
    var cargarJsQR = function () {
      return new Promise(function (ok, ko) {
        if (window.jsQR) return ok();
        var sc = document.createElement('script'); sc.src = 'jsQR.js'; sc.onload = function () { ok(); }; sc.onerror = ko; document.head.appendChild(sc);
      });
    };
    btnCam.addEventListener('click', function () {
      res.innerHTML = '';
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { res.appendChild(h('p', { class: 'form-status err' }, 'Este navegador no da acceso a la cámara. Abre el enlace del QR con la cámara del móvil o escribe el número.')); return; }
      var lector = window.BarcodeDetector ? Promise.resolve() : cargarJsQR();
      lector.then(function () { return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }); }).then(function (stream) {
        video.muted = true; video.setAttribute('playsinline', ''); video.srcObject = stream; video.hidden = false; video.play(); var vivo = true;
        detenerCamara = function () { vivo = false; stream.getTracks().forEach(function (t) { t.stop(); }); video.hidden = true; detenerCamara = function () {}; };
        var det = window.BarcodeDetector ? new BarcodeDetector({ formats: ['qr_code'] }) : null;
        var lienzo = document.createElement('canvas'), ctx = lienzo.getContext('2d', { willReadFrequently: true });
        var leer = function () {
          if (det) return det.detect(video).then(function (r) { return r.length ? (r[0].rawValue || '') : ''; });
          if (!video.videoWidth) return Promise.resolve('');
          var k = Math.min(1, 640 / video.videoWidth); lienzo.width = Math.round(video.videoWidth * k); lienzo.height = Math.round(video.videoHeight * k);
          ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);
          var q = window.jsQR(ctx.getImageData(0, 0, lienzo.width, lienzo.height).data, lienzo.width, lienzo.height, { inversionAttempts: 'dontInvert' });
          return Promise.resolve(q ? q.data : '');
        };
        (function bucle() {
          if (!vivo) return;
          leer().then(function (texto) {
            var m = /[?&]v=([^&]+)/.exec(texto || '');
            if (m) { detenerCamara(); consulta('codigo=' + m[1]); return; }
            setTimeout(bucle, 200);
          }).catch(function () { setTimeout(bucle, 400); });
        })();
      }).catch(function () { res.appendChild(h('p', { class: 'form-status err' }, 'No se pudo abrir la cámara (revisa el permiso del navegador). Escribe el número de afiliado.')); });
    });
    c.appendChild(btnCam); c.appendChild(video);
    c.appendChild(res);
    if (codigoInicial) { history.replaceState(null, '', location.pathname); consulta('codigo=' + encodeURIComponent(codigoInicial)); }
  }

  // --- Carné: plantilla ---
  function sCarne(c) {
    c.appendChild(h('p', { class: 'muted' }, 'Sube aquí el PDF del carné que diseñes (campos de formulario con estos nombres). Cada campo se rellena con los datos de la persona y el QR se inserta en el campo "qr".'));
    var info = h('div', { class: 'secret' }); c.appendChild(info);
    api('/plantillas').then(function (d) {
      info.appendChild(h('strong', null, d.activa ? 'Hay una plantilla activa (nº ' + d.activa + ').' : 'Todavía no hay plantilla: se usa un carné de prueba.'));
      info.appendChild(h('p', { class: 'muted' }, 'Campos obligatorios: ' + d.obligatorios.join(', ') + '. Opcionales: ' + d.opcionales.join(', ') + '.'));
    }).catch(function (e) { errorSeccion(c, e); });
    var archivo = h('input', { type: 'file', accept: 'application/pdf', id: 'pl-f' }), st = h('p', { class: 'form-status err' });
    c.appendChild(h('div', { class: 'field' }, h('label', { for: 'pl-f' }, 'PDF de la plantilla'), archivo));
    c.appendChild(h('div', { class: 'row-btns' },
      h('button', { class: 'btn btn-primary', type: 'button', onclick: function () {
        if (!archivo.files[0]) { st.textContent = 'Elige un PDF.'; return; }
        st.textContent = 'Subiendo…';
        fetch('/api/intranet/plantillas', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/pdf' }, body: archivo.files[0] })
          .then(function (r) { return r.json().then(function (d) { return [r.ok, d]; }); })
          .then(function (x) {
            if (x[0]) { st.className = 'form-status'; st.textContent = 'Plantilla activada. Campos encontrados: ' + x[1].campos.join(', ') + (x[1].extra.length ? ' (sin usar: ' + x[1].extra.join(', ') + ')' : ''); }
            else { st.className = 'form-status err'; st.textContent = x[1].error + (x[1].faltan ? ': faltan ' + x[1].faltan.join(', ') : ''); }
          }).catch(function () { st.className = 'form-status err'; st.textContent = 'No se pudo subir.'; });
      } }, 'Subir y activar'),
      h('a', { class: 'btn btn-ghost', href: '/api/intranet/plantillas/ejemplo.pdf' }, 'Descargar plantilla de ejemplo'),
      h('a', { class: 'btn btn-ghost', href: '/api/intranet/plantillas/vista-previa.pdf', target: '_blank', rel: 'noopener' }, 'Ver vista previa')));
    c.appendChild(st);
  }

  // --- Equipo ---
  function sEquipo(c) {
    var lista = h('div', { class: 'rows' }), salida = h('div');
    var form = h('form', { class: 'form-card', novalidate: true },
      h('h2', null, 'Nueva persona del equipo'),
      h('div', { class: 'field-pair' }, campo('u-n', 'Nombre', { required: true }), campo('u-u', 'Usuario', { required: true, autocomplete: 'off', placeholder: 'nombre.apellido' })),
      h('div', { class: 'field-pair' }, campo('u-e', 'Correo (opcional)', { type: 'email' }), h('div', { class: 'field' }, h('label', { for: 'u-r' }, 'Rol'), h('select', { id: 'u-r' }, Object.keys(ROLES).map(function (r) { return h('option', { value: r }, ROLES[r]); })))),
      selectProvincias('u-p', 'Provincia (solo coordinación)', 'Ninguna'),
      h('button', { class: 'btn btn-primary', type: 'submit' }, 'Crear'), h('p', { class: 'form-status err', role: 'alert' }));
    form.addEventListener('submit', function (e) {
      e.preventDefault(); msg(form);
      api('/usuarios', { nombre: $('u-n').value, username: $('u-u').value, email: $('u-e').value, rol: $('u-r').value, territorio_id: $('u-p').value || null }).then(function (r) {
        limpiar(salida).appendChild(secreto('Contraseña temporal (solo se muestra ahora)', 'Usuario: ' + $('u-u').value + '\nContraseña: ' + r.password_temporal, 'Tendrá que cambiarla y activar la doble verificación en su primer acceso.'));
        form.reset(); cargar();
      }).catch(function (err) { msg(form, err.message); });
    });
    c.appendChild(form); c.appendChild(salida); c.appendChild(lista);
    function cargar() {
      limpiar(lista);
      api('/usuarios').then(function (us) {
        us.forEach(function (u) {
          lista.appendChild(fila(u.nombre, '@' + u.username + ' · ' + (u.totp_activo ? '2FA activa' : '2FA pendiente') + (u.ultimo_acceso ? ' · último acceso ' + fechaHora(u.ultimo_acceso) : ''), (ROLES[u.rol] || u.rol) + (u.provincia ? ' · ' + u.provincia : '') + (u.activo ? '' : ' · DESACTIVADO'), function (body) {
            var st = h('p', { class: 'form-status err' }), out = h('div'), rol = h('select', { 'aria-label': 'Rol' }, Object.keys(ROLES).map(function (r) { return h('option', { value: r, selected: r === u.rol }, ROLES[r]); }));
            body.appendChild(h('div', { class: 'row-btns' }, rol,
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { api('/usuarios/' + u.id, { rol: rol.value }, 'PATCH').then(cargar).catch(function (e) { st.textContent = e.message; }); } }, 'Guardar rol'),
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { api('/usuarios/' + u.id, { activo: !u.activo }, 'PATCH').then(cargar).catch(function (e) { st.textContent = e.message; }); } }, u.activo ? 'Desactivar' : 'Activar'),
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () {
                if (!confirmar('Se restablecerá la contraseña y la doble verificación de esta persona. ¿Continuar?')) return;
                api('/usuarios/' + u.id + '/reset', {}).then(function (r) { limpiar(out).appendChild(secreto('Contraseña temporal (solo se muestra ahora)', 'Usuario: ' + u.username + '\nContraseña: ' + r.password_temporal)); }).catch(function (e) { st.textContent = e.message; });
              } }, 'Restablecer acceso')));
            body.appendChild(st); body.appendChild(out);
          }));
        });
      }).catch(function (e) { errorSeccion(c, e); });
    }
    cargar();
  }

  // --- Auditoría ---
  function sAuditoria(c) {
    var tabla = h('div', { class: 'rows' }); c.appendChild(h('p', { class: 'muted' }, 'Últimas 300 acciones del equipo. No se pueden editar ni borrar.')); c.appendChild(tabla);
    api('/auditoria').then(function (filas) {
      filas.forEach(function (a) {
        tabla.appendChild(h('div', { class: 'audit-row' }, h('span', { class: 'tag' }, fechaHora(a.fecha)), h('span', null, '@' + (a.username || 'sistema')), h('strong', null, a.accion), h('span', { class: 'muted' }, a.entidad + (a.entidad_id ? ' #' + a.entidad_id : '') + (a.detalle_json ? ' ' + a.detalle_json : ''))));
      });
    }).catch(function (e) { errorSeccion(c, e); });
  }


  // --- Donaciones por transferencia ---
  function sDonaciones(c) {
    var gestiona = usuario.rol === 'admin' || usuario.rol === 'gestor';
    c.appendChild(h('p', { class: 'muted' }, 'La gente avisa de su donación en la web y hace una transferencia con un código de referencia. Cuando veas el ingreso en el banco, confírmala. Hay que identificar siempre a quien dona (el documento se guarda cifrado).'));
    var resumen = h('div', { class: 'counters' }), cab = h('div', { class: 'filters' }), caja = h('div', { class: 'rows' });
    var estado = 'pendiente';
    function cargar() {
      api('/donaciones?estado=' + estado).then(function (d) {
        limpiar(resumen); limpiar(caja);
        ['pendiente', 'confirmada', 'rechazada'].forEach(function (e) { var t = d.totales[e] || { n: 0, eur: 0 }; resumen.appendChild(h('div', { class: 'counter' }, h('b', null, t.eur.toLocaleString('es-ES') + ' €'), h('span', null, t.n + (e === 'pendiente' ? ' pendientes' : e === 'confirmada' ? ' confirmadas' : ' rechazadas')))); });
        if (!d.filas.length) caja.appendChild(h('p', { class: 'muted' }, 'No hay donaciones en este estado.'));
        d.filas.forEach(function (f) {
          var fila = h('div', { class: 'audit-row' }, h('span', { class: 'tag' }, f.fecha), h('strong', null, f.importe.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €'), h('span', null, f.nombre + ' · ' + f.documento), h('span', { class: 'muted' }, f.referencia || ''));
          if (gestiona) {
            var cambia = function (nuevo) { return function () { api('/donaciones/' + f.id + '/estado', { estado: nuevo }).then(cargar).catch(function (e) { errorSeccion(c, e); }); }; };
            if (f.estado !== 'confirmada') fila.appendChild(h('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: cambia('confirmada') }, 'Confirmar'));
            if (f.estado !== 'rechazada') fila.appendChild(h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: cambia('rechazada') }, 'Rechazar'));
          }
          caja.appendChild(fila);
        });
      }).catch(function (e) { errorSeccion(c, e); });
    }
    ['pendiente', 'confirmada', 'rechazada'].forEach(function (e) { cab.appendChild(h('button', { type: 'button', class: 'fbtn', onclick: function () { estado = e; cargar(); } }, e.charAt(0).toUpperCase() + e.slice(1) + 's')); });
    c.appendChild(resumen); c.appendChild(cab);
    if (gestiona) c.appendChild(h('p', { class: 'csv-link' }, h('a', { class: 'link', href: '/api/intranet/donaciones/export.csv' }, 'Descargar donaciones confirmadas (CSV) →')));
    c.appendChild(caja);
    if (gestiona) {
      var alta = h('details', null, h('summary', null, 'Registrar un ingreso recibido sin aviso'));
      var f = h('form', { class: 'form-card', novalidate: '' },
        campo('d-nom', 'Nombre y apellidos', {}), campo('d-doc', 'DNI o NIE', {}), campo('d-imp', 'Importe (€)', {}), campo('d-ref', 'Referencia (opcional)', {}),
        h('button', { class: 'btn btn-primary', type: 'submit' }, 'Registrar como confirmada'), h('p', { class: 'form-status', role: 'status' }));
      f.addEventListener('submit', function (ev) { ev.preventDefault(); api('/donaciones', { nombre: $('d-nom').value, documento: $('d-doc').value, importe: $('d-imp').value, referencia: $('d-ref').value }).then(function () { sDonaciones(limpiar(c)); }).catch(function (e) { msg(f, e.message); }); });
      alta.appendChild(f); c.appendChild(alta);
    }
    if (usuario.rol === 'admin' || usuario.rol === 'auditor') {
      var aj = h('details', null, h('summary', null, 'Datos bancarios que ve la gente'));
      var g = h('form', { class: 'form-card', novalidate: '' }, campo('a-iban', 'IBAN (vacío = donaciones desactivadas)', {}), campo('a-tit', 'Titular de la cuenta', {}), campo('a-ban', 'Banco', {}), campo('a-not', 'Nota (opcional)', { rows: 3 }, 'textarea'),
        usuario.rol === 'admin' ? h('button', { class: 'btn btn-primary', type: 'submit' }, 'Guardar') : h('span'), h('p', { class: 'form-status', role: 'status' }));
      api('/ajustes/donaciones').then(function (a) { $('a-iban').value = a.iban; $('a-tit').value = a.titular; $('a-ban').value = a.banco; $('a-not').value = a.nota; });
      g.addEventListener('submit', function (ev) { ev.preventDefault(); api('/ajustes/donaciones', { iban: $('a-iban').value, titular: $('a-tit').value, banco: $('a-ban').value, nota: $('a-not').value }).then(function () { msg(g, 'Guardado.'); }).catch(function (e) { msg(g, e.message); }); });
      aj.appendChild(g); c.appendChild(aj);
    }
    cargar();
  }

  // --- Textos legales: editor con formato sencillo y vista previa ---
  function sLegales(c, slugInicial) {
    var puedeEditar = usuario.rol === 'admin' || usuario.rol === 'moderador';
    c.appendChild(h('p', { class: 'muted' }, 'Edita aquí privacidad, términos, cookies, normas, preguntas frecuentes y contacto. Los cambios se publican al guardar y cada versión queda en el historial. Los huecos entre corchetes [así] son datos por completar: el aviso de borrador desaparece al marcar el texto como revisado.'));
    var lista = h('div', { class: 'filters' }), editor = h('div'); c.appendChild(lista); c.appendChild(editor);
    function abrir(slug) {
      limpiar(editor); editor.appendChild(h('p', { class: 'muted' }, 'Cargando…'));
      api('/legales/' + slug).then(function (d) {
        limpiar(editor);
        var ta = h('textarea', { rows: 22, style: 'width:100%;font-family:ui-monospace,monospace;font-size:.95rem;line-height:1.5', 'aria-label': 'Texto de ' + d.titulo, maxlength: 60000 });
        ta.value = d.md; if (!puedeEditar) ta.readOnly = true;
        var prev = h('div', { class: 'legal-text', style: 'padding:16px;border-radius:14px;background:rgba(127,127,127,.08)' });
        var info = h('p', { class: 'muted' }), estado = h('p', { class: 'form-status', role: 'status' });
        var rev = h('input', { type: 'checkbox' }); rev.checked = d.revisado; if (!puedeEditar) rev.disabled = true;
        var t = null;
        function actualizarPrev() {
          fetch('/api/intranet/legales/vista-previa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ md: ta.value }) })
            .then(function (r) { return r.json(); }).then(function (v) { prev.innerHTML = v.html || ''; info.textContent = v.pendientes ? v.pendientes + ' hueco(s) [entre corchetes] por completar.' : 'Sin huecos pendientes.'; }).catch(function () {});
        }
        ta.addEventListener('input', function () { clearTimeout(t); t = setTimeout(actualizarPrev, 400); });
        function envolver(a, b, defecto) { var i = ta.selectionStart, f = ta.selectionEnd, sel = ta.value.slice(i, f) || defecto; ta.setRangeText(a + sel + b, i, f, 'select'); ta.focus(); actualizarPrev(); }
        function linea(pref) { var i = ta.selectionStart, ini = ta.value.lastIndexOf('\n', i - 1) + 1; ta.setRangeText(pref, ini, ini, 'end'); ta.focus(); actualizarPrev(); }
        var barra = h('div', { class: 'filters' },
          h('button', { type: 'button', class: 'fbtn', onclick: function () { linea('## '); } }, 'Título'),
          h('button', { type: 'button', class: 'fbtn', onclick: function () { linea('### '); } }, 'Subtítulo'),
          h('button', { type: 'button', class: 'fbtn', onclick: function () { envolver('**', '**', 'negrita'); } }, 'Negrita'),
          h('button', { type: 'button', class: 'fbtn', onclick: function () { linea('- '); } }, 'Lista'),
          h('button', { type: 'button', class: 'fbtn', onclick: function () { envolver('[', '](https://)', 'texto del enlace'); } }, 'Enlace'));
        var guardar = h('button', { type: 'button', class: 'btn btn-primary', onclick: function () {
          estado.textContent = 'Guardando…';
          api('/legales/' + slug, { md: ta.value, revisado: rev.checked }).then(function () { abrir(slug); setTimeout(function () { var e = editor.querySelector('.form-status'); if (e) e.textContent = 'Guardado y publicado.'; }, 300); }).catch(function (e) { estado.textContent = e.message; });
        } }, 'Guardar y publicar');
        var orig = h('button', { type: 'button', class: 'btn btn-ghost', onclick: function () { if (confirm('¿Volver al texto original? Se perderán los cambios actuales (quedará en el historial).')) api('/legales/' + slug + '/restaurar', { original: true }).then(function () { abrir(slug); }).catch(function (e) { estado.textContent = e.message; }); } }, 'Volver al original');
        var hist = h('details', null, h('summary', null, 'Historial (' + d.historial.length + ')'));
        d.historial.forEach(function (x) {
          var fila = h('div', { class: 'audit-row' }, h('span', { class: 'tag' }, fechaHora(x.fecha)), h('span', null, x.usuario || 'sistema'));
          if (puedeEditar) fila.appendChild(h('button', { type: 'button', class: 'fbtn', onclick: function () { api('/legales/' + slug + '/restaurar', { historial_id: x.id }).then(function () { abrir(slug); }).catch(function (e) { estado.textContent = e.message; }); } }, 'Restaurar'));
          hist.appendChild(fila);
        });
        editor.appendChild(h('h3', null, d.titulo));
        editor.appendChild(h('p', { class: 'muted' }, d.modificado ? 'Editado' + (d.actualizado_en ? ' el ' + fechaHora(d.actualizado_en) : '') : 'Texto original (sin editar).'));
        editor.appendChild(h('p', null, h('a', { href: '/' + slug, target: '_blank', rel: 'noopener' }, 'Ver página pública ↗')));
        if (puedeEditar) editor.appendChild(barra);
        editor.appendChild(ta);
        if (puedeEditar) editor.appendChild(h('label', { class: 'consent' }, rev, h('span', null, 'Revisado: ocultar el aviso de borrador en la web')));
        if (puedeEditar) editor.appendChild(h('div', { class: 'filters' }, guardar, orig));
        editor.appendChild(estado); editor.appendChild(info);
        editor.appendChild(h('h4', null, 'Vista previa')); editor.appendChild(prev); editor.appendChild(hist);
        actualizarPrev();
      }).catch(function (e) { errorSeccion(editor, e); });
    }
    api('/legales').then(function (l) {
      l.forEach(function (x) {
        lista.appendChild(h('button', { type: 'button', class: 'fbtn', onclick: function () { abrir(x.slug); } }, x.titulo + (x.pendientes ? ' (' + x.pendientes + (x.pendientes === 1 ? ' hueco)' : ' huecos)') : '')));
      });
      abrir(slugInicial || l[0].slug);
    }).catch(function (e) { errorSeccion(c, e); });
  }

  // --- Brújula PLU: solo estadísticas anónimas (grupos de 5 o más personas) ---
  function sBrujula(c) {
    c.appendChild(h('p', { class: 'muted' }, 'Resultados agregados del test opcional de los afiliados. Son datos de opiniones políticas: se muestran solo en grupos de 5 o más personas y nunca por persona. Cada consulta queda en el registro de auditoría.'));
    var caja = h('div', { class: 'rows' }); c.appendChild(caja);
    api('/brujula/agregado').then(function (d) {
      if (!d.total_suficiente) { caja.appendChild(h('p', { class: 'muted' }, 'Todavía no hay suficientes resultados guardados para mostrar estadísticas (mínimo ' + d.minimo + ' personas).')); }
      else {
        var bloque = function (titulo, r) {
          var b = h('div', { class: 'panel', style: 'min-height:0;gap:12px' }, h('h3', { style: 'font-size:1.15rem' }, titulo + ' · ' + r.personas + ' personas · afinidad media con PLU ' + (r.afinidad_media == null ? '—' : r.afinidad_media + '%')));
          Object.keys(d.ejes).forEach(function (k) {
            var e = r.ejes[k]; if (!e) return;
            var tot = e.izquierda + e.centro + e.derecha || 1;
            var fila = h('div', { style: 'display:grid;gap:4px' }, h('strong', null, d.ejes[k].nombre + ' (media ' + e.media + ')'),
              h('div', { style: 'display:flex;height:12px;border-radius:8px;overflow:hidden;background:rgba(127,127,127,.2)' },
                h('i', { style: 'background:#3dd070;width:' + (e.izquierda / tot * 100) + '%' }), h('i', { style: 'background:#9db0a2;width:' + (e.centro / tot * 100) + '%' }), h('i', { style: 'background:#14803f;width:' + (e.derecha / tot * 100) + '%' })),
              h('small', { class: 'muted' }, d.ejes[k].izq + ': ' + e.izquierda + ' · Centro: ' + e.centro + ' · ' + d.ejes[k].der + ': ' + e.derecha));
            b.appendChild(fila);
          });
          return b;
        };
        caja.appendChild(bloque('Todos los afiliados', d.global));
        d.provincias.forEach(function (p) { caja.appendChild(bloque(p.provincia, p)); });
      }
      if (d.intereses && d.intereses.length) {
        var ib = h('div', { class: 'panel', style: 'min-height:0;gap:10px' }, h('h3', { style: 'font-size:1.15rem' }, 'Áreas de interés más elegidas'));
        d.intereses.forEach(function (i) { ib.appendChild(h('div', { class: 'audit-row' }, h('strong', null, i.area), h('span', { class: 'muted' }, i.personas + ' personas'))); });
        caja.appendChild(ib);
      }
    }).catch(function (e) { errorSeccion(c, e); });
  }

  // --- Encuestas ---
  function sEncuestas(c) {
    var puedeEditar = usuario.rol === 'admin' || usuario.rol === 'moderador';
    var zona = h('div'); c.appendChild(zona); listaEncuestas();
    function listaEncuestas() {
      limpiar(zona);
      if (puedeEditar) zona.appendChild(h('p', null, h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: function () { editorEncuesta(null); } }, '+ Nueva encuesta')));
      var lista = h('div', { class: 'rows' }); zona.appendChild(lista);
      api('/encuestas').then(function (es) {
        if (!es.length) lista.appendChild(h('p', { class: 'muted' }, 'Aún no hay encuestas.'));
        es.forEach(function (e) {
          lista.appendChild(fila(e.titulo, e.preguntas + ' preguntas · ' + e.participaciones + ' participaciones', '#' + e.id + ' · ' + e.estado.toUpperCase() + ' · ' + (e.tipo === 'votacion' ? 'VOTACIÓN' + (e.vinculante ? ' vinculante' : '') : (e.anonima ? 'anónima' : 'con nombre')) + ' · ' + (e.provincia || 'toda España') + (e.solo_afiliados ? ' · solo afiliados' : ' · abierta a simpatizantes'), function (body) { accionesEncuesta(e, body); }));
        });
      }).catch(function (er) { errorSeccion(c, er); });
    }
    function accionesEncuesta(e, body) {
      var st = h('p', { class: 'form-status err' }), out = h('div'), btns = h('div', { class: 'row-btns' });
      function btn(t, fn, cls) { btns.appendChild(h('button', { class: 'btn ' + (cls || 'btn-ghost') + ' btn-sm', type: 'button', onclick: fn }, t)); }
      function estado(accion) { return function () { api('/encuestas/' + e.id + '/estado', { accion: accion }).then(listaEncuestas).catch(function (er) { st.textContent = er.message; }); }; }
      if (puedeEditar && e.estado === 'borrador') {
        btn('Editar', function () { editorEncuesta(e.id); });
        btn('Abrir encuesta', estado('abrir'), 'btn-primary');
        btn('Borrar', function () { if (confirmar('¿Borrar este borrador?')) api('/encuestas/' + e.id, undefined, 'DELETE').then(listaEncuestas).catch(function (er) { st.textContent = er.message; }); });
      }
      if (puedeEditar && e.estado === 'abierta') {
        btn('Cerrar encuesta', estado('cerrar'));
        if (!e.solo_afiliados) btn('Generar enlaces para simpatizantes', function () {
          api('/encuestas/' + e.id + '/enlaces', {}).then(function (r) {
            limpiar(out);
            if (!r.cantidad) { out.appendChild(h('p', { class: 'muted' }, 'No hay simpatizantes nuevos con consentimiento para recibir enlaces.')); return; }
            out.appendChild(secreto(r.cantidad + ' enlaces de un solo uso (solo se muestran ahora)', r.enlaces.map(function (x) { return x.email + '\t' + x.enlace; }).join('\n'), 'Un enlace por persona, correo y enlace separados por tabulador. Caducan al cerrar la encuesta.'));
          }).catch(function (er) { st.textContent = er.message; });
        });
      }
      if (e.estado !== 'borrador') btn('Ver resultados', function () { resultados(e.id, out, st); }, 'btn-primary');
      body.appendChild(btns); body.appendChild(st); body.appendChild(out);
    }
    function resultados(id, out, st) {
      limpiar(out);
      api('/encuestas/' + id + '/resultados').then(function (r) {
        out.appendChild(h('p', { class: 'muted' }, r.participaciones + ' participaciones' + (r.de_enlaces ? ' (' + r.de_enlaces + ' por enlace)' : '')));
        if (r.ocultos) { out.appendChild(h('p', { class: 'secret' }, r.aviso)); return; }
        r.resultados.forEach(function (q) {
          var caja = h('div', { class: 'res-q' }, h('strong', null, q.texto));
          if (q.tipo === 'texto') { var ul = h('ul', { class: 'res-texto' }); q.respuestas.forEach(function (t) { ul.appendChild(h('li', null, t)); }); caja.appendChild(q.respuestas.length ? ul : h('p', { class: 'muted' }, 'Sin respuestas.')); }
          else {
            var total = Math.max(1, Object.keys(q.cuenta).reduce(function (s, k) { return s + q.cuenta[k]; }, 0));
            Object.keys(q.cuenta).forEach(function (k) {
              var pc = Math.round(q.cuenta[k] * 100 / total);
              caja.appendChild(h('div', { class: 'barra' }, h('span', null, k), h('div', { class: 'barra-fondo' }, h('i', { style: 'width:' + pc + '%' })), h('b', null, q.cuenta[k] + ' · ' + pc + '%')));
            });
            if (q.media) caja.appendChild(h('p', { class: 'muted' }, 'Media: ' + q.media));
          }
          out.appendChild(caja);
        });
      }).catch(function (er) { st.textContent = er.message; });
    }
    function editorEncuesta(id) {
      limpiar(zona);
      var base = id ? api('/encuestas/' + id) : Promise.resolve({ titulo: '', descripcion: '', anonima: true, solo_afiliados: true, preguntas: [{ tipo: 'opcion_unica', texto: '', opciones: ['', ''], obligatoria: true }] });
      base.then(function (e) {
        var preguntas = e.preguntas.map(function (q) { return { tipo: q.tipo, texto: q.texto, opciones: q.tipo === 'escala' ? ['', ''] : (q.opciones || ['', '']), min: q.tipo === 'escala' ? q.opciones.min : 1, max: q.tipo === 'escala' ? q.opciones.max : 5, obligatoria: q.obligatoria }; });
        var form = h('form', { class: 'form-card', novalidate: true });
        var anon = h('input', { type: 'checkbox', id: 'e-an' }); anon.checked = !!e.anonima;
        var solo = h('input', { type: 'checkbox', id: 'e-so' }); solo.checked = !!e.solo_afiliados;
        var qs = h('div', { style: 'display:grid;gap:16px' }), st = h('p', { class: 'form-status err', role: 'alert' });
        var prov = selectProvincias('e-pr', 'Ámbito', 'Toda la organización'); if (e.ambito_territorio_id) prov.querySelector('select').value = e.ambito_territorio_id;
        var cierre = campo('e-ci', 'Cierra el (opcional)', { type: 'date' }); if (e.cierra_en) cierre.querySelector('input').value = e.cierra_en.slice(0, 10);
        function pintar() {
          limpiar(qs);
          preguntas.forEach(function (q, i) {
            var tipo = h('select', { 'aria-label': 'Tipo' }, [['opcion_unica', 'Una opción'], ['opcion_multiple', 'Varias opciones'], ['escala', 'Escala'], ['texto', 'Texto libre']].map(function (o) { return h('option', { value: o[0], selected: o[0] === q.tipo }, o[1]); }));
            tipo.addEventListener('change', function () { q.tipo = tipo.value; pintar(); });
            var txt = h('input', { value: q.texto, placeholder: 'Pregunta ' + (i + 1), 'aria-label': 'Texto de la pregunta', oninput: function (ev) { q.texto = ev.target.value; } });
            var caja = h('div', { class: 'qq' }, h('div', { class: 'row-btns' }, tipo, h('label', { class: 'consent' }, h('input', { type: 'checkbox', checked: q.obligatoria, onchange: function (ev) { q.obligatoria = ev.target.checked; } }), h('span', null, 'Obligatoria')),
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { preguntas.splice(i, 1); pintar(); } }, 'Quitar')), txt);
            if (q.tipo === 'opcion_unica' || q.tipo === 'opcion_multiple') {
              q.opciones.forEach(function (o, j) { caja.appendChild(h('input', { value: o, placeholder: 'Opción ' + (j + 1), 'aria-label': 'Opción ' + (j + 1), oninput: function (ev) { q.opciones[j] = ev.target.value; } })); });
              caja.appendChild(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { if (q.opciones.length < 12) { q.opciones.push(''); pintar(); } } }, '+ opción'));
            } else if (q.tipo === 'escala') {
              caja.appendChild(h('div', { class: 'field-pair' }, h('input', { type: 'number', value: q.min, 'aria-label': 'Mínimo', oninput: function (ev) { q.min = Number(ev.target.value); } }), h('input', { type: 'number', value: q.max, 'aria-label': 'Máximo', oninput: function (ev) { q.max = Number(ev.target.value); } })));
            }
            qs.appendChild(caja);
          });
        }
        pintar();
        form.appendChild(h('h2', null, id ? 'Editar borrador' : 'Nueva encuesta'));
        form.appendChild(campo('e-t', 'Título', { value: e.titulo, required: true }));
        form.appendChild(campo('e-d', 'Descripción', { rows: 2 }, 'textarea')); form.querySelector('#e-d').value = e.descripcion || '';
        form.appendChild(h('div', { class: 'field-pair' }, prov, cierre));
        form.appendChild(h('label', { class: 'consent', for: 'e-an' }, anon, h('span', null, 'Anónima (no se guarda quién respondió qué; los resultados se muestran a partir de 5 participaciones)')));
        form.appendChild(h('label', { class: 'consent', for: 'e-so' }, solo, h('span', null, 'Solo afiliados (si la desmarcas, podrás enviar enlaces a simpatizantes)')));
        var tipoE = h('select', { id: 'e-tipo' }, h('option', { value: 'encuesta', selected: e.tipo !== 'votacion' }, 'Encuesta'), h('option', { value: 'votacion', selected: e.tipo === 'votacion' }, 'Votación (una pregunta, voto secreto, solo afiliados)'));
        var quorum = campo('e-qu', 'Quórum (mínimo de participaciones, opcional)', { type: 'number', min: '1', value: e.quorum || '' });
        var vinc = h('input', { type: 'checkbox', id: 'e-vi' }); vinc.checked = !!e.vinculante;
        var pubR = h('input', { type: 'checkbox', id: 'e-pu' }); pubR.checked = !!e.resultados_publicos;
        var propId = campo('e-pp', 'Idea vinculada (id, opcional)', { type: 'number', min: '1', value: e.propuesta_id || '' });
        form.appendChild(h('div', { class: 'field' }, h('label', { for: 'e-tipo' }, 'Tipo'), tipoE));
        form.appendChild(h('div', { class: 'field-pair' }, quorum, propId));
        form.appendChild(h('label', { class: 'consent', for: 'e-vi' }, vinc, h('span', null, 'Vinculante (la organización se compromete a aplicar el resultado)')));
        form.appendChild(h('label', { class: 'consent', for: 'e-pu' }, pubR, h('span', null, 'Publicar los resultados en la web al cerrar')));
        form.appendChild(qs);
        form.appendChild(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { preguntas.push({ tipo: 'opcion_unica', texto: '', opciones: ['', ''], min: 1, max: 5, obligatoria: true }); pintar(); } }, '+ Añadir pregunta'));
        form.appendChild(h('div', { class: 'row-btns' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Guardar borrador'), h('button', { class: 'btn btn-ghost', type: 'button', onclick: listaEncuestas }, 'Cancelar')));
        form.appendChild(st);
        form.addEventListener('submit', function (ev) {
          ev.preventDefault();
          var cuerpo = {
            titulo: $('e-t').value, descripcion: $('e-d').value, anonima: anon.checked, solo_afiliados: solo.checked,
            tipo: tipoE.value, quorum: $('e-qu').value || null, vinculante: vinc.checked, resultados_publicos: pubR.checked, propuesta_id: $('e-pp').value || null,
            ambito_territorio_id: prov.querySelector('select').value || null, cierra_en: cierre.querySelector('input').value ? cierre.querySelector('input').value + 'T21:59:59Z' : null,
            preguntas: preguntas.map(function (q) { var o = { tipo: q.tipo, texto: q.texto, obligatoria: q.obligatoria }; if (q.tipo === 'escala') { o.min = q.min; o.max = q.max; } else if (q.opciones && q.tipo !== 'texto') o.opciones = q.opciones; return o; })
          };
          (id ? api('/encuestas/' + id, cuerpo, 'PATCH') : api('/encuestas', cuerpo)).then(listaEncuestas).catch(function (er) { st.textContent = er.message; });
        });
        zona.appendChild(form);
      }).catch(function (er) { errorSeccion(c, er); });
    }
  }



  // --- Contenido web: editor visual de textos e imágenes ---
  // Reduce las fotos antes de subirlas (las del móvil pesan mucho): máx. 2200 px y JPEG
  function prepararImagen(archivo) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(archivo), im = new Image();
      im.onload = function () {
        URL.revokeObjectURL(url);
        var w = im.naturalWidth, hh = im.naturalHeight, k = Math.min(1, 2200 / Math.max(w, hh));
        if (k === 1 && /^image\/(jpeg|png|webp)$/.test(archivo.type) && archivo.size < 4 * 1024 * 1024) return resolve(archivo);
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(hh * k);
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        c.toBlob(function (b) { resolve(b || archivo); }, 'image/jpeg', 0.86);
      };
      im.onerror = function () { URL.revokeObjectURL(url); resolve(archivo); };
      im.src = url;
    });
  }
  function subirImagen(original) {
    return prepararImagen(original).then(function (archivo) { return fetch('/api/intranet/medios', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': archivo.type }, body: archivo }); })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'No se pudo subir'); return d; }); });
  }
  function sContenido(c) {
    c.appendChild(h('p', { class: 'muted' }, 'Elige una página y púlsa "Editar": se abre la propia web y haces clic en cualquier texto para cambiarlo, o en "Cambiar foto" sobre cualquier imagen. Lo que guardes se publica al momento y siempre se puede restaurar el original.'));
    var lista = h('div', { class: 'rows' }); c.appendChild(lista);
    fetch('paginas.json').then(function (r) { return r.json(); }).then(function (ps) {
      ps.forEach(function (p) {
        lista.appendChild(h('div', { class: 'audit-row' }, h('strong', null, p.titulo), h('span', { class: 'muted' }, p.archivo),
          h('a', { class: 'btn btn-primary btn-sm', href: p.archivo + '?editar=1', target: '_blank', rel: 'noopener' }, 'Editar'), h('a', { class: 'btn btn-ghost btn-sm', href: p.archivo, target: '_blank', rel: 'noopener' }, 'Ver')));
      });
    }).catch(function () { lista.appendChild(h('p', { class: 'muted' }, 'No se pudo cargar la lista de páginas.')); });
    c.appendChild(h('h3', { style: 'margin-top:28px' }, 'Cambios publicados'));
    var cambios = h('div', { class: 'rows' }); c.appendChild(cambios);
    function cargarCambios() {
      limpiar(cambios);
      api('/contenido').then(function (cs) {
        if (!cs.length) cambios.appendChild(h('p', { class: 'muted' }, 'Todavía no has cambiado nada: la web muestra los textos originales.'));
        cs.forEach(function (x) {
          var esImg = x.clave.indexOf('img:') === 0;
          cambios.appendChild(h('div', { class: 'audit-row' }, h('span', { class: 'tag' }, x.pagina), esImg ? h('img', { src: x.valor, alt: '', class: 'noticia-mini' }) : h('span', { style: 'flex:1;min-width:12rem' }, x.valor.replace(/<[^>]+>/g, ' ').slice(0, 140)), h('span', { class: 'muted' }, fecha(x.actualizado_en) + (x.username ? ' · @' + x.username : '')),
            h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { if (confirmar('Se volverá al original de este elemento. ¿Continuar?')) api('/contenido', { pagina: x.pagina, clave: x.clave }, 'DELETE').then(cargarCambios).catch(function (e) { alert(e.message); }); } }, 'Restaurar original')));
        });
      }).catch(function (e) { errorSeccion(c, e); });
    }
    cargarCambios();
  }

  // --- Ideas ciudadanas (moderación) ---
  var EST_PROP = [['recibida', 'Por revisar'], ['en_estudio', 'En estudio'], ['en_debate', 'En debate'], ['en_votacion', 'En votación'], ['aprobada', 'Aprobadas'], ['en_marcha', 'En marcha'], ['descartada', 'Descartadas'], ['rechazada', 'Rechazadas']];
  function sPropuestas(c) {
    var puede = usuario.rol === 'admin' || usuario.rol === 'moderador', estado = 'recibida', lista = h('div', { class: 'rows' });
    c.appendChild(filtros(EST_PROP, estado, function (v) { estado = v; cargar(); }));
    c.appendChild(lista);
    var den = h('div'); c.appendChild(den);
    function cargar() {
      limpiar(lista);
      api('/propuestas?estado=' + estado).then(function (ps) {
        if (!ps.length) lista.appendChild(h('p', { class: 'muted' }, 'No hay ideas en este estado.'));
        ps.forEach(function (p) {
          lista.appendChild(fila(p.titulo, (p.autor_email ? p.autor_nombre + ' · ' + p.autor_email : 'Sin correo'), (p.tipo === 'necesidad' ? 'NECESIDAD · ' + (p.publicar_ok ? 'autoriza publicar' : 'NO autoriza publicar') + ' · ' + (p.provincia || '') : (p.area || '')) + ' · ' + p.apoyos + ' apoyos · ' + fecha(p.creada_en), function (body) {
            body.appendChild(h('p', { style: 'white-space:pre-wrap' }, p.texto));
            if (p.motivo_rechazo) body.appendChild(h('p', { class: 'muted' }, 'Motivo del rechazo: ' + p.motivo_rechazo));
            if (!puede) return;
            var st = h('p', { class: 'form-status err' }), btns = h('div', { class: 'row-btns' });
            function pasar(nuevo, texto, pideNota) {
              btns.appendChild(h('button', { class: 'btn ' + (nuevo === 'en_debate' || nuevo === 'en_estudio' ? 'btn-primary' : 'btn-ghost') + ' btn-sm', type: 'button', onclick: function () {
                var nota = window.prompt(pideNota ? 'Motivo (se publicará / se enviará a la persona):' : 'Nota pública sobre este cambio (opcional):'); if (nota === null) return;
                var cuerpo = { estado: nuevo, nota: nota };
                if (nuevo === 'en_votacion') { var v = window.prompt('Número (id) de la votación vinculada:'); if (!v) return; cuerpo.votacion_id = Number(v); }
                api('/propuestas/' + p.id + '/estado', cuerpo).then(cargar).catch(function (e) { st.textContent = e.message; });
              } }, texto));
            }
            if (p.estado === 'recibida') { pasar('en_estudio', 'Publicar (en estudio)'); pasar('en_debate', 'Publicar en debate'); pasar('rechazada', 'Rechazar', true); }
            else if (p.estado !== 'rechazada') {
              if (p.estado !== 'en_debate') pasar('en_debate', 'Pasar a debate'); pasar('en_votacion', 'Pasar a votación'); pasar('aprobada', 'Aprobar'); pasar('en_marcha', 'En marcha'); pasar('descartada', 'Descartar', true);
            }
            body.appendChild(btns); body.appendChild(st);
          }));
        });
      }).catch(function (e) { errorSeccion(c, e); });
    }
    cargar();
    if (puede) {
      api('/denuncias').then(function (ds) {
        if (!ds.length) return;
        den.appendChild(h('h3', { style: 'margin-top:28px' }, 'Comentarios denunciados'));
        ds.forEach(function (d) {
          den.appendChild(h('div', { class: 'audit-row' }, h('strong', null, d.denuncias + ' denuncia(s)'), h('span', { class: 'muted' }, d.oculto ? '(oculto)' : ''), h('span', { style: 'flex-basis:100%;white-space:pre-wrap' }, d.texto),
            h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { api('/comentarios/' + d.id + '/moderar', { ocultar: true }).then(function () { irA('propuestas'); }); } }, 'Ocultar'),
            h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { api('/comentarios/' + d.id + '/moderar', { ocultar: false }).then(function () { irA('propuestas'); }); } }, 'Mantener')));
        });
      }).catch(function () {});
    }
  }

  // --- Agenda ---
  function aLocalInput(iso) { if (!iso) return ''; var d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
  function sEventos(c) {
    var zona = h('div'); c.appendChild(zona); lista();
    function lista() {
      limpiar(zona); zona.appendChild(h('p', null, h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: function () { editor(null); } }, '+ Nuevo acto')));
      var rows = h('div', { class: 'rows' }); zona.appendChild(rows);
      api('/eventos').then(function (es) {
        if (!es.length) rows.appendChild(h('p', { class: 'muted' }, 'Aún no hay actos.'));
        es.forEach(function (e) {
          rows.appendChild(fila(e.titulo, (e.lugar || 'Sin lugar') + ' · ' + e.inscritos + ' inscritos' + (e.aforo ? ' / ' + e.aforo : ''), e.estado.toUpperCase() + ' · ' + fechaHora(e.inicio), function (body) {
            var st = h('p', { class: 'form-status err' }), out = h('div'), btns = h('div', { class: 'row-btns' });
            function b(t, fn) { btns.appendChild(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: fn }, t)); }
            function estado(v) { return function () { api('/eventos/' + e.id, { estado: v }, 'PATCH').then(lista).catch(function (er) { st.textContent = er.message; }); }; }
            if (e.estado !== 'publicado') b('Publicar', estado('publicado')); if (e.estado === 'publicado') { b('Cancelar acto', function () { if (confirmar('¿Cancelar el acto?')) estado('cancelado')(); }); b('Volver a borrador', estado('borrador')); }
            b('Editar', function () { editor(e); });
            b('Ver inscritos', function () { api('/eventos/' + e.id + '/inscritos').then(function (ins) { limpiar(out).appendChild(secreto(ins.length + ' inscritos', ins.map(function (i) { return i.nombre + '\t' + i.email; }).join('\n') || '(ninguno)')); }).catch(function (er) { st.textContent = er.message; }); });
            body.appendChild(btns); body.appendChild(st); body.appendChild(out);
          }));
        });
      }).catch(function (e) { errorSeccion(c, e); });
    }
    function editor(e) {
      limpiar(zona);
      var f = h('form', { class: 'form-card', novalidate: true }, h('h2', null, e ? 'Editar acto' : 'Nuevo acto'),
        campo('ev-t', 'Título', { value: e ? e.titulo : '', required: true }), campo('ev-l', 'Lugar', { value: e ? e.lugar || '' : '' }),
        h('div', { class: 'field-pair' }, campo('ev-i', 'Inicio', { type: 'datetime-local', value: e ? aLocalInput(e.inicio) : '', required: true }), campo('ev-f', 'Fin (opcional)', { type: 'datetime-local', value: e ? aLocalInput(e.fin) : '' })),
        campo('ev-a', 'Aforo (vacío = sin límite)', { type: 'number', min: '1', value: e && e.aforo ? e.aforo : '' }),
        campo('ev-d', 'Descripción', { rows: 4 }, 'textarea'), h('div', { class: 'row-btns' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Guardar'), h('button', { class: 'btn btn-ghost', type: 'button', onclick: lista }, 'Cancelar')), h('p', { class: 'form-status err', role: 'alert' }));
      f.querySelector('#ev-d').value = e ? e.descripcion || '' : '';
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var cuerpo = { titulo: $('ev-t').value, lugar: $('ev-l').value, inicio: $('ev-i').value ? new Date($('ev-i').value).toISOString() : '', fin: $('ev-f').value ? new Date($('ev-f').value).toISOString() : null, aforo: $('ev-a').value || null, descripcion: $('ev-d').value };
        (e ? api('/eventos/' + e.id, cuerpo, 'PATCH') : api('/eventos', cuerpo)).then(lista).catch(function (er) { msg(f, er.message); });
      });
      zona.appendChild(f);
    }
  }

  // --- Noticias ---
  function subirDocumento(archivo) {
    return fetch('/api/intranet/documentos', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/pdf' }, body: archivo })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'No se pudo subir'); return d; }); });
  }
  function sNoticias(c) {
    var CATS = ['Noticia', 'Nota de prensa', 'Comunicado', 'Opinión', 'Evento'];
    var zona = h('div'); c.appendChild(zona); lista();
    function lista() {
      limpiar(zona); zona.appendChild(h('p', null, h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: function () { editor(null); } }, '+ Nueva publicación'), ' ', h('a', { class: 'btn btn-ghost btn-sm', href: '/noticias', target: '_blank', rel: 'noopener' }, 'Ver el blog')));
      var rows = h('div', { class: 'rows' }); zona.appendChild(rows);
      api('/noticias').then(function (ns) {
        if (!ns.length) rows.appendChild(h('p', { class: 'muted' }, 'Aún no hay publicaciones.'));
        ns.forEach(function (n) {
          rows.appendChild(fila(n.titulo, n.resumen || '', (n.publicada ? 'PUBLICADA' : 'BORRADOR') + ' · ' + (n.categoria || 'Noticia') + ' · ' + fecha(n.fecha) + ' · 💬 ' + n.comentarios + ' · ♥ ' + n.me_gusta + (n.adjuntos.length ? ' · 📎 ' + n.adjuntos.length : ''), function (body) {
            var st = h('p', { class: 'form-status err' }), com = h('div', { class: 'rows' });
            body.appendChild(h('div', { class: 'row-btns' },
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { editor(n); } }, 'Editar'),
              n.publicada ? h('a', { class: 'btn btn-ghost btn-sm', href: '/noticias?id=' + n.id, target: '_blank', rel: 'noopener' }, 'Ver publicada') : null,
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { api('/noticias/' + n.id, { publicada: !n.publicada }, 'PATCH').then(lista).catch(function (e) { st.textContent = e.message; }); } }, n.publicada ? 'Despublicar' : 'Publicar'),
              h('button', { class: 'btn btn-ghost btn-sm btn-peligro', type: 'button', onclick: function () { if (confirmar('¿Borrar la publicación y sus comentarios?')) api('/noticias/' + n.id, undefined, 'DELETE').then(lista).catch(function (e) { st.textContent = e.message; }); } }, 'Borrar')));
            body.appendChild(st);
            if (n.comentarios || n.me_gusta) {
              body.appendChild(h('h3', { style: 'margin-top:14px;font-size:1.05rem' }, 'Comentarios'));
              body.appendChild(com); cargarCom();
            }
            function cargarCom() {
              api('/noticias/' + n.id + '/comentarios').then(function (cs) {
                limpiar(com); if (!cs.length) com.appendChild(h('p', { class: 'muted' }, 'Sin comentarios.'));
                cs.forEach(function (x) {
                  com.appendChild(h('div', { class: 'audit-row' }, h('strong', null, x.nombre + ' ' + x.apellidos), h('span', { class: 'muted' }, fecha(x.creado_en) + (x.oculto ? ' · OCULTO' : '')), h('span', { style: 'flex-basis:100%;white-space:pre-wrap' }, x.texto),
                    h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { api('/noticias/comentarios/' + x.id + '/ocultar', {}).then(cargarCom).catch(function (e) { st.textContent = e.message; }); } }, x.oculto ? 'Mostrar' : 'Ocultar'),
                    h('button', { class: 'btn btn-ghost btn-sm btn-peligro', type: 'button', onclick: function () { if (confirmar('¿Borrar el comentario?')) api('/noticias/comentarios/' + x.id, undefined, 'DELETE').then(cargarCom).catch(function (e) { st.textContent = e.message; }); } }, 'Borrar')));
                });
              }).catch(function (e) { st.textContent = e.message; });
            }
          }));
        });
      }).catch(function (e) { errorSeccion(c, e); });
    }
    function editor(n) {
      limpiar(zona); var pub = h('input', { type: 'checkbox', id: 'nt-p' }); pub.checked = n ? !!n.publicada : false;
      var imagen = n ? n.imagen || '' : '', vista = h('img', { class: 'noticia-img', alt: '', hidden: !imagen, src: imagen || null }), estadoImg = h('p', { class: 'form-status' });
      var archivo = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', id: 'nt-i' });
      archivo.addEventListener('change', function () { if (!archivo.files[0]) return; estadoImg.className = 'form-status'; estadoImg.textContent = 'Preparando y subiendo la foto…'; subirImagen(archivo.files[0]).then(function (r) { imagen = r.url; vista.src = r.url; vista.hidden = false; estadoImg.textContent = 'Foto lista ✓'; }).catch(function (e) { estadoImg.className = 'form-status err'; estadoImg.textContent = 'No se pudo subir la foto: ' + e.message; }); });
      var portada = h('div', { class: 'field' }, h('label', { for: 'nt-i' }, 'Imagen de portada (opcional, PNG/JPG/WebP hasta 6 MB)'), archivo, estadoImg, vista, h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { imagen = ''; vista.hidden = true; archivo.value = ''; } }, 'Quitar imagen'));
      // Documentos PDF adjuntos (nota de prensa, comunicado, dossier…)
      var adj = n ? n.adjuntos.slice() : [], listaAdj = h('div', { class: 'rows' }), estadoDoc = h('span', { class: 'muted' });
      var pdf = h('input', { type: 'file', accept: 'application/pdf', id: 'nt-d' });
      function pintarAdj() {
        limpiar(listaAdj);
        adj.forEach(function (d, i) {
          var nombre = h('input', { type: 'text', value: d.nombre, maxlength: '120', 'aria-label': 'Nombre del documento' });
          nombre.addEventListener('input', function () { d.nombre = nombre.value; });
          listaAdj.appendChild(h('div', { class: 'audit-row' }, h('span', { class: 'tag' }, 'PDF'), nombre, h('a', { class: 'link', href: d.url, target: '_blank', rel: 'noopener' }, 'Abrir'), h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { adj.splice(i, 1); pintarAdj(); } }, 'Quitar')));
        });
      }
      pintarAdj();
      pdf.addEventListener('change', function () {
        var f = pdf.files[0]; if (!f) return; estadoDoc.textContent = 'Subiendo…';
        subirDocumento(f).then(function (r) { adj.push({ nombre: f.name.replace(/\.pdf$/i, ''), url: r.url, bytes: r.bytes }); pintarAdj(); estadoDoc.textContent = 'Documento añadido'; pdf.value = ''; }).catch(function (e) { estadoDoc.textContent = e.message; });
      });
      var docs = h('div', { class: 'field' }, h('label', { for: 'nt-d' }, 'Documentos PDF adjuntos (notas de prensa, comunicados… hasta 15 MB cada uno)'), pdf, estadoDoc, listaAdj);
      var cat = h('select', { id: 'nt-k' }); CATS.forEach(function (k) { cat.appendChild(h('option', { value: k }, k)); }); cat.value = n && n.categoria ? n.categoria : 'Noticia';
      var f = h('form', { class: 'form-card', novalidate: true }, h('h2', null, n ? 'Editar publicación' : 'Nueva publicación'),
        h('div', { class: 'field' }, h('label', { for: 'nt-k' }, 'Tipo'), cat),
        campo('nt-t', 'Título', { value: n ? n.titulo : '', required: true }), campo('nt-r', 'Resumen (opcional, sale en el listado y al compartir)', { value: n ? n.resumen || '' : '' }),
        campo('nt-c', 'Texto', { rows: 14 }, 'textarea'),
        h('p', { class: 'muted', style: 'font-size:.9rem' }, 'Formato: una línea en blanco separa párrafos · "## Título" para un apartado · "- " para listas · "> " para una cita · **negrita** · [texto](https://enlace) · los enlaces sueltos se activan solos.'),
        portada, docs,
        h('label', { class: 'consent', for: 'nt-p' }, pub, h('span', null, 'Publicada')), h('div', { class: 'row-btns' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Guardar'), h('button', { class: 'btn btn-ghost', type: 'button', onclick: lista }, 'Cancelar')), h('p', { class: 'form-status err', role: 'alert' }));
      f.querySelector('#nt-c').value = n ? n.cuerpo : '';
      f.addEventListener('submit', function (ev) {
        ev.preventDefault(); var cuerpo = { titulo: $('nt-t').value, resumen: $('nt-r').value, cuerpo: $('nt-c').value, imagen: imagen || null, categoria: cat.value, adjuntos: adj, publicada: pub.checked };
        (n ? api('/noticias/' + n.id, cuerpo, 'PATCH') : api('/noticias', cuerpo)).then(lista).catch(function (er) { msg(f, er.message); });
      });
      zona.appendChild(f);
    }
  }

  // --- Voluntariado ---
  function sVoluntarios(c) {
    var estado = 'nuevo', lista = h('div', { class: 'rows' });
    c.appendChild(filtros([['nuevo', 'Nuevos'], ['contactado', 'Contactados'], ['incorporado', 'Incorporados'], ['descartado', 'Descartados']], estado, function (v) { estado = v; cargar(); })); c.appendChild(lista);
    function cargar() {
      limpiar(lista);
      api('/voluntarios?estado=' + estado).then(function (vs) {
        if (!vs.length) lista.appendChild(h('p', { class: 'muted' }, 'Nadie en este estado.'));
        vs.forEach(function (v) {
          lista.appendChild(fila(v.nombre, v.email + (v.telefono ? ' · ' + v.telefono : ''), v.area + ' · ' + fecha(v.creada_en), function (body) {
            if (v.mensaje) body.appendChild(h('p', { style: 'white-space:pre-wrap' }, v.mensaje));
            var st = h('p', { class: 'form-status err' }), btns = h('div', { class: 'row-btns' });
            [['contactado', 'Marcar contactado'], ['incorporado', 'Incorporado'], ['descartado', 'Descartar']].forEach(function (x) { if (x[0] !== v.estado) btns.appendChild(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { api('/voluntarios/' + v.id + '/estado', { estado: x[0] }).then(cargar).catch(function (e) { st.textContent = e.message; }); } }, x[1])); });
            body.appendChild(btns); body.appendChild(st);
          }));
        });
      }).catch(function (e) { errorSeccion(c, e); });
    }
    cargar();
  }

  // Si ya hay sesión abierta, entra directo al panel
  api('/me').then(function (d) { abrirPanel(d.usuario); }).catch(function () { ver('v-login'); });
})();
