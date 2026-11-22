#!/usr/bin/env python3
"""2.15.30-r14: Book of Records page, home-page band, collected regional arms, engine protection. Static checks on _site."""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = os.path.join(ROOT, '_site'); c = {}
h = open(os.path.join(S, 'insights/records/index.html'), encoding='utf-8').read()
c['records page has all six chapters'] = all(('id=%s' % k) in h or ('id="%s"' % k) in h for k in ['size', 'height', 'growth', 'metros', 'countries', 'clusters'])
c['records page has 10+ charts and a story box per chapter'] = h.count('ins-fig') >= 10 and h.count('ins-take') >= 5
c['records page stays light (under 400 KB)'] = len(h.encode()) < 400_000
c['records page indexable, in the sitemap'] = 'noindex' not in h and '/insights/records/' in open(os.path.join(S, 'sitemap.xml')).read() + ''.join(open(os.path.join(S, f)).read() for f in os.listdir(S) if f.startswith('sitemap-'))
home = open(os.path.join(S, 'index.html'), encoding='utf-8').read(); ins = open(os.path.join(S, 'insights/index.html'), encoding='utf-8').read()
c['home page and Insights hub lead to the records'] = 'rec-band' in home and '/insights/records/' in home and 'ins-rec' in ins
reg = json.load(open(os.path.join(S, 'data/arms/regions.json')))
c['cantons, Länder and Austrian states have collected arms with their image folder'] = all(re.fullmatch(r'[0-9a-f]{2}', (reg.get(k) or ['', '', ''])[2] or '') for k in ['CH-ZH', 'CH-BE', 'CH-TI', 'DE-BY', 'DE-BE', 'AT-9'])
idx = json.load(open(os.path.join(S, 'data/arms/index.json')))
c['Poland and Brazil now have collected arms'] = idx.get('PL', 0) >= 1900 and idx.get('BR', 0) >= 1400
app = open(os.path.join(S, 'assets/app.js'), encoding='utf-8').read()
c['app maps cantons to ISO codes and falls back to the US state seal'] = 'CH040' in app and 'P158' in app
c['no published script carries source comments'] = not any(re.search(r'/\*[^*]{40,}', open(os.path.join(S, 'assets', f), encoding='utf-8').read()) for f in os.listdir(os.path.join(S, 'assets')) if f.endswith('.js'))
legal = open(os.path.join(S, 'legal/index.html'), encoding='utf-8').read()
c['legal page states the coat-of-arms licence rule'] = 'official insignia' in legal
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('R14 RECORDS TEST:', 'PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
