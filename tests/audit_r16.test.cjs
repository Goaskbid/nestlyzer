// r16 regressions for the external audit of 2.15.30 (NZ-AUD-01, 02, 05, 07, 17, 20). Runs in the release gate (node --test).
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const E = require(path.join(ROOT, 'src/engine.js'));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json'), 'utf8'));
const mk = () => ({ id: 'CH:fixture', name: 'Fixture', country: 'CH', population: 10000, factorScores: { single_income_tax_100k: 10, n_rent_us: 90 }, factorRaw: {}, factorLevel: {}, x: {}, sourceConfidence: 80 });
const run = (e, r) => e.rank([r], 'audit_fixture', { country: 'CH', subRanks: false }).scored.map((x) => ({ score: x.overall, cats: x.catScores }));
for (const kind of ['swap values in place', 'add estimator provenance', 'replace trend', 'change one value']) {
  for (const inPass of [false, true]) {
    test(`NZ-AUD-07 cache: rank -> ${kind} -> rank equals a fresh engine${inPass ? ' (inside an outer pass)' : ''}`, () => {
      const e = new E(meta, { method: 'v2' }), r = mk();
      e.profiles.audit_fixture = { name: 'Audit fixture', weights: { tax: 100 }, coverageMin: 0 };
      const go = () => (inPass ? e.pass(() => run(e, r)) : run(e, r));
      go();
      if (kind === 'swap values in place') { r.factorScores.single_income_tax_100k = 90; r.factorScores.n_rent_us = 10; }
      else if (kind === 'add estimator provenance') r.factorEst = { single_income_tax_100k: 1 };
      else if (kind === 'replace trend') r.trend = { population_5y_pct: 9 };
      else r.factorScores.single_income_tax_100k = 55;
      const cached = go();
      const e2 = new E(meta, { method: 'v2' }); e2.profiles.audit_fixture = e.profiles.audit_fixture;
      assert.deepStrictEqual(cached, run(e2, r));
    });
  }
}
const CH = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/c/CH.json'), 'utf8'));
const C = Object.fromEntries(CH.cols.map((k, i) => [k, i]));
const row = (oid) => { const i = CH.rows.findIndex((r) => String(r[C.oid]) === String(oid)); return { r: CH.rows[i], t: CH.trend[i] || {} }; };
test('NZ-AUD-01 Swiss observation periods: Zurich, Bern, Kriens carry the BFS 2022 figures as 2022', () => {
  for (const [oid, pop] of [[261, 427721], [351, 134506], [1059, 28983]]) {
    const { r, t } = row(oid), last = t.annual_population[t.annual_population.length - 1];
    assert.strictEqual(r[C.pop], pop); assert.strictEqual(last.year, 2022); assert.strictEqual(last.population, pop);
    assert.ok(!t.annual_population.some((p) => p.year > 2022), 'no observation after 2022');
  }
});
test('NZ-AUD-02 absorption mergers: successor carries the former municipality (Baden/Turgi, Chur, Root, Kriegstetten, Brugg)', () => {
  for (const [oid, pop, area] of [[4021, 19839 + 3010, 14.72], [3901, 38129 + 303, 81.98], [1065, 5498 + 512, 9.9], [2525, 1373 + 851 + 890, 5.38], [4095, 12943 + 1664, 14.01]]) {
    const { r, t } = row(oid);
    assert.strictEqual(r[C.pop], pop, 'population of ' + r[C.name]);
    assert.ok(Math.abs(r[C.area] - area) < 0.011, 'area of ' + r[C.name] + ' ' + r[C.area]);
    assert.strictEqual(t.annual_population[t.annual_population.length - 1].population, pop, 'series end equals residents');
    assert.ok(Math.abs(r[C.dens] - pop / r[C.area]) < 0.01, 'density recomputed');
  }
  // a merger the latest release already contains is not added twice
  assert.strictEqual(row(546).r[C.pop], 10419);
});
test('NZ-AUD-17 home page count is generated: Switzerland has 2,110 active municipalities', () => {
  const sw = meta.countries.find((c) => c.cc === 'CH');
  assert.strictEqual(sw.n, CH.rows.filter((r) => !r[C.sup]).length);
  const src = fs.readFileSync(path.join(ROOT, 'build/build_site.mjs'), 'utf8');
  assert.ok(!/2,172 municipalities/.test(src));
});
function consent(tc, before) {
  const src = fs.readFileSync(path.join(ROOT, 'assets/consent.js'), 'utf8');
  const mem = before ? { 'nz:consent2': JSON.stringify(before) } : {}, calls = []; let cb, reloaded = false, cookies = [];
  const el = { classList: { add() {}, remove() {} }, querySelector: () => null };
  const sb = { Date, JSON, console, setTimeout: () => 0, localStorage: { getItem: (k) => mem[k] || null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] },
    document: { getElementById: () => el, querySelector: () => null, addEventListener() {}, get cookie() { return '_ga=1; _ga_X=2; other=3'; }, set cookie(v) { cookies.push(v); } },
    location: { hostname: 'nestlyzer.com', reload: () => { reloaded = true; } },
    nzGA: () => calls.push('nzGA'), nzAds: () => calls.push('nzAds'), gtag: (...x) => calls.push(x), addEventListener() {}, __tcfapi: (c, v, f) => { cb = f; } };
  sb.window = sb; vm.runInNewContext(src, sb);
  if (tc) cb(tc, true);
  return { get stored() { return mem['nz:consent2'] && JSON.parse(mem['nz:consent2']); }, calls, sb, get reloaded() { return reloaded; }, cookies };
}
const tcf = (p, v755) => ({ gdprApplies: true, eventStatus: 'useractioncomplete', purpose: { consents: p }, vendor: { consents: { 755: v755 } } });
test('NZ-AUD-05 TCF: purpose 1 alone with Google denied grants nothing and loads no analytics', () => {
  const o = consent(tcf({ 1: true, 3: false, 4: false, 7: false, 8: false, 9: false, 10: false }, false));
  assert.strictEqual(o.stored.a, false); assert.strictEqual(o.stored.d, false); assert.ok(!o.calls.includes('nzGA'));
});
test('NZ-AUD-05 TCF: purpose 1 with Google allowed but no measurement purpose: no analytics', () => {
  const o = consent(tcf({ 1: true, 8: false }, true));
  assert.strictEqual(o.stored.a, false); assert.ok(!o.calls.includes('nzGA'));
});
test('NZ-AUD-05 TCF: full consent for Google with measurement loads analytics', () => {
  const o = consent(tcf({ 1: true, 7: true, 8: true, 9: true, 10: true }, true));
  assert.strictEqual(o.stored.a, true); assert.strictEqual(o.stored.d, true); assert.ok(o.calls.includes('nzGA'));
});
test('NZ-AUD-20 withdrawal: switching from accepted to only-necessary wipes Google cookies and reloads to a clean page', () => {
  const o = consent(null, { v: 2, a: true, d: true, t: 1 });
  o.sb.NZConsent.set(false);
  assert.strictEqual(o.stored.a, false); assert.ok(o.reloaded, 'page reloaded'); assert.ok(o.cookies.some((c) => /^_ga=; Max-Age=0/.test(c)), 'GA cookie deleted');
  assert.ok(!o.calls.includes('nzGA'));
});
