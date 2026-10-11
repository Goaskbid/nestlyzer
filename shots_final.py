"""Release screenshots (desktop 1440x900, phone 390x844) into tests/shots/final_*.png"""
import asyncio
from playwright.async_api import async_playwright
B = 'http://localhost:8787'; O = '/home/claude/nestlyzer/tests/shots/final_'
ARGS = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
NOCONSENT = "localStorage.setItem('nz:toured','1');if(!sessionStorage.getItem('c')){localStorage.setItem('nz:consent2',JSON.stringify({v:2,a:false,d:false,t:1}));sessionStorage.setItem('c','1')}"
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}); await ctx.add_init_script(NOCONSENT)
        pg = await ctx.new_page()
        await pg.goto(B + '/'); await pg.wait_for_timeout(4500); await pg.screenshot(path=O + 'd_home.png')
        await pg.goto(B + '/#/explore?cc=CH&p=young_family&sel=CH:156'); await pg.wait_for_timeout(6000); await pg.screenshot(path=O + 'd_place.png')
        await pg.goto(B + '/#/explore?cc=FR&p=remote'); await pg.wait_for_timeout(8000); await pg.screenshot(path=O + 'd_france.png')
        await pg.click('[data-builder] >> nth=0'); await pg.wait_for_timeout(800); await pg.screenshot(path=O + 'd_builder.png')
        await pg.goto(B + '/switzerland/zurich/meilen/'); await pg.wait_for_timeout(800); await pg.screenshot(path=O + 'd_page.png')
        await pg.goto(B + '/legal/#cookies'); await pg.wait_for_timeout(800); await pg.screenshot(path=O + 'd_legal.png')
        await ctx.close()
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}); await ctx.add_init_script(NOCONSENT + ";localStorage.setItem('nz:theme','\"dark\"')")
        pg = await ctx.new_page()
        await pg.goto(B + '/#/explore?cc=DK&p=coastal'); await pg.wait_for_timeout(7000); await pg.screenshot(path=O + 'd_dark.png')
        await ctx.close()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2); await ctx.add_init_script(NOCONSENT)
        pg = await ctx.new_page()
        await pg.goto(B + '/'); await pg.wait_for_timeout(4000); await pg.screenshot(path=O + 'm_home.png')
        await pg.evaluate("localStorage.removeItem('nz:consent2')"); await pg.goto(B + '/switzerland/'); await pg.wait_for_timeout(4000); await pg.screenshot(path=O + 'm_consent.png'); await pg.click('[data-consent="no"]')
        await pg.goto(B + '/#/explore?cc=CH&p=young_family'); await pg.wait_for_timeout(5000); await pg.screenshot(path=O + 'm_map.png')
        await pg.click('[data-mt="list"]'); await pg.wait_for_timeout(800); await pg.screenshot(path=O + 'm_list.png')
        await pg.goto(B + '/#/explore?cc=CH&p=young_family&sel=CH:156'); await pg.wait_for_timeout(5000); await pg.screenshot(path=O + 'm_place.png')
        await b.close()
asyncio.run(run())
