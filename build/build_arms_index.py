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
NL adds GM). Countries whose code cannot be joined exactly (PL, BR) are left to the live lookup.
The browser still asks Wikimedia Commons for the licence, author and thumbnail before showing an image, and only after the
visitor allows external content.         python3 build/build_arms_index.py"""
import collections, csv, gzip, io, json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', 'source', 'arms', 'arms_municipalities.csv.gz')
OUT = os.path.join(ROOT, 'data', 'arms')
LIC = re.compile(r'^(CC0|CC[ -]BY(?:[ -]SA)?[ -][1-4]\.[05]\b.*|Public domain|PD\b.*)$', re.I)
NOTFREE = re.compile(r'noncommercial|no ?derivatives|\bNC\b|\bND\b', re.I)
NORM = {'CZ': lambda c: c[2:] if c.startswith('CZ') else None, 'SK': lambda c: c[-6:] if c.startswith('SK') else None,
        'LU': lambda c: c[2:] if c.startswith('LU') else None, 'HU': lambda c: c[2:] if c.startswith('HU') else None,
        'PT': lambda c: c[2:] if c.startswith('PT') else None, 'NL': lambda c: 'GM' + c if re.fullmatch(r'\d{4}', c) else None}
SKIP = {'PL', 'BR'}
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


def decode(table, code):
    i, rest = code.split('~', 1)
    name = (table[int(i, 36)] if i else '') + rest
    return name[:-1] if name.endswith('\u0000') else name + '.svg'


def main():
    if not os.path.exists(SRC): print('arms index: no collected file; nothing written'); return
    rows = list(csv.DictReader(io.TextIOWrapper(gzip.open(SRC), encoding='utf-8')))
    rank = lambda r: (0 if r['arms_file'].lower().endswith('.svg') else 1, len(r['arms_file']), r['arms_file'])
    oids, pick, skipped = {}, collections.defaultdict(dict), collections.Counter()
    for r in rows:
        cc = r['country']
        if cc in SKIP or not os.path.exists(os.path.join(ROOT, 'data', 'c', cc + '.json')): skipped['no exact join'] += 1; continue
        if cc not in oids: oids[cc] = {str(x[0]) for x in json.load(open(os.path.join(ROOT, 'data', 'c', cc + '.json')))['rows']}
        code = NORM[cc](r['code']) if cc in NORM else r['code']
        if not code or code not in oids[cc]: skipped['code not a Nestlyzer place'] += 1; continue
        if not LIC.match(r.get('licence') or '') or NOTFREE.search(r.get('licence') or ''): skipped['licence not open'] += 1; continue
        cur = pick[cc].get(code)
        if cur is None or rank(r) < rank(cur): pick[cc][code] = r
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.json'): os.remove(os.path.join(OUT, f))
    index, total_bytes = {}, 0
    for cc in sorted(pick):
        names = {oid: r['arms_file'] for oid, r in pick[cc].items()}
        table, enc = encode_names(list(names.values()))
        doc = {'v': 1, 'p': table, 'm': {oid: enc(f) for oid, f in sorted(names.items())}}
        for oid, code in doc['m'].items():
            assert decode(table, code) == names[oid], (cc, oid, names[oid], code)
        t = json.dumps(doc, ensure_ascii=False, separators=(',', ':'))
        open(os.path.join(OUT, cc + '.json'), 'w', encoding='utf-8').write(t)
        index[cc] = len(names); total_bytes += len(t.encode())
    t = json.dumps(index, separators=(',', ':')); open(os.path.join(OUT, 'index.json'), 'w').write(t); total_bytes += len(t)
    print('arms index: %d places in %d countries, %.2f MB; skipped %s' % (sum(index.values()), len(index), total_bytes / 1e6, dict(skipped)))


if __name__ == '__main__':
    main()
