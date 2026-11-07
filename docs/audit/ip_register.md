# Nestlyzer IP and data-rights audit, first pass (2.13.3)

Access date for every quoted clause: **7 November 2026**. Treat all use as commercial, because the site shows ads. Clauses are quoted from the live page fetched on that date. Where the current page could not be fetched, the item is **Yellow, snapshot pending**. That is not a verdict. This is not legal advice: the items marked ⚖ are where a lawyer's opinion is worth paying for.

## Decision memo (one page)

| # | Risk | Asset and where it is used | Finding (quoted source) | Recommendation | Quality trade-off |
|---|---|---|---|---|---|
| 1 | **Red** ⚖ | **Eurostat GISCO LAU and NUTS geodata**: boundaries, place centres and the LAU population attributes for all European countries | GISCO statistical units, LAU and NUTS: "the data will not be used for commercial purposes … If you intend to use the data commercially, please contact EuroGeographics". Required credit: "© EuroGeographics for the administrative boundaries", in the map legend and on the introductory page. | Three ways out, choose one. **(a)** Ask EuroGeographics for a licence; I draft the email. **(b)** Replace the boundaries with open national sources that allow commercial use: swisstopo (already used for CH), IGN Admin Express, BKG VG250, CBS/PDOK, and so on. **(c)** Check whether Open Maps For Europe (EuroRegionalMap is "available under an open licence") covers what we need. Population counts can come from Eurostat statistical tables (Eurostat reuse policy) instead of the geodata file. | (a) none; (b) and (c) lose detail in a few countries until each one is sourced |
| 2 | **Red**, owner decision needed ⚖ | **Coats of arms** loaded live from Wikimedia Commons by file-name guess (place pages) | Swiss Federal Act on the Protection of the Swiss Coat of Arms (SR 232.21), Art. 8(1): communal and cantonal arms "may only be used by the public body to which they belong". Art. 8(5): the body "may allow" other uses. German municipal arms are protected by state law. There was no per-file licence check. | **Owner decision, 7 Nov 2026: keep flags and coats of arms on**, risk accepted by the owner. One-line switch remains (`ARMS_ON = false` in src/js/50-enrich.js) if a public body objects; then remove promptly. | Small: decorative only, never in the score |
| 3 | **Yellow** (was Red) ⚖ | **Italy OMI** quotations (Insights page "Italy rental yields 2018"; Italian price and rent figures) | At the originator, OMI is "destinati agli utenti registrati di Fisconline ed Entratel" and commercial reuse "non è specificato" (ondata). The copy we use is republished by **Comune di Milano** with the licence "Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0)" (dati.comune.milano.it). | **Done:** the credit now names the route ("Agenzia delle Entrate – OMI … as republished by Comune di Milano open data (CC BY 4.0)"). Still advisable: send the permission email below to the Agenzia for written confirmation (an upstream licence cannot be stronger than the originator's). | None |
| 4 | **Yellow** | **Overpass API** (overpass-api.de), called live from visitors' browsers for amenities | Public-instance guideline: "a maximum of about 10000 requests per day", and "Setting up an app … relying on the public instances as backend" is listed as problematic. Commercial use is not mentioned. | Operational, not copyright: precompute amenity counts at build time (the data is ODbL, so credit OSM), or run our own instance | None if precomputed |
| 5 | **Green** (BFS, resolved 2.15), Yellow (ESTV calculator) | **Swiss federal data**: BFS "Regional portraits 2021", BFS migration, STATENT, BFS published tax burden tables; ESTV municipal tax burden 2018 | Since the revised fee ordinance came into force on 15 July 2026, BFS statistical results "may be used commercially, free of charge"; the only condition is the source credit (bfs.admin.ch/de/kommerzielle-nutzung, published 28 Aug 2026; opendata.swiss licence "Freie Nutzung. Quellenangabe ist Pflicht"). This does not cover the ESTV tax calculator or its API. | **Resolved for BFS**: keep "Source: Federal Statistical Office (BFS)" with title and link next to each figure and on the sources page. ESTV: replace calculator-derived values with the BFS-published tax burden table (asset 36503273, OPEN-BY) where it covers the same cases; ask ESTV only for what remains. | None |
| 6 | Green | **OpenFreeMap tiles** (map background) | "Commercial use is allowed" and "Attribution is required"; MapLibre adds it automatically. Free, no limits on map views. | Keep. The credit is already shown on the map. | – |
| 7 | Green | **OSM tile servers** | We do not use tile.openstreetmap.org (OSMF policy: "access may be withdrawn" for commercial services). OSM data via OpenFreeMap and Overpass is ODbL: credit "© OpenStreetMap contributors". | Keep the credit on the map and the legal page (present) | – |
| 8 | Green (credit added 2.13.3) | **Wikipedia text and Wikimedia photos** (live, place pages) | Shown with author and licence on tap. CC BY-SA text needs a visible licence and link next to the excerpt. | **Done:** every excerpt now carries "Text: Wikipedia, CC BY-SA 4.0, first sentences" with links to the article and the licence; gallery photos link to their Commons page with author and licence. Our own texts are written by us, not copied. | None |
| 9 | Green (WDI, GeoNames); Yellow, snapshot pending (others) | **World Bank WDI**, **GeoNames**, OurAirports, Natural Earth, NASA POWER, USGS | World Bank: "Creative Commons Attribution 4.0 International License", use "for commercial or noncommercial purposes at no cost"; credit "The World Bank: Dataset name"; no implied endorsement; third-party series may differ per metadata. GeoNames dump readme (mirror copy, the official page redirects in a loop): "This work is licensed under a Creative Commons Attribution 4.0 License" (CC BY 4.0 allows commercial use). | Keep the credits (method and legal pages). Never imply World Bank endorsement (we don't). Snapshot the remaining four. | – |
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
