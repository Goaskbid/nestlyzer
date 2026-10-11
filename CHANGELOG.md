# Changelog

## 2.4.1 (October 2026)

- Browser-only releases: the workflow unpacks uploaded release zips (all parts checked, Pages source checked), removes old and loose files, commits once, builds and publishes. Repairs the flattened browser upload of 2.4.0.
- About page with the founder interview and four photos, linked from the footer and listed in the sitemap.

## 2.4.0 (October 2026)

### Privacy

- Privacy-first by default: before "Accept all" (and after "Only necessary") the browser contacts no Google service and sets no cookie.
- Light Google Analytics after consent (Google signals and ad personalisation off); AdSense loads only after consent and asks for non-personalised ads.
- "Privacy settings" and "Imprint and privacy" in Tools; switching live content off also stops lookups already running; policy texts match the behaviour exactly.

### GitHub

- The repository holds the sources; one workflow builds, tests (including a real-browser smoke test) and publishes on every push.
- Monthly check for a new Eurostat population year with automatic refresh, safety gates and no publish on any failure.
- Reproducible data build (pinned Natural Earth, deterministic ordering).

### Pages

- Dot maps with linked top-10 pins on 274 country and region pages; strength bars, score bars and a residents chart on place pages; "How fresh the data is" on the method page.

### Fixes

- Country residents no longer count superseded duplicates (Norway 5.6 instead of 10.8 million; Europe 545 million).
- Density shown as residents ÷ area for the same year; sentence fix for places without neighbours; single file opens the legal and method pages inside the app.

## 2.3.0 (October 2026)

Four independent first-time-user audits (three before the work, one after) drove this round.

### Fixed

- Quick country changes, removing places from another country, Back with any sheet, menu or window open, unknown links, records with impossible values, legend labels, overseas places in "best in Europe".
- The phone filter sheet sat under its own dark backdrop; it is now on top, closes with a tap outside or Back.
- A population fall is never listed as a plus.

### Phone and layout

- New logo (pin, egg, nest). Profile pill with a grouped picker. Bars that slide away while scrolling and typing. 44 px tap targets, 16 px inputs, landscape layout. Top picks as two whole cards; the selected row in navy.

### Privacy

- Google Analytics loads only after Accept. A "Live content" switch turns off all outside services. Build switch `NZ_PRIVACY=strict` for a site without Analytics and personalised ads.

### Data

- 455 superseded duplicate places removed (99,538 places). Parishes, electoral areas and communities named correctly; Greek names in the nominative.

### Release

- Versioned site zips, GitHub compliance checks before packing, a README for the repository, and a one-paste Terminal update with safety checks.

## 2.2.0 (October 2026)

Two independent first-time-user audits (52 findings) and the owner's report that Germany opened Switzerland drove this round.

### Fixed

- The start screen of the single-file version opened Switzerland whatever country was chosen. The start link now follows the choice, and the offline helper never overrides the app.
- The back button closes a place, then a window, then returns to the start page.
- Sea distance uses the 1:10m coastline and ignores tidal estuaries (Hamburg 71 km instead of 15 km; Flensburg 2 km instead of 19 km). Only the Coastal living profile uses it.
- The distance to a city of 100,000+ is fixed in countries published as districts (Portugal, Ireland, Slovakia, North Macedonia and others). Swiss values are unchanged.
- Honest wording: early-data countries say what a rank rests on; the why-card names the measure; a strength is never repeated as a watch-out; "could not load" is no longer shown as "nothing here".

### One shortlist

- Labelled ♥ Save and ☐ Compare buttons; ticking Compare also saves the place.
- The Shortlist is in the header and the phone tab bar, with a count; ticks survive a reload; a fourth tick asks which place to replace; Undo after removing.
- Comparisons across countries only compare absolute values; ties are shown as ties.

### Explore big countries

- 197 greater areas around big cities (for example Greater Hamburg), in the Region menu, in search and as pages.
- Explore 10, 25 or 50 km around any place.
- Whole cities for places split into districts: Lisbon, Porto, Dublin, Cork, Galway, Limerick, Bratislava, Košice, Belgrade.
- Search understands umlaut spellings (Muenchen) and English city names, and puts the city first.

### New factors

- Daylight on the shortest and longest day, sunset times, landscape, sea name, greater area.
- Live: everyday life within 1.5 km (OpenStreetMap counts) and the wider region (Eurostat).
- New filter (winter daylight), sort (most winter daylight), two map layers, three records, two game questions.

### Legal, app and search engines

- Terms of use, report a problem, accessibility statement, EU/UK representative section, complete storage list, new services in the privacy policy.
- Installable app with shortcuts, a service worker (pages always fresh), an offline page, and "Install the app" in Tools.
- 185 greater-area pages and a profiles overview (5,660 pages); "Good to know" on place pages; country-aware Explore links.
- In the single file, links to pages open inside the app and the legal and method pages are built in.

### Phone and keyboard

- The tour is an invitation, never an overlay. Messages sit above the bottom buttons. The tray never covers the place bar.
- Larger touch targets, a readable compare table, a compact consent banner.
- Consent first in the tab order, focus moves to an opened place, and windows keep focus inside.

## 2.1.0 (October 2026)

A first-time-user audit (an independent review of every screen on desktop and phone) drove this round, plus the requests for more parameters, photos, compare, saving and stories.

### More to know about every place

- 11 new parameters for all 99,578 places, computed from open data: terrain height and height range, climate type (Köppen-Geiger), nearest large lake, major river, main railway line, motorway, seaport, the capital, the nearest land border (with the country's name), neighbours and residents within 10 km.
- Look-alikes: the three most similar places in other European countries, for every place.
- Photos taken in and around each place (Wikimedia Commons), with author and licence on every photo and a full-screen viewer.
- Notable places nearby (Wikidata), with a UNESCO World Heritage badge.
- Weather through the year: monthly highs, lows and rain (NASA POWER).
- Small facts: official altitude, postcode, founding date, sister towns, mayor, highest point (Wikidata).

### The place page

- Key facts first: a "Why #N" card with three reasons and one watch-out, then eight fact tiles (residents and trend, terrain, climate, lake or sea, big city, railway, airport, border).
- The rest sits in tabs: Overview, Photos, Facts, Around, Compare. Less scrolling, nothing removed.
- The good, the not-so-good, the unusual, the interesting and nice-to-know, written from the data in plain language that varies from place to place.
- "Data depth" replaces the separate confidence and coverage boxes (both values are still shown).

### Tools

- Save from any card or row, add notes, tick places to compare, share a saved list as a link.
- Compare up to three places: photos, grouped rows, a verdict per place, remove a column, share the comparison.
- Set a home: every place shows how it differs from where you live now.
- Records: the extremes of your current scope.
- Surprise me, a higher-or-lower game with real data, a tools drawer and a quick tour on the first visit.
- New filters: railway, motorway, lake and border distance, residents within 10 km, terrain and climate. New map layers for the same.
- New sort orders: closest to a railway, a lake, the sea, highest terrain.
- "Why not the others?": places outside the ranking listed with their reason.

### Fixed (from the audit)

- Search from the home page left an empty screen for Swiss places.
- The builder's language choice now filters places; the last country picked opens first; the apply button stays visible on phones.
- The home page map is now relative within each country, so data-poor countries no longer look bad.
- Factor chips in the ranking only show factors that belong to the chosen profile.
- Plain names instead of jargon ("Basics" instead of "Foundation", plain reasons for places that are not ranked).
- Map zoom buttons no longer hide behind the place panel.
- Search shows the same resident figure as the place page.
- Phone: compact scope bar, filters as a bottom sheet, save and compare in thumb reach, larger tap targets, scrollable profile chips with arrows on desktop.
- Static pages: tables stack on phones, place pages no longer lead with niche profiles, Albanian names in capitals are written normally.
- The consent choice appears sooner.

## 2.0.0 (October 2026)

Complete rebuild of nestlyzer.com. Same data and scoring logic, new architecture, design and mobile experience.

### Speed

- Home page 69 KB compressed instead of 9.7 MB. The old page also had to unpack 90 MB of data before showing anything.
- Data loads per country only when needed (Switzerland 606 KB, France 1.9 MB compressed).
- France (35,000 places) ranks in under 2 seconds even without a graphics card.

### Correctness

- Fixed the infinite loop in `refresh()` that broke every update in v86.
- Fixed the booklet script that leaked JavaScript text onto the page.
- 415 superseded duplicate records (Norway, Latvia, Belgium, Estonia) are excluded from rankings.
- Distances to airports, cities and the sea are now computed from coordinates instead of random fallbacks.
- Urban profiles no longer exclude large cities such as Zürich; Arctic villages no longer top family rankings (daily-services rule: 50,000 residents within 30 km).
- Region names for overseas areas show real names instead of codes.
- Map points now always belong to the country shown (a fast country switch could leave the previous country's points on the map).
- Map markers that overlap are hidden until you zoom in.
- On phones, switching country while a place is open returns to the map.
- The booklet logo was a missing file; fixed.
- French overseas places are filed under their own department (they were all under Mayotte).
- One resident figure (latest year) everywhere.

### Scoring method v2 (default)

- Adds geographic factors: hub airport distance, nearest major city, 30 km catchment, distance to the sea.
- New Coastal living profile.
- The legacy method stays available with `?method=v1` (or `&method=v1` in an explore link) and reproduces v86 exactly.

### Design and mobile

- New logo, typography (Bricolage Grotesque, Public Sans), colour system with dark mode.
- Cinematic home page with every municipality as a point of light.
- Mobile layout with a tab bar, bottom sheet place panel and menu.
- Map postcards, score rings, category bars, radar charts, flag images, drawn icons.

### Discovery and SEO

- 5,474 static pages with titles, descriptions, structured data and a sitemap.
- Global search with exonyms and transliteration.
- Shortlist, compare, shareable links.

### Deployment

- Published as finished files from `main` (GitHub Pages, no GitHub Actions); one push per release.

### Advertising, privacy and consent

- Google AdSense ready (ca-pub-2870312071451207): account meta on every page, ads.txt, Auto ads on content pages, none on legal and error pages.
- Consent Mode v2 for analytics and ads, everything off until the visitor chooses; Google's certified consent dialog is detected and used in the EEA, UK and Switzerland, Nestlyzer's own banner elsewhere; "Privacy settings" link on every page.
- New legal page: imprint, privacy policy under the Swiss FADP and the GDPR, AdSense disclosures, cookie table.

### Single-file version

- `nestlyzer.html` contains the whole app (all 35 countries) and works when opened straight from disk.
- All files well inside GitHub limits.
