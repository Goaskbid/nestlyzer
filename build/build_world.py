#!/usr/bin/env python3
"""Nestlyzer data for the countries outside Europe: USA, Canada, Japan, South Korea, Taiwan, Hong Kong, Singapore,
Australia, New Zealand and Israel. Run after build_data.py and build_extra.py:

    python3 build/build_world.py

Places: GeoNames populated places with at least 500 residents (build/source/world_places.json.gz, see
build/world_extract.py). GeoNames lists some big cities twice: once as the whole city and again as its wards or
boroughs (Tokyo and its special wards, New York and its boroughs). Such a whole-city entry (its districts within
15 km are at most a third of its size and together hold half of it) stays in the list, so "Tokyo" can be found and
ranked, but it is left out of every sum of residents (residents within 10 and 30 km), so nobody is counted twice.
City sections (GeoNames feature code PPLX) and repeats are left out.

Regions: Natural Earth admin-1 (states, provinces, prefectures), with local names. Distances are measured in a
Lambert azimuthal equal-area projection centred on each country (or part of it), accurate to a few per cent.

Writes data/c/{CC}.json, data/x/{CC}.json, data/geo/w/{CC}.json (region outlines) and adds the countries to data/meta.json and
data/search.json. Nothing here invents a score input: the scored factors are population scale and the same
geographic measures Europe uses; land area, density and growth are not available for these places.
"""
import gzip, json, math, os, re, sys, unicodedata, collections, difflib
import numpy as np
from scipy.spatial import cKDTree
import shapely
from shapely.geometry import shape, Point, LineString, MultiLineString
from shapely.ops import transform
from shapely.strtree import STRtree

sys.path.insert(0, os.path.dirname(__file__))
from geo_util import ne_path, haversine_km

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', 'source')
OUT = os.path.join(ROOT, 'data')
R_KM = 6371.0088

WORLD = ['US', 'CA', 'JP', 'KR', 'TW', 'HK', 'SG', 'AU', 'NZ', 'IL', 'BR', 'MX', 'MY', 'ID', 'MA', 'ZA', 'IN', 'CN', 'AE']   # 2.12: nine new countries (owner request: BRICS and the world-expansion screen)
A3 = {'US': 'USA', 'CA': 'CAN', 'JP': 'JPN', 'KR': 'KOR', 'TW': 'TWN', 'HK': 'HKG', 'SG': 'SGP', 'AU': 'AUS', 'NZ': 'NZL', 'IL': 'ISR', 'BR': 'BRA', 'MX': 'MEX', 'MY': 'MYS', 'ID': 'IDN', 'MA': 'MAR', 'ZA': 'ZAF', 'IN': 'IND', 'CN': 'CHN', 'AE': 'ARE'}
NAMES = {'US': 'United States', 'CA': 'Canada', 'JP': 'Japan', 'KR': 'South Korea', 'TW': 'Taiwan', 'HK': 'Hong Kong', 'SG': 'Singapore', 'AU': 'Australia', 'NZ': 'New Zealand', 'IL': 'Israel', 'BR': 'Brazil', 'MX': 'Mexico', 'MY': 'Malaysia', 'ID': 'Indonesia', 'MA': 'Morocco', 'ZA': 'South Africa', 'IN': 'India', 'CN': 'China', 'AE': 'United Arab Emirates'}
NATIVE_COUNTRY = {'JP': '日本', 'KR': '대한민국', 'TW': '臺灣', 'HK': '香港', 'IL': 'ישראל'}
# projection centres (lon, lat); the United States uses three: lower 48, Alaska, Hawaii
ZONES = {'US': [(-98.0, 39.0), (-150.0, 62.0), (-157.0, 20.5)], 'CA': [(-96.0, 56.0)], 'JP': [(137.0, 37.0)], 'KR': [(127.8, 36.4)], 'TW': [(121.0, 23.7)],
         'HK': [(114.15, 22.35)], 'SG': [(103.82, 1.35)], 'AU': [(134.0, -26.0)], 'NZ': [(172.5, -41.5)], 'IL': [(35.0, 31.5)],
         'BR': [(-52.0, -14.0)], 'MX': [(-102.0, 23.5)], 'MY': [(102.5, 4.0), (114.5, 3.5)], 'ID': [(118.0, -2.5)], 'MA': [(-7.0, 31.5)], 'ZA': [(25.0, -29.0)],
         'IN': [(80.0, 22.0)], 'CN': [(104.0, 35.0)], 'AE': [(54.3, 24.2)]}
# Hong Kong district names in traditional Chinese (Natural Earth's are unreliable)
HK18 = {'Central and Western': '中西區', 'Wan Chai': '灣仔區', 'Eastern': '東區', 'Southern': '南區', 'Yau Tsim Mong': '油尖旺區', 'Sham Shui Po': '深水埗區',
        'Kowloon City': '九龍城區', 'Wong Tai Sin': '黃大仙區', 'Kwun Tong': '觀塘區', 'Kwai Tsing': '葵青區', 'Tsuen Wan': '荃灣區', 'Tuen Mun': '屯門區',
        'Yuen Long': '元朗區', 'North': '北區', 'Tai Po': '大埔區', 'Sha Tin': '沙田區', 'Sai Kung': '西貢區', 'Islands': '離島區'}
MINPOP = {'CN': 15000, 'IN': 15000, 'ID': 15000, 'MX': 15000, 'BR': 15000, 'MY': 5000, 'ZA': 5000, 'MA': 5000, 'AE': 2000}
TERRITORY = {('HK', 'Hong Kong'), ('SG', 'Singapore')}   # the whole territory is the country itself
UMBRELLA = {('HK', 'New Territories'), ('HK', 'Kowloon'), ('HK', 'Hong Kong Island'), ('HK', 'Victoria')}
REGION_LOCAL = {'JP': 'name_ja', 'KR': 'name_ko', 'TW': 'name_zht', 'IL': 'name_he'}


def r2(x, n=2):
    if x is None: return None
    x = float(x)
    if math.isnan(x) or math.isinf(x): return None
    return round(x, n)


def laea_c(lon, lat, lon0, lat0):
    lon = np.radians(np.asarray(lon, float)); lat = np.radians(np.asarray(lat, float))
    l0, p0 = math.radians(lon0), math.radians(lat0)
    k = np.sqrt(2.0 / (1.0 + math.sin(p0) * np.sin(lat) + math.cos(p0) * np.cos(lat) * np.cos(lon - l0)))
    return R_KM * k * np.cos(lat) * np.sin(lon - l0), R_KM * k * (math.cos(p0) * np.sin(lat) - math.sin(p0) * np.cos(lat) * np.cos(lon - l0))


def zone_of(cc, lon, lat):
    z = ZONES[cc]
    if len(z) == 1: return 0
    d = [haversine_km(lat, lon, b, a) for a, b in z]
    return int(np.argmin(d))


def ne(name):
    return json.load(open(ne_path(name)))


def fold(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


# ---------------------------------------------------------------- places
W = json.load(gzip.open(os.path.join(SRC, 'world_places.json.gz'), 'rt', encoding='utf-8'))
raw = [dict(zip(['cc', 'gid', 'name', 'lat', 'lon', 'pop', 'a1', 'fc', 'native', 'tz'], r)) for r in W['rows']]
print('GeoNames places', len(raw))
# roster repair 2.8: GeoNames homonyms that stood in for Tokyo wards (build/source/roster/roster_fixes.csv, decision c)
_rf = os.path.join(SRC, 'roster', 'roster_fixes.csv')
if os.path.exists(_rf):
    import csv as _csv
    _fx = {x['oid']: x for x in _csv.DictReader(open(_rf, encoding='utf-8')) if x['decision'] == 'c' and x['cc'] not in ('EL',) and x['lat']}
    _NATIVE = {'11209896': '江東', '11790632': '文京', '11836117': '杉並', '1852139': '品川'}
    for r in raw:
        x = _fx.get(str(r['gid']))
        if x and x['cc'] == r['cc']:
            r['lat'], r['lon'] = float(x['lat']), float(x['lon'])
            if str(r['gid']) in _NATIVE: r['native'] = _NATIVE[str(r['gid'])]
            if str(r['gid']) == '11209896': r['name'] = 'Kōtō'
    print('roster repair: world points corrected', sum(1 for r in raw if str(r['gid']) in _fx))

def deoverlap(rows):
    """Remove double counting: city sections, whole-city entries that also have their districts listed, and repeats."""
    why = collections.Counter(section=sum(1 for r in rows if r['fc'] == 'PPLX'))
    # 2.12: in the very large new countries GeoNames lists thousands of urban villages and metro sub-localities
    # (Delhi, Beijing, Mexico City); there the towns and cities of 15,000+ are the meaningful local units
    rows = [r for r in rows if r['fc'] != 'PPLX' and r['pop'] >= MINPOP.get(r['cc'], 500)]
    drop, whole = set(), set()
    by_cc = collections.defaultdict(list)
    for i, r in enumerate(rows): by_cc[r['cc']].append(i)
    for cc, ids in by_cc.items():
        lon0, lat0 = ZONES[cc][0]
        x, y = laea_c([rows[i]['lon'] for i in ids], [rows[i]['lat'] for i in ids], lon0, lat0)
        P = np.c_[x, y]; t = cKDTree(P)
        pops = np.array([rows[i]['pop'] for i in ids], float)
        # whole-city entries
        for k, i in enumerate(ids):
            if pops[k] < 300000: continue
            nb = [j for j in t.query_ball_point(P[k], 15.0) if j != k and 20000 <= pops[j] < pops[k]]
            # a whole-city entry: its districts are clearly smaller (a third at most) and together hold half of it
            if nb and pops[nb].max() <= pops[k] / 3 and pops[nb].sum() >= 0.5 * pops[k]: whole.add(i); why['whole city, kept but not counted twice'] += 1
        # Hong Kong and Singapore: the territory itself and its large historic areas overlap every district
        for k, i in enumerate(ids):
            if (cc, rows[i]['name']) in TERRITORY: drop.add(i); why['territory'] += 1
            elif (cc, rows[i]['name']) in UMBRELLA: whole.add(i); why['whole city, kept but not counted twice'] += 1
        # the same place twice (same population within 5 km), e.g. "Bedok New Town" and "Ulu Bedok"
        for k, i in enumerate(ids):
            if i in drop: continue
            for j in t.query_ball_point(P[k], 5.0):
                if j <= k or ids[j] in drop: continue
                if abs(pops[j] - pops[k]) <= 0.01 * max(pops[k], 1): drop.add(ids[j]); why['repeat'] += 1
        # unclassified points inside a kept big city (neighbourhood names without their own feature code)
        for k, i in enumerate(ids):
            if i in drop or i in whole or pops[k] < 300000: continue
            rad = 0.5 * math.sqrt(pops[k] / (math.pi * 2500.0))
            for j in t.query_ball_point(P[k], rad):
                if j != k and not rows[ids[j]]['fc'] and pops[j] < pops[k] / 10 and ids[j] not in drop: drop.add(ids[j]); why['inside a city'] += 1
    for i in whole: rows[i]['whole'] = True
    kept = [r for i, r in enumerate(rows) if i not in drop]
    print('removed:', dict(why))
    return kept, len(rows) - len(kept)

places, ndrop = deoverlap(raw)
print('after de-overlap', len(places), 'removed', ndrop, collections.Counter(r['cc'] for r in places))

# ---------------------------------------------------------------- regions (Natural Earth admin-1)
adm = [f for f in ne('ne_10m_admin_1_states_provinces')['features'] if f['properties'].get('adm0_a3') in A3.values() and f.get('geometry')]
reg = {cc: [] for cc in WORLD}
for f in adm:
    p = f['properties']; cc = [k for k, v in A3.items() if v == p['adm0_a3']][0]
    en = (p.get('name_en') or p.get('name') or '').replace('‎', '').strip()
    loc = HK18.get(p.get('name'), '') if cc == 'HK' else (p.get(REGION_LOCAL[cc]) or '') if cc in REGION_LOCAL else ''
    if cc == 'JP' and en.endswith(' Prefecture'): en = en[:-11]
    reg[cc].append({'iso': p.get('iso_3166_2') or '', 'name': en, 'local': loc, 'geom': shape(f['geometry']), 'gn': p.get('gn_a1_code') or ''})
for cc in WORLD:
    reg[cc].sort(key=lambda g: (g['iso'], g['name']))
    for k, g in enumerate(reg[cc]):
        g['code'] = cc + '%02d' % k if k < 100 else cc + chr(55 + k // 10) + str(k % 10)
        g['code3'] = g['code'] + '0'
        g['label'] = g['name'] + (' (' + g['local'] + ')' if g['local'] and g['local'] != g['name'] else '')
    print(cc, 'regions', len(reg[cc]))
for cc in WORLD:
    tree = STRtree([g['geom'] for g in reg[cc]])
    ps = [r for r in places if r['cc'] == cc]
    pts = shapely.points([(r['lon'], r['lat']) for r in ps])
    hit = tree.query(pts, predicate='intersects')
    first = {}
    for a, b in zip(hit[0], hit[1]): first.setdefault(int(a), int(b))
    near = tree.query_nearest(pts, all_matches=False)
    nearest_of = {int(a): int(b) for a, b in zip(near[0], near[1])}
    # 2.12: GeoNames' own first-level code wins over the outline test, which misplaced towns on state lines
    # (Leawood, Kansas, sat in Missouri on the 1:10m outline); the outline is the fallback
    bygn = {g['gn']: g for g in reg[cc] if g['gn']}; fixed = 0
    for k, r in enumerate(ps):
        j = first.get(k, nearest_of.get(k))
        r['reg'] = reg[cc][j] if j is not None else None
        g = bygn.get(cc + '.' + str(r.get('a1') or '')) if r.get('a1') else None
        # only where the outline is in doubt: the point lies within about 4 km of its region's edge (state lines, coasts);
        # deep inside a region the outline stands (roster repairs carry no reliable GeoNames code)
        if g is not None and g is not r['reg'] and r['reg'] is not None and r['reg']['geom'].boundary.distance(shapely.Point(r['lon'], r['lat'])) < 0.04: r['reg'] = g; fixed += 1
    print(cc, 'region from GeoNames code instead of outline:', fixed)

# names: English (local script), and the region when the same name appears twice in a country
dup = collections.Counter((r['cc'], fold(r['name'])) for r in places)
for r in places:
    bits = []
    if r['native'] and r['native'] != r['name']: bits.append(r['native'])
    if dup[(r['cc'], fold(r['name']))] > 1 and r.get('reg'): bits.append(r['reg']['name'])
    r['label'] = r['name'] + (' (' + ', '.join(bits) + ')' if bits else '')
# still duplicate (same name, same region): add the population band so every label is unique
seen = collections.Counter((r['cc'], r['label']) for r in places)
for r in places:
    if seen[(r['cc'], r['label'])] > 1: r['label'] = r['label'][:-1] + ', ' + format(r['pop'], ',') + ' residents)' if r['label'].endswith(')') else r['label'] + ' (' + format(r['pop'], ',') + ' residents)'

# ---------------------------------------------------------------- geographic measures
air = json.load(open(os.path.join(SRC, 'airports_world.json')))['rows']
hub = [a for a in air if a[3] == 'large_airport']
neplaces = ne('ne_10m_populated_places_simple')['features']
ne_city = [(f['properties']['longitude'], f['properties']['latitude'], f['properties']['name'], f['properties'].get('pop_min') or 0, f['properties'].get('pop_max') or 0, f['properties'].get('adm0_a3'), f['properties'].get('featurecla') or '') for f in neplaces]
coast_lines = []
for f in ne('ne_10m_coastline')['features']:
    g = f['geometry']
    for part in ([g['coordinates']] if g['type'] == 'LineString' else g['coordinates']):
        coast_lines.append(part)


def lines_layer(names, keep=lambda p: True):
    out = []
    for n in names:
        for f in ne(n)['features']:
            if not f.get('geometry'): continue
            p = f['properties']
            if not keep(p): continue
            out.append((shape(f['geometry']), p))
    return out

LAKES = lines_layer(['ne_10m_lakes', 'ne_10m_lakes_north_america', 'ne_10m_lakes_australia'], lambda p: (p.get('featurecla') or '').startswith(('Lake', 'Reservoir')))
RIVERS = lines_layer(['ne_10m_rivers_lake_centerlines', 'ne_10m_rivers_north_america', 'ne_10m_rivers_australia'], lambda p: (p.get('featurecla') or '').startswith('River') and p.get('name'))
RAIL = lines_layer(['ne_10m_railroads'])
ROADS = lines_layer(['ne_10m_roads'], lambda p: str(p.get('expressway')) == '1')
PORTS = lines_layer(['ne_10m_ports'])
COUNTRIES = {f['properties'].get('ADM0_A3') or f['properties'].get('adm0_a3'): (shape(f['geometry']), f['properties'].get('NAME_EN') or f['properties'].get('NAME')) for f in ne('ne_10m_admin_0_countries')['features'] if f.get('geometry')}
REGIONS_POLY = [(f['properties'].get('NAME_EN') or f['properties'].get('NAME'), shape(f['geometry']), f['properties'].get('FEATURECLA')) for f in ne('ne_10m_geography_regions_polys')['features'] if f.get('geometry') and f['properties'].get('FEATURECLA') in {'Range/mtn', 'Coast', 'Geoarea', 'Delta', 'Plain', 'Plateau', 'Island', 'Island group'}]
MARINE = lines_layer(['ne_10m_geography_marine_polys'], lambda p: p.get('featurecla') not in ('river', 'reef') and p.get('name'))
LAND_SKIP = {'North America', 'Asia', 'Australia', 'Oceania', 'Great Plains', 'Canadian Shield', 'Honshu', 'Indochina', 'Middle East', 'Levant', 'Arabian Peninsula', 'Korean Peninsula', 'South Island', 'North Island', 'Coast Mountains'}

import h5py, pvlib
from kgcpy import lookupCZ
from pvlib.location import _degrees_to_index
ALT = h5py.File(os.path.join(os.path.dirname(pvlib.__file__), 'data', 'Altitude.h5'), 'r')['Altitude'][:].astype(float)
ALT[ALT == 255] = np.nan; ALT = ALT * 28 - 450


def clamp(x, lo=0.0, hi=100.0): return max(lo, min(hi, x))
def lin(d, best, worst): return clamp(100.0 * (worst - d) / (worst - best))
CONST = json.load(open(os.path.join(SRC, 'legacy_constants.json')))
F = CONST['V63_ACCESS_FORMULA']
def access_score(kind, dist, p):
    f = F[kind]
    s = f['base'] - dist * f['slope']
    s += 7 if p >= 50000 else 4 if p >= 20000 else (-18 if p < 2500 else 0)
    if dist > f['farPenalty']['over_km']: s -= f['farPenalty']['minus']
    return max(0.0, min(100.0, s))

meta = json.load(open(os.path.join(OUT, 'meta.json')))
search = json.load(open(os.path.join(OUT, 'search.json')))
search['rows'] = [r for r in search['rows'] if r[0] not in WORLD]
search['regions'] = [r for r in search['regions'] if r[0] not in WORLD]
meta['countries'] = [c for c in meta['countries'] if c['cc'] not in WORLD]
geo_features = []
twin_feats = []   # for look-alikes across the new countries
all_rows = {}

for cc in WORLD:
    ps = [r for r in places if r['cc'] == cc]
    ps.sort(key=lambda r: (-r['pop'], r['gid']))
    n = len(ps)
    lon = np.array([r['lon'] for r in ps]); lat = np.array([r['lat'] for r in ps]); pop = np.array([r['pop'] for r in ps], float)
    zone = np.array([zone_of(cc, r['lon'], r['lat']) for r in ps])
    res = {k: np.full(n, np.nan) for k in ['hub', 'any', 'city', 'catch', 'coast', 'com', 'stu', 'lake', 'river', 'rail', 'mway', 'port', 'cap', 'border', 'nb10', 'pop10', 'metro', 'alt', 'relief']}
    names = {k: [None] * n for k in ['hub', 'any', 'com', 'stu', 'lake', 'river', 'port', 'border', 'metro', 'land', 'sea']}
    cities_cc = []
    for z, (lon0, lat0) in enumerate(ZONES[cc]):
        m = np.where(zone == z)[0]
        if not len(m): continue
        X, Y = laea_c(lon[m], lat[m], lon0, lat0); P = np.c_[X, Y]
        proj = lambda g: transform(lambda x, y, zz=None: laea_c(x, y, lon0, lat0), g)
        bb = (lon[m].min() - 6, lat[m].min() - 6, lon[m].max() + 6, lat[m].max() + 6)
        inb = lambda a, b: bb[0] <= a <= bb[2] and bb[1] <= b <= bb[3]
        def kd(rows, lo, la):
            sel = [r for r in rows if inb(r[lo], r[la])] or rows
            ax, ay = laea_c([r[lo] for r in sel], [r[la] for r in sel], lon0, lat0)
            return sel, cKDTree(np.c_[ax, ay])
        hs, ht = kd(hub, 5, 4); d, i = ht.query(P)
        res['hub'][m] = d
        for k2, j in zip(m, i): names['hub'][k2] = hs[j][2] + (' (' + hs[j][1] + ')' if hs[j][1] else '')
        as_, at = kd(air, 5, 4); d, i = at.query(P)
        res['any'][m] = d
        for k2, j in zip(m, i): names['any'][k2] = as_[j][2] + (' (' + as_[j][1] + ')' if as_[j][1] else '')
        # cities of 100,000+: own places plus Natural Earth city points (whole cities that GeoNames splits into districts)
        own = [(lon[k2], lat[k2]) for k2 in m if pop[k2] >= 100000]
        nec = [(c[0], c[1]) for c in ne_city if c[3] >= 100000 and inb(c[0], c[1])]
        cpts = own + nec
        if cpts:
            cx, cy = laea_c([c[0] for c in cpts], [c[1] for c in cpts], lon0, lat0); ct = cKDTree(np.c_[cx, cy])
            dd, _ = ct.query(P, k=2)
            for q, k2 in enumerate(m):
                res['city'][k2] = 0.0 if pop[k2] >= 100000 else dd[q][0]
        # residents within 30 km and 10 km, neighbours within 10 km (own places)
        part = np.array([not ps[k2].get('whole') for k2 in m])   # whole-city entries are not added to sums
        t = cKDTree(P[part]); pm = pop[m][part]
        for q, k2 in enumerate(m):
            nb30 = t.query_ball_point(P[q], 30.0); nb10 = t.query_ball_point(P[q], 10.0)
            res['catch'][k2] = max(pm[nb30].sum(), pop[k2]); res['pop10'][k2] = max(pm[nb10].sum(), pop[k2]); res['nb10'][k2] = len(nb10) - (1 if part[q] else 0)
        # commuter and student anchors: cities of 100,000+ (commuter) and of 250,000+ (student; universities cluster there)
        for kind, minp, key in (('commuter', 100000, 'com'), ('student', 250000, 'stu')):
            anc = [(lon[k2], lat[k2], ps[k2]['name']) for k2 in m if pop[k2] >= minp] + [(c[0], c[1], c[2]) for c in ne_city if (c[3] if kind == 'commuter' else c[4]) >= minp and inb(c[0], c[1])]
            if not anc: continue
            axx, ayy = laea_c([a[0] for a in anc], [a[1] for a in anc], lon0, lat0); atr = cKDTree(np.c_[axx, ayy])
            dd, ii = atr.query(P)
            for q, k2 in enumerate(m):
                res[key][k2] = dd[q]; names[key][k2] = anc[ii[q]][2]
        # coast
        segs = []
        for part in coast_lines:
            pp = [(a, b) for a, b in part if inb(a, b)]
            if len(pp) < 2: continue
            xs, ys = laea_c([a for a, b in pp], [b for a, b in pp], lon0, lat0); co = list(zip(xs, ys))
            for s0 in range(0, len(co) - 1, 25):
                sg = co[s0:s0 + 26]
                if len(sg) >= 2: segs.append(LineString(sg))
        pts = shapely.points(P)
        if segs:
            st = STRtree(segs); ni = st.query_nearest(pts, all_matches=False)
            res['coast'][m[ni[0]]] = shapely.distance(pts[ni[0]], np.array(segs, dtype=object)[ni[1]])
        # lakes, rivers, railways, motorways, ports (Natural Earth), with names
        for key, lay, nk in (('lake', LAKES, 'lake'), ('river', RIVERS, 'river'), ('rail', RAIL, None), ('mway', ROADS, None), ('port', PORTS, 'port')):
            gs, pr = [], []
            for g, p in lay:
                b = g.bounds
                if b[2] < bb[0] or b[0] > bb[2] or b[3] < bb[1] or b[1] > bb[3]: continue
                gs.append(proj(g)); pr.append(p)
            if not gs: continue
            st = STRtree(gs); idx, dist = st.query_nearest(pts, return_distance=True, all_matches=False)
            for a, b, dv in zip(idx[0], idx[1], dist):
                res[key][m[a]] = dv
                if nk: names[nk][m[a]] = pr[b].get('name')
        # land borders
        own_c = COUNTRIES.get(A3[cc] if cc != 'HK' else 'HKG')
        if own_c:
            og = own_c[0]
            nbrs = [(k3, v) for k3, v in COUNTRIES.items() if k3 != (A3[cc]) and v[0].intersects(og.buffer(0.05))]
            ls, owners = [], []
            for k3, v in nbrs:
                seg = og.boundary.intersection(v[0].buffer(0.02))
                if seg.is_empty: continue
                ls.append(proj(seg)); owners.append(v[1])
            if ls:
                st = STRtree(ls); idx, dist = st.query_nearest(pts, return_distance=True, all_matches=False)
                for a, b, dv in zip(idx[0], idx[1], dist):
                    res['border'][m[a]] = dv; names['border'][m[a]] = owners[b]
    # capital (Natural Earth; Hong Kong has none of its own)
    cap = [c for c in ne_city if c[5] == A3[cc] and c[6].startswith('Admin-0 capital') and c[6] != 'Admin-0 capital alt']
    capname = re.sub(r'\s+', ' ', cap[0][2]) if cap else None
    if cap: res['cap'] = haversine_km(lat, lon, cap[0][1], cap[0][0])
    # greater areas: Natural Earth cores with 250,000+ in the metro, radius grows with size (as for Europe)
    cores = sorted([c for c in ne_city if c[5] == A3[cc] and c[4] >= 250000], key=lambda c: -c[4])
    keep = []
    for c in cores:
        if any(haversine_km(c[1], c[0], k[1], k[0]) < 12 for k in keep): continue
        keep.append(c)
    metro_pop = {}
    if keep:
        def xyz(la, lo):
            la, lo = np.radians(la), np.radians(lo)
            return np.c_[np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)] * R_KM
        mt = cKDTree(xyz(np.array([c[1] for c in keep]), np.array([c[0] for c in keep])))
        rads = np.array([min(60, max(20, 30 * (c[4] / 1e6) ** 0.3)) for c in keep])
        PX = xyz(lat, lon)
        for k2, cand in enumerate(mt.query_ball_point(PX, 60.0)):
            best, bs, bd = None, 9, None
            for c in cand:
                dkm = float(np.linalg.norm(PX[k2] - mt.data[c]))
                if dkm <= rads[c] and dkm / rads[c] < bs: best, bs, bd = keep[c], dkm / rads[c], dkm
            if best:
                res['metro'][k2] = bd; names['metro'][k2] = best[2]; metro_pop[best[2]] = best[4]
    # terrain, climate, landscape, sea
    kg = [None] * n
    for k2 in range(n):
        a, b = _degrees_to_index(lat[k2], 'latitude'), _degrees_to_index(lon[k2], 'longitude')
        w = ALT[max(a - 1, 0):a + 2, max(b - 1, 0):b + 2]
        if np.isfinite(ALT[a, b]): res['alt'][k2] = max(0.0, ALT[a, b])
        if np.isfinite(w).any(): res['relief'][k2] = np.nanmax(w) - np.nanmin(w)
        try: kg[k2] = lookupCZ(float(lat[k2]), float(lon[k2]))
        except Exception: pass
    rp = [(nm, g, fcl) for nm, g, fcl in REGIONS_POLY if nm not in LAND_SKIP and g.intersects(shapely.box(lon.min() - 1, lat.min() - 1, lon.max() + 1, lat.max() + 1))]
    if rp:
        rt = STRtree([g for _, g, _ in rp])
        ptsll = shapely.points(np.c_[lon, lat])
        hits = rt.query(ptsll, predicate='intersects')
        acc = collections.defaultdict(list)
        for a, b in zip(hits[0], hits[1]):
            nm, _, fcl = rp[b]
            if fcl in ('Range/mtn', 'Plateau') and not (np.isfinite(res['relief'][a]) and res['relief'][a] >= 450): continue
            acc[int(a)].append(nm)
        for a, v in acc.items(): names['land'][a] = ', '.join(sorted(set(v))[:2])
    mar = [(g, p) for g, p in MARINE if g.intersects(shapely.box(lon.min() - 3, lat.min() - 3, lon.max() + 3, lat.max() + 3))]
    if mar:
        mt = STRtree([g for g, _ in mar]); ptsll = shapely.points(np.c_[lon, lat]); ni = mt.query_nearest(ptsll, all_matches=False)
        for a, b in zip(ni[0], ni[1]):
            if np.isfinite(res['coast'][a]) and res['coast'][a] <= 40: names['sea'][a] = mar[b][1]['name']

    # ---- scores (same rules as Europe)
    lp = np.log10(np.maximum(pop, 1)); order = lp.argsort().argsort()
    lo, hi = np.percentile(lp, 2), np.percentile(lp, 98)
    scale = np.clip((lp - lo) / max(hi - lo, 1e-9), 0, 1) * 100
    fs = collections.OrderedDict((k, [None] * n) for k in ['common_population_scale', 'geo_hub_airport_km', 'geo_major_city_km', 'geo_catchment_30km', 'geo_coast_km', 'commuter_access_v2', 'student_access_v2'])
    fr = collections.OrderedDict((k, [None] * n) for k in ['geo_hub_airport_km', 'geo_airport_km', 'geo_major_city_km', 'geo_catchment_30km', 'geo_coast_km', 'commuter_anchor_km', 'student_anchor_km'])
    for k2 in range(n):
        fs['common_population_scale'][k2] = r2(scale[k2], 2)
        if np.isfinite(res['hub'][k2]): fs['geo_hub_airport_km'][k2] = r2(lin(res['hub'][k2], 20, 180), 1); fr['geo_hub_airport_km'][k2] = r2(res['hub'][k2], 1)
        if np.isfinite(res['any'][k2]): fr['geo_airport_km'][k2] = r2(res['any'][k2], 1)
        if np.isfinite(res['city'][k2]): fs['geo_major_city_km'][k2] = r2(lin(res['city'][k2], 5, 100), 1); fr['geo_major_city_km'][k2] = r2(res['city'][k2], 1)
        cv = res['catch'][k2]; fs['geo_catchment_30km'][k2] = r2(clamp(100 * (math.log10(max(cv, 1)) - math.log10(20000)) / (math.log10(3e6) - math.log10(20000))), 1); fr['geo_catchment_30km'][k2] = round(cv, -2)
        if np.isfinite(res['coast'][k2]): fs['geo_coast_km'][k2] = r2(lin(res['coast'][k2], 2, 60), 1); fr['geo_coast_km'][k2] = r2(res['coast'][k2], 1)
        if np.isfinite(res['com'][k2]): fs['commuter_access_v2'][k2] = r2(access_score('commuter', res['com'][k2], pop[k2]), 1); fr['commuter_anchor_km'][k2] = r2(res['com'][k2], 1)
        if np.isfinite(res['stu'][k2]): fs['student_access_v2'][k2] = r2(access_score('student', res['stu'][k2], pop[k2]), 1); fr['student_anchor_km'][k2] = r2(res['stu'][k2], 1)

    # ---- shard (same layout as Europe's)
    strs, sidx = [], {}
    def S(v):
        if v is None: return None
        if v not in sidx: sidx[v] = len(strs); strs.append(v)
        return sidx[v]
    rows = []
    for k2, r in enumerate(ps):
        g = r.get('reg')
        rows.append([str(r['gid']), r['label'], g['code'] if g else '', g['code3'] if g else '', int(r['pop']), None, None, r2(r['lat'], 5), r2(r['lon'], 5),
                     55.0, 7, 'basic', 4, '', S(g['label'] if g else ''), [S(names['hub'][k2]), S(names['any'][k2]), S(names['com'][k2]), S(names['stu'][k2])], 0])
    nuts = {}
    for g in reg[cc]:
        nuts[g['code']] = g['label']; nuts[g['code3']] = g['label']
    shard = {'cc': cc, 'name': NAMES[cc], 'v': meta['v'], 'n': n,
             'cols': ['oid', 'name', 'rc', 'n3', 'pop', 'area', 'dens', 'lat', 'lon', 'conf', 'nf', 'ready', 'loc', 'gisco', 'regionName', 'geoNames', 'sup'],
             'rows': rows, 'fs': fs, 'fr': {k: v for k, v in fr.items() if any(x is not None for x in v)}, 'strs': strs,
             'rawFallback': {'common_population_scale': 'pop'}, 'nuts': {k: v for k, v in nuts.items() if any(row[3] == k or row[3][:4] == k for row in rows)},
             'world': {'native': NATIVE_COUNTRY.get(cc), 'source': 'GeoNames', 'whole': [str(r['gid']) for r in ps if r.get('whole')]}}
    os.makedirs(os.path.join(OUT, 'c'), exist_ok=True)
    json.dump(shard, open(os.path.join(OUT, 'c', cc + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    # extra parameters (same columns as Europe, plus the time zone)
    xs, xidx = [], {}
    def XS(v):
        if v is None: return None
        if v not in xidx: xidx[v] = len(xs); xs.append(v)
        return xidx[v]
    rnd = {'alt': ('alt', 0), 'relief': ('relief', 0), 'lake_km': ('lake', 1), 'river_km': ('river', 1), 'rail_km': ('rail', 1), 'mway_km': ('mway', 1), 'port_km': ('port', 1),
           'cap_km': ('cap', 0), 'border_km': ('border', 1), 'nb10': ('nb10', 0), 'pop10': ('pop10', 0), 'metro_km': ('metro', 1)}
    cols = {}
    for key, (rk, nd) in rnd.items():
        cols[key] = [None if not np.isfinite(res[rk][k2]) else (int(round(res[rk][k2])) if nd == 0 else round(float(res[rk][k2]), nd)) for k2 in range(n)]
    cols['kg'] = [XS(v) for v in kg]
    for key in ('lake', 'river', 'port', 'border', 'metro', 'land', 'sea'): cols[key] = [XS(v) for v in names[key]]
    cols['tz'] = [XS(r['tz'] or None) for r in ps]
    cols['twin'] = [[] for _ in range(n)]
    mset = sorted({names['metro'][k2] for k2 in range(n) if names['metro'][k2]}, key=lambda mm: (-metro_pop.get(mm, 0), mm))
    xshard = {'cc': cc, 'n': n, 'cols': cols, 'strs': xs, 'capital': capname, 'metros': [[mm, metro_pop.get(mm), sum(1 for k2 in range(n) if names['metro'][k2] == mm), True] for mm in mset]}
    all_rows[cc] = (ps, xshard, res)
    for k2, r in enumerate(ps):
        twin_feats.append((cc, k2, math.log10(max(r['pop'], 1)) * 2.0, math.log1p(res['coast'][k2] if np.isfinite(res['coast'][k2]) else 200), math.log1p(max(res['alt'][k2], 0) if np.isfinite(res['alt'][k2]) else 200) * 0.8,
                           math.log1p(res['lake'][k2] if np.isfinite(res['lake'][k2]) else 100) * 0.6, math.log1p(res['pop10'][k2]) * 0.7))
    # country meta and search
    meta['countries'].append({'cc': cc, 'name': NAMES[cc], 'n': n, 'nAll': n, 'superseded': 0, 'depth': 'basic', 'located': n, 'pop': int(sum(r['pop'] for r in ps if not r.get('whole'))),
                              'bbox': [r2(lon.min(), 3), r2(lat.min(), 3), r2(lon.max(), 3), r2(lat.max(), 3)], 'world': True, 'native': NATIVE_COUNTRY.get(cc)})
    for k2, r in enumerate(ps): search['rows'].append([cc, str(r['gid']), r['label'], int(r['pop'])])
    cnt = collections.Counter(r['reg']['code'] for r in ps if r.get('reg'))
    for g in reg[cc]:
        if cnt[g['code']] > 1: search['regions'].append([cc, g['code'], g['label'], cnt[g['code']]])
    mcnt = collections.Counter(names['metro'][k2] for k2 in range(n) if names['metro'][k2])
    for mm, c in mcnt.items():
        if c >= 3: search['regions'].append([cc, 'M:' + mm, 'Greater ' + mm, c])
    # region outlines for the map (simplified, about 1 km)
    for g in reg[cc]:
        if not cnt[g['code']]: continue
        sg = g['geom'].simplify(0.01, preserve_topology=True)
        gj = json.loads(json.dumps(shapely.geometry.mapping(sg)))
        def rnd5(c):
            return [rnd5(x) for x in c] if isinstance(c[0], (list, tuple)) else [round(c[0], 3), round(c[1], 3)]
        gj['coordinates'] = rnd5(gj['coordinates'])
        geo_features.append({'type': 'Feature', 'properties': {'id': g['code3'], 'na': g['label'], 'cc': cc}, 'geometry': gj})
    print(cc, n, 'places,', int(sum(r['pop'] for r in ps if not r.get('whole'))), 'residents,', len(reg[cc]), 'regions; capital', capname)

# look-alikes among the new countries (one per other country), same idea as Europe
Fm = np.array([t[2:] for t in twin_feats], float); Fm = (Fm - Fm.mean(0)) / (Fm.std(0) + 1e-9)
kt = cKDTree(Fm); _, nn = kt.query(Fm, k=min(400, len(Fm)))
occ = [t[0] for t in twin_feats]
for row, t in enumerate(twin_feats):
    out, seenc = [], {t[0]}
    for j in nn[row][1:]:
        c2 = occ[j]
        if c2 in seenc: continue
        seenc.add(c2); out.append(c2 + ':' + str(all_rows[c2][0][twin_feats[j][1]]['gid']))
        if len(out) == 3: break
    all_rows[t[0]][1]['cols']['twin'][t[1]] = out
os.makedirs(os.path.join(OUT, 'x'), exist_ok=True)
for cc in WORLD:
    json.dump(all_rows[cc][1], open(os.path.join(OUT, 'x', cc + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

os.makedirs(os.path.join(OUT, 'geo', 'w'), exist_ok=True)
for cc in WORLD:   # one small outline file per country, loaded only when that country is opened
    json.dump({'type': 'FeatureCollection', 'features': [f for f in geo_features if f['properties']['cc'] == cc]}, open(os.path.join(OUT, 'geo', 'w', cc + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
_old = os.path.join(OUT, 'geo', 'world.geo.json')
if os.path.exists(_old): os.remove(_old)

# meta: sources, region level, names, depth
meta['sources']['geonames'] = {'name': 'GeoNames populated places (cities500)', 'publisher': 'GeoNames', 'url': 'https://www.geonames.org/', 'licence': 'CC BY 4.0',
                               'granularity': 'Towns, cities and city districts with 500+ residents', 'refresh': 'snapshot', 'period': 'GeoNames population figures, various years',
                               'note': 'Places, population and local names for the countries outside Europe.'}
meta['sources']['ne_admin1'] = {'name': 'Natural Earth admin-1 states and provinces', 'url': 'https://www.naturalearthdata.com/', 'licence': 'Public domain', 'note': 'States, provinces and prefectures outside Europe, with local names.'}
meta['sources']['ourairports'] = dict(meta['sources'].get('ourairports', {}), note='Large and medium airports with scheduled service, worldwide.')
cfg = meta['config']
cfg.setdefault('regionLevel', {}).update({cc: 'n2' for cc in WORLD})
cfg.setdefault('countryNames', {}).update({cc: NAMES[cc] for cc in WORLD})
cfg['worldCountries'] = WORLD
meta['countries'].sort(key=lambda c: c['cc'])
json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(search, open(os.path.join(OUT, 'search.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('world shards written; geo features', len(geo_features), 'MB', round(sum(os.path.getsize(os.path.join(OUT, 'geo', 'w', cc + '.json')) for cc in WORLD) / 1e6, 2))
for nm, cc in (('Tokyo', 'JP'), ('Shinjuku', 'JP'), ('Seoul', 'KR'), ('Brooklyn', 'US'), ('Los Angeles', 'US'), ('Sydney', 'AU'), ('Tel Aviv', 'IL'), ('Sha Tin', 'HK')):
    ps, xsh, res = all_rows[cc]
    for k2, r in enumerate(ps):
        if r['name'] == nm:
            print(nm, r['label'], r['pop'], r['reg']['label'] if r.get('reg') else None, {k: (round(float(v[k2]), 1) if np.isfinite(v[k2]) else None) for k, v in res.items() if k in ('hub', 'city', 'catch', 'coast', 'com', 'rail')})
            break
    else:
        print(nm, 'not kept (whole-city entry replaced by districts, or not listed)')
