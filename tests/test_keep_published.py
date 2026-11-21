#!/usr/bin/env python3
"""2.15.30-r11: the scheduled refresh keeps everything published and only moves population forward.
Builds a small git copy (meta + AT + DE + one context file), then plays both refresh outcomes through
build/keep_published.py and build/compact_ctx.py's history rule.     python3 tests/test_keep_published.py"""
import json, os, shutil, subprocess, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
c = {}
T = tempfile.mkdtemp()
for rel in ('data/meta.json', 'data/c/AT.json', 'data/c/DE.json', 'data/x/NL.json', 'build/keep_published.py', '.gitignore'):
    if os.path.exists(os.path.join(ROOT, rel)):
        os.makedirs(os.path.dirname(os.path.join(T, rel)), exist_ok=True); shutil.copy(os.path.join(ROOT, rel), os.path.join(T, rel))
g = lambda *a: subprocess.run(['git', '-c', 'user.name=t', '-c', 'user.email=t@t', *a], cwd=T, capture_output=True, check=True)
g('init', '-q'); g('add', '-A'); g('commit', '-qm', 'published')
J = lambda rel: json.load(open(os.path.join(T, rel)))
W = lambda rel, o: json.dump(o, open(os.path.join(T, rel), 'w'))
run = lambda: subprocess.run(['python3', os.path.join(T, 'build/keep_published.py')], capture_output=True, text=True, check=True).stdout
pub = {rel: open(os.path.join(T, rel), 'rb').read() for rel in ('data/meta.json', 'data/c/AT.json', 'data/c/DE.json', 'data/x/NL.json')}
# 1) a rebuild with no newer year that lost and changed things: everything comes back byte-identical
at = J('data/c/AT.json'); at['rows'] = at['rows'][:-5]; at['rows'][0][1] = 'renamed'; W('data/c/AT.json', at)
nl = J('data/x/NL.json'); nl['ctx']['records'] = nl['ctx']['records'][:10]; W('data/x/NL.json', nl)
os.remove(os.path.join(T, 'data/c/DE.json')); open(os.path.join(T, 'data/new.json'), 'w').write('{}')
out = run()
c['no newer year: every published file restored byte-identical, additions removed'] = all(open(os.path.join(T, r), 'rb').read() == b for r, b in pub.items()) and not os.path.exists(os.path.join(T, 'data/new.json'))
# 2) a newer year for AT only: AT residents move forward, nothing else changes
at = J('data/c/AT.json'); I = at['cols'].index('pop'); N = at['cols'].index('name')
before = [r[I] for r in at['rows'][:3]]
for r in at['rows'][:3]: r[I] += 100
at['rows'][3][N] = 'must not survive'; W('data/c/AT.json', at)
de = J('data/c/DE.json'); de['rows'][0][de['cols'].index('pop')] += 999; W('data/c/DE.json', de)
m = J('data/meta.json'); m['population']['year'] += 1; m['population']['updated_countries'] = ['AT']; W('data/meta.json', m)
out = run(); at2 = J('data/c/AT.json'); at0 = json.loads(pub['data/c/AT.json'])
c['newer year: AT residents move forward'] = [r[I] for r in at2['rows'][:3]] == [b + 100 for b in before]
c['newer year: everything else in AT stays as published'] = all(at2['rows'][i] == at0['rows'][i] for i in range(3, len(at0['rows'])))
c['newer year: countries outside the update stay as published'] = open(os.path.join(T, 'data/c/DE.json'), 'rb').read() == pub['data/c/DE.json']
c['newer year: meta carries the new year'] = J('data/meta.json')['population']['year'] == m['population']['year']
# 3) without git nothing happens
shutil.rmtree(os.path.join(T, '.git')); W('data/c/DE.json', de); out = run()
c['without git (release replay): nothing changed'] = 'nothing changed' in out and J('data/c/DE.json') == de
shutil.rmtree(T)
# 4) the chain is wired: build_data runs the Swiss population step, build_reach the intermodal step, publish_downloads keeps published
src = lambda f: open(os.path.join(ROOT, 'build', f), encoding='utf-8').read()
c['refresh chain wired (Swiss population, intermodal reach, keep published, version from package.json)'] = 'refresh_ch_population.py' in src('build_data.py') and 'add_intermodal_reach.py' in src('build_reach.py') and 'keep_published.py' in src('publish_downloads.py') and "package.json')))['version']" in src('audit_export.py')
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('KEEP PUBLISHED TEST:', 'PASS' if ok else 'FAIL'); raise SystemExit(0 if ok else 1)
