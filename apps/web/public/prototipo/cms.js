/* Contenido editable de la web.
   1) Aplica encima del HTML los textos e imágenes guardados desde la intranet.
   2) Con ?editar=1 (y una sesión de administración o moderación) deja editar la propia página, como un editor visual.
   Debe cargarse ANTES de site.js para guardar los textos originales tal y como salen del HTML. */
(function () {
  var raiz = document.documentElement;
  var pagina = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  var nodos = [].slice.call(document.querySelectorAll('[data-cms]'));
  var imagenes = [].slice.call(document.querySelectorAll('[data-cmsimg]'));
  var original = new Map();
  nodos.forEach(function (n) { original.set(n, n.innerHTML); });
  imagenes.forEach(function (i) { original.set(i, i.getAttribute('src')); });
  var guardado = {}; // lo que hay publicado ahora mismo (clave → valor)
  var quitarEspera = function () { raiz.classList.remove('cms-pendiente'); };

  function api(ruta, metodo, cuerpo, tipo) {
    return fetch('/api' + ruta, {
      method: metodo || 'GET', credentials: 'same-origin',
      headers: cuerpo !== undefined ? { 'Content-Type': tipo || 'application/json' } : {},
      body: cuerpo === undefined ? undefined : (tipo ? cuerpo : JSON.stringify(cuerpo))
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || 'Error'); e.status = r.status; throw e; } return d; }); });
  }

  function pintar(n, valor) { n.innerHTML = n.classList.contains('split') && !raiz.classList.contains('cms-editando') ? '<span>' + valor + '</span>' : valor; }
  function aplicar(datos) {
    nodos.forEach(function (n) { var k = n.getAttribute('data-cms'); if (k in datos) pintar(n, datos[k]); });
    imagenes.forEach(function (i) { var k = i.getAttribute('data-cmsimg'); if (k in datos) { i.onerror = null; i.src = datos[k]; } });
    guardado = datos;
  }

  var editando = new URLSearchParams(location.search).get('editar') === '1';
  fetch('/api/contenido?pagina=' + encodeURIComponent(pagina), { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
    .then(function (datos) { aplicar(datos); quitarEspera(); if (editando) iniciarEdicion(); else botonEditar(); });

  // Pequeño botón flotante para quien ya ha entrado en la intranet en este navegador
  function botonEditar() {
    var marca = false; try { marca = localStorage.getItem('plu_editor') === '1'; } catch (e) { /* sin almacenamiento */ }
    if (!marca || !nodos.length) return;
    api('/intranet/me').then(function (d) {
      if (d.usuario.rol !== 'moderador') return;
      var a = document.createElement('a'); a.className = 'cms-fab'; a.href = location.pathname + '?editar=1'; a.textContent = '✎ Editar esta página'; document.body.appendChild(a);
    }).catch(function () { try { localStorage.removeItem('plu_editor'); } catch (e) { /* nada */ } });
  }

  function iniciarEdicion() {
    api('/intranet/me').then(function (d) {
      if (d.usuario.rol !== 'moderador') throw new Error('rol');
      montar();
    }).catch(function () {
      // Sin sesión válida no se muestra nada: la página se ve como la ve cualquier visitante.
      // Quien edita y no ha entrado es llevado a la intranet; el resto no ve ni sabe que existe el editor.
      var marca = false; try { marca = localStorage.getItem('plu_editor') === '1'; } catch (e) { /* sin almacenamiento */ }
      if (marca) location.replace('intranet.html?volver=' + encodeURIComponent(pagina + '.html?editar=1'));
      else history.replaceState(null, '', location.pathname);
    });
  }

  function montar() {
    raiz.classList.add('cms-editando');
    var base = new Map(); // valor mostrado al empezar (para detectar cambios)
    nodos.forEach(function (n) {
      var k = n.getAttribute('data-cms');
      n.innerHTML = k in guardado ? guardado[k] : original.get(n); // deshace el efecto de .split
      n.setAttribute('contenteditable', 'true'); n.setAttribute('spellcheck', 'true');
      base.set(n, n.innerHTML);
      n.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); } });
      n.addEventListener('paste', function (e) { e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertText', false, t); });
      n.addEventListener('input', contar);
    });
    // Los enlaces no navegan mientras se edita
    document.addEventListener('click', function (e) {
      var t = e.target; if (!t.closest || t.closest('.cms-barra') || t.closest('.cms-foto')) return;
      if (t.closest('a, button, summary, [role=tab]')) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    document.addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); }, true);
    // Todos los desplegables abiertos para poder editar su contenido
    [].forEach.call(document.querySelectorAll('details'), function (d) { d.open = true; });
    // Fotos: botón para cambiarlas
    var cambiosImg = {};
    imagenes.forEach(function (img) {
      var cont = img.parentElement; if (getComputedStyle(cont).position === 'static') cont.style.position = 'relative';
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cms-foto'; b.textContent = 'Cambiar foto';
      var f = document.createElement('input'); f.type = 'file'; f.accept = 'image/png,image/jpeg,image/webp'; f.hidden = true;
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); f.click(); });
      f.addEventListener('change', function () {
        var a = f.files[0]; if (!a) return;
        b.textContent = 'Subiendo…';
        api('/intranet/medios', 'POST', a, a.type).then(function (r) { img.onerror = null; img.src = r.url; cambiosImg[img.getAttribute('data-cmsimg')] = r.url; b.textContent = 'Cambiar foto'; contar(); })
          .catch(function (er) { b.textContent = 'Cambiar foto'; aviso(er.message, true); });
      });
      cont.appendChild(b); cont.appendChild(f);
    });

    var barra = document.createElement('div'); barra.className = 'cms-barra'; barra.setAttribute('role', 'toolbar'); barra.setAttribute('aria-label', 'Editor de la página');
    function boton(txt, titulo, fn, cls) { var b = document.createElement('button'); b.type = 'button'; b.textContent = txt; b.title = titulo; if (cls) b.className = cls; b.addEventListener('mousedown', function (e) { e.preventDefault(); }); b.addEventListener('click', fn); barra.appendChild(b); return b; }
    var estado = document.createElement('span'); estado.className = 'cms-estado'; estado.textContent = 'Editando: haz clic en cualquier texto';
    barra.appendChild(estado);
    boton('N', 'Negrita', function () { document.execCommand('bold'); });
    boton('K', 'Cursiva', function () { document.execCommand('italic'); });
    boton('Enlace', 'Poner o cambiar un enlace al texto seleccionado', function () { var u = window.prompt('Dirección del enlace (https://… o una página como proyecto.html):'); if (u) document.execCommand('createLink', false, u); });
    boton('Quitar enlace', 'Quitar el enlace', function () { document.execCommand('unlink'); });
    var guardar = boton('Guardar', 'Publicar los cambios', function () { enviar(); }, 'cms-primario');
    boton('Restaurar página', 'Volver al texto original de esta página', function () {
      if (!window.confirm('Se descartarán todos los cambios publicados de esta página y volverá el texto original. ¿Continuar?')) return;
      api('/intranet/contenido', 'DELETE', { pagina: pagina }).then(function () { sinAviso = true; location.reload(); }).catch(function (e) { aviso(e.message, true); });
    });
    boton('Salir', 'Salir del editor', function () { if (cuantos() && !window.confirm('Hay cambios sin guardar. ¿Salir igualmente?')) return; sinAviso = true; location.href = location.pathname; });
    document.body.appendChild(barra);
    var sinAviso = false;
    window.addEventListener('beforeunload', function (e) { if (!sinAviso && cuantos()) { e.preventDefault(); e.returnValue = ''; } });

    function cambiados() {
      var c = {};
      nodos.forEach(function (n) { if (n.innerHTML !== base.get(n)) c[n.getAttribute('data-cms')] = n.innerHTML; });
      Object.keys(cambiosImg).forEach(function (k) { c[k] = cambiosImg[k]; });
      return c;
    }
    function cuantos() { return Object.keys(cambiados()).length; }
    function contar() { var n = cuantos(); estado.textContent = n ? n + (n === 1 ? ' cambio sin guardar' : ' cambios sin guardar') : 'Sin cambios'; guardar.disabled = !n; }
    function aviso(t, error) { estado.textContent = t; estado.classList.toggle('cms-error', !!error); setTimeout(function () { estado.classList.remove('cms-error'); contar(); }, 3500); }
    function enviar() {
      var c = cambiados(); if (!Object.keys(c).length) return;
      guardar.disabled = true; estado.textContent = 'Guardando…';
      api('/intranet/contenido', 'PUT', { pagina: pagina, cambios: c }).then(function (r) {
        Object.keys(r.guardados).forEach(function (k) { guardado[k] = r.guardados[k]; });
        nodos.forEach(function (n) { var k = n.getAttribute('data-cms'); if (k in r.guardados) { n.innerHTML = r.guardados[k]; base.set(n, n.innerHTML); } });
        cambiosImg = {}; aviso('Guardado y publicado');
      }).catch(function (e) { guardar.disabled = false; aviso(e.message, true); });
    }
    guardar.disabled = true;
    document.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); enviar(); } });
  }
})();
