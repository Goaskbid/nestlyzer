#!/usr/bin/env python3
"""Run independent acquisition jobs; report every failure and never deploy automatically."""
import argparse, json, subprocess, sys
from pathlib import Path
from nz_core import HERE, jsonwrite
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--repo',type=Path,required=True)
p.add_argument('--work',type=Path,required=True)
p.add_argument('--countries',default='FR,US,CA,AU,BR,MX')
p.add_argument('--swiss',action='store_true')
p.add_argument('--tax-year',default='latest')
a=p.parse_args();a.work.mkdir(parents=True,exist_ok=True)
results=[]
for cc in a.countries.split(','):
    if cc not in ('FR','US','CA','AU','BR','MX'):p.error('Unknown country '+cc)
    cmd=[sys.executable,str(HERE/'nz_countries.py'),'--country',cc,'--cache',str(a.work/'raw'/cc),'--out',str(a.work/'stage'/cc)]
    log=a.work/(cc+'.log')
    with log.open('w') as f:r=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT)
    results.append({'country':cc,'exit_code':r.returncode,'log':str(log),'state':'staged_only' if r.returncode==0 else 'failed_or_partial'})
if a.swiss:
    cmd=[sys.executable,str(HERE/'nz_swiss.py'),'--repo',str(a.repo),'--cache',str(a.work/'raw/CH'),'--out',str(a.work/'stage/CH'),'--year',a.tax_year]
    log=a.work/'CH.log'
    with log.open('w') as f:r=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT)
    results.append({'country':'CH','exit_code':r.returncode,'log':str(log),'state':'staged_only' if r.returncode==0 else 'failed_or_partial'})
jsonwrite(a.work/'run_status.json',{'jobs':results,'site_changed':False,'scoring_changed':False})
print(json.dumps(results,indent=2))
sys.exit(1 if any(x['exit_code'] for x in results) else 0)
