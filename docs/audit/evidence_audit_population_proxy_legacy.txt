/* Nestlyzer 2.13.3 evidence audit: do people actually move to the places a household profile ranks highest?
   Out-of-sample check (neither figure is in these profiles' weights): five-year population change of the place
   (Eurostat GISCO LAU 2019-2024) and net migration of its region (Eurostat NUTS3), for the top 30 of each country
   against the country's ranked places as a whole. Writes docs/audit/evidence_audit.json (NZ_ALL=1: evidence_audit_all.json).
     node tests/evidence_audit.js */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), E = require(ROOT + '/src/engine.js'), D = require(ROOT + '/src/data.js');
const meta = JSON.parse(fs.readFileSync(ROOT + '/data/meta.json')), eng = new E(meta, { method: 'v2' });
const HH = Object.entries(meta.config.profiles).filter(([k, p]) => p.weights && !p.business && !/^biz_/.test(k) && k !== 'self_fit' && k !== 'swiss_lottery').map(([k]) => k);
const med = (a) => { a = a.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
const out = { version: JSON.parse(fs.readFileSync(ROOT + '/package.json')).version, mode: process.env.NZ_ALL ? 'all profiles; profiles that weigh population change are in-sample (circular)' : 'out-of-sample only: profiles that weigh population change are left out', scope: 'Top 30 per country and household profile vs all ranked places of that country; countries with at least 150 places carrying the five-year change.', profiles: {}, countries: {} };
const agg = {};
for (const c of meta.countries) {
  const all = D.hydrate(JSON.parse(fs.readFileSync(ROOT + '/data/c/' + c.cc + '.json'))).filter((r) => !r.superseded && !r.whole);
  const g = (r) => (r.factorRaw || {}).common_population_growth_5y, m = (r) => (r.factorRaw || {}).n_net_migration_region;
  if (all.filter((r) => Number.isFinite(g(r))).length < 150) continue;
  out.countries[c.cc] = {};
  for (const k of HH) {
    const w = eng.weightsFor(null, k) || {}; if (w.demographics && !process.env.NZ_ALL) continue;   // profiles that score growth would be circular (NZ_ALL=1: include them, in-sample)
    const res = eng.rank(all, k, { country: c.cc, subRanks: false }); const S = res.scored.filter((s) => !s.thin);
    if (S.length < 100) continue;
    const top = S.slice(0, 30).map((s) => s.r), rest = S.map((s) => s.r);
    const gt = med(top.map(g)), ga = med(rest.map(g)), mt = med(top.map(m)), ma = med(rest.map(m));
    const growShare = Math.round(100 * top.filter((r) => g(r) > 0).length / Math.max(1, top.filter((r) => Number.isFinite(g(r))).length));
    out.countries[c.cc][k] = { n: S.length, top30_growth_median: gt, all_growth_median: ga, top30_growing_pct: growShare, top30_netmig_median: mt, all_netmig_median: ma };
    const a = agg[k] = agg[k] || { better: 0, worse: 0, countries: 0, diffs: [] };
    if (gt != null && ga != null) { a.countries++; a.diffs.push(+(gt - ga).toFixed(2)); if (gt > ga) a.better++; else a.worse++; }
  }
}
for (const [k, a] of Object.entries(agg)) out.profiles[k] = { countries: a.countries, top30_grows_faster_in: a.better, top30_grows_slower_in: a.worse, median_gap_pct_points: med(a.diffs), verdict: a.countries < 5 ? 'too few countries' : a.better / a.countries >= 0.7 ? 'consistent: people move to these places' : a.better / a.countries >= 0.5 ? 'mixed' : Math.abs(med(a.diffs)) < 0.25 && a.better / a.countries >= 0.35 ? 'neutral: top places grow like the country average' : 'inconsistent: top places tend to lose people' };
fs.mkdirSync(ROOT + '/docs/audit', { recursive: true });
fs.writeFileSync(ROOT + '/docs/audit/evidence_audit' + (process.env.NZ_ALL ? '_all' : '') + '.json', JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out.profiles).sort((a, b) => (a[1].top30_grows_faster_in / a[1].countries) - (b[1].top30_grows_faster_in / b[1].countries))) console.log(k.padEnd(20), String(v.top30_grows_faster_in).padStart(3), '/', String(v.countries).padEnd(3), 'gap', String(v.median_gap_pct_points).padStart(6), ' ', v.verdict);
