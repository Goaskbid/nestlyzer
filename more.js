/* Loaded on demand (assets/more.js). All data: every number Nestlyzer holds for a place, grouped by theme, for the place panel ("All data" tab) and
   for compare ("Show all data"). Plus country facts, earthquakes (USGS) and the data catalogue.
   Nothing in this file changes a score. */

/* country facts: EU, euro, Schengen, currency, standard VAT rate (%), drives on the left */
var CFACTS = {
  AL: [0, 0, 0, 'Albanian lek (ALL)', 20], AT: [1, 1, 1, 'Euro', 20], BE: [1, 1, 1, 'Euro', 21], BG: [1, 1, 1, 'Euro (since January 2026)', 20],
  CH: [0, 0, 1, 'Swiss franc (CHF)', 8.1], CY: [1, 1, 0, 'Euro', 19, 1], CZ: [1, 0, 1, 'Czech koruna (CZK)', 21], DE: [1, 1, 1, 'Euro', 19],
  DK: [1, 0, 1, 'Danish krone (DKK)', 25], EE: [1, 1, 1, 'Euro', 24], EL: [1, 1, 1, 'Euro', 24], ES: [1, 1, 1, 'Euro', 21], FI: [1, 1, 1, 'Euro', 25.5],
  FR: [1, 1, 1, 'Euro', 20], HR: [1, 1, 1, 'Euro', 25], HU: [1, 0, 1, 'Hungarian forint (HUF)', 27], IE: [1, 1, 0, 'Euro', 23, 1],
  IS: [0, 0, 1, 'Icelandic króna (ISK)', 24], IT: [1, 1, 1, 'Euro', 22], LI: [0, 0, 1, 'Swiss franc (CHF)', 8.1], LT: [1, 1, 1, 'Euro', 21],
  LU: [1, 1, 1, 'Euro', 17], LV: [1, 1, 1, 'Euro', 21], MK: [0, 0, 0, 'Macedonian denar (MKD)', 18], MT: [1, 1, 1, 'Euro', 18, 1],
  NL: [1, 1, 1, 'Euro', 21], NO: [0, 0, 1, 'Norwegian krone (NOK)', 25], PL: [1, 0, 1, 'Polish złoty (PLN)', 23], PT: [1, 1, 1, 'Euro', 23],
  RO: [1, 0, 1, 'Romanian leu (RON)', 21], RS: [0, 0, 0, 'Serbian dinar (RSD)', 20], SE: [1, 0, 1, 'Swedish krona (SEK)', 25],
  SI: [1, 1, 1, 'Euro', 22], SK: [1, 1, 1, 'Euro', 23], UK: [0, 0, 0, 'Pound sterling (GBP)', 20, 1]
};
var AD_GROUPS = [['fit', 'Score and ranking'], ['people', 'People'], ['family', 'Children and family'], ['money', 'Income, costs and taxes'], ['safety', 'Safety and health'], ['life', 'Everyday life nearby'], ['move', 'Getting around'], ['land', 'Land, water and climate'], ['risk', 'Risks to check'], ['know', 'Good to know'], ['ids', 'Codes and location']];
var AD_CAT = { foundation: 'people', demographics: 'people', family: 'family', tax: 'money', affordability: 'money', realestate: 'money', jobs: 'money', governance: 'money', safety: 'safety', health: 'safety', mobility: 'move', commuter_access: 'move', student_access: 'move', lifestyle: 'life', environment: 'land', coast: 'land' };
var AD_PGROUP = { people: 'people', access: 'move', nature: 'land', sky: 'land' };
/* factors that duplicate a parameter: shown once, as the parameter, with the factor's score */
var AD_DUP = { city: 'geo_major_city_km', air: 'geo_hub_airport_km', c30: 'geo_catchment_30km', coast: 'geo_coast_km', g5: 'common_population_growth_5y', pop: 'common_population_scale', dens: 'common_density_balance' };
var AD_DUPF = { common_low_crowding: 1, density_people_km2: 1, population_growth_pct: 1 };
/* live rows: regional statistics (REG_DEF keys) placed into groups */
var AD_REG = { kids: 'family', fert: 'family', medage: 'people', old: 'people', foreign: 'people', gdp: 'money', income: 'money', poverty: 'money', unemp: 'money', tert: 'money', life: 'safety', docs: 'safety', crime: 'safety' };

function adFmtRaw(f, raw) {
  if (!fin(raw)) return null;
  var u = f.unit || '', d = Math.abs(raw) < 10 ? 2 : Math.abs(raw) < 100 ? 1 : 0;
  if (/^%|percent/i.test(u)) return fmt(raw, 1) + '%';
  return fmt(raw, d) + (u ? ' ' + u : '');
}
/* the local rows for one place: { g, k, label, val, src } */
function adRows(r) {
  var out = [], x = placeX(r), fr = r.factorRaw || {}, fsc = r.factorScores || {};
  var frk = RES ? RES.factorRanks || {} : {}, crk = RES ? RES.categoryRanks || {} : {};
  function add(g, k, label, val, src) { if (val == null || val === '' || val === '–') return; out.push({ g: g, k: k, label: label, val: String(val), src: src || '' }); }
  var ranked = RES && RES.byId[r.id], p = profileDef(S.profile);
  /* score and ranking */
  add('fit', 'score', 'Score for ' + (p ? p.name : 'this profile'), fin(x.overall) ? fmt(x.overall) + ' of 100' : null, 'Nestlyzer, method ' + (S.method || 'v2'));
  add('fit', 'rank', 'Rank', ranked ? '#' + fmtInt(ranked.rank) + ' of ' + fmtInt(RES.scored.length) : 'not ranked', ranked ? 'in ' + scopeName() : '');
  add('fit', 'cover', 'Share of this profile that could be scored', fin(x.coverage) ? x.coverage + '%' : null, 'coverage');
  add('fit', 'conf', 'Source confidence', fin(r.sourceConfidence) ? fmt(r.sourceConfidence) + '%' : null, depthKind(r.country)[1]);
  var w = ENGINE.weightsFor(r, S.profile) || {}, cats = x.catScores || ENGINE.categories(r);
  Object.keys(cats).filter(function (k) { return fin(cats[k]); }).sort(function (a, b) { return (w[b] || 0) - (w[a] || 0) || cats[b] - cats[a]; }).forEach(function (k) {
    var rk = crk[k] && crk[k][r.id];
    add('fit', 'cat:' + k, shortCat(k), fmt(cats[k]) + ' of 100', (w[k] ? 'weight ' + w[k] : 'not weighted in this profile') + (rk ? ', #' + rk : ''));
  });
  /* parameters */
  PARAMS.forEach(function (pp) {
    var v = pval(r, pp.k); if (v == null) return;
    var nm = pp.name ? pp.name(r) : null, pc = pctOf(r, pp.k), fid = AD_DUP[pp.k], f = fid && ENGINE.factorById[fid];
    var val = pp.k === 'city' && v < 1 && r.popNow >= 100000 ? 'it is one' : pfmt(pp.k, v);
    var src = (pc != null ? 'higher than ' + pc + '% of ' + demonym(r.country) + ' ' + unitWord(r.country) : '') + (f && fin(fsc[fid]) ? (pc != null ? '; ' : '') + 'scored ' + fmt(fsc[fid]) : '');
    add(AD_PGROUP[pp.group] || 'know', 'p:' + pp.k, pp.label, val + (nm ? ' (' + nm + ')' : ''), src);
  });
  /* population history */
  var ap = r.trend && r.trend.annual_population;
  if (ap && ap.length) ap.forEach(function (o) { add('people', 'py:' + o.year, 'Residents in ' + o.year, fmtInt(o.population), 'Eurostat GISCO LAU'); });
  /* every scored factor, by theme */
  ENGINE.allFactors.forEach(function (f) {
    if (AD_DUPF[f.id]) return;
    for (var k in AD_DUP) if (AD_DUP[k] === f.id) return;
    var raw = fr[f.id], sc = fin(fsc[f.id]) ? fsc[f.id] : ENGINE.factorValue(r, f), rk = frk[f.id] && frk[f.id][r.id];
    if (!fin(raw) && !fin(sc)) return;
    var val = adFmtRaw(f, raw);
    add(AD_CAT[f.category] || 'know', 'f:' + f.id, f.name, val != null ? val : 'score ' + fmt(sc), (val != null && fin(sc) ? 'score ' + fmt(sc) + (rk ? ', #' + rk : '') + ' · ' : '') + (f.source_name || '') + (f.source_period ? ', ' + String(f.source_period).replace(/\s*snapshot in embedded build/i, '') : ''));
  });
  /* land: terrain, climate type, names */
  var t = terrainOf(r), c = climateOf(r), xx = r.x || {};
  if (t) add('land', 'terrain', 'Terrain', t.name, 'Mapzen terrain');
  if (c) add('land', 'climate', 'Climate type', c.code + ', ' + c.name + ': ' + c.text, 'Köppen-Geiger, Rubel et al. 2017');
  if (xx.land) add('land', 'landname', 'Landscape', xx.land, 'Natural Earth');
  if (xx.sea) add('land', 'seaname', 'Sea', xx.sea, 'Natural Earth');
  /* risks to check (local) */
  var riv = pval(r, 'river'), sea = pval(r, 'coast');
  if (riv != null && riv < 2) add('risk', 'flood-river', 'Next to a major river', pfmt('river', riv) + (xx.river ? ' (' + xx.river + ')' : ''), 'Check the official flood hazard map before you buy or rent');
  if (sea != null && sea < 2) add('risk', 'flood-sea', 'On the coast', 'Storm surge and coastal erosion can matter', 'Check the official coastal flood map');
  if (t && (t.cls === 'alpine' || t.cls === 'mountains')) add('risk', 'mountain', 'Mountain terrain', t.name + ', height range ' + pfmt('relief', t.relief) + ' within 15 km', 'Check avalanche, rockfall and landslide hazard maps; winter roads');
  /* good to know: country */
  var cf = CFACTS[r.country];
  if (cf) {
    add('know', 'eu', 'European Union', cf[0] ? 'Member' : 'Not a member', 'European Union');
    add('know', 'schengen', 'Schengen area', cf[2] ? 'Member: no routine passport checks with other Schengen countries' : 'Not a member', 'European Union');
    add('know', 'currency', 'Currency', cf[3], '');
    add('money', 'vat', 'Standard VAT rate (' + countryName(r.country) + ')', fmt(cf[4], 1) + '%', 'national rate, 2026');
    add('know', 'drive', 'Driving', cf[5] ? 'on the left' : 'on the right', '');
  }
  if (cf && cf[0]) add('know', 'sos', 'Emergency number', '112', 'works in every EU country');
  var tz = tzOf(r); add('know', 'tz', 'Time zone', 'UTC' + (tz >= 0 ? '+' : '') + tz + (r.country !== 'IS' ? ', summer time UTC' + (tz + 1 >= 0 ? '+' : '') + (tz + 1) : ', no summer time'), '');
  add('know', 'lang', 'Language', languageLabel(r), '');
  /* codes and location */
  add('ids', 'oid', 'Official municipality number', r.official_id, '');
  add('ids', 'gisco', 'Eurostat LAU code', r.gisco, '');
  if (r.n3) add('ids', 'n3', 'NUTS 3 region', r.n3 + ' ' + nutsName(r.n3), 'Eurostat NUTS 2021');
  if (r.n2) add('ids', 'n2', 'NUTS 2 region', r.n2 + ' ' + nutsName(r.n2), 'Eurostat NUTS 2021');
  add('ids', 'area', localKind(r.country), localAreaOf(r), '');
  if (fin(r.lat)) add('ids', 'latlon', 'Coordinates of the centre', fmt(r.lat, 4) + ', ' + fmt(r.lon, 4), r.locMethod === 1 || r.locMethod === '1' ? 'population-weighted centre (EDJNet)' : '');
  return out;
}
/* live rows, resolved: { g, k, label, val, src } */
function adLive(r) {
  if (!extOn()) return Promise.resolve({ off: true, rows: [] });
  var rows = [];
  function add(g, k, label, val, src) { if (val == null || val === '') return; rows.push({ g: g, k: k, label: label, val: String(val), src: src || '' }); }
  return Promise.all([
    regionStatsFor(r).catch(function () { return null; }),
    amenitiesFor(r).catch(function () { return null; }),
    climateFor(r).catch(function () { return null; }),
    wdFacts(r).catch(function () { return null; }),
    quakesFor(r).catch(function () { return null; })
  ]).then(function (a) {
    (a[0] || []).forEach(function (p) { add(AD_REG[p.d.k] || 'money', 'reg:' + p.d.k, p.d.label, p.d.fmt(p.v), (p.d.lvl === 0 ? countryName(r.country) + ' as a whole' : nutsName(p.geo)) + (p.year ? ', ' + p.year : '') + '; Eurostat ' + p.d.ds); });
    var am = a[1]; if (am) AMEN_DEF.forEach(function (d) { add('life', 'am:' + d[0], d[2] + ' within 1.5 km', fin(am[d[0]]) ? (am[d[0]] > 99 ? '99+' : am[d[0]]) : null, 'OpenStreetMap'); });
    var c = a[2];
    if (c) {
      var M = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
      add('land', 'cl:hi', 'Average daily high, January to December', c.hi.map(function (v) { return Math.round(v); }).join(' · ') + ' °C', 'NASA POWER');
      add('land', 'cl:lo', 'Average nightly low, January to December', c.lo.map(function (v) { return Math.round(v); }).join(' · ') + ' °C', 'NASA POWER');
      add('land', 'cl:rain', 'Rain per year', fmtInt(Math.round(c.year / 10) * 10) + ' mm', 'NASA POWER');
      if (fin(c.sunAnn)) add('land', 'cl:sun', 'Solar energy, yearly average', fmt(c.sunAnn, 1) + ' kWh/m² per day', 'NASA POWER');
      var hot = Math.max.apply(null, c.hi), hm = c.hi.indexOf(hot), frost = c.lo.filter(function (v) { return v < 0; }).length;
      add('risk', 'heat', 'Hottest month', M[hm] + ', average high ' + Math.round(hot) + ' °C' + (hot >= 30 ? ': hot summers, heat waves likely' : hot >= 27 ? ': warm summers' : ''), 'NASA POWER');
      add('risk', 'frost', 'Months with frosty nights on average', frost ? String(frost) : 'none', 'NASA POWER');
    }
    var f = a[3];
    if (f) {
      if (fin(f.elev)) add('know', 'wd:elev', 'Official altitude', fmtInt(f.elev) + ' m', 'Wikidata');
      if (f.postcode) add('know', 'wd:pc', 'Postcode', f.postcode, 'Wikidata');
      if (fin(f.founded)) add('know', 'wd:founded', 'First recorded or founded', f.founded < 0 ? Math.abs(f.founded) + ' BC' : String(f.founded), 'Wikidata');
      if (f.high) add('know', 'wd:high', 'Highest point', f.high, 'Wikidata');
      if (f.demonym) add('know', 'wd:dem', 'Locals are called', f.demonym, 'Wikidata');
      if (f.mayor) add('know', 'wd:mayor', 'Head of the local government', f.mayor, 'Wikidata');
      if (f.sisters && f.sisters.length) add('know', 'wd:sis', 'Sister towns', f.sisters.join(', '), 'Wikidata');
    }
    var q = a[4];
    if (q) {
      add('risk', 'quake', 'Earthquakes of magnitude 4.5+ within 100 km since 1975', q.n ? fmtInt(q.n) + (q.n >= 300 ? '+' : '') : 'none recorded', 'USGS');
      if (q.max) add('risk', 'quakemax', 'Strongest of them', 'magnitude ' + fmt(q.max.mag, 1) + ', ' + q.max.year + (q.max.km != null ? ', ' + fmtInt(q.max.km) + ' km away' : ''), 'USGS');
    }
    return { rows: rows, failed: { reg: !a[0], amen: !a[1], clim: !a[2], quake: !a[4] } };
  });
}
/* earthquakes of magnitude 4.5 or more within 100 km since 1975, from the USGS catalogue */
var QUAKES = {};
function quakesFor(r) {
  if (QUAKES[r.id]) return QUAKES[r.id];
  if (!fin(r.lat)) return Promise.resolve(null);
  var url = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=' + r.lat.toFixed(3) + '&longitude=' + r.lon.toFixed(3) + '&maxradiuskm=100&minmagnitude=4.5&starttime=1975-01-01&orderby=magnitude&limit=300';
  QUAKES[r.id] = liveFetch(url).then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); }).then(function (j) {
    var fs = (j && j.features) || [];
    var o = { n: fs.length, max: null };
    if (fs.length) {
      var p = fs[0].properties || {}, g = fs[0].geometry && fs[0].geometry.coordinates;
      o.max = { mag: p.mag, year: new Date(p.time).getUTCFullYear(), km: g ? Math.round(km([r.lon, r.lat], [g[0], g[1]])) : null };
    }
    return o;
  }).catch(function () { delete QUAKES[r.id]; return null; });
  return QUAKES[r.id];
}

/* ---------- the "All data" tab ---------- */
function adTable(rows, live) {
  return rows.map(function (o) { return '<tr data-adk="' + esc(o.k) + '" class="adr' + (live ? ' live' : '') + (o.src ? ' hasn' : '') + '"><th scope="row">' + esc(o.label) + '</th><td>' + esc(o.val) + '</td></tr>' + (o.src ? '<tr class="adn"><td colspan="2">' + esc(o.src) + '</td></tr>' : ''); }).join('');
}
function allDataHTML(r) {
  var rows = adRows(r);
  return '<section class="sec alldata" data-alldata="' + esc(r.id) + '"><h3>All data for ' + esc(r.name) + '</h3><p class="sub">Every number Nestlyzer has for this place, grouped by theme. Open a group to see it. Figures marked live load from Eurostat, OpenStreetMap, NASA, USGS and Wikidata; regional figures describe the wider region, not ' + esc(r.name) + ' alone.</p>' +
    '<div class="ad-tools"><button class="btn btn-sm" type="button" data-adall>Open all groups</button><button class="btn btn-sm" type="button" data-adcsv="' + esc(r.id) + '">' + ICON.doc + 'Download as CSV</button><button class="btn btn-sm btn-ghost" type="button" data-catalogue>What data we have</button></div>' +
    AD_GROUPS.map(function (g) {
      var mine = rows.filter(function (o) { return o.g === g[0]; });
      return '<details class="adg" data-adg="' + g[0] + '"><summary><b>' + esc(g[1]) + '</b> <span class="muted small" data-adn>' + mine.length + ' figures</span></summary><div class="tablewrap"><table class="table facts adt"><tbody data-adbody="' + g[0] + '">' + adTable(mine) + '</tbody></table></div></details>';
    }).join('') +
    '<p class="small muted" data-adstatus>' + (extOn() ? 'Loading live figures…' : 'Live content is switched off, so only the built-in figures are shown. <button class="linkbtn" type="button" data-extoggle>Turn it on</button>') + '</p></section>';
}
function adHydrate(r) {
  var root = $('#place [data-alldata="' + r.id + '"]'); if (!root || root.dataset.done) return;
  root.dataset.done = '1';
  adLive(r).then(function (res) {
    if (S.selected !== r.id || !document.contains(root)) return;
    var st = root.querySelector('[data-adstatus]');
    if (res.off) return;
    res.rows.forEach(function (o) {
      var tb = root.querySelector('[data-adbody="' + o.g + '"]'); if (!tb) return;
      tb.insertAdjacentHTML('beforeend', adTable([o], true));
    });
    AD_GROUPS.forEach(function (g) { var d = root.querySelector('[data-adg="' + g[0] + '"]'); if (!d) return; var n = d.querySelectorAll('tbody tr.adr').length, s = d.querySelector('[data-adn]'); if (s) s.textContent = n + ' figures'; d.hidden = !n; });
    var miss = []; if (res.failed.reg) miss.push('Eurostat'); if (res.failed.amen) miss.push('OpenStreetMap'); if (res.failed.clim) miss.push('NASA POWER'); if (res.failed.quake) miss.push('USGS');
    if (st) st.innerHTML = miss.length ? 'Some live figures could not be loaded right now (' + esc(miss.join(', ')) + ' did not answer). <button class="linkbtn" type="button" data-retry>Try again</button>' : 'All live figures loaded. Regional figures are for the wider region; the crime figure is a national survey.';
  });
}
function adCSV(id) {
  var r = BYID[id], root = $('#place [data-alldata="' + id + '"]'); if (!r || !root) return;
  var lines = [['group', 'item', 'value', 'source or note']];
  $$('#place [data-alldata="' + id + '"] details.adg').forEach(function (d) {
    var g = d.querySelector('summary b').textContent;
    d.querySelectorAll('tbody tr.adr').forEach(function (tr) { var nx = tr.nextElementSibling, note = nx && nx.classList.contains('adn') ? nx.textContent : ''; lines.push([g, tr.querySelector('th').textContent, tr.querySelector('td').textContent, note]); });
  });
  var csv = lines.map(function (l) { return l.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'nestlyzer-' + r.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') + '-all-data.csv'; document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- compare: every row, collapsed until asked for ---------- */
function cmpAllHTML(list) {
  var per = list.map(function (r) { var m = {}; adRows(r).forEach(function (o) { m[o.k] = o; }); return m; });
  var order = [], seen = {};
  list.forEach(function (r, i) { adRows(r).forEach(function (o) { if (!seen[o.k]) { seen[o.k] = 1; order.push(o); } }); });
  var n = list.length, total = order.length;
  var body = AD_GROUPS.map(function (g) {
    var rs = order.filter(function (o) { return o.g === g[0]; });
    return '<tbody data-cag="' + g[0] + '"><tr class="grp"><th colspan="' + (n + 1) + '">' + esc(g[1]) + '</th></tr>' + rs.map(function (o) { return cmpAllRow(o.k, o.label, per.map(function (m) { return m[o.k] ? m[o.k].val : '–'; })); }).join('') + '</tbody>';
  }).join('');
  return '<div class="tablewrap"><table class="cmpx"><thead><tr><th></th>' + list.map(function (r) { return '<th>' + flagImg(r.country) + ' <b>' + esc(r.name) + '</b></th>'; }).join('') + '</tr></thead>' + body + '</table></div><p class="small muted" data-castatus>' + total + ' rows. Live rows are being added…</p>';
}
function cmpAllRow(k, label, vals) { return '<tr data-cak="' + esc(k) + '"><th scope="row">' + esc(label) + '</th>' + vals.map(function (v) { return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>'; }
function cmpAllHydrate(det) {
  var ids = det.dataset.cmpall.split(','), list = ids.map(function (id) { return BYID[id]; }).filter(Boolean), st = det.querySelector('[data-castatus]');
  if (!extOn()) { if (st) st.innerHTML = 'Live content is switched off, so only the built-in figures are shown.'; return; }
  if (st) st.textContent = 'Loading live figures…';
  Promise.all(list.map(adLive)).then(function (res) {
    if (!document.contains(det)) return;
    var per = res.map(function (x) { var m = {}; (x.rows || []).forEach(function (o) { m[o.k] = o; }); return m; }), order = [], seen = {};
    res.forEach(function (x) { (x.rows || []).forEach(function (o) { if (!seen[o.k]) { seen[o.k] = 1; order.push(o); } }); });
    order.forEach(function (o) {
      var tb = det.querySelector('[data-cag="' + o.g + '"]'); if (!tb || tb.querySelector('[data-cak="' + o.k + '"]')) return;
      tb.insertAdjacentHTML('beforeend', cmpAllRow(o.k, o.label, per.map(function (m) { return m[o.k] ? m[o.k].val : '–'; })));
    });
    if (st) st.textContent = order.length + ' live rows added. Regional figures describe the wider region; the crime figure is a national survey.';
  });
}

/* ---------- the data catalogue ---------- */
function catalogueHTML() {
  var C = typeof CATALOGUE !== 'undefined' ? CATALOGUE : { items: [], missing: [] };
  var py = (META.population || {}).year || 2024, by = (META.population || {}).base_year || py - 5;
  function per(s) { return String(s || '').replace('BASEYEAR', by).replace('POPYEAR', py); }
  var heads = [['built', 'Built in, for every municipality'], ['factors', 'Scored factors (built in)'], ['country', 'Country facts (built in)'], ['live', 'Loaded live when you open a place']];
  return '<p>' + esc(C.note || '') + '</p>' + heads.map(function (h) {
    var it = C.items.filter(function (o) { return o.g === h[0]; }); if (!it.length) return '';
    return '<h3 class="fh">' + esc(h[1]) + ' <span class="muted small">' + it.length + '</span></h3><div class="tablewrap"><table class="table cat"><thead><tr><th>What</th><th>Level</th><th>Countries</th><th>Source and year</th><th>In the score</th></tr></thead><tbody>' +
      it.map(function (o) { return '<tr><td>' + esc(o.label) + '</td><td>' + esc(o.level) + '</td><td>' + esc(o.cover) + '</td><td>' + (o.url ? '<a href="' + esc(o.url) + '" target="_blank" rel="noopener">' + esc(o.src) + '</a>' : esc(o.src)) + (o.period ? ', ' + esc(per(o.period)) : '') + '</td><td>' + esc(o.score) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }).join('') + (C.missing && C.missing.length ? '<h3 class="fh">Not available yet, and why</h3><ul>' + C.missing.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>' : '');
}
function openCatalogue() { closeTools(); openModal('What data we have', '<div class="catalogue">' + catalogueHTML() + '</div>'); }

/* the picture filter: no people, no black and white, nothing off-topic, no near-copies of the same shot */
var PHOTO_PEOPLE = /\b(portrait|portr[aä]t|bildnis|selfie|people|person|persons|personen|menschen|men|women|man|woman|girl|boy|child|children|kinder|family|familie|wedding|hochzeit|bride|crowd|audience|publikum|band|concert|konzert|singer|musician|player|athlete|footballer|politician|mayor|b[uü]rgermeister|actor|actress|team|group[ _]photo|gruppenfoto|members|meeting|ceremony|award|interview|speaker|visit[ _]of|parade|umzug|festival)\b/i;
var PHOTO_BW = /black[- _]and[- _]white|\bb&w\b|\bb\/w\b|monochrom|grayscale|greyscale|sepia|schwarz[- _]?wei|noir[- _]et[- _]blanc|bianco[- _]e[- _]nero|blanco[- _]y[- _]negro|zwart[- _]wit/i;
var PHOTO_OFF = /\b(insects?|butterfl(y|ies)|moth|beetle|spider|birds?|v[oö]gel|flowers?|bl[uü]ten?|blumen?|mushrooms?|pilze?|fungi|lichens?|moss|macro|specimen|herbarium|fossils?|minerals?|interior|interieur|innenansicht|innenraum|altar|organ|orgel|stained[ _]glass|kirchenfenster|grave|gravestone|grabstein|tombstone|plaque|gedenktafel|inscription|inschrift|locomotive|lokomotive|tram|bus|truck|lkw|aircraft|airplane|flugzeug|vehicle|fahrzeug|tractor|traktor|book|manuscript|newspaper|zeitung|drawing|zeichnung|painting|gem[aä]lde|engraving|kupferstich|lithograph|postcard|ansichtskarte|postkarte|menu|dish|meal|cake|kuchen|logo|sticker|graffiti[ _]detail|detail)\b/i;
var PHOTO_PEOPLE_CAT = /(^|\|)(People|Portrait|Men |Women |Selfies|Groups of people|Sportspeople|Musicians|Politicians|Actors|Weddings|Crowds|Children|Faces|Human)/i;
function photoMetaOk(title, m) {
  m = m || {};
  var cats = (m.Categories && m.Categories.value) || '', desc = stripTags(m.ImageDescription && m.ImageDescription.value), obj = stripTags(m.ObjectName && m.ObjectName.value);
  var text = String(title || '').replace(/^File:/, '') + ' ' + obj + ' ' + desc.slice(0, 300);
  if (PHOTO_SKIP.test(text) || /maps|coats of arms|logos|diagrams|charts|aerial maps|plans|satellite|historical images|old photographs|postcards|paintings|drawings|engravings/i.test(cats)) return false;
  if (PHOTO_PEOPLE.test(text) || PHOTO_PEOPLE_CAT.test(cats)) return false;
  if (PHOTO_BW.test(text) || PHOTO_BW.test(cats)) return false;
  if (PHOTO_OFF.test(text)) return false;
  var dt = stripTags(m.DateTimeOriginal && m.DateTimeOriginal.value), y = +((/\b(1[6-9]\d\d|20\d\d)\b/.exec(dt) || [])[1] || 0);
  if (y && y < 1980) return false;
  return true;
}
/* same shot twice: "Meilen Kirche 01.jpg" and "Meilen Kirche 02.jpg" by the same photographer, or one photographer within the same hour */
function photoStem(title) { return String(title || '').replace(/^File:/, '').replace(/\.\w+$/, '').toLowerCase().replace(/\b(img|dsc|dscn|dscf|p|pict|photo|foto)[_-]?\d+/g, '').replace(/\(\d+\)|\d+|[_\-.,()]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function photoBucket(m) { m = m || {}; var a = stripTags(m.Artist && m.Artist.value), dt = stripTags(m.DateTimeOriginal && m.DateTimeOriginal.value); return a && dt.length >= 13 ? a + '|' + dt.slice(0, 13) : ''; }
/* pixels: a small thumbnail is drawn to a canvas. Grey or sepia (one hue only) is dropped, and so is a near-copy of a photo
   already kept (difference hash). Faces are dropped where the browser can find them. Anything that cannot be checked is kept. */
function smallThumb(src, w) { return /\/\d+px-/.test(src) ? src.replace(/\/\d+px-/, '/' + w + 'px-') : src; }
function photoPixels(src) {
  return new Promise(function (resolve) {
    var img = new Image(), done = false, finish = function (v) { if (!done) { done = true; resolve(v); } };
    img.crossOrigin = 'anonymous'; img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
    var to = setTimeout(function () { finish(null); }, 4000);
    img.onerror = function () { clearTimeout(to); finish(null); };
    img.onload = function () {
      clearTimeout(to);
      try {
        var c = document.createElement('canvas'), W = 32, H = 24; c.width = W; c.height = H;
        var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
        var d = g.getImageData(0, 0, W, H).data, n = W * H, srg = 0, syb = 0, qrg = 0, qyb = 0;
        for (var i = 0; i < d.length; i += 4) { var rg = d[i] - d[i + 1], yb = 0.5 * (d[i] + d[i + 1]) - d[i + 2]; srg += rg; syb += yb; qrg += rg * rg; qyb += yb * yb; }
        var mrg = srg / n, myb = syb / n, spread = Math.sqrt(Math.max(0, qrg / n - mrg * mrg) + Math.max(0, qyb / n - myb * myb));
        var h = document.createElement('canvas'); h.width = 9; h.height = 8; var hg = h.getContext('2d', { willReadFrequently: true }); hg.drawImage(img, 0, 0, 9, 8);
        var hd = hg.getImageData(0, 0, 9, 8).data, bits = [];
        for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) { var a = (y * 9 + x) * 4, b = a + 4; bits.push((hd[a] + hd[a + 1] + hd[a + 2]) > (hd[b] + hd[b + 1] + hd[b + 2]) ? 1 : 0); }
        var out = { spread: spread, hash: bits, faces: 0 };
        if ('FaceDetector' in window) {
          try { new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 }).detect(img).then(function (f) { out.faces = (f || []).filter(function (o) { var bb = o.boundingBox; return bb && bb.width * bb.height > 0.004 * img.naturalWidth * img.naturalHeight; }).length; finish(out); }, function () { finish(out); }); return; } catch (e) {}
        }
        finish(out);
      } catch (e) { finish(null); }
    };
    img.src = src;
  });
}
function hamming(a, b) { var n = 0; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; }
var PHOTO_GREY = 7, PHOTO_SAME = 10;
/* keep, in order, the photos whose pixels pass; at most `max` */
function photoPixelFilter(list, max) {
  return Promise.all(list.map(function (p) { return photoPixels(smallThumb(p.src, 120)); })).then(function (px) {
    var kept = [], hashes = [];
    list.forEach(function (p, i) {
      var q = px[i];
      if (q) {
        if (q.spread < PHOTO_GREY || q.faces) return;
        if (hashes.some(function (h) { return hamming(h, q.hash) <= PHOTO_SAME; })) return;
        hashes.push(q.hash);
      }
      if (kept.length < max) kept.push(p);
    });
    return kept;
  });
}
function photoFromInfo(p, ii) {
  var m = ii.extmetadata || {};
  return { src: ii.thumburl || ii.url, full: ii.url, page: ii.descriptionurl, author: stripTags(m.Artist && m.Artist.value).slice(0, 80), licence: (m.LicenseShortName && m.LicenseShortName.value) || '', licenceUrl: (m.LicenseUrl && m.LicenseUrl.value) || '', title: stripTags(m.ImageDescription && m.ImageDescription.value).slice(0, 140) || p.title.replace(/^File:/, '').replace(/\.\w+$/, ''), w: ii.width, h: ii.height, idx: p.index || 0, landscape: ii.width >= ii.height, stem: photoStem(p.title) + '|' + stripTags(m.Artist && m.Artist.value), bucket: photoBucket(m) };
}

/* extra regional and national indicators for the Facts tab and All data (Eurostat) */
/* a share from two picks of the same table: numerator / denominator (or numerator / (numerator + alternative)), same year */
function jsRatio(j, d) {
  var pick = function (code) { var p = {}; for (var k in d.prefs) p[k] = d.prefs[k]; p.citizen = [code]; return jsPick(j, p); };
  var num = pick(d.ratio.codes[0]); if (!num) return null;
  var den = pick(d.ratio.codes[1]);
  if (!den || den.year !== num.year) { var alt = pick(d.ratio.codes[2]); den = alt && alt.year === num.year ? { v: alt.v + num.v, year: num.year } : null; }
  if (!den || !(den.v > 0)) return null;
  return { v: 100 * num.v / den.v, year: num.year };
}
var REG_MORE = [
  { k: 'kids', ds: 'demo_r_pjanind3', lvl: 3, prefs: { indic_de: ['PC_Y0_14'], unit: ['PC'] }, label: 'Children under 15', fmt: function (v) { return fmt(v, 1) + '% of residents'; } },
  { k: 'old', ds: 'demo_r_pjanind3', lvl: 3, prefs: { indic_de: ['PC_Y65_MAX'], unit: ['PC'] }, label: 'Residents aged 65 and over', fmt: function (v) { return fmt(v, 1) + '% of residents'; } },
  { k: 'fert', ds: 'demo_r_find3', lvl: 3, prefs: { indic_de: ['TOTFERRT'], unit: ['NR'] }, label: 'Children per woman', fmt: function (v) { return fmt(v, 2); } },
  { k: 'foreign', ds: 'lfst_r_lfsd2pwn', lvl: 2, prefs: { sex: ['T'], age: ['Y20-64'], wstatus: ['POP'], unit: ['THS_PER'] }, ratio: { codes: ['FOR', 'TOTAL', 'NAT'], pick: jsRatio }, label: 'Foreign citizens among residents aged 20 to 64', fmt: function (v) { return fmt(v, 1) + '%'; } },
  { k: 'income', ds: 'nama_10r_2hhinc', lvl: 2, prefs: { unit: ['EUR_HAB'], direct: ['BAL'], na_item: ['B6N'] }, label: 'Household disposable income per person', fmt: function (v) { return '€' + fmtInt(v) + ' a year'; } },
  { k: 'poverty', ds: 'ilc_peps11n', lvl: 2, prefs: { unit: ['PC'] }, label: 'At risk of poverty or social exclusion', fmt: function (v) { return fmt(v, 1) + '% of residents'; } },
  { k: 'tert', ds: 'edat_lfse_04', lvl: 2, prefs: { sex: ['T'], age: ['Y25-64'], isced11: ['ED5-8'], unit: ['PC'] }, label: 'Adults aged 25 to 64 with a university degree', fmt: function (v) { return fmt(v, 1) + '%'; } },
  { k: 'crime', ds: 'ilc_mddw03', lvl: 0, prefs: { hhtyp: ['TOTAL'], incgrp: ['TOTAL'], unit: ['PC'] }, label: 'People who report crime, violence or vandalism in their area', fmt: function (v) { return fmt(v, 1) + '% (national survey)'; } }
];

/* styles for these parts, added when the module loads */
(function () { var st = document.createElement('style'); st.id = 'nz-more-css'; st.textContent = ".alldata .ad-tools{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 10px}details.adg{border:1px solid var(--line);border-radius:12px;margin:0 0 8px;background:var(--surface)}details.adg>summary{cursor:pointer;padding:11px 14px;display:flex;align-items:baseline;gap:8px;list-style:none}details.adg>summary::-webkit-details-marker{display:none}details.adg>summary::before{content:\"▸\";color:var(--ink-3);transition:transform .15s}details.adg[open]>summary::before{transform:rotate(90deg)}details.adg .tablewrap{margin:0 10px 10px}.adt th{font-weight:550;width:55%}.adt td{text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.adt tr.hasn th,.adt tr.hasn td{border-bottom:0;padding-bottom:2px}.adt tr.adn td{text-align:left;font-size:12px;color:var(--ink-3);padding-top:0;font-variant-numeric:normal}.adt tr.live th::after{content:\"live\";margin-left:6px;font-size:10px;font-weight:700;color:var(--blue);border:1px solid currentColor;border-radius:4px;padding:0 4px;vertical-align:1px}table.cmpx{width:100%;border-collapse:collapse;font-size:var(--step--1)}.cmpx th,.cmpx td{padding:7px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.cmpx td{font-size:13px;overflow-wrap:anywhere}.cmpx tr.grp th{background:var(--surface-2);font-size:12px;color:var(--ink-3);padding:6px 8px}.cmpx th[scope=\"row\"]{font-weight:550;width:30%}@media (max-width:760px){.cmpx th[scope=\"row\"]{position:sticky;left:0;background:var(--surface);z-index:1;font-size:12.5px;box-shadow:2px 0 0 var(--line)}.cmpx td,.cmpx thead th{min-width:110px}}.catalogue table.cat td{font-size:13px;vertical-align:top}.catalogue table.cat td:first-child{font-weight:550}@media (prefers-reduced-motion:reduce){details.adg>summary::before{transition:none}}"; document.head.appendChild(st); })();

/* the folded households on the start screen are drawn on first use (keeps the start page light) */
function whoMoreFill(g) {
  if (g.dataset.filled) return; g.dataset.filled = '1';
  g.innerHTML = WHO_MORE.map(function (a) { return '<button type="button" data-who="' + esc(a[0]) + '" data-hero="' + esc(a[2]) + '" aria-pressed="false">' + profileIcon(a[0], 17) + esc(a[1]) + '</button>'; }).join('');
  $$('#who-more [data-who]').forEach(function (b) { b.addEventListener('mouseenter', function () { if (matchMedia('(hover: hover)').matches) heroSetProfile(b.dataset.hero || b.dataset.who); }); b.addEventListener('focus', function () { heroSetProfile(b.dataset.hero || b.dataset.who); }); });
}

/* more everyday places counted around the centre */
var AMEN_MORE = [
  ['post', '📮', 'Post offices', 'nwr(around:R,LAT,LON)[amenity=post_office]'],
  ['bank', '🏧', 'Banks and cash machines', 'nwr(around:R,LAT,LON)[amenity~"^(bank|atm)$"]'],
  ['park', '🌳', 'Parks', 'nwr(around:R,LAT,LON)[leisure=park]']
];
function adAll(b) { var ds = $$('#place details.adg'), open = ds.some(function (d) { return !d.open; }); ds.forEach(function (d) { d.open = open; }); b.textContent = open ? 'Close all groups' : 'Open all groups'; }

/* photos in and around a place, filtered (see the picture filter above) */
function photosWith(r, X) {
  var lat = r.lat, lon = r.lon;
  var fails = 0;
  var fname = function (u) { try { return decodeURIComponent(String(u).split('/').pop()); } catch (e) { return String(u); } };
  var lead = placeContext(r).then(function (c) { return c && c.image && !PHOTO_SKIP.test(fname(c.image)) && !X.PHOTO_PEOPLE.test(fname(c.image)) ? [{ src: c.image, full: c.image, page: c.url || '', author: '', licence: '', title: r.name, lead: true, stem: X.photoStem(fname(c.image)) }] : []; }).catch(function () { fails++; return []; });
  var keep = function (p) { var ii = p.imageinfo && p.imageinfo[0]; if (!ii) return null; if (!/^image\/(jpeg|webp|png)/.test(ii.mime || '') || ii.width < 700 || ii.height < 420) return null; if (!X.photoMetaOk(p.title, ii.extmetadata)) return null; return X.photoFromInfo(p, ii); };
  var geoq = !fin(lat) ? Promise.resolve([]) : jget('https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=' + lat + '%7C' + lon + '&ggsradius=' + (r.area_km2 > 60 ? 10000 : 6000) + '&ggslimit=80&ggsnamespace=6&prop=imageinfo&iiprop=url%7Cmime%7Csize%7Cextmetadata&iiurlwidth=960&format=json&origin=*').then(function (j) {
    return Object.values((j.query || {}).pages || {}).map(keep).filter(Boolean).sort(function (a, b) { return (b.landscape - a.landscape) || (a.idx - b.idx); });
  }).catch(function () { fails += 2; return []; });
  var q = stripParen(r.name) + ' ' + localAreaOf(r) + ' ' + countryName(r.country);
  var srch = jget('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=' + encodeURIComponent(q) + '&gsrlimit=20&prop=imageinfo&iiprop=url%7Cmime%7Csize%7Cextmetadata&iiurlwidth=960&format=json&origin=*').then(function (j) {
    return Object.values((j.query || {}).pages || {}).map(keep).filter(Boolean).sort(function (a, b) { return a.idx - b.idx; });
  }).catch(function () { fails++; return []; });
  return Promise.all([lead, geoq, srch]).then(function (a) {
    var seen = {}, stems = {}, buckets = {}, out = [];
    a[0].concat(a[1], a[2]).forEach(function (p) {
      var k = String(p.full || p.src).split('/').pop().split('?')[0].replace(/^\d+px-/, '');
      if (seen[k] || (p.stem && stems[p.stem]) || (p.bucket && buckets[p.bucket])) return;
      seen[k] = 1; if (p.stem) stems[p.stem] = 1; if (p.bucket) buckets[p.bucket] = 1; out.push(p);
    });
    out = out.slice(0, 30);
    if (!out.length) { if (fails >= 2) { out.failed = true; delete PHOTOS[r.id]; } return out; }
    return X.photoPixelFilter(out, 18);
  });
}
