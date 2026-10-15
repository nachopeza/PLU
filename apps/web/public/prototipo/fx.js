/* PLU · efectos: variantes de aparición, palabra rotatoria, contadores, progreso, foco en tarjetas */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* Variantes de aparición (antes de que el observador las muestre) */
  all('h2[data-r], .head h2').forEach(function (e) { if (e.hasAttribute('data-r')) e.setAttribute('data-v', 'b'); });
  all('.sec-split > .txt').forEach(function (e) { e.setAttribute('data-r', ''); e.setAttribute('data-v', 'l'); });
  all('.optgrid.ambitos > *, .cifras li').forEach(function (e) { e.setAttribute('data-v', 'z'); });
  all('.road li').forEach(function (e) { e.setAttribute('data-r', ''); e.setAttribute('data-v', 'r'); });
  if (!reduce && 'IntersectionObserver' in window) {
    var io0 = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io0.unobserve(x.target); } }); }, { threshold: .12 });
    all('.sec-split > .txt, .road li').forEach(function (e) {
      var sib = Array.prototype.indexOf.call(e.parentElement.children, e); e.style.setProperty('--d', Math.min(sib, 6) * .08 + 's'); io0.observe(e);
    });
  } else { all('.sec-split > .txt, .road li').forEach(function (e) { e.classList.add('in'); }); }

  /* Palabra rotatoria del hero */
  var rot = document.querySelector('.rot');
  if (rot && !reduce) {
    var words = (rot.dataset.words || '').split('|'), i = 0;
    setInterval(function () {
      rot.classList.add('out');
      setTimeout(function () { i = (i + 1) % words.length; rot.textContent = words[i]; rot.classList.remove('out'); }, 600);
    }, 3400);
  }

  /* Contadores */
  var cs = all('[data-count]');
  function count(el) {
    var to = +el.dataset.count, t0 = null, dur = 2200;
    if (reduce || to < 2) { el.textContent = to; return; }
    el.textContent = '0';
    (function step(t) { if (!t0) t0 = t; var p = Math.min((t - t0) / dur, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(performance.now());
  }
  if ('IntersectionObserver' in window) {
    var ioc = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { count(x.target); ioc.unobserve(x.target); } }); }, { threshold: .6 });
    cs.forEach(function (e) { ioc.observe(e); });
  }

  /* Progreso de «Cómo trabajamos» */
  var pasos = all('.pasos');
  if (pasos.length) {
    var tick = false;
    function prog() {
      pasos.forEach(function (ol) {
        var r = ol.getBoundingClientRect(), vh = window.innerHeight;
        var p = Math.max(0, Math.min(1, (vh * .7 - r.top) / Math.max(r.height, 1)));
        ol.style.setProperty('--p', p.toFixed(3));
        var lis = all('li', ol);
        lis.forEach(function (li, k) { li.classList.toggle('on', p >= (k + .35) / lis.length); });
      });
      tick = false;
    }
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(prog); } }, { passive: true });
    prog();
  }

  /* Foco de luz en tarjetas (ratón y dedo) */
  function spot(e) {
    var c = e.target.closest && e.target.closest('.opt, .road li, .pasos li, .puntos li'); if (!c) return;
    var r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    if (e.type === 'pointerdown') { c.classList.add('spot'); setTimeout(function () { c.classList.remove('spot'); }, 700); }
  }
  document.addEventListener('pointermove', spot, { passive: true });
  document.addEventListener('pointerdown', spot, { passive: true });

  /* Tema elegido en el desplegable del formulario */
  all('.tema-d').forEach(function (d) {
    var sel = d.querySelector('.tsel');
    all('input[type=radio]', d).forEach(function (r) {
      r.addEventListener('change', function () { sel.textContent = r.nextElementSibling.textContent; setTimeout(function () { d.open = false; }, 250); });
    });
  });

  /* Hoja de ruta: puntos indicadores y avance suave automático en móvil */
  var road = document.querySelector('.road.swipe');
  if (road) {
    var lis = all('li', road), dots = document.createElement('div'); dots.className = 'road-dots'; dots.setAttribute('aria-hidden', 'true');
    lis.forEach(function () { dots.appendChild(document.createElement('i')); });
    road.insertAdjacentElement('afterend', dots);
    var cur = 0;
    var mark = function () {
      var w = lis[0].offsetWidth + 12; cur = Math.max(0, Math.min(lis.length - 1, Math.round(road.scrollLeft / w)));
      all('i', dots).forEach(function (d, k) { d.classList.toggle('on', k === cur); });
    };
    road.addEventListener('scroll', mark, { passive: true }); mark();
    var paused = false, vis = false;
    ['pointerdown', 'touchstart', 'mouseenter', 'focusin'].forEach(function (ev) { road.addEventListener(ev, function () { paused = true; }, { passive: true }); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }, { threshold: .5 }).observe(road);
    if (!reduce) setInterval(function () {
      if (paused || !vis || road.scrollWidth <= road.clientWidth + 4) return;
      var w = lis[0].offsetWidth + 12, n = cur + 1 >= lis.length ? 0 : cur + 1;
      road.scrollTo({ left: n * w, behavior: 'smooth' });
    }, 4200);
  }

  /* Botón de subir */
  var up = document.getElementById('toTop');
  if (up) {
    var t2 = false;
    var chk = function () { up.classList.toggle('show', window.scrollY > 600); t2 = false; };
    window.addEventListener('scroll', function () { if (!t2) { t2 = true; requestAnimationFrame(chk); } }, { passive: true }); chk();
    up.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
  }
})();
