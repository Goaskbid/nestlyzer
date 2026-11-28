// r21: regressions for the upload (11) audit findings NZ11-01 to NZ11-18 (fixtures written independently of the code under test)
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..'), D = require(path.join(R, 'src/data.js')), E = require(path.join(R, 'src/engine.js'));
const meta = JSON.parse(fs.readFileSync(path.join(R, 'data/meta.json')));
const NM = { kg: 1, lake: 1, river: 1, port: 1, iport: 1, mport: 1, chem: 1, fin: 1, border: 1, metro: 1, land: 1, sea: 1, tz: 1, shore: 1 };
function load(cc) { const a = D.hydrate(JSON.parse(fs.readFileSync(path.join(R, 'data/c', cc + '.json')))); const xp = path.join(R, 'data/x', cc + '.json');
  if (fs.existsSync(xp)) { const xs = JSON.parse(fs.readFileSync(xp)); a.forEach((r, i) => { const o = {}; for (const k in xs.cols) { const v = xs.cols[k][i]; if (v != null) o[k] = NM[k] ? xs.strs[v] : v; } r.x = o; }); }
  return a.filter((r) => !r.superseded); }
const src = (f) => fs.readFileSync(path.join(R, f), 'utf8');

test('NZ11-01: an own profile copied from a fixed profile with unchanged weights ranks exactly like it (every household profile, CH)', () => {
  const all = load('CH'), e = new E(meta, {});
  const keys = Object.keys(e.profiles).filter((k) => !e.profiles[k].business && !e.profiles[k].custom && k !== 'self_fit');
  assert.ok(keys.length >= 20);
  for (const k of keys) {
    const a = e.rank(all, k, { country: 'CH', subRanks: false });
    const copy = JSON.parse(JSON.stringify(e.profiles[k])); Object.assign(copy, { name: 'copy', base: k, baseProfile: k, custom: true });
    const e2 = new E(meta, {}); e2.profiles.self_fit = copy;
    const b = e2.rank(all, 'self_fit', { country: 'CH', subRanks: false });
    assert.deepStrictEqual(b.scored.map((x) => x.id), a.scored.map((x) => x.id), k + ': same eligible places in the same order');
    a.scored.slice(0, 50).forEach((x, i) => assert.ok(Math.abs(x.overall - b.scored[i].overall) < 1e-9, k + ': same scores'));
  }
});
test('NZ11-01: What-if applies the whole profile (base, rules) and restore keeps thresholds and must-haves or refuses the file', () => {
  const p = src('src/more/personal.js');
  assert.match(p, /JSON\.parse\(JSON\.stringify\(ENGINE\.profiles\[WI\.key\]/); assert.match(p, /base: p\.base \|\| p\.baseProfile \|\| WI\.key/);
  assert.doesNotMatch(p, /weights: Object\.assign\(\{\}, WI\.w\), strict: \{\}/);
  const fn = new Function('fin', 'ENGINE', /function ptCleanProfile\(c\) \{[\s\S]*?\n\}/.exec(p)[0] + '; return ptCleanProfile;')(Number.isFinite, { profiles: { coastal: {} } });
  const prof = { name: 'Mine', weights: { coast: 30, foundation: 20 }, strict: { coast: 40, foundation: 45 }, must: [{ k: 'shore_km', op: '<=', v: 15, label: 'shore within 15 km', unit: 'km' }], avoid: ['air'], base: 'coastal', minPop: 1000 };
  const back = fn(JSON.parse(JSON.stringify(prof)));
  assert.deepStrictEqual(back.strict, prof.strict); assert.deepStrictEqual(back.must, prof.must); assert.deepStrictEqual(back.avoid, prof.avoid); assert.strictEqual(back.base, 'coastal');
  assert.strictEqual(fn({ ...prof, must: [{ k: 'x', op: 'drop table', v: 1 }] }), null, 'a damaged must-have refuses the whole profile');
  assert.strictEqual(fn({ ...prof, base: 'nonexistent' }), null);
});
test('NZ11-02: shortlists never sort or subtract scores of different countries', () => {
  const p = src('src/more/personal.js');
  assert.match(p, /var ca = ccOf\(a\), cb = ccOf\(b\); if \(ca !== cb\) return/);
  assert.match(p, /a\.country === h\.country \? hs && hs\.score : null/);
  assert.match(p, /BYID\[e\.id\]\.country === r\.country/);
});
test('NZ11-03: a numbered ward is never the whole city; identity also needs a plausible size', async () => {
  const m = await import(path.join(R, 'build/megazones.mjs'));
  assert.strictEqual(m.sameUnit({ name: 'Johannesburg' }, 'City of Johannesburg 060'), false);
  assert.strictEqual(m.sameUnit({ name: 'Johannesburg' }, 'Johannesburg Ward'), false);
  assert.strictEqual(m.sameUnit({ name: 'Paris 12e Arrondissement' }, 'Paris 12e Arrondissement'), true);
  assert.strictEqual(m.sameUnit({ name: 'Wien' }, 'Wien 3'), false);
  assert.strictEqual(m.plausibleUnit({ population: 9418183 }, 6), false, '9.4 million people on 6 km2 is not the city');
  assert.strictEqual(m.plausibleUnit({ population: 9418183, area_km2: 1645 }, 1600), true);
  assert.strictEqual(m.plausibleUnit({ population: 50000, area_km2: 100 }, 20), false, 'a fifth of the recorded area is another unit');
  const J = JSON.parse(src('docs/audit/city_map_joins.json')).cities;
  for (const k in J) for (const z of J[k].zones) if (z.kind.startsWith('exact')) assert.ok(!/\d/.test(z.area) || /\d/.test(z.name), k + ': ' + z.name + ' joined to numbered area ' + z.area);
});
test('NZ11-06: Swiss size ranks follow population in every year; no growth across a boundary break', () => {
  const d = JSON.parse(src('data/c/CH.json')), C = Object.fromEntries(d.cols.map((k, i) => [k, i]));
  const live = d.rows.map((r, i) => i).filter((i) => !d.rows[i][C.sup] && d.trend[i]);
  const byYear = {};
  for (const i of live) { const pop = Object.fromEntries((d.trend[i].annual_population || []).map((e) => [e.year, e.population])); for (const e of d.trend[i].population_rank_series || []) (byYear[e.year] = byYear[e.year] || []).push([e.rank, pop[e.year]]); }
  for (const y in byYear) { const s = byYear[y].sort((a, b) => a[0] - b[0]); for (let n = 1; n < s.length; n++) assert.ok(s[n][1] <= s[n - 1][1], 'size rank inversion in ' + y); }
  const by = (name) => live.find((i) => d.rows[i][C.name] === name);
  const rk = (i) => d.trend[i].population_rank_series.at(-1).rank;
  assert.ok(rk(by('Baden')) < rk(by('Wettingen')), 'Baden (larger) ranks above Wettingen');
  const A = by('Assens'); assert.ok(!(d.trend[A].population_growth_rank_series || []).some((e) => e.year <= 2021), 'no growth rank across the 2021 merger');
});
test('NZ11-07: the 2010-2019 growth factor never holds a five-year value', () => {
  const d = JSON.parse(src('data/c/CH.json')), C = Object.fromEntries(d.cols.map((k, i) => [k, i]));
  const ab = new Set((d.periodFix.absorbed || []).map((k) => k.split(':')[1]));
  d.rows.forEach((r, i) => { if (ab.has(String(r[C.oid]))) { assert.strictEqual(d.fr.population_growth_pct[i], null, r[C.name]); assert.strictEqual(d.fs.population_growth_pct[i], null, r[C.name]); } });
});
test('NZ11-08: the scorecard shows the same resolved weights as the score, automatic categories labelled', () => {
  const p = src('src/more/personal.js'); assert.match(p, /ENGINE\.weightsFor\(r, key \|\| S\.profile\)/); assert.match(p, /added by the model where measured/);
});
test('NZ11-10: no test creates a file another test reads; the coverage record is a fixed build input', () => {
  assert.ok(fs.existsSync(path.join(R, 'build/r20_profile_coverage.json')));
  assert.match(src('build/r20_profile_coverage.py'), /if '--write' in sys\.argv: json\.dump\(\{'note'/);
});
test('NZ11-11: density equals shown population over shown area everywhere (within 5%)', () => {
  for (const f of fs.readdirSync(path.join(R, 'data/c'))) {
    const d = JSON.parse(src('data/c/' + f)), C = Object.fromEntries(d.cols.map((k, i) => [k, i])); if (!('dens' in C)) continue;
    for (const r of d.rows) { const p = r[C.pop], a = r[C.area], de = r[C.dens]; if (p >= 200 && a && de) assert.ok(Math.abs(de - p / a) / (p / a) <= 0.05, f + ' ' + r[C.name]); }
  }
});
test('NZ11-13/14/16: one registry for export and delete; shortlists merge across tabs; restore is a button; names match', () => {
  const p = src('src/more/personal.js'), c = src('src/js/00-core.js'), u = src('src/js/30-ui.js');
  assert.match(p, /'business-priority'\]/); assert.match(p, /data-mypick/); assert.doesNotMatch(p, /<label class="btn btn-sm">Restore from file/);
  assert.match(u, /Saved, remove from/); assert.doesNotMatch(u, /\? 'Remove from' :/);
  const merge = new Function(/function mergeList\(base, mine, theirs, idOf\) \{[\s\S]*?\n\}/.exec(c)[0] + '; return mergeList;')();
  const K = { id: 'CH:1059' }, B = { id: 'CH:4021' };
  assert.deepStrictEqual(merge([], [B], [K]).map((e) => e.id).sort(), ['CH:1059', 'CH:4021'], 'a stale tab keeps the other tab\'s addition');
  assert.deepStrictEqual(merge([K, B], [K], [K, B]).map((e) => e.id), ['CH:1059'], 'a deletion here is kept');
  assert.deepStrictEqual(merge([K, B], [K, B], [B]).map((e) => e.id), ['CH:4021'], 'a deletion elsewhere is kept');
  assert.match(c, /window\.addEventListener\('storage'/);
});
test('NZ11-15: consent changes in another tab are applied here, withdrawal first', () => {
  const b = src('build/build_site.mjs'); assert.match(b, /addEventListener\('storage',function\(e\)\{if\(e\.key===K/); assert.match(b, /visibilitychange/);
});
test('NZ11-17: no frost-frequency claim from monthly means', () => {
  const s = src('src/js/55-media.js'); assert.doesNotMatch(s, /night frost is rare/); assert.match(s, /these are monthly means/);
});
test('NZ11-18: sources resolve per country; every link field holds exactly one URL', () => {
  const e = new E(meta, {}), f = meta.factors.find((x) => x.id === 'n_obesity_us');
  const us = e.sourceFor(f, 'US'); assert.match(us.name, /County Health Rankings/); assert.ok(!/Office for National Statistics/.test(us.name));
  assert.strictEqual(e.sourceFor(f, 'FR').resolved, false, 'a country without its own registration never borrows another country\'s source');
  const U = /https?:\/\/[^\s;,)]+/g;
  for (const x of meta.factors) for (const o of [x, ...Object.values(x.by_country || {})]) for (const k of ['source_url', 'url']) if (typeof o[k] === 'string') assert.strictEqual((o[k].match(U) || []).length, 1, x.id + ' ' + k);
});
test('Sister-site links: only the owner-approved sites are ever linked', () => {
  const banned = /goaskbid|parleymap|ticketfomo|starppl|captainleague|solce\.ch/i;
  const files = ['build/build_site.mjs', 'build/content/about.json', 'build/policy_pages.mjs', 'build/seo_expand.mjs', 'src/shell.html'];
  for (const f of files) assert.doesNotMatch(src(f), banned, f);
  assert.match(src('build/build_site.mjs'), /https:\/\/tixterex\.com/);
});
test('Country atlas: separate pages, layers, daily games, insets; the app map is untouched', () => {
  const a = src('src/atlas/atlas.js'), b = src('build/atlas.mjs');
  assert.match(a, /\.at-l\[data-layer\]/, 'game buttons never change the layer'); assert.match(a, /function pin\(\)/); assert.match(a, /function duel\(\)/); assert.match(a, /function lens\(\)/);
  assert.match(a, /prefers-reduced-motion/); assert.match(b, /p = '\/' \+ slug \+ '\/atlas\/'/);
  assert.doesNotMatch(src('src/js/20-map.js'), /atlas/i, 'the existing map view does not load the atlas');
});
test('Rail and debt context: punctuality and IMF levels for all countries', () => {
  const P = JSON.parse(src('build/source/rail_punctuality.json')); assert.ok(P.rows.some((r) => r.cc === 'DE' && r.year === 2025 && r.pct === 60.1));
  for (const cc of ['CH', 'AT', 'SE', 'UK', 'FR', 'NL', 'BE', 'DE']) assert.ok(P.rows.some((r) => r.cc === cc && r.pct > 0 && /^https:\/\//.test(r.url) && r.rule), 'punctuality row with source for ' + cc);
  const M = new Set(JSON.parse(src('data/meta.json')).countries.map((c) => c.cc)); for (const r of P.rows) assert.ok(r.cc === 'EU' || M.has(r.cc), 'punctuality country code is a site country: ' + r.cc);
  assert.ok(!/above 80%/.test(src('build/insights_change.mjs')), 'no unsupported German history claim');
  const D = JSON.parse(src('build/source/imf_weo_2026apr_gg_debt_2025.json')); for (const cc of ['JP', 'US', 'FR', 'IT', 'DE', 'CN']) assert.ok(Number.isFinite(D.values[cc]), cc);
  assert.match(src('build/insights_change.mjs'), /id: 'rail_km'/);
});
test('Atlas v2: strategy-map frame, world map, regions, camera, no overlap of minimap and map', () => {
  const a = src('src/atlas/atlas.js'), b = src('build/atlas.mjs');
  assert.match(a, /function openRegion\(/); assert.match(a, /addEventListener\('wheel'/); assert.match(a, /function edges\(\)/); assert.match(a, /USED = \[\[W - 58, 0, 58, 150\]\]/, 'labels keep clear of the zoom buttons');
  assert.match(b, /page\(\{ p: '\/atlas\/', title: `World atlas/); assert.match(b, /<aside class="at-panel" id="at-panel" aria-live="polite"><canvas class="at-mini"/, 'the minimap sits in the panel, not on the map');
});

test('Atlas canvas uses the site fonts by their declared names', () => {
  const A = src('src/atlas/atlas.js'), B = src('src/css/base.css');
  const fams = new Set([...B.matchAll(/font-family:"([^"]+)"/g)].map((m) => m[1]));
  for (const m of A.matchAll(/ctx\.font = [^;]*?"([^"]+)"/g)) assert.ok(fams.has(m[1]), 'canvas font ' + m[1] + ' is declared in base.css');
  assert.ok(/document\.fonts\.load/.test(A), 'atlas redraws once the fonts have loaded');
  assert.ok(!/system-ui\}/.test(src('build/atlas.mjs').replace(/var\(--font-ui\)/g, '')), 'no bare system-ui control font');
});
