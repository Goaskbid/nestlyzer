/* r20: plain-words search (Ask), letter grades and the five-question start. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
function loadAsk() {
  const ctx = { fold: (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), META: { countries: [{ cc: 'CH', name: 'Switzerland' }, { cc: 'AT', name: 'Austria' }, { cc: 'IT', name: 'Italy' }] }, profileName: (p) => p, countryName: (c) => c, fmtInt: (n) => n.toLocaleString('en-GB') };
  const f = new Function(...Object.keys(ctx), fs.readFileSync(path.join(R, 'src/js/62-ask.js'), 'utf8') + '; return parseAsk;');
  return f(...Object.values(ctx));
}
test('Ask reads profile, country, size and setting from plain words', () => {
  const parseAsk = loadAsk();
  const a = parseAsk('quiet lake town for retirees in Austria under 10,000');
  assert.strictEqual(a.profile, 'pensioner'); assert.strictEqual(a.cc, 'AT'); assert.strictEqual(a.f.popMax, 10000); assert.strictEqual(a.f.lakeKm, 3);
  const b = parseAsk('family near a big city with a train in Switzerland');
  assert.strictEqual(b.profile, 'young_family'); assert.strictEqual(b.f.cityKm, 30); assert.strictEqual(b.f.railKm, 3);
  assert.strictEqual(parseAsk('zurich'), null, 'a place name stays a place search');
  assert.strictEqual(parseAsk('bad homburg vor der hoehe'), null, 'a long place name is not a request');
});
test('Grades follow the score bands', () => {
  const src = fs.readFileSync(path.join(R, 'src/js/00-core.js'), 'utf8');
  const gradeOf = new Function('fin', /function gradeOf\(v\) \{[^\n]*\}/.exec(src)[0] + '; return gradeOf;')(Number.isFinite);
  assert.deepStrictEqual([95, 85, 75, 65, 55, 45, 10, NaN].map(gradeOf), ['A+', 'A', 'B', 'C', 'D', 'E', 'F', '']);
});
test('Five-question start: five steps over the builder groups and an apply button', () => {
  const s = fs.readFileSync(path.join(R, 'src/more/builder.js'), 'utf8');
  assert.match(s, /QORDER = \['household', 'budget', 'anchor', 'mobility', 'climate'\]/);
  assert.match(s, /data-bapply/); assert.match(s, /Question ' \+ \(QSTEP \+ 1\) \+ ' of '/);
  assert.match(fs.readFileSync(path.join(R, 'build/build_site.mjs'), 'utf8'), /data-start="quick"/);
});
test('Every data category is weighed by at least one profile', () => {
  const { execFileSync } = require('child_process');
  const out = execFileSync('python3', [path.join(R, 'build/r20_profile_coverage.py')], { encoding: 'utf8' });
  assert.match(out, /weighed by no profile: none/);
});
