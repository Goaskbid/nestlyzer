# Nestlyzer: current-build repair and product reconstruction brief

Release: `2026-10-18-reaudit-v2`. Domain: `nestlyzer.com`. Repository: `Goaskbid/nestlyzer`.

## Mandate and verdict

Improve the existing Nestlyzer product for people choosing where to live and companies choosing a domicile or operating site. Preserve working features, approved assets, country/place IDs, local observations, source provenance, saved choices and all three prior data deliveries. Do not replace the current application with an old snapshot, an audit page, a source catalogue, or a separate business demo.

There are 52 cumulative findings: 42 retained unchanged and ten incremental findings. None is certified closed on the current deployed origin. Eight targeted behaviours fail in the original saved HTML and pass in a hash-guarded reference candidate. Those tests demonstrate workable repairs to real application code, not a production release. The new engine audit executes 3,496,716 standard-profile scoring evaluations across 129,508 active places and 45 markets. It finds no standard-profile score-bound failures but exposes a serious coverage calculation problem.

The earlier phrase "the live domain was unreachable" was not justified. The reader initially returned a response-size limitation. Subsequent browser navigation to both the domain and GitHub Pages returned `ERR_BLOCKED_BY_ADMINISTRATOR` in this audit session. Treat those as access/tool limitations, not site outages. No live interaction, current commit, real-origin storage, service-worker or deployment-performance verification is claimed by this package.

Your environment must establish the actual current build first. Do not cite the access limitation as proof that the site is broken. Do not close an issue because a helper test passes or because you changed a build number.

## Read these files before changing anything

`START_HERE.md`, `audit/findings_cumulative_52.json`, `audit/regression_status.json`, `reports/summary.json`, `reports/paired_browser_results.json`, `evidence/engine_population_audit.json`, `reports/reference_patch.json`, and the three archives in `preserved/`.

The prior global package contains the captured 3,015-observation increment and its source/licensing contracts. The missing-data package contains the earlier local observations, ingestion tools and unresolved acquisitions. The 16 October archive retains the preceding warehouse, native data and business beta. These archives are preserved byte-for-byte. This re-audit adds zero statistical observations. Never count the same CSV, JSONL, SQLite and country JSON representations as different ingestions.

## 1. Establish a defensible baseline on the real origin

Record the branch, full commit SHA, dirty files, deployed build identifier, final URL after redirects, HTML SHA-256, country roster, active/superseded row counts, bundle/asset manifest and data/model versions. `ETag`, a filename date or a displayed build number alone is not a verified commit identity.

Find the actual current implementation of the loader, scoring engine, builder, route encoder/decoder, comparisons, map selection, deep-data renderer, business switch, intro, persistence and deployment. Previously inspected modules included `00-core.js`, `20-map.js`, `25-params.js`, `30-ui.js`, `58-data.js`, `60-builder.js` and `90-boot.js`. They may now live elsewhere. Locate by behaviour and source strings, not by blindly applying offsets from minified code.

Run `tools/capture_live.py` on the live origin and the resolved Pages/custom-domain route. Its navigation failure is an acquisition failure, not an application assertion. Preserve response metadata and console/network failures. Then use browser tests against the real current application, with fresh contexts and returning-state fixtures. Record any screen you could not exercise as not tested.

Capture these exact first-user journeys before the port:

| Journey | Required proof |
|---|---|
| Fresh mobile visit, consent declined | Intro/Skip behaviour, first usable result, no mandatory blank map |
| DINKS, Switzerland, selected place, All data | Actual facts versus selected-fit outputs; no pensioner-fit row in default facts |
| Manual builder edit, apply, reopen | Original and reopened numeric weights |
| Italian choice, Singapore target | Choice, description, count and explicit relaxation behaviour |
| Name-filtered shared link in a new context | Same scope, IDs, count and ordering |
| Household -> manufacturing -> household | Purpose-specific profiles, text, filters, graphics, state and exports |
| Comparison link with an empty shortlist | Preview without adding saved places |
| Best / lowest assessed / raw-parameter map | Marker type, rank scope, value unit and denominator |
| No results, low evidence, network failure | Specific explanation and usable recovery without changing constraints |

## 2. Port the small, reproduced defects first

Use `repairs/reference_patch.py` as a reviewed experiment and `reports/reference_patch.json` as an exact before/after source guide. The patch refuses any input except the inspected 15 October snapshot. It creates a new file and does not overwrite its input. Do not run it on a newer checkout or deploy its output.

The inspected snapshot hash is:

`3367764250d7b7ba456c329b34871994a5011dacaee6422fbeec73c711c4121b`

The local reference candidate hash is:

`4a9e3f7c730a736ccd031609da58d16ae0a74d24776ac346baaff98f83909f5b`

The experiment changes the main inline logic and one embedded builder asset. All embedded data assets remain hash-identical. It is intentionally not a current-source replacement.

| Finding | Current-source port | Acceptance already demonstrated on the saved candidate |
|---|---|---|
| 043 | Restore manual overrides when opening the builder. Keep derived defaults and overrides separate. | Affordability edited to 1 reopens as 1, not 8. |
| 044 | Remove silent language-filter deletion. Keep the choice and offer explicit editing. | Italian remains active; no classified matches are presented as matching. |
| 045 | Serialize and restore `q`; reset omitted route fields deliberately. | A Zurich-filtered sender and recipient both have 96 fit results, not 96 versus 480. |
| 046 | Default/accept `overview` in the route decoder. | A new Overview link does not inherit All data. |
| 047 | Separate comparison preview from saved-list mutations. | Opening a two-place comparison leaves shortlist count at zero. |
| 048 | Validate shared weights before applying them, and preserve explicit zero limits. | Negative weights are rejected; the 8,137.5 score cannot be produced by that link; `mp=0` stays zero. |
| 050, search portion | Include the modal search palette in focus containment. | Fourteen Tab presses remain inside search. |

The mobile-filter portion of 050 is not fixed by the reference patch. Do not mark the entire accessibility finding resolved from the search test.

Every port must reproduce the defect before the change on the current branch, then run the same test after the change. A finding already fixed upstream needs new evidence and a status of already repaired and reverified, not another patch.

## 3. Fix evidence semantics before changing ranking weights

Finding 049 is a release blocker for claims of assessed suitability. In the saved engine, a young-family profile assigns 22% of its weight to the categories available for Sydney, Toronto and several other basic-data places. The interface can nevertheless show 78% coverage. The engine applies a count-based floor to coverage. There are 17,277 affected ranked young-family results in ten markets in the inspected dataset.

Do not solve this by adding more national indices, increasing the denominator, changing the label to confidence, or clamping scores. Do not treat population/geography proxies as measured jobs, school quality, healthcare access or living costs.

Implement separate fields:

| Field | Meaning |
|---|---|
| Weighted availability | Share of the selected profile's weight for which an input/category value exists |
| Direct local evidence | Relevant observed local facts, distinct from model outputs and proxies |
| Country context | National institutional/economic conditions; identical references across places do not create local observations |
| Proxy share | Weight represented by explicitly described estimates or geographic/demographic proxies |
| Requirement status | Pass, fail or unknown for each explicit requirement |
| Decision readiness | Sufficiently assessed, incomplete or excluded, based on a documented policy |
| Fit output | Versioned model result, not an observed fact or probability |

`repairs/decision_contract.mjs` demonstrates quantity validation, weighted support, requirements, scenario snapshots and purpose-state preservation. Its 31 unit tests pass. These are reference contracts; they still need integration with the actual field registry and UI.

Do not automatically fail every place with unknown evidence. Keep incomplete places explorable in a clearly labelled screening view. Do not call them fully assessed recommendations. An explicit failed requirement is an exclusion; an unknown requirement needs verification. Both differ from a low preference score.

Preserve the old model output for comparison. Introduce a separately versioned model/display policy after owner review. Report rank changes and their causes by profile and country. Do not silently rerank the entire product as part of a UI cleanup.

## 4. Build one coherent purpose state

Adopt the principles in `contracts/application_state.json`, adapting field names to current code. The state must contain purpose, market/scope, purpose-specific profile, questionnaire answers, manual weights, requirements, filters, selected place, comparison, project assumptions and view state. Do not spread these across independent event handlers that each change a label.

Keep household and business sessions separately. A single transition must update all dependent selectors before rendering. Returning to household mode restores the prior household profile, weights, filter choices and selected place. A business profile never inherits DINKS or pensioner-fit criteria. A household preset called business owner is not a factory-site model.

Business requires distinct operating models: office/headquarters, software/research, manufacturing and logistics/warehousing. Retain additional legitimate current profiles. For each, provide a relevance registry that distinguishes required site checks from weighted preferences. Do not invent universal model weights from the number of available data columns.

The transition must update profile menus, relevant facts, assumptions, filter names, list headings, map legends, comparison, exports, terminology, About/founder context and the appropriate graphic accents. Preserve the established visual identity and approved imagery. Do not rebuild the whole site in another framework.

Country availability must be consistent across entry, map, comparison and exports. Keep `UK`/`EL` native IDs distinct from external `GB`/`GR` aliases. Preserve supported market coverage and explicitly label any business evidence that is national-only or US-state-only.

## 5. Use one named business scenario

Findings 051 and 052 are concrete defects in the earlier separate business beta, not confirmed live defects. Blank kWh currently becomes a USD 0 estimate. A screen set to 2,000,000 annual kWh can export a brief containing a separate default of 1,000,000.

Introduce a named project/scenario state. Screening, comparison, annual-cost illustration and export must read the same assumptions. Multiple scenarios are allowed, but must be named and intentionally independent. Do not silently overwrite a user's saved brief during migration.

For every numeric assumption, preserve value, unit and status. A blank is null/unknown. Explicit zero is zero. An invalid negative value is an error, not zero. Distinguish annual energy in kWh/MWh from peak power in kW/MW and from the site's verified connection capacity. Distinguish a household tariff, industrial band average, provider offer and income-relative cost index.

A versioned decision brief must include purpose, project/scenario ID, selected countries and native place IDs, industry/classification version, operating model, assumptions, hard requirements, filters, weights, model version, source/data releases, missing checks and explicit exclusions. Use `contracts/decision_brief.schema.json`. The brief is a reproducible screening record, not legal advice, a tax ruling or proof of grid/site availability.

## 6. Rebuild the detail panel around decisions, not database rows

The first screen should answer: what is this place like for this purpose, what matters most, what is known, and what still needs checking?

Default to a compact set of relevant facts. Every visible fact has a value, unit, period, geographic level and source access. Provide four explicit views: Relevant facts, Country context, Estimates/proxies, and Explain this fit. Put other-profile outputs only in Compare profiles. Keep All data searchable, grouped and exportable; do not destroy data to shorten the display.

For DINKS, show relevant housing/living-cost evidence, job/talent access, transport, safety evidence and selected lifestyle needs where measured. Do not show pensioner fit as a parameter. For manufacturing, prioritise power cost/reliability, labour/skills, freight, water, property/permits and institutional context. Preserve missingness rather than filling a blank fact with a normalized score.

Show at most a compact initial group rather than the existing score-heavy catalogue. Keep a stable reading order and disclosure controls. A long source such as WBL must not dominate simply because it contains many columns. A collapse/expand action should not reset the user's search, scroll position or active purpose.

## 7. Give the map one explicit meaning at a time

Marker kinds must be distinct: rank, selected place, cluster count and raw parameter value. Every ranked marker must declare its scope and denominator. A rank within a language area cannot masquerade as a top result in the entire active scope.

Default to best assessed eligible places in the active scope. Where assessment is incomplete, show a labelled screening signal rather than a false best-place claim. Make Lowest assessed fit a deliberate option. Unknown/unassessed places cannot become the worst places. A failed hard requirement is an exclusion, not the lowest score.

For a parameter layer, display the parameter value and unit or an explicitly named parameter rank. Keep the selected place visible even when outside the leader set. Results-list IDs, marker IDs, active filters and rank numbers must agree. Use deterministic tie handling and selection order.

Keep the existing MapLibre architecture. On tile/style/data failure, offer a usable ranking/list and an explicit map status; do not show an unexplained empty panel or silently clear constraints. The blank offline map in this audit is not proof that the live map is broken.

## 8. Restore the first-visit experience without making it compulsory

The inspected saved build still has an intro and an optional tour. The live disappearance report remains unverified. Test fresh storage, existing storage, a direct shared link, consent declined, local storage unavailable, and both purposes before deciding what to restore.

Use a short optional entry that establishes purpose, profile family and target market. Provide Skip, a direct route to results and a permanent Help entry to reopen the explanation. Returning users retain their last meaningful state. Keep consent, tour completion and business/household onboarding as separate versioned preferences.

On mobile, get to a useful result or an explicit choice quickly. Do not make the default experience depend on successful map rendering. Explain restrictive preset minimums before they remove most places. The saved DINKS preset already has an exclusion explanation; preserve and improve it rather than deleting it.

## 9. Make dialogs and mobile states behave consistently

Search is currently marked modal but lets focus reach the page behind it. The mobile filter sheet also lacks a complete modal contract. Use a shared overlay controller, not a separate patch for every new dialog.

Follow the W3C modal-dialog pattern: move initial focus inside, keep Tab/Shift+Tab inside the topmost dialog, make background content inert, close with Escape, and restore focus to the invoker. Give the mobile filter sheet a name and appropriate role. Keep the desktop filter panel non-modal if the surrounding UI remains usable. Correct semantics when resizing between these states.

Test 360, 390, 768 and 1440 CSS pixels, landscape, keyboard use, reduced motion and 200% zoom. Verify sticky actions do not obscure fields, comparison tables have explicit horizontal scrolling and focus is visible. Real iOS Safari, screen-reader behaviour and production-origin storage need their own evidence; desktop Chromium emulation is not a substitute.

Reference: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

## 10. Retain good behaviour instead of creating regressions

The re-audit verified useful behaviour in the saved implementation. Zero-result views explain exclusions. A selected place outside active filters says it is hidden and not ranked. Cross-country comparison already warns that scores are country-relative. The business beta returns no ranking when all three screen weights are zero. Preserve these.

The initially observed 73 versus 72 selected score was an animation-timing artefact, not a confirmed score-calculation defect. The raw score was identical. Two Apply buttons in the builder are intentional regular/sticky actions, not a duplicated-control bug. Blank maps in the restricted offline test are not live-map evidence. These rejected hypotheses must not enter the defect count.

Do not silently change retained notes, favourites, local storage keys, IDs, row order, units, approved photos, consent behavior or service-worker behavior. Test failures in our development harness, including timeouts or ambiguous selectors, are not application defects.

## 11. Founder/business context and copy

Retain the residential origin story and existing interview. The following is proposed editorial copy for owner approval, not a new historical quotation:

> The same approach also applies when choosing a location for a company. Operating costs, skills, infrastructure and predictable rules matter alongside the place itself. The business view brings those checks together while separating country-level indicators from evidence about a specific site.

Do not invent a magazine interview, date, endorsement or verified business outcome. The business About view should explain headquarters versus operating-site decisions and why national scores alone cannot certify a site.

## 12. Data preservation and acquisition

Import the previous captured data through the current loader, not by pasting new national values into every municipality. Preserve source period, publication date, retrieval date, geographic level, unit, licence and revision. Keep raw observations, derived indicators and profile outputs in separate registries.

Retain the prior cohort/deduplication rules, approximate tariff flags, source anomalies and permission-dependent sources. Do not advertise the supplied energy coverage as a homogeneous global tariff table. A national electricity index is not a local bill. Source-null, not-captured, suppressed, not-applicable and unverified states remain distinct.

The NASA climate payload, the incomplete Ireland acquisition and other acquisition gaps remain open. They are not fixed by this audit or by copying a source URL. Close a data item only with an actual payload, source period, validated schema, exact mapping and before/after coverage report.

## 13. Delivery in bounded, testable stages

| Stage | Deliverable | Gate |
|---|---|---|
| A. Baseline | Exact current build/origin evidence and a reconciled ledger | No issue falsely marked reproduced or closed |
| B. State integrity | Port 043-048 and search part of 050 | Same-state before/after browser tests; no preserved-state losses |
| C. Data semantics | Weighted support, typed facts, missingness and quantity states | 22% example, blank/zero distinction, no fabricated local coverage |
| D. Purpose/scenario | Atomic purpose switch and a coherent business scenario | Household -> business -> household restores both states; export agrees |
| E. User experience | Relevant facts, map semantics, optional intro, mobile overlays | Desktop/mobile evidence for the exact user complaints |
| F. Release | Current source/deploy artifacts, checksums, regression report and approval | Real-origin verification after an authorised deployment |

Do not claim completion of a stage because another stage produced many tests. Do not hide an unresolved P0 in an average completion percentage.

## 14. Repository, hosting and release safety

Use the existing repository and build system. Resolve the actual custom-domain/base-path strategy before generating links, manifest start URLs, service-worker scopes and lazy-asset paths. Build from a clean checkout using the lockfile. Verify a deployment artifact allowlist, valid HTML at the entry point, correctly typed JSON and referenced asset existence. Do not publish node_modules, credentials, raw research archives, test screenshots or audit databases as site assets.

Keep data acquisition bounded and source-specific. Use caching, backoff, release checks and explicit failure status. Do not enable high-frequency scraping, recurring Actions, paid services or new secrets without approval. Do not bypass source or browser access controls. Source/deploy ZIPs must match the documented current commit and build, not the old audited snapshot.

Preserve a rollback artifact before any authorised publication. After publication, verify the real origin, fresh and returning sessions, asset/version consistency, deep links, offline/failure paths and the complete purpose switch. Report separately when publication was not performed.

## 15. Required completion report

Deliver the current App HTML/offline export where supported, matching source and deploy ZIPs, manifest/checksums, cumulative JSON/CSV/SQLite ledger, and exact current-build browser evidence. Keep all 52 IDs and add any new findings rather than replacing this ledger.

Use these statuses: repaired and reverified on the named build; still failing; newly introduced; reopened; not retested; deferred with a reason. A saved-reference repair is a separate evidence field, not a production status. Report the matrix for preservation, data semantics, purpose switch, maps, intro, accessibility, source rights, CI/resource limits, privacy, artifact integrity and publication.

The final verdict must name remaining blockers, exact tested scope and untested areas. No generic "all tests pass", inflated observation count, longer prose, warning placeholder or helper-only success is acceptable as closure of a user-visible defect.

### Reference-experiment limits

The invalid-link reference test starts from a fresh Young family session and uses a visible fallback. The production route decoder must be transactional and must preserve any pre-existing custom profile and saved questionnaire when an incoming link is invalid. That existing-profile case has not been certified by the narrow reference patch. Likewise, the experiment does not certify questionnaire-change override policy, mobile filter semantics, real-origin persistence or Back/Forward history. Add those current-build tests before closing the corresponding findings.

### Prefabricated display metadata

Use `contracts/context_cards.json` to accelerate the context-panel rebuild. Its 14 card definitions bind to actual indicator IDs already supplied in the global data package, with consumer/scope caveats and purpose-specific default order. Validate these IDs against the current registry before wiring them. They are display-only; `scoreEligible` remains false. Preserve existing local-fact cards alongside this country/source-area context rather than replacing them.
