#!/usr/bin/env python3
"""Local economy by GICS sector and industry (2.12, owner request 31 Oct: "know the industry mix for every municipality:
is it a financial centre, an industrial area and which GICS mix, agriculture or mining").

GICS classifies companies, not workplaces; official statistics count workplaces by NAICS (US) or NACE (Europe). This
script maps each 4-digit NAICS industry to the GICS sector and GICS industry it corresponds to (table below, reviewed
31 Oct 2026), adds up employees per sector and industry, and compares each with the national share (location quotient).
It then names the economy's character from rules that are stated in the output (financial centre, industrial, mining
and energy, agriculture and forestry, technology, health, tourism, logistics, or mixed).

Input  US: County Business Patterns 2023, all industries (US Census Bureau, public domain): cbp23co.txt or .zip
       (path in argv[1]; default build/source/industry/cbp23co.zip). Farms (NAICS 111-112) and the public sector are
       not in CBP: agriculture shows forestry, fishing and farm services only, and the page says so.
Output data/x/US.json: 'econ' column (string index) per place, through build/source/industry/US_place_area.csv
       (place -> county); each county record carries the national sector shares ('n') for comparison.
Europe and the rest: the same mapping table carries NACE codes; their workplace data is acquired separately (CBS
81575NED, BFS STATENT, Nomis NM_141_1) and joins here when it arrives.
    python3 build/build_economy.py [cbp23co.zip]"""
import csv, io, json, os, sys, zipfile, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEC = {'EN': 'Energy', 'MA': 'Materials', 'IN': 'Industrials', 'CD': 'Consumer Discretionary', 'CS': 'Consumer Staples', 'HC': 'Health Care',
       'FI': 'Financials', 'IT': 'Information Technology', 'CM': 'Communication Services', 'UT': 'Utilities', 'RE': 'Real Estate'}
# NAICS prefix -> (GICS sector, GICS industry). The longest matching prefix wins.
M = {
 '113': ('MA', 'Paper and forest products (forestry)'), '114': ('CS', 'Food products (fishing)'), '115': ('CS', 'Food products (farm services)'),
 '211': ('EN', 'Oil, gas and consumable fuels'), '212': ('MA', 'Metals and mining'), '2121': ('EN', 'Oil, gas and consumable fuels (coal)'), '213': ('EN', 'Energy equipment and services'),
 '221': ('UT', 'Electric, gas and water utilities'), '2211': ('UT', 'Electric utilities and power producers'), '2212': ('UT', 'Gas utilities'), '2213': ('UT', 'Water utilities'),
 '236': ('IN', 'Construction and engineering'), '237': ('IN', 'Construction and engineering'), '238': ('IN', 'Construction and engineering (trades)'),
 '311': ('CS', 'Food products'), '312': ('CS', 'Beverages and tobacco'), '313': ('CD', 'Textiles and apparel'), '314': ('CD', 'Textiles and apparel'), '315': ('CD', 'Textiles and apparel'), '316': ('CD', 'Textiles, apparel and luxury goods'),
 '321': ('MA', 'Paper and forest products (wood)'), '322': ('MA', 'Containers, packaging and paper'), '323': ('IN', 'Commercial services and supplies (printing)'),
 '324': ('EN', 'Oil, gas and consumable fuels (refining)'), '325': ('MA', 'Chemicals'), '3254': ('HC', 'Pharmaceuticals and biotechnology'), '3256': ('CS', 'Household and personal products'),
 '326': ('MA', 'Chemicals (plastics and rubber)'), '327': ('MA', 'Construction materials'), '331': ('MA', 'Metals and mining (primary metals)'), '332': ('IN', 'Machinery (fabricated metal)'),
 '333': ('IN', 'Machinery'), '334': ('IT', 'Electronic equipment and instruments'), '3341': ('IT', 'Technology hardware'), '3342': ('IT', 'Communications equipment'), '3344': ('IT', 'Semiconductors'),
 '3345': ('IT', 'Electronic equipment and instruments'), '335': ('IN', 'Electrical equipment'), '336': ('CD', 'Automobiles and components'), '3364': ('IN', 'Aerospace and defence'),
 '3365': ('IN', 'Machinery (rail equipment)'), '3366': ('IN', 'Machinery (shipbuilding)'), '337': ('CD', 'Household durables (furniture)'), '339': ('CD', 'Leisure and other products'), '3391': ('HC', 'Health care equipment and supplies'),
 '423': ('IN', 'Trading companies and distributors'), '424': ('CS', 'Consumer staples distribution'), '4247': ('EN', 'Oil, gas and consumable fuels (wholesale)'), '425': ('IN', 'Trading companies and distributors'),
 '44': ('CD', 'Consumer discretionary retail'), '445': ('CS', 'Consumer staples retail'), '446': ('CS', 'Consumer staples retail (pharmacies)'), '447': ('EN', 'Oil, gas and consumable fuels (fuel stations)'),
 '45': ('CD', 'Consumer discretionary retail'), '452': ('CS', 'Consumer staples retail (general stores)'), '454': ('CD', 'Broadline and online retail'),
 '481': ('IN', 'Passenger airlines'), '482': ('IN', 'Ground transportation (rail)'), '483': ('IN', 'Marine transportation'), '484': ('IN', 'Ground transportation (trucking)'), '485': ('IN', 'Ground transportation (passengers)'),
 '486': ('EN', 'Oil, gas and consumable fuels (pipelines)'), '487': ('CD', 'Hotels, restaurants and leisure (sightseeing)'), '488': ('IN', 'Transportation infrastructure'), '492': ('IN', 'Air freight and logistics (couriers)'), '493': ('IN', 'Air freight and logistics (warehousing)'),
 '511': ('CM', 'Media (publishing)'), '5112': ('IT', 'Software'), '512': ('CM', 'Entertainment'), '515': ('CM', 'Media (broadcasting)'), '517': ('CM', 'Telecommunication services'),
 '518': ('IT', 'IT services (data processing and hosting)'), '519': ('CM', 'Interactive media and services'),
 '521': ('FI', 'Banks (central bank)'), '522': ('FI', 'Banks and credit'), '5222': ('FI', 'Consumer finance and lending'), '5223': ('FI', 'Financial services (payments and credit services)'),
 '523': ('FI', 'Capital markets'), '524': ('FI', 'Insurance'), '525': ('FI', 'Financial services (funds and trusts)'),
 '531': ('RE', 'Real estate management and development'), '532': ('IN', 'Commercial services (rental and leasing)'), '533': ('CM', 'Media (licensing of intangibles)'),
 '541': ('IN', 'Professional services'), '5415': ('IT', 'IT services'), '5417': ('HC', 'Life sciences tools and services (research and development)'), '5418': ('CM', 'Media (advertising)'),
 '551': ('IN', 'Industrial conglomerates and head offices'), '561': ('IN', 'Commercial services and supplies'), '5615': ('CD', 'Hotels, restaurants and leisure (travel agencies)'), '562': ('IN', 'Commercial services (waste management)'),
 '611': ('CD', 'Diversified consumer services (education)'), '621': ('HC', 'Health care providers (ambulatory)'), '622': ('HC', 'Health care providers (hospitals)'), '623': ('HC', 'Health care providers (residential care)'),
 '624': ('HC', 'Health care providers (social assistance)'), '711': ('CM', 'Entertainment (performing arts and sports)'), '712': ('CD', 'Hotels, restaurants and leisure (museums and parks)'),
 '713': ('CD', 'Hotels, restaurants and leisure (amusement and recreation)'), '721': ('CD', 'Hotels, restaurants and leisure (hotels)'), '722': ('CD', 'Hotels, restaurants and leisure (restaurants)'),
 '811': ('CD', 'Diversified consumer services (repair)'), '812': ('CD', 'Diversified consumer services (personal)'), '813': ('CD', 'Diversified consumer services (associations)')}


STRCOLS = ('kg', 'lake', 'river', 'port', 'iport', 'mport', 'chem', 'fin', 'border', 'metro', 'land', 'sea', 'tz', 'shore')   # string columns of data/x (src/js/00-core.js)


def gics(code):
    for k in (code[:4], code[:3], code[:2]):
        if k in M: return M[k]
    return None


def read_cbp(path):
    if path.endswith('.zip'):
        z = zipfile.ZipFile(path); f = io.TextIOWrapper(z.open([n for n in z.namelist() if n.endswith('.txt')][0]), encoding='latin-1')
    else: f = open(path, encoding='latin-1')
    BAND = {'n<5': 2, 'n5_9': 7, 'n10_19': 14, 'n20_49': 32, 'n50_99': 72, 'n100_249': 160, 'n250_499': 350, 'n500_999': 700, 'n1000': 1500}
    out = collections.defaultdict(lambda: collections.Counter())
    for r in csv.DictReader(f):
        nc = r['naics'].strip()
        if len(nc.rstrip('/')) != 4 or not nc.endswith('//'): continue   # 4-digit industries: a complete, non-overlapping partition
        code = nc.rstrip('/'); g = gics(code)
        if not g: continue
        emp = int(r['emp'] or 0)
        if emp == 0:   # suppressed: estimate from the establishment size bands
            emp = sum(BAND[k] * int(r[k]) for k in BAND if r.get(k, '').isdigit())
        out[r['fipstate'] + r['fipscty']][code] += emp
    return out


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'build', 'source', 'industry', 'cbp23co.zip')
    if not os.path.exists(src): raise SystemExit('missing ' + src + ' (County Business Patterns 2023, all counties)')
    cty = read_cbp(src)
    nat_s, nat_i = collections.Counter(), collections.Counter()
    for c in cty.values():
        for code, e in c.items(): s, ind = gics(code); nat_s[s] += e; nat_i[ind] += e
    NT = sum(nat_s.values())
    nshare = {k: v / NT for k, v in nat_s.items()}; ishare = {k: v / NT for k, v in nat_i.items()}
    def character(sh, lq, ilq, ish, tot):
        # rules, in order; each needs a real share and a clear specialisation against the national mix
        fin = sh.get('FI', 0); it = sh.get('IT', 0); hc = sh.get('HC', 0)
        mining = ish.get('Metals and mining', 0) + sum(v for k, v in ish.items() if k.startswith('Oil, gas and consumable fuels') and '(fuel stations)' not in k and '(wholesale)' not in k) + ish.get('Energy equipment and services', 0)
        agri = sum(v for k, v in ish.items() if '(forestry)' in k or '(fishing)' in k or '(farm services)' in k)
        manu = sum(v for k, v in ish.items() if any(w in k for w in ('Machinery', 'Chemicals', 'Electrical', 'Automobiles', 'Aerospace', 'Semiconductors', 'Electronic', 'Metals and mining (primary', 'Construction materials', 'Food products', 'Beverages', 'Pharmaceuticals', 'Containers', 'Paper and forest products (wood)', 'Textiles', 'Household durables', 'Health care equipment', 'Technology hardware', 'Communications equipment')))
        tour = sum(v for k, v in ish.items() if k.startswith('Hotels, restaurants and leisure'))
        logi = sum(v for k, v in ish.items() if 'Air freight and logistics' in k or 'trucking' in k or 'Transportation infrastructure' in k or 'Marine' in k)
        if fin >= 0.09 and lq.get('FI', 0) >= 2 and tot >= 20000: return 'financial centre'   # a large job base, not one bank in a small county
        if mining >= 0.05: return 'mining and energy'
        if agri >= 0.05: return 'agriculture, forestry and fishing'
        if manu >= 0.18: return 'industrial'
        MAN = ('Machinery', 'Chemicals', 'Electrical', 'Automobiles', 'Aerospace', 'Semiconductors', 'Electronic', 'Pharmaceuticals', 'Food products', 'Metals and mining (primary')
        if any(ish[k] >= 0.05 and ilq.get(k, 0) >= 4 and any(w in k for w in MAN) for k in ish): return 'industrial'   # one dominant industry (Detroit: automobiles, 13x the national share)
        if it >= 0.08 and lq.get('IT', 0) >= 1.8: return 'technology'
        if logi >= 0.12: return 'logistics'
        if tour >= 0.22: return 'tourism'
        if hc >= 0.3: return 'health care'
        return 'mixed services'
    SECK = list(SEC); INDK = sorted({v[1] for v in M.values()})
    CHK = ['financial centre', 'mining and energy', 'agriculture, forestry and fishing', 'industrial', 'technology', 'logistics', 'tourism', 'health care', 'mixed services']
    res, chars = {}, collections.Counter()
    for k, c in cty.items():
        tot = sum(c.values())
        if tot < 50: continue
        s, ind = collections.Counter(), collections.Counter()
        for code, e in c.items(): g = gics(code); s[g[0]] += e; ind[g[1]] += e
        sh = {a: v / tot for a, v in s.items()}; lq = {a: sh[a] / nshare[a] for a in sh if nshare.get(a)}
        ish = {a: v / tot for a, v in ind.items()}; ilq = {a: ish[a] / ishare[a] for a in ish if ishare.get(a)}
        ch = character(sh, lq, ilq, ish, tot); chars[ch] += 1
        top = sorted(((a, ish[a], ilq[a]) for a in ish if ish[a] >= 0.01 and ilq.get(a, 0) >= 1.3), key=lambda t: -t[1] * min(t[2], 6))[:5]
        # compact (the US shard must stay under GitHub's 20 MiB): c = character code, s = sector shares in SECK order,
        # i = [industry code, share %, location quotient]; names and national shares live in the app (econ table)
        res[k] = {'t': tot, 'c': CHK.index(ch), 's': [round(100 * sh.get(a, 0)) for a in SECK], 'i': [[INDK.index(a), round(100 * v, 1), round(q, 1)] for a, v, q in top]}
    # attach to US places
    pa = {r['oid']: r['code'] for r in csv.DictReader(open(os.path.join(ROOT, 'build', 'source', 'industry', 'US_place_area.csv'))) if r['level'] == 'county'}
    d = json.load(open(os.path.join(ROOT, 'data', 'c', 'US.json'))); xp = os.path.join(ROOT, 'data', 'x', 'US.json'); x = json.load(open(xp))
    # rebuild the string table without earlier economy strings (each run would otherwise append another copy)
    x['cols'].pop('econ', None)
    keep = sorted({v for k, c in x['cols'].items() for v in c if isinstance(v, int) and k in STRCOLS})
    remap = {o: n for n, o in enumerate(keep)}
    for k in STRCOLS:
        if k in x['cols']: x['cols'][k] = [remap[v] if v is not None else None for v in x['cols'][k]]
    x['strs'] = [x['strs'][o] for o in keep]
    strs, idx, col, hit = x['strs'], {}, [], 0
    for r in d['rows']:
        oid = str(r[0]).split(':')[-1]; e = res.get(pa.get(oid, ''))
        if not e: col.append(None); continue
        js = json.dumps(e, separators=(',', ':'), ensure_ascii=False)
        if js not in idx: strs.append(js); idx[js] = len(strs) - 1
        col.append(idx[js]); hit += 1
    x['cols']['econ'] = col; json.dump(x, open(xp, 'w'), separators=(',', ':'), ensure_ascii=False)
    # the lookup tables for the app (src/more/econ_tables.js, bundled into the lazy module)
    open(os.path.join(ROOT, 'src', 'more', 'econ_tables.js'), 'w').write('/* generated by build/build_economy.py */\nvar ECON_T = ' + json.dumps({'sec': SECK, 'ind': INDK, 'ch': CHK, 'nat': {'US': [round(100 * nshare.get(a, 0), 1) for a in SECK]}}, ensure_ascii=False) + ';\n')
    print('economy: counties', len(res), 'places', hit, 'of', len(d['rows']), dict(chars.most_common()))


if __name__ == '__main__':
    main()
