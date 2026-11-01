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
    port_km: function (r) { return (r.x || {}).port_km; }, anyport_km: function (r) { return portKm(r.x || {}); }, dens: function (r) { return fin(r.density) ? r.density : (r.x && fin(r.x.pop10) ? r.x.pop10 / 314.16 : null); }, border_km: function (r) { return (r.x || {}).border_km; },
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
  function Engine(meta, opts) {
    opts = opts || {};
    this.method = opts.method || 'v2';
    this.evidence = opts.evidence || 'legacy';   // 'weighted' = true weighted share (NZ-GLOBAL-049), prepared; switch only after the owner approves (docs/rank_change_*.json)
    this.meta = meta;
    this.cfg = meta.config;
    this.profiles = JSON.parse(JSON.stringify(this.cfg.profiles));
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

  Engine.prototype.categories = function (r) {
    if (r._cats && r._catsM === this.method) return r._cats;
    var out = {}, cats = Object.keys(this.factorIdsByCat);
    for (var i = 0; i < cats.length; i++) {
      var v = this.categoryScore(r, cats[i]);
      if (fin(v)) out[cats[i]] = v;
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
      if (!fin(out.affordability)) out.affordability = avgFinite([calm, density]);
      if (!fin(out.family)) out.family = avgFinite([youth, growth, calm]);
      if (!fin(out.health)) out.health = avgFinite([elderly]);
      for (var nk in natl) out[nk] = fin(out[nk]) ? (out[nk] + natl[nk]) / 2 : natl[nk];
      for (var k in out) if (!fin(out[k])) delete out[k];
      // categories without their own measures here are stand-ins (e.g. costs estimated from density); the app labels them
      var px = null; for (var pk in out) if (!real[pk] && PROXY_NOTE[pk]) (px = px || {})[pk] = natl[pk] != null ? 'national price level combined with a model ' + PROXY_NOTE[pk].replace('modelled ', '') : PROXY_NOTE[pk];
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
    var pkm = portKm(xx); if (fin(pkm)) out.portaccess = lin(pkm, 2, 40);   // right at a major sea or inland port
    if (fin(xx.flat_pct)) out.flatland = xx.flat_pct;
    if (fin(xx.chem_km)) out.chempark = lin(xx.chem_km, 3, 40);
    // financial centres by role, 0-100 within commuting distance (2.12, build_reach.py): banking, insurance, funds,
    // commodity trading and gold, crypto, private wealth
    // outdoor (2.12): terrain relief (100 from 1,200 m of relief within reach) and water nearby; border: a national border within a short drive
    var rel = fin(xx.relief) ? Math.max(0, Math.min(100, (Math.log10(Math.max(1, xx.relief)) - 1.7) / (3.08 - 1.7) * 100)) : null, ck0 = (r.factorRaw || {}).geo_coast_km, wat = Math.max(fin(xx.lake_km) ? lin(xx.lake_km, 1, 25) : 0, fin(ck0) ? lin(ck0, 1, 25) : 0);
    if (fin(rel)) out.outdoor = 0.65 * rel + 0.35 * wat;
    if (fin(xx.xb_s)) out.border = xx.xb_s; else if (fin(xx.border_km)) out.border = lin(xx.border_km, 3, 45);   // a border counts where the neighbour pays more (build_reach.py)
    var fany = Math.max(xx.fin_s || 0, xx.ins_s || 0, xx.fund_s || 0, xx.com_s || 0, xx.cry_s || 0, xx.wlth_s || 0); if (fin(xx.fin_s)) out.finhub = fany;   // where finance clusters: the best centre for any role (2.12) if (fin(xx.ins_s)) out.insurhub = xx.ins_s; if (fin(xx.fund_s)) out.fundhub = xx.fund_s;
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
    r._cats = out; r._catsM = this.method;
    return out;
  };

  /* a business profile can add its own 'focus' criterion: a weighted mix of factor scores, for example the local share of
     jobs in its industry. A negative weight prefers low values (for example lower wages for a back office). */
  Engine.prototype.focusScore = function (r, p) {
    var fs = r.factorScores || {}, num = 0, den = 0, f, v, w;
    for (f in p.focus) { v = fs[f]; w = p.focus[f]; if (!fin(v) || !w) continue; num += (w < 0 ? 100 - v : v) * Math.abs(w); den += Math.abs(w); }
    return den ? num / den : null;
  };
  Engine.prototype.categoriesFor = function (r, key) {
    var cats = this.categories(r), p = this.profiles[key];
    // what this group dislikes nearby (2.11.3): noise, heavy industry, flooding and heat, crowding, steep terrain, dirty air
    var nz = p && p.avoid && p.avoid.length && this.method !== 'v1' ? this.nuisances(r, p.avoid) : null;
    if (!p || (!p.focus && !nz)) return cats;
    var out = {}; for (var k in cats) out[k] = cats[k];
    if (nz) out.quiet = nz.score;
    if (p.focus) {
      var fv = this.focusScore(r, p); if (fin(fv)) out.focus = fv;
      // industry cluster of this kind of site (build_clusters.py): where similar companies already operate
      var cl = (r.factorScores || {})['cluster_' + key]; if (fin(cl)) out.cluster = cl;
    }
    return out;
  };
  Engine.prototype.weightsFor = function (r, key) {
    if (key === LOTTERY && r && r.country !== 'CH') return this.cfg.europeLotteryWeights;
    var p = this.profiles[key];
    // the audited legacy method (v1) keeps a profile's original weights where they were changed later (weightsV1)
    if (p && this.method === 'v1' && p.weightsV1) return p.weightsV1;
    return (p && p.weights) || {};
  };
  Engine.prototype.usesAccess = function (key, country) {
    if (key === LOTTERY && country !== 'CH') return true;
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
  Engine.prototype.scoreRaw = function (r, key, minCoverage, country) {
    if (minCoverage == null) minCoverage = 55;
    country = country || r.country;
    var p = this.profiles[key];
    if (!p || p.disabled) return null;
    var cats = this.categoriesFor(r, key), w = this.weightsFor(r, key), num = 0, den = 0, total = 0, c;
    // stand-in categories (no measured data for this place) count half, so measured evidence leads the ranking
    var px = r._proxy || {}, wc, have = 0, meas = 0;
    for (c in w) { total += w[c]; if (fin(cats[c])) { have += w[c]; if (!px[c]) meas += w[c]; wc = px[c] && this.method !== 'v1' ? w[c] * 0.5 : w[c]; num += cats[c] * wc; den += wc; } }
    if (!den) return null;
    var score = num / den;
    total = total || den;
    var coverage = Math.round((den / total) * 100);
    if (key === LOTTERY) score = this.softLotteryPenalty(score, cats, r);
    else { var m = p.min || {}; for (c in m) if (fin(cats[c]) && cats[c] < m[c]) score = Math.min(score, 55 + cats[c] * 0.45); }
    /* a weak core need is not made up for by strengths elsewhere (2.11.3): every category that carries 15% or more of the
       weight costs 1.5 x its share for each point under 50 (measured values only; legacy method unchanged) */
    if (this.method !== 'v1' && key !== LOTTERY && r.country === 'CH') { var st0 = p.strict || {}; for (c in st0) if (c !== 'foundation' && c !== 'coast' && fin(cats[c]) && cats[c] < st0[c]) score -= (st0[c] - cats[c]) * 0.5; }
    if (this.method !== 'v1' && key !== LOTTERY) { var tw0 = 0, pen = 0; for (c in w) tw0 += w[c]; for (c in w) if (w[c] / tw0 >= 0.15 && fin(cats[c]) && cats[c] < 50 && !px[c]) pen += w[c] / tw0 * (50 - cats[c]) * 1.5; score = Math.max(0, score - pen); }
    if (r.country !== 'CH') {
      var sourceCount = Number(r.availableFactorCount || Object.keys(r.factorScores || {}).length || 0);
      if (this.method !== 'v1') sourceCount = Number(r.availableFactorCount || 0) + (r.geoFactorCount || 0);
      var accessBonus = this.usesAccess(key, country) && (fin(cats.commuter_access) || fin(cats.student_access)) ? 10 : 0;
      if (this.evidence !== 'weighted') coverage = Math.max(coverage, Math.min(78, Math.round(sourceCount * 9 + accessBonus)));
      score = score * (0.8 + 0.2 * (coverage / 100));
    }
    var floor = key === LOTTERY ? (r.country === 'CH' ? 12 : 6) : (r.country === 'CH' ? minCoverage : 8);
    if (coverage < floor) return null;
    /* coverage above is the legacy ranking input (count-based floor outside Switzerland, kept so rankings do not change
       silently). What users see is `weighted`: the share of this profile's weight whose category has a value, and
       `measured`: the part of it backed by measured data rather than an estimate (NZ-GLOBAL-049). */
    var tw = 0; for (c in w) tw += w[c];
    return { score: score, coverage: coverage, weighted: tw ? Math.round(have / tw * 100) : 0, measured: tw ? Math.round(meas / tw * 100) : 0, cats: cats };
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
    if (key === LOTTERY) return '';
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
        var k = key === 'student' ? 'student_access' : 'commuter_access', min = key === 'student' ? 18 : 12;
        // the commute floor is for commute-centred profiles; a family profile that also weighs the commute must not drop
        // whole countries without a large job centre (Malta, Liechtenstein) (2.11; legacy method unchanged)
        var wacc = this.weightsFor(r, key)[k] || 0;
        if (fin(cats[k]) && cats[k] < min && (this.method === 'v1' || k === 'student_access' || wacc >= 20)) return this.shortCat(k) + ' floor';
      }
      if (key === 'coastal' && this.method !== 'v1') {
        if (!fin(cats.coast) || cats.coast < p.strict.coast) return 'coast floor';
      }
      // v63 wrapper
      var gate = this.cfg.europeAccessGates[key];
      if (gate) {
        var v = cats[gate[0]];
        if (!fin(v) || v < gate[1]) return 'regional access floor';
      }
      if (this.method !== 'v1' && SERVICE_CATCHMENT[key]) {
        var c30 = (r.factorRaw || {}).geo_catchment_30km;
        if (!fin(c30) || c30 < 50000) return 'daily-services catchment floor';
      }
      if (key === 'student' && r.population < 9000 && !(cats.student_access >= 78)) return 'campus scale floor';
      if (key === 'car_free' && r.population < 6000 && !(cats.commuter_access >= 75)) return 'daily-service floor';
      return '';
    }
    var strict = p.strict || {};
    for (c in strict) {
      if (c === 'foundation' && this.method !== 'v1' && URBAN_NO_FOUNDATION_FLOOR[key]) continue;
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
    crowd: function (r, x) { var v = (r.factorRaw || {}).geo_density10_km2; return fin(v) ? [v > 4000 ? 60 : v > 1500 ? 60 * (v - 1500) / 2500 : 0, v] : null; },
    steep: function (r, x) { var v = x.relief; return fin(v) ? [v > 900 ? 60 : v > 400 ? 60 * (v - 400) / 500 : 0, v] : null; },
    air_quality: function (r, x) { var s = (r.factorScores || {}).n_pm25; return fin(s) ? [Math.max(0, 50 - s), s] : null; }
  };
  Engine.prototype.nuisances = function (r, list) {
    var x = r.x || {}, hits = [], any = false, mx = 0, sum = 0;
    (list || []).forEach(function (k) { var f = NZ_RULES[k], v = f && f(r, x); if (!v) return; any = true; var pen = Math.round(v[0]); if (pen > 0) hits.push({ k: k, pen: pen, d: v[1] }); mx = Math.max(mx, pen); sum += pen; });
    if (!any) return null;
    return { score: Math.max(0, Math.round(100 - Math.min(100, mx + 0.5 * (sum - mx)))), hits: hits.sort(function (a, b) { return b.pen - a.pen; }) };
  };

  Engine.prototype.factorValue = function (r, f) {
    var v = (r.factorScores || {})[f.id];
    if (f.id === 'commuter_major_city_access' && v == null) v = this.derivedAccess(r, 'commuter');
    if (f.id === 'student_campus_access' && v == null) v = this.derivedAccess(r, 'student');
    return v;
  };

  /* Rank a scope. Returns {scored, categoryRanks, factorRanks, reasons}. Input order = tie order (legacy). */
  Engine.prototype.rank = function (scope, key, opts) {
    opts = opts || {};
    var country = opts.country, out = [], reasons = {}, self = this;
    for (var i = 0; i < scope.length; i++) {
      var r = scope[i];
      var s = this.scoreRaw(r, key, 55, country);
      if (!s) { reasons['coverage'] = (reasons['coverage'] || 0) + 1; continue; }
      var why = this.eligibilityFail(r, key, country);
      if (why) { reasons[why] = (reasons[why] || 0) + 1; continue; }
      out.push({ r: r, id: r.id, overall: s.score, coverage: s.coverage, weighted: s.weighted, measured: s.measured, catScores: s.cats, sourceConfidence: r.sourceConfidence, _i: i, must: this.profiles[key].must ? this.mustStatus(r, this.profiles[key]) : null });
    }
    out.sort(function (a, b) { return (b.overall - a.overall) || (b.sourceConfidence - a.sourceConfidence) || (a._i - b._i); });
    out.forEach(function (x, i) { x.rank = i + 1; });
    var res = { scored: out, reasons: reasons, categoryRanks: {}, factorRanks: {} };
    if (opts.subRanks !== false) this.computeRanks(res);
    return res;
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
    this.allFactors.forEach(function (f) {
      var v = new Array(n), any = false;
      for (var i = 0; i < n; i++) { v[i] = self.factorValue(sc[i].r, f); if (fin(v[i])) any = true; }
      if (any) { var m = rankBy(v); if (m) res.factorRanks[f.id] = m; }
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
