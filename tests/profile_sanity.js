// Profile sanity audit: the top 10 of every public profile in every country must meet the profile's defining fact.
// Absolute facts only (distances, presence); a place that fails one is listed. Run: node tests/profile_sanity.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), D = require(path.join(ROOT, 'src/data.js')), E = require(path.join(ROOT, 'src/engine.js'));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json'))), eng = new E(meta, {});
const NM = { kg: 1, lake: 1, river: 1, port: 1, iport: 1, mport: 1, chem: 1, border: 1, metro: 1, land: 1, sea: 1, shore: 1 };
const fr = (r) => r.factorRaw || {}, x = (r) => r.x || {};
const min = (...a) => { const v = a.filter(Number.isFinite); return v.length ? Math.min(...v) : null; };
// rule: [profile, label, value(r), limit, how]  how 'max' = value must be <= limit
const RULES = [
  ['coastal', 'sea or large lake', (r) => fr(r).geo_coast_km, 15, 'max'],
  ['sun_retiree', 'sea', (r) => fr(r).geo_sea_km, 80, 'max'],
  ['commuter', 'city of 100,000+ (or 250,000 people within 30 km)', (r) => fr(r).geo_catchment_30km >= 250000 ? 0 : fr(r).geo_major_city_km, 60, 'max'],
  ['car_free', 'main railway line', (r) => x(r).rail_km, 25, 'max'],
  ['cross_border', 'land border', (r) => x(r).border_km, 45, 'max'],
  ['biz_port_industry', 'seaport or inland port', (r) => min(x(r).port_km, x(r).iport_km, x(r).mport_km), 60, 'max'],
  ['biz_logistics', 'motorway', (r) => x(r).mway_km, 25, 'max'],
  ['expat_professional', 'hub airport', (r) => fr(r).geo_hub_airport_km, 150, 'max'],
  ['outdoor', 'mountains or water (relief m, water km)', (r) => (x(r).relief >= 300 || x(r).alt >= 800 || min(fr(r).geo_coast_km, x(r).lake_km) <= 15) ? 0 : 1, 0, 'max'],
];
const fails = [], tally = {};
for (const c of meta.countries) {
  const all = D.hydrate(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/c', c.cc + '.json'))));
  const xp = path.join(ROOT, 'data/x', c.cc + '.json');
  if (fs.existsSync(xp)) { const xs = JSON.parse(fs.readFileSync(xp)); all.forEach((r, i) => { const o = {}; for (const k in xs.cols) { const v = xs.cols[k][i]; if (v != null) o[k] = NM[k] ? xs.strs[v] : v; } r.x = o; D.fixShore(r); }); }
  const scope = all.filter((r) => !r.superseded && !r.whole);
  for (const [p, label, get, lim] of RULES) {
    // A fact the country cannot offer (no sea, no railway) is not a failure of the ranking: require 10 places that meet it.
    if (scope.filter((r) => { const v = get(r); return v != null && v <= lim; }).length < 10) { (tally[p] = tally[p] || { checked: 0, failed: 0, na: [] }).na = (tally[p].na || []).concat(c.cc); continue; }
    let res; try { res = eng.rank(scope, p, { country: c.cc, subRanks: false }).scored.slice(0, 10); } catch (e) { continue; }
    tally[p] = tally[p] || { checked: 0, failed: 0 };
    for (const s of res) {
      const v = get(s.r); if (v == null) continue; tally[p].checked++;
      if (v > lim) { tally[p].failed++; fails.push(`${c.cc} ${p} #${res.indexOf(s) + 1} ${s.r.name}: ${label} ${Math.round(v * 10) / 10} (limit ${lim})`); }
    }
  }
}
for (const p in tally) console.log(`${tally[p].failed ? 'FAIL' : 'ok  '} ${p}: ${tally[p].checked} top-10 places checked, ${tally[p].failed} fail; not offered in ${(tally[p].na || []).length} countries`);
fails.slice(0, 60).forEach((f) => console.log('  ' + f));
console.log(`PROFILE SANITY: ${fails.length ? 'FAIL' : 'PASS'} (${fails.length} failures)`);
process.exitCode = fails.length ? 1 : 0;
