#!/usr/bin/env python3
"""Nestlyzer 2.10.3 checks: the ChatGPT delivery of 24 Oct 2026 (Insee dossiers, Eurostat housing, BTS ports).
    python3 tests/test_v2103.py [base-url]      (default http://localhost:8787)"""
import csv, gzip, json, os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
res = []


def check(fid, ok, msg):
    res.append({'finding': fid, 'ok': bool(ok), 'check': msg}); print(('PASS ' if ok else 'FAIL ') + fid + '  ' + msg)


# ---- offline: import, idempotence, overlap decisions, ports ----
store = [json.loads(l) for l in gzip.open(os.path.join(ROOT, 'build/source/context/master_records.jsonl.gz'), 'rt')]
fresh = [r for r in store if r['source_id'] in ('US_BTS_PORTS_2026', 'FR_INSEE_DOSSIER_20260806', 'EU_EUROSTAT_HOUSING_2025')]
check('import', len(fresh) == 948 and all(r['score_eligible'] in ('False', False) for r in fresh), f'all {len(fresh)} delivered rows stored, none score-eligible')
ov = list(csv.DictReader(open(os.path.join(ROOT, 'build/source/context/overlap_decisions.csv'))))
check('overlap', sum(o['kind'] == 'repeat' for o in ov) == 17 and sum(o['kind'] == 'precision_conflict' for o in ov) == 1, f'{len(ov)} overlap decisions recorded (17 repeats, 1 precision conflict), matching the supplier count')
fr = json.load(open(os.path.join(ROOT, 'data/x/FR.json')))['ctx']
ids = {o['record_id'] for o in fr['records']}
dup = [o for o in ov if o['drop_record_id'] in ids]
pov = sorted(o['value'] for o in fr['records'] if o['source_geo_id'].endswith('75056') and 'poverty' in o['indicator_id'])
check('overlap', not dup and pov == [16.8], f'no repeated figure shown twice ({len(dup)} left); Paris poverty rate shown once: {pov}')
rep = json.load(open(os.path.join(ROOT, 'docs/master/master_import_report.json')))
check('ports', rep.get('port_records_routed_to_port_stats') == 400, '400 BTS port rows kept out of the place list and used as port size instead')
P = json.load(open(os.path.join(ROOT, 'data/ports.json')))['ports']
check('ports', P['Houston'][0][1]['cargo'] == 309.53 and len(P) >= 45, f'port size for {len(P)} US sea and inland ports (Houston {P["Houston"][0][1]["cargo"]} million short tons, 2023)')
x = json.load(open(os.path.join(ROOT, 'data/x/US.json'))); C = x['cols']; ids_us = [r[0] for r in json.load(open(os.path.join(ROOT, 'data/c/US.json')))['rows']]
lc = ids_us.index('4330236'); mp = x['strs'][C['mport'][lc]]
check('ports', mp == 'Lake Charles' and C['mport_km'][lc] < 10, f'Lake Charles now measured to its own port ({mp}, {C["mport_km"][lc]} km), not to Beaumont')

with sync_playwright() as p:
    b = p.chromium.launch(); errs = []
    c = b.new_context(viewport={'width': 1400, 'height': 950}); c.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:Date.now()}))}catch(e){}")
    pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))

    def groups(url):
        pg.goto(B + url, wait_until='load'); pg.wait_for_selector('#place [data-kfslot] .cxw', state='attached', timeout=90000); pg.wait_for_timeout(800)
        return pg.evaluate("[...document.querySelectorAll('#place .cxw h4')].map(function(h){var t=h.nextElementSibling;return [h.textContent,t?t.querySelectorAll('tr').length:0,t?t.textContent+' '+[...t.querySelectorAll('[data-src]')].map(function(x){return x.dataset.src}).join(' '):'']})")

    g = groups('/#/explore?cc=FR&p=biz_hq&sel=FR%3A75056')
    ind = [x for x in g if x[0].startswith('Local industry structure')]
    check('industry', len(ind) >= 2 and all(x[1] >= 4 for x in ind) and 'construction' in ind[0][2] and 'insee' not in ' '.join(x[0] for x in ind).lower(),
          f'Paris, business: industry structure by employee positions and by establishments kept apart ({[(x[0].split(": ")[1], x[1]) for x in ind]})')
    sz = [x for x in g if x[0] == 'Establishments by size']
    check('industry', sz and sz[0][1] >= 4 and 'employees' in sz[0][2], f'Paris, business: establishments by size band ({sz[0][1] if sz else 0} rows)')
    g = groups('/#/explore?cc=FR&p=young_family&sel=FR%3A69123')
    fac = [x for x in g if x[0].startswith('Shops, doctors and schools')]
    check('facilities', fac and fac[0][1] >= 10 and 'Pharmacies' in fac[0][2], f'Lyon, household: {fac[0][1] if fac else 0} facility counts for the municipality (supermarkets, GPs, schools ...)')
    check('facilities', not any(x[0].startswith('Local industry') for x in g), 'household page does not show the business industry tables')
    g = groups('/#/explore?cc=EL&p=young_family&sel=EL%3A' + json.load(open(os.path.join(ROOT, 'data/c/EL.json')))['rows'][0][0])
    hc = [x for x in g if x[0] == 'Housing conditions in the country']
    check('eurostat', hc and hc[0][1] >= 3 and 'national' in hc[0][2], f'Greece: {hc[0][1] if hc else 0} national housing figures (overcrowding, heating, arrears), labelled national')

    pg.goto(B + '/#/explore?cc=US&p=biz_port_industry&sel=US%3A4672731', wait_until='load'); pg.wait_for_selector('#place [data-catopen="portaccess"]', timeout=90000); pg.wait_for_timeout(1500)
    pg.click('#place [data-catopen="portaccess"]'); pg.wait_for_selector('#place .catdetail .cdr:not(.cdh)', timeout=60000)
    t = pg.inner_text('#place .catdetail')
    check('ports', 'Port size: Houston Port Authority' in t and 'million short tons' in t and 'Bureau of Transportation Statistics' in t, 'Baytown, port industry: the port breakdown shows the size of the Port of Houston (cargo, containers, cranes; BTS)')
    pg.click('#place [data-catopen="chempark"]'); pg.wait_for_function("document.querySelector('#place .catdetail') && /chemical park/i.test(document.querySelector('#place .catdetail').innerText)", timeout=30000)
    t = pg.inner_text('#place .catdetail')
    check('chempark', 'Houston Ship Channel' in t and 'km' in t, 'Baytown, port industry: the new chemical-park criterion opens with the nearest park (Houston Ship Channel) and its distance')
    for cc, prof, want in [('US', 'biz_port_industry', ['Corpus Christi', 'Port Arthur', 'Lake Charles', 'Deer Park', 'Channelview', 'Beaumont']),
                           ('US', 'biz_energy_intensive', ['Pasadena', 'Jacinto City', 'Galena Park', 'Deer Park', 'Channelview', 'Corpus Christi']),
                           ('DE', 'biz_port_industry', ['Ludwigshafen', 'Duisburg', 'Mannheim', 'Krefeld', 'Neuss']),
                           ('CH', 'biz_energy_intensive', ['Pratteln', 'Muttenz', 'Kaiseraugst', 'Basel', 'Münchenstein'])]:
        pg.goto(f'{B}/#/explore?cc={cc}&p={prof}', wait_until='load')
        pg.wait_for_function(f"window.NZ && NZ.state.cc==='{cc}' && NZ.res && NZ.res.scored && NZ.res.scored.length>0 && NZ.res.scored[0].r.id.indexOf('{cc}:')===0", timeout=90000); pg.wait_for_timeout(400)
        top = pg.evaluate("NZ.res.scored.slice(0,6).map(function(s){return s.r.name})")
        hits = [n for n in top if any(n.startswith(w) for w in want)]
        check('ranking', len(hits) >= 4, f'{cc} {prof}: top 6 are where this industry already operates: {top}')
    check('errors', not errs, f'no script errors ({errs[:2]})')
    b.close()

json.dump(res, open(os.path.join(ROOT, 'tests', 'v2103_results.json'), 'w'), indent=1)
print('v2103: %d of %d' % (sum(r['ok'] for r in res), len(res)))
sys.exit(0 if all(r['ok'] for r in res) else 1)
