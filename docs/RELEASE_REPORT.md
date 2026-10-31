---
title: "Nestlyzer 2.0: release and audit report"
subtitle: "Rebuild of nestlyzer.com, ready for GitHub Pages"
date: "10 October 2026"
---

# Verdict

Nestlyzer 2.0 is ready to deploy. All automated checks pass apart from the live-web features (photos, Wikipedia, map tiles, ads, analytics). The build sandbox blocks those hosts, so they must be checked once on the live site.

**Correction to the first delivery.** The `index.html` delivered first was the website's start page, which loads its data from the folders next to it. Opened on its own from disk, it showed an empty frame. That was my error: I had tested the site through a web server, not the file the way you open it. This delivery adds `nestlyzer.html`, the complete app in one file (all 35 countries, 12.4 MB, smaller than the old 18.7 MB file), and it is now tested exactly as you open it: double-clicked from disk, on desktop and phone sizes. The same check found two more bugs, both fixed and covered by tests: after a quick country switch the map could keep the previous country's points, and the booklet logo pointed to a missing file. A final review of the screenshots found one data error: all 122 places in the French overseas departments were filed under Mayotte. They now sit in Guadeloupe, Martinique, French Guiana, Réunion and Mayotte, taken from the official commune code.

| Area | Old v86 | New 2.0 |
|---|---|---|
| First page download (compressed) | 9.7 MB, then 90 MB of data unpacked in the browser | 69 KB |
| Data before the first ranking | Everything, all 35 countries | One country (Switzerland 606 KB) |
| JavaScript errors | Infinite loop on every update, one script broken | 0 across all tested flows |
| Mobile layout | None | Phone-first layout with tab bar and bottom sheet |
| Pages for search engines | 1 | 5,474 plus sitemap |
| Single file to open from disk | 18.7 MB, slow | 12.4 MB, all 35 countries, opens in seconds |
| Advertising and privacy | AdSense not set up; consent only for analytics | AdSense ready, certified consent dialog supported, full privacy policy |
| Features | 37 inventoried, 6 broken or dormant | All 37 working, none removed, plus new ones |
| Scoring | 10 patch layers overriding each other | One tested engine; legacy method reproduced exactly |

# 1. What the audit found in v86

The live site was a single 18.7 MB HTML file built up from ten patch layers (v57 to v86), each overriding the one before.

1. **Infinite loop.** The v57 layer re-declared `refresh()` and then called itself. Every update that went through `refresh()` crashed with "Maximum call stack size exceeded". This is why the KPI strip never showed the best fit.
2. **Broken booklet script.** A literal `</script>` inside a text string cut the v65 script in half. The booklet, the legal rebrand and the advertising policy link never ran, and the leftover JavaScript was printed as visible text below the footer.
3. **Dormant features.** Contacts, the photo gallery, company and jobs cards and the booklet existed in the code but never appeared.
4. **Speed.** Visitors downloaded 9.7 MB and the browser then unpacked 90 MB of JSON for 99,993 records before anything was usable.
5. **Mobile.** There was no mobile layout. The desktop grid was squeezed onto phones.
6. **Search engines.** One page, no sitemap entries for places, so none of the 99,578 places could be found on Google.
7. **Data issues.** 415 duplicate records (old municipality codes still present after mergers in Norway, Latvia, Belgium and Estonia). Access scores for Europe used random fallback values when no anchor matched.
8. **The uploaded `index.html` was truncated** (13.7 MB), apparently from an edit in the GitHub web editor. The rebuild used the complete repository version and the v86 project zip, which are identical.

# 2. What changed

## Architecture

The single file is replaced by a static site:

- a small app page (239 KB, 69 KB compressed) with inline styles and scripts;
- one data file per country, loaded only when that country is opened;
- self-hosted map engine (MapLibre GL) with free OpenFreeMap tiles and an offline fallback;
- 5,474 pre-built pages for search engines;
- publishing as finished files from the repository (GitHub Pages from `main`), with no GitHub Actions.

## Design

- New logo: a nest of arcs with three score bars and a bird, in navy, green, amber and cyan. Favicons, app icons and a social sharing image are generated from it.
- Typography: Bricolage Grotesque for headings, Public Sans for text, both self-hosted.
- A colour system with a full dark mode.
- Home page: every municipality in Europe as a point of light, recoloured live when a visitor hovers over a household profile.
- Explore view: map and ranking side by side, top picks with photos or drawn map postcards, score rings, category bars and radar charts.
- Real flag images for all 35 countries and drawn icons for every profile and category.

## Mobile and future app

- Phone-first layout: tab bar (Map, Ranking, Place, My profile), place panel as a bottom sheet, menu, safe areas for notched phones, touch targets of at least 44 px.
- Installable as a web app (manifest, icons, theme colours). The same build can be wrapped as an app later.

## Discovery and SEO

- Pages for every country, every region, every Swiss municipality, every European town over 30,000 residents and "best places for" pages per profile.
- Each page has its own title, description, canonical link, structured data and breadcrumbs, and links into the interactive map.
- Sitemap and robots file.

## Scoring method v2

v2 is the new default. It keeps the v86 logic and adds what was missing:

- geographic factors computed from coordinates: distance to the nearest hub airport and to the nearest major city, residents within 30 km, distance to the sea;
- deterministic commuter and campus access instead of random fallbacks;
- a new Coastal living profile;
- urban profiles no longer exclude large cities such as Zürich;
- family and senior profiles in Europe require at least 50,000 residents within 30 km, so that remote villages do not top the ranking only because of a few strong factors.

The v86 method is still available for audit with `method=v1` in an explore link. It reproduces the old scores exactly.

## Data corrections

- 415 superseded duplicate records are excluded (Norway 381, Latvia 16, Belgium 11, Estonia 7). 99,578 active places remain.
- 1.7% of places have no published location; they are ranked without the new geographic factors.

## Advertising, analytics, consent and legal

- **Google AdSense** with publisher ID ca-pub-2870312071451207. This ID was not in the Nestlyzer files; it is the AdSense ID on curvescout.com, and one AdSense account serves all of a publisher's sites. Every page carries the AdSense account tag, `ads.txt` is at the root, and Auto ads load on content pages. No ads on the legal page or the error page, as AdSense placement rules require.
- **Consent.** Google requires a Google-certified consent platform (IAB TCF) to show personalised ads in the EEA and the UK (since 16 January 2024) and in Switzerland (since 31 July 2024). The site uses Google's own certified dialog (Privacy & messaging in AdSense) when it is switched on, and otherwise its own banner. Everything (analytics and ad cookies) stays off until the visitor chooses. "Accept all" and "Only necessary" carry equal weight. "Privacy settings" on every page reopens the choice.
- **Google Analytics** (G-HR6G9XFTKZ) with Consent Mode v2. Profile choices, filters and shortlist are not sent to Google: only the page path is recorded.
- **Legal page** (`/legal/`), rewritten: imprint (Torsten Sauter, Alte Landstrasse 77, 8706 Meilen), privacy policy under the Swiss FADP and the GDPR (controller, every service that receives data, purposes, legal bases, transfers to the USA, retention, rights, supervisory authorities), the disclosures the AdSense programme policies require, a cookie table, advertising policy, disclaimer and licences.

# 3. Feature matrix

All 37 features of v86 were inventoried from the code and the running page. Each one is present in 2.0.

| # | Feature | Old v86 | New 2.0 |
|---|---|---|---|
| F01 | Brand header | Dark banner, embedded logo | New logo and mark, sticky header that turns solid on scroll, mobile menu |
| F02 | Advertising disclosure | Box with sponsorship contact | Kept, in the footer and on `/legal/` |
| F03 | Profile chips (24) | Emoji chips | 25 profiles (new: Coastal living) with drawn icons, live map preview on hover |
| F04 | Profile intro line | Text | Profile banner with plain-language description |
| F05 | Run ranking, Map, Search | Run button required | Ranking updates instantly; no Run step |
| F06 | Guided profile builder | Broken (reset, hidden) | Restored: all legacy questions, all 35 target countries, fine-tune sliders, radar against the closest profile, shareable link |
| F07 | Country selector | Yes | Yes, plus search jumps across countries |
| F08 | Region selector, large-country split | Custom split for some countries | Official NUTS regions for all countries (France by NUTS1), Swiss regions kept |
| F09 | Local area selector | Cantons and areas | Cantons and NUTS3 areas |
| F10 | Map layer selector | Yes | Yes, plus every category as a layer |
| F11 | Minimum confidence filter | Yes | Yes, plus filters for residents, distance to a city, airport and the sea |
| F12 | KPI strip | Never updated (bug) | Replaced by a live results header and depth note |
| F13 | Audit / access note | Stale text | Depth note per country, method page, `?method=v1` for audit |
| F14 | Municipality map | Slow, Swiss outlines only on demand | MapLibre vector map, Swiss municipalities and European areas instantly, official GISCO boundaries on demand, dark mode |
| F15 | Language / regional reality panel | Yes | Regional reality tab (languages, student hubs, cross-border) |
| F16 | Cross-border catchments | Yes | Yes |
| F17 | Photo shortlist | Re-rendered on every click | Top picks with photos, or a drawn map postcard when no photo exists |
| F18 | Ranking list | Yes | Fast list with sub-rank chips, six sort orders |
| F19 | Definition tooltips | Yes | Yes, as small explainer pop-ups |
| F20 | Selection sync | Partly broken | Map, list, place panel and URL stay in sync; back button works |
| F21 | Place profile panel | Partly broken | Rebuilt: score ring, category bars, radar, trends, getting around, comparables, breakdown |
| F22 | Wikipedia context | Yes | Yes, matched by official municipal code first |
| F23 | Commons photos | Yes | Yes |
| F24 | Coats of arms and flags | Emoji flags | Real flag images for all 35 countries, coats of arms shown when found |
| F25 | Nearby sights | Yes | Yes |
| F26 | Contacts via Wikidata | Dormant (never shown) | Working: website, email, phone, socials |
| F27 | Commons gallery | Dormant | Working |
| F28 | Company / jobs cards | Dormant | Working |
| F29 | Booklet / PDF export | Broken (script error) | Working booklet page, print layout |
| F30 | Legal footer | Yes | Footer plus a full `/legal/` page (imprint, privacy, terms, advertising) |
| F31 | Scoring engine | 10 patch layers overriding each other | One engine; legacy method reproduced exactly (49/49 fixtures) and available as `?method=v1` |
| F32 | Access proxies | Random fallbacks | Deterministic distances to airports, cities and the sea |
| F33 | Language areas | Yes | Yes, wording corrected |
| F34 | Curated texts | Yes | Yes |
| F35 | Responsive layout | No mobile layout | Built for phones first: tab bar, bottom sheet, safe areas, 44 px touch targets |
| F36 | Misc runtime | Infinite loop in `refresh()` | Removed; zero JavaScript errors across all tested flows |
| F37 | Leaked JavaScript text below the footer | Visible to visitors | Gone |

# 4. Verification

## Engine tests (run on every deploy)

- Legacy parity: 49 of 49 score fixtures from the v86 page reproduced exactly.
- Profile builder: 60 of 60 builder fixtures reproduced exactly.
- Data checks: record counts (99,993 total, 415 superseded), Swiss tax factors and 2019 to 2024 trends kept, distances spot-checked (Meilen to a city of 100k+: 15.2 km; Nice to the sea: 1.2 km).

## Browser regression suite

Run in headless Chromium on desktop and phone sizes against the built site.

Result: **40 pass, 0 fail, 1 not verifiable offline** (2026-10-10 17:42).

| Check | What is tested | Result | Evidence |
|---|---|---|---|
| R01 | Landing page: hero, 25+ profile tiles, 35 countries, FAQ, legal footer, sponsorship, consent banner | Pass | h1="Find where you fit.", profiles=25, countries=35, faq=6, consent=True after 18.6s ['consent open', 'object', None, 'undefined', False], sponsor_link=1 |
| R02 | Ranking list renders after load (legacy defect: 0 rows shown) | Pass | 480 ranked, 100 rows rendered, 9 top-pick cards, #1 Bürglen (TG), 0.98s to results |
| R03 | Method v1 in the browser reproduces legacy v86 rankings exactly | Pass | young_family: n 480/480 match; hnw: n 7/7 match; swiss_lottery: n 2172/2172 match; pensioner: n 793/793 match; student: n 49/49 match |
| R04 | Profile switch re-ranks live and updates the URL | Pass | profile=pensioner, n=793, hash=#/explore?cc=CH&p=pensioner&sel=CH%3A34 |
| R05 | Swiss region and canton filters narrow the scope | Pass | Zurich region scope=519, Zug scope=11, all ZG=True |
| R06 | Name/code filter updates results live (legacy defect: nothing re-rendered) | Pass | scope=1 ['Meilen'] |
| R07 | Confidence slider and new size filter apply live | Pass | conf>=72 scope=12 (min 74.3); +pop>=20k scope=1 (min 24624) |
| R08 | Sort by size (new) | Pass | first row Uster, pops [35007, 31043, 29303, 27277, 24990] |
| R09 | Map colours polygons immediately after ranking (legacy defect: only after Fit scope); layers; leader and cross-border pins | Pass | 2172 polygons coloured, 0 out of scope, legend="Taxes low 34 48 60 72 85+ outs", pins=25 |
| R10 | Place panel: all legacy sections incl. restored jobs card, comparables, cross-border, breakdown, gallery + contact slots | Pass | missing=[], radar=1, sparks=3, gallery/contact/arms slots=[True, True, True] |
| R11 | Shortlist (new): save, survives reload, listed in Shortlist tab | Pass | Shortlist 1 saved place. Stored only in this browser. Compare Download CSV Zür |
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
| R30 | Performance: legacy shipped one 18.7 MB HTML (90 MB JSON parsed in the browser) | Pass | gzip transfer KB: {'/': 71, '/data/meta.json': 53, '/data/c/CH.json': 606, '/data/c/FR.json': 1908, '/data/geo/ch.topo.json': 139, '/vendor/maplibre-gl.js': ... |
| R31 | Wikipedia/Wikidata/Commons/Overpass enrichment (photos, extracts, arms, contacts, sights, gallery) | Not verifiable here | Hosts blocked in this sandbox; panel renders without them and slots stay empty, no errors. Must be checked on the live site. |
| R33 | Search finds exonyms, Nordic letters, Greek and Cyrillic places; exact city first (Lisbon and Skopje are split into parishes/municipalities in the official data, so the region comes first) | Pass | {"Kobenhavn": "København", "Genf": "Genève", "Roma": "Roma", "Vienna": "Wien", "Athens": "Αθηναίων Athinaion", "Lisbon": "Área Metropolitana de Lisboa", "san... |
| R34 | Mobile: header turns solid on scroll, menu with links; Coastal on a landlocked default switches to a coastal country | Pass | transparent at top=True, solid when scrolled=True, menu links=5, coastal country=PT |
| R35 | Builder starts from the current country (all 35 selectable); flag renders at 4:3; one resident figure (latest year) everywhere | Pass | target=FR, choices=35, flag=[16, 12], Bürglen display 4067 (scoring base 3959) |
| R36 | Map markers never overlap (phone width, Switzerland): lower-ranked pins hide until zoomed in | Pass | visible pins=12, overlapping pairs=0 |
| R37 | AdSense ready: ads.txt, account meta on every page, Auto ads script on content pages only (not on legal or error pages) | Pass | ads.txt="google.com, pub-2870312071451207, DIRECT, f08c47fec0942fa0", pages={'/': (True, True), '/switzerland/': (True, True), '/switzerland/zurich/meilen/':... |
| R38 | Consent: equal-weight buttons, "Only necessary" keeps everything denied, choice remembered, "Privacy settings" in the footer reopens it, analytics never receives the # selections | Pass | equal buttons=True, after decline={'analytics_storage': 'denied', 'ad_storage': 'denied', 'ad_user_data': 'denied', 'ad_personalization': 'denied'}, shown ag... |
| R39 | With Google's certified consent dialog (IAB TCF) active, Nestlyzer's own banner stays hidden and the choice is mirrored (simulated CMP) | Pass | own banner shown=False, mode=tcf, mirrored={'v': 2, 'a': True, 'd': True, 't': 1791646914276, 'src': 'tcf'} |
| R40 | Legal page: imprint, GDPR/FADP privacy policy, AdSense-required disclosures, cookie table, consent withdrawal | Pass | missing=[], 16/16 required items present |
| R41 | Switching country while a place is open: back to the map, no stale place sheet, map points belong to the new country | Pass | tab before=place, after=map, stale sheet visible=False, map points after switch=34997 (France has 35,359) |
| R32 | No uncaught JavaScript errors across all flows | Pass | 0 errors: [] |

## Single-file version opened from disk

`nestlyzer.html` opened directly from disk in Chromium, desktop (1440 x 900) and phone (390 x 844): home page with the light map of Europe, 35 country tiles, no broken images; Switzerland ranked (480 places for Young family) with the map; Meilen opened; France ranked (35,359 places); search "Genf" finds and opens Genève; builder with 35 target countries; 0 JavaScript errors.

## Two rounds of independent UI review

Two independent reviews looked at every screen on desktop and phone. The first reported 2 critical and 8 major issues plus minor ones; the second reported further layout, wording and mobile issues. All were fixed, and the fixes are anchored as regression checks (R13 to R36). The final screenshot pass found one more bug: map markers that should hide when they overlap stayed visible. It is fixed and covered by R36. Examples: the back button left the builder open, custom-profile links lost the weights, the header was unreadable over the hero on phones, markers overlapped, coastal on a landlocked country, flags stretched, Macedonian and Nordic place names missing from search.

## Performance

| Resource | Compressed size |
|---|---|
| App page | 69 KB |
| Shared metadata | 53 KB |
| Switzerland data | 606 KB |
| France data (largest) | 1.9 MB |
| Swiss outlines | 139 KB |
| Map engine (loaded when the map opens) | about 207 KB |

France, the largest country with 35,359 places, ranks in 1.8 seconds in a browser without a graphics card.

# 5. Screenshots

Screenshots of the old and new site are included in the Word and PDF versions of this report.

# 6. Not verified in the build sandbox

The sandbox blocks these hosts, so they work in code but have not been seen working:

- OpenFreeMap map tiles (the map falls back to its own outline style without them, tested);
- Wikipedia, Wikidata and Wikimedia Commons (photos, text, coats of arms, contacts, gallery);
- Overpass (nearby sights);
- Eurostat GISCO (official municipal boundaries on demand);
- Google Analytics network calls;
- Google AdSense ads and Google's consent dialog (simulated in test R39; the real dialog appears once you publish it in AdSense).

The place panel renders cleanly without them, with no errors. A five-minute check on the live site covers all of them.

# 7. Open items

I am not a lawyer. The legal texts follow the FADP, the GDPR and the AdSense programme policies as they stand, but they have not been checked by a lawyer.

## For Claude

- Check the live site after the push: map tiles, photos, Wikipedia, sights, boundaries, the consent dialog, ads and analytics. This can only happen once the site is live.

## For Anton

- Push the site: GitHub Desktop (route A in the deploy guide, one commit, one push), or give Claude push access (route B).
- AdSense: add nestlyzer.com under Sites, create the European regulations message (EEA, UK, Switzerland) with consent mode on, switch on Auto ads with anchor at the top or off and vignettes off (deploy guide, last section).
- Google Analytics: data retention 14 months or less.
- Decide on an EU representative (GDPR Art. 27). A controller outside the EU that tracks EU visitors may need one unless the processing is only occasional. Not appointed so far; the privacy policy names none. Ask a lawyer, or accept the small risk knowingly.
- Clean up the old files in the repository later (as agreed; they do no harm).
- Confirm the declared changes: scoring method v2 as default, 415 duplicate records excluded.

# 8. Improvements for the next stage

1. City entries in search for cities that the official data splits into parishes or municipalities (Lisbon, Skopje). Today search shows their region first, which is correct but less direct.
2. Photos cached at build time for the top picks of each country, so the first view never waits for Wikipedia.
3. Native app shell (Capacitor) on top of the same build, with offline country packs.
4. More languages for the static pages (German and French first) to widen search reach.
5. Live data refresh: a scheduled GitHub Action that rebuilds when Eurostat or the Swiss statistics office publish new figures.
