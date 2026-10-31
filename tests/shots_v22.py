"""Screenshots for the 2.2 release report (served site on :8787, simulated Wikimedia/Wikidata/NASA/OSM/Eurostat)."""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import regress
from playwright.async_api import async_playwright
B = 'http://localhost:8787'
O = os.path.join(os.path.dirname(__file__), 'shots') + '/'
os.makedirs(O, exist_ok=True)


async def ctx_for(b, mob):
    ctx = await b.new_context(viewport={'width': 390, 'height': 844} if mob else {'width': 1440, 'height': 900}, is_mobile=mob, has_touch=mob, device_scale_factor=2 if mob else 1)
    await ctx.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}")
    await regress.mock_media(ctx)
    return ctx


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=regress.ARGS)
        # desktop
        ctx = await ctx_for(b, False); pg = await ctx.new_page()
        await pg.goto(B + '/'); await pg.wait_for_timeout(2500)
        await pg.select_option('#start-country', 'DE'); await pg.click('.who [data-who="pensioner"]')
        await pg.screenshot(path=O + 'v22_d_home.png')
        await pg.click('[data-start="go"]'); await pg.wait_for_timeout(5000)
        await pg.screenshot(path=O + 'v22_d_germany.png')
        await pg.goto(B + '/#/explore?cc=DE&p=young_family&r=M%3AHamburg'); await pg.wait_for_timeout(5000)
        await pg.click('ol.list li.row >> nth=1'); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=O + 'v22_d_hamburg.png')
        await pg.click('#place .place-top [data-cmp]'); await pg.wait_for_timeout(400)
        await pg.click('ol.list li.row >> nth=2'); await pg.wait_for_timeout(1200); await pg.click('#place .place-top [data-cmp]'); await pg.wait_for_timeout(400)
        await pg.click('ol.list li.row >> nth=3'); await pg.wait_for_timeout(1200); await pg.click('#place .place-top [data-cmp]'); await pg.wait_for_timeout(600)
        await pg.screenshot(path=O + 'v22_d_ticked.png')
        await pg.click('.sl-btn'); await pg.wait_for_timeout(600)
        await pg.screenshot(path=O + 'v22_d_shortlist.png')
        await pg.click('.sl-head [data-opencmp]'); await pg.wait_for_selector('#modal.open'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=O + 'v22_d_compare.png')
        await pg.keyboard.press('Escape')
        await pg.goto(B + '/#/explore?cc=CH&p=young_family&sel=CH:156'); await pg.wait_for_timeout(5000)
        for t in ['around', 'facts']:
            await pg.click(f'#place [data-ptab="{t}"][role="tab"]'); await pg.wait_for_timeout(1500)
            await pg.evaluate("document.querySelector('#placescroll').scrollTop = document.querySelector('#place .ptabs').offsetTop - 10")
            await pg.wait_for_timeout(300); await pg.screenshot(path=O + f'v22_d_{t}.png')
        await pg.keyboard.press('/'); await pg.fill('#pal-q', 'Lisbon'); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=O + 'v22_d_search.png'); await pg.keyboard.press('Escape')
        await pg.goto(B + '/germany/greater-hamburg/'); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=O + 'v22_d_metropage.png')
        await pg.goto(B + '/legal/#terms'); await pg.wait_for_timeout(800)
        await pg.screenshot(path=O + 'v22_d_legal.png')
        await ctx.close()
        # phone
        ctx = await ctx_for(b, True); pg = await ctx.new_page()
        await pg.goto(B + '/'); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=O + 'v22_m_home.png')
        await pg.goto(B + '/#/explore?cc=CH&p=young_family'); await pg.wait_for_timeout(5000)
        await pg.screenshot(path=O + 'v22_m_map.png')
        await pg.click('.mobile-tabs [data-mt="list"]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=O + 'v22_m_list.png')
        await pg.click('ol.list li.row >> nth=0'); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=O + 'v22_m_place.png')
        await pg.click('.place-actions [data-cmp]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=O + 'v22_m_ticked.png')
        await pg.click('#place [data-ptab="around"][role="tab"]'); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=O + 'v22_m_around.png')
        await pg.click('.mobile-tabs [data-mt="saved"]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=O + 'v22_m_shortlist.png')
        await pg.click('.mobile-tabs [data-mt="list"]'); await pg.click('.scope-bar [data-filters]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=O + 'v22_m_filters.png')
        await ctx.close(); await b.close()

asyncio.run(main())
