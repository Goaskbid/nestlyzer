#!/usr/bin/env python3
"""Checks Eurostat GISCO for a newer LAU year and, if there is one, writes build/source/lau_update.json.gz.

    python3 build/refresh_data.py            # check and download if newer
    python3 build/refresh_data.py --force    # rebuild the update file even if the year is not newer

Run by .github/workflows/site.yml every month and on every push. Prints one line and, on GitHub,
sets the step output `changed` to true or false. When nothing newer exists it changes nothing.

The tables come from https://gisco-services.ec.europa.eu/distribution/v2/lau/ (open data, CC BY 4.0,
"© European Union, Eurostat, GISCO"). Columns used: GISCO_ID, POP_<year>, AREA_KM2.
NZ_GISCO_BASE can point to another base URL (the tests use a local copy).
"""
import csv, gzip, io, json, os, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'build', 'source', 'lau_update.json.gz')
BASE = os.environ.get('NZ_GISCO_BASE', 'https://gisco-services.ec.europa.eu/distribution/v2/lau/').rstrip('/') + '/'
CURRENT_DEFAULT = 2024  # the year the published records are based on


def fetch(url, tries=4):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'nestlyzer-data-refresh (+https://nestlyzer.com)'})
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.read()
        except Exception as e:  # network hiccup: wait and retry
            last = e; time.sleep(5 * (i + 1))
    raise RuntimeError(f'could not download {url}: {last}')


def table(year):
    raw = fetch(f'{BASE}csv/LAU_RG_01M_{year}_4326.csv').decode('utf-8-sig')
    rd = csv.DictReader(io.StringIO(raw))
    pcol = f'POP_{year}'
    if pcol not in (rd.fieldnames or []):
        raise RuntimeError(f'LAU {year}: no {pcol} column (columns: {rd.fieldnames})')
    out = {}
    for row in rd:
        try:
            pop = int(float(row.get(pcol) or 0))
        except ValueError:
            pop = 0
        try:
            area = float(row.get('AREA_KM2') or 0)
        except ValueError:
            area = 0.0
        out[row['GISCO_ID']] = (pop, area)
    if len(out) < 50000:
        raise RuntimeError(f'LAU {year}: only {len(out)} rows, expected about 100,000')
    return out


def output(changed, note):
    print(note)
    gh = os.environ.get('GITHUB_OUTPUT')
    if gh:
        with open(gh, 'a') as f:
            f.write(f'changed={"true" if changed else "false"}\n')
            f.write(f'note={note}\n')


def main():
    force = '--force' in sys.argv
    current = CURRENT_DEFAULT
    if os.path.exists(OUT):
        with gzip.open(OUT, 'rt', encoding='utf-8') as f:
            current = max(current, int(json.load(f).get('year') or 0))
    cat = json.loads(fetch(BASE + 'datasets.json'))
    years = sorted(int(k.split('-')[1]) for k in cat if k.startswith('lau-') and k.split('-')[1].isdigit())
    latest = years[-1]
    if latest <= current and not force:
        return output(False, f'No newer data: GISCO LAU {latest} is the latest, the site already uses {current}.')
    new = table(latest)
    base_year, base = None, {}
    for y in (latest - 5, latest - 4, latest - 6):
        if y in years:
            try:
                base = table(y); base_year = y; break
            except Exception as e:
                print('base year', y, 'not usable:', e)
    rows = {k: [p, a, (base.get(k) or (0, 0))[0] or None] for k, (p, a) in new.items() if p > 0}
    upd = {'year': latest, 'base_year': base_year, 'source': f'{BASE}csv/LAU_RG_01M_{latest}_4326.csv',
           'fetched': time.strftime('%Y-%m-%d'), 'rows': rows}
    with gzip.open(OUT, 'wt', encoding='utf-8') as f:
        json.dump(upd, f, separators=(',', ':'))
    output(True, f'New data: GISCO LAU {latest} ({len(rows)} places with population; growth against {base_year}).')


if __name__ == '__main__':
    main()
