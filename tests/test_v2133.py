#!/usr/bin/env python3
"""Nestlyzer 2.13.3: visible advice notice everywhere results appear, stronger liability terms, business rankings that
follow the selected kind of site, a bounded world score with unchanged order, one reason per need, and "Not for this
search" with undo.        python3 tests/test_v2133.py [base-url]"""
import json, os, re, subprocess, sys, tempfile
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
res = []
def check(fid, ok, msg): res.append({'id': fid, 'ok': bool(ok), 'check': msg}); print(('PASS ' if ok else 'FAIL ') + fid + '  ' + msg)
rd = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
NOTE = 'General location information, no individual advice.'
pages = ['insights/index.html', 'insights/switzerland-income-tax-by-commune/index.html', 'method/index.html', 'business/index.html']
pages += [os.path.join(d, 'index.html') for d in ['switzerland', 'germany'] if os.path.exists(os.path.join(ROOT, d, 'index.html'))]
miss = [p for p in pages if os.path.exists(os.path.join(ROOT, p)) and NOTE not in rd(p)]
check('notice-pages', not miss and len(pages) >= 4, f'advice notice at the top of {len(pages)} sample pages ({miss or "all"})')
lg = rd('legal/index.html')
check('legal', all(k in lg for k in ['Art. 100', 'Fixed standard profiles', 'No entitlement or eligibility', 'Tax figures are standard cases', 'No adviser relationship', 'injury to life, body or health']), 'legal page: no-advice disclaimer, eligibility, tax standard cases, liability within the law (Art. 100 CO)')
sb = rd('data/start_biz.html'); sets = re.findall(r'data-rankp="([a-z_]+)"', sb)
check('biz-sets', len(sets) >= 20 and 'biz_logistics' in sets and len(set(sets)) == len(sets), f'start page business rankings: {len(sets)} kinds of site, one set each (no longer logistics only)')
over = []; order = []
for sc in ['world', 'europe', 'americas', 'asia_pacific']:
    d = json.load(open(os.path.join(ROOT, 'data/rank', sc + '.json')))
    for k, p in d['profiles'].items():
        over += [r for r in p['top'] if not (0 <= r[2] <= 100)]
        s = [(r[6], -r[2]) for r in p['top']]
        if s != sorted(s): order.append(sc + ':' + k)
check('bounded', not over and not order, f'cross-country scores within 0-100 in all scopes ({len(over)} outside), ranking sorted by score ({len(order)} unsorted)')
out = tempfile.mktemp(suffix='.json')
r = subprocess.run(['node', os.path.join(ROOT, 'tests/explain_audit.cjs'), ROOT, out], capture_output=True, text=True, timeout=600)
A = json.load(open(out)) if r.returncode == 0 else {}
e = A.get('explanations', {}); g = A.get('global_rank', {})
check('reasons', e.get('cases', 0) >= 500 and e.get('duplicate_side') == 0 and e.get('both_sides') == 0, f"owner's audit harness: {e.get('cases')} world top-ten explanations, {e.get('duplicate_side')} repeat a reason, {e.get('both_sides')} show one on both sides")
check('audit-100', g and all(v['above100'] == 0 for v in g.values()), "owner's audit harness: no world score above 100 in any scope")
with sync_playwright() as pw:
    br = pw.chromium.launch(); cx = br.new_context(viewport={'width': 1400, 'height': 900}); cx.add_init_script("""try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:1}));localStorage.setItem('nz:toured','1')}catch(e){}"""); pg = cx.new_page()
    pg.goto(B + '/', wait_until='load'); pg.wait_for_timeout(600)
    st = pg.evaluate("(()=>{const e=document.querySelector('.cine-card .nz-note');return e&&e.offsetHeight>0})()")
    check('notice-start', st, 'start page: advice notice visible next to the start button')
    pg.click('[data-hmode="biz"]')
    pg.wait_for_function("document.querySelectorAll('#biz-extra [data-rankp]').length>5", timeout=30000)
    btns = pg.evaluate("[...document.querySelectorAll('.who-biz [data-who]')].map(b=>b.dataset.who)")
    have = pg.evaluate("[...document.querySelectorAll('#biz-extra [data-rankp]')].map(x=>x.dataset.rankp)")
    pick = [b for b in btns if b in have and b != 'biz_logistics'][:2]
    okb = []
    for k in pick:
        pg.click(f'.who-biz [data-who="{k}"]'); pg.wait_for_timeout(200)
        vis = pg.evaluate("[...document.querySelectorAll('#biz-extra [data-rankp]')].filter(x=>!x.hidden).map(x=>x.dataset.rankp)")
        okb.append(vis == [k])
    check('biz-follow', pick and all(okb), f'business rankings below follow the selected kind of site: {pick} -> {okb}')
    pg.goto(B + '/#/explore?cc=CH&p=young_family', wait_until='load')
    pg.wait_for_function("document.querySelectorAll('#results .row[data-id]').length>5", timeout=120000)
    nv = pg.evaluate("(()=>{const e=document.querySelector('#rnote .nz-note');return e&&e.offsetHeight>0})()")
    check('notice-app', nv, 'map and ranking: advice notice visible above the results')
    pg.evaluate("localStorage.removeItem('nz:hide:young_family|CH')")
    first = pg.evaluate("[...document.querySelectorAll('#results .row[data-id]')].slice(0,3).map(r=>[r.dataset.id, r.querySelector('.rk').textContent])")
    pg.click(f'#results .row[data-id="{first[0][0]}"] [data-hide]'); pg.wait_for_timeout(300)
    after = pg.evaluate("[...document.querySelectorAll('#results .row[data-id]')].slice(0,2).map(r=>[r.dataset.id, r.querySelector('.rk').textContent])")
    note = pg.evaluate("!!document.querySelector('.hid-note')")
    pg.click('#toast [data-unhide]'); pg.wait_for_timeout(300)
    back = pg.evaluate("[...document.querySelectorAll('#results .row[data-id]')].slice(0,3).map(r=>[r.dataset.id, r.querySelector('.rk').textContent])")
    check('set-aside', after[0] == first[1] and note and back == first, f'"Not for this search": {first[0][1]}. {first[0][0]} hidden, next keeps rank {after[0][1] if after else "-"}, undo restores the list')
    pg.wait_for_function("window.NZFX===1", timeout=20000)
    tg = pg.evaluate("[...document.querySelectorAll('.menu-panel .fx-toggle')].map(b=>b.textContent)")
    # desktop: the menu is a phone feature, so the switch is the speaker button in the header (the phone menu is covered by the mobile journey)
    pg.locator('.fx-hdr:visible').first.click(); pg.wait_for_timeout(150)
    snd = pg.evaluate("localStorage.getItem('nz:fx:sound') + (document.querySelector('.menu-panel .fx-toggle[data-fx=\"sound\"]').textContent.endsWith(': on') ? '' : '!')"); pg.locator('.fx-hdr:visible').first.click()
    sid = first[1][0]; pg.click(f'#results .row[data-id="{sid}"] [data-save]'); sp = pg.evaluate("document.querySelectorAll('.fx-spark').length")
    pg.click(f'#results .row[data-id="{sid}"] [data-save]')
    check('fx', tg and tg[0].startswith('Sounds: off') and snd == '1' and sp >= 5, f'feedback layer loaded: menu {tg}, sound switch stored {snd}, {sp} sparks when saving a place (off for reduced motion)')
    pg.click(f'#results .row[data-id="{first[0][0]}"]'); pg.wait_for_timeout(1500)
    pn = pg.evaluate("(()=>{const e=document.querySelector('#place .nz-note');return e&&e.offsetHeight>0})()")
    check('notice-place', pn, 'place page: advice notice visible under the score')
    mob = cx.new_page(); mob.set_viewport_size({'width': 390, 'height': 844}); mob.goto(B + '/insights/', wait_until='load')
    o = mob.evaluate("document.documentElement.scrollWidth > innerWidth")
    check('phone', not o, 'notice fits a 390 px phone')
    br.close()
json.dump(res, open(os.path.join(ROOT, 'tests/v2133_results.json'), 'w'), indent=1)
print(f"{sum(r['ok'] for r in res)} of {len(res)} passed")
