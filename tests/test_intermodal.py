#!/usr/bin/env python3
"""2.15.30-r8 (owner: multimodal access was missing outside Europe). Freight access counts the nearest inland port OR intermodal
terminal / dry port worldwide; port must-haves (port-based industry) still need a real sea or waterway port.
    python3 tests/test_intermodal.py"""
import json, os, glob, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); c = {}
F = json.load(open(os.path.join(ROOT, 'data/facilities.json')))['items']
term = [i for i in F if i['kind'] == 'terminal']; zones = [i for i in F if i['kind'] == 'zone']
EU = set('AT BE BG CH CY CZ DE DK EE EL ES FI FR HR HU IE IS IT LI LT LU LV MT NL NO PL PT RO SE SI SK UK RS MK AL'.split())
c['intermodal terminals and dry ports in 40+ countries, 18+ outside Europe (%d, %d countries)' % (len(term), len({t['cc'] for t in term}))] = len({t['cc'] for t in term}) >= 40 and len({t['cc'] for t in term} - EU) >= 18
c['special zones and free ports in 35+ countries (%d)' % len({z['cc'] for z in zones})] = len({z['cc'] for z in zones}) >= 35
tn = {t['name'] for t in term}; near = set()
for f in glob.glob(os.path.join(ROOT, 'data/x/[A-Z][A-Z].json')):
    x = json.load(open(f)); k, n, s = x['cols']['iport_km'], x['cols']['iport'], x['strs']
    if any(v is not None and v <= 15 and s[n[i]] in tn for i, v in enumerate(k)): near.add(os.path.basename(f)[:2])
c['places within 15 km of an intermodal hub in 35+ countries, 15+ outside Europe (%d)' % len(near)] = len(near) >= 35 and len(near - EU) >= 15
js = r"""const E=require('./src/engine.js');const fs=require('fs');const H=require('./src/data.js');const hy=H.hydrate||H.NestData.hydrate;
const m=JSON.parse(fs.readFileSync('data/meta.json'));const ok=[];for(const cc of ['US','CN','DE']){const recs=hy(JSON.parse(fs.readFileSync('data/c/'+cc+'.json')),JSON.parse(fs.readFileSync('data/x/'+cc+'.json')),m);ok.push(recs.length)}console.log(JSON.stringify(ok))"""
# engine: freight takes the hub, the port must-have takes only sea and waterway ports
src = open(os.path.join(ROOT, 'src/engine.js')).read()
c['engine: freight uses the nearest hub, port must-haves use sea and waterway ports only'] = 'var pkm = seaOrWaterKm(r)' in src and 'anyport_km: function (r) { return seaOrWaterKm(r); }' in src and 'pk = portKm(xx)' in src
c['place card names the hub type'] = 'Inland port or intermodal terminal' in open(os.path.join(ROOT, 'src/more/more.js')).read()
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('INTERMODAL TEST:', 'PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
