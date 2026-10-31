#!/usr/bin/env python3
"""Public downloads for the Method page (2.10.1): the data-gap overview and the collection briefs, copied into
data/downloads (served as nzdata-downloads-*). Checked for e-mail addresses, keys and tokens before publishing.
    python3 build/publish_downloads.py <folder with the briefs and the gap PDF>"""
import os, re, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1]; OUT = os.path.join(ROOT, 'data', 'downloads'); os.makedirs(OUT, exist_ok=True)
MAP = {'ChatGPT_Task_KPIs.md': 'brief-kpis.md', 'ChatGPT_Task_Industry_Structure.md': 'brief-industry-structure.md',
       'ChatGPT_Task_Geography_Mapping.md': 'brief-geography-mapping.md', 'ChatGPT_Followup_2.10.3.md': 'brief-next-delivery.md', 'Nestlyzer-Data-Gaps.pdf': 'nestlyzer-data-gaps.pdf'}
BAD = re.compile(r'[\w.+-]+@[\w-]+\.[\w.]+|AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{36}|sk-[A-Za-z0-9]{32,}|AIza[0-9A-Za-z_-]{35}')
for a, b in MAP.items():
    p = os.path.join(SRC, a)
    if not os.path.exists(p): continue
    if a.endswith('.md'):
        t = open(p, encoding='utf-8').read().replace('# ChatGPT task: ', '# Nestlyzer data collection brief: ')
        assert not BAD.search(t), 'private detail in ' + a
        open(os.path.join(OUT, b), 'w', encoding='utf-8').write(t)
    else: shutil.copy(p, os.path.join(OUT, b))
for a in ['docs/gaps/gap_matrix.csv', 'docs/gaps/places_lookup_for_mapping.csv']:
    t = open(os.path.join(ROOT, a), encoding='utf-8').read(); assert not BAD.search(t), a
    shutil.copy(os.path.join(ROOT, a), os.path.join(OUT, os.path.basename(a)))
print('downloads:', sorted(os.listdir(OUT)))
