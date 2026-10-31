# Nestlyzer v28 - Access to services (domain `services`)

## Summary
- `values.csv`: 681,294 rows, all `level=place`, `code` = oid exactly as in `/home/claude/nestlyzer/data/c/{CC}.json`.
- 7 fields: `nearest_hospital_km`, `hospitals_within_25km`, `nearest_general_hospital_km`, `nearest_university_seat_km`,
  `university_seats_within_25km`, `nearest_railway_station_km`, `railway_stations_within_10km`.
- Distances: great-circle (haversine, R = 6371.0088 km) from the place's lat/lon to the nearest facility **of the same country**
  (domestic registers only - a foreign facility is never used, so a country with no usable register gets no value), rounded to 0.01 km.
  Counts: facility sites (points within 100 m merged) within the radius. BallTree (scikit-learn, haversine).
- 1,076 of 129,963 places have no lat/lon in the country files (EL 504, NO 94, FR 362, IT 69, UK 14, ...) and get no value.
- Code: `scripts/build.py` (run with `python3 -I`), checks: `scripts/check.py`, per-place nearest-facility names: `scripts/detail.csv.gz`.

## Field definitions
| field | definition | source_id |
|---|---|---|
| nearest_hospital_km | nearest hospital site in the national hospital register (all inpatient hospital types the register lists, incl. psychiatric/rehab, except FR outpatient-heavy mental-health category, NL outpatient satellites, NO units that are not a hospital) | eurostat_gisco_healthcare_2020, hifld_hospitals_2020 |
| hospitals_within_25km | number of distinct hospital sites (100 m merge) within 25 km | same |
| nearest_general_hospital_km | nearest general/acute hospital, only where the register gives a facility type (BE CY CZ ES FI FR IE IT LT MT NL PT SI US) | same |
| nearest_university_seat_km | nearest seat city of a university-level institution in ROR (city point, not campus) | ror_v2_14 |
| university_seats_within_25km | number of such institutions whose seat point lies within 25 km | ror_v2_14 |
| nearest_railway_station_km | nearest passenger railway station | db_stada_stations_2022 (DE), trainline_stations_2026 (others) |
| railway_stations_within_10km | number of stations (150 m merge) within 10 km | same |

General/acute classification: BE all non-psychiatric; CY General + Child&Mother; CZ "Nemocnice" (not LDN / follow-up care);
ES GENERAL, MEDICO-QUIRURGICO, MATERNO-INFANTIL, INFANTIL, MATERNAL; FR C.H., C.H.R., Soins Pluridisciplinaires, Soins Chirurgicaux,
Obstetrique; IE General/Acute + Private General; IT Aziende Ospedaliere, Ospedali a gestione diretta, Ospedali classificati,
presidi USL, policlinici (not Case di cura, IRCCS); LT general; MT the two general hospitals; NL Algemeen + Academisch ziekenhuis;
PT all records (all are hospital emergency services: SU Basica / Medico-Cirurgica / Polivalente); SI General hospital + Clinic (UKC);
FI Central + university hospitals; US GENERAL ACUTE CARE + CRITICAL ACCESS.

## Coverage per country (facilities used / places with a value, join rate vs all places in the country file)
| cc | places | hospitals: facilities / places with value | general-acute hospitals | university seats (ROR) | railway stations |
|---|---|---|---|---|---|
| AL | 61 | - | - | 32 / 61 (100.0%) | - |
| AT | 2093 | 266 / 2093 (100.0%) | - | 79 / 2093 (100.0%) | 783 / 2093 (100.0%) |
| AU | 2034 | - | - | 56 / 2034 (100.0%) | - |
| BE | 607 | 272 / 594 (97.9%) | 209 / 594 (97.9%) | 49 / 594 (97.9%) | 557 / 594 (97.9%) |
| BG | 265 | - | - | 37 / 265 (100.0%) | - |
| CA | 2929 | - | - | 147 / 2929 (100.0%) | - |
| CH | 2172 | 358 / 2172 (100.0%) | - | 80 / 2172 (100.0%) | - |
| CY | 615 | 11 / 615 (100.0%) | 6 / 615 (100.0%) | 28 / 615 (100.0%) | - |
| CZ | 6258 | 248 / 6258 (100.0%) | 142 / 6258 (100.0%) | 48 / 6258 (100.0%) | - |
| DE | 10978 | 2809 / 10975 (100.0%) | - | 438 / 10975 (100.0%) | 5387 / 10975 (100.0%) |
| DK | 99 | 61 / 99 (100.0%) | - | 14 / 99 (100.0%) | 345 / 99 (100.0%) |
| EE | 87 | - | - | 9 / 87 (100.0%) | - |
| EL | 6639 | - | - | 30 / 6135 (92.4%) | - |
| ES | 8132 | 809 / 8131 (100.0%) | 536 / 8131 (100.0%) | 141 / 8131 (100.0%) | 1369 / 7974 (98.1%) |
| FI | 311 | 372 / 310 (99.7%) | 40 / 310 (99.7%) | 41 / 310 (99.7%) | 207 / 310 (99.7%) |
| FR | 35359 | 3884 / 34997 (99.0%) | 2253 / 34997 (99.0%) | 148 / 34997 (99.0%) | 2929 / 34507 (97.6%) |
| HK | 154 | - | - | 14 / 154 (100.0%) | - |
| HR | 556 | 61 / 556 (100.0%) | - | 39 / 556 (100.0%) | - |
| HU | 3155 | 135 / 3155 (100.0%) | - | 42 / 3155 (100.0%) | - |
| IE | 166 | 199 / 166 (100.0%) | 55 / 166 (100.0%) | 16 / 166 (100.0%) | - |
| IL | 688 | - | - | 12 / 688 (100.0%) | - |
| IS | 79 | - | - | 9 / 75 (94.9%) | - |
| IT | 7987 | 1283 / 7918 (99.1%) | 728 / 7918 (99.1%) | 134 / 7918 (99.1%) | 3195 / 7918 (99.1%) |
| JP | 2010 | - | - | 1232 / 2010 (100.0%) | - |
| KR | 149 | - | - | 340 / 149 (100.0%) | - |
| LI | 11 | - | - | 2 / 11 (100.0%) | - |
| LT | 60 | 142 / 60 (100.0%) | 72 / 60 (100.0%) | 23 / 60 (100.0%) | - |
| LU | 104 | 21 / 102 (98.1%) | - | 4 / 102 (98.1%) | 61 / 102 (98.1%) |
| LV | 162 | 44 / 159 (98.1%) | - | 16 / 159 (98.1%) | - |
| MK | 80 | - | - | 19 / 80 (100.0%) | - |
| MT | 68 | 9 / 68 (100.0%) | 2 / 68 (100.0%) | 2 / 68 (100.0%) | - |
| NL | 360 | 117 / 355 (98.6%) | 109 / 355 (98.6%) | 60 / 355 (98.6%) | 402 / 355 (98.6%) |
| NO | 780 | 120 / 686 (87.9%) | - | 39 / 686 (87.9%) | 326 / 686 (87.9%) |
| NZ | 631 | - | - | 23 / 631 (100.0%) | - |
| PL | 2478 | - | - | 162 / 2477 (100.0%) | - |
| PT | 3092 | - | 94 / 3092 (100.0%) | 204 / 3092 (100.0%) | - |
| RO | 3181 | - | - | 82 / 3181 (100.0%) | - |
| RS | 169 | - | - | 22 / 169 (100.0%) | - |
| SE | 290 | - | - | 51 / 290 (100.0%) | - |
| SG | 113 | - | - | 21 / 113 (100.0%) | - |
| SI | 212 | 31 / 212 (100.0%) | 16 / 212 (100.0%) | 9 / 212 (100.0%) | - |
| SK | 2927 | 128 / 2927 (100.0%) | - | 25 / 2927 (100.0%) | - |
| TW | 78 | - | - | 134 / 78 (100.0%) | - |
| UK | 400 | - | - | 175 / 386 (96.5%) | 2624 / 375 (93.8%) |
| US | 21184 | 7146 / 21184 (100.0%) | 5236 / 21184 (100.0%) | 1668 / 21184 (100.0%) | - |

Fields not delivered for any country: nearest pharmacy, nearest GP practice, nearest supermarket, nearest international school,
major venues - no official or credible open point register of these is mirrored on GitHub/PyPI/npm (see Rejected).

## Sanity checks (places with population >= 100,000)
- Hospitals (any): 689 such places with a value; 27 have the nearest hospital > 5 km: 24 US (large suburban GeoNames
  municipalities whose centroid lies 5-11 km from the hospital, e.g. Staten Island 5.2 km, South Fulton GA 11.0 km),
  NL Westland 6.2 km and Alphen aan den Rijn 8.3 km (the register lists Alrijne/Reinier Haga as group HQ sites),
  FR Saint-Paul (Reunion) 5.6 km. Correct as far as checked.
- General hospitals: 560 places; 10 > 8 km: 7 US suburbs, NL Alphen a/d Rijn 8.3 km, ES Telde 10.8 km (Gran Canaria; true -
  the hospitals are in Las Palmas), **CZ Olomouc 15.6 km = known gap**: the CZ register in the Eurostat release omits the
  Ministry-of-Health faculty hospitals (Fakultni nemocnice Olomouc, Brno, Ostrava, Plzen, Hradec Kralove, Prague). CZ is kept
  (rural/regional hospitals are present) but distances in those cities are overstated.
- Railway: 572 places; 37 > 5 km: 30 UK (whole local-authority districts like Cornwall, centroid in countryside), ES Marbella 26.8 km
  (correct - Marbella has no railway), IT Padova/Brescia ~5.1 km (centroid of large comune), Latina 8.9 km (correct: Latina's station
  is at Latina Scalo), NL Westland 8.2 km (correct, no railway).
- Universities: 411 of 1,634 places > 10 km - expected, because ROR places each institution at its seat city only (e.g. Monchengladbach
  19 km - Hochschule Niederrhein's seat is Krefeld; Metz 47.6 km - Universite de Lorraine's seat is Nancy). Hence the field name "seat".
- Upstream finding (not changed): JP `11836117` "Suginami" has lat/lon 36.2013,140.2841 (Ibaraki) and JP `1852139` "Shinagawa" has
  33.6363,133.0057 (Ehime) in the Nestlyzer country file - both are Tokyo wards; their distances are therefore wrong. Fix the coordinates
  upstream.

## Spot checks against the official publisher
| check | value in our file | official value | result |
|---|---|---|---|
| Eurostat GISCO, AT_K102 Krankenhaus der Barmherzigen Brueder Eisenstadt | 47.84727, 16.51378 | GISCO 2023 AT.csv: 47.8465, 16.51364 | match (~90 m) |
| Eurostat GISCO, AT_K101 Rehabzentrum Bad Tatzmannsdorf | 47.331527, 16.222629 | GISCO 2023 AT.csv: 47.332737, 16.222385 | match (~130 m) |
| Eurostat GISCO AT record count | 266 (2020) | 271 rows in 2023 AT.csv | consistent |
| ROR 02d439m40 (UMHRI) | Athens 37.98376, 23.72784, education, active | api.ror.org v2: same | exact |
| DB stations total | 5,387 (after 150 m merge; 5,388 raw) | deutschebahn.com: "rund 5.400 Bahnhoefe" | match |
| SNCF stations total | 2,929 | garesetconnexions.sncf: "Gestionnaire des 3 000 gares francaises" | match |
| HIFLD licence | public domain | HIFLD metadata (datacommons.psu.edu): "None (Public Domain Information)" | match |
| HIFLD record Kadlec Medical Center | 888 Swift Blvd, Richland WA, general acute | hospital's published address 888 Swift Blvd Richland | match (live HIFLD services refused/unavailable for a coordinate check) |
| Place: AT 10101 Eisenstadt | nearest hospital 1.16 km = KH Barmherzige Brueder; station 0.59 km "Eisenstadt Schule" | hospital is in Eisenstadt town centre | plausible |
| Place: US 4278489 Sabetha KS | nearest hospital 0.72 km = Sabetha Community Hospital | hospital is in Sabetha | plausible |

## Rejected / not used, and why
- **@worldwideview/wwv-plugin-hospitals and -railway-stations (npm, OSM snapshots)**: global OSM extracts, but heavily truncated
  (44,298 hospitals worldwide, only 630 in Germany, 1,982 in the contiguous US; 31,501 stations worldwide, 1,996 in Germany). Not usable.
- **Eurostat hospitals for PL, RO** (466 / 179 records vs roughly 900 / 500 hospitals nationally; Czestochowa nearest 36 km, Vaslui
  45 km), **EL** (coordinates wrong: Larisa university and general hospital both at 39.347,22.571, 33 km from Larisa), **BG**
  (reference year 2012 and 98% of records share settlement-centroid coordinates), **SE** (hospitals geocoded to municipality/county
  centres: Norrtalje, Handen, Sodersjukhuset all at Stockholm centre; Gavle sjukhus at Bollnas).
- **Eurostat PT in nearest_hospital_km**: PT list contains only hospital emergency services (94), so PT gets only the general/acute field.
- **Trainline stations for CH** (cff ids = all 22k Swiss public-transport stops), and SE, PL, CZ, HU, RO, BG, HR, SK, SI, PT, IE, EL,
  LT, LV, EE (rail entries far below national station counts, e.g. PL 182, CZ 441, RO 15).
- **Island/area exclusions for rail** (value withheld): FR overseas departments and Corsica (CFC not in source), ES Canarias, Baleares
  (SFM not in source), Ceuta, Melilla, UK Northern Ireland (only Belfast Central in source).
- No GitHub/PyPI/npm mirror found for: GISCO healthcare 2023 release, StatCan ODHF (CA), NHS ODS/ETS sites (UK), AIHW hospitals (AU),
  ETER (EU higher-education with coordinates), IPEDS HD (US), healthsites.io, EuroGlobalMap stations, any OSM-wide pharmacy/GP/
  supermarket extract. These are the open gaps.

## Known limitations
- Hospital registers differ in scope by country (FI includes health-centre inpatient wards; NO lists hospital departments as separate
  sites, which inflates hospitals_within_25km; CY = public hospitals only). Compare `nearest_general_hospital_km` across countries,
  not `hospitals_within_25km`.
- US hospital data is the 2020 HIFLD snapshot (records mostly 2018); EU hospital reference years 2017-2020.
- DE stations: DB only (non-DB stations without IBNR, e.g. AKN, are missing). AT: OBB stations only (783, private lines partly missing).
- University distances use ROR seat-city points (accuracy a few km in cities; branch campuses invisible).
- Straight-line distances across water (islands, fjords) understate travel distance.

## Open items
1. Hospitals for UK, CA, AU, JP, KR, TW, NZ, IL, SG, HK, PL, RO, EL, BG, SE, EE, IS, LI, MK, RS, AL - need a mirrored national register.
2. Railway stations for CH, SE, PL, CZ, HU, RO, SK and all non-European countries (incl. JP, US) - need national registers.
3. Pharmacy, GP practice, supermarket, international-school fields - no credible open source reachable.
4. Upstream: fix JP Suginami / Shinagawa coordinates in the country file.
