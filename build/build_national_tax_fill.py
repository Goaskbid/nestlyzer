#!/usr/bin/env python3
"""2.15.28 (owner: "taxes don't change every year, estimates matter. add them anywhere. use the data you have").

Every country without a local tax figure gets a national tax figure, and every country without a local cost figure gets
its national price level scored. Each is one value per country (sh.rg level cc), scored against the other Nestlyzer
countries (lower tax / lower prices = higher score) and flagged 'm' so every card labels it "national figure, used as an
estimate for this place". Countries with their own local tax or cost data are left exactly as they are.

Sources (all allow commercial use with attribution):
- OECD Taxing Wages 2026 (tax year 2025): income tax plus employee social contributions, single worker at the average
  wage, % of gross wage. CC BY 4.0. build/source/oecd_taxing_wages_2025.json
- World Bank WDI GC.TAX.TOTL.GD.ZS (scored across all Nestlyzer countries, OECD members included, so one scale), tax revenue % of GDP (central government, excluding social contributions), latest
  year. CC BY 4.0. Gaps: Hong Kong and Viet Nam from OECD Revenue Statistics in Asia and the Pacific (CC BY 4.0;
  Viet Nam with social contributions taken out), Taiwan from its Ministry of Finance (14.7 %, 2024, excluding social
  contributions), Liechtenstein from its statistics office (CC BY 4.0; tax revenue over GDP, estimate).
- World Bank WDI PA.NUS.PPPC.RF, national price level (already stored by build_price_level_fill.py); Liechtenstein, which
  shares the Swiss franc and customs area, uses the Swiss value, flagged as an estimate.
Idempotent. Run after build_price_level_fill.py."""
import csv, json, os
import pycountry
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
mp = os.path.join(ROOT, 'data/meta.json'); meta = json.load(open(mp))
CAT = {f['id']: f['category'] for f in meta['factors']}
NEW = ('n_wage_tax_national', 'n_tax_revenue_national')
ISO = {'UK': 'GBR', 'EL': 'GRC'}
def a3(cc):
    if cc in ISO: return ISO[cc]
    c = pycountry.countries.get(alpha_2=cc); return c.alpha_3 if c else None
def shard(cc): return os.path.join(ROOT, 'data/c', cc + '.json')
def has_local(sh, cat, skip=()):
    """True when any place in the shard has a scored factor of this category (place level or a regional figure)."""
    for k, arr in (sh.get('fs') or {}).items():
        if CAT.get(k) == cat and k not in skip and any(v is not None for v in arr): return True
    for k, lv in (sh.get('rg') or {}).items():
        if CAT.get(k) != cat or k in skip: continue
        for l, t in lv.items():
            if l == 'cc': continue
            if any(e[1] is not None for e in t.values()): return True
    return False
def pct(pool):
    """lower value = better: share of the other countries with a higher value (ties count half), 0-100."""
    out = {}; vals = list(pool.values()); n = len(vals)
    for cc, v in pool.items():
        hi = sum(1 for x in vals if x > v); eq = sum(1 for x in vals if x == v) - 1
        out[cc] = round(100 * (hi + 0.5 * eq) / max(1, n - 1), 1)
    return out

countries = [c['cc'] for c in meta['countries'] if os.path.exists(shard(c['cc']))]
oecd = json.load(open(os.path.join(ROOT, 'build/source/oecd_taxing_wages_2025.json')))
wage = {cc: v['income_tax_plus_employee_ssc_average_single'] for cc, v in oecd['countries'].items() if cc in countries}
wdi = {}
for r in csv.DictReader(open(os.path.join(ROOT, 'build/source/wdi/gc.tax.totl.gd.zs.csv'), encoding='utf-8')):
    try: v = float(r['Value'])
    except ValueError: continue
    y = int(r['Year'])
    if r['Country Code'] not in wdi or y > wdi[r['Country Code']][1]: wdi[r['Country Code']] = (v, y)
REV_SRC = {}
rev = {}
for cc in countries:
    x = wdi.get(a3(cc))
    if x: rev[cc] = round(x[0], 1); REV_SRC[cc] = ('World Bank, World Development Indicators (GC.TAX.TOTL.GD.ZS)', 'https://data.worldbank.org/indicator/GC.TAX.TOTL.GD.ZS', 'CC BY 4.0', str(x[1]))
EXTRA = {'HK': (14.1, 'OECD, Revenue Statistics in Asia and the Pacific (Hong Kong, China)', 'https://www.oecd.org/en/publications/revenue-statistics-in-asia-and-the-pacific-2026_22d80021-en/hong-kong-china_4b55a005-en.html', 'CC BY 4.0', '2022'),
         'VN': (13.5, 'OECD, Revenue Statistics in Asia and the Pacific (Viet Nam): 19.0 % of GDP less the 28.7 % share of social contributions', 'https://www.oecd.org/en/publications/revenue-statistics-in-asia-and-the-pacific-2026_22d80021-en/viet-nam_d78ca566-en.html', 'CC BY 4.0', '2022'),
         'LI': (16.0, 'Amt für Statistik Liechtenstein, Liechtenstein in Zahlen 2025: tax revenue 2023 (CHF 1,128m) over GDP 2022 (CHF 7,048m, derived from the published 3.3 % surplus ratio); estimate', 'https://statistikportal.li/statistikportal/publications/102-liechtenstein-in-zahlen/2025/01/1/102.2025.01.1_02_liechtenstein-in-zahlen-2025.pdf', 'CC BY 4.0', '2023'),
         'TW': (14.7, 'Ministry of Finance, Taiwan (tax burden ratio excluding social security contributions)', 'https://www.mof.gov.tw/', 'official statistic (figure only)', '2024')}
for cc, (v, n, u, l, y) in EXTRA.items():
    if cc in countries and cc not in rev: rev[cc] = v; REV_SRC[cc] = (n, u, l, y)
S_WAGE, S_REV = pct(wage), pct(rev)

def ensure_factor(fid, name, unit, desc, src, url, period):
    f = next((x for x in meta['factors'] if x['id'] == fid), None)
    if not f:
        f = {'id': fid, 'name': name, 'category': 'tax', 'direction': 'lower', 'unit': unit, 'countries': [], 'source_id': fid, 'description': desc,
             'confidence': 0.6, 'status': 'embedded_official', 'methodology_note': 'National figure scored against the other Nestlyzer countries (lower = better); used as an estimate for every place in a country without local tax data.',
             'transform': None, 'target': None, 'source_name': src, 'source_period': period, 'source_url': url, 'score_role': 'scored', 'v28': True, 'scope': 'pool', 'fmt': None,
             'auditability': 'raw value, level (country, marked as estimate), source, period and score visible in the app', 'by_country': {}}
        meta['factors'].append(f); CAT[fid] = 'tax'
    return f
FW = ensure_factor('n_wage_tax_national', 'Tax on wages, average earner (national)', '% of gross wage',
    'Income tax plus employee social contributions for a single worker on the average wage (OECD Taxing Wages). One national figure, used as an estimate where no local tax figure exists.',
    oecd['source'], oecd['url'], oecd['period'])
FR = ensure_factor('n_tax_revenue_national', 'Overall tax take (national, % of GDP)', '% of GDP',
    'Tax revenue as a share of the economy, excluding social contributions. One national figure, used as an estimate of the tax burden where no local tax figure exists.',
    'World Bank, World Development Indicators (GC.TAX.TOTL.GD.ZS)', 'https://data.worldbank.org/indicator/GC.TAX.TOTL.GD.ZS', 'latest available')
PL = next(x for x in meta['factors'] if x['id'] == 'n_price_level')

tax_added, cost_scored = [], []
for cc in countries:
    p = shard(cc); sh = json.load(open(p)); rg = sh.setdefault('rg', {}); ch = False
    for k in NEW:
        if k in rg: rg.pop(k); ch = True
    for f in (FW, FR):
        f['by_country'].pop(cc, None)
        if cc in f['countries']: f['countries'].remove(cc)
    nact = sum(1 for row in sh['rows'] if not row[sh['cols'].index('sup')]) if 'sup' in sh['cols'] else sh['n']
    if not has_local(sh, 'tax', NEW):
        todo = []
        if cc in wage: todo.append(('n_wage_tax_national', FW, wage[cc], S_WAGE[cc], (oecd['source'], oecd['url'], 'CC BY 4.0', oecd['period'])))
        if cc in rev: todo.append(('n_tax_revenue_national', FR, rev[cc], S_REV[cc], REV_SRC[cc]))
        for k, f, v, s, src in todo:
            rg[k] = {'cc': {cc: [v, s, 'm']}}; ch = True; f['countries'].append(cc)
            f['by_country'][cc] = {'source_id': f['source_id'], 'source_name': src[0], 'url': src[1], 'licence': src[2], 'period': src[3], 'level': 'country', 'unit': f['unit'], 'places': nact, 'estimate': True}
            tax_added.append(f'{cc}:{v}->{s}')
    # national price level: score it where the country has no local cost figure
    pl = rg.get('n_price_level', {}).get('cc', {})
    if cc == 'LI' and not pl:
        chv = json.load(open(shard('CH')))['rg']['n_price_level']['cc']['CH'][0]
        rg['n_price_level'] = {'cc': {'LI': [chv, None, 'm']}}; pl = rg['n_price_level']['cc']; ch = True
        PL['by_country']['LI'] = dict(PL['by_country'].get('CH', {}), places=nact, estimate=True, note='Swiss value: Liechtenstein uses the Swiss franc and the Swiss customs area')
        if 'LI' not in PL['countries']: PL['countries'].append('LI')
    if cc == 'TW' and not pl:
        # Taiwan has no World Bank value. Penn World Table 11.0 (CC BY 4.0) puts its GDP price level at 0.521 in 2023
        # (US 2021 = 1); scaled to the World Bank series with Korea (0.632 -> 0.594) and Japan (0.766 -> 0.624): 0.457
        rg['n_price_level'] = {'cc': {'TW': [0.457, None, 'm']}}; pl = rg['n_price_level']['cc']; ch = True
        PL['by_country']['TW'] = {'source_id': 'PWT_11_0', 'source_name': 'Penn World Table 11.0 (Groningen Growth and Development Centre), price level of GDP, 2023',
            'url': 'https://www.rug.nl/ggdc/productivity/pwt/pwt-releases/pwt110', 'licence': 'CC BY 4.0', 'period': '2023', 'level': 'country',
            'unit': PL['by_country'].get('CH', {}).get('unit', ''), 'places': nact, 'estimate': True,
            'note': 'Scaled to the World Bank series using Korea and Japan, which appear in both'}
        if 'TW' not in PL['countries']: PL['countries'].append('TW')
    if pl:
        e = pl[cc]; local = has_local(sh, 'affordability', ('n_price_level',))
        want = [e[0], None] if local else [e[0], None, 'm']
        if e != want: pl[cc] = want; ch = True
        if not local: cost_scored.append(cc)
    if ch: json.dump(sh, open(p, 'w'), separators=(',', ':'))
# gaps inside countries that do have local data: places without a figure take the median of their region (NUTS 3 or
# local region, then NUTS 2, then the country) of the same measure, flagged as an estimate. Never overwrites a real figure.
def med(a):
    a = sorted(a); m = len(a) // 2
    return None if not a else (a[m] if len(a) % 2 else (a[m - 1] + a[m]) / 2)
gap = {}
for cc in countries:
    p = shard(cc); sh = json.load(open(p)); C = {c: i for i, c in enumerate(sh['cols'])}; rg = sh.setdefault('rg', {}); ch = False
    for k in sh.pop('rgGap', []):
        rg.pop(k, None); ch = True
    act = [i for i, row in enumerate(sh['rows']) if not ('sup' in C and row[C['sup']])]
    # 2.15.28 audit fix: spread only measures that cover at least half the places (or the best-covered one where none
    # does), and a regional median needs 3 places behind it, so a sparse sample never stands in for a whole region
    cov = {}
    for k, sarr in (sh.get('fs') or {}).items():
        if CAT.get(k) not in ('tax', 'affordability') or k in rg: continue
        rarr = sh['fr'].get(k); cov[k] = [i for i in act if sarr[i] is not None and rarr and rarr[i] is not None]
    pick = set()
    for cat in ('tax', 'affordability'):
        ks = [k for k in cov if CAT[k] == cat and cov[k]]
        good = [k for k in ks if len(cov[k]) >= 0.5 * len(act)]
        pick |= set(good or sorted(ks, key=lambda k: -len(cov[k]))[:1])
    for k in sorted(pick):
        sarr = sh['fs'][k]; rarr = sh['fr'][k]; have = cov[k]
        if len(have) == len(act): continue
        lv = {'n3': {}, 'n2': {}, 'cc': {}}
        for i in have:
            n3 = sh['rows'][i][C['n3']] or '' if 'n3' in C else ''
            for l, code in (('n3', n3), ('n2', n3[:4]), ('cc', cc)):
                if code: lv[l].setdefault(code, ([], []))[0].append(rarr[i]); lv[l][code][1].append(sarr[i])
        t = {l: {code: [round(med(v[0]), 3), round(med(v[1]), 2), 'm'] for code, v in d.items() if l == 'cc' or len(v[0]) >= 3} for l, d in lv.items() if d}
        t = {l: d for l, d in t.items() if d}
        rg[k] = t; sh.setdefault('rgGap', []).append(k); ch = True
        gap[cc] = gap.get(cc, 0) + len(act) - len(have)
    if ch: json.dump(sh, open(p, 'w'), separators=(',', ':'))
print('regional-median estimates for place gaps (place-measures):', gap)
# price level score across all countries that carry it
lv = {}
for cc in countries:
    sh = json.load(open(shard(cc))); e = sh.get('rg', {}).get('n_price_level', {}).get('cc', {}).get(cc)
    if e: lv[cc] = e[0]
S_PL = pct(lv)
for cc in cost_scored:
    p = shard(cc); sh = json.load(open(p)); e = sh['rg']['n_price_level']['cc'][cc]; e[1] = S_PL[cc]
    json.dump(sh, open(p, 'w'), separators=(',', ':'))
PL['methodology_note'] = 'Countries with local housing or cost data: shown, not scored. Countries without: scored against the other Nestlyzer countries (lower = better) and marked as a national estimate (2.15.28).'
al = meta['config'].setdefault('evidenceCategoryAllow', {})
if 'n_price_level' not in al.get('affordability', []): al.setdefault('affordability', []).append('n_price_level')
json.dump(meta, open(mp, 'w'), ensure_ascii=False, separators=(',', ':'))
print('national tax estimate added for', len(tax_added), 'countries:', ' '.join(tax_added))
print('price level scored as national estimate for', len(cost_scored), 'countries:', ' '.join(f'{c}:{S_PL[c]}' for c in cost_scored))
