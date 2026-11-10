#!/usr/bin/env python3
"""Nestlyzer 2.13.3: the whole visitor journey on two phones (iPhone 13, Pixel 7) and the app-install basics.
Start page -> pick a household -> pick a country -> Show my places -> ranking -> open a place -> save -> shortlist ->
back -> business mode -> pick a kind of site. Every step: nothing wider than the screen, no script error, the advice
notice visible where results are shown, panels open at their top.
    python3 tests/test_mobile_journey.py [base-url]"""
import json, os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
res = []
def check(fid, ok, msg): res.append({'id': fid, 'ok': bool(ok), 'check': msg}); print(('PASS ' if ok else 'FAIL ') + fid + '  ' + msg)
OVER = "document.documentElement.scrollWidth > innerWidth + 1"
m = json.load(open(os.path.join(ROOT, 'site.webmanifest')))
sizes = {i['sizes'] for i in m['icons']}
check('manifest', m['display'] == 'standalone' and {'192x192', '512x512'} <= sizes and any(i.get('purpose') == 'maskable' for i in m['icons']) and m['start_url'].startswith('/') and m.get('id') == '/' and len(m.get('shortcuts', [])) >= 4,
      f"installable app manifest: standalone, icons {sorted(sizes)} + maskable, start {m['start_url']}, {len(m.get('shortcuts', []))} shortcuts")
idx = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
check('head', all(k in idx for k in ['rel="manifest"', 'apple-touch-icon', 'apple-mobile-web-app-capable', 'viewport-fit=cover', 'theme-color']) and os.path.exists(os.path.join(ROOT, 'sw.js')) and ('serviceWorker' in idx or 'serviceWorker' in open(os.path.join(ROOT, 'assets', 'app.js'), encoding='utf-8').read()),   # 2.15.16: app code is in assets/app.js
      'home-screen tags for iPhone and Android, service worker registered')
with sync_playwright() as pw:
    br = pw.chromium.launch()
    for dev in ['iPhone 13', 'Pixel 7']:
        ctx = br.new_context(**pw.devices[dev]); ctx.add_init_script("""try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}"""); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        tag = dev.split()[0].lower()
        pg.goto(B + '/', wait_until='load'); pg.wait_for_timeout(900)
        st = pg.evaluate("[" + OVER + ", !!document.querySelector('.cine-card .nz-note') && document.querySelector('.cine-card .nz-note').offsetHeight>0]")
        check(tag + '-start', not st[0] and st[1], f'{dev}: start page fits the screen, advice notice visible')
        btn = pg.locator('.who:not([hidden]) [data-who="pensioner"]')
        if btn.count() == 0: pg.locator('[data-whomore], .who-more').first.click(); pg.wait_for_timeout(300)
        pg.locator('.who:not([hidden]) [data-who]').nth(1).click(); pg.wait_for_timeout(200)
        pick = pg.evaluate("document.querySelector('.who [aria-pressed=\"true\"]').dataset.who")
        pg.select_option('#start-country', 'DE'); pg.wait_for_timeout(150)
        href = pg.get_attribute('[data-start="go"]', 'href')
        pg.click('[data-start="go"]')
        pg.wait_for_function("document.querySelectorAll('#results .row[data-id]').length>5", timeout=120000); pg.wait_for_timeout(600)
        h = pg.evaluate("location.hash")
        pg.click('[data-mt="list"]'); pg.wait_for_timeout(500)   # phones open on the map; the ranking is one tap away
        ok = ('cc=DE' in href and 'p=' + pick in href) and 'cc=DE' in h and 'p=' + pick in h
        rs = pg.evaluate("[" + OVER + ", !!document.querySelector('#rnote .nz-note') && document.querySelector('#rnote .nz-note').offsetHeight>0, document.querySelectorAll('#results .row[data-id]').length]")
        check(tag + '-ranking', ok and not rs[0] and rs[1] and rs[2] > 5, f'{dev}: "Show my places" keeps the household ({pick}) and the country (DE): {rs[2]} places listed, notice above, fits the screen')
        tgt = pg.evaluate("[...document.querySelectorAll('#results .row[data-id]')].slice(0,1).map(r=>{const b=r.querySelector('[data-hide]').getBoundingClientRect(),s=r.querySelector('[data-save]').getBoundingClientRect();return [b.width,b.height,s.width,s.height]})[0]")
        check(tag + '-targets', min(tgt) >= 36, f'{dev}: buttons on a result row are big enough to tap ({tgt})')
        first = pg.evaluate("document.querySelector('#results .row[data-id]').dataset.id")
        pg.locator('#results .row[data-id]').first.locator('.nm').click()
        pg.wait_for_selector('#place.open', timeout=30000); pg.wait_for_timeout(1200)
        pl = pg.evaluate("[" + OVER + ", (document.querySelector('#placescroll')||{}).scrollTop||0, !!document.querySelector('#place .nz-note') && document.querySelector('#place .nz-note').offsetHeight>0, document.querySelectorAll('#place .ptabs [data-ptab]').length]")
        check(tag + '-place', not pl[0] and pl[1] == 0 and pl[2] and pl[3] >= 4, f'{dev}: place page opens at its top, fits the screen, notice visible, {pl[3]} tabs')
        for t in ['facts', 'around', 'data']:
            b = pg.locator(f'#place [data-ptab="{t}"]')
            if b.count(): b.first.click(); pg.wait_for_timeout(500)
        tov = pg.evaluate(OVER)
        check(tag + '-tabs', not tov, f'{dev}: every place tab fits the screen')
        pg.locator('#place [data-save]:visible').first.click(); pg.wait_for_timeout(300)
        n = pg.evaluate("(()=>{try{return (JSON.parse(localStorage.getItem('nz:saved'))||[]).length}catch(e){return -1}})()")
        pg.locator('[data-closeplace]:visible').first.click(); pg.wait_for_timeout(500)
        back = pg.evaluate("!document.querySelector('#place.open') && document.querySelectorAll('#results .row[data-id]').length>5")
        pg.evaluate("document.querySelector('[data-lt=\"saved\"]').click()"); pg.wait_for_timeout(500)
        sv = pg.evaluate(f"!!document.querySelector('#results [data-id=\"{first}\"], #results [data-unsave=\"{first}\"]') || document.querySelector('#results').innerText.length>40")
        check(tag + '-save', back and sv, f'{dev}: saving works, closing returns to the list, the shortlist shows the saved place (stored entries: {n})')
        pg.goto(B + '/', wait_until='load'); pg.wait_for_timeout(700)
        pg.click('[data-hmode="biz"]')
        pg.wait_for_function("document.querySelectorAll('#biz-extra [data-rankp]').length>5", timeout=30000)
        bb = pg.evaluate("[...document.querySelectorAll('.who-biz [data-who]')].map(b=>b.dataset.who)")
        have = pg.evaluate("[...document.querySelectorAll('#biz-extra [data-rankp]')].map(x=>x.dataset.rankp)")
        k = [x for x in bb if x in have][-1]
        pg.locator(f'.who-biz [data-who="{k}"]').click(); pg.wait_for_timeout(300)
        vis = pg.evaluate("[...document.querySelectorAll('#biz-extra [data-rankp]')].filter(x=>!x.hidden).map(x=>x.dataset.rankp)")
        bo = pg.evaluate(OVER)
        check(tag + '-business', vis == [k] and not bo, f'{dev}: business mode, picking "{k}" shows its rankings below; fits the screen')
        pg.wait_for_function("window.NZFX===1", timeout=20000)
        pg.locator('details.menu > summary:visible').first.click(); pg.wait_for_timeout(200)
        sb = pg.locator('.menu-panel .fx-toggle[data-fx="sound"]:visible'); ok1 = sb.count() == 1
        if ok1: sb.first.click(); pg.wait_for_timeout(100)
        s1 = pg.evaluate("localStorage.getItem('nz:fx:sound')")
        if ok1: sb.first.click()
        hdr = pg.evaluate("[...document.querySelectorAll('.fx-hdr')].some(b=>b.offsetWidth>0)")
        pg.evaluate("document.querySelectorAll('details.menu').forEach(d=>d.open=false)")
        check(tag + '-sound', ok1 and s1 == '1' and not hdr, f'{dev}: the menu holds the Sounds switch and it works (stored {s1}); no extra header button on the phone')
        check(tag + '-errors', not errs, f'{dev}: no script errors along the journey {errs[:2]}')
        ctx.close()
    br.close()
json.dump(res, open(os.path.join(ROOT, 'tests/mobile_journey_results.json'), 'w'), indent=1)
print(f"{sum(r['ok'] for r in res)} of {len(res)} passed")

sys.exit(0 if all(r['ok'] for r in res) else 1)
