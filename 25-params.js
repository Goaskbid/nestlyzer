/* Parameters beyond the score: one catalogue for facts, filters, map layers, compare rows and the place story.
   Every parameter says where it comes from. None of them changes a standard profile's score. */
var KOPPEN = {
  Csa: ['Mediterranean, hot summer', 'dry, hot summers and mild, wet winters', 'med'],
  Csb: ['Mediterranean, warm summer', 'dry, warm summers and mild, wet winters', 'med'],
  Csc: ['Mediterranean, cool summer', 'dry, cool summers and wet winters', 'med'],
  Cfa: ['Humid subtropical', 'hot, humid summers and mild winters, rain all year', 'mild'],
  Cfb: ['Oceanic', 'mild all year, rain in every season, no real dry spell', 'mild'],
  Cfc: ['Subpolar oceanic', 'cool summers, mild but long winters, frequent rain', 'cool'],
  Cwa: ['Monsoon-influenced subtropical', 'wet summers and dry winters', 'mild'],
  Cwb: ['Subtropical highland', 'mild with dry winters', 'mild'],
  Dfa: ['Continental, hot summer', 'hot summers and cold, snowy winters', 'cont'],
  Dfb: ['Continental, warm summer', 'warm summers and cold winters with snow', 'cont'],
  Dfc: ['Subarctic', 'short, cool summers and long, cold winters', 'cold'],
  Dfd: ['Extreme subarctic', 'very long, very cold winters', 'cold'],
  Dsa: ['Continental Mediterranean', 'dry, hot summers and cold winters', 'cont'],
  Dsb: ['Continental, dry warm summer', 'dry summers and cold winters', 'cont'],
  Dsc: ['Subarctic, dry summer', 'cool dry summers and cold winters', 'cold'],
  Dwb: ['Continental, dry winter', 'warm summers and dry, cold winters', 'cont'],
  BSh: ['Hot semi-arid', 'hot and dry, little rain', 'dry'],
  BSk: ['Cold semi-arid', 'dry, with hot summers and cool winters', 'dry'],
  BWh: ['Hot desert', 'very dry and hot', 'dry'],
  BWk: ['Cold desert', 'very dry, with cold winters', 'dry'],
  ET: ['Alpine tundra', 'cold all year; summers barely above 10 °C', 'cold'],
  EF: ['Ice cap', 'permanently frozen', 'cold']
};
var CLIMATE_GROUPS = [['med', 'Mediterranean'], ['mild', 'Mild and oceanic'], ['cont', 'Continental'], ['cool', 'Cool and damp'], ['cold', 'Cold, subarctic or alpine'], ['dry', 'Dry or semi-arid']];
function climateOf(r) { var k = r.x && r.x.kg; return k && KOPPEN[k] ? { code: k, name: KOPPEN[k][0], text: KOPPEN[k][1], group: KOPPEN[k][2] } : null; }
function terrainOf(r) {
  var x = r.x || {}; if (!fin(x.alt)) return null;
  var a = x.alt, rel = x.relief || 0;
  var cls = a > 1300 || rel > 1500 ? 'alpine' : a > 700 || rel > 800 ? 'mountains' : a > 350 || rel > 300 ? 'hills' : 'flat';
  var name = { alpine: 'High mountains', mountains: 'Mountainous', hills: 'Hilly', flat: 'Flat or gently rolling' }[cls];
  return { cls: cls, name: name, alt: a, relief: rel };
}
/* daylight and sunset, computed from latitude and longitude (NOAA solar formulas, accurate to a few minutes) */
var TZ = { PT: 0, IE: 0, UK: 0, IS: 0, FI: 2, EE: 2, LV: 2, LT: 2, RO: 2, BG: 2, EL: 2, CY: 2 };
function tzOf(r) { if (r.country === 'PT' && r.lon < -20) return -1; if (r.country === 'ES' && r.lon < -13) return 0; return TZ[r.country] != null ? TZ[r.country] : 1; }
function sunDay(r, summer) {
  if (!fin(r.lat)) return null;
  var d = (summer ? 23.44 : -23.44) * Math.PI / 180, f = r.lat * Math.PI / 180, h0 = -0.833 * Math.PI / 180;
  var c = (Math.sin(h0) - Math.sin(f) * Math.sin(d)) / (Math.cos(f) * Math.cos(d));
  var len = c <= -1 ? 24 : c >= 1 ? 0 : 2 * Math.acos(c) * 180 / Math.PI / 15;
  var eot = summer ? -1.8 : 1.6; // minutes, equation of time at the solstices
  var noonUtc = 12 - r.lon / 15 - eot / 60, tz = tzOf(r) + (summer && r.country !== 'IS' ? 1 : 0);
  return { len: len, set: len >= 24 || len <= 0 ? null : noonUtc + len / 2 + tz, rise: len >= 24 || len <= 0 ? null : noonUtc - len / 2 + tz };
}
function clock(h) { if (!fin(h)) return '–'; h = (h + 24) % 24; var m = Math.round(h * 60); return Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2); }
function growth5(r) { var t = r.trend, fr = r.factorRaw || {}; var v = t && fin(t.population_5y_pct) ? t.population_5y_pct : fr.common_population_growth_5y; return fin(v) ? v : null; }

/* the catalogue: k, label, unit, value getter, direction for "near is nice" (-1) or "more is more" (1), source id */
var PARAMS = [
  { k: 'pop', label: 'Residents', unit: '', get: function (r) { return r.popNow; }, dir: 1, src: 'stat', group: 'people' },
  { k: 'dens', label: 'Residents per km²', unit: '', get: function (r) { return r.area_km2 > 0 && r.popNow ? r.popNow / r.area_km2 : r.density; }, dir: 1, src: 'stat', group: 'people' },
  { k: 'area', label: 'Land area', unit: 'km²', get: function (r) { return r.area_km2; }, dir: 1, src: 'stat', group: 'people', d: 1 },
  { k: 'g5', label: 'Population change, 5 years', unit: '%', get: growth5, dir: 1, src: 'stat', group: 'people', d: 1, signed: true },
  { k: 'pop10', label: 'Residents within 10 km', unit: '', get: function (r) { return (r.x || {}).pop10; }, dir: 1, src: 'own', group: 'people' },
  { k: 'nb10', label: 'Neighbouring municipalities within 10 km', unit: '', get: function (r) { return (r.x || {}).nb10; }, dir: 1, src: 'own', group: 'people' },
  { k: 'c30', label: 'Residents within 30 km', unit: '', get: function (r) { return (r.factorRaw || {}).geo_catchment_30km; }, dir: 1, src: 'geo', group: 'people' },
  { k: 'city', label: 'Nearest city of 100,000+', unit: 'km', get: function (r) { return (r.factorRaw || {}).geo_major_city_km; }, dir: -1, src: 'geo', group: 'access', d: 0 },
  { k: 'air', label: 'Nearest hub airport', unit: 'km', get: function (r) { return (r.factorRaw || {}).geo_hub_airport_km; }, dir: -1, src: 'geo', group: 'access', d: 0, name: function (r) { return (r.geo || {}).hubAirport; } },
  { k: 'rail', label: 'Nearest main railway line', unit: 'km', get: function (r) { return (r.x || {}).rail_km; }, dir: -1, src: 'ne', group: 'access', d: 1 },
  { k: 'mway', label: 'Nearest motorway', unit: 'km', get: function (r) { return (r.x || {}).mway_km; }, dir: -1, src: 'ne', group: 'access', d: 1 },
  { k: 'cap', label: 'Distance to the capital', unit: 'km', get: function (r) { return (r.x || {}).cap_km; }, dir: -1, src: 'ne', group: 'access', d: 0, name: function (r) { return capitalOf(r.country); } },
  { k: 'border', label: 'Nearest land border', unit: 'km', get: function (r) { return (r.x || {}).border_km; }, dir: -1, src: 'ne', group: 'access', d: 0, name: function (r) { return (r.x || {}).border; } },
  { k: 'coast', label: 'Distance to the sea', unit: 'km', get: function (r) { return (r.factorRaw || {}).geo_coast_km; }, dir: -1, src: 'geo', group: 'nature', d: 0 },
  { k: 'lake', label: 'Nearest large lake', unit: 'km', get: function (r) { return (r.x || {}).lake_km; }, dir: -1, src: 'ne', group: 'nature', d: 1, name: function (r) { return (r.x || {}).lake; } },
  { k: 'river', label: 'Nearest major river', unit: 'km', get: function (r) { return (r.x || {}).river_km; }, dir: -1, src: 'ne', group: 'nature', d: 1, name: function (r) { return (r.x || {}).river; } },
  { k: 'port', label: 'Nearest seaport', unit: 'km', get: function (r) { return (r.x || {}).port_km; }, dir: -1, src: 'ne', group: 'nature', d: 0, name: function (r) { return (r.x || {}).port; } },
  { k: 'alt', label: 'Surrounding terrain height', unit: 'm', get: function (r) { return (r.x || {}).alt; }, dir: 1, src: 'terrain', group: 'nature', d: 0 },
  { k: 'relief', label: 'Height range within 15 km', unit: 'm', get: function (r) { return (r.x || {}).relief; }, dir: 1, src: 'terrain', group: 'nature', d: 0 },
  { k: 'metro', label: 'Distance to the centre of its greater area', unit: 'km', get: function (r) { return (r.x || {}).metro_km; }, dir: -1, src: 'ne', group: 'access', d: 0, name: function (r) { return (r.x || {}).metro ? 'Greater ' + r.x.metro : null; } },
  { k: 'dayw', label: 'Daylight on the shortest day', unit: 'h', get: function (r) { var s = sunDay(r, false); return s && s.len; }, dir: 1, src: 'sun', group: 'sky' },
  { k: 'days', label: 'Daylight on the longest day', unit: 'h', get: function (r) { var s = sunDay(r, true); return s && s.len; }, dir: 1, src: 'sun', group: 'sky' },
  { k: 'setw', label: 'Sunset in late December', unit: 'clock', get: function (r) { var s = sunDay(r, false); return s && s.set; }, dir: 1, src: 'sun', group: 'sky' },
  { k: 'sets', label: 'Sunset in late June', unit: 'clock', get: function (r) { var s = sunDay(r, true); return s && s.set; }, dir: 1, src: 'sun', group: 'sky' }
];
var PARAM = {}; PARAMS.forEach(function (p) { PARAM[p.k] = p; });
var PARAM_SOURCES = {
  stat: 'Official statistics (Eurostat GISCO LAU, Swiss FSO, Statistics Austria)',
  geo: 'Computed from municipality centres, OurAirports and Natural Earth',
  ne: 'Computed from Natural Earth 1:10m (public domain)',
  own: 'Computed from Nestlyzer\'s municipality centres',
  terrain: 'Mapzen terrain, 5 arc-minute grid (coarse: describes the surroundings, not the village itself)',
  sun: 'Computed from latitude, longitude and the local time zone (NOAA solar formulas)'
};
function capitalOf(cc) { var sh = SHARDS[cc]; return sh && sh.extra && sh.extra.capital; }
function pval(r, k) { var p = PARAM[k]; if (!p) return null; var v = p.get(r); return fin(v) ? v : null; }
function pfmt(k, v) {
  var p = PARAM[k]; if (!fin(v)) return '–';
  if (p.unit === 'km') return v < 1 ? 'under 1 km' : fmt(v, v < 10 ? 1 : 0) + ' km';
  if (p.unit === '%') return signed(v, 1) + '%';
  if (p.unit === 'm') return fmt(Math.round(v / 10) * 10) + ' m';
  if (p.unit === 'km²') return fmt(v, v < 10 ? 1 : 0) + ' km²';
  if (p.unit === 'h') { if (v >= 24) return '24 h (midnight sun)'; if (v <= 0) return 'none (polar night)'; var hm = Math.round(v * 60); return Math.floor(hm / 60) + ' h ' + ('0' + hm % 60).slice(-2) + ' min'; }
  if (p.unit === 'clock') return clock(v);
  return fmtInt(v);
}
/* percentile within the place's own country (0 = lowest value, 100 = highest) */
function pctOf(r, k) {
  var sh = SHARDS[r.country]; if (!sh) return null;
  sh._pct = sh._pct || {};
  var arr = sh._pct[k];
  if (!arr) { arr = []; sh.records.forEach(function (o) { var v = pval(o, k); if (v != null) arr.push(v); }); arr.sort(function (a, b) { return a - b; }); sh._pct[k] = arr; }
  var v = pval(r, k); if (v == null || !arr.length) return null;
  var lo = 0, hi = arr.length; while (lo < hi) { var m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; }
  var lo2 = lo, hi2 = arr.length; while (lo2 < hi2) { var m2 = (lo2 + hi2) >> 1; if (arr[m2] <= v) lo2 = m2 + 1; else hi2 = m2; }
  return Math.round(100 * ((lo + lo2) / 2) / arr.length);
}
function valueAtPct(cc, k, pct) { var sh = SHARDS[cc]; if (!sh) return null; pctOf(sh.records[0] || {}, k); var arr = sh._pct && sh._pct[k]; if (!arr || !arr.length) return null; return arr[Math.min(arr.length - 1, Math.floor(pct / 100 * arr.length))]; }

/* map layers for parameters: colour by position within the country; "near is nice" layers are inverted */
var PLAYERS = [['p:city', 'Close to a big city', 'city'], ['p:rail', 'Close to a railway', 'rail'], ['p:lake', 'Close to a lake', 'lake'], ['p:coast', 'Close to the sea', 'coast'], ['p:alt', 'Terrain height', 'alt'], ['p:relief', 'Mountainous terrain', 'relief'], ['p:pop10', 'Residents within 10 km', 'pop10'], ['p:g5', 'Population growth', 'g5'], ['p:border', 'Close to a border', 'border'], ['p:cap', 'Close to the capital', 'cap'], ['p:dayw', 'Winter daylight', 'dayw'], ['p:setw', 'Late winter sunsets', 'setw']];
function playerKey(layer) { var m = /^p:(.+)$/.exec(layer || ''); return m ? m[1] : null; }
function paramSurface(r, k) { var pc = pctOf(r, k); if (pc == null) return null; return PARAM[k].dir < 0 ? 100 - pc : pc; }

/* filters on parameters (in addition to the original ones) */
var XFILTERS = [
  { k: 'railKm', label: 'Railway line within', max: 30, step: 1, unit: 'km', test: function (r, v) { var x = pval(r, 'rail'); return x != null && x <= v; } },
  { k: 'mwayKm', label: 'Motorway within', max: 40, step: 1, unit: 'km', test: function (r, v) { var x = pval(r, 'mway'); return x != null && x <= v; } },
  { k: 'lakeKm', label: 'Large lake within', max: 60, step: 1, unit: 'km', test: function (r, v) { var x = pval(r, 'lake'); return x != null && x <= v; } },
  { k: 'borderKm', label: 'Land border within', max: 100, step: 5, unit: 'km', test: function (r, v) { var x = pval(r, 'border'); return x != null && x <= v; } },
  { k: 'pop10Min', label: 'Residents within 10 km, at least', max: 500000, step: 10000, unit: '', test: function (r, v) { var x = pval(r, 'pop10'); return x != null && x >= v; } },
  { k: 'daywMin', label: 'Winter daylight, at least', max: 10, step: 0.5, unit: 'h', test: function (r, v) { var x = pval(r, 'dayw'); return x != null && x >= v; } }
];
function terrainPass(r) { if (!S.terrain) return true; var t = terrainOf(r); return !!t && S.terrain.split(',').indexOf(t.cls) >= 0; }
function climatePass(r) { if (!S.climate) return true; var c = climateOf(r); return !!c && S.climate.split(',').indexOf(c.group) >= 0; }
function xfiltersPass(r) {
  for (var i = 0; i < XFILTERS.length; i++) { var f = XFILTERS[i], v = S.f[f.k]; if (v && !f.test(r, v)) return false; }
  return terrainPass(r) && climatePass(r);
}
function xfilterCount() { return XFILTERS.filter(function (f) { return S.f[f.k]; }).length + (S.terrain ? 1 : 0) + (S.climate ? 1 : 0); }
