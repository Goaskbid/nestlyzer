/* Nestlyzer Insights (2.13.1): analyses for households and for companies, as static pages built from the data the app
   already uses (open licences, sources named on every page). Charts come from insights_charts.mjs: wide and phone
   versions, HTML bars and small multiples, so nothing is cut off on a phone. Every chart is explained in sentences
   computed from the data it shows. Called from build_site.mjs with its page() and helpers. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { charts } from './insights_charts.mjs';
import { buildRecords } from './records.mjs';
import { buildStories } from './stories.mjs';
import { buildChange } from './insights_change.mjs';
import { buildLinks } from './insights_links.mjs';

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
.ins-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);gap:14px;margin:16px 0}@media(max-width:760px){.ins-top{grid-template-columns:1fr}}.ins-today{border:1px solid var(--line);border-radius:16px;padding:16px 18px;background:var(--surface);align-self:start}.ins-today-fig{margin-top:12px;border-top:1px solid var(--line);padding-top:10px}.ins-today-fig svg{width:100%;max-width:420px;height:auto;display:block;margin:0 auto;pointer-events:none}.ins-today-fig .ins-fig{margin:0;border:0;padding:0;box-shadow:none;background:none;pointer-events:none}.ins-today-fig .ins-fig li svg{width:1em;height:1em;max-width:none;display:inline;margin:0}.ins-today small{display:block;font-weight:700;color:var(--amber,#E89B16);margin-bottom:6px}.ins-today a{display:flex;flex-direction:column;gap:4px;text-decoration:none;color:var(--ink)}.ins-today b{font-size:1.15rem}.ins-today span{color:var(--ink-2);font-size:.95rem}.ins-dec{border-radius:16px;padding:16px 18px;background:linear-gradient(120deg,#0b2e5c,#1e6fd9);color:#fff}.ins-dec h2{margin:0 0 6px;font-size:1.25rem}.ins-dec h2 a{color:#fff;text-decoration:none}.ins-dec p{margin:0 0 10px;color:rgba(255,255,255,.88)}.ins-dec-l{display:flex;flex-wrap:wrap;gap:6px}.ins-dec-l a{padding:5px 11px;border-radius:999px;background:rgba(255,255,255,.14);color:#fff;text-decoration:none;font-size:.9rem;font-weight:600}.ins-dec-l a:hover{background:rgba(255,255,255,.28)}.ins-essay{max-width:68ch;margin:22px 0}main.page>h2+p:not(.small),main.page>p.lede{max-width:68ch}.ins-essay p{font-size:1.06rem;line-height:1.7;margin:0 0 14px;color:var(--ink)}.ins-essay p.first::first-letter{float:left;font:700 3.1em/.9 var(--font-display,inherit);margin:4px 8px 0 0;color:var(--navy)}.ins-follow{font-size:.92rem;color:var(--ink-2)}.ins-series{margin:0;font-size:.9rem;font-weight:600}.ins-themes small{opacity:.65;font-weight:600;margin-left:2px}.ins-rec{display:flex;flex-direction:column;gap:6px;margin:16px 0;padding:18px 20px;border-radius:16px;text-decoration:none;color:#fff;background:linear-gradient(120deg,#1b4565,#2a7d78)}.ins-rec b{font-size:21px;line-height:1.25}.ins-rec span{font-size:15px;line-height:1.5;opacity:.92}.ins-rec em{font-style:normal;font-weight:700;font-size:14px;text-decoration:underline}.ins-rec:hover{filter:brightness(1.08)}
.ins-take{border-left:4px solid #2a9c96;padding:10px 14px;margin:14px 0;background:rgba(42,156,150,.07);border-radius:0 12px 12px 0;line-height:1.55}
.ins-grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin:14px 0}.ins-card{display:flex;flex-direction:column;gap:4px;border:1px solid var(--line,#dde3e8);border-radius:14px;padding:14px 16px;text-decoration:none;color:inherit;background:var(--surface,#fff)}
.ins-card:hover{border-color:#2a9c96}.ins-card b{font-size:16.5px;line-height:1.3}.ins-card span{font-size:14px;color:var(--ink-3);line-height:1.45}.ins-card em{font-style:normal;font-size:12px;font-weight:700;color:#2a7d78}
.ins-pod{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin:10px 0}.ins-pod>div{border:1px solid var(--line);border-radius:12px;padding:10px 12px}.ins-pod ol{list-style:none;margin:4px 0 0;padding:0}.ins-pod li{padding:2px 0;font-size:14px}
.ins-print{float:right;margin-left:10px}.ins-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media (max-width:860px){.ins-two{grid-template-columns:1fr}}
.page h1{overflow-wrap:anywhere}.ins-note{font-size:13.5px;color:var(--ink-3);line-height:1.5}
@media print{.site-header,.site-footer,.ins-print,.cta-band,.consent,.crumbs,.ins-kick{display:none!important}.ins-fig{break-inside:avoid;border:0}.v-m{display:none!important}.v-d{display:block!important}body{background:#fff}}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 4px}.chips a{display:inline-flex;padding:5px 12px;border:1px solid var(--line);border-radius:999px;background:var(--surface);text-decoration:none;font-weight:600;font-size:.9rem}.chips a:hover{border-color:currentColor}</style>`;
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
<p class="lede">Ask ten people what makes a good life and you get ten answers and one argument. We settled on eight that most people end up agreeing on: work and pay, what life costs, safety, health, clean air, support for families, fair institutions and good connections. Here is how every Nestlyzer country does on each, including the ones that surprise.</p>
<div class="ins-take"><b>The short version.</b> ${esc(list(lifeLeague.slice(0, 3).map((r) => nm(r.cc))))} lead overall; ${esc(list(lifeLeague.slice(-3).map((r) => nm(r.cc))))} come last. No country wins everything: ${esc(leaders.slice(0, 5).join(', '))}.</div>
${C.bars(lifeLeague.map((r) => ({ label: cl(r.cc), v: r.s })), { title: 'Overall quality of life (0–100), best first', fmt: (v) => fmt(v), tone: (v) => v >= 70 ? 'g' : v < 50 ? 'b' : '' })}
<h2>All eight scores, country by country</h2>
${C.league(head, rows)}
<p class="ins-note">Overall = the average of the eight scores, equally weighted. Each score combines official national figures (listed under the table); a country needs at least five of the eight to be ranked. Crowns and medals mark the top three per column.</p>
<h2>More quality for less money</h2><p>A high quality of life often comes with high prices. This chart separates the two: the overall score without the cost of living, against how expensive daily life is.</p>
${C.scatter(pts, { title: 'Quality of life (without costs) against the consumer price level' + ytag('price_level'), xl: 'Consumer price level, United States = 100', xlS: 'Price level, US = 100', yl: 'Quality of life without costs (0–100)', ylS: 'Quality without costs', xfmt: (v) => fmt(v), yfmt: (v) => fmt(v), goodLabel: 'Good life, low prices', badLabel: 'Pricey, less to show', good: 'top-left', labels: [...value.slice(0, 6), ...top, ...dear.slice(0, 2)].map((p) => p.key), mLabels: 6,
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
<p class="lede">A salary is a number until you spend it. The same pay buys a roomy flat in Kuala Lumpur, a decent one in Lisbon and a polite conversation with a Zurich landlord. Three views: how expensive each country is, how far incomes really stretch, and how much prices have crept up since 2020.</p>
${C.bars(pl.map((r) => ({ label: cl(r.cc), v: r.v })), { title: 'Consumer price level, United States = 100 (cheapest first)' + ytag('price_level'), fmt: (v) => fmt(v), tone: (v) => v < 60 ? 'g' : v > 100 ? 'b' : '',
      caption: `The ratio of purchasing-power parity to the market exchange rate for household consumption, ${pl.length} countries. ${esc(nm(pl[0].cc))} is the cheapest (${fmt(pl[0].v)}), ${esc(nm(pl[pl.length - 1].cc))} the dearest (${fmt(pl[pl.length - 1].v)}): a basket that costs 100 dollars in the United States costs about ${fmt(pl[pl.length - 1].v)} there.` })}
<h2>How far incomes stretch</h2>
${C.scatter(pts, { title: 'Income per person against the price level' + ytag('price_level', 'gni_pc_ppp'), xl: 'Consumer price level, United States = 100', xlS: 'Price level, US = 100', yl: 'Income per person at purchasing power, thousand international $', ylS: 'Income, thousand int. $', xfmt: (v) => fmt(v), yfmt: (v) => fmt(v), goodLabel: 'Rich and cheap', badLabel: 'Poorer and pricey', good: 'top-left', labels: [...sweet.slice(0, 6), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 3)].map((p) => p.key),
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
<p class="lede">Feeling safe is personal; being safe can be counted. Two numbers do most of the work: how often people die by violence and how often on the road. Both are recorded the same way everywhere, which makes them the fairest comparison there is, and in many countries the road is the bigger danger.</p>
${C.bars(hom.map((r) => ({ label: cl(r.cc), v: r.v, note: NY(r.cc, 'homicide') })), { title: 'Homicides per 100,000 people (safest first)' + ytag('homicide'), fmt: (v) => fmt(v, v < 10 ? 2 : 1), tone: (v) => v < 1 ? 'g' : v > 5 ? 'b' : '',
      caption: `${esc(nm(hom[0].cc))} records ${fmt(hom[0].v, 2)} homicides per 100,000 people a year, ${esc(nm(hom[hom.length - 1].cc))} ${fmt(hom[hom.length - 1].v, 1)}: a ${fmt(hom[hom.length - 1].v / hom[0].v, 0)}-fold difference. Below 1 is typical for Western Europe and East Asia.` })}
${C.scatter(pts, { title: 'Violence against road danger' + ytag('homicide', 'road_deaths'), xl: 'Road deaths per 100,000 people', xlS: 'Road deaths per 100,000', yl: 'Homicides per 100,000 people', ylS: 'Homicides per 100,000', xfmt: (v) => fmt(v), yfmt: (v) => fmt(v, v < 10 ? 1 : 0), goodLabel: 'Safe on both', badLabel: 'Risky on both', good: 'bottom-left', labels: [...safe.slice(0, 6), ...pts.slice().sort((a, b) => b.y - a.y).slice(0, 3), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 2)].map((p) => p.key),
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
<p class="lede">Money buys years, up to a point. Richer countries live longer, but some squeeze out extra years their income would never predict, and others leave years on the table. That gap is where healthcare, diet, traffic and inequality quietly show up in the data.</p>
${C.scatter(pts, { title: 'Life expectancy against income per person' + ytag('life_expectancy', 'gni_pc_ppp'), xl: 'Income per person at purchasing power (log scale, int. $)', xlS: 'Income per person (log)', yl: 'Life expectancy at birth, years', ylS: 'Life expectancy, years', xfmt: (v) => fmtInt(10 ** v / 1000) + 'k', yfmt: (v) => fmt(v), trend: true, labels: [...over.slice(0, 5), ...under.slice(0, 4)].map((p) => p.key), mLabels: 7,
      caption: `The orange line follows the typical life expectancy at each income level. Above it, longer lives than income predicts: ${esc(list(over.slice(0, 5).map((p) => `${p.name} (+${fmt(p.res, 1)} years)`)))}. Below it: ${esc(list(under.slice(0, 4).map((p) => `${p.name} (−${fmt(-p.res, 1)})`)))}.` })}
${C.arrows(le.map((r) => ({ label: cl(r.cc), a: r.a, b: r.b })), { title: 'Life expectancy at birth: ten years ago and now (longest first)', fmt: (v) => fmt(v, 1), better: 1, aLabel: 'ten years earlier', bLabel: 'latest year', caption: `Most countries gained years despite the pandemic dip of 2020–2021. Gains over the decade were largest in ${esc(list(le.slice().sort((a, b) => (b.b - b.a) - (a.b - a.a)).slice(0, 3).map((r) => `${nm(r.cc)} (${sgn(r.b - r.a, 1)} years)`)))}.` })}
${C.bars(im.map((r) => ({ label: cl(r.cc), v: r.v, note: NY(r.cc, 'infant_mortality') })), { title: 'Infant mortality per 1,000 live births (lowest first)' + ytag('infant_mortality'), fmt: (v) => fmt(v, 1), tone: (v) => v < 3 ? 'g' : v > 10 ? 'b' : '', caption: 'The most sensitive single measure of a health system: deaths before the first birthday per 1,000 live births.' })}
${FOOT('Sources: World Bank WDI (CC BY 4.0): SP.DYN.LE00.IN, NY.GNP.PCAP.PP.CD, SP.DYN.IMRT.IN.')}`;
    pageIns('/insights/health-and-longevity/', 'Health and longevity: who lives longest', 'Life expectancy against income for __NCN__ countries: who lives longer than their wealth predicts, ten-year gains and infant mortality, from official data.', body, 'living');
  }

  /* Flagship (2.15.30-r7): the Nestlyzer Location Index. The world top 100 of every published profile (already computed
     for the rankings) summarised: which countries hold the most top places, for households and for companies, and the
     leaders of each profile. A free CSV of all world top-100 lists, Dataset markup, a citation line. */
  {
    const GF = path.join(ROOT, 'data/rank/global.json');
    if (fs.existsSync(GF)) {
      const G = JSON.parse(fs.readFileSync(GF, 'utf8')), W = ((G.scopes || {}).world || {}).profiles || {};
      const HH = Object.keys(W).filter((p) => PROF[p] && !p.startsWith('biz_') && (W[p].top || []).length), BB = Object.keys(W).filter((p) => PROF[p] && p.startsWith('biz_') && (W[p].top || []).length);
      const cnt = (ps) => { const c = {}; for (const p of ps) for (const t of W[p].top) { const cc = String(t[0]).split(':')[0]; c[cc] = (c[cc] || 0) + 1; } return Object.entries(c).sort((a, b) => b[1] - a[1]); };
      const ch = cnt(HH), cb = cnt(BB);
      if (HH.length >= 10 && ch.length >= 5) {
        const PI = '/insights/nestlyzer-location-index/', yr = String(META.v || '').slice(0, 4) || '2026';
        const csvRows = [], q = (v) => { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
        for (const p of [...HH, ...BB]) W[p].top.forEach((t, i) => csvRows.push([PROF[p].name, p.startsWith('biz_') ? 'business' : 'household', i + 1, t[1], String(t[0]).split(':')[0], nm(String(t[0]).split(':')[0]), t[2]]));
        const d = path.join(ROOT, PI.replace(/^\//, '')); fs.mkdirSync(d, { recursive: true });
        const csvName = 'nestlyzer-location-index-world-top100.csv';
        fs.writeFileSync(path.join(d, csvName), ['profile,audience,rank,place,country_code,country,score', ...csvRows.map((r) => r.map(q).join(','))].join('\n') + '\n');
        const lead = (ps) => ps.map((p) => { const t = W[p].top[0]; const cc = String(t[0]).split(':')[0]; return { label: esc(PROF[p].name), v: t[2], note: `${esc(t[1])}, ${esc(nm(cc))}` }; });
        const body = `${kick('living')}${printBtn}<h1>The Nestlyzer Location Index</h1>
<p class="lede">Where in the world is the best place to live, retire, raise a family or build a company? For each of ${HH.length} household and ${BB.length} business profiles, Nestlyzer ranks ${fmtInt(W[HH[0]].ranked || 0)}+ places in ${countries.length} countries on official open data and keeps the world top 100. ${esc(nm(ch[0][0]))} holds the most top places for households (${ch[0][1]} of ${HH.length * 100}), ${esc(nm(cb[0][0]))} for companies (${cb[0][1]} of ${BB.length * 100}).</p>
<p class="actions"><a href="${PI}${csvName}" download>Download every world top 100 (CSV, ${fmtInt(csvRows.length)} rows)</a> <small>Cite as: Nestlyzer Location Index ${yr}, nestlyzer.com${PI}. <a href="/press/">How to cite</a>, <a href="/legal/">terms</a>.</small></p>
${C.bars(ch.slice(0, 20).map(([cc, n]) => ({ label: cl(cc), v: n, note: 'of ' + HH.length * 100 })), { title: 'Countries with the most places in the world top 100, all household profiles', fmt: (v) => fmtInt(v), caption: 'Count of places in the world top 100 summed over every household profile (families, retirees, professionals, students, remote workers and more).' })}
${BB.length ? C.bars(cb.slice(0, 20).map(([cc, n]) => ({ label: cl(cc), v: n, note: 'of ' + BB.length * 100 })), { title: 'Countries with the most places in the world top 100, all business profiles', fmt: (v) => fmtInt(v), caption: 'Same count for company locations: manufacturing, logistics, tech, services, labs, headquarters, energy-intensive industry and more.' }) : ''}
${C.bars(lead(HH), { title: 'World leaders: the number 1 place for each household profile', fmt: (v) => fmt(v, 1), caption: 'Score 0 to 100 within the world ranking of that profile.' })}
${BB.length ? C.bars(lead(BB), { title: 'World leaders: the number 1 place for each business profile', fmt: (v) => fmt(v, 1), caption: 'Score 0 to 100 within the world ranking of that profile.' }) : ''}
<p>Every profile has its own world, continental and country rankings: <a href="/rankings/">all rankings</a>. Regions are ranked too, on each country's ranking page.</p>
${FOOT('Built from official open data (Eurostat, World Bank, OECD, national statistics offices, Copernicus and others, each named on the place pages).')}`;
        pageIns(PI, 'The Nestlyzer Location Index: the world top places', `The world top 100 places for ${HH.length} household and ${BB.length} business profiles, and which countries hold the most, with a free CSV.`, body, 'living',
          [{ '@context': 'https://schema.org', '@type': 'Dataset', name: 'Nestlyzer Location Index ' + yr, description: 'World top 100 places for every Nestlyzer household and business profile, with scores and countries, built from official open data.', url: 'https://nestlyzer.com' + PI, creator: { '@type': 'Organization', name: 'Nestlyzer', url: 'https://nestlyzer.com/' }, isAccessibleForFree: true, license: 'https://nestlyzer.com/legal/#terms', copyrightHolder: { '@type': 'Person', name: 'Torsten Sauter' }, creditText: 'Source: Nestlyzer (nestlyzer.com)', spatialCoverage: { '@type': 'Place', name: 'World' }, version: String(META.v || ''), distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: 'https://nestlyzer.com' + PI + csvName }], isPartOf: { '@type': 'Dataset', name: 'Nestlyzer place rankings', url: 'https://nestlyzer.com/method/' } }]);
      }
    }
  }

  /* H-new (2.15.30-r7): the official figures of 18 November 2026 (Insee, Destatis, INE Portugal), shown as citable rankings
     with a CSV each. Context only: these figures do not enter any Nestlyzer score. */
  {
    const XR = (cc) => { const f = path.join(ROOT, 'data/x', cc + '.json'); return fs.existsSync(f) ? ((JSON.parse(fs.readFileSync(f, 'utf8')).ctx || {}).records || []) : []; };
    const GN = {}; try { for (const l of zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'build/source/context/master_records.jsonl.gz'))).toString('utf8').split('\n')) { if (!l) continue; const o = JSON.parse(l); if (o.source_geo_name && /data_2026_11_18|data_intake_2026_11_19/.test(o.origin_packs || '')) GN[o.source_geo_id] = o.source_geo_name; } } catch (e) {}
    // names: from the stored record, else from the region it is bound to (reviewed mapping: department or state = NUTS code)
    try { const NU = {}; const nutsOf = (cc) => NU[cc] || (NU[cc] = (JSON.parse(fs.readFileSync(path.join(ROOT, 'data/c', cc + '.json'), 'utf8')).nuts || {}));
      for (const l of fs.readFileSync(path.join(ROOT, 'build/source/context/master_geo_mapping.csv'), 'utf8').split('\n').slice(1)) { const [g, kind, code] = l.split(','); if (kind !== 'nuts3' || !code || GN[g]) continue; const cc = g.slice(0, 2), nm = nutsOf(cc)[code.replace(/\*$/, '')]; if (nm) GN[g] = nm; } } catch (e) {}
    const get = (cc, id, lvl) => XR(cc).filter((o) => o.indicator_id === id && o.source_geo_level === lvl && fin(o.value)).map((o) => ({ g: o.source_geo_id, name: GN[o.source_geo_id] || o.source_geo_id.split(':').pop(), v: o.value, per: o.reference_period, url: o.source_url }));
    const csvOut = (p, file, head, rows) => { const d = path.join(ROOT, p.replace(/^\//, '')); fs.mkdirSync(d, { recursive: true }); const q = (v) => { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; fs.writeFileSync(path.join(d, file), [head, ...rows].map((r) => r.map(q).join(',')).join('\n') + '\n'); return p + file; };
    const dl = (href, n) => `<p class="actions"><a href="${href}" download>Download the data (CSV, ${n} rows)</a> <small>Cite with credit and a link to this page; no bulk reuse or AI training: <a href="/press/">how to cite</a>, <a href="/legal/#terms">terms</a>.</small></p>`;
    const dsLd = (p, name, desc, csv, cover, period) => [{ '@context': 'https://schema.org', '@type': 'Dataset', name, description: desc, url: 'https://nestlyzer.com' + p, creator: { '@type': 'Organization', name: 'Nestlyzer', url: 'https://nestlyzer.com/' }, isAccessibleForFree: true, license: 'https://nestlyzer.com/legal/#terms', copyrightHolder: { '@type': 'Person', name: 'Torsten Sauter' }, creditText: 'Source: Nestlyzer (nestlyzer.com)', spatialCoverage: { '@type': 'Place', name: cover }, temporalCoverage: period, distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: 'https://nestlyzer.com' + csv }], isPartOf: { '@type': 'Dataset', name: 'Nestlyzer place rankings', url: 'https://nestlyzer.com/method/' } }];
    // 1. France: where retirees move
    const ret = get('FR', 'retiree_migration_balance_interregional', 'department'), act = get('FR', 'active_migration_balance_interregional', 'department'), old = get('FR', 'population_age_65plus_share', 'department');
    if (ret.length >= 90) {
      const P1 = '/insights/where-retirees-move-in-france/', A = Object.fromEntries(act.map((r) => [r.g, r.v])), O = Object.fromEntries(old.map((r) => [r.g, r.v]));
      const top = ret.slice().sort((a, b) => b.v - a.v), gain = top.filter((r) => r.v > 0), lose = top.filter((r) => r.v < 0);
      const both = top.filter((r) => fin(A[r.g])), pts = both.map((r) => ({ key: r.g, name: r.name, x: A[r.g], y: r.v }));
      const oppo = both.filter((r) => r.v > 0 && A[r.g] < 0).map((r) => r.name);
      const csv = csvOut(P1, 'nestlyzer-france-retiree-migration-2021.csv', ['rank', 'department_code', 'department', 'retirees_net_per_1000', 'active_net_per_1000', 'share_65plus_pct', 'period_migration', 'period_age'],
        top.map((r, i) => [i + 1, r.g.split(':').pop(), r.name, r.v, fin(A[r.g]) ? A[r.g] : '', fin(O[r.g]) ? O[r.g] : '', '2021 census', (old.find((o) => o.g === r.g) || {}).per || '']));
      const body = `${kick('living')}${printBtn}<h1>Where retirees move in France: all ${ret.length} departments</h1>
<p class="lede">Which French departments gain retirees from the rest of the country, and which lose them? Insee measured it in the 2021 census for every department: retirees moving in from other regions minus those leaving for other regions, per 1,000 retirees. ${gain.length} departments gain retirees, ${lose.length} lose them. ${esc(top[0].name)} gains most (${fmt(top[0].v, 1)} per 1,000), ${esc(top[top.length - 1].name)} loses most (${fmt(top[top.length - 1].v, 1)}).</p>
${dl(csv, top.length)}
${C.bars(top.slice(0, 20).map((r) => ({ label: esc(r.name), v: r.v, note: '2021' })), { title: 'Departments gaining the most retirees, net per 1,000 retirees', fmt: (v) => fmt(v, 1), tone: (v) => v > 0 ? 'g' : 'b', caption: 'Moves to and from other French regions only; moves within the region and to or from abroad are not counted. Source: Insee, census 2021.' })}
${C.bars(top.slice(-15).reverse().map((r) => ({ label: esc(r.name), v: r.v, note: '2021' })), { title: 'Departments losing the most retirees, net per 1,000 retirees', fmt: (v) => fmt(v, 1), tone: (v) => v > 0 ? 'g' : 'b', caption: 'Mostly the Paris region and large cities: many people leave when they retire.' })}
${pts.length >= 50 ? C.scatter(pts, { title: 'Retirees against people in work: who moves where', xl: 'People in work or seeking work, net per 1,000', xlS: 'Working age, net per 1,000', yl: 'Retirees, net per 1,000', ylS: 'Retirees, net per 1,000', xfmt: (v) => fmt(v, 1), yfmt: (v) => fmt(v, 1), goodLabel: 'Gaining both', badLabel: 'Losing both', good: 'top-right', labels: [...pts.slice().sort((a, b) => b.y - a.y).slice(0, 4), ...pts.slice().sort((a, b) => a.y - b.y).slice(0, 2)], caption: `${oppo.length} departments attract retirees while losing people of working age${oppo.length ? ` (for example ${esc(list(oppo.slice(0, 4)))})` : ''}: typical of the coast and the countryside of the west and south.` }) : ''}
${old.length >= 90 ? C.bars(old.slice().sort((a, b) => b.v - a.v).slice(0, 15).map((r) => ({ label: esc(r.name), v: r.v, note: r.per })), { title: 'Highest share of residents aged 65 and over, %', fmt: (v) => fmt(v, 1) + '%', caption: 'Insee population estimates, 2022 (Mayotte 2017).' }) : ''}
<p class="small muted">Shown on every French place in Nestlyzer as department context; not part of any score. The figures were transcribed from Insee's published tables; Nestlyzer will replace them with the original file when it arrives.</p>
${FOOT('Source: Insee, "Impact des migrations résidentielles" by department, census 2021, and population by age 2022 (Licence Ouverte / Etalab 2.0).')}`;
      pageIns(P1, 'Where retirees move in France: every department', `Which French departments gain or lose retirees? Insee census 2021 for all ${ret.length} departments, against people in work, with a free CSV.`, body, 'living', dsLd(P1, 'Retiree migration by French department (2021)', 'Net interregional migration of retirees and of economically active people per 1,000, and the share aged 65+, for every French department, from Insee.', csv, 'France', '2021/2022'));
    }
    // 2. Germany: childcare by state
    const u3 = get('DE', 'childcare_participation_under3', 'state'), k35 = get('DE', 'childcare_participation_3_to_5', 'state');
    if (u3.length >= 16) {
      const P2 = '/insights/childcare-in-germany-by-state/', K = Object.fromEntries(k35.map((r) => [r.g, r.v])), su = u3.slice().sort((a, b) => b.v - a.v);
      const nat = XR('DE').find((o) => o.indicator_id === 'childcare_participation_under3' && o.source_geo_level === 'country');
      const csv = csvOut(P2, 'nestlyzer-germany-childcare-2025.csv', ['rank', 'state_code', 'state', 'under_3_in_day_care_pct', 'age_3_to_5_in_day_care_pct', 'date'], su.map((r, i) => [i + 1, r.g.split(':').pop(), r.name, r.v, fin(K[r.g]) ? K[r.g] : '', '2025-03-01']));
      const body = `${kick('living')}${printBtn}<h1>Childcare in Germany: all 16 states</h1>
<p class="lede">How many young children are in day care (Kita or childminder)? On 1 March 2025, ${nat ? fmt(nat.value, 1) + '% of children under 3' : 'about a third of children under 3'} were in day care in Germany, but the states differ by more than ${fmt(su[0].v - su[su.length - 1].v, 0)} percentage points: from ${esc(su[0].name)} (${fmt(su[0].v, 1)}%) to ${esc(su[su.length - 1].name)} (${fmt(su[su.length - 1].v, 1)}%).</p>
${dl(csv, su.length)}
${C.bars(su.map((r) => ({ label: esc(r.name), v: r.v, note: '2025' })), { title: 'Children under 3 in day care, %', fmt: (v) => fmt(v, 1) + '%', caption: 'Share of all children under 3 in day-care centres or with a publicly funded childminder, 1 March 2025. The eastern states lead by a wide margin, a legacy of the GDR.' })}
${k35.length >= 16 ? C.bars(k35.slice().sort((a, b) => b.v - a.v).map((r) => ({ label: esc(r.name), v: r.v, note: '2025' })), { title: 'Children aged 3 to 5 in day care, %', fmt: (v) => fmt(v, 1) + '%', caption: 'Above 100% can occur where children from other states attend or population figures lag; the published figure is kept.' }) : ''}
<p class="small muted">Shown on every German place in Nestlyzer as state context; not part of any score.</p>
${FOOT('Source: Statistisches Bundesamt (Destatis), Kindertagesbetreuung, Betreuungsquoten 1 March 2025 (Datenlizenz Deutschland, Namensnennung 2.0).')}`;
      pageIns(P2, 'Childcare in Germany: day-care rates in all 16 states', 'Share of children under 3 and aged 3 to 5 in day care in every German state, 1 March 2025, from Destatis, with a free CSV.', body, 'living', dsLd(P2, 'Childcare participation by German state (2025)', 'Share of children under 3 and aged 3 to 5 in day care by German state on 1 March 2025, from Destatis.', csv, 'Germany', '2025'));
    }
    // 3. Portugal: rents of new leases
    const prY = get('PT', 'rent_new_lease_median_m2_year', 'municipality_context'), useY = prY.length >= 100;
    const pr = useY ? prY : get('PT', 'rent_new_lease_median_m2', 'municipality_context'), pn = XR('PT').find((o) => o.indicator_id === (useY ? 'rent_new_lease_median_m2_year' : 'rent_new_lease_median_m2') && o.source_geo_level === 'country');
    if (pr.length >= 5) {
      const P3 = '/insights/new-lease-rents-portugal/', s3 = pr.slice().sort((a, b) => b.v - a.v);
      const per3 = useY ? (s3[0] && s3[0].per) || '2025' : 'July 2025 to June 2026';
      const csv = csvOut(P3, useY ? 'nestlyzer-portugal-new-lease-rents-' + per3 + '.csv' : 'nestlyzer-portugal-new-lease-rents-2026.csv', ['rank', 'municipality_code', 'municipality', 'median_rent_eur_m2_month', 'period'], s3.map((r, i) => [i + 1, r.g.split(':').pop(), r.name, r.v, per3]).concat(pn ? [['', 'PT', 'Portugal', pn.value, per3]] : []));
      const body = `${kick('living')}${printBtn}<h1>Rents of new leases in Portugal</h1>
<p class="lede">What does a new rental contract cost per square metre in Portugal? INE's ${useY ? 'official figures for ' + esc(per3) + ' cover ' + s3.length + ' municipalities' : 'latest local figures (July 2025 to June 2026) cover ' + s3.length + ' municipalities'}${pn ? `; the national median is €${fmt(pn.value, 2)} per m² a month` : ''}. ${s3.length > 2 ? `${esc(s3[0].name)} is the most expensive (€${fmt(s3[0].v, 2)}), ${esc(s3[s3.length - 1].name)} the cheapest (€${fmt(s3[s3.length - 1].v, 2)}): a ${fmt(s3[0].v / s3[s3.length - 1].v, 1)}-fold gap.` : ''}</p>
${dl(csv, s3.length + (pn ? 1 : 0))}
${C.bars(s3.slice(0, 25).map((r) => ({ label: esc(r.name), v: r.v, note: esc(per3) })), { title: (s3.length > 25 ? 'The 25 most expensive municipalities' : 'All municipalities') + ': median rent of new leases, € per m² a month', fmt: (v) => '€' + fmt(v, 2), tone: (v) => pn && v > pn.value ? 'b' : 'g', caption: 'Median of new residential contracts, not the average rent of existing tenancies. Red: above the national median.' })}
${s3.length > 40 ? C.bars(s3.slice(-20).reverse().map((r) => ({ label: esc(r.name), v: r.v, note: esc(per3) })), { title: 'The 20 most affordable municipalities', fmt: (v) => '€' + fmt(v, 2), tone: () => 'g', caption: 'Mostly the interior north and the Alentejo.' }) : ''}
<p class="small muted">Shown on every parish of these municipalities as a whole-municipality figure; not part of any score. Municipalities with too few new contracts are not published by INE.</p>
${FOOT('Source: Statistics Portugal (INE), "Rendas da habitação ao nível local", via DREM; reuse with attribution under the INE dissemination policy.')}`;
      pageIns(P3, 'Rents of new leases in Portugal by municipality', `Median rent of new leases per square metre in ${s3.length} Portuguese municipalities, ${per3}, from INE, with a free CSV.`, body, 'living', dsLd(P3, 'Median new-lease rents by municipality, Portugal (' + per3 + ')', 'Median monthly rent per square metre of new residential leases by municipality, ' + per3 + ', from Statistics Portugal (INE).', csv, 'Portugal', useY ? per3 : '2025-07/2026-06'));
    }
  }

  /* r8 (official files collected 19 Nov 2026): Europe's regions, US states, French towns */
  {
    const XR8 = {}; const XRc = (cc) => XR8[cc] || (XR8[cc] = (() => { const f = path.join(ROOT, 'data/x', cc + '.json'); return fs.existsSync(f) ? ((JSON.parse(fs.readFileSync(f, 'utf8')).ctx || {}).records || []) : []; })());
    const GN8 = {}; try { for (const l of zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'build/source/context/master_records.jsonl.gz'))).toString('utf8').split('\n')) { if (!l) continue; const o = JSON.parse(l); if (o.source_geo_name && /data_intake_2026_11_19/.test(o.origin_packs || '')) GN8[o.source_geo_id] = o.source_geo_name; } } catch (e) {}
    const q8 = (v) => { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const out8 = (p, file, head, rows) => { const d = path.join(ROOT, p.replace(/^\//, '')); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, file), [head, ...rows].map((r) => r.map(q8).join(',')).join('\n') + '\n'); return p + file; };
    const dl8 = (href, n) => `<p class="actions"><a href="${href}" download>Download the data (CSV, ${fmtInt(n)} rows)</a> <small>Cite with credit and a link to this page; no bulk reuse or AI training: <a href="/press/">how to cite</a>, <a href="/legal/#terms">terms</a>.</small></p>`;
    const ld8 = (p, name, desc, csv, cover, period) => [{ '@context': 'https://schema.org', '@type': 'Dataset', name, description: desc, url: 'https://nestlyzer.com' + p, creator: { '@type': 'Organization', name: 'Nestlyzer', url: 'https://nestlyzer.com/' }, isAccessibleForFree: true, license: 'https://nestlyzer.com/legal/#terms', copyrightHolder: { '@type': 'Person', name: 'Torsten Sauter' }, creditText: 'Source: Nestlyzer (nestlyzer.com)', spatialCoverage: { '@type': 'Place', name: cover }, temporalCoverage: period, distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: 'https://nestlyzer.com' + csv }], isPartOf: { '@type': 'Dataset', name: 'Nestlyzer place rankings', url: 'https://nestlyzer.com/method/' } }];
    // Europe: every NUTS 3 region
    const EU = {}; for (const c of countries) for (const o of XRc(c.cc)) if (/^eu_/.test(o.indicator_id) && o.source_geo_level === 'region' && fin(o.value)) { const g = o.source_geo_id; (EU[g] = EU[g] || { g, cc: c.cc, name: GN8[g] || g.split(':').pop() })[o.indicator_id] = o.value; EU[g]['y_' + o.indicator_id] = o.reference_period; }
    const R8 = Object.values(EU);
    if (R8.length >= 500) {
      const PE = '/insights/europe-regions-migration-and-age/';
      const mig = R8.filter((r) => fin(r.eu_net_migration_rate_5y)).sort((a, b) => b.eu_net_migration_rate_5y - a.eu_net_migration_rate_5y);
      const age = R8.filter((r) => fin(r.eu_median_age)).sort((a, b) => b.eu_median_age - a.eu_median_age);
      const byC = {}; for (const r of mig) (byC[r.cc] = byC[r.cc] || []).push(r.eu_net_migration_rate_5y);
      const cm = Object.entries(byC).filter(([, a]) => a.length >= 3).map(([cc, a]) => ({ cc, v: median(a), n: a.length })).sort((a, b) => b.v - a.v);
      const neg = mig.filter((r) => r.eu_net_migration_rate_5y < 0).length;
      const pts = R8.filter((r) => fin(r.eu_median_age) && fin(r.eu_net_migration_rate_5y)).map((r) => ({ key: r.g, name: r.name, x: r.eu_median_age, y: r.eu_net_migration_rate_5y }));
      const csv = out8(PE, 'nestlyzer-europe-regions-migration-age.csv', ['nuts3', 'region', 'country', 'net_migration_per_1000_latest', 'net_migration_per_1000_5y_avg', 'population_change_per_1000', 'median_age', 'share_65plus_pct', 'share_under15_pct', 'year'],
        R8.sort((a, b) => a.g < b.g ? -1 : 1).map((r) => [r.g.split(':').pop(), r.name, nm(r.cc), r.eu_net_migration_rate ?? '', r.eu_net_migration_rate_5y ?? '', r.eu_population_change_rate ?? '', r.eu_median_age ?? '', r.eu_share_65plus ?? '', r.eu_share_0_14 ?? '', r.y_eu_median_age || r.y_eu_net_migration_rate || '']));
      const body = `${kick('living')}${printBtn}<h1>Europe's ${fmtInt(R8.length)} regions: where people move and how old they are</h1>
<p class="lede">Every region (NUTS 3) of ${Object.keys(byC).length} European countries, from Eurostat's official files: net migration over the last five years, population change, median age and the share of children and over-65s. ${fmtInt(mig.length - neg)} regions gained people through migration, ${fmtInt(neg)} lost them. The strongest pull: ${esc(mig[0].name)} (${esc(nm(mig[0].cc))}, ${fmt(mig[0].eu_net_migration_rate_5y, 1)} per 1,000 a year); the oldest region: ${esc(age[0].name)} (median age ${fmt(age[0].eu_median_age, 1)}).</p>
${dl8(csv, R8.length)}
${C.bars(mig.slice(0, 20).map((r) => ({ label: flagImg(r.cc, 12) + ' ' + esc(r.name), v: r.eu_net_migration_rate_5y, note: esc(r.y_eu_net_migration_rate_5y || '') })), { title: 'Regions gaining most through migration, per 1,000 residents a year (5-year average)', fmt: (v) => fmt(v, 1), tone: (v) => v > 0 ? 'g' : 'b', caption: 'Net migration includes moves within the country and from abroad (Eurostat, with statistical adjustment).' })}
${C.bars(mig.slice(-15).reverse().map((r) => ({ label: flagImg(r.cc, 12) + ' ' + esc(r.name), v: r.eu_net_migration_rate_5y, note: esc(r.y_eu_net_migration_rate_5y || '') })), { title: 'Regions losing most through migration, per 1,000 residents a year', fmt: (v) => fmt(v, 1), tone: (v) => v > 0 ? 'g' : 'b', caption: 'Of these 15 regions: ' + Object.entries(mig.slice(-15).reduce((a, r) => (a[r.cc] = (a[r.cc] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]).map(([cc, n]) => n + ' in ' + nm(cc)).join(', ') + '.' })}
${C.bars(cm.map((r) => ({ label: cl(r.cc), v: r.v, note: r.n + ' regions' })), { title: 'The typical region of each country: median net migration per 1,000 a year', fmt: (v) => fmt(v, 1), tone: (v) => v > 0 ? 'g' : 'b', caption: 'Half of each country\'s regions gain more, half less.' })}
${pts.length >= 200 ? C.scatter(pts, { title: 'Older regions, fewer newcomers? Median age against net migration', xl: 'Median age, years', xlS: 'Median age', yl: 'Net migration per 1,000 a year', ylS: 'Net migration', xfmt: (v) => fmt(v, 0), yfmt: (v) => fmt(v, 0), goodLabel: 'Younger and gaining', badLabel: 'Older and losing', good: 'top-left', labels: [...pts.slice().sort((a, b) => b.y - a.y).slice(0, 3), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 2)], caption: `The link between age and migration is ${strength(corr(pts.map((p) => p.x), pts.map((p) => p.y))).replace(/^a /, '')} across ${fmtInt(pts.length)} regions.` }) : ''}
${C.bars(age.slice(0, 15).map((r) => ({ label: flagImg(r.cc, 12) + ' ' + esc(r.name), v: r.eu_median_age, note: esc(r.y_eu_median_age || '') })), { title: 'The oldest regions: median age', fmt: (v) => fmt(v, 1), caption: 'Half the residents are older than this.' })}
${C.bars(age.slice(-15).reverse().map((r) => ({ label: flagImg(r.cc, 12) + ' ' + esc(r.name), v: r.eu_median_age, note: esc(r.y_eu_median_age || '') })), { title: 'The youngest regions: median age', fmt: (v) => fmt(v, 1), caption: 'Of these 15 regions: ' + Object.entries(age.slice(-15).reduce((a, r) => (a[r.cc] = (a[r.cc] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]).map(([cc, n]) => n + ' in ' + nm(cc)).join(', ') + '.' })}
<p class="small muted">Every place in these regions shows its region's figures on its card. Context only, not part of any score.</p>
${FOOT('Source: Eurostat, demo_r_gind3 (population change by NUTS 3 region) and demo_r_pjanind3 (population structure indicators), CC BY 4.0.')}`;
      pageIns(PE, 'Europe\'s regions: where people move, how old they are', `Net migration, population change and median age for all ${fmtInt(R8.length)} European NUTS 3 regions, from Eurostat, with charts and a free CSV.`, body, 'living', ld8(PE, 'Migration and age of European regions (NUTS 3)', 'Net migration (latest and 5-year average), population change, median age and age shares for every European NUTS 3 region, from Eurostat.', csv, 'Europe', '2020/2025'));
    }
    // United States: every state
    const US = {}; for (const o of XRc('US')) if (/^us_/.test(o.indicator_id) && fin(o.value)) { const g = o.source_geo_id; (US[g] = US[g] || { g, name: GN8[g] || g })[o.indicator_id] = o.value; }
    const S8 = Object.values(US).filter((r) => fin(r.us_domestic_migration_rate));
    if (S8.length >= 45) {
      const PU = '/insights/where-americans-move-by-state/', sd = S8.slice().sort((a, b) => b.us_domestic_migration_rate - a.us_domestic_migration_rate), cum = S8.filter((r) => fin(r.us_domestic_migration_2021_2025)).sort((a, b) => b.us_domestic_migration_2021_2025 - a.us_domestic_migration_2021_2025);
      const csv = out8(PU, 'nestlyzer-us-state-migration-2025.csv', ['rank', 'state_code', 'state', 'domestic_net_per_1000_2025', 'international_net_per_1000_2025', 'domestic_net_people_2020_2025', 'international_net_people_2020_2025'], sd.map((r, i) => [i + 1, r.g.replace('US-', ''), r.name, r.us_domestic_migration_rate, r.us_international_migration_rate ?? '', r.us_domestic_migration_2021_2025 ?? '', r.us_international_migration_2021_2025 ?? '']));
      const body = `${kick('living')}${printBtn}<h1>Where Americans move: all 50 states and DC</h1>
<p class="lede">The Census Bureau's population estimates count, for every state, how many people arrive from other states, how many leave and how many come from abroad. In 2025 ${esc(sd[0].name)} gained most from other states (${fmt(sd[0].us_domestic_migration_rate, 1)} per 1,000 residents), ${esc(sd[sd.length - 1].name)} lost most (${fmt(sd[sd.length - 1].us_domestic_migration_rate, 1)}). ${cum.length >= 10 ? `Since 2020, ${esc(cum[0].name)} gained ${fmtInt(cum[0].us_domestic_migration_2021_2025)} people from the rest of the country and ${esc(cum[cum.length - 1].name)} lost ${fmtInt(-cum[cum.length - 1].us_domestic_migration_2021_2025)}.` : ''}</p>
${dl8(csv, sd.length)}
${C.bars(sd.map((r) => ({ label: esc(r.name), v: r.us_domestic_migration_rate, note: '2025' })), { title: 'Moves from other states minus moves out, per 1,000 residents, 2025', fmt: (v) => fmt(v, 1), tone: (v) => v > 0 ? 'g' : 'b', caption: 'Domestic migration only; arrivals from abroad are shown below.' })}
${cum.length < 10 ? '' : C.bars(cum.slice(0, 12).map((r) => ({ label: esc(r.name), v: r.us_domestic_migration_2021_2025, note: '2020-25' })).concat(cum.slice(-8).map((r) => ({ label: esc(r.name), v: r.us_domestic_migration_2021_2025, note: '2020-25' }))), { title: 'Net moves from other states since 2020, people (top 12 and bottom 8)', fmt: (v) => fmtInt(v), tone: (v) => v > 0 ? 'g' : 'b', caption: 'July 2020 to July 2025.' })}
${C.bars(S8.filter((r) => fin(r.us_international_migration_rate)).sort((a, b) => b.us_international_migration_rate - a.us_international_migration_rate).slice(0, 15).map((r) => ({ label: esc(r.name), v: r.us_international_migration_rate, note: '2025' })), { title: 'Net arrivals from abroad per 1,000 residents, 2025 (top 15)', fmt: (v) => fmt(v, 1), caption: 'International migration as estimated by the Census Bureau.' })}
<p class="small muted">Every US place shows its state's figures on its card. Context only, not part of any score.</p>
${FOOT('Source: U.S. Census Bureau, Population Estimates Program, county and state totals 2020-2025 (public domain).')}`;
      pageIns(PU, 'Where Americans move: migration by state, 2020-2025', 'Domestic and international migration for every US state and DC, 2025 rates and totals since 2020, from the Census Bureau, with a free CSV.', body, 'living', ld8(PU, 'US state migration 2020-2025', 'Net domestic and international migration per 1,000 residents (2025) and net totals July 2020 to July 2025 for every US state and DC, from the U.S. Census Bureau.', csv, 'United States', '2020/2025'));
    }
    // France: childcare in every town of 10,000+
    const FRc = XRc('FR').filter((o) => o.indicator_id === 'childcare_places_under3_all_forms' && o.source_geo_level === 'municipality' && fin(o.value));
    const lat = {}; for (const o of FRc) { const k = o.source_geo_id; if (!lat[k] || String(o.reference_period) > String(lat[k].reference_period)) lat[k] = o; }
    const T8 = Object.values(lat).map((o) => ({ g: o.source_geo_id, name: GN8[o.source_geo_id] || o.source_geo_id.split(':').pop(), v: o.value, per: o.reference_period })).sort((a, b) => b.v - a.v);
    if (T8.length >= 300) {
      const PF = '/insights/childcare-in-french-towns/';
      const csv = out8(PF, 'nestlyzer-france-childcare-towns.csv', ['rank', 'insee_code', 'commune', 'childcare_places_per_100_under3', 'year'], T8.map((r, i) => [i + 1, r.g.split(':').pop(), r.name, r.v, r.per]));
      const med = median(T8.map((r) => r.v));
      const body = `${kick('living')}${printBtn}<h1>Childcare in France's ${fmtInt(T8.length)} towns of 10,000 and more</h1>
<p class="lede">How many childcare places are there for every 100 children under 3: crèches, childminders and preschool together? The family allowance fund (CNAF) publishes it for every commune above 10,000 residents. The typical town offers ${fmt(med, 0)} places per 100 children; ${esc(T8[0].name)} offers ${fmt(T8[0].v, 0)}, ${esc(T8[T8.length - 1].name)} ${fmt(T8[T8.length - 1].v, 0)}.</p>
${dl8(csv, T8.length)}
${C.bars(T8.slice(0, 20).map((r) => ({ label: esc(r.name), v: r.v, note: r.per })), { title: 'Most childcare places per 100 children under 3', fmt: (v) => fmt(v, 0), tone: () => 'g', caption: 'Theoretical capacity, not free places today.' })}
${C.bars(T8.slice(-20).reverse().map((r) => ({ label: esc(r.name), v: r.v, note: r.per })), { title: 'Fewest childcare places per 100 children under 3', fmt: (v) => fmt(v, 0), tone: () => 'b', caption: 'Theoretical capacity per 100 children under 3.' })}
<p class="small muted">Every one of these towns shows its figure on its card. Context only, not part of any score.</p>
${FOOT('Source: CNAF, Taux de couverture en accueil du jeune enfant par commune (data.caf.fr, Licence Ouverte / Etalab 2.0).')}`;
      pageIns(PF, 'Childcare in French towns: places per 100 children', `Childcare places per 100 children under 3 in all ${fmtInt(T8.length)} French communes above 10,000 residents, from CNAF, with a free CSV.`, body, 'living', ld8(PF, 'Childcare coverage of French towns', 'Theoretical childcare places per 100 children under 3 for every French commune of 10,000 residents or more, from CNAF.', csv, 'France', String((T8[0] || {}).per || '2023')));
    }
    // r11: Netherlands, business establishments in every municipality (CBS 81575)
    {
    const XRn = (cc) => { const f = path.join(ROOT, 'data/x', cc + '.json'); return fs.existsSync(f) ? ((JSON.parse(fs.readFileSync(f, 'utf8')).ctx || {}).records || []) : []; };
    const NLm = {}; for (const o of XRn('NL')) if (/^nl_establishments/.test(o.indicator_id) && o.source_geo_level === 'municipality' && fin(o.value)) {
      const r = NLm[o.source_geo_id] = NLm[o.source_geo_id] || { g: o.source_geo_id, name: o.area_label || o.source_geo_id }, k = o.indicator_id, per = String(o.reference_period);
      if (!r['p_' + k] || per > r['p_' + k]) { r[k] = o.value; r['p_' + k] = per; if (k === 'nl_establishments') r.name = o.area_label || r.name; } }
    const N = Object.values(NLm).filter((r) => fin(r.nl_establishments) && fin(r.nl_establishments_change_5y) && String(r.p_nl_establishments) >= '2026');
    if (N.length >= 300) {
      const PN = '/insights/dutch-business-base-by-municipality/', g5 = N.slice().sort((a, b) => b.nl_establishments_change_5y - a.nl_establishments_change_5y), big = N.slice().sort((a, b) => b.nl_establishments - a.nl_establishments);
      const m5 = median(N.map((r) => r.nl_establishments_change_5y)), m1 = median(N.filter((r) => fin(r.nl_establishments_change_1y)).map((r) => r.nl_establishments_change_1y)), shrink = N.filter((r) => fin(r.nl_establishments_change_1y) && r.nl_establishments_change_1y < 0);
      const big10 = big.slice(0, 10), bigFast = big10.slice().sort((a, b) => b.nl_establishments_change_5y - a.nl_establishments_change_5y)[0];
      const csv = out8(PN, 'nestlyzer-netherlands-business-establishments.csv', ['rank_5y_growth', 'cbs_code', 'municipality', 'establishments_2026', 'change_1y_pct', 'change_5y_pct', 'change_10y_pct'], g5.map((r, i) => [i + 1, r.g, r.name, r.nl_establishments, r.nl_establishments_change_1y ?? '', r.nl_establishments_change_5y ?? '', r.nl_establishments_change_10y ?? '']));
      const pts = N.map((r) => ({ key: r.g, name: r.name, x: Math.log10(r.nl_establishments), y: r.nl_establishments_change_5y }));
      const cr = corr(pts.map((p) => p.x), pts.map((p) => p.y));
      const body = `${kick('business')}${printBtn}<h1>The Dutch business base: ${fmtInt(N.length)} municipalities</h1>
<p class="lede">Statistics Netherlands counts every business establishment on 1 January, from one-person firms to large employers. The typical municipality has ${fmt(m5, 1)}% more establishments than five years ago and ${fmt(m1, 1)}% more than a year ago. ${esc(g5[0].name)} grew fastest (${fmt(g5[0].nl_establishments_change_5y, 1)}% in five years); ${esc(g5[g5.length - 1].name)} ${g5[g5.length - 1].nl_establishments_change_5y < 0 ? 'shrank most' : 'grew least'} (${fmt(g5[g5.length - 1].nl_establishments_change_5y, 1)}%). ${shrink.length ? `${fmtInt(shrink.length)} municipalities had fewer establishments in 2026 than in 2025.` : 'None had fewer establishments than a year earlier.'} Among the ten largest business centres, ${esc(bigFast.name)} grew fastest (${fmt(bigFast.nl_establishments_change_5y, 1)}%).</p>
${dl8(csv, N.length)}
${C.bars(g5.slice(0, 20).map((r) => ({ label: esc(r.name), v: r.nl_establishments_change_5y, note: fmtInt(r.nl_establishments) + ' firms' })), { title: 'Fastest-growing business base: change in establishments over 5 years, %', fmt: (v) => fmt(v, 1), tone: (v) => v > 0 ? 'g' : 'b', caption: 'January 2021 to January 2026, all industries.' })}
${C.bars(g5.slice(-15).reverse().map((r) => ({ label: esc(r.name), v: r.nl_establishments_change_5y, note: fmtInt(r.nl_establishments) + ' firms' })), { title: 'Slowest growth over 5 years, %', fmt: (v) => fmt(v, 1), tone: (v) => v > m5 ? 'g' : 'b', caption: 'Where a municipality merged with a neighbour during the period, its change is left out, so a merger never looks like growth.' })}
${C.scatter(pts, { title: 'Do big business centres grow faster? Size against 5-year growth', xl: 'Establishments (log scale, 10^x)', xlS: 'Size', yl: 'Change over 5 years, %', ylS: '5-year change', xfmt: (v) => fmtInt(Math.pow(10, v)), yfmt: (v) => fmt(v, 0), goodLabel: 'Big and growing', badLabel: 'Small and shrinking', good: 'top-right', labels: [...pts.slice().sort((a, b) => b.y - a.y).slice(0, 3), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 3), ...pts.slice().sort((a, b) => a.y - b.y).slice(0, 2)], caption: `Across ${fmtInt(pts.length)} municipalities the link between size and growth is ${strength(cr).replace(/^a /, '')}${cr > 0.2 ? ': larger places tend to grow faster' : cr < -0.2 ? ': smaller places tend to grow faster' : ''}.` })}
${C.bars(big10.map((r) => ({ label: esc(r.name), v: r.nl_establishments, note: (r.nl_establishments_change_5y >= 0 ? '+' : '') + fmt(r.nl_establishments_change_5y, 1) + '% in 5 years' })), { title: 'The ten largest business centres: establishments on 1 January 2026', fmt: (v) => fmtInt(v), caption: 'Counts grow with town size; the growth rates are the fair comparison.' })}
<p class="small muted">Every Dutch place shows its municipality's figures on its card. Context only, not part of any score.</p>
${FOOT('Source: CBS Statistics Netherlands, table 81575NED (business establishments by municipality), CC BY 4.0.')}`;
      pageIns(PN, 'The Dutch business base: establishments by municipality', `Business establishments in all ${fmtInt(N.length)} Dutch municipalities on 1 January 2026, with change over 1, 5 and 10 years, from CBS, with a free CSV.`, body, 'business', ld8(PN, 'Business establishments of Dutch municipalities', 'Number of business establishments on 1 January 2026 and change over 1, 5 and 10 years for every Dutch municipality, from CBS Statistics Netherlands.', csv, 'Netherlands', '2016/2026'));
    }
    // r11: Malaysia, everyday prices by state (PriceCatcher)
    const MY = XRn('MY').filter((o) => o.indicator_id === 'my_price_level_state' && fin(o.value)).map((o) => ({ g: o.source_geo_id, name: o.area_label || o.source_geo_id, v: o.value, per: o.reference_period })).sort((a, b) => b.v - a.v);
    if (MY.length >= 12) {
      const PM = '/insights/cost-of-living-malaysian-states/', hi = MY[0], lo = MY[MY.length - 1], above = MY.filter((r) => r.v > 101), below = MY.filter((r) => r.v < 99);
      const csv = out8(PM, 'nestlyzer-malaysia-state-prices.csv', ['rank', 'state', 'price_index_national_median_100', 'period'], MY.map((r, i) => [i + 1, r.name, r.v, r.per]));
      const body = `${kick('living')}${printBtn}<h1>Everyday prices in Malaysia's ${MY.length} states and territories</h1>
<p class="lede">The same basket of everyday items, priced by the government's PriceCatcher survey in shops across the country, compared with the national median (100). ${esc(hi.name)} is the dearest (${fmt(hi.v, 1)}), ${esc(lo.name)} the cheapest (${fmt(lo.v, 1)}), a gap of ${fmt(hi.v - lo.v, 1)} points. ${above.length ? above.map((r) => esc(r.name)).join(', ') + (above.length > 1 ? ' are' : ' is') + ' clearly above the median' : 'No state is clearly above the median'}; ${below.length ? below.map((r) => esc(r.name)).join(', ') + (below.length > 1 ? ' are' : ' is') + ' clearly below it' : 'none is clearly below it'}.</p>
${dl8(csv, MY.length)}
${C.bars(MY.map((r) => ({ label: esc(r.name), v: r.v, note: String(r.per) })), { title: 'Everyday price level by state, national median = 100', fmt: (v) => fmt(v, 1), tone: (v) => v > 101 ? 'b' : v < 99 ? 'g' : '', caption: 'Same items in every state; a figure of 105 means the basket costs about 5% more than in the median state.' })}
<p class="small muted">Every Malaysian place shows its state's figure on its card. Context only, not part of any score.</p>
${FOOT('Source: Department of Statistics Malaysia, PriceCatcher retail prices (data.gov.my, CC BY 4.0); index computed by Nestlyzer over items priced in every state.')}`;
      pageIns(PM, 'Cost of living in Malaysia: everyday prices by state', `Everyday prices in all ${MY.length} Malaysian states and federal territories against the national median, from PriceCatcher, with a free CSV.`, body, 'living', ld8(PM, 'Everyday price level of Malaysian states', 'Price index of the same everyday items per state against the national median (100), computed from the PriceCatcher survey.', csv, 'Malaysia', String(MY[0].per)));
    }
    }
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
${C.scatter(pts, { title: 'Air pollution against the renewable share of electricity' + ytag('pm25', 'renewable_power'), xl: 'Renewable share of electricity, %', xlS: 'Renewable power, %', yl: 'PM2.5 exposure, µg/m³', ylS: 'PM2.5, µg/m³', xfmt: (v) => fmt(v) + '%', yfmt: (v) => fmt(v), goodLabel: 'Clean power, clean air', badLabel: 'Dirty power, dirty air', good: 'bottom-right', labels: [...pts.slice().sort((a, b) => b.y - a.y).slice(0, 4), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 4)].map((p) => p.key),
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
<p class="lede">Moving for work comes down to two blunt questions: will I find a job, and what will it buy me? This page sets unemployment against income, shows which countries actually bring women into work, and follows unemployment since 2010, crises included.</p>
${C.scatter(pts, { title: 'Income per person against unemployment' + ytag('unemployment', 'gni_pc_ppp'), xl: 'Unemployment rate, % (ILO estimate)', xlS: 'Unemployment, %', yl: 'Income per person at purchasing power, thousand int. $', ylS: 'Income, thousand int. $', xfmt: (v) => fmt(v) + '%', yfmt: (v) => fmt(v), goodLabel: 'Rich, few out of work', badLabel: 'Poorer, more out of work', good: 'top-left', labels: [...best.slice(0, 6), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 4)].map((p) => p.key),
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
<p class="lede">Demography is destiny in slow motion. Where people move and where babies are born decides the future of house prices, school places and pension bills, long before anyone notices. Here the share of over-65s sits next to ten years of population growth, and some countries are clearly running out of young people.</p>
${C.scatter(pts, { title: 'Population growth over ten years against the share aged 65+', xl: 'Residents aged 65 and over, %', xlS: 'Aged 65+, %', yl: 'Population change over ten years, %', ylS: 'Population change, 10 yrs %', xfmt: (v) => fmt(v) + '%', yfmt: (v) => sgn(v, 0, '%'), goodLabel: 'Younger and growing', badLabel: 'Older and shrinking', good: 'top-left', labels: [...young.slice(0, 5), ...shrink.slice(0, 4), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 2)].map((p) => p.key),
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
<p class="lede">A family-friendly town in a family-hostile country is still hard work. The national rules matter as much as the playground: paid leave, childcare, whether both parents can keep working, and how safe the first year of life is. The family score combines exactly those.</p>
${C.scatter(pts, { title: 'Women in work against childcare support in the law' + ytag('female_lfp', 'childcare_support'), xl: 'Childcare support score (0–100)', xlS: 'Childcare support', yl: 'Women in the labour force, %', ylS: 'Women working, %', xfmt: (v) => fmt(v), yfmt: (v) => fmt(v) + '%', goodLabel: 'Support and work', badLabel: 'Little of either', good: 'top-right', labels: pts.slice().sort((a, b) => (b.x + b.y) - (a.x + a.y)).slice(0, 5).concat(pts.slice().sort((a, b) => a.y - b.y).slice(0, 3)).map((p) => p.key),
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
<p class="lede">How many years of a typical wage does a typical home cost? In parts of London, more than twenty: a career. In parts of the North and Scotland, about five: a decent car loan with ambition. Here is every local authority, from the sobering to the surprisingly sane.</p>
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
${C.scatter(pts, { title: 'Tax burden in 2018: single person against family, CHF 100,000 gross income (commune level)', xl: 'Single person, % of gross income', xlS: 'Single, % of income', yl: 'Married single earner, two children, % of gross income', ylS: 'Family, % of income', xfmt: (v) => fmt(v, 0) + '%', yfmt: (v) => fmt(v, 0) + '%', labels: lab, mLabels: 6, goodLabel: 'Low tax for both', badLabel: 'High tax for both', good: 'bottom-left',
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
<p class="lede">In Sweden most income tax goes to the municipality and the region, not to Stockholm, and the rates differ by several points. The twist: the richest municipalities often tax least, which is a nice position to be in if you can afford the house.</p>
${C.scatter(pts, { title: 'Median net income against the municipal income tax rate', xl: 'Municipal and regional income tax, %', xlS: 'Local income tax, %', yl: 'Median net income per adult, thousand SEK a year', ylS: 'Net income, k SEK', xfmt: (v) => fmt(v, 1) + '%', yfmt: (v) => fmtInt(v), goodLabel: 'Rich, low tax', badLabel: 'Poorer, high tax', good: 'top-left', labels: lab, mLabels: 6,
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
<p class="lede">Spain's statistics office maps income down to every municipality, which lets a mover ask two useful questions: how well off is a place, and how evenly is the money shared? Plot them together and the unequal end holds both gated suburbs and struggling villages, for very different reasons.</p>
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
<p class="lede">The 2022 census counted the rent of every flat in Germany, a rare thing to have. Next to it sits the municipal property tax multiplier, which landlords politely pass on through the service charges. Both swing widely, from quiet towns in the east to Munich, where nothing is quiet about the rent.</p>
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
      `${kick('business')}${printBtn}<h1>Labour cost against talent</h1><p class="lede">Every plant manager knows the dilemma: cheap labour or a deep pool of graduates. You rarely get both, and the countries that offer both rarely stay cheap for long. Measured with two proxies (income per person for labour cost, enrolment for skills), most countries make you choose; a few don't.</p>
${C.scatter(pts, { title: 'Income per person (labour-cost proxy) against tertiary enrolment', xl: 'Income per person at market prices, thousand US$ (labour-cost proxy)', xlS: 'Labour-cost proxy, k US$', yl: 'Tertiary enrolment, % gross', ylS: 'Tertiary enrolment, %', xfmt: (v) => fmt(v), yfmt: (v) => fmt(v) + '%', goodLabel: 'Affordable talent', badLabel: 'Costly, fewer graduates', good: 'top-left', labels: [...sweet.slice(0, 5), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 3), ...pricey.slice(0, 2)].map((p) => p.key),
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
      `${kick('business')}${printBtn}<h1>Taxes against the rule of law</h1><p class="lede">A low tax rate is a bargain only if you can enforce the contract that earns the profit. This chart sets the headline corporate tax rate against how firmly the law holds, and the best deals sit where both look good.</p>
${C.scatter(pts, { title: 'Corporate tax rate against rule of law', xl: 'Corporate income tax rate (headline), %', xlS: 'Corporate tax, %', yl: 'Rule of law and legal certainty (0–100)', ylS: 'Rule of law', xfmt: (v) => fmt(v) + '%', yfmt: (v) => fmt(v), goodLabel: 'Low tax, strong law', badLabel: 'High tax, weak law', good: 'top-left', labels: [...good.slice(0, 6), ...poor.slice(0, 3), ...pts.slice().sort((a, b) => b.x - a.x).slice(0, 2)].map((p) => p.key),
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

  /* r14: Book of Records */
  const REC = buildRecords({ ROOT, C, esc, fmt, fmtInt, nm, cl, flagImg, PAGES: H.PAGES || {}, N, NV, pageIns, kick, printBtn, FOOT, corr, strength, median, fin, list, sgn });
  /* r19: place-level stories (border towns, mergers in numbers, against the trend) */
  const STO = buildStories({ ROOT, C, esc, fmt, fmtInt, nm, flagImg, PAGES: H.PAGES || {}, pageIns, kick, printBtn, FOOT, fin });
  /* r15: A decade of change (ten chapters) */
  const CHG = buildChange({ C, esc, fmt, nm, cl, flagImg, HD, CC, pageIns, kick, printBtn, median, fin, list, sgn });
  const LNK = buildLinks({ C, esc, fmt, nm, cl, flagImg, HD, CC, pageIns, kick, printBtn, median, fin, list, corr, strength });
  /* =================================================================== HUB */
  {
    const cards = (sec) => OUT.filter((o) => o.sec === sec).map((o) => `<a class="ins-card" href="${o.p}"><b>${esc(o.title.split(':')[0])}</b><span>${esc(o.desc)}</span></a>`).join('');
    /* r10: one hub grouped by theme, with a jump bar, instead of three long lists */
    const THEMES = [['change', 'A decade of change', 'How every country moved over about ten years: health, air, jobs, prices, debt, power and more, each with the winners, the laggards and why.', /\/change-/],
      ['links', 'How things connect', 'One relationship per chapter: research and high tech, inequality and violence, wealth and clean air. Scatter plots, the countries that defy the pattern, and what it all means.', /\/links-/],
      ['people', 'People and migration', 'Who is arriving, who is leaving and how fast places age.', /migration|move|ageing|growth|ten-years|border-towns|mergers-in|against-the-trend/],
      ['housing', 'Housing and the cost of living', 'Rents, prices and what a home costs against local pay.', /rent|house|price|cost-of-living|energy|yield|property/],
      ['families', 'Families, schools and childcare', 'Where children are well provided for.', /family|childcare|school/],
      ['money', 'Work, pay and tax', 'Jobs, incomes, inequality and the tax bill.', /jobs|pay|income|tax-by|sweden|inequality|labour/],
      ['wellbeing', 'Health, safety and environment', 'How long people live, how safe they are, how clean the air is.', /health|safety|air|quality|best-places-to-live|longevity/],
      ['business', 'Business climate', 'Capital, red tape, rule of law and where companies do well.', /business|capital|red-tape|rule-of-law|location-index/]];
    const themeOf = (o) => (THEMES.find((t) => t[3].test(o.p)) || ['more'])[0];
    const card = (o) => `<a class="ins-card" href="${o.p}"><b>${esc(o.title.split(':')[0])}</b><span>${esc(o.desc)}</span></a>`;
    const listed = OUT.filter((o) => o.sec !== 'country' && o.sec !== 'hub' && o.sec !== 'records');
    const themed = () => { const used = THEMES.filter((t) => listed.some((o) => themeOf(o) === t[0])); const more = listed.filter((o) => themeOf(o) === 'more');
      return `<span id="living"></span><span id="inside"></span><nav class="chips ins-themes" aria-label="Themes" style="margin:4px 0 22px">${used.map((t) => `<a href="#${t[0]}">${t[1]} <small>${listed.filter((o) => themeOf(o) === t[0]).length}</small></a>`).join('')}${more.length ? '<a href="#more">More</a>' : ''}</nav>` +
        used.map((t) => `<h2 id="${t[0]}">${t[1]}</h2><p>${t[2]}</p><div class="ins-grid2">${listed.filter((o) => themeOf(o) === t[0]).map(card).join('')}</div>`).join('') +
        (more.length ? `<h2 id="more">More</h2><div class="ins-grid2">${more.map(card).join('')}</div>` : ''); };
    const pod = (rows, t) => `<div><b>${t}</b><ol>${rows.slice(0, 3).map((r, i) => `<li>${medal(i)} ${cl(r.cc)} <span class="muted small">${fmt(r.s)}</span></li>`).join('')}</ol></div>`;
    const body = `<h1>Insights: places in numbers</h1><p class="lede">Statistics have a reputation for being dull. We think that is mostly a presentation problem. Here are ${CC.length} countries compared on what matters to households and companies, plus deep dives inside them, all from official figures and each with a few lines on what the chart actually means. Every page works on a phone and prints as a clean PDF, should you need to win an argument offline.</p>
<a class="ins-rec" href="/insights/records/"><b>The Nestlyzer Book of Records</b><span>Biggest, smallest, highest, fastest growing and fastest shrinking places, the great metro areas compared, country anomalies and the top business clusters, all in charts.</span><em>Open the records</em></a>
<div class="ins-top">${(() => { const L = listed.filter((o) => o.sec !== 'change').map((o) => [o.p, o.title.split(':')[0], o.desc]); return `<div class="ins-today" data-cotd='${JSON.stringify(L).replace(/'/g, '&#39;')}'><small>Chart of the day</small><a href="${L[0][0]}"><b>${esc(L[0][1])}</b><span>${esc(L[0][2])}</span></a><script>(function(){try{var e=document.currentScript.parentNode,L=JSON.parse(e.dataset.cotd),d=Math.floor(Date.now()/864e5),x=L[d%L.length],a=e.querySelector('a');a.href=x[0];a.querySelector('b').textContent=x[1];a.querySelector('span').textContent=x[2];if(window.fetch&&window.DOMParser)fetch(x[0]).then(function(r){return r.ok?r.text():'';}).then(function(t){var d=new DOMParser().parseFromString(t,'text/html'),g=d.querySelector('.ins-fig .v-m svg')||d.querySelector('.ins-fig svg[role=img]');if(g){[].slice.call(g.querySelectorAll('a')).forEach(function(n){var q=d.createElementNS('http://www.w3.org/2000/svg','g');if(n.getAttribute('class'))q.setAttribute('class',n.getAttribute('class'));while(n.firstChild)q.appendChild(n.firstChild);n.replaceWith(q);});var w0=document.createElement('div');w0.className='ins-fig';w0.appendChild(document.importNode(g,true));g=w0;}else{g=d.querySelector('.ins-fig');if(!g)return;g=g.cloneNode(true);[].slice.call(g.querySelectorAll('li,tr')).slice(6).forEach(function(n){n.remove();});[].slice.call(g.querySelectorAll('a')).forEach(function(n){var s=document.createElement('span');s.innerHTML=n.innerHTML;n.replaceWith(s);});}var f=document.createElement('div');f.className='ins-today-fig';f.setAttribute('aria-hidden','true');f.appendChild(g.ownerDocument===document?g:document.importNode(g,true));a.appendChild(f);}).catch(function(){});}catch(_){}})();</script></div>`; })()}<section class="ins-dec"><h2><a href="#change">New: a decade of change</a></h2><p>${CHG.length} chapters on how ${CC.length} countries moved over about ten years. Some of it is good news nobody reports; some of it is not.</p><div class="ins-dec-l">${CHG.map((o) => `<a href="${o.p}">${esc(o.t)}</a>`).join('')}</div><h2 style="margin-top:14px"><a href="#links">New: how things connect</a></h2><div class="ins-dec-l">${LNK.map((o) => `<a href="${o.p}">${esc(o.t)}</a>`).join('')}</div></section></div>
<div class="ins-pod">${pod(lifeLeague, 'Quality of life')}${pod(league, 'Business climate')}</div>
<p class="ins-follow">New chapters arrive regularly. Follow them with the <a href="/insights/feed.xml">Insights feed</a> (works in any feed reader), or come back for the chart of the day.</p>
${themed()}
<h2>Country by country</h2><p>${lifeLeague.concat(CC.filter((cc) => !lifeLeague.some((r) => r.cc === cc)).map((cc) => ({ cc }))).map((r) => cl(r.cc)).join(' · ')}</p>
${FOOT('')}`;
    pageIns('/insights/', 'Insights: places in numbers', `Rankings, charts and trends on quality of life and business climate in ${CC.length} countries, plus municipality-level views of rents, incomes and taxes.`, body, 'hub');
    /* r15: an Atom feed of every chapter, so readers and other sites can follow new ones */
    { const x = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'), now = new Date().toISOString().slice(0, 10) + 'T00:00:00Z', all = OUT.filter((o) => o.sec !== 'country' && o.sec !== 'hub');
      fs.writeFileSync(path.join(ROOT, 'insights/feed.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"><title>Nestlyzer Insights</title><subtitle>Charts and explainers on places, countries and change over time, from official statistics.</subtitle><link href="https://nestlyzer.com/insights/"/><link rel="self" href="https://nestlyzer.com/insights/feed.xml"/><id>https://nestlyzer.com/insights/</id><updated>${now}</updated><author><name>Nestlyzer</name></author>${all.map((o) => `<entry><title>${x(o.title)}</title><link href="https://nestlyzer.com${o.p}"/><id>https://nestlyzer.com${o.p}</id><updated>${now}</updated><summary>${x(o.desc)}</summary></entry>`).join('')}</feed>\n`); }
  }
  return { n: OUT.length, lifeTop: lifeLeague.slice(0, 3).map((r) => r.cc), bizTop: league.slice(0, 3).map((r) => r.cc), living: OUT.filter((o) => o.sec === 'living' || o.sec === 'inside').map((o) => [o.p, o.title.split(':')[0]]), business: OUT.filter((o) => o.sec === 'business').map((o) => [o.p, o.title.split(':')[0]]) };
}
