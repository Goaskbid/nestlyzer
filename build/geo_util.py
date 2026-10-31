"""Small geometry helpers used by the Nestlyzer data build (no external GIS stack needed
beyond shapely + numpy)."""
import math
import numpy as np

R_KM = 6371.0088
LAT0, LON0 = math.radians(52.0), math.radians(10.0)  # EPSG:3035 centre (spherical LAEA)


def laea(lon, lat):
    """Spherical Lambert azimuthal equal-area, km. Accepts scalars or numpy arrays."""
    lon = np.radians(np.asarray(lon, dtype=float))
    lat = np.radians(np.asarray(lat, dtype=float))
    k = np.sqrt(2.0 / (1.0 + math.sin(LAT0) * np.sin(lat) + math.cos(LAT0) * np.cos(lat) * np.cos(lon - LON0)))
    x = R_KM * k * np.cos(lat) * np.sin(lon - LON0)
    y = R_KM * k * (math.cos(LAT0) * np.sin(lat) - math.sin(LAT0) * np.cos(lat) * np.cos(lon - LON0))
    return x, y


def haversine_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 2 * R_KM * np.arcsin(np.sqrt(np.minimum(1.0, a)))


def topo_arcs(topo):
    """Decode quantized TopoJSON arcs to absolute coordinates."""
    tr = topo.get('transform')
    out = []
    for arc in topo['arcs']:
        pts = []
        x = y = 0
        for p in arc:
            if tr:
                x += p[0]; y += p[1]
                pts.append((x * tr['scale'][0] + tr['translate'][0], y * tr['scale'][1] + tr['translate'][1]))
            else:
                pts.append((p[0], p[1]))
        out.append(pts)
    return out


def _ring(arcs, idxs):
    ring = []
    for i in idxs:
        a = arcs[i] if i >= 0 else list(reversed(arcs[~i]))
        if ring:
            a = a[1:]
        ring.extend(a)
    return ring


def topo_geom_polys(arcs, geom):
    """Return list of polygons, each a list of rings (lists of (lon,lat))."""
    t = geom['type']
    if t == 'Polygon':
        return [[_ring(arcs, r) for r in geom['arcs']]]
    if t == 'MultiPolygon':
        return [[_ring(arcs, r) for r in poly] for poly in geom['arcs']]
    return []


# Natural Earth 1:10m files (public domain), downloaded once into NE_DIR (default: .cache/ne in the project).
# The version is pinned to a fixed commit so a rebuild always measures against the same coastline and roads.
NE_COMMIT = 'ca96624a56bd078437bca8184e78163e5039ad19'  # natural-earth-vector master on 11 Oct 2026
def ne_path(name):
    import os, urllib.request
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    d = os.environ.get('NE_DIR') or ('/home/claude/ext/ne' if os.path.isdir('/home/claude/ext/ne') else os.path.join(root, '.cache', 'ne'))
    p = os.path.join(d, name + '.geojson')
    if not os.path.exists(p):
        os.makedirs(d, exist_ok=True)
        url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/%s/geojson/%s.geojson' % (os.environ.get('NE_REF', NE_COMMIT), name)
        print('downloading', url)
        tmp = p + '.part'; urllib.request.urlretrieve(url, tmp); os.replace(tmp, p)
    return p
