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

  function Engine(meta, opts) {
    opts = opts || {};
    this.method = opts.method || 'v2';
    this.meta = meta;
    this.cfg = meta.config;
    this.profiles = JSON.parse(JSON.stringify(this.cfg.profiles));
    if (this.method === 'v1') delete this.profiles.coastal;
    var self = this;
    // allFactors: legacy rule (scored or category access); v1 excludes the new geo factors
    this.allFactors = meta.factors.filter(function (f) {
      if (self.method === 'v1' && /^geo_/.test(f.id)) return false;
      return f.score_role === 'scored' || f.category === 'access';
    });
    this.factorById = {};
    meta.factors.forEach(function (f) { self.factorById[f.id] = f; });
    this.factorIdsByCat = {};
    this.allFactors.forEach(function (f) {
      if (f.category !== 'access') (self.factorIdsByCat[f.category] = self.factorIdsByCat[f.category] || []).push(f.id);
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
      var catch30 = fs.geo_catchment_30km;
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
      for (var k in out) if (!fin(out[k])) delete out[k];
    }
    var fsr = r.factorScores || {};
    var commute = fsr.commuter_major_city_access != null ? fsr.commuter_major_city_access : this.derivedAccess(r, 'commuter');
    var campus = fsr.student_campus_access != null ? fsr.student_campus_access : this.derivedAccess(r, 'student');
    if (fin(commute)) out.commuter_access = commute;
    if (fin(campus)) out.student_access = campus;
    r._cats = out; r._catsM = this.method;
    return out;
  };

  Engine.prototype.weightsFor = function (r, key) {
    if (key === LOTTERY && r && r.country !== 'CH') return this.cfg.europeLotteryWeights;
    var p = this.profiles[key];
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
    var cats = this.categories(r), w = this.weightsFor(r, key), num = 0, den = 0, total = 0, c;
    for (c in w) { total += w[c]; if (fin(cats[c])) { num += cats[c] * w[c]; den += w[c]; } }
    if (!den) return null;
    var score = num / den;
    total = total || den;
    var coverage = Math.round((den / total) * 100);
    if (key === LOTTERY) score = this.softLotteryPenalty(score, cats, r);
    else { var m = p.min || {}; for (c in m) if (fin(cats[c]) && cats[c] < m[c]) score = Math.min(score, 55 + cats[c] * 0.45); }
    if (r.country !== 'CH') {
      var sourceCount = Number(r.availableFactorCount || Object.keys(r.factorScores || {}).length || 0);
      if (this.method !== 'v1') sourceCount = Number(r.availableFactorCount || 0) + (r.geoFactorCount || 0);
      var accessBonus = this.usesAccess(key, country) && (fin(cats.commuter_access) || fin(cats.student_access)) ? 10 : 0;
      coverage = Math.max(coverage, Math.min(78, Math.round(sourceCount * 9 + accessBonus)));
      score = score * (0.8 + 0.2 * (coverage / 100));
    }
    var floor = key === LOTTERY ? (r.country === 'CH' ? 12 : 6) : (r.country === 'CH' ? minCoverage : 8);
    if (coverage < floor) return null;
    return { score: score, coverage: coverage, cats: cats };
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
    if (key === LOTTERY) return '';
    var cats = this.categories(r), c;
    if (p.minPop && r.population < p.minPop) return 'population floor';
    if (r.country !== 'CH') {
      if (this.usesAccess(key, country)) {
        var k = key === 'student' ? 'student_access' : 'commuter_access', min = key === 'student' ? 18 : 12;
        if (fin(cats[k]) && cats[k] < min) return this.shortCat(k) + ' floor';
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
      if (!fin(cats[c]) || cats[c] < strict[c]) return this.shortCat(c) + ' floor';
    }
    return '';
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
      out.push({ r: r, id: r.id, overall: s.score, coverage: s.coverage, catScores: s.cats, sourceConfidence: r.sourceConfidence, _i: i });
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
      for (var k in c) if (k !== 'commuter_access' && k !== 'student_access') vals.push(c[k]);
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
