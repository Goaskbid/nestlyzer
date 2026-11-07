#!/usr/bin/env python3
"""Nestlyzer 2.14 (owner audit A1): the comparison upgrade runs inside the real app.
Normal compare -> /assets/nzx.js requested -> answers with source, level and year -> reference place -> linked chart ->
a profile change makes open answers stale -> with the module blocked, the native comparison stays complete.
    python3 tests/test_compare_upgrade.py [base-url]"""
import json, os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
res = []
def check(fid, ok, msg): res.append({'id': fid, 'ok': bool(ok), 'check': msg}); print(('PASS ' if ok else 'FAIL ') + fid + '  ' + msg)
INIT = "try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}"
URL = B + '/#/explore?cc=CH&p=young_family&cmp=CH:261,CH:6621,CH:1711'
with sync_playwright() as pw:
    br = pw.chromium.launch()
    for dev in [None, 'iPhone 13']:
        tag = 'phone' if dev else 'desktop'
        ctx = br.new_context(**pw.devices[dev]) if dev else br.new_context(viewport={'width': 1280, 'height': 900}); ctx.add_init_script(INIT)
        pg = ctx.new_page(); errs, reqs = [], []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('requestfinished', lambda r: reqs.append(r.url))
        pg.goto(URL, wait_until='load'); pg.wait_for_selector('#modal .cx', timeout=60000)
        st = pg.evaluate("[!!document.querySelector('#modal table.cmp'), !!document.querySelector('#modal .nz-note'), document.querySelectorAll('#cx-m option').length, document.documentElement.scrollWidth>innerWidth+1]")
        check(tag + '-mount', any('/assets/nzx.js' in u for u in reqs) and st[0] and st[1] and st[2] >= 5 and not st[3], f'{tag}: the native comparison requests /assets/nzx.js and mounts it below its table ({st[2]} measures, notice shown, fits the screen)')
        pg.click('#modal [data-cxq="lowest"]'); pg.wait_for_timeout(200)
        a = pg.evaluate("[document.querySelector('#cx-ans p').textContent, document.querySelectorAll('#cx-ans .cx-src li').length, document.querySelectorAll('#cx-ans .cx-src a[href^=\"http\"]').length]")
        check(tag + '-answer', ('lowest' in a[0] or 'separately' in a[0]) and a[1] == 3 and a[2] >= 2, f'{tag}: question answered from stored values, each with source link, level and year: "{a[0][:90]}…"')
        pg.click('#modal .cx-ref [data-cxref="CH:1711"]'); pg.wait_for_timeout(300)
        d = pg.evaluate("[document.querySelector('#cx-ans p').textContent, document.querySelector('.cx-ref [aria-pressed=\"true\"]').dataset.cxref, document.querySelectorAll('#cx-plot .cx-hit').length, document.querySelectorAll('#cx-plot .cx-dot').length, !!document.querySelector('#cx-plot .cx-hit.ref[data-cxref=\"CH:1711\"]')]")
        check(tag + '-reference', 'versus Zug' in d[0] and d[1] == 'CH:1711' and d[4], f'{tag}: explicit reference place (Zug): differences stated against it, and it is marked in the chart')
        check(tag + '-chart', d[2] == 3 and d[3] > 100, f'{tag}: linked chart: the 3 compared places highlighted among {d[3]} ranked places')
        pg.evaluate("document.querySelector('#cx-plot .cx-hit[data-cxref=\"CH:261\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))"); pg.wait_for_timeout(300)
        ln = pg.evaluate("document.querySelector('.cx-ref [aria-pressed=\"true\"]').dataset.cxref")
        check(tag + '-linked', ln == 'CH:261', f'{tag}: clicking a place in the chart makes it the reference in the controls ({ln})')
        # stale: the profile changes while the window is open
        pg.evaluate("location.hash='#/explore?cc=CH&p=pensioner'"); pg.wait_for_timeout(1500)
        pg.evaluate("var b=document.querySelector('#modal [data-cxq=\"lowest\"]'); if(b && !b.disabled) b.click()"); pg.wait_for_timeout(200)
        sv = pg.evaluate("(()=>{const a=document.querySelector('#cx-ans');return !a||/changed/.test(a.textContent)||!document.querySelector('#modal .cx')})()")
        check(tag + '-stale', sv, f'{tag}: after a profile change the open answers do not pretend to be current')
        check(tag + '-errors', not errs, f'{tag}: no script errors {errs[:2]}')
        ctx.close()
    # failure: the upgrade cannot load, the native comparison stays complete
    ctx = br.new_context(viewport={'width': 1280, 'height': 900}); ctx.add_init_script(INIT); ctx.route('**/assets/nzx.js*', lambda r: r.abort())
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until='load'); pg.wait_for_selector('#modal table.cmp', timeout=60000); pg.wait_for_timeout(1500)
    f = pg.evaluate("[document.querySelectorAll('#modal table.cmp tbody tr').length, !!document.querySelector('#modal .cx')]")
    check('fallback', f[0] > 5 and not f[1] and not errs, f'module blocked: native comparison complete ({f[0]} rows), no upgrade section, no script error')
    br.close()
json.dump(res, open(os.path.join(ROOT, 'tests/compare_upgrade_results.json'), 'w'), indent=1)
print(f"{sum(r['ok'] for r in res)} of {len(res)} passed")
sys.exit(0 if all(r['ok'] for r in res) else 1)
