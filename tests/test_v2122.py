#!/usr/bin/env python3
"""Nestlyzer 2.12.2 acceptance checks on the real application (NZA audit, globe, GitHub limits).
    python3 tests/test_v2122.py [base-url]      (default http://localhost:8787)"""
import csv, gzip, json, os, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
res = []
def check(fid, ok, msg): res.append({'id': fid, 'ok': bool(ok), 'check': msg}); print(('PASS ' if ok else 'FAIL ') + fid + '  ' + msg)

# build side: holds win, decisions recorded, every stored record has one outcome
rep = json.load(open(os.path.join(ROOT, 'build/source/context/build_report.json')))
check('hold', rep['publication'].get('held/hold') == 68, f"Malta Gazette rows stay held (rights and newer release open): {rep['publication']}")
mt = json.load(open(os.path.join(ROOT, 'data/x/MT.json')))
check('hold-page', not any('MT_GAZETTE' in (o.get('source_id') or '') for o in mt.get('ctx', {}).get('records', [])), 'no held Malta record reaches the Malta pages')
tr = list(csv.DictReader(gzip.open(os.path.join(ROOT, 'build/source/context/record_trace.csv.gz'), 'rt')))
mtr = list(csv.DictReader(gzip.open(os.path.join(ROOT, 'build/source/context/master_record_trace.csv.gz'), 'rt')))
check('reconcile', len(tr) == rep['stored_records'] and all(r['published'] in ('True', 'False') for r in tr + mtr), f'record traces: {len(tr)} context + {len(mtr)} master records, one outcome each')
check('gr-el', any(r['country'] == 'GR' and 'NOT_IN_RELEASE' not in r['reason_codes'] and r['published'] == 'True' for r in tr), 'Greek national rows (ISO GR) now reach the Greek pages (EL)')
check('github', subprocess.run([sys.executable, os.path.join(ROOT, 'build/check_github_limits.py'), ROOT]).returncode == 0, 'no folder over 900 files, no file of 20 MiB or more')

with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(viewport={'width': 1400, 'height': 900})
    # 1. a reviewed fact reaches the evidence panel: CBS 2025 mean purchase price on Amsterdam's page for a first-home buyer
    pg.goto(B + '/#/explore?cc=NL&p=first_home&sel=NL%3AGM0363', wait_until='load'); pg.wait_for_selector('#place .cxw', timeout=90000)
    t = pg.inner_text('#place .cxw')
    check('fact', 'owner-occupied dwelling mean transaction price' in t and '631,000' in t.split('Key figures')[1][:400], 'Amsterdam, first-home buyer: CBS mean purchase price 631,000 EUR in the key figures')
    # 2. a native scored factor reaches its intended score, and only there (counterfactual, everything else constant)
    cf = pg.evaluate("""(() => { const E = NZ_CXENV(), en = E.ENGINE, r = E.BYID['NL:GM0363'], f = 'n_woz_value', old = r.factorScores[f];
      const cat = Object.keys(en.factorIdsByCat).find(c => en.factorIdsByCat[c].indexOf(f) >= 0);
      const other = Object.keys(en.profiles).find(k => !en.profiles[k].disabled && !(en.profiles[k].weights || {})[cat] && k.startsWith('biz_'));
      const sc = k => { r._cats = null; const x = en.scoreRaw(r, k); return x ? x.score : null; };
      const a0 = sc('first_home'), b0 = sc(other); r.factorScores[f] = Math.min(100, old + 60); const a1 = sc('first_home'), b1 = sc(other);
      r.factorScores[f] = old; const a2 = sc('first_home');
      return { cat, other, a0, a1, a2, b0, b1, w: en.profiles.first_home.weights[cat] }; })()""")
    check('score', cf['a1'] > cf['a0'] and cf['b1'] == cf['b0'] and cf['a2'] == cf['a0'],
          f"cheaper homes (WOZ factor +60) raise Amsterdam for a first-home buyer {cf['a0']:.2f} -> {cf['a1']:.2f} through '{cf['cat']}' (weight {cf['w']}); {cf['other']} unchanged ({cf['b0']:.2f}); restored score reproduces")
    pg.goto(B + '/#/explore?cc=NL&p=first_home&sel=NL%3AGM0363&pt=score', wait_until='load'); pg.wait_for_selector('#place .ptcard', timeout=60000); pg.wait_for_timeout(800)
    st = pg.inner_text('#place')
    check('explain', 'home value (woz)' in st.lower() and 'holds costs back' in st, 'the score tab names the WOZ home value as what holds Amsterdam back for a first-home buyer')
    # 3. expanded view keeps every distinct figure (no family cap): San Jose pay by occupation
    pg.goto(B + '/#/explore?cc=US&p=expat_professional', wait_until='load'); pg.wait_for_function("window.NZ_CXENV && (function(E){return E.KPIX && E.SHARDS.US && E.SHARDS.US.extra && E.SHARDS.US.extra.ctx})(NZ_CXENV())", timeout=180000)
    sid = pg.evaluate("(()=>{const E=NZ_CXENV(); const r=Object.values(E.BYID).find(x=>x.country==='US'&&/^San Jose/.test(x.name)&&x.rc==='US04'); return r&&r.id})()")
    T = pg.evaluate(f"NZ_CXTRACE('{sid}', 'expat_professional')")
    nb = sum(1 for _ in T['expanded']) if T else 0
    check('expanded', T and nb > 24 and not any(v == 'UNEXPLAINED' for v in T['dropped'].values()), f'San Jose: {len(T["summary"]) if T else 0} key figures, {nb} more in the expanded view, every other row has a reason ({sorted(set(T["dropped"].values())) if T else []})')
    # 4. every window opens at its top (the place panel after another place was scrolled, the tools drawer, the search)
    pg.goto(B + '/#/explore?cc=CH&p=young_family&sel=CH%3A261', wait_until='load'); pg.wait_for_selector('#place .keyfacts', timeout=90000); pg.wait_for_timeout(800)
    pg.evaluate("document.querySelector('#placescroll').scrollTop = 99999")
    down = pg.evaluate("document.querySelector('#placescroll').scrollTop")
    pg.goto(B + '/#/explore?cc=CH&p=young_family&sel=CH%3A230', wait_until='load'); pg.wait_for_timeout(1500)
    top = pg.evaluate("document.querySelector('#placescroll').scrollTop")
    check('top', down > 500 and top == 0, f'a new place opens at its top (previous panel scrolled to {down}px, new one at {top}px)')
    br.close()
    # 5. the globe also draws without WebGL
    for name, args in (('webgl', []), ('no-webgl', ['--disable-webgl', '--disable-3d-apis'])):
        b2 = pw.chromium.launch(args=args); p2 = b2.new_page(viewport={'width': 1400, 'height': 900}); p2.goto(B + '/', wait_until='load'); p2.wait_for_timeout(7000)
        check('globe', 'globe-on' in p2.evaluate("document.querySelector('#cine').className"), f'start page globe draws ({name})'); b2.close()

json.dump(res, open(os.path.join(ROOT, 'tests/v2122_results.json'), 'w'), indent=1)
print(f"{sum(r['ok'] for r in res)} of {len(res)} passed")
