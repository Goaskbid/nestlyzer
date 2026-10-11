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

REGRESSION_TABLE

## Single file

STANDALONE

## Independent audits

Two separate reviewers, who had not seen the code changes, each spent about 35 minutes as first-time users on a desktop and a phone, in the website and in the single file. Their findings are in section 2.

# 7. Screenshots

SCREENSHOTS

# 8. Open items

**Mine (next round, if you want them):**

1. Rents, house prices, broadband and travel times need a data source that costs money or a small server. I can prepare a proposal with costs.
2. Live checks on the published site for the services that are blocked here: photos, Wikidata, the OpenStreetMap counts, Eurostat and the map tiles. They are tested with simulated answers and fail politely, but the real answers should be looked at once after you push.
3. A language switch (German, French, Italian) for the interface and for search engines.

**Yours:**

1. Push 2.2 with GitHub Desktop, following the step-by-step deploy guide. The guide also removes all old files in the same commit.
2. Decide on the EU (and UK) representative: a trusted person in the EU, a paid service, or no tracking of EU and UK visitors. Send me the name and address if you appoint someone.
3. After the push: AdSense site review and the consent message, Google Analytics retention at 14 months, and the sitemap in Google Search Console (all in the deploy guide).
