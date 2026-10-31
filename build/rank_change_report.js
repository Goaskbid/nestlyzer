/* Rank-change report for the proposed evidence formula (NZ-GLOBAL-049): legacy count-based floor vs the true weighted share.
   node build/rank_change_report.js [profile] > docs/rank_change_<profile>.json */
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..');
const E = require(path.join(ROOT, 'src/engine.js')), D = require(path.join(ROOT, 'src/data.js'));
const NE = E.NestEngine || E, h = D.hydrate || D.NestData.hydrate;
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json'))), prof = process.argv[2] || 'young_family';
const A = new NE(meta, { evidence: 'legacy' }), B = new NE(meta, { evidence: 'weighted' }), out = {};
for (const c of meta.countries) {
  const recs = h(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/c', c.cc + '.json')))).filter((r) => !r.superseded);
  const ra = A.rank(recs, prof, { country: c.cc }).scored, rb = B.rank(recs.map((r) => Object.assign({}, r, { _cats: null })), prof, { country: c.cc }).scored;
  const pa = {}; ra.forEach((x, i) => { pa[x.id] = i + 1; });
  let moved = 0, sum = 0, n = 0; rb.forEach((x, i) => { if (pa[x.id]) { const d = Math.abs(pa[x.id] - (i + 1)); sum += d; n++; if (d) moved++; } });
  const t10a = ra.slice(0, 10).map((x) => x.id), t10b = rb.slice(0, 10).map((x) => x.id);
  out[c.cc] = { places: ra.length, top10_same: t10b.filter((id) => t10a.includes(id)).length, places_moved: moved, mean_rank_shift: n ? +(sum / n).toFixed(1) : 0, new_no1: rb[0] && rb[0].r.name, old_no1: ra[0] && ra[0].r.name };
}
console.log(JSON.stringify(out, null, 1));
