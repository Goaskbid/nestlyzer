#!/usr/bin/env python3
"""Nestlyzer 2.9 checks: the re-audit findings NZ-GLOBAL-043 to 050 (18 October 2026 ledger), on the real app.

    python3 tests/test_v29.py [base-url]     (default http://localhost:8787, the root build served by tests/serve.mjs)

Each check names its finding. Run against 2.8.1 it shows which findings reproduce on the current build;
run against 2.9 it shows that they are fixed. Results go to tests/results/v29.json."""
import json, os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
res = []


def check(fid, ok, msg):
    res.append({'finding': fid, 'ok': bool(ok), 'check': msg}); print(('PASS ' if ok else 'FAIL ') + fid + '  ' + msg)


def ranked(pg, cc, extra='', timeout=60000):
    pg.goto(B + '/#/explore?cc=' + cc + '&p=young_family' + extra, wait_until='load')
    pg.wait_for_function("window.NZ && NZ.state.cc==='%s' && NZ.res && NZ.res.scored && (NZ.res.scored.length===0 || NZ.res.scored[0].r.id.indexOf('%s:')===0)" % (cc, cc), timeout=timeout)
    pg.wait_for_timeout(600)


def fresh(b, **kw):
    ctx = b.new_context(viewport=kw.get('viewport', {'width': 1300, 'height': 900}), is_mobile=kw.get('mobile', False), has_touch=kw.get('mobile', False))
    ctx.add_init_script("try{localStorage.setItem('nz:consent2', JSON.stringify({v:2,a:false,d:false,t:Date.now()}))}catch(e){}")
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    return ctx, pg, errs


with sync_playwright() as p:
    b = p.chromium.launch()
    allerrs = []

    # ---------- 043 manual weights survive reopening the builder ----------
    ctx, pg, errs = fresh(b); allerrs += [errs]
    ranked(pg, 'CH')
    pg.evaluate("document.querySelector('[data-builder]') ? document.querySelector('[data-builder]').click() : null")
    if not pg.locator('#bq').count():
        pg.goto(B + '/', wait_until='load'); pg.wait_for_timeout(800); pg.click('[data-start="builder"]')
    pg.wait_for_selector('#w-affordability', state='attached', timeout=20000)
    pg.evaluate("(function(){var d=document.querySelector('#bside details');if(d)d.open=true;var s=document.getElementById('w-affordability');s.value=1;s.dispatchEvent(new Event('input',{bubbles:true}))})()")
    pg.wait_for_timeout(600)
    pg.click('.builder [data-bapply], #bside [data-bapply]'); pg.wait_for_timeout(2500)
    applied = pg.evaluate("NZ.state.custom && NZ.state.custom.weights.affordability")
    pg.evaluate("document.querySelector('[data-builder]') ? document.querySelector('[data-builder]').click() : null")
    if not pg.locator('#w-affordability').count():
        pg.goto(B + '/', wait_until='load'); pg.wait_for_timeout(800); pg.click('[data-start="builder"]')
    pg.wait_for_selector('#w-affordability', state='attached', timeout=20000)
    reopened = pg.evaluate("+document.getElementById('w-affordability').value")
    pg.click('#bside [data-bapply]'); pg.wait_for_timeout(2500)
    again = pg.evaluate("NZ.state.custom && NZ.state.custom.weights.affordability")
    check('043', applied == 1 and reopened == 1 and again == 1, f'edited weight 1 is applied ({applied}), shows 1 when the builder reopens ({reopened}) and stays 1 when applied again ({again})')
    ctx.close()

    # ---------- 044 an unmatched language choice is kept ----------
    ctx, pg, errs = fresh(b); allerrs += [errs]
    ranked(pg, 'SG', '&lang=it')
    lang = pg.evaluate('NZ.state.lang'); n = pg.evaluate('NZ.res.scored.length')
    body = pg.evaluate("document.getElementById('results').innerText")
    check('044', lang == 'it' and n == 0 and 'Italian' in body and pg.locator('#results [data-droplang]').count() == 1,
          f'Italian in Singapore stays selected (lang={lang!r}), ranks no place as Italian-speaking ({n}) and offers an explicit "show every place" action')
    if pg.locator('#results [data-droplang]').count():
        pg.click('#results [data-droplang]'); pg.wait_for_timeout(1500)
        check('044', pg.evaluate('NZ.state.lang') == '' and pg.evaluate('NZ.res.scored.length') > 0, 'relaxing the language is an explicit action and brings the places back')
    ctx.close()

    # ---------- 045 shared links keep the name filter ----------
    ctx, pg, errs = fresh(b); allerrs += [errs]
    ranked(pg, 'CH')
    pg.evaluate("NZ.state.q='Zurich'"); pg.evaluate("window.dispatchEvent(new Event('nz-noop'))")
    pg.evaluate("(function(){var i=document.getElementById('f-q');if(i){i.value='Zurich';i.dispatchEvent(new Event('input',{bubbles:true}))}})()")
    pg.wait_for_timeout(2500)
    n_sender = pg.evaluate('NZ.res.scored.length'); ids_sender = pg.evaluate('NZ.res.scored.slice(0,10).map(function(x){return x.id})')
    link = pg.evaluate('location.href')
    ctx.close()
    ctx, pg, errs = fresh(b); allerrs += [errs]
    pg.goto(link, wait_until='load')
    pg.wait_for_function("window.NZ && NZ.res && NZ.res.scored && NZ.state.cc==='CH'", timeout=60000); pg.wait_for_timeout(1500)
    n_recv = pg.evaluate('NZ.res.scored.length'); ids_recv = pg.evaluate('NZ.res.scored.slice(0,10).map(function(x){return x.id})')
    check('045', n_sender == n_recv and ids_sender == ids_recv and n_sender < 2000, f'a name-filtered link reproduces the same places in a new browser ({n_sender} sent, {n_recv} received, same top 10: {ids_sender == ids_recv})')
    pg.goto(B + '/#/explore?cc=CH&p=young_family', wait_until='load'); pg.wait_for_timeout(2000)
    check('045', pg.evaluate("NZ.state.q || ''") == '' and pg.evaluate('NZ.res.scored.length') > n_recv, 'a following link without a name filter clears the old one')
    ctx.close()

    # ---------- 046 an Overview link opens Overview ----------
    ctx, pg, errs = fresh(b); allerrs += [errs]
    ranked(pg, 'CH', '&sel=CH:261&pt=data'); pg.wait_for_timeout(1500)
    t1 = pg.evaluate('NZ.state.ptab')
    pg.goto(B + '/#/explore?cc=CH&p=young_family&sel=CH:351', wait_until='load'); pg.wait_for_timeout(2000)
    t2 = pg.evaluate('NZ.state.ptab')
    pg.goto(B + '/#/explore?cc=CH&p=young_family&sel=CH:261&pt=data', wait_until='load'); pg.wait_for_timeout(1500)
    pg.goto(B + '/#/explore?cc=CH&p=young_family&sel=CH:351&pt=overview', wait_until='load'); pg.wait_for_timeout(2000)
    t3 = pg.evaluate('NZ.state.ptab')
    check('046', t1 == 'data' and t2 == 'overview' and t3 == 'overview', f'after All data, a link without a tab and a link with pt=overview both open Overview ({t1} -> {t2}, {t3})')
    ctx.close()

    # ---------- 047 a comparison link does not change the shortlist ----------
    ctx, pg, errs = fresh(b); allerrs += [errs]
    pg.goto(B + '/#/explore?cc=CH&p=young_family&cmp=CH:4911,CH:4196', wait_until='load')
    pg.wait_for_selector('#modal.open table.cmp', timeout=60000); pg.wait_for_timeout(800)
    saved = pg.evaluate("(function(){try{return (JSON.parse(localStorage.getItem('nz:saved')||'[]')||[]).length}catch(e){return -1}})()")
    savedui = pg.evaluate("(document.querySelector('[data-savedcount], .savedcount, #savedcount')||{}).textContent||''")
    check('047', saved == 0, f'opening a shared comparison leaves an empty shortlist empty (saved places: {saved}, badge {savedui.strip()!r})')
    has_btn = pg.locator('#modal [data-savecmp]').count() == 1
    if has_btn:
        pg.click('#modal [data-savecmp]'); pg.wait_for_timeout(800)
        saved2 = pg.evaluate("(JSON.parse(localStorage.getItem('nz:saved')||'[]')||[]).length")
    else:
        saved2 = None
    check('047', has_btn and saved2 == 2, f'an explicit "Save these places" button adds exactly the compared places ({saved2})')
    ctx.close()

    # ---------- 048 invalid shared weights are rejected, an explicit zero minimum survives ----------
    ctx, pg, errs = fresh(b); allerrs += [errs]
    pg.goto(B + '/#/explore?cc=CH&p=self_fit&w=jobs:100,affordability:-99', wait_until='load')
    pg.wait_for_function("window.NZ && NZ.res && NZ.res.scored", timeout=60000); pg.wait_for_timeout(1500)
    top = pg.evaluate('NZ.res.scored.length ? Math.max.apply(null, NZ.res.scored.map(function(x){return x.overall})) : 0')
    neg = pg.evaluate("!!(NZ.state.custom && Object.keys(NZ.state.custom.weights).some(function(k){return NZ.state.custom.weights[k] < 0}))")
    check('048', top <= 100 and not neg, f'a link with a negative weight is rejected: no negative weight applied ({neg}), best score {top:.1f} stays within 0-100')
    pg.goto(B + '/#/explore?cc=CH&p=self_fit&w=jobs:30,safety:20&mp=0', wait_until='load'); pg.wait_for_timeout(2500)
    mp = pg.evaluate('NZ.state.custom && NZ.state.custom.minPop')
    href = pg.evaluate('location.hash')
    check('048', mp == 0 and 'mp=0' in href, f'an explicit minimum population of 0 survives the link and the round trip (minPop={mp}, link keeps mp=0: {"mp=0" in href})')
    for bad in ['jobs:NaN', 'jobs:0,safety:0', 'jobs:1e9']:
        pg.goto(B + '/#/explore?cc=CH&p=self_fit&w=' + bad, wait_until='load'); pg.wait_for_timeout(1500)
        top = pg.evaluate('NZ.res && NZ.res.scored.length ? Math.max.apply(null, NZ.res.scored.map(function(x){return x.overall})) : 0')
        check('048', top <= 100, f'link with w={bad} cannot produce a score above 100 (best {top:.1f})')
    ctx.close()

    # ---------- 049 coverage is the weighted share with data, never a count floor ----------
    # The scorecard lists every criterion with its weight and either a score or "no data"; the share of weight with a
    # score is the true weighted availability. The headline must not claim more.
    ctx, pg, errs = fresh(b); allerrs += [errs]
    import re as _re
    for cc in ['KR', 'AU', 'CA', 'TW']:
        ranked(pg, cc)
        sel = pg.evaluate('NZ.res.scored[0].id')
        pg.goto(B + '/#/explore?cc=' + cc + '&p=young_family&sel=' + sel + '&pt=score', wait_until='load')
        pg.wait_for_function("NZ.state.selected===" + json.dumps(sel) + " && document.querySelector('#place .ptcard .pttable')", timeout=30000); pg.wait_for_timeout(600)
        rows = pg.evaluate("""[...document.querySelectorAll('#place .ptcard .pttable tbody tr')].map(function(tr){var td=tr.querySelectorAll('td');return [td[0].innerText.trim(), parseFloat(td[1].innerText), !td[2].querySelector('.ptbar.none')]})""")
        tot = sum(r[1] for r in rows); have = sum(r[1] for r in rows if r[2])
        true = round(have / tot * 100) if tot else 0
        head = pg.inner_text('#place .ptcard .pthead')
        m = _re.search(r'(\d+)% of (?:the|your) weights', head)
        claim = int(m.group(1)) if m else None
        check('049', claim is not None and abs(claim - true) <= 1 and ('modelled' in head or 'official statistics' in head), f'{cc} #1 ({pg.evaluate("NZ.record(" + json.dumps(sel) + ").name")}): headline says {claim}% of the weights, the criteria with data carry {true}%; estimated share stated: {"estimated" in head}')
    ctx.close()

    # ---------- 050 keyboard focus stays inside search and the phone filter sheet ----------
    ctx, pg, errs = fresh(b); allerrs += [errs]
    ranked(pg, 'CH')
    pg.keyboard.press('Control+k'); pg.wait_for_selector('#palette.open', timeout=5000)
    pg.keyboard.type('Zug'); pg.wait_for_timeout(600)
    out = 0
    for i in range(14):
        pg.keyboard.press('Tab'); pg.wait_for_timeout(60)
        if not pg.evaluate("document.getElementById('palette').contains(document.activeElement)"): out += 1
    check('050', out == 0, f'14 Tab presses stay inside the search window ({out} left it)')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    ctx.close()
    ctx, pg, errs = fresh(b, viewport={'width': 390, 'height': 844}, mobile=True); allerrs += [errs]
    ranked(pg, 'CH')
    pg.evaluate("document.querySelector('[data-filters]').click()"); pg.wait_for_timeout(700)
    role = pg.evaluate("(function(){var f=document.getElementById('filterpanel');return [f.getAttribute('role'),f.getAttribute('aria-modal'),f.getAttribute('aria-label')||f.getAttribute('aria-labelledby')]})()")
    inside0 = pg.evaluate("document.getElementById('filterpanel').contains(document.activeElement)")
    out = 0
    for i in range(25):
        pg.keyboard.press('Tab'); pg.wait_for_timeout(40)
        if not pg.evaluate("document.getElementById('filterpanel').contains(document.activeElement)"): out += 1
    check('050', role[0] == 'dialog' and role[1] == 'true' and role[2] and inside0 and out == 0, f'phone filter sheet is a named modal dialog {role}, focus starts inside ({inside0}) and 25 Tab presses stay inside ({out} left)')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    back = pg.evaluate("(document.activeElement && document.activeElement.hasAttribute('data-filters'))")
    check('050', pg.evaluate("document.getElementById('filterpanel').hidden") and back, f'Escape closes the sheet and returns focus to the Filters button ({back})')
    ctx.close()

    # ---------- 001 / 002 All data: facts first, other households' scores apart, no score shown as a value ----------
    ctx, pg, errs = fresh(b); allerrs += [errs]
    pg.goto(B + '/#/explore?cc=CH&p=dinks', wait_until='load')
    pg.wait_for_function("window.NZ && NZ.res && NZ.res.scored.length && NZ.state.profile==='dinks'", timeout=60000)
    sel = pg.evaluate('NZ.res.scored[0].id')
    pg.goto(B + '/#/explore?cc=CH&p=dinks&sel=' + sel + '&pt=data', wait_until='load')
    pg.wait_for_selector('#place [data-adg="fit"]', state='attached', timeout=60000); pg.wait_for_timeout(1500)
    fit = pg.evaluate("document.querySelector('#place [data-adg=\"fit\"]').textContent")
    oth = pg.evaluate("(document.querySelector('#place [data-adg=\"others\"]')||{}).textContent||''")
    check('001', 'Score as' not in fit and 'Score as' in oth,
          f'DINKS: "Score and ranking" holds no other household\'s score; those sit in a separate "Compare profiles" group ({oth.count("Score as")} rows)')
    allt = pg.evaluate("[...document.querySelectorAll('#place [data-alldata] tbody tr')].map(function(tr){var c=tr.querySelectorAll('td,th');return c.length>1?c[1].textContent:''})")
    import re as _re2
    check('002', not any(_re2.match(r'\s*score \d', v) for v in allt), f'no figure shows a 0-100 score in place of a missing measured value ({len(allt)} rows checked)')
    ctx.close()

    # ---------- 004 language-area leaders are labelled as such on the map ----------
    ctx, pg, errs = fresh(b); allerrs += [errs]
    pg.goto(B + '/#/explore?cc=CH&p=dinks', wait_until='load')
    pg.wait_for_function("window.NZ && NZ.res && NZ.res.scored.length && document.querySelectorAll('.pin').length > 3", timeout=90000); pg.wait_for_timeout(1500)
    pins = pg.evaluate("[...document.querySelectorAll('.pin:not(.xb):not(.hub):not(.anc)')].map(function(e){return [e.textContent, e.title]})")
    bad = [t for t in pins if t[0].isdigit() and int(t[0]) > 10]
    langp = [t for t in pins if ' among ' in t[1]]
    check('004', not bad and all((' of ' in t[1]) for t in pins), f'map pins never show an unexplained overall rank above 10 ({len(bad)}); {len(langp)} language-area leaders say "#n among … places, #m of N in scope" (e.g. {langp[0][1][:70] if langp else "-"})')
    ctx.close()

    # ---------- 007 household -> business -> household restores the household choice ----------
    ctx, pg, errs = fresh(b); allerrs += [errs]
    pg.goto(B + '/#/explore?cc=DE&p=dinks', wait_until='load')
    pg.wait_for_function("window.NZ && NZ.res && NZ.res.scored.length && NZ.state.profile==='dinks'", timeout=60000); pg.wait_for_timeout(800)
    pg.click('#modeseg [data-mode="biz"]'); pg.wait_for_timeout(2500)
    p1 = pg.evaluate('NZ.state.profile')
    pg.click('#modeseg [data-mode="home"]'); pg.wait_for_timeout(2500)
    p2 = pg.evaluate('NZ.state.profile')
    check('007', p1.startswith('biz_') and p2 == 'dinks', f'DINKS -> Business ({p1}) -> Places to live returns to DINKS ({p2})')
    ctx.close()

    # ---------- 051 / 052 business page: unknown stays unknown, the brief matches the screen ----------
    ctx, pg, errs = fresh(b); allerrs += [errs]
    r_ = pg.goto(B + '/business/', wait_until='load')
    if not r_ or r_.status >= 400: pg.goto(B + '/business.html', wait_until='load')   # the flat website build
    pg.wait_for_timeout(1500)
    def setv(i, v): pg.evaluate("(function(){var e=document.getElementById(%s);e.value=%s;e.dispatchEvent(new Event('input',{bubbles:true}))})()" % (json.dumps(i), json.dumps(v)))
    pg.evaluate("renderStateCompare && renderStateCompare()")
    setv('energy-kwh', ''); pg.evaluate("renderStateCompare()"); pg.wait_for_timeout(300)
    cmp = pg.evaluate("document.getElementById('state-comparison').innerText")
    line = [l for l in cmp.split('\n') if 'Illustrative annual electricity' in l]
    check('051', line and 'Enter annual consumption' in line[0] and ' 0' not in line[0].split('USD')[-1], f'blank annual consumption shows "Enter annual consumption", not USD 0: {line[0] if line else None!r}')
    setv('energy-kwh', '-5'); pg.evaluate("renderStateCompare()"); pg.wait_for_timeout(300)
    cmp = pg.evaluate("document.getElementById('state-comparison').innerText")
    line = [l for l in cmp.split('\n') if 'Illustrative annual electricity' in l]
    check('051', line and 'Check the consumption figure' in line[0], f'a negative consumption is flagged, not computed: {line[0] if line else None!r}')
    setv('brief-headcount', ''); setv('brief-area', '0')
    br = pg.evaluate("getBrief()")
    check('051', br['planned_headcount'] is None and br.get('quantity_status',{}).get('planned_headcount') == 'unknown' and br['premises_m2'] == 0 and br.get('quantity_status',{}).get('premises_m2') == 'known',
          f"brief: blank headcount exports as unknown ({br['planned_headcount']}, {br.get('quantity_status',{}).get('planned_headcount')}), an explicit 0 m² stays 0 ({br['premises_m2']})")
    setv('energy-kwh', '2000000'); pg.wait_for_timeout(300)
    br = pg.evaluate("getBrief()")
    check('052', br['annual_electricity_kwh'] == 2000000 and br.get('screening', {}).get('industry') and len(br['screening'].get('compared_states', [])) == 2 and br['screening'].get('top_states'),
          f"screen set to 2,000,000 kWh exports 2,000,000 kWh ({br['annual_electricity_kwh']}) with industry {br.get('screening',{}).get('industry')}, compared states, weights and top states")
    setv('brief-kwh', '3000000'); pg.wait_for_timeout(300)
    check('052', pg.evaluate("document.getElementById('energy-kwh').value") == '3000000', 'changing the brief consumption updates the screen (one value, not two)')
    ctx.close()

    flat = [e for es in allerrs for e in es]
    check('all', not flat, f'no JavaScript errors {flat[:2]}')
    b.close()

n = sum(1 for r in res if r['ok'])
print(f'\n{n} of {len(res)} passed')
os.makedirs(os.path.join(ROOT, 'tests', 'results'), exist_ok=True)
json.dump(res, open(os.path.join(ROOT, 'tests', 'results', os.environ.get('V29_OUT', 'v29.json')), 'w'), indent=1, ensure_ascii=False)
sys.exit(0 if n == len(res) else 1)
