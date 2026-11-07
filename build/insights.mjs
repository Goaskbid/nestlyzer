/* Nestlyzer Insights (2.13.1): analyses for households and for companies, as static pages built from the data the app
   already uses (open licences, sources named on every page). Charts come from insights_charts.mjs: wide and phone
   versions, HTML bars and small multiples, so nothing is cut off on a phone. Every chart is explained in sentences
   computed from the data it shows. Called from build_site.mjs with its page() and helpers. */
import fs from 'node:fs';
import path from 'node:path';
import { charts } from './insights_charts.mjs';

export function buildInsights(H) {
  const { ROOT, page, esc, fmt, fmtInt, countries, flagImg, appLink, cslug } = H;
  const C = charts({ esc, fmt });
  const { median, medal, fin } = C;
  const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
  const B = J('data/bizclimate.json'), N = J('data/national.json'), META = J('data/meta.json');
  const RK = {}; for (const s of ['world', 'europe', 'americas', 'asia_pacific']) { const p = path.join(ROOT, 'data/rank', s + '.json'); if (fs.existsSync(p)) RK[s] = J('data/rank/' + s + '.json'); }
  const PROF = META.config.profiles, BIZ = (META.config.bizOrder || []).filter((k) => PROF[k]);
  const NAME = Object.fromEntries(countries.map((c) => [c.cc, c.name]));
  const CC = countries.map((c) => c.cc).filter((cc) => B.countries[cc] && N.countries[cc]);
  const HD = {}; for (const cc of CC) { const f = path.join(ROOT, 'data/h', cc + '.json'); if (fs.existsSync(f)) HD[cc] = J('data/h/' + cc + '.json'); }
  const nm = (cc) => NAME[cc] || cc, cpath = (cc) => `/insights/country/${cslug(cc)}/`;
  const cl = (cc) => `${flagImg(cc, 12)}<a href="${cpath(cc)}">${esc(nm(cc))}</a>`;
  const NV = (cc, m) => { const x = ((N.countries[cc] || {}).values || {})[m]; return x ? x[0] : null; };
  const NY = (cc, m) => { const x = ((N.countries[cc] || {}).values || {})[m]; return x ? String(x[1]).slice(0, 4) : ''; };
  const NC = (cc, k) => ((N.countries[cc] || {}).cats || {})[k];
  const BV = (cc, m) => { const x = ((B.countries[cc] || {}).values || {})[m]; return x ? x[0] : null; };
  const BC = (cc, k) => ((B.countries[cc] || {}).cats || {})[k];
  const sc = (v, f) => fin(v) ? v * f : null;   // scale a figure, keep 'missing' missing (never 0)
  const yr = (...ms) => { const c = {}; for (const cc of CC) for (const m of ms) { const y = NY(cc, m); if (y) c[y] = (c[y] || 0) + 1; } const t = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return t ? t[0] : ''; };   // most common reference year
  const ytag = (...ms) => { const y = yr(...ms); return y ? ` · national figures, mostly ${y}` : ''; };
  const SER = (cc, id) => ((HD[cc] || {}).series || []).find((x) => x.id === id);
  const SLAST = (cc, id) => { const s = SER(cc, id); return s ? s.y[s.y.length - 1] : null; };
  const corr = (xs, ys) => { const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n; let sxy = 0, sx = 0, sy = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sx += (xs[i] - mx) ** 2; sy += (ys[i] - my) ** 2; } return sxy / Math.sqrt(sx * sy); };
  const fit = (pts) => { const n = pts.length, mx = pts.reduce((a, p) => a + p.x, 0) / n, my = pts.reduce((a, p) => a + p.y, 0) / n; let sxy = 0, sxx = 0; for (const p of pts) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; } const b = sxy / sxx; return (x) => my + b * (x - mx); };
  const list = (a) => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const strength = (r) => { const a = Math.abs(r); return a >= 0.7 ? 'a strong' : a >= 0.4 ? 'a clear' : a >= 0.2 ? 'a weak' : 'hardly any'; };
  const sgn = (v, d = 1, u = '') => (v > 0 ? '+' : v < 0 ? '−' : '±') + fmt(Math.abs(v), d) + u;
  const OUT = [];

  /* ---------- page frame ---------- */
  const CSS = C.CSS + `<style>
.ins-kick{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 6px}.ins-kick a,.ins-kick span{font-size:13px;font-weight:650;padding:4px 10px;border-radius:999px;background:var(--surface-2,#eef2f4);color:var(--ink-2);text-decoration:none}.ins-kick .on{background:#1b4565;color:#fff}
.ins-take{border-left:4px solid #2a9c96;padding:10px 14px;margin:14px 0;background:rgba(42,156,150,.07);border-radius:0 12px 12px 0;line-height:1.55}
.ins-grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin:14px 0}.ins-card{display:flex;flex-direction:column;gap:4px;border:1px solid var(--line,#dde3e8);border-radius:14px;padding:14px 16px;text-decoration:none;color:inherit;background:var(--surface,#fff)}
.ins-card:hover{border-color:#2a9c96}.ins-card b{font-size:16.5px;line-height:1.3}.ins-card span{font-size:14px;color:var(--ink-3);line-height:1.45}.ins-card em{font-style:normal;font-size:12px;font-weight:700;color:#2a7d78}
.ins-pod{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin:10px 0}.ins-pod>div{border:1px solid var(--line);border-radius:12px;padding:10px 12px}.ins-pod ol{list-style:none;margin:4px 0 0;padding:0}.ins-pod li{padding:2px 0;font-size:14px}
.ins-print{float:right;margin-left:10px}.ins-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media (max-width:860px){.ins-two{grid-template-columns:1fr}}
.page h1{overflow-wrap:anywhere}.ins-note{font-size:13.5px;color:var(--ink-3);line-height:1.5}
@media print{.site-header,.site-footer,.ins-print,.cta-band,.consent,.crumbs,.ins-kick{display:none!important}.ins-fig{break-inside:avoid;border:0}.v-m{display:none!important}.v-d{display:block!important}body{background:#fff}}
</style>`;
  const printBtn = '<button class="btn btn-sm ins-print" type="button" onclick="window.print()">Save as PDF</button>';
  const kick = (k) => `<div class="ins-kick"><a href="/insights/#living"${k === 'living' ? ' class="on"' : ''}>For households</a><a href="/insights/#inside"${k === 'inside' ? ' class="on"' : ''}>Inside the countries</a><a href="/insights/#business"${k === 'business' ? ' class="on"' : ''}>For companies</a></div>`;
  /* 2.13.2: every analysis ends with a direct way into a decision: the map with a fitting profile, the profiles or the business sites */
  const CTA = { living: `<div class="cta-band"><h2>Turn this into a shortlist</h2><p>Pick who is moving and Nestlyzer ranks every place in a country for you, with the figures behind each score.</p><a class="btn" href="/#profiles">Choose a household profile</a> <a class="btn" href="${appLink({ cc: 'CH', p: 'young_family' })}">Open the map</a></div>`,
    business: `<div class="cta-band"><h2>Find sites for your business</h2><p>Pick the kind of site and Nestlyzer ranks every place in a country, with must-haves checked and the business climate included.</p><a class="btn" href="/business/">Choose a kind of site</a> <a class="btn" href="${appLink({ cc: 'DE', p: 'biz_manufacturing' })}">Open the map</a></div>` };
  // 2.14 (owner audit, SEO): the country count follows the national data set the charts use, never a fixed 54
  const NCN = String(Object.keys(N.countries).length), nc = (t) => String(t).replace(/__NCN__/g, NCN);
  const pageIns = (p, title, desc, body, sec, extraLd) => { title = nc(title); desc = nc(desc); body = nc(body) + (CTA[sec] || ''); page({ p, title: title + ' | Nestlyzer', desc, body: CSS + body, crumbs: [['Home', '/'], ['Insights', '/insights/'], ...(p === '/insights/' ? [] : [[title.split(':')[0], p]])], jsonld: extraLd || [] }); OUT.push({ p, title, desc, sec }); };
  const FOOT = (src) => `<p class="ins-note" style="margin-top:22px">${src} Scores run 0–100 between the 5th and 95th percentile of the countries covered; a dash means the figure is not published. <a href="/method/">How Nestlyzer works</a>.</p>`;
  const ld = (name, rows) => [{ '@context': 'https://schema.org', '@type': 'ItemList', name, itemListOrder: 'https://schema.org/ItemListOrderDescending', numberOfItems: rows.length, itemListElement: rows.slice(0, 20).map((cc, i) => ({ '@type': 'ListItem', position: i + 1, name: nm(cc), url: H.SITE + cpath(cc) })) }];

  /* =================================================================== FOR HOUSEHOLDS */
  const LIVE = { jobs: 'Jobs and income', affordability: 'Cost of living', safety: 'Safety', health: 'Health', environment: 'Clean environment', family: 'Family support', foundation: 'Fair and free', mobility: 'Connected' };
  const LK = Object.keys(LIVE);
  const LSHORT = { jobs: 'Jobs', affordability: 'Costs', safety: 'Safety', health: 'Health', environment: 'Environment', family: 'Family', foundation: 'Fairness', mobility: 'Connected' };
  const lifeScore = (cc, keys = LK) => { let n = 0, d = 0; for (const k of keys) { const v = NC(cc, k); if (fin(v)) { n += v; d++; } } return d >= Math.ceil(keys.length * 0.6) ? n / d : null; };
  const lifeLeague = CC.map((cc) => ({ cc, s: lifeScore(cc) })).filter((r) => fin(r.s)).sort((a, b) => b.s - a.s);
  const lifeRank = (cc, k) => { const s = CC.filter((c) => fin(NC(c, k))).sort((a, b) => NC(b, k) - NC(a, k)); return [s.indexOf(cc) + 1, s.length]; };
  const tone = (v) => fin(v) ? (v >= 70 ? 'gd' : v < 40 ? 'bd' : '') : '';
  const cell = (v, rk) => fin(v) ? `<span class="${tone(v)}">${fmt(v)}</span>${rk && rk <= 3 ? ' ' + medal(rk - 1) : ''}` : '–';

  /* H1. quality of life */
  {
    const head = ['Country', 'Overall', ...LK.map((k) => LSHORT[k])];
    const rows = lifeLeague.map((r, i) => [`${medal(i) || `<small>${i + 1}.</small>`} ${cl(r.cc)}`, `<b>${fmt(r.s)}</b>`, ...LK.map((k) => cell(NC(r.cc, k), lifeRank(r.cc, k)[0]))]);
    const qual = (cc) => lifeScore(cc, LK.filter((k) => k !== 'affordability'));
    const pts = CC.map((cc) => ({ key: cc, name: nm(cc), href: cpath(cc), x: sc(NV(cc, 'price_level'), 100), y: qual(cc) })).filter((p) => fin(p.x) && fin(p.y));
    const mx = median(pts.map((p) => p.x)), my = median(pts.map((p) => p.y));
    const value = pts.filter((p) => p.x <= mx && p.y >= my).sort((a, b) => (b.y - my) / 10 - (b.x - mx) / 20 - ((a.y - my) / 10 - (a.x - mx) / 20));
    const dear = pts.filter((p) => p.x > mx && p.y < my);
    const top = pts.slice().sort((a, b) => b.y - a.y).slice(0, 3);
    const leaders = LK.map((k) => { const s = CC.filter((c) => fin(NC(c, k))).sort((a, b) => NC(b, k) - NC(a, k)); return `${nm(s[0])} on ${LSHORT[k].toLowerCase()}`; });
    const body = `${kick('living')}${printBtn}<h1>Quality of life: ${lifeLeague.length} countries compared</h1>
<p class="lede">Eight things decide how well a household lives: work and pay, what life costs, safety, health, a clean environment, support for families, fair institutions and good connections. Here is how every Nestlyzer country scores on each of them.</p>
<div class="ins-take"><b>The short version.</b> ${esc(list(lifeLeague.slice(0, 3).map((r) => nm(r.cc))))} lead overall; ${esc(list(lifeLeague.slice(-3).map((r) => nm(r.cc))))} come last. No country wins everything: ${esc(leaders.slice(0, 5).join(', '))}.</div>
${C.bars(lifeLeague.map((r) => ({ label: cl(r.cc), v: r.s })), { title: 'Overall quality of life (0–100), best first', fmt: (v) => fmt(v), tone: (v) => v >= 70 ? 'g' : v < 50 ? 'b' : '' })}
<h2>All eight scores, country by country</h2>
${C.league(head, rows)}
<p class="ins-note">Overall = the average of the eight scores, equally weighted. Each score combines official national figures (listed under the table); a country needs at least five of the eight to be ranked. Crowns and medals mark the top three per column.</p>
<h2>More quality for less money</h2><p>A high quality of life often comes with high prices. This chart separates the two: the overall score without the cost of living, against how expensive daily life is.</p>
${C.scatter(pts, { title: 'Quality of life (without costs) against the consumer price level' + ytag('price_level'), xl: 'Consumer price level, United States = 100', xlS: 'Price level, US = 100', yl: 'Quality of life without costs (0–100)', ylS: 'Quality without costs', xfmt: (v) => fmt(v), yfmt: (v) => fmt(v), good: 'top-left', labels: [...value.slice(0, 6), ...top, ...dear.slice(0, 2)].map((p) => p.key), mLabels: 6,
      caption: `Dashed lines mark the median country. The shaded corner holds countries with above-median quality and below-median prices: ${esc(list(value.slice(0, 6).map((p) => p.name)))}. Prices and quality are linked (r = ${fmt(corr(pts.map((p) => p.x), pts.map((p) => p.y)), 2)}), but not tightly, so the same money buys very different lives.` })}
<h2>What sits behind each score</h2><ul>${LK.map((k) => `<li><b>${esc(LIVE[k])}</b>: ${esc((N.categories[k] || []).map(([m]) => (N.measures[m] || {}).label || m).join('; '))}.</li>`).join('')}</ul>
${FOOT('Sources: World Bank WDI (CC BY 4.0), World Bank Women, Business and the Law 2026, Transparency International CPI, V-Dem v16, ND-GAIN.')}`;
    pageIns('/insights/quality-of-life/', `Quality of life: ${lifeLeague.length} countries compared`, `Which countries offer the best life? ${lifeLeague.length} countries scored on jobs, costs, safety, health, environment, family support, fairness and connections, with crowns and medals.`, body, 'living', ld('Quality of life ranking', lifeLeague.map((r) => r.cc)));
  }

  /* H2. cost of living and inflation */
  {
    const pl = CC.map((cc) => ({ cc, v: sc(NV(cc, 'price_level'), 100) })).filter((r) => fin(r.v)).sort((a, b) => a.v - b.v);
    const pts = CC.map((cc) => ({ key: cc, name: nm(cc), href: cpath(cc), x: sc(NV(cc, 'price_level'), 100), y: sc(NV(cc, 'gni_pc_ppp'), 1 / 1000) })).filter((p) => fin(p.x) && fin(p.y));
    const mx = median(pts.map((p) => p.x)), my = median(pts.map((p) => p.y));
    const sweet = pts.filter((p) => p.x <= mx && p.y >= my).sort((a, b) => b.y - a.y);   // highest income first
    const cum = CC.map((cc) => { const s = SER(cc, 'inflation'); if (!s) return null; const ys = s.y.filter(([y]) => y >= 2020); if (ys.length < 4) return null; const f = ys.reduce((a, [, v]) => a * (1 + v / 100), 1); return { cc, v: (f - 1) * 100, from: ys[0][0], to: ys[ys.length - 1][0], s }; }).filter(Boolean).sort((a, b) => a.v - b.v);
    const big = ['DE', 'FR', 'IT', 'ES', 'UK', 'US', 'CH', 'NL', 'PL', 'JP', 'CA', 'AU', 'SE', 'AT', 'BE', 'HU', 'CZ', 'PT', 'EL', 'IE', 'TW', 'KR', 'CN', 'IN'].filter((cc) => SER(cc, 'inflation'));
    const body = `${kick('living')}${printBtn}<h1>Cost of living: where money goes furthest</h1>
<p class="lede">The same salary buys a very different life in Lisbon, Zurich or Kuala Lumpur. Three views: how expensive each country is, how far incomes stretch, and how much prices have risen since 2020.</p>
${C.bars(pl.map((r) => ({ label: cl(r.cc), v: r.v })), { title: 'Consumer price level, United States = 100 (cheapest first)' + ytag('price_level'), fmt: (v) => fmt(v), tone: (v) => v < 60 ? 'g' : v > 100 ? 'b' : '',
      caption: `The ratio of purchasing-power parity to the market exchange rate for household consumption, ${pl.length} countries. ${esc(nm(pl[0].cc))} is the cheapest (${fmt(pl[0].v)}), ${esc(nm(pl[pl.length - 1].cc))} the dearest (${fmt(pl[pl.length - 1].v)}): a basket that costs 100 dollars in the United States costs about ${fmt(pl[pl.length - 1].v)} there.` })}
<h2>How far incomes stretch</h2>
${C.scatter(pts, { title: 'Income per person against the price level' + ytag('price_level', 'gni_pc_ppp'), xl: 'Consumer price level, United States = 100', xlS: 'Price level, US = 100', yl: 'Income per person at purchasing power, thousand international $', ylS: 'Income, thousand int. $', xfmt: (v) => fmt(v), yfmt: (v) => fmt(v), good: 'top-left', labels: [...sweet.slice(0, 6), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 3)].map((p) => p.key),
      caption: `Top left: incomes above the median country with prices below it. ${sweet.length ? esc(list(sweet.slice(0, 6).map((p) => p.name))) + ' sit there.' : ''} Income here is already adjusted for prices (purchasing power), so it shows what people can actually buy.` })}
<h2>The price shock since 2020</h2>
${C.bars(cum.map((r) => ({ label: cl(r.cc), v: r.v, note: `${r.from}–${r.to}` })), { title: 'How much consumer prices rose in total since 2020', fmt: (v) => '+' + fmt(v, 0) + '%', tone: (v) => v < 20 ? 'g' : v > 40 ? 'b' : '', noMedal: true,
      caption: `Yearly inflation rates chained from 2020 to the latest year. Prices rose least in ${esc(list(cum.slice(0, 3).map((r) => `${nm(r.cc)} (+${fmt(r.v, 0)}%)`)))} and most in ${esc(list(cum.slice(-3).reverse().map((r) => `${nm(r.cc)} (+${fmt(r.v, 0)}%)`)))}. Wages did not rise equally everywhere, so the same increase hurts more where pay stood still.` })}
${C.multiples(big.map((cc) => { const s = SER(cc, 'inflation'); return { label: `${flagImg(cc, 11)} ${esc(nm(cc))}`, y: s.y.filter(([y]) => y >= 2012), tone: s.y[s.y.length - 1][1] > 4 ? 'b' : '' }; }), { title: 'Inflation by year since 2012, same scale for every country', fmt: (v) => fmt(v, 1) + '%', shared: true, zeroLine: true, caption: 'Each panel uses the same vertical scale, so the height of the 2022 peak can be compared directly. Red lines: inflation still above 4% in the latest year.' })}
${FOOT('Sources: World Bank WDI (CC BY 4.0): PA.NUS.PPPC.RF, NY.GNP.PCAP.PP.CD, FP.CPI.TOTL.ZG.')}`;
    pageIns('/insights/cost-of-living/', 'Cost of living: where money goes furthest', 'How expensive is daily life in __NCN__ countries, how far do incomes stretch, and how much have prices risen since 2020? Charts and rankings from official data.', body, 'living');
  }

  /* H3. safety */
  {
    const hom = CC.map((cc) => ({ cc, v: NV(cc, 'homicide') })).filter((r) => fin(r.v)).sort((a, b) => a.v - b.v);
    const pts = CC.map((cc) => ({ key: cc, name: nm(cc), href: cpath(cc), x: NV(cc, 'road_deaths'), y: NV(cc, 'homicide') })).filter((p) => fin(p.x) && fin(p.y) && p.y > 0);
    const safe = pts.filter((p) => p.x <= median(pts.map((q) => q.x)) && p.y <= median(pts.map((q) => q.y))).sort((a, b) => a.x + a.y * 3 - (b.x + b.y * 3));
    const ch = CC.map((cc) => { const s = SER(cc, 'homicide'); if (!s) return null; const l = s.y[s.y.length - 1], f = s.y.find(([y]) => y >= l[0] - 10); return f && l[0] - f[0] >= 6 ? { cc, a: f[1], b: l[1], ya: f[0], yb: l[0] } : null; }).filter(Boolean).sort((a, b) => (a.b - a.a) - (b.b - b.a));
    const body = `${kick('living')}${printBtn}<h1>Safety: homicides, road deaths and the trend</h1>
<p class="lede">Two numbers say most about everyday physical safety: how often people are killed by violence and how often on the road. Both are counted the same way everywhere, which makes them the fairest safety comparison between countries.</p>
${C.bars(hom.map((r) => ({ label: cl(r.cc), v: r.v, note: NY(r.cc, 'homicide') })), { title: 'Homicides per 100,000 people (safest first)' + ytag('homicide'), fmt: (v) => fmt(v, v < 10 ? 2 : 1), tone: (v) => v < 1 ? 'g' : v > 5 ? 'b' : '',
      caption: `${esc(nm(hom[0].cc))} records ${fmt(hom[0].v, 2)} homicides per 100,000 people a year, ${esc(nm(hom[hom.length - 1].cc))} ${fmt(hom[hom.length - 1].v, 1)}: a ${fmt(hom[hom.length - 1].v / hom[0].v, 0)}-fold difference. Below 1 is typical for Western Europe and East Asia.` })}
${C.scatter(pts, { title: 'Violence against road danger' + ytag('homicide', 'road_deaths'), xl: 'Road deaths per 100,000 people', xlS: 'Road deaths per 100,000', yl: 'Homicides per 100,000 people', ylS: 'Homicides per 100,000', xfmt: (v) => fmt(v), yfmt: (v) => fmt(v, v < 10 ? 1 : 0), good: 'bottom-left', labels: [...safe.slice(0, 6), ...pts.slice().sort((a, b) => b.y - a.y).slice(0, 3), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 2)].map((p) => p.key),
      caption: `Bottom left is safest on both counts: ${esc(list(safe.slice(0, 6).map((p) => p.name)))}. The two risks are only ${strength(corr(pts.map((p) => p.x), pts.map((p) => p.y))).replace(/^a /, '')} related: some countries with very little violence still have dangerous roads.` })}
${ch.length ? C.arrows(ch.map((r) => ({ label: cl(r.cc), a: r.a, b: r.b })), { title: 'Homicides per 100,000 people, about ten years ago and now', fmt: (v) => fmt(v, v < 10 ? 2 : 1), better: -1, aLabel: 'about ten years ago', bLabel: 'latest year', caption: `Sorted from the biggest fall to the biggest rise. Violence fell most in ${esc(list(ch.slice(0, 3).map((r) => nm(r.cc))))}${ch[ch.length - 1].b > ch[ch.length - 1].a ? ` and rose most in ${esc(list(ch.filter((r) => r.b > r.a).slice(-3).reverse().map((r) => nm(r.cc))))}` : ''}.` }) : ''}
<p>Recorded crime by type differs too much in definitions between countries to compare fairly; the place pages show local crime figures where statistics offices publish them, always compared within the same country.</p>
${FOOT('Sources: World Bank WDI (CC BY 4.0): VC.IHR.PSRC.P5 (UNODC), SH.STA.TRAF.P5 (WHO).')}`;
    pageIns('/insights/safety/', 'Safety: homicides and road deaths in __NCN__ countries', 'Which countries are safest? Homicide and road-death rates for every Nestlyzer country, how they relate and how they changed over ten years.', body, 'living');
  }

  /* H4. health and longevity */
  {
    const pts = CC.map((cc) => ({ key: cc, name: nm(cc), href: cpath(cc), x: Math.log10(NV(cc, 'gni_pc_ppp')), y: NV(cc, 'life_expectancy') })).filter((p) => fin(p.x) && fin(p.y));
    const f = fit(pts); pts.forEach((p) => { p.res = p.y - f(p.x); });
    const over = pts.slice().sort((a, b) => b.res - a.res), under = over.slice().reverse();
    const le = CC.map((cc) => { const s = SER(cc, 'life_exp'); if (!s) return null; const l = s.y[s.y.length - 1], a = s.y.find(([y]) => y === l[0] - 10); return a ? { cc, a: a[1], b: l[1] } : null; }).filter(Boolean).sort((a, b) => b.b - a.b);
    const im = CC.map((cc) => ({ cc, v: NV(cc, 'infant_mortality') })).filter((r) => fin(r.v)).sort((a, b) => a.v - b.v);
    const body = `${kick('living')}${printBtn}<h1>Health and longevity: who lives longest, and who beats their income</h1>
<p class="lede">Richer countries live longer, but not by a fixed rule. Some countries add years that their income alone would not predict, others fall short. That gap says a lot about healthcare, diet, roads and how unequal a society is.</p>
${C.scatter(pts, { title: 'Life expectancy against income per person' + ytag('life_expectancy', 'gni_pc_ppp'), xl: 'Income per person at purchasing power (log scale, int. $)', xlS: 'Income per person (log)', yl: 'Life expectancy at birth, years', ylS: 'Life expectancy, years', xfmt: (v) => fmtInt(10 ** v / 1000) + 'k', yfmt: (v) => fmt(v), trend: true, labels: [...over.slice(0, 5), ...under.slice(0, 4)].map((p) => p.key), mLabels: 7,
      caption: `The orange line follows the typical life expectancy at each income level. Above it, longer lives than income predicts: ${esc(list(over.slice(0, 5).map((p) => `${p.name} (+${fmt(p.res, 1)} years)`)))}. Below it: ${esc(list(under.slice(0, 4).map((p) => `${p.name} (−${fmt(-p.res, 1)})`)))}.` })}
${C.arrows(le.map((r) => ({ label: cl(r.cc), a: r.a, b: r.b })), { title: 'Life expectancy at birth: ten years ago and now (longest first)', fmt: (v) => fmt(v, 1), better: 1, aLabel: 'ten years earlier', bLabel: 'latest year', caption: `Most countries gained years despite the pandemic dip of 2020–2021. Gains over the decade were largest in ${esc(list(le.slice().sort((a, b) => (b.b - b.a) - (a.b - a.a)).slice(0, 3).map((r) => `${nm(r.cc)} (${sgn(r.b - r.a, 1)} years)`)))}.` })}
${C.bars(im.map((r) => ({ label: cl(r.cc), v: r.v, note: NY(r.cc, 'infant_mortality') })), { title: 'Infant mortality per 1,000 live births (lowest first)' + ytag('infant_mortality'), fmt: (v) => fmt(v, 1), tone: (v) => v < 3 ? 'g' : v > 10 ? 'b' : '', caption: 'The most sensitive single measure of a health system: deaths before the first birthday per 1,000 live births.' })}
${FOOT('Sources: World Bank WDI (CC BY 4.0): SP.DYN.LE00.IN, NY.GNP.PCAP.PP.CD, SP.DYN.IMRT.IN.')}`;
    pageIns('/insights/health-and-longevity/', 'Health and longevity: who lives longest', 'Life expectancy against income for __NCN__ countries: who lives longer than their wealth predicts, ten-year gains and infant mortality, from official data.', body, 'living');
  }

  /* H5. clean air */
  {
    const pm = CC.map((cc) => ({ cc, v: NV(cc, 'pm25') })).filter((r) => fin(r.v)).sort((a, b) => a.v - b.v);
    const pts = CC.map((cc) => ({ key: cc, name: nm(cc), href: cpath(cc), x: NV(cc, 'renewable_power'), y: NV(cc, 'pm25') })).filter((p) => fin(p.x) && fin(p.y));
    const ch = CC.map((cc) => { const s = SER(cc, 'pm25'); if (!s) return null; const l = s.y[s.y.length - 1], a = s.y.find(([y]) => y === l[0] - 10) || s.y[0]; return l[0] - a[0] >= 6 ? { cc, a: a[1], b: l[1] } : null; }).filter(Boolean).sort((a, b) => a.b - b.b);
    const under5 = pm.filter((r) => r.v <= 5).map((r) => nm(r.cc));
    const body = `${kick('living')}${printBtn}<h1>Clean air: fine-particle pollution in __NCN__ countries</h1>
<p class="lede">Fine particles (PM2.5) are the air pollutant that harms health most. The World Health Organization's guideline is an annual average of 5 micrograms per cubic metre. Here is where people breathe the cleanest and the dirtiest air, and how it changed.</p>
${C.bars(pm.map((r) => ({ label: cl(r.cc), v: r.v, note: NY(r.cc, 'pm25') })), { title: 'Average exposure to PM2.5, µg/m³ (cleanest first)' + ytag('pm25'), fmt: (v) => fmt(v, 1), tone: (v) => v <= 5 ? 'g' : v > 15 ? 'b' : 'n',
      caption: `Green: within the WHO guideline of 5 µg/m³${under5.length ? ` (${esc(list(under5))})` : ''}. Red: more than three times the guideline. Population-weighted national averages; cities can be far worse than the national figure.` })}
${C.scatter(pts, { title: 'Air pollution against the renewable share of electricity' + ytag('pm25', 'renewable_power'), xl: 'Renewable share of electricity, %', xlS: 'Renewable power, %', yl: 'PM2.5 exposure, µg/m³', ylS: 'PM2.5, µg/m³', xfmt: (v) => fmt(v) + '%', yfmt: (v) => fmt(v), good: 'bottom-right', labels: [...pts.slice().sort((a, b) => b.y - a.y).slice(0, 4), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 4)].map((p) => p.key),
      caption: `Clean power helps, but the link is ${strength(corr(pts.map((p) => p.x), pts.map((p) => p.y))).replace(/^a /, '')}: traffic, heating with wood or coal, farming and dust from deserts matter as much as the power plants.` })}
${C.arrows(ch.map((r) => ({ label: cl(r.cc), a: r.a, b: r.b })), { title: 'PM2.5 exposure: about ten years ago and now (cleanest first)', fmt: (v) => fmt(v, 1), better: -1, aLabel: 'about ten years earlier', bLabel: 'latest year', caption: `Air got cleaner in ${ch.filter((r) => r.b < r.a).length} of ${ch.length} countries.` })}
${FOOT('Sources: World Bank WDI (CC BY 4.0): EN.ATM.PM25.MC.M3 (Global Burden of Disease / WHO), EG.ELC.RNEW.ZS. WHO global air quality guidelines 2021.')}`;
    pageIns('/insights/clean-air/', 'Clean air: fine-particle pollution by country', 'Where is the air cleanest? PM2.5 exposure in __NCN__ countries against the WHO guideline, its link to renewable power and the ten-year trend.', body, 'living');
  }

  /* H6. jobs and pay */
  {
    const pts = CC.map((cc) => ({ key: cc, name: nm(cc), href: cpath(cc), x: NV(cc, 'unemployment'), y: sc(NV(cc, 'gni_pc_ppp'), 1 / 1000) })).filter((p) => fin(p.x) && fin(p.y));
    const mx = median(pts.map((p) => p.x)), my = median(pts.map((p) => p.y)), best = pts.filter((p) => p.x <= mx && p.y >= my).sort((a, b) => b.y - a.y);
    const fl = CC.map((cc) => ({ cc, v: NV(cc, 'female_lfp') })).filter((r) => fin(r.v)).sort((a, b) => b.v - a.v);
    const big = CC.filter((cc) => SER(cc, 'unemployment')).sort((a, b) => SLAST(b, 'unemployment')[1] - SLAST(a, 'unemployment')[1]);
    const body = `${kick('living')}${printBtn}<h1>Jobs and pay: where work is easy to find and pays well</h1>
<p class="lede">For anyone moving for work, two questions come first: will I find a job, and what will it buy? This page sets unemployment against income, shows who includes women in work, and tracks unemployment since 2010.</p>
${C.scatter(pts, { title: 'Income per person against unemployment' + ytag('unemployment', 'gni_pc_ppp'), xl: 'Unemployment rate, % (ILO estimate)', xlS: 'Unemployment, %', yl: 'Income per person at purchasing power, thousand int. $', ylS: 'Income, thousand int. $', xfmt: (v) => fmt(v) + '%', yfmt: (v) => fmt(v), good: 'top-left', labels: [...best.slice(0, 6), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 4)].map((p) => p.key),
      caption: `Top left: high incomes and few people out of work — ${esc(list(best.slice(0, 6).map((p) => p.name)))}. The highest unemployment is in ${esc(list(pts.slice().sort((a, b) => b.x - a.x).slice(0, 3).map((p) => `${p.name} (${fmt(p.x, 1)}%)`)))}.` })}
${C.bars(fl.map((r) => ({ label: cl(r.cc), v: r.v })), { title: "Women in the labour force, % of women aged 15+ (highest first)" + ytag('female_lfp'), fmt: (v) => fmt(v, 0) + '%', tone: (v) => v >= 60 ? 'g' : v < 45 ? 'b' : '', caption: 'A high share of women in work usually goes with good childcare, flexible jobs and two-income households; it also widens the pool of staff for employers.' })}
${C.multiples(big.map((cc) => { const s = SER(cc, 'unemployment'), l = s.y[s.y.length - 1], c = s.change['10']; return { label: `${flagImg(cc, 11)} ${esc(nm(cc))}`, y: s.y, tone: fin(c) ? (c < -0.5 ? 'g' : c > 0.5 ? 'b' : '') : '', note: fin(c) ? sgn(c, 1, ' pts') + ' in 10 yrs' : '' }; }), { title: 'Unemployment since 2010, highest today first (same scale)', fmt: (v) => fmt(v, 1) + '%', shared: true, caption: 'Green: lower than ten years ago, red: higher. Same vertical scale in every panel.' })}
${FOOT('Sources: World Bank WDI (CC BY 4.0): SL.UEM.TOTL.ZS (ILO modelled estimates), NY.GNP.PCAP.PP.CD, SL.TLF.CACT.FE.ZS.')}`;
    pageIns('/insights/jobs-and-pay/', 'Jobs and pay: work that is easy to find and pays', 'Unemployment against income for __NCN__ countries, women in the workforce and unemployment trends since 2010, from official data.', body, 'living');
  }

  /* H7. ageing and population growth */
  {
    const pts = CC.map((cc) => { const a = SLAST(cc, 'age65'), g = SER(cc, 'population'); return a && g && fin(g.change['10']) ? { key: cc, name: nm(cc), href: cpath(cc), x: a[1], y: g.change['10'] } : null; }).filter(Boolean);
    const young = pts.filter((p) => p.x < median(pts.map((q) => q.x)) && p.y > median(pts.map((q) => q.y))).sort((a, b) => b.y - a.y);
    const shrink = pts.filter((p) => p.y < 0).sort((a, b) => a.y - b.y);
    const ag = CC.filter((cc) => SER(cc, 'age65')).sort((a, b) => SLAST(b, 'age65')[1] - SLAST(a, 'age65')[1]);
    const body = `${kick('living')}${printBtn}<h1>Ageing and growth: young, growing countries and shrinking ones</h1>
<p class="lede">Where people move to and where children are born shapes everything from house prices to school places and the future tax bill. This page puts the share of over-65s next to how fast each population grew over ten years.</p>
${C.scatter(pts, { title: 'Population growth over ten years against the share aged 65+', xl: 'Residents aged 65 and over, %', xlS: 'Aged 65+, %', yl: 'Population change over ten years, %', ylS: 'Population change, 10 yrs %', xfmt: (v) => fmt(v) + '%', yfmt: (v) => sgn(v, 0, '%'), good: 'top-left', labels: [...young.slice(0, 5), ...shrink.slice(0, 4), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 2)].map((p) => p.key),
      caption: `Top left: young and growing — ${esc(list(young.slice(0, 5).map((p) => `${p.name} (${sgn(p.y, 0, '%')})`)))}. ${shrink.length ? `Shrinking over the decade: ${esc(list(shrink.slice(0, 5).map((p) => `${p.name} (${sgn(p.y, 1, '%')})`)))}.` : ''}` })}
${C.multiples(ag.map((cc) => { const s = SER(cc, 'age65'), c = s.change['10']; return { label: `${flagImg(cc, 11)} ${esc(nm(cc))}`, y: s.y, note: fin(c) ? sgn(c, 1, ' pts') + ' in 10 yrs' : '' }; }), { title: 'Share of residents aged 65+ since 2010, oldest first (same scale)', fmt: (v) => fmt(v, 1) + '%', shared: true, caption: 'Almost every line rises: the question is how fast. Same vertical scale in every panel.' })}
${FOOT('Sources: World Bank WDI (CC BY 4.0): SP.POP.65UP.TO.ZS, SP.POP.TOTL.')}`;
    pageIns('/insights/ageing-and-growth/', 'Ageing and growth: young and shrinking countries', 'Population growth against ageing for __NCN__ countries: who is young and growing, who is shrinking, and how fast the share of over-65s rises.', body, 'living');
  }

  /* H8. families */
  {
    const fk = ['childcare_support', 'parenthood_support', 'infant_mortality', 'female_lfp', 'tertiary'];
    const fam = CC.map((cc) => ({ cc, s: NC(cc, 'family') })).filter((r) => fin(r.s)).sort((a, b) => b.s - a.s);
    const pts = CC.map((cc) => ({ key: cc, name: nm(cc), href: cpath(cc), x: NV(cc, 'childcare_support'), y: NV(cc, 'female_lfp') })).filter((p) => fin(p.x) && fin(p.y));
    const rows = fam.map((r, i) => [`${medal(i) || `<small>${i + 1}.</small>`} ${cl(r.cc)}`, `<b>${fmt(r.s)}</b>`, ...fk.map((m) => { const v = NV(r.cc, m); return fin(v) ? fmt(v, m === 'infant_mortality' ? 1 : 0) : '–'; })]);
    const body = `${kick('living')}${printBtn}<h1>Family-friendly countries: childcare, parental leave and children's health</h1>
<p class="lede">For a family the national rules matter as much as the town: paid leave, childcare, whether both parents can work, and how safe the first year of life is. The family score combines exactly those.</p>
${C.scatter(pts, { title: 'Women in work against childcare support in the law' + ytag('female_lfp', 'childcare_support'), xl: 'Childcare support score (0–100)', xlS: 'Childcare support', yl: 'Women in the labour force, %', ylS: 'Women working, %', xfmt: (v) => fmt(v), yfmt: (v) => fmt(v) + '%', good: 'top-right', labels: pts.slice().sort((a, b) => (b.x + b.y) - (a.x + a.y)).slice(0, 5).concat(pts.slice().sort((a, b) => a.y - b.y).slice(0, 3)).map((p) => p.key),
      caption: `Where the law supports childcare, more women tend to work (r = ${fmt(corr(pts.map((p) => p.x), pts.map((p) => p.y)), 2)}). Culture, part-time rules and the cost of childcare explain the rest.` })}
${C.league(['Country', 'Family score', 'Childcare support', 'Parenthood support', 'Infant mortality', 'Women working', 'Tertiary enrolment'], rows)}
<p class="ins-note">Childcare and parenthood support are World Bank Women, Business and the Law scores (0–100, from the laws on leave, benefits and childcare). Infant mortality per 1,000 live births; women in the labour force and tertiary enrolment in %.</p>
<p>The place pages add what differs inside a country: other families nearby, schools and childcare where they are published, safe streets and homes a family can afford. <a href="/insights/best-places-to-live/">See the best places for families</a>.</p>
${FOOT('Sources: World Bank Women, Business and the Law 2026; World Bank WDI (CC BY 4.0).')}`;
    pageIns('/insights/family-friendly-countries/', 'Family-friendly countries: childcare, leave and health', 'Which countries support families best? Childcare and parental-leave law, women in work and infant health for __NCN__ countries, ranked with crowns and medals.', body, 'living', ld('Family-friendly countries', fam.map((r) => r.cc)));
  }

  /* =================================================================== INSIDE THE COUNTRIES (place level) */
  const PL = (cc, keys) => {
    const d = J('data/c/' + cc + '.json'), c = d.cols, iO = c.indexOf('oid'), iN = c.indexOf('name'), iP = c.indexOf('pop'), iS = c.indexOf('sup');
    return d.rows.map((r, i) => { if (iS >= 0 && r[iS]) return null; const o = { id: cc + ':' + r[iO], name: r[iN], pop: r[iP] }; for (const k of keys) { const col = d.fr[k]; o[k] = col ? col[i] : null; } return o; }).filter((o) => o && keys.every((k) => fin(o[k])));
  };
  const plink = (o) => H.PAGES[o.id] ? `<a href="${H.PAGES[o.id]}">${esc(o.name)}</a>` : esc(o.name);
  const bigPlaces = (rows, n) => rows.slice().sort((a, b) => (b.pop || 0) - (a.pop || 0)).slice(0, n);
  const placeTable = (rows, cols) => C.league(cols.map((c) => c[0]), rows.map((o, i) => [`<small>${i + 1}.</small> ${plink(o)}`, ...cols.slice(1).map((c) => c[1](o))]));
  const insideCards = [];
  const inside = (cc, slug, title, desc, body) => { pageIns(`/insights/${slug}/`, title, desc, `${kick('inside')}${printBtn}${body}<div class="cta-band"><h2>Every place in ${esc(nm(cc))}, ranked for you</h2><p>The figures on this page feed the place pages and rankings. Pick who is moving and see the best places.</p><a class="btn" href="${appLink({ cc, p: 'young_family' })}">Open ${esc(nm(cc))} on the map</a> <a class="btn" href="${cpath(cc)}">${esc(nm(cc))} in numbers</a></div>`, 'inside'); insideCards.push(cc); };

  /* P1 France: rent against income */
  {
    const rows = PL('FR', ['n_income_median_cu', 'n_rent_flat_m2']);
    rows.forEach((o) => { o.burden = o.n_rent_flat_m2 * 50 * 12 / o.n_income_median_cu * 100; });
    const pts = rows.map((o) => ({ x: o.n_income_median_cu / 1000, y: o.n_rent_flat_m2, name: o.name }));
    const hl = bigPlaces(rows, 12).map((o) => ({ x: o.n_income_median_cu / 1000, y: o.n_rent_flat_m2, name: o.name, href: H.PAGES[o.id] }));
    const towns = rows.filter((o) => o.pop >= 20000), worst = towns.slice().sort((a, b) => b.burden - a.burden).slice(0, 12), bestT = towns.slice().sort((a, b) => a.burden - b.burden).slice(0, 12);
    const r = corr(pts.map((p) => p.x), pts.map((p) => p.y));
    inside('FR', 'france-rent-vs-income', `France: rent against income in ${fmtInt(rows.length)} communes`, `Asking rents against local incomes for ${fmtInt(rows.length)} French communes: where rent eats the most of a typical income and where housing is a bargain.`,
      `<h1>France: rent against income in ${fmtInt(rows.length)} communes</h1>
<p class="lede">Every French commune with both figures: the asking rent for a flat per square metre against the median disposable income of its residents. Paris and the Riviera stand out, but so do towns where good incomes meet modest rents.</p>
${C.density(pts, { title: 'Asking rent per m² against median income, every commune', xl: 'Median disposable income per consumption unit, thousand € a year', xlS: 'Median income, k€ a year', yl: 'Asking rent for a flat, € per m² a month', ylS: 'Rent, € per m² a month', xfmt: (v) => fmt(v), yfmt: (v) => fmt(v), highlights: hl, mLabels: 6,
        caption: `Darker cells hold more communes. Higher incomes go with higher rents (r = ${fmt(r, 2)}), yet at any income level rents still vary by a factor of two or more: coast, mountains and big-city commuting zones cost extra. Named dots: the 12 largest communes.` })}
<div class="ins-two"><div><h2>Where rent weighs most</h2>${placeTable(worst, [['Commune (20,000+ residents)'], ['Rent share', (o) => `<b>${fmt(o.burden, 0)}%</b>`], ['Rent €/m²', (o) => fmt(o.n_rent_flat_m2, 1)], ['Median income €', (o) => fmtInt(o.n_income_median_cu)]])}</div>
<div><h2>Where it weighs least</h2>${placeTable(bestT, [['Commune (20,000+ residents)'], ['Rent share', (o) => `<b>${fmt(o.burden, 0)}%</b>`], ['Rent €/m²', (o) => fmt(o.n_rent_flat_m2, 1)], ['Median income €', (o) => fmtInt(o.n_income_median_cu)]])}</div></div>
<p class="ins-note">Rent share = a 50 m² flat at the asking rent for a year, as a share of the median disposable income per consumption unit. An illustration for comparing communes, not what a household actually pays: sitting tenants pay less than asking rents, and households differ in size.</p>
${FOOT('Sources: French ministry of housing rent map 2025 (DHUP with ANIL and Cerema, Licence Ouverte); INSEE Filosofi median disposable income (Licence Ouverte).')}`);
  }

  /* P2 Italy: rental yields */
  {
    const rows = PL('IT', ['n_house_price_m2_it', 'n_rent_m2_it']).filter((o) => o.n_house_price_m2_it >= 300 && o.n_rent_m2_it >= 1.5);
    rows.forEach((o) => { o.yld = o.n_rent_m2_it * 12 / o.n_house_price_m2_it * 100; });
    const pts = rows.map((o) => ({ x: o.n_house_price_m2_it, y: o.yld, name: o.name }));
    const hl = bigPlaces(rows, 12).map((o) => ({ x: o.n_house_price_m2_it, y: o.yld, name: o.name, href: H.PAGES[o.id] }));
    const towns = rows.filter((o) => o.pop >= 20000), hi = towns.slice().sort((a, b) => b.yld - a.yld).slice(0, 12), lo = towns.slice().sort((a, b) => a.yld - b.yld).slice(0, 12);
    inside('IT', 'italy-rental-yields', `Italy: gross rental yields in ${fmtInt(rows.length)} comuni (2018)`, `Home prices against rents for ${fmtInt(rows.length)} Italian municipalities from the official OMI quotations: where buying to let yields most and least.`,
      `<h1>Italy: gross rental yields in ${fmtInt(rows.length)} comuni, 2018</h1>
<p class="lede">The tax agency's property observatory quotes typical prices and rents for every Italian municipality. Dividing a year's rent by the price gives the gross rental yield: what a home earns before costs and taxes. Cheap towns often yield more, expensive cities less.</p>
${C.density(pts, { title: 'Gross rental yield against the home price per m², second half of 2018 (comune level)', xl: 'Home price, € per m²', xlS: 'Home price, €/m²', yl: 'Gross rental yield, % a year', ylS: 'Gross yield, %', xfmt: (v) => fmtInt(v), yfmt: (v) => fmt(v, 1) + '%', highlights: hl, mLabels: 6,
        caption: `Median gross yield ${fmt(median(rows.map((o) => o.yld)), 1)}%. Yields fall as prices rise: in the big cities a euro of rent costs far more capital. Named dots: the 12 largest comuni.` })}
<div class="ins-two"><div><h2>Highest yields</h2>${placeTable(hi, [['Comune (20,000+ residents)'], ['Gross yield', (o) => `<b>${fmt(o.yld, 1)}%</b>`], ['Price €/m²', (o) => fmtInt(o.n_house_price_m2_it)], ['Rent €/m²/month', (o) => fmt(o.n_rent_m2_it, 2)]])}</div>
<div><h2>Lowest yields</h2>${placeTable(lo, [['Comune (20,000+ residents)'], ['Gross yield', (o) => `<b>${fmt(o.yld, 1)}%</b>`], ['Price €/m²', (o) => fmtInt(o.n_house_price_m2_it)], ['Rent €/m²/month', (o) => fmt(o.n_rent_m2_it, 2)]])}</div></div>
<p class="ins-note">Medians across each comune's zones of the mid quotation for ordinary homes, second half of 2018, the most recent complete set in Nestlyzer. These are historical quotations: prices and rents have moved since, and the gaps between towns may have changed too. Gross yield ignores vacancy, maintenance, agency fees and taxes. Not investment advice.</p>
${FOOT('Source: Agenzia delle Entrate – OMI quotations, 2nd half 2018, as republished by Comune di Milano open data (CC BY 4.0).')}`);
  }

  /* P3 United States: income and life expectancy (counties) */
  {
    const rows = PL('US', ['n_income_median_us', 'n_life_expectancy_local']);
    const seen = new Map(); for (const o of rows.sort((a, b) => (b.pop || 0) - (a.pop || 0))) { const k = o.n_income_median_us + '|' + o.n_life_expectancy_local; if (!seen.has(k)) seen.set(k, o); }
    const cty = [...seen.values()];
    const pts = cty.map((o) => ({ x: o.n_income_median_us / 1000, y: o.n_life_expectancy_local, name: o.name }));
    const f = fit(pts); cty.forEach((o) => { o.res = o.n_life_expectancy_local - f(o.n_income_median_us / 1000); });
    const hl = bigPlaces(cty, 10).map((o) => ({ x: o.n_income_median_us / 1000, y: o.n_life_expectancy_local, name: o.name, href: H.PAGES[o.id] }));
    const over = cty.filter((o) => o.pop >= 50000).sort((a, b) => b.res - a.res).slice(0, 12), under = cty.filter((o) => o.pop >= 50000).sort((a, b) => a.res - b.res).slice(0, 12);
    const r = corr(pts.map((p) => p.x), pts.map((p) => p.y));
    inside('US', 'us-income-and-life-expectancy', `United States: income and life expectancy in ${fmtInt(cty.length)} counties`, 'Median household income against life expectancy for every US county: the money–health gradient, and the places that live much longer or shorter than their income predicts.',
      `<h1>United States: income and life expectancy in ${fmtInt(cty.length)} counties</h1>
<p class="lede">Within one country the gap in life expectancy between counties is larger than between most nations. Income explains a good part of it (r = ${fmt(r, 2)}), but far from all. The tables name the places that beat their income and those that fall short.</p>
${C.density(pts, { title: 'Life expectancy against median household income, every county', xl: 'Median household income, thousand US$ a year', xlS: 'Household income, k$', yl: 'Life expectancy at birth, years', ylS: 'Life expectancy, years', xfmt: (v) => fmt(v), yfmt: (v) => fmt(v), highlights: hl, mLabels: 6,
        caption: 'Darker cells hold more counties; the orange line follows the typical life expectancy at each income. Named dots: the counties of the ten largest cities.' })}
<div class="ins-two"><div><h2>Longer lives than income predicts</h2>${placeTable(over, [['Place (county figures, 50,000+ residents)'], ['Years above', (o) => `<b>+${fmt(o.res, 1)}</b>`], ['Life exp.', (o) => fmt(o.n_life_expectancy_local, 1)], ['Income $', (o) => fmtInt(o.n_income_median_us)]])}</div>
<div><h2>Shorter lives than income predicts</h2>${placeTable(under, [['Place (county figures, 50,000+ residents)'], ['Years below', (o) => `<b>−${fmt(-o.res, 1)}</b>`], ['Life exp.', (o) => fmt(o.n_life_expectancy_local, 1)], ['Income $', (o) => fmtInt(o.n_income_median_us)]])}</div></div>
<p class="ins-note">Each county appears once, named after its largest Nestlyzer place. "Predicted" is a straight-line fit of life expectancy on income across all counties.</p>
${FOOT('Sources: U.S. Census Bureau, American Community Survey 2019–2023 (median household income); County Health Rankings & Roadmaps 2025 from CDC data (life expectancy).')}`);
  }

  /* P4 United Kingdom: house prices against pay */
  {
    const rows = PL('UK', ['n_house_price_uk', 'n_pay_week_uk']);
    rows.forEach((o) => { o.ratio = o.n_house_price_uk / (o.n_pay_week_uk * 52); });
    const pts = rows.map((o) => ({ key: o.id, name: o.name, href: H.PAGES[o.id], x: o.n_pay_week_uk, y: o.n_house_price_uk / 1000 }));
    const s = rows.slice().sort((a, b) => b.ratio - a.ratio);
    const lab = [...s.slice(0, 5), ...s.slice(-4), ...bigPlaces(rows, 3)].map((o) => o.id);
    const hp = rows.filter((o) => fin(o.ratio)).map((o) => ({ label: plink(o), v: o.ratio }));
    inside('UK', 'uk-house-prices-vs-pay', `United Kingdom: house prices against pay in ${rows.length} areas`, 'Average house prices against median pay for every local authority in the UK: where a home costs the most years of earnings and where it costs the fewest.',
      `<h1>United Kingdom: house prices against pay in ${rows.length} areas</h1>
<p class="lede">How many years of a typical wage does a typical home cost? In parts of London more than twenty, in parts of the North and Scotland about five. Here is every local authority.</p>
${C.scatter(pts, { title: 'Average house price against median weekly pay', xl: 'Median weekly pay, £', xlS: 'Weekly pay, £', yl: 'Average house price, thousand £', ylS: 'House price, k£', xfmt: (v) => fmtInt(v), yfmt: (v) => fmtInt(v), labels: lab, mLabels: 6, trend: true,
        caption: `Each dot is one local authority; named: the five dearest and four cheapest relative to pay, and the three largest areas. Better pay goes with dearer homes (r = ${fmt(corr(pts.map((p) => p.x), pts.map((p) => p.y)), 2)}), but prices rise much faster than pay.` })}
${C.bars(hp.sort((a, b) => b.v - a.v).slice(0, 15).concat([]), { title: 'Most expensive relative to pay: years of median pay for an average home', fmt: (v) => fmt(v, 1) + '×', noMedal: true, tone: () => 'b' })}
${C.bars(hp.sort((a, b) => a.v - b.v).slice(0, 15), { title: 'Most affordable relative to pay', fmt: (v) => fmt(v, 1) + '×', noMedal: true, tone: () => 'g', caption: 'Average house price divided by a year of median weekly pay of people who work in the area. The official ONS price-to-earnings ratio (on the place pages) uses residents’ earnings and median prices, so it differs slightly.' })}
${FOOT('Sources: Office for National Statistics, UK House Price Index and Annual Survey of Hours and Earnings (Open Government Licence v3.0).')}`);
  }

  /* P5 Switzerland: income tax by commune */
  {
    const rows = PL('CH', ['single_income_tax_100k', 'family_income_tax_100k']);
    const pts = rows.map((o) => ({ key: o.id, name: o.name, href: H.PAGES[o.id], x: o.single_income_tax_100k, y: o.family_income_tax_100k }));
    const big = bigPlaces(rows, 8), low = rows.filter((o) => o.pop >= 5000).sort((a, b) => a.single_income_tax_100k - b.single_income_tax_100k).slice(0, 12), high = rows.filter((o) => o.pop >= 5000).sort((a, b) => b.single_income_tax_100k - a.single_income_tax_100k).slice(0, 12);
    const lab = [...big, ...low.slice(0, 3), ...high.slice(0, 2)].map((o) => o.id);
    const gap = high[0].single_income_tax_100k - low[0].single_income_tax_100k;
    inside('CH', 'switzerland-income-tax-by-commune', `Switzerland: income tax in ${fmtInt(rows.length)} communes (2018)`, 'Income tax burden in 2018 for a single person and a single-earner family on CHF 100,000 in every Swiss commune: where taxes were lowest and highest. Historical figures; use the official calculator for today.',
      `<h1>Switzerland: income tax in ${fmtInt(rows.length)} communes, 2018</h1>
<div class="ins-take"><b>Historical figures.</b> These are the Federal Tax Administration's 2018 commune statistics, the latest complete commune-level set Nestlyzer has. Many cantons have changed rates since; for a current amount use the <a href="https://swisstaxcalculator.estv.admin.ch/" rel="noopener">official ESTV tax calculator</a>.</div>
<p class="lede">In Switzerland the commune and the canton set most of the income tax, so moving a few kilometres can change the bill by thousands of francs a year. Here is the 2018 burden on a gross income of CHF 100,000 in every commune, for a single person and for a married single-earner couple with two children.</p>
${C.scatter(pts, { title: 'Tax burden in 2018: single person against family, CHF 100,000 gross income (commune level)', xl: 'Single person, % of gross income', xlS: 'Single, % of income', yl: 'Married single earner, two children, % of gross income', ylS: 'Family, % of income', xfmt: (v) => fmt(v, 0) + '%', yfmt: (v) => fmt(v, 0) + '%', labels: lab, mLabels: 6, good: 'bottom-left',
        caption: `Each dot is a commune (2018); the bottom-left corner is cheap for both households. Between the cheapest and the dearest commune with 5,000+ residents the single person's burden differs by ${fmt(gap, 1)} percentage points, about CHF ${fmtInt(gap * 1000)} a year.` })}
<div class="ins-two"><div><h2>Lowest tax in 2018 (5,000+ residents)</h2>${placeTable(low, [['Commune'], ['Single', (o) => `<b>${fmt(o.single_income_tax_100k, 1)}%</b>`], ['Family', (o) => fmt(o.family_income_tax_100k, 1) + '%']])}</div>
<div><h2>Highest tax in 2018 (5,000+ residents)</h2>${placeTable(high, [['Commune'], ['Single', (o) => `<b>${fmt(o.single_income_tax_100k, 1)}%</b>`], ['Family', (o) => fmt(o.family_income_tax_100k, 1) + '%']])}</div></div>
<p class="ins-note">Cantonal, communal and church tax as a share of gross employment income; direct federal tax is not included. Single employee with own household; married single-earner household with two children. Federal Tax Administration tax burden statistics, tax year 2018.</p>
${FOOT('Source: Swiss Federal Tax Administration (ESTV), tax burden statistics by commune.')}`);
  }

  /* P6 Sweden: municipal tax and income */
  {
    const rows = PL('SE', ['n_municipal_income_tax', 'n_income_net_se']);
    const pts = rows.map((o) => ({ key: o.id, name: o.name, href: H.PAGES[o.id], x: o.n_municipal_income_tax, y: o.n_income_net_se / 1000 }));
    const best = rows.slice().sort((a, b) => (b.n_income_net_se / 1000 - b.n_municipal_income_tax * 8) - (a.n_income_net_se / 1000 - a.n_municipal_income_tax * 8));
    const lab = [...bigPlaces(rows, 5), ...best.slice(0, 4), ...rows.slice().sort((a, b) => b.n_municipal_income_tax - a.n_municipal_income_tax).slice(0, 2)].map((o) => o.id);
    inside('SE', 'sweden-tax-and-income', `Sweden: municipal tax and income in ${rows.length} municipalities`, 'Municipal income tax rates against median net income in every Swedish municipality: where people earn more and pay less.',
      `<h1>Sweden: municipal tax and income in ${rows.length} municipalities</h1>
<p class="lede">Swedes pay most of their income tax to the municipality and the region, at rates that differ by several points. The richest municipalities often tax least, a double advantage for residents.</p>
${C.scatter(pts, { title: 'Median net income against the municipal income tax rate', xl: 'Municipal and regional income tax, %', xlS: 'Local income tax, %', yl: 'Median net income per adult, thousand SEK a year', ylS: 'Net income, k SEK', xfmt: (v) => fmt(v, 1) + '%', yfmt: (v) => fmtInt(v), good: 'top-left', labels: lab, mLabels: 6,
        caption: `Top left: higher incomes and lower tax. Income and tax are ${strength(corr(pts.map((p) => p.x), pts.map((p) => p.y))).replace(/^a /, '')} related in reverse (r = ${fmt(corr(pts.map((p) => p.x), pts.map((p) => p.y)), 2)}): wealthy suburbs can afford lower rates.` })}
${C.bars(rows.slice().sort((a, b) => a.n_municipal_income_tax - b.n_municipal_income_tax).slice(0, 15).map((o) => ({ label: plink(o), v: o.n_municipal_income_tax })), { title: 'Lowest local income tax', fmt: (v) => fmt(v, 2) + '%', tone: () => 'g' })}
${FOOT('Sources: Statistics Sweden (SCB) via Kolada (median net income); municipal and regional tax rates 2026.')}`);
  }

  /* P7 Spain: income and inequality */
  {
    const rows = PL('ES', ['n_income_net_person', 'n_income_gini']);
    const pts = rows.map((o) => ({ x: o.n_income_net_person / 1000, y: o.n_income_gini, name: o.name }));
    const hl = bigPlaces(rows, 12).map((o) => ({ x: o.n_income_net_person / 1000, y: o.n_income_gini, name: o.name, href: H.PAGES[o.id] }));
    const towns = rows.filter((o) => o.pop >= 20000), rich = towns.slice().sort((a, b) => b.n_income_net_person - a.n_income_net_person).slice(0, 12), equal = towns.slice().sort((a, b) => a.n_income_gini - b.n_income_gini).slice(0, 12);
    inside('ES', 'spain-income-and-inequality', `Spain: income and inequality in ${fmtInt(rows.length)} municipalities`, 'Average net income against income inequality for Spanish municipalities from the official INE income atlas: the richest and the most equal towns.',
      `<h1>Spain: income and inequality in ${fmtInt(rows.length)} municipalities</h1>
<p class="lede">Spain's statistics office maps income down to every municipality. Two questions matter for a mover: how well off is a place, and how evenly is its income shared? Rich suburbs and poor villages are both found at the unequal end.</p>
${C.density(pts, { title: 'Income inequality against average net income per person', xl: 'Average net income per person, thousand € a year', xlS: 'Net income, k€', yl: 'Income inequality (Gini, 0–100)', ylS: 'Gini', xfmt: (v) => fmt(v), yfmt: (v) => fmt(v), highlights: hl, mLabels: 6,
        caption: 'Darker cells hold more municipalities; the orange line follows the typical inequality at each income level. Named dots: the 12 largest cities, which are both richer and more unequal than most villages.' })}
<div class="ins-two"><div><h2>Highest incomes (20,000+)</h2>${placeTable(rich, [['Municipality'], ['€ per person', (o) => `<b>${fmtInt(o.n_income_net_person)}</b>`], ['Gini', (o) => fmt(o.n_income_gini, 1)]])}</div>
<div><h2>Most equal (20,000+)</h2>${placeTable(equal, [['Municipality'], ['Gini', (o) => `<b>${fmt(o.n_income_gini, 1)}</b>`], ['€ per person', (o) => fmtInt(o.n_income_net_person)]])}</div></div>
${FOOT('Source: Instituto Nacional de Estadística (INE), Atlas de distribución de renta de los hogares 2023.')}`);
  }

  /* P8 Germany: rents and property tax */
  {
    const rows = PL('DE', ['n_rent_net_m2_local', 'n_grundsteuer_b']);
    const pts = rows.map((o) => ({ x: o.n_grundsteuer_b, y: o.n_rent_net_m2_local, name: o.name }));
    const hl = bigPlaces(rows, 12).map((o) => ({ x: o.n_grundsteuer_b, y: o.n_rent_net_m2_local, name: o.name, href: H.PAGES[o.id] }));
    const towns = rows.filter((o) => o.pop >= 50000), dear = towns.slice().sort((a, b) => b.n_rent_net_m2_local - a.n_rent_net_m2_local).slice(0, 12), cheap = towns.slice().sort((a, b) => a.n_rent_net_m2_local - b.n_rent_net_m2_local).slice(0, 12);
    inside('DE', 'germany-rents-and-property-tax', `Germany: rents (census 2022) and property tax in ${fmtInt(rows.length)} municipalities`, 'Net rents from the 2022 census against the property tax multiplier for German municipalities: the dearest and cheapest larger towns to rent in.',
      `<h1>Germany: rents (census 2022) and property tax (2024) in ${fmtInt(rows.length)} municipalities</h1>
<p class="lede">The 2022 census counted rents for every flat in Germany. Next to it, the municipal property tax multiplier, which landlords pass on to tenants through service charges. Both vary widely: from small towns in the east to Munich.</p>
${C.density(pts, { title: 'Net rent per m² (census, May 2022) against the property tax multiplier (end of 2024), municipality level', xl: 'Property tax multiplier (Grundsteuer B), %', xlS: 'Grundsteuer B, %', yl: 'Average net rent, € per m² a month', ylS: 'Net rent, €/m²', xfmt: (v) => fmtInt(v), yfmt: (v) => fmt(v, 1), highlights: hl, mLabels: 6,
        caption: 'Darker cells hold more municipalities. High multipliers are common in cities and in financially weak municipalities alike, so the link to rents is loose. Named dots: the 12 largest cities.' })}
<div class="ins-two"><div><h2>Highest rents (50,000+ residents)</h2>${placeTable(dear, [['Municipality'], ['€/m²', (o) => `<b>${fmt(o.n_rent_net_m2_local, 2)}</b>`], ['Grundsteuer B', (o) => fmtInt(o.n_grundsteuer_b) + '%']])}</div>
<div><h2>Lowest rents (50,000+ residents)</h2>${placeTable(cheap, [['Municipality'], ['€/m²', (o) => `<b>${fmt(o.n_rent_net_m2_local, 2)}</b>`], ['Grundsteuer B', (o) => fmtInt(o.n_grundsteuer_b) + '%']])}</div></div>
<p class="ins-note">Net cold rent of all rented flats on census day (15 May 2022), estimated for each municipality from the census grid; new leases cost more. Multipliers as of 31 December 2024, before the property tax reform took effect.</p>
${FOOT('Sources: Statistisches Bundesamt (Destatis), Zensus 2022 (dl-de/by-2-0); Statistische Ämter des Bundes und der Länder, Regionaldatenbank.')}`);
  }

  /* =================================================================== FOR COMPANIES */
  const climate = (cc, mix) => { let n = 0, d = 0; for (const k of B.keys) { const v = BC(cc, k); if (fin(v) && mix[k]) { n += mix[k] * v; d += mix[k]; } } return d ? n / d : null; };
  const mixD = B.default;
  const league = CC.map((cc) => ({ cc, s: climate(cc, mixD) })).filter((r) => fin(r.s)).sort((a, b) => b.s - a.s);
  {
    const kl = B.keys.map((k) => { const s = CC.filter((cc) => fin(BC(cc, k))).sort((a, b) => BC(b, k) - BC(a, k)); return `${nm(s[0])} on ${B.short[k].toLowerCase()}`; });
    const rows = league.map((r, i) => [`${medal(i) || `<small>${i + 1}.</small>`} ${cl(r.cc)}`, `<b>${fmt(r.s)}</b>`, ...B.keys.map((k) => cell(BC(r.cc, k), (B.countries[r.cc].ranks || {})[k]))]);
    const body = `${kick('business')}${printBtn}<h1>Business climate: ${league.length} countries compared</h1>
<p class="lede">Where would a company rather set up: in a country with quick permits, firm courts, moderate taxes, cheap credit and power, and an economy that is picking up speed? We scored all ${league.length} Nestlyzer countries on exactly those six things.</p>
<div class="ins-take"><b>The short version.</b> ${esc(list(league.slice(0, 3).map((r) => nm(r.cc))))} lead the table; ${esc(list(league.slice(-3).map((r) => nm(r.cc))))} close it. No country tops every column: ${esc(kl.slice(0, 4).join(', '))}.</div>
${C.bars(league.map((r) => ({ label: cl(r.cc), v: r.s })), { title: 'Overall business climate (0–100), best first', fmt: (v) => fmt(v), tone: (v) => v >= 65 ? 'g' : v < 45 ? 'b' : '' })}
<h2>All six drivers, country by country</h2>
${C.league(['Country', 'Climate', ...B.keys.map((k) => esc(B.short[k]))], rows)}
<p class="ins-note">Climate = ${B.keys.map((k) => `${B.short[k].toLowerCase()} ${mixD[k]}%`).join(', ')}. Each kind of company site weighs them its own way; the site pages and the app use that mix. A missing driver counts as the median country.</p>
<h2>What sits behind each column</h2><ul>${B.keys.map((k) => `<li><b>${esc(B.labels[k])}</b>: ${esc((B.parts[k] || []).map(([m]) => (B.measures[m] || {}).label || m).join('; '))}.</li>`).join('')}</ul>
${FOOT('Sources: World Bank B-READY 2025, Doing Business 2020 series, World Development Indicators (CC BY 4.0); Transparency International CPI; V-Dem v16; Eurostat; national tax authorities.')}`;
    pageIns('/insights/business-climate/', 'Business climate: ' + league.length + ' countries compared', `Which countries make it easiest to do business? ${league.length} countries scored on red tape, rule of law, taxes, cost of capital, energy prices and growth momentum.`, body, 'business', ld('Business climate ranking', league.map((r) => r.cc)));
  }
  {
    const pts = CC.map((cc) => ({ key: cc, name: nm(cc), href: cpath(cc), x: sc(BV(cc, 'wage_level'), 1 / 1000), y: BV(cc, 'tertiary') })).filter((p) => fin(p.x) && fin(p.y) && p.y < 160);
    const mx = median(pts.map((p) => p.x)), my = median(pts.map((p) => p.y));
    const sweet = pts.filter((p) => p.x < mx && p.y > my).sort((a, b) => (b.y / my - b.x / mx) - (a.y / my - a.x / mx)), pricey = pts.filter((p) => p.x > mx && p.y < my);
    const r = corr(pts.map((p) => p.x), pts.map((p) => p.y));
    pageIns('/insights/labour-cost-vs-talent/', 'Labour cost against talent: where skills come cheap', 'Which countries combine low labour costs with a large pool of students and graduates? A scatter of all Nestlyzer countries with the sweet spot marked.',
      `${kick('business')}${printBtn}<h1>Labour cost against talent</h1><p class="lede">The old trade-off for any plant or office: cheap labour or a deep pool of graduates. Measured with two proxies (income per person for labour cost, enrolment for skills), most countries make you choose; a few don't.</p>
${C.scatter(pts, { title: 'Income per person (labour-cost proxy) against tertiary enrolment', xl: 'Income per person at market prices, thousand US$ (labour-cost proxy)', xlS: 'Labour-cost proxy, k US$', yl: 'Tertiary enrolment, % gross', ylS: 'Tertiary enrolment, %', xfmt: (v) => fmt(v), yfmt: (v) => fmt(v) + '%', good: 'top-left', labels: [...sweet.slice(0, 5), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 3), ...pricey.slice(0, 2)].map((p) => p.key),
        caption: `Dashed lines mark the median country; the shaded corner is the sweet spot. ${r >= 0.5 ? `The two move together (r = ${fmt(r, 2)}), so bargains are rare.` : `The link is loose (r = ${fmt(r, 2)}): plenty of countries educate many people at moderate cost.`}` })}
<div class="ins-take"><b>The sweet spot.</b> ${sweet.length ? `${esc(list(sweet.slice(0, 6).map((p) => p.name)))} combine below-median income per person (the labour-cost proxy) with above-median enrolment.` : 'No country combines both.'} ${pricey.length ? `${esc(list(pricey.slice(0, 3).map((p) => p.name)))} are above median in cost and below in enrolment.` : ''}</div>
<p>Enrolment counts students, not graduates; gross rates above 100% happen where many older or foreign students enrol. Income per person at market prices is a proxy for wage levels across countries, not the pay for one job; the place pages show occupation pay where statistics offices publish it.</p>
${FOOT('Sources: World Bank WDI (CC BY 4.0): GNI per capita PPP, price level, tertiary enrolment.')}`, 'business');
  }
  {
    const pts = CC.map((cc) => ({ key: cc, name: nm(cc), href: cpath(cc), x: BV(cc, 'cit_rate'), y: BC(cc, 'rule_of_law') })).filter((p) => fin(p.x) && fin(p.y));
    const mx = median(pts.map((p) => p.x)), my = median(pts.map((p) => p.y));
    const good = pts.filter((p) => p.x <= mx && p.y >= my).sort((a, b) => b.y - a.y), poor = pts.filter((p) => p.x > mx && p.y < my);
    pageIns('/insights/tax-vs-rule-of-law/', 'Corporate tax against rule of law: the favourable corner', 'Which countries combine moderate corporate tax with strong legal certainty? Headline tax rates and a rule-of-law score for every Nestlyzer country.',
      `${kick('business')}${printBtn}<h1>Taxes against the rule of law</h1><p class="lede">A low tax rate is worth little if contracts are hard to enforce. This chart puts the headline corporate tax rate next to how firmly the law holds.</p>
${C.scatter(pts, { title: 'Corporate tax rate against rule of law', xl: 'Corporate income tax rate (headline), %', xlS: 'Corporate tax, %', yl: 'Rule of law and legal certainty (0–100)', ylS: 'Rule of law', xfmt: (v) => fmt(v) + '%', yfmt: (v) => fmt(v), good: 'top-left', labels: [...good.slice(0, 6), ...poor.slice(0, 3), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 2)].map((p) => p.key),
        caption: 'Top left is where companies want to be: moderate tax and strong courts. Rule of law combines V-Dem’s liberal component, Transparency International’s corruption score, legal rights and B-READY dispute resolution.' })}
<div class="ins-take"><b>Low tax, firm law.</b> ${esc(list(good.slice(0, 6).map((p) => p.name)))} sit in the favourable corner.${poor.length ? ' ' + esc(list(poor.slice(0, 3).map((p) => p.name))) + ' combine above-median tax with below-median legal certainty.' : ''}</div>
<p>Headline rates are only the start: deductions, local business taxes and incentives move the effective burden a lot, which is why the climate score also uses the total tax rate on profits.</p>
${FOOT('Sources: national tax authorities and OECD (headline corporate rates 2026), V-Dem v16, Transparency International CPI, World Bank.')}`, 'business');
  }
  {
    const rows = CC.map((cc) => { const g = (B.countries[cc].growth || []).filter(([y]) => y >= 2015), base = g.filter(([y]) => y <= 2019).map((x) => x[1]), last = g.slice(-3).map((x) => x[1]); return base.length >= 3 && last.length === 3 && g[g.length - 1][0] >= 2023 ? { cc, a: base.reduce((s, v) => s + v, 0) / base.length, b: last.reduce((s, v) => s + v, 0) / 3, y: g[g.length - 1][0] } : null; }).filter(Boolean).sort((p, q) => (q.b - q.a) - (p.b - p.a));
    const ym = median(rows.map((r) => r.y));
    const up = rows.filter((r) => r.b - r.a > 0.5), down = rows.filter((r) => r.b - r.a < -0.5).reverse();
    pageIns('/insights/growth-momentum/', 'Growth momentum: who speeds up, who loses pace', 'Real GDP growth before 2020 against the last three years for every Nestlyzer country: who gained momentum after the energy shock and who lost it.',
      `${kick('business')}${printBtn}<h1>Growth momentum: who is speeding up, who is losing pace</h1><p class="lede">The energy shock of 2022, the war in Ukraine and higher interest rates hit economies very unevenly. Each row runs from a country's average real growth in 2015–2019 to its average over the last three years.</p>
${C.arrows(rows.map((r) => ({ label: cl(r.cc) + (r.y !== ym ? ` <small class="muted">to ${r.y}</small>` : ''), a: r.a, b: r.b })), { title: `Real GDP growth, % a year: average 2015–2019 against average ${ym - 2}–${ym}`, fmt: (v) => fmt(v, 1) + '%', better: 1, zero: true, aLabel: 'average 2015–2019', bLabel: 'average of the last three years', caption: `Sorted from the biggest acceleration to the biggest slowdown; the thin vertical line marks zero growth. ${ym} is the latest year the World Bank has published (its national accounts lag by about half a year); countries whose latest figure is older say so, and Liechtenstein, whose last World Bank figure is from 2009, is left out.` })}
<div class="ins-take"><b>Gaining pace:</b> ${esc(list(up.slice(0, 5).map((r) => `${nm(r.cc)} (${fmt(r.a, 1)}% → ${fmt(r.b, 1)}%)`)))}. <b>Losing it:</b> ${esc(list(down.slice(0, 5).map((r) => `${nm(r.cc)} (${fmt(r.a, 1)}% → ${fmt(r.b, 1)}%)`)))}.</div>
${FOOT('Source: World Bank WDI, real GDP growth (NY.GDP.MKTP.KD.ZG), CC BY 4.0.')}`, 'business');
  }
  {
    const rows = CC.map((cc) => ({ cc, v: BV(cc, 'startup_days') })).filter((r) => fin(r.v)).sort((a, b) => a.v - b.v);
    const br = CC.map((cc) => ({ cc, v: BV(cc, 'bready_regulatory') })).filter((r) => fin(r.v)).sort((a, b) => b.v - a.v);
    pageIns('/insights/red-tape/', 'Red tape: days to start a business in ' + rows.length + ' countries', 'How quickly can you register a company? Days to start a business and the B-READY regulatory score for every Nestlyzer country.',
      `${kick('business')}${printBtn}<h1>Red tape: how long it took to open a business (2019) and the newer B-READY score (2025)</h1><p class="lede">Speed is the most honest test of bureaucracy: the number of days it takes to register a new company, from the fastest country to the slowest, and the World Bank's newer score of regulatory quality.</p>
${C.bars(rows.map((r) => ({ label: cl(r.cc), v: r.v })), { title: 'Days to start a business, 2019 data (fastest first)', fmt: (v) => fmt(v, v < 10 ? 1 : 0) + ' days', tone: (v) => v <= 5 ? 'g' : v > 20 ? 'b' : '', caption: 'World Bank Doing Business, last edition (2019 data); the series was discontinued. Historical figures: many countries have simplified registration since.' })}
${br.length ? C.bars(br.map((r) => ({ label: cl(r.cc), v: r.v })), { title: `B-READY regulatory framework score, ${br.length} countries (best first)`, fmt: (v) => fmt(v) + ' / 100' }) : ''}
${FOOT('Sources: World Bank Doing Business (IC.REG.DURS) and B-READY 2025.')}`, 'business');
  }
  {
    const rows = CC.map((cc) => ({ cc, v: BV(cc, 'power_price_business') })).filter((r) => fin(r.v)).sort((a, b) => a.v - b.v);
    if (rows.length >= 5) { const lo = rows[0], hi = rows[rows.length - 1];
      pageIns('/insights/energy-prices/', 'Electricity prices for business across Europe', 'What do companies pay for electricity? Business power prices across European countries with the cheapest and the most expensive marked.',
        `${kick('business')}${printBtn}<h1>Electricity prices for business</h1><p class="lede">For a data centre, a chemicals plant or a battery factory, power is the bill that decides the business case. These are the prices medium-sized industrial users pay, non-recoverable taxes included.</p>
${C.bars(rows.map((r) => ({ label: cl(r.cc), v: r.v })), { title: 'Business electricity price, € per kWh (cheapest first)', fmt: (v) => fmt(v, 3), tone: (v) => v < 0.12 ? 'g' : v > 0.2 ? 'b' : '', caption: `Eurostat, band 500–1,999 MWh a year, latest half-year. Median ${fmt(median(rows.map((r) => r.v)), 3)} €/kWh.` })}
<div class="ins-take"><b>A ${fmt(hi.v / lo.v, 1)}× gap.</b> A firm in ${esc(nm(hi.cc))} pays ${fmt(hi.v, 3)} €/kWh, one in ${esc(nm(lo.cc))} ${fmt(lo.v, 3)}. For 1 GWh a year that is about €${fmtInt((hi.v - lo.v) * 1e6)}.</div>
${FOOT('Source: Eurostat nrg_pc_205.')}`, 'business'); }
  }
  {
    const rows = CC.map((cc) => ({ cc, v: BV(cc, 'real_interest') })).filter((r) => fin(r.v)).sort((a, b) => a.v - b.v);
    pageIns('/insights/cost-of-capital/', 'Cost of capital: real interest rates compared', 'What does borrowing really cost a company? Real interest rates for the Nestlyzer countries that report them.',
      `${kick('business')}${printBtn}<h1>The cost of capital: real interest rates</h1><p class="lede">The real interest rate, the lending rate minus inflation, shows what credit really costs a company.</p>
${C.bars(rows.map((r) => ({ label: cl(r.cc), v: r.v })), { title: 'Real interest rate, % (cheapest credit first)', fmt: (v) => fmt(v, 1) + '%', tone: (v) => v < 2 ? 'g' : v > 6 ? 'b' : '', caption: 'World Bank WDI (FR.INR.RINR). Euro-area countries report no national lending rate to the World Bank and are not shown.' })}
${FOOT('Source: World Bank WDI (CC BY 4.0).')}`, 'business');
  }

  /* podiums: best places to live / best business sites */
  const scopes = [['world', 'World'], ['europe', 'Europe'], ['americas', 'Americas'], ['asia_pacific', 'Asia-Pacific']];
  const podium = (keys, pathOf) => keys.map((k) => `<section class="ins-fig"><figcaption class="ins-ft"><a href="${pathOf(k)}">${esc(PROF[k].name)}</a></figcaption><div class="ins-pod">${scopes.map(([s, t]) => { const L = ((RK[s] || {}).profiles || {})[k], top = L && L.top ? L.top.slice(0, 3) : []; return top.length ? `<div><b>${t}</b><ol>${top.map((x, i) => `<li>${medal(i)} ${flagImg(x[0].split(':')[0], 11)} ${H.PAGES[x[0]] ? `<a href="${H.PAGES[x[0]]}">${esc(x[1])}</a>` : esc(x[1])} <span class="muted small">${fmt(x[2], 1)}</span></li>`).join('')}</ol></div>` : ''; }).join('')}</div></section>`).join('');
  const HH = (META.config.order || []).filter((k) => PROF[k] && ((RK.world || {}).profiles || {})[k]);
  pageIns('/insights/best-places-to-live/', 'The best places to live, by kind of household', `World and continental leaders for ${HH.length} household profiles, from young families to retirees and remote workers, with crowns and medals.`,
    `${kick('living')}${printBtn}<h1>The best places to live, by kind of household</h1><p class="lede">For every household profile, the world's top three places and each continent's. A young family, a retired couple and a remote worker want very different things, so the podiums barely overlap.</p>${podium(HH, H.profilePath)}${FOOT('Scores 0–100 against all places worldwide; the place pages explain every score.')}`, 'living');
  pageIns('/insights/best-business-locations/', 'The best business locations by kind of site', `World and continental leaders for ${BIZ.length} kinds of company site, from logistics hubs to research labs, with crowns and medals.`,
    `${kick('business')}${printBtn}<h1>The best business locations, by kind of site</h1><p class="lede">One leaderboard per kind of company site: the world's top three and each continent's. Scores combine the place's own strengths with its country's business climate.</p>${podium(BIZ, H.bizPath)}${FOOT('Scores 0–100; method on the method page.')}`, 'business');

  /* ten years of change: both audiences */
  {
    const PICK = [['life_exp', 'Life expectancy at birth, change in years', (v) => sgn(v, 1, ' yrs'), 'living'], ['unemployment', 'Unemployment rate, change in percentage points', (v) => sgn(v, 1, ' pts'), 'living'], ['pm25', 'Fine-particle air pollution, change in µg/m³', (v) => sgn(v, 1), 'living'], ['gdp_pc_ppp', 'GDP per person at purchasing power, change in %', (v) => sgn(v, 0, '%'), 'business'], ['rnd', 'Research and development spending, change in points of GDP', (v) => sgn(v, 2, ' pts'), 'business']];
    const secs = PICK.map(([id, title, f]) => {
      const rows = CC.map((cc) => { const x = SER(cc, id); return x && fin(x.change['10']) ? { cc, v: x.change['10'], better: x.better } : null; }).filter(Boolean);
      if (rows.length < 8) return '';
      const b = rows[0].better; rows.sort((p, q) => b < 0 ? p.v - q.v : q.v - p.v);
      return `<h2>${esc(title.split(',')[0])}</h2><div class="ins-take"><b>Most improved:</b> ${esc(list(rows.slice(0, 3).map((r) => `${nm(r.cc)} (${f(r.v)})`)))}. <b>Least:</b> ${esc(list(rows.slice(-3).reverse().map((r) => `${nm(r.cc)} (${f(r.v)})`)))}.</div>${C.bars(rows.map((r) => ({ label: cl(r.cc), v: r.v })), { title, fmt: f, tone: (v) => (v > 0) === (b > 0) ? 'g' : 'b', caption: `Latest year against exactly ten years earlier; ${rows.length} countries with both years published.` })}`;
    }).join('');
    pageIns('/insights/ten-years-of-change/', 'Ten years of change: who improved most', 'Life expectancy, unemployment, air quality, income and research spending: how every Nestlyzer country changed over exactly ten years, from the biggest gain to the biggest setback.',
      `${kick('living')}${printBtn}<h1>Ten years of change: who improved most</h1><p class="lede">Levels say where a country stands; ten-year changes say where it is heading. Each chart compares the latest published year with exactly ten years earlier, from the same World Bank series. Green bars: better, red: worse.</p>${secs}${FOOT('Source: World Bank WDI (CC BY 4.0).')}`, 'living');
  }

  /* =================================================================== ONE PAGE PER COUNTRY */
  for (const cc of CC) {
    const li = lifeLeague.findIndex((r) => r.cc === cc), bi = league.findIndex((r) => r.cc === cc), ls = lifeScore(cc), bs = climate(cc, mixD), Cb = B.countries[cc];
    const lrows = LK.map((k) => ({ k, v: NC(cc, k), rk: lifeRank(cc, k) })).filter((d) => fin(d.v)).sort((a, b) => b.v - a.v);
    const brows = B.keys.map((k) => ({ k, v: BC(cc, k), rk: (Cb.ranks || {})[k], n: (Cb.n || {})[k] })).filter((d) => fin(d.v)).sort((a, b) => b.v - a.v);
    const peers = lifeLeague.map((r) => ({ cc: r.cc, d: Math.sqrt(LK.reduce((s, k) => s + (fin(NC(cc, k)) && fin(NC(r.cc, k)) ? (NC(cc, k) - NC(r.cc, k)) ** 2 : 0), 0)) })).filter((r) => r.cc !== cc).sort((a, b) => a.d - b.d).slice(0, 5);
    const HS = ['life_exp', 'unemployment', 'inflation', 'gdp_pc_ppp', 'pm25', 'age65', 'population', 'renewable_power', 'homicide', 'tertiary'].map((id) => SER(cc, id)).filter(Boolean);
    const hist = HS.length ? C.multiples(HS.map((s) => { const c = s.change['10'], good = !fin(c) || s.better === 0 ? '' : (c > 0) === (s.better > 0) ? 'g' : 'b'; return { label: esc(s.label), y: s.y, tone: good, note: fin(c) ? (s.kind === 'pct' ? sgn(c, 0, '%') : sgn(c, Math.abs(c) < 10 ? 1 : 0)) + ' in 10 yrs' : '' }; }), { title: `${nm(cc)} since 2010`, fmt: (v) => fmt(v, Math.abs(v) < 10 ? 1 : 0), caption: 'Each panel has its own scale. Green: better than ten years ago, red: worse, grey: neither or no ten-year comparison. Source: World Bank WDI (CC BY 4.0).' }) : `<p class="ins-note">${esc((HD[cc] || {}).note || 'No national history is published for this economy.')}</p>`;
    const body = `${kick('')}${printBtn}<h1>${flagImg(cc, 22)} ${esc(nm(cc))} in numbers</h1>
<p class="lede">${fin(ls) ? `For households, ${esc(nm(cc))} ranks <b>${medal(li)} #${li + 1} of ${lifeLeague.length}</b> on quality of life` : `${esc(nm(cc))} has too few comparable household figures for the quality-of-life ranking`}${fin(bs) ? `; for companies <b>${medal(bi)} #${bi + 1} of ${league.length}</b> on business climate` : ''}. ${lrows.length ? `Its strongest suit for residents is ${esc(LIVE[lrows[0].k].toLowerCase())}, the weakest ${esc(LIVE[lrows[lrows.length - 1].k].toLowerCase())}.` : ''}</p>
<h2 id="living">Living here</h2>
${lrows.length ? C.bars(lrows.map((d) => ({ label: esc(LIVE[d.k]), v: d.v, note: `#${d.rk[0]} of ${d.rk[1]}` })), { title: 'Quality-of-life scores (0–100)', fmt: (v) => fmt(v), noMedal: true, tone: (v) => v >= 70 ? 'g' : v < 40 ? 'b' : '' }) : ''}
${hist}
<h2 id="business">Doing business here</h2>
${brows.length ? C.bars(brows.map((d) => ({ label: esc(B.labels[d.k]), v: d.v, note: d.rk ? `#${d.rk} of ${d.n}` : '' })), { title: 'Business-climate drivers (0–100)', fmt: (v) => fmt(v), noMedal: true, tone: (v) => v >= 70 ? 'g' : v < 40 ? 'b' : '' }) : ''}
<h2>Countries most like ${esc(nm(cc))}</h2><p>${peers.map((p) => cl(p.cc)).join(' · ')}</p>
<div class="cta-band"><h2>Find the best places in ${esc(nm(cc))}</h2><a class="btn" href="${appLink({ cc, p: 'young_family' })}">For households</a> <a class="btn" href="${appLink({ cc, p: 'biz_manufacturing' })}">For companies</a></div>
${FOOT('Sources: World Bank WDI and B-READY, Transparency International, V-Dem, Eurostat, national tax authorities.')}`;
    pageIns(cpath(cc), `${nm(cc)} in numbers: living, business and trends`, `How does ${nm(cc)} compare? Quality of life and business climate ranked against ${league.length} countries, with trends since 2010 for health, jobs, prices and air.`, body, 'country');
  }

  /* =================================================================== HUB */
  {
    const cards = (sec) => OUT.filter((o) => o.sec === sec).map((o) => `<a class="ins-card" href="${o.p}"><b>${esc(o.title.split(':')[0])}</b><span>${esc(o.desc)}</span></a>`).join('');
    const pod = (rows, t) => `<div><b>${t}</b><ol>${rows.slice(0, 3).map((r, i) => `<li>${medal(i)} ${cl(r.cc)} <span class="muted small">${fmt(r.s)}</span></li>`).join('')}</ol></div>`;
    const body = `<h1>Insights: places in numbers</h1><p class="lede">Charts, rankings and trends for anyone choosing where to live, invest or build: ${CC.length} countries compared on what matters to households and to companies, and big-data views inside the countries, built from official statistics. Every chart explains itself, works on a phone and prints as a clean PDF.</p>
<div class="ins-pod">${pod(lifeLeague, 'Quality of life')}${pod(league, 'Business climate')}</div>
<h2 id="living">For households</h2><div class="ins-grid2">${cards('living')}</div>
<h2 id="inside">Inside the countries</h2><p>Every municipality at once: rents, incomes, taxes and health for tens of thousands of places.</p><div class="ins-grid2">${cards('inside')}</div>
<h2 id="business">For companies</h2><div class="ins-grid2">${cards('business')}</div>
<h2>Country by country</h2><p>${lifeLeague.concat(CC.filter((cc) => !lifeLeague.some((r) => r.cc === cc)).map((cc) => ({ cc }))).map((r) => cl(r.cc)).join(' · ')}</p>
${FOOT('')}`;
    pageIns('/insights/', 'Insights: places in numbers', `Rankings, charts and trends on quality of life and business climate in ${CC.length} countries, plus municipality-level views of rents, incomes and taxes.`, body, 'hub');
  }
  return { n: OUT.length, lifeTop: lifeLeague.slice(0, 3).map((r) => r.cc), bizTop: league.slice(0, 3).map((r) => r.cc), living: OUT.filter((o) => o.sec === 'living' || o.sec === 'inside').map((o) => [o.p, o.title.split(':')[0]]), business: OUT.filter((o) => o.sec === 'business').map((o) => [o.p, o.title.split(':')[0]]) };
}
