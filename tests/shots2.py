import asyncio, sys
from playwright.async_api import async_playwright
B='http://localhost:8787'; O='/home/claude/nestlyzer/tests/shots/'
async def run():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--enable-unsafe-swiftshader','--use-angle=swiftshader'])
        ctx=await b.new_context(viewport={'width':1440,'height':900}); await ctx.add_init_script("localStorage.setItem('nz:consent','\"no\"')")
        pg=await ctx.new_page()
        await pg.goto(B+'/'); await pg.wait_for_timeout(800); await pg.screenshot(path=O+'s_landing_full.png',full_page=True)
        await pg.goto(B+'/#/explore?cc=CH&p=young_family&sel=CH:156'); await pg.wait_for_timeout(5000)
        await pg.screenshot(path=O+'s_explore.png')
        for i,y in enumerate([700,1500,2400,3300]):
            await pg.evaluate(f"document.querySelector('#placescroll').scrollTop={y}"); await pg.wait_for_timeout(300); await pg.screenshot(path=O+f's_place{i}.png',clip={'x':960,'y':115,'width':480,'height':785})
        await pg.click('[data-builder] >> nth=0'); await pg.wait_for_timeout(600); await pg.screenshot(path=O+'s_builder.png'); await pg.keyboard.press('Escape')
        await pg.click('[data-theme-toggle]'); await pg.wait_for_timeout(1500); await pg.screenshot(path=O+'s_dark.png'); await pg.click('[data-theme-toggle]')
        await pg.goto(B+'/#/explore?cc=DE&p=commuter'); await pg.wait_for_timeout(6000); await pg.screenshot(path=O+'s_de.png')
        await pg.goto(B+'/switzerland/zurich/meilen/'); await pg.wait_for_timeout(500); await pg.screenshot(path=O+'s_page_meilen.png',full_page=True)
        await pg.goto(B+'/germany/'); await pg.wait_for_timeout(500); await pg.screenshot(path=O+'s_page_de.png')
        await b.close()
asyncio.run(run())
