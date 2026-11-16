#!/usr/bin/env python3
"""2.15.30: the opening trailer. About two seconds on the first visit to the start page, says in plain words what the
site does, can be skipped, never shown again, never on deep links, never for reduced motion.
    python3 tests/test_intro.py [base-url]"""
import sys, time
from playwright.sync_api import sync_playwright
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
c = {}
with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={'width': 1300, 'height': 900}); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    t0 = time.time(); pg.goto(B + '/?intro=1', wait_until='domcontentloaded')
    vis = pg.evaluate("getComputedStyle(document.getElementById('intro')).display")
    txt = pg.locator('#intro').inner_text()
    c['shown on first visit'] = vis == 'grid'
    c['plain words: what, for whom, how many'] = 'Every town and city' in txt and 'Ranked for how you live' in txt and 'Find where you fit' in txt and 'countries' in txt and '__TOTAL__' not in txt
    pg.wait_for_function("getComputedStyle(document.getElementById('intro')).display==='none'", timeout=6000)
    dt = time.time() - t0
    c['gone within 3 seconds (%.1fs)' % dt] = dt < 2.9
    c['page usable after it'] = pg.evaluate("document.elementFromPoint(650,450)&&!document.elementFromPoint(650,450).closest('#intro')")
    pg.goto(B + '/?intro=1', wait_until='domcontentloaded'); pg.mouse.click(650, 450); pg.wait_for_timeout(150)
    c['click skips it'] = pg.evaluate("getComputedStyle(document.getElementById('intro')).display") == 'none'
    pg2 = ctx.new_page(); pg2.goto(B + '/#/explore?cc=CH', wait_until='domcontentloaded')
    c['not on deep links or for automated browsers'] = pg2.evaluate("getComputedStyle(document.getElementById('intro')).display") == 'none'
    ctx.close()
    ctx = br.new_context(reduced_motion='reduce'); pg = ctx.new_page(); pg.goto(B + '/?intro=1', wait_until='domcontentloaded')
    c['reduced motion: not shown'] = pg.evaluate("getComputedStyle(document.getElementById('intro')).display") == 'none'
    c['no page errors'] = not errs
    br.close()
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('INTRO TEST:', 'PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
