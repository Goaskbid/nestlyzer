/* r19: three place-level stories computed from the same data the app uses, each its own Insights chapter.
   1. Border towns: places that face each other across a national border, figure by figure.
   2. Mergers in numbers: Swiss municipalities that gained thousands of residents overnight by a merger, not migration.
   3. Against the trend: places with a big city and a main railway close by that still shrink, and remote places that grow.
   Every sentence is written from the figures shown; a figure that is missing is left out, never guessed. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const ND = createRequire(import.meta.url)('../src/data.js');

export function buildStories(X) {
  const { ROOT, C, esc, fmt, fmtInt, nm, flagImg, PAGES, pageIns, kick, printBtn, FOOT, fin } = X;
  const META = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json'), 'utf8'));
  const P = [], BY = {};
  for (const c of META.countries) {
    const cc = c.cc, fc = path.join(ROOT, 'data/c', cc + '.json'), fx = path.join(ROOT, 'data/x', cc + '.json');
    if (!fs.existsSync(fc)) continue;
    const d = JSON.parse(fs.readFileSync(fc, 'utf8')), ci = Object.fromEntries(d.cols.map((k, i) => [k, i]));
    const x = fs.existsSync(fx) ? JSON.parse(fs.readFileSync(fx, 'utf8')) : null, xc = (x && x.cols) || {}, xs = (x && x.strs) || [];
    const g5 = (d.fr || {}).common_population_growth_5y || [];
    d.rows.forEach((r, i) => {
      if (ci.sup != null && r[ci.sup]) return;
      const pop = r[ci.pop], area = r[ci.area], t = d.trend && d.trend[i];
      let g = fin(g5[i]) ? g5[i] : null, gp = g == null ? null : '2019–2024';
      if (cc === 'CH' && t && !t.series_break && fin(t.population_5y_pct)) { g = t.population_5y_pct; gp = '2017–2022'; }
      const S = (k) => { const v = (xc[k] || [])[i]; return fin(v) ? xs[v] : null; }, N = (k) => { const v = (xc[k] || [])[i]; return fin(v) ? v : null; };
      const p = { cc, id: cc + ':' + r[ci.oid], oid: r[ci.oid], name: (() => { const n = ND.cleanName(String(r[ci.name] || ''), cc).replace(/^Municipiul /, ''); return /[\u0370-\u03ff\u0400-\u04ff]/.test(n) ? ND.translit(n) : n; })(), pop: fin(pop) && pop > 0 ? pop : null, area: fin(area) && area > 0 ? area : null,
        lat: r[ci.lat], lon: r[ci.lon], g, gp, alt: N('alt'), metro: S('metro'), metroKm: N('metro_km'), railKm: N('rail_km'), pop10: N('pop10'), border: S('border'), borderKm: N('border_km'),
        lake: S('lake'), lakeKm: N('lake_km'), river: S('river'), riverKm: N('river_km') };
      p.dens = p.pop && p.area ? p.pop / p.area : null;
      P.push(p); BY[p.id] = p;
    });
  }
  const href = (p) => PAGES[p.id] || '/#/explore?' + new URLSearchParams({ cc: p.cc, p: 'young_family', sel: p.id }).toString();
  const pl = (p) => `${flagImg(p.cc, 12)} <a href="${esc(href(p))}">${esc(p.name)}</a>`;
  const km = (a, b) => { const R = 6371, t = Math.PI / 180, dl = (b.lat - a.lat) * t, dn = (b.lon - a.lon) * t, h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const sg = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v), d) + '%';
  const out = [];

  /* ---------- 1. border towns ---------- */
  {
    const near = P.filter((p) => p.pop >= 8000 && p.pop <= 1500000 && fin(p.lat) && fin(p.lon) && fin(p.borderKm) && p.borderKm <= 10);
    const cell = {}; for (const p of near) { const k = Math.floor(p.lat * 5) + ',' + Math.floor(p.lon * 5); (cell[k] = cell[k] || []).push(p); }
    const pairs = [], used = new Set();
    for (const a of near) { let best = null, bd = 1e9; const i0 = Math.floor(a.lat * 5), j0 = Math.floor(a.lon * 5);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const b of cell[(i0 + di) + ',' + (j0 + dj)] || []) { if (b.cc === a.cc) continue; const d = km(a, b); if (d < bd) { bd = d; best = b; } }
      if (!best || bd > 12) continue; pairs.push({ a, b: best, d: bd }); }
    /* one pair per town: the largest pairs first, a town that already has its neighbour is not paired again */
    pairs.sort((x, y) => Math.min(y.a.pop, y.b.pop) - Math.min(x.a.pop, x.b.pop)); { const seen = new Set(), keep = []; for (const q of pairs) { if (seen.has(q.a.id) || seen.has(q.b.id)) continue; seen.add(q.a.id); seen.add(q.b.id); keep.push(q); } pairs.length = 0; pairs.push(...keep); }
    const top = pairs.filter((q) => Math.min(q.a.pop, q.b.pop) >= 15000).slice(0, 60);
    if (top.length >= 6) {
      const row = (lab, fa, fb, f) => fin(fa) || fin(fb) ? `<tr><th scope="row">${lab}</th><td>${fin(fa) ? f(fa) : '–'}</td><td>${fin(fb) ? f(fb) : '–'}</td></tr>` : '';
      const said = (q) => { const { a, b } = q, big = a.pop >= b.pop ? a : b, sm = big === a ? b : a, bits = [];
        bits.push(`${esc(big.name)} is the bigger of the two, with ${fmtInt(big.pop)} residents against ${fmtInt(sm.pop)}${sm.pop ? ` (${fmt(big.pop / sm.pop, 1)} times as many)` : ''}.`);
        if (fin(a.dens) && fin(b.dens)) { const ds = a.dens >= b.dens ? a : b, dl = ds === a ? b : a; if (ds.dens > 1.5 * dl.dens) bits.push(`${esc(ds.name)} is the denser, ${fmtInt(ds.dens)} people per km² against ${fmtInt(dl.dens)}.`); }
        if (fin(a.g) && fin(b.g) && Math.sign(a.g) !== Math.sign(b.g) && Math.abs(a.g - b.g) >= 2) { const up = a.g > b.g ? a : b, dn = up === a ? b : a; bits.push(`Over five years ${esc(up.name)} grew (${sg(up.g)}, ${up.gp}) while ${esc(dn.name)} shrank (${sg(dn.g)}, ${dn.gp}).`); }
        if (fin(a.alt) && fin(b.alt) && Math.abs(a.alt - b.alt) >= 150) { const hi = a.alt > b.alt ? a : b, lo = hi === a ? b : a; bits.push(`The ground around ${esc(hi.name)} sits about ${fmtInt(Math.round((hi.alt - lo.alt) / 10) * 10)} m higher.`); }
        return bits.join(' '); };
      const cards = top.map((q) => `<section class="ins-pair"><h3>${pl(q.a)} and ${pl(q.b)}</h3><p class="muted small">${esc(nm(q.a.cc))} and ${esc(nm(q.b.cc))}, ${fmt(q.d, 1)} km apart in a straight line</p><p>${said(q)}</p>
<div class="tablewrap"><table class="table"><thead><tr><th></th><th>${esc(q.a.name)}</th><th>${esc(q.b.name)}</th></tr></thead><tbody>${row('Residents', q.a.pop, q.b.pop, fmtInt)}${row('People per km²', q.a.dens, q.b.dens, fmtInt)}${row('Five-year change', q.a.g, q.b.g, (v) => sg(v))}${row('Terrain around it', q.a.alt, q.b.alt, (v) => 'about ' + fmtInt(Math.round(v / 10) * 10) + ' m')}${row('People within 10 km', q.a.pop10, q.b.pop10, fmtInt)}${row('Main railway line', q.a.railKm, q.b.railKm, (v) => v < 1 ? 'under 1 km' : fmt(v, 1) + ' km')}</tbody></table></div></section>`).join('');
      const nC = new Set(top.flatMap((q) => [q.a.cc + q.b.cc])).size;
      const body = `${kick('inside')}${printBtn}<h1>Border towns: neighbours in different countries</h1>
<p class="lede">Some towns face a foreign town across a river, a street or a field. Same weather, same landscape, often the same commuters, and yet different taxes, schools, prices and rules. Here are the ${top.length} largest pairs on Nestlyzer that lie within 12 km of each other across ${nC} national borders, compared figure by figure.</p>
${C.bars(top.slice(0, 12).map((q) => ({ label: `${esc(q.a.name)} · ${esc(q.b.name)}`, v: q.a.pop + q.b.pop, note: fmt(q.d, 1) + ' km apart' })), { title: 'Combined residents of the twelve largest pairs', fmt: (v) => fmtInt(v), noMedal: true })}
${cards}
<p class="ins-note">How the pairs are found: places with at least 8,000 residents within 10 km of a national border, paired with the nearest place of the same size class in the neighbouring country, at most 12 km apart (straight line between the place centres). Growth compares the same official code over the period shown; a dash means the figure is not published for that place. Scores are ranked inside each country and are therefore not compared across the border here.</p>
${FOOT('Sources: national statistical offices and Eurostat GISCO LAU (residents, area), Nestlyzer geography layer (borders, terrain, railways).')}`;
      pageIns('/insights/border-towns/', 'Border towns: neighbours in different countries, compared', `${top.length} pairs of towns facing each other across a border, from ${esc(top[0].a.name)} and ${esc(top[0].b.name)} down: residents, density, growth and terrain side by side.`, body, 'people');
      out.push('/insights/border-towns/');
    }
  }

  /* ---------- 2. mergers in numbers (Switzerland) ---------- */
  {
    /* the official merger register lives in build_ch_mergers.py (one source of truth); read it with Python's literal parser */
    const M = JSON.parse(execFileSync('python3', ['-c', "import ast,re,json,sys;s=open(sys.argv[1],encoding='utf-8').read();print(json.dumps(ast.literal_eval(re.search(r'^M = (\\[.*?^\\])',s,re.S|re.M).group(1))))", path.join(ROOT, 'build/build_ch_mergers.py')], { encoding: 'utf8' }));
    const CH = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/c/CH.json'), 'utf8')), ci = Object.fromEntries(CH.cols.map((k, i) => [k, i]));
    const row = {}; CH.rows.forEach((r, i) => { row[String(r[ci.oid])] = { r, t: CH.trend && CH.trend[i] }; });
    const lastPop = (o) => { const s = (o && o.t && o.t.annual_population) || []; return s.length ? s[s.length - 1] : null; };
    const ev = [];
    for (const [date, sid, name, prev, founding] of M) {
      const s = row[String(sid)]; if (!s) continue;
      const parts = prev.map((f) => row[String(f)]).filter(Boolean).map((o) => ({ name: String(o.r[ci.name]), pop: (lastPop(o) || {}).population || o.r[ci.pop], year: (lastPop(o) || {}).year, area: o.r[ci.area] }));
      if (!parts.length) continue;
      const added = parts.reduce((t, p) => t + (p.pop || 0), 0);
      ev.push({ date, name, id: 'CH:' + sid, founding, parts, added, pop: s.r[ci.pop], area: s.r[ci.area] });
    }
    ev.sort((a, b) => b.added - a.added);
    if (ev.length >= 6) {
      const top = ev.slice(0, 14), big = top[0];
      const line = (e) => `<li>${flagImg('CH', 12)} <a href="${esc(PAGES[e.id] || '/#/explore?cc=CH&sel=' + encodeURIComponent(e.id))}">${esc(e.name)}</a>, ${esc(e.date)}: ${e.founding ? 'new municipality, formed when the largest former municipality was joined by' : 'absorbed'} ${e.parts.map((p) => `${esc(p.name)} (${fmtInt(p.pop)}${p.year ? ', ' + p.year : ''})`).join(', ')}. That adds ${fmtInt(e.added)} residents${fin(e.area) ? `; the municipality now covers ${fmt(e.area, 1)} km²` : ''}.</li>`;
      const body = `${kick('inside')}${printBtn}<h1>Mergers in numbers: growing overnight</h1>
<p class="lede">On ${esc(big.date)}, ${big.founding ? 'the municipality that became ' + esc(big.name) : esc(big.name)} gained ${fmtInt(big.added)} residents in a single day. Nobody moved: ${big.parts.length === 1 ? esc(big.parts[0].name) + ' joined it' : 'its neighbours joined it'}. Swiss municipalities merge every year, and each merger shows up in the statistics as a jump that looks like a population boom. Here are the ${ev.length} mergers since 2021, the biggest first.</p>
${C.bars(top.map((e) => ({ label: esc(e.name), v: e.added, note: e.date })), { title: 'Residents added by the merger (the former municipalities’ last count)', fmt: (v) => fmtInt(v), noMedal: true })}
<h2>Why this is not migration</h2>
<p>A merger moves a border, not people. The residents of the former municipality are counted in the new one from the merger date, so the yearly series of the successor jumps by about the size of the former municipality. For the mergers listed here, Nestlyzer does not compare figures across the change: either the former municipalities are added year by year, so the whole series describes the same territory, or the comparable series starts at the merger and the page says so; the land area and density are those of the merged municipality. Mergers before 2021 are not in this register; where a series jumps sharply, the page flags a possible boundary change rather than explaining it.</p>
<h2>All mergers since 2021</h2><ul class="ins-list">${ev.map(line).join('')}</ul>
<p class="ins-note">Founding: several municipalities form a new one with a new number. Absorption: one municipality joins an existing one. Residents are the former municipalities’ latest published count before the merger (year in brackets).</p>
${FOOT('Sources: Swiss Federal Statistical Office (official municipality register and mutations; permanent resident population as published in the Eurostat GISCO LAU releases).')}`;
      pageIns('/insights/mergers-in-numbers/', 'Mergers in numbers: Swiss towns that grew overnight', `${esc(big.name)} gained ${fmtInt(big.added)} residents in one day without anyone moving. ${ev.length} Swiss mergers since 2021, ranked, and why they are not migration.`, body, 'people');
      out.push('/insights/mergers-in-numbers/');
    }
  }

  /* ---------- 3. against the trend ---------- */
  {
    const G = P.filter((p) => fin(p.g) && p.pop >= 5000 && Math.abs(p.g) <= 25);
    const cityShrink = G.filter((p) => p.g <= -2 && fin(p.metroKm) && p.metroKm <= 20 && fin(p.railKm) && p.railKm <= 2).sort((a, b) => a.g - b.g).slice(0, 15);
    const remoteGrow = G.filter((p) => p.g >= 4 && p.g <= 15 && (!p.metro || (fin(p.metroKm) && p.metroKm >= 60)) && fin(p.pop10) && p.pop10 < 60000).sort((a, b) => b.g - a.g).slice(0, 15);
    if (cityShrink.length >= 5 && remoteGrow.length >= 5) {
      const bar = (arr, t, tone) => C.bars(arr.map((p) => ({ label: `${flagImg(p.cc, 12)} <a href="${esc(href(p))}">${esc(p.name)}</a>`, v: p.g, note: `${fmtInt(p.pop)} residents` + (fin(p.metroKm) && p.metro ? `, ${fmt(p.metroKm, 0)} km from the centre of Greater ${p.metro}` : '') + `, ${p.gp}` })), { title: t, fmt: (v) => sg(v), noMedal: true, tone: () => tone });
      const a = cityShrink[0], b = remoteGrow[0];
      const body = `${kick('inside')}${printBtn}<h1>Against the trend: shrinking near the city, growing far from it</h1>
<p class="lede">The usual story is simple: people move towards big cities and away from remote places. The numbers do not always agree. ${esc(a.name)} lies ${fmt(a.metroKm, 0)} km from the centre of Greater ${esc(a.metro)} with a main railway line ${a.railKm < 1 ? 'under 1 km' : fmt(a.railKm, 1) + ' km'} away, and still lost ${fmt(Math.abs(a.g), 1)}% of its residents in five years. ${esc(b.name)}, far from any big city, grew ${fmt(b.g, 1)}%. Here are the places that most clearly break the pattern in the ${new Set(G.map((p) => p.cc)).size} countries where comparable five-year figures are published.</p>
<h2>Near a big city, on the railway, and shrinking</h2>
<p>Places of 5,000 residents or more within 20 km of the centre of a greater city area and within 2 km of a main railway line, whose population fell by 2% or more in five years.</p>
${bar(cityShrink, 'Five-year population change', 'b')}
<h2>Far from any big city, and growing</h2>
<p>Places of 5,000 residents or more at least 60 km from the centre of a greater city area (or outside any), with fewer than 60,000 people within 10 km, whose population grew by 4% to 15% in five years.</p>
${bar(remoteGrow, 'Five-year population change', 'g')}
<h2>What the numbers do and do not say</h2>
<p>Population change is births minus deaths plus people moving in minus people moving out. These figures show the total only, so they do not say which part drives it: an ageing town can shrink with nobody leaving, and a growing one may simply have more births. Boundary changes can also move the figures; each place page shows its own yearly series where it is published.</p>
${FOOT('Sources: Eurostat GISCO LAU population 2019 and 2024 (same official code in both years), Swiss Federal Statistical Office 2017 and 2022; Nestlyzer geography layer (greater city areas, railways, people within 10 km).')}`;
      pageIns('/insights/against-the-trend/', 'Against the trend: shrinking near the city, growing far from it', `${esc(a.name)} is ${fmt(a.metroKm, 0)} km from Greater ${esc(a.metro)} on the railway and still shrank ${fmt(Math.abs(a.g), 1)}%; ${esc(b.name)}, far from any big city, grew ${fmt(b.g, 1)}%. The places that break the pattern.`, body, 'people');
      out.push('/insights/against-the-trend/');
    }
  }
  return out;
}
