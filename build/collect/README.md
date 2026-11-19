# One-time collection of official source files

`acquisition_plan.json` lists 31 official files (Eurostat, INE Portugal, CNAF, INSEE, CBS, US Census, data.gov.my and
publisher landing pages) plus snapshots of the live site. `collect_once.py` (from the 19 Nov 2026 access audit, stdlib
only) downloads each once, checks that it is real data and not an error page, records hash, size, headers and licence
status, and never changes the website or scores.

The workflow `.github/workflows/nz-collect-once.yml` runs it once after a release is published and saves the results on the
branch `data-intake-<plan hash>`. That branch is not part of the website. A plan that was already collected is not
collected again. Files over 95 MB are dropped (GitHub limit) and listed in the run summary.
