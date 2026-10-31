#!/usr/bin/env python3
"""US port size (2.10.3): BTS Port Performance 2026 report, delivered 24 Oct 2026 (build/source/deliveries/).
Throughput is 2023 (million short tons; thousand loaded TEU, empties excluded), cranes and terminals are 2025.
Each port in Nestlyzer's sea and inland port lists is linked by hand to the BTS publisher label(s) below; only
these reviewed links are used, never a name guess. Writes data/ports.json: {port name: [[label, {measure: value}], ...]}.
Context only: no score uses it.
    python3 build/build_port_stats.py"""
import csv, json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', 'source', 'deliveries', 'observations_fresh_2026-10-24.csv')
LINK = {  # our port name -> BTS publisher labels (reviewed)
    'Los Angeles / Long Beach': ['Port of Los Angeles, CA', 'Port of Long Beach, CA'], 'Long Beach': ['Port of Long Beach, CA'],
    'Oakland': ['Port of Oakland, CA'], 'Seattle-Tacoma': ['Seattle, WA', 'Tacoma, WA'], 'Portland (Oregon)': ['Port of Portland, OR'],
    'Houston': ['Houston Port Authority, TX'], 'Houston (Barbours Cut / Bayport)': ['Houston Port Authority, TX'], 'Houston (Turning Basin)': ['Houston Port Authority, TX'],
    'New Orleans / South Louisiana': ['New Orleans, LA', 'South Louisiana, LA'], 'Corpus Christi': ['Corpus Christi, TX'],
    'Beaumont': ['Beaumont, TX'], 'Port Arthur': ['Port Arthur, TX'], 'Mobile': ['Mobile, AL'], 'Tampa': ['Tampa Port Authority, FL'],
    'Miami': ['PortMiami, FL', 'Port Miami, FL'], 'Port Everglades': ['Port Everglades, FL'], 'Jacksonville': ['Jacksonville, FL'],
    'Savannah': ['Port of Savannah, GA'], 'Charleston': ['Port of Charleston, SC'], 'Wilmington (NC)': ['Wilmington, NC'],
    'Norfolk / Virginia': ['Virginia, VA', 'Virginia, VA, Port of'], 'Baltimore': ['Baltimore, MD'], 'Philadelphia': ['Philadelphia Regional Port, PA'],
    'New York / New Jersey': ['New York, NY & NJ'], 'Port Newark / Elizabeth': ['New York, NY & NJ'], 'Brooklyn / Red Hook': ['New York, NY & NJ'],
    'Boston': ['Boston, MA'], 'Anchorage': ['Port of Alaska, AK'], 'Honolulu': ["Honolulu, O'ahu, HI", 'Honolulu, Oahu, HI'],
    'Lake Charles': ['Lake Charles Harbor District, LA'], 'Freeport (Texas)': ['Port Freeport, TX'], 'Texas City': ['Texas City, TX'], 'Galveston': ['Galveston, TX'],
    'Pascagoula': ['Port of Pascagoula, MS'], 'Brownsville': ['Brownsville, TX'], 'Plaquemines (Mississippi River)': ['Plaquemines Port District, LA'], 'Valdez': ['Valdez, AK'],
    # inland and Great Lakes ports (build/source/inland_ports.json)
    'Pittsburgh': ['Pittsburgh, PA'], 'St. Louis': ['St. Louis City Port, MO'], 'Memphis': ['Memphis-Shelby County Port, TN'], 'Cincinnati-Northern Kentucky': ['Cincinnati, OH'],
    'Louisville': ['Louisville-Jefferson Port, KY'], 'Chicago (Calumet)': ['Illinois International Port, IL'], 'Duluth-Superior': ['Duluth-Superior, MN and WI'],
    'Baton Rouge': ['Port of Greater Baton Rouge, LA'], 'Tulsa (Catoosa)': ['Tulsa-Rogers County Port, OK'], 'Nashville': ['Nashville, TN'],
    'Toledo': ['Toledo-Lucas County Port, OH'], 'Detroit': ['Detroit-Wayne County Port, MI'], 'Cleveland': ['Cleveland-Cuyahoga Port, OH'],
}
MEAS = {'port_throughput:total_cargo': 'cargo', 'port_throughput:dry_bulk': 'bulk', 'port_throughput:loaded_teu': 'teu', 'port_sts_cranes': 'cranes', 'port_container_terminals': 'terms', 'port_rail_terminals': 'rail'}
by = {}
for r in csv.DictReader(open(SRC, encoding='utf-8-sig')):
    if r['source_id'] != 'US_BTS_PORTS_2026' or r['indicator_id'] not in MEAS: continue
    by.setdefault(r['source_geo_name'], {})[MEAS[r['indicator_id']]] = float(r['value'])
miss = sorted({l for ls in LINK.values() for l in ls if l not in by})
if miss: raise SystemExit('BTS labels not found: ' + ', '.join(miss))
out = {}
for ours, labels in LINK.items():
    seen = []
    for l in labels:
        m = by[l]; key = l.replace('Port Miami, FL', 'PortMiami, FL').replace('Virginia, VA, Port of', 'Virginia, VA').replace('Honolulu, Oahu, HI', "Honolulu, O'ahu, HI")
        hit = next((s for s in seen if s[0] == key), None)
        if hit: hit[1].update({k: v for k, v in m.items() if k not in hit[1]})
        else: seen.append([key, dict(m)])
    out[ours] = seen
meta = {'source': 'U.S. Bureau of Transportation Statistics, Port Performance Freight Statistics 2026 Annual Report (public domain, attribution)',
        'url': 'https://www.bts.gov/sites/bts.dot.gov/files/2026-01/BTS_Port-Performance-2026_Annual-Report_Final%2011326.pdf',
        'periods': {'cargo': 2023, 'bulk': 2023, 'teu': 2023, 'cranes': 2025, 'terms': 2025, 'rail': 2025},
        'units': {'cargo': 'million short tons', 'bulk': 'million short tons', 'teu': 'thousand loaded TEU (empties excluded)', 'cranes': 'ship-to-shore container cranes', 'terms': 'container terminals', 'rail': 'on-dock rail terminals'}}
json.dump({'meta': meta, 'ports': out}, open(os.path.join(ROOT, 'data', 'ports.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
print('port size for', len(out), 'Nestlyzer ports from', len({l for ls in LINK.values() for l in ls}), 'BTS labels')
