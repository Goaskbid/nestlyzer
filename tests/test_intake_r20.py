#!/usr/bin/env python3
"""r20 (audit NZ10-03/04/05/09): fault fixtures for the one-time data intake (build/collect/reduce_r20.py). Offline,
synthetic inputs only. Unknown stays unknown (never zero), rasters are read only where they have data and only from the
member the plan names, short or error downloads are refused, a partial monthly set is marked partial, an all-failed run
fails, superseded municipalities are not sampled.   python3 tests/test_intake_r20.py"""
import csv, gzip, importlib.util, io, json, os, pathlib, sys, tempfile, zipfile
from unittest.mock import patch
R = pathlib.Path(__file__).resolve().parents[1]
c = {}
try:
    import numpy as np, geopandas as gpd, rasterio
    from shapely.geometry import box
    from rasterio.transform import from_origin
except Exception as e:   # the libraries are installed on the runner by the intake itself; locally they may be missing
    print('SKIP intake fixtures: ' + str(e)); print('INTAKE TEST: PASS (skipped, geospatial libraries not installed)'); sys.exit(0)
spec = importlib.util.spec_from_file_location('intake', R / 'build/collect/reduce_r20.py'); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
T = pathlib.Path(tempfile.mkdtemp())
rows = lambda p: list(csv.DictReader(gzip.open(p, 'rt', newline='')))
def tif(p, val, w=2, h=2, nodata=None):
    with rasterio.open(p, 'w', driver='GTiff', height=h, width=w, count=1, dtype='float32', crs='EPSG:4326', transform=from_origin(0, 2, 1, 1), nodata=nodata) as ds: ds.write(np.full((1, h, w), val, dtype='float32'))
# census: suppressed cells stay unknown, a complete variable is summed, a measured zero stays zero
lau = T / 'lau.gpkg'; gpd.GeoDataFrame({'GISCO_ID': ['XX_1']}, geometry=[box(4000000, 3000000, 4003000, 3001000)], crs='EPSG:3035').to_file(lau, driver='GPKG')
z = T / 'g.zip'
with zipfile.ZipFile(z, 'w') as f: f.writestr('g.csv', 'GRD_ID,CNTR_ID,T,AGE_65,EMP,ZERO\nCRS3035RES1000mN3000000E4000000,XX,100,-9999,30,0\nCRS3035RES1000mN3000000E4001000,XX,200,-9999,-9999,0\n')
o = rows(T / m.census_grid(z, lau, T)['file'])[0]
c['census: all-suppressed variable is empty, not 0'] = o['AGE_65'] == '' and o['AGE_65_cells_missing'] == '2'
c['census: partly suppressed variable is empty with its counts (1 ok, 1 missing)'] = o['EMP'] == '' and o['EMP_cells_ok'] == '1' and o['EMP_cells_missing'] == '1'
c['census: complete variable summed (300), measured zero kept (0.0)'] = o['T'] == '300.0' and o['ZERO'] == '0.0'
# raster: outside the bounds is missing; the member is chosen by the plan, never by size
f = T / 'k.tif'; tif(f, 12)
r = m.raster_pts(f, T, 'k', [('XX:in', 'x', 1.5, 0.5), ('XX:out', 'y', 40.0, 40.0)]); o = rows(T / r['file'])
c['raster: a point outside the raster is missing, not 0'] = [x['place_id'] for x in o] == ['XX:in'] and r['places_missing'] == 1
tif(T / 'concentration.tif', 12); tif(T / 'uncertainty.tif', 99, 4, 4); za = T / 'air.zip'
with zipfile.ZipFile(za, 'w') as zz:
    for n in ('concentration.tif', 'uncertainty.tif'): zz.write(T / n, n)
try: m.raster_pts(za, T, 'air', [('XX:t', 't', 1.5, 0.5)]); c['raster: no member pattern is refused'] = False
except ValueError: c['raster: no member pattern is refused'] = True
r = m.raster_pts(za, T, 'air2', [('XX:t', 't', 1.5, 0.5)], member=r'^concentration\.tif$')
c['raster: the named member is read (12, not the larger 99)'] = float(rows(T / r['file'])[0]['value']) == 12
# monthly set: fewer layers than expected is partial
zm = T / 'months.zip'
with zipfile.ZipFile(zm, 'w') as zz:
    for mo in range(1, 13): p = T / f'wc_{mo:02d}.tif'; tif(p, mo); zz.write(p, p.name)
with patch.object(m, 'left', side_effect=[100, 40] + [40] * 20): r = m.raster_multi(zm, T, 'mon', [('XX:t', 't', 1.5, 0.5)], member=r'wc_\d{2}\.tif$', expect=12)
c['monthly: an interrupted set is marked partial'] = r['partial'] is True and len(r['layers']) < 12
# downloads: truncated and error bodies are refused
class Resp(io.BytesIO):
    def __init__(s, b, h): super().__init__(b); s.headers = h
    def __enter__(s): return s
    def __exit__(s, *a): return False
with patch.object(m.urllib.request, 'urlopen', return_value=Resp(b'a,b\n1,2\n', {'Content-Type': 'text/csv', 'Content-Length': '1000'})):
    try: m.fetch('https://example.invalid/x.csv', T / 'x.csv'); c['download: truncated file refused'] = False
    except ValueError: c['download: truncated file refused'] = True
with patch.object(m.urllib.request, 'urlopen', return_value=Resp(b'{"error":"quota"}', {'Content-Type': 'application/json'})):
    try: m.fetch('https://example.invalid/x.json', T / 'x.json'); c['download: error body refused'] = False
    except ValueError: c['download: error body refused'] = True
# an all-failed run fails
with patch.object(m.urllib.request, 'urlopen', side_effect=OSError('down')):
    code = m.run({'version': 't', 'tasks': [{'id': 'a', 'urls': ['https://example.invalid/a.csv'], 'reduce': 'keep'}]}, R, T / 'run')
c['run: all tasks failed gives a non-zero exit and accepted_for_review false'] = code == 2 and json.loads((T / 'run' / 'RUN_STATUS.json').read_text())['acceptance']['accepted_for_review'] is False
# superseded municipalities are not current places
P = m.places(R); ids = {p[0] for p in P}
d = json.load(open(R / 'data/c/CH.json')); ci = {k: i for i, k in enumerate(d['cols'])}
sup = {'CH:' + str(r[ci['oid']]) for r in d['rows'] if r[ci['sup']]}
c[f'places: {len(sup)} superseded Swiss municipalities are not sampled'] = not (ids & sup) and len(P) > 140000
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('INTAKE TEST:', 'PASS' if ok else 'FAIL', f'({sum(c.values())} of {len(c)} passed)'); sys.exit(0 if ok else 1)
