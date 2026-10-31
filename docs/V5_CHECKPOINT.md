# V5 integration checkpoint (phase 1: compatibility and evidence panel)

Date: 31 October 2026. Base: Nestlyzer 2.11.4 (local build). Nothing deployed, nothing pushed.

| Item | State |
|---|---|
| Commit | No Git repository in the workspace; the source zip `nestlyzer-repo-2.11.4.zip` is the checkpoint. Live site checked read-only: 2.11.2 deployed, the upload files match, plus 485 leftover files from older uploads |
| Application inventory | 45 countries in the residential selector (unchanged), 48 profiles (24 household, 22 business, guided fit, digital native), 264 factors, scoring methods v1 (legacy, 49 fixtures exact) and v2 |
| Stores and persistence | Browser only: shortlist, profile, filters and consent in localStorage; OSM fetcher progress in IndexedDB (`nz-osm`, tools page only). No server state, no API key in client code |
| Site bytes | Upload folder 90 files, 109.3 MB, largest file under 20 MiB; start page 119.03 KB compressed |
| Files changed (this phase) | `src/more/more.js` (evidence panel), `src/js/30-ui.js` (rank tooltip), `tests/test_v210.py` (opens folded groups before reading), version files |
| Descriptors | Every context figure now carries: what it is, why it matters for the profile in focus, period, area, basis and publisher (popup on tap or hover) |
| Evidence panel (V5 "finish first") | Done: key figures for the profile first (local before national, at most 8), everything else under "More figures: nice to know"; quartile sets shown as one row (median, middle-half range bar, comparison); verdict in words for the profile |
| Reviewed data | None imported. The V5 kit and vault archives were not attached (only the documentation and three CSVs), so `inventory_current.py`, `evidence_selector.mjs` and `score.py` were not run |
| Unapproved rows | 759 PISA observations and 521 exact 3/5/10-year windows are held back: V5 marks them unapproved, so they are not published |
| Profile coverage | Unchanged from 2.11.3: 46 profiles with written needs, 13 with dislikes; profile audit at its limit (15 weak core needs) |
| Comparison model | Already in line with V5 COMPARABILITY: scores rank within a country; cross-country standing only in the world rankings; national constants not scored; no compound growth rates; a missing figure is never treated as bad |
| Model differences | None introduced in this phase (scores unchanged, benchmark unchanged) |
| Tests | Full chain green: 2.10 51/51, 2.10.3 18/18, 2.11 26/26, regression 71/0, profile audit pass, legacy fixtures 49/49, flat 4/4, live simulation 17/17 |
| Hosting decision | Owner's: GitHub Pages terms on commercial use (the site shows ads) and its size limits. The data vault stays outside Git |

Next phase needs: the V5 integration kit and vault archives, then staging of approved rows only, with `score_eligible=false` for new records.
