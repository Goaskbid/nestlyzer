#!/usr/bin/env python3
"""Nestlyzer 2.8 checks: official data layer, honest scoring, roster repair, GitHub-safe website.

    python3 tests/test_v28.py            (builds nothing; needs data/ and dist/site from the normal build)

Golden values are the figures the acquisition checks matched against the publishers' own pages (see
build/source/v28/<domain>/REPORT.md). If a yearly refresh changes them, update them here from the official page.
"""
import functools, http.server, json, os, socketserver, subprocess, sys, threading, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
res = []


def check(ok, msg):
    res.append((bool(ok), msg)); print(('PASS ' if ok else 'FAIL ') + msg)


meta = json.load(open(os.path.join(ROOT, 'data', 'meta.json')))
v28 = [f for f in meta['factors'] if f.get('v28')]
check(len(v28) >= 150, f'{len(v28)} official 2.8 measures in meta.json')
check(all(f.get('by_country') and all(b.get('source_name') and b.get('period') for b in f['by_country'].values()) for f in v28),
      'every 2.8 measure names its source and period for every country')
srcids = {b['source_id'] for f in v28 for b in f['by_country'].values()}
check(not any(s.startswith('who_') or 'worldclim' in s.lower() for s in srcids), 'no non-commercial sources (WHO, WorldClim) in the scored or shown data')
check(all(f['scope'] in ('pool', 'country') for f in v28), 'every measure says whether it is compared across countries or within one')

# golden values, read through the app's own hydration (place arrays and regional tables)
js = r"""
const fs=require('fs'),D=require(process.argv[1]+'/src/data.js'),h=D.hydrate||D.NestData.hydrate,cache={};
const q=JSON.parse(process.argv[2]),out=[];
for(const [cc,oid,fid] of q){if(!cache[cc])cache[cc]=h(JSON.parse(fs.readFileSync(process.argv[1]+'/data/c/'+cc+'.json')));const r=cache[cc].find(x=>String(x.oid)===oid);
out.push(r?[r.name,r.factorRaw[fid]==null?null:r.factorRaw[fid],r.factorScores[fid]==null?null:r.factorScores[fid],(r.factorLevel||{})[fid]==null?0:r.factorLevel[fid]]:null)}
console.log(JSON.stringify(out));
"""
GOLD = [
    ('UK', 'E07000178', 'n_council_tax_d', 2678.4, 'Oxford Band D council tax 2026-27 (MHCLG; Oxford council record)'),
    ('SE', '1280', 'n_municipal_income_tax', 32.42, 'Malmö kommunalskatt 2026 (SCB)'),
    ('DK', '461', 'n_municipal_income_tax', 25.5, 'Odense kommuneskat 2026 (Statistics Denmark PSKAT)'),
    ('NO', '4601', 'n_income_hh_no', 671700, 'Bergen median household income after tax 2024 (SSB 06944)'),
    ('FR', '31555', 'n_rent_flat_m2', 13.98, 'Toulouse asking rent per m² 2025 (ministry rent map)'),
    ('ES', '28115', 'n_income_net_person', 30524, 'Pozuelo de Alarcón net income per person 2023 (INE ADRH)'),
    ('DE', '09162000', 'n_grundsteuer_b', 535, 'München Grundsteuer B multiplier 2024 (city bylaw)'),
    ('PT', '110654', 'n_price_m2_pt', 5082, 'Lisboa median sale price per m² to 2026-Q1 (INE press release)'),
]
q = [[c, o, f] for c, o, f, _, _ in GOLD]
out = json.loads(subprocess.check_output(['node', '-e', js, ROOT, json.dumps(q)]))
for (c, o, f, want, label), got in zip(GOLD, out):
    check(got is not None and got[1] is not None and abs(got[1] - want) < 0.01, f'{label}: {got[1] if got else None}')
# a regional value is marked as such
lv = json.loads(subprocess.check_output(['node', '-e', js, ROOT, json.dumps([['FR', '31555', 'n_income_pps_region'], ['US', '5368361', 'n_income_median_us']])]))
check(lv[0] and lv[0][3] == 2, f'Toulouse household income (PPS) is a regional (NUTS2) value and says so (level {lv[0] and lv[0][3]})')
check(lv[1] and lv[1][3] == 3, f'Los Angeles median household income is the county value and says so (level {lv[1] and lv[1][3]})')

# roster repair
uk = json.load(open(os.path.join(ROOT, 'data', 'c', 'UK.json')))
iS = uk['cols'].index('sup')
ukact = {r[0]: r for r in uk['rows'] if not r[iS]}
check('E06000058' in ukact and 'E06000059' in ukact and 'E06000028' not in ukact, 'UK: Bournemouth, Christchurch and Poole and Dorset added; abolished Bournemouth no longer ranked')
jp = json.load(open(os.path.join(ROOT, 'data', 'c', 'JP.json')))
sug = next(r for r in jp['rows'] if r[0] == '11836117')
check(sug[2] == 'JP12' and 35.6 < sug[7] < 35.8, f'Suginami ward sits in Tokyo ({sug[2]}, {sug[7]})')
nolat = sum(1 for p in glob.glob(os.path.join(ROOT, 'data', 'c', '*.json')) for d in [json.load(open(p))] for r in d['rows'] if not r[d['cols'].index('sup')] and r[7] is None)
check(nolat <= 10, f'active places without a point: {nolat} (was 1,021)')

# GitHub-safe files
big = [(os.path.basename(p), os.path.getsize(p)) for p in glob.glob(os.path.join(ROOT, 'dist', 'site', 'nzdata-p-*.json')) if os.path.getsize(p) > 20 * 1024 * 1024]
check(not big, f'every country file of the website under 20 MiB {big}')

# depth labels follow the data
fr = next(c for c in meta['countries'] if c['cc'] == 'FR')
check(fr.get('depth2') == 'good' and 'affordability' in fr.get('measured', []) and 'safety' in fr.get('measured', []), f"France: measured data incl. costs and safety ({fr.get('measured')})")

# browser: labels on the website build
SITE = os.path.join(ROOT, 'dist', 'site')


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


srv = socketserver.ThreadingTCPServer(('127.0.0.1', 8941), functools.partial(Q, directory=SITE)); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    base = 'http://127.0.0.1:8941'
    pg.goto(base + '/#/explore?cc=FR&p=young_family&sel=FR%3A31555&pt=data', wait_until='domcontentloaded')
    pg.wait_for_function("window.NZ && NZ.state.selected==='FR:31555' && document.querySelector('#place [data-alldata]')", timeout=60000)
    pg.wait_for_timeout(2500)
    txt = pg.evaluate("(function(){var r=document.querySelector('#place [data-alldata]');return r.textContent+' '+[...r.querySelectorAll('[data-src]')].map(function(x){return x.dataset.src}).join(' ')})()")   # sources live in the tooltip since 2.11.3
    check('Asking rent for a flat' in txt and 'regional value' in txt, 'France place page: local rent and regional figures shown with their level')
    check('compared within France' in txt, 'country-specific measures say they are compared within the country')
    badge = pg.evaluate("(document.querySelector('#depthbadge')||{}).textContent || ''")
    check('Measured' in badge or 'Measured' in pg.content(), f'France data-depth label reads "Measured data" ({badge.strip()[:40]})')
    pg.goto(base + '/#/explore?cc=DE&p=young_family', wait_until='domcontentloaded')
    pg.wait_for_function("window.NZ && NZ.state.cc==='DE' && NZ.res && NZ.res.scored.length>0", timeout=60000); pg.wait_for_timeout(1500)
    old = pg.evaluate("document.body.innerText.indexOf('are not in the data for') >= 0")
    check(not old, 'no outdated "not in the data yet" wording on the German results')
    sel = pg.evaluate("NZ.res.scored[0].r.id")
    pg.goto(base + '/#/explore?cc=DE&p=young_family&sel=' + sel.replace(':', '%3A') + '&pt=data'); pg.wait_for_timeout(4000)
    t2 = pg.evaluate("(function(){var r=document.querySelector('#place [data-alldata]');return r?r.textContent+' '+[...r.querySelectorAll('[data-src]')].map(function(x){return x.dataset.src}).join(' '):''})()")
    est = pg.evaluate("NZ.res.scored[0].r._proxy ? Object.keys(NZ.res.scored[0].r._proxy) : []")
    check(not est or 'modelled from' in t2, f'stand-in categories are labelled on the place page ({est})')
    check(not errs, f'no JavaScript errors {errs[:2]}')
    b.close()
srv.shutdown()
n = sum(1 for o, _ in res if o)
print(f'\n{n} of {len(res)} passed')
os.makedirs(os.path.join(ROOT, 'tests', 'results'), exist_ok=True)
json.dump([{'ok': o, 'check': m} for o, m in res], open(os.path.join(ROOT, 'tests', 'results', 'v28.json'), 'w'), indent=1, ensure_ascii=False)
sys.exit(0 if n == len(res) else 1)
