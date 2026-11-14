#!/usr/bin/env python3
"""2.15.26: nuclear and large coal power stations worldwide, added to data/facilities.json.

Source: WRI Global Power Plant Database v1.3 (CC BY 4.0), github.com/wri/global-power-plant-database.
Kept: every nuclear plant, and coal plants of 500 MW or more, in Nestlyzer countries. US nuclear stays from the NRC roster
already in the layer. Status is as of the database release (2021): plants closed since then are marked where the closure
is a matter of public record (Germany shut its last reactors on 15 April 2023); others say "check current status".
Run: python3 build/build_power_plants.py [path to global_power_plant_database.csv]
"""
import csv, json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build/source/power_plants_wri.csv')
if len(sys.argv) > 1:   # trim the full download into the stored source
    import pycountry
    rows = []
    for r in csv.DictReader(open(sys.argv[1], encoding='utf-8')):
        mw = float(r['capacity_mw'] or 0)
        if r['primary_fuel'] == 'Nuclear' or (r['primary_fuel'] == 'Coal' and mw >= 500):
            c = pycountry.countries.get(alpha_3=r['country'])
            if not c: continue
            rows.append({'cc': c.alpha_2, 'name': r['name'], 'mw': round(mw), 'lat': r['latitude'], 'lon': r['longitude'], 'fuel': r['primary_fuel'], 'year': r['commissioning_year'][:4] if r['commissioning_year'] else ''})
    with open(SRC, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
meta = json.load(open(os.path.join(ROOT, 'data/meta.json')))
ISO = {'GB': 'UK', 'GR': 'EL'}
ours = {c['cc'] for c in meta['countries']}
fp = os.path.join(ROOT, 'data/facilities.json'); fac = json.load(open(fp))
fac['items'] = [i for i in fac['items'] if i.get('by') != 'WRI Global Power Plant Database']
add = []
for r in csv.DictReader(open(SRC, encoding='utf-8')):
    cc = ISO.get(r['cc'], r['cc'])
    if cc not in ours or (cc == 'US' and r['fuel'] == 'Nuclear'): continue
    nuc = r['fuel'] == 'Nuclear'
    status = 'shut down by April 2023; the site and spent-fuel storage remain' if nuc and cc == 'DE' else 'listed as operating in 2021; check current status'
    add.append({'name': r['name'], 'cc': cc, 'lat': round(float(r['lat']), 3), 'lon': round(float(r['lon']), 3), 'kind': 'nuclear' if nuc else 'coal',
                'label': 'Nuclear power station' if nuc else 'Coal power station', 'detail': f"{int(r['mw']):,} MW, {status}",
                'by': 'WRI Global Power Plant Database', 'source': 'https://github.com/wri/global-power-plant-database', 'period': '2021 release (v1.3, CC BY 4.0)'})
fac['items'] += add
fac['counts'] = {}
for i in fac['items']: fac['counts'][i['kind']] = fac['counts'].get(i['kind'], 0) + 1
json.dump(fac, open(fp, 'w'), ensure_ascii=False, separators=(',', ':'))
print('added', len(add), 'power stations; counts', fac['counts'], 'size', os.path.getsize(fp))
