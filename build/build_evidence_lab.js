// Nestlyzer Evidence Lab (2.15.16). For every country and every public profile it asks one question: do the places the
// model ranks high also show what the real world says? Two observed outcomes, both measured, never scored by us:
//   households  -> people voting with their feet: population growth 2019-2024 (common_population_growth_5y)
//   businesses  -> firms voting with their feet: where that industry already operates (cluster_<profile>)
// Output data/evidence/lab.json (small, committed): Spearman agreement per country x profile, the share of the model's
// top 10% that is also growing / already a cluster, and the strongest disagreements. Nothing here changes a score.
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..');
const D = require(path.join(ROOT, 'src/data.js')), E = require(path.join(ROOT, 'src/engine.js'));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json')));
const eng = new E(meta, {}), cfg = meta.config;
const dormant = new Set([...(cfg.hhDormant || []), ...(cfg.bizDormant || [])]);
const profiles = Object.keys(cfg.profiles).filter((k) => !dormant.has(k) && !cfg.profiles[k].disabled && k !== 'self_fit' && k !== 'swiss_lottery');
const NM = { kg: 1, lake: 1, river: 1, port: 1, iport: 1, mport: 1, chem: 1, border: 1, metro: 1, land: 1, sea: 1, shore: 1 };
const fin = Number.isFinite;
function ranks(v) { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2; i = j + 1; } return r; }
function spearman(a, b) { const ra = ranks(a), rb = ranks(b), n = a.length, ma = (n - 1) / 2; let s = 0, sa = 0, sb = 0; for (let i = 0; i < n; i++) { s += (ra[i] - ma) * (rb[i] - ma); sa += (ra[i] - ma) ** 2; sb += (rb[i] - ma) ** 2; } return sa && sb ? s / Math.sqrt(sa * sb) : null; }
// 2.15.19 explanation of a disagreement, built only from the place's own category scores (never invented):
// 'high' = model ranks it high but the outcome is weak -> name its weakest relevant categories (likely reasons to leave);
// 'low'  = model ranks it low but the outcome is strong -> name its strongest categories (what attracts people or firms)
const LBL = meta.categoryLabels || {};
function explain(r, p, biz, kind) {
  const c = eng.categoriesFor(r, p), ks = ['jobs', 'mobility', 'services', 'affordability', 'demographics', 'family', 'health', 'safety', 'lifestyle', 'city', 'climate', 'environment', 'tax', 'logistics', 'talent', 'energy']
    .filter((k) => fin(c[k]));
  if (!ks.length) return '';
  ks.sort((a, b) => kind === 'high' ? c[a] - c[b] : c[b] - c[a]);
  return ks.slice(0, 2).map((k) => (LBL[k] || k).replace(/ \(.*$/, '') + ' ' + Math.round(c[k])).join(', ');
}
const out = { version: 1, built: new Date().toISOString().slice(0, 10), outcomes: {
  households: 'Population growth 2019 to 2024 (official population counts): where people actually move to or stay.',
  business: 'Existing presence of that industry in and around the place (official business and employment registers): where firms of this kind already operate.' },
  note: 'Agreement, not proof. Growth also reflects new housing supply; an industry cluster also reflects history. A strong disagreement is a question to check, not an error.', countries: {} };
for (const c of meta.countries) {
  const all = D.hydrate(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/c', c.cc + '.json'))));
  const xp = path.join(ROOT, 'data/x', c.cc + '.json'), xs = fs.existsSync(xp) ? JSON.parse(fs.readFileSync(xp)) : null;
  if (xs) all.forEach((r, i) => { const o = {}; for (const k in xs.cols) { const v = xs.cols[k][i]; if (v != null) o[k] = NM[k] ? xs.strs[v] : v; } r.x = o; });
  const scope = all.filter((r) => !r.superseded);
  const C = out.countries[c.cc] = {};
  for (const p of profiles) {
    const biz = !!cfg.profiles[p].business, oid = biz ? 'cluster_' + p : 'common_population_growth_5y';
    const res = eng.rank(scope, p, { country: c.cc, subRanks: false }).scored;
    const ob = (r) => { const fs0 = r.factorScores || {}, fr0 = r.factorRaw || {};
      if (biz) return fs0[oid];
      for (const k of ['common_population_growth_5y', 'population_growth_pct']) { if (fin(fr0[k])) return fr0[k]; if (fin(fs0[k])) return fs0[k]; }
      if (r.trend && fin(r.trend.population_5y_pct)) return r.trend.population_5y_pct;
      return null; };
    const pairs = res.map((s, i) => [s.overall ?? s.score, ob(s.r), s.r, i]).filter((x) => fin(x[0]) && fin(x[1]));
    if (pairs.length < 30) { C[p] = { n: pairs.length }; continue; }
    const rho = spearman(pairs.map((x) => x[0]), pairs.map((x) => x[1]));
    const vals = pairs.map((x) => x[1]).sort((a, b) => a - b), q = (f) => vals[Math.floor(f * (vals.length - 1))];
    const hi = q(0.6), lo = q(0.2), top = pairs.slice(0, Math.max(10, Math.ceil(pairs.length / 10)));
    const confirm = top.filter((x) => x[1] >= hi).length / top.length, contra = top.filter((x) => x[1] <= lo);
    C[p] = { n: pairs.length, rho: Math.round(rho * 100) / 100, topConfirm: Math.round(confirm * 100), topContra: Math.round(contra.length / top.length * 100),
      flags: contra.slice(0, 5).map((x) => [x[2].id, x[2].name, x[3] + 1, Math.round(x[1] * 10) / 10, explain(x[2], p, biz, 'high')]),
      // the opposite surprise: ranked in the bottom half, yet among the fastest-growing places / an established location
      surprises: pairs.slice(Math.floor(pairs.length / 2)).filter((x) => x[1] >= q(0.9)).slice(0, 3).map((x) => [x[2].id, x[2].name, x[3] + 1, Math.round(x[1] * 10) / 10, explain(x[2], p, biz, 'low')]) };
  }
  process.stdout.write(c.cc + ' ');
}
fs.writeFileSync(path.join(ROOT, 'data/evidence/lab.json'), JSON.stringify(out));
console.log('\nevidence lab:', Object.keys(out.countries).length, 'countries,', profiles.length, 'profiles');
