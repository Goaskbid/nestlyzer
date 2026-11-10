# Integration specification for Claude

## 1. Source acquisition and live preflight

Keep the seven acquisition jobs separate. Do not build a large all-country CSV in memory. The supplied downloader saves raw responses and receipts, checks official HTTPS hosts, throttles requests and stops on unexpected HTML, schema errors, conflicting cache identities or access denials. A fresh work/cache directory denotes a fresh acquisition release. Reusing a raw cache is a reproducibility action, not a data refresh.

All adapters are offline-fixture tested. A source can change its schema, redirect, code lists or supported flow version. Resolve failures against the saved raw response and official metadata. Do not add permissive positional fallbacks to make a job green. Do not bypass access controls or assume a public UI authorises unrestricted automated use.

France: the current long-format dossier has approximately 700 indicators. Preserve `DS`, `ID_TAB`, `TAB_MEASURE`, `TIME_PERIOD`, `GEO_REF`, units, multipliers and statistical status. Only `GEO_OBJECT=COM` enters municipal staging. The file has multiple geographic vintages by source. Do not substitute a single 2026 label for every series. The adapter's native measure labels may be codes until the publisher's metadata dictionary is joined. Retain the dictionary and statistical universe before publication. For CSV input instead of Parquet:

```bash
python nz_countries.py --country FR --cache "$WORK/raw/FR" \
  --input /path/to/dossier_complet_csv.zip --out "$WORK/stage/FR"
```

US: ingest 14 selected 2024 ACS five-year tables. The table-based bulk files avoid the keyed data API; optional metadata is held if not available. Estimates cover 2020-2024. Whole-place `GEO_ID` matches are selected, not counties, state totals or county fragments. This does not cover every GeoNames settlement. Retain the 90-percent margin of error beside each estimate and add a reviewed reliability policy. A margin of error and a denominator are not extra independent evidence. Fetch the table shell or metadata when variable labels are unresolved.

Canada: ingest the 2021 Census Profile at census-subdivision level, `DGUID=2021A0005...`. Income in 2020 stays labelled 2020. Match each repeated `SYMBOL` column to its adjacent measure. Resolve characteristic IDs and universes from the live dictionary; repeated labels alone do not approve a scoring concept. Population change can be negative. Add newer annual population separately if required; this adapter does not implement that additional dataset.

Australia: fetch the ABS data structure before the LGA 2021 flow. The current candidate flow is `ABS_REGIONAL_LGA2021,1.6.0`. If headers do not match, create an explicit `--column-map` JSON after inspecting the actual data and structure. Recognised roles are area, measure, period, value, unit, multiplier and name. Preserve all dimensions, source periods and statistical geography. ABS LGA approximations are statistical boundaries and do not establish legal parcel jurisdiction. Exclude modelled measures from direct-observed evidence unless separately classified and approved. Do not attach City of Sydney statistics to the whole Sydney metropolitan record.

Brazil: every candidate table is inspected for available periods, variables, categories and municipality level N6. Census tables remain 2022 even when revised later. Annual population and GDP use their own advertised periods. The extractor batches below the documented query-cell limit. A missing or changed table causes an explicit failure, not a fabricated zero. The IBGE dash symbol is absolute zero in this source; X and other missing symbols stay nonnumeric. The source's age, sex and race totals must not become protected-group desirability scoring.

Mexico: use the national ITER archive but retain only `ENTIDAD != 00`, `MUN != 000`, `LOC == 0000`. These are municipal/demarcation totals, not every locality. Do not sum municipality totals with their constituent locality rows. Keep leading zeros, suppression and the 2020 boundary vintage. The selected 23 variables cover structural population, housing, education, economic activity and basic services. They do not measure current rental prices or healthcare capacity. Check for newer comparable releases before approving freshness.

## 2. Canonical observation contract

The 25-column canonical CSV schema is defined by `FIELDS` in `nz_core.py`. It includes native geography, boundary vintage, measure, period, units, dimensions, source, raw checksum, status, holds and separate publication/scoring flags. Every output defaults to `held_for_review`, `publication_approved=False`, `score_eligible=False`.

Zero is an observation. Blank is missing. Keep suppression distinct from lack of coverage. Stable record IDs identify a source observation and its dimensions, not its value or retrieval date. A conflicting revised value in the staging database stops the import. Keep the prior immutable release and review the revision; never rewrite it silently.

`source_release` is provisional when no explicit version was parsed. A download receipt's ETag/Last-Modified and raw hash provide retrieval provenance, not the observation year. Retain all raw receipts outside the public deployment.

Use SQLite staging for large sources. A full French dossier can produce many millions of source rows across periods and dimensions. Select profile-relevant concepts and latest purpose-appropriate observations in the build. Do not ship the entire national raw warehouse to every browser or funnel it into the legacy memory-based master importer.

## 3. Geography and source-code crosswalk

The queue contains actual application IDs and coordinates. Five non-European targets use GeoNames IDs. These are not US Census, Canadian CSD, ABS LGA, IBGE or INEGI municipality identifiers. A same-name match or nearest centroid is not enough.

Build official native geography tables first. Use official boundary files and dated correspondences to classify each relation as exact boundary, contains, within, overlaps, successor or unresolved. A point-in-polygon match can find the containing jurisdiction. It cannot prove that the existing app record represents that whole jurisdiction. For conflicting metro/suburb records, add or expose the official administrative entity and keep the GeoNames label as a search alias, rather than overwriting its population.

Use a crosswalk schema such as:

```text
cc,source_geo_id,boundary_vintage,app_place_id,relationship,approved,reviewer,evidence
```

Only reviewed `exact_boundary` mappings can count as direct local scored evidence in the helper supplied here. Wider-area context remains visible but separate. Aggregations and weighted crosswalks require a documented estimator; never aggregate medians by simple addition or average unrelated rates.

France already has official codes, yet boundary vintages still need reconciliation. The Swiss extractor provides a separate successor review table through BFS correspondences, including territory exchanges. It does not automatically approve those aliases.

## 4. Integrate safely with 2.13.1

Check the patch before applying it from the application root:

```bash
git apply --check /path/to/pack/08_guardrails.patch
git apply /path/to/pack/08_guardrails.patch
```

The patch changes `build/build_master_context.py` only. It does not modify scores or tax data. Positive publication approval becomes mandatory for all master-context records, not just this pack. Existing unapproved context may disappear from a fresh build. Produce a before/after report and review it before deploying; do not set all approval flags true to preserve counts. Matching rounded values and shared words no longer suppress observations. Use reviewed `overlap_decisions.csv` instead.

A bounded native-format export is available for selected measures:

```bash
python nz_integrate.py master --db "$WORK/observations.sqlite" --cc US \
  --indicator acs5:B01003_001E --out "$WORK/US_population_master.csv"
cd "$REPO"
python build/build_master_context.py import "$WORK/US_population_master.csv"
```

The second command is the existing dry-run importer, without `--apply`. Exported rows remain held. The helper defaults to a 50,000-row limit and refuses an unfiltered national dump. This compatibility route is for approved small context selections, not the new scoring warehouse.

Implement scoring inputs upstream of `data/c/*.json`, not by editing compressed output arrays manually. Derive approved rates from their correct universes. Review foreign-currency and purchasing-power comparisons separately. Preserve source periods and compute raw values, densities, derived factors and scores from a consistent release.

Wire `eligible_evidence` and the country-neutral policy into the actual JavaScript engine/build. These Python helpers do not already affect `src/engine.js`. Replace the country-specific shortcut only when the new evidence contract is integrated and tested. A proposed 70-percent weighted domain threshold is a product decision, not an official quality standard; validate it against all 49 profiles and mandatory needs. Avoid counting 20 age bands as 20 independent domains.

Add tests proving that missing childcare, housing-cost, healthcare or business-permit evidence cannot become supported through population proxies or a lower foreign-country threshold. A richer census is valuable even when some profiles remain evidence-limited.

## 5. Swiss extraction, validation and 2018 retirement

`nz_swiss.py` targets the official ESTV calculator host using an undocumented operation contract found in a public original client. Independently validate request fields, enum values and response components against the current UI before trusting output. The supplied configuration uses six explicit proposed standard households. Age, religion, pension split, wealth household and deductions have not been proven identical to the 2018 source. Approve revised, clearly labelled scenarios or reconcile the old assumptions before claiming continuity.

The national operation is `API_calculateManySimpleTaxes` with group 99. It is designed to request the six scenarios in nationwide batches rather than issue 13,032 blind individual requests. The actual response structure and coverage remain unverified in this environment. Missing components are not zero. Divergent submunicipal tax locations are held instead of averaged.

Income burden uses canton, municipality and church income taxes divided by gross income, multiplied by 100. Wealth burden uses the corresponding wealth taxes divided by net wealth, multiplied by 1,000. Federal tax, personal tax, tax credits and total tax remain separate source components. The stated scenario must disclose religion. Do not label these component-based figures as total all-in household taxation.

Detailed fallback is disabled by default. After the batch preflight proves it necessary and permitted, enable an explicit call budget:

```bash
python nz_swiss.py --repo "$REPO" --cache "$WORK/raw/CH" \
  --out "$WORK/stage/CH-retry" --year latest \
  --detail-fallback --max-detail-calls 40
```

This example permits only a small diagnostic run, not blanket authorisation for thousands of calls. The detailed fallback checks the wealth budget line and prevents counting the same wealth twice. Reuse a raw cache only within the same verified calculator version. Use a fresh output directory when rerunning, since canonical files are immutable.

Benchmark identical requests in the official UI: all 26 cantonal capitals for each scenario, additional non-capital municipalities, known low/high-burden places, zero-valued components, changed communes and all problematic submunicipal cases. Record component-level agreement at the calculator's displayed precision and investigated rounding differences. Do not use the 2025 capital leaflet as a benchmark for nonidentical income or household assumptions.

The technical tax gate is deliberately insufficient to authorise retirement. It always emits `retire_2018_authorised=false`; the release workflow must separately prove scenario approval, UI benchmarks, boundaries, component reconciliation and rank-difference review. For each current official commune, require six usable results or withhold the affected tax ranking. For every old app place, resolve its identity or clearly mark it historical/unresolved.

After these checks, update source inputs and metadata, rebuild all affected country/ranking/Insights outputs, archive 2018 values as historical and exclude their source from current scoring. Switch manifests atomically, invalidate stale client caches and retain the previous release for rollback. Assert that zero scored factors reference `estv_tax_burden_2018` after the switch.

## 6. Required release evidence

Deliver per-country counts of source rows, numeric rows, source geographies, reviewed exact app matches, contextual matches, missing/suppressed cells, approved independent domains and eligible profiles. Include the still-unmatched queue. Show the active source periods, not just a refresh timestamp. Provide old/new score and rank differences, data/code version hashes, calculator request hashes and a rollback manifest.

No automatic deployment is included in this handoff. Do not report that a country has left thin evidence until the actual application build, profile eligibility and user-visible provenance have been checked.
