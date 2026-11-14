#!/usr/bin/env python3
"""Nestlyzer 2.15.25: coats of arms appear by themselves on result cards and in the place panel (exact official code on
Wikidata, open licence on Commons, 'insignia' notice allowed). Wikimedia is mocked; no network needed.
    python3 tests/test_arms.py [base-url]"""
import sys, json, re
from playwright.sync_api import sync_playwright
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
res = []
def check(fid, ok, msg): res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + fid + '  ' + msg)
PNG = bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082')
def wd(route):
    u = route.request.url
    if 'list=search' in u:
        code = re.search(r'haswbstatement%3A[A-Z0-9]+%3D([^&]+)', u)
        body = {'query': {'search': [{'title': 'Q' + (code.group(1) if code else '1')}]}}
    elif 'wbgetentities' in u and re.search(r'ids=(Q[^&]+)', u):
        q = re.search(r'ids=(Q[^&]+)', u).group(1); code = q[1:]
        body = {'entities': {q: {'claims': {**{pp: [{'mainsnak': {'datavalue': {'value': code}}}] for pp in ['P771', 'P439', 'P374', 'P635', 'P772', 'P964', 'P382', 'P1567']}, 'P94': [{'mainsnak': {'datavalue': {'value': 'Arms ' + code + '.svg'}}}]}}}}
    else:
        body = {}
    route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
def cm(route):
    body = {'query': {'pages': {'1': {'imageinfo': [{'url': 'https://upload.wikimedia.org/a.svg', 'thumburl': 'https://upload.wikimedia.org/a.png', 'descriptionurl': 'https://commons.wikimedia.org/wiki/File:a.svg',
            'extmetadata': {'LicenseShortName': {'value': 'Public domain'}, 'Restrictions': {'value': 'insignia'}, 'Artist': {'value': 'Example'}}}]}}}}
    route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
with sync_playwright() as pw:
    br = pw.chromium.launch(); ctx = br.new_context(viewport={'width': 1400, 'height': 900})
    ctx.route('**/*wikidata.org/**', wd); ctx.route('**/commons.wikimedia.org/**', cm); ctx.route('**/upload.wikimedia.org/**', lambda r: r.fulfill(status=200, content_type='image/svg+xml', body='<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48"><rect width="40" height="48" fill="#c00"/></svg>'))
    ctx.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}")
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    for cc, p in [('DE', 'young_family'), ('CH', 'pensioner'), ('FR', 'young_family')]:
        pg.goto(B + f'/#/explore?cc={cc}&p={p}'); pg.wait_for_function("document.querySelectorAll('#results .row[data-id]').length>3", timeout=180000); 
        try: pg.wait_for_function("document.querySelectorAll('#results .nz-arms-img').length>=2", timeout=20000)
        except Exception: pass
        n = pg.evaluate("document.querySelectorAll('#results .nz-arms-img').length")
        check(f'cards-{cc}', n >= 2, f'{cc}: {n} coats of arms shown on result cards without a click')
        pg.locator('#results .row[data-id]').first.evaluate('e=>e.click()'); pg.wait_for_timeout(4000)
        m = pg.evaluate("document.querySelectorAll('#place .ids .nz-arms-img').length")
        check(f'panel-{cc}', m >= 1, f'{cc}: coat of arms shown in the place panel')
    check('errors', not errs, 'no script errors' + (': ' + errs[0][:150] if errs else ''))
    br.close()
print(f'ARMS: {sum(res)} of {len(res)} passed'); sys.exit(0 if all(res) else 1)
