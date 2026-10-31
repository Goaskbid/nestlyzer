// Profile audit (2.11.3): does each profile's top of the list give its target group what it needs?
//   node tests/profile_audit.js [CC,CC,...]   -> prints violations, writes tests/profile_audit.json
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..');
const D = require(path.join(ROOT, 'src/data.js')), E = require(path.join(ROOT, 'src/engine.js'));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json')));
const eng = new E(meta, {});
const NM = { kg: 1, lake: 1, river: 1, port: 1, iport: 1, mport: 1, chem: 1, fin: 1, econ: 1, border: 1, metro: 1, land: 1, sea: 1, tz: 1, shore: 1 };
const CCS = (process.argv[2] || 'CH,DE,FR,IT,UK,NL,ES,US').split(',');
const dormant = new Set(meta.config.bizDormant || []);
const profiles = Object.entries(meta.config.profiles).filter(([k, p]) => p.weights && k !== 'self_fit' && k !== 'swiss_lottery' && !dormant.has(k));
// affluent enclaves: never a fit for people on a tight budget
const RICH = /^(Zumikon|Küsnacht \(ZH\)|Küsnacht|Zollikon|Erlenbach \(ZH\)|Herrliberg|Kilchberg \(ZH\)|Rüschlikon|Meilen|Uetikon am See|Wollerau|Freienbach|Feusisberg|Zug|Baar|Walchwil|Risch|Oberägeri|Saanen|St\. Moritz|Val de Bagnes|Zermatt|Davos|Crans-Montana|Cologny|Vandœuvres|Genthod|Anières|Collonge-Bellerive|Pully|Grünwald|Starnberg|Pullach i\.Isartal|Pullach|Kronberg im Taunus|Königstein im Taunus|Bad Homburg v\.d\.Höhe|Feldafing|Kampen \(Sylt\)|Tegernsee|Rottach-Egern|Neuilly-sur-Seine|Saint-Cloud|Saint-Jean-Cap-Ferrat|Megève|Courchevel|Le Vésinet|Marnes-la-Coquette|Ramatuelle|Portofino|Cortina d'Ampezzo|Forte dei Marmi|Capri|Wassenaar|Bloemendaal|Laren|Blaricum|Elmbridge|Kensington and Chelsea|Westminster|Pozuelo de Alarcón|Marbella|Beverly Hills|Atherton|Palo Alto|Hillsborough|Greenwich|Scarsdale|Aspen)$/;
const BUDGET = new Set(['low_income', 'low_income_family', 'single_parent', 'budget', 'first_home']);
const out = { checked: 0, issues: [] };
function issue(p, cc, kind, msg) { out.issues.push({ p, cc, kind, msg }); }
for (const cc of CCS) {
  const all = D.hydrate(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/c', cc + '.json'))));
  const xp = path.join(ROOT, 'data/x', cc + '.json'), xs = fs.existsSync(xp) ? JSON.parse(fs.readFileSync(xp)) : null;
  if (xs) all.forEach((r, i) => { const o = {}; for (const k in xs.cols) { const v = xs.cols[k][i]; if (v != null) o[k] = NM[k] ? xs.strs[v] : v; } r.x = o; });
  const scope = all.filter((r) => !r.superseded && !r.whole);
  for (const [k, pr] of profiles) {
    const res = eng.rank(scope, k, { country: cc, subRanks: false }); out.checked++;
    const top = res.scored.slice(0, 10), w = pr.weights, tot = Object.values(w).reduce((a, b) => a + b, 0);
    if (top.length < 5) { issue(k, cc, 'thin', `only ${res.scored.length} places pass`); continue; }
    const core = Object.keys(w).filter((c) => w[c] / tot >= 0.15);
    for (const c of core) {
      const vals = top.map((s) => (s.catScores || eng.categoriesFor(s.r, k))[c]);
      const have = vals.filter((v) => v != null);
      if (!have.length) continue;
      const mean = have.reduce((a, b) => a + b, 0) / have.length;
      const weak = top.filter((s, i) => vals[i] != null && vals[i] < 40).map((s, i) => s.r.name + ' ' + Math.round((s.catScores || {})[c]));
      if (mean < 60) issue(k, cc, 'core-mean', `${c} (${Math.round(100 * w[c] / tot)}% of the weight) averages ${Math.round(mean)} in the top 10`);
      // 2.12: an absolute measure that no place in the country reaches (mountains in the Netherlands, a higher-paying
      // neighbour from Northern Ireland) is a fact about the country, reported, not a ranking defect
      const all90 = res.scored.map((t) => (t.catScores || eng.categoriesFor(t.r, k))[c]).filter((v) => v != null).sort((a, b) => a - b);
      const p90 = all90.length ? all90[Math.floor(all90.length * 0.9)] : 100;
      if (weak.length && p90 < 40) { issue(k, cc, 'country-lacks', `${c}: no place in the country scores well (90th percentile ${Math.round(p90)})`); continue; }
      if (weak.length) issue(k, cc, 'core-weak', `${c}: ${weak.length} of the top 10 under 40: ${weak.slice(0, 4).join(', ')}`);
    }
    if (BUDGET.has(k)) { const rich = res.scored.slice(0, 20).filter((s) => RICH.test(s.r.name)).map((s) => s.r.name + ' #' + (res.scored.indexOf(s) + 1)); if (rich.length) issue(k, cc, 'rich-enclave', rich.join(', ')); }
    if (k === 'student') { const lo = top.filter((s) => !(s.r.x && s.r.x.unitown_pct >= 70)).map((s) => s.r.name + ' ' + (s.r.x && s.r.x.unitown_pct)); if (lo.length > 3) issue(k, cc, 'student-town', `${lo.length} of the top 10 are not university towns: ${lo.slice(0, 4).join(', ')}`); }
  }
  process.stderr.write(cc + ' ');
}
const by = {}; out.issues.forEach((i) => { (by[i.p] = by[i.p] || []).push(i); });
for (const p of Object.keys(by).sort()) { console.log('\n== ' + p + ' (' + by[p].length + ')'); by[p].slice(0, 12).forEach((i) => console.log('  ' + i.cc + ' ' + i.kind + ': ' + i.msg)); }
console.log('\nprofiles x countries checked:', out.checked, ' issues:', out.issues.length, ' profiles with issues:', Object.keys(by).length, 'of', profiles.length);
fs.writeFileSync(path.join(ROOT, 'tests/profile_audit.json'), JSON.stringify(out, null, 1));
// gate (2.11.3): no affluent enclave in a budget profile's top 20; weak core needs in a top 10 stay rare
const rich = out.issues.filter((i) => i.kind === 'rich-enclave').length, weak = out.issues.filter((i) => i.kind === 'core-weak').length;
console.log(`PROFILE AUDIT: ${rich === 0 && weak <= 15 ? 'PASS' : 'FAIL'} (rich enclaves in budget top 20: ${rich}; weak core needs in a top 10: ${weak}, limit 15)`);
process.exitCode = rich === 0 && weak <= 15 ? 0 : 1;
