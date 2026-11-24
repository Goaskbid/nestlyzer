/* r14: Nestlyzer Book of Records. One page of records computed from the same official data the app uses: biggest,
   smallest, highest, fastest-growing and fastest-shrinking places, the great metro areas compared, demographic and
   economic outliers between countries, and the top business clusters. Every chart carries a text written from its numbers.
   Called from insights.mjs with its helpers; adds one page (/insights/records/). */
import fs from 'node:fs';
import path from 'node:path';

export function buildRecords(X) {
  const { ROOT, C, esc, fmt, fmtInt, nm, cl, flagImg, PAGES, N, NV, pageIns, kick, printBtn, FOOT, corr, strength, median, fin, list, sgn } = X;
  const META = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json'), 'utf8'));
  const P = [], METROS = [];
  for (const c of META.countries) {
    const cc = c.cc, fc = path.join(ROOT, 'data/c', cc + '.json'), fx = path.join(ROOT, 'data/x', cc + '.json');
    if (!fs.existsSync(fc)) continue;
    const d = JSON.parse(fs.readFileSync(fc, 'utf8')), ci = Object.fromEntries(d.cols.map((k, i) => [k, i]));
    const x = fs.existsSync(fx) ? JSON.parse(fs.readFileSync(fx, 'utf8')) : null, xc = (x && x.cols) || {}, xs = (x && x.strs) || [];
    const fr = d.fr || {}, g5 = fr.common_population_growth_5y || [], coast = fr.geo_coast_km || [], city = fr.geo_major_city_km || [];
    const metroPop = {};
    d.rows.forEach((r, i) => {
      const pop = r[ci.pop], area = r[ci.area];
      const p = { cc, id: cc + ':' + r[ci.oid], name: String(r[ci.name] || ''), pop: fin(pop) ? pop : null, area: fin(area) && area > 0 ? area : null, dens: fin(r[ci.dens]) ? r[ci.dens] : null,
        g5: fin(g5[i]) ? g5[i] : null, alt: fin((xc.alt || [])[i]) ? xc.alt[i] : null, coast: fin(coast[i]) ? coast[i] : null, city: fin(city[i]) ? city[i] : null,
        lat: fin(r[ci.lat]) ? r[ci.lat] : null, lon: fin(r[ci.lon]) ? r[ci.lon] : null, pop10: fin((xc.pop10 || [])[i]) ? xc.pop10[i] : null, lake: fin((xc.lake || [])[i]) ? xs[xc.lake[i]] : null, lakeKm: fin((xc.lake_km || [])[i]) ? xc.lake_km[i] : null, sup: ci.sup != null && !!r[ci.sup] };
      P.push(p);
      const mi = (xc.metro || [])[i]; if (fin(mi) && fin(p.pop)) { const k = xs[mi]; metroPop[k] = (metroPop[k] || 0) + p.pop; }
    });
    for (const m of (x && x.metros) || []) if (m[3]) METROS.push({ cc, name: String(m[0]).replace(/\s+/g, ' '), pop: m[1], places: m[2], residents: metroPop[m[0]] || null });
  }
  const href = (p) => PAGES[p.id] || '/#/explore?' + new URLSearchParams({ cc: p.cc, p: 'young_family', sel: p.id }).toString();
  const pl = (p) => `${flagImg(p.cc, 12)}<a href="${esc(href(p))}">${esc(p.name)}</a>`;
  const plT = (p) => `${esc(p.name)} (${esc(nm(p.cc))})`;
  const top = (arr, key, n, dir = -1) => arr.filter((p) => fin(p[key])).sort((a, b) => dir * (a[key] - b[key]) || a.name.localeCompare(b.name)).slice(0, n);
  const PN = '/insights/records/', S = [], sec = (id, h, intro, html) => S.push({ id, h, html: `<h2 id="${id}">${h}</h2><p>${intro}</p>${html}` });
  const ratio = (a, b) => a / b >= 1.95 ? fmt(a / b, 1) + ' times' : fmt((a / b - 1) * 100, 0) + '% more than';

  /* ---------- 1. size ---------- */
  {
    const big = top(P, 'pop', 12), dense = top(P.filter((p) => p.pop >= 20000), 'dens', 10), wide = top(P.filter((p) => p.pop > 0), 'area', 10);
    const tiny = P.filter((p) => fin(p.pop) && p.pop > 0).sort((a, b) => a.pop - b.pop).slice(0, 10);
    const all = P.filter((p) => fin(p.pop)).length, tot = P.reduce((s, p) => s + (p.pop || 0), 0);
    sec('size', 'Biggest, smallest, most crowded', `The ${fmtInt(all)} places Nestlyzer covers are home to ${fmt(tot / 1e9, 2)} billion people. ${plT(big[0])} is the largest with ${fmtInt(big[0].pop)} residents, ${ratio(big[0].pop, big[1].pop)} ${plT(big[1])}. At the other end, ${esc(tiny[0].name)} in ${esc(nm(tiny[0].cc))} counts ${fmtInt(tiny[0].pop)} ${tiny[0].pop === 1 ? 'resident' : 'residents'}.`,
      C.bars(big.map((p) => ({ label: pl(p), v: p.pop })), { title: 'Most residents: the largest places', fmt: (v) => fmtInt(v), caption: 'Residents within the municipal or city boundary, latest official count. Metro areas are larger; see below.' }) +
      `<div class="ins-two">` +
      C.bars(dense.map((p) => ({ label: pl(p), v: p.dens, note: fmtInt(p.pop) + ' residents' })), { title: 'Most crowded: residents per km² (places of 20,000+)', fmt: (v) => fmtInt(v), caption: `${plT(dense[0])} packs ${fmtInt(dense[0].dens)} people onto every square kilometre; the typical place covered has ${fmtInt(median(P.map((p) => p.dens)))}.` }) +
      C.bars(wide.map((p) => ({ label: pl(p), v: p.area, note: fmtInt(p.pop) + ' residents' })), { title: 'Largest by area, km²', fmt: (v) => fmtInt(v), caption: `${plT(wide[0])} covers ${fmtInt(wide[0].area)} km², more than ${fmtInt(wide[0].area / 41285 * 100)}% of the area of Switzerland.` }) +
      `</div><p class="ins-take"><b>Villages run the map.</b> Half of all places covered have fewer than ${fmtInt(median(P.map((p) => p.pop)))} residents, which is why most of the map is villages rather than cities. The smallest ones below are real, self-governing communities: they elect a council, keep a budget and sometimes share a mayor with the next valley. ${(() => { const ps = P.filter((p) => fin(p.pop) && p.pop > 0).map((p) => p.pop).sort((a, b) => b - a), tot = ps.reduce((t, v) => t + v, 0), k = Math.max(1, Math.round(ps.length / 100)), top1 = ps.slice(0, k).reduce((t, v) => t + v, 0), half = ps.slice(Math.floor(ps.length / 2)).reduce((t, v) => t + v, 0); return `The imbalance is steep: the largest 1% of places hold ${fmt(100 * top1 / tot, 0)}% of all residents, while the smaller half of all places together hold just ${fmt(100 * half / tot, 1)}%. Rankings treat every one of them as a place in its own right, which is why a village can top a list that a capital never makes.`; })()}</p>` + C.league(['#', 'Smallest communities', 'Country', 'Residents'], tiny.map((p, i) => [i + 1, pl(p), esc(nm(p.cc)), fmtInt(p.pop)])));
  }

  /* ---------- 2. height and edges ---------- */
  {
    const high = top(P.filter((p) => p.pop >= 1000), 'alt', 10), low = top(P.filter((p) => p.pop >= 1000), 'alt', 10, 1), far = top(P.filter((p) => p.pop >= 5000 && p.coast <= 2700), 'coast', 10);   // r15: no inhabited place is more than ~2,650 km from the sea; larger values are overseas territories measured against the mainland coast
    sec('height', 'Highest, lowest, farthest from the sea', `Altitude is one of the strongest single influences on climate. Among places with at least 1,000 residents, ${plT(high[0])} sits highest at about ${fmtInt(high[0].alt)} m; ${plT(low[0])} lies lowest at ${fmtInt(low[0].alt)} m.`,
      `<div class="ins-two">` +
      C.bars(high.map((p) => ({ label: pl(p), v: p.alt, note: fmtInt(p.pop) + ' residents' })), { title: 'Highest places, metres above sea level', fmt: (v) => fmtInt(v) + ' m', noMedal: false, caption: 'Terrain height at the place centre (open elevation model).' }) +
      C.bars(low.map((p) => ({ label: pl(p), v: p.alt, note: fmtInt(p.pop) + ' residents' })), { title: 'Lowest places, metres', fmt: (v) => fmtInt(v) + ' m', tone: (v) => v < 0 ? 'b' : '', caption: low[0].alt < 0 ? `${fmtInt(low.filter((p) => p.alt < 0).length)} of these ten lie below sea level.` : 'Lowest terrain height at the place centre.' }) +
      `</div>` + C.bars(far.map((p) => ({ label: pl(p), v: p.coast, note: fmtInt(p.pop) + ' residents' })), { title: 'Farthest from any sea coast, km (places of 5,000+)', fmt: (v) => fmtInt(v) + ' km', caption: `From ${plT(far[0])} the nearest sea coast is ${fmtInt(far[0].coast)} km away, about as far as from Zurich to Lisbon.` }) + `<p class="ins-take"><b>A hundred metres up.</b> Every 100 metres up costs roughly 0.6 °C, so a town at ${fmtInt(high[0].alt)} m lives with a climate about ${fmt(high[0].alt * 0.0065, 0)} °C cooler than the coast at the same latitude. That is the standard temperature lapse rate, an average; actual snow and frost depend on the local climate, which the place pages show where measured. The low end has its own story: places below sea level exist only because dikes, pumps and a lot of maintenance keep the water out.</p>`);
  }

  /* ---------- 3. growth and decline, with what the data shows alongside ---------- */
  {
    const G = P.filter((p) => fin(p.g5) && p.pop >= 5000 && p.g5 <= 40 && p.g5 >= -40), up = top(G, 'g5', 15), down = top(G, 'g5', 15, 1);
    if (G.length > 500) {
      const q = (arr, k) => median(arr.map((p) => p[k]).filter(fin)), dec = Math.max(50, Math.round(G.length / 10));
      const fast = G.slice().sort((a, b) => b.g5 - a.g5).slice(0, dec), slow = G.slice().sort((a, b) => a.g5 - b.g5).slice(0, dec);
      const why = [];
      const cmp = (k, unit, lab) => { const a = q(slow, k), b = q(fast, k); if (fin(a) && fin(b) && Math.abs(a - b) > 0.15 * Math.max(Math.abs(a), Math.abs(b), 1)) why.push(`${lab} ${fmtInt(a)}${unit} for the shrinking tenth against ${fmtInt(b)}${unit} for the growing tenth`); };
      cmp('city', ' km', 'the nearest major city is a median'); cmp('alt', ' m', 'they lie at a median'); cmp('pop', '', 'the typical one has'); cmp('coast', ' km', 'the coast is a median');
      const byC = {}; for (const p of G) (byC[p.cc] ||= []).push(p);
      const share = Object.entries(byC).filter(([, a]) => a.length >= 30).map(([cc, a]) => ({ cc, v: a.filter((p) => p.g5 > 0).length / a.length * 100, n: a.length })).sort((a, b) => b.v - a.v);
      const pts = G.filter((p) => fin(p.city)).map((p) => ({ key: p.id, name: p.name, x: Math.log10(Math.max(1, p.city)), y: Math.max(-25, Math.min(40, p.g5)) }));
      const r = corr(pts.map((p) => p.x), pts.map((p) => p.y));
      sec('growth', 'Fastest growing, fastest shrinking, and why', `Over five years, ${fmtInt(G.filter((p) => p.g5 > 0).length)} of ${fmtInt(G.length)} places of 5,000+ residents in ${Object.keys(byC).length} countries gained people and ${fmtInt(G.filter((p) => p.g5 < 0).length)} lost them. ${plT(up[0])} grew fastest (${sgn(up[0].g5, 1, '%')}); ${plT(down[0])} shrank most (${sgn(down[0].g5, 1, '%')}).`,
        `<div class="ins-two">` +
        C.bars(up.map((p) => ({ label: pl(p), v: p.g5, note: fmtInt(p.pop) + ' residents' })), { title: 'Fastest growing: change in residents over 5 years, %', fmt: (v) => sgn(v, 1), tone: () => 'g', caption: 'Places of 5,000+ residents; official municipal counts five years apart. Changes beyond ±40% are left out: at that size they almost always reflect a boundary change, not people.' }) +
        C.bars(down.map((p) => ({ label: pl(p), v: p.g5, note: fmtInt(p.pop) + ' residents' })), { title: 'Fastest shrinking: change over 5 years, %', fmt: (v) => sgn(v, 1), tone: () => 'b', caption: 'A five-year total only: the figures do not say whether fewer births, more deaths or people leaving drive it.' }) +
        `</div><p class="ins-take"><b>What sets shrinking places apart?</b> Comparing the tenth that shrank most with the tenth that grew most: ${why.length ? list(why) + '.' : 'distance, height and size differ little, so local causes (a closed employer, a new rail link) dominate.'} Distance to a major city and growth show ${strength(r).replace(/^a /, 'a ')} link (correlation ${fmt(r, 2)}): ${r < -0.15 ? 'the farther from a big city, the more likely a place loses people.' : 'remoteness alone does not decide it.'} These are patterns in the data, not proven causes.</p>` +
        C.density(pts, { title: 'Distance to a major city against 5-year growth', xl: 'Distance to the nearest major city, km (log scale)', xlS: 'Distance', yl: 'Change in residents over 5 years, %', ylS: '5-year change', xfmt: (v) => fmtInt(Math.pow(10, v)), yfmt: (v) => fmt(v, 0), highlights: [...pts.slice().sort((a, b) => b.y - a.y).slice(0, 2), ...pts.slice().sort((a, b) => a.y - b.y).slice(0, 2)], caption: `Darker cells hold more places; the line is the typical change at each distance. ${fmtInt(pts.length)} places in all; changes beyond −25% and +40% are drawn at the edge.` }) +
        C.bars(share.map((s) => ({ label: `${flagImg(s.cc, 12)}${esc(nm(s.cc))}`, v: s.v, note: fmtInt(s.n) + ' places' })), { title: 'Share of places (5,000+) that grew over 5 years, %', fmt: (v) => fmt(v, 0) + '%', tone: (v) => v >= 50 ? 'g' : 'b', caption: `Growth is concentrated: in ${esc(nm(share[0].cc))} ${fmt(share[0].v, 0)}% of places grew, in ${esc(nm(share[share.length - 1].cc))} only ${fmt(share[share.length - 1].v, 0)}%.` }));
    }
  }

  /* ---------- 4. great metro areas ---------- */
  {
    const seen = new Set(), M = METROS.sort((a, b) => b.pop - a.pop).filter((m) => { const k = m.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    const T = M.slice(0, 20), first = {}; for (const m of M) if (!first[m.cc]) first[m.cc] = m;
    const lead = Object.values(first).sort((a, b) => b.pop - a.pop);
    const pair = (a, b) => { const x = M.find((m) => m.name === a), y = M.find((m) => m.name === b); return x && y ? `Greater ${esc(x.name)} (${fmtInt(x.pop)}) is ${ratio(x.pop, y.pop)} greater ${esc(y.name)} (${fmtInt(y.pop)}).` : ''; };
    const nat = {}; for (const p of P) nat[p.cc] = (nat[p.cc] || 0) + (p.pop || 0);
    const prim = lead.filter((m) => nat[m.cc] > 1e6).map((m) => ({ ...m, v: m.pop / nat[m.cc] * 100 })).filter((m) => m.v < 100).sort((a, b) => b.v - a.v).slice(0, 12);
    sec('metros', 'The great metro areas', `City limits hide how big a city really is. Counting everyone in the built-up area, the largest metro covered is greater ${esc(T[0].name)} with about ${fmtInt(T[0].pop)} people. ${pair('Moscow', 'Berlin') || pair(T[0].name, T[1].name)} ${pair('Paris', 'London')}`,
      C.bars(T.map((m) => ({ label: `${flagImg(m.cc, 12)}${esc(m.name)}`, v: m.pop, note: m.places ? fmtInt(m.places) + ' places in its reach' : '' })), { title: 'Largest metro areas: people in the built-up area', fmt: (v) => fmtInt(v), caption: 'Metro population as estimated by Natural Earth (public domain); "places in its reach" counts the Nestlyzer places within 20–60 km of the core, more for bigger cities.' }) +
      C.bars(prim.map((m) => ({ label: `${flagImg(m.cc, 12)}${esc(m.name)} <small class="muted">${esc(nm(m.cc))}</small>`, v: m.v })), { title: 'Top-heavy countries: share of residents in the largest metro area, %', fmt: (v) => fmt(v, 0) + '%', caption: prim.length ? `${fmt(prim[0].v, 0)}% of everyone counted in ${esc(nm(prim[0].cc))} lives in greater ${esc(prim[0].name)}, the most concentrated country here; in ${esc(nm(prim[prim.length - 1].cc))} the biggest metro holds ${fmt(prim[prim.length - 1].v, 0)}%.` : '' }) + `<p class="ins-take"><b>One capital, or ten regional towns.</b> Some countries pour almost everything into one capital: jobs, universities, airports and ambition. Others spread it across a string of regional centres. It shows up in daily life. In a top-heavy country, "moving for work" usually means moving to the capital; in a spread-out one, a good job may be two towns away.</p>`);
  }

  /* ---------- 5. countries: demographic and economic outliers ---------- */
  {
    const keys = [['life_expectancy', 'Longest lives', 'years', 1, (v) => fmt(v, 1) + ' yrs'], ['growth_5y', 'Fastest-growing economies, 5 years', '%', 1, (v) => sgn(v, 1, '%')], ['unemployment', 'Lowest unemployment', '%', -1, (v) => fmt(v, 1) + '%'], ['female_lfp', 'Most women in work', '%', 1, (v) => fmt(v, 0) + '%'], ['homicide', 'Safest from homicide (per 100,000)', '', -1, (v) => fmt(v, 1)], ['inflation', 'Highest inflation', '%', 1, (v) => fmt(v, 1) + '%'], ['pm25', 'Cleanest air (PM2.5, µg/m³)', '', -1, (v) => fmt(v, 1)], ['tertiary', 'Most university graduates', '%', 1, (v) => fmt(v, 0) + '%']];
    const card = ([k, t, , dir, f]) => { const rows = Object.keys(N.countries).map((cc) => ({ cc, v: NV(cc, k) })).filter((r) => fin(r.v)).sort((a, b) => dir * (b.v - a.v)); if (rows.length < 10) return ''; const lo = rows[rows.length - 1];
      return `<div><b>${esc(t)}</b><ol>${rows.slice(0, 3).map((r, i) => `<li>${C.medal(i)} ${cl(r.cc)} <span class="muted small">${esc(f(r.v))}</span></li>`).join('')}</ol><p class="small muted" style="margin:4px 0 0">At the other end: ${esc(nm(lo.cc))}, ${esc(f(lo.v))}.</p></div>`; };
    const le = Object.keys(N.countries).map((cc) => ({ cc, v: NV(cc, 'life_expectancy'), g: NV(cc, 'gni_pc_ppp') })).filter((r) => fin(r.v) && fin(r.g));
    const pts = le.map((r) => ({ key: r.cc, name: nm(r.cc), x: Math.log10(r.g), y: r.v })), rr = corr(pts.map((p) => p.x), pts.map((p) => p.y));
    const fitL = (() => { const n = pts.length, mx = pts.reduce((a, p) => a + p.x, 0) / n, my = pts.reduce((a, p) => a + p.y, 0) / n; let sxy = 0, sxx = 0; for (const p of pts) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; } const b = sxy / sxx; return (x) => my + b * (x - mx); })();
    const res = pts.map((p) => ({ ...p, d: p.y - fitL(p.x) })).sort((a, b) => b.d - a.d), over = res.slice(0, 3), under = res.slice(-3).reverse();
    sec('countries', 'Country records and anomalies', `Records between the ${Object.keys(N.countries).length} countries with comparable national figures, and the outliers that break the usual pattern.`,
      `<div class="ins-pod">${keys.map(card).join('')}</div>` +
      C.scatter(pts, { title: 'Money buys years, mostly: income against life expectancy', xl: 'Income per person, PPP dollars (log scale)', xlS: 'Income', yl: 'Life expectancy at birth, years', ylS: 'Life expectancy', xfmt: (v) => fmtInt(Math.pow(10, v)), yfmt: (v) => fmt(v, 0), trend: true, labels: [...over, ...under], caption: `Income and life expectancy show ${strength(rr).replace(/^a /, 'a ')} link (${fmt(rr, 2)}). The anomalies: people in ${list(over.map((p) => esc(p.name)))} live ${fmt(over[0].d, 1)}+ years longer than their income predicts; in ${list(under.map((p) => esc(p.name)))} they live up to ${fmt(-under[0].d, 1)} years less.` }));
  }

  /* ---------- r19: more records, each with what the numbers mean ---------- */
  const Q = P.filter((p) => !p.sup && fin(p.lat) && fin(p.lon) && fin(p.pop) && p.pop > 0);
  const kmD = (a, b) => { const t = Math.PI / 180, dl = (b.lat - a.lat) * t, dn = (b.lon - a.lon) * t, x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dn / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  /* 7. the loneliest places: farthest from the next place of 1,000+ residents */
  {
    const B = Q.filter((p) => p.pop >= 1000), cell = {}; for (const p of B) { const k = Math.floor(p.lat) + ',' + Math.floor(p.lon); (cell[k] ||= []).push(p); }
    const nn = (p) => { let best = 1e9; for (let r = 0; r <= 6 && best > r * 70; r++) for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) { if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue; for (const q of cell[(Math.floor(p.lat) + i) + ',' + (Math.floor(p.lon) + j)] || []) if (q !== p) { const d = kmD(p, q); if (d < best) best = d; } } return best; };
    const L = B.filter((p) => p.pop >= 5000).map((p) => ({ ...p, nn: nn(p) })).filter((p) => p.nn < 1e8).sort((a, b) => b.nn - a.nn).slice(0, 12);
    const med = median(B.filter((p) => p.pop >= 5000).slice(0, 4000).map(nn).filter((d) => d < 1e8));
    if (L.length >= 6) sec('lonely', 'The loneliest towns', `Most towns have a neighbour within a few kilometres: for places of 5,000 residents or more, the median distance to the next place of 1,000+ people is about ${fmt(med, 1)} km. ${plT(L[0])} is the great exception, ${fmtInt(L[0].nn)} km from its nearest neighbour of that size.`,
      C.bars(L.map((p) => ({ label: pl(p), v: p.nn, note: fmtInt(p.pop) + ' residents' })), { title: 'Distance to the nearest place of 1,000+ residents, km (places of 5,000+)', fmt: (v) => fmtInt(v) + ' km', noMedal: false, caption: 'Straight-line distance between place centres.' }) +
      `<p class="ins-take"><b>Isolation is a geography lesson.</b> The list is a tour of the edges of the map: deserts, tundra, islands and mountain plateaus. ${L.filter((p) => fin(p.coast) && p.coast < 5).length} of these ${L.length} towns lie within 5 km of the sea, which says something about how remote settlements cling to the coast; the others sit where the road network thins out. For anyone who values space, these are the extremes; for anyone who needs a second town nearby for work or school, they are a warning about averages.</p>`);
  }
  /* 8. small places in the shadow of giants */
  {
    const S2 = Q.filter((p) => fin(p.pop10) && p.pop >= 2000 && p.pop <= 30000).map((p) => ({ ...p, ratio: p.pop10 / p.pop })).sort((a, b) => b.ratio - a.ratio).slice(0, 12);
    const all = Q.filter((p) => fin(p.pop10) && p.pop >= 2000), medR = median(all.map((p) => p.pop10 / p.pop));
    if (S2.length >= 6) sec('shadow', 'Small towns in the shadow of giants', `Draw a 10 km circle around a typical place of 2,000+ residents and you find about ${fmt(medR, 1)} times its own population inside. Around ${plT(S2[0])} the circle holds ${fmtInt(S2[0].pop10)} people, ${fmtInt(S2[0].ratio)} times its own ${fmtInt(S2[0].pop)}.`,
      C.bars(S2.map((p) => ({ label: pl(p), v: p.ratio, note: fmtInt(p.pop) + ' residents, ' + fmtInt(p.pop10) + ' within 10 km' })), { title: 'People within 10 km per resident (places of 2,000 to 30,000)', fmt: (v) => fmtInt(v) + '×', noMedal: false, caption: 'People within 10 km of the place centre, from the population grid.' }) +
      `<p class="ins-take"><b>Small address, big city.</b> These are small municipalities that sit inside or against a metropolis. On paper they are villages or towns; in practice their residents share the city’s roads, labour market and crowds. Rankings that look only at a municipality’s own size miss this, which is why Nestlyzer also counts the people within 10 km.</p>`);
  }
  /* 9. lakes with the most towns on their shores */
  {
    const byL = {}; for (const p of Q) if (p.lake && fin(p.lakeKm) && p.lakeKm < 1) (byL[p.lake + '|' + p.cc] ||= []).push(p);
    const lakes = Object.entries(byL).map(([k, a]) => ({ name: k.split('|')[0], cc: k.split('|')[1], n: a.length, pop: a.reduce((t, p) => t + p.pop, 0), big: a.sort((x, y) => y.pop - x.pop)[0] })).filter((l) => l.n >= 3).sort((a, b) => b.n - a.n).slice(0, 12);
    if (lakes.length >= 5) sec('lakes', 'The busiest lake shores', `Lakes gather towns. ${esc(lakes[0].name)} has ${lakes[0].n} places within 1 km of its shore, home to ${fmtInt(lakes[0].pop)} people, the largest of them ${plT(lakes[0].big)}.`,
      C.bars(lakes.map((l) => ({ label: `${flagImg(l.cc, 12)} ${esc(/lake|lac|lago|see|sjön|järvi|meer|jezioro|jezero|vatn/i.test(l.name) ? l.name : 'Lake ' + l.name)}`, v: l.n, note: fmtInt(l.pop) + ' residents, largest ' + esc(l.big.name) })), { title: 'Places within 1 km of the same large lake', fmt: (v) => fmtInt(v), noMedal: false, caption: 'Large lakes (25 km² and more); a place counts when its centre is within 1 km of the shore.' }) +
      `<p class="ins-take"><b>Why the shore fills up.</b> Before railways, lakes were the motorways: goods and people moved by boat, so towns grew at the water’s edge and stayed there. Today the same shores combine a view, flat building land and short distances, and the rankings reward them for people who value water nearby. ${(() => { const sh = Q.filter((p) => p.lake && fin(p.lakeKm) && p.lakeKm < 1 && fin(p.dens) && p.pop >= 1000), cs = new Set(sh.map((p) => p.cc)), inl = Q.filter((p) => cs.has(p.cc) && !(p.lake && fin(p.lakeKm) && p.lakeKm < 1) && fin(p.dens) && p.pop >= 1000), a = median(sh.map((p) => p.dens)), b = median(inl.map((p) => p.dens)); return fin(a) && fin(b) ? ` In the same countries, lake-shore places of 1,000+ residents have a median of ${fmtInt(a)} people per km\u00b2 against ${fmtInt(b)} for the rest${a > b * 1.15 ? ': the shore is the crowded part of the map' : a < b * 0.87 ? ': the shore is, surprisingly, the roomier part' : ', almost the same'}.` : ''; })()}</p>`);
  }
  /* 10. daylight records, from latitude alone (astronomy, not weather) */
  {
    const dayLen = (lat, decl) => { const t = Math.PI / 180, x = -Math.tan(lat * t) * Math.tan(decl * t) - Math.sin(-0.833 * t) / (Math.cos(lat * t) * Math.cos(decl * t)); return x <= -1 ? 24 : x >= 1 ? 0 : 2 * Math.acos(x) / t / 15; };
    const D = Q.filter((p) => p.pop >= 1000).map((p) => ({ ...p, w: dayLen(p.lat, -23.44), s: dayLen(p.lat, 23.44) }));
    const short = D.slice().sort((a, b) => a.w - b.w || b.lat - a.lat).slice(0, 10), swing = D.slice().sort((a, b) => (b.s - b.w) - (a.s - a.w)).slice(0, 1)[0], eq = D.slice().sort((a, b) => Math.abs(a.lat) - Math.abs(b.lat))[0];
    const hmF = (h) => h >= 24 ? '24 h' : h <= 0 ? '0 h' : Math.floor(h) + ' h ' + String(Math.round((h % 1) * 60)).padStart(2, '0') + ' min';
    if (short.length >= 5) sec('daylight', 'Daylight extremes', `Latitude alone decides how long the sun is up. In ${plT(short[0])} ${short[0].w <= 0 ? 'the sun does not rise at all on the shortest day of the year' : 'the shortest day of the year brings ' + hmF(short[0].w) + ' of daylight'}; in ${plT(eq)}, close to the equator, every day of the year lasts about 12 hours. The biggest swing between midwinter and midsummer belongs to ${plT(swing)}: ${swing.w <= 0 && swing.s >= 24 ? 'polar night in December, midnight sun in June' : hmF(swing.w) + ' against ' + hmF(swing.s)}.`,
      C.bars(short.map((p) => ({ label: pl(p), v: p.w, note: 'midsummer: ' + hmF(p.s) })), { title: 'Shortest day of the year, hours of daylight (places of 1,000+)', fmt: (v) => hmF(v), noMedal: false, tone: () => 'b', caption: 'Computed from latitude for 21 December, sunrise to sunset including refraction; mountains and weather can shorten it locally.' }) +
      `<p class="ins-take"><b>The year is a deal.</b> Places with the darkest Decembers get the brightest Junes, so their annual total of possible daylight is no smaller than anywhere else. What changes is the rhythm: lamps on at three in the afternoon in winter, light at midnight in summer.</p>`);
  }
  /* 11. the compass points: northernmost, southernmost, easternmost, westernmost */
  {
    const Z = Q.filter((p) => p.pop >= 1000), ext = (f) => Z.reduce((m, p) => f(p) > f(m) ? p : m, Z[0]);
    const n = ext((p) => p.lat), so = ext((p) => -p.lat), e = ext((p) => p.lon), w = ext((p) => -p.lon);
    if (Z.length > 100) sec('compass', 'The four corners of the map', `Of all ${fmtInt(Z.length)} places with 1,000 or more residents, ${plT(n)} lies farthest north (${fmt(n.lat, 2)}° N) and ${plT(so)} farthest south (${fmt(Math.abs(so.lat), 2)}° ${so.lat < 0 ? 'S' : 'N'}). The westernmost is ${plT(w)} and the easternmost ${plT(e)}, on opposite sides of the date line.`,
      `<ul class="ins-list"><li>North: ${pl(n)}, ${fmtInt(n.pop)} residents</li><li>South: ${pl(so)}, ${fmtInt(so.pop)} residents</li><li>West: ${pl(w)}, ${fmtInt(w.pop)} residents</li><li>East: ${pl(e)}, ${fmtInt(e.pop)} residents</li></ul><p class="ins-take"><b>Extremes make good trivia and poor guides.</b> None of these places is typical of its country, and each shows what happens at the edges: short or endless days, long distances, small populations holding on. Their pages show how they rank for each kind of household anyway.</p>`);
  }

  /* ---------- 6. business clusters ---------- */
  {
    const W = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/rank/world.json'), 'utf8')).profiles, PROF = META.config.profiles;
    const ids = ['biz_semis', 'biz_pharma_production', 'biz_datacenter', 'biz_finance', 'biz_auto', 'biz_cleantech', 'biz_logistics', 'biz_tech', 'biz_lab', 'biz_hq', 'biz_media', 'biz_energy_intensive'].filter((k) => W[k] && W[k].top && W[k].top.length >= 3 && PROF[k]);
    const cards = ids.map((k) => { const t = W[k].top, slug = k.replace(/_/g, '-');
      const cs = {}; for (const r of t.slice(0, 20)) { const cc = String(r[0]).split(':')[0]; cs[cc] = (cs[cc] || 0) + 1; } const lead = Object.entries(cs).sort((a, b) => b[1] - a[1])[0];
      return `<div><b><a href="/rankings/business/world/${slug}/">${esc(PROF[k].name || k)}</a></b><ol>${t.slice(0, 3).map((r, i) => { const cc = String(r[0]).split(':')[0]; return `<li>${C.medal(i)} ${flagImg(cc, 12)}<a href="${esc(PAGES[r[0]] || '/#/explore?' + new URLSearchParams({ cc, p: k, sel: r[0] }))}">${esc(r[1])}</a> <span class="muted small">${fmt(r[2], 1)}</span></li>`; }).join('')}</ol><p class="small muted" style="margin:4px 0 0">${esc(nm(lead[0]))} holds ${lead[1]} of the top 20.</p></div>`; }).join('');
    if (ids.length) sec('clusters', 'Business clusters: the world\'s top sites by sector', `Where would a chip fab, a pharma plant or a data centre find the best conditions? The top three sites worldwide for each kind of business site, with the country that dominates its top 20. Each title opens the full ranking.`, `<div class="ins-pod">${cards}</div><p class="ins-take"><b>What each site needs.</b> A chip fab needs ultra-pure water, stable power and engineers within commuting distance. A data centre wants cheap electricity and cool air. A pharma plant looks for chemists and fast customs. Each list weighs exactly those needs, place by place, so a small town can beat a famous city when the basics fit better.</p>`);
  }

  const nav = `<nav class="chips" aria-label="Chapters">${S.map((s) => `<a href="#${s.id}">${s.h.replace(/,.*| and why|: .*/, '')}</a>`).join('')}</nav>`;
  const body = `${kick('')}${printBtn}<h1>The Nestlyzer Book of Records</h1>
<p class="lede">The biggest, the smallest, the highest, the fastest growing and the fastest shrinking: records from ${fmtInt(P.length)} places in ${new Set(P.map((p) => p.cc)).size} countries, the great metro areas side by side, the countries that break the pattern and the top business clusters. Every chart is computed from official statistics and explained in plain words.</p>
${nav}${S.map((s) => s.html).join('')}
${FOOT('Sources: national statistical offices and Eurostat (residents, area, 5-year change), Natural Earth (metro areas, public domain), open elevation data, World Bank WDI and WHO (country figures).')}`;
  pageIns(PN, 'The Nestlyzer Book of Records: places in superlatives', `Largest, smallest, highest, fastest-growing and fastest-shrinking places among ${fmtInt(P.length)} in ${new Set(P.map((p) => p.cc)).size} countries, the great metro areas compared, country anomalies and top business clusters, with charts.`, body, 'records',
    [{ '@context': 'https://schema.org', '@type': 'Article', headline: 'The Nestlyzer Book of Records', url: 'https://nestlyzer.com' + PN, publisher: { '@type': 'Organization', name: 'Nestlyzer', url: 'https://nestlyzer.com/' }, about: ['population growth', 'metropolitan areas', 'demography', 'business locations'] }]);
  return { p: PN, places: P.length };
}
