#!/usr/bin/env python3
"""Compacts the context records in data/x/{CC}.json (2.10.2) so every country file stays under GitHub's 20 MB upload
advice: empty fields go, source URLs keep only the publisher's host (all the page shows), and long constant
classification notes in 'dimensions' are dropped (occupation, rooms, cohort, tenancy, sex and bands stay).
Run after build_master_context.py.    python3 build/compact_ctx.py"""
import glob, json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DROP_DIM = {'classification', 'classification_detail', 'employment_universe', 'industry_scope', 'occupation_key'}
saved = 0
for p in glob.glob(os.path.join(ROOT, 'data', 'x', '*.json')):
    raw = open(p).read(); x = json.loads(raw); cx = x.get('ctx')
    if not cx: continue
    for o in cx.get('records', []):
        for k in [k for k, v in o.items() if v in ('', None, [], {})]: o.pop(k)
        u = o.get('source_url')
        if u and '://' in u: o['source_url'] = 'https://' + u.split('://', 1)[1].split('/', 1)[0]
        d = o.get('dimensions')
        if isinstance(d, dict):
            for k in DROP_DIM & set(d): d.pop(k)
            if not d: o.pop('dimensions')
    out = json.dumps(x, separators=(',', ':'), ensure_ascii=False); saved += len(raw) - len(out)
    open(p, 'w').write(out)
print('context records compacted, saved', round(saved / 1e6, 2), 'MB')
# 2.11.2: every national figure gets its position among the countries that publish the same indicator (same unit and
# breakdown, latest period per country, at least 6 countries): o['xc'] = [share of those countries with a lower value, n]
from collections import defaultdict
def key(o): return (o.get('indicator_id'), o.get('unit'), json.dumps(o.get('dimensions') or {}, sort_keys=True))
latest = defaultdict(dict)
files = {}
for p in glob.glob(os.path.join(ROOT, 'data', 'x', '*.json')):
    x = json.load(open(p)); cx = x.get('ctx'); files[p] = x
    if not cx: continue
    cc = os.path.basename(p)[:2]
    for o in cx.get('records', []):
        if o.get('source_geo_level') not in ('country', 'country_scenario') or not isinstance(o.get('value'), (int, float)): continue
        k = key(o); b = latest[k].get(cc)
        if b is None or str(o.get('reference_period')) > str(b.get('reference_period')): latest[k][cc] = o
n_tag = 0
for k, by in latest.items():
    vals = sorted(o['value'] for o in by.values())
    if len(vals) < 6: continue
    for o in by.values():
        below = sum(v < o['value'] for v in vals); o['xc'] = [round(100 * below / (len(vals) - 1)), len(vals)]; n_tag += 1
for p, x in files.items():
    if x.get('ctx'): open(p, 'w').write(json.dumps(x, separators=(',', ':'), ensure_ascii=False))
print('national figures placed among countries:', n_tag, 'of', sum(len(b) for b in latest.values()), 'in', sum(1 for b in latest.values() if len(b) >= 6), 'indicators')
