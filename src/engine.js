/* Nestlyzer scoring engine.
 * Pure functions, no DOM. Runs in the browser and in Node (site build + regression tests).
 * method 'v1' reproduces the legacy v86 ranking exactly (verified against legacy fixtures).
 * method 'v2' (default) is v1 plus the declared corrections listed in METHOD_V2 below.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NestEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var LOTTERY = 'swiss_lottery';
  var fin = Number.isFinite;
  // distance to a real cargo port: the nearer of a major seaport and a key inland port (build_reach.py); the general
  // Natural Earth port layer only where neither list has a value
  /* r8: x.iport_km is now the nearest inland port OR intermodal terminal / dry port worldwide (build/add_intermodal_reach.py), used for
     freight access. Port must-haves (port-based industry) still need a real sea or waterway port: the waterway port distance is
     recomputed here from the same 76 inland ports with the same straight-line rule and rounding as build_reach.py. */
  var WPORTS = [[47.588,7.592],[47.548,7.637],[51.455,6.735],[51.205,6.715],[50.99,6.965],[51.355,6.66],[51.535,7.44],[49.505,8.45],[49.505,8.42],[49.015,8.32],[48.585,7.795],[50.02,8.265],[50.11,8.72],[49.985,9.12],[49.155,9.205],[48.79,9.24],[49.405,11.04],[49.025,12.135],[52.165,11.665],[52.535,13.335],[52.375,9.69],[52.3,8.92],[53.055,8.88],[48.555,7.79],[47.785,7.505],[48.94,2.3],[45.71,4.835],[49.14,6.165],[50.65,5.6],[50.88,4.38],[50.47,4.88],[51.85,5.86],[51.39,6.17],[51.03,5.81],[48.195,16.455],[48.3,14.32],[48.225,14.495],[48.4,15.63],[48.135,17.14],[47.755,18.12],[47.43,19.07],[47.735,17.825],[46.175,18.94],[44.825,20.48],[45.255,19.87],[45.345,19.005],[45.555,18.715],[43.845,25.96],[43.995,22.88],[43.89,25.965],[45.43,28.065],[45.27,27.975],[44.625,22.66],[50.335,18.155],[51.125,17.01],[50.77,14.205],[50.355,14.475],[50.105,14.445],[38.42,-82.445],[40.44,-80.0],[38.63,-90.185],[35.11,-90.075],[39.095,-84.515],[38.265,-85.76],[41.7,-87.575],[46.765,-92.095],[30.435,-91.2],[39.115,-94.59],[36.235,-95.735],[36.17,-86.775],[41.665,-83.52],[42.295,-83.1],[41.505,-81.705],[45.555,-73.535],[43.27,-79.82],[48.41,-89.215]], WK = typeof WeakMap === 'function' ? new WeakMap() : null;
  /* r16 (speed): port coordinates in radians and their cosines, computed once (same arithmetic, same results) */
  var WPR = null;
  function wportsRad() { if (!WPR) WPR = WPORTS.map(function (p) { var a = p[0] * Math.PI / 180; return [a, p[1] * Math.PI / 180, Math.cos(a)]; }).sort(function (a, b) { return a[0] - b[0]; }); return WPR; }
  function waterKm(r) { if (!r || !fin(r.lat) || !fin(r.lon)) return null; if (WK && WK.has(r)) return WK.get(r); var la = r.lat * Math.PI / 180, lo = r.lon * Math.PI / 180, best = 1e9, cla = Math.cos(la), WR = wportsRad();
    /* ports sorted by latitude: walk outwards from this latitude and stop once the latitude gap alone (a lower bound of the
       great-circle distance) exceeds the best distance found; the nearest port and its distance are exactly as before */
    var hi = 0, n = WR.length; while (hi < n && WR[hi][0] < la) hi++;
    var lo_ = hi - 1;
    function one(k) { var la2 = WR[k][0], lo2 = WR[k][1], h = Math.pow(Math.sin((la2 - la) / 2), 2) + cla * WR[k][2] * Math.pow(Math.sin((lo2 - lo) / 2), 2), d = 2 * 6371 * Math.asin(Math.sqrt(Math.min(1, h))); if (d < best) best = d; }
    while (hi < n || lo_ >= 0) {
      var gh = hi < n ? 6371 * (WR[hi][0] - la) : 1e18, gl = lo_ >= 0 ? 6371 * (la - WR[lo_][0]) : 1e18;
      if (gh <= gl) { if (gh > best + 1e-6) break; one(hi++); } else { if (gl > best + 1e-6) break; one(lo_--); }
    }
    var v = best >= 10 ? Math.round(best) : Math.round(best * 10) / 10; if (WK) WK.set(r, v); return v; }
  function seaOrWaterKm(r) { var x = (r && r.x) || {}, a = fin(x.mport_km) ? x.mport_km : null, b = fin(x.iport_km) ? waterKm(r) : null; return a != null || b != null ? Math.min(a == null ? 1e9 : a, b == null ? 1e9 : b) : x.port_km; }
  function portKm(x) { var a = fin(x.mport_km) ? x.mport_km : null, b = fin(x.iport_km) ? x.iport_km : null; return a != null || b != null ? Math.min(a == null ? 1e9 : a, b == null ? 1e9 : b) : x.port_km; }

  var METHOD_V2 = [
    'Mobility now has real inputs everywhere: hub-airport distance and distance to a 100k+ city, measured from population-weighted centres. Before, mobility had no factor at all in Switzerland and was a copy of population and density elsewhere.',
    'Jobs gains a 30 km residents catchment (labour-market proxy). Outside Switzerland it replaces the old jobs fill-in that reused population and density.',
    'Lifestyle outside Switzerland uses population scale and the 30 km catchment instead of population and density, so density is no longer counted three times.',
    'European commuter and campus access are computed once from fixed anchors (cities of 100,000+ plus the national centre lists) and population-weighted centres. They no longer depend on which map polygons happened to load, so a failed map can no longer empty a ranking.',
    'New Coastal living profile driven by sea-coast distance.',
    'City-oriented profiles (single and young professionals, DINKs, urban lifestyle, expat professionals, car-free) no longer apply the Swiss foundation floor. That floor scored density as a penalty and shut Zürich and Geneva out of the profiles built for city life.',
    'Outside Switzerland, family and elderly profiles require at least 50,000 people within 30 km, a daily-services proxy. Without it, low density alone could rank remote Arctic or mountain villages first for young families.'
  ];
  var URBAN_NO_FOUNDATION_FLOOR = { single: 1, young_professional: 1, dinks: 1, urban: 1, expat_professional: 1, car_free: 1 };
  var SERVICE_CATCHMENT = { young_family: 1, low_income_family: 1, single_parent: 1, pensioner: 1, single_pensioner: 1, healthcare_first: 1, first_home: 1 };

  function avgFinite(vals) {
    var a = vals.filter(fin);
    return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null;
  }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function lin(d, best, worst) { return fin(d) ? clamp(100 * (worst - d) / (worst - best), 0, 100) : null; }

  /* Business profiles (2.7): must-haves are checked against measured distances and counts. Each one ends in one of
     three states: pass, fail or unknown. Unknown never counts as a pass: such places are flagged, or left out when
     the profile says so (unknownMust: 'exclude'). The 'none' measure is a requirement no open dataset covers yet
     (for example grid connection capacity); it is always unknown and says so. */
  var MUST_GET = {
    mway_km: function (r) { return (r.x || {}).mway_km; }, rail_km: function (r) { return (r.x || {}).rail_km; },
    port_km: function (r) { return (r.x || {}).port_km; }, anyport_km: function (r) { return seaOrWaterKm(r); }, dens: function (r) { return fin(r.density) ? r.density : (r.x && fin(r.x.pop10) ? r.x.pop10 / 314.16 : null); }, border_km: function (r) { return (r.x || {}).border_km; },
    airport_km: function (r) { return (r.factorRaw || {}).geo_hub_airport_km; }, city_km: function (r) { return (r.factorRaw || {}).geo_major_city_km; },
    catch30: function (r) { return (r.factorRaw || {}).geo_catchment_30km; }, campus_km: function (r) { return (r.factorRaw || {}).student_anchor_km; },
    coast_km: function (r) { return (r.factorRaw || {}).geo_coast_km; }, pop: function (r) { return r.population; },
    // 2.12: role scores of the nearest financial centres and the cross-border measure (0-100, build_reach.py)
    fin_s: function (r) { return (r.x || {}).fin_s; }, ins_s: function (r) { return (r.x || {}).ins_s; }, fund_s: function (r) { return (r.x || {}).fund_s; },
    com_s: function (r) { return (r.x || {}).com_s; }, cry_s: function (r) { return (r.x || {}).cry_s; }, wlth_s: function (r) { return (r.x || {}).wlth_s; }, xb_s: function (r) { return (r.x || {}).xb_s; }, finany: function (r) { var x = r.x || {}; return fin(x.fin_s) ? Math.max(x.fin_s || 0, x.ins_s || 0, x.fund_s || 0, x.com_s || 0, x.cry_s || 0, x.wlth_s || 0) : null; },
    none: function () { return null; }
  };

  var PROXY_NOTE = { affordability: 'modelled from population density', health: 'modelled from the share of older residents', 
    family: 'modelled from young residents, growth and calm', jobs: 'modelled from working-age share and size',
    lifestyle: 'modelled from size and the population within 30 km', environment: 'modelled from low crowding',
    foundation: '', demographics: '' };
  /* NZ11-01: a custom profile built from a fixed one (base) keeps every rule tied to that profile's key */
  var RK_ENG = null;
  function rk(k) { var P = RK_ENG && RK_ENG.profiles, p = P && P[k], b = p && (p.base || p.baseProfile); return b && b !== k && P[b] && !P[b].base && !P[b].baseProfile ? b : k; }
  function Engine(meta, opts) {
    opts = opts || {};
    this._cacheIdentity = ++ENGINE_CACHE_SEQUENCE;
    this.method = opts.method || 'v2';
    this.evidence = opts.evidence || (meta.config.evidenceScoring && meta.config.evidenceScoring.mode) || 'legacy';   // 'weighted' = true weighted share (NZ-GLOBAL-049), prepared; switch only after the owner approves (docs/rank_change_*.json)
    this.meta = meta;
    this.cfg = meta.config;
    // 2.15.22: observed reality is a scored category (not only a check): where people actually move, or where business
    // activity already is. Countries under comprehensive sanctions are never ranked against other countries.
    if (meta.categoryLabels && !meta.categoryLabels.observed) meta.categoryLabels.observed = 'Population and economic context';
    this.sanctioned = (meta.config && meta.config.sanctioned) || { RU: 'EU, Swiss, UK and US sanctions against Russia' };
    this.profiles = JSON.parse(JSON.stringify(this.cfg.profiles)); RK_ENG = this;
    if (this.method === 'v1') delete this.profiles.coastal;
    var self = this;
    // allFactors: legacy rule (scored or category access); v1 excludes the new geo factors
    this.allFactors = meta.factors.filter(function (f) {
      if (self.method === 'v1' && /^(geo_|n_)/.test(f.id)) return false;
      if (self.method !== 'v1' && f.not_scored) return false;   // shown, never scored (2.11.2: divorce rate)
      return f.score_role === 'scored' || f.category === 'access';
    });
    this.factorById = {};
    meta.factors.forEach(function (f) { self.factorById[f.id] = f; });
    this.factorIdsByCat = {};
    this.allFactors.forEach(function (f) {
      // categoryV2: a regrouping that applies to the current method only (2.11.3); the legacy method keeps its categories
      var cat = self.method !== 'v1' && f.categoryV2 || f.category;
      if (cat !== 'access') (self.factorIdsByCat[cat] = self.factorIdsByCat[cat] || []).push(f.id);
    });
  }

  Engine.prototype.categoryScore = function (r, cat) {
    var ids = this.factorIdsByCat[cat] || [], fs = r.factorScores || {}, s = 0, n = 0;
    for (var i = 0; i < ids.length; i++) { var v = fs[ids[i]]; if (fin(v)) { s += v; n++; } }
    return n ? s / n : null;
  };

  Engine.prototype.derivedAccess = function (r, type) {
    if (!r || r.country === 'CH') return null;
    if (this.method === 'v1') return null; // legacy needed loaded polygons; fixtures were taken without them
    var v = (r.factorScores || {})[type === 'student' ? 'student_access_v2' : 'commuter_access_v2'];
    return fin(v) ? v : null;
  };

  var ENGINE_CACHE_SEQUENCE = 0;
  // Content identity, including estimator provenance. A numeric sum is not a safe cache key.
  // r15: content signature as a streaming hash over keys and values (no string building), exact enough to catch any
  // in-place change of a value or key, and several times cheaper than serialising the record on every call.
  var HF = new Float64Array(1), HI = new Int32Array(HF.buffer);   // exact bits of each number
  function hv(h, v) {
    var t = typeof v, i, ks;
    if (v === null || v === undefined) return (h * 31 + 7) | 0;
    if (t === 'number') { HF[0] = v; h = Math.imul(h ^ HI[0], 16777619); return Math.imul(h ^ HI[1], 16777619); }
    if (t === 'boolean') return (h * 31 + (v ? 17 : 19)) | 0;
    if (t === 'string') { h = (h * 31 + 23) | 0; for (i = 0; i < v.length; i++) h = (h * 31 + v.charCodeAt(i)) | 0; return h; }
    if (Array.isArray(v)) { h = (h * 31 + 29 + v.length) | 0; for (i = 0; i < v.length; i++) h = hv(h, v[i]); return h; }
    if (t === 'object') { ks = Object.keys(v); h = (h * 31 + 37 + ks.length) | 0; for (i = 0; i < ks.length; i++) { h = hv(h, ks[i]); h = hv(h, v[ks[i]]); } return h; }
    return h;
  }
  /* r16: flat value maps hashed by position (insertion order), key length and key letters plus the exact value bits, about
     twice as fast as hashing every key string; swapped, changed, added or removed values all change the signature */
  var KH = new Map();
  function ho(h, o) {
    if (o === null || o === undefined) return (h * 31 + 7) | 0;
    if (typeof o !== 'object' || Array.isArray(o)) return hv(h, o);
    var n = 0, k, v, kh;
    for (k in o) {
      v = o[k];
      /* r19 (audit NZ9-07): the whole key counts, not only its length and end characters; key hashes are memoised */
      kh = KH.get(k); if (kh === undefined) { kh = 2166136261; for (var i = 0; i < k.length; i++) kh = Math.imul(kh ^ k.charCodeAt(i), 16777619); KH.set(k, kh); }
      h = Math.imul(h ^ n++, 16777619); h = Math.imul(h ^ kh, 16777619);
      if (typeof v === 'number') { HF[0] = v; h = Math.imul(h ^ HI[0], 16777619); h = Math.imul(h ^ HI[1], 16777619); }
      else h = hv(h, v);
    }
    return Math.imul(h ^ n, 16777619);
  }
  function catSig(r) { var h = 5381; h = ho(h, r.factorScores); h = ho(h, r.factorRaw); h = ho(h, r.factorLevel); h = ho(h, r.factorEst); h = ho(h, r.x); h = hv(h, r.evidence); h = hv(h, r.trend); return h; }
  Engine.prototype.categories = function (r) {
    // 2.15.11 (deep audit MODEL-01): the cache is tied to the evidence it was built from, not only to the method.
    var cacheModel = this._cacheIdentity + ':' + this.method + ':' + this.evidence + ':' + (this.cfg.semanticIntegrity ? 'semantic1' : 'original');
    // 2.15.23: the cache key compares the evidence objects by identity (they are replaced, never mutated, when data arrives)
    // instead of serialising the whole record on every call, which made a large country take seconds to rank
    // plus a cheap content check (key count and value sum of each object), so values changed in place still refresh the cache
    /* r15 (speed): the full content signature serialised the whole record on every call, even on a cache hit, which cost
       seconds per view in large countries. Identity checks run every time; the content signature is re-verified at most
       once every 20 seconds per record, so a value changed in place still refreshes the cache, just not in a hot loop. */
    var k = r._catsK, now = Date.now(), sig;
    var same = r._cats && r._catsM === cacheModel && k && k[0] === r.factorScores && k[1] === r.factorRaw && k[2] === r.factorLevel && k[3] === r.x && k[4] === r.population && k[5] === r.country && k[6] === r.sourceConfidence && k[7] === r.evidence && k[8] === r.factorEst && k[9] === r.trend;
    // inside an app render pass (rank, map paint, list, place panel) the app replaces evidence objects when data arrives and
    // never edits them in place, so the identity check is enough there; direct calls outside a pass keep the full content check
    /* r16 (audit NZ-AUD-07): every rank() starts a new epoch. Inside a render pass the cache is trusted only for records
       already content-checked in the current epoch; each record is content-checked once per epoch (once per ranking),
       so values changed in place between two rankings are always picked up. Outside a pass every call is checked. */
    if (same && this._pass && r._catsE === (this._epoch | 0)) return r._cats;
    sig = catSig(r);
    if (same && r._catsS === sig) { r._catsE = this._epoch | 0; r._catsT = now; r._catsV = this._pass; return r._cats; }
    var out = {}, cats = Object.keys(this.factorIdsByCat);
    for (var i = 0; i < cats.length; i++) {
      var v = this.categoryScore(r, cats[i]);
      if (fin(v)) out[cats[i]] = v;
    }
    // 2.15.19 nature counts as nature: the built-up share used to be scored against a suburban sweet spot, so mountain
    // and countryside places with 2% built-up land (Davos, Zermatt, Engadin) scored near zero on environment and
    // rock, glacier and alpine land counted as "not green". 60% of the environment score is now the natural share
    // (everything not built-up): 95% natural or more -> 100, 60% -> 0.
    var bu0 = (r.factorRaw || {}).settlement_area_balance;
    if (this.method !== 'v1' && fin(bu0) && fin(out.environment)) out.environment = 0.4 * out.environment + 0.6 * Math.max(0, Math.min(100, (40 - bu0) / 35 * 100));
    // 2.15.28: a category backed only by estimates (regional or canton medians standing in for a missing local figure)
    // counts, but at half strength: it moves halfway from the midpoint, so an estimate never lifts or sinks a place
    // as far as a measurement would
    var fe = r.factorEst, fsE = r.factorScores || {}, lvE = r.factorLevel || {};
    if (fe) for (var ek in out) {
      var eids = this.factorIdsByCat[ek] || [], nE = 0, nM = 0;
      for (var eq = 0; eq < eids.length; eq++) if (fin(fsE[eids[eq]]) && lvE[eids[eq]] !== 9) { if (fe[eids[eq]]) nE++; else nM++; }
      if (nE && !nM && fin(out[ek])) out[ek] = 50 + (out[ek] - 50) / 2;
    }
    if (r.country !== 'CH') {
      var fs = r.factorScores || {};
      var pop = fs.common_population_scale, density = fs.common_density_balance, calm = fs.common_low_crowding;
      var growth = fs.common_population_growth_5y != null ? fs.common_population_growth_5y : (fs.at_population_growth_5y != null ? fs.at_population_growth_5y : fs.at_population_yoy);
      var working = fs.at_working_age_share, youth = fs.at_youth_share, elderly = fs.at_elderly_share_balance;
      var catch30 = fs.geo_catchment_30km, real = {}, natl = {}, lvl = r.factorLevel || {};
      // a category measured only by a national figure (e.g. the country's price level) says nothing about this place
      // compared with its neighbours: it is blended with the local estimate below instead of replacing it
      for (var rk in out) {
        var ids = this.factorIdsByCat[rk] || [], loc = 0, nat = 0;
        for (var q = 0; q < ids.length; q++) if (fin(fs[ids[q]])) { if (lvl[ids[q]] === 9) nat++; else loc++; }
        if (nat && !loc) { natl[rk] = out[rk]; delete out[rk]; } else real[rk] = 1;
      }
      if (!fin(out.foundation)) out.foundation = avgFinite([pop, density]);
      if (!fin(out.environment)) out.environment = avgFinite([calm]);
      if (!fin(out.demographics)) out.demographics = avgFinite([growth]);
      if (this.method === 'v1') {
        if (!fin(out.jobs)) out.jobs = avgFinite([working, pop, density]);
        if (!fin(out.lifestyle)) out.lifestyle = avgFinite([pop, density]);
        if (!fin(out.mobility)) out.mobility = avgFinite([density, pop]);
      } else {
        if (!fin(out.jobs)) out.jobs = avgFinite([working, pop]);
        if (!fin(out.lifestyle)) out.lifestyle = avgFinite([pop, catch30]);
        // mobility has real factors in v2; no fill-in from density
      }
      // 2.15.19 (auditor): housing costs are never guessed from density or calm; without price data affordability stays unknown
      // (its weight is shown as missing, not filled with a proxy)
      if (this.method === 'v1' && !fin(out.affordability)) out.affordability = avgFinite([calm, density]);   // legacy method v1 reproduces its published rankings exactly
      if (!fin(out.family)) out.family = avgFinite([youth, growth, calm]);
      if (!fin(out.health)) out.health = avgFinite([elderly]);
      for (var nk in natl) out[nk] = fin(out[nk]) ? (out[nk] + natl[nk]) / 2 : natl[nk];
      for (var k in out) if (!fin(out[k])) delete out[k];
      // categories without their own measures here are stand-ins (e.g. costs estimated from density); the app labels them
      var px = null; for (var pk in out) if (!real[pk] && PROXY_NOTE[pk]) (px = px || {})[pk] = natl[pk] != null ? 'national price level combined with a model ' + PROXY_NOTE[pk].replace('modelled ', '') : PROXY_NOTE[pk];
      // 2.15.28: a category known here only from a national figure (e.g. the country's tax level) is a stand-in too:
      // it counts half and never triggers the weak-core-need penalty, the same rule as the national price level
      for (var pn in natl) if (!real[pn] && !PROXY_NOTE[pn] && fin(out[pn])) (px = px || {})[pn] = 'national figure, used as an estimate';
      r._proxy = px;
    }
    var fsr = r.factorScores || {};
    // freight access (business profiles only): straight-line distance to a motorway, a main railway and a seaport
    // a key inland port (Rhine, Danube, Elbe ... Basel, Duisburg) counts like a seaport (2.10.2)
    var xx = r.x || {}, pk = portKm(xx), fm = lin(xx.mway_km, 1, 40), fl = lin(xx.rail_km, 1, 25), fp = lin(pk, 5, 150);
    if (fin(fm) || fin(fl)) out.freight = ((fin(fm) ? fm * 0.5 : 0) + (fin(fl) ? fl * 0.3 : 0) + (fin(fp) ? fp * 0.2 : 0)) / ((fin(fm) ? 0.5 : 0) + (fin(fl) ? 0.3 : 0) + (fin(fp) ? 0.2 : 0));
    // business location measures (build_reach.py): residents within 100 km across borders (network centrality for
    // distribution) and flat land, both as percentiles within the country
    if (fin(xx.reach_pct)) out.reach = xx.reach_pct;
    if (fin(xx.reach300_pct)) out.reach300 = xx.reach300_pct;
    if (fin(xx.dom150_pct)) out.domreach = xx.dom150_pct;   // home market: same-country residents within 150 km (2.11.2)   // one-day truck radius: residents within 300 km (2.11)
    var pkm = seaOrWaterKm(r); if (fin(pkm)) out.portaccess = lin(pkm, 2, 40);   // right at a major sea or inland port
    if (fin(xx.flat_pct)) out.flatland = xx.flat_pct;
    if (fin(xx.chem_km)) out.chempark = lin(xx.chem_km, 3, 40);
    // financial centres by role, 0-100 within commuting distance (2.12, build_reach.py): banking, insurance, funds,
    // commodity trading and gold, crypto, private wealth
    // outdoor (2.12): terrain relief (100 from 1,200 m of relief within reach) and water nearby; border: a national border within a short drive
    var rel = fin(xx.relief) ? Math.max(0, Math.min(100, (Math.log10(Math.max(1, xx.relief)) - 1.7) / (3.08 - 1.7) * 100)) : null, ck0 = (r.factorRaw || {}).geo_coast_km, wat = Math.max(fin(xx.lake_km) ? lin(xx.lake_km, 1, 25) : 0, fin(ck0) ? lin(ck0, 1, 25) : 0);
    // 2.15.19: mountains count fully. Relief now saturates at 2,000 m (was 1,200 m, so every alpine valley and every lake
    // shore under a ridge scored the same) and altitude adds the high-alpine part (400 m -> 0, 1,500 m -> 100); water nearby
    // is a bonus of up to 15 points (was 35% of the score), so a lake no longer outranks Davos or St. Moritz for an outdoor and mountain lover
    if (fin(rel)) { var rel2 = fin(xx.relief) ? Math.max(0, Math.min(100, (Math.log10(Math.max(1, xx.relief)) - 1.7) / (3.3 - 1.7) * 100)) : rel,
      alt2 = fin(xx.alt) ? Math.max(0, Math.min(100, (xx.alt - 400) / 11)) : null, mtn = alt2 == null ? rel2 : 0.45 * rel2 + 0.55 * alt2;   // 2.15.23: altitude weighs more (the relief window is short, so high valleys like Davos or the Engadin were under-read)
      out.outdoor = Math.min(100, Math.max(0.95 * mtn + 0.15 * wat, 0.7 * wat)); }   // 2.15.23: lake and sea country (Finland, Denmark, the Baltics) counts on its own, below the high Alps   // a lake is a bonus, its absence no penalty
    if (fin(xx.xb_s)) out.border = xx.xb_s; else if (fin(xx.border_km)) out.border = lin(xx.border_km, 3, 45);   // a border counts where the neighbour pays more (build_reach.py)
    var fany = Math.max(xx.fin_s || 0, xx.ins_s || 0, xx.fund_s || 0, xx.com_s || 0, xx.cry_s || 0, xx.wlth_s || 0);
    if (fin(xx.fin_s)) out.finhub = fany; // Broad finance screen; specialist roles remain separate.
    if (fin(xx.ins_s)) out.insurhub = xx.ins_s;
    if (fin(xx.fund_s)) out.fundhub = xx.fund_s;
    if (fin(xx.com_s)) out.commodhub = xx.com_s; if (fin(xx.cry_s)) out.cryptohub = xx.cry_s; if (fin(xx.wlth_s)) out.wealthhub = xx.wlth_s;   // inside or next to a chemical park with pipeline links (2.10.3)
    // household site measures (2.11, computed in build_reach.py): climate (mild and sunny), city scale, climate exposure
    // (estimate) and services nearby, 0-100
    if (fin(xx.climate_s)) out.climate = xx.climate_s;
    var lsc = function (v, a, b) { return Math.max(0, Math.min(100, (Math.log10(v) - a) / (b - a) * 100)); };
    // services: the people around and the place's own size; a village of 3,000 has a school but few shops or doctors (2.11.3)
    if (fin(xx.pop10) && xx.pop10 > 0) { out.city = 0.5 * lsc(xx.pop10, 4.301, 6.176) + 0.5 * lsc(Math.max(1, r.population || 1), 4.301, 6.176); out.services = 0.5 * lsc(xx.pop10, 3.477, 4.778) + 0.5 * lsc(Math.max(1, r.population || 1), 3, 4.301); }
    if (fin(xx.climrisk_s)) out.climaterisk = xx.climrisk_s;
    if (fin(xx.uni_pct)) out.campus = xx.uni_pct;
    if (fin(xx.unitown_pct)) out.unitown = xx.unitown_pct;   // universities relative to the people nearby (2.11)   // universities and UAS in and around the place (ROR, build_reach.py)
    var commute = fsr.commuter_major_city_access != null ? fsr.commuter_major_city_access : this.derivedAccess(r, 'commuter');
    var campus = fsr.student_campus_access != null ? fsr.student_campus_access : this.derivedAccess(r, 'student');
    if (fin(commute)) out.commuter_access = commute;
    if (fin(campus)) out.student_access = campus;
    if (this.method !== 'v1' && this.evidence === 'fixed' && this.cfg.semanticIntegrity) {
      var policy = this.cfg.evidenceCategoryAllow || {}, raw = r.factorScores || {};
      for (var cat in policy) { var vals = policy[cat].map(function(id){return raw[id];}).filter(fin); if(vals.length) out[cat]=avgFinite(vals); else delete out[cat]; }
      // Population density is not an observed service, housing cost or healthcare network.
      for (var pc in (r._proxy||{})) if (['affordability','health','family','jobs','lifestyle'].indexOf(pc)>=0) delete out[pc];
      delete out.services;
      // A documented access overlay may supply daily access. No population fallback.
      if(r.evidence&&fin(r.evidence.daily_access_score))out.services=r.evidence.daily_access_score;
      // Cohort-independent population growth is context, not observed migration of a profile.
      delete out.demographics;
      // Country tax rates, property multipliers and unrelated household cases must not be averaged.
      r._taxAll = out.tax; delete out.tax;   // 2.15.16: restored per profile below as one explicit tax case
    }
    r._cats = out; r._catsM = cacheModel; r._catsS = sig; r._catsT = now; r._catsV = this._pass; r._catsE = this._epoch | 0; r._catsK = [r.factorScores, r.factorRaw, r.factorLevel, r.x, r.population, r.country, r.sourceConfidence, r.evidence, r.factorEst, r.trend];
    return out;
  };

  /* a business profile can add its own 'focus' criterion: a weighted mix of factor scores, for example the local share of
     jobs in its industry. A negative weight prefers low values (for example lower wages for a back office). */
  Engine.prototype.focusScore = function (r, p) {
    var fs = r.factorScores || {}, num = 0, den = 0, f, v, w;
    for (f in p.focus) { v = fs[f]; w = p.focus[f]; if (!fin(v) || !w) continue; num += (w < 0 ? 100 - v : v) * Math.abs(w); den += Math.abs(w); }
    return den ? num / den : null;
  };
  // 2.15.23: memoised per ranking pass (the saturation check, the score and the sub-ranks each read the same categories)
  Engine.prototype.categoriesFor = function (r, key) {
    if (this._memo && this._memoKey === key) { var hit = this._memo.get(r); if (hit) return hit; var res0 = this._categoriesFor(r, key); this._memo.set(r, res0); return res0; }
    return this._categoriesFor(r, key);
  };
  Engine.prototype._categoriesFor = function (r, key) {
    var cats = this.categories(r), p = this.profiles[key];
    if (p && p.custom && p.baseProfile && this.profiles[p.baseProfile]) key = p.baseProfile;   // 2.15.28: sector and case semantics from the base profile
    // what this group dislikes nearby (2.11.3): noise, heavy industry, flooding and heat, crowding, steep terrain, dirty air
    var nz = p && p.avoid && p.avoid.length && this.method !== 'v1' ? this.nuisances(r, p.avoid) : null;
    if (!p) return cats;
    var ob = this.method !== 'v1' && rk(key) !== LOTTERY && rk(key) !== 'self_fit' ? this.observedScore(r, p, key) : null;
    if (!p.focus && !nz && ob == null && rk(key) !== 'sun_retiree' && !(this.evidence==='fixed' && this.cfg.semanticIntegrity)) return cats;
    var out = {}; for (var k in cats) out[k] = cats[k];
    if (ob != null) out.observed = ob;
    // 2.15.24: "sun and coast" means a warm, sunny climate. Its climate category is the Koeppen class of the place (measured
    // 1991-2020 climatology), so cool-summer coasts (Maine, Brittany) no longer pass as sun destinations
    // for "retiring abroad, sun and coast" the coast is the sea (audit: Willowick, Ohio scored 100 at 480 km from the sea).
    // The separate "coastal living" profile keeps large-lake shores on purpose (Toronto on Lake Ontario).
    if (rk(key) === 'sun_retiree' && fin(out.coast)) { var ckm = fin((r.factorRaw || {}).geo_sea_km) ? r.factorRaw.geo_sea_km : (r.factorRaw || {}).geo_coast_km; if (fin(ckm)) out.coast = Math.max(0, Math.min(100, 100 - ckm * 2)); }
    if (rk(key) === 'sun_retiree' && r.x && SUNK[r.x.kg] != null) out.climate = r.x.kg === 'Cfa' && fin(r.lat) ? Math.max(0, Math.min(100, 100 - (Math.abs(r.lat) - 28) * 4)) : SUNK[r.x.kg];   // humid-subtropical spans Florida to Rhode Island: its winters warm with lower latitude
    if (this.evidence==='fixed' && this.cfg.semanticIntegrity) {
      var fr=r.factorScores||{};
      // 2.15.16: tax stays in every household ranking, as ONE explicit case per profile (no averaging of unlike cases):
      // retirees -> retiree case, families -> family case, high earners -> single 150k, everyone else -> single 100k;
      // where a country has no case table, its single tax measure (the category value) is used as before
      if (!p.business) { var tc = /pensioner|retiree/.test(key) ? 'retiree_tax_100k' : /famil|parent|child|kid/.test(key) ? 'family_income_tax_100k' : /hnw|wealth|rich|dink|expat|executive/.test(key) ? 'single_income_tax_150k' : 'single_income_tax_100k';
        if (fin(fr[tc]) && this.factorById[tc]?.score_role==='scored') out.tax=fr[tc]; else if (fin(r._taxAll)) out.tax=r._taxAll; }
      // The case is explicit and fixed. Other tax cases remain facts, not substitutes.
      if (p.business) delete out.affordability;
      // Separate observed clustering from household cost or population proxies.
      if (p.business && p.focus) {var fn0=0,fd0=0;for(var fk in p.focus) if(!/^(geo_catchment|working_age|at_working|n_(house|flat|home|rent|price|ch_price))/.test(fk)&&fin(fr[fk])) {var fw0=p.focus[fk];fn0+=(fw0<0?100-fr[fk]:fr[fk])*Math.abs(fw0);fd0+=Math.abs(fw0);}out.focus=fd0?fn0/fd0:null;}
    }
    if (nz) out.quiet = nz.score;
    // growth cannot make up for a failing core need: where a category carrying 15%+ of the weight is under 40, observed
    // reality counts at most as neutral (50), so booming but unaffordable or unsafe places are not lifted by it
    if (out.observed > 50) { var w0 = p.weights || {}, t0 = 0, c0; for (c0 in w0) t0 += w0[c0];
      for (c0 in w0) if (c0 !== 'observed' && w0[c0] / t0 >= 0.15 && fin(out[c0]) && out[c0] < 40) { out.observed = 50; break; } }
    if (p.focus) {
      if (!(p.business && this.evidence==='fixed' && this.cfg.semanticIntegrity)) {var fv = this.focusScore(r, p); if (fin(fv)) out.focus = fv;}
      // industry cluster of this kind of site (build_clusters.py): where similar companies already operate
      var cl = (r.factorScores || {})['cluster_' + key]; if (fin(cl)) out.cluster = cl;
      // 2.15.25: outside the US, the cluster comes from official local job statistics by sector (build_local_clusters.js):
      // industry jobs within 15 km for production profiles, service jobs within 15 km for office and finance profiles
      else if (r.x && fin(r.x[IND_P[rk(key)] ? 'clu_ind' : 'clu_svc'])) out.cluster = r.x[IND_P[rk(key)] ? 'clu_ind' : 'clu_svc'];
      /* r15: where no cluster statistic exists, a hub airport next door is itself a logistics cluster (cargo terminals,
         forwarders, warehouses gather around it): within 5 km counts 85, fading to 0 at 30 km. Shown as an estimate. */
      if (!fin(out.cluster) && (rk(key) === 'biz_logistics' || rk(key) === 'biz_fulfilment')) { var ha = (r.factorRaw || {}).geo_hub_airport_km; if (fin(ha) && ha < 30) { out.cluster = Math.round(ha <= 5 ? 85 : 85 * (30 - ha) / 25); out.clusterProxy = 'hub airport ' + Math.round(ha) + ' km'; } }
    }
    return out;
  };
  /* 2.15.22 observed reality, 0-100. Households: population change of the place 2019-2024 (+-10% spans the scale);
     without it, net migration into its region or the region's population change (per 1,000 residents, +-10 spans it).
     Business: where no industry register exists, the regional employment rate (55% -> 0, 80% -> 100) stands in; where
     the industry cluster is measured, that already counts and nothing is added. */
  var OBS_SKIP = { nature: 1, outdoor: 1, coastal: 1 };
  var IND_P = { biz_manufacturing: 1, biz_energy_intensive: 1, biz_port_industry: 1, biz_logistics: 1, biz_fulfilment: 1, biz_food_processing: 1, biz_pharma_production: 1, biz_semis: 1, biz_auto: 1, biz_aero: 1, biz_cleantech: 1 };
  var SUNK = { Csa: 100, BSh: 95, BWh: 90, Aw: 90, As: 90, Am: 85, Af: 80, Cfa: 80, Csb: 60, Cwa: 75, BSk: 55, BWk: 50, Cfb: 35, Cwb: 45, Csc: 30, Cfc: 15, Dsa: 40, Dwa: 30, Dfa: 30, Dsb: 25, Dwb: 20, Dfb: 15, Dfc: 5, Dfd: 0, Dwc: 5, Dsc: 10, ET: 0, EF: 0 };
  Engine.prototype.observedScore = function (r, p, key) {
    var f = r.factorRaw || {}, s = r.factorScores || {}, v = null;
    if (OBS_SKIP[rk(key)]) return null;
    if (p.business) {
      for (var k in s) if (k.indexOf('cluster_') === 0 && fin(s[k])) return null;
      if (r.x && (fin(r.x.clu_ind) || fin(r.x.clu_svc))) return null;   // the local cluster already is the observed reality
      // 2.15.24: where no industry register exists, firms already operating here (business establishments per resident) are the observed reality
      if (fin(s.workplaces_per_1000_residents)) return s.workplaces_per_1000_residents;
      if (fin(s.jobs_per_1000_residents)) return s.jobs_per_1000_residents;
      return null; }   // 2.15.24: regional employment is no longer substituted (its meaning differed from firms actually present)
    // the newest series first, so the score and its explanation use the same observation (audit: Baar 2010-2019 vs 2019-2024)
    v = r.trend && fin(r.trend.population_5y_pct) ? r.trend.population_5y_pct : fin(f.common_population_growth_5y) ? f.common_population_growth_5y : fin(f.population_growth_pct) ? f.population_growth_pct : null;
    if (v != null) return clamp(50 + v * 5, 0, 100);   // population change over five years, in %: -10% -> 0, +10% -> 100
    // net migration into the region, per 1,000 residents a year: -5 -> 0, +5 -> 100 (its own scale, not mixed with % growth)
    if (fin(f.n_net_migration_region)) return clamp(50 + f.n_net_migration_region * 10, 0, 100);
    return null;
  };
  Engine.prototype._unused_obs = function () { var v = null;
    return v == null ? null : clamp(50 + v * 5, 0, 100);
  };
  Engine.prototype.weightsFor = function (r, key) {
    if (rk(key) === LOTTERY && r && r.country !== 'CH') return this.cfg.europeLotteryWeights;
    var p = this.profiles[key];
    // the audited legacy method (v1) keeps a profile's original weights where they were changed later (weightsV1)
    if (p && this.method === 'v1' && p.weightsV1) return p.weightsV1;
    var w = (p && p.weights) || {};
    // 2.15.28: business priorities keep the meaning of the profile they start from (sector, cluster, tax case, observed reality);
    // only the weights are the user's. A custom profile without a base gets nothing added.
    var sk = p && p.custom && p.baseProfile && this.profiles[p.baseProfile] ? p.baseProfile : key;
    if (this.method !== 'v1' && p && r && rk(key) !== LOTTERY && rk(key) !== 'self_fit' && (!p.custom || sk !== key) && !w.observed && this.observedScore(r, p, sk) != null) {   // only where it is measured, so coverage never counts it as missing
       var o = {}; for (var k in w) o[k] = w[k]; o.observed = p.business ? 15 : 8; return o; }
    return w;
  };
  Engine.prototype.usesAccess = function (key, country) {
    if (rk(key) === LOTTERY && country !== 'CH') return true;
    var p = this.profiles[key], w = p && p.weights;
    return !!(w && (w.commuter_access || w.student_access));
  };

  Engine.prototype.softLotteryPenalty = function (score, cats, r) {
    var cfg = this.cfg.softLottery, out = score, c, min;
    if (r.country === 'CH') {
      var f = cfg.CH.floors;
      for (c in f) { min = f[c]; if (fin(cats[c]) && cats[c] < min) out -= Math.min(18, (min - cats[c]) * 0.38); }
      var p = Number(r.population || 0);
      if (p < 1500) out -= 12; else if (p < 3000) out -= 6;
    } else {
      var g = cfg.Europe.floors;
      for (c in g) { min = g[c]; if (fin(cats[c]) && cats[c] < min) out -= Math.min(14, (min - cats[c]) * 0.32); }
    }
    return clamp(out, 0, 100);
  };

  /* Legacy profileScoreRaw (s03 V48), with `country` = the active scope country (legacy read it from state). */
  Engine.prototype.scoreRaw = function (r, key, minCoverage, country, collectReceipt) {
    if (minCoverage == null) minCoverage = 55;
    country = country || r.country;
    var p = this.profiles[key];
    if (!p || p.disabled) return null;
    var cats = this.categoriesFor(r, key), w = this.weightsFor(r, key), num = 0, den = 0, total = 0, c;
    // stand-in categories (no measured data for this place) count half, so measured evidence leads the ranking
    var px = r._proxy || {}, wc, have = 0, meas = 0;
    var flat = this._flat || {};
    for (c in w) { if (flat[c]) continue; total += w[c]; if (fin(cats[c])) { have += w[c]; if (!px[c]) meas += w[c]; wc = px[c] && this.method !== 'v1' ? w[c] * 0.5 : w[c]; num += cats[c] * wc; den += wc; } }
    if (!den) return null;
    var score = num / den;
    var receipt = collectReceipt ? {schema:'nz-score-receipt-1',profile:key,place_id:r.id,country:r.country,
      method:this.method,evidenceMode:this.evidence,weightedAverage:score,declaredWeight:total,effectiveKnownWeight:den,
      inputs:[],adjustments:[],validation:'not-independently-validated'} : null;
    if (receipt) { for (c in w) { if (!fin(w[c]) || w[c]<=0) continue;
      var included=!flat[c]&&fin(cats[c]),ew=included?(px[c]&&this.method!=='v1'?w[c]*.5:w[c]):0;
      receipt.inputs.push({category:c,declaredWeight:w[c],effectiveWeight:ew,value:included?cats[c]:null,
        points:included?cats[c]*ew/den:0,status:included?'model-input':'missing',proxy:!!px[c],
        provenance:this.categoryProvenance(r,c,key),scopeExcluded:!!flat[c]});
    } }
    var previousStage = score;
    function stage(name) { if(receipt)receipt.adjustments.push({stage:name,before:previousStage,after:score,points:score-previousStage}); previousStage=score; }

    total = total || den;
    var coverage = Math.round((den / total) * 100);
    /* 2.15.23 honest certainty: a score that rests on a small part of the profile's weight is pulled toward the neutral 50,
       in proportion to what is missing (full effect from 70% of the weight measured). Without this, a budget ranking with no
       housing-cost data could show 90s from transport alone. Ordering among equally covered places is unchanged. */
    if (this.method !== 'v1' && rk(key) !== LOTTERY && rk(key) !== 'self_fit') { var cf = Math.max(0.35, Math.min(1, (den / total) / 0.7)); score = 50 + (score - 50) * cf; }
    stage('missing_weight_neutral_shrink');
    var strictCov = coverage;   // 2.13.2: the same measure in every country, before the country-specific adjustments below
    if (rk(key) === LOTTERY) score = this.softLotteryPenalty(score, cats, r);
    else { var m = p.min || {}; for (c in m) if (fin(cats[c]) && cats[c] < m[c]) score = Math.min(score, 55 + cats[c] * 0.45); }
    stage('lottery_or_minimum_cap');
    /* a weak core need is not made up for by strengths elsewhere (2.11.3): every category that carries 15% or more of the
       weight costs 1.5 x its share for each point under 50 (measured values only; legacy method unchanged) */
    if (this.method !== 'v1' && rk(key) !== LOTTERY && r.country === 'CH') { var st0 = p.strict || {}; for (c in st0) if (c !== 'foundation' && c !== 'coast' && fin(cats[c]) && cats[c] < st0[c]) score -= (st0[c] - cats[c]) * 0.5; }
    stage('swiss_strict_penalty');
    // 2.15.16 budget reality: a fixed income cannot pay for the most expensive housing markets, however good the doctors
    // and safety are; profiles with softFloors (budget, and the defining climate of a sun retiree) lose points below them in every country (not only the Swiss floors above)
    if (this.method !== 'v1' && p.softFloors) { var sf = p.softFloors; for (c in sf) { var f0 = Array.isArray(sf[c]) ? sf[c][0] : sf[c], k0 = Array.isArray(sf[c]) ? sf[c][1] : 0.5; if (fin(cats[c]) && cats[c] < f0) score -= (f0 - cats[c]) * k0; } }
    stage('profile_soft_floors');
    if (this.method !== 'v1' && rk(key) !== LOTTERY) { var tw0 = 0, pen = 0; for (c in w) tw0 += w[c]; for (c in w) if (w[c] / tw0 >= 0.15 && fin(cats[c]) && cats[c] < 50 && !px[c]) pen += w[c] / tw0 * (50 - cats[c]) * 1.5; score = Math.max(0, score - pen); }
    stage('weak_core_penalty');
    if (r.country !== 'CH') {
      var sourceCount = Number(r.availableFactorCount || Object.keys(r.factorScores || {}).length || 0);
      if (this.method !== 'v1') sourceCount = Number(r.availableFactorCount || 0) + (r.geoFactorCount || 0);
      var accessBonus = this.usesAccess(key, country) && (fin(cats.commuter_access) || fin(cats.student_access)) ? 10 : 0;
      if (this.evidence !== 'weighted') coverage = Math.max(coverage, Math.min(78, Math.round(sourceCount * 9 + accessBonus)));
      score = score * (0.8 + 0.2 * (coverage / 100));
    }
    stage('country_coverage_multiplier');
    /* 2.13.2 (owner decision 2 Nov 2026): one evidence rule for every country. Method v2 ranks a place when it reaches the
       common floor (8; 6 for the lottery profile) and marks it `thin` when less than half of the profile's weight rests on
       measured data or less than 55% is covered once estimates count half. Thin places stay ranked, after the others.
       Method v1 keeps the legacy rule (Switzerland 55, elsewhere 8) so the legacy fixtures stay reproducible. */
    var floor = this.method === 'v1' ? (rk(key) === LOTTERY ? (r.country === 'CH' ? 12 : 6) : (r.country === 'CH' ? minCoverage : 8)) : (r.country === 'CH' && minCoverage === 0 ? 0 : rk(key) === LOTTERY ? 6 : 8);
    if (coverage < floor) return null;
    /* coverage above is the legacy ranking input (count-based floor outside Switzerland, kept so rankings do not change
       silently). What users see is `weighted`: the share of this profile's weight whose category has a value, and
       `measured`: the part of it backed by measured data rather than an estimate (NZ-GLOBAL-049). */
    var tw = 0; for (c in w) tw += w[c];
    var measured = tw ? Math.round(meas / tw * 100) : 0;
    if(receipt) { receipt.score=score;receipt.modelCoverage=coverage;
      receipt.legacyMeasured=measured;receipt.coverageMeaning='Legacy model weight indicator, not a measured-data percentage';
      receipt.reconciled=Math.abs(receipt.inputs.reduce(function(a,d){return a+d.points;},0)+receipt.adjustments.reduce(function(a,d){return a+d.points;},0)-score)<1e-8;
    }
    return { receipt:receipt, score: score, coverage: coverage, weighted: tw ? Math.round(have / tw * 100) : 0, measured: measured, cats: cats, thin: this.method !== 'v1' && (measured < 50 || strictCov < 55) };
  };


  /* Evidence model 1.0. Declared weights never migrate to available factors.
     score is the supported lower bound, not a claim that missing values are zero.
     upper is the unresolved bound. No country-specific confidence multiplier. */
  Engine.prototype.scoreEvidence = function (r, key, minCoverage, country) {
    var p = this.profiles[key]; if (!p || p.disabled) return null;
    var cats = this.categoriesFor(r, key), w = this.weightsFor(r, key);
    var num = 0, unresolved = 0, total = 0, observed = 0, measured = 0, detail = [];
    var px = r._proxy || {}, self = this;
    // These are preferences or proxies, never observations of actual service access.
    var modelled = {services:1,city:1,climate:1,climaterisk:1,quiet:1,foundation:1};
    Object.keys(w).forEach(function(c) {
      var wc = Number(w[c]); if (!fin(wc) || wc <= 0) return; total += wc;
      var value = fin(cats[c]) ? clamp(cats[c],0,100) : null, fraction = value === null ? 0 : 1;
      if (c === 'quiet' && p.avoid && p.avoid.length) {
        var nz = self.nuisances(r,p.avoid); fraction = nz ? nz.known / nz.requested : 0;
      }
      if (c === 'focus' && p.focus) {
        var all=0,have=0; Object.keys(p.focus).forEach(function(k){var q=Math.abs(p.focus[k]);all+=q;if(fin((r.factorScores||{})[k])&&!(self.cfg.semanticIntegrity&&p.business&&/^(geo_catchment|working_age|at_working|n_(house|flat|home|rent|price|ch_price))/.test(k)))have+=q;}); fraction=all?have/all:0;
      }
      if(c==='freight'){var xx=r.x||{};fraction=(fin(xx.mway_km)?.5:0)+(fin(xx.rail_km)?.3:0)+(fin(portKm(xx))?.2:0);}
      var known = wc*fraction, contribution = value===null ? 0 : value*known;
      observed += known; if (!px[c] && !modelled[c]) measured += known;
      num += contribution; unresolved += wc-known;
      detail.push({category:c,weight:wc,value:value,knownWeight:known,points:contribution/100,
        evidence:value===null?'missing':px[c]||modelled[c]?'modelled':'observed',
        missingReason:value===null?'No compatible observation supplied':fraction<1?'Incomplete components':null});
    });
    if (!total || !observed) return null;
    var lower = num/total, upper = (num+100*unresolved)/total;
    var coverage = observed/total*100, measuredCoverage=measured/total*100;
    // Penalties operate on both endpoints and stay visible as a separate model adjustment.
    var penalty=0; detail.forEach(function(d){d.points=d.value===null?0:d.value*d.knownWeight/total;});
    lower=clamp(lower-penalty,0,100);upper=clamp(upper-penalty,lower,100);
    if (coverage < (rk(key) === LOTTERY ? 6 : 8)) return null;
    return {score:lower,lower:lower,upper:upper,penalty:penalty,coverage:Math.round(coverage),
      weighted:Math.round(coverage),measured:Math.round(measuredCoverage),cats:cats,
      thin:measuredCoverage<50||coverage<55,contributions:detail,missingWeight:unresolved/total*100,
      model:'evidence-fixed-1',scoreMeaning:'supported lower bound',
      evidenceStatus:unresolved>0?'incomplete':'complete-inputs-not-empirical-validation'};
  };
  Engine.prototype.scoreLegacyRaw = Engine.prototype.scoreRaw;
  Engine.prototype.scoreRaw = function (r,key,minCoverage,country,collectReceipt) {
    return this.method !== 'v1' && this.evidence === 'fixed' ? this.scoreEvidence(r,key,minCoverage,country) : this.scoreLegacyRaw(r,key,minCoverage,country,collectReceipt);
  };
  Engine.prototype.explainEvidence = function (r,key) {
    var x=this.scoreRaw(r,key,0,r.country,true);if(!x)return null;
    return {profile:key,model:x.model||this.method,data:this.meta.v,country:r.country,
      comparison:'within-country:'+r.country,score:x.score,upper:x.upper==null?x.score:x.upper,
      coverage:x.coverage,measured:x.measured,receipt:x.receipt||null,contributions:x.contributions||[],
      readiness:this.profiles[key].must?this.mustStatus(r,this.profiles[key]):[],
      validation:(this.cfg.profileEvidence||{})[rk(key)]||{status:'not-empirically-validated'}};
  };
  /* r21 (audit NZ11-18): one country-aware source resolver for sheets, receipts and exports. A country-specific entry wins;
     a measure registered country by country never borrows another country's source; a field holding several links is split */
  function splitUrls(u){return String(u||'').match(/https?:\/\/[^\s;,)]+/g)||[];}
  Engine.prototype.sourceFor = function(f,cc){
    f=f||{};var bc=f.by_country&&Object.keys(f.by_country).length?f.by_country:null,m=bc?bc[cc]:f;
    if(!m)return {name:null,dataset:null,url:null,urls:[],period:null,licence:null,resolved:false};
    var urls=splitUrls(m.url||m.source_url);
    return {name:m.source_name||m.source_id||null,dataset:m.dataset||null,url:urls[0]||null,urls:urls,period:m.period||m.source_period||null,licence:m.licence||null,resolved:!!(m.source_name||m.source_id)};
  };
  Engine.prototype.categoryProvenance = function(r,category,key) {
    var ids=this.factorIdsByCat[category]||[], fs=r.factorScores||{},fe=r.factorEst||{},fr=r.factorRaw||{},fl=r.factorLevel||{},self=this;
    var rows=ids.filter(function(id){return fin(fs[id]);}).map(function(id){
      var f=self.factorById[id]||{},m=f.by_country&&Object.keys(f.by_country).length?(f.by_country[r.country]||{}):f,src=self.sourceFor(f,r.country);
      var estimated=!!fe[id]||id==='n_cost_est_income'||id==='n_ch_price_pressure'||/estimate|modelled|modeled|imput/i.test([f.name,f.description,f.methodology_note,m.methodology_note].join(' '));
      return {factor:id,value:fin(fr[id])?fr[id]:null,normalisedValue:fs[id],estimated:estimated,
        support:fl[id]===0?'local':[1,2,3].indexOf(fl[id])>=0?'regional':fl[id]===9?'national':'unresolved',
        source:src.url,sourceName:src.name,period:src.period,unit:f.unit||null};
    });
    var modelCategories={observed:1,quiet:1,services:1,climate:1,climaterisk:1,outdoor:1,focus:1,freight:1,city:1,environment:1,cluster:1};
    var notes={quiet:'Distance-based nuisance screen, not measured noise exposure.',services:'Population and catchment proxy, not verified service capacity.',climate:'Climate-class and daylight model, not a measured municipal climate panel.',environment:'Composite environment model, including settlement and land shares; not measured access to green space.',cluster:'Derived cluster screen. Inspect the sector, statistical unit, area and year before using it as site evidence.',observed:'Contextual population or economic input; not independently validated preference or business success.'};
    var note=notes[category]||'Category scores are model transformations. Geographic support and measurement status are separate.';
    if(category==='quiet'){var q=this.nuisances(r,(this.profiles[key]||{}).avoid||[]);if(q)note+=' '+q.known+' of '+q.requested+' selected distance/risk checks known. Missing-check penalties are heuristic, not decibel estimates.';}
    return {kind:modelCategories[category]?'derived-model':rows.some(function(x){return x.estimated;})?'contains-estimates':r._proxy&&r._proxy[category]?'proxy':rows.length?'sourced-inputs-not-independently-verified':'derived-or-unresolved',inputs:rows,
      note:note};
  };
  Engine.prototype.shortCat = function (k) {
    var L = this.meta.categoryLabels[k] || k;
    return L.replace('Environment and climate', 'Green space').replace('Affordability', 'Costs').replace('Jobs and economy', 'Jobs')
      .replace('Safety and community', 'Safety').replace('Taxes and wealth', 'Tax').replace('Education and family', 'Family')
      .replace('Health and elderly', 'Health').replace('Mobility and connectivity', 'Mobility').replace('Lifestyle and amenities', 'Lifestyle')
      .replace('Governance and fiscal strength', 'Governance').replace('Commuter access', 'Commute').replace('Campus access', 'Campus')
      .replace('Coast and sea', 'Coast');
  };

  /* Legacy eligibilityFail: s03 V48 base + v63 Europe access gates. Returns '' when eligible. */
  Engine.prototype.eligibilityFail = function (r, key, country) {
    country = country || r.country;
    var p = this.profiles[key];
    if (!p || p.disabled) return 'disabled';
    // a whole-city entry outside Europe sums its own districts, which are ranked themselves
    if (r.whole) return 'whole-city entry';
    if (rk(key) === LOTTERY) return '';
    var cats = this.categories(r), c;
    var mp = this.method === 'v1' && 'minPopV1' in p ? p.minPopV1 : p.minPop;
    if (mp && r.population < mp) return 'population floor';
    if (p.must) {
      var ms = this.mustStatus(r, p), mi;
      for (mi = 0; mi < ms.length; mi++) if (ms[mi].status === 'fail') return 'must-have: ' + ms[mi].label;
      // 'none' requirements have no open data anywhere: always shown as unknown, never a reason to drop a place
      if (p.unknownMust === 'exclude') for (mi = 0; mi < ms.length; mi++) if (ms[mi].status === 'unknown' && ms[mi].k !== 'none' && !ms[mi].nonet) return 'unknown must-have: ' + ms[mi].label;
      if (p.business) return '';
    }
    if (r.country !== 'CH') {
      if (this.usesAccess(key, country)) {
        var k = rk(key) === 'student' ? 'student_access' : 'commuter_access', min = rk(key) === 'student' ? 18 : 12;
        // the commute floor is for commute-centred profiles; a family profile that also weighs the commute must not drop
        // whole countries without a large job centre (Malta, Liechtenstein) (2.11; legacy method unchanged)
        var wacc = this.weightsFor(r, key)[k] || 0;
        if (fin(cats[k]) && cats[k] < min && (this.method === 'v1' || k === 'student_access' || wacc >= 20)) return this.shortCat(k) + ' floor';
      }
      if (rk(key) === 'coastal' && this.method !== 'v1') {
        if (!fin(cats.coast) || cats.coast < p.strict.coast) return 'coast floor';
      }
      // v63 wrapper
      var gate = this.cfg.europeAccessGates[rk(key)];
      if (gate) {
        var v = cats[gate[0]];
        if (!fin(v) || v < gate[1]) return 'regional access floor';
      }
      if (this.method !== 'v1' && SERVICE_CATCHMENT[rk(key)]) {
        var c30 = (r.factorRaw || {}).geo_catchment_30km;
        if (!fin(c30) || c30 < 50000) return 'daily-services catchment floor';
      }
      if (rk(key) === 'student' && r.population < 9000 && !(cats.student_access >= 78)) return 'campus scale floor';
      if (rk(key) === 'car_free' && r.population < 6000 && !(cats.commuter_access >= 75)) return 'daily-service floor';
      return '';
    }
    var strict = p.strict || {};
    for (c in strict) {
      if (c === 'foundation' && this.method !== 'v1' && URBAN_NO_FOUNDATION_FLOOR[rk(key)]) continue;
      // 2.11.3: in method v2 only the basics floor excludes; the other Swiss floors lower the score instead (scoreRaw), so a
      // place a little under one (Lugano on safety for pensioners) is ranked lower, not removed
      if (this.method !== 'v1' && c !== 'foundation' && c !== 'coast') continue;   // the coast defines coastal living: stays a hard floor
      if (!fin(cats[c]) || cats[c] < strict[c]) return this.shortCat(c) + ' floor';
    }
    return '';
  };

  Engine.prototype.mustStatus = function (r, p) {
    var self = this;
    return (p.must || []).map(function (m) {
      var g = MUST_GET[m.k], v = g ? g(r) : /^f:/.test(m.k) ? (r.factorRaw || {})[m.k.slice(2)] : null;
      var st = !fin(v) ? 'unknown' : (m.op === '<=' ? v <= m.v : v >= m.v) ? 'pass' : 'fail';
      // 2.12.3: a country without any motorway or railway in the source map (Iceland, Malta, Cyprus, the Baltics' motorways)
      // cannot meet that must-have anywhere; it is not applied there and the place says to check the main roads on site
      var nn = (self.cfg.noNetwork || {})[m.k];
      if (nn && nn.indexOf(r.country) >= 0) return { k: m.k, label: m.label + ' (not applied: no such network in this country)', op: m.op, v: m.v, unit: m.unit || '', val: fin(v) ? v : null, status: 'unknown', nonet: true };
      return { k: m.k, label: m.label, op: m.op, v: m.v, unit: m.unit || '', val: fin(v) ? v : null, status: st };
    });
  };
  /* nuisances near a place, for the dislikes of one profile: [{k, pen 0-100, d}] and a score (100 = none of them).
     Distances are straight lines from public map data (Natural Earth roads, OurAirports, Nestlyzer's chemical park and
     port lists), so they flag likely noise or risk, not a measured level. */
  var NZ_RULES = {
    mway: function (r, x) { var d = x.mway_km; return fin(d) ? [d <= 1 ? 70 : d < 3 ? 70 * (3 - d) / 2 : 0, d] : null; },
    air: function (r, x) { var d = (r.factorRaw || {}).geo_hub_airport_km; return fin(d) ? [d <= 4 ? 80 : d < 12 ? 80 * (12 - d) / 8 : 0, d] : null; },
    chem: function (r, x) { var d = x.chem_km; return fin(d) ? [d <= 3 ? 90 : d < 10 ? 90 * (10 - d) / 7 : 0, d] : null; },
    port: function (r, x) { var d = x.mport_km; return fin(d) ? [d <= 2 ? 50 : d < 5 ? 50 * (5 - d) / 3 : 0, d] : null; },
    flood: function (r, x) { var c = x.climrisk_s; return fin(c) ? [Math.max(0, 60 - c), c] : null; },
    crowd: function (r, x) { var v = (r.factorRaw || {}).geo_density10_km2; if (!fin(v)) v = r.density; /* 2.15.28: municipal density where the 10 km figure is not built (Europe), as the key facts already show */ return fin(v) ? [v > 4000 ? 60 : v > 1500 ? 60 * (v - 1500) / 2500 : 0, v] : null; },
    steep: function (r, x) { var v = x.relief; return fin(v) ? [v > 900 ? 60 : v > 400 ? 60 * (v - 400) / 500 : 0, v] : null; },
    air_quality: function (r, x) { var s = (r.factorScores || {}).n_pm25; return fin(s) ? [Math.max(0, 50 - s), s] : null; }
  };
  Engine.prototype.nuisances = function (r, list) {
    var x = r.x || {}, hits = [], any = false, mx = 0, sum = 0, known = 0;
    (list || []).forEach(function (k) { var f = NZ_RULES[k], v = f && f(r, x); if (!v) return; any = true; known++; var pen = Math.round(v[0]); if (pen > 0) hits.push({ k: k, pen: pen, d: v[1] }); mx = Math.max(mx, pen); sum += pen; });
    if (!any) return null;
    /* 2.15.28 (audit 2.15.27, finding 9): a check without data is not a clean check. Each selected check that cannot be made
       lowers the ceiling by 12 points, so "few nuisances" is never a perfect 100 when only part of the list was checked. */
    var req = (list || []).length, cap = 100 - 12 * Math.max(0, req - known);
    return { known: known, requested: req, unknown: Math.max(0, req - known), score: Math.max(0, Math.min(cap, Math.round(100 - Math.min(100, mx + 0.5 * (sum - mx))))), hits: hits.sort(function (a, b) { return b.pen - a.pen; }) };
  };

  Engine.prototype.factorValue = function (r, f) {
    var v = (r.factorScores || {})[f.id];
    if (f.id === 'commuter_major_city_access' && v == null) v = this.derivedAccess(r, 'commuter');
    if (f.id === 'student_campus_access' && v == null) v = this.derivedAccess(r, 'student');
    return v;
  };

  /* Rank a scope. Returns {scored, categoryRanks, factorRanks, reasons}. Input order = tie order (legacy). */
  Engine.prototype.rank = function (scope, key, opts) { var self = this; self._epoch = (self._epoch | 0) + 1; return Engine.prototype.pass.call(this, function () { return Engine.prototype._rank.call(self, scope, key, opts); }); };
  Engine.prototype._rank = function (scope, key, opts) {
    opts = opts || {};
    var country = opts.country, out = [], reasons = {}, self = this;
    this._memo = typeof WeakMap === 'function' ? new WeakMap() : null; this._memoKey = key;
    /* 2.15.23: a category that gives the top mark to most places of this comparison (for example "services" in dense
       Chinese cities, "jobs" in Hong Kong or Singapore) cannot tell them apart; it only lifts every score. Where 60% or
       more of 30+ places score 100 on it, it is left out of this comparison (shown, not weighted). Not in method v1. */
    this._flat = {};
    // 2.15.24: switched off. Dropping categories by what else is in the comparison made a place's fit score change with
    // the result set (audit: Overland Park 77.14 vs 74.19). A category every place maxes adds the same to all; scores stay scope-independent.
    if ((this.cfg || {}).flatDrop && this.method !== 'v1' && scope.length >= 30) { var wq = (this.profiles[key] || {}).weights || {}, cq, nq, hq, cv;
      var cache = new Array(scope.length);   // 2.15.23: categories computed once per place, not once per category (same result, ~10x faster)
      for (var j0 = 0; j0 < scope.length; j0++) cache[j0] = this.categoriesFor(scope[j0], key);
      for (cq in wq) { if (cq === 'observed') continue; nq = 0; hq = 0;
        for (var j = 0; j < scope.length; j++) { cv = cache[j][cq]; if (fin(cv)) { nq++; if (cv >= 99.5) hq++; } }
        if (nq >= 30 && hq / nq >= 0.6) this._flat[cq] = 1; } }
    for (var i = 0; i < scope.length; i++) {
      var r = scope[i];
      if (this.sanctioned[r.country] && country !== r.country) { reasons['sanctions'] = (reasons['sanctions'] || 0) + 1; continue; }
      var s = this.scoreRaw(r, key, 55, country);
      if (!s) { reasons['coverage'] = (reasons['coverage'] || 0) + 1; continue; }
      var why = this.eligibilityFail(r, key, country);
      if (why) { reasons[why] = (reasons[why] || 0) + 1; continue; }
      out.push({ r: r, id: r.id, overall: s.score, coverage: s.coverage, weighted: s.weighted, measured: s.measured, thin: !!s.thin, upper: s.upper, scoreMeaning: s.scoreMeaning, model: s.model, catScores: s.cats, sourceConfidence: r.sourceConfidence, _i: i, must: this.profiles[key].must ? this.mustStatus(r, this.profiles[key]) : null });
    }
    this._flatLast = this._flat; this._flat = {};
    out.sort(function (a, b) {
      var fa = fin(a.overall), fb = fin(b.overall);
      if (fa !== fb) return fa ? -1 : 1;
      if (self.method !== 'v1' && !!a.thin !== !!b.thin) return a.thin ? 1 : -1;
      if (fa && a.overall !== b.overall) return b.overall - a.overall;
      var qa = fin(a.sourceConfidence) ? a.sourceConfidence : -1;
      var qb = fin(b.sourceConfidence) ? b.sourceConfidence : -1;
      if (qa !== qb) return qb - qa;
      return self.method === 'v1' ? a._i - b._i : String(a.id).localeCompare(String(b.id));
    });
    out.forEach(function (x, i) { x.rank = i + 1; });
    var res = { scored: out, reasons: reasons, categoryRanks: {}, factorRanks: {} };
    if (opts.subRanks !== false) this.computeRanks(res);
    this._memo = null;
    return res;
  };
  // Run fn as one pass: records are not changed inside it, so each is content-checked once (map painting, comparisons).
  Engine.prototype.pass = function (fn) {
    if (this._pass) return fn();
    this._pass = ++ENGINE_CACHE_SEQUENCE;
    try { return fn(); } finally { this._pass = 0; }
  };

  Engine.prototype.computeRanks = function (res) {
    var cats = {}, self = this, sc = res.scored, n = sc.length;
    sc.forEach(function (x) { for (var c in x.catScores) cats[c] = 1; });
    function rankBy(vals) {
      var idx = []; for (var i = 0; i < n; i++) if (fin(vals[i])) idx.push(i);
      idx.sort(function (a, b) { return (vals[b] - vals[a]) || (a - b); });
      var m = {}; for (var k = 0; k < idx.length; k++) m[sc[idx[k]].id] = k + 1; return idx.length ? m : null;
    }
    Object.keys(cats).forEach(function (c) { var v = new Array(n); for (var i = 0; i < n; i++) v[i] = sc[i].catScores[c]; res.categoryRanks[c] = rankBy(v) || {}; });
    /* r16 (speed): a factor's rank table is built the first time it is read (list chips, place panel), not for all
       factors up front; the values and ranks are exactly the same, only computed later */
    this.allFactors.forEach(function (f) {
      var done = false, val;
      Object.defineProperty(res.factorRanks, f.id, { configurable: true, enumerable: true, get: function () {
        if (!done) {
          done = true;
          var v = new Array(n), any = false;
          for (var i = 0; i < n; i++) { v[i] = self.factorValue(sc[i].r, f); if (fin(v[i])) any = true; }
          val = any ? (rankBy(v) || undefined) : undefined;
        }
        return val;
      } });
    });
  };

  /* Map surface: profile score without eligibility gates (legacy "gates apply to the list, not the colour"). */
  Engine.prototype.surface = function (r, key, layer, country) {
    if (layer === 'score' || !layer) {
      if (!key) return null;
      var s = this.scoreRaw(r, key, 0, country);
      if (s) return s.score;
      var c = this.categories(r), vals = [];
      for (var k in c) if (k !== 'commuter_access' && k !== 'student_access' && k !== 'freight') vals.push(c[k]);
      return avgFinite(vals);
    }
    if (layer === 'commuter_access' || layer === 'student_access') return this.categories(r)[layer];
    var v = this.categoryScore(r, layer);
    if (!fin(v) && r.country !== 'CH') v = this.categories(r)[layer];
    return fin(v) ? v : null;
  };

  Engine.prototype.topCats = function (x, n) {
    var c = x.catScores || this.categories(x.r || x);
    return Object.keys(c).filter(function (k) { return fin(c[k]); }).map(function (k) { return [k, c[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; }).slice(0, n || 4);
  };
  Engine.prototype.weakCats = function (x, n) {
    var c = x.catScores || this.categories(x.r || x);
    return Object.keys(c).filter(function (k) { return fin(c[k]); }).map(function (k) { return [k, c[k]]; })
      .sort(function (a, b) { return a[1] - b[1]; }).slice(0, n || 2);
  };

  /* Guided builder (s03 buildGuidedProfile) */
  Engine.prototype.buildGuided = function (st) {
    var w = { safety: 10, foundation: 10, affordability: 8, jobs: 8, lifestyle: 8, health: 6, tax: 4, environment: 4 };
    var strict = {}, minPop = 1200, access = false;
    function bump(k, v) { w[k] = (w[k] || 0) + v; }
    function S(k, v) { strict[k] = Math.max(strict[k] || 0, v); }
    switch (st.household) {
      case 'family': bump('family', 30); bump('safety', 18); bump('affordability', 14); bump('health', 6); S('family', 45); S('safety', 42); minPop = 1500; break;
      case 'single_parent': bump('family', 34); bump('safety', 20); bump('affordability', 20); bump('foundation', 12); S('family', 48); S('safety', 48); minPop = 2000; break;
      case 'student': bump('student_access', 38); bump('lifestyle', 18); bump('affordability', 14); bump('safety', 8); S('student_access', 35); access = true; minPop = 2500; break;
      case 'pensioner_single': bump('health', 32); bump('safety', 22); bump('affordability', 12); bump('foundation', 12); S('health', 48); S('safety', 48); minPop = 1200; break;
      case 'pensioner_couple': bump('health', 26); bump('safety', 18); bump('tax', 12); bump('environment', 10); S('health', 44); S('safety', 42); minPop = 900; break;
      case 'dinks': bump('jobs', 24); bump('lifestyle', 28); bump('commuter_access', 18); S('jobs', 45); S('lifestyle', 48); access = true; minPop = 5000; break;
      case 'couple': bump('lifestyle', 14); bump('jobs', 12); bump('safety', 10); bump('health', 8); minPop = 1800; break;
      default: bump('jobs', 20); bump('lifestyle', 16); bump('commuter_access', 14); S('jobs', 35); access = true; minPop = 2500;
    }
    switch (st.budget) {
      case 'low': bump('affordability', 34); bump('jobs', 12); S('affordability', 45); break;
      case 'constrained': bump('affordability', 24); bump('tax', 6); S('affordability', 35); break;
      case 'premium': bump('lifestyle', 16); bump('health', 10); bump('safety', 8); break;
      case 'wealth': bump('tax', 28); bump('lifestyle', 18); bump('health', 10); bump('safety', 10); S('tax', 55); break;
      default: bump('affordability', 8); bump('jobs', 6);
    }
    switch (st.anchor) {
      case 'school': bump('family', 24); bump('safety', 14); S('family', 45); break;
      case 'campus': bump('student_access', 34); bump('lifestyle', 12); access = true; break;
      case 'health': bump('health', 30); bump('safety', 12); S('health', 55); break;
      case 'lifestyle': bump('lifestyle', 30); bump('commuter_access', 12); access = true; S('lifestyle', 45); break;
      case 'nature': bump('environment', 34); bump('safety', 10); break;
      case 'tax': bump('tax', 34); bump('lifestyle', 10); bump('health', 8); break;
      default: bump('jobs', 24); bump('commuter_access', 12); access = true;
    }
    switch (st.mobility) {
      case 'carfree': bump('commuter_access', 28); bump('foundation', 20); bump('lifestyle', 12); S('commuter_access', 50); access = true; minPop = Math.max(minPop, 4000); break;
      case 'commuter': bump('commuter_access', 38); bump('jobs', 10); S('commuter_access', 45); access = true; break;
      case 'remote': bump('affordability', 12); bump('environment', 16); bump('tax', 10); break;
      case 'xborder': bump('commuter_access', 28); bump('jobs', 10); bump('tax', 8); S('commuter_access', 35); access = true; break;
      case 'car': bump('foundation', 6); break;
      default: bump('commuter_access', 20); bump('lifestyle', 10); access = true;
    }
    switch (st.tax) {
      case 'pension': bump('tax', 16); bump('health', 12); break;
      case 'founder': bump('tax', 14); bump('jobs', 14); bump('lifestyle', 8); break;
      case 'wealth': bump('tax', 26); bump('health', 8); bump('safety', 8); break;
      case 'lottery': bump('tax', 30); bump('lifestyle', 14); bump('safety', 10); bump('health', 8); break;
      default: bump('tax', 4);
    }
    switch (st.climate) {
      case 'green': bump('environment', 22); break;
      case 'lake': bump('lifestyle', 12); bump('environment', 10); break;
      case 'resilient': bump('environment', 26); bump('health', 8); break;
      case 'cool': bump('environment', 10); break;
      case 'mild': bump('environment', 8); break;
    }
    if (st.mobilityPlus) bump('mobility', 12); // v2 extra: hub-airport/city access matters
    if (st.coast) bump('coast', 24);          // v2 extra: sea access
    var sum = 0, k; for (k in w) sum += w[k];
    var nw = {};
    for (k in w) { var v = Math.round(w[k] / sum * 100); if (v > 0) nw[k] = v; }
    if (!Object.keys(nw).length) nw = { jobs: 20, lifestyle: 15, safety: 15, affordability: 15, foundation: 15, commuter_access: 10, health: 5, tax: 5 };
    return { name: 'My guided fit', desc: 'Custom guided profile built from your answers.', weights: nw, strict: {}, minPop: minPop, access: access, builderStrict: strict };
  };

  Engine.prototype.cosineMatches = function (weights, country, n) {
    var dims = this.cfg.builder.dims.concat(this.method === 'v1' ? [] : ['mobility']), self = this;
    function vec(w) { return dims.map(function (d) { return w[d] || 0; }); }
    function cos(a, b) { var d = 0, x = 0, y = 0; for (var i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : 0; }
    var u = vec(weights);
    return this.cfg.builder.standardKeys.filter(function (k) { return self.profiles[k]; }).map(function (k) {
      return [k, cos(u, vec(self.weightsFor({ country: country }, k)))];
    }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, n || 3);
  };

  Engine.METHOD_V2 = METHOD_V2;
  Engine.LOTTERY = LOTTERY;
  return Engine;
});
