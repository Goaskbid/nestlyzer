# Nestlyzer: official local data and Swiss tax replacement

Prepared 2 November 2026 against the uploaded 2.13.1 repository.

## Status

This is an executable acquisition and integration handoff, not a completed data refresh. Container network access prevented national source downloads and calculator requests. **New official observation rows acquired in this run: 0. Production files changed: 0.** The source documentation was researched, the supplied application was inspected, and the parsers and safeguards passed 74 offline fixture tests. Live schemas and calculator behaviour still require validation.

Do these two workstreams. Preserve the existing visual design. Do not spend this release on more Insights pages.

1. Acquire official local observations for France, the US, Canada, Australia, Brazil and Mexico, reconcile their geographies, and make approved measures available to the scoring build.
2. Obtain all six Swiss tax scenarios from the official calculator for one complete validated year, reconcile every existing Swiss place, then retire the 2018 inputs from current scoring in an atomic release.

## An important denominator correction

The application has 2,172 active Swiss place records. Switzerland had 2,172 municipalities on 1 January 2021 and 2,110 on 1 January 2026, according to BFS. A fixed 2,172-row request is therefore not a current official commune roster. The extractor fetches the selected tax year's official roster and checks the proposed 2021 baseline against the application codes.

Account for all 2,172 application places through unchanged entities, reviewed successors, explicit historical aliases, splits or unresolved boundaries. Do not present a merged-away commune as an independent current tax authority. A point inside a municipality proves containment, not matching boundaries.

Sources: https://www.swissstats.bfs.admin.ch/data/webviewer/appId/ch.admin.bfs.swissstat/article/issue21000252100-27/package ; https://statistik.admin.ch/de/asset/36390081

## Run the pack

Use a network-enabled development environment, not the public browser. Python 3.10 or newer is required. The optional Parquet dependency is needed for the default French downloader; the CSV ZIP parser uses the standard library.

```bash
# Run inside this extracted pack directory.
python -m pip install -r requirements.txt
python -m unittest test_pipeline -v

# Set these two paths to the actual repository and a NEW work directory.
REPO=/path/to/nestlyzer-2.13.1
WORK=/path/to/nestlyzer-data-2026-11-02
python run_pipeline.py --repo "$REPO" --work "$WORK" \
  --countries FR,US,CA,AU,BR,MX --swiss --tax-year latest
```

Each country runs independently. The process returns a failure if any acquisition fails. Read `run_status.json` and the country logs. Successful tables can remain staged even when another table fails. Never interpret partial files as a successful national refresh.

`latest` means the latest supported calculator year, not proof of complete coverage. Use the most recent year that passes all coverage and scenario checks. Never combine years to fill holes. Source download dates are not observation dates.

Stage completed canonical files in the disk-backed store:

```bash
# Run only for a file whose acquisition has completed successfully.
python nz_integrate.py stage --db "$WORK/observations.sqlite" \
  "$WORK/stage/FR/FR_observations.csv.gz"
python nz_integrate.py report --db "$WORK/observations.sqlite"
```

Repeat staging for the successful country and Swiss observation files. Do not stage `CH_alias_review.csv`, status reports or the task queues: those are not observations.

## Deliverables already prepared

- `nz_countries.py`: six official-source adapters with native codes, reference periods, units and missingness. France long-form CSV/Parquet; US table-based five-year ACS; Canadian census subdivisions; Australian LGA data; Brazilian N6 municipality aggregates; Mexican municipal ITER totals.
- `nz_swiss.py` and `03_scenarios.json`: official-calculator request adapter, six explicit proposed households, BFS snapshots/correspondences, component accounting, coverage and version checks. The interface contract comes from an unofficial client and has not been live-tested here.
- `nz_core.py`, `nz_integrate.py`: raw receipts, stable identities, streaming conversion, SQLite staging, bounded native-import export and country-neutral evidence checks.
- `08_guardrails.patch`: positive publication approval, rejection of nonfinite values, no fuzzy automatic deduplication, reviewed geographic mapping required for this pack.
- `05_CH_2172_scenario_tasks.csv.gz`: 13,032 pending tasks from the actual application roster, 2,172 places times six scenarios. **No tax values.**
- `06_place_crosswalk_queue.csv.gz`: 66,271 existing active places across the seven countries. **No official crosswalk has been approved.**
- `04_country_baseline.csv`: exact active-place counts and core-file hashes. `02_indicator_contracts.csv` has 61 source selectors/rules, not 61 comparable independent scoring factors.

## Implementation still required

Read `09_implementation.md`. This pack does not replace the JavaScript scoring engine, generate approved polygon crosswalks, approve tax assumptions, or deploy the site. The existing master importer publishes context only. Merely importing its CSV output does not lift a place out of thin evidence.

After acquisition, implement explicit native-measure-to-factor mappings, correct denominators, source freshness by purpose, approved boundary mappings and the same profile-evidence policy for every country. Census structure can fill substantial gaps; it cannot establish current rents, childcare vacancies or parcel permitting. Keep unqualified places searchable without an evidence-qualified fit rank.

Deliver a report containing downloaded and rejected rows, official native geographies, approved exact matches, wider-area context, unmatched places, covered evidence domains, score eligibility and ranking differences. Count these separately. Never present source-column counts, task rows or suppressed observations as newly supported profile evidence.

For tax retirement, require all checks in `07_release_gates.json`, plus independent official-calculator UI comparisons. Preserve 2018 as historical data. Remove its scoring role only when the replacement release passes, with a rollback manifest.
