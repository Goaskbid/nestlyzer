#!/usr/bin/env python3
"""2.15.30 Politics tab: who governs (country, region, municipality) with party and left-right position, parliament
seats as a hemicycle, the record of heads of government, state structure gauge, memberships with what they mean for
residents and businesses, trade agreements. Wikidata is mocked (offline). Nothing here may change a score.
    python3 tests/test_politics.py [base-url]"""
import json, re, sys
from playwright.sync_api import sync_playwright
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
def snak(v, q=None):
    c = {'mainsnak': {'datavalue': {'value': v}}, 'rank': 'normal'}
    if q: c['qualifiers'] = {k: [{'datavalue': {'value': x}}] for k, x in q.items()}
    return c
T = lambda d: {'time': '+' + d + 'T00:00:00Z'}
I = lambda q: {'id': q}
ENT = {
 'Q39': {'P297': [snak('CH')], 'P6': [snak(I('Q1001'), {'P580': T('2023-01-01')}), snak(I('Q1002'), {'P580': T('2019-01-01'), 'P582': T('2022-12-31')})], 'P194': [snak(I('Q2000'))]},
 'Q1001': {'P102': [snak(I('Q3001'))]}, 'Q1002': {'P102': [snak(I('Q3002'))]}, 'Q1003': {'P102': [snak(I('Q3003'))]}, 'Q1004': {'P102': [snak(I('Q3001'))]},
 'Q3001': {'P1387': [snak(I('Q4001'))]}, 'Q3002': {'P1142': [snak(I('Q4002'))]}, 'Q3003': {'P1387': [snak(I('Q4003'))]},
 'Q2000': {'P1410': [snak({'amount': '+50'}, {'P1268': I('Q3001'), 'P585': T('2023-10-22')}), snak({'amount': '+40'}, {'P1268': I('Q3002'), 'P585': T('2023-10-22')}), snak({'amount': '+30'}, {'P1268': I('Q3003'), 'P585': T('2023-10-22')}), snak({'amount': '+99'}, {'P1268': I('Q3003'), 'P585': T('2015-10-18')})]},
 'Q5000': {'P6': [snak(I('Q1003'), {'P580': T('2020-05-01')})], 'P131': [snak(I('Q6000'))]},
 'Q6000': {'P6': [snak(I('Q1004'), {'P580': T('2021-06-01')})]},
}
LAB = {'Q39': 'Switzerland', 'Q1001': 'Anna Muster', 'Q1002': 'Beat Beispiel', 'Q1003': 'Carla Gemeinde', 'Q1004': 'Dario Kanton', 'Q3001': 'Party Blue', 'Q3002': 'Party Red',
       'Q3003': 'Party Green-Left', 'Q4001': 'centre-right', 'Q4002': 'social democracy', 'Q4003': 'left-wing', 'Q2000': 'National Council', 'Q6000': 'Canton Test', 'Q5000': 'Testplace'}
def wd(route):
    u = route.request.url
    if 'list=search' in u: body = {'query': {'search': [{'title': 'Q5000'}]}}
    elif 'wbsearchentities' in u: body = {'search': [{'id': 'Q5000', 'description': 'municipality of Switzerland'}]}
    elif 'wbgetentities' in u:
        ids = re.search(r'ids=([^&]+)', u).group(1).replace('%7C', '|').split('|')
        body = {'entities': {q: {'id': q, 'claims': ENT.get(q, {}), 'labels': {'en': {'value': LAB.get(q, q)}}} for q in ids}}
    else: body = {}
    route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
c = {}
with sync_playwright() as pw:
    br = pw.chromium.launch(); ctx = br.new_context(viewport={'width': 1300, 'height': 900})
    ctx.add_init_script("try{localStorage.setItem('nz:consent2',JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}")
    ctx.route('**/*wikidata.org/**', wd); ctx.route('**/api.frankfurter.app/**', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'date': '2026-11-16', 'rates': {'USD': 1.26, 'EUR': 1.07, 'CNY': 8.95}})))
    ctx.route('**/commons.wikimedia.org/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{}'))
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B + '/#/explore?cc=CH&p=young_family', wait_until='load')
    pg.wait_for_function("document.querySelectorAll('#results .row[data-id]').length>2", timeout=120000)
    score0 = pg.evaluate("document.querySelector('#results .row[data-id]').innerText")
    pg.locator('#results .row[data-id] .nm').first.click(); pg.wait_for_selector('#place.open', timeout=30000)
    c['Politics tab present'] = pg.locator('#place [data-ptab=politics][role=tab]').count() == 1
    pg.locator('#place [data-ptab=politics][role=tab]').click()
    pg.wait_for_selector('#place .pol-govs', timeout=30000); pg.wait_for_function("document.querySelectorAll('#place .pol-tile').length>=3", timeout=20000)
    d = pg.evaluate("""(()=>{const e=document.querySelector('#place [data-politics]');return {
      govs:[...e.querySelectorAll('.pol-gov')].map(x=>x.innerText.replace(/\\s+/g,' ')), spec:e.querySelectorAll('.pol-spec circle').length,
      seats:e.querySelectorAll('.pol-hemi circle').length, legend:e.querySelector('.pol-legend')?e.querySelector('.pol-legend').innerText.replace(/\\s+/g,' '):'',
      rec:e.querySelectorAll('.pol-rec rect').length, gauge:(e.querySelector('.pol-gauge .on')||{}).innerText||'',
      orgs:[...e.querySelectorAll('.pol-org b')].map(x=>x.textContent), layers:[...e.querySelectorAll('.pol-layer b')].map(x=>x.textContent), cur:(e.querySelector('.pol-cur')||{}).innerText||'', mandate:(e.querySelector('.pol-mandate')||{}).innerText||'', tiles:[...e.querySelectorAll('.pol-tile')].map(x=>x.innerText.replace(/\\s+/g,' ')), fta:e.querySelectorAll('.pol-fta span').length, text:e.innerText}})()""")
    print(json.dumps({k: v for k, v in d.items() if k != 'text'}, indent=1, ensure_ascii=False)[:1500])
    c['three governments: country, canton, municipality'] = len(d['govs']) == 3 and 'Anna Muster' in d['govs'][0] and 'Centre-right' in d['govs'][0] and 'Dario Kanton' in d['govs'][1] and 'Carla Gemeinde' in d['govs'][2] and 'Left' in d['govs'][2]
    c['left-right spectrum with 3 markers'] = d['spec'] == 3
    c['hemicycle: latest seats only (120), with % per party'] = d['seats'] == 120 and '41.7%' in d['legend']
    c['track record of heads of government'] = d['rec'] == 2
    c['state structure: Switzerland federal'] = d['gauge'].strip() == 'Federal'
    c['memberships with meaning (EFTA, Schengen, OECD)'] = all(x in d['orgs'] for x in ['EFTA', 'Schengen area', 'OECD']) and 'Living here' in d['text'] and 'Business' in d['text']
    c['who decides what: national, cantons, municipality'] = d['layers'] == ['National government', 'States, cantons or Länder', 'Municipality']
    c['mandate proxy: governing party seat share'] = '41.7%' in d['mandate'] and 'not an opinion poll' in d['mandate']
    c['currency and regime'] = 'Swiss franc' in d['cur'] and 'Floating' in d['cur']
    c['FX tiles vs USD, EUR, CNY'] = sum(1 for t in d['tiles'] if t.startswith('1 CHF in')) == 3
    c['trade agreements listed'] = d['fta'] >= 4
    c['no score changed'] = pg.evaluate("document.querySelector('#results .row[data-id]').innerText") == score0
    pg.goto(B + '/#/explore?cc=DE&p=young_family&pt=politics', wait_until='load')
    pg.wait_for_function("document.querySelectorAll('#results .row[data-id]').length>2", timeout=120000)
    pg.locator('#results .row[data-id] .nm').first.click(); pg.wait_for_selector('#place.open', timeout=30000)
    pg.locator('#place [data-ptab=politics][role=tab]').click(); pg.wait_for_selector('#place .pol-orgs', timeout=30000)
    de = pg.evaluate("[...document.querySelectorAll('#place .pol-org b')].map(x=>x.textContent)")
    c['Germany: EU, euro, Schengen, NATO, G7'] = all(x in de for x in ['European Union', 'Euro area', 'Schengen area', 'NATO', 'G7'])
    c['country check: a wrong Wikidata country is not shown'] = 'Anna Muster' not in pg.evaluate("document.querySelector('#place [data-politics]').innerText")
    c['no page errors'] = not errs
    br.close()
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('POLITICS TEST:', 'PASS' if ok else 'FAIL', errs[:2]); sys.exit(0 if ok else 1)
