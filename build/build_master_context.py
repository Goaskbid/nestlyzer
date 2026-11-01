#!/usr/bin/env python3
"""Nestlyzer Master V7 (release 2026-10-21-master-v7): import, reconcile, associate, publish as context.

    python3 build/build_master_context.py import <All_Collected_Data.csv> [--apply]
    python3 build/build_master_context.py build      # reconcile + associate + reports (docs/master/) + merge into data/x ctx

Rules (from the master brief): one representation imported; held_for_review records never reach the site; all records keep
score_eligible=false (context only, no score change, never counted as measured local data); publisher geographies reach
places only through build/source/context/master_associations.csv (official code first, then exact unique name within the
country; everything else unresolved); values already present in the build for the same place, value and period are
reported as already present and not shown twice."""
import csv, gzip, hashlib, json, os, re, sys, unicodedata
from collections import Counter, defaultdict
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CTX = os.path.join(ROOT, 'build', 'source', 'context'); os.makedirs(CTX, exist_ok=True)
STORE = os.path.join(CTX, 'master_records.jsonl.gz')
REP = os.path.join(ROOT, 'docs', 'master'); os.makedirs(REP, exist_ok=True)
NATIVE = {'GB': 'UK', 'GR': 'EL'}
CCS = None


def native_ccs():
    global CCS
    if CCS is None: CCS = {c['cc'] for c in json.load(open(os.path.join(ROOT, 'data', 'meta.json')))['countries']}
    return CCS


def cmd_import(path, apply, release='2026-10-21-master-v7'):
    raw = open(path, 'rb').read(); sha = hashlib.sha256(raw).hexdigest()
    rows = list(csv.DictReader(raw.decode('utf-8-sig').splitlines()))
    for r in rows:
        if r.get('score_eligible', 'False') not in ('False', 'false', '0', ''): raise SystemExit('score_eligible must be false: ' + r['record_id'])
    ids = [r['record_id'] for r in rows]
    if len(set(ids)) != len(ids): raise SystemExit('duplicate record_id in input')
    have = {}
    if os.path.exists(STORE): have = {j['record_id']: j for j in (json.loads(l) for l in gzip.open(STORE, 'rt', encoding='utf-8'))}
    add, same, conflict = [], 0, []
    for r in rows:
        o = have.get(r['record_id'])
        if o is None: add.append(r)
        elif json.dumps(o, sort_keys=True) == json.dumps(r, sort_keys=True): same += 1
        else: conflict.append(r['record_id'])
    print(json.dumps({'input_rows': len(rows), 'input_sha256': sha, ('added' if apply else 'would_add'): len(add), 'identical': same, 'conflicts': len(conflict)}))
    if conflict: raise SystemExit('refused: %d records differ from the stored release' % len(conflict))
    if apply and add:
        with gzip.open(STORE, 'wt', encoding='utf-8') as f:
            for r in sorted(list(have.values()) + add, key=lambda x: x['record_id']): f.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + '\n')
        log = os.path.join(CTX, 'import_log.json'); L = json.load(open(log)) if os.path.exists(log) else []
        L.append({'release': release, 'file_sha256': sha, 'added': len(add), 'identical': same}); json.dump(L, open(log, 'w'), indent=1)


def fold(s):
    s = (s or '').replace('æ', 'ae').replace('ø', 'o').replace('ß', 'ss').replace('ł', 'l').replace('Ł', 'L')
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'\(.*?\)', '', s).split(' / ')[0]
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def roster(cc):
    d = json.load(open(os.path.join(ROOT, 'data', 'c', cc + '.json'))); c = d['cols']; iS = c.index('sup')
    act = [r for r in d['rows'] if not r[iS]]
    by_code = {r[0]: r for r in act}
    names = defaultdict(list)
    for r in act:
        f = fold(r[1]); names[f].append(r[0])
        for suf in (' vald', ' vald', ' linn', ' savivaldybe', ' miesto savivaldybe', ' rajono savivaldybe', ' municipality', ' kommune', ' kommun'):
            if f.endswith(suf): names[f[: -len(suf)].strip()].append(r[0])
    return by_code, names


CODE_RX = [  # (geo id regex, country, code transform)
    (r'^SCB_KOMMUN:(\d{4})$', 'SE', None), (r'^SSB_KOMMUNE:(\d{4})$', 'NO', None), (r'^GSS:([EWSN]\d{8})$', 'UK', None), (r'^GB:([EWSN]\d{8})$', 'UK', None),
    (r'^NL:(GM\d{4})$', 'NL', None), (r'^INSEE_COM:(\w{5})$', 'FR', None), (r'^FR:COM:(\w{5})$', 'FR', None), (r'^FI:municipality:(\d{3})$', 'FI', None), (r'^FI:vero_area:(\d{3})$', 'FI', None),
    (r'^SI:municipality:(\d{1,3})$', 'SI', lambda x: x.zfill(3)), (r'^SI:surs_profile:(\d{1,3})$', 'SI', lambda x: x.zfill(3)), (r'^LT:municipality:(\d+)$', 'LT', None), (r'^IS:municipality:(\d{4})$', 'IS', None),
]


US_NAMES = dict(zip('AK AL AR AZ CA CO CT DC DE FL GA HI IA ID IL IN KS KY LA MA MD ME MI MN MO MS MT NC ND NE NH NJ NM NV NY OH OK OR PA RI SC SD TN TX UT VA VT WA WI WV WY'.split(),
    ['Alaska', 'Alabama', 'Arkansas', 'Arizona', 'California', 'Colorado', 'Connecticut', 'District of Columbia', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Iowa', 'Idaho', 'Illinois', 'Indiana', 'Kansas', 'Kentucky', 'Louisiana', 'Massachusetts', 'Maryland', 'Maine', 'Michigan', 'Minnesota', 'Missouri', 'Mississippi', 'Montana', 'North Carolina', 'North Dakota', 'Nebraska', 'New Hampshire', 'New Jersey', 'New Mexico', 'Nevada', 'New York', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Virginia', 'Vermont', 'Washington', 'Wisconsin', 'West Virginia', 'Wyoming']))
AREA_FALLBACK = {'US-' + k: v for k, v in US_NAMES.items()}
US_ST = 'AK AL AR AZ CA CO CT DC DE FL GA HI IA ID IL IN KS KY LA MA MD ME MI MN MO MS MT NC ND NE NH NJ NM NV NY OH OK OR PA RI SC SD TN TX UT VA VT WA WI WV WY'.split()


def region_rule(gid, r, cc):
    """(key, value) for a whole state or NUTS3 county: matched in the browser against the place's rc or n3."""
    m = re.match(r'^US-([A-Z]{2})$', gid)
    if cc == 'US' and m and m.group(1) in US_ST: return ('rc', 'US%02d' % US_ST.index(m.group(1)), 'state (GeoNames admin1 code)')
    if cc in ('RO', 'HR', 'EL', 'BG', 'HU', 'SK', 'PL', 'PT', 'LT', 'EE', 'LV', 'SI') and r['source_geo_level'] in ('county', 'county_or_Bucharest', 'region'):
        nuts = json.load(open(os.path.join(ROOT, 'data', 'c', cc + '.json'))).get('nuts', {})
        nm = fold(r.get('source_geo_name') or gid.split(':')[-1]).replace(' county', '').replace('judetul ', '')
        hits = [k for k, v in nuts.items() if len(k) == 5 and (fold(v) == nm or fold(v).replace(' county', '') == nm or fold(v).startswith(nm + ' ') or nm == 'bucuresti' and fold(v).startswith('bucuresti'))]
        if len(hits) == 1: return ('n3', hits[0], 'NUTS3 region by exact name')
    return None


MAPF = os.path.join(ROOT, 'build', 'source', 'context', 'master_geo_mapping.csv')
OVL = os.path.join(ROOT, 'build', 'source', 'context', 'overlap_decisions.csv')   # reviewed repeats/conflicts: drop_record_id is not shown
RELEASE_OF = {'TABLES_2026_10_25': 'tables-2026-10-25', **{'WB_WDI_' + k.upper(): 'wdi-2026-10' for k in ('ny.gnp.pcap.pp.cd', 'sl.uem.totl.zs', 'fp.cpi.totl.zg', 'pa.nus.pppc.rf', 'sp.dyn.le00.in', 'sp.dyn.imrt.in', 'sh.med.beds.zs', 'vc.ihr.psrc.p5', 'sh.sta.traf.p5', 'en.atm.pm25.mc.m3', 'eg.elc.rnew.zs', 'it.net.bbnd.p2', 'se.ter.enrr', 'si.pov.gini', 'lp.lpi.ovrl.xq', 'gc.tax.totl.gd.zs', 'ic.tax.totl.cp.zs', 'sl.tlf.cact.fe.zs', 'sp.pop.65up.to.zs')}, 'US_BTS_PORTS_2026': 'delivery-2026-10-24', 'FR_INSEE_DOSSIER_20260806': 'delivery-2026-10-24', 'EU_EUROSTAT_HOUSING_2025': 'delivery-2026-10-24'}


# 2.12.2 (NZA trace): reviewed bindings for geographies the record trace found unbound
HR_COUNTY = {'bjelovar-bilogora': 'HR021', 'virovitica-podravina': 'HR022', 'pozega-slavonia': 'HR023', 'slavonski-brod-posavina': 'HR024', 'osijek-baranja': 'HR025',
             'vukovar-srijem': 'HR026', 'karlovac': 'HR027', 'sisak-moslavina': 'HR028', 'primorje-gorski-kotar': 'HR031', 'lika-senj': 'HR032', 'zadar': 'HR033',
             'sibenik-knin': 'HR034', 'split-dalmatia': 'HR035', 'istria': 'HR036', 'dubrovnik-neretva': 'HR037', 'medimurje': 'HR061', 'varazdin': 'HR062',
             'koprivnica-krizevci': 'HR063', 'krapina-zagorje': 'HR064', 'zagreb-county': 'HR065'}
EC_CITY = {'vienna': 'wien', 'munich': 'munchen', 'rome': 'roma', 'turin': 'torino', 'naples': 'napoli', 'copenhagen': 'kobenhavn', 'prague': 'praha',
           'warsaw': 'warszawa', 'lisbon': 'lisboa', 'bucharest': 'bucuresti', 'belgrade': 'beograd', 'athens': 'athina', 'geneva': 'geneve', 'zurich': 'zurich',
           'brussels': 'bruxelles', 'antwerp': 'antwerpen', 'liege': 'liege', 'gdansk': 'gdansk', 'bialystok': 'bialystok', 'malmo': 'malmo', 'cluj_napoca': 'cluj napoca',
           'piatra_neamt': 'piatra neamt', 'reykjavik': 'reykjavik', 'luxembourg': 'luxembourg', 'nicosia': 'lefkosia', 'heraklion': 'irakleio', 'groningen': 'groningen'}
UK_SUCC = {'E06000060': 'E07000004 E07000005 E07000006 E07000007', 'E06000061': 'E07000150 E07000152 E07000153 E07000156', 'E06000062': 'E07000151 E07000154 E07000155',
           'E06000063': 'E07000026 E07000028 E07000029', 'E06000064': 'E07000027 E07000030 E07000031', 'E06000065': 'E07000163 E07000164 E07000165 E07000166 E07000167 E07000168 E07000169',
           'E06000066': 'E07000187 E07000188 E07000189 E07000190 E07000191', 'E07000244': 'E07000205 E07000206', 'E07000245': 'E07000201 E07000204', 'E07000246': 'E07000190 E07000191'}
def uk_live():
    if not hasattr(uk_live, 'v'):
        d = json.load(open(os.path.join(ROOT, 'data', 'c', 'UK.json'))); i = d['cols'].index('sup'); uk_live.v = {r[0] for r in d['rows'] if not r[i]}
    return uk_live.v


def hk_dcd():
    if not hasattr(hk_dcd, 'm'):
        f = os.path.join(ROOT, 'build', 'source', 'context', 'hk_dcd_codes.csv')
        hk_dcd.m = {r['source_geo_id']: r['dc_code'] for r in csv.DictReader(open(f, encoding='utf-8'))} if os.path.exists(f) else {}
    return hk_dcd.m


UK_REGION = {'E12000001': 'UKC', 'E12000002': 'UKD', 'E12000003': 'UKE', 'E12000004': 'UKF', 'E12000005': 'UKG', 'E12000006': 'UKH', 'E12000007': 'UKI', 'E12000008': 'UKJ', 'E12000009': 'UKK'}
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_context_records import EE_COUNTY, ee_county   # one reviewed county list for both stores


def reviewed_map():
    """Reviewed mappings delivered as geo_mapping.csv (source_geo_id,target_kind,target_code,relationship,evidence,source_url)."""
    out = defaultdict(list)
    if os.path.exists(MAPF):
        for m in csv.DictReader(open(MAPF, encoding='utf-8')):
            if m['target_kind'] in ('oid', 'nuts3', 'rc') and m['target_code']: out[m['source_geo_id']].append(m)
    return out


def cmd_mapping(path):
    rows = list(csv.DictReader(open(path, encoding='utf-8-sig')))
    need = {'source_geo_id', 'target_kind', 'target_code', 'relationship', 'evidence'}
    if not rows or not need <= set(rows[0]): sys.exit('geo_mapping.csv needs columns ' + ','.join(sorted(need)))
    old = {(m['source_geo_id'], m['target_kind'], m['target_code']): m for m in csv.DictReader(open(MAPF, encoding='utf-8'))} if os.path.exists(MAPF) else {}
    bad = [r for r in rows if r['target_kind'] not in ('oid', 'nuts3', 'rc', 'none')]
    if bad: sys.exit('unknown target_kind in %d rows' % len(bad))
    for r in rows: old[(r['source_geo_id'], r['target_kind'], r['target_code'])] = {k: r.get(k, '') for k in ('source_geo_id', 'target_kind', 'target_code', 'relationship', 'evidence', 'source_url')}
    with open(MAPF, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['source_geo_id', 'target_kind', 'target_code', 'relationship', 'evidence', 'source_url']); w.writeheader(); w.writerows(old.values())
    print('mapping rows stored', len(old))


def associate(recs):
    RM = reviewed_map()
    rost = {}
    def R(cc):
        if cc not in rost: rost[cc] = roster(cc) if cc in native_ccs() else ({}, {})
        return rost[cc]
    geos = {}
    for r in recs: geos.setdefault(r['source_geo_id'], r)
    assoc, unresolved, kinds = [], [], Counter()
    for gid, r in geos.items():
        lvl = r['source_geo_level']; cs = json.loads(r['country_codes'] or '[]'); cc = NATIVE.get(cs[0], cs[0]) if len(cs) == 1 else ''
        if lvl in ('country', 'country_context', 'country_or_territory', 'country_scenario', 'political_jurisdiction'):
            if cc in native_ccs(): assoc.append((gid, cc, '*', 'country_context', 'national figure')); kinds['country_context'] += 1
            else: kinds['outside_residential_universe'] += 1
            continue
        if cc not in native_ccs(): kinds['outside_residential_universe'] += 1; continue
        by_code, names = R(cc); hit = None; how = ''
        if gid in RM:
            for m in RM[gid]:
                t = m['target_code']
                if m['target_kind'] == 'oid':
                    code = t.split(':', 1)[1] if ':' in t else t
                    if code in by_code: assoc.append((gid, cc, code, m['relationship'] or 'contains', 'reviewed: ' + m['evidence'])); kinds['reviewed mapping'] += 1
                else: assoc.append((gid, cc, '@' + ('n3' if m['target_kind'] == 'nuts3' else 'rc') + ':' + t, 'region', 'reviewed: ' + m['evidence'])); kinds['reviewed mapping'] += 1
            continue
        for rx, c2, tf in CODE_RX:
            m = re.match(rx, gid)
            if m and c2 == cc:
                code = tf(m.group(1)) if tf else m.group(1)
                if code in by_code: hit, how = [code], 'official code'
                break
        if not hit and lvl in ('municipality', 'local_authority', 'territorial_authority'):
            cand = names.get(fold(r.get('source_geo_name') or gid.split(':')[-1]), [])
            cand = list(dict.fromkeys(cand))
            if len(cand) == 1: hit, how = cand, 'exact unique name within the country'
        if not hit and cc == 'UK' and gid[4:] in UK_SUCC:
            live = [o for o in UK_SUCC[gid[4:]].split() if o in uk_live()]   # districts still listed as places (not superseded)
            for o in live: assoc.append((gid, cc, o, 'contains', 'successor authority (2020-2023 reorganisation) that contains this former district'))
            if live: kinds['place:UK successor'] += 1; continue
        if not hit and cc == 'UK' and gid[4:] in UK_REGION:
            assoc.append((gid, cc, '@n3:' + UK_REGION[gid[4:]] + '*', 'region', 'English region = NUTS-1 ' + UK_REGION[gid[4:]])); kinds['region:UK region'] += 1; continue
        if not hit and cc == 'HK' and gid in hk_dcd():
            from build_context_records import world_hits
            pl, rr = world_hits('HK', hk_dcd()[gid], '')
            for p in pl: assoc.append((gid, cc, p[0], 'district', 'C&SD district code ' + hk_dcd()[gid] + ' (supplier alias, 1 Nov 2026); ' + rr[1]))
            if pl: kinds['place:HK district'] += 1; continue
        if not hit and cc == 'HR' and gid.startswith('HR:county:') and gid[10:] in HR_COUNTY:
            assoc.append((gid, cc, '@n3:' + HR_COUNTY[gid[10:]], 'region', 'county = NUTS-3 ' + HR_COUNTY[gid[10:]] + ' (English county name, reviewed 2.12.2)')); kinds['region:HR county'] += 1; continue
        if not hit and cc == 'EE' and gid.startswith('EE:county'):
            key = gid.split(':')[-1].replace('-', ' ')
            pl = ee_county(key) if key in EE_COUNTY else [p for p in ee_county('harju') if fold(p[1]) != 'tallinn'] if key == 'harju excluding tallinn' else []
            for p in pl: assoc.append((gid, cc, p[0], 'county', 'county = its municipalities after the 2017 reform (reviewed 2.12.2)'))
            if pl: kinds['place:EE county'] += 1; continue
        if not hit and lvl == 'survey_city':
            nm = EC_CITY.get(gid.split(':')[-1], fold(r.get('source_geo_name') or ''))
            cand = list(dict.fromkeys(names.get(nm, [])))
            if len(cand) == 1: hit, how = cand, 'survey city = its core municipality (reviewed 2.12.2)'
        if not hit:
            rr = region_rule(gid, r, cc)
            if rr: assoc.append((gid, cc, '@' + rr[0] + ':' + rr[1], 'region', rr[2])); kinds['region:' + rr[2]] += 1; continue
        if not hit and lvl == 'climate_station':
            cand = list(dict.fromkeys(names.get(fold(r.get('source_geo_name') or ''), [])))
            if len(cand) == 1: hit, how = cand, 'weather station named after the place'
        if hit:
            for p in hit: assoc.append((gid, cc, p, 'is' if lvl in ('municipality', 'local_authority', 'territorial_authority') else 'station' if lvl == 'climate_station' else lvl, how))
            kinds['place:' + how] += 1
        else:
            unresolved.append((gid, cc, lvl, r.get('source_geo_name', ''))); kinds['unresolved:' + lvl] += 1
    return assoc, unresolved, kinds


def num(v):
    try: return float(v)
    except Exception: return None


def cmd_build():
    recs = [json.loads(l) for l in gzip.open(STORE, 'rt', encoding='utf-8')]
    # review candidates (Master V7) and source-context-ready records (delivery 2026-10-24) are shown as context; held never.
    # Port-level records (BTS) are not places: they reach the site through build_port_stats.py instead.
    OK = ('review_candidate', 'source_context_ready')
    held = [r for r in recs if r['ingestion_status'] not in OK]
    drop = {}
    if os.path.exists(OVL):
        for d in csv.DictReader(open(OVL, encoding='utf-8')): drop[d['drop_record_id']] = d['kind']
    cand = [r for r in recs if r['ingestion_status'] in OK and num(r['value']) is not None and r['source_geo_level'] != 'port' and r['record_id'] not in drop]
    assoc, unresolved, kinds = associate(cand)
    with open(os.path.join(CTX, 'master_associations.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['source_geo_id', 'country', 'place_oid', 'relationship', 'evidence']); w.writerows(assoc)
    with open(os.path.join(REP, 'unresolved_geographies.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['source_geo_id', 'country', 'level', 'name']); w.writerows(sorted(unresolved))
    # reconcile against values already in the build (same place, same value, same period)
    placemap = defaultdict(list); cmap = defaultdict(set)
    for g, cc, p, rel, ev in assoc:
        if p == '*' or p.startswith('@'): cmap[g].add(cc)
        else: placemap[g].append((cc, p))
    present = set(); shard = {}
    def raws(cc):
        if cc not in shard:
            d = json.load(open(os.path.join(ROOT, 'data', 'c', cc + '.json'))); vals = defaultdict(set)
            for fid, col in d['fr'].items():
                for i, v in enumerate(col):
                    if v is not None: vals[d['rows'][i][0]].add(round(float(v), 2))
            shard[cc] = vals
        return shard[cc]
    for r in cand:
        for cc, p in placemap.get(r['source_geo_id'], []):
            if round(num(r['value']), 2) in raws(cc).get(p, ()): present.add(r['record_id'])
    KEEP = ['record_id', 'source_geo_id', 'source_geo_name', 'source_geo_level', 'indicator_id', 'label', 'value', 'unit', 'period', 'statistic', 'dimensions', 'source_id', 'source_url', 'source_release', 'quality_flags', 'purpose_tags']
    per = defaultdict(list)
    for r in cand:
        if r['record_id'] in present: continue
        tgt = {cc for cc, _ in placemap.get(r['source_geo_id'], [])} | cmap.get(r['source_geo_id'], set())
        for cc in tgt:
            o = {k: r.get(k) for k in KEEP}; o['value'] = num(r['value']); o['reference_period'] = o.pop('period'); o['area_label'] = o.pop('source_geo_name') or AREA_FALLBACK.get(o['source_geo_id']) or ''
            for k in ('dimensions', 'quality_flags', 'purpose_tags'):
                try: o[k] = json.loads(o[k]) if o[k] else ({} if k == 'dimensions' else [])
                except Exception: o[k] = {}
            if o['source_geo_level'] in ('country_context', 'country_or_territory', 'political_jurisdiction'): o['source_geo_level'] = 'country'
            o['release'] = RELEASE_OF.get(r['source_id'], 'master-v7')
            per[cc].append(o)
    # 2.12.2 record-level build trace (NZA-06): one outcome and reason per stored record; counts reconcile with the store
    have_cc = {f[:-5] for f in os.listdir(os.path.join(ROOT, 'data', 'x'))}
    with gzip.open(os.path.join(CTX, 'master_record_trace.csv.gz'), 'wt', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['record_id', 'source_id', 'country', 'source_geo_id', 'indicator_id', 'original_publication', 'original_holds', 'ingestion_status', 'published', 'targets', 'scoring_state', 'reason_codes'])
        for r in recs:
            rid = r['record_id']; tg = ''
            if r['ingestion_status'] not in OK: why = 'SOURCE_HOLD'
            elif r['source_geo_level'] == 'port': why = 'ROUTED_PORT_STATS'
            elif num(r['value']) is None: why = 'NOT_TYPED'
            elif rid in drop: why = 'DUPLICATE_CONCEPT:' + drop[rid]
            elif rid in present: why = 'DUPLICATE_CONCEPT:already_in_place_data'
            else:
                t = {cc for cc, _ in placemap.get(r['source_geo_id'], [])} | cmap.get(r['source_geo_id'], set())
                cs = json.loads(r.get('country_codes') or '[]'); c0 = NATIVE.get(cs[0], cs[0]) if len(cs) == 1 else ''
                tg = ';'.join(sorted(t)); why = '' if t & have_cc else ('NOT_IN_RELEASE' if t or (c0 and c0 not in have_cc) or r['source_geo_id'].startswith('aggregate:') and not t else 'GEOGRAPHY_UNRESOLVED')
            h = r.get('hold_reasons') or ''
            w.writerow([rid, r.get('source_id', ''), ';'.join(json.loads(r.get('country_codes') or '[]')), r['source_geo_id'], r['indicator_id'], r.get('publication_approved', ''), '' if h == '[]' else h, r['ingestion_status'], not why and 'True' or 'False', tg, 'context_not_scored', why])
    loaded = Counter(); places_ctx = Counter()
    for cc, rows in per.items():
        p = os.path.join(ROOT, 'data', 'x', cc + '.json')
        if not os.path.exists(p): continue
        x = json.load(open(p)); ctx = x.setdefault('ctx', {'records': [], 'places': {}})
        ctx['records'] = [o for o in ctx['records'] if o.get('release') not in ('master-v7', 'delivery-2026-10-24', 'wdi-2026-10', 'tables-2026-10-25')] + sorted(rows, key=lambda o: (o['indicator_id'], o['source_geo_id'], str(o['reference_period'])))
        regs = ctx.setdefault('regions', {})
        for g, c2, pl, rel, ev in assoc:
            if c2 == cc and pl.startswith('@'): regs[g] = pl[1:].split(':', 1)
        for g, c2, pl, rel, ev in assoc:
            if c2 == cc and pl != '*' and not pl.startswith('@'):
                lst = ctx['places'].setdefault(pl, [])
                if [g, rel] not in lst: lst.append([g, rel])
        ctx['release'] = 'verified-rent-pay-2026-10-21 + master-v7 + delivery-2026-10-24'
        json.dump(x, open(p, 'w'), separators=(',', ':'), ensure_ascii=False)
        loaded[cc] = len(rows); places_ctx[cc] = len({pl for g, c2, pl, rel, ev in assoc if c2 == cc and pl != '*' and not pl.startswith('@')})
    fields = Counter((r['source_geo_level'], r['indicator_id']) for cc in per for r in per[cc])
    rep = {'release': '2026-10-21-master-v7', 'stored': len(recs), 'held_excluded': len(held), 'review_candidates_numeric': len(cand),
           'already_present_same_place_value': len(present), 'overlap_decisions_applied': dict(Counter(drop.values())), 'port_records_routed_to_port_stats': sum(1 for r in recs if r['source_geo_level'] == 'port'), 'loaded_records_by_country': dict(sorted(loaded.items())), 'places_with_master_context': dict(sorted(places_ctx.items())),
           'geographies': dict(kinds), 'unresolved_geographies': len(unresolved), 'distinct_fields_loaded': len({k[1] for k in fields}), 'score_eligible': 0}
    json.dump(rep, open(os.path.join(REP, 'master_import_report.json'), 'w'), indent=1)
    with open(os.path.join(REP, 'field_coverage.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['country', 'level', 'indicator_id', 'records'])
        cnt = Counter((cc, r['source_geo_level'], r['indicator_id']) for cc in per for r in per[cc])
        for (cc, l, i), n in sorted(cnt.items()): w.writerow([cc, l, i, n])
    print(json.dumps(rep)[:2500])


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'import': cmd_import(a[1], '--apply' in a, next((x.split('=', 1)[1] for x in a if x.startswith('--release=')), '2026-10-21-master-v7'))
    elif a and a[0] == 'build': cmd_build()
    elif a and a[0] == 'mapping' and len(a) > 1: cmd_mapping(a[1])
    else: print(__doc__)
