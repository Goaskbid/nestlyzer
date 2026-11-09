/* Nestlyzer app — core: helpers, state, data loading, routing */
'use strict';
var VERSION = '__VERSION__';
var $ = function (s, el) { return (el || document).querySelector(s); };
var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
var fin = Number.isFinite;
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function fmt(v, d) { if (!fin(v)) return '–'; return Number(v).toLocaleString('en-GB', { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d && d > 0 ? Math.min(d, 1) : 0 }); }
function fmtInt(v) { return fin(v) ? Math.round(v).toLocaleString('en-GB') : '–'; }
function signed(v, d) { return fin(v) ? (v > 0 ? '+' : '') + fmt(v, d == null ? 1 : d) : '–'; }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function tone(v) { return !fin(v) ? '' : v >= 70 ? 'tone-good' : v >= 50 ? 'tone-mid' : 'tone-bad'; }
function slug(s) { return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'place'; }
function fold(s) { return NestData.translit(String(s || '')).replace(/[\u00f8\u00d8]/g, 'o').replace(/[\u00e6\u00c6]/g, 'ae').replace(/[\u0142\u0141]/g, 'l').replace(/[\u0111\u0110\u00f0]/g, 'd').replace(/\u00fe/g, 'th').replace(/\u0153/g, 'oe').replace(/\u0131/g, 'i').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\u00df/g, 'ss'); }
function stripParen(s) { return String(s || '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/,\s*(Stadt|Markt|Gemeinde|Landeshauptstadt|Hansestadt|Stadt der.*)$/i, '').trim(); }
function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }
function km(a, b) { var R = 6371, la1 = a[1] * Math.PI / 180, la2 = b[1] * Math.PI / 180, dl = la2 - la1, dn = (b[0] - a[0]) * Math.PI / 180; var h = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(la1) * Math.cos(la2) * Math.sin(dn / 2) * Math.sin(dn / 2); return 2 * R * Math.asin(Math.sqrt(h)); }
/* Evidence behind a fit score (NZ-GLOBAL-049): weighted = share of the profile's weight whose category has a value,
   measured = the part backed by measured data, the rest is estimated from stand-ins. Readiness follows from both. */
function assessKind(x) {
  var w = x && fin(x.weighted) ? x.weighted : null, m = x && fin(x.measured) ? x.measured : null;
  if (w == null) return ['unknown', 'Not scored', 'This place has no score for the profile.'];
  if (x.thin) return ['screening', 'Thin evidence', 'Less than half of what this profile weighs is measured for this place; the rest is estimated from population and location. The same rule applies in every country: such places are ranked after those with stronger evidence.'];
  if (m >= 60 && w >= 80) return ['assessed', 'Detailed local data', 'Most of what this profile weighs comes from official figures for this place or its region.'];
  if (m >= 30) return ['partial', 'Local and modelled data', 'Part of what this profile weighs comes from official figures for this place or its region; the rest is modelled from population and location.'];
  return ['screening', 'Regional overview', 'This score combines official regional figures with indicators modelled from population and location: a good first comparison.'];
}
function evidenceLine(x) {
  if (!x || !fin(x.weighted)) return '';
  var est = Math.max(0, x.weighted - (x.measured || 0));
  return 'Scored on ' + x.weighted + '% of your weights: ' + (x.measured || 0) + '% official statistics' + (est ? ', ' + est + '% modelled (estimated from population and location)' : '');
}
function store(k, v) {
  var memory = store.memory || (store.memory = Object.create(null));
  if (v === undefined) {
    if (Object.prototype.hasOwnProperty.call(memory, k)) return memory[k];
    try { var value = JSON.parse(localStorage.getItem('nz:' + k)); store.lastError = null; return value; } catch (e) { store.lastError = e; return null; }
  }
  memory[k] = v;
  try { localStorage.setItem('nz:' + k, JSON.stringify(v)); store.lastError = null; return true; }
  catch (e) { store.lastError = e; return false; }
}
var FLAG_CODE = { EL: 'GR', UK: 'GB' };
function scoreColor(v) {
  var cs = getComputedStyle(document.documentElement);
  var stops = ['--r0', '--r1', '--r2', '--r3', '--r4', '--r5'].map(function (k) { return cs.getPropertyValue(k).trim(); });
  if (!fin(v)) return cs.getPropertyValue('--novalue').trim();
  return v >= 85 ? stops[5] : v >= 72 ? stops[4] : v >= 60 ? stops[3] : v >= 48 ? stops[2] : v >= 34 ? stops[1] : stops[0];
}
function scoreBadge(v) { var c = scoreColor(v); return '<span class="score" style="background:' + c + ';color:' + inkOn(c) + '" title="Score ' + (fin(v) ? Math.round(v) : '–') + ' of 100">' + (fin(v) ? Math.round(v) : '–') + '</span>'; }
var ICON = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5C19 15.6 12 20 12 20Z"/></svg>',
  heartFill: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5C19 15.6 12 20 12 20Z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
  compare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 4v16M17 4v16M3 8h8M13 16h8"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 3H6v18h12V7l-4-4Z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18 9 12l6-6"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  fit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.2 5.6L20 11l-5.8 2.4L12 19l-2.2-5.6L4 11l5.8-2.4L12 3Z"/></svg>'
};

/* 2.13.3 legal notice (owner rule: visible where results are shown, not only in the footer; never dismissed for good) */
var NZ_NOTE = '<p class="nz-note" role="note"><b>General location information, no individual advice.</b> Nestlyzer compares places on fixed standard profiles from public data. It is not tax, legal, financial, investment, immigration or real-estate advice and does not consider your situation. Scores are model results, not recommendations or guarantees. <a href="/legal/#disclaimer">Limits and liability</a></p>';
var NZ_NOTE_S = '<p class="nz-note" role="note"><b>General information, no individual advice.</b> Standard profiles, public data; not tax, legal, financial, investment or immigration advice. <a href="/legal/#disclaimer">Limits</a></p>';
var NZ_NOTE_TAX = '<p class="nz-note" role="note"><b>Tax figures are standard cases for comparison, not your tax bill.</b> They are not tax advice and do not confirm any entitlement. Check your own case with the tax authority or a qualified adviser.</p>';
/* 2.14: country notices next to results (sanctions are not a ranking factor and are not assessed here) */
var NZ_CNOTE = { RU: '<p class="nz-note" role="note"><b>Sanctions apply.</b> Switzerland, the EU, the UK, the US and others restrict many business activities, payments, investments and exports involving Russia. These statistics describe places only; they say nothing about whether any activity there is permitted. Check the current sanctions rules (for example SECO in Switzerland) before acting.</p>' };
/* ---------------- state ---------------- */
var S = {
  view: 'landing', cc: 'CH', profile: 'young_family', region: 'ALL', area: 'ALL', q: '', minConf: 0, layer: 'score', sort: 'score',
  f: { popMin: 0, popMax: 0, cityKm: 0, airportKm: 0, coastKm: 0, railKm: 0, mwayKm: 0, lakeKm: 0, borderKm: 0, pop10Min: 0, daywMin: 0 }, terrain: '', climate: '', showAll: false, home: store('home') || null, selected: null, tab: 'map', listTab: 'ranking', shown: 100,
  compare: [], method: 'v2', custom: null, builder: null
};
var META = null, ENGINE = null, RECORDS = [], BYID = {}, SHARDS = {}, RES = null, SCOPE = [], NUTS = {}, SHARD = null;
var saved = store('saved') || [];
S.compare = (store('cmp') || []).filter(function (id) { return saved.some(function (s) { return s.id === id; }); }).slice(0, 3);

function profileDef(k) { return k === 'self_fit' ? (S.custom || ENGINE.profiles.self_fit) : ENGINE.profiles[k]; }
function profileName(k) { var p = profileDef(k); return p ? p.name : ''; }
function countryMeta(cc) { return (META.countries || []).find(function (c) { return c.cc === cc; }) || { cc: cc, name: cc }; }
function countryName(cc) { return countryMeta(cc).name || cc; }

/* ---------------- data loading ---------------- */
/* live content from Wikimedia, Wikidata, NASA, OpenStreetMap and Eurostat can be switched off (privacy setting) */
var TAP = (window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches) ? 'Tap' : 'Click';
// every request to an outside service goes through here, so switching live content off also stops lookups already queued
function liveFetch(url, opt) { if (!extOn()) return Promise.reject(new Error('Live content is switched off')); return fetch(url, opt); }
function extOn() { var value = store('ext'); return value !== false && !store.lastError; }
var EXT_OFF_HTML = '<p class="small muted">Live content is switched off in your privacy settings. <button class="linkbtn" type="button" data-extoggle>Turn it on</button></p>';
function assetURL(p) { return window.NZ_ASSET_URL ? window.NZ_ASSET_URL(p) : location.origin + p; }
function getJSON(url) { return fetch(url, { cache: 'force-cache' }).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }); }
function loadMeta() { return getJSON('/data/meta.json?v=' + VERSION).then(function (m) { META = m; ENGINE = new NestEngine(m, { method: S.method }); return m; }); }
/* extra open-data parameters (data/x): terrain, climate zone, lakes, rivers, rail, motorways, ports, capital, border, neighbours, lookalikes */
/* the Coastal living profile counts the sea and large lakes (25 km2+) as a shore */
var LAKE_WORD = /\b(lake|lac|lago|lagoa|see|sjön|sjø|sjo|vatn|vatnet|järvi|jarvi|meer|jezioro|jezero|ezero|tó|ozero|loch|lough|reservoir)\b|see$|sjön$|järvi$|vatnet$/i;
function lakeLabel(n) { return !n ? 'a large lake' : LAKE_WORD.test(n) ? n : 'Lake ' + n; }
function shoreKm(r) { var fr = r.factorRaw || {}; return fin(fr.geo_shore_km) ? fr.geo_shore_km : fr.geo_coast_km; }
function shoreName(r) { var x = r.x || {}, fr = r.factorRaw || {}; return x.shore && !(fr.geo_coast_km <= fr.geo_shore_km) ? lakeLabel(x.shore) : (x.sea ? x.sea.replace(/^The /, 'the ') : 'the sea'); }
function attachExtra(all, xs) {
  if (!xs || !xs.cols || !Array.isArray(xs.strs)) throw new Error('Invalid supplemental data schema');
  Object.keys(xs.cols).forEach(function (key) {
    if (!Array.isArray(xs.cols[key]) || xs.cols[key].length !== all.length) throw new Error('Supplemental data length mismatch: ' + key);
  });
  var C = xs.cols, T = xs.strs, names = { kg: 1, lake: 1, river: 1, port: 1, iport: 1, mport: 1, chem: 1, fin: 1, econ: 1, border: 1, metro: 1, land: 1, sea: 1, tz: 1, shore: 1 };
  for (var i = 0; i < all.length; i++) {
    var o = {};
    for (var k in C) { var v = C[k][i]; if (v == null) continue; o[k] = names[k] ? T[v] : v; }
    all[i].x = o;
  }
}
function loadCountry(cc) {
  if (SHARDS[cc]) return Promise.resolve(SHARDS[cc]);
  return Promise.all([getJSON('/data/c/' + cc + '.json?v=' + VERSION), getJSON('/data/x/' + cc + '.json?v=' + VERSION)]).then(function (a) {
    var sh = a[0], xs = a[1];
    var all = NestData.hydrate(sh);
    if (xs) attachExtra(all, xs);
    if (sh.world && sh.world.whole) { var wh = {}; sh.world.whole.forEach(function (o) { wh[o] = 1; }); all.forEach(function (r) { if (wh[r.oid]) r.whole = true; }); }
    var recs = all.filter(function (r) { return !r.superseded; });
    SHARDS[cc] = { shard: sh, records: recs, byId: {}, extra: xs };
    all.forEach(function (r) { SHARDS[cc].byId[r.id] = r; BYID[r.id] = r; });
    return SHARDS[cc];
  });
}

/* ---------------- scope structure ---------------- */
function regionLevel(cc) {
  var sh = SHARDS[cc]; if (!sh) return null;
  if (cc === 'CH') return 'CH';
  if (sh.level) return sh.level;
  sh.level = (META.config.regionLevel || {})[cc] || regionLevelCompute(sh);
  return sh.level;
}
function regionLevelCompute(sh) {
  var n1 = {}, n2 = {}, n3 = {};
  sh.records.forEach(function (r) { if (r.n3) { n1[r.n1] = 1; n2[r.n2] = 1; n3[r.n3] = 1; } });
  var c2 = Object.keys(n2).length, c1 = Object.keys(n1).length;
  if (c2 > 1 && c2 <= 30) return 'n2';
  if (c1 > 1) return 'n1';
  if (c2 > 1) return 'n2';
  return 'none';
}
function nutsName(code) { var sh = SHARD && SHARD.shard; return plainNuts((sh && sh.nuts && sh.nuts[code]) || code); }
/* German district names read like admin jargon; say what they are */
function plainNuts(n) { return String(n).replace(/, Kreisfreie Stadt$/, ' (city)').replace(/, Stadtkreis$/, ' (city)').replace(/, Landkreis$/, ' (district)').replace(/, Statutarstadt$/, ' (city)'); }
/* special scopes: 'M:<city>' is a greater area, 'N:<place id>:<km>' is a radius around a place */
function scopeSpecial(v) {
  v = v || S.region; var m;
  if ((m = /^M:(.+)$/.exec(v))) return { kind: 'metro', name: m[1] };
  if ((m = /^G:(.+)$/.exec(v))) return { kind: 'group', name: m[1], g: cityGroup(S.cc, m[1]) };
  if ((m = /^N:(.+):(\d+)$/.exec(v))) return { kind: 'near', id: m[1], km: +m[2] };
  return null;
}
/* cities that official statistics split into parishes or districts: one scope for the whole city */
var DUBLIN = ['Ballymun-Finglas', 'Cabra-Glasnevin', 'Ballyfermot-Drimnagh', 'Kimmage-Rathmines', 'Pembroke', 'South East Inner City', 'North Inner City', 'Clontarf', 'Donaghmede', 'Artane-Whitehall', 'South West Inner City'];
var CITY_GROUPS = [
  { cc: 'PT', name: 'Lisbon', alias: ['lisboa', 'lisbonne', 'lissabon'], test: function (o) { return /^1106\d\d$/.test(String(o.oid)); } },
  { cc: 'PT', name: 'Porto', alias: ['oporto'], test: function (o) { return /^1312\d\d$/.test(String(o.oid)); } },
  { cc: 'SK', name: 'Bratislava', alias: ['pressburg', 'pozsony'], test: function (o) { return /^Bratislava - /.test(o.name); } },
  { cc: 'SK', name: 'Košice', alias: ['kosice', 'kaschau'], test: function (o) { return /^Košice - /.test(o.name); } },
  { cc: 'RS', name: 'Belgrade', alias: ['beograd', 'belgrad'], test: function (o) { return /^Belgrade - /.test(o.name); } },
  { cc: 'IE', name: 'Dublin', alias: ['baile atha cliath'], test: function (o) { return DUBLIN.indexOf(o.name) >= 0; } },
  { cc: 'IE', name: 'Cork', alias: [], test: function (o) { return /^Cork City/.test(o.name); } },
  { cc: 'IE', name: 'Galway', alias: [], test: function (o) { return /^Galway City/.test(o.name); } },
  { cc: 'IE', name: 'Limerick', alias: [], test: function (o) { return /^Limerick City/.test(o.name); } }
];
function cityGroup(cc, name) { return CITY_GROUPS.filter(function (g) { return g.cc === cc && g.name === name; })[0] || null; }
function metroLabel(name) { var m = metroList().filter(function (x) { return x[0] === name; })[0]; return 'Greater ' + name + (m && m[3] === false ? ' (part in ' + countryName(S.cc) + ')' : ''); }
function metroList() { var x = SHARD && SHARD.extra; return x && x.metros ? x.metros.filter(function (m) { return m[2] >= 3; }) : []; }
/* 2.13: the true share of a country's places this place beats on one factor (ties count half). A factor score is a
   0-100 model scale, not a percentile, so "better than X% of places" is computed from the loaded places themselves. */
var PCTC = {};
function truePct(r, fid, get) {
  var sh = SHARDS[r.country]; if (!sh || !sh.records) return null;
  get = get || function (x) { return (x.factorScores || {})[fid]; };
  var k = r.country + '|' + fid + '|' + sh.records.length, a = PCTC[k];
  if (!a) { a = []; sh.records.forEach(function (x) { var v = get(x); if (fin(v)) a.push(v); }); a.sort(function (p, q) { return p - q; }); PCTC[k] = a; }
  var v = get(r); if (!fin(v) || a.length < 20) return null;
  var lo = 0, hi = a.length, m; while (lo < hi) { m = (lo + hi) >> 1; if (a[m] < v) lo = m + 1; else hi = m; } var below = lo;
  hi = a.length; while (lo < hi) { m = (lo + hi) >> 1; if (a[m] <= v) lo = m + 1; else hi = m; }
  return Math.round((below + (lo - below - 1) / 2) / Math.max(1, a.length - 1) * 100);
}
function nearCenter(sp) { var c = BYID[sp.id]; return c && fin(c.lat) ? c : null; }
function regionOptions() {
  var cc = S.cc, out = [];
  if (cc === 'CH') {
    var R = META.config.swissRegions;
    Object.keys(R).forEach(function (k) {
      var n = SHARD.records.filter(function (r) { return R[k].cantons.indexOf(r.canton) >= 0; }).length;
      out.push([k, R[k].name, n, k === 'ALL' ? null : 'Large regions']);
    });
    return withSpecial(out);
  }
  var lvl = regionLevel(cc), counts = {};
  out.push(['ALL', 'All regions', SHARD.records.length]);
  if (lvl !== 'none') {
    SHARD.records.forEach(function (r) { var k = lvl === 'n1' ? r.n1 : r.n2; if (k) counts[k] = (counts[k] || 0) + 1; });
    Object.keys(counts).sort(function (a, b) { return nutsName(a).localeCompare(nutsName(b)); }).forEach(function (k) { out.push([k, nutsName(k), counts[k], 'Regions']); });
  }
  return withSpecial(out);
}
function withSpecial(out) {
  CITY_GROUPS.filter(function (g) { return g.cc === S.cc; }).forEach(function (g) { var n = SHARD.records.filter(function (r) { return g.test(r); }).length; if (n) out.push(['G:' + g.name, g.name + ', the whole city', n, 'Cities split into districts']); });
  metroList().forEach(function (m) { out.push(['M:' + m[0], metroLabel(m[0]), m[2], 'Greater areas (around a big city)']); });
  var sp = scopeSpecial();
  if (sp && sp.kind === 'near') { var c = BYID[sp.id]; out.push([S.region, 'Within ' + sp.km + ' km of ' + (c ? c.name : sp.id), null, 'Around a place']); }
  return out;
}
function areaOptions() {
  var cc = S.cc, out = [], counts = {};
  if (cc === 'CH' && scopeSpecial()) return [];
  if (cc === 'CH') {
    var cant = META.config.swissRegions[S.region] ? META.config.swissRegions[S.region].cantons : Object.keys(META.config.cantons);
    out.push(['ALL', 'All cantons', null]);
    cant.slice().sort(function (a, b) { return META.config.cantons[a].localeCompare(META.config.cantons[b]); }).forEach(function (k) {
      out.push([k, META.config.cantons[k], SHARD.records.filter(function (r) { return r.canton === k; }).length]);
    });
    return out;
  }
  if (scopeSpecial()) return [];
  var lvl = regionLevel(cc);
  SHARD.records.forEach(function (r) {
    if (!r.n3) return;
    if (S.region !== 'ALL' && (lvl === 'n1' ? r.n1 : r.n2) !== S.region) return;
    counts[r.n3] = (counts[r.n3] || 0) + 1;
  });
  var keys = Object.keys(counts);
  if (keys.length < 2) return [];
  out.push(['ALL', S.region === 'ALL' ? 'All areas' : 'All of ' + nutsName(S.region), null]);
  keys.sort(function (a, b) { return nutsName(a).localeCompare(nutsName(b)); }).forEach(function (k) { out.push([k, nutsName(k), counts[k]]); });
  return out;
}
var LOCAL_KIND = { CH: 'Canton', DE: 'District', FR: 'Département', IT: 'Province', ES: 'Province', BE: 'Arrondissement', SE: 'County', NO: 'County', HR: 'County', HU: 'County', RO: 'County', LT: 'County', IE: 'Region', PL: 'Subregion', PT: 'Subregion', AT: 'Region', FI: 'Region', CZ: 'Region', SK: 'Region', BG: 'Province', EL: 'Regional unit', US: 'State', CA: 'Province', JP: 'Prefecture', KR: 'Province', TW: 'County', HK: 'District', SG: 'District', AU: 'State', NZ: 'Region', IL: 'District', BR: 'State', MX: 'State', MY: 'State', ID: 'Province', MA: 'Region', ZA: 'Province', IN: 'State', CN: 'Province', AE: 'Emirate', RU: 'Region', TR: 'Province', VN: 'Province', TH: 'Province', CL: 'Region', SA: 'Province', QA: 'Municipality', KZ: 'Region', PH: 'Province', AR: 'Province', CO: 'Department', UY: 'Department', CR: 'Province', PA: 'Province', GE: 'Region', EG: 'Governorate' };
/* countries outside Europe (GeoNames places, Natural Earth regions) */
function isWorld(cc) { return !!(META && (META.config.worldCountries || []).indexOf(cc) >= 0); }
function localKind(cc) { return LOCAL_KIND[cc || S.cc] || 'Area'; }
/* what the official statistics call one unit: most countries publish municipalities, some publish parishes or districts */
var UNIT = { PT: ['parish', 'parishes'], IE: ['local electoral area', 'local electoral areas'], EL: ['community', 'communities'], CY: ['community', 'communities'], MT: ['locality', 'localities'] };
function unitWord(cc, n) { var u = UNIT[cc] || (isWorld(cc) ? ['place', 'places'] : ['municipality', 'municipalities']); return n === 1 ? u[0] : u[1]; }
function areaKind(cc) { cc = cc || S.cc; return cc === 'CH' ? 'Canton' : (cc === 'DE' || cc === 'AT') ? 'Bundesland' : cc === 'NL' ? 'Province' : isWorld(cc) ? LOCAL_KIND[cc] || 'State' : 'Region'; }
function areaOf(r) {
  if (r.country === 'CH') return r.cantonName || r.canton;
  var sh = SHARDS[r.country] && SHARDS[r.country].shard;
  var lvl = regionLevel(r.country);
  var code = lvl === 'n1' ? r.n1 : r.n2;
  return (sh && sh.nuts && (sh.nuts[code] || sh.nuts[r.n3])) || r.region || countryName(r.country);
}
function localAreaOf(r) { if (r.country === 'CH') return r.cantonName; var sh = SHARDS[r.country] && SHARDS[r.country].shard; return (sh && sh.nuts && sh.nuts[r.n3]) || areaOf(r); }
function inScope(r) {
  var sp = scopeSpecial();
  if (sp) {
    if (sp.kind === 'metro') return !!(r.x && r.x.metro === sp.name);
    if (sp.kind === 'group') return !!(sp.g && sp.g.test(r));
    var c = nearCenter(sp); if (!c || !fin(r.lat)) return false;
    return km([c.lon, c.lat], [r.lon, r.lat]) <= sp.km;
  }
  if (S.cc === 'CH') {
    var R = META.config.swissRegions[S.region] || META.config.swissRegions.ALL;
    if (S.area !== 'ALL' && r.canton !== S.area) return false;
    return R.cantons.indexOf(r.canton) >= 0;
  }
  var lvl = regionLevel(S.cc);
  if (S.region !== 'ALL' && (lvl === 'n1' ? r.n1 : r.n2) !== S.region) return false;
  if (S.area !== 'ALL' && r.n3 !== S.area) return false;
  return true;
}
function passFilters(r) {
  var f = S.f, fr = r.factorRaw || {};
  if (r.sourceConfidence < S.minConf) return false;
  if (f.popMin && r.population < f.popMin) return false;
  if (f.popMax && r.population > f.popMax) return false;
  if (f.cityKm && !(fr.geo_major_city_km <= f.cityKm)) return false;
  if (f.airportKm && !(fr.geo_hub_airport_km <= f.airportKm)) return false;
  if (f.coastKm && !(fr.geo_coast_km <= f.coastKm)) return false;
  if (!xfiltersPass(r)) return false;
  if (S.lang && !langPass(r)) return false;
  var q = S.q.trim().toLowerCase();
  if (q && !(r.name.toLowerCase().indexOf(q) >= 0 || String(r.cantonName || '').toLowerCase().indexOf(q) >= 0 || String(areaOf(r)).toLowerCase().indexOf(q) >= 0 || String(r.oid).indexOf(q) >= 0)) return false;
  return true;
}
var LANG_AREAS = { de: ['german', 'bilingual', 'belgian_german', 'luxembourgish'], fr: ['french', 'bilingual', 'luxembourgish'], it: ['italian'], en: ['english'], nl: ['dutch'], es: ['spanish'], pt: ['portuguese'], nordic: ['nordic'] };
function langPass(r) { var a = LANG_AREAS[S.lang]; if (!a) return true; var k = languageArea(r); if (r.country === 'CH' && k === 'bilingual') return true; return a.indexOf(k) >= 0; }
var LANG_NAMES = { de: 'German', fr: 'French', it: 'Italian', en: 'English', nl: 'Dutch', es: 'Spanish', pt: 'Portuguese', nordic: 'Nordic-language' };
function scopeName() {
  var sp = scopeSpecial();
  if (sp) { if (sp.kind === 'metro') return metroLabel(sp.name); if (sp.kind === 'group') return sp.name + ', the whole city'; var c = BYID[sp.id]; return 'Within ' + sp.km + ' km of ' + (c ? c.name : 'a place'); }
  if (S.cc === 'CH') { if (S.area !== 'ALL') return 'Canton ' + META.config.cantons[S.area]; return (META.config.swissRegions[S.region] || {}).name || 'All Switzerland'; }
  if (S.area !== 'ALL') return nutsName(S.area);
  if (S.region !== 'ALL') return nutsName(S.region);
  return 'All ' + countryName(S.cc);
}

/* ---------------- ranking ---------------- */
/* two modes, one engine: places to live (household profiles) and business locations (biz_ profiles).
   Each mode keeps its own shortlist and compare list in this browser. */
var CURMODE = 'home';
function isBizKey(k) { return String(k || '').indexOf('biz_') === 0; }
function syncMode() {
  var m = isBizKey(S.profile) ? 'biz' : 'home'; if (m === CURMODE) return false;
  persistShortlist(); CURMODE = m;
  saved = store(m === 'biz' ? 'bizsaved' : 'saved') || [];
  S.compare = (store(m === 'biz' ? 'bizcmp' : 'cmp') || []).filter(function (id) { return saved.some(function (s) { return s.id === id; }); }).slice(0, 3);
  document.body.classList.toggle('bizmode', m === 'biz'); document.documentElement.classList.toggle('bizmode', m === 'biz'); if (typeof recolorTheme === 'function') recolorTheme(); store(m === 'biz' ? 'lastbiz' : 'lasthome', S.profile);
  return true;
}
function runRanking() {
  if (!SHARD) return;
  if (syncMode()) refreshShortlistUI();
  if (isBizKey(S.profile)) { store('lastbiz', S.profile); if (ENGINE.profiles[S.profile]) ENGINE.profiles[S.profile].unknownMust = S.unknownExclude ? 'exclude' : 'flag'; } else if (S.profile !== 'self_fit') store('lasthome', S.profile);
  SCOPE = SHARD.records.filter(function (r) { return inScope(r) && passFilters(r); });
  if (S.profile === 'self_fit' && S.custom) ENGINE.profiles.self_fit = S.custom;
  var t0 = performance.now();
  RES = ENGINE.rank(SCOPE, S.profile, { country: S.cc });
  RES.ms = performance.now() - t0;
  RES.byId = {};
  RES.scored.forEach(function (x) { RES.byId[x.id] = x; });
  sortResults();
}
function sortResults() {
  var arr = RES.scored.slice();
  var f = { score: null, pop: function (a, b) { return b.r.population - a.r.population; }, growth: function (a, b) { return (g(b) - g(a)); }, name: function (a, b) { return a.r.name.localeCompare(b.r.name); },
    city: function (a, b) { return d(a, 'geo_major_city_km') - d(b, 'geo_major_city_km'); }, airport: function (a, b) { return d(a, 'geo_hub_airport_km') - d(b, 'geo_hub_airport_km'); },
    rail: function (a, b) { return pv(a, 'rail', 1e9) - pv(b, 'rail', 1e9); }, lake: function (a, b) { return pv(a, 'lake', 1e9) - pv(b, 'lake', 1e9); }, coast: function (a, b) { return pv(a, 'coast', 1e9) - pv(b, 'coast', 1e9); }, alt: function (a, b) { return pv(b, 'alt', -1e9) - pv(a, 'alt', -1e9); }, daylight: function (a, b) { return pv(b, 'dayw', -1e9) - pv(a, 'dayw', -1e9); } }[S.sort];
  function pv(x, k, dflt) { var v = pval(x.r, k); return v == null ? dflt : v; }
  function g(x) { var t = x.r.trend, fr = x.r.factorRaw || {}; var v = t && fin(t.population_5y_pct) ? t.population_5y_pct : fr.common_population_growth_5y; return fin(v) ? v : -1e9; }
  function d(x, k) { var v = (x.r.factorRaw || {})[k]; return fin(v) ? v : 1e9; }
  if (f) arr.sort(f);
  RES.view = arr;
}
function multiAnswer() {
  if (S.profile === 'student' || S.profile === 'expat_professional') return true;
  var ml = META.config.multilingual[S.cc];
  return !!(ml && languageSensitive() && activeLanguageKeys().length > 1);
}
function languageSensitive() {
  if (S.profile === 'self_fit') return !!(S.builder && S.builder.language && S.builder.language !== 'flexible');
  return META.config.languageSensitive.indexOf(S.profile) >= 0;
}

/* ---------------- routing (shareable URLs) ---------------- */
function toHash() {
  var p = new URLSearchParams();
  p.set('cc', S.cc); p.set('p', S.profile);
  if (S.region !== 'ALL') p.set('r', S.region);
  if (S.area !== 'ALL') p.set('a', S.area);
  if (S.layer !== 'score') p.set('l', S.layer);
  if (S.minConf) p.set('conf', S.minConf);
  if (S.sort !== 'score') p.set('sort', S.sort);
  FKEYS.forEach(function (k) { if (S.f[k]) p.set(k, S.f[k]); });
  if (S.terrain) p.set('terrain', S.terrain);
  if (S.lang) p.set('lang', S.lang);
  if (S.climate) p.set('climate', S.climate);
  if (S.q && S.q.trim()) p.set('q', S.q.trim());
  if (S.gscope) p.set('g', S.gscope);
  if (S.selected && S.selected !== S.autoSel) p.set('sel', S.selected);
  if (S.listTab && S.listTab !== 'ranking' && S.listTab !== 'saved') p.set('lt', S.listTab);
  if (S.selected && S.ptab && S.ptab !== 'overview') p.set('pt', S.ptab);
  if (S.profile === 'self_fit' && S.custom) { p.set('w', Object.keys(S.custom.weights).map(function (k) { return k + ':' + S.custom.weights[k]; }).join(',')); if (fin(S.custom.minPop)) p.set('mp', S.custom.minPop); }
  if (S.method !== 'v2') p.set('method', S.method);
  return '#/explore?' + p.toString();
}
function fromHash() {
  var h = location.hash || '';
  if (h.indexOf('#/explore') !== 0) return false;
  var p = new URLSearchParams(h.split('?')[1] || '');
  var sc0 = document.getElementById('start-country'); S.cc = (p.get('cc') || store('homecc') || (sc0 && sc0.value) || 'CH').toUpperCase();   // 2.15.6: no cc in the link means the visitor's country
  S.profile = p.get('p') || 'young_family';
  S.region = p.get('r') || 'ALL'; S.area = p.get('a') || 'ALL';
  S.layer = p.get('l') || 'score'; S.minConf = +p.get('conf') || 0; S.sort = p.get('sort') || 'score';
  FKEYS.forEach(function (k) { S.f[k] = +p.get(k) || 0; });
  S.terrain = p.get('terrain') || ''; S.climate = p.get('climate') || ''; S.lang = LANG_NAMES[p.get('lang')] ? p.get('lang') : '';
  S.q = (p.get('q') || '').slice(0, 80);
  S.gscope = ['europe', 'americas', 'asia_pacific', 'mideast_africa', 'world'].indexOf(p.get('g')) >= 0 ? p.get('g') : '';   // the name filter travels with the link; a link without one clears it (NZ-GLOBAL-045)
  S.selected = p.get('sel') || null;
  if (['saved', 'records', 'board'].indexOf(p.get('lt')) >= 0) S.pendingTab = p.get('lt');
  // every link decodes to a complete panel state: no tab or an unknown one means Overview (NZ-GLOBAL-046)
  S.ptab = ['overview', 'score', 'photos', 'facts', 'around', 'similar', 'data'].indexOf(p.get('pt')) >= 0 ? p.get('pt') : 'overview';
  if (p.get('list')) S.pendingList = p.get('list').split(',').filter(function (x) { return /^[A-Z]{2}:/.test(x); }).slice(0, 30);
  if (p.get('cmp')) S.pendingCmp = p.get('cmp').split(',').filter(function (x) { return /^[A-Z]{2}:/.test(x); }).slice(0, 3);
  S.method = p.get('method') === 'v1' ? 'v1' : 'v2';
  var w = p.get('w');
  if (S.profile === 'self_fit' && w) {
    var parsed = parseSharedWeights(w), mpRaw = p.get('mp'), mp = mpRaw == null || mpRaw === '' ? 1200 : +mpRaw;
    if (!parsed.ok || !(fin(mp) && mp >= 0 && mp <= 1e7)) {
      // a malformed link never reaches the ranking and never replaces an existing custom profile (NZ-GLOBAL-048)
      S.linkError = parsed.ok ? 'the minimum population is not a valid number' : parsed.why;
      if (!S.custom) S.profile = 'young_family';
    } else {
      S.custom = { name: 'My guided fit', desc: 'Custom profile from a shared link.', intro: 'Custom profile from a shared link.', weights: parsed.weights, strict: {}, minPop: mp };
    }
  }
  return true;
}
/* shared weights: known categories only, each a finite number from 0 to 100, no duplicates, positive total */
function parseSharedWeights(w) {
  var known = (META && META.config && META.config.categoryOrder) || Object.keys((META && META.categoryLabels) || {}), out = {}, tot = 0, bad = '';
  String(w).split(',').forEach(function (kv) {
    if (bad || !kv) return;
    var a = kv.split(':'), k = a[0], v = a.length === 2 && a[1] !== '' ? Number(a[1]) : NaN;
    if (known.length && known.indexOf(k) < 0) bad = 'it names an unknown criterion (' + k + ')';
    else if (out.hasOwnProperty(k)) bad = 'it names ' + k + ' twice';
    else if (!fin(v) || v < 0 || v > 100) bad = 'the weight for ' + k + ' is not a number from 0 to 100';
    else { out[k] = v; tot += v; }
  });
  if (!bad && !(tot > 0)) bad = 'all its weights are zero';
  Object.keys(out).forEach(function (k) { if (!out[k]) delete out[k]; });
  return bad ? { ok: false, why: bad } : { ok: true, weights: out };
}
var FKEYS = ['popMin', 'popMax', 'cityKm', 'airportKm', 'coastKm', 'railKm', 'mwayKm', 'lakeKm', 'borderKm', 'pop10Min', 'daywMin'];
/* every overlay (window, sheet, drawer, search, photo viewer) gets one history entry, so the back button closes it */
function layerPush() { if (!(history.state && history.state.m)) { var st = {}, h0 = history.state || {}; for (var k in h0) st[k] = h0[k]; st.m = 1; history.pushState(st, '', location.href); } }
function layerPop() { if (history.state && history.state.m && !anyLayerOpen()) { var st = {}; for (var k in history.state) if (k !== 'm') st[k] = history.state[k]; history.replaceState(st, '', location.href); } }
function anyLayerOpen() { var m = document.getElementById('modal'), p = document.getElementById('palette'), t = document.getElementById('tools'), f = document.getElementById('filterpanel'), l = document.getElementById('lightbox'); return !!((m && m.classList.contains('open')) || (p && p.classList.contains('open')) || (t && !t.hidden) || (f && !f.hidden) || (l && !l.hidden) || !!document.querySelector('details.menu[open]')); }
function closeTopLayerUI() {
  if (!$('#lightbox').hidden) return closeLightbox();
  if ($('#modal').classList.contains('open')) return closeModalUI();
  if ($('#palette').classList.contains('open')) return closePalette();
  if (!$('#tools').hidden) return closeTools();
  if (!$('#filterpanel').hidden) return toggleFilters(false);
  var mo = document.querySelector('details.menu[open]'); if (mo) mo.open = false;
}
var syncing = false;
function pushHash(replace) {
  var h = toHash();
  if (location.hash === h) return;
  syncing = true;
  var st = history.state || {};
  if (replace === 'place') { if (st.p) history.replaceState({ p: 1 }, '', h); else history.pushState({ p: 1 }, '', h); }
  else if (replace) history.replaceState(st.p && !S.selected ? null : st, '', h); else history.pushState(null, '', h);
  setTimeout(function () { syncing = false; }, 0);
}
