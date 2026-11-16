#!/usr/bin/env python3
"""2.15.30: prices, energy, wages and business costs on European place cards, grouped by category with trend lines,
plus the Big Mac price with its history. Eurostat is answered by synthetic JSON-stat responses with each real
dataset's dimensions, so the test runs offline. Households must not see business costs; business searches see them first.
    python3 tests/test_everyday_prices.py [base-url]"""
import json, sys
from playwright.sync_api import sync_playwright
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
YEARS = ['2021', '2022', '2023', '2024']
def stat(dims, vals):
    # dims: list of (name, [codes]); the varying dim is the one with several codes; vals per code per year
    ids = [d[0] for d in dims] + ['geo', 'time']
    size = [len(d[1]) for d in dims] + [1, len(YEARS)]
    dimension = {d[0]: {'category': {'index': {c: i for i, c in enumerate(d[1])}}} for d in dims}
    dimension['geo'] = {'category': {'index': {'CH': 0}}}; dimension['time'] = {'category': {'index': {y: i for i, y in enumerate(YEARS)}}}
    value = {}; n = 0
    for i, v in enumerate(vals):
        for t in range(len(YEARS)): value[str(i * len(YEARS) + t)] = round(v * (0.901 + 0.033 * t), 4)
    return {'version': '2.0', 'class': 'dataset', 'id': ids, 'size': size, 'dimension': dimension, 'value': value}
CATS = ['E011', 'A0101', 'A0111', 'A010703', 'A0102', 'A010301', 'A010405', 'A0108']
DATA = {
    'prc_ppp_ind': stat([('freq', ['A']), ('na_item', ['PLI_EU27_2020']), ('ppp_cat', CATS)], [166.1, 140.2, 152.0, 170.3, 120.4, 98.9, 80.1, 101.5]),
    'lc_lci_lev': stat([('freq', ['A']), ('unit', ['EUR']), ('lcstruct', ['D1_D4_MD5']), ('nace_r2', ['B-S_X_O'])], [62.0]),
    'gov_10dd_edpt1': stat([('freq', ['A']), ('unit', ['PC_GDP']), ('sector', ['S13']), ('na_item', ['B9', 'GD'])], [-2.5, 85.0]),
    'gov_10a_exp': stat([('freq', ['A']), ('unit', ['PC_GDP']), ('sector', ['S13']), ('cofog99', ['GF0405', 'GF0603']), ('na_item', ['TE'])], [2.1, 0.12]),
    'nrg_pc_204': stat([('freq', ['S']), ('siec', ['E7000']), ('nrg_cons', ['KWH2500-4999']), ('unit', ['KWH']), ('tax', ['I_TAX']), ('currency', ['EUR'])], [0.32]),
}
with sync_playwright() as pw:
    br = pw.chromium.launch(); ctx = br.new_context(viewport={'width': 1300, 'height': 900})
    ctx.add_init_script("try{localStorage.setItem('nz:consent2',JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}")
    def route(rt):
        u = rt.request.url; ds = u.split('/data/')[-1].split('?')[0]
        if ds in ('gov_10dd_edpt1', 'gov_10a_exp'): queries.append(u)
        if ds in DATA: rt.fulfill(status=200, content_type='application/json', body=json.dumps(DATA[ds]))
        else: rt.fulfill(status=404, body='')
    queries = []
    ctx.route('**/eurostat/api/**', route)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    res = {}
    for prof in ['young_family', 'biz_logistics']:
        pg.goto(B + '/#/explore?cc=CH&p=' + prof, wait_until='load')
        pg.wait_for_function("document.querySelectorAll('#results .row[data-id]').length>2", timeout=120000)
        pg.locator('#results .row[data-id] .nm').first.click(); pg.wait_for_selector('#place.open', timeout=30000)
        pg.wait_for_function("document.querySelector('#place [data-regstat] .bigmac')", timeout=60000)
        res[prof] = pg.evaluate("""(()=>{const e=document.querySelector('#place [data-regstat]');return {
          groups:[...e.querySelectorAll('h4.rs-group')].map(h=>h.textContent),
          pli:[...e.querySelectorAll('tr[data-rk^=pli_]')].map(t=>t.innerText.replace(/\\s+/g,' ')),
          sparks:e.querySelectorAll('tr[data-rk^=pli_] .rs-spark svg').length,
          elec:(e.querySelector('tr[data-rk=p_elec]')||{}).innerText||'',
          fin:[...e.querySelectorAll('[data-rsg-body=fin] tr')].map(t=>t.innerText.replace(/\\s+/g,' ')),
          labour:(e.querySelector('tr[data-rk=b_labour]')||{}).innerText||'',
          bigmac:e.querySelector('.bigmac').innerText.replace(/\\s+/g,' '), bmspark:!!e.querySelector('.bigmac .rs-spark svg'),
          bigmacInPrices:!!e.querySelector('[data-rsg-body=prices] .bigmac')}})()""")
        pg.locator('[data-closeplace]:visible').first.click(); pg.wait_for_timeout(300)
    br.close()
h, b = res['young_family'], res['biz_logistics']
print(json.dumps(res, indent=1, ensure_ascii=False)[:1800])
checks = {
    'household: 8 price rows with trend lines': len(h['pli']) == 8 and h['sparks'] == 8,
    'household: food 40% above EU': any('Food and drink prices' in t and 'above the EU average' in t for t in h['pli']),
    'household: electricity row': '€0.320 per kWh' in h['elec'] or '€0.32 per kWh' in h['elec'],
    'household: groups start with prices, no business costs': h['groups'][:1] == ['Prices and living costs'] and 'Business costs' not in h['groups'],
    'household: no labour cost row': h['labour'] == '',
    'Big Mac in prices group with history': h['bigmacInPrices'] and h['bmspark'] and '$9.04' in h['bigmac'] and '45% more than in the US' in h['bigmac'],
    'household: public finances and infrastructure group (4 rows)': 'Public finances and infrastructure' in h['groups'] and len(h['fin']) == 4,
    'deficit shown as deficit, debt in % of GDP': any('deficit of 2.5% of GDP' in t for t in h['fin']) and any('Government debt' in t and '% of GDP' in t for t in h['fin']),
    'transport spending row': any('Public spending on transport' in t for t in h['fin']),
    'business: business costs first': b['groups'][:1] == ['Business costs'],
    'business: labour cost row': '€62.0 an hour' in b['labour'],
    'large tables filtered on the server': bool(queries) and all('unit=PC_GDP' in q and 'sector=S13' in q for q in queries),
    'no page errors': not errs,
}
for k, v in checks.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(checks.values())
print('EVERYDAY PRICES TEST:', 'PASS' if ok else 'FAIL', f'({sum(checks.values())} of {len(checks)}; errors {errs[:2]})'); sys.exit(0 if ok else 1)
