#!/usr/bin/env python3
"""Nestlyzer r20 data intake: download official open files ONCE and reduce the large ones to compact tables.

Run by .github/workflows/nz-collect-once.yml (through collect_once.py) after the r19 release is published, when
build/collect/acquisition_plan.json says "mode": "download_and_reduce". Bounded and read-only: one request per listed
file, no crawling, no schedule, a hard time budget inside the job's 30 minutes. Nothing is published; the results go to the
data-intake branch and are folded into a later release by hand, with tests.

Each task is independent; a failure is logged in RUN_STATUS.json and never stops the others. Output files stay under
95 MB (GitHub's file limit); a raw file that is larger is reduced here and the raw copy is not kept.
Reductions (all keyed by official codes, nothing is estimated):
  census_grid  EU Census 2021 1 km grid -> sums per LAU (point in the LAU 2024 polygon, both EPSG:3035)
  raster_pts   annual mean concentration rasters -> value at each Nestlyzer place centre
  hmlr         HM Land Registry price paid -> count, median and mean price per local authority district and year
  zip_tables   zip archives -> their attribute tables (.csv, .dbf as csv) only
"""
from __future__ import annotations
import csv, datetime as dt, glob, gzip, hashlib, io, json, os, statistics, subprocess, sys, time, urllib.request, zipfile
from pathlib import Path

UA = 'Nestlyzer-Official-Data-Intake/2.0 (one-off, user-initiated; bounded requests)'
LIMIT = 94 * 1024 * 1024
T0 = time.time()
BUDGET = float(os.environ.get('NZ_INTAKE_BUDGET_S', 22 * 60))   # the job has 30 minutes; checkout and push need the rest
LOG = []

def left() -> float: return BUDGET - (time.time() - T0)
def now() -> str: return dt.datetime.now(dt.timezone.utc).isoformat()
def sha(p: Path) -> str:
    h = hashlib.sha256()
    with p.open('rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''): h.update(c)
    return h.hexdigest()

def fetch(url: str, dest: Path, timeout: float = 60, max_bytes: int | None = None, html_ok: bool = False) -> dict:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    t = time.time(); n = 0
    with urllib.request.urlopen(req, timeout=timeout) as r, dest.open('wb') as f:
        ct = r.headers.get('Content-Type', '')
        while True:
            if left() < 30: raise TimeoutError('time budget reached during download')
            b = r.read(1 << 20)
            if not b: break
            n += len(b); f.write(b)
            if max_bytes and n > max_bytes: raise ValueError(f'larger than {max_bytes} bytes')
    head = dest.open('rb').read(256).lstrip().lower()
    if not html_ok and (head.startswith(b'<!doctype html') or head.startswith(b'<html')): raise ValueError('HTML page instead of a data file')
    return {'url': url, 'bytes': n, 'content_type': ct, 'seconds': round(time.time() - t, 1), 'sha256': sha(dest)}

def pip(*pk: str) -> bool:
    # Ubuntu runners mark the system Python as externally managed (PEP 668): try the user site with the override, then plain
    for extra in (['--user', '--break-system-packages'], ['--break-system-packages'], ['--user'], []):
        try:
            subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '--disable-pip-version-check', *extra, *pk], check=True, timeout=240, capture_output=True)
            import site, importlib; importlib.invalidate_caches()
            us = site.getusersitepackages()
            if us not in sys.path: sys.path.append(us)
            return True
        except Exception as e:
            LOG.append({'pip': pk, 'flags': extra, 'error': (getattr(e, 'stderr', b'') or b'')[-300:].decode('utf-8', 'replace') or str(e)[:300]})
    return False

def places(root: Path) -> list[tuple[str, str, float, float]]:
    out = []
    meta = json.loads((root / 'data/meta.json').read_text(encoding='utf-8'))
    for c in meta['countries']:
        f = root / 'data/c' / (c['cc'] + '.json')
        if not f.exists(): continue
        d = json.loads(f.read_text(encoding='utf-8')); ci = {k: i for i, k in enumerate(d['cols'])}
        for r in d['rows']:
            la, lo = r[ci['lat']], r[ci['lon']]
            if isinstance(la, (int, float)) and isinstance(lo, (int, float)):
                out.append((c['cc'] + ':' + str(r[ci['oid']]), str(r[ci['gisco']] if 'gisco' in ci and r[ci['gisco']] else c['cc'] + '_' + str(r[ci['oid']])), float(la), float(lo)))
    return out

# ---------------------------------------------------------------- reductions
def zip_tables(src: Path, out: Path, stem: str) -> list[str]:
    """Keep the attribute tables of an archive: CSV/TXT members as they are (gzip if large), DBF members converted to CSV."""
    made = []
    with zipfile.ZipFile(src) as z:
        for m in z.infolist():
            low = m.filename.lower()
            if low.endswith(('.csv', '.txt', '.xlsx', '.ods', '.json')):
                p = out / (stem + '__' + Path(m.filename).name + ('.gz' if m.file_size > LIMIT // 2 else ''))
                with z.open(m) as a, (gzip.open(p, 'wb') if p.suffix == '.gz' else p.open('wb')) as b:
                    while True:
                        c = a.read(1 << 20)
                        if not c: break
                        b.write(c)
                made.append(p.name)
            elif low.endswith('.dbf'):
                p = out / (stem + '__' + Path(m.filename).stem + '.csv.gz')
                with z.open(m) as a, gzip.open(p, 'wt', encoding='utf-8', newline='') as b: dbf_to_csv(a.read(), b)
                made.append(p.name)
    return made

def dbf_to_csv(raw: bytes, out) -> None:
    import struct
    n, hlen, rlen = struct.unpack('<IHH', raw[4:12]); fields = []; p = 32
    while raw[p] != 0x0D:
        name = raw[p:p + 11].split(b'\0')[0].decode('latin-1'); typ = chr(raw[p + 11]); ln = raw[p + 16]; fields.append((name, typ, ln)); p += 32
    w = csv.writer(out); w.writerow([f[0] for f in fields])
    for i in range(n):
        rec = raw[hlen + i * rlen: hlen + (i + 1) * rlen]
        if not rec or rec[0:1] == b'*': continue
        q = 1; row = []
        for name, typ, ln in fields:
            v = rec[q:q + ln]; q += ln
            try: s = v.decode('utf-8').strip()
            except UnicodeDecodeError: s = v.decode('latin-1').strip()
            row.append(s)
        w.writerow(row)

def census_grid(zsrc: Path, lau_gpkg: Path, out: Path) -> dict:
    """Sum every census grid variable per LAU 2024 polygon. Cells are assigned by their centre (EPSG:3035 grid IDs)."""
    import numpy as np, pyogrio, shapely
    lau = pyogrio.read_dataframe(lau_gpkg)
    idc = next(c for c in lau.columns if c.upper() in ('GISCO_ID',))
    geoms = np.array(lau.geometry.values); tree = shapely.STRtree(geoms)
    with zipfile.ZipFile(zsrc) as z:
        names = z.namelist(); csvs = [n for n in names if n.lower().endswith('.csv')]
        if csvs:
            src = max(csvs, key=lambda n: z.getinfo(n).file_size)
            rows = list(csv.reader(io.TextIOWrapper(z.open(src), encoding='utf-8-sig')))
            head, rows = rows[0], rows[1:]
        else:
            g = [n for n in names if n.lower().endswith('.gpkg')][0]; tmp = out.parent / 'census_tmp.gpkg'
            with z.open(g) as a, tmp.open('wb') as b:
                while True:
                    c = a.read(1 << 20)
                    if not c: break
                    b.write(c)
            df = pyogrio.read_dataframe(tmp, read_geometry=False); head = list(df.columns); rows = df.astype(str).values.tolist(); tmp.unlink()
    gi = next(i for i, h in enumerate(head) if h.upper() in ('GRD_ID', 'GRD_NEWID', 'GRID_ID'))
    num = [i for i, h in enumerate(head) if i != gi and h.upper() not in ('CNTR_ID', 'TOT_P_CI', 'LAND_SURFACE', 'POPULATED')]
    xs, ys, keep = [], [], []
    import re
    for r in rows:
        m = re.search(r'N(\d+)E(\d+)', r[gi])
        if not m: continue
        ys.append(int(m.group(1)) + 500); xs.append(int(m.group(2)) + 500); keep.append(r)
    pts = shapely.points(np.array(xs), np.array(ys))
    pi, gi2 = tree.query(pts, predicate='within')
    owner = np.full(len(pts), -1); owner[pi] = gi2
    acc = {}
    for k, r in enumerate(keep):
        o = owner[k]
        if o < 0: continue
        a = acc.setdefault(o, [0.0] * len(num) + [0])
        for j, i in enumerate(num):
            try: v = float(r[i])
            except ValueError: continue
            if v >= 0: a[j] += v      # negative codes mark confidential cells; they are not added
        a[-1] += 1
    p = out / 'census2021_grid_by_lau2024.csv.gz'
    with gzip.open(p, 'wt', encoding='utf-8', newline='') as f:
        w = csv.writer(f); w.writerow(['GISCO_ID'] + [head[i] for i in num] + ['cells'])
        for o, a in acc.items(): w.writerow([lau[idc].iloc[o]] + [round(x, 1) for x in a[:-1]] + [a[-1]])
    return {'file': p.name, 'lau_with_cells': len(acc), 'cells': len(keep), 'cells_outside_lau': int((owner < 0).sum()), 'variables': [head[i] for i in num]}

def raster_pts(src: Path, out: Path, stem: str, pts) -> dict:
    import rasterio
    from pyproj import Transformer
    path = src
    if zipfile.is_zipfile(src):
        with zipfile.ZipFile(src) as z:
            t = [n for n in z.namelist() if n.lower().endswith(('.tif', '.tiff'))]
            path = out.parent / (stem + '.tif')
            with z.open(max(t, key=lambda n: z.getinfo(n).file_size)) as a, path.open('wb') as b:
                while True:
                    c = a.read(1 << 20)
                    if not c: break
                    b.write(c)
    with rasterio.open(path) as ds:
        tr = Transformer.from_crs('EPSG:4326', ds.crs, always_xy=True)
        X, Y = tr.transform([p[3] for p in pts], [p[2] for p in pts]); nod = ds.nodata
        vals = [v[0] for v in ds.sample(zip(X, Y))]
        meta = {'crs': str(ds.crs), 'res': list(ds.res), 'nodata': nod, 'band_description': ds.descriptions[0] if ds.descriptions else None}
    p = out / (stem + '_at_places.csv.gz'); n = 0
    with gzip.open(p, 'wt', encoding='utf-8', newline='') as f:
        w = csv.writer(f); w.writerow(['place_id', 'value'])
        for pt, v in zip(pts, vals):
            v = float(v)
            if v != v or (nod is not None and v == nod) or v < 0: continue
            w.writerow([pt[0], round(v, 3)]); n += 1
    if path != src: path.unlink(missing_ok=True)
    return {'file': p.name, 'places_with_value': n, **meta}

def raster_multi(src: Path, out: Path, stem: str, pts) -> dict:
    """Every GeoTIFF inside an archive (e.g. 12 monthly climate normals) sampled at each place centre, one column each."""
    import rasterio
    from pyproj import Transformer
    cols, vals = [], []
    with zipfile.ZipFile(src) as z:
        names = sorted(n for n in z.namelist() if n.lower().endswith(('.tif', '.tiff')))
        for n in names:
            if left() < 45: break
            tmp = out.parent / ('_m_' + Path(n).name)
            with z.open(n) as a, tmp.open('wb') as b:
                while True:
                    c = a.read(1 << 20)
                    if not c: break
                    b.write(c)
            with rasterio.open(tmp) as ds:
                tr = Transformer.from_crs('EPSG:4326', ds.crs, always_xy=True); X, Y = tr.transform([p[3] for p in pts], [p[2] for p in pts]); nod = ds.nodata
                col = []
                for v in ds.sample(zip(X, Y)):
                    v = float(v[0]); col.append(None if (v != v or (nod is not None and v == nod) or abs(v) > 1e6) else round(v, 2))
            tmp.unlink(); cols.append(Path(n).stem); vals.append(col)
    p = out / (stem + '_at_places.csv.gz')
    with gzip.open(p, 'wt', encoding='utf-8', newline='') as f:
        w = csv.writer(f); w.writerow(['place_id'] + cols)
        for i, pt in enumerate(pts):
            row = [c[i] for c in vals]
            if any(x is not None for x in row): w.writerow([pt[0]] + ['' if x is None else x for x in row])
    return {'file': p.name, 'layers': cols}

def hmlr(url: str, out: Path) -> dict:
    """Stream the price paid file once; keep only per district and year: count, median, mean (standard sales, category A)."""
    req = urllib.request.Request(url, headers={'User-Agent': UA}); by = {}; n = 0
    with urllib.request.urlopen(req, timeout=60) as r:
        for row in csv.reader(io.TextIOWrapper(r, encoding='utf-8', errors='replace')):
            n += 1
            if n % 200000 == 0 and left() < 60: raise TimeoutError('time budget reached in price paid stream')
            if len(row) < 15: continue
            y = row[2][:4]
            if y < '2021' or row[14] != 'A': continue      # PPD category A = standard price paid
            try: by.setdefault((row[12], row[13], y), []).append(int(row[1]))
            except ValueError: pass
    p = out / 'hmlr_price_paid_by_district_year.csv'
    with p.open('w', encoding='utf-8', newline='') as f:
        w = csv.writer(f); w.writerow(['district', 'county', 'year', 'sales', 'median_gbp', 'mean_gbp'])
        for (d, c, y), v in sorted(by.items()): w.writerow([d, c, y, len(v), int(statistics.median(v)), round(sum(v) / len(v))])
    return {'file': p.name, 'rows_read': n, 'groups': len(by)}

# ---------------------------------------------------------------- driver
def run(plan: dict, root: Path, out: Path) -> int:
    out.mkdir(parents=True, exist_ok=True); raw = out.parent / 'raw'; raw.mkdir(exist_ok=True)
    status = {'started_at': now(), 'plan_version': plan.get('version'), 'tasks': {}}
    need = {t.get('reduce') for t in plan['tasks']}
    if need & {'census_grid'}: pip('numpy', 'shapely>=2', 'pyogrio', 'geopandas')
    if need & {'raster_pts', 'raster_multi'}: pip('rasterio', 'pyproj')
    pts = None
    for t in sorted(plan['tasks'], key=lambda t: t.get('order', 50)):
        tid = t['id']; rec = status['tasks'][tid] = {'source': t.get('source'), 'licence': t.get('licence'), 'files': []}
        if left() < 60: rec['status'] = 'skipped: time budget'; continue
        try:
            red = t.get('reduce', 'keep')
            if red == 'hmlr': rec['result'] = hmlr(t['urls'][0], out); rec['status'] = 'reduced'; continue
            got = []
            for i, u in enumerate(t['urls']):
                d = raw / f"{tid}_{i}{t.get('ext', '')}"
                try: rec['files'].append(fetch(u, d, max_bytes=t.get('max_bytes'), html_ok=red == 'index')); got.append(d)
                except Exception as e: rec['files'].append({'url': u, 'error': str(e)[:300]})
            if not got: rec['status'] = 'failed: nothing downloaded'; continue
            if red == 'keep':
                for d in got:
                    if d.stat().st_size <= LIMIT: d.replace(out / d.name)
                    else:
                        g = out / (d.name + '.gz')
                        with d.open('rb') as a, gzip.open(g, 'wb', compresslevel=9) as b: b.write(a.read())
                        if g.stat().st_size > LIMIT: g.unlink(); rec.setdefault('dropped', []).append(d.name + ' (over 94 MB even gzipped)')
                rec['status'] = 'kept'
            elif red == 'raw_only':
                rec['status'] = 'downloaded for a later task (not kept)'; continue
            elif red == 'zip_tables':
                rec['result'] = sum((zip_tables(d, out, f'{tid}_{i}') for i, d in enumerate(got)), []); rec['status'] = 'reduced'
            elif red == 'census_grid':
                lau = raw / t['lau_from']
                if not lau.exists(): rec['status'] = 'failed: LAU polygons missing'; continue
                if not zipfile.is_zipfile(got[0]): rec['status'] = 'failed: census file is not a zip archive'; continue
                rec['result'] = census_grid(got[0], lau, out); rec['status'] = 'reduced'
            elif red == 'raster_multi':
                if pts is None: pts = places(root)
                rec['result'] = raster_multi(got[0], out, tid, pts); rec['status'] = 'reduced'
            elif red == 'index':
                for d in got: d.replace(out / (d.name + '.html')); rec['status'] = 'kept (listing page for a later request)'
            elif red == 'raster_pts':
                if pts is None: pts = places(root)
                rec['result'] = raster_pts(got[0], out, tid, pts); rec['status'] = 'reduced'
            for d in got:
                if d.exists() and red != 'keep' and not t.get('keep_raw_for'): d.unlink()
        except Exception as e:
            rec['status'] = 'failed: ' + str(e)[:300]
        finally:
            print(tid, rec.get('status'), round(time.time() - T0), 's', flush=True)
    for p in out.iterdir():
        if p.is_file() and p.stat().st_size > LIMIT: p.unlink(); status.setdefault('dropped_over_limit', []).append(p.name)
    status['finished_at'] = now(); status['seconds'] = round(time.time() - T0); status['pip'] = LOG
    status['files'] = {p.name: {'bytes': p.stat().st_size, 'sha256': sha(p)} for p in sorted(out.iterdir()) if p.is_file()}
    status['note'] = 'Downloaded once from the listed official sources and reduced without estimation. Not published; folded into a release only after review and tests.'
    (out / 'RUN_STATUS.json').write_text(json.dumps(status, indent=1), encoding='utf-8')
    return 0

if __name__ == '__main__':
    plan = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    raise SystemExit(run(plan, Path(sys.argv[3]) if len(sys.argv) > 3 else Path('.'), Path(sys.argv[2])))
