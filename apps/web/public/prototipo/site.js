/* PLU · prototipo web. Solo comportamiento de demostración: nada se envía ni se guarda. */
(function () {
  var root = document.documentElement;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function $(id) { return document.getElementById(id); }

  /* Tema claro/oscuro */
  var themeBtn = $('themeBtn');
  try { var saved = localStorage.getItem('plu-theme'); if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved); } catch (e) {}
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var cur = root.getAttribute('data-theme');
    if (!cur) cur = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('plu-theme', next); } catch (e) {}
  });

  /* Menú móvil */
  var menuBtn = $('menuBtn'), menu = $('menu');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { var open = menu.hidden; menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); });
  }

  /* Democracia: pestañas */
  var tabs = $('tabs'), panel = $('tabpanel');
  if (tabs && panel) {
    var DEMO = [
      { name: 'Elecciones', intro: 'Siguen siendo la base para elegir representantes. Queremos que se sepa qué se vota, qué se prometió y qué se cumple.',
        items: ['Votaciones parlamentarias explicadas con claridad', 'Seguimiento público de los compromisos', 'Cuentas y financiación de los partidos a la vista'] },
      { name: 'Iniciativa ciudadana', intro: 'Una propuesta con suficientes apoyos obligaría a la institución a debatirla o a responder con motivos.',
        items: ['Validación de los apoyos', 'Respuesta motivada en un plazo fijado'], pending: 'Umbral de apoyos y efectos jurídicos.' },
      { name: 'Consultas y referéndums', intro: 'Para cuestiones de especial relevancia y con reglas fijadas de antemano. Ninguna mayoría puede quitar derechos fundamentales.',
        items: ['Preguntas claras y neutrales', 'Información plural', 'Supervisión independiente'], pending: '¿Cuándo serían vinculantes? ¿Quién convoca? Exige análisis jurídico.' },
      { name: 'Asambleas ciudadanas', intro: 'Personas elegidas por sorteo estudian un asunto con información contrastada y recomiendan. La institución responde.',
        items: ['Método de selección transparente', 'Recomendaciones públicas y respuesta oficial'], pending: '¿Permanentes o según el asunto?' },
      { name: 'Participación digital', intro: 'Un espacio para consultar proyectos, proponer y seguir expedientes. La tecnología sola no garantiza una democracia segura.',
        items: ['Identidad verificada y voto secreto si hay votación', 'Accesibilidad y auditoría'], pending: '¿Qué papel tiene lo digital frente a lo presencial?' }
    ];
    function selectTab(i) {
      tabs.querySelectorAll('[role="tab"]').forEach(function (b, j) { b.setAttribute('aria-selected', String(i === j)); });
      var d = DEMO[i];
      panel.innerHTML = '<h3>' + esc(d.name) + '</h3><p>' + esc(d.intro) + '</p><ul class="leaf-list">' +
        d.items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
        (d.pending ? '<div class="pending"><span class="panel-label">Por decidir</span><span>' + esc(d.pending) + '</span></div>' : '');
    }
    DEMO.forEach(function (d, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'tab'; b.setAttribute('role', 'tab'); b.textContent = d.name;
      b.addEventListener('click', function () { selectTab(i); });
      tabs.appendChild(b);
    });
    selectTab(0);
  }

  /* Debate: deslizadores */
  var list = $('dilemas-list');
  if (list) {
    var DIL = [
      { l: 'Libertad', r: 'Protección social', q: '¿Cómo garantizar oportunidades sin ampliar la intervención pública más de lo necesario?' },
      { l: 'Mercado', r: 'Servicio público directo', q: '¿Qué presta el Estado y qué pueden prestar empresas reguladas?' },
      { l: 'Democracia directa', r: 'Representación', q: '¿Cuándo decide la ciudadanía y cuándo el Parlamento?' },
      { l: 'Competencias iguales', r: 'Diversidad territorial', q: '¿Qué debe ser igual en todas las comunidades y qué puede adaptarse?' },
      { l: 'Criterio experto', r: 'Mandato democrático', q: '¿Cómo tener experiencia sin que gobiernen expertos sin mandato?' },
      { l: 'Estado compacto', r: 'Capacidad pública', q: '¿Cómo reducir duplicidades sin debilitar justicia o sanidad?' },
      { l: 'Disciplina fiscal', r: 'Inversión social', q: '¿Qué se financia primero y cómo se explican las renuncias?' }
    ];
    DIL.forEach(function (d, i) {
      var el = document.createElement('div'); el.className = 'dilema';
      el.innerHTML = '<p class="dilema-q">' + esc(d.q) + '</p><div class="poles"><span>' + esc(d.l) + '</span><span>' + esc(d.r) + '</span></div>' +
        '<input type="range" min="0" max="100" value="50" aria-label="' + esc(d.l) + ' o ' + esc(d.r) + '"><p class="dilema-out" aria-live="polite">Equilibrio</p>';
      list.appendChild(el);
      var inp = el.querySelector('input'), out = el.querySelector('.dilema-out');
      inp.addEventListener('input', function () { var v = +inp.value; out.textContent = v < 35 ? 'Más hacia ' + d.l : v > 65 ? 'Más hacia ' + d.r : 'Equilibrio'; });
    });
    var reset = $('resetDilemas');
    if (reset) reset.addEventListener('click', function () { list.querySelectorAll('input').forEach(function (i) { i.value = 50; i.dispatchEvent(new Event('input')); }); });
  }

  /* Provincias (formulario de afiliación) */
  var prov = $('f-prov');
  if (prov) {
    ['Araba/Álava','Albacete','Alicante/Alacant','Almería','Asturias','Ávila','Badajoz','Illes Balears','Barcelona','Burgos','Cáceres','Cádiz','Cantabria','Castellón/Castelló','Ciudad Real','Córdoba','A Coruña','Cuenca','Girona','Granada','Guadalajara','Gipuzkoa','Huelva','Huesca','Jaén','León','Lleida','Lugo','Madrid','Málaga','Murcia','Navarra','Ourense','Palencia','Las Palmas','Pontevedra','La Rioja','Salamanca','Santa Cruz de Tenerife','Segovia','Sevilla','Soria','Tarragona','Teruel','Toledo','Valencia/València','Valladolid','Bizkaia','Zamora','Zaragoza','Ceuta','Melilla']
      .forEach(function (n) { var o = document.createElement('option'); o.textContent = n; prov.appendChild(o); });
  }

  /* Afiliación por pasos (demostración) */
  var steps = document.querySelectorAll('.step');
  if (steps.length) {
    var cur = 0, bars = document.querySelectorAll('.stepper span');
    function show(n) {
      cur = n;
      steps.forEach(function (s, i) { s.hidden = i !== n; });
      bars.forEach(function (b, i) { b.classList.toggle('on', i <= n); });
    }
    function valid(n) {
      var ok = true;
      steps[n].querySelectorAll('input[required], select[required]').forEach(function (f) { if (!f.checkValidity()) { f.reportValidity(); ok = false; } });
      return ok;
    }
    document.querySelectorAll('[data-next]').forEach(function (b) { b.addEventListener('click', function () { if (valid(cur)) show(cur + 1); }); });
    document.querySelectorAll('[data-prev]').forEach(function (b) { b.addEventListener('click', function () { show(cur - 1); }); });
    show(0);
  }

  /* Formularios de demostración */
  document.querySelectorAll('form[data-demo]').forEach(function (form) {
    var status = form.querySelector('.form-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); if (status) status.textContent = ''; return; }
      if (status) status.textContent = form.getAttribute('data-demo');
    });
  });
})();
