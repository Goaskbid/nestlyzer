#!/usr/bin/env python3
"""National key figures from the World Bank WDI (2.11), as country context records for the KPI catalogue.
Reads build/source/wdi/*.csv (GitHub mirror datasets/world-development-indicators, CC BY 4.0) and writes
build/source/deliveries/wdi_country_2026-10.csv in the master record format; build_master_context.py imports it
(release 'wdi-2026-10'). Latest value from 2015 on; context only, never scored.
    python3 build/build_wdi_context.py && python3 build/build_master_context.py import build/source/deliveries/wdi_country_2026-10.csv --apply --release=wdi-2026-10"""
import csv, hashlib, json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import ast, re
_src = open(os.path.join(ROOT, 'build', 'build_national.py')).read()   # same country codes, without running that script
ISO3 = ast.literal_eval(re.search(r'ISO3 = (\{.*?\})\n', _src, re.S).group(1))
S = {  # file -> (indicator_id, label, unit); ids chosen to match the KPI catalogue where one fits
    'ny.gnp.pcap.pp.cd': ('wdi_gni_per_capita_ppp', 'Income per person (GNI per capita, PPP)', 'international $'),
    'sl.uem.totl.zs': ('wdi_unemployment_rate', 'Unemployment rate (ILO estimate)', 'percent'),
    'fp.cpi.totl.zg': ('wdi_consumer_price_inflation', 'Consumer price inflation', 'percent'),
    'pa.nus.pppc.rf': ('wdi_consumer_price_level', 'Consumer price level (PPP / exchange rate)', 'ratio'),
    'sp.dyn.le00.in': ('wdi_life_expectancy', 'Life expectancy at birth', 'years'),
    'sp.dyn.imrt.in': ('wdi_infant_mortality', 'Infant mortality', 'per 1,000 live births'),
    'sh.med.beds.zs': ('wdi_hospital_beds', 'Hospital beds', 'per 1,000 people'),
    'vc.ihr.psrc.p5': ('wdi_homicide_rate', 'Intentional homicides', 'per 100,000'),
    'sh.sta.traf.p5': ('wdi_road_deaths', 'Road traffic deaths', 'per 100,000'),
    'en.atm.pm25.mc.m3': ('wdi_pm25_exposure', 'Mean exposure to fine dust (PM2.5)', 'µg/m³'),
    'eg.elc.rnew.zs': ('wdi_renewable_share_electricity', 'Renewable share of electricity output', 'percent'),
    'it.net.bbnd.p2': ('wdi_fixed_broadband', 'Fixed broadband subscriptions', 'per 100 people'),
    'se.ter.enrr': ('wdi_tertiary_enrolment', 'Tertiary enrolment (gross)', 'percent'),
    'si.pov.gini': ('wdi_gini', 'Income inequality (Gini index)', 'index'),
    'lp.lpi.ovrl.xq': ('wdi_lpi_logistics_performance', 'Logistics Performance Index (overall)', '1 to 5'),
    'gc.tax.totl.gd.zs': ('wdi_tax_revenue_gdp', 'Tax revenue', 'percent of GDP'),
    'ic.tax.totl.cp.zs': ('wdi_total_tax_rate_profit', 'Total tax and contribution rate on commercial profits (Doing Business)', 'percent of profit'),
    'sl.tlf.cact.fe.zs': ('wdi_female_labour_participation', 'Women in the labour force', 'percent of women 15+'),
    'sp.pop.65up.to.zs': ('wdi_population_65plus', 'Population aged 65 and over', 'percent'),
}
COLS = ['record_id', 'source_id', 'country_codes', 'source_geo_id', 'source_geo_name', 'source_geo_level', 'boundary_vintage', 'indicator_id', 'label', 'period', 'value', 'unit', 'statistic', 'dimensions',
        'statistical_universe', 'source_url', 'source_release', 'retrieved_at', 'acquisition_method', 'ingestion_status', 'hold_reasons', 'quality_flags', 'purpose_tags', 'origin_packs', 'score_eligible', 'publication_approved', 'original_variant_id']
meta = json.load(open(os.path.join(ROOT, 'data', 'meta.json'))); NAME = {c['cc']: c.get('name', c['cc']) for c in meta['countries']}
rows = []
for f, (iid, lab, unit) in S.items():
    p = os.path.join(ROOT, 'build', 'source', 'wdi', f + '.csv')
    if not os.path.exists(p): continue
    best = {}
    for r in csv.DictReader(open(p, encoding='utf-8')):
        try: y, v = int(r['Year']), float(r['Value'])
        except Exception: continue
        if y >= 2015 and (r['Country Code'] not in best or y > best[r['Country Code']][0]): best[r['Country Code']] = (y, v)
    for cc, i3 in ISO3.items():
        if i3 not in best: continue
        y, v = best[i3]
        rows.append({'record_id': hashlib.sha1(('wdi|' + f + '|' + cc + '|' + str(y)).encode()).hexdigest()[:32], 'source_id': 'WB_WDI_' + f.upper(), 'country_codes': json.dumps([cc]),
                     'source_geo_id': 'ISO3:' + i3, 'source_geo_name': NAME.get(cc, cc), 'source_geo_level': 'country', 'boundary_vintage': '', 'indicator_id': iid, 'label': lab, 'period': str(y),
                     'value': repr(round(v, 4)), 'unit': unit, 'statistic': 'value', 'dimensions': json.dumps({'wdi_series': f.upper()}), 'statistical_universe': 'national',
                     'source_url': 'https://data.worldbank.org/indicator/' + f.upper(), 'source_release': 'WDI via github.com/datasets/world-development-indicators', 'retrieved_at': '2026-10-25',
                     'acquisition_method': 'published_bulk_file', 'ingestion_status': 'source_context_ready', 'hold_reasons': '[]', 'quality_flags': '[]', 'purpose_tags': '["national_context"]',
                     'origin_packs': '["wdi-2026-10"]', 'score_eligible': 'False', 'publication_approved': 'True', 'original_variant_id': ''})
out = os.path.join(ROOT, 'build', 'source', 'deliveries', 'wdi_country_2026-10.csv')
with open(out, 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=COLS); w.writeheader(); w.writerows(rows)
print('WDI country records:', len(rows), 'for', len({r['country_codes'] for r in rows}), 'countries,', len(S), 'series')
