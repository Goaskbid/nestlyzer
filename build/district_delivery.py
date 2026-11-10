#!/usr/bin/env python3
"""Expose retained, owner-approved district observations without inventing geometry or service coverage."""
from pathlib import Path
import csv,hashlib,json,sys,importlib.util,math
R=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('zones_builder',R/'build/build_zones.py');B=importlib.util.module_from_spec(spec);spec.loader.exec_module(B)
J=json.loads((R/'build/evidence_pipeline/district_jobs.json').read_text())
TOPICS={'safety':['DE_pks_total_offences','DE_pks_cleared_offences','DE_pks_clearance_rate'], 'transport':[], 'childcare':['childcare_places_per_100_under3']}
def build():
 report={'schema':'district-evidence-1','geography_warning':'Brussels means the 19 Brussels-Capital municipalities, not sub-city districts of the City of Brussels.','cities':[]}
 out=R/'data/district-evidence';out.mkdir(parents=True,exist_ok=True)
 for j in J:
  city=j['id'];src=None;approved=False;rows=[]
  for p in [R/'build/source/deliveries/s9-20261109'/f'05_districts_{city}.csv',R/'build/source/deliveries/s8-20261107'/f'05_districts_{city}.csv']:
   if p.exists():src=p;approved=B._approved(str(p.parent),p.name);break
  if src and approved:rows=B.rows(city)
  safe=[]
  for r in rows:
   try:v=float(r['value'])
   except (ValueError,KeyError):continue
   if not math.isfinite(v):continue
   safe.append({k:r.get(k,'') for k in ['record_id','indicator_id','geographic_unit','geographic_code','geographic_code_system','value','unit','period','source_url','licence','licence_url','commercial_reuse_status','statistic','age_band','sex','population_universe','dimensions']})
  (out/(city+'.json')).write_text(json.dumps({'city':city,'rows':safe},ensure_ascii=False,separators=(',',':')))
  topics={t:{'rows':sum(r['indicator_id'] in ids for r in safe),'units':len({r['geographic_code'] for r in safe if r['indicator_id'] in ids}),'status':'published observations' if any(r['indicator_id'] in ids for r in safe) else 'not supplied; not zero'} for t,ids in TOPICS.items()}
  geo=R/'build/source/zones'/f'{city}.geojson';receipt=R/'build/source/zones'/f'{city}.receipt.json';gok=False
  if geo.exists() and receipt.exists():
   rec=json.loads(receipt.read_text());gok=rec.get('commercial_reuse_status')=='Green' and rec.get('sha256_normalized')==hashlib.sha256(geo.read_bytes()).hexdigest()
  report['cities'].append({'id':city,'country':j['cc'],'official_units_expected':len(j['codes']),'units_with_observations':len({r['geographic_code'] for r in safe}),'observations':len(safe),'owner_approval_matches':approved,'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest() if src else None,'boundary_ready':gok,'topics':topics,'observations_url':'/data/district-evidence/'+city+'.json','boundary_rights':j['commercial_reuse_status']})
 report['retained_observations']=sum(c['observations'] for c in report['cities']);report['new_observations']=0
 (out/'index.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));return report
if __name__=='__main__':build()
