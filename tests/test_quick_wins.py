#!/usr/bin/env python3
"""2.15.30-r7: quick wins in the category sheet: which measures would lift a place most in one category, never a
location fact (climate, distances), with the estimated category points and position.
    python3 tests/test_quick_wins.py [base_url]"""
import re, sys
from playwright.sync_api import sync_playwright
B = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787'
c, errs = {}, []
with sync_playwright() as pw:
    br = pw.chromium.launch(); ctx = br.new_context(viewport={'width': 1400, 'height': 1000})
    ctx.route(lambda u: not u.startswith(B), lambda r: r.abort())
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    out = {}
    for pid, prof in [('DE:14628110', 'young_family'), ('FR:01053', 'pensioner'), ('CH:261', 'young_professional')]:
        pg.goto('%s/#/explore?cc=%s&p=%s&sel=%s' % (B, pid[:2], prof, pid)); pg.wait_for_selector('#place.open', timeout=120000); pg.wait_for_timeout(5000)
        keys = pg.evaluate("[...new Set([...document.querySelectorAll('[data-sheet^=\"cat:\"],[data-k^=\"cat:\"]')].map(e=>e.getAttribute('data-sheet')||e.dataset.k))]")
        html = {k: pg.evaluate("k=>window.NZ_SHEET?window.NZ_SHEET(k):''", k) for k in keys}
        out[pid] = (keys, html)
        tabs = {}
        for t in ('score', 'politics'):
            try: pg.click('#place [data-ptab="%s"][role=tab]' % t, timeout=5000); pg.wait_for_timeout(4000)
            except Exception: pass
            tabs[t] = pg.evaluate("document.querySelector('#place').textContent")
        out[pid] = (keys, html, tabs)
    br.close()
qw = [(pid, k, h) for pid, (ks, hs, _) in out.items() for k, h in hs.items() if 'Quick wins' in h]
rows = [h for _, _, h in qw if '<table>' in h.split('Quick wins')[1]]
c['category sheets open with a quick-wins block'] = sum(len(v[0]) for v in out.values()) >= 6 and len(qw) >= 6
c['quick wins name measures with now, better-quarter level and category points'] = len(rows) >= 2 and all(re.search(r'\+\d', h.split('Quick wins')[1]) for h in rows)
c['estimate shows new score and position'] = any(re.search(r'from position [\d,]+ to about [\d,]+', h) for h in rows)
fixed = re.compile(r'<td>[^<]*(Climate|Sunshine|Altitude|Distance to|km to|Coast|Lake|Mountain)[^<]*</td>', re.I)
c['no location fact is offered as a fix'] = not any(fixed.search(h.split('Quick wins')[1]) for _, _, h in qw)
c['Scorecard tab: quick wins across all categories with profile points'] = sum('Quick wins: what would lift the score' in v[2]['score'] or 'already matches the better quarter' in v[2]['score'] for v in out.values()) >= 2
c['Politics tab: what local policy could change'] = sum('What local policy could change' in v[2]['politics'] or 'already matches the better quarter' in v[2]['politics'] for v in out.values()) >= 2
c['no script errors'] = not errs
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('QUICK WINS TEST:', 'PASS' if ok else 'FAIL', errs[:2]); sys.exit(0 if ok else 1)
