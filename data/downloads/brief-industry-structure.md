# ChatGPT task (top priority): industry structure per municipality, so Nestlyzer can find industry clusters

## Why this comes first
Nestlyzer's business rankings put a site where similar companies already operate: logistics where logistics clusters (Härkingen-Egerkingen, Duisburg, Venlo), chemicals where chemical parks are (Basel/Schweizerhalle, Ludwigshafen, Leuna), software where software firms concentrate.

The ranking engine is ready. For every business profile it computes a location quotient, i.e. the local share of that profile's industries divided by the national share, and weights it 40 out of about 140, ahead of every other criterion. **Without this data the cluster criterion is empty.** Every other business task waits until this one is done.

## What to deliver
Employment (preferred) or local business units, by industry, for every municipality. Where the source is only published by district/NUTS3/county, use that level.

**One CSV file per source**, saved as `build/source/industry/<source_id>.csv`, with exactly these columns:

```
cc,level,code,classification,sector,measure,value,period,source_id
```

| Column | Content |
|---|---|
| `cc` | Nestlyzer country code (DE, CH, FR, ..., UK, EL for Greece) |
| `level` | `place` (municipality), `nuts3`, `county` or `region` |
| `code` | for `place`: the Nestlyzer oid without country prefix (DE AGS 8 digits, CH BFS number, FR INSEE commune, IT ISTAT, ES INE 5 digits, UK LAD code; use `places_lookup_for_mapping.csv`). For `nuts3`: the NUTS 2021 code. For `county`: the 5-digit FIPS. |
| `classification` | `NACE2` (Europe) or `NAICS` (US, CA) |
| `sector` | NACE **division** (2 digits: `10`, `20`, `49`, `52`, `62` ...) or section letter where only sections exist; NAICS 2 to 4 digits |
| `measure` | `jobs` (employees or persons employed) or `establishments` |
| `value` | the number (not a share). Suppressed or confidential cells are left out, never 0. |
| `period` | year |
| `source_id` | short id, also used in `sources.json` |

Deliver **all divisions**, not only those listed below. Nestlyzer needs the totals to compute shares.

## Sources, in this order
1. **Switzerland:** BFS STATENT (Statistik der Unternehmensstruktur), employees and workplaces by NOGA 2008 division per Gemeinde (BFS / opendata.swiss).
2. **Germany:**
   - Bundesagentur für Arbeit, Beschäftigte nach Wirtschaftszweigen (WZ 2008), per Gemeinde if published, otherwise per Kreis.
   - Destatis/Regionalstatistik Unternehmensregister (Tabelle 52111) per Kreis.
3. **Netherlands:** CBS Vestigingen van bedrijven per gemeente (SBI).
4. **France:** INSEE Flores / SIRENE établissements by commune and NAF division.
5. **Austria:** Statistik Austria Arbeitsstättenzählung by Gemeinde.
6. **Belgium:** Statbel / RSZ-ONSS by commune.
7. **Italy:** ISTAT ASIA unità locali by comune and Ateco division.
8. **Spain:** INE DIRCE locales by municipio.
9. **UK:** ONS UK Business Counts / BRES by LAD and SIC division (Nomis).
10. **Nordics:** SCB, SSB, Statistics Finland and DST, per kommun.
11. **Poland, Czechia and the rest of the EU:** national registers, otherwise Eurostat `nama_10r_3empers` (NUTS3 × NACE sections) as the minimum for every EU/EFTA country.
12. **US:** Census County Business Patterns (CBP) by county and NAICS. **Canada:** Statistics Canada Business Counts by CSD.

## Industries Nestlyzer reads for each profile (for your spot checks)

| Profile | NACE | NAICS |
|---|---|---|
| Manufacturing | section C | 31-33 |
| Energy-intensive | 17, 19, 20, 23, 24 | 322, 324, 325, 327, 331 |
| Port-based | 50, 52, 19, 20 | 483, 488, 493, 324, 325 |
| Logistics | 49, 52, 53 | 484, 488, 492, 493 |
| E-commerce fulfilment | 52, 53, 47 | 493, 492, 454 |
| Food and beverage | 10, 11 | 311, 312 |
| Pharma and medtech | 21, 26, 32 | 3254, 3345, 3391 |
| Software and tech | 58, 62, 63 | 5112, 513, 518, 5415 |
| Data centre | 61, 63 | 517, 518 |
| Research lab | 72, 21 | 5417, 3254 |
| Shared services | 64, 65, 66, 69, 70, 82 | 52, 5411, 5412, 561 |
| Regional HQ | 70, 64, 66 | 551, 52 |
| Contact centre | 82 | 5614 |

**Spot checks the data must pass:**
- Härkingen, Egerkingen and Oftringen (CH) are high in 52.
- Basel and Muttenz (CH) are high in 20/21.
- Ludwigshafen (DE) is high in 20.
- Duisburg (DE) is high in 24 and 52.
- Leverkusen (DE) is high in 20.
- Venlo (NL) is high in 52.
- Wolfsburg (DE) is high in 29.
- Toulouse (FR) is high in 30.

## Rules
- **Sources and licence:** official publishers only. The licence must allow commercial reuse with attribution, because the site shows ads.
- **Period:** the latest one.
- **No zeros:** suppressed cells stay out; never write 0.
- **No splitting:** never copy a district value into municipalities; deliver it at its own level.
- **Extra files:** `sources.json` (publisher, dataset, URL, licence, period) and `REPORT.md`. The report covers:
  - the join rate per country (share of Nestlyzer places with a code match);
  - the spot checks above, with values;
  - the gaps.
