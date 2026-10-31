// Verifies the engine reproduces the legacy v86 rankings (method v1) and reports v2 deltas.
const fs = require('fs'), path = require('path');
const Engine = require('../src/engine.js'), D = require('../src/data.js');
const root = path.join(__dirname, '..');
const meta = JSON.parse(fs.readFileSync(path.join(root, 'data/meta.json')));
if (meta.population && (meta.population.updated_countries || []).length) { console.log(`legacy fixtures: skipped (population refreshed to GISCO LAU ${meta.population.year}; the fixtures describe the ${2024} release)`); process.exit(0); }
const fx = JSON.parse(fs.readFileSync(path.join(root, 'build/source/legacy_score_fixtures.json')));
function load(cc) { return D.hydrate(JSON.parse(fs.readFileSync(path.join(root, `data/c/${cc}.json`)))); }
let fail = 0, pass = 0;
function check(label, recs, key, exp, eng, country) {
  const res = eng.rank(recs, key, { country, subRanks: false });
  const got = res.scored.slice(0, exp.top.length).map(x => [x.id, +x.overall.toFixed(4), x.coverage]);
  let ok = res.scored.length === exp.n;
  exp.top.forEach((e, i) => { const g = got[i]; if (!g || g[0] !== e[0] || Math.abs(g[1] - e[2]) > 0.0002 || g[2] !== e[3]) ok = false; });
  if (ok) pass++; else { fail++; console.log('FAIL', label, key, 'n', res.scored.length, 'exp', exp.n, JSON.stringify(got.slice(0, 3)), JSON.stringify(exp.top.slice(0, 3))); }
}
const v1 = new Engine(meta, { method: 'v1' });
const ch = load('CH');
for (const [k, exp] of Object.entries(fx.CH)) check('CH', ch, k, exp, v1, 'CH');
const at = load('AT');
// self_fit is excluded: the legacy custom profile depended on transient builder state; the builder itself is verified in builder.test.js (60/60)
for (const [k, exp] of Object.entries(fx.AT_no_geometry || {})) if (exp && exp.top && k !== 'self_fit') check('AT', at, k, exp, v1, 'AT');
console.log(`legacy fixtures: ${pass} pass, ${fail} fail`);
// v2 summary
const v2 = new Engine(meta, { method: 'v2' });
for (const k of ['young_family', 'expat_professional', 'hnw', 'single', 'coastal']) {
  const a = v1.profiles[k] ? v1.rank(ch, k, { country: 'CH', subRanks: false }).scored : [];
  ch.forEach(r => delete r._cats);
  const b = v2.rank(ch, k, { country: 'CH', subRanks: false }).scored;
  ch.forEach(r => delete r._cats);
  console.log('v2 CH', k, 'n', a.length, '->', b.length, 'top3', b.slice(0, 3).map(x => x.r.name + ' ' + x.overall.toFixed(1)).join(', '));
}
process.exitCode = fail ? 1 : 0;
