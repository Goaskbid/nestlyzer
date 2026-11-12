// Nestlyzer evidence refinement (2.15.19). Uses observed outcomes to test small weight changes, with a geographic holdout,
// and never with categories that already contain the outcome (demographics, family), so agreement cannot rise by construction.
// For each household profile: candidates = +6 weight points on one category; tuned on half of the countries (train), kept only
// if agreement also rises on the other half (test) and does not fall in any large test country by more than 0.05.
// Output: docs/audit/evidence_refine.json (proposals with train/test numbers). Applies nothing by itself.
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..');
const D = require(path.join(ROOT, 'src/data.js')), E = require(path.join(ROOT, 'src/engine.js'));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json')));
const LAB = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/evidence/lab.json')));
const NM = { kg: 1, lake: 1, river: 1, port: 1, iport: 1, mport: 1, chem: 1, border: 1, metro: 1, land: 1, sea: 1, shore: 1 }, fin = Number.isFinite;
const PROFILES = (process.env.PROFILES || 'young_family,pensioner,remote,nature,budget,urban,commuter,first_home').split(',');
const CANDS = ['jobs', 'affordability', 'services', 'mobility', 'health', 'safety', 'climate', 'lifestyle'];
function ranks(v) { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2; i = j + 1; } return r; }
function rho(a, b) { const ra = ranks(a), rb = ranks(b), n = a.length, m = (n - 1) / 2; let s = 0, x = 0, y = 0; for (let i = 0; i < n; i++) { s += (ra[i] - m) * (rb[i] - m); x += (ra[i] - m) ** 2; y += (rb[i] - m) ** 2; } return x && y ? s / Math.sqrt(x * y) : 0; }
function outcome(r) { const f = r.factorRaw || {}, s = r.factorScores || {}; for (const k of ['common_population_growth_5y', 'population_growth_pct']) { if (fin(f[k])) return f[k]; if (fin(s[k])) return s[k]; } return r.trend && fin(r.trend.population_5y_pct) ? r.trend.population_5y_pct : null; }
const ccs = [...new Set(Object.entries(LAB.countries).filter(([, P]) => P.young_family && fin(P.young_family.rho)).map(([cc]) => cc))].sort();
const recsBy = {};
for (const cc of ccs) { const a = D.hydrate(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/c', cc + '.json')))), xp = path.join(ROOT, 'data/x', cc + '.json');
  if (fs.existsSync(xp)) { const xs = JSON.parse(fs.readFileSync(xp)); a.forEach((r, i) => { const o = {}; for (const k in xs.cols) { const v = xs.cols[k][i]; if (v != null) o[k] = NM[k] ? xs.strs[v] : v; } r.x = o; }); }
  recsBy[cc] = a.filter((r) => !r.superseded && fin(outcome(r))); }
const train = ccs.filter((_, i) => i % 2 === 0), test = ccs.filter((_, i) => i % 2 === 1);
function agree(weights, p, list) { const m = JSON.parse(JSON.stringify(meta)); m.config.profiles[p].weights = weights; const e = new E(m, {}); const out = {};
  for (const cc of list) { const res = e.rank(recsBy[cc], p, { country: cc, subRanks: false }).scored.filter((s) => fin(s.overall)); if (res.length < 30) continue; out[cc] = [rho(res.map((s) => s.overall), res.map((s) => outcome(s.r))), res.length]; } return out; }
const mean = (o) => { const v = Object.values(o); return v.length ? v.reduce((t, x) => t + x[0], 0) / v.length : 0; };
const report = { built: new Date().toISOString().slice(0, 10), train, test, rule: 'accept only if train and test agreement both rise by at least 0.02 and no test country with 300+ places falls by more than 0.05', profiles: {} };
for (const p of PROFILES) { const w0 = meta.config.profiles[p].weights, base = { train: agree(w0, p, train), test: agree(w0, p, test) };
  let best = null;
  for (const c of CANDS) { if (!(c in w0)) continue; const w = { ...w0, [c]: w0[c] + 6 }; const tr = agree(w, p, train), d = mean(tr) - mean(base.train); if (!best || d > best.d) best = { c, w, d, tr }; }
  const R = report.profiles[p] = { baseTrain: +mean(base.train).toFixed(3), baseTest: +mean(base.test).toFixed(3) };
  if (best && best.d >= 0.02) { const te = agree(best.w, p, test), dt = mean(te) - mean(base.test);
    const worst = Object.entries(te).filter(([cc, v]) => v[1] >= 300).map(([cc, v]) => [cc, v[0] - base.test[cc][0]]).sort((a, b) => a[1] - b[1])[0];
    Object.assign(R, { candidate: '+6 ' + best.c, train: +mean(best.tr).toFixed(3), test: +mean(te).toFixed(3), worstTestCountry: worst, accepted: dt >= 0.02 && (!worst || worst[1] >= -0.05), weights: best.w }); }
  else Object.assign(R, { candidate: best ? '+6 ' + best.c : null, trainGain: best ? +best.d.toFixed(3) : null, accepted: false });
  console.log(p, JSON.stringify(R)); }
fs.writeFileSync(path.join(ROOT, 'docs/audit/evidence_refine.json'), JSON.stringify(report, null, 1));
