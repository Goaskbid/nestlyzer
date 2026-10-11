#!/usr/bin/env python3
"""Extra open-data parameters for every place (data/x/{CC}.json, aligned row by row with data/c/{CC}.json).

Sources (all open data):
  Natural Earth 1:10m (public domain): lakes (+Europe supplement), rivers (+Europe supplement),
    railroads, roads (expressways), ports, admin-0 countries, populated places (capitals)
  Mapzen/Tilezen terrain via pvlib's bundled 5-arc-minute altitude grid (coarse: describes the
    surrounding terrain, not the exact village altitude)
  Köppen-Geiger climate zones (Rubel & Kottek 2010/Rubel et al. 2017) via the kgcpy package
Derived from Nestlyzer's own records: neighbours and residents within 10 km, population rank,
and "twins": the most similar places in other countries.

Natural Earth files are cached in NE_DIR (downloaded from github.com/nvkelso/natural-earth-vector).
Run: python3 build/build_extra.py   (about 2 to 4 minutes)
"""
import json, os, sys, math, glob, urllib.request
import numpy as np
from shapely.geometry import shape, Point, MultiLineString, LineString
from shapely.ops import unary_union, transform
from shapely.strtree import STRtree
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
from geo_util import laea, haversine_km, ne_path

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BBOX = (-32, 26, 45, 72)  # lon0, lat0, lon1, lat1: Europe incl. Canaries, Azores, Iceland, Cyprus
A3 = {'AL': 'ALB', 'AT': 'AUT', 'BE': 'BEL', 'BG': 'BGR', 'CH': 'CHE', 'CY': 'CYP', 'CZ': 'CZE', 'DE': 'DEU', 'DK': 'DNK', 'EE': 'EST', 'EL': 'GRC', 'ES': 'ESP', 'FI': 'FIN', 'FR': 'FRA', 'HR': 'HRV', 'HU': 'HUN', 'IE': 'IRL', 'IS': 'ISL', 'IT': 'ITA', 'LI': 'LIE', 'LT': 'LTU', 'LU': 'LUX', 'LV': 'LVA', 'MK': 'MKD', 'MT': 'MLT', 'NL': 'NLD', 'NO': 'NOR', 'PL': 'POL', 'PT': 'PRT', 'RO': 'ROU', 'RS': 'SRB', 'SE': 'SWE', 'SI': 'SVN', 'SK': 'SVK', 'UK': 'GBR'}
CAP_PREF = {'NLD': 'Amsterdam'}  # constitutional capital
CNAME = {'AL': 'Albania', 'AT': 'Austria', 'BE': 'Belgium', 'BG': 'Bulgaria', 'CH': 'Switzerland', 'CY': 'Cyprus', 'CZ': 'Czechia', 'DE': 'Germany', 'DK': 'Denmark', 'EE': 'Estonia', 'EL': 'Greece', 'ES': 'Spain', 'FI': 'Finland', 'FR': 'France', 'HR': 'Croatia', 'HU': 'Hungary', 'IE': 'Ireland', 'IS': 'Iceland', 'IT': 'Italy', 'LI': 'Liechtenstein', 'LT': 'Lithuania', 'LU': 'Luxembourg', 'LV': 'Latvia', 'MK': 'North Macedonia', 'MT': 'Malta', 'NL': 'the Netherlands', 'NO': 'Norway', 'PL': 'Poland', 'PT': 'Portugal', 'RO': 'Romania', 'RS': 'Serbia', 'SE': 'Sweden', 'SI': 'Slovenia', 'SK': 'Slovakia', 'UK': 'the United Kingdom'}
METRO_NAME = {'Lisboa': 'Lisbon', 'Roma': 'Rome', 'Milano': 'Milan', 'Napoli': 'Naples', 'Torino': 'Turin', 'Firenze': 'Florence', 'Venezia': 'Venice', 'Genova': 'Genoa', 'München': 'Munich', 'Köln': 'Cologne', 'Nürnberg': 'Nuremberg', 'Wien': 'Vienna', 'Praha': 'Prague', 'Warszawa': 'Warsaw', 'Kraków': 'Krakow', 'København': 'Copenhagen', 'Göteborg': 'Gothenburg', 'Sevilla': 'Seville', 'Bruxelles': 'Brussels', 'Brussels': 'Brussels', 'Antwerpen': 'Antwerp', 'Gent': 'Ghent', 'Athína': 'Athens', 'Athinai': 'Athens', 'Thessaloniki': 'Thessaloniki', 'Bucuresti': 'Bucharest', 'Beograd': 'Belgrade', 'Den Haag': 'The Hague', "'s-Gravenhage": 'The Hague', 'Genève': 'Geneva', 'Zürich': 'Zurich', 'Luzern': 'Lucerne'}
LAND_KINDS = {'Range/mtn', 'Coast', 'Geoarea', 'Delta', 'Plain', 'Plateau', 'Island', 'Island group'}
LAND_NAME = {'French Riviera': 'Riviera', 'Appennino Ligure': 'Apennines', 'Cruach nam Miseag': 'Grampian Mountains', 'Fasta Åland': 'Åland', 'Böhmerwald': 'Bohemian Forest', 'Pico Island': 'Pico', 'Santa Maria Island': 'Santa Maria', 'São Miguel Island': 'São Miguel', 'Terceira Island': 'Terceira', 'North-Estonian Coastal Plain': 'Baltic coastal plain'}
LAND_SKIP = {'Iberian Peninsula', 'Great Britain', 'Ireland', 'Iceland', 'Cyprus', 'Malta', 'Calabria', 'Scandinavia', 'British Isles', 'Europe', 'Asia', 'Africa', 'Vatnajökull', 'Anatolia', 'Mesopotamia', 'Levant'}
LAND_ORDER = {'Alps': 0, 'Pyrenees': 0, 'Carpathian Mountains': 0, 'Dinaric Alps': 0, 'North European Plain': 9, 'Great Hungarian Plain': 8, 'Baltic coastal plain': 8}
SEA_NAME = {'Waddenzee': 'Wadden Sea', 'Inner Seas': 'Hebrides sea', 'Golfe du Lion': 'Gulf of Lion', 'Stettiner Haff': 'Szczecin Lagoon', 'Mecklenburger Bucht': 'Bay of Mecklenburg'}


def ne(name):
    return json.load(open(ne_path(name)))


def proj(g):
    return transform(lambda x, y, z=None: laea(x, y), g)


def in_bbox(g):
    b = g.bounds
    return not (b[2] < BBOX[0] or b[0] > BBOX[2] or b[3] < BBOX[1] or b[1] > BBOX[3])


def layer(names, keep=lambda p: True):
    geoms, props = [], []
    for n in names:
        for f in ne(n)['features']:
            if not f.get('geometry'): continue
            p = f['properties']
            if not keep(p): continue
            g = shape(f['geometry'])
            if g.is_empty or not in_bbox(g): continue
            geoms.append(proj(g)); props.append(p)
    return geoms, props


def nearest(points, geoms):
    tree = STRtree(geoms)
    idx, dist = tree.query_nearest(points, return_distance=True, all_matches=False)
    out_i = np.full(len(points), -1); out_d = np.full(len(points), np.nan)
    out_i[idx[0]] = idx[1]; out_d[idx[0]] = dist
    return out_i, out_d


def main():
    shards = {}
    for p in sorted(glob.glob(os.path.join(ROOT, 'data', 'c', '*.json'))):
        sh = json.load(open(p)); shards[sh['cc']] = sh
    recs = []  # (cc, row index, lon, lat, pop, dens, growth, sup)
    for cc, sh in shards.items():
        C = {c: i for i, c in enumerate(sh['cols'])}
        g = sh['fs'].get('population_growth_pct') or [None] * len(sh['rows'])
        for i, r in enumerate(sh['rows']):
            recs.append((cc, i, r[C['lon']], r[C['lat']], r[C['pop']] or 0, r[C['dens']], (sh['fr'].get('population_growth_pct') or [None] * len(sh['rows']))[i], bool(C.get('sup') is not None and r[C['sup']])))
    n = len(recs)
    has = np.array([r[2] is not None and r[3] is not None for r in recs])
    lon = np.array([r[2] if r[2] is not None else 0 for r in recs], float)
    lat = np.array([r[3] if r[3] is not None else 0 for r in recs], float)
    X, Y = laea(lon, lat)
    pts = [Point(x, y) for x, y in zip(X, Y)]
    ix = np.where(has)[0]
    P = [pts[i] for i in ix]
    print('places', n, 'with location', len(ix))
    res = {k: np.full(n, np.nan) for k in ['alt', 'relief', 'lake_km', 'river_km', 'rail_km', 'mway_km', 'port_km', 'cap_km', 'border_km', 'nb10', 'pop10', 'metro_km']}
    names = {k: [None] * n for k in ['kg', 'lake', 'river', 'port', 'border', 'metro', 'land', 'sea']}

    # terrain (coarse) and climate zone
    import h5py, pvlib, kgcpy
    alt = h5py.File(os.path.join(os.path.dirname(pvlib.__file__), 'data', 'Altitude.h5'), 'r')['Altitude'][:].astype(float)
    alt[alt == 255] = np.nan; alt = alt * 28 - 450
    from pvlib.location import _degrees_to_index
    for i in ix:
        a, b = _degrees_to_index(lat[i], 'latitude'), _degrees_to_index(lon[i], 'longitude')
        w = alt[a - 1:a + 2, b - 1:b + 2]
        if np.isfinite(alt[a, b]): res['alt'][i] = max(0.0, alt[a, b])   # mean terrain height of the ~9 km cell
        if np.isfinite(w).any(): res['relief'][i] = np.nanmax(w) - np.nanmin(w)  # height range within ~15 km
    from kgcpy import lookupCZ
    for i in ix:
        try: names['kg'][i] = lookupCZ(float(lat[i]), float(lon[i]))
        except Exception: pass
    print('terrain + climate done')

    def run(key, namekey, geoms, props, namefn=lambda p: p.get('name')):
        j, d = nearest(P, geoms)
        for k, i in enumerate(ix):
            res[key][i] = d[k]
            if namekey and j[k] >= 0: names[namekey][i] = namefn(props[j[k]])
        print(key, 'done', len(geoms), 'features')

    lg, lp = layer(['ne_10m_lakes', 'ne_10m_lakes_europe'], lambda p: (p.get('featurecla') or '').startswith(('Lake', 'Reservoir')))
    run('lake_km', 'lake', lg, lp)
    rg, rp = layer(['ne_10m_rivers_lake_centerlines', 'ne_10m_rivers_europe'], lambda p: (p.get('featurecla') or '').startswith('River') and p.get('name'))
    run('river_km', 'river', rg, rp)
    tg, tp = layer(['ne_10m_railroads'])
    run('rail_km', None, tg, tp)
    mg, mp = layer(['ne_10m_roads'], lambda p: str(p.get('expressway')) == '1')
    run('mway_km', None, mg, mp)
    pg, pp = layer(['ne_10m_ports'])
    run('port_km', 'port', pg, pp)

    # capitals and land borders, per country
    places = ne('ne_10m_populated_places_simple')['features']
    caps = {}
    for f in places:
        p = f['properties']
        if p['featurecla'].startswith('Admin-0 capital') and p['adm0_a3'] in A3.values():
            if p['adm0_a3'] in CAP_PREF and p['name'] != CAP_PREF[p['adm0_a3']]: continue
            if p['featurecla'] == 'Admin-0 capital alt' and p['adm0_a3'] in caps: continue
            caps[p['adm0_a3']] = (p['name'], p['latitude'], p['longitude'])
    countries, cname = {}, {}
    for f in ne('ne_10m_admin_0_countries')['features']:
        p = f['properties']; a3 = p.get('ADM0_A3') or p.get('adm0_a3')
        g = shape(f['geometry'])
        if in_bbox(g): countries[a3] = proj(g); cname[a3] = p.get('NAME_EN') or p.get('NAME')
    keys = list(countries)
    ctree = STRtree([countries[k] for k in keys])
    by_cc = {}
    for i in ix: by_cc.setdefault(recs[i][0], []).append(i)
    cap_names = {}
    for cc, idxs in by_cc.items():
        a3 = A3[cc]
        if a3 in caps:
            nm, clat, clon = caps[a3]; cap_names[cc] = nm
            res['cap_km'][idxs] = haversine_km(lat[idxs], lon[idxs], clat, clon)
        own = countries.get(a3)
        if own is None: continue
        near = [keys[k] for k in ctree.query(own.buffer(2)) if keys[k] != a3]
        lines, owners = [], []
        ob = own.boundary
        for k in near:
            seg = ob.intersection(countries[k].buffer(1.0))
            if seg.is_empty: continue
            lines.append(seg); owners.append(k)
        if not lines: continue
        j, d = nearest([pts[i] for i in idxs], lines)
        for m, i in enumerate(idxs):
            res['border_km'][i] = d[m]
            if j[m] >= 0: names['border'][i] = cname.get(owners[j[m]], owners[j[m]])
    print('capitals + borders done')

    # greater areas: every place within reach of a large city core (Natural Earth populated places, metro population)
    # radius grows with the metro size: 20 km for 250,000 people, 30 km for 1 million, up to 60 km for the largest
    metros = []
    for f in places:
        p = f['properties']
        if (p.get('pop_max') or 0) < 250000: continue
        if not (BBOX[0] <= p['longitude'] <= BBOX[2] and BBOX[1] <= p['latitude'] <= BBOX[3]): continue
        if p.get('adm0_a3') not in A3.values(): continue
        _nm = p['name'].replace('\u200e', '').strip()
        metros.append((METRO_NAME.get(_nm, _nm), p['latitude'], p['longitude'], p['pop_max'], {v: k for k, v in A3.items()}.get(p.get('adm0_a3'))))
    metros.sort(key=lambda m: -m[3])
    keep = []  # drop a core that sits inside a bigger metro's inner 12 km (same agglomeration, two NE points)
    for m in metros:
        if any(haversine_km(np.array([m[1]]), np.array([m[2]]), k[1], k[2])[0] < 12 for k in keep): continue
        keep.append(m)
    metros = keep
    mx, my = laea(np.array([m[2] for m in metros]), np.array([m[1] for m in metros]))
    mrad = np.clip(30 * (np.array([m[3] for m in metros]) / 1e6) ** 0.3, 20, 60)
    mtree = cKDTree(np.c_[mx, my])
    metro_pop = {}
    for i in ix:
        cand = mtree.query_ball_point([X[i], Y[i]], 60.0)
        best, bscore = None, 9
        for c in cand:
            d = math.hypot(X[i] - mx[c], Y[i] - my[c])
            if d <= mrad[c] and d / mrad[c] < bscore: best, bscore = c, d / mrad[c]
        if best is not None:
            res['metro_km'][i] = math.hypot(X[i] - mx[best], Y[i] - my[best])
            names['metro'][i] = metros[best][0]; metro_pop[metros[best][0]] = metros[best][3]
    print('greater areas done', len(metros), 'cores', sum(1 for i in ix if names['metro'][i]), 'places inside one')

    # landscape: mountain ranges, islands, coasts and named areas (Natural Earth geography regions)
    lg2 = []
    for f in ne('ne_10m_geography_regions_polys')['features']:
        p = f['properties']
        if not f.get('geometry') or p.get('FEATURECLA') not in LAND_KINDS: continue
        nm = LAND_NAME.get(p.get('NAME_EN') or p.get('NAME'), p.get('NAME_EN') or p.get('NAME'))
        if nm in LAND_SKIP: continue
        g = shape(f['geometry'])
        if in_bbox(g): lg2.append((nm, proj(g), p.get('FEATURECLA')))
    ltree = STRtree([g for _, g, _ in lg2])
    for i in ix:
        # Natural Earth draws mountain ranges generously; only claim a range where the terrain is actually hilly
        hit = [lg2[k][0] for k in ltree.query(pts[i], predicate='intersects') if lg2[k][2] not in ('Range/mtn', 'Plateau') or (np.isfinite(res['relief'][i]) and res['relief'][i] >= 450)]
        if hit: names['land'][i] = ', '.join(sorted(set(hit), key=lambda h: (LAND_ORDER.get(h, 5), h))[:2])
    print('landscape done', sum(1 for i in ix if names['land'][i]))

    # name of the nearest sea (Natural Earth marine areas), for places within 40 km of the coast
    mg2, mp2 = layer(['ne_10m_geography_marine_polys'], lambda p: p.get('featurecla') not in ('river', 'reef') and p.get('name'))
    jj, dd = nearest(P, mg2)
    coastv = res_coast(shards, recs)
    for k, i in enumerate(ix):
        if jj[k] >= 0 and np.isfinite(coastv[i]) and coastv[i] <= 40: names['sea'][i] = SEA_NAME.get(mp2[jj[k]]['name'], mp2[jj[k]]['name'])
    print('seas done')

    # neighbours and residents within 10 km (own data, all countries; superseded rows excluded)
    act = np.array([has[i] and not recs[i][7] for i in range(n)])
    ai = np.where(act)[0]
    tree = cKDTree(np.c_[X[ai], Y[ai]])
    popa = np.array([recs[i][4] for i in ai], float)
    for i in ix:
        nb = tree.query_ball_point([X[i], Y[i]], 10.0)
        res['nb10'][i] = len(nb) - (1 if act[i] else 0)
        res['pop10'][i] = popa[nb].sum()
    print('neighbours done')

    # twins: most similar places in other countries (standardised features)
    def col(k):
        a = np.array([recs[i][k] if recs[i][k] is not None else np.nan for i in range(n)], float); return a
    pop = np.log10(np.maximum(col(4), 1)); dens = np.log10(np.maximum(np.nan_to_num(col(5), nan=1), 1)); gro = np.clip(np.nan_to_num(col(6), nan=0), -15, 15)
    coast = np.log1p(np.nan_to_num(res_coast(shards, recs), nan=200))
    feats = np.c_[pop * 2.0, dens * 1.2, gro / 5, coast, np.log1p(np.nan_to_num(res['alt'], nan=200).clip(0)) * 0.8,
                  np.log1p(np.nan_to_num(res['lake_km'], nan=100)) * 0.6, np.log1p(np.nan_to_num(res['pop10'], nan=0)) * 0.7]
    ok = act & has
    oi = np.where(ok)[0]
    F = feats[oi]; F = (F - F.mean(0)) / (F.std(0) + 1e-9)
    kt = cKDTree(F)
    twins = [None] * n
    _, nn = kt.query(F, k=400)
    for row, i in enumerate(oi):
        out = []
        seen = {recs[i][0]}
        for j in nn[row][1:]:
            r = recs[oi[j]]
            if r[0] in seen: continue
            seen.add(r[0]); out.append(r[0] + ':' + str(shards[r[0]]['rows'][r[1]][0]))
            if len(out) == 3: break
        twins[i] = out
    # places whose nearest 400 are all in their own country: search the other countries only
    occ = np.array([recs[i][0] for i in oi])
    for cc in sorted(set(occ)):
        need = [row for row, i in enumerate(oi) if occ[row] == cc and len(twins[i]) < 3]
        if not need: continue
        other = np.where(occ != cc)[0]
        t2 = cKDTree(F[other])
        _, nn2 = t2.query(F[need], k=200)
        for q, row in enumerate(need):
            i = oi[row]; out = list(twins[i]); seen = {cc} | {t.split(':')[0] for t in out}
            for j in nn2[q]:
                r = recs[oi[other[j]]]
                if r[0] in seen: continue
                seen.add(r[0]); out.append(r[0] + ':' + str(shards[r[0]]['rows'][r[1]][0]))
                if len(out) == 3: break
            twins[i] = out
    print('twins done', sum(1 for i in oi if len(twins[i]) == 3), 'of', len(oi), 'with 3 twins')

    # write per-country files
    outdir = os.path.join(ROOT, 'data', 'x'); os.makedirs(outdir, exist_ok=True)
    rnd = {'alt': 0, 'relief': 0, 'lake_km': 1, 'river_km': 1, 'rail_km': 1, 'mway_km': 1, 'port_km': 1, 'cap_km': 0, 'border_km': 1, 'nb10': 0, 'pop10': 0, 'metro_km': 1}
    pos = {}
    for k, r in enumerate(recs): pos.setdefault(r[0], []).append(k)
    # the country that holds the core of each greater area (the place closest to the city centre)
    metro_home = {m[0]: m[4] for m in metros}
    summary = {}
    for cc, ks in pos.items():
        strs, sidx = [], {}
        def S(v):
            if v is None: return None
            if v not in sidx: sidx[v] = len(strs); strs.append(v)
            return sidx[v]
        cols = {}
        for key, nd in rnd.items():
            cols[key] = [None if not np.isfinite(res[key][k]) else (int(round(res[key][k])) if nd == 0 else round(float(res[key][k]), nd)) for k in ks]
        for key in names: cols[key] = [S(names[key][k]) for k in ks]
        cols['twin'] = [twins[k] for k in ks]
        mset = sorted({names['metro'][k] for k in ks if names['metro'][k]}, key=lambda m: (-metro_pop.get(m, 0), m))
        out = {'cc': cc, 'n': len(ks), 'cols': cols, 'strs': strs, 'capital': cap_names.get(cc), 'metros': [[m, metro_pop.get(m), sum(1 for k in ks if names['metro'][k] == m), metro_home.get(m) == cc] for m in mset]}
        json.dump(out, open(os.path.join(outdir, cc + '.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
        cov = {key: round(100 * sum(1 for v in cols[key] if v is not None) / len(ks)) for key in list(rnd) + list(names)}
        summary[cc] = cov
    meta = {'version': 1, 'sources': [
        {'id': 'ne10m', 'name': 'Natural Earth 1:10m cultural and physical vectors (lakes, rivers, railroads, roads, ports, countries, populated places)', 'licence': 'Public domain', 'url': 'https://www.naturalearthdata.com/'},
        {'id': 'terrain', 'name': 'Mapzen/Tilezen terrain, 5 arc-minute grid as bundled with pvlib (coarse, describes the surrounding terrain)', 'licence': 'Open data, attribution per source (EU-DEM, SRTM, ETOPO1 and others)', 'url': 'https://github.com/tilezen/joerd/blob/master/docs/attribution.md'},
        {'id': 'koppen', 'name': 'Köppen-Geiger climate classification (Rubel et al. 2017), via kgcpy', 'licence': 'Open, cite Rubel F., Brugger K., Haslinger K., Auer I. (2017)', 'url': 'https://github.com/cwru-sdle/kgcpy'}],
        'capitals': {cc: v for cc, v in cap_names.items()}, 'coverage': summary}
    json.dump(meta, open(os.path.join(outdir, '_meta.json'), 'w'), indent=1, ensure_ascii=False)
    # greater areas are searchable like regions ("Greater Hamburg", "Lisbon")
    sp = os.path.join(ROOT, 'data', 'search.json'); sj = json.load(open(sp))
    sj['regions'] = [r for r in sj['regions'] if not str(r[1]).startswith('M:')]
    for cc, ks in pos.items():
        cnt = {}
        for k in ks:
            if names['metro'][k]: cnt[names['metro'][k]] = cnt.get(names['metro'][k], 0) + 1
        home = {m for m in cnt if metro_home.get(m) == cc}
        cname = CNAME.get(cc, cc)
        for m, c in cnt.items():
            if c >= 3: sj['regions'].append([cc, 'M:' + m, 'Greater ' + m + ('' if m in home else ' (part in ' + cname + ')'), c])
    json.dump(sj, open(sp, 'w'), separators=(',', ':'), ensure_ascii=False)
    print('written', len(pos), 'countries')


def res_coast(shards, recs):
    out = []
    for cc, i, *_ in recs:
        v = shards[cc]['fr'].get('geo_coast_km'); out.append(v[i] if v and v[i] is not None else np.nan)
    return np.array(out, float)


if __name__ == '__main__':
    main()
