/* Pinta las preguntas de una encuesta y recoge las respuestas. Lo usan el portal y la página de enlace directo. */
window.PLUEncuesta = (function () {
  function h(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (k === 'class') e.className = attrs[k]; else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]); });
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    return e;
  }
  // Devuelve una función que lee las respuestas actuales como {idPregunta: valor}
  function pintar(cont, encuesta) {
    cont.textContent = '';
    var lectores = [];
    encuesta.preguntas.forEach(function (q, i) {
      var name = 'q' + q.id, caja = h('fieldset', { class: 'choices' }, h('legend', null, (i + 1) + '. ' + q.texto + (q.obligatoria ? '' : ' (opcional)')));
      if (q.tipo === 'opcion_unica' || q.tipo === 'opcion_multiple') {
        var multi = q.tipo === 'opcion_multiple';
        q.opciones.forEach(function (o, j) {
          caja.appendChild(h('label', { class: 'consent' }, h('input', { type: multi ? 'checkbox' : 'radio', name: name, value: o, id: name + '-' + j }), h('span', null, o)));
        });
        lectores.push(function (r) {
          var m = caja.querySelectorAll('input:checked');
          if (multi) r[q.id] = Array.prototype.map.call(m, function (x) { return x.value; }); else if (m.length) r[q.id] = m[0].value;
        });
      } else if (q.tipo === 'escala') {
        var fila = h('div', { class: 'escala' });
        for (var v = q.opciones.min; v <= q.opciones.max; v++) fila.appendChild(h('label', { class: 'escala-op' }, h('input', { type: 'radio', name: name, value: String(v) }), h('span', null, String(v))));
        caja.appendChild(fila);
        if (q.opciones.etiqueta_min || q.opciones.etiqueta_max) caja.appendChild(h('p', { class: 'muted', style: 'display:flex;justify-content:space-between;font-size:.85rem' }, h('span', null, q.opciones.etiqueta_min || ''), h('span', null, q.opciones.etiqueta_max || '')));
        lectores.push(function (r) { var m = caja.querySelector('input:checked'); if (m) r[q.id] = Number(m.value); });
      } else {
        var t = h('textarea', { rows: '3', maxlength: '1000', 'aria-label': q.texto, style: 'width:100%;border:2px solid var(--line);border-radius:10px;background:transparent;color:var(--fg);padding:10px;font:inherit' });
        caja.appendChild(t); lectores.push(function (r) { if (t.value.trim()) r[q.id] = t.value.trim(); });
      }
      cont.appendChild(caja);
    });
    return function () { var r = {}; lectores.forEach(function (f) { f(r); }); return r; };
  }
  return { pintar: pintar };
})();
