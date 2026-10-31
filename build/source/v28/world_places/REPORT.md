# world_places - Nestlyzer 2.8 data acquisition report (non-European countries)

Domain: place/region statistics for US, CA, AU, JP, NZ, IL, HK, KR, SG, TW.
Delivered: **US, JP, IL** (place level, joined by coordinates); **US admin1** (50 states + DC).
Not delivered (no verifiable GitHub/PyPI/npm mirror found in the time box): CA, AU, NZ, KR, TW, SG, HK.

Files: `values.csv` (696,685 rows), `sources.json` (6 sources), `join_methods.csv` (per place: matched official unit + join method),
`scripts/` (my own parsing/join code; nothing from cloned repos was executed).

## Join methods (recorded per row in join_methods.csv)

| cc | method | places |
|---|---|---|
| US | `pip_county_2017_10m` - point-in-polygon in Census cartographic county boundaries (us-atlas 3.0.1 npm, 2017 edition, 1:10m) | 20,924 |
| US | `nearest_county_lt5km` - point fell just outside the coarse coastline; nearest county within 0.05 deg | 63 |
| US | `ct_town_name_to_planning_region` - Connecticut: place name = CT town, mapped to 2022 planning region via CHR crosswalk (inputs/ct_town_county_crosswalk.sas7bdat) | 104 |
| US | not joined: 91 CT villages/CDPs that are not towns (old-county polygons cannot be mapped to planning regions), 2 in former Valdez-Cordova (02261, split 2019) | 93 |
| JP | `pip_municipality_2021` - point-in-polygon, Geoshape municipal boundaries 2021-01-01 (designated cities merged) | 1,998 |
| JP | `nearest_municipality_lt3km` | 12 |
| IL | `cbs_locality_hebrew_name_match_Nkm` / `cbs_locality_name_match_Nkm` - Hebrew (or English) name equals a CBS locality within 15 km (CBS ITM coordinates transformed to WGS84) | 610 |
| IL | `cbs_locality_nearest_lt1.5km` - nearest CBS locality within 1.5 km | 76 |
| IL | suffix `via_regional_council` (502 places) = value is that of the regional council the locality belongs to; `via_own_authority` (184) = municipality/local council | |
| IL | not joined | 2 |

US place values are therefore **county values** (values.csv level=place with the exact oid, but the unit is the containing county; see join_methods.csv `matched_unit`). Large multi-county cities get the county of their GeoNames point (e.g. New York City -> New York County 36061).

## Join rate per country and field (places with a value / places in country file)

| cc | field | places | rate |
|---|---|---|---|
| IL | academic_degree_pct_age35_55 | 686 / 688 | 99.7% |
| IL | adults_convicted_per_1000_age19plus | 83 / 688 | 12.1% |
| IL | avg_monthly_wage_employees_ils | 686 / 688 | 99.7% |
| IL | bagrut_eligibility_pct_grade12 | 686 / 688 | 99.7% |
| IL | life_expectancy_years | 35 / 688 | 5.1% |
| IL | peripherality_cluster_1_10 | 686 / 688 | 99.7% |
| IL | peripherality_index_value | 686 / 688 | 99.7% |
| IL | road_accidents_with_casualties_per_1000 | 582 / 688 | 84.6% |
| IL | socioeconomic_cluster_1_10 | 686 / 688 | 99.7% |
| IL | socioeconomic_index_value | 686 / 688 | 99.7% |
| IL | unemployment_benefit_recipients_pct_age20_67 | 686 / 688 | 99.7% |
| IL | wage_gini_employees | 686 / 688 | 99.7% |
| JP | fiscal_strength_index | 2010 / 2010 | 100.0% |
| JP | ordinary_balance_ratio_pct | 2010 / 2010 | 100.0% |
| JP | real_debt_service_ratio_pct | 2010 / 2010 | 100.0% |
| US | access_exercise_opportunities_pct | 21032 / 21184 | 99.3% |
| US | adult_obesity_pct | 21091 / 21184 | 99.6% |
| US | adult_smoking_pct | 21091 / 21184 | 99.6% |
| US | broadband_households_pct | 21091 / 21184 | 99.6% |
| US | child_poverty_pct | 21091 / 21184 | 99.6% |
| US | dentists_per_100k | 20822 / 21184 | 98.3% |
| US | drive_alone_to_work_pct | 21091 / 21184 | 99.6% |
| US | drug_overdose_deaths_per_100k | 18562 / 21184 | 87.6% |
| US | firearm_deaths_per_100k | 19483 / 21184 | 92.0% |
| US | food_insecurity_pct | 21091 / 21184 | 99.6% |
| US | high_school_completion_pct_age25plus | 21091 / 21184 | 99.6% |
| US | homeownership_pct | 21091 / 21184 | 99.6% |
| US | homicides_per_100k | 15642 / 21184 | 73.8% |
| US | income_ratio_p80_p20 | 20518 / 21184 | 96.9% |
| US | injury_deaths_per_100k | 20927 / 21184 | 98.8% |
| US | life_expectancy_years | 20952 / 21184 | 98.9% |
| US | long_commute_over30min_drive_alone_pct | 21091 / 21184 | 99.6% |
| US | median_household_income_usd | 21091 / 21184 | 99.6% |
| US | mental_health_providers_per_100k | 20859 / 21184 | 98.5% |
| US | motor_vehicle_crash_deaths_per_100k | 20468 / 21184 | 96.6% |
| US | pm25_annual_mean_ugm3 | 20810 / 21184 | 98.2% |
| US | population_age65plus_pct | 21091 / 21184 | 99.6% |
| US | poverty_rate_pct | 21091 / 21184 | 99.6% |
| US | premature_mortality_under75_per_100k_age_adj | 20968 / 21184 | 99.0% |
| US | primary_care_physicians_per_100k | 20729 / 21184 | 97.9% |
| US | rural_population_pct | 21091 / 21184 | 99.6% |
| US | severe_housing_cost_burden_pct | 21090 / 21184 | 99.6% |
| US | severe_housing_problems_pct | 21091 / 21184 | 99.6% |
| US | some_college_pct_age25_44 | 21091 / 21184 | 99.6% |
| US | suicides_per_100k_age_adj | 19839 / 21184 | 93.7% |
| US | traffic_volume_per_m_major_road | 20933 / 21184 | 98.8% |
| US | unemployment_rate_pct | 21091 / 21184 | 99.6% |
| US | uninsured_pct_under65 | 21091 / 21184 | 99.6% |

US admin1: 32 fields x 50 Nestlyzer state codes (DC -> US07, see issues below). 

## Field periods, units and sources

| cc | field | period | unit | source_id |
|---|---|---|---|---|
| IL | academic_degree_pct_age35_55 | 2021/22 | % of residents 35-55 with Israeli degree | il_cbs_local_authorities_2021 |
| IL | adults_convicted_per_1000_age19plus | 2020 | per 1,000 residents 19+ (authorities 50k+) | il_cbs_local_authorities_2021 |
| IL | avg_monthly_wage_employees_ils | 2019 | ILS per month (employees) | il_cbs_local_authorities_2021 |
| IL | bagrut_eligibility_pct_grade12 | 2020/21 | % of grade 12 pupils | il_cbs_local_authorities_2021 |
| IL | life_expectancy_years | 2017-2021 | years (cities 50k+ only) | il_cbs_local_authorities_2021 |
| IL | peripherality_cluster_1_10 | 2020 | cluster 1 (most peripheral) - 10 | il_cbs_local_authorities_2021 |
| IL | peripherality_index_value | 2020 | standardised index | il_cbs_local_authorities_2021 |
| IL | road_accidents_with_casualties_per_1000 | 2021 | per 1,000 residents | il_cbs_local_authorities_2021 |
| IL | socioeconomic_cluster_1_10 | 2019 | cluster 1 (lowest) - 10 | il_cbs_local_authorities_2021 |
| IL | socioeconomic_index_value | 2019 | standardised index | il_cbs_local_authorities_2021 |
| IL | unemployment_benefit_recipients_pct_age20_67 | 2021 | % of residents 20-67 receiving unemployment benefit (annual) | il_cbs_local_authorities_2021 |
| IL | wage_gini_employees | 2019 | Gini 0-1 | il_cbs_local_authorities_2021 |
| JP | fiscal_strength_index | FY2021 | index (MIC 財政力指数, 3-yr avg) | jp_mic_fiscal_indices_fy2021 |
| JP | ordinary_balance_ratio_pct | FY2021 | % (MIC 経常収支比率) | jp_mic_fiscal_indices_fy2021 |
| JP | real_debt_service_ratio_pct | FY2021 | % (MIC 実質公債費比率) | jp_mic_fiscal_indices_fy2021 |
| US | access_exercise_opportunities_pct | 2024 | % of population | us_chr_2025 |
| US | adult_obesity_pct | 2022 | % of adults | us_chr_2025 |
| US | adult_smoking_pct | 2022 | % of adults (age-adjusted) | us_chr_2025 |
| US | broadband_households_pct | 2019-2023 | % of households | us_chr_2025 |
| US | child_poverty_pct | 2023 | % of persons under 18 | us_chr_2025 |
| US | dentists_per_100k | 2022 | per 100k population | us_chr_2025 |
| US | drive_alone_to_work_pct | 2019-2023 | % of workers | us_chr_2025 |
| US | drug_overdose_deaths_per_100k | 2020-2022 | deaths per 100k population | us_chr_2025 |
| US | firearm_deaths_per_100k | 2018-2022 | deaths per 100k population | us_chr_2025 |
| US | food_insecurity_pct | 2022 | % of population | us_chr_2025 |
| US | high_school_completion_pct_age25plus | 2019-2023 | % of adults 25+ | us_chr_2025 |
| US | homeownership_pct | 2019-2023 | % of occupied housing units | us_chr_2025 |
| US | homicides_per_100k | 2016-2022 | deaths per 100k population | us_chr_2025 |
| US | income_ratio_p80_p20 | 2019-2023 | ratio | us_chr_2025 |
| US | injury_deaths_per_100k | 2018-2022 | deaths per 100k population | us_chr_2025 |
| US | life_expectancy_years | 2020-2022 | years | us_chr_2025 |
| US | long_commute_over30min_drive_alone_pct | 2019-2023 | % of solo car commuters | us_chr_2025 |
| US | median_household_income_usd | 2019-2023 | USD (nominal) | us_acs5_2023 |
| US | mental_health_providers_per_100k | 2024 | per 100k population | us_chr_2025 |
| US | motor_vehicle_crash_deaths_per_100k | 2016-2022 | deaths per 100k population | us_chr_2025 |
| US | pm25_annual_mean_ugm3 | 2020 | ug/m3 | us_chr_2025 |
| US | population_age65plus_pct | 2023 | % of population | us_chr_2025 |
| US | poverty_rate_pct | 2023 | % of persons | us_saipe_2023 |
| US | premature_mortality_under75_per_100k_age_adj | 2020-2022 | deaths per 100k population (age-adjusted) | us_chr_2025 |
| US | primary_care_physicians_per_100k | 2021 | per 100k population | us_chr_2025 |
| US | rural_population_pct | 2020 | % of population | us_chr_2025 |
| US | severe_housing_cost_burden_pct | 2019-2023 | % of households | us_chr_2025 |
| US | severe_housing_problems_pct | 2017-2021 | % of households | us_chr_2025 |
| US | some_college_pct_age25_44 | 2019-2023 | % of adults 25-44 | us_chr_2025 |
| US | suicides_per_100k_age_adj | 2018-2022 | deaths per 100k population (age-adjusted) | us_chr_2025 |
| US | traffic_volume_per_m_major_road | 2020 | vehicles per meter of major roadway | us_chr_2025 |
| US | unemployment_rate_pct | 2024 | % of labour force | us_bls_laus_2024 |
| US | uninsured_pct_under65 | 2022 | % of population under 65 | us_chr_2025 |

## Spot checks against the official publisher

| # | value in file | official value | where checked | result |
|---|---|---|---|---|
| 1 | US SAIPE 2023 poverty, San Francisco County 06075: 11.9 | 11.9 (2023) | Census SAIPE series PPAACA06075A156NCEN as republished on FRED (census.gov API needs a key; data.census.gov is JS) | match |
| 2 | US CHR 2025 "Median Household Income" San Francisco: 125,456 | SAIPE 2023 125,456 | SAIPE series MHICA06075A052NCEN (FRED) | match - confirms the CHR file passes official values through unchanged |
| 3 | US BLS LAUS 2024 unemployment Travis County TX: 3.5 | 3.5 | BLS series LAUCN484530000000003 (FRED; bls.gov blocks fetch) | match |
| 4 | US BLS LAUS 2024 unemployment Nemaha County KS: 2.6 | 2.5 (current, revised) | LAUCN201310000000003 (FRED) | **vintage difference**: file is the 18-Apr-2025 vintage; BLS revised 2024 later. Expect +-0.1-0.2 pt differences |
| 5 | US ACS 2019-2023 median HH income Nemaha 77,375 / SF 141,446 | QuickFacts now shows 2020-2024: 77,348 / 140,970 | census.gov QuickFacts | consistent order of magnitude; exact 2019-2023 page no longer served |
| 6 | JP FY2021 財政力指数 Sapporo 0.72, 経常収支比率 93.0, 実質公債費比率 2.7 | 0.724 / 93.0% / 2.7% | Sapporo city FY2021 fiscal report (city.sapporo.jp ... 20221212-14.pdf) | match (file rounds to 2 dp) |
| 7 | JP: Sapporo FSI rank 17/20 designated cities, designated-city mean 0.843; Kitakyushu FSI rank 18, OCR rank 18 | rank 17, mean 0.842; Kitakyushu 18th / 18th | Sapporo report above; Kitakyushu FY2021 report (city.kitakyushu.lg.jp files/001076730.pdf) | match |
| 8 | IL socio-economic index 2019: Jerusalem -1.118 cl.2, Tel Aviv-Yafo 1.185 cl.8, Haifa 0.437 cl.7, Bnei Brak -1.542 cl.2, Neve Midbar -2.844 | identical | CBS press release 24/2022 (cbs.gov.il mediarelease/DocLib/2022/375/24_22_375b.pdf) | match (5 authorities) |

Not independently spot-checked (CHR website and Zenodo files are not fetchable from here): the CHR-computed health measures (life expectancy, provider ratios, PM2.5, mortality rates, etc.). Check 2 shows the CHR file reproduces official inputs exactly; the CHR 2025 release itself is the official publication of these measures.

## Rejected / not used, and why

- **CHR GitHub repo licence**: the snapshot repo is CC BY-NC-SA 4.0; the identical CHR&R 2025 release is CC BY 4.0 on Zenodo (record 18332002). I used it on that basis - please confirm this is acceptable before shipping; otherwise drop every `us_chr_2025` row (the ACS/SAIPE/BLS rows are public domain and stay).
- **CHR r2026 measure files** (measure_datasets/*_r2026.csv in the official repo, newer years for ~20 measures): not used because their data years are not documented in the mirror and could not be checked against the CHR site; upgrade candidate.
- **ACS median home value, median gross rent, median age, mean commute, bachelor's share, property-tax rate**: no county-level ACS mirror found (QuickFacts/API not bulk-downloadable here). Left missing.
- **State income-tax top rate / sales-tax rate**: TaxFoundation/data on GitHub is stale (last commit 2019) and Tax Foundation is not an official publisher. Rejected.
- **FBI violent/property crime**: jacobkap/crimedatatool_helper (already cloned in _raw by another agent; FBI Return A by agency, 2024) has no months-reported field, so partial reporters cannot be excluded and rates cannot be validated. Not used; lead for the crime agent.
- **openintro usdata (cran/usdata)**: ACS 2015-2019, GPL-3, superseded. Rejected.
- **Clpr/CountyPlus**: derived research panel, Stata pipeline, not an official release. Rejected.
- **japandata furusato files**: furusato-nozei deductions, not income statistics. Not used.
- CA (StatCan 2021 CSD profile), AU (ABS 2021 GCP G02), NZ, KR, TW, SG, HK: no GitHub/PyPI/npm mirror located (GitHub code search is blocked in this session and web search does not index raw repo files). NZ regional rent was already covered by the owner.

## Data issues found in Nestlyzer's own files (for the owner)

- US: 146 places have an `rc` state that disagrees with the state their coordinates fall in, e.g. `St. Louis` (rc US14 Illinois, point in Missouri), `Bettendorf` (Illinois vs Iowa), `Camas` (Oregon vs Washington), `Leawood` (Missouri vs Kansas), `Columbus (Alabama)` (point in Georgia). Values follow the coordinates.
- US: Nestlyzer has two regions named "Washington": US07 (contains all DC places, i.e. District of Columbia) and US47 (Washington State). I mapped DC admin1 values to US07.
- JP: some GeoNames names point to a different municipality than the name suggests (e.g. `Suginami (杉並)` lies in 石岡市, Ibaraki; `Bunkyo (文京)` in 相模原市). Values follow the coordinates.

## Open gaps

1. US ACS housing/age/commute/education fields (home value, rent, median age, commute minutes, bachelor's, property tax) - need a county ACS mirror.
2. Newer US vintages: ACS 2020-2024, SAIPE 2024, LAUS 2025, CHR 2026 - official but unmirrored.
3. US crime (FBI) and state tax rates.
4. JP: FY2022-FY2024 fiscal indicators, municipal taxable income per taxpayer, land prices.
5. CA, AU, NZ, KR, TW, SG, HK: nothing delivered.
6. 91 Connecticut CDPs/villages and 2 Alaska places unjoined (need CT planning-region polygons).
