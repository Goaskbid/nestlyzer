#!/usr/bin/env python3
"""Swiss population periods and absorption mergers (r16, audit NZ-AUD-01 and NZ-AUD-02). Idempotent.

1. Observation years. The Swiss yearly series comes from the Eurostat GISCO LAU releases 2019 to 2024, matched by BFS
   municipality number. Each release carries the BFS permanent resident population of two years earlier (checked against
   the BFS figures: Zurich 427,721, Bern 134,506 and Kriens 28,983 are the 2022 populations and sit in LAU 2024). The
   series was labelled with the release year; it is relabelled with the observation year (release year - 2). Values do
   not change, growth rates do not change (same five-year span).
2. Absorption mergers. When a municipality joined an existing one AFTER the observation date, the latest release still
   lists both separately (the former municipality has a value for the same latest year). The successor then gets the
   additive facts of the former one: residents (and the series, year by year), land area; density is recomputed from
   the sums and the population-based scores are re-placed on the existing Swiss value-to-score scale. Shares, rates and
   tax figures are never added or averaged. A merger the latest release already contains (the former municipality's
   series ends earlier) is left alone.
Run: python3 build/fix_ch_periods.py --write     (then node build/build_global_rank.js)
"""
import json, os, sys
import numpy as np
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(R, 'data', 'c', 'CH.json')
LAG = 2
ABSORB = [  # (date, successor BFS, [former BFS]) from build/build_ch_mergers.py (absorptions only)
    ('2021-07-01', 5511, [5513]), ('2022-01-01', 2275, [661, 2259, 2260]), ('2022-01-01', 5805, [5788]),
    ('2023-01-01', 546, [536]), ('2023-01-01', 6743, [6744]), ('2023-01-01', 4139, [4133]),
    ('2024-01-01', 767, [947]), ('2024-01-01', 992, [993]), ('2024-01-01', 2465, [2456]), ('2024-01-01', 4021, [4042]),
    ('2025-01-01', 3901, [3932]), ('2025-01-01', 1065, [1057]), ('2025-01-01', 2097, [2061, 2066, 2072]),
    ('2025-01-01', 2102, [2089]), ('2025-04-06', 5073, [5064]), ('2025-04-06', 5079, [5078]),
    ('2026-01-01', 2262, [2278]), ('2026-01-01', 2525, [2520, 2529]), ('2026-01-01', 4095, [4122]),
]


def scale(raw, sc):
    pts = sorted({(float(a), float(b)) for a, b in zip(raw, sc) if a is not None and b is not None})
    xs, ys = [], []
    for x, y in pts:
        if xs and x == xs[-1]: ys[-1] = (ys[-1] + y) / 2; continue
        xs.append(x); ys.append(y)
    return np.array(xs), np.array(ys)


def main(write):
    d = json.load(open(P, encoding='utf-8'))
    fix = d.get('periodFix') or {}
    C = {k: i for i, k in enumerate(d['cols'])}
    rows, fr, fs, T = d['rows'], d['fr'], d['fs'], d['trend']
    rep = {'relabelled': 0, 'absorbed': []}
    # ---- 1. observation years
    if not fix.get('years'):
        for t in T:
            if not t: continue
            for key in ('annual_population', 'population_rank_series', 'population_growth_rank_series'):
                for e in t.get(key) or []:
                    if isinstance(e, dict) and isinstance(e.get('year'), int): e['year'] -= LAG
            if t.get('trend_source'):
                t['trend_source'] = ('BFS permanent resident population 2017-2022 (31 December), as published in the Eurostat GISCO LAU '
                                     'releases 2019-2024, matched by Swiss BFS municipality code.')
            rep['relabelled'] += 1
        fix['years'] = LAG
    # ---- 2. absorption mergers
    done = set(fix.get('absorbed') or [])
    by = {str(r[C['oid']]): i for i, r in enumerate(rows)}
    pops = [r[C['pop']] for r in rows]; dens0 = [r[C['dens']] for r in rows]
    SC = {'common_population_scale': scale(pops, fs['common_population_scale']),
          'common_density_balance': scale(dens0, fs['common_density_balance']),
          'common_low_crowding': scale(dens0, fs['common_low_crowding'])}
    if 'density_people_km2' in fr: SC['density_people_km2'] = scale(fr['density_people_km2'], fs['density_people_km2'])
    if 'population_growth_pct' in fr: SC['population_growth_pct'] = scale(fr['population_growth_pct'], fs['population_growth_pct'])
    for date, sid, prev in ABSORB:
        key = f'{date}:{sid}'
        if key in done or str(sid) not in by: continue
        si = by[str(sid)]; s = rows[si]; ts = T[si] or {}; sser = ts.get('annual_population') or []
        if not sser: continue
        last = sser[-1]['year']
        add = []
        for p in prev:
            pi = by.get(str(p))
            if pi is None: continue
            pser = (T[pi] or {}).get('annual_population') or []
            if pser and pser[-1]['year'] == last and rows[pi][C['pop']]: add.append(pi)
        if not add: done.add(key); continue
        before = (s[C['pop']], s[C['area']])
        pop = s[C['pop']] + sum(rows[i][C['pop']] for i in add)
        area = round((s[C['area']] or 0) + sum(rows[i][C['area']] or 0 for i in add), 2)
        # series: the sum for every year all of them report
        sers = [sser] + [(T[i] or {}).get('annual_population') or [] for i in add]
        yrs = sorted(set.intersection(*[{e['year'] for e in q} for q in sers]))
        comb = [{'year': y, 'population': sum(next(e['population'] for e in q if e['year'] == y) for q in sers)} for y in yrs]
        ts = dict(ts); ts['annual_population'] = comb
        byy = {e['year']: e['population'] for e in comb}
        if byy.get(last - 1): ts['population_yoy_pct'] = round((byy[last] / byy[last - 1] - 1) * 100, 2)
        if byy.get(last - 5): ts['population_5y_pct'] = round((byy[last] / byy[last - 5] - 1) * 100, 2)
        T[si] = ts
        dens = round(pop / area, 2) if area else s[C['dens']]
        s[C['pop']] = pop; s[C['area']] = area; s[C['dens']] = dens
        g = ts.get('population_5y_pct')
        for k, v in (('common_population_scale', pop), ('common_density_balance', dens), ('common_low_crowding', dens),
                     ('density_people_km2', dens), ('population_growth_pct', g)):
            if k in SC and v is not None and fs.get(k) and fs[k][si] is not None:
                xs, ys = SC[k]; fs[k][si] = round(float(np.interp(v, xs, ys)), 2)
                if k in fr and fr[k][si] is not None: fr[k][si] = round(float(v), 4)
        done.add(key)
        rep['absorbed'].append([sid, s[C['name']], [rows[i][C['name']] for i in add], before, [pop, area], last])
    fix['absorbed'] = sorted(done)
    d['periodFix'] = fix
    if write:
        json.dump(d, open(P, 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
        # search index: residents of the successors
        qp = os.path.join(R, 'data', 'search.json'); sj = json.load(open(qp, encoding='utf-8'))
        cur = {str(r[C['oid']]): r[C['pop']] for r in rows if not r[C['sup']]}
        n = 0
        for e in sj['rows']:
            if e[0] == 'CH' and len(e) < 6 and str(e[1]) in cur and e[3] != cur[str(e[1])]: e[3] = cur[str(e[1])]; n += 1
        json.dump(sj, open(qp, 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
        rep['search_updated'] = n
    print(json.dumps(rep, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main('--write' in sys.argv)
