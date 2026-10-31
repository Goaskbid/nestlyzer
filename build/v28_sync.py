#!/usr/bin/env python3
"""Copies verified acquisition output (values.csv, sources.json, REPORT.md) from a working folder into
build/source/v28/<domain>/ as compressed, versioned inputs for build_v28.py. Usage: python3 build/v28_sync.py /path/to/v28"""
import sys, os, gzip, shutil, glob, csv
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1]
EXCLUDE_SOURCES = {'who_gho_road_deaths'}   # WHO GHO: CC BY-NC-SA 3.0 IGO
for d in sorted(glob.glob(os.path.join(src, '*', 'values.csv'))):
    dom = os.path.basename(os.path.dirname(d))
    if dom.startswith('_'):
        continue
    out = os.path.join(ROOT, 'build', 'source', 'v28', dom); os.makedirs(out, exist_ok=True)
    rows = list(csv.reader(open(d, encoding='utf-8')))
    # licences that do not allow commercial reuse (the site carries ads) are left out
    rows = [rows[0]] + [r for r in rows[1:] if r[7] not in EXCLUDE_SOURCES]
    if dom == 'world_places':
        # US values are county values and Israeli regional-council values belong to the council: mark them (shown as such)
        jm = {}
        jp = os.path.join(os.path.dirname(d), 'join_methods.csv')
        if os.path.exists(jp):
            for r in csv.DictReader(open(jp, encoding='utf-8')): jm[(r['cc'], r['oid'])] = r['join_method']
        for r in rows[1:]:
            if r[1] == 'place' and (r[0] == 'US' or 'via_regional_council' in jm.get((r[0], r[2]), '')): r[1] = 'place3'
    if dom == 'eu_regional':
        # Eurostat regional rates share names with local fields but are comparable across countries: keep them apart
        ren = {'unemployment_rate_pct': 'unemployment_rate_region_pct', 'employment_rate_20_64_pct': 'employment_rate_region_pct'}
        for r in rows[1:]: r[3] = ren.get(r[3], r[3])
    if dom == 'housing':
        # German municipal rents are an approximation from the census 100 m grid (official Kreis values are separate)
        for r in rows[1:]:
            if r[0] == 'DE' and r[1] == 'place' and r[3] == 'rent_net_m2_eur': r[3] = 'rent_net_m2_grid_eur'
    if dom == 'world2':
        for r in rows[1:]:
            if r[1] == 'place': r[1] = 'place3'      # census division / LGA / county values
    # life expectancy published for men and women only: add the plain mean (same period) as life_expectancy_years
    have = {(r[0], r[1], r[2]) for r in rows[1:] if r[3] == 'life_expectancy_years'}
    mw = {}
    for r in rows[1:]:
        if r[3] in ('life_expectancy_men_years', 'life_expectancy_women_years'): mw.setdefault((r[0], r[1], r[2], r[6]), {})[r[3]] = r
    for (cc, lv, code, per), q in mw.items():
        if len(q) == 2 and (cc, lv, code) not in have:
            a, b = q['life_expectancy_men_years'], q['life_expectancy_women_years']
            rows.append([cc, lv, code, 'life_expectancy_years', round((float(a[4]) + float(b[4])) / 2, 2), 'years (mean of men and women)', per, a[7]])
    if dom == 'central_south':
        # Portuguese values are per município (the file's places are freguesias), Polish ones per powiat
        for r in rows[1:]:
            if r[1] == 'place': r[1] = 'place3'
    with gzip.open(os.path.join(out, 'values.csv.gz'), 'wt', compresslevel=9, encoding='utf-8', newline='') as g:
        csv.writer(g).writerows(rows)
    for extra in ('sources.json', 'REPORT.md'):
        p = os.path.join(os.path.dirname(d), extra)
        if os.path.exists(p):
            shutil.copy(p, os.path.join(out, extra))
    print(dom, os.path.getsize(os.path.join(out, 'values.csv.gz')))
