"""Release 2.1 screenshots into tests/shots/v21_*.png"""
import asyncio
from playwright.async_api import async_playwright
B = 'http://localhost:8787'; O = '/home/claude/nestlyzer/tests/shots/v21_'
ARGS = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
INIT = "localStorage.setItem('nz:toured','1');if(!sessionStorage.getItem('c')){localStorage.setItem('nz:consent2',JSON.stringify({v:2,a:false,d:false,t:1}));sessionStorage.setItem('c','1')}"
async def ptab(pg, t):
    await pg.evaluate("t=>{document.querySelector('#place [data-ptab=\"'+t+'\"][role=tab]').click();const s=document.querySelector('#placescroll'),tb=document.querySelector('#place .ptabs');s.scrollTop=tb.offsetTop-4}", t); await pg.wait_for_timeout(900)
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}); await ctx.add_init_script(INIT); pg = await ctx.new_page()
        await pg.goto(B + '/'); await pg.wait_for_timeout(4500); await pg.screenshot(path=O + 'd_home.png')
        await pg.goto(B + '/#/explore?cc=CH&p=young_family&sel=CH:156'); await pg.wait_for_timeout(6000); await pg.screenshot(path=O + 'd_place.png')
        await ptab(pg, 'facts'); await pg.screenshot(path=O + 'd_facts.png', clip={'x': 960, 'y': 60, 'width': 480, 'height': 840})
        await ptab(pg, 'compare'); await pg.screenshot(path=O + 'd_ptcompare.png', clip={'x': 960, 'y': 60, 'width': 480, 'height': 840})
        await ptab(pg, 'overview')
        await pg.evaluate("document.querySelector('[data-closeplace]').click()"); await pg.wait_for_timeout(500)
        await pg.click('.scope-tools [data-filters]'); await pg.wait_for_timeout(500); await pg.click('[data-terrain="hills"]'); await pg.wait_for_timeout(700); await pg.screenshot(path=O + 'd_filters.png'); await pg.click('[data-clearfilters]'); await pg.keyboard.press('Escape')
        await pg.click('#listtabs [data-lt="records"]'); await pg.wait_for_timeout(500); await pg.screenshot(path=O + 'd_records.png', clip={'x': 0, 'y': 60, 'width': 420, 'height': 840}); await pg.click('#listtabs [data-lt="ranking"]')
        await pg.evaluate("document.querySelector('.profilebar [data-tools]').click()"); await pg.wait_for_timeout(500); await pg.screenshot(path=O + 'd_tools.png', clip={'x': 1020, 'y': 0, 'width': 420, 'height': 900}); await pg.keyboard.press('Escape')
        for i in range(3): await pg.click(f'ol.list li.row >> nth={i} >> [data-cmp]')
        await pg.click('#tray [data-opencmp]'); await pg.wait_for_timeout(1200); await pg.screenshot(path=O + 'd_compare.png'); await pg.keyboard.press('Escape'); await pg.click('[data-clearcmp]')
        await pg.evaluate("document.querySelector('.profilebar [data-tools]').click()"); await pg.wait_for_timeout(300); await pg.click('#tools [data-game]'); await pg.wait_for_timeout(1000); await pg.click('#modal [data-guess="b"]'); await pg.wait_for_timeout(500); await pg.screenshot(path=O + 'd_game.png'); await pg.keyboard.press('Escape')
        await pg.select_option('#f-layer', 'p:relief'); await pg.wait_for_timeout(2000); await pg.screenshot(path=O + 'd_layer.png')
        await ctx.close()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2); await ctx.add_init_script(INIT); pg = await ctx.new_page()
        await pg.goto(B + '/'); await pg.wait_for_timeout(4000); await pg.screenshot(path=O + 'm_home.png')
        await pg.goto(B + '/#/explore?cc=CH&p=young_family'); await pg.wait_for_timeout(5000); await pg.screenshot(path=O + 'm_map.png')
        await pg.click('[data-mt="list"]'); await pg.wait_for_timeout(800); await pg.screenshot(path=O + 'm_list.png')
        await pg.click('.scope-bar [data-filters]'); await pg.wait_for_timeout(600); await pg.screenshot(path=O + 'm_filters.png'); await pg.keyboard.press('Escape')
        await pg.click('#listtabs [data-lt="records"]'); await pg.wait_for_timeout(500); await pg.screenshot(path=O + 'm_records.png'); await pg.click('#listtabs [data-lt="ranking"]')
        await pg.click('.mobile-tabs [data-tools]'); await pg.wait_for_timeout(500); await pg.screenshot(path=O + 'm_tools.png'); await pg.keyboard.press('Escape')
        await pg.goto(B + '/#/explore?cc=CH&p=young_family&sel=CH:156'); await pg.wait_for_timeout(5000); await pg.screenshot(path=O + 'm_place.png')
        await b.close()
asyncio.run(run())
