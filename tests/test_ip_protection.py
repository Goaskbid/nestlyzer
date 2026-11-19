#!/usr/bin/env python3
"""2.15.30-r8 owner rule: transparent on results, protective of the model. Checks the public output for rights notices,
the text-and-data-mining reservation, and that internal files and exact model weights are not published.
    python3 tests/test_ip_protection.py"""
import json, os, re, glob, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SITE = os.path.join(ROOT, '_site')
rd = lambda *p: open(os.path.join(*p), encoding='utf-8').read(); c = {}
c['public site carries no internal audit worksheets or collection files'] = not os.path.exists(os.path.join(SITE, 'data/audit')) and not os.path.exists(os.path.join(SITE, 'data/downloads'))
fp = json.load(open(os.path.join(SITE, 'data/fingerprints.json')))['files']
c['fingerprint list names no internal file'] = not any(re.match(r'data/(audit|downloads)/', k) for k in fp)
rb = rd(SITE, 'robots.txt'); star = re.search(r'(?ims)^User-agent:\s*\*\s*$(.*?)(?=^User-agent:|\Z)', rb).group(1)
c['robots.txt: search engines allowed, AI-training crawlers refused, sitemap named'] = 'Allow: /' in star and not re.search(r'^Disallow:\s*/\s*$', star, re.M) and re.search(r'User-agent: GPTBot[\s\S]*?Disallow: /', rb) is not None and 'User-agent: Googlebot' not in rb and 'Sitemap: https://nestlyzer.com/sitemap.xml' in rb
c['machine-readable TDM reservation file'] = json.load(open(os.path.join(SITE, '.well-known/tdmrep.json')))[0]['tdm-reservation'] == 1
lg = rd(SITE, 'legal/index.html')
c['terms: rights, permitted citation, bulk/AI/reverse-engineering need permission, TDM reservation, enforcement'] = all(k in lg for k in ['© 2026 Torsten Sauter', 'Art. 5 lit. c UWG', 'Art. 4 of the Swiss Copyright Act', 'Text and data mining', 'Art. 4(3) of EU Directive 2019/790', 'reverse engineering', 'train machine-learning or AI models', 'Source: Nestlyzer (nestlyzer.com)']) and 'fixed, published weights' not in lg
c['every app page footer carries the copyright line'] = '© 2026 Torsten Sauter, all rights reserved' in rd(SITE, 'index.html') and '© 2026 Torsten Sauter, all rights reserved' in rd(SITE, 'press/index.html')
mt = rd(SITE, 'method/index.html')
c['method page: main focus only, exact weights and thresholds not published'] = 'proprietary model' in mt and 'Minimums (Switzerland)' not in mt and '/data/audit/' not in mt and '/data/downloads/' not in mt
bp = [f for f in glob.glob(os.path.join(SITE, 'best/*/index.html'))][:8]
c['profile pages show emphasis (strong, medium, light), not numbers (%d checked)' % len(bp)] = bool(bp) and all(not re.search(r'<span class="chip">[^<]*<b>\d', rd(f)) for f in bp)
rk = rd(SITE, 'rankings/households/fr/young-family/index.html')
c['ranking pages: no numeric weights, credit and licence in Dataset markup'] = 'Leading category weights' not in rk and 'Weighs most:' in rk and '"creditText":"Source: Nestlyzer (nestlyzer.com)"' in rk and 'no bulk reuse or AI training' in rk
pr = rd(SITE, 'press/index.html'); c['press page: no "every weight shown" claim, bulk/AI reuse needs permission'] = 'every weight shown' not in pr and 'need our written permission' in pr
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('IP PROTECTION TEST:', 'PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
