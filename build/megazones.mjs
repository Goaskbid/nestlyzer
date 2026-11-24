/* r15: city zones for the world's megacities. Where a big city's districts, wards or neighbouring towns are already
   ranked Nestlyzer places, they become zones: each zone is the area closest to its place centre (a Voronoi cell inside
   a disc around the city centre), so the map is schematic, not official boundaries, and says so. Zone scores are the
   places' own Nestlyzer scores; ranks are within the city. Aggregate records that contain the others (a whole city next
   to its own districts) are left out so nothing is counted twice. */
export const MEGA = [
  ['london', 'London area', 'UK', 51.5074, -0.1278, 20, 'Charing Cross'], ['tokyo', 'Tokyo area', 'JP', 35.6812, 139.7671, 22, 'Tokyo Station'],
  ['new-york', 'New York area', 'US', 40.7128, -74.006, 22, 'City Hall'], ['mexico-city', 'Mexico City area', 'MX', 19.4326, -99.1332, 22, 'Zócalo'],
  ['shanghai', 'Shanghai', 'CN', 31.2304, 121.4737, 32, 'People’s Square'], ['istanbul', 'Istanbul', 'TR', 41.0082, 28.9784, 30, 'Sultanahmet'],
  ['seoul', 'Seoul area', 'KR', 37.5665, 126.978, 22, 'City Hall'], ['hong-kong', 'Hong Kong', 'HK', 22.3193, 114.1694, 30, 'Central'],
  ['singapore', 'Singapore', 'SG', 1.3521, 103.8198, 25, 'City Hall'], ['buenos-aires', 'Buenos Aires area', 'AR', -34.6037, -58.3816, 22, 'Plaza de Mayo'],
  ['sao-paulo', 'São Paulo area', 'BR', -23.5505, -46.6333, 25, 'Praça da Sé'], ['bangkok', 'Bangkok area', 'TH', 13.7563, 100.5018, 25, 'Democracy Monument'],
  ['manila', 'Metro Manila', 'PH', 14.5995, 120.9842, 18, 'Rizal Park'], ['los-angeles', 'Los Angeles area', 'US', 34.0522, -118.2437, 25, 'City Hall'],
  ['delhi', 'Delhi area', 'IN', 28.6139, 77.209, 25, 'Connaught Place'], ['moscow', 'Moscow area', 'RU', 55.7558, 37.6173, 25, 'Red Square'],
  ['madrid', 'Madrid area', 'ES', 40.4168, -3.7038, 22, 'Puerta del Sol'], ['milan', 'Milan area', 'IT', 45.4642, 9.19, 20, 'Piazza del Duomo'],
  ['toronto', 'Toronto area', 'CA', 43.6532, -79.3832, 25, 'Nathan Phillips Square'], ['kuala-lumpur', 'Kuala Lumpur area', 'MY', 3.139, 101.6869, 22, 'Merdeka Square'],
  ['jakarta', 'Jakarta area', 'ID', -6.2088, 106.8456, 25, 'Monas'], ['johannesburg', 'Johannesburg area', 'ZA', -26.2041, 28.0473, 25, 'Gandhi Square'],
  ['cairo', 'Cairo area', 'EG', 30.0444, 31.2357, 20, 'Tahrir Square'], ['ho-chi-minh', 'Ho Chi Minh City area', 'VN', 10.8231, 106.6297, 20, 'Ben Thanh Market'],
  // r17: more cities, drawn from real boundaries from the start (a city appears only with at least 8 ranked places)
  ['osaka', 'Osaka area', 'JP', 34.6937, 135.5023, 22, 'Osaka Station'], ['nagoya', 'Nagoya area', 'JP', 35.1815, 136.9066, 20, 'Nagoya Station'],
  ['beijing', 'Beijing', 'CN', 39.9042, 116.4074, 30, 'Tiananmen Square'], ['shenzhen', 'Shenzhen', 'CN', 22.5431, 114.0579, 30, 'Civic Center'],
  ['guangzhou', 'Guangzhou', 'CN', 23.1291, 113.2644, 30, 'Haizhu Square'], ['mumbai', 'Mumbai area', 'IN', 19.076, 72.8777, 25, 'Chhatrapati Shivaji Terminus'],
  ['kolkata', 'Kolkata area', 'IN', 22.5726, 88.3639, 22, 'BBD Bagh'], ['bengaluru', 'Bengaluru area', 'IN', 12.9716, 77.5946, 22, 'Vidhana Soudha'],
  ['rio-de-janeiro', 'Rio de Janeiro area', 'BR', -22.9068, -43.1729, 25, 'Praça XV'], ['chicago', 'Chicago area', 'US', 41.8781, -87.6298, 25, 'The Loop'],
  ['san-francisco', 'San Francisco Bay', 'US', 37.7749, -122.4194, 30, 'Union Square'], ['houston', 'Houston area', 'US', 29.7604, -95.3698, 30, 'City Hall'],
  ['miami', 'Miami area', 'US', 25.7617, -80.1918, 25, 'Bayfront Park'], ['sydney', 'Sydney', 'AU', -33.8688, 151.2093, 30, 'Circular Quay'],
  ['melbourne', 'Melbourne', 'AU', -37.8136, 144.9631, 30, 'Flinders Street Station'], ['montreal', 'Montreal area', 'CA', 45.5017, -73.5673, 22, 'Place d’Armes'],
  ['vancouver', 'Vancouver area', 'CA', 49.2827, -123.1207, 22, 'Waterfront Station'], ['bogota', 'Bogotá area', 'CO', 4.711, -74.0721, 20, 'Plaza de Bolívar'],
  ['dubai', 'Dubai area', 'AE', 25.2048, 55.2708, 30, 'Dubai Creek'], ['riyadh', 'Riyadh', 'SA', 24.7136, 46.6753, 25, 'Al Masmak'],
  ['tel-aviv', 'Tel Aviv area', 'IL', 32.0853, 34.7818, 18, 'Dizengoff Square'], ['taipei', 'Taipei area', 'TW', 25.033, 121.5654, 20, 'Taipei Main Station'],
  ['busan', 'Busan area', 'KR', 35.1796, 129.0756, 20, 'Busan Station'], ['casablanca', 'Casablanca area', 'MA', 33.5731, -7.5898, 20, 'United Nations Square'],
  ['cape-town', 'Cape Town area', 'ZA', -33.9249, 18.4241, 25, 'Greenmarket Square'], ['auckland', 'Auckland', 'NZ', -36.8485, 174.7633, 22, 'Britomart'],
  ['rome', 'Rome area', 'IT', 41.9028, 12.4964, 22, 'Piazza Venezia'], ['naples', 'Naples area', 'IT', 40.8518, 14.2681, 20, 'Piazza del Plebiscito'],
  ['munich', 'Munich area', 'DE', 48.1351, 11.582, 22, 'Marienplatz'], ['hamburg', 'Hamburg area', 'DE', 53.5511, 9.9937, 22, 'Rathausmarkt'],
  ['ruhr', 'Rhine-Ruhr', 'DE', 51.4556, 7.0116, 30, 'Essen Hauptbahnhof'], ['manchester', 'Manchester area', 'UK', 53.4808, -2.2426, 20, 'Piccadilly Gardens'],
  ['birmingham', 'Birmingham area', 'UK', 52.4862, -1.8904, 20, 'Victoria Square'], ['lisbon', 'Lisbon area', 'PT', 38.7223, -9.1393, 22, 'Praça do Comércio'],
  ['athens', 'Athens area', 'EL', 37.9838, 23.7275, 18, 'Syntagma Square'], ['warsaw', 'Warsaw area', 'PL', 52.2297, 21.0122, 22, 'Castle Square'],
  ['randstad', 'Amsterdam and Randstad', 'NL', 52.3676, 4.9041, 30, 'Dam Square'], ['brussels', 'Brussels area', 'BE', 50.8503, 4.3517, 22, 'Grand-Place'],
  ['stockholm', 'Stockholm area', 'SE', 59.3293, 18.0686, 25, 'Sergels torg'], ['copenhagen', 'Copenhagen area', 'DK', 55.6761, 12.5683, 25, 'City Hall Square'],
  ['marseille', 'Marseille area', 'FR', 43.2965, 5.3698, 22, 'Vieux-Port'], ['lyon', 'Lyon area', 'FR', 45.764, 4.8357, 20, 'Place Bellecour']];
const PROF = ['young_family', 'young_professional', 'pensioner'];
// clip a convex polygon by the half-plane closer to a than to b
function clip(poly, a, b) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = b[0] - a[0], ny = b[1] - a[1], side = (p) => (p[0] - mx) * nx + (p[1] - my) * ny;
  const out = []; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], sp = side(p), sq = side(q);
    if (sp <= 0) out.push(p); if ((sp < 0) !== (sq < 0) && sp !== sq) { const t = sp / (sp - sq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); } }
  return out;
}
/* r17: real geography. build/source/megacity_shapes.json (made by build/make_city_shapes.mjs from geoBoundaries) holds
   the administrative areas and the land of each city frame. Every administrative area is shared out among the ranked
   places inside it (each gets the part closest to it); an area with no ranked place goes to the nearest place within the
   city radius, anything farther stays plain land. Coastlines, rivers, bays and district borders are therefore real; only
   where one official area holds several ranked places is the split between them the nearest-place rule. */
import fs from 'node:fs';
import path from 'node:path';
const SHAPES = (() => { try { return JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'source', 'megacity_shapes.json'), 'utf8')); } catch (e) { return null; } })();
// Sutherland-Hodgman: a ring (any shape) clipped by a convex polygon (counter-clockwise or clockwise)
function clipRing(ring, conv) {
  let out = ring; const n = conv.length, sgn = Math.sign(conv.reduce((t, p, i) => { const q = conv[(i + 1) % n]; return t + p[0] * q[1] - q[0] * p[1]; }, 0)) || 1;
  for (let i = 0; i < n && out.length; i++) {
    const a = conv[i], b = conv[(i + 1) % n], inside = (p) => sgn * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) >= 0, inp = out; out = [];
    for (let j = 0; j < inp.length; j++) { const p = inp[j], q = inp[(j + 1) % inp.length], ip = inside(p), iq = inside(q);
      if (ip) out.push(p);
      if (ip !== iq) { const dx = q[0] - p[0], dy = q[1] - p[1], ex = b[0] - a[0], ey = b[1] - a[1], den = dx * ey - dy * ex; if (den) { const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den; out.push([p[0] + t * dx, p[1] + t * dy]); } } }
  }
  return out;
}
const ringArea = (r) => r.reduce((t, p, i) => { const q = r[(i + 1) % r.length]; return t + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
function inRing(pt, r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
const inMP = (pt, mp) => mp.some((P) => inRing(pt, P[0]) && !P.slice(1).some((h) => inRing(pt, h)));
function centroid(mp) { let A = 0, x = 0, y = 0; for (const P of mp) { const r = P[0]; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length], f = p[0] * q[1] - q[0] * p[1]; A += f; x += (p[0] + q[0]) * f; y += (p[1] + q[1]) * f; } } return A ? [x / (3 * A), y / (3 * A)] : mp[0][0][0]; }
function cellOf(o, others, F) { let poly = [[-F, -F], [F, -F], [F, F], [-F, F]]; for (const q of others) if (q !== o) { poly = clip(poly, o.p, q.p); if (poly.length < 3) break; } return poly; }
function realZones(k, mem, R) {
  const C = SHAPES && SHAPES.cities[k]; if (!C) return null;
  const F = R * 1.02;
  // the level whose areas hold the ranked places most one-to-one
  let best = null;
  for (const L of C.levels) {
    const holder = mem.map((o) => L.areas.findIndex((a) => inMP(o.p, a.mp)));
    const inside = holder.filter((h) => h >= 0).length; if (inside < mem.length * 0.8) continue;
    const per = {}; holder.forEach((h) => { if (h >= 0) per[h] = (per[h] || 0) + 1; });
    const single = Object.values(per).filter((v) => v === 1).length / mem.length;
    const sc = single - (L.areas.length > 6 * mem.length ? 0.5 : 0);
    if (!best || sc > best.sc) best = { L, holder, sc };
  }
  if (!best) return null;
  const pieces = new Map(mem.map((o) => [o, []])), plain = [], exact = new Map(mem.map((o) => [o, 0]));
  best.L.areas.forEach((a, ai) => {
    const own = mem.filter((o, i) => best.holder[i] === ai);
    if (own.length === 1) { pieces.get(own[0]).push(...a.mp); exact.set(own[0], exact.get(own[0]) + 1); return; }
    if (own.length > 1) { for (const o of own) { const cell = cellOf(o, own, F * 2); for (const P of a.mp) { const outer = clipRing(P[0], cell); if (outer.length >= 3 && Math.abs(ringArea(outer)) > 0.01) pieces.get(o).push([outer, ...P.slice(1).map((h) => clipRing(h, cell)).filter((h) => h.length >= 3)]); } } return; }
    const c = centroid(a.mp); if (Math.hypot(c[0], c[1]) > R) { plain.push(...a.mp); return; }
    let near = null, nd = 1e9; for (const o of mem) { const d = Math.hypot(o.p[0] - c[0], o.p[1] - c[1]); if (d < nd) { nd = d; near = o; } }
    pieces.get(near).push(...a.mp); exact.set(near, exact.get(near) - 1000);
  });
  return { pieces, plain, land: C.land, level: best.L.lvl, exact };   // exact: the zone is exactly one official area
}
// draws rings as one SVG path (even-odd fill), simplified to whole pixels
function pathOf(mp, X, Y) {
  let d = ''; for (const P of mp) for (const r of P) { let last = null, pts = [];
    for (const p of r) { const q = [Math.round(X(p[0])), Math.round(Y(p[1]))]; if (!last || Math.abs(q[0] - last[0]) + Math.abs(q[1] - last[1]) >= 3) { pts.push(q); last = q; } }
    if (pts.length >= 3) d += 'M' + pts.map((q) => q[0] + ' ' + q[1]).join('L') + 'Z'; }
  return d;
}
function membersOf(SH, la, lo, R, cc) {
  const kx = 111.32 * Math.cos(la * Math.PI / 180), xy = (r) => [(r.lon - lo) * kx, (la - r.lat) * 110.57];
  let mem = SH[cc].recs.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon) && (r.popNow || r.population) >= 30000).map((r) => ({ r, p: xy(r) })).filter((o) => Math.hypot(o.p[0], o.p[1]) <= R);
  const tot = mem.reduce((t, o) => t + (o.r.popNow || o.r.population), 0);
  mem = mem.filter((o) => (o.r.popNow || o.r.population) < 0.4 * (tot - (o.r.popNow || o.r.population)) || mem.length < 4);   // drop whole-city aggregates
  const seen = new Set(); return mem.filter((o) => { const key = Math.round(o.p[0] * 2) + ',' + Math.round(o.p[1] * 2); if (seen.has(key)) return false; seen.add(key); return true; });
}
/* r18: which world-city map a place belongs to (place pages link to it) */
export function megaMembership(SH) {
  const out = {};
  for (const [k, n, cc, la, lo, R] of MEGA) { if (!SH[cc]) continue; const mem = membersOf(SH, la, lo, R, cc); if (mem.length < 8) continue; for (const o of mem) if (!out[o.r.id]) out[o.r.id] = [k, n.replace(/ area$/, ''), mem.length]; }
  return out;
}
export function megaZones({ SH, RANK, PAGES }) {
  const out = [];
  for (const [k, n, cc, la, lo, R, ctrName] of MEGA) {
    if (!SH[cc] || !RANK[cc]) continue;
    const kx = 111.32 * Math.cos(la * Math.PI / 180), xy = (r) => [(r.lon - lo) * kx, (la - r.lat) * 110.57];
    let mem = membersOf(SH, la, lo, R, cc);
    if (mem.length < 8) continue;
    const W = 1000, S = W / (2 * R), H = W, X = (x) => (x + R) * S, Y = (y) => (y + R) * S;
    const disc = Array.from({ length: 72 }, (_, i) => [R * Math.cos(i * Math.PI / 36), R * Math.sin(i * Math.PI / 36)]);
    const real = realZones(k, mem, R);
    const Z = mem.map((o) => { let poly = disc; if (!real) for (const q of mem) if (q !== o) { poly = clip(poly, o.p, q.p); if (poly.length < 3) break; }
      const area = Math.abs(poly.reduce((t, p, i) => { const q = poly[(i + 1) % poly.length]; return t + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
      const s = {}; for (const pf of PROF) { const a = RANK[cc][pf] && RANK[cc][pf].byId[o.r.id]; s[pf] = a ? Math.round(a.score) : null; }
      const pop = o.r.popNow || o.r.population;
      return { c: String(o.r.id), n: o.r.name.replace(/ \((?:Tokyo|New York|Shanghai|Moscow)\)$/, ''), u: PAGES[o.r.id] || '', d: real ? pathOf(real.pieces.get(o), X, Y) : 'M' + poly.map((p) => X(p[0]).toFixed(0) + ' ' + Y(p[1]).toFixed(0)).join('L') + 'Z', lx: +X(o.p[0]).toFixed(1), ly: +Y(o.p[1]).toFixed(1), km2: Math.round(real ? real.pieces.get(o).reduce((t, P) => t + Math.abs(ringArea(P[0])) - P.slice(1).reduce((u, h) => u + Math.abs(ringArea(h)), 0), 0) : area),
        v: { pop, dens: o.r.area_km2 > 0 ? Math.round(pop / o.r.area_km2) : (real && real.exact.get(o) === 1 ? Math.round(pop / Math.max(0.5, real.pieces.get(o).reduce((t, P) => t + Math.abs(ringArea(P[0])) - P.slice(1).reduce((u, h) => u + Math.abs(ringArea(h)), 0), 0))) : null), dist: Math.round(Math.hypot(o.p[0], o.p[1]) * 10) / 10 }, s }; }).filter((z) => z.d.length > 10);
    for (const pf of PROF) { const order = Z.filter((z) => z.s[pf] != null).sort((a, b) => b.s[pf] - a.s[pf]); order.forEach((z, i) => { (z.r = z.r || {})[pf] = i + 1; }); }
    out.push({ k, n, cc, w: W, h: H, ctr: [X(0), Y(0), ctrName], ind: { pop: ['Residents', ''], dens: ['Residents per km²', ''], dist: ['Distance to ' + ctrName, ' km'] }, z: Z,
      src: [['Nestlyzer place scores and populations (sources on each place page)', '/method/']].concat(real ? [['Boundaries: geoBoundaries ' + real.level + ' (open licence), coastlines and rivers as drawn there', 'https://www.geoboundaries.org/']] : []), used: Object.fromEntries(PROF.map((p) => [p, ['the full Nestlyzer score of each place']])), cov: null, schematic: !real, real: real ? { land: pathOf(real.land, X, Y), plain: pathOf(real.plain, X, Y), level: real.level } : null });
  }
  return out;
}
