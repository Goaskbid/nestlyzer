// Outside Europe the biggest city used to win almost every household (Sydney, Taipei, Seoul, New York): every factor
// there rewarded size. 2.6.1 adds crowding counterweights (build/build_world_balance.py) and keeps whole-city entries
// out of rankings. This check fails if one place again tops most households, or the largest cities dominate.
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
    n++; tops[t.id] = (tops[t.id] || 0) + 1; if (big.has(t.id)) bigWins++; if (t.r.whole) wholeTop++;
  }
  const most = Math.max(...Object.values(tops));
  const ok = n > 0 && most <= Math.ceil(n * 0.7) && bigWins <= Math.ceil(n / 3) && wholeTop === 0 && Object.keys(tops).length >= 3;
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${cc}: ${Object.keys(tops).length} different #1 places over ${n} households; most wins by one place ${most}; largest 3 cities win ${bigWins}; whole-city #1 ${wholeTop}`);
}
// lakes count as shore: Greater Toronto has places for Coastal living (Lake Ontario)
const ca = D.hydrate(JSON.parse(fs.readFileSync(path.join(root, 'data/c/CA.json'))));
const tor = ca.find((r) => r.name === 'Toronto'); const fr = tor.factorRaw;
const okLake = fr.geo_shore_km < 10 && fr.geo_coast_km > 300 && !eng.eligibilityFail(tor, 'coastal', 'CA');
if (!okLake) fail++;
console.log(`${okLake ? 'ok  ' : 'FAIL'} Toronto counts Lake Ontario as its shore: shore ${fr.geo_shore_km} km, sea ${fr.geo_coast_km} km, passes Coastal living ${!eng.eligibilityFail(tor, 'coastal', 'CA')}`);
process.exitCode = fail ? 1 : 0;
