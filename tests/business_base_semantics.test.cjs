// 2.15.28 (audit 2.15.27, finding 3): unchanged business priorities must give the same result as the standard profile
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..'), D = require(path.join(R, 'src/data.js')), E = require(path.join(R, 'src/engine.js'));
const BP = require(path.join(R, 'src/js/26-business-priority.js'));
const meta = JSON.parse(fs.readFileSync(path.join(R, 'data/meta.json')));
const NM = { kg: 1, lake: 1, river: 1, port: 1, iport: 1, mport: 1, chem: 1, fin: 1, border: 1, metro: 1, land: 1, sea: 1, tz: 1, shore: 1 };
function load(cc) { const a = D.hydrate(JSON.parse(fs.readFileSync(path.join(R, 'data/c', cc + '.json')))); const xp = path.join(R, 'data/x', cc + '.json');
  if (fs.existsSync(xp)) { const xs = JSON.parse(fs.readFileSync(xp)); a.forEach((r, i) => { const o = {}; for (const k in xs.cols) { const v = xs.cols[k][i]; if (v != null) o[k] = NM[k] ? xs.strs[v] : v; } r.x = o; }); }
  return a.filter(r => !r.superseded); }
for (const [cc, names] of [['CH', ['Baden']], ['US', ['Leawood']]]) {
  test('unchanged priorities = standard profile, ' + cc, () => {
    const e = new E(meta, {}); const all = load(cc);
    const bases = Object.keys(e.profiles).filter(k => /^biz_/.test(k) && e.profiles[k].business && k !== 'biz_custom_fit');
    let checked = 0;
    for (const base of bases) {
      const sc = BP.create(e.profiles, base, Object.assign({}, e.profiles[base].weights));
      e.profiles.biz_custom_fit = sc.profile;
      for (const nm of names) { const r = all.find(x => x.name === nm || x.name.startsWith(nm + ' ')); if (!r) continue;
        const a = e.scoreRaw(r, base, 0, cc), b = e.scoreRaw(r, 'biz_custom_fit', 0, cc);
        assert.strictEqual(JSON.stringify(e.categoriesFor(r, 'biz_custom_fit')), JSON.stringify(e.categoriesFor(r, base)), base + ' categories ' + nm);
        assert.ok(Math.abs((a && a.score) - (b && b.score)) < 1e-9, base + ' ' + nm + ': ' + (a && a.score) + ' vs ' + (b && b.score)); checked++; }
    }
    assert.ok(checked > 0);
  });
}
