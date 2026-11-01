/* Global and continental rankings, two-level model (2.11).
   A country ranking scores a place against the rest of its own country, so its scores cannot be sorted across countries.
   The cross-country score therefore has two levels per category:
     national level  N: the country's standing on comparable national figures (data/national.json, 0-100 across the
                        45 countries: World Bank WDI, Transparency International, V-Dem, Women Business and the Law, ND-GAIN)
     place level     L: the place's own category score inside its country, from the same engine and data as the country
                        ranking (local, regional and national measures)
     global category score = alpha x N + (1 - alpha) x L
   alpha is the share of the category that differs mainly between countries (safety and health mostly national, access and
   lifestyle mostly local). Where a measure is already absolute and comparable (distances, residents within 100 km,
   terrain), it is re-scored across the whole scope instead. Only places that pass the profile's requirements in their
   own country are ranked; criteria without a value are left out and at least 60% of the profile's weight must be scored.
   Output: data/rank/global.json (top 100 per profile and scope); NZ_BENCH=1 also writes the full ranks to
   build/.cache/global_full.json for the benchmark (tests/rank_benchmark.py).
   node build/build_global_rank.js */
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..');
const D = require(path.join(ROOT, 'src/data.js')), E = require(path.join(ROOT, 'src/engine.js'));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json')));
const NAT = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/national.json')));
const eng = new E(meta, {});
const CONT = { americas: ['US', 'CA', 'BR', 'MX'], asia_pacific: ['JP', 'KR', 'TW', 'SG', 'HK', 'AU', 'NZ', 'IL', 'MY', 'ID', 'IN', 'CN', 'AE'], africa: ['MA', 'ZA'] };
// Africa has no scope of its own yet: Morocco and South Africa rank in the world list
const contOf = (cc) => CONT.americas.includes(cc) ? 'americas' : CONT.asia_pacific.includes(cc) ? 'asia_pacific' : CONT.africa.includes(cc) ? 'africa' : 'europe';
// company sites: the national part of 'site fit' is labour cost for cost-driven sites and talent for skills-driven ones
const TALENT = { biz_tech: 1, biz_lab: 1, biz_hq: 1, biz_services: 1, biz_pharma_production: 1, biz_finance: 1, biz_semis: 1, biz_aero: 1, biz_media: 1 };
const ALPHA = { focus: 0.5,  safety: 0.6, health: 0.6, governance: 0.6, jobs: 0.5, affordability: 0.5, environment: 0.4, family: 0.4, foundation: 0.35, mobility: 0.25, freight: 0.25 };
// a country without a national figure for a category gets the median country (no gain from a gap, no penalty)
const MED = {}; for (const ck of Object.keys(ALPHA)) { const v = Object.values(NAT.countries).map((c) => c.cats[ck]).filter((x) => x != null).sort((a, b) => a - b); if (v.length) MED[ck] = v[Math.floor(v.length / 2)]; }
/* 2.13 business climate: what companies weigh between countries (owner's list, 1 Nov 2026) as national levels from
   data/national.json, mixed per kind of site. Key drivers carry the larger weights (★ in the method page). It is a
   quarter of a business site's cross-country score; inside a country it is the same for every place. */
const BCF = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/source/bizclimate_mix.json')));   // 2.13: one source for the mixes (also the app and the insights pages)
const BC_KEYS = BCF.keys, BC_DEFAULT = BCF.default, BC_MIX = BCF.mix, BC_SHARE = BCF.share;
const BC_MED = {}; for (const ck of BC_KEYS) { const v = Object.values(NAT.countries).map((c) => c.cats[ck]).filter((x) => x != null).sort((a, b) => a - b); if (v.length) BC_MED[ck] = v[Math.floor(v.length / 2)]; }
function bizClimate(cc, k) { const mix = BC_MIX[k] || BC_DEFAULT, C = (NAT.countries[cc] || {}).cats || {}; let n = 0, d = 0; for (const ck in mix) { const v = C[ck] != null ? C[ck] : BC_MED[ck]; if (v != null) { n += mix[ck] * v; d += mix[ck]; } } return d ? n / d : null; }
const ABS = { reach: 'reach100k', reach300: 'reach300k', flatland: 'relief' };   // within-country percentiles replaced by the absolute measure, re-scored across the scope
const NM = { kg: 1, lake: 1, river: 1, port: 1, iport: 1, mport: 1, chem: 1, fin: 1, border: 1, metro: 1, land: 1, sea: 1, tz: 1, shore: 1 };
const GMIN_HOME = 10000;
/* 2.12: the place level is the place's standing in its country on a normal scale (z score), not its rank percentile.
   A percentile gives the best place of a small country the same 100 as the best of 4,000 US places, so whichever country
   has the better national figures filled a continental top 100 on its own (Americas: 100 of 100 Canadian). On the z scale
   the top 1% of a large country sits further out than the top 30% of a small one, and the national standing shifts each
   country's whole distribution; tails therefore reflect both the country and how exceptional the place is within it. */
function probit(p) { const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239], b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771909, -13.28068155288572], c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416], pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) return -probit(1 - p);
  const q = p - 0.5, r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
const LSD = +(process.env.NZ_LSD || 18), LZ = (p) => 50 + LSD * probit(Math.min(0.9999, Math.max(0.0001, p)));
const dormant = new Set(meta.config.bizDormant || []);
const profiles = Object.entries(meta.config.profiles).filter(([k, p]) => p.weights && k !== 'self_fit' && k !== 'swiss_lottery' && !dormant.has(k));
const rows = {}, CTRY = {};   // profile -> [{id, name, cc, cont, pop, cats}]
for (const c of meta.countries) {
  const all = D.hydrate(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/c', c.cc + '.json'))));
  const xp = path.join(ROOT, 'data/x', c.cc + '.json'), xs = fs.existsSync(xp) ? JSON.parse(fs.readFileSync(xp)) : null;
  if (xs) all.forEach((r, i) => { const o = {}; for (const k in xs.cols) { const v = xs.cols[k][i]; if (v != null) o[k] = NM[k] ? xs.strs[v] : v; } r.x = o; });
  const scope = all.filter((r) => !r.superseded && !r.whole);
  for (const [k, pr] of profiles) {
    const res = eng.rank(scope, k, { country: c.cc, subRanks: false });
    const list = rows[k] = rows[k] || [];
    if (process.env.NZ_BENCH) ((CTRY[k] = CTRY[k] || {})[c.cc] = res.scored.map((s) => s.r.name));
    const nS = res.scored.length;
    res.scored.forEach((s, i) => { s._pct = nS > 1 ? 100 * (1 - i / (nS - 1)) : 100; s._L = LZ(nS ? (nS - i - 0.5) / nS : 0.5); });
    for (const s of res.scored) {
      const r = s.r, pop = r.population || r.popNow || 0;
      if (!pr.business && pop < GMIN_HOME) continue;
      const cats = Object.assign({}, eng.categoriesFor(r, k));
      list.push({ id: r.id, name: r.name, cc: c.cc, cont: contOf(c.cc), pop, cats, P: s._pct, L: s._L, ax: { reach300: r.x && r.x.reach300k, reach: r.x && r.x.reach100k, flatland: r.x && r.x.relief != null ? -r.x.relief : null } });
    }
  }
  process.stdout.write(c.cc + ' ');
}
function pctMap(list, get) {   // mean-rank percentile across the scope
  const xs = list.filter((p) => get(p) != null && isFinite(get(p))).sort((a, b) => get(a) - get(b)), n = xs.length, out = new Map();
  for (let i = 0; i < n;) { let j = i; while (j + 1 < n && get(xs[j + 1]) === get(xs[i])) j++; const q = n > 1 ? ((i + j) / 2) / (n - 1) * 100 : 50; for (let k = i; k <= j; k++) out.set(xs[k].id, q); i = j + 1; }
  return out;
}
const SC = { world: () => true, europe: (p) => p.cont === 'europe', americas: (p) => p.cont === 'americas', asia_pacific: (p) => p.cont === 'asia_pacific' };
const res = { bizClimate: { keys: BC_KEYS, mix: BC_MIX, default: BC_DEFAULT, share: BC_SHARE }, version: 2, method: 'Two levels per category: the country\'s standing on comparable national figures (alpha) and the place\'s own score inside its country (1 - alpha); absolute measures (residents within 100 km, terrain) re-scored across the scope. Only places that meet the profile\'s requirements in their own country; at least 60% of the profile weight scored.',
  alpha: ALPHA, national: Object.fromEntries(Object.entries(NAT.countries).map(([cc, v]) => [cc, v.cats])), scopes: {} };
const full = {};
for (const [sk, inScope] of Object.entries(SC)) {
  res.scopes[sk] = { profiles: {} };
  for (const [k, pr] of profiles) {
    const list = (rows[k] || []).filter(inScope), w = eng.weightsFor(null, k), tot = Object.values(w).reduce((a, b) => a + b, 0);
    const absP = {}; for (const ck in ABS) if (w[ck]) absP[ck] = pctMap(list, (p) => p.ax[ck]);
    const out = [];
    // national level for this profile (profile weights over the categories with a national figure) and its share alpha
    const ABSCAT = { outdoor: 1, border: 1, finhub: 1, insurhub: 1, fundhub: 1, commodhub: 1, cryptohub: 1, wealthhub: 1, reach300: 1, portaccess: 1, chempark: 1, freight: 1, reach: 1, flatland: 1, climate: 1, services: 1, coast: 1 };   // absolute and comparable everywhere
    let aW = 0, bW = 0; for (const ck in w) { if (ABSCAT[ck]) bW += w[ck]; else if (ALPHA[ck]) aW += w[ck] * ALPHA[ck]; }
    for (const p of list) {
      const NC0 = (NAT.countries[p.cc] || {}).cats || {}, NC = Object.assign({}, NC0);
      if (pr.business) NC.focus = TALENT[k] ? NC0.focus_talent : NC0.focus_cost; else delete NC.focus;
      let nN = 0, nD = 0, aEff = 0, gN = 0, gD = 0;
      for (const ck in w) {
        if (ABSCAT[ck]) { let G = absP[ck] ? absP[ck].get(p.id) : p.cats[ck]; if (G != null && isFinite(G)) { gN += w[ck] * G; gD += w[ck]; } continue; }
        if (ALPHA[ck] && (NC[ck] != null || MED[ck] != null)) { nN += w[ck] * (NC[ck] != null ? NC[ck] : MED[ck]); nD += w[ck]; aEff += w[ck] * ALPHA[ck]; }
      }
      const alpha = aEff / tot, beta = gD / tot, N = nD ? nN / nD : null, A = gD ? gN / gD : null;
      if (p.P == null) continue;
      let score = (N != null ? alpha * N : 0) + (A != null ? beta * A : 0) + (1 - (N != null ? alpha : 0) - (A != null ? beta : 0)) * p.L;
      const BC = pr.business ? bizClimate(p.cc, k) : null; if (BC != null) score = (1 - BC_SHARE) * score + BC_SHARE * BC;
      out.push([p.id, p.name, Math.round(score * 10) / 10, Math.round(p.P), Math.round((N != null ? alpha : 0) * 100), Math.round((A != null ? beta : 0) * 100)]);
    }
    out.sort((a, b) => b[2] - a[2] || b[3] - a[3]);   // row: id, name, score, in-country percentile, national share %, absolute-measure share %
    res.scopes[sk].profiles[k] = { ranked: out.length, top: out.slice(0, 100) };
    res.scopes[sk].places = Math.max(res.scopes[sk].places || 0, out.length);
    res.scopes[sk].countries = [...new Set(list.map((p) => p.cc))].length;
    if (process.env.NZ_BENCH) (full[sk] = full[sk] || {})[k] = out.map((o) => [o[0], o[1], o[2]]);
  }
}
fs.mkdirSync(path.join(ROOT, 'data/rank'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data/rank/global.json'), JSON.stringify(res));
// one file per scope for the app, so opening Europe does not load the world list as well
for (const sk of Object.keys(res.scopes)) fs.writeFileSync(path.join(ROOT, 'data/rank', sk + '.json'), JSON.stringify({ version: res.version, method: res.method, scope: sk, profiles: res.scopes[sk].profiles }));
if (process.env.NZ_BENCH) { fs.mkdirSync(path.join(ROOT, 'build/.cache'), { recursive: true }); full.country = CTRY; fs.writeFileSync(path.join(ROOT, 'build/.cache/global_full.json'), JSON.stringify(full)); }
console.log('\nglobal rank v2', Object.entries(res.scopes).map(([k, v]) => k + ': young_family ' + (v.profiles.young_family || {}).ranked + ', logistics ' + (v.profiles.biz_logistics || {}).ranked).join('; '), (fs.statSync(path.join(ROOT, 'data/rank/global.json')).size / 1024).toFixed(0) + ' KB');
