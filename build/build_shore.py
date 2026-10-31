#!/usr/bin/env python3
"""Waterfront for the Coastal living profile: the sea OR a large lake counts as a shore.

Runs after build_data.py, build_extra.py and build_world.py (it only reads and rewrites the shards, so it can be
run again at any time). For every place in all 45 countries:
  * shore_km  = min(distance to the sea coast, distance to the shore of a large lake)
  * fs.geo_coast_km (the Coastal living score input) is re-scored from shore_km: 100 at 2 km or less, 0 at 60 km
  * fr.geo_shore_km holds the raw distance; x.shore holds the lake's name when the lake is nearer than the sea
fr.geo_coast_km stays the pure sea distance, so "Distance to the sea" and the sea facts do not change.

Large lake: a natural lake of at least 25 km2 (Lake Zurich 88 km2, Lake Ontario 18,960 km2), or a reservoir of
at least 100 km2. Source: Natural Earth 1:10m lakes with the Europe, North America and Australia supplements
(public domain). Distances are measured to the shoreline, sampled every 1 km or less."""
import glob, json, math, os, sys
import numpy as np
from scipy.spatial import cKDTree
from shapely.geometry import shape, Polygon, MultiPolygon
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geo_util import ne_path

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RE = 6371.0088
MIN_LAKE, MIN_RES = 25.0, 100.0


def area_km2(poly):
    # equal-area approximation on the sphere (fine for a size threshold)
    lat = poly.centroid.y
    return abs(poly.area) * (111.32 ** 2) * math.cos(math.radians(lat))


def unit(lon, lat):
    lo, la = np.radians(lon), np.radians(lat)
    return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], axis=-1)


def lakes():
    pts, names, kept, seen = [], [], [], set()
    for f in ['ne_10m_lakes', 'ne_10m_lakes_europe', 'ne_10m_lakes_north_america', 'ne_10m_lakes_australia']:
        for ft in json.load(open(ne_path(f)))['features']:
            p = ft['properties'] or {}
            cla = (p.get('featurecla') or '')
            if not cla.startswith(('Lake', 'Reservoir')) or not ft.get('geometry'): continue
            g = shape(ft['geometry'])
            polys = list(g.geoms) if isinstance(g, MultiPolygon) else [g]
            a = sum(area_km2(q) for q in polys)
            if a < (MIN_RES if cla.startswith('Reservoir') else MIN_LAKE): continue
            name = p.get('name_en') or p.get('name') or ''
            key = (name, round(g.centroid.x, 1), round(g.centroid.y, 1))
            if key in seen: continue
            seen.add(key); kept.append((name, round(a)))
            for q in polys:
                ring = q.exterior.segmentize(0.008)          # about 0.9 km or less
                c = np.asarray(ring.coords)
                pts.append(c); names.extend([name] * len(c))
    xy = np.concatenate(pts)
    return cKDTree(unit(xy[:, 0], xy[:, 1])), names, kept


def lin(d, best, worst): return max(0.0, min(100.0, 100.0 * (worst - d) / (worst - best)))


def main():
    tree, lname, kept = lakes()
    print('large lakes', len(kept), 'shore points', len(lname))
    meta = json.load(open(os.path.join(ROOT, 'data', 'meta.json')))
    tot = changed = 0
    for c in meta['countries']:
        cc = c['cc']
        sp, xp = os.path.join(ROOT, 'data', 'c', cc + '.json'), os.path.join(ROOT, 'data', 'x', cc + '.json')
        sh, xs = json.load(open(sp)), json.load(open(xp))
        cols = sh['cols']; ila, ilo = cols.index('lat'), cols.index('lon')
        lat = np.array([r[ila] if r[ila] is not None else np.nan for r in sh['rows']], float)
        lon = np.array([r[ilo] if r[ilo] is not None else np.nan for r in sh['rows']], float)
        ok = np.isfinite(lat) & np.isfinite(lon)
        d = np.full(len(lat), np.nan); nm = [None] * len(lat)
        if ok.any():
            ch, idx = tree.query(unit(lon[ok], lat[ok]))
            km = 2 * RE * np.arcsin(np.minimum(1, ch / 2))
            d[ok] = km
            for j, k in zip(np.nonzero(ok)[0], idx): nm[j] = lname[k]
        sea = sh['fr'].get('geo_coast_km') or [None] * len(lat)
        fs = sh['fs'].setdefault('geo_coast_km', [None] * len(lat))
        shore = [None] * len(lat); sname = [None] * len(lat)
        strs = xs['strs']; sidx = {s: i for i, s in enumerate(strs)}
        def S(s):
            if s not in sidx: sidx[s] = len(strs); strs.append(s)
            return sidx[s]
        for i in range(len(lat)):
            s = sea[i] if i < len(sea) else None
            l = d[i] if np.isfinite(d[i]) else None
            if s is None and l is None: continue
            if l is not None and (s is None or l < s):
                shore[i] = round(float(l), 1); sname[i] = S(nm[i]) if nm[i] else None
            else:
                shore[i] = round(float(s), 1)
            new = round(lin(shore[i], 2, 60), 1)
            if fs[i] is None or abs((fs[i] or 0) - new) > 0.05: changed += 1
            fs[i] = new
        sh['fr']['geo_shore_km'] = shore
        xs['cols']['shore'] = sname
        json.dump(sh, open(sp, 'w'), separators=(',', ':'), ensure_ascii=False)
        json.dump(xs, open(xp, 'w'), separators=(',', ':'), ensure_ascii=False)
        tot += len(lat)
    print('places', tot, 'coastal scores changed', changed)
    # the factor, category and profile texts in meta.json (same wording as build_data.py)
    for f in meta['factors']:
        if f['id'] == 'geo_coast_km':
            f['name'] = 'Distance to the sea or a large lake'
            f['description'] = ('Straight-line distance to the sea coastline (Natural Earth 1:50m) or to the shore of a large lake (natural lakes of 25 km² or more, '
                                'reservoirs of 100 km² or more; Natural Earth 1:10m), whichever is nearer. Set by build/build_shore.py. Scored 100 at 2 km or less, '
                                'falling to 0 at 60 km. Only used by the Coastal living profile.')
    meta['categoryLabels']['coast'] = 'Sea or lake shore'
    if 'coast' in meta['config'].get('terms', {}): meta['config']['terms']['coast'] = 'Sea or lake shore. Straight-line distance to the sea coast or to the shore of a lake of 25 km² or more (reservoirs 100 km²). Only the Coastal living profile uses it.'
    p = meta['config']['profiles'].get('coastal')
    if p:
        p['desc'] = 'Sea or large-lake shore distance leads, backed by environment, health, safety and costs. The sea and lakes of 25 km² or more count as a shore. Where neither is within 60 km, the app says so instead of inventing a ranking.'
        p['intro'] = 'Life by the water: the sea or a large lake first, then calm, health, safety and costs.'
    json.dump(meta, open(os.path.join(ROOT, 'data', 'meta.json'), 'w'), separators=(',', ':'), ensure_ascii=False)


if __name__ == '__main__':
    main()
