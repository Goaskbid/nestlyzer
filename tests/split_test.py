#!/usr/bin/env python3
"""Checks the website upload folder (dist/site, built by NZ_SPLIT=1 node build/standalone.mjs).

GitHub safety: every file under 20 MiB (GitHub warns at 50 MB, refuses 100 MB, browser upload stops at 25 MB),
at most 90 files per upload, no databases, archives, keys or tokens, only the expected folders.
Behaviour: home page, all 63 countries rank, a place page opens, the Business page loads, no JavaScript errors,
and the first visit downloads only index.html and the start-page globe (not the country data).
    python3 tests/split_test.py [dist/site]
"""
import functools, http.server, os, re, socketserver, sys, threading, json
from playwright.sync_api import sync_playwright

SITE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/site')
PORT = int(os.environ.get('SPLIT_PORT', '8931'))
fails, notes = [], []


def check(cond, msg):
    (notes if cond else fails).append(('ok   ' if cond else 'FAIL ') + msg)


files = [os.path.join(b, f) for b, d, fs in os.walk(SITE) for f in fs]
rel = sorted(os.path.relpath(f, SITE) for f in files)
big = [(r, os.path.getsize(os.path.join(SITE, r))) for r in rel if os.path.getsize(os.path.join(SITE, r)) > 20 * 1024 * 1024]
check(not big, f'every file under 20 MiB (largest {max(os.path.getsize(f) for f in files) / 1e6:.1f} MB)' + (f': too big {big}' if big else ''))
check(len(rel) <= 90, f'{len(rel)} files, fits one GitHub upload (90)')
check(sum(os.path.getsize(f) for f in files) < 200e6, f'total {sum(os.path.getsize(f) for f in files) / 1e6:.0f} MB')
bad = [r for r in rel if re.search(r'\.(sqlite|db|gz|zip|7z|pem|key|env|py|sh)$|(^|/)\.git/|secret|token', r, re.I)]
check(not bad, 'no databases, archives, scripts or key files' + (f': {bad}' if bad else ''))
tops = sorted(set(r.split('/')[0] for r in rel))
check(all('/' not in r for r in rel), 'one flat folder: no subfolders that an upload could miss'); check(all(r in {'index.html', '404.html', 'CNAME', 'ads.txt', 'robots.txt', '.nojekyll', 'business.html'} or r.startswith('nzdata-') for r in rel), f'only expected files: {[r for r in rel if not (r.startswith("nzdata-") or r in {"index.html","404.html","CNAME","ads.txt","robots.txt",".nojekyll","business.html"})][:5]}')
for r in rel:
    if r.endswith('.json') or r.endswith('.html'):
        t = open(os.path.join(SITE, r), encoding='utf-8', errors='ignore').read()
        if re.search(r'(AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{36}|sk-[A-Za-z0-9]{32,}|AIza[0-9A-Za-z_-]{35})', t):
            check(False, 'possible key or token in ' + r)
check(open(os.path.join(SITE, 'CNAME')).read().strip() == 'nestlyzer.com', 'CNAME is nestlyzer.com')
meta_cc, ngrp = [], 0
for r in rel:
    if r.startswith('nzdata-p-'):
        d = json.load(open(os.path.join(SITE, r)))
        parts = d['g'] if 'g' in d else {r[len('nzdata-p-'):len('nzdata-p-')+2]: d}
        ngrp += 'g' in d
        for cc, v in parts.items():
            meta_cc.append(cc)
            if not (v.get('c') and v['c'].get('rows')):
                check(False, 'country data without places: ' + cc)
check(len(meta_cc) == 63 and len(set(meta_cc)) == 63, f'{len(set(meta_cc))} countries in {sum(r.startswith("nzdata-p-") for r in rel)} data files ({ngrp} group packs for the small countries)')


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


srv = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), functools.partial(Q, directory=SITE))
srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{PORT}'
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1280, 'height': 860}); errs, reqs = [], []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('requestfinished', lambda r: reqs.append(r.url))
    pg.goto(base + '/', wait_until='load'); pg.wait_for_timeout(2500)
    first = [u.replace(base, '') for u in reqs if u.startswith(base)]
    check(not any('nzdata-p-' in u or 'search.json' in u for u in first), f'start page loads no country data ({len(first)} local requests)')
    for cc in meta_cc:
        pg.goto(f'{base}/#/explore?cc={cc}&p=young_family', wait_until='domcontentloaded')
        try:
            pg.wait_for_function(f"window.NZ && NZ.state.cc==='{cc}' && NZ.res && NZ.res.scored && NZ.res.scored.length > 0 && NZ.res.scored[0].r.id.indexOf('{cc}:')===0", timeout=60000)
            n = pg.evaluate('NZ.res.scored.length')
            if n < 3: check(False, f'{cc}: only {n} ranked places')
        except Exception as e:
            check(False, f'{cc}: ranking did not appear ({str(e)[:80]})')
    check(True, 'all countries rank (failures listed separately)')
    pg.goto(f'{base}/#/explore?cc=DE&p=young_family'); pg.wait_for_function("window.NZ && NZ.state.cc==='DE' && NZ.res && NZ.res.scored.length>0", timeout=60000)
    pg.evaluate("document.querySelector('[data-open]') && document.querySelector('[data-open]').click()"); pg.wait_for_timeout(2500)
    check(pg.evaluate("!!document.querySelector('.place, .pl, #place, [data-ptab]')"), 'a place page opens')
    pg.goto(base + '/business.html'); pg.wait_for_timeout(2500)
    check('Business' in pg.title() or pg.evaluate("!!document.getElementById('nzb-globe')"), 'Business page loads')
    check(not errs, f'no JavaScript errors {errs[:3]}')
    b.close()
srv.shutdown()
for n in notes + fails:
    print(n)
print('SPLIT TEST:', 'PASS' if not fails else f'FAIL ({len(fails)})')
sys.exit(1 if fails else 0)
