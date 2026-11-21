#!/usr/bin/env python3
"""2.15.30-r11: CBS business establishments for every Dutch municipality and PriceCatcher price levels for every
Malaysian state, shown as labelled context on place cards and as two citable Insights pages. No score changes.
    python3 tests/test_r11_data.py [base_url]"""
import csv, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787'
c = {}
NL = json.load(open(os.path.join(ROOT, 'data/x/NL.json')))['ctx']
MY = json.load(open(os.path.join(ROOT, 'data/x/MY.json')))['ctx']
nl = [o for o in NL['records'] if o['indicator_id'].startswith('nl_establishments') and str(o.get('reference_period', '')).endswith('2026')]
c['Netherlands: 2026 establishments for 340+ municipalities, merger-free 5-year change for 330+'] = len({o['source_geo_id'] for o in nl if o['indicator_id'] == 'nl_establishments'}) >= 340 and len({o['source_geo_id'] for o in nl if o['indicator_id'] == 'nl_establishments_change_5y'}) >= 330
c['Netherlands: every municipality code links to its places'] = sum(1 for v in NL['places'].values() for e in v if re.fullmatch(r'GM\d{4}', e[0])) >= 340
my = [o for o in MY['records'] if o['indicator_id'] == 'my_price_level_state']
c['Malaysia: price level for all 16 states and territories, linked by region'] = len({o['source_geo_id'] for o in my}) == 16 and sum(1 for g in MY['regions'] if g.startswith('MY-')) == 16
c['every new figure carries not_scored and official_file'] = all('not_scored' in o.get('quality_flags', []) and 'official_file' in o.get('quality_flags', []) for o in nl + my)
scored = json.dumps(json.load(open(os.path.join(ROOT, 'data/kpis.json'))))
c['nothing new feeds a score'] = not any(k in scored for k in ('nl_establishments', 'my_price_level_state'))
more = open(os.path.join(ROOT, 'src/more/more.js'), encoding='utf-8').read()
c['firm counts described, not ranked by size; growth ranked; Malaysian index explained against its own median'] = "o.indicator_id === 'nl_establishments') return ['ref'" in more and '/^nl_establishments_change_/.test(id)) return 1' in more and 'Malaysian median (100)' in more
for rel, n, must in [('insights/dutch-business-base-by-municipality', 330, 'Do big business centres grow faster'), ('insights/cost-of-living-malaysian-states', 16, 'national median = 100')]:
    f = os.path.join(ROOT, rel, 'index.html'); ok = os.path.isfile(f)
    if ok:
        h = open(f, encoding='utf-8').read(); m = re.search(r'href="(/insights/[^"]+\.csv)"', h)
        rows = list(csv.reader(open(os.path.join(ROOT, m.group(1).lstrip('/')), encoding='utf-8'))) if m else []
        names = [r[2] if 'dutch' in rel else r[1] for r in rows[1:]]
        ok = bool(m) and len(rows) - 1 >= n and 'Dataset' in h and 'noindex' not in h and must in h and not any(re.fullmatch(r'GM\d{4}|MY-?MY\d\d', x) for x in names)
    c['/%s/: chart, CSV (%d+ rows with names), Dataset markup, indexable' % (rel, n)] = ok
hub = open(os.path.join(ROOT, 'insights/index.html'), encoding='utf-8').read()
c['insights hub lists both pages in their themes'] = '/insights/dutch-business-base-by-municipality/' in hub and '/insights/cost-of-living-malaysian-states/' in hub
sm = ''.join(open(os.path.join(ROOT, f), encoding='utf-8').read() for f in os.listdir(ROOT) if re.fullmatch(r'sitemap.*\.xml', f))
c['both pages in the sitemap'] = 'dutch-business-base-by-municipality' in sm and 'cost-of-living-malaysian-states' in sm
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    br = pw.chromium.launch(); ctx = br.new_context(viewport={'width': 1400, 'height': 1000})
    ctx.route(lambda u: not u.startswith(B), lambda r: r.abort())
    ctx.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}")
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); T = {}
    for pid, prof in [('NL:GM0363', 'startup_founder'), ('MY:1735161', 'young_professional')]:
        pg.goto('%s/#/explore?cc=%s&p=%s&sel=%s' % (B, pid[:2], prof, pid)); pg.wait_for_selector('#place.open', timeout=120000)
        for tb in pg.locator('#place [data-ptab][role=tab]').all():
            try: tb.click(timeout=3000); pg.wait_for_timeout(400)
            except Exception: pass
        pg.wait_for_timeout(1500); T[pid] = re.sub(r'\s+', ' ', pg.evaluate("document.querySelector('#place').textContent"))
    br.close()
c['Amsterdam card: establishments and their change'] = 'Business establishments' in T['NL:GM0363'] and 'Change in business establishments' in T['NL:GM0363']
c['Kuala Lumpur card: price level against the Malaysian median'] = 'Malaysian median' in T['MY:1735161']
c['no script errors'] = not errs
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('R11 DATA TEST:', 'PASS' if ok else 'FAIL', errs[:2]); sys.exit(0 if ok else 1)
