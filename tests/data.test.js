// Data integrity checks for the built shards.
const fs = require('fs'), path = require('path'); const D = require('../src/data.js');
const root = path.join(__dirname, '..'); const meta = JSON.parse(fs.readFileSync(path.join(root, 'data/meta.json')));
let n = 0, located = 0, nuts = 0, fail = 0, sup = 0; const by = {};
let nw = 0, nw2 = 0;
for (const c of meta.countries) { const r = D.hydrate(JSON.parse(fs.readFileSync(path.join(root, `data/c/${c.cc}.json`)))); if (c.world) { if (['US', 'CA', 'JP', 'KR', 'TW', 'HK', 'SG', 'AU', 'NZ', 'IL'].includes(c.cc)) nw += r.length; else nw2 += r.length; } else n += r.length; r.forEach(x => { if (x.superseded) { sup++; return; } by[x.name + '|' + x.country] = x; if (Number.isFinite(x.lat)) located++; if (x.n3) nuts++; }); if (r.length !== c.nAll || r.filter(x => !x.superseded).length !== c.n) { fail++; console.log('FAIL count', c.cc); } }
function ok(cond, msg) { if (!cond) { fail++; console.log('FAIL', msg); } else console.log('ok  ', msg); }
ok(n === 99995, `all 99,993 legacy records plus 2 added successors (BCP, Dorset) present (${n}), ${sup} flagged as superseded`);
ok(nw === 29939, `the 10 countries outside Europe hold 29,939 places (${nw}; 31 Tokyo neighbourhoods are inside the corrected ward entries)`);
ok(nw2 === 10538, `the 9 countries added in 2.12.1 hold 10,538 places (${nw2})`);
ok(sup === 1468, 'superseded: older generations of the same municipality (455) plus the 2.8 roster repair from official change records (1013)');
ok(located / (n + nw - sup) > 0.98, `located share ${(100 * located / (n + nw)).toFixed(2)}%`);
ok(nuts >= n + nw - sup - 1, `NUTS3 or region assigned to ${nuts} of ${n + nw}`);
const z = by['Zürich|CH'], nice = by['Nice|FR'], mei = by['Meilen|CH'];
ok(z.factorRaw.geo_hub_airport_km < 15, `Zürich hub airport ${z.factorRaw.geo_hub_airport_km} km`);
ok(nice.factorRaw.geo_coast_km < 3, `Nice coast ${nice.factorRaw.geo_coast_km} km`);
ok(mei.factorRaw.geo_major_city_km > 10 && mei.factorRaw.geo_major_city_km < 20, `Meilen to 100k city ${mei.factorRaw.geo_major_city_km} km`);
ok(z.factorScores.single_income_tax_100k != null && z.trend && z.trend.annual_population.length >= 6, `Swiss tax factors and the ${z.trend.annual_population[0].year}-${z.trend.annual_population.slice(-1)[0].year} trend kept`);
console.log(fail ? `${fail} FAIL` : 'data checks: all pass'); process.exitCode = fail ? 1 : 0;
