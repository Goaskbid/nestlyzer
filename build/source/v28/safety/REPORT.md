# Safety and crime: Nestlyzer v2.8 data acquisition (domain: safety)

Files: `values.csv` (49,368 rows), `sources.json` (7 sources), this report, `scripts/` (us.py, fr.py, rxdr.py, build.py),
`intermediate/` (us_matched.csv, fr_commune_2021.csv, fr_dep_2021.csv).
Raw data: `_raw/ddf--open_numbers--world_development_indicators`, `_raw/crimedatatool_helper`, `_raw/crimedatatool`,
`_raw/Application_donnees_territoriales`, `_raw/robosporciudad-datos`, `_raw/eurostat_crim_gen_reg`, `_raw/who_gho_RS_198`.

## What is delivered

| layer | field(s) | coverage |
|---|---|---|
| country | `homicide_rate_100k` (UNODC via WDI, 2021-2023) | 44 of 45 (no TW) |
| country | `road_deaths_100k` (WHO GHO, 2023) | 42 of 45 (no HK, LI, TW) |
| nuts3 | `eurostat_assault_per_100k`, `eurostat_robbery_per_100k`, `eurostat_burglary_residential_per_100k`, `eurostat_violent_crime_per_100k` (Eurostat crim_gen_reg, mostly 2024) | 29 European countries, 1,203 NUTS3 regions |
| place | `crime_total_per_1000`, `violent_crime_per_1000`, `burglary_per_1000` | US (7,974 places, FBI UCR 2024), FR (up to 10,651 communes, SSMSI 2021), ES (427 municipalities over 20,000, Interior 2025) |
| nuts3 | the same three national fields | FR (96 départements, 2021), ES (49 provinces, 2025) |

**Comparability rule:** the local (place and NUTS3) crime rates are comparable WITHIN a country only. Each country uses its own
offence definitions, recording rules and denominators (see `sources.json`). Homicide is the cross-country anchor, with road deaths as a second one.
The Eurostat NUTS3 layer uses one classification (ICCS), but police recording practice still differs by country, so cross-border comparison is indicative only.

Definitions per country:
- **US** (FBI UCR Return A, per 1,000 of the agency's population): total = Part I index offences; violent = murder, rape, robbery and aggravated assault; burglary = all burglary.
- **FR** (SSMSI, per 1,000 residents): violent = coups et blessures volontaires + violences sexuelles + vols avec armes + vols violents sans arme; total = sum of the 9 non-overlapping SSMSI indicators. Burglary is cambriolages de logement **per 1,000 dwellings** (SSMSI's denominator).
- **ES** (Balance de Criminalidad, per 1,000 residents, Padrón 2025): total = all known criminal offences; violent = robbery with violence + injuries/brawls + sexual offences + homicide (completed and attempted) + kidnapping; burglary = robos con fuerza en domicilios.
- **Eurostat** (per 100,000 inhabitants): violent = assault (ICCS02011) + robbery (ICCS0401); burglary = burglary of private residential premises (ICCS05012).

## Join rates (places of each country that get a value)

"Direct" means a place-level value with the exact oid. "Incl." also counts places reached through their NUTS3 code (`n3`) or the national value.
| cc | places | field | direct place join | incl. NUTS3/country |
|---|---|---|---|---|
| AL | 61 | eurostat_assault_per_100k | 0 (0.0%) | 61 (100.0%) |
| AL | 61 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 61 (100.0%) |
| AL | 61 | eurostat_robbery_per_100k | 0 (0.0%) | 61 (100.0%) |
| AL | 61 | eurostat_violent_crime_per_100k | 0 (0.0%) | 61 (100.0%) |
| AL | 61 | homicide_rate_100k | 0 (0.0%) | 61 (100.0%) |
| AL | 61 | road_deaths_100k | 0 (0.0%) | 61 (100.0%) |
| AT | 2093 | eurostat_assault_per_100k | 0 (0.0%) | 2093 (100.0%) |
| AT | 2093 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 2093 (100.0%) |
| AT | 2093 | eurostat_robbery_per_100k | 0 (0.0%) | 2093 (100.0%) |
| AT | 2093 | eurostat_violent_crime_per_100k | 0 (0.0%) | 2093 (100.0%) |
| AT | 2093 | homicide_rate_100k | 0 (0.0%) | 2093 (100.0%) |
| AT | 2093 | road_deaths_100k | 0 (0.0%) | 2093 (100.0%) |
| AU | 2034 | homicide_rate_100k | 0 (0.0%) | 2034 (100.0%) |
| AU | 2034 | road_deaths_100k | 0 (0.0%) | 2034 (100.0%) |
| BE | 607 | eurostat_assault_per_100k | 0 (0.0%) | 607 (100.0%) |
| BE | 607 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 607 (100.0%) |
| BE | 607 | eurostat_robbery_per_100k | 0 (0.0%) | 607 (100.0%) |
| BE | 607 | eurostat_violent_crime_per_100k | 0 (0.0%) | 607 (100.0%) |
| BE | 607 | homicide_rate_100k | 0 (0.0%) | 607 (100.0%) |
| BE | 607 | road_deaths_100k | 0 (0.0%) | 607 (100.0%) |
| BG | 265 | eurostat_assault_per_100k | 0 (0.0%) | 265 (100.0%) |
| BG | 265 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 265 (100.0%) |
| BG | 265 | eurostat_robbery_per_100k | 0 (0.0%) | 265 (100.0%) |
| BG | 265 | eurostat_violent_crime_per_100k | 0 (0.0%) | 265 (100.0%) |
| BG | 265 | homicide_rate_100k | 0 (0.0%) | 265 (100.0%) |
| BG | 265 | road_deaths_100k | 0 (0.0%) | 265 (100.0%) |
| CA | 2929 | homicide_rate_100k | 0 (0.0%) | 2929 (100.0%) |
| CA | 2929 | road_deaths_100k | 0 (0.0%) | 2929 (100.0%) |
| CH | 2172 | eurostat_assault_per_100k | 0 (0.0%) | 2172 (100.0%) |
| CH | 2172 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 2172 (100.0%) |
| CH | 2172 | eurostat_robbery_per_100k | 0 (0.0%) | 2172 (100.0%) |
| CH | 2172 | eurostat_violent_crime_per_100k | 0 (0.0%) | 2172 (100.0%) |
| CH | 2172 | homicide_rate_100k | 0 (0.0%) | 2172 (100.0%) |
| CH | 2172 | road_deaths_100k | 0 (0.0%) | 2172 (100.0%) |
| CY | 615 | eurostat_robbery_per_100k | 0 (0.0%) | 615 (100.0%) |
| CY | 615 | homicide_rate_100k | 0 (0.0%) | 615 (100.0%) |
| CY | 615 | road_deaths_100k | 0 (0.0%) | 615 (100.0%) |
| CZ | 6258 | eurostat_assault_per_100k | 0 (0.0%) | 6258 (100.0%) |
| CZ | 6258 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 6258 (100.0%) |
| CZ | 6258 | eurostat_robbery_per_100k | 0 (0.0%) | 6258 (100.0%) |
| CZ | 6258 | eurostat_violent_crime_per_100k | 0 (0.0%) | 6258 (100.0%) |
| CZ | 6258 | homicide_rate_100k | 0 (0.0%) | 6258 (100.0%) |
| CZ | 6258 | road_deaths_100k | 0 (0.0%) | 6258 (100.0%) |
| DE | 10978 | eurostat_assault_per_100k | 0 (0.0%) | 10977 (100.0%) |
| DE | 10978 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 10977 (100.0%) |
| DE | 10978 | eurostat_robbery_per_100k | 0 (0.0%) | 10977 (100.0%) |
| DE | 10978 | eurostat_violent_crime_per_100k | 0 (0.0%) | 10977 (100.0%) |
| DE | 10978 | homicide_rate_100k | 0 (0.0%) | 10978 (100.0%) |
| DE | 10978 | road_deaths_100k | 0 (0.0%) | 10978 (100.0%) |
| DK | 99 | eurostat_assault_per_100k | 0 (0.0%) | 99 (100.0%) |
| DK | 99 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 99 (100.0%) |
| DK | 99 | eurostat_robbery_per_100k | 0 (0.0%) | 99 (100.0%) |
| DK | 99 | eurostat_violent_crime_per_100k | 0 (0.0%) | 99 (100.0%) |
| DK | 99 | homicide_rate_100k | 0 (0.0%) | 99 (100.0%) |
| DK | 99 | road_deaths_100k | 0 (0.0%) | 99 (100.0%) |
| EE | 87 | eurostat_assault_per_100k | 0 (0.0%) | 87 (100.0%) |
| EE | 87 | eurostat_robbery_per_100k | 0 (0.0%) | 87 (100.0%) |
| EE | 87 | eurostat_violent_crime_per_100k | 0 (0.0%) | 87 (100.0%) |
| EE | 87 | homicide_rate_100k | 0 (0.0%) | 87 (100.0%) |
| EE | 87 | road_deaths_100k | 0 (0.0%) | 87 (100.0%) |
| EL | 6639 | eurostat_assault_per_100k | 0 (0.0%) | 6455 (97.2%) |
| EL | 6639 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 6455 (97.2%) |
| EL | 6639 | eurostat_robbery_per_100k | 0 (0.0%) | 6455 (97.2%) |
| EL | 6639 | eurostat_violent_crime_per_100k | 0 (0.0%) | 6455 (97.2%) |
| EL | 6639 | homicide_rate_100k | 0 (0.0%) | 6639 (100.0%) |
| EL | 6639 | road_deaths_100k | 0 (0.0%) | 6639 (100.0%) |
| ES | 8132 | burglary_per_1000 | 427 (5.3%) | 8020 (98.6%) |
| ES | 8132 | crime_total_per_1000 | 427 (5.3%) | 8020 (98.6%) |
| ES | 8132 | eurostat_assault_per_100k | 0 (0.0%) | 8132 (100.0%) |
| ES | 8132 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 8132 (100.0%) |
| ES | 8132 | eurostat_robbery_per_100k | 0 (0.0%) | 8132 (100.0%) |
| ES | 8132 | eurostat_violent_crime_per_100k | 0 (0.0%) | 8132 (100.0%) |
| ES | 8132 | homicide_rate_100k | 0 (0.0%) | 8132 (100.0%) |
| ES | 8132 | road_deaths_100k | 0 (0.0%) | 8132 (100.0%) |
| ES | 8132 | violent_crime_per_1000 | 427 (5.3%) | 8020 (98.6%) |
| FI | 311 | eurostat_assault_per_100k | 0 (0.0%) | 311 (100.0%) |
| FI | 311 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 311 (100.0%) |
| FI | 311 | eurostat_robbery_per_100k | 0 (0.0%) | 311 (100.0%) |
| FI | 311 | eurostat_violent_crime_per_100k | 0 (0.0%) | 311 (100.0%) |
| FI | 311 | homicide_rate_100k | 0 (0.0%) | 311 (100.0%) |
| FI | 311 | road_deaths_100k | 0 (0.0%) | 311 (100.0%) |
| FR | 35359 | burglary_per_1000 | 10651 (30.1%) | 35229 (99.6%) |
| FR | 35359 | crime_total_per_1000 | 1504 (4.3%) | 35229 (99.6%) |
| FR | 35359 | eurostat_assault_per_100k | 0 (0.0%) | 35359 (100.0%) |
| FR | 35359 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 35359 (100.0%) |
| FR | 35359 | eurostat_robbery_per_100k | 0 (0.0%) | 35359 (100.0%) |
| FR | 35359 | eurostat_violent_crime_per_100k | 0 (0.0%) | 35359 (100.0%) |
| FR | 35359 | homicide_rate_100k | 0 (0.0%) | 35359 (100.0%) |
| FR | 35359 | road_deaths_100k | 0 (0.0%) | 35359 (100.0%) |
| FR | 35359 | violent_crime_per_1000 | 6749 (19.1%) | 35229 (99.6%) |
| HK | 154 | homicide_rate_100k | 0 (0.0%) | 154 (100.0%) |
| HR | 556 | eurostat_assault_per_100k | 0 (0.0%) | 556 (100.0%) |
| HR | 556 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 556 (100.0%) |
| HR | 556 | eurostat_robbery_per_100k | 0 (0.0%) | 556 (100.0%) |
| HR | 556 | eurostat_violent_crime_per_100k | 0 (0.0%) | 556 (100.0%) |
| HR | 556 | homicide_rate_100k | 0 (0.0%) | 556 (100.0%) |
| HR | 556 | road_deaths_100k | 0 (0.0%) | 556 (100.0%) |
| HU | 3155 | eurostat_assault_per_100k | 0 (0.0%) | 3155 (100.0%) |
| HU | 3155 | eurostat_robbery_per_100k | 0 (0.0%) | 3155 (100.0%) |
| HU | 3155 | eurostat_violent_crime_per_100k | 0 (0.0%) | 3155 (100.0%) |
| HU | 3155 | homicide_rate_100k | 0 (0.0%) | 3155 (100.0%) |
| HU | 3155 | road_deaths_100k | 0 (0.0%) | 3155 (100.0%) |
| IE | 166 | eurostat_assault_per_100k | 0 (0.0%) | 166 (100.0%) |
| IE | 166 | eurostat_robbery_per_100k | 0 (0.0%) | 166 (100.0%) |
| IE | 166 | eurostat_violent_crime_per_100k | 0 (0.0%) | 166 (100.0%) |
| IE | 166 | homicide_rate_100k | 0 (0.0%) | 166 (100.0%) |
| IE | 166 | road_deaths_100k | 0 (0.0%) | 166 (100.0%) |
| IL | 688 | homicide_rate_100k | 0 (0.0%) | 688 (100.0%) |
| IL | 688 | road_deaths_100k | 0 (0.0%) | 688 (100.0%) |
| IS | 79 | homicide_rate_100k | 0 (0.0%) | 79 (100.0%) |
| IS | 79 | road_deaths_100k | 0 (0.0%) | 79 (100.0%) |
| IT | 7987 | eurostat_assault_per_100k | 0 (0.0%) | 7793 (97.6%) |
| IT | 7987 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 7793 (97.6%) |
| IT | 7987 | eurostat_robbery_per_100k | 0 (0.0%) | 7793 (97.6%) |
| IT | 7987 | eurostat_violent_crime_per_100k | 0 (0.0%) | 7793 (97.6%) |
| IT | 7987 | homicide_rate_100k | 0 (0.0%) | 7987 (100.0%) |
| IT | 7987 | road_deaths_100k | 0 (0.0%) | 7987 (100.0%) |
| JP | 2010 | homicide_rate_100k | 0 (0.0%) | 2010 (100.0%) |
| JP | 2010 | road_deaths_100k | 0 (0.0%) | 2010 (100.0%) |
| KR | 149 | homicide_rate_100k | 0 (0.0%) | 149 (100.0%) |
| KR | 149 | road_deaths_100k | 0 (0.0%) | 149 (100.0%) |
| LI | 11 | homicide_rate_100k | 0 (0.0%) | 11 (100.0%) |
| LT | 60 | eurostat_assault_per_100k | 0 (0.0%) | 60 (100.0%) |
| LT | 60 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 60 (100.0%) |
| LT | 60 | eurostat_robbery_per_100k | 0 (0.0%) | 60 (100.0%) |
| LT | 60 | eurostat_violent_crime_per_100k | 0 (0.0%) | 60 (100.0%) |
| LT | 60 | homicide_rate_100k | 0 (0.0%) | 60 (100.0%) |
| LT | 60 | road_deaths_100k | 0 (0.0%) | 60 (100.0%) |
| LU | 104 | eurostat_robbery_per_100k | 0 (0.0%) | 104 (100.0%) |
| LU | 104 | homicide_rate_100k | 0 (0.0%) | 104 (100.0%) |
| LU | 104 | road_deaths_100k | 0 (0.0%) | 104 (100.0%) |
| LV | 162 | eurostat_assault_per_100k | 0 (0.0%) | 162 (100.0%) |
| LV | 162 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 162 (100.0%) |
| LV | 162 | eurostat_robbery_per_100k | 0 (0.0%) | 162 (100.0%) |
| LV | 162 | eurostat_violent_crime_per_100k | 0 (0.0%) | 162 (100.0%) |
| LV | 162 | homicide_rate_100k | 0 (0.0%) | 162 (100.0%) |
| LV | 162 | road_deaths_100k | 0 (0.0%) | 162 (100.0%) |
| MK | 80 | homicide_rate_100k | 0 (0.0%) | 80 (100.0%) |
| MK | 80 | road_deaths_100k | 0 (0.0%) | 80 (100.0%) |
| MT | 68 | homicide_rate_100k | 0 (0.0%) | 68 (100.0%) |
| MT | 68 | road_deaths_100k | 0 (0.0%) | 68 (100.0%) |
| NL | 360 | eurostat_assault_per_100k | 0 (0.0%) | 360 (100.0%) |
| NL | 360 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 360 (100.0%) |
| NL | 360 | eurostat_robbery_per_100k | 0 (0.0%) | 360 (100.0%) |
| NL | 360 | eurostat_violent_crime_per_100k | 0 (0.0%) | 360 (100.0%) |
| NL | 360 | homicide_rate_100k | 0 (0.0%) | 360 (100.0%) |
| NL | 360 | road_deaths_100k | 0 (0.0%) | 360 (100.0%) |
| NO | 780 | eurostat_robbery_per_100k | 0 (0.0%) | 780 (100.0%) |
| NO | 780 | homicide_rate_100k | 0 (0.0%) | 780 (100.0%) |
| NO | 780 | road_deaths_100k | 0 (0.0%) | 780 (100.0%) |
| NZ | 631 | homicide_rate_100k | 0 (0.0%) | 631 (100.0%) |
| NZ | 631 | road_deaths_100k | 0 (0.0%) | 631 (100.0%) |
| PL | 2478 | eurostat_assault_per_100k | 0 (0.0%) | 2478 (100.0%) |
| PL | 2478 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 2478 (100.0%) |
| PL | 2478 | eurostat_robbery_per_100k | 0 (0.0%) | 2478 (100.0%) |
| PL | 2478 | eurostat_violent_crime_per_100k | 0 (0.0%) | 2478 (100.0%) |
| PL | 2478 | homicide_rate_100k | 0 (0.0%) | 2478 (100.0%) |
| PL | 2478 | road_deaths_100k | 0 (0.0%) | 2478 (100.0%) |
| PT | 3092 | eurostat_assault_per_100k | 0 (0.0%) | 3092 (100.0%) |
| PT | 3092 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 3092 (100.0%) |
| PT | 3092 | eurostat_robbery_per_100k | 0 (0.0%) | 3092 (100.0%) |
| PT | 3092 | eurostat_violent_crime_per_100k | 0 (0.0%) | 3092 (100.0%) |
| PT | 3092 | homicide_rate_100k | 0 (0.0%) | 3092 (100.0%) |
| PT | 3092 | road_deaths_100k | 0 (0.0%) | 3092 (100.0%) |
| RO | 3181 | eurostat_assault_per_100k | 0 (0.0%) | 3181 (100.0%) |
| RO | 3181 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 3181 (100.0%) |
| RO | 3181 | eurostat_robbery_per_100k | 0 (0.0%) | 3181 (100.0%) |
| RO | 3181 | eurostat_violent_crime_per_100k | 0 (0.0%) | 3181 (100.0%) |
| RO | 3181 | homicide_rate_100k | 0 (0.0%) | 3181 (100.0%) |
| RO | 3181 | road_deaths_100k | 0 (0.0%) | 3181 (100.0%) |
| RS | 169 | homicide_rate_100k | 0 (0.0%) | 169 (100.0%) |
| RS | 169 | road_deaths_100k | 0 (0.0%) | 169 (100.0%) |
| SE | 290 | eurostat_assault_per_100k | 0 (0.0%) | 290 (100.0%) |
| SE | 290 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 290 (100.0%) |
| SE | 290 | eurostat_robbery_per_100k | 0 (0.0%) | 290 (100.0%) |
| SE | 290 | eurostat_violent_crime_per_100k | 0 (0.0%) | 290 (100.0%) |
| SE | 290 | homicide_rate_100k | 0 (0.0%) | 290 (100.0%) |
| SE | 290 | road_deaths_100k | 0 (0.0%) | 290 (100.0%) |
| SG | 113 | homicide_rate_100k | 0 (0.0%) | 113 (100.0%) |
| SG | 113 | road_deaths_100k | 0 (0.0%) | 113 (100.0%) |
| SI | 212 | eurostat_assault_per_100k | 0 (0.0%) | 212 (100.0%) |
| SI | 212 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 212 (100.0%) |
| SI | 212 | eurostat_robbery_per_100k | 0 (0.0%) | 212 (100.0%) |
| SI | 212 | eurostat_violent_crime_per_100k | 0 (0.0%) | 212 (100.0%) |
| SI | 212 | homicide_rate_100k | 0 (0.0%) | 212 (100.0%) |
| SI | 212 | road_deaths_100k | 0 (0.0%) | 212 (100.0%) |
| SK | 2927 | eurostat_assault_per_100k | 0 (0.0%) | 2927 (100.0%) |
| SK | 2927 | eurostat_burglary_residential_per_100k | 0 (0.0%) | 2927 (100.0%) |
| SK | 2927 | eurostat_robbery_per_100k | 0 (0.0%) | 2927 (100.0%) |
| SK | 2927 | eurostat_violent_crime_per_100k | 0 (0.0%) | 2927 (100.0%) |
| SK | 2927 | homicide_rate_100k | 0 (0.0%) | 2927 (100.0%) |
| SK | 2927 | road_deaths_100k | 0 (0.0%) | 2927 (100.0%) |
| UK | 402 | homicide_rate_100k | 0 (0.0%) | 402 (100.0%) |
| UK | 402 | road_deaths_100k | 0 (0.0%) | 402 (100.0%) |
| US | 21184 | burglary_per_1000 | 7974 (37.6%) | 7974 (37.6%) |
| US | 21184 | crime_total_per_1000 | 7974 (37.6%) | 7974 (37.6%) |
| US | 21184 | homicide_rate_100k | 0 (0.0%) | 21184 (100.0%) |
| US | 21184 | road_deaths_100k | 0 (0.0%) | 21184 (100.0%) |
| US | 21184 | violent_crime_per_1000 | 7974 (37.6%) | 7974 (37.6%) |

Countries with only national values: CY (robbery only at NUTS3), IL, IS, JP, KR, LI, MK, MT, NZ, RS, SG, UK, AU, CA, HK, TW (TW has no value at all).

## Spot checks against the official publisher

National homicide (UNODC, as published in the UNODC table quoted on Wikipedia's UNODC list):
- US: file 5.76341 (2023), UNODC 5.763 (2023). Match.
- JP: file 0.22915 (2023), UNODC 0.229. Value matches; the UNODC list labels the year 2024.
- DE: file 0.91072 (2023), UNODC 0.921 (2024). This is a newer UNODC year not yet in WDI, so we keep the WDI vintage for consistency.

Road deaths (WHO GHO API RS_198, both sexes, 2023): DEU 3.4 and KOR 5.9 were fetched twice and matched both times. USA 18.4 [16.4-20.3] was fetched twice, also identical, and SWE 2.2 and NZL 8.1 were re-fetched with identical results. The older WDI copy (2019: DE 3.8, US 12.7, PL 9.4) did NOT match current GHO values (DE 3.9, US 11.9, PL 9.7) and was rejected.

Eurostat crim_gen_reg (re-fetched in separate calls and compared with the chunk transcriptions):
- 10 of 10 matched on a fresh re-fetch: DEA23 assault 1364.30/1344.68 and burglary 232.46/296.66; FRK26 630.03/602.20 and 376.93/405.56; NL230 243.98/241.56 and 92.65/126.21; PL213 38.60/32.08 and 41.88/36.23; RO122 764.12/772.89 and 69.65/83.46 (2023/2024).
- Independent first-probe values also match the chunk values: AT111 burglary 34.64/29.14/34.39, AL022 robbery 3.37/4.00/4.88, DE111 burglary 92.15/62.96 (identical to the JSON API call), DE916 robbery 32.85/24.27, SE221 robbery 47.19/42.84/34.82, SK031 robbery 3.34/4.07/3.49, PT16F robbery 43.41 (2022), ITG2D burglary 119.22 (2023, fetched twice).

US (FBI Crime Data Explorer, cde.ucr.cjis.gov summarized agency endpoint, 2024):
- Houston PD violent: file 26,630, CDE 26,807 (sum of months; CDE refreshed 10/2026, so it includes late submissions); population 2,319,160 in both. Rate 11.48 vs 11.56 per 1,000. Within 0.7%.
- Phoenix PD violent: file 13,303, CDE 13,296; population 1,662,809 in both. Within 0.05%.
- Abbeville (AL) PD burglary: file 9, CDE 9; population 2,386 in both. Exact.

Spain (Ministerio del Interior, Balance de Criminalidad Q4 2025 PDF, January-December 2025):
- Almería municipality: total 9,758 / burglary of dwellings 211 / robbery with violence 252. The file gives 9,758 / 211 / 252. Exact.
- Motril: 2,600 / 51 / 52 in both. Exact.
- Almería province: 35,387 / 1,100 / 677 in both. Exact.
- Córdoba municipality: 18,589 / 348 / 272 in both. Exact.

France (SSMSI, 'Insécurité et délinquance en 2021, bilan statistique', France entière):
- The 2021 national totals in the SSMSI GitHub data cover metropolitan France (96 départements). Burglaries: 186,333 against 190,300 for France entière. Vehicle theft: 119,474 against 122,700. Assault (CBV): 291,123 against 306,700, where the publication counts victims aged 15 and over and the base counts faits. The relationship is consistent (metropolitan France sits 2-5% below France entière, with the DOM making up the difference). It is not an exact like-for-like check: no commune-level official page was reachable, and data.gouv.fr is blocked from this machine. The data come from SSMSI's own GitHub organisation (ssmsi-diffusion), so this is the publisher's own release.

## Rejected or not used, and why

- WDI `SH.STA.TRAF.P5` road deaths (2019): an outdated WHO vintage that no longer matches GHO. Replaced by GHO 2023.
- SSMSI communes with `bool.pub = 0`: SSMSI shows the average of unpublished communes in the département instead of the commune's own value. These were dropped (no imputation). This is why the FR place-level join rates for total and violent crime are low; the département value at NUTS3 covers the rest.
- FR overseas départements (97x): not in the 2021 GitHub release.
- ES island provinces (Illes Balears, Las Palmas, Santa Cruz de Tenerife): a province does not map 1:1 to the island NUTS3 regions, so these provinces were left out at province level. Their Eurostat NUTS3 values and municipal values are still present.
- US agencies: sheriffs, state police, university, transit and similar agencies were left out because they do not police a single place. Agencies whose population is not 0.5-2x the matched place's population were left out (336). So were agencies without 2023/2024 data (6,469; many NIBRS-only or non-reporting agencies).
- Eurostat: EL Attica (EL301-EL307) and IT ITG2G/ITG2H return errors or no data. IS, LI, MK, MT, RS and UK have no NUTS3 data in crim_gen_reg.
- Not found as verifiable GitHub mirrors in the time available: DE PKS Kreis tables (Germany is covered by Eurostat NUTS3 = Kreis instead), IT, SE BRÅ, NL CBS, UK ONS CSP, CA CSI, AU BOCSAR/CSA, NZ, JP, KR, IL, TW. DK StatBank STRAF11 (per kommune, quarterly) and CBS 83648NED are reachable through the APIs via WebFetch but were not pulled (see open gaps).
- No Numbeo, commercial indexes or crowd-sourced data were used.

## Open gaps

1. FR: the 2022-2025 communal base (data.gouv.fr) would give a newer year than 2021. It is blocked from the shell; it may be reachable as a GitHub mirror or through WebFetch in chunks.
2. DK (STRAF11 per kommune via api.statbank.dk) and NL (CBS 83648NED per gemeente): both can be pulled through WebFetch in chunks for exact place-level coverage.
3. UK: ONS police-recorded crime by Community Safety Partnership (LAD) is xlsx on ons.gov.uk; no mirror found.
4. CA (StatCan 35-10-0026 CSI per police service), AU (BOCSAR/CSA by LGA), JP/KR/TW regional: not attempted beyond search.
5. TW homicide (NPA) and HK/LI/TW road deaths: missing nationally.
6. US: 62% of places are without a value. Better coverage would need NIBRS-only agencies and a county-level fallback.
