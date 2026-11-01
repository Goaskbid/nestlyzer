#!/usr/bin/env python3
"""National level for cross-country rankings (2.11). Every Nestlyzer country gets comparable national figures and, from
them, a national score per category (0-100 across the 54 countries). The global and continental rankings combine this
national level with each place's own score inside its country (build_global_rank.js).

Sources:
  World Bank World Development Indicators (CC BY 4.0), mirrored on GitHub by datasets/world-development-indicators,
  stored in build/source/wdi/<indicator>.csv (Country Name,Country Code,Year,Value); latest value from 2015 on.
  Already in Nestlyzer: Transparency International CPI 2025, V-Dem v16, World Bank Women, Business and the Law 2025,
  ND-GAIN 2024 (data/x/*.json context records).
Taiwan is not in the World Bank tables: its WDI-based measures stay empty and the category uses what is left.
    python3 build/build_national.py      -> data/national.json"""
import csv, glob, json, os, statistics
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ISO3 = {'AL': 'ALB', 'AT': 'AUT', 'AU': 'AUS', 'BE': 'BEL', 'BG': 'BGR', 'CA': 'CAN', 'CH': 'CHE', 'CY': 'CYP', 'CZ': 'CZE', 'DE': 'DEU', 'DK': 'DNK',
        'EE': 'EST', 'EL': 'GRC', 'ES': 'ESP', 'FI': 'FIN', 'FR': 'FRA', 'HK': 'HKG', 'HR': 'HRV', 'HU': 'HUN', 'IE': 'IRL', 'IL': 'ISR', 'IS': 'ISL', 'IT': 'ITA',
        'JP': 'JPN', 'KR': 'KOR', 'LI': 'LIE', 'LT': 'LTU', 'LU': 'LUX', 'LV': 'LVA', 'MK': 'MKD', 'MT': 'MLT', 'NL': 'NLD', 'NO': 'NOR', 'NZ': 'NZL', 'PL': 'POL',
        'PT': 'PRT', 'RO': 'ROU', 'RS': 'SRB', 'SE': 'SWE', 'SG': 'SGP', 'SI': 'SVN', 'SK': 'SVK', 'TW': 'TWN', 'UK': 'GBR', 'US': 'USA', 'BR': 'BRA', 'MX': 'MEX', 'MY': 'MYS', 'ID': 'IDN', 'MA': 'MAR', 'ZA': 'ZAF', 'IN': 'IND', 'CN': 'CHN', 'AE': 'ARE'}
WDI = {  # file -> (id, label, unit, direction)
    'ny.gnp.pcap.pp.cd': ('gni_pc_ppp', 'Income per person (GNI per capita, PPP)', 'international $', 1),
    'sl.uem.totl.zs': ('unemployment', 'Unemployment rate (ILO)', '%', -1),
    'sl.tlf.cact.fe.zs': ('female_lfp', 'Women in the labour force', '% of women 15+', 1),
    'pa.nus.pppc.rf': ('price_level', 'Price level (PPP / exchange rate)', 'ratio', -1),
    'sp.dyn.le00.in': ('life_expectancy', 'Life expectancy at birth', 'years', 1),
    'sp.dyn.imrt.in': ('infant_mortality', 'Infant mortality', 'per 1,000 births', -1),
    'sh.med.beds.zs': ('hospital_beds', 'Hospital beds', 'per 1,000 people', 1),
    'vc.ihr.psrc.p5': ('homicide', 'Homicide rate', 'per 100,000', -1),
    'sh.sta.traf.p5': ('road_deaths', 'Road traffic deaths', 'per 100,000', -1),
    'en.atm.pm25.mc.m3': ('pm25', 'Fine-dust exposure (PM2.5)', 'µg/m³', -1),
    'eg.elc.rnew.zs': ('renewable_power', 'Renewable electricity', '% of output', 1),
    'it.net.bbnd.p2': ('broadband', 'Fixed broadband subscriptions', 'per 100 people', 1),
    'se.ter.enrr': ('tertiary', 'Tertiary enrolment', '% gross', 1),
    'si.pov.gini': ('gini', 'Income inequality (Gini)', 'index', -1),
    'lp.lpi.ovrl.xq': ('lpi', 'Logistics Performance Index', '1-5', 1),
    'gc.tax.totl.gd.zs': ('tax_revenue', 'Tax revenue', '% of GDP', -1),
    # 2.13 business climate (owner's list of what companies weigh): red tape, legal certainty, taxes, cost of capital
    'ic.reg.durs': ('startup_days', 'Days to start a business (Doing Business)', 'days', -1),
    'ic.reg.proc': ('startup_procedures', 'Procedures to start a business (Doing Business)', 'number', -1),
    'ic.bus.ease.xq': ('ease_rank', 'Ease of doing business rank (Doing Business, 1 = easiest of 190)', 'rank', -1),
    'ic.lgl.cred.xq': ('legal_rights', 'Strength of legal rights for borrowers and lenders', '0-12', 1),
    'ic.tax.totl.cp.zs': ('total_tax_rate', 'Total tax and contribution rate on commercial profits', '% of profit', -1),
    'fr.inr.lend': ('lending_rate', 'Bank lending interest rate', '%', -1),
    'fr.inr.rinr': ('real_interest', 'Real interest rate', '%', -1),
}
CTX = {  # context indicator -> (id, label, unit, direction)
    'bready_regulatory': ('bready_regulatory', 'Regulatory framework (World Bank B-READY 2025)', '0-100', 1),
    'bready_entry': ('bready_entry', 'Business entry (B-READY)', '0-100', 1),
    'bready_services': ('bready_services', 'Public services for business (B-READY)', '0-100', 1),
    'bready_disputes': ('bready_disputes', 'Dispute resolution (B-READY)', '0-100', 1),
    'bready_finance': ('bready_finance', 'Access to finance (B-READY)', '0-100', 1),
    'bready_tax': ('bready_tax', 'Taxation administration (B-READY)', '0-100', 1),
    'electricity_business_eur_kwh': ('power_price_business', 'Business electricity price (Eurostat, 500-1,999 MWh a year)', 'EUR/kWh', -1),
    'wb_fdi_net_inflows_pct_gdp': ('fdi_inflows', 'Foreign direct investment, net inflows', '% of GDP', 1),
    'cpi_2025': ('corruption_perception', 'Corruption perceptions score (higher = cleaner)', '0-100', 1),
    'vdem_ldi': ('liberal_democracy', 'Liberal democracy (V-Dem)', '0-1', 1),
    'wbl_childcare_support': ('childcare_support', 'Childcare support (Women, Business and the Law)', '0-100', 1),
    'wbl_parenthood_support': ('parenthood_support', 'Parenthood support (Women, Business and the Law)', '0-100', 1),
    'nd_gain_index': ('climate_readiness', 'Climate adaptation readiness (ND-GAIN)', '0-100', 1),
}
# 2.13: growth momentum (real GDP growth, average of the last five years) and its change against 2015-2019: an energy
# shock or a war shows as a falling trend (competitiveness deterioration)
def growth_series():
    p = os.path.join(ROOT, 'build', 'source', 'wdi', 'ny.gdp.mktp.kd.zg.csv'); out = {}
    if not os.path.exists(p): return out
    for r in csv.DictReader(open(p, encoding='utf-8')):
        try: out.setdefault(r['Country Code'], {})[int(r['Year'])] = float(r['Value'])
        except Exception: pass
    return out
# statutory corporate income tax (headline rate incl. typical local taxes), the same table the place pages show
CIT = {}
try:
    import re as _re
    _m = _re.search(r'var CIT = (\{[^}]*\})', open(os.path.join(ROOT, 'src', 'more', 'more.js'), encoding='utf-8').read())
    CIT = {k: float(v) for k, v in _re.findall(r'([A-Z]{2}): ([\d.]+)', _m.group(1))} if _m else {}
except Exception: CIT = {}
# category -> [(measure, weight)]; how much of a place's global category score is national (alpha) is set in build_global_rank.js
CATS = {
    'jobs': [('gni_pc_ppp', 2), ('unemployment', 1), ('female_lfp', 0.5)],
    'affordability': [('price_level', 1)],
    'safety': [('homicide', 2), ('road_deaths', 1), ('corruption_perception', 1)],
    'health': [('life_expectancy', 2), ('infant_mortality', 1), ('hospital_beds', 0.5)],
    'environment': [('pm25', 2), ('renewable_power', 0.5), ('climate_readiness', 0.5)],
    'family': [('infant_mortality', 1), ('childcare_support', 1), ('parenthood_support', 1), ('tertiary', 0.5), ('female_lfp', 0.5)],
    'foundation': [('corruption_perception', 1), ('liberal_democracy', 1), ('gini', 0.5)],
    'mobility': [('broadband', 1), ('lpi', 0.5)],
    'freight': [('lpi', 1)],
    'governance': [('corruption_perception', 1), ('liberal_democracy', 1)],
    'focus_cost': [('wage_level', 3), ('corruption_perception', 0.5)],      # site fit, cost-driven company sites
    'focus_talent': [('tertiary', 1), ('gni_pc_ppp', 1), ('corruption_perception', 0.5)],  # site fit, skills-driven company sites
    # 2.13 business climate: each a national level that companies compare across countries
    'red_tape': [('bready_regulatory', 1), ('bready_entry', 1), ('bready_services', 0.5), ('startup_days', 1), ('startup_procedures', 0.5), ('ease_rank', 1)],
    'rule_of_law': [('liberal_democracy', 1), ('corruption_perception', 1), ('legal_rights', 0.5), ('bready_disputes', 0.5)],
    'biz_tax': [('cit_rate', 1), ('total_tax_rate', 1), ('bready_tax', 0.5)],
    'capital_cost': [('real_interest', 1), ('lending_rate', 1), ('bready_finance', 0.5)],
    'energy_cost': [('power_price_business', 1)],
    'momentum': [('growth_5y', 1), ('growth_change', 0.5), ('fdi_inflows', 0.5)],
}


def wdi(path):
    best = {}
    for r in csv.DictReader(open(path, encoding='utf-8')):
        try: y, v = int(r['Year']), float(r['Value'])
        except Exception: continue
        if y >= 2015 and (r['Country Code'] not in best or y > best[r['Country Code']][0]): best[r['Country Code']] = (y, v)
    return best


meta = json.load(open(os.path.join(ROOT, 'data', 'meta.json')))
CC = [c['cc'] for c in meta['countries']]
val, info = {cc: {} for cc in CC}, {}
for f, (mid, lab, unit, d) in WDI.items():
    p = os.path.join(ROOT, 'build', 'source', 'wdi', f + '.csv')
    if not os.path.exists(p): continue
    b = wdi(p); info[mid] = {'label': lab, 'unit': unit, 'dir': d, 'source': 'World Bank WDI ' + f.upper() + ' (CC BY 4.0)'}
    for cc in CC:
        if ISO3[cc] in b: val[cc][mid] = [round(b[ISO3[cc]][1], 3), b[ISO3[cc]][0]]
for cc in CC:
    p = os.path.join(ROOT, 'data', 'x', cc + '.json')
    if not os.path.exists(p): continue
    for o in json.load(open(p)).get('ctx', {}).get('records', []):
        if o.get('source_geo_level') == 'country' and o.get('indicator_id') in CTX and o.get('value') is not None:
            mid, lab, unit, d = CTX[o['indicator_id']]; info[mid] = {'label': lab, 'unit': unit, 'dir': d, 'source': o.get('source_id', '')}
            val[cc][mid] = [o['value'], str(o.get('reference_period', ''))[:4]]
# 2.12: the nine new countries have no CPI 2025 record yet; Transparency International's CPI 2024 (published Feb 2025)
# fills the gap, marked with its year, so governance is not judged on democracy alone
CPI2024 = {'BR': 34, 'MX': 26, 'MY': 50, 'ID': 37, 'MA': 37, 'ZA': 41, 'IN': 38, 'CN': 43, 'AE': 68}
for cc, v in CPI2024.items():
    if cc in val and 'corruption_perception' not in val[cc]: val[cc]['corruption_perception'] = [v, '2024']
# national homicide already in Nestlyzer (n_homicide_national) fills gaps (e.g. Taiwan)
for f in meta['factors']:
    if f['id'] == 'n_homicide_national':
        for cc, b in (f.get('by_country') or {}).items():
            if cc in val and 'homicide' not in val[cc] and b.get('value') is not None: val[cc]['homicide'] = [b['value'], b.get('period')]


info['cit_rate'] = {'label': 'Corporate income tax rate (headline)', 'unit': '%', 'dir': -1, 'source': 'Nestlyzer country tax table (OECD, national tax authorities)'}
info['growth_5y'] = {'label': 'Real GDP growth, average of the last five years', 'unit': '% a year', 'dir': 1, 'source': 'World Bank WDI NY.GDP.MKTP.KD.ZG (CC BY 4.0)'}
info['growth_change'] = {'label': 'Growth trend: last three years against 2015-2019', 'unit': 'percentage points', 'dir': 1, 'source': 'World Bank WDI NY.GDP.MKTP.KD.ZG (CC BY 4.0)'}
GS = growth_series()
for cc in CC:
    if cc in CIT: val[cc]['cit_rate'] = [CIT[cc], '2026']
    g = GS.get(ISO3.get(cc, ''), {})
    ys = sorted(y for y in g if y >= 2015)
    if len(ys) >= 6:
        last = ys[-1]; recent5 = [g[y] for y in ys if y > last - 5]; recent3 = [g[y] for y in ys if y > last - 3]; base = [g[y] for y in ys if 2015 <= y <= 2019]
        val[cc]['growth_5y'] = [round(sum(recent5) / len(recent5), 2), last]
        if base: val[cc]['growth_change'] = [round(sum(recent3) / len(recent3) - sum(base) / len(base), 2), last]
# labour cost level: income per person at market prices (PPP income x price level), lower = cheaper to employ people
info['wage_level'] = {'label': 'Income per person at market prices (national proxy for labour cost, not a wage)', 'unit': 'US $', 'dir': -1, 'source': 'World Bank WDI NY.GNP.PCAP.PP.CD x PA.NUS.PPPC.RF (CC BY 4.0)'}
for cc in CC:
    v = val[cc]
    if 'gni_pc_ppp' in v and 'price_level' in v: v['wage_level'] = [round(v['gni_pc_ppp'][0] * v['price_level'][0]), v['gni_pc_ppp'][1]]
# Liechtenstein is not in most World Bank tables; it shares currency, customs area and much of its market with
# Switzerland, so Swiss national figures stand in where its own are missing (labelled in the output)
proxy = {}
for mid in info:
    if 'LI' in val and mid not in val['LI'] and mid in val.get('CH', {}): val['LI'][mid] = val['CH'][mid] + ['CH']; proxy.setdefault('LI', []).append(mid)


def score(mid):
    xs = sorted(v[mid][0] for v in val.values() if mid in v)
    if len(xs) < 5: return {}
    lo, hi = xs[max(0, int(len(xs) * 0.05))], xs[min(len(xs) - 1, int(len(xs) * 0.95))]   # 5th-95th percentile range, outliers clipped
    d = info[mid]['dir']; out = {}
    for cc, v in val.items():
        if mid in v and hi > lo:
            s = max(0, min(1, (v[mid][0] - lo) / (hi - lo))); out[cc] = round(100 * (s if d > 0 else 1 - s), 1)
    return out


S = {mid: score(mid) for mid in info}
nat = {}
for cc in CC:
    cats = {}
    for k, parts in CATS.items():
        num = den = 0
        for mid, w in parts:
            if cc in S.get(mid, {}): num += S[mid][cc] * w; den += w
        tot = sum(w for _, w in parts)
        if den >= tot * 0.5: cats[k] = round(num / den, 1)
    nat[cc] = {'cats': cats, 'values': val[cc]}
out = {'version': 1, 'method': 'Each measure scored 0-100 across the 54 countries between its 5th and 95th percentile (direction applied); a category is the weighted mean of its measures and needs at least half of its measure weight.',
       'measures': info, 'categories': {k: [[m, w] for m, w in v] for k, v in CATS.items()}, 'proxies': {'LI': {'from': 'CH', 'measures': proxy.get('LI', [])}}, 'countries': nat}
json.dump(out, open(os.path.join(ROOT, 'data', 'national.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
# 2.13: business climate for the app and the insights pages: the six drivers per country, its rank among the countries
# with a figure, the measures behind them with their years, and the per-site mixes (build/source/bizclimate_mix.json)
BCF = json.load(open(os.path.join(ROOT, 'build', 'source', 'bizclimate_mix.json')))
BCM = sorted({m for k in BCF['keys'] for m, _ in CATS[k]})
bc = {'keys': BCF['keys'], 'labels': BCF['labels'], 'short': BCF['short'], 'mix': BCF['mix'], 'default': BCF['default'], 'share': BCF['share'],
      'measures': {m: info[m] for m in BCM if m in info}, 'parts': {k: [[m, w] for m, w in CATS[k]] for k in BCF['keys']}, 'countries': {}}
for k in BCF['keys']:
    have = sorted((cc for cc in CC if k in nat[cc]['cats']), key=lambda cc: -nat[cc]['cats'][k])
    for i, cc in enumerate(have): bc['countries'].setdefault(cc, {'cats': {}, 'ranks': {}, 'n': {}, 'values': {}})['ranks'][k] = i + 1
    for cc in have: bc['countries'][cc]['cats'][k] = nat[cc]['cats'][k]; bc['countries'][cc]['n'][k] = len(have)
for cc in CC:
    e = bc['countries'].setdefault(cc, {'cats': {}, 'ranks': {}, 'n': {}, 'values': {}})
    e['values'] = {m: val[cc][m] for m in BCM if m in val[cc]}
    for m in ('wage_level', 'tertiary', 'gni_pc_ppp'):
        if m in val[cc]: e['values'][m] = val[cc][m]
    e['focus'] = {k: nat[cc]['cats'].get(k) for k in ('focus_cost', 'focus_talent')}
    g = GS.get(ISO3.get(cc, ''), {}); e['growth'] = [[y, round(g[y], 2)] for y in sorted(g) if y >= 2010]
for m in ('wage_level', 'tertiary', 'gni_pc_ppp'): bc['measures'][m] = info[m]
json.dump(bc, open(os.path.join(ROOT, 'data', 'bizclimate.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
print('business climate:', {k: sum(1 for c in bc['countries'].values() if k in c['cats']) for k in BCF['keys']})
miss = {cc: [k for k in CATS if k not in nat[cc]['cats']] for cc in CC}
print('national level for', len(CC), 'countries;', len(info), 'measures; categories missing:', {k: v for k, v in miss.items() if v})
for cc in ('CH', 'DE', 'HU', 'PL', 'PT', 'KR', 'US', 'JP', 'LT', 'TW'): print(cc, nat[cc]['cats'])
