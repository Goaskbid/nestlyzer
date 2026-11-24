#!/usr/bin/env python3
"""r19 (audit NZ9-03): one boundary vintage per Swiss place. Idempotent.

1. Series breaks. A jump of more than 15% in one year in a place of 300+ residents is a boundary change when a
   superseded municipality of the same canton has its last observation in the year before the jump and its residents
   explain the jump (within 25%). The years before the break describe another territory, so they are removed from the
   series that growth figures use; the page names the absorbed municipalities and the break year. Growth figures that
   crossed the break (yearly, 5-year, annualised, growth ranks) are dropped, never guessed.
2. Core facts follow the latest observation: when the core population still describes the old territory (Assens:
   1,075 against 1,672 in the merged series), population becomes the latest observation and the land area adds the
   absorbed municipalities' area, so the engine floor, the page and the density use one vintage.
3. Derived density factor = core population / core area for every active place (16 successors had an old figure),
   re-placed on the existing Swiss value-to-score scale. Shares, rates and tax figures are never added or averaged.
Run: python3 build/fix_ch_consistency.py --write
"""
import json, os, sys
import numpy as np
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(R, 'data', 'c', 'CH.json')


def scale(raw, sc):
    pts = sorted({(float(a), float(b)) for a, b in zip(raw, sc) if a is not None and b is not None})
    xs, ys = [], []
    for x, y in pts:
        if xs and x == xs[-1]: ys[-1] = (ys[-1] + y) / 2; continue
        xs.append(x); ys.append(y)
    return np.array(xs), np.array(ys)


def rescore(v, xy):
    xs, ys = xy
    return None if v is None or not len(xs) else round(float(np.interp(v, xs, ys)), 4)


def main(write):
    d = json.load(open(P, encoding='utf-8'))
    fix = d.setdefault('periodFix', {})
    C = {k: i for i, k in enumerate(d['cols'])}
    rows, fr, fs, T = d['rows'], d['fr'], d['fs'], d['trend']
    rep = {'breaks': [], 'core_reconciled': [], 'density_factor_fixed': []}
    by = {str(r[C['oid']]): i for i, r in enumerate(rows)}
    src = open(os.path.join(R, 'build', 'build_ch_mergers.py'), encoding='utf-8').read()
    import ast, re
    M = ast.literal_eval(re.search(r'^M = (\[.*?^\])', src, re.S | re.M).group(1))
    MERG = {str(m[1]): m[3] for m in M}
    GROW = ('population_yoy_pct', 'population_5y_pct', 'recent_annualized_pct', 'population_growth_rank_latest', 'population_growth_rank_delta')
    for i, r in enumerate(rows):
        if r[C['sup']]: continue
        t = T[i] or {}; s = t.get('annual_population') or []
        if len(s) < 2 or t.get('series_break'): continue
        for a, b in zip(s, s[1:]):
            if not a['population'] or a['population'] < 300 or b['population'] / a['population'] - 1 <= 0.15: continue
            # named only from the official merger register (build_ch_mergers.py); otherwise an unnamed boundary jump
            pick = [by[str(f)] for f in MERG.get(str(r[C['oid']]), []) if str(f) in by]
            Y = b['year']; names = [rows[j][C['name']] for j in pick]
            old_core = r[C['pop']]
            t['annual_population'] = [e for e in s if e['year'] >= Y]
            for k in ('population_rank_series', 'population_growth_rank_series'):
                if t.get(k): t[k] = [e for e in t[k] if e['year'] >= (Y + 1 if k == 'population_growth_rank_series' else Y)]
            for k in GROW:
                if k in t: t[k] = None
            t['series_break'] = {'year': Y, 'absorbed': names, 'jump_pct': round(100 * (b['population'] / a['population'] - 1), 1),
                                 'note': (f"Boundary change: {', '.join(names)} joined" if names else f"The series jumps {round(100 * (b['population'] / a['population'] - 1))}% from {a['year']} to {Y}, which points to a boundary change") + f"; figures before {Y} describe a different territory and are not compared."}
            T[i] = t
            rep['breaks'].append({'oid': r[C['oid']], 'name': r[C['name']], 'year': Y, 'absorbed': names})
            # 2. core facts on the old territory (core population equals the pre-break value)
            last = t['annual_population'][-1]['population']
            if pick and old_core and abs(old_core - last) / last > 0.005 and abs(old_core - a['population']) / a['population'] < 0.02:
                add = sum(rows[j][C['area']] or 0 for j in pick)
                r[C['pop']] = last
                if r[C['area']] and add: r[C['area']] = round(r[C['area']] + add, 2)
                rep['core_reconciled'].append({'oid': r[C['oid']], 'name': r[C['name']], 'population': [old_core, last], 'area_km2': r[C['area']]})
            break
    # 3. density from the core facts, and its scores
    dens_old = [r[C['dens']] for r in rows]
    SC = {k: scale(dens_old, fs[k]) for k in ('common_density_balance', 'common_low_crowding') if k in fs}
    if 'density_people_km2' in fr: SC['density_people_km2'] = scale(fr['density_people_km2'], fs['density_people_km2'])
    if 'common_population_scale' in fs: SC['common_population_scale'] = scale([r[C['pop']] for r in rows], fs['common_population_scale'])
    for i, r in enumerate(rows):
        if r[C['sup']]: continue
        p, a = r[C['pop']], r[C['area']]
        if not p or not a: continue
        dn = round(p / a, 2)
        if r[C['dens']] is None or abs(r[C['dens']] - dn) > 0.01 * dn:
            r[C['dens']] = dn
            for k in ('common_density_balance', 'common_low_crowding'):
                if k in SC: fs[k][i] = rescore(dn, SC[k])
        if 'density_people_km2' in fr and fr['density_people_km2'][i] is not None and abs(fr['density_people_km2'][i] - dn) > 0.01 * dn:
            rep['density_factor_fixed'].append({'oid': r[C['oid']], 'name': r[C['name']], 'was': fr['density_people_km2'][i], 'now': dn})
            fr['density_people_km2'][i] = dn; fs['density_people_km2'][i] = rescore(dn, SC['density_people_km2'])
    for e in rep['core_reconciled']:
        i = next(k for k, r in enumerate(rows) if r[C['oid']] == e['oid'])
        if 'common_population_scale' in SC: fs['common_population_scale'][i] = rescore(rows[i][C['pop']], SC['common_population_scale'])
    fix['consistency'] = 'r19'
    print(json.dumps({k: (len(v), v[:30]) for k, v in rep.items()}, ensure_ascii=False, indent=0))
    if write:
        json.dump(d, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        json.dump(rep, open(os.path.join(R, 'build', 'source', 'ch_consistency_r19.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main('--write' in sys.argv)
