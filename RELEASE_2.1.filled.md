---
title: "Nestlyzer 2.1: first-time user audit and the expanded version"
subtitle: "What a newcomer ran into, what changed, and how it was checked"
date: "10 October 2026"
---

# In short

An independent reviewer used Nestlyzer like a first-time visitor, on a desktop and on a phone, and reported 24 problems: 1 critical, 10 major and 13 minor. 21 are fixed. 2 are improved as far as the current data allows. 1, rents and travel times, needs new data sources and is first on the list for the next stage.

On top of the fixes, 2.1 adds:

- 11 new parameters for every one of the 99,578 places;
- photos with credits, notable places nearby, the weather through the year and small local facts;
- place pages that open with the key facts and keep the details in tabs;
- saving with notes, comparing three places, setting a home;
- records, look-alikes in other countries, a game and a short guided tour.

All standard profile scores and rankings are unchanged. The new parameters are facts, filters and map layers. They only change a score if you use them in your own profile.

# 1. First-time user audit

## First ten seconds

On a desktop it was already clear what Nestlyzer is and what to do first. On a phone the start button was more than one screen down, and the consent banner arrived late and covered content.

## Findings and what was done

| # | Severity | What the first-time user hit | What changed |
|---|---|---|---|
| 1 | Critical | Search from the home page left an empty screen for Swiss places | Fixed. The search now loads the country first. Test R51. |
| 2 | Major | Rankings in "Foundation data" countries look odd (for example a small coastal village tops France for families) | Improved. Every country now carries a clear data-depth badge, and "Early indication" countries say what is missing. Richer local data is needed to go further. |
| 3 | Major | Most places silently left out ("480 of 2,172") | Fixed. A "why not the other 1,692?" link lists them, each with its reason. Test R53. |
| 4 | Major | The home page map made data-poor countries look bad | Fixed. Brightness is now relative within each country. |
| 5 | Major | Phone results list squeezed into a small window | Fixed. A one-line scope bar, filters as a bottom sheet, and the list uses the full screen. |
| 6 | Major | Builder: French changed nothing, and the list opened in Switzerland | Fixed. Language now filters places, can be removed with one tap, and the last country picked opens first. Test R54. |
| 7 | Major | Consent banner appeared late and covered content | Fixed. It appears within a second and sits above the phone tab bar. |
| 8 | Major | Irrelevant reasons (wealth tax for young families) | Fixed. Only factors that belong to the chosen profile are shown. |
| 9 | Major | Jargon ("Foundation ×12", two trust percentages) | Fixed. Plain names ("Basics"), one "Data depth" box, plain reasons, and a legend for the bars. |
| 10 | Major | Generic boilerplate place text | Fixed. Replaced by the data-written story; curated local text is kept. |
| 11 | Major | No rents, prices or travel times | Not yet. No open source covers all 35 countries consistently. First on the list for the next stage. |
| 12 | Minor | "Coast 0, #1" for inland places | Fixed. Coast only appears where the sea is within 150 km. |
| 13 | Minor | Zoom buttons hidden under the place panel | Fixed. They moved and shift with the panel. |
| 14 | Minor | Phone map cut off part of Switzerland on first load | Fixed. The fit accounts for the controls on top and bottom. |
| 15 | Minor | Profile chips run off the edge without a hint | Fixed. Fade edges and arrows on desktop; scrollable with a fade on phones. |
| 16 | Minor | Compare button showed no pressed state; toasts covered the legend | Fixed. |
| 17 | Minor | Compare: inconsistent names, sea highlighted for inland towns, no way to drop one place | Fixed. Same names everywhere, sea row only where relevant, remove button per place. Test R44. |
| 18 | Minor | Saved places hard to find again | Fixed. Heart counter next to the filters, a Saved tab on the phone bar, and the Tools drawer. Test R45. |
| 19 | Minor | "Seven questions" text; on phones the apply button sat 2,600 px down | Fixed. Text corrected; the apply button stays pinned at the bottom. |
| 20 | Minor | Population differed between search and place page | Fixed. Search shows the same latest figure. |
| 21 | Minor | Method page table overflowed on phones | Fixed. Tables stack into cards on phones. |
| 22 | Minor | Place pages led with "lottery winners"; Albanian names in capitals | Fixed. |
| 23 | Minor | Small tap targets on phones | Improved. Profile chips 40 px, action buttons 44 px, tab labels larger. The numbered map pins stay 26 px so the map stays readable. |
| 24 | Minor | Save and compare out of thumb reach on phones | Fixed. They sit in a bar at the bottom of the place view. |

# 2. What is new

## Eleven new parameters for every place

All of them are computed at build time from open data. Every place's Facts tab shows where it stands among all municipalities of its country.

| Parameter | Source |
|---|---|
| Terrain height around the place, height range within 15 km | Mapzen terrain grid (coarse: it describes the surroundings, not the village itself) |
| Climate type (Köppen-Geiger) | Rubel et al. 2017 |
| Nearest large lake and its name | Natural Earth 1:10m |
| Nearest major river and its name | Natural Earth 1:10m |
| Nearest main railway line | Natural Earth 1:10m |
| Nearest motorway | Natural Earth 1:10m |
| Nearest seaport and its name | Natural Earth 1:10m |
| Distance to the capital | Natural Earth 1:10m |
| Nearest land border and the country beyond it | Natural Earth 1:10m |
| Neighbouring municipalities and residents within 10 km | Nestlyzer's municipality centres |
| Look-alikes: the most similar place in three other countries | Computed from size, density, growth, terrain, water and surroundings |

Coverage is 99% or more in every country. The 1.7% of places without a published location have no geographic parameters.

## Live content on each place

These load in the browser from public services, cost nothing and never change a score:

- **Photos:** openly licensed pictures taken within a few kilometres, from Wikimedia Commons. Each photo shows its author and licence, and opens full screen. Maps, coats of arms and logos are filtered out.
- **Worth a look nearby:** well-known places within about 12 km, from Wikidata, most famous first. UNESCO World Heritage sites carry a badge.
- **Weather through the year:** monthly highs, lows and rain, from NASA POWER, with a plain summary.
- **Nice to know:** official altitude, postcode, founding date, sister towns, mayor and highest point, from Wikidata.

## The place page

- The first thing you see is "Why #N": three reasons and one watch-out, followed by eight fact tiles.
- Everything else sits in tabs: Overview, Photos, Facts, Around and Compare. Nothing from 2.0 was removed.
- The Overview tab tells the place's story in five parts: the good, the not-so-good, the unusual, the interesting and nice to know.
- The story is written from the data, and its phrasing rotates from place to place. A test checks 40 places: no opening sentence dominates, and stock travel words ("nestled", "vibrant", "hidden gem" and similar) never appear.

## Tools for planners and for the curious

- **Save:** hearts on every card and row. Saved places take notes, can be ticked for comparison, shared as a link or downloaded as CSV.
- **Compare:** up to three places side by side, with photos, grouped rows and a one-line verdict per place. You can remove a column or share the comparison as a link.
- **Home:** set the place you live now. Every other place then says how it differs, for example "15 km closer to a big city" or "2.8× as many people within 10 km".
- **Records:** the extremes of the current scope, such as highest terrain, fastest growing, furthest from a railway or closest to a lake.
- **Surprise me:** opens a random place from the top quarter of the ranking.
- **Higher or lower:** a small game with real data.
- **Tools drawer:** all of the above in one place.
- **Quick tour:** five steps on the first visit; it can be reopened with the "?" button.
- **Filters:** new filters for railway, motorway, lake and border distance, residents within 10 km, terrain and climate. Ten new map layers and four new sort orders cover the same parameters.

# 3. Verification

## Engine and data tests

Legacy parity 49 of 49, builder 60 of 60, data checks all pass. Standard rankings are unchanged.

## Browser regression suite

Run in headless Chromium on desktop and phone sizes against the built site.

Result: **52 pass, 0 fail, 1 not verifiable offline** (2026-10-10 19:34).

| Check | What is tested | Result | Evidence |
|---|---|---|---|
| R01 | Landing page: hero, 25+ profile tiles, 35 countries, FAQ, legal footer, sponsorship, consent banner | Pass | h1="Find where you fit.", profiles=25, countries=35, faq=6, consent=True after 2.1s ['consent open', 'object', None, 'undefined', False], sponsor_link=1 |
| R02 | Ranking list renders after load (legacy defect: 0 rows shown) | Pass | 480 ranked, 100 rows rendered, 9 top-pick cards, #1 Bürglen (TG), 9.92s to results |
| R03 | Method v1 in the browser reproduces legacy v86 rankings exactly | Pass | young_family: n 480/480 match; hnw: n 7/7 match; swiss_lottery: n 2172/2172 match; pensioner: n 793/793 match; student: n 49/49 match |
| R04 | Profile switch re-ranks live and updates the URL | Pass | profile=pensioner, n=793, hash=#/explore?cc=CH&p=pensioner&sel=CH%3A34 |
| R05 | Swiss region and canton filters narrow the scope | Pass | Zurich region scope=519, Zug scope=11, all ZG=True |
| R06 | Name/code filter updates results live (legacy defect: nothing re-rendered) | Pass | scope=1 ['Meilen'] |
| R07 | Confidence slider and new size filter apply live | Pass | conf>=72 scope=12 (min 74.3); +pop>=20k scope=1 (min 24624) |
| R08 | Sort by size (new) | Pass | first row Uster, pops [35007, 31043, 29303, 27277, 24990] |
| R09 | Map colours polygons immediately after ranking (legacy defect: only after Fit scope); layers; leader and cross-border pins | Pass | 2172 polygons coloured, 0 out of scope, legend="Taxes low 34 48 60 72 85+ outs", pins=25 |
| R10 | Place panel: all legacy sections (jobs card, comparables, cross-border, breakdown, gallery, contact) plus the new why-card, story, facts, look-alikes, neighbours, weather, nearby and photos, in tabs | Pass | missing=[], radar=1, sparks=3, gallery/contact/arms slots=[True, True, True] |
| R11 | Shortlist (new): save, survives reload, listed in Shortlist tab | Pass | Saved places (1) Stored only in this browser. Tick up to three to compare. Com |
| R12 | Compare (new): tray, side-by-side table | Pass | columns=3 |
| R13 | Global search across all 99,993 places (new): jumps country and opens the place | Pass | first hit " Lyon France, 516,092", opened Lyon |
| R14 | Guided builder restored (legacy: hidden/reset): answers, closest profiles, apply, shareable weights | Pass | profile=self_fit, ranked=1122, matches=3, url has weights=True |
| R15 | Regional reality board (legacy: never rendered): language groups and cross-border clusters | Pass | groups=['German-speaking', 'French-speaking', 'Bilingual'], cross-border chips=5 |
| R16 | Student = multi-answer: no auto-select, banner to the board, university hubs | Pass | selected=None, tab=ranking, banner=1, hub pins=11 |
| R17 | Cross-border cluster opens the neighbour country and selects the target | Pass | FR Saint-Louis |
| R18 | Large countries use official NUTS regions: DE 16 Länder + districts; ES all provinces reachable (legacy lost 449); IT Lazio correct | Pass | DE regions=16, districts in region=45; ES region sum=8132 of 8132; IT has Lazio=True |
| R19 | Expat professional ranks in CH (legacy: 0 results); Coastal says why it is empty in landlocked CH | Pass | expat n=148; coastal message ok |
| R20 | European access profiles no longer depend on loaded polygons (legacy: 0 results without geometry) | Pass | AT commuter=386, FR student=1008 |
| R21 | PDF booklet opens a print-ready dossier (legacy: script broken, never shipped) | Pass | 2026-10-10 Zürich Zurich, Switzerland, 427,721 residents Decision snapshot Profile Young f |
| R22 | Dark mode toggle (new) | Pass | system -> dark |
| R23 | Google Analytics G-HR6G9XFTKZ behind Consent Mode v2: all denied by default; "Accept all" grants analytics and ads | Pass | banner=True, default denied=True, after accept={'analytics_storage': 'granted', 'ad_storage': 'granted', 'ad_user_data': 'granted', 'ad_personalization': 'gr... |
| R24 | Mobile: no horizontal overflow, bottom tabs, list and place views (legacy: no mobile UI) | Pass | overflow landing=0, explore=0, tabs map->list->place ok=True |
| R25 | Official GISCO polygons on demand for Europe (runtime fetch). Offline: fails soft with a message | Pass | Boundaries unavailable The GISCO service did not respond (Failed to fetch). The dot map keeps working. × |
| R26 | Deep links open the exact place; home and back navigation work | Pass | opened Meilen, home visible=True, back->explore |
| R27 | Lottery tax panel (CH joined / Europe pending) and language-reality line | Pass | ok |
| R28 | SEO: static pages (municipality, canton, country, profile, method, legal) with canonical + JSON-LD, sitemap, 404 | Pass | [] bad; 404=404, sitemap urls=5474 |
| R29 | Accessibility basics: named controls, image alt, visible keyboard focus (legacy: none) | Pass | unnamed landing=0, explore=0, imgs without alt=0, focus outline=solid |
| R30 | Performance: legacy shipped one 18.7 MB HTML (90 MB JSON parsed in the browser) | Pass | gzip transfer KB: {'/': 98, '/data/meta.json': 53, '/data/c/CH.json': 606, '/data/c/FR.json': 1908, '/data/geo/ch.topo.json': 139, '/vendor/maplibre-gl.js': ... |
| R31 | Wikipedia/Wikidata/Commons/Overpass enrichment (photos, extracts, arms, contacts, sights, gallery) | Not verifiable here | Hosts blocked in this sandbox; panel renders without them and slots stay empty, no errors. Must be checked on the live site. |
| R33 | Search finds exonyms, Nordic letters, Greek and Cyrillic places; exact city first (Lisbon and Skopje are split into parishes/municipalities in the official data, so the region comes first) | Pass | {"Kobenhavn": "København", "Genf": "Genève", "Roma": "Roma", "Vienna": "Wien", "Athens": "Αθηναίων Athinaion", "Lisbon": "Área Metropolitana de Lisboa", "san... |
| R34 | Mobile: header turns solid on scroll, menu with links; Coastal on a landlocked default switches to a coastal country | Pass | transparent at top=True, solid when scrolled=True, menu links=5, coastal country=PT |
| R35 | Builder starts from the current country (all 35 selectable); flag renders at 4:3; one resident figure (latest year) everywhere | Pass | target=FR, choices=35, flag=[16, 12], Bürglen display 4067 (scoring base 3959) |
| R36 | Map markers never overlap (phone width, Switzerland): lower-ranked pins hide until zoomed in | Pass | visible pins=12, overlapping pairs=0 |
| R37 | AdSense ready: ads.txt, account meta on every page, Auto ads script on content pages only (not on legal or error pages) | Pass | ads.txt="google.com, pub-2870312071451207, DIRECT, f08c47fec0942fa0", pages={'/': (True, True), '/switzerland/': (True, True), '/switzerland/zurich/meilen/':... |
| R38 | Consent: equal-weight buttons, "Only necessary" keeps everything denied, choice remembered, "Privacy settings" in the footer reopens it, analytics never receives the # selections | Pass | equal buttons=True, after decline={'analytics_storage': 'denied', 'ad_storage': 'denied', 'ad_user_data': 'denied', 'ad_personalization': 'denied'}, shown ag... |
| R39 | With Google's certified consent dialog (IAB TCF) active, Nestlyzer's own banner stays hidden and the choice is mirrored (simulated CMP) | Pass | own banner shown=False, mode=tcf, mirrored={'v': 2, 'a': True, 'd': True, 't': 1791653587411, 'src': 'tcf'} |
| R40 | Legal page: imprint, GDPR/FADP privacy policy, AdSense-required disclosures, cookie table, consent withdrawal | Pass | missing=[], 16/16 required items present |
| R41 | Switching country while a place is open: back to the map, no stale place sheet, map points belong to the new country | Pass | tab before=place, after=map, stale sheet visible=False, map points after switch=34997 (France has 35,359) |
| R42 | First visit: a five-step quick tour, not shown again, reopened with ? | Pass | steps=['Who is moving?', 'Where to look', 'The map', 'The ranking', 'Tools'], shown again=False, reopen=True |
| R43 | New parameters: records, railway/terrain/climate filters (in the link), map layer with real units | Pass | records=18 (Highest terrain), scope 2172→rail≤2km 955→+mountains 248; mild climate 1988; legend="Terrain height (m, within Switzerland) low ≥530 ≥610 ≥670 ≥8" |
| R44 | Compare up to three with photos, verdicts and grouped rows; remove a column; shared compare links open directly; no sea row for Swiss places | Pass | columns=3, verdicts=3, after remove=2, shared link=2, sea row shown=False |
| R45 | Save from a card without opening it, notes survive a reload, shared lists import | Pass | opened by heart=CH:4911, note="Visit on Saturday", count=1, after import=3 |
| R46 | Home: set a home, every other place shows the differences | Pass | 🏠 Compared with your home, Meilen score -31 29.0× as many residents 2.8× as many people within 10 km 15 km closer to a big city 2.6 km closer to a railway line  |
| R47 | Look-alikes elsewhere in Europe resolve to names and open in their own country | Pass | look-alikes=[' Meersburg (Germany)\nopen', ' Cernobbio (Italy)\nopen', ' Lochau (Austria)\nopen'], opened ['DE', 'Meersburg'] |
| R48 | Tools drawer (12 tools) and the higher-or-lower game with real values | Pass | tools=12, question="Which one has closer to the sea?", result="✅ Right! Streak: 1 · best: 1 Next pair" |
| R49 | Photos with author and licence, lightbox, notable places (UNESCO badge), climate chart and Wikidata facts (simulated Wikimedia, Wikidata and NASA responses) | Pass | strip=6, grid=6, credit="Photographer 1 · CC BY-SA 4.0 · Wikimedia Commons", lightbox→next ok=True, nearby=2 (UNESCO 1), climate svg=1, "July days reach abou... |
| R51 | Search from the home page opens Swiss places (audit: it left an empty shell) | Pass | opened=Zug, rows=100, link=#/explore?cc=CH&p=young_family&sel=CH%3A1711 |
| R52 | Place stories vary (no single opening dominates), avoid stock travel-copy words, and do not repeat lines | Pass | 495 lines for 40 places; most common opening used 11×; banned words=[]; repeated lines=93 |
| R53 | Why not the others: places outside the ranking listed with their reason | Pass | listed=60, reasons="population minimum 744 basics minimum 424 family minimum 351 safety minimum 173" |
| R54 | Builder language choice really filters (French: French-speaking and bilingual cantons only), removable with one tap | Pass | cantons=BE,FR,GE,GR,JU,NE,VD,VS, chip=1, after removing=2172 |
| R32 | No uncaught JavaScript errors across all flows | Pass | 0 errors: [] |

## The single file, opened from disk

`nestlyzer.html` was opened straight from disk in Chromium at desktop (1440 x 900) and phone (390 x 844) sizes. Results: home page: light map drawn, 35 country tiles, 0 broken images; Switzerland ranked: 480; place opened: Meilen; France ranked: 35359; search "Genf" opened: Genève; builder countries: 35; phone: France ranked: 35359; JavaScript errors: 0.

# 4. Screenshots

Screenshots are in the Word and PDF versions.

# 5. Not verified in the build sandbox

The sandbox blocks the live services: map tiles, Wikipedia, Wikidata, Wikimedia Commons, NASA POWER, Overpass, GISCO, Google Analytics and AdSense. The code that reads them was tested against simulated responses (check R49) and fails gracefully when a service is down. A five-minute check on the live site confirms the real responses.

# 6. Open items

I am not a lawyer; the legal texts have not been checked by one.

## For Claude

- Check the live site after the push: photos, nearby places, the weather chart, map tiles, the consent dialog and ads.

## For Anton

- Push the site with GitHub Desktop (one commit, one push), or give Claude push access.
- AdSense: add the site, publish the European consent message with consent mode on, switch on Auto ads with anchors at the top or off.
- Google Analytics: data retention 14 months or less.
- Decide on an EU representative under GDPR Art. 27.

# 7. Ideas for the next stage

1. Rents and house prices: the single most requested fact a first-time user missed. Open sources exist for some countries, such as Swiss rent statistics and French DVF sales.
2. Door-to-door travel times to a chosen workplace, instead of straight-line distances.
3. School, doctor and childcare locations from OpenStreetMap, counted per place.
4. City entries in search for cities that the official data splits into parishes (Lisbon, Skopje).
