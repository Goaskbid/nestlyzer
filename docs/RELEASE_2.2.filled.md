---
title: "Nestlyzer 2.2: audited twice, simpler to use, more to discover"
subtitle: "The Germany bug, one shortlist, greater areas, new factors, legal, app readiness and search engines"
date: "11 October 2026"
---

# In short

**The Germany bug is fixed.** Choosing Germany on the start screen of the single-file version opened Switzerland. That no longer happens, and an automatic test checks it on desktop and phone, in both the website and the single file.

**Two independent first-time-user audits.** Before the work started, a reviewer used Nestlyzer like a newcomer and found 32 problems. After the fixes, a second reviewer checked everything again, tried to break it, and found 20 more, mostly smaller. All 52 are fixed, except three that need outside data and are listed under open items.

**Saving and comparing are now one thing: the shortlist.**

- Every place has two labelled buttons, ♥ Save and ☐ Compare.
- The shortlist is always one tap away: top right on a computer, bottom tab on a phone, with a count.
- Tick two or three places and press Compare.
- Everything survives a reload, and the back button works like in any app.

**Big countries are easier to explore.**

- 197 "Greater …" areas, for example Greater Hamburg, Greater Munich, Greater Paris and Greater Zurich.
- "Explore around this place: 10 / 25 / 50 km" on every place.
- Cities that the statistics split into districts (Lisbon, Porto, Dublin, Bratislava, Belgrade) can be chosen as a whole city.

**More to discover on every place.**

- Built in for every place:
  - daylight and sunset times through the year;
  - the landscape (Alps, Jura, Pyrenees, Riviera …);
  - the name of the sea;
  - the greater area it belongs to.
- Loaded live when you open a place:
  - everyday life within walking distance (schools, shops, doctors, playgrounds, stations), counted from OpenStreetMap;
  - the wider region at a glance from Eurostat (economic output, unemployment, life expectancy, median age, doctors).

**More legal protection.** The site now has terms of use, a way to report problems, an accessibility statement, an honest section on the EU and UK representative, and a complete list of everything stored in the browser.

**Ready for an app and for search engines.**

- Nestlyzer can be installed to the home screen and works offline for places already seen.
- 186 new pages for search engines, 5,660 in total.
- Every place page now has a "Good to know" section.

**Scores.** Swiss scores did not change. Three deliberate data fixes changed some scores elsewhere; section 4 explains them.

# 1. The Germany bug

The single file packs the whole site into one HTML page. A small helper inside it caught every click on an internal link and sent it to the app's address. The "Show my places" button was a link with Switzerland written into it, so the helper won the race against the app and opened Switzerland, whatever you had chosen.

Three changes fix it:

- The helper now only acts on clicks the app has not already handled.
- The button's link changes as soon as you pick a country or a household.
- In the single file, links to country, region, profile and place pages now open inside the app. The imprint, privacy policy and method open as a readable page inside the file, instead of trying to reach the internet.

Tests R55 (website) and the standalone check (single file) choose Germany with "Pensioner couple" on desktop and phone and confirm that Germany opens with that household.

# 2. What the newcomers ran into, and what changed

## First audit (32 findings)

| Finding | What changed |
|---|---|
| Germany opened Switzerland (single file) | Fixed, see section 1 |
| The back button left the app | Back now closes an open place, then a window, then returns to the start page |
| Compare was lost on reload | The shortlist and its ticks are stored like everything else |
| Save and compare were two separate systems with different icons | One shortlist. ♥ Save and ☐ Compare are labelled; ticking Compare also saves the place |
| The compare icon meant different things in different places | The icon is gone; the buttons have words |
| The place tab "Compare" showed look-alikes | Renamed "Similar" |
| On a phone the compare tray covered the place buttons | The tray is hidden on the place view; the place bar has its own Compare button |
| No feedback, and the oldest place was silently dropped | Every action confirms itself and offers the next step ("Compare 2 now", "View shortlist", "Undo"); a fourth tick asks which place to replace |
| The tour covered the screen after 3 seconds | Replaced by a small invitation that never blocks anything |
| No way to look "around Hamburg" | Greater areas, a radius around any place, and whole cities |
| Search: "Lisbon", "Brussels", "Muenchen" | City names in English and in other languages, umlaut spellings, whole cities, and greater areas all work |
| Countries with little data claimed "Family is the lead signal" | They now say what the rank rests on, for example "growing, 18 km to a city of 100,000+, railway 1 km away" |
| A strength was repeated as a watch-out | Never repeated |
| "Costs" was used for new housing units | The why-card names the measure: "a low social-assistance rate (1.2%), better than 88% of Swiss municipalities" |
| Hamburg was "15 km from the sea" | The sea distance ignores tidal estuaries: Hamburg is now 71 km from the sea. It also uses a finer coastline, which puts Flensburg on the fjord at 2 km instead of 19 |
| "Why not the other 1,692?" did not explain | It now scrolls to the explanation with the reasons |
| Top picks scrolled sideways with no hint | Arrow buttons |
| The loading card and map note hid controls | Moved |
| The phone "Saved" tab highlighted "Ranking" | Fixed; the tab is now "Shortlist" with a count |
| Touch targets were too small | Map buttons are 40 px and markers 32 px with a larger tap area |
| The compare table showed 1.5 places on a phone | The label column is narrow and stays visible while you scroll sideways |
| "Saved", "shortlist" and "Saved places" were all used | It is "shortlist" everywhere |
| "Compared with your home: Meilen score +6" | "Bürglen scores 6 more" |
| Game grammar | All questions rewritten, and two new ones about light |
| Records without units, "Fewest neighbours 0" | Units with correct singular and plural; "Most isolated" |
| "score -14.4 / rank +296" | "14 points lower, 296 places further down" |
| Profile tiles read like notes ("Windfall profile") | Plain one-line descriptions |
| A place page's "Open in Nestlyzer" opened the lottery profile | It opens the household the place suits best |
| "not ranked: Lifestyle floor" | "below the minimum for lifestyle", and an explanation of why the totals differ |
| The "Explore" link always opened Switzerland | It opens the country, region or greater area of the page |
| The legal page missed storage keys and other points | Complete; see section 5 |
| The consent banner covered the start button on phones | More compact; the page leaves room for it |

## Second audit (20 findings)

| Finding | What changed |
|---|---|
| Imprint and privacy could not be opened in the single file | They open inside the file |
| The tour invitation covered Save and Compare on phones | Shown only on the map |
| "No photos found" when the service was blocked | Says "could not be loaded right now" with a Try again button; the same for notable places, everyday life and regional statistics |
| Portugal: "191 km to a city of 100,000+" from Lisbon | Fixed in the data, see section 4 |
| Places in different countries were compared on scores measured within each country | The compare view says so and only compares absolute values across borders |
| Shortlist scores differed by one point from the place view | Same rounding everywhere |
| A message covered the compare window | Messages close when a window opens |
| Keyboard: 110 tabs to reach the consent banner; focus escaped the tools drawer | The banner comes first; opening a place moves focus to its name; windows and the drawer keep focus inside |
| Phone messages covered the back button | They appear at the bottom, above the buttons |
| "Lisbon" did not offer the city | "Lisbon, the whole city (24 districts)" comes first |
| "Compare 0" showed with nothing ticked | Hidden until two places are ticked (and hidden elements now stay hidden everywhere) |
| Unticking gave no feedback; no undo after removing | Both added |
| Back reopened the automatically selected first place | The first place is no longer written into the address, so back closes the panel |
| The compare table label column showed text through it | Solid background |
| "Greater Zurich" in Germany's menu | "Greater Zurich (part in Germany)" |
| /best/ gave "not found" | A page listing all profiles |
| "1 residents per km²" | Correct singular |
| "Mediterranea-n" broke badly | Long words hyphenate properly |
| The header map link on greater-area pages lost the area | It keeps it |
| Two places both "won on jobs" | Ties are shown as ties |

Not changed on purpose: places open automatically for most profiles on a computer, but not for students and expats, because their answer is usually a city plus a region rather than one place.

# 3. What is new

## One shortlist

- **Save** keeps a place, with notes, across countries and profiles.
- **Compare** ticks it for side-by-side comparison and also saves it.
- The **Shortlist** sits in the header on a computer and in the bottom bar on a phone. It shows the count.
- In the shortlist you tick two or three places and press **Compare ticked**. The comparison shows photos, grouped rows, the winner of each row and a verdict per place.
- The list can be shared as a link or downloaded as a spreadsheet.

## Greater areas, radius and whole cities

- **Greater areas:** every municipality whose nearest big city is, for example, Hamburg, within a radius that grows with the city (20 km for a city of 250,000 people, about 40 km for Hamburg, 60 km for Paris or London). There are 197 of them, including cross-border ones such as "Greater Geneva (part in France)". They appear in the Region menu, in search, as their own pages for search engines, and as a chip on every place inside one.
- **Explore around a place:** 10, 25 or 50 km around any place, from the place itself.
- **Whole cities:** Lisbon, Porto, Dublin, Cork, Galway, Limerick, Bratislava, Košice and Belgrade are published as districts in the official statistics. They can now be chosen and found as one city.

## New factors

Here is what was researched and what is now in:

| Factor | Where it comes from | Where you see it |
|---|---|---|
| Daylight on the shortest and the longest day | Computed from latitude (astronomical formulas) | Facts, snacks, story, a filter ("Winter daylight at least …"), a sort, a map layer, records, the game |
| Sunset time in late December and late June | Computed from position and time zone | Facts, snacks, story, map layer, records, game |
| Greater area and distance to its centre | Natural Earth city points | Facts, story, scope, pages |
| Landscape (Alps, Jura, Pyrenees, Apennines, Riviera, Brittany …) | Natural Earth geographic regions, used only where the terrain really is hilly | Facts, story, place pages |
| Name of the nearest sea | Natural Earth marine areas | Snacks, facts |
| Everyday life within 1.5 km: schools, kindergartens, doctors, pharmacies, supermarkets, bakeries, restaurants, bars, playgrounds, sports, stations, bus stops, EV charging, libraries | OpenStreetMap, counted live | Around tab |
| Economic output per person, unemployment, life expectancy, median age, doctors per 100,000 | Eurostat regional statistics, loaded live for the wider region | Facts tab |

Researched but not added, because no open, Europe-wide source works without a server:

- rents and house prices;
- air quality;
- broadband speed;
- crime;
- school results;
- travel times by public transport.

These need either a paid data source or a small server, so they are listed as an option for later.

## App readiness

- An installable web app: name, icons, three shortcuts (Map, Shortlist, Families) and "Install the app" in the tools drawer. iPhones show the "Add to Home Screen" steps.
- An offline helper (service worker). Pages always come fresh from the network, data and images are kept per release, and an offline page appears when there is no connection.
- These are the same building blocks an App Store or Play Store version would wrap later.

## Search engines

- 186 new pages: 185 "Best places to live in Greater …" pages and the profiles overview. That makes 5,660 in total, all in the sitemap.
- Every place page has a "Good to know" section (landscape, lake, sea, river, greater area, border, daylight). Its "Open in Nestlyzer" button points to the right household and place.
- Structured data stays in place: places with coordinates, ranked lists and breadcrumbs.

# 4. Data fixes that change some scores (deliberately)

1. **Sea distance.** It now uses the detailed 1:10m coastline, and tidal estuaries (Elbe, Weser, Ems, Scheldt, Thames, Gironde, Loire, Seine, Guadalquivir, Humber, Severn, Shannon) no longer count as sea. The sea distance is only used by the Coastal living profile, so only that ranking changes.
2. **Big cities in countries published as districts.**
   - Portugal publishes parishes, Ireland local electoral areas, and Slovakia, Serbia and North Macedonia city districts. No unit there reaches 100,000 residents, so the distance to a city of 100,000 or more was wrong.
   - Where no official 100,000+ unit lies within 10 km, the city centre now comes from Natural Earth.
   - This changes the getting-around scores mainly in Portugal, Ireland, Slovakia, North Macedonia, Cyprus, Greece and Hungary.
3. **Switzerland and the legacy method are unchanged.** All 49 legacy fixtures and all 60 builder fixtures still pass.

# 5. Legal

- **Terms of use:**
  - what Nestlyzer is;
  - fair use;
  - copyright;
  - no warranty;
  - limited liability, but never excluding intent, gross negligence or mandatory consumer law;
  - Swiss law, with Meilen as the place of jurisdiction, unless consumer law gives the visitor their home court.
- **Report a problem:** wrong data, photos, personal data or anything unlawful, by email, handled promptly.
- **Accessibility statement.**
- **Privacy policy additions:**
  - Eurostat, NASA POWER and the OpenStreetMap counts as services your browser contacts;
  - the transfer to NASA (USA), explained;
  - a statement that place texts are written by fixed rules, with no AI and no visitor data;
  - the full storage list (shortlist, compare ticks, home, tour, game).
- **EU and UK representative (GDPR Art. 27).**
  - With Google Analytics and personalised ads switched on after consent, a representative in the EU (and in the UK) is required. The "occasional" exemption is hard to claim for a website.
  - No free professional service exists. The cheapest found was Prighter at €35 a month per region, and GDPR Local costs £99 a month.
  - Free options:
    - a person you trust who lives in the EU, appointed in writing;
    - or no tracking of EU and UK visitors at all.
  - Until a representative is named, the policy truthfully says that requests go to you directly and are answered within one month. When you have one, the name is added with one setting.
  - The deploy guide explains all options.

This is careful work, but not legal advice.

# 6. How it was checked

## Automatic tests

- **Engine:** 49 of 49 legacy fixtures and 60 of 60 builder fixtures pass, and all data checks pass.

Run in headless Chromium on desktop and phone sizes against the built site.

Result: **62 pass, 0 fail, 1 not verifiable offline** (2026-10-11 00:39).

| Check | What is tested | Result | Evidence |
|---|---|---|---|
| R01 | Landing page: hero, 25+ profile tiles, 35 countries, FAQ, legal footer, sponsorship, consent banner | Pass | h1="Find where you fit.", profiles=25, countries=35, faq=6, consent=True after 1.5s ['consent open', 'object', None, 'undefined', False], sponsor_link=1 |
| R02 | Ranking list renders after load (legacy defect: 0 rows shown) | Pass | 480 ranked, 100 rows rendered, 9 top-pick cards, #1 Bürglen (TG), 4.29s to results |
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
| R13 | Global search across all 99,993 places (new): jumps country and opens the place | Pass | first hit " Lyon France, 516,092", opened Lyon |
| R14 | Guided builder restored (legacy: hidden/reset): answers, closest profiles, apply, shareable weights | Pass | profile=self_fit, ranked=1122, matches=3, url has weights=True |
| R15 | Regional reality board (legacy: never rendered): language groups and cross-border clusters | Pass | groups=['German-speaking', 'French-speaking', 'Bilingual'], cross-border chips=5 |
| R16 | Student = multi-answer: no auto-select, banner to the board, university hubs | Pass | selected=None, tab=ranking, banner=1, hub pins=11 |
| R17 | Cross-border cluster opens the neighbour country and selects the target | Pass | FR Saint-Louis |
| R18 | Large countries use official NUTS regions: DE 16 Länder + districts, plus greater areas around big cities; ES all provinces reachable (legacy lost 449); IT Lazio correct | Pass | DE regions=16, districts in region=45, greater areas=34 (e.g. ['Greater Berlin (79)', 'Greater Stuttgart (244)', 'Greater Frankfurt (140)']); ES region sum=8... |
| R19 | Expat professional ranks in CH (legacy: 0 results); Coastal says why it is empty in landlocked CH | Pass | expat n=148; coastal message ok |
| R20 | European access profiles no longer depend on loaded polygons (legacy: 0 results without geometry) | Pass | AT commuter=386, FR student=1008 |
| R21 | PDF booklet opens a print-ready dossier (legacy: script broken, never shipped) | Pass | 2026-10-10 Zürich Zurich, Switzerland, 427,721 residents Decision snapshot Profile Young f |
| R22 | Dark mode toggle (new) | Pass | system -> dark |
| R23 | Google Analytics G-HR6G9XFTKZ behind Consent Mode v2: all denied by default; "Accept all" grants analytics and ads | Pass | banner=True, default denied=True, after accept={'analytics_storage': 'granted', 'ad_storage': 'granted', 'ad_user_data': 'granted', 'ad_personalization': 'gr... |
| R24 | Mobile: no horizontal overflow, bottom tabs, list and place views (legacy: no mobile UI) | Pass | overflow landing=0, explore=0, tabs map->list->place ok=True |
| R25 | Official GISCO polygons on demand for Europe (runtime fetch). Offline: fails soft with a message | Pass | Boundaries unavailable The GISCO service did not respond (Failed to fetch). The dot map keeps working. × |
| R26 | Deep links open the exact place; home and back navigation work | Pass | opened Meilen, home visible=True, back->explore |
| R27 | Lottery tax panel (CH joined / Europe pending) and language-reality line | Pass | ok |
| R28 | SEO: static pages (municipality, canton, country, profile, method, legal) with canonical + JSON-LD, sitemap, 404 | Pass | [] bad; 404=404, sitemap urls=5660 |
| R29 | Accessibility basics: named controls, image alt, visible keyboard focus (legacy: none) | Pass | unnamed landing=0, explore=0, imgs without alt=0, focus outline=solid |
| R30 | Performance: legacy shipped one 18.7 MB HTML (90 MB JSON parsed in the browser) | Pass | gzip transfer KB: {'/': 109, '/data/meta.json': 53, '/data/c/CH.json': 606, '/data/c/FR.json': 1908, '/data/geo/ch.topo.json': 139, '/vendor/maplibre-gl.js':... |
| R31 | Wikipedia/Wikidata/Commons/Overpass enrichment (photos, extracts, arms, contacts, sights, gallery) | Not verifiable here | Hosts blocked in this sandbox; panel renders without them and slots stay empty, no errors. Must be checked on the live site. |
| R33 | Search finds exonyms, umlaut spellings, Nordic letters, Greek and Cyrillic places; exact city first; cities split into parishes (Lisbon, Skopje) open as their greater area | Pass | {"Kobenhavn": "København", "Genf": "Genève", "Roma": "Roma", "Vienna": "Wien", "Athens": "Αθηναίων Athinaion", "Lisbon": "Lisbon, the whole city", "sankt gal... |
| R34 | Mobile: header turns solid on scroll, menu with links; Coastal on a landlocked default switches to a coastal country | Pass | transparent at top=True, solid when scrolled=True, menu links=5, coastal country=PT |
| R35 | Builder starts from the current country (all 35 selectable); flag renders at 4:3; one resident figure (latest year) everywhere | Pass | target=FR, choices=35, flag=[16, 12], Bürglen display 4067 (scoring base 3959) |
| R36 | Map markers never overlap (phone width, Switzerland): lower-ranked pins hide until zoomed in | Pass | visible pins=11, overlapping pairs=0 |
| R37 | AdSense ready: ads.txt, account meta on every page, Auto ads script on content pages only (not on legal or error pages) | Pass | ads.txt="google.com, pub-2870312071451207, DIRECT, f08c47fec0942fa0", pages={'/': (True, True), '/switzerland/': (True, True), '/switzerland/zurich/meilen/':... |
| R38 | Consent: equal-weight buttons, "Only necessary" keeps everything denied, choice remembered, "Privacy settings" in the footer reopens it, analytics never receives the # selections | Pass | equal buttons=True, after decline={'analytics_storage': 'denied', 'ad_storage': 'denied', 'ad_user_data': 'denied', 'ad_personalization': 'denied'}, shown ag... |
| R39 | With Google's certified consent dialog (IAB TCF) active, Nestlyzer's own banner stays hidden and the choice is mirrored (simulated CMP) | Pass | own banner shown=False, mode=tcf, mirrored={'v': 2, 'a': True, 'd': True, 't': 1791671723479, 'src': 'tcf'} |
| R40 | Legal page: imprint, GDPR/FADP privacy policy, AdSense-required disclosures, cookie table, consent withdrawal | Pass | missing=[], 16/16 required items present |
| R41 | Switching country while a place is open: back to the map, no stale place sheet, map points belong to the new country | Pass | tab before=place, after=map, stale sheet visible=False, map points after switch=34997 (France has 35,359) |
| R42 | First visit: a gentle invitation (never a blocking overlay) to a short tour, not shown again, reopened with ? | Pass | invitation first, blocking overlay=False; steps=['Who is moving?', 'Where to look', 'The map', 'The ranking', 'Your shortlist', 'Tools'], shown again=False, ... |
| R43 | New parameters: records, railway/terrain/climate filters (in the link), map layer with real units | Pass | records=21 (Highest terrain), scope 2172→rail≤2km 955→+mountains 248; mild climate 1988; legend="Terrain height (m, within Switzerland) low ≥530 ≥610 ≥670 ≥8" |
| R44 | Compare up to three with photos, verdicts and grouped rows; remove a column; shared compare links open directly; no sea row for Swiss places | Pass | columns=3, verdicts=3, after remove=2, shared link=2, sea row shown=False |
| R45 | Save from a card without opening it, notes survive a reload, shared lists import | Pass | opened by heart=CH:4911, note="Visit on Saturday", count=1, after import=3 |
| R46 | Home: set a home, every other place shows the differences | Pass | 🏠 Zürich against your home, Meilen Zürich scores 31 less 29.0× as many residents 2.8× as many people within 10 km 15 km closer to a big city 2.6 km closer to a  |
| R47 | Look-alikes elsewhere in Europe resolve to names and open in their own country | Pass | look-alikes=[' Meersburg (Germany)\nopen', ' Cernobbio (Italy)\nopen', ' Lochau (Austria)\nopen'], opened ['DE', 'Meersburg'] |
| R48 | Tools drawer (11+ tools) and the higher-or-lower game with real values | Pass | tools=11, question="Which one has more people within 10 km?", result="❌ Not this time. Streak: 0 · best: 0 Nex" |
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
| R63 | App-ready: installable manifest with shortcuts, service worker with a versioned cache (pages always fresh), offline page | Pass | shortcuts=['Map', 'Shortlist', 'Families'], worker=activated, controls page=True, cache=nz-2.2.0 |
| R64 | Phone: the compare tray never covers the place action bar, the confirmation toast sits above it, the Shortlist tab is the active one and shows a count | Pass | tray visible on place=False, action bar visible=True, toast bottom 708 < bar top 728, active tab=['saved'], badge=1, overflow=0 |
| R32 | No uncaught JavaScript errors across all flows | Pass | 0 errors: [] |

## Single file

`nestlyzer.html` was opened straight from disk in Chromium at desktop (1440 x 900) and phone (390 x 844) sizes. Results: home page: light map drawn, 35 country tiles, 0 broken images; Switzerland ranked: 480; place opened: Meilen; France ranked: 35359; search "Genf" opened: Genève; builder countries: 35; phone: France ranked: 35359; start screen Germany + Pensioner couple (desktop): DE pensioner DE #/explore?cc=DE&p=pensioner; start screen Germany + Pensioner couple (phone): DE pensioner DE #/explore?cc=DE&p=pensioner; Austria tile opens: AT explore / AT explore; imprint and privacy open inside the file: True; JavaScript errors: 0.

## Independent audits

Two separate reviewers, who had not seen the code changes, each spent about 35 minutes as first-time users on a desktop and a phone, in the website and in the single file. Their findings are in section 2.

# 7. Screenshots

Screenshots are in the Word and PDF versions.

# 8. Open items

**Mine (next round, if you want them):**

1. Rents, house prices, broadband and travel times need a data source that costs money or a small server. I can prepare a proposal with costs.
2. Live checks on the published site for the services that are blocked here: photos, Wikidata, the OpenStreetMap counts, Eurostat and the map tiles. They are tested with simulated answers and fail politely, but the real answers should be looked at once after you push.
3. A language switch (German, French, Italian) for the interface and for search engines.

**Yours:**

1. Push 2.2 with GitHub Desktop, following the step-by-step deploy guide. The guide also removes all old files in the same commit.
2. Decide on the EU (and UK) representative: a trusted person in the EU, a paid service, or no tracking of EU and UK visitors. Send me the name and address if you appoint someone.
3. After the push: AdSense site review and the consent message, Google Analytics retention at 14 months, and the sitemap in Google Search Console (all in the deploy guide).
