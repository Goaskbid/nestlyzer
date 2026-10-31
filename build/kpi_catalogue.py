#!/usr/bin/env python3
"""Nestlyzer KPI framework (2.10.1): what households and businesses actually compare when they choose a place, drawn from
the dimensions used by established comparable analyses. Each KPI says what it measures, its unit, the most local level
worth collecting, which profiles need it, which comparable analyses use the same dimension, the official open sources to
collect it from, and how to recognise figures already in the build ('match': regex on factor id or context indicator id,
plus the occupation for pay records).

Comparable analyses referred to (dimension lists only; no data is taken from them):
  OECD   OECD Regional Well-Being and Better Life Index        EIU    EIU Global Liveability Index
  MERCER Mercer Quality of Living                               EUQOL  Eurostat Quality of Life in European Cities survey
  SPI    EU Regional Social Progress Index                      GEMR   Swiss municipality ratings (Bilanz / Weltwoche style)
  PROG   Prognos Zukunftsatlas (Germany)                        USN    US News Best Places to Live
  NICHE  Niche.com place grades                                 FDI    fDi Benchmark / fDi Intelligence location comparison
  SITE   Site Selection magazine and corporate site-selection practice
  KEAR   Kearney Global Services Location Index                 CWMR   Cushman & Wakefield Manufacturing Risk Index
  CWDC   Cushman & Wakefield Data Center Market Comparison      IMD    IMD World Competitiveness Yearbook
  BREADY World Bank Business Ready                              RIS    EU Regional Innovation Scoreboard
  EYEA   EY European Attractiveness Survey
    python3 build/kpi_catalogue.py   (prints counts; imported by build_business_profiles.py)"""

H, B = 'household', 'business'
# profile groups (keys of household and business profiles)
FAM = ['young_family', 'low_income_family', 'single_parent', 'first_home']
OLD = ['pensioner', 'single_pensioner', 'early_retiree', 'healthcare_first']
WORK = ['single', 'young_professional', 'dinks', 'commuter', 'expat_professional', 'urban', 'digital_native', 'car_free']
BUDGET = ['low_income', 'low_income_family', 'budget', 'rural_value', 'student', 'first_home']
AREA = ['nature', 'rural_value', 'climate', 'coastal', 'remote']
RICH = ['hnw', 'swiss_lottery', 'early_retiree', 'expat_professional']
ALLH = sorted(set(FAM + OLD + WORK + BUDGET + AREA + RICH + ['self_fit', 'business_owner']))
IND = ['biz_manufacturing', 'biz_energy_intensive', 'biz_port_industry', 'biz_food_processing', 'biz_pharma_production']
LOG = ['biz_logistics', 'biz_fulfilment']
OFF = ['biz_tech', 'biz_services', 'biz_lab', 'biz_hq', 'biz_contact_center', 'biz_datacenter']
SMALL = ['biz_shop', 'biz_cafe', 'biz_workshop', 'biz_practice', 'biz_studio', 'biz_startup', 'biz_guesthouse']
ALLB = IND + LOG + OFF + SMALL

K = {}
def kpi(id, name, unit, level, aud, profiles, used_by, sources, match=None, domain=''):
    K[id] = {'name': name, 'unit': unit, 'level': level, 'audience': aud, 'profiles': sorted(set(profiles)), 'used_by': used_by, 'sources': sources, 'match': match or ('^' + id), 'domain': domain}

# ---------------------------------------------------------------- households: housing
d = 'Housing'
kpi('rent_new_lease_m2', 'Rent for a new lease per m²', 'per m² a month', 'municipality / postcode', H, ALLH, 'MERCER EUQOL USN NICHE GEMR', 'national rent indices and rent registers (e.g. Destatis/BBSR Mietspiegel data, INSEE/OLL, CBS, SCB, SSB, ONS PIPR)', r'rent_new|rent_flat_m2|rent_mean|n_rent', d)
kpi('rent_existing_m2', 'Rent of existing tenancies per m²', 'per m² a month', 'municipality', H, ALLH, 'EUQOL', 'SCB, SSB, CBS, Statistik Austria Mikrozensus', r'rent_after_adjustment|rent_non_subsidised|existing', d)
kpi('rent_3room_total', 'Typical rent of a 3-room flat', 'per month', 'municipality', H, FAM + WORK, 'MERCER NICHE', 'national rent statistics with dwelling size bands', r'dwelling_rent|rent_paid', d)
kpi('price_flat_m2', 'Purchase price of a flat per m²', 'per m²', 'municipality', H, FAM + RICH + ['first_home'], 'USN NICHE GEMR PROG', 'notary/land-registry price statistics (DVF, Kadaster, Gutachterausschüsse, Statistik Austria, INE, ISTAT OMI)', r'flat_price|price_m2|home_price_m2', d)
kpi('price_house', 'Purchase price of a house', 'per dwelling', 'municipality', H, FAM + RICH + ['first_home'], 'USN NICHE', 'same as above; US Census ACS median home value', r'house_price|home_price|home_value', d)
kpi('price_to_income', 'House price to income ratio', 'years of income', 'municipality', H, FAM + BUDGET, 'USN OECD', 'computed from price and income at the same level', r'price_to_earnings|price_to_income', d)
kpi('rent_to_income', 'Rent as a share of income', '%', 'municipality', H, BUDGET + FAM, 'OECD SPI', 'computed from rent and disposable income', r'rent_to_income|overburden', d)
kpi('housing_overburden', 'Households paying over 40% of income for housing', '%', 'NUTS2 / country', H, BUDGET, 'OECD SPI', 'Eurostat ilc_lvho07a (by degree of urbanisation)', r'overburden', d)
kpi('vacancy_rate', 'Vacant dwellings', '%', 'municipality', H, BUDGET + ['first_home'], 'GEMR', 'Swiss FSO Leerwohnungszählung; census vacancy data', r'vacancy', d)
kpi('new_dwellings', 'New dwellings completed per 1,000 residents', 'per 1,000', 'municipality', H, BUDGET + FAM, 'PROG GEMR', 'building completion statistics', r'new_housing|completions', d)
kpi('social_housing', 'Social or public housing share', '% of dwellings', 'municipality', H, ['low_income', 'low_income_family', 'single_parent'], 'SPI', 'census housing tenure; national social housing registers (RPLS, BBSR)', r'social_housing|public_housing', d)
kpi('property_tax', 'Property tax rate or multiplier', '% or multiplier', 'municipality', H, FAM + RICH + ['first_home'], 'GEMR', 'Grundsteuer-Hebesatz (Destatis), taxe foncière rates (DGFiP REI), IMU (MEF), council tax bands (UK)', r'grundsteuer|property_tax|council_tax|imu|taxe_fonciere', d)
kpi('transfer_tax', 'Property transfer tax and fees', '% of price', 'state / country', H, ['first_home', 'hnw', 'expat_professional'], 'MERCER', 'state law tables (Grunderwerbsteuer by Land), national tax authorities', r'transfer_tax|stamp_duty', d)
# ---------------------------------------------------------------- households: income, taxes, cost of living
d = 'Income and cost of living'
kpi('disposable_income', 'Median disposable household income', 'per year', 'municipality', H, ALLH, 'OECD USN NICHE PROG', 'national tax and income statistics (INSEE Filosofi, Statbel, SCB, SSB, ONS GDHI, US Census ACS)', r'income_median|disposable|income_net|income_std|after_tax|taxable_income', d)
kpi('price_level', 'Consumer price level', 'index EU27 = 100', 'country / region', H, ALLH, 'MERCER EIU', 'Eurostat prc_ppp_ind; OECD PPP', r'^n_price_level|consumer_price_level', d)
kpi('local_income_tax', 'Local income tax rate or multiplier', '% or multiplier', 'municipality', H, RICH + WORK + FAM, 'GEMR MERCER', 'Swiss ESTV Steuerfüsse, Finnish municipal tax rates, Swedish kommunalskatt (SCB), Norwegian, Danish kommuneskat, US state income tax', r'municipal_income_tax|kommunalskatt|tax_rate_municipal|steuerfuss|municipal_tax_rate', d)
kpi('tax_scenarios', 'Income tax for typical households', 'per year', 'municipality', H, RICH + WORK + FAM + OLD, 'GEMR', 'national tax calculators applied to fixed scenarios', r'single_income_tax|family_income_tax|retiree_tax|wealth_tax', d)
kpi('wealth_tax', 'Wealth tax', 'per year on a fixed wealth', 'municipality / country', H, RICH, 'GEMR', 'ESTV; national rules (NO, ES)', r'wealth_tax', d)
kpi('electricity_household', 'Household electricity price', 'per kWh incl. taxes', 'country / region / utility', H, ALLH, 'MERCER', 'Eurostat nrg_pc_204; national regulators (ElCom per municipality in CH)', r'electricity_household|power_residential|retail_res', d)
kpi('gas_household', 'Household gas price', 'per kWh incl. taxes', 'country', H, ALLH, 'MERCER', 'Eurostat nrg_pc_202', r'gas_price_residential|gas_household', d)
kpi('transit_pass', 'Monthly public transport pass', 'per month', 'city / network', H, WORK + BUDGET + ['car_free', 'student'], 'MERCER EIU', 'operators and transport authorities (tariff pages)', r'transit_pass|monthly_ticket', d)
kpi('childcare_cost', 'Childcare fee for a full-time place', 'per month', 'municipality', H, FAM, 'OECD', 'municipal fee schedules; OECD Tax-Benefit childcare module (national)', r'childcare_cost|kita_fee', d)
kpi('unemployment', 'Unemployment rate', '%', 'municipality / NUTS3', H, WORK + BUDGET + FAM, 'OECD USN PROG SPI', 'national employment agencies; Eurostat lfst_r_lfu3rt', r'unemploy|claimant', d)
kpi('employment_rate', 'Employment rate (20-64)', '%', 'NUTS2 / municipality', H, WORK + FAM, 'OECD SPI', 'Eurostat lfst_r_lfe2emprt; national registers', r'(^|_)employment_rate', d)
kpi('job_growth', 'Change in jobs at workplace, 5 years', '%', 'municipality / county', H, WORK + ['business_owner'], 'USN PROG', 'national employment statistics by workplace (BA Beschäftigte am Arbeitsort, URSSAF, QCEW)', r'job_growth|employment_change|jobs_per_1000', d)
kpi('vacancies', 'Open job vacancies per 1,000 workers', 'per 1,000', 'NUTS2 / labour market region', H, WORK, 'PROG', 'Eurostat jvs_q_nace2; national employment agencies', r'vacanc(y|ies)_job|job_vacanc', d)
# ---------------------------------------------------------------- households: family and education
d = 'Family and education'
kpi('childcare_places', 'Childcare places per 100 children under 3', 'per 100', 'municipality', H, FAM, 'OECD SPI PROG', 'Destatis Kindertagesbetreuung, DREES, SCB, national registers', r'^n_childcare|childcare_places|kindergarten_places|kita_places', d)
kpi('preschool_coverage', 'Children 3 to 5 in early education', '%', 'municipality / NUTS2', H, FAM, 'OECD', 'Eurostat educ_uoe_enra21; national', r'preschool|early_education', d)
kpi('schools_primary', 'Primary schools within reach', 'count within 2 km', 'place', H, FAM, 'NICHE USN', 'national school registers; OpenStreetMap as fallback (ODbL)', r'primary_std|schools_primary|n_school', d)
kpi('school_results', 'School results', 'national test score / grade', 'school district / municipality', H, FAM, 'NICHE USN', 'national assessments where published per school or municipality (e.g. UK KS2, NL CITO/eindtoets, SE grundskola betyg)', r'level3|primary_std|high_school|bagrut|test_score|school_result', d)
kpi('pupils_per_teacher', 'Pupils per teacher', 'ratio', 'municipality / NUTS2', H, FAM, 'NICHE', 'national education statistics', r'pupils_per_teacher', d)
kpi('international_schools', 'International schools within 30 km', 'count', 'place', H, ['expat_professional', 'hnw', 'young_family'] + OFF, 'MERCER FDI', 'ISC / national registers of international schools; OpenStreetMap', r'international_school', d)
kpi('tertiary_share', 'Adults with a university degree', '%', 'municipality / NUTS2', H, WORK + FAM, 'OECD PROG SPI', 'census; Eurostat edat_lfse_04', r'tertiary|degree', d)
kpi('youth_share', 'Children and teenagers in the population', '%', 'municipality', H, FAM, 'PROG', 'population registers', r'youth_share', d)
kpi('birth_rate', 'Births per 1,000 residents', 'per 1,000', 'municipality', H, FAM, 'PROG', 'population registers', r'birth_rate_per|n_births|live_births', d)
kpi('child_poverty', 'Children in low-income households', '%', 'municipality / county', H, FAM, 'SPI USN', 'national statistics (DWP CiLIF, US Census SAIPE)', r'child_poverty', d)
# ---------------------------------------------------------------- households: health and care
d = 'Health and care'
kpi('gps', 'General practitioners per 10,000 residents', 'per 10,000', 'municipality / district', H, ALLH, 'OECD EIU MERCER NICHE', 'KBV Arztatlas, DREES, NHS Digital, national registers; Eurostat hlth_rs_physreg (NUTS2)', r'doctors|gps|physician', d)
kpi('hospital_distance', 'Distance to a hospital with an emergency department', 'km', 'place', H, OLD + FAM, 'EIU MERCER', 'national hospital registers; OpenStreetMap', r'hospital_km|n_hospital', d)
kpi('hospital_beds', 'Hospital beds per 1,000 residents', 'per 1,000', 'NUTS2', H, OLD, 'EIU', 'Eurostat hlth_rs_bdsrg2', r'hospital_beds', d)
kpi('specialists', 'Specialist doctors per 10,000 residents', 'per 10,000', 'district', H, OLD, 'EIU', 'national physician registers', r'specialist', d)
kpi('pharmacies', 'Pharmacies within 2 km', 'count', 'place', H, OLD, 'NICHE', 'national pharmacy registers; OpenStreetMap', r'pharm', d)
kpi('elderly_care', 'Nursing home places per 1,000 residents aged 75+', 'per 1,000', 'municipality / district', H, OLD, 'GEMR', 'national care statistics (Pflegestatistik, DREES, SCB)', r'nursing|elderly_care|care_places', d)
kpi('life_expectancy', 'Life expectancy at birth', 'years', 'municipality / NUTS2', H, OLD + ['healthcare_first'], 'OECD SPI', 'Eurostat demo_r_mlifexp; national life tables', r'life_expect', d)
kpi('avoidable_mortality', 'Avoidable deaths per 100,000', 'per 100,000', 'NUTS2', H, OLD, 'OECD SPI', 'Eurostat hlth_cd_apr', r'avoidable', d)
kpi('insurance_cover', 'Residents without health insurance', '%', 'county (US)', H, ALLH, 'USN', 'US Census SAHIE', r'uninsured', d)
# ---------------------------------------------------------------- households: safety and hazards
d = 'Safety and hazards'
kpi('crime_total', 'Recorded crimes per 1,000 residents', 'per 1,000', 'municipality', H, ALLH, 'EIU MERCER NICHE USN EUQOL', 'police statistics (PKS Kreise, SSMSI communes, BRÅ, ONS CSP, FBI UCR)', r'crime_total|^n_crime|crime_dk|crimes_per', d)
kpi('violent_crime', 'Violent crimes per 1,000 residents', 'per 1,000', 'municipality / district', H, ALLH, 'EIU NICHE USN', 'same', r'violent', d)
kpi('burglary', 'Residential burglaries per 1,000 households', 'per 1,000', 'municipality / district', H, FAM + OLD + RICH, 'NICHE', 'same', r'burglar', d)
kpi('road_deaths', 'Road deaths per 100,000 residents', 'per 100,000', 'NUTS3 / county', H, FAM, 'SPI', 'Eurostat tran_r_acci; national road safety statistics', r'road_deaths|road_acc', d)
kpi('flood_risk', 'Share of the municipality in flood hazard zones', '%', 'municipality', H, ALLH + ALLB, 'MERCER CWMR', 'national flood hazard maps (EU Floods Directive), FEMA NFHL', r'flood', d)
kpi('heat_days', 'Days above 30 °C a year (and projection for 2050)', 'days', 'grid / municipality', H, OLD + FAM + AREA, 'EIU', 'Copernicus CDS (E-OBS, CORDEX), national weather services', r'heat_days|hot_days|tropical', d)
kpi('air_pm25', 'Fine particulate matter PM2.5', 'µg/m³', 'grid / municipality', H, ALLH, 'OECD EIU SPI', 'EEA air quality interpolated maps; Copernicus CAMS', r'pm25|pm2', d)
kpi('air_no2', 'Nitrogen dioxide NO₂', 'µg/m³', 'grid / municipality', H, ALLH, 'EIU', 'EEA interpolated maps', r'no2', d)
kpi('noise', 'Residents exposed to road noise above 55 dB', '%', 'agglomeration / municipality', H, OLD + FAM + AREA, 'EUQOL', 'EEA noise data (END reporting)', r'noise', d)
kpi('radon', 'Radon priority area', 'yes / no / %', 'municipality', H, FAM, '', 'national radon maps (BAG, BfS, UKHSA)', r'radon', d)
kpi('earthquake', 'Seismic hazard (peak ground acceleration)', 'g', 'grid', H, ALLH + ALLB, 'MERCER CWMR', 'ESHM20 (EFEHR), USGS', r'seismic|earthquake', d)
kpi('wildfire', 'Wildfire danger days', 'days', 'grid', H, AREA, '', 'Copernicus EFFIS', r'wildfire|fire_danger', d)
# ---------------------------------------------------------------- households: climate and nature
d = 'Climate and nature'
kpi('sunshine', 'Sunshine hours a year', 'hours', 'station / grid', H, OLD + AREA, 'MERCER', 'national weather services climate normals (1991-2020)', r'sunshine', d)
kpi('temp_july', 'Average July daily maximum', '°C', 'station / grid', H, OLD + AREA, 'MERCER', 'climate normals; Copernicus E-OBS', r'temperature|tmax', d)
kpi('temp_january', 'Average January daily minimum', '°C', 'station / grid', H, OLD + AREA, 'MERCER', 'same', r'tmin|temp_jan', d)
kpi('rain_days', 'Days with rain a year', 'days', 'station / grid', H, OLD + AREA, 'MERCER', 'climate normals', r'precip|rain_days', d)
kpi('green_share', 'Green and open land in the municipality', '%', 'municipality', H, AREA + FAM, 'OECD EUQOL', 'Copernicus CORINE / Urban Atlas', r'green_open|wooded|green_share', d)
kpi('park_access', 'Residents within 300 m of a green area', '%', 'city / municipality', H, FAM + OLD, 'EUQOL SPI', 'EEA / JRC urban green accessibility; Urban Atlas', r'park_access|green_access', d)
kpi('coast_lake', 'Distance to the sea or a large lake', 'km', 'place', H, ['coastal', 'nature', 'early_retiree'], 'MERCER', 'Natural Earth; national hydrography', r'coast|shore', d)
kpi('altitude', 'Altitude and terrain', 'm', 'place', H, AREA, '', 'Copernicus DEM', r'^alt$|^relief$', d)
# ---------------------------------------------------------------- households: mobility and connectivity
d = 'Mobility and connectivity'
kpi('rail_station', 'Distance to the nearest railway station', 'km', 'place', H, WORK + ['car_free', 'student', 'commuter'], 'EIU MERCER EUQOL', 'national rail station lists; OpenStreetMap', r'station_km|n_station', d)
kpi('pt_travel_time', 'Travel time by public transport to the nearest big city', 'minutes', 'place', H, WORK + ['commuter', 'car_free'], 'OECD EUQOL', 'GTFS timetables (transit.land, national open data portals), computed', r'pt_time|travel_time', d)
kpi('train_frequency', 'Departures per day from the nearest station', 'trains a day', 'station', H, ['commuter', 'car_free'], 'EUQOL', 'GTFS timetables', r'departures|frequency', d)
kpi('commute_time', 'Average commute time', 'minutes', 'municipality / county', H, WORK + FAM, 'USN NICHE', 'census commuting statistics; US ACS', r'^n_long_commute|commute_time|mean_commute', d)
kpi('airport', 'Distance to a hub airport and its destinations', 'km, destinations', 'place', H, ['expat_professional', 'hnw', 'early_retiree'] + OFF, 'MERCER FDI EIU', 'OurAirports; Eurostat avia_par (passenger routes)', r'airport', d)
kpi('cycling', 'Cycle paths per km² or share of commuting by bike', 'km/km² or %', 'municipality', H, ['car_free', 'urban', 'young_family'], 'EUQOL', 'OpenStreetMap; census mode share', r'cycl|bike', d)
kpi('ev_chargers', 'Public EV charging points per 10,000 residents', 'per 10,000', 'municipality', H, ALLH, '', 'national charge point registers (Bundesnetzagentur, IRVE, NCR)', r'ev_charg|charging', d)
kpi('gigabit_home', 'Homes with gigabit broadband', '%', 'municipality', H, ['remote', 'digital_native'] + WORK, 'SPI EIU', 'national broadband atlases; EU Broadband Coverage Study (NUTS3); FCC map', r'gigabit|broadband|vhcn', d)
kpi('mobile_5g', '5G coverage', '% of area or households', 'municipality', H, ['remote', 'digital_native'], '', 'national regulators (Bundesnetzagentur, Arcep, Ofcom)', r'5g|cover_5g', d)
# ---------------------------------------------------------------- households: amenities and lifestyle
d = 'Amenities and lifestyle'
kpi('restaurants', 'Restaurants and cafés per 1,000 residents', 'per 1,000', 'place', H, ['urban', 'dinks', 'young_professional', 'single'], 'MERCER EIU NICHE', 'OpenStreetMap; national business registers (NACE 56)', r'food_outlets|restaurant', d)
kpi('culture', 'Cinemas, theatres and museums within 10 km', 'count', 'place', H, ['urban', 'dinks', 'early_retiree'], 'EIU MERCER EUQOL', 'Eurostat cult; national museum statistics; OpenStreetMap', r'(^|_)(museum|theatre|cinema)s?(_|$)|culture_venues', d)
kpi('sports', 'Sports facilities and pools within 5 km', 'count', 'place', H, FAM + ['urban'], 'MERCER NICHE', 'OpenStreetMap; national facility registers', r'n_sports|n_exercise|sports_facilities|swimming_pool', d)
kpi('shops_daily', 'Supermarkets within walking distance', 'count within 1.5 km', 'place', H, OLD + ['car_free'], 'EUQOL', 'OpenStreetMap', r'supermarket', d)
kpi('nightlife', 'Bars and clubs per 1,000 residents', 'per 1,000', 'place', H, ['urban', 'single', 'student'], 'NICHE', 'OpenStreetMap; NACE 56.3 establishments', r'(^|_)bars?(_|$)|nightlife', d)
kpi('english', 'English proficiency', 'index', 'country / region', H, ['expat_professional'] + OFF, 'KEAR FDI', 'Eurostat AES/LFS language module (country)', r'english', d)
kpi('satisfaction', 'Residents satisfied with living in their city', '%', 'city', H, ALLH, 'EUQOL OECD', 'Eurostat urb_percep (Quality of Life in European Cities survey); ONS wellbeing', r'happiness|satisf', d)
kpi('tourism_pressure', 'Tourist overnight stays per resident', 'nights per resident', 'municipality / NUTS3', H, ['nature', 'early_retiree', 'first_home'], 'SPI', 'Eurostat tour_occ_nin3; national tourism statistics', r'overnight|nights', d)
# ---------------------------------------------------------------- households: community and outlook
d = 'Community and outlook'
kpi('pop_growth', 'Population change over 5 years', '%', 'municipality', H, ALLH, 'PROG USN GEMR', 'population registers', r'population_growth|pop_change|growth_5y', d)
kpi('migration_balance', 'Net migration per 1,000 residents', 'per 1,000', 'municipality', H, ALLH, 'PROG', 'population registers', r'migration', d)
kpi('median_age', 'Median age', 'years', 'municipality', H, FAM + WORK, 'NICHE', 'population registers', r'median_age|aged|elderly_share', d)
kpi('municipal_debt', 'Municipal debt per resident', 'per resident', 'municipality', H, RICH + FAM, 'GEMR PROG', 'municipal finance statistics (Destatis Schulden, EFV, DGCL)', r'municipal_debt|n_debt|debt_per', d)
kpi('fiscal_strength', 'Municipal tax revenue per resident', 'per resident', 'municipality', H, RICH, 'GEMR', 'municipal finance statistics', r'fiscal_strength|tax_revenue', d)
kpi('poverty', 'Residents at risk of poverty', '%', 'municipality / NUTS2', H, ALLH, 'OECD SPI', 'Eurostat ilc_li41; national (Filosofi, ADI)', r'poverty|social_assistance', d)
kpi('voter_turnout', 'Turnout at the last local election', '%', 'municipality', H, ['self_fit'], 'OECD SPI', 'national election authorities', r'turnout', d)

# ---------------------------------------------------------------- business: labour
d = 'Labour'
kpi('labour_cost_hour', 'Employer labour cost per hour', 'EUR or USD per hour', 'NUTS2 / state', B, ALLB, 'FDI KEAR CWMR IMD SITE', 'Eurostat lc_lci_lev and lc_ncost_r2; BLS ECEC; national statistics offices', r'^eurostat_total_hourly_labour_cost|labour_cost_level', d)
kpi('labour_cost_change', 'Change in employer labour cost', '% a year', 'country', B, ALLB, 'IMD', 'Eurostat lc_lci_r2_a', r'hourly_employer_cost_change|labour_cost_index', d)
for occ, label, rx, prof in [('production', 'production workers', r'Production|Installation, maintenance', IND + ['biz_workshop']),
                             ('warehouse', 'warehouse and transport workers', r'Transportation and material|Laborers and freight|Stockers', LOG + ['biz_port_industry']),
                             ('software', 'software developers', r'Software|Computer and mathematical', ['biz_tech', 'biz_startup', 'biz_datacenter', 'biz_studio']),
                             ('engineering', 'engineers', r'Architecture and engineering|engineers', IND + ['biz_tech', 'biz_lab']),
                             ('office', 'office and customer service staff', r'Office and administrative|Customer service', ['biz_services', 'biz_contact_center', 'biz_practice', 'biz_hq']),
                             ('science', 'scientists and lab technicians', r'Life, physical|scientists', ['biz_lab', 'biz_pharma_production']),
                             ('hospitality', 'food service and hotel staff', r'Food preparation|Waiters', ['biz_cafe', 'biz_guesthouse', 'biz_shop']),
                             ('sales', 'retail sales staff', r'Sales and related|Retail salespersons', ['biz_shop']),
                             ('drivers', 'truck drivers', r'truck drivers|Heavy and tractor', LOG + ['biz_food_processing']),
                             ('finance', 'finance and accounting staff', r'Business and financial operations|Accountants', ['biz_services', 'biz_hq']),
                             ('health', 'nurses and medical assistants', r'Healthcare practitioners|nurses', ['biz_practice']),
                             ('managers', 'managers', r'Management occupations', ['biz_hq'])]:
    kpi('wage_' + occ, 'Hourly pay, ' + label, 'per hour', 'NUTS2 / metro area', B, prof, 'FDI KEAR SITE CWMR', 'Eurostat Structure of Earnings Survey (earn_ses, ISCO); BLS OEWS by metro area; national wage statistics', r'mean_hourly_wage.*(' + rx + ')', d)
kpi('minimum_wage', 'Statutory minimum wage', 'per hour / month', 'country / state', B, SMALL + LOG + ['biz_contact_center'], 'FDI', 'Eurostat earn_mw_cur; US DOL state minimum wages', r'minimum_wage', d)
kpi('employer_social', 'Employer social security contributions', '% of gross pay', 'country', B, ALLB, 'FDI KEAR', 'OECD Taxing Wages; national rules', r'social_contribution|social_security', d)
kpi('labour_force_60min', 'Labour force within 60 minutes by road', 'people aged 20-64', 'place', B, IND + LOG + OFF, 'SITE FDI', 'computed from population grids (GEOSTAT 1 km², GHSL) and road travel times', r'catchment|labour_force', d)
kpi('graduates_stem', 'STEM graduates a year within the region', 'graduates', 'NUTS2', B, ['biz_tech', 'biz_lab', 'biz_pharma_production', 'biz_startup'] + IND, 'FDI KEAR IMD RIS', 'Eurostat educ_uoe_grad02 (field of education); national university statistics', r'stem_graduates|graduates_per', d)
kpi('vocational', 'Vocational and apprenticeship graduates', 'per 1,000 aged 15-24', 'NUTS2 / country', B, IND + ['biz_workshop'], 'IMD', 'Eurostat educ_uoe_enrs; national VET statistics', r'vocational|apprentic', d)
kpi('unemployment_youth', 'Youth unemployment', '%', 'NUTS2', B, ['biz_contact_center', 'biz_fulfilment', 'biz_cafe'], 'FDI', 'Eurostat lfst_r_lfu3rt (15-24)', r'youth_unemploy', d)
kpi('labour_tightness', 'Job vacancy rate', '%', 'country / NUTS2', B, ALLB, 'CWMR', 'Eurostat jvs_q_nace2', r'vacancy_rate_jobs|job_vacanc', d)
kpi('productivity', 'Gross value added per worker', 'EUR per worker', 'NUTS3', B, IND + OFF, 'IMD FDI', 'Eurostat nama_10r_3gva and nama_10r_3empers', r'gva|productivity', d)
kpi('languages', 'Workers speaking two or more foreign languages', '%', 'country', B, ['biz_contact_center', 'biz_services', 'biz_hq'], 'KEAR', 'Eurostat edu_aes_l22', r'foreign_language', d)
kpi('days_lost_strikes', 'Working days lost to strikes per 1,000 employees', 'days', 'country', B, IND + LOG, 'CWMR IMD', 'ILOSTAT; national statistics', r'strike', d)
# ---------------------------------------------------------------- business: operating costs
d = 'Operating costs'
kpi('elec_industrial', 'Industrial electricity price (by consumption band)', 'EUR or USD per kWh', 'country / state / utility', B, IND + ['biz_datacenter', 'biz_fulfilment'], 'CWMR CWDC FDI SITE', 'Eurostat nrg_pc_205 (bands ID-IF, excl. VAT and recoverable taxes); EIA by state', r'^(electricity_business_eur_kwh|power_industrial_cents_kwh|electricity_retail_ind_cents_kwh)', d)
kpi('elec_commercial', 'Commercial electricity price', 'EUR or USD per kWh', 'country / state', B, SMALL + OFF, 'FDI', 'Eurostat nrg_pc_205 (bands IB-IC); EIA by state', r'^(power_commercial_cents_kwh|electricity_retail_com_cents_kwh)', d)
kpi('gas_industrial', 'Industrial natural gas price', 'per MWh or Mcf', 'country / state', B, IND, 'CWMR FDI', 'Eurostat nrg_pc_203 (bands I3-I5); EIA', r'^gas_price_industrial', d)
kpi('water_industrial', 'Industrial water tariff', 'per m³', 'utility / municipality', B, ['biz_food_processing', 'biz_pharma_production', 'biz_energy_intensive', 'biz_datacenter'], 'SITE CWDC', 'utility tariff sheets; national water regulators', r'water_tariff|water_price', d)
kpi('industrial_land', 'Industrial land price', 'per m²', 'municipality / NUTS3', B, IND + LOG + ['biz_datacenter', 'biz_workshop'], 'FDI SITE CWMR', 'land-value registers (Bodenrichtwerte via BORIS, DVF, Kadaster)', r'industrial_land|land_price|bodenrichtwert', d)
kpi('warehouse_rent', 'Warehouse and logistics rent', 'per m² a year', 'region', B, LOG + ['biz_food_processing'], 'SITE FDI', 'official or openly licensed rent statistics only', r'warehouse_rent|logistics_rent', d)
kpi('office_rent', 'Office rent', 'per m² a year', 'city', B, OFF + ['biz_studio', 'biz_startup', 'biz_practice'], 'FDI KEAR', 'official or open rent statistics (municipal surveys)', r'office_rent', d)
kpi('retail_rent', 'Retail rent in the main street', 'per m² a year', 'city', B, ['biz_shop', 'biz_cafe'], 'SITE', 'official or open rent statistics', r'retail_rent', d)
kpi('construction_cost', 'Construction cost index', 'index', 'country / region', B, IND + LOG + ['biz_datacenter'], 'CWMR SITE', 'Eurostat sts_copi_a; national building cost indices', r'construction_cost|copi', d)
kpi('diesel_price', 'Diesel price', 'per litre', 'country', B, LOG + ['biz_food_processing'], 'SITE', 'EU Weekly Oil Bulletin; EIA', r'diesel', d)
kpi('investment_price', 'Price level of investment goods', 'index EU27 = 100', 'country', B, IND, 'IMD', 'Eurostat prc_ppp_ind (GFCF)', r'^eu_gfcf_price_level', d)
# ---------------------------------------------------------------- business: tax and incentives
d = 'Tax and incentives'
kpi('corporate_tax', 'Corporate income tax rate (combined)', '%', 'country / state', B, ALLB, 'FDI IMD KEAR EYEA', 'OECD Corporate Tax Statistics; state statutes', r'corporate_tax|cit_rate', d)
kpi('business_tax_local', 'Local business tax rate or multiplier', '% or multiplier', 'municipality', B, ALLB, 'FDI SITE', 'Gewerbesteuer-Hebesatz (Destatis), CFE (DGFiP REI), IRAP (regions), Swiss cantonal and communal profit tax (ESTV)', r'gewerbesteuer|business_tax|hebesatz|cfe|irap', d)
kpi('eatr', 'Effective average tax rate on a standard investment', '%', 'country', B, IND + OFF, 'FDI EYEA', 'OECD Corporate Effective Tax Rates; ZEW', r'eatr|effective_tax', d)
kpi('rnd_incentive', 'R&D tax incentive generosity (implied subsidy rate)', 'share of R&D cost', 'country', B, ['biz_lab', 'biz_pharma_production', 'biz_tech', 'biz_startup'], 'FDI RIS', 'OECD R&D tax incentive database (B-index)', r'b_index|rnd_tax', d)
kpi('regional_aid', 'Maximum state aid intensity for investment', '% of eligible cost', 'NUTS3', B, IND + LOG + ['biz_datacenter'], 'FDI SITE', 'EU regional aid maps 2022-2027 (Commission decisions per member state)', r'regional_aid|aid_intensity', d)
kpi('payroll_tax', 'Payroll and wage-sum taxes', '% of payroll', 'country / state', B, OFF + ['biz_contact_center'], 'KEAR', 'OECD Taxing Wages; state payroll taxes (AU)', r'payroll_tax', d)
kpi('tax_admin', 'Tax administration (Business Ready)', 'score 0-100', 'country', B, ALLB, 'BREADY', 'World Bank B-READY', r'^bready_tax', d)
# ---------------------------------------------------------------- business: infrastructure and utilities
d = 'Infrastructure and utilities'
kpi('motorway', 'Distance to a motorway junction', 'km', 'place', B, IND + LOG + SMALL, 'SITE FDI', 'Natural Earth / OpenStreetMap', r'mway_km', d)
kpi('rail_freight', 'Distance to a rail freight or intermodal terminal', 'km', 'place', B, IND + LOG, 'SITE', 'national intermodal terminal lists (UIRR/AGORA, BMDV KV-Terminals)', r'intermodal|rail_freight', d)
kpi('port_throughput', 'Cargo of the nearest major seaport', 'tonnes / TEU a year', 'port', B, ['biz_port_industry'] + LOG + IND, 'SITE FDI', 'Eurostat mar_go_qm / mar_mg_aa_pwhd; USACE Waterborne Commerce', r'port_cargo|teu', d)
kpi('air_cargo', 'Air cargo at the nearest hub airport', 'tonnes a year', 'airport', B, ['biz_pharma_production', 'biz_hq', 'biz_fulfilment'], 'SITE', 'Eurostat avia_gooa; FAA', r'air_cargo|freight_tonnes', d)
kpi('air_destinations', 'Direct destinations from the nearest hub airport', 'destinations', 'airport', B, ['biz_hq', 'biz_tech', 'biz_lab', 'biz_services'], 'FDI KEAR SITE', 'Eurostat avia_par routes; OurAirports + open route data', r'destinations', d)
kpi('grid_connection', 'Time and cost to connect to the grid', 'days, % of income per capita', 'country', B, IND + ['biz_datacenter'], 'BREADY CWDC', 'World Bank B-READY (utility services)', r'^bready_electric_connect', d)
kpi('power_reliability', 'Power outages per customer (SAIDI)', 'minutes a year', 'country / state', B, IND + ['biz_datacenter', 'biz_pharma_production'], 'CWDC CWMR', 'CEER benchmarking report on quality of supply; EIA 861', r'^power_reliability_saidi', d)
kpi('renewable_share', 'Renewable share of electricity', '%', 'country / state', B, ['biz_datacenter', 'biz_energy_intensive'] + OFF, 'CWDC', 'Eurostat nrg_ind_ren; EIA state profiles', r'renewable', d)
kpi('water_stress', 'Baseline water stress', 'index 0-5', 'river basin', B, ['biz_datacenter', 'biz_food_processing', 'biz_pharma_production', 'biz_energy_intensive'], 'CWDC CWMR', 'WRI Aqueduct 4.0 (CC BY 4.0)', r'water_stress', d)
kpi('gigabit', 'Gigabit broadband coverage', '% of addresses', 'municipality / NUTS3', B, OFF + SMALL, 'CWDC KEAR', 'national broadband atlases; EU Broadband Coverage Study; FCC', r'gigabit|vhcn|broadband', d)
kpi('ixp_distance', 'Distance to the nearest internet exchange point', 'km', 'place', B, ['biz_datacenter', 'biz_tech'], 'CWDC', 'PeeringDB (check terms), Euro-IX', r'ixp', d)
kpi('cooling_degree_days', 'Cooling degree days', 'degree days a year', 'NUTS3', B, ['biz_datacenter'], 'CWDC', 'Eurostat nrg_chdd_a; NOAA', r'cooling_degree|cdd', d)
# ---------------------------------------------------------------- business: market and demand
d = 'Market and demand'
kpi('market_2h', 'Population within 2 hours by road', 'people', 'place', B, LOG + ['biz_food_processing', 'biz_shop'], 'SITE FDI', 'computed from population grids and road network (GEOSTAT, OSM)', r'pop_2h|market_potential', d)
kpi('gdp_pps', 'Economic output per resident (PPS)', 'PPS per resident', 'NUTS3', B, ALLB, 'IMD FDI OECD', 'Eurostat nama_10r_3gdp', r'gdp_pps', d)
kpi('purchasing_power', 'Household purchasing power per resident', 'per resident', 'municipality / NUTS3', B, ['biz_shop', 'biz_cafe', 'biz_practice'], 'SITE', 'Eurostat nama_10r_2hhinc (PPS); national disposable income per municipality', r'income_pps|purchasing', d)
kpi('retail_density', 'Retail outlets per 1,000 residents', 'per 1,000', 'municipality', B, ['biz_shop', 'biz_cafe'], 'SITE', 'national business registers (NACE 47); OpenStreetMap', r'retail_density|shops', d)
kpi('overnight_stays', 'Tourist overnight stays', 'nights a year', 'municipality / NUTS3', B, ['biz_guesthouse', 'biz_cafe', 'biz_shop'], 'SITE', 'Eurostat tour_occ_nin3; national tourism statistics per municipality', r'overnight|nights_spent', d)
kpi('bed_occupancy', 'Bed occupancy in hotels', '%', 'NUTS2 / municipality', B, ['biz_guesthouse'], 'SITE', 'Eurostat tour_occ_anor2; national statistics', r'occupancy', d)
kpi('business_births', 'New firms per 100 active firms', 'per 100', 'NUTS3', B, ['biz_startup', 'biz_studio', 'biz_tech'], 'RIS EYEA', 'Eurostat bd_hgnace2_r3 (business demography by NUTS3)', r'birth_rate_enterprises|business_births|high-employment-growth', d)
kpi('firm_survival', 'Firms still active after 3 years', '%', 'NUTS3', B, SMALL, 'RIS', 'Eurostat bd_hgnace2_r3', r'survival', d)
# ---------------------------------------------------------------- business: industry and innovation
d = 'Industry and innovation'
kpi('industry_mix', 'Employment by industry (NACE section / NAICS sector)', '% of jobs', 'municipality / NUTS3 / county', B, ALLB, 'FDI SITE CWMR PROG', 'Eurostat nama_10r_3empers; national registers per municipality; US County Business Patterns', r'^(ces_|ilo_employment_share|retained:establishment_share|nace_|naics_)', d)
kpi('industry_lq', 'Concentration of this site\'s industry (location quotient)', 'ratio', 'NUTS3 / county', B, IND + OFF + LOG, 'SITE FDI', 'computed from the industry mix: local share divided by national share', r'location_quotient|_lq$', d)
kpi('establishments_size', 'Firms by size class', 'count', 'municipality / NUTS3', B, ALLB, 'SITE', 'national business registers; Eurostat sbs_r_nuts06_r2', r'establishment_share_employees|establishments', d)
kpi('patents', 'Patent applications per million residents', 'per million', 'NUTS3', B, ['biz_lab', 'biz_pharma_production', 'biz_tech', 'biz_startup'], 'RIS IMD FDI', 'Eurostat pat_ep_rtot (EPO by NUTS3); OECD REGPAT', r'patent', d)
kpi('rnd_spending', 'R&D spending as a share of GDP', '%', 'NUTS2', B, ['biz_lab', 'biz_pharma_production', 'biz_tech'], 'RIS IMD', 'Eurostat rd_e_gerdreg', r'gerd|rnd_spend|rd_e', d)
kpi('universities', 'Universities and research institutes within 50 km', 'count / students', 'place', B, ['biz_lab', 'biz_pharma_production', 'biz_tech', 'biz_startup'], 'FDI KEAR RIS', 'ETER (European Tertiary Education Register); national registers', r'campus|universit|student_anchor', d)
kpi('innovation_score', 'Regional Innovation Scoreboard group', 'index', 'NUTS2', B, ['biz_lab', 'biz_tech', 'biz_startup', 'biz_pharma_production'], 'RIS', 'European Commission Regional Innovation Scoreboard', r'innovation|cluster_rank', d)
kpi('vc_investment', 'Venture capital invested per resident', 'per resident', 'NUTS2 / city', B, ['biz_startup', 'biz_tech'], 'EYEA', 'open sources only (e.g. national development banks, OECD), check licences', r'venture|vc_', d)
# ---------------------------------------------------------------- business: regulation and risk
d = 'Regulation and risk'
kpi('permits_time', 'Time to obtain a building permit', 'days', 'country / city', B, IND + LOG + ['biz_datacenter'], 'BREADY CWMR SITE', 'World Bank B-READY (business location)', r'bready_.*(permit|location)|building_permit', d)
kpi('business_entry', 'Business entry (Business Ready)', 'score 0-100', 'country', B, SMALL + ['biz_startup'], 'BREADY', 'World Bank B-READY', r'bready_.*entry|business_entry', d)
kpi('rule_of_law', 'Rule of law and regulatory quality', 'index', 'country', B, ALLB, 'IMD FDI CWMR', 'World Bank Worldwide Governance Indicators (CC BY 4.0)', r'wgi|rule_of_law|regulatory_quality', d)
kpi('fdi_restrictiveness', 'FDI regulatory restrictiveness', 'index 0-1', 'country', B, IND + OFF, 'FDI EYEA', 'OECD FDI Regulatory Restrictiveness Index', r'fdi_restrict|ownership_restrictions', d)
kpi('labour_regulation', 'Employment protection strictness', 'index', 'country', B, ALLB, 'IMD KEAR', 'OECD Employment Protection Legislation indicators', r'employment_protection|epl', d)

# ---------------------------------------------------------------- added after the first audit of this catalogue
kpi('church_tax', 'Church tax or local surcharges', '% of income tax', 'municipality', H, RICH + WORK, 'GEMR', 'Finnish Vero municipal and church tax rates; German Kirchensteuer by Land; Swiss cantonal rates', r'church_tax|kirchensteuer', 'Income and cost of living')
kpi('heating_degree_days', 'Heating degree days', 'degree days a year', 'NUTS3', H, OLD + BUDGET + AREA, 'MERCER', 'Eurostat nrg_chdd_a; NOAA', r'heating_degree|hdd', 'Climate and nature')
kpi('energy_rating', 'Dwellings with a good energy rating (A-C)', '%', 'municipality / NUTS3', H, BUDGET + FAM, '', 'national EPC registers (ADEME DPE open data, EPC register England and Wales)', r'epc|energy_rating|dpe', 'Housing')
kpi('secondary_school', 'Distance to the nearest upper-secondary school', 'km', 'place', H, FAM, 'NICHE', 'national school registers; OpenStreetMap', r'secondary_school|gymnasium', 'Family and education')
kpi('barrier_free', 'Step-free railway stations nearby', 'share of stations', 'region / network', H, OLD + ['car_free'], 'EUQOL', 'rail operators open data (DB station data, SNCF accessibility)', r'step_free|barrier_free', 'Mobility and connectivity')
kpi('mortgage_rate', 'Mortgage interest rate for new loans', '% a year', 'country', H, FAM + ['first_home'], 'USN', 'ECB MFI interest rate statistics; national central banks; Freddie Mac PMMS', r'mortgage', 'Housing')
kpi('logistics_performance', 'Logistics performance index', 'score 1-5', 'country', B, LOG + IND + ['biz_port_industry'], 'FDI SITE', 'World Bank LPI (CC BY 4.0)', r'lpi|logistics_performance', 'Infrastructure and utilities')
kpi('available_sites', 'Serviced industrial sites available', 'hectares', 'municipality / region', B, IND + LOG + ['biz_datacenter'], 'SITE FDI', 'regional investment-promotion site databases with open terms; municipal land registers', r'available_sites|industrial_sites', 'Operating costs')
kpi('special_zones', 'Special economic or free-trade zone within 30 km', 'yes / no', 'place', B, IND + LOG + ['biz_port_industry'], 'FDI', 'national lists of free zones (EU customs free zones list, US FTZ Board)', r'free_zone|sez|ftz', 'Tax and incentives')
kpi('union_density', 'Trade union density', '% of employees', 'country', B, IND + LOG + ['biz_contact_center'], 'KEAR IMD', 'OECD/AIAS ICTWSS', r'union_density', 'Labour')
kpi('corruption', 'Control of corruption', 'index', 'country', B, ALLB, 'IMD FDI', 'World Bank WGI control of corruption (CC BY 4.0)', r'control_of_corruption|corruption', 'Regulation and risk')
kpi('expat_cost', 'Cost of a furnished 2-room flat for assignees', 'per month', 'city', B, ['biz_hq', 'biz_tech', 'biz_lab'], 'MERCER KEAR', 'official rent statistics for furnished/new leases only', r'furnished', 'Operating costs')
kpi('time_to_market', 'Share of the national market reachable within a day by truck', '% of population', 'place', B, LOG + ['biz_food_processing'], 'SITE', 'computed from population grids and road travel times (EU rules on driving time)', r'one_day_reach', 'Market and demand')

# what the current build can already show for each (filled by audit_export via the 'match' regexes)
if __name__ == '__main__':
    from collections import Counter
    print(len(K), 'KPIs;', Counter(v['audience'] for v in K.values()), Counter(v['domain'] for v in K.values()))
