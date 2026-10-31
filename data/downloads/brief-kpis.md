# Nestlyzer data collection brief: the Nestlyzer KPI framework (177 key figures)

**Goal.** Nestlyzer compares places for 28 household profiles and 20 business-site profiles. The framework below lists what people and location planners actually compare. It is based on the dimensions used by established comparisons:
- households: OECD regional well-being, EIU, Mercer, the Eurostat survey on quality of life in European cities, the EU Social Progress Index, Swiss and German municipality ratings, US News, Niche;
- business: fDi Benchmark, Site Selection, Kearney, Cushman & Wakefield manufacturing and data centre comparisons, IMD, World Bank B-READY, the EU Regional Innovation Scoreboard and the EY attractiveness survey.

**Two jobs.**
1. **Collect the data** for every KPI and country where the column "already in Nestlyzer" does not list the country.
2. **Find even more.** Propose at least 60 further KPIs that comparable analyses use and that official open data supports. Deliver them as `kpi_proposals.csv`, then collect the 20 best. Columns: `proposed_id, name, unit, level, audience, profiles, comparable_analyses, official_source, source_url, licence, countries_covered`.

**Delivery format.** Same columns as `Nestlyzer_All_Collected_Data_2026-10-21.csv`. `indicator_id` starts with the KPI id below. Bands, occupations (ISCO/SOC), NACE/NAICS codes, tax bases and scenario definitions go in `dimensions`. Use official geography codes (LAU, NUTS 2021, FIPS, national municipality codes). Add `sources.json` and `REPORT.md` (counts per KPI × country, three spot checks, gaps).

**Rules.**
- **Sources:** official or openly licensed sources allowing commercial reuse with attribution; the site carries ads.
- **Concepts kept apart:** price per kWh, annual bill and share of income are never mixed; nor are employee pay and employer cost, or a level and a growth rate.
- **Geography:** the most local level published.
- **Period:** the latest one.
- **Missing data:** missing stays missing.

**Priority:**
1. KPIs used by many profiles and missing in the largest countries: FR, US, DE, ES, IT, CZ, EL, RO, HU, PT, CA, SK.
2. Municipality-level figures before regional, and regional before national.

## Business sites: Industry and innovation

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `industry_mix` | Employment by industry (NACE section / NAICS sector) | % of jobs | municipality / NUTS3 / county | 20 | FDI SITE CWMR PROG | DE, FR, HR, IT, NZ, SK, US | Eurostat nama_10r_3empers; national registers per municipality; US County Business Patterns |
| `industry_lq` | Concentration of this site's industry (location quotient) | ratio | NUTS3 / county | 13 | SITE FDI | US | computed from the industry mix: local share divided by national share |
| `establishments_size` | Firms by size class | count | municipality / NUTS3 | 20 | SITE | FR, US | national business registers; Eurostat sbs_r_nuts06_r2 |
| `patents` | Patent applications per million residents | per million | NUTS3 | 4 | RIS IMD FDI | — | Eurostat pat_ep_rtot (EPO by NUTS3); OECD REGPAT |
| `rnd_spending` | R&D spending as a share of GDP | % | NUTS2 | 3 | RIS IMD | — | Eurostat rd_e_gerdreg |
| `universities` | Universities and research institutes within 50 km | count / students | place | 4 | FDI KEAR RIS | 45 countries | ETER (European Tertiary Education Register); national registers |
| `innovation_score` | Regional Innovation Scoreboard group | index | NUTS2 | 4 | RIS | — | European Commission Regional Innovation Scoreboard |
| `vc_investment` | Venture capital invested per resident | per resident | NUTS2 / city | 2 | EYEA | — | open sources only (e.g. national development banks, OECD), check licences |

## Business sites: Infrastructure and utilities

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `motorway` | Distance to a motorway junction | km | place | 14 | SITE FDI | — | Natural Earth / OpenStreetMap |
| `rail_freight` | Distance to a rail freight or intermodal terminal | km | place | 7 | SITE | — | national intermodal terminal lists (UIRR/AGORA, BMDV KV-Terminals) |
| `port_throughput` | Cargo of the nearest major seaport | tonnes / TEU a year | port | 7 | SITE FDI | DE | Eurostat mar_go_qm / mar_mg_aa_pwhd; USACE Waterborne Commerce |
| `air_cargo` | Air cargo at the nearest hub airport | tonnes a year | airport | 3 | SITE | — | Eurostat avia_gooa; FAA |
| `air_destinations` | Direct destinations from the nearest hub airport | destinations | airport | 4 | FDI KEAR SITE | — | Eurostat avia_par routes; OurAirports + open route data |
| `grid_connection` | Time and cost to connect to the grid | days, % of income per capita | country | 6 | BREADY CWDC | 31 countries | World Bank B-READY (utility services) |
| `power_reliability` | Power outages per customer (SAIDI) | minutes a year | country / state | 6 | CWDC CWMR | US | CEER benchmarking report on quality of supply; EIA 861 |
| `renewable_share` | Renewable share of electricity | % | country / state | 7 | CWDC | — | Eurostat nrg_ind_ren; EIA state profiles |
| `water_stress` | Baseline water stress | index 0-5 | river basin | 4 | CWDC CWMR | — | WRI Aqueduct 4.0 (CC BY 4.0) |
| `gigabit` | Gigabit broadband coverage | % of addresses | municipality / NUTS3 | 13 | CWDC KEAR | UK, US | national broadband atlases; EU Broadband Coverage Study; FCC |
| `ixp_distance` | Distance to the nearest internet exchange point | km | place | 2 | CWDC | — | PeeringDB (check terms), Euro-IX |
| `cooling_degree_days` | Cooling degree days | degree days a year | NUTS3 | 1 | CWDC | — | Eurostat nrg_chdd_a; NOAA |
| `logistics_performance` | Logistics performance index | score 1-5 | country | 7 | FDI SITE | — | World Bank LPI (CC BY 4.0) |

## Business sites: Labour

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `labour_cost_hour` | Employer labour cost per hour | EUR or USD per hour | NUTS2 / state | 20 | FDI KEAR CWMR IMD SITE | 27 countries | Eurostat lc_lci_lev and lc_ncost_r2; BLS ECEC; national statistics offices |
| `labour_cost_change` | Change in employer labour cost | % a year | country | 20 | IMD | — | Eurostat lc_lci_r2_a |
| `wage_production` | Hourly pay, production workers | per hour | NUTS2 / metro area | 6 | FDI KEAR SITE CWMR | US | Eurostat Structure of Earnings Survey (earn_ses, ISCO); BLS OEWS by metro area; national wage statistics |
| `wage_warehouse` | Hourly pay, warehouse and transport workers | per hour | NUTS2 / metro area | 3 | FDI KEAR SITE CWMR | US | Eurostat Structure of Earnings Survey (earn_ses, ISCO); BLS OEWS by metro area; national wage statistics |
| `wage_software` | Hourly pay, software developers | per hour | NUTS2 / metro area | 4 | FDI KEAR SITE CWMR | US | Eurostat Structure of Earnings Survey (earn_ses, ISCO); BLS OEWS by metro area; national wage statistics |
| `wage_engineering` | Hourly pay, engineers | per hour | NUTS2 / metro area | 7 | FDI KEAR SITE CWMR | US | Eurostat Structure of Earnings Survey (earn_ses, ISCO); BLS OEWS by metro area; national wage statistics |
| `wage_office` | Hourly pay, office and customer service staff | per hour | NUTS2 / metro area | 4 | FDI KEAR SITE CWMR | US | Eurostat Structure of Earnings Survey (earn_ses, ISCO); BLS OEWS by metro area; national wage statistics |
| `wage_science` | Hourly pay, scientists and lab technicians | per hour | NUTS2 / metro area | 2 | FDI KEAR SITE CWMR | US | Eurostat Structure of Earnings Survey (earn_ses, ISCO); BLS OEWS by metro area; national wage statistics |
| `wage_hospitality` | Hourly pay, food service and hotel staff | per hour | NUTS2 / metro area | 3 | FDI KEAR SITE CWMR | US | Eurostat Structure of Earnings Survey (earn_ses, ISCO); BLS OEWS by metro area; national wage statistics |
| `wage_sales` | Hourly pay, retail sales staff | per hour | NUTS2 / metro area | 1 | FDI KEAR SITE CWMR | US | Eurostat Structure of Earnings Survey (earn_ses, ISCO); BLS OEWS by metro area; national wage statistics |
| `wage_drivers` | Hourly pay, truck drivers | per hour | NUTS2 / metro area | 3 | FDI KEAR SITE CWMR | — | Eurostat Structure of Earnings Survey (earn_ses, ISCO); BLS OEWS by metro area; national wage statistics |
| `wage_finance` | Hourly pay, finance and accounting staff | per hour | NUTS2 / metro area | 2 | FDI KEAR SITE CWMR | US | Eurostat Structure of Earnings Survey (earn_ses, ISCO); BLS OEWS by metro area; national wage statistics |
| `wage_health` | Hourly pay, nurses and medical assistants | per hour | NUTS2 / metro area | 1 | FDI KEAR SITE CWMR | US | Eurostat Structure of Earnings Survey (earn_ses, ISCO); BLS OEWS by metro area; national wage statistics |
| `wage_managers` | Hourly pay, managers | per hour | NUTS2 / metro area | 1 | FDI KEAR SITE CWMR | — | Eurostat Structure of Earnings Survey (earn_ses, ISCO); BLS OEWS by metro area; national wage statistics |
| `minimum_wage` | Statutory minimum wage | per hour / month | country / state | 10 | FDI | — | Eurostat earn_mw_cur; US DOL state minimum wages |
| `employer_social` | Employer social security contributions | % of gross pay | country | 20 | FDI KEAR | NO | OECD Taxing Wages; national rules |
| `labour_force_60min` | Labour force within 60 minutes by road | people aged 20-64 | place | 13 | SITE FDI | 45 countries | computed from population grids (GEOSTAT 1 km², GHSL) and road travel times |
| `graduates_stem` | STEM graduates a year within the region | graduates | NUTS2 | 8 | FDI KEAR IMD RIS | SI | Eurostat educ_uoe_grad02 (field of education); national university statistics |
| `vocational` | Vocational and apprenticeship graduates | per 1,000 aged 15-24 | NUTS2 / country | 6 | IMD | — | Eurostat educ_uoe_enrs; national VET statistics |
| `unemployment_youth` | Youth unemployment | % | NUTS2 | 3 | FDI | — | Eurostat lfst_r_lfu3rt (15-24) |
| `labour_tightness` | Job vacancy rate | % | country / NUTS2 | 20 | CWMR | — | Eurostat jvs_q_nace2 |
| `productivity` | Gross value added per worker | EUR per worker | NUTS3 | 11 | IMD FDI | — | Eurostat nama_10r_3gva and nama_10r_3empers |
| `languages` | Workers speaking two or more foreign languages | % | country | 3 | KEAR | — | Eurostat edu_aes_l22 |
| `days_lost_strikes` | Working days lost to strikes per 1,000 employees | days | country | 7 | CWMR IMD | — | ILOSTAT; national statistics |
| `union_density` | Trade union density | % of employees | country | 8 | KEAR IMD | — | OECD/AIAS ICTWSS |

## Business sites: Market and demand

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `market_2h` | Population within 2 hours by road | people | place | 4 | SITE FDI | — | computed from population grids and road network (GEOSTAT, OSM) |
| `gdp_pps` | Economic output per resident (PPS) | PPS per resident | NUTS3 | 20 | IMD FDI OECD | 31 countries | Eurostat nama_10r_3gdp |
| `purchasing_power` | Household purchasing power per resident | per resident | municipality / NUTS3 | 3 | SITE | 27 countries | Eurostat nama_10r_2hhinc (PPS); national disposable income per municipality |
| `retail_density` | Retail outlets per 1,000 residents | per 1,000 | municipality | 2 | SITE | — | national business registers (NACE 47); OpenStreetMap |
| `overnight_stays` | Tourist overnight stays | nights a year | municipality / NUTS3 | 3 | SITE | — | Eurostat tour_occ_nin3; national tourism statistics per municipality |
| `bed_occupancy` | Bed occupancy in hotels | % | NUTS2 / municipality | 1 | SITE | IS | Eurostat tour_occ_anor2; national statistics |
| `business_births` | New firms per 100 active firms | per 100 | NUTS3 | 3 | RIS EYEA | UK | Eurostat bd_hgnace2_r3 (business demography by NUTS3) |
| `firm_survival` | Firms still active after 3 years | % | NUTS3 | 7 | RIS | — | Eurostat bd_hgnace2_r3 |
| `time_to_market` | Share of the national market reachable within a day by truck | % of population | place | 3 | SITE | — | computed from population grids and road travel times (EU rules on driving time) |

## Business sites: Operating costs

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `elec_industrial` | Industrial electricity price (by consumption band) | EUR or USD per kWh | country / state / utility | 7 | CWMR CWDC FDI SITE | 32 countries | Eurostat nrg_pc_205 (bands ID-IF, excl. VAT and recoverable taxes); EIA by state |
| `elec_commercial` | Commercial electricity price | EUR or USD per kWh | country / state | 13 | FDI | US | Eurostat nrg_pc_205 (bands IB-IC); EIA by state |
| `gas_industrial` | Industrial natural gas price | per MWh or Mcf | country / state | 5 | CWMR FDI | US | Eurostat nrg_pc_203 (bands I3-I5); EIA |
| `water_industrial` | Industrial water tariff | per m³ | utility / municipality | 4 | SITE CWDC | — | utility tariff sheets; national water regulators |
| `industrial_land` | Industrial land price | per m² | municipality / NUTS3 | 9 | FDI SITE CWMR | — | land-value registers (Bodenrichtwerte via BORIS, DVF, Kadaster) |
| `warehouse_rent` | Warehouse and logistics rent | per m² a year | region | 3 | SITE FDI | — | official or openly licensed rent statistics only |
| `office_rent` | Office rent | per m² a year | city | 9 | FDI KEAR | — | official or open rent statistics (municipal surveys) |
| `retail_rent` | Retail rent in the main street | per m² a year | city | 2 | SITE | — | official or open rent statistics |
| `construction_cost` | Construction cost index | index | country / region | 8 | CWMR SITE | — | Eurostat sts_copi_a; national building cost indices |
| `diesel_price` | Diesel price | per litre | country | 3 | SITE | — | EU Weekly Oil Bulletin; EIA |
| `investment_price` | Price level of investment goods | index EU27 = 100 | country | 5 | IMD | 26 countries | Eurostat prc_ppp_ind (GFCF) |
| `available_sites` | Serviced industrial sites available | hectares | municipality / region | 8 | SITE FDI | — | regional investment-promotion site databases with open terms; municipal land registers |
| `expat_cost` | Cost of a furnished 2-room flat for assignees | per month | city | 3 | MERCER KEAR | — | official rent statistics for furnished/new leases only |

## Business sites: Regulation and risk

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `permits_time` | Time to obtain a building permit | days | country / city | 8 | BREADY CWMR SITE | 31 countries | World Bank B-READY (business location) |
| `business_entry` | Business entry (Business Ready) | score 0-100 | country | 7 | BREADY | 31 countries | World Bank B-READY |
| `rule_of_law` | Rule of law and regulatory quality | index | country | 20 | IMD FDI CWMR | — | World Bank Worldwide Governance Indicators (CC BY 4.0) |
| `fdi_restrictiveness` | FDI regulatory restrictiveness | index 0-1 | country | 11 | FDI EYEA | — | OECD FDI Regulatory Restrictiveness Index |
| `labour_regulation` | Employment protection strictness | index | country | 20 | IMD KEAR | — | OECD Employment Protection Legislation indicators |
| `corruption` | Control of corruption | index | country | 20 | IMD FDI | — | World Bank WGI control of corruption (CC BY 4.0) |

## Business sites: Tax and incentives

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `corporate_tax` | Corporate income tax rate (combined) | % | country / state | 20 | FDI IMD KEAR EYEA | — | OECD Corporate Tax Statistics; state statutes |
| `business_tax_local` | Local business tax rate or multiplier | % or multiplier | municipality | 20 | FDI SITE | DE | Gewerbesteuer-Hebesatz (Destatis), CFE (DGFiP REI), IRAP (regions), Swiss cantonal and communal profit tax (ESTV) |
| `eatr` | Effective average tax rate on a standard investment | % | country | 11 | FDI EYEA | — | OECD Corporate Effective Tax Rates; ZEW |
| `rnd_incentive` | R&D tax incentive generosity (implied subsidy rate) | share of R&D cost | country | 4 | FDI RIS | — | OECD R&D tax incentive database (B-index) |
| `regional_aid` | Maximum state aid intensity for investment | % of eligible cost | NUTS3 | 8 | FDI SITE | — | EU regional aid maps 2022-2027 (Commission decisions per member state) |
| `payroll_tax` | Payroll and wage-sum taxes | % of payroll | country / state | 6 | KEAR | — | OECD Taxing Wages; state payroll taxes (AU) |
| `tax_admin` | Tax administration (Business Ready) | score 0-100 | country | 20 | BREADY | 31 countries | World Bank B-READY |
| `special_zones` | Special economic or free-trade zone within 30 km | yes / no | place | 7 | FDI | — | national lists of free zones (EU customs free zones list, US FTZ Board) |

## Households: Amenities and lifestyle

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `restaurants` | Restaurants and cafés per 1,000 residents | per 1,000 | place | 4 | MERCER EIU NICHE | UK | OpenStreetMap; national business registers (NACE 56) |
| `culture` | Cinemas, theatres and museums within 10 km | count | place | 3 | EIU MERCER EUQOL | — | Eurostat cult; national museum statistics; OpenStreetMap |
| `sports` | Sports facilities and pools within 5 km | count | place | 5 | MERCER NICHE | UK, US | OpenStreetMap; national facility registers |
| `shops_daily` | Supermarkets within walking distance | count within 1.5 km | place | 5 | EUQOL | NL, UK | OpenStreetMap |
| `nightlife` | Bars and clubs per 1,000 residents | per 1,000 | place | 3 | NICHE | — | OpenStreetMap; NACE 56.3 establishments |
| `english` | English proficiency | index | country / region | 7 | KEAR FDI | — | Eurostat AES/LFS language module (country) |
| `satisfaction` | Residents satisfied with living in their city | % | city | 28 | EUQOL OECD | IE, UK | Eurostat urb_percep (Quality of Life in European Cities survey); ONS wellbeing |
| `tourism_pressure` | Tourist overnight stays per resident | nights per resident | municipality / NUTS3 | 3 | SPI | 34 countries | Eurostat tour_occ_nin3; national tourism statistics |

## Households: Climate and nature

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `sunshine` | Sunshine hours a year | hours | station / grid | 9 | MERCER | IE | national weather services climate normals (1991-2020) |
| `temp_july` | Average July daily maximum | °C | station / grid | 9 | MERCER | IE | climate normals; Copernicus E-OBS |
| `temp_january` | Average January daily minimum | °C | station / grid | 9 | MERCER | IE | same |
| `rain_days` | Days with rain a year | days | station / grid | 9 | MERCER | 15 countries | climate normals |
| `green_share` | Green and open land in the municipality | % | municipality | 9 | OECD EUQOL | CH | Copernicus CORINE / Urban Atlas |
| `park_access` | Residents within 300 m of a green area | % | city / municipality | 8 | EUQOL SPI | — | EEA / JRC urban green accessibility; Urban Atlas |
| `coast_lake` | Distance to the sea or a large lake | km | place | 3 | MERCER | 45 countries | Natural Earth; national hydrography |
| `altitude` | Altitude and terrain | m | place | 5 | — | — | Copernicus DEM |
| `heating_degree_days` | Heating degree days | degree days a year | NUTS3 | 14 | MERCER | — | Eurostat nrg_chdd_a; NOAA |

## Households: Community and outlook

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `pop_growth` | Population change over 5 years | % | municipality | 28 | PROG USN GEMR | 35 countries | population registers |
| `migration_balance` | Net migration per 1,000 residents | per 1,000 | municipality | 28 | PROG | 34 countries | population registers |
| `median_age` | Median age | years | municipality | 12 | NICHE | 34 countries | population registers |
| `municipal_debt` | Municipal debt per resident | per resident | municipality | 8 | GEMR PROG | JP | municipal finance statistics (Destatis Schulden, EFV, DGCL) |
| `fiscal_strength` | Municipal tax revenue per resident | per resident | municipality | 4 | GEMR | JP | municipal finance statistics |
| `poverty` | Residents at risk of poverty | % | municipality / NUTS2 | 28 | OECD SPI | 33 countries | Eurostat ilc_li41; national (Filosofi, ADI) |
| `voter_turnout` | Turnout at the last local election | % | municipality | 1 | OECD SPI | — | national election authorities |

## Households: Family and education

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `childcare_places` | Childcare places per 100 children under 3 | per 100 | municipality | 4 | OECD SPI PROG | — | Destatis Kindertagesbetreuung, DREES, SCB, national registers |
| `preschool_coverage` | Children 3 to 5 in early education | % | municipality / NUTS2 | 4 | OECD | IS | Eurostat educ_uoe_enra21; national |
| `schools_primary` | Primary schools within reach | count within 2 km | place | 4 | NICHE USN | NL, UK | national school registers; OpenStreetMap as fallback (ODbL) |
| `school_results` | School results | national test score / grade | school district / municipality | 4 | NICHE USN | IL, UK, US | national assessments where published per school or municipality (e.g. UK KS2, NL CITO/eindtoets, SE grundskola betyg) |
| `pupils_per_teacher` | Pupils per teacher | ratio | municipality / NUTS2 | 4 | NICHE | — | national education statistics |
| `international_schools` | International schools within 30 km | count | place | 9 | MERCER FDI | — | ISC / national registers of international schools; OpenStreetMap |
| `tertiary_share` | Adults with a university degree | % | municipality / NUTS2 | 12 | OECD PROG SPI | 36 countries | census; Eurostat edat_lfse_04 |
| `youth_share` | Children and teenagers in the population | % | municipality | 4 | PROG | AT, CH | population registers |
| `birth_rate` | Births per 1,000 residents | per 1,000 | municipality | 4 | PROG | CH, SE | population registers |
| `child_poverty` | Children in low-income households | % | municipality / county | 4 | SPI USN | UK, US | national statistics (DWP CiLIF, US Census SAIPE) |
| `secondary_school` | Distance to the nearest upper-secondary school | km | place | 4 | NICHE | — | national school registers; OpenStreetMap |

## Households: Health and care

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `gps` | General practitioners per 10,000 residents | per 10,000 | municipality / district | 28 | OECD EIU MERCER NICHE | 33 countries | KBV Arztatlas, DREES, NHS Digital, national registers; Eurostat hlth_rs_physreg (NUTS2) |
| `hospital_distance` | Distance to a hospital with an emergency department | km | place | 8 | EIU MERCER | 24 countries | national hospital registers; OpenStreetMap |
| `hospital_beds` | Hospital beds per 1,000 residents | per 1,000 | NUTS2 | 4 | EIU | — | Eurostat hlth_rs_bdsrg2 |
| `specialists` | Specialist doctors per 10,000 residents | per 10,000 | district | 4 | EIU | US | national physician registers |
| `pharmacies` | Pharmacies within 2 km | count | place | 4 | NICHE | — | national pharmacy registers; OpenStreetMap |
| `elderly_care` | Nursing home places per 1,000 residents aged 75+ | per 1,000 | municipality / district | 4 | GEMR | IS | national care statistics (Pflegestatistik, DREES, SCB) |
| `life_expectancy` | Life expectancy at birth | years | municipality / NUTS2 | 4 | OECD SPI | 36 countries | Eurostat demo_r_mlifexp; national life tables |
| `avoidable_mortality` | Avoidable deaths per 100,000 | per 100,000 | NUTS2 | 4 | OECD SPI | — | Eurostat hlth_cd_apr |
| `insurance_cover` | Residents without health insurance | % | county (US) | 28 | USN | US | US Census SAHIE |

## Households: Housing

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `rent_new_lease_m2` | Rent for a new lease per m² | per m² a month | municipality / postcode | 28 | MERCER EUQOL USN NICHE GEMR | 11 countries | national rent indices and rent registers (e.g. Destatis/BBSR Mietspiegel data, INSEE/OLL, CBS, SCB, SSB, ONS PIPR) |
| `rent_existing_m2` | Rent of existing tenancies per m² | per m² a month | municipality | 28 | EUQOL | FI | SCB, SSB, CBS, Statistik Austria Mikrozensus |
| `rent_3room_total` | Typical rent of a 3-room flat | per month | municipality | 12 | MERCER NICHE | ES | national rent statistics with dwelling size bands |
| `price_flat_m2` | Purchase price of a flat per m² | per m² | municipality | 8 | USN NICHE GEMR PROG | BE, ES, IT, PL, PT | notary/land-registry price statistics (DVF, Kadaster, Gutachterausschüsse, Statistik Austria, INE, ISTAT OMI) |
| `price_house` | Purchase price of a house | per dwelling | municipality | 8 | USN NICHE | BE, CA, ES, IT, SE, UK, US | same as above; US Census ACS median home value |
| `price_to_income` | House price to income ratio | years of income | municipality | 8 | USN OECD | UK | computed from price and income at the same level |
| `rent_to_income` | Rent as a share of income | % | municipality | 8 | OECD SPI | — | computed from rent and disposable income |
| `housing_overburden` | Households paying over 40% of income for housing | % | NUTS2 / country | 6 | OECD SPI | — | Eurostat ilc_lvho07a (by degree of urbanisation) |
| `vacancy_rate` | Vacant dwellings | % | municipality | 6 | GEMR | CH | Swiss FSO Leerwohnungszählung; census vacancy data |
| `new_dwellings` | New dwellings completed per 1,000 residents | per 1,000 | municipality | 8 | PROG GEMR | CH | building completion statistics |
| `social_housing` | Social or public housing share | % of dwellings | municipality | 3 | SPI | IS | census housing tenure; national social housing registers (RPLS, BBSR) |
| `property_tax` | Property tax rate or multiplier | % or multiplier | municipality | 8 | GEMR | DE, FR, UK | Grundsteuer-Hebesatz (Destatis), taxe foncière rates (DGFiP REI), IMU (MEF), council tax bands (UK) |
| `transfer_tax` | Property transfer tax and fees | % of price | state / country | 3 | MERCER | — | state law tables (Grunderwerbsteuer by Land), national tax authorities |
| `energy_rating` | Dwellings with a good energy rating (A-C) | % | municipality / NUTS3 | 8 | — | — | national EPC registers (ADEME DPE open data, EPC register England and Wales) |
| `mortgage_rate` | Mortgage interest rate for new loans | % a year | country | 4 | USN | AU | ECB MFI interest rate statistics; national central banks; Freddie Mac PMMS |

## Households: Income and cost of living

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `disposable_income` | Median disposable household income | per year | municipality | 28 | OECD USN NICHE PROG | BE, CH, ES, FR, NL, NO, SE, US | national tax and income statistics (INSEE Filosofi, Statbel, SCB, SSB, ONS GDHI, US Census ACS) |
| `price_level` | Consumer price level | index EU27 = 100 | country / region | 28 | MERCER EIU | 37 countries | Eurostat prc_ppp_ind; OECD PPP |
| `local_income_tax` | Local income tax rate or multiplier | % or multiplier | municipality | 15 | GEMR MERCER | BE, DK, SE | Swiss ESTV Steuerfüsse, Finnish municipal tax rates, Swedish kommunalskatt (SCB), Norwegian, Danish kommuneskat, US state income tax |
| `tax_scenarios` | Income tax for typical households | per year | municipality | 18 | GEMR | CH | national tax calculators applied to fixed scenarios |
| `wealth_tax` | Wealth tax | per year on a fixed wealth | municipality / country | 4 | GEMR | CH | ESTV; national rules (NO, ES) |
| `electricity_household` | Household electricity price | per kWh incl. taxes | country / region / utility | 28 | MERCER | BE, BG, DE, DK, HU, IE, MT, US | Eurostat nrg_pc_204; national regulators (ElCom per municipality in CH) |
| `gas_household` | Household gas price | per kWh incl. taxes | country | 28 | MERCER | US | Eurostat nrg_pc_202 |
| `transit_pass` | Monthly public transport pass | per month | city / network | 14 | MERCER EIU | — | operators and transport authorities (tariff pages) |
| `childcare_cost` | Childcare fee for a full-time place | per month | municipality | 4 | OECD | — | municipal fee schedules; OECD Tax-Benefit childcare module (national) |
| `unemployment` | Unemployment rate | % | municipality / NUTS3 | 16 | OECD USN PROG SPI | 37 countries | national employment agencies; Eurostat lfst_r_lfu3rt |
| `employment_rate` | Employment rate (20-64) | % | NUTS2 / municipality | 12 | OECD SPI | FI, SI | Eurostat lfst_r_lfe2emprt; national registers |
| `job_growth` | Change in jobs at workplace, 5 years | % | municipality / county | 9 | USN PROG | CH | national employment statistics by workplace (BA Beschäftigte am Arbeitsort, URSSAF, QCEW) |
| `vacancies` | Open job vacancies per 1,000 workers | per 1,000 | NUTS2 / labour market region | 8 | PROG | — | Eurostat jvs_q_nace2; national employment agencies |
| `church_tax` | Church tax or local surcharges | % of income tax | municipality | 11 | GEMR | DK | Finnish Vero municipal and church tax rates; German Kirchensteuer by Land; Swiss cantonal rates |

## Households: Mobility and connectivity

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `rail_station` | Distance to the nearest railway station | km | place | 9 | EIU MERCER EUQOL | 12 countries | national rail station lists; OpenStreetMap |
| `pt_travel_time` | Travel time by public transport to the nearest big city | minutes | place | 8 | OECD EUQOL | — | GTFS timetables (transit.land, national open data portals), computed |
| `train_frequency` | Departures per day from the nearest station | trains a day | station | 2 | EUQOL | — | GTFS timetables |
| `commute_time` | Average commute time | minutes | municipality / county | 12 | USN NICHE | IE, US | census commuting statistics; US ACS |
| `airport` | Distance to a hub airport and its destinations | km, destinations | place | 9 | MERCER FDI EIU | 45 countries | OurAirports; Eurostat avia_par (passenger routes) |
| `cycling` | Cycle paths per km² or share of commuting by bike | km/km² or % | municipality | 3 | EUQOL | — | OpenStreetMap; census mode share |
| `ev_chargers` | Public EV charging points per 10,000 residents | per 10,000 | municipality | 28 | — | UK | national charge point registers (Bundesnetzagentur, IRVE, NCR) |
| `gigabit_home` | Homes with gigabit broadband | % | municipality | 9 | SPI EIU | UK, US | national broadband atlases; EU Broadband Coverage Study (NUTS3); FCC map |
| `mobile_5g` | 5G coverage | % of area or households | municipality | 2 | — | UK | national regulators (Bundesnetzagentur, Arcep, Ofcom) |
| `barrier_free` | Step-free railway stations nearby | share of stations | region / network | 5 | EUQOL | — | rail operators open data (DB station data, SNCF accessibility) |

## Households: Safety and hazards

| KPI id | Measure | Unit | Level wanted | Profiles | Comparable analyses | Already in Nestlyzer for | Sources |
|---|---|---|---|---|---|---|---|
| `crime_total` | Recorded crimes per 1,000 residents | per 1,000 | municipality | 28 | EIU MERCER NICHE USN EUQOL | DK, ES, FR, JP, NO, SE, US | police statistics (PKS Kreise, SSMSI communes, BRÅ, ONS CSP, FBI UCR) |
| `violent_crime` | Violent crimes per 1,000 residents | per 1,000 | municipality / district | 28 | EIU NICHE USN | 27 countries | same |
| `burglary` | Residential burglaries per 1,000 households | per 1,000 | municipality / district | 11 | NICHE | 24 countries | same |
| `road_deaths` | Road deaths per 100,000 residents | per 100,000 | NUTS3 / county | 4 | SPI | 35 countries | Eurostat tran_r_acci; national road safety statistics |
| `flood_risk` | Share of the municipality in flood hazard zones | % | municipality | 48 | MERCER CWMR | — | national flood hazard maps (EU Floods Directive), FEMA NFHL |
| `heat_days` | Days above 30 °C a year (and projection for 2050) | days | grid / municipality | 13 | EIU | — | Copernicus CDS (E-OBS, CORDEX), national weather services |
| `air_pm25` | Fine particulate matter PM2.5 | µg/m³ | grid / municipality | 28 | OECD EIU SPI | US | EEA air quality interpolated maps; Copernicus CAMS |
| `air_no2` | Nitrogen dioxide NO₂ | µg/m³ | grid / municipality | 28 | EIU | — | EEA interpolated maps |
| `noise` | Residents exposed to road noise above 55 dB | % | agglomeration / municipality | 13 | EUQOL | — | EEA noise data (END reporting) |
| `radon` | Radon priority area | yes / no / % | municipality | 4 | — | — | national radon maps (BAG, BfS, UKHSA) |
| `earthquake` | Seismic hazard (peak ground acceleration) | g | grid | 48 | MERCER CWMR | — | ESHM20 (EFEHR), USGS |
| `wildfire` | Wildfire danger days | days | grid | 5 | — | — | Copernicus EFFIS |

