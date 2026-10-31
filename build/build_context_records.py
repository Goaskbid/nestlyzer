#!/usr/bin/env python3
"""Context records (release verified-rent-pay-2026-10-21): rents, rent trends, occupational pay, employer labour costs.

    python3 build/build_context_records.py import <records.csv>   # dry run: what would be added
    python3 build/build_context_records.py import <records.csv> --apply
    python3 build/build_context_records.py build                   # writes data/x/{CC}.json 'ctx' + reports

Import: one representation (the all-records CSV), validated and stored once in build/source/context/records.jsonl.gz.
A second identical import adds nothing; a record_id whose value or metadata differs is refused (no overwrite).
Build: publisher geographies are associated with current places through build/source/context/associations.csv
(reviewed rules below). Values stay context: they never become place factors, never change scores and never count as
measured local data. score_eligible stays false."""
import csv, gzip, hashlib, json, os, re, sys, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CTX = os.path.join(ROOT, 'build', 'source', 'context'); os.makedirs(CTX, exist_ok=True)
STORE = os.path.join(CTX, 'records.jsonl.gz')
REQ = ['record_id', 'country_code', 'area_label', 'source_geo_id', 'source_geo_level', 'indicator_id', 'label', 'value', 'unit',
       'reference_period', 'statistic', 'source_id', 'source_url', 'source_release', 'acquisition_method', 'score_eligible']


def load_store():
    if not os.path.exists(STORE): return {}
    return {r['record_id']: r for r in (json.loads(l) for l in gzip.open(STORE, 'rt', encoding='utf-8'))}


def norm_rec(r):
    r = {k.lstrip('﻿'): (v if v is not None else '') for k, v in r.items()}
    for k in REQ:
        if k not in r: raise SystemExit('missing column ' + k)
    v = float(r['value']); r['value'] = v
    if r['score_eligible'].strip().lower() not in ('false', '0', ''): raise SystemExit('score_eligible must be false: ' + r['record_id'])
    r['score_eligible'] = False
    for k in ('dimensions', 'quality_flags'):
        r[k] = json.loads(r[k]) if r.get(k) else ({} if k == 'dimensions' else [])
    return r


def cmd_import(path, apply):
    raw = open(path, 'rb').read(); sha = hashlib.sha256(raw).hexdigest()
    rows = [norm_rec(r) for r in csv.DictReader(raw.decode('utf-8-sig').splitlines())]
    ids = [r['record_id'] for r in rows]
    if len(set(ids)) != len(ids): raise SystemExit('duplicate record_id in input')
    have = load_store(); add, same, conflict = [], 0, []
    for r in rows:
        o = have.get(r['record_id'])
        if o is None: add.append(r)
        elif json.dumps(o, sort_keys=True) == json.dumps(r, sort_keys=True): same += 1
        else: conflict.append(r['record_id'])
    print(json.dumps({'input_rows': len(rows), 'input_sha256': sha, 'would_add' if not apply else 'added': len(add), 'identical': same, 'conflicts': len(conflict)}))
    if conflict: raise SystemExit('refused: %d records differ from the stored release, e.g. %s' % (len(conflict), conflict[:3]))
    if apply and add:
        allr = list(have.values()) + add
        with gzip.open(STORE, 'wt', encoding='utf-8') as f:
            for r in sorted(allr, key=lambda x: x['record_id']): f.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + '\n')
        log = os.path.join(CTX, 'import_log.json'); L = json.load(open(log)) if os.path.exists(log) else []
        L.append({'release': 'verified-rent-pay-2026-10-21', 'file_sha256': sha, 'added': len(add), 'identical': same}); json.dump(L, open(log, 'w'), indent=1)


def fold(s): return unicodedata.normalize('NFKD', s.replace('æ', 'ae').replace('Æ', 'Ae').replace('ø', 'o').replace('Ø', 'O')).encode('ascii', 'ignore').decode().lower().replace('-', ' ').split(' - ')[0].strip()


def places(cc):
    d = json.load(open(os.path.join(ROOT, 'data', 'c', cc + '.json'))); c = d['cols']; iS = c.index('sup')
    i3 = c.index('n3') if 'n3' in c else None
    return [(r[0], r[1], r[2], r[i3] if i3 is not None else '') for r in d['rows'] if not r[iS]]


# reviewed association rules: (source_geo_id) -> (relationship, selector, evidence)
SE_GOT = {'1384', '1401', '1402', '1407', '1415', '1419', '1440', '1441', '1462', '1480', '1481', '1482', '1489'}
SE_MAL = {'1230', '1231', '1233', '1261', '1262', '1263', '1264', '1267', '1280', '1281', '1285', '1287'}
US_PRINCIPAL = {'BLS_MSA:41940': [('San Jose', 'US04'), ('Sunnyvale', 'US04'), ('Santa Clara', 'US04')], 'BLS_MSA:12420': [('Austin', 'US43'), ('Round Rock', 'US43'), ('San Marcos', 'US43')],
                'BLS_MSA:14460': [('Boston', 'US19'), ('Cambridge', 'US19'), ('Newton', 'US19')], 'BLS_MSA:26420': [('Houston', 'US43'), ('Pasadena', 'US43'), ('The Woodlands', 'US43')],
                'BLS_MSA:35620': [('New York City', 'US34'), ('Newark', 'US31'), ('Jersey City', 'US31')], 'BLS_MSA:42660': [('Seattle', 'US47'), ('Tacoma', 'US47'), ('Bellevue', 'US47')],
                'BLS_MSA:16620': [('Charleston', 'US49')]}   # GeoNames admin1 codes as used in data/c/US.json


MT_LABEL = {'Il-Belt Valletta': "Valletta / Citta' Umilissima", 'Il-Furjana': 'Floriana', 'Il-Hamrun': 'Il-Ħamrun / Ħamrun', 'Għajnsielem (u Kemmuna)': 'Għajnsielem and Comino'}
# CBS press-table labels that carry a province or "(gemeente)" suffix, bound to the official GM code (reviewed 31 Oct 2026)
NL_LABEL = {'Beek (L.)': 'GM0888', 'Groningen (gemeente)': 'GM0014', 'Hengelo (O.)': 'GM0164', 'Laren (NH.)': 'GM0417', 'Middelburg (Z.)': 'GM0687',
            'Rijswijk (ZH)': 'GM0603', 's-Gravenhage': 'GM0518', 's-Hertogenbosch': 'GM0796', 'Stein (L)': 'GM0971', 'Utrecht (gemeente)': 'GM0344',
            'Valkenburg a/d Geul': 'GM0994'}


# 2.12.2 (NZA-02): areas above the municipality that the trace found unbound. Serbia: statistical areas (oblasti) and
# regions are the NUTS-3/2/1 codes the places already carry; the seat-town check below must hold. Estonia: counties by
# their municipalities after the 2017 reform; every county must sit inside one NUTS-3 group (checked below).
RS_OBLAST = {'beogradska': 'RS110', 'zapadnobacka': 'RS121', 'juznobanatska': 'RS122', 'juznobacka': 'RS123', 'severnobanatska': 'RS124',
             'severnobacka': 'RS125', 'srednjobanatska': 'RS126', 'sremska': 'RS127', 'zlatiborska': 'RS211', 'kolubarska': 'RS212',
             'macvanska': 'RS213', 'moravicka': 'RS214', 'pomoravska': 'RS215', 'rasinska': 'RS216', 'raska': 'RS217', 'sumadijska': 'RS218',
             'borska': 'RS221', 'branicevska': 'RS222', 'zajecarska': 'RS223', 'jablanicka': 'RS224', 'nisavska': 'RS225', 'pirotska': 'RS226',
             'podunavska': 'RS227', 'pcinjska': 'RS228', 'toplicka': 'RS229'}
RS_SEAT = {'RS121': 'sombor', 'RS122': 'pancevo', 'RS123': 'novi sad', 'RS124': 'kikinda', 'RS125': 'subotica', 'RS126': 'zrenjanin', 'RS127': 'sremska mitrovica',
           'RS211': 'uzice', 'RS212': 'valjevo', 'RS213': 'sabac', 'RS214': 'cacak', 'RS215': 'jagodina', 'RS216': 'krusevac', 'RS217': 'kraljevo', 'RS218': 'kragujevac',
           'RS221': 'bor', 'RS222': 'pozarevac', 'RS223': 'zajecar', 'RS224': 'leskovac', 'RS225': 'nis', 'RS226': 'pirot', 'RS227': 'smederevo', 'RS228': 'vranje', 'RS229': 'prokuplje'}
RS_GRAD = {'grad_nis': ('Niš - ',), 'grad_novi_sad': ('Novi Sad', 'Petrovaradin'), 'grad_pozarevac': ('Požarevac', 'Kostolac'),
           'grad_uzice': ('Užice', 'Sevojno'), 'grad_vranje': ('Vranje', 'Vranjska Banja')}   # city (grad) = its city municipalities
RS_REGION = {'beogradski_region': 'RS11', 'region_vojvodine': 'RS12', 'region_sumadije_i_zapadne_srbije': 'RS21', 'region_juzne_i_istocne_srbije': 'RS22', 'srbija_sever': 'RS1', 'srbija_jug': 'RS2'}
EE_COUNTY = {'harju': (['anija', 'harku', 'joelahtme', 'keila linn', 'kiili', 'kose', 'kuusalu', 'loksa', 'laane harju', 'maardu', 'raasiku', 'rae', 'saku', 'saue', 'tallinn', 'viimsi'], 'EE001'),
             'hiiu': (['hiiumaa'], 'EE004'), 'ida viru': (['alutaguse', 'johvi', 'kohtla jarve', 'luganuse', 'narva linn', 'narva joesuu', 'sillamae', 'toila'], 'EE00A'),
             'jarva': (['jarva', 'paide', 'turi'], 'EE009'), 'jogeva': (['jogeva', 'mustvee', 'poltsamaa'], 'EE008'), 'laane': (['haapsalu', 'laane nigula', 'vormsi'], 'EE004'),
             'laane viru': (['haljala', 'kadrina', 'rakvere vald', 'rakvere linn', 'tapa', 'vinni', 'viru nigula', 'vaike maarja'], 'EE009'),
             'parnu': (['haademeeste', 'kihnu', 'laaneranna', 'pohja parnumaa', 'parnu', 'saarde', 'tori'], 'EE004'), 'polva': (['kanepi', 'polva', 'rapina'], 'EE008'),
             'rapla': (['kehtna', 'kohila', 'marjamaa', 'rapla'], 'EE009'), 'saare': (['muhu', 'ruhnu', 'saaremaa'], 'EE004'),
             'tartu': (['elva', 'kambja', 'kastre', 'luunja', 'noo', 'peipsiaare', 'tartu linn', 'tartu vald'], 'EE008'), 'valga': (['otepaa', 'torva', 'valga'], 'EE008'),
             'viljandi': (['mulgi', 'pohja sakala', 'viljandi linn', 'viljandi vald'], 'EE008'), 'voru': (['antsla', 'rouge', 'setomaa', 'voru linn', 'voru vald'], 'EE008')}


def ee_county(key):
    names, n3 = EE_COUNTY[key]
    hits = [p for p in places('EE') if any(fold(p[1]) == n or fold(p[1]).startswith(n + ' ') for n in names)]
    got = {n for n in names if any(fold(p[1]) == n or fold(p[1]).startswith(n + ' ') for p in hits)}
    assert got == set(names) and all(p[3] == n3 for p in hits), ('EE county rule', key, set(names) - got, [p for p in hits if p[3] != n3])
    return hits


def associate(recs):
    geos = {}
    for r in recs: geos.setdefault(r['source_geo_id'], r)
    out, unresolved = [], []
    cache = {}
    def P(cc):
        if cc not in cache: cache[cc] = places(cc)
        return cache[cc]
    for gid, r in sorted(geos.items()):
        cc, lvl, lab = r['country_code'], r['source_geo_level'], r['area_label']
        if lvl == 'country':
            out.append((gid, cc, '*', 'country_context', 'national figure, shown as country context on every place')); continue
        if lvl == 'multicountry_aggregate':
            out.append((gid, '', '*', 'benchmark', 'EU/euro-area aggregate, shown as a comparison line only')); continue
        hits = []
        if lvl == 'municipality' and cc == 'NL' and lab in NL_LABEL:
            hits = [p for p in P('NL') if p[0] == NL_LABEL[lab]]
            rel, ev = 'is', 'CBS publisher label with a province or (gemeente) suffix, bound to its CBS municipality code (reviewed 2.12)'
        elif cc == 'MT' and lvl == 'local_council_locality':
            # reviewed 31 Oct 2026: Maltese locality names with and without the article, matched to either half of the
            # place list's "Maltese / English" names; the rest by the reviewed list MT_LABEL
            def core(t): return re.sub(r"^(il|l|ix|iz|is|ir|in|id|it|tal|tas|taz|ta|hal|haz|has|h|ghar)[ -]+", '', fold(t).replace("'", ' ').strip())
            want = MT_LABEL.get(lab)
            hits = [p for p in P('MT') if (want and fold(p[1]) == fold(want)) or (not want and any(core(part) == core(lab) for part in p[1].split(' / ')))]
            rel, ev = 'is', 'Malta Gazette locality name matched to the Maltese or English half of the place name (reviewed)'
        elif lvl == 'municipality' and cc in ('RS', 'EE'):
            # reviewed 31 Oct 2026: Statistics Estonia writes "X rural municipality" / "X city" for "X vald" / "X linn";
            # the Serbian office lists Belgrade and Niš city municipalities by their own name ("Zemun", "Palilula (Niš)"),
            # Nestlyzer as "Belgrade - Zemun", "Niš - Palilula"; đ is written dj in the place list
            base = re.sub(r' rural municipality$', ' vald', re.sub(r' city$', ' linn', lab)) if cc == 'EE' else lab
            m2 = re.match(r'^(.*) \((Beograd|Niš)\)$', base)
            cands = {fold(base), fold(base.replace('đ', 'dj').replace('Đ', 'Dj'))}
            if cc == 'RS':
                core = m2.group(1) if m2 else base
                city = {'Beograd': 'Belgrade', 'Niš': 'Niš'}.get(m2.group(2)) if m2 else None
                cands |= {fold(c + ' - ' + core) for c in ([city] if city else ['Belgrade', 'Niš'])}
            hits = [p for p in P(cc) if fold(p[1]) in cands]
            if len({p[0] for p in hits}) > 1 and cc == 'RS' and not m2: hits = [p for p in hits if not fold(p[1]).startswith(('belgrade', 'nis'))] or hits
            rel, ev = 'is', 'statistics-office municipality label matched to the place list (reviewed suffix and city-municipality rules)'
        elif lvl == 'municipality':
            hits = [p for p in P(cc) if fold(p[1]) == fold(lab) or fold(p[1]).split(' ')[0] == fold(lab)]
            rel, ev = 'is', 'publisher municipality label matched to the official municipality name (exact, accents folded)'
        elif gid == 'FI:publisher_label:espoo_kauniainen':
            hits = [p for p in P('FI') if fold(p[1]) in ('espoo', 'kauniainen') or fold(p[1]).startswith(('espoo', 'kauniainen'))]; rel, ev = 'group_member', 'publisher group of two named municipalities'
        elif gid == 'NO:publisher_label:oslo_and_baerum':
            hits = [p for p in P('NO') if fold(p[1]) in ('oslo', 'baerum')]; rel, ev = 'zone_member', 'rental zone named after its two municipalities'
        elif gid == 'NO:publisher_label:akershus_except_baerum':
            hits = [p for p in P('NO') if p[0].startswith('32') and fold(p[1]) != 'baerum']; rel, ev = 'zone_member', 'Akershus county (2024 municipality codes 32xx) without Baerum, as the zone name states'
        elif gid == 'SE:publisher_label:greater_stockholm':
            hits = [p for p in P('SE') if p[0].startswith('01')]; rel, ev = 'metro_member', 'SCB Greater Stockholm = Stockholm county municipalities (codes 01xx)'
        elif gid == 'SE:publisher_label:greater_gothenburg':
            hits = [p for p in P('SE') if p[0] in SE_GOT]; rel, ev = 'metro_member', 'SCB Greater Gothenburg: its 13 member municipalities'
        elif gid == 'SE:publisher_label:greater_malmo':
            hits = [p for p in P('SE') if p[0] in SE_MAL]; rel, ev = 'metro_member', 'SCB Greater Malmo: its 12 member municipalities'
        elif cc == 'RS' and lvl == 'district' and fold(lab).replace(' oblast', '') in RS_OBLAST:
            code = RS_OBLAST[fold(lab).replace(' oblast', '')]; hits = [p for p in P('RS') if p[3] == code]
            seat = RS_SEAT.get(code)
            assert not seat or any(fold(p[1]).startswith(seat) for p in hits), ('RS seat check', code, seat)
            rel, ev = 'district', 'statistical area (oblast) = NUTS-3 code ' + code + ' the places carry; seat town inside (checked)'
        elif cc == 'RS' and gid.split(':')[-1] in RS_GRAD:
            m = RS_GRAD[gid.split(':')[-1]]; hits = [p for p in P('RS') if p[1] in m or p[1].startswith(m[0]) and m[0].endswith(' ')]
            assert len(hits) >= 2, ('RS grad', gid); rel, ev = 'group_member', 'city (grad) made up of its city municipalities, named in the law on territorial organisation'
        elif cc == 'RS' and gid.split(':')[-1] in RS_REGION:
            code = RS_REGION[gid.split(':')[-1]]; hits = [p for p in P('RS') if p[3].startswith(code)]
            rel, ev = 'stat_region', 'statistical region = NUTS code ' + code + ' (all places whose NUTS-3 code starts with it)'
        elif cc == 'EE' and lvl == 'county' and fold(lab).replace(' county', '') in EE_COUNTY:
            hits = ee_county(fold(lab).replace(' county', '')); rel, ev = 'county', 'county = its municipalities after the 2017 reform (all inside one NUTS-3 group, checked)'
        elif gid in US_PRINCIPAL:
            want = US_PRINCIPAL[gid]; hits = [p for p in P('US') if any(re.sub(r' \(.*\)$', '', p[1]) == n and p[2] == rc for n, rc in want)]
            rel, ev = 'principal_city', 'named principal city of the metropolitan statistical area (title); other member places not associated yet'
        if hits:
            for p in hits: out.append((gid, cc, p[0], rel, ev))
        else: unresolved.append((gid, cc, lvl, lab))
    return out, unresolved


DECISIONS = os.path.join(CTX, 'publication_decisions.csv')
CC_ALIAS = {'GR': 'EL'}   # NZA trace: Greek national rows carried ISO 'GR'; the place data use the Eurostat code 'EL'


def holds_of(r):
    h = r.get('hold_reasons')
    if isinstance(h, str): h = json.loads(h) if h.strip() else []
    return [x for x in (h or []) if x]


def publication(recs):
    """2.12.2 (NZA-01): the effective display state of every stored record. The original flags stay in the store as
    provenance. A record is published when it was already in production before the flag existed, or when a reviewed
    decision for its source resolves every hold it carries. A hold or refusal wins; nothing is approved in bulk."""
    dec = {}
    if os.path.exists(DECISIONS):
        for d in csv.DictReader(open(DECISIONS, encoding='utf-8')):
            if d['source_id'] in dec: raise SystemExit('two current decisions for ' + d['source_id'] + ': supersede the old one')
            dec[d['source_id']] = d
    out = {}
    for r in recs:
        h, d = holds_of(r), dec.get(r['source_id'])
        if 'publication_approved' not in r:
            out[r['record_id']] = ('published', 'production_before_flags', '', []); continue
        if d is None:
            out[r['record_id']] = ('held', 'no_decision', '', ['SOURCE_REVIEW_PENDING'] + (['SOURCE_HOLD'] if h else [])); continue
        left = [x for x in h if x not in d['resolves_holds'].split(';')] + [x for x in d['remaining_holds'].split(';') if x]
        if d['decision'] == 'publish' and not left and r.get('ingestion_status') != 'withdrawn':
            out[r['record_id']] = ('published', 'reviewed', d['decision_id'], [])
        else:
            codes = ['SOURCE_HOLD'] + (['RIGHTS_REVIEW_PENDING'] if any('rights' in x for x in left) else []) if d['decision'] != 'refuse' else ['SOURCE_REFUSED']
            out[r['record_id']] = ('held', d['decision'], d['decision_id'], codes)
    return out


def cmd_build():
    allrecs = list(load_store().values())
    if not allrecs: raise SystemExit('no stored records: run import --apply first')
    pub = publication(allrecs)
    recs = [r for r in allrecs if pub[r['record_id']][0] == 'published']
    assoc, unresolved = associate(recs)
    with open(os.path.join(CTX, 'associations.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['source_geo_id', 'country', 'place_oid', 'relationship', 'evidence']); w.writerows(assoc)
    with open(os.path.join(CTX, 'unresolved_associations.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['source_geo_id', 'country', 'level', 'label']); w.writerows(unresolved)
    by_cc = {}
    agg = [r for r in recs if r['source_geo_level'] == 'multicountry_aggregate']
    KEEP = ['record_id', 'area_label', 'source_geo_id', 'source_geo_level', 'indicator_id', 'label', 'value', 'unit', 'reference_period', 'statistic', 'dimensions', 'source_id', 'source_url', 'source_release', 'quality_flags', 'uncertainty']
    for r in recs:
        if r['country_code']: by_cc.setdefault(CC_ALIAS.get(r['country_code'], r['country_code']), []).append(r)
    stats = {}
    for cc, rs in sorted(by_cc.items()):
        p = os.path.join(ROOT, 'data', 'x', cc + '.json')
        if not os.path.exists(p): continue
        x = json.load(open(p))
        eu = cc in {'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'}
        rows = rs + (agg if eu else [])
        geos = {}
        for a in assoc:
            if a[1] == cc and a[2] != '*': geos.setdefault(a[2], []).append([a[0], a[3]])
        x['ctx'] = {'release': 'verified-rent-pay-2026-10-21', 'records': [{k: r.get(k) for k in KEEP} for r in sorted(rows, key=lambda r: (r['indicator_id'], r['source_geo_id'], str(r['reference_period'])))],
                    'places': geos}
        json.dump(x, open(p, 'w'), separators=(',', ':'), ensure_ascii=False)
        stats[cc] = {'records': len(rows), 'places_with_local_context': len(geos)}
    rep = {'release': 'verified-rent-pay-2026-10-21', 'stored_records': len(allrecs), 'published_records': len(recs), 'associations': len(assoc), 'unresolved_geographies': len(unresolved), 'by_country': stats,
           'by_relationship': {k: sum(1 for a in assoc if a[3] == k) for k in sorted(set(a[3] for a in assoc))}}
    rep['publication'] = {k: sum(1 for v in pub.values() if v[0] + '/' + v[1] == k) for k in sorted(set(v[0] + '/' + v[1] for v in pub.values()))}
    # record-level build trace (NZA-06): every stored record has one outcome; the browser trace adds what each page shows
    bound = {}
    for a in assoc: bound.setdefault((a[1], a[0]), set()).add(a[2])
    with gzip.open(os.path.join(CTX, 'record_trace.csv.gz'), 'wt', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['record_id', 'source_id', 'country', 'source_geo_id', 'indicator_id', 'original_publication', 'original_holds', 'review_state', 'decision_id', 'published', 'geography', 'places_bound', 'scoring_state', 'reason_codes'])
        for r in sorted(allrecs, key=lambda r: r['record_id']):
            st, why, did, codes = pub[r['record_id']]; cc = r['country_code']
            if st == 'published':
                if r['source_geo_level'] in ('country', 'multicountry_aggregate'): geo, n = r['source_geo_level'], ''
                else:
                    pl = bound.get((cc, r['source_geo_id']), set()); n = len(pl - {'*'})
                    geo = 'bound' if n else ('area_wide' if '*' in pl else 'unresolved')
                    if geo == 'unresolved': codes = codes + (['BOUNDARY_INCOMPATIBLE'] if re.search('cohort|market_zone', r['source_geo_level']) else ['GEOGRAPHY_UNRESOLVED'])
                if not os.path.exists(os.path.join(ROOT, 'data', 'x', CC_ALIAS.get(cc, cc) + '.json')) and r['source_geo_level'] != 'multicountry_aggregate': codes = codes + ['NOT_IN_RELEASE']
            else: geo, n = '', ''
            w.writerow([r['record_id'], r['source_id'], cc, r['source_geo_id'], r['indicator_id'], r.get('publication_approved', ''), ';'.join(holds_of(r)), why, did, st == 'published', geo, n, 'context_not_scored', ';'.join(codes)])
    json.dump(rep, open(os.path.join(CTX, 'build_report.json'), 'w'), indent=1)
    print(json.dumps(rep)[:1500])


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'import': cmd_import(a[1], '--apply' in a)
    elif a and a[0] == 'build': cmd_build()
    else: print(__doc__)
