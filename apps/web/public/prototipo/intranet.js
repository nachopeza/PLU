/* Intranet de PLU: acceso con doble verificación y gestión por secciones según el rol. Habla con /api/intranet. */
(function () {
  var app = document.getElementById('app-intranet');
  if (!app) return;
  function $(id) { return document.getElementById(id); }
  var vistas = ['v-login', 'v-cambio', 'v-codigo', 'v-config', 'v-recuperacion', 'v-panel'];
  function ver(id) { vistas.forEach(function (v) { $(v).hidden = v !== id; }); window.scrollTo({ top: 0 }); }
  var ticket = null, usuario = null, provincias = null;

  // ---------- Utilidades ----------
  function api(ruta, cuerpo, metodo) {
    return fetch('/api/intranet' + ruta, {
      method: metodo || (cuerpo === undefined ? 'GET' : 'POST'),
      headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || 'Error'); e.status = r.status; e.datos = d; throw e; } return d; });
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
  function cargarProvincias() {
    if (provincias) return Promise.resolve();
    return fetch('/api/provincias').then(function (r) { return r.json(); }).then(function (d) { provincias = d; }).catch(function () { provincias = []; });
  }
  // Caja para datos que se muestran UNA sola vez (contraseñas temporales, enlaces)
  function secreto(titulo, texto, ayuda) {
    var area = h('textarea', { class: 'secret-area', readonly: true, rows: Math.min(8, texto.split('\n').length + 1) }); area.value = texto;
    var copiar = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { area.select(); try { navigator.clipboard.writeText(texto); copiar.textContent = 'Copiado'; } catch (e) { document.execCommand('copy'); } } }, 'Copiar');
    return h('div', { class: 'secret' }, h('strong', null, titulo), ayuda ? h('p', { class: 'muted' }, ayuda) : null, area, copiar);
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

  var ROLES = { admin: 'Administración', gestor: 'Gestión', moderador: 'Moderación', coordinador: 'Coordinación provincial', verificador: 'Verificación', tesoreria: 'Tesorería', auditor: 'Auditoría' };
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
  $('b-salir').addEventListener('click', function () { api('/logout', {}).finally(function () { usuario = null; ver('v-login'); }); });

  // ---------- Panel y secciones por rol ----------
  var SECCIONES = [
    ['resumen', 'Resumen', ['admin', 'gestor', 'coordinador']],
    ['inscripciones', 'Inscripciones', ['admin', 'gestor', 'coordinador']],
    ['personas', 'Personas', ['admin', 'gestor', 'coordinador']],
    ['solicitudes', 'Solicitudes', ['admin', 'gestor', 'coordinador']],
    ['propuestas', 'Ideas', ['admin', 'moderador', 'auditor']],
    ['encuestas', 'Encuestas y votaciones', ['admin', 'moderador', 'auditor']],
    ['eventos', 'Agenda', ['admin', 'moderador', 'gestor']],
    ['noticias', 'Noticias', ['admin', 'moderador']],
    ['voluntarios', 'Voluntariado', ['admin', 'moderador', 'gestor']],
    ['verificar', 'Verificar carné', ['admin', 'gestor', 'verificador']],
    ['carne', 'Carné', ['admin', 'gestor']],
    ['equipo', 'Equipo', ['admin']],
    ['auditoria', 'Auditoría', ['admin', 'auditor']]
  ];
  var VISTAS = { propuestas: sPropuestas, eventos: sEventos, noticias: sNoticias, voluntarios: sVoluntarios, resumen: sResumen, inscripciones: sInscripciones, personas: sPersonas, solicitudes: sSolicitudes, encuestas: sEncuestas, verificar: sVerificar, carne: sCarne, equipo: sEquipo, auditoria: sAuditoria };
  var detenerCamara = function () {};

  function abrirPanel(u) {
    usuario = u; $('p-nombre').textContent = u.nombre; $('p-rol').textContent = ROLES[u.rol] || u.rol;
    var tabs = limpiar($('p-tabs'));
    var propias = SECCIONES.filter(function (s) { return s[2].indexOf(u.rol) >= 0; });
    propias.forEach(function (s) { tabs.appendChild(h('button', { class: 'fbtn', type: 'button', 'data-s': s[0], 'aria-pressed': 'false', onclick: function () { irA(s[0]); } }, s[1])); });
    ver('v-panel');
    cargarProvincias().then(function () {
      var codigo = new URLSearchParams(location.search).get('v'); // viene del QR de un carné
      if (codigo && propias.some(function (s) { return s[0] === 'verificar'; })) irA('verificar', codigo);
      else if (propias.length) irA(propias[0][0]);
      else limpiar($('sec')).appendChild(h('p', { class: 'muted' }, 'Tu rol todavía no tiene secciones disponibles.'));
    });
  }
  function irA(id, arg) {
    detenerCamara();
    Array.prototype.forEach.call($('p-tabs').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.s === id)); });
    var cont = limpiar($('sec')); VISTAS[id](cont, arg);
  }

  // --- Resumen ---
  function sResumen(c) {
    var caja = h('div', { class: 'counters' }); c.appendChild(caja);
    api('/resumen').then(function (r) {
      [['Pendientes', r.afiliados.pendiente || 0], ['Afiliados activos', r.afiliados.activo || 0], ['Suspendidos', r.afiliados.suspendido || 0], ['Simpatizantes', r.simpatizantes || 0]].forEach(function (x) {
        caja.appendChild(h('div', { class: 'counter' }, h('b', null, String(x[1])), h('span', null, x[0])));
      });
    }).catch(function (e) { errorSeccion(c, e); });
    c.appendChild(h('p', { class: 'proto-note' }, 'Cuando haya dominio propio, el carné y la contraseña temporal se enviarán por correo. Mientras tanto, al aprobar una afiliación verás la contraseña temporal una sola vez para entregarla a la persona.'));
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
    [['Documento', (f.documento_tipo || '') + ' ' + (f.documento || '')], ['Nacimiento', f.fecha_nacimiento || '—'], ['Provincia', (f.provincia || '') + (f.codigo_postal ? ' (' + f.codigo_postal + ')' : '')], ['Teléfono', f.telefono || '—'], ['Correo', f.email], ['Estado', ESTADOS[f.estado] || f.estado]].forEach(function (x) {
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
        ok.disabled = no.disabled = true;
        api('/inscripciones/' + f.id + '/aprobar', {}).then(function (r) {
          st.className = 'form-status'; st.textContent = 'Aprobada. Número de afiliado ' + r.numero_afiliado + '. Carné emitido.';
          salida.appendChild(secreto('Contraseña temporal (solo se muestra ahora)', 'Correo: ' + f.email + '\nContraseña: ' + r.password_temporal, 'Entrégala a la persona por un canal seguro. Caduca en 7 días y deberá cambiarla al entrar.'));
        }).catch(function (e) { ok.disabled = no.disabled = false; st.textContent = e.message; });
      });
      no.addEventListener('click', function () {
        var motivo = window.prompt('Motivo del rechazo (opcional):'); if (motivo === null) return;
        ok.disabled = no.disabled = true;
        api('/inscripciones/' + f.id + '/rechazar', { motivo: motivo }).then(recargar).catch(function (e) { ok.disabled = no.disabled = false; st.textContent = e.message; });
      });
    }).catch(function (e) { body.textContent = e.message; });
  }

  // --- Personas ---
  function sPersonas(c) {
    var q = campo('f-q', 'Buscar (nombre, correo, nº)', { type: 'search' }), tipo = h('select', { id: 'f-t' }), est = h('select', { id: 'f-e' });
    [['', 'Todos'], ['afiliado', 'Afiliados'], ['simpatizante', 'Simpatizantes']].forEach(function (o) { tipo.appendChild(h('option', { value: o[0] }, o[1])); });
    [['', 'Cualquier estado'], ['pendiente', 'Pendiente'], ['activo', 'Activo'], ['suspendido', 'Suspendido'], ['baja', 'Baja'], ['rechazado', 'Rechazado']].forEach(function (o) { est.appendChild(h('option', { value: o[0] }, o[1])); });
    var prov = usuario.rol === 'coordinador' ? null : selectProvincias('f-p', 'Provincia', 'Todas');
    var barra = h('div', { class: 'toolbar' }, q, h('div', { class: 'field' }, h('label', { for: 'f-t' }, 'Tipo'), tipo), h('div', { class: 'field' }, h('label', { for: 'f-e' }, 'Estado'), est), prov);
    c.appendChild(barra);
    if (['admin', 'gestor'].indexOf(usuario.rol) >= 0) c.appendChild(h('p', null, h('a', { class: 'link', href: '/api/intranet/export/afiliados.csv' }, 'Descargar listado de afiliados (CSV, sin documento) →')));
    var lista = h('div', { class: 'rows' }), vacio = h('p', { class: 'muted', hidden: true }, 'Sin resultados.'); c.appendChild(lista); c.appendChild(vacio);
    var espera;
    function cargar() {
      var p = new URLSearchParams(); if (q.querySelector('input').value) p.set('q', q.querySelector('input').value); if (tipo.value) p.set('tipo', tipo.value); if (est.value) p.set('estado', est.value);
      if (prov && prov.querySelector('select').value) p.set('provincia', prov.querySelector('select').value);
      api('/personas?' + p).then(function (filas) {
        limpiar(lista); vacio.hidden = filas.length > 0;
        filas.forEach(function (x) {
          lista.appendChild(fila((x.nombre + ' ' + x.apellidos).trim(), x.email, (x.tipo === 'afiliado' ? 'Afiliado' : 'Simpatizante') + ' · ' + (ESTADOS[x.estado] || x.estado) + ' · ' + (x.provincia || '') + (x.numero_afiliado ? ' · Nº ' + x.numero_afiliado : ''), function (body) { fichaPersona(x.id, body, cargar); }));
        });
      }).catch(function (e) { errorSeccion(c, e); });
    }
    [q.querySelector('input'), tipo, est].concat(prov ? [prov.querySelector('select')] : []).forEach(function (n) { n.addEventListener('input', function () { clearTimeout(espera); espera = setTimeout(cargar, 250); }); });
    cargar();
  }
  function fichaPersona(id, body, recargar) {
    api('/personas/' + id).then(function (f) {
      limpiar(body).appendChild(datosFicha(f));
      if (f.carne) body.appendChild(h('p', { class: 'muted' }, 'Carné v' + f.carne.version + ' · emitido ' + fecha(f.carne.emitido_en) + ' · válido hasta ' + fecha(f.carne.valido_hasta)));
      if (f.movimientos.length) body.appendChild(h('p', { class: 'muted' }, 'Historial: ' + f.movimientos.map(function (m) { return (MOV[m.tipo] || m.tipo) + ' (' + fecha(m.fecha) + ')'; }).join(' · ')));
      var salida = h('div'), st = h('p', { class: 'form-status err' });
      if (['admin', 'gestor'].indexOf(usuario.rol) >= 0 && f.tipo === 'afiliado') {
        var acciones = h('div', { class: 'row-btns' });
        function estadoBtn(texto, accion, aviso) {
          acciones.appendChild(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () {
            if (!confirmar(aviso)) return; var motivo = window.prompt('Motivo (opcional):'); if (motivo === null) return;
            api('/personas/' + id + '/estado', { accion: accion, motivo: motivo }).then(recargar).catch(function (e) { st.textContent = e.message; });
          } }, texto));
        }
        if (f.estado === 'activo') { estadoBtn('Suspender', 'suspender', '¿Suspender a esta persona?'); }
        if (f.estado === 'suspendido') estadoBtn('Reactivar', 'reactivar', '¿Reactivar a esta persona?');
        if (f.estado === 'activo' || f.estado === 'suspendido') estadoBtn('Dar de baja', 'baja', 'La baja revoca el carné y cierra sus sesiones. ¿Continuar?');
        if (f.estado === 'activo') {
          acciones.appendChild(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () {
            if (!confirmar('Se generará una contraseña temporal nueva y se cerrarán sus sesiones. ¿Continuar?')) return;
            api('/personas/' + id + '/reset-password', {}).then(function (r) { limpiar(salida).appendChild(secreto('Contraseña temporal (solo se muestra ahora)', 'Correo: ' + f.email + '\nContraseña: ' + r.password_temporal)); }).catch(function (e) { st.textContent = e.message; });
          } }, 'Nueva contraseña'));
          var sel = selectProvincias('pp-' + id, 'Cambiar de provincia', 'Elegir…');
          sel.querySelector('select').addEventListener('change', function (ev) {
            var v = ev.target.value; if (!v || !confirmar('Se cambiará la provincia y se emitirá un carné nuevo (el número de afiliado se mantiene). ¿Continuar?')) { ev.target.value = ''; return; }
            api('/personas/' + id + '/provincia', { provincia_id: Number(v) }).then(recargar).catch(function (e) { st.textContent = e.message; });
          });
          body.appendChild(acciones); body.appendChild(sel);
        } else body.appendChild(acciones);
      }
      body.appendChild(st); body.appendChild(salida);
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
            var detalle = s.detalle; try { var j = JSON.parse(s.detalle); if (j && j.provincia_id) { var pr = (provincias || []).filter(function (x) { return x.id === j.provincia_id; })[0]; detalle = 'Nueva provincia: ' + (pr ? pr.nombre : j.provincia_id) + (j.nota ? ' — ' + j.nota : ''); } } catch (e) { /* texto libre */ }
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
    if (window.BarcodeDetector) {
      btnCam.addEventListener('click', function () {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (stream) {
          video.srcObject = stream; video.hidden = false; video.play(); var vivo = true;
          detenerCamara = function () { vivo = false; stream.getTracks().forEach(function (t) { t.stop(); }); video.hidden = true; detenerCamara = function () {}; };
          var det = new BarcodeDetector({ formats: ['qr_code'] });
          (function bucle() {
            if (!vivo) return;
            det.detect(video).then(function (r) {
              if (r.length) {
                var m = /[?&]v=([^&]+)/.exec(r[0].rawValue || '');
                if (m) { detenerCamara(); consulta('codigo=' + m[1]); return; }
              }
              setTimeout(bucle, 250);
            }).catch(function () { setTimeout(bucle, 400); });
          })();
        }).catch(function () { res.appendChild(h('p', { class: 'form-status err' }, 'No se pudo abrir la cámara. Escribe el número de afiliado.')); });
      });
      c.appendChild(btnCam); c.appendChild(video);
    } else c.appendChild(h('p', { class: 'muted' }, 'Este navegador no puede leer QR desde aquí. Con la cámara del móvil, abre el enlace del QR (te traerá a esta pantalla), o escribe el número.'));
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
          lista.appendChild(fila(p.titulo, p.autor_nombre + ' · ' + p.autor_email, (p.area || '') + ' · ' + p.apoyos + ' apoyos · ' + fecha(p.creada_en), function (body) {
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
  function sNoticias(c) {
    var zona = h('div'); c.appendChild(zona); lista();
    function lista() {
      limpiar(zona); zona.appendChild(h('p', null, h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: function () { editor(null); } }, '+ Nueva noticia')));
      var rows = h('div', { class: 'rows' }); zona.appendChild(rows);
      api('/noticias').then(function (ns) {
        if (!ns.length) rows.appendChild(h('p', { class: 'muted' }, 'Aún no hay noticias.'));
        ns.forEach(function (n) {
          rows.appendChild(fila(n.titulo, n.resumen || '', (n.publicada ? 'PUBLICADA' : 'BORRADOR') + ' · ' + fecha(n.fecha), function (body) {
            var st = h('p', { class: 'form-status err' });
            body.appendChild(h('div', { class: 'row-btns' },
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { editor(n); } }, 'Editar'),
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { api('/noticias/' + n.id, { publicada: !n.publicada }, 'PATCH').then(lista).catch(function (e) { st.textContent = e.message; }); } }, n.publicada ? 'Despublicar' : 'Publicar'),
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { if (confirmar('¿Borrar la noticia?')) api('/noticias/' + n.id, undefined, 'DELETE').then(lista).catch(function (e) { st.textContent = e.message; }); } }, 'Borrar')));
            body.appendChild(st);
          }));
        });
      }).catch(function (e) { errorSeccion(c, e); });
    }
    function editor(n) {
      limpiar(zona); var pub = h('input', { type: 'checkbox', id: 'nt-p' }); pub.checked = n ? !!n.publicada : false;
      var f = h('form', { class: 'form-card', novalidate: true }, h('h2', null, n ? 'Editar noticia' : 'Nueva noticia'), campo('nt-t', 'Título', { value: n ? n.titulo : '', required: true }), campo('nt-r', 'Resumen (opcional)', { value: n ? n.resumen || '' : '' }), campo('nt-c', 'Texto', { rows: 10 }, 'textarea'),
        h('label', { class: 'consent', for: 'nt-p' }, pub, h('span', null, 'Publicada')), h('div', { class: 'row-btns' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Guardar'), h('button', { class: 'btn btn-ghost', type: 'button', onclick: lista }, 'Cancelar')), h('p', { class: 'form-status err', role: 'alert' }));
      f.querySelector('#nt-c').value = n ? n.cuerpo : '';
      f.addEventListener('submit', function (ev) {
        ev.preventDefault(); var cuerpo = { titulo: $('nt-t').value, resumen: $('nt-r').value, cuerpo: $('nt-c').value, publicada: pub.checked };
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
