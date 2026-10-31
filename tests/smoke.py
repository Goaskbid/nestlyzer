#!/usr/bin/env python3
"""Smoke test for a finished site folder (default: _site). Used by the GitHub workflow before every deploy.

    python3 tests/smoke.py [_site]

Serves the folder on a local port, opens it in headless Chromium on desktop and phone sizes and checks
that the main journeys work. It checks behaviour, not exact numbers, so it keeps passing after a
yearly data refresh. Outside services (maps, photos) may be unreachable; that is not a failure.
Exit code 0 = all good; 1 = do not publish.
"""
import http.server, json, os, socketserver, sys, threading, functools, re
from playwright.sync_api import sync_playwright

SITE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '_site')
PORT = int(os.environ.get('SMOKE_PORT', '8911'))
fails, notes = [], []


def check(cond, msg):
    (notes if cond else fails).append(('ok   ' if cond else 'FAIL ') + msg)


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


def files():
    must = ['index.html', 'CNAME', 'sitemap.xml', 'robots.txt', 'sw.js', 'offline.html', 'data/meta.json', 'data/search.json', 'legal/index.html', 'method/index.html', 'best/index.html', 'about/index.html']
    for m in must:
        check(os.path.exists(os.path.join(SITE, m)), 'file present: ' + m)
    meta = json.load(open(os.path.join(SITE, 'data/meta.json')))
    for c in meta['countries']:
        check(os.path.getsize(os.path.join(SITE, 'data/c', c['cc'] + '.json')) > 1000, 'country data present: ' + c['cc'])
    pages = sum(1 for b, d, f in os.walk(SITE) for x in f if x == 'index.html')
    check(pages > 5000, f'{pages} pages built')
    check(open(os.path.join(SITE, 'CNAME')).read().strip() == 'nestlyzer.com', 'CNAME is nestlyzer.com')
    html = open(os.path.join(SITE, 'index.html'), encoding='utf-8').read()
    check('<script async src="https://pagead2' not in html and '<script async src="https://www.googletagmanager' not in html, 'no Google script loads before consent')
    return meta


def browser(meta):
    handler = functools.partial(Q, directory=SITE)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{PORT}'
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, vp, mob in (('desktop', {'width': 1440, 'height': 900}, False), ('phone', {'width': 390, 'height': 844}, True)):
            ctx = b.new_context(viewport=vp, is_mobile=mob, has_touch=mob)
            ctx.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}")
            ctx.route(re.compile(r'https?://(?!127\.0\.0\.1).*'), lambda r: r.abort())  # no outside services in the test
            pg = ctx.new_page(); pg.on('pageerror', lambda e: errors.append(f'{name}: {e}'))
            pg.goto(base + '/', wait_until='domcontentloaded')
            check(pg.locator('h1').first.is_visible(), f'{name}: home page shows its headline')
            for cc in ('CH', 'DE', 'FR'):
                pg.goto(f'{base}/#/explore?cc={cc}&p=young_family', wait_until='domcontentloaded')
                try:
                    pg.wait_for_function(f"window.NZ && NZ.state.cc==='{cc}' && NZ.res && NZ.res.scored && NZ.res.scored.length > 0 && NZ.scope[0].country==='{cc}'", timeout=45000)
                    n = pg.evaluate('NZ.res.scored.length')
                    check(n > 10, f'{name}: {cc} ranks {n} places')
                except Exception as e:
                    check(False, f'{name}: {cc} ranking did not load ({str(e)[:80]})')
            if mob:
                pg.click('.mobile-tabs [data-mt="list"]')
            pg.wait_for_timeout(400)
            pg.locator('ol.list li.row').first.click()
            pg.wait_for_timeout(1200)
            check(pg.evaluate('!!NZ.state.selected'), f'{name}: a place opens from the list')
            for path in ('/legal/', '/method/', '/best/', '/about/', '/switzerland/', '/germany/'):
                r = pg.goto(base + path, wait_until='domcontentloaded')
                check(r is not None and r.status == 200 and pg.locator('h1').count() == 1, f'{name}: {path} opens')
            ctx.close()
        b.close()
    srv.shutdown()
    check(not errors, 'no JavaScript errors' + ('' if not errors else ': ' + '; '.join(errors[:3])))


if __name__ == '__main__':
    m = files()
    if not fails:
        browser(m)
    for n in notes + fails:
        print(n)
    print('SMOKE TEST:', 'PASS' if not fails else f'{len(fails)} FAIL')
    sys.exit(1 if fails else 0)
