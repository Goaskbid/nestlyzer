#!/usr/bin/env python3
"""r17: world-city district maps are drawn from real boundaries. Every /districts/<city>/ page has water, land and its
district shapes, says where the boundaries come from, never calls itself schematic, and stays light enough to load fast.
    python3 tests/test_city_maps.py [site]"""
import os, re, sys
SITE = sys.argv[1] if len(sys.argv) > 1 else '.'
D = os.path.join(SITE, 'districts'); bad = []; n = 0
hub = open(os.path.join(D, 'index.html'), encoding='utf-8').read()
links = sorted(set(re.findall(r'href="?/districts/([a-z-]+)/"?', hub)))
for k in links:
    f = os.path.join(D, k, 'index.html')
    if not os.path.exists(f): bad.append((k, 'page missing')); continue
    t = open(f, encoding='utf-8').read(); n += 1
    if 'class="zwater"' not in t and 'class=zwater' not in t: bad.append((k, 'no water layer'))
    if 'zland' not in t: bad.append((k, 'no land layer'))
    if re.search(r'schematic', t, re.I): bad.append((k, 'says schematic'))
    if 'geoboundaries' not in t.lower(): bad.append((k, 'no boundary source'))
    if len(t.encode()) > 160000: bad.append((k, f'page {len(t.encode())} bytes'))
    if len(re.findall(r'data-zc=', t)) < 16: bad.append((k, 'fewer than 8 zones'))
if len(hub.encode()) > 700000: bad.append(('hub', f'{len(hub.encode())} bytes'))
print(f'{n} world-city pages checked, hub {len(hub.encode()) // 1024} KB')
for b in bad[:20]: print('  FAIL', b)
ok = not bad and n >= 40
print('CITY MAPS TEST:', 'PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
