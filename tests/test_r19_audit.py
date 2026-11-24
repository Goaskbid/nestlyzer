#!/usr/bin/env python3
"""r19: acceptance checks on the BUILT site for the external audit of upload (9).
NZ9-01/-05/-06: no page states a density of zero from missing data, no altitude-only snow or winter-driving claim, no
'magnet'/'pull' growth claim. NZ9-02: the world-city maps never colour an official area with another place (Milano,
City of London, Copenhagen, Shenzhen fixtures) and every coloured area traces to a geoBoundaries shapeID.
NZ9-08: a TCF withdrawal emits a denied consent update and reloads (probe from the audit, tests/probes9).
Usage: python3 tests/test_r19_audit.py _site"""
import json, os, re, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(R, sys.argv[1] if len(sys.argv) > 1 else '_site')
c = {}
BAD = re.compile(r'\b0 (?:people |residents )?per square kilomet|nearest one may be a cow|[Ss]now tyres|winter here is not a rumour|A clear magnet|Strong pull:|where the moving vans go|less competition for housing')
hits, n = [], 0
for d, _, fs in os.walk(S):
    if '/assets' in d or '/data' in d or '/_packs' in d: continue
    for f in fs:
        if not f.endswith('.html'): continue
        n += 1
        t = open(os.path.join(d, f), encoding='utf-8', errors='replace').read()
        m = BAD.search(t)
        if m: hits.append((os.path.relpath(os.path.join(d, f), S), m.group(0)))
c[f'no unsupported density, altitude or growth claim on any of {n} pages ({len(hits)} found{": " + str(hits[:3]) if hits else ""})'] = not hits and n > 20000
J = json.load(open(os.path.join(R, 'docs/audit/city_map_joins.json'), encoding='utf-8'))['cities']
def zones(k): return (J.get(k) or {}).get('zones') or []
mil = zones('milan')
c['Milano is drawn as its own place, never as Corsico'] = any(z['name'] in ('Milano', 'Milan') for z in mil) and not any(z.get('area') == 'Milano' and z['name'] != 'Milano' for z in mil)
lon = [z for k in J for z in zones(k) if k.startswith('london')]
c['City of London never carries Southwark (or any other place)'] = not any((z.get('area') or '') == 'City of London' and z['name'] != 'City of London' for z in lon)
cph = [z for k in J for z in zones(k) if k.startswith('copenhagen')]
c['Copenhagen never carries Frederiksberg'] = not any((z.get('area') or '') in ('København', 'Copenhagen', 'Københavns') and z['name'] == 'Frederiksberg' for z in cph)
hk = [z for k in J for z in zones(k) if k.startswith('hong')]
c['no Hong Kong place is coloured over a Shenzhen area'] = not any('henzhen' in (z.get('area') or '') for z in hk if z['name'] != 'Shenzhen')
ex = [z for k in J for z in zones(k) if z['kind'].startswith('exact')]
c[f'every coloured official area traces to a geoBoundaries shapeID ({len(ex)} areas)'] = ex and all(z.get('shapeID') for z in ex)
c['no area is coloured with a neighbour’s data (every coloured zone is exact, a dot or a labelled modelled cell)'] = all(z['kind'].split(':')[0] in ('exact', 'dot') or z['kind'].startswith('modelled') for k in J for z in zones(k))
man = json.load(open(os.path.join(R, 'build/source/megacity_shapes.manifest.json'), encoding='utf-8'))
import hashlib
c['boundary manifest pins the output hash, inputs, licences and dependency'] = hashlib.sha256(open(os.path.join(R, 'build/source/megacity_shapes.json'), 'rb').read()).hexdigest() == man['output_sha256'] and man['dependency'].get('polygon-clipping') and all(v.get('sha256') and v.get('licence') for v in man['inputs'].values())
try:
    o = json.loads(subprocess.run(['node', os.path.join(R, 'tests/probes9/consent_bridge.cjs'), S], capture_output=True, text=True, timeout=60).stdout)
    last = o['consent_commands'][-1][2]
    c['TCF withdrawal: last consent command is denied for analytics and ads, and the page reloads'] = last.get('analytics_storage') == 'denied' and last.get('ad_storage') == 'denied' and o['reloads'] == 1 and o['after']['a'] is False
except Exception as e:
    c['TCF withdrawal probe ran: ' + str(e)[:80]] = False
try:
    o = json.loads(subprocess.run(['node', os.path.join(R, 'tests/probes9/worker_extra_faults.mjs'), R], capture_output=True, text=True, timeout=60).stdout)
    st = {x['mode']: x.get('status') for x in o}
    c['Worker: missing pack, invalid pack and a thrown fetch answer 503; recovery 200'] = st == {'pack404': 503, 'invalidpack': 503, 'network': 503, 'recovered': 200}
except Exception as e:
    c['Worker probe ran: ' + str(e)[:80]] = False
# NZ9-12: the published copy loads its gzipped country files, with and without the browser's DecompressionStream
try:
    import time
    from playwright.sync_api import sync_playwright
    srv = subprocess.Popen(['node', os.path.join(R, 'tests/serve.mjs'), S, '8791'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
    with sync_playwright() as p:
        br = p.chromium.launch()
        for label, init in (('DecompressionStream', ''), ('bundled inflater (no DecompressionStream)', 'delete window.DecompressionStream;')):
            pg = br.new_page(viewport={'width': 1280, 'height': 900}); seen = []
            if init: pg.add_init_script(init)
            pg.on('requestfinished', lambda r: seen.append(r.url))
            pg.goto('http://localhost:8791/#/explore?cc=AT&p=young_family', wait_until='load')
            pg.wait_for_function("document.querySelectorAll('#results .row[data-id]').length>5", timeout=120000)
            n = pg.evaluate("document.querySelectorAll('#results .row[data-id]').length")
            c[f'published site ranks Austria from data/c/AT.json.gz and data/x/AT.json.gz via {label} ({n} rows)'] = n > 5 and any('/data/c/AT.json.gz' in u for u in seen) and any('/data/x/AT.json.gz' in u for u in seen) and not any(u.split('?')[0].endswith('/data/c/AT.json') for u in seen)
            pg.close()
        br.close()
    srv.terminate()
except Exception as e:
    c['gzip loader browser check ran: ' + str(e)[:100]] = False
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('R19 AUDIT TEST:', 'PASS' if ok else 'FAIL', f'({sum(c.values())} of {len(c)} passed)'); sys.exit(0 if ok else 1)
