#!/usr/bin/env python3
"""Audit of every country outside Europe (plus Switzerland and Germany as controls): opens each country with several
households and scopes (whole country, a state or province, the biggest greater area), and flags wording that only fits
Europe, empty or contradictory states, missing places and JavaScript errors. Writes tests/results/audit_world.json and
screenshots into tests/results/audit/.

    node tests/serve.mjs . 8787 &   then   python3 tests/audit_world.py
"""
import json, os, re, sys
from playwright.sync_api import sync_playwright

B = os.environ.get('NZ_BASE', 'http://localhost:8787')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tests', 'results'); SHOTS = os.path.join(OUT, 'audit'); os.makedirs(SHOTS, exist_ok=True)
WORLD = ['US', 'CA', 'JP', 'KR', 'TW', 'HK', 'SG', 'AU', 'NZ', 'IL']
CC = WORLD + ['CH', 'DE']
PROFILES = ['young_family', 'coastal', 'business_owner', 'digital_native', 'student', 'pensioner']
# wording that is wrong outside Europe (the Eurostat note "covers Europe only" is allowed)
BAD_WORLD = [r'\bmunicipalit', r'\bNUTS\b', r'EDJNet', r'GISCO', r'\bcantons?\b(?! \()', r'elsewhere in Europe', r'Europe has', r'Schengen', r'Eurostat GISCO', r'(?<!Lung )\bLAU\b(?! Fau)', r'\bEU\b(?! and)', r'\b112 (?:works|emergency)']
BAD_ALL = [r'\bundefined\b', r'\bNaN\b', r'\bnull\b', r'\[object', r'has no coast', r'–residents', r'trend is unknown']

def main():
    issues, seen = [], set()
    def flag(where, text, pats):
        for p in pats:
            for m in re.finditer(p, text, re.I):
                ctx = text[max(0, m.start() - 70): m.end() + 70].replace('\n', ' ')
                key = (where.split(' |')[0], p, ctx[:60])
                if key in seen: continue
                seen.add(key); issues.append({'where': where, 'pattern': p, 'context': ctx})
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        c = b.new_context(viewport={'width': 1440, 'height': 900})
        c.add_init_script("try{localStorage.setItem('nz:consent2',JSON.stringify({a:0,t:Date.now(),v:2}));localStorage.setItem('nz:toured','1');localStorage.setItem('nz:ext','0')}catch(e){}")
        pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        counts = {}
        for cc in CC:
            pg.goto(f'{B}/#/explore?cc={cc}&p=young_family', wait_until='load'); pg.wait_for_timeout(3500)
            regions = pg.eval_on_selector_all('#f-region option', 'e => e.map(o => [o.value, o.textContent])')
            areas = pg.eval_on_selector_all('#f-area option', 'e => e.map(o => [o.value, o.textContent])')
            greater = [a for a in areas if a[0].startswith('M:')]
            scopes = [('ALL', 'ALL', 'whole country')]
            reg = [r for r in regions if r[0] != 'ALL']
            if reg: scopes.append((reg[0][0], 'ALL', 'region ' + reg[0][1]))
            if greater: scopes.append(('ALL', greater[0][0], greater[0][1]))
            for prof in PROFILES:
                for r, a, label in scopes:
                    from urllib.parse import quote
                    url = f'{B}/#/explore?cc={cc}&p={prof}&r={quote(r)}&a={quote(a)}'
                    pg.goto(url, wait_until='load'); pg.wait_for_timeout(2600)
                    where = f'{cc} | {prof} | {label}'
                    rail = pg.inner_text('.rail') if pg.locator('.rail').count() else ''
                    note = pg.inner_text('#mapnote') if pg.locator('#mapnote').count() else ''
                    n_rank = len(re.findall(r'^\s*\d+\s*$', rail, re.M))
                    m = re.search(r'([\d,]+) of ([\d,]+) (?:places|municipalities|[a-z ]+) fit', rail)
                    counts[where] = m.group(0) if m else rail[:80].replace('\n', ' ')
                    txt = rail + '\n' + note
                    flag(where, txt, BAD_ALL + (BAD_WORLD if cc in WORLD else []))
                    if m and m.group(1) == '0' and prof != 'coastal':
                        issues.append({'where': where, 'pattern': 'nothing ranks', 'context': m.group(0)})
                    if prof == 'coastal' and label != 'whole country' and cc in ('CA', 'US', 'JP', 'CH', 'AU'):
                        try: pg.screenshot(path=os.path.join(SHOTS, f'{cc}_{label[:20].replace(" ", "_").replace("/", "_")}_coastal.png'), timeout=60000)
                        except Exception: pass
            # the best place for two profiles: open it and read every tab
            for prof in ('business_owner', 'coastal'):
                pg.goto(f'{B}/#/explore?cc={cc}&p={prof}', wait_until='load'); pg.wait_for_timeout(3000)
                first = pg.locator('.rail [data-id]').first
                if not first.count(): continue
                first.click(); pg.wait_for_timeout(2500)
                for tab in ('overview', 'facts', 'around', 'similar', 'data'):
                    t = pg.locator(f'#place [data-ptab="{tab}"]')
                    if t.count(): t.first.click(); pg.wait_for_timeout(1500)
                    txt = pg.eval_on_selector('#place', 'e => e.textContent') if pg.locator('#place').count() else ''
                    flag(f'{cc} | {prof} | place tab {tab}', txt, BAD_ALL + (BAD_WORLD if cc in WORLD else []))
                try: pg.screenshot(path=os.path.join(SHOTS, f'{cc}_{prof}_place.png'), timeout=60000)
                except Exception: pass
        b.close()
    rep = {'issues': issues, 'js_errors': errs, 'counts': counts}
    json.dump(rep, open(os.path.join(OUT, 'audit_world.json'), 'w'), indent=1, ensure_ascii=False)
    print(len(issues), 'issues,', len(errs), 'JS errors')
    for i in issues: print('-', i['where'], '|', i['pattern'], '|', i['context'][:160])
    for e in errs[:10]: print('JS', e[:200])

if __name__ == '__main__':
    main()
