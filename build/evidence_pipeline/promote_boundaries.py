#!/usr/bin/env python3
"""Promote validated polygon files only. No approval or naming inference."""
import argparse,hashlib,json,os,shutil,tempfile
from pathlib import Path
from acquire import validate_geometry
p=argparse.ArgumentParser();p.add_argument('--repo',required=True);p.add_argument('--work',required=True);p.add_argument('--city',required=True);p.add_argument('--apply',action='store_true');a=p.parse_args()
R=Path(a.repo).resolve();jobs=json.loads((Path(__file__).parent/'district_jobs.json').read_text());j=next(x for x in jobs if x['id']==a.city);d=Path(a.work)/a.city/'stage';g=d/(a.city+'.geojson');receipt=json.loads((d/(a.city+'.receipt.json')).read_text())
if receipt.get('commercial_reuse_status')!='Green' or not receipt.get('production_eligible'):raise SystemExit('Held: commercial reuse not established')
if receipt.get('period') in [None,'','publisher release metadata required']:raise SystemExit('Held: exact boundary reference vintage required')
# Canonical files from acquisition already use key; validate that exact identity, not a name join.
cfg={**j,'code_field':'key','name_field':'name','pad':0};obj=validate_geometry(json.loads(g.read_text()),cfg);b=json.dumps(obj,ensure_ascii=False,separators=(',',':')).encode();receipt['sha256_normalized']=hashlib.sha256(b).hexdigest()
dest=R/'build/source/zones';dest.mkdir(parents=True,exist_ok=True)
if a.apply:
 target=dest/g.name
 if target.exists() and target.read_bytes()!=b:shutil.copy2(target,target.with_suffix('.geojson.previous'))
 temp=target.with_suffix('.geojson.part');temp.write_bytes(b);temp.replace(target);(dest/(a.city+'.receipt.json')).write_text(json.dumps(receipt,indent=2));print('Applied',a.city,len(obj['features']))
else:print('Validated dry run',a.city,len(obj['features']))
