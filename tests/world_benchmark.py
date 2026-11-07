#!/usr/bin/env python3
"""Nestlyzer 2.14: plausibility benchmark for the world rankings. Do the places that independent evidence associates with a
profile (build/source/benchmarks/world_reference.json, never used in a score) come out near the top on their own?
A reference place counts at the rank of the best Nestlyzer place within 25 km (its metro area), on the metro list
(one entry per 25 km area, as published). Needs build/.cache/global_full.json (NZ_BENCH=1 node build/build_global_rank.js).
    python3 tests/world_benchmark.py [full.json] [out.json]"""
import json, math, os, sys, statistics
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FULL = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'build/.cache/global_full.json')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'docs/audit/world_benchmark.json')
REF = json.load(open(os.environ.get('NZ_REF') or os.path.join(ROOT, 'build/source/benchmarks/world_reference.json')))
R = REF['radius_km']
full = json.load(open(FULL))['world']
XY = {}
for f in os.listdir(os.path.join(ROOT, 'data/c')):
    d = json.load(open(os.path.join(ROOT, 'data/c', f))); c = d['cols']; il, io = c.index('lat'), c.index('lon')
    for r in d['rows']:
        if r[il] is not None: XY[d['cc'] + ':' + str(r[0])] = (r[il], r[io])
def km(a, b):
    p1, p2 = math.radians(a[0]), math.radians(b[0]); dl = math.radians(b[1] - a[1])
    return 6371 * math.acos(min(1, max(-1, math.sin(p1) * math.sin(p2) + math.cos(p1) * math.cos(p2) * math.cos(dl))))
def metros(lst):   # one entry per 25 km area, best place first (the published list)
    kept, cells = [], {}
    for i, n, s in lst:
        p = XY.get(i)
        if not p: continue
        gx, gy = int(p[0] // 0.5), int(p[1] // 0.5)
        near = any(km(p, q) < R for dx in (-1, 0, 1) for dy in (-1, 0, 1) for q in cells.get((gx + dx, gy + dy), []))
        if near: continue
        kept.append((i, n, p)); cells.setdefault((gx, gy), []).append(p)
    return kept
PUBW = json.load(open(os.path.join(ROOT, 'data/rank/world.json')))['profiles']   # 2.15: 'in the top 100' counts on the published list
def in_pub(k, ref):
    top = (PUBW.get(k) or {}).get('top') or []; cc, oid = ref.split(':', 1)
    if oid == '*': return any(t[0].startswith(cc + ':') for t in top)
    p = XY.get(ref)
    return bool(p) and any(t[8] is not None and km(p, (t[8], t[9])) < R for t in top)
out, lines = {}, []
for k, spec in REF['profiles'].items():
    lst = full.get(k)
    if not lst: continue
    M = metros(lst); n = len(M); res = []
    for ref in spec['places']:
        cc, oid = ref.split(':', 1)
        if oid == '*':
            pos = next((j for j, m in enumerate(M) if m[0].startswith(cc + ':')), None)
        else:
            p = XY.get(ref)
            if not p: res.append({'ref': ref, 'rank': None}); continue
            pos = next((j for j, m in enumerate(M) if km(p, m[2]) < R), None)
        res.append({'ref': ref, 'rank': None if pos is None else pos + 1, 'as': None if pos is None else M[pos][1], 'published': in_pub(k, ref)})
    rk = [r['rank'] for r in res if r['rank']]
    top100 = sum(1 for r in res if r.get('published')); pct = [100 * r / n for r in rk]
    out[k] = {'metros': n, 'references': len(res), 'found_ranked': len(rk), 'in_top_100': top100, 'median_percentile': round(statistics.median(pct), 1) if pct else None, 'places': res, 'top10': [m[1] + ' ' + m[0][:2] for m in M[:10]]}
    lines.append(f"{k:20s} {top100:2d}/{len(res):2d} in the published top 100   median position: top {out[k]['median_percentile']}%  of {n}")
os.makedirs(os.path.dirname(OUT), exist_ok=True); json.dump(out, open(OUT, 'w'), ensure_ascii=False, indent=1)
print('\n'.join(lines))
