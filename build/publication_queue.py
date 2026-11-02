#!/usr/bin/env python3
"""Publication review queue (2.13.2, owner decision: count first, hide nothing yet).

Lists, per source, the context records the master builder publishes on 'review_candidate' or 'source_context_ready'
status without an explicit publication approval, and checks them against the reviewed source decisions
(build/source/context/publication_decisions.csv). Writes data/audit/publication_review_queue.csv for a yes/no per source.
Nothing is hidden or approved by this script.        python3 build/publication_queue.py"""
import csv, gzip, json, os, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CTX = os.path.join(ROOT, 'build', 'source', 'context')
recs = [json.loads(l) for l in gzip.open(os.path.join(CTX, 'master_records.jsonl.gz'), 'rt', encoding='utf-8')]
dec = {}
p = os.path.join(CTX, 'publication_decisions.csv')
if os.path.exists(p):
    for d in csv.DictReader(open(p, encoding='utf-8')):
        dec[d.get('source_id') or d.get('scope') or ''] = d.get('decision') or d.get('action') or ''
OK = ('review_candidate', 'source_context_ready')
by = collections.defaultdict(lambda: {'records': 0, 'countries': set(), 'status': collections.Counter(), 'approved': 0, 'publisher': '', 'url': ''})
for r in recs:
    if r.get('ingestion_status') not in OK or r.get('source_geo_level') == 'port': continue
    s = by[r.get('source_id', '')]; s['records'] += 1; s['status'][r['ingestion_status']] += 1
    s['countries'].update(json.loads(r.get('country_codes') or '[]'))
    if str(r.get('publication_approved')).lower() == 'true': s['approved'] += 1
    s['url'] = s['url'] or r.get('source_url', '')
rows = sorted(([sid, v['records'], v['approved'], v['records'] - v['approved'], ';'.join(sorted(v['countries'])), dict(v['status']), dec.get(sid, ''), v['url']] for sid, v in by.items()), key=lambda x: -x[3])
os.makedirs(os.path.join(ROOT, 'docs', 'audit'), exist_ok=True)
with open(os.path.join(ROOT, 'docs', 'audit', 'publication_review_queue.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f); w.writerow(['source_id', 'public_records', 'explicitly_approved', 'without_approval', 'countries', 'status', 'recorded_decision', 'source_url', 'owner_decision_yes_no']); w.writerows([r + [''] for r in rows])
print(json.dumps({'sources': len(rows), 'public_records': sum(r[1] for r in rows), 'without_approval': sum(r[3] for r in rows), 'sources_without_any_approval': sum(1 for r in rows if r[2] == 0)}))
