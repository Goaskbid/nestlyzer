#!/usr/bin/env python3
"""r20: every category of data feeds at least one profile. Real estate (housing tenure, new homes, first-time buyer
mortgages, house sales) and governance (municipal fiscal strength) were measured in seven countries but weighed by no
profile. They now count, with modest weights, for the households they concern. Where a country has no such data the
category drops out and the other weights are rescaled, so other countries' scores do not move. Idempotent.
Run: python3 build/r20_profile_coverage.py --write   (then node build/build_global_rank.js)"""
import json, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); P = os.path.join(R, 'data', 'meta.json')
ADD = {'realestate': {'first_home': 6, 'young_family': 3, 'budget': 4, 'single_parent': 3, 'low_income': 3, 'low_income_family': 3},
       'governance': {'pensioner': 4, 'single_pensioner': 4, 'early_retiree': 3, 'young_family': 3, 'business_owner': 4, 'hnw': 3, 'biz_hq': 3}}
m = json.load(open(P, encoding='utf-8')); prof = m['config']['profiles']; done = []
for cat, ws in ADD.items():
    for p, w in ws.items():
        if p in prof and prof[p].get('weights', {}).get(cat) != w: prof[p].setdefault('weights', {})[cat] = w; done.append(f'{p}.{cat}={w}')
used = {c for p in prof.values() for c, v in (p.get('weights') or {}).items() if v}
unused = sorted({f['category'] for f in m['factors']} - used)
json.dump({'note':'r20 owner change: every data category is weighed by at least one profile','additions':ADD},open(os.path.join(R,'docs','audit','r20_profile_coverage.json'),'w'),indent=1)
print('set:', done or 'nothing to change'); print('categories still weighed by no profile:', unused or 'none')
if '--write' in sys.argv and done: json.dump(m, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
sys.exit(1 if unused else 0)
