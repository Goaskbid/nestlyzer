#!/usr/bin/env python3
"""r21 (audit NZ11-11): density is the shown population divided by the shown area. Records (twelve in Austria, a few
elsewhere) carried a density from another population year; they now use the population and area the page shows, so all
three agree. The earlier value is kept in each country file under densFix. Idempotent.
Run: python3 build/fix_density_r21.py --write"""
import glob, json, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); left_all = 0
for P in sorted(glob.glob(os.path.join(R, 'data', 'c', '*.json'))):
    d = json.load(open(P, encoding='utf-8'))
    if 'dens' not in d.get('cols', []): continue
    C = {k: i for i, k in enumerate(d['cols'])}; fix = d.get('densFix', {}); ch = 0
    gap = lambda r: r[C['pop']] and r[C['area']] and r[C['dens']] and r[C['pop']] >= 200 and abs(r[C['dens']] - r[C['pop']] / r[C['area']]) / (r[C['pop']] / r[C['area']]) > 0.05
    for r in d['rows']:
        if gap(r) or (str(r[C['oid']]) in fix and r[C['dens']] != (lambda x: round(x, 2 if x >= 10 else 4))(r[C['pop']] / r[C['area']])):
            fix.setdefault(str(r[C['oid']]), {'name': r[C['name']], 'previous_density': r[C['dens']], 'population': r[C['pop']], 'area_km2': r[C['area']]})
            ch += 1; r[C['dens']] = (lambda x: round(x, 2 if x >= 10 else 4))(r[C['pop']] / r[C['area']])
    if fix: d['densFix'] = fix
    left = sum(1 for r in d['rows'] if gap(r)); left_all += left
    if fix: print(os.path.basename(P), 'reconciled:', len(fix), '| still more than 5% apart:', left)
    if '--write' in sys.argv and ch: json.dump(d, open(P, 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
sys.exit(1 if left_all else 0)
