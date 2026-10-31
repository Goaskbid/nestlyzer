#!/usr/bin/env python3
"""Housing cost pressure estimated from local incomes (2.11.3), for countries that publish no house price or rent per
place but do publish local incomes: where people earn more, homes cost more. Within-country percentile of the local
income figure; labelled as an estimate on the page, never as a price. Switzerland has its own estimate
(build_ch_pressure.py), countries with a real price or rent figure per place do not get one.
Output in data/c/{CC}.json: fr/fs['n_cost_est_income'] (raw = income percentile 0-100, higher = more expensive).
    python3 build/build_cost_estimate.py"""
import json, os, bisect
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FID = 'n_cost_est_income'
SRC = {'NL': ('n_income_std_household', 'CBS standardised household income'), 'ES': ('n_income_net_household', 'INE net household income'),
       'DK': ('n_income_disp_dk', 'Statistics Denmark disposable income'), 'JP': ('n_income_taxpayer_jp', 'taxable income per taxpayer (MIC)')}
done = []
for cc, (src, lab) in SRC.items():
    p = os.path.join(ROOT, 'data', 'c', cc + '.json'); sh = json.load(open(p)); vals = sh['fr'].get(src)
    if not vals or sum(v is not None for v in vals) < 20: continue
    xs = sorted(v for v in vals if v is not None)
    pc = [None if v is None else round(100 * (bisect.bisect_left(xs, v) + bisect.bisect_right(xs, v)) / 2 / len(xs), 1) for v in vals]
    sh['fr'][FID] = pc; sh['fs'][FID] = [None if v is None else round(100 - v, 1) for v in pc]
    json.dump(sh, open(p, 'w'), separators=(',', ':'), ensure_ascii=False); done.append(cc)
mp = os.path.join(ROOT, 'data', 'meta.json'); meta = json.load(open(mp))
f = {'id': FID, 'name': 'Housing cost pressure (estimate from local incomes)', 'category': 'affordability', 'direction': 'lower', 'score_role': 'scored',
     'unit': 'index 0-100', 'countries': done, 'scope': 'country',
     'source_name': 'Nestlyzer estimate from local incomes (' + '; '.join(cc + ': ' + SRC[cc][1] for cc in done) + ')',
     'description': 'How expensive housing is likely to be, estimated from local incomes because no house price or rent is published per place here: where people earn more, homes cost more. 100 = the highest local incomes in the country. Not a measured price.'}
meta['factors'] = [x for x in meta['factors'] if x['id'] != FID] + [f]
json.dump(meta, open(mp, 'w'), separators=(',', ':'), ensure_ascii=False)
print('income-based cost estimate for', done)
