#!/usr/bin/env python3
"""Simulates the live site after the upload: a copy of the live repository (as cloned from GitHub) with the
flat website folder (dist/site) dropped on top, exactly as GitHub's web upload does it.
    python3 tests/livesim.py /path/to/repo-clone [dist/site]
Checks: start page and both globes, the business toggle, Denmark and four other countries rank, a place page opens,
business.html loads, phone layout has no horizontal scroll, no JavaScript errors, no failed local requests."""
import os, shutil, subprocess, sys, time, json
from playwright.sync_api import sync_playwright

REPO = os.path.abspath(sys.argv[1]); SITE = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else 'dist/site')
SIM = '/tmp/livesim_' + str(os.getpid())
shutil.copytree(REPO, SIM, ignore=shutil.ignore_patterns('.git'))
for f in os.listdir(SITE):
    shutil.copy2(os.path.join(SITE, f), os.path.join(SIM, f))
PORT = 8955
srv = subprocess.Popen(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'serve.mjs'), SIM, str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
B = f'http://127.0.0.1:{PORT}'
res = []


def check(ok, msg):
    res.append((bool(ok), msg)); print(('PASS ' if ok else 'FAIL ') + msg)


try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1300, 'height': 900}); errs, bad = [], []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('response', lambda r: bad.append(r.url) if r.url.startswith(B) and r.status >= 400 and 'favicon' not in r.url else None)
        pg.goto(B + '/', wait_until='load'); pg.wait_for_timeout(3000)
        check(pg.evaluate("!!document.querySelector('#cine canvas, canvas')"), 'start page shows the globe')
        check(pg.evaluate("!document.getElementById('nz-missing')"), 'no "files missing" banner')
        pg.click('[data-hmode="biz"]'); pg.wait_for_timeout(3000)
        vis = pg.evaluate("(function(){var c=document.getElementById('cine-b');if(!c)return false;var r=c.getBoundingClientRect();return r.width>100&&r.height>100&&getComputedStyle(c).display!=='none'})()")
        check(vis, 'Business locations toggle shows the business globe')
        check(pg.evaluate("[...document.querySelectorAll('.who.who-biz')].some(function(e){return !e.hidden})"), 'business profiles appear')
        pg.click('[data-hmode="home"]'); pg.wait_for_timeout(800)
        for cc in ['DK', 'CH', 'FR', 'US', 'JP', 'IE', 'IT']:
            pg.goto(f'{B}/#/explore?cc={cc}&p=young_family', wait_until='domcontentloaded')
            try:
                pg.wait_for_function(f"window.NZ && NZ.state.cc==='{cc}' && NZ.res && NZ.res.scored && NZ.res.scored.length>0 && NZ.res.scored[0].r.id.indexOf('{cc}:')===0", timeout=60000)
                check(True, f'{cc}: {pg.evaluate("NZ.res.scored.length")} places ranked')
            except Exception as e:
                check(False, f'{cc}: did not load ({str(e)[:80]})')
        pg.goto(f'{B}/#/explore?cc=DK&p=young_family&sel=DK%3A461&pt=data'); pg.wait_for_timeout(4000)
        check(pg.evaluate("NZ.state.selected==='DK:461' && !!document.querySelector('#place [data-alldata]')"), 'Odense place page opens with all data')
        pg.goto(B + '/business.html', wait_until='load'); pg.wait_for_timeout(2500)
        check(pg.evaluate("!!document.getElementById('nzb-globe') || /Business/.test(document.title)"), 'business.html loads')
        check(not errs, f'no JavaScript errors {errs[:2]}')
        check(not bad, f'no failed requests {bad[:3]}')
        m = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        m.goto(B + '/', wait_until='load'); m.wait_for_timeout(2500)
        check(m.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), 'phone: start page has no sideways scroll')
        m.goto(f'{B}/#/explore?cc=DK&p=young_family', wait_until='domcontentloaded')
        m.wait_for_function("window.NZ && NZ.res && NZ.res.scored.length>0", timeout=60000)
        check(m.evaluate("!!document.querySelector('#modeseg [data-mode]')"), 'phone: places/business toggle in the app')
        b.close()
finally:
    srv.terminate(); shutil.rmtree(SIM, ignore_errors=True)
n = sum(1 for o, _ in res if o)
print(f'\nLIVESIM: {n} of {len(res)} passed')
sys.exit(0 if n == len(res) else 1)
