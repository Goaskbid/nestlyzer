#!/usr/bin/env python3
"""Swiss population refresh (2.13.2, owner decision 2 Nov 2026: rebuild on the latest year).

The Swiss core rows carried the 2021 population while the yearly series in the same file (Eurostat GISCO LAU, matched by
BFS municipality code) runs to 2024. This step moves every Swiss place to the latest year of its own series and rebuilds
everything that is computed from population, with the same rules the data build uses:
  * residents and density (residents / area);
  * the population-based factors (population scale, density balance, low crowding, density per km²): new value placed on
    the existing Swiss value-to-score scale, as build/lau_update.py does for other countries;
  * residents within 30 km for every place (in any country) within 30 km of a changed Swiss place, re-scored with the
    data build's fixed log scale;
  * safety rules from lau_update.py: a place whose population jumps by more than 50% keeps its figures (boundary change).
Writes a report to docs/audit/ch_population_refresh.json and marks meta.population so the legacy fixture test knows the
population is no longer the 2021 snapshot.        python3 build/refresh_ch_population.py"""
import glob, json, math, os
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'data', 'c', 'CH.json')
d = json.load(open(P, encoding='utf-8'))
c = d['cols']; I = {k: c.index(k) for k in ('oid', 'name', 'pop', 'area', 'dens', 'lat', 'lon')}
rows, fr, fs, tr = d['rows'], d['fr'], d['fs'], d['trend']


def scale(raw, sc):
    pts = sorted({(float(a), float(b)) for a, b in zip(raw, sc) if a is not None and b is not None})
    xs, ys = [], []
    for x, y in pts:
        if xs and x == xs[-1]: ys[-1] = (ys[-1] + y) / 2; continue
        xs.append(x); ys.append(y)
    return np.array(xs), np.array(ys)


old_pop = [r[I['pop']] for r in rows]; old_dens = [r[I['dens']] for r in rows]
SC = {'common_population_scale': scale(old_pop, fs['common_population_scale']), 'common_density_balance': scale(old_dens, fs['common_density_balance']),
      'common_low_crowding': scale(old_dens, fs['common_low_crowding'])}
if 'density_people_km2' in fr: SC['density_people_km2'] = scale(fr['density_people_km2'], fs['density_people_km2'])
rep = {'year': None, 'changed': 0, 'kept_jump': 0, 'unchanged': 0, 'no_series': 0, 'total_before': 0, 'total_after': 0, 'places': []}
deltas = []
for i, r in enumerate(rows):
    t = tr[i] or {}; ap = t.get('annual_population') or []
    if not ap: rep['no_series'] += 1; continue
    last = ap[-1]; new, old = int(last['population']), int(r[I['pop']] or 0)
    rep['year'] = max(rep['year'] or 0, last['year']); rep['total_before'] += old
    if new == old: rep['unchanged'] += 1; rep['total_after'] += old; continue
    if old > 500 and abs(new / old - 1) > 0.5: rep['kept_jump'] += 1; rep['total_after'] += old; continue
    area = r[I['area']]; dens = new / area if area else r[I['dens']]
    r[I['pop']] = new; r[I['dens']] = round(dens, 2)
    for k, v in (('common_population_scale', new), ('common_density_balance', dens), ('common_low_crowding', dens), ('density_people_km2', dens)):
        if k in SC and fs.get(k) and fs[k][i] is not None:
            xs, ys = SC[k]; fs[k][i] = round(float(np.interp(v, xs, ys)), 2)
            if k in fr and fr[k][i] is not None: fr[k][i] = round(v, 4)
    rep['changed'] += 1; rep['total_after'] += new
    rep['places'].append([r[I['oid']], r[I['name']], old, new, last['year']])
    deltas.append((r[I['lat']], r[I['lon']], new - old))

# residents within 30 km: add the change of every Swiss place to all places whose centre lies within 30 km
def hav(a, b, c2, d2):
    p = math.pi / 180; x = math.sin((c2 - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c2 * p) * math.sin((d2 - b) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(x))
def catch_score(cv): return round(max(0, min(100, 100 * (math.log10(max(cv, 1)) - math.log10(20000)) / (math.log10(3e6) - math.log10(20000)))), 2)
if deltas:
    la0, la1 = min(x[0] for x in deltas) - 0.3, max(x[0] for x in deltas) + 0.3; lo0, lo1 = min(x[1] for x in deltas) - 0.45, max(x[1] for x in deltas) + 0.45
    touched = {}
    for f in sorted(glob.glob(os.path.join(ROOT, 'data', 'c', '*.json'))):
        cc = os.path.basename(f)[:-5]
        dd = d if cc == 'CH' else json.load(open(f, encoding='utf-8'))
        cc_cols = dd['cols']; la, lo = cc_cols.index('lat'), cc_cols.index('lon')
        col_r, col_s = dd['fr'].get('geo_catchment_30km'), dd['fs'].get('geo_catchment_30km')
        if not col_r: continue
        n = 0
        for j, rr in enumerate(dd['rows']):
            y, x = rr[la], rr[lo]
            if y is None or not (la0 <= y <= la1 and lo0 <= x <= lo1) or col_r[j] is None: continue
            add = sum(dp for (a, b, dp) in deltas if abs(a - y) < 0.3 and abs(b - x) < 0.45 and hav(a, b, y, x) <= 30)
            if not add: continue
            col_r[j] = round(col_r[j] + add, -2); n += 1
            if col_s and col_s[j] is not None: col_s[j] = catch_score(col_r[j])
        if n:
            touched[cc] = n
            if cc != 'CH': open(f, 'w', encoding='utf-8').write(json.dumps(dd, separators=(',', ':'), ensure_ascii=False))
    rep['catchment_places_updated'] = touched
json.dump(d, open(P, 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
mp = os.path.join(ROOT, 'data', 'meta.json'); m = json.load(open(mp, encoding='utf-8'))
pop = m.get('population') or {}
pop.update({'updated_countries': sorted(set((pop.get('updated_countries') or []) + ['CH'])), 'year': rep['year'], 'ch_refresh': {k: v for k, v in rep.items() if k != 'places'}})
m['population'] = pop
for c2 in m['countries']:
    if c2['cc'] == 'CH': c2['pop'] = sum(r[I['pop']] or 0 for r in rows if not r[c.index('sup')])
json.dump(m, open(mp, 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
os.makedirs(os.path.join(ROOT, 'docs', 'audit'), exist_ok=True)
json.dump(rep, open(os.path.join(ROOT, 'docs', 'audit', 'ch_population_refresh.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(json.dumps({k: v for k, v in rep.items() if k != 'places'}))
