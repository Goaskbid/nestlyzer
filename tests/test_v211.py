#!/usr/bin/env python3
"""Nestlyzer 2.11 checks: two-level cross-country rankings, business rankings across countries, benchmark, category
breakdown from any category chip, retiree and remote profiles.
    python3 tests/test_v211.py [base-url]      (default http://localhost:8787)"""
import json, os, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
res = []


def check(fid, ok, msg):
    res.append({'finding': fid, 'ok': bool(ok), 'check': msg}); print(('PASS ' if ok else 'FAIL ') + fid + '  ' + msg)


N = json.load(open(os.path.join(ROOT, 'data/national.json')))
check('national', len(N['countries']) == 63 and all(len(v['cats']) >= 3 for v in N['countries'].values()), f'national level for {len(N["countries"])} countries (World Bank WDI, CPI, V-Dem, WBL, ND-GAIN)')
G = json.load(open(os.path.join(ROOT, 'data/rank/world.json')))
P = G['profiles']
biz = [k for k in P if k.startswith('biz_') and P[k]['top']]
check('global', G['version'] >= 2 and len(biz) >= 12 and P['student']['ranked'] > 1000, f'cross-country rankings for {len(biz)} business profiles and students ({P["student"]["ranked"]} places)')
for k in ('young_family', 'dinks', 'remote'):
    sc = [t[2] for t in P[k]['top'][:10]]
    check('ties', len(set(sc)) >= 3, f'{k}: top 10 not one tied region ({len(set(sc))} distinct scores)')
eu = json.load(open(os.path.join(ROOT, 'data/rank/europe.json')))['profiles']
top = [t[1] for t in eu['expat_professional']['top'][:15]]
check('plausible', any(n.startswith(('Zug', 'Baar', 'Bærum', 'Oslo', 'København', 'Amstelveen')) for n in top), f'Europe, expat professionals: {top[:8]}')
top = [t[1] for t in P['biz_port_industry']['top'][:12]]   # 2.14: top 12 with 6 known port-industry places; world-4 lists one entry per metro area (Grande-Synthe folds into Dunkerque), so the Gulf Coast refining hubs Lake Charles and Deer Park (Houston Ship Channel) join the list (as strict as 5 in the top 10; near-ties of 0.1 points move with the larger country pool)
check('plausible', sum(any(n.startswith(w) for w in ('Dunkerque', 'Corpus Christi', 'Ludwigshafen', 'Moerdijk', 'Vlaardingen', 'Mannheim', 'Port Arthur', 'Venezia', 'Saint-Fons', 'Grande-Synthe', 'Lake Charles', 'Deer Park')) for n in top) >= 6, f'world, port industry: {top}')
# benchmark (needs build/.cache/global_full.json from NZ_BENCH=1 node build/build_global_rank.js)
out = subprocess.run([sys.executable, os.path.join(ROOT, 'tests/rank_benchmark.py'), '--quiet', '--json', '/tmp/nz_bench.json'], capture_output=True, text=True)
S = json.load(open('/tmp/nz_bench.json'))['summary'] if out.returncode == 0 else {}
check('benchmark', S.get('global_mean_pct', 0) >= 65 and S.get('global_top5_share', 0) >= 30, f'reference places: mean percentile {S.get("global_mean_pct")} (old model 54.0), in the top 5%: {S.get("global_top5_share")}% (old 7%)')

X = S.get('external', {})
# Bilanz/IAZI rates the wealthy low-tax communes best; since 2.11.3 the family and pensioner profiles count rent and nuisances,
# so they are meant to differ. The profiles that share that view of attractiveness (DINKs, expats, wealthy movers) must agree.
BZ = (json.load(open('/tmp/nz_bench.json')).get('external_detail') or {}) if os.path.exists('/tmp/nz_bench.json') else {}
try: BZP = json.load(open('/tmp/nz_bench.json'))['external']['bilanz_iazi_ch_2025']['profiles']
except Exception: BZP = {}
bz_ok = all((BZP.get(k) or {}).get('separation', 0) >= 75 for k in ('dinks', 'hnw', 'expat_professional'))
check('external', X.get('prologis_logistics', 0) >= 85 and X.get('fdi_cities_future_2025', 0) >= 80 and X.get('eiu_liveability_2025', 0) >= 80 and bz_ok and X.get('imd_competitiveness_2025', 0) >= 75,
      f'published rankings: Prologis logistics {X.get("prologis_logistics")}, fDi cities {X.get("fdi_cities_future_2025")}, EIU liveability {X.get("eiu_liveability_2025")}, Bilanz/IAZI separation (DINKs, expats, wealthy) {[(BZP.get(k) or {}).get('separation') for k in ('dinks', 'expat_professional', 'hnw')]}, all profiles {X.get("bilanz_iazi_ch_2025")}, IMD countries {X.get("imd_competitiveness_2025")}')

US = json.load(open(os.path.join(ROOT, 'data/c/US.json')))
CL = US.get('cl') or {}; j = (CL.get('ids') or []).index('cluster_biz_logistics') if 'cluster_biz_logistics' in (CL.get('ids') or []) else -1
cly = US.get('cly') or []; cov = sum(1 for a in cly if a and j >= 0 and (CL['areas'].get(a) or [None] * (j + 1))[j]) / max(1, len(US['rows']))
check('clusters', cov >= 0.9 and 'cluster_biz_logistics' not in US['fr'], f'US industry clusters from Census CBP 2023: {cov:.1%} of places covered (owner rule 90%), stored once per county and labelled as a county figure')
BM = json.load(open('/tmp/nz_bench.json')) if os.path.exists('/tmp/nz_bench.json') else {}
us = {r[1]: r[2] for r in BM.get('country', {}).get('biz_logistics', {}).get('refs', []) if r[0] == 'US'}
check('clusters', us.get('Joliet', 0) >= 95 and us.get('Edison', 0) >= 95 and us.get('Louisville', 0) >= 80, f'US logistics clusters rank high: {us}')

R = json.load(open(os.path.join(ROOT, 'data/anchors_ror.json')))['res']
ch = [x[0] for x in R if 'Empa' == x[0] or 'Swiss Federal Institute for Forest' in x[0] or 'Paul Scherrer' in x[0] or 'European Organization for Nuclear' in x[0]]
check('research', len(ch) >= 4, f'major research institutions on the map include {ch}')

with sync_playwright() as p:
    b = p.chromium.launch(); errs = []
    c = b.new_context(viewport={'width': 1400, 'height': 950}); c.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:Date.now()}));localStorage.setItem('nz:toured','1')}catch(e){}")
    pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B + '/#/explore?cc=DE&p=young_family', wait_until='load')
    pg.wait_for_selector('#results .row[data-id] .chip[data-def]', timeout=90000); pg.wait_for_timeout(500)
    k = pg.evaluate("(function(){var c=[...document.querySelectorAll('#results .row[data-id] .chip[data-def]')].find(function(e){return NZ_META_CAT(e.dataset.def)});return c?c.dataset.def:''})()".replace('NZ_META_CAT(e.dataset.def)', "e.dataset.def.indexOf('factor:')<0"))
    pg.click(f'#results .row[data-id] .chip[data-def="{k}"]')
    pg.wait_for_selector('#place .catdetail .cdr', timeout=60000)
    n = pg.evaluate("document.querySelectorAll('#place .catdetail .cdr').length"); h = pg.inner_text('#place .catdetail h4')
    check('catchip', n >= 1, f'clicking the "{k}" chip on a result card opens the place with that category expanded: "{h}", {n} measures')
    pg.goto(B + '/#/explore?cc=DE&p=biz_logistics&g=europe', wait_until='load'); pg.wait_for_selector('#results .grank .row', timeout=90000)
    rows = pg.evaluate("[...document.querySelectorAll('#results .grank .row .nm')].slice(0,5).map(function(e){return e.innerText.trim()})")
    meta = pg.inner_text('#results .grank .row .meta')
    check('bizglobal', len(rows) == 5 and 'in the country' in meta, f'business profile ranked across Europe: {rows}; "{meta}"')
    pg.goto(B + '/', wait_until='load'); pg.click('[data-hmode="biz"]'); pg.wait_for_timeout(600)
    pg.wait_for_selector('#biz-extra #biz-rankings .rank-set:not([hidden]) .rank-tile', timeout=30000)   # 2.13.3: one set per kind of site, the selected one shown
    vis = pg.evaluate("[!!(document.querySelector('#rankings')||{}).offsetParent, document.querySelectorAll('#biz-rankings .rank-set:not([hidden]) .rank-tile').length]")
    check('bizband', vis[0] is False and vis[1] == 4, f'start page in business mode shows the business world and continental rankings ({vis[1]} tiles; household band hidden)')
    def top(cc, prof, n=6):
        pg.goto(f'{B}/#/explore?cc={cc}&p={prof}', wait_until='load')
        pg.wait_for_function(f"window.NZ && NZ.state.cc==='{cc}' && NZ.state.profile==='{prof}' && NZ.res && NZ.res.scored && NZ.res.scored.length>0 && NZ.res.scored[0].r.id.indexOf('{cc}:')===0", timeout=90000); pg.wait_for_timeout(300)
        return pg.evaluate(f"NZ.res.scored.slice(0,{n}).map(function(s){{return s.r.name}})")
    for cc, prof, want in [('CH', 'car_free', ['Zürich', 'Genève', 'Basel']), ('DE', 'urban', ['München', 'Hamburg', 'Berlin']), ('NL', 'student', ['Amsterdam', 'Utrecht', 'Leiden', 'Delft', 'Groningen']), ('DE', 'digital_native', ['Berlin', 'Hamburg', 'München', 'Leipzig'])]:
        t = top(cc, prof); hits = [n for n in t if any(n.startswith(w) for w in want)]
        check('profiles', len(hits) >= 2, f'{cc} {prof}: the places this group really chooses lead: {t}')
    t = top('CH', 'young_family', 10)
    check('profiles', not [n for n in t if n.startswith(('Othmarsingen', 'Fahrwangen'))], f'CH young families: commute and services count, villages without them no longer lead: {t[:6]}')
    pg.goto(B + '/#/explore?cc=CH&p=young_family', wait_until='load'); pg.wait_for_function("window.NZ && NZ.res && NZ.res.scored && NZ.res.scored.length>0", timeout=90000)
    pg.keyboard.press('/'); pg.wait_for_selector('#palette.open'); pg.fill('#pal-q', 'Zuirch')
    pg.wait_for_function("[...document.querySelectorAll('#pal-list [data-pid]')].some(function(b){return /Did you mean/.test(b.innerText)})", timeout=30000)
    sug = pg.evaluate("[...document.querySelectorAll('#pal-list [data-pid]')].map(function(b){return b.dataset.pid+' '+b.innerText.split('\\n')[0]})")
    check('search', any(x.startswith('CH:261 ') for x in sug), f'"Zuirch" offers a labelled suggestion, applied only on click: {sug[:2]}')
    pg.fill('#pal-q', 'Zug'); pg.wait_for_function("document.querySelectorAll('#pal-list [data-preg]').length>0", timeout=15000)
    lab = pg.evaluate("[...document.querySelectorAll('#pal-list li')].slice(0,3).map(function(l){return l.innerText.replace(/\\s+/g,' ')})")
    check('search', any('Canton in Switzerland' in x for x in lab), f'"Zug" tells municipality and canton apart: {lab}')
    pg.keyboard.press('Escape')
    c3 = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); c3.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:Date.now()}));localStorage.setItem('nz:toured','1')}catch(e){}")
    m = c3.new_page(); m.goto(B + '/#/explore?cc=NO&p=young_family&sel=NO%3A0301'); m.wait_for_selector('#place .keyfacts .kf', timeout=90000); m.wait_for_selector('#place .cxw .cxt', state='attached', timeout=60000); m.wait_for_timeout(1500)
    tones = m.evaluate("['good','bad','mid','dim'].map(function(t){return document.querySelectorAll('#place .kf.'+t).length})")
    pg.goto(B + '/#/explore?cc=CH&p=young_family&sel=CH%3A261', wait_until='load'); pg.wait_for_selector('#place .keyfacts .kf', timeout=90000); pg.wait_for_timeout(1000)
    tz = pg.evaluate("['good','bad','mid','dim'].map(function(t){return document.querySelectorAll('#place .kf.'+t).length})")
    check('context', sum(tz[:3]) >= 6 and tz[0] >= 1 and tz[1] >= 1 and tones[3] >= 1, f'key facts are toned for the profile (Zürich good/bad/middle: {tz[:3]}; Oslo, figures that do not count for young families greyed: {tones[3]})')
    ov = m.evaluate("document.documentElement.scrollWidth - window.innerWidth"); th = m.evaluate("(function(){var t=document.querySelector('#place .cxw .cxt th');return t?getComputedStyle(t).display:''})()")
    check('phone', ov <= 0 and th == 'block', f'phone: no horizontal scrolling ({ov} px), data tables stacked ({th})')
    c3.close()
    pg.goto(B + '/', wait_until='load'); pg.click('[data-hmode="biz"]'); pg.wait_for_timeout(500)
    col = pg.evaluate("getComputedStyle(document.body).getPropertyValue('--blue').trim()")
    check('bizcolour', col.lower() in ('#0f7c7a', '#4fc3b9'), f'business mode has its own colour scheme (accent {col})')
    check('errors', not errs, f'no script errors ({errs[:2]})')
    b.close()

json.dump(res, open(os.path.join(ROOT, 'tests', 'v211_results.json'), 'w'), indent=1)
print('v211: %d of %d' % (sum(r['ok'] for r in res), len(res)))
sys.exit(0 if all(r['ok'] for r in res) else 1)
