/* Views moved out of the start bundle in 2.10 (regional board, radar chart) */
function boardHTML() {
  if (!RES) return '';
  var out = [], keys = activeLanguageKeys();
  if (keys.length > 1 || S.cc === 'LU') {
    out.push('<div class="grp"><h3>Top five by language context</h3><p>' + esc(countryName(S.cc)) + ' is multilingual. Daily life, schools and administration change with the language area, so there is more than one answer.</p></div>');
    keys.forEach(function (k) {
      var A = META.config.languageAreas[k] || { name: k, note: '' };
      var loc = (LANG_LOCAL[S.cc] || {})[k]; if (loc) A = { name: A.name, note: loc };
      var top = RES.scored.filter(function (x) { return languageArea(x.r) === k; }).slice(0, 5);
      out.push('<div class="grp"><h3>' + esc(A.name) + '</h3><p>' + esc(A.note || '') + '</p><div class="opts">' + (top.length ? top.map(function (x) { return '<button class="chip ' + tone(x.overall) + '" data-id="' + esc(x.id) + '">' + esc(x.r.name) + ' <b>' + Math.round(x.overall) + '</b></button>'; }).join('') : '<span class="small muted">No ranked place in this language area.</span>') + '</div></div>');
    });
  } else {
    out.push('<div class="grp"><h3>Regional centre checks</h3><p>The strongest results in the largest places of ' + esc(scopeName()) + '. Use them as anchors before going small.</p><div class="opts">' +
      RES.scored.slice().sort(function (a, b) { return b.r.population - a.r.population; }).slice(0, 6).map(function (x) { return '<button class="chip ' + tone(x.overall) + '" data-id="' + esc(x.id) + '">' + esc(x.r.name) + ' <b>' + Math.round(x.overall) + '</b> #' + x.rank + '</button>'; }).join('') + '</div></div>');
  }
  if (S.profile === 'student' && S.cc === 'CH') {
    out.push('<div class="grp"><h3>Swiss university anchor check</h3><p>Campus access scores for the eleven university cities.</p><div class="opts">' + META.config.studentHubsCH.map(function (n) {
      var r = SHARD.records.find(function (x) { return x.name === n || stripParen(x.name) === n; }); if (!r) return '';
      var v = ENGINE.categories(r).student_access, x = RES.byId[r.id];
      return '<button class="chip ' + tone(v) + '" data-id="' + esc(r.id) + '">' + esc(r.name) + ' <b>' + fmt(v) + '</b>' + (x ? ' #' + x.rank : '') + '</button>';
    }).join('') + '</div></div>');
  }
  var xb = crossBorderForScope();
  out.push('<div class="grp"><h3>Cross-border commuter clusters</h3><p>Nearby places across the border that people use for work, shopping, airports or universities. They never change scores.</p><div class="opts">' +
    (xb.length ? xb.map(function (x, i) { return '<button class="chip" data-xb="' + i + '" title="' + esc(x.note) + '">' + flagImg(x.country) + ' ' + esc(x.label) + ' <b>' + Math.round(x.distance) + ' km</b></button>'; }).join('') : '<span class="small muted">No cross-border cluster within reach of this scope.</span>') + '</div></div>');
  window.NZ_BOARD_XB = xb;
  return '<div class="board">' + out.join('') + '</div>';
}
/* ---------- overlays: toast, definitions, modal, palette ---------- */
function radarSVG(x) {
  var r = x.r, w = ENGINE.weightsFor(r, S.profile), cats = x.catScores || ENGINE.categories(r);
  var keys = Object.keys(w).filter(function (k) { return fin(cats[k]); }).sort(function (a, b) { return w[b] - w[a]; }).slice(0, 8);
  if (keys.length < 3) keys = Object.keys(cats).filter(function (k) { return fin(cats[k]); }).slice(0, 8);
  if (keys.length < 3) return '';
  var sameArea = SHARD.records.filter(function (o) { return r.country === 'CH' ? o.canton === r.canton : (r.n2 && o.n2 === r.n2); });
  function avg(list, k) { var s = 0, n = 0; for (var i = 0; i < list.length; i++) { var v = ENGINE.categories(list[i])[k]; if (fin(v)) { s += v; n++; } } return n ? s / n : null; }
  if (!SHARD._avg) SHARD._avg = {};
  var place = keys.map(function (k) { return cats[k]; });
  var areaAvg = keys.map(function (k) { return avg(sameArea, k); });
  var ctry = keys.map(function (k) { var ck = S.method + k; if (!(ck in SHARD._avg)) SHARD._avg[ck] = avg(SHARD.records, k); return SHARD._avg[ck]; });
  var cx = 200, cy = 175, R = 125, n = keys.length;
  function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v / 100, cy + Math.sin(a) * R * v / 100]; }
  var rings = [25, 50, 75, 100].map(function (v) { return '<polygon points="' + keys.map(function (_, i) { return pt(i, v).join(','); }).join(' ') + '" fill="none" stroke="var(--line)"/>'; }).join('');
  var axes = keys.map(function (k, i) { var p = pt(i, 100), l = pt(i, 118); return '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="var(--line)"/><text x="' + l[0] + '" y="' + l[1] + '" text-anchor="middle" dominant-baseline="middle">' + esc(shortCat(k)) + '</text>'; }).join('');
  function series(vals, col, dash, fill) { var ok = vals.every(fin); if (!ok) return ''; return '<polygon points="' + vals.map(function (v, i) { return pt(i, v).join(','); }).join(' ') + '" fill="' + (fill || 'none') + '" stroke="' + col + '" stroke-width="2.2"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>'; }
  var areaLabel = r.country === 'CH' ? r.cantonName + ' average' : localAreaOf(r) + ' average';
  var table = keys.map(function (k, i) { var d = place[i] - ctry[i]; return '<tr><td>' + esc(shortCat(k)) + '</td><td class="num"><b>' + fmt(place[i]) + '</b></td><td class="num">' + fmt(areaAvg[i]) + '</td><td class="num">' + fmt(ctry[i]) + '</td><td class="num"><span class="delta ' + (d >= 0 ? 'good' : 'bad') + '">' + signed(d, 0) + '</span></td></tr>'; }).join('');
  return '<section class="sec"><h3>Profile shape</h3><div class="radar-legend"><span><i style="background:var(--blue)"></i>' + esc(r.name) + '</span><span><i style="background:var(--green)"></i>' + esc(areaLabel) + '</span><span><i style="background:var(--amber)"></i>' + esc(countryName(r.country)) + ' average</span></div>' +
    '<svg class="radar" viewBox="0 0 400 350" role="img" aria-label="Spider chart comparing ' + esc(r.name) + ' with area and country averages">' + rings + axes + series(ctry, 'var(--amber)', '6 6') + series(areaAvg, 'var(--green)', '4 6') + series(place, 'var(--blue)', '', 'color-mix(in srgb,var(--blue) 14%,transparent)') + '</svg>' +
    '<div class="tablewrap"><table class="table"><thead><tr><th>Category</th><th class="num">Here</th><th class="num">' + esc(r.country === 'CH' ? 'Canton' : 'Region') + '</th><th class="num">Country</th><th class="num">Δ</th></tr></thead><tbody>' + table + '</tbody></table></div></section>';
}

/* ---------- place postcard (moved out of the start bundle in 2.10) ---------- */
function postcardSVG(r, w, h, opts) {
  opts = opts || {};
  var main = null, set = null;
  if (r.country === 'CH' && ART.ch) { set = ART.ch; main = set.by[String(r.oid)]; }
  else if (ART.nuts && r.n3) { set = ART.nuts; main = set.by[r.n3]; }
  var v = opts.score, col = scoreColor(v), uid = 'pc' + Math.random().toString(36).slice(2, 8);
  var bg = '<defs><radialGradient id="' + uid + 'g" cx="50%" cy="45%" r="75%"><stop offset="0" style="stop-color:var(--pc-a)"/><stop offset="1" style="stop-color:var(--pc-b)"/></radialGradient>' +
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
    '<g fill="#ffffff" fill-opacity=".045" style="stroke:var(--pc-edge)" stroke-opacity=".22" stroke-width=".8">' + neigh.map(function (f) { return '<path d="' + pathFor(f.geometry, P) + '"/>'; }).join('') + '</g>' +
    (lakes.length ? '<g fill="#2b6aa8" fill-opacity=".55">' + lakes.map(function (f) { return '<path d="' + pathFor(f.geometry, P) + '"/>'; }).join('') + '</g>' : '') +
    '<path d="' + pathFor(main.geometry, P) + '" fill="' + col + '" fill-opacity=".92" stroke="#ffffff" stroke-width="1.6" filter="url(#' + uid + 'f)"/>' +
    (r.country !== 'CH' ? '<circle cx="' + pin[0].toFixed(1) + '" cy="' + pin[1].toFixed(1) + '" r="' + Math.max(3.5, h * .028) + '" fill="#FFC933" stroke="#081626" stroke-width="1.5"/>' : '') +
    '</svg>';
}
/* outside Europe the region outlines come per country (data/geo/w/{CC}.json) and join the same index */

/* around an open place: its nearest hub airport, seaport, university town and big city as labelled pins (2.10.1).
   Airports from OurAirports and ports from Natural Earth (data/anchors.json, loaded once); towns from the country's places. */
var ANCH = null, ANCH_ROR = null;
function anchorPins(r, tok) {
  if (!fin(r.lat) || !SHARD || r.country !== S.cc) return;
  // what matters to the selected target group (config.anchorKinds): a student sees universities, a chemical plant ports
  // and chemical parks, a lab universities and research institutions, and so on
  var AK = META.config.anchorKinds || {}, kinds = AK[S.profile] || AK['default'] || ['air', 'city'];
  var needRor = kinds.some(function (k) { return /^(uni|res)/.test(k); });
  (ANCH = ANCH || getJSON('/data/anchors.json?v=__VERSION__').catch(function () { ANCH = null; return null; })).then(function (A) {
    return needRor ? (ANCH_ROR = ANCH_ROR || getJSON('/data/anchors_ror.json?v=__VERSION__').catch(function () { ANCH_ROR = null; return null; })).then(function (R) { return [A, R]; }) : [A, null];
  }).then(function (AR) {
    var A = AR[0], R = AR[1];
    if (!A || S.selected !== r.id || !MAP || (tok && tok !== MAPSTATE.ancTok)) return;
    var me = [r.lon, r.lat], g = r.geo || {}, out = [], nm = function (x) { return stripParen(x.name).split(',')[0]; };
    // nearest first, but a major institution (many member organisations in ROR) beats a small specialised school nearby
    var near = function (list, n, max, sized) { return (list || []).map(function (p) { var d = km(me, [p[2], p[1]]), sz = sized ? (p[3] || 0) : 0; return { d: d, e: sized ? (sz < 0 ? d + 60 : d / (1 + 0.6 * Math.log(1 + sz))) : d, p: p }; }).filter(function (x) { return x.d <= max; }).sort(function (a, b) { return a.e - b.e; }).slice(0, n); };
    kinds.forEach(function (k) {
      var n = +(k.match(/\d+$/) || [1])[0], kk = k.replace(/\d+$/, '');
      if (kk === 'air') { var a = g.hubAirport && A.airports[g.hubAirport]; if (a) out.push(['✈', g.hubAirport.replace(/ \([A-Z0-9]{3}\)$/, ''), [a[1], a[0]], 'Hub airport']); }
      else if (kk === 'port') {
        var sp = near(A.ports, 1, 150)[0], ip = near(A.iports, 1, 150)[0];
        if (ip) out.push(['⚓', ip.p[0], [ip.p[2], ip.p[1]], 'Inland port']);
        if (sp && (!ip || sp.d < ip.d * 1.5)) out.push(['⚓', sp.p[0] || 'Seaport', [sp.p[2], sp.p[1]], 'Seaport']);
      }
      else if (kk === 'fin' && A.fin) { var RL = { B: 'banking', I: 'insurance', F: 'funds', C: 'commodity trading', G: 'gold', X: 'crypto', W: 'private wealth' }; near(A.fin, 2, 250).forEach(function (x) { out.push(['🏦', x.p[0], [x.p[2], x.p[1]], 'Financial centre: ' + x.p[4].split('').map(function (c) { return RL[c]; }).filter(Boolean).join(', ')]); }); }
      else if (kk === 'chem') near(A.chem, 2, 200).forEach(function (x) { out.push(['🏭', x.p[0], [x.p[2], x.p[1]], 'Chemical park with pipeline links']); });
      else if (kk === 'uni' && R) near(R.uni, n, 80, true).forEach(function (x) { out.push(['🎓', x.p[0], [x.p[2], x.p[1]], 'University or university of applied sciences']); });
      else if (kk === 'res' && R) near(R.res, n, 120, true).forEach(function (x) { out.push(['🔬', x.p[0], [x.p[2], x.p[1]], 'Research institution']); });
      else if (kk === 'city' && !(r.population >= 100000)) {
        var city = null; SHARD.records.forEach(function (x) { if (x.population >= 100000 && fin(x.lat) && !x.whole) { var d = km(me, [x.lon, x.lat]); if (!city || d < city.d) city = { d: d, x: x }; } });
        if (city) out.push(['🏙', nm(city.x), [city.x.lon, city.x.lat], 'City of 100,000+']);
      }
    });
    // several institutions in the same city share one pin
    // institutions of one kind in the same city share one pin; different kinds at the same point are set slightly apart
    var seen = {}, at = {}, labels = {};
    out.forEach(function (o) {
      var pt = o[2][0].toFixed(3) + ',' + o[2][1].toFixed(3), key = o[3] + '|' + pt;
      if (!seen[key] && at[pt]) { o[2] = [o[2][0] + 0.012 * at[pt], o[2][1] - 0.006 * at[pt]]; }
      if (!seen[key]) at[pt] = (at[pt] || 0) + 1;
      var d = Math.round(km(me, o[2]));
      if (!seen[key] && labels[o[1]]) return;   // the same name twice (a city pin and its namesake) shows once
      labels[o[1]] = 1;
      if (seen[key]) { seen[key].n++; seen[key].names.push(o[1]); seen[key].el.title = seen[key].kind + ': ' + seen[key].names.join('; ') + ', ' + d + ' km'; seen[key].el.lastChild.textContent = ' +' + (seen[key].n - 1); return; }
      // compact label (2.11): icon, a short name and the distance; the full name stays in the tooltip
      var short = ancShort(o[1]);
      addMarker(o[2], 'anc', o[0], o[3] + ': ' + o[1] + ', ' + d + ' km in a straight line from ' + r.name, function () { MAP.flyTo({ center: o[2], zoom: Math.max(MAP.getZoom(), 9) }); });
      var m = MAPSTATE.markers[MAPSTATE.markers.length - 1], el = m.getElement();
      el.innerHTML = '<span class="ai">' + o[0] + '</span><span class="al">' + esc(short) + '</span><span class="ak">' + d + ' km</span><b></b>';
      seen[key] = { n: 1, names: [o[1]], el: el, kind: o[3] };
    });
    declutterMarkers(); ancDeclutter();
    if (!MAPSTATE.ancHook) { MAPSTATE.ancHook = 1; MAP.on('zoomend', ancDeclutter); MAP.on('moveend', ancDeclutter); }
  });
}
function ancShort(n) {
  var s = String(n).replace(/\s*\(.*?\)/g, '').replace(/^(University of|Universität|Université|Università|Universidad|Universidade|Uniwersytet|Technische Universität|Hochschule|Port of|Haven van|Hafen)\s+/i, '').replace(/\s+(International )?(Airport|Flughafen|Aéroport|Aeropuerto|Aeroporto)$/i, '').replace(/\s*(University|Universität)$/i, '');
  return s.length > 18 ? s.slice(0, 17).replace(/\s+\S*$/, '') + '…' : s;
}
// anchor pins that collide on screen shrink to icon and distance (full name in the tooltip); rechecked after every zoom
function ancDeclutter() {
  // no two labels may touch (2.11.2): every other pin on the map is an obstacle; an anchor label keeps its full text
  // where it fits, else moves to a free spot close by, else shows its icon only, else steps aside (hidden)
  var els = Array.prototype.slice.call(document.querySelectorAll('.pin.anc')), boxes = [];
  els.forEach(function (e) { e.classList.remove('mini'); e.style.translate = ''; e.style.visibility = ''; });
  document.querySelectorAll('.maplibregl-marker.pin:not(.anc)').forEach(function (e) { var r = e.getBoundingClientRect(); if (r.width && r.height) boxes.push(r); });
  var hit = function (b) { return boxes.some(function (x) { return !(b.right < x.left - 3 || b.left > x.right + 3 || b.bottom < x.top - 3 || b.top > x.bottom + 3); }); };
  var shift = function (b, dx, dy) { return { left: b.left + dx, right: b.right + dx, top: b.top + dy, bottom: b.bottom + dy }; };
  var OFF = [[0, -26], [0, 26], [0, -50], [0, 50], [60, 0], [-60, 0], [50, -26], [-50, -26], [50, 26], [-50, 26]];
  els.forEach(function (e) {
    for (var pass = 0; pass < 2; pass++) {
      if (pass) e.classList.add('mini');
      var b = e.getBoundingClientRect();
      if (!hit(b)) { boxes.push(b); return; }
      for (var k = 0; k < OFF.length; k++) { var s2 = shift(b, OFF[k][0], OFF[k][1]); if (!hit(s2)) { e.style.translate = OFF[k][0] + 'px ' + OFF[k][1] + 'px'; boxes.push(s2); return; } }
    }
    e.style.visibility = 'hidden';
  });
}
