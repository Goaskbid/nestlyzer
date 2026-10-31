# Changelog

## 2.11.1 (October 2026)

- **US industry clusters switched on:** Census County Business Patterns 2023 (employees by NAICS per county; build/build_us_cbp.py). 21,151 of 21,184 US places (99.8%) are linked to their county by point in polygon; the cluster figure is labelled as a county figure. Location quotient against the published all-industry total, exact codes at their own level (no nested double counting), employees and establishments never mixed. Cluster weight per project type (logistics, chemicals, manufacturing 30 ... data centres 0).
- US results: manufacturing led by the Detroit and Toledo area, pharma by Cambridge (Kendall Square) and the Bay Area, logistics by central New Jersey, Joliet and the Inland Empire (Joliet 99th, Ontario 98th percentile; Louisville 67 -> 89, Memphis 55 -> 75).
- Decisions: no ranking-formula switch before it beats the benchmark; divorce rate not used; Italian OMI data not used until its licence is confirmed for commercial use; Paris poverty 16.8% kept.

## 2.11.0 (October 2026)

- **Cross-country rankings rebuilt (two levels):** each criterion combines the country's standing on comparable national figures (World Bank WDI, Transparency International, V-Dem, Women Business and the Law, ND-GAIN; build/build_national.py), measures that mean the same everywhere (distances, climate class, people nearby, residents within 100 and 300 km) and the place's rank inside its own country. Ties of whole regions are gone; students and all 13 company-site profiles are ranked across countries; the rankings band shows in business mode too. One file per region (nzdata-rank-europe.json ...).
- **Benchmark:** tests/rank_benchmark.py scores rankings against fixed reference places (tests/rank_refs.json). Cross-country: mean percentile of the references 54 -> 70, share in the top 5% 7% -> 40%.
- **New categories:** climate (Köppen-Geiger class and winter daylight), services nearby (people within 10 km), one-day truck radius (residents within 300 km, logistics).
- **Profiles rebuilt:** retirees, single retirees, early retirees, remote workers, coastal living and budget now weigh climate and services; minimum sizes stop tiny villages from leading. Logistics weighs the 300 km radius (Bad Hersfeld and Kassel up). Old weights kept for method v1.
- **Company sites across countries:** the national part of site fit is labour cost for cost-driven sites and talent for skills-driven ones (contact centres no longer led by Zürich).
- **Audit against published rankings:** Bilanz/IAZI Gemeinderanking 2025, EIU Liveability 2025, IMD Competitiveness 2025, Prologis logistics markets and fDi Cities of the Future 2025 are part of the benchmark. HQ no longer uses the household category Basics (London, Dublin, La Défense now lead); tech and services add market reach.
- **National key figures:** 812 World Bank WDI records for 44 countries shown as "The country at a glance"; KPI-country pairs with data 1,092 -> 1,421.
- **Profile audit:** city scale, university-town character, climate exposure (estimate) added; urban, car-free, digital natives, students, young families, single parents, low income, first home and climate-resilient profiles reweighted on what those groups choose by (old weights in method v1). EIU liveability benchmark 87 -> 96.
- **Map:** anchor pins are compact (icon, short name, km) and shrink to icon and km when they collide.
- **Category chips open the measures:** clicking a category anywhere (result cards, Scorecard) opens every measure behind it with value, score and source.

## 2.10.3 (October 2026)

- **ChatGPT delivery of 24 Oct imported** (build/source/deliveries/): 948 fresh official figures, stored next to Master V7 (re-import adds 0). 17 figures that repeat Master V7 values and one precision conflict (Paris poverty rate 16.8% vs 17.0%) are settled in build/source/context/overlap_decisions.csv, so no figure is shown twice; the detailed Insee value is shown, the older one stays stored.
- **Paris, Lyon, Marseille:** business pages show the local industry structure (share of employee positions, of employer establishments and of active local units, kept apart because the bases differ), establishments by size and new establishments by sector, and hotels; household pages show shops, doctors, pharmacies and schools in the municipality.
- **Housing conditions in the country** (Eurostat 2024): household size, owner occupation, overcrowding, inability to heat the home, payment arrears, housing cost burden, labelled national.
- **US ports:** the port breakdown shows the size of the nearest US port (BTS 2026 report: cargo 2023, loaded containers 2023, cranes and terminals 2025) for 50 sea and inland ports. Eight top cargo ports added to the seaport list (Lake Charles, Freeport, Texas City, Galveston, Pascagoula, Brownsville, Plaquemines, Valdez), so places there are measured to their own port.
- **New criterion: chemical park nearby.** Distance to the nearest of 89 chemical parks and refinery complexes with pipeline links (Ludwigshafen, Leverkusen, Schweizerhalle, Antwerp, Rotterdam, Houston Ship Channel, Lake Charles ...): 100 within 3 km, 0 from 40 km. Weight 20 in port-based industry, 15 in energy-intensive production. The US port-industry ranking had put Miami and Fort Lauderdale on top; it now leads with Corpus Christi, Deer Park, Port Arthur, Channelview and Lake Charles.
- **Port-based industry:** the railway requirement is 25 km instead of 10 km, because the Natural Earth rail layer misses port spurs (Baytown and Port Arthur were excluded). Beaumont and Port Arthur are two ports now, not one point.
- Industry clusters stay off: the delivery covers 3 French cities, not the whole countries the cluster score needs.

## 2.10.2 (October 2026)

- **Start page follows the switch:** in business mode the household sections (profiles for every kind of move, the three steps, the Swiss tax feature, household FAQ, cross-country household rankings) are hidden and the business sections show instead: business site profiles, the steps from a site brief to a shortlist, and questions companies ask. Home mode shows the reverse.
- **Interview:** the standfirst and two answers now cover companies as well as households.
- **Business scoring rebuilt:** private income and wealth taxes no longer count for any business site. New measures from build/build_reach.py: key inland ports (Basel, Duisburg, Mannheim, Strasbourg, Vienna, Linz, Budapest, US inland and Great Lakes ports; 77 in all) count like seaports for freight and port-based industry; market reach (residents within 100 km, across borders) leads logistics and fulfilment; flat land counts for logistics and industry. An industry-cluster category (location quotient of the profile's NACE/NAICS industries, build/build_clusters.py) carries the highest weight in every company-site profile as soon as the industry data is imported.
- **Map pins follow the target group:** students see the nearest universities and universities of applied sciences (ROR registry, CC0), labs and tech offices universities and research institutions (CERN, DESY, PSI, Fraunhofer, Max Planck, Helmholtz, national laboratories), chemical and energy-intensive sites seaports, inland ports and chemical parks with pipeline links, logistics ports, the hub airport and the next big city; households the hub airport, the next big city and a university.
- **Small-business profiles dormant:** shop, café, workshop, practice, studio, start-up and guesthouse are no longer offered; their settings stay so old links still open.
- **Cross-country rankings** cover household profiles; business sites are ranked country by country (freight access is prepared for cross-country use).

## 2.10.1 (October 2026)

- **Own line icons everywhere:** every emoji in the app (place facts, story cards, Tools, Records, nearby amenities, header buttons, static pages) is replaced by a Lucide-style line icon (ISC licence). Static pages get the icons at build time; the app swaps any emoji it renders at run time, with the drawings loaded once from `data/icons.json`.
- **Flat upload folder:** the cross-country rankings and the icon drawings are separate files (`nzdata-rank-global.json`, `nzdata-icons.json`) instead of being packed into `index.html`, which keeps the start page 0.2 MB lighter; a new test (`tests/test_flat.py`) checks them on the upload folder itself.
- **Start page lighter:** the nearby-amenities and regional-snapshot code moved to the on-demand module (117 KB compressed, budget 120 KB).

## 2.10.0 (October 2026)

### Global and continental rankings
- New scope chips above the results: **Country**, **Europe**, **Americas**, **Asia-Pacific**, **World**. Cross-country rankings use only measures defined the same way everywhere (Eurostat regional figures, price level, homicide rate, air quality, distances, population size and growth), re-scored across the scope. A place needs comparable data for at least 40% of the profile weight; criteria without a comparable figure count as the middle of the field. Country rankings are unchanged.

### Master data (Master V7)
- 33,108 collected records imported (idempotent, 0 conflicts); 1,490 held records excluded; 31,618 review candidates, 2,066 already present. Linked to 1,958 places by official code or unique name, 93 states and NUTS3 counties, 27 weather stations and 127 countries. Shown as **More local figures** in the Housing and work / Labour costs panel, in All data and in the evidence export. Context only: never scored, score_eligible stays false.

### Deeper data, shown first
- **Key facts** at the top of every place page: up to 12 of the place's own official figures, the most relevant for your profile first, each with its year, level and source. Where a place has few local figures, district, regional and national ones fill the list and say so.
- **Housing and work** (households) and **Labour costs** (businesses), from the release `verified-rent-pay-2026-10-21` (1,146 official records):
  - rents and rent trends for Norway, Sweden and Finland;
  - pay by occupation for seven US metro areas and the US;
  - Canadian pay;
  - employer labour costs for the EU countries, with the EU-27 benchmark;
  - investment price levels.
- Every row shows its area (municipality, rental zone, metro area or national), its period, its unit and whether it is a mean. Yearly per-m² rents are never shown as monthly; the monthly equivalent is marked as our conversion. These figures are context: they never change a score or the measured share.
- The shortlist download is now an **evidence export**: purpose, profile, weights, score, rank, the data behind it, must-haves, every figure with period, level and source, and the rent and pay rows.

### Clearer, confident wording
- Gaps are no longer advertised. Empty facts are left out, and "no data", "unknown" and "not measured" lists are replaced by what is known.
- Depth labels: Rich local data, Local data, Regional data, Regional overview. Evidence labels: Detailed local data, Local and modelled data, Regional overview.
- Business must-haves without open data (industrial plots and permits, grid connection) appear as **Next steps on site**. Household scorecards get **Next steps before moving**.

### Business locations: 14 site types
- New small-business sites: shop or showroom, café or restaurant, craft workshop or trade business, medical or professional practice, studio or creative agency, start-up or small office, hotel or guesthouse.
- They sit next to the seven company sites, in two groups, each with its own line icon.
- The engine supports an industry focus per profile. A GICS-style sector and industry-group mapping is prepared (`build/source/business/gics_map.json`) and switches on when the per-municipality industry data arrives.

### Map and audit items
- **Best 10 / Lowest 10** switch for map pins. Only scored, eligible places can be among the lowest.
- The method page explains how each modelled criterion is built.
- All counts come from one build manifest (`docs/manifest.json`), which also updates the README.
- **Prepared, not switched on:** the ranking formula based on the true evidence share. Rank-change reports for four profiles are in `docs/rank_change_*.json`.

## 2.9.0 (October 2026)

Repairs from the 18 October re-audit (52-finding ledger). Every repaired finding has a browser test that fails on the live 2.8.1 site and passes on 2.9.0 (`tests/test_v29.py`); the status of all 52 is in `docs/ledger_2.9.0.csv`.

### Honest evidence behind every score (NZ-GLOBAL-049)
- The scorecard, the place panel, "All data" and the results list now show **how much of your weighting has data, and how much of that is measured** rather than estimated. Example: "92% of your weights have data (46% measured, 46% estimated)".
- Each score is labelled **Well assessed**, **Partly assessed** or **Screening only**. The list marks the last two.
- The old "coverage" figure was raised by a count-based floor and could claim more than the data supports. It is no longer shown. Rankings themselves are unchanged for now; switching the ranking formula needs your decision.

### Links and saved choices
- **Fine-tuned profile weights** are kept when the builder reopens. Changing an answer says that it replaced them, and a separate reset is offered.
- **Language choice:** an unmatched language is no longer dropped silently. The results explain why nothing matches and offer "Show every place" or "Edit my profile".
- **Shared links** keep the name filter; a link without one clears it.
- **Overview links** now open Overview, even if you were on "All data" before.
- **Comparison links** show the comparison without filling your shortlist. A "Save these places" button adds them on purpose.
- **Shared custom weights** are checked first: negative, out-of-range, unknown or all-zero weights are refused with a message, and an existing custom profile is kept. A minimum population of 0 now stays 0.

### Clearer data and map
- **All data:** other households' scores moved into their own "Compare profiles" group. A missing measurement says "no measured value" instead of showing a 0-100 score.
- **Map pins:** a language-area leader outside the top 10 shows its rank in that language area (for example "FR 1"), and the tooltip gives both ranks. With another layer coloured, pins say they show the profile rank.

### Keyboard and phones
- Search keeps keyboard focus inside its window.
- On phones the filter sheet is a proper dialog: focus starts inside it, stays there, Escape closes it, and focus returns to the Filters button.

### Business page
- A blank or invalid quantity is "unknown" or flagged, never USD 0. An explicit 0 stays 0.
- The screen and the company brief share one annual consumption. The brief (schema v2) records the industry, filters, weights, compared states and top states it was made from.

### Start page
- The business globe is now exactly as big and in the same place as the places globe, on desktop and phone.
- Fixed: a group of land cells without a country code (around Djibouti and Somaliland) blinked as if it were a second compared country. Only the chosen country lights up now.
- The mode toggle, the business chips and "Build my own" use Nestlyzer's own line icons instead of emoji.

### Speed
- The printable booklet loads only when opened, so the start page stays under 120 KB compressed.

## 2.8.1 (October 2026)

### Website works again after a browser upload
- **"Could not load Denmark" fixed.** GitHub's web upload drops folders, so the 2.8.0 data files landed in the wrong place. The website is now one flat folder (68 files, no subfolders): `index.html`, `business.html` and `nzdata-…` data files. It works no matter how the files are uploaded. Checked against a copy of the live repository.
- If files are missing, the page now says which ones, instead of failing silently.

### Business locations and the globe are back
- The start page has a toggle, "Places to live | Business locations". Business mode shows the business hexagon globe, the business profiles and its own headline. The choice is remembered, and `?mode=biz` opens it directly.
- In the app, the same toggle sits above the profile chips. On phones it also appears at the top of the profile picker.

### More official data
- New: German rents (Zensus 2022), Italian home prices and rents (Agenzia Entrate OMI, 2018), more Japanese municipal statistics (e-Stat), Australian council figures, and Irish census figures by local electoral area (unemployment, long-term unemployment, third-level education).
- 34 of 45 countries now show "Measured data"; 6 have regional figures and 5 basic data.
- The start page's country list used the old depth labels and still called 33 countries "Foundation data". It now uses the real data depth.

### Mobile and speed
- On phones the globe sits at the top, the business chips wrap cleanly, and the "All data" charts fit the screen width.
- The start page stays under 120 KB compressed: icons are leaner and the script output is modern.

## 2.8.0 (October 2026)

### Official data for every country
- **189 new measures from official sources**, joined to every place, each with its source, year and level visible on the place page ("All data") and on the method page.
  - Europe, every region: Eurostat income per person in purchasing power, GDP per person, unemployment, life expectancy, doctors, tertiary education, poverty or social exclusion, road deaths, net migration, police-recorded assaults, robberies and burglaries.
  - Municipal figures: France (income, rents, property tax for about 98% of communes), Spain (income), Germany (local property and business tax multipliers), Belgium (municipal income tax, rents, house prices), Netherlands (income), Portugal (income and house prices), Poland (wages and house prices), Sweden, Denmark and Norway (municipal income tax, income, house prices, crime, life expectancy), United Kingdom (40+ ONS council indicators incl. council tax 2026-27, house prices, pay, schools, life expectancy, happiness), Finland.
  - Outside Europe: US counties (income, poverty, unemployment, life expectancy, doctors, air quality, crime, housing costs, home values and rents for most states), Canada (census divisions), Australia (LGAs), Israel (localities and councils), Japan (municipal finances).
  - Everywhere: distances to hospitals, universities and railway stations (where an open register exists), national homicide rate and price level.
- **Your 16 October package is in**: UK broadband, mobile coverage, supermarkets and station access; Swedish 2026 population flows; Belgian, Spanish and NZ prices and rents; national price levels for 37 countries.

### Honest scoring
- Outside Switzerland, categories without data used to be filled silently (for example "Affordability" from population density). Measured data now replaces these stand-ins; where a stand-in remains it is labelled on the place page and counts half.
- Comparable measures are scored on one scale across countries; country-specific definitions are scored within the country; a national figure alone never flattens local differences.

### Place list repaired (official change records)
- 566 abolished or merged municipalities removed from rankings; 455 current municipalities without a point now placed; 362 Greek communities and 4 Tokyo wards moved to their correct location; Bournemouth, Christchurch and Poole and Dorset added; Scottish areas and former English districts take their current council's figures.

### Faster, GitHub-safe website
- The website is now a 3 MB index.html plus one data file per country, loaded only when a country is opened (was one 23 MB file). 68 files, the largest under 20 MB; checked automatically (tests/split_test.py).

### Data notes
- Left out for licence reasons (the site carries ads): WorldClim climate grids and WHO road-death estimates (non-commercial terms).
- Build: build/build_v28.py with inputs in build/source/v28/ (values, sources and reports per domain); build/source/roster/ for the place repair.

## 2.7.0 (October 2026)

### Business locations
- **Business mode in the app.** A "Business locations" chip switches the ranking to seven business profiles:
  - Manufacturing plant
  - Logistics and distribution hub
  - Software and tech office
  - Shared-service centre
  - Research and life-science lab
  - Regional headquarters
  - Port-based and energy-intensive production
- **Built on the same engine.** Each profile has adjustable weights and hard **must-haves** with three states: met, not met or unknown. Unknown never counts as met. You choose whether unknown places are flagged or left out.
- **No invented data.** Grid capacity, plots and permits have no open data per place, so they are always shown as unknown.
- **Freight access** (motorway, rail, seaport) is a new measured criterion for business profiles.
- **Separate business shortlist**, kept apart from the household one.
- **Business locations (Beta) page.** Restyled as Nestlyzer Business: the same logo and fonts, a teal and copper accent, and a hexagon globe with a radar sweep that turns to the compared economies. It links straight into the business ranking for the chosen country.

### Personal tools (no account)
- **Scorecard** tab for every place: your score, each criterion with its weight, score and rank, the strongest and weakest criteria, the must-haves and what is not measured there.
- **My Top 10:** your shortlist ranked by your current preferences, or in your own order (↑ ↓). Statuses: interested, favourite, visited, excluded.
- **What if:** move the weights and watch the ranking change live, with ▲ ▼ against the baseline and the reason each place moved. Scenarios can be saved, compared side by side, or used as your profile.
- **Better than home?** Your home or any saved place against your alternatives, on the same criteria. Raw figures are shown next to the scores, trade-offs are listed, and anything that cannot be compared is named.
- **Your saved data:** download one file, restore it on another device, or delete everything. Everything stays in this browser; nothing is sent to a server.

### Data and fixes
- **Places outside Europe:** the "Europe" and "municipality" wording, the source lines and the look-alike texts now fit those countries.
- **Start page:** the game, the tour and the records load on demand, so the start page stays under its 120 KB budget.

## 2.6.1 (October 2026)

- **Rankings outside Europe.** They no longer crown the biggest city for every household:
  - Crowding (people per km² within 10 km) now balances size, as density does in Europe.
  - Whole-city entries are no longer ranked; their districts are.
- **Coastal living** counts the sea or a lake of 25 km² or more (2,643 lakes) as the shore. Messages name the area you picked.
- **Globe:** about twice as fast, with coastlines, borders and a grid.
- **All data:**
  - Country tax facts for 33 OECD countries (Tax Foundation ITCI).
  - Economy and V-Dem institutions for all 45 countries.
  - US state jobs and electricity prices (BLS, EIA).
  - The corporate-tax rules and support programmes from the 16 October business package.
- **Business locations (Beta)** page and link.

## 2.6.0 (October 2026)

### Ten countries outside Europe

- The United States, Canada, Japan, South Korea, Taiwan, Hong Kong, Singapore, Australia, New Zealand and Israel join the 35 European countries: 45 countries, 129,508 places.
- 29,970 places from GeoNames (towns and city districts with 500+ residents; 34,422 entries before removing overlaps), de-duplicated so city sections and whole cities do not count twice (whole cities stay listed and are marked).
- Local names in brackets, in their own script: Tokyo (東京), Seoul (서울시), Taipei (臺北市), Sha Tin (沙田), Tel Aviv (תל אביב). Regions too: Tokyo (東京都), Tel Aviv (מחוז תל אביב). Search finds places by either name.
- States, provinces, prefectures and districts from Natural Earth, with their local kind (US State, Japanese Prefecture, Israeli District and so on), map outlines, region pages and greater areas.
- The same geographic measures as in Europe: distance to a city of 100,000+, hub airport, railway, motorway, sea, lakes, rivers, ports, borders and the capital; residents within 10 and 30 km; terrain, climate type (now including tropical climates), daylight and sunset (correct for the southern hemisphere), time zone with summer time.
- All data outside Europe: consumption tax (VAT, GST or sales tax with how it works), corporate income tax, currency, driving side, emergency numbers, GeoNames id. Eurostat figures are Europe-only and say so.
- Data depth "basic": these countries rank on population and geography for now; the page says what the rank rests on.
- Start country picker grouped by continent; country, place and profile pages for all 45 countries.

### Two new households

- Business owner: jobs and market size, taxes, access (airport, city, rail), safety and basics. Its page has a business climate table for all 45 countries (corporate income tax, VAT, each country's best place).
- Digital native: city life, access, costs, jobs and a young population.

### Start page

- The Europe-at-night picture is now a slowly turning night globe (WebGL): every ranked place is a light, coloured by fit for the chosen household; choosing another household crossfades the lights. It pauses when off screen, stands still with reduced motion, and falls back to the still picture without WebGL. It starts over Europe, the Americas or East Asia depending on the visitor's time zone.
- The globe code and the profile builder load on demand, so the start page stays within its size budget (118 KB).

### Fixes

- The why-card no longer cites population trend or density where they do not exist.
- "Neighbouring places" wording works in every country.

## 2.5.1 (October 2026)

- PDF booklet now holds every figure: all weighted categories, all factors, and the full "All data" section with live figures (loaded for up to 8 seconds before printing).
- Comparisons can be saved as PDF: the comparison table, the short verdicts and every figure side by side.
- All data adds the score for every household type, population trend details, municipalities within 12 km, look-alikes and cross-border context.
- Explainer photos (municipality and region) are never left empty: when Wikipedia has no real photo (only a map, flag or coat of arms), a filtered photo from nearby is used; the two slots show different photos.
- Crime figure: the request names Eurostat's real dimensions (hhcomp, rskpovth). Checked against live Eurostat answers.

## 2.5.0 (October 2026)

- "All data" tab on every place: every figure Nestlyzer holds, in 11 themed groups that start closed, with source and year per row, "Open all groups" and a CSV download.
- Compare: "Show all data" adds every figure for the two or three places, side by side (about 120 rows plus live rows).
- Start screen: "More households" unfolds the other 17 household types; the picture shows the closest of the eight drawn profiles.
- "What data we have": a catalogue of every dataset (level, countries, source, year, in the score or not) and what is still missing and why. In Tools, in "All data" and on the method page.
- New live figures (Eurostat, in the visitor's browser): children under 15, residents 65+, children per woman, foreign citizens (20–64), household disposable income, poverty or social exclusion risk, university degrees, reported neighbourhood crime (national survey).
- Risks to check: earthquakes M4.5+ within 100 km since 1975 (USGS), hottest month and frosty months (NASA POWER), prompts to check flood and mountain hazard maps.
- Good to know: EU, Schengen, euro, currency, standard VAT rate, driving side, 112, time zone; Wikidata facts.
- Everyday life: post offices, banks and parks added (17 types).
- Picture filter: drops people and portraits, black-and-white and sepia (by pixels too), maps, plans, documents, old photos, off-topic close-ups and near-copies of the same shot.
- The new code loads on demand (assets/more.js), so the start page stays within its size budget (119 KB).
- Privacy policy lists the US Geological Survey; Eurostat items updated.

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
