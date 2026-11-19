#!/usr/bin/env python3
"""2.15.30-r8 (owner: multimodal access was missing outside Europe). Recomputes only iport_km / iport in data/x/{CC}.json:
the nearest key inland port (build/source/inland_ports.json) OR intermodal terminal / dry port (data/facilities.json, kind
'terminal': AGTC list plus the worldwide compilation, each placed at its town from Nestlyzer's own place index).
Every other column stays byte-identical. Same distance rule and rounding as build_reach.py.
    python3 build/add_intermodal_reach.py"""
import json, os
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = [tuple(r[:4]) for r in json.load(open(os.path.join(ROOT, 'build/source/inland_ports.json')))['rows']]
T = [(i['name'], i['cc'], i['lat'], i['lon']) for i in json.load(open(os.path.join(ROOT, 'data/facilities.json')))['items'] if i['kind'] == 'terminal']
def hav(la1, lo1, la2, lo2):
    la1, lo1, la2, lo2 = map(np.radians, (la1, lo1, la2, lo2))
    a = np.sin((la2 - la1) / 2) ** 2 + np.cos(la1) * np.cos(la2) * np.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371.0 * np.arcsin(np.sqrt(np.minimum(1, a)))
# a terminal within 5 km of a listed inland port is the same hub: keep the port's name
ALL = P + [t for t in T if not any(hav(t[2], t[3], p[2], p[3]) < 5 for p in P)]
pla, plo = np.array([p[2] for p in ALL]), np.array([p[3] for p in ALL]); names = [p[0] for p in ALL]
meta = json.load(open(os.path.join(ROOT, 'data/meta.json'))); changed = 0
for c in meta['countries']:
    px = os.path.join(ROOT, 'data/x', c['cc'] + '.json')
    if not os.path.exists(px): continue
    d = json.load(open(os.path.join(ROOT, 'data/c', c['cc'] + '.json'))); C = d['cols']; iLa, iLo = C.index('lat'), C.index('lon')
    x = json.load(open(px)); cols, strs = x['cols'], x['strs']
    if 'iport_km' not in cols or len(cols['iport_km']) != len(d['rows']): raise SystemExit('row mismatch ' + c['cc'])
    km, nm = [], []
    for r in d['rows']:
        la, lo = r[iLa], r[iLo]
        if la is None or lo is None: km.append(None); nm.append(None); continue
        dd = hav(float(la), float(lo), pla, plo); j = int(dd.argmin()); km.append(round(float(dd[j])) if dd[j] >= 10 else round(float(dd[j]), 1))
        if names[j] not in strs: strs.append(names[j])
        nm.append(strs.index(names[j]))
    if km != cols['iport_km'] or nm != cols['iport']:
        cols['iport_km'], cols['iport'] = km, nm; changed += 1
        json.dump(x, open(px, 'w'), separators=(',', ':'), ensure_ascii=False)
print('hubs', len(ALL), '(inland ports', len(P), '+ terminals', len(ALL) - len(P), ') countries changed', changed)
