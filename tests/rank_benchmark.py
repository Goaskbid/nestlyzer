#!/usr/bin/env python3
"""Ranking benchmark: where do the reference places land? (tests/rank_refs.json)
Needs build/.cache/global_full.json (NZ_BENCH=1 node build/build_global_rank.js).
For every reference: its percentile in the ranking (100 = first, 0 = last or not ranked). Per profile: mean percentile,
share in the top 5%, and the largest share one country takes of the top 30 (concentration).
    python3 tests/rank_benchmark.py [--json out.json] [--quiet]"""
import json, os, re, sys, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = json.load(open(os.path.join(ROOT, 'tests', 'rank_refs.json')))
F = json.load(open(os.path.join(ROOT, 'build', '.cache', 'global_full.json')))


def fold(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'\(.*?\)', '', s).split(' / ')[0]
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def pos(names, ref):
    f = fold(ref); n = len(names)
    for i, nm in enumerate(names):
        g = fold(nm)
        if g == f or g.startswith(f + ' '): return (100 * (1 - i / (n - 1)) if n > 1 else 100), i + 1, n
    return None


out = {'global': {}, 'country': {}}
for sk in ('world', 'europe'):
    for prof, refs in REF['global'].items():
        L = F.get(sk, {}).get(prof)
        if not L: continue
        rows = []
        for cc, nm in refs:
            if sk == 'europe' and cc in ('US', 'CA', 'AU', 'NZ', 'JP', 'KR', 'TW', 'SG', 'HK', 'IL'): continue
            names = [x[1] for x in L if x[0].startswith(cc + ':')]
            hit = None
            for i, x in enumerate(L):
                if x[0].startswith(cc + ':') and (fold(x[1]) == fold(nm) or fold(x[1]).startswith(fold(nm) + ' ')): hit = (100 * (1 - i / (len(L) - 1)), i + 1); break
            rows.append([cc, nm, round(hit[0], 1) if hit else 0, hit[1] if hit else None])
        top30 = [x[0].split(':')[0] for x in L[:30]]
        conc = max(top30.count(c) for c in set(top30)) / 30 if top30 else 0
        mp = sum(r[2] for r in rows) / len(rows) if rows else 0
        out['global'][sk + ':' + prof] = {'mean_pct': round(mp, 1), 'top5': round(sum(r[2] >= 95 for r in rows) / len(rows) * 100) if rows else 0,
                                         'country_concentration_top30': round(conc * 100), 'ranked': len(L), 'refs': rows}
for prof, refs in REF['country'].items():
    C = F.get('country', {}).get(prof, {}); rows = []
    for cc, nm in refs:
        p = pos(C.get(cc, []), nm)
        rows.append([cc, nm, round(p[0], 1) if p else 0, p[1] if p else None, p[2] if p else len(C.get(cc, []))])
    out['country'][prof] = {'mean_pct': round(sum(r[2] for r in rows) / len(rows), 1), 'top5': round(sum(r[2] >= 95 for r in rows) / len(rows) * 100), 'refs': rows}
# external rankings (tests/rank_refs.json 'external'): published lists, with their sources
out['external'] = {}; COORD = {}
NAT = json.load(open(os.path.join(ROOT, 'data', 'national.json')))['countries']
def gpct(L, cc, nm):
    for i, x in enumerate(L):
        if x[0].startswith(cc + ':') and (fold(x[1]) == fold(nm) or fold(x[1]).startswith(fold(nm) + ' ')): return 100 * (1 - i / (len(L) - 1))
    return 0
for key, e in REF.get('external', {}).items():
    r = {'source': e['source']}
    if e['scope'] == 'national':
        sc = {cc: sum(v['cats'].get(k, 50) for k in ('jobs', 'safety', 'governance', 'focus_talent')) / 4 for cc, v in NAT.items()}
        order = sorted(sc, key=lambda c: -sc[c]); r['pct'] = round(sum(100 * (1 - order.index(c) / (len(order) - 1)) for c in e['countries'] if c in order) / len(e['countries']), 1)
    elif e['scope'].startswith('country:'):
        cc = e['scope'].split(':')[1]; r['profiles'] = {}
        for pf in e['profiles']:
            C = F.get('country', {}).get(pf, {}).get(cc, [])
            # places below the profile's minimum size are not ranked: left out, reported as coverage
            t = [x for x in (pos(C, n) for n in e['top']) if x]; b2 = [x for x in (pos(C, n) for n in e['bottom']) if x]
            mt = sum(x[0] for x in t) / len(t) if t else 0; mb = sum(x[0] for x in b2) / len(b2) if b2 else 0
            r['profiles'][pf] = {'top10_pct': round(mt, 1), 'bottom10_pct': round(mb, 1), 'separation': round(mt - mb, 1), 'ranked': '%d+%d of 20' % (len(t), len(b2)), 'top_ranks': [x[1] for x in t]}
        r['pct'] = round(sum(v['separation'] for v in r['profiles'].values()) / len(r['profiles']), 1)
    elif e.get('radius_km'):
        # region-level lists (a logistics market, not the city core): best-ranked place within the radius of the named city
        import math
        def coords(cc):
            if cc not in COORD:
                d = json.load(open(os.path.join(ROOT, 'data', 'c', cc + '.json'))); C = d['cols']
                COORD[cc] = {cc + ':' + str(r[C.index('oid')]): (r[C.index('lat')], r[C.index('lon')], r[C.index('name')]) for r in d['rows']}
            return COORD[cc]
        def km(a, b): return 6371 * 2 * math.asin(math.sqrt(math.sin(math.radians(b[0] - a[0]) / 2) ** 2 + math.cos(math.radians(a[0])) * math.cos(math.radians(b[0])) * math.sin(math.radians(b[1] - a[1]) / 2) ** 2))
        r['profiles'] = {}
        for pf in e['profiles']:
            L = F.get(e['scope'], {}).get(pf, []); vals = []
            for cc, nm in e['places']:
                cs = coords(cc); ctr = next((v for v in cs.values() if v[0] is not None and (fold(v[2]) == fold(nm) or fold(v[2]).startswith(fold(nm) + ' '))), None)
                best = 0
                if ctr:
                    for i, x in enumerate(L):
                        v = cs.get(x[0]) if x[0].startswith(cc + ':') else None
                        if v and v[0] is not None and km(ctr, v) <= e['radius_km']: best = 100 * (1 - i / (len(L) - 1)); break
                vals.append(best)
            r['profiles'][pf] = round(sum(vals) / len(vals), 1)
        r['pct'] = round(sum(r['profiles'].values()) / len(r['profiles']), 1)
    else:
        r['profiles'] = {pf: round(sum(gpct(F.get(e['scope'], {}).get(pf, []), cc, nm) for cc, nm in e['places']) / len(e['places']), 1) for pf in e['profiles']}
        r['pct'] = round(sum(r['profiles'].values()) / len(r['profiles']), 1)
    out['external'][key] = r
g = [v['mean_pct'] for v in out['global'].values()]; c = [v['mean_pct'] for v in out['country'].values()]
out['summary'] = {'global_mean_pct': round(sum(g) / len(g), 1) if g else 0, 'country_business_mean_pct': round(sum(c) / len(c), 1) if c else 0,
                  'global_top5_share': round(sum(v['top5'] for v in out['global'].values()) / len(g)) if g else 0,
                  'max_country_concentration': max((v['country_concentration_top30'] for v in out['global'].values()), default=0),
                  'external': {k: v['pct'] for k, v in out['external'].items()}}
if '--json' in sys.argv: json.dump(out, open(sys.argv[sys.argv.index('--json') + 1], 'w'), indent=1, ensure_ascii=False)
if '--quiet' not in sys.argv:
    for k, v in out['global'].items(): print('%-30s mean %5.1f  top5%% %3d  concentration %3d%%  misses %s' % (k, v['mean_pct'], v['top5'], v['country_concentration_top30'], [r[0] + ' ' + r[1] for r in v['refs'] if r[3] is None]))
    for k, v in out['country'].items(): print('%-30s mean %5.1f  top5%% %3d  low: %s' % ('country:' + k, v['mean_pct'], v['top5'], [(r[0] + ' ' + r[1], r[2]) for r in v['refs'] if r[2] < 80]))
    for k, v in out['external'].items(): print('external %-26s %5.1f  %s' % (k, v['pct'], json.dumps(v.get('profiles', ''), ensure_ascii=False)))
print('SUMMARY', json.dumps(out['summary']))
