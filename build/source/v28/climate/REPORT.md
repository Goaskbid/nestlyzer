# Climate & air quality: v28 data acquisition report

## What was delivered

| file | rows | content |
|---|---|---|
| `values.csv` | 128,883 | `koppen_geiger_class` for each place with coordinates (Beck et al. 2023 V2, 1991-2020, 1 km, **CC BY 4.0**) |
| `restricted_worldclim_values.csv` | 1,288,866 | 10 WorldClim temperature/precipitation fields per place. **Quarantined, licence fails the brief** (see "Rejected / quarantined") |
| `sources.json` | 3 sources | provenance, mirror repo + commit sha, licence, native resolution, sampling method |
| `build_climate.py` | n/a | the sampler (run with `python3 -I`). It reads only raster files; no repo code is executed |

Every row is `level=place` with the exact `oid` from the country file. Sampling method: **nearest cell** (the grid cell that contains the point). If that cell is sea or nodata, the nearest valid land cell within ±2 cells is used. For Köppen this applied to 444 places (about ±2 km); for WorldClim it applied to 2 places.

Places: the country files hold **129,963** rows (not 129,508). **1,076 rows have no lat/lon** (EL 504, FR 362, NO 94, IT 69, UK 14, BE 13, NL 5, IS 4, DE 3, LV 3, LU 2, ES/FI/PL 1 each). Those rows stay missing. Another 4 points (JP 2, CA 1, DE 1) are more than 2 km offshore of the Köppen land mask, and 2 (JP) are outside the 5' WorldClim land mask.

## Fields

| field | unit | source_id | file |
|---|---|---|---|
| koppen_geiger_class | Beck legend symbol (Af ... EF) | beck_kg_v2_1km | values.csv |
| annual_mean_temp_c | °C (bio1) | worldclim21_bio_10m | restricted |
| max_temp_warmest_month_c | °C, mean daily max of warmest month (bio5) | worldclim21_bio_10m | restricted |
| min_temp_coldest_month_c | °C, mean daily min of coldest month (bio6) | worldclim21_bio_10m | restricted |
| mean_temp_warmest_quarter_c | °C (bio10) | worldclim21_bio_10m | restricted |
| mean_temp_coldest_quarter_c | °C (bio11) | worldclim21_bio_10m | restricted |
| annual_precip_mm | mm/yr (bio12) | worldclim21_bio_10m | restricted |
| precip_wettest_month_mm / precip_driest_month_mm | mm/month (bio13/bio14) | worldclim21_bio_10m | restricted |
| jan_mean_temp_c / jul_mean_temp_c | °C (WorldClim 2.0 5' tavg_01/07) | worldclim20_tavg_5m | restricted |

The fields named in the brief as "mean temperature of the coldest/warmest month" are **not** delivered under those names. The mirror holds no full 12-month tavg set. What exists is bioclim quarter means (bio10/11), extreme-month means of daily max/min (bio5/6), and the January and July means. Each field is named for what it actually is.

## Join rate per country (places with a value / places in country file)

| cc | places | WorldClim bio x8 (restricted) | Jan+Jul tavg (restricted) | Köppen (values.csv) |
|---|---|---|---|---|
| AL | 61 | 61 (100.0%) | 61 (100.0%) | 61 (100.0%) |
| AT | 2093 | 2093 (100.0%) | 2093 (100.0%) | 2093 (100.0%) |
| AU | 2034 | 2034 (100.0%) | 2034 (100.0%) | 2034 (100.0%) |
| BE | 607 | 594 (97.9%) | 594 (97.9%) | 594 (97.9%) |
| BG | 265 | 265 (100.0%) | 265 (100.0%) | 265 (100.0%) |
| CA | 2929 | 2929 (100.0%) | 2929 (100.0%) | 2928 (100.0%) |
| CH | 2172 | 2172 (100.0%) | 2172 (100.0%) | 2172 (100.0%) |
| CY | 615 | 615 (100.0%) | 615 (100.0%) | 615 (100.0%) |
| CZ | 6258 | 6258 (100.0%) | 6258 (100.0%) | 6258 (100.0%) |
| DE | 10978 | 10975 (100.0%) | 10975 (100.0%) | 10974 (100.0%) |
| DK | 99 | 99 (100.0%) | 99 (100.0%) | 99 (100.0%) |
| EE | 87 | 87 (100.0%) | 87 (100.0%) | 87 (100.0%) |
| EL | 6639 | 6135 (92.4%) | 6135 (92.4%) | 6135 (92.4%) |
| ES | 8132 | 8131 (100.0%) | 8131 (100.0%) | 8131 (100.0%) |
| FI | 311 | 310 (99.7%) | 310 (99.7%) | 310 (99.7%) |
| FR | 35359 | 34997 (99.0%) | 34997 (99.0%) | 34997 (99.0%) |
| HK | 154 | 154 (100.0%) | 154 (100.0%) | 154 (100.0%) |
| HR | 556 | 556 (100.0%) | 556 (100.0%) | 556 (100.0%) |
| HU | 3155 | 3155 (100.0%) | 3155 (100.0%) | 3155 (100.0%) |
| IE | 166 | 166 (100.0%) | 166 (100.0%) | 166 (100.0%) |
| IL | 688 | 688 (100.0%) | 688 (100.0%) | 688 (100.0%) |
| IS | 79 | 75 (94.9%) | 75 (94.9%) | 75 (94.9%) |
| IT | 7987 | 7918 (99.1%) | 7918 (99.1%) | 7918 (99.1%) |
| JP | 2010 | 2010 (100.0%) | 2008 (99.9%) | 2008 (99.9%) |
| KR | 149 | 149 (100.0%) | 149 (100.0%) | 149 (100.0%) |
| LI | 11 | 11 (100.0%) | 11 (100.0%) | 11 (100.0%) |
| LT | 60 | 60 (100.0%) | 60 (100.0%) | 60 (100.0%) |
| LU | 104 | 102 (98.1%) | 102 (98.1%) | 102 (98.1%) |
| LV | 162 | 159 (98.1%) | 159 (98.1%) | 159 (98.1%) |
| MK | 80 | 80 (100.0%) | 80 (100.0%) | 80 (100.0%) |
| MT | 68 | 68 (100.0%) | 68 (100.0%) | 68 (100.0%) |
| NL | 360 | 355 (98.6%) | 355 (98.6%) | 355 (98.6%) |
| NO | 780 | 686 (87.9%) | 686 (87.9%) | 686 (87.9%) |
| NZ | 631 | 631 (100.0%) | 631 (100.0%) | 631 (100.0%) |
| PL | 2478 | 2477 (100.0%) | 2477 (100.0%) | 2477 (100.0%) |
| PT | 3092 | 3092 (100.0%) | 3092 (100.0%) | 3092 (100.0%) |
| RO | 3181 | 3181 (100.0%) | 3181 (100.0%) | 3181 (100.0%) |
| RS | 169 | 169 (100.0%) | 169 (100.0%) | 169 (100.0%) |
| SE | 290 | 290 (100.0%) | 290 (100.0%) | 290 (100.0%) |
| SG | 113 | 113 (100.0%) | 113 (100.0%) | 113 (100.0%) |
| SI | 212 | 212 (100.0%) | 212 (100.0%) | 212 (100.0%) |
| SK | 2927 | 2927 (100.0%) | 2927 (100.0%) | 2927 (100.0%) |
| TW | 78 | 78 (100.0%) | 78 (100.0%) | 78 (100.0%) |
| UK | 400 | 386 (96.5%) | 386 (96.5%) | 386 (96.5%) |
| US | 21184 | 21184 (100.0%) | 21184 (100.0%) | 21184 (100.0%) |
| **all** | 129963 | 128887 | 128885 | 128883 |

Within each country every field in a group has the same count. Each of the 8 bioclim fields has the same count as the others, and the Jan and Jul counts match each other.

Köppen class distribution over all places: Cfb 48,085 · Dfb 22,957 · Cfa 19,957 · Csa 12,992 · Dfa 8,679 · BSk 6,851 · Csb 5,327 · BSh 1,057 · Dfc 683 · BWh 497 · Af 359 · BWk 346 · Aw 289 · Cwa 241 · Am 186 · Dsb 107 · Dwa 98 · ET 51 · Dsc 38 · Cfc 37 · Dsa 28 · Dwb 15 · Dwc 3.

## Cross-check against national met-service normals (10 places + 1)

"File" values are WorldClim cell values (1970-2000, 10'/5' cell) taken from the restricted file. "Official" values are station normals. A "direct" source means the met-service page or document itself. "via Wikipedia" means the Wikipedia climate table that cites the met service, used where the official page is JS-only.

| place (oid) | Jan °C file / official | Jul °C file / official | annual mean °C file / official | annual precip mm file / official | official source |
|---|---|---|---|---|---|
| Zürich CH 261 | 0.6 / 0.9 | 18.9 / 19.0 | 9.2 / 9.8 | 1082 / 1108 | MeteoSwiss Fluntern 1991-2020 (via Wikipedia) |
| Oslo NO 0301 | -4.0 / -2.3 | 16.3 / 17.6 | 5.8 / 7.0 | 797 / 835 | MET Norway Seklima, Blindern 1991-2020 (via Wikipedia) |
| Madrid ES 28079 | 5.7 / 6.3 | 24.7 / 25.6 | 14.3 / 15.0 | 405 / 421 | AEMET Retiro 1981-2010 (direct, aemet.es valores climatológicos) |
| Phoenix US 5308655 | 12.5 / 13.8 | 33.7 / 35.3 | 22.4 / 24.2 | 202 / 183 | NWS Phoenix 1991-2020 (annual values direct, weather.gov/psr/19912020Normals; monthly values via Wikipedia/NOAA) |
| Sydney AU 2147714 | 22.4 / 22.4 (Tmax 26.0 + Tmin 18.8, halved) | 12.7 / 12.25 | n/a | 1239 / 1213 | BoM Observatory Hill 066062, 1858-2020 (direct). Also bio5 26.4 vs Jan Tmax 26.0, bio6 7.9 vs Jul Tmin 8.1 |
| Tokyo JP 1850147 | 5.3 / 5.4 | 25.1 / 25.7 (Aug 26.9) | 15.6 / 15.8 | 1432 / 1598 | JMA Tokyo 47662 1991-2020 (direct, data.jma.go.jp) |
| Reykjavík IS 0000 | -0.5 / 0.7 | 10.8 / 11.7 | n/a | n/a | IMO (vedur.is) monthly CLIMAT sheets Jan/Jul 2026. Normals derived as observed value minus the stated 1991-2020 anomaly |
| Valletta MT MT01101 | 13.1 / 12.9 | 26.1 / 26.9 | 19.1 / 19.5 (1961-90: 18.6) | 529 / 581 (1961-90: 553) | Luqa 1991-2020 (via Wikipedia). 1961-90 figures direct from Galdies, Univ. of Malta, using Malta Met Office data |
| Singapore SG 1880216 (Tampines, near Changi) | 26.2 / 26.8 | 27.4 / n/a | 26.9 / 27.8 | 2318 / 2113 (Changi), 2534 (islandwide) | MSS "Year in Numbers 2023" (direct, rainfall and annual-mean anomaly); NEA 1991-2020 monthly via Wikipedia |
| Helsinki FI 091 | -4.7 / -3.1 | 17.1 / 18.1 | 5.1 / 6.5 | 654 / 653 | FMI Kaisaniemi 1991-2020 (via Wikipedia) |
| (file values only, no official check) Berlin DE 11000000 · Wien AT 90001 · Roma IT 058091 | 0.7 · 0.2 · 7.8 | 19.2 · 20.5 · 24.2 | 9.5 · 10.3 · 15.4 | 572 · 572 · 601 | plausibility only |

**Reading the comparison:** precipitation agrees within ±10% for 8 of 9 places. The exceptions are Tokyo (−10%) and Phoenix (+10%, a very dry and highly variable place). Temperatures in the file are **systematically 0.2-1.8 °C colder** than current station normals. That bias is what you would expect from the older WorldClim period (1970-2000 against 1991-2020: about 0.5-1 °C of warming in Europe), urban-heat-island stations (Phoenix, Helsinki Kaisaniemi, Oslo Blindern) and 10' cells that average in higher, colder terrain (Oslo/Nordmarka, Reykjavík). No sign or unit errors were found, and the hemispheres are right: Sydney has a warm January and a cool July.

**Köppen check (values.csv):** for each of the 10 cities I computed the class from the official normals above with Beck's rules (0 °C coldest-month threshold, B threshold 2T+14 cm). All 10 match the file: Zürich Cfb, Oslo Dfb, Helsinki Dfb, Madrid BSk (P 421 < threshold 440 mm and > half of it, T < 18), Phoenix BWh, Tokyo Cfa, Sydney Cfa, Valletta Csa, Singapore Af, and Reykjavík Cfc (coldest month 0.7 > 0, warmest 11.7 < 22, fewer than 4 months above 10 °C). Provenance: the 1 km GeoTIFF is a byte-identical git blob in two unrelated repos (earthlab/firedpy and Yucareux/Tellus). It has the official Beck V2 folder and file name and the official colour table.

## Rejected / quarantined, and why

- **WorldClim 2.1 bioclim 10' and 2.0 tavg 5' → quarantined** in `restricted_worldclim_values.csv`. The data checks well (above), but the WorldClim terms say "freely available for academic use and other non-commercial use. Redistribution or commercial use is not allowed without prior permission" (worldclim.org/about.html). That fails the brief's "reuse with attribution" rule. Use it only after getting permission (info@worldclim.org) or for non-public analysis. The period is also 1970-2000, older than 2015; it would have been accepted only as "nothing newer exists".
- **npm koppen-climate-lookup 2.0.0** (0.5° Köppen points, ISC): source dataset and period not documented, and too coarse. Superseded by Beck V2 1 km.
- **PyPI koppengeiger 1.1.0** (JPL, KG_simplified_uint8.tif): simplified classes, not the 30-class Beck map.
- **PyPI kgcpy / CRAN kgc**: Rubel & Kottek 5' 1986-2010 classification, older and coarser than Beck V2.
- **mapme.biodiversity CHELSA / wc2.1_cruts4.09 2018 tiles**: single-year test fixtures, not normals.
- **tidyterra CHE_wc2.1_30s**: Switzerland only, and also under WorldClim terms.
- **hylken/Koppen-Geiger_maps** (Beck's own repo): code and PNG figures only, no data grids.

## Not found (open gaps)

None of these turned up in any reachable mirror (GitHub via Sourcegraph/grep.app path search, PyPI, npm):
- **Sunshine hours / solar radiation**: no WorldClim srad, CRU CL2.0 sunp, NASA POWER, Global Solar Atlas or PVGIS grid.
- **Relative humidity, hot days (Tmax > 30 °C), frost days**: no CRU CL2.0 reh/frs, CRU TS frs, or ERA5-derived index grids.
- **Annual mean PM2.5**: no ACAG/van Donkelaar V5.GL grid, and no mirror of the WHO Ambient Air Quality Database CSV/XLSX on GitHub. The WHO file itself is only on who.int, which is blocked.
- **A CC BY temperature/precipitation normal** (CRU TS 4.x, CHELSA 2.1, TerraClimate, GPCC, ERA5 climatology, or Beck V2 `climate_data_0p1.zip`) that would replace WorldClim: none mirrored. The best candidate is Beck V2's own 0.1° monthly climatologies (CC BY 4.0, 1991-2020) in the same figshare record as the Köppen map. It is not reachable from this machine and should be downloaded manually.
- Elevation adjustment: not done, because no climate source is clean enough to adjust.

## Second search round (coordinator's list): result per candidate

Search tools used: Sourcegraph path search (`file:` across GitHub, forks and archived repos included), grep.app content search, npm registry search, PyPI JSON probes and wheel listings, and WebSearch (standard and extended). Status of each candidate:

| candidate | licence | outcome |
|---|---|---|
| CRU TS 4.x tmp/tmx/tmn/pre/cld/frs/vap (grids or 1991-2020 normals) | CC BY 4.0 | **Not found.** GitHub hits are only placeholders or site extracts. sbegueria/SPEIbase `inputData/cru_ts4.08...pre.dat.nc.txt` is a placeholder. forestgeo/Climate `Climate_Data/CRU` holds CRU values extracted at ForestGEO plots, not grids. SantanderMetGroup/ATLAS has only CRU_TS no-observation masks. monocongo/climate_indices has tiny test fixtures. CRU CL2.0 (`grid_10min_*`) has no hits. Official hosts (crudata.uea.ac.uk, CEDA, figshare) are blocked |
| TerraClimate 1991-2020 normals | CC0 | **Not found.** Only STAC/GEE JSON descriptors (stac-utils/xstac, opengeos/Earth-Engine-Catalog) |
| ERA5 / ERA5-Land monthly climatology | Copernicus licence | **Not found** as a global grid of 0.5° or finer. Hits are test fixtures (OSGeo/gdal `era5_t2m.nc`, psyplot) and UK-only xarray tutorial data. WeatherBench2's ERA5 climatology on gs://weatherbench2 exists, but storage.googleapis.com is refused by the proxy |
| NASA POWER / NASA SSE 22-yr insolation (1°) | public domain | **Not found** on GitHub/PyPI/npm. The pvlib wheel (0.16.1) ships only Linke turbidity, altitude and TMY samples. The Stanford EarthWorks copy of the SSE 1° GHI grid is not reachable |
| Beck V2 monthly 0.1° climatologies (`climate_data_0p1.zip`, `ensemble_mean_0p1.nc`) | CC BY 4.0 | **Not found.** Mirrors carry only the Köppen tif |
| CHELSA 2.1 normals | CC BY 4.0 | **Not found** (only single-year 2010 test tiles in mapme.biodiversity) |
| NCEP/NCAR `air.mon.ltm.1991-2020.nc` (orange-Nan/Boboshubao) | public domain | **Rejected**: 2.5° reanalysis grid, much coarser than the 0.5° bar |
| van Donkelaar / ACAG V5.GL / V6.GL PM2.5 | ACAG terms | **Not found** in any repo. The AWS Open Data registry lists V6.GL on S3, which is blocked |
| WHO AAQ database (2022/2023/2024) xlsx/csv | CC BY-NC-SA 3.0 IGO (WHO) | **Not found** in any GitHub repo (MotherDuck hosts a copy internally, not reachable). The WHO licence is also non-commercial, so it would fail the same test as WorldClim |
| EEA AQ e-Reporting annual statistics | CC BY 4.0 / EEA reuse | **Not found** as committed CSV. earthobservations/luftdatenpumpe has fetch code only |
| OpenAQ annual city averages | CC BY 4.0 | **Not found** (only API clients on npm; the S3 archive is blocked) |
| npm `sunshine-hours-by-city`, `world-rainfall-data`, `world-temperature-data` | CC BY 4.0 | **Rejected**: 270 world cities only, derived values, not a grid and not per place |

The second round found nothing new for `values.csv`. Outside the quarantined WorldClim file there is still no openly licensed temperature, precipitation, sunshine or PM2.5 value.

Raw downloads are in /home/claude/ext/v28/_raw/{firedpy, Tellus, livro_aer, rladies_freiburg, Koppen-Geiger_maps, kgcpy, pypi_koppengeiger, pypi_latlon-utils, npm_koppen-climate-lookup, climatemaps}. The firedpy, livro_aer and rladies_freiburg clones are sparse checkouts holding only the data files that were used.
