#!/usr/bin/env python3
"""2.15.30-r13: coats of arms from Nestlyzer's own collector. Data checks plus browser checks with Wikimedia mocked:
a place in a country that had no lookup before (Czechia) shows its coat of arms on its static page and in the app, the file
comes from /data/arms, Wikidata is not asked, Commons is asked for exactly that file, nothing external loads without consent.
    python3 tests/test_r13_arms.py [base_url]"""
import csv, gzip, io, json, os, re, sys, urllib.parse
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787'
c = {}
idx = json.load(open(os.path.join(ROOT, 'data/arms/index.json')))
c['55,000+ places in 40+ countries carry a collected coat of arms'] = sum(idx.values()) >= 55000 and len(idx) >= 40
c['all Czech, German, French, Spanish and Swiss matches present'] = idx.get('CZ', 0) >= 5700 and idx.get('DE', 0) >= 9600 and idx.get('FR', 0) >= 20000 and idx.get('ES', 0) >= 6700 and idx.get('CH', 0) >= 2150
c['no Polish or Brazilian rows (codes cannot be joined exactly)'] = 'PL' not in idx and 'BR' not in idx
size = sum(os.path.getsize(os.path.join(ROOT, 'data/arms', f)) for f in os.listdir(os.path.join(ROOT, 'data/arms')))
c['arms files stay small (under 2 MB in total, largest under 1 MB)'] = size < 2_000_000 and max(os.path.getsize(os.path.join(ROOT, 'data/arms', f)) for f in os.listdir(os.path.join(ROOT, 'data/arms'))) < 1_000_000
src = list(csv.DictReader(io.TextIOWrapper(gzip.open(os.path.join(ROOT, 'build/source/arms/arms_municipalities.csv.gz')), encoding='utf-8')))
lic = {r['arms_file']: r['licence'] for r in src}
import importlib.util
spec = importlib.util.spec_from_file_location('ai', os.path.join(ROOT, 'build/build_arms_index.py')); ai = importlib.util.module_from_spec(spec); spec.loader.exec_module(ai)
names = []
for f in os.listdir(os.path.join(ROOT, 'data/arms')):
    if f == 'index.json': continue
    d = json.load(open(os.path.join(ROOT, 'data/arms', f))); names += [ai.decode(d['p'], v) for v in d['m'].values()]
c['every stored file is in the collector export and openly licensed'] = all(n in lic and ai.LIC.match(lic[n]) and not ai.NOTFREE.search(lic[n]) for n in names)
cz = json.load(open(os.path.join(ROOT, 'data/arms/CZ.json'))); CZOID = sorted(cz['m'])[0]; CZFILE = ai.decode(cz['p'], cz['m'][CZOID])
czrow = next(r for r in json.load(open(os.path.join(ROOT, 'data/c/CZ.json')))['rows'] if str(r[0]) == CZOID)
from playwright.sync_api import sync_playwright
seen = {'wd': 0, 'files': [], 'other': []}
def cm(route):
    t = urllib.parse.parse_qs(urllib.parse.urlparse(route.request.url).query).get('titles', [''])[0]; seen['files'].append(t)
    body = {'query': {'pages': {'1': {'imageinfo': [{'url': 'https://upload.wikimedia.org/a.svg', 'thumburl': 'https://upload.wikimedia.org/a.png', 'descriptionurl': 'https://commons.wikimedia.org/wiki/' + t,
            'extmetadata': {'LicenseShortName': {'value': 'Public domain'}, 'Artist': {'value': 'Example'}}}]}}}}
    route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
def wd(route): seen['wd'] += 1; route.fulfill(status=200, content_type='application/json', body='{}')
SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="12"><rect width="10" height="12"/></svg>'
with sync_playwright() as pw:
    br = pw.chromium.launch()
    def ctx_for(consent):
        ctx = br.new_context(viewport={'width': 1400, 'height': 900})
        ctx.route('**/*wikidata.org/**', wd); ctx.route('**/commons.wikimedia.org/**', cm)
        ctx.route('**/upload.wikimedia.org/**', lambda r: r.fulfill(status=200, content_type='image/svg+xml', body=SVG))
        ctx.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1');%s}catch(e){}" % ("" if consent else "localStorage.setItem('nz:ext','false')"))
        return ctx
    ctx = ctx_for(True); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    # static page of the Czech place (only if it has a full page; otherwise the app card covers it)
    slug = None
    de = cz   # Czechia had no coat-of-arms lookup before r13
    for root, ds, fs in os.walk(os.path.join(ROOT, '_site', 'czechia')):
        if 'index.html' in fs:
            h = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
            m = re.search(r'data-sarms[^>]*data-oid="?(\d+)', h)
            if m and m.group(1) in de['m']: slug = '/' + os.path.relpath(root, os.path.join(ROOT, '_site')) + '/'; SOID = m.group(1); break
    if slug:
        pg.goto(B + slug, wait_until='load')
        try: pg.wait_for_selector('.nz-sarms img', timeout=15000)
        except Exception: pass
        st = pg.evaluate("(()=>{const s=document.querySelector('.nz-sarms');const a=s&&s.querySelector('a');return {img:!!(s&&s.querySelector('img')),title:a?a.title:''}})()")
        c['Czech static page shows its collected coat of arms with licence credit (%s)' % slug] = st['img'] and 'Public domain' in st['title'] and any(urllib.parse.quote(ai.decode(de['p'], de['m'][SOID])) in urllib.parse.quote(f) or ai.decode(de['p'], de['m'][SOID]) in f for f in seen['files'])
        c['the static page did not ask Wikidata (file came from /data/arms)'] = seen['wd'] == 0
    else:
        c['a Czech static place page with collected arms exists'] = False
    wd_before = seen['wd']
    pg.goto(B + '/#/explore?cc=CZ&p=young_family&sel=CZ:' + CZOID); pg.wait_for_selector('#place.open', timeout=120000)
    try: pg.wait_for_function("document.querySelectorAll('#place .nz-arms-img').length>0", timeout=20000)
    except Exception: pass
    c['app place card for %s shows its collected coat of arms' % czrow[1]] = pg.evaluate("document.querySelectorAll('#place .nz-arms-img').length") > 0 and any(CZFILE in f for f in seen['files'])
    ctx.close()
    seen['files'] = []
    ctx2 = ctx_for(False); p2 = ctx2.new_page(); p2.on('pageerror', lambda e: errs.append(str(e)))
    p2.goto(B + '/#/explore?cc=CZ&p=young_family&sel=CZ:' + CZOID); p2.wait_for_selector('#place.open', timeout=120000); p2.wait_for_timeout(4000)
    if slug: p2.goto(B + slug, wait_until='load'); p2.wait_for_timeout(3000)
    c['with external content refused, nothing is requested from Wikimedia'] = not seen['files'] and p2.evaluate("document.querySelectorAll('.nz-arms-img,.nz-sarms img').length") == 0
    ctx2.close(); br.close()
c['no script errors'] = not errs
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('R13 ARMS TEST:', 'PASS' if ok else 'FAIL', errs[:2]); sys.exit(0 if ok else 1)
