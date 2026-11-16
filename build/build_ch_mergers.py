"""Swiss municipality mergers and the Moutier canton change, 2021-2026 (2.15.28).

The Swiss roster is on the 2021 boundaries. This step brings it to the official state of 1 January 2026:
- absorption (a municipality joins an existing one): the former municipality is marked superseded;
- founding (several municipalities form a new one with a new BFS number): the largest former municipality becomes the
  new municipality (new number and name, combined population and area, population-weighted centre); its local figures
  describe that former municipality until statistics for the new boundary are published; the others are superseded;
- Moutier moved from the canton of Bern to the canton of Jura on 1 January 2026 (new BFS number 6831).
Former names stay searchable and lead to the new municipality; the former outlines on the map carry the new number,
so the whole merged area shows as one place.

Facts only (which official numbers ended and which replaced them, with dates): BFS official municipality register,
mutation records (agvchapp.bfs.admin.ch), cross-checked year by year. Idempotent; runs after build_data.py.
"""
import json, os, csv
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(R, 'data')
# (date, successor BFS, successor name, [former BFS numbers], founding?)
M = [
    ('2021-04-18', 5239, 'Tresa', [5178, 5202, 5213, 5222], True),
    ('2021-07-01', 5656, 'Hautemorges', [5421, 5478, 5494, 5500, 5625, 5644], True),
    ('2021-07-01', 5511, 'Assens', [5513], False),
    ('2022-01-01', 2275, 'Murten', [661, 2259, 2260], False),
    ('2022-01-01', 4185, 'Böztal', [4094, 4096, 4097, 4167], True),
    ('2022-01-01', 4324, 'Zurzach', [4301, 4302, 4308, 4315, 4316, 4317, 4322, 4323], True),
    ('2022-01-01', 5805, 'Oron', [5788], False),
    ('2022-01-01', 5892, 'Blonay - Saint-Légier', [5881, 5888], True),
    ('2022-04-10', 5240, 'Val Mara', [5195, 5197, 5219], True),
    ('2022-05-01', 3112, 'Schwende-Rüte', [3103, 3105], True),
    ('2023-01-01', 291, 'Andelfingen', [21, 30, 32], True),
    ('2023-01-01', 546, 'Münchenbuchsee', [536], False),
    ('2023-01-01', 3396, 'Neckertal', [3372, 3375, 3378], True),
    ('2023-01-01', 6743, 'Les Breuleux', [6744], False),
    ('2023-01-01', 4139, 'Menziken', [4133], False),
    ('2023-01-01', 4186, 'Herznach-Ueken', [4166, 4179], True),
    ('2023-01-01', 6811, 'Damphreux-Lugnez', [6787, 6793], True),
    ('2024-01-01', 767, 'Reutigen', [947], False),
    ('2024-01-01', 992, 'Wangen an der Aare', [993], False),
    ('2024-01-01', 2465, 'Buchegg', [2456], False),
    ('2024-01-01', 6812, 'Basse-Vendline', [6773, 6775], True),
    ('2024-01-01', 4021, 'Baden', [4042], False),
    ('2025-01-01', 3901, 'Chur', [3932], False),
    ('2025-01-01', 1065, 'Root', [1057], False),
    ('2025-01-01', 2097, 'Rue', [2061, 2066, 2072], False),
    ('2025-01-01', 2102, 'Ursy', [2089], False),
    ('2025-01-01', 2239, 'Grolley-Ponthaux', [2200, 2217], True),
    ('2025-01-01', 6513, 'Laténa', [6453, 6454, 6459, 6461], True),
    ('2025-04-06', 5073, 'Giornico', [5064], False),
    ('2025-04-06', 5079, 'Quinto', [5078], False),
    ('2025-04-06', 5395, 'Lema', [5146, 5149, 5181, 5200, 5207], True),
    ('2026-01-01', 2056, 'Fétigny-Ménières', [2016, 2027], True),
    ('2026-01-01', 2262, 'Gurmels', [2278], False),
    ('2026-01-01', 2525, 'Kriegstetten', [2520, 2529], False),
    ('2026-01-01', 4095, 'Brugg', [4122], False),
    ('2026-01-01', 6831, 'Moutier', [700], True),   # canton change Bern -> Jura, new number
]
sp = os.path.join(D, 'c', 'CH.json'); sh = json.load(open(sp)); C = {c: i for i, c in enumerate(sh['cols'])}
rows = sh['rows']; by = {str(r[C['oid']]): r for r in rows}
name_of = {o: r[C['name']] for o, r in by.items()}
old_name = {}; redirect = {}; newsup = 0; founded = 0
for date, sid, sname, prev, found in M:
    s = str(sid)
    if found:
        host = by.get(s)
        preds = [by[str(p)] for p in prev if str(p) in by]
        if host is None:
            host = max(preds, key=lambda r: r[C['pop']] or 0)
            pop = sum(r[C['pop']] or 0 for r in preds); area = round(sum(r[C['area']] or 0 for r in preds), 2)
            if pop:
                host[C['lat']] = round(sum(r[C['lat']] * (r[C['pop']] or 0) for r in preds) / pop, 5)
                host[C['lon']] = round(sum(r[C['lon']] * (r[C['pop']] or 0) for r in preds) / pop, 5)
            # the population series becomes the sum of the former municipalities, year by year, so chart and count agree
            idx = {id(r): i for i, r in enumerate(rows)}; T = sh.get('trend') or []
            ser = [((T[idx[id(r)]] or {}).get('annual_population') or []) for r in preds]
            if T and all(ser):
                yrs = sorted(set.intersection(*[{e['year'] for e in q} for q in ser]))
                comb = [{'year': y, 'population': sum(next(e['population'] for e in q if e['year'] == y) for q in ser)} for y in yrs]
                if comb:
                    hi = idx[id(host)]; T[hi] = dict(T[hi] or {}, annual_population=comb); pop = comb[-1]['population']
            old_name[s] = (str(host[C['oid']]), host[C['name']])
            host[C['oid']] = s; host[C['name']] = sname; host[C['pop']] = pop; host[C['area']] = area
            host[C['dens']] = round(pop / area, 2) if area else host[C['dens']]
            if sid == 6831:
                ju = next(r for r in rows if r[C['rc']] == 'JU')
                host[C['rc']] = 'JU'; host[C['n3']] = ju[C['n3']]; host[C['regionName']] = ju[C['regionName']]
            by[s] = host; founded += 1
        host[C['sup']] = 0
        for p in prev:
            q = by.get(str(p))
            if q is not None and q is not host and not q[C['sup']]: q[C['sup']] = 1; newsup += 1
    else:
        for p in prev:
            q = by.get(str(p))
            if q is not None and not q[C['sup']]: q[C['sup']] = 1; newsup += 1
    for p in prev: redirect[str(p)] = (s, sname, date)
json.dump(sh, open(sp, 'w'), separators=(',', ':'), ensure_ascii=False)
act = sum(1 for r in rows if not r[C['sup']])
# search: former names lead to the new municipality
qp = os.path.join(D, 'search.json'); sj = json.load(open(qp))
cur = {str(r[C['oid']]): r for r in rows if not r[C['sup']]}
keep = []; done = set()
for e in sj['rows']:
    if e[0] != 'CH': keep.append(e); continue
    o = str(e[1])
    if len(e) >= 6: keep.append(e); done.add(o); continue           # former name, already redirected
    if o in redirect and o not in cur:
        if e[2] != redirect[o][1]: keep.append(['CH', o, e[2], 0] + list(redirect[o][:2])); done.add(o)
        continue
    if o in cur: e[2] = cur[o][C['name']]; e[3] = cur[o][C['pop']]
    keep.append(e)
have = {str(e[1]) for e in keep if e[0] == 'CH' and len(e) < 6}
for s, r in cur.items():
    if s not in have: keep.append(['CH', s, r[C['name']], r[C['pop']]])
for o, (s, sname, date) in sorted(redirect.items()):
    nm = name_of.get(o)
    if o not in done and nm and nm != sname: keep.append(['CH', o, nm, 0, s, sname])
sj['rows'] = keep; json.dump(sj, open(qp, 'w'), separators=(',', ':'), ensure_ascii=False)
# map (2.15.29): the FSO generalised boundaries of 2026 (opendata.swiss "terms_by": open use, source required, commercial
# use allowed), via the swiss-maps package; they already carry the merged municipalities under their new numbers
tp = os.path.join(D, 'geo', 'ch.topo.json'); moved = 0
t = json.load(open(os.path.join(R, 'build', 'source', 'swissmaps_2026_ch-combined.topo.json')))
t['objects'] = {k: v for k, v in t['objects'].items() if k in ('municipalities', 'cantons', 'lakes', 'country')}
t['source'] = 'Swiss Federal Statistical Office (FSO), GEOSTAT generalised boundaries 2026'
json.dump(t, open(tp, 'w'), separators=(',', ':'))
# meta: Swiss count and per-source place counts
mp = os.path.join(D, 'meta.json'); meta = json.load(open(mp))
for c in meta['countries']:
    if c['cc'] == 'CH': prev_n = c['n']; c['n'] = act
for f in meta['factors']:
    b = (f.get('by_country') or {}).get('CH')
    if b and b.get('places') == prev_n: b['places'] = act
json.dump(meta, open(mp, 'w'), ensure_ascii=False, separators=(',', ':'))
# roster record for future rebuilds of the raw roster
rp = os.path.join(R, 'build', 'source', 'roster', 'roster_fixes.csv')
known = {(x['cc'], x['oid']) for x in csv.DictReader(open(rp, encoding='utf-8'))}
with open(rp, 'a', encoding='utf-8', newline='') as f:
    w = csv.writer(f)
    for date, sid, sname, prev, found in M:
        for p in prev:
            if ('CH', str(p)) in known: continue
            w.writerow(['CH', p, name_of.get(str(p), ''), 'a', sid, 'no' if found else 'yes', '', '', 'CH_BFS_MUTATIONS',
                        f'{"founded" if found else "merged into"} {sname} (BFS {sid}) on {date}; build_ch_mergers.py applies it'])
print(f'CH mergers: {founded} new municipalities, {newsup} former ones superseded, FSO 2026 outlines installed, {act} active')
