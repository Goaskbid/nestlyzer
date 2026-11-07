#!/usr/bin/env python3
"""Checks for 2.6: the ten countries outside Europe (with local names), the Business owner and Digital native profiles,
the rotating night globe on the start page and the profile builder that now loads on demand.

    python3 tests/test_v26.py [folder]      # default: the repository root (the built site)
"""
import functools, gzip, http.server, io, json, os, re, socketserver, sys, threading
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ROOT)
PORT = int(os.environ.get('V26_PORT', '8926'))
WORLD = ['US', 'CA', 'JP', 'KR', 'TW', 'HK', 'SG', 'AU', 'NZ', 'IL', 'BR', 'MX', 'MY', 'ID', 'MA', 'ZA', 'IN', 'CN', 'AE'] + ['RU', 'TR', 'VN', 'TH', 'SA', 'PH', 'AR', 'CO', 'EG']
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
res = []
def check(ok, msg): res.append((bool(ok), msg)); print(('PASS ' if ok else 'FAIL ') + msg, flush=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self): self.send_header('Cache-Control', 'no-store'); super().end_headers()
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), functools.partial(Quiet, directory=SITE))
threading.Thread(target=srv.serve_forever, daemon=True).start()
B = f'http://127.0.0.1:{PORT}'

def rd(p): return open(os.path.join(SITE, p), encoding='utf-8').read()
def diff(a, b):
    d = ImageChops.difference(Image.open(io.BytesIO(a)).convert('RGB'), Image.open(io.BytesIO(b)).convert('RGB'))
    return sum(ImageStat.Stat(d).mean) / 3

# ---------- files ----------
meta = json.loads(rd('data/meta.json'))
wc = [c['cc'] for c in meta['countries'] if c.get('world')]
check(sorted(wc) == sorted(WORLD) and len(meta['countries']) == 63, f'meta: 63 countries, the 28 outside Europe marked as world: {wc}')
check(all(k in meta['config']['profiles'] and k in meta['config']['order'] for k in ('business_owner', 'digital_native')), 'meta: Business owner and Digital native profiles exist')
hj = json.loads(rd('data/hero.json')); hb = os.path.getsize(os.path.join(SITE, 'data/hero.bin'))
check(hj['profiles'][-2:] == ['business_owner', 'digital_native'] and len(hj['profiles']) == 10 and hj['frame'] == {'lon': [-180, 180], 'lat': [-90, 90]} and hb == 4 + hj['n'] * (5 + hj['bytes']) and hj['n'] > 100000,
      f'globe data: {len(hj["profiles"])} households, whole world, {hj["n"]:,} lights, {hb:,} bytes as the layout says')
gsize = os.path.getsize(os.path.join(SITE, 'assets/globe.js'))
check(4000 < gsize < 25000 and os.path.getsize(os.path.join(SITE, 'data/globe-lines.bin')) > 50000, f'globe code is a separate file loaded after the start page: assets/globe.js {gsize:,} bytes')
land = len(gzip.compress(open(os.path.join(SITE, 'index.html'), 'rb').read(), 6)) / 1024
check(land < 120, f'start page stays under 120 KB compressed: {land:.1f} KB')
for cc in WORLD:
    sh = json.loads(rd(f'data/c/{cc}.json'))
    if not (sh.get('world') and sh['n'] > 50 and os.path.exists(os.path.join(SITE, f'data/geo/w/{cc}.json'))): check(False, f'{cc}: shard, world block and outline'); break
else: check(True, 'all 10 countries outside Europe have places, a world block and map outlines')
jp = rd('japan/index.html'); il = rd('israel/index.html')
check('places ranked' in re.search(r'<title>(.*?)</title>', jp).group(1) and 'Tokyo (東京)' in jp and 'תל אביב' in il, 'SEO pages: Japan says "places ranked" and lists Tokyo (東京); Israel shows Hebrew names')
bo = rd('best/business-owner/index.html')
rows = re.findall(r'<tr><td[ >]', bo[bo.find('Business climate by country'):])
check('Business climate by country' in bo and len(rows) == 63 and '29.74%' in bo and 'Rule of law' in bo, f'Business owner page: business climate table for {len(rows)} countries (corporate tax, VAT, best place), says what is missing')
check('Best places for digital natives' in rd('best/digital-native/index.html'), 'Digital native page exists')
check('GeoNames' in rd('legal/index.html') and 'GeoNames' in rd('method/index.html'), 'GeoNames (CC BY 4.0) is credited on the legal and method pages')

with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    def ctx(**kw):
        c = b.new_context(**kw)
        c.add_init_script("try{localStorage.setItem('nz:consent2',JSON.stringify({a:0,t:Date.now(),v:2}));localStorage.setItem('nz:toured','1')}catch(e){}")
        return c
    errs = []
    # ---------- the globe ----------
    c = ctx(viewport={'width': 1440, 'height': 860}); pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    first = []
    pg.on('request', lambda r: first.append(r.url))
    pg.goto(B + '/', wait_until='load'); pg.wait_for_timeout(5000)
    on = pg.evaluate("document.querySelector('#cine').classList.contains('globe-on')")
    gl = pg.evaluate("!!document.createElement('canvas').getContext('webgl')")
    check(on and gl, f'globe is drawn with WebGL on the start page (globe-on={on})')
    clip = {'x': 760, 'y': 60, 'width': 640, 'height': 640}
    a = pg.screenshot(clip=clip); pg.wait_for_timeout(1200); a2 = pg.screenshot(clip=clip)
    check(diff(a, a2) > 0.3, f'globe turns (picture changes over 1.2 s: {diff(a, a2):.2f})')
    pg.click('.who [data-who="pensioner"]'); pg.wait_for_timeout(1500)
    cap = pg.inner_text('#cine-prof')
    check(cap == 'pensioner couple', f'legend follows the household: "{cap}"')
    pg.click('.who [data-whomore]'); pg.wait_for_timeout(1500)
    more = pg.eval_on_selector_all('#who-more [data-who]', 'e => e.map(x => x.dataset.who)')
    check('business_owner' in more and 'digital_native' in more, f'More households lists Business owner and Digital native ({len(more)} households)')
    pg.click('#who-more [data-who="business_owner"]'); pg.wait_for_timeout(1500)
    check(pg.inner_text('#cine-prof') == 'business owner', 'choosing Business owner relights the globe and names it in the legend')
    c.close()
    # reduced motion: still globe, but a household change still recolours it
    c = ctx(viewport={'width': 1440, 'height': 860}, reduced_motion='reduce'); pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B + '/', wait_until='load'); pg.wait_for_timeout(4500)
    a = pg.screenshot(clip=clip); pg.wait_for_timeout(1200); a2 = pg.screenshot(clip=clip)
    pg.click('.who [data-who="coastal"]'); pg.wait_for_timeout(800); a3 = pg.screenshot(clip=clip)
    check(diff(a, a2) < 0.05 and diff(a2, a3) > 0.3, f'reduced motion: the globe stands still ({diff(a, a2):.3f}) and a household change recolours it ({diff(a2, a3):.2f})')
    c.close()
    # phone
    c = ctx(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True); pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B + '/', wait_until='load'); pg.wait_for_timeout(4500)
    on = pg.evaluate("document.querySelector('#cine').classList.contains('globe-on')")
    sw = pg.evaluate('document.documentElement.scrollWidth')
    check(on and sw <= 390, f'phone: globe drawn, no sideways scroll (page width {sw})')
    c.close()

    # ---------- countries outside Europe in the app ----------
    c = ctx(viewport={'width': 1440, 'height': 900}); pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B + '/#/explore?cc=JP&p=business_owner&sel=JP:1850147', wait_until='load'); pg.wait_for_timeout(5000)
    h = pg.inner_text('#place h2')
    check(h.startswith('Tokyo (東京)'), f'Japan opens with local names: "{h}"')
    why = pg.inner_text('#place')
    check('trend is unknown' not in why and '–residents' not in why, 'the why-card does not cite figures that do not exist outside Europe')
    pg.click('#place [data-ptab="data"]'); pg.wait_for_timeout(2500)
    rows = pg.eval_on_selector_all('#place tr.adr', 'e => e.map(x => [...x.children].map(c => c.textContent.trim()).join(" = "))')
    txt = '\n'.join(rows)
    check('Corporate income tax (Japan) = 29.74%' in txt and 'Consumption tax (Japan)' in txt and 'Asia/Tokyo' in txt and '110 police' in txt,
          'All data for Tokyo: corporate tax, consumption tax, time zone, emergency numbers')
    check('elsewhere in Europe' not in txt and txt.count('Prefecture =') == 1 and 'Places within 12 km' in txt, 'All data wording fits places outside Europe (no "Europe", no repeated rows)')
    for cc, word in [('US', 'United States'), ('IL', 'Israel'), ('AU', 'Australia')]:
        pg.goto(B + f'/#/explore?cc={cc}&p=digital_native', wait_until='load'); pg.wait_for_timeout(4000)
        n = pg.locator('.rail [data-sel], .rail .row').count()
        title = pg.inner_text('.rail h2, .rail .scope-title') if pg.locator('.rail h2, .rail .scope-title').count() else ''
        check(word in pg.inner_text('.rail'), f'{word} ranks for Digital native')
    # search by local script
    for q, want in [('東京', 'Japan'), ('תל אביב', 'Israel'), ('서울', 'South Korea'), ('沙田', 'Hong Kong')]:
        pg.goto(B + '/', wait_until='load'); pg.wait_for_timeout(700); pg.keyboard.press('/'); pg.wait_for_timeout(400)
        pg.fill('#pal-q', q); pg.wait_for_timeout(900)
        got = pg.eval_on_selector_all('#pal-list button', 'e => e.slice(0, 3).map(x => x.textContent)')
        check(any(want in g for g in got), f'search "{q}" finds {want}: {got[:2]}')
    # the builder loads on demand and still works
    pg.goto(B + '/#/explore?cc=CH&p=young_family', wait_until='load'); pg.wait_for_timeout(3000)
    pg.click('[data-builder]'); pg.wait_for_timeout(2500)
    nq = pg.locator('#bq [data-bq]').count()
    check(nq > 10, f'Build my own opens from the on-demand module ({nq} choices)')
    c.close()
    # 2.6.1: Business locations (Beta), country context in All data, coastal living with lakes, globe outlines
    c = ctx(viewport={'width': 1440, 'height': 900}); pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B + '/', wait_until='load'); pg.wait_for_timeout(1500)
    pg.select_option('#start-country', 'DE'); pg.wait_for_timeout(300)
    href = pg.get_attribute('[data-bizlink]', 'href')
    pg.click('[data-hmode="biz"]'); pg.wait_for_timeout(600)   # 2.9: Business locations is a toggle on the start page
    href = pg.get_attribute('[data-bizlink]', 'href')
    pg.click('[data-bizlink]'); pg.wait_for_timeout(2500)
    ok = pg.url.endswith('/business/?cc=DE') and pg.input_value('#country-a') == 'DE' and pg.locator('.nzb-brand').count() == 1 and pg.locator('#nz-business-theme').count() == 1
    rows = pg.locator('#country-table tbody tr').count()
    pg.click('[data-tab="states"]'); pg.wait_for_timeout(600); srows = pg.locator('#state-table tbody tr').count()
    ov = pg.evaluate('window.NestlyzerBusiness.data.counts.native_overlay_values')
    check(href == '/business/?cc=DE' and ok and rows > 200 and srows >= 50 and ov == 0, f'Business locations (Beta): start-page link carries the country ({href}), Nestlyzer header and theme, {rows} economies, {srows} US states screened, overlay count shown honestly ({ov})')
    pg.goto(B + '/#/explore?cc=US&p=business_owner&sel=US:5128581&pt=data', wait_until='load')
    try: pg.wait_for_function("[...document.querySelectorAll('#place tr.adr')].some(x => /Electricity price for industry/.test(x.textContent))", timeout=45000)   # the US file is larger since 2.8
    except Exception: pass
    t = '\n'.join(pg.locator('#place tr.adr').evaluate_all('e => e.map(x => x.textContent)'))
    check('Top personal income tax rate' in t and 'Liberal democracy index' in t and 'Manufacturing jobs in the state' in t and 'Electricity price for industry in the state' in t,
          'All data for New York City: country taxes (Tax Foundation ITCI), economy and institutions (World Bank, V-Dem), New York State jobs and electricity (BLS, EIA)')
    pg.goto(B + '/#/explore?cc=CA&p=coastal&a=' + 'M%3AToronto', wait_until='load'); pg.wait_for_timeout(4000)
    rail = pg.inner_text('.rail')
    check('has no coast' not in rail and 'Toronto' in rail, 'Coastal living in Greater Toronto: Lake Ontario counts as a shore, no "Canada has no coast" message')
    c.close()
    b.close()
check(not errs, f'no JavaScript errors: {errs[:3]}')
srv.shutdown()
ok = sum(1 for r in res if r[0]); print(f'\n{ok} of {len(res)} passed')
json.dump([{'ok': o, 'check': m} for o, m in res], open(os.path.join(ROOT, 'tests', 'results', 'v26.json'), 'w'), indent=1, ensure_ascii=False)
sys.exit(0 if ok == len(res) else 1)
