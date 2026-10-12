/* Intranet de PLU: acceso con doble verificación y bandeja de inscripciones. Habla con /api/intranet. */
(function () {
  var app = document.getElementById('app-intranet');
  if (!app) return;
  function $(id) { return document.getElementById(id); }
  var vistas = ['v-login', 'v-codigo', 'v-config', 'v-recuperacion', 'v-panel'];
  function ver(id) { vistas.forEach(function (v) { $(v).hidden = v !== id; }); window.scrollTo({ top: 0 }); }
  var ticket = null, usuario = null, estado = 'pendiente';

  function api(ruta, cuerpo, metodo) {
    return fetch('/api/intranet' + ruta, {
      method: metodo || (cuerpo === undefined ? 'GET' : 'POST'),
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || 'Error'); e.status = r.status; throw e; } return d; });
    }, function () { throw new Error('No se puede conectar con la API. Arranca el servidor (npm run dev) y abre http://localhost:8787/intranet'); });
  }
  function msg(form, texto) { form.querySelector('.form-status').textContent = texto || ''; }
  function el(tag, cls, texto) { var e = document.createElement(tag); if (cls) e.className = cls; if (texto !== undefined) e.textContent = texto; return e; }
  var ROLES = { admin: 'Administración', gestor: 'Gestión', moderador: 'Moderación', coordinador: 'Coordinación provincial', verificador: 'Verificación', tesoreria: 'Tesorería', auditor: 'Auditoría' };

  $('f-login').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target; msg(f);
    api('/login', { usuario: $('i-u').value, password: $('i-p').value }).then(function (d) {
      ticket = d.ticket; $('i-p').value = '';
      if (d.paso === 'configurar') {
        return api('/2fa/preparar', { ticket: ticket }).then(function (c) { $('qr').src = c.qr; $('secreto').textContent = c.secreto; ver('v-config'); $('i-k2').focus(); });
      }
      ver('v-codigo'); $('i-k').focus();
    }).catch(function (err) { msg(f, err.message); });
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
      var ul = $('codigos'); ul.textContent = '';
      d.codigos_recuperacion.forEach(function (c) { ul.appendChild(el('li', 'chip', c)); });
      ver('v-recuperacion');
    }).catch(function (err) { msg(f, err.message); });
  });
  $('b-recuperacion').addEventListener('click', function () { $('codigos').textContent = ''; abrirPanel(usuario); });
  document.querySelectorAll('[data-volver]').forEach(function (b) { b.addEventListener('click', function () { ver('v-login'); }); });
  $('b-salir').addEventListener('click', function () { api('/logout', {}).finally(function () { usuario = null; ver('v-login'); }); });

  function abrirPanel(u) {
    usuario = u; $('p-nombre').textContent = u.nombre; $('p-rol').textContent = ROLES[u.rol] || u.rol;
    ver('v-panel'); contadores(); cargar();
  }
  function contadores() {
    api('/resumen').then(function (r) {
      var c = $('contadores'); c.textContent = '';
      [['Pendientes', r.afiliados.pendiente || 0], ['Afiliados activos', r.afiliados.activo || 0], ['Rechazadas', r.afiliados.rechazado || 0], ['Simpatizantes', r.simpatizantes || 0]].forEach(function (x) {
        var d = el('div', 'counter'); d.appendChild(el('b', '', String(x[1]))); d.appendChild(el('span', '', x[0])); c.appendChild(d);
      });
    }).catch(function () {});
  }
  document.querySelectorAll('[data-e]').forEach(function (b) {
    b.addEventListener('click', function () {
      estado = b.dataset.e;
      document.querySelectorAll('[data-e]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      cargar();
    });
  });
  function fecha(iso) { return iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; }
  function cargar() {
    var lista = $('lista'); lista.textContent = '';
    api('/inscripciones?estado=' + estado).then(function (filas) {
      $('vacio').hidden = filas.length > 0;
      filas.forEach(function (p) {
        var d = el('details', 'rowitem'), s = el('summary', 'noimg'), ic = el('span', 'icoc', (p.nombre[0] || '?').toUpperCase());
        var t = el('div'); t.appendChild(el('span', 'tag', p.provincia + ' · ' + fecha(p.creado_en) + (p.numero_afiliado ? ' · Nº ' + p.numero_afiliado : '')));
        t.appendChild(el('h3', '', p.nombre + ' ' + p.apellidos)); t.appendChild(el('p', 's', p.email));
        s.appendChild(ic); s.appendChild(t); s.appendChild(el('span', 'chev', '›')); d.appendChild(s);
        var body = el('div', 'body'); d.appendChild(body); lista.appendChild(d);
        var cargado = false;
        d.addEventListener('toggle', function () { if (d.open && !cargado) { cargado = true; ficha(p, body); } });
      });
    }).catch(function (err) { if (err.status === 401) ver('v-login'); else { $('vacio').hidden = false; $('vacio').textContent = err.message; } });
  }
  function ficha(p, body) {
    api('/inscripciones/' + p.id).then(function (f) {
      var dl = el('dl', 'ficha-dl');
      [['Documento', f.documento_tipo + ' ' + f.documento], ['Nacimiento', f.fecha_nacimiento], ['Provincia', f.provincia + ' (' + f.codigo_postal + ')'], ['Teléfono', f.telefono || '—'], ['Correo', f.email]].forEach(function (x) {
        var r = el('div'); r.appendChild(el('dt', '', x[0])); r.appendChild(el('dd', '', x[1])); dl.appendChild(r);
      });
      body.textContent = ''; body.appendChild(dl);
      if (f.movimientos && f.movimientos.length) {
        var h = el('p', 'muted', 'Historial: ' + f.movimientos.map(function (m) { return m.tipo + ' (' + fecha(m.fecha) + ')'; }).join(' · ')); body.appendChild(h);
      }
      if (f.estado === 'pendiente') {
        var acc = el('div', 'row-btns'), ok = el('button', 'btn btn-primary btn-sm', 'Aprobar'), no = el('button', 'btn btn-ghost btn-sm', 'Rechazar');
        ok.type = no.type = 'button'; acc.appendChild(ok); acc.appendChild(no); body.appendChild(acc);
        var st = el('p', 'form-status err'); body.appendChild(st);
        ok.addEventListener('click', function () {
          ok.disabled = no.disabled = true;
          api('/inscripciones/' + f.id + '/aprobar', {}).then(function (r) { st.className = 'form-status'; st.textContent = 'Aprobada. Número de afiliado ' + r.numero_afiliado + '.'; contadores(); setTimeout(cargar, 1200); })
            .catch(function (e) { ok.disabled = no.disabled = false; st.textContent = e.message; });
        });
        no.addEventListener('click', function () {
          var motivo = window.prompt('Motivo del rechazo (opcional):');
          if (motivo === null) return;
          ok.disabled = no.disabled = true;
          api('/inscripciones/' + f.id + '/rechazar', { motivo: motivo }).then(function () { contadores(); cargar(); })
            .catch(function (e) { ok.disabled = no.disabled = false; st.textContent = e.message; });
        });
      }
    }).catch(function (err) { body.textContent = err.message; });
  }

  // Si ya hay sesión abierta, entra directo al panel
  api('/me').then(function (d) { abrirPanel(d.usuario); }).catch(function () { ver('v-login'); });
})();
