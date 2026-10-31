#!/usr/bin/env python3
"""Data-use trace on the real application (2.12.2, NZA-06/12/13).

Joins the two build-time record traces (build/source/context/record_trace.csv.gz and master_record_trace.csv.gz) with
what the place pages actually do with every published record, for every profile, in the running app:
summary (key figures), expanded (More figures) or dropped with a reason code. Every stored record ends with exactly one
outcome, so the counts reconcile with the stores.

    python3 tests/data_use_trace.py [base-url]       (default http://localhost:8787)
Writes build/source/context/data_use_trace.csv.gz (one row per record) and docs/data_use_trace_summary.json."""
import csv, gzip, json, os, sys, collections
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
CTX = os.path.join(ROOT, 'build', 'source', 'context')
MAX_PLACES = int(os.environ.get('NZ_TRACE_PLACES', '1000'))   # per country; every place with its own figures first

build = {}
for fn, store in (('record_trace.csv.gz', 'context'), ('master_record_trace.csv.gz', 'master')):
    for r in csv.DictReader(gzip.open(os.path.join(CTX, fn), 'rt', encoding='utf-8')):
        r['store'] = store; build[r['record_id']] = r

ccs = os.environ.get('NZ_TRACE_CC', '').split(',') if os.environ.get('NZ_TRACE_CC') else sorted(f[:-5] for f in os.listdir(os.path.join(ROOT, 'data', 'x')) if f.endswith('.json') and not f.startswith('_'))
JS = """([cc, maxp]) => {
  const E = NZ_CXENV(), SHARDS = E.SHARDS, ENGINE = E.ENGINE;
  const sh = SHARDS[cc], cx = sh && sh.extra && sh.extra.ctx; if (!cx) return null;
  const profs = Object.keys(ENGINE.profiles).filter(k => !ENGINE.profiles[k].disabled);
  const byOid = {}; sh.records.forEach(r => { byOid[r.oid] = r.id; });
  const direct = Object.keys(cx.places).map(o => byOid[o]).filter(Boolean);
  const all = sh.records.map(r => r.id);
  // places with their own figures first, then one place per region binding, then any place (national figures)
  const pick = new Set(direct.slice(0, maxp)); const rg = cx.regions || {};
  Object.keys(rg).forEach(g => { const f = rg[g][0], v = rg[g][1]; const hit = sh.records.find(r => r[f] && (r[f] === v || v.endsWith('*') && String(r[f]).startsWith(v.slice(0, -1)))); if (hit) pick.add(hit.id); });
  if (all.length) pick.add(all[0]);
  const best = {}, rank = { summary: 3, expanded: 2 }, perProf = {}, why = {};
  for (const oid of pick) for (const p of profs) {
    const t = NZ_CXTRACE(oid, p); if (!t) continue;
    perProf[p] = perProf[p] || { places: 0, summary: 0 }; perProf[p].places++; perProf[p].summary += t.summary.length;
    t.summary.forEach(id => { best[id] = 'summary'; });
    t.expanded.forEach(id => { if (best[id] !== 'summary') best[id] = 'expanded'; });
    Object.keys(t.dropped).forEach(id => { if (!best[id]) { (why[id] = why[id] || {})[t.dropped[id]] = 1; } });
  }
  Object.keys(why).forEach(id => { if (!best[id]) best[id] = 'dropped:' + Object.keys(why[id]).sort().join('+'); });
  return { places: pick.size, profiles: profs.length, best, perProf };
}"""
page_out, cov = {}, {}
with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page()
    for cc in ccs:
        pg.goto(f'{B}/#/explore?cc={cc}&p=first_home', wait_until='load')
        try: pg.wait_for_function(f"window.NZ_CXENV && (function(E){{return E.ENGINE && E.KPIX && E.SHARDS['{cc}'] && E.SHARDS['{cc}'].extra}})(NZ_CXENV())", timeout=60000)
        except Exception: print('no ctx loaded for', cc); continue
        res = pg.evaluate(JS, [cc, MAX_PLACES])
        if not res: continue
        for k, v in res['best'].items():
            o = page_out.get(k)
            if o is None or o.startswith('dropped') and not v.startswith('dropped') or o == 'expanded' and v == 'summary': page_out[k] = v
        cov[cc] = {'places_traced': res['places'], 'profiles': res['profiles'], 'summary_figures_per_page': {p: round(x['summary'] / max(1, x['places']), 1) for p, x in res['perProf'].items()}}
        print(cc, res['places'], 'places x', res['profiles'], 'profiles', len(res['best']), 'records seen')
    br.close()

rows, tally, unexplained = [], collections.Counter(), []
for rid, r in sorted(build.items()):
    if r['published'] == 'True' and r['reason_codes']: o = 'not_bound:' + r['reason_codes']
    elif r['published'] == 'True' and r['source_geo_id'].startswith('EUROSTAT:EA'): o = 'dropped:NOT_APPLICABLE'   # euro-area benchmark: pages compare with EU27
    elif r['published'] == 'True':
        o = page_out.get(rid)
        if o is None: o = 'not_reached:LOAD_INCOMPLETE'
        if 'UNEXPLAINED' in o or o.startswith('not_reached'): unexplained.append(rid)
    else: o = 'not_published:' + (r['reason_codes'] or 'SOURCE_REVIEW_PENDING')
    tally[(r['store'], o.split(':')[0] if not o.startswith(('dropped', 'not_published', 'not_bound', 'not_reached')) else o)] += 1
    rows.append([rid, r['store'], r['source_id'], r['country'], r['source_geo_id'], r['indicator_id'], r.get('original_publication', ''), r['published'], o, 'context_not_scored'])
with gzip.open(os.path.join(CTX, 'data_use_trace.csv.gz'), 'wt', newline='', encoding='utf-8') as f:
    w = csv.writer(f); w.writerow(['record_id', 'store', 'source_id', 'country', 'source_geo_id', 'indicator_id', 'original_publication', 'published', 'page_outcome', 'scoring_state']); w.writerows(rows)
summ = {'records': len(rows), 'outcomes': {f'{a} | {b}': n for (a, b), n in sorted(tally.items())}, 'unexplained': len(unexplained), 'unexplained_sample': unexplained[:20], 'coverage': cov}
os.makedirs(os.path.join(ROOT, 'docs'), exist_ok=True)
json.dump(summ, open(os.path.join(ROOT, 'docs', 'data_use_trace_summary.json'), 'w'), indent=1)
print(json.dumps(summ['outcomes'], indent=1)); print('unexplained', len(unexplained), unexplained[:10])
print('TRACE', 'PASS' if not unexplained and sum(tally.values()) == len(build) else 'FAIL')
