# Nestlyzer IP and data-rights audit, first pass (2.13.3)

Access date for every quoted clause: **7 November 2026**. Treat all use as commercial, because the site shows ads. Clauses are quoted from the live page fetched on that date. Where the current page could not be fetched, the item is **Yellow, snapshot pending**. That is not a verdict. This is not legal advice: the items marked ⚖ are where a lawyer's opinion is worth paying for.

## Decision memo (one page)

| # | Risk | Asset and where it is used | Finding (quoted source) | Recommendation | Quality trade-off |
|---|---|---|---|---|---|
| 1 | **Green** (since 2.15.29) | **Eurostat GISCO LAU and NUTS geodata**, formerly: region outlines, an optional live download of municipal polygons, and place centres | GISCO statistical units: "the data will not be used for commercial purposes". | **Resolved without a licence request.** (1) Region outlines: drawn by Nestlyzer (build/build_open_regions.py) from place locations within Natural Earth 1:10m borders (public domain); NUTS codes and names are the Eurostat classification. (2) The live GISCO municipal-polygon download was removed. (3) Swiss outlines: FSO generalised boundaries 2026, opendata.swiss "terms_by" (commercial use allowed). (4) Place centres: EDJNet LAU centres, which EDJNet publishes as identifiers and statistics only, no boundary data; population: Eurostat LAU statistics (Eurostat reuse policy). Build-time assignment of places to NUTS codes still reads the GISCO file internally; only codes leave that step. | none for visitors; inland region edges are approximate |
| 2 | **Yellow, low risk** ⚖ | **Coats of arms** loaded live from Wikimedia Commons (place pages) | Each file's own Commons licence is read at runtime; only CC0, public domain, CC BY and CC BY-SA are shown (non-commercial and no-derivatives are refused), with the artist and licence credited. | Owner decision 7 Nov 2026: keep them on. Shown for identification, as in reference works (Swiss WSchG Art. 8 allows this kind of illustrative use); never suggests official status. Switch remains (`ARMS_ON = false` in src/js/50-enrich.js) if a public body objects. | none |
| 3 | **Yellow, owner decision** ⚖ | **Italy OMI** quotations (Italian municipal price and rent figures; Insights page "Italy rental yields 2018") | Credited "Agenzia delle Entrate – OMI … as republished by Comune di Milano open data (CC BY 4.0)". onData notes the Agenzia's own terms are "not an open licence" because commercial use is not stated. | **Owner decision 16 Nov 2026: keep OMI for now.** If the Agenzia objects: remove n_house_price_m2_it, n_rent_m2_it and the yields page; every Italian place keeps a scored cost figure through the regional and national estimates. | 7,281 price and 6,860 rent figures if removed |
| 4 | **Yellow** | **Overpass API** (overpass-api.de), called live from visitors' browsers for amenities | Public-instance guideline: "a maximum of about 10000 requests per day", and "Setting up an app … relying on the public instances as backend" is listed as problematic. Commercial use is not mentioned. | Operational, not copyright: precompute amenity counts at build time (the data is ODbL, so credit OSM), or run our own instance | None if precomputed |
| 5 | **Green** (BFS), **Green, low risk** (ESTV) | **Swiss federal data**: BFS regional portraits, migration, STATENT, tax burden tables; ESTV municipal tax burden | BFS: opendata.swiss "terms_by", commercial use allowed with source credit. ESTV publishes no licence terms; the values are plain tax figures (facts) of a federal authority, not protected by Swiss copyright (URG Art. 5: official reports; no database right in Swiss law). | Keep "Source: ESTV" next to each figure. When the FSO tax burden table covers the same cases, prefer it. | none |
| 6 | Green | **OpenFreeMap tiles** (map background) | "Commercial use is allowed" and "Attribution is required"; MapLibre adds it automatically. Free, no limits on map views. | Keep. The credit is already shown on the map. | – |
| 7 | Green | **OSM tile servers** | We do not use tile.openstreetmap.org (OSMF policy: "access may be withdrawn" for commercial services). OSM data via OpenFreeMap and Overpass is ODbL: credit "© OpenStreetMap contributors". | Keep the credit on the map and the legal page (present) | – |
| 8 | Green (credit added 2.13.3) | **Wikipedia text and Wikimedia photos** (live, place pages) | Shown with author and licence on tap. CC BY-SA text needs a visible licence and link next to the excerpt. | **Done:** every excerpt now carries "Text: Wikipedia, CC BY-SA 4.0, first sentences" with links to the article and the licence; gallery photos link to their Commons page with author and licence. Our own texts are written by us, not copied. | None |
| 9 | **Green** (all snapshotted 16 Nov 2026) | **World Bank WDI**, **GeoNames**, OurAirports, Natural Earth, NASA POWER, USGS | WDI and GeoNames: CC BY 4.0. OurAirports: "All data is released to the Public Domain". Natural Earth: "All versions … are in the public domain", commercial use invited. NASA POWER and USGS earthquake catalogue: US federal government works, public domain (17 U.S.C. §105). | Keep the credits (method and legal pages). Never imply World Bank endorsement. | none |
| 10 | Green | **Fonts** (Bricolage Grotesque, Public Sans: OFL files shipped), **flag-icons** (MIT), **MapLibre** (BSD, self-hosted), **AdSense/Analytics** (consent banner) | Licence files present for the fonts. The AdSense consent withdrawal test is still open. | Keep; run the consent test before AdSense goes on | – |

**EU database right:** Nestlyzer extracts and re-arranges substantial parts of official databases. Sources that allow commercial reuse (CC BY, national open licences) cover this. Restricted sources (1, 3) are exactly where it bites. ⚖

**Personal data:** no visitor input of personal data. No profiles of private individuals. Place pages show official contact details of public bodies only. Green.

## Draft permission email (OMI, item 3)

> Subject: Request for permission to reuse OMI quotations on a public website
>
> Dear Osservatorio del Mercato Immobiliare,
>
> I run nestlyzer.com, a free website that compares municipalities using official statistics; it is financed by advertising. I would like to show aggregated OMI quotations (minimum and maximum values for purchase and rent, by municipality and semester) in charts and tables, credited as "Fonte: Agenzia delle Entrate – OMI", unchanged in value and with the reference semester.
>
> Could you confirm whether this reuse is permitted, under which licence, and with which credit wording? If permission is needed, I would be grateful for it in writing.
>
> Kind regards, [name, address, email]

## Draft permission email (BFS and ESTV, item 5)

> Subject: Permission for commercial reuse of the Regional portraits and the municipal tax burden statistics
>
> Dear Sir or Madam,
>
> I run nestlyzer.com, a free website that compares Swiss municipalities using official statistics; it is financed by advertising, so its use counts as commercial. I would like to use the key figures of the "Regional portraits: key data of all communes" (BFS) and the municipal tax burden statistics (ESTV), unchanged in value, with the year and the credit "Source: Federal Statistical Office (BFS)" or "Source: Federal Tax Administration (ESTV)" next to each figure and on the sources page.
>
> Could you confirm that this commercial reuse is permitted, and with which credit wording?
>
> Kind regards, [name, address, email]

## Still to do in this audit (next pass)

- Snapshot the opendata.swiss category of the remaining Swiss datasets (population series, boundaries: swisstopo is open).
- Snapshot the licence pages for Natural Earth, OurAirports, NASA POWER, USGS and each national statistics office (FR, US, CA, AU, JP, KR, TW, SG, NZ).
- Check the AdSense programme policies.
- Write a NOTICE file, a Sources page section and a takedown contact (the report address already exists on /legal/).

## Additions in 2.15.28

| Source | Use | Licence (quoted or checked 15 November 2026) | Status |
|---|---|---|---|
| OECD Taxing Wages 2026 | national tax wedge for an average single earner, an estimate where no local tax figure exists | CC BY 4.0 (OECD data since 2024) | Green |
| World Bank WDI GC.TAX.TOTL.GD.ZS | tax revenue share of GDP, national estimate | CC BY 4.0 | Green |
| Amt für Statistik Liechtenstein, *Liechtenstein in Zahlen 2025* | Liechtenstein tax revenue and GDP | CC BY 4.0 | Green |
| Penn World Table 11.0 (Groningen Growth and Development Centre) | Taiwan national price level, scaled to the World Bank series | "licensed under a Creative Commons Attribution 4.0 International License" (rug.nl PWT 11.0 page) | Green |
| BFS official municipality register, mutation records | which Swiss municipalities merged, when, and their new numbers (facts only) | official register; facts are not protected; BFS results may be used commercially with credit (item 5) | Green |
| swiss-maps npm package (interactivethings), 2026 edition | official numbers per year (facts), and since 2.15.29 the shipped Swiss outlines: FSO GEOSTAT generalised boundaries 2026 | code BSD-3-Clause; data: FSO on opendata.swiss, "terms_by" (open use, source required, commercial use allowed); the package README's older non-commercial note predates the FSO's open terms. Correction: until 2.15.28 the shipped outlines were the 2021 edition from this package | Green |
| Natural Earth 1:10m admin-0 (world-atlas package) | country borders and coastline for the region layer | public domain | Green |
| GISCO healthcare services 2020 (hospitals), compiled from national health authorities | only derived figures are published: distance to the nearest hospital and the number of hospitals within 25 km; the hospital records themselves are not republished | GISCO metadata: no dataset-wide licence; "See the licensing conditions for every individual country … on the website of the provider" (France Licence Ouverte, Italy IODL 2.0, Netherlands open data; several "TBD" or "not stated"). This is separate from the GISCO boundary terms. Credit kept: "Eurostat / GISCO, compiled from national health authorities". | Green, low risk (derived facts only) |
| The Economist Big Mac index (github.com/TheEconomist/big-mac-data), July 2026 | Big Mac price per country on place cards, context only, never scored | README: "The data generated by The Economist are available under the Creative Commons Attribution 4.0 International License"; the licence does not cover other Economist content (none used). "Big Mac" is McDonald's trademark, used only to name the index. | Green, credited on every card |
| Eurostat price level indices (prc_ppp_ind), live from the visitor's browser | everyday prices by spending category on European cards, context only | Eurostat reuse policy: commercial reuse allowed with source credit | Green |

## Additions in 2.15.30 (proxy indicators)

| Source | Use | Licence (checked 16 November 2026) | Status |
|---|---|---|---|
| World Bank WDI GC.DOD.TOTL.GD.ZS, GC.REV.XGRT.GD.ZS, GC.XPN.TOTL.GD.ZS | government debt and budget balance (revenue minus expense): national tax outlook in the world rankings and in the country history | CC BY 4.0 | Green |
| World Bank WDI IS.RRS.TOTL.KM, AG.LND.TOTL.K2 | railway density, national infrastructure proxy (mobility, freight) | CC BY 4.0 | Green |
| World Bank WDI IT.NET.SECR.P6 | secure internet servers per million people, digital infrastructure proxy (series from 2018: counting method changed in 2017) | CC BY 4.0 | Green |
| World Bank WDI ER.H2O.FWTL.ZS | freshwater withdrawals, water-stress proxy (environment) | CC BY 4.0 | Green |
| Eurostat gov_10dd_edpt1 and gov_10a_exp (COFOG GF0405 transport, GF0603 water supply), live from the visitor's browser | budget balance, debt and infrastructure spending on European cards, context only | Eurostat reuse policy: commercial reuse allowed with acknowledgement | Green |

All are national figures. They enter only the country part of the world and continental rankings; the order of places inside a country is unchanged.
| Politics tab: memberships, agreements, state structure (data/politics.json, build/build_politics.py) | context on the place panel, never scored | public facts from official member and treaty lists; own compilation | Green |
| Wikidata live: heads of government (P6), parties (P102), alignment (P1387) and ideology (P1142), parliament seats (P1410/P1268) | Politics tab, from the visitor's browser | CC0 | Green |
| Coats of arms on static place pages (assets/arms.js) | same rules as in the app: Wikidata P94, Commons file with open licence only, credited | per-file open licence checked at runtime | Green |
