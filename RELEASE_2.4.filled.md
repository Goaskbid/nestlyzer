---
title: "Nestlyzer 2.4.1: privacy-first, built by GitHub, refreshed every year"
subtitle: "Nothing goes to Google before consent, light Analytics after it, a self-refreshing data pipeline, new maps and charts on every country and place page, and a final independent audit"
date: "11 October 2026"
---

# What 2.4.1 adds

**Why the live site still showed the old version, and the repair**

- **What happened:** the 2.4 files were uploaded with the browser's **Add file → Upload files**. That upload puts every file in the top folder:
  - the workflow ended up beside everything else instead of in `.github/workflows/`, so GitHub never ran it;
  - the old `index.html` from June stayed in the top folder, so GitHub Pages kept serving the old site.

  I checked this directly in the repository: 6 upload commits on 11 October between 19:20 and 19:28, about 190 loose files, and no `.github` folder.
- **The repair:** the release now comes as two zip files plus one text file.
  1. You paste the text once as `.github/workflows/site.yml`.
  2. You upload both zips in the browser.
  3. GitHub then checks that both parts are there and that Pages is set to "GitHub Actions".
  4. It removes every old and loose file (the workflow file stays), unpacks the release with all folders in place, saves that as one commit, builds, tests and publishes.
- **The safety stop:** if Pages is still set to "Deploy from a branch", it stops before changing anything and says so.
- **Tested on a copy of the repository as it is today:**

  | Test | Result |
  |---|---|
  | Starting state | the real current state, with the loose files and the old `index.html` |
  | Only part 1 uploaded | waits, changes nothing, publishes nothing |
  | Pages still on "Deploy from a branch" | stops with a clear message; nothing changed |
  | Both parts, Pages on GitHub Actions | old files removed, 225 source files in place, no zip left behind; build, 5,656 pages and browser smoke test pass |

**About page.**

- **Content:** your interview with Torsten Sauter, with the four photos: Frankfurt, Meilen, Hamburg and Warnemünde.
- **Where it is linked:** as you asked, it sits quietly at the end. It is linked from the footer on every page and listed in the sitemap for search engines, but it is not in the header or the menu.
- **What I removed from the draft:** the editor's placeholders, the "GitHub" citation marks and the "Pasted markdown" remnant.
- **Fact boxes:** the factual notes between the answers now say how Nestlyzer actually does it, in small "How Nestlyzer does it" boxes. Each one was checked against the site.
- **Photos:** re-encoded without any camera metadata (no location data), in two sizes.

**Checked for losses.**

- **Pages:** all 5,655 pages of 2.4.0 are still there, and `/about/` is new.
- **Tests:** all earlier tests still pass, with one new test (R73) for the About page.

# In short (2.4)

**Privacy-first by default.**

- **Before consent:** until a visitor presses "Accept all", the browser contacts no Google service, sets no cookie and sends no IP address to Google. The same holds after "Only necessary", on every later page.
- **After "Accept all":** light Google Analytics loads, so you get your visitor numbers, but with Google signals and ad personalisation switched off. AdSense loads too, and asks for non-personalised ads only.
- **Checks:** two automatic tests (R23, R69) and two independent privacy audits confirm this request by request.

**GitHub now builds the site and refreshes the data itself.**

- **Upload:** you upload about 215 source files once. On every push, GitHub builds the 5,655 pages, runs the tests, checks the site in a real browser and publishes it.
- **Monthly check:** on the 3rd of every month it asks Eurostat for a newer year of municipal population figures. When one appears, it rebuilds, tests, saves and publishes it, with safety gates.
- **Failures:** if anything fails, nothing is published.

**New on the pages search engines see.**

- **Country and region pages:** 274 now open with a dot map of every place, coloured by fit, with the top 10 as numbered pins linked to their places.
- **Place pages:** strengths are drawn as bars, every profile score has a small bar, and Swiss places get a "Residents by year" chart.
- **Method page:** a new "How fresh the data is" section.

**Data corrections.**

- **Country totals:** the residents shown on country pages counted the 455 superseded duplicates twice. Norway showed 10.8 million instead of 5.6 million. Every country is now correct, and the European total is 545 million.
- **Density:** density is now always residents ÷ area for the same year.

**Final audit.**

- **Round 1:** a reviewer who had never seen the project went through every journey and the privacy behaviour. They found 0 blockers, 4 major and 4 minor issues, and 4 polish points.
- **Round 2:** after the fixes, the same reviewer re-checked everything. All findings are fixed or explained, and nothing got worse.
- **Tests:** the browser regression suite has 71 checks, and all pass except the one that cannot run offline.

# 1. Legal: what changed, and the risk that remains

## What the site does now

| Moment | What the browser sends to Google | Cookies |
|---|---|---|
| First visit, before any choice | nothing | none |
| After "Only necessary" (and on all later pages) | nothing | none |
| After "Accept all" | Google Analytics, with Google signals and ad personalisation off. AdSense, with non-personalised ads requested and "ad personalisation" kept denied. | Analytics and ad cookies |
| "Privacy settings" → "Only necessary" | nothing from the next page on | none new |

The banner, the privacy policy and the cookie table now describe exactly this. They also explain which outside services the map uses for photos, weather and local counts: Wikimedia, NASA, OpenStreetMap and Eurostat. Those services can be switched off in Tools under "Live content". Switching it off now also stops lookups that are already running.

"Privacy settings" and "Imprint and privacy" are now in the Tools drawer, so a visitor can change their choice from the map too.

## Why Google's own consent dialog is not used

- Google requires its certified consent tool only for **personalised** ads in the EEA, the UK and Switzerland.
- Without it, a site can still show non-personalised or limited ads ([Google AdSense Help](https://support.google.com/adsense/answer/13554116?hl=en)).
- Nestlyzer never asks for personalised ads, so its own banner is enough. A second Google dialog would only annoy visitors.

## The EU and UK representative, with Analytics kept

- **Why it applies:** with Analytics after consent, Nestlyzer measures how visitors from the EU and UK use the site. That is "monitoring behaviour", so Art. 3(2) and Art. 27 GDPR (and UK GDPR) apply: an operator outside the EU should name a representative in the EU, and one in the UK.
- **What consent fixes:** consent makes the tracking lawful. It does not remove the duty to name a representative.
- **How big the risk is:** small, and it grows with complaints, not with traffic.
  - The fine for this breach sits in the lower tier, up to €10 million or 2%, but that is a ceiling.
  - The one known case (Locatefamily.com, Netherlands, 2021, €525,000) concerned a site that also ignored people's requests.
  - Nestlyzer now answers every request within a month, tracks nobody without consent, and personalises nothing.
- **To close it completely, either:**
  1. name a representative: a trusted person in the EU and one in the UK with a signed one-page mandate, or a service such as Prighter (from about €35 a month per region); send me the names and addresses and they go into the build as `NZ_EU_REP` and `NZ_UK_REP`; or
  2. build without Analytics (`NZ_ANALYTICS=off`). Then the site tracks nobody.

This is not legal advice.

# 2. GitHub: the site builds and refreshes itself

## How it works

- **The repository:** it now holds the sources, about 215 files and 25 MB zipped.
- **The workflow** (`.github/workflows/site.yml`) runs these steps:
  1. installs the tools;
  2. asks Eurostat for a newer data year;
  3. rebuilds the data if there is one;
  4. runs the data and scoring tests;
  5. builds the 5,655 pages;
  6. checks the finished site in a real browser on desktop and phone;
  7. publishes.
- **When it publishes:** on every push it always publishes, if the checks pass. In the monthly check it publishes only when there is new data.

## What a yearly refresh updates, and its safety gates

- **What changes:** a new Eurostat year changes residents, density and five-year growth, and with them:
  - residents within 30 km;
  - which places count as cities of 100,000+;
  - the access scores and every ranking built on these.

  Geography (coast, airports, railways, terrain, climate) does not change from year to year.

- **The safety gates:**
  - A country is updated only if at least 85% of its places match and its total moves by less than 12%.
  - A place that jumps by more than half (usually a merger) keeps its old figures.
  - Scores keep the published scale.
- **What stays manual:** the Swiss FSO portraits and ESTV tax data are not published in a machine-readable form, so they stay a manual update.

## How it was tested here

The workflow was replayed step by step in a clean copy of the repository, with fresh installs:

| Run | Result |
|---|---|
| Normal push | install, tests, build and browser smoke test: pass |
| Eurostat unreachable | the step falls back to the current data; build and smoke test pass |
| Simulated new year 2025 (test copy of the Eurostat table) | 33 countries updated. Malta kept, as planned: the test faked a 50% jump. UK kept: not in Eurostat's table. Tests, 5,760 pages and the smoke test pass. |
| The data build on two machines | byte-for-byte identical output (with `PYTHONHASHSEED=0`, set in the workflow) |
| Workflow file | checked with actionlint 1.7.12: no problems |

It also uses only GitHub's own actions (checkout v7, setup-node v6, setup-python v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5). Each one was checked against its source code and release date.

**One limit:** GitHub pauses monthly schedules in public repositories after 60 days without a commit. Every push also checks for new data, and the Actions page has a "Run workflow" button.

# 3. What is new on the site

- **Dot maps** on all 35 country pages and 239 region pages.
  - **Dots:** one per place, coloured from weaker to best fit for young families.
  - **Pins:** the top 10 are numbered and link to each place. Pins that would overlap move aside and keep a thin line to their place.
  - **Overseas places:** top-10 places that lie overseas are named in the caption (France's #3 is in French Guiana).
  - **Display:** they work in light and dark mode and on phones.
- **Place pages:**
  - strengths and trade-offs as bars;
  - a small bar next to every profile score;
  - a "Residents by year" chart that starts at zero and states the change ("+5.4% from 2019 to 2024");
  - "Green space" used everywhere instead of "Environment and climate".
- **Method page:** "How fresh the data is", with the population year, the growth base year, the Swiss data years, the last build and the refresh rules.
- **Sources list:** deduplicated.
- **Tools:** "Privacy settings" and "Imprint and privacy". The single file now opens "How scores work" and "Imprint and privacy" inside the app.
- **Wording:** "No other municipality lies within 10 km" (was "Only no other municipalities").

# 4. The final audit

The reviewer had never seen the project. They used the site as a first-time visitor on desktop, on a phone and in dark mode, and recorded every network request for the privacy part. After the fixes, the same reviewer checked everything again.

| # | Finding | Severity | Fixed how | Re-audit |
|---|---|---|---|---|
| 1 | Most dot-map pins outside Switzerland linked to "#" | Major | Every pin links to its place page or to the place on the map, the same address as the list (2,632 pins on 274 pages checked) | Fixed |
| 2 | France: pin numbers did not match the list (#3 lies in French Guiana) | Major | Pins carry the real rank; ranks outside the map are named in the caption | Fixed |
| 3 | The policy said outside services are asked "only when you open a place" | Major | The text now says what happens: lookups for the places shown, starting when the map or a place is shown | Fixed |
| 4 | No way to change the privacy choice from the desktop map | Major | "Privacy settings" and "Imprint and privacy" in Tools; focus goes into the choice | Fixed |
| 5 | No pins on Jura and Åland | Minor | By design: no place there passes the young-family profile; the caption now says so | Explained |
| 6 | Pins overlapping around Berlin and in Norway | Minor | Pins that would overlap move aside with a thin line to their place; no two pins overlap anywhere | Fixed |
| 7 | Switching live content off did not stop lookups already running | Minor | Every outside request goes through one gate that checks the switch | Fixed |
| 8 | The residents chart exaggerated growth (bars did not start at zero) | Minor | Bars start at zero, and the change is stated in words | Fixed |
| 9 | Meilen's intro leaves out Lottery winner | Polish | By design (niche profiles are left out of that sentence); your confirmation is an open item | Explained |
| 10 | Density did not equal residents ÷ area | Polish | Shown for the same year everywhere | Fixed |
| 11 | The cookie table listed Google consent-dialog cookies that never appear | Polish | Removed in the privacy-first build | Fixed |
| 12 | Postcode search not available | Polish | Unchanged, with a clear message; open item | Open |
| 13 | Re-audit: focus stayed on the Tools button after "Privacy settings" | Minor | Focus moves into the banner | Fixed |
| 14 | Re-audit: legal page date not updated | Polish | Updated to 11 October 2026 | Fixed |
| — | Found by me in the same round: country residents counted superseded duplicates (Norway 10.8 instead of 5.6 million) | Major | Totals count each place once; Europe now 545 million | Fixed |
| — | Found by me: "Imprint and privacy" and "How scores work" in the single file tried to leave the app | Minor | They open inside the single file | Fixed |


# 5. How it was checked

## Automatic tests

Run in headless Chromium on desktop and phone sizes against the built site.

Result: **71 pass, 0 fail, 1 not verifiable offline** (2026-10-11 20:42).

| Check | What is tested | Result | Evidence |
|---|---|---|---|
| R01 | Landing page: hero, 25+ profile tiles, 35 countries, FAQ, legal footer, sponsorship, consent banner | Pass | h1="Find where you fit.", profiles=25, countries=35, faq=6, consent=True after 0.2s ['consent open', 'object', None, 'undefined', False], sponsor_link=1 |
| R02 | Ranking list renders after load (legacy defect: 0 rows shown) | Pass | 480 ranked, 100 rows rendered, 9 top-pick cards, #1 Bürglen (TG), 1.41s to results |
| R03 | Method v1 in the browser reproduces legacy v86 rankings exactly | Pass | young_family: n 480/480 match; hnw: n 7/7 match; swiss_lottery: n 2172/2172 match; pensioner: n 793/793 match; student: n 49/49 match |
| R04 | Profile switch re-ranks live and updates the URL | Pass | profile=pensioner, n=793, hash=#/explore?cc=CH&p=pensioner |
| R05 | Swiss region and canton filters narrow the scope | Pass | Zurich region scope=519, Zug scope=11, all ZG=True |
| R06 | Name/code filter updates results live (legacy defect: nothing re-rendered) | Pass | scope=1 ['Meilen'] |
| R07 | Confidence slider and new size filter apply live | Pass | conf>=72 scope=12 (min 74.3); +pop>=20k scope=1 (min 24624) |
| R08 | Sort by size (new) | Pass | first row Uster, pops [35007, 31043, 29303, 27277, 24990] |
| R09 | Map colours polygons immediately after ranking (legacy defect: only after Fit scope); layers; leader and cross-border pins | Pass | 2172 polygons coloured, 0 out of scope, legend="Taxes low 34 48 60 72 85+ outs", pins=25 |
| R10 | Place panel: all legacy sections (jobs card, comparables, cross-border, breakdown, gallery, contact) plus the new why-card, story, facts, look-alikes, neighbours, weather, nearby and photos, in tabs | Pass | missing=[], radar=1, sparks=3, gallery/contact/arms slots=[True, True, True] |
| R11 | Shortlist (new): save, survives reload, listed in Shortlist tab | Pass | Your shortlist (1) Tick two or three places, then compare them side by side. No |
| R12 | Compare (new): tray, side-by-side table | Pass | columns=3 |
| R13 | Global search across all places: jumps country and opens the place | Pass | first hit " Lyon France, 516,092", opened Lyon |
| R14 | Guided builder restored (legacy: hidden/reset): answers, closest profiles, apply, shareable weights | Pass | profile=self_fit, ranked=1122, matches=3, url has weights=True |
| R15 | Regional reality board (legacy: never rendered): language groups and cross-border clusters | Pass | groups=['German-speaking', 'French-speaking', 'Bilingual'], cross-border chips=5 |
| R16 | Student = multi-answer: no auto-select, banner to the board, university hubs | Pass | selected=None, tab=ranking, banner=1, hub pins=11 |
| R17 | Cross-border cluster opens the neighbour country and selects the target | Pass | FR Saint-Louis |
| R18 | Large countries use official NUTS regions: DE 16 Länder + districts, plus greater areas around big cities; ES all provinces reachable (legacy lost 449); IT Lazio correct | Pass | DE regions=16, districts in region=45, greater areas=34 (e.g. ['Greater Berlin (79)', 'Greater Stuttgart (244)', 'Greater Frankfurt (140)']); ES region sum=8... |
| R19 | Expat professional ranks in CH (legacy: 0 results); Coastal says why it is empty in landlocked CH and offers coastal countries | Pass | expat n=148; coastal message="Switzerland has no coast", country buttons=6 |
| R20 | European access profiles no longer depend on loaded polygons (legacy: 0 results without geometry) | Pass | AT commuter=386, FR student=1008 |
| R21 | PDF booklet opens a print-ready dossier (legacy: script broken, never shipped) | Pass | 2026-10-11 Zürich Zurich, Switzerland, 427,721 residents Decision snapshot Profile Young f |
| R22 | Dark mode toggle (new) | Pass | system -> dark |
| R23 | Light analytics: everything denied by default; "Accept all" grants visit statistics and ad cookies but never personalised ads; Google signals and ad personalisation are off in Analytics | Pass | banner=True, default denied=True, light settings=True, after accept={'analytics_storage': 'granted', 'ad_storage': 'granted', 'ad_user_data': 'granted', 'ad_... |
| R24 | Mobile: no horizontal overflow, bottom tabs, list and place views (legacy: no mobile UI) | Pass | overflow landing=0, explore=0, tabs map->list->place ok=True |
| R25 | Official GISCO polygons on demand for Europe (runtime fetch). Offline: fails soft with a message | Pass | Boundaries unavailable The GISCO service did not respond (Failed to fetch). The dot map keeps working. × |
| R26 | Deep links open the exact place; home and back navigation work | Pass | opened Meilen, home visible=True, back->explore |
| R27 | Lottery tax panel (CH joined / Europe pending) and language-reality line | Pass | Swiss tax panel=True, other-country notice=True, language line=True |
| R28 | SEO: static pages (municipality, canton, country, profile, method, legal) with canonical + JSON-LD, sitemap, 404 | Pass | [] bad; 404=404, sitemap urls=5656 |
| R29 | Accessibility basics: named controls, image alt, visible keyboard focus (legacy: none) | Pass | unnamed landing=0, explore=0, imgs without alt=0, focus outline=solid |
| R30 | Performance: legacy shipped one 18.7 MB HTML (90 MB JSON parsed in the browser) | Pass | gzip transfer KB: {'/': 118, '/data/meta.json': 53, '/data/c/CH.json': 606, '/data/c/FR.json': 1908, '/data/geo/ch.topo.json': 139, '/vendor/maplibre-gl.js':... |
| R31 | Wikipedia/Wikidata/Commons/Overpass enrichment (photos, extracts, arms, contacts, sights, gallery) | Not verifiable here | Hosts blocked in this sandbox; panel renders without them and slots stay empty, no errors. Must be checked on the live site. |
| R33 | Search finds exonyms, umlaut spellings, Nordic letters, Greek and Cyrillic places; exact city first; cities split into parishes (Lisbon, Skopje) open as their greater area | Pass | {"Kobenhavn": "København", "Genf": "Genève", "Roma": "Roma", "Vienna": "Wien", "Athens": "Αθήνα Athina", "Lisbon": "Lisbon, the whole city", "sankt gallen": ... |
| R34 | Mobile: header turns solid on scroll, menu with links; Coastal on a landlocked default switches to a coastal country | Pass | transparent at top=True, solid when scrolled=True, menu links=5, coastal country=PT |
| R35 | Builder starts from the current country (all 35 selectable); flag renders at 4:3; one resident figure (latest year) everywhere | Pass | target=FR, choices=35, flag=[16, 12], Bürglen display 4067 (scoring base 3959) |
| R36 | Map markers never overlap (phone width, Switzerland): lower-ranked pins hide until zoomed in | Pass | visible pins=11, overlapping pairs=0 |
| R37 | AdSense ready: ads.txt, account meta on every page, Auto ads script on content pages only (not on legal or error pages) | Pass | ads.txt="google.com, pub-2870312071451207, DIRECT, f08c47fec0942fa0", pages={'/': (True, True), '/switzerland/': (True, True), '/switzerland/zurich/meilen/':... |
| R38 | Consent: equal-weight buttons, "Only necessary" keeps everything denied, choice remembered, "Privacy settings" in the footer reopens it, analytics never receives the # selections | Pass | equal buttons=True, after decline={'analytics_storage': 'denied', 'ad_storage': 'denied', 'ad_user_data': 'denied', 'ad_personalization': 'denied'}, shown ag... |
| R39 | With Google's certified consent dialog (IAB TCF) active, Nestlyzer's own banner stays hidden and the choice is mirrored (simulated CMP) | Pass | own banner shown=False, mode=tcf, mirrored={'v': 2, 'a': True, 'd': True, 't': 1791743830009, 'src': 'tcf'} |
| R40 | Legal page: imprint, GDPR/FADP privacy policy, AdSense-required disclosures, cookie table, consent withdrawal | Pass | missing=[], 16/16 required items present |
| R41 | Switching country while a place is open: back to the map, no stale place sheet, map points belong to the new country | Pass | tab before=place, after=map, stale sheet visible=False, map points after switch=34997 (France has 35,359) |
| R42 | First visit: a gentle invitation (never a blocking overlay) to a short tour, not shown again, reopened with ? | Pass | invitation first, blocking overlay=False; steps=['Who is moving?', 'Where to look', 'The map', 'The ranking', 'Your shortlist', 'Tools'], shown again=False, ... |
| R43 | New parameters: records, railway/terrain/climate filters (in the link), map layer with real units | Pass | records=21 (Highest terrain), scope 2172→rail≤2km 955→+mountains 248; mild climate 1988; legend="Terrain height (m, within Switzerland) low ≥530 ≥610 ≥670 ≥8" |
| R44 | Compare up to three with photos, verdicts and grouped rows; remove a column; shared compare links open directly; no sea row for Swiss places | Pass | columns=3, verdicts=3, after remove=2, shared link=2, sea row shown=False |
| R45 | Save from a card without opening it, notes survive a reload, shared lists import after the visitor agrees | Pass | opened by heart=CH:4911, note="Visit on Saturday", count=1, after import=3 |
| R46 | Home: set a home, every other place shows the differences | Pass | 🏠 Zürich against your home, Meilen Zürich scores 31 less 29.0× as many residents 2.8× as many people within 10 km 15 km closer to a big city 2.6 km closer to a  |
| R47 | Look-alikes elsewhere in Europe resolve to names and open in their own country | Pass | look-alikes=[' Meersburg (Germany)\nopen', ' Cernobbio (Italy)\nopen', ' Lochau (Austria)\nopen'], opened ['DE', 'Meersburg'] |
| R48 | Tools drawer (11+ tools) and the higher-or-lower game with real values | Pass | tools=14, question="Which one has more people within 10 km?", result="❌ Not this time. Streak: 0 · best: 0 Nex" |
| R49 | Photos with author and licence, lightbox, notable places (UNESCO badge), climate chart and Wikidata facts (simulated Wikimedia, Wikidata and NASA responses) | Pass | strip=6, grid=6, credit="Photographer 1 · CC BY-SA 4.0 · Wikimedia Commons", lightbox→next ok=True, nearby=2 (UNESCO 1), climate svg=1, "July days reach abou... |
| R51 | Search from the home page opens Swiss places (audit: it left an empty shell) | Pass | opened=Zug, rows=100, link=#/explore?cc=CH&p=young_family&sel=CH%3A1711 |
| R52 | Place stories vary (no single opening dominates), avoid stock travel-copy words, and do not repeat lines | Pass | 568 lines for 40 places; most common opening used 15×; banned words=[]; repeated lines=107 |
| R53 | Why not the others: places outside the ranking listed with their reason | Pass | listed=60, reasons="population minimum 744 basics minimum 424 family minimum 351 safety minimum 173" |
| R54 | Builder language choice really filters (French: French-speaking and bilingual cantons only), removable with one tap | Pass | cantons=BE,FR,GE,GR,JU,NE,VD,VS, chip=1, after removing=2172 |
| R55 | Owner bug: picking Germany and a household on the start screen opens Germany with that household (desktop and phone); the button link follows the choice | Pass | {"desktop": ["DE pensioner", "/#/explore?cc=DE&p=pensioner"], "phone": ["DE pensioner", "/#/explore?cc=DE&p=pensioner"]} |
| R56 | Browser back button: place → list → home page (audit: back left the app) | Pass | opened AT:30856; back → view=explore, place open=False, tab=list; back again → landing |
| R57 | One shortlist: "Compare" on a place also saves it; a 4th asks which to replace; ticks survive a reload; the header shows the count; compare opens from the shortlist | Pass | replace dialog=True, ticked=3 (newest in=True), saved=4, header badge=4, after reload same=True, ticks in shortlist=3, compare columns=3 |
| R58 | Greater areas (e.g. Greater Hamburg) and "within X km of a place" as scopes; greater areas are searchable | Pass | Greater Hamburg=196 places (all inside=True); 25 km around Zürich=152 places, furthest 24.9 km, title "Within 25 km of Meilen"; search "Greater Munich" → Gre... |
| R59 | New factors: daylight and sunset through the year, greater area, landscape; sea distance ignores tidal estuaries (Hamburg is not on the coast, Flensburg is) | Pass | Zürich: greater area=Zurich, landscape=None, facts show daylight/sunset=True; Hamburg sea distance=70.6 km (was 15), Flensburg=2 km (was 19) |
| R60 | Everyday life within 1.5 km (OpenStreetMap counts) and the wider region from Eurostat (simulated responses; live services are blocked here) | Pass | amenity tiles=14, "The basics are within walking distance: shopping, school and health ca"; region rows: ['Economic output per person', 'Zürich, 2023', '\t11... |
| R61 | Honest wording: early-data countries say what the rank rests on; the why-card names the measure (not just a category) and never repeats a strength as a watch-out | Pass | card="Ranked on what is known so far: growing (+8.2% in 5 years), 18 km to a city of 100,000+. Local costs, schools "; why="A lot of new housing being built ... |
| R62 | SEO and legal: greater-area pages with lists and structured data, place highlights, country-aware Explore links, terms of use, reporting, accessibility, EU/UK representative section, full storage list | Pass | metro page=True, place page=True, country explore link=True, legal sections=True, in sitemap=True |
| R63 | App-ready: installable manifest with shortcuts, service worker with a versioned cache (pages always fresh), offline page | Pass | shortcuts=['Map', 'Shortlist', 'Families'], worker=activated, controls page=True, cache=nz-2.4.1 |
| R64 | Phone: the compare tray never covers the place action bar, the confirmation toast sits above it, the Shortlist tab is the active one and shows a count | Pass | tray visible on place=False, action bar visible=True, toast bottom 708 < bar top 728, active tab=['saved'], badge=1, overflow=0 |
| R65 | Phone: profile picker sheet; filter sheet sits on top and is usable; Back closes the sheet instead of leaving the page; a tap outside closes it | Pass | profiles in picker=26, picker closed=True, pill="Pensioner couple", sheet on top=True, back closed=True, still exploring=True, tap outside closed=True |
| R66 | Shortlist works across countries (a Swiss place can be removed while exploring Germany); quick country changes end in the last country chosen | Pass | listed in DE=1, left after remove=0, race ends in AT=True |
| R67 | Records tab: every record is a real place in the country, with no broken numbers | Pass | 21 records, broken words=[], outside country=0 |
| R68 | Privacy: with live content switched off, opening a place contacts no third-party service and offers a switch to turn it back on | Pass | third-party requests=0, turn-on buttons=5 |
| R69 | Privacy-first: before a choice and after "Only necessary" the browser contacts no Google service at all; after "Accept all" light Analytics and the ad script (non-personalised) load once each | Pass | requests to Google before choice=0, Google scripts=0, after "Only necessary"=0 (next page 0); after accept: ad script=1, non-personalised=1, analytics loaded... |
| R70 | SEO pages: the profiles overview is styled like the app, and all pages have their own title | Pass | tile style=['solid', '14px', 'flex'], pages checked=5656, duplicate titles=0, titles over 80 chars=0 |
| R71 | Page graphics: country dot map with 10 numbered pins that match the list and link somewhere real; overseas ranks named; residents chart starts at zero; strength bars | Pass | pins=10, names match list=True, France caption="#3 lies outside this map (overseas)", chart bars=6 first/last=0.95, strength bars=11 |
| R72 | Privacy from the map: Tools offers "Privacy settings" (focus goes into the choice) and "Imprint and privacy"; switching live content off stops all outside lookups at once | Pass | tiles=2, banner opened=True, focus in banner=True, outside requests after switching off=0 |
| R73 | About page: the founder interview (14 questions, 4 photos), linked quietly from the footer only, listed in the sitemap, no draft notes left | Pass | questions=14, photos loaded=4, footer link=1, header link=0, in sitemap=True, draft notes left=False |
| R32 | No uncaught JavaScript errors across all flows | Pass | 0 errors: [] |

Also passing: 49 of 49 legacy score fixtures, 60 of 60 builder fixtures, all data checks, and the new smoke test that GitHub runs before every publish.

New in 2.4:

| Test | What it checks |
|---|---|
| R23 | Light Analytics: everything denied by default. "Accept all" grants statistics and ad cookies, never personalised ads. Google signals and ad personalisation are off. |
| R69 | No Google request before a choice or after "Only necessary"; after "Accept all", Analytics and the ad script load once each |
| R71 | Dot-map pins match the list and link to real pages; overseas ranks are named; the chart starts at zero; strength bars |
| R73 | About page: 14 questions and 4 photos, linked only from the footer, in the sitemap, with no draft notes left |
| R72 | Privacy settings in Tools (with focus inside the banner), Imprint and privacy, and live content switched off stops all outside lookups |

## Single file

`nestlyzer.html` was opened straight from disk in Chromium at desktop (1440 x 900) and phone (390 x 844) sizes. Results: home page: light map drawn, 35 country tiles, 0 broken images; Switzerland ranked: 480; place opened: Meilen; France ranked: 35359; search "Genf" opened: Genève; builder countries: 35; phone: France ranked: 35359; start screen Germany + Pensioner couple (desktop): DE pensioner DE #/explore?cc=DE&p=pensioner; start screen Germany + Pensioner couple (phone): DE pensioner DE #/explore?cc=DE&p=pensioner; Austria tile opens: AT explore / AT explore; imprint and privacy open inside the file: True; JavaScript errors: 0.

# 6. Screenshots

Screenshots are in the Word and PDF versions.

# 7. Open items

**For you**

1. Publish 2.4.1 in the browser, as the deploy guide describes:
   - Settings → Actions → allow actions;
   - Settings → Pages → Source: GitHub Actions;
   - create `.github/workflows/site.yml` by pasting the text file;
   - upload both zips;
   - watch the green tick.
2. EU and UK representative: name one each (or a service), or build without Analytics (section 1).
3. AdSense: add the site and turn on Auto ads. Do **not** turn on Google's European consent message.
4. Google Analytics: keep Google signals off and set data retention to 2 or 14 months.
5. Search Console: add nestlyzer.com and submit the sitemap.
6. Confirm that the Lottery winner and High-net-worth profiles should stay out of the "strongest profiles" sentence on place pages. They are left out by design because they are niche.

**For me, next round**

1. The Swiss FSO portraits (2021) and ESTV tax data (2018) need a manual refresh from the current downloads, which this sandbox cannot reach.
2. Postcode search ("8706") needs an open postcode table. Today it says "Postcodes are not searchable yet".
3. After your first push: check the first GitHub run and the live dark-mode map, which cannot be reached from here.
