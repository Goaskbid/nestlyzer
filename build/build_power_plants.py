#!/usr/bin/env python3
"""2.15.26: nuclear and large coal power stations worldwide, added to data/facilities.json.

Source: WRI Global Power Plant Database v1.3 (CC BY 4.0), github.com/wri/global-power-plant-database.
Kept: every nuclear plant, and coal plants of 500 MW or more, in Nestlyzer countries. US nuclear stays from the NRC roster
already in the layer. Status is as of the database release (2021): plants closed since then are marked where the closure
is a matter of public record (Germany shut its last reactors on 15 April 2023); others say "check current status".
Run: python3 build/build_power_plants.py [path to global_power_plant_database.csv]
"""
import csv, difflib, json, os, re, sys
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
    status = 'shut down by April 2023; the site and spent-fuel storage remain' if nuc and cc == 'DE' else 'in the 2021 database; check current status'
    add.append({'name': r['name'], 'cc': cc, 'lat': round(float(r['lat']), 3), 'lon': round(float(r['lon']), 3), 'kind': 'nuclear' if nuc else 'coal',
                'label': 'Nuclear power station' if nuc else 'Coal power station', 'detail': f"{int(r['mw']):,} MW, {status}",
                'by': 'WRI Global Power Plant Database', 'source': 'https://github.com/wri/global-power-plant-database', 'period': '2021 release (v1.3, CC BY 4.0)'})
# 2.15.27 (owner audit: Gösgen and Leibstadt listed twice): one row per power station site.
# 1. An older WRI nuclear extract (build_facilities.py) overlaps this one; it is kept only for countries this import does
#    not cover, and the US keeps the NRC roster alone. Kept rows get the same wording as the rest.
# 2. Units of one station (Tihange 1N and 3, Atucha I and II) become one row: same kind, same base name, within 2 km;
#    capacities are added up and the row says how many units the database lists.
covered = {a['cc'] for a in add if a['kind'] == 'nuclear'} | {'US'}
kept_old = []
for i in fac['items']:
    if i['kind'] == 'nuclear' and str(i.get('by', '')).startswith('World Resources Institute'):
        if i['cc'] in covered: continue
        mw = re.search(r'([\d,]+) MW', i.get('detail', ''))
        i.update({'label': 'Nuclear power station', 'detail': (mw.group(1) + ' MW, ' if mw else '') + 'in the 2021 database; check current status',
                  'by': 'WRI Global Power Plant Database', 'source': 'https://github.com/wri/global-power-plant-database', 'period': '2021 release (v1.3, CC BY 4.0)'})
        for k in ('gppd_idnr', 'year_of_capacity_data'): i.pop(k, None)
        add.append(i); continue
    kept_old.append(i)
fac['items'] = kept_old
def base(n):
    n = re.sub(r'\(.*?\)', ' ', n.lower())
    n = re.sub(r'\b(unit|unidade|block|blok|reactor|units?)\b', ' ', n)
    n = re.sub(r'(\b([ivx]+|\d+[a-z]?|[a-z]?\d+)\b)', ' ', n)
    return re.sub(r'[\s\-–,.]+', ' ', n).strip()
GENERIC = set('power station plant coal thermal tpp stps kraftwerk braunkohlekraftwerk steinkohlekraftwerk heizkraftwerk kw cogen energy electric generating central centrale termica termoelectrica nuclear npp atomic new area expansion north south east west the and of de la el power-station co ltd'.split())
def toks(n): return {t for t in re.findall(r'[a-zà-ÿ]{4,}', base(n)) if t not in GENERIC}
def km(a, b):
    import math
    t = math.pi / 180; dl = (b['lat'] - a['lat']) * t; dn = (b['lon'] - a['lon']) * t
    x = math.sin(dl / 2) ** 2 + math.cos(a['lat'] * t) * math.cos(b['lat'] * t) * math.sin(dn / 2) ** 2
    return 12742 * math.asin(math.sqrt(x))
groups = []
for a in add:
    for g in groups:
        h = g[0]
        if h['kind'] == a['kind'] and h['cc'] == a['cc'] and km(h, a) <= 2 and (base(h['name']) == base(a['name']) and base(a['name']) or toks(h['name']) & toks(a['name']) or difflib.SequenceMatcher(None, base(h['name']), base(a['name'])).ratio() >= 0.8 or h['kind'] == 'nuclear' and km(h, a) < 0.05): g.append(a); break
    else: groups.append([a])
merged = []
for g in groups:
    h = dict(g[0]); nm = h['name']
    if len(g) > 1:
        mws = [int(m.group(1).replace(',', '')) for x in g for m in [re.search(r'([\d,]+) MW', x['detail'])] if m]
        st = h['detail'].split(', ', 1)[1] if ', ' in h['detail'] else h['detail']
        if len({base(x['name']) for x in g}) > 1:   # differently named plants at one site
            big = max(g, key=lambda x: int((re.search(r'([\d,]+) MW', x['detail']) or re.search('(0)', '0')).group(1).replace(',', '')))
            nm = big['name']; h['aka'] = sorted({x['name'] for x in g} - {nm})
            h['detail'] = big['detail'] + '. Also listed at this site: ' + ', '.join(h['aka'])   # not summed: may be the same plant under two names
        else:                                          # units of one station
            b = base(nm); orig = re.search(r'[\s\-–,.]+'.join(map(re.escape, b.split())), nm, re.I)
            nm = orig.group(0).strip(' -–,') if orig else nm
            h['detail'] = (f"{sum(mws):,} MW in {len(g)} units, " if mws else f"{len(g)} units, ") + st
    if nm.isupper(): nm = ' '.join(w if len(w) <= 3 and w.isalpha() and w in ('NPP', 'CHP', 'TPP', 'II', 'III', 'IV') else w.capitalize() for w in nm.split())
    h['name'] = nm; merged.append(h)
# Closures and names after the 2021 database release, from operators' and regulators' public announcements.
# A station is only marked shut down where the closure is a matter of public record; everything else keeps "check current status".
SHUT = {('CH', 'Kernkraftwerk Mühleberg'): 'shut down in December 2019; being dismantled',
        ('FR', 'Fessenheim'): 'shut down in 2020; being dismantled',
        ('JP', 'Fukushima Daini'): 'all four reactors being decommissioned (decided 2019)',
        ('TW', 'Chinshan'): 'shut down in 2018 and 2019; being decommissioned',
        ('TW', 'Kuosheng'): 'shut down in 2023',
        ('TW', 'Maanshan'): 'shut down in May 2025, ending nuclear power in Taiwan for now',
        ('UK', 'Dungeness B'): 'shut down in 2021; defuelling',
        ('UK', 'Hunterston B'): 'shut down in January 2022; defuelling',
        ('UK', 'Hinkley Point B'): 'shut down in August 2022; defuelling',
        ('BE', 'Doel'): 'Belgium is closing its older reactors (Doel 3 in 2022, then units 1 and 2); Doel 4 has a life extension',
        ('BE', 'Tihange'): 'Belgium is closing its older reactors (Tihange 2 in 2023, then unit 1); Tihange 3 has a life extension'}
RENAME = {'Fukushima Daina': 'Fukushima Daini', 'Asco Gr': 'Ascó', 'Cn Almaraz 1': 'Almaraz', 'Cn Cofrentes': 'Cofrentes', 'Vandellos Gr 2': 'Vandellòs',
          'Tricastin 1': 'Tricastin', 'St Alban': 'Saint-Alban', 'St Laurent': 'Saint-Laurent', 'Nogent': 'Nogent-sur-Seine',
          'Borssele Nuclear Power Station': 'Borssele', 'Doel 4': 'Doel', 'Kernkraft Gundremmingen': 'Gundremmingen'}
for h in merged:
    if h['kind'] != 'nuclear': continue
    h['name'] = RENAME.get(h['name'], h['name'])
    s = SHUT.get((h['cc'], h['name']))
    if s:
        mw = re.match(r'([\d,]+ MW( in \d+ units)?)', h['detail']); h['detail'] = (mw.group(1) + ', ' if mw else '') + s; h['status'] = 'closed' if 'shut down in' in s or 'decommission' in s else 'partly closed'
print('power station rows', len(add), '-> sites', len(merged))
fac['items'] += merged
fac['counts'] = {}
for i in fac['items']: fac['counts'][i['kind']] = fac['counts'].get(i['kind'], 0) + 1
json.dump(fac, open(fp, 'w'), ensure_ascii=False, separators=(',', ':'))
print('added', len(add), 'power stations; counts', fac['counts'], 'size', os.path.getsize(fp))
