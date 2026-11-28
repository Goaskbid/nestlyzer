/* r21: Country atlas, "every country as a strategy map". One page per country (/<country>/atlas/) and an index (/atlas/).
   The country is cut into hexagonal tiles; each tile holds the places that fall in it (residents, terrain, climate and the
   average scores of its places, weighted by residents). The page shows the tiles as terrain, or coloured by any measure
   (choropleth), with the largest cities as city markers, a sheet of national figures, and the country's "wonders"
   (records). Everything is computed at build time from the same data as the rankings; nothing is estimated for the map. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const LAYERS = [
  ['terrain', 'Terrain', 'Land, coast, hills, mountains and climate zones'],
  ['people', 'People', 'Residents per km², from the places in each tile'],
  ['family', 'Families', 'Schools, childcare and family life'],
  ['jobs', 'Jobs', 'Work, income and the local economy'],
  ['affordability', 'Costs', 'Housing and living costs (higher is cheaper)'],
  ['safety', 'Safety', 'Crime and community'],
  ['health', 'Health', 'Doctors, hospitals and life expectancy'],
  ['environment', 'Nature', 'Green space, air and climate'],
  ['mobility', 'Getting around', 'Rail, roads and airports within reach'],
  ['tax', 'Taxes', 'Tax burden where measured (higher is lighter)'],
  ['governance', 'Town finances', 'The municipality\'s own finances where published (higher is sounder)'],
  ['lifestyle', 'Lifestyle', 'Shops, culture and things to do'],
  ['growth', 'Growth', 'Population change over about five years'],
];
const CATS = LAYERS.map((l) => l[0]).filter((k) => !['terrain', 'people', 'growth'].includes(k));
const fin = Number.isFinite;
const NI = 8 + LAYERS.filter((l) => !['terrain', 'people', 'growth'].includes(l[0])).length, GI = NI + 1;   // tile layout: name, then inset group

/* terrain class from altitude, shore distance and climate zone: 0 coast, 1 grassland, 2 forest, 3 hills, 4 mountains,
   5 snow peaks, 6 desert, 7 steppe, 8 jungle, 9 taiga, 10 tundra, 11 lakeland */
function terrainOf(alt, shore, kg, lake) {
  if (alt >= 2300) return 5; if (alt >= 1300) return 4;
  if (fin(shore) && shore <= 4) return 0;
  if (lake) return 11;
  const k = String(kg || '');
  if (/^BW/.test(k)) return 6; if (/^BS/.test(k)) return 7; if (/^A/.test(k)) return 8;
  if (/^E/.test(k)) return 10; if (/^D[sfw][cd]/.test(k)) return 9;
  if (alt >= 550) return 3;
  if (/^(Cfb|Dfb|Cfc)/.test(k)) return 2;
  return 1;
}

let NUTSN = null;
function nutsNames(ROOT) {
  if (NUTSN) return NUTSN; NUTSN = {};
  for (const lv of [1, 2]) { try { const t = JSON.parse(fs.readFileSync(path.join(ROOT, `build/source/nuts2021_20M_${lv}.topo.json`), 'utf8')); for (const g of Object.values(t.objects)[0].geometries) if (g.properties) NUTSN[g.properties.id] = g.properties.na; } catch (e) {} }
  return NUTSN;
}
let ROOTP = '.';
function regionOf(recs) {
  const names = [], idx = new Map(), add = (k, n) => { if (!idx.has(k)) { idx.set(k, names.length); names.push(n); } return idx.get(k); };
  const own = new Set(recs.map((r) => r.region)), N = nutsNames(ROOTP);
  let key = (r) => r.region, label = (r) => r.region;
  if (own.size < 3) {
    const n1 = new Set(recs.map((r) => r.n1)), n2 = new Set(recs.map((r) => r.n2));
    const lv = n1.size >= 8 || n2.size > 40 ? 'n1' : 'n2';
    if (new Set(recs.map((r) => r[lv])).size >= 2) { key = (r) => r[lv] || r.region; label = (r) => N[r[lv]] || r.region; }
  }
  const cache = new Map();
  return { names, of: (r) => { const k = key(r); if (!cache.has(k)) cache.set(k, add(k, String(label(r) || k).replace(/\s*\(.*\)$/, ''))); return cache.get(k); } };
}
function hexBin(recs, target) {
  const lat0 = recs.reduce((a, r) => a + r.lat, 0) / recs.length, kx = Math.cos(lat0 * Math.PI / 180);
  const P = recs.map((r) => [r.lon * kx, r.lat]);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const bin = (s) => { const m = new Map(); P.forEach(([x, y], i) => { const q = (Math.sqrt(3) / 3 * x - y / 3) / s, rr = (2 / 3 * y) / s; let cx = q, cz = rr, cy = -cx - cz, rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz); const dx = Math.abs(rx - cx), dy = Math.abs(ry - cy), dz = Math.abs(rz - cz); if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry; const k = rx + ',' + rz; let o = m.get(k); if (!o) m.set(k, o = { q: rx, r: rz, i: [] }); o.i.push(i); }); return m; };
  let s = Math.sqrt(Math.max((x1 - x0) * (y1 - y0), 1e-6) / (target * 2.6)) || 0.1, m = bin(s);
  for (let it = 0; it < 6; it++) { const ratio = m.size / target; if (ratio > 0.85 && ratio < 1.15) break; s *= Math.sqrt(ratio); m = bin(s); }
  return { s, kx, m, P, bbox: [x0, y0, x1, y1] };
}

export function buildAtlas(H) {
  const { ROOT, page, esc, fmt, fmtInt, countries, flagImg, cslug, PAGES, SITE, engine, loadCountry } = H;
  const J = (p) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch (e) { return null; } };
  ROOTP = ROOT;
  const NAT = J('data/national.json') || { countries: {} }, DEBT = J('build/source/imf_weo_2026apr_gg_debt_2025.json') || { values: {} };
  const JS = fs.readFileSync(path.join(ROOT, 'src/atlas/atlas.js'), 'utf8');
  const jsName = 'atlas.js?v=' + crypto.createHash('sha256').update(JS).digest('hex').slice(0, 10);
  H.write('assets/atlas.js', JS);
  const index = []; const WORLD = { m: new Map(), countries: [], cities: [], info: [] };
  for (const c of countries) {
    let full; try { full = loadCountry(c.cc); } catch (e) { continue; }
    const recs = full.recs.filter((r) => fin(r.lat) && fin(r.lon) && !r.whole);
    if (recs.length < 3) continue;
    // world map: every place also lands in a coarse world tile (Miller projection, about 0.55 degrees)
    const ci = WORLD.countries.length; WORLD.countries.push(c);
    for (const r of recs) {
      const x = r.lon, y = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * r.lat * Math.PI / 180)) * 180 / Math.PI, s = 0.55;
      const q = (Math.sqrt(3) / 3 * x - y / 3) / s, rr = (2 / 3 * y) / s; let cx = q, cz = rr, cy = -cx - cz, rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz); const dx = Math.abs(rx - cx), dy = Math.abs(ry - cy), dz = Math.abs(rz - cz); if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
      const k = rx + ',' + rz; let o = WORLD.m.get(k); if (!o) WORLD.m.set(k, o = { q: rx, r: rz, pop: 0, n: 0, area: 0, alt: 0, altN: 0, shore: Infinity, lake: 0, kg: {}, cc: {}, top: null, topP: -1 });
      const p = Math.max(1, r.popNow || r.population || 1), xx = r.x || {}, fr = r.factorRaw || {}; o.pop += p; o.n++; if (fin(r.area_km2)) o.area += r.area_km2; if (fin(xx.alt)) { o.alt += xx.alt; o.altN++; }
      const sh = fin(fr.geo_sea_km) ? fr.geo_sea_km : fr.geo_coast_km; if (fin(sh)) o.shore = Math.min(o.shore, sh); if (fin(xx.lake_km) && xx.lake_km < 1.5) o.lake++; if (xx.kg) o.kg[xx.kg] = (o.kg[xx.kg] || 0) + p;
      o.cc[ci] = (o.cc[ci] || 0) + p; if (p > o.topP) { o.topP = p; o.top = r.name; }
    }
    const RG = regionOf(recs);   // r21b: regions (states, cantons, NUTS regions) for borders, names and the region panel
    const target = Math.max(60, Math.min(1800, Math.round(recs.length / 2)));
    const B = hexBin(recs, target);
    const tiles = [];
    for (const o of B.m.values()) {
      const rs = o.i.map((i) => recs[i]); let pop = 0, area = 0, top = rs[0], alt = 0, altN = 0, shore = Infinity, lake = 0, kgc = {}, g = 0, gw = 0;
      const cs = Object.fromEntries(CATS.map((k) => [k, [0, 0]]));
      for (const r of rs) {
        const p = Math.max(1, r.popNow || r.population || 1); pop += p; if (fin(r.area_km2)) area += r.area_km2;
        if ((r.popNow || r.population || 0) > (top.popNow || top.population || 0)) top = r;
        const x = r.x || {}; if (fin(x.alt)) { alt += x.alt; altN++; }
        const fr = r.factorRaw || {}, sh = fin(fr.geo_sea_km) ? fr.geo_sea_km : fr.geo_coast_km; if (fin(sh)) shore = Math.min(shore, sh);
        if (fin(x.lake_km) && x.lake_km < 1.5) lake++;
        if (x.kg) kgc[x.kg] = (kgc[x.kg] || 0) + p;
        const gr = (r.factorRaw || {}).common_population_growth_5y; if (fin(gr) && Math.abs(gr) < 40) { g += gr * p; gw += p; }
        let cat; try { cat = engine.categories(r); } catch (e) { cat = {}; }
        for (const k of CATS) if (fin(cat[k])) { cs[k][0] += cat[k] * p; cs[k][1] += p; }
      }
      const kg = Object.entries(kgc).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      const a = altN ? alt / altN : 0;
      const rc = {}; for (const r of rs) { const k = RG.of(r); rc[k] = (rc[k] || 0) + Math.max(1, r.popNow || r.population || 1); } const rgi = +Object.entries(rc).sort((a, b) => b[1] - a[1])[0][0];
      tiles.push([o.q, o.r, Math.round(pop), rs.length, terrainOf(a, shore, kg, lake > rs.length / 3), Math.round(a), area > 0 ? Math.round(pop / area) : -1, gw ? Math.round(g / gw * 10) / 10 : null,
        ...CATS.map((k) => cs[k][1] ? Math.round(cs[k][0] / cs[k][1]) : -1), String(top.name).slice(0, 40), rgi]);
    }
    // r21: tiles far from the main land (Alaska and Hawaii, overseas islands) are drawn as insets, so the main land keeps its size
    { const key = (t) => t[0] + ',' + t[1], at = new Map(tiles.map((t, i) => [key(t), i])), comp = new Array(tiles.length).fill(-1); let nc = 0;
      for (let i = 0; i < tiles.length; i++) { if (comp[i] >= 0) continue; const st = [i]; comp[i] = nc; while (st.length) { const j = st.pop(), [q, r] = tiles[j]; for (let dq = -3; dq <= 3; dq++) for (let dr = Math.max(-3, -dq - 3); dr <= Math.min(3, -dq + 3); dr++) { const n = at.get((q + dq) + ',' + (r + dr)); if (n != null && comp[n] < 0) { comp[n] = nc; st.push(n); } } } nc++; }
      const C = Array.from({ length: nc }, () => ({ n: 0, pop: 0, x: 0, y: 0, x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }));
      tiles.forEach((t, i) => { const c = C[comp[i]], x = Math.sqrt(3) * (t[0] + t[1] / 2), y = 1.5 * t[1]; c.n++; c.pop += t[2]; c.x += x; c.y += y; c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.y0 = Math.min(c.y0, y); c.y1 = Math.max(c.y1, y); });
      C.forEach((c) => { c.x /= c.n; c.y /= c.n; });
      const main = C.indexOf(C.slice().sort((a, b) => b.pop - a.pop)[0]), M = C[main], pad = Math.max(M.x1 - M.x0, M.y1 - M.y0) * 0.12;
      const far = C.map((c, i) => i !== main && !(c.x > M.x0 - pad && c.x < M.x1 + pad && c.y > M.y0 - pad && c.y < M.y1 + pad));
      // far parts close to each other form one inset; at most four insets, the largest by residents
      const grp = new Array(nc).fill(0), G = []; C.forEach((c, i) => { if (!far[i]) return; let g = G.find((o) => Math.hypot(o.x - c.x, o.y - c.y) < 40); if (!g) { g = { x: c.x, y: c.y, pop: 0, ids: [] }; G.push(g); } g.ids.push(i); g.pop += c.pop; });
      G.sort((a, b) => b.pop - a.pop).slice(0, 4).forEach((g, k) => g.ids.forEach((i) => { grp[i] = k + 1; }));
      const dropped = G.slice(4).reduce((a, g) => a.concat(g.ids), []);
      tiles.forEach((t, i) => { const rgi = t.pop(); t.push(dropped.includes(comp[i]) ? -1 : grp[comp[i]], rgi); });
      for (let i = tiles.length - 1; i >= 0; i--) if (tiles[i][GI] < 0) tiles.splice(i, 1); }
    const big = recs.slice().sort((a, b) => (b.popNow || b.population || 0) - (a.popNow || a.population || 0)).slice(0, 18);
    // r21: 60 largest places with their scores, for the city markers (first 18) and the daily games
    const GC = ['family', 'jobs', 'affordability', 'safety', 'health', 'environment'];
    const pool = recs.slice().sort((a, b) => (b.popNow || b.population || 0) - (a.popNow || a.population || 0)).slice(0, 60);
    const cities = pool.map((r) => { let cat = {}; try { cat = engine.categories(r); } catch (e) {} return [r.name, Math.round(r.lon * B.kx * 1e4) / 1e4, Math.round(r.lat * 1e4) / 1e4, r.popNow || r.population || 0, PAGES[r.id] || null, ...GC.map((k) => fin(cat[k]) ? Math.round(cat[k]) : -1), RG.of(r)]; });
    const totPop = recs.reduce((a, r) => a + (r.popNow || r.population || 0), 0);
    // wonders: records that stand out on this map (each a real place with its own page)
    const by = (f, ok = () => true) => recs.filter((r) => ok(r) && fin(f(r))).sort((a, b) => f(b) - f(a))[0];
    const altOf = (r) => (r.x || {}).alt, grOf = (r) => (r.factorRaw || {}).common_population_growth_5y;
    const W = [];
    const hi = by(altOf); if (hi && altOf(hi) > 0) W.push(['Highest place', hi, fmtInt(altOf(hi)) + ' m above sea level']);
    W.push(['Largest place', big[0], fmtInt(big[0].popNow || big[0].population) + ' residents']);
    const fast = by(grOf, (r) => (r.popNow || r.population) >= 5000 && Math.abs(grOf(r)) < 40); if (fast && grOf(fast) > 0) W.push(['Fastest growing (5,000+ residents)', fast, '+' + fmt(grOf(fast), 1) + '% in about five years']);
    const fam = by((r) => { try { return engine.categories(r).family; } catch (e) { return NaN; } }, (r) => (r.popNow || r.population) >= 5000); if (fam) W.push(['Strongest for families (5,000+ residents)', fam, 'family score ' + Math.round(engine.categories(fam).family)]);
    const dense = by((r) => r.density, (r) => (r.popNow || r.population) >= 2000); if (dense) W.push(['Most densely settled', dense, fmtInt(dense.density) + ' people per km²']);
    // national sheet
    const nv = (NAT.countries[c.cc] || {}).values || {}, v = (k) => nv[k] && fin(nv[k][0]) ? nv[k] : null;
    const hd = J('data/h/' + c.cc + '.json'), railKm = hd && (hd.series || []).find((s) => s.id === 'rail_km');
    const sheet = [
      ['people', 'Residents in its places', fmtInt(totPop), 'Nestlyzer place data'],
      ['places', 'Places on the map', fmtInt(recs.length), 'municipalities and districts'],
      v('gni_pc_ppp') && ['coin', 'Income per person', '$' + fmtInt(Math.round(v('gni_pc_ppp')[0])) + ' PPP', 'World Bank, ' + v('gni_pc_ppp')[1]],
      fin(DEBT.values[c.cc]) && ['scroll', 'Government debt', fmt(DEBT.values[c.cc], 0) + '% of GDP', 'IMF, 2025'],
      (() => { const P = (J('build/source/rail_punctuality.json') || { rows: [] }).rows.filter((r) => r.cc === c.cc).sort((a, b) => b.year - a.year)[0]; return P && ['rail', 'Trains on time', fmt(P.pct, 1) + '%', P.who + ', ' + P.year + ' (' + P.rule + ')']; })(),
      railKm && railKm.y.length && ['rail', 'Railway lines', fmtInt(railKm.y[railKm.y.length - 1][1]) + ' km', 'World Bank, ' + railKm.y[railKm.y.length - 1][0]],
      v('life_expectancy') && ['heart', 'Life expectancy', fmt(v('life_expectancy')[0], 1) + ' years', 'World Bank, ' + v('life_expectancy')[1]],
      v('renewable_power') && ['leaf', 'Renewable power', fmt(v('renewable_power')[0], 0) + '% of electricity', 'World Bank, ' + v('renewable_power')[1]],
      v('broadband') && ['wifi', 'Fixed broadband', fmt(v('broadband')[0], 0) + ' per 100 people', 'World Bank, ' + v('broadband')[1]],
      v('unemployment') && ['tools', 'Unemployment', fmt(v('unemployment')[0], 1) + '%', 'World Bank, ' + v('unemployment')[1]],
      v('homicide') && ['shield', 'Homicides', fmt(v('homicide')[0], 1) + ' per 100,000', 'World Bank, ' + v('homicide')[1]],
    ].filter(Boolean);
    const has = (k) => k === 'terrain' || (k === 'people' ? tiles.some((t) => t[6] > 0) : k === 'growth' ? tiles.some((t) => t[7] != null) : tiles.some((t) => t[8 + CATS.indexOf(k)] >= 0));
    WORLD.cities.push(...big.slice(0, 3).map((r) => [r.name, r.lon, 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * r.lat * Math.PI / 180)) * 180 / Math.PI, r.popNow || r.population || 0, PAGES[r.id] || null]));
    WORLD.info[ci] = { href: '/' + cslug(c.cc) + '/atlas/', n: recs.length, pop: totPop, v: { income: v('gni_pc_ppp') ? v('gni_pc_ppp')[0] : null, debt: fin(DEBT.values[c.cc]) ? DEBT.values[c.cc] : null, life: v('life_expectancy') ? v('life_expectancy')[0] : null, renew: v('renewable_power') ? v('renewable_power')[0] : null, broadband: v('broadband') ? v('broadband')[0] : null, unemp: v('unemployment') ? v('unemployment')[0] : null, homicide: v('homicide') ? v('homicide')[0] : null } };
    const data = { regions: RG.names, cc: c.cc, name: c.name, s: B.s, kx: B.kx, gc: GC, shown: Math.min(18, cities.length), ni: NI, layers: LAYERS.filter((l) => has(l[0])).map((l) => [l[0], l[1], l[2]]), cats: CATS, tiles, cities };
    const slug = cslug(c.cc), p = '/' + slug + '/atlas/';
    // crawlable text: what the map shows, in figures
    const tc = {}; tiles.forEach((t) => { tc[t[4]] = (tc[t[4]] || 0) + 1; });
    const TN = ['coast', 'grassland', 'forest', 'hills', 'mountains', 'high peaks', 'desert', 'steppe', 'jungle', 'taiga', 'tundra', 'lakeland'];
    const terr = Object.entries(tc).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${TN[k]} (${Math.round(n / tiles.length * 100)}% of tiles)`);
    const bestTile = (k) => { const i = 8 + CATS.indexOf(k); return tiles.filter((t) => t[i] >= 0 && t[3] >= 2).sort((a, b) => b[i] - a[i])[0]; };
    const bf = bestTile('family'), bj = bestTile('jobs'), ba = bestTile('affordability'), TN17 = (t) => t[NI];
    const intro = `${fmtInt(recs.length)} places in ${fmtInt(tiles.length)} tiles, home to ${fmtInt(totPop)} people. The land is mostly ${terr.join(', ')}. `
      + [bf && `The strongest tile for families centres on ${TN17(bf)}`, bj && `the strongest for jobs on ${TN17(bj)}`, ba && `the most affordable on ${TN17(ba)}`].filter(Boolean).join(', ') + '. Switch the map to any measure below; tap a tile for its places.';
    const ico = (n) => `<svg class="at-i" viewBox="0 0 24 24" aria-hidden="true"><use href="#at-${n}"/></svg>`;
    const SYM = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="at-people" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2" fill="currentColor"/><circle cx="16.5" cy="9" r="2.6" fill="currentColor" opacity=".7"/><path d="M3 19c0-3.5 2.7-6 6-6s6 2.5 6 6zM13.5 19c.3-2.6 1.6-4.4 3.5-4.9 2.4.3 4 2.2 4 4.9z" fill="currentColor"/></symbol>
<symbol id="at-places" viewBox="0 0 24 24"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="currentColor"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></symbol>
<symbol id="at-coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M12 6.5v11M15 9c-.6-1-1.7-1.5-3-1.5-1.8 0-3 .9-3 2.2 0 3 6 1.5 6 4.6 0 1.3-1.3 2.2-3 2.2-1.4 0-2.6-.6-3.2-1.6" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/></symbol>
<symbol id="at-scroll" viewBox="0 0 24 24"><path d="M6 3h11a3 3 0 0 1 0 6h-1v9a3 3 0 0 1-3 3H6a3 3 0 0 1 0-6h1V6a3 3 0 0 1-1-3z" fill="currentColor"/><path d="M9.5 8.5h4M9.5 12h4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></symbol>
<symbol id="at-rail" viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="13" rx="3" fill="currentColor"/><rect x="8.3" y="5.6" width="7.4" height="4" rx="1" fill="#fff"/><path d="M8 21l2-4M16 21l-2-4M7 19h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
<symbol id="at-heart" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" fill="currentColor"/></symbol>
<symbol id="at-leaf" viewBox="0 0 24 24"><path d="M5 19C5 10 11 5 20 5c0 9-5 15-14 15z" fill="currentColor"/><path d="M5 19l8-8" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></symbol>
<symbol id="at-wifi" viewBox="0 0 24 24"><path d="M3 9.5a13 13 0 0 1 18 0M6.3 13a8.3 8.3 0 0 1 11.4 0M9.4 16.4a3.8 3.8 0 0 1 5.2 0" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="12" cy="19.4" r="1.6" fill="currentColor"/></symbol>
<symbol id="at-tools" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="12" rx="2.5" fill="currentColor"/><path d="M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8" stroke="currentColor" stroke-width="2" fill="none"/></symbol>
<symbol id="at-shield" viewBox="0 0 24 24"><path d="M12 2.5l8 3v6.2c0 4.8-3.4 8.4-8 9.8-4.6-1.4-8-5-8-9.8V5.5z" fill="currentColor"/></symbol>
<symbol id="at-star" viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" fill="currentColor"/></symbol>
</defs></svg>`;
    const layerBtns = LAYERS.filter((l) => has(l[0])).map((l, i) => `<button type="button" class="at-l" data-layer="${l[0]}" aria-pressed="${i === 0}" title="${esc(l[2])}">${esc(l[1])}</button>`).join('');
    const body = `${SYM}<div class="at-wrap"><div class="at-head"><p class="at-kick">Country atlas</p><h1>${flagImg(c.cc, 30)} ${esc(c.name)} as a strategy map</h1><p class="lede">${esc(intro)}</p></div>
<div class="at-ui" id="at-ui"><div class="at-top"><span class="at-title">${flagImg(c.cc, 22)} ${esc(c.name.toUpperCase())}</span><ul class="at-yields">${sheet.map((s) => `<li title="${esc(s[1] + ' (' + s[3] + ')')}">${ico(s[0])}<b>${esc(s[2])}</b><span class="at-k">${esc(s[1])}</span></li>`).join('')}</ul></div>
<div class="at-main"><section class="at-stage" aria-label="Map of ${esc(c.name)}"><canvas id="at-canvas" role="img" tabindex="0" aria-label="Hexagon map of ${esc(c.name)}: ${fmtInt(tiles.length)} tiles. Drag to move, scroll or pinch to zoom, tap a tile for its region."></canvas><div class="at-tip" id="at-tip" hidden></div>
<div class="at-zoom"><button type="button" data-zoom="1" aria-label="Zoom in">+</button><button type="button" data-zoom="-1" aria-label="Zoom out">−</button><button type="button" data-zoom="0" aria-label="Show the whole country">⤢</button></div></section>
<aside class="at-panel" id="at-panel" aria-live="polite"><canvas class="at-mini" id="at-mini" aria-label="Overview: tap to move the map there"></canvas><div id="at-home"><p class="at-pk">Country</p><h2>${esc(c.name)}</h2><p class="small">${fmtInt(totPop)} people in ${fmtInt(recs.length)} places and ${RG.names.length} regions. Tap a tile to open its region.</p>
<h3>National sheet</h3><ul class="at-sheet">${sheet.map((s) => `<li>${ico(s[0])}<span class="at-k">${esc(s[1])}</span><b>${esc(s[2])}</b><small>${esc(s[3])}</small></li>`).join('')}</ul>
<h3>Wonders</h3><ul class="at-won">${W.map((w) => `<li>${ico('star')}<span><span class="at-k">${esc(w[0])}</span>${PAGES[w[1].id] ? `<a href="${PAGES[w[1].id]}">${esc(w[1].name)}</a>` : `<b>${esc(w[1].name)}</b>`}<small>${esc(w[2])}</small></span></li>`).join('')}</ul></div><div id="at-region" hidden></div></aside></div>
<div class="at-bar"><div class="at-layers" role="group" aria-label="Lenses">${layerBtns}</div><div class="at-legend" id="at-legend" aria-live="polite"></div></div></div>
<p class="at-note" id="at-note">Each hexagon is a tile of about the same size; its colour is the resident-weighted average of the places in it. Tiles without places are left out. Dashed lines are region borders; banners mark the ${Math.min(18, cities.length)} largest places.</p>
<div class="at-play" id="at-play"><h2>Play ${esc(c.name)}</h2><p class="small muted">Three short games on the real map, new every day and the same for everyone. Your results stay on this device.</p>
<div class="at-modes" role="group" aria-label="Games"><button type="button" class="at-l" data-game="pin">Pinpoint</button><button type="button" class="at-l" data-game="duel">Higher or lower</button><button type="button" class="at-l" data-game="lens">Map detective</button></div>
<div class="at-game" id="at-game" aria-live="polite"><p>Pick a game. <b>Pinpoint</b>: tap where a place lies. <b>Higher or lower</b>: which of two places scores higher. <b>Map detective</b>: name the measure that colours the map.</p></div></div>
<h2>The largest places on the map</h2><ol class="at-cities">${big.map((r) => `<li>${PAGES[r.id] ? `<a href="${PAGES[r.id]}">${esc(r.name)}</a>` : esc(r.name)} <small>${fmtInt(r.popNow || r.population)}</small></li>`).join('')}</ol>
<p class="small muted">Scores compare each place with the other places of ${esc(c.name)} (0 = weakest, 100 = strongest); a tile shows the average of its places, weighted by residents. Terrain comes from each place's altitude, distance to the sea, lakes and climate zone. National figures: World Bank World Development Indicators (CC BY 4.0) and the IMF World Economic Outlook, April 2026. <a href="/atlas/">All country atlases</a> · <a href="/${slug}/">Best places to live in ${esc(c.name)}</a></p></div>
<script type="application/json" id="at-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script><script defer src="/assets/${jsName}"></script>`;
    page({ p, title: `${c.name} as a strategy map: terrain, people and scores | Nestlyzer`, desc: `${c.name} cut into ${fmtInt(tiles.length)} map tiles: terrain, residents and the scores of ${fmtInt(recs.length)} places for families, jobs, costs, safety, health and more, with the national sheet and the country's records.`,
      body: ATLAS_CSS + body, cc: c.cc, crumbs: [['Atlas', '/atlas/'], [c.name, p]],
      jsonld: [{ '@context': 'https://schema.org', '@type': 'Map', name: c.name + ' as a strategy map', url: SITE + p, mapType: 'https://schema.org/VenueMap', description: intro, spatialCoverage: { '@type': 'Country', name: c.name } }] });
    index.push({ c, p, tiles: tiles.length, n: recs.length, mini: (() => { const main = tiles.filter((t) => !t[GI]), f = Math.max(1, Math.ceil(Math.sqrt(main.length / 240))), m = new Map();
      for (const t of main) { const x = Math.sqrt(3) * (t[0] + t[1] / 2) / f, y = 1.5 * t[1] / f, k = Math.round(x / Math.sqrt(3)) + ',' + Math.round(y / 1.5); const o = m.get(k) || { x: Math.round(x / Math.sqrt(3)) * Math.sqrt(3), y: Math.round(y / 1.5) * 1.5, c: {} }; o.c[t[4]] = (o.c[t[4]] || 0) + 1; m.set(k, o); }
      return [...m.values()].map((o) => [o.x, o.y, +Object.entries(o.c).sort((a, b) => b[1] - a[1])[0][0]]); })() });
  }
  // index with a small terrain thumbnail per country (inline SVG, a sample of its tiles)
  const TC = ['#E6D39A', '#8DBF62', '#4F8F55', '#A3A86A', '#8B8A86', '#EEF1F4', '#D9B66D', '#C9B776', '#2F7D49', '#4C7A63', '#B9C5C0', '#6BA7C8'];
  const thumb = (o) => { const pts = o.mini; if (!pts.length) return ''; let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; pts.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }); const w = x1 - x0 + 2, h = y1 - y0 + 2, k = 100 / Math.max(w, h); return `<svg viewBox="0 0 100 100" aria-hidden="true">${pts.map(([x, y, t]) => `<circle cx="${((x - x0 + 1) * k + (100 - w * k) / 2).toFixed(1)}" cy="${(100 - ((y - y0 + 1) * k + (100 - h * k) / 2)).toFixed(1)}" r="${Math.max(1.2, Math.min(6, k * 0.95)).toFixed(1)}" fill="${TC[t]}"/>`).join('')}</svg>`; };
  // r21b: one big world map of every place Nestlyzer holds, coloured by terrain, people or national figures (country by country)
  const wt = [...WORLD.m.values()].map((o) => { const kg = Object.entries(o.kg).sort((x, y) => y[1] - x[1])[0]?.[0] || '', a = o.altN ? o.alt / o.altN : 0, cc = +Object.entries(o.cc).sort((x, y) => y[1] - x[1])[0][0];
    return [o.q, o.r, Math.round(o.pop), o.n, terrainOf(a, o.shore, kg, o.lake > o.n / 3), Math.round(a), o.area > 0 ? Math.round(o.pop / o.area) : -1, null, String(o.top).slice(0, 40), 0, cc]; });
  const NATL = [['income', 'Income', 'Income per person, PPP dollars (World Bank)', 0], ['debt', 'Public debt', 'General government debt, % of GDP (IMF, 2025); lower is lighter', 1], ['life', 'Life expectancy', 'Years at birth (World Bank)', 0], ['renew', 'Renewables', 'Renewable share of electricity (World Bank)', 0], ['broadband', 'Broadband', 'Fixed broadband per 100 people (World Bank)', 0], ['unemp', 'Unemployment', 'Share of the labour force (World Bank); lower is better', 1], ['homicide', 'Safety', 'Homicides per 100,000 (World Bank); fewer is safer', 1]];
  const wdata = { mode: 'world', name: 'World', s: 0.55, kx: 1, cats: [], gc: [], ni: 8, shown: WORLD.cities.length, regions: WORLD.countries.map((c) => c.name), info: WORLD.info, nat: NATL,
    layers: [['terrain', 'Terrain', 'Land, coast, hills, mountains and climate zones'], ['people', 'People', 'Residents per km² in each tile']].concat(NATL.map((n) => [n[0], n[1], n[2]])), tiles: wt, cities: WORLD.cities.sort((x, y) => y[3] - x[3]) };
  const wpop = WORLD.info.reduce((a2, i) => a2 + (i ? i.pop : 0), 0), wn = WORLD.info.reduce((a2, i) => a2 + (i ? i.n : 0), 0);
  const wbtn = wdata.layers.map((l, i) => `<button type="button" class="at-l" data-layer="${l[0]}" aria-pressed="${i === 0}" title="${esc(l[2])}">${esc(l[1])}</button>`).join('');
  const ibody = `<div class="at-wrap"><p class="at-kick">Atlas</p><h1>The world of Nestlyzer as one strategy map</h1><p class="lede">${fmtInt(wn)} places in ${index.length} countries, home to ${fmtInt(wpop)} people, drawn as ${fmtInt(wt.length)} hexagon tiles. Move and zoom like a strategy game, switch lenses for terrain, people and the national figures of every country, and tap a country to open its own atlas with regions, scores and daily games.</p>
<div class="at-ui" id="at-ui"><div class="at-top"><span class="at-title">THE WORLD</span><ul class="at-yields"><li title="Residents in Nestlyzer's places"><svg class="at-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.4" fill="currentColor"/><path d="M5 20c0-4 3-7 7-7s7 3 7 7z" fill="currentColor"/></svg><b>${fmtInt(wpop)}</b></li><li title="Places"><b>${fmtInt(wn)}</b> places</li><li title="Countries"><b>${index.length}</b> countries</li></ul></div>
<div class="at-main"><section class="at-stage" aria-label="World map"><canvas id="at-canvas" role="img" tabindex="0" aria-label="Hexagon map of ${index.length} countries. Drag to move, scroll or pinch to zoom, tap a country."></canvas><div class="at-tip" id="at-tip" hidden></div>
<div class="at-zoom"><button type="button" data-zoom="1" aria-label="Zoom in">+</button><button type="button" data-zoom="-1" aria-label="Zoom out">−</button><button type="button" data-zoom="0" aria-label="Show the whole world">⤢</button></div></section>
<aside class="at-panel" id="at-panel" aria-live="polite"><canvas class="at-mini" id="at-mini" aria-label="Overview: tap to move the map there"></canvas><div id="at-home"><p class="at-pk">Atlas</p><h2>${index.length} countries</h2><p class="small">Tap a country on the map for its figures, or pick one below. National lenses colour a whole country by one figure; place scores live in each country's own atlas, because they compare places within a country.</p></div><div id="at-region" hidden></div></aside></div>
<div class="at-bar"><div class="at-layers" role="group" aria-label="Lenses">${wbtn}</div><div class="at-legend" id="at-legend" aria-live="polite"></div></div></div>
<h2>Every country atlas</h2><ul class="at-idx">${index.sort((a2, b2) => a2.c.name.localeCompare(b2.c.name)).map((o) => `<li><a href="${o.p}">${thumb(o)}<span>${flagImg(o.c.cc, 20)} ${esc(o.c.name)}</span><small>${fmtInt(o.n)} places · ${fmtInt(o.tiles)} tiles</small></a></li>`).join('')}</ul>
<p class="small muted">National figures: World Bank World Development Indicators (CC BY 4.0) and the IMF World Economic Outlook, April 2026. Terrain comes from each place's altitude, distance to the sea, lakes and climate zone.</p></div>
<script type="application/json" id="at-data">${JSON.stringify(wdata).replace(/</g, '\\u003c')}</script><script defer src="/assets/${jsName}"></script>`;
  page({ p: '/atlas/', title: `World atlas: ${index.length} countries as one strategy map | Nestlyzer`, desc: `Every place Nestlyzer ranks, ${fmtInt(wn)} in ${index.length} countries, on one explorable hexagon map: terrain, people, income, public debt, life expectancy and more, with an atlas for each country.`, body: ATLAS_CSS + ibody, crumbs: [['Atlas', '/atlas/']] });
  return index.length;
}

const ATLAS_CSS = `<style>
.at-wrap{--at-gold:#E8B53A;--at-panel:#f7f3e8;--at-edge:#d9cfb6}
@media (prefers-color-scheme:dark){.at-wrap{--at-panel:#1c2530;--at-edge:#33414f}}
.at-kick{margin:0;color:var(--muted);font-weight:600;letter-spacing:.02em}
/* the game frame: dark navy and gold, like a strategy game's interface; the page around it keeps the site design */
.at-ui{--ui:#0f1e2e;--ui2:#16293d;--uiline:#2b425a;--uitext:#e9eef3;--uimute:#9fb2c4;margin:14px 0 10px;border-radius:16px;overflow:hidden;background:var(--ui);color:var(--uitext);border:1px solid #c9a24a55;box-shadow:0 14px 36px rgba(6,18,30,.35)}
.at-top{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;padding:9px 14px;background:linear-gradient(#152a40,#0f1e2e);border-bottom:1px solid #c9a24a66}
.at-title{font-family:var(--font-display);font-weight:700;letter-spacing:.14em;font-size:1rem;display:inline-flex;align-items:center;gap:8px;color:#f4ead0}
.at-yields{display:flex;flex-wrap:wrap;gap:4px 14px;list-style:none;margin:0;padding:0}
.at-yields li{display:inline-flex;align-items:center;gap:5px;font-size:.86rem}.at-yields .at-i{width:16px;height:16px;color:#E8B53A}.at-yields b{color:#fff;font-weight:700}
.at-yields .at-k{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.at-main{display:grid;grid-template-columns:minmax(0,1fr) 330px;min-height:0}
@media (max-width:980px){.at-main{grid-template-columns:minmax(0,1fr)}}
.at-stage{position:relative;min-width:0;background:radial-gradient(120% 90% at 30% 20%,#1d5a85 0%,#123a5a 55%,#0b2438 100%)}
#at-canvas{display:block;width:100%;touch-action:none;cursor:grab;outline:none}#at-canvas:active{cursor:grabbing}
#at-canvas:focus-visible{box-shadow:inset 0 0 0 3px #E8B53A}
.at-zoom{position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:6px}
.at-zoom button{width:38px;height:38px;border-radius:10px;border:1px solid #c9a24a88;background:rgba(15,30,46,.88);color:#f4ead0;font:700 18px/1 var(--font-ui);cursor:pointer}
.at-zoom button:focus-visible{outline:3px solid #E8B53A;outline-offset:2px}
.at-mini{display:block;width:170px;height:110px;margin:0 0 10px;border-radius:10px;border:1px solid #c9a24a88;background:#0b2438;cursor:pointer}
@media (max-width:640px){.at-mini{display:none}}
.at-tip{position:absolute;pointer-events:none;max-width:260px;padding:8px 10px;border-radius:10px;background:rgba(10,24,38,.94);color:#fff;font-size:.86rem;line-height:1.35;box-shadow:0 6px 18px rgba(0,0,0,.35);border:1px solid #c9a24a55;z-index:2}
.at-tip b{display:block;font-size:.95rem}
.at-panel{background:var(--ui2);border-left:1px solid var(--uiline);padding:12px 14px;max-height:78vh;overflow-y:auto}
@media (max-width:980px){.at-panel{border-left:0;border-top:1px solid var(--uiline);max-height:none}}
.at-panel h2{font-family:var(--font-display);letter-spacing:.06em;font-size:1.35rem;margin:0 0 4px;color:#f4ead0}.at-panel h3{font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:#c9a24a;margin:14px 0 6px;font-weight:700}
.at-panel .small{color:var(--uimute)}.at-pk{margin:0;font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--uimute)}
.at-panel a{color:#9cc3f5}
.at-sheet,.at-won,.at-rl{list-style:none;padding:0;margin:0}
.at-sheet li{display:grid;grid-template-columns:28px 1fr;column-gap:8px;padding:6px 0;border-bottom:1px dashed var(--uiline)}.at-sheet li:last-child{border-bottom:0}
.at-i{width:22px;height:22px;color:#E8B53A;grid-row:1/3;align-self:center}
.at-sheet .at-k{font-size:.8rem;color:var(--uimute)}.at-sheet b{font-size:1rem;grid-column:2}.at-sheet small{grid-column:2;font-size:.72rem;color:var(--uimute)}
.at-won li{display:flex;gap:8px;padding:6px 0}.at-won span{display:flex;flex-direction:column}.at-won .at-k{font-size:.78rem;color:var(--uimute)}.at-won small{font-size:.78rem;color:var(--uimute)}
.at-yg{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:6px}.at-yg div{background:#0f1e2e;border:1px solid var(--uiline);border-radius:10px;padding:7px 6px;text-align:center}
.at-yg b{display:block;font-size:1.15rem;color:#fff}.at-yg span{display:block;font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:var(--uimute)}.at-yg small{display:block;font-size:.7rem;color:#E8B53A}
.at-rl li{display:flex;justify-content:space-between;gap:8px;padding:7px 8px;margin:0 0 5px;background:#0f1e2e;border:1px solid var(--uiline);border-radius:8px}.at-rl small{color:var(--uimute)}
.at-back{font:inherit;font-size:.85rem;padding:5px 10px;border-radius:8px;border:1px solid var(--uiline);background:#0f1e2e;color:var(--uitext);cursor:pointer;margin:0 0 8px}
.at-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;padding:9px 12px;background:linear-gradient(#0f1e2e,#152a40);border-top:1px solid #c9a24a66}
.at-layers{display:flex;flex-wrap:wrap;gap:5px}
.at-l{font:inherit;font-size:.86rem;font-weight:600;padding:6px 11px;border-radius:9px;border:1px solid #c9a24a77;background:#16293d;color:#f4ead0;cursor:pointer;min-height:36px}
.at-l[aria-pressed="true"]{background:#E8B53A;border-color:#E8B53A;color:#13202d}
.at-l:focus-visible{outline:3px solid #E8B53A;outline-offset:2px}
.at-legend{display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;font-size:.84rem;color:var(--uimute)}
.at-legend b{color:#fff}.at-legend .ramp{display:inline-flex;height:10px;width:160px;border-radius:6px;overflow:hidden}.at-legend .ramp i{flex:1}.at-legend .sw{display:inline-flex;align-items:center;gap:5px}.at-legend .sw i{width:12px;height:12px;border-radius:3px;display:inline-block}
.at-note{font-size:.86rem;color:var(--muted);margin:8px 0 0;max-width:75ch}
.at-play{margin:16px 0 0;padding:14px 16px;border:1px solid var(--at-edge);border-radius:16px;background:var(--at-panel)}.at-play h2{font-size:1.05rem;margin:0 0 4px}
.at-play .at-l{background:var(--surface);color:var(--ink);border-color:var(--line)}.at-play .at-l[aria-pressed="true"]{background:#E8B53A;color:#13202d;border-color:#E8B53A}
.at-modes{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.at-game{font-size:.95rem}.at-game .opts{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.at-game .opt{font:inherit;font-weight:600;padding:8px 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer;min-height:44px}
.at-game .opt.ok{background:#2f7d4a;border-color:#2f7d4a;color:#fff}.at-game .opt.no{background:#b2443a;border-color:#b2443a;color:#fff}
.at-game .score{font-weight:700}.at-game .share{margin-top:8px}
.at-cities{columns:3 180px;column-gap:20px;padding-left:20px}.at-cities li{break-inside:avoid;margin:0 0 4px}
.at-idx{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,170px),1fr));gap:12px}
.at-idx a{display:flex;flex-direction:column;gap:4px;padding:10px;border:1px solid var(--line);border-radius:14px;background:var(--surface);text-decoration:none;color:var(--ink);font-weight:600}
.at-idx a:hover{border-color:#123a5a}
.at-idx svg{width:100%;aspect-ratio:1;border-radius:10px;background:radial-gradient(120% 90% at 30% 20%,#1d5a85 0%,#123a5a 60%,#0b2438 100%)}
.at-idx small{font-weight:400;color:var(--muted)}
</style>`;
