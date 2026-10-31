import asyncio, sys
from playwright.async_api import async_playwright
B='http://localhost:8787'; O='/home/claude/nestlyzer/tests/shots/'
async def run():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--enable-unsafe-swiftshader','--use-angle=swiftshader'])
        errs=[]
        for name,vp,mob in [('d',{'width':1440,'height':900},False),('m',{'width':390,'height':844},True)]:
            ctx=await b.new_context(viewport=vp,is_mobile=mob,has_touch=mob,device_scale_factor=2 if mob else 1); await ctx.add_init_script("localStorage.setItem('nz:consent','\"no\"')")
            pg=await ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
            await pg.goto(B+'/'); await pg.wait_for_timeout(4500); await pg.screenshot(path=O+f'v_{name}_landing.png')
            if not mob:
                await pg.hover('[data-who="coastal"]'); await pg.wait_for_timeout(1500); await pg.screenshot(path=O+f'v_{name}_landing_coastal.png')
            await pg.screenshot(path=O+f'v_{name}_landing_full.png',full_page=True)
            await pg.goto(B+'/#/explore?cc=CH&p=young_family&sel=CH:156'); await pg.wait_for_timeout(5000); await pg.screenshot(path=O+f'v_{name}_explore.png')
            if mob:
                await pg.click('[data-mt="list"]'); await pg.wait_for_timeout(1200); await pg.screenshot(path=O+f'v_{name}_list.png')
            await pg.goto(B+'/#/explore?cc=IT&p=pensioner'); await pg.wait_for_timeout(6000); await pg.screenshot(path=O+f'v_{name}_it.png')
            await ctx.close()
        print(errs)
        await b.close()
asyncio.run(run())
