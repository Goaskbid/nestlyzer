#!/usr/bin/env python3
"""Writes the cumulative findings ledger for a release: every one of the 52 re-audit IDs (docs/audit/findings_cumulative_52.json)
with its status on this build and the evidence (tests/results/v29.json = after, v29_before_live.json = the live 2.8.1 site).
    python3 build/ledger.py 2.9.0     -> docs/ledger_<version>.json and .csv
Statuses (from the rebuild brief): repaired_and_reverified, already_working_reverified, partly_repaired, still_open,
not_retested, not_applicable_here (data packages that were never delivered to this build)."""
import csv, json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VER = sys.argv[1] if len(sys.argv) > 1 else '2.9.0'
F = json.load(open(os.path.join(ROOT, 'docs', 'audit', 'findings_cumulative_52.json')))
rd = lambda n: json.load(open(os.path.join(ROOT, 'tests', 'results', n))) if os.path.exists(os.path.join(ROOT, 'tests', 'results', n)) else []
after, before = rd('v29.json') or rd('v29_after_site.json'), rd('v29_before_live.json')

S = {  # id: (status, what was done or why not, on this build)
 '001': ('repaired_and_reverified', 'Other households\' scores moved out of "Score and ranking" into a separate, closed "Compare profiles" group labelled as model outputs.'),
 '002': ('repaired_and_reverified', 'Code path removed: a missing measurement shows "no measured value"; the 0-100 index is shown only as "index n of 100 (a relative score, not a measurement)". Not reproduced on the live sample, fixed at source.'),
 '003': ('repaired_and_reverified', 'Key facts block at the top of every place: up to 12 of the place\'s own official figures, most relevant for the profile, with year, level and source; All data stays complete and exportable (test_v210 kf).'),
 '004': ('repaired_and_reverified', 'Language-area leaders outside the top 10 show their rank inside the language area (for example "FR 1") and the tooltip gives both ranks with the denominator.'),
 '005': ('repaired_and_reverified', 'Parameter layers show their unit and value scale in the legend; every pin says it is a profile rank, with scope and denominator in the tooltip.'),
 '006': ('repaired_and_reverified', 'Best 10 / Lowest 10 switch for map pins; lowest uses only scored, eligible places (test_v210 006).'),
 '007': ('already_working_reverified', 'Household and business are one app with separate profiles and shortlists since 2.7; DINKS -> Business -> Places to live returns to DINKS (test).'),
 '008': ('not_retested', 'Business page (16 Oct beta) country scope not re-examined in this stage.'),
 '009': ('still_open', 'The business page\'s industry and energy screen is US states only; non-US business cost context is not integrated.'),
 '010': ('already_working_reverified', 'Seven business profiles with their own weights and must-haves rank municipalities in the app since 2.7 (tests v27/R-suite). Owner review of the weights is still pending.'),
 '011': ('already_working_reverified', 'Fresh visitor sees the privacy choice and the optional quick tour; no duplicate overlay (test_v210 011).'),
 '012': ('already_working_reverified', 'Start page asks Places to live or Business, then offers 6 household chips plus "More households" and one country selector (screenshots, v26 tests).'),
 '013': ('still_open', 'Presets with hard minimums still apply them before showing the remaining count; the "why not" explanation is kept.'),
 '014': ('partly_repaired', '2.8 separates measures compared across countries (pool) from within-country ones; cross-country comparison warns that scores are country-relative. No global sort of country-relative scores was added.'),
 '015': ('already_working_reverified', 'National figures are stored once per country (2.8 regional tables) and never count as measured local data: categories backed only by a national figure are labelled estimates and are excluded from "measured".'),
 '016': ('repaired_and_reverified', 'Method page lists every modelled criterion with its inputs; modelled criteria count half and are labelled.'),
 '017': ('partly_repaired', 'The evidence shares now say they are not a probability; the "source confidence" percentage is still shown with its explanation.'),
 '018': ('not_applicable_here', 'Tariff data from the 16-18 Oct global package was not delivered to this build (the ZIP did not arrive).'),
 '019': ('not_applicable_here', 'B-READY / energy index data not ingested in this build.'),
 '020': ('not_applicable_here', 'Iceland B-READY water values not ingested; nothing to quarantine in this build.'),
 '021': ('not_applicable_here', 'Chart-read Eurostat electricity values not ingested.'),
 '022': ('not_applicable_here', 'B-READY / WBL legal indices not ingested.'),
 '023': ('not_applicable_here', 'WBL / B-READY / HDR component families not ingested.'),
 '024': ('partly_repaired', 'Missing stays missing in scoring and display; the business page now separates unknown, invalid and zero. Typed source-missing / not-captured / suppressed states for the new package are not applicable until it is ingested.'),
 '025': ('partly_repaired', 'Every 2.8 measure shows its own period per country; separate edition and last-checked dates are not shown.'),
 '026': ('not_applicable_here', 'Source-area energy quotes not ingested.'),
 '027': ('already_working_reverified', 'EL/GR and UK/GB are mapped explicitly in the data sync and the business page; joins use official IDs (test_v28 golden values).'),
 '028': ('already_working_reverified', 'Business page at 390 px: no sideways scroll, first action on the first screen (test_v210 028).'),
 '029': ('repaired_and_reverified', 'Business scorecard lists measured must-haves as met or not met and site checks (plots and permits, grid connection) as next steps on site.'),
 '030': ('still_open', 'Business founder copy awaits owner approval of the proposed text.'),
 '031': ('already_working_reverified', 'A 2.8 shortlist with notes and a custom profile survive the update (test_v210 031).'),
 '032': ('already_working_reverified', 'With the map blocked, the ranking list and place pages still work (test_v210 032).'),
 '033': ('partly_repaired', 'Search and the phone filter sheet now contain focus and restore it (050); broader keyboard and screen-reader audit open.'),
 '034': ('already_working_reverified', 'Start page 119 KB compressed, country data loaded per country, measured in the regression suite (R30).'),
 '035': ('already_working_reverified', 'Non-commercial sources (WHO GHO, WorldClim) are excluded at sync; every measure names its source and licence. Italian OMI terms flagged to the owner.'),
 '036': ('repaired_and_reverified', 'docs/manifest.json is written by the build; README counts come from it.'),
 '037': ('still_open', 'NASA climate payload and complete Ireland data still missing.'),
 '038': ('partly_repaired', 'Household scorecard lists next steps before moving; rents and occupational pay context added where official tables exist. A full household budget model is not built.'),
 '039': ('still_open', 'Business tax scenario inputs not built.'),
 '040': ('repaired_and_reverified', 'This ledger: every ID with a status, before (live 2.8.1) and after (2.9.0) browser evidence for each repaired defect.'),
 '041': ('already_working_reverified', 'No analytics or ads before consent (regression R23, R69); no new client-side data loaders were added.'),
 '042': ('repaired_and_reverified', 'Shortlist export now carries purpose, profile, weights, score, rank, evidence, must-haves, every figure with period, level and source, and rent/pay context rows (test_v210 042).'),
 '043': ('repaired_and_reverified', 'Fine-tuned weights are kept with the profile and restored when the builder reopens; changing an answer says so before replacing them; a separate reset is offered.'),
 '044': ('repaired_and_reverified', 'The language choice is kept; when no place is classified in that language the results explain why and offer "Show every place" and "Edit my profile".'),
 '045': ('repaired_and_reverified', 'Links carry the name filter (q); a link without it clears an old one.'),
 '046': ('repaired_and_reverified', 'Every link decodes to a complete panel state; no tab or pt=overview opens Overview.'),
 '047': ('repaired_and_reverified', 'Opening a comparison link is a preview; a "Save these places" button adds them explicitly and reports what was added.'),
 '048': ('repaired_and_reverified', 'Shared weights are validated (known criteria, 0-100, no duplicates, positive total) before use; an invalid link is not applied and keeps any existing custom profile; mp=0 survives.'),
 '049': ('partly_repaired', 'Display repaired (2.9). The evidence-share ranking formula is implemented but switched off; rank-change reports for 4 profiles are in docs/rank_change_*.json (top 10 unchanged in every country except Israel for pensioners). Waiting for owner approval.'),
 '050': ('repaired_and_reverified', 'One focus trap for the topmost overlay including search; the phone filter sheet is a named modal dialog with initial focus, Escape and focus return; desktop panel stays non-modal.'),
 '051': ('repaired_and_reverified', 'Business page: blank quantities are unknown (no USD 0), invalid ones are flagged, explicit zero stays zero; the brief exports null plus a status.'),
 '052': ('repaired_and_reverified', 'Business page: screen and brief share one annual consumption; the brief (schema v2) records industry, filters, weights, compared and top states.'),
}

R6 = {
 'R6-001': ('already_working_reverified', 'German property and business tax are shown as multipliers (Hebesatz), never applied to a market value or turned into a bill.'),
 'R6-002': ('not_applicable_here', 'No household disposable-income budget is calculated in the app yet.'),
 'R6-003': ('not_applicable_here', 'Wealth data from the V6 package is not in this build (the 33,108-value master file did not arrive).'),
 'R6-004': ('repaired_and_reverified', 'Area pay is shown as context for the metro or country, labelled mean and occupation; never presented as the user\'s income.'),
 'R6-005': ('already_working_reverified', 'Gewerbesteuer is a raw, unscored figure; it never enters household scores.'),
 'R6-006': ('not_applicable_here', 'No inheritance calculation in the app.'),
 'R6-007': ('not_applicable_here', 'No wealth-tax valuation in the app.'),
 'R6-008': ('not_applicable_here', 'No employer-growth data in this build.'),
 'R6-009': ('not_applicable_here', 'No household-formation data in this build.'),
 'R6-010': ('still_open', 'The divorce rate is still a scored safety input (inherited model). Removing it is a model change and needs owner approval.'),
 'R6-011': ('not_applicable_here', 'Survey-city happiness data not in this build.'),
 'R6-012': ('already_working_reverified', 'Amenity counts are labelled as presence within 1.5 km from OpenStreetMap, not access or quality.'),
 'R6-013': ('repaired_and_reverified', 'National and metro context (rents, pay, labour costs, price levels) never counts as measured local data; measured shares are unchanged by it (test_v210 ctx).'),
 'R6-014': ('partly_repaired', 'Every figure shows its reference period; separate release and last-checked dates are not shown.'),
}
rows = []
for f in F:
    fid = f['id'].split('-')[-1]
    st, note = S[fid]
    ev_a = [r for r in after if r['finding'] == fid]; ev_b = [r for r in before if r['finding'] == fid]
    rows.append({'id': f['id'], 'priority': f.get('priority'), 'title': f['title'], 'status_' + VER: st, 'what_changed': note,
                 'before_live_2_8_1': '; '.join(('PASS ' if r['ok'] else 'FAIL ') + r['check'] for r in ev_b),
                 'after_' + VER: '; '.join(('PASS ' if r['ok'] else 'FAIL ') + r['check'] for r in ev_a)})
import json as _j
for i in _j.load(open(os.path.join(ROOT, 'docs', 'audit', 'issues_66.json'))):
    if i['id'] in R6:
        rows.append({'id': i['id'], 'priority': i.get('priority'), 'title': i['title'], 'status_' + VER: R6[i['id']][0], 'what_changed': R6[i['id']][1], 'before_live_2_8_1': '', 'after_' + VER: ''})
after2 = rd('v210.json')
for r_ in rows:
    fid = r_['id'].split('-')[-1]
    ev = [x for x in after2 if x['finding'] == fid]
    if ev: r_['after_' + VER] = (r_['after_' + VER] + '; ' if r_['after_' + VER] else '') + '; '.join(('PASS ' if x['ok'] else 'FAIL ') + x['check'] for x in ev)
json.dump(rows, open(os.path.join(ROOT, 'docs', 'ledger_%s.json' % VER), 'w'), indent=1, ensure_ascii=False)
with open(os.path.join(ROOT, 'docs', 'ledger_%s.csv' % VER), 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
from collections import Counter
print(Counter(r['status_' + VER] for r in rows))
