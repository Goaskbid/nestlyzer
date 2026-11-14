// Nestlyzer 2.15.25: industry clusters from official local job statistics, for every country that publishes jobs by sector
// per municipality (today: Switzerland, STATENT via the retained factors secondary_jobs_balance, tertiary_jobs_share and
// jobs_per_1000_residents). For each place: industry (secondary-sector) jobs and service jobs, summed over every place
// within 15 km (a cluster is regional: Baden's engineering firms employ people from the whole valley). Score 0-100 is the
// place's rank within its country on log(cluster jobs), blended 50/50 with its own sector intensity.
// Output: two numeric columns in data/x/<cc>.json, clu_ind and clu_svc. Applies nothing else. Re-run after data refresh.
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..');
const D = require(path.join(ROOT, 'src/data.js')), meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json')));
const fin = Number.isFinite, R = 15;
function km(a, b) { const t = Math.PI / 180, dl = (b.lat - a.lat) * t, dn = (b.lon - a.lon) * t, x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dn / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); }
function pr(vals) { const s = vals.filter(fin).slice().sort((a, b) => a - b); return (v) => { if (!fin(v)) return null; let lo = 0, hi = s.length; while (lo < hi) { const m = (lo + hi) >> 1; if (s[m] < v) lo = m + 1; else hi = m; } return s.length > 1 ? lo / (s.length - 1) * 100 : 50; }; }
for (const c of meta.countries) {
  const cf = path.join(ROOT, 'data/c', c.cc + '.json'), xf = path.join(ROOT, 'data/x', c.cc + '.json'); if (!fs.existsSync(cf) || !fs.existsSync(xf)) continue;
  const a = D.hydrate(JSON.parse(fs.readFileSync(cf)));
  const pts = a.map((r) => { const f = r.factorRaw || {}, pop = fin(r.popNow) ? r.popNow : r.population, j = fin(f.jobs_per_1000_residents) && fin(pop) ? f.jobs_per_1000_residents * pop / 1000 : null;
    return { lat: r.lat, lon: r.lon, ind: fin(j) && fin(f.secondary_jobs_balance) ? j * f.secondary_jobs_balance / 100 : null, svc: fin(j) && fin(f.tertiary_jobs_share) ? j * f.tertiary_jobs_share / 100 : null, sh: f.secondary_jobs_balance, ts: f.tertiary_jobs_share }; });
  const n = pts.filter((p) => fin(p.ind)).length; if (n < 50) continue;
  const catch_ = pts.map((p) => { if (!fin(p.lat)) return [null, null]; let i = 0, s = 0; for (const q of pts) if (fin(q.lat) && Math.abs(q.lat - p.lat) < 0.15 && km(p, q) <= R) { if (fin(q.ind)) i += q.ind; if (fin(q.svc)) s += q.svc; } return [i > 0 ? Math.log10(i) : null, s > 0 ? Math.log10(s) : null]; });
  const pi = pr(catch_.map((x) => x[0])), ps = pr(catch_.map((x) => x[1])), psh = pr(pts.map((p) => p.sh)), pts_ = pr(pts.map((p) => p.ts));
  const ind = pts.map((p, k) => { const a1 = pi(catch_[k][0]), b1 = psh(p.sh); return a1 == null ? null : Math.round(a1 * 0.5 + (b1 == null ? a1 : b1) * 0.5); });
  const svc = pts.map((p, k) => { const a1 = ps(catch_[k][1]), b1 = pts_(p.ts); return a1 == null ? null : Math.round(a1 * 0.5 + (b1 == null ? a1 : b1) * 0.5); });
  const xs = JSON.parse(fs.readFileSync(xf)); xs.cols.clu_ind = ind; xs.cols.clu_svc = svc; fs.writeFileSync(xf, JSON.stringify(xs));
  console.log(c.cc, n, 'places with sector jobs; examples', ['Baden', 'Turgi', 'Visp', 'Zürich', 'Sursee'].map((nm) => { const k = a.findIndex((r) => r.name === nm); return k < 0 ? '' : nm + ' ind ' + ind[k] + ' svc ' + svc[k]; }).filter(Boolean).join('; '));
}
