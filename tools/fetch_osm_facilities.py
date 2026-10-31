#!/usr/bin/env python3
"""Fetch schools, childcare and everyday facilities from OpenStreetMap for the 45 Nestlyzer countries.

Why: Nestlyzer has no per-place counts of schools, kindergartens, playgrounds, GPs or pharmacies yet, so the needs of
young families (and of pensioners: doctors, pharmacies) cannot be scored. OpenStreetMap has them everywhere (ODbL).
The Nestlyzer build workspace cannot reach OpenStreetMap, so this script runs on your computer.

How to run (Python 3.9 or newer, no extra packages needed):
    python3 fetch_osm_facilities.py
It asks the public Overpass API country by country, waits politely between requests, and writes one small file per
country into the folder 'osm_facilities' next to the script (CC.csv.gz: kind, lat, lon). Countries already done are
skipped, so you can stop it and start it again. It takes about one to three hours in total.
When it is finished, attach the 'osm_facilities' folder (or a zip of it) in the chat.

Data: (c) OpenStreetMap contributors, ODbL 1.0. Counts derived from it may be published with that attribution.
"""
import csv, gzip, json, os, sys, time, urllib.parse, urllib.request

OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'osm_facilities')
# ISO 3166-1 codes as used in OpenStreetMap (Nestlyzer uses UK for GB and EL for GR)
COUNTRIES = ['CH', 'LI', 'AT', 'DE', 'FR', 'IT', 'ES', 'PT', 'NL', 'BE', 'LU', 'GB', 'IE', 'DK', 'SE', 'NO', 'FI', 'IS',
             'EE', 'LV', 'LT', 'PL', 'CZ', 'SK', 'HU', 'SI', 'HR', 'RS', 'MK', 'AL', 'GR', 'BG', 'RO', 'CY', 'MT',
             'US', 'CA', 'JP', 'KR', 'TW', 'HK', 'SG', 'AU', 'NZ', 'IL']
KINDS = {
    'school': '["amenity"="school"]',
    'kindergarten': '["amenity"~"^(kindergarten|childcare)$"]',
    'playground': '["leisure"="playground"]',
    'doctor': '["amenity"~"^(doctors|clinic)$"]',
    'pharmacy': '["amenity"="pharmacy"]',
    'supermarket': '["shop"~"^(supermarket|convenience)$"]',
    'hospital': '["amenity"="hospital"]',
}
# large countries are fetched state by state (ISO 3166-2 areas) so a single request does not time out
SPLIT = {'US': 4, 'CA': 4, 'AU': 4, 'JP': 4, 'DE': 4, 'FR': 4}


def overpass(q, tries=6):
    data = urllib.parse.urlencode({'data': q}).encode()
    for t in range(tries):
        url = OVERPASS[t % len(OVERPASS)]
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=data, headers={'User-Agent': 'nestlyzer-facilities/1.0'}), timeout=900) as r:
                return json.loads(r.read().decode())
        except Exception as e:
            wait = 30 * (t + 1)
            print(f'    retry in {wait}s ({e})', flush=True); time.sleep(wait)
    raise RuntimeError('Overpass did not answer')


def areas(cc):
    if cc not in SPLIT: return [f'area["ISO3166-1"="{cc}"][admin_level=2]']
    q = f'[out:json][timeout:300];area["ISO3166-1"="{cc}"][admin_level=2]->.c;rel(area.c)["ISO3166-2"~"^{cc}-"][admin_level={SPLIT[cc]}];out tags;'
    rels = overpass(q).get('elements', [])
    codes = sorted({e['tags']['ISO3166-2'] for e in rels if 'ISO3166-2' in e.get('tags', {})})
    print(f'  {cc}: {len(codes)} states or regions', flush=True)
    return [f'area["ISO3166-2"="{c}"]' for c in codes] or [f'area["ISO3166-1"="{cc}"][admin_level=2]']


def main():
    os.makedirs(OUT, exist_ok=True)
    for cc in COUNTRIES:
        dest = os.path.join(OUT, cc + '.csv.gz')
        if os.path.exists(dest): print(cc, 'already done'); continue
        print(cc, flush=True); rows = set()
        for a in areas(cc):
            for kind, flt in KINDS.items():
                q = f'[out:json][timeout:600];{a}->.a;(node{flt}(area.a);way{flt}(area.a);relation{flt}(area.a););out center qt;'
                els = overpass(q).get('elements', [])
                for e in els:
                    lat = e.get('lat', (e.get('center') or {}).get('lat')); lon = e.get('lon', (e.get('center') or {}).get('lon'))
                    if lat is not None: rows.add((kind, round(lat, 5), round(lon, 5)))
                print(f'    {a[:40]} {kind}: {len(els)}', flush=True); time.sleep(5)
        tmp = dest + '.part'
        with gzip.open(tmp, 'wt', newline='') as f:
            w = csv.writer(f); w.writerow(['kind', 'lat', 'lon']); w.writerows(sorted(rows))
        os.replace(tmp, dest); print(cc, 'done:', len(rows), 'facilities', flush=True)
    print('All countries done. Attach the folder', OUT)


if __name__ == '__main__':
    main()
