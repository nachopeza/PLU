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
    if (!cur) cur = 'dark';
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
    var cur = 0, started = false, bars = document.querySelectorAll('.stepper span');
    function show(n) {
      cur = n;
      steps.forEach(function (s, i) { s.hidden = i !== n; });
      bars.forEach(function (b, i) { b.classList.toggle('on', i <= n); });
      if (started) {
        // Al cambiar de paso, volver al inicio del formulario (debajo de la cabecera fija)
        var form = steps[0].closest('form') || steps[0].parentElement, stp = document.querySelector('.stepper') || form;
        var top = stp.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        var f = steps[n].querySelector('input:not([type=hidden]), select, textarea'); if (f && n > 0) { try { f.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }
      }
    }
    function valid(n) {
      var ok = true;
      steps[n].querySelectorAll('input[required], select[required]').forEach(function (f) { if (!f.checkValidity()) { f.reportValidity(); ok = false; } });
      return ok;
    }
    document.querySelectorAll('[data-next]').forEach(function (b) { b.addEventListener('click', function () { if (valid(cur)) show(cur + 1); }); });
    document.querySelectorAll('[data-prev]').forEach(function (b) { b.addEventListener('click', function () { show(cur - 1); }); });
    show(0); started = true;
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

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Titulares por líneas: envuelve el contenido para la máscara */
  document.querySelectorAll('.split').forEach(function (el, i) { el.innerHTML = '<span>' + el.innerHTML + '</span>'; el.style.setProperty('--d', (i * 0.12) + 's'); });

  /* Aparición al hacer scroll, con escalonado entre hermanos */
  var targets = document.querySelectorAll('[data-r], .split');
  targets.forEach(function (el) {
    var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
    if (!el.classList.contains('split')) el.style.setProperty('--d', Math.min(sib, 6) * 0.08 + 's');
  });
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  } else { targets.forEach(function (el) { el.classList.add('in'); }); }

  /* Barra de progreso, parallax y cabecera */
  var bar = $('progress'), header = document.querySelector('.site-header');
  var par = document.querySelectorAll('[data-parallax]');
  var ticking = false;
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (h > 0 ? window.scrollY / h : 0) + ')';
    if (header) header.classList.toggle('scrolled', window.scrollY > 20);
    if (!reduce) par.forEach(function (el) {
      var r = el.getBoundingClientRect(), mid = r.top + r.height / 2 - window.innerHeight / 2;
      el.style.setProperty('transform', 'translateY(' + (mid * parseFloat(el.dataset.parallax) / 100) + 'px) rotate(' + (window.scrollY * 0.03) + 'deg)');
    });
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* Resplandor que sigue al cursor, inclinación 3D y botones magnéticos (solo con ratón) */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    var glow = $('glow');
    window.addEventListener('pointermove', function (e) {
      if (glow) { glow.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; glow.classList.add('on'); }
    }, { passive: true });
    document.querySelectorAll('.tilt').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = 'perspective(800px) rotateY(' + (x * 8) + 'deg) rotateX(' + (-y * 8) + 'deg) translateY(-4px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    document.querySelectorAll('.magnet').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .22) + 'px,' + ((e.clientY - r.top - r.height / 2) * .3) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* Filtros (propuestas y debate) */
  function filterable(listId, attr, def) {
    var list = $(listId); if (!list) return;
    var btns = document.querySelectorAll('.fbtn');
    function apply(f) {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.f === f)); });
      list.querySelectorAll('.rowitem').forEach(function (r) {
        var show = f === 'all' || r.dataset[attr] === f;
        r.hidden = !show; if (show) { r.classList.add('in'); }
      });
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { apply(b.dataset.f); }); });
    apply(def);
    if (location.hash) { var t = document.querySelector(location.hash); if (t && t.classList.contains('rowitem')) { apply('all'); t.open = true; } }
  }
  filterable('filterlist', 'cat', 'all');
  filterable('statelist', 'state', 'debate');
  document.querySelectorAll('.rowitem input[type="range"]').forEach(function (inp) {
    var out = inp.closest('.dilema').querySelector('.dilema-out'), poles = inp.closest('.dilema').querySelectorAll('.poles span');
    inp.addEventListener('input', function () { var v = +inp.value; out.textContent = v < 35 ? 'Más hacia ' + poles[0].textContent : v > 65 ? 'Más hacia ' + poles[1].textContent : 'Equilibrio'; });
  });

  /* Formularios con envío real a la API (data-api) */
  var PROV_FALLBACK = prov ? prov.innerHTML : '';
  if (prov) {
    fetch('/api/provincias').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (lista) {
      prov.innerHTML = '<option value="">Elige…</option>';
      lista.forEach(function (p) { var o = document.createElement('option'); o.value = p.id; o.dataset.codigo = p.codigo; o.textContent = p.nombre + ' (' + p.comunidad + ')'; prov.appendChild(o); });
    }).catch(function () { /* sin API: se queda la lista de demostración */ });
  }
  /* Municipio y código postal con sugerencias (datos INE); el CP siempre se puede escribir a mano */
  (function () {
    var mun = $('a-mun'), cp = $('a-cp'), dlM = $('a-mun-l'), dlC = $('a-cp-l'), hint = $('a-cp-h');
    if (!prov || !mun || !cp) return;
    var datos = null, cargando = null;
    function cargar() { if (datos) return Promise.resolve(datos); if (!cargando) cargando = fetch('municipios.json').then(function (r) { return r.json(); }).then(function (d) { datos = d; return d; }).catch(function () { datos = {}; return datos; }); return cargando; }
    function codigoProv() { var o = prov.options[prov.selectedIndex]; return o && o.dataset.codigo ? o.dataset.codigo : ''; }
    function norm(t) { return (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
    function buscar() { var c = codigoProv(); if (!datos || !c || !datos[c]) return null; var n = norm(mun.value); return datos[c].filter(function (m) { return norm(m[0]) === n; })[0] || null; }
    function rellenarMunicipios() {
      dlM.innerHTML = ''; var c = codigoProv(); if (!datos || !c || !datos[c]) return;
      datos[c].forEach(function (m) { var o = document.createElement('option'); o.value = m[0]; dlM.appendChild(o); });
    }
    function rellenarCp(forzar) {
      dlC.innerHTML = ''; hint.textContent = ''; var m = buscar(); if (!m || !m[1]) return;
      m[1].forEach(function (x) { var o = document.createElement('option'); o.value = x; dlC.appendChild(o); });
      if (m[1].length === 1) { cp.value = m[1][0]; }
      else if (forzar && !/^\d{5}$/.test(cp.value)) { hint.textContent = 'Este municipio tiene varios códigos postales: elige el tuyo en la lista o escríbelo.'; }
      else if (m[1].indexOf(cp.value) < 0 && /^\d{5}$/.test(cp.value)) { hint.textContent = 'Comprueba que ' + cp.value + ' es tu código postal.'; }
    }
    prov.addEventListener('focus', cargar);
    mun.addEventListener('focus', function () { cargar().then(rellenarMunicipios); });
    prov.addEventListener('change', function () { cargar().then(function () { rellenarMunicipios(); mun.value = ''; dlC.innerHTML = ''; hint.textContent = ''; if (codigoProv() && /^\d{5}$/.test(cp.value) && cp.value.slice(0, 2) !== codigoProv()) cp.value = ''; }); });
    mun.addEventListener('input', function () { cargar().then(function () { rellenarCp(true); }); });
    mun.addEventListener('change', function () { cargar().then(function () { rellenarCp(true); }); });
    cp.addEventListener('input', function () {
      cp.value = cp.value.replace(/\D/g, '').slice(0, 5);
      if (cp.value.length >= 2) {
        var pref = cp.value.slice(0, 2), opt = Array.prototype.filter.call(prov.options, function (o) { return o.dataset.codigo === pref; })[0];
        if (opt && prov.value !== opt.value) { prov.value = opt.value; cargar().then(rellenarMunicipios); }
      }
    });
  })();
  document.querySelectorAll('form[data-api]').forEach(function (form) {
    var status = form.querySelector('.form-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pasos = form.querySelectorAll('.step');
      if (pasos.length && pasos[pasos.length - 1].hidden) { var sig = form.querySelector('.step:not([hidden]) [data-next]'); if (sig) sig.click(); return; }
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var data = {};
      form.querySelectorAll('[name]').forEach(function (f) {
        if (f.type === 'checkbox') data[f.name] = f.checked;
        else if (f.type === 'radio') { if (f.checked) data[f.name] = f.value; }
        else data[f.name] = f.value;
      });
      var btn = form.querySelector('[type="submit"]'); btn.disabled = true; status.textContent = 'Enviando…'; status.style.color = '';
      fetch(form.getAttribute('data-api'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (x) {
          btn.disabled = false;
          if (x.ok) { if (!form.querySelector('.step')) Array.prototype.forEach.call(form.children, function (c) { c.hidden = true; }); form.querySelectorAll('.step').forEach(function (s) { s.hidden = true; }); var done = document.createElement('div'); done.className = 'step'; done.innerHTML = '<h3></h3><p class="muted"></p>'; done.querySelector('h3').textContent = form.getAttribute('data-ok') || '¡Solicitud enviada!'; done.querySelector('p').textContent = x.d.mensaje; form.appendChild(done); form.reset(); try { done.setAttribute('tabindex', '-1'); form.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { done.focus({ preventScroll: true }); }, 400); } catch (e) { /* sin scroll */ } return; }
          var det = x.d.errores ? Object.keys(x.d.errores).map(function (k) { return x.d.errores[k]; }).join(' · ') : x.d.error;
          status.style.color = '#ff8a80'; status.textContent = det || 'Error del servidor. Mira la Terminal donde corre la API.';
        })
        .catch(function () { btn.disabled = false; status.style.color = '#ff8a80'; status.textContent = 'No se puede conectar con la API. Arranca el servidor (npm run dev) y abre http://localhost:8787/prototipo/afiliate.html'; });
    });
  });

  // Marca cuándo la página está arriba del todo (para que al estirar hacia abajo no asome el fondo claro detrás de la foto)
  (function () {
    var raiz = document.documentElement, pon = function () { raiz.classList.toggle('at-top', (window.scrollY || 0) < 120); raiz.classList.toggle('pulling', (window.scrollY || 0) < 0); };
    pon(); window.addEventListener('scroll', pon, { passive: true });
  })();
})();
