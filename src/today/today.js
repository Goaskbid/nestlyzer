/* r16: "Today on Nestlyzer" on the home page. The page already shows the place and chart picked at build time; this swaps
   in the visitor's day, lets them draw another place, and previews today's chart from its chapter (same site, no third
   parties). Nothing is stored. */
(function () {
  var box = document.getElementById('today'); if (!box || !window.fetch) return;
  var v = (document.currentScript && /[?&]v=([^&]+)/.exec(document.currentScript.src) || [])[1] || '';
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var day = Math.floor(Date.now() / 864e5), T = null, cur = -1;
  function place(i) {
    var P = T.places, e = P[((i % P.length) + P.length) % P.length]; if (!e) return; cur = i;
    var el = box.querySelector('.td-pl'); if (!el) return;
    el.innerHTML = '<h3><a href="' + esc(e[4]) + '"><img class="flag" src="/assets/flags/' + esc(e[1].toLowerCase()) + '.png" alt="" width="21" height="16" loading="lazy"> ' + esc(e[2]) + '</a></h3>' +
      '<p class="td-meta">' + esc(e[3]) + (e[7] ? ' · best for ' + esc(e[7]) : '') + '</p><p>' + e[5] + '</p><p>' + e[6] + '</p>' +
      '<a class="td-more" href="' + esc(e[4]) + '">Read the full page on ' + esc(e[2]) + '</a>';
  }
  function chart(c) {
    var el = box.querySelector('.td-ch'); if (!el || !c) return;
    el.innerHTML = '<a class="td-t" href="' + esc(c[0]) + '"><b>' + esc(c[1]) + '</b><span>' + esc(c[2]) + '</span></a>';
    if (!window.DOMParser || window.NZ_STANDALONE) return;   /* the single-file build has no chapter pages to preview */
    fetch(c[0]).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      if (!t) return;
      var d = new DOMParser().parseFromString(t, 'text/html'), g = d.querySelector('svg[viewBox="0 0 380 430"]'); if (!g) return;
      [].slice.call(g.querySelectorAll('a')).forEach(function (n) { var q = d.createElementNS('http://www.w3.org/2000/svg', 'g'); if (n.getAttribute('class')) q.setAttribute('class', n.getAttribute('class')); while (n.firstChild) q.appendChild(n.firstChild); n.replaceWith(q); });
      var f = document.createElement('div'); f.className = 'td-fig'; f.setAttribute('aria-hidden', 'true'); f.appendChild(document.importNode(g, true));
      var a = el.querySelector('a.td-t'); if (a) a.appendChild(f);
    }).catch(function () {});
  }
  var started = false;
  function start() { if (started) return; started = true;
  fetch('/data/today.json?v=' + v).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.places || !j.places.length) return; T = j;
    place(day * 7919);
    if (j.charts && j.charts.length) chart(j.charts[day % j.charts.length]);
  }).catch(function () {}); }
  /* load only when the band comes near the screen (not while the map app is open) */
  if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { io.disconnect(); start(); } }, { rootMargin: '600px 0px' }); io.observe(box); } else start();
  box.addEventListener('click', function (e) {
    if (!e.target.closest('[data-td-next]') || !T) return;
    var n = T.places.length, i = cur;
    for (var k = 0; k < 5 && i === cur; k++) i = Math.floor(Math.random() * n);
    place(i);
    var h = box.querySelector('.td-pl h3 a'); if (h) h.focus();
  });
})();
