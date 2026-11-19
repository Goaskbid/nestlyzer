#!/usr/bin/env python3
"""2.15.30-r8: official files collected on 19 Nov 2026 (Eurostat NUTS 3, INE Portugal, US Census, CNAF), shown as labelled
context and as citable Insights pages; US state arms read the state from the right code.
    python3 tests/test_r8_data.py [base_url]"""
import csv, json, os, re, sys, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787'
c = {}
X = {os.path.basename(f)[:-5]: (json.load(open(f)).get('ctx') or {}) for f in glob.glob(os.path.join(ROOT, 'data/x/*.json'))}
eu = [o for x in X.values() for o in x.get('records', []) if o['record_id'].startswith('NZ_EU8_')]
c['Eurostat NUTS 3: 6 figures for 1,200+ regions in 25+ countries'] = len({o['source_geo_id'] for o in eu}) >= 1200 and len({k for k, x in X.items() if any(o['record_id'].startswith('NZ_EU8_') for o in x.get('records', []))}) >= 25
c['every new figure carries not_scored and official_file'] = all('not_scored' in o.get('quality_flags', []) and 'official_file' in o.get('quality_flags', []) for x in X.values() for o in x.get('records', []) if re.match(r'NZ_(EU|US|PT|FR)8_', o['record_id']))
pt = [o for o in X['PT']['records'] if o['indicator_id'] == 'rent_new_lease_median_m2_year']
c['Portugal: INE new-lease rents for 200+ municipalities on 2,000+ parishes'] = len(pt) >= 200 and sum(1 for v in X['PT']['places'].values() for e in v if e[0].startswith('PT:municipality:')) >= 2000
us = [o for o in X['US']['records'] if o['indicator_id'].startswith('us_')]
c['US: migration for all 50 states and DC'] = len({o['source_geo_id'] for o in us}) == 51
fr = [o for o in X['FR']['records'] if o['indicator_id'] == 'childcare_places_under3_all_forms' and o['source_geo_level'] == 'municipality']
c['France: CNAF childcare for 900+ towns'] = len({o['source_geo_id'] for o in fr}) >= 900
scored = json.dumps(json.load(open(os.path.join(ROOT, 'data/kpis.json'))))
c['nothing new feeds a score'] = not any(k in scored for k in ('eu_net_migration_rate', 'eu_median_age', 'us_domestic_migration_rate', 'rent_new_lease_median_m2_year'))
for rel, n in [('insights/europe-regions-migration-and-age', 1000), ('insights/where-americans-move-by-state', 51), ('insights/childcare-in-french-towns', 900), ('insights/new-lease-rents-portugal', 200)]:
    f = os.path.join(ROOT, rel, 'index.html'); ok = os.path.isfile(f)
    if ok:
        h = open(f, encoding='utf-8').read(); m = re.search(r'href="(/insights/[^"]+\.csv)"', h)
        rows = list(csv.reader(open(os.path.join(ROOT, m.group(1).lstrip('/')), encoding='utf-8'))) if m else []
        ok = bool(m) and len(rows) - 1 >= n and 'Dataset' in h and 'noindex' not in h and not any(re.fullmatch(r'[A-Z]{2}[A-Z0-9]{3}|US-[A-Z]{2}|INSEE_COM:\d+', r[1] if rel.startswith('insights/europe') else r[2]) for r in rows[1:])
    c['/%s/: charts, CSV (%d+ rows with names), Dataset markup, indexable' % (rel, n)] = ok
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    br = pw.chromium.launch(); ctx = br.new_context(viewport={'width': 1400, 'height': 1000}); asked = []
    def wd(route):
        m = re.search(r'haswbstatement%3AP300%3D([^&]+)', route.request.url)
        if m: asked.append(m.group(1))
        route.fulfill(status=200, content_type='application/json', body='{}')
    ctx.route('**/*wikidata.org/**', wd); ctx.route(lambda u: not u.startswith(B) and 'wikidata' not in u, lambda r: r.abort())
    ctx.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}")
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); T = {}
    for pid, prof in [('DE:14628110', 'pensioner'), ('US:5128581', 'young_professional'), ('PT:110601', 'young_family')]:
        pg.goto('%s/#/explore?cc=%s&p=%s&sel=%s' % (B, pid[:2], prof, pid)); pg.wait_for_selector('#place.open', timeout=120000)
        for tb in pg.locator('#place [data-ptab][role=tab]').all():
            try: tb.click(timeout=3000); pg.wait_for_timeout(400)
            except Exception: pass
        pg.wait_for_timeout(1500); T[pid] = re.sub(r'\s+', ' ', pg.evaluate("document.querySelector('#place').textContent"))
    br.close()
c['Freital: median age and net migration of its NUTS 3 region'] = 'Median age of residents' in T['DE:14628110'] and 'Net migration into the region' in T['DE:14628110']
c['New York City: migration rates of its state'] = 'Americans moving in from other states' in T['US:5128581'] and 'Net arrivals from abroad' in T['US:5128581']
c['US state arms asked for US-NY (not a neighbouring state)'] = 'US-NY' in asked and 'US-NJ' not in asked
c['Lisbon parish: calendar-year municipal new-lease rent'] = 'calendar year' in T['PT:110601']
c['no script errors'] = not errs
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('R8 DATA TEST:', 'PASS' if ok else 'FAIL', errs[:2]); sys.exit(0 if ok else 1)
