---
title: "Nestlyzer 2.3: the newcomer audit, a new logo and a safer release"
subtitle: "Four independent first-time-user audits, fixes for the robustness gaps, a calmer phone layout, privacy that matches the text, and a one-paste GitHub update"
date: "11 October 2026"
---

# In short

**Four independent audits, each from a first-time visitor's point of view.**

- Before the work started, three reviewers used Nestlyzer like newcomers: one on desktop, one on phone, one on the search-engine pages, legal texts and the single file.
- After the fixes, a fourth reviewer, who had seen none of the work, went through every journey again.
- Everything they found is fixed. There is one exception: French overseas places are still in France's ranking. They are now labelled "(overseas)" instead of removed, because removing them would narrow a working feature. That needs your OK first (see open items).

**Robustness.**

- Switching country quickly no longer breaks the app.
- Places from another country can be removed from the shortlist, with Undo.
- The Back button closes whatever is open (search, menu, filters, tools, a picture, a window) before it leaves a page.
- Bad links get a clear message instead of an empty page.

**Phone.**

- The profile is now one pill that opens a grouped picker.
- The header and tab bars slide away while you scroll.
- Inputs no longer make the phone zoom in, and every tap target is at least 44 px.
- The filter sheet sits on top, has a handle, and closes with a tap outside or with Back.
- Holding the phone sideways leaves room for the list again.

**A new logo:** a navy map pin holding a white egg in a yellow nest. It replaces the plain mark in the header, the app icons, the favicon and the share image.

**Privacy now does what the text says.**

- Google Analytics is not even downloaded until a visitor presses "Accept all". A test checks this (R69).
- A new "Live content" switch turns off every outside service the app uses (Wikimedia, Wikidata, NASA, OpenStreetMap, Eurostat).
- There is a build switch for a "privacy-first" site with no Analytics and never personalised ads. You may want it while you have no EU or UK representative (section 5).

**Cleaner data.**

- 455 duplicate places from older data years are gone (Norway 391, Latvia 40, Belgium 13, Estonia 8, Iceland 3). Europe now has 99,538 places instead of 99,993.
- Portuguese parishes, Irish local electoral areas and Greek communities are called by their real names, not "municipalities".
- Greek place names are in the nominative ("Αθήνα", not "Αθηναίων").
- Records leave out overseas territories and values that cannot be right.

**GitHub.**

- The release is checked for anything GitHub or a Mac would trip over before it is packed.
- The zips carry the version in their name.
- One line pasted into Terminal empties the old repository (except `.git`) and unpacks the new site, with safety checks.
- Then one commit and one push.

# 1. Your question: what is the risk without an EU and UK representative?

The short answer: it is a real but modest legal risk, and you can make it much smaller.

**The rule.** GDPR Art. 27, and the same article in UK GDPR, apply to an operator outside the EU (or UK) that tracks the behaviour of people in the EU (or UK). That operator must name a representative there. Nestlyzer is run from Switzerland and, once a visitor accepts, uses Google Analytics and personalised ads. That is tracking in the sense of Art. 3(2)(b). The "occasional processing" exemption is hard to argue for a site that measures every visit.

**What can happen if you have none.**

- The fine for this breach falls in the lower tier: up to €10 million or 2% of worldwide turnover. That is the cap, not the usual amount.
- Real cases are rare, and they have hit companies that also ignored complaints. The best-known one is the Dutch authority fining Locatefamily.com €525,000 in 2021. That site published people's addresses and ignored the requests of the people concerned.
- No case is known against a small, compliant site whose only gap is the missing representative.
- In practice the risk works like this:
  - an unhappy visitor complains;
  - the authority finds no one in the EU to write to;
  - the missing representative becomes one more point against you.

  So the risk grows with complaints, not with traffic.
- An authority would have trouble enforcing a fine in Switzerland. It can still order the processing to stop and publish the decision.
- **Google:** the AdSense terms make you responsible for following the law. A breach is rarely enforced, but it can put the account at risk.

**Your three options.**

1. **Privacy-first mode (costs nothing, ready in the build).**
   - Set `NZ_PRIVACY=strict` when building.
   - Analytics is never loaded, and ads are never personalised for anyone.
   - With no behavioural tracking, Art. 3(2)(b) and Art. 27 very likely no longer apply.
   - Cost: no visitor statistics, and lower ad income.
2. **A person you trust in the EU and one in the UK**, each with a one-page written mandate. Their name and address go into the privacy policy. Send them to me and I fill in `NZ_EU_REP` and `NZ_UK_REP`.

3. **A paid service.** Prighter starts at about €35 a month per region, and GDPR Local at about £99 a month. Prices were checked in an earlier round and should be confirmed before you sign.

Until you choose, the privacy policy states the truth: there is no representative yet, and EU and UK visitors can write to Torsten Sauter directly and get an answer within a month.

This is not legal advice. Have a data-protection lawyer look at it once revenue matters.

# 2. What the newcomers ran into, and what changed

## Before the work: three audits

Three reviewers worked separately: A on desktop, B on phones (360 to 412 px wide, and sideways), C on the 5,660 search-engine pages, the legal texts and the single file. The most important findings and what changed:

| # | Finding | Fixed how |
|---|---|---|
| A1 | Choosing two countries within 0.3 s left "0 of 0 places" and an empty map | Every country load carries a ticket; only the last one counts (test R66) |
| A2, A3 | Places from another country could not be removed from the shortlist, and there was no Undo | Remove and Undo work for every saved place, loaded or not (R66) |
| A4 | Filters that leave nothing said "no place passes this profile" | "Your filters leave no place in …" with Clear all filters and Whole country |
| A5 | A shared link could lose the open place | The open place is always in the link |
| A6 | A shared compare link showed codes like "AT:90001" | Real names from the search index |
| A7 | Opening a shared list added it to your shortlist without asking | You see the list first and choose "Add to my shortlist" |
| A8 | Escape did not close the place | Escape closes the topmost thing: menu, search, window, then the place |
| A9, A10 | Records like "5,327 km from a railway" (French overseas), "0 neighbours" for Groningen, "607 km to a large lake" in Malta | Overseas territories and impossible values are left out (R67) |
| A11 | Legend labels like "≥8 h 28in" and "≤under 1 ≤under 1" | One formatter for legend and values; equal steps are merged |
| A12 | Compare showed 0 where data is missing | "–" for missing values |
| A13 | The booklet's hero was a blurry flag, numbers disagreed, the map link was text | A real photo or the outline postcard, the same numbers as the page, real links |
| A14 | Coastal living in Switzerland gave an empty page | "Switzerland has no coast", with buttons for six coastal countries (R19) |
| A15 | 25 profile chips were 25 Tab stops | One Tab stop; arrow keys move between chips |
| A16 | Unknown countries or areas in a link failed silently | A message, then a sensible fallback |
| A18 | Places outside the ranking scored higher than #1 with no word | The list says how many score higher and why they are out |
| A19 | Swiss language groups used Europe-wide text | Country-specific notes for Switzerland, Belgium and Luxembourg |
| B1 | "Build my own" opened underneath the Tools drawer | Opening any window closes Tools first |
| B2 | Sideways on a phone left no room for the list | Header and chip row step aside in landscape |
| B3 | The /best/ profiles page had no layout | Styled like the app (R70) |
| B4 | The builder's language choice could return zero places | It falls back and says so |
| B5, B6 | Back with a sheet open left the app; tapping outside the filter sheet did nothing | Every sheet and drawer gets a Back step; a tap outside closes it; pinned header and handle (R65) |
| B7 | Compare table: the sticky label column ran over the title | Solid label column under a sticky header |
| B9, B10 | The list got 300 to 500 px of an 844 px screen | Bars slide away while scrolling; the profile moved into the scope bar; the scope panel closes after a choice |
| B11 | The keyboard pushed the tab bar up; inputs made iPhones zoom | Bars hide while typing; 16 px inputs |
| B12, B13 | "No photos found" when Wikimedia failed; weather had no retry | "Could not load" with Try again everywhere |
| B14 | The booklet had no phone layout | Phone viewport and layout |
| B15 | The tour called the map numbers "the top ten" | The tour and the legend explain them |
| B16 | Broken sentences ("it has closer to a big city", Hanau's nearest campus is Hanau) | Templates rewritten; a university town is not told it is near itself |
| B17 | Search and place showed different populations | The latest year everywhere |
| B18 | The CSV lacked notes and had long decimals | Notes and ticks included; whole numbers |
| C1 | Google's scripts loaded before the visitor chose | Analytics loads only after Accept (R69); the texts match |
| C3 | The same place three times from different data years (Ålesund, Sandnes, Deinze, Ogre) | 455 superseded duplicates removed |
| C4 | Portuguese parishes called "municipalities" | Parishes, local electoral areas, communities and localities by their real names |
| C5 | "Best in Europe" winners hard to believe | At least 5,000 residents and an "early indication" note |
| C7 | Cross-border greater areas duplicated per country with the same title | "(part in …)" titles, links to the home country's page |
| C8 | /method/ wider than a phone; the place table cut off a column | Long links wrap; the table stacks on phones |
| C9 | "1 places", "1 municipalities" | Singular and plural everywhere |
| C10 | 145 titles only in Cyrillic or Greek | A Latin spelling is added |
| — | Duplicate page titles (24 pages) | 0 duplicates in 5,655 pages (R70) |


## After the work: the fourth audit

The fourth reviewer had not seen any of the work. They found no blockers, 4 major and 6 minor issues, and a list of polish items. All were fixed and then checked again by the same reviewer: 13 of 14 fixed, plus the 14th labelled as described above.

| Finding | Fixed how |
|---|---|
| French overseas places (Kourou in French Guiana) shown as "best in Europe" on the /best/ pages | Left out of the "Across Europe" tables. In the France ranking they are labelled "(overseas)". |
| Phone: the shortlist bounced up and down without stopping | The bars only hide on long lists, and the bounce caused by their own movement is ignored |
| A fourth Compare tick stayed ticked after "Keep the three I have" | Every box now shows the real state |
| Desktop: Back with Filters open left the map | Back closes Filters first, on every screen size |
| Phone: Back from a place went to the Map, not the list you came from | Back returns to the list; a country change still goes to the map |
| Phone: Back with the menu open left the site | Back closes the menu |
| /method/ scrolled sideways on phones (a long web address) | Long links now wrap |
| Map layers without data in a country showed a grey map with no word of explanation | They are greyed out in the menu with "(no data in France)". If one is still chosen, the legend says why the map is grey. |
| Search did not return the keyboard focus | Focus goes back to the button you came from |
| "Share list" said "the same place" | It now says the other person can add these places to their shortlist |
| Long names on the top-pick cards ran out of the card; a heart sat under an arrow | Names end with "…", and the arrows have moved |
| Failed photos left a big empty grey box | Only the message and Try again |
| Undo put a removed place at the top | It goes back where it was |
| The empty-results note gave "1,000 residents" as an example while your filter was 40,000 | The example is only shown when it is the real reason |
| A population fall was listed as a plus ("the population shrank… main reason basics scores 97") | A fall is only ever a watch-out |
| Country pages said "Data depth foundation" | "Early indication", the same words as in the app |
| "Tap" on a computer | "Click" on a computer, "Tap" on a phone |
| Map pin numbers were not explained | The legend says "numbered pin: rank" |

# 3. What is new

## Phone and layout

- **Profile pill and picker.** One pill in the scope bar opens a sheet with the 25 profiles grouped as Families, Work and study, Later life, Budget and Lifestyle. On a computer, the chip row stays, and the arrow keys move between chips.
- **More room for the list.**
  - Header and tab bars slide away while you scroll and come back when you scroll up.
  - The bars hide while you type.
  - The scope panel closes after a choice.
- **Touch.**
  - Every tap target is at least 44 px.
  - Inputs are 16 px, so iPhones no longer zoom in.
  - Notch and home-bar areas are respected.
- **Sideways.** In landscape, the header and chip row step aside so the list has room. The place view is still tight there.
- **Lists.**
  - Each row shows three factor chips.
  - The selected row gets a navy accent and its factor detail. Other rows stay short.
  - Top picks show two whole cards with arrows.
- **Empty states always offer a way out.**
  - With every place filtered out, you get "Clear all filters" and "Whole country".
  - Coastal living in a landlocked country offers coastal countries.
- **Keyboard.** The focus ring shows only for keyboard users. Escape closes things in a fixed order.

## Logo

A navy map pin. Inside it sits a white egg in a yellow, woven nest. The dark-mode variant uses a lighter blue. Icons, favicon, app icons and the share image (with the new place count) were regenerated.

## Privacy and live content

- Google Analytics loads only after consent, through the site's own banner or Google's consent dialog.
- The "Live content" switch is in Tools and on the legal page.
- The legal texts now cover:
  - UK GDPR and the ICO;
  - Google's roles;
  - limited versus non-personalised ads;
  - the UK extension of the EU–US Data Privacy Framework;
  - the new switch;
  - the full list of stored settings.

## Search engines

- No two pages share a title (5,655 checked). Titles stay under 80 characters.
- Each profile page opens with its own plain-language description.
- Cross-border greater areas link to their home country's page.
- Search engines can offer a site search box (`/?q=`).
- Country pages carry a ranked list for search engines.

## Data

- 455 superseded duplicates removed (section "In short").
- City groups and alias names in search: "Athens" finds Αθήνα, "Saint-Gall" finds St. Gallen.
- Short searches rank big places first.
- A postcode search explains that postcodes are not searchable.

# 4. How it was checked

## Automatic tests

Run in headless Chromium on desktop and phone sizes against the built site.

Result: **68 pass, 0 fail, 1 not verifiable offline** (2026-10-11 11:43).

| Check | What is tested | Result | Evidence |
|---|---|---|---|
| R01 | Landing page: hero, 25+ profile tiles, 35 countries, FAQ, legal footer, sponsorship, consent banner | Pass | h1="Find where you fit.", profiles=25, countries=35, faq=6, consent=True after 3.6s ['consent open', 'object', None, 'undefined', False], sponsor_link=1 |
| R02 | Ranking list renders after load (legacy defect: 0 rows shown) | Pass | 480 ranked, 100 rows rendered, 9 top-pick cards, #1 Bürglen (TG), 11.75s to results |
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
| R23 | Google Analytics G-HR6G9XFTKZ behind Consent Mode v2: all denied by default; "Accept all" grants analytics and ads | Pass | banner=True, default denied=True, after accept={'analytics_storage': 'granted', 'ad_storage': 'granted', 'ad_user_data': 'granted', 'ad_personalization': 'gr... |
| R24 | Mobile: no horizontal overflow, bottom tabs, list and place views (legacy: no mobile UI) | Pass | overflow landing=0, explore=0, tabs map->list->place ok=True |
| R25 | Official GISCO polygons on demand for Europe (runtime fetch). Offline: fails soft with a message | Pass | Boundaries unavailable The GISCO service did not respond (Failed to fetch). The dot map keeps working. × |
| R26 | Deep links open the exact place; home and back navigation work | Pass | opened Meilen, home visible=True, back->explore |
| R27 | Lottery tax panel (CH joined / Europe pending) and language-reality line | Pass | Swiss tax panel=True, other-country notice=True, language line=True |
| R28 | SEO: static pages (municipality, canton, country, profile, method, legal) with canonical + JSON-LD, sitemap, 404 | Pass | [] bad; 404=404, sitemap urls=5655 |
| R29 | Accessibility basics: named controls, image alt, visible keyboard focus (legacy: none) | Pass | unnamed landing=0, explore=0, imgs without alt=0, focus outline=solid |
| R30 | Performance: legacy shipped one 18.7 MB HTML (90 MB JSON parsed in the browser) | Pass | gzip transfer KB: {'/': 117, '/data/meta.json': 53, '/data/c/CH.json': 606, '/data/c/FR.json': 1908, '/data/geo/ch.topo.json': 139, '/vendor/maplibre-gl.js':... |
| R31 | Wikipedia/Wikidata/Commons/Overpass enrichment (photos, extracts, arms, contacts, sights, gallery) | Not verifiable here | Hosts blocked in this sandbox; panel renders without them and slots stay empty, no errors. Must be checked on the live site. |
| R33 | Search finds exonyms, umlaut spellings, Nordic letters, Greek and Cyrillic places; exact city first; cities split into parishes (Lisbon, Skopje) open as their greater area | Pass | {"Kobenhavn": "København", "Genf": "Genève", "Roma": "Roma", "Vienna": "Wien", "Athens": "Αθήνα Athina", "Lisbon": "Lisbon, the whole city", "sankt gallen": ... |
| R34 | Mobile: header turns solid on scroll, menu with links; Coastal on a landlocked default switches to a coastal country | Pass | transparent at top=True, solid when scrolled=True, menu links=5, coastal country=PT |
| R35 | Builder starts from the current country (all 35 selectable); flag renders at 4:3; one resident figure (latest year) everywhere | Pass | target=FR, choices=35, flag=[16, 12], Bürglen display 4067 (scoring base 3959) |
| R36 | Map markers never overlap (phone width, Switzerland): lower-ranked pins hide until zoomed in | Pass | visible pins=11, overlapping pairs=0 |
| R37 | AdSense ready: ads.txt, account meta on every page, Auto ads script on content pages only (not on legal or error pages) | Pass | ads.txt="google.com, pub-2870312071451207, DIRECT, f08c47fec0942fa0", pages={'/': (True, True), '/switzerland/': (True, True), '/switzerland/zurich/meilen/':... |
| R38 | Consent: equal-weight buttons, "Only necessary" keeps everything denied, choice remembered, "Privacy settings" in the footer reopens it, analytics never receives the # selections | Pass | equal buttons=True, after decline={'analytics_storage': 'denied', 'ad_storage': 'denied', 'ad_user_data': 'denied', 'ad_personalization': 'denied'}, shown ag... |
| R39 | With Google's certified consent dialog (IAB TCF) active, Nestlyzer's own banner stays hidden and the choice is mirrored (simulated CMP) | Pass | own banner shown=False, mode=tcf, mirrored={'v': 2, 'a': True, 'd': True, 't': 1791711525012, 'src': 'tcf'} |
| R40 | Legal page: imprint, GDPR/FADP privacy policy, AdSense-required disclosures, cookie table, consent withdrawal | Pass | missing=[], 16/16 required items present |
| R41 | Switching country while a place is open: back to the map, no stale place sheet, map points belong to the new country | Pass | tab before=place, after=map, stale sheet visible=False, map points after switch=34997 (France has 35,359) |
| R42 | First visit: a gentle invitation (never a blocking overlay) to a short tour, not shown again, reopened with ? | Pass | invitation first, blocking overlay=False; steps=['Who is moving?', 'Where to look', 'The map', 'The ranking', 'Your shortlist', 'Tools'], shown again=False, ... |
| R43 | New parameters: records, railway/terrain/climate filters (in the link), map layer with real units | Pass | records=21 (Highest terrain), scope 2172→rail≤2km 955→+mountains 248; mild climate 1988; legend="Terrain height (m, within Switzerland) low ≥530 ≥610 ≥670 ≥8" |
| R44 | Compare up to three with photos, verdicts and grouped rows; remove a column; shared compare links open directly; no sea row for Swiss places | Pass | columns=3, verdicts=3, after remove=2, shared link=2, sea row shown=False |
| R45 | Save from a card without opening it, notes survive a reload, shared lists import after the visitor agrees | Pass | opened by heart=CH:4911, note="Visit on Saturday", count=1, after import=3 |
| R46 | Home: set a home, every other place shows the differences | Pass | 🏠 Zürich against your home, Meilen Zürich scores 31 less 29.0× as many residents 2.8× as many people within 10 km 15 km closer to a big city 2.6 km closer to a  |
| R47 | Look-alikes elsewhere in Europe resolve to names and open in their own country | Pass | look-alikes=[' Meersburg (Germany)\nopen', ' Cernobbio (Italy)\nopen', ' Lochau (Austria)\nopen'], opened ['DE', 'Meersburg'] |
| R48 | Tools drawer (11+ tools) and the higher-or-lower game with real values | Pass | tools=12, question="Which one is closer to the sea?", result="✅ Right! Streak: 1 · best: 1 Next pair" |
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
| R63 | App-ready: installable manifest with shortcuts, service worker with a versioned cache (pages always fresh), offline page | Pass | shortcuts=['Map', 'Shortlist', 'Families'], worker=activated, controls page=True, cache=nz-2.3.0 |
| R64 | Phone: the compare tray never covers the place action bar, the confirmation toast sits above it, the Shortlist tab is the active one and shows a count | Pass | tray visible on place=False, action bar visible=True, toast bottom 708 < bar top 728, active tab=['saved'], badge=1, overflow=0 |
| R65 | Phone: profile picker sheet; filter sheet sits on top and is usable; Back closes the sheet instead of leaving the page; a tap outside closes it | Pass | profiles in picker=26, picker closed=True, pill="Pensioner couple", sheet on top=True, back closed=True, still exploring=True, tap outside closed=True |
| R66 | Shortlist works across countries (a Swiss place can be removed while exploring Germany); quick country changes end in the last country chosen | Pass | listed in DE=1, left after remove=0, race ends in AT=True |
| R67 | Records tab: every record is a real place in the country, with no broken numbers | Pass | 21 records, broken words=[], outside country=0 |
| R68 | Privacy: with live content switched off, opening a place contacts no third-party service and offers a switch to turn it back on | Pass | third-party requests=0, turn-on buttons=5 |
| R69 | Consent: Google Analytics is not even downloaded before the visitor accepts; it loads once after Accept | Pass | before accept: nzGAon=undefined, gtag scripts=0, requests=0; after accept: loaded=True, scripts=1 |
| R70 | SEO pages: the profiles overview is styled like the app, and all pages have their own title | Pass | tile style=['solid', '14px', 'flex'], pages checked=5655, duplicate titles=0, titles over 80 chars=0 |
| R32 | No uncaught JavaScript errors across all flows | Pass | 0 errors: [] |

The unit tests also pass:

- 49 of 49 legacy score fixtures;
- 60 of 60 builder fixtures;
- all data checks, including the 455 superseded places.

New in 2.3:

| Test | What it checks |
|---|---|
| R65 | Phone sheets and the Back button: the profile picker, the filter sheet on top and usable, Back closes it, a tap outside closes it |
| R66 | A Swiss place is removed from the shortlist while exploring Germany; two quick country changes end in the last country |
| R67 | Records are real places in the country, with no broken numbers |
| R68 | With live content off, opening a place contacts no outside service |
| R69 | Google Analytics is not downloaded before Accept, and is downloaded once after it |
| R70 | All 5,655 pages have their own title; the profiles page is styled |

## Single file

`nestlyzer.html` was opened straight from disk in Chromium at desktop (1440 x 900) and phone (390 x 844) sizes. Results: home page: light map drawn, 35 country tiles, 0 broken images; Switzerland ranked: 480; place opened: Meilen; France ranked: 35359; search "Genf" opened: Genève; builder countries: 35; phone: France ranked: 35359; start screen Germany + Pensioner couple (desktop): DE pensioner DE #/explore?cc=DE&p=pensioner; start screen Germany + Pensioner couple (phone): DE pensioner DE #/explore?cc=DE&p=pensioner; Austria tile opens: AT explore / AT explore; imprint and privacy open inside the file: True; JavaScript errors: 0.

## The GitHub package

- **Three site zips** (12, 21 and 18 MB) and the source zip.
- **5,804 files** (5,803 files plus the new README.md), 183 MB in total. The largest is 7 MB.
- **Checked before packing:**
  - 0 paths that differ only in upper and lower case;
  - 0 awkward names;
  - 0 files over 50 MB;
  - 0 workflow folders;
  - the longest path is 122 bytes.
- **The one-paste Terminal line** was run in zsh (the Mac's shell) on a copy of an old repository:
  - it kept `.git`;
  - it removed the old files and the `.github` folder;
  - it unpacked the three zips and printed "Nestlyzer 2.3.0".
- **Its safety checks** were tested too. With no `.git`, or with only two zips, it stopped and deleted nothing.

# 5. Screenshots

Screenshots are in the Word and PDF versions.

# 6. Open items

**For you (Anton or Torsten)**

1. Push 2.3. The deploy guide covers it: one paste in Terminal, then one commit and one push in GitHub Desktop.

2. Choose for the EU and UK: privacy-first mode, a trusted person, or a paid representative (section 1).
3. French overseas places (Guadeloupe, Martinique, French Guiana, Réunion, Mayotte): keep them in France's ranking with the "(overseas)" label, or leave them out of the app's ranking like the /best/ pages do?

4. In AdSense: add the site, turn on the Google consent message for the EEA, UK and Switzerland, and turn on Auto ads (deploy guide).
5. In Google Analytics: set data retention to 14 months.

6. In Search Console: add nestlyzer.com and submit the sitemap.

**For me, next round**

1. The Swiss data is from 2021 (municipalities and portraits) and 2018 (tax burden). Refreshing it needs the current FSO and ESTV downloads, which cannot be reached from here.

2. Dark mode on the live basemap: check it once the site is live. The map tiles cannot be reached from here.
