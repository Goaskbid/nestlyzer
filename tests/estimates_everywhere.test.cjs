// 2.15.28 (owner: "taxes don't change every year, estimates matter. add them anywhere"):
// every active place carries a scored tax figure and a scored cost figure, measured locally or as a flagged estimate.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const D = require('../src/data.js'), H = D.hydrate || D.NestData.hydrate, root = path.join(__dirname, '..');
const meta = JSON.parse(fs.readFileSync(path.join(root, 'data/meta.json'))), CAT = {};
meta.factors.forEach((f) => { CAT[f.id] = f.category; });
const NO_TAX = [], NO_COST = []; // Taiwan joined in 2.15.28 (Penn World Table price level)
test('every place has a scored tax and cost figure (local or flagged estimate)', () => {
  const miss = { tax: {}, affordability: {} }; let est = 0, n = 0;
  for (const c of meta.countries) {
    const rows = H(JSON.parse(fs.readFileSync(path.join(root, 'data/c', c.cc + '.json')))).filter((r) => !r.superseded);
    for (const r of rows) {
      n++;
      for (const cat of ['tax', 'affordability']) {
        const ks = Object.keys(r.factorScores || {}).filter((k) => CAT[k] === cat && Number.isFinite(r.factorScores[k]));
        if (!ks.length) miss[cat][c.cc] = (miss[cat][c.cc] || 0) + 1;
        if (ks.some((k) => (r.factorEst || {})[k])) est++;
        for (const k of ks) { assert.ok(r.factorScores[k] >= 0 && r.factorScores[k] <= 100, `${r.name} ${k} score in range`); }
      }
    }
  }
  assert.deepStrictEqual(Object.keys(miss.tax).filter((c) => !NO_TAX.includes(c)), [], 'tax missing: ' + JSON.stringify(miss.tax));
  assert.deepStrictEqual(Object.keys(miss.affordability).filter((c) => !NO_COST.includes(c)), [], 'cost missing: ' + JSON.stringify(miss.affordability));
  assert.ok(est > 50000, 'estimates are flagged, ' + est);
  console.log(`places ${n}; tax missing ${JSON.stringify(miss.tax)}; cost missing ${JSON.stringify(miss.affordability)}; flagged estimate uses ${est}`);
});
test('Wädenswil: canton-median tax is scored and flagged as an estimate', () => {
  const r = H(JSON.parse(fs.readFileSync(path.join(root, 'data/c/CH.json')))).find((x) => x.name === 'Wädenswil');
  assert.ok(Number.isFinite(r.factorScores.single_income_tax_100k));
  assert.ok(r.factorEst.single_income_tax_100k);
});
test('places with local tax data keep it and get no national stand-in', () => {
  const r = H(JSON.parse(fs.readFileSync(path.join(root, 'data/c/CH.json')))).find((x) => x.name === 'Zug');
  assert.ok(!('n_tax_revenue_national' in (r.factorRaw || {})) && !(r.factorEst || {}).single_income_tax_100k);
});
test('engine: a national tax figure is a half-weight stand-in, and estimate-only categories count at half strength', () => {
  const E = require('../src/engine.js'), eng = new E(meta, {});
  const rows = H(JSON.parse(fs.readFileSync(path.join(root, 'data/c/IT.json')))).filter((r) => !r.superseded && !r.whole);
  const t = rows.find((x) => x.name === 'Torgiano'), c = eng.categoriesFor(t, 'low_income_family');
  assert.ok(Number.isFinite(c.tax) && t._proxy && t._proxy.tax === 'national figure, used as an estimate');
  const z = rows.find((x) => x.name === 'Concorezzo'), cz = eng.categoriesFor(z, 'low_income_family');
  const raw = (z.factorScores.n_house_price_m2_it + z.factorScores.n_rent_m2_it) / 2;
  assert.ok(Math.abs(cz.affordability - 50) < Math.abs(raw - 50), 'estimate pulled toward the midpoint: ' + cz.affordability + ' vs ' + raw);
});
