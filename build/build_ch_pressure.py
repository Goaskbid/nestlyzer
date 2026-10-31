#!/usr/bin/env python3
"""Swiss housing-cost pressure, an estimate (2.11.3).
Switzerland publishes no rent or price figure per municipality, so 'Affordability' rewarded rich, low-tax municipalities
(Zumikon ranked third for low-income families). Low income and wealth taxes and few people on social assistance go with
high rents in Switzerland (tax advantages are priced into housing), so these, with the regional price level, give an
estimate of how expensive living in a municipality is. Each input is a percentile within Switzerland; the estimate is
their mean (at least two inputs). It is labelled as an estimate on the page and is not a measured rent.
Output in data/c/CH.json: fr/fs['n_ch_price_pressure'] (raw 0-100, higher = more expensive; score 100 = cheapest).
    python3 build/build_ch_pressure.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FID = 'n_ch_price_pressure'
p = os.path.join(ROOT, 'data', 'c', 'CH.json'); sh = json.load(open(p)); fr = sh['fr']; n = len(sh['rows'])
def pct(vals, sign):
    xs = sorted(v * sign for v in vals if v is not None)
    if len(xs) < 50: return [None] * n
    import bisect
    return [None if v is None else 100 * (bisect.bisect_left(xs, v * sign) + bisect.bisect_right(xs, v * sign)) / 2 / len(xs) for v in vals]
# higher percentile = more cost pressure
parts = [pct(fr.get('single_income_tax_100k', [None] * n), -1),   # lower income tax
         pct(fr.get('wealth_tax_1m', [None] * n), -1),            # lower wealth tax
         pct(fr.get('low_social_assistance_rate', [None] * n), -1),   # fewer people on social assistance (raw = the rate)
         pct(fr.get('n_price_level', [None] * n), 1)]              # higher regional price level
raw = []
for i in range(n):
    v = [q[i] for q in parts if q[i] is not None]
    raw.append(round(sum(v) / len(v), 1) if len(v) >= 2 else None)
sc = pct(raw, -1)
fr[FID] = raw; sh['fs'][FID] = [None if v is None else round(v, 1) for v in sc]
json.dump(sh, open(p, 'w'), separators=(',', ':'), ensure_ascii=False)
mp = os.path.join(ROOT, 'data', 'meta.json'); meta = json.load(open(mp))
f = {'id': FID, 'name': 'Housing cost pressure (estimate)', 'category': 'affordability', 'direction': 'lower', 'score_role': 'scored', 'unit': 'index 0-100',
     'source_name': 'Nestlyzer estimate from ESTV tax burdens, FSO social-assistance rates and the regional price level',
     'description': 'How expensive living here is likely to be, estimated: Switzerland publishes no rent per municipality, and low taxes and few people on social assistance go with high rents. 100 = the most cost pressure in Switzerland. Not a measured rent.'}
meta['factors'] = [x for x in meta['factors'] if x['id'] != FID] + [f]
json.dump(meta, open(mp, 'w'), separators=(',', ':'), ensure_ascii=False)
ok = sum(v is not None for v in raw)
names = [r[sh['cols'].index('name')] for r in sh['rows']]
top = sorted([(raw[i], names[i]) for i in range(n) if raw[i] is not None], reverse=True)
print('Swiss cost-pressure estimate for', ok, 'of', n, 'municipalities; highest:', [t[1] for t in top[:8]], 'lowest:', [t[1] for t in top[-6:]])
