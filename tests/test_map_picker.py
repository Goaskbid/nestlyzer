#!/usr/bin/env python3
"""2.15.30: on phones the map always names the selected ranking: the picker keeps its width after a place was opened and
closed, and the bar above the map shows the country and the ranking.   python3 tests/test_map_picker.py [base-url]"""
import sys
from playwright.sync_api import sync_playwright
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
c = {}
with sync_playwright() as pw:
    br = pw.chromium.launch()
    for w in (320, 390):
        ctx = br.new_context(viewport={'width': w, 'height': 760}, is_mobile=True, has_touch=True)
        ctx.add_init_script("try{localStorage.setItem('nz:consent2',JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}")
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(B + '/#/explore?cc=UK&p=commuter', wait_until='load'); pg.wait_for_timeout(4000)
        pg.locator('[data-mt=list]').click(); pg.wait_for_timeout(800)
        pg.locator('#results .row[data-id] .nm').first.click(); pg.wait_for_selector('#place.open', timeout=30000)
        pg.locator('[data-mt=map]').click(); pg.wait_for_timeout(1500)
        d = pg.evaluate("(()=>{const s=document.querySelector('#f-layer'),b=s.getBoundingClientRect(),m=document.querySelector('#mapctx');return {w:b.width,vis:b.width>0&&b.top>=0,txt:s.options[s.selectedIndex].text,ctx:m?m.innerText.replace(/\\s+/g,' '):''}})()")
        c['%d px: picker readable after opening a place (%d px wide)' % (w, d['w'])] = d['w'] >= 150 and d['vis']
        c['%d px: map bar names country and ranking' % w] = 'United Kingdom' in d['ctx'] and 'Commuter' in d['ctx']
        c['%d px: no page errors' % w] = not errs
        ctx.close()
    br.close()
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('MAP PICKER TEST:', 'PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
