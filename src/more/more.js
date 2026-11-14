/* Loaded on demand (assets/more.js). All data: every number Nestlyzer holds for a place, grouped by theme, for the place panel ("All data" tab) and
   for compare ("Show all data"). Plus country facts, earthquakes (USGS) and the data catalogue.
   Nothing in this file changes a score. */

/* country facts: EU, euro, Schengen, currency, standard VAT rate (%), drives on the left */
var CFACTS = {
  AL: [0, 0, 0, 'Albanian lek (ALL)', 20], AT: [1, 1, 1, 'Euro', 20], BE: [1, 1, 1, 'Euro', 21], BG: [1, 1, 1, 'Euro (since January 2026)', 20],
  CH: [0, 0, 1, 'Swiss franc (CHF)', 8.1], CY: [1, 1, 0, 'Euro', 19, 1], CZ: [1, 0, 1, 'Czech koruna (CZK)', 21], DE: [1, 1, 1, 'Euro', 19],
  DK: [1, 0, 1, 'Danish krone (DKK)', 25], EE: [1, 1, 1, 'Euro', 24], EL: [1, 1, 1, 'Euro', 24], ES: [1, 1, 1, 'Euro', 21], FI: [1, 1, 1, 'Euro', 25.5],
  FR: [1, 1, 1, 'Euro', 20], HR: [1, 1, 1, 'Euro', 25], HU: [1, 0, 1, 'Hungarian forint (HUF)', 27], IE: [1, 1, 0, 'Euro', 23, 1],
  IS: [0, 0, 1, 'Icelandic króna (ISK)', 24], IT: [1, 1, 1, 'Euro', 22], LI: [0, 0, 1, 'Swiss franc (CHF)', 8.1], LT: [1, 1, 1, 'Euro', 21],
  LU: [1, 1, 1, 'Euro', 17], LV: [1, 1, 1, 'Euro', 21], MK: [0, 0, 0, 'Macedonian denar (MKD)', 18], MT: [1, 1, 1, 'Euro', 18, 1],
  NL: [1, 1, 1, 'Euro', 21], NO: [0, 0, 1, 'Norwegian krone (NOK)', 25], PL: [1, 0, 1, 'Polish złoty (PLN)', 23], PT: [1, 1, 1, 'Euro', 23],
  RO: [1, 0, 1, 'Romanian leu (RON)', 21], RS: [0, 0, 0, 'Serbian dinar (RSD)', 20], SE: [1, 0, 1, 'Swedish krona (SEK)', 25],
  SI: [1, 1, 1, 'Euro', 22], SK: [1, 1, 1, 'Euro', 23], UK: [0, 0, 0, 'Pound sterling (GBP)', 20, 1],
  US: [0, 0, 0, 'US dollar (USD)', null], CA: [0, 0, 0, 'Canadian dollar (CAD)', 5], JP: [0, 0, 0, 'Japanese yen (JPY)', 10, 1], KR: [0, 0, 0, 'South Korean won (KRW)', 10],
  TW: [0, 0, 0, 'New Taiwan dollar (TWD)', 5], HK: [0, 0, 0, 'Hong Kong dollar (HKD)', 0, 1], SG: [0, 0, 0, 'Singapore dollar (SGD)', 9, 1], AU: [0, 0, 0, 'Australian dollar (AUD)', 10, 1],
  NZ: [0, 0, 0, 'New Zealand dollar (NZD)', 15, 1], IL: [0, 0, 0, 'Israeli new shekel (ILS)', 18],
  BR: [0, 0, 0, 'Brazilian real (BRL)', null], MX: [0, 0, 0, 'Mexican peso (MXN)', 16], MY: [0, 0, 0, 'Malaysian ringgit (MYR)', null, 1], ID: [0, 0, 0, 'Indonesian rupiah (IDR)', 12],
  MA: [0, 0, 0, 'Moroccan dirham (MAD)', 20], ZA: [0, 0, 0, 'South African rand (ZAR)', 15, 1], IN: [0, 0, 0, 'Indian rupee (INR)', null, 1], CN: [0, 0, 0, 'Chinese yuan (CNY)', 13],
  AE: [0, 0, 0, 'UAE dirham (AED)', 5]
};
/* combined statutory corporate income tax rate 2025 (Tax Foundation, Corporate Tax Rates around the World 2025;
   Poland: national CIT rate). Rule of law, property rights and funding costs are not in the data yet. */
var CIT = { AL: 15, AT: 23, BE: 25, BG: 10, CH: 19.61, CY: 12.5, CZ: 21, DE: 30.06, DK: 22, EE: 22, EL: 22, ES: 25, FI: 20, FR: 36.13, HR: 18, HU: 9, IE: 12.5, IS: 20, IT: 27.81, LI: 12.5, LT: 16, LU: 23.87, LV: 20, MK: 10, MT: 35, NL: 25.8, NO: 22, PL: 19, PT: 30.5, RO: 16, RS: 15, SE: 20.6, SI: 22, SK: 24, UK: 25,
  US: 25.57, CA: 25.98, JP: 29.74, KR: 26.4, TW: 20, HK: 16.5, SG: 17, AU: 30, NZ: 28, IL: 23, BR: 34, MX: 30, MY: 24, ID: 22, ZA: 27, IN: 25.17, CN: 25, AE: 9 };
/* outside Europe: what the consumption tax is called, how it works, and the emergency numbers */
var WFACTS = {
  US: ['Sales tax', 'No national VAT; states and cities set their own sales tax (0% to about 10%)', '911'],
  CA: ['GST', '5% federal GST, plus provincial sales tax in most provinces (combined HST up to 15%)', '911'],
  JP: ['Consumption tax', '10% (8% on food and newspapers)', '110 police, 119 fire and ambulance'],
  KR: ['VAT', '10%', '112 police, 119 fire and ambulance'],
  TW: ['Business tax (VAT)', '5%', '110 police, 119 fire and ambulance'],
  HK: ['Sales tax', 'none: Hong Kong has no VAT or sales tax', '999'],
  SG: ['GST', '9%', '999 police, 995 fire and ambulance'],
  AU: ['GST', '10%', '000'],
  NZ: ['GST', '15%', '111'],
  IL: ['VAT', '18%', '100 police, 101 ambulance, 102 fire'],
  BR: ['Consumption taxes', 'no single VAT: state ICMS and federal IPI, PIS and COFINS (a dual VAT is being phased in from 2026)', '190 police, 192 ambulance, 193 fire'],
  MX: ['VAT (IVA)', '16% (8% in the northern border zone)', '911'],
  MY: ['Sales and service tax', 'sales tax 5% or 10%, service tax 6% or 8%', '999'],
  ID: ['VAT (PPN)', '12% on luxury goods, effectively 11% on most others', '112, 110 police, 118 ambulance, 113 fire'],
  MA: ['VAT (TVA)', '20% (reduced rates 7%, 10%, 14%)', '19 police, 15 ambulance and fire'],
  ZA: ['VAT', '15%', '10111 police, 10177 ambulance, 112 from mobiles'],
  IN: ['GST', 'mainly 5% and 18% since September 2025 (40% on luxury and sin goods)', '112'],
  CN: ['VAT', '13% (9% and 6% on some goods and services)', '110 police, 120 ambulance, 119 fire'],
  AE: ['VAT', '5%', '999 police, 998 ambulance, 997 fire']
};
var AD_GROUPS = [['fit', 'Score and ranking'], ['people', 'People'], ['family', 'Children and family'], ['money', 'Income, costs and taxes'], ['ctx', 'Country economy, institutions and business'], ['safety', 'Safety and health'], ['life', 'Everyday life nearby'], ['move', 'Getting around'], ['land', 'Land, water and climate'], ['risk', 'Risks to check'], ['know', 'Good to know'], ['ids', 'Codes and location'], ['hpl', 'Housing, pay and labour costs (context)'], ['others', 'Compare profiles: this place scored for other households (model outputs, not facts)']];
var AD_CAT = { foundation: 'people', demographics: 'people', family: 'family', tax: 'money', affordability: 'money', realestate: 'money', jobs: 'money', governance: 'money', safety: 'safety', health: 'safety', mobility: 'move', commuter_access: 'move', student_access: 'move', lifestyle: 'life', environment: 'land', coast: 'land' };
var AD_PGROUP = { people: 'people', access: 'move', nature: 'land', sky: 'land' };
/* factors that duplicate a parameter: shown once, as the parameter, with the factor's score */
var AD_DUP = { city: 'geo_major_city_km', air: 'geo_hub_airport_km', c30: 'geo_catchment_30km', coast: 'geo_coast_km', g5: 'common_population_growth_5y', pop: 'common_population_scale', dens: 'common_density_balance' };
var AD_DUPF = { common_low_crowding: 1, density_people_km2: 1, population_growth_pct: 1 };
/* live rows: regional statistics (REG_DEF keys) placed into groups */
var AD_REG = { kids: 'family', fert: 'family', medage: 'people', old: 'people', foreign: 'people', gdp: 'money', income: 'money', poverty: 'money', unemp: 'money', tert: 'money', life: 'safety', docs: 'safety', crime: 'safety' };

/* source line for a factor: per-country publisher and period (2.8 data) and whether the value is local or regional */
var AD_LVL = { 0: '', 3: 'district value', 2: 'regional value', 1: 'large-region value', 9: 'national value' };
function adSrc(f, r) {
  var b = f.by_country && f.by_country[r.country], lv = r.factorLevel && r.factorLevel[f.id];
  if (!b) return (f.source_name || '') + (f.source_period ? ', ' + String(f.source_period).replace(/\s*snapshot in embedded build/i, '') : '');
  var world = isWorld(r.country), lvl = lv === 3 && r.country === 'US' ? 'county value' : lv === 3 && r.country === 'IL' ? 'regional council value' : lv === 3 && r.country === 'PT' ? 'municipality value' : lv === 3 && r.country === 'UK' && /^S30/.test(r.oid) ? 'council area value' : AD_LVL[lv];
  var reg = !world && (lv === 3 || lv === 2 || lv === 1) && r.n3 ? ' for ' + (lv === 3 ? nutsName(r.n3) : lv === 2 ? nutsName(r.n2) : nutsName(r.n1)) : world && lv === 2 && r.n2 ? ' for ' + nutsName(r.n2) : '';
  return [b.source_name + (b.dataset ? ', ' + b.dataset : ''), b.period, lvl ? lvl + reg : ''].filter(Boolean).join(', ') + (f.scope === 'country' ? '; compared within ' + countryName(r.country) : '');
}
function trim0(s) { return String(s).replace(/(\d)\.0(?=\D|$)/g, '$1'); }
function adFmtRaw(f, raw) { var v = adFmtRaw0(f, raw); return v == null ? v : trim0(v); }
function adFmtRaw0(f, raw) {
  if (!fin(raw)) return null;
  var u = f.unit || '', d = Math.abs(raw) < 10 ? 2 : Math.abs(raw) < 100 ? 1 : 0;
  if (/^%|percent/i.test(u)) return fmt(raw, 1) + '%';
  if (f.fmt === 'int') return fmtInt(raw) + (u ? ' ' + u : '');
  if (Math.abs(raw) >= 1000) return fmtInt(raw) + (u ? ' ' + u : '');
  return fmt(raw, d) + (u ? ' ' + u : '');
}
/* the local rows for one place: { g, k, label, val, src } */
/* country and state context (data/context.json, built by build/build_context.py): every value keeps its own
   period and source; nothing here is scored, summed or turned into an "effective burden" */
var CTX = null, CTX_READY = fetch('/data/context.json?v=__VERSION__').then(function (x) { if (!x.ok) throw 0; return x.json(); }).then(function (d) { CTX = d; }).catch(function () { CTX = null; });
/* the KPI framework (data/kpis.json): which key figures each profile compares */
/* US port size (data/ports.json, BTS Port Performance 2026): context for the nearest port, never a score input */
var PSTAT = null;
function portSizeRows(name, add) {
  var P = PSTAT && PSTAT.ports[name]; if (!P) return;
  P.forEach(function (e) {
    var m = e[1], t = [];
    if (fin(m.cargo)) t.push(fmt(m.cargo, 1) + ' million short tons of cargo');
    if (fin(m.teu)) t.push(fmtInt(m.teu * 1000) + ' loaded containers (TEU)');
    var c = [];
    if (fin(m.cranes)) c.push(fmtInt(m.cranes) + ' ship-to-shore cranes');
    if (fin(m.terms)) c.push(fmtInt(m.terms) + ' container terminal' + (m.terms === 1 ? '' : 's'));
    if (fin(m.rail)) c.push(fmtInt(m.rail) + ' with on-dock rail');
    add('Port size: ' + e[0], t.join(', ') || c.join(', '), null, t.length ? '2023' + (c.length ? '; ' + c.join(', ') + ' (2025)' : '') : '2025', 'U.S. Bureau of Transportation Statistics, Port Performance 2026; context, not scored');
  });
}
CTX_READY = Promise.all([CTX_READY, fetch('/data/ports.json?v=__VERSION__').then(function (x) { if (!x.ok) throw 0; return x.json(); }).then(function (d) { PSTAT = d; }).catch(function () { PSTAT = null; })]);
var KPIX = null; CTX_READY = Promise.all([CTX_READY, fetch('/data/kpis.json?v=__VERSION__').then(function (x) { if (!x.ok) throw 0; return x.json(); }).then(function (d) { KPIX = d; }).catch(function () { KPIX = null; })]);
var CTX_ECON = [['gdp_current_usd_billion', 'Economy (GDP, current US dollars)', function (v) { return 'USD ' + fmt(v, 1) + ' billion'; }], ['services_va_pct_gdp', 'Services, share of the economy', null], ['industry_va_pct_gdp', 'Industry incl. construction, share of the economy', null], ['manufacturing_va_pct_gdp', 'Manufacturing (part of industry), share of the economy', null], ['agriculture_va_pct_gdp', 'Agriculture, forestry and fishing, share', null]];
var CTX_VDEM = [['vdem_ldi', 'Liberal democracy index'], ['vdem_lci', 'Liberal component (rule of law, checks on government)'], ['vdem_edi', 'Electoral democracy index'], ['vdem_pci', 'Participatory component'], ['vdem_dci', 'Deliberative component'], ['vdem_eci', 'Egalitarian component']];
function ctxSrc(id, period) { var s = CTX && CTX.sources[id]; return (s ? s.provider + (s.title ? ', ' + s.title : '') : id) + (period ? ', ' + period : ''); }
function ctxRows(r, add) {
  if (!CTX) return;
  var c = CTX.countries[r.country] || {}, cn = countryName(r.country), e = c.economy || {}, t = c.taxes || {};
  CTX_ECON.forEach(function (d) { var m = e[d[0]]; if (m) add('ctx', 'cx:' + d[0], d[1] + ' (' + cn + ')', d[2] ? d[2](m.value) : fmt(m.value, 1) + '%', ctxSrc(m.source_id, m.period) + (d[0] === 'gdp_current_usd_billion' ? '; current US dollars, not adjusted for prices' : '')); });
  CTX_VDEM.forEach(function (d) { var m = e[d[0]]; if (m) add('ctx', 'cx:' + d[0], 'Political institutions: ' + d[1], fmt(m.value, 2) + ' of 1', 'V-Dem v16, ' + m.period + (fin(m.sd) ? ', uncertainty ±' + fmt(m.sd, 3) : '') + '; describes institutions, not business risk (CC BY-SA)'); });
  var TX = ['top_income_rate', 'threshold_top_income_rate', 'capital_gains_rate', 'dividends_rate', 'net_wealth', 'estate_or_inheritance_tax', 'transfer_tax'];
  TX.forEach(function (k) { var m = t[k]; if (!m) return; var v = m.unit === 'flag' ? (m.value >= 1 ? 'Yes' : m.value > 0 ? 'On some assets only' : 'No') : m.unit === 'percent' ? fmt(m.value, 1) + '%' : fmt(m.value, 2) + ' × the average wage';
    add('money', 'tx:' + k, m.label + ' (' + cn + ')', v, 'Tax Foundation ITCI ' + m.period + ' edition, from OECD and national sources; national level' + (k === 'top_income_rate' ? '; a top marginal rate, not what a typical household pays' : '')); });
  (c.tax_rules || []).forEach(function (x, i) { add('money', 'tr:' + i, x.name + ' (' + cn + ')', fmt(x.rate_percent, 2) + '%', x.scope + '. ' + x.conditions + ' Checked ' + x.observed_at + '.'); });
  (c.funding || []).forEach(function (x, i) { add('ctx', 'fu:' + i, 'Support programme: ' + x.name, x.status.replace(/_/g, ' '), x.conditions + ' Status checked ' + x.status_verified_at + '; eligibility is decided case by case.'); });
  if (r.country === 'US' && r.n2) {
    var st = CTX.states[stripParen(nutsName(r.n2))];
    if (st) {
      CTX.industries.forEach(function (ind) { if (ind.id === 'total' || !fin(st.jobs[ind.id])) return; add('ctx', 'us:' + ind.id, ind.label + ' jobs in the state', fmtInt(st.jobs[ind.id] * 1000) + (fin(st.lq[ind.id]) ? ' (concentration ' + fmt(st.lq[ind.id], 2) + '× the US share)' : ''), 'BLS payroll jobs, ' + st.employment_period + '; concentration (location quotient) against 50 states plus DC'); });
      if (fin(st.power.industrial)) add('ctx', 'us:pwi', 'Electricity price for industry in the state', fmt(st.power.industrial, 2) + ' US cents per kWh', 'EIA, ' + st.electricity_period + '; sector average, not a tariff quote');
      if (fin(st.power.residential)) add('money', 'us:pwr', 'Household electricity price in the state', fmt(st.power.residential, 2) + ' US cents per kWh', 'EIA, ' + st.electricity_period + '; average for homes');
    }
  }
}
function adRows(r) {
  var out = [], x = placeX(r), fr = r.factorRaw || {}, fsc = r.factorScores || {};
  var frk = RES ? RES.factorRanks || {} : {}, crk = RES ? RES.categoryRanks || {} : {};
  function add(g, k, label, val, src) { if (val == null || val === '' || val === '–') return; out.push({ g: g, k: k, label: label, val: String(val), src: src || '' }); }
  var ranked = RES && RES.byId[r.id], p = profileDef(S.profile);
  /* score and ranking */
  add('fit', 'score', 'Score for ' + (p ? p.name : 'this profile'), fin(x.overall) ? fmt(x.overall) + ' of 100' : null, 'Nestlyzer, method ' + (S.method || 'v2'));
  add('fit', 'rank', 'Rank', ranked ? '#' + fmtInt(ranked.rank) + ' of ' + fmtInt(RES.scored.length) : 'not ranked', ranked ? 'in ' + scopeName() : '');
  add('fit', 'cover', 'Share of this profile\'s weight with data', fin(x.weighted) ? x.weighted + '%' : null, 'coverage');
  add('fit', 'measured', 'Share of this profile\'s weight measured here (not estimated)', fin(x.measured) ? x.measured + '%' : null, 'coverage');
  add('fit', 'assess', 'Assessment', fin(x.weighted) ? assessKind(x)[1] : null, 'coverage');
  add('fit', 'conf', 'Source confidence', fin(r.sourceConfidence) ? fmt(r.sourceConfidence) + '%' : null, depthKind(r.country)[1]);
  var w = ENGINE.weightsFor(r, S.profile) || {}, cats = x.catScores || ENGINE.categories(r);
  Object.keys(cats).filter(function (k) { return fin(cats[k]); }).sort(function (a, b) { return (w[b] || 0) - (w[a] || 0) || cats[b] - cats[a]; }).forEach(function (k) {
    var rk = crk[k] && crk[k][r.id];
    add('fit', 'cat:' + k, shortCat(k), fmt(cats[k]) + ' of 100', (w[k] ? 'weight ' + w[k] : 'not weighted in this profile') + (rk ? ', #' + rk : '') + (r._proxy && r._proxy[k] ? ' · ' + r._proxy[k] : ''));
  });
  /* the score for every household type, so you can see who this place suits best */
  (META.config.order || []).filter(function (k) { return ENGINE.profiles[k] && k !== S.profile; }).map(function (k) { var o = ENGINE.scoreRaw(r, k, 0, r.country); return [k, o && o.score]; }).filter(function (a) { return fin(a[1]); }).sort(function (a, b) { return b[1] - a[1]; }).forEach(function (a) {
    add('others', 'prof:' + a[0], 'Score as ' + ENGINE.profiles[a[0]].name, fmt(a[1]) + ' of 100', 'same data, that household\'s weights');
  });
  add('fit', 'nf', 'Scored factors available', fin(r.availableFactorCount) ? String(r.availableFactorCount) : null, 'number of official fields joined for this place');
  /* parameters */
  PARAMS.forEach(function (pp) {
    var v = pval(r, pp.k); if (v == null) return;
    var nm = pp.name ? pp.name(r) : null, pc = pctOf(r, pp.k), fid = AD_DUP[pp.k], f = fid && ENGINE.factorById[fid];
    var val = pp.k === 'city' && v < 1 && r.popNow >= 100000 ? 'it is one' : pfmt(pp.k, v);
    var src = (pc != null ? 'higher than ' + pc + '% of ' + demonym(r.country) + ' ' + unitWord(r.country) : '') + (f && fin(fsc[fid]) ? (pc != null ? '; ' : '') + 'scored ' + fmt(fsc[fid]) : '');
    add(AD_PGROUP[pp.group] || 'know', 'p:' + pp.k, pp.label, val + (nm ? ' (' + nm + ')' : ''), src);
  });
  var d10 = (r.factorRaw || {}).geo_density10_km2;
  if (fin(d10)) add('people', 'd10', 'People per km² within 10 km', fmtInt(d10), 'GeoNames places within 10 km (whole-city entries not counted twice); measures crowding' + (fin(fsc.common_low_crowding) ? '; calm scored ' + fmt(fsc.common_low_crowding) : ''));
  /* population trend */
  var tr = r.trend || {};
  if (fin(tr.population_yoy_pct)) add('people', 'yoy', 'Population change in the last year', (tr.population_yoy_pct > 0 ? '+' : '') + fmt(tr.population_yoy_pct, 2) + '%', 'Eurostat GISCO LAU');
  if (fin(tr.recent_annualized_pct)) add('people', 'ann', 'Average yearly change, recent years', (tr.recent_annualized_pct > 0 ? '+' : '') + fmt(tr.recent_annualized_pct, 2) + '%', 'Eurostat GISCO LAU');
  /* neighbours, look-alikes and cross-border context */
  if (fin(r.lat) && SHARD && SHARD.records) {
    var nb = SHARD.records.filter(function (o) { return o.id !== r.id && fin(o.lat); }).map(function (o) { return { r: o, d: km([r.lon, r.lat], [o.lon, o.lat]) }; }).filter(function (o) { return o.d <= 12; }).sort(function (a, b) { return a.d - b.d; });
    if (nb.length) add('know', 'nb', (isWorld(r.country) ? 'Places' : 'Municipalities') + ' within 12 km', nb.length + ': ' + nb.slice(0, 12).map(function (o) { return o.r.name + ' ' + Math.round(o.d) + ' km'; }).join(', ') + (nb.length > 12 ? ' …' : ''), 'Nestlyzer, from ' + (isWorld(r.country) ? 'place' : 'municipality') + ' centres');
  }
  var tw = (r.x && r.x.twin) || [];
  if (tw.length) add('know', 'twins', isWorld(r.country) ? 'Look-alikes in other countries' : 'Look-alikes elsewhere', tw.map(function (id) { return TWIN_NAMES[id] || id; }).join(', '), 'similar size, surroundings, terrain and water');
  try { var xb = crossBorderForRecord(r); if (xb && xb.length) add('move', 'xb', 'Across the border, often part of daily life', xb.map(function (o) { return o.label + ' (' + countryName(o.country) + ', about ' + Math.round(o.distance) + ' km)'; }).join('; '), 'Nestlyzer cross-border notes'); } catch (e) {}
  /* population history */
  var ap = r.trend && r.trend.annual_population;
  if (ap && ap.length) ap.forEach(function (o) { add('people', 'py:' + o.year, 'Residents in ' + o.year, fmtInt(o.population), 'Eurostat GISCO LAU'); });
  /* every scored factor, by theme */
  ENGINE.allFactors.forEach(function (f) {
    if (AD_DUPF[f.id]) return;
    for (var k in AD_DUP) if (AD_DUP[k] === f.id) return;
    var raw = fr[f.id], sc = fin(fsc[f.id]) ? fsc[f.id] : ENGINE.factorValue(r, f), rk = frk[f.id] && frk[f.id][r.id];
    if (!fin(raw) && !fin(sc)) return;
    var val = adFmtRaw(f, raw);
    // a missing measurement stays missing; the 0-100 index is shown as what it is, never in place of the value (NZ-GLOBAL-002)
    if (val == null) return;   // only figures we have are listed
    add(AD_CAT[f.category] || 'know', 'f:' + f.id, f.name, val, (fin(sc) ? 'score ' + fmt(sc) + (rk ? ', #' + rk : '') + ' · ' : '') + adSrc(f, r));
  });
  cxAllRows(r).forEach(function (o) { out.push(o); });
  /* official values shown for information, not scored */
  META.factors.forEach(function (f) {
    if (f.score_role !== 'raw') return;
    var raw = fr[f.id], val = adFmtRaw(f, raw);
    if (val != null) add(AD_CAT[f.category] || 'know', 'f:' + f.id, f.name, val, 'not scored · ' + adSrc(f, r));
  });
  /* land: terrain, climate type, names */
  var t = terrainOf(r), c = climateOf(r), xx = r.x || {};
  if (t) add('land', 'terrain', 'Terrain', t.name, 'Mapzen terrain');
  if (c) add('land', 'climate', 'Climate type', c.code + ', ' + c.name + ': ' + c.text, 'Köppen-Geiger, Rubel et al. 2017');
  if (xx.land && xx.land !== countryName(r.country)) add('land', 'landname', 'Landscape', xx.land, 'Natural Earth');
  if (xx.sea) add('land', 'seaname', 'Sea', xx.sea, 'Natural Earth');
  /* risks to check (local) */
  var riv = pval(r, 'river'), sea = pval(r, 'coast');
  if (riv != null && riv < 2) add('risk', 'flood-river', 'Next to a major river', pfmt('river', riv) + (xx.river ? ' (' + xx.river + ')' : ''), 'Check the official flood hazard map before you buy or rent');
  if (sea != null && sea < 2) add('risk', 'flood-sea', 'On the coast', 'Storm surge and coastal erosion can matter', 'Check the official coastal flood map');
  if (t && (t.cls === 'alpine' || t.cls === 'mountains')) add('risk', 'mountain', 'Mountain terrain', t.name + ', height range ' + pfmt('relief', t.relief) + ' within 15 km', 'Check avalanche, rockfall and landslide hazard maps; winter roads');
  /* good to know: country */
  var cf = CFACTS[r.country], wf = WFACTS[r.country];
  if (cf) {
    if (!wf) {
      add('know', 'eu', 'European Union', cf[0] ? 'Member' : 'Not a member', 'European Union');
      add('know', 'schengen', 'Schengen area', cf[2] ? 'Member: no routine passport checks with other Schengen countries' : 'Not a member', 'European Union');
      add('money', 'vat', 'Standard VAT rate (' + countryName(r.country) + ')', fmt(cf[4], 1) + '%', 'national rate, 2026');
    } else add('money', 'vat', wf[0] + ' (' + countryName(r.country) + ')', wf[1], 'national rules, 2026');
    if (CIT[r.country] != null) add('money', 'cit', 'Corporate income tax (' + countryName(r.country) + ')', fmt(CIT[r.country], 2).replace(/\.?0+$/, '') + '%', 'combined statutory rate 2025, Tax Foundation' + (r.country === 'CH' ? '; varies by canton and municipality' : r.country === 'US' ? '; federal 21% plus state average' : ''));
    add('know', 'currency', 'Currency', cf[3], '');
    add('know', 'drive', 'Driving', cf[5] ? 'on the left' : 'on the right', '');
  }
  ctxRows(r, add);
  if (wf) add('know', 'sos', 'Emergency numbers', wf[2], '');
  else if (cf && cf[0]) add('know', 'sos', 'Emergency number', '112', 'works in every EU country');
  var fmtOff = function (v) { return 'UTC' + (v >= 0 ? '+' : '') + (v % 1 ? Math.floor(v) + ':' + ('0' + Math.round(Math.abs(v % 1) * 60)).slice(-2) : v); };
  var tzw = tzOffsetAt(r, false), tzs = tzOffsetAt(r, true);
  if (tzw != null && tzs != null) add('know', 'tz', 'Time zone', (r.x.tz || '').replace(/_/g, ' ') + ': ' + fmtOff(tzw) + (tzs !== tzw ? ' in December, ' + fmtOff(tzs) + ' in June' : ', no summer time'), 'IANA time zone (GeoNames)');
  else { var tz = tzOf(r); add('know', 'tz', 'Time zone', 'UTC' + (tz >= 0 ? '+' : '') + tz + (r.country !== 'IS' ? ', summer time UTC' + (tz + 1 >= 0 ? '+' : '') + (tz + 1) : ', no summer time'), ''); }
  if (r.whole) add('know', 'whole', 'Whole city', 'This entry is the whole city; its districts are listed separately', 'Left out of resident counts so nobody is counted twice');
  add('know', 'lang', 'Language', languageLabel(r), '');
  /* codes and location */
  if (!isWorld(r.country)) add('ids', 'oid', 'Official municipality number', r.official_id, '');
  if (isWorld(r.country)) { add('ids', 'gnid', 'GeoNames id', r.official_id, 'geonames.org/' + r.official_id); add('ids', 'n2', LOCAL_KIND[r.country] || 'Region', nutsName(r.n2), 'Natural Earth admin-1'); }
  else {
    add('ids', 'gisco', 'Eurostat LAU code', r.gisco, '');
    if (r.n3) add('ids', 'n3', 'NUTS 3 region', r.n3 + ' ' + nutsName(r.n3), 'Eurostat NUTS 2021');
    if (r.n2) add('ids', 'n2', 'NUTS 2 region', r.n2 + ' ' + nutsName(r.n2), 'Eurostat NUTS 2021');
  }
  if (!isWorld(r.country)) add('ids', 'area', localKind(r.country), localAreaOf(r), '');
  if (fin(r.lat)) add('ids', 'latlon', 'Coordinates of the centre', fmt(r.lat, 4) + ', ' + fmt(r.lon, 4), r.locMethod === 1 || r.locMethod === '1' ? 'population-weighted centre (EDJNet)' : '');
  return adCtx(r, out);
}
/* context for every figure in "All data" (2.11.2): o.t = tone (good, bad, mid; dim = does not count for this profile;
   nat = national, de-emphasised; ref = a fact that is not a measure), o.cx = how it compares */
function shPctOf(r, key, get) {
  var sh = SHARDS[r.country]; if (!sh) return null;
  sh._cxp = sh._cxp || {}; var arr = sh._cxp[key];
  if (!arr) { arr = []; sh.records.forEach(function (o) { var v = get(o); if (fin(v)) arr.push(v); }); arr.sort(function (a, b) { return a - b; }); sh._cxp[key] = arr; }
  var v = get(r); if (!fin(v) || arr.length < 6) return null;
  var lo = 0, hi = arr.length; while (lo < hi) { var m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; }
  var lo2 = lo, hi2 = arr.length; while (lo2 < hi2) { var m2 = (lo2 + hi2) >> 1; if (arr[m2] <= v) lo2 = m2 + 1; else hi2 = m2; }
  return Math.round(100 * ((lo + lo2) / 2) / arr.length);
}
function xcPct(vals, v) { vals = vals.filter(fin).sort(function (a, b) { return a - b; }); if (vals.length < 6 || !fin(v)) return null; return [Math.round(100 * vals.filter(function (x) { return x < v; }).length / (vals.length - 1)), vals.length]; }
function adCtx(r, rows) {
  var x = placeX(r), w = ENGINE.weightsFor(r, S.profile) || {}, biz = isBizKey(S.profile), pn = profFor(), cn = countryName(r.country);
  var what = demonym(r.country) + ' ' + unitWord(r.country), n = RES ? RES.scored.length : 0, mine = RES && RES.byId[r.id];
  var sh = SHARDS[r.country], cx = sh && sh.extra && sh.extra.ctx, cats = x.catScores || ENGINE.categories(r);
  var band = function (v, g, b) { return !fin(v) ? '' : v >= (g || 60) ? 'good' : v <= (b || 40) ? 'bad' : 'mid'; };
  var REF = ['ref', 'reference, not a measure'];
  var allC = CTX ? Object.keys(CTX.countries) : [];
  var py = rows.filter(function (o) { return /^py:/.test(o.k); });
  rows.forEach(function (o) {
    var k = o.k, c = null, m, f, pc;
    if (k === 'score') c = [band(x.overall), 'relative score: 100 = the best fit in ' + cn + (mine ? '; #' + fmtInt(mine.rank) + ' of ' + fmtInt(n) : '')];
    else if (k === 'rank') { if (mine) { var top = Math.max(1, Math.ceil(100 * mine.rank / Math.max(1, n))); c = [band(100 - top), 'in the top ' + top + '% of the places that pass this profile']; } else c = ['bad', 'misses a requirement of this profile']; }
    else if (k === 'cover' || k === 'measured' || k === 'conf') c = [band(parseFloat(o.val), 80, 50), parseFloat(o.val) >= 80 ? 'well covered by data' : parseFloat(o.val) < 50 ? 'thin data: treat the score with care' : 'partly covered by data'];
    else if (k === 'assess') c = ['ref', 'summary of the coverage figures'];
    else if (k === 'nf') { pc = shPctOf(r, 'nf', function (o2) { return o2.availableFactorCount; }); c = pc != null ? ['', hiLo(pc) + ' of ' + what + ' by number of figures'] : REF; }
    else if ((m = /^cat:(.+)$/.exec(k))) c = [w[m[1]] ? band(cats[m[1]]) : 'dim', w[m[1]] ? 'relative score, 100 = best in ' + cn : 'not weighted for ' + pn];
    else if ((m = /^prof:(.+)$/.exec(k))) { var sv = parseFloat(o.val), d = sv - x.overall; c = [band(sv) + ' dim', 'relative score' + (fin(d) ? '; ' + (Math.abs(d) < 1 ? 'same as' : Math.round(Math.abs(d)) + (d > 0 ? ' higher than' : ' lower than')) + ' for ' + pn : '')]; }
    else if ((m = /^p:(.+)$/.exec(k))) {
      pc = pctOf(r, m[1]); f = AD_DUP[m[1]] && ENGINE.factorById[AD_DUP[m[1]]];
      if (m[1] === 'city' && pval(r, 'city') < 1) { o.t = 'good'; o.cx = 'a city of 100,000+ itself'; return; }
      var dir = f ? (f.direction === 'lower' ? -1 : 1) : 0, rel = f && !f.not_scored && w[f.category] > 0;
      var fs0 = f && (r.factorScores || {})[f.id], t0 = f && fin(fs0) ? band(fs0) : toneOf(pc, dir);
      c = pc == null ? REF : [(t0 + (f && !rel ? ' dim' : '')).trim() || '', pkTxt(m[1], pc) + ' of ' + what + (f && !rel ? '; not weighted for ' + pn : '')];
    }
    else if (k === 'd10') { pc = shPctOf(r, 'd10', function (o2) { return (o2.factorRaw || {}).geo_density10_km2; }); c = pc != null ? ['', hiLo(pc) + ' of ' + what] : REF; }
    else if (k === 'yoy' || k === 'ann') { var tk = k === 'yoy' ? 'population_yoy_pct' : 'recent_annualized_pct'; pc = shPctOf(r, k, function (o2) { return (o2.trend || {})[tk]; }); c = pc != null ? ['', 'growing ' + (pc >= 50 ? 'faster' : 'slower') + ' than ' + (pc >= 50 ? pc : 100 - pc) + '% of ' + what] : REF; }
    else if (/^py:/.test(k)) { var i0 = py.indexOf(o), p0 = py[0], v0 = parseFloat(String(p0.val).replace(/[^\d.]/g, '')), v1 = parseFloat(String(o.val).replace(/[^\d.]/g, '')); c = i0 > 0 && v0 ? ['', (v1 >= v0 ? '+' : '−') + fmt(Math.abs(v1 / v0 - 1) * 100, 1) + '% since ' + p0.k.slice(3)] : ['', 'first year in the series']; }
    else if ((m = /^f:(.+)$/.exec(k))) {
      f = ENGINE.factorById[m[1]]; if (!f) return;
      var fid = f.id; pc = shPctOf(r, 'f:' + fid, function (o2) { return (o2.factorRaw || {})[fid]; });
      var scored = f.score_role === 'scored' && !f.not_scored, rel2 = scored && w[f.category] > 0, dir2 = f.direction === 'lower' ? -1 : f.direction === 'higher' ? 1 : 0;
      var fs1 = (r.factorScores || {})[fid], t1 = scored && fin(fs1) ? band(fs1) : toneOf(pc, dir2);
      c = pc == null ? [(t1 + (rel2 ? '' : ' dim')).trim(), 'too few places with this figure to compare'] : [(t1 + (rel2 ? '' : ' dim')).trim(), hiLo(pc) + ' of ' + what + (rel2 ? '' : scored ? '; not weighted for ' + pn : '; shown, not scored')];
    }
    else if (o.rec) c = cxTone(o.rec, cx, biz);
    else if ((m = /^cx:(.+)$/.exec(k)) && CTX) { var id = m[1], q = xcPct(allC.map(function (cc) { var e = (CTX.countries[cc].economy || {})[id]; return e && e.value; }), ((CTX.countries[r.country] || {}).economy || {})[id] && CTX.countries[r.country].economy[id].value); c = q ? [(toneOf(q[0], /^vdem_/.test(id) ? 1 : 0) + ' nat').trim(), hiLo(q[0]) + ' of ' + q[1] + ' countries'] : ['nat', 'national figure']; }
    else if ((m = /^tx:(.+)$/.exec(k)) && CTX) {
      var tk2 = m[1], me = ((CTX.countries[r.country] || {}).taxes || {})[tk2], vs = allC.map(function (cc) { var t = (CTX.countries[cc].taxes || {})[tk2]; return t && t.value; }).filter(fin);
      if (me && me.unit === 'flag') { var yes = vs.filter(function (v) { return v >= 1; }).length; c = [(me.value >= 1 ? 'bad' : 'good') + ' nat', yes + ' of ' + vs.length + ' countries levy it']; }
      else { var q2 = me && xcPct(vs, me.value); c = q2 ? [(toneOf(q2[0], -1) + ' nat').trim(), hiLo(q2[0]) + ' of ' + q2[1] + ' countries'] : ['nat', 'national rule']; }
    }
    else if (k === 'vat' && CFACTS[r.country] && !WFACTS[r.country]) { var q3 = xcPct(Object.keys(CFACTS).map(function (cc) { return CFACTS[cc][4]; }), CFACTS[r.country][4]); c = q3 ? [(toneOf(q3[0], -1) + ' nat').trim(), hiLo(q3[0]) + ' of ' + q3[1] + ' European countries'] : REF; }
    else if (k === 'cit' && CIT[r.country] != null) { var q4 = xcPct(Object.keys(CIT).map(function (cc) { return CIT[cc]; }), CIT[r.country]); c = q4 ? [(toneOf(q4[0], -1) + (biz ? '' : ' dim') + ' nat').trim(), hiLo(q4[0]) + ' of ' + q4[1] + ' countries' + (biz ? '' : '; matters for companies, not households')] : REF; }
    else if (/^us:pw[ir]$/.test(k) && CTX && CTX.states) { var ind = k === 'us:pwi' ? 'industrial' : 'residential', me2 = (CTX.states[stripParen(nutsName(r.n2))] || {}).power, q5 = me2 && xcPct(Object.keys(CTX.states).map(function (s2) { return (CTX.states[s2].power || {})[ind]; }), me2[ind]); c = q5 ? [toneOf(q5[0], -1) + (ind === 'industrial' && !biz ? ' dim' : ''), hiLo(q5[0]) + ' of ' + q5[1] + ' states'] : REF; }
    else if (/^us:/.test(k)) c = ['', 'concentration compares the state with the US share (1.0 = average)'];
    else if (o.g === 'risk') c = ['bad', 'a risk to check before you commit'];
    else if (/^(tr|fu):/.test(k)) c = ['nat', 'national rule; applies case by case'];
    else c = REF;
    if (c) { o.t = c[0]; o.cx = c[1]; var vd0 = cxVerdict(c[0], pn); if (vd0) o.cx = vd0 + ' · ' + o.cx; }
    var fd = /^f:/.test(k) && ENGINE.factorById[k.slice(2)]; if (fd && fd.description) o.src = fd.description + ' Source: ' + (o.src || '').replace(/^(score [\d.]+(, #\d+)? · )/, '');
    else if (o.rec) o.src = [cxExplain(o.rec, biz, pn), o.src ? 'Source: ' + o.src : ''].filter(Boolean).join(' ');
    // honesty stays visible (owner rules): a figure for a wider area says so, and a modelled stand-in says it is modelled
    var lvm = /\b((?:district|regional|large-region|county|council area|municipality|regional council|national) value(?: for [^,;·]+)?)/.exec(o.src || ''), mm = /modelled from[^;·]*/.exec(o.src || '');
    var tag = [lvm ? lvm[1] : '', mm ? mm[0] : ''].filter(Boolean).join('; ');
    if (tag) o.cx = (o.cx ? o.cx + ' · ' : '') + tag;
  });
  return rows;
}
/* live rows, resolved: { g, k, label, val, src } */
function adLive(r) {
  if (!extOn()) return Promise.resolve({ off: true, rows: [] });
  var rows = [];
  function add(g, k, label, val, src, c) { if (val == null || val === '') return; rows.push({ g: g, k: k, label: label, val: String(val), src: src || '', t: c ? c[0] : 'ref', cx: c ? c[1] : 'reference, not a measure' }); }
  var biz = isBizKey(S.profile);
  return Promise.all([
    regionStatsFor(r).catch(function () { return null; }),
    amenitiesFor(r).catch(function () { return null; }),
    climateFor(r).catch(function () { return null; }),
    wdFacts(r).catch(function () { return null; }),
    quakesFor(r).catch(function () { return null; })
  ]).then(function (a) {
    var regs = a[0] || [], natGeo = r.country === 'EL' ? 'EL' : r.country;
    return Promise.all(regs.map(function (p) {
      if (p.d.lvl === 0 || p.d.k === 'gdp' || p.d.ratio) return null;
      return esGet(p.d.ds, natGeo).then(function (j) { return jsPick(j, p.d.prefs); }).catch(function () { return null; });
    })).then(function (nats) {
    regs.forEach(function (p, i) {
      var dir = cxDir(p.d.k === 'life' ? 'life_exp' : p.d.k === 'unemp' ? 'unemploy' : p.d.k === 'docs' ? 'docs' : p.d.k === 'poverty' ? 'poverty' : p.d.k === 'crime' ? 'crime' : p.d.k === 'income' ? 'income_x' : p.d.k === 'tert' ? 'tertiary' : '', biz);
      if (p.d.k === 'income') dir = 1;
      var nat = nats[i], c;
      if (p.d.k === 'gdp') { var d0 = p.v - 100; c = [toneOf(d0 > 5 ? 75 : d0 < -5 ? 25 : 50, 1), Math.abs(d0) < 2 ? 'about the EU average' : Math.round(Math.abs(d0)) + '% ' + (d0 > 0 ? 'above' : 'below') + ' the EU average'];
        if (!biz && !(ENGINE.weightsFor(r, S.profile) || {}).jobs) c[0] += ' dim'; }
      else if (p.d.lvl === 0) c = ['nat', 'national figure'];
      else if (nat && fin(nat.v)) { var v = cxVs({ value: p.v, unit: /%$/.test(p.d.fmt(1)) ? '%' : '' }, { value: nat.v }, dir); c = [v[0], v[1] + ' the ' + countryName(r.country) + ' figure (' + p.d.fmt(nat.v) + ')']; }
      else c = ['', 'regional figure; the national figure did not load'];
      add(AD_REG[p.d.k] || 'money', 'reg:' + p.d.k, p.d.label, p.d.fmt(p.v), (p.d.lvl === 0 ? countryName(r.country) + ' as a whole' : nutsName(p.geo)) + (p.year ? ', ' + p.year : '') + '; Eurostat ' + p.d.ds, c);
    });
    var ESS = { school: 1, kinder: 1, doctor: 1, pharm: 1, food: 1, train: 1, bus: 1, play: 1 }, BIZA = { train: 1, bus: 1, eat: 1, food: 1, charge: 1 };
    var am = a[1]; if (am) AMEN_DEF.forEach(function (d) { var v = am[d[0]]; add('life', 'am:' + d[0], d[2] + ' within 1.5 km', fin(v) ? (v > 99 ? '99+' : v) : null, 'OpenStreetMap',
      [(v > 0 ? 'good' : ESS[d[0]] ? 'bad' : 'mid') + (biz && !BIZA[d[0]] ? ' dim' : ''), v > 0 ? 'within walking distance' : 'none within walking distance (1.5 km)']); });
    var c = a[2];
    if (c) {
      var M = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
      var hot = Math.max.apply(null, c.hi), hm = c.hi.indexOf(hot), frost = c.lo.filter(function (v) { return v < 0; }).length, cold = Math.min.apply(null, c.lo);
      add('land', 'cl:hi', 'Average daily high, January to December', c.hi.map(function (v) { return Math.round(v); }).join(' · ') + ' °C', 'NASA POWER', [hot >= 30 ? 'bad' : hot >= 27 ? 'mid' : 'good', hot >= 30 ? 'hot summers' : hot >= 27 ? 'warm summers' : 'moderate summers']);
      add('land', 'cl:lo', 'Average nightly low, January to December', c.lo.map(function (v) { return Math.round(v); }).join(' · ') + ' °C', 'NASA POWER', [cold <= -5 ? 'bad' : cold < 0 ? 'mid' : 'good', cold <= -5 ? 'cold winters' : cold < 0 ? 'frosty winter nights' : 'mild winters']);
      add('land', 'cl:rain', 'Rain per year', fmtInt(Math.round(c.year / 10) * 10) + ' mm', 'NASA POWER', ['', c.year < 500 ? 'dry: less than 500 mm a year' : c.year < 1000 ? 'moderate: 500 to 1,000 mm, typical of central Europe' : c.year < 1500 ? 'wet: 1,000 to 1,500 mm' : 'very wet: over 1,500 mm']);
      if (fin(c.sunAnn)) add('land', 'cl:sun', 'Solar energy, yearly average', fmt(c.sunAnn, 1) + ' kWh/m² per day', 'NASA POWER', [c.sunAnn >= 4 ? 'good' : c.sunAnn < 2.8 ? 'mid' : '', c.sunAnn >= 4 ? 'sunny: southern European level (4+)' : c.sunAnn < 2.8 ? 'little sun: northern European level (under 2.8)' : 'average for Europe (2.8 to 4)']);
      add('risk', 'heat', 'Hottest month', M[hm] + ', average high ' + Math.round(hot) + ' °C' + (hot >= 30 ? ': hot summers, heat waves likely' : hot >= 27 ? ': warm summers' : ''), 'NASA POWER', [hot >= 30 ? 'bad' : hot >= 27 ? 'mid' : 'good', hot >= 30 ? 'heat waves likely' : hot >= 27 ? 'warm, occasional heat' : 'no heat risk to speak of']);
      add('risk', 'frost', 'Months with frosty nights on average', frost ? String(frost) : 'none', 'NASA POWER', [frost >= 5 ? 'bad' : frost ? 'mid' : 'good', frost >= 5 ? 'long frosty season' : frost ? 'some frost in winter' : 'frost-free on average']);
    }
    var f = a[3];
    if (f) {
      if (fin(f.elev)) add('know', 'wd:elev', 'Official altitude', fmtInt(f.elev) + ' m', 'Wikidata');
      if (f.postcode) add('know', 'wd:pc', 'Postcode', f.postcode, 'Wikidata');
      if (fin(f.founded)) add('know', 'wd:founded', 'First recorded or founded', f.founded < 0 ? Math.abs(f.founded) + ' BC' : String(f.founded), 'Wikidata');
      if (f.high) add('know', 'wd:high', 'Highest point', f.high, 'Wikidata');
      if (f.demonym) add('know', 'wd:dem', 'Locals are called', f.demonym, 'Wikidata');
      if (f.mayor) add('know', 'wd:mayor', 'Head of the local government', f.mayor, 'Wikidata');
      if (f.sisters && f.sisters.length) add('know', 'wd:sis', 'Sister towns', f.sisters.join(', '), 'Wikidata');
    }
    var q = a[4];
    if (q) {
      add('risk', 'quake', 'Earthquakes of magnitude 4.5+ within 100 km since 1975', q.n ? fmtInt(q.n) + (q.n >= 300 ? '+' : '') : 'none recorded', 'USGS', [q.n >= 10 ? 'bad' : q.n ? 'mid' : 'good', q.n >= 10 ? 'an earthquake-prone area' : q.n ? 'occasional earthquakes' : 'no strong earthquakes recorded nearby']);
      if (q.max) add('risk', 'quakemax', 'Strongest of them', 'magnitude ' + fmt(q.max.mag, 1) + ', ' + q.max.year + (q.max.km != null ? ', ' + fmtInt(q.max.km) + ' km away' : ''), 'USGS', [q.max.mag >= 6 ? 'bad' : 'mid', q.max.mag >= 6 ? 'strong: check building standards' : 'moderate']);
    }
    return { rows: rows, failed: { reg: !a[0], amen: !a[1], clim: !a[2], quake: !a[4] } };
    });
  });
}
/* earthquakes of magnitude 4.5 or more within 100 km since 1975, from the USGS catalogue */
var QUAKES = {};
function quakesFor(r) {
  if (QUAKES[r.id]) return QUAKES[r.id];
  if (!fin(r.lat)) return Promise.resolve(null);
  var url = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=' + r.lat.toFixed(3) + '&longitude=' + r.lon.toFixed(3) + '&maxradiuskm=100&minmagnitude=4.5&starttime=1975-01-01&orderby=magnitude&limit=300';
  QUAKES[r.id] = liveFetch(url).then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); }).then(function (j) {
    var fs = (j && j.features) || [];
    var o = { n: fs.length, max: null };
    if (fs.length) {
      var p = fs[0].properties || {}, g = fs[0].geometry && fs[0].geometry.coordinates;
      o.max = { mag: p.mag, year: new Date(p.time).getUTCFullYear(), km: g ? Math.round(km([r.lon, r.lat], [g[0], g[1]])) : null };
    }
    return o;
  }).catch(function () { delete QUAKES[r.id]; return null; });
  return QUAKES[r.id];
}

/* ---------- the "All data" tab ---------- */
function adTable(rows, live) {
  return rows.map(function (o) { return '<tr data-adk="' + esc(o.k) + '" class="adr' + (live ? ' live' : '') + (o.t ? ' ' + o.t : '') + '"' + (o.src ? ' data-src="' + esc(o.src) + '" title="' + esc(o.src) + '"' : '') + '><th scope="row">' + esc(o.label) + '</th><td>' + esc(o.val) + (o.cx ? '<em>' + esc(o.cx) + '</em>' : '') + '</td></tr>'; }).join('');
}
function allDataHTML(r) {
  var rows = adRows(r);
  return '<section class="sec alldata" data-alldata="' + esc(r.id) + '"><h3>All data for ' + esc(r.name) + '</h3><p class="sub">Every number Nestlyzer has for this place, grouped by theme. Open a group to see it. Figures marked live load from Eurostat, OpenStreetMap, NASA, USGS and Wikidata; regional figures describe the wider region, not ' + esc(r.name) + ' alone. Under each figure: how it compares.</p>' + cxKey() + '' +
    '<div class="ad-tools"><button class="btn btn-sm" type="button" data-adall>Open all groups</button><button class="btn btn-sm" type="button" data-adcsv="' + esc(r.id) + '">' + ICON.doc + 'Download as CSV</button><button class="btn btn-sm btn-ghost" type="button" data-catalogue>What data we have</button></div>' +
    AD_GROUPS.map(function (g) {
      var mine = rows.filter(function (o) { return o.g === g[0]; });
      return '<details class="adg" data-adg="' + g[0] + '"><summary><b>' + esc(g[1]) + '</b> <span class="muted small" data-adn>' + mine.length + ' figures</span></summary><div class="tablewrap"><table class="table facts adt"><tbody data-adbody="' + g[0] + '">' + adTable(mine) + '</tbody></table></div></details>';
    }).join('') +
    '<p class="small muted" data-adstatus>' + (extOn() ? 'Loading live figures…' : 'Live content is switched off, so only the built-in figures are shown. <button class="linkbtn" type="button" data-extoggle>Turn it on</button>') + '</p></section>';
}
function adHydrate(r) {
  var root = $('#place [data-alldata="' + r.id + '"]'); if (!root || root.dataset.done) return;
  root.dataset.done = '1';
  adLive(r).then(function (res) {
    if (S.selected !== r.id || !document.contains(root)) return;
    var st = root.querySelector('[data-adstatus]');
    if (res.off) return;
    res.rows.forEach(function (o) {
      var tb = root.querySelector('[data-adbody="' + o.g + '"]'); if (!tb) return;
      tb.insertAdjacentHTML('beforeend', adTable([o], true));
    });
    AD_GROUPS.forEach(function (g) { var d = root.querySelector('[data-adg="' + g[0] + '"]'); if (!d) return; var n = d.querySelectorAll('tbody tr.adr').length, s = d.querySelector('[data-adn]'); if (s) s.textContent = n + ' figures'; d.hidden = !n; });
    var miss = []; if (res.failed.reg && !isWorld(r.country)) miss.push('Eurostat'); if (res.failed.amen) miss.push('OpenStreetMap'); if (res.failed.clim) miss.push('NASA POWER'); if (res.failed.quake) miss.push('USGS');
    if (st) st.innerHTML = miss.length ? 'Some live figures could not be loaded right now (' + esc(miss.join(', ')) + ' did not answer). <button class="linkbtn" type="button" data-retry>Try again</button>' : 'All live figures loaded. Regional figures are for the wider region; the crime figure is a national survey.';
  });
}
function adCSV(id) {
  var r = BYID[id], root = $('#place [data-alldata="' + id + '"]'); if (!r || !root) return;
  var lines = [['group', 'item', 'value', 'how it compares', 'source or note']];
  $$('#place [data-alldata="' + id + '"] details.adg').forEach(function (d) {
    var g = d.querySelector('summary b').textContent;
    d.querySelectorAll('tbody tr.adr').forEach(function (tr) { var note = tr.dataset.src || ''; var td = tr.querySelector('td'), em = td.querySelector('em'); lines.push([g, tr.querySelector('th').textContent, em ? td.textContent.slice(0, td.textContent.length - em.textContent.length) : td.textContent, em ? em.textContent : '', note]); });
  });
  var csv = lines.map(function (l) { return l.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'nestlyzer-' + r.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') + '-all-data.csv'; document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- compare: every row, collapsed until asked for ---------- */
function cmpAllHTML(list) {
  var per = list.map(function (r) { var m = {}; adRows(r).forEach(function (o) { m[o.k] = o; }); return m; });
  var order = [], seen = {};
  list.forEach(function (r, i) { adRows(r).forEach(function (o) { if (!seen[o.k]) { seen[o.k] = 1; order.push(o); } }); });
  var n = list.length, total = order.length;
  var body = AD_GROUPS.map(function (g) {
    var rs = order.filter(function (o) { return o.g === g[0]; });
    return '<tbody data-cag="' + g[0] + '"><tr class="grp"><th colspan="' + (n + 1) + '">' + esc(g[1]) + '</th></tr>' + rs.map(function (o) { return cmpAllRow(o.k, o.label, per.map(function (m) { return m[o.k] ? m[o.k].val : '–'; })); }).join('') + '</tbody>';
  }).join('');
  return '<div class="tablewrap"><table class="cmpx"><thead><tr><th></th>' + list.map(function (r) { return '<th>' + flagImg(r.country) + ' <b>' + esc(r.name) + '</b></th>'; }).join('') + '</tr></thead>' + body + '</table></div><p class="small muted" data-castatus>' + total + ' rows. Live rows are being added…</p>';
}
function cmpAllRow(k, label, vals) { return '<tr data-cak="' + esc(k) + '"><th scope="row">' + esc(label) + '</th>' + vals.map(function (v) { return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>'; }
function cmpAllHydrate(det) {
  var ids = det.dataset.cmpall.split(','), list = ids.map(function (id) { return BYID[id]; }).filter(Boolean), st = det.querySelector('[data-castatus]');
  if (!extOn()) { if (st) st.innerHTML = 'Live content is switched off, so only the built-in figures are shown.'; return; }
  if (st) st.textContent = 'Loading live figures…';
  Promise.all(list.map(adLive)).then(function (res) {
    if (!document.contains(det)) return;
    var per = res.map(function (x) { var m = {}; (x.rows || []).forEach(function (o) { m[o.k] = o; }); return m; }), order = [], seen = {};
    res.forEach(function (x) { (x.rows || []).forEach(function (o) { if (!seen[o.k]) { seen[o.k] = 1; order.push(o); } }); });
    order.forEach(function (o) {
      var tb = det.querySelector('[data-cag="' + o.g + '"]'); if (!tb || tb.querySelector('[data-cak="' + o.k + '"]')) return;
      tb.insertAdjacentHTML('beforeend', cmpAllRow(o.k, o.label, per.map(function (m) { return m[o.k] ? m[o.k].val : '–'; })));
    });
    if (st) st.textContent = order.length + ' live rows added. Regional figures describe the wider region; the crime figure is a national survey.';
  });
}

/* ---------- the data catalogue ---------- */
function catalogueHTML() {
  var C = typeof CATALOGUE !== 'undefined' ? CATALOGUE : { items: [], missing: [] };
  var py = (META.population || {}).year || 2024, by = (META.population || {}).base_year || py - 5;
  function per(s) { return String(s || '').replace('BASEYEAR', by).replace('POPYEAR', py); }
  var heads = [['built', 'Built in, for every municipality'], ['factors', 'Scored factors (built in)'], ['country', 'Country facts (built in)'], ['live', 'Loaded live when you open a place']];
  return '<p>' + esc(C.note || '') + '</p>' + heads.map(function (h) {
    var it = C.items.filter(function (o) { return o.g === h[0]; }); if (!it.length) return '';
    return '<h3 class="fh">' + esc(h[1]) + ' <span class="muted small">' + it.length + '</span></h3><div class="tablewrap"><table class="table cat"><thead><tr><th>What</th><th>Level</th><th>Countries</th><th>Source and year</th><th>In the score</th></tr></thead><tbody>' +
      it.map(function (o) { return '<tr><td>' + esc(o.label) + '</td><td>' + esc(o.level) + '</td><td>' + esc(o.cover) + '</td><td>' + (o.url ? '<a href="' + esc(o.url) + '" target="_blank" rel="noopener">' + esc(o.src) + '</a>' : esc(o.src)) + (o.period ? ', ' + esc(per(o.period)) : '') + '</td><td>' + esc(o.score) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }).join('') + (C.missing && C.missing.length ? '<h3 class="fh">Coming next</h3><ul>' + C.missing.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>' : '');
}
function openCatalogue() { closeTools(); openModal('What data we have', '<div class="catalogue">' + catalogueHTML() + '</div>'); }

/* the picture filter: no people, no black and white, nothing off-topic, no near-copies of the same shot */
var PHOTO_PEOPLE = /\b(portrait|portr[aä]t|bildnis|selfie|people|person|persons|personen|menschen|men|women|man|woman|girl|boy|child|children|kinder|family|familie|wedding|hochzeit|bride|crowd|audience|publikum|band|concert|konzert|singer|musician|player|athlete|footballer|politician|mayor|b[uü]rgermeister|actor|actress|team|group[ _]photo|gruppenfoto|members|meeting|ceremony|award|interview|speaker|visit[ _]of|parade|umzug|festival)\b/i;
var PHOTO_BW = /black[- _]and[- _]white|\bb&w\b|\bb\/w\b|monochrom|grayscale|greyscale|sepia|schwarz[- _]?wei|noir[- _]et[- _]blanc|bianco[- _]e[- _]nero|blanco[- _]y[- _]negro|zwart[- _]wit/i;
var PHOTO_OFF = /\b(insects?|butterfl(y|ies)|moth|beetle|spider|birds?|v[oö]gel|flowers?|bl[uü]ten?|blumen?|mushrooms?|pilze?|fungi|lichens?|moss|macro|specimen|herbarium|fossils?|minerals?|interior|interieur|innenansicht|innenraum|altar|organ|orgel|stained[ _]glass|kirchenfenster|grave|gravestone|grabstein|tombstone|plaque|gedenktafel|inscription|inschrift|locomotive|lokomotive|tram|bus|truck|lkw|aircraft|airplane|flugzeug|vehicle|fahrzeug|tractor|traktor|book|manuscript|newspaper|zeitung|drawing|zeichnung|painting|gem[aä]lde|engraving|kupferstich|lithograph|postcard|ansichtskarte|postkarte|menu|dish|meal|cake|kuchen|logo|sticker|graffiti[ _]detail|detail)\b/i;
var PHOTO_PEOPLE_CAT = /(^|\|)(People|Portrait|Men |Women |Selfies|Groups of people|Sportspeople|Musicians|Politicians|Actors|Weddings|Crowds|Children|Faces|Human)/i;
function photoMetaOk(title, m) {
  m = m || {};
  var cats = (m.Categories && m.Categories.value) || '', desc = stripTags(m.ImageDescription && m.ImageDescription.value), obj = stripTags(m.ObjectName && m.ObjectName.value);
  var text = String(title || '').replace(/^File:/, '') + ' ' + obj + ' ' + desc.slice(0, 300);
  if (PHOTO_SKIP.test(text) || /maps|coats of arms|logos|diagrams|charts|aerial maps|plans|satellite|historical images|old photographs|postcards|paintings|drawings|engravings/i.test(cats)) return false;
  if (PHOTO_PEOPLE.test(text) || PHOTO_PEOPLE_CAT.test(cats)) return false;
  if (PHOTO_BW.test(text) || PHOTO_BW.test(cats)) return false;
  if (PHOTO_OFF.test(text)) return false;
  var dt = stripTags(m.DateTimeOriginal && m.DateTimeOriginal.value), y = +((/\b(1[6-9]\d\d|20\d\d)\b/.exec(dt) || [])[1] || 0);
  if (y && y < 1980) return false;
  return true;
}
/* same shot twice: "Meilen Kirche 01.jpg" and "Meilen Kirche 02.jpg" by the same photographer, or one photographer within the same hour */
function photoStem(title) { return String(title || '').replace(/^File:/, '').replace(/\.\w+$/, '').toLowerCase().replace(/\b(img|dsc|dscn|dscf|p|pict|photo|foto)[_-]?\d+/g, '').replace(/\(\d+\)|\d+|[_\-.,()]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function photoBucket(m) { m = m || {}; var a = stripTags(m.Artist && m.Artist.value), dt = stripTags(m.DateTimeOriginal && m.DateTimeOriginal.value); return a && dt.length >= 13 ? a + '|' + dt.slice(0, 13) : ''; }
/* pixels: a small thumbnail is drawn to a canvas. Grey or sepia (one hue only) is dropped, and so is a near-copy of a photo
   already kept (difference hash). Faces are dropped where the browser can find them. Anything that cannot be checked is kept. */
function smallThumb(src, w) { return /\/\d+px-/.test(src) ? src.replace(/\/\d+px-/, '/' + w + 'px-') : src; }
function photoPixels(src) {
  return new Promise(function (resolve) {
    var img = new Image(), done = false, finish = function (v) { if (!done) { done = true; resolve(v); } };
    img.crossOrigin = 'anonymous'; img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
    var to = setTimeout(function () { finish(null); }, 4000);
    img.onerror = function () { clearTimeout(to); finish(null); };
    img.onload = function () {
      clearTimeout(to);
      try {
        var c = document.createElement('canvas'), W = 32, H = 24; c.width = W; c.height = H;
        var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
        var d = g.getImageData(0, 0, W, H).data, n = W * H, srg = 0, syb = 0, qrg = 0, qyb = 0;
        for (var i = 0; i < d.length; i += 4) { var rg = d[i] - d[i + 1], yb = 0.5 * (d[i] + d[i + 1]) - d[i + 2]; srg += rg; syb += yb; qrg += rg * rg; qyb += yb * yb; }
        var mrg = srg / n, myb = syb / n, spread = Math.sqrt(Math.max(0, qrg / n - mrg * mrg) + Math.max(0, qyb / n - myb * myb));
        var h = document.createElement('canvas'); h.width = 9; h.height = 8; var hg = h.getContext('2d', { willReadFrequently: true }); hg.drawImage(img, 0, 0, 9, 8);
        var hd = hg.getImageData(0, 0, 9, 8).data, bits = [];
        for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) { var a = (y * 9 + x) * 4, b = a + 4; bits.push((hd[a] + hd[a + 1] + hd[a + 2]) > (hd[b] + hd[b + 1] + hd[b + 2]) ? 1 : 0); }
        var out = { spread: spread, hash: bits, faces: 0 };
        if ('FaceDetector' in window) {
          try { new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 }).detect(img).then(function (f) { out.faces = (f || []).filter(function (o) { var bb = o.boundingBox; return bb && bb.width * bb.height > 0.004 * img.naturalWidth * img.naturalHeight; }).length; finish(out); }, function () { finish(out); }); return; } catch (e) {}
        }
        finish(out);
      } catch (e) { finish(null); }
    };
    img.src = src;
  });
}
function hamming(a, b) { var n = 0; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; }
var PHOTO_GREY = 7, PHOTO_SAME = 10;
/* keep, in order, the photos whose pixels pass; at most `max` */
function photoPixelFilter(list, max) {
  return Promise.all(list.map(function (p) { return photoPixels(smallThumb(p.src, 120)); })).then(function (px) {
    var kept = [], hashes = [];
    list.forEach(function (p, i) {
      var q = px[i];
      if (q) {
        if (q.spread < PHOTO_GREY || q.faces) return;
        if (hashes.some(function (h) { return hamming(h, q.hash) <= PHOTO_SAME; })) return;
        hashes.push(q.hash);
      }
      if (kept.length < max) kept.push(p);
    });
    return kept;
  });
}
function photoFromInfo(p, ii) {
  var m = ii.extmetadata || {};
  return { src: ii.thumburl || ii.url, full: ii.url, page: ii.descriptionurl, author: stripTags(m.Artist && m.Artist.value).slice(0, 80), licence: (m.LicenseShortName && m.LicenseShortName.value) || '', licenceUrl: (m.LicenseUrl && m.LicenseUrl.value) || '', title: stripTags(m.ImageDescription && m.ImageDescription.value).slice(0, 140) || p.title.replace(/^File:/, '').replace(/\.\w+$/, ''), w: ii.width, h: ii.height, idx: p.index || 0, landscape: ii.width >= ii.height, stem: photoStem(p.title) + '|' + stripTags(m.Artist && m.Artist.value), bucket: photoBucket(m) };
}

/* extra regional and national indicators for the Facts tab and All data (Eurostat) */
/* a share from two picks of the same table: numerator / denominator (or numerator / (numerator + alternative)), same year */
function jsRatio(j, d) {
  var pick = function (code) { var p = {}; for (var k in d.prefs) p[k] = d.prefs[k]; p.citizen = [code]; return jsPick(j, p); };
  var num = pick(d.ratio.codes[0]); if (!num) return null;
  var den = pick(d.ratio.codes[1]);
  if (!den || den.year !== num.year) { var alt = pick(d.ratio.codes[2]); den = alt && alt.year === num.year ? { v: alt.v + num.v, year: num.year } : null; }
  if (!den || !(den.v > 0)) return null;
  return { v: 100 * num.v / den.v, year: num.year };
}
var REG_MORE = [
  { k: 'kids', ds: 'demo_r_pjanind3', lvl: 3, prefs: { indic_de: ['PC_Y0_14'], unit: ['PC'] }, label: 'Children under 15', fmt: function (v) { return fmt(v, 1) + '% of residents'; } },
  { k: 'old', ds: 'demo_r_pjanind3', lvl: 3, prefs: { indic_de: ['PC_Y65_MAX'], unit: ['PC'] }, label: 'Residents aged 65 and over', fmt: function (v) { return fmt(v, 1) + '% of residents'; } },
  { k: 'fert', ds: 'demo_r_find3', lvl: 3, prefs: { indic_de: ['TOTFERRT'], unit: ['NR'] }, label: 'Children per woman', fmt: function (v) { return fmt(v, 2); } },
  { k: 'foreign', ds: 'lfst_r_lfsd2pwn', lvl: 2, prefs: { sex: ['T'], age: ['Y20-64'], wstatus: ['POP'], unit: ['THS_PER'] }, ratio: { codes: ['FOR', 'TOTAL', 'NAT'], pick: jsRatio }, label: 'Foreign citizens among residents aged 20 to 64', fmt: function (v) { return fmt(v, 1) + '%'; } },
  { k: 'income', ds: 'nama_10r_2hhinc', lvl: 2, prefs: { unit: ['EUR_HAB'], direct: ['BAL'], na_item: ['B6N'] }, label: 'Household disposable income per person', fmt: function (v) { return '€' + fmtInt(v) + ' a year'; } },
  { k: 'poverty', ds: 'ilc_peps11n', lvl: 2, prefs: { unit: ['PC'] }, label: 'At risk of poverty or social exclusion', fmt: function (v) { return fmt(v, 1) + '% of residents'; } },
  { k: 'tert', ds: 'edat_lfse_04', lvl: 2, prefs: { sex: ['T'], age: ['Y25-64'], isced11: ['ED5-8'], unit: ['PC'] }, label: 'Adults aged 25 to 64 with a university degree', fmt: function (v) { return fmt(v, 1) + '%'; } },
  { k: 'crime', ds: 'ilc_mddw03', lvl: 0, prefs: { hhcomp: ['TOTAL'], rskpovth: ['TOTAL'], unit: ['PC'] }, label: 'People who report crime, violence or vandalism in their area', fmt: function (v) { return fmt(v, 1) + '% (national survey)'; } }
];

/* styles for these parts, added when the module loads */
(function () { var st = document.createElement('style'); st.id = 'nz-more-css'; st.textContent = ".alldata .ad-tools{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 10px}details.adg{border:1px solid var(--line);border-radius:12px;margin:0 0 8px;background:var(--surface)}details.adg>summary{cursor:pointer;padding:11px 14px;display:flex;align-items:baseline;gap:8px;list-style:none}details.adg>summary::-webkit-details-marker{display:none}details.adg>summary::before{content:\"▸\";color:var(--ink-3);transition:transform .15s}details.adg[open]>summary::before{transform:rotate(90deg)}details.adg .tablewrap{margin:0 10px 10px}.adt th{font-weight:550;width:55%}.adt td{text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.adt tr.hasn th,.adt tr.hasn td{border-bottom:0;padding-bottom:2px}.adt tr.adn td{text-align:left;font-size:12px;color:var(--ink-3);padding-top:0;font-variant-numeric:normal}.adt tr.live th::after{content:\"live\";margin-left:6px;font-size:10px;font-weight:700;color:var(--blue);border:1px solid currentColor;border-radius:4px;padding:0 4px;vertical-align:1px}table.cmpx{width:100%;border-collapse:collapse;font-size:var(--step--1)}.cmpx th,.cmpx td{padding:7px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.cmpx td{font-size:13px;overflow-wrap:anywhere}.cmpx tr.grp th{background:var(--surface-2);font-size:12px;color:var(--ink-3);padding:6px 8px}.cmpx th[scope=\"row\"]{font-weight:550;width:30%}@media (max-width:760px){.cmpx th[scope=\"row\"]{position:sticky;left:0;background:var(--surface);z-index:1;font-size:12.5px;box-shadow:2px 0 0 var(--line)}.cmpx td,.cmpx thead th{min-width:110px}}.catalogue table.cat td{font-size:13px;vertical-align:top}.catalogue table.cat td:first-child{font-weight:550}@media (prefers-reduced-motion:reduce){details.adg>summary::before{transition:none}}"; document.head.appendChild(st); })();

/* the folded households on the start screen are drawn on first use (keeps the start page light) */
function whoMoreFill(g) {
  if (g.dataset.filled) return; g.dataset.filled = '1';
  g.innerHTML = WHO_MORE.map(function (a) { return '<button type="button" data-who="' + esc(a[0]) + '" data-heroprof="' + esc(a[2]) + '" aria-pressed="false">' + profileIcon(a[0], 17) + esc(a[1]) + '</button>'; }).join('');
  $$('#who-more [data-who]').forEach(function (b) { b.addEventListener('mouseenter', function () { if (matchMedia('(hover: hover)').matches) heroSetProfile(b.dataset.heroprof || b.dataset.who); }); b.addEventListener('focus', function () { heroSetProfile(b.dataset.heroprof || b.dataset.who); }); });
}

/* more everyday places counted around the centre */
var AMEN_MORE = [
  ['post', '📮', 'Post offices', 'nwr(around:R,LAT,LON)[amenity=post_office]'],
  ['bank', '🏧', 'Banks and cash machines', 'nwr(around:R,LAT,LON)[amenity~"^(bank|atm)$"]'],
  ['park', '🌳', 'Parks', 'nwr(around:R,LAT,LON)[leisure=park]']
];
function adAll(b) { var ds = $$('#place details.adg'), open = ds.some(function (d) { return !d.open; }); ds.forEach(function (d) { d.open = open; }); b.textContent = open ? 'Close all groups' : 'Open all groups'; }

/* photos in and around a place, filtered (see the picture filter above) */
function photosWith(r, X) {
  var lat = r.lat, lon = r.lon;
  var fails = 0;
  var fname = function (u) { try { return decodeURIComponent(String(u).split('/').pop()); } catch (e) { return String(u); } };
  var lead = placeContext(r).then(function (c) { return c && c.image && !PHOTO_SKIP.test(fname(c.image)) && !X.PHOTO_PEOPLE.test(fname(c.image)) ? [{ src: c.image, full: c.image, page: c.url || '', author: '', licence: '', title: r.name, lead: true, stem: X.photoStem(fname(c.image)) }] : []; }).catch(function () { fails++; return []; });
  var keep = function (p) { var ii = p.imageinfo && p.imageinfo[0]; if (!ii) return null; if (!/^image\/(jpeg|webp|png)/.test(ii.mime || '') || ii.width < 700 || ii.height < 420) return null; if (!X.photoMetaOk(p.title, ii.extmetadata)) return null; return X.photoFromInfo(p, ii); };
  var geoq = !fin(lat) ? Promise.resolve([]) : jget('https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=' + lat + '%7C' + lon + '&ggsradius=' + (r.area_km2 > 60 ? 10000 : 6000) + '&ggslimit=80&ggsnamespace=6&prop=imageinfo&iiprop=url%7Cmime%7Csize%7Cextmetadata&iiurlwidth=960&format=json&origin=*').then(function (j) {
    return Object.values((j.query || {}).pages || {}).map(keep).filter(Boolean).sort(function (a, b) { return (b.landscape - a.landscape) || (a.idx - b.idx); });
  }).catch(function () { fails += 2; return []; });
  var q = stripParen(r.name) + ' ' + localAreaOf(r) + ' ' + countryName(r.country);
  var srch = jget('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=' + encodeURIComponent(q) + '&gsrlimit=20&prop=imageinfo&iiprop=url%7Cmime%7Csize%7Cextmetadata&iiurlwidth=960&format=json&origin=*').then(function (j) {
    return Object.values((j.query || {}).pages || {}).map(keep).filter(Boolean).sort(function (a, b) { return a.idx - b.idx; });
  }).catch(function () { fails++; return []; });
  return Promise.all([lead, geoq, srch]).then(function (a) {
    var seen = {}, stems = {}, buckets = {}, out = [];
    a[0].concat(a[1], a[2]).forEach(function (p) {
      var k = String(p.full || p.src).split('/').pop().split('?')[0].replace(/^\d+px-/, '');
      if (seen[k] || (p.stem && stems[p.stem]) || (p.bucket && buckets[p.bucket])) return;
      seen[k] = 1; if (p.stem) stems[p.stem] = 1; if (p.bucket) buckets[p.bucket] = 1; out.push(p);
    });
    out = out.slice(0, 30);
    if (!out.length) { if (fails >= 2) { out.failed = true; delete PHOTOS[r.id]; } return out; }
    return X.photoPixelFilter(out, 18);
  });
}

/* ---------- printable documents: the booklet (one place) and the comparison (two or three places) ---------- */
function liveWithin(r, ms) { return Promise.race([adLive(r), new Promise(function (res) { setTimeout(function () { res({ rows: [], late: true }); }, ms); })]); }
/* every built-in figure, grouped; one value column per place */
function docAllHTML(list) {
  var per = list.map(function (r) { var m = {}; adRows(r).forEach(function (o) { m[o.k] = o; }); return m; }), order = [], seen = {};
  list.forEach(function (r) { adRows(r).forEach(function (o) { if (!seen[o.k]) { seen[o.k] = 1; order.push(o); } }); });
  var one = list.length === 1;
  return '<h2>All data</h2><p class="muted">Every figure Nestlyzer has' + (one ? ' for ' + esc(list[0].name) : ' for these places') + ', with its source. Figures marked “live” come from Eurostat, OpenStreetMap, NASA, USGS and Wikidata; regional figures describe the wider region.</p>' +
    AD_GROUPS.map(function (g) {
      var rs = order.filter(function (o) { return o.g === g[0]; });
      return '<h3 data-g="' + g[0] + '"' + (rs.length ? '' : ' hidden') + '>' + esc(g[1]) + '</h3><table class="all" data-g="' + g[0] + '"' + (rs.length ? '' : ' hidden') + '>' + (one ? '' : '<tr><th></th>' + list.map(function (r) { return '<th>' + esc(r.name) + '</th>'; }).join('') + '</tr>') +
        rs.map(function (o) { return docRow(o, per.map(function (m) { return m[o.k]; }), one); }).join('') + '</table>';
    }).join('') + '<p class="muted" id="nz-livestatus">Live figures are loading…</p>';
}
function docRow(o, cells, one, live) {
  if (one) { var c = cells[0]; return '<tr data-k="' + esc(o.k) + '"><td>' + esc(o.label) + (live ? ' <small>(live)</small>' : '') + '</td><td><b>' + esc(c ? c.val : '–') + '</b></td><td class="muted">' + esc(c ? c.src : '') + '</td></tr>'; }
  return '<tr data-k="' + esc(o.k) + '"><td>' + esc(o.label) + (live ? ' <small>(live)</small>' : '') + '</td>' + cells.map(function (c) { return '<td>' + esc(c ? c.val : '–') + '</td>'; }).join('') + '</tr>';
}
function docLive(list, doc, done) {
  if (!extOn()) { var s0 = doc.getElementById('nz-livestatus'); if (s0) s0.textContent = 'Live content is switched off, so only the built-in figures are included.'; setTimeout(done, 400); return; }
  Promise.all(list.map(function (r) { return liveWithin(r, 8000); })).then(function (res) {
    var per = res.map(function (x) { var m = {}; (x.rows || []).forEach(function (o) { m[o.k] = o; }); return m; }), order = [], seen = {}, one = list.length === 1;
    res.forEach(function (x) { (x.rows || []).forEach(function (o) { if (!seen[o.k]) { seen[o.k] = 1; order.push(o); } }); });
    order.forEach(function (o) {
      var t = doc.querySelector('table.all[data-g="' + o.g + '"]'), h = doc.querySelector('h3[data-g="' + o.g + '"]'); if (!t || t.querySelector('[data-k="' + o.k + '"]')) return;
      t.hidden = false; if (h) h.hidden = false;
      t.insertAdjacentHTML('beforeend', docRow(o, per.map(function (m) { return m[o.k]; }), one, true));
    });
    var st = doc.getElementById('nz-livestatus'), late = res.some(function (x) { return x.late; });
    if (st) st.textContent = order.length + ' live figures included' + (late ? '; some services were too slow and are missing' : '') + '.';
    setTimeout(done, 300);
  });
}
var DOC_CSS = '@page{size:A4;margin:14mm}body{font-family:"Public Sans",Arial,sans-serif;color:#132238;margin:0}h1{font-size:26px;margin:6px 0 2px}h2{font-size:16px;margin:20px 0 8px;border-bottom:2px solid #0B2E5C;padding-bottom:4px}h3{font-size:13px;margin:14px 0 4px;color:#0B2E5C}p,td,th,li{font-size:11px;line-height:1.45}.muted{color:#5b6778}table{width:100%;border-collapse:collapse;page-break-inside:auto}tr{page-break-inside:avoid}td,th{border-bottom:1px solid #e3e7e1;padding:4px;text-align:left;vertical-align:top}th{background:#f3f5f2}td.best{background:#e6f4ea;font-weight:700}.verdict{margin:4px 0;font-size:12px}small{color:#5b6778}header{display:flex;justify-content:space-between;align-items:center}header img{height:40px}.foot{margin-top:22px;font-size:9.5px;color:#5b6778}@media screen{body{max-width:900px;margin:24px auto;padding:0 16px}}';
/* the comparison as a document: the comparison table as shown, then every figure side by side */
function compareDoc(list) {
  var modal = document.getElementById('modal'), tbl = modal && modal.querySelector('table.cmp'), ver = modal && modal.querySelector('.verdicts');
  var t = tbl ? tbl.cloneNode(true) : null;
  if (t) { t.querySelectorAll('.cmp-acts,.cmp-ph,button,img,svg').forEach(function (n) { n.remove(); }); }
  var names = list.map(function (r) { return r.name; }).join(', ');
  var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Compare ' + esc(names) + ', Nestlyzer</title><style>' + DOC_CSS + '</style></head><body>' +
    '<header><img src="' + (window.NZ_ASSET_URL ? window.NZ_ASSET_URL('/assets/icon-192.png') : location.origin + '/assets/icon-192.png') + '" alt="Nestlyzer" width="40" height="40"><span class="muted">' + new Date().toISOString().slice(0, 10) + '</span></header>' +
    '<h1>Compare: ' + esc(names) + '</h1><p class="muted">Profile: ' + esc((profileDef(S.profile) || {}).name || '') + '. ' + list.map(function (r) { return esc(r.name) + ' (' + esc(localAreaOf(r)) + ', ' + esc(countryName(r.country)) + ')'; }).join('; ') + '.</p>' +
    (ver ? '<h2>In short</h2>' + ver.outerHTML.replace(/class="verdicts"/, '') : '') +
    (t ? '<h2>Side by side</h2>' + t.outerHTML : '') +
    '<div id="nz-alldata">' + docAllHTML(list) + '</div>' +
    '<p class="foot">Decision-support export, not legal, tax, investment, immigration, medical, real-estate or financial advice. Public data can be incomplete or outdated. Publisher: Torsten Sauter, Alte Landstrasse 77, 8706 Meilen, Switzerland, torsten.sauter@icloud.com. Generated by nestlyzer.com.</p></body></html>';
  return html;
}

/* open a print-ready document, add every figure (built-in at once, live as it arrives, at most 8 s), then print.
   If the browser blocked the new tab, the document is saved as a file instead. */
function printInto(w, html, list, fname) {
  if (!w) { var url = URL.createObjectURL(new Blob([html.replace('<div id="nz-alldata"></div>', '<div id="nz-alldata">' + docAllHTML(list) + '</div>')], { type: 'text/html' })), a = document.createElement('a'); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove(); toast('Saved as a file', 'Your browser blocked the new tab, so the document was saved instead. Open it and print to PDF.'); return; }
  w.document.open(); w.document.write(html); w.document.close();
  var done = false, finish = function () { if (done) return; done = true; try { w.focus(); w.print(); } catch (e) {} };
  var box = w.document.getElementById('nz-alldata');
  if (box && !box.firstChild) box.innerHTML = docAllHTML(list);
  docLive(list, w.document, finish);
}

/* clicks on parts this module drew */
function click(t) {
  var b;
  if ((b = t.closest('[data-adcsv]'))) { adCSV(b.dataset.adcsv); return true; }
  if ((b = t.closest('[data-adall]'))) { adAll(b); return true; }
  return ptClick(t);
}

function whoMore(b) { var g = $('#who-more'); if (!g) return; whoMoreFill(g); var show = g.hidden; g.hidden = !show; b.setAttribute('aria-expanded', show); var sp = b.querySelector('span'); if (sp) sp.textContent = show ? 'Fewer households' : 'More households'; if (show) { var f = g.querySelector('button'); if (f) f.focus(); } }

/* Key facts: the place's own official figures first (municipality, then district or county level), the ones that matter
   most for the chosen profile on top, each with its year and source. Only figures that exist are shown. */
var KF_SKIP = /^(geo_(?!catchment_30km|hub_airport_km|major_city_km|coast_km)|n_hospital|n_general_hospital|n_universit|n_station|n_stations|common_population_scale|common_density)/;
function kfLevel(r, lv) {
  if (!lv || lv === 1) return '';
  if (lv === 9) return 'national';
  if (lv === 2) return 'regional';
  if (lv === 3) return r.country === 'US' ? 'county' : r.country === 'IL' ? 'regional council' : r.country === 'PT' ? 'municipality' : r.country === 'UK' ? 'council area' : 'district';
  return '';
}
function keyFactsHTML(r) {
  var fr = r.factorRaw || {}, lvm = r.factorLevel || {}, w = ENGINE.weightsFor(r, S.profile) || {}, cand = [];
  META.factors.forEach(function (f) {
    var v = fr[f.id]; if (!fin(v) || KF_SKIP.test(f.id)) return;
    if (/^geo_.*_km$/.test(f.id) && v < 1) return;   // "0.0 km to a city" says nothing about a place that is the city
    var lv = lvm[f.id] || 1;
    if (f.countries && f.countries.length && f.countries.indexOf(r.country) < 0 && !(f.by_country && f.by_country[r.country])) return;
    var val = adFmtRaw(f, v); if (val == null) return;
    var b = f.by_country && f.by_country[r.country];
    cand.push({ f: f, val: val, lv: lv, w: (w[f.category] || 0) + (f.score_role === 'raw' ? -0.5 : 0), yr: b ? b.period : (f.source_period || ''), src: b ? b.source_name : (f.source_name || '') });
  });
  // the place's own and district figures first; regional and national ones only fill up a short list, and say so
  // business: only figures that matter to the site (its weighted categories and site-fit measures), and the
  // key figures for the site type come first
  var bizk = isBizKey(S.profile);
  if (bizk) { var pw = (META.config.profiles[S.profile] || {}), wc = pw.weights || {}, fo = pw.focus || {}; cand = cand.filter(function (c) { return (wc[c.f.category] || fo[c.f.id]) && !/^(family|health|safety|tax|lifestyle|environment|affordability|demographics)$/.test(c.f.category) || fo[c.f.id]; }); }
  var near = cand.filter(function (c) { return c.lv === 1 || c.lv === 3; });
  if (near.length < 6) cand = near.concat(cand.filter(function (c) { return c.lv !== 1 && c.lv !== 3; }).sort(function (a, b) { return a.lv - b.lv; }).slice(0, 8 - near.length)); else cand = near;
  // a short list fills up with the place's measured site data (2.11): people nearby, climate class, altitude, reach
  if (!bizk && cand.length < 4) {
    var xx = r.x || {}, xf = function (id, name, val, src) { if (val != null) cand.push({ f: { id: id, name: name, category: 'foundation' }, val: val, lv: 1, w: -1, yr: '', src: src }); };
    if (fin(xx.pop10)) xf('x_pop10', 'People within 10 km', fmtInt(xx.pop10), 'Nestlyzer, from population counts');
    if (xx.kg && xx.kg !== 'Ocean') xf('x_kg', 'Climate class (Köppen-Geiger)', xx.kg, 'Köppen-Geiger map');
    if (fin(xx.alt)) xf('x_alt', 'Altitude', fmtInt(xx.alt) + ' m', 'terrain model');
    if (fin(xx.reach100k)) xf('x_reach', 'Residents within 100 km', fmtInt(xx.reach100k * 1000), 'Nestlyzer, all countries');
  }
  if (!cand.length || bizk && cand.length < 3) return (bizk ? bizClimHTML(r) : '') + housingWorkHTML(r) + histHTML(r);
  cand.sort(function (a, b) { return ((a.lv === 3 ? 1.5 : a.lv) - (b.lv === 3 ? 1.5 : b.lv)) || (b.w - a.w) || a.f.name.localeCompare(b.f.name); });
  var seen = {}, pick = [];
  cand.forEach(function (c) { var k = c.f.name.toLowerCase(); if (seen[k] || pick.length >= 12) return; seen[k] = 1; pick.push(c); });
  pick.sort(function (a, b) { return (b.w - a.w) || (a.lv - b.lv); });
  var local = cand.filter(function (c) { return c.lv === 1; }).length;
  var kfHTML = '<section class="sec keyfacts"><h3>Key facts for ' + esc(r.name) + '</h3><p class="sub">' + fmtInt(cand.length) + ' official figures for ' + esc(r.name) + (local < cand.length ? ' and its wider area' : '') + ', most relevant for ' + esc(profileName(S.profile)) + ' first: <span class="kfkey good">helps</span> <span class="kfkey bad">weak</span> <span class="kfkey dim">does not count for this profile</span>. Hover or tap a figure for its source. <button class="linkbtn" type="button" data-ptab="data">All data</button></p><div class="kfgrid">' +
    pick.map(function (c) {
      var tag = kfLevel(r, c.lv), yr = String(c.yr || '').replace(/\s*snapshot in embedded build/i, '').replace(/^(\d{4})-\d\d-\d\d$/, '$1');
      var src = String(c.src || '').replace(/\s*\(as above\)/i, '').split(/ - | \/ |; |, from | \(/)[0].trim(); if (src.length > 44) src = src.slice(0, 42).replace(/\s+\S*$/, '') + '…';
      // tone for the profile in focus (2.11.2): green helps, red hurts, grey does not count for this profile
      var sc = (r.factorScores || {})[c.f.id], rel = !c.f.not_scored && (w[c.f.category] || 0) > 0 || (bizk && ((META.config.profiles[S.profile] || {}).focus || {})[c.f.id]);
      var tn = !rel ? 'dim' : !fin(sc) ? '' : sc >= 60 ? 'good' : sc <= 40 ? 'bad' : 'mid';
      var tq = fin(sc) && rel ? truePct(r, c.f.id) : null, vd = fin(sc) && rel ? (tq == null ? 'model score ' + Math.round(sc) + ' of 100 in ' : tq >= 50 ? 'better than ' + tq + '% of places in ' : 'weaker than ' + (100 - tq) + '% of places in ') + countryName(r.country) : !rel ? 'does not count for ' + profileName(S.profile).toLowerCase() : 'counts for this profile; no comparison with other places';
      var st = [c.f.description || c.f.name, [yr, tag ? tag + ' value' : '', c.src ? 'Source: ' + c.src : ''].filter(Boolean).join(' · ')].join(' ');
      return '<div class="kf ' + tn + '" data-src="' + esc(st) + '" title="' + esc(st) + '"><b>' + esc(c.val) + '</b><span>' + esc(c.f.name) + '</span>' + (vd || tag ? '<em>' + esc([vd, tag ? tag + ' figure' : ''].filter(Boolean).join(' · ')) + '</em>' : '') + '</div>';
    }).join('') + '</div></section>';
  return fitHTML(r) + (bizk ? bizClimHTML(r) : '') + econHTML(r) + needsHTML(r) + (bizk ? housingWorkHTML(r) + kfHTML.replace(/^<section class="sec keyfacts"><h3>Key facts for /, '<section class="sec keyfacts"><h3>Site facts for ') : kfHTML + housingWorkHTML(r)) + histHTML(r);
}
(function () { var st = document.createElement('style'); st.textContent = ".keyfacts .kfgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.keyfacts .kf{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface)}.keyfacts .kf b{display:block;font:700 1.15rem/1.2 var(--font-display);color:var(--ink)}.keyfacts .kf span{display:block;font-size:13px;line-height:1.3;margin-top:2px}.keyfacts .kf small{display:block;color:var(--ink-3);font-size:11px;margin-top:4px;line-height:1.3}"; document.head.appendChild(st); })();

/* Evidence export for the shortlist (NZ-GLOBAL-042): purpose, profile, weights and scope, then for every saved place its
   score, rank, the data behind the score and every official figure with its period, level and source. */
function evidenceCSV() {
  var list = saved.slice(), p = profileDef(S.profile) || {}, w = (p.weights || {});
  return Promise.all(list.map(function (s) { return loadCountry(s.id.split(':')[0]).catch(function () { return null; }); })).then(function () {
    var L = [['section', 'place id', 'place', 'item', 'value', 'period', 'level', 'source']];
    L.push(['about', '', '', 'Export', 'Nestlyzer __VERSION__ evidence export', new Date().toISOString().slice(0, 10), '', 'https://nestlyzer.com']);
    L.push(['about', '', '', 'Purpose', isBizKey(S.profile) ? 'Business location' : 'Place to live', '', '', '']);
    L.push(['about', '', '', 'Profile', p.name || S.profile, '', '', '']);
    Object.keys(w).forEach(function (k) { L.push(['weights', '', '', shortCat(k), w[k], '', '', '']); });
    list.forEach(function (s) {
      var r = BYID[s.id]; if (!r) { L.push(['place', s.id, s.name, 'Status', 'country data not loaded', '', '', '']); return; }
      var x = (RES && RES.byId[r.id]) || placeX(r), ranked = RES && RES.byId[r.id];
      L.push(['place', r.id, r.name, 'Score', fin(x.overall) ? fmt(x.overall) + ' of 100' : '', '', '', 'Nestlyzer ' + (S.method || 'v2')]);
      L.push(['place', r.id, r.name, 'Rank', ranked ? '#' + ranked.rank + ' of ' + RES.scored.length + ' in ' + scopeName() : 'outside the current scope', '', '', '']);
      if (fin(x.weighted)) L.push(['place', r.id, r.name, 'Data behind the score', evidenceLine(x) + ' (' + assessKind(x)[1] + ')', '', '', '']);
      (x.must || []).forEach(function (m) { L.push(['must-have', r.id, r.name, m.label, m.status === 'pass' ? 'met' : m.status === 'fail' ? 'not met' : 'confirm on site', '', '', '']); });
      var fr = r.factorRaw || {}, lv = r.factorLevel || {};
      META.factors.forEach(function (f) {
        var v = adFmtRaw(f, fr[f.id]); if (v == null) return;
        var b = f.by_country && f.by_country[r.country], l = lv[f.id] || 1;
        L.push(['figure', r.id, r.name, f.name, v, b ? b.period : (f.source_period || ''), l === 9 ? 'country' : l === 2 ? 'region' : l === 3 ? (kfLevel(r, 3) || 'district') : 'place', b ? b.source_name : (f.source_name || '')]);
      });
      var cx = cxRows(r); if (cx) cx.items.forEach(function (b) { var o = b.last; L.push(['context', r.id, r.name, o.label + (cxDim(o) ? ' (' + cxDim(o) + ')' : ''), cxVal(o) + (o.statistic ? ' [' + o.statistic + ']' : ''), String(o.reference_period), cxGeo(o, cx.rel), o.source_id + ' ' + (o.source_url || '')]); });
      if (s.note) L.push(['note', r.id, r.name, 'Your note', s.note, '', '', '']);
    });
    var csv = L.map(function (l) { return l.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'nestlyzer-shortlist-evidence.csv'; document.body.appendChild(a); a.click(); a.remove();
    return L.length;
  });
}

/* Housing and work / Labour costs (release verified-rent-pay-2026-10-21). Context records from official tables: rents,
   rent trends, pay by occupation, employer labour costs. They describe the place, its zone or metro, or the country, and
   say which; they are never place factors, never change a score and never count as measured local data. */
var NACE_NAME = { A: 'agriculture, forestry, fishing', 'B-E': 'industry incl. energy', C: 'manufacturing', F: 'construction', 'G-I': 'trade, transport, hotels and restaurants', G: 'trade', H: 'transport and storage', I: 'hotels and restaurants', J: 'information and communication', K: 'finance and insurance', L: 'real estate', 'M-N': 'professional, scientific and support services', 'O-Q': 'public administration, education, health', 'R-U': 'other services', 'G-N_R-U': 'market services (trade, transport, hotels, information, finance, real estate, business and other services)', 'GZ-IZ': 'trade, transport, hotels and restaurants', 'OZ-QZ': 'public administration, education, health' };
var CX_REL = { is: '', group_member: 'municipality group', zone_member: 'rental zone', metro_member: 'metropolitan area', principal_city: 'metropolitan area (principal city)', state: 'state', region: 'county', station: 'weather station', station_context_within_25km: 'nearby weather station (within 25 km, not municipal data)', district: 'district', municipality: 'municipality', county: 'county', stat_region: 'statistical region', contains: 'county or region' };
function cxDim(r) {
  var d = r.dimensions || {}, b = [];
  if (d.calendar_month != null) { var mo = Number(d.calendar_month); b.push(mo === 0 ? 'annual normal' : ['','January','February','March','April','May','June','July','August','September','October','November','December'][mo] || 'unresolved month'); }
  if (d.occupation) b.push(d.occupation);
  if (d.dwelling_class) b.push(d.dwelling_class); else if (d.rooms) b.push(d.rooms + (d.rooms === '1' ? ' room' : ' rooms'));
  if (d.cohort) b.push(d.cohort);
  if (r.sameN) b.push('the same for all ' + r.sameN + ' household types published');
  else if (d.scenario && d.adults) { var ew = [].concat(d.earner_wages_percent_of_national_average || []), ch = +d.children || 0;
    b.push((+d.adults === 1 ? 'single' : 'couple') + (ch ? ', ' + ch + (ch === 1 ? ' child' : ' children') : ', no children') + (ew.length ? ', earning ' + ew.map(function (x) { return x + '%'; }).join(' + ') + ' of the average wage' : '')); }
  if (d.tax_schedule) b.push(d.tax_schedule === 'married' ? 'married couples (joint tax)' : d.tax_schedule === 'basic' ? 'single people (basic tax rate)' : String(d.tax_schedule).replace(/_/g, ' '));
  if (d.tenancy) b.push(String(d.tenancy).replace(/_/g, ' ').replace('rental dwelling stock', 'existing tenancies'));
  if (d.sector_group && d.sector_group !== 'TOTAL') b.push(NACE_NAME[d.sector_group] || 'NACE ' + d.sector_group);
  if (d.size_band && d.size_band !== 'all') b.push(d.size_band === '0' ? 'no employees' : d.size_band + ' employees');
  if (d.star_category && d.star_category !== 'all') b.push(String(d.star_category).replace(/_/g, ' '));
  if (d.degree_of_urbanisation) b.push(d.degree_of_urbanisation);
  return b.join(', ');
}
function cxVal(r) {
  var v = r.value, u = r.unit || '', m;
  if ((m = u.match(/^(NOK|SEK|EUR)\/m2\/year$/))) return m[1] + ' ' + fmtInt(v) + ' per m² a year (≈ ' + fmtInt(v / 12) + ' a month, our conversion)';
  if ((m = u.match(/^(NOK|SEK|EUR)\/m2\/month$/))) return m[1] + ' ' + fmt(v, 0) + ' per m² a month';
  if ((m = u.match(/^(NOK|SEK)\/dwelling\/month$/))) return m[1] + ' ' + fmtInt(v) + ' a month per dwelling';
  if ((m = u.match(/^(USD|CAD|EUR)\/hour$/))) return m[1] + ' ' + fmt(v, 2) + ' an hour';
  if ((m = u.match(/^(USD|CAD)\/year$/))) return m[1] + ' ' + fmtInt(v) + ' a year';
  if ((m = u.match(/^(CAD)\/week$/))) return m[1] + ' ' + fmt(v, 2) + ' a week';
  if (u === 'percent') return (r.statistic === 'change_percent' && v > 0 ? '+' : '') + fmt(v, 1) + '%';
  if (u === 'jobs') return fmtInt(v) + ' jobs';
  if (u === 'thousand_people') return fmt(v, 1) + ' thousand';
  if (u === 'ratio_to_US') return fmt(v, 2) + ' × US share';
  if (/^index/.test(u)) return fmt(v, 1) + ' (' + u.replace('index_', 'index ').replace('_', ' ') + ')';
  if (u === 'hours/week') return fmt(v, 1) + ' hours a week';
  // other units from the collected data: whole numbers without decimals, readable unit names
  var nu = u.replace(/^persons?$/, 'people').replace(/^percent YOY$/, '% year on year').replace(/^percent[ _](of[ _].*)$/, '% $1').replace(/^percent([ _].*)?$/, function (a, b) { return /^% /.test(a) ? a : '%'; }).replace(/_/g, ' ').replace(/^% $/, '%').trim();
  var num = Math.abs(v) >= 1000 || v === Math.round(v) ? fmtInt(v) : fmt(v, Math.abs(v) < 10 ? 2 : 1);
  return trim0(nu.charAt(0) === '%' ? num + nu : num + (nu ? ' ' + nu : ''));
}
function cxLabel(o) { var l = String(o.label || '').replace(/_/g, ' ').replace(/\b(\d{1,2}) (\d{1,2}) plus\b/, '$1 to $2+').replace(/\b(\d{1,2}) (\d{1,2})\b/g, '$1–$2').replace(/\b(si|surs)$/i, '').replace(/\s+(source defined|no)$/i, '').trim(); return l.charAt(0).toUpperCase() + l.slice(1); }
// readable source: the publisher's web address instead of an internal id (FR_INSEE_PROFILES -> insee.fr)
function cxSrc(o) { var u = String(o.source_url || ''), m = u.match(/^https?:\/\/(?:www\.)?([^\/]+)/); return m ? m[1] : String(o.source_id || '').replace(/^[A-Z]{2}_/, '').replace(/_/g, ' '); }
// one row per figure: a breakdown by sex shows its total only
function cxTotal(o) { var s = (o.dimensions || {}).sex; return !s || /^(t|total|both|all|both sexes|total population)$/i.test(String(s)); }
function cxNote(r) {
  if (r.source_geo_level === 'climate_station') return 'Station normal, not a municipal measurement; nearby-station context only; excluded from ranking scores';
  var n = [r.statistic === 'mean' || r.statistic === 'annualised_mean' ? 'mean' : r.statistic === 'median' ? 'median' : ''];
  if (r.statistic === 'annualised_mean') n.push('publisher annualised at 2,080 hours');
  if (/after_adjustment/.test(r.indicator_id)) n.push('rent of existing tenancies after the yearly adjustment, not a new lease');
  if (/^no_rent/.test(r.indicator_id)) n.push('survey mean; not a price trend');
  if (/_pre_rebase/.test(r.indicator_id)) n.push('pre-April-2026 methodology');
  if ((r.quality_flags || []).indexOf('flash_estimate') >= 0) n.push('flash estimate');
  if (r.uncertainty && r.uncertainty.plus_minus != null) n.push('± ' + r.uncertainty.plus_minus);
  if (/eurostat_total_hourly/.test(r.indicator_id)) n.push('employer cost incl. non-wage costs, firms with 10+ employees, not employee pay');
  if (/^hotel_/.test(r.indicator_id)) n.push('capacity, not overnight stays or occupancy');
  if (/^municipal_facility_count/.test(r.indicator_id)) n.push('count in the whole municipality, not walking distance');
  return n.filter(Boolean).join('; ');
}
function cxRows(r) {
  var sh = SHARDS[r.country], cx = sh && sh.extra && sh.extra.ctx; if (!cx) return null;
  var mine = {}; (cx.places[r.oid] || []).forEach(function (a) { mine[a[0]] = a[1]; });
  var rg = cx.regions || {}; Object.keys(rg).forEach(function (g) { var v = rg[g][1], pv = r[rg[g][0]]; if (pv && (pv === v || v.slice(-1) === '*' && String(pv).indexOf(v.slice(0, -1)) === 0)) mine[g] = rg[g][0] === 'rc' ? 'state' : 'region'; });
  var rows = cx.records.filter(function (o) { return (mine.hasOwnProperty(o.source_geo_id) || o.source_geo_level === 'country' || o.source_geo_level === 'country_scenario' || o.source_geo_id === 'EUROSTAT:EU27_2020') && cxTotal(o); });
  // latest period per indicator, geography and dimensions; earliest kept for a source trend where the series is a trend
  var best = {};
  rows.forEach(function (o) { var k = o.indicator_id + '|' + o.source_geo_id + '|' + JSON.stringify(o.dimensions); var b = best[k]; if (!b) best[k] = { last: o, first: o }; else { if (String(o.reference_period) > String(b.last.reference_period)) b.last = o; if (String(o.reference_period) < String(b.first.reference_period)) b.first = o; } });
  return { rel: mine, all: cx.records.filter(function (o) { return mine.hasOwnProperty(o.source_geo_id) || o.source_geo_level === 'country' || o.source_geo_level === 'country_scenario' || o.source_geo_id === 'EUROSTAT:EU27_2020'; }), items: Object.keys(best).map(function (k) { return best[k]; }) };
}
function cxGeo(o, rel) {
  if (o.source_geo_level === 'country') return 'national';
  if (o.source_geo_level === 'country_scenario') return o.sameN ? 'national' : 'national, for the household type shown';
  if (o.source_geo_level === 'multicountry_aggregate') return o.area_label + ' (benchmark)';
  var rr = rel[o.source_geo_id]; return rr === 'is' ? 'this municipality' : (CX_REL[rr] || o.source_geo_level.replace(/_/g, ' ')) + (o.area_label ? ': ' + o.area_label : '');
}
function housingWorkHTML(r, traceOnly) {
  var c = cxRows(r); if (!c || !c.items.length) return traceOnly ? null : '';
  var biz = isBizKey(S.profile), it = c.items;
  // 2.15.3: one row for a household-type figure that is the same for every household type (was repeated up to 8 times)
  var MERGED = {};
  (function () { var seen = {}, out = []; it.forEach(function (b) { var o = b.last, d = o.dimensions || {}; if (!d.scenario) { out.push(b); return; }
    var k = o.indicator_id + '|' + o.unit + '|' + o.reference_period + '|' + Math.round(o.value * 100);
    if (seen[k]) { seen[k].n++; MERGED[o.record_id] = 1; return; } var o2 = Object.assign({}, o), b2 = Object.assign({}, b, { last: o2 }); seen[k] = { b: b2, n: 1 }; out.push(b2); });
    Object.keys(seen).forEach(function (k) { if (seen[k].n > 1) seen[k].b.last.sameN = seen[k].n; }); it = out; })();
  var pick = function (re, n, sortBy) { var a = it.filter(function (b) { return re.test(b.last.indicator_id); }); if (sortBy) a.sort(sortBy); return a; };
  var local = function (b) { var l = b.last.source_geo_level; return l === 'country' || l === 'country_scenario' ? 1 : l === 'multicountry_aggregate' ? 2 : 0; };
  var byPay = function (a, b) { var al = /^all/i.test((a.last.dimensions || {}).occupation || '') ? 0 : 1, bl = /^all/i.test((b.last.dimensions || {}).occupation || '') ? 0 : 1; return local(a) - local(b) || al - bl || b.last.value - a.last.value; };
  var byLocal = function (a, b) { return local(a) - local(b) || String(a.last.label).localeCompare(b.last.label); };
  var byShare = function (a, b) { return local(a) - local(b) || b.last.value - a.last.value; };
  var SZ = ['all', '0', '1-9', '10-19', '20-49', '50-99', '100-199', '200+', '10-49', '50+'];
  var bySize = function (a, b) { return SZ.indexOf((a.last.dimensions || {}).size_band) - SZ.indexOf((b.last.dimensions || {}).size_band); };
  var totalSector = function (b) { var g = (b.last.dimensions || {}).sector_group; return !g || g === 'TOTAL'; };
  // business: the KPIs a planner compares for this kind of site come first (profile.kpis, catalogue in config.bizKpis)
  var kp = (KPIX && KPIX.byProfile[S.profile]) || [], KC = (KPIX && KPIX.kpis) || {}, kfig = [];
  kp.forEach(function (id) { var c = KC[id]; if (!c) return; var re = new RegExp(c.match, 'i'); kfig = kfig.concat(it.filter(function (b) { return kfig.indexOf(b) < 0 && re.test(b.last.indicator_id + ' ' + ((b.last.dimensions || {}).occupation || '')); }).sort(byLocal).slice(0, 2)); });
  // 2.11.4: what matters most for this profile leads (local before national), the rest is "nice to know"
  var pk = S.profile, REL = [
    [/taxable_income_(median|mean)$/, biz ? /shop|cafe|guesthouse|practice|studio|startup|services|hq|tech/ : /./, 1],
    [/^eurostat_total_hourly_labour_cost/, biz ? /./ : null, 2],
    [/wage|earning/, /./, 3],
    [/purchase_price|house_price/, biz ? null : /./, 1],
    [/rent_mean|rent_non_subsidised/, biz ? /hq|tech|services|startup|contact/ : /./, 1],
    [/rent_change|rent_annual_change/, biz ? null : /./, 4],
    [/unemploy/, /./, 4],
    [/kindergarten|childcare|school/, /family|parent/, 2],
    [/^hotel_/, /guesthouse|cafe/, 2],
    [/gas_price|electricity_price|renewable/, /energy|manufactur|datacenter|pharma|food/, 2],
    [/logistics_performance/, /logistics|fulfilment|port/, 2],
    [/commercial_profits|corporate_income_tax/, biz ? /./ : null, 3],
    [/broadband/, /tech|datacenter|contact|studio|startup|remote|digital/, 3],
    [/hospital_beds|life_expectancy/, /pensioner|healthcare|retiree/, 3],
    [/homicide/, /family|parent|pensioner/, 5]];
  var relOf = function (b) { var id = String(b.last.indicator_id), best = 9; REL.forEach(function (e) { if (e[1] && e[1].test(pk) && e[0].test(id) && e[2] < best) best = e[2]; }); return best; };
  var kseen = {}, kbase = function (b) { return String(b.last.indicator_id).replace(/_(median|mean|p25|p75)$/, '') + '|' + JSON.stringify((b.last.dimensions || {}).occupation || ''); };
  var krel = it.filter(function (b) { return relOf(b) < 9 && kfig.indexOf(b) < 0; }).sort(function (a, b) { return local(a) - local(b) || relOf(a) - relOf(b); });
  kfig = krel.filter(function (b) { return local(b) === 0; }).concat(kfig, krel.filter(function (b) { return local(b) !== 0; }))
    .filter(function (b) { var k = kbase(b); if (kseen[k]) return /_(median|mean|p25|p75)$/.test(b.last.indicator_id); kseen[k] = 1; return true; });
  // a quartile set counts as one figure: keep its sibling rows together so they merge into one row
  var kcount = 0; kfig = kfig.filter(function (b) { if (/_(p25|p75)$/.test(b.last.indicator_id)) return true; return ++kcount <= 8; });
  var groups = biz ? [
      ['Key figures for ' + profFor(), kfig],
      ['Employer labour cost', pick(/^eurostat_total_hourly_labour_cost/, 3, byLocal), true],
      ['Pay by occupation', pick(/^bls_oews_mean_hourly_wage|^ca_lfs_mean_hourly_wage/, 14, byPay)],
      ['Occupational concentration', pick(/^bls_oews_location_quotient/, 8, byLocal)],
      ['Investment price level', pick(/^eu_gfcf_price_level/, 2, byLocal)],
      ['Local industry structure: share of employee positions', pick(/^industry_mix:employment_share$/, 12, byShare)],
      ['Local industry structure: share of employer establishments', pick(/^industry_mix:employer_establishment_share$/, 12, byShare)],
      ['Local industry structure: share of active local units', pick(/^industry_mix:active_local_unit_share$/, 12, byShare)],
      ['Establishments by size', it.filter(function (b) { return /^establishments_size:count_by_band$/.test(b.last.indicator_id) && totalSector(b); }).sort(function (a, b) { return local(a) - local(b) || bySize(a, b); })],
      ['New establishments by sector', pick(/^establishment_births:count$/, 10, byShare)],
      ['Hotels', pick(/^hotel_(rooms|establishments)$/, 12, byLocal).filter(function (b) { return ((b.last.dimensions || {}).star_category || 'all') === 'all'; })]]
    : [['Key figures for ' + profFor(), kfig],
      ['Rents', pick(/rent_mean|rent_non_subsidised_index/, 10, byLocal)],
      ['Rent trend', pick(/rent_change|rent_annual_change/, 6, byLocal)],
      ['Pay by occupation', pick(/^bls_oews_mean_hourly_wage|^ca_lfs_mean_hourly_wage/, 10, byPay)],
      ['Shops, doctors and schools in the municipality', pick(/^municipal_facility_count:/, 20, byLocal)],
      ['Housing conditions in the country', pick(/^(household_size|owner_occupier_share|overcrowding|housing_underoccupation|inability_heat_home|housing_payment_arrears|housing_rooms_per_person|housing_cost_income_share|housing_overburden:)/, 10, byLocal).filter(function (b) { return b.last.release === 'delivery-2026-10-24' && local(b) === 1; })]];
  // national key figures (World Bank WDI, 2.11): the country at a glance, after the local figures
  var wdi = it.filter(function (b) { return b.last.release === 'wdi-2026-10' || b.last.release === 'tables-2026-10-25'; }).sort(function (a, b) { return String(a.last.label).localeCompare(b.last.label); });
  if (wdi.length) groups.push(['The country at a glance (World Bank)', wdi]);
  var stationRows = it.filter(function (b) { return b.last.source_geo_level === 'climate_station'; });
  if (stationRows.length) { groups.forEach(function (g) { g[1] = g[1].filter(function (b) { return b.last.source_geo_level !== 'climate_station'; }); }); groups.push(['Nearby weather-station normals (not municipal measurements)', stationRows]); }
  var used = {}; groups.forEach(function (g) { g[1].forEach(function (b) { used[b.last.record_id] = 1; }); });
  // 2.12.2 (NZA-05): every remaining distinct figure stays reachable, whatever its release; local ones first, then the
  // region and the country. Only correction rows and rows without a number stay out (they carry a reason in the trace).
  var isFig = function (b) { return b.last.value != null && !/^(adjustment|correction)s?$/i.test(b.last.label || ''); };
  var byLabel = function (a, b) { return String(a.last.label).localeCompare(b.last.label); };
  var more = it.filter(function (b) { return !used[b.last.record_id] && isFig(b); });
  if (more.some(function (b) { return local(b) === 0; })) groups.push(['More local figures', more.filter(function (b) { return local(b) === 0; }).sort(byLabel)]);
  if (more.some(function (b) { return local(b) !== 0; })) groups.push(['More figures for the region and the country', more.filter(function (b) { return local(b) !== 0; }).sort(function (a, b) { return local(a) - local(b) || byLabel(a, b); })]);
  if (kfig.length) groups.slice(1).forEach(function (g) { g[1] = g[1].filter(function (b) { return kfig.indexOf(b) < 0; }); });
  if (traceOnly) {
    // data-use trace (2.12.2, NZA-06): what this page does with every figure that applies to this place
    var T = { summary: [], expanded: [], dropped: {} }, on = {};
    groups.forEach(function (g, gi) { g[1].forEach(function (b) {
      var o = b.last, m = /^(.*)_(median|mean|p25|p75)$/.exec(String(o.indicator_id)), add = [b.last].concat(g[2] && b.first !== b.last ? [b.first] : []);
      if (m) it.forEach(function (x) { var y = x.last; if (/_(p25|p75|median|mean)$/.test(y.indicator_id) && y.indicator_id.replace(/_(median|mean|p25|p75)$/, '') === m[1] && y.source_geo_id === o.source_geo_id && JSON.stringify(y.dimensions || {}) === JSON.stringify(o.dimensions || {})) add.push(y); });
      add.forEach(function (y) { if (!on[y.record_id] || gi === 0) on[y.record_id] = gi === 0 ? 'summary' : 'expanded'; }); }); });
    var kOf = function (o) { return o.indicator_id + '|' + o.source_geo_id + '|' + JSON.stringify(o.dimensions); }, shownK = {};
    c.all.forEach(function (o) { if (on[o.record_id]) { var k = kOf(o); (shownK[k] = shownK[k] || {})[String(o.reference_period)] = 1; } });
    c.all.forEach(function (o) {
      var id = o.record_id, st = on[id], k = kOf(o);
      if (st) { T[st].push(id); return; }
      T.dropped[id] = MERGED[id] ? 'SAME_FOR_ALL_HOUSEHOLDS' : !cxTotal(o) ? 'BREAKDOWN_TOTAL_SHOWN' : o.value == null ? 'NOT_TYPED' : /^(adjustment|correction)s?$/i.test(o.label || '') ? 'NOT_APPLICABLE'
        : shownK[k] && shownK[k][String(o.reference_period)] ? 'DUPLICATE_CONCEPT' : shownK[k] ? 'STALE_FOR_THIS_USE' : 'UNEXPLAINED';
    });
    return T;
  }
  var sh0 = SHARDS[r.country] && SHARDS[r.country].extra && SHARDS[r.country].extra.ctx;
  // 2.11.4: the profile's key figures first; everything else folds into "More figures" (nice to know); a quartile set
  // (25th percentile, median, 75th percentile) is one row with its spread; every row explains itself on tap
  var pn = profFor();
  var rowHTML = function (g, b, quart) {
    var o = b.last, tr = g[2] && b.first !== b.last ? ' <span class="muted small">(' + esc(String(b.first.reference_period)) + ': ' + esc(cxVal(b.first)) + ')</span>' : '';
    // 2.13: a trend arrow wherever the same series has an earlier period (since ...), coloured by what the change means here
    if (b.first !== b.last && fin(b.first.value) && fin(o.value) && b.first.value !== 0 && !/_change|_growth|annual_change/.test(o.indicator_id)) {
      var ch = (o.value - b.first.value) / Math.abs(b.first.value) * 100, dir0 = cxDir(o.indicator_id, biz), dir0 = dir0 === 'pay' ? (biz ? -1 : 1) : dir0, good = dir0 ? (ch > 0) === (dir0 > 0) : null;
      if (Math.abs(ch) >= 0.5) tr += ' <span class="trend ' + (good == null ? '' : good ? 'up-good' : 'up-bad') + '" title="Change since ' + esc(String(b.first.reference_period)) + '">' + (ch > 0 ? '▲' : '▼') + ' ' + (ch > 0 ? '+' : '') + fmt(ch, 1) + '% since ' + esc(String(b.first.reference_period).slice(0, 4)) + '</span>';
    }
    var d = cxDim(o), tq = cxTone(o, sh0, biz), vd = cxVerdict(tq[0], pn);
    var srcT = [cxExplain(o, biz, pn), 'Source: ' + [String(o.reference_period), cxGeo(o, c.rel), cxNote(o), cxSrc(o)].filter(Boolean).join(' · ')].filter(Boolean).join(' '), what = [cxGeo(o, c.rel), cxNote(o)].filter(Boolean).join(' · ');
    var lab = cxLabel(o), val = cxVal(o), bar = '';
    if (quart) { lab = lab.replace(/\s*(median|mean|p25|p75)$/i, ''); val = 'median ' + cxVal(quart.mid); var numOf = function (x) { var m = /-?[\d][\d,.']*/.exec(cxVal(x)); return m ? m[0] : cxVal(x); }; tq = [tq[0], ['middle half: ' + numOf(quart.p25) + ' to ' + numOf(quart.p75), /half of all|compare with/.test(tq[1] || '') ? '' : tq[1]].filter(Boolean).join(' · ')];
      var lo = quart.p25.value, hi = quart.p75.value, m = quart.mid.value, span = hi * 1.25 || 1;
      bar = '<svg class="qbar" viewBox="0 0 120 12" aria-hidden="true"><rect x="0" y="5" width="120" height="2" rx="1" fill="var(--line-2)"/><rect x="' + (lo / span * 120).toFixed(1) + '" y="2" width="' + ((hi - lo) / span * 120).toFixed(1) + '" height="8" rx="3" fill="var(--blue)" opacity=".35"/><rect x="' + (m / span * 120 - 1).toFixed(1) + '" y="0" width="2.5" height="12" fill="var(--blue)"/></svg>'; }
    return '<tr class="' + tq[0] + '" data-src="' + esc(srcT) + '" title="' + esc(srcT) + '"><th scope="row">' + esc(lab) + (d ? '<small>' + esc(d) + '</small>' : '') + '</th><td><b>' + esc(val) + '</b>' + tr + bar + (vd || tq[1] ? '<em>' + esc([vd, tq[1]].filter(Boolean).join(' · ')) + '</em>' : '') + (what ? '<small class="cxwhat">' + esc(what) + '</small>' : '') + '</td></tr>';
  };
  var rowsOf = function (g) {
    var seen = {}, out = [];
    g[1].forEach(function (b) {
      var o = b.last, m = /^(.*)_(median|mean|p25|p75)$/.exec(String(o.indicator_id));
      if (!m) { out.push(rowHTML(g, b)); return; }
      var key = m[1] + '|' + o.source_geo_id + '|' + JSON.stringify(o.dimensions || {}) + '|' + o.reference_period; if (seen[key]) return; seen[key] = 1;
      var set = {}; it.forEach(function (x) { var y = x.last, mm = /^(.*)_(median|mean|p25|p75)$/.exec(String(y.indicator_id)); if (mm && mm[1] === m[1] && y.source_geo_id === o.source_geo_id && JSON.stringify(y.dimensions || {}) === JSON.stringify(o.dimensions || {}) && String(y.reference_period) === String(o.reference_period)) set[mm[2]] = y; });
      var mid = set.median || set.mean;
      out.push(mid && set.p25 && set.p75 ? rowHTML(g, { last: mid, first: mid }, { mid: mid, p25: set.p25, p75: set.p75 }) : rowHTML(g, b));
    });
    return out.join('');
  };
  var shown = groups.filter(function (g) { return g[1].length; });
  var tableOf = function (g) { return '<h4>' + esc(g[0]) + '</h4><table class="table facts cxt"><tbody>' + rowsOf(g) + '</tbody></table>'; };
  var key = shown.length && /^Key figures/.test(shown[0][0]) ? [shown[0]] : [], rest = shown.slice(key.length);
  // breakdowns that are essential for the profile stay open, whole, right after the key figures (relatives side by side)
  var PROMOTE = biz ? (/shop|cafe|practice/.test(S.profile) ? /^Shops, doctors|^Local industry structure: share of employee/ : /^Local industry structure: share of employee|^Employer labour cost/)
    : /family|parent|pensioner|car_free|healthcare|retiree/.test(S.profile) ? /^Shops, doctors and schools|^Rents/ : /^Rents|^Pay by occupation/;
  key = key.concat(rest.filter(function (g) { return PROMOTE.test(g[0]); })); rest = rest.filter(function (g) { return !PROMOTE.test(g[0]); });
  var restN = rest.reduce(function (a, g) { return a + g[1].length; }, 0);
  var body = key.map(tableOf).join('') + (rest.length ? (key.length ? '<details class="cxmore"><summary>More figures: nice to know (' + restN + ')</summary>' : '') + rest.map(function (g) {
    // national figures matter even less for a place: folded once more (2.11.2)
    var nat = /^The country at a glance|^Housing conditions in the country/.test(g[0]);
    return nat ? '<details class="cxnat"><summary>' + esc(g[0]) + ' (' + g[1].length + ')</summary>' + tableOf(g).replace('<h4>', '<h4 hidden>') + '</details>' : tableOf(g);
  }).join('') + (key.length ? '</details>' : '') : '');
  if (!body) return '';
  return '<section class="sec cxw"><h3>' + (biz ? 'Costs and key figures for this site' : 'Housing and work') + '</h3><p class="sub">Official figures for ' + esc(r.name) + ', its zone or metro area, and ' + esc(countryName(r.country)) + ', each with its period and area. Context only: they do not change the score.</p>' + cxKey() + '' + body + '</section>';
}
/* how a context figure compares (2.11.2): its percentile among the same indicator, unit and breakdown in this country's
   data (at least 6 areas); green or red where the direction is clear for the mode (pay: good for households, a cost for
   companies), otherwise only the comparison */
/* direction of every context indicator (2.11.2, checked one by one against the 147 cross-country indicators): +1 higher
   is better, -1 lower is better, 'pay' good for households and a cost for companies, 0 neither (size, structure, rates) */
var CX_DIR = [[/^bready_.*(_gni|_days$|outages|generator)/, -1], [/^(bready_|wbl_|vdem_|cpi_|nd_gain_(index|readiness))/, 1], [/nd_gain_vulnerability/, -1],
  [/lpi_logistics|fixed_broadband|life_exp|tertiary|gni_per_capita|renewable|hospital_beds|female_labour|employment_rate|rooms_per_person|municipal_facility_count|establishment_births|docs|doctor/, 1],
  [/infant_mortality|homicide|road_deaths|pm25|unemploy|poverty|crime|overcrowd|arrears|inability|overburden|gini|medage_none/, -1],
  [/wage|labour_cost|hourly|earning|minimum_wage/, 'pay'],
  [/inflation|deflator|price_level|_price|tax|electricity_|^rent|_rent|rent_/, -1]];
function cxDir(id, biz) { id = String(id || ''); var pk = S.profile || '';
  // 2.12 profile-aware directions: the same figure helps one profile and hurts another
  if (/taxable_income/.test(id)) return /shop|cafe|practice|guesthouse|studio|wealth|bank/.test(pk) ? 1 : /low_income|budget|first_home|single_parent|student|rural_value/.test(pk) ? -1 : 0;   // spending power for a shop, an expensive area for a tight budget
  if (/unemploy/.test(id) && biz) return /contact|services|logistics|fulfilment|manufactur|food/.test(pk) ? 0 : -1;   // more people looking for work is not a defect for a labour-hungry site
  if (/kindergarten|childcare/.test(id)) return 1;
  for (var i = 0; i < CX_DIR.length; i++) if (CX_DIR[i][0].test(id)) { var d = CX_DIR[i][1]; return d === 'pay' ? (biz ? -1 : 1) : d; } return 0; }
function hiLo(p) { p = Math.max(1, Math.min(99, p)); return p >= 50 ? 'higher than ' + p + '%' : 'lower than ' + (100 - p) + '%'; }
var PK_DIST = { city: 1, air: 1, rail: 1, mway: 1, cap: 1, border: 1, coast: 1, lake: 1, river: 1, port: 1, metro: 1 };
function pkTxt(k, p) { p = Math.max(1, Math.min(99, p)); return PK_DIST[k] ? (p >= 50 ? 'further than ' + p + '%' : 'closer than ' + (100 - p) + '%') : k === 'setw' || k === 'sets' ? (p >= 50 ? 'later than ' + p + '%' : 'earlier than ' + (100 - p) + '%') : hiLo(p); }
function toneOf(p, dir) { if (!dir || !fin(p)) return ''; var g = dir > 0 ? p : 100 - p; return g >= 60 ? 'good' : g <= 40 ? 'bad' : 'mid'; }
var CX_IDX = {};
/* how a context figure compares: among this country's areas (6+), else with the national or EU figure; national
   figures among the countries that publish them (built by compact_ctx.py); returns [tone class, text] */
function cxTone(o, cx, biz) {
  if (o.source_geo_level === 'climate_station') return ['ref', 'Station normal, not a municipal measurement or ranking input'];
  if (!fin(o.value)) return ['ref', 'description, not a measure'];
  var dir = cxDir(o.indicator_id, biz), cn = countryName(String(o.country || '').toUpperCase()) || 'the country';
  if (o.source_geo_level === 'multicountry_aggregate') return ['ref', 'benchmark to compare against'];
  if (o.source_geo_level === 'country' || o.source_geo_level === 'country_scenario') {
    if (o.xc) return [(toneOf(o.xc[0], dir) + ' nat').trim(), hiLo(o.xc[0]) + ' of the ' + o.xc[1] + ' countries that publish it'];
    var eu = cx && cxPeer(o, cx, function (x) { return x.source_geo_id === 'EUROSTAT:EU27_2020'; });
    return eu ? [(cxVs(o, eu, dir)[0] + ' nat').trim(), cxVs(o, eu, dir)[1] + ' the EU average (' + cxVal(eu) + ')'] : ['nat', 'national figure; too few countries publish it to rank'];
  }
  if (!cx) return ['', ''];
  var key = o.indicator_id + '|' + o.unit + '|' + JSON.stringify(o.dimensions || {}), arr = CX_IDX[key];
  if (!arr) { arr = CX_IDX[key] = cx.records.filter(function (x) { return x.indicator_id === o.indicator_id && x.unit === o.unit && JSON.stringify(x.dimensions || {}) === JSON.stringify(o.dimensions || {}) && fin(x.value) && x.source_geo_level !== 'country' && x.source_geo_level !== 'multicountry_aggregate'; }).map(function (x) { return x.value; }).sort(function (a, b) { return a - b; }); }
  if (arr.length >= 6) { var below = arr.filter(function (v) { return v < o.value; }).length, p = Math.round(below / (arr.length - 1) * 100); return [toneOf(p, dir), hiLo(p) + ' of the ' + arr.length + ' areas with this figure'];
  }
  var nat = cxPeer(o, cx, function (x) { return x.source_geo_level === 'country'; }) || cxPeer(o, cx, function (x) { return x.source_geo_id === 'EUROSTAT:EU27_2020'; });
  if (nat) { var v = cxVs(o, nat, dir); return [v[0], v[1] + (nat.source_geo_level === 'country' ? ' the national figure' : ' the EU average') + ' (' + cxVal(nat) + ')']; }
  var base = String(o.indicator_id).replace(/_(median|mean|p25|p75)$/, ''), dj2 = JSON.stringify(o.dimensions || {}), q = {};
  cx.records.forEach(function (x) { if (x.source_geo_id === o.source_geo_id && JSON.stringify(x.dimensions || {}) === dj2 && String(x.reference_period) === String(o.reference_period) && String(x.indicator_id).replace(/_(median|mean|p25|p75)$/, '') === base) q[String(x.indicator_id).slice(base.length + 1)] = x; });
  if (q.p25 && q.p75 && x0(o) !== 'p25' && x0(o) !== 'p75') return ['', 'half of all cases lie between ' + cxVal(q.p25) + ' and ' + cxVal(q.p75) + ''];
  if (q.p25 && q.p75) return ['', x0(o) === 'p25' ? 'a quarter of cases lie below this' : 'a quarter of cases lie above this'];
  return ['', (o.source_geo_level === 'country' || o.source_geo_level === 'country_scenario' ? 'a national figure' : 'a local figure') + ' without a published comparison; shown for context'];
}
function x0(o) { var m = /_(median|mean|p25|p75)$/.exec(String(o.indicator_id)); return m ? m[1] : ''; }
/* "a young family", "an expat professional", "DINKS": the profile named the way a sentence needs it */
function profFor(k) { var n = profileName(k || S.profile); if (n === 'DINKS') return n; if (/^My guided/.test(n)) return 'your guided fit'; n = n.toLowerCase(); return (/^[aeiou]/.test(n) ? 'an ' : 'a ') + n; }
function cxKey() { var w = profFor(); return '<p class="cxkey"><i style="background:var(--good)"></i>helps ' + esc(w) + '<i style="background:var(--amber)"></i>in between<i style="background:var(--bad)"></i>holds it back<i style="background:var(--line-2)"></i>faded: does not count · tap a figure for what it is and where it comes from</p>'; }
function cxVerdict(t, pn) { t = String(t || ''); if (/\bdim\b|\bref\b/.test(t)) return ''; return /\bgood\b/.test(t) ? 'good for ' + pn : /\bbad\b/.test(t) ? 'a weak point for ' + pn : /\bmid\b/.test(t) ? 'average for ' + pn : ''; }
/* what a context figure is, and why it matters for the profile in focus (shown on tap) */
var CX_EXPLAIN = [
  [/purchase_price|house_price|apartment_price/, 'Average price actually paid for an existing home in a year (sales, not asking prices; per dwelling).', 'For a business: what staff pay to buy nearby.', 'For a household: what buying a home here costs.'],
  [/taxable_income/, 'Income after deductions on which tax is charged, per tax return.', 'For a business: the spending power of local customers and the pay level staff will expect.', 'For a household: how well-off the neighbourhood is, which also drives rents.'],
  [/rent_mean|rent_non_subsidised|^rent|_rent/, 'Average rent paid for homes of this kind in the area.', 'For a business: what employees will pay to live nearby.', 'For a household: the main monthly cost of living here.'],
  [/rent_change|rent_annual_change/, 'How fast rents for existing tenancies rose over the year.', 'For a business: how fast staff housing costs are rising.', 'For a household: how fast your rent may rise.'],
  [/hourly_labour_cost/, 'What an employer pays per hour worked, including social contributions, not just the wage.', 'For a business: the direct cost of each employee hour.', 'For a household: a sign of the local pay level.'],
  [/wage|earning|pay_/, 'Average pay for this job in the area.', 'For a business: what you will have to offer to hire.', 'For a household: what you can expect to earn.'],
  [/unemploy/, 'Share of the labour force without a job and looking for one.', 'For a business: how many people are available to hire.', 'For a household: how easy it is to find work.'],
  [/vacan/, 'Share of homes standing empty on the survey day.', 'For a business: how easily staff find housing.', 'For a household: how easy it is to find a home; very low means a tight market.'],
  [/municipal_facility_count/, 'Number of these facilities in the whole municipality, not within walking distance.', 'For a business: competitors or customers nearby.', 'For a household: everyday services in town.'],
  [/industry_mix|establishment/, 'How local jobs or firms split across industries.', 'For a business: which industries, suppliers and skills are already here.', 'For a household: which kinds of jobs are local.'],
  [/hotel_/, 'Number of hotels and rooms.', 'For a business: tourism demand and competition.', 'For a household: how touristy the place is.'],
  [/price_level|gfcf/, 'Price level of goods and investment compared with the EU average (100).', 'For a business: what building and equipping a site costs here.', 'For a household: how far money goes.'],
  [/household_size|rooms_per_person|overcrowd|underoccupation/, 'How much space households have at home, nationally.', '', 'For a household: how roomy homes typically are.'],
  [/broadband/, 'Fixed internet connections per 100 people, nationally.', 'For a business: how well connected customers and staff are.', 'For a household: how easy it is to get a good home connection.'],
  [/commercial_profits|corporate_income_tax/, 'The share of a typical firm\'s profit taken by taxes and contributions, nationally.', 'For a business: the tax bill on what you earn here.', ''],
  [/logistics_performance/, 'World Bank score (1 to 5) for customs, transport infrastructure and on-time delivery.', 'For a business: how smoothly goods move in and out of the country.', ''],
  [/gni|income_per_person/, 'Average income per person, adjusted for local prices.', 'For a business: how much customers can spend.', 'For a household: the country\'s general prosperity.'],
  [/inflation/, 'How fast consumer prices rose over the year.', 'For a business: how fast costs and wages drift up.', 'For a household: how fast living costs rise.'],
  [/gini/, 'How unevenly income is spread (0 = equal, 100 = one person has all).', 'For a business: how uniform local purchasing power is.', 'For a household: how wide the gap between rich and poor is.'],
  [/gas_price|electricity_price/, 'What industry pays per unit of energy, including network charges.', 'For a business: a direct operating cost for energy-intensive work.', ''],
  [/kindergarten/, 'Share of young children enrolled in kindergarten.', '', 'For a household: how normal and available childcare is here.'],
  [/arrears|overburden|inability_heat/, 'Share of households struggling with housing costs, nationally.', '', 'For a household: how stretched housing budgets are in the country.']
];
function cxExplain(o, biz, pn) {
  var id = String(o.indicator_id || ''); for (var i = 0; i < CX_EXPLAIN.length; i++) if (CX_EXPLAIN[i][0].test(id)) { var e = CX_EXPLAIN[i]; return e[1] + ' ' + ((biz ? e[2] : e[3]) || ''); }
  return '';
}
function cxPeer(o, cx, ok) {
  var dj = JSON.stringify(o.dimensions || {}), best = null;
  cx.records.forEach(function (x) { if (x !== o && x.indicator_id === o.indicator_id && x.unit === o.unit && JSON.stringify(x.dimensions || {}) === dj && fin(x.value) && ok(x) && (!best || String(x.reference_period) > String(best.reference_period))) best = x; });
  return best;
}
function cxVs(o, b, dir) {
  var pct = /^%|percent/i.test(String(o.unit || '')), d = pct ? o.value - b.value : (o.value / b.value - 1) * 100, a = Math.abs(d);
  var txt = a < (pct ? 0.5 : 2) ? 'about the same as' : (pct ? fmt(a, 1) + ' points ' : fmt(a, 0) + '% ') + (d > 0 ? 'above' : 'below');
  var g = a < (pct ? 0.5 : 2) ? 50 : d > 0 ? 75 : 25;
  return [toneOf(g, dir), txt];
}
function cxAllRows(r) {
  var c = cxRows(r); if (!c) return [];
  return c.items.map(function (b) { var o = b.last; return { rec: o, g: 'hpl', k: 'cx:' + o.record_id, label: cxLabel(o) + (cxDim(o) ? ' (' + cxDim(o) + ')' : ''), val: cxVal(o), src: [String(o.reference_period), cxGeo(o, c.rel), cxNote(o), cxSrc(o)].filter(Boolean).join(' · ') }; });
}
(function () { var st = document.createElement('style'); st.textContent = ".adt tr.adr.good>th,.cxt tr.good>th{box-shadow:inset 3px 0 var(--good);padding-left:9px}.adt tr.adr.bad>th,.cxt tr.bad>th{box-shadow:inset 3px 0 var(--bad);padding-left:9px}.adt tr.adr.mid>th,.cxt tr.mid>th{box-shadow:inset 3px 0 var(--amber);padding-left:9px}.adt td em,.cxt td em{display:block;font-style:normal;font-size:11.5px;line-height:1.35;color:var(--ink-3);margin-top:2px;text-align:right}.cxt td em{text-align:left}.adt tr.good td em,.cxt tr.good td em{color:var(--good)}.adt tr.bad td em,.cxt tr.bad td em{color:var(--bad)}.adt tr.mid td em,.cxt tr.mid td em{color:var(--mid)}.adt tr.dim,.cxt tr.dim{opacity:.62}.adt tr.dim+tr.adn,.cxt tr.dim+tr.adn{opacity:.62}.adt tr.nat th,.cxt tr.nat th{font-weight:400;color:var(--ink-2)}.cxkey{font-size:11.5px;color:var(--ink-3);margin:2px 0 8px}.cxkey i{display:inline-block;width:9px;height:9px;border-radius:2px;margin:0 4px 0 10px;vertical-align:0}.cxkey i:first-child{margin-left:0}@media (max-width:640px){.adt td em{text-align:left}}"; document.head.appendChild(st); })();
(function () { var st = document.createElement('style'); st.textContent = ".cxw .cxt th{font-weight:600;width:46%}.cxw .cxt th small,.cxw .cxt td small{display:block;color:var(--ink-3);font-weight:400;font-size:11px;margin-top:2px}.cxw h4{margin:12px 0 4px}.cxw details.cxmore{margin-top:16px;border-top:1px solid var(--line);padding-top:8px}.cxw details.cxmore>summary{cursor:pointer;font-weight:600;color:var(--ink-2);padding:6px 0}.cxw .qbar{display:block;width:120px;max-width:100%;height:12px;margin:4px 0 2px}@media (max-width:899px){#place .sec h3{font-size:1.25rem;font-weight:750;letter-spacing:-.01em;line-height:1.2;margin:26px 0 4px}#place .sec .sub{font-size:.8125rem;line-height:1.45;color:var(--ink-3);margin:0 0 12px}#place .sec h4{font-size:1rem;font-weight:700;line-height:1.3;margin:22px 0 4px;color:var(--ink)}.cxw .cxt,.cxw .cxt tbody{display:block}.cxw .cxt tr{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:14px;align-items:start;padding:11px 0;border-bottom:1px solid var(--line)}.cxw .cxt th,.cxw .cxt td{display:block;width:auto!important;padding:0!important;border:0!important;background:none}.cxw .cxt th{font-size:.9375rem;font-weight:600;line-height:1.3;color:var(--ink)}.cxw .cxt th small{font-size:.75rem;font-weight:400;line-height:1.35;color:var(--ink-3);margin-top:3px}.cxw .cxt td{text-align:right;max-width:48vw}.cxw .cxt td b{display:block;font-size:1.0625rem;font-weight:700;line-height:1.25;font-variant-numeric:tabular-nums}.cxw .cxt td small{font-size:.75rem;line-height:1.35;color:var(--ink-3);margin-top:3px}.cxw .cxt td .qbar{margin-left:auto}}"; document.head.appendChild(st); })();

/* the Facts tab tables come from the start bundle; the comparison and tone are added here, for every row (2.11.2) */
/* 2.12: the same distance can be good for one profile and bad for another. A hub airport 5 km away is an asset for a
   regional headquarters and a nuisance for a pensioner; steep terrain is a reason to move for a mountain lover and a
   burden for an older couple. Returns [tone, words] when the profile's needs or dislikes decide it, else null. */
var PK_NZ = { air: 'air', mway: 'mway', alt: 'steep', terrain: 'steep' };
function profTone(r, k) {
  var p = ENGINE.profiles[S.profile] || (META.config.profiles || {})[S.profile] || {}, w = ENGINE.weightsFor(r, S.profile) || {}, who = profFor(), cats = ENGINE.categoriesFor(r, S.profile) || {};
  if ((k === 'alt' || k === 'terrain') && w.outdoor > 0 && fin(cats.outdoor)) return cats.outdoor >= 60 ? ['good', 'mountains close: what ' + who + ' looks for'] : cats.outdoor <= 30 ? ['bad', 'flat surroundings: little for ' + who] : null;
  if (k === 'border' && w.border > 0 && fin(cats.border)) return cats.border >= 60 ? ['good', 'a short way to the border'] : cats.border <= 30 ? ['bad', 'far from the border'] : null;
  var nk = PK_NZ[k]; if (!nk || !(p.avoid || []).length || p.avoid.indexOf(nk) < 0) return null;
  var nz = ENGINE.nuisances(r, [nk]), hit = nz && nz.hits[0];
  if (hit && hit.pen >= 30) return ['bad', (nk === 'steep' ? 'steep terrain' : 'close by (distance only, not a noise measurement)') + ': a drawback for ' + who];
  if (nz && !hit) return ['good', (nk === 'steep' ? 'gentle terrain' : 'far enough to be quiet') + ': good for ' + who];
  return null;
}
function factsDecorate() {
  var r = S.selected && BYID[S.selected]; if (!r) return;
  var w = ENGINE.weightsFor(r, S.profile) || {}, pn = profFor(), what = demonym(r.country) + ' ' + unitWord(r.country);
  $$('#place tr[data-pk]:not([data-cxd])').forEach(function (tr) {
    tr.dataset.cxd = '1'; var k = tr.dataset.pk, pc = pctOf(r, k), f = AD_DUP[k] && ENGINE.factorById[AD_DUP[k]], td = tr.querySelector('td.num');
    if (!td) return;
    var dir = f ? (f.direction === 'lower' ? -1 : 1) : 0, rel = f && !f.not_scored && w[f.category] > 0, fsc = f && (r.factorScores || {})[f.id];
    var t = pc == null ? '' : ((f && fin(fsc) ? (fsc >= 60 ? 'good' : fsc <= 40 ? 'bad' : 'mid') : toneOf(pc, dir)) + (f && !rel ? ' dim' : '')).trim();
    var pt = profTone(r, k); if (pt) t = pt[0];   // what this profile avoids or seeks overrides the generic direction (2.12)
    if (t) tr.className += ' ' + t;
    td.insertAdjacentHTML('beforeend', '<em>' + esc((pt ? pt[1] + ' · ' : '') + (pc == null ? (k === 'city' ? 'a city of 100,000+ itself' : 'not enough places to compare') : pkTxt(k, pc) + ' of ' + what + (f && !rel && !pt ? '; not weighted for ' + pn : ''))) + '</em>');
  });
  var SN = { Residents: 'pop', Terrain: 'alt', Lake: 'lake', Sea: 'coast', River: 'river', 'Big city': 'city', Railway: 'rail', 'Winter sunset': 'setw', 'Hub airport': 'air', Border: 'border' };
  $$('#place .snack:not([data-cxd])').forEach(function (el) {
    el.dataset.cxd = '1'; var kk = el.querySelector('.sk'), k = kk && SN[kk.textContent.trim()];
    if (!k) { if (kk && kk.textContent.trim() === 'Climate') el.insertAdjacentHTML('beforeend', '<em>climate type, see Facts</em>'); return; }
    var pc = pctOf(r, k), f = AD_DUP[k] && ENGINE.factorById[AD_DUP[k]], fsc = f && (r.factorScores || {})[f.id], rel = f && !f.not_scored && w[f.category] > 0;
    if (k === 'city' && pval(r, 'city') < 1) { el.insertAdjacentHTML('beforeend', '<em>a city of 100,000+ itself</em>'); return; }
    if (pc == null) return;
    var pt = profTone(r, k);
    if (pt) el.className = el.className.replace(/\b(good|bad|mid|dim)\b/g, '') + ' ' + pt[0];
    else if (!/\b(good|bad|mid)\b/.test(el.className) && f && fin(fsc) && rel) el.className += ' ' + (fsc >= 60 ? 'good' : fsc <= 40 ? 'bad' : 'mid');
    el.insertAdjacentHTML('beforeend', '<em>' + esc((pt ? pt[1] + ' · ' : '') + pkTxt(k, pc) + ' of ' + what) + '</em>');
  });
  var rows = $$('#place tr[data-rk]:not([data-cxd])'); if (!rows.length) return;
  rows.forEach(function (tr) { tr.dataset.cxd = '1'; });
  regionStatsFor(r).then(function (list) {
    (list || []).forEach(function (p) {
      var tr = $('#place tr[data-rk="' + p.d.k + '"]'), td = tr && tr.querySelector('td'); if (!td) return;
      var put = function (c) { if (c[0]) tr.className += ' ' + c[0]; td.insertAdjacentHTML('beforeend', '<em>' + esc(c[1]) + '</em>'); };
      if (p.d.k === 'gdp') { var d0 = p.v - 100; put([toneOf(d0 > 5 ? 75 : d0 < -5 ? 25 : 50, 1), Math.abs(d0) < 2 ? 'about the EU average' : Math.round(Math.abs(d0)) + '% ' + (d0 > 0 ? 'above' : 'below') + ' the EU average']); return; }
      if (p.d.lvl === 0 || p.d.ratio) { put(['nat', 'national figure']); return; }
      esGet(p.d.ds, r.country).then(function (j) { return jsPick(j, p.d.prefs); }).then(function (nat) {
        if (!nat || !fin(nat.v)) { put(['', 'regional figure; the national figure did not load']); return; }
        var dir = p.d.k === 'income' || p.d.k === 'tert' || p.d.k === 'life' || p.d.k === 'docs' ? 1 : /unemp|poverty|crime/.test(p.d.k) ? -1 : 0;
        var v = cxVs({ value: p.v, unit: /%$/.test(p.d.fmt(1)) ? '%' : '' }, { value: nat.v }, dir); put([v[0], v[1] + ' the ' + countryName(r.country) + ' figure (' + p.d.fmt(nat.v) + ')']);
      }).catch(function () { put(['', 'regional figure; the national figure did not load']); });
    });
  });
}
(function () { var pl = document.getElementById('place'); if (!pl || !window.MutationObserver) return; var q = 0; new MutationObserver(function () { if (q) return; q = 1; requestAnimationFrame(function () { q = 0; try { factsDecorate(); } catch (e) {} }); }).observe(pl, { childList: true, subtree: true }); setTimeout(factsDecorate, 0); })();
(function () { var st = document.createElement('style'); st.textContent = "table.facts tr[data-cxd] td.num em,table.facts tr[data-rk] td em{display:block;font-style:normal;font-size:11.5px;font-weight:400;color:var(--ink-3)}table.facts tr.good td em{color:var(--good)}table.facts tr.bad td em{color:var(--bad)}table.facts tr.mid td em{color:var(--mid)}table.facts tr.good>th{box-shadow:inset 3px 0 var(--good);padding-left:9px}table.facts tr.bad>th{box-shadow:inset 3px 0 var(--bad);padding-left:9px}table.facts tr.mid>th{box-shadow:inset 3px 0 var(--amber);padding-left:9px}table.facts tr.dim{opacity:.62}.snack em{display:block;font-style:normal;font-size:10.5px;line-height:1.25;color:var(--ink-3);margin-top:2px}.snack.good em{color:var(--good)}.table td.num b[class^=tone-]{padding:1px 6px;border-radius:6px}.table td.num,.table td.num b,.table th.num{white-space:nowrap}.table td.num em,.table td.num small{white-space:normal;overflow-wrap:anywhere}.brk td .chip,.brk td button.chip{white-space:normal;text-align:left;max-width:100%;height:auto;line-height:1.3;padding-block:4px}@media (max-width:640px){.brk thead{display:none}.brk,.brk tbody{display:block;width:100%}.brk tr{display:grid;grid-template-columns:auto auto 1fr;gap:4px 14px;align-items:baseline;padding:9px 0;border-bottom:1px solid var(--line)}.brk td{display:block;border:0!important;padding:0!important;text-align:left!important}.brk td:first-child{grid-column:1/-1}.brk td:nth-child(n+2)::before{display:inline;margin-right:4px;font-size:11px;color:var(--ink-3);font-weight:400}.brk td:nth-child(2)::before{content:'score'}.brk td:nth-child(3)::before{content:'rank'}.brkc td:nth-child(4)::before{content:'weight'}.brkf td:nth-child(4)::before{content:'value'}.brkf td:nth-child(4){white-space:normal}}.snack.bad em{color:var(--bad)}"; document.head.appendChild(st); })();
/* Global and continental rankings (build/build_global_rank.js): comparable measures only, re-scored across the scope. */
/* search: a labelled spelling suggestion when nothing matches (2.11); it is never applied without a click */
function didYouMean(q, h, list) {
  var lev = function (a, b) { if (Math.abs(a.length - b.length) > 2) return 9; var p = [], i, j; for (j = 0; j <= b.length; j++) p[j] = j; for (i = 1; i <= a.length; i++) { var c = [i]; for (j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[b.length]; };
  var best = [];
  list.forEach(function (s) { if (s.pop < 5000) return; var w = s.f.split(/[\s\/,(]+/)[0], d = lev(q, w); if (d <= (q.length >= 5 ? 2 : 1)) best.push([d, -s.pop, s]); });
  best.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  if (!best.length) return;
  h.insertAdjacentHTML('afterend', best.slice(0, 3).map(function (b) { var s = b[2]; return '<li><button type="button" data-pid="' + esc(s.cc + ':' + s.oid) + '"><span>Did you mean ' + flagImg(s.cc) + ' <b>' + esc(s.name) + '</b>?</span><span class="muted small">' + esc(countryName(s.cc)) + ', ' + fmtInt(s.pop) + '</span></button></li>'; }).join(''));
}
/* category chip or label clicked (2.11): in a result row, open the place with that category expanded; elsewhere, the
   measures in a dialog for the selected place */
function catClick(b) {
  var dk = b.dataset.def, row = b.closest('.row[data-id]');
  if (row) {
    selectPlace(row.dataset.id, { from: 'list' });
    var tries = 0, open = function () { var c = document.querySelector('#place [data-catopen="' + dk + '"]'); if (c) { if (c.getAttribute('aria-expanded') !== 'true') c.click(); c.scrollIntoView({ block: 'center' }); } else if (++tries < 40) setTimeout(open, 150); };
    return setTimeout(open, 150);
  }
  var dr = BYID[S.selected], dt = META.config.terms[dk]; if (!dr) return;
  openModal(catLabel(dk) + ': ' + dr.name, (dt ? '<p class="small muted">' + esc(dt) + '</p>' : '') + '<div class="catdetail" data-catmodal>' + catDetailHTML(dr, dk) + '</div>');
}
var GRANK = null;
var GRANK_TEXT = 'A country ranking compares a place with the rest of its country, so its scores cannot be compared across borders. Across countries, each criterion combines the country\'s standing on comparable national figures (safety and health mostly national, access and lifestyle mostly local), measures that mean the same everywhere (distances, climate class, people nearby) and how high the place ranks in its own country. Only places that meet the profile\'s requirements in their country are ranked.';
function globalRankHTML(box) {
  var sc = S.gscope, key = S.profile;
  GRANK = GRANK || {};
  (GRANK[sc] = GRANK[sc] || fetch('/data/rank/' + sc + '.json?v=__VERSION__').then(function (r) { if (!r.ok) throw new Error('rank ' + r.status); return r.json(); })).then(function (G) {
    if (S.gscope !== sc || S.profile !== key) return;
    var pr = G.profiles[key], nm = { europe: 'Europe', americas: 'the Americas', asia_pacific: 'Asia-Pacific', mideast_africa: 'the Middle East and Africa', world: 'all ' + META.countries.length + ' countries' }[sc];
    if (!pr || !pr.top.length) { box.innerHTML = '<div class="empty"><h3>' + esc(profileName(key)) + ' is ranked country by country</h3><p>Its criteria rely on figures that each country defines in its own way, so a fair ranking across ' + esc(nm) + ' is not possible yet. Pick a country to see its ranking.</p></div>'; return; }
    var biz = isBizKey(key), floor = biz ? '' : ' of 10,000+ residents';
    box.innerHTML = '<p class="small muted" style="padding:8px 16px 0">Top ' + pr.top.length + ' of ' + fmtInt(pr.ranked) + ' ' + (biz ? 'sites' : 'towns and cities' + floor) + ' in ' + esc(nm) + ' for ' + esc(profileName(key)) + ', one per metro area. Each score combines how the country stands on comparable national figures (World Bank, Transparency International, V-Dem' + (biz ? ', Logistics Performance Index' : '') + '), measures that mean the same everywhere (' + (biz ? 'distance to port, chemical park and airport, residents within 100 km, terrain' : 'climate, services nearby, sea') + ') and how high the place ranks in its own country. <button class="chip" type="button" data-def="grank">How this works</button></p><ol class="list grank">' +
      pr.top.map(function (t, i) {
        var cc = t[0].split(':')[0], top = Math.max(0.1, 100 - t[3]);
        return '<li class="row" data-nz-card="world" data-gopen="' + esc(t[0]) + '" tabindex="0"><span class="rk">' + (i + 1) + '</span><div><div class="nm nz-place-name">' + placeEmblemHTML({id:t[0],name:t[1],country:cc}) + flagImg(cc) + ' ' + esc(t[1]) + '</div><div class="meta">' + esc(countryName(cc)) + ' · top ' + (top < 1 ? '1' : Math.round(top)) + '% in the country' + (t[4] != null ? ' · national level ' + t[4] + '% of the score' : '') + (t[7] ? ' · stands for ' + t[7] + ' more ranked place' + (t[7] > 1 ? 's' : '') + ' within 25 km' : '') + '</div>' + cardMetaHTML({id:t[0],country:cc},{rank:i+1},{total:pr.ranked,scope:nm,profile:profileName(key),depthUnavailable:'Cross-country source mix; open place evidence',ignoreCurrent:true}) + '</div><div class="right">' + scoreBadge(t[2]) + '</div></li>';
      }).join('') + '</ol>';
    gscopePins(pr.top);
  }).catch(function () { if (GRANK) delete GRANK[sc]; box.innerHTML = '<div class="empty"><h3>The cross-country ranking did not load</h3><p>Check the connection and choose the scope again.</p></div>'; });
}

/* What is inside a category score (owner request 24 Oct): every measure behind the bar, its value, its score out of 100,
   its level and source. Category = average of the measures shown; stand-ins say what they are estimated from. */
function catDetailHTML(r, k) {
  var fs = r.factorScores || {}, fr = r.factorRaw || {}, lv = r.factorLevel || {}, x = r.x || {}, rows = [], c = ENGINE.categoriesFor(r, S.profile), v = c[k];
  var add = function (name, val, sc, lvl, src) { rows.push('<div class="cdr" role="row"><div class="cdn" role="cell">' + esc(name) + (src ? '<small>' + esc(src) + '</small>' : '') + '</div><div class="cdv" role="cell"><b>' + esc(val == null ? '' : val) + '</b><small>' + esc(lvl || '') + '</small></div><div class="cds" role="cell">' + (fin(sc) ? scoreBadge(sc) : '') + '</div></div>'); };
  var byId = ENGINE.factorById, note = '';
  if (k === 'freight') {
    var lin = function (d, b, w) { return fin(d) ? Math.max(0, Math.min(100, 100 * (w - d) / (w - b))) : null; };
    if (fin(x.mway_km)) add('Motorway', trim0(fmt(x.mway_km, 1)) + ' km', lin(x.mway_km, 1, 40), 'this place', 'weight 50%');
    if (fin(x.rail_km)) add('Main railway line', trim0(fmt(x.rail_km, 1)) + ' km', lin(x.rail_km, 1, 25), 'this place', 'weight 30%');
    var sp = fin(x.mport_km) ? x.mport_km : x.port_km, spn = fin(x.mport_km) ? x.mport : x.port;
    if (fin(sp) && sp <= 200) { add('Major seaport' + (spn ? ' (' + spn + ')' : ''), trim0(fmt(sp, 1)) + ' km', lin(sp, 5, 150), 'this place', 'weight 20%: the nearer of seaport and inland port counts'); portSizeRows(spn, add); }
    if (fin(x.iport_km) && x.iport_km <= 200) { add('Inland port' + (x.iport ? ' (' + x.iport + ')' : ''), trim0(fmt(x.iport_km, 1)) + ' km', lin(x.iport_km, 5, 150), 'this place', 'Rhine, Danube, Elbe and other key inland ports'); portSizeRows(x.iport, add); }
    note = 'Straight-line distances: motorways and railways from Natural Earth 1:10m, major sea and inland ports from Nestlyzer\'s port list (Method page); 100 at 1 km (port 5 km), 0 at 40 km (rail 25 km, port 150 km).';
  } else if (k === 'focus') {
    var p = (META.config.profiles[S.profile] || {}).focus || {};
    Object.keys(p).forEach(function (id) { var f = byId[id]; if (!f || !fin(fs[id])) return; add(f.name + (p[id] < 0 ? ' (lower counts as better here)' : ''), adFmtRaw(f, fr[id]), p[id] < 0 ? 100 - fs[id] : fs[id], kfLevel(r, lv[id]) || 'this place', 'weight ' + Math.abs(p[id])); });
    note = 'The site-fit criterion of this profile: the measures above, weighted as shown.';
  } else if (k === 'portaccess') {
    var pkm2 = fin(x.mport_km) ? (fin(x.iport_km) ? Math.min(x.mport_km, x.iport_km) : x.mport_km) : x.iport_km, pnm = fin(x.iport_km) && (!fin(x.mport_km) || x.iport_km < x.mport_km) ? x.iport : x.mport;
    if (fin(pkm2)) { add('Nearest major sea or inland port' + (pnm ? ' (' + pnm + ')' : ''), trim0(fmt(pkm2, 1)) + ' km', v, 'this place', 'straight line; 100 within 2 km, 0 from 40 km; Nestlyzer port list (Method page)'); portSizeRows(pnm, add); }
  } else if (k === 'chempark') {
    if (fin(x.chem_km)) add('Nearest chemical park with pipeline links' + (x.chem ? ' (' + x.chem + ')' : ''), trim0(fmt(x.chem_km, 1)) + ' km', v, 'this place', 'straight line; 100 within 3 km, 0 from 40 km; Nestlyzer list of 89 chemical parks and refinery complexes (Method page)');
    note = 'Where chemical and process industry already operates: shared pipelines, utilities, permits and suppliers.';
  } else if (k === 'domreach') {
    if (fin(x.dom150_pct)) add('Residents of ' + countryName(r.country) + ' within 150 km', 'percentile ' + x.dom150_pct, x.dom150_pct, 'this place', 'straight line; the home market a national distribution centre serves');
    note = 'Why national hubs sit in the middle of the home market (the Gäu between Zurich, Basel and Bern; Hesse in Germany).';
  } else if (k === 'reach300') {
    if (fin(x.reach300k)) add('Residents within 300 km (all countries)', fmtInt(x.reach300k * 1000), x.reach300_pct, 'this place', 'straight line, a one-day truck round trip; percentile within ' + countryName(r.country));
    note = 'Why central sites win for distribution: how many customers a warehouse here can serve within a day.';
  } else if (k === 'climate') {
    if (x.kg) add('Climate class (Köppen-Geiger)', x.kg, v, 'this place', 'mild and sunny scores high; plus winter daylight from the latitude');
    note = 'A climate class, not weather records: Mediterranean (Csa, Csb) scores highest, subarctic lowest.';
  } else if (k === 'unitown') {
    if (fin(x.uni_pct)) add('Universities within 10 km', 'percentile ' + x.uni_pct, x.uni_pct, 'this place', 'ROR registry, size and distance weighted');
    if (fin(x.pop10)) add('People within 10 km', fmtInt(x.pop10), null, 'this place', '');
    note = 'A university town: large universities relative to the town (Tübingen, Leuven, Lund), so students shape the place.';
  } else if (k === 'city') {
    if (fin(x.pop10)) add('People within 10 km', fmtInt(x.pop10), v, 'this place', 'log scale: 20,000 = 0, 1.5 million = 100');
    note = 'How big-city the surroundings are: transit, culture, nightlife, choice.';
  } else if (k === 'quiet') {
    // what this group dislikes nearby: each one with its distance and how much it costs (engine.nuisances)
    var pq = profileDef(S.profile) || {}, NQ = { mway: 'Motorway', air: 'Hub airport (flight paths)', chem: 'Chemical park', port: 'Major port', flood: 'Flood and heat exposure', crowd: 'Crowding within 10 km', steep: 'Height difference within 15 km', air_quality: 'Fine dust (PM2.5)' };
    var nzq = ENGINE.nuisances(r, pq.avoid || []), hq = {}; ((nzq && nzq.hits) || []).forEach(function (h) { hq[h.k] = h.pen; });
    (pq.avoid || []).forEach(function (kk) {
      var v = kk === 'mway' ? x.mway_km : kk === 'air' ? (r.factorRaw || {}).geo_hub_airport_km : kk === 'chem' ? x.chem_km : kk === 'port' ? x.mport_km : kk === 'flood' ? x.climrisk_s : kk === 'crowd' ? (r.factorRaw || {}).geo_density10_km2 : kk === 'steep' ? x.relief : (r.factorScores || {}).n_pm25;
      if (!fin(v)) return;
      var val = /mway|air$|chem|port/.test(kk) ? trim0(fmt(v, v < 10 ? 1 : 0)) + ' km' : kk === 'flood' ? fmtInt(v) + ' of 100 (100 = low exposure)' : kk === 'crowd' ? fmtInt(v) + ' per km²' : kk === 'steep' ? fmtInt(v) + ' m' : fmtInt(v) + ' of 100 (100 = cleanest)';
      add(NQ[kk] || kk, val, hq[kk] ? Math.max(0, 100 - hq[kk]) : 100, 'this place', hq[kk] ? 'costs ' + hq[kk] + ' points' : 'no effect at this distance');
    });
    note = 'What this kind of household dislikes nearby. Distances are straight lines from public map data, so they flag likely noise or risk, not a measured level.';
  } else if (k === 'climaterisk') {
    var cst = (r.factorRaw || {}).geo_coast_km;
    if (fin(x.alt)) add('Altitude', fmtInt(x.alt) + ' m', null, 'this place', fin(cst) ? 'sea ' + trim0(fmt(cst, 1)) + ' km away; under 10 m within 5 km of the sea counts as coastal-flood exposure' : '');
    if (fin(x.river_km)) add('Distance to a major river', trim0(fmt(x.river_km, 1)) + ' km', null, 'this place', 'within 1 km counts as river-flood exposure');
    if (x.kg) add('Climate class (Köppen-Geiger)', x.kg, null, 'this place', 'hot and arid classes count as heat exposure');
    note = 'An estimate from altitude, rivers and climate class, not an official hazard map: check local flood maps before buying.';
  } else if (k === 'services') {
    if (fin(x.pop10)) add('People within 10 km', fmtInt(x.pop10), v, 'this place', 'stand-in for shops, doctors, cafés and transport in reach; 3,000 = 0, 60,000+ = 100 (log scale)');
  } else if (k === 'reach') {
    if (fin(x.reach100k)) add('Residents within 100 km (all countries)', fmtInt(x.reach100k * 1000), x.reach_pct, 'this place', 'straight line; population of all places in the 54 countries (Eurostat GISCO, national censuses, GeoNames); percentile within ' + countryName(r.country));
    note = 'Network centrality: how many customers and workers a site here reaches, across borders.';
  } else if (k === 'flatland') {
    if (fin(x.relief)) add('Terrain relief around the place', fmt(x.relief, 0) + ' m', x.flat_pct, 'this place', 'height range within about 15 km; flatter = higher score; percentile within ' + countryName(r.country));
  } else if (k === 'cluster') {
    var cf = 'cluster_' + S.profile, cfm = byId[cf]; if (cfm && fin(fs[cf])) add(cfm.name, fmt(fr[cf], 2) + ' × national share', fs[cf], kfLevel(r, lv[cf]) || 'this place', 'location quotient; percentile within ' + countryName(r.country));
    note = 'Where similar companies already operate: the local share of this site type\'s industries compared with the national share.';
  } else if (k === 'commuter_access' || k === 'student_access') {
    var g = r.geo || {};
    add(k === 'student_access' ? 'Nearest university town' : 'Nearest job centre', (k === 'student_access' ? g.studentAnchor : g.commuterAnchor) || '', v, 'this place', '');
    var dk = k === 'student_access' ? 'student_anchor_km' : 'commuter_anchor_km'; if (fin(fr[dk])) add('Distance', fmt(fr[dk], 1) + ' km', null, 'this place', '');
  } else {
    (ENGINE.factorIdsByCat[k] || []).forEach(function (id) {
      var f = byId[id]; if (!f || !fin(fs[id])) return;
      var b = f.by_country && f.by_country[r.country];
      add(f.name, adFmtRaw(f, fr[id]), fs[id], kfLevel(r, lv[id]) || 'this place', [b ? b.period : f.source_period, b ? b.source_name : f.source_name].filter(Boolean).join(' · '));
    });
    if (r._proxy && r._proxy[k]) note = 'Part of this score is ' + r._proxy[k] + ', because no local measure of its own exists here.';
    if (!rows.length) {
      var est = { foundation: ['common_population_scale', 'common_density_balance'], environment: ['common_low_crowding'], demographics: ['common_population_growth_5y'], jobs: ['at_working_age_share', 'common_population_scale'], lifestyle: ['common_population_scale', 'geo_catchment_30km'], affordability: ['common_low_crowding', 'common_density_balance'], family: ['at_youth_share', 'common_population_growth_5y', 'common_low_crowding'], health: ['at_elderly_share_balance'] }[k] || [];
      est.forEach(function (id) { var f = byId[id]; if (f && fin(fs[id])) add(f.name, adFmtRaw(f, fr[id]), fs[id], kfLevel(r, lv[id]) || 'this place', 'used as an estimate'); });
    }
  }
  if (!rows.length) return '<p class="small">' + esc(catLabel(k)) + ' for ' + esc(r.name) + ' comes from the measures of its wider area; see All data for every figure.</p>';
  return '<h4>' + esc(catLabel(k)) + (fin(v) ? ': ' + Math.round(v) + ' of 100' : '') + '</h4><p class="small muted">' + (k === 'freight' || k === 'focus' ? 'Weighted average' : 'Average') + ' of the scores below. A score compares this place with the rest of ' + esc(countryName(r.country)) + ' (100 = best).' + (note ? ' ' + esc(note) : '') + '</p><div class="cdt" role="table" aria-label="Measures behind ' + esc(catLabel(k)) + '"><div class="cdr cdh" role="row"><div role="columnheader">Measure</div><div role="columnheader">Value and level</div><div role="columnheader">Score</div></div>' + rows.join('') + '</div>';
}
(function () { var st = document.createElement('style'); st.textContent = ".kf.good{border-left:3px solid var(--good)}.kf.bad{border-left:3px solid var(--bad)}.kf.mid{border-left:3px solid var(--amber)}.kf.dim{opacity:.55}.kf em{display:block;font-style:normal;font-size:11.5px;color:var(--ink-2);margin-top:2px}.kf.good em{color:var(--good)}.kf.bad em{color:var(--bad)}.kfkey{font-size:11px;padding:0 6px;border-radius:8px;white-space:nowrap}.kfkey.good{background:var(--good-bg);color:var(--good)}.kfkey.bad{background:var(--bad-bg);color:var(--bad)}.kfkey.dim{background:var(--surface-2);color:var(--ink-3)}.cxt tr.good td b{color:var(--good)}.cxt tr.bad td b{color:var(--bad)}.cxt td em{display:block;font-style:normal;font-size:11px;color:var(--ink-3)}.cxnat{margin:10px 0;opacity:.85}.cxnat summary{cursor:pointer;font-weight:600;color:var(--ink-2)}@media (max-width:640px){.cxw .cxt,.cxw .cxt tbody,.cxw .cxt tr,.cxw .cxt th,.cxw .cxt td{display:block;width:auto!important;max-width:100%}.cxw .cxt tr{padding:6px 0;border-bottom:1px solid var(--line)}.cxw .cxt th{border:0;padding:0}.cxw .cxt td{border:0;padding:2px 0 0}.cxw .cxt th,.cxw .cxt td,.catdetail .cdn,.catdetail .cdv{word-break:normal;overflow-wrap:break-word;hyphens:auto;writing-mode:horizontal-tb}.catdetail .cdr{grid-template-columns:1fr auto!important}.catdetail .cdv{grid-column:1}.catdetail .cds{grid-row:1/span 2;grid-column:2}.kfgrid{grid-template-columns:1fr 1fr!important}}" + ".catdetail{grid-column:1/-1;margin-top:10px;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface)}.catdetail h4{margin:0 0 4px}.catdetail .cdr{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,9em) 3.2em;gap:10px;align-items:start;padding:7px 0;border-top:1px solid var(--line)}.catdetail .cdh{font-size:11px;color:var(--ink-3);border-top:0;padding-top:2px}.catdetail .cdr small{display:block;color:var(--ink-3);font-size:11px;font-weight:400;margin-top:2px}.catdetail .cds{justify-self:end}.catbars [data-catopen]{cursor:pointer;border-radius:8px}.catbars [data-catopen]:hover,.catbars [data-catopen][aria-expanded=true]{background:var(--surface-2)}.catbars [data-catopen]:focus-visible{outline:2px solid var(--navy);outline-offset:2px}"; document.head.appendChild(st); })();

/* rules only the lazy views use, moved out of the start page CSS (2.11.2, start budget) */
(function () { var st = document.createElement('style'); st.textContent = ".radar-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--ink-2)}.radar-legend i{display:inline-block;width:14px;height:3px;margin-right:5px;vertical-align:3px}.qgrid{display:grid;gap:14px}.wsl{display:grid;grid-template-columns:110px 1fr 34px;gap:8px;align-items:center;font-size:var(--step--1);margin:4px 0}.wsl input{width:100%;accent-color:var(--navy)}.recgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}.cmp-ph{position:relative;height:96px;border-radius:10px;overflow:hidden;background:#081626;margin-bottom:6px}.cmp-ph>img{z-index:1}.cmp-acts{display:flex;gap:6px;align-items:center;margin-top:6px}.verdicts{display:grid;gap:6px;margin-bottom:12px}.gq{font-size:var(--step-1);margin:0 0 10px}.ggrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.coach-hole{position:fixed;border-radius:14px;box-shadow:0 0 0 9999px rgba(8,16,28,.62);transition:all .25s ease;pointer-events:none;outline:2px solid var(--sun)}.coach-tip{position:fixed;width:min(340px,calc(100% - 20px));background:var(--surface);border-radius:16px;padding:14px 16px;box-shadow:0 20px 60px rgba(0,0,0,.35);animation:slideIn .2s ease}.coach-tip h3{font-size:var(--step-1);margin:2px 0 4px}.coach-tip p{margin:0 0 10px;color:var(--ink-2);font-size:14px}/* builder sticky apply */\n.bstick{display:none}@media (max-width:900px){.recgrid{grid-template-columns:1fr}}@media (max-width:900px){.bstick{display:flex;position:sticky;bottom:0;margin:12px -16px -16px;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:var(--surface);border-top:1px solid var(--line);gap:10px;align-items:center;justify-content:space-between;z-index:2}}@media (max-width:900px){.ggrid{grid-template-columns:1fr 1fr}}@media (max-width:380px){.recgrid{grid-template-columns:1fr}}.cmp-note{background:var(--mid-bg);color:var(--ink);border-radius:10px;padding:8px 10px;margin:0 0 10px}"; document.head.appendChild(st); })();

/* sources on demand (2.11.2): the source of a figure shows as a tooltip on hover and as a small popup on tap or click */
(function () {
  var st = document.createElement('style'); st.textContent = "[data-src]{cursor:help}#srcpop{position:fixed;z-index:9999;max-width:min(340px,calc(100vw - 24px));background:var(--surface);color:var(--ink-2);border:1px solid var(--line-2);border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.18);padding:8px 10px;font-size:12px;line-height:1.4}"; document.head.appendChild(st);
  document.addEventListener('click', function (e) {
    var old = document.getElementById('srcpop'), t = e.target.closest && e.target.closest('[data-src]');
    if (old) { old.remove(); if (old._for === t) return; }
    if (!t || e.target.closest('a,button,summary,[data-def],[data-catopen],input,select')) return;
    var d = document.createElement('div'); d.id = 'srcpop'; d.setAttribute('role', 'tooltip'); d.textContent = t.dataset.src; d._for = t; document.body.appendChild(d);
    var r = t.getBoundingClientRect(), h = d.offsetHeight, w = d.offsetWidth;
    d.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left)) + 'px';
    d.style.top = (r.bottom + h + 8 < window.innerHeight ? r.bottom + 6 : Math.max(8, r.top - h - 6)) + 'px';
  });
  window.addEventListener('scroll', function () { var o = document.getElementById('srcpop'); if (o) o.remove(); }, true);
})();

/* How it meets your needs (2.11.3): each need of the profile in focus, with a verdict, the evidence behind it and how it
   compares; a need without data says so instead of being left out */
var NZ_TXT = {
  mway: function (d) { return 'motorway ' + pfmt('mway', d) + ' away: expect traffic noise'; },
  air: function (d) { return 'hub airport ' + pfmt('air', d) + ' away: flight paths likely overhead'; },
  chem: function (d) { return 'chemical park ' + pfmt('city', d) + ' away'; },
  port: function (d) { return 'major port ' + pfmt('city', d) + ' away: heavy traffic and industry'; },
  flood: function () { return 'more exposed to flooding or heat than most places'; },
  crowd: function (d) { return 'densely built up: ' + fmtInt(d) + ' people per km² within 10 km'; },
  steep: function (d) { return 'steep terrain: ' + fmtInt(d) + ' m height difference within 15 km'; },
  air_quality: function () { return 'more fine dust in the air than most places'; }
};
// categories built from distances and counts rather than a table figure: the decisive number in words
var NEED_FB = {
  finhub: function (r) { var x = r.x || {}; return x.fin ? x.fin + ' within commuting distance' : ''; },
  insurhub: function (r) { var x = r.x || {}; return x.fin ? 'nearest financial centre: ' + x.fin : ''; },
  fundhub: function (r) { var x = r.x || {}; return x.fin ? 'nearest financial centre: ' + x.fin : ''; },
  commodhub: function (r) { var x = r.x || {}; return x.fin ? 'nearest financial centre: ' + x.fin : ''; },
  cryptohub: function (r) { var x = r.x || {}; return x.fin ? 'nearest financial centre: ' + x.fin : ''; },
  wealthhub: function (r) { var x = r.x || {}; return x.fin ? 'nearest financial centre: ' + x.fin : ''; },
  outdoor: function (r) { var x = r.x || {}; return [fin(x.relief) ? fmtInt(x.relief) + ' m of relief around' : '', fin(x.lake_km) && x.lake_km < 25 ? (x.lake || 'a lake') + ' ' + trim0(fmt(x.lake_km, 1)) + ' km away' : ''].filter(Boolean).join(', '); },
  border: function (r) { var x = r.x || {}; return fin(x.border_km) && x.border ? x.border + ' border ' + trim0(fmt(x.border_km, 1)) + ' km away' + (fin(x.xb_s) && x.xb_s > 0 ? ', where pay is higher' : '') : ''; },
  commuter_access: function (r) { var v = pval(r, 'city'); return v == null ? '' : v < 1 && r.popNow >= 100000 ? 'a city of 100,000+ itself' : 'nearest city of 100,000+: ' + pfmt('city', v); },
  freight: function (r) { var x = r.x || {}; return [fin(x.mway_km) ? 'motorway ' + pfmt('mway', x.mway_km) : '', fin(x.rail_km) ? 'main railway ' + pfmt('rail', x.rail_km) : ''].filter(Boolean).join(', '); },
  domreach: function (r) { var x = r.x || {}; return fin(x.reach300k) ? fmtInt(x.reach300k * 1000) + ' people within 300 km' : ''; },
  reach300: function (r) { var x = r.x || {}; return fin(x.reach300k) ? fmtInt(x.reach300k * 1000) + ' people within 300 km' : ''; },
  reach: function (r) { var x = r.x || {}; return fin(x.reach100k) ? fmtInt(x.reach100k * 1000) + ' people within 100 km' : ''; },
  flatland: function (r) { var x = r.x || {}; return fin(x.relief) ? fmtInt(x.relief) + ' m height difference within 15 km' : ''; },
  mobility: function (r) { var v = pval(r, 'air'); return v == null ? '' : 'hub airport ' + pfmt('air', v) + ((r.geo || {}).hubAirport ? ' (' + r.geo.hubAirport + ')' : ''); },
  services: function (r) { var v = pval(r, 'pop10'); return v == null ? '' : fmtInt(v) + ' people within 10 km: shops, doctors and transport follow them'; },
  city: function (r) { var v = pval(r, 'pop10'); return v == null ? '' : fmtInt(v) + ' people within 10 km'; },
  climate: function (r) { var c = climateOf(r); return c ? c.name + ' climate (' + c.code + ')' : ''; },
  coast: function (r) { var v = pval(r, 'coast'); return v == null ? '' : 'the sea ' + pfmt('coast', v) + ' away'; },
  portaccess: function (r) { var x = r.x || {}; return fin(x.mport_km) ? (x.mport ? x.mport + ' ' : 'major port ') + pfmt('city', x.mport_km) + ' away' : ''; },
  chempark: function (r) { var x = r.x || {}; return fin(x.chem_km) ? (x.chem || 'chemical park') + ' ' + pfmt('city', x.chem_km) + ' away' : ''; },
  climaterisk: function (r) { var x = r.x || {}; return fin(x.climrisk_s) ? (x.climrisk_s >= 70 ? 'low' : x.climrisk_s <= 40 ? 'high' : 'moderate') + ' exposure to floods and heat (estimate)' : ''; },
  unitown: function (r) { var x = r.x || {}; return fin(x.unitown_pct) ? 'more university life for its size than ' + Math.min(99, x.unitown_pct) + '% of ' + demonym(r.country) + ' places' : ''; },
  campus: function (r) { var x = r.x || {}; return fin(x.uni_pct) ? 'more universities within 10 km than ' + Math.min(99, x.uni_pct) + '% of ' + demonym(r.country) + ' places' : ''; }
};
function needEvidence(r, c, what) {
  // the strongest measured figure behind a category, with how it compares in the country
  var ids = (ENGINE.factorIdsByCat || {})[c] || [], fsc = r.factorScores || {}, fr = r.factorRaw || {}, best = null;
  // the place's own figures before regional ones, figures that describe the need before side measures, then the clearest signal
  var lv = r.factorLevel || {}, PREF = { family: /youth|child|birth|household_size|school|kids/, safety: /crime|offen|assault|burgl|robber|violen|homicide|safety/, affordability: /rent|price|woz|value|pressure|cost|burden/, health: /doctor|gp|hospital|life_exp|physic/, jobs: /job|employ|unemploy|income/ };
  ids.forEach(function (id) { var f = ENGINE.factorById[id]; if (!f || f.not_scored || !fin(fsc[id]) || !fin(fr[id])) return; var w = Math.abs(fsc[id] - 50) + (lv[id] ? 0 : 25) + (PREF[c] && PREF[c].test(id) ? 40 : 0); if (!best || w > best.w) best = { f: f, w: w, s: fsc[id] }; });
  if (!best) { var FB = NEED_FB[c]; return FB ? FB(r) : ''; }
  var pc = shPctOf(r, 'f:' + best.f.id, function (o) { return (o.factorRaw || {})[best.f.id]; });
  return best.f.name + ' ' + adFmtRaw(best.f, fr[best.f.id]) + (pc != null ? ', ' + hiLo(pc) + ' of ' + what : '');
}
/* 2.12 "Why it fits": the ten strongest reasons for and the three strongest against this place, for the profile in
   focus, from every scored figure (place, region and country) and every location measure. Importance = the weight of
   the figure's criterion for this profile, shared among its figures; strength = how far its score sits from the middle. */
var FIT_BAND = [[92, 'among the very best in '], [82, 'in the top fifth of '], [70, 'well above the average for '], [60, 'above the average for ']];
var FIT_WEAK = [[8, 'among the weakest in '], [20, 'in the bottom fifth of '], [32, 'well below the average for '], [40, 'below the average for ']];
var FIT_CAT = { freight: 1, reach: 1, reach300: 1, domreach: 1, portaccess: 1, flatland: 1, chempark: 1, climate: 1, city: 1, services: 1, climaterisk: 1, campus: 1, unitown: 1, quiet: 1, cluster: 1, coast: 1, commuter_access: 1, student_access: 1, outdoor: 1, border: 1, finhub: 1, insurhub: 1, fundhub: 1, commodhub: 1, cryptohub: 1, wealthhub: 1, focus: 1 };
function fitItems(r) {
  var w = ENGINE.weightsFor(r, S.profile) || {}, cats = (placeX(r).catScores) || ENGINE.categoriesFor(r, S.profile), fs = r.factorScores || {}, fr = r.factorRaw || {}, what = demonym(r.country) + ' ' + unitWord(r.country);
  var tot = 0; for (var k0 in w) tot += w[k0] || 0; if (!tot) return [];
  var out = [], byCat = ENGINE.factorIdsByCat || {}, needLab = {};
  ((profileDef(S.profile) || {}).needs || []).forEach(function (n) { (n[1] || []).forEach(function (c) { needLab[c] = needLab[c] || n[0]; }); });
  Object.keys(w).forEach(function (c) {
    if (!(w[c] > 0)) return;
    var ids = (byCat[c] || []).filter(function (id) { var f = ENGINE.factorById[id]; return f && !f.not_scored && fin(fs[id]) && fin(fr[id]); });
    if (ids.length && !FIT_CAT[c]) {
      ids.forEach(function (id) { var f = ENGINE.factorById[id], sc = fs[id], pc = shPctOf(r, 'f:' + id, function (o) { return (o.factorRaw || {})[id]; });
        out.push({ k: id, s: sc, imp: w[c] / tot / ids.length, lab: /city/.test(id) && /_km$/.test(id) && fr[id] < 1 ? 'A city of 100,000+ itself' : f.name, val: /city/.test(id) && /_km$/.test(id) && fr[id] < 1 ? '' : adFmtRaw(f, fr[id]), cmp: /city/.test(id) && /_km$/.test(id) && fr[id] < 1 ? 'big-city jobs, schools and services on the doorstep' : pc != null ? hiLo(pc) + ' of ' + what : '', why: needLab[c] || '', src: f.description || '' }); });
    } else if (fin(cats[c])) {
      var ev = c === 'quiet' ? '' : needEvidence(r, c, what);
      if (c === 'quiet') { var nz = ENGINE.nuisances(r, (profileDef(S.profile) || {}).avoid || []); ev = nz && nz.hits.length ? nz.hits.slice(0, 2).map(function (h) { return NZ_TXT[h.k] ? NZ_TXT[h.k](h.d) : h.k; }).join('; ') : 'no motorway, flight path or heavy industry close by'; }
      out.push({ k: 'cat:' + c, s: cats[c], imp: w[c] / tot, lab: needLab[c] || shortCat(c), val: '', cmp: ev, why: '', src: catLabel(c) });
    }
  });
  return fitMerge(out);
}
/* 2.13.3 (audit NZD-001): one line per need. Parts that share a label (for example "chemical park" and "port access",
   both "A chemical park or port nearby") are merged into one reason: the score is their weight-averaged score, the
   weight is their sum, so the line still reflects exactly what the score counts. Parts pulling in opposite directions
   become one trade-off line on the side the merged score falls, never the same reason on both sides. */
function fitMerge(out) {
  var g = {}, order = [];
  out.forEach(function (o) { var key = String(o.lab).toLowerCase().trim(); if (!g[key]) { g[key] = []; order.push(key); } g[key].push(o); });
  return order.map(function (key) {
    var ps = g[key]; if (ps.length === 1) return ps[0];
    var I = 0, T = 0; ps.forEach(function (o) { I += o.imp; T += o.imp * o.s; });
    var main = ps.slice().sort(function (a, b) { return b.imp - a.imp; })[0], hi = ps.filter(function (o) { return o.s >= 60; }), lo = ps.filter(function (o) { return o.s <= 40; });
    var nm = function (l) { return l.map(function (o) { return o.src || o.lab; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).join(', '); };
    var cmp = hi.length && lo.length ? 'A trade-off: strong on ' + nm(hi) + ', weak on ' + nm(lo) : (main.cmp || '');
    return { k: 'need:' + key, s: I ? T / I : main.s, imp: I, lab: main.lab, val: ps.length === ps.filter(function (o) { return o.val === main.val; }).length ? main.val : '', cmp: cmp, why: main.why, src: nm(ps), parts: ps.length, mixed: !!(hi.length && lo.length) };
  });
}
function fitPhrase(sc, cn, good) { var B = good ? FIT_BAND : FIT_WEAK; for (var i = 0; i < B.length; i++) if (good ? sc >= B[i][0] : sc <= B[i][0]) return B[i][1] + cn; return ''; }
/* 2.12 local economy: employees by GICS sector and industry, compared with the national mix (build_economy.py) */
var ECON_SEC = { EN: 'Energy', MA: 'Materials', IN: 'Industrials', CD: 'Consumer Discretionary', CS: 'Consumer Staples', HC: 'Health Care', FI: 'Financials', IT: 'Information Technology', CM: 'Communication Services', UT: 'Utilities', RE: 'Real Estate' };
var ECON_CH = { 'financial centre': 'A financial centre: banks, insurers and capital markets employ far more people here than across the country.', 'mining and energy': 'A mining and energy economy: extraction, oil and gas or their services stand out.', 'agriculture, forestry and fishing': 'A rural economy built on forestry, fishing and farm services (farms themselves are not in this count).', industrial: 'An industrial economy: manufacturing employs well over a fifth of the workforce.', technology: 'A technology economy: software, IT services and hardware stand out.', logistics: 'A logistics economy: trucking, warehousing and freight stand out.', tourism: 'A tourism economy: hotels, restaurants and leisure carry a large share of jobs.', 'health care': 'A health-care economy: hospitals and care employ a large share of people.', 'mixed services': 'A mixed service economy without one dominant industry.' };
function econHTML(r) {
  var x = r.x || {}, e = null; try { e = x.econ ? (typeof x.econ === 'string' ? JSON.parse(x.econ) : x.econ) : null; } catch (er) { e = null; }
  if (!e || !e.s || typeof ECON_T === 'undefined') return '';
  // decode the compact record (build_economy.py): sector shares in table order, industries and character by code
  if (Array.isArray(e.s)) { var so = {}; ECON_T.sec.forEach(function (k, j) { if (e.s[j] >= 1) so[k] = e.s[j]; }); e = { t: e.t, c: ECON_T.ch[e.c], s: so, i: (e.i || []).map(function (t) { return [ECON_T.ind[t[0]], t[1], t[2]]; }) };
    e.s = Object.keys(e.s).sort(function (a, b) { return e.s[b] - e.s[a]; }).reduce(function (o, k) { o[k] = so[k]; return o; }, {}); }
  var nat = {}, NT = (ECON_T.nat || {})[r.country] || []; ECON_T.sec.forEach(function (k, j) { if (NT[j] != null) nat[k] = NT[j]; });
  var cn = countryName(r.country);
  var bars = Object.keys(e.s).slice(0, 8).map(function (k) { var v = e.s[k], n = nat[k], q = n ? v / n : null, t = q == null ? '' : q >= 1.5 ? 'good' : q <= 0.6 ? 'bad' : '';
    return '<div class="ecr"><span>' + esc(ECON_SEC[k] || k) + '</span><i class="ecb"><b style="width:' + Math.min(100, v * 2.5).toFixed(1) + '%"></b>' + (n ? '<u style="left:' + Math.min(100, n * 2.5).toFixed(1) + '%" title="' + esc(cn) + ': ' + n + '%"></u>' : '') + '</i><em class="' + t + '">' + v + '%' + (q ? ' · ' + (q >= 1 ? q.toFixed(1) + '×' : (q * 100).toFixed(0) + '% of') + ' national' : '') + '</em></div>'; }).join('');
  var top = (e.i || []).map(function (t) { return '<li><b>' + esc(t[0]) + '</b> ' + t[1] + '% of jobs, ' + t[2] + '× the ' + esc(cn) + ' share</li>'; }).join('');
  var st = 'Employees by industry in the county (US Census Bureau, County Business Patterns 2023), mapped to GICS sectors and industries by Nestlyzer. Workplaces, not companies; farms and the public sector are not counted.';
  return '<section class="sec econ" data-src="' + esc(st) + '" title="' + esc(st) + '"><h3>Local economy</h3><p class="sub">' + esc(e.c === 'industrial' && e.i && e.i[0] ? 'An industrial economy, led by ' + e.i[0][0].toLowerCase() + ' (' + e.i[0][2] + '× the national share).' : ECON_CH[e.c] || '') + ' ' + fmtInt(e.t) + ' private-sector jobs in the county, by GICS sector; the tick marks the ' + esc(cn) + ' average.</p><div class="ecs">' + bars + '</div>' + (top ? '<h4>Industries that stand out</h4><ul class="eci">' + top + '</ul>' : '') + '</section>';
}
(function () { var st = document.createElement('style'); st.textContent = ".econ .ecs{display:grid;gap:5px}.econ .ecr{display:grid;grid-template-columns:minmax(110px,30%) 1fr auto;gap:8px;align-items:center;font-size:13px}.econ .ecb{position:relative;height:10px;border-radius:5px;background:var(--line);display:block}.econ .ecb b{position:absolute;left:0;top:0;bottom:0;border-radius:5px;background:var(--blue)}.econ .ecb u{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--ink-2)}.econ .ecr em{font-style:normal;font-size:12px;color:var(--ink-3);white-space:nowrap}.econ em.good{color:var(--good)}.econ em.bad{color:var(--bad)}.econ .eci{margin:4px 0 0;padding-left:18px;font-size:13.5px}@media (max-width:480px){.econ .ecr{grid-template-columns:1fr auto}.econ .ecb{grid-column:1/-1;order:3}}"; document.head.appendChild(st); })();
function fitHTML(r) {
  var it = fitItems(r); if (it.length < 3) return '';
  var cn = countryName(r.country), who = profFor();
  var pro = it.filter(function (o) { return o.s >= 60; }).sort(function (a, b) { return b.imp * (b.s - 50) - a.imp * (a.s - 50); }).slice(0, 10);
  var con = it.filter(function (o) { return o.s <= 40; }).sort(function (a, b) { return b.imp * (50 - b.s) - a.imp * (50 - a.s); }).slice(0, 3);
  var li = function (o, good) {
    var ph = o.cmp ? o.cmp : fitPhrase(o.s, cn, good), st = [o.src, o.why ? 'Counts for: ' + o.why : ''].filter(Boolean).join(' ');
    return '<li class="fi ' + (good ? 'good' : 'bad') + '" data-src="' + esc(st) + '" title="' + esc(st) + '"><span class="fs">' + Math.round(o.s) + '</span><div><b>' + esc(o.lab) + (o.val ? ' <i>' + esc(o.val) + '</i>' : '') + '</b><small>' + esc(ph) + '</small></div></li>';
  };
  return '<section class="sec fit"><h3>For and against</h3><p class="sub">What weighs most for ' + esc(who) + ', strongest first. Each number is a score out of 100 against the rest of ' + esc(cn) + '; tap a line to see what it measures.</p>' +
    (pro.length ? '<h4>For</h4><ol class="fil">' + pro.map(function (o) { return li(o, true); }).join('') + '</ol>' : '') +
    (con.length ? '<h4>Against</h4><ol class="fil">' + con.map(function (o) { return li(o, false); }).join('') + '</ol>' : '<p class="small">Nothing that weighs for ' + esc(who) + ' is clearly weak here.</p>') + '</section>';
}
(function () { var st = document.createElement('style'); st.textContent = ".fit .fil{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));column-gap:20px}.fit .fi{display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:start;padding:8px 0;border-bottom:1px solid var(--line)}.fit .fs{font:700 13.5px/28px var(--font-display);text-align:center;border-radius:7px;height:28px}.fit .good .fs{background:color-mix(in srgb,var(--good) 15%,transparent);color:var(--good)}.fit .bad .fs{background:color-mix(in srgb,var(--bad) 15%,transparent);color:var(--bad)}.fit .fi b{display:block;font-weight:600;font-size:14.5px;line-height:1.3}.fit .fi b i{font-style:normal;font-weight:400;color:var(--ink-2)}.fit .fi small{display:block;color:var(--ink-3);font-size:12.5px;line-height:1.35;margin-top:1px}.fit h4{margin:14px 0 6px}.ndmore>summary{cursor:pointer;list-style:none;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px}.ndmore>summary::-webkit-details-marker{display:none}.ndmore>summary h3{display:inline;margin:0}.ndmore>summary::after{content:'▸';color:var(--ink-3);margin-left:auto}.ndmore[open]>summary::after{content:'▾'}"; document.head.appendChild(st); })();
function needsHTML(r) {
  var p = profileDef(S.profile) || {}, needs = p.needs; if (!needs || !needs.length) return '';
  var cats = (placeX(r).catScores) || ENGINE.categoriesFor(r, S.profile), what = demonym(r.country) + ' ' + unitWord(r.country), cn = countryName(r.country);
  var rows = needs.map(function (n) {
    var lab = n[0], cs = n[1] || [], vals = cs.map(function (c) { return cats[c]; }).filter(fin);
    // a need without a measure here is left out of the page (owner rule: no gap wording on place pages); the report lists it
    if (!cs.length || !vals.length) return '';
    var v = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length, t = v >= 60 ? 'good' : v <= 40 ? 'bad' : 'mid';
    var ev = [];
    if (cs.indexOf('quiet') >= 0) { var nz = ENGINE.nuisances(r, p.avoid || []); if (nz) ev = nz.hits.slice(0, 3).map(function (h) { return NZ_TXT[h.k] ? NZ_TXT[h.k](h.d) : h.k; }); if (nz && !nz.hits.length) ev.push('none of these nearby: motorway, flight path, chemical park, flood risk'); }
    else cs.forEach(function (c) { var e = needEvidence(r, c, what); if (e) ev.push(e); });
    return '<li class="nd ' + t + '"><b>' + esc(lab) + '</b><span class="nv">' + (t === 'good' ? 'strong' : t === 'bad' ? 'weak' : 'average') + ' · ' + Math.round(v) + '/100</span>' + (ev.length ? '<small>' + esc(ev.slice(0, 2).join('; ')) + '</small>' : '') + '</li>';
  }).join('');
  // 2.12: the reasons for and against lead the page; the need-by-need check stays one tap away
  return '<section class="sec needs"><details class="ndmore"><summary><h3>Need by need</h3><span class="small muted">what ' + esc(profFor()) + ' looks for, and how ' + esc(r.name) + ' does</span></summary><p class="sub">Scores from 0 to 100 against the rest of ' + esc(cn) + ', with the figure that decides each need.</p><ul class="ndl">' + rows + '</ul></details></section>';
}
(function () { var st = document.createElement('style'); st.textContent = ".ndl{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:6px}.nd{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:8px 10px;border:1px solid var(--line);border-left:4px solid var(--line-2);border-radius:10px;background:var(--surface)}.nd b{font-weight:650}.nd .nv{font-size:12.5px;font-weight:650;white-space:nowrap}.nd small{grid-column:1/-1;color:var(--ink-3);font-size:12px;line-height:1.35}.nd.good{border-left-color:var(--good)}.nd.good .nv{color:var(--good)}.nd.bad{border-left-color:var(--bad)}.nd.bad .nv{color:var(--bad)}.nd.mid{border-left-color:var(--amber)}.nd.mid .nv{color:var(--mid)}.nd.none{border-style:dashed;border-left-style:solid}.nd.none .nv{color:var(--ink-3)}#place:has(.needs) .story .st-good,#place:has(.needs) .story .st-bad{display:none}"; document.head.appendChild(st); })();

/* Tools drawer contents (moved from the start bundle, 2.11.4) */
function toolsHTML() {
  var d = { innerHTML: '' };
  var tiles = [
    ['data-surprise', '🎲', 'Surprise me', 'A random place from the top quarter of the ranking.'],
    ['data-lt="records"', '🏆', 'Records', 'Highest, emptiest, fastest growing and more, for your scope.'],
    ['data-lt="saved"', '♥', 'Shortlist (' + saved.length + ')', 'Your saved places, with notes. Tick two or three to compare them side by side' + (S.compare.length ? ' (' + S.compare.length + ' ticked)' : '') + '.'],
    ['data-game', '🃏', 'Higher or lower', 'Guess which of two places has more of something. Real data.'],
    ['data-builder', '✨', 'Build my own profile', 'Answer a few questions and get your own weights.'],
    ['data-whatif', '🎛️', 'What if…', 'Change what matters and watch the ranking move.'],
    ['data-mydata', '💾', 'Your saved data', 'Download, restore or delete what this browser keeps.'],
    ['data-multi-area', 'Map', 'Several areas', 'Combine administrative areas and drawn shapes.'],
    ['data-evidence', 'Data', 'Profile evidence', 'Sources, missing inputs and observed outcomes.'],
    ['data-filters', '🎚️', 'Filters', 'Railway, lake, terrain, climate, border and more.'],
    ['data-layers', '🗺️', 'Map layers', 'Colour the map by terrain, lakes, rail, growth and more.'],
    ['data-tour', '🧭', 'Quick tour', 'Thirty seconds on how this works.'],
    ['data-export', '⬇️', 'Download CSV', 'Your saved places as a spreadsheet.'],
    ['data-href="/method/"', '📐', 'How scores work', 'Every weight, factor and source.'],
    ['data-catalogue', '🗂️', 'What data we have', 'Every dataset, its level, coverage, source and year, and what is still missing.'],
    ['data-theme-toggle', '🌓', 'Light or dark', 'Switch the colour theme.'],
    ['data-href="/legal/"', '§', 'Imprint and privacy', 'Who runs Nestlyzer, the privacy policy and the terms.'],
    ['data-extoggle', '🛡️', 'Live content: ' + (extOn() ? 'on' : 'off'), extOn() ? 'Photos, weather and local counts come from Wikimedia, NASA, OpenStreetMap and Eurostat. Switch them off for more privacy.' : 'Off: Nestlyzer contacts none of these services. Switch on to see photos, weather and local counts again.']
  ];
  if (window.NZConsent) tiles.splice(tiles.length - 1, 0, ['data-privacy', '🔒', 'Privacy settings', 'Change your choice about visit statistics and ads at any time.']);
  var standaloneApp = window.matchMedia && matchMedia('(display-mode: standalone)').matches;
  if (window.NZ_INSTALL) tiles.push(['data-install', '📲', 'Install the app', 'Add Nestlyzer to your home screen or desktop. Opens full-screen, no app store needed.']);
  else if (!standaloneApp && /iPhone|iPad|iPod/.test(navigator.userAgent)) tiles.push(['data-install-ios', '📲', 'Add to Home Screen', 'In Safari tap Share, then “Add to Home Screen”. Nestlyzer then opens like an app.']);
  d.innerHTML = '<div class="drawer-h"><h2>Tools</h2><button class="icon-btn" type="button" data-closetools aria-label="Close tools">' + ICON.close + '</button></div><div class="tgrid">' + tiles.map(function (t) { return '<button class="tool" type="button" ' + t[0] + '><span class="ti" aria-hidden="true">' + t[1] + '</span><b>' + esc(t[2]) + '</b><small>' + esc(t[3]) + '</small></button>'; }).join('') + '</div>' +
    (S.home && BYID[S.home] ? '<p class="small muted" style="padding:0 16px">🏠 Your home: ' + esc(BYID[S.home].name) + '. Every place shows how it differs.</p>' : '<p class="small muted" style="padding:0 16px">Tip: open the place you live now and tap 🏠. Every other place then shows how it differs from home.</p>');
  return d.innerHTML;
}

/* data-use trace for one place and profile (2.12.2): used by tests/data_use_trace.py on the real application */
window.NZ_CXTRACE = function (oid, profile) {
  var r = BYID[oid]; if (!r) return null; var keep = S.profile; S.profile = profile;
  try { return housingWorkHTML(r, true); } finally { S.profile = keep; }
};
window.NZ_CXENV = function () { return { SHARDS: SHARDS, ENGINE: ENGINE, KPIX: KPIX, BYID: BYID }; };

/* 2.13 business climate: the six things companies compare between countries (red tape, rule of law, business taxes,
   cost of capital, energy prices, growth momentum), the country's rank among the countries with a figure (crown and
   medals for the top three), the growth trend as an arrow and the mix this kind of site uses (★ = key driver) */
var BIZC = null;

/* 2.13: country history. Yearly national series since 2010 (World Bank WDI), with exact 3-, 5- and 10-year changes.
   Country context only: the same for every place in the country and never part of a score. One small file per country. */
var HISTC = {};
function histHTML(r) {
  var cc = r.country;
  if (!HISTC[cc]) HISTC[cc] = getJSON('/data/h/' + cc + '.json?v=__VERSION__').catch(function () { return null; });
  HISTC[cc].then(function (H) { var el = document.querySelector('#place [data-hist="' + cc + '"]'); if (el) el.innerHTML = histBody(H, cc); });
  return '<section class="sec hist" data-hist="' + esc(cc) + '"><h3>How ' + esc(countryName(cc)) + ' has changed</h3><p class="muted small">Loading the country history…</p></section>';
}
function histSpark(y) {
  var v = y.map(function (p) { return p[1]; }), lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), W = 96, H = 24, n = y.length;
  var pts = y.map(function (p, i) { return (n > 1 ? i / (n - 1) * W : 0).toFixed(1) + ',' + (hi > lo ? H - 2 - (p[1] - lo) / (hi - lo) * (H - 4) : H / 2).toFixed(1); }).join(' ');
  return '<svg class="hspark" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
}
function histBody(H, cc) {
  var head = '<h3>How ' + esc(countryName(cc)) + ' has changed</h3>';
  if (!H || !H.series || !H.series.length) return head + '<p class="small muted">' + esc((H && H.note) || 'No national history is available for this economy.') + '</p>';
  var groups = [];
  H.series.forEach(function (s) { var g = groups.filter(function (x) { return x[0] === s.group; })[0]; if (!g) groups.push(g = [s.group, []]); g[1].push(s); });
  var chg = function (s, k) {
    var c = s.change && s.change[k]; if (!fin(c)) return '<td class="num muted">–</td>';
    var good = s.better === 0 || Math.abs(c) < (s.kind === 'pct' ? 0.5 : 0.05) ? '' : (c > 0) === (s.better > 0) ? 'up-good' : 'up-bad';
    var u = s.kind === 'pct' ? '%' : '';
    return '<td class="num"><span class="trend ' + good + '">' + (c > 0 ? '▲ +' : c < 0 ? '▼ ' : '► ') + fmt(c, Math.abs(c) < 10 ? 1 : 0) + u + '</span></td>';
  };
  return head + '<p class="sub">National figures, the same for every place in ' + esc(countryName(cc)) + ' and not part of any score. Changes compare the latest year with exactly 3, 5 and 10 years earlier; changes in rates are in percentage points, changes in levels in %. Green means better for residents and firms, red worse, grey neither.</p>' +
    groups.map(function (g, gi) {
      return '<details class="adg"><summary><b>' + esc(g[0]) + '</b> <span class="muted small">' + g[1].length + ' series</span></summary><div class="tablewrap"><table class="table hist-t"><thead><tr><th>Measure</th><th>Latest</th><th>Since 2010</th><th class="num">3 yrs</th><th class="num">5 yrs</th><th class="num">10 yrs</th></tr></thead><tbody>' +
        g[1].map(function (s) { var l = s.y[s.y.length - 1]; return '<tr title="' + esc(s.code + ', ' + s.y[0][0] + '–' + l[0]) + '"><th scope="row">' + esc(s.label) + '<small>' + esc(s.unit) + '</small></th><td><b>' + fmt(l[1], Math.abs(l[1]) < 10 ? 2 : Math.abs(l[1]) < 1000 ? 1 : 0) + '</b> <span class="muted small">' + l[0] + '</span></td><td>' + histSpark(s.y) + '</td>' + chg(s, '3') + chg(s, '5') + chg(s, '10') + '</tr>'; }).join('') +
        '</tbody></table></div></details>';
    }).join('') + (H.stale && H.stale.length ? '<p class="small muted">Not shown because the last published year is too old: ' + H.stale.map(function (x) { return esc(x.label) + ' (' + x.last_year + ')'; }).join(', ') + '.</p>' : '') + '<p class="small muted">Source: ' + esc(H.source) + '. Latest year per series as published; a dash means one of the two years is not published.</p>';
}
(function () { var st = document.createElement('style'); st.textContent = ".hist{min-width:0;max-width:100%}.hist .tablewrap{overflow-x:auto;max-width:100%}.hist .hist-t{min-width:0;width:100%;table-layout:fixed}.hist .hist-t thead th:first-child{width:30%}.hist .hist-t th{overflow-wrap:anywhere}.hist .hist-t td b,.hist .hist-t .trend{white-space:nowrap}.hist .hist-t .trend{font-size:11.5px}.hist .hist-t .hspark{width:100%;max-width:96px;height:auto}@media (max-width:640px){.hist .hist-t td:nth-child(3),.hist .hist-t th:nth-child(3),.hist .hist-t td:nth-child(4),.hist .hist-t th:nth-child(4){display:none}.hist .hist-t td,.hist .hist-t th{padding:6px 4px}}.hist .hspark{color:var(--blue,#3b6fb6);vertical-align:middle}.hist .hist-t th small{display:block;font-weight:400;font-size:11px;color:var(--ink-3)}.hist .hist-t td{white-space:normal;font-size:12.5px}"; document.head.appendChild(st); })();
function bizClimLoad() { if (!BIZC) BIZC = getJSON('/data/bizclimate.json?v=__VERSION__').catch(function () { BIZC = null; return null; }); return BIZC; }
(function () { var st = document.createElement('style'); st.textContent = ".bizclim .cxt tr[class^=tone-]{background:none}.bizclim .cxt tr.tone-good>th{box-shadow:inset 3px 0 var(--good);padding-left:9px}.bizclim .cxt tr.tone-mid>th{box-shadow:inset 3px 0 var(--amber);padding-left:9px}.bizclim .cxt tr.tone-bad>th{box-shadow:inset 3px 0 var(--bad);padding-left:9px}.bizclim .cxt th{width:34%}.bizclim .cxt th small{display:block;font-weight:400;font-size:11px;color:var(--ink-3);margin-top:2px}.bizclim .bcover{font-size:15px;margin:8px 0 2px}.bizclim .cxt td em{text-align:left}"; document.head.appendChild(st); })();
function bizClimHTML(r) {
  var cc = r.country; bizClimLoad().then(function (B) { var el = document.querySelector('#place [data-bizclim="' + cc + '"]'); if (el && B) el.innerHTML = bizClimBody(B, cc, S.profile); });
  return '<section class="sec bizclim" data-bizclim="' + esc(cc) + '"><h3>Business climate in ' + esc(countryName(cc)) + '</h3><p class="muted small">Loading the country comparison…</p></section>';
}
function bizClimBody(B, cc, pk) {
  var C = B.countries[cc] || { cats: {}, ranks: {}, n: {}, values: {} }, mix = B.mix[pk] || B['default'], keys = B.keys.slice().sort(function (a, b) { return (mix[b] || 0) - (mix[a] || 0); });
  var top = Math.max.apply(null, keys.map(function (k) { return mix[k] || 0; }));
  var md = function (rk) { return rk >= 1 && rk <= 3 ? '<span class="medal m' + rk + '" title="' + ['Leader', 'Second', 'Third'][rk - 1] + ' among the countries">' + (rk === 1 ? '<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M3 18h18l-1.6-10-4.9 4L12 5l-2.5 7-4.9-4z\"/></svg>' : rk) + '</span>' : ''; };
  // overall: this site's mix over the drivers with a figure; the rank among the countries is computed here from the same data
  var score = function (c) { var n = 0, d = 0; keys.forEach(function (k) { var v = (B.countries[c] || {}).cats || {}; if (fin(v[k]) && mix[k]) { n += mix[k] * v[k]; d += mix[k]; } }); return d ? n / d : null; };
  var all = Object.keys(B.countries).map(function (c) { return [c, score(c)]; }).filter(function (x) { return fin(x[1]); }).sort(function (a, b) { return b[1] - a[1]; });
  var me = all.findIndex(function (x) { return x[0] === cc; }), ov = me >= 0 ? all[me][1] : null;
  var g = C.growth || [], last = g.length ? g[g.length - 1] : null, gv = C.values.growth_change;
  var arrow = fin(gv && gv[0]) ? (gv[0] > 0.3 ? '<span class="trend up-good">▲ growth faster than in 2015–2019 (' + (gv[0] > 0 ? '+' : '') + fmt(gv[0], 1) + ' pts)</span>' : gv[0] < -0.3 ? '<span class="trend up-bad">▼ growth slower than in 2015–2019 (' + fmt(gv[0], 1) + ' pts)</span>' : '<span class="trend">► growth as in 2015–2019</span>') : '';
  var rows = keys.map(function (k) {
    var v = C.cats[k], rk = C.ranks[k], n = C.n[k], star = mix[k] && mix[k] >= top * 0.75 ? ' ★' : '';
    var parts = (B.parts[k] || []).filter(function (p) { return C.values[p[0]]; }).map(function (p) { var m = B.measures[p[0]] || {}, x = C.values[p[0]]; return esc(m.label || p[0]) + ': ' + esc(fmt(x[0], Math.abs(x[0]) < 10 ? 1 : 0)) + (m.unit && !/^(rank|number|index)$|^0-/.test(m.unit) ? (m.unit === '%' || /^% /.test(m.unit) ? '' : ' ') + esc(m.unit) : '') + ' (' + esc(String(x[1]).slice(0, 4)) + ')'; }).join('; ');
    return '<tr class="' + (fin(v) ? tone(v) : 'dim') + '" title="' + esc(parts || 'no comparable figure for this country yet') + '"><th scope="row">' + esc(B.short[k]) + '<small>' + (mix[k] ? mix[k] + '% of the climate score' + star : 'not weighed for this site') + '</small></th><td>' + (fin(v) ? '<b>' + fmt(v) + '</b> of 100' : '<span class="muted">no comparable figure yet</span>') + (rk ? ' <span class="muted small">' + md(rk) + ' #' + rk + ' of ' + n + ' countries</span>' : '') + '<em>' + esc(parts) + '</em></td></tr>';
  }).join('');
  return '<h3>Business climate in ' + esc(countryName(cc)) + '</h3><p class="sub">What companies compare between countries, scored 0–100 across the ' + all.length + ' countries Nestlyzer covers. ★ marks the key drivers for ' + esc(profFor()) + '. In world and continental rankings it counts for a quarter of a site’s score; inside a country every place shares it.</p>' +
    (fin(ov) ? '<p class="bcover"><b>' + md(me + 1) + ' #' + (me + 1) + ' of ' + all.length + '</b> for ' + esc(profFor()) + ' · climate score <b>' + fmt(ov) + '</b> ' + arrow + '</p>' : '') +
    '<table class="table facts cxt"><tbody>' + rows + '</tbody></table><p class="small muted">Sources: World Bank B-READY 2025 and Doing Business, World Bank WDI (interest rates, growth, FDI), Transparency International, V-Dem, Eurostat business electricity prices, national tax rates. Municipal investment flows are not published as open data; the place’s own pull (people, firms nearby, access) is in its score. <a href="/insights/business-climate/">Compare all countries</a></p>';
}

/* 2.15: infrastructure and industry within 60 km (data/facilities.json: public lists, points of reference only) */
var FAC = null;
function facKm(a, b, c, d) { var R = 6371, x = (c - a) * Math.PI / 180, y = (d - b) * Math.PI / 180, h = Math.sin(x / 2) * Math.sin(x / 2) + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) * Math.sin(y / 2); return 2 * R * Math.asin(Math.sqrt(h)); }
function facilitiesHTML(r) {
  try { scoreContext(r); } catch (e) {}
  if (!document.getElementById('fac-css')) { var st = document.createElement('style'); st.id = 'fac-css'; st.textContent = '.fac{list-style:none;margin:0;padding:0;display:grid;gap:6px}.fac li{display:grid;grid-template-columns:30px 1fr auto;gap:10px;align-items:center;padding:8px 10px;border:1px solid var(--line,#e2e8f0);border-radius:10px;background:var(--card,#fff)}.fac .fi{font-size:18px;line-height:1;text-align:center}.fac b{display:block;font-weight:600}.fac small{color:var(--muted,#64748b)}.fac .km{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}.fac li.k-nuclear{border-left:3px solid #d97706}.fac li.k-chemical{border-left:3px solid #b91c1c}.fac li.k-seaport{border-left:3px solid #0369a1}.fac li.k-terminal{border-left:3px solid #4d7c0f}.fac li.k-learning{border-left:3px solid #7c3aed}.fac li.k-zone{border-left:3px solid #0f766e}'; document.head.appendChild(st); }
  if (!Number.isFinite(r.lat) || !Number.isFinite(r.lon)) return Promise.resolve('<p class="small muted">No usable location recorded for this place.</p>');
  FAC = FAC || getJSON('/data/facilities.json?v=__VERSION__').catch(function () { FAC = null; return null; });
  return FAC.then(function (d) {
    if (!d || !Array.isArray(d.items)) { FAC = null; return '<p class="small muted" role="status">Facility data could not be loaded. Reopen this place to retry. No conclusion about nearby facilities can be drawn.</p>'; }
    var IC = { nuclear: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M12 10V3a9 9 0 0 1 7.8 4.5L13.7 11M10.3 11 4.2 7.5A9 9 0 0 1 12 3M13.7 13l6.1 3.5A9 9 0 0 1 4.2 16.5L10.3 13"/></svg>', coal: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V11l5 3V11l5 3V5h4v16z"/><path d="M7 18h2M12 18h2"/></svg>', chemical: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/></svg>', seaport: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13a7 7 0 0 0 14 0M8 10h8"/></svg>', terminal: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 11h12M9 21l1.5-4M15 21l-1.5-4"/></svg>', learning: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/></svg>', zone: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.2"/></svg>' };
    var near = d.items.map(function (f) { return [facKm(r.lat, r.lon, f.lat, f.lon), f]; }).filter(function (x) { return x[0] <= 60; }).sort(function (a, b) { return a[0] - b[0]; }).slice(0, 12);
    if (!near.length) return '<p class="small muted">No matching reference points were returned within 60 km from this partial inventory. Coverage is incomplete; this is not evidence that no facilities exist. Nuclear power stations are covered worldwide, coal power stations from 500 MW.</p>';
    return '<ul class="fac">' + near.map(function (x) { var f = x[1]; return '<li class="k-' + f.kind + '"><span class="fi" aria-hidden="true">' + (IC[f.kind] || '•') + '</span><span><b>' + esc(f.name) + '</b><small>' + esc(f.label + (f.detail ? ', ' + f.detail : '')) + '. ' + (f.source ? '<a href="' + esc(f.source) + '" target="_blank" rel="noopener">' + esc(f.by) + '</a>' : esc(f.by)) + (f.period ? ' (' + esc(f.period) + ')' : '') + '</small></span><span class="km">' + fmt(x[0]) + ' km</span></li>'; }).join('') + '</ul><p class="small muted">' + esc(d.note || '') + ' Nuclear stations: so far the US operating list only; worldwide lists are being added.</p>';
  });
}
/* 2.15.3: clearer place pages. What decides the fit stays open; background sections fold into tap-to-open panels,
   and inside "Costs and key figures" only the profile's key figures stay open. Nothing is removed: every figure is
   one tap away. Runs on every place render (idempotent). */
(function () {
  if (window.NZ_TIDY) return; window.NZ_TIDY = 1;
  var LESS = /^(How .+ has changed|Decision facts|The wider region at a glance|Getting around|Population trend)/i;
  var st = document.createElement('style');
  st.textContent = '#place details.sec-fold{border:1px solid var(--line);border-radius:14px;margin:10px 0;background:var(--surface)}#place details.sec-fold>summary{list-style:none;cursor:pointer;padding:13px 16px;font-weight:650;font-size:1rem;display:flex;justify-content:space-between;align-items:center;gap:10px}#place details.sec-fold>summary::-webkit-details-marker{display:none}#place details.sec-fold>summary::after{content:"+";font-size:1.25rem;color:var(--ink-3);line-height:1}#place details.sec-fold[open]>summary::after{content:"–"}#place details.sec-fold>.sec{padding:0 16px 12px;margin:0;border:0}#place details.sec-fold>.sec>h3:first-child{display:none}#place details.g-fold{border-top:1px solid var(--line);margin:4px 0}#place details.g-fold>summary{cursor:pointer;padding:10px 0;font-weight:600;font-size:.9375rem;color:var(--ink-2)}#place .pt-n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}#place .pt-n b{color:var(--ink);font-weight:700}#place .sec-more-h{font-size:.8125rem;color:var(--ink-3);margin:26px 0 4px}' +
    '@media (max-width:899px){#place .cxt th{font-size:.9375rem;font-weight:600;line-height:1.3}#place .cxt th small{font-size:.75rem;font-weight:400;line-height:1.35}#place .cxt td{text-align:left!important;font-size:.8125rem;line-height:1.4}#place .cxt td b{font-size:1.0625rem}}';
  document.head.appendChild(st);
  var tidy = function () {
    var root = document.getElementById('place'); if (!root || window.innerWidth >= 900) return;   // phones only: the desktop panel has room for everything
    var secs = [].slice.call(root.querySelectorAll('section.sec')).filter(function (s) { return !s.closest('details.sec-fold') && !s.dataset.tidy; });
    secs.forEach(function (s) { s.dataset.tidy = 1; var h = s.querySelector('h3'); if (!h) return; var t = h.textContent.trim();
      if (LESS.test(t)) { var d = document.createElement('details'); d.className = 'sec-fold'; var sm = document.createElement('summary'); sm.textContent = t; d.appendChild(sm); s.parentNode.insertBefore(d, s); d.appendChild(s); }
      if (/^Costs and key figures/i.test(t)) { [].slice.call(s.querySelectorAll('h4')).forEach(function (h4, i) { if (i === 0 || h4.closest('details')) return; var tb = h4.nextElementSibling; if (!tb || tb.tagName !== 'TABLE') return; var d = document.createElement('details'); d.className = 'g-fold'; var sm = document.createElement('summary'); sm.textContent = h4.textContent + ' (' + tb.querySelectorAll('tr').length + ')'; d.appendChild(sm); h4.parentNode.insertBefore(d, h4); h4.remove(); d.appendChild(tb); }); }
    });
  };
  var pend = 0, mo = new MutationObserver(function () { if (pend) return; pend = 1; requestAnimationFrame(function () { pend = 0; mo.disconnect(); try { tidy(); } finally { var p = document.getElementById('place'); if (p) mo.observe(p, { childList: true, subtree: true }); } }); });
  var start = function () { var p = document.getElementById('place'); if (!p) return setTimeout(start, 500); tidy(); mo.observe(p, { childList: true, subtree: true }); };
  start();
})();

/* 2.15.3: a cross-country ranking also shows on the main map: every listed place in the scope, top 10 larger, map fitted to them */
function gscopePins(top) {
  var M = MAP; if (!M || !M.addSource) return;
  if (!M._nzGs) { M._nzGs = 1; var off = function () { setTimeout(function () { if (S.gscope || !M.getLayer('gscope-c')) return; M.setLayoutProperty('gscope-c', 'visibility', 'none'); if (M.getLayer('gscope-l')) M.setLayoutProperty('gscope-l', 'visibility', 'none'); if (M._nzMinZ) M.setMinZoom(M._nzMinZ); }, 0); }; document.addEventListener('click', off, true); window.addEventListener('hashchange', off); }
  var pts = top.filter(function (t) { return t[8] != null; }), fc = { type: 'FeatureCollection', features: pts.map(function (t, i) { return { type: 'Feature', properties: { id: t[0], rk: i + 1, name: t[1] }, geometry: { type: 'Point', coordinates: [t[9], t[8]] } }; }) };
  var go = function () {
    if (M.getSource('gscope')) M.getSource('gscope').setData(fc);
    else { M.addSource('gscope', { type: 'geojson', data: fc }); M.addLayer({ id: 'gscope-c', type: 'circle', source: 'gscope', paint: { 'circle-radius': ['case', ['<=', ['get', 'rk'], 10], 8, 5], 'circle-color': ['case', ['<=', ['get', 'rk'], 10], '#f5c542', '#ffffff'], 'circle-stroke-color': '#0b1f3a', 'circle-stroke-width': 1.5 } });
      M.on('click', 'gscope-c', function (e) { var f = e.features && e.features[0]; if (f) { var b = document.querySelector('[data-gopen="' + f.properties.id + '"]'); if (b) b.click(); } }); }
    M.setLayoutProperty('gscope-c', 'visibility', 'visible');
    // outlines of the other countries in the list, so the pins sit on a map (one small file per country; Europe is already drawn)
    var ccs = {}; pts.forEach(function (t) { var c = t[0].split(':')[0]; if (c !== S.cc) ccs[c] = 1; });
    Promise.all(Object.keys(ccs).map(function (c) { return getJSON('/data/geo/w/' + c + '.json?v=__VERSION__').catch(function () { return null; }); })).then(function (fs) {
      if (!S.gscope) return; var land = { type: 'FeatureCollection', features: [] }; fs.forEach(function (fc) { if (fc && fc.features) land.features = land.features.concat(fc.features); });
      if (M.getSource('gscope-land')) M.getSource('gscope-land').setData(land);
      else { M.addSource('gscope-land', { type: 'geojson', data: land }); M.addLayer({ id: 'gscope-l', type: 'fill', source: 'gscope-land', paint: { 'fill-color': '#9fb6c8', 'fill-opacity': 0.28, 'fill-outline-color': '#6b8aa3' } }, 'gscope-c'); }
      M.setLayoutProperty('gscope-l', 'visibility', 'visible');
    });
    if (pts.length) { var a = [180, 90, -180, -90]; pts.forEach(function (t) { a[0] = Math.min(a[0], t[9]); a[1] = Math.min(a[1], t[8]); a[2] = Math.max(a[2], t[9]); a[3] = Math.max(a[3], t[8]); }); var wide = window.innerWidth >= 900, pl = document.getElementById('place'), cr = M.getContainer().getBoundingClientRect(), prr = pl && pl.offsetWidth ? pl.getBoundingClientRect() : null, rp = prr && prr.left > cr.left && prr.left < cr.right ? cr.right - prr.left + 30 : 40, rl = document.querySelector('.rail'), rr = rl && rl.offsetWidth && wide ? rl.getBoundingClientRect() : null, lp = rr && rr.right > cr.left && rr.right < cr.right ? rr.right - cr.left + 30 : 40; if (lp + rp > cr.width - 160) { lp = 40; rp = 40; } if (!M._nzMinZ) M._nzMinZ = M.getMinZoom(); M.setMinZoom(0.5); setTimeout(function () { M.fitBounds([[a[0], a[1]], [a[2], a[3]]], { padding: { top: 60, bottom: wide ? 140 : 60, left: lp, right: rp }, duration: 700, maxZoom: 6 }); }, 350); }
  };
  if (M.isStyleLoaded && !M.isStyleLoaded()) M.once('idle', go); else go();
}

/* 2.15.7: incentives and residence routes that apply in the place's country (data/programmes.json), on the Around tab */
var PROG = null;

/* 2.15.11 City zones on the main map. Districts of dominant cities, coloured by their fit WITHIN the city for the active
   profile (percentile of the published district figures; partial evidence, see /districts/). Tap a district for details. */
var ZGEO = null, ZPAL = ['#1d3557', '#2a6f97', '#2a9d8f', '#8ab17d', '#e9c46a', '#f4a261'], ZPN = { young_family: 'young families', young_professional: 'young professionals', pensioner: 'retirees' };
var ZBOX = [[2.2, 48.8, 2.5, 48.92], [13.05, 52.32, 13.8, 52.7], [16.15, 48.1, 16.6, 48.34], [18.9, 47.33, 19.36, 47.64], [14.2, 49.93, 14.73, 50.19], [2.04, 41.31, 2.24, 41.48]];
function zoneViewportVisible(M) {
  if (!M || !M.getStyle() || M.getZoom() < 8) return false;
  var b = M.getBounds();
  return ZBOX.some(function (q) { return b.getWest() < q[2] && b.getEast() > q[0] && b.getSouth() < q[3] && b.getNorth() > q[1]; });
}
function zonesMap(M, prof) {
  var request = M._nzZoneRequest = (M._nzZoneRequest || 0) + 1;
  var p = ZPN[prof] ? prof : null, near = zoneViewportVisible(M);
  var current = function () { return M._nzZoneRequest === request && zoneViewportVisible(M); };
  if (!near) { if (M.getLayer('zones-fill')) { M.setLayoutProperty('zones-fill', 'visibility', 'none'); M.setLayoutProperty('zones-line', 'visibility', 'none'); } var lg0 = document.getElementById('zone-legend'); if (lg0) lg0.hidden = true; M._nzZones = false; return; }
  ZGEO = ZGEO || getJSON('/data/zones_geo.json?v=__VERSION__').then(function (fc) {
    if (!fc || fc.type !== 'FeatureCollection' || !Array.isArray(fc.features) || !fc.features.every(function (f) {
      return f && f.type === 'Feature' && f.properties && f.geometry &&
        ['Polygon', 'MultiPolygon'].indexOf(f.geometry.type) >= 0 && Array.isArray(f.geometry.coordinates);
    })) throw new Error('District geometry payload is invalid');
    return fc;
  }).catch(function () { ZGEO = null; return null; });
  return ZGEO.then(function (fc) {
    if (!current()) return;
    if (!fc) {
      var failed = document.getElementById('zone-legend');
      if (!failed) { failed = document.createElement('div'); failed.id = 'zone-legend'; failed.setAttribute('role', 'status'); M.getContainer().appendChild(failed); }
      failed.hidden = false;
      failed.textContent = 'District layer could not load. Move the map or reselect the profile to retry.';
      return;
    }
    var fill = p ? ['step', ['coalesce', ['get', 's_' + p], -1], 'rgba(0,0,0,0)', 0, ZPAL[0], 17, ZPAL[1], 34, ZPAL[2], 50, ZPAL[3], 67, ZPAL[4], 84, ZPAL[5]] : 'rgba(255,255,255,0.05)';
    if (!M.getSource('zones')) {
      M.addSource('zones', { type: 'geojson', data: fc });
      var before = M.getLayer('pts') ? 'pts' : undefined;
      M.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', minzoom: 8, paint: { 'fill-color': fill, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.55, 12, 0.75] } }, before);
      M.addLayer({ id: 'zones-line', type: 'line', source: 'zones', minzoom: 8, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 12, 2] } }, before);
      if (!M._nzZoneHandlersBound) {
      M._nzZoneHandlersBound = true;
      M.on('click', 'zones-fill', function (e) {
        var f = e.features && e.features[0]; if (!f || !window.maplibregl) return; var q = f.properties, pp = ZPN[S.profile] ? S.profile : null, sc = pp ? q['s_' + pp] : null, rk = pp ? q['r_' + pp] : null;
        var html = '<div class="zpop"><b>' + esc(q.n) + '</b><span>' + esc(q.cn) + ' · ' + q.km2 + ' km²</span>' + (pp && sc != null && sc !== 'null' ? '<p><strong>#' + rk + ' of ' + q.N + '</strong> districts of ' + esc(q.cn) + ' for ' + ZPN[pp] + ' <em>(partial comparison ' + sc + '/100, within the city)</em></p>' : '<p>District fit is computed for young families, young professionals and retirees.</p>') + '<p>Available source measures only. This does not establish that all profile requirements are met.</p>' + '<a href="/districts/?profile=' + encodeURIComponent(S.profile) + '#zone-' + esc(q.city) + '">All ' + q.N + ' districts of ' + esc(q.cn) + ' compared</a></div>';
        new maplibregl.Popup({ closeButton: true, maxWidth: '280px' }).setLngLat(e.lngLat).setHTML(html).addTo(M);
      });
      M.on('mouseenter', 'zones-fill', function () { M.getCanvas().style.cursor = 'pointer'; }); M.on('mouseleave', 'zones-fill', function () { M.getCanvas().style.cursor = ''; });
      }
      if (!document.getElementById('nz-zone-styles')) {
      var st = document.createElement('style'); st.id = 'nz-zone-styles'; st.textContent = '.zpop{display:grid;gap:3px;font:13px/1.4 system-ui}.zpop span{color:#64748b;font-size:12px}.zpop p{margin:4px 0}.zpop a{font-weight:650}#zone-legend{position:absolute;right:10px;top:64px;z-index:4;background:rgba(11,31,58,.88);color:#fff;border-radius:12px;padding:8px 10px;font:12px/1.3 system-ui;max-width:230px;pointer-events:none}#zone-legend i{display:inline-block;width:16px;height:8px;margin-right:2px;border-radius:2px}#zone-legend[hidden]{display:none}'; document.head.appendChild(st);
      }
    } else { M.setPaintProperty('zones-fill', 'fill-color', fill); M.setLayoutProperty('zones-fill', 'visibility', 'visible'); M.setLayoutProperty('zones-line', 'visibility', 'visible'); }
    M._nzZones = true;
    var host = M.getContainer(), lg = document.getElementById('zone-legend');
    if (!lg) { lg = document.createElement('div'); lg.id = 'zone-legend'; lg.setAttribute('role', 'note'); host.appendChild(lg); }
    lg.hidden = false; lg.innerHTML = p ? '<b>City districts</b><br>' + ZPAL.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '<br>Partial, within-city comparison for ' + ZPN[p] + '. Missing requirements remain unknown. Tap a district.' : '<b>City districts</b><br>Tap a district. District fit exists for families, young professionals and retirees.';
  });
}

/* 2.15.14 (evidence audit): one score context. The place panel scores the place within its country; a continental or
   world list uses a cross-country score, so the two numbers can differ. Say so next to the score instead of hiding it. */
var GSN = { europe: 'Europe', americas: 'Americas', asia_pacific: 'Asia-Pacific', mideast_africa: 'Middle East and Africa', world: 'World' };
function scoreContext(r) {
  if (typeof climateOf === 'function') climateOf({ x: { kg: 'Cfb' } });
  // the first place opened may render before the climate descriptions arrive: add the description in place
  var c = climateOf(r); if (c && !c.text) getJSON('/data/koppen.json?v=__VERSION__').then(function (d) { var t = d && d[c.code]; if (!t || S.selected !== r.id) return;
    [].some.call(document.querySelectorAll('#place p.small'), function (el) { if (el.textContent.indexOf('Climate type ' + c.code + ' (') === 0 && el.textContent.indexOf(t) < 0) { var n = el.firstChild; if (n && n.nodeType === 3) { n.textContent = n.textContent.replace(/\)\.\s*/, '): ' + t + '. '); } return true; } }); }, function () {});
  var box = document.querySelector('#place .scorebox'); if (!box || box.querySelector('.sc-ctx')) return;
  var p = document.createElement('p'); p.className = 'small muted sc-ctx'; p.style.cssText = 'flex-basis:100%;margin:6px 0 0';
  p.textContent = 'Score compared with places in ' + countryName(r.country) + '.' + (S.gscope ? ' The ' + (GSN[S.gscope] || 'cross-country') + ' list uses a cross-country score, so its number can differ.' : '');
  box.appendChild(p);
}

/* 2.15.15: the business types beyond the first eight, with their own icons (biz icons live in this module) */
function bizMoreHTML(g) {
  var top = META.config.bizTop || [];
  g.innerHTML = (META.config.bizGroups || []).map(function (gr) { var ks = gr[1].filter(function (k) { return ENGINE.profiles[k] && top.indexOf(k) < 0; }); return ks.length ? '<span class="who-lab">' + esc(gr[0]) + '</span>' + ks.map(function (k) { return '<button type="button" data-who="' + k + '" aria-pressed="' + (S.profile === k) + '">' + profileIcon(k, 17) + esc(ENGINE.profiles[k].name) + '</button>'; }).join('') : ''; }).join('');
}
function programmesHTML(r) {
  PROG = PROG || getJSON('/data/programmes.json?v=__VERSION__').catch(function () { PROG = null; return null; });
  return PROG.then(function (d) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) return '<p class="small muted" role="status">Programme information is temporarily unavailable. Reopen this tab to retry; this is not evidence that no programmes exist.</p>';
    var x = d[r.country] || { inc: [], imm: [], blue: false };
    if (!Array.isArray(x.inc) || !Array.isArray(x.imm)) { PROG = null; return '<p class="small muted" role="status">Programme information could not be read. Reopen this tab to retry.</p>'; }
    var biz = isBizKey(S.profile), nm = countryName(r.country), flag = '<img class="flag" src="/assets/flags/' + r.country.toLowerCase() + '.png" width="19" height="14" alt="">';
    var safeLink = function (v) { try { var u = new URL(String(v)); return (u.protocol === 'https:' || u.protocol === 'http:') && !u.username && !u.password ? u.href : null; } catch (_) { return null; } };
    var ST = { changed: 'Changed recently', closed: 'Closed', paused: 'Paused' }, cardf = function (o) {
      var rows = Array.isArray(o.conditions) ? o.conditions : [];
      var fields = [['qualifying_base', 'Qualifying base'], ['eligible_entities', 'Eligible entities'], ['conditions', 'Conditions'], ['exclusions', 'Exclusions'], ['duration', 'Duration'], ['effective_from', 'Effective from'], ['effective_to', 'Effective to'], ['reference_period', 'Source period'], ['temporal_status', 'Source status'], ['quality_flags', 'Source qualifications'], ['scope_detail', 'Geographic scope']];
      var detail = fields.map(function (p) { var values = []; rows.forEach(function (x) { var v = x && x[p[0]]; if (v != null && String(v).trim() && values.indexOf(String(v)) < 0) values.push(String(v)); }); return values.length ? '<dt>' + p[1] + '</dt><dd>' + values.map(esc).join('<br>') + '</dd>' : ''; }).join('');
      if (typeof o.c === 'string' && o.c.trim()) detail += '<dt>Conditions</dt><dd>' + esc(o.c) + '</dd>';
      var links = [], raw = [o.u].concat(Array.isArray(o.sources) ? o.sources : [], rows.map(function (x) { return x && x.source_url; }));
      raw.forEach(function (x) { var u = safeLink(x); if (u && links.indexOf(u) < 0) links.push(u); });
      var sources = links.length ? '<span class="pg-sources">' + links.map(function (u, i) { return '<a href="' + esc(u) + '" rel="noopener noreferrer">Official source' + (links.length > 1 ? ' ' + (i + 1) : '') + '</a>'; }).join(' &middot; ') + '</span>' : '<span class="small muted">Source link unavailable in this record.</span>';
      return '<li><b>' + esc(o.n) + (o.st && ST[o.st] ? ' <em class="pg-st">' + ST[o.st] + '</em>' : '') + '</b>' + (o.w ? ' <span class="small muted">' + esc(o.w) + '</span>' : '') + (Array.isArray(o.f) && o.f.length ? '<span class="pg-f">' + o.f.map(function (f) { return '<i>' + esc(f) + '</i>'; }).join('') + '</span>' : '') + '<small>' + esc(o.s) + '</small>' + (detail ? '<details class="pg-details"><summary>Conditions, dates and limitations</summary><dl>' + detail + '</dl></details>' : '') + sources + '</li>';
    };
    var inc = x.inc.length ? '<div class="pg"><h4>' + flag + ' Incentives and special zones in ' + esc(nm) + ' <a class="small" href="/incentives/">all</a></h4><ul>' + x.inc.slice(0, 8).map(cardf).join('') + '</ul></div>' : '';
    var imm = (x.imm.length || x.blue) ? '<div class="pg"><h4>' + flag + ' Residence routes into ' + esc(nm) + ' <a class="small" href="/immigration/#im-' + r.country + '">all</a></h4><ul>' + (x.blue ? '<li><b>EU Blue Card</b><small>Work and residence permit for highly qualified non-EU workers with a qualifying job offer.</small></li>' : '') + x.imm.slice(0, 8).map(cardf).join('') + '</ul></div>' : '';
    if (!document.getElementById('pg-css')) { var st = document.createElement('style'); st.id = 'pg-css'; st.textContent = '.pg-details dl{margin:8px 0;display:grid;gap:4px}.pg-details dt{font-weight:650}.pg-details dd{margin:0 0 6px;overflow-wrap:anywhere}.pg-sources{font-size:12px;overflow-wrap:anywhere}.pg-f i{max-width:100%;overflow-wrap:anywhere}.pg{margin:8px 0 16px}.pg h4{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:1rem}.pg h4 a{margin-left:auto}.pg ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}.pg li{border:1px solid var(--line);border-left:3px solid #F97316;border-radius:12px;padding:10px 12px;background:var(--surface);display:grid;gap:4px}.pg small{color:var(--ink-2);line-height:1.4}.pg-f{display:flex;flex-wrap:wrap;gap:5px}.pg-st{font-style:normal;font-size:11px;background:#be123c;color:#fff;border-radius:999px;padding:1px 7px;margin-left:6px}.pg-f i{font-style:normal;background:#0b1f3a;color:#fff;border-radius:999px;padding:2px 9px;font-size:12px;font-weight:700}'; document.head.appendChild(st); }
    var ZC = { FR: ['75056', 'paris', 20], DE: ['11000000', 'berlin', 12], AT: ['90001', 'vienna', 23], ES: ['08019', 'barcelona', 10], HU: ['13578', 'budapest', 23], CZ: ['554782', 'prague', 57] }, ZCH = {}, zc = ZC[r.country]; if (r.country === 'CH') { var m_ = String(r.id).match(/(\d+)$/); zc = m_ && ZCH[m_[1]] ? [m_[1]].concat(ZCH[m_[1]]) : null; } var zone = zc && String(r.id).indexOf(zc[0]) >= 0 ? '<a class="pg-zone" href="/districts/?profile=' + encodeURIComponent(S.profile) + '#zone-' + zc[1] + '"><b>' + esc(r.name) + ' split into ' + zc[2] + ' zones</b><span>Each district ranked on a map for families, young professionals and retirees</span></a>' : '';
    if (!zone && !x.inc.length && !x.imm.length && !x.blue) return '';
    if (zone && !document.getElementById('pgz-css')) { var sz = document.createElement('style'); sz.id = 'pgz-css'; sz.textContent = '.pg-zone{display:grid;gap:2px;margin:0 0 14px;padding:14px 16px;border-radius:14px;background:radial-gradient(120% 140% at 100% 0,#2a6f97 0,#0b1f3a 60%);color:#fff;text-decoration:none}.pg-zone span{font-size:13px;color:rgba(255,255,255,.8)}'; document.head.appendChild(sz); }
    return zone + (biz ? inc + imm : imm + inc) + '<p class="small muted">Shown for context; these programmes do not change the score. General information, not tax or immigration advice.</p>';
  });
}
