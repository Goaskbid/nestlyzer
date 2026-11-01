#!/usr/bin/env python3
"""Which official local area each town outside Europe lies in (2.12.4).

The places of the countries outside Europe are GeoNames towns; official statistics are published for municipalities,
regencies or districts. This script places every town in its area by point-in-polygon on the open geoBoundaries
layers (CC BY 3.0 IGO / CC BY 4.0, sources named per country below) and writes the result, the reviewed artifact,
to build/source/context/world_area_bindings.csv. The boundary files themselves stay outside the repository.

    python3 build/build_world_areas.py <folder with geoBoundaries-<ISO3>-ADM1/ADM2 *.json>

Hong Kong has no open district layer in geoBoundaries: towns go to the district whose official centre is nearest
(method recorded as nearest_district_centre)."""
import csv, json, os, sys, unicodedata
from shapely.geometry import shape, Point
from shapely.strtree import STRtree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'build', 'source', 'context', 'world_area_bindings.csv')
LAYERS = {'MX': ('MEX', 'INEGI via World Bank, CC BY 4.0'), 'BR': ('BRA', 'IBGE via OCHA, CC BY 3.0 IGO'), 'ID': ('IDN', 'BPS via WFP/OCHA, CC BY 3.0 IGO'), 'MY': ('MYS', 'geoBoundaries, CC BY 3.0; names identical to the 160 DOSM census districts')}
HK_CENTRES = {'A': ('Central and Western', 22.283, 114.150), 'B': ('Wan Chai', 22.277, 114.182), 'C': ('Eastern', 22.282, 114.224), 'D': ('Southern', 22.240, 114.183),
              'E': ('Yau Tsim Mong', 22.311, 114.170), 'F': ('Sham Shui Po', 22.331, 114.158), 'G': ('Kowloon City', 22.322, 114.188), 'H': ('Wong Tai Sin', 22.342, 114.200),
              'J': ('Kwun Tong', 22.313, 114.226), 'K': ('Tsuen Wan', 22.371, 114.112), 'L': ('Tuen Mun', 22.391, 113.973), 'M': ('Yuen Long', 22.445, 114.025),
              'N': ('North', 22.497, 114.135), 'P': ('Tai Po', 22.450, 114.168), 'Q': ('Sai Kung', 22.360, 114.270), 'R': ('Sha Tin', 22.383, 114.193),
              'S': ('Kwai Tsing', 22.355, 114.120), 'T': ('Islands', 22.262, 113.946)}


def fold(s):
    return ''.join(c for c in unicodedata.normalize('NFKD', str(s)) if not unicodedata.combining(c)).lower().replace('-', ' ').strip()


def places(cc):
    d = json.load(open(os.path.join(ROOT, 'data', 'c', cc + '.json'))); c = d['cols']
    i = {k: c.index(k) for k in ('oid', 'name', 'lat', 'lon')}
    return [(r[i['oid']], r[i['name']], r[i['lat']], r[i['lon']]) for r in d['rows'] if r[i['lat']] is not None]


def layer(folder, iso3, adm):
    p = os.path.join(folder, f'{iso3}-{adm}.json')
    g = json.load(open(p))
    geoms = [shape(f['geometry']) for f in g['features']]
    return geoms, [f['properties']['shapeName'] for f in g['features']], STRtree(geoms)


def locate(tree, geoms, names, x, y):
    pt = Point(x, y)
    for k in tree.query(pt):
        if geoms[k].contains(pt): return names[k]
    # a coastal town just outside the simplified outline: nearest area within about 3 km
    k = tree.nearest(pt)
    return names[k] if geoms[k].distance(pt) < 0.03 else None


def main(folder):
    rows = []
    for cc, (iso3, lic) in LAYERS.items():
        a2 = layer(folder, iso3, 'ADM2'); a1 = layer(folder, iso3, 'ADM1')
        for oid, name, lat, lon in places(cc):
            n2 = locate(a2[2], a2[0], a2[1], lon, lat); n1 = locate(a1[2], a1[0], a1[1], lon, lat)
            if n2: rows.append([cc, oid, name, 'adm2', n2, n1 or '', 'point_in_polygon', 'geoBoundaries ' + iso3 + ' ADM2 (' + lic + ')'])
    for oid, name, lat, lon in places('HK'):
        code = min(HK_CENTRES, key=lambda k: (HK_CENTRES[k][1] - lat) ** 2 + (HK_CENTRES[k][2] - lon) ** 2)
        rows.append(['HK', oid, name, 'hk_district', HK_CENTRES[code][0], code, 'nearest_district_centre', 'C&SD district codes; centres compiled for Nestlyzer'])
    with open(OUT, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['country', 'place_oid', 'place_name', 'scheme', 'area_name', 'parent_or_code', 'method', 'source']); w.writerows(rows)
    from collections import Counter
    print('bindings', len(rows), dict(Counter(r[0] for r in rows)))


if __name__ == '__main__':
    main(sys.argv[1])
