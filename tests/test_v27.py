#!/usr/bin/env python3
"""Checks for 2.7: business mode (business profiles, three-state must-haves, separate shortlist), the personal tools
(Scorecard, My Top 10, What if, Better than home, Your saved data) and browser-only persistence.

    node tests/serve.mjs . 8787 &   then   python3 tests/test_v27.py
"""
import json, os, re, sys, tempfile
from playwright.sync_api import sync_playwright

B = os.environ.get('NZ_BASE', 'http://localhost:8787')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
res = []
def check(ok, msg): res.append((bool(ok), msg)); print(('PASS ' if ok else 'FAIL ') + msg, flush=True)
INIT = "try{if(!sessionStorage.getItem('nzt')){localStorage.setItem('nz:consent2',JSON.stringify({a:0,t:Date.now(),v:2}));localStorage.setItem('nz:toured','1');localStorage.setItem('nz:ext','0');sessionStorage.setItem('nzt','1')}}catch(e){}"

with sync_playwright() as p:
    b = p.chromium.launch()
    errs, outside = [], []
    c = b.new_context(viewport={'width': 1440, 'height': 900}); c.add_init_script(INIT)
    pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: outside.append(r.url) if not r.url.startswith(B) and not r.url.startswith('data:') and not r.url.startswith('blob:') else None)
    nz = lambda e: pg.evaluate(e)

    # ---------- business mode ----------
    pg.goto(B + '/#/explore?cc=DE&p=young_family', wait_until='load'); pg.wait_for_function('window.NZ && NZ.res && NZ.res.scored.length > 0', timeout=30000)
    pg.click('#modeseg [data-mode="biz"]'); pg.wait_for_function("NZ.state.profile.indexOf('biz_') === 0 && NZ.res", timeout=20000); pg.wait_for_timeout(800)
    chips = pg.eval_on_selector_all('#pchips [data-profile]', 'e => e.map(x => x.dataset.profile)')
    check(nz('NZ.state.profile') == 'biz_manufacturing' and len(chips) >= 7 and all(k.startswith('biz_') for k in chips), f'Business mode: {len(chips)} business profiles in the bar, starts with Manufacturing plant ({nz("NZ.state.profile")})')
    n_flag = nz('NZ.res.scored.length'); must = pg.locator('.list .must .mu').count()
    unk = pg.locator('.list .must .mu.unknown').count(); passes = pg.locator('.list .must .mu.pass').count(); fails = pg.locator('.list .must .mu.fail').count()
    check(n_flag > 100 and must > 0 and unk == 0 and passes > 0 and fails == 0, f'Ranked places show their measured must-haves: {n_flag} places, {passes} met, {unk} unknown chips (2.10: site checks live in the scorecard, not the list), none failed in the list')
    top = nz("(function(){var x=NZ.res.scored[0];return x.must.map(function(m){return m.k+':'+m.status}).join(',')})()")
    check('none:unknown' in top and 'mway_km:pass' in top, f'Unknown never counts as met: the #1 place lists {top}')
    pg.click('[data-unknownmust="exclude"]'); pg.wait_for_timeout(1200)
    n_ex = nz('NZ.res.scored.length'); why = nz('JSON.stringify(NZ.res.reasons)')
    unk_meas = nz("NZ.res.scored.filter(function(x){return x.must.some(function(m){return m.status==='unknown'&&m.k!=='none'})}).length")
    check(0 < n_ex <= n_flag and unk_meas == 0, f'"Leave them out" drops places whose measurable must-haves are unknown ({n_flag} → {n_ex}); requirements no open data covers anywhere (grid capacity, plots) stay flagged instead of emptying the list')
    pg.click('[data-unknownmust="flag"]'); pg.wait_for_timeout(1000)
    pg.click('#pchips [data-profile="biz_tech"]'); pg.wait_for_timeout(1500)
    t1 = nz('NZ.res.scored.slice(0,3).map(function(x){return x.r.name})')
    check(nz('NZ.state.profile') == 'biz_tech' and len(t1) == 3, f'Software and tech office ranks Germany: {t1}')
    # separate shortlist
    first = nz('NZ.res.scored[0].id')
    pg.evaluate(f"document.querySelector('.list [data-save=\"{first}\"]') ? document.querySelector('.list [data-save=\"{first}\"]').click() : null"); pg.wait_for_timeout(500)
    if not nz(f"JSON.parse(localStorage.getItem('nz:bizsaved')||'[]').length"):
        pg.goto(B + f'/#/explore?cc=DE&p=biz_tech&sel={first}', wait_until='load'); pg.wait_for_timeout(2500); pg.click('#place .place-actions [data-save]'); pg.wait_for_timeout(500)
    biz_saved = nz("JSON.parse(localStorage.getItem('nz:bizsaved')||'[]').map(function(s){return s.id})")
    home_saved = nz("JSON.parse(localStorage.getItem('nz:saved')||'[]').map(function(s){return s.id})")
    check(first in biz_saved and first not in home_saved, f'Business shortlist is separate: {first} saved under business ({len(biz_saved)}), not in the household list ({len(home_saved)})')

    # ---------- households: save, Top 10, persistence ----------
    pg.goto(B + '/#/explore?cc=CH&p=young_family', wait_until='load'); pg.wait_for_function('NZ.res && NZ.res.scored.length > 20', timeout=30000); pg.wait_for_timeout(500)
    ids = nz('NZ.res.scored.slice(0,4).map(function(x){return x.id})')
    for i in ids:
        pg.evaluate(f"(function(){{var b=document.querySelector('[data-save=\"{i}\"]');if(b)b.click();}})()"); pg.wait_for_timeout(250)
    hs = nz("JSON.parse(localStorage.getItem('nz:saved')||'[]').length")
    if hs < 4:
        for i in ids:
            pg.goto(B + f'/#/explore?cc=CH&p=young_family&sel={i}', wait_until='load'); pg.wait_for_timeout(1800)
            if pg.get_attribute('#place .place-actions [data-save]', 'aria-pressed') != 'true': pg.click('#place .place-actions [data-save]'); pg.wait_for_timeout(300)
        hs = nz("JSON.parse(localStorage.getItem('nz:saved')||'[]').length")
    check(hs >= 4, f'A visitor saves places without registering: {hs} on the household shortlist')
    pg.reload(wait_until='load'); pg.wait_for_function('NZ.res', timeout=30000)
    check(nz("JSON.parse(localStorage.getItem('nz:saved')||'[]').length") == hs, 'The shortlist survives a reload')
    state = c.storage_state()
    # Top 10
    pg.evaluate("document.querySelector('[data-lt=\"saved\"]').click()"); pg.wait_for_timeout(800)
    pg.click('#results [data-top10]'); pg.wait_for_selector('#pt-top10 .pttop li', timeout=15000)
    rows = pg.locator('#pt-top10 .pttop li').count()
    scs = pg.eval_on_selector_all('#pt-top10 .ptsc', 'e => e.map(x => +x.textContent || 0)')
    check(rows == hs and scs == sorted(scs, reverse=True), f'My Top 10 ranks the shortlist by the current preferences: {scs}')
    last = pg.eval_on_selector_all('#pt-top10 [data-ptstatus]', 'e => e.map(x => x.dataset.ptstatus)')[0]
    pg.select_option(f'#pt-top10 [data-ptstatus="{last}"]', 'excluded'); pg.wait_for_timeout(500)
    order = pg.eval_on_selector_all('#pt-top10 [data-ptstatus]', 'e => e.map(x => x.dataset.ptstatus)')
    st = nz(f"JSON.parse(localStorage.getItem('nz:saved')).filter(function(s){{return s.id==='{last}'}})[0].status")
    check(order[-1] == last and st == 'excluded', 'Marking a place "Excluded" stores it and sorts it to the end')
    pg.click('#pt-top10 [data-ptorder="mine"]'); pg.wait_for_timeout(400)
    before = pg.eval_on_selector_all('#pt-top10 [data-ptstatus]', 'e => e.map(x => x.dataset.ptstatus)')
    pg.click(f'#pt-top10 [data-ptmove="{before[1]}|-1"]'); pg.wait_for_timeout(400)
    after = pg.eval_on_selector_all('#pt-top10 [data-ptstatus]', 'e => e.map(x => x.dataset.ptstatus)')
    saved_order = nz("JSON.parse(localStorage.getItem('nz:saved')).map(function(s){return s.id})")
    check(after[0] == before[1] and saved_order[0] == before[1], 'Manual order: ↑ moves a place up and the order is stored')
    pg.click('#pt-top10 [data-ptorder="fit"]'); pg.wait_for_timeout(300)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)

    # browser restart: a new context restored from the saved state
    c2 = b.new_context(viewport={'width': 1440, 'height': 900}, storage_state=state); pg2 = c2.new_page(); pg2.on('pageerror', lambda e: errs.append(str(e)))
    pg2.goto(B + '/#/explore?cc=CH&p=young_family', wait_until='load'); pg2.wait_for_function('NZ.res', timeout=30000)
    n2 = pg2.evaluate("JSON.parse(localStorage.getItem('nz:saved')||'[]').length")
    check(n2 == hs, f'Saved places survive a browser restart (same browser profile): {n2}')
    c2.close()
    # another visitor (fresh browser) sees nothing
    c3 = b.new_context(); pg3 = c3.new_page(); pg3.goto(B + '/', wait_until='load')
    check(pg3.evaluate("localStorage.getItem('nz:saved')") is None, 'Another visitor (a fresh browser) has no access to these lists: nothing is stored outside this browser')
    c3.close()

    # ---------- What if ----------
    pg.goto(B + '/#/explore?cc=CH&p=young_family', wait_until='load'); pg.wait_for_function('NZ.res && NZ.res.scored.length > 20', timeout=30000)
    base10 = nz('NZ.res.scored.slice(0,10).map(function(x){return x.r.name})')
    pg.evaluate("document.querySelector('[data-tools]') ? document.querySelector('[data-tools]').click() : null"); pg.wait_for_timeout(500)
    if pg.locator('#tools [data-whatif]').count(): pg.click('#tools [data-whatif]')
    else: pg.evaluate("document.body.insertAdjacentHTML('beforeend','<button data-whatif id=wi>w</button>');document.getElementById('wi').click()")
    pg.wait_for_selector('#pt-wi .pttop li', timeout=15000)
    w0 = pg.eval_on_selector_all('#pt-wi .pttop .ptname b', 'e => e.map(x => x.textContent)')
    check(w0 == base10, 'What if starts from the baseline ranking (same top 10)')
    pg.evaluate("(function(){var s=document.querySelector('#pt-wi [data-wiw=\"tax\"]');s.value=50;s.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(900)
    w1 = pg.eval_on_selector_all('#pt-wi .pttop .ptname b', 'e => e.map(x => x.textContent)')
    moves = pg.eval_on_selector_all('#pt-wi .ptmove', 'e => e.map(x => x.textContent.trim())')
    lifted = pg.locator('#pt-wi .ptname small', has_text='lifted by tax').count()
    check(w1 != w0 and any(m.startswith('▲') or m == 'new' for m in moves) and lifted > 0, f'Raising Tax to 50 re-ranks live and says why: {w1[:3]}, moves {moves[:5]}, {lifted} "lifted by tax"')
    pg.click('#pt-wi [data-wireset]'); pg.wait_for_timeout(600)
    check(pg.eval_on_selector_all('#pt-wi .pttop .ptname b', 'e => e.map(x => x.textContent)') == base10, 'Reset returns to the baseline')
    check(nz('NZ.res.scored.slice(0,10).map(function(x){return x.r.name})') == base10 and nz('NZ.state.profile') == 'young_family', 'Trying scenarios does not change the live ranking or the profile until "Use as my profile"')
    pg.evaluate("(function(){var s=document.querySelector('#pt-wi [data-wiw=\"tax\"]');s.value=50;s.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(700)
    pg.once('dialog', lambda d: d.accept('Low tax'))
    pg.click('#pt-wi [data-wisave]'); pg.wait_for_timeout(600)
    pg.click('#pt-wi [data-wireset]'); pg.wait_for_timeout(600)
    pg.click('#pt-wi [data-wicmp="0"]'); pg.wait_for_timeout(600)
    cmp_cols = pg.locator('#pt-wicmp .ptcols > div').count()
    check(nz("JSON.parse(localStorage.getItem('nz:scenarios')).length") == 1 and cmp_cols == 2, 'A scenario can be saved and compared with another one side by side')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)

    # ---------- Scorecard and missing data ----------
    # Osaka is fully measured since 2.8 (Japanese e-Stat data), so the gap display is checked on a South Korean place, which still has gaps
    pg.goto(B + '/#/explore?cc=KR&p=young_family', wait_until='load'); pg.wait_for_function("window.NZ && NZ.state.cc==='KR' && NZ.res && NZ.res.scored.length>0 && /^KR:/.test(NZ.res.scored[0].r.id)", timeout=60000)
    krsel = nz('NZ.res.scored[0].r.id')
    pg.goto(B + f'/#/explore?cc=KR&p=young_family&sel={krsel}&pt=score', wait_until='load')
    pg.wait_for_function("NZ.state.selected===" + json.dumps(krsel) + " && document.querySelector('#place .ptcard .pttable') && /Not measured|Your criteria/.test(document.querySelector('#place .ptcard').innerText)", timeout=30000); pg.wait_for_timeout(500)
    sc = pg.inner_text('#place .ptcard')
    print('   scorecard:', sc[:300].replace('\n', ' | '))
    check('Your criteria' in sc and 'The score uses your other criteria' in sc and 'Strongest' in sc, 'Scorecard (South Korea, young family): criteria with weights, strongest and weakest, and the weighted criteria that are not measured there')
    nodata = pg.locator('#place .ptcard .ptbar.none').count()
    check(nodata > 0, f'Missing data is shown as "no data", never as a score ({nodata} criteria)')
    pg.goto(B + f'/#/explore?cc=DE&p=biz_manufacturing&sel={first}&pt=score', wait_until='load'); pg.wait_for_selector('#place .ptcard', timeout=30000)
    check(pg.locator('#place .ptmust li.check').count() >= 1 and pg.locator('#place .ptmust li.pass').count() >= 1, 'Business scorecard lists measured must-haves as met or not met and site checks as next steps')

    # ---------- Better than home ----------
    pg.goto(B + '/#/explore?cc=CH&p=young_family', wait_until='load'); pg.wait_for_function('NZ.res', timeout=30000)
    pg.evaluate("document.body.insertAdjacentHTML('beforeend','<button data-bth id=bt>b</button>');document.getElementById('bt').click()")
    pg.wait_for_selector('#modal [data-bthref]', timeout=15000); pg.click('#modal [data-bthref]'); pg.wait_for_selector('#modal .bth', timeout=15000)
    cols = pg.locator('#modal .bth tr').first.locator('th').count(); tr = pg.inner_text('#modal')
    check(cols >= 3 and 'reference' in tr and 'Trade-offs' in tr and ('better on' in tr or 'no clear gain' in tr), f'Better than home compares a reference with the saved alternatives on the same criteria ({cols - 2} alternatives) and lists trade-offs')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)

    # ---------- Your saved data: download, delete, restore ----------
    pg.evaluate("document.body.insertAdjacentHTML('beforeend','<button data-mydata id=md>m</button>');document.getElementById('md').click()"); pg.wait_for_selector('#modal [data-mydl]', timeout=15000)
    with pg.expect_download() as dl: pg.click('#modal [data-mydl]')
    path = dl.value.path(); data = json.load(open(path))
    check(data['schema'] == 'nestlyzer-personal-v1' and len(data['data']['saved']) == hs and 'bizsaved' in data['data'] and 'consent2' not in data['data'], 'Download: one file with both shortlists, statuses and scenarios, and nothing else (no consent or tracking data)')
    pg.once('dialog', lambda d: d.accept())
    pg.click('#modal [data-mydel]'); pg.wait_for_timeout(2500)
    check(pg.evaluate("localStorage.getItem('nz:saved')") is None and pg.evaluate("localStorage.getItem('nz:consent2')") is not None, 'Delete removes the saved lists (the privacy choice stays)')
    pg.wait_for_function('NZ.res', timeout=30000)
    pg.evaluate("document.body.insertAdjacentHTML('beforeend','<button data-mydata id=md2>m</button>');document.getElementById('md2').click()"); pg.wait_for_selector('#modal [data-myup]', timeout=15000, state='attached')
    pg.set_input_files('#modal [data-myup]', path); pg.wait_for_timeout(3000)
    n4 = pg.evaluate("JSON.parse(localStorage.getItem('nz:saved')||'[]').length")
    st4 = pg.evaluate(f"(JSON.parse(localStorage.getItem('nz:saved')||'[]').filter(function(s){{return s.id==='{last}'}})[0]||{{}}).status")
    check(n4 == hs and st4 == 'excluded', f'Restore brings back the lists with their statuses ({n4} places)')
    bad = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False); bad.write('{"schema":"x"}'); bad.close()
    pg.wait_for_function('NZ.res', timeout=30000)
    pg.evaluate("document.body.insertAdjacentHTML('beforeend','<button data-mydata id=md3>m</button>');document.getElementById('md3').click()"); pg.wait_for_selector('#modal [data-myup]', timeout=15000, state='attached')
    pg.set_input_files('#modal [data-myup]', bad.name); pg.wait_for_timeout(800)
    check('could not be restored' in pg.inner_text('#pt-mystatus') and pg.evaluate("JSON.parse(localStorage.getItem('nz:saved')||'[]').length") == hs, 'A wrong file is refused and changes nothing')
    c.close()

    # ---------- phone ----------
    c4 = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, storage_state=state); pg4 = c4.new_page(); pg4.on('pageerror', lambda e: errs.append(str(e)))
    pg4.goto(B + f'/#/explore?cc=CH&p=young_family&sel={ids[0]}&pt=score', wait_until='load'); pg4.wait_for_selector('#place .ptcard', timeout=30000)
    sw1 = pg4.evaluate('document.documentElement.scrollWidth')
    pg4.evaluate("document.body.insertAdjacentHTML('beforeend','<button data-top10 id=tp>t</button>');document.getElementById('tp').click()"); pg4.wait_for_selector('#pt-top10 .pttop li', timeout=15000)
    sw2 = pg4.evaluate('document.documentElement.scrollWidth'); mw = pg4.evaluate("document.querySelector('#modal').getBoundingClientRect().width")
    check(sw1 <= 390 and sw2 <= 390 and mw <= 390, f'Phone: scorecard and My Top 10 fit the screen (page width {sw1}/{sw2}, dialog {mw:.0f})')
    c4.close()
    b.close()
saved_leak = [u for u in outside if 'nz:' in u or 'saved' in u.lower()]
check(not saved_leak, f'Saved data is never sent anywhere (outside requests carrying it: {len(saved_leak)})')
check(not errs, f'no JavaScript errors: {errs[:3]}')
ok = sum(1 for r in res if r[0]); print(f'\n{ok} of {len(res)} passed')
json.dump([{'ok': o, 'check': m} for o, m in res], open(os.path.join(ROOT, 'tests', 'results', 'v27.json'), 'w'), indent=1, ensure_ascii=False)
sys.exit(0 if ok == len(res) else 1)
