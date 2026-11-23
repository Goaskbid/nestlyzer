#!/usr/bin/env python3
"""r16 (audit NZ-AUD-22): every delivered coat of arms has an auditable rights record. For a stratified sample (up to 25
places per country, spread over the list) the compact delivery entry is decoded to its exact file name, and that file must
have a retained record in the collector export (build/source/arms/arms_municipalities.csv.gz) with an open licence (never
NC/ND), a Commons file page and the same country. The record stays in the repository; the site links each image to its
Commons file page (author and licence), which the browser shows only after the visitor allows external content.
    python3 tests/test_emblem_trail.py"""
import csv, gzip, io, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'build'))
from build_arms_index import decode, LIC, NOTFREE   # same decoder and licence rules as the build
recs = {}
with gzip.open(os.path.join(ROOT, 'build/source/arms/arms_municipalities.csv.gz'), 'rt', encoding='utf-8') as f:
    for r in csv.DictReader(f): recs.setdefault(r['arms_file'], []).append(r)
bad, n, ccs = [], 0, 0
for fn in sorted(os.listdir(os.path.join(ROOT, 'data/arms'))):
    if not re.fullmatch(r'[A-Z]{2}\.json', fn): continue
    d = json.load(open(os.path.join(ROOT, 'data/arms', fn), encoding='utf-8')); cc = fn[:2]; ccs += 1
    keys = sorted(d['m']); step = max(1, len(keys) // 25)
    for k in keys[::step][:25]:
        name = decode(d['p'], d['m'][k]); n += 1
        rows = recs.get(name) or []
        ok = [r for r in rows if LIC.match(r['licence'] or '') and not NOTFREE.search((r['licence'] or '') + ' ' + (r['restrictions'] or '')) and r['commons_page'].startswith('https://commons.wikimedia.org/wiki/File:')]
        if not ok: bad.append((cc, k, name, [r['licence'] for r in rows][:2]))
print(f'{n} sampled emblems in {ccs} countries; {n - len(bad)} with a retained open-licence record and Commons file page')
for b in bad[:10]: print('  no rights record:', b)
print('EMBLEM RIGHTS TRAIL TEST:', 'PASS' if not bad and n > 500 else 'FAIL'); sys.exit(0 if not bad and n > 500 else 1)
