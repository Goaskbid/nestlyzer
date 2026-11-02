/* Rank snapshot for a rank-difference report (2.13.2): every household and business profile, every place of the given
   countries, rank and score with the app's engine.   node build/rank_snapshot.js out.json CH [DE ...] */
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const Engine = require(path.join(root, 'src/engine.js')), D = require(path.join(root, 'src/data.js'));
const meta = JSON.parse(fs.readFileSync(path.join(root, 'data/meta.json'))), e = new Engine(meta, { method: 'v2' });
const out = {}, [file, ...ccs] = process.argv.slice(2);
for (const cc of ccs) {
  const recs = D.hydrate(JSON.parse(fs.readFileSync(path.join(root, `data/c/${cc}.json`)))).filter((r) => !r.superseded);
  for (const k of (meta.config.order || [])) {
    const res = e.rank(recs, k, { country: cc, subRanks: false });
    out[cc + '|' + k] = Object.fromEntries(res.scored.map((x) => [x.id, [x.rank, +x.overall.toFixed(2), x.r.name, x.thin ? 1 : 0]]));
  }
}
fs.writeFileSync(file, JSON.stringify(out)); console.log('snapshot', Object.keys(out).length, 'rankings');
