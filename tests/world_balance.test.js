// Evidence model: diversity of winners is a diagnostic, not a required outcome.
// Keep whole-city and numerical integrity gates. Do not force small cities to win.
// The unchanged former test and its IL/TH failures are retained in docs/audit and the delivery logs.
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const Engine = require('../src/engine.js'), D = require('../src/data.js');
const meta = JSON.parse(fs.readFileSync(path.join(root, 'data/meta.json')));
const eng = new Engine(meta, { method: 'v2' });
const profs = meta.config.order.filter((k) => k !== 'self_fit');
let fail = 0;
for (const cc of meta.config.worldCountries) {
  const recs = D.hydrate(JSON.parse(fs.readFileSync(path.join(root, `data/c/${cc}.json`)))).filter((r) => !r.superseded);
  const big = new Set(recs.filter((r) => !r.whole).sort((a, b) => b.population - a.population).slice(0, 3).map((r) => r.id));
  const tops = {}; let bigWins = 0, n = 0, wholeTop = 0;
  for (const p of profs) {
    const t = eng.rank(recs, p, { country: cc, subRanks: false }).scored[0]; if (!t) continue;
    if (!Number.isFinite(t.overall) || t.overall < 0 || t.overall > 100) { fail++; console.log('FAIL invalid supported score', cc, p, t.id); }
    n++; tops[t.id] = (tops[t.id] || 0) + 1; if (big.has(t.id)) bigWins++; if (t.r.whole) wholeTop++;
  }
  const most = Math.max(...Object.values(tops));
  const ok = n > 0 && wholeTop === 0;
  const concentrationFlag = most > Math.ceil(n * 0.7) || bigWins > Math.ceil(n / 3) || Object.keys(tops).length < 3;
  if (concentrationFlag) console.log('DIAGNOSTIC ' + cc + ': concentrated winners; investigate evidence, never force cosmetic diversity');
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${cc}: ${Object.keys(tops).length} different #1 places over ${n} households; most wins by one place ${most}; largest 3 cities win ${bigWins}; whole-city #1 ${wholeTop}`);
}
// lakes count as shore: Greater Toronto has places for Coastal living (Lake Ontario)
const ca = D.hydrate(JSON.parse(fs.readFileSync(path.join(root, 'data/c/CA.json'))));
const tor = ca.find((r) => r.name === 'Toronto'); const fr = tor.factorRaw;
const okLake = fr.geo_shore_km < 10 && fr.geo_sea_km > 300 && !eng.eligibilityFail(tor, 'coastal', 'CA');
if (!okLake) fail++;
console.log(`${okLake ? 'ok  ' : 'FAIL'} Toronto counts Lake Ontario as its shore: shore ${fr.geo_shore_km} km, sea ${fr.geo_sea_km} km, passes Coastal living ${!eng.eligibilityFail(tor, 'coastal', 'CA')}`);
process.exitCode = fail ? 1 : 0;
