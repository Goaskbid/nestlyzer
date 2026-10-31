#!/usr/bin/env python3
"""The flat upload folder (what nestlyzer.com serves): cross-country rankings and line icons load from their own
nzdata-*.json files, with no script errors.   python3 tests/test_flat.py [site-dir]   (default dist/site)"""
import os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'site')
srv = subprocess.Popen(['node', os.path.join(ROOT, 'tests', 'serve.mjs'), SITE, '8811'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
B = 'http://localhost:8811'; res = []
def check(ok, msg): res.append(ok); print(('PASS ' if ok else 'FAIL ') + msg)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); c = b.new_context(viewport={'width': 1400, 'height': 950})
        c.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:Date.now()}));localStorage.setItem('nz:toured','1')}catch(e){}")
        pg = c.new_page(); errs = []; reqs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('requestfinished', lambda r: reqs.append(r.url))
        pg.goto(B + '/#/explore?cc=DE&p=young_family&g=europe', wait_until='load')
        pg.wait_for_selector('#results .grank .row', timeout=120000)
        n = pg.evaluate("document.querySelectorAll('#results .grank .row').length")
        check(n >= 50 and any('nzdata-rank-europe.json' in u for u in reqs), f'European ranking loads from nzdata-rank-europe.json (one file per region since 2.11): {n} places')
        sel = pg.evaluate("document.querySelector('#results .grank .row').dataset.gopen")
        pg.goto(B + '/#/explore?cc=CH&p=young_family', wait_until='load'); pg.wait_for_function("window.NZ&&NZ.res&&NZ.res.scored.length>0", timeout=120000)
        s = pg.evaluate('NZ.res.scored[0].id'); pg.goto(f'{B}/#/explore?cc=CH&p=young_family&sel={s}', wait_until='load')
        pg.wait_for_selector('#place .ei svg', timeout=120000)
        check(any('nzdata-icons.json' in u for u in reqs), 'line icons load from nzdata-icons.json and are drawn on the place page')
        import urllib.request
        files = [f for f in os.listdir(SITE) if f.startswith('nzdata-audit-') or f.startswith('nzdata-downloads-')]
        bad = [f for f in files if urllib.request.urlopen(B + '/' + f).status != 200]
        check(len(files) >= 10 and not bad, f'Method page downloads are served: {len(files)} files, failing {bad}')
        check(not errs, f'no script errors {errs[:2]}')
        b.close()
finally:
    srv.terminate()
print(f'\nFLAT: {sum(res)} of {len(res)} passed'); sys.exit(0 if all(res) else 1)
