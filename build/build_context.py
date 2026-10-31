#!/usr/bin/env python3
"""Country and business context for the app (data/context.json) and the Business Beta page.

Inputs, all kept in build/source/ with their provenance:
  business/business_beta_payload_2026-10-16.json  the data object of the supplied Business Beta (16 Oct 2026):
        World Bank WDI table 4.2 (GDP, value added by sector), V-Dem v16 institution indices with their SD,
        BLS CES state payroll jobs (June 2026), EIA state electricity prices (July 2026), corporate-tax rules,
        funding routes, agency contact routes, cluster references and the source registry.
  tax/taxfoundation_itci_raw_2014_2025.csv          Tax Foundation, International Tax Competitiveness Index data
        (github.com/TaxFoundation/international-tax-competitiveness-index, commit in taxfoundation_itci_commit.txt),
        compiled from OECD and national sources. Used: personal top rate and its threshold, capital gains and
        dividend rates, the combined corporate rate, wealth, inheritance and property-transfer tax flags.

Rules (from docs/BUSINESS_BETA_BRIEF_2026-10-16.md): every value keeps its own period, unit and source; nothing is
summed into an "effective burden"; missing stays missing; nothing here changes a score. EL and UK are the app's
codes for Greece and the United Kingdom (GR and GB in the sources)."""
import csv, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', 'source')
TO_APP = {'GR': 'EL', 'GB': 'UK'}
ITCI_FIELDS = {
    'top_income_rate': ('Top personal income tax rate (incl. average local rates)', 'percent', 100),
    'threshold_top_income_rate': ('Top rate starts at this multiple of the average wage', 'x average wage', 1),
    'capital_gains_rate': ('Top tax rate on capital gains', 'percent', 100),
    'dividends_rate': ('Top tax rate on dividends', 'percent', 100),
    'corporate_rate': ('Combined corporate income tax rate', 'percent', 100),
    'net_wealth': ('Net wealth tax', 'flag', 1),
    'estate_or_inheritance_tax': ('Estate, inheritance or gift tax', 'flag', 1),
    'transfer_tax': ('Tax on buying property (transfer tax)', 'flag', 1),
}


def main():
    meta = json.load(open(os.path.join(ROOT, 'data', 'meta.json')))
    ours = {c['cc'] for c in meta['countries']}
    bb = json.load(open(os.path.join(SRC, 'business', 'business_beta_payload_2026-10-16.json')))
    out = {'v': bb['as_of'], 'note': 'Country and state context. Each value has its own period and source. Not used in any score.',
           'sources': {}, 'countries': {}, 'states': {}, 'industries': bb['industries']}
    src_used = set()
    for c in bb['countries']:
        cc = TO_APP.get(c['code'], c['code'])
        if cc not in ours: continue
        o = out['countries'].setdefault(cc, {})
        o['economy'] = {k: v for k, v in c['metrics'].items() if v is not None}
        for v in o['economy'].values(): src_used.add(v['source_id'])
    for r in bb['tax_rules']:
        cc = TO_APP.get(r['country_code'], r['country_code'])
        if cc not in ours: continue
        out['countries'].setdefault(cc, {}).setdefault('tax_rules', []).append({k: r[k] for k in ('name', 'rate_percent', 'scope', 'conditions', 'source_url', 'observed_at', 'effective_from')})
    for f in bb['funding']:
        for cc0 in f['countries']:
            cc = TO_APP.get(cc0, cc0)
            if cc in ours and f['status'] in ('programme_available', 'statutory_scheme'):
                out['countries'].setdefault(cc, {}).setdefault('funding', []).append({k: f[k] for k in ('name', 'status', 'status_verified_at', 'conditions', 'source_url')})
    # Tax Foundation ITCI: the latest year per country
    rows = list(csv.DictReader(open(os.path.join(SRC, 'tax', 'taxfoundation_itci_raw_2014_2025.csv'))))
    latest = {}
    for r in rows:
        cc = TO_APP.get(r['ISO_2'], r['ISO_2'])
        if cc in ours and (cc not in latest or int(r['year']) > int(latest[cc]['year'])): latest[cc] = r
    commit = open(os.path.join(SRC, 'tax', 'taxfoundation_itci_commit.txt')).read().strip()
    for cc, r in latest.items():
        t = {}
        for k, (label, unit, mul) in ITCI_FIELDS.items():
            v = r.get(k)
            if v in (None, '', 'NA'): continue
            v = float(v)
            t[k] = {'label': label, 'unit': unit, 'value': round(v * mul, 2) if unit != 'flag' else v, 'period': r['year'], 'source_id': 'TF_ITCI'}
        out['countries'].setdefault(cc, {})['taxes'] = t
    out['sources']['TF_ITCI'] = {'provider': 'Tax Foundation', 'title': 'International Tax Competitiveness Index, raw data',
                                 'url': 'https://github.com/TaxFoundation/international-tax-competitiveness-index', 'commit': commit,
                                 'notes': 'Compiled by the Tax Foundation from OECD and national sources; rates are statutory (top marginal), not average burdens. OECD members only.'}
    for s in bb['states']:
        if s['code'] in ('PR', 'VI'): continue
        out['states'][s['name']] = {'code': s['code'], 'jobs': s['jobs'], 'lq': s['lq'], 'power': s['power'], 'employment_period': s['employment_period'],
                                     'electricity_period': s['electricity_period'], 'reference_scope': s['reference_scope']}
    src_used |= {'BLS_CES_STATE_202606', 'EIA_MONTHLY_202607'}
    for s in bb['sources']:
        if s['source_id'] in src_used:
            out['sources'][s['source_id']] = {k: s.get(k) for k in ('provider', 'title', 'source_url', 'licence', 'notes')}
    p = os.path.join(ROOT, 'data', 'context.json')
    json.dump(out, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
    have = {k: sorted(cc for cc, o in out['countries'].items() if k in o) for k in ('economy', 'taxes', 'tax_rules', 'funding')}
    print('context.json', os.path.getsize(p), 'bytes;', {k: len(v) for k, v in have.items()}, 'states', len(out['states']))
    print('no ITCI data (not OECD members):', sorted(ours - set(have['taxes'])))


if __name__ == '__main__':
    main()
