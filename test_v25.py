#!/usr/bin/env python3
"""Checks for 2.5: All data tab, compare "Show all data", more households on the start screen, the data catalogue,
the extra live sources (Eurostat, USGS) and the picture filter. Outside services are replaced by local stand-ins, so the
test runs offline and checks Nestlyzer's own logic. It cannot prove that the real services answer in the same shape.

    python3 tests/test_v25.py [_site]
"""
import functools, http.server, io, json, os, re, socketserver, sys, threading
from urllib.parse import urlparse, parse_qs
from PIL import Image
from playwright.sync_api import sync_playwright

SITE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '_site')
PORT = int(os.environ.get('V25_PORT', '8923'))
res = []
def check(ok, msg): res.append((bool(ok), msg))

# ---------- stand-in data ----------
DIMS = {  # dataset: (dimension -> codes), as Eurostat publishes them (as far as known)
    'demo_r_pjanind3': {'freq': ['A'], 'unit': ['PC', 'YR'], 'indic_de': ['MEDAGEPOP', 'PC_Y0_14', 'PC_Y65_MAX']},
    'demo_r_find3': {'freq': ['A'], 'unit': ['NR'], 'indic_de': ['TOTFERRT', 'AGEMOTH']},
    'lfst_r_lfsd2pwn': {'freq': ['A'], 'unit': ['THS_PER'], 'wstatus': ['POP', 'EMP'], 'citizen': ['NAT', 'FOR', 'TOTAL'], 'sex': ['F', 'M', 'T'], 'age': ['Y15-64', 'Y20-64']},
    'nama_10r_2hhinc': {'freq': ['A'], 'unit': ['MIO_EUR', 'EUR_HAB'], 'direct': ['BAL', 'PAID'], 'na_item': ['B5N', 'B6N']},
    'ilc_peps11n': {'freq': ['A'], 'unit': ['PC', 'THS_PER']},
    'edat_lfse_04': {'freq': ['A'], 'sex': ['F', 'M', 'T'], 'age': ['Y25-64'], 'isced11': ['ED0-2', 'ED3_4', 'ED5-8'], 'unit': ['PC']},
    'ilc_mddw03': {'freq': ['A'], 'incgrp': ['A_MD60', 'B_MD60', 'TOTAL'], 'hhtyp': ['A1', 'TOTAL'], 'unit': ['PC']},
    'nama_10r_3gdp': {'freq': ['A'], 'unit': ['PPS_EU27_2020_HAB', 'EUR_HAB']},
    'lfst_r_lfu3rt': {'freq': ['A'], 'isced11': ['TOTAL'], 'sex': ['T'], 'age': ['Y15-74'], 'unit': ['PC']},
    'demo_r_mlifexp': {'freq': ['A'], 'unit': ['YR'], 'sex': ['T'], 'age': ['Y_LT1']},
    'hlth_rs_physreg': {'freq': ['A'], 'unit': ['P_HTHAB'], 'isco08': ['OC221']},
}
WANT = {  # value at the chosen codes; everything else gets 999 so a wrong pick shows up
    ('demo_r_pjanind3', 'PC_Y0_14'): 15.5, ('demo_r_pjanind3', 'PC_Y65_MAX'): 19.25, ('demo_r_pjanind3', 'MEDAGEPOP'): 42.1,
    ('demo_r_find3', 'TOTFERRT'): 1.48, ('nama_10r_2hhinc', 'B6N'): 24321, ('ilc_peps11n', 'PC'): 16.2,
    ('edat_lfse_04', 'ED5-8'): 38.7, ('ilc_mddw03', 'TOTAL'): 11.3,
}
def jsonstat(ds, geo):
    d = DIMS[ds]; ids = list(d.keys()) + ['geo', 'time']; times = ['2022', '2023']
    cats = [d[k] for k in d] + [[geo], times]; size = [len(c) for c in cats]
    vals = {}
    import itertools
    for idx, combo in enumerate(itertools.product(*cats)):
        m = dict(zip(ids, combo)); v = 999.0
        if ds == 'lfst_r_lfsd2pwn':
            if m['wstatus'] == 'POP' and m['sex'] == 'T' and m['age'] == 'Y20-64' and m['unit'] == 'THS_PER':
                v = {'FOR': 120.0, 'TOTAL': 1000.0, 'NAT': 880.0}[m['citizen']]
        elif ds == 'nama_10r_2hhinc':
            if m['unit'] == 'EUR_HAB' and m['direct'] == 'BAL' and m['na_item'] == 'B6N': v = 24321
        elif ds == 'ilc_peps11n':
            if m['unit'] == 'PC': v = 16.2
        elif ds == 'edat_lfse_04':
            if m['sex'] == 'T' and m['isced11'] == 'ED5-8': v = 38.7
        elif ds == 'ilc_mddw03':
            if m['incgrp'] == 'TOTAL' and m['hhtyp'] == 'TOTAL': v = 11.3
        elif ds in ('demo_r_pjanind3', 'demo_r_find3'):
            v = WANT.get((ds, m['indic_de']), 999.0)
            if ds == 'demo_r_pjanind3' and ((m['indic_de'] == 'MEDAGEPOP') != (m['unit'] == 'YR')): v = 999.0
        else:
            v = 50.0
        if m['time'] == '2023' or v == 999.0: vals[str(idx)] = v
    return {'id': ids, 'size': size, 'value': vals, 'dimension': {k: {'category': {'index': {c: i for i, c in enumerate(cs)}}} for k, cs in zip(ids, cats)}}

def png(color=None, grey=False, seed=0, w=160, h=120):
    im = Image.new('RGB', (w, h))
    px = im.load()
    for y in range(h):
        for x in range(w):
            if grey:
                g = (x * 2 + y + seed * 40) % 256; px[x, y] = (g, g, g)
            else:
                px[x, y] = ((x * 3 + seed * 70) % 256, (y * 2 + seed * 30) % 256, ((x + y) + seed * 90) % 256)
    b = io.BytesIO(); im.save(b, 'PNG'); return b.getvalue()
IMG = {'colour1': png(seed=1), 'colour1b': png(seed=1), 'colour2': png(seed=5), 'grey': png(grey=True), 'colour3': png(seed=9)}

def commons_page(i, name, title, cats='', artist='A', dt='2019-05-01 10:00:00'):
    url = f'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/{name}.jpg/960px-{name}.jpg'
    return {'pageid': i, 'title': 'File:' + title + '.jpg', 'index': i, 'imageinfo': [{'url': url, 'thumburl': url, 'descriptionurl': 'https://commons.wikimedia.org/wiki/File:' + name, 'mime': 'image/jpeg', 'width': 1600, 'height': 1000,
            'extmetadata': {'Categories': {'value': cats}, 'Artist': {'value': artist}, 'DateTimeOriginal': {'value': dt}, 'LicenseShortName': {'value': 'CC BY-SA 4.0'}, 'ImageDescription': {'value': title}}}]}
COMMONS = {'query': {'pages': {str(i): p for i, p in enumerate([
    commons_page(1, 'colour1', 'Lake shore in summer'),
    commons_page(2, 'colour1b', 'Village square evening', artist='B'),            # same pixels as colour1: near-copy
    commons_page(3, 'grey', 'Old harbour', artist='C'),                           # grey pixels
    commons_page(4, 'colour2', 'Portrait of the mayor', artist='D'),               # person
    commons_page(5, 'colour2', 'Map of the district', artist='E'),                 # map
    commons_page(6, 'colour2', 'Church tower', cats='Black and white photographs of churches', artist='F'),
    commons_page(7, 'colour2', 'Vineyards above the village', artist='G'),
    commons_page(8, 'colour3', 'Vineyards above the village 02', artist='G'),      # same name, numbered, same photographer: variant
    commons_page(9, 'colour3', 'Railway station building', artist='I', dt='1955-01-01 10:00:00'),  # old photo
    commons_page(10, 'colour3', 'Main street with shops', artist='J'),
])}}}
QUAKES = {'type': 'FeatureCollection', 'features': [{'properties': {'mag': 5.1, 'time': 1158000000000}, 'geometry': {'coordinates': [8.6, 47.3, 10]}}, {'properties': {'mag': 4.6, 'time': 900000000000}, 'geometry': {'coordinates': [8.0, 47.0, 10]}}]}
POWER = {'properties': {'parameter': {
    'T2M_MAX': dict(zip('JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC ANN'.split(), [3, 5, 10, 14, 19, 23, 31, 30, 21, 15, 8, 4, 15])),
    'T2M_MIN': dict(zip('JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC ANN'.split(), [-3, -2, 1, 4, 8, 11, 13, 13, 10, 6, 1, -2, 5])),
    'PRECTOTCORR': dict(zip('JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC ANN'.split(), [2, 2, 2, 3, 4, 4, 4, 4, 3, 3, 3, 2, 3])),
    'ALLSKY_SFC_SW_DWN': dict(zip('JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC ANN'.split(), [1, 2, 3, 4, 5, 6, 6, 5, 4, 2, 1, 1, 3.4]))}}}
CALLS = []

def route(r):
    u = r.request.url; p = urlparse(u); q = parse_qs(p.query); CALLS.append(u)
    J = lambda o: r.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body=json.dumps(o))
    if 'ec.europa.eu/eurostat/api' in u:
        ds = p.path.rsplit('/', 1)[-1]
        return J(jsonstat(ds, q.get('geo', ['X'])[0])) if ds in DIMS else r.fulfill(status=404, body='')
    if 'earthquake.usgs.gov' in u: return J(QUAKES)
    if 'power.larc.nasa.gov' in u: return J(POWER)
    if 'overpass-api.de' in u: return J({'elements': [{'type': 'count', 'tags': {'total': str(i)}} for i in range(17)]})
    if 'commons.wikimedia.org/w/api.php' in u: return J(COMMONS if ('geosearch' in u) else {'query': {'pages': {}}})
    if 'upload.wikimedia.org' in u:
        name = re.search(r'/\d+px-([^/.]+)\.jpg', u)
        b = IMG.get(name.group(1) if name else '', IMG['colour2'])
        return r.fulfill(status=200, content_type='image/png', headers={'Access-Control-Allow-Origin': '*'}, body=b)
    return r.abort()

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def main():
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), functools.partial(Q, directory=SITE))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{PORT}'; errors = []
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        for name, vp, mob in (('desktop', {'width': 1440, 'height': 900}, False), ('phone', {'width': 390, 'height': 844}, True)):
            ctx = b.new_context(viewport=vp, is_mobile=mob, has_touch=mob, accept_downloads=True)
            ctx.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}")
            ctx.route(re.compile(r'https?://(?!127\.0\.0\.1).*'), route)
            pg = ctx.new_page(); pg.on('pageerror', lambda e, n=name: errors.append(f'{n}: {e}'))
            # start screen: more households
            pg.goto(base + '/', wait_until='domcontentloaded')
            first = pg.locator('.who:not(.who-more) [data-who]').count()
            check(first == 8 and pg.locator('#who-more').is_hidden(), f'{name}: start screen shows 8 households, the rest folded ({first})')
            pg.click('[data-whomore]')
            pg.wait_for_function("document.querySelectorAll('#who-more [data-who]').length > 0 && !document.querySelector('#who-more').hidden", timeout=15000)
            more = pg.locator('#who-more [data-who]').count()
            check(pg.locator('#who-more').is_visible() and more == 17, f'{name}: "More households" opens {more} more (25 in total)')
            pg.click('#who-more [data-who="dinks"]')
            href = pg.get_attribute('[data-start="go"]', 'href')
            check('p=dinks' in href and pg.locator('.who [aria-pressed="true"]').count() == 1, f'{name}: picking DINKS sets the start link ({href})')
            # place: All data
            pg.goto(base + '/#/explore?cc=CH&p=young_family&sel=CH%3A156&pt=data', wait_until='domcontentloaded')
            pg.wait_for_function("window.NZ && NZ.state.selected==='CH:156' && document.querySelector('#place [data-alldata]')", timeout=45000)
            pg.wait_for_function("(document.querySelector('[data-adstatus]')||{}).textContent && !/Loading/.test(document.querySelector('[data-adstatus]').textContent)", timeout=20000)
            groups = pg.eval_on_selector_all('#place details.adg:not([hidden])', 'e => e.map(d => d.querySelector("summary b").textContent + "=" + d.querySelectorAll("tbody tr.adr").length)')
            check(len(groups) >= 10, f'{name}: All data has {len(groups)} groups: ' + ', '.join(groups))
            check(pg.locator('#place details.adg[open]').count() == 0, f'{name}: groups start closed')
            txt = pg.inner_text('#place [data-alldata]') if False else pg.evaluate("document.querySelector('#place [data-alldata]').textContent")
            need = {'Children under 15': '15.5% of residents', 'Residents aged 65 and over': '19.3% of residents', 'Median age': '42.1 years', 'Children per woman': '1.48',
                    'Foreign citizens among residents aged 20 to 64': '12.0%', 'Household disposable income per person': '€24,321 a year', 'At risk of poverty or social exclusion': '16.2% of residents',
                    'with a university degree': '38.7%', 'report crime, violence or vandalism': '11.3% (national survey)', 'Earthquakes of magnitude 4.5+': '2', 'Strongest of them': 'magnitude 5.1, 2006',
                    'Hottest month': 'Jul, average high 31 °C: hot summers', 'Months with frosty nights': '3', 'Standard VAT rate': '8.1%', 'Schengen area': 'Member', 'Post offices within 1.5 km': '14',
                    'income tax burden, CHF 100k': '%', 'Official municipality number': '156'}
            for k, v in need.items():
                row = pg.evaluate("([k]) => { const tr = [...document.querySelectorAll('#place [data-alldata] tr.adr')].find(t => t.querySelector('th').textContent.includes(k)); return tr ? tr.querySelector('td').textContent : null }", [k])
                check(row is not None and v in row, f'{name}: All data row "{k}" = {row!r}')
            bad999 = pg.evaluate("[...document.querySelectorAll('#place [data-alldata] tr.live')].filter(t => /999/.test(t.querySelector('td').textContent)).map(t => t.querySelector('th').textContent + ' = ' + t.querySelector('td').textContent)")
            check(not bad999, f'{name}: no wrong Eurostat category picked (no 999 in live rows) {bad999}')
            pg.click('[data-adall]')
            check(pg.locator('#place details.adg[open]').count() >= 10, f'{name}: "Open all groups" opens them')
            with pg.expect_download() as dl:
                pg.click('[data-adcsv]')
            path = dl.value.path(); csv = open(path, encoding='utf-8-sig').read()
            check(dl.value.suggested_filename.endswith('-all-data.csv') and csv.count('\n') > 80 and 'Children under 15' in csv, f'{name}: CSV download {dl.value.suggested_filename}, {csv.count(chr(10))} lines')
            # catalogue
            pg.click('#place [data-catalogue]')
            pg.wait_for_selector('#modal.open .catalogue')
            cat_rows = pg.locator('#modal .catalogue tbody tr').count()
            check(cat_rows >= 50 and 'Not available yet' in pg.inner_text('#modal'), f'{name}: data catalogue lists {cat_rows} datasets and what is missing')
            pg.keyboard.press('Escape')
            # photos: the filter
            pg.click('#place [data-ptab="photos"]')
            pg.wait_for_function("document.querySelectorAll('#place [data-pgrid] figure').length > 0", timeout=20000)
            caps = pg.eval_on_selector_all('#place [data-pgrid] figure img', 'e => e.map(i => i.alt)')
            check(sorted(caps) == sorted(['Lake shore in summer', 'Vineyards above the village', 'Main street with shops']), f'{name}: photo filter keeps only {caps}')
            # compare: all data
            pg.goto(base + '/#/explore?cc=CH&p=young_family&sel=CH%3A156', wait_until='domcontentloaded')
            pg.wait_for_function("window.NZ && NZ.state.selected==='CH:156'", timeout=45000)
            pg.evaluate("localStorage.setItem('nz:saved', JSON.stringify([{id:'CH:156',name:'Meilen',profile:'young_family'},{id:'CH:154',name:'Küsnacht',profile:'young_family'}])); localStorage.setItem('nz:cmp', JSON.stringify(['CH:156','CH:154']))")
            pg.reload(wait_until='domcontentloaded')
            pg.wait_for_function("window.NZ && NZ.state.selected==='CH:156' && NZ.state.compare && NZ.state.compare.length===2", timeout=45000)
            pg.locator('[data-opencmp]:visible').first.click()
            pg.wait_for_selector('#modal.open details.cmp-all', timeout=20000)
            check(pg.locator('#modal details.cmp-all[open]').count() == 0, f'{name}: compare "Show all data" starts closed')
            pg.click('#modal details.cmp-all summary')
            pg.wait_for_function("/live rows added/.test((document.querySelector('[data-castatus]')||{}).textContent||'')", timeout=20000)
            n = pg.locator('#modal details.cmp-all tbody tr:not(.grp)').count()
            cols = pg.evaluate("document.querySelector('#modal details.cmp-all thead tr').children.length")
            check(n > 100 and cols == 3, f'{name}: compare shows all data: {n} rows for 2 places')
            ctx.close()
        b.close()
    srv.shutdown()
    check(not errors, 'no JavaScript errors' + ('' if not errors else ': ' + '; '.join(errors[:3])))
    check(any('earthquake.usgs.gov' in c for c in CALLS), 'USGS asked only through the live gate (seen in requests)')
    for ok, m in res: print(('ok   ' if ok else 'FAIL ') + m)
    bad = [m for ok, m in res if not ok]
    print('V25 TEST:', 'PASS' if not bad else f'{len(bad)} FAIL'); sys.exit(1 if bad else 0)

if __name__ == '__main__':
    main()
