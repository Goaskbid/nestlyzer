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
        body = {'entities': {q: {'claims': {**{pp: [{'mainsnak': {'datavalue': {'value': code}}}] for pp in ['P771', 'P439', 'P374', 'P635', 'P772', 'P964', 'P382', 'P1567', 'P605', 'P300']}, 'P94': [{'mainsnak': {'datavalue': {'value': 'Arms ' + code + '.svg'}}}], 'P17': [{'mainsnak': {'datavalue': {'value': {'id': c}}}} for c in ('Q39', 'Q183', 'Q142')]}}}}
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
    # 2.15.30: static place pages (search landings) show the coat of arms too, with credit and licence
    sp = ctx.new_page(); sp.on('pageerror', lambda e: errs.append(str(e)))
    sp.goto(B + '/switzerland/zurich/adliswil/', wait_until='load')
    try: sp.wait_for_selector('.nz-sarms img', timeout=15000)
    except Exception: pass
    st = sp.evaluate("(()=>{const s=document.querySelector('.nz-sarms');const a=s&&s.querySelector('a');return {img:!!(s&&s.querySelector('img')),shown:!!(s&&!s.hidden),title:a?a.title:''}})()")
    check('static-page', st['img'] and st['shown'] and 'Public domain' in st['title'], 'static place page shows the coat of arms with licence credit: ' + json.dumps(st))
    # a failed lookup (rate limit) must not be remembered: the next visit tries again
    ctx2 = br.new_context(); n = {'c': 0}
    def busy(route): n['c'] += 1; route.fulfill(status=503, body='')
    ctx2.route('**/*wikidata.org/**', busy); ctx2.route('**/commons.wikimedia.org/**', busy)   # r13: collected arms ask Commons directly
    p2 = ctx2.new_page(); p2.goto(B + '/switzerland/zurich/adliswil/', wait_until='load'); p2.wait_for_timeout(5500)
    cached = p2.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('nz:arms6:')).length")
    check('no-fail-cache', cached == 0 and n['c'] >= 3, f'busy Wikimedia: {n["c"]} tries with back-off, nothing cached ({cached})')
    ctx2.close()
    # 2.15.30-r7: Wikimedia rate-limits thumbnail widths outside its standard steps (since Feb 2026). Every request must use a
    # standard width, and when a thumbnail is refused (429) the original file is loaded instead, in the app and on static pages.
    ctx3 = br.new_context(viewport={'width': 1400, 'height': 900}); seen = {'w': set(), 't429': 0}
    def cm3(route):
        m = re.search(r'iiurlwidth=(\d+)', route.request.url); seen['w'].add(int(m.group(1)) if m else 0); cm(route)
    def up3(route):
        if route.request.url.endswith('.png'): seen['t429'] += 1; route.fulfill(status=429, body='Use thumbnail steps')
        else: route.fulfill(status=200, content_type='image/svg+xml', body='<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48"><rect width="40" height="48" fill="#00c"/></svg>')
    ctx3.route('**/*wikidata.org/**', wd); ctx3.route('**/commons.wikimedia.org/**', cm3); ctx3.route('**/upload.wikimedia.org/**', up3)
    ctx3.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}")
    p3 = ctx3.new_page(); p3.on('pageerror', lambda e: errs.append(str(e)))
    p3.goto(B + '/#/explore?cc=DE&p=young_family'); p3.wait_for_function("document.querySelectorAll('#results .row[data-id]').length>3", timeout=180000)
    try: p3.wait_for_function("[...document.querySelectorAll('#results .nz-arms-img')].filter(i=>i.complete&&i.naturalWidth>0).length>=2", timeout=25000)
    except Exception: pass
    k3 = p3.evaluate("[...document.querySelectorAll('#results .nz-arms-img')].filter(i=>i.complete&&i.naturalWidth>0).length")
    s3 = ctx3.new_page(); s3.goto(B + '/switzerland/zurich/adliswil/', wait_until='load')
    try: s3.wait_for_function("(()=>{const i=document.querySelector('.nz-sarms img');return i&&i.complete&&i.naturalWidth>0})()", timeout=15000)
    except Exception: pass
    st3 = s3.evaluate("(()=>{const i=document.querySelector('.nz-sarms img');return !!(i&&i.complete&&i.naturalWidth>0)})()")
    check('thumb-steps', seen['w'] and seen['w'] <= {20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840}, f'widths requested from Commons: {sorted(seen["w"])} (standard steps only)')
    check('thumb-429-fallback', k3 >= 2 and st3 and seen['t429'] >= 1, f'thumbnails refused {seen["t429"]} times: {k3} coats of arms still shown on cards, static page shown={st3}')
    ctx3.close()
    # 2.15.30-r7: region and state arms in the place header (exact NUTS code on Wikidata, open licence on Commons)
    ctx4 = br.new_context(viewport={'width': 1400, 'height': 900}); asked = []
    def wd4(route):
        m = re.search(r'haswbstatement%3A(P605|P300)%3D([^&]+)', route.request.url)
        if m: asked.append(m.group(2))
        wd(route)
    ctx4.route('**/*wikidata.org/**', wd4); ctx4.route('**/commons.wikimedia.org/**', cm); ctx4.route('**/upload.wikimedia.org/**', lambda r: r.fulfill(status=200, content_type='image/svg+xml', body='<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48"><rect width="40" height="48" fill="#0a0"/></svg>'))
    ctx4.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}")
    p4 = ctx4.new_page(); p4.on('pageerror', lambda e: errs.append(str(e))); got = {}
    for cc, pid in [('DE', 'DE:14628110'), ('CH', 'CH:261')]:
        p4.goto(B + f'/#/explore?cc={cc}&p=young_family&sel={pid}'); p4.wait_for_selector('#place.open', timeout=120000)
        try: p4.wait_for_function("document.querySelectorAll('#place .nz-rarms-img').length>=" + ('2' if cc == 'DE' else '1'), timeout=25000)
        except Exception: pass
        p4.wait_for_timeout(1500); got[cc] = p4.evaluate("[...document.querySelectorAll('#place .nz-rarms-img')].map(i=>i.alt)")
    check('region-arms-DE', len(got['DE']) == 2 and any(a.startswith('DED') or 'DED' in a for a in asked), f'Freital: state and district arms {got["DE"]}, codes asked {sorted(set(asked))[:6]}')
    check('region-arms-CH', len(got['CH']) == 1 and 'CH040' in asked, f'Zürich: canton arms {got["CH"]}')
    ctx4.close()
    check('errors', not errs, 'no script errors' + (': ' + errs[0][:150] if errs else ''))
    br.close()
print(f'ARMS: {sum(res)} of {len(res)} passed'); sys.exit(0 if all(res) else 1)
