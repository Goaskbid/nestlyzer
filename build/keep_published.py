#!/usr/bin/env python3
"""2.15.30-r11: the scheduled data refresh keeps everything that is published and only moves population forward.

The monthly check in .github/workflows/site.yml re-runs the whole data chain when Eurostat publishes a newer LAU year.
Many published figures came from reviewed one-off steps (official files collected once, duplicate fixes, retired
profiles, merger handling) that a rebuild from scratch cannot reproduce exactly. This last step of the chain therefore
restores every file under data/ from the published commit (git HEAD) and takes from the rebuild only what a population
year changes, for the countries Eurostat's update actually covered:
  residents, area, density; population scale, density balance, low crowding, 5-year growth; residents within 30 km
  (for the places whose population changed); the yearly residents series; meta.population and the "GISCO LAU <year>" labels.
If the rebuild has no newer population year, data/ ends up byte-identical to the published release.
Without git (a release replay or a local build) it does nothing.       python3 build/keep_published.py"""
import json, os, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P_FACT = ('common_population_scale', 'common_density_balance', 'common_low_crowding', 'common_population_growth_5y', 'geo_catchment_30km')
P_COLS = ('pop', 'area', 'dens')


def git(*a):
    r = subprocess.run(['git', *a], cwd=ROOT, capture_output=True, timeout=300)
    return r.stdout if r.returncode == 0 else None


def main():
    listing = git('ls-tree', '-r', '--name-only', 'HEAD', 'data')
    if listing is None or not listing.strip():
        print('keep_published: no published commit to compare with; nothing changed'); return
    head = [p for p in listing.decode().splitlines() if p]
    old_meta = json.loads(git('show', 'HEAD:data/meta.json'))
    new_meta = json.load(open(os.path.join(ROOT, 'data/meta.json'), encoding='utf-8'))
    oy, ny = (old_meta.get('population') or {}).get('year') or 0, (new_meta.get('population') or {}).get('year') or 0
    newer = ny > oy
    upd = set((new_meta.get('population') or {}).get('updated_countries') or []) if newer else set()
    restored = merged = removed = 0; moved = {}
    for rel in head:
        old = git('show', 'HEAD:' + rel)
        if old is None: continue
        path = os.path.join(ROOT, rel)
        cc = os.path.basename(rel)[:-5] if rel.startswith('data/c/') and rel.endswith('.json') else None
        if cc and cc in upd and os.path.exists(path):
            C = json.loads(old); R = json.load(open(path, encoding='utf-8'))
            ci = {k: C['cols'].index(k) for k in ('oid',) + P_COLS if k in C['cols']}
            ri = {k: R['cols'].index(k) for k in ('oid',) + P_COLS if k in R['cols']}
            rmap = {row[ri['oid']]: j for j, row in enumerate(R['rows'])}
            n = 0
            for i, row in enumerate(C['rows']):
                j = rmap.get(row[ci['oid']])
                if j is None: continue
                rr = R['rows'][j]
                if 'pop' not in ci or rr[ri['pop']] == row[ci['pop']]: continue
                for k in P_COLS:
                    if k in ci and k in ri: row[ci[k]] = rr[ri[k]]
                for part in ('fs', 'fr'):
                    for k in P_FACT:
                        a, b = (C.get(part) or {}).get(k), (R.get(part) or {}).get(k)
                        if isinstance(a, list) and isinstance(b, list) and i < len(a) and j < len(b): a[i] = b[j]
                if isinstance(C.get('trend'), list) and isinstance(R.get('trend'), list) and i < len(C['trend']) and j < len(R['trend']):
                    C['trend'][i] = R['trend'][j]
                n += 1
            moved[cc] = n; merged += 1
            open(path, 'w', encoding='utf-8').write(json.dumps(C, separators=(',', ':'), ensure_ascii=False))
            continue
        if rel == 'data/meta.json' and newer:
            M = json.loads(old); M['population'] = new_meta['population']
            t = json.dumps(M, separators=(',', ':'), ensure_ascii=False).replace('GISCO LAU %d' % oy, 'GISCO LAU %d' % ny)
            open(path, 'w', encoding='utf-8').write(t); merged += 1; continue
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if not os.path.exists(path) or open(path, 'rb').read() != old:
            open(path, 'wb').write(old); restored += 1
    # only files git would save (untracked and not ignored); build outputs that git ignores are left alone
    extra = git('ls-files', '--others', '--exclude-standard', 'data') or b''
    for rel in [p for p in extra.decode().splitlines() if p]:
        os.remove(os.path.join(ROOT, rel)); removed += 1
    print('keep_published: population year %s -> %s; %d published files restored, %d merged, %d unlisted removed; places moved forward %s'
          % (oy, ny if newer else '(no newer year)', restored, merged, removed, moved or '{}'))


if __name__ == '__main__':
    main()
