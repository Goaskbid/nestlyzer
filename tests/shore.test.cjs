// Shore distance is an absolute fact: 356 km from water can never score high.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), D = require(path.join(ROOT, 'src/data.js'));
const NM = { kg: 1, lake: 1, river: 1, port: 1, iport: 1, mport: 1, chem: 1, border: 1, metro: 1, land: 1, sea: 1, shore: 1 };
function load(cc) {
  const all = D.hydrate(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/c', cc + '.json'))));
  const xp = path.join(ROOT, 'data/x', cc + '.json');
  if (fs.existsSync(xp)) { const xs = JSON.parse(fs.readFileSync(xp)); all.forEach((r, i) => { const o = {}; for (const k in xs.cols) { const v = xs.cols[k][i]; if (v != null) o[k] = NM[k] ? xs.strs[v] : v; } r.x = o; D.fixShore(r); }); }
  return all;
}
test('shore score follows distance in every country', () => {
  const ccs = fs.readdirSync(path.join(ROOT, 'data/c')).filter((f) => /^[A-Z]{2}\.json$/.test(f)).map((f) => f.slice(0, 2));
  let bad = [];
  for (const cc of ccs) for (const r of load(cc)) {
    const km = (r.factorRaw || {}).geo_shore_km, sc = (r.factorScores || {}).geo_coast_km;
    if (!Number.isFinite(km) || sc == null) continue;
    if (km > 50 && sc > 0) bad.push(`${cc} ${r.name} ${km} km scored ${sc}`);
    if (Math.abs(sc - Math.max(0, Math.min(100, 100 - 2 * km))) > 0.2) bad.push(`${cc} ${r.name} ${km} km scored ${sc}`);
  }
  assert.deepStrictEqual(bad.slice(0, 5), []);
});
test('Stammheim: Lake Constance counts, never 356 km', () => {
  const r = load('CH').find((x) => x.name === 'Stammheim');
  assert.ok(r.factorRaw.geo_coast_km < 15 && r.factorScores.geo_coast_km > 70, r.factorRaw.geo_coast_km);
});
test('a large lake counts as shore, the sea distance stays separate', () => {
  const ch = load('CH'), m = ch.find((r) => r.name === 'Montreux');
  assert.ok(m.factorRaw.geo_shore_km < 2 && m.factorRaw.geo_coast_km === m.factorRaw.geo_shore_km);
  assert.ok(m.factorRaw.geo_sea_km > 200);
});
