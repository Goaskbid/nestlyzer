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
}
CTX = {  # context indicator -> (id, label, unit, direction)
    'cpi_2025': ('corruption_perception', 'Corruption perceptions score (higher = cleaner)', '0-100', 1),
    'vdem_ldi': ('liberal_democracy', 'Liberal democracy (V-Dem)', '0-1', 1),
    'wbl_childcare_support': ('childcare_support', 'Childcare support (Women, Business and the Law)', '0-100', 1),
    'wbl_parenthood_support': ('parenthood_support', 'Parenthood support (Women, Business and the Law)', '0-100', 1),
    'nd_gain_index': ('climate_readiness', 'Climate adaptation readiness (ND-GAIN)', '0-100', 1),
}
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


# labour cost level: income per person at market prices (PPP income x price level), lower = cheaper to employ people
info['wage_level'] = {'label': 'Labour cost level (income per person at market prices)', 'unit': 'US $', 'dir': -1, 'source': 'World Bank WDI NY.GNP.PCAP.PP.CD x PA.NUS.PPPC.RF (CC BY 4.0)'}
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
miss = {cc: [k for k in CATS if k not in nat[cc]['cats']] for cc in CC}
print('national level for', len(CC), 'countries;', len(info), 'measures; categories missing:', {k: v for k, v in miss.items() if v})
for cc in ('CH', 'DE', 'HU', 'PL', 'PT', 'KR', 'US', 'JP', 'LT', 'TW'): print(cc, nat[cc]['cats'])
