/* Nestlyzer Insights (2.13): business-location analyses as static pages, charts drawn as SVG at build time (readable by
   search engines, printable as PDF), every chart explained in plain language computed from the data it shows.
   Inputs: data/bizclimate.json (build_national.py), data/rank/world.json, europe.json, americas.json, asia_pacific.json.
   Called from build_site.mjs with its page() and helpers so layout, canonical, sitemap and dates stay the same. */
import fs from 'node:fs';
import path from 'node:path';

export function buildInsights(H) {
  const { ROOT, page, esc, fmt, fmtInt, countries, flagImg, appLink, cslug } = H;
  const B = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/bizclimate.json'), 'utf8'));
  const RK = {}; for (const s of ['world', 'europe', 'americas', 'asia_pacific']) { const p = path.join(ROOT, 'data/rank', s + '.json'); if (fs.existsSync(p)) RK[s] = JSON.parse(fs.readFileSync(p, 'utf8')); }
  const META = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/meta.json'), 'utf8'));
  const PROF = META.config.profiles, BIZ = (META.config.bizOrder || []).filter((k) => PROF[k]);
  const NAME = Object.fromEntries(countries.map((c) => [c.cc, c.name]));
  const CC = countries.map((c) => c.cc).filter((cc) => B.countries[cc]);
  const V = (cc, m) => { const x = (B.countries[cc] || {}).values || {}; return x[m] ? x[m][0] : null; };
  const Y = (cc, m) => { const x = (B.countries[cc] || {}).values || {}; return x[m] ? String(x[m][1]).slice(0, 4) : ''; };
  const CAT = (cc, k) => ((B.countries[cc] || {}).cats || {})[k];
  const fin = Number.isFinite;
  const medal = (i) => i >= 0 && i <= 2 ? `<span class="medal m${i + 1}" title="${['First', 'Second', 'Third'][i]}">${i === 0 ? '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M3 18h18l-1.6-10-4.9 4L12 5l-2.5 7-4.9-4z"/></svg>' : i + 1}</span>` : '';
  const median = (a) => { const s = a.filter(fin).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
  const corr = (xs, ys) => { const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n; let sxy = 0, sx = 0, sy = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sx += (xs[i] - mx) ** 2; sy += (ys[i] - my) ** 2; } return sxy / Math.sqrt(sx * sy); };
  const list = (a) => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const nm = (cc) => NAME[cc] || cc;
  const climate = (cc, mix) => { let n = 0, d = 0; for (const k of B.keys) { const v = CAT(cc, k); if (fin(v) && mix[k]) { n += mix[k] * v; d += mix[k]; } } return d ? n / d : null; };
  const OUT = [];

  /* ---------- charts ---------- */
  const W = 760;
  function scatter(pts, o) {
    // pts: [{cc, x, y}]; o: {xl, yl, xfmt, yfmt, good: 'top-left' | 'top-right' | ..., label: n}
    const H2 = 470, L = 64, R = 24, T = 26, Bm = 54, xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); const px = (x1 - x0) * 0.06 || 1, py = (y1 - y0) * 0.08 || 1; x0 -= px; x1 += px; y0 -= py; y1 += py;
    const sx = (v) => L + (v - x0) / (x1 - x0) * (W - L - R), sy = (v) => H2 - Bm - (v - y0) / (y1 - y0) * (H2 - T - Bm);
    const mx = median(xs), my = median(ys), ticks = (a, b, n) => { const st = (b - a) / n, mag = 10 ** Math.floor(Math.log10(st)), s = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= st); const out = []; for (let v = Math.ceil(a / s) * s; v <= b; v += s) out.push(+v.toFixed(6)); return out; };
    const q = o.good; const shade = q ? `<rect x="${q.includes('right') ? sx(mx) : L}" y="${q.includes('top') ? T : sy(my)}" width="${q.includes('right') ? W - R - sx(mx) : sx(mx) - L}" height="${q.includes('top') ? sy(my) - T : H2 - Bm - sy(my)}" class="ins-good"/>` : '';
    const lab = new Set(o.labels || []);
    return `<figure class="ins-fig"><svg viewBox="0 0 ${W} ${H2}" role="img" aria-label="${esc(o.title)}">${shade}
${ticks(x0, x1, 6).map((t) => `<line x1="${sx(t)}" x2="${sx(t)}" y1="${T}" y2="${H2 - Bm}" class="ins-grid"/><text x="${sx(t)}" y="${H2 - Bm + 16}" class="ins-tick" text-anchor="middle">${esc(o.xfmt(t))}</text>`).join('')}
${ticks(y0, y1, 5).map((t) => `<line x1="${L}" x2="${W - R}" y1="${sy(t)}" y2="${sy(t)}" class="ins-grid"/><text x="${L - 6}" y="${sy(t) + 4}" class="ins-tick" text-anchor="end">${esc(o.yfmt(t))}</text>`).join('')}
<line x1="${sx(mx)}" x2="${sx(mx)}" y1="${T}" y2="${H2 - Bm}" class="ins-med"/><line x1="${L}" x2="${W - R}" y1="${sy(my)}" y2="${sy(my)}" class="ins-med"/>
<text x="${W - R}" y="${H2 - 12}" class="ins-axis" text-anchor="end">${esc(o.xl)} →</text><text x="14" y="${T - 8}" class="ins-axis">↑ ${esc(o.yl)}</text>
${pts.map((p) => `<g class="ins-pt${lab.has(p.cc) ? ' on' : ''}"><circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="${lab.has(p.cc) ? 6 : 4.5}"><title>${esc(nm(p.cc))}: ${esc(o.xfmt(p.x))}, ${esc(o.yfmt(p.y))}</title></circle>${lab.has(p.cc) ? `<text x="${(sx(p.x) + (sx(p.x) > W - 150 ? -9 : 9)).toFixed(1)}" y="${(sy(p.y) + 4).toFixed(1)}"${sx(p.x) > W - 150 ? ' text-anchor="end"' : ''}>${esc(nm(p.cc))}</text>` : ''}</g>`).join('')}
</svg>${o.caption ? `<figcaption>${o.caption}</figcaption>` : ''}</figure>`;
  }
  function bars(rows, o) {
    // rows: [{cc, v, note}] sorted best first
    const rh = 22, H2 = rows.length * rh + 30, L = 168, R = 70, mx = Math.max(...rows.map((r) => Math.abs(r.v))) || 1;
    return `<figure class="ins-fig"><svg viewBox="0 0 ${W} ${H2}" role="img" aria-label="${esc(o.title)}">
${rows.map((r, i) => `<g class="ins-bar${o.hl && o.hl.includes(r.cc) ? ' on' : ''}">${i < 3 && !o.noMedal ? `<circle cx="10" cy="${i * rh + 16}" r="7" class="ins-m m${i}"/><text x="10" y="${i * rh + 19.5}" text-anchor="middle" class="ins-mn">${i + 1}</text>` : ''}<text x="${L - 8}" y="${i * rh + 20}" text-anchor="end" class="ins-lab">${esc(o.label ? o.label(r.cc) : nm(r.cc))}</text><rect x="${L}" y="${i * rh + 7}" width="${Math.max(1, Math.abs(r.v) / mx * (W - L - R)).toFixed(1)}" height="${rh - 8}" rx="3"/><text x="${(L + Math.abs(r.v) / mx * (W - L - R) + 6).toFixed(1)}" y="${i * rh + 20}" class="ins-val">${esc(o.fmt(r.v))}</text></g>`).join('')}
</svg>${o.caption ? `<figcaption>${o.caption}</figcaption>` : ''}</figure>`;
  }
  function dumbbell(rows, o) {
    // rows: [{cc, a, b}] a = before, b = after
    const rh = 22, H2 = rows.length * rh + 46, L = 168, R = 30, all = rows.flatMap((r) => [r.a, r.b]), lo = Math.min(0, ...all) - 0.5, hi = Math.max(...all) + 0.5;
    const sx = (v) => L + (v - lo) / (hi - lo) * (W - L - R);
    return `<figure class="ins-fig"><svg viewBox="0 0 ${W} ${H2}" role="img" aria-label="${esc(o.title)}"><line x1="${sx(0)}" x2="${sx(0)}" y1="4" y2="${H2 - 30}" class="ins-med"/>
${(() => { const o2 = []; for (let t = Math.ceil(lo / 2) * 2; t <= hi; t += 2) o2.push(`<text x="${sx(t).toFixed(1)}" y="${H2 - 12}" class="ins-tick" text-anchor="middle">${t}%</text>`); return o2.join(''); })()}<text x="${W - R}" y="${H2 - 12}" class="ins-axis" text-anchor="end">${esc(o.xl)} →</text>
${rows.map((r, i) => { const up = r.b >= r.a; return `<g class="ins-db ${up ? 'up' : 'down'}"><text x="${L - 8}" y="${i * rh + 18}" text-anchor="end" class="ins-lab">${esc(nm(r.cc))}</text><line x1="${sx(r.a).toFixed(1)}" x2="${sx(r.b).toFixed(1)}" y1="${i * rh + 14}" y2="${i * rh + 14}"/><circle cx="${sx(r.a).toFixed(1)}" cy="${i * rh + 14}" r="3.5" class="a"/><path d="M${sx(r.b).toFixed(1)},${i * rh + 14} l${up ? -7 : 7},-5 l0,10 z"/><title>${esc(nm(r.cc))}: ${fmt(r.a, 1)}% → ${fmt(r.b, 1)}%</title></g>`; }).join('')}
</svg>${o.caption ? `<figcaption>${o.caption}</figcaption>` : ''}</figure>`;
  }
  const CSS = `<style>
.ins-hero{display:grid;gap:10px;margin:6px 0 18px}.ins-hero .kicker{font-weight:650;color:var(--muted)}
.ins-fig{overflow-x:auto;margin:18px 0 8px;background:var(--card,#fff);border:1px solid var(--line,#dde3e8);border-radius:14px;padding:12px 12px 6px;overflow:hidden}
.ins-fig svg{width:100%;min-width:560px;height:auto;display:block;font-family:inherit}.ins-fig figcaption{font-size:14px;color:var(--muted);padding:6px 4px 8px;line-height:1.5}
.ins-grid{stroke:var(--line,#dde3e8);stroke-width:1}.ins-med{stroke:var(--muted,#6b7785);stroke-dasharray:4 4;stroke-width:1}.ins-tick{font-size:11px;fill:var(--muted,#6b7785)}
.ins-axis{font-size:12.5px;font-weight:650;fill:var(--ink,#132238)}.ins-good{fill:#2a9c96;opacity:.08}
.ins-pt circle{fill:#5f8fc2;opacity:.75}.ins-pt.on circle{fill:#d9822b;opacity:1}.ins-pt text{font-size:12px;fill:var(--ink,#132238);font-weight:600}
.ins-bar rect{fill:#5f8fc2}.ins-bar.on rect{fill:#d9822b}.ins-lab{font-size:12.5px;fill:var(--ink,#132238)}.ins-val{font-size:12px;fill:var(--muted,#6b7785)}
.medal{display:inline-grid;place-items:center;width:1.3em;height:1.3em;border-radius:50%;font-size:.78em;font-weight:800;color:#fff;margin-right:4px;vertical-align:.08em;line-height:1}.medal.m1{background:#d4a017}.medal.m2{background:#8f99a3}.medal.m3{background:#b87333}.medal svg{width:.9em;height:.9em}
.ins-m.m0{fill:#e0b23a}.ins-m.m1{fill:#aeb6bf}.ins-m.m2{fill:#c58a52}.ins-mn{font-size:10px;font-weight:700;fill:#fff}
.ins-db line{stroke-width:3}.ins-db.up line,.ins-db.up path{stroke:#2a9c96;fill:#2a9c96}.ins-db.down line,.ins-db.down path{stroke:#c0504d;fill:#c0504d}.ins-db circle.a{fill:#8a97a6}
.ins-grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin:16px 0}.ins-card{display:block;border:1px solid var(--line,#dde3e8);border-radius:14px;padding:14px 16px;text-decoration:none;color:inherit;background:var(--card,#fff)}
.ins-card:hover{border-color:#2a9c96}.ins-card b{display:block;font-size:17px;margin-bottom:4px}.ins-card span{font-size:14px;color:var(--muted)}
.ins-take{border-left:4px solid #2a9c96;padding:8px 14px;margin:14px 0;background:rgba(42,156,150,.06);border-radius:0 10px 10px 0}
table.ins-t{width:100%;border-collapse:collapse;font-size:14px}table.ins-t th,table.ins-t td{padding:6px 8px;border-bottom:1px solid var(--line,#dde3e8);text-align:right;white-space:nowrap}table.ins-t th:first-child,table.ins-t td:first-child{text-align:left}
table.ins-t td.good{color:#1e7f5c;font-weight:650}table.ins-t td.bad{color:#b23b3b}.ins-scroll{overflow-x:auto}
.ins-print{float:right}@media print{.site-header,.site-footer,.ins-print,.cta-band,.consent,.crumbs{display:none!important}.ins-fig{break-inside:avoid;border:0}body{background:#fff}}
</style>`;
  const printBtn = '<button class="btn btn-sm ins-print" type="button" onclick="window.print()">Save as PDF</button>';
  const crumbs = (t, p) => [['Home', '/'], ['Insights', '/insights/'], ...(t ? [[t, p]] : [])];
  const pageIns = (p, title, desc, body, extraLd) => { page({ p, title: title + ' | Nestlyzer', desc, body: CSS + body, crumbs: crumbs(p === '/insights/' ? null : title.split(':')[0], p), jsonld: extraLd || [] }); OUT.push([p, title, desc]); };
  const FOOT = (src) => `<p class="small muted" style="margin-top:20px">${src} Nestlyzer scores each measure 0–100 between the 5th and 95th percentile of the countries it covers. <a href="/method/">How the method works</a>.</p>`;

  /* ---------- 1. business climate league table ---------- */
  const mixD = B.default;
  const league = CC.map((cc) => ({ cc, s: climate(cc, mixD) })).filter((r) => fin(r.s)).sort((a, b) => b.s - a.s);
  const best = league.slice(0, 3).map((r) => nm(r.cc)), worst = league.slice(-3).map((r) => nm(r.cc));
  const kleaders = B.keys.map((k) => { const s = CC.filter((cc) => fin(CAT(cc, k))).sort((a, b) => CAT(b, k) - CAT(a, k)); return [k, s[0], s.length]; });
  {
    const rows = league.map((r, i) => `<tr><td>${medal(i)} ${flagImg(r.cc, 12)} <a href="/insights/country/${cslug(r.cc)}/">${esc(nm(r.cc))}</a></td><td><b>${fmt(r.s)}</b></td>${B.keys.map((k) => { const v = CAT(r.cc, k), rk = (B.countries[r.cc].ranks || {})[k]; return `<td class="${fin(v) ? (v >= 70 ? 'good' : v < 40 ? 'bad' : '') : ''}">${fin(v) ? fmt(v) + (rk && rk <= 3 ? ' ' + medal(rk - 1) : '') : '–'}</td>`; }).join('')}</tr>`).join('');
    const body = `${printBtn}<h1>Business climate: ${league.length} countries compared</h1><div class="ins-hero"><p class="lede">Where would a company rather set up: in a country with quick permits, firm courts, moderate taxes, cheap credit and power, and an economy that is picking up speed? We scored all ${league.length} Nestlyzer countries on exactly those six things.</p></div>
<div class="ins-take"><b>The short version.</b> ${esc(list(best))} lead the table; ${esc(list(worst))} close it. No country tops every column: ${esc(kleaders.filter((x) => x[1]).map(([k, cc]) => `${nm(cc)} on ${B.short[k].toLowerCase()}`).slice(0, 4).join(', '))}.</div>
<div class="ins-scroll"><table class="ins-t"><thead><tr><th>Country</th><th>Climate</th>${B.keys.map((k) => `<th>${esc(B.short[k])}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
<p class="small muted">Climate = ${B.keys.map((k) => `${B.short[k].toLowerCase()} ${mixD[k]}%`).join(', ')}. Each kind of company site weighs them differently (a data centre cares most about power prices, a headquarters about taxes and legal certainty); the site pages and the app use that site's own mix. A dash means no comparable figure yet; that driver then counts as the median country.</p>
<h2>What sits behind each column</h2><ul>${B.keys.map((k) => `<li><b>${esc(B.labels[k])}</b>: ${esc((B.parts[k] || []).map(([m]) => (B.measures[m] || {}).label || m).join('; '))}.</li>`).join('')}</ul>
${FOOT('Sources: World Bank B-READY 2025, Doing Business 2020 series, World Development Indicators (CC BY 4.0); Transparency International CPI; V-Dem v16; Eurostat; national tax authorities.')}`;
    pageIns('/insights/business-climate/', 'Business climate: ' + league.length + ' countries compared', `Which countries make it easiest to do business? ${league.length} countries scored on red tape, rule of law, taxes, cost of capital, energy prices and growth momentum.`, body,
      [{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Business climate ranking', itemListElement: league.slice(0, 20).map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: nm(r.cc), url: H.SITE + '/insights/country/' + cslug(r.cc) + '/' })) }]);
  }

  /* ---------- 2. labour cost vs talent ---------- */
  {
    const pts = CC.map((cc) => ({ cc, x: V(cc, 'wage_level'), y: V(cc, 'tertiary') })).filter((p) => fin(p.x) && fin(p.y) && p.y < 160);
    const mx = median(pts.map((p) => p.x)), my = median(pts.map((p) => p.y));
    const sweet = pts.filter((p) => p.x < mx && p.y > my).sort((a, b) => (b.y / my - b.x / mx) - (a.y / my - a.x / mx));
    const pricey = pts.filter((p) => p.x > mx && p.y < my);
    const r = corr(pts.map((p) => p.x), pts.map((p) => p.y));
    const labels = [...sweet.slice(0, 5), ...pts.sort((a, b) => b.x - a.x).slice(0, 3), ...pricey.slice(0, 2)].map((p) => p.cc);
    const body = `${printBtn}<h1>Labour cost against talent</h1><p class="lede">The old trade-off for any plant or office: cheap labour or a deep pool of graduates. Most countries make you choose. A few don't.</p>
${scatter(pts, { title: 'Income per person (labour-cost proxy) against tertiary enrolment', xl: 'Income per person at market prices, US$ (labour-cost proxy)', yl: 'Tertiary enrolment (% gross)', xfmt: (v) => fmtInt(v), yfmt: (v) => fmt(v) + '%', good: 'top-left', labels,
      caption: `Dashed lines mark the median country. The shaded corner is the sweet spot: below-median labour cost, above-median enrolment. ${r >= 0.5 ? `The two measures move together (r = ${fmt(r, 2)}): richer countries educate more people, so bargains are rare.` : `The link between the two is loose (r = ${fmt(r, 2)}): plenty of countries educate many people at moderate cost, so it pays to look beyond the usual names.`}` })}
<div class="ins-take"><b>The sweet spot.</b> ${sweet.length ? `${esc(list(sweet.slice(0, 6).map((p) => nm(p.cc))))} combine below-median labour costs with above-median enrolment.` : 'No country combines both.'} ${pricey.length ? `At the other end, ${esc(list(pricey.slice(0, 3).map((p) => nm(p.cc))))} are both above median in cost and below median in enrolment.` : ''}</div>
<p>Two caveats matter. Enrolment counts students, not finished graduates, and gross rates above 100% happen where many older or foreign students enrol. Labour cost here is the country's income per person at market prices, a good proxy for wage levels across countries but not the pay for one occupation; the place pages show occupation pay where statistics offices publish it.</p>
${FOOT('Sources: World Bank WDI (GNI per capita PPP, price level, tertiary enrolment), latest year from 2015.')}`;
    pageIns('/insights/labour-cost-vs-talent/', 'Labour cost against talent: where skills come cheap', 'Which countries combine low labour costs with a large pool of students and graduates? A scatter of all Nestlyzer countries with the sweet spot marked.', body);
  }

  /* ---------- 3. tax vs rule of law ---------- */
  {
    const pts = CC.map((cc) => ({ cc, x: V(cc, 'cit_rate'), y: CAT(cc, 'rule_of_law') })).filter((p) => fin(p.x) && fin(p.y));
    const mx = median(pts.map((p) => p.x)), my = median(pts.map((p) => p.y));
    const good = pts.filter((p) => p.x <= mx && p.y >= my).sort((a, b) => b.y - a.y), poor = pts.filter((p) => p.x > mx && p.y < my);
    const labels = [...good.slice(0, 6), ...poor.slice(0, 3), ...pts.sort((a, b) => b.x - a.x).slice(0, 2)].map((p) => p.cc);
    const body = `${printBtn}<h1>Taxes against the rule of law</h1><p class="lede">A low tax rate is worth little if contracts are hard to enforce. This chart puts the headline corporate tax rate next to how firmly the law holds.</p>
${scatter(pts, { title: 'Corporate tax rate against rule of law', xl: 'Corporate income tax rate (headline, %)', yl: 'Rule of law and legal certainty (0-100)', xfmt: (v) => fmt(v) + '%', yfmt: (v) => fmt(v), good: 'top-left', labels,
      caption: 'Top left is where companies want to be: moderate tax and strong courts. Rule of law combines V-Dem’s liberal component, Transparency International’s corruption score, the strength of legal rights and B-READY dispute resolution.' })}
<div class="ins-take"><b>Low tax, firm law.</b> ${esc(list(good.slice(0, 6).map((p) => nm(p.cc))))} sit in the favourable corner. ${poor.length ? esc(list(poor.slice(0, 3).map((p) => nm(p.cc)))) + ' combine above-median tax with below-median legal certainty.' : ''}</div>
<p>Headline rates are only the start: deductions, local business taxes and incentives move the effective burden a lot, which is why the climate score also uses the total tax and contribution rate on profits. For a real case, ask for the tax ruling where you plan to invest.</p>
${FOOT('Sources: national tax authorities and OECD (headline corporate rates 2026), V-Dem v16, Transparency International CPI 2025 (2024 where 2025 is missing), World Bank.')}`;
    pageIns('/insights/tax-vs-rule-of-law/', 'Corporate tax against rule of law: the favourable corner', 'Which countries combine moderate corporate tax with strong legal certainty? Headline tax rates and a rule-of-law score for every Nestlyzer country.', body);
  }

  /* ---------- 4. growth momentum ---------- */
  {
    const rows = CC.map((cc) => { const g = (B.countries[cc].growth || []).filter(([y]) => y >= 2015); const base = g.filter(([y]) => y <= 2019).map((x) => x[1]); const last = g.slice(-3).map((x) => x[1]); return base.length >= 3 && last.length === 3 ? { cc, a: base.reduce((s, v) => s + v, 0) / base.length, b: last.reduce((s, v) => s + v, 0) / 3, y: g[g.length - 1][0] } : null; }).filter(Boolean).sort((p, q) => (q.b - q.a) - (p.b - p.a));
    const up = rows.filter((r) => r.b - r.a > 0.5), down = rows.filter((r) => r.b - r.a < -0.5).reverse();
    const body = `${printBtn}<h1>Growth momentum: who is speeding up, who is losing pace</h1><p class="lede">The energy shock of 2022, the war in Ukraine and higher interest rates hit economies very unevenly. Each arrow runs from a country's average real growth in 2015–2019 to its average over the last three years.</p>
${dumbbell(rows, { title: 'Real GDP growth before and after', xl: 'Real GDP growth, % a year', caption: 'Grey dot: average 2015–2019. Arrow head: average of the last three years with data. Green arrows point to faster growth, red ones to slower.' })}
<div class="ins-take"><b>Gaining pace:</b> ${esc(list(up.slice(0, 5).map((r) => `${nm(r.cc)} (${fmt(r.a, 1)}% → ${fmt(r.b, 1)}%)`)))}. <b>Losing it:</b> ${esc(list(down.slice(0, 5).map((r) => `${nm(r.cc)} (${fmt(r.a, 1)}% → ${fmt(r.b, 1)}%)`)))}.</div>
<p>Momentum is one of the six business-climate drivers: a slowing economy means weaker local demand and, often, rising costs that are not yet in the price lists. It does not say a place is cheap or expensive; read it next to labour costs and energy prices.</p>
${FOOT('Source: World Bank WDI, real GDP growth (NY.GDP.MKTP.KD.ZG), CC BY 4.0.')}`;
    pageIns('/insights/growth-momentum/', 'Growth momentum: who speeds up, who loses pace', 'Real GDP growth before 2020 against the last three years for every Nestlyzer country: who gained momentum after the energy shock and who lost it.', body);
  }

  /* ---------- 5. red tape ---------- */
  {
    const rows = CC.map((cc) => ({ cc, v: V(cc, 'startup_days') })).filter((r) => fin(r.v)).sort((a, b) => a.v - b.v);
    const br = CC.map((cc) => ({ cc, v: V(cc, 'bready_regulatory') })).filter((r) => fin(r.v)).sort((a, b) => b.v - a.v);
    const body = `${printBtn}<h1>Red tape: how long it takes to open a business</h1><p class="lede">Speed is the most honest test of bureaucracy. Here is the number of days it takes to register a new company, from the fastest country to the slowest.</p>
${bars(rows, { title: 'Days to start a business', fmt: (v) => fmt(v, v < 10 ? 1 : 0) + ' days', caption: 'World Bank Doing Business, last edition (2019 data, published 2020). Procedures have been simplified in many countries since, so read this as a ranking of habits rather than today’s exact days.' })}
<div class="ins-take"><b>Fastest:</b> ${esc(list(rows.slice(0, 3).map((r) => `${nm(r.cc)} (${fmt(r.v, 1)} days)`)))}. <b>Slowest:</b> ${esc(list(rows.slice(-3).reverse().map((r) => `${nm(r.cc)} (${fmt(r.v)} days)`)))}.</div>
${br.length ? `<h2>The newer view: B-READY regulatory framework</h2><p>The World Bank's successor survey, B-READY, scores the quality of business regulation from 0 to 100. Its first rounds cover ${br.length} of the Nestlyzer countries.</p>${bars(br, { title: 'B-READY regulatory framework score', fmt: (v) => fmt(v) + ' / 100' })}` : ''}
${FOOT('Sources: World Bank Doing Business (IC.REG.DURS, IC.REG.PROC) and B-READY 2025.')}`;
    pageIns('/insights/red-tape/', 'Red tape: days to start a business in ' + rows.length + ' countries', 'How quickly can you register a company? Days to start a business and the B-READY regulatory score for every Nestlyzer country.', body);
  }

  /* ---------- 6. energy prices ---------- */
  {
    const rows = CC.map((cc) => ({ cc, v: V(cc, 'power_price_business') })).filter((r) => fin(r.v)).sort((a, b) => a.v - b.v);
    if (rows.length >= 5) {
      const md = median(rows.map((r) => r.v)), lo = rows[0], hi = rows[rows.length - 1];
      const body = `${printBtn}<h1>Electricity prices for business</h1><p class="lede">For a data centre, a chemicals plant or a battery factory, power is the bill that decides the business case. These are the prices medium-sized industrial users pay, taxes that cannot be recovered included.</p>
${bars(rows, { title: 'Business electricity price, EUR per kWh', fmt: (v) => fmt(v, 3) + ' €/kWh', caption: `Eurostat, consumption band 500–1,999 MWh a year, second half of the latest year. The median country pays ${fmt(md, 3)} €/kWh.` })}
<div class="ins-take"><b>A ${fmt(hi.v / lo.v, 1)}× gap.</b> A firm in ${esc(nm(hi.cc))} pays ${fmt(hi.v, 3)} €/kWh, one in ${esc(nm(lo.cc))} ${fmt(lo.v, 3)} €/kWh. For a site using 1 GWh a year that is a difference of about €${fmtInt((hi.v - lo.v) * 1e6)}.</div>
<p>Large users negotiate their own contracts and many countries refund part of the levies to energy-intensive industry, so a real quote can sit well below these figures. Outside Europe comparable official prices are not yet collected; those countries count as the median in the climate score.</p>
${FOOT('Source: Eurostat nrg_pc_205 (business electricity prices).')}`;
      pageIns('/insights/energy-prices/', 'Electricity prices for business across Europe', 'What do companies pay for electricity? Business power prices across European countries with the cheapest and the most expensive marked.', body);
    }
  }

  /* ---------- 7. cost of capital ---------- */
  {
    const rows = CC.map((cc) => ({ cc, v: V(cc, 'real_interest') })).filter((r) => fin(r.v)).sort((a, b) => a.v - b.v);
    const body = `${printBtn}<h1>The cost of capital: real interest rates</h1><p class="lede">Borrowing for machines, buildings or stock costs very different amounts around the world. The real interest rate, the lending rate minus inflation, shows what credit really costs a company.</p>
${bars(rows, { title: 'Real interest rate', fmt: (v) => fmt(v, 1) + '%', caption: 'World Bank WDI (FR.INR.RINR), latest year. Countries of the euro area and several others report no national lending rate to the World Bank; they are not shown and count as the median country in the climate score.' })}
<div class="ins-take"><b>Cheapest credit</b> in ${esc(list(rows.slice(0, 3).map((r) => `${nm(r.cc)} (${fmt(r.v, 1)}%)`)))}; <b>dearest</b> in ${esc(list(rows.slice(-3).reverse().map((r) => `${nm(r.cc)} (${fmt(r.v, 1)}%)`)))}.</div>
${FOOT('Sources: World Bank WDI real interest rate and lending interest rate (CC BY 4.0).')}`;
    pageIns('/insights/cost-of-capital/', 'Cost of capital: real interest rates compared', 'What does borrowing really cost a company? Real interest rates for the Nestlyzer countries that report them.', body);
  }

  /* ---------- 8. best business locations by site type ---------- */
  {
    const scopes = [['world', 'World'], ['europe', 'Europe'], ['americas', 'Americas'], ['asia_pacific', 'Asia-Pacific']];
    const leaders = (keys, pathOf) => keys.map((k) => { const P = PROF[k]; return `<section class="ins-fig" style="padding:14px 16px"><h2 style="font-size:19px;margin:0 0 8px"><a href="${pathOf(k)}">${esc(P.name)}</a></h2><div class="ins-grid2" style="margin:6px 0">${scopes.map(([s, t]) => { const L = ((RK[s] || {}).profiles || {})[k]; const top = L && L.top ? L.top.slice(0, 3) : []; return top.length ? `<div><b style="font-size:14px">${t}</b><ol style="margin:4px 0 0;padding-left:0;list-style:none">${top.map((x, i) => `<li>${medal(i)} ${flagImg(x[0].split(':')[0], 11)} ${H.PAGES[x[0]] ? `<a href="${H.PAGES[x[0]]}">${esc(x[1])}</a>` : esc(x[1])} <span class="muted small">${fmt(x[2], 1)}</span></li>`).join('')}</ol></div>` : ''; }).join('')}</div></section>`; }).join('');
    const sec = leaders(BIZ, H.bizPath);
    const HH = (META.config.order || []).filter((k) => PROF[k] && ((RK.world || {}).profiles || {})[k]);
    if (HH.length) pageIns('/insights/best-places-to-live/', 'The best places to live, by kind of household', `World and continental leaders for ${HH.length} household profiles, from young families to retirees and remote workers, with crowns and medals.`,
      `${printBtn}<h1>The best places to live, by kind of household</h1><p class="lede">The household twin of the business leaderboards: for every profile, the world's top three places and each continent's. A young family, a retired couple and a remote worker want very different things, so the podiums barely overlap.</p>${leaders(HH, H.profilePath)}${FOOT('Scores 0–100 against all places worldwide; the place pages explain every score.')}`);
    const body = `${printBtn}<h1>The best business locations, by kind of site</h1><p class="lede">One leaderboard per kind of company site: the world's top three and each continent's, with crown and medals. Scores combine the place's own strengths (access, labour, land, clusters) with its country's business climate.</p>${sec}
${FOOT('Scores 0–100; method on the method page.')}`;
    pageIns('/insights/best-business-locations/', 'The best business locations by kind of site', 'World and continental leaders for ' + BIZ.length + ' kinds of company site, from logistics hubs to research labs, with crowns and medals.', body);
  }

  /* ---------- 8b. ten years of change (country history, data/h) ---------- */
  {
    const HD = {}; for (const cc of CC) { const f = path.join(ROOT, 'data/h', cc + '.json'); if (fs.existsSync(f)) HD[cc] = JSON.parse(fs.readFileSync(f, 'utf8')); }
    const ser = (cc, id) => ((HD[cc] || {}).series || []).find((x) => x.id === id);
    const PICK = [['unemployment', 'Unemployment rate, change in percentage points', (v) => (v > 0 ? '+' : '') + fmt(v, 1) + ' pts'], ['gdp_pc_ppp', 'GDP per person at purchasing power, change in %', (v) => (v > 0 ? '+' : '') + fmt(v, 0) + '%'], ['rnd', 'Research and development spending, change in percentage points of GDP', (v) => (v > 0 ? '+' : '') + fmt(v, 2) + ' pts'], ['life_exp', 'Life expectancy at birth, change in years', (v) => (v > 0 ? '+' : '') + fmt(v, 1) + ' yrs']];
    const secs = PICK.map(([id, title, f]) => {
      const rows = CC.map((cc) => { const x = ser(cc, id); return x && Number.isFinite(x.change['10']) ? { cc, v: x.change['10'], better: x.better, last: x.y[x.y.length - 1][0] } : null; }).filter(Boolean);
      if (rows.length < 8) return '';
      const b = rows[0].better; rows.sort((p, q) => b < 0 ? p.v - q.v : q.v - p.v);
      const yr = median(rows.map((r) => r.last)), best = rows.slice(0, 3).map((r) => `${nm(r.cc)} (${f(r.v)})`), worst = rows.slice(-3).reverse().map((r) => `${nm(r.cc)} (${f(r.v)})`);
      return `<h2>${esc(title.split(',')[0])}</h2><div class="ins-take"><b>Most improved:</b> ${esc(list(best))}. <b>Least:</b> ${esc(list(worst))}.</div>${bars(rows, { title, fmt: f, caption: `${esc(title)}, latest year (mostly ${yr}) against exactly ten years earlier. Sorted from the biggest improvement to the biggest setback; ${rows.length} countries with both years published.` })}`;
    }).join('');
    pageIns('/insights/ten-years-of-change/', 'Ten years of change: who improved most', 'Unemployment, income per person, research spending and life expectancy: how every Nestlyzer country changed over exactly ten years, from the biggest gain to the biggest setback.',
      `${printBtn}<h1>Ten years of change: who improved most</h1><p class="lede">Levels say where a country stands; ten-year changes say where it is heading. Each chart compares the latest published year with exactly ten years earlier, from the same World Bank series, so the comparison is like for like.</p>${secs}<p>Bars show the size of the change; the sign is in the label. A country that was already near the top has less room to improve, so read this next to the level on its <a href="/insights/business-climate/">business-climate</a> page.</p>${FOOT('Source: World Bank WDI (CC BY 4.0): SL.UEM.TOTL.ZS, NY.GDP.PCAP.PP.CD, GB.XPD.RSDV.GD.ZS, SP.DYN.LE00.IN.')}`);
  }

  /* ---------- 9. one page per country ---------- */
  for (const cc of CC) {
    const C = B.countries[cc], rank = league.findIndex((r) => r.cc === cc), sc = climate(cc, mixD);
    const peers = league.map((r) => ({ cc: r.cc, d: Math.sqrt(B.keys.reduce((s, k) => s + (fin(CAT(cc, k)) && fin(CAT(r.cc, k)) ? (CAT(cc, k) - CAT(r.cc, k)) ** 2 : 0), 0)) })).filter((r) => r.cc !== cc).sort((a, b) => a.d - b.d).slice(0, 4);
    const strong = B.keys.filter((k) => fin(CAT(cc, k))).sort((a, b) => CAT(cc, b) - CAT(cc, a));
    const g = (C.growth || []).filter(([y]) => y >= 2010), gmax = Math.max(1, ...g.map((x) => Math.abs(x[1])));
    const spark = g.length > 3 ? `<figure class="ins-fig"><svg viewBox="0 0 ${W} 150" role="img" aria-label="Real GDP growth by year"><line x1="40" x2="${W - 10}" y1="75" y2="75" class="ins-med"/>${g.map(([y, v], i) => { const x = 40 + i * ((W - 60) / (g.length - 1 || 1)), h = v / gmax * 60; return `<rect x="${(x - 9).toFixed(1)}" y="${(v >= 0 ? 75 - h : 75).toFixed(1)}" width="18" height="${Math.abs(h).toFixed(1)}" fill="${v >= 0 ? '#2a9c96' : '#c0504d'}"><title>${y}: ${fmt(v, 1)}%</title></rect><text x="${x.toFixed(1)}" y="146" class="ins-tick" text-anchor="middle">${String(y).slice(2)}</text>`; }).join('')}</svg><figcaption>Real GDP growth by year (World Bank). Green bars: growth; red: contraction.</figcaption></figure>` : '';
    const drows = B.keys.map((k) => { const v = CAT(cc, k), rk = (C.ranks || {})[k], n = (C.n || {})[k]; return { k, v, rk, n }; });
    const body = `${printBtn}<h1>${flagImg(cc, 22)} Business climate in ${esc(nm(cc))}</h1>
<p class="lede">${fin(sc) ? `${esc(nm(cc))} ranks <b>${medal(rank)} #${rank + 1} of ${league.length}</b> on the overall business climate (score ${fmt(sc)}).` : ''} ${strong.length ? `Its strongest suit is ${esc(B.short[strong[0]].toLowerCase())}${strong.length > 1 ? `, followed by ${esc(B.short[strong[1]].toLowerCase())}` : ''}; the weakest is ${esc(B.short[strong[strong.length - 1]].toLowerCase())}.` : ''}</p>
${bars(drows.filter((d) => fin(d.v)).map((d) => ({ cc: d.k, v: d.v })).sort((a, b) => b.v - a.v).map((x) => x), { title: 'Business climate drivers', fmt: (v) => fmt(v) + ' / 100', noMedal: true, label: (k) => B.short[k] || k })}
<div class="ins-scroll"><table class="ins-t"><thead><tr><th>Driver</th><th>Score</th><th>Rank</th><th>Measures</th></tr></thead><tbody>${drows.map((d) => `<tr><td>${esc(B.labels[d.k])}</td><td>${fin(d.v) ? fmt(d.v) : '–'}</td><td>${d.rk ? medal(d.rk - 1) + ' #' + d.rk + ' of ' + d.n : '–'}</td><td style="text-align:left;white-space:normal" class="small">${esc((B.parts[d.k] || []).filter(([m]) => C.values[m]).map(([m]) => `${(B.measures[m] || {}).label}: ${fmt(C.values[m][0], Math.abs(C.values[m][0]) < 10 ? 2 : 0)} (${String(C.values[m][1]).slice(0, 4)})`).join('; ') || 'no comparable figure yet')}</td></tr>`).join('')}</tbody></table></div>
${spark}
<h2>Countries with a similar profile</h2><p>${peers.map((p) => `<a href="/insights/country/${cslug(p.cc)}/">${flagImg(p.cc, 12)} ${esc(nm(p.cc))}</a>`).join(' · ')}</p>
<div class="cta-band"><h2>Find the best business sites in ${esc(nm(cc))}</h2><a class="btn" href="${appLink({ cc, p: 'biz_manufacturing' })}">Open the map</a></div>
${FOOT('Sources as on the business-climate table.')}`;
    pageIns(`/insights/country/${cslug(cc)}/`, `Business climate in ${nm(cc)}: drivers, rank and trend`, `How does ${nm(cc)} compare for companies? Red tape, rule of law, taxes, cost of capital, energy prices and growth momentum, ranked against ${league.length} countries.`, body);
  }

  /* ---------- hub ---------- */
  {
    const cards = OUT.filter(([p]) => !p.includes('/country/')).map(([p, t, d]) => `<a class="ins-card" href="${p}"><b>${esc(t.split(':')[0])}</b><span>${esc(d)}</span></a>`).join('');
    const body = `<h1>Insights: business locations in numbers</h1><p class="lede">Charts and league tables for everyone choosing where to invest, build or hire: how ${league.length} countries compare on red tape, law, taxes, credit, power and growth, and which places lead for each kind of company site. Every chart explains itself; every page prints as a clean PDF.</p>
<div class="ins-grid2">${cards}</div>
<h2>Country by country</h2><p>${league.map((r, i) => `<a href="/insights/country/${cslug(r.cc)}/">${medal(i)}${flagImg(r.cc, 12)} ${esc(nm(r.cc))}</a>`).join(' · ')}</p>
${FOOT('')}`;
    pageIns('/insights/', 'Insights: business locations in numbers', `League tables and charts on the business climate of ${league.length} countries and the best places for every kind of company site.`, body);
  }
  return OUT.length;
}
