---
title: "Nestlyzer: next data delivery"
subtitle: "How to hand files over, what was imported from 24 October, and what comes next"
---

# 1. How to hand files over (read this first)

Your 24 October package was announced as a ZIP behind a "sandbox:" link. That file never reached Anton or Claude and can't be downloaded now, so only the four files Anton copied by hand arrived. From now on:

1. **Individual files, no ZIP.** Offer each output file for download in the chat as its own file, with a plain name such as `industry_US_CBP_2023.csv`. Never answer with a "sandbox:" path or a link to your own workspace.
2. **Small files:** at most 15 MB each. Split larger tables by country or state (`industry_US_CBP_2023_part1.csv` ...).
3. **Check before you finish.**
   - List every file with its name, rows and size.
   - Confirm that each one opens as a download for Anton.
   - Stop and say so if any cannot be downloaded.
4. **Fallback:** if you can't create downloadable files, paste the CSV in code blocks of at most 400 rows, each block headed with the file name and part number. Anton copies them; Claude joins them.
5. **One task per delivery.** Industry structure first; nothing else until it is handed over.

# 2. Your inputs: everything is public on the live site

You don't need anything from Anton's computer or from GitHub. **Read-only:** do not push, open pull requests or change anything on GitHub.

The current inputs are published on nestlyzer.com and can be read directly:

| File | URL | Use |
|---|---|---|
| Place list with native codes (128,466 places) | https://nestlyzer.com/nzdata-downloads-places_lookup_for_mapping.csv | the `code` column for every industry and mapping row |
| Unresolved source geographies | https://nestlyzer.com/nzdata-audit-unresolved_geographies.csv | geography mapping task |
| Industry coverage per country | https://nestlyzer.com/nzdata-audit-industry_coverage.csv | what is missing |
| KPI coverage (177 KPIs × 45 countries) | https://nestlyzer.com/nzdata-audit-kpi_coverage.csv | KPI task |
| Gap matrix | https://nestlyzer.com/nzdata-downloads-gap_matrix.csv | all gaps |
| Full briefs | https://nestlyzer.com/nzdata-downloads-brief-industry-structure.md, https://nestlyzer.com/nzdata-downloads-brief-kpis.md, https://nestlyzer.com/nzdata-downloads-brief-geography-mapping.md | detailed rules and sources |

The same files are in the package Anton attaches (`ChatGPT-Data-Tasks-2.10.3.zip`), in case the site isn't updated yet.

# 3. What was imported from 24 October (Nestlyzer 2.10.3)

| Delivered | Result |
|---|---|
| 948 fresh observations (`observations_fresh.csv`) | All stored. Re-import adds 0. No record is score-eligible. |
| 17 repeats, 1 precision conflict | Settled. Your Insee records are shown; the older Master V7 copies stay stored. Paris poverty shows 16.8%. |
| Insee: Paris, Lyon, Marseille (465) | Shown on the place pages: industry structure kept apart by basis, establishment sizes, hotels, facilities. |
| Eurostat Housing 2025 (83) | 72 shown as national context in 22 countries. |
| BTS ports (400) | Linked to 50 Nestlyzer ports and shown as port size. Eight missing US cargo ports were added. |

**Lost with the ZIP:** these must be handed over again as individual files, after the industry task:

- `geo_mapping.csv` (the 102 resolved areas)
- the business catalogue
- the household budget module

# 4. Next delivery: industry structure for whole countries

The cluster criterion (logistics where logistics firms already are, chemicals where chemical firms are) has the highest weight in every business profile. It compares a place's share with the national share, so it needs every place in a country, or at least every county or NUTS3 region. **Three French cities cannot switch it on.**

**Acceptance:** a country is done when at least 90% of its places (from the place list above) have a row at municipality or county/NUTS3 level.

**Order:**

1. **United States:** Census County Business Patterns, county × NAICS, employees and establishments (one national file).
2. **United Kingdom:** ONS BRES or UK Business Counts, local authority district × SIC division (Nomis).
3. **Germany:** Bundesagentur für Arbeit, employees by WZ 2008 division per Kreis.
4. **Switzerland:** BFS STATENT, employees and workplaces by NOGA division per Gemeinde.
5. **France:** Insee Flores or SIRENE, commune × NAF division (one national file, not per-city dossiers).
6. **Netherlands:** CBS vestigingen per gemeente × SBI.
7. **Then:** Austria, Italy, Spain, Belgium and the Nordics (sources in the full brief).

**Format:** one CSV per source, columns `cc,level,code,classification,sector,measure,value,period,source_id`, plus one `sources.json`.

**Rules:**
- Divisions (2-digit), not only sections.
- Counts, not shares.
- Suppressed cells are left out, never written as 0.
- A district value is never copied into municipalities.

**If you cannot download bulk files**, say so at the start. Instead of transcribing tables, give Anton one line per country:
- publisher
- dataset name
- exact download URL
- file format
- approximate size

Anton downloads them in a browser and attaches them to Claude, who converts them.

# 5. Still open after that

- **177 KPIs:** first the business cost KPIs by country:
  - industrial electricity and gas prices
  - industrial land prices
  - hourly labour cost by sector
  - corporate tax

  Then the household KPIs with national panels: new-lease rents, childcare cost and school results.
- **453 unresolved geographies:** official codes only, never nearest-name guesses.
- **Still empty:** Swiss industrial land prices, tourist nights and data-centre power tariffs.
