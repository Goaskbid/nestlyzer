#!/usr/bin/env python3
"""Nestlyzer 2.13: Insights pages (charts, annotations, SEO), the start-page band, the business-climate panel on a
business place page, medals and the business-climate blend in the global ranking.
    python3 tests/test_v213.py [base-url]"""
import json, os, re, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
res = []
def check(fid, ok, msg): res.append({'id': fid, 'ok': bool(ok), 'check': msg}); print(('PASS ' if ok else 'FAIL ') + fid + '  ' + msg)
rd = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
MAIN = ['business-climate', 'labour-cost-vs-talent', 'tax-vs-rule-of-law', 'growth-momentum', 'red-tape', 'energy-prices', 'cost-of-capital', 'best-business-locations', 'best-places-to-live', 'ten-years-of-change']
bad = []
for k in [''] + MAIN:
    p = f'insights/{k}/index.html'.replace('//', '/')
    if not os.path.exists(os.path.join(ROOT, p)): bad.append(k + ' missing'); continue
    h = rd(p); t = re.findall(r'<title>(.*?)</title>', h)[0]
    if len(t) > 65: bad.append(k + ' title')
    if f'<link rel="canonical" href="https://nestlyzer.com/insights/{k + "/" if k else ""}">' not in h: bad.append(k + ' canonical')
    if k and k not in ('best-business-locations', 'best-places-to-live', 'business-climate') and h.count('<svg viewBox="0 0 760') < 1: bad.append(k + ' chart')
    if re.search(r'<svg viewBox="0 0 760[^>]*>(?:(?!</svg>).)*<span', h, re.S): bad.append(k + ' html inside chart')
    if 'BreadcrumbList' not in h: bad.append(k + ' breadcrumbs')
check('pages', not bad, f'hub and {len(MAIN)} analyses: title, canonical, chart, breadcrumbs ({bad or "all fine"})')
cdir = os.path.join(ROOT, 'insights/country'); nc = len(os.listdir(cdir)) if os.path.isdir(cdir) else 0
check('countries', nc >= 50, f'{nc} country business-climate pages')
h = rd('insights/labour-cost-vs-talent/index.html'); m = re.search(r'<div class="ins-take">(.*?)</div>', h, re.S)
check('annotation', m and 'sweet spot' in m.group(1).lower() and re.search(r'[A-Z][a-z]+', re.sub('<[^>]+>', '', m.group(1))), 'the scatter is explained with the countries it shows: ' + (re.sub('<[^>]+>', '', m.group(1))[:140] if m else '-'))
sm = rd('sitemap.xml'); si = rd('sitemap-insights.xml') if os.path.exists(os.path.join(ROOT, 'sitemap-insights.xml')) else ''
check('sitemap', 'sitemap-insights.xml' in sm and si.count('<loc>') >= 60, f'insights sitemap with {si.count("<loc>")} URLs')
S = os.path.join(ROOT, '_site')
if os.path.isdir(S):
    smi = open(os.path.join(S, 'sitemap.xml')).read(); kids = re.findall(r'<loc>https://nestlyzer.com/([^<]+)</loc>', smi)
    urls = [u for k in kids if os.path.exists(os.path.join(S, k)) for u in re.findall(r'<loc>https://nestlyzer.com/([^<]*)</loc>', open(os.path.join(S, k)).read())]
    miss = [k for k in kids if not os.path.exists(os.path.join(S, k))] + [u for u in urls if not os.path.exists(os.path.join(S, u, 'index.html'))]
    check('published', len(kids) >= 6 and not miss and any(u.startswith('insights/') for u in urls), f'published folder: {len(kids)} sitemap files, {len(urls)} addresses, {len(miss)} missing {miss[:3]}')
src = open(os.path.join(ROOT, 'src/js/45-story.js')).read() + open(os.path.join(ROOT, 'src/more/more.js')).read()
check('percentile-words', "better than ' + Math.round(sc)" not in src and 'truePct(' in src, '"better than X% of places" is computed from the places themselves, not from the 0-100 model score')
W = json.load(open(os.path.join(ROOT, 'data/rank/world.json')))
check('rank-blend', any(k.startswith('biz_') for k in W['profiles']), 'business profiles ranked worldwide with the climate blend')
with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(viewport={'width': 1400, 'height': 900})
    pg.goto(B + '/', wait_until='load'); pg.wait_for_timeout(800)
    band = pg.query_selector('#insights')
    check('start-band', band and band.is_visible() and pg.evaluate("document.querySelectorAll('#insights a[href^=\"/insights/\"]').length") >= 5, 'Compare business locations band on the start page with links')
    pg.goto(B + '/insights/labour-cost-vs-talent/', wait_until='load')
    n = pg.evaluate("document.querySelectorAll('.ins-pt').length")
    check('scatter', n >= 40, f'scatter draws {n} countries')
    pg.emulate_media(media='print'); hid = pg.evaluate("getComputedStyle(document.querySelector('.site-header')||document.querySelector('header')).display"); pg.emulate_media(media='screen')
    check('print', hid == 'none', 'print view hides the site chrome (Save as PDF)')
    pg.goto(B + '/#/explore?cc=SG&p=biz_hq', wait_until='load')
    pg.wait_for_function("window.NZ_CXENV && Object.keys(NZ_CXENV().BYID||{}).length>100", timeout=120000)
    oid = pg.evaluate("(()=>{const E=NZ_CXENV();const r=Object.values(E.BYID).find(x=>x.country==='SG');return r&&r.id})()")
    pg.goto(B + '/#/explore?cc=SG&p=biz_hq&sel=' + str(oid).replace(':', '%3A'), wait_until='load')
    try: pg.wait_for_function("(()=>{const e=document.querySelector('#place .bizclim');return e&&!/Loading/.test(e.innerText)})()", timeout=60000)
    except Exception: pass
    t = pg.inner_text('#place .bizclim') if pg.query_selector('#place .bizclim') else ''
    check('panel', 'Rule of law' in t or 'rule of law' in t.lower(), 'business-climate panel on a Singapore place (headquarters): ' + t[:160].replace('\n', ' '))
    md = pg.evaluate("[document.querySelectorAll('#place .bizclim .medal').length, document.querySelectorAll('#place .medal').length]")
    check('medals', md[0] >= 1, f'{md[0]} crowns or medals in the business-climate panel, {md[1]} on the whole place page')
    pg.goto(B + '/#/explore?cc=DE&p=young_family', wait_until='load')
    pg.wait_for_function("window.NZ_CXENV && Object.keys(NZ_CXENV().BYID||{}).length>100", timeout=120000)
    oid = pg.evaluate("(()=>{const r=Object.values(NZ_CXENV().BYID).find(x=>x.country==='DE'&&x.name==='Freiburg im Breisgau');return r&&r.id})()")
    pg.goto(B + '/#/explore?cc=DE&p=young_family&sel=' + str(oid).replace(':', '%3A'), wait_until='load')
    try: pg.wait_for_function("(()=>{const e=document.querySelector('#place .hist');return e&&e.querySelectorAll('tbody tr').length>5})()", timeout=60000)
    except Exception: pass
    hn = pg.evaluate("(()=>{const e=document.querySelector('#place .hist');return e?[e.querySelectorAll('tbody tr').length,e.querySelectorAll('.hspark').length,e.querySelectorAll('.trend.up-good,.trend.up-bad').length]:[0,0,0]})()")
    check('history', hn[0] >= 15 and hn[1] == hn[0] and hn[2] > 5, f'country history on a German place page: {hn[0]} series, {hn[1]} trend lines, {hn[2]} coloured changes')
    br.close()
json.dump(res, open(os.path.join(ROOT, 'tests/v213_results.json'), 'w'), indent=1)
print(f"{sum(r['ok'] for r in res)} of {len(res)} passed")
