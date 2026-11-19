#!/usr/bin/env python3
"""2.15.30-r6: every release reaches every visitor without a manual refresh.
Serves the built site locally and swaps sw.js and app.js between releases, like a GitHub Pages deploy does:
  1. a visitor on the OLD service worker (cache-first, same version number) gets the new app on the next page load;
  2. a tab left open gets the next release as soon as the browser checks for updates, with no click;
  3. an unchanged release never reloads the page (no loops);
  4. the build stamp in sw.js changes whenever any cached file changes.
    python3 tests/test_sw_upgrade.py [_site] [old_sw.js]"""
import asyncio, http.server, os, re, socketserver, sys, threading, json, subprocess
SITE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '_site')
OLD_SW = sys.argv[2] if len(sys.argv) > 2 else None
NEW_SW = open(os.path.join(SITE, 'sw.js'), encoding='utf-8').read()
STATE = {'sw': None, 'mark': 'OLD'}
APP = open(os.path.join(SITE, 'assets/app.js'), 'rb').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=SITE, **k)
    def log_message(s, *a): pass
    def end_headers(s): s.send_header('Cache-Control', 'max-age=600'); super().end_headers()
    def send_header(s, k, v):
        if k == 'Cache-Control' and getattr(s, '_cc', False): return
        if k == 'Cache-Control': s._cc = True
        super().send_header(k, v)
    def send_response(s, *a, **k): s._cc = False; super().send_response(*a, **k)
    def do_GET(s):
        p = s.path.split('?')[0]
        if os.environ.get('SWDBG') and p in ('/sw.js', '/assets/app.js', '/'): print('REQ', STATE['mark'], s.path, flush=True)
        if p == '/sw.js' or p == '/assets/app.js':
            b = STATE['sw'].encode() if p == '/sw.js' else APP + (";window.__NZM='%s';" % STATE['mark']).encode()
            s.send_response(200); s.send_header('Content-Type', 'text/javascript'); s.send_header('Content-Length', str(len(b)))
            # GitHub Pages sends max-age=600: an old browser copy of sw.js expires at most 10 minutes after a deploy.
            # The test starts after that point (new pages register with updateViaCache 'none' and skip even that wait).
            if p == '/sw.js': s.send_header('Cache-Control', 'max-age=0')
            s.send_header('ETag', '"%x"' % hash(b)); super().end_headers(); s.wfile.write(b); return
        return super().do_GET()
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
U = 'http://127.0.0.1:%d/?sw=1' % port
c = {}
def sw_for(stamp): return NEW_SW.replace(re.search(r"const V='(nz-[^']+)'", NEW_SW).group(1), 'nz-2.15.30-' + stamp)
async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); ctx = await b.new_context(); navs = []
        # no request routing here: Playwright routing changes how Chromium checks service workers for updates
        pg = await ctx.new_page(); pg.set_default_timeout(30000)
        PEND = {}
        if os.environ.get('SWDBG'):
            ctx.on('request', lambda r: PEND.__setitem__(id(r), r.url)); ctx.on('requestfinished', lambda r: PEND.pop(id(r), None)); ctx.on('requestfailed', lambda r: PEND.pop(id(r), None))
        pg.on('framenavigated', lambda f: navs.append(f.url) if f == pg.main_frame else None)
        async def upd():
            try: await asyncio.wait_for(pg.evaluate("navigator.serviceWorker.getRegistration().then(g=>{if(g)g.update()})"), 5)
            except Exception: pass
        mark = lambda: pg.evaluate('window.__NZM||""')
        async def wait_mark(m, t=20):
            for _ in range(t * 4):
                try:
                    if await asyncio.wait_for(mark(), 3) == m: return True
                except Exception: pass
                await asyncio.sleep(0.25)
            return False
        async def controlled():
            for _ in range(80):
                try:
                    if await pg.evaluate('!!navigator.serviceWorker.controller'): return True
                except Exception: pass
                await asyncio.sleep(0.25)
            return False
        print(c, flush=True); # release A: the service worker visitors have today (or the new one if no old copy is given)
        STATE['sw'] = open(OLD_SW, encoding='utf-8').read() if OLD_SW else sw_for('aaaaaaaaaaaa'); STATE['mark'] = 'A'
        await pg.goto(U, wait_until='domcontentloaded'); await controlled(); await pg.reload(wait_until='domcontentloaded'); await controlled(); await wait_mark('A')
        STATE['mark'] = 'A-stale-check'; await pg.reload(wait_until='domcontentloaded'); await asyncio.sleep(1.5)
        c['old service worker kept serving its cached app (the bug)' if OLD_SW else 'cached app served under one build'] = await mark() == 'A'
        print(c, flush=True); # release B: one ordinary page load must end on the new app, without any click
        STATE['sw'] = sw_for('bbbbbbbbbbbb'); STATE['mark'] = 'B'
        await pg.goto(U + '&b=1', wait_until='domcontentloaded'); c['next page load ends on the new release'] = await wait_mark('B', 30)
        if os.environ.get('SWDBG'):
            for _ in range(6):
                try: print('DBG', await asyncio.wait_for(pg.evaluate("Promise.all([caches.keys(),navigator.serviceWorker.getRegistration().then(g=>g?[g.active&&g.active.scriptURL,g.waiting&&1,g.installing&&1]:null),fetch('/sw.js').then(r=>r.text()).then(t=>t.slice(0,40)),Promise.resolve(window.__NZM)])"),5), flush=True)
                except Exception as e: print('DBG err', e, flush=True)
                try: print('UPD', await asyncio.wait_for(pg.evaluate("navigator.serviceWorker.getRegistration().then(g=>g.update().then(r=>'ok '+!!(r.installing||r.waiting||r.active)).catch(e=>'err '+e))"),8), flush=True)
                except Exception as e: print('UPD err', e, flush=True)
                print('NAVS', len(navs), 'PENDING', list(PEND.values())[:8], flush=True); await asyncio.sleep(2)
        print(c, flush=True); # release C while the tab stays open: the browser's update check alone brings it in
        STATE['sw'] = sw_for('cccccccccccc'); STATE['mark'] = 'C'; n0 = len(navs)
        await upd()
        c['open tab moves to the next release by itself'] = await wait_mark('C') and len(navs) > n0
        # same release again: no reload, no loop
        await asyncio.sleep(1); n1 = len(navs)
        await upd(); await asyncio.sleep(3)
        c['unchanged release: no reload'] = len(navs) == n1 and await asyncio.wait_for(mark(), 5) == 'C'
        ks = await asyncio.wait_for(pg.evaluate('caches.keys()'), 5)
        c['only the current release cache is kept'] = ks == ['nz-2.15.30-cccccccccccc']
        await b.close()
asyncio.run(main())
c['published sw.js carries a 12-character build stamp'] = bool(re.search(r"const V='nz-[\d.]+-[0-9a-f]{12}'", NEW_SW))
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('SERVICE WORKER UPGRADE TEST:', 'PASS' if ok else 'FAIL'); srv.shutdown(); sys.exit(0 if ok else 1)
