"""2.15.27: card contradiction audit (owner: "a big contradiction ... audit this").
For every country and every profile, the top 5 places: the story (Why / watch-outs) and the For and against lines are read
from the live page code and checked against each other and against the data:
 C1 a line says no motorway / no flight path / no heavy industry / nothing close, while the data has one close by
 C2 the same reason appears on both sides, or twice on one side
 C3 a distance in words differs from the data (sea, lake, motorway, airport, nearest city)
 C4 broken text: undefined, NaN, null, [object, '  ', scores outside 0..100
 C5 a For line and a watch-out about the same subject (motorway, airport, population) contradict
Exit 1 on any finding. Usage: python3 tests/contradiction_audit.py [base_url] [out.json]"""
import json, re, sys
from playwright.sync_api import sync_playwright
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'; OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/contradictions.json'
JS = r"""async ([cc, prof]) => {
  const out = [];
  const res = NZ.res; if (!res || !res.scored) return out;
  for (const s of res.scored.slice(0, 5)) {
    const r = s.r, x = r.x || {}, fr = r.factorRaw || {};
    let st = {good: [], bad: []}, it = [];
    try { st = NZ_STORY(r); } catch (e) { out.push({id: r.id, name: r.name, c: 'C4', msg: 'story threw ' + e.message}); }
    try { it = NZ_FIT(r) || []; } catch (e) { out.push({id: r.id, name: r.name, c: 'C4', msg: 'fit threw ' + e.message}); }
    const pro = it.filter(o => o.s >= 60), con = it.filter(o => o.s <= 40);
    const txt = o => [o.lab, o.val, o.cmp].filter(Boolean).join(' ');
    const all = [].concat(st.good, st.bad, st.unusual || [], st.interesting || [], it.map(txt));
    const F = (c, msg, line) => out.push({id: r.id, name: r.name, c, msg, line: String(line || '').slice(0, 220)});
    for (const l of all) {
      if (/undefined|NaN|\bnull\b|\[object|\s{3,}/.test(l)) F('C4', 'broken text', l);
      if (/\bno motorway\b|none of these nearby: motorway/i.test(l) && x.mway_km < 3) F('C1', 'says no motorway, motorway at ' + x.mway_km + ' km', l);
      if (/no (motorway, )?flight path|none of these nearby: .*flight path/i.test(l) && fr.geo_hub_airport_km < 12) F('C1', 'says no flight path, hub airport at ' + fr.geo_hub_airport_km + ' km', l);
      if (/no .*heavy industry/i.test(l) && x.chem_km < 10) F('C1', 'says no heavy industry, chemical park at ' + x.chem_km + ' km', l);
      const ms = /(sea|coast)[^.;]{0,40}?(\d[\d,']*(?:\.\d)?) km|(\d[\d,']*(?:\.\d)?) km (?:to|from) the (?:sea|coast)/i.exec(l);
      if (ms && !/\bport\b|sea of|for coastal living|sun and coast/i.test(l)) { const v = parseFloat((ms[2] || ms[3]).replace(/[,']/g, '')), sea = isFinite(fr.geo_sea_km) ? fr.geo_sea_km : fr.geo_coast_km; if (isFinite(sea) && Math.abs(v - sea) > Math.max(2, sea * 0.15) && !/lake/i.test(l)) F('C3', 'sea distance ' + v + ' vs data ' + sea, l); }
    }
    for (const o of it) if (!(o.s >= 0 && o.s <= 100)) F('C4', 'score out of range ' + o.s, o.lab);
    const pl = pro.map(o => String(o.lab).toLowerCase()), cl = con.map(o => String(o.lab).toLowerCase());
    if (pl.some(l => cl.includes(l))) F('C2', 'same reason for and against', pl.filter(l => cl.includes(l)).join(', '));
    // C5: a watch-out and a strong For line on the same subject
    const bad = st.bad.join(' ');
    if (/motorway passes/i.test(bad)) for (const o of pro) if (/fewer nuisances|quiet/i.test(o.lab) && !/motorway/i.test(txt(o))) F('C5', 'watch-out names a motorway, For line on nuisances does not', txt(o));
    if (/hub airport is only/i.test(bad)) for (const o of pro) if (/fewer nuisances|quiet/i.test(o.lab) && !/airport/i.test(txt(o))) F('C5', 'watch-out names the airport, For line on nuisances does not', txt(o));
    if (/population fell/i.test(bad) && st.good.some(g => /moving in|grew/i.test(g))) F('C5', 'population both fell and grew', bad);
  }
  return out;
}"""
def run_country(b, cc, profs):
    ctx = b.new_context(viewport={'width': 1300, 'height': 900}); pg = ctx.new_page(); res = []; n = 0
    try:
        pg.goto(B + '/#/explore?cc=' + cc + '&p=' + profs[0], wait_until='domcontentloaded')
        pg.wait_for_function("cc => window.NZ && NZ.state.cc === cc && NZ.res && NZ.res.scored && NZ.res.scored.length", arg=cc, timeout=90000)
        pg.evaluate("() => { location.hash = location.hash + '&sel=' + encodeURIComponent(NZ.res.scored[0].id); }")
        pg.wait_for_function('typeof window.NZ_FIT === "function"', timeout=60000)
        for prof in profs:
            pg.evaluate("([cc,p]) => { location.hash = '#/explore?cc=' + cc + '&p=' + p; }", [cc, prof])
            try: pg.wait_for_function("([cc,p]) => NZ.state.cc === cc && NZ.state.profile === p && NZ.res && NZ.res.scored", arg=[cc, prof], timeout=60000); pg.wait_for_timeout(150)
            except Exception as e: res.append({'cc': cc, 'p': prof, 'c': 'LOAD', 'msg': str(e)[:120]}); continue
            for f in pg.evaluate(JS, [cc, prof]): f.update(cc=cc, p=prof); res.append(f)
            n += 1
    except Exception as e: res.append({'cc': cc, 'p': '', 'c': 'LOAD', 'msg': str(e)[:160]})
    ctx.close(); return res, n
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.goto(B + '/#/explore?cc=CH&p=young_family', wait_until='domcontentloaded'); pg.wait_for_function('window.NZ && NZ.meta', timeout=90000)
    meta = pg.evaluate('NZ.meta'); pg.close()
    profs = [k for k, v in meta['config']['profiles'].items() if v.get('weights') and k not in ('self_fit', 'biz_custom_fit')]
    only = sys.argv[3].split(',') if len(sys.argv) > 3 else None
    ccs = [c['cc'] for c in meta['countries'] if not only or c['cc'] in only]
    found, n = [], 0
    for cc in ccs:
        r_, k = run_country(b, cc, profs); found += r_; n += k
        print(cc, k, 'combos,', len(r_), 'findings', flush=True)
        json.dump({'combos': n, 'findings': found}, open(OUT, 'w'), ensure_ascii=False)
    b.close()
by = {}
for f in found: by[f['c']] = by.get(f['c'], 0) + 1
json.dump({'combos': n, 'findings': found, 'by': by}, open(OUT, 'w'), indent=1, ensure_ascii=False)
print('country-profile combinations checked:', n, '| findings by check:', by)
for f in found[:40]: print(' ', f.get('cc'), f.get('p'), f.get('name', ''), f['c'], f['msg'], '|', f.get('line', ''))
sys.exit(1 if found else 0)
