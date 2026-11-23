// r17: real city outlines for the megacity zone maps. Developer tool, run once when the boundary sources change:
//   node build/make_city_shapes.mjs /path/to/geoBoundaries/files /path/to/node_modules/polygon-clipping
// Input: geoBoundaries gbOpen simplified files (https://www.geoboundaries.org, open licences per country, named
// <ISO3>_<ADMn>.geojson). Output: build/source/megacity_shapes.json with, per city, the administrative areas inside the
// map frame (kilometres east and south of the city centre, simplified to 100 m) and the land they cover. The build
// (megazones.mjs) uses them to draw real coastlines, rivers and district boundaries instead of a circle.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { MEGA } from './megazones.mjs';
const [, , GB, PCP] = process.argv;
const require = createRequire(import.meta.url);
const pc = require(PCP || 'polygon-clipping');
const ISO = { UK: 'GBR', JP: 'JPN', US: 'USA', MX: 'MEX', CN: 'CHN', TR: 'TUR', KR: 'KOR', HK: 'CHN', SG: 'SGP', AR: 'ARG', BR: 'BRA', TH: 'THA', PH: 'PHL', IN: 'IND', RU: 'RUS', ES: 'ESP', IT: 'ITA', CA: 'CAN', MY: 'MYS', ID: 'IDN', ZA: 'ZAF', EG: 'EGY', VN: 'VNM', AU: 'AUS', CO: 'COL', AE: 'ARE', SA: 'SAU', IL: 'ISR', TW: 'TWN', MA: 'MAR', NZ: 'NZL', DE: 'DEU', PT: 'PRT', EL: 'GRC', PL: 'POL', NL: 'NLD', BE: 'BEL', SE: 'SWE', DK: 'DNK', FR: 'FRA' };
const cache = {};
function load(iso, lvl) { const k = iso + '_' + lvl, f = path.join(GB, k + '.geojson'); if (!(k in cache)) cache[k] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).features : null; return cache[k]; }
function rdp(pts, eps) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
  while (st.length) { const [a, b] = st.pop(); let mx = 0, mi = -1; const [x1, y1] = pts[a], [x2, y2] = pts[b], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / L; if (d > mx) { mx = d; mi = i; } }
    if (mx > eps && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); } }
  return pts.filter((p, i) => keep[i]);
}
// closed rings: split at the point farthest from the first one, simplify both halves
function rdpRing(ring, eps) {
  const r = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring.slice();
  if (r.length < 4) return r; let m = 0, md = -1; for (let i = 1; i < r.length; i++) { const d = Math.hypot(r[i][0] - r[0][0], r[i][1] - r[0][1]); if (d > md) { md = d; m = i; } }
  const a = rdp(r.slice(0, m + 1), eps), b = rdp(r.slice(m).concat([r[0]]), eps); return a.concat(b.slice(1, -1));
}
const area = (r) => Math.abs(r.reduce((t, p, i) => { const q = r[(i + 1) % r.length]; return t + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
const out = { source: 'geoBoundaries gbOpen (Runfola et al. 2020, PLOS ONE; open licences per country), simplified to about 100 m', cities: {} };
for (const [k, n, cc, la, lo, R] of MEGA) {
  const iso = ISO[cc]; const kx = 111.32 * Math.cos(la * Math.PI / 180), ky = 110.57;
  const F = R * 1.02, frame = [[[-F, -F], [F, -F], [F, F], [-F, F], [-F, -F]]];
  const levels = [];
  for (const lvl of ['ADM4', 'ADM3', 'ADM2', 'ADM1']) {
    const fs0 = load(iso, lvl); if (!fs0) continue;
    const areas = [];
    for (const f of fs0) {
      const g = f.geometry; if (!g) continue;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      // quick reject by bounding box
      let hit = false; for (const P of polys) for (const p of P[0]) { const x = (p[0] - lo) * kx, y = (la - p[1]) * ky; if (Math.abs(x) < F * 1.5 && Math.abs(y) < F * 1.5) { hit = true; break; } }
      if (!hit) continue;
      const km = polys.map((P) => P.map((ring) => ring.map((p) => [(p[0] - lo) * kx, (la - p[1]) * ky])));
      let cut; try { cut = pc.intersection(km, frame); } catch (e) { if (process.env.DBG) console.log("x", e.message); continue; }
      if (!cut.length) continue;
      const sim = (ring) => { const s = rdpRing(ring, 0.18).map((p) => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]); return s.length >= 4 && area(s) > 0.02 ? s : null; };
      const mp = cut.map((P) => P.map(sim).filter(Boolean)).filter((P) => P.length && P[0] === P[0]);
      if (mp.length) areas.push({ n: f.properties.shapeName || '', mp, a: cut.reduce((t, P) => t + area(P[0]) - P.slice(1).reduce((u, h) => u + area(h), 0), 0) });
    }
    if (process.env.DBG) console.log(k, lvl, fs0.length, areas.length);
    if (areas.length) levels.push({ lvl, areas });
  }
  if (!levels.length) { console.log(k, 'no boundary file'); continue; }
  // land = union of the coarsest level available (fewest seams), clipped to the frame
  const coarse = levels[levels.length - 1];
  let land; try { land = pc.union(...coarse.areas.map((a) => a.mp)); } catch (e) { console.log(k, 'union failed', e.message); land = null; }
  const landR = []; if (land) for (const P of land) { const Q = P.map((ring) => rdpRing(ring, 0.18).map((p) => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100])).filter((r) => r.length >= 4); if (Q.length && area(Q[0]) > 0.05) landR.push(Q); }
  const landShare = landR.reduce((t, P) => t + area(P[0]) - P.slice(1).reduce((u, h) => u + area(h), 0), 0) / (4 * F * F);
  out.cities[k] = { iso, R, land: landR, levels: levels.map((L) => ({ lvl: L.lvl, areas: L.areas.filter((a) => a.a > 0.05).map((a) => ({ n: a.n, mp: a.mp })) })) };
  console.log(k, iso, 'levels', levels.map((L) => L.lvl + ':' + L.areas.length).join(' '), 'land share', landShare.toFixed(2));
}
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'source', 'megacity_shapes.json'), JSON.stringify(out));
console.log('written', (JSON.stringify(out).length / 1e6).toFixed(2), 'MB');
