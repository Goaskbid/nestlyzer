#!/usr/bin/env python3
"""Location measures for business sites (2.10.2), added to data/x/{CC}.json cols. Run after build_extra.py.
  iport_km   straight-line distance to the nearest key inland port (build/source/inland_ports.json: Rhine, Danube,
             Elbe, Oder and Main ports, US inland and Great Lakes ports)
  iport      its name (string index)
  mport_km   distance to the nearest major seaport (build/source/major_seaports.json), mport its name
  chem_km    distance to the nearest chemical park or refinery complex with pipeline links (build/source/chem_parks.json), chem its name
  uni_pct    universities within 10 km weighted by size and distance (ROR), percentile within the country
  reach100   residents within 100 km of the place, all countries counted (Basel counts German and French customers)
  reach_pct  reach100 as a percentile within the country (0-100): network centrality for distribution
  flat_pct   flatness as a percentile within the country (100 = flattest; from terrain relief)
    python3 build/build_reach.py"""
import json, math, os
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
meta = json.load(open(os.path.join(ROOT, 'data', 'meta.json')))
PORTS = json.load(open(os.path.join(ROOT, 'build', 'source', 'inland_ports.json')))['rows']
SEA = json.load(open(os.path.join(ROOT, 'build', 'source', 'major_seaports.json')))['rows']
UNI = json.load(open(os.path.join(ROOT, 'build', 'source', 'ror_anchors.json')))['universities']
FINC = json.load(open(os.path.join(ROOT, 'build', 'source', 'finance_centres.json')))['rows']   # financial centres with tier and roles (2.12)
CHEM = json.load(open(os.path.join(ROOT, 'build', 'source', 'chem_parks.json')))['rows']   # chemical parks and refinery complexes with pipeline links
R = 6371.0
def hav(la1, lo1, la2, lo2):
    la1, lo1, la2, lo2 = map(np.radians, (la1, lo1, la2, lo2))
    a = np.sin((la2 - la1) / 2) ** 2 + np.cos(la1) * np.cos(la2) * np.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(np.minimum(1, a)))
shards, LA, LO, PO, OWN = {}, [], [], [], []
for c in meta['countries']:
    d = json.load(open(os.path.join(ROOT, 'data', 'c', c['cc'] + '.json'))); C = d['cols']
    iLa, iLo, iP = C.index('lat'), C.index('lon'), C.index('pop')
    rows = d['rows']; shards[c['cc']] = (len(LA), len(rows))
    for r in rows:
        LA.append(r[iLa] if r[iLa] is not None else np.nan); LO.append(r[iLo] if r[iLo] is not None else np.nan); PO.append(r[iP] or 0)
LA, LO, PO = np.array(LA, float), np.array(LO, float), np.array(PO, float)
ok = ~np.isnan(LA)
# reach within 100 km via 1-degree cells
cell = {}
for i in np.where(ok)[0]: cell.setdefault((int(math.floor(LA[i])), int(math.floor(LO[i]))), []).append(i)
cell = {k: np.array(v) for k, v in cell.items()}
reach = np.full(len(LA), np.nan)
for (ci, cj), idx in cell.items():
    nb = [cell[(ci + a, cj + b)] for a in (-1, 0, 1) for b in (-2, -1, 0, 1, 2) if (ci + a, cj + b) in cell]
    nb = np.concatenate(nb)
    for i in idx:
        dd = hav(LA[i], LO[i], LA[nb], LO[nb])
        reach[i] = PO[nb][dd <= 100].sum()
# one-day truck radius (2.11): residents within 300 km, all countries, from a 0.25-degree population grid
G = {}
for i in np.where(ok)[0]: G[(int(math.floor(LA[i] * 4)), int(math.floor(LO[i] * 4)))] = G.get((int(math.floor(LA[i] * 4)), int(math.floor(LO[i] * 4))), 0) + PO[i]
gk = np.array(list(G.keys()), float); gla, glo, gpo = (gk[:, 0] + 0.5) / 4, (gk[:, 1] + 0.5) / 4, np.array(list(G.values()), float)
r300c = {}
for key in G:
    la0, lo0 = (key[0] + 0.5) / 4, (key[1] + 0.5) / 4
    m = (np.abs(gla - la0) < 2.8) & (np.abs(glo - lo0) < 2.8 / max(0.2, math.cos(math.radians(la0))))
    r300c[key] = gpo[m][hav(la0, lo0, gla[m], glo[m]) <= 300].sum()
reach300 = np.array([r300c.get((int(math.floor(LA[i] * 4)), int(math.floor(LO[i] * 4))), np.nan) if ok[i] else np.nan for i in range(len(LA))])
# domestic reach (2.11.2): residents of the same country within 150 km (national distribution: customs borders and
# national retail networks make the home market decide, e.g. the Gaeu between Zurich, Basel and Bern)
dom150 = np.full(len(LA), np.nan)
for cc0, (s0, n0) in shards.items():
    idx0 = np.arange(s0, s0 + n0); idx0 = idx0[ok[idx0]]
    if not len(idx0): continue
    cells0 = {}
    for i in idx0: cells0.setdefault((int(math.floor(LA[i])), int(math.floor(LO[i]))), []).append(i)
    cells0 = {k: np.array(v) for k, v in cells0.items()}
    for (ci, cj), idx in cells0.items():
        nb = [cells0[(ci + a, cj + b)] for a in (-2, -1, 0, 1, 2) for b in (-3, -2, -1, 0, 1, 2, 3) if (ci + a, cj + b) in cells0]
        nb = np.concatenate(nb)
        for i in idx: dom150[i] = PO[nb][hav(LA[i], LO[i], LA[nb], LO[nb]) <= 150].sum()
pla, plo = np.array([p[2] for p in PORTS]), np.array([p[3] for p in PORTS])
names = [p[0] for p in PORTS]
def pct(v, higher=True):
    out = np.full(len(v), np.nan); m = ~np.isnan(v)
    if m.sum() > 1:
        order = v[m].argsort().argsort().astype(float) / (m.sum() - 1) * 100
        out[m] = order if higher else 100 - order
    return out
for cc, (s, n) in shards.items():
    p = os.path.join(ROOT, 'data', 'x', cc + '.json')
    if not os.path.exists(p): continue
    x = json.load(open(p)); cols = x['cols']; strs = x['strs']
    la, lo = LA[s:s + n], LO[s:s + n]
    ip_km, ip_nm = [], []
    for i in range(n):
        if np.isnan(la[i]): ip_km.append(None); ip_nm.append(None); continue
        dd = hav(la[i], lo[i], pla, plo); j = int(dd.argmin()); ip_km.append(round(float(dd[j])) if dd[j] >= 10 else round(float(dd[j]), 1))
        nm = names[j]
        if nm not in strs: strs.append(nm)
        ip_nm.append(strs.index(nm))
    sla, slo = np.array([p[2] for p in SEA]), np.array([p[3] for p in SEA]); mk, mn = [], []
    for i in range(n):
        if np.isnan(la[i]): mk.append(None); mn.append(None); continue
        dd = hav(la[i], lo[i], sla, slo); j = int(dd.argmin()); mk.append(round(float(dd[j])) if dd[j] >= 10 else round(float(dd[j]), 1)); nm = SEA[j][0]
        if nm not in strs: strs.append(nm)
        mn.append(strs.index(nm))
    cols['mport_km'] = mk; cols['mport'] = mn
    # nearest chemical park with pipeline links (2.10.3): where chemical and port industry already operate
    cla, clo = np.array([p[2] for p in CHEM]), np.array([p[3] for p in CHEM]); ck, cn = [], []
    for i in range(n):
        if np.isnan(la[i]): ck.append(None); cn.append(None); continue
        dd = hav(la[i], lo[i], cla, clo); j = int(dd.argmin()); ck.append(round(float(dd[j])) if dd[j] >= 10 else round(float(dd[j]), 1)); nm = CHEM[j][0]
        if nm not in strs: strs.append(nm)
        cn.append(strs.index(nm))
    cols['chem_km'] = ck; cols['chem'] = cn
    # financial centres (2.12): 0-100 per role, the best centre within commuting distance; tier 1 counts 100, tier 2 85,
    # tier 3 65, tier 4 (specialist) 55; full value within 8 km, falling to 0 at 60 km. fin is the best centre's name.
    fla, flo = np.array([f[2] for f in FINC]), np.array([f[3] for f in FINC]); ftier = np.array([{1: 100, 2: 85, 3: 65, 4: 55}[f[4]] for f in FINC])
    ROLE = {'fin_s': 'BW', 'ins_s': 'I', 'fund_s': 'F', 'com_s': 'CG', 'cry_s': 'X', 'wlth_s': 'W'}
    rmask = {c: np.array([any(ch in f[5] for ch in rl) for f in FINC]) for c, rl in ROLE.items()}
    TV = {1: 100, 2: 85, 3: 65, 4: 55}
    rtier = {c: np.array([max([TV[(f[6] if len(f) > 6 else {}).get(ch, f[4])] for ch in rl if ch in f[5]] or [0]) for f in FINC]) for c, rl in ROLE.items()}
    fc = {c: [] for c in ROLE}; fn = []
    for i in range(n):
        if np.isnan(la[i]):
            for c in ROLE: fc[c].append(None)
            fn.append(None); continue
        dd = hav(la[i], lo[i], fla, flo); dec = np.clip((60 - dd) / 52, 0, 1); val = ftier * dec
        for c in ROLE:
            v = (rtier[c] * dec)[rmask[c]]; fc[c].append(int(round(float(v.max()))) if v.size and v.max() > 0 else 0)
        if val.max() > 0:
            nm = FINC[int(val.argmax())][0]
            if nm not in strs: strs.append(nm)
            fn.append(strs.index(nm))
        else: fn.append(None)
    for c in ROLE: cols[c] = fc[c]
    cols['fin'] = fn
    # cross-border commuting (2.12): a border nearby counts only as far as the neighbour pays more than home (national
    # wage level, World Bank / OECD via data/national.json); 100 within 3 km of a border with a neighbour paying 40%+ more
    NATV = json.load(open(os.path.join(ROOT, 'data', 'national.json')))['countries']
    def wage(c2):
        v = (NATV.get(c2) or {}).get('values', {}); w = v.get('wage_level') or v.get('gni_pc_ppp'); return w[0] if w else None
    NAMECC = {m['name']: m['cc'] for m in meta['countries']}; NAMECC.update({'Czech Republic': 'CZ', 'Czechia': 'CZ', 'United Kingdom': 'UK', 'Greece': 'EL', 'North Macedonia': 'MK', 'Macedonia': 'MK', 'Republic of Serbia': 'RS', 'Slovakia': 'SK', 'Kosovo': None, 'Montenegro': None, 'Bosnia and Herzegovina': None})
    wh = wage(cc); bkm = cols.get('border_km'); bnm = cols.get('border'); xb = []
    for i in range(n):
        d = bkm[i] if bkm else None; nb = strs[bnm[i]] if bnm and bnm[i] is not None and bnm[i] < len(strs) else None
        wn = wage(NAMECC.get(nb)) if nb else None
        if d is None or not wh or not wn: xb.append(None); continue
        gain = max(0.0, min(1.0, (wn / wh - 1) / 0.4)); prox = max(0.0, min(1.0, (45 - d) / 42))
        xb.append(int(round(100 * gain * prox)))
    cols['xb_s'] = xb
    # university presence: universities and universities of applied sciences within 10 km (the nearer the more), a major one counting more
    # (size proxy from ROR), as a percentile within the country -> the 'campus' category (students, labs)
    ula, ulo = np.array([u[2] for u in UNI]), np.array([u[3] for u in UNI]); uw = np.array([0.3 if u[4] < 0 else 1 + math.log(1 + u[4]) for u in UNI])
    us = np.full(n, np.nan)
    for i in range(n):
        if np.isnan(la[i]): continue
        m = (np.abs(ula - la[i]) < 0.2) & (np.abs(ulo - lo[i]) < 0.3)
        if not m.any(): us[i] = 0; continue
        dd = hav(la[i], lo[i], ula[m], ulo[m]); us[i] = float((uw[m] * np.clip(1 - dd / 10, 0, 1) ** 2).sum())
    cols.pop('uni_score', None)   # only the percentile ships (keeps the US file under GitHub's 20 MB upload advice)
    cols['uni_pct'] = [None if np.isnan(v) else int(round(float(v))) for v in pct(us)]
    # university-town character (2.11): university presence relative to the people within 10 km (Tübingen, not Herne)
    p10 = np.array([v if v is not None else np.nan for v in cols.get('pop10', [None] * n)], float)
    ut = np.where(np.isnan(p10) | (us <= 0), np.where(us <= 0, 0, np.nan), us / np.maximum(p10, 20000) * 1e5)
    cols['unitown_pct'] = [None if np.isnan(v) else int(round(float(v))) for v in pct(ut)]
    rc = reach[s:s + n]
    rel = np.array([v if v is not None else np.nan for v in cols.get('relief', [None] * n)], float)
    cols['iport_km'] = ip_km; cols['iport'] = ip_nm
    cols.pop('reach100', None); cols['reach100k'] = [None if np.isnan(v) else int(round(v / 1000)) for v in rc]   # thousands
    cols['reach_pct'] = [None if np.isnan(v) else int(round(float(v))) for v in pct(rc)]
    dm = dom150[s:s + n]
    cols['dom150_pct'] = [None if np.isnan(v) else int(round(float(v))) for v in pct(dm)]
    r3 = reach300[s:s + n]
    cols['reach300k'] = [None if np.isnan(v) else int(round(v / 1000)) for v in r3]
    cols['reach300_pct'] = [None if np.isnan(v) else int(round(float(v))) for v in pct(r3)]
    cols['flat_pct'] = [None if np.isnan(v) else int(round(float(v))) for v in pct(rel, higher=False)]
    # household site measures (2.11), computed here so the browser only reads them: climate (mild and sunny), services
    # nearby, city scale, climate exposure (estimate); 0-100 each
    KG = {'Csb': 100, 'Csa': 95, 'Cwb': 80, 'Cfa': 75, 'Cfb': 72, 'Csc': 70, 'Cwa': 70, 'BSk': 70, 'BSh': 65, 'Aw': 60, 'As': 60, 'Dsa': 60, 'Af': 55, 'Am': 55, 'Dsb': 55, 'BWk': 50, 'Cwc': 50,
          'Cfc': 45, 'BWh': 45, 'Dfa': 45, 'Dwa': 40, 'Dfb': 35, 'Dwb': 30, 'Dsc': 20, 'Dfc': 15, 'Dwc': 12, 'Dfd': 5, 'Dwd': 5, 'ET': 5, 'EF': 0}
    HEAT = {'BWh': 35, 'BSh': 25, 'Aw': 25, 'Am': 20, 'Af': 20, 'Csa': 10, 'BWk': 15, 'BSk': 10, 'Cwa': 10, 'Cfa': 8}
    d = json.load(open(os.path.join(ROOT, 'data', 'c', cc + '.json'))); DC = d['cols']; iPop = DC.index('pop')
    coast = d.get('fr', {}).get('geo_coast_km') or [None] * n
    cl, sv, ci, cr = [], [], [], []
    lsc = lambda v: max(0.0, min(100.0, (math.log10(v) - 4.301) / (6.176 - 4.301) * 100))
    for i in range(n):
        kg = strs[cols['kg'][i]] if cols.get('kg') and cols['kg'][i] is not None else None
        lat = la[i]; p10 = cols.get('pop10', [None] * n)[i]; alt = cols.get('alt', [None] * n)[i]; rv = cols.get('river_km', [None] * n)[i]; ck = coast[i]
        if kg in KG and not np.isnan(lat):
            declination = -23.44 if lat >= 0 else 23.44  # Local winter solstice, in degrees.
            dl = 24 / math.pi * math.acos(max(-1, min(1, -math.tan(math.radians(lat)) * math.tan(math.radians(declination)))))
            cl.append(int(round(0.75 * KG[kg] + 0.25 * max(0, min(100, (dl - 6) / 4.5 * 100)))))
        else: cl.append(None)
        sv.append(int(round(max(0, min(100, (math.log10(p10) - math.log10(3000)) / (math.log10(60000) - math.log10(3000)) * 100)))) if p10 else None)
        ci.append(int(round(0.5 * lsc(p10) + 0.5 * lsc(max(1, d['rows'][i][iPop] or 1)))) if p10 else None)
        if kg or alt is not None:
            rk = 0
            if alt is not None and ck is not None and alt < 10 and ck < 5: rk += 45
            elif alt is not None and ck is not None and alt < 25 and ck < 10: rk += 20
            if rv is not None and rv < 1: rk += 25
            elif rv is not None and rv < 3: rk += 10
            rk += HEAT.get(kg, 0); cr.append(max(0, 100 - rk))
        else: cr.append(None)
    # services and city scale are one-line formulas on pop10 in the engine; only the table-based measures ship (US file < 20 MiB)
    cols.pop('services_s', None); cols.pop('city_s', None)
    cols['climate_s'], cols['climrisk_s'] = cl, cr
    json.dump(x, open(p, 'w'), separators=(',', ':'), ensure_ascii=False)
print('reach and inland ports added for', len(shards), 'countries;', len(PORTS), 'inland ports')
