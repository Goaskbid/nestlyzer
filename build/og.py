# Renders assets/og.png (1200x630 social card) from the built hero map. Run after build_site.
import asyncio, os
from playwright.async_api import async_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import json
N=sum(c["n"] for c in json.load(open(os.path.join(ROOT,"data","meta.json")))["countries"])
HTML=f"""<html><head><style>@font-face{{font-family:B;src:url(file://{ROOT}/assets/fonts/bricolage-grotesque-latin-standard-normal.woff2)}}@font-face{{font-family:P;src:url(file://{ROOT}/assets/fonts/public-sans-latin-wght-normal.woff2)}}
body{{margin:0;width:1200px;height:630px;background:#F2F4F0;font-family:P;display:grid;grid-template-columns:520px 1fr;align-items:center;overflow:hidden}}
.l{{padding:0 0 0 64px}}h1{{font:700 88px/0.95 B;font-stretch:82%;color:#0B2E5C;margin:22px 0 18px;letter-spacing:-2px}}p{{font-size:26px;color:#465467;margin:0}}.b{{display:flex;align-items:center;gap:12px;font:600 40px B;font-stretch:78%;color:#0B2E5C}}.b img{{width:56px}}img.m{{width:660px;margin-left:-20px}}</style></head>
<body><div class="l"><div class="b"><img src="file://{ROOT}/assets/icon-512.png">Nestlyzer</div><h1>Find where<br>you fit.</h1><p>{N:,} places in 35 European countries, ranked for your household.</p></div><img class="m" src="file://{ROOT}/assets/hero-ch.svg"></body></html>"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1200,'height':630})
        tmp=os.path.join(ROOT,'build','_og.html'); open(tmp,'w').write(HTML); await pg.goto('file://'+tmp); await pg.wait_for_timeout(1000); os.remove(tmp)
        await pg.screenshot(path=os.path.join(ROOT,'assets','og.png')); await b.close()
asyncio.run(main())
