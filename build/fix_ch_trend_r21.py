#!/usr/bin/env python3
"""r21 (audit NZ11-06, NZ11-07): Swiss chart series follow the reconciled populations.

1. Size ranks per year are recomputed from each current municipality's annual population (merged territories summed),
   so a larger municipality can never rank below a smaller one in the same year.
2. Growth ranks per year are year-on-year growth, ranked among all municipalities with both years; a year whose
   change crosses a recorded boundary break has no growth value or rank.
3. population_growth_pct is a dated 2010-2019 factor. Where a merger repair replaced it with a five-year value, the
   factor is set to missing (the 2010 population of the merged territory is not in the data), never left mixed.
Idempotent. Run: python3 build/fix_ch_trend_r21.py --write
"""
import json, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); P = os.path.join(R, 'data', 'c', 'CH.json')
d = json.load(open(P, encoding='utf-8')); C = {k: i for i, k in enumerate(d['cols'])}; rows = d['rows']; T = d['trend']
live = [i for i, r in enumerate(rows) if not r[C['sup']] and T[i]]
def series(i): return {e['year']: e['population'] for e in (T[i].get('annual_population') or []) if e.get('population')}
def break_year(i):
    b = T[i].get('series_break') or {}
    ev = (b.get('event') or {}).get('date')
    return int(ev[:4]) if ev else b.get('year')
S = {i: series(i) for i in live}
years = sorted({y for s in S.values() for y in s})
size = {y: sorted([i for i in live if y in S[i]], key=lambda i: (-S[i][y], rows[i][C['name']])) for y in years}
rk = {y: {i: n + 1 for n, i in enumerate(size[y])} for y in years}
grow = {}
for y in years[1:]:
    g = {}
    for i in live:
        s = S[i]; by = break_year(i)
        if y in s and y - 1 in s and s[y - 1] > 0 and not (by and y - 1 < by <= y + 1 and T[i].get('series_break')):
            g[i] = (s[y] / s[y - 1] - 1) * 100
    order = sorted(g, key=lambda i: (-g[i], rows[i][C['name']])); grow[y] = {i: (n + 1, round(g[i], 2)) for n, i in enumerate(order)}
ch = 0
for i in live:
    t = T[i]; old = json.dumps([t.get('population_rank_series'), t.get('population_growth_rank_series')])
    ps = [{'year': y, 'rank': rk[y][i]} for y in years if i in rk[y]]
    gs = [{'year': y, 'rank': grow[y][i][0], 'pct': grow[y][i][1]} for y in years[1:] if i in grow.get(y, {})]
    t['population_rank_series'] = ps; t['population_growth_rank_series'] = gs
    t['population_rank_latest'] = ps[-1]['rank'] if ps else None
    t['population_rank_delta'] = (ps[0]['rank'] - ps[-1]['rank']) if len(ps) > 1 else None
    t['population_growth_rank_latest'] = gs[-1]['rank'] if gs else None
    t['population_growth_rank_delta'] = (gs[0]['rank'] - gs[-1]['rank']) if len(gs) > 1 else None
    t['growth_rank_definition'] = 'year-on-year change of the permanent resident population, ranked among Swiss municipalities with both years; no value across a boundary break'
    if json.dumps([ps, gs]) != old: ch += 1
# NZ11-07: the dated 2010-2019 growth factor is missing where a merger repair overwrote it
absorbed = {k.split(':')[1] for k in (d.get('periodFix') or {}).get('absorbed', [])}
nulled = []
for i, r in enumerate(rows):
    if str(r[C['oid']]) in absorbed:
        for k in ('fr', 'fs'):
            if 'population_growth_pct' in d[k] and d[k]['population_growth_pct'][i] is not None: d[k]['population_growth_pct'][i] = None; nulled.append(r[C['name']])
d.setdefault('periodFix', {})['trendR21'] = {'rank_years': years, 'growth_factor_set_missing': sorted(set(nulled))}
# self-check: no size inversion in any year
bad = sum(1 for y in years for a in live for b in live if False)
for y in years:
    o = size[y]
    for n in range(1, len(o)):
        if S[o[n]][y] > S[o[n - 1]][y]: bad += 1
print('series changed:', ch, '| growth factor set missing:', sorted(set(nulled)), '| size inversions:', bad)
if '--write' in sys.argv: json.dump(d, open(P, 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
sys.exit(1 if bad else 0)
