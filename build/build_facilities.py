#!/usr/bin/env python3
"""2.15: infrastructure and industry layer (data/facilities.json).

Inputs (all public lists, stored in build/source):
  - deliveries/nz-expansion-20261105/03_NEW_ENTITIES.jsonl: US NRC power reactor roster (public domain, US federal),
    AGTC combined-transport terminal groups (Dutch treaty publication, public), UNESCO Global Network of Learning Cities.
    The India SEZ list is held: its licence forbids commercial reuse.
  - chem_parks.json (chemical parks and refinery complexes), major_seaports.json (main seaports).
Placement: NRC 'N miles DIR of Town, ST' is offset from the US place; AGTC and UNESCO by town name in the country.
Places that cannot be placed go to docs/audit/facilities_unresolved.json, never guessed.
"""
import json, math, re, subprocess, unicodedata, os, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda *p: os.path.join(ROOT, *p)
ENT = J('build/source/deliveries/nz-expansion-20261105/03_NEW_ENTITIES.jsonl')
HELD = {'IN_SEZ_OPERATIONAL_20250630'}
ISO = {'GB': 'UK', 'GR': 'EL'}
ST = dict(AL='Alabama', AK='Alaska', AZ='Arizona', AR='Arkansas', CA='California', CO='Colorado', CT='Connecticut', DE='Delaware', FL='Florida', GA='Georgia', HI='Hawaii', ID='Idaho', IL='Illinois', IN='Indiana', IA='Iowa', KS='Kansas', KY='Kentucky', LA='Louisiana', ME='Maine', MD='Maryland', MA='Massachusetts', MI='Michigan', MN='Minnesota', MS='Mississippi', MO='Missouri', MT='Montana', NE='Nebraska', NV='Nevada', NH='New Hampshire', NJ='New Jersey', NM='New Mexico', NY='New York', NC='North Carolina', ND='North Dakota', OH='Ohio', OK='Oklahoma', OR='Oregon', PA='Pennsylvania', RI='Rhode Island', SC='South Carolina', SD='South Dakota', TN='Tennessee', TX='Texas', UT='Utah', VT='Vermont', VA='Virginia', WA='Washington', WV='West Virginia', WI='Wisconsin', WY='Wyoming')
DIRS = {d: i * 22.5 for i, d in enumerate('N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW'.split())}
ALIAS = {'turin': 'torino', 'frankfurt main': 'frankfurt am main', 'frankfurt': 'frankfurt am main', 'cologne': 'koln', 'munich': 'munchen', 'milan': 'milano', 'rome': 'roma', 'naples': 'napoli', 'venice': 'venezia', 'florence': 'firenze', 'genoa': 'genova', 'vienna': 'wien', 'prague': 'praha', 'warsaw': 'warszawa', 'lisbon': 'lisboa', 'athens': 'athina', 'brussels': 'bruxelles', 'antwerp': 'antwerpen', 'the hague': "s-gravenhage", 'copenhagen': 'kobenhavn', 'gothenburg': 'goteborg', 'seville': 'sevilla', 'freiburg breisgau': 'freiburg im breisgau', 'basel weil am rhein': 'weil am rhein', 'berlin grossbeeren': 'grossbeeren', 'nuremberg': 'nurnberg', 'hanover': 'hannover', 'bucharest': 'bucuresti', 'seoul': 'seoul', 'mexico city': 'ciudad de mexico', 'sofija': 'sofia', 'gorna oriahovitza': 'gorna oryahovitsa', 'xi an': 'xian', 'hull': 'kingston upon hull', 'galati': 'galati', 'queretaro': 'queretaro'}

def norm(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().lower().replace('ß', 'ss')
    s = re.sub(r'\(.*?\)', ' ', s) if '(' in s and not re.search(r'\((main|breisgau)\)', s) else s
    s = re.sub(r'\s+-\s+interporto$', '', s); s = re.sub(r'^ft\.? ', 'fort ', s)
    s = re.sub(r'[^a-z0-9 ]+', ' ', s)
    s = re.sub(r'\b(city|stadt|kreisfreie|municipality|metropolitan|special|gu|si|gun)\b', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def index():
    js = r"""const ND=require('./src/data.js'),fs=require('fs'),H=ND.hydrate||ND.NestData.hydrate,m=JSON.parse(fs.readFileSync('data/meta.json'));const o=[];for(const c of m.countries){let a;try{a=H(JSON.parse(fs.readFileSync('data/c/'+c.cc+'.json')))}catch(e){continue}for(const r of a){if(r.superseded||!isFinite(r.lat))continue;o.push([c.cc,r.name,r.officialName||'',r.latin||'',r.region||'',r.lat,r.lon,r.popNow||r.population||0])}}process.stdout.write(JSON.stringify(o))"""
    return json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT, env=dict(os.environ, NODE_OPTIONS='--max-old-space-size=8192')))

def main():
    rows = index()
    by = collections.defaultdict(list)
    for cc, name, off, lat_n, reg, la, lo, pop in rows:
        for n in {norm(name), norm(off), norm(lat_n)} - {''}:
            by[(cc, n)].append((pop, la, lo, name, reg))
    def town(cc, name, reg=None):
        n = norm(name); n = ALIAS.get(n, n)
        c = by.get((cc, n), [])
        if reg: c = [x for x in c if x[4] == reg] or []
        if not c:  # prefix match on the biggest place, e.g. 'Ludwigshafen' -> 'Ludwigshafen am Rhein'
            pre = [x for (k, nn), v in by.items() if k == cc and (nn.startswith(n + ' ') or n.startswith(nn + ' ')) and len(nn) > 3 for x in v]
            c = [x for x in pre if x[0] >= 20000]
        return max(c) if c else None
    items, unres = [], []
    KIND = {'NRC_POWER_ROSTER_20260219': ('nuclear', 'Nuclear power reactor', 'US Nuclear Regulatory Commission, operating power reactor list'),
            'AGTC_TRB2026_40': ('terminal', 'Combined-transport terminal (AGTC)', 'AGTC agreement terminal list, Tractatenblad 2026/40'),
            'UNESCO_GNLC_20261105': ('learning', 'UNESCO Learning City', 'UNESCO Global Network of Learning Cities')}
    nuc = {}
    for l in open(ENT, encoding='utf-8'):
        r = json.loads(l); sid = r['source_id']
        if sid in HELD or sid not in KIND: continue
        kind, label, by_ = KIND[sid]; cc = ISO.get(r['country_codes'][0], r['country_codes'][0]); f = r.get('facts') or {}
        pos = None; detail = ''
        if kind == 'nuclear':
            m = re.match(r'\s*(\d+(?:\.\d+)?)\s+miles?\s+([NESW]{1,3})\s+of\s+(.+),\s*([A-Z]{2})\s*$', f.get('location_description') or '')
            t = town('US', m.group(3), ST.get(m.group(4))) if m else None
            if m and t:
                d = float(m.group(1)) * 1.609; b = math.radians(DIRS.get(m.group(2), 0))
                pos = (t[1] + d * math.cos(b) / 111.0, t[2] + d * math.sin(b) / (111.0 * math.cos(math.radians(t[1]))))
            detail = (f.get('reactor_type') or '') + (', ' + f['location_description'] if f.get('location_description') else '')
            # one entry per site (units at the same place are merged)
            site = re.sub(r'\s+\d+$', '', r['name'])
            if pos:
                k = (site, round(pos[0], 2), round(pos[1], 2))
                if k in nuc: nuc[k]['detail'] = nuc[k]['detail'].replace(' unit', ' units') if ' unit' in nuc[k]['detail'] else nuc[k]['detail']; nuc[k]['n'] += 1; continue
        else:
            t = town(cc, r['name'])
            if t: pos = (t[1], t[2])
            detail = 'member since ' + str(f['membership_year']) if kind == 'learning' and f.get('membership_year') else ('in force ' + str(f.get('effective_on')) if kind == 'terminal' and f.get('effective_on') else '')
        if not pos: unres.append({'source': sid, 'name': r['name'], 'cc': cc, 'location': (r.get('geography') or {}).get('location_text')}); continue
        it = {'name': r['name'] if kind != 'nuclear' else site, 'cc': cc, 'lat': round(pos[0], 4), 'lon': round(pos[1], 4), 'kind': kind, 'label': label, 'detail': detail, 'by': by_, 'source': r.get('source_url'), 'period': r.get('reference_period')}
        if kind == 'nuclear': it['n'] = 1; nuc[(site, round(pos[0], 2), round(pos[1], 2))] = it
        items.append(it)
    for it in items:
        if it['kind'] == 'nuclear':
            n = it.pop('n', 1); it['detail'] = (str(n) + ' reactor units, ' if n > 1 else '1 reactor unit, ') + it['detail']
    for fn, kind, label, by_ in (('chem_parks.json', 'chemical', 'Chemical park or refinery complex', 'Nestlyzer compilation of major chemical parks'), ('major_seaports.json', 'seaport', 'Major seaport', 'Nestlyzer compilation of major seaports')):
        d = json.load(open(J('build/source', fn), encoding='utf-8'))
        for x in d['rows']:
            items.append({'name': x[0], 'cc': x[1], 'lat': x[2], 'lon': x[3], 'kind': kind, 'label': label, 'detail': '', 'by': by_, 'source': None, 'period': None})
    # 2.15.5: special economic zones and freeports (08a, owner-approved). The source names the zone, not its boundary, so each is
    # marked at the port or town it is named after (well-known coordinates), labelled as such, never as the zone outline.
    ZP = {'East Midlands Freeport': (52.83, -1.33, 'East Midlands Airport'), 'Felixstowe and Harwich Freeport': (51.96, 1.35, 'Felixstowe'), 'Humber Freeport': (53.74, -0.33, 'Hull'),
          'Liverpool City Region Freeport': (53.41, -2.99, 'Liverpool'), 'Plymouth and South Devon Freeport': (50.37, -4.14, 'Plymouth'), 'Solent Freeport': (50.90, -1.40, 'Southampton'),
          'Teesside Freeport': (54.60, -1.16, 'Teesport'), 'Thames Freeport': (51.46, 0.36, 'Tilbury'), 'Inverness and Cromarty Firth Freeport': (57.69, -4.17, 'Invergordon'),
          'Firth of Forth Freeport': (56.01, -3.72, 'Grangemouth'), 'Anglesey Freeport': (53.31, -4.63, 'Holyhead'), 'Port Talbot and Milford Haven Freeport': (51.59, -3.78, 'Port Talbot'),
          'Foreign-Trade Zone 001 - New York': (40.70, -74.01, 'New York'), 'Foreign-Trade Zone 008 - Toledo': (41.65, -83.54, 'Toledo'),
          'Ceuta qualifying corporate income rebate': (35.89, -5.32, 'Ceuta'), 'Melilla qualifying corporate income rebate': (35.29, -2.94, 'Melilla'), 'Zona Especial Canaria': (28.12, -15.43, 'Las Palmas')}
    import csv as _csv
    zf = J('build/source/deliveries/s8-20261107/08a_special_economic_zones.csv'); seen = set()
    if os.path.exists(zf):
        for r in _csv.DictReader(open(zf, encoding='utf-8')):
            nm = r['regime_name']; k = next((z for z in ZP if nm.startswith(z[:30])), None)
            if not k or k in seen or r.get('commercial_reuse_status') != 'permitted' or (r.get('hold_reason') or '').strip(): continue
            seen.add(k); la, lo, at = ZP[k]
            items.append({'name': nm, 'cc': r['nestlyzer_country_code'] or r['country_code'], 'lat': la, 'lon': lo, 'kind': 'zone', 'label': 'Special economic zone or freeport (marked at ' + at + ', not its outline)', 'detail': (r.get('benefit_summary') or '')[:140], 'by': r.get('source_name') or 'official source', 'source': r.get('source_url') or None, 'period': r.get('reference_period') or None})
    cnt = collections.Counter(i['kind'] for i in items)
    json.dump({'version': 1, 'note': 'Points of reference only, not a hazard or safety assessment. Locations are rounded.', 'counts': cnt, 'items': items}, open(J('data/facilities.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    os.makedirs(J('docs/audit'), exist_ok=True)
    json.dump({'held_sources': sorted(HELD), 'unresolved': unres}, open(J('docs/audit/facilities_unresolved.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('facilities', dict(cnt), 'unresolved', len(unres))

if __name__ == '__main__':
    main()
