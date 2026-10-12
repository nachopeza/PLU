/* Encuesta por enlace directo (simpatizantes). El enlace es de un solo uso: /prototipo/encuesta.html?t=... */
(function () {
  if (!document.getElementById('app-encuesta')) return;
  function $(id) { return document.getElementById(id); }
  var token = new URLSearchParams(location.search).get('t');
  function fallo(t) { $('e-titulo').textContent = 'Enlace no disponible'; $('e-desc').textContent = t; }
  if (!token) return fallo('Falta el enlace de la encuesta. Usa el enlace completo que recibiste.');
  history.replaceState(null, '', location.pathname); // el token no se queda en el historial visible
  var leer;
  fetch('/api/encuesta-directa/' + encodeURIComponent(token)).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Error'); return d; }); }).then(function (e) {
    $('e-titulo').textContent = e.titulo; $('e-desc').textContent = e.descripcion || '';
    $('e-anon').hidden = false; $('e-anon').textContent = e.anonima ? 'Esta encuesta es anónima: no guardamos qué has respondido junto a tu nombre.' : 'En esta encuesta tus respuestas quedan asociadas a ti.';
    leer = window.PLUEncuesta.pintar($('e-preguntas'), e); $('e-form').hidden = false;
  }).catch(function (err) { fallo(err.message === 'Failed to fetch' ? 'No se puede conectar con el servidor.' : err.message); });
  $('e-form').addEventListener('submit', function (ev) {
    ev.preventDefault(); var st = ev.target.querySelector('.form-status'); st.textContent = '';
    fetch('/api/encuesta-directa/' + encodeURIComponent(token), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ respuestas: leer() }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Error'); return d; }); })
      .then(function () { $('e-form').hidden = true; $('e-fin').hidden = false; $('e-fin').textContent = 'Gracias por participar.'; })
      .catch(function (err) { st.textContent = err.message; });
  });
})();
