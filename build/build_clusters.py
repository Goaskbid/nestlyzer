#!/usr/bin/env python3
"""Industry clusters per place (2.10.2): where similar companies already operate.

Input  build/source/industry/*.csv (from the industry-structure brief), columns:
         cc, level (place | nuts3 | county | region), code (Nestlyzer oid without country prefix for places; NUTS3 or FIPS
         code otherwise), classification (NACE2 | NAICS), sector (NACE division '52' or section 'H'; NAICS 2-4 digits),
         measure (jobs | establishments), value, period, source_id
Output for every business profile p with a cluster definition below, in data/c/{CC}.json:
         fr['cluster_<p>']  location quotient = local share of the profile's industries / national share
         fs['cluster_<p>']  the same as a 0-100 percentile within the country (100 = strongest cluster)
       meta.json factors 'cluster_<p>' (category 'cluster', raw: used only through the profile's site-fit criterion)
The engine turns fs['cluster_<p>'] into the profile's 'cluster' category, which every business profile weights most
(35-40), so a place where the industry already concentrates rises above one that only has cheap land and a motorway.
Where no industry data exists yet, the category is absent and the other weights carry the score.
    python3 build/build_clusters.py"""
CLUSTER_W = {'biz_logistics': 30, 'biz_fulfilment': 20, 'biz_port_industry': 30, 'biz_energy_intensive': 30, 'biz_manufacturing': 30, 'biz_food_processing': 25,
             'biz_pharma_production': 25, 'biz_lab': 20, 'biz_tech': 20, 'biz_services': 15, 'biz_hq': 10, 'biz_contact_center': 10, 'biz_datacenter': 0, 'biz_finance': 20, 'biz_semis': 25, 'biz_auto': 30, 'biz_aero': 25, 'biz_cleantech': 15, 'biz_media': 20, 'biz_clinic': 10}
import csv, glob, json, os
from collections import defaultdict
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# industries that define each kind of site (NACE Rev. 2 divisions / sections and NAICS codes)
CLUSTER = {
    'biz_manufacturing':     {'NACE2': ['C'], 'NAICS': ['31', '32', '33']},
    'biz_energy_intensive':  {'NACE2': ['17', '19', '20', '23', '24'], 'NAICS': ['322', '324', '325', '327', '331']},
    'biz_port_industry':     {'NACE2': ['50', '52', '19', '20'], 'NAICS': ['483', '488', '493', '324', '325']},
    'biz_logistics':         {'NACE2': ['49', '52', '53'], 'NAICS': ['484', '488', '492', '493']},
    'biz_fulfilment':        {'NACE2': ['52', '53', '47'], 'NAICS': ['493', '492', '4541', '454']},
    'biz_food_processing':   {'NACE2': ['10', '11'], 'NAICS': ['311', '312']},
    'biz_pharma_production': {'NACE2': ['21', '26', '32'], 'NAICS': ['3254', '3345', '3391']},
    'biz_tech':              {'NACE2': ['58', '62', '63'], 'NAICS': ['5112', '513', '518', '5415']},
    'biz_datacenter':        {'NACE2': ['61', '63'], 'NAICS': ['517', '518']},
    'biz_lab':               {'NACE2': ['72', '21'], 'NAICS': ['5417', '3254']},
    'biz_finance':           {'NACE2': ['64', '65', '66'], 'NAICS': ['52']},
    'biz_semis':             {'NACE2': ['26'], 'NAICS': ['3344', '3345', '3341', '3342']},
    'biz_auto':              {'NACE2': ['29'], 'NAICS': ['3361', '3362', '3363']},
    'biz_aero':              {'NACE2': ['30'], 'NAICS': ['3364']},
    'biz_cleantech':         {'NACE2': ['27'], 'NAICS': ['335']},
    'biz_media':             {'NACE2': ['59', '58', '60'], 'NAICS': ['512', '5112', '515']},
    'biz_clinic':            {'NACE2': ['86'], 'NAICS': ['621', '622']},
    'biz_services':          {'NACE2': ['64', '65', '66', '69', '70', '82'], 'NAICS': ['52', '5411', '5412', '561']},
    'biz_hq':                {'NACE2': ['70', '64', '66'], 'NAICS': ['551', '52']},
    'biz_contact_center':    {'NACE2': ['82'], 'NAICS': ['5614']},
}
NACE_SECTION = {**{f'{d:02d}': 'A' for d in range(1, 4)}, **{f'{d:02d}': 'B' for d in range(5, 10)}, **{f'{d:02d}': 'C' for d in range(10, 34)}}

def matches(sector, codes, cls):
    s = str(sector)
    if cls == 'NACE2': return s in codes or NACE_SECTION.get(s) in codes
    return any(s.startswith(c) for c in codes)

def main():
    files = [f for f in glob.glob(os.path.join(ROOT, 'build', 'source', 'industry', '*.csv')) if not f.endswith('_place_area.csv')]
    if not files: print('clusters: no industry data yet (build/source/industry/*.csv)'); return
    # cc -> measure -> (level, code) -> sector -> value; one representation per cell (the contract keeps measures apart)
    data = defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))
    cls_of = {}
    for f in files:
        for r in csv.DictReader(open(f, encoding='utf-8-sig')):
            try: v = float(r['value'])
            except (TypeError, ValueError): continue
            if v <= 0: continue   # suppressed or absent cells stay out
            data[r['cc']][r['measure']][(r['level'], r['code'])][r['sector']] = v; cls_of[r['cc']] = r['classification']
    # verified place -> area links (point in polygon or official codes), e.g. build/source/industry/US_place_area.csv
    links = defaultdict(dict)
    for f in glob.glob(os.path.join(ROOT, 'build', 'source', 'industry', '*_place_area.csv')):
        cc = os.path.basename(f).split('_')[0]
        for r in csv.DictReader(open(f, encoding='utf-8')): links[cc][r['oid']] = (r['level'], r['code'])
    meta = json.load(open(os.path.join(ROOT, 'data', 'meta.json')))
    have = {f['id'] for f in meta['factors']}
    for p, codes in CLUSTER.items():
        fid = 'cluster_' + p
        if fid not in have:
            meta['factors'].append({'id': fid, 'name': 'Industry cluster for ' + meta['config']['profiles'].get(p, {}).get('name', p).lower(), 'category': 'cluster',
                                    'direction': 'higher', 'score_role': 'raw', 'unit': 'location quotient', 'source_name': 'industry structure (see Method: key figures)'})
    done = 0
    for cc, by_measure in data.items():
        meas = 'jobs' if 'jobs' in by_measure else 'establishments'   # employees preferred; never mixed with establishments
        areas, cls = by_measure[meas], cls_of[cc]
        pth = os.path.join(ROOT, 'data', 'c', cc + '.json'); sh = json.load(open(pth)); C = sh['cols']
        sh.pop('cl', None); sh.pop('cly', None)
        ioid, in3 = C.index('oid'), C.index('n3') if 'n3' in C else None
        def total(s):   # the published all-industry total; without one, the top-level sectors only (no nested double counting)
            if 'TOTAL' in s: return s['TOTAL']
            return sum(v for k, v in s.items() if (cls == 'NACE2' and len(k) == 1) or (cls == 'NAICS' and len(k) == 2))
        for p, codes in CLUSTER.items():
            fid = 'cluster_' + p
            cl = [c for c in codes.get(cls, [])]
            cl = [c for c in cl if not any(o != c and c.startswith(o) for o in cl)]   # 454 already contains 4541
            def part(s): return sum(v for k, v in s.items() if k != 'TOTAL' and (k in cl or (cls == 'NACE2' and NACE_SECTION.get(k) in cl and k not in cl and NACE_SECTION.get(k) not in s)))
            nat_k = sum(part(s) for s in areas.values()); nat_t = sum(total(s) for s in areas.values())
            if not nat_k or not nat_t: continue
            lq = {key: (part(s) / total(s)) / (nat_k / nat_t) for key, s in areas.items() if total(s)}
            col, lvl, area_of = [], [], []
            for r in sh['rows']:
                v = lq.get(('place', str(r[ioid]))); lv = 1 if v is not None else None
                ar = None
                if v is None and str(r[ioid]) in links[cc]: v = lq.get(links[cc][str(r[ioid])]); lv = 3 if v is not None else None; ar = links[cc][str(r[ioid])][1] if v is not None else None
                if v is None and in3 is not None and r[in3]: v = lq.get(('nuts3', r[in3])) or lq.get(('county', r[in3])); lv = 3 if v is not None else None
                col.append(None if v is None else round(v, 2)); lvl.append(lv); area_of.append(ar)
            vals = sorted(v for v in col if v is not None)
            if not vals: continue
            first, last = {}, {}
            for i, v in enumerate(vals): first.setdefault(v, i); last[v] = i
            rank = {v: (first[v] + last[v]) / 2 / max(1, len(vals) - 1) * 100 for v in first}   # ties share their mean rank
            fsv = [None if v is None else round(rank[v], 1) for v in col]
            if any(l == 1 for l in lvl):   # own place figures: full columns
                sh['fr'][fid] = col; sh['fs'][fid] = fsv; sh.setdefault('fl', {})[fid] = [l if l != 1 else None for l in lvl]
            else:   # county or district figures: stored once per area, each place carries its area code (file size)
                cl = sh.setdefault('cl', {'ids': [], 'areas': {}}); cl['ids'].append(fid); j = len(cl['ids']) - 1
                for i, r in enumerate(sh['rows']):
                    a = area_of[i]
                    if a and col[i] is not None:
                        cl['areas'].setdefault(a, {})[j] = [col[i], fsv[i]]
                for k in ('fr', 'fs'): sh[k].pop(fid, None)
                sh.get('fl', {}).pop(fid, None)
            done += 1
            print('  %s %s: %s, %d of %d places, national share %.2f%%' % (cc, p, meas, len(vals), len(col), 100 * nat_k / nat_t))
        if sh.get('cl'):
            sh['cl']['areas'] = {a: [v.get(j) for j in range(len(sh['cl']['ids']))] for a, v in sh['cl']['areas'].items()}
            sh['cly'] = [links[cc].get(str(r[ioid]), (None, None))[1] for r in sh['rows']]
        json.dump(sh, open(pth, 'w'), separators=(',', ':'), ensure_ascii=False)
    # with industry data in, the cluster criterion is added with a weight per project type
    if done:
        for p in CLUSTER:
            pr = meta['config']['profiles'].get(p)
            # weight per project (2.11, audit): concentration helps where suppliers and skills cluster (logistics, chemicals,
            # food, pharma), less for offices and contact centres, not at all for data centres (power and fibre decide)
            if pr and CLUSTER_W.get(p, 0): pr['weights']['cluster'] = CLUSTER_W[p]
    json.dump(meta, open(os.path.join(ROOT, 'data', 'meta.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    print('clusters:', done, 'profile x country columns from', len(files), 'files')

if __name__ == '__main__':
    main()
