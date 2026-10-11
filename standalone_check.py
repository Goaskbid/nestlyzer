"""Opens dist/nestlyzer.html straight from disk (file://), like a user double-clicking it, and exercises the main flows."""
import asyncio, sys, json
from playwright.async_api import async_playwright
F = 'file:///home/claude/nestlyzer/dist/nestlyzer.html'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/nestlyzer/tests/shots/'
ARGS = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
async def run():
    res = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        for mobile in (False, True):
            tag = 'm' if mobile else 'd'
            ctx = await b.new_context(viewport={'width': 390, 'height': 844} if mobile else {'width': 1440, 'height': 900}, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1)
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            await pg.goto(F); await pg.evaluate("localStorage.setItem('nz:toured','1')"); await pg.wait_for_timeout(4000)
            res[tag + '_hero_points'] = await pg.evaluate("window.NZ ? 1 : 0")
            res[tag + '_landing_tiles'] = await pg.locator('#countries .tile').count()
            res[tag + '_broken_imgs'] = await pg.evaluate("[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&i.offsetParent).map(i=>i.getAttribute('src').slice(0,40))")
            await pg.screenshot(path=OUT + f'sa_{tag}_home.png')
            # the owner's bug report: picking Germany on the start screen must open Germany, with the chosen household
            await pg.select_option('#start-country', 'DE'); await pg.click('.who [data-who="pensioner"]')
            await pg.click('[data-start="go"]')
            await pg.wait_for_function("window.NZ && NZ.res && NZ.res.scored && NZ.scope.length && NZ.state.view==='explore'", timeout=60000); await pg.wait_for_timeout(5000)
            res[tag + '_start_DE'] = await pg.evaluate("NZ.state.cc + ' ' + NZ.state.profile + ' ' + NZ.scope[0].country + ' ' + location.hash.split('&sel')[0]")
            await pg.screenshot(path=OUT + f'sa_{tag}_start_de.png')
            await pg.evaluate("location.hash='#/explore?cc=CH&p=young_family'")
            await pg.wait_for_function("NZ.state.cc==='CH' && NZ.scope.length && NZ.scope[0].country==='CH'", timeout=60000); await pg.wait_for_timeout(3000)
            res[tag + '_ranked_CH'] = await pg.evaluate("NZ.res.scored.length")
            res[tag + '_map_canvas'] = await pg.evaluate("!!document.querySelector('#map canvas')")
            await pg.screenshot(path=OUT + f'sa_{tag}_explore.png')
            await pg.evaluate("location.hash='#/explore?cc=CH&p=young_family&sel=CH:156'"); await pg.wait_for_timeout(4500)
            res[tag + '_place'] = await pg.evaluate("NZ.state.selected && NZ.record(NZ.state.selected).name")
            await pg.screenshot(path=OUT + f'sa_{tag}_place.png')
            await pg.evaluate("location.hash='#/explore?cc=FR&p=remote'")
            await pg.wait_for_function("NZ.state.cc==='FR' && NZ.scope.length && NZ.scope[0].country==='FR'", timeout=90000); await pg.wait_for_timeout(4000)
            res[tag + '_ranked_FR'] = await pg.evaluate("NZ.res.scored.length")
            await pg.screenshot(path=OUT + f'sa_{tag}_france.png')
            if not mobile:
                await pg.keyboard.press('/'); await pg.fill('#pal-q', 'Genf'); await pg.wait_for_timeout(1500)
                res['d_search'] = (await pg.inner_text('#pal-list li >> nth=0')).split('\n')[0]
                await pg.keyboard.press('Enter'); await pg.wait_for_function("NZ.state.cc==='CH' && NZ.state.selected", timeout=60000); await pg.wait_for_timeout(2500)
                res['d_search_opened'] = await pg.evaluate("NZ.record(NZ.state.selected).name")
                await pg.click('[data-builder] >> nth=0'); await pg.wait_for_timeout(800)
                res['d_builder'] = await pg.locator('[data-bt]').count()
                await pg.screenshot(path=OUT + 'sa_d_builder.png'); await pg.keyboard.press('Escape')
            # a static link inside the single file (country tile on the home page) must stay inside the app
            await pg.evaluate("location.hash=''"); await pg.wait_for_timeout(1500)
            await pg.locator('#countries .tile', has_text='Austria').first.click()
            await pg.wait_for_function("NZ.state.cc==='AT' && NZ.scope.length && NZ.scope[0].country==='AT'", timeout=60000); await pg.wait_for_timeout(1500)
            res[tag + '_tile_AT'] = await pg.evaluate("NZ.state.cc + ' ' + NZ.state.view")
            if not mobile:
                await pg.evaluate("location.hash=''"); await pg.wait_for_timeout(1000)
                await pg.click('.footer-legal a[href="/legal/#privacy"]'); await pg.wait_for_timeout(500)
                res['d_legal_inside'] = await pg.is_visible('#nz-doc') and 'Privacy policy' in (await pg.inner_text('#nz-doc'))
                await pg.click('#nz-doc button')
            res[tag + '_errors'] = errs
            await ctx.close()
        await b.close()
    print(json.dumps(res, ensure_ascii=False, indent=1))
    summ = {'home page': 'light map drawn, %d country tiles, %d broken images' % (res['d_landing_tiles'], len(res['d_broken_imgs'])), 'Switzerland ranked': res['d_ranked_CH'], 'place opened': res['d_place'], 'France ranked': res['d_ranked_FR'], 'search "Genf" opened': res.get('d_search_opened'), 'builder countries': res.get('d_builder'), 'phone: France ranked': res['m_ranked_FR'], 'start screen Germany + Pensioner couple (desktop)': res['d_start_DE'], 'start screen Germany + Pensioner couple (phone)': res['m_start_DE'], 'Austria tile opens': res['d_tile_AT'] + ' / ' + res['m_tile_AT'], 'imprint and privacy open inside the file': res.get('d_legal_inside'), 'JavaScript errors': len(res['d_errors']) + len(res['m_errors'])}
    json.dump(summ, open('/home/claude/nestlyzer/tests/results/standalone.json', 'w'), ensure_ascii=False, indent=1)
asyncio.run(run())
