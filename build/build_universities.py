#!/usr/bin/env python3
"""Universities and universities of applied sciences (2.11.2), rebuilt from the full ROR registry (v2.15, CC0).
The old list took every ROR 'education' record, so secondary schools (Kantonsschulen, lycees, US school districts,
high schools) counted as universities on the map and in the 'Universities in town' and 'University-town character'
scores. Rules now:
  - ROR type education, active, in one of the 45 Nestlyzer countries
  - top-level organisations only: a faculty or institute with a parent organisation is part of its university
  - a name (in any language ROR lists) or a web domain that marks higher education; secondary schools, school
    districts, hospitals, libraries, museums, societies and associations are left out
  - the French 'college' and Quebec 'cegep' are secondary or pre-university; UK further-education colleges are left
    out unless they are Royal Colleges, Imperial or King's College
Output: 'universities' in build/source/ror_anchors.json as [name, cc, lat, lon, size] (size = sub-units in ROR).
    python3 build/build_universities.py <ror-data.json>"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CC = {c['cc'] for c in json.load(open(os.path.join(ROOT, 'data', 'meta.json')))['countries']}
ISO = {'GB': 'UK', 'GR': 'EL'}
HE = re.compile(r'(universit|hochschule|\bETH\b|\bEPF\b|EPFL|\bHES\b|\bHES-SO\b|\bSUPSI\b|\bZHAW\b|\bFHNW\b|\bHSLU\b|\bBFH\b|polytechn|politecnic|polit[eé]cnic|institute of technology|technische (universit|hochschule)|\bcollege\b|école (normale|nationale|centrale|polytechnique|supérieure|des mines|des ponts|d.ingénieurs)|grande école|academy of (fine |performing |the )?arts?|academy of music|music academy|kunstakademie|akademie der (bildenden )?künste|musikakademie|conservat|accademia di belle arti|academia nacional|akademia|uczelnia|szko[lł]a g[lł]ówna|wy[zż]sza szko[lł]a|hogeschool|högskola|høgskole|høyskole|h[aá]sk[oó]li|korkeakoulu|yliopisto|universidad|universidade|universit[àa]|egyetem|főiskola|vysok[áa] [šs]kola|visoka [šs]kola|univerz|business school|school of (medicine|law|economics|management|business|engineering|nursing|art|design|music|mines|government|computer science|technology|architecture|theology)|seminary|theolog|instituto (superior|polit[eé]cnico|universit)|istituto universitario|scuola (superiore|normale)|medical (school|university|college)|graduate (school|university|institute)|politechnika|tekniska|\bHEC\b|INSEAD|\bIMD\b|sciences po|institutet|ESADE|\bIESE\b|daigaku|daehak|junior college|institute of (science|art|design|music|education)|teachers.? college|pädagogische hochschule|haute école|escola superior|escuela superior|sveučilište|univerzitet|universitet|technion|weizmann)', re.I)
SEC = re.compile(r'(kantonsschule|gymnas|lyc[eé]e|liceo|lyceum|high school|senior high|junior high|secondary|\bschule\b|realschule|gesamtschule|mittelschule|berufsschule|berufsfachschule|grammar school|sixth form|educaci[oó]n secundaria|\bIES\b|coll[eè]ge d.enseignement|\bcollège\b(?! de france)|c[eé]gep|scuola media|middle school|elementary|primary school|volksschule|school district|public schools|county schools|city schools|unified school|charter school|academy trust|school board|office of education|board of education|educational service|intermediate school|special school|kindergarten|vocational school(?! in)|further education|hospital|klinik|clinic|library|bibliothek|museum|society|association|verband|verein|foundation|stiftung|press\b|publishing|department of education|ministry)', re.I)
SUB = re.compile(r'(faculty|faculté|facultad|facoltà|fakult|department|departement|département|dipartimento|school of|école de|escuela de|institute (of|for)|institut (für|de|d.)|istituto di|center|centre|centro|zentrum|campus|clinic|klinik|division|unit\b|programme|program\b|laborator|graduate school|college of|research)', re.I)
UMB = re.compile(r'(conférence|conference|rectors|swissuniversities|formation continue|continuing education|weiterbildung|alumni|students.? union|consortium|network|council)', re.I)
NOTINST = re.compile(r"(american college of|college of (cardiology|physicians|surgeons|radiolog|psychiatr|general practitioners|obstetric|anaesth|ophthalm|paediatric|patholog|emergency|chest|rheumatolog|gastroenterolog|nutrition)|royal college of (physicians|surgeons|general|obstetric|psychiatr|radiolog|nursing|midwi|anaesth|ophthal|paediat|patholog|emergency|veterinary surgeons|podiatry|speech)|university academy|preparatory|prep school|landesinstitut|global health institute|research center|research centre|centro de investiga)", re.I)
UK_FE_OK = re.compile(r"(royal (northern )?college|imperial college|king.s college|university college|courtauld|heythrop|trinity laban|birkbeck|goldsmiths)", re.I)
D = json.load(open(sys.argv[1]))
out, drop = [], {'umbrella': 0, 'parent': 0, 'secondary': 0, 'not_he': 0, 'uk_fe': 0}
for o in D:
    if o.get('status') != 'active': continue
    if 'education' not in (o.get('types') or []) and not re.search(r'sciences po|institut d.etudes politiques', ' '.join(n['value'] for n in o.get('names', [])), re.I): continue
    loc = (o.get('locations') or [{}])[0].get('geonames_details') or {}
    cc = ISO.get(loc.get('country_code'), loc.get('country_code'))
    if cc not in CC or loc.get('lat') is None: continue
    names = [n['value'] for n in o.get('names', [])]
    disp = ([n['value'] for n in o.get('names', []) if 'ror_display' in n.get('types', [])] or names)[0]
    # a faculty, department, institute or centre under a university is part of it (counted once); an institution that is
    # only federated under an umbrella (ETH Zurich and EPFL under the ETH Domain, King's College under London) stays
    if any(r.get('type') == 'parent' for r in o.get('relationships', [])) and SUB.search(disp): drop['parent'] += 1; continue
    if UMB.search(disp): drop['umbrella'] += 1; continue
    alln = ' / '.join(names); dom = ' '.join(o.get('domains') or []) + ' ' + ' '.join(l.get('value', '') for l in o.get('links') or [])
    if SEC.search(disp): drop['secondary'] += 1; continue
    if NOTINST.search(disp): drop['not_he'] += 1; continue
    he = HE.search(disp) or (not re.search(r'cent(er|re|ro)\b|laborat|research|investiga|forschung|institut|instituto|agency|office|service', disp, re.I)) and (HE.search(alln) or re.search(r'\.edu(/|\s|$)|\.ac\.(jp|kr|il|nz|uk)\b|\.edu\.(au|tw|hk|sg)\b|uni-[a-z]+\.de|\.univ-|univ\.', dom))
    if not he: drop['not_he'] += 1; continue
    if cc == 'UK' and re.search(r'\bcollege\b', disp, re.I) and not re.search(r'universit', alln, re.I) and not UK_FE_OK.search(disp): drop['uk_fe'] += 1; continue
    size = sum(1 for r in o.get('relationships', []) if r.get('type') == 'child')
    out.append([disp, cc, round(loc['lat'], 4), round(loc['lng'], 4), size])
p = os.path.join(ROOT, 'build', 'source', 'ror_anchors.json'); A = json.load(open(p))
old = len(A.get('universities', []))
A['universities'] = sorted(out, key=lambda r: -r[4])
json.dump(A, open(p, 'w'), ensure_ascii=False)
print('universities:', len(out), '(was', old, '); left out:', drop)
for c in ('CH', 'DE', 'UK', 'FR', 'US'):
    print(' ', c, sum(1 for r in out if r[1] == c))
