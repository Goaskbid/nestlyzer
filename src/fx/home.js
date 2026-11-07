/* Nestlyzer 2.15.3: start page extras, loaded right after first paint. The band under the globe follows the selected
   country and profile; the country tiles replace the plain link list when they come near the viewport. */
(function () {
var $ = function (s) { return document.querySelector(s); }, V = (window.NZ && window.NZ.version) || '', FEAT = {};
var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
var n0 = function (v, d) { return Number(v).toLocaleString('en-GB', { maximumFractionDigits: d || 0 }); };
window.NZ_FEAT = function (cc, k) {
  var h = $('#feat-h'); if (!h || !cc) return;
  (FEAT[cc] || (FEAT[cc] = fetch('/data/feature/' + cc + '.json?v=' + V).then(function (r) { if (!r.ok) throw 0; return r.json(); }).catch(function () { delete FEAT[cc]; return null; }))).then(function (d) {
    if (!d || $('#start-country').value !== cc) return;
    var P = (window.NZ && window.NZ.meta && window.NZ.meta.config.profiles) || {}, p = d.top[k] ? k : 'young_family', list = d.top[p] || [], pn = P[p] ? P[p].name.toLowerCase() : 'young family';
    h.textContent = d.name + ', down to the last ' + d.unit1;
    $('#feat-l').textContent = d.units + ', with about ' + d.nf + ' local measures each. This is the ' + pn + ' fit, right now:';
    $('#feat-ol').innerHTML = list.map(function (x, i) { return '<li><span class="n">' + (i + 1) + '</span><span><a href="' + (x[5] || '/#/explore?cc=' + cc + '&p=' + p + '&sel=' + encodeURIComponent(x[0])) + '">' + esc(x[1]) + '</a><br><span class="small muted">' + (x[2] ? esc(x[2]) + ', ' : '') + n0(x[3]) + ' residents</span></span><span class="chip tone-good"><b>' + n0(x[4]) + '</b></span></li>'; }).join('');
    var a = $('#feat-a'); a.textContent = 'Open ' + d.name; a.setAttribute('href', '/#/explore?cc=' + cc + '&p=' + p);
    var f = $('#feat-fig'); if (f) f.hidden = cc !== 'CH';
    var il = $('#ins-local'); if (il && d.ins) { il.hidden = false; il.href = '/insights/' + d.ins[0] + '/'; il.textContent = d.ins[1]; }
  });
};
var box = $('#country-tiles');
if (box && !box.dataset.loaded && !window.NZ_STANDALONE) {
  var go = function () { if (box.dataset.loaded) return; box.dataset.loaded = 1; fetch('/data/start_countries.html?v=' + V).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) { if (t) box.innerHTML = t; }, function () { box.dataset.loaded = ''; }); };
  if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (e) { if (e.some(function (x) { return x.isIntersecting; })) { io.disconnect(); go(); } }, { rootMargin: '800px' }); io.observe(box); } else go();
}
})();
