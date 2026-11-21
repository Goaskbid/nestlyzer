#!/usr/bin/env python3
"""2.15.30-r8: one ranking layout everywhere (topic picker, then scatterplot, then the list), place pages readable in dark mode.
    python3 tests/test_rankings_layout.py [base_url]"""
import csv, os, re, sys, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787'
c = {}; rd = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
rk = rd('assets/rk.js'); c['assets/rk.js carries topics, groups and countries'] = rk.startswith('window.NZRK=') and '"young_family"' in rk and '"biz_tech"' in rk and '"Family and life stage"' in rk
csvs = [f for f in glob.glob(os.path.join(ROOT, 'rankings/*/*/*/nestlyzer-*.csv')) if re.fullmatch(r'[a-z]{2}', f.split(os.sep)[-3])]; bad = 0  # country rankings (scope pages keep their own format)
for f in csvs[:400]:
    rows = list(csv.reader(open(f, encoding='utf-8')))
    if rows[0][-1] != 'population' or rows[0][:7] != ['rank','place','region','country','score','limited_evidence','page']: bad += 1
c['ranking CSVs keep their columns and add population (%d checked)' % min(400, len(csvs))] = len(csvs) > 500 and bad == 0
fr = rd('rankings/households/fr/young-family/index.html')
c['profile page: picker, scatter, then list'] = 0 < fr.find('class="rk-pick"') < fr.find('class="rk-fig"') < fr.find('<ol class="rows')
ci = rd('rankings/households/fr/index.html')
c['country page: scatter before grouped topic chips'] = 0 < ci.find('class="rk-fig"') < ci.find('class="rk-g"') and ci.count('<ul class="chips">') >= 4 and ci.count('/rankings/households/fr/') >= 26
rg = rd('rankings/regions/fr/index.html')
c['regions page: picker, scatter, anchor chips, sections with ids'] = 'class="rk-fig"' in rg and 'id="young-family"' in rg and 'href="#young-family"' in rg
hh = rd('rankings/households/index.html'); c['households hub: picker, chart, countries and scopes as chips'] = 'data-aud="households"' in hh and 'data-pick="1"' in hh and hh.count('<ul class="chips">') >= 5 and '<ul class="columns">' not in hh
c['regions page: profile sections in a two-column grid'] = 'class="rk-grid"' in rd('rankings/regions/fr/index.html')
hub = rd('rankings/index.html'); c['hub: picker and region scatter'] = 'data-aud="all"' in hub and 'data-pick="1"' in hub
pl = glob.glob(os.path.join(ROOT, 'places/fr/07010/index.html'))
c['place page: featured ranks in their own list style'] = bool(pl) and '<ul class="feat">' in rd('places/fr/07010/index.html')
pc = rd('src/place/place.css'); c['place.css: no fixed white panels'] = 'background:#fff}' not in pc and 'background:#f5f7f8' not in pc
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    br = pw.chromium.launch(); errs = []
    def page(u, scheme='light', w=390):
        ctx = br.new_context(viewport={'width': w, 'height': 900}, color_scheme=scheme); ctx.route(lambda x: not x.startswith(B), lambda r: r.abort())
        p = ctx.new_page(); p.on('pageerror', lambda e: errs.append(u + ': ' + str(e))); p.goto(B + u); p.wait_for_timeout(2500); return p
    p = page('/rankings/households/fr/young-family/', 'light', 1200)
    n = p.evaluate("document.querySelectorAll('.rk-fig[data-kind=places] svg circle').length"); chips = p.evaluate("document.querySelectorAll('.rk-pick .chip').length")
    c['profile page draws the places scatter (%d dots) and %d topic chips' % (n, chips)] = n >= 50 and chips >= 26 and p.evaluate("!!document.querySelector('.rk-pick .chip[aria-current]')")
    m = page('/rankings/households/fr/young-family/'); opts = m.evaluate("(()=>{const s=document.querySelector('.rk-pick select[aria-label=Topic]');return s?[s.options.length,s.value]:null})()")
    c['phone: one grouped topic menu instead of the buttons (%s)' % (opts,)] = bool(opts) and opts[0] >= 26 and opts[1] == 'young_family' and m.evaluate("document.querySelectorAll('.rk-pick .chip').length") == 0
    rg_n = p.evaluate("document.querySelectorAll('ol.rk-list .rg').length"); c['ranked list shows region and score bar (%d rows)' % rg_n] = rg_n >= 50 and p.evaluate("getComputedStyle(document.querySelector('ol.rk-list li')).getPropertyValue('--w').trim()") == '100%'
    p = page('/rankings/regions/fr/', 'dark')
    n = p.evaluate("document.querySelectorAll('.rk-fig svg circle').length"); p.select_option('.rk-ax select >> nth=1', label='Remote worker'); p.wait_for_timeout(300)
    c['regions scatter: %d regions, axis switch redraws' % n] = n >= 10 and 'Remote worker' in p.evaluate("document.querySelector('.rk-fig').textContent")
    def totop(u):
        q = page(u, 'light', 1200); q.evaluate("window.scrollTo(0, 2500)"); q.wait_for_timeout(500)
        if not q.evaluate("!!document.querySelector('.nz-top.on')"): return False
        q.click('.nz-top'); q.wait_for_timeout(1500); return q.evaluate("window.scrollY") < 5
    tt = {u: totop(u) for u in ['/rankings/households/de/young-family/', '/method/', '/places/fr/07010/', '/world/', '/']}
    c['back-to-top arrow appears after scrolling and returns to the top (%s)' % ', '.join(k for k, v in tt.items() if not v)] = all(tt.values())
    p = page('/rankings/', 'light', 1200); c['hub draws a region scatter for a country'] = p.evaluate("document.querySelectorAll('.rk-fig svg circle').length") >= 5
    p = page('/places/fr/07010/', 'dark')
    look = p.evaluate("""(()=>{const s=document.querySelector('#place-rich section');const tr=document.querySelectorAll('#place-rich tbody tr');const L=c=>{const m=c.match(/\\d+(\\.\\d+)?/g).map(Number);return (0.2126*m[0]+0.7152*m[1]+0.0722*m[2])/255};
      return s?[L(getComputedStyle(s).backgroundColor),L(getComputedStyle(tr[1].cells[1]).color),getComputedStyle(document.querySelector('.feat a')).display, tr[0].cells[2].textContent]:null})()""")
    c['place page in dark mode: dark panels, light text, inline featured links, best rank first (%s)' % (look,)] = bool(look) and look[0] < .3 and look[1] > .6 and look[2] == 'inline' and look[3].startswith('#')
    q = page('/places/ch/291/'); tr = q.evaluate("document.querySelectorAll('.trend-cells li').length")
    c['place page: population change over 1/3/5/10 years with a sentence (%d cells)' % tr] = tr >= 1 and len(q.evaluate("(document.querySelector('.trend p')||{}).textContent||''")) > 30
    br.close()
ih = rd('insights/index.html'); c['insights hub grouped by theme with a jump bar (r10)'] = 'aria-label="Themes"' in ih and ih.count('<h2 id=') >= 5 and 'id="inside"' in ih
c['no script errors'] = not errs
for k, v in c.items(): print(('ok   ' if v else 'FAIL ') + k)
ok = all(c.values()); print('RANKINGS LAYOUT TEST:', 'PASS' if ok else 'FAIL', errs[:2]); sys.exit(0 if ok else 1)
