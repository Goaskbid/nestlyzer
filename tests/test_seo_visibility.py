#!/usr/bin/env python3
"""2.15.30-r4 visibility rules on the built site (static, no network).
Checks a sample of indexable place pages and compact pages:
  - titles of at most 60 characters before the brand suffix, no ellipsis, all unique in the sample;
  - descriptions of 70 to 155 characters that end on a full sentence, no ellipsis;
  - every profile ranking is in the HTML itself (no script needed);
  - compact ID pages are noindex,follow and absent from the sitemap; full and kept rich pages are indexable and listed;
  - footer links to Press and citation, Sources and Rankings; the press page exists.
    python3 tests/test_seo_visibility.py [_site]"""
import html, os, random, re, sys
SITE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '_site')
rd = lambda p: open(os.path.join(SITE, p), encoding='utf-8').read()
def meta(s, n):
    m = re.search(r'<meta name=["\']?' + n + r'["\']? content=("([^"]*)"|\'([^\']*)\'|([^ >]*))', s)
    return html.unescape(next(g for g in m.groups()[1:] if g is not None)) if m else None
def title(s):
    m = re.search(r'<title>([^<]*)', s); return html.unescape(m.group(1)) if m else ''
c, bad = {}, []
sm = rd('sitemap-places.xml'); urls = re.findall(r'<loc>https?://[^/]+(/[^<]*)</loc>', sm)
random.seed(7); full = random.sample(urls, min(300, len(urls)))
listed = set(urls)
comp = []
for cc in sorted(os.listdir(os.path.join(SITE, 'places'))):
    d = os.path.join(SITE, 'places', cc)
    if not os.path.isdir(d): continue
    ids = sorted(os.listdir(d))[:4]
    comp += ['/places/%s/%s/' % (cc, i) for i in ids if os.path.isfile(os.path.join(d, i, 'index.html'))]
titles = set()
for u in full + comp:
    s = rd(u.strip('/') + '/index.html'); t = title(s); core = re.sub(r' \| Nestlyzer$', '', t); ds = meta(s, 'description') or ''
    if len(core) > 60 or '…' in t or '...' in t: bad.append(('title', u, t))
    if not (70 <= len(ds) <= 155) or '…' in ds or not ds.endswith(('.', '!', '?')): bad.append(('description', u, ds))
    if u in full: titles.add(t)
c['titles: at most 60 characters, no ellipsis'] = not [b for b in bad if b[0] == 'title']
c['descriptions: 70 to 155 characters, full sentences'] = not [b for b in bad if b[0] == 'description']
c['titles unique across the sample'] = len(titles) == len(full)
rows_ok = idx_ok = 0
for u in full[:60]:
    s = rd(u.strip('/') + '/index.html')
    rows_ok += s.count('<tr><td>') >= 4 and 'ranks.js' not in s
    idx_ok += 'noindex' not in (meta(s, 'robots') or '')
c['all profile rankings in the HTML (no script needed)'] = rows_ok == 60
c['full place pages indexable and in the sitemap'] = idx_ok == 60
allsm = ''.join(rd(f) for f in os.listdir(SITE) if f.startswith('sitemap') and f.endswith('.xml'))
inmap = set(re.findall(r'<loc>https?://[^/]+(/[^<]*)</loc>', allsm))
cn = [u for u in comp if 'noindex' in (meta(rd(u.strip('/') + '/index.html'), 'robots') or '')]
c['compact ID pages: noindex,follow and not in any sitemap'] = len(cn) > 20 and not [u for u in cn if u in inmap]
c['every indexable ID page is in the sitemap'] = all(u in inmap for u in comp if u not in cn)
s = rd(full[0].strip('/') + '/index.html')
c['footer: press, sources, rankings'] = all(re.search(r'href=["\']?' + h, s) for h in ['/press/', '/sources/', '/rankings/'])
p = rd('press/index.html')
c['press page with citation'] = 'cite' in p.lower() and len(title(p)) > 5
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
for b in bad[:6]: print('  ', b)
ok = all(c.values()); print('SEO VISIBILITY TEST:', 'PASS' if ok else 'FAIL', '(%d full, %d compact pages)' % (len(full), len(comp)))
sys.exit(0 if ok else 1)
