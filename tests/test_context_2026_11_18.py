#!/usr/bin/env python3
"""2.15.30-r7: data batch of 18 Nov 2026 (migration, age, childcare, rent) shown as labelled context, never scored.
Static checks on data/x plus a browser check on the served app (default http://127.0.0.1:8787, the test server).
    python3 tests/test_context_2026_11_18.py [base_url]"""
import asyncio, csv, gzip, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787'
X = {cc: json.load(open(os.path.join(ROOT, 'data', 'x', cc + '.json')))['ctx'] for cc in ('FR', 'DE', 'PT')}
c = {}
mine = {cc: [o for o in X[cc]['records'] if 'official_table_transcription' in (o.get('quality_flags') or []) or o['indicator_id'] in (
    'retiree_migration_balance_interregional', 'active_migration_balance_interregional', 'population_age_65plus_share', 'childcare_places_under3_all_forms',
    'childcare_places_under3_creches', 'childcare_participation_under3', 'childcare_participation_3_to_5', 'migration_net_moves_total', 'migration_net_moves_international', 'rent_new_lease_median_m2')] for cc in X}
c['FR: 96 departments with retiree and active migration, 101 with share aged 65+'] = (
    sum(o['indicator_id'] == 'retiree_migration_balance_interregional' for o in mine['FR']) == 96 and sum(o['indicator_id'] == 'active_migration_balance_interregional' for o in mine['FR']) == 96
    and sum(o['indicator_id'] == 'population_age_65plus_share' and o['source_geo_level'] == 'department' for o in mine['FR']) == 101)
c['FR: national 65+ from Insee not repeated (World Bank national figure already shown)'] = not any(o['indicator_id'] == 'population_age_65plus_share' and o['source_geo_level'] == 'country' for o in mine['FR'])
c['DE: 16 states for childcare (2 ages) and net moves (2 kinds), plus national'] = sum(o['source_geo_level'] == 'state' for o in mine['DE']) == 64 and sum(o['source_geo_level'] == 'country' for o in mine['DE']) == 4
c['PT: 7 municipal new-lease rents reach their 57 parishes as municipality context, plus Portugal'] = (sum(o['source_geo_level'] == 'municipality_context' for o in mine['PT']) == 7
    and sum(1 for v in X['PT']['places'].values() for e in v if e[1] == 'municipality_context') == 57 and any(o['source_geo_level'] == 'country' for o in mine['PT']))
allrec = [o for cc in X for o in X[cc]['records']]
c['noise: none of the 90 rights-held figures is published'] = not any(re.search('noise_exposed', o['indicator_id']) for o in allrec)
c['CNAF components stay staged (only totals shown)'] = not any(re.search(r'theoretical_under3_places_(psu|non_psu|childminder|home_employee|preschool|individual)', o['indicator_id']) for o in allrec)
c['every new figure says it is not scored and is a table transcription'] = all('not_scored' in o.get('quality_flags', []) and 'official_table_transcription' in o.get('quality_flags', []) for cc in mine for o in mine[cc])
scored = json.dumps(json.load(open(os.path.join(ROOT, 'data', 'kpis.json'))))
c['no new indicator feeds a score'] = not any(i in scored for i in ('retiree_migration_balance_interregional', 'childcare_places_under3_all_forms', 'rent_new_lease_median_m2', 'migration_net_moves_total'))
# citable rankings built from the batch (Insights pages with a CSV and Dataset markup)
for slug, n in [('where-retirees-move-in-france', 90), ('childcare-in-germany-by-state', 16), ('new-lease-rents-portugal', 5)]:
    d = os.path.join(ROOT, 'insights', slug); f = os.path.join(d, 'index.html')
    ok = os.path.isfile(f)
    if ok:
        h = open(f, encoding='utf-8').read(); m = re.search(r'href="(/insights/[^"]+\.csv)"', h)
        rows = list(csv.reader(open(os.path.join(ROOT, m.group(1).lstrip('/')), encoding='utf-8'))) if m else []
        ok = bool(m) and len(rows) - 1 >= n and '"Dataset"' in h and 'not part of any score' in h
        ok = ok and all(not re.fullmatch(r'[0-9A-Z]{1,6}', r[2]) for r in rows[1:] if r[2] != 'Portugal')   # real names, not codes
    c['insight page /insights/%s/: chart, CSV (%d+ rows), Dataset markup' % (slug, n)] = ok
# regions ranked (one page per country) and the flagship Location Index
for rel, n in [('rankings/regions/de', 15), ('rankings/regions/fr', 10), ('rankings/regions/ch', 10), ('insights/nestlyzer-location-index', 1000)]:
    f = os.path.join(ROOT, rel, 'index.html'); ok = os.path.isfile(f)
    if ok:
        h = open(f, encoding='utf-8').read(); m = re.search(r'href="(/[^"]+\.csv)"', h)
        rows = list(csv.reader(open(os.path.join(ROOT, m.group(1).lstrip('/')), encoding='utf-8'))) if m else []
        ok = bool(m) and len(rows) - 1 >= n and 'Dataset' in h and 'noindex' not in h
    c['/%s/: ranking, CSV (%d+ rows), Dataset markup, indexable' % (rel, n)] = ok
async def browser():
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); ctx = await b.new_context(viewport={'width': 1400, 'height': 1000})
        await ctx.route(lambda u: not u.startswith(BASE), lambda r: r.abort())
        pg = await ctx.new_page(); out = {}
        for pid, prof in [('FR:01053', 'pensioner'), ('FR:02475', 'pensioner'), ('DE:08111000', 'young_family'), ('PT:310301', 'young_family'), ('FR:03321', 'young_family')]:
            cc = pid[:2]; await pg.goto('%s/#/explore?cc=%s&p=%s&sel=%s' % (BASE, cc, prof, pid)); await pg.wait_for_selector('#place.open', timeout=40000)
            for tb in await pg.locator('#place [data-ptab][role=tab]').all():
                try: await tb.click(timeout=3000); await pg.wait_for_timeout(500)
                except Exception: pass
            await pg.wait_for_timeout(1500); out[pid] = re.sub(r'\s+', ' ', await pg.evaluate("document.querySelector('#place').textContent"))
        await b.close(); return out
T = asyncio.run(browser())
c['Bourg-en-Bresse (Ain): retiree migration and 65+ share of its department'] = 'Retirees moving in minus moving out' in T['FR:01053'] and 'Residents aged 65 and over' in T['FR:01053'] and 'department' in T['FR:01053']
c['Menneville (Aisne, stray region code of Pas-de-Calais): no neighbouring department figure'] = 'Retirees moving in minus moving out' not in T['FR:02475']
c['Stuttgart: state childcare and net moves, moves not ranked as a rate'] = 'Children under 3 in day care' in T['DE:08111000'] and 'not a rate' in T['DE:08111000']
c['Funchal parish: municipal new-lease rent labelled as whole municipality'] = 'Median rent of new leases' in T['PT:310301'] and 'whole municipality (not this parish alone)' in T['PT:310301']
c['Yzeure: its own CNAF childcare figure'] = 'Childcare places per 100 children under 3, all forms' in T['FR:03321'] and 'this municipality' in T['FR:03321']
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('CONTEXT 2026-11-18 TEST:', 'PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
