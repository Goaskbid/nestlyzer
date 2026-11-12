#!/usr/bin/env python3
"""Read-only inventory of every active place, retained evidence and page eligibility.
This does not equate raw-field presence with correctness, comparability or approval.
"""
from pathlib import Path
import argparse,collections,csv,gzip,hashlib,json,math,re,subprocess

def number(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def read(p):return json.loads(Path(p).read_text())
def write(p,x):Path(p).parent.mkdir(parents=True,exist_ok=True);Path(p).write_text(json.dumps(x,ensure_ascii=False,indent=2))
def csvout(path,rows):
 if not rows:return
 with gzip.open(path,'wt',encoding='utf-8',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
def run(root,out):
 root=Path(root);out=Path(out);out.mkdir(parents=True,exist_ok=True)
 hydrated_dir=out/'private_hydrated';subprocess.run(['node',str(root/'build/export_hydrated_audit.cjs'),'--root',str(root),'--out',str(hydrated_dir)],check=True)
 meta=read(root/'data/meta.json');factors={f['id']:f for f in meta['factors']};legacy=json.loads(gzip.decompress((root/'build/seo-legacy-paths.json.gz').read_bytes()))['paths']
 ledger=[];cstats=[];fstats=[];errors=[];retained=[];station_counts=collections.Counter();active_ids=set();allids=set()
 for fn in sorted((root/'data/c').glob('*.json')):
  sh=read(fn);cc=sh['cc'];n=len(sh['rows']);cols=sh['cols'];fr=sh.get('fr',{});fs=sh.get('fs',{});fl=sh.get('fl',{});x=read(root/f'data/x/{cc}.json');ctx=x.get('ctx',{});st={}
  for record in ctx.get('records',[]):
   geo=record.get('source_geo_id');lev=record.get('source_geo_level','');ind=record.get('indicator_id','')
   if lev in ['climate_station','weather_station'] and any(k in ind.lower() for k in ['temp','precip','normal','sunshine']):st.setdefault(geo,set()).add(record['record_id'])
  hydrated=json.loads(gzip.decompress((hydrated_dir/(fn.name+'.gz')).read_bytes()))
  hkeys={kind:sorted(set().union(*(set(r[kind]) for r in hydrated))) for kind in ['fr','fs','fl']}
  primitive=fr
  fr={k:[r['fr'].get(k) for r in hydrated] for k in hkeys['fr']}
  fs={k:[r['fs'].get(k) for r in hydrated] for k in hkeys['fs']}
  fl={k:[r['fl'].get(k) for r in hydrated] for k in hkeys['fl']}
  links=ctx.get('places',{});newpath=root/f'data/measured-climate/{cc}.json';newlinks=read(newpath)['links'] if newpath.exists() else {}
  for group,d in [('fr',fr),('fs',fs),('fl',fl),('x',x.get('cols',{}))]:
   for k,a in d.items():
    if not isinstance(a,list) or len(a)!=n:errors.append({'cc':cc,'code':'array_length','field':group+':'+k})
  count=collections.Counter();applicable=set(fr)|set(fs)
  for k,f in factors.items():
   if cc in f.get('countries',[]) or cc in f.get('by_country',{}):applicable.add(k)
  applicable=sorted(applicable)
  for i,row in enumerate(sh['rows']):
   if len(row)!=len(cols):errors.append({'cc':cc,'code':'core_width','row':i});continue
   r=dict(zip(cols,row));pid=cc+':'+str(r['oid']);count['all_rows']+=1
   if pid in allids:errors.append({'cc':cc,'code':'duplicate_identity','id':pid})
   allids.add(pid)
   if r.get('sup'):count['superseded']+=1;continue
   active_ids.add(pid);count['active']+=1
   avail={k for k,a in fr.items() if i<len(a) and number(a[i])};scored={k for k,a in fs.items() if i<len(a) and number(a[i])}
   if not (number(r.get('lat')) and number(r.get('lon')) and -90<=r['lat']<=90 and -180<=r['lon']<=180):errors.append({'cc':cc,'code':'coordinate_missing_or_invalid','id':pid})
   if number(r.get('pop')) and r['pop']<0:errors.append({'cc':cc,'code':'negative_population','id':pid})
   local=regional=national=unresolved=0
   for k in avail:
    lv=fl.get(k,[None]*n)[i] if k in fl else None
    if lv==0:local+=1
    elif lv in [1,2,3]:regional+=1
    elif lv==9:national+=1
    else:unresolved+=1
   station_ids=set()
   for association in links.get(str(r['oid']),[]):
    if association[0] in st:station_ids.add(association[0])
   pop=hydrated[i].get('popNow',r.get('pop'));below=number(pop) and pop<1000;old=pid in legacy
   excluded_before=not old and (not number(pop) or pop<1000)
   count['legacy_pages']+=old;count['below_1000']+=below;count['previously_excluded_pages']+=excluded_before;count['station_context_places']+=bool(station_ids);count['new_station_context_places']+=pid in newlinks
   havecats={factors[k].get('category','unclassified') for k in avail if k in factors}
   bits=sum(1<<j for j,k in enumerate(applicable) if k in avail)
   ledger.append({'place_id':pid,'cc':cc,'name':r['name'],'population':pop,'latitude':r.get('lat'),'longitude':r.get('lon'),'legacy_page':old,'previously_excluded_by_1000_cutoff':excluded_before,'raw_numeric_fields':len(avail),'primitive_raw_numeric_fields':sum(i<len(a) and number(a[i]) for a in primitive.values()),'raw_fallback_contracts':len(sh.get('rawFallback',{})),'score_fields':len(scored),'explicit_place_support_fields':local,'regional_support_fields':regional,'national_support_fields':national,'support_not_encoded_fields':unresolved,'raw_includes_runtime_region_county_fallbacks':True,'available_factor_bitmap_hex':hex(bits),'raw_categories':'|'.join(sorted(havecats)),'measured_station_context_sources':len(station_ids),'new_noaa_station_context':pid in newlinks,'cohort_age65_migration_panel_bound':False,'municipal_measured_climate_claimed':False})
   for k in scored:
    v=fs[k][i]
    if v<0 or v>100:errors.append({'cc':cc,'code':'score_outside_0_100','field':k,'id':pid,'value':v})
  for k in applicable:
   f=factors.get(k,{});bc=f.get('by_country',{}).get(cc,{});active=[i for i,row in enumerate(sh['rows']) if not dict(zip(cols,row)).get('sup')]
   arr=fr.get(k,[]);sa=fs.get(k,[]);nums=[i for i in active if i<len(arr) and number(arr[i])]
   source=(bc.get('source_url') or bc.get('url') or ('https://www.geonames.org/' if 'GeoNames' in bc.get('source_name','') else '')) if bc else (f.get('source_url') or meta.get('sources',{}).get(f.get('source_id'),{}).get('url',''))
   period=(bc.get('period') or bc.get('source_period') or '') if bc else f.get('source_period','')
   fstats.append({'cc':cc,'factor_id':k,'active_places':len(active),'raw_present':len(nums),'raw_missing':len(active)-len(nums),'score_present':sum(i<len(sa) and number(sa[i]) for i in active),'source_url':source,'period':period,'geographic_support_varies':k in fl,'registered_factor':k in factors,'presence_does_not_establish_current_validity':True})
  cstats.append({'cc':cc,**dict(count)});write(out/f'factor_order_{cc}.json',applicable)
 for line in gzip.open(root/'build/source/context/master_records.jsonl.gz','rt'):
  r=json.loads(line)
  if r.get('source_geo_level') in ['climate_station','weather_station']:
   key=(r.get('source_id'),r.get('source_geo_id'));station_counts[key]+=1
   retained.append({'record_id':r['record_id'],'source_id':r['source_id'],'source_geo_id':r['source_geo_id'],'source_geo_name':r.get('source_geo_name'),'period':r['period'],'indicator_id':r['indicator_id'],'unit':r['unit'],'value':r['value'],'source_url':r['source_url'],'publication_approved_in_retained_record':r.get('publication_approved'),'quality_flags':r.get('quality_flags'),'newly_acquired_in_this_run':False})
 profiles=read(root/'data/evidence/profiles.json')['profiles'];gate=[]
 for pid,p in profiles.items():
  current=meta['config']['profiles'].get(pid,{})
  gate.append({'profile_id':pid,'name':p['name'],'business':p['business'],'status':p.get('status'),'weights_changed':False,'validation_status':'blocked_no_new_independent_profile_outcome_panel','existing_required_evidence':json.dumps(p.get('required_evidence',[]),ensure_ascii=False),'existing_critical_gates':json.dumps(p.get('critical_gates',[]),ensure_ascii=False),'current_weights':json.dumps(current.get('weights',{}),sort_keys=True)})
 csvout(out/'ALL_ACTIVE_PLACES_GAP_LEDGER.csv.gz',ledger);csvout(out/'COUNTRY_FACTOR_COVERAGE.csv.gz',fstats);csvout(out/'RETAINED_STATION_RECORDS_AUDIT.csv.gz',retained);csvout(out/'PROFILE_VALIDATION_STATUS.csv.gz',gate)
 write(out/'COUNTRY_COVERAGE.json',cstats);write(out/'INTEGRITY_FINDINGS.json',errors)
 total=collections.Counter()
 for r in cstats:
  for k,v in r.items():
   if k!='cc':total[k]+=v
 summary={'active_places':len(active_ids),'all_core_rows':len(allids),'countries':len(cstats),'configured_profiles_audited':len(gate),'factor_country_rows':len(fstats),'counts':dict(total),'structural_findings':len(errors),'retained_station_records':len(retained),'retained_station_source_identities':len(station_counts),'decoder':'actual src/data.js including rg/cl/rawFallback','caveats':['Bitmap tests presence, not correctness or commercial licence. Decode against each country factor_order file.','Geographic support not encoded is unresolved, not asserted local.','Climate station context is not a municipal climate measurement.','No new age65 migration calibration panel was acquired or bound.','Profile weights are preserved; no empirical improvement claimed.']}
 write(out/'AUDIT_SUMMARY.json',summary);print(json.dumps(summary,indent=2));return summary
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--out',required=True);a=p.parse_args();run(a.root,a.out)
