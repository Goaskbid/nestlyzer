# EU regional statistics (NUTS3 / NUTS2) for Nestlyzer 2.8

Domain folder: `/home/claude/ext/v28/eu_regional/`. Built 2026-10-17.

## Files
| file | content |
|---|---|
| `values.csv` | 9,647 rows, 17 fields, 35 countries (levels `nuts3` and `nuts2`, header as in the brief). One value per (cc, level, code, field), the latest period available. |
| `sources.json` | 21 source ids: publisher, dataset + filters, official URL / API query, mirror repo + path + commit sha, licence, period, notes. |
| `flags.csv` | Eurostat observation flags for the rows that carry one (p provisional, e estimated, b break, u low reliability, d definition differs), plus `alias_of_nuts2024_code` for the 80 alias rows (see below). |
| `n3_crosswalk.csv` | every Nestlyzer `n3` code -> NUTS 2024 NUTS3 / NUTS2 code and relation (same code, pure code change, boundary change, not in NUTS 2024). Use it to join NUTS2 values for places whose 2021 code was renamed (e.g. PT16D -> PT191 -> PT19). |
| `typologies.csv` | 7,113 categorical rows: Eurostat NUTS-3 typologies (urban-rural, coastal, metropolitan, border, island, mountain, capital region). Kept out of `values.csv` because they are not numbers. |
| `_raw/eurostat_api/*` | every official Eurostat API response used, saved as received. `_raw/<repo>/` holds the shallow clones of the mirrors. |

## Fields
NUTS3: `gdp_per_capita_pps` (2024/2023), `median_age_years` (2025), `old_age_dependency_ratio_pct` (2025), `net_migration_rate_per_1000` (2024), `population_change_rate_per_1000` (2024).
NUTS2: `gdp_per_capita_pps`, `disposable_household_income_pps_per_inhabitant` (2023, EU only), `unemployment_rate_pct` (2025), `employment_rate_20_64_pct` (2025), `life_expectancy_at_birth_years` (2024), `physicians_per_100k` (2024), `hospital_beds_per_100k` (2024), `tertiary_attainment_25_64_pct` (2025), `early_leavers_education_pct` (2025), `arope_rate_pct` (2025), `households_internet_access_pct` (2025), `road_deaths_per_million` (2024), `tourism_nights_per_1000_inhabitants` (2025).
All values are Eurostat-published numbers, unconverted (PPS, %, rates per 1,000 / 100,000 / million as named). Nothing derived, nothing imputed.

## How the data was obtained
1. **GitHub mirrors** (GitHub code search is not available; found via web search): Eurostat xlsx downloads in `rahel31/urban-mortality-europe` (nama_10r_3gdp, edat_lfse_04, lfst_r_lfe2emprt, hlth_rs_prsrg, tgs00064), Eurostat API pulls committed in `mdruszcz/belgian-macro-pipeline` (lfst_r_lfu3rt, lfst_r_lfe2emprt) and `manujo69/euroVivienda` (nama_10r_2hhinc, tour_occ_nin2, demo_r_gind3), and the Eurostat NUTS 2021-2024 correspondence file in `iiasa/pysquirrel`. The mirror repos have no licence of their own; the data are Eurostat's (reuse with attribution), and every mirror field used was checked against the live Eurostat API.
2. **Official Eurostat API through WebFetch** (approved by the owner mid-task): life expectancy, AROPE, early leavers, tertiary attainment, physicians, hospital beds, household internet access, road deaths, tourism nights, and the four NUTS3 demographic indicators. The large NUTS3 tables were pulled as SDMX TSV in prefix-filtered sections because WebFetch truncates large bodies (the cut-off point is recorded in the raw files). The tail (RO113 to SK) came from the JSON-stat endpoint. Where a mirror and the official API differ, the official value is used.

## NUTS version handling
Eurostat now publishes NUTS 2024 codes, and Nestlyzer uses mostly NUTS 2021 codes.
- **Pure code changes** (same territory, new code; 16 Nestlyzer n3 codes, mostly PT16x/PT18x -> PT19x/PT1Cx/PT1Dx and NL33x -> NL36x): every NUTS3 value is also written under the Nestlyzer 2021 code (80 alias rows, listed in `flags.csv`).
- **Boundary changes** (33 n3 codes): no value is attached, because using the new region would be an approximation. These are DEG04/0B/0F/0H/0I/0N/0P (Thuringia), FI193/194/195/197/1C3/1C4/1D1/1D2/1D3, LV003/006/007/008, NL111/113/124/125/310/324/329/33A/412/413, NO074/082/091, and PT16H/16I/170.
- **EL/UK**: Eurostat uses EL, the same as Nestlyzer. UK regional data stops in 2019/2020. Only `employment_rate_20_64_pct` and `tertiary_attainment_25_64_pct` (2019) are delivered for the UK. Eurostat no longer carries UK in the GDP, demography, health and other regional tables.

## Join rates (share of each country's places that get a value; NUTS2 joined on n3[:4] or the crosswalk)
| cc | places | n3 codes (matched NUTS3 for GDP3/MedAge3) | NUTS2 codes | GDP3 | MedAge3 | OldDep3 | NetMig3 | PopChg3 | GDP2 | Inc2 | Unemp2 | Emp2 | LifeExp2 | Phys2 | Beds2 | Tert2 | ESL2 | AROPE2 | Inet2 | Road2 | Tour2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AL | 61 | 12 (GDP 12, MedAge 12) | 3 (LifeExp 3) | 100% | 100% | 100% | 100% | 100% | 100% | 0% | 0% | 0% | 100% | 0% | 0% | 0% | 0% | 0% | 0% | 100% | 100% |
| AT | 2093 | 35 (GDP 35, MedAge 35) | 9 (LifeExp 9) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 80% | 100% | 100% | 100% | 100% |
| BE | 607 | 44 (GDP 44, MedAge 44) | 11 (LifeExp 11) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| BG | 265 | 28 (GDP 28, MedAge 28) | 6 (LifeExp 6) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| CH | 2172 | 26 (GDP 0, MedAge 26) | 7 (LifeExp 7) | 0% | 100% | 100% | 100% | 100% | 0% | 0% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| CY | 615 | 1 (GDP 1, MedAge 1) | 1 (LifeExp 1) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 0% | 100% | 100% | 100% | 100% | 100% | 100% |
| CZ | 6258 | 14 (GDP 14, MedAge 14) | 8 (LifeExp 8) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| DE | 10978 | 401 (GDP 394, MedAge 394) | 38 (LifeExp 38) | 99% | 99% | 99% | 99% | 99% | 100% | 100% | 100% | 100% | 100% | 0% | 0% | 100% | 84% | 100% | 0% | 100% | 100% |
| DK | 99 | 11 (GDP 11, MedAge 11) | 5 (LifeExp 5) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| EE | 87 | 5 (GDP 5, MedAge 5) | 1 (LifeExp 1) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 0% | 100% | 100% | 100% | 100% | 100% | 100% |
| EL | 6639 | 53 (GDP 52, MedAge 52) | 14 (LifeExp 13) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 53% | 100% | 0% | 100% | 100% |
| ES | 8132 | 59 (GDP 59, MedAge 59) | 19 (LifeExp 19) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| FI | 311 | 19 (GDP 10, MedAge 10) | 5 (LifeExp 5) | 56% | 56% | 56% | 56% | 56% | 100% | 100% | 95% | 100% | 100% | 100% | 100% | 100% | 95% | 65% | 95% | 100% | 100% |
| FR | 35359 | 101 (GDP 101, MedAge 101) | 27 (LifeExp 27) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 97% | 100% | 100% | 100% | 100% |
| HR | 556 | 21 (GDP 21, MedAge 21) | 4 (LifeExp 4) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 66% | 100% | 100% |
| HU | 3155 | 20 (GDP 20, MedAge 20) | 8 (LifeExp 8) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| IE | 166 | 8 (GDP 8, MedAge 8) | 3 (LifeExp 3) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 0% | 100% | 100% | 42% | 100% | 100% | 100% | 100% |
| IS | 79 | 2 (GDP 0, MedAge 2) | 1 (LifeExp 1) | 0% | 100% | 100% | 100% | 100% | 0% | 0% | 100% | 100% | 100% | 100% | 0% | 100% | 100% | 0% | 0% | 0% | 100% |
| IT | 7987 | 107 (GDP 107, MedAge 107) | 21 (LifeExp 21) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 97% | 100% | 100% | 100% | 100% |
| LI | 11 | 1 (GDP 0, MedAge 1) | 1 (LifeExp 1) | 0% | 100% | 100% | 100% | 100% | 0% | 0% | 0% | 0% | 100% | 100% | 0% | 0% | 0% | 0% | 0% | 100% | 100% |
| LT | 60 | 10 (GDP 10, MedAge 10) | 2 (LifeExp 2) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| LU | 104 | 1 (GDP 1, MedAge 1) | 1 (LifeExp 1) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 0% | 100% | 100% | 100% | 100% | 100% | 100% |
| LV | 162 | 6 (GDP 2, MedAge 2) | 1 (LifeExp 1) | 36% | 36% | 36% | 36% | 36% | 100% | 100% | 100% | 100% | 100% | 100% | 0% | 100% | 100% | 100% | 100% | 100% | 100% |
| MK | 80 | 8 (GDP 8, MedAge 8) | 1 (LifeExp 0) | 100% | 100% | 100% | 100% | 100% | 100% | 0% | 100% | 100% | 0% | 100% | 0% | 100% | 100% | 100% | 0% | 100% | 100% |
| MT | 68 | 2 (GDP 2, MedAge 2) | 1 (LifeExp 1) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 0% | 100% | 100% | 100% | 100% | 100% | 100% |
| NL | 360 | 40 (GDP 30, MedAge 30) | 12 (LifeExp 11) | 71% | 71% | 71% | 71% | 71% | 90% | 90% | 100% | 100% | 90% | 100% | 0% | 90% | 90% | 90% | 90% | 90% | 90% |
| NO | 780 | 11 (GDP 8, MedAge 8) | 6 (LifeExp 6) | 54% | 54% | 54% | 54% | 54% | 100% | 0% | 100% | 100% | 100% | 100% | 100% | 100% | 43% | 100% | 100% | 100% | 100% |
| PL | 2478 | 73 (GDP 73, MedAge 73) | 17 (LifeExp 17) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 16% | 100% | 100% | 100% | 100% |
| PT | 3092 | 25 (GDP 22, MedAge 22) | 7 (LifeExp 6) | 91% | 91% | 91% | 91% | 91% | 91% | 91% | 100% | 100% | 91% | 100% | 55% | 91% | 82% | 91% | 91% | 91% | 91% |
| RO | 3181 | 42 (GDP 42, MedAge 42) | 8 (LifeExp 8) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| RS | 169 | 25 (GDP 25, MedAge 25) | 4 (LifeExp 4) | 100% | 100% | 100% | 100% | 100% | 100% | 0% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| SE | 290 | 21 (GDP 21, MedAge 21) | 8 (LifeExp 8) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 85% | 100% | 100% | 100% | 100% |
| SI | 212 | 12 (GDP 12, MedAge 12) | 2 (LifeExp 2) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| SK | 2927 | 8 (GDP 8, MedAge 8) | 4 (LifeExp 4) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 67% | 100% | 100% | 100% | 100% |
| UK | 402 | 179 (GDP 0, MedAge 0) | 41 (LifeExp 0) | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 100% | 0% | 0% | 0% | 100% | 0% | 0% | 0% | 0% | 0% |
| **all 35** | 99995 | | | 96% | 99% | 99% | 99% | 99% | 97% | 96% | 100% | 100% | 99% | 88% | 86% | 100% | 89% | 99% | 81% | 99% | 99% |

GDP3/MedAge3 counts in column 3 are matched n3 codes. CH has no Eurostat NUTS3/NUTS2 GDP for 2015 or later. Germany has no NUTS2 data for physicians, beds or internet access (it reports NUTS1 only). Disposable income comes from an EU-only mirror.

## Spot checks against the official publisher (Eurostat API, 2026-10-17)
| field | code | value in file | official value | match |
|---|---|---|---|---|
| gdp_per_capita_pps (nuts3, mirror) | DE111 2023 | 105200 | 105200 (p) | yes |
| gdp_per_capita_pps (nuts3, mirror) | FRK21 2024 | 29100 | 29100 p | yes |
| gdp_per_capita_pps (nuts3, mirror) | ITC11 2023 | 40500 | 40500 | yes |
| gdp_per_capita_pps (nuts3, mirror) | PT191 2024 (alias PT16D) | 31200 | 31200 p | yes |
| gdp_per_capita_pps (nuts3, mirror) | RS110 2023 | 31500 | 31500 p | yes |
| unemployment_rate_pct (mirror) | ES61 2025 | 15.2 | 15.2 | yes |
| employment_rate_20_64_pct (mirror) | DE30 2025 | 76.7 | 76.7 | yes |
| disposable_household_income_pps (mirror) | ES61 2023 | 16300 | 16300 p | yes |
| tertiary_attainment_25_64_pct | AT13 2025 | 46.3 | 46.3 | yes |
| life_expectancy_at_birth_years | BE10 / ES61 / SE33 2024 | 82.1 / 82.9 / 82.7 | same | yes |
| arope_rate_pct | NO08 / ES61 2025 | 15.3 / 34.7 | same | yes |
| early_leavers_education_pct | DE21 2025 / CZ01 2024 | 7.8 / 1.3 (u) | same | yes |
| physicians_per_100k | AT13 2025 / ES61 2024 | 732.88 / 359.9 | same (ES flag e) | yes |
| hospital_beds_per_100k | FR10 / ES61 / PL91 / AT13 2024 | 473.17 / 216.67 / 537.34 / 654.28 | same | yes |
| households_internet_access_pct | BG31 / CH01 2025 | 87.35 / 99.33 | same | yes |
| road_deaths_per_million | BE10 / MK00 2024 | 9 / 78 | same | yes |
| tourism_nights_per_1000_inhabitants | ES30 2025 / LT01 2025 | 4642.57 / 3655.95 | same | yes |
| median_age_years | DE111, NO081, PL911, SE110 2025 | 40.6, 36.4, 41.5, 39.4 | same | yes |
| old_age_dependency_ratio_pct | DEG0S, ITC13, RS229 2025 | 62.7, 50.6, 38.3 | same | yes |
| net_migration_rate_per_1000 | DEG0S, PT1B0, SE331 2024 | -34.8, 29.6, 10.0 | same | yes |
| population_change_rate_per_1000 | EL411, NO084, RS221 2024 | 62.1, 16.2, -18.6 | same | yes |

Further consistency checks: the 2024 tertiary values in the independent xlsx mirror equal the API pull. 486 of 488 tourism values equal the euroVivienda mirror; the other 2 (LT01/LT02 2025) are Eurostat revisions dated 2026-10-12. TSV and JSON pulls of 12 overlapping RO NUTS3 values are identical. BE100 net migration and population change equal the BE10 values in euroVivienda.

## Rejected / not delivered
- `tommaso-accornero/european-regional-degrowth-typology`: rejected. Its CSV is **imputed** (mice random forest) and covers 2021 only.
- `dataciviclab/eurostat`: its data sit on Google Cloud Storage, which is blocked from this machine.
- `tocit/eu10let`: rejected (2014). `open-europe/mur`: rejected (period and filters undocumented).
- Hospital beds and physicians from the mirror (`tgs00064` Jul-2025 vintage; FR10 has since been revised) were replaced by the official pulls. The historical `hlth_rs_prsrg` (to 2021) is used only as a physicians fallback for 52 regions, under its own `source_id`.
- `isoc_r_broad_h` (broadband): discontinued after 2021 and replaced by `isoc_r_iacc_h` (internet access, 2025). `hlth_rs_bdsrg2`: the API request failed, so `tgs00064` (same concept, per 100k) was used.
- euroVivienda's NUTS2 population-change and net-migration rates were superseded by the official NUTS3 pull.
- Not available in Eurostat: NUTS3 unemployment, UK after 2019/2020, CH GDP after 2014.
- Not done (time and WebFetch limits): crime `crim_gen_reg` (published as counts, so a per-capita rate would need population; not attempted), patents, NUTS3 tourism, disposable income for non-EU and the newest 2024 income year, status flags for physicians and tertiary (not returned in the bulk pull).
- Low-reliability values (flag `u`) are kept: 77 early-leavers and 26 internet values, all listed in `flags.csv`.
