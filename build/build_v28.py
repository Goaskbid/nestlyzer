#!/usr/bin/env python3
"""Nestlyzer 2.8 data layer: official statistics joined to every place. Run after build_business_profiles.py.

Input: build/source/v28/<domain>/values.csv.gz (+ sources.json), normalised as
    cc, level, code, field, value, unit, period, source_id
level = place (code = the place's official id), place3 (same, but the value belongs to the county or council the place lies in), nuts3 / nuts2 / nuts1 (Europe; matched on the place's NUTS3 code),
        admin1 (code = the place's region code `rc`), country.
Each place takes the finest level available for each field. Nothing is imputed: missing stays missing.

Output (idempotent; earlier 2.8 fields are removed first):
  data/c/{CC}.json   fr[<factor id>] raw values, fs[<factor id>] 0-100 scores (scored factors only),
                     fl[<factor id>] level code per place (0 place, 3 nuts3/district, 2 nuts2/region, 1 nuts1, 9 country)
  data/meta.json     factors[] entries (score_role 'scored' or 'raw'), sources{}, v28 coverage report

Scoring (documented in the method page):
  pool    percentile across every place in every country that has the value (comparable units: climate, air,
          distances, Eurostat/OECD regional statistics, national anchors). A Bulgarian and a Swiss town are on one scale.
  country percentile inside the country (definitions that differ between countries: local crime counts, municipal
          tax rates, prices in national currency).
  Percentiles are winsorised at 2/98 and ties share the mean rank. 'lower' factors are reversed.
Factor ids start with n_ so the legacy method v1 (and its fixtures) never sees them.
"""
import csv, gzip, json, os, glob, collections, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', 'source', 'v28')
LEVEL_CODE = {'place': 0, 'place3': 3, 'nuts3': 3, 'admin2': 3, 'nuts2': 2, 'admin1': 2, 'nuts1': 1, 'country': 9}
REGKEY = {'nuts3': 'n3', 'admin2': 'n3', 'nuts2': 'n2', 'admin1': 'rc', 'nuts1': 'n1', 'country': 'cc'}
PARENTS = {}
LEVEL_RANK = {'place': 0, 'place3': 0, 'nuts3': 1, 'admin2': 1, 'nuts2': 2, 'admin1': 2, 'nuts1': 3, 'country': 4}

# field -> factor definition.  scope: pool | country.  dir: higher | lower | target (with 'target').
# 'raw' = shown with source in the place panel, not scored.
CATALOG = {}


def F(field, fid, name, cat, d, unit, scope='pool', role='scored', target=None, transform=None, conf=0.8, desc='', fmt=None, also=()):
    CATALOG[field] = dict(id='n_' + fid, name=name, category=cat, direction=d, unit=unit, scope=scope, score_role=role,
                          target=target, transform=transform, confidence=conf, description=desc, fmt=fmt)
    for a in also:
        CATALOG[a] = CATALOG[field]


def load_catalog():
    path = os.path.join(SRC, 'catalog.py')
    if os.path.exists(path):
        exec(compile(open(path).read(), path, 'exec'), {'F': F})


def read_values():
    rows = []
    for p in sorted(glob.glob(os.path.join(SRC, '*', 'values.csv.gz'))):
        dom = os.path.basename(os.path.dirname(p))
        with gzip.open(p, 'rt', encoding='utf-8') as f:
            for r in csv.DictReader(f):
                try:
                    v = float(r['value'])
                except (TypeError, ValueError):
                    continue
                if not math.isfinite(v):
                    continue
                r['value'] = v; r['domain'] = dom
                rows.append(r)
    return rows


def read_sources():
    out = {}
    for p in sorted(glob.glob(os.path.join(SRC, '*', 'sources.json'))):
        d = json.load(open(p))
        if isinstance(d, list):
            d = {x.get('source_id'): x for x in d if x.get('source_id')}
        for k, v in d.items():
            out[k] = v
    return out


def pct_scores(vals, direction, target=None, transform=None):
    """vals: list of (key, value). Returns {key: score 0-100}."""
    if not vals:
        return {}
    # a figure that is the same everywhere in the country (a national value) cannot rank places inside it (2.11.3)
    if len({round(v, 6) for k, v in vals}) < 3:
        return {}
    xs = []
    for k, v in vals:
        if transform == 'log':
            v = math.log10(max(v, 0) + 1)
        if direction == 'target':
            v = -abs(v - (math.log10(target + 1) if transform == 'log' else target))
        elif direction == 'lower':
            v = -v
        xs.append((k, v))
    srt = sorted(v for _, v in xs)
    n = len(srt)
    lo, hi = srt[int(0.02 * (n - 1))], srt[int(0.98 * (n - 1))]
    clipped = [(k, min(max(v, lo), hi)) for k, v in xs]
    order = sorted(set(v for _, v in clipped))
    # mean-rank percentile for ties
    cnt = collections.Counter(v for _, v in clipped)
    cum, below = {}, 0
    for v in order:
        cum[v] = (below + (cnt[v] - 1) / 2.0) / max(1, n - 1)
        below += cnt[v]
    if hi == lo:
        return {k: 50.0 for k, _ in clipped}
    return {k: round(100 * cum[v], 1) for k, v in clipped}


def main():
    global PARENTS
    pp = os.path.join(SRC, '_parents.json')
    PARENTS = json.load(open(pp)) if os.path.exists(pp) else {}
    load_catalog()
    rows = read_values()
    sources = read_sources()
    meta_p = os.path.join(ROOT, 'data', 'meta.json')
    meta = json.load(open(meta_p))
    shards = {}
    for p in sorted(glob.glob(os.path.join(ROOT, 'data', 'c', '*.json'))):
        cc = os.path.basename(p)[:-5]
        sh = json.load(open(p))
        # remove an earlier 2.8 run
        for k in [k for k in sh['fr'] if k.startswith('n_')]: del sh['fr'][k]
        for k in [k for k in sh['fs'] if k.startswith('n_')]: del sh['fs'][k]
        sh.pop('fl', None); sh.pop('rg', None)
        shards[cc] = sh
    meta['factors'] = [f for f in meta['factors'] if not f['id'].startswith('n_')]

    # index values: (cc, level, code) -> field -> row (latest period wins)
    idx = collections.defaultdict(dict)
    unknown = collections.Counter()
    for r in rows:
        f = r['field']
        if f not in CATALOG:
            unknown[(r['domain'], f)] += 1
            continue
        lvl = r['level']
        if lvl not in LEVEL_RANK:
            continue
        key = (r['cc'], lvl, r['code'])
        old = idx[key].get(f)
        if old is None or str(r['period']) > str(old['period']) or (str(r['period']) == str(old['period']) and LEVEL_RANK[lvl] < LEVEL_RANK[old['level']]):
            idx[key][f] = r

    # join to places
    fields = sorted(set(CATALOG))
    per = collections.defaultdict(dict)           # factor id -> (cc, i) -> (value, level, row)
    cover = collections.defaultdict(lambda: collections.Counter())
    for cc, sh in shards.items():
        cols = sh['cols']; iO, iR, iN3, iS = cols.index('oid'), cols.index('rc'), cols.index('n3'), cols.index('sup')
        for i, row in enumerate(sh['rows']):
            if row[iS]:
                continue
            oid, rc, n3 = str(row[iO]), str(row[iR] or ''), str(row[iN3] or '')
            cands = [('place', oid), ('place3', oid)]
            par = PARENTS.get(cc, {}).get(oid)
            if par:   # a former district: the current council's figures apply (shown as the council's value)
                cands.append(('place3', '>' + par))
            cands += [('nuts3', n3), ('admin2', n3), ('nuts2', n3[:4]), ('admin1', rc), ('nuts1', n3[:3]), ('country', cc)]
            got = {}
            for lvl, code in cands:
                d = idx.get((cc, 'place', code[1:])) if code.startswith('>') else idx.get((cc, lvl, code))
                if not d:
                    continue
                for f, r in d.items():
                    fid = CATALOG[f]['id']
                    if fid not in got:
                        got[fid] = (r['value'], lvl, r)
            for fid, t in got.items():
                per[fid][(cc, i)] = t
                cover[fid][cc] += 1

    # score and write
    fdefs = {}
    for f, d in CATALOG.items():
        fdefs.setdefault(d['id'], d)
    report = {}
    nfx = collections.Counter()
    for fid, d in fdefs.items():
        vals = per.get(fid)
        if not vals:
            continue
        # scores first (percentiles over every place that has the value; regional values repeat per place by design)
        score = {}
        if d['score_role'] == 'scored':
            groups = collections.defaultdict(list)
            for (cc, i), (v, lvl, r) in vals.items():
                # 2.11.3: percentiles within the country for every figure; a Europe-wide percentile squeezed a category in a
                # country that sits low on it (Italy's family scores ran 0-30) and so cut its weight in that country's ranking.
                # Cross-country comparison is the world model's job (national level + in-country percentile).
                groups[cc].append(((cc, i), v))
            for g, vs in groups.items():
                score.update(pct_scores(vs, d['direction'], d['target'], d['transform']))
        # place values go into per-place arrays; regional values are stored once per region (sh['rg']) and
        # resolved by the app when the country loads (src/data.js), which keeps the country files small
        for (cc, i), (v, lvl, r) in vals.items():
            sh = shards[cc]; n = len(sh['rows']); val = round(v, 4) if abs(v) < 1e6 else round(v); sc = score.get((cc, i))
            if sc is not None:
                nfx[(cc, i)] += 1
            if lvl in ('place', 'place3'):
                sh['fr'].setdefault(fid, [None] * n)[i] = val
                if sc is not None:
                    sh['fs'].setdefault(fid, [None] * n)[i] = sc
                if lvl == 'place3':
                    sh.setdefault('fl', {}).setdefault(fid, [None] * n)[i] = 3
            else:
                sh.setdefault('rg', {}).setdefault(fid, {}).setdefault(REGKEY[lvl], {})[r['code']] = [val, sc]
        # per-country provenance: source, period, level
        prov = collections.defaultdict(collections.Counter)
        for (cc, i), (v, lvl, r) in vals.items():
            prov[cc][(r['source_id'], str(r['period']), lvl, r.get('unit', ''))] += 1
        bycc = {}
        for cc, c in prov.items():
            (sid, per_, lvl, unit), k = c.most_common(1)[0]
            s = sources.get(sid, {})
            bycc[cc] = {'source_id': sid, 'source_name': s.get('publisher') or s.get('provider') or sid, 'dataset': s.get('dataset') or s.get('title') or '',
                        'url': s.get('url_official') or s.get('source_url') or s.get('url') or '', 'licence': s.get('licence', ''), 'period': per_, 'level': lvl, 'unit': unit,
                        'places': sum(c.values())}
        any_s = next(iter(bycc.values()))
        meta['factors'].append({
            'id': fid, 'name': d['name'], 'category': d['category'], 'direction': d['direction'], 'unit': d['unit'],
            'countries': sorted(bycc), 'source_id': any_s['source_id'], 'description': d['description'], 'confidence': d['confidence'],
            'status': 'embedded_official', 'methodology_note': ('Percentile within the country (2.11.3; was: across all countries) (comparable definition).' if d['scope'] == 'pool'
                                                                else 'Percentile inside each country (national definitions differ).'),
            'transform': d['transform'], 'target': d['target'], 'source_name': any_s['source_name'], 'source_period': any_s['period'],
            'source_url': any_s['url'], 'score_role': d['score_role'], 'v28': True, 'scope': d['scope'], 'fmt': d['fmt'], 'by_country': bycc,
            'auditability': 'raw value, level (place or region), source, period and score visible in the app'})
        report[fid] = {cc: c for cc, c in sorted(cover[fid].items())}

    # available factor count per place (drives the coverage shown in the app)
    for cc, sh in shards.items():
        cols = sh['cols']
        if 'nf' not in cols:
            continue
        iF = cols.index('nf')
        base = sh.setdefault('nf0', [row[iF] for row in sh['rows']])
        for i, row in enumerate(sh['rows']):
            row[iF] = (base[i] or 0) + nfx.get((cc, i), 0)

    # what is measured per country: a category counts when at least half of the active places have a local or regional
    # (not national) scored factor in it. Drives the data-depth labels in the app and on the country pages.
    catof = {f['id']: f['category'] for f in meta['factors'] if f.get('v28') and f['score_role'] == 'scored'}
    placecats = collections.defaultdict(set)
    for fid, vals in per.items():
        cat = catof.get(fid)
        if not cat: continue
        for key, (v, lvl, r) in vals.items():
            if lvl != 'country': placecats[key].add(cat)
    for c in meta['countries']:
        cc = c['cc']; sh = shards.get(cc)
        if not sh: continue
        iS = sh['cols'].index('sup'); act = [i for i, row in enumerate(sh['rows']) if not row[iS]]
        cnt = collections.Counter(cat for i in act for cat in placecats.get((cc, i), ()))
        meas = sorted(cat for cat, n in cnt.items() if act and n >= 0.5 * len(act))
        loc = sorted(nfx[(cc, i)] for i in act)
        c['measured'] = meas
        c['measuredFactors'] = loc[len(loc) // 2] if loc else 0
        c['depth2'] = 'rich' if cc == 'CH' else 'good' if len(meas) >= 5 else 'regional' if len(meas) >= 2 else 'basic'
    meta['v28'] = {'factors': len([f for f in meta['factors'] if f.get('v28')]), 'coverage': report,
                   'unmapped_fields': {f'{a}:{b}': n for (a, b), n in unknown.items()}}
    for cc, sh in shards.items():
        json.dump(sh, open(os.path.join(ROOT, 'data', 'c', cc + '.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    json.dump(meta, open(meta_p, 'w'), separators=(',', ':'), ensure_ascii=False)
    print('v28 factors', meta['v28']['factors'], 'unmapped', len(unknown))
    for fid, c in report.items():
        print(f'  {fid:40s} {sum(c.values()):7d} places, {len(c):2d} countries')


if __name__ == '__main__':
    main()
