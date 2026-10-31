#!/usr/bin/env python3
"""Writes the data-collection brief for the KPI framework (docs/briefs/ChatGPT_Task_KPIs.md) from build/kpi_catalogue.py
and data/audit/kpi_coverage.csv: every KPI, who needs it, the level wanted, the sources, and the countries that already
have it (so they are not collected twice).   python3 build/write_kpi_brief.py"""
import csv, json, os, sys
from collections import defaultdict
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.path.join(ROOT, 'build'))
from kpi_catalogue import K
meta = json.load(open(os.path.join(ROOT, 'data', 'meta.json'))); P = meta['config']['profiles']
have = defaultdict(set)
for r in csv.DictReader(open(os.path.join(ROOT, 'data', 'audit', 'kpi_coverage.csv'))):
    if r['available'] == 'yes': have[r['kpi']].add(r['cc'])
ccs = [c['cc'] for c in sorted(meta['countries'], key=lambda c: -c['n'])]
L = ['# ChatGPT task: the Nestlyzer KPI framework (%d key figures)' % len(K), '',
     '**Goal.** Nestlyzer compares places for %d household profiles and %d business-site profiles. The framework below lists what people and location planners actually compare. It is based on the dimensions used by established comparisons:' % (sum(1 for p in P.values() if not p.get('business')), sum(1 for p in P.values() if p.get('business'))),
     '- households: OECD regional well-being, EIU, Mercer, the Eurostat survey on quality of life in European cities, the EU Social Progress Index, Swiss and German municipality ratings, US News, Niche;',
     '- business: fDi Benchmark, Site Selection, Kearney, Cushman & Wakefield manufacturing and data centre comparisons, IMD, World Bank B-READY, the EU Regional Innovation Scoreboard and the EY attractiveness survey.', '',
     '**Two jobs.**',
     '1. **Collect the data** for every KPI and country where the column "already in Nestlyzer" does not list the country.',
     '2. **Find even more.** Propose at least 60 further KPIs that comparable analyses use and that official open data supports. Deliver them as `kpi_proposals.csv`, then collect the 20 best. Columns: `proposed_id, name, unit, level, audience, profiles, comparable_analyses, official_source, source_url, licence, countries_covered`.', '',
     '**Delivery format.** Same columns as `Nestlyzer_All_Collected_Data_2026-10-21.csv`. `indicator_id` starts with the KPI id below. Bands, occupations (ISCO/SOC), NACE/NAICS codes, tax bases and scenario definitions go in `dimensions`. Use official geography codes (LAU, NUTS 2021, FIPS, national municipality codes). Add `sources.json` and `REPORT.md` (counts per KPI × country, three spot checks, gaps).', '',
     '**Rules.**',
     '- **Sources:** official or openly licensed sources allowing commercial reuse with attribution; the site carries ads.',
     '- **Concepts kept apart:** price per kWh, annual bill and share of income are never mixed; nor are employee pay and employer cost, or a level and a growth rate.',
     '- **Geography:** the most local level published.',
     '- **Period:** the latest one.',
     '- **Missing data:** missing stays missing.', '',
     '**Priority:**',
     '1. KPIs used by many profiles and missing in the largest countries: ' + ', '.join(ccs[:12]) + '.',
     '2. Municipality-level figures before regional, and regional before national.', '']
dom = defaultdict(list)
for k, v in K.items(): dom[(v['audience'], v['domain'])].append((k, v))
for (aud, d), items in sorted(dom.items()):
    L += ['## %s: %s' % ('Households' if aud == 'household' else 'Business sites', d), '', '| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |', '|---|---|---|---|---|---|---|---|']
    for k, v in items:
        h = sorted(have.get(k, [])); hv = (', '.join(h) if len(h) <= 10 else '%d countries' % len(h)) if h else '—'
        L.append('| `%s` | %s | %s | %s | %d | %s | %s | %s |' % (k, v['name'], v['unit'], v['level'], len(v['profiles']), v['used_by'] or '—', hv, v['sources']))
    L.append('')
os.makedirs(os.path.join(ROOT, 'docs', 'briefs'), exist_ok=True)
open(os.path.join(ROOT, 'docs', 'briefs', 'ChatGPT_Task_KPIs.md'), 'w').write('\n'.join(L) + '\n')
print('brief:', len(K), 'KPIs,', sum(1 for k in K if not have.get(k)), 'not in the build for any country')
