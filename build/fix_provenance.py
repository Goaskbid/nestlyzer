#!/usr/bin/env python3
"""Population provenance per country (2.13.1, audit finding: GeoNames population labelled as Eurostat LAU 2024).

The four common population factors carried one source for every country. Outside Europe the places and their
population come from the GeoNames gazetteer, whose reference year differs from place to place; in Europe they come
from Eurostat GISCO LAU 2024 (for Switzerland the LAU table carries the Federal Statistical Office figures). This step
writes the true source per country into data/meta.json (factor.by_country), which the place pages already show.
Values and scores are untouched. Run after the data build (it is idempotent).
    python3 build/fix_provenance.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'data', 'meta.json')
m = json.load(open(P, encoding='utf-8'))
F = {f['id']: f for f in m['factors']}
IDS = ['common_population_scale', 'common_density_balance', 'common_low_crowding', 'common_population_growth_5y']
EU = {'source_name': 'Eurostat GISCO LAU 2024', 'dataset': 'local administrative units, population', 'period': '2024 LAU release'}
GN = {'source_name': 'GeoNames gazetteer (CC BY 4.0)', 'dataset': 'population as recorded for the place; reference year varies and is not an official census figure', 'period': 'year varies'}
n = 0
for fid in IDS:
    f = F.get(fid)
    if not f: continue
    bc = f.setdefault('by_country', {})
    for c in m['countries']:
        src = GN if c.get('world') else EU
        if fid == 'common_population_growth_5y' and c.get('world'):
            src = dict(GN, dataset='change between GeoNames population snapshots; not an official growth rate')
        bc[c['cc']] = dict(src); n += 1
    f['provenance_note'] = 'Source and period per country in by_country (Eurostat LAU in Europe, GeoNames elsewhere).'
json.dump(m, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('population provenance set for', n, 'factor-country pairs')
