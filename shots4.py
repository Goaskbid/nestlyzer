import asyncio
from playwright.async_api import async_playwright
B='http://localhost:8787'; O='/home/claude/nestlyzer/tests/shots/'
async def run():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--enable-unsafe-swiftshader','--use-angle=swiftshader'])
        ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2); await ctx.add_init_script("localStorage.setItem('nz:consent','\"no\"')")
        pg=await ctx.new_page()
        await pg.goto(B+'/'); await pg.wait_for_timeout(3500); await pg.evaluate("window.scrollTo(0,700)"); await pg.wait_for_timeout(500); await pg.screenshot(path=O+'w_m_scrolled.png')
        await pg.click('summary[aria-label="Menu"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=O+'w_m_menu.png')
        await pg.goto(B+'/#/explore?cc=CH&p=young_family&sel=CH:156'); await pg.wait_for_timeout(5000); await pg.screenshot(path=O+'w_m_place.png')
        await pg.click('[data-mt="list"]'); await pg.wait_for_timeout(800); await pg.evaluate("document.querySelector('.rail .scroll').scrollTop=150"); await pg.wait_for_timeout(300); await pg.screenshot(path=O+'w_m_list.png')
        await ctx.close()
        ctx=await b.new_context(viewport={'width':1440,'height':900}); await ctx.add_init_script("localStorage.setItem('nz:consent','\"no\"');localStorage.setItem('nz:theme','\"dark\"')")
        pg=await ctx.new_page()
        await pg.goto(B+'/#/explore?cc=DK&p=coastal'); await pg.wait_for_timeout(7000); await pg.screenshot(path=O+'w_d_dark_dk.png')
        await pg.goto(B+'/denmark/'); await pg.wait_for_timeout(800); await pg.screenshot(path=O+'w_d_dark_static.png')
        await b.close()
asyncio.run(run())
