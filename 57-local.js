/* Live local context, loaded when a place opens. Both fail soft: if a service is down the section says so.
   1. Everyday life within 1.5 km of the municipality centre, counted from OpenStreetMap (Overpass API, ODbL).
   2. The wider region at a glance from Eurostat's regional statistics (NUTS 2 and NUTS 3, open data). */
var AMEN = {}, REGSTAT = {};
var AMEN_DEF = [
  ['school', '🏫', 'Schools', 'nwr(around:R,LAT,LON)[amenity=school]'],
  ['kinder', '🧸', 'Kindergartens', 'nwr(around:R,LAT,LON)[amenity~"^(kindergarten|childcare)$"]'],
  ['doctor', '🩺', 'Doctors and clinics', 'nwr(around:R,LAT,LON)[amenity~"^(doctors|clinic|dentist)$"]'],
  ['pharm', '💊', 'Pharmacies', 'nwr(around:R,LAT,LON)[amenity=pharmacy]'],
  ['food', '🛒', 'Supermarkets', 'nwr(around:R,LAT,LON)[shop~"^(supermarket|convenience)$"]'],
  ['bakery', '🥖', 'Bakeries', 'nwr(around:R,LAT,LON)[shop=bakery]'],
  ['eat', '🍽️', 'Restaurants and cafés', 'nwr(around:R,LAT,LON)[amenity~"^(restaurant|cafe)$"]'],
  ['bar', '🍺', 'Bars and pubs', 'nwr(around:R,LAT,LON)[amenity~"^(bar|pub|biergarten)$"]'],
  ['play', '🛝', 'Playgrounds', 'nwr(around:R,LAT,LON)[leisure=playground]'],
  ['sport', '🏊', 'Sports and pools', 'nwr(around:R,LAT,LON)[leisure~"^(sports_centre|fitness_centre|swimming_pool|sports_hall)$"]'],
  ['train', '🚉', 'Train stations', 'node(around:R,LAT,LON)[railway~"^(station|halt)$"]'],
  ['bus', '🚌', 'Bus and tram stops', 'node(around:R,LAT,LON)[highway=bus_stop]'],
  ['charge', '🔌', 'EV charging points', 'nwr(around:R,LAT,LON)[amenity=charging_station]'],
  ['lib', '📚', 'Libraries', 'nwr(around:R,LAT,LON)[amenity=library]']
];
function amenitiesFor(r) {
  if (AMEN[r.id]) return AMEN[r.id];
  if (!fin(r.lat)) return Promise.resolve(null);
  var q = '[out:json][timeout:20];' + AMEN_DEF.map(function (d) { return d[3].replace(/R/, '1500').replace('LAT', r.lat.toFixed(5)).replace('LON', r.lon.toFixed(5)) + ';out count;'; }).join('');
  AMEN[r.id] = liveFetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
    .then(function (j) {
      var counts = (j.elements || []).filter(function (e) { return e.type === 'count'; });
      if (counts.length !== AMEN_DEF.length) return null;
      var o = {}; AMEN_DEF.forEach(function (d, i) { o[d[0]] = +((counts[i].tags || {}).total || 0); }); return o;
    }).catch(function () { delete AMEN[r.id]; return null; });
  return AMEN[r.id];
}
function amenitiesHTML(r, a) {
  if (!a) return '<p class="small muted">Everyday places could not be counted right now (the OpenStreetMap service did not answer). <button class="linkbtn" type="button" data-retry>Try again</button></p>';
  var tot = AMEN_DEF.reduce(function (s, d) { return s + a[d[0]]; }, 0);
  var verdict = tot === 0 ? 'Nothing mapped within 1.5 km of the centre: a very rural spot, or OpenStreetMap is thin here.' :
    a.food && a.school && (a.doctor || a.pharm) ? 'The basics are within walking distance: shopping, school and health care.' :
    a.food || a.school ? 'Some basics are close; for the rest you will need a car, bike or bus.' : 'Few everyday places nearby; plan on driving for shopping and school.';
  return '<p class="small">' + esc(verdict) + '</p><div class="amen">' + AMEN_DEF.map(function (d) { var n = a[d[0]]; return '<div class="am' + (n ? '' : ' zero') + '"><span aria-hidden="true">' + d[1] + '</span><b>' + (n > 99 ? '99+' : n) + '</b><small>' + esc(d[2]) + '</small></div>'; }).join('') + '</div>' +
    '<p class="small muted">Counted within 1.5 km of the municipality centre in OpenStreetMap (© OpenStreetMap contributors, ODbL). Volunteers map unevenly, so a zero can mean "not mapped yet".</p>';
}

/* Eurostat JSON-stat: pick a value for the preferred categories, latest year with data */
function jsPick(j, prefs) {
  if (!j || !j.id || !j.dimension) return null;
  var ids = j.id, size = j.size, stride = [], acc = 1, i;
  for (i = ids.length - 1; i >= 0; i--) { stride[i] = acc; acc *= size[i]; }
  var val = j.value || {}, base = 0, timeDim = -1;
  for (i = 0; i < ids.length; i++) {
    var d = ids[i], idx = j.dimension[d].category.index, codes = Array.isArray(idx) ? idx : Object.keys(idx).sort(function (a, b) { return idx[a] - idx[b]; });
    if (d === 'time') { timeDim = i; continue; }
    var want = prefs[d], pos = 0;
    if (want) { var hit = -1; for (var w = 0; w < want.length && hit < 0; w++) { for (var c = 0; c < codes.length; c++) if (want[w] instanceof RegExp ? want[w].test(codes[c]) : codes[c] === want[w]) { hit = c; break; } } if (hit < 0) return null; pos = hit; }
    else if (codes.length > 1 && d !== 'freq' && d !== 'geo') { /* unknown choice: take the first, but only when harmless */ pos = 0; }
    base += pos * stride[i];
  }
  if (timeDim < 0) { var v0 = val[base]; return fin(v0) ? { v: v0 } : null; }
  var tidx = j.dimension.time.category.index, tcodes = Array.isArray(tidx) ? tidx : Object.keys(tidx).sort(function (a, b) { return tidx[a] - tidx[b]; });
  for (var t = tcodes.length - 1; t >= 0; t--) { var v = val[base + t * stride[timeDim]]; if (fin(v)) return { v: v, year: tcodes[t] }; }
  return null;
}
var EUROSTAT = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';
var REG_DEF = [
  { k: 'gdp', ds: 'nama_10r_3gdp', lvl: 3, prefs: { unit: [/^PPS_(HAB_)?EU27_2020(_HAB)?$/] }, label: 'Economic output per person', fmt: function (v) { return fmt(v, 0) + ' (EU average = 100)'; }, note: 'GDP per inhabitant in purchasing power standards' },
  { k: 'unemp', ds: 'lfst_r_lfu3rt', lvl: 2, prefs: { sex: ['T'], age: ['Y15-74', 'Y20-64'], unit: ['PC'], isced11: ['TOTAL'] }, label: 'Unemployment rate', fmt: function (v) { return fmt(v, 1) + '%'; } },
  { k: 'life', ds: 'demo_r_mlifexp', lvl: 2, prefs: { sex: ['T'], age: ['Y_LT1'], unit: ['YR'] }, label: 'Life expectancy at birth', fmt: function (v) { return fmt(v, 1) + ' years'; } },
  { k: 'medage', ds: 'demo_r_pjanind3', lvl: 3, prefs: { indic_de: ['MEDAGEPOP'], unit: ['YR'] }, label: 'Median age', fmt: function (v) { return fmt(v, 1) + ' years'; } },
  { k: 'docs', ds: 'hlth_rs_physreg', lvl: 2, prefs: { unit: ['P_HTHAB'], isco08: [/./] }, label: 'Doctors per 100,000 residents', fmt: function (v) { return fmtInt(v); } }
];
function regionStatsFor(r) {
  var key = (r.n3 || '') + '|' + (r.n2 || '');
  if (!r.n3 && !r.n2) return Promise.resolve(null);
  if (REGSTAT[key]) return REGSTAT[key];
  REGSTAT[key] = Promise.all(REG_DEF.map(function (d) {
    var codes = d.lvl === 3 ? [r.n3, r.n2] : [r.n2, r.n1];
    var tryCode = function (k) {
      var geo = codes[k]; if (!geo) return Promise.resolve(null);
      return liveFetch(EUROSTAT + d.ds + '?format=JSON&lang=EN&geo=' + encodeURIComponent(geo) + '&sinceTimePeriod=2015').then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
        .then(function (j) { var p = jsPick(j, d.prefs); if (p) { p.geo = geo; p.d = d; } return p || (k === 0 ? tryCode(1) : null); })
        .catch(function () { return k === 0 ? tryCode(1) : null; });
    };
    return tryCode(0);
  })).then(function (list) { list = list.filter(Boolean); if (!list.length) delete REGSTAT[key]; return list.length ? list : null; });
  return REGSTAT[key];
}
function regionStatsHTML(r, list) {
  if (!list) return '<p class="small muted">Regional statistics could not be loaded right now (Eurostat did not answer). <button class="linkbtn" type="button" data-retry>Try again</button></p>';
  return '<div class="tablewrap"><table class="table facts"><tbody>' + list.map(function (p) {
    return '<tr><th scope="row">' + esc(p.d.label) + '<div class="small muted">' + esc(nutsName(p.geo)) + (p.year ? ', ' + esc(p.year) : '') + '</div></th><td class="num"><b>' + esc(p.d.fmt(p.v)) + '</b></td></tr>';
  }).join('') + '</tbody></table></div><p class="small muted">Eurostat regional statistics for the wider ' + (r.country === 'CH' ? 'canton or region' : 'region') + ', not for ' + esc(r.name) + ' alone. They do not change the score. Source: Eurostat (' + list.map(function (p) { return p.d.ds; }).join(', ') + '), reuse permitted with attribution.</p>';
}
