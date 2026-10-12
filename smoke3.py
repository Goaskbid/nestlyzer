"""Quick visual smoke test of the v3 workspace (desktop + phone), with console errors."""
import asyncio, sys, json
from playwright.async_api import async_playwright
B = 'http://localhost:8787'; O = '/home/claude/nestlyzer/tests/shots/v3_'
ARGS = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
INIT = "localStorage.setItem('nz:consent2',JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')"
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        for mobile in (False, True):
            tag = 'm' if mobile else 'd'
            ctx = await b.new_context(viewport={'width': 390, 'height': 844} if mobile else {'width': 1440, 'height': 900}, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1)
            await ctx.add_init_script(INIT)
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
            await pg.goto(B + '/#/explore?cc=CH&p=young_family&sel=CH:156'); await pg.wait_for_timeout(6000)
            await pg.screenshot(path=O + tag + '_place.png')
            for t in ['facts', 'around', 'compare', 'photos']:
                await pg.evaluate("t=>{document.querySelector('#place [data-ptab=\"'+t+'\"][role=tab]').click();const s=document.querySelector('#placescroll'),tb=document.querySelector('#place .ptabs');s.scrollTop=tb.offsetTop-4}", t); await pg.wait_for_timeout(900)
                await pg.screenshot(path=O + tag + '_tab_' + t + '.png')
            await pg.evaluate("document.querySelector('[data-closeplace]').click()"); await pg.wait_for_timeout(500)
            if mobile:
                await pg.click('[data-mt="list"]'); await pg.wait_for_timeout(600)
            await pg.screenshot(path=O + tag + '_list.png')
            await pg.evaluate("[...document.querySelectorAll('[data-filters]')].find(b=>b.offsetParent).click()"); await pg.wait_for_timeout(500)
            await pg.screenshot(path=O + tag + '_filters.png')
            await pg.keyboard.press('Escape')
            await pg.evaluate("document.querySelector('[data-lt=\"records\"][role=tab]').click()"); await pg.wait_for_timeout(500)
            await pg.screenshot(path=O + tag + '_records.png')
            await pg.evaluate("document.querySelector('[data-tools]').click()" if not mobile else "document.querySelector('.mobile-tabs [data-tools]').click()"); await pg.wait_for_timeout(500)
            await pg.screenshot(path=O + tag + '_tools.png')
            print(tag, 'errors', errs)
            await ctx.close()
        await b.close()
asyncio.run(run())
