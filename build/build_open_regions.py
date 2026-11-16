"""Open region outlines for the European map (2.15.29), replacing the Eurostat GISCO NUTS file.

GISCO geodata may not be used commercially without a EuroGeographics licence. This step draws the region layer
from open material only:
- country borders and coastline: Natural Earth 1:10m admin-0 (public domain), via the world-atlas package;
- regions: every place gets the area closer to it than to any other place (a Voronoi cell), clipped to its country;
  the cells of all places sharing a NUTS 3 code are merged into that region. NUTS codes and names are Eurostat's
  statistical classification (reusable), not GISCO geometry.
The result keeps the old file's object names and ids (nutsrg: id = NUTS 3 code, na = name; cntrg: id = country code),
so the map code is unchanged. Borders are approximate where two regions meet inland; coastlines and national borders
are Natural Earth's.
    python3 build/build_open_regions.py   (needs: npx topojson-server, topojson-simplify; writes data/geo/nuts3.topo.json)
"""
import json, os, subprocess, sys, tempfile
import pycountry
from shapely.geometry import shape, mapping, MultiPoint, Point
from shapely.ops import voronoi_diagram, unary_union
from shapely.validation import make_valid

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD = os.path.join(R, 'data', 'geo', 'nuts3.topo.json')
NE = os.path.join(R, 'build', 'source', 'natural_earth', 'countries-10m.json')
NAMES = os.path.join(R, 'build', 'source', 'nuts3_names.json')   # code -> name, kept from the classification

def topo_features(t, obj):
    tr = t.get('transform'); sx, sy = tr['scale'] if tr else (1, 1); tx, ty = tr['translate'] if tr else (0, 0)
    arcs = []
    for a in t['arcs']:
        x = y = 0; pts = []
        for p in a:
            if tr: x += p[0]; y += p[1]; pts.append((x * sx + tx, y * sy + ty))
            else: pts.append(tuple(p))
        arcs.append(pts)
    def ring(ix):
        out = []
        for i in ix:
            seg = arcs[i] if i >= 0 else arcs[~i][::-1]
            out.extend(seg if not out else seg[1:])
        return out
    feats = []
    for g in t['objects'][obj]['geometries']:
        polys = [g['arcs']] if g['type'] == 'Polygon' else g['arcs'] if g['type'] == 'MultiPolygon' else []
        polys = [[ring(r) for r in p] for p in polys]
        polys = [[r for r in p if len(r) >= 4] for p in polys]
        polys = [p for p in polys if p and len(p[0]) >= 4]
        if not polys: continue
        geom = {'type': 'MultiPolygon', 'coordinates': polys}
        feats.append((g.get('id'), g.get('properties') or {}, make_valid(shape(geom))))
    return feats

def a2(num, name):
    if name == 'Kosovo': return 'XK'
    try: return pycountry.countries.get(numeric=str(num).zfill(3)).alpha_2
    except Exception: return None

old = json.load(open(OLD))
if 'nutsrg' in old['objects'] and not old.get('open'):   # first run: keep the classification names, drop the geometry
    json.dump({g['properties']['id']: g['properties']['na'] for g in old['objects']['nutsrg']['geometries']}, open(NAMES, 'w'), ensure_ascii=False, indent=0)
    keep_cntr = [g['properties']['id'] for g in old['objects']['cntrg']['geometries']]
    json.dump(keep_cntr, open(NAMES.replace('nuts3_names', 'map_countries'), 'w'))
names = json.load(open(NAMES)); keep_cntr = json.load(open(NAMES.replace('nuts3_names', 'map_countries')))
ne = {}
for i, p, g in topo_features(json.load(open(NE)), 'countries'):
    c = a2(i, p.get('name'))
    if c: ne[c] = (p.get('name'), g)
ALIAS = {'EL': 'GR', 'UK': 'GB'}
regions, countries = [], []
for cc in keep_cntr:
    k = ALIAS.get(cc, cc)
    if k in ne: countries.append({'type': 'Feature', 'properties': {'id': cc, 'na': ne[k][0]}, 'geometry': mapping(ne[k][1])})
prefixes = sorted({c[:2] for c in names})
made = {}
for pre in prefixes:
    sp = os.path.join(R, 'data', 'c', ('UK' if pre == 'UK' else pre) + '.json')
    k = ALIAS.get(pre, pre)
    if not os.path.exists(sp) or k not in ne: continue
    sh = json.load(open(sp)); C = {c: i for i, c in enumerate(sh['cols'])}
    pts = {}
    for r in sh['rows']:
        if 'sup' in C and r[C['sup']]: continue
        n3, lat, lon = r[C['n3']], r[C['lat']], r[C['lon']]
        if not n3 or lat is None or lon is None or str(n3)[:2] != pre: continue
        pts.setdefault((round(lon, 5), round(lat, 5)), n3)
    if len(pts) < 2: continue
    land = ne[k][1]
    keys = list(pts)
    import shapely; cells = shapely.voronoi_polygons(MultiPoint(keys), extend_to=land.envelope.buffer(2), ordered=True)
    by = {}
    for (xy, cell) in zip(keys, cells.geoms):
        by.setdefault(pts[xy], []).append(cell)
    for code, cs in by.items():
        g = make_valid(unary_union(cs).intersection(land))
        if g.is_empty: continue
        made[code] = g
for code, g in sorted(made.items()):
    regions.append({'type': 'Feature', 'properties': {'id': code, 'na': names.get(code, code)}, 'geometry': mapping(g)})
tmp = tempfile.mkdtemp()
json.dump({'type': 'FeatureCollection', 'features': regions}, open(os.path.join(tmp, 'r.json'), 'w'))
json.dump({'type': 'FeatureCollection', 'features': countries}, open(os.path.join(tmp, 'c.json'), 'w'))
BIN = os.environ.get('TOPOBIN', '')
run = lambda cmd: subprocess.run(cmd, shell=True, check=True, cwd=tmp)
run(f'{BIN}geo2topo -q 1e5 nutsrg=r.json cntrg=c.json > t.json')
run(f'{BIN}toposimplify -s 4e-7 -f < t.json > s.json')
t = json.load(open(os.path.join(tmp, 's.json')))
for o in t['objects'].values():   # ids live in properties, as before
    for g in o['geometries']: g.pop('id', None)
t['open'] = 'Natural Earth 1:10m (public domain) borders; regions drawn from Nestlyzer place locations; NUTS codes and names: Eurostat classification'
json.dump(t, open(OLD, 'w'), separators=(',', ':'), ensure_ascii=False)
print(f'open regions: {len(regions)} regions in {len({c[:2] for c in made})} countries, {len(countries)} country shapes, {os.path.getsize(OLD) // 1024} KB')
