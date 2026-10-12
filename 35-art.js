/* Generated art: place postcards (outline + neighbours + pin), score rings, flags, icons */
function flagImg(cc, h) {
  h = h || 14;
  return '<img class="flag" src="/assets/flags/' + String(cc).toLowerCase() + '.png" alt="" width="' + Math.round(h * 4 / 3) + '" height="' + h + '" loading="lazy" decoding="async">';
}
function profileIcon(k, size) {
  var p = (typeof PICON !== 'undefined' && (PICON[k] || PICON.self_fit)) || '';
  return '<svg class="pico" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
}
function luminance(hex) {
  var m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return 0.5;
  var n = parseInt(m[1], 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function inkOn(bg) { return luminance(bg) > 0.33 ? '#132238' : '#ffffff'; }
function scoreRing(v, size) {
  size = size || 92;
  var r = size / 2 - 7, C = 2 * Math.PI * r, f = fin(v) ? clamp(v, 0, 100) / 100 : 0, col = scoreColor(v);
  return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px" role="img" aria-label="Score ' + (fin(v) ? Math.round(v) : 'not available') + ' of 100">' +
    '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--ring-track)" stroke-width="7"/>' +
    '<circle class="ring-arc" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - f)).toFixed(1) + '" style="--c:' + C.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/></svg>' +
    '<b data-count="' + (fin(v) ? Math.round(v) : '') + '">' + (fin(v) ? Math.round(v) : '–') + '</b><small>of 100</small></div>';
}
function countUp(root) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $$('[data-count]', root).forEach(function (el) {
    var to = +el.dataset.count; if (!fin(to) || el.dataset.counted) return; el.dataset.counted = 1;
    var t0 = performance.now();
    (function step(t) { var k = Math.min(1, (t - t0) / 650); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); })(t0);
  });
}

/* ---- geometry for postcards (independent of the map engine) ---- */
var ART = { ch: null, nuts: null, loading: null };
function ensureArtGeo() {
  if (ART.loading) return ART.loading;
  ART.loading = loadScript('/vendor/topojson-client.min.js?v=' + VERSION).then(function () {
    return Promise.all([getJSON('/data/geo/ch.topo.json?v=' + VERSION), getJSON('/data/geo/nuts3.topo.json?v=' + VERSION)]);
  }).then(function (a) {
    function index(fc, key) {
      var m = {};
      fc.features.forEach(function (f) { var b = [180, 90, -180, -90]; walk(f.geometry, function (p) { if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; }); f.bbox = b; m[key(f)] = f; });
      return { list: fc.features, by: m };
    }
    ART.ch = index(topojson.feature(a[0], a[0].objects.municipalities), function (f) { return String(f.id); });
    ART.chLakes = topojson.feature(a[0], a[0].objects.lakes).features;
    ART.nuts = index(topojson.feature(a[1], a[1].objects.nutsrg), function (f) { return f.properties.id; });
    return ART;
  }).catch(function () { ART.loading = null; return null; });
  return ART.loading;
}
function walk(g, fn) { if (!g) return; var c = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []; c.forEach(function (poly) { poly.forEach(function (ring) { ring.forEach(fn); }); }); }
function pathFor(g, P) {
  var c = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [], d = '';
  c.forEach(function (poly) { poly.forEach(function (ring) { var last = null; ring.forEach(function (p, i) { var q = P(p); var s = q[0].toFixed(1) + ' ' + q[1].toFixed(1); if (s === last) return; d += (i ? 'L' : 'M') + s; last = s; }); d += 'Z'; }); });
  return d;
}
function postcardSVG(r, w, h, opts) {
  opts = opts || {};
  var main = null, set = null;
  if (r.country === 'CH' && ART.ch) { set = ART.ch; main = set.by[String(r.oid)]; }
  else if (ART.nuts && r.n3) { set = ART.nuts; main = set.by[r.n3]; }
  var v = opts.score, col = scoreColor(v), uid = 'pc' + Math.random().toString(36).slice(2, 8);
  var bg = '<defs><radialGradient id="' + uid + 'g" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#173A63"/><stop offset="1" stop-color="#081626"/></radialGradient>' +
    '<filter id="' + uid + 'f" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="' + (w / 60).toFixed(1) + '" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
    '<pattern id="' + uid + 'p" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 14L14 0" stroke="#ffffff" stroke-opacity=".05" stroke-width="1"/></pattern></defs>' +
    '<rect width="' + w + '" height="' + h + '" fill="url(#' + uid + 'g)"/><rect width="' + w + '" height="' + h + '" fill="url(#' + uid + 'p)"/>';
  if (!main) {
    var cx = w / 2, cy = h / 2;
    return '<svg class="postcard" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + bg +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + h * .28 + '" fill="none" stroke="#ffffff" stroke-opacity=".08"/><circle cx="' + cx + '" cy="' + cy + '" r="' + h * .16 + '" fill="none" stroke="#ffffff" stroke-opacity=".12"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + Math.max(4, h * .05) + '" fill="' + col + '" filter="url(#' + uid + 'f)"/></svg>';
  }
  var b = main.bbox, padX = (b[2] - b[0]) * 1.1 + 0.01, padY = (b[3] - b[1]) * 1.1 + 0.01;
  var cx0 = (b[0] + b[2]) / 2, cy0 = (b[1] + b[3]) / 2, k = Math.cos(cy0 * Math.PI / 180);
  var spanX = (b[2] - b[0] + 2 * padX) * k, spanY = (b[3] - b[1] + 2 * padY);
  var s = Math.min(w / spanX, h / spanY) * (opts.zoom || 0.92);
  function P(p) { return [w / 2 + (p[0] - cx0) * k * s, h / 2 - (p[1] - cy0) * s]; }
  var vb = [cx0 - w / 2 / (k * s), cy0 - h / 2 / s, cx0 + w / 2 / (k * s), cy0 + h / 2 / s];
  var neigh = set.list.filter(function (f) { var q = f.bbox; return f !== main && q[0] < vb[2] && q[2] > vb[0] && q[1] < vb[3] && q[3] > vb[1]; }).slice(0, 220);
  var lakes = r.country === 'CH' && ART.chLakes ? ART.chLakes.filter(function (f) { var q = [180, 90, -180, -90]; walk(f.geometry, function (p) { if (p[0] < q[0]) q[0] = p[0]; if (p[1] < q[1]) q[1] = p[1]; if (p[0] > q[2]) q[2] = p[0]; if (p[1] > q[3]) q[3] = p[1]; }); return q[0] < vb[2] && q[2] > vb[0] && q[1] < vb[3] && q[3] > vb[1]; }) : [];
  var pin = fin(r.lat) ? P([r.lon, r.lat]) : P([cx0, cy0]);
  return '<svg class="postcard" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + bg +
    '<g fill="#ffffff" fill-opacity=".045" stroke="#9cc3f5" stroke-opacity=".22" stroke-width=".8">' + neigh.map(function (f) { return '<path d="' + pathFor(f.geometry, P) + '"/>'; }).join('') + '</g>' +
    (lakes.length ? '<g fill="#2b6aa8" fill-opacity=".55">' + lakes.map(function (f) { return '<path d="' + pathFor(f.geometry, P) + '"/>'; }).join('') + '</g>' : '') +
    '<path d="' + pathFor(main.geometry, P) + '" fill="' + col + '" fill-opacity=".92" stroke="#ffffff" stroke-width="1.6" filter="url(#' + uid + 'f)"/>' +
    (r.country !== 'CH' ? '<circle cx="' + pin[0].toFixed(1) + '" cy="' + pin[1].toFixed(1) + '" r="' + Math.max(3.5, h * .028) + '" fill="#FFC933" stroke="#081626" stroke-width="1.5"/>' : '') +
    '</svg>';
}
function hydratePostcards(root) {
  var els = $$('[data-postcard]', root);
  if (!els.length) return;
  ensureArtGeo().then(function () {
    els.forEach(function (el) {
      var r = BYID[el.dataset.postcard]; if (!r || el.dataset.drawn) return;
      el.dataset.drawn = 1;
      var x = RES && RES.byId[r.id], v = x ? x.overall : surfaceValue(r);
      el.insertAdjacentHTML('afterbegin', postcardSVG(r, +el.dataset.w || 420, +el.dataset.h || 220, { score: v }));
    });
  });
}
