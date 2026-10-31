#!/usr/bin/env python3
"""Coastlines and country borders for the start-page globe (run once; output kept in the repository).

Source: Natural Earth 1:50m coastline and 1:50m land borders (public domain), simplified for a globe
about 1,000 pixels wide. Output data/globe-lines.bin:
  u32 coast segments | u32 border segments | int16 [lon*180, lat*180, lon*180, lat*180] per segment (coast first)."""
import json, os, struct, sys
from shapely.geometry import shape, LineString, MultiLineString
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geo_util import ne_path

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def segs(name, tol, min_len):
    out = []
    for f in json.load(open(ne_path(name)))['features']:
        g = shape(f['geometry'])
        for ln in (g.geoms if isinstance(g, MultiLineString) else [g]):
            if ln.length < min_len: continue
            s = ln.simplify(tol, preserve_topology=False)
            c = list(s.coords)
            for a, b in zip(c, c[1:]):
                if abs(a[0] - b[0]) > 180: continue          # never draw across the date line
                out.append((a, b))
    return out

coast = segs('ne_50m_coastline', 0.12, 0.6)
border = segs('ne_50m_admin_0_boundary_lines_land', 0.12, 0.3)
q = lambda v: max(-32767, min(32767, round(v * 180)))
buf = bytearray(struct.pack('<II', len(coast), len(border)))
for a, b in coast + border: buf += struct.pack('<4h', q(a[0]), q(a[1]), q(b[0]), q(b[1]))
open(os.path.join(ROOT, 'data', 'globe-lines.bin'), 'wb').write(buf)
print('coast segments', len(coast), 'border segments', len(border), 'bytes', len(buf))
