#!/usr/bin/env python3
"""US industry structure (2.11.1): Census County Business Patterns 2023 -> the industry-structure contract.
Inputs (downloaded by the owner from census.gov, public domain):
  /path/cbp23co.txt   all counties (fipstate, fipscty, naics, emp_nf, emp, ..., est)
  county boundaries   GeoJSON with 5-digit FIPS ids (plotly/datasets geojson-counties-fips.json, from US Census cartographic
                      boundary files, public domain), used only to link Nestlyzer places to their county by point in polygon
Outputs:
  build/source/industry/US_CBP_2023.csv   cc,level,code,classification,sector,measure,value,period,source_id
      level=county, code=5-digit FIPS (text); sector = NAICS 2017 code at its own level (2, 3 or 4 digits) or TOTAL (the
      published all-industry row); measure = jobs (mid-March employees) or establishments. Only the codes Nestlyzer's cluster
      definitions read, plus TOTAL. Cells without a value are left out, never written as 0.
  build/source/industry/US_place_area.csv  oid,level,code: each US place and the county its centre lies in
    python3 build/build_us_cbp.py <cbp23co.txt> <counties.geojson>"""
import csv, json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'build'))
import importlib.util
spec = importlib.util.spec_from_file_location('bc', os.path.join(ROOT, 'build', 'build_clusters.py')); bc = importlib.util.module_from_spec(spec); spec.loader.exec_module(bc)
NEED = sorted({c for d in bc.CLUSTER.values() for c in d.get('NAICS', [])})
OUT = os.path.join(ROOT, 'build', 'source', 'industry'); os.makedirs(OUT, exist_ok=True)


def code_of(n):
    if n == '------': return 'TOTAL'
    c = n.replace('-', '').replace('/', '')
    return c if 2 <= len(c) <= 4 and n[len(c):].strip('-/') == '' else None


rows = 0
with open(os.path.join(OUT, 'US_CBP_2023.csv'), 'w', newline='') as fo:
    w = csv.writer(fo); w.writerow(['cc', 'level', 'code', 'classification', 'sector', 'measure', 'value', 'period', 'source_id'])
    for r in csv.DictReader(open(sys.argv[1], encoding='latin-1')):
        sec = code_of(r['naics'])
        if sec is None or (sec != 'TOTAL' and sec not in NEED): continue
        fips = r['fipstate'] + r['fipscty']
        if r['fipscty'] == '999': continue   # statewide, county not specified
        for meas, col in (('jobs', 'emp'), ('establishments', 'est')):
            try: v = int(r[col])
            except ValueError: continue
            if v > 0: w.writerow(['US', 'county', fips, 'NAICS', sec, meas, v, 2023, 'US_CBP_2023']); rows += 1
# place -> county by point in polygon (centre of the place)
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
G = json.load(open(sys.argv[2]))
polys, ids = [], []
for f in G['features']:
    polys.append(shape(f['geometry'])); ids.append(str(f['id']).zfill(5))
tree = STRtree(polys)
d = json.load(open(os.path.join(ROOT, 'data', 'c', 'US.json'))); C = d['cols']; io, la, lo = C.index('oid'), C.index('lat'), C.index('lon')
linked = 0
with open(os.path.join(OUT, 'US_place_area.csv'), 'w', newline='') as fo:
    w = csv.writer(fo); w.writerow(['oid', 'level', 'code'])
    for r in d['rows']:
        if r[la] is None: continue
        pt = Point(r[lo], r[la]); hit = None
        for i in tree.query(pt):
            if polys[i].contains(pt): hit = ids[i]; break
        if hit: w.writerow([r[io], 'county', hit]); linked += 1
print('CBP rows', rows, 'for', len(NEED), 'NAICS codes + TOTAL; places linked to a county:', linked, 'of', len(d['rows']))
