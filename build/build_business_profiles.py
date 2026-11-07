#!/usr/bin/env python3
"""Business location profiles (Nestlyzer Business, 2.7). Run after build_data.py / build_world.py; safe to run again.

Each profile is configuration for the same engine the household profiles use:
  weights        importance of measured categories (adjustable by the user; starting points, not findings)
  must           hard requirements on measured distances or counts; pass / fail / unknown (unknown never passes)
  unknownMust    'flag' (default: shown with a warning) or 'exclude'
  minPop         smallest place considered
Only measures that exist across the 45 countries are used: motorway, railway, seaport, hub airport, a city of 100,000+,
the nearest campus town and the residents within 30 km. Where one is missing for a place (for example parts of Norway),
that must-have shows as unknown. Switzerland's campus distance is added here from its university-town list. Requirements no open dataset covers (grid capacity, plots,
permits, wages per place) are listed as 'none' must-haves so the result says they are unknown.
The 'freight' category is computed by the engine from motorway, railway and seaport distances."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

M = lambda k, op, v, label, unit='': {'k': k, 'op': op, 'v': v, 'label': label, 'unit': unit}
UNKNOWN_POWER = M('none', '>=', 0, 'grid connection capacity (no open data per place)')
UNKNOWN_SITE = M('none', '>=', 0, 'available industrial plots and permits (no open data per place)')

PROFILES = {
    'biz_manufacturing': {
        'name': 'Manufacturing plant', 'icon': '🏭', 'tone': '#0F7C7A', 'gics': 'Industrials',
        'desc': 'A medium-sized production site: a large workforce within 30 km, motorway and rail for freight, space at moderate cost, technical education nearby and an airport for visitors and parts.',
        'intro': 'Freight access and space at moderate cost first, then the workforce within 30 km, an airport, technical education and taxes where measured.',
        'weights': {'focus': 35, 'freight': 30, 'flatland': 10, 'student_access': 15, 'safety': 10},
        'must': [M('dens', '<=', 2500, 'not in a dense city core (at most 2,500 residents per km²)', 'residents/km²'), M('mway_km', '<=', 25, 'motorway within 25 km', 'km'), M('catch30', '>=', 100000, 'at least 100,000 people within 30 km', 'people'), UNKNOWN_POWER, UNKNOWN_SITE],
        'minPop': 5000},
    'biz_logistics': {
        'name': 'Logistics and distribution hub', 'icon': '🚚', 'tone': '#0F7C7A', 'gics': 'Industrials',
        'desc': 'A warehouse or distribution centre: next to a motorway, many customers within reach, rail and port access, and space at moderate cost.',
        'intro': 'Motorway, rail and port first, then how many people live within reach, then space.',
        'weights': {'domreach': 25, 'reach300': 15, 'freight': 30, 'focus': 20, 'flatland': 10},
        'must': [M('dens', '<=', 2500, 'not in a dense city core (at most 2,500 residents per km²)', 'residents/km²'), M('mway_km', '<=', 10, 'motorway within 10 km', 'km'), UNKNOWN_SITE],
        'minPop': 1000},
    'biz_tech': {
        'name': 'Software and tech office', 'icon': '💻', 'tone': '#0F7C7A', 'gics': 'Information Technology',
        'desc': 'An engineering or software team: graduates and a university nearby, a big labour market, a hub airport, city life to attract people and taxes where measured.',
        'intro': 'Talent and universities first, then the airport, city life and taxes.',
        'weights': {'focus': 30, 'student_access': 20, 'mobility': 25, 'lifestyle': 15, 'reach': 10},
        'must': [M('city_km', '<=', 30, 'a city of 100,000+ within 30 km', 'km'), M('airport_km', '<=', 75, 'a hub airport within 75 km', 'km')],
        'minPop': 10000},
    'biz_services': {
        'name': 'Shared-service and back-office centre', 'icon': '🗂️', 'tone': '#0F7C7A', 'gics': 'Financials and corporate functions',
        'desc': 'Finance, HR or customer-service operations: a large labour market, moderate costs, a university for graduates and good connections.',
        'intro': 'Labour market and moderate costs first, then graduates and connections.',
        'weights': {'focus': 35, 'mobility': 25, 'student_access': 20, 'reach': 10, 'safety': 10},
        'must': [M('city_km', '<=', 40, 'a city of 100,000+ within 40 km', 'km')],
        'minPop': 20000},
    'biz_lab': {
        'name': 'Research and life-science lab', 'icon': '🔬', 'tone': '#0F7C7A', 'gics': 'Health Care',
        'desc': 'A research or laboratory site: a university town close by, specialists within reach, an airport for partners and a place scientists want to live.',
        'intro': 'A university nearby first, then specialists, the airport and quality of life.',
        'weights': {'student_access': 40, 'focus': 25, 'mobility': 25, 'lifestyle': 10},
        'must': [M('campus_km', '<=', 30, 'a university town within 30 km', 'km'), UNKNOWN_SITE],
        'minPop': 10000},
    'biz_hq': {
        'name': 'Regional headquarters', 'icon': '🏢', 'tone': '#0F7C7A', 'gics': 'Corporate functions',
        'desc': 'A regional head office: a hub airport close by, a big city, senior talent, city life and taxes where measured.',
        'intro': 'Airport and big city first, then talent, city life and taxes.',
        'weights': {'mobility': 35, 'focus': 25, 'reach': 20, 'lifestyle': 20},
        'must': [M('airport_km', '<=', 40, 'a hub airport within 40 km', 'km'), M('city_km', '<=', 35, 'a city of 100,000+ within 35 km', 'km')],
        'minPop': 20000},
    'biz_port_industry': {
        'name': 'Port-based industry and trade', 'icon': '⚓', 'tone': '#0F7C7A', 'gics': 'Industrials',
        'desc': 'A site that lives from a port: import and export processing, bulk handling and storage, port logistics and supply. A seaport or a major inland port such as Basel, Duisburg or Mannheim close by, rail and motorway for the hinterland, a workforce and flat land.',
        'intro': 'Seaport and freight first, then workforce and space.',
        'weights': {'portaccess': 40, 'chempark': 20, 'freight': 15, 'focus': 15, 'flatland': 10},
        'must': [M('anyport_km', '<=', 12, 'a major seaport or inland port (Rotterdam, Hamburg, Basel, Duisburg ...) within 12 km', 'km'), M('mway_km', '<=', 30, 'motorway within 30 km', 'km'), M('rail_km', '<=', 25, 'a main railway line within 25 km (the Natural Earth rail layer misses many port spurs)', 'km'), UNKNOWN_SITE],
        'minPop': 15000},
    'biz_energy_intensive': {
        'name': 'Energy-intensive production', 'icon': '⚡', 'tone': '#0F7C7A', 'gics': 'Materials',
        'desc': 'Chemicals, metals, glass, paper, cement or a data centre: large plots at low cost, rail or motorway for bulk inputs, a technical workforce and room for heavy industry away from dense housing. Grid capacity and the electricity price per site decide, and neither is in open data per place: national business electricity prices are shown as context.',
        'intro': 'Low-cost space and bulk freight first, then a technical workforce. Power capacity and price stay unknown per site.',
        'weights': {'freight': 25, 'focus': 30, 'chempark': 15, 'portaccess': 15, 'flatland': 10, 'student_access': 5},
        'must': [M('dens', '<=', 2500, 'not in a dense city core (at most 2,500 residents per km²)', 'residents/km²'), M('rail_km', '<=', 10, 'a railway line within 10 km', 'km'), M('mway_km', '<=', 30, 'motorway within 30 km', 'km'), M('catch30', '>=', 50000, 'at least 50,000 people within 30 km (shift workers)', 'people'), UNKNOWN_POWER, UNKNOWN_SITE],
        'minPop': 5000},
    'biz_datacenter': {
        'name': 'Data centre', 'icon': '🖧', 'tone': '#0F7C7A', 'gics': 'Information Technology',
        'desc': 'A data centre or server hall: cheap and reliable power, fibre, a cool climate, flat land away from floods and a technical team within reach. Grid capacity per site is decisive and not in open data: power prices and reliability are shown as context.',
        'intro': 'Power cost, cool climate and low-cost land first, then connectivity and a technical workforce.',
        'weights': {'mobility': 30, 'focus': 35, 'climaterisk': 20, 'flatland': 15},
        'must': [M('dens', '<=', 2500, 'not in a dense city core (at most 2,500 residents per km²)', 'residents/km²'), M('mway_km', '<=', 40, 'motorway within 40 km', 'km'), M('city_km', '<=', 80, 'a city of 100,000+ within 80 km (fibre and staff)', 'km'), UNKNOWN_POWER, UNKNOWN_SITE],
        'minPop': 5000},
    'biz_pharma_production': {
        'name': 'Pharma and medtech production', 'icon': '💊', 'tone': '#0F7C7A', 'gics': 'Health Care',
        'desc': 'GMP production of medicines, devices or diagnostics: qualified technicians and scientists, a university nearby, a hub airport for high-value freight, stable power and water.',
        'intro': 'Qualified staff and a university first, then the airport, freight and costs.',
        'weights': {'student_access': 30, 'focus': 30, 'mobility': 25, 'freight': 10, 'safety': 5},
        'must': [M('campus_km', '<=', 50, 'a university town within 50 km', 'km'), M('airport_km', '<=', 90, 'a hub airport within 90 km', 'km'), UNKNOWN_SITE],
        'minPop': 5000},
    'biz_food_processing': {
        'name': 'Food and beverage processing', 'icon': '🌾', 'tone': '#0F7C7A', 'gics': 'Consumer Staples',
        'desc': 'A dairy, bakery plant, brewery or meat and vegetable processing: farmland and suppliers around, a motorway for the cold chain, production staff at moderate wages and space at low cost.',
        'intro': 'Low-cost space and road freight first, then production staff and the regional market.',
        'weights': {'freight': 35, 'focus': 35, 'reach': 20, 'flatland': 10},
        'must': [M('dens', '<=', 2500, 'not in a dense city core (at most 2,500 residents per km²)', 'residents/km²'), M('mway_km', '<=', 25, 'motorway within 25 km', 'km'), M('catch30', '>=', 75000, 'at least 75,000 people within 30 km', 'people'), UNKNOWN_SITE],
        'minPop': 5000},
    'biz_fulfilment': {
        'name': 'E-commerce fulfilment centre', 'icon': '📦', 'tone': '#0F7C7A', 'gics': 'Consumer Discretionary',
        'desc': 'A parcel and fulfilment centre: millions of customers within a day by road, a motorway junction, many warehouse workers within 30 km and large plots at moderate cost.',
        'intro': 'Customers within reach and the motorway first, then warehouse staff and space.',
        'weights': {'reach': 40, 'freight': 25, 'focus': 25, 'flatland': 10},
        'must': [M('dens', '<=', 2500, 'not in a dense city core (at most 2,500 residents per km²)', 'residents/km²'), M('mway_km', '<=', 8, 'motorway within 8 km', 'km'), M('catch30', '>=', 250000, 'at least 250,000 people within 30 km', 'people'), UNKNOWN_SITE],
        'minPop': 1000},
    'biz_contact_center': {
        'name': 'Contact centre', 'icon': '🎧', 'tone': '#0F7C7A', 'gics': 'Industrials (commercial services)',
        'desc': 'Customer service and sales in several languages: many people of working age within reach, moderate wages, a university or college for multilingual staff, transit and office rents that stay low.',
        'intro': 'Labour pool and moderate wages first, then languages, transit and rents.',
        'weights': {'focus': 45, 'student_access': 30, 'mobility': 25},
        'must': [M('catch30', '>=', 150000, 'at least 150,000 people within 30 km', 'people')],
        'minPop': 10000},
    # finance (2.12, owner correction 31 Oct: one profile, "know where finance clusters", not one profile per finance trade)
    'biz_finance': {
        'name': 'Financial services office', 'icon': '🏦', 'tone': '#0F7C7A', 'gics': 'Financials',
        'desc': 'A bank, insurer, asset manager, trading desk or fund administrator: a financial centre within commuting distance (where banking, insurance, funds, commodity trading, gold, crypto and private wealth cluster), senior finance talent, a hub airport and a city people want to live in.',
        'intro': 'A financial centre first, then talent, the airport and city life.',
        'weights': {'finhub': 40, 'focus': 20, 'mobility': 25, 'lifestyle': 15},
        'must': [M('finany', '>=', 1, 'a financial centre within commuting distance', 'score'), M('airport_km', '<=', 90, 'a hub airport within 90 km', 'km')],
        'minPop': 5000},
    # more company sites (2.12, owner request: "think of other business profiles")
    'biz_semis': {
        'name': 'Semiconductor and electronics plant', 'icon': '🔬', 'tone': '#0F7C7A', 'gics': 'Information Technology (semiconductors, hardware)',
        'desc': 'A chip, sensor or electronics plant: engineers from a university nearby, a hub airport for high-value freight, flat land, low flood and heat exposure, and electronics firms already in the region.',
        'intro': 'Engineers and the airport first, then land, climate safety and the cluster.',
        'weights': {'campus': 20, 'focus': 25, 'mobility': 20, 'freight': 10, 'flatland': 15, 'climaterisk': 10},
        'must': [M('airport_km', '<=', 90, 'a hub airport within 90 km', 'km'), M('city_km', '<=', 60, 'a city of 100,000+ within 60 km', 'km')],
        'minPop': 5000},
    'biz_auto': {
        'name': 'Automotive plant or supplier', 'icon': '🚗', 'tone': '#0F7C7A', 'gics': 'Consumer Discretionary (automobiles and components)',
        'desc': 'A car, truck or component plant: motorway and rail for just-in-time supply, the plants it supplies within a day, a skilled industrial workforce at fair cost, flat land and other automotive firms nearby.',
        'intro': 'Freight and the one-day supply radius first, then labour, land and the cluster.',
        'weights': {'freight': 25, 'reach300': 15, 'focus': 30, 'flatland': 15, 'student_access': 5, 'domreach': 10},
        'must': [M('mway_km', '<=', 20, 'a motorway within 20 km', 'km')],
        'minPop': 5000},
    'biz_aero': {
        'name': 'Aerospace and defence site', 'icon': '✈️', 'tone': '#0F7C7A', 'gics': 'Industrials (aerospace and defence)',
        'desc': 'An aircraft, engine, space or defence site: an airport close by, engineers and graduates, a skilled industrial workforce, flat land and the aerospace cluster.',
        'intro': 'The airport and engineers first, then the workforce, land and the cluster.',
        'weights': {'mobility': 25, 'campus': 15, 'student_access': 10, 'focus': 25, 'flatland': 15, 'freight': 10},
        'must': [M('airport_km', '<=', 60, 'a hub airport within 60 km', 'km')],
        'minPop': 5000},
    'biz_cleantech': {
        'name': 'Battery and clean-tech plant', 'icon': '🔋', 'tone': '#0F7C7A', 'gics': 'Industrials (electrical equipment)',
        'desc': 'A battery, solar, electrolyser or heat-pump plant: large flat sites, power and land at fair cost, freight access, a chemical park for materials, low climate exposure and an industrial workforce.',
        'intro': 'Land, power and freight first, then materials, climate safety and the workforce.',
        'weights': {'focus': 30, 'flatland': 20, 'freight': 20, 'chempark': 10, 'climaterisk': 10, 'reach300': 10},
        'must': [M('mway_km', '<=', 25, 'a motorway within 25 km', 'km'), M('dens', '<=', 2500, 'not in a dense city core (at most 2,500 residents per km²)', 'residents/km²')],
        'minPop': 3000},
    'biz_media': {
        'name': 'Film, media and games studio', 'icon': '🎬', 'tone': '#0F7C7A', 'gics': 'Communication Services (media and entertainment)',
        'desc': 'A film, TV, music, publishing or games studio: a big city with a creative scene, graduates, a hub airport and the media and games companies already there.',
        'intro': 'A creative city and graduates first, then connections and the cluster.',
        'weights': {'city': 25, 'lifestyle': 20, 'campus': 15, 'mobility': 15, 'focus': 25},
        'must': [M('city_km', '<=', 40, 'a city of 100,000+ within 40 km', 'km')],
        'minPop': 10000},
    'biz_clinic': {
        'name': 'Private clinic or hospital', 'icon': '🏥', 'tone': '#0F7C7A', 'gics': 'Health Care (providers and services)',
        'desc': 'A private clinic, surgery centre or hospital: many patients within reach, an older population, spending power, good access by car and transit, and doctors and nurses in the region.',
        'intro': 'Patients within reach first, then demand, access and staff.',
        'weights': {'reach': 25, 'demographics': 20, 'focus': 25, 'mobility': 15, 'health': 15},
        'must': [M('catch30', '>=', 100000, 'at least 100,000 people within 30 km', 'people')],
        'minPop': 10000},
    # small-business sites (2.10)
    'biz_shop': {
        'name': 'Shop or showroom', 'icon': '🛍️', 'tone': '#0F7C7A', 'gics': 'Consumer Discretionary',
        'desc': 'A shop, showroom or branch that lives from customers nearby: many people within reach, a lively town centre, accessible by car and transit, rents that leave a margin.',
        'intro': 'Customers within reach first, then a lively town, access and rents.',
        'weights': {'foundation': 35, 'focus': 20, 'lifestyle': 15, 'mobility': 15, 'demographics': 5, 'safety': 10},
        'must': [M('pop', '>=', 30000, 'a town of 30,000 residents or more (a shopping centre for its region)', 'residents'), M('catch30', '>=', 150000, 'at least 150,000 people within 30 km', 'people')],
        'minPop': 30000},
    'biz_cafe': {
        'name': 'Café, restaurant or bar', 'icon': '☕', 'tone': '#0F7C7A', 'gics': 'Consumer Discretionary',
        'desc': 'Hospitality that needs footfall: a dense, lively town with young residents and visitors, good transit and rents that work.',
        'intro': 'Footfall and city life first, then young residents, transit and rents.',
        'weights': {'lifestyle': 30, 'foundation': 30, 'focus': 15, 'demographics': 10, 'mobility': 5, 'safety': 10},
        'must': [M('pop', '>=', 10000, 'a town of 10,000 residents or more', 'residents')],
        'minPop': 10000},
    'biz_workshop': {
        'name': 'Craft workshop or trade business', 'icon': '🔧', 'tone': '#0F7C7A', 'gics': 'Industrials',
        'desc': 'A carpenter, electrician, bakery or repair business: space at low cost, customers within a short drive, a motorway for the van and a steady local economy.',
        'intro': 'Low-cost space and customers within a short drive first, then road access.',
        'weights': {'affordability': 35, 'focus': 30, 'freight': 15, 'demographics': 20},
        'must': [M('catch30', '>=', 20000, 'at least 20,000 people within 30 km', 'people')],
        'minPop': 2000},
    'biz_practice': {
        'name': 'Medical or professional practice', 'icon': '🩺', 'tone': '#0F7C7A', 'gics': 'Health Care',
        'desc': 'A doctor, dentist, physiotherapist, lawyer or accountant: enough residents nearby, an ageing or growing population that needs the service, and a town people like to live in.',
        'intro': 'Residents and demand first, then quality of life and costs.',
        'weights': {'focus': 20, 'demographics': 20, 'health': 20, 'affordability': 15, 'lifestyle': 15, 'safety': 10},
        'must': [M('pop', '>=', 5000, 'a town of 5,000 residents or more', 'residents'), M('catch30', '>=', 30000, 'at least 30,000 people within 30 km', 'people')],
        'minPop': 5000},
    'biz_studio': {
        'name': 'Studio or creative agency', 'icon': '🎨', 'tone': '#0F7C7A', 'gics': 'Communication Services',
        'desc': 'A design, media or marketing studio: a creative city with universities, clients and talent nearby, an airport for pitches and rents a small team can carry.',
        'intro': 'Creative city and talent first, then clients, airport and rents.',
        'weights': {'lifestyle': 30, 'focus': 25, 'student_access': 20, 'mobility': 15, 'affordability': 10},
        'must': [M('pop', '>=', 50000, 'a town of 50,000 residents or more', 'residents'), M('city_km', '<=', 35, 'a city of 100,000+ within 35 km', 'km')],
        'minPop': 20000},
    'biz_startup': {
        'name': 'Tech start-up', 'icon': '🚀', 'tone': '#0F7C7A', 'gics': 'Information Technology',
        'desc': 'A founding team of two to twenty: a city with graduates and a university, other start-ups and investors around, an airport, and costs that stretch the runway.',
        'intro': 'Talent and costs first, then the airport and taxes.',
        'weights': {'student_access': 25, 'focus': 30, 'foundation': 20, 'lifestyle': 15, 'affordability': 10},
        'must': [M('pop', '>=', 100000, 'a city of 100,000 residents or more (talent, investors, other start-ups)', 'residents'), M('campus_km', '<=', 30, 'a university town within 30 km', 'km')],
        'minPop': 20000},
    'biz_guesthouse': {
        'name': 'Hotel or guesthouse', 'icon': '🏨', 'tone': '#0F7C7A', 'gics': 'Consumer Discretionary',
        'desc': 'Accommodation for visitors: nature, water or a coastline, a calm setting, an airport or railway within reach and property at moderate cost.',
        'intro': 'Setting and access for guests first, then property costs.',
        'weights': {'environment': 30, 'coast': 20, 'mobility': 20, 'lifestyle': 10, 'affordability': 10, 'safety': 10},
        'must': [],
        'minPop': 1000},
}

# KPIs come from the KPI framework (build/kpi_catalogue.py): households and businesses, with the profiles that need them.
sys_path = os.path.dirname(os.path.abspath(__file__))
import sys; sys.path.insert(0, sys_path)
from kpi_catalogue import K as KPIS


def swiss_campus_km(meta):
    """Switzerland has campus access as a score, not as a distance. For the business must-have 'a university town within
    30 km' this adds fr.student_anchor_km: the straight-line distance to the nearest town on meta.config.studentHubsCH."""
    import math
    hubs = meta['config'].get('studentHubsCH') or []
    p = os.path.join(ROOT, 'data', 'c', 'CH.json'); sh = json.load(open(p))
    c = sh['cols']; iN, iLa, iLo = c.index('name'), c.index('lat'), c.index('lon')
    pts = [(r[iLa], r[iLo]) for r in sh['rows'] if r[iN] in hubs and r[iLa] is not None]
    if not pts: return
    def hav(a, b, c2, d):
        R = 6371.0; p1, p2 = math.radians(a), math.radians(c2); dp, dl = p2 - p1, math.radians(d - b)
        return 2 * R * math.asin(math.sqrt(math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2))
    sh['fr']['student_anchor_km'] = [None if r[iLa] is None else round(min(hav(r[iLa], r[iLo], q[0], q[1]) for q in pts), 1) for r in sh['rows']]
    json.dump(sh, open(p, 'w'), separators=(',', ':'), ensure_ascii=False)
    print('CH campus distance for', len(sh['rows']), 'places from', len(pts), 'university towns')


def main():
    p = os.path.join(ROOT, 'data', 'meta.json')
    meta = json.load(open(p))
    cfg = meta['config']
    for k, d in PROFILES.items():
        cfg['profiles'][k] = {'name': d['name'], 'desc': d['desc'], 'intro': d['intro'], 'weights': d['weights'], 'strict': {}, 'must': d['must'],
                              'unknownMust': 'flag', 'minPop': d['minPop'], 'business': True, 'gics': d.get('gics', '')}
        cfg.setdefault('icons', {})[k] = d['icon']
        cfg.setdefault('tones', {})[k] = d['tone']
    # site-fit criterion ('focus'): the labour pool, land and wage costs, the industry base or the town's own pull, from
    # factors that exist per place. Property prices stand in for land costs; local income stands in for wage levels
    # (a lower one counts as cheaper staff) until the KPI data from the acquisition task arrives.
    fac = meta['factors']
    cost = [f['id'] for f in fac if f.get('score_role') == 'scored' and f['category'] == 'affordability' and any(w in f['id'] for w in ('price', 'rent'))]
    income = [f['id'] for f in fac if f.get('score_role') == 'scored' and f['category'] == 'jobs' and any(w in f['id'] for w in ('income', 'pay', 'wage'))]
    skills = [f['id'] for f in fac if f.get('score_role') == 'scored' and any(w in f['id'] for w in ('tertiary', 'degree', 'gigabit', 'level3'))]
    labour = {'geo_catchment_30km': 3, 'working_age_share_pct': 1, 'at_working_age_share': 1, 'jobs_per_1000_residents': 1, 'workplaces_per_1000_residents': 2}
    FOCUS = {
        # industry: labour pool, land costs and the region's economic base (not poverty: low incomes alone attract no plant)
        'industrial': dict(labour, **{k: 1 for k in cost}, n_gdp_pps_region=1, n_unemployment_region=1),
        'office': dict({'geo_catchment_30km': 2, 'tertiary_jobs_share': 1, 'n_gdp_pps_region': 2, 'workplaces_per_1000_residents': 1}, **{k: 2 for k in skills}),
        'backoffice': dict({'geo_catchment_30km': 3, 'working_age_share_pct': 1, 'at_working_age_share': 1}, **{k: 1 for k in skills}),
        'retail': {'common_population_scale': 3, 'geo_catchment_30km': 2, 'workplaces_per_1000_residents': 1, 'n_supermarkets_10k': 1},
    }
    KIND = {'biz_manufacturing': 'industrial', 'biz_logistics': 'industrial', 'biz_port_industry': 'industrial', 'biz_energy_intensive': 'industrial', 'biz_food_processing': 'industrial',
            'biz_fulfilment': 'industrial', 'biz_datacenter': 'industrial', 'biz_workshop': 'industrial', 'biz_pharma_production': 'office', 'biz_tech': 'office', 'biz_lab': 'office',
            'biz_hq': 'office', 'biz_studio': 'office', 'biz_startup': 'office', 'biz_services': 'backoffice', 'biz_contact_center': 'backoffice', 'biz_finance': 'office', 'biz_semis': 'industrial', 'biz_auto': 'industrial', 'biz_aero': 'industrial', 'biz_cleantech': 'industrial', 'biz_media': 'office', 'biz_clinic': 'retail',
            'biz_shop': 'retail', 'biz_cafe': 'retail', 'biz_practice': 'retail', 'biz_guesthouse': None}
    for k, kind in KIND.items():
        if kind and k in cfg['profiles'] and 'focus' in cfg['profiles'][k]['weights']:
            cfg['profiles'][k]['focus'] = FOCUS[kind]   # the 'focus' weight is set per profile above
    # where similar companies already operate: the industry cluster leads every company-site profile (applies wherever
    # the industry data exists; build_clusters.py)
    # the industry cluster weight (40) is added by build_clusters.py only where industry data exists
    # what the map pins around an open place show, by target group (owner request 24 Oct): a student sees universities,
    # a chemical plant ports and chemical parks (pipelines), a lab universities and research institutions, and so on.
    # Kinds: air (hub airport), port (seaport or inland port), chem (chemical park), uni (university / UAS, nearest 3),
    # res (research institution, nearest 2), city (city of 100,000+)
    AK = {'default': ['air', 'city', 'uni1', 'res1'], 'student': ['uni3', 'city'], 'young_professional': ['city', 'air', 'uni1', 'res1'], 'commuter': ['city'], 'car_free': ['city'],
          'expat_professional': ['air', 'city', 'uni1', 'res1'], 'hnw': ['air', 'city'], 'swiss_lottery': ['air', 'city'], 'remote': ['air', 'city'], 'business_owner': ['air', 'city', 'uni1', 'res1'],
          'biz_manufacturing': ['port', 'air', 'uni1', 'res1'], 'biz_energy_intensive': ['chem', 'port', 'city'], 'biz_port_industry': ['port', 'chem', 'city'],
          'biz_food_processing': ['port', 'city'], 'biz_logistics': ['port', 'air', 'city'], 'biz_fulfilment': ['city', 'air', 'port'],
          'biz_pharma_production': ['air', 'uni2', 'res2', 'chem'], 'biz_lab': ['uni3', 'res2', 'air'], 'biz_tech': ['uni2', 'res1', 'air'],
          'biz_datacenter': ['city', 'uni1'], 'biz_finance': ['fin', 'air', 'city'], 'biz_semis': ['uni2', 'air', 'city'], 'biz_auto': ['port', 'air', 'city'], 'biz_aero': ['air', 'uni2', 'res1'], 'biz_cleantech': ['chem', 'port', 'city'], 'biz_media': ['city', 'uni1', 'air'], 'biz_clinic': ['city'], 'biz_hq': ['air', 'city', 'uni1', 'res1'], 'biz_services': ['city', 'air', 'uni1', 'res1'], 'biz_contact_center': ['city', 'uni1']}
    cfg['anchorKinds'] = AK
    cfg['bizOrder'] = list(PROFILES)
    small = ['biz_shop', 'biz_cafe', 'biz_workshop', 'biz_practice', 'biz_studio', 'biz_startup', 'biz_guesthouse']
    # company sites grouped like GICS sectors; small businesses stay together
    # small-business profiles are dormant (owner decision 24 Oct): kept in the config so links keep working, not offered
    cfg['bizDormant'] = small
    cfg['bizOrder'] = [k for k in cfg['bizOrder'] if k not in small]
    # the site types companies relocate or open most often (fDi Markets project counts by activity, CBRE/JLL industrial and
    # office demand): offered first on the start card; the others stay one click away under "More business types"
    # countries without any motorway / railway in the source map (nearest one more than 40 km from every place)
    nonet = {'mway_km': [], 'rail_km': []}
    for fx in sorted(os.listdir(os.path.join(ROOT, 'data', 'x'))):
        if fx.startswith('_') or not fx.endswith('.json'): continue
        xc = json.load(open(os.path.join(ROOT, 'data', 'x', fx))).get('cols', {})
        for kk in nonet:
            vals = [v for v in xc.get(kk) or [] if v is not None]
            if vals and min(vals) > 40: nonet[kk].append(fx[:-5])
    cfg['noNetwork'] = nonet
    cfg['bizTop'] = ['biz_logistics', 'biz_manufacturing', 'biz_tech', 'biz_hq', 'biz_services', 'biz_lab', 'biz_datacenter', 'biz_finance']
    cfg['bizGroups'] = [['Industry and materials', ['biz_manufacturing', 'biz_auto', 'biz_aero', 'biz_semis', 'biz_cleantech', 'biz_energy_intensive', 'biz_port_industry', 'biz_food_processing', 'biz_pharma_production']],
                        ['Logistics', ['biz_logistics', 'biz_fulfilment']],
                        ['Offices and technology', ['biz_tech', 'biz_media', 'biz_datacenter', 'biz_lab', 'biz_hq', 'biz_services', 'biz_contact_center']],
                        ['Finance and health care', ['biz_finance', 'biz_clinic']],
                        ]
    assert sorted(k for g in cfg['bizGroups'] for k in g[1]) + sorted(small) == sorted(PROFILES) or sorted(k for g in cfg['bizGroups'] for k in g[1] + []) == sorted(set(PROFILES) - set(small)), 'every active business profile sits in one group'
    # every profile (household and business) lists its KPIs, grouped by domain in catalogue order
    # the KPI framework lives in its own file (loaded on demand), not in meta.json, so the start stays fast
    for k in ('kpis', 'bizKpis'): cfg.pop(k, None)
    for pd in cfg['profiles'].values(): pd.pop('kpis', None)
    json.dump({'kpis': {k: {f: v[f] for f in ('name', 'unit', 'match', 'domain', 'audience', 'level')} for k, v in KPIS.items()},
               'byProfile': {pk: [k for k, v in KPIS.items() if pk in v['profiles']] for pk in cfg['profiles']}},
              open(os.path.join(ROOT, 'data', 'kpis.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    cfg['order'] = [k for k in cfg['order'] if k not in PROFILES]       # household lists stay as they were
    meta['categoryLabels']['freight'] = 'Freight access (motorway, rail, port)'
    meta['categoryLabels']['cluster'] = 'Industry cluster (similar companies already here)'
    meta['categoryLabels']['campus'] = 'Universities in town (universities and universities of applied sciences within 10 km)'
    # students choose a university town: the campus measure leads the student profile (owner request 24 Oct)
    st = cfg['profiles'].get('student')
    if st:
        st['weightsV1'] = {'student_access': 42, 'lifestyle': 18, 'affordability': 13, 'safety': 9, 'jobs': 8, 'foundation': 6, 'demographics': 4}   # audited v86 weights, kept for method v1
        st['weights'] = {'campus': 40, 'student_access': 15, 'lifestyle': 20, 'affordability': 10, 'safety': 7, 'foundation': 8}
    # household profiles rebuilt on what these groups choose by (2.11, ranking audit): retirees and remote workers choose a
    # mild climate, services within reach and an airport, not empty land; tiny villages no longer lead. Old weights kept
    # for the legacy method (weightsV1).
    HH = {
        'pensioner': ({'health': 20, 'climate': 16, 'safety': 14, 'services': 12, 'affordability': 10, 'quiet': 10, 'mobility': 7, 'tax': 6, 'coast': 5}, 2000),
        'single_pensioner': ({'health': 24, 'safety': 18, 'services': 16, 'affordability': 12, 'climate': 10, 'quiet': 8, 'mobility': 8, 'tax': 4}, 2000),
        'early_retiree': ({'climate': 16, 'health': 14, 'lifestyle': 14, 'tax': 14, 'services': 10, 'safety': 10, 'environment': 8, 'quiet': 8, 'affordability': 4, 'mobility': 2}, 2500),
        'remote': ({'services': 16, 'affordability': 16, 'climate': 14, 'mobility': 14, 'safety': 10, 'lifestyle': 10, 'quiet': 8, 'tax': 6, 'health': 3, 'foundation': 3}, 5000),
        'coastal': ({'coast': 28, 'climate': 12, 'environment': 10, 'affordability': 10, 'health': 10, 'safety': 10, 'mobility': 8, 'services': 6, 'quiet': 6}, 2000),
        'budget': ({'affordability': 38, 'tax': 10, 'safety': 12, 'jobs': 12, 'services': 10, 'foundation': 8, 'mobility': 6, 'health': 4}, 2000),
        # profile audit (25 Oct): what each group really chooses by
        'young_family': ({'family': 24, 'safety': 16, 'affordability': 16, 'commuter_access': 12, 'quiet': 8, 'services': 8, 'foundation': 6, 'health': 6, 'tax': 2, 'environment': 2}, 1000),
        'single_parent': ({'family': 22, 'affordability': 24, 'safety': 16, 'services': 14, 'commuter_access': 12, 'quiet': 8, 'foundation': 4}, 5000),
        'low_income': ({'affordability': 40, 'jobs': 16, 'commuter_access': 14, 'services': 12, 'safety': 12, 'foundation': 6}, 3000),
        'low_income_family': ({'affordability': 30, 'family': 20, 'safety': 16, 'services': 12, 'commuter_access': 10, 'quiet': 8, 'foundation': 4}, 3000),
        'first_home': ({'affordability': 30, 'commuter_access': 18, 'safety': 12, 'jobs': 12, 'family': 10, 'services': 8, 'quiet': 4, 'foundation': 4, 'tax': 2}, 3000),
        'digital_native': ({'city': 22, 'campus': 14, 'lifestyle': 14, 'affordability': 14, 'commuter_access': 12, 'jobs': 12, 'demographics': 6, 'mobility': 6}, 5000),
        'urban': ({'city': 30, 'lifestyle': 22, 'commuter_access': 16, 'jobs': 14, 'safety': 8, 'foundation': 6, 'health': 4}, 5000),
        'car_free': ({'city': 30, 'commuter_access': 26, 'services': 14, 'lifestyle': 12, 'jobs': 10, 'safety': 8}, 4000),
        'single': ({'jobs': 24, 'city': 18, 'commuter_access': 18, 'lifestyle': 16, 'safety': 8, 'affordability': 8, 'foundation': 8}, 5500),
        'young_professional': ({'commuter_access': 24, 'jobs': 22, 'city': 18, 'lifestyle': 16, 'foundation': 8, 'safety': 6, 'affordability': 6}, 5000),
        'dinks': ({'lifestyle': 26, 'jobs': 24, 'commuter_access': 18, 'city': 16, 'safety': 8, 'foundation': 6, 'tax': 2}, 9000),
        'expat_professional': ({'jobs': 22, 'lifestyle': 18, 'mobility': 18, 'city': 12, 'foundation': 12, 'safety': 10, 'health': 8}, 5000),
        'student': ({'unitown': 30, 'campus': 25, 'city': 10, 'lifestyle': 10, 'student_access': 10, 'affordability': 10, 'safety': 5}, 10000),
        'climate': ({'climaterisk': 30, 'environment': 14, 'safety': 14, 'health': 12, 'services': 10, 'affordability': 10, 'foundation': 6, 'mobility': 4}, 2000),
        'nature': ({'environment': 30, 'quiet': 12, 'safety': 12, 'affordability': 12, 'tax': 8, 'health': 8, 'services': 8, 'mobility': 4, 'demographics': 4, 'family': 2}, 800),
        'rural_value': ({'affordability': 26, 'environment': 22, 'safety': 14, 'quiet': 10, 'tax': 10, 'foundation': 8, 'health': 6, 'jobs': 4}, 800),
        'hnw': ({'tax': 28, 'lifestyle': 20, 'foundation': 14, 'health': 12, 'safety': 10, 'quiet': 8, 'jobs': 4, 'mobility': 2, 'environment': 2}, 1000),
        'healthcare_first': ({'health': 40, 'safety': 18, 'foundation': 12, 'mobility': 10, 'affordability': 8, 'quiet': 6, 'lifestyle': 4, 'tax': 2}, 2000),
    }
    # what each group dislikes nearby (2.11.3), scored in the 'quiet' category (engine.nuisances)
    AVOID = {'young_family': ['mway', 'air', 'chem', 'crowd', 'flood'], 'low_income_family': ['chem', 'flood'], 'single_parent': ['chem', 'flood'],
             'pensioner': ['steep', 'mway', 'air', 'flood', 'crowd'], 'single_pensioner': ['steep', 'mway', 'air', 'flood'],
             'early_retiree': ['mway', 'air', 'crowd'], 'remote': ['mway', 'air'], 'coastal': ['chem', 'port', 'flood'],
             'first_home': ['chem', 'flood'], 'nature': ['mway', 'air', 'chem', 'crowd', 'air_quality'], 'rural_value': ['mway', 'air', 'chem', 'crowd'],
             'hnw': ['mway', 'air', 'chem', 'crowd'], 'healthcare_first': ['flood', 'steep']}
    for k, lst in AVOID.items():
        if k in cfg['profiles']: cfg['profiles'][k]['avoid'] = lst
    # what each group needs (2.11.3): the 'How it meets your needs' panel. [label, categories that measure it, gap note]
    # A need without data is listed as such, so a missing measure is visible instead of silently ignored.
    SCHOOLS = ['Schools and childcare nearby', [], 'no school or childcare counts per place yet (OpenStreetMap import pending)']
    NEEDS = {
      'young_family': [['Safe streets and neighbourhood', ['safety']], SCHOOLS, ['Other families around', ['family']], ['Homes you can afford', ['affordability']], ['A manageable commute', ['commuter_access']], ['Doctors and shops close by', ['health', 'services']], ['Quiet: no motorway, flight path or chemical plant next door', ['quiet']]],
      'low_income_family': [['Homes you can afford', ['affordability']], SCHOOLS, ['Other families around', ['family']], ['Safe streets', ['safety']], ['Shops, doctors and transport close by', ['services']], ['Work within reach', ['commuter_access']], ['No chemical plant or flood risk next door', ['quiet']]],
      'single_parent': [['Homes you can afford', ['affordability']], SCHOOLS, ['Safe streets', ['safety']], ['Everything close by, without a second car', ['services']], ['Work within reach', ['commuter_access']], ['Other families around', ['family']]],
      'low_income': [['Rent you can afford', ['affordability']], ['Jobs within reach', ['jobs', 'commuter_access']], ['Shops, doctors and transport close by', ['services']], ['Safe streets', ['safety']]],
      'first_home': [['Homes you can afford', ['affordability']], ['A manageable commute', ['commuter_access']], ['A solid job market', ['jobs']], ['Safe streets', ['safety']], ['No flood risk or heavy industry next door', ['quiet']]],
      'budget': [['Low housing costs', ['affordability']], ['Low taxes', ['tax']], ['Jobs within reach', ['jobs']], ['Safe streets', ['safety']]],
      'pensioner': [['Doctors and a hospital within easy reach', ['health']], ['A mild, sunny climate', ['climate']], ['Safe streets', ['safety']], ['Shops and services close by', ['services']], ['Flat, quiet surroundings', ['quiet']], ['Costs and taxes that suit a pension', ['affordability', 'tax']]],
      'single_pensioner': [['Doctors and a hospital within easy reach', ['health']], ['Safe streets', ['safety']], ['Shops and services close by', ['services']], ['Costs that suit a pension', ['affordability']], ['Flat, quiet surroundings', ['quiet']]],
      'early_retiree': [['Climate and daylight', ['climate']], ['Good healthcare', ['health']], ['Things to do', ['lifestyle']], ['Taxes on income and wealth', ['tax']], ['No traffic or aircraft noise', ['quiet']]],
      'remote': [['Shops and services close by', ['services']], ['Costs', ['affordability']], ['Climate and daylight', ['climate']], ['Connections for the trips you still make', ['mobility']], ['Quiet surroundings', ['quiet']], ['Fast internet', [], 'broadband per place is not in the data yet']],
      'student': [['A real university town', ['unitown', 'campus']], ['Student life', ['lifestyle', 'city']], ['Rent you can afford', ['affordability']], ['Getting to lectures', ['student_access']]],
      'single': [['Jobs', ['jobs']], ['City life', ['city', 'lifestyle']], ['A short commute', ['commuter_access']]],
      'young_professional': [['A short commute to work', ['commuter_access']], ['Jobs', ['jobs']], ['City life', ['city', 'lifestyle']]],
      'dinks': [['Restaurants, culture, things to do', ['lifestyle']], ['Two careers', ['jobs']], ['A short commute', ['commuter_access']], ['City life', ['city']]],
      'urban': [['Big-city life', ['city']], ['Restaurants, culture, nightlife', ['lifestyle']], ['A short commute', ['commuter_access']], ['Jobs', ['jobs']]],
      'car_free': [['Everything within walking distance or a short ride', ['city', 'services']], ['Public transport to work', ['commuter_access']], ['Things to do', ['lifestyle']]],
      'digital_native': [['City life', ['city']], ['Universities and young people', ['campus', 'demographics']], ['Costs', ['affordability']], ['Things to do', ['lifestyle']]],
      'commuter': [['A short commute to a big job centre', ['commuter_access']], ['Jobs', ['jobs']], ['Costs', ['affordability']]],
      'expat_professional': [['Jobs', ['jobs']], ['An international airport', ['mobility']], ['Things to do', ['lifestyle']], ['City life', ['city']], ['International schools', [], 'international schools per place are not in the data yet']],
      'healthcare_first': [['Doctors and hospitals', ['health']], ['Safe streets', ['safety']], ['No flood risk or steep terrain', ['quiet']]],
      'nature': [['Green and open land', ['environment']], ['Quiet: no motorway, airport or industry', ['quiet']], ['Safe streets', ['safety']], ['Costs', ['affordability']]],
      'rural_value': [['Low housing costs', ['affordability']], ['Green and open land', ['environment']], ['Quiet surroundings', ['quiet']], ['Safe streets', ['safety']]],
      'hnw': [['Taxes on income and wealth', ['tax']], ['Restaurants, culture, things to do', ['lifestyle']], ['Good healthcare', ['health']], ['Quiet, private surroundings', ['quiet']]],
      'climate': [['Low exposure to floods and heat', ['climaterisk']], ['Green and open land', ['environment']], ['Safe streets', ['safety']], ['Healthcare', ['health']]],
      'coastal': [['The sea on your doorstep', ['coast']], ['Climate', ['climate']], ['No heavy industry or flood risk nearby', ['quiet']], ['Healthcare', ['health']]],
      'business_owner': [['A strong local economy', ['jobs']], ['Low business and income taxes', ['tax']], ['Connections', ['mobility']]],
      'biz_manufacturing': [['Freight access: motorway, rail and port', ['freight']], ['Labour costs and a skilled workforce', ['focus', 'student_access']], ['Similar companies nearby', ['cluster']], ['Flat land for a plant', ['flatland']], ['Industrial plots, power and permits', [], 'plot, grid and permit data per place are not public']],
      'biz_logistics': [['The home market within a day', ['domreach', 'reach300']], ['Freight access: motorway, rail and port', ['freight']], ['Logistics companies already there', ['cluster']], ['Labour and land costs', ['focus']], ['Flat land', ['flatland']]],
      'biz_fulfilment': [['Many consumers within 100 km', ['reach']], ['Freight access', ['freight']], ['A large labour pool at fair cost', ['focus']], ['Flat land', ['flatland']]],
      'biz_port_industry': [['A major sea or inland port', ['portaccess']], ['A chemical park with pipelines', ['chempark']], ['Freight access', ['freight']], ['Similar companies nearby', ['cluster']]],
      'biz_energy_intensive': [['Energy and site costs', ['focus']], ['Freight access', ['freight']], ['A chemical park or port nearby', ['chempark', 'portaccess']], ['Industrial power prices per site', [], 'grid prices per site are not public']],
      'biz_food_processing': [['Freight access', ['freight']], ['Labour and site costs', ['focus']], ['Consumers within reach', ['reach']], ['Food companies already there', ['cluster']]],
      'biz_pharma_production': [['Graduates and universities', ['student_access', 'campus']], ['Skilled labour and costs', ['focus']], ['An international airport', ['mobility']], ['Pharma and medtech companies nearby', ['cluster']]],
      'biz_lab': [['Universities and graduates', ['student_access', 'campus']], ['Research talent and costs', ['focus']], ['An international airport', ['mobility']], ['Labs and research institutes nearby', ['cluster']]],
      'biz_tech': [['Graduates and universities', ['student_access', 'campus']], ['Talent and pay levels', ['focus']], ['Airport and city connections', ['mobility']], ['A place people want to live', ['lifestyle']], ['Tech companies nearby', ['cluster']]],
      'biz_services': [['Labour costs and language skills', ['focus']], ['Connections', ['mobility']], ['Graduates', ['student_access']], ['Safe surroundings', ['safety']]],
      'biz_hq': [['An international airport and fast connections', ['mobility']], ['Talent and taxes', ['focus']], ['Market reach', ['reach']], ['A place executives want to live', ['lifestyle']]],
      'biz_contact_center': [['Labour costs and language skills', ['focus']], ['Graduates and young workers', ['student_access']], ['Public transport for shift workers', ['mobility']]],
      'biz_datacenter': [['Power costs and a technical workforce', ['focus']], ['Fibre and connections', ['mobility']], ['Low flood and heat exposure', ['climaterisk']], ['Flat land', ['flatland']], ['Grid capacity per site', [], 'grid capacity per site is not public']],
      'biz_finance': [['A financial centre within commuting distance', ['finhub']], ['Finance talent and pay levels', ['focus']], ['A hub airport', ['mobility']], ['A city people want to live in', ['lifestyle']], ['Financial firms already there', ['cluster']]],
      'biz_semis': [['Engineers and a university nearby', ['campus']], ['A hub airport for high-value freight', ['mobility']], ['Flat land with low flood and heat exposure', ['flatland', 'climaterisk']], ['Electronics firms already there', ['cluster']]],
      'biz_auto': [['Freight access: motorway and rail', ['freight']], ['Plants to supply within a day', ['reach300', 'domreach']], ['A skilled workforce at fair cost', ['focus']], ['Flat land', ['flatland']], ['Automotive firms already there', ['cluster']]],
      'biz_aero': [['An airport close by', ['mobility']], ['Engineers and graduates', ['campus', 'student_access']], ['A skilled industrial workforce', ['focus']], ['Aerospace firms already there', ['cluster']]],
      'biz_cleantech': [['Large flat sites', ['flatland']], ['Power, land and labour at fair cost', ['focus']], ['Freight access', ['freight']], ['A chemical park for materials', ['chempark']], ['Low flood and heat exposure', ['climaterisk']]],
      'biz_media': [['A big creative city', ['city', 'lifestyle']], ['Graduates', ['campus']], ['Connections', ['mobility']], ['Media and games companies already there', ['cluster']]],
      'biz_clinic': [['Many patients within reach', ['reach']], ['An older population', ['demographics']], ['Spending power and staff', ['focus']], ['Access by car and transit', ['mobility']]],
      'biz_shop': [['People and footfall nearby', ['foundation', 'demographics']], ['Rents and local spending power', ['focus']], ['A lively centre', ['lifestyle']], ['Easy to reach', ['mobility']]],
      'biz_cafe': [['A lively centre with visitors', ['lifestyle']], ['People nearby', ['foundation', 'demographics']], ['Rents and spending power', ['focus']]],
      'biz_workshop': [['Low rents for a workshop', ['affordability']], ['Customers and labour nearby', ['focus', 'demographics']], ['Freight access', ['freight']]],
      'biz_practice': [['Patients or clients nearby', ['demographics']], ['Healthcare demand and supply', ['health']], ['Rents', ['affordability']], ['Spending power', ['focus']]],
      'biz_studio': [['A creative scene', ['lifestyle']], ['Graduates', ['student_access']], ['Clients and costs', ['focus']], ['Connections', ['mobility']]],
      'biz_startup': [['Graduates and universities', ['student_access']], ['Talent and costs', ['focus']], ['A lively city', ['foundation', 'lifestyle']]],
      'biz_guesthouse': [['Landscape and nature', ['environment']], ['The coast', ['coast']], ['Getting there', ['mobility']], ['Visitors and things to do', ['lifestyle']]],
    }
    # factor names say what the figure is, not how it is scored (2.11.3)
    RENAME = {'common_low_crowding': 'Crowding (people per km² nearby)', 'low_social_assistance_rate': 'Social-assistance rate', 'common_density_balance': 'Population density',
              'density_people_km2': 'Population density', 'elderly_share_balance': 'Share of residents aged 65+', 'household_size_balance': 'Average household size',
              'settlement_area_balance': 'Built-up share of the land', 'secondary_jobs_balance': 'Share of jobs in industry', 'vacancy_rate_balance': 'Vacant dwellings',
              'at_elderly_share_balance': 'Share of residents aged 65+'}
    for f in meta['factors']:
        if f['id'] in RENAME: f['name'] = RENAME[f['id']]
        # new building is market activity, not cost: real estate in the current method (the legacy method is unchanged)
        if f['id'] in ('new_housing_per_1000', 'vacancy_rate_balance'): f['category'] = 'affordability'; f['categoryV2'] = 'realestate'   # availability and building activity, not cost
    for k, lst in NEEDS.items():
        if k in cfg['profiles']: cfg['profiles'][k]['needs'] = lst
    meta['categoryLabels']['quiet'] = 'Fewer nuisances (traffic and aircraft noise, heavy industry, flooding, crowding)'
    # minimum sizes until 2.12.0 (kept for the legacy method v1)
    MINPOP_V1 = {'young_family': 1000, 'low_income': 800, 'low_income_family': 1000, 'single_parent': 1500, 'pensioner': 800, 'single_pensioner': 1200, 'early_retiree': 2500,
                 'single': 5500, 'young_professional': 5000, 'dinks': 9000, 'remote': None, 'car_free': 4000, 'student': 2500, 'first_home': 1000, 'budget': None,
                 'urban': 5000, 'expat_professional': 5000, 'healthcare_first': 1500, 'nature': None, 'rural_value': None, 'hnw': 4500, 'climate': None, 'coastal': 800, 'digital_native': 5000}
    for k, (w, mp) in HH.items():
        pr = cfg['profiles'].get(k)
        if not pr: continue
        pr.setdefault('weightsV1', dict(pr['weights'])); pr['weights'] = w
        # minimum sizes stay as in 2.10.3 (owner rule: no narrowing without agreement); the proposed ones are listed in the report
        if 'minPopV1' in pr: pr['minPop'] = pr.pop('minPopV1')   # undo the raise of an earlier 2.11 build
        pr['minPopProposed'] = mp
        pr['minPopV1'] = MINPOP_V1.get(k, pr.get('minPop'))   # the legacy method keeps its sizes (49 fixtures reproduce exactly)
        pr['minPop'] = mp   # owner OK 31 Oct 2026: the proposed minimum sizes apply in the current method
    # new household profiles (2.12, owner request 31 Oct: more profiles)
    NEWHH = {
        'outdoor': {'name': 'Outdoor and mountain lover', 'icon': '🏔️',
                    'desc': 'Mountains, lakes and open land on the doorstep, quiet surroundings, safety, a doctor and shops within reach.',
                    'intro': 'Mountains, lakes and nature first, then quiet, safety and basic services.',
                    'weights': {'outdoor': 35, 'environment': 15, 'quiet': 10, 'safety': 10, 'health': 8, 'services': 8, 'affordability': 8, 'mobility': 6},
                    'avoid': ['mway', 'air', 'chem', 'crowd'], 'minPop': 1000,
                    'needs': [['Mountains, lakes or the sea close by', ['outdoor']], ['Green and open land', ['environment']], ['Quiet surroundings', ['quiet']], ['Safe streets', ['safety']], ['A doctor and shops', ['services']]]},
        'sun_retiree': {'name': 'Retiring abroad (sun and coast)', 'icon': '🌅', 'desc': 'Retiring to a mild, sunny coast: a warm climate and the sea first, then health care, safety, costs, services and an airport for visits home.', 'intro': 'Sun and sea first, then health care, safety, costs and an airport.', 'weights': {'climate': 28, 'coast': 18, 'health': 16, 'safety': 12, 'affordability': 10, 'services': 8, 'mobility': 8}, 'minPop': 1000, 'needs': [['A mild, sunny climate', ['climate']], ['The sea nearby', ['coast']], ['Health care', ['health']], ['Safe streets', ['safety']], ['Costs', ['affordability']], ['An airport for visits home', ['mobility']]]},
        'cross_border': {'name': 'Cross-border commuter', 'icon': '🛂',
                         'desc': 'Living near a national border to work on the other side: a short way to the border, lower housing costs than the job side, everyday services and safety.',
                         'intro': 'A border close by and lower costs first, then services, safety and connections.',
                         'weights': {'border': 35, 'affordability': 14, 'services': 13, 'safety': 12, 'mobility': 12, 'commuter_access': 8, 'tax': 6},
                         'must': [M('xb_s', '>=', 1, 'a border within 45 km where pay is higher on the other side', 'score')],
                         'avoid': ['chem'], 'minPop': 1000,
                         'needs': [['A national border within a short drive', ['border']], ['Lower housing costs', ['affordability']], ['Services nearby', ['services']], ['Safe streets', ['safety']], ['Connections', ['mobility']]]}}
    for k, d in NEWHH.items():
        cfg['profiles'][k] = dict(d, minPopProposed=1000)
        if k not in cfg['order']: cfg['order'].insert(cfg['order'].index('nature') + 1 if 'nature' in cfg['order'] else len(cfg['order']), k)
        cfg.setdefault('icons', {})[k] = d['icon']
    # 2.14 evidence audit (docs/audit/evidence_audit_2.13.3.json): for these profiles the top 30 places of a country were
    # losing residents in most countries (rural value 0 of 18, budget and low income 0-1 of 7): low prices alone point to
    # places people leave. They now also weigh whether people move to a place (population change and net migration).
    VITALITY = {'rural_value': 10, 'nature': 8, 'budget': 8, 'low_income': 8, 'outdoor': 8, 'coastal': 8, 'remote': 8, 'climate': 8, 'sun_retiree': 8}
    for k, wv in VITALITY.items():
        pr = cfg['profiles'].get(k)
        if not pr or (pr.get('weights', {}).get('demographics') or 0) >= wv: continue
        pr['weights'] = dict(pr['weights'], demographics=wv)
        if pr.get('needs') is not None and not any('demographics' in n[1] for n in pr['needs']): pr['needs'].append(['A place people move to, not one they leave', ['demographics']])
    meta['categoryLabels']['outdoor'] = 'Mountains and water (terrain relief, lakes and the sea nearby)'
    meta['categoryLabels']['border'] = 'National border nearby (straight line)'
    meta['categoryLabels']['domreach'] = 'Home market (residents of the same country within 150 km)'
    meta['categoryLabels']['reach300'] = 'One-day truck radius (residents within 300 km, across borders)'
    meta['categoryLabels']['unitown'] = 'University-town character (universities relative to the people nearby)'
    meta['categoryLabels']['city'] = 'City scale (people within 10 km: big-city life, transit, scenes)'
    meta['categoryLabels']['climaterisk'] = 'Climate exposure (estimate: coastal and river flooding, heat; 100 = low)'
    meta['categoryLabels']['climate'] = 'Climate (mild and sunny: climate class and winter daylight)'
    meta['categoryLabels']['services'] = 'Services nearby (people within 10 km: shops, doctors, cafes, transport)'
    for k in ('biz_lab', 'biz_tech', 'biz_pharma_production'):
        if k in cfg['profiles'] and 'campus' not in cfg['profiles'][k]['weights']: cfg['profiles'][k]['weights']['campus'] = 15
    meta['categoryLabels']['portaccess'] = 'Port access (major sea or inland port)'
    meta['categoryLabels']['reach'] = 'Market reach (residents within 100 km, across borders)'
    meta['categoryLabels']['flatland'] = 'Flat land (terrain relief)'
    meta['categoryLabels']['chempark'] = 'Chemical park nearby (sites with pipeline links)'
    for ck, lb in (('finhub', 'Financial centre (banking and capital markets) within commuting distance'), ('insurhub', 'Insurance centre within commuting distance'),
                   ('fundhub', 'Fund domicile or fund centre within commuting distance'), ('commodhub', 'Commodity-trading or gold hub within commuting distance'),
                   ('cryptohub', 'Crypto hub within commuting distance'), ('wealthhub', 'Wealth-management centre within commuting distance')):
        meta['categoryLabels'][ck] = lb
    meta['categoryLabels']['focus'] = 'Site fit (labour pool, costs and local pull for this kind of site)'
    cfg.setdefault('terms', {})['freight'] = ('Freight access, used by business profiles only: straight-line distance to a motorway (100 at 1 km, 0 at 40 km), '
                                             'a main railway (100 at 1 km, 0 at 25 km) and a seaport (100 at 5 km, 0 at 150 km), weighted 50/30/20. Natural Earth 1:10m.')
    # 2.11.2 owner decision (delegated): the divorce rate says little about fit and is sensitive, so it is shown but never scored
    for f in meta['factors']:
        if f['id'] == 'divorce_rate_per_1000': f['not_scored'] = True; f['name'] = 'Divorce rate (shown, not scored)'
    json.dump(meta, open(p, 'w'), separators=(',', ':'), ensure_ascii=False)
    swiss_campus_km(meta)
    print('business profiles', len(PROFILES), list(PROFILES))


if __name__ == '__main__':
    main()
