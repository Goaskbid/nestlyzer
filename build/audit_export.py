#!/usr/bin/env python3
"""Public, read-only coverage audit of the deployed data (2.10.1). Generated from the build with local scripts only.
Writes data/audit/:
  coverage.csv        country x purpose x indicator: kind, source levels, unique source areas, mapped / displayed / scored
                      places, periods and the reason places are missing
  kpi_coverage.csv    country x business KPI (config.bizKpis): available or not, at which level, how many records
  industry_coverage.csv  country: which industry-classification data exists (NACE / NAICS / sector shares) and its level
  unresolved_geographies.csv  source geographies from the collected data not yet linked to any place
  README.txt          what each column means
    python3 build/audit_export.py"""
import csv, json, os, re, shutil, sys
from collections import defaultdict
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'audit'); os.makedirs(OUT, exist_ok=True)
meta = json.load(open(os.path.join(ROOT, 'data', 'meta.json')))
VERSION = re.search(r"'(\d+\.\d+\.\d+)'", open(os.path.join(ROOT, 'build', 'build_site.mjs')).read()).group(1)
fmeta = {f['id']: f for f in meta['factors']}
P = meta['config']['profiles']
biz_cats = {c for k, p in P.items() if p.get('business') for c in p['weights']}
hh_cats = {c for k, p in P.items() if not p.get('business') for c in p['weights']}
LV = {1: 'place', 3: 'district', 2: 'region', 9: 'national'}
cov, kpi, ind = [], [], []
for c in meta['countries']:
    cc = c['cc']; d = json.load(open(os.path.join(ROOT, 'data', 'c', cc + '.json'))); n = len(d['rows'])
    fr, fl, rg = d.get('fr', {}), d.get('fl', {}), d.get('rg', {})
    for fid in sorted(set(fr) | set(rg)):
        f = fmeta.get(fid)
        if not f: continue
        col = fr.get(fid) or []
        have = sum(1 for v in col if v is not None)
        lvls, areas = set(), 0
        if fid in rg:
            for k, t in rg[fid].items(): lvls.add({'n3': 'district', 'n2': 'region', 'rc': 'region', 'n1': 'region', 'cc': 'national'}.get(k, k)); areas += len(t) if isinstance(t, dict) else 1
        if have and fid not in rg: lvls.add('place'); areas = have
        lvf = fl.get(fid)
        if lvf and isinstance(lvf, list): lvls |= {LV.get(x, str(x)) for x in set(lvf) if x}
        b = (f.get('by_country') or {}).get(cc) or {}
        purpose = '+'.join(x for x, s in (('household', hh_cats), ('business', biz_cats)) if f['category'] in s) or 'context'
        scored = have if f.get('score_role') == 'scored' else 0
        miss = '' if have >= n else ('not published for these places' if have else 'not published at place level in this country')
        cov.append({'cc': cc, 'purpose': purpose, 'indicator': fid, 'label': f['name'], 'kind': 'factor (' + (f.get('score_role') or 'raw') + ')', 'source_levels': ' '.join(sorted(lvls)),
                    'unique_source_areas': areas, 'mapped_places': have, 'displayed_places': have, 'scored_places': scored, 'places_in_country': n,
                    'periods': b.get('period') or f.get('source_period') or '', 'missing_reason': miss})
    xp = os.path.join(ROOT, 'data', 'x', cc + '.json')
    cx = (json.load(open(xp)).get('ctx') or {}) if os.path.exists(xp) else {}
    linked = defaultdict(set)
    for oid, a in (cx.get('places') or {}).items():
        for g, rel in a: linked[g].add(oid)
    rows = d['rows']; cols = d['cols']; ir, i3 = cols.index('rc') if 'rc' in cols else None, cols.index('n3') if 'n3' in cols else None
    for g, (k, v) in (cx.get('regions') or {}).items():
        ix = ir if k == 'rc' else i3
        if ix is not None: linked[g] |= {str(i) for i, r in enumerate(rows) if r[ix] == v}
    agg = defaultdict(lambda: {'levels': set(), 'geos': set(), 'places': set(), 'periods': set(), 'label': '', 'purpose': set(), 'national': False})
    for o in cx.get('records', []):
        a = agg[o['indicator_id']]; a['label'] = o.get('label') or a['label']; a['levels'].add(o['source_geo_level']); a['geos'].add(o['source_geo_id']); a['periods'].add(str(o.get('reference_period')))
        a['purpose'] |= set(o.get('purpose_tags') or [])
        occ = (o.get('dimensions') or {}).get('occupation')
        if occ: agg[o['indicator_id'] + ' ' + occ]  # KPI matching sees the occupation too
        if occ: b2 = agg[o['indicator_id'] + ' ' + occ]; b2['label'] = o.get('label'); b2['levels'].add(o['source_geo_level']); b2['geos'].add(o['source_geo_id']); b2['periods'].add(str(o.get('reference_period'))); b2['places'] |= linked.get(o['source_geo_id'], set()); b2['purpose'] |= set(o.get('purpose_tags') or [])
        if o['source_geo_level'] in ('country', 'multicountry_aggregate', 'country_context', 'country_scenario'): a['national'] = True
        a['places'] |= linked.get(o['source_geo_id'], set())
    for iid, a in sorted(agg.items()):
        mp = n if a['national'] else len(a['places'])
        cov.append({'cc': cc, 'purpose': '+'.join(sorted(a['purpose'])) or 'context', 'indicator': iid, 'label': a['label'], 'kind': 'context record (not scored)', 'source_levels': ' '.join(sorted(a['levels'])),
                    'unique_source_areas': len(a['geos']), 'mapped_places': mp, 'displayed_places': mp, 'scored_places': 0, 'places_in_country': n,
                    'periods': ' '.join(sorted(a['periods']))[:80], 'missing_reason': '' if mp >= n else ('source area not linked to a place yet' if not mp else 'published for part of the country')})
    for kid, k in json.load(open(os.path.join(ROOT, 'data', 'kpis.json')))['kpis'].items():
        re_k = re.compile(k['match'], re.I)
        hit = [(iid, a) for iid, a in agg.items() if re_k.search(iid)]
        fhit = [fid for fid in set(fr) | set(rg) if re_k.search(fid) and (any(v is not None for v in (fr.get(fid) or [])) or fid in rg)]
        lv = sorted({l for _, a in hit for l in a['levels']} | {('place' if fid in fr and fid not in rg else 'region or national') for fid in fhit})
        kpi.append({'cc': cc, 'kpi': kid, 'name': k['name'], 'for': k.get('audience', ''), 'domain': k.get('domain', ''), 'available': 'yes' if hit or fhit else 'no', 'levels': ' '.join(lv), 'indicators': ' '.join([i for i, _ in hit] + fhit)[:200],
                    'records': sum(len(a['geos']) for _, a in hit)})
    indx = [iid for iid in agg if re.search(r'nace|naics|gics|employment_share|ces_|establishment_share|location_quotient', iid, re.I)]
    indf = [fid for fid in fr if re.search(r'^n_(ind|nace|naics|gics)_|establish', fid)]
    ind.append({'cc': cc, 'classification': 'NACE' if any('nace' in x for x in indx + indf) else 'NAICS' if any('naics' in x or x.startswith('ces_') for x in indx) else 'broad sectors' if indx else 'none yet',
                'levels': ' '.join(sorted({l for i in indx for l in agg[i]['levels']})), 'indicators': len(indx) + len(indf), 'detailed_local': 'no' if not indf else 'yes'})
def write(name, rows):
    with open(os.path.join(OUT, name), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['version'] + list(rows[0])); w.writeheader()
        for r in rows: w.writerow(dict({'version': VERSION}, **r))
write('coverage.csv', cov); write('kpi_coverage.csv', kpi); write('industry_coverage.csv', ind)
src = os.path.join(ROOT, 'docs', 'master', 'unresolved_geographies.csv')
if os.path.exists(src): shutil.copy(src, os.path.join(OUT, 'unresolved_geographies.csv'))
open(os.path.join(OUT, 'README.md'), 'w').write(f"""Nestlyzer {VERSION} data coverage audit (generated from the deployed build with local scripts; no crawling).
coverage.csv: one row per country x indicator. kind = scored factor, raw factor or context record (context is shown, never scored).
  source_levels: geography the figure is published for. unique_source_areas: distinct source areas. mapped_places: places the figure
  is attached to. displayed_places: places that show it. scored_places: places where it enters a score. missing_reason: why the rest lack it.
kpi_coverage.csv: for each key figure (household and business) (Method page) whether the build has it for the country, at which level and from which indicators.
industry_coverage.csv: industry-classification data per country (NACE, NAICS or broad sectors) and whether detailed local data exists.
unresolved_geographies.csv: source geographies from the collected data that are not linked to a place yet.
""")
print('audit:', len(cov), 'coverage rows,', len(kpi), 'KPI rows,', sum(1 for r in kpi if r['available'] == 'yes'), 'available;', sum(1 for r in ind if r['classification'] != 'none yet'), 'countries with some industry data')
