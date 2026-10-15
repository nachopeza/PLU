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
      setTimeout(function () { i = (i + 1) % words.length; rot.textContent = words[i]; rot.classList.remove('out'); }, 320);
    }, 2300);
  }

  /* Contadores */
  var cs = all('[data-count]');
  function count(el) {
    var to = +el.dataset.count, t0 = null, dur = 1400;
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
})();
