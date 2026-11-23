// r16 (audit NZ-AUD-12): evidence depth by country, for the method page. For every active place it counts the scored
// inputs (factor values) by where they come from: the place itself, a district or region (one regional figure shown on
// every place in it), the whole country, and how many of all inputs are estimates. A regional figure used by 500 places
// is one source observation; the table therefore also counts the distinct regional observations behind the cells.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export function evidenceDepth(ROOT, countries) {
  const D = require(path.join(ROOT, 'src/data.js'));
  const out = [];
  for (const c of countries) {
    const f = path.join(ROOT, 'data/c', c.cc + '.json'); if (!fs.existsSync(f)) continue;
    const sh = JSON.parse(fs.readFileSync(f, 'utf8')), all = D.hydrate(sh);
    let n = 0, cells = 0, loc = 0, reg = 0, nat = 0, est = 0;
    for (const r of all) {
      if (r.superseded) continue; n++;
      const fl = r.factorLevel || {}, fe = r.factorEst || {};
      for (const k in r.factorScores) {
        if (!Number.isFinite(r.factorScores[k])) continue;
        cells++;
        const l = fl[k];
        if (l === 9) nat++; else if (l === 1 || l === 2 || l === 3) reg++; else loc++;
        if (fe[k]) est++;
      }
    }
    let distinctRegional = 0;
    for (const k in sh.rg || {}) for (const lvl in sh.rg[k]) distinctRegional += Object.keys(sh.rg[k][lvl] || {}).length;
    if (sh.cl && sh.cl.areas) distinctRegional += Object.keys(sh.cl.areas).length * (sh.cl.ids || []).length;
    const pct = (x) => (cells ? Math.round((x / cells) * 1000) / 10 : 0);
    out.push({ cc: c.cc, name: c.name, places: n, perPlace: n ? Math.round(cells / n) : 0, local: pct(loc), regional: pct(reg), national: pct(nat), estimated: pct(est), distinctRegional });
  }
  return out;
}
