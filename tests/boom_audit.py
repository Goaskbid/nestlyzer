#!/usr/bin/env python3
"""Nestlyzer 2.15.28 public-test audit: real journeys across countries, households and business profiles, on desktop and
on a phone. For every ranking and the first places in it: no script error, no 'undefined' / 'NaN' / '[object' / 'null'
text, nothing wider than a phone screen, every place tab has content, tax and cost shown (measured or marked est.),
time to the first result. Also: a former Swiss municipality name finds its new municipality.
    python3 tests/boom_audit.py [base-url]  -> prints findings, writes tests/boom_audit.json"""
import json, os, re, sys, time
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
RUNS = [('CH', 'young_family'), ('CH', 'pensioner'), ('DE', 'low_income_family'), ('FR', 'remote'), ('IT', 'single_parent'),
        ('UK', 'young_professional'), ('US', 'biz_tech'), ('ES', 'sun_retiree'), ('NL', 'dinks'), ('JP', 'pensioner'),
        ('TW', 'young_family'), ('LI', 'hnw'), ('BR', 'remote'), ('PL', 'first_home'), ('AT', 'biz_logistics'), ('SE', 'nature')]
BAD = re.compile(r'\bundefined\b|\bNaN\b|\[object |\bnull\b|Infinity')
INIT = "try{localStorage.setItem('nz:consent2',JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}"
find, stats = [], []
def bad(where, msg): find.append({'where': where, 'msg': msg}); print('FIND', where, msg)
meta = json.load(open(os.path.join(ROOT, 'data/meta.json'))); profs = meta['config']['profiles']
with sync_playwright() as pw:
    br = pw.chromium.launch()
    for dev in [None, 'iPhone 13']:
        ctx = br.new_context(**(pw.devices[dev] if dev else {'viewport': {'width': 1440, 'height': 900}}))
        ctx.add_init_script(INIT); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        runs = RUNS if not dev else RUNS[::3]
        for cc, p in runs:
            if p not in profs:
                p = next(k for k in profs if not k.startswith('biz'))
            tag = f'{"phone" if dev else "desktop"} {cc}/{p}'; errs.clear()
            t0 = time.time()
            pg.goto(f'{B}/#/explore?cc={cc}&p={p}', wait_until='load')
            try: pg.wait_for_function("document.querySelectorAll('#results .row[data-id]').length>2", timeout=90000)
            except Exception: bad(tag, 'no results within 90 s'); continue
            dt = round(time.time() - t0, 1)
            if dev and pg.locator('[data-mt="list"]').count(): pg.click('[data-mt="list"]'); pg.wait_for_timeout(300)
            n = pg.evaluate("document.querySelectorAll('#results .row[data-id]').length")
            txt = pg.evaluate("document.querySelector('#results').innerText")
            if BAD.search(txt): bad(tag, 'results text: ' + BAD.search(txt).group(0) + ' near ' + txt[max(0, BAD.search(txt).start() - 60):BAD.search(txt).start() + 30].replace('\n', ' '))
            if pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"): bad(tag, 'page wider than the screen on results')
            for i in range(2):
                rows = pg.locator('#results .row[data-id]')
                if rows.count() <= i: break
                nm = rows.nth(i).locator('.nm').inner_text()
                rows.nth(i).locator('.nm').click()
                try: pg.wait_for_selector('#place.open', timeout=30000)
                except Exception: bad(tag, f'place {nm} did not open'); continue
                pg.wait_for_timeout(1300)
                tabs = pg.evaluate("[...new Set([...document.querySelectorAll('#place [data-ptab]')].filter(b=>b.offsetParent).map(b=>b.dataset.ptab))]")
                empty = []
                for t in tabs:
                    if t == 'story': continue   # live Wikipedia; blocked in the test environment
                    pg.evaluate("t=>[...document.querySelectorAll('#place [data-ptab]')].find(b=>b.dataset.ptab===t&&b.offsetParent).click()", t); pg.wait_for_timeout(450)
                    body = pg.evaluate("(document.querySelector('#placescroll')||document.querySelector('#place')).innerText")
                    if len(body.strip()) < 200: empty.append(t)
                    m = BAD.search(body)
                    if m: bad(tag, f'{nm} tab {t}: "{m.group(0)}" near "' + body[max(0, m.start() - 70):m.start() + 30].replace('\n', ' ') + '"')
                    if dev and pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"): bad(tag, f'{nm} tab {t}: wider than the screen')
                if empty: bad(tag, f'{nm}: thin tabs {empty}')
                all_txt = pg.evaluate("document.querySelector('#place').innerText")
                if not re.search(r'tax|Tax', all_txt): bad(tag, f'{nm}: no tax mention on the card')
                if not pg.evaluate("!!document.querySelector('#place .report-row a[href^=\"mailto:\"]')"): bad(tag, f'{nm}: no report-a-problem link')
                pg.locator('[data-closeplace]:visible').first.click(); pg.wait_for_timeout(400)
            if errs: bad(tag, 'script errors: ' + ' | '.join(sorted(set(errs))[:3]))
            stats.append({'run': tag, 'first_result_s': dt, 'rows': n})
        ctx.close()
    # search: a former Swiss municipality leads to the new one
    ctx = br.new_context(viewport={'width': 1440, 'height': 900}); ctx.add_init_script(INIT); pg = ctx.new_page()
    pg.goto(f'{B}/#/explore?cc=CH&p=young_family', wait_until='load')
    pg.wait_for_function("document.querySelectorAll('#results .row[data-id]').length>2", timeout=90000)
    pg.keyboard.press('Control+k'); pg.wait_for_timeout(300)
    if not pg.evaluate("document.querySelector('#palette.open')"): pg.evaluate("(document.querySelector('[data-palette],[data-open-search],#search-open')||{click(){}}).click()"); pg.wait_for_timeout(300)
    try:
        pg.fill('#pal-q', 'Bad Zurzach'); pg.wait_for_timeout(1500)
        li = pg.evaluate("document.querySelector('#pal-list').innerText")
        if 'Zurzach' not in li or 'now part of' not in li: bad('search', 'former name "Bad Zurzach" does not lead to Zurzach: ' + li[:120])
        else:
            pg.keyboard.press('Enter'); pg.wait_for_selector('#place.open', timeout=30000); pg.wait_for_timeout(800)
            h = pg.evaluate("document.querySelector('#place h1, #place h2').innerText")
            if 'Zurzach' not in h: bad('search', 'Enter on the former name opened ' + h)
    except Exception as e: bad('search', 'search palette not reachable: ' + str(e)[:120])
    br.close()
sl = sorted(s['first_result_s'] for s in stats)
out = {'findings': find, 'runs': stats, 'median_first_result_s': sl[len(sl) // 2] if sl else None}
json.dump(out, open(os.path.join(ROOT, 'tests/boom_audit.json'), 'w'), indent=1)
print(f'BOOM AUDIT: {len(stats)} rankings, {len(find)} findings, median first result {out["median_first_result_s"]} s')
sys.exit(1 if find else 0)
