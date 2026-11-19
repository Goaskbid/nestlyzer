# Nestlyzer rental collection: first code-matched batch

As of 18 November 2026. One ZIP, one topic: rents. This is a data staging delivery, not an application release.

## Actual result

- 425 Portuguese official rental values transcribed from INE API 0012600 for 2024: 212 municipalities, 174 parishes, 39 national/regional areas.
- 174 parish values match the supplied Nestlyzer IDs by code. `template_rent.csv` uses the exact 16-column template header.
- 5 Swiss regional/national reference values are retained separately in `held_CH_rent.csv`; no Swiss municipal observations are claimed.
- No Spanish numeric records and no unchanged original publisher files were obtained.

**Strict brief requirement not met:** the brief requires unchanged original downloads. The network could display some official data as text, but could not save original JSON/XLS files. These are explicitly labelled numerical transcriptions, not original downloads. Stage privately; do not silently treat this delivery as publication-approved.

## Relevant findings

1. Portugal's 3,092 roster rows are parishes. Do not call them municipalities or copy parent rents into local fields.
2. Accessible INE series 0012600 is superseded. Preserve 2024 as historical data and investigate successor 0014698 before selecting a current value.
3. The exact Swiss rent resource declares `terms_by_ask`: commercial use requires permission. Generic Swiss open-data branding is not sufficient.
4. The rent template's CH:261 value 22.1 is illustrative and has been excluded.
5. The pack's 147,063 rows are not an active-place registry. It contains no active/superseded flag. Integrate against the current app's explicit identity/vintage rules.

## Files to use

`template_rent.csv`: 174 matched historical parish candidates. `source_areas_PT.csv`: all 425 distinct source values, including those 174; do not double count them. `join_ledger_PT.csv`: every Portuguese roster row, with precise match status. `record_provenance.jsonl`: publication and scoring holds for every matched record.

`TRANSCRIPT_PT.txt` holds exact code/value pairs. `METADATA_PT.json` and `EVIDENCE.json` are selected-field transcriptions, not original HTTP responses. `SOURCES.csv`, `FINDINGS.csv`, `GAPS.csv` and download receipts retain unresolved work. `PT_keys.csv` is unchanged from the user's pack.

Run `python rent_tools.py verify --root .` and `python -m unittest -v test_rent_tools.py`. Verification checks file/schema integrity and source-value consistency; it does not manufacture the missing originals, validate all model weights or establish present-day geography.

Read `CLAUDE.md` for staged integration. Do not deploy or add the raw acquisition warehouse to the public site.

Counts describe this source extract and its code matches. They are not a claim of 174 newly filled production gaps; compare with existing app observations before counting additions.
