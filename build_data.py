#!/usr/bin/env python3
"""Nestlyzer data build.

Reads the frozen legacy v86 data (the exact records the old site ranked on) plus open
geodata, and writes small per-country shards the new app loads on demand.

    python3 build/build_data.py            # writes data/ next to build/

Nothing here invents a score input. New factors are deterministic geographic measures
computed from public datasets (see METHOD below); every one is documented in meta.json.
"""
import csv, gzip, io, json, math, os, re, sys, unicodedata, collections, hashlib
import numpy as np
from scipy.spatial import cKDTree
import shapely
from shapely.geometry import Polygon, MultiPolygon, LineString, Point
from shapely.strtree import STRtree

sys.path.insert(0, os.path.dirname(__file__))
from geo_util import laea, haversine_km, topo_arcs, topo_geom_polys, ne_path
import lau_update

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'build', 'source')
OUT = os.path.join(ROOT, 'data')
DATA_VERSION = '2026.10.10'

def jload(name):
    p = os.path.join(SRC, name)
    if p.endswith('.gz'):
        with gzip.open(p, 'rt', encoding='utf-8') as f:
            return json.load(f)
    with open(p, encoding='utf-8') as f:
        return json.load(f)

def fold(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'\(.*?\)', ' ', s)
    s = re.sub(r',\s*(stadt|markt|gemeinde|kreisfreie stadt|st|landeshauptstadt|hansestadt).*$', '', s)
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

def slug(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-') or 'place'

def r2(x, n=2):
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return None
    return round(float(x), n)

# ---------------------------------------------------------------- load
records = jload('legacy_v86_records.json.gz')
appdata = jload('legacy_v86_appdata.json.gz')
const = jload('legacy_constants.json')
print('records', len(records))

centres = {}
with gzip.open(os.path.join(SRC, 'lau_centres_2020_nuts2021.csv.gz'), 'rt', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        centres[row['gisco_id']] = row

# NUTS names (levels 1-3) from Nuts2json 2021
nuts_names = {}
for lvl in (1, 2, 3):
    t = jload(f'nuts2021_20M_{lvl}.topo.json')
    for g in t['objects']['nutsrg']['geometries']:
        nuts_names[g['properties']['id']] = g['properties']['na']
# country level names
t3 = jload('nuts2021_20M_3.topo.json')
for g in t3['objects']['cntrg']['geometries']:
    nuts_names.setdefault(g['properties']['id'], g['properties']['na'])

# Outermost regions are outside the 20M Nuts2json frame; name them explicitly (NUTS 2021 labels)
NUTS_EXTRA = {'FRY': 'Régions ultrapériphériques françaises', 'FRY1': 'Guadeloupe', 'FRY10': 'Guadeloupe', 'FRY2': 'Martinique', 'FRY20': 'Martinique',
    'FRY3': 'Guyane', 'FRY30': 'Guyane', 'FRY4': 'La Réunion', 'FRY40': 'La Réunion', 'FRY5': 'Mayotte', 'FRY50': 'Mayotte',
    'ES7': 'Canarias', 'ES70': 'Canarias', 'ES703': 'El Hierro', 'ES704': 'Fuerteventura', 'ES705': 'Gran Canaria', 'ES706': 'La Gomera', 'ES707': 'La Palma', 'ES708': 'Lanzarote', 'ES709': 'Tenerife',
    'PT2': 'Região Autónoma dos Açores', 'PT20': 'Região Autónoma dos Açores', 'PT200': 'Região Autónoma dos Açores', 'PT3': 'Região Autónoma da Madeira', 'PT30': 'Região Autónoma da Madeira', 'PT300': 'Região Autónoma da Madeira'}
for k, v in NUTS_EXTRA.items():
    nuts_names.setdefault(k, v)

# ---------------------------------------------------------------- locate every record
swiss = jload('swissmaps_2021_ch-combined.topo.json')
s_arcs = topo_arcs(swiss)
ch_poly = {}
for g in swiss['objects']['municipalities']['geometries']:
    polys = []
    for rings in topo_geom_polys(s_arcs, g):
        try:
            polys.append(Polygon(rings[0], rings[1:]))
        except Exception:
            pass
    if polys:
        ch_poly[str(g['id'])] = MultiPolygon(polys) if len(polys) > 1 else polys[0]

loc_method = collections.Counter()
by_country_centres = collections.defaultdict(dict)
for gid, row in centres.items():
    by_country_centres[row['country']].setdefault(fold(row['lau_name']), []).append(row)

used_centre = set()
for r in records:
    cc = r['country']
    row = None
    if cc == 'CH':
        row = centres.get('CH_CH%04d' % int(r['official_id']))
    else:
        row = centres.get(r.get('gisco_id') or f"{cc}_{r['official_id']}")
    method = 'lau_centre' if row else None
    if not row and cc != 'CH':
        cands = by_country_centres[cc].get(fold(r['name']), [])
        if len(cands) == 1:
            row, method = cands[0], 'lau_centre_name_match'
    if row:
        r['_lat'], r['_lon'] = float(row['latitude']), float(row['longitude'])
        r['_n3'] = row['nuts_3']
        used_centre.add(row['gisco_id'])
    if cc == 'CH' and r['official_id'] in ch_poly:
        poly = ch_poly[r['official_id']]
        if not row:
            p = poly.representative_point() if not poly.contains(poly.centroid) else poly.centroid
            r['_lat'], r['_lon'] = p.y, p.x
            method = 'polygon_centroid'
    r['_loc'] = method
    loc_method[(cc, method)] += 1

# French overseas departments: the INSEE code fixes the department (971 Guadeloupe ... 976 Mayotte).
# The centres file gives several of them the wrong NUTS3 code, so the code decides.
FR_DOM = {'971': 'FRY10', '972': 'FRY20', '973': 'FRY30', '974': 'FRY40', '976': 'FRY50'}
for r in records:
    if r['country'] == 'FR' and r['official_id'][:3] in FR_DOM:
        if r.get('_n3') != FR_DOM[r['official_id'][:3]]:
            r['_n3'] = FR_DOM[r['official_id'][:3]]; r['_n3m'] = 'insee_department'

# NUTS3 fallback by official-id prefix vote (administrative inference only; no coordinates)
for cc in sorted({r['country'] for r in records}):
    rs = [r for r in records if r['country'] == cc]
    for r in rs:
        if r.get('_n3'):
            continue
        best = None
        for L in range(min(len(r['official_id']) - 1, 6), 1, -1):
            pre = r['official_id'][:L]
            votes = collections.Counter(x['_n3'] for x in rs if x.get('_n3') and x['official_id'].startswith(pre) and len(x['official_id']) == len(r['official_id']))
            if votes:
                best = votes.most_common(1)[0][0]
                break
        if best:
            r['_n3'] = best
            r['_n3m'] = 'id_prefix_vote'

# ---------------------------------------------------------------- superseded duplicates
# The legacy bundle carries several LAU generations for a few countries (Norway: pre-2020, 2020
# and 2024 municipality codes for the same town). Keep the current one, flag the rest.
NO_2024 = {'03', '11', '15', '18', '31', '32', '33', '34', '39', '40', '42', '46', '50', '55', '56'}
superseded = set()
for i, r in enumerate(records):
    if r['country'] == 'NO' and r['official_id'][:2] not in NO_2024:
        superseded.add(i)
groups = collections.defaultdict(list)
for i, r in enumerate(records):
    if r['country'] in ('LV', 'BE', 'EE') and i not in superseded:
        groups[(r['country'], fold(r['name']))].append(i)
for key, idx in groups.items():
    if len(idx) < 2:
        continue
    idx.sort(key=lambda i: records[i]['official_id'])
    keep = idx[-1]
    for i in idx[:-1]:
        a, b = float(records[i].get('population') or 0), float(records[keep].get('population') or 0)
        if b and abs(a - b) / b < 0.25:
            superseded.add(i)
# Several generations of the same municipality also survive with identical coordinates (Norway 2020/2024,
# Belgium 2025 mergers, Latvia 2021 reform, Estonia, Iceland). Keep one: one with a population, then the
# biggest (Latvia: merged novads) or the newest code (elsewhere).
gen = collections.defaultdict(list)
for i, r in enumerate(records):
    if r['country'] in ('NO', 'BE', 'LV', 'EE', 'IS') and i not in superseded and '_lat' in r:
        gen[(r['country'], fold(r['name']))].append(i)
for key, idx in gen.items():
    if len(idx) < 2: continue
    clusters = []
    for i in idx:
        for c in clusters:
            j = c[0]
            if abs(records[i]['_lat'] - records[j]['_lat']) < 0.005 and abs(records[i]['_lon'] - records[j]['_lon']) < 0.008:
                c.append(i); break
        else:
            clusters.append([i])
    for c in clusters:
        if len(c) < 2: continue
        def rank(i):
            p = float(records[i].get('population') or 0)
            return (p > 0, p if key[0] == 'LV' else 0, records[i]['official_id'])
        keep = max(c, key=rank)
        for i in c:
            if i != keep: superseded.add(i)
for i in superseded:
    records[i]['_sup'] = 1
print('superseded duplicates', collections.Counter(records[i]['country'] for i in superseded))

missing_n3 = collections.Counter(r['country'] for r in records if not r.get('_n3'))
print('location methods', sorted(loc_method.items(), key=str))
print('records without NUTS3', missing_n3)

# ---------------------------------------------------------------- yearly population update (build/refresh_data.py)
LAU_UPDATE = lau_update.apply(records, lau_update.load(os.path.join(SRC, 'lau_update.json.gz')))
POP_YEAR = LAU_UPDATE['year'] or 2024
if LAU_UPDATE['applied']:
    DATA_VERSION = (lau_update.load(os.path.join(SRC, 'lau_update.json.gz')).get('fetched') or '').replace('-', '.') or DATA_VERSION
    print('population update', POP_YEAR, {k: v['updated'] for k, v in LAU_UPDATE['countries'].items()}, 'skipped', LAU_UPDATE['skipped'])

# ---------------------------------------------------------------- geographic factors
has = np.array([('_lat' in r) and not r.get('_sup') for r in records])
lat = np.array([r.get('_lat', np.nan) for r in records])
lon = np.array([r.get('_lon', np.nan) for r in records])
pop = np.array([float(r.get('population') or 0) for r in records])
X, Y = laea(np.nan_to_num(lon), np.nan_to_num(lat))
P = np.c_[X, Y]
idx_has = np.where(has)[0]

# airports
ap = jload('airports_scheduled_europe.json')['rows']
hub = [a for a in ap if a[3] == 'large_airport']
def nearest(points_lonlat):
    ax, ay = laea([a[5] for a in points_lonlat], [a[4] for a in points_lonlat])
    tree = cKDTree(np.c_[ax, ay])
    d, i = tree.query(P[idx_has])
    return d, i
hub_d, hub_i = nearest(hub)
any_d, any_i = nearest(ap)

# major cities (>=100k residents, any country; cross-border commuting is real)
city_idx = [i for i in idx_has if pop[i] >= 100000]
# Some countries publish sub-municipal units (Portuguese parishes, Irish electoral divisions, Skopje and Bratislava
# boroughs), so no unit reaches 100,000 even inside Lisbon or Dublin. Natural Earth city points with at least
# 100,000 residents in the city proper (pop_min) fill that gap; they carry index -1 (not a record).
_NE = ne_path('ne_10m_populated_places_simple')
_A3 = {'ALB', 'AUT', 'BEL', 'BGR', 'CHE', 'CYP', 'CZE', 'DEU', 'DNK', 'EST', 'GRC', 'ESP', 'FIN', 'FRA', 'HRV', 'HUN', 'IRL', 'ISL', 'ITA', 'LIE', 'LTU', 'LUX', 'LVA', 'MKD', 'MLT', 'NLD', 'NOR', 'POL', 'PRT', 'ROU', 'SRB', 'SWE', 'SVN', 'SVK', 'GBR'}
ne_city = []
if True:
    for _f in json.load(open(_NE))['features']:
        _p = _f['properties']
        if (_p.get('pop_min') or 0) >= 100000 and _p.get('adm0_a3') in _A3: ne_city.append((_p['longitude'], _p['latitude']))
_nx, _ny = laea([c[0] for c in ne_city], [c[1] for c in ne_city]) if ne_city else ([], [])
if ne_city:  # only where no official 100,000+ unit lies within 10 km, so countries with whole-city units keep their values
    _lt = cKDTree(P[city_idx]); _dd, _ = _lt.query(np.c_[_nx, _ny])
    _keep = _dd > 10.0
    ne_city = [c for c, k in zip(ne_city, _keep) if k]; _nx = np.asarray(_nx)[_keep]; _ny = np.asarray(_ny)[_keep]
city_pts = np.r_[P[city_idx], np.c_[_nx, _ny]] if ne_city else P[city_idx]
city_idx = city_idx + [-1] * len(ne_city)
print('city anchors', len(city_idx), 'of which Natural Earth', len(ne_city))
ctree = cKDTree(city_pts)
cd, ci = ctree.query(P[idx_has], k=2)

# 30 km catchment population
tree_all = cKDTree(P[idx_has])
pop_has = pop[idx_has]
neigh = tree_all.query_ball_point(P[idx_has], r=30.0)
catch = np.array([pop_has[n].sum() for n in neigh])

# coast distance (Natural Earth 1:10m coastline, which follows fjords and lagoons; cached like build_extra.py)
_cp = ne_path('ne_10m_coastline')
lines = []
for _f in json.load(open(_cp))['features']:
    _g = _f['geometry']
    for _part in ([_g['coordinates']] if _g['type'] == 'LineString' else _g['coordinates']):
        _pts = [(lo, la) for lo, la in _part if 20 < la < 80 and -40 < lo < 55]
        if len(_pts) < 2: continue
        xs, ys = laea([p[0] for p in _pts], [p[1] for p in _pts])
        coords = list(zip(xs, ys))
        for k in range(0, len(coords) - 1, 25):
            seg = coords[k:k + 26]
            if len(seg) >= 2: lines.append(LineString(seg))
# tidal estuaries are not the open sea: coastline inside these river corridors is ignored, so Hamburg,
# Bremen, Antwerp, Bordeaux, Nantes, Rouen, Seville and London measure to where the estuary meets the sea.
# Each corridor runs from the mouth (first point) upstream; a 7 km disc around the mouth stays open sea.
ESTUARIES = {
    'Elbe': [(8.72, 53.87), (9.14, 53.89), (9.42, 53.78), (9.50, 53.62), (9.97, 53.54), (10.37, 53.43)],
    'Weser': [(8.50, 53.60), (8.48, 53.33), (8.62, 53.17), (8.80, 53.08)],
    'Ems': [(7.00, 53.35), (7.20, 53.36), (7.45, 53.23), (7.39, 53.08)],
    'Scheldt': [(3.58, 51.44), (3.83, 51.34), (4.21, 51.40), (4.40, 51.22), (4.21, 51.12), (3.72, 51.05)],
    'Thames': [(0.71, 51.53), (0.37, 51.44), (0.05, 51.50), (-0.10, 51.50), (-0.33, 51.43)],
    'Gironde': [(-1.05, 45.60), (-0.75, 45.20), (-0.55, 45.04), (-0.57, 44.84), (-0.48, 44.70)],
    'Dordogne': [(-0.55, 45.04), (-0.24, 44.92)],
    'Loire': [(-2.20, 47.27), (-2.03, 47.29), (-1.55, 47.21), (-1.40, 47.25)],
    'Seine': [(0.15, 49.44), (0.46, 49.48), (0.75, 49.45), (1.09, 49.44)],
    'Guadalquivir': [(-6.36, 36.80), (-6.20, 37.00), (-5.99, 37.38)],
    'Humber': [(0.12, 53.58), (-0.33, 53.74), (-0.87, 53.70)],
    'Severn': [(-2.95, 51.40), (-2.64, 51.61), (-2.25, 51.86)],
    'Shannon': [(-9.40, 52.57), (-9.10, 52.61), (-8.63, 52.66)],
}
from shapely.geometry import LineString as _LS, Point as _Pt
_masks = []
for _nm, _pts in ESTUARIES.items():
    _xs, _ys = laea([p[0] for p in _pts], [p[1] for p in _pts])
    _masks.append(_LS(list(zip(_xs, _ys))).buffer(9.0).difference(_Pt(_xs[0], _ys[0]).buffer(7.0)))
_mask = shapely.union_all(_masks)
_before = sum(l.length for l in lines)
_clipped = []
for l in lines:
    if not l.intersects(_mask): _clipped.append(l); continue
    d = l.difference(_mask)
    if d.is_empty: continue
    _clipped.extend([g for g in getattr(d, 'geoms', [d]) if g.length > 0])
lines = _clipped
print('estuary corridors removed %.0f km of coastline' % (_before - sum(l.length for l in lines)))
stree = STRtree(lines)
pts = shapely.points(P[idx_has])
nearest_idx = stree.query_nearest(pts, all_matches=False)
coast = shapely.distance(pts, np.array(lines, dtype=object)[nearest_idx[1]])

# ---------------------------------------------------------------- access (deterministic v2)
ACCESS_CENTRES = const['ACCESS_CENTRES']
name_index = collections.defaultdict(list)
for i in idx_has:
    name_index[(records[i]['country'], fold(records[i]['name']))].append(i)
def anchor_set(kind):
    s = set(i for i in idx_has if pop[i] >= 100000)
    for cc, d in ACCESS_CENTRES.items():
        for nm in d.get(kind, []):
            hits = name_index.get((cc, fold(nm)), [])
            if not hits:
                hits = [i for (c2, f2), lst in name_index.items() if c2 == cc and f2.startswith(fold(nm)) for i in lst]
            if hits:
                s.add(max(hits, key=lambda i: pop[i]))
    return sorted(s)
anc = {k: anchor_set(k) for k in ('commuter', 'student')}
atree = {k: cKDTree(P[v]) for k, v in anc.items()}
F = const['V63_ACCESS_FORMULA']
def access_score(kind, dist, p, dens):
    f = F[kind]
    s = f['base'] - dist * f['slope']
    s += 7 if p >= 50000 else 4 if p >= 20000 else (-18 if p < 2500 else 0)
    s += 5 if dens >= 900 else (-12 if dens < 80 else 0)
    if dist > f['farPenalty']['over_km']:
        s -= f['farPenalty']['minus']
    return max(0.0, min(100.0, s))

def clamp(x, lo=0.0, hi=100.0):
    return max(lo, min(hi, x))
def lin(d, best, worst):
    """100 at d<=best, 0 at d>=worst (lower distance is better)."""
    return clamp(100.0 * (worst - d) / (worst - best))

geo = {}
for j, i in enumerate(idx_has):
    r = records[i]
    d_city = 0.0 if pop[i] >= 100000 else float(cd[j][1] if city_idx[ci[j][0]] == i else cd[j][0])
    dens = float(r.get('density') or 0)
    g = {
        'geo_hub_airport_km': float(hub_d[j]),
        'geo_airport_km': float(any_d[j]),
        'geo_major_city_km': d_city,
        'geo_catchment_30km': float(catch[j]),
        'geo_coast_km': float(coast[j]),
        'hub_airport': hub[hub_i[j]][2], 'hub_airport_iata': hub[hub_i[j]][1],
        'airport': ap[any_i[j]][2], 'airport_iata': ap[any_i[j]][1],
    }
    if r['country'] != 'CH':
        for kind in ('commuter', 'student'):
            dd, ii = atree[kind].query(P[i])
            g[f'{kind}_anchor_km'] = float(dd)
            g[f'{kind}_anchor'] = records[anc[kind][ii]]['name']
            g[f'{kind}_access_v2'] = access_score(kind, float(dd), pop[i], dens)
    geo[i] = g

def geo_scores(g):
    return {
        'geo_hub_airport_km': r2(lin(g['geo_hub_airport_km'], 20, 180)),
        'geo_major_city_km': r2(lin(g['geo_major_city_km'], 5, 100)),
        'geo_catchment_30km': r2(clamp(100 * (math.log10(max(g['geo_catchment_30km'], 1)) - math.log10(20000)) / (math.log10(3e6) - math.log10(20000)))),
        'geo_coast_km': r2(lin(g['geo_coast_km'], 2, 60)),
    }

# ---------------------------------------------------------------- factor catalogue
FACTORS = [f for f in appdata['factors']]
NEW_FACTORS = [
    {'id': 'geo_hub_airport_km', 'name': 'Hub airport distance', 'category': 'mobility', 'direction': 'lower', 'unit': 'km',
     'score_role': 'scored', 'source_id': 'ourairports',
     'description': 'Straight-line distance from the population-weighted centre of the municipality to the nearest large airport with scheduled passenger service. Scored 100 at 20 km or less, falling to 0 at 180 km.'},
    {'id': 'geo_major_city_km', 'name': 'Distance to a city of 100,000+', 'category': 'mobility', 'direction': 'lower', 'unit': 'km',
     'score_role': 'scored', 'source_id': 'eurostat_gisco_lau_2024',
     'description': 'Straight-line distance to the nearest municipality with at least 100,000 residents, across borders. 0 km if the place itself is that large. Scored 100 at 5 km or less, falling to 0 at 100 km.'},
    {'id': 'geo_catchment_30km', 'name': 'Residents within 30 km', 'category': 'jobs', 'direction': 'higher', 'unit': 'residents',
     'score_role': 'scored', 'source_id': 'eurostat_gisco_lau_2024',
     'description': 'Everyone living in municipalities whose population-weighted centre lies within 30 km, across borders. A labour-market and services catchment proxy, not a job count. Log-scaled: 20,000 scores 0, 3 million scores 100.'},
    {'id': 'geo_coast_km', 'name': 'Sea coast distance', 'category': 'coast', 'direction': 'lower', 'unit': 'km',
     'score_role': 'scored', 'source_id': 'natural_earth',
     'description': 'Straight-line distance to the sea coastline (Natural Earth 1:50m). Lakes are not counted. Scored 100 at 2 km or less, falling to 0 at 60 km. Only used by the Coastal living profile.'},
]
FACTORS += NEW_FACTORS
SCORED_IDS = [f['id'] for f in FACTORS]

# ---------------------------------------------------------------- shards
COUNTRY_NAMES = {r['country']: r.get('countryName') or r['country'] for r in records}
COUNTRY_NAMES['CH'] = 'Switzerland'
COUNTRY_NAMES['UK'] = 'United Kingdom'
by_cc = collections.defaultdict(list)
for i, r in enumerate(records):
    by_cc[r['country']].append(i)

os.makedirs(os.path.join(OUT, 'c'), exist_ok=True)
countries_meta = []
search_rows = []
for cc, ids in sorted(by_cc.items()):
    ids.sort(key=lambda i: records.index(records[i]) if False else i)  # keep legacy order (ties!)
    rows = []
    strs = []; sidx = {}
    def S(x):
        if x is None: return None
        if x not in sidx: sidx[x] = len(strs); strs.append(x)
        return sidx[x]
    fs_cols = collections.OrderedDict()
    fr_cols = collections.OrderedDict()
    for k, i in enumerate(ids):
        r = records[i]
        g = geo.get(i)
        fs = dict(r.get('factorScores') or {})
        fr = dict(r.get('factorRaw') or {})
        if g:
            fs.update({k2: v for k2, v in geo_scores(g).items() if v is not None})
            for k2 in ('geo_hub_airport_km', 'geo_airport_km', 'geo_major_city_km', 'geo_catchment_30km', 'geo_coast_km'):
                fr[k2] = r2(g[k2], 1)
            if 'commuter_access_v2' in g:
                fs['commuter_access_v2'] = r2(g['commuter_access_v2'])
                fs['student_access_v2'] = r2(g['student_access_v2'])
                fr['commuter_anchor_km'] = r2(g['commuter_anchor_km'], 1)
                fr['student_anchor_km'] = r2(g['student_anchor_km'], 1)
        prec = 4 if cc == 'CH' else 2
        for fid, v in fs.items():
            fs_cols.setdefault(fid, [None] * len(ids))[k] = v if v is None else r2(v, 1 if fid.startswith('geo_') or fid.endswith('_v2') else prec)
        for fid, v in fr.items():
            if fid == 'common_population_scale' and v is not None and abs(float(v) - float(r.get('population') or 0)) < 0.5:
                v = None
            if fid in ('common_density_balance', 'common_low_crowding') and v is not None and abs(float(v) - float(r.get('density') or 0)) < 0.01:
                v = None
            if fid == 'geo_catchment_30km' and v is not None:
                v = round(v, -2)
            if v is None and fid not in fr_cols:
                continue
            fr_cols.setdefault(fid, [None] * len(ids))[k] = v if not isinstance(v, (int, float)) else r2(v, 4 if cc == 'CH' else 2)
        n3 = r.get('_n3') or ''
        row = [
            r['official_id'], r['name'],
            (r.get('canton') if cc == 'CH' else (r.get('region_code') or '')) or '',
            n3,
            int(r.get('population') or 0), r2(r.get('area_km2'), 3), r2(r.get('density'), 2),
            r2(r.get('_lat'), 5), r2(r.get('_lon'), 5),
            r2(r.get('sourceConfidence'), 1), r.get('availableFactorCount') or 0,
            r.get('dataReadiness') or '',
            {'lau_centre': 1, 'lau_centre_name_match': 2, 'polygon_centroid': 3}.get(r.get('_loc'), 0),
            '' if (r.get('gisco_id') or '') == f"{cc}_{r['official_id']}" else (r.get('gisco_id') or ''),
            S(r.get('region') or ''),
        ]
        if g:
            row.append([S(g['hub_airport'] + (' (' + g['hub_airport_iata'] + ')' if g['hub_airport_iata'] else '')),
                        S(g['airport'] + (' (' + g['airport_iata'] + ')' if g['airport_iata'] else '')),
                        S(g.get('commuter_anchor')), S(g.get('student_anchor'))])
        else:
            row.append(None)
        row.append(1 if r.get('_sup') else 0)
        rows.append(row)
        if not r.get('_sup'):
            _ap = (r.get('trend') or {}).get('annual_population') or []
            search_rows.append([cc, r['official_id'], r['name'], int((_ap[-1]['population'] if _ap else None) or r.get('population') or 0)])
    shard = {
        'cc': cc, 'name': COUNTRY_NAMES[cc], 'v': DATA_VERSION, 'n': len(ids),
        'cols': ['oid', 'name', 'rc', 'n3', 'pop', 'area', 'dens', 'lat', 'lon', 'conf', 'nf', 'ready', 'loc', 'gisco', 'regionName', 'geoNames', 'sup'],
        'rows': rows,
        'fs': fs_cols,
        'fr': {k: v for k, v in fr_cols.items() if any(x is not None for x in v)},
        'strs': strs,
        'rawFallback': {'common_population_scale': 'pop', 'common_density_balance': 'dens', 'common_low_crowding': 'dens'},
    }
    if cc == 'CH':
        shard['trend'] = [records[i].get('trend') for i in ids]
        shard['cantonName'] = {records[i]['canton']: records[i]['cantonName'] for i in ids}
    if cc == 'AT':
        pass
    codes = sorted({row[3] for row in rows if row[3]})
    shard['nuts'] = {c: nuts_names.get(c) for c in sorted(set(codes) | {c[:3] for c in codes} | {c[:4] for c in codes}) if nuts_names.get(c)}
    with open(os.path.join(OUT, 'c', f'{cc}.json'), 'w', encoding='utf-8') as f:
        json.dump(shard, f, ensure_ascii=False, separators=(',', ':'))
    readiness = collections.Counter(records[i].get('dataReadiness') for i in ids).most_common(1)[0][0]
    countries_meta.append({'cc': cc, 'name': COUNTRY_NAMES[cc], 'n': sum(1 for i in ids if not records[i].get('_sup')), 'nAll': len(ids), 'superseded': sum(1 for i in ids if records[i].get('_sup')), 'depth': readiness,
                           'located': int(sum(1 for i in ids if '_lat' in records[i])),
                           'pop': int(sum(pop[i] for i in ids if not records[i].get('_sup'))),
                           'bbox': [r2(np.nanmin(lon[ids]), 3), r2(np.nanmin(lat[ids]), 3), r2(np.nanmax(lon[ids]), 3), r2(np.nanmax(lat[ids]), 3)] if any('_lat' in records[i] for i in ids) else None})

# search index (all places, tiny)
region_rows = []
for cc, ids in sorted(by_cc.items()):
    cnt = collections.Counter()
    for i in ids:
        n3 = records[i].get('_n3') or ''
        if n3:
            for code in sorted({n3[:3], n3[:4], n3}):
                cnt[code] += 1
    for code, n in cnt.items():
        if nuts_names.get(code) and n > 1:
            region_rows.append([cc, code, nuts_names[code], n])
with open(os.path.join(OUT, 'search.json'), 'w', encoding='utf-8') as f:
    json.dump({'v': DATA_VERSION, 'rows': search_rows, 'regions': region_rows}, f, ensure_ascii=False, separators=(',', ':'))

# ---------------------------------------------------------------- geometry
os.makedirs(os.path.join(OUT, 'geo'), exist_ok=True)
# Swiss: municipalities + cantons + lakes + country (drop districts)
sw = dict(swiss)
sw['objects'] = {k: v for k, v in swiss['objects'].items() if k in ('municipalities', 'cantons', 'lakes', 'country')}
with open(os.path.join(OUT, 'geo', 'ch.topo.json'), 'w') as f:
    json.dump(sw, f, separators=(',', ':'))
# Europe NUTS3 (10M) regions + country outlines
n10 = jload('nuts2021_10M_3.topo.json')
n10['objects'] = {k: v for k, v in n10['objects'].items() if k in ('nutsrg', 'cntrg', 'cntbn', 'nutsbn')}
with open(os.path.join(OUT, 'geo', 'nuts3.topo.json'), 'w') as f:
    json.dump(n10, f, separators=(',', ':'))

# ---------------------------------------------------------------- meta
SOURCES = dict(appdata['sources'])
SOURCES.update({
    'ourairports': {'name': 'OurAirports open data', 'url': 'https://ourairports.com/data/', 'licence': 'Public domain', 'note': 'Large and medium airports with scheduled service.'},
    'natural_earth': {'name': 'Natural Earth 1:50m land', 'url': 'https://www.naturalearthdata.com/', 'licence': 'Public domain', 'note': 'Coastline for sea-distance.'},
    'edjnet_lau_centres': {'name': 'EDJNet population-weighted LAU centres (LAU 2020, NUTS 2021)', 'url': 'https://github.com/EDJNet/lau_centres', 'licence': 'Derived from Eurostat GISCO (© EuroGeographics) and the GEOSTAT population grid', 'note': 'Location of each municipality for distances and the map dots.'},
    'nuts2json': {'name': 'Eurostat Nuts2json NUTS 2021', 'url': 'https://github.com/eurostat/Nuts2json', 'licence': '© EuroGeographics for the administrative boundaries', 'note': 'Region names and regional outlines.'},
    'swiss_maps': {'name': 'swiss-maps 2021 (swisstopo swissBOUNDARIES3D)', 'url': 'https://github.com/interactivethings/swiss-maps', 'licence': 'swisstopo open data', 'note': 'Swiss municipality polygons, cantons and lakes.'},
})
meta = {
    'v': DATA_VERSION,
    'legacy': {'version': 'v86-final-municipality-region-ranking', 'generatedAt': appdata.get('generatedAt')},
    'categoryLabels': dict(appdata['categoryLabels'], mobility='Mobility and connectivity', coast='Coast and sea'),
    'factors': FACTORS,
    'sources': SOURCES,
    'countries': countries_meta,
    'nuts1': {k: v for k, v in nuts_names.items() if len(k) == 3},
    'auditSummary': appdata['auditSummary'],
    'locationStats': {f'{cc}:{m}': n for (cc, m), n in loc_method.items()},
    'anchors': {k: [[records[i]['country'], records[i]['official_id'], records[i]['name'], r2(lat[i], 4), r2(lon[i], 4)] for i in v] for k, v in anc.items()},
}

# ---------------------------------------------------------------- app config (legacy constants, effective values)
PD = const['PROFILE_DESCRIPTIONS_by_layer']
LANG = json.loads(json.dumps(const['LANGUAGE_AREAS_final']))
_notes = {
    'german': ('German-speaking', 'Daily life, schools, work and administration run in German.'),
    'french': ('French-speaking', 'Daily life runs in French, from Lake Geneva and the Jura arc to France, Wallonia and Luxembourg.'),
    'italian': ('Italian-speaking', 'Ticino and Italy. Schools and administration run in Italian, so check your language plan early.'),
    'bilingual': ('Bilingual cantons', 'Bern, Fribourg, Valais and Graubünden each have two or three official languages. The language of daily life changes from one municipality to the next, so check the local school language.'),
    'english': ('English-speaking', 'Administration, work and schools in English.'),
    'dutch': ('Dutch-speaking', 'Schools, administration and local networks run in Dutch.'),
    'spanish': ('Spanish-speaking', 'Spanish everywhere, with Catalan, Basque, Galician or Valencian also official in some regions.'),
    'portuguese': ('Portuguese-speaking', 'Daily life and administration in Portuguese.'),
    'nordic': ('Nordic', 'Each Nordic country has its own language and administrative system.'),
    'central_east': ('Central and Eastern Europe', 'Local language and institutions come first; English varies by town.'),
    'south_east': ('South-east Europe', 'Climate, language and service depth vary a lot by country.'),
    'luxembourgish': ('Luxembourg', 'Luxembourgish, French and German side by side, with a large daily cross-border workforce.'),
    'belgian_german': ('German-speaking Belgium', 'A small German-language community in eastern Belgium with its own schools and administration.'),
}
for k, (nm, note) in _notes.items():
    if k in LANG:
        LANG[k]['name'] = nm; LANG[k]['note'] = note
profiles = json.loads(json.dumps(const['PROFILES_final']))
intro = PD['v58_PROFILE_DEFS_(closure; shown in profileIntro)']
for k, p in profiles.items():
    p['intro'] = intro.get(k, '')
profiles['coastal'] = {
    'name': 'Coastal living', 'new': True,
    'desc': 'Sea-coast distance leads, backed by environment, health, safety and costs. Landlocked countries cannot produce a coastal ranking, and the app says so instead of inventing one.',
    'intro': 'Life near the sea: coast access first, then calm, health, safety and costs.',
    'weights': {'coast': 34, 'environment': 14, 'affordability': 12, 'health': 10, 'safety': 10, 'mobility': 10, 'foundation': 10},
    'strict': {'coast': 40}, 'minPop': 800,
}
order = [k for k in const['PROFILE_ORDER_final'] if k != 'self_fit'] + ['coastal']
config = {
    'profiles': profiles,
    'order': order,
    'selfFitDefault': const['PROFILES_final'].get('self_fit'),
    'europeLotteryWeights': const['EUROPE_LOTTERY_WEIGHTS'],
    'swissLotteryWeights': const['SWISS_LOTTERY_WEIGHTS'],
    'softLottery': const['SOFT_LOTTERY_PENALTY'],
    'europeAccessGates': const['EUROPE_ACCESS_ELIGIBILITY_v63'],
    'icons': const['PROFILE_ICONS_by_layer']['v62_effective'],
    'tones': const['PROFILE_TONE_v62'],
    'swissRegions': const['SWISS_REGIONS'],
    'cantons': const['CANTONS'],
    'languageAreas': LANG,
    'multilingual': const['MULTILINGUAL_COUNTRIES'],
    'belgianLanguage': const['BELGIAN_LANGUAGE_RULES'],
    'languageSensitive': [k for k in const['LANGUAGE_SENSITIVE_PROFILES'] if not k.startswith('self_fit')],
    'studentHubsCH': const['STUDENT_HUB_NAMES_CH'],
    'crossBorder': const['CROSS_BORDER_POINTS_final'],
    'placeNotes': const['PLACE_NOTES'],
    'cantonLines': const['CANTON_LINES'],
    'autoFactGroups': const['AUTO_FACT_GROUPS'],
    'builder': {'groups': const['BUILDER_GROUPS'], 'defaults': const['BUILDER_DEFAULT_STATE'], 'dims': const['SELF_PROFILE_DIMS'],
                'standardKeys': const['SELF_STANDARD_KEYS'], 'countries': const['BUILDER_COUNTRY_CHOICES']},
    'terms': dict(const['TERM_DEFINITIONS_v56'],
                  mobility='Mobility and connectivity. Distance to the nearest hub airport with scheduled flights and to the nearest city of 100,000+ residents, both measured from where people actually live in the municipality.',
                  coast='Coast and sea. Straight-line distance to the sea coastline. Only the Coastal living profile uses it.',
                  confidence=const['CONFIDENCE_TEXT_v57']),
    'accessCentres': const['ACCESS_CENTRES'],
    # France: NUTS 1 = today's 13 regions (NUTS 2 still carries the pre-2016 regions)
    'regionLevel': {'FR': 'n1'},
    'countryNames': {'UK': 'United Kingdom', 'EL': 'Greece'},
}
meta['config'] = config
meta['population'] = {'year': POP_YEAR, 'base_year': LAU_UPDATE.get('base_year') or 2019, 'updated_countries': sorted(LAU_UPDATE.get('countries', {})),
                      'kept_countries': sorted(LAU_UPDATE.get('skipped', {}))}
if LAU_UPDATE['applied']:
    _js = json.dumps(meta, ensure_ascii=False)
    _js = _js.replace('GISCO LAU 2024', 'GISCO LAU %d' % POP_YEAR).replace('GISCO 2019 and 2024', 'GISCO %s and %d' % (LAU_UPDATE.get('base_year'), POP_YEAR))
    meta = json.loads(_js)

with open(os.path.join(OUT, 'meta.json'), 'w', encoding='utf-8') as f:
    json.dump(meta, f, ensure_ascii=False, separators=(',', ':'))

# report
tot = 0
for fn in sorted(os.listdir(os.path.join(OUT, 'c'))):
    s = os.path.getsize(os.path.join(OUT, 'c', fn)); tot += s
print('shards total MB', round(tot / 1e6, 2))
for fn in ('meta.json', 'search.json', 'geo/ch.topo.json', 'geo/nuts3.topo.json'):
    print(fn, round(os.path.getsize(os.path.join(OUT, fn)) / 1e6, 2), 'MB')
# sanity samples
for name in ('Meilen', 'Zürich', 'Flensburg, Stadt', 'Nice', 'Valencia'):
    for i, r in enumerate(records):
        if r['name'] == name:
            print(name, r['country'], r.get('_n3'), r.get('_lat'), r.get('_lon'), {k: (round(v, 1) if isinstance(v, float) else v) for k, v in (geo.get(i) or {}).items()})
            break
