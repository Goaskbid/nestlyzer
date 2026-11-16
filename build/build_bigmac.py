"""Big Mac index (The Economist, CC BY 4.0) -> data/bigmac.json (2.15.30).
Latest edition only: price in local currency and in US dollars per economy we cover. Euro-area countries get the
euro-area average, labelled as such. Context only: never part of any score.
    python3 build/build_bigmac.py   (source: build/source/bigmac/big-mac-full-index.csv from github.com/TheEconomist/big-mac-data)"""
import csv, json, os
import pycountry
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rows = list(csv.DictReader(open(os.path.join(R, 'build/source/bigmac/big-mac-full-index.csv'))))
last = max(r['date'] for r in rows)
meta = json.load(open(os.path.join(R, 'data/meta.json'))); ours = {c['cc'] for c in meta['countries']}
ALIAS = {'GB': 'UK', 'GR': 'EL'}
EURO = ['AT', 'BE', 'BG', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'EL', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES']
out = {}; hist = {}
def code(r):
    if r['iso_a3'] == 'EUZ': return 'EUZ'
    c = pycountry.countries.get(alpha_3=r['iso_a3']); return ALIAS.get(c.alpha_2, c.alpha_2) if c else None
for r in rows:   # dollar-price history per economy, one point per edition
    cc = code(r)
    if cc and (cc == 'EUZ' or cc in ours) and r['dollar_price']: hist.setdefault(cc, []).append([r['date'][:7], round(float(r['dollar_price']), 2)])
for r in rows:
    if r['date'] != last: continue
    if r['iso_a3'] == 'EUZ': cc = 'EUZ'
    else:
        c = pycountry.countries.get(alpha_3=r['iso_a3']); cc = ALIAS.get(c.alpha_2, c.alpha_2) if c else None
    if cc != 'EUZ' and cc not in ours: continue
    out[cc] = {'local': round(float(r['local_price']), 2), 'cur': r['currency_code'], 'usd': round(float(r['dollar_price']), 2), 'h': sorted(hist.get(cc, []))}
usd = out.get('US', {}).get('usd')
json.dump({'date': last, 'usd_us': usd, 'euro': [c for c in EURO if c in ours], 'c': out,
           'source': 'The Economist, Big Mac index (github.com/TheEconomist/big-mac-data), CC BY 4.0'},
          open(os.path.join(R, 'data/bigmac.json'), 'w'), separators=(',', ':'))
print(f'Big Mac index {last}: {len(out)} economies we cover (euro area counted once); US price ${usd}')
