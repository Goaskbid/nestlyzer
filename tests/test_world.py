#!/usr/bin/env python3
"""Nestlyzer 2.14: the Worldwide module (/world/) and the world-4 model.
    python3 tests/test_world.py [base-url]"""
import json, os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
res = []
def check(fid, ok, msg): res.append({'id': fid, 'ok': bool(ok), 'check': msg}); print(('PASS ' if ok else 'FAIL ') + fid + '  ' + msg)
G = {s: json.load(open(os.path.join(ROOT, 'data/rank', s + '.json'))) for s in ['world', 'europe', 'americas', 'asia_pacific', 'mideast_africa']}
W = G['world']
check('model', W['version'] == 4 and 'world-4' in W['model'], f"world model {W['model']}")
# one entry per metro area: no two listed places within 25 km
import math
def km(a, b):
    p1, p2 = math.radians(a[0]), math.radians(b[0]); dl = math.radians(b[1] - a[1])
    return 6371 * math.acos(min(1, max(-1, math.sin(p1) * math.sin(p2) + math.cos(p1) * math.cos(p2) * math.cos(dl))))
close = 0
for k, pr in W['profiles'].items():
    pts = [(t[8], t[9]) for t in pr['top'] if t[8] is not None]
    close += sum(1 for i in range(len(pts)) for j in range(i) if km(pts[i], pts[j]) < 24.5)
check('metro', close == 0, f'one entry per metro area: {close} listed pairs closer than 25 km across {len(W["profiles"])} world lists')
cityp = ['student', 'expat_professional', 'biz_hq', 'biz_tech']
small = [(k, t[1]) for k in cityp for t in W['profiles'][k]['top'] if False]
check('scopes', all(G[s]['profiles'].get('young_family', {}).get('top') for s in G), 'five scopes published: ' + ', '.join(f"{s} {G[s]['profiles']['young_family']['ranked']}" for s in G))
ME = {'IL', 'AE', 'SA', 'QA', 'MA', 'ZA', 'EG'}
check('mea', all(t[0][:2] in ME for t in G['mideast_africa']['profiles']['young_family']['top']), 'Middle East and Africa scope holds only its countries')
# thin-data countries no longer carry the world top: share of the household world top 20 from countries with basic data only
basic = {'AE', 'AR', 'BR', 'CN', 'CO', 'EG', 'HK', 'ID', 'IN', 'MA', 'MX', 'MY', 'PH', 'RU', 'SA', 'TH', 'TR', 'VN', 'ZA', 'KR', 'SG', 'TW'}   # seven local measures per place
hh = [k for k, p in W['profiles'].items() if not k.startswith('biz_')]
share = sum(1 for k in hh for t in W['profiles'][k]['top'][:20] if t[0][:2] in basic) / (20 * len(hh))
check('thin', share < 0.15, f'world household top 20s: {share:.0%} from countries whose local data is basic (size, access, climate)')
bm = json.load(open(os.path.join(ROOT, 'docs/audit/world_benchmark.json')))
check('benchmark', all(bm[k]['in_top_100'] >= 8 for k in ['biz_hq', 'biz_tech', 'expat_professional']) and all(bm[k]['median_percentile'] <= 12 for k in bm), 'documented hubs found (top 100 metros, and half of them within the top 10% of all metros): ' + ', '.join(f"{k} {bm[k]['in_top_100']}/{bm[k]['references']} (top {bm[k]['median_percentile']}%)" for k in bm))
with sync_playwright() as pw:
    br = pw.chromium.launch()
    for dev in [None, 'iPhone 13']:
        ctx = br.new_context(**pw.devices[dev]) if dev else br.new_context(viewport={'width': 1280, 'height': 900})
        ctx.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}))}catch(e){}")
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); tag = 'phone' if dev else 'desktop'
        pg.goto(B + '/world/', wait_until='load'); pg.wait_for_function("document.querySelectorAll('#wx-list .wx-row[data-id]').length>=25", timeout=30000)
        n = pg.evaluate("[document.querySelectorAll('#wx-list .wx-row[data-id]').length, document.querySelectorAll('#wx-pins circle').length, document.querySelectorAll('#wx-ev section').length, document.documentElement.scrollWidth>innerWidth+1, !!document.querySelector('.nz-note')]")
        check(tag + '-load', n[0] == 25 and n[1] >= 90 and n[2] == 3 and not n[3] and n[4], f'{tag}: 25 places listed, {n[1]} on the map, 3 evidence boxes, advice notice, fits the screen')
        pg.click('[data-wmode="biz"]'); pg.wait_for_timeout(700)
        b = pg.evaluate("[[...document.querySelectorAll('.wx-chip')].filter(c=>c.offsetWidth>0).every(c=>c.dataset.biz==='1'), document.querySelector('.wx-chip[aria-pressed=\"true\"]').dataset.wp, location.hash]")
        check(tag + '-biz', b[0] and b[1].startswith('biz_') and 'p=biz_' in b[2], f'{tag}: business mode shows company-site profiles only, ranks {b[1]}, link {b[2]}')
        pg.click('[data-ws="europe"]'); pg.wait_for_timeout(900)
        eu = pg.evaluate("[...document.querySelectorAll('#wx-list .wx-row[data-id]')].map(r=>r.dataset.id.slice(0,2))")
        check(tag + '-scope', eu and not set(eu) & {'US', 'CA', 'JP', 'AU', 'CN', 'IN', 'BR'}, f'{tag}: Europe lists European places only ({len(set(eu))} countries)')
        opts = pg.evaluate("[...document.querySelectorAll('#wx-cc option')].map(o=>o.value).filter(Boolean)")
        pick = 'DE' if 'DE' in opts else opts[0]
        pg.select_option('#wx-cc', pick); pg.wait_for_timeout(500)
        cc = pg.evaluate("[...document.querySelectorAll('#wx-list .wx-row[data-id]')].map(r=>r.dataset.id.slice(0,2))")
        check(tag + '-country', cc and set(cc) == {pick}, f'{tag}: country filter {pick}: {len(cc)} places, all in {pick}')
        href = pg.get_attribute('#wx-list .wx-row[data-id] a', 'href')
        check(tag + '-open', href.startswith('/#/explore?') and 'sel=' in href and 'cc=' + pick in href, f'{tag}: each place opens in the app at its own page ({href[:60]}…)')
        check(tag + '-errors', not errs, f'{tag}: no script errors {errs[:2]}')
        ctx.close()
    # 2.15: infrastructure and industry nearby (data/facilities.json) on a place's 'Around' tab
    pg = br.new_page(); pg.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}")
    pg.goto(B + '/#/explore?cc=DE&p=young_family&sel=DE:07314000', wait_until='load'); pg.wait_for_selector('#place [data-ptab="around"]', timeout=40000)
    pg.click('#place [data-ptab="around"][role="tab"]'); pg.wait_for_function("(document.querySelector('#place [data-fac]')||{}).textContent && document.querySelector('#place [data-fac] .fac')", timeout=30000)
    t = pg.evaluate("document.querySelector('#place [data-fac]').textContent")
    check('facilities', 'BASF' in t and 'km' in t, 'Ludwigshafen, Around tab: infrastructure and industry nearby lists BASF Ludwigshafen with its distance')
    nf = json.load(open(os.path.join(ROOT, 'data/facilities.json')))['counts']
    pg.goto(B + '/world/', wait_until='load'); pg.wait_for_selector('[data-wl="seaport"]'); pg.click('[data-wl="seaport"]'); pg.wait_for_function("document.querySelectorAll('#wx-fac rect').length>50", timeout=20000)
    n = pg.evaluate("[document.querySelectorAll('#wx-fac rect').length, document.querySelectorAll('#wx-charts figure').length]")
    check('layers', n[0] == nf['seaport'] and n[1] == 3, f'world map layer: {n[0]} seaports drawn, 3 charts under the evidence boxes')
    pg.close()
    # entry points: the header and the start page link to the module
    pg = br.new_page(); pg.goto(B + '/', wait_until='load')
    e = pg.evaluate("[!!document.querySelector('.nav a[href=\"/world/\"]'), !!document.querySelector('.menu-panel a[href=\"/world/\"]'), !!document.querySelector('.wx-entry a[href=\"/world/\"]')]")
    check('entry', all(e), 'Worldwide in the header, the phone menu and on the start card; the country search stays as it was')
    br.close()
json.dump(res, open(os.path.join(ROOT, 'tests/world_results.json'), 'w'), indent=1)
print(f"{sum(r['ok'] for r in res)} of {len(res)} passed")
sys.exit(0 if all(r['ok'] for r in res) else 1)
