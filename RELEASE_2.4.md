---
title: "Nestlyzer 2.4: privacy-first, built by GitHub, refreshed every year"
subtitle: "Nothing goes to Google before consent, light Analytics after it, a self-refreshing data pipeline, new maps and charts on every country and place page, and a final independent audit"
date: "11 October 2026"
---

# In short

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

AUDIT_TABLE

# 5. How it was checked

## Automatic tests

REGRESSION_TABLE

Also passing: 49 of 49 legacy score fixtures, 60 of 60 builder fixtures, all data checks, and the new smoke test that GitHub runs before every publish.

New in 2.4:

| Test | What it checks |
|---|---|
| R23 | Light Analytics: everything denied by default. "Accept all" grants statistics and ad cookies, never personalised ads. Google signals and ad personalisation are off. |
| R69 | No Google request before a choice or after "Only necessary"; after "Accept all", Analytics and the ad script load once each |
| R71 | Dot-map pins match the list and link to real pages; overseas ranks are named; the chart starts at zero; strength bars |
| R72 | Privacy settings in Tools (with focus inside the banner), Imprint and privacy, and live content switched off stops all outside lookups |

## Single file

STANDALONE

# 6. Screenshots

SCREENSHOTS

# 7. Open items

**For you**

1. Publish 2.4 as the deploy guide describes:
   - Settings → Actions → allow actions;
   - Settings → Pages → Source: GitHub Actions;
   - one paste in Terminal;
   - one commit and one push;
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
