/* Portal del afiliado: carné, encuestas, solicitudes e historial. Habla con /api/portal. */
(function () {
  var app = document.getElementById('app-portal');
  if (!app) return;
  function $(id) { return document.getElementById(id); }
  var vistas = ['w-login', 'w-cambio', 'w-panel'];
  function ver(id) { vistas.forEach(function (v) { $(v).hidden = v !== id; }); window.scrollTo({ top: 0 }); }
  var provincias = [], yo = null;
  function api(ruta, cuerpo) {
    return fetch('/api/portal' + ruta, { method: cuerpo === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || 'Error'); e.status = r.status; e.datos = d; throw e; } return d; }); },
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
  $('w-salir').addEventListener('click', function () { api('/logout', {}).finally(function () { ver('w-login'); }); });
  document.querySelectorAll('[data-w]').forEach(function (b) { b.addEventListener('click', function () { irA(b.dataset.w); }); });

  function entrar() {
    api('/me').then(function (d) {
      if (d.cambiar_password) { ver('w-cambio'); return; }
      yo = d; $('w-nombre').textContent = 'Hola, ' + d.nombre + '.';
      $('w-estado').textContent = (d.estado === 'suspendido' ? 'Afiliación suspendida' : 'Afiliado') + ' · Nº ' + d.numero_afiliado;
      ver('w-panel'); irA('carne');
      fetch('/api/provincias').then(function (r) { return r.json(); }).then(function (p) { provincias = p; }).catch(function () {});
    }).catch(function () { ver('w-login'); });
  }
  function irA(s) {
    document.querySelectorAll('[data-w]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.w === s)); });
    var c = $('w-sec'); c.textContent = '';
    ({ carne: sCarne, encuestas: sEncuestas, solicitudes: sSolicitudes, historial: sHistorial })[s](c);
  }

  function sCarne(c) {
    var k = yo.carne;
    if (!k || yo.estado !== 'activo') { c.appendChild(h('p', { class: 'muted' }, 'Ahora mismo no tienes un carné vigente.')); return; }
    c.appendChild(h('div', { class: 'carnet' },
      h('small', null, 'PLU · Carné de afiliado'), h('strong', null, yo.nombre + ' ' + yo.apellidos), h('span', null, 'Nº ' + yo.numero_afiliado + ' · ' + yo.provincia),
      h('small', null, 'Alta ' + fecha(yo.fecha_alta) + ' · válido hasta ' + fecha(k.valido_hasta))));
    c.appendChild(h('p', { class: 'row-btns' }, h('a', { class: 'btn btn-primary', href: '/api/portal/carne.pdf' }, 'Descargar carné (PDF)')));
    c.appendChild(h('p', { class: 'muted' }, 'El carné lleva un QR que el equipo puede comprobar en eventos y mítines. No es un documento oficial y no sustituye al DNI. Si lo pierdes, pide un duplicado en Solicitudes.'));
  }

  function sHistorial(c) {
    if (!yo.historial.length) { c.appendChild(h('p', { class: 'muted' }, 'Sin movimientos.')); return; }
    var ul = h('ul', { class: 'hist' });
    yo.historial.forEach(function (m) { ul.appendChild(h('li', null, h('strong', null, MOV[m.tipo] || m.tipo), h('span', { class: 'muted' }, ' · ' + fecha(m.fecha) + (m.motivo ? ' · ' + m.motivo : '')))); });
    c.appendChild(ul);
  }

  function sSolicitudes(c) {
    var form = h('form', { class: 'form-card', novalidate: true });
    var tipo = h('select', { id: 's-t' }, Object.keys(TIPOS).map(function (k) { return h('option', { value: k }, TIPOS[k]); }));
    var prov = h('select', { id: 's-p' }, [h('option', { value: '' }, 'Elige provincia…')].concat(provincias.map(function (p) { return h('option', { value: p.id }, p.nombre); })));
    var provCampo = h('div', { class: 'field', hidden: true }, h('label', { for: 's-p' }, 'Nueva provincia'), prov);
    tipo.addEventListener('change', function () { provCampo.hidden = tipo.value !== 'cambio_provincia'; });
    var det = h('textarea', { id: 's-d', rows: '3', maxlength: '800' });
    form.appendChild(h('h2', null, 'Nueva solicitud'));
    form.appendChild(h('div', { class: 'field' }, h('label', { for: 's-t' }, 'Qué necesitas'), tipo)); form.appendChild(provCampo);
    form.appendChild(h('div', { class: 'field' }, h('label', { for: 's-d' }, 'Detalles (opcional)'), det));
    form.appendChild(h('button', { class: 'btn btn-primary', type: 'submit' }, 'Enviar')); form.appendChild(h('p', { class: 'form-status', role: 'status' }));
    var lista = h('div', { class: 'rows' });
    function cargar() {
      lista.textContent = '';
      api('/solicitudes').then(function (s) {
        s.forEach(function (x) { lista.appendChild(h('div', { class: 'audit-row' }, h('span', { class: 'tag' }, fecha(x.creada_en)), h('strong', null, TIPOS[x.tipo] || x.tipo), h('span', null, ESTSOL[x.estado] || x.estado), x.resolucion ? h('span', { class: 'muted' }, x.resolucion) : null)); });
      });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault(); msg(form);
      api('/solicitudes', { tipo: tipo.value, detalle: det.value, provincia_id: prov.value || undefined }).then(function () { det.value = ''; msg(form, 'Solicitud enviada. El equipo la revisará.'); cargar(); }).catch(function (err) { msg(form, err.message); });
    });
    c.appendChild(form); c.appendChild(h('h3', { style: 'margin-top:26px' }, 'Tus solicitudes')); c.appendChild(lista); cargar();
    var pw = h('form', { class: 'form-card', style: 'margin-top:26px', novalidate: true }, h('h2', null, 'Cambiar contraseña'),
      h('div', { class: 'field' }, h('label', { for: 'x-a' }, 'Contraseña actual'), h('input', { id: 'x-a', type: 'password', autocomplete: 'current-password' })),
      h('div', { class: 'field' }, h('label', { for: 'x-n' }, 'Nueva (mín. 10 caracteres)'), h('input', { id: 'x-n', type: 'password', autocomplete: 'new-password', minlength: '10' })),
      h('button', { class: 'btn btn-ghost', type: 'submit' }, 'Cambiar'), h('p', { class: 'form-status', role: 'status' }));
    pw.addEventListener('submit', function (e) { e.preventDefault(); msg(pw); api('/password', { actual: $('x-a').value, nueva: $('x-n').value }).then(function () { $('x-a').value = $('x-n').value = ''; msg(pw, 'Contraseña cambiada.'); }).catch(function (err) { msg(pw, err.message); }); });
    c.appendChild(pw);
  }

  function sEncuestas(c) {
    var lista = h('div', { class: 'rows' }); c.appendChild(lista);
    api('/encuestas').then(function (es) {
      if (!es.length) lista.appendChild(h('p', { class: 'muted' }, 'No hay encuestas abiertas ahora mismo.'));
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

  entrar();
})();
