#!/usr/bin/env python3
"""Nestlyzer 2.12.4: one supplied or downloaded official figure per new source reaches a place page (row -> area join ->
country data file -> rendered fact), the SEO sitemap index, titles and the start card order.
    python3 tests/test_v2124.py [base-url]"""
import json, os, re, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
res = []
def check(fid, ok, msg): res.append({'id': fid, 'ok': bool(ok), 'check': msg}); print(('PASS ' if ok else 'FAIL ') + fid + '  ' + msg)
CASES = [('ID', 'Semarang', 'Open unemployment rate'), ('HK', 'Sha Tin', 'income'), ('MX', 'Aguascalientes', 'Census population'), ('BR', 'Florianópolis', 'GDP per person'), ('MY', 'Johor Bahru', 'Census population')]
with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(viewport={'width': 1400, 'height': 900})
    for cc, name, needle in CASES:
        pg.goto(f'{B}/#/explore?cc={cc}&p=young_family', wait_until='load')
        pg.wait_for_function(f"window.NZ_CXENV && (function(E){{return E.SHARDS['{cc}'] && E.SHARDS['{cc}'].extra}})(NZ_CXENV())", timeout=120000)
        oid = pg.evaluate(f"(()=>{{const E=NZ_CXENV(); const r=Object.values(E.BYID).find(x=>x.country==='{cc}'&&x.name.split(' (')[0]==={json.dumps(name)}); return r&&r.id}})()")
        if not oid: check('fact-' + cc, False, f'{name} not found'); continue
        pg.goto(f'{B}/#/explore?cc={cc}&p=young_family&sel=' + oid.replace(':', '%3A'), wait_until='load')
        try: pg.wait_for_selector('#place .cxw', timeout=60000)
        except Exception: pass
        pg.evaluate("document.querySelectorAll('#place .cxw details').forEach(d=>d.open=true)")
        t = pg.inner_text('#place .cxw') if pg.query_selector('#place .cxw') else ''
        i = t.lower().find(needle.lower())
        check('fact-' + cc, i >= 0, f'{name}: "{t[i:i+110].replace(chr(10), " ") if i >= 0 else "not shown"}"')
    pg.goto(B + '/', wait_until='load'); pg.wait_for_timeout(1000)
    order = pg.evaluate("[document.querySelector('.cine-card .go').getBoundingClientRect().top, document.querySelector('.cine-card .who').getBoundingClientRect().top]")
    check('start', order[0] < order[1], 'country and start button above the profiles')
    br.close()
sm = open(os.path.join(ROOT, 'sitemap.xml')).read()
parts = re.findall(r'/(sitemap-[\w-]+\.xml)</loc>', sm); n = sum(open(os.path.join(ROOT, p)).read().count('<loc>') for p in parts)
check('sitemap', '<sitemapindex' in sm and len(parts) == 5 and n > 15000, f'sitemap index with {len(parts)} files by page type, {n} URLs')
long = []
for d, _, fs in os.walk(ROOT):
    if 'index.html' in fs and not re.search(r'/(node_modules|dist|_site|tests|src|build|vendor|assets|data|docs|tools)(/|$)', d):
        h = open(os.path.join(d, 'index.html')).read(); t = re.findall(r'<title>(.*?)</title>', h, re.S)
        if t and len(t[0].replace('&#39;', "'").replace('&amp;', '&')) > 65: long.append(t[0])
check('titles', not long, f'every page title at most 65 characters ({len(long)} longer)')
json.dump(res, open(os.path.join(ROOT, 'tests/v2124_results.json'), 'w'), indent=1)
print(f"{sum(r['ok'] for r in res)} of {len(res)} passed")
