/* r15: "How things connect". Ten Insights chapters, each one relationship between two country figures, drawn as a
   scatter with the typical line, the countries that beat or miss it, and an essay on what the link does and does not mean.
   Latest values from the World Bank World Development Indicators (CC BY 4.0), the same series as data/h. */
const L10 = (v) => Math.log10(v);
import { cardDesc } from './insights_change.mjs';
export const LINKS = [
  { slug: 'links-research-and-high-tech', x: 'rnd', y: 'hightech', short: 'Research and high tech', title: 'Does research spending buy a high-tech economy?',
    lede: 'Governments love to promise a research budget of three per cent of GDP. The chart shows what the countries that actually spend it get in return, and the surprising ones that export high tech without the lab bill.',
    essay: ['The link is real but loose. Countries that spend heavily on research tend to sell more high-tech goods, because the same engineers who run the experiments later run the production lines. Korea, Israel and Switzerland sit where you would expect them.',
      'The interesting cases are off the line. Some countries export a lot of high tech while spending little on research: they assemble what others designed, which brings jobs and exports but leaves the valuable part of the chain elsewhere. Others spend generously and export little high tech, because their research feeds services, medicine or software, which this export figure does not count.',
      'For a company choosing a site, the lesson is to look at both. Research spending says whether ideas are made locally; the export share says whether products are. The best places for a lab and the best places for a plant are often not the same country.'] },
  { slug: 'links-income-and-women-at-work', x: 'gdp_pc_ppp', y: 'female_lfp', logx: true, short: 'Income and women at work', title: 'Do richer countries put more women to work?',
    lede: 'You might expect women’s employment to climb steadily with income. It does not. The chart is shaped more like a smile than a line, and the reasons say a lot about family policy.',
    essay: ['In poor countries many women work because every income counts, often on the family farm or in informal trade. As countries get richer, that share first falls, as households can live on one wage and farms empty out. Then, at higher incomes, it rises again, as education, services jobs and childcare pull women back into paid work.',
      'Policy decides where a country lands on that curve. The Nordic countries combine high incomes with very high participation, built on decades of paid parental leave, cheap childcare and individual taxation. Some equally rich countries lag behind because the tax and school system still assume one earner and a parent at home at lunchtime.',
      'For a family thinking of moving, this is not an abstract statistic. It predicts how easy it will be for both partners to work, how long the nursery waiting list is and whether part-time work is respected or a career dead end.'] },
  { slug: 'links-inequality-and-violence', x: 'gini', y: 'homicide', logy: true, short: 'Inequality and violence', title: 'Unequal and unsafe: the link between income gaps and murder',
    lede: 'Few relationships in social science are as consistent as this one. Where incomes are very unequal, homicide rates tend to be higher, often far higher. The chart uses a log scale for murder, because otherwise half the countries would disappear at the bottom.',
    essay: ['The usual explanation is not that poverty makes people violent. It is that steep inequality weakens the things that keep conflict peaceful: trust in police and courts, a stake in the system, a sense that effort pays. Where those are thin, disputes and organised crime fill the gap.',
      'The pattern holds across continents but with large exceptions. Some fairly unequal countries are very safe, usually thanks to strong institutions and low gun ownership. Some fairly equal ones have higher violence than their income gap predicts, often because of drug routes running through them.',
      'For someone choosing where to live, national averages hide a lot: in most countries, violence is concentrated in a few districts. But the national pattern tells you how much the state is likely to protect you once you step outside those districts.'] },
  { slug: 'links-debt-and-interest', x: 'gov_debt', y: 'real_interest', short: 'Debt and interest', title: 'Does a big public debt mean expensive money?',
    lede: 'Textbooks say a government that borrows a lot should pay more for it, and so should everyone else in the country. The chart shows that markets are far less mechanical than that.',
    essay: ['Debt alone tells markets little. What they price is whether the debt will be repaid in money that keeps its value. A country with a large debt in its own trusted currency, a central bank with a good record and steady growth can borrow cheaply for decades. A country with a modest debt but a history of inflation or default pays much more.',
      'That is why the dots barely line up. The real interest rate, the rate after inflation, is shaped by central bank policy, by how much people save, and by trust. Japan is the famous example of huge debt and low rates; several emerging economies show the opposite.',
      'For a home buyer or a company, the real interest rate matters more than the debt headline. It decides whether a mortgage or an expansion loan is a manageable cost or a gamble on future inflation.'] },
  { slug: 'links-cities-and-wealth', x: 'urban', y: 'gdp_pc_ppp', logy: true, short: 'Cities and wealth', title: 'Cities and wealth: no rich country stayed rural',
    lede: 'Look at the bottom right of the chart: it is empty. There is no country where most people live in cities and incomes stay low for long, and no rich country where most people still live on the land.',
    essay: ['Cities make people more productive because they put workers, customers and ideas close together. A software developer in a city of millions can switch employers without moving house; a supplier finds ten clients in one afternoon. That density is the engine economists call agglomeration.',
      'The arrow runs both ways, though. Growth pulls people into cities, and cities then speed growth up. Some countries urbanised fast without getting much richer, because people fled poverty in the countryside rather than being drawn by jobs in town. Their dots sit low on the chart.',
      'For a mover, the chart is a reminder that income and urban life usually come together, and so do their costs: rents, commutes and competition. The best deals tend to be the mid-sized cities that have the jobs but not yet the prices.'] },
  { slug: 'links-broadband-and-income', x: 'gdp_pc_ppp', y: 'broadband', logx: true, short: 'Broadband and income', title: 'The broadband divide follows the money, mostly',
    lede: 'Fixed broadband tracks income closely, almost as closely as anything on this site. The exceptions are revealing: a few countries are far better connected than their income suggests, a few far worse.',
    essay: ['A fixed line needs cables to every house and households that can pay every month, so it grows with income. Among the richest countries most have 30 or more lines per 100 people, which, with several people per household, means nearly every home.',
      'Below the line sit countries that skipped fixed lines and went mobile. Their people are online, often on fast mobile networks, but a home office on a phone signal is a different thing from one on fibre. Above the line sit countries where the state or a cooperative pushed fibre into villages, in Eastern Europe and Asia especially.',
      'For a remote worker, the national figure is only a first filter. The second is the street itself: ask about fibre before you sign the lease, not after.'] },
  { slug: 'links-hospital-beds-and-life', x: 'beds', y: 'life_exp', short: 'Hospital beds and long lives', title: 'Do more hospital beds mean longer lives?',
    lede: 'It seems obvious that more hospital capacity should mean longer lives. The chart suggests otherwise: beyond a modest level, the number of beds says little about how long people live.',
    essay: ['Life expectancy in rich countries is decided more by what happens outside the hospital than inside it: what people eat, whether they smoke, how safe the roads are, how unequal incomes are and how early illnesses are caught by a family doctor.',
      'Beds also measure different things in different places. Japan and Korea keep many beds because long stays are normal there, including for care that elsewhere happens at home or in a nursing facility. Several Nordic countries have few beds and long lives, because they treat many patients as day cases.',
      'Where beds do matter is at the low end. Below about two per 1,000 people, the shortage usually shows in waiting times and in outcomes. For a retiree comparing countries, the family doctor network and the waiting lists are better guides than the bed count.'] },
  { slug: 'links-ageing-and-the-state', x: 'age65', y: 'gov_expense', short: 'Ageing and the state', title: 'Older countries, bigger governments?',
    lede: 'Pensions and health care for older people are the biggest items in most rich-country budgets. So you would expect older countries to have bigger states. They do, roughly, but the spread is wide.',
    essay: ['Ageing pushes public spending up through pensions, health care and long-term care. Countries with many over-65s mostly spend a larger share of their economy through the state, especially in Europe, where these systems are largely public.',
      'The spread shows how much is a choice. Some old countries keep government spending modest by relying on private pensions, family care or later retirement. Some younger countries spend heavily for other reasons, such as defence, oil wealth or a large public sector.',
      'The chart is a preview of the next twenty years. Countries that are young today but ageing fast will face the same pressure. For anyone planning a long stay, it hints at where taxes and contributions are likely to go.'] },
  { slug: 'links-education-spending-and-university', x: 'edu_spend', y: 'tertiary', short: 'Education spending and university', title: 'Does spending on education fill the universities?',
    lede: 'More money for schools and universities should mean more students. The chart shows that the link is weak, and that the countries with the most students are not always the ones that pay the most.',
    essay: ['Public education spending mostly goes to primary and secondary schools, where every child is enrolled anyway. University enrolment depends on other things: tuition fees, student loans, whether vocational training is a respected alternative, and how much families are willing to pay themselves.',
      'Germany, Switzerland and Austria, for instance, send many young people into apprenticeships rather than university, so their enrolment figure looks modest despite well-funded systems and strong skills. Korea and some American and Latin American systems rely heavily on private spending, which this public figure does not count.',
      'For an employer, the useful question is not how much a country spends but what kind of skills it produces: graduates, technicians or both. That is why the labour-cost page sets incomes against enrolment rather than trusting either figure alone.'] },
  { slug: 'links-wealth-and-clean-air', x: 'gdp_pc_ppp', y: 'pm25', logx: true, short: 'Wealth and clean air', title: 'Get rich, then clean up? Income and air pollution',
    lede: 'Economists have a name for it: the environmental Kuznets curve. Pollution rises as countries industrialise, then falls as they get rich enough to care and to pay for filters. The chart shows the second half clearly, with some striking exceptions.',
    essay: ['Rich countries mostly breathe cleaner air because they moved heavy industry elsewhere, switched from coal to gas and renewables, and passed strict rules on vehicles and power plants. That last part is a choice, not an automatic result of wealth.',
      'The exceptions prove it. Some rich Gulf states have very polluted air, partly from desert dust that no regulation can stop, partly from energy-heavy industry. Some middle-income countries have cleaner air than their income predicts thanks to hydropower, wind or geography.',
      'For a family, the national figure is only a start: air quality varies strongly between a valley town and a coastal one. Nestlyzer shows local air data on place pages where it is measured.'] },
];

export function buildLinks(X) {
  const { C, esc, fmt, nm, cl, flagImg, HD, CC, pageIns, kick, printBtn, median, fin, list, corr, strength } = X;
  const SER = (cc, id) => ((HD[cc] || {}).series || []).find((s) => s.id === id);
  const latest = (s) => s && s.y && s.y.length ? s.y[s.y.length - 1] : null;
  const pages = [];
  for (const T of LINKS) {
    const rows = [];
    for (const cc of CC) { const sx = SER(cc, T.x), sy = SER(cc, T.y), a = latest(sx), b = latest(sy); if (!a || !b || !fin(a[1]) || !fin(b[1])) continue; if ((T.logx && a[1] <= 0) || (T.logy && b[1] <= 0)) continue;
      rows.push({ cc, x: T.logx ? L10(a[1]) : a[1], y: T.logy ? L10(b[1]) : b[1], rx: a[1], ry: b[1], yx: a[0], yy: b[0], lx: sx.label, ly: sy.label, ux: sx.unit, uy: sy.unit }); }
    if (rows.length < 15) continue;
    const xs = rows.map((r) => r.x), ys = rows.map((r) => r.y), mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const sxx = xs.reduce((t, v) => t + (v - mx) ** 2, 0), slope = sxx ? rows.reduce((t, r) => t + (r.x - mx) * (r.y - my), 0) / sxx : 0, icpt = my - slope * mx;
    rows.forEach((r) => { r.res = r.y - (icpt + slope * r.x); });
    const r = corr(xs, ys), sw = (q) => { const a = Math.abs(q), d = q >= 0 ? 'positive' : 'negative'; return a >= 0.7 ? 'strong and ' + d : a >= 0.4 ? 'clear and ' + d : a >= 0.2 ? 'weak and ' + d : 'barely there'; }, byRes = rows.slice().sort((a, b) => b.res - a.res), above = byRes.slice(0, 4), below = byRes.slice(-4).reverse();
    const fx = (v) => T.logx ? fmt(10 ** v, 10 ** v >= 1000 ? 0 : 1) : fmt(v, Math.abs(v) < 10 ? 1 : 0), fy = (v) => T.logy ? fmt(10 ** v, 10 ** v < 10 ? 1 : 0) : fmt(v, Math.abs(v) < 10 ? 1 : 0);
    const lab = rows[0];
    const scat = C.scatter(rows.map((o) => ({ key: o.cc, name: nm(o.cc), x: o.x, y: o.y })), { title: `${lab.ly} against ${lab.lx.toLowerCase()}`, xl: `${lab.lx} (${lab.ux})${T.logx ? ', log scale' : ''}`, xlS: lab.lx, yl: `${lab.ly} (${lab.uy})${T.logy ? ', log scale' : ''}`, ylS: lab.ly, xfmt: fx, yfmt: fy, trend: true,
      labels: [...above, ...below].map((o) => o.cc), mLabels: 6, caption: `Each dot is a country. The curve shows the typical value along the axis; dashed lines mark the median country. Correlation r = ${fmt(r, 2)}: the link is ${sw(r)}.` });
    const resid = C.bars([...above, ...below].map((o) => ({ label: `${flagImg(o.cc, 12)}${esc(nm(o.cc))}`, v: o.res, note: `${fy(o.y)} ${o.uy}` })), { title: `Furthest above and below the typical line`, fmt: (v) => (v >= 0 ? '+' : '−') + fmt(Math.abs(v), T.logy ? 2 : 1) + (T.logy ? ' (log)' : ''), noMedal: true, tone: (v) => v >= 0 ? 'g' : 'b' });
    const table = C.league(['Country', lab.lx, lab.ly], rows.slice().sort((a, b) => b.ry - a.ry).map((o) => [cl(o.cc), `${fmt(o.rx, Math.abs(o.rx) < 10 ? 1 : 0)} <small>${o.yx}</small>`, `${fmt(o.ry, Math.abs(o.ry) < 10 ? 1 : 0)} <small>${o.yy}</small>`]));
    const take = `Across ${rows.length} countries the link is ${sw(r)} (r = ${fmt(r, 2)}). Furthest above the line: ${list(above.slice(0, 3).map((o) => esc(nm(o.cc))))}. Furthest below: ${list(below.slice(0, 3).map((o) => esc(nm(o.cc))))}.`;
    const p = '/insights/' + T.slug + '/';
    const body = `${kick('living')}${printBtn}<p class="ins-series"><a href="/insights/#links">How things connect</a></p><h1>${esc(T.title)}</h1><p class="lede">${esc(T.lede)}</p>
<div class="nz-take"><p>${take}</p></div>
${scat}
<div class="ins-essay">${T.essay.map((t, i) => `<p${i === 0 ? ' class="first"' : ''}>${esc(t)}</p>`).join('')}</div>
<h2>Who beats the pattern, who misses it</h2>${resid}
<p class="small muted">A correlation is not a cause. Two figures can move together because a third thing drives both, and a country can sit off the line for reasons this chart cannot show. Read it as a question worth asking, not an answer.</p>
<h2>Every country</h2>${table}
<p class="small">More in the series: ${LINKS.filter((o) => o !== T).map((o) => `<a href="/insights/${o.slug}/">${esc(o.short)}</a>`).join(' · ')}.</p>
<p class="ins-note" style="margin-top:22px">Source: World Bank, World Development Indicators (CC BY 4.0), latest year per country (shown in the table). Free to cite with a link to this page.</p>`;
    pageIns(p, T.title, cardDesc(T.lede, `${rows.length} countries; the link is ${sw(r).replace(' and ', ', ')}.`), body, 'links');
    pages.push({ p, t: T.short, n: rows.length, r });
  }
  return pages;
}
