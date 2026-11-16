#!/usr/bin/env python3
"""2.15.30 politics tab: state structure (federal ... centralised), memberships, trade blocs and selected agreements
for the 63 countries. Public facts, compiled by hand from treaty and organisation member lists as of June 2026 (each
organisation's official member page is named in ORGS). Live parts (who governs, parties, seats) come from Wikidata
(CC0) in the visitor's browser. Writes data/politics.json. Nothing here is scored.
    python3 build/build_politics.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QID = dict(AE='Q878', AL='Q222', AR='Q414', AT='Q40', AU='Q408', BE='Q31', BG='Q219', BR='Q155', CA='Q16', CH='Q39', CN='Q148', CO='Q739',
           CY='Q229', CZ='Q213', DE='Q183', DK='Q35', EE='Q191', EG='Q79', EL='Q41', ES='Q29', FI='Q33', FR='Q142', HK='Q8646', HR='Q224',
           HU='Q28', ID='Q252', IE='Q27', IL='Q801', IN='Q668', IS='Q189', IT='Q38', JP='Q17', KR='Q884', LI='Q347', LT='Q37', LU='Q32',
           LV='Q211', MA='Q1028', MK='Q221', MT='Q233', MX='Q96', MY='Q833', NL='Q55', NO='Q20', NZ='Q664', PH='Q928', PL='Q36', PT='Q45',
           RO='Q218', RS='Q403', RU='Q159', SA='Q851', SE='Q34', SG='Q334', SI='Q215', SK='Q214', TH='Q869', TR='Q43', TW='Q865', UK='Q145',
           US='Q30', VN='Q881', ZA='Q258')
ISO2 = {'EL': 'GR', 'UK': 'GB'}
# state structure: 1 centralised unitary, 2 decentralised unitary, 3 regionalised (strong regions or devolution), 4 federal
S = {4: 'AE AR AT AU BE BR CA CH DE IN MX MY RU US', 3: 'ES IT UK ZA', 2: 'CO CZ DK FI FR ID JP KR LI NL NO PH PL PT SE HK',
     1: 'AL BG CN CY EE EG EL HR HU IE IL IS LT LU LV MA MK MT NZ RO RS SA SG SI SK TH TR TW VN'}
NOTE = {
 'CH': 'Cantons and municipalities set most income and property tax, schools and police; national referendums several times a year.',
 'DE': 'The 16 Länder run schools, police and local planning; municipalities set business tax (Gewerbesteuer) multipliers.',
 'US': 'States set income and sales tax, labour, licensing and much of daily law; cities and counties add property tax.',
 'AT': 'Nine Länder with own parliaments; tax is mostly federal, Länder run schools, housing subsidies and planning.',
 'BE': 'Regions and language communities run economy, housing, schools and environment; three different regional rule books.',
 'CA': 'Provinces run health, education and add their own income tax; Quebec has its own civil law.',
 'AU': 'States run schools, hospitals, police and property taxes such as stamp duty and land tax.',
 'IN': 'States set many taxes (GST shared), land, labour and business licensing; rules differ widely by state.',
 'BR': 'States set the ICMS sales tax and run security; municipalities set service and property tax.',
 'MX': 'States have own congresses and some taxes; much revenue is federal and shared.',
 'AR': 'Provinces collect turnover tax and own natural resources.', 'MY': 'States control land and religious affairs; tax is federal.',
 'RU': 'Formally federal; in practice power is concentrated in the federal centre.',
 'AE': 'Seven emirates each run own courts, land and business licensing; free zones have own rules.',
 'ES': 'Autonomous communities run health and schools and set part of income, wealth and inheritance tax; Basque Country and Navarre collect their own taxes.',
 'IT': 'Regions run health care and add an income tax surcharge; five regions have special autonomy.',
 'UK': 'Scotland, Wales and Northern Ireland have devolved parliaments; Scotland sets its own income tax bands.',
 'ZA': 'Nine provinces with own legislatures run schools and health; tax is national.',
 'FR': 'Unitary with elected regions, departments and communes; tax and law are mostly national.',
 'HK': 'Special Administrative Region of China with its own law, tax system, currency and customs territory.',
 'LI': 'Principality; the eleven municipalities set a local income tax surcharge.',
 'CN': 'Unitary one-party state; provinces implement central policy.', 'VN': 'Unitary one-party state.',
 'SA': 'Absolute monarchy; regions administer central policy.', 'SG': 'City state: one level of government.',
 'SE': 'Municipalities set most of the income tax.', 'DK': 'Municipalities set most of the income tax.', 'FI': 'Municipalities set a flat local income tax.',
 'NO': 'Municipalities run schools and services; tax rates mostly national.', 'NL': 'Municipalities set property tax (OZB).',
 'PT': 'Azores and Madeira are autonomous regions with lower taxes.', 'JP': 'Prefectures and municipalities add a local inhabitant tax.',
 'KR': 'Provinces and cities add a local income tax.', 'PL': 'Self-governing voivodeships, counties and municipalities share income tax revenue.',
 'CZ': 'Fourteen self-governing regions; tax is national.', 'CO': 'Departments and municipalities with elected governors and mayors.',
 'ID': 'Regions have wide autonomy since 2001; Aceh and the Papua provinces have special status.', 'PH': 'Local governments have own taxing powers; Bangsamoro is autonomous.',
}
ORGS = {  # code: (name, group, what it means for residents, what it means for businesses, official member list)
 'EU': ('European Union', 'market', 'EU citizens can live, work and study here without a permit.', 'Single market: no customs or tariffs with the other 26 member states; one set of product rules.', 'european-union.europa.eu'),
 'EZ': ('Euro area', 'money', 'Pays in euro: no exchange cost or currency risk with 20 other euro countries.', 'No currency risk in trade within the euro area; ECB interest rates.', 'ecb.europa.eu'),
 'SCH': ('Schengen area', 'mobility', 'No passport checks at borders with the other Schengen countries.', 'Staff and goods cross internal borders without checks.', 'home-affairs.ec.europa.eu'),
 'EEA': ('European Economic Area', 'market', 'EU and EEA citizens can live and work here.', 'Full access to the EU single market for goods, services, capital and people.', 'efta.int'),
 'EFTA': ('EFTA', 'trade', 'EFTA citizens can move freely among member states.', 'Free trade agreements with about 40 partners on top of national deals.', 'efta.int'),
 'EUCU': ('EU customs union', 'trade', '', 'Industrial goods move to and from the EU without tariffs.', 'trade.ec.europa.eu'),
 'EUC': ('EU candidate country', 'market', 'On the path to EU membership.', 'EU accession talks: rules are being aligned with the EU.', 'enlargement.ec.europa.eu'),
 'NATO': ('NATO', 'security', 'Collective defence: an attack on one member counts as an attack on all.', 'Part of the NATO security umbrella.', 'nato.int'),
 'OECD': ('OECD', 'standards', 'OECD statistics, schooling (PISA) and tax transparency standards apply.', 'OECD investment, anti-bribery and tax rules (including the 15% global minimum tax).', 'oecd.org'),
 'G7': ('G7', 'forum', '', 'One of the seven largest advanced economies.', 'g7'),
 'G20': ('G20', 'forum', '', 'One of the 20 largest economies.', 'g20.org'),
 'BRICS': ('BRICS', 'forum', '', 'Emerging-economy group with its own New Development Bank.', 'brics'),
 'ASEAN': ('ASEAN', 'trade', 'Visa-free short stays across ASEAN for ASEAN citizens.', 'ASEAN Free Trade Area: almost no tariffs among ten member states.', 'asean.org'),
 'USMCA': ('USMCA / CUSMA', 'trade', '', 'Tariff-free trade across the United States, Mexico and Canada under rules of origin.', 'ustr.gov'),
 'MERCOSUR': ('Mercosur', 'trade', 'Mercosur residence agreement: nationals of member states can live and work here.', 'Customs union with a common external tariff.', 'mercosur.int'),
 'PA': ('Pacific Alliance', 'trade', 'Visa-free travel among member states.', 'Free trade among Chile, Colombia, Mexico and Peru.', 'alianzapacifico.net'),
 'CPTPP': ('CPTPP', 'trade', '', 'Tariff cuts and digital trade rules with 11 Pacific partners and the UK.', 'mfat.govt.nz'),
 'RCEP': ('RCEP', 'trade', '', 'The largest free trade area by population: ASEAN, China, Japan, Korea, Australia and New Zealand.', 'rcepsec.org'),
 'APEC': ('APEC', 'forum', '', 'Asia-Pacific forum; APEC Business Travel Card for faster entry.', 'apec.org'),
 'GCC': ('Gulf Cooperation Council', 'market', 'GCC citizens can live and work in any member state.', 'Gulf common market and customs union.', 'gcc-sg.org'),
 'EAEU': ('Eurasian Economic Union', 'market', 'Common labour market with Armenia, Belarus, Kazakhstan and Kyrgyzstan.', 'Customs union with the other members.', 'eaeunion.org'),
 'SCO': ('Shanghai Cooperation Organisation', 'security', '', 'Eurasian security and economic cooperation.', 'sectsco.org'),
 'CW': ('Commonwealth', 'forum', 'Commonwealth ties: English-language law and education links.', 'Common-law heritage in most members.', 'thecommonwealth.org'),
 'AFCFTA': ('African Continental Free Trade Area', 'trade', '', 'Tariffs are being removed across the African continent.', 'au-afcfta.org'),
 'SACU': ('Southern African Customs Union', 'trade', '', 'Customs union with Botswana, Eswatini, Lesotho and Namibia.', 'sacu.int'),
}
E = lambda s: s.split()
M = {
 'EU': E('AT BE BG CY CZ DE DK EE EL ES FI FR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK'),
 'EZ': E('AT BE BG CY DE EE EL ES FI FR HR IE IT LT LU LV MT NL PT SI SK'),
 'SCH': E('AT BE BG CH CZ DE DK EE EL ES FI FR HR HU IS IT LI LT LU LV MT NL NO PL PT RO SE SI SK'),
 'EEA': E('IS LI NO'), 'EFTA': E('CH IS LI NO'), 'EUCU': E('TR'), 'EUC': E('AL MK RS TR'),
 'NATO': E('AL BE BG CA CZ DE DK EE EL ES FI FR HR HU IS IT LT LU LV MK NL NO PL PT RO SE SI SK TR UK US'),
 'OECD': E('AT AU BE CA CH CO CZ DE DK EE EL ES FI FR HU IE IL IS IT JP KR LT LU LV MX NL NO NZ PL PT SE SI SK TR UK US'),
 'G7': E('CA DE FR IT JP UK US'), 'G20': E('AR AU BR CA CN DE FR ID IN IT JP KR MX RU SA TR UK US ZA'),
 'BRICS': E('AE BR CN EG ID IN RU ZA'), 'ASEAN': E('ID MY PH SG TH VN'), 'USMCA': E('CA MX US'), 'MERCOSUR': E('AR BR'),
 'PA': E('CO MX'), 'CPTPP': E('AU CA JP MX MY NZ SG UK VN'), 'RCEP': E('AU CN ID JP KR MY NZ PH SG TH VN'),
 'APEC': E('AU CA CN HK ID JP KR MX MY NZ PH RU SG TH TW US VN'), 'GCC': E('AE SA'), 'EAEU': E('RU'), 'SCO': E('CN IN RU'),
 'CW': E('AU CA CY IN MT MY NZ SG UK ZA'), 'AFCFTA': E('EG ZA'), 'SACU': E('ZA'),
}
# selected bilateral or regional trade agreements in force (June 2026), beyond the blocs above
FTA = {
 'EU': ['EU–Japan EPA', 'EU–Korea FTA', 'EU–Canada CETA (provisional)', 'EU–UK Trade and Cooperation Agreement', 'EU–Switzerland bilateral agreements', 'EU–Singapore FTA', 'EU–Vietnam FTA', 'EU–New Zealand FTA', 'EU–Mexico Global Agreement', 'EU–Colombia/Peru/Ecuador FTA', 'EU–Southern Africa EPA', 'EU–Turkey customs union', 'EU association agreements with Israel, Egypt and Morocco', 'EU stabilisation agreements with Albania, North Macedonia and Serbia'],
 'CH': ['EU bilateral agreements', 'EFTA network (about 40 partners)', 'China FTA', 'Japan FTA', 'UK trade agreement', 'India (EFTA TEPA)'],
 'NO': ['EFTA network', 'EEA with the EU', 'UK FTA'], 'IS': ['EFTA network', 'EEA with the EU', 'China FTA'], 'LI': ['EFTA network', 'EEA with the EU', 'Customs union with Switzerland'],
 'UK': ['EU Trade and Cooperation Agreement', 'CPTPP', 'Japan CEPA', 'Australia FTA', 'New Zealand FTA', 'Switzerland trade agreement', 'Korea FTA'],
 'US': ['USMCA', 'Korea (KORUS)', 'Australia FTA', 'Singapore FTA', 'Israel FTA', 'Morocco FTA', 'Colombia TPA'],
 'CA': ['USMCA', 'CETA with the EU', 'CPTPP', 'Korea FTA', 'UK continuity agreement'], 'MX': ['USMCA', 'EU Global Agreement', 'CPTPP', 'Pacific Alliance', 'Japan EPA'],
 'JP': ['EU EPA', 'UK CEPA', 'CPTPP', 'RCEP', 'Australia EPA', 'Switzerland FTA', 'Mexico EPA'], 'KR': ['EU FTA', 'US (KORUS)', 'China FTA', 'UK FTA', 'RCEP', 'Canada FTA'],
 'AU': ['US FTA', 'China (ChAFTA)', 'Japan EPA', 'UK FTA', 'New Zealand CER', 'India ECTA', 'CPTPP', 'RCEP'], 'NZ': ['Australia CER', 'China FTA', 'EU FTA', 'UK FTA', 'CPTPP', 'RCEP'],
 'SG': ['EU FTA', 'US FTA', 'China FTA', 'CPTPP', 'RCEP', 'ASEAN'], 'VN': ['EU FTA', 'CPTPP', 'RCEP', 'ASEAN'], 'CN': ['RCEP', 'ASEAN–China FTA', 'Korea FTA', 'Australia (ChAFTA)', 'New Zealand FTA', 'Switzerland FTA', 'Singapore FTA'],
 'IN': ['UAE CEPA', 'Australia ECTA', 'EFTA TEPA', 'ASEAN–India FTA', 'Japan CEPA', 'Korea CEPA'], 'AE': ['India CEPA', 'GCC customs union'],
 'IL': ['EU association agreement', 'US FTA', 'UK continuity agreement'], 'TR': ['EU customs union', 'UK FTA'], 'MA': ['EU association agreement', 'US FTA'],
 'EG': ['EU association agreement', 'AfCFTA'], 'ZA': ['EU–Southern Africa EPA', 'SACU', 'AfCFTA'], 'CO': ['US TPA', 'EU FTA', 'Pacific Alliance'],
 'AR': ['Mercosur'], 'BR': ['Mercosur'], 'AL': ['EU stabilisation agreement'], 'MK': ['EU stabilisation agreement'], 'RS': ['EU stabilisation agreement'],
 'TW': [], 'HK': ['RCEP application pending; Hong Kong is a free port with no tariffs'], 'SA': ['GCC customs union'],
 'MY': ['CPTPP', 'RCEP', 'ASEAN'], 'TH': ['RCEP', 'ASEAN'], 'ID': ['RCEP', 'ASEAN'], 'PH': ['RCEP', 'ASEAN'], 'RU': ['Eurasian Economic Union'],
}
countries = {}
for cc, q in QID.items():
    lvl = next(k for k, v in S.items() if cc in v.split())
    orgs = [o for o in ORGS if cc in M.get(o, [])]
    if 'EU' in orgs: orgs = [o for o in orgs if o != 'EEA']
    countries[cc] = {'qid': q, 'iso2': ISO2.get(cc, cc), 'structure': lvl, 'note': NOTE.get(cc, ''), 'orgs': orgs, 'fta': FTA.get('EU', []) if 'EU' in orgs else FTA.get(cc, [])}
out = {'as_of': '2026-06', 'structure_levels': {'1': 'Centralised', '2': 'Decentralised', '3': 'Regionalised', '4': 'Federal'},
       'orgs': {k: {'name': v[0], 'group': v[1], 'res': v[2], 'biz': v[3], 'src': v[4]} for k, v in ORGS.items()}, 'countries': countries,
       'note': 'Memberships, trade agreements and state structure: public treaty and member lists, compiled June 2026. Who governs, parties and seats: Wikidata (CC0), live.'}
json.dump(out, open(os.path.join(ROOT, 'data', 'politics.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('politics.json', len(countries), 'countries', os.path.getsize(os.path.join(ROOT, 'data', 'politics.json')), 'bytes')
