# Renders brand PNGs (favicons, app icons) and small country flags from SVG sources.
import asyncio, os, shutil
from playwright.async_api import async_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FLAGS=os.path.join(ROOT,'..','ext','npm','node_modules','flag-icons','flags','4x3')
FLAGS=os.environ.get('NZ_FLAGS', os.path.abspath(FLAGS))
CC={'CH':'ch','AL':'al','AT':'at','BE':'be','BG':'bg','HR':'hr','CY':'cy','CZ':'cz','DK':'dk','EE':'ee','FI':'fi','FR':'fr','DE':'de','EL':'gr','HU':'hu','IS':'is','IE':'ie','IT':'it','LV':'lv','LI':'li','LT':'lt','LU':'lu','MT':'mt','NL':'nl','MK':'mk','NO':'no','PL':'pl','PT':'pt','RO':'ro','RS':'rs','SK':'sk','SI':'si','ES':'es','SE':'se','UK':'gb'}
async def shot(pg, html, path, w, h):
    tmp=os.path.join(ROOT,'build','_r.html'); open(tmp,'w').write(f'<html><body style="margin:0;width:{w}px;height:{h}px;background:transparent">{html}</body></html>')
    await pg.set_viewport_size({'width':w,'height':h}); await pg.goto('file://'+tmp); await pg.wait_for_timeout(120)
    await pg.screenshot(path=path, omit_background=True); os.remove(tmp)
async def main():
    mark=open(os.path.join(ROOT,'build','brand','mark.svg')).read()
    shutil.copy(os.path.join(ROOT,'build','brand','mark.svg'), os.path.join(ROOT,'assets','mark.svg'))
    shutil.copy(os.path.join(ROOT,'build','brand','mark-dark.svg'), os.path.join(ROOT,'assets','mark-dark.svg'))
    shutil.copy(os.path.join(ROOT,'build','brand','mark.svg'), os.path.join(ROOT,'favicon.svg'))
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page()
        for size,name,bg,pad in [(512,'icon-512.png',None,0.06),(192,'icon-192.png','#ffffff',0.12),(180,'apple-touch-icon.png','#ffffff',0.12),(512,'icon-maskable-512.png','#ffffff',0.22),(48,'favicon-48.png',None,0.02),(32,'favicon-32.png',None,0.0)]:
            inner=int(size*(1-2*pad))
            html=f'<div style="width:{size}px;height:{size}px;display:grid;place-items:center;background:{bg or "transparent"};border-radius:{0 if bg else 0}px">{mark.replace("<svg ", f"<svg width=\"{inner}\" height=\"{inner}\" ",1)}</div>'
            await shot(pg, html, os.path.join(ROOT,'assets',name), size, size)
        for cc,f in CC.items():
            svg=os.path.join(FLAGS,f+'.svg')
            await shot(pg, f'<img src="file://{svg}" style="width:48px;height:36px;display:block">', os.path.join(ROOT,'assets','flags',cc.lower()+'.png'), 48, 36)
        await b.close()
    from PIL import Image
    Image.open(os.path.join(ROOT,'assets','favicon-48.png')).save(os.path.join(ROOT,'favicon.ico'), sizes=[(16,16),(32,32),(48,48)])
asyncio.run(main())
