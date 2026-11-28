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
    t = time.time(); n = 0; part = dest.with_name(dest.name + '.part')
    with urllib.request.urlopen(req, timeout=timeout) as r, part.open('wb') as f:
        ct = r.headers.get('Content-Type', ''); cl = r.headers.get('Content-Length')
        while True:
            if left() < 30: raise TimeoutError('time budget reached during download')
            b = r.read(1 << 20)
            if not b: break
            n += len(b); f.write(b)
            if max_bytes and n > max_bytes: raise ValueError(f'larger than {max_bytes} bytes')
    if cl and cl.isdigit() and int(cl) != n: part.unlink(); raise ValueError(f'truncated: {n} of {cl} bytes')   # r20 (NZ10-05)
    if n == 0: part.unlink(); raise ValueError('empty response')
    part.replace(dest)
    head = dest.open('rb').read(256).lstrip().lower()
    if head.startswith(b'{') and (b'"error"' in head or b'"success":false' in head.replace(b' ', b'')): raise ValueError('error response, not data')
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
            if 'sup' in ci and r[ci['sup']]: continue      # r20 (NZ10-09): superseded municipalities are not current places
            la, lo = r[ci['lat']], r[ci['lon']]
            if isinstance(la, (int, float)) and isinstance(lo, (int, float)):
                out.append((c['cc'] + ':' + str(r[ci['oid']]), str(r[ci['gisco']] if 'gisco' in ci and r[ci['gisco']] else c['cc'] + '_' + str(r[ci['oid']])), float(la), float(lo)))
    return out

# ---------------------------------------------------------------- reductions
def safe_member(name: str) -> str:
    """NZ11-12: the whole member path, so equal file names in different folders never overwrite each other."""
    import re as _re
    return _re.sub(r'[^A-Za-z0-9._-]+', '~', name.strip('/'))[-180:]

def zip_tables(src: Path, out: Path, stem: str) -> list[str]:
    """Keep the attribute tables of an archive: CSV/TXT members as they are (gzip if large), DBF members converted to CSV."""
    made = []
    with zipfile.ZipFile(src) as z:
        for m in z.infolist():
            low = m.filename.lower()
            if low.endswith(('.csv', '.txt', '.xlsx', '.ods', '.json')):
                p = out / (stem + '__' + safe_member(m.filename) + ('.gz' if m.file_size > LIMIT // 2 else ''))
                with z.open(m) as a, (gzip.open(p, 'wb') if p.suffix == '.gz' else p.open('wb')) as b:
                    while True:
                        c = a.read(1 << 20)
                        if not c: break
                        b.write(c)
                if p.name in made: raise ValueError('two archive members map to the same output name: ' + p.name)
                made.append(p.name)
            elif low.endswith('.dbf'):
                p = out / (stem + '__' + safe_member(m.filename[:-4]) + '.csv.gz')
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
    # r20 (audit NZ10-03): unknown is not zero. Per LAU and variable: the sum of the numeric cells, how many cells were
    # numeric, and how many were suppressed or missing. The sum is published only when no cell was missing (complete);
    # otherwise the value is left empty and the counts say why. A measured zero stays zero.
    acc = {}
    for k, r in enumerate(keep):
        o = owner[k]
        if o < 0: continue
        a = acc.setdefault(o, {'cells': 0, 'v': [[0.0, 0, 0] for _ in num]})
        a['cells'] += 1
        for j, i in enumerate(num):
            raw = r[i].strip() if isinstance(r[i], str) else r[i]
            try: v = float(raw)
            except (TypeError, ValueError): a['v'][j][2] += 1; continue
            if v != v or v < 0: a['v'][j][2] += 1; continue   # NaN and negative codes mark suppressed cells
            a['v'][j][0] += v; a['v'][j][1] += 1
    p = out / 'census2021_grid_by_lau2024.csv.gz'; tmp = out / 'census2021_grid_by_lau2024.csv.gz.part'
    with gzip.open(tmp, 'wt', encoding='utf-8', newline='') as f:
        w = csv.writer(f); w.writerow(['GISCO_ID', 'cells'] + [x for i in num for x in (head[i], head[i] + '_cells_ok', head[i] + '_cells_missing')])
        for o, a in acc.items():
            row = [lau[idc].iloc[o], a['cells']]
            for sm, ok, miss in a['v']: row += [round(sm, 1) if miss == 0 and ok > 0 else '', ok, miss]
            w.writerow(row)
    tmp.replace(p)
    return {'file': p.name, 'lau_with_cells': len(acc), 'cells': len(keep), 'cells_outside_lau': int((owner < 0).sum()), 'variables': [head[i] for i in num]}

def sample_masked(ds, pts, band: int = 1):
    """Values at the points; outside the raster bounds, masked, nodata or non-finite cells are missing (None), a real
    measured zero stays zero (r20, audit NZ10-04)."""
    from pyproj import Transformer
    tr = Transformer.from_crs('EPSG:4326', ds.crs, always_xy=True)
    X, Y = tr.transform([p[3] for p in pts], [p[2] for p in pts]); b = ds.bounds; nod = ds.nodata
    inside = [(b.left <= x <= b.right and b.bottom <= y <= b.top) for x, y in zip(X, Y)]
    vals = [None] * len(pts); idx = [i for i, ok in enumerate(inside) if ok]
    sc = (ds.scales[band - 1] if ds.scales else 1.0) or 1.0; of = (ds.offsets[band - 1] if ds.offsets else 0.0) or 0.0
    for i, v in zip(idx, ds.sample([(X[i], Y[i]) for i in idx], indexes=band, masked=True)):
        import numpy as _np
        if bool(_np.ma.getmaskarray(v)[0]): continue
        x = float(v[0])
        if x != x or (nod is not None and x == nod) or abs(x) > 1e30: continue
        vals[i] = x * sc + of            # NZ11-05: the documented scale and offset give the physical value
    return vals

def pick_member(z: zipfile.ZipFile, pattern: str | None) -> list[str]:
    """Raster members chosen by an explicit pattern from the plan, never by size (r20, audit NZ10-04)."""
    import re as _re
    tifs = sorted(n for n in z.namelist() if n.lower().endswith(('.tif', '.tiff')))
    if not pattern: raise ValueError('no member pattern in the plan: ' + ', '.join(tifs[:8]))
    hit = [n for n in tifs if _re.search(pattern, n)]
    # NZ11-05: companion layers (uncertainty, error, count, flags, quality) are never the variable itself
    hit = [n for n in hit if not _re.search(r'(?i)(uncert|error|stdev|std_?dev|_sd\b|count|flag|quality|qa\b|mask|coverage)', Path(n).name)]
    if not hit: raise ValueError('no raster matches ' + pattern + ' among ' + ', '.join(tifs[:8]))
    return hit

def raster_pts(src: Path, out: Path, stem: str, pts, member: str | None = None, band: int = 1) -> dict:
    import rasterio
    path = src
    if zipfile.is_zipfile(src):
        with zipfile.ZipFile(src) as z:
            m = pick_member(z, member)
            if len(m) != 1: raise ValueError('the member pattern matches ' + str(len(m)) + ' rasters; it must name exactly one')
            path = out.parent / (stem + '.tif')
            with z.open(m[0]) as a, path.open('wb') as b:
                while True:
                    c = a.read(1 << 20)
                    if not c: break
                    b.write(c)
    with rasterio.open(path) as ds:
        if band < 1 or band > ds.count: raise ValueError(f'band {band} not in 1..{ds.count}')
        vals = sample_masked(ds, pts, band)
        meta = {'crs': str(ds.crs), 'res': list(ds.res), 'nodata': ds.nodata, 'band': band, 'scale': (ds.scales or [1])[band - 1], 'offset': (ds.offsets or [0])[band - 1], 'band_description': ds.descriptions[band - 1] if ds.descriptions else None, 'units': ds.units[band - 1] if ds.units else None, 'bounds': list(ds.bounds)}
    p = out / (stem + '_at_places.csv.gz'); n = miss = 0; tmp = out / (stem + '_at_places.csv.gz.part')
    with gzip.open(tmp, 'wt', encoding='utf-8', newline='') as f:
        w = csv.writer(f); w.writerow(['place_id', 'value'])
        for pt, v in zip(pts, vals):
            if v is None: miss += 1; continue
            w.writerow([pt[0], round(v, 3)]); n += 1
    tmp.replace(p)
    if path != src: path.unlink(missing_ok=True)
    return {'file': p.name, 'places_with_value': n, 'places_missing': miss, 'member': member, **meta}

def raster_multi(src: Path, out: Path, stem: str, pts, member: str | None = None, expect: int = 0) -> dict:
    """Every raster matching the plan's pattern (e.g. the 12 monthly layers), one column each; fewer layers than expected
    marks the result partial (r20, audit NZ10-05)."""
    import rasterio
    cols, vals = [], []
    with zipfile.ZipFile(src) as z:
        names = pick_member(z, member)
        for n in names:
            if left() < 45: break
            tmp = out.parent / ('_m_' + Path(n).name)
            with z.open(n) as a, tmp.open('wb') as b:
                while True:
                    c = a.read(1 << 20)
                    if not c: break
                    b.write(c)
            with rasterio.open(tmp) as ds: col = sample_masked(ds, pts, 1)
            tmp.unlink(); cols.append(Path(n).stem); vals.append(col)
    p = out / (stem + '_at_places.csv.gz'); tmp = out / (stem + '_at_places.csv.gz.part')
    with gzip.open(tmp, 'wt', encoding='utf-8', newline='') as f:
        w = csv.writer(f); w.writerow(['place_id'] + cols)
        for i, pt in enumerate(pts):
            row = [c[i] for c in vals]
            if any(x is not None for x in row): w.writerow([pt[0]] + ['' if x is None else round(x, 2) for x in row])
    tmp.replace(p)
    partial = bool(expect) and len(cols) != expect
    return {'file': p.name, 'layers': cols, 'expected_layers': expect or None, 'partial': partial}

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
    if need & {'census_grid'}: pip('numpy==2.1.3', 'shapely==2.0.6', 'pyogrio==0.10.0', 'geopandas==1.0.1')   # pinned (NZ10-10)
    if need & {'raster_pts', 'raster_multi'}: pip('numpy==2.1.3', 'rasterio==1.4.3', 'pyproj==3.7.0')
    pts = None
    for t in sorted(plan['tasks'], key=lambda t: t.get('order', 50)):
        tid = t['id']; rec = status['tasks'][tid] = {'source': t.get('source'), 'licence': t.get('licence'), 'files': []}
        if left() < 60: rec['status'] = 'skipped: time budget'; continue
        before = set(p.name for p in out.iterdir() if p.is_file())
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
                rec['result'] = raster_multi(got[0], out, tid, pts, t.get('member'), t.get('expect_layers', 0)); rec['status'] = 'partial' if rec['result']['partial'] else 'reduced'
            elif red == 'index':
                for d in got: d.replace(out / (d.name + '.html')); rec['status'] = 'kept (listing page for a later request)'
            elif red == 'raster_pts':
                if pts is None: pts = places(root)
                rec['result'] = raster_pts(got[0], out, tid, pts, t.get('member'), int(t.get('band', 1))); rec['status'] = 'reduced'
            for d in got:
                if d.exists() and red != 'keep' and not t.get('keep_raw_for'): d.unlink()
            # NZ11-04: complete inputs and non-empty outputs, or the task is not accepted
            opt = set(t.get('optional_urls', []))
            miss = [i for i, f in enumerate(rec['files']) if 'error' in f and i not in opt]
            made = sorted(set(p.name for p in out.iterdir() if p.is_file()) - before)
            rec['output_files'] = made
            st0 = rec.get('status', '')
            if miss and not st0.startswith('failed'): rec['status'] = f'partial: {len(miss)} of {len(t["urls"]) - len(opt)} required downloads failed'
            if red not in ('raw_only', 'index') and st0.startswith(('kept', 'reduced')) and not made: rec['status'] = 'failed: no usable output (nothing extracted or everything dropped)'
            if rec.get('dropped') and rec['status'].startswith(('kept', 'reduced')): rec['status'] = 'partial: ' + '; '.join(rec['dropped'])
            if red == 'zip_tables' and isinstance(rec.get('result'), list) and not rec['result']: rec['status'] = 'failed: the archive holds no supported tables'
        except Exception as e:
            rec['status'] = 'failed: ' + str(e)[:300]
        finally:
            print(tid, rec.get('status'), round(time.time() - T0), 's', flush=True)
    for p in out.iterdir():
        if p.is_file() and p.stat().st_size > LIMIT: p.unlink(); status.setdefault('dropped_over_limit', []).append(p.name)
    status['finished_at'] = now(); status['seconds'] = round(time.time() - T0); status['pip'] = LOG
    status['files'] = {p.name: {'bytes': p.stat().st_size, 'sha256': sha(p)} for p in sorted(out.iterdir()) if p.is_file()}
    status['note'] = 'Downloaded once from the listed official sources and reduced without estimation. Not published; folded into a release only after review and tests.'
    st = [v.get('status', '') for v in status['tasks'].values()]
    ok = sum(x.startswith(('kept', 'reduced', 'downloaded')) for x in st); bad = sum(x.startswith(('failed', 'skipped')) for x in st); part = sum(x.startswith('partial') for x in st)
    status['acceptance'] = {'tasks': len(st), 'completed': ok, 'partial': part, 'failed_or_skipped': bad, 'accepted_for_review': bad == 0 and part == 0,
                            'note': 'Raw acquisitions (kept) still need an adapter before any value reaches the site; production_writes stays false.'}
    (out / 'RUN_STATUS.json').write_text(json.dumps(status, indent=1), encoding='utf-8')
    return 0 if status['acceptance']['accepted_for_review'] else (1 if ok else 2)   # NZ11-04: anything incomplete is a non-zero result

if __name__ == '__main__':
    plan = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    raise SystemExit(run(plan, Path(sys.argv[3]) if len(sys.argv) > 3 else Path('.'), Path(sys.argv[2])))
