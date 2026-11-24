/* r19: regression tests for the external audit of upload (9), findings NZ9-01, -03, -05, -06, -07 (unit level).
   The built-artifact checks (all pages, maps, consent, titles) are in tests/test_r19_audit.py. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');

test('NZ9-01: missing, empty, NaN or infinite density never gives a density sentence', async () => {
  const { placeStory: old } = await import(path.join(R, 'build/voice.mjs')), { placeStoryRich } = await import(path.join(R, 'build/voice_place.mjs'));
  const placeStory = (v) => old(v) + placeStoryRich(v);
  const base = { id: 'X:1', name: 'Testtown', cname: 'Testland', pop: 1999979, best: [], worst: [] };
  for (const d of [null, undefined, '', NaN, Infinity, -Infinity, 0, -5]) {
    const html = placeStory({ ...base, density: d, densityOk: true });
    assert.ok(!/per square kilometre|per km²|each square kilometre/.test(html), 'density ' + String(d) + ' produced: ' + html);
    assert.ok(!/\b0 people/.test(html));
  }
  const ok = placeStory({ ...base, pop: 900, density: 12.4, densityOk: true });
  assert.match(ok, /12 people per square kilometre/);
  const noArea = placeStory({ ...base, pop: 900, density: 12.4, densityOk: false });
  assert.ok(!/per square kilometre/.test(noArea), 'a density without a matching area and population is not stated');
});

test('NZ9-05: altitude alone never produces snow, winter-driving or tyre claims; decline never produces housing claims', async () => {
  const { placeStory: old, countryStory } = await import(path.join(R, 'build/voice.mjs')), { placeStoryRich } = await import(path.join(R, 'build/voice_place.mjs'));
  const placeStory = (v) => old(v) + placeStoryRich({ ...v, kg: 'Dfc', winterH: 5, winterLen: '5 h', winterSet: '15:00', summerSet: '22:40' });
  for (let i = 0; i < 400; i++) {
    const html = placeStory({ id: 'A:' + i, name: 'Alp' + i, cname: 'Testland', pop: 500 + i * 37, alt: 1250 + i, relief: 900, growth: -8 - (i % 5), best: [], worst: [] });
    assert.ok(!/snow|tyre|winter (here|is)|not a rumour/i.test(html), html);
    assert.ok(!/housing|competition|moving vans|magnet|pull/i.test(html), html);
  }
  const c = countryStory({ cc: 'XX', name: 'Testland', n: 10, big: { name: 'Big', pop: 1e6 }, share: 30, median: 2000, grow: { name: 'G', g: 5 }, high: { name: 'H', alt: 1800 } });
  assert.ok(!/winter|snow|moving vans/i.test(c), c);
});

test('NZ9-06: yearly growth is the compound rate (100 to 200 in five years = 14.9%), and growth is never called a magnet or pull', () => {
  const src = fs.readFileSync(path.join(R, 'src/place/place.js'), 'utf8');
  const fn = /function trendHTML\(p\)\{[\s\S]*?\n(?=function chart)/.exec(src)[0];
  const trendHTML = new Function(fn + '; return trendHTML;')();
  const html = trendHTML([2017, 2018, 2019, 2020, 2021, 2022].map((y, i) => ({ year: y, population: [100, 120, 140, 160, 180, 200][i] })));
  assert.match(html, /14\.9% a year \(compound\)|\+100%/);
  assert.ok(!/20\.0% a year/.test(html), html);
  assert.ok(!/magnet|pull/i.test(src.split('function trendHTML')[1].split('function chart')[0]));
  const site = fs.readFileSync(path.join(R, 'build/build_site.mjs'), 'utf8');
  assert.ok(site.includes('pa=(Math.pow(1+longest.pc/100,1/longest.h)-1)*100'), 'static pages use the same compound formula');
});

test('NZ9-07: replacing a factor key in place gives the same categories from a reused and a fresh engine', () => {
  const E = require(path.join(R, 'src/engine.js')), meta = JSON.parse(fs.readFileSync(path.join(R, 'data/meta.json'), 'utf8'));
  const r = { id: 'CH:probe', country: 'CH', population: 10000, factorScores: { n_gps_100k_us: 80 }, factorRaw: {}, factorLevel: {}, x: {}, sourceConfidence: 80 };
  const e = new E(meta, { method: 'v2' }); e.categories(r);
  delete r.factorScores.n_gps_100k_us; r.factorScores.n_exercise_us = 80;
  assert.deepStrictEqual({ ...e.categories(r) }, { ...new E(meta, { method: 'v2' }).categories(r) });
});

test('NZ9-03: Swiss facts use one boundary vintage (Assens, Zurzach, Latena and every active place)', () => {
  const d = JSON.parse(fs.readFileSync(path.join(R, 'data/c/CH.json'), 'utf8')), C = Object.fromEntries(d.cols.map((k, i) => [k, i]));
  const by = Object.fromEntries(d.rows.map((r, i) => [String(r[C.oid]), i]));
  const A = by['5511'], a = d.rows[A], s = d.trend[A].annual_population;
  assert.strictEqual(a[C.pop], 1672); assert.strictEqual(s[s.length - 1].population, 1672); assert.ok(Math.abs(a[C.area] - 8.46) < 0.01);
  assert.ok(d.trend[A].series_break && d.trend[A].series_break.absorbed.includes('Bioley-Orjulaz'));
  assert.ok(s.every((e) => e.year >= d.trend[A].series_break.year), 'no observation of the smaller territory is compared');
  assert.strictEqual(d.trend[A].population_5y_pct, null);
  let bad = [];
  d.rows.forEach((r, i) => {
    if (r[C.sup]) return; const t = d.trend[i] || {}, ap = t.annual_population || [];
    if (ap.length && ap[ap.length - 1].population !== r[C.pop]) bad.push('pop ' + r[C.name]);
    if (r[C.pop] && r[C.area]) { const dn = r[C.pop] / r[C.area], f = d.fr.density_people_km2 && d.fr.density_people_km2[i];
      if (f != null && Math.abs(f - dn) > 0.011 * dn) bad.push('density factor ' + r[C.name]); if (r[C.dens] != null && Math.abs(r[C.dens] - dn) > 0.011 * dn) bad.push('density ' + r[C.name]); }
    for (let k = 1; k < ap.length; k++) if (ap[k - 1].population >= 300 && ap[k].population / ap[k - 1].population - 1 > 0.15 && !t.series_break) bad.push('unhandled jump ' + r[C.name]);
  });
  assert.deepStrictEqual(bad, []);
  for (const [oid, nm] of [['4324', 'Zurzach'], ['6513', 'Laténa']]) { const i = by[oid], r = d.rows[i]; assert.ok(Math.abs(d.fr.density_people_km2[i] - r[C.pop] / r[C.area]) < 0.02 * r[C.pop] / r[C.area], nm); }
});

test('NZ9-04: the release gate fails a suite that prints a failed assertion but exits 0', () => {
  const { execFileSync } = require('child_process');
  const out = execFileSync('python3', [path.join(R, 'tests/gate_verdict.py'), '--selftest'], { encoding: 'utf8' });
  assert.match(out, /5 of 5 passed/);
  const gate = fs.readFileSync(path.join(R, 'tests/release_gate.sh'), 'utf8');
  assert.ok(gate.includes('gate_verdict.py $rc'), 'every step goes through the assertion-aware verdict');
  for (const f of ['test_v2122', 'test_v2124', 'test_v213', 'test_v2133']) assert.ok(/sys\.exit\(0 if all/.test(fs.readFileSync(path.join(R, 'tests', f + '.py'), 'utf8')), f + ' exits non-zero on failure');
});

test('r20 intake plan: one-off, bounded, every task has an official URL and a known reducer', () => {
  const plan = JSON.parse(fs.readFileSync(path.join(R, 'build/collect/acquisition_plan.json'), 'utf8'));
  assert.strictEqual(plan.mode, 'download_and_reduce');
  const ok = new Set(['keep', 'raw_only', 'zip_tables', 'census_grid', 'raster_pts', 'raster_multi', 'index', 'hmlr']);
  for (const t of plan.tasks) { assert.ok(ok.has(t.reduce), t.id); assert.ok(t.urls.length && t.urls.every((u) => /^https:\/\//.test(u)), t.id); }
  const src = fs.readFileSync(path.join(R, 'build/collect/reduce_r20.py'), 'utf8');
  assert.ok(/LIMIT = 94 \* 1024 \* 1024/.test(src) && /BUDGET = /.test(src), 'file size limit and time budget');
  assert.ok(!/schedule|cron/i.test(JSON.stringify(plan)), 'no schedule');
});
