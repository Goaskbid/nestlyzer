#!/usr/bin/env python3
"""2.15.30-r13: coats of arms collected once from Wikidata (P94) by Nestlyzer's own collector, matched to Nestlyzer places by
each country's official code (no names), written as one small file per country: /data/arms/<CC>.json.

Input  build/source/arms/arms_municipalities.csv.gz (collector N1 export; columns country, code_type, code, name, wikidata,
       arms_file, arms_kind, licence, artist, attribution_required, restrictions, commons_page)
Output data/arms/<CC>.json  {"v":1,"p":[prefix,...],"m":{"<oid>":"<code>"}}   code = "<prefix index base36>~<rest>" or "~<rest>";
       a name without an extension ends in .svg (the commonest case), others keep their extension.
       data/arms/index.json  {"<CC>": places with arms}
Rules: only openly licensed files (CC0, CC BY, CC BY-SA, public domain; never NC/ND), one file per place (SVG first, then the
shortest name), codes normalised per country exactly as the collector documents (CZ/SK/LU/HU/PT strip the EU country prefix,
NL adds GM; PL and BR through the exact bridges in bridges()).
The browser still asks Wikimedia Commons for the licence, author and thumbnail before showing an image, and only after the
visitor allows external content.         python3 build/build_arms_index.py"""
import collections, csv, gzip, hashlib, io, json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', 'source', 'arms', 'arms_municipalities.csv.gz')
OUT = os.path.join(ROOT, 'data', 'arms')
LIC = re.compile(r'^(CC0|CC[ -]BY(?:[ -]SA)?[ -][1-4]\.[05]\b.*|Public domain|PD\b.*)$', re.I)
NOTFREE = re.compile(r'noncommercial|no ?derivatives|\bNC\b|\bND\b', re.I)
NORM = {'CZ': lambda c: c[2:] if c.startswith('CZ') else None, 'SK': lambda c: c[-6:] if c.startswith('SK') else None,
        'LU': lambda c: c[2:] if c.startswith('LU') else None, 'HU': lambda c: c[2:] if c.startswith('HU') else None,
        'PT': lambda c: c[2:] if c.startswith('PT') else None, 'NL': lambda c: 'GM' + c if re.fullmatch(r'\d{4}', c) else None}
SKIP = set()
B36 = '0123456789abcdefghijklmnopqrstuvwxyz'


def b36(n):
    s = ''
    while True:
        s = B36[n % 36] + s; n //= 36
        if not n: return s


def encode_names(names):
    """Greedy prefix table: word-boundary prefixes that save the most bytes, at most 1,296 (two base36 digits)."""
    cnt = collections.Counter()
    for f in set(names):
        for m in re.finditer(r'[ _(-]', f):
            if m.end() >= 4: cnt[f[:m.end()]] += 1
    gain = sorted(((len(p) - 3) * (n - 1), p) for p, n in cnt.items() if n >= 3)
    table = [p for g, p in reversed(gain) if g > 20][:1296]
    table.sort(key=len, reverse=True)
    idx = {p: i for i, p in enumerate(table)}
    def enc(f):
        body = f[:-4] if f.endswith('.svg') and '.' not in f[-8:-4] and not f[:-4].endswith('.') else f + '\u0000'
        for p in table:
            if body.startswith(p): return b36(idx[p]) + '~' + body[len(p):]
        return '~' + body
    return table, enc


def h2(name):
    """First two hex digits of the MD5 of the Commons file name: the folder of the file on upload.wikimedia.org."""
    return hashlib.md5(name.replace(' ', '_').encode('utf-8')).hexdigest()[:2]


def decode(table, code):
    code = code[2:]   # v2: two hex digits of the upload folder come first
    i, rest = code.split('~', 1)
    name = (table[int(i, 36)] if i else '') + rest
    return name[:-1] if name.endswith('\u0000') else name + '.svg'


def bridges():
    """r14: exact bridges for the two countries whose Nestlyzer ids are not the collected code.
    PL: the Nestlyzer id (Eurostat LAU) holds the voivodeship at digits 5-6 and powiat + gmina as its last four digits; the TERYT
        TERC code is voivodeship (2) + powiat (2) + gmina (2) + type (1), so TERC 1218042 joins id 1001121231804 (Lanckorona). This
        key is unique for all 2,478 Polish places. A record is used when its name agrees or it is a town gmina (type 1), which
        keeps out the few village items that carry their gmina's code.
    BR: the Nestlyzer id is the GeoNames town; build/source/context/world_area_bindings.csv places each town inside its IBGE
        municipality (point in polygon). A town gets the arms only when it carries the municipality's own name, i.e. it is the
        municipal seat; the IBGE code's first two digits give the state, so name + state is unique."""
    import unicodedata
    fold = lambda s: re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()).strip()
    pl = {}
    if os.path.exists(os.path.join(ROOT, 'data', 'c', 'PL.json')):
        for x in json.load(open(os.path.join(ROOT, 'data', 'c', 'PL.json')))['rows']:
            o = str(x[0]); pl[o[4:6] + o[-4:]] = (o, fold(x[1]))
    br = {}
    B = os.path.join(ROOT, 'build', 'source', 'context', 'world_area_bindings.csv')
    UF = {'11': 'rondonia', '12': 'acre', '13': 'amazonas', '14': 'roraima', '15': 'para', '16': 'amapa', '17': 'tocantins', '21': 'maranhao', '22': 'piaui',
          '23': 'ceara', '24': 'rio grande do norte', '25': 'paraiba', '26': 'pernambuco', '27': 'alagoas', '28': 'sergipe', '29': 'bahia', '31': 'minas gerais',
          '32': 'espirito santo', '33': 'rio de janeiro', '35': 'sao paulo', '41': 'parana', '42': 'santa catarina', '43': 'rio grande do sul',
          '50': 'mato grosso do sul', '51': 'mato grosso', '52': 'goias', '53': 'distrito federal'}
    if os.path.exists(B):
        for r in csv.DictReader(open(B, encoding='utf-8')):
            if r['country'] != 'BR' or fold(r['place_name']) != fold(r['area_name']): continue
            br.setdefault((fold(r['area_name']), fold(r['parent_or_code']).replace('jeneiro', 'janeiro')), []).append(r['place_oid'])
    def pl_codes(c, name):
        if not re.fullmatch(r'\d{7}', c) or c[:6] not in pl: return []
        o, n = pl[c[:6]]; m = fold(re.sub(r'^gmina ', '', name, flags=re.I))
        return [o] if c[6] == '1' or (m and (m in n or n in m)) else []
    def br_codes(c, name):
        if not re.fullmatch(r'\d{7}', c) or c[:2] not in UF: return []
        hit = br.get((fold(name), UF[c[:2]]), [])
        return hit if len(hit) == 1 else []
    return pl_codes, br_codes


def main():
    if not os.path.exists(SRC): print('arms index: no collected file; nothing written'); return
    rows = list(csv.DictReader(io.TextIOWrapper(gzip.open(SRC), encoding='utf-8')))
    rank = lambda r: (0 if r['arms_file'].lower().endswith('.svg') else 1, len(r['arms_file']), r['arms_file'])
    oids, pick, skipped = {}, collections.defaultdict(dict), collections.Counter()
    pl_codes, br_codes = bridges()
    for r in rows:
        cc = r['country']
        if cc in SKIP or not os.path.exists(os.path.join(ROOT, 'data', 'c', cc + '.json')): skipped['no exact join'] += 1; continue
        if cc not in oids: oids[cc] = {str(x[0]) for x in json.load(open(os.path.join(ROOT, 'data', 'c', cc + '.json')))['rows']}
        codes = pl_codes(r['code'], r['name']) if cc == 'PL' else br_codes(r['code'], r['name']) if cc == 'BR' else [NORM[cc](r['code']) if cc in NORM else r['code']]
        codes = [c for c in codes if c and c in oids[cc]]
        if not codes: skipped['code not a Nestlyzer place'] += 1; continue
        if not LIC.match(r.get('licence') or '') or NOTFREE.search(r.get('licence') or ''): skipped['licence not open'] += 1; continue
        for code in codes:
            cur = pick[cc].get(code)
            if cur is None or rank(r) < rank(cur): pick[cc][code] = r
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.json'): os.remove(os.path.join(OUT, f))
    index, total_bytes = {}, 0
    for cc in sorted(pick):
        names = {oid: r['arms_file'] for oid, r in pick[cc].items()}
        table, enc = encode_names(list(names.values()))
        doc = {'v': 2, 'p': table, 'm': {oid: h2(f) + enc(f) for oid, f in sorted(names.items())}}
        for oid, code in doc['m'].items():
            assert decode(table, code) == names[oid], (cc, oid, names[oid], code)
        t = json.dumps(doc, ensure_ascii=False, separators=(',', ':'))
        open(os.path.join(OUT, cc + '.json'), 'w', encoding='utf-8').write(t)
        index[cc] = len(names); total_bytes += len(t.encode())
    t = json.dumps(index, separators=(',', ':')); open(os.path.join(OUT, 'index.json'), 'w').write(t); total_bytes += len(t)
    # r14 SEO: the Wikidata item of each matched place (build-only; place pages name it in their Place markup as sameAs)
    qs = {cc + ':' + oid: r['wikidata'] for cc in pick for oid, r in pick[cc].items() if re.fullmatch(r'Q\d+', r.get('wikidata') or '')}
    with gzip.open(os.path.join(ROOT, 'build', 'source', 'arms', 'place_wikidata.json.gz'), 'wt', encoding='utf-8') as g: json.dump(qs, g, separators=(',', ':'))
    # r14: state and province arms, keyed by their exact ISO 3166-2 code (Wikidata P300), openly licensed only
    RG = os.path.join(ROOT, 'build', 'source', 'arms', 'arms_regions.csv.gz')
    if os.path.exists(RG):
        reg = {}
        for r in csv.DictReader(io.TextIOWrapper(gzip.open(RG), encoding='utf-8')):
            c, f = r['code'], r['arms_file']
            if not re.fullmatch(r'[A-Z]{2}-[A-Z0-9]{1,3}', c) or not f or not LIC.match(r.get('licence') or '') or NOTFREE.search(r.get('licence') or ''): continue
            if c not in reg or rank(r) < rank(reg[c][2]): reg[c] = (f, r['name'], r)
        t = json.dumps({c: [v[0], v[1], h2(v[0])] for c, v in sorted(reg.items())}, ensure_ascii=False, separators=(',', ':'))
        open(os.path.join(OUT, 'regions.json'), 'w', encoding='utf-8').write(t); total_bytes += len(t.encode())
        print('arms index: %d states and provinces by ISO 3166-2 code' % len(reg))
    print('arms index: %d places in %d countries, %.2f MB; skipped %s' % (sum(index.values()), len(index), total_bytes / 1e6, dict(skipped)))


if __name__ == '__main__':
    main()
