import asyncio, sys, time, json
from playwright.async_api import async_playwright
BASE = 'http://localhost:8787'
OUT = '/home/claude/nestlyzer/tests/shots/'
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--enable-unsafe-swiftshader','--use-angle=swiftshader'])
        errs = []
        for name, vp, mobile in [('d', {'width': 1440, 'height': 900}, False), ('m', {'width': 390, 'height': 844}, True)]:
            ctx = await b.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1)
            pg = await ctx.new_page()
            pg.on('pageerror', lambda e, n=name: errs.append(f'{n} PAGEERR {e}'))
            pg.on('console', lambda m, n=name: errs.append(f'{n} {m.type}: {m.text[:160]}') if m.type in ('error', 'warning') else None)
            t = time.time(); await pg.goto(BASE + '/', wait_until='domcontentloaded'); print(name, 'landing load', round(time.time() - t, 2))
            await pg.wait_for_timeout(800)
            await pg.screenshot(path=OUT + f'{name}_landing.png')
            await pg.screenshot(path=OUT + f'{name}_landing_full.png', full_page=True)
            await pg.click('[data-consent="no"]')
            t = time.time(); await pg.goto(BASE + '/#/explore?cc=CH&p=young_family', wait_until='domcontentloaded')
            await pg.wait_for_selector('li.row', timeout=20000, state='attached'); print(name, 'CH ranking visible', round(time.time() - t, 2))
            await pg.wait_for_timeout(4000)
            await pg.screenshot(path=OUT + f'{name}_ch.png')
            if mobile:
                await pg.click('[data-mt="list"]'); await pg.wait_for_timeout(500); await pg.screenshot(path=OUT + f'{name}_ch_list.png')
            if mobile: await pg.click('[data-mt="list"]'); await pg.wait_for_timeout(300)
            await pg.click('li.row >> nth=1'); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=OUT + f'{name}_place.png')
            await pg.goto(BASE + '/#/explore?cc=FR&p=coastal', wait_until='domcontentloaded'); await pg.wait_for_timeout(500)
            await pg.reload(wait_until='domcontentloaded')
            await pg.wait_for_selector('li.row', timeout=30000, state='attached'); await pg.wait_for_timeout(4000)
            if mobile: await pg.click('[data-mt="map"]'); await pg.wait_for_timeout(800)
            await pg.screenshot(path=OUT + f'{name}_fr.png')
            await ctx.close()
        await b.close()
        print('\n'.join(errs[:40]))
asyncio.run(run())
