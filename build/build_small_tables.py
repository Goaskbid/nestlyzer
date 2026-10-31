#!/usr/bin/env python3
"""Small national tables (2.11.2): CSV pasted by ChatGPT from official pages (cc,indicator_id,period,value,unit,source_url,
label,licence) -> master record format, imported by build_master_context.py as release 'tables-2026-10-25'.
Empty values are left out (an empty minimum wage means no statutory minimum, never 0). Context only, never scored.
    python3 build/build_small_tables.py build/source/deliveries/chatgpt_tables_2026-10-25.csv"""
import csv, hashlib, json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1]; out = src.replace('.csv', '_master.csv')
COLS = ['record_id', 'source_id', 'country_codes', 'source_geo_id', 'source_geo_name', 'source_geo_level', 'boundary_vintage', 'indicator_id', 'label', 'period', 'value', 'unit', 'statistic', 'dimensions',
        'statistical_universe', 'source_url', 'source_release', 'retrieved_at', 'acquisition_method', 'ingestion_status', 'hold_reasons', 'quality_flags', 'purpose_tags', 'origin_packs', 'score_eligible', 'publication_approved', 'original_variant_id']
NAME = {c['cc']: c.get('name', c['cc']) for c in json.load(open(os.path.join(ROOT, 'data', 'meta.json')))['countries']}
rows = []
for r in csv.DictReader(open(src, encoding='utf-8')):
    if not r['value'].strip(): continue
    rows.append({'record_id': hashlib.sha1(('tbl|' + r['cc'] + '|' + r['indicator_id'] + '|' + r['period']).encode()).hexdigest()[:32], 'source_id': 'TABLES_2026_10_25',
                 'country_codes': json.dumps([r['cc']]), 'source_geo_id': 'NAT:' + r['cc'], 'source_geo_name': NAME.get(r['cc'], r['cc']), 'source_geo_level': 'country', 'boundary_vintage': '',
                 'indicator_id': r['indicator_id'], 'label': r['label'], 'period': r['period'], 'value': r['value'], 'unit': r['unit'], 'statistic': 'value', 'dimensions': json.dumps({'licence': r['licence']}),
                 'statistical_universe': 'national', 'source_url': r['source_url'], 'source_release': 'transcribed from the official page (format change only)', 'retrieved_at': '2026-10-25',
                 'acquisition_method': 'transcribed_table', 'ingestion_status': 'source_context_ready', 'hold_reasons': '[]', 'quality_flags': '[]', 'purpose_tags': '["national_context"]',
                 'origin_packs': '["tables-2026-10-25"]', 'score_eligible': 'False', 'publication_approved': 'True', 'original_variant_id': ''})
with open(out, 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=COLS); w.writeheader(); w.writerows(rows)
print('table records:', len(rows), '->', out)
