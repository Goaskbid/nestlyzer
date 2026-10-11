"""Yearly population update from Eurostat GISCO LAU (applied by build_data.py).

build/refresh_data.py downloads the newest GISCO LAU attribute table and writes
build/source/lau_update.json.gz. This module applies it to the legacy records before the
rest of the data build runs, so every population-based figure (residents, density, five-year
growth, residents within 30 km, cities of 100,000+, access scores) follows the new year.

Safety rules (a bad download must never reach the site):
  * a country is updated only if at least 85% of its places are found in the new table and its
    total population moves by less than 12%; otherwise it keeps its current figures;
  * a single place whose population jumps by more than 50% (usually a merger or new boundary)
    keeps its current figures;
  * scores keep the scale of the published release: for each country and factor, the old
    (value, score) pairs define the scale and new values are placed on it.
"""
import gzip, json, os, collections
import numpy as np

COMMON = ('common_population_scale', 'common_density_balance', 'common_low_crowding', 'common_population_growth_5y')
MIN_MATCH = 0.85
MAX_COUNTRY_SHIFT = 0.12
MAX_PLACE_JUMP = 0.50


def gisco_keys(r):
    cc, oid = r['country'], str(r['official_id'])
    keys = [r.get('gisco_id') or '', f'{cc}_{oid}']
    if cc == 'CH' and oid.isdigit():
        keys.insert(0, 'CH_CH%04d' % int(oid))
    return [k for k in keys if k]


def load(path):
    if not os.path.exists(path):
        return None
    with gzip.open(path, 'rt', encoding='utf-8') as f:
        return json.load(f)


def _scales(records):
    """Per country and factor: sorted raw values and the scores the release gave them."""
    pairs = collections.defaultdict(lambda: collections.defaultdict(list))
    for r in records:
        fr, fs = r.get('factorRaw') or {}, r.get('factorScores') or {}
        for k in COMMON:
            a, b = fr.get(k), fs.get(k)
            if isinstance(a, (int, float)) and isinstance(b, (int, float)):
                pairs[r['country']][k].append((float(a), float(b)))
    out = {}
    for cc, d in pairs.items():
        for k, pts in d.items():
            agg = collections.defaultdict(list)
            for a, b in pts:
                agg[a].append(b)
            xs = np.array(sorted(agg))
            ys = np.array([float(np.mean(agg[x])) for x in xs])
            if len(xs) >= 5:
                out[(cc, k)] = (xs, ys)
    return out


def _score(scales, cc, k, v):
    s = scales.get((cc, k))
    if s is None or v is None:
        return None
    return round(float(np.interp(v, s[0], s[1])), 2)


def apply(records, upd):
    """Apply an update in place. Returns a report dict (also stored in meta.json)."""
    if not upd:
        return {'applied': False, 'year': None}
    year, base_year, rows = upd['year'], upd.get('base_year'), upd['rows']
    scales = _scales(records)
    by_cc = collections.defaultdict(list)
    for r in records:
        if r.get('_sup'):
            continue
        by_cc[r['country']].append(r)
    report = {'applied': True, 'year': year, 'base_year': base_year, 'countries': {}, 'skipped': {}}
    for cc, rs in sorted(by_cc.items()):
        hits, old_tot, new_tot = [], 0.0, 0.0
        for r in rs:
            old = float(r.get('population') or 0)
            row = next((rows[k] for k in gisco_keys(r) if k in rows), None)
            if row is None or not row[0] or old <= 0:
                continue
            hits.append((r, row))
            old_tot += old; new_tot += row[0]
        base = sum(1 for r in rs if float(r.get('population') or 0) > 0)
        share = len(hits) / base if base else 0
        shift = abs(new_tot / old_tot - 1) if old_tot else 1
        if share < MIN_MATCH or shift > MAX_COUNTRY_SHIFT:
            report['skipped'][cc] = {'matched': round(share, 3), 'total_shift': round(shift, 3)}
            continue
        changed = kept = 0
        for r, (pop, area, pop_base) in hits:
            old = float(r.get('population') or 0)
            if old > 500 and abs(pop / old - 1) > MAX_PLACE_JUMP:
                kept += 1
                continue
            area = float(area) if area else float(r.get('area_km2') or 0)
            dens = pop / area if area > 0 else float(r.get('density') or 0)
            r['population'], r['area_km2'], r['density'] = int(pop), area, dens
            fr, fs = r.setdefault('factorRaw', {}), r.setdefault('factorScores', {})
            vals = {'common_population_scale': float(pop), 'common_density_balance': dens, 'common_low_crowding': dens}
            if pop_base and pop_base > 0:
                vals['common_population_growth_5y'] = (pop / pop_base - 1) * 100
            for k, v in vals.items():
                if k in fr or k in fs:
                    fr[k] = v
                    sc = _score(scales, cc, k, v)
                    if sc is not None and k in fs:
                        fs[k] = sc
            t = r.get('trend')
            if isinstance(t, dict) and isinstance(t.get('annual_population'), list):
                ap = [p for p in t['annual_population'] if p.get('year') != year]
                ap.append({'year': year, 'population': int(pop)})
                ap.sort(key=lambda p: p['year'])
                t['annual_population'] = ap
                byy = {p['year']: p['population'] for p in ap}
                prev, five = byy.get(year - 1), byy.get(year - 5) or pop_base
                if prev:
                    t['population_yoy_pct'] = round((pop / prev - 1) * 100, 2)
                if five:
                    t['population_5y_pct'] = round((pop / five - 1) * 100, 2)
            r['standard'] = (r.get('standard') or '').replace('LAU 2024', f'LAU {year}')
            changed += 1
        report['countries'][cc] = {'updated': changed, 'kept_jump': kept, 'matched': round(share, 3), 'total_shift': round(shift, 4)}
    return report
