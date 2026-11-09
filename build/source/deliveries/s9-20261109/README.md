# Nestlyzer open-data delivery, 8 November 2026

This is a **partial delivery**, not completion of the eight-section request. The highest-priority GEM nuclear-unit and EEA v16 facility payloads were not acquired. Their CSV files contain headers only and their coverage counts are zero.

## What changed

- **1,722 new numeric observations** from Bern's official end-2025 population table, at census-quarter level. The transcription covers **292 published quarter codes**; **30 dash-marked cells** remain separately held, rather than becoming invented zeros. These smaller units are not the 32 statistical districts and no boundary polygons are supplied.
- **210 existing Bern observations have their source-version hold resolved**: 192 observations for 32 statistical districts and 18 for six Stadtteile. The current table and its eight page images agree on 31 December 2025. The dated 27 January 2026 report corroborates the citizenship totals. The 96 duplicate report observations remain evidence, not new rows. All previous 2024 data stay separate.
- Bern's 690-person non-geographic collective household remains outside district totals. No city total is forced onto mapped districts.
- **10,448 relevant observations are retained from earlier deliveries**, with their existing IDs and periods. They are not new acquisition. This includes the already delivered Canada migration increment.
- Existing Budapest coverage is **187 housing-transaction facts across all 23 districts**, reference year 2024. It is not empty. Those facts are sale-price means, transaction counts and dispersion, not rental medians or a complete profile.
- Existing cantonal coverage reaches all **26 cantons with 67 partial statutory facts**. It does not provide every requested parameter, current profit/capital rate or lump-sum minimum. Exact missing canonical fields were filled from existing benefit_type/reference_period fields, without inventing values.

## Files and import rules

`data/` has one CSV per acquired subset, plus clearly empty payload files for unacquired sections. `sources.csv`, `licences.csv`, `coverage.csv` and `held.csv` distinguish permission, acquisition, geography and completeness. `evidence/` contains new exact numerical transcriptions, code-only linkage checks, a row-level Bern resolution ledger, and unchanged prior-submission archives. The prior archives are assistant-prepared evidence/transcriptions, **not newly downloaded publisher files**. No new publisher binary is claimed.

Use `collection_origin` and `new_in_this_delivery` to separate new, resolved and retained content. Upsert resolved Bern records by their existing record_id. Consult `evidence/audit/bern_resolution.csv` before replacing a hold. Never append the 96 corroborating duplicate facts. Do not overwrite the 2024 vintage merely because an undated source URL now serves 2025. Review source definitions before scoring. All publication and scoring flags remain false; this package does not deploy anything.

## What is still missing

1. Global GEM reactor units, all requested GEM industry payloads, EEA v16 facility data and EPA facility lists.
2. Zone coordinates/polygons and the wider requested-zone inventory. The prior 33 rows are policy facts, not 33 distinct mapped sites. India ministry-list data remain excluded.
3. A complete 26-canton tax matrix, lump-sum taxation minima and acquired BFS municipal household tax-burden values. Located BFS metadata refers to tax year 2024, not 2026 all-municipality rates.
4. Passport destination lists for all 63 repository jurisdictions and complete residence-route coverage. The retained 43 route facts, including EU Blue Card participation, are not 43 complete routes.
5. Complete boundaries, rent/income, services, safety and two-date age bundles for every requested city. Munich's 75 candidate observations remain held; the licensed 2024 alternative does not clear the 2025 PDF.
6. HDB-to-URA equivalence or a reproducible official-boundary overlay. All 160 HDB medians remain held. Do not transfer medians across partially overlapping areas. The 152 original missing/suppression markers are preserved separately.
7. Complete 5-10 year regional migration panels; actual EuroGeographics boundary payloads; OMI commercial reuse clearance or replacement; codes/coordinates for all 209 unresolved UNESCO learning cities.

## Licence decisions

Only Green rows enter main data. Yellow/Red sources and unresolved geography stay out. Bern's city OGD terms and the exact opendata.swiss resource identify open use; the national terms explicitly include commercial reuse. Attribution remains mandatory under the city terms. This is not an application of the BFS federal policy to municipal publications. GEM tracker CC BY 4.0 is not extended to GEM.wiki's non-commercial content. EuroRegionalMap rights are not extended to EuroBoundaryMap. The retained licence evidence was not all rechecked during this turn; `licence_rechecked_this_delivery` identifies the distinction.

## Validation

63,810 mechanical checks passed, covering mandatory main-row metadata, licence gates, source keys, IDs, Bern arithmetic, parent-code grouping, duplicate prevention and unchanged inputs. These tests are not external assurance, a complete data-quality review or legal clearance. Run `python tools/validate_delivery.py` after extraction for archive-integrity and core CSV checks.
