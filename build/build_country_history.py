#!/usr/bin/env python3
"""Country history (2.13): yearly national series since 2010 from the World Bank WDI files already in the repository
(build/source/wdi, CC BY 4.0), one small file per country, data/h/{CC}.json. Shown on place pages as country context
with exact 3-, 5- and 10-year changes where both end years exist. Never a municipal value, never part of a score.
Taiwan is not in the WDI: its file says so instead of borrowing another country's data.
    python3 build/build_country_history.py"""
import csv, json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'build'))
WDI = os.path.join(ROOT, 'build', 'source', 'wdi')
OUT = os.path.join(ROOT, 'data', 'h')
# id: (file, label, unit, group, better: +1 higher is better / -1 lower is better / 0 neutral, change kind: 'pp' for rates, 'pct' for levels)
SERIES = [
    ('gdp_growth', 'ny.gdp.mktp.kd.zg', 'Real GDP growth', '% a year', 'Economy', 1, 'pp'),
    ('gdp_pc_ppp', 'ny.gdp.pcap.pp.cd', 'GDP per person (purchasing power)', 'int. $', 'Economy', 1, 'pct'),
    ('inflation', 'fp.cpi.totl.zg', 'Consumer price inflation', '% a year', 'Economy', -1, 'pp'),
    ('unemployment', 'sl.uem.totl.zs', 'Unemployment rate (ILO estimate)', '% of labour force', 'Work', -1, 'pp'),
    ('female_lfp', 'sl.tlf.cact.fe.zs', "Women's labour force participation", '% of women 15+', 'Work', 1, 'pp'),
    ('tertiary', 'se.ter.enrr', 'Tertiary enrolment', '% gross', 'Skills and research', 1, 'pp'),
    ('edu_spend', 'se.xpd.totl.gd.zs', 'Public spending on education', '% of GDP', 'Skills and research', 1, 'pp'),
    ('rnd', 'gb.xpd.rsdv.gd.zs', 'Research and development spending', '% of GDP', 'Skills and research', 1, 'pp'),
    ('hightech', 'tx.val.tech.mf.zs', 'High-tech share of manufactured exports', '%', 'Skills and research', 1, 'pp'),
    ('population', 'sp.pop.totl', 'Population', 'people', 'People', 0, 'pct'),
    ('pop_growth', 'sp.pop.grow', 'Population growth', '% a year', 'People', 0, 'pp'),
    ('age65', 'sp.pop.65up.to.zs', 'Residents aged 65 and over', '% of population', 'People', 0, 'pp'),
    ('urban', 'sp.urb.totl.in.zs', 'Urban population', '% of population', 'People', 0, 'pp'),
    ('life_exp', 'sp.dyn.le00.in', 'Life expectancy at birth', 'years', 'Health and safety', 1, 'abs'),
    ('infant_mort', 'sp.dyn.imrt.in', 'Infant mortality', 'per 1,000 live births', 'Health and safety', -1, 'abs'),
    ('beds', 'sh.med.beds.zs', 'Hospital beds', 'per 1,000 people', 'Health and safety', 1, 'abs'),
    ('homicide', 'vc.ihr.psrc.p5', 'Homicides', 'per 100,000 people', 'Health and safety', -1, 'abs'),
    ('road_deaths', 'sh.sta.traf.p5', 'Road deaths', 'per 100,000 people', 'Health and safety', -1, 'abs'),
    ('pm25', 'en.atm.pm25.mc.m3', 'Fine-particle air pollution (PM2.5)', 'µg/m³', 'Environment and energy', -1, 'abs'),
    ('renewable_power', 'eg.elc.rnew.zs', 'Renewable share of electricity', '%', 'Environment and energy', 1, 'pp'),
    ('broadband', 'it.net.bbnd.p2', 'Fixed broadband subscriptions', 'per 100 people', 'Environment and energy', 1, 'abs'),
    ('gini', 'si.pov.gini', 'Income inequality (Gini)', 'index 0-100', 'Economy', -1, 'abs'),
    ('real_interest', 'fr.inr.rinr', 'Real interest rate', '%', 'Economy', 0, 'pp'),
]


def main():
    import ast, re
    src = open(os.path.join(ROOT, 'build', 'build_national.py'), encoding='utf-8').read()
    ISO3 = ast.literal_eval(re.search(r'^ISO3 = (\{.*?\})\n', src, re.S | re.M).group(1))   # read, not imported (importing would rebuild)
    meta = json.load(open(os.path.join(ROOT, 'data', 'meta.json')))
    ccs = [c['cc'] for c in meta['countries']]
    data = {}
    used = []
    for sid, f, label, unit, group, better, kind in SERIES:
        p = os.path.join(WDI, f + '.csv')
        if not os.path.exists(p): continue
        used.append(sid); by = {}
        for r in csv.DictReader(open(p, encoding='utf-8')):
            try: y, v = int(r['Year']), float(r['Value'])
            except Exception: continue
            if y >= 2010: by.setdefault(r['Country Code'], {})[y] = v
        data[sid] = by
    os.makedirs(OUT, exist_ok=True)
    stats = {'countries_with_values': 0, 'series_rows': 0, 'observations': 0, 'changes': {3: 0, 5: 0, 10: 0}}
    for cc in ccs:
        iso = ISO3.get(cc)
        out = {'cc': cc, 'source': 'World Bank, World Development Indicators (CC BY 4.0), via the open WDI dataset mirror', 'scope': 'country', 'series': []}
        for sid, f, label, unit, group, better, kind in SERIES:
            if sid not in used: continue
            s = (data[sid].get(iso) or {}) if iso else {}
            if len(s) < 3: continue
            ys = sorted(s); last = ys[-1]
            ch = {}
            for k in (3, 5, 10):
                if last - k in s:
                    a, b = s[last - k], s[last]
                    ch[k] = round(b - a, 2) if kind in ('pp', 'abs') else (round((b / a - 1) * 100, 1) if a else None)
                    stats['changes'][k] += 1
            out['series'].append({'id': sid, 'label': label, 'unit': unit, 'group': group, 'better': better, 'kind': kind, 'code': f.upper(),
                                  'y': [[y, round(s[y], 3 if abs(s[y]) < 100 else 0)] for y in ys], 'change': ch})
            stats['series_rows'] += 1; stats['observations'] += len(ys)
        if not out['series']: out['note'] = 'The World Bank publishes no series for this economy; no other country\'s figures are used instead.'
        if out['series']: stats['countries_with_values'] += 1
        json.dump(out, open(os.path.join(OUT, cc + '.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    print(json.dumps(stats))


if __name__ == '__main__':
    main()
