#!/usr/bin/env python3
"""2.15.27 (owner: "have costs for every place"): the national price level (World Bank WDI PA.NUS.PPPC.RF, PPP conversion
factor divided by the market exchange rate, US = 1; CC BY 4.0) is added for every Nestlyzer country that lacked it, as one
national figure per country (sh.rg level cc, not scored, same as the existing countries). Latest year per country."""
import csv, json, os, glob
import pycountry
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
latest = {}
for r in csv.DictReader(open(os.path.join(ROOT, 'build/source/wdi/pa.nus.pppc.rf.csv'), encoding='utf-8')):
    try: v = float(r['Value'])
    except ValueError: continue
    y = int(r['Year'])
    if r['Country Code'] not in latest or y > latest[r['Country Code']][1]: latest[r['Country Code']] = (v, y)
mp = os.path.join(ROOT, 'data/meta.json'); meta = json.load(open(mp))
f = next(x for x in meta['factors'] if x['id'] == 'n_price_level')
ISO = {'UK': 'GBR', 'EL': 'GRC'}; added = []
for c in meta['countries']:
    cc = c['cc']; p = os.path.join(ROOT, 'data/c', cc + '.json')
    if not os.path.exists(p) or cc in f['countries']: continue
    a3 = ISO.get(cc) or (pycountry.countries.get(alpha_2=cc).alpha_3 if pycountry.countries.get(alpha_2=cc) else None)
    if a3 not in latest: continue
    v, y = latest[a3]; sh = json.load(open(p))
    if 'n_price_level' in sh.get('fr', {}): continue
    sh.setdefault('rg', {})['n_price_level'] = {'cc': {cc: [round(v, 3), None]}}
    json.dump(sh, open(p, 'w'), separators=(',', ':'))
    f['countries'].append(cc)
    f.setdefault('by_country', {})[cc] = {'source_id': 'WB_WDI_PA.NUS.PPPC.RF', 'source_name': 'World Bank, World Development Indicators (PA.NUS.PPPC.RF)', 'dataset': 'PA.NUS.PPPC.RF',
        'url': 'https://data.worldbank.org/indicator/PA.NUS.PPPC.RF', 'licence': 'CC BY 4.0', 'period': str(y), 'level': 'country', 'unit': 'PPP conversion factor / exchange rate (US = 1)', 'places': sh['n']}
    added.append(f'{cc}:{v:.2f}({y})')
json.dump(meta, open(mp, 'w'), ensure_ascii=False, separators=(',', ':'))
print('price level added for', len(added), 'countries:', ' '.join(added))
