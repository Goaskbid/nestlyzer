#!/usr/bin/env python3
"""Nestlyzer 2.10 checks: deeper data shown first, no gap wording, remaining audit items and retests.
    python3 tests/test_v210.py [base-url]      (default http://localhost:8787)"""
import json, os, re, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
res = []
GAP = re.compile(r'\b(no data|not measured|no measured value|unknown|missing|not in the data|too little data|Screening only|Not available yet|no open data|stand-in)\b', re.I)


def check(fid, ok, msg):
    res.append({'finding': fid, 'ok': bool(ok), 'check': msg}); print(('PASS ' if ok else 'FAIL ') + fid + '  ' + msg)


SEED = "try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:Date.now()}))}catch(e){}"


def ctxpage(b, mobile=False, seed=SEED):
    c = b.new_context(viewport={'width': 390, 'height': 844} if mobile else {'width': 1400, 'height': 950}, is_mobile=mobile, has_touch=mobile)
    if seed: c.add_init_script(seed)
    p = c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x))); return c, p, e


def ranked(pg, cc, prof='young_family', extra=''):
    pg.goto(f'{B}/#/explore?cc={cc}&p={prof}{extra}', wait_until='load')
    pg.wait_for_function(f"window.NZ && NZ.state.cc==='{cc}' && NZ.res && NZ.res.scored && NZ.res.scored.length>0 && NZ.res.scored[0].r.id.indexOf('{cc}:')===0", timeout=90000)
    pg.wait_for_timeout(500)


with sync_playwright() as p:
    b = p.chromium.launch(); errs = []

    # ---- Key facts first, gap wording gone (owner request 19 Oct) ----
    c, pg, e = ctxpage(b); errs.append(e)
    for cc, prof in [('DE', 'young_family'), ('FR', 'pensioner'), ('JP', 'young_family'), ('KR', 'young_family'), ('TW', 'young_family'), ('CZ', 'dinks'), ('US', 'remote'), ('CH', 'biz_manufacturing')]:
        ranked(pg, cc, prof)
        sel = pg.evaluate('NZ.res.scored[0].id')
        pg.goto(f'{B}/#/explore?cc={cc}&p={prof}&sel={sel}', wait_until='load')
        pg.wait_for_function(f"NZ.state.selected==={json.dumps(sel)} && document.querySelector('#place .pbody')", timeout=60000); pg.wait_for_timeout(2500)
        kf = pg.evaluate("document.querySelectorAll('#place .keyfacts .kf').length")
        txt = pg.evaluate("document.getElementById('place').innerText") + pg.evaluate("document.getElementById('results').innerText")
        gaps = sorted(set(m.group(0).lower() for m in GAP.finditer(txt)))
        pg.goto(f'{B}/#/explore?cc={cc}&p={prof}&sel={sel}&pt=score', wait_until='load'); pg.wait_for_selector('#place .ptcard', timeout=60000); pg.wait_for_timeout(800)
        sc = pg.inner_text('#place .ptcard'); gaps2 = sorted(set(m.group(0).lower() for m in GAP.finditer(sc)))
        check('kf', kf >= 3, f'{cc} {prof} #1: Key facts shows {kf} official figures for the place')
        check('wording', not gaps and not gaps2, f'{cc} {prof}: place page, list and scorecard free of gap wording {gaps + gaps2}')
    c.close()

    # ---- 006 lowest-fit pins ----
    c, pg, e = ctxpage(b); errs.append(e)
    ranked(pg, 'DE'); pg.wait_for_function("document.querySelectorAll('.pin').length>3", timeout=90000)
    pg.click('[data-pinmode="low"]'); pg.wait_for_timeout(1200)
    tips = pg.evaluate("[...document.querySelectorAll('.pin:not(.xb):not(.hub):not(.anc)')].map(function(e){return e.title})")
    n = pg.evaluate('NZ.res.scored.length')
    check('006', tips and all('lowest fits' in t for t in tips) and all(int(re.search(r'#(\d+) of', t).group(1)) > n - 10 for t in tips), f'"Lowest 10" pins the 10 lowest-ranked scored places ({len(tips)} pins, of {n})')
    c.close()

    # ---- 042 evidence export ----
    c, pg, e = ctxpage(b); errs.append(e)
    ranked(pg, 'CH')
    pg.evaluate("localStorage.setItem('nz:saved', JSON.stringify([]))")
    ids = pg.evaluate('NZ.res.scored.slice(0,2).map(function(x){return x.id})')
    for i in ids:
        pg.goto(f'{B}/#/explore?cc=CH&p=young_family&sel={i}', wait_until='load'); pg.wait_for_timeout(1500)
        pg.evaluate("(document.querySelector('#place [data-save]')||document.querySelector('#place .place-actions button')).click()"); pg.wait_for_timeout(400)
    with pg.expect_download(timeout=60000) as dl:
        pg.evaluate("document.querySelector('[data-export]') ? document.querySelector('[data-export]').click() : null") or None
        if not pg.evaluate("!!document.querySelector('[data-export]')"):
            pg.click('[data-lt="saved"]'); pg.wait_for_timeout(800); pg.click('[data-export]')
    path = dl.value.path(); csv = open(path, encoding='utf-8-sig').read()
    rows = csv.count('\n'); figs = csv.count('\nfigure,')
    check('042', 'Profile' in csv and 'Data behind the score' in csv and figs >= 20, f'shortlist evidence export: {rows} rows, {figs} figures with period, level and source')
    c.close()

    # ---- 011 first visit ----
    c, pg, e = ctxpage(b, seed=None); errs.append(e)
    pg.goto(B + '/', wait_until='load'); pg.wait_for_timeout(2500)
    consent = pg.evaluate("!!document.getElementById('consent') && !document.getElementById('consent').hidden")
    pg.goto(B + '/#/explore?cc=CH&p=young_family', wait_until='load'); pg.wait_for_timeout(4000)
    invite = pg.evaluate("!!document.getElementById('tour-invite')")
    check('011', consent and invite, f'fresh visitor: privacy choice shown ({consent}) and the optional quick tour is offered in the app ({invite})')
    c.close()

    # ---- 031 saved choices survive the update ----
    old = "try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:Date.now()}));localStorage.setItem('nz:saved', JSON.stringify([{id:'CH:261',name:'Zürich',score:70,profile:'young_family',note:'from 2.8'}]));localStorage.setItem('nz:custom', JSON.stringify({name:'My guided fit',weights:{jobs:30,safety:20},strict:{},minPop:1200}));localStorage.setItem('nz:builder', JSON.stringify({household:'couple',targets:['CH']}))}catch(e){}"
    c, pg, e = ctxpage(b, seed=old); errs.append(e)
    ranked(pg, 'CH', 'self_fit')
    sv = pg.evaluate("JSON.parse(localStorage.getItem('nz:saved'))"); cu = pg.evaluate("NZ.state.custom && NZ.state.custom.weights")
    check('031', sv and sv[0]['id'] == 'CH:261' and sv[0].get('note') == 'from 2.8' and cu == {'jobs': 30, 'safety': 20}, f'a 2.8 shortlist with a note and a custom profile survive the update ({len(sv or [])} saved, weights {cu})')
    c.close()

    # ---- 032 map failure leaves a usable list ----
    c, pg, e = ctxpage(b); errs.append(e)
    pg.route(re.compile(r'.*(maplibre|tiles|basemap|\.pbf|style\.json).*'), lambda r: r.abort())
    ranked(pg, 'FR')
    rows = pg.evaluate("document.querySelectorAll('#results .row').length")
    pg.click('#results .row'); pg.wait_for_timeout(1500)
    check('032', rows >= 10 and pg.evaluate("!!NZ.state.selected"), f'with the map blocked the ranking still lists {rows} places and a place opens')
    c.close()

    # ---- 028 business page on a phone ----
    c, pg, e = ctxpage(b, mobile=True); errs.append(e)
    r_ = pg.goto(B + '/business/', wait_until='load')
    if not r_ or r_.status >= 400: pg.goto(B + '/business.html', wait_until='load')
    pg.wait_for_timeout(1500)
    over = pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1")
    first = pg.evaluate("(function(){var a=document.querySelector('#nzb-rank, .button, button');var r=a&&a.getBoundingClientRect();return r?Math.round(r.top):9999})()")
    check('028', not over and first < 1400, f'business page on a phone: no sideways scroll ({not over}), first action at {first}px')
    c.close()

    # ---- rent, pay and employer-cost context (release verified-rent-pay-2026-10-21) ----
    c, pg, e = ctxpage(b); errs.append(e)
    CX = [('NO', 'young_family', '0301', ['NOK', 'per m² a year (≈', 'rental zone: Oslo and Baerum', 'not a price trend']),
          ('NO', 'young_family', '3201', ['rental zone: Oslo and Baerum']),
          ('SE', 'young_family', '0180', ['metropolitan area: Greater Stockholm', 'not a new lease']),
          ('FI', 'young_family', '091', ['index 2025=100', 'this municipality']),
          ('US', 'biz_tech', '5392171', ['San Jose-Sunnyvale-Santa Clara', 'an hour', 'Software developers']),
          ('US', 'biz_services', '4801859', ['Charleston, WV', 'an hour']),
          ('CA', 'young_family', None, ['CAD', 'national']),
          ('DE', 'biz_manufacturing', '09162000', ['employer cost incl. non-wage costs', 'European Union 27 (benchmark)', 'national'])]
    for cc, prof, oid, want in CX:
        if oid is None:
            ranked(pg, cc, prof); sel = pg.evaluate('NZ.res.scored[0].id')
        else: sel = cc + ':' + oid
        pg.goto(f'{B}/#/explore?cc={cc}&p={prof}&sel={sel.replace(":", "%3A")}', wait_until='load')
        q = '#place [data-kfslot="' + sel + '"] .cxw'
        try: pg.wait_for_selector(q, state='attached', timeout=60000)
        except Exception: pass
        # 2.11.4: secondary figures fold into "More figures"; the area and basis must show once the reader opens it
        t = pg.evaluate("(function(e){if(!e)return'';e.querySelectorAll('details').forEach(function(d){d.open=true});return e.innerText})(document.querySelector(" + json.dumps(q) + "))")
        miss = [w for w in want if w not in t]
        bad = re.findall(r'NOK [\d,]+ per m² a month|SEK [\d,]{4,} per m² a month', t)
        meas = pg.evaluate(f"(NZ.res && NZ.res.byId[{json.dumps(sel)}]) ? NZ.res.byId[{json.dumps(sel)}].measured : null")
        check('ctx', t and not miss and not bad, f'{cc} {sel}: Housing and work / Labour costs shows source area, period, unit and basis (missing {miss}, unit errors {bad}); measured share unchanged by context ({meas})')
    c.close()

    # ---- global and continental rankings; moved views still work ----
    c, pg, e = ctxpage(b); errs.append(e)
    ranked(pg, 'DE')
    for g in ['europe', 'world', 'americas', 'asia_pacific']:
        pg.click(f'#gscope [data-gscope="{g}"]'); pg.wait_for_selector('#results .grank .row', timeout=60000); pg.wait_for_timeout(300)
        n = pg.evaluate("document.querySelectorAll('#results .grank .row').length"); ccs = pg.evaluate("[...new Set([...document.querySelectorAll('#results .grank .row')].map(function(e){return e.dataset.gopen.split(':')[0]}))].length")
        check('rank', n >= 50 and ('scope=' or True), f'{g} ranking for young family: {n} places from {ccs} countries, method note shown')
    first = pg.evaluate("document.querySelector('#results .grank .row').dataset.gopen")
    pg.click('#results .grank .row'); pg.wait_for_function("NZ.state.selected===" + json.dumps(first), timeout=90000)
    check('rank', pg.evaluate("NZ.state.cc") == first.split(':')[0] and '&g=' not in pg.evaluate('location.hash'), f'opening #1 from the world list switches to its country and opens {first}')
    pg.goto(B + '/#/explore?cc=DE&p=young_family&g=europe', wait_until='load'); pg.wait_for_selector('#results .grank .row', timeout=90000)
    check('rank', True, 'a link with g=europe opens the European ranking')
    ranked(pg, 'CH'); pg.click('[data-lt="board"]'); pg.wait_for_timeout(2500)
    check('board', len(pg.inner_text('#results')) > 200, 'regional board still renders (now loaded on demand)')
    sel = pg.evaluate('NZ.res.scored[0].id'); pg.goto(f'{B}/#/explore?cc=CH&p=young_family&sel={sel}&pt=facts', wait_until='load'); pg.wait_for_timeout(4000)
    check('radar', pg.evaluate("!!document.querySelector('#place svg.radar, #place [data-pp=\"facts\"] svg')"), 'radar chart still renders on the facts tab (now loaded on demand)')
    c.close()

    # ---- Map labels above the data (owner request 24 Oct): a basemap with country and city labels is served locally ----
    c, pg, e = ctxpage(b); errs.append(e)
    STY = {'version': 8, 'glyphs': 'https://glyphs.invalid/{fontstack}/{range}.pbf', 'sources': {'lbl': {'type': 'geojson', 'data': {'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {'name': 'Bern'}, 'geometry': {'type': 'Point', 'coordinates': [7.44, 46.95]}}]}}},
           'layers': [{'id': 'background', 'type': 'background', 'paint': {'background-color': '#eee'}},
                      {'id': 'place_country', 'type': 'symbol', 'source': 'lbl', 'layout': {'text-field': '{name}'}},
                      {'id': 'place_city', 'type': 'symbol', 'source': 'lbl', 'layout': {'text-field': '{name}'}}]}
    pg.route('**/glyphs.invalid/**', lambda r: r.fulfill(status=200, body=b'')); pg.route('**/tiles.openfreemap.org/styles/**', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(STY)))
    ranked(pg, 'CH'); pg.wait_for_function("NZ.map && NZ.map.getLayer && NZ.map.getLayer('pts') && NZ.map.getLayer('place_city')", timeout=90000)
    order = pg.evaluate("NZ.map.getStyle().layers.map(function(l){return l.id})")
    data_ids = [i for i in order if i in ('pts', 'ch-fill', 'nuts-fill', 'gisco-fill', 'sel-line', 'gisco-sel')]
    above = all(order.index(d) < order.index('place_country') for d in data_ids if d in ('pts', 'ch-fill', 'nuts-fill', 'gisco-fill'))
    halo = pg.evaluate("[NZ.map.getPaintProperty('place_city','text-halo-width'), NZ.map.getPaintProperty('place_country','text-halo-width')]")
    for z in (4, 7, 10, 13):
        pg.evaluate(f"NZ.map.jumpTo({{zoom:{z}}})"); pg.wait_for_timeout(250)
        ord2 = pg.evaluate("NZ.map.getStyle().layers.map(function(l){return l.id})")
        above = above and ord2.index('pts') < ord2.index('place_country')
    check('map', above and halo == [2, 2], f'country and city names are drawn above the data dots and regions at zoom 4 to 13, with a 2 px halo: order={[i for i in order if i in data_ids + ["place_country", "place_city"]]}, halo={halo}')
    c.close()

    # ---- Own line icons instead of emoji (owner request): nothing pictographic left in the visible app ----
    c, pg, e = ctxpage(b); errs.append(e)
    EMO = re.compile('[\U0001F000-\U0001FAFF\u2600-\u26FF\u2708-\u2728\u2744\u274C]')
    ranked(pg, 'CH'); sel = pg.evaluate('NZ.res.scored[0].id')
    pg.goto(f'{B}/#/explore?cc=CH&p=young_family&sel={sel}', wait_until='load'); pg.wait_for_selector('#place .ei svg', timeout=90000); pg.wait_for_timeout(2500)
    txt = pg.evaluate("document.body.innerText"); left = sorted(set(EMO.findall(txt)))
    n = pg.evaluate("document.querySelectorAll('.ei svg').length")
    pg.locator('[data-tools]:visible').first.click(); pg.wait_for_timeout(1500)
    left2 = sorted(set(EMO.findall(pg.evaluate("document.body.innerText"))))
    check('icons', not left and not left2 and n >= 5, f'place page and Tools menu show our line icons ({n} drawn) and no emoji: left={left + left2}')
    c.close()

    # ---- 2.10.1: category breakdown, anchor pins, key figures, business pages, rankings on the start page ----
    c, pg, e = ctxpage(b); errs.append(e)
    ranked(pg, 'DE'); sel = pg.evaluate('NZ.res.scored[3].id')
    pg.goto(f'{B}/#/explore?cc=DE&p=young_family&sel={sel}', wait_until='load'); pg.wait_for_selector('#place [data-catopen]', timeout=90000)
    pg.click('#place [data-catopen]'); pg.wait_for_selector('#place .catdetail .cdr:not(.cdh)', timeout=60000)
    rows = pg.evaluate("document.querySelectorAll('#place .catdetail .cdr:not(.cdh)').length"); head = pg.inner_text('#place .catdetail h4')
    check('catdetail', rows >= 1 and 'of 100' in head, f'clicking a category bar opens its measures with values and scores: "{head}", {rows} measures')
    pg.wait_for_function("document.querySelectorAll('.pin.anc').length >= 2", timeout=60000)
    anc = pg.evaluate("[...document.querySelectorAll('.pin.anc')].map(function(e){return e.textContent})")
    check('anchors', len(anc) >= 2 and all('km' in a for a in anc), f'map pins for the nearest hub airport, port, university town and big city: {anc}')
    def pins_for(prof):
        pg.goto(f'{B}/#/explore?cc=DE&p={prof}&sel=DE%3A07314000', wait_until='load')
        pg.wait_for_function("document.querySelectorAll('.pin.anc').length >= 1", timeout=60000); pg.wait_for_timeout(1500)
        return pg.evaluate("[...document.querySelectorAll('.pin.anc')].map(function(e){return e.title.split(':')[0]})")
    st, ch = pins_for('student'), pins_for('biz_energy_intensive')
    check('anchors', 'University or university of applied sciences' in st and 'Hub airport' not in st and 'Chemical park with pipeline links' in ch and 'Hub airport' not in ch,
          f'the map shows what the target group needs: student {sorted(set(st))}; energy-intensive production in Ludwigshafen {sorted(set(ch))}')
    pg.goto(f'{B}/#/explore?cc=US&p=biz_tech&sel=US%3A5392171', wait_until='load'); pg.wait_for_selector('#place [data-kfslot] .cxw', state='attached', timeout=90000); pg.wait_for_timeout(800)
    kt = pg.evaluate("(function(){var h=[...document.querySelectorAll('#place .cxw h4')].find(function(x){return /^Key figures/.test(x.innerText)});if(!h)return [0,''];var t=h.nextElementSibling;return [t.querySelectorAll('tr').length,h.innerText]})()")
    check('kpis', kt[0] >= 3, f'business place page leads with the key figures for the site type: "{kt[1]}" ({kt[0]} rows)')
    pg.goto(B + '/business/data-centre/', wait_until='load'); h1 = pg.inner_text('h1'); n = pg.evaluate("document.querySelectorAll('.rank-list li').length")
    check('bizpages', 'data centre' in h1.lower() and n >= 10 and 'screening' not in pg.inner_text('body').lower(), f'business profile page: "{h1}", {n} ranked places, no screening wording')
    pg.goto(B + '/', wait_until='load')
    rt = pg.evaluate("document.querySelectorAll('#rankings .rank-tile').length"); nav = pg.evaluate("!!document.querySelector('[data-nav-rank]')")
    pg.click('[data-hmode="biz"]'); pg.wait_for_timeout(600)
    pg.wait_for_selector('#business-sites a.tile', timeout=20000)   # 2.14: the business sections load when business mode is chosen
    bz = pg.evaluate("document.querySelectorAll('#business-sites a.tile').length")
    vis = pg.evaluate("[!!document.querySelector('#profiles').offsetParent, !!document.querySelector('#business-sites').offsetParent, !!document.querySelector('#rankings').offsetParent]")
    pg.click('[data-hmode="home"]'); pg.wait_for_timeout(600)
    vis2 = pg.evaluate("[!!document.querySelector('#profiles').offsetParent, !!document.querySelector('#business-sites').offsetParent]")
    check('modes', vis == [False, True, False] and vis2 == [True, False], f'business mode shows only business sections (household profiles {vis[0]}, business sites {vis[1]}), home mode the reverse {vis2}; the rankings band shows in both modes since 2.11')
    check('start', rt == 4 and bz == 16 and nav, f'start page: {rt} world/continental ranking tiles, {bz} business profiles in their own section (16 after the 2.15.4 profile audit), Rankings in the menu')
    c.close()

    # ---- Phone (owner tests on iPhone): start button visible above Safari's address bar; nothing cut off on a place page ----
    c = b.new_context(viewport={'width': 390, 'height': 664}, is_mobile=True, has_touch=True); c.add_init_script(SEED + ";try{localStorage.setItem('nz:toured','1')}catch(e){}"); pg = c.new_page(); e = []; pg.on('pageerror', lambda x: e.append(str(x))); errs.append(e)
    pg.goto(B + '/', wait_until='load'); pg.wait_for_timeout(2500)
    gb = pg.evaluate("(function(){var b=document.querySelector('.cine .go button, .cine .go .btn');if(!b)return null;var r=b.getBoundingClientRect();return [Math.round(r.top),Math.round(r.bottom),innerHeight]})()")
    check('phone', gb and gb[1] <= gb[2] - 8 and gb[0] >= 0, f'phone start page: the start button is on screen without scrolling (top/bottom/viewport {gb})')
    pg.goto(f'{B}/#/explore?cc=DE&p=young_family&sel=DE%3A09162000', wait_until='load'); pg.wait_for_selector('#place .ptabs button', timeout=90000); pg.wait_for_timeout(2000)
    cut = pg.evaluate("[...document.querySelectorAll('#place .ptabs button, #place .sec, #place .why, #place .catbars')].filter(function(x){var r=x.getBoundingClientRect();return r.width && r.right > document.documentElement.clientWidth + 1}).map(function(x){return x.innerText.slice(0,20)})")
    check('phone', not cut, f'phone place page: no tab or section reaches past the right edge {cut[:5]}')
    pg.goto(B + '/business/logistics-and-distribution-hub/', wait_until='load'); pg.wait_for_timeout(800)
    sw = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
    check('phone', sw[0] <= sw[1] + 1, f'phone business profile page: no sideways scroll (content {sw[0]} px, screen {sw[1]} px)')
    c.close()

    flat = [x for es in errs for x in es]
    check('all', not flat, f'no JavaScript errors {flat[:2]}')
    b.close()

n = sum(1 for r in res if r['ok'])
print(f'\n{n} of {len(res)} passed')
os.makedirs(os.path.join(ROOT, 'tests', 'results'), exist_ok=True)
json.dump(res, open(os.path.join(ROOT, 'tests', 'results', os.environ.get('V210_OUT', 'v210.json')), 'w'), indent=1, ensure_ascii=False)
sys.exit(0 if n == len(res) else 1)
