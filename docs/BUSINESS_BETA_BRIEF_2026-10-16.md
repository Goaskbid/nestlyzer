# Nestlyzer: integrate the preloaded residential data and Business Beta

Release: 16 October 2026. Use the files, not a reconstructed version of this brief.

## 1. What has actually been delivered

The SQLite warehouse contains the complete native place roster and original country payloads recovered from the owner's uploaded standalone app, in tables separate from external observations. It also contains new source-backed economic, political-institution, business-environment, US state employment and electricity observations, plus retained observations from the prior pack. `reports/build_counts.json` is the authoritative count. Original app data and duplicate CSV/JSON exports are not new observations.

The business page is a self-contained working HTML application. It has no mandatory external service, paid API, account, build framework or server-side profile. It compares captured country data; screens US states using industry jobs, location quotients and industrial electricity prices; shows tax rules, institutional contacts, funding statuses and cluster references; and exports a company requirements brief. It does not certify site suitability, available workforce, premises, grid capacity, tax eligibility or an incentive award.

New collection is based on readable published tables. It is not represented as successfully downloaded API payloads. The available official APIs and original producers are documented for refresh. The release is useful now, but is not complete municipal coverage across all fields and all 45 countries.

## 2. Preserve the actual app

The reviewed source is `index - 2026-10-15T094014.561.html`, SHA-256:
`3367764250d7b7ba456c329b34871994a5011dacaee6422fbeec73c711c4121b`.

The source contains an `nz-pack` JSON object mapping asset paths to MIME type, gzip flag and base64 bytes. The extractor recovers the actual data, not HTML display snippets. The native loader reads `/data/c/{CC}.json` and `/data/x/{CC}.json`. Country shards use `cols`, `rows`, `fr` and `fs`.

Keep the existing framework, hydration, country selector, Swiss data, ranking engine, eligibility logic, row order, official IDs, maps, profile settings, favourites and consent controls. `EL` and `UK` are native country codes; external `GR` and `GB` must be mapped explicitly.

Do not overwrite a newer deployment with the supplied patched baseline. Rebase its small changes onto the current revision after comparing hashes. Do not replace the original `index.html` with the business page, a manifest, or a CNAME string.

## 3. Use the actual preloaded warehouse

Important tables:
- `native_country`: original country JSON as gzip BLOB plus SHA-256. Existing data only.
- `native_place`: native place IDs, source row position, raw fields, population, coordinates and active/superseded status. Existing data only.
- `observation`: new and retained external numerical observations, with source, period, unit, geographic level, cohort and quality metadata.
- `new_observations`, `retained_observations`: SQL views separating cohorts.
- `source`, `indicator`: provenance and definitions.
- `native_overlay_match`: exact UK/Sweden official-ID matches, one selected period per field/place.
- `tax_rule`, `agency_contact`, `funding_route`, `cluster_record`: structured business evidence.
- `missing_observation`: explicit source missingness. These are not zeros and do not count as numerical observations.

SQLite JSON metadata contains the full source URL, quality flags and acquisition method. `observations_new.csv` and `observations_new.json` are alternative exports of the same values. Do not ingest both as distinct observations.

The warehouse is an offline research artifact, not a new production backend. Export to existing static-country files or the compatible extension layer. Keep the SQLite file, source snapshots, logs and duplicate exports outside the website repository.

## 4. Native residential raw overlays

`data/native_overlays/UK.json` and `SE.json` match real native official IDs. They reuse retained, previously collected observations; they are not counted as new acquisition in this release.

Run `tools/apply_native_overlays.py` against the exact reviewed unpacked baseline. The tool refuses a differing country-file hash, changed official-ID order, duplicate place/field records or an attempt to change score eligibility. It adds only `ext_` raw fields and emits a per-place provenance sidecar. It preserves `rows`, `cols`, `fs`, native available-factor counts and score behaviour.

The `staged` output is the tested example of these extensions. For a newer native dataset, rebuild the joins using code scheme and official code; never force the old array positions to fit. Ambiguous matches belong in the unresolved ledger.

Hydration already exposes all `fr` keys as `factorRaw`. Add a compact 'Additional official data' section in the existing place-detail panel that reads the extension metadata. Show raw value, unit, observation period, source link and quality flag. A source-data panel is not a new architecture.

Do not add these variables to `fs`, `meta.factors` with a scored role, or the composite ranking merely because they are now available. Normalization, duplicate-factor checks, comparable definitions and owner approval come first. In particular, demographic counts and broadband coverage cannot stand in for housing costs, healthcare quality or personal tax burden.

## 5. Business Beta integration

The supplied website candidate embeds the UK and Sweden raw extensions inside its existing `nz-pack` asset dictionary. This matters: copying external JSON files next to the original standalone HTML alone would not override that HTML's packed fetch shim. `tools/repack_standalone.py` performs the checked embed, preserves all unrelated assets and leaves the application logic and score arrays unchanged. Source sidecars are embedded too. The new raw fields are available to the existing hydration layer, but do not automatically appear in scorecards or alter rankings. Display and scoring mappings remain an explicit Claude task. Do not confuse preloaded raw data with completed user-visible enrichment.

The supplied startup patch adds one 'Business locations · Beta' link below the original residential controls and passes the selected country. All original embedded script blocks remain unchanged. `/business/index.html` is a separate static view, not a replacement residential homepage.

The business payload is embedded for offline use. A production implementation may feed the same object through the current static loader. No API key belongs in client code. Existing `nz:` household storage is untouched; company briefs use a separate `nz-business-brief-v1` key and save only after a deliberate click.

### Global economy context

Display GDP and value-added structure using the captured period for each field. The newest captured table column is generally 2024; the file being built in 2026 does not make it 2026 GDP. Current-USD GDP is not a purchasing-power measure. Manufacturing is a subset of industry. Do not stack manufacturing and industry together as independent sectors.

V-Dem values describe political institutions. Keep them separate from economic freedom, property-law advice or a company's risk estimate. Retain the source SD and CC BY-SA conditions. Do not invent a confidence interval or a global business-competitiveness index from these components.

B-READY values are a limited six-observation, officially republished subset. Display missing pillars as unavailable. Do not infer the missing 101-economy matrix or reproduce the discontinued Doing Business rank as if current.

### US state industry screening

The unit is a state or listed territory, not a municipality or metropolitan area. Employment is June 2026 payroll jobs in broad BLS groups; electricity is July 2026 sector-average revenue per kWh. Keep both periods visible.

Employment share = sector payroll jobs / total nonfarm payroll jobs.
Location quotient = state sector share / combined share for 50 states plus DC. The reference must remain fixed when a user filters states. Do not add PR/VI selectively to the denominator. A high LQ suggests concentration, not current vacancies, productivity, available workers or certified supplier depth.

The user-adjustable screening score uses log employment scale, LQ and reversed electricity price. No score is assigned when required inputs are missing or all weights are zero. Unknown mandatory company requirements must not become passes. Office/R&D/logistics requirements are not certified by a manufacturing or broad supersector score.

Annual energy estimate = user kWh x published US cents/kWh / 100. This is a scenario subtotal, not a tariff quotation, connected grid capacity or full operating cost. No wage or payroll cost is invented from employment counts.

### GICS and industrial clusters

Numerical charts use the source's BLS industry classification. `industry_gics_relevance.json` supplies a qualitative many-to-many lens only; its weights are deliberately null. Do not recast manufacturing employment as 100% GICS Industrials. GICS is a corporate classification with licensing considerations, not a standard governmental regional employment taxonomy.

If licensed company-level GICS assignments are supplied later, store assignment source, effective date, licence and company identifier. A chart based on those companies must disclose its sample, geographic assignment and weighting basis. It cannot silently become the whole regional economy.

Swiss canton sector tags are published agency positioning, not measured employment shares. Named cluster references are evidence links, not a complete global supplier map. WIPO records measure innovation output and include a final-report/preview version discrepancy flag. Retain the exact report version and complete-file confirmation flag before treating rankings as release-certified data.

### Tax, legal conditions and funding

Tax rules are structured facts with scope and conditions. Never automatically sum marginal, federal, provincial and municipal rates, infer an effective burden, or treat taxable profit as turnover. National minimum-tax rules, entity-specific exemptions, treaties and local multipliers need separate review. The release is not a universal legal/tax calculator.

Funding records distinguish programme, statutory scheme, closed call, no funding and discovery service. A programme budget is not an applicant award. Historical maximum grants do not become currently available cash. Default views exclude closed/unavailable/unverified calls. Preserve the original deadline and last status check.

Contacts are published institutional routes, not verified outreach or permission for automated messaging. Several jurisdictions share an agency website. Recheck people and contact details before outreach, and keep office location distinct from the jurisdiction an agency serves.

## 6. Country expansion

The residential scope remains the exact original 45. The business context can include all captured economies and political jurisdictions, clearly labelled by source geography. National data alone do not qualify a new country for municipal residential rankings. Add residential countries only after official local geography, representative local indicators, reliable source rights and a repeatable update route are available.

Do not collapse source-specific political jurisdictions, contested areas or aggregates into invented ISO entities. The warehouse preserves World Bank and V-Dem custom identifiers where necessary.

## 7. Refresh and release

Use `ANNUAL_REFRESH.md`. The bounded refresh utility can fetch snapshots and normalize World Bank API responses in a network-enabled environment, but it has not completed live provider acquisition in this run. Other provider documents remain discovery snapshots until their current schema is reviewed and parsed. An HTTP 200 is not a valid data import.

Annual review is the minimum for statistical series. Monthly employment/electricity, current tariffs, named contacts and funding deadlines need source-appropriate refresh. A static annual snapshot must remain labelled as such.

Before releasing: run data tests, native overlay guards, browser tests, duplicate-key and licence checks, and baseline Swiss comparisons. Check existing files plus additions against the project 900-file ceiling, 90-file upload batches, new data chunks below 20 MiB and a provisional total-site 500 MB target. These are project safeguards, not a claim that every GitHub limit is a file-count rule.

Return the current app patch, adapted native data, period/source sidecars, measured coverage and source changes, screenshot evidence, rollback information and the cumulative unresolved ledger. Do not deploy or push without owner approval.

## Test-environment qualification

The release's browser checks render the generated Business Beta directly in an isolated browser DOM because URL navigation is disabled in this environment. An in-memory local-storage shim is used only in the test harness. The shipped HTML uses the normal browser localStorage API. Chart rendering, calculations, filtering, source views and CSV export were exercised in that DOM; deployed-origin storage persistence, routing and production hosting were not certified. The 31 Python unit tests are separate from these browser checks. See `reports/browser_validation.json` and `reports/repack_validation.json` rather than infer deployment approval.
