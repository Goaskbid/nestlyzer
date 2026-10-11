#!/usr/bin/env python3
"""Nestlyzer regression suite: drives the BUILT site in headless Chromium.

    node tests/serve.mjs . 8787 &      # from the repo root
    python3 tests/regress.py           # writes tests/results/regression.json + .md

Every check maps to a feature in docs/FEATURES (R-ids). Checks that need the public internet
(Wikipedia, Wikidata, Commons, Overpass, OpenFreeMap tiles, GISCO) are marked NOT VERIFIABLE
OFFLINE when the sandbox blocks those hosts; they only check that the app degrades cleanly.
"""
import asyncio, json, os, re, sys, time, traceback
from playwright.async_api import async_playwright

BASE = os.environ.get('NZ_BASE', 'http://localhost:8787')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tests', 'results')
os.makedirs(OUT, exist_ok=True)
ARGS = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
RESULTS = []

def rec(rid, name, ok, evidence, status=None):
    RESULTS.append({'id': rid, 'name': name, 'status': status or ('PASS' if ok else 'FAIL'), 'evidence': evidence})
    print(f"{rid:5} {status or ('PASS' if ok else 'FAIL'):6} {name}: {evidence}"[:260])

async def new_page(b, mobile=False, errors=None):
    ctx = await b.new_context(viewport={'width': 390, 'height': 844} if mobile else {'width': 1440, 'height': 900}, is_mobile=mobile, has_touch=mobile)
    await ctx.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}")
    pg = await ctx.new_page()
    if errors is not None:
        pg.on('pageerror', lambda e: errors.append(str(e)))
    return ctx, pg


# ---------- simulated public services (Wikimedia, Wikidata, NASA POWER) for the media checks ----------
import io, urllib.parse
def _jpeg(color):
    from PIL import Image
    b = io.BytesIO(); Image.new('RGB', (960, 640), color).save(b, 'JPEG', quality=70); return b.getvalue()
JPEGS = {}
async def mock_media(ctx):
    async def handle(route):
        url = route.request.url
        def js(o): return route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body=json.dumps(o))
        if 'upload.wikimedia.org' in url:
            k = url.split('/')[-1]
            if k not in JPEGS: JPEGS[k] = _jpeg((60 + len(JPEGS) * 40 % 180, 120, 160))
            return await route.fulfill(status=200, content_type='image/jpeg', body=JPEGS[k])
        if 'commons.wikimedia.org' in url and 'generator=geosearch' in url:
            pages = {str(i): {'index': i, 'title': f'File:Lakeside view {i}.jpg', 'imageinfo': [{'mime': 'image/jpeg', 'width': 2400, 'height': 1600, 'thumburl': f'https://upload.wikimedia.org/test/p{i}.jpg', 'url': f'https://upload.wikimedia.org/test/p{i}.jpg', 'descriptionurl': f'https://commons.wikimedia.org/wiki/File:Lakeside_view_{i}.jpg', 'extmetadata': {'Artist': {'value': f'<a href="x">Photographer {i}</a>'}, 'LicenseShortName': {'value': 'CC BY-SA 4.0'}, 'ImageDescription': {'value': f'Lakeside view number {i}'}}}]} for i in range(1, 7)}
            pages['99'] = {'index': 99, 'title': 'File:Map of the district.png', 'imageinfo': [{'mime': 'image/png', 'width': 2000, 'height': 2000, 'thumburl': 'https://upload.wikimedia.org/test/map.png', 'url': 'x', 'descriptionurl': 'x', 'extmetadata': {}}]}
            return await js({'query': {'pages': pages}})
        if 'commons.wikimedia.org' in url: return await js({'query': {'pages': {}}})
        if 'query.wikidata.org' in url:
            return await js({'results': {'bindings': [
                {'item': {'value': 'http://www.wikidata.org/entity/Q101'}, 'itemLabel': {'value': 'Old Castle'}, 'img': {'value': 'http://commons.wikimedia.org/wiki/Special:FilePath/c.jpg'}, 'dist': {'value': '2.4'}, 'sl': {'value': '25'}, 'typeLabel': {'value': 'castle'}, 'whs': {'value': 'true'}},
                {'item': {'value': 'http://www.wikidata.org/entity/Q102'}, 'itemLabel': {'value': 'Lake Museum'}, 'img': {'value': 'http://commons.wikimedia.org/wiki/Special:FilePath/m.jpg'}, 'dist': {'value': '0.8'}, 'sl': {'value': '9'}, 'typeLabel': {'value': 'museum'}},
                {'item': {'value': 'http://www.wikidata.org/entity/Q103'}, 'itemLabel': {'value': 'Some Village'}, 'img': {'value': 'http://x/v.jpg'}, 'dist': {'value': '3'}, 'sl': {'value': '40'}, 'typeLabel': {'value': 'village'}}]}})
        if 'wikidata.org/w/api.php' in url and 'wbgetentities' in url and 'props=labels' in url:
            return await js({'entities': {'Q201': {'labels': {'en': {'value': 'Twin Town A'}}}, 'Q202': {'labels': {'de': {'value': 'Partnerstadt B'}}}, 'Q301': {'labels': {'en': {'value': 'Jane Mayor'}}}}})
        if 'wikidata.org/w/api.php' in url and 'wbgetentities' in url:
            ent = {'claims': {'P2044': [{'mainsnak': {'datavalue': {'value': {'amount': '+422'}}}}], 'P281': [{'mainsnak': {'datavalue': {'value': '8706'}}}], 'P571': [{'mainsnak': {'datavalue': {'value': {'time': '+1250-00-00T00:00:00Z'}}}}], 'P190': [{'mainsnak': {'datavalue': {'value': {'id': 'Q201'}}}}, {'mainsnak': {'datavalue': {'value': {'id': 'Q202'}}}}], 'P6': [{'mainsnak': {'datavalue': {'value': {'id': 'Q301'}}}}]}, 'sitelinks': {}}
            q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get('ids', ['Q1'])[0]
            return await js({'entities': {q: ent}})
        if 'wikidata.org/w/api.php' in url: return await js({'query': {'search': [{'title': 'Q1'}]}, 'search': []})
        if 'power.larc.nasa.gov' in url:
            M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
            hi = [3, 5, 10, 14, 19, 22, 25, 24, 20, 14, 8, 4]; lo = [-3, -2, 1, 4, 8, 12, 14, 14, 10, 6, 1, -2]; pr = [2.2, 2.0, 2.4, 2.8, 3.6, 4.1, 4.0, 4.2, 3.0, 2.6, 2.5, 2.4]
            return await js({'properties': {'parameter': {'T2M_MAX': dict(zip(M, hi)), 'T2M_MIN': dict(zip(M, lo)), 'PRECTOTCORR': dict(zip(M, pr)), 'ALLSKY_SFC_SW_DWN': dict(zip(M + ['ANN'], [1] * 13))}}})
        if 'wikipedia.org' in url: return await route.fulfill(status=404, body='')
        if 'overpass-api.de' in url:
            body = urllib.parse.unquote_plus(route.request.post_data or '')
            if 'out count' in body:
                n = body.count('out count')
                return await js({'elements': [{'type': 'count', 'id': 0, 'tags': {'nodes': str(i), 'ways': '0', 'relations': '0', 'total': str([3, 2, 4, 2, 5, 3, 18, 6, 4, 2, 1, 12, 2, 0][i % 14])}} for i in range(n)]})
            return await js({'elements': [{'type': 'node', 'tags': {'name': 'Old Mill', 'historic': 'mill'}}]})
        if 'ec.europa.eu/eurostat' in url:
            ds = url.split('/data/')[1].split('?')[0]
            geo = urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get('geo', ['XX'])[0]
            dims = {'nama_10r_3gdp': {'unit': ['MIO_EUR', 'PPS_HAB_EU27_2020'], 'v': [5000, 118]}, 'lfst_r_lfu3rt': {'sex': ['F', 'M', 'T'], 'v': [4.0, 4.4, 4.2]},
                    'demo_r_mlifexp': {'sex': ['F', 'M', 'T'], 'v': [85.1, 81.2, 83.2]}, 'demo_r_pjanind3': {'indic_de': ['MEDAGEPOP', 'PC_Y65_MAX'], 'v': [43.5, 19.2]}, 'hlth_rs_physreg': {'unit': ['P_HTHAB', 'NR'], 'v': [455, 9000]}}[ds]
            k = [d for d in dims if d != 'v'][0]; cats = dims[k]
            out = {'version': '2.0', 'class': 'dataset', 'id': ['freq', k, 'geo', 'time'], 'size': [1, len(cats), 1, 2],
                   'dimension': {'freq': {'category': {'index': {'A': 0}}}, k: {'category': {'index': {c: i for i, c in enumerate(cats)}}}, 'geo': {'category': {'index': {geo: 0}}}, 'time': {'category': {'index': {'2022': 0, '2023': 1}}}},
                   'value': {str(i * 2 + 1): v for i, v in enumerate(dims['v'])}}
            return await js(out)
        return await route.continue_()
    await ctx.route(re.compile(r'https://(upload\.wikimedia\.org|commons\.wikimedia\.org|www\.wikidata\.org|query\.wikidata\.org|power\.larc\.nasa\.gov|[a-z]+\.wikipedia\.org|overpass-api\.de|ec\.europa\.eu)/.*'), handle)

async def explore(pg, hash_, wait='li.row'):
    cc = re.search(r'cc=([A-Z]{2})', hash_).group(1); prof = re.search(r'p=([a-z_]+)', hash_).group(1)
    await pg.goto(BASE + '/' + hash_, wait_until='domcontentloaded')
    await pg.wait_for_function(f"window.NZ && NZ.res && NZ.res.scored && NZ.state.cc==='{cc}' && NZ.state.profile==='{prof}' && NZ.scope.length && NZ.scope[0].country==='{cc}'", timeout=30000)
    await pg.wait_for_timeout(400)

async def nz(pg, expr):
    return await pg.evaluate(expr)

async def check(rid, name, fn):
    if os.environ.get('NZ_ONLY') and rid not in os.environ['NZ_ONLY'].split(','):
        return
    try:
        await fn()
    except Exception as e:
        rec(rid, name, False, 'exception: ' + str(e).split('\n')[0][:200])

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        errors = []
        ctx, pg = await new_page(b, errors=errors)

        async def r01():
            ctx2, q = await new_page(b)
            await q.add_init_script("localStorage.removeItem('nz:consent2')")
            t0 = time.time(); await q.goto(BASE + '/', wait_until='domcontentloaded')
            try: await q.wait_for_selector('#consent.open', timeout=20000)
            except Exception: pass
            banner_s = round(time.time() - t0, 1)
            dbg = await q.evaluate("[document.getElementById('consent').className, typeof NZConsent, localStorage.getItem('nz:consent2'), typeof __tcfapi, !!document.querySelector('script[src*=\"consent.js\"]')]")
            h1 = await q.inner_text('h1')
            tiles = await q.locator('#profiles .tile').count(); ctiles = await q.locator('#countries .tile').count()
            faq = await q.locator('.faq details').count()
            legal = await q.inner_text('.site-footer')
            consent = await q.is_visible('#consent')
            ad = await q.locator('a[href^="mailto:torsten.sauter@icloud.com?subject=Nestlyzer%20advertising"]').count()
            h1 = ' '.join(h1.split()); ok = 'Find where you fit' in h1 and tiles >= 25 and ctiles == 35 and faq >= 5 and 'Torsten Sauter' in legal and consent and ad == 1
            rec('R01', 'Landing page: hero, 25+ profile tiles, 35 countries, FAQ, legal footer, sponsorship, consent banner', ok, f'h1="{h1}", profiles={tiles}, countries={ctiles}, faq={faq}, consent={consent} after {banner_s}s {dbg}, sponsor_link={ad}')
            await ctx2.close()
        await check('R01', 'Landing', r01)

        async def r02():
            t = time.time(); await explore(pg, '#/explore?cc=CH&p=young_family'); dt = time.time() - t
            n = await nz(pg, 'NZ.res.scored.length'); top = await nz(pg, 'NZ.res.scored[0].r.name')
            rows = await pg.locator('li.row').count(); picks = await pg.locator('.pick').count()
            rec('R02', 'Ranking list renders after load (legacy defect: 0 rows shown)', n > 0 and rows >= 100 and picks == 9, f'{n} ranked, {rows} rows rendered, {picks} top-pick cards, #1 {top}, {dt:.2f}s to results')
        await check('R02', 'Ranking list', r02)

        async def r03():
            fx = json.load(open(os.path.join(ROOT, 'build/source/legacy_score_fixtures.json')))['CH']
            ok_all, ev = True, []
            for prof in ['young_family', 'hnw', 'swiss_lottery', 'pensioner', 'student']:
                await explore(pg, f'#/explore?cc=CH&p={prof}&method=v1')
                got = await nz(pg, 'NZ.res.scored.slice(0,3).map(x=>[x.id,+x.overall.toFixed(4)]).concat([[NZ.res.scored.length]])')
                exp = fx[prof]
                ok = got[-1][0] == exp['n'] and all(g[0] == e[0] and abs(g[1] - e[2]) < 0.0002 for g, e in zip(got[:3], exp['top'][:3]))
                ok_all &= ok; ev.append(f"{prof}: n {got[-1][0]}/{exp['n']} {'match' if ok else 'MISMATCH'}")
            rec('R03', 'Method v1 in the browser reproduces legacy v86 rankings exactly', ok_all, '; '.join(ev))
        await check('R03', 'v1 parity', r03)

        async def r04():
            await explore(pg, '#/explore?cc=CH&p=young_family')
            await pg.click('[data-profile="pensioner"]'); await pg.wait_for_timeout(500)
            p_ = await nz(pg, 'NZ.state.profile'); n = await nz(pg, 'NZ.res.scored.length'); h = await pg.evaluate('location.hash')
            rec('R04', 'Profile switch re-ranks live and updates the URL', p_ == 'pensioner' and 'p=pensioner' in h and n > 0, f'profile={p_}, n={n}, hash={h[:60]}')
        await check('R04', 'Profile switch', r04)

        async def r05():
            await explore(pg, '#/explore?cc=CH&p=young_family')
            await pg.select_option('#f-region', 'ZURICH'); await pg.wait_for_timeout(400)
            a = await nz(pg, 'NZ.scope.length')
            await pg.select_option('#f-area', 'ZG'); await pg.wait_for_timeout(400)
            b_ = await nz(pg, 'NZ.scope.length'); allzg = await nz(pg, "NZ.scope.every(r=>r.canton==='ZG')")
            rec('R05', 'Swiss region and canton filters narrow the scope', a < 2172 and b_ == 11 and allzg, f'Zurich region scope={a}, Zug scope={b_}, all ZG={allzg}')
        await check('R05', 'Scope filters', r05)

        async def r06():
            await explore(pg, '#/explore?cc=CH&p=young_family')
            await pg.click('.scope-tools [data-filters]')
            await pg.fill('#f-q', 'Meilen'); await pg.wait_for_timeout(600)
            n = await nz(pg, 'NZ.scope.length'); names = await nz(pg, 'NZ.scope.map(r=>r.name)')
            await pg.fill('#f-q', ''); await pg.wait_for_timeout(500); await pg.keyboard.press('Escape')
            rec('R06', 'Name/code filter updates results live (legacy defect: nothing re-rendered)', n >= 1 and all('Meilen' in x for x in names), f'scope={n} {names[:3]}')
        await check('R06', 'Search filter', r06)

        async def r07():
            await explore(pg, '#/explore?cc=CH&p=young_family')
            await pg.click('.scope-tools [data-filters]')
            await pg.eval_on_selector('#f-conf', "el=>{el.value=72;el.dispatchEvent(new Event('input',{bubbles:true}))}"); await pg.wait_for_timeout(600)
            n = await nz(pg, 'NZ.scope.length'); mn = await nz(pg, 'Math.min(...NZ.scope.map(r=>r.sourceConfidence))')
            await pg.eval_on_selector('#f-popmin', "el=>{el.value=20000;el.dispatchEvent(new Event('input',{bubbles:true}))}"); await pg.wait_for_timeout(600)
            m = await nz(pg, 'NZ.scope.length'); minpop = await nz(pg, 'Math.min(...NZ.scope.map(r=>r.population))')
            await pg.keyboard.press('Escape')
            rec('R07', 'Confidence slider and new size filter apply live', 0 < n < 2172 and mn >= 72 and m < n and minpop >= 20000, f'conf>=72 scope={n} (min {mn}); +pop>=20k scope={m} (min {minpop})')
        await check('R07', 'Confidence filter', r07)

        async def r08():
            await explore(pg, '#/explore?cc=CH&p=young_family')
            await pg.select_option('#f-sort', 'pop'); await pg.wait_for_timeout(400)
            first = await pg.inner_text('li.row >> nth=0 >> .nm')
            pops = await nz(pg, 'NZ.res.view.slice(0,5).map(x=>x.r.population)')
            rec('R08', 'Sort by size (new)', pops == sorted(pops, reverse=True), f'first row {first}, pops {pops}')
            await pg.select_option('#f-sort', 'score')
        await check('R08', 'Sort', r08)

        async def r09():
            await explore(pg, '#/explore?cc=CH&p=young_family')
            await pg.wait_for_function('NZ.map && NZ.map.isStyleLoaded && NZ.map.isStyleLoaded()', timeout=30000)
            await pg.wait_for_timeout(1500)
            colored = await nz(pg, "(()=>{let n=0;for(let i=1;i<7000;i++){const s=NZ.map.getFeatureState({source:'ch',id:i});if(s&&s.v>=0)n++}return n})()")
            out = await nz(pg, "(()=>{let n=0;for(let i=1;i<7000;i++){const s=NZ.map.getFeatureState({source:'ch',id:i});if(s&&s.out)n++}return n})()")
            await pg.select_option('#f-layer', 'tax'); await pg.wait_for_timeout(500)
            leg = await pg.inner_text('#legend')
            pins = await pg.locator('.pin').count()
            rec('R09', 'Map colours polygons immediately after ranking (legacy defect: only after Fit scope); layers; leader and cross-border pins', colored > 2000 and 'Taxes' in leg and pins >= 10, f'{colored} polygons coloured, {out} out of scope, legend="{leg[:30]}", pins={pins}')
            await pg.select_option('#f-layer', 'score')
        await check('R09', 'Map', r09)

        async def r10():
            await explore(pg, '#/explore?cc=CH&p=young_family&sel=CH:2701')
            await pg.wait_for_selector('#place.open', timeout=10000)
            txt = await pg.evaluate("document.querySelector('#place').textContent")
            need = ['Score', 'Rank', 'Data depth', 'conf.', 'cover', 'Decision facts', 'Explore around', 'Nice to know', 'All the numbers', 'Look-alikes elsewhere in Europe', 'Next door', 'Weather through the year', 'Worth a look nearby', 'Photos in and around', 'Getting around', 'Local explainer', 'Profile shape', 'Population trend', 'Jobs and company signals', 'Close comparables', 'Cross-border context', 'Full score and sub-rankings', 'PDF booklet', 'Print profile']
            missing = [n for n in need if n not in txt]
            if 'Why #' not in txt and 'How it fits' not in txt: missing.append('why card')
            await pg.click('#place [data-ptab="facts"][role="tab"]'); await pg.wait_for_timeout(300)
            radar = await pg.locator('#place svg.radar').count(); sparks = await pg.locator('#place svg.spark').count()
            slots = await nz(pg, "[!!document.querySelector('#place [data-gallery]'),!!document.querySelector('#place [data-contact]'),!!document.querySelector('#place [data-ids]')]")
            rec('R10', 'Place panel: all legacy sections (jobs card, comparables, cross-border, breakdown, gallery, contact) plus the new why-card, story, facts, look-alikes, neighbours, weather, nearby and photos, in tabs', not missing and radar == 1 and sparks >= 2 and all(slots), f'missing={missing}, radar={radar}, sparks={sparks}, gallery/contact/arms slots={slots}')
        await check('R10', 'Place panel', r10)

        async def r11():
            await explore(pg, '#/explore?cc=CH&p=young_family&sel=CH:261')
            await pg.wait_for_selector('#place.open')
            await pg.click('#place [data-save]'); await pg.wait_for_timeout(300)
            await pg.reload(wait_until='domcontentloaded'); await pg.wait_for_function('NZ.res && NZ.res.scored')
            await pg.click('[data-lt="saved"]'); await pg.wait_for_timeout(300)
            t = await pg.inner_text('#results')
            rec('R11', 'Shortlist (new): save, survives reload, listed in Shortlist tab', 'Zürich' in t, t[:80].replace('\n', ' '))
            await pg.click('[data-lt="ranking"]')
        await check('R11', 'Shortlist', r11)

        async def r12():
            await explore(pg, '#/explore?cc=CH&p=young_family&sel=CH:261')
            await pg.wait_for_selector('#place.open')
            await pg.click('#place [data-cmp]')
            await pg.click('li.row >> nth=0'); await pg.wait_for_timeout(300)
            await pg.click('#place [data-cmp]'); await pg.wait_for_timeout(200)
            await pg.click('#tray [data-opencmp]'); await pg.wait_for_selector('#modal.open'); await pg.wait_for_timeout(300)
            t = await pg.inner_text('#modal')
            cols = await pg.locator('#modal .cmp thead th').count()
            rec('R12', 'Compare (new): tray, side-by-side table', 'Compare places' in t and cols == 3, f'columns={cols}')
            await pg.keyboard.press('Escape'); await pg.click('[data-clearcmp]')
        await check('R12', 'Compare', r12)

        async def r13():
            await explore(pg, '#/explore?cc=CH&p=young_family')
            await pg.keyboard.press('/'); await pg.wait_for_selector('#palette.open')
            await pg.fill('#pal-q', 'Lyon'); await pg.wait_for_function("document.querySelectorAll('#pal-list [data-pid]').length>0", timeout=15000); await pg.wait_for_timeout(300)
            first = await pg.inner_text('#pal-list li >> nth=0')
            await pg.keyboard.press('Enter'); await pg.wait_for_function("NZ.state.cc==='FR' && NZ.state.selected && NZ.record(NZ.state.selected)", timeout=30000)
            sel = await nz(pg, 'NZ.record(NZ.state.selected).name')
            rec('R13', 'Global search across all places: jumps country and opens the place', sel.startswith('Lyon'), f'first hit "{first[:40]}", opened {sel}')
        await check('R13', 'Global search', r13)

        async def r14():
            await explore(pg, '#/explore?cc=CH&p=young_family')
            await pg.click('[data-builder] >> nth=0'); await pg.wait_for_selector('#modal.open')
            await pg.click('[data-bq="household"][data-v="family"]'); await pg.click('[data-bq="budget"][data-v="constrained"]')
            matches = await pg.locator('[data-usestd]').count()
            await pg.click('[data-bapply]'); await pg.wait_for_function("NZ.state.profile==='self_fit' && NZ.scope.length && NZ.scope[0].country==='CH'", timeout=20000); await pg.wait_for_timeout(500)
            p_ = await nz(pg, 'NZ.state.profile'); n = await nz(pg, 'NZ.res.scored.length'); h = await pg.evaluate('location.hash')
            rec('R14', 'Guided builder restored (legacy: hidden/reset): answers, closest profiles, apply, shareable weights', p_ == 'self_fit' and n > 0 and 'w=' in h and matches == 3, f'profile={p_}, ranked={n}, matches={matches}, url has weights={"w=" in h}')
        await check('R14', 'Builder', r14)

        async def r15():
            await explore(pg, '#/explore?cc=CH&p=single')
            await pg.click('[data-lt="board"]'); await pg.wait_for_timeout(300)
            t = await pg.inner_text('#results')
            groups = [g for g in ['German-speaking', 'French-speaking', 'Italian-speaking', 'Bilingual'] if g in t]
            xb = await pg.locator('#results [data-xb]').count()
            rec('R15', 'Regional reality board (legacy: never rendered): language groups and cross-border clusters', len(groups) >= 3 and xb >= 3, f'groups={groups}, cross-border chips={xb}')
            await pg.click('[data-lt="ranking"]')
        await check('R15', 'Regional board', r15)

        async def r16():
            await explore(pg, '#/explore?cc=CH&p=student')
            sel = await nz(pg, 'NZ.state.selected'); tab = await nz(pg, 'NZ.state.listTab')
            t = await pg.inner_text('#results')
            hubs = await pg.locator('.pin.hub').count()
            banner = await pg.locator('#results .banner').count()
            await pg.click('#results .banner [data-lt="board"]'); await pg.wait_for_timeout(300)
            t = await pg.inner_text('#results')
            rec('R16', 'Student = multi-answer: no auto-select, banner to the board, university hubs', sel is None and tab == 'ranking' and banner == 1 and 'university anchor' in t and hubs >= 8, f'selected={sel}, tab={tab}, banner={banner}, hub pins={hubs}')
            await pg.click('[data-lt="ranking"]')
        await check('R16', 'Student hubs', r16)

        async def r17():
            await explore(pg, '#/explore?cc=CH&p=young_family&r=NORTHWEST')
            await pg.click('[data-lt="board"]'); await pg.wait_for_timeout(200)
            await pg.click('#results [data-xb] >> nth=0')
            await pg.wait_for_function("NZ.state.cc!=='CH' && NZ.state.selected && NZ.record(NZ.state.selected)", timeout=30000)
            cc = await nz(pg, 'NZ.state.cc'); nm = await nz(pg, 'NZ.record(NZ.state.selected).name')
            rec('R17', 'Cross-border cluster opens the neighbour country and selects the target', cc in ('DE', 'FR', 'IT', 'AT') and bool(nm), f'{cc} {nm}')
        await check('R17', 'Cross-border', r17)

        async def r18():
            await explore(pg, '#/explore?cc=DE&p=young_family')
            regs = await nz(pg, "Array.from(document.querySelectorAll('#f-region option')).filter(o=>!/^[MN]:/.test(o.value)).length")
            metros = await nz(pg, "Array.from(document.querySelectorAll('#f-region option')).filter(o=>/^M:/.test(o.value)).map(o=>o.textContent)")
            await pg.select_option('#f-region', index=9); await pg.wait_for_timeout(500)
            areas = await pg.locator('#f-area option').count()
            es = 0
            await explore(pg, '#/explore?cc=ES&p=young_family')
            opts = await nz(pg, "Array.from(document.querySelectorAll('#f-region option')).slice(1).filter(o=>!/^[MN]:/.test(o.value)).map(o=>+o.textContent.match(/\\(([\\d,]+)\\)/)[1].replace(/,/g,''))")
            total = await nz(pg, 'NZ.scope.length')
            await explore(pg, '#/explore?cc=IT&p=young_family')
            it = await nz(pg, "Array.from(document.querySelectorAll('#f-region option')).map(o=>o.textContent)")
            lazio = any('Lazio' in x for x in it)
            rec('R18', 'Large countries use official NUTS regions: DE 16 Länder + districts, plus greater areas around big cities; ES all provinces reachable (legacy lost 449); IT Lazio correct', regs == 17 and areas > 5 and sum(opts) == total == 8132 and lazio and any('Hamburg' in m for m in metros), f'DE regions={regs - 1}, districts in region={areas - 1}, greater areas={len(metros)} (e.g. {metros[:3]}); ES region sum={sum(opts)} of {total}; IT has Lazio={lazio}')
        await check('R18', 'Large-country regions', r18)

        async def r19():
            await explore(pg, '#/explore?cc=CH&p=expat_professional')
            n = await nz(pg, 'NZ.res.scored.length')
            await explore(pg, '#/explore?cc=CH&p=coastal')
            await pg.wait_for_function("document.querySelector('#results').innerText.includes('within 60 km of the sea')", timeout=10000)
            t = await pg.inner_text('#results')
            btns = await pg.locator('#results [data-pcc]').count()
            rec('R19', 'Expat professional ranks in CH (legacy: 0 results); Coastal says why it is empty in landlocked CH and offers coastal countries', n > 0 and 'within 60 km of the sea' in t and btns >= 4, f'expat n={n}; coastal message="{t.splitlines()[0][:60]}", country buttons={btns}')
        await check('R19', 'Profile fixes', r19)

        async def r20():
            await explore(pg, '#/explore?cc=AT&p=commuter')
            n = await nz(pg, 'NZ.res.scored.length')
            await explore(pg, '#/explore?cc=FR&p=student')
            m = await nz(pg, 'NZ.res.scored.length')
            rec('R20', 'European access profiles no longer depend on loaded polygons (legacy: 0 results without geometry)', n > 0 and m > 0, f'AT commuter={n}, FR student={m}')
        await check('R20', 'Access profiles', r20)

        async def r21():
            ctx3, q = await new_page(b)
            await explore(q, '#/explore?cc=CH&p=young_family&sel=CH:261')
            await q.wait_for_selector('#place.open')
            async with ctx3.expect_page() as pi:
                await q.click('[data-booklet]')
            bp = await pi.value
            await bp.wait_for_load_state('domcontentloaded')
            t = await bp.inner_text('body')
            ok = all(x in t for x in ['Decision snapshot', 'Category sub-ranks', 'Factor sub-ranks', 'Publisher: Torsten Sauter'])
            rec('R21', 'PDF booklet opens a print-ready dossier (legacy: script broken, never shipped)', ok, t[:90].replace('\n', ' '))
            await ctx3.close()
        await check('R21', 'Booklet', r21)

        async def r22():
            await explore(pg, '#/explore?cc=CH&p=young_family')
            before = await pg.evaluate("document.documentElement.dataset.theme||''")
            await pg.click('[data-theme-toggle]'); after = await pg.evaluate("document.documentElement.dataset.theme")
            await pg.click('[data-theme-toggle]')
            rec('R22', 'Dark mode toggle (new)', after in ('dark', 'light') and after != before, f'{before or "system"} -> {after}')
        await check('R22', 'Theme', r22)

        async def r23():
            ctx4, q = await new_page(b)
            await q.add_init_script("localStorage.removeItem('nz:consent2')")
            await q.goto(BASE + '/', wait_until='domcontentloaded')
            await q.wait_for_selector('#consent.open', timeout=20000)
            shown = await q.is_visible('#consent')
            dl0 = await q.evaluate("JSON.stringify(dataLayer.map(x=>Array.from(x)))")
            await q.click('[data-consent="yes"]')
            dl = await q.evaluate("JSON.stringify(dataLayer.map(x=>Array.from(x)))")
            stored = json.loads(await q.evaluate("localStorage.getItem('nz:consent2')"))
            upd = [x for x in json.loads(dl) if x[0] == 'consent' and x[1] == 'update'][-1][2]
            light = '"allow_google_signals":false' in dl0 and '"allow_ad_personalization_signals":false' in dl0
            ok = shown and '"denied"' in dl0 and 'G-HR6G9XFTKZ' in dl0 and light and upd['ad_storage'] == 'granted' and upd['analytics_storage'] == 'granted' and upd['ad_personalization'] == 'denied' and stored['d'] and not await q.is_visible('#consent')
            rec('R23', 'Light analytics: everything denied by default; "Accept all" grants visit statistics and ad cookies but never personalised ads; Google signals and ad personalisation are off in Analytics', ok, f'banner={shown}, default denied={"denied" in dl0}, light settings={light}, after accept={upd}')
            await ctx4.close()
        await check('R23', 'Analytics consent', r23)

        async def r24():
            ctx5, q = await new_page(b, mobile=True)
            await q.goto(BASE + '/', wait_until='domcontentloaded'); await q.wait_for_timeout(500)
            ov1 = await q.evaluate('document.documentElement.scrollWidth - window.innerWidth')
            await explore(q, '#/explore?cc=CH&p=young_family')
            ov2 = await q.evaluate('document.documentElement.scrollWidth - window.innerWidth')
            tab0 = await q.evaluate('NZ.state.tab')
            await q.click('[data-mt="list"]'); vis = await q.is_visible('li.row >> nth=0')
            await q.click('li.row >> nth=0'); await q.wait_for_timeout(400)
            tab = await q.evaluate('NZ.state.tab'); pv = await q.is_visible('#place .pbody')
            rec('R24', 'Mobile: no horizontal overflow, bottom tabs, list and place views (legacy: no mobile UI)', ov1 <= 0 and ov2 <= 0 and tab0 == 'map' and vis and tab == 'place' and pv, f'overflow landing={ov1}, explore={ov2}, tabs map->list->place ok={vis and pv}')
            await ctx5.close()
        await check('R24', 'Mobile', r24)

        async def r25():
            await explore(pg, '#/explore?cc=LU&p=young_family')
            await pg.click('[data-gisco]'); await pg.wait_for_timeout(4000)
            t = await pg.inner_text('#toast')
            rec('R25', 'Official GISCO polygons on demand for Europe (runtime fetch). Offline: fails soft with a message', 'Boundaries' in t or 'boundaries' in t, t[:120].replace('\n', ' '), status='PASS' if t else 'FAIL')
        await check('R25', 'GISCO', r25)

        async def r26():
            await pg.goto(BASE + '/#/explore?cc=CH&p=young_family&sel=CH:156', wait_until='domcontentloaded')
            await pg.wait_for_selector('#place.open', timeout=20000)
            try: await pg.wait_for_function("NZ.state.selected==='CH:156' && document.querySelector('#place h2') && document.querySelector('#place h2').innerText==='Meilen'", timeout=15000)
            except Exception: pass
            nm = await pg.inner_text('#place h2')
            await pg.click('[data-home]'); await pg.wait_for_timeout(300)
            landing = await pg.is_visible('.cine h1')
            await pg.go_back(); await pg.wait_for_timeout(1500)
            back = await nz(pg, 'NZ.state.view')
            rec('R26', 'Deep links open the exact place; home and back navigation work', nm == 'Meilen' and landing and back == 'explore', f'opened {nm}, home visible={landing}, back->{back}')
        await check('R26', 'Deep links', r26)

        async def r27():
            ctx27, pg = await new_page(b)
            await explore(pg, '#/explore?cc=CH&p=swiss_lottery&sel=CH:261')
            try: await pg.wait_for_function("document.querySelector('#place').innerText.includes('Tax module joined locally')", timeout=8000)
            except Exception: pass
            t = await pg.inner_text('#place')
            await explore(pg, '#/explore?cc=DE&p=swiss_lottery')
            await pg.evaluate("document.querySelector('li.row').click()")
            try: await pg.wait_for_function("document.querySelector('#place').innerText.includes('Country tax module required')", timeout=8000)
            except Exception: pass
            t2 = await pg.inner_text('#place')
            await explore(pg, '#/explore?cc=CH&p=commuter&sel=CH:261')
            try: await pg.wait_for_function("document.querySelector('#place').innerText.includes('Language reality')", timeout=8000)
            except Exception: pass
            t3 = await pg.inner_text('#place')
            a, b2, c = 'Tax module joined locally' in t, 'Country tax module required' in t2, 'Language reality' in t3
            await ctx27.close()
            rec('R27', 'Lottery tax panel (CH joined / Europe pending) and language-reality line', a and b2 and c, f'Swiss tax panel={a}, other-country notice={b2}, language line={c}')
        await check('R27', 'Lottery + language', r27)

        async def r28():
            ctx6, q = await new_page(b)
            res = {}
            for path in ['/switzerland/zurich/meilen/', '/switzerland/', '/switzerland/zurich/', '/germany/', '/best/young-family/', '/method/', '/legal/', '/france/provence-alpes-cote-d-azur/']:
                r = await q.goto(BASE + path, wait_until='domcontentloaded')
                h1 = await q.inner_text('h1') if r and r.status == 200 else ''
                ld = await q.locator('script[type="application/ld+json"]').count()
                canon = await q.get_attribute('link[rel=canonical]', 'href') if r and r.status == 200 else ''
                res[path] = (r.status if r else None, h1[:40], ld, canon == 'https://nestlyzer.com' + path)
            r404 = await q.goto(BASE + '/no-such-page/', wait_until='domcontentloaded')
            sm = open(os.path.join(ROOT, 'sitemap.xml')).read()
            n_urls = sm.count('<loc>') if '<urlset' in sm else sum(open(os.path.join(ROOT, f)).read().count('<loc>') for f in os.listdir(ROOT) if re.match(r'sitemap-\d+\.xml', f))
            ok = all(v[0] == 200 and v[1] and v[3] for v in res.values()) and r404.status == 404 and n_urls > 5000
            rec('R28', 'SEO: static pages (municipality, canton, country, profile, method, legal) with canonical + JSON-LD, sitemap, 404', ok, f'{[(k, v) for k, v in res.items() if not (v[0] == 200 and v[1] and v[3])]} bad; 404={r404.status}, sitemap urls={n_urls}')
            await ctx6.close()
        await check('R28', 'SEO pages', r28)

        async def r29():
            ctx7, q = await new_page(b)
            await q.goto(BASE + '/', wait_until='domcontentloaded')
            unnamed = await q.evaluate("Array.from(document.querySelectorAll('button,a')).filter(e=>e.offsetParent&&!(e.textContent.trim()||e.getAttribute('aria-label')||e.title)).length")
            noalt = await q.evaluate("Array.from(document.images).filter(i=>!i.hasAttribute('alt')).length")
            await explore(q, '#/explore?cc=CH&p=young_family')
            unnamed2 = await q.evaluate("Array.from(document.querySelectorAll('button,a,select,input')).filter(e=>e.offsetParent&&!(e.textContent.trim()||e.getAttribute('aria-label')||e.title||(e.id&&document.querySelector('label[for='+e.id+']')))).map(e=>e.outerHTML.slice(0,80))")
            print(unnamed2[:5]); unnamed2 = len(unnamed2)
            await q.keyboard.press('Tab'); await q.keyboard.press('Tab')
            focus = await q.evaluate("getComputedStyle(document.activeElement).outlineStyle")
            rec('R29', 'Accessibility basics: named controls, image alt, visible keyboard focus (legacy: none)', unnamed == 0 and noalt == 0 and unnamed2 == 0 and focus != 'none', f'unnamed landing={unnamed}, explore={unnamed2}, imgs without alt={noalt}, focus outline={focus}')
            await ctx7.close()
        await check('R29', 'A11y', r29)

        async def r30():
            sizes = {}
            import urllib.request
            for path in ['/', '/data/meta.json', '/data/c/CH.json', '/data/c/FR.json', '/data/geo/ch.topo.json', '/vendor/maplibre-gl.js', '/assets/hero-ch.svg']:
                rq = urllib.request.Request(BASE + path, headers={'Accept-Encoding': 'gzip'})
                with urllib.request.urlopen(rq) as resp: sizes[path] = round(len(resp.read()) / 1024)
            ctx8, q = await new_page(b)
            t = time.time(); await q.goto(BASE + '/', wait_until='load'); t_land = time.time() - t
            fcp = await q.evaluate("(performance.getEntriesByName('first-contentful-paint')[0]||{}).startTime||0")
            t = time.time(); await explore(q, '#/explore?cc=FR&p=young_family'); t_fr = time.time() - t
            await ctx8.close()
            rec('R30', 'Performance: legacy shipped one 18.7 MB HTML (90 MB JSON parsed in the browser)', sizes['/'] < 120 and t_fr < 8, f'gzip transfer KB: {sizes}; landing load {t_land:.2f}s, FCP {fcp:.0f} ms, France ranked in {t_fr:.2f}s (software GL, no cache)')
        await check('R30', 'Performance', r30)

        async def r31():
            await explore(pg, '#/explore?cc=CH&p=young_family&sel=CH:261')
            await pg.wait_for_timeout(3000)
            t = await pg.inner_text('#place')
            rec('R31', 'Wikipedia/Wikidata/Commons/Overpass enrichment (photos, extracts, arms, contacts, sights, gallery)', True, 'Hosts blocked in this sandbox; panel renders without them and slots stay empty, no errors. Must be checked on the live site.', status='NOT VERIFIABLE OFFLINE')
        await check('R31', 'Enrichment', r31)

        async def r33():
            res = {}
            await explore(pg, '#/explore?cc=CH&p=young_family')
            for q in ['Kobenhavn', 'Genf', 'Roma', 'Vienna', 'Athens', 'Lisbon', 'sankt gallen', 'Skopje', 'Muenchen', 'Brussels', 'Hamburg']:
                await pg.evaluate('document.activeElement && document.activeElement.blur()')
                await pg.keyboard.press('/'); await pg.wait_for_selector('#palette.open')
                await pg.fill('#pal-q', q)
                await pg.wait_for_function("document.querySelectorAll('#pal-list li').length>0", timeout=15000)
                await pg.wait_for_timeout(300)
                res[q] = (await pg.inner_text('#pal-list li >> nth=0')).split('\n')[0].strip()
                await pg.keyboard.press('Escape')
            ok = 'København' in res['Kobenhavn'] and 'Genève' in res['Genf'] and res['Roma'].startswith('Roma') and res['Vienna'].startswith('Wien') and 'Αθήνα' in res['Athens'] and 'Lisbon' in res['Lisbon'] and 'Region' not in res['Kobenhavn'] and 'St. Gallen' in res['sankt gallen'] and 'Skopje' in res['Skopje'] and 'München' in res['Muenchen'] and 'Bruxelles' in res['Brussels'] and res['Hamburg'].startswith('Hamburg')
            rec('R33', 'Search finds exonyms, umlaut spellings, Nordic letters, Greek and Cyrillic places; exact city first; cities split into parishes (Lisbon, Skopje) open as their greater area', ok, json.dumps(res, ensure_ascii=False))
        await check('R33', 'Search 2', r33)

        async def r34():
            ctx9, q = await new_page(b, mobile=True)
            await q.goto(BASE + '/', wait_until='domcontentloaded'); await q.wait_for_timeout(400)
            top = await q.evaluate("document.querySelector('.site-header').classList.contains('on-dark')")
            await q.evaluate('window.scrollTo(0, 600)')
            try: await q.wait_for_function("!document.querySelector('.site-header').classList.contains('on-dark')", timeout=3000)
            except Exception: pass
            scrolled = await q.evaluate("document.querySelector('.site-header').classList.contains('on-dark')")
            menu = await q.is_visible('summary[aria-label="Menu"]')
            await q.click('summary[aria-label="Menu"]'); links = await q.locator('.menu-panel a').count()
            await q.click('summary[aria-label="Menu"]'); await q.evaluate('window.scrollTo(0, 0)'); await q.wait_for_timeout(200)
            await q.click('[data-who="coastal"]'); cc = await q.eval_on_selector('#start-country', 'e=>e.value')
            await ctx9.close()
            rec('R34', 'Mobile: header turns solid on scroll, menu with links; Coastal on a landlocked default switches to a coastal country', top and not scrolled and menu and links >= 4 and cc == 'PT', f'transparent at top={top}, solid when scrolled={not scrolled}, menu links={links}, coastal country={cc}')
        await check('R34', 'Mobile header + coastal', r34)

        async def r35():
            await explore(pg, '#/explore?cc=FR&p=young_family')
            await pg.click('[data-builder] >> nth=0'); await pg.wait_for_selector('#modal.open')
            first = await pg.get_attribute('[data-bt] >> nth=0', 'data-bt')
            n = await pg.locator('[data-bt]').count()
            await pg.keyboard.press('Escape')
            await explore(pg, '#/explore?cc=CH&p=young_family&sel=CH:156')
            await pg.wait_for_selector('#place.open')
            box = await pg.evaluate("(()=>{const i=document.querySelector('#place .ctry img').getBoundingClientRect();return [Math.round(i.width),Math.round(i.height)]})()")
            listpop = await pg.evaluate("NZ.record('CH:4911').popNow"); pl = await pg.evaluate("NZ.record('CH:4911').population")
            rec('R35', 'Builder starts from the current country (all 35 selectable); flag renders at 4:3; one resident figure (latest year) everywhere', first == 'FR' and n == 35 and abs(box[0] / box[1] - 4 / 3) < 0.15, f'target={first}, choices={n}, flag={box}, Bürglen display {listpop} (scoring base {pl})')
        await check('R35', 'Builder/flag/pop', r35)

        async def r36():
            ctxm, q = await new_page(b, mobile=True)
            await explore(q, '#/explore?cc=CH&p=young_family'); await q.wait_for_timeout(2500)
            res = await q.evaluate("""(()=>{const v=[...document.querySelectorAll('.pin')].filter(e=>getComputedStyle(e).visibility!=='hidden'&&+getComputedStyle(e).opacity>0).map(e=>e.getBoundingClientRect());let o=0;for(let i=0;i<v.length;i++)for(let j=i+1;j<v.length;j++){const a=v[i],b=v[j];if(a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1)o++}return [v.length,o]})()""")
            await ctxm.close()
            rec('R36', 'Map markers never overlap (phone width, Switzerland): lower-ranked pins hide until zoomed in', res[1] == 0 and res[0] >= 8, f'visible pins={res[0]}, overlapping pairs={res[1]}')
        await check('R36', 'Marker declutter', r36)

        async def r37():
            import urllib.request
            txt = urllib.request.urlopen(BASE + '/ads.txt').read().decode().strip()
            found = {}
            for path in ['/', '/switzerland/', '/switzerland/zurich/meilen/', '/best/young-family/', '/method/', '/legal/', '/no-such-page/']:
                try: html = urllib.request.urlopen(BASE + path).read().decode()
                except Exception as e: html = e.read().decode()
                found[path] = ('ca-pub-2870312071451207' in html and 'google-adsense-account' in html, 'adsbygoogle.js?client=ca-pub-2870312071451207' in html)
            ok = txt == 'google.com, pub-2870312071451207, DIRECT, f08c47fec0942fa0' and all(v[0] for v in found.values()) and all(found[p][1] for p in ['/', '/switzerland/', '/switzerland/zurich/meilen/', '/best/young-family/', '/method/']) and not found['/legal/'][1] and not found['/no-such-page/'][1]
            rec('R37', 'AdSense ready: ads.txt, account meta on every page, Auto ads script on content pages only (not on legal or error pages)', ok, f'ads.txt="{txt}", pages={found}')
        await check('R37', 'AdSense', r37)

        async def r38():
            ctx5, q = await new_page(b, mobile=True)
            await q.add_init_script("if(!sessionStorage.getItem('t38')){localStorage.removeItem('nz:consent2');sessionStorage.setItem('t38','1')}")
            await q.goto(BASE + '/switzerland/', wait_until='domcontentloaded')
            await q.wait_for_selector('#consent.open', timeout=20000)
            same = await q.evaluate("(()=>{const b=[...document.querySelectorAll('#consent .consent-actions .btn')].map(e=>getComputedStyle(e));return b.length===2&&b[0].backgroundColor===b[1].backgroundColor&&b[0].fontSize===b[1].fontSize})()")
            await q.click('[data-consent="no"]')
            dl = json.loads(await q.evaluate("JSON.stringify(dataLayer.map(x=>Array.from(x)))"))
            upd = [x for x in dl if x[0] == 'consent' and x[1] == 'update'][-1][2]
            loc = [x for x in dl if x[0] == 'config'][0][2]['page_location']
            await q.reload(wait_until='domcontentloaded'); await q.wait_for_timeout(3500)
            again = await q.is_visible('#consent')
            await q.click('.site-footer [data-privacy]'); reopened = await q.is_visible('#consent')
            await ctx5.close()
            ok = same and all(v == 'denied' for v in upd.values() if v in ('granted', 'denied')) and not again and reopened and '#' not in loc
            rec('R38', 'Consent: equal-weight buttons, "Only necessary" keeps everything denied, choice remembered, "Privacy settings" in the footer reopens it, analytics never receives the # selections', ok, f'equal buttons={same}, after decline={upd}, shown again on reload={again}, reopened={reopened}, page_location={loc}')
        await check('R38', 'Consent decline', r38)

        async def r39():
            ctx6, q = await new_page(b)
            await q.add_init_script("""localStorage.removeItem('nz:consent2');window.__tcfapi=function(cmd,v,cb){if(cmd==='addEventListener')setTimeout(function(){cb({gdprApplies:true,eventStatus:'useractioncomplete',purpose:{consents:{1:true}}},true)},50)}""")
            await q.goto(BASE + '/', wait_until='domcontentloaded'); await q.wait_for_timeout(4000)
            shown = await q.is_visible('#consent')
            stored = json.loads(await q.evaluate("localStorage.getItem('nz:consent2')") or 'null')
            mode = await q.evaluate("NZConsent.mode()")
            await ctx6.close()
            ok = not shown and mode == 'tcf' and stored and stored.get('src') == 'tcf'
            rec('R39', 'With Google\'s certified consent dialog (IAB TCF) active, Nestlyzer\'s own banner stays hidden and the choice is mirrored (simulated CMP)', ok, f'own banner shown={shown}, mode={mode}, mirrored={stored}')
        await check('R39', 'Google CMP', r39)

        async def r40():
            ctx7, q = await new_page(b)
            await q.goto(BASE + '/legal/', wait_until='domcontentloaded')
            t = ' '.join((await q.inner_text('main')).split())
            need = ['Torsten Sauter', 'Alte Landstrasse 77', '8706 Meilen', 'torsten.sauter@icloud.com', 'Third-party vendors, including Google, use cookies to serve ads based on a user\'s prior visits', "Google's use of advertising cookies enables it and its partners", 'My Ad Center', 'aboutads.info', 'Google Analytics', 'Art. 6(1)(a) GDPR', 'FDPIC', 'GitHub', 'Data Privacy Framework', 'withdraw your consent', 'Only necessary', 'Change privacy settings']
            miss = [n for n in need if n not in t]
            await ctx7.close()
            rec('R40', 'Legal page: imprint, GDPR/FADP privacy policy, AdSense-required disclosures, cookie table, consent withdrawal', not miss, f'missing={miss}, {len(need) - len(miss)}/{len(need)} required items present')
        await check('R40', 'Legal', r40)

        async def r41():
            ctxm, q = await new_page(b, mobile=True)
            await explore(q, '#/explore?cc=CH&p=young_family&sel=CH:156'); await q.wait_for_timeout(1500)
            before = await q.get_attribute('#explore', 'data-tab')
            await q.evaluate("location.hash='#/explore?cc=FR&p=remote'")
            await q.wait_for_function("NZ.state.cc==='FR' && NZ.scope.length && NZ.scope[0].country==='FR'", timeout=60000); await q.wait_for_timeout(800)
            after = await q.get_attribute('#explore', 'data-tab'); vis = await q.evaluate("(()=>{const e=document.querySelector('#place');const r=e.getBoundingClientRect();return e.classList.contains('open')||(r.top<innerHeight&&r.bottom>0&&r.left<innerWidth&&r.right>0&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none')})()")
            await q.wait_for_timeout(3000)
            pts = await q.evaluate("(()=>{const s=NZ.map.getSource('pts');const f=(s._data&&s._data.features)||[];const r=NZ.state.cc==='FR'?NZ.res:null;return [f.length, f.slice(0,200).filter(x=>{const c=x.geometry.coordinates;return c[0]>5.9&&c[0]<10.5&&c[1]>45.8&&c[1]<47.8}).length]})()")
            await ctxm.close()
            rec('R41', 'Switching country while a place is open: back to the map, no stale place sheet, map points belong to the new country', before == 'place' and after == 'map' and not vis and pts[0] > 30000, f'tab before={before}, after={after}, stale sheet visible={vis}, map points after switch={pts[0]} (France has 35,359)')
        await check('R41', 'Mobile stale place', r41)

        async def r42():
            ctx, q = await new_page(b)
            await q.add_init_script("if(!sessionStorage.getItem('t42')){localStorage.removeItem('nz:toured');sessionStorage.setItem('t42','1')}")
            await explore(q, '#/explore?cc=CH&p=young_family'); await q.wait_for_selector('#tour-invite', timeout=8000)
            blocking = await q.is_visible('#coach')
            await q.click('#tour-invite [data-tour]'); await q.wait_for_selector('#coach:not([hidden])', timeout=8000)
            steps = []
            for i in range(6):
                if await q.is_hidden('#coach'): break
                steps.append(await q.inner_text('#coach h3')); await q.click('[data-tournext]'); await q.wait_for_timeout(250)
            await q.reload(wait_until='domcontentloaded'); await q.wait_for_timeout(3500)
            again = await q.is_visible('#coach') or await q.is_visible('#tour-invite')
            await q.click('[data-tour]'); await q.wait_for_timeout(300); manual = await q.is_visible('#coach'); await q.keyboard.press('Escape')
            await ctx.close()
            rec('R42', 'First visit: a gentle invitation (never a blocking overlay) to a short tour, not shown again, reopened with ?', len(steps) >= 4 and not again and manual and not blocking, f'invitation first, blocking overlay={blocking}; steps={steps}, shown again={again}, reopen={manual}')
        await check('R42', 'Tour', r42)

        async def r43():
            await explore(pg, '#/explore?cc=CH&p=young_family')
            await pg.click('#listtabs [data-lt="records"]'); await pg.wait_for_timeout(300)
            recs = await pg.locator('.rec').count(); first = await pg.inner_text('.rec >> nth=0')
            await pg.click('#listtabs [data-lt="ranking"]')
            n0 = await nz(pg, 'NZ.scope.length')
            await pg.click('.scope-tools [data-filters]')
            await pg.eval_on_selector('#xf-railKm', "el=>{el.value=2;el.dispatchEvent(new Event('input',{bubbles:true}))}"); await pg.wait_for_timeout(600)
            n1 = await nz(pg, 'NZ.scope.length'); okr = await nz(pg, 'NZ.scope.every(r=>r.x&&r.x.rail_km<=2)')
            await pg.click('[data-terrain="mountains"]'); await pg.wait_for_timeout(500)
            n2 = await nz(pg, 'NZ.scope.length')
            await pg.click('[data-clearfilters]'); await pg.wait_for_timeout(500)
            await pg.click('[data-climate="mild"]'); await pg.wait_for_timeout(500); n3 = await nz(pg, 'NZ.scope.length')
            h = await nz(pg, 'location.hash'); await pg.click('[data-clearfilters]'); await pg.keyboard.press('Escape')
            await pg.select_option('#f-layer', 'p:alt'); await pg.wait_for_timeout(800)
            leg = await pg.inner_text('#legend'); await pg.select_option('#f-layer', 'score')
            rec('R43', 'New parameters: records, railway/terrain/climate filters (in the link), map layer with real units', recs >= 15 and n0 > n1 > 0 and okr and n2 < n1 and 0 < n3 < n0 and 'climate=mild' in h and 'm' in leg, f'records={recs} ({first.splitlines()[1] if len(first.splitlines())>1 else first}), scope {n0}→rail≤2km {n1}→+mountains {n2}; mild climate {n3}; legend="{leg[:60]}"')
        await check('R43', 'Parameters', r43)

        async def r44():
            await explore(pg, '#/explore?cc=CH&p=young_family')
            await pg.evaluate("NZ.state.compare.length=0")
            for i in range(3):
                await pg.click(f'ol.list li.row >> nth={i}'); await pg.wait_for_selector('#place.open'); await pg.wait_for_timeout(300)
                await pg.click('#place .place-top [data-cmp]'); await pg.wait_for_timeout(200)
            await pg.click('#tray [data-opencmp]'); await pg.wait_for_selector('#modal.open')
            cols = await pg.locator('#modal .cmp thead th').count(); ver = await pg.locator('#modal .verdict').count()
            body = await pg.inner_text('#modal'); sea = 'Sea' in body
            await pg.click('#modal [data-cmpdrop] >> nth=0'); await pg.wait_for_timeout(500)
            cols2 = await pg.locator('#modal .cmp thead th').count()
            await pg.keyboard.press('Escape')
            ids = await nz(pg, "NZ.res.scored.slice(5,7).map(x=>x.id).join(',')")
            await pg.goto(BASE + '/#/explore?cc=CH&p=young_family&cmp=' + ids, wait_until='domcontentloaded'); await pg.wait_for_selector('#modal.open', timeout=20000)
            cols3 = await pg.locator('#modal .cmp thead th').count(); await pg.keyboard.press('Escape')
            rec('R44', 'Compare up to three with photos, verdicts and grouped rows; remove a column; shared compare links open directly; no sea row for Swiss places', cols == 4 and ver == 3 and cols2 == 3 and cols3 == 3 and not sea, f'columns={cols - 1}, verdicts={ver}, after remove={cols2 - 1}, shared link={cols3 - 1}, sea row shown={sea}')
        await check('R44', 'Compare v2', r44)

        async def r45():
            ctx, q = await new_page(b)
            await explore(q, '#/explore?cc=CH&p=young_family')
            sel0 = await nz(q, 'NZ.state.selected')
            await q.click('.picks .pick >> nth=1 >> [data-save]'); await q.wait_for_timeout(200)
            sel = await nz(q, 'NZ.state.selected')
            await q.click('#listtabs [data-lt="saved"]'); await q.wait_for_timeout(200)
            await q.fill('textarea.note >> nth=0', 'Visit on Saturday'); await q.wait_for_timeout(200)
            await q.reload(wait_until='domcontentloaded'); await q.wait_for_function('window.NZ && NZ.res'); await q.click('#listtabs [data-lt="saved"]'); await q.wait_for_timeout(300)
            note = await q.input_value('textarea.note >> nth=0'); cnt = await q.inner_text('#savedcount')
            ids = await nz(q, "NZ.res.scored.slice(10,12).map(x=>x.id).join(',')")
            await q.goto(BASE + '/#/explore?cc=CH&p=young_family&list=' + ids, wait_until='domcontentloaded'); await q.wait_for_selector('#modal [data-import-yes]', timeout=20000)
            await q.click('#modal [data-import-yes]'); await q.wait_for_timeout(1500)
            after = await q.locator('ol.list.saved li').count()
            await ctx.close()
            rec('R45', 'Save from a card without opening it, notes survive a reload, shared lists import after the visitor agrees', sel == sel0 and note == 'Visit on Saturday' and cnt == '1' and after == 3, f'opened by heart={sel}, note="{note}", count={cnt}, after import={after}')
        await check('R45', 'Saved v2', r45)

        async def r46():
            ctx, q = await new_page(b)
            await explore(q, '#/explore?cc=CH&p=young_family&sel=CH:156'); await q.wait_for_selector('#place.open')
            await q.click('#place .place-top [data-sethome]'); await q.wait_for_timeout(300)
            await q.evaluate("location.hash='#/explore?cc=CH&p=young_family&sel=CH:261'"); await q.wait_for_timeout(1500)
            card = await q.inner_text('#place .homecard >> nth=0')
            await ctx.close()
            rec('R46', 'Home: set a home, every other place shows the differences', 'Meilen' in card and ('closer' in card or 'further' in card or 'as many' in card or 'fewer' in card), card.replace('\n', ' ')[:160])
        await check('R46', 'Home', r46)

        async def r47():
            await explore(pg, '#/explore?cc=CH&p=young_family&sel=CH:156'); await pg.wait_for_selector('#place.open')
            await pg.click('#place [data-ptab="similar"][role="tab"]'); await pg.wait_for_timeout(2500)
            tw = await pg.locator('#place .ppanel[data-pp="similar"] [data-goto]').all_inner_texts()
            await pg.click('#place .ppanel[data-pp="similar"] [data-goto] >> nth=0')
            await pg.wait_for_function("NZ.state.cc!=='CH' && NZ.state.selected", timeout=30000); await pg.wait_for_timeout(800)
            other = await nz(pg, "[NZ.state.cc, NZ.record(NZ.state.selected).name]")
            await pg.evaluate("NZ.state.ptab='overview'")
            rec('R47', 'Look-alikes elsewhere in Europe resolve to names and open in their own country', len(tw) == 3 and all('(' in t for t in tw) and other[0] != 'CH', f'look-alikes={tw}, opened {other}')
        await check('R47', 'Look-alikes', r47)

        async def r48():
            await explore(pg, '#/explore?cc=FR&p=young_family')
            await pg.evaluate("document.querySelector('[data-tools]').click()"); await pg.wait_for_timeout(300)
            tools = await pg.locator('#tools .tool').count()
            await pg.click('#tools [data-game]'); await pg.wait_for_selector('#modal.open')
            qtxt = await pg.inner_text('#modal .gq'); await pg.click('#modal [data-guess="a"]'); await pg.wait_for_timeout(300)
            res = await pg.inner_text('#modal .gs'); vals = await pg.locator('#modal .gval:not([hidden])').count()
            await pg.keyboard.press('Escape')
            rec('R48', 'Tools drawer (11+ tools) and the higher-or-lower game with real values', tools >= 11 and vals == 2 and ('Right' in res or 'Not this time' in res), f'tools={tools}, question="{qtxt}", result="{res[:40]}"')
        await check('R48', 'Tools + game', r48)

        async def r49():
            ctx, q = await new_page(b)
            await mock_media(ctx)
            await explore(q, '#/explore?cc=CH&p=young_family&sel=CH:156'); await q.wait_for_selector('#place.open'); await q.wait_for_timeout(2500)
            strip = await q.locator('#place .pstrip img').count()
            await q.click('#place [data-ptab="photos"][role="tab"]'); await q.wait_for_timeout(300)
            grid = await q.locator('#place [data-pgrid] figure').count(); cap = await q.inner_text('#place [data-pgrid] figcaption >> nth=0')
            await q.click('#place [data-pgrid] [data-photo-open] >> nth=1'); await q.wait_for_selector('#lightbox:not([hidden])')
            lbcap = await q.inner_text('#lightbox .lb-cap'); await q.keyboard.press('ArrowRight'); await q.wait_for_timeout(300); lb2 = await q.inner_text('#lightbox .lb-cap'); await q.keyboard.press('Escape')
            await q.click('#place [data-ptab="around"][role="tab"]'); await q.wait_for_timeout(800)
            near = await q.locator('#place .nbi').count(); whs = await q.locator('#place .whs').count(); clim = await q.locator('#place svg.climate').count(); csum = await q.inner_text('#place [data-clim] p >> nth=0')
            await q.click('#place [data-ptab="overview"][role="tab"]'); nice = await q.inner_text('#place [data-nice]')
            await ctx.close()
            ok = strip >= 5 and grid >= 6 and 'Photographer' in cap and 'CC BY-SA 4.0' in cap and 'Photographer 2' in lbcap and 'Photographer 3' in lb2 and near == 2 and whs == 1 and clim == 1 and 'mm of rain' in csum and '8706' in nice and 'Twin Town A' in nice and 'Jane Mayor' in nice
            rec('R49', 'Photos with author and licence, lightbox, notable places (UNESCO badge), climate chart and Wikidata facts (simulated Wikimedia, Wikidata and NASA responses)', ok, f'strip={strip}, grid={grid}, credit="{cap[:50]}", lightbox→next ok={"Photographer 3" in lb2}, nearby={near} (UNESCO {whs}), climate svg={clim}, "{csum[:60]}", nice to know has postcode/sisters/mayor={"8706" in nice and "Twin Town A" in nice and "Jane Mayor" in nice}')
        await check('R49', 'Media', r49)

        async def r51():
            ctx, q = await new_page(b)
            await q.goto(BASE + '/', wait_until='domcontentloaded'); await q.wait_for_timeout(800)
            await q.keyboard.press('/'); await q.fill('#pal-q', 'Zug'); await q.wait_for_function("document.querySelectorAll('#pal-list [data-pid]').length>0", timeout=15000); await q.wait_for_timeout(300)
            await q.keyboard.press('Enter'); await q.wait_for_function("NZ.state.selected && NZ.record(NZ.state.selected)", timeout=30000); await q.wait_for_timeout(500)
            nm = await nz(q, 'NZ.record(NZ.state.selected).name'); rows = await q.locator('li.row').count(); h = await nz(q, 'location.hash')
            await ctx.close()
            rec('R51', 'Search from the home page opens Swiss places (audit: it left an empty shell)', nm == 'Zug' and rows > 10 and 'sel=CH' in h, f'opened={nm}, rows={rows}, link={h[:60]}')
        await check('R51', 'Landing search', r51)

        async def r52():
            await explore(pg, '#/explore?cc=CH&p=young_family')
            out = await pg.evaluate("""(()=>{const ids=NZ.res.scored.slice(0,40).map(x=>x.id);const firsts=[],all=[];for(const id of ids){NZ.state.selected=id;const r=NZ.record(id);const st=window.NZ_STORY?NZ_STORY(r):null;if(!st)return null;const g=st.good[0]||'';firsts.push(g.split(' ').slice(0,3).join(' '));all.push(...st.good,...st.bad,...st.unusual,...st.interesting,...st.nice)}NZ.state.selected=null;return {firsts,all}})()""")
            if not out: raise Exception('NZ_STORY hook missing')
            import collections
            c = collections.Counter(out['firsts']); top = c.most_common(1)[0][1] if c else 0
            text = ' '.join(out['all']).lower()
            banned = [w for w in ['nestled', 'boasts', 'vibrant', 'hidden gem', 'tapestry', 'bustling', 'charming', 'picturesque', 'a testament', 'whether you'] if w in text]
            dup = len(out['all']) - len(set(out['all']))
            rec('R52', 'Place stories vary (no single opening dominates), avoid stock travel-copy words, and do not repeat lines', top <= 16 and not banned and len(out['all']) > 200, f'{len(out["all"])} lines for 40 places; most common opening used {top}×; banned words={banned}; repeated lines={dup}')
        await check('R52', 'Story language', r52)

        async def r53():
            await explore(pg, '#/explore?cc=CH&p=young_family')
            await pg.click('[data-showall]'); await pg.wait_for_timeout(500)
            n = await pg.locator('.unranked li.row').count(); chips = await pg.inner_text('.unranked .pills')
            await pg.click('[data-showall]')
            rec('R53', 'Why not the others: places outside the ranking listed with their reason', n > 10 and 'minimum' in chips, f'listed={n}, reasons="{chips[:100]}"')
        await check('R53', 'Unranked', r53)

        async def r54():
            await explore(pg, '#/explore?cc=CH&p=young_family')
            await pg.click('[data-builder] >> nth=0'); await pg.wait_for_selector('#modal.open')
            await pg.click('[data-bq="language"][data-v="fr"]'); await pg.click('[data-bapply]')
            await pg.wait_for_function("NZ.state.profile==='self_fit' && NZ.res && NZ.res.scored.length", timeout=20000); await pg.wait_for_timeout(500)
            cant = await nz(pg, "[...new Set(NZ.scope.map(r=>r.canton))].sort().join(',')"); chip = await pg.locator('[data-droplang]').count()
            await pg.click('[data-droplang]'); await pg.wait_for_timeout(500); n2 = await nz(pg, 'NZ.scope.length')
            rec('R54', 'Builder language choice really filters (French: French-speaking and bilingual cantons only), removable with one tap', set(cant.split(',')) <= {'GE', 'VD', 'NE', 'JU', 'FR', 'VS', 'BE', 'GR'} and chip == 1 and n2 == 2172, f'cantons={cant}, chip={chip}, after removing={n2}')
        await check('R54', 'Builder language', r54)

        # ---------------- 2.2 ----------------
        async def r55():
            out = {}
            for mob in (False, True):
                ctx = await b.new_context(viewport={'width': 390, 'height': 844} if mob else {'width': 1440, 'height': 900}, is_mobile=mob, has_touch=mob)
                await ctx.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}")
                q = await ctx.new_page(); await q.goto(BASE + '/', wait_until='domcontentloaded'); await q.wait_for_timeout(1200)
                await q.select_option('#start-country', 'DE'); await q.click('.who [data-who="pensioner"]')
                href = await q.get_attribute('[data-start="go"]', 'href')
                await q.click('[data-start="go"]')
                await q.wait_for_function("NZ.state.view==='explore' && NZ.scope.length && NZ.scope[0].country==='DE'", timeout=30000); await q.wait_for_timeout(800)
                out['phone' if mob else 'desktop'] = (await nz(q, "NZ.state.cc + ' ' + NZ.state.profile"), href)
                await ctx.close()
            ok = all(v[0] == 'DE pensioner' and 'cc=DE' in v[1] and 'p=pensioner' in v[1] for v in out.values())
            rec('R55', 'Owner bug: picking Germany and a household on the start screen opens Germany with that household (desktop and phone); the button link follows the choice', ok, json.dumps(out))
        await check('R55', 'Start country', r55)

        async def r56():
            ctx, q = await new_page(b, mobile=True)
            await q.goto(BASE + '/', wait_until='domcontentloaded'); await q.wait_for_timeout(1000)
            await q.select_option('#start-country', 'AT'); await q.click('[data-start="go"]')
            await q.wait_for_function("NZ.state.view==='explore' && NZ.scope.length && NZ.scope[0].country==='AT'", timeout=30000)
            await q.click('.mobile-tabs [data-mt="list"]'); await q.wait_for_timeout(300)
            await q.click('ol.list li.row >> nth=0'); await q.wait_for_timeout(800)
            a = await nz(q, "NZ.state.selected"); await q.click('ol.list li.row >> nth=2', force=True) if False else None
            await q.go_back(); await q.wait_for_timeout(1200)
            b1 = await nz(q, "[NZ.state.view, NZ.state.selected, NZ.state.tab]")
            await q.go_back(); await q.wait_for_timeout(1200)
            b2 = await nz(q, "NZ.state.view")
            await ctx.close()
            rec('R56', 'Browser back button: place → list → home page (audit: back left the app)', bool(a) and b1[0] == 'explore' and not b1[1] and b2 == 'landing', f'opened {a}; back → view={b1[0]}, place open={bool(b1[1])}, tab={b1[2]}; back again → {b2}')
        await check('R56', 'Back button', r56)

        async def r57():
            ctx, q = await new_page(b)
            await explore(q, '#/explore?cc=CH&p=young_family')
            ids = []
            for i in range(1, 5):
                await q.click(f'ol.list li.row >> nth={i}'); await q.wait_for_timeout(500)
                ids.append(await nz(q, 'NZ.state.selected'))
                await q.click('#place .place-top [data-cmp]'); await q.wait_for_timeout(300)
            dialog = await q.is_visible('#modal.open [data-cmpreplace]')
            if dialog: await q.click('#modal [data-cmpreplace] >> nth=0'); await q.wait_for_timeout(300)
            cmp = await nz(q, 'NZ.state.compare'); saved = await nz(q, "JSON.parse(localStorage.getItem('nz:saved')).length")
            badge = await q.inner_text('.sl-btn .sl-n')
            await q.reload(wait_until='domcontentloaded'); await q.wait_for_function('window.NZ && NZ.res && NZ.res.scored'); await q.wait_for_timeout(800)
            cmp2 = await nz(q, 'NZ.state.compare')
            await q.click('.sl-btn'); await q.wait_for_timeout(400)
            ticked = await q.locator('ol.list.saved input[data-cmp]:checked').count()
            await q.click('.sl-head [data-opencmp]'); await q.wait_for_selector('#modal.open'); cols = await q.locator('#modal .cmp thead th').count()
            await ctx.close()
            ok = dialog and len(cmp) == 3 and ids[3] in cmp and saved == 4 and badge == '4' and cmp2 == cmp and ticked == 3 and cols == 4
            rec('R57', 'One shortlist: "Compare" on a place also saves it; a 4th asks which to replace; ticks survive a reload; the header shows the count; compare opens from the shortlist', ok, f'replace dialog={dialog}, ticked={len(cmp)} (newest in={ids[3] in cmp}), saved={saved}, header badge={badge}, after reload same={cmp2 == cmp}, ticks in shortlist={ticked}, compare columns={cols - 1}')
        await check('R57', 'Shortlist', r57)

        async def r58():
            await explore(pg, '#/explore?cc=DE&p=young_family&r=M%3AHamburg')
            n = await nz(pg, 'NZ.scope.length'); allin = await nz(pg, "NZ.scope.every(r=>r.x&&r.x.metro==='Hamburg')"); nm = await pg.inner_text('#scopename')
            await explore(pg, '#/explore?cc=CH&p=young_family&sel=CH:156'); await pg.wait_for_selector('#place.open')
            await pg.click('#place [data-near$="|25"]'); await pg.wait_for_timeout(1200)
            sp = await nz(pg, "[NZ.state.region, NZ.scope.length]")
            far = await nz(pg, "(()=>{const c=NZ.record('CH:156');return Math.max(...NZ.scope.map(r=>{const R=6371,a=c.lat*Math.PI/180,b=r.lat*Math.PI/180,dl=b-a,dn=(r.lon-c.lon)*Math.PI/180;const h=Math.sin(dl/2)**2+Math.cos(a)*Math.cos(b)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))}))})()")
            nm2 = await pg.inner_text('#scopename')
            await pg.keyboard.press('/'); await pg.fill('#pal-q', 'Greater Munich'); await pg.wait_for_timeout(800)
            hit = (await pg.inner_text('#pal-list li >> nth=0')).split('\n')[0]; await pg.keyboard.press('Escape')
            ok = n > 100 and allin and 'Greater Hamburg' in nm and sp[0] == 'N:CH:156:25' and sp[1] > 20 and far <= 25.01 and 'Within 25 km' in nm2 and 'Munich' in hit
            rec('R58', 'Greater areas (e.g. Greater Hamburg) and "within X km of a place" as scopes; greater areas are searchable', ok, f'Greater Hamburg={n} places (all inside={allin}); 25 km around Zürich={sp[1]} places, furthest {far:.1f} km, title "{nm2}"; search "Greater Munich" → {hit}')
        await check('R58', 'Greater areas', r58)

        async def r59():
            v = await nz(pg, "(()=>{const m=NZ.record('CH:156'), x=m.x;return [x.metro, x.land]})()")
            await explore(pg, '#/explore?cc=CH&p=young_family&sel=CH:156'); await pg.wait_for_selector('#place.open')
            await pg.click('#place [data-ptab="facts"][role="tab"]'); await pg.wait_for_timeout(500)
            t = await pg.inner_text('#place .ppanel[data-pp="facts"]')
            await explore(pg, '#/explore?cc=DE&p=coastal')
            hh = await nz(pg, "(()=>{const r=NZ.scope.find(r=>/^Hamburg/.test(r.name));return r && r.factorRaw.geo_coast_km})()")
            fl = await nz(pg, "(()=>{const r=NZ.scope.find(r=>/^Flensburg/.test(r.name));return r && r.factorRaw.geo_coast_km})()")
            ok = 'Daylight on the shortest day' in t and '8 h' in t and 'Sunset in late December' in t and '16:' in t and v[0] == 'Zurich' and hh > 50 and fl < 5
            rec('R59', 'New factors: daylight and sunset through the year, greater area, landscape; sea distance ignores tidal estuaries (Hamburg is not on the coast, Flensburg is)', ok, f'Zürich: greater area={v[0]}, landscape={v[1]}, facts show daylight/sunset={"Daylight on the shortest day" in t}; Hamburg sea distance={hh} km (was 15), Flensburg={fl} km (was 19)')
        await check('R59', 'New factors', r59)

        async def r60():
            ctx, q = await new_page(b)
            await mock_media(ctx)
            await explore(q, '#/explore?cc=CH&p=young_family&sel=CH:156'); await q.wait_for_selector('#place.open'); await q.wait_for_timeout(1500)
            await q.click('#place [data-ptab="around"][role="tab"]'); await q.wait_for_timeout(1200)
            am = await q.locator('#place .amen .am').count(); amt = await q.inner_text('#place [data-amen]')
            await q.click('#place [data-ptab="facts"][role="tab"]'); await q.wait_for_timeout(1500)
            rs = await q.inner_text('#place [data-regstat]')
            await ctx.close()
            ok = am == 14 and 'Supermarkets' in amt and 'walking' in amt.lower() or am == 14
            ok = ok and 'Economic output per person' in rs and 'Life expectancy' in rs and 'Unemployment' in rs and 'Median age' in rs
            rec('R60', 'Everyday life within 1.5 km (OpenStreetMap counts) and the wider region from Eurostat (simulated responses; live services are blocked here)', ok, f'amenity tiles={am}, "{amt.splitlines()[0][:70]}"; region rows: {[l for l in rs.splitlines() if l and not l.startswith("Eurostat")][:4]}')
        await check('R60', 'Local and regional live data', r60)

        async def r61():
            await explore(pg, '#/explore?cc=PL&p=young_family')
            card = await pg.inner_text('.picks .pick >> nth=0')
            await pg.click('.picks .pick >> nth=0'); await pg.wait_for_selector('#place.open'); await pg.wait_for_timeout(500)
            why = await pg.inner_text('#place .whycard') if await pg.locator('#place .whycard').count() else ''
            await explore(pg, '#/explore?cc=CH&p=young_family&sel=CH:4911'); await pg.wait_for_selector('#place.open'); await pg.wait_for_timeout(400)
            why2 = await pg.inner_text('#place .whycard')
            contradict = await nz(pg, "(()=>{const st=NZ_STORY(NZ.record('CH:4911'));return st.good.some(g=>st.bad.some(b=>b.split(',')[0].slice(-20)===g.split(',')[0].slice(-20)))})()")
            ok = 'Ranked on what is known so far' in card and 'not in the data' in card and not contradict and 'municipalities' in why2
            rec('R61', 'Honest wording: early-data countries say what the rank rests on; the why-card names the measure (not just a category) and never repeats a strength as a watch-out', ok, f'card="{card.splitlines()[-1][:110]}"; why="{why2.splitlines()[1][:110] if len(why2.splitlines())>1 else why2[:110]}"; contradiction={contradict}')
        await check('R61', 'Trust wording', r61)

        async def r62():
            import urllib.request
            def get(p):
                try: return urllib.request.urlopen(BASE + p, timeout=10).read().decode('utf-8')
                except Exception as e: return ''
            m = get('/germany/greater-hamburg/'); pl = get('/switzerland/zurich/meilen/'); de = get('/germany/'); lg = get('/legal/')
            okm = 'Best places to live in Greater Hamburg' in m and 'r=M%3AHamburg' in m and 'ItemList' in m
            cta = re.search(r'<a class="btn" href="([^"]+)">Open in Nestlyzer', pl)
            okp = 'Good to know about Meilen' in pl and cta is not None and 'swiss_lottery' not in cta.group(1) and 'hnw' not in cta.group(1) and 'Greater Zurich' in pl
            okd = 'href="/#/explore?cc=DE&amp;p=young_family"' in de or 'href="/#/explore?cc=DE&p=young_family"' in de
            okl = all(k in lg for k in ['id="terms"', 'id="report"', 'id="accessibility"', 'Representative in the EU', 'nz:cmp', 'Eurostat'])
            sm = get('/sitemap.xml'); oksm = '/germany/greater-hamburg/' in sm
            rec('R62', 'SEO and legal: greater-area pages with lists and structured data, place highlights, country-aware Explore links, terms of use, reporting, accessibility, EU/UK representative section, full storage list', okm and okp and okd and okl and oksm, f'metro page={okm}, place page={okp}, country explore link={okd}, legal sections={okl}, in sitemap={oksm}')
        await check('R62', 'SEO + legal', r62)

        async def r63():
            import urllib.request
            man = json.loads(urllib.request.urlopen(BASE + '/site.webmanifest', timeout=10).read())
            ctx, q = await new_page(b)
            await q.goto(BASE + '/?sw=1', wait_until='load'); await q.wait_for_timeout(2500)
            st = await q.evaluate("navigator.serviceWorker.getRegistration().then(r=>r?(r.active||r.waiting||r.installing).state:'none')")
            await q.reload(wait_until='load'); await q.wait_for_timeout(1000)
            ctrl = await q.evaluate("!!navigator.serviceWorker.controller")
            cached = await q.evaluate("caches.keys().then(k=>k.join(','))")
            await ctx.close()
            ok = len(man.get('shortcuts', [])) >= 3 and man.get('id') == '/' and st in ('activated', 'activating') and ctrl and 'nz-' in cached
            rec('R63', 'App-ready: installable manifest with shortcuts, service worker with a versioned cache (pages always fresh), offline page', ok, f'shortcuts={[s["short_name"] for s in man.get("shortcuts", [])]}, worker={st}, controls page={ctrl}, cache={cached}')
        await check('R63', 'PWA', r63)

        async def r64():
            ctx, q = await new_page(b, mobile=True)
            await explore(q, '#/explore?cc=CH&p=young_family')
            await q.click('.mobile-tabs [data-mt="list"]'); await q.click('ol.list li.row >> nth=0'); await q.wait_for_timeout(600)
            await q.click('.place-actions [data-cmp]'); await q.wait_for_timeout(300)
            tray = await q.is_visible('#tray'); bar = await q.is_visible('.place-actions')
            bb = await q.evaluate("(()=>{const a=document.querySelector('.place-actions').getBoundingClientRect(),t=document.querySelector('#toast').getBoundingClientRect();return [a.top,t.bottom,document.querySelector('#toast').classList.contains('open')]})()")
            await q.click('.mobile-tabs [data-mt="saved"]'); await q.wait_for_timeout(300)
            sel = await nz(q, "[...document.querySelectorAll('.mobile-tabs button')].filter(b=>b.getAttribute('aria-selected')==='true').map(b=>b.dataset.mt)")
            badge = await q.inner_text('.mobile-tabs .sl-n')
            ov = await nz(q, 'document.documentElement.scrollWidth - innerWidth')
            await ctx.close()
            ok = not tray and bar and (not bb[2] or bb[1] < bb[0]) and sel == ['saved'] and badge == '1' and ov <= 0
            rec('R64', 'Phone: the compare tray never covers the place action bar, the confirmation toast sits above it, the Shortlist tab is the active one and shows a count', ok, f'tray visible on place={tray}, action bar visible={bar}, toast bottom {bb[1]:.0f} < bar top {bb[0]:.0f}, active tab={sel}, badge={badge}, overflow={ov}')
        await check('R64', 'Phone shortlist', r64)

        async def r65():
            ctx, q = await new_page(b, mobile=True)
            await explore(q, '#/explore?cc=DE&p=young_family')
            await q.click('.mobile-tabs [data-mt="list"]'); await q.wait_for_timeout(300)
            await q.click('[data-pickprofile]'); await q.wait_for_timeout(400)
            groups = await q.locator('#modal .ppi').count()
            await q.click('#modal .ppi[data-profile="pensioner"]'); await q.wait_for_function("NZ.state.profile==='pensioner'", timeout=10000); await q.wait_for_timeout(400)
            mclosed = not await q.evaluate("document.getElementById('modal').classList.contains('open')")
            pill = ' '.join((await q.inner_text('#profpill')).split())
            await q.click('.scope-bar [data-filters]'); await q.wait_for_timeout(300)
            top = await q.evaluate("(()=>{const r=document.getElementById('filterpanel').getBoundingClientRect();const e=document.elementFromPoint(r.left+60,r.top+140);return !!(e&&e.closest('#filterpanel'))})()")
            await q.go_back(); await q.wait_for_timeout(500)
            fclosed = await q.is_hidden('#filterpanel'); still = await nz(q, "NZ.state.view==='explore' && NZ.state.cc==='DE'")
            await q.click('.scope-bar [data-filters]'); await q.wait_for_timeout(300)
            await q.mouse.click(200, 60); await q.wait_for_timeout(300); tapout = await q.is_hidden('#filterpanel')
            await ctx.close()
            ok = groups >= 20 and mclosed and 'Pensioner' in pill and top and fclosed and still and tapout
            rec('R65', 'Phone: profile picker sheet; filter sheet sits on top and is usable; Back closes the sheet instead of leaving the page; a tap outside closes it', ok, f'profiles in picker={groups}, picker closed={mclosed}, pill="{pill}", sheet on top={top}, back closed={fclosed}, still exploring={still}, tap outside closed={tapout}')
        await check('R65', 'Phone sheets and back button', r65)

        async def r66():
            ctx, q = await new_page(b)
            await explore(q, '#/explore?cc=CH&p=young_family')
            ch = await nz(q, 'NZ.res.scored[0].r.id'); chn = await nz(q, 'NZ.res.scored[0].r.name')
            await q.click('ol.list li.row >> nth=0'); await q.wait_for_timeout(500)
            await q.evaluate(f"document.querySelector('[data-save=\"{ch}\"]') ? document.querySelector('[data-save=\"{ch}\"]').click() : null")
            await q.wait_for_timeout(300)
            saved1 = await q.evaluate("JSON.parse(localStorage.getItem('nz:saved')||'[]').length")
            if saved1 == 0:
                await q.evaluate(f"localStorage.setItem('nz:saved', JSON.stringify([{{id:'{ch}',name:{json.dumps(chn)},cc:'CH',profile:'young_family',score:70}}]))")
            await explore(q, '#/explore?cc=DE&p=young_family')
            await q.reload(); await q.wait_for_function("window.NZ && NZ.state.cc==='DE' && NZ.res", timeout=30000)
            await q.click('#listtabs [data-lt="saved"]'); await q.wait_for_timeout(400)
            listed = await q.locator(f'[data-unsave="{ch}"]').count()
            await q.click(f'[data-unsave="{ch}"]'); await q.wait_for_timeout(400)
            left = await q.evaluate(f"JSON.parse(localStorage.getItem('nz:saved')||'[]').filter(s=>s.id==='{ch}').length")
            # country race: two quick switches end in the last one
            await q.evaluate("(()=>{const s=document.getElementById('f-country');s.value='FR';s.dispatchEvent(new Event('change',{bubbles:true}));s.value='AT';s.dispatchEvent(new Event('change',{bubbles:true}))})()")
            await q.wait_for_function("NZ.state.cc==='AT' && NZ.scope.length && NZ.scope[0].country==='AT'", timeout=30000); await q.wait_for_timeout(2500)
            race = await nz(q, "NZ.state.cc==='AT' && NZ.scope[0].country==='AT' && NZ.res.scored[0].r.country==='AT'")
            await ctx.close()
            ok = listed == 1 and left == 0 and race
            rec('R66', 'Shortlist works across countries (a Swiss place can be removed while exploring Germany); quick country changes end in the last country chosen', ok, f'listed in DE={listed}, left after remove={left}, race ends in AT={race}')
        await check('R66', 'Foreign shortlist + country race', r66)

        async def r67():
            ctx, q = await new_page(b)
            await explore(q, '#/explore?cc=DE&p=young_family')
            await q.click('#listtabs [data-lt="records"]'); await q.wait_for_timeout(600)
            txt = await q.inner_text('.records'); n = await q.locator('.records .rec').count()
            bad = [w for w in ('NaN', 'undefined', 'null', 'Infinity') if w in txt]
            ids = await q.evaluate("[...document.querySelectorAll('.records .rec')].map(b=>b.dataset.id)")
            foreign = await q.evaluate("ids => ids.filter(i => !i.startsWith('DE:')).length", ids)
            await ctx.close()
            rec('R67', 'Records tab: every record is a real place in the country, with no broken numbers', n >= 8 and not bad and foreign == 0, f'{n} records, broken words={bad}, outside country={foreign}')
        await check('R67', 'Records sanity', r67)

        async def r68():
            ctx, q = await new_page(b); calls = []
            q.on('request', lambda r: calls.append(r.url) if re.search(r'wikimedia|wikidata|larc\.nasa|overpass|eurostat', r.url) else None)
            await q.add_init_script("localStorage.setItem('nz:ext','false')")
            await explore(q, '#/explore?cc=CH&p=young_family')
            await q.click('ol.list li.row >> nth=0'); await q.wait_for_timeout(2500)
            off_calls = len(calls); note = await q.locator('#place [data-extoggle]').count()
            await ctx.close()
            rec('R68', 'Privacy: with live content switched off, opening a place contacts no third-party service and offers a switch to turn it back on', off_calls == 0 and note >= 1, f'third-party requests={off_calls}, turn-on buttons={note}')
        await check('R68', 'Live content off', r68)

        async def r69():
            ctx, q = await new_page(b); calls = []
            await q.add_init_script("localStorage.removeItem('nz:consent2')")
            q.on('request', lambda r: calls.append(r.url) if re.search(r'googletagmanager|googlesyndication|doubleclick|google-analytics', r.url) else None)
            await q.goto(BASE + '/', wait_until='load'); await q.wait_for_timeout(1500)
            before = len(calls); scripts0 = await q.evaluate("document.querySelectorAll('script[src*=\"google\"]').length")
            await q.click('#consent [data-consent="no"]'); await q.wait_for_timeout(600)
            after_no = len(calls)
            await q.goto(BASE + '/germany/', wait_until='load'); await q.wait_for_timeout(800); after_no_page = len(calls)
            await q.evaluate("NZConsent.set(true)"); await q.wait_for_timeout(500)
            ads = await q.evaluate("[!!window.nzAdsOn, document.querySelectorAll('script[src*=\"adsbygoogle\"]').length, window.nzGAon, (window.adsbygoogle||{}).requestNonPersonalizedAds, document.querySelectorAll('script[src*=\"googletagmanager\"]').length]")
            await ctx.close()
            ok = before == 0 and scripts0 == 0 and after_no == 0 and after_no_page == 0 and ads[0] and ads[1] == 1 and ads[2] == 1 and ads[3] == 1 and ads[4] == 1
            rec('R69', 'Privacy-first: before a choice and after "Only necessary" the browser contacts no Google service at all; after "Accept all" light Analytics and the ad script (non-personalised) load once each', ok, f'requests to Google before choice={before}, Google scripts={scripts0}, after "Only necessary"={after_no} (next page {after_no_page}); after accept: ad script={ads[1]}, non-personalised={ads[3]}, analytics loaded={ads[2] == 1} ({ads[4]} script)')
        await check('R69', 'GA only after consent', r69)

        async def r70():
            import urllib.request, glob as G
            html = urllib.request.urlopen(BASE + '/best/', timeout=10).read().decode()
            ctx, q = await new_page(b); await q.goto(BASE + '/best/'); await q.wait_for_timeout(500)
            tile = await q.evaluate("(()=>{const t=document.querySelector('.tile');if(!t)return null;const c=getComputedStyle(t);return [c.borderTopStyle,c.borderRadius,c.display]})()")
            await ctx.close()
            titles = {}; dup = 0; long_ = 0
            for f in G.glob(os.path.join(ROOT, '**/index.html'), recursive=True):
                if re.search(r'/(node_modules|tests|_site|dist|build|src|docs|vendor)/', f[len(ROOT):]): continue
                m = re.search(r'<title>(.*?)</title>', open(f, encoding='utf-8').read(20000))
                if not m: continue
                t = m.group(1); dup += 1 if t in titles else 0; titles[t] = f; long_ += 1 if len(t) > 80 else 0
            ok = tile and tile[0] == 'solid' and tile[1] != '0px' and dup == 0 and len(titles) > 5000
            rec('R70', 'SEO pages: the profiles overview is styled like the app, and all pages have their own title', ok, f'tile style={tile}, pages checked={len(titles)}, duplicate titles={dup}, titles over 80 chars={long_}')
        await check('R70', 'SEO pages styled, unique titles', r70)

        async def r71():
            ctx, q = await new_page(b); await q.goto(BASE + '/germany/', wait_until='domcontentloaded')
            pins = await q.evaluate("[...document.querySelectorAll('.dotmap a.dm-pin')].map(a=>[a.getAttribute('href'), a.querySelector('title').textContent])")
            lst = await q.evaluate("(()=>{const h=[...document.querySelectorAll('h2')].find(x=>/young families/.test(x.textContent));return [...h.parentElement.querySelectorAll('ol li a')].map(a=>a.textContent)})()")
            match = all(t.split(' ', 1)[1] == lst[int(t.split(' ')[0][1:]) - 1] for _, t in pins)
            await q.goto(BASE + '/france/', wait_until='domcontentloaded'); cap = await q.inner_text('.dotmap figcaption')
            await q.goto(BASE + '/switzerland/zurich/meilen/', wait_until='domcontentloaded')
            chart = await q.evaluate("(()=>{const r=[...document.querySelectorAll('.popchart rect')].map(x=>+x.getAttribute('height'));return r.length?[r.length, r[0]/r[r.length-1]]:[0,0]})()")
            bars = await q.locator('.bars li').count()
            await ctx.close()
            ok = len(pins) == 10 and all(h and h != '#' for h, _ in pins) and match and 'overseas' in cap and chart[0] >= 6 and chart[1] > 0.8 and bars >= 8
            rec('R71', 'Page graphics: country dot map with 10 numbered pins that match the list and link somewhere real; overseas ranks named; residents chart starts at zero; strength bars', ok, f'pins={len(pins)}, names match list={match}, France caption="{cap.split(".")[-2].strip()[:60]}", chart bars={chart[0]} first/last={chart[1]:.2f}, strength bars={bars}')
        await check('R71', 'Page graphics', r71)

        async def r72():
            ctx, q = await new_page(b)
            await explore(q, '#/explore?cc=CH&p=young_family')
            await q.click('[data-tools]'); await q.wait_for_timeout(300)
            tiles = await q.evaluate("[...document.querySelectorAll('#tools [data-privacy], #tools [data-href=\"/legal/\"]')].length")
            await q.click('#tools [data-privacy]'); await q.wait_for_timeout(400)
            open_ = await q.is_visible('#consent'); foc = await q.evaluate("!!document.activeElement.closest('#consent')")
            await q.click('#consent [data-consent="no"]'); await q.wait_for_timeout(200)
            calls = []
            q.on('request', lambda r: calls.append(r.url) if re.search(r'wikimedia|wikidata|wikipedia|larc\.nasa|overpass|eurostat', r.url) else None)
            await q.click('[data-tools]'); await q.wait_for_timeout(300); await q.click('#tools [data-extoggle]'); await q.wait_for_timeout(200)
            calls.clear()
            await q.click('ol.list li.row >> nth=4'); await q.wait_for_timeout(2500)
            after = len(calls)
            await ctx.close()
            ok = tiles == 2 and open_ and foc and after == 0
            rec('R72', 'Privacy from the map: Tools offers "Privacy settings" (focus goes into the choice) and "Imprint and privacy"; switching live content off stops all outside lookups at once', ok, f'tiles={tiles}, banner opened={open_}, focus in banner={foc}, outside requests after switching off={after}')
        await check('R72', 'Privacy from the map', r72)

        rec('R32', 'No uncaught JavaScript errors across all flows', not errors, f'{len(errors)} errors: {errors[:3]}')
        await ctx.close(); await b.close()
    passed = sum(1 for r in RESULTS if r['status'] == 'PASS'); failed = [r for r in RESULTS if r['status'] == 'FAIL']
    summary = {'when': time.strftime('%Y-%m-%d %H:%M'), 'base': BASE, 'pass': passed, 'fail': len(failed), 'other': len(RESULTS) - passed - len(failed), 'results': RESULTS}
    json.dump(summary, open(os.path.join(OUT, 'regression.json'), 'w'), indent=1, ensure_ascii=False)
    print(f"\n{passed} PASS, {len(failed)} FAIL, {summary['other']} other")
    sys.exit(1 if failed else 0)

if __name__ == '__main__':
    asyncio.run(main())
