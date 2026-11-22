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
  ['cairo', 'Cairo area', 'EG', 30.0444, 31.2357, 20, 'Tahrir Square'], ['ho-chi-minh', 'Ho Chi Minh City area', 'VN', 10.8231, 106.6297, 20, 'Ben Thanh Market']];
const PROF = ['young_family', 'young_professional', 'pensioner'];
// clip a convex polygon by the half-plane closer to a than to b
function clip(poly, a, b) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = b[0] - a[0], ny = b[1] - a[1], side = (p) => (p[0] - mx) * nx + (p[1] - my) * ny;
  const out = []; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], sp = side(p), sq = side(q);
    if (sp <= 0) out.push(p); if ((sp < 0) !== (sq < 0) && sp !== sq) { const t = sp / (sp - sq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); } }
  return out;
}
export function megaZones({ SH, RANK, PAGES }) {
  const out = [];
  for (const [k, n, cc, la, lo, R, ctrName] of MEGA) {
    if (!SH[cc] || !RANK[cc]) continue;
    const kx = 111.32 * Math.cos(la * Math.PI / 180), xy = (r) => [(r.lon - lo) * kx, (la - r.lat) * 110.57];
    let mem = SH[cc].recs.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon) && (r.popNow || r.population) >= 30000).map((r) => ({ r, p: xy(r) })).filter((o) => Math.hypot(o.p[0], o.p[1]) <= R);
    const tot = mem.reduce((t, o) => t + (o.r.popNow || o.r.population), 0);
    mem = mem.filter((o) => (o.r.popNow || o.r.population) < 0.4 * (tot - (o.r.popNow || o.r.population)) || mem.length < 4);   // drop whole-city aggregates
    const seen = new Set(); mem = mem.filter((o) => { const key = Math.round(o.p[0] * 2) + ',' + Math.round(o.p[1] * 2); if (seen.has(key)) return false; seen.add(key); return true; });
    if (mem.length < 8) continue;
    const W = 1000, S = W / (2 * R), H = W, X = (x) => (x + R) * S, Y = (y) => (y + R) * S;
    const disc = Array.from({ length: 72 }, (_, i) => [R * Math.cos(i * Math.PI / 36), R * Math.sin(i * Math.PI / 36)]);
    const Z = mem.map((o) => { let poly = disc; for (const q of mem) if (q !== o) { poly = clip(poly, o.p, q.p); if (poly.length < 3) break; }
      const area = Math.abs(poly.reduce((t, p, i) => { const q = poly[(i + 1) % poly.length]; return t + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
      const s = {}; for (const pf of PROF) { const a = RANK[cc][pf] && RANK[cc][pf].byId[o.r.id]; s[pf] = a ? Math.round(a.score) : null; }
      const pop = o.r.popNow || o.r.population;
      return { c: String(o.r.id), n: o.r.name.replace(/ \((?:Tokyo|New York|Shanghai|Moscow)\)$/, ''), u: PAGES[o.r.id] || '', d: 'M' + poly.map((p) => X(p[0]).toFixed(0) + ' ' + Y(p[1]).toFixed(0)).join('L') + 'Z', lx: +X(o.p[0]).toFixed(1), ly: +Y(o.p[1]).toFixed(1), km2: Math.round(area),
        v: { pop, dens: o.r.area_km2 > 0 ? Math.round(pop / o.r.area_km2) : null, dist: Math.round(Math.hypot(o.p[0], o.p[1]) * 10) / 10 }, s }; }).filter((z) => z.d.length > 10);
    for (const pf of PROF) { const order = Z.filter((z) => z.s[pf] != null).sort((a, b) => b.s[pf] - a.s[pf]); order.forEach((z, i) => { (z.r = z.r || {})[pf] = i + 1; }); }
    out.push({ k, n, cc, w: W, h: H, ctr: [X(0), Y(0), ctrName], ind: { pop: ['Residents', ''], dens: ['Residents per km²', ''], dist: ['Distance to ' + ctrName, ' km'] }, z: Z,
      src: [['Nestlyzer place scores and populations (sources on each place page)', '/method/']], used: Object.fromEntries(PROF.map((p) => [p, ['the full Nestlyzer score of each place']])), cov: null, schematic: true });
  }
  return out;
}
