"""City zones (2.15.8): big cities split into their official districts, each ranked within its city per profile.

Inputs: build/source/zones/<city>.geojson (boundaries, see SOURCES.md) and the delivered district statistics
(build/source/deliveries/s8-20261107/05_districts_<city>.csv). Joins use official district numbers/codes only.
Output: data/zones.json with projected SVG paths, indicators, per-profile scores (0-100, percentiles within the city).
Scores compare districts of one city with each other; they are not comparable across cities and do not change place ranks.
"""
import csv, json, math, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Z = os.path.join(ROOT, 'build/source/zones'); D = os.path.join(ROOT, 'build/source/deliveries/s8-20261107')

BERLIN = ['Mitte', 'Friedrichshain-Kreuzberg', 'Pankow', 'Charlottenburg-Wilmersdorf', 'Spandau', 'Steglitz-Zehlendorf', 'Tempelhof-Schöneberg', 'Neukölln', 'Treptow-Köpenick', 'Marzahn-Hellersdorf', 'Lichtenberg', 'Reinickendorf']
VIENNA = ['Innere Stadt', 'Leopoldstadt', 'Landstraße', 'Wieden', 'Margareten', 'Mariahilf', 'Neubau', 'Josefstadt', 'Alsergrund', 'Favoriten', 'Simmering', 'Meidling', 'Hietzing', 'Penzing', 'Rudolfsheim-Fünfhaus', 'Ottakring', 'Hernals', 'Währing', 'Döbling', 'Brigittenau', 'Floridsdorf', 'Donaustadt', 'Liesing']
CITY = {  # key -> name, country, centre (well-known central square), file, key->delivered code
    'paris': ('Paris', 'FR', (48.8566, 2.3522), 'Hôtel de Ville', lambda k: k),
    'berlin': ('Berlin', 'DE', (52.5219, 13.4132), 'Alexanderplatz', lambda k: '%02d' % (BERLIN.index(k) + 1)),
    'vienna': ('Vienna', 'AT', (48.2085, 16.3731), 'Stephansplatz', lambda k: '9%02d00' % (VIENNA.index(k) + 1)),
    'barcelona': ('Barcelona', 'ES', (41.3870, 2.1700), 'Plaça de Catalunya', lambda k: '%02d' % int(k)),
    'budapest': ('Budapest', 'HU', (47.4979, 19.0540), 'Deák Ferenc tér', lambda k: '%02d' % int(k)),
}

def rows(city):
    f = os.path.join(D, '05_districts_%s.csv' % city)
    return list(csv.DictReader(open(f, encoding='utf-8'))) if os.path.exists(f) else []

def latest(R, ind, band=None):
    o = {}
    for r in R:
        if r.get('indicator_id') != ind or (band is not None and r.get('age_band') != band): continue
        try: v = float(r['value'])
        except Exception: continue
        c = r['geographic_code']; p = r.get('period', '')
        if c not in o or p > o[c][1]: o[c] = (v, p, r.get('source_name', ''), r.get('source_url', ''), r.get('geographic_unit', ''))
    return o

def pct(vals):
    s = sorted(v for v in vals.values() if v is not None); n = len(s)
    return {k: (None if v is None else (sum(1 for x in s if x < v) + 0.5 * (sum(1 for x in s if x == v) - 1)) / max(1, n - 1)) for k, v in vals.items()}

def main():
    out = {'note': 'Districts ranked within their own city from the official district figures listed. Not comparable across cities; place ranks are unchanged.', 'cities': []}
    for key, (name, cc, ctr, ctrn, tocode) in CITY.items():
        gj = json.load(open(os.path.join(Z, key + '.geojson'), encoding='utf-8')); R = rows(key)
        lat0 = ctr[0]; kx = math.cos(math.radians(lat0)) * 111.32; ky = 110.57
        feats = {}
        for ft in gj['features']:
            code = tocode(ft['properties']['key']); g = ft['geometry']
            P = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
            f = feats.setdefault(code, {'polys': [], 'gname': ft['properties'].get('name')})
            for p in P:
                if any(p[0] == q[0] for q in f['polys']): continue  # duplicated pieces in some sources
                f['polys'].append(p)
        # area (km2), centroid, distance to the centre
        allx = [pt[0] for f in feats.values() for p in f['polys'] for pt in p[0]]; ally = [pt[1] for f in feats.values() for p in f['polys'] for pt in p[0]]
        x0, x1, y0, y1 = min(allx), max(allx), min(ally), max(ally); W = 1000; S = W / ((x1 - x0) * kx); H = round((y1 - y0) * ky * S)
        X = lambda lon: (lon - x0) * kx * S; Y = lambda lat: (y1 - lat) * ky * S
        for code, f in feats.items():
            A = cx = cy = 0.0; d = ''
            for p in f['polys']:
                for i, ring in enumerate(p):
                    a = 0; sx = sy = 0
                    for j in range(len(ring) - 1):
                        xa, ya = ring[j][0] * kx, ring[j][1] * ky; xb, yb = ring[j + 1][0] * kx, ring[j + 1][1] * ky; cr = xa * yb - xb * ya; a += cr; sx += (xa + xb) * cr; sy += (ya + yb) * cr
                    a /= 2
                    if i == 0: A += abs(a); cx += sx / 6; cy += sy / 6
                    else: A -= abs(a)
                    pts = []
                    for q in ring[:-1]:
                        x_, y_ = X(q[0]), Y(q[1])
                        if not pts or abs(x_ - pts[-1][0]) + abs(y_ - pts[-1][1]) >= 3: pts.append((x_, y_))
                    if len(pts) >= 3: d += 'M' + 'L'.join('%d %d' % (round(a_), round(b_)) for a_, b_ in pts) + 'Z'
            sa = sum((lambda r: sum(r[j][0] * kx * r[j + 1][1] * ky - r[j + 1][0] * kx * r[j][1] * ky for j in range(len(r) - 1)) / 2)(p[0]) for p in f['polys'])
            clon, clat = cx / sa / kx, cy / sa / ky
            f.update(area=round(A, 2), d=d, lx=round(X(clon), 1), ly=round(Y(clat), 1), dist=round(math.hypot((clon - ctr[1]) * kx, (clat - ctr[0]) * ky), 1))
        # indicators
        pop = latest(R, 'population_total') or latest(R, 'population_registered')
        I = {}; src = {}
        def put(k, vals, label, unit, s):
            if vals: I[k] = (vals, label, unit); src[k] = s
        if pop:
            put('pop', {c: v[0] for c, v in pop.items()}, 'Residents', '', next(iter(pop.values())))
            put('dens', {c: pop[c][0] / feats[c]['area'] for c in pop if c in feats and feats[c]['area']}, 'Residents per km²', '', next(iter(pop.values())))
        if key == 'paris':
            k14 = latest(R, 'population_age_0_14'); k65 = latest(R, 'population_age_65plus'); p12 = {c: v for c, v in latest(R, 'population_total').items()}
            old = {}
            for r in R:
                if r['indicator_id'] == 'population_total' and r['period'] == '2017':
                    try: old[r['geographic_code']] = float(r['value'])
                    except Exception: pass
            put('kids', {c: 100 * k14[c][0] / pop[c][0] for c in k14 if c in pop}, 'Children 0–14', '%', next(iter(k14.values())) if k14 else None)
            put('old', {c: 100 * k65[c][0] / pop[c][0] for c in k65 if c in pop}, 'Aged 65+', '%', next(iter(k65.values())) if k65 else None)
            put('grow', {c: 100 * (pop[c][0] / old[c] - 1) for c in old if c in pop and old[c]}, 'Population change 2017–2023', '%', next(iter(pop.values())))
        if key == 'berlin':
            k14 = latest(R, 'population_age', '0-14'); k65 = latest(R, 'population_age', '65+'); ch = latest(R, 'population_change_5y'); ma = latest(R, 'mean_age')
            put('kids', {c: 100 * k14[c][0] / pop[c][0] for c in k14 if c in pop}, 'Children 0–14', '%', next(iter(k14.values())) if k14 else None)
            put('old', {c: 100 * k65[c][0] / pop[c][0] for c in k65 if c in pop}, 'Aged 65+', '%', next(iter(k65.values())) if k65 else None)
            put('grow', {c: v[0] for c, v in ch.items()}, 'Population change, 5 years', '%' if ch and abs(next(iter(ch.values()))[0]) < 50 else '', next(iter(ch.values())) if ch else None)
            put('age', {c: v[0] for c, v in ma.items()}, 'Mean age', ' yrs', next(iter(ma.values())) if ma else None)
        if key == 'barcelona':
            rm = latest(R, 'registered_mean_rent_per_m2'); mr = latest(R, 'registered_mean_monthly_rent')
            put('rent', {c: v[0] for c, v in rm.items()}, 'Rent per m² a month', '€', next(iter(rm.values())) if rm else None)
            put('rentm', {c: v[0] for c, v in mr.items()}, 'Average monthly rent', '€', next(iter(mr.values())) if mr else None)
        if key == 'budapest':
            pr = latest(R, 'used_home_transaction_price_per_m2')
            put('price', {c: v[0] for c, v in pr.items()}, 'Home price per m²', ' thousand HUF', next(iter(pr.values())) if pr else None)
        put('dist', {c: f['dist'] for c, f in feats.items()}, 'Distance to ' + ctrn, ' km', None)
        # grow: Berlin's change may be absolute residents; convert to % when it is a count
        if key == 'berlin' and 'grow' in I and I['grow'][2] == '':
            I['grow'] = ({c: 100 * v / (pop[c][0] - v) for c, v in I['grow'][0].items() if c in pop}, 'Population change, 5 years', '%')
        P = {k: pct(v[0]) for k, v in I.items()}
        W8 = {'young_family': {'kids': 1, 'dens': -1, 'rent': -1, 'rentm': -.5, 'price': -1, 'grow': .5, 'dist': .3},
              'young_professional': {'dist': -1, 'dens': 1, 'grow': .5, 'rent': -.5, 'price': -.5, 'old': -.3},
              'pensioner': {'old': 1, 'dens': -.7, 'rent': -1, 'price': -1, 'dist': -.5, 'age': .5}}
        Zs = []
        for code, f in sorted(feats.items()):
            sc = {}
            for prof, w in W8.items():
                t = n = 0
                for k, wt in w.items():
                    v = P.get(k, {}).get(code)
                    if v is None: continue
                    t += abs(wt) * (v if wt > 0 else 1 - v); n += abs(wt)
                sc[prof] = round(100 * t / n) if n else None
            nm = (pop.get(code) or [None] * 5)[4] or f['gname'] or code
            for pfx in ('Budapest ',): nm = nm.replace(pfx, '')
            Zs.append({'c': code, 'n': nm, 'd': f['d'], 'lx': f['lx'], 'ly': f['ly'], 'km2': f['area'], 'v': {k: (None if I[k][0].get(code) is None else round(I[k][0][code], 1)) for k in I}, 's': sc})
        for prof in W8:
            order = sorted([z for z in Zs if z['s'][prof] is not None], key=lambda z: -z['s'][prof])
            for i, z in enumerate(order): z.setdefault('r', {})[prof] = i + 1
        srcs = []
        for k, s in src.items():
            if s and s[2] and (s[2], s[3]) not in srcs: srcs.append((s[2], s[3]))
        out['cities'].append({'k': key, 'n': name, 'cc': cc, 'w': W, 'h': H, 'ctr': [round(X(ctr[1]), 1), round(Y(ctr[0]), 1), ctrn], 'ind': {k: [v[1], v[2]] for k, v in I.items()}, 'z': Zs, 'src': srcs,
                              'used': {p: [I[k][1] for k in w if k in I] for p, w in W8.items()}})
        print(key, len(Zs), 'zones', list(I), 'unmatched codes:', sorted(set(c for c in pop) - set(feats)) if pop else '-')
    json.dump(out, open(os.path.join(ROOT, 'data/zones.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('zones.json', os.path.getsize(os.path.join(ROOT, 'data/zones.json')))

if __name__ == '__main__': main()
