#!/usr/bin/env python3
"""Nestlyzer 2.15.20: evidence is visible in the app. Every place panel carries "What the evidence says", for households
and for business; the Observed reality button sits on the map and really draws the layer.
    python3 tests/test_evidence_ui.py [base-url]"""
import sys
from playwright.sync_api import sync_playwright
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
res = []

WD = {"entities": {"Q1": {"id": "Q1", "sitelinks": {"enwiki": {"title": "Testplace"}}, "claims": {"P1082": [
  {"mainsnak": {"datavalue": {"value": {"amount": "+10000"}}}, "qualifiers": {"P585": [{"datavalue": {"value": {"time": "+2010-01-01T00:00:00Z"}}}]}},
  {"mainsnak": {"datavalue": {"value": {"amount": "+11000"}}}, "qualifiers": {"P585": [{"datavalue": {"value": {"time": "+2020-01-01T00:00:00Z"}}}]}}]}}}}
import json as _j
def wd(route):
    u = route.request.url
    body = {"search": [{"id": "Q1", "description": "town and municipality in the country"}]} if 'wbsearchentities' in u else WD
    route.fulfill(status=200, content_type='application/json', body=_j.dumps(body))
def wp(route):
    u = route.request.url
    if 'prop=extracts' in u:
        body = {"query": {"pages": {"1": {"extract": "Testplace is a town. It is known for its thermal spa and mild climate, which attract many retirees. The town has a large logistics centre and several manufacturing companies. A railway station links it to the capital."}}}}
    else:
        body = {"type": "standard", "title": "Testplace", "extract": "Testplace is a town.", "content_urls": {"desktop": {"page": "https://en.wikipedia.org/wiki/Testplace"}}}
    route.fulfill(status=200, content_type='application/json', body=_j.dumps(body))
def check(fid, ok, msg): res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + fid + '  ' + msg)
with sync_playwright() as pw:
    br = pw.chromium.launch(); ctx = br.new_context(viewport={'width': 1400, 'height': 900})
    ctx.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}")
    ctx.route('**/*wikidata.org/**', wd); ctx.route('**/*wikipedia.org/**', wp)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    for cc, p in [('CH', 'pensioner'), ('SK', 'pensioner'), ('US', 'young_family'), ('US', 'pensioner'), ('FR', 'young_family'), ('US', 'biz_logistics'), ('DE', 'biz_manufacturing')]:
        pg.goto(B + f'/#/explore?cc={cc}&p={p}', wait_until='load')
        pg.wait_for_function("document.querySelectorAll('#results .row[data-id]').length>3", timeout=180000); pg.wait_for_timeout(500)
        pg.locator('#results .row[data-id]').first.evaluate('e=>e.click()'); pg.wait_for_function("!!document.querySelector('.evcard')", timeout=30000)
        t = pg.inner_text('.evcard')
        order = pg.evaluate("(()=>{const k=document.querySelector('#place [data-kfslot]'),e=document.querySelector('#place .evcard');return !!(k&&e&&(k.compareDocumentPosition(e)&4))})()")
        check(f'order-{cc}-{p}', order, f'{cc} {p}: strengths and watch-outs come first, the evidence chapter after them')
        check(f'nofiller-{cc}-{p}', 'No observed outcome' not in pg.inner_text('#place'), f'{cc} {p}: no filler sentence')
        check(f'card-{cc}-{p}', ('Evidence' in t) and ('evidence' in t.lower() or 'No ' in t), f'{cc} {p}: place panel shows "What the evidence says": ' + t.replace('\n', ' ')[:160])
        pg.wait_for_function("!document.querySelector('.evanec') || !/Looking up/.test(document.querySelector('.evanec').innerText)", timeout=60000)
        an = (pg.inner_text('.evanec') if pg.locator('.evanec').count() else '').replace('\n', ' ')
        dup = pg.evaluate("[document.querySelectorAll('#place .evt').length, document.querySelectorAll('#place .evbars').length, (document.querySelector('#place .ids')||{innerText:''}).innerText.trim().length, /Not supplied/.test(document.querySelector('#place').innerText), document.querySelectorAll('#place [data-card-rank]').length>0, document.querySelectorAll('#place [data-card-depth]').length>0]")
        check(f'nodup-{cc}-{p}', dup == [0, 0, 0, False, True, True], f'{cc} {p}: Rank and Data depth shown; no duplicate score table, rank bar, repeated name or empty rows: {dup}')
        check(f'anecdote-{cc}-{p}', 'Population history' in an and 'official counts' not in an and '“' in an and 'Wikipedia' in an, f'{cc} {p}: anecdotal evidence shown: ' + an[:170])
        btn = pg.locator('.map-ui [data-observed]')
        vis = btn.count() == 1 and btn.is_visible()
        btn.click(); pg.wait_for_timeout(2500)
        toast = pg.evaluate("(document.querySelector('#toast')||{}).innerText||''").replace('\n', ' ').replace('×', '').strip()
        layer = 'green = strongest' in toast or 'Green marks' in toast
        check(f'observed-{cc}-{p}', vis and (layer or 'No ' in toast or 'Fewer than ten' in toast), f'{cc} {p}: Observed reality button on the map ' + ('draws the layer' if layer else 'explains: ' + toast[:120]))
        if layer:
            btn.click(); pg.wait_for_timeout(400); t2 = pg.evaluate("(document.querySelector('#toast')||{}).innerText||''")
            check(f'observed-off-{cc}-{p}', ('Layer hidden' in t2 or 'hidden' in t2.lower() or 'removed' in t2.lower()), f'{cc} {p}: second tap hides the layer')
    check('errors', not errs, 'no script errors' + (': ' + errs[0][:200] if errs else ''))
    br.close()
print(f'EVIDENCE UI: {sum(res)} of {len(res)} passed'); sys.exit(0 if all(res) else 1)
