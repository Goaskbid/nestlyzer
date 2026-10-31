#!/usr/bin/env python3
"""Map anchors (2.10.1): coordinates for the pins drawn around an open place (nearest hub airport, seaport, university
town, big city). Airports come from OurAirports (public domain) for every airport name the place data refers to; seaports
from Natural Earth 1:10m ports (public domain), the same layer port_km is measured from. Writes data/anchors.json.
    python3 build/build_anchors.py"""
import glob, json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORTS_SRC = os.path.join(ROOT, 'build', 'source', 'ports_ne10m.json')
NE = '/home/claude/ext/ne/ne_10m_ports.geojson'
if not os.path.exists(PORTS_SRC) and os.path.exists(NE):   # keep a small public-domain copy with the sources
    fc = json.load(open(NE))
    rows = [[f['properties'].get('name') or '', round(f['geometry']['coordinates'][1], 4), round(f['geometry']['coordinates'][0], 4)] for f in fc['features'] if f.get('geometry')]
    json.dump({'source': 'Natural Earth 1:10m ports (public domain), naturalearthdata.com', 'rows': rows}, open(PORTS_SRC, 'w'), separators=(',', ':'), ensure_ascii=False)
air = {}
for r in json.load(open(os.path.join(ROOT, 'build', 'source', 'airports_world.json')))['rows']: air.setdefault('%s (%s)' % (r[2], r[1]), [round(r[4], 4), round(r[5], 4)])
used = set()
for f in glob.glob(os.path.join(ROOT, 'data', 'c', '*.json')):
    for s in json.load(open(f)).get('strs', []):
        if re.search(r'\([A-Z0-9]{3}\)$', s): used.add(s)
out = {'airports': {n: air[n] for n in sorted(used) if n in air}, 'ports': json.load(open(PORTS_SRC))['rows'],
       'iports': [[n, la, lo] for n, cc, la, lo in json.load(open(os.path.join(ROOT, 'build', 'source', 'inland_ports.json')))['rows']],
       'chem': [[n, la, lo] for n, cc, la, lo in json.load(open(os.path.join(ROOT, 'build', 'source', 'chem_parks.json')))['rows']],
       'fin': [[n, la, lo, t, rl] for n, cc, la, lo, t, rl, *_ in json.load(open(os.path.join(ROOT, 'build', 'source', 'finance_centres.json')))['rows']]}   # financial centres (2.12)
# universities and research institutions (ROR, CC0) live in their own file, loaded only for profiles that show them
ror = json.load(open(os.path.join(ROOT, 'build', 'source', 'ror_anchors.json')))
json.dump({'uni': [r[:1] + r[2:5] for r in ror['universities']], 'res': [r[:1] + r[2:5] for r in ror['research']]}, open(os.path.join(ROOT, 'data', 'anchors_ror.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
json.dump(out, open(os.path.join(ROOT, 'data', 'anchors.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
print('anchors: airports', len(out['airports']), 'ports', len(out['ports']), os.path.getsize(os.path.join(ROOT, 'data', 'anchors.json')) // 1024, 'KB')
