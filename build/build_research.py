#!/usr/bin/env python3
"""Research institutions for the map (2.11.2): rebuilt from the full ROR registry (v2.15, CC0).
Keeps active organisations of type facility, government, nonprofit or other whose name says research (institute,
laboratory, centre, Forschung, recherche, ricerca ...) in the 45 Nestlyzer countries, without education, company and
healthcare types. Size proxy = number of child organisations in ROR. The major research institutions below (large
national and international centres, the ETH domain institutes, Helmholtz, CEA, CNR, the US national laboratories ...) are
matched by name and get +20, so they are the ones shown first. Replaces 'research' in build/source/ror_anchors.json.
    python3 build/build_research.py <ror-data.json>"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CC = {c['cc'] for c in json.load(open(os.path.join(ROOT, 'data', 'meta.json')))['countries']}
ISO = {'GB': 'UK', 'GR': 'EL'}
WORD = re.compile(r'\b(institut|institute|instituto|istituto|laborator|laboratoire|research|forschung|recherche|ricerca|investigaci|onderzoek|centre|center|centro|zentrum|agency|observatory|observatoire|facility|synchrotron|reactor)', re.I)
MAJOR = re.compile(r'(Swiss Federal Laboratories for Materials Science|\bEmpa\b|Swiss Center for Electronics and Microtechnology|\bCSEM\b|Idiap Research|Eawag|Swiss Federal Institute of Aquatic|Swiss Federal Institute for Forest, Snow|\bWSL\b|Paul Scherrer|European Organization for Nuclear Research|CERN\b|'
                   r'European Molecular Biology Laboratory|European Synchrotron|Institut Laue|European Southern Observatory|European Space (Research|Operations|Agency)|ESTEC|ESOC|Joint Research Centre|ITER\b|'
                   r'Deutsches Elektronen-Synchrotron|Forschungszentrum J.lich|Helmholtz-Zentrum|Helmholtz Centre|Helmholtz Center|Deutsches Zentrum f.r Luft|German Aerospace|GSI Helmholtz|Alfred Wegener|GEOMAR|'
                   r'German Cancer Research|Max Delbr.ck|Karlsruhe Institute of Technology|Fraunhofer-Gesellschaft|Max Planck Society|Max-Planck-Gesellschaft|'
                   r'Commissariat . l.(e|É)nergie Atomique|French Alternative Energies and Atomic Energy|CEA Saclay|CEA Grenoble|CEA Cadarache|Centre National de la Recherche Scientifique|Inria|Institut Pasteur|'
                   r'National Research Council of Italy|Consiglio Nazionale delle Ricerche|Italian Institute of Technology|Istituto Italiano di Tecnologia|Spanish National Research Council|Consejo Superior de Investigaciones|'
                   r'Netherlands Organisation for Applied Scientific|\bTNO\b|imec\b|Interuniversity Microelectronics|VTT Technical Research|SINTEF|RISE Research Institutes|Austrian Institute of Technology|'
                   r'Wellcome Sanger|Francis Crick|Rutherford Appleton|Culham|Diamond Light Source|National Physical Laboratory|'
                   r'Oak Ridge National|Los Alamos National|Lawrence Livermore|Lawrence Berkeley|Argonne National|Fermi National|Brookhaven National|SLAC National|Sandia National|Pacific Northwest National|'
                   r'National Renewable Energy Laboratory|Idaho National|Jet Propulsion|NASA Ames|NASA Goddard|National Institutes of Health|'
                   r'RIKEN|National Institute of Advanced Industrial Science|Korea Institute of Science and Technology|Agency for Science, Technology and Research|A\*STAR|CSIRO|Weizmann|National Research Council Canada|TRIUMF)', re.I)
NOT = re.compile(r'(Library|Bibliothek|Board of|Secretariat|Programme|Program\b|Kogyo|\bCo\.|\bLtd|\bInc\b|GmbH|Foundation for|Association|Society for the|Postgraduate)', re.I)
D = json.load(open(sys.argv[1]))
out = []
for o in D:
    if o.get('status') != 'active': continue
    t = set(o.get('types', []))
    names = [n['value'] for n in o.get('names', []) if 'ror_display' in n.get('types', [])] or [o['names'][0]['value']]
    nm = names[0]; alln = ' / '.join(n['value'] for n in o.get('names', []))
    loc = (o.get('locations') or [{}])[0].get('geonames_details') or {}
    cc = ISO.get(loc.get('country_code'), loc.get('country_code'))
    if cc not in CC or loc.get('lat') is None: continue
    major = bool(MAJOR.search(alln)) and not NOT.search(nm)
    if NOT.search(nm): continue
    if not major and (t & {'education', 'company', 'healthcare', 'archive'} or not t & {'facility', 'government', 'nonprofit', 'other', 'funder'}): continue
    if not major and not WORD.search(nm): continue
    if not major and 'funder' in t and not t & {'facility', 'government', 'nonprofit'}: continue
    size = sum(1 for r in o.get('relationships', []) if r.get('type') == 'child') + (20 if major else 0)
    if not major and size < 1: continue   # only institutions with sub-units, plus the major ones (map file size)
    out.append([nm, cc, round(loc['lat'], 4), round(loc['lng'], 4), size])
p = os.path.join(ROOT, 'build', 'source', 'ror_anchors.json'); A = json.load(open(p))
A['research'] = sorted(out, key=lambda r: -r[4])
A['source'] = A['source'].split(' Research institutions:')[0] + ' Research institutions: rebuilt in 2.11.2 from all active ROR facilities, government, non-profit and other research organisations; major national and international centres (ETH domain incl. Empa, Eawag, WSL and PSI; CERN, EMBL, ESRF, ILL, ESA, JRC; Helmholtz, Fraunhofer, Max Planck, CEA, CNRS, CNR, CSIC, TNO, imec; US national laboratories ...) marked by name.'
json.dump(A, open(p, 'w'), ensure_ascii=False)
mj = [r for r in out if r[4] >= 20]
print('research institutions:', len(out), 'of which major:', len(mj))
for q in ('Empa', 'CSEM', 'Swiss Center for Electronics', 'Idiap', 'Swiss Federal Laboratories', 'Eawag', 'Forest, Snow', 'Paul Scherrer', 'European Organization for Nuclear', 'European Molecular Biology', 'European Synchrotron', 'Laue', 'Joint Research Centre', 'Deutsches Elektronen', 'imec', 'Netherlands Organisation for Applied'):
    print(' ', q, [r[0][:50] + ' ' + r[1] for r in out if q.lower() in r[0].lower()][:3])
