#!/usr/bin/env python3
"""r21 (audit NZ11-18): every source link field holds exactly one URL. Compound strings ("landing page ; CC BY copy: https://...")
are split into url (the first, the publisher's page), more_urls (the others) and url_note (the words between). Idempotent.
Run: python3 build/fix_source_urls_r21.py --write"""
import json, os, re, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); P = os.path.join(R, 'data', 'meta.json')
m = json.load(open(P, encoding='utf-8')); U = re.compile(r'https?://[^\s;,)]+'); n = 0
def fix(o, key):
    global n
    v = o.get(key)
    if not isinstance(v, str): return
    us = U.findall(v)
    if not us:
        o[key] = None
        if v.strip(): o['url_note'] = 'computed by Nestlyzer (see the method page)' if v.startswith('internal:') else v.strip()
        n += 1; return
    if len(us) > 1 or (us and v.strip() != us[0]):
        o[key] = us[0] if us else None; rest = us[1:]
        if rest: o['more_urls'] = sorted(set(o.get('more_urls', []) + rest), key=rest.index if all(x in rest for x in o.get('more_urls', [])) else None)
        note = U.sub(' ', v).replace(';', ' ').strip(' :;,-'); note = re.sub(r'\s+', ' ', note)
        if note: o['url_note'] = note
        n += 1
for f in m['factors']:
    fix(f, 'source_url')
    for b in (f.get('by_country') or {}).values(): fix(b, 'url')
bad = [f['id'] for f in m['factors'] for o in [f] + list((f.get('by_country') or {}).values()) for k in ('source_url', 'url') if isinstance(o.get(k), str) and len(U.findall(o[k])) != 1]
print('split:', n, '| fields still not exactly one URL:', len(bad))
if '--write' in sys.argv: json.dump(m, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
sys.exit(1 if bad else 0)
