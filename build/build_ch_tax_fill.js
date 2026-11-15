// 2.15.27 (owner audit: "no costs for Wädenswil"): the ESTV 2018 tax burden is published for the municipalities of 2018.
// Twelve municipalities formed by mergers since then (Wädenswil, Stammheim, Val de Bagnes ...) have no own figure.
// They now show the median of their canton's 2018 municipalities, stored as a regional figure (sh.rg, level n3 = canton),
// so the card says it is a canton-level value and never presents it as the municipality's own. Run after the CH shard build.
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..'), F = path.join(ROOT, 'data/c/CH.json');
const sh = JSON.parse(fs.readFileSync(F)), C = Object.fromEntries(sh.cols.map((c, i) => [c, i]));
const KEYS = ['single_income_tax_100k', 'single_income_tax_150k', 'family_income_tax_100k', 'retiree_tax_100k', 'wealth_tax_1m', 'wealth_tax_5m'];
const med = (a) => { a = a.filter(Number.isFinite).sort((x, y) => x - y); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
let filled = 0;
for (const k of KEYS) {
  const by = {}; sh.rows.forEach((row, i) => { if (row[C.sup]) return; const n3 = row[C.n3]; if (!n3) return; (by[n3] = by[n3] || { r: [], s: [] }); if (sh.fr[k][i] != null) by[n3].r.push(sh.fr[k][i]); if (sh.fs[k][i] != null) by[n3].s.push(sh.fs[k][i]); });
  const t = {}; for (const n3 in by) { const r = med(by[n3].r), s = med(by[n3].s); if (r != null) t[n3] = [Math.round(r * 100) / 100, s == null ? null : Math.round(s * 100) / 100, 'm']; /* 2.15.28 (owner: "estimates matter"): the canton median is scored and always labelled as an estimate */ }
  sh.rg = sh.rg || {}; sh.rg[k] = { n3: t };
  filled += sh.rows.filter((row, i) => !row[C.sup] && sh.fr[k][i] == null && t[row[C.n3]]).length;
}
fs.writeFileSync(F, JSON.stringify(sh));
console.log('CH tax: canton medians stored for', KEYS.length, 'measures; place-measures filled:', filled);
