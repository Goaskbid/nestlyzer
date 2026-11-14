// Nestlyzer 2.15.26: industry clusters beyond Switzerland and the US.
//  1. Local, where a national office publishes jobs or establishments by industry per municipality:
//     France INSEE FLORES (employee positions, A88) and the Netherlands CBS 81575NED (establishments; counted as
//     establishments, never as jobs). Extracts: build/source/clusters/<cc>_local.csv (place official id, ind, svc, unit).
//  2. Regional fallback for every other EU country: Eurostat nama_10r_3empers, employment by NACE section per NUTS 3
//     region (industry = B-E, services = G-U). Marked clu_lvl = 2 (regional) so the card says so.
// Method (same as build_local_clusters.js): local jobs within 15 km, log, percentile within the country, blended 50/50
// with the place's own sector share. Regional: the region's sector jobs and share, percentile within the country.
// Never overwrites a country that already has local clusters (CH) unless a local extract is supplied.
const fs = require('fs'), path = require('path'), zlib = require('zlib'), ROOT = path.join(__dirname, '..');
const D = require(path.join(ROOT, 'src/data.js')), meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json')));
const fin = Number.isFinite, R = 15, SRC = path.join(ROOT, 'build/source/clusters');
function km(a, b) { const t = Math.PI / 180, dl = (b.lat - a.lat) * t, dn = (b.lon - a.lon) * t, x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dn / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); }
function pr(vals) { const s = vals.filter(fin).slice().sort((a, b) => a - b); return (v) => { if (!fin(v)) return null; let lo = 0, hi = s.length; while (lo < hi) { const m = (lo + hi) >> 1; if (s[m] < v) lo = m + 1; else hi = m; } return s.length > 1 ? lo / (s.length - 1) * 100 : 50; }; }
function readLocal(cc) {
  const f = path.join(SRC, cc + '_local.csv.gz'); if (!fs.existsSync(f)) return null;
  const m = new Map(); zlib.gunzipSync(fs.readFileSync(f)).toString().split('\n').slice(1).forEach((l) => { const [id, ind, svc] = l.split(','); if (id) m.set(id, { ind: +ind, svc: +svc }); });
  return m;
}
function readEurostat() {
  const f = path.join(SRC, 'eurostat_nama_10r_3empers.tsv.gz'); if (!fs.existsSync(f)) return null;
  const lines = zlib.gunzipSync(fs.readFileSync(f)).toString().split('\n'), head = lines[0].split('\t'), keys = head[0].split('\\')[0].split(',');
  const years = head.slice(1).map((y) => y.trim()), by = {};
  for (const l of lines.slice(1)) {
    if (!l) continue; const cells = l.split('\t'), k = Object.fromEntries(cells[0].split(',').map((v, i) => [keys[i], v]));
    if (k.wstatus !== 'EMP' || k.unit !== 'THS_PER' || k.geo.length !== 5) continue;
    for (let i = years.length - 1; i >= 0; i--) { const v = parseFloat(cells[i + 1]); if (fin(v)) { (by[k.geo] = by[k.geo] || { year: years[i] })[k.nace_r2] = v; break; } }
  }
  return by;
}
const EU = readEurostat(); let total = 0;
for (const c of meta.countries) {
  const cf = path.join(ROOT, 'data/c', c.cc + '.json'), xf = path.join(ROOT, 'data/x', c.cc + '.json'); if (!fs.existsSync(cf) || !fs.existsSync(xf)) continue;
  const xs = JSON.parse(fs.readFileSync(xf)), loc = readLocal(c.cc);
  if (!loc && xs.cols.clu_ind && !xs.cols.clu_lvl) continue;   // local clusters from another builder (CH)
  const a = D.hydrate(JSON.parse(fs.readFileSync(cf)));
  let ind = a.map(() => null), svc = a.map(() => null), lvl = a.map(() => null), nLoc = 0, nReg = 0;
  if (loc) {
    const pts = a.map((r) => { const v = loc.get(String(r.official_id)); return { lat: r.lat, lon: r.lon, ind: v ? v.ind : null, svc: v ? v.svc : null }; });
    const catch_ = pts.map((p) => { if (!fin(p.lat)) return [null, null]; let i = 0, s = 0; for (const q of pts) if (fin(q.lat) && Math.abs(q.lat - p.lat) < 0.15 && km(p, q) <= R) { if (fin(q.ind)) i += q.ind; if (fin(q.svc)) s += q.svc; } return [i > 0 ? Math.log10(i) : null, s > 0 ? Math.log10(s) : null]; });
    const sh = pts.map((p) => fin(p.ind) && fin(p.svc) && p.ind + p.svc > 0 ? p.ind / (p.ind + p.svc) : null);
    const pi = pr(catch_.map((x) => x[0])), ps = pr(catch_.map((x) => x[1])), psh = pr(sh), pts_ = pr(sh.map((v) => fin(v) ? 1 - v : null));
    pts.forEach((p, k) => { if (!fin(p.ind) && !fin(p.svc)) return; const a1 = pi(catch_[k][0]), b1 = psh(sh[k]), a2 = ps(catch_[k][1]), b2 = pts_(sh[k]);
      if (a1 != null) ind[k] = Math.round(a1 * 0.5 + (b1 == null ? a1 : b1) * 0.5); if (a2 != null) svc[k] = Math.round(a2 * 0.5 + (b2 == null ? a2 : b2) * 0.5); lvl[k] = 1; nLoc++; });
  }
  if (EU) {
    const reg = a.map((r) => { const e = EU[r.n3]; if (!e) return null; const i = e['B-E'], s = ['G-J', 'K-N', 'O-Q', 'R-U'].reduce((t, k) => t + (fin(e[k]) ? e[k] : 0), 0); return fin(i) && s > 0 ? { i, s, sh: i / (i + s) } : null; });
    const pi = pr(reg.map((v) => v && Math.log10(v.i))), ps = pr(reg.map((v) => v && Math.log10(v.s))), psh = pr(reg.map((v) => v && v.sh)), pss = pr(reg.map((v) => v && 1 - v.sh));
    reg.forEach((v, k) => { if (!v || lvl[k]) return; ind[k] = Math.round(pi(Math.log10(v.i)) * 0.5 + psh(v.sh) * 0.5); svc[k] = Math.round(ps(Math.log10(v.s)) * 0.5 + pss(1 - v.sh) * 0.5); lvl[k] = 2; nReg++; });
  }
  if (!nLoc && !nReg) continue;
  xs.cols.clu_ind = ind; xs.cols.clu_svc = svc; xs.cols.clu_lvl = lvl; fs.writeFileSync(xf, JSON.stringify(xs)); total += nLoc + nReg;
  console.log(c.cc, 'local', nLoc, 'regional', nReg);
}
console.log('places with an industry cluster score:', total);
