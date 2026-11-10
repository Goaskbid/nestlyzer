#!/usr/bin/env python3
"""Bounded official-source acquisition. Raw bytes, receipts, honest status; no automatic score publication."""
from __future__ import annotations
import argparse,csv,datetime as dt,gzip,hashlib,io,json,math,re,sys,time,urllib.parse,urllib.request
from pathlib import Path
HERE=Path(__file__).resolve().parent
ALLOWED={'api.census.gov','globalenergymonitor.org','raw.githubusercontent.com','github.com','api.hamburg.de','geodienste.hamburg.de','data.grandlyon.com','data.ampmetropole.fr','dati.comune.milano.it','geoportal.madrid.es','www.odwb.be','bruxellesdata.opendatasoft.com','viaggiacon.atac.roma.it','geoportale.comune.roma.it'}
FIELDS=['record_id','indicator_id','geographic_unit','geographic_code','code_system','value','unit','period','source_url','licence','licence_url','commercial_reuse_status','hold_reason','observation_status','source_sha256','dimensions']
def write(p,v):
 p=Path(p);p.parent.mkdir(parents=True,exist_ok=True);t=p.with_suffix(p.suffix+'.part');t.write_text(json.dumps(v,ensure_ascii=False,indent=2));t.replace(p)
def digest(b):return hashlib.sha256(b).hexdigest()
def fetch(url,out,timeout=20,limit=250_000_000):
 u=urllib.parse.urlparse(url)
 if u.scheme!='https' or u.hostname not in ALLOWED:raise ValueError('Endpoint outside official allowlist')
 if u.hostname=='raw.githubusercontent.com' and not u.path.startswith('/GlobalEnergyMonitor/'):raise ValueError('Not the publisher account')
 out=Path(out);out.parent.mkdir(parents=True,exist_ok=True);receipt=out.with_suffix(out.suffix+'.receipt.json')
 if out.exists():
  if not receipt.exists():raise ValueError('Existing bytes have no acquisition receipt')
  m=json.loads(receipt.read_text());b=out.read_bytes()
  if m['source_url']!=url or m['sha256']!=digest(b):raise ValueError('Cached URL/hash mismatch')
  return b
 req=urllib.request.Request(url,headers={'User-Agent':'Nestlyzer/2.15.16 (+https://nestlyzer.com)','Accept':'application/json,application/geo+json,*/*'})
 with urllib.request.urlopen(req,timeout=timeout) as r:
  final=urllib.parse.urlparse(r.url)
  if final.scheme!='https' or final.hostname not in ALLOWED:raise ValueError('Unapproved redirect')
  chunks=[];n=0
  while True:
   b=r.read(1024*1024)
   if not b:break
   n+=len(b)
   if n>limit:raise ValueError('Response exceeds bounded download size')
   chunks.append(b)
  b=b''.join(chunks)
 if not b:raise ValueError('Empty response')
 out.write_bytes(b);write(receipt,{'source_url':url,'sha256':digest(b),'bytes':len(b),'retrieved_at':dt.datetime.now(dt.timezone.utc).isoformat()});return b

def number(x):
 try:v=float(x)
 except (TypeError,ValueError):return None
 return v if math.isfinite(v) and v>=0 else None

def census_variables(metadata,group):
 """Resolve cohort from publisher labels, not guessed column offsets."""
 selected={}
 for k,v in metadata.get('variables',{}).items():
  label=v.get('label','');age=next((a for a in ['65 to 69 years','70 to 74 years','75 years and over'] if label.endswith('!!'+a)),None)
  if k.startswith(group+'_') and k.endswith('E') and age and label.startswith('Estimate!!'):
   selected[k]={'age_band':age,'label':label,'margin_variable':k[:-1]+'M'}
 if len(selected)<9:raise ValueError('Cohort labels/schema missing; no fallback to total migration')
 return selected

def census_rows(payload,variables,year,group,url,raw_hash):
 if not isinstance(payload,list) or len(payload)<2:raise ValueError('Empty Census response')
 head=payload[0]
 for required in ['NAME','state','county',*variables]:
  if required not in head:raise ValueError('Missing field '+required)
 seen=set();out=[]
 for cells in payload[1:]:
  if len(cells)!=len(head):raise ValueError('Ragged Census row')
  d=dict(zip(head,cells));code=d['state']+d['county']
  if not re.fullmatch(r'\d{5}',code) or code in seen:raise ValueError('Duplicate/invalid county FIPS')
  seen.add(code)
  for var,v in variables.items():
   value=number(d[var]);dims={'age_band':v['age_band'],'publisher_label':v['label'],'acs_table':group,'moe90_published':number(d.get(v['margin_variable'])),'county_name':d['NAME'],'cohort':'age65plus, not pension receipt','statistic':'5-year survey estimate of prior-year movement; not a 5-year flow total'}
   key=f'US|{code}|{year}|{var}'
   out.append(dict(zip(FIELDS,[digest(key.encode())[:24],var,'county',code,'US Census county FIPS','' if value is None else value,'persons',f'{year-4}-{year}',url,'US federal public domain','https://www.census.gov/about/policies/copyright.html','Green','cohort_definition_review; temporal_holdout_required','published_estimate' if value is not None else 'missing_or_suppressed',raw_hash,json.dumps(dims,sort_keys=True)])))
 if not out:raise ValueError('No source observations')
 return out,seen

def savecsv(path,rows):
 if not rows:raise ValueError('Refusing successful empty table')
 Path(path).parent.mkdir(parents=True,exist_ok=True)
 with gzip.open(path,'wt',encoding='utf-8',newline='') as f:
  w=csv.DictWriter(f,fieldnames=FIELDS);w.writeheader();w.writerows(rows)

def migration(work,year,timeout):
 rows=[];geographies=[]
 for group in ['B07001','B07401']:
  base=f'https://api.census.gov/data/{year}/acs/acs5';u=base+'/groups/'+group+'.json';md=json.loads(fetch(u,work/'raw'/f'{group}_metadata.json',timeout));vars=census_variables(md,group)
  names=['NAME']+[x for k,v in vars.items() for x in [k,v['margin_variable']]]
  if len(names)>50:raise ValueError('Census request needs batching; schema changed')
  url=base+'?'+urllib.parse.urlencode({'get':','.join(names),'for':'county:*'})
  b=fetch(url,work/'raw'/f'{group}_{year}.json',timeout);rr,geos=census_rows(json.loads(b),vars,year,group,url,digest(b));rows+=rr;geographies.append(geos)
 if geographies[0]!=geographies[1]:raise ValueError('Inflow/outflow county vintages differ')
 savecsv(work/'stage/US_migration_age65_components.csv.gz',rows)
 write(work/'stage/US_migration_manifest.json',{'period':f'{year-4}-{year}','counties':len(geographies[0]),'rows':len(rows),'tables':['B07001','B07401'],'numeric_calibration_enabled':False,'note':'Age is not retirement status. Same-county moves are not intercounty migration. Retain margins of error. Do not label inflows as net flows. Pair compatible inflow and outflow components before a net statistic.'})
 return {'status':'acquired_staged','rows':len(rows),'counties':len(geographies[0]),'publication':'not automatically enabled'}

def topo_features(t):
 if t.get('type')!='Topology':return t
 arcs=[];scale=t.get('transform',{}).get('scale',[1,1]);trans=t.get('transform',{}).get('translate',[0,0])
 for arc in t['arcs']:
  x=y=0;out=[]
  for a,b in arc:
   if 'transform' in t:x+=a;y+=b;out.append([x*scale[0]+trans[0],y*scale[1]+trans[1]])
   else:out.append([a,b])
  arcs.append(out)
 def ring(ids):
  out=[]
  for i in ids:
   a=arcs[i] if i>=0 else list(reversed(arcs[~i]));out.extend(a if not out else a[1:])
  return out
 result=[]
 for obj in t['objects'].values():
  for g in obj.get('geometries',[obj]):
   typ=g.get('type')
   if typ not in ['Polygon','MultiPolygon']:continue
   a=g['arcs'];coords=[ring(x) for x in a] if typ=='Polygon' else [[ring(x) for x in p] for p in a]
   result.append({'type':'Feature','properties':g.get('properties',{}),'geometry':{'type':typ,'coordinates':coords}})
 return {'type':'FeatureCollection','features':result}

def validate_geometry(data,job):
 from shapely.geometry import shape
 data=topo_features(data)
 if data.get('type')!='FeatureCollection':raise ValueError('A complete FeatureCollection is required')
 expected=set(job['codes']);out={};key=job['code_field']
 for f in data.get('features',[]):
  props=f.get('properties',{});code=str(props.get(key,''))
  if job.get('pad'):code=code.zfill(job['pad'])
  if code not in expected:continue
  geom=f.get('geometry') or {}
  if geom.get('type') not in ['Polygon','MultiPolygon']:raise ValueError('District layer contains points or lines, not boundaries')
  s=shape(geom)
  if s.is_empty or not s.is_valid or s.area<=0:raise ValueError('Invalid or empty district polygon')
  x1,y1,x2,y2=s.bounds
  if not (-180<=x1<=x2<=180 and -90<=y1<=y2<=90):raise ValueError('Projected coordinates supplied as WGS84')
  bx=job['bbox']
  if x1<bx[0] or y1<bx[1] or x2>bx[2] or y2>bx[3]:raise ValueError('Geometry outside expected city bounding box')
  if code in out:raise ValueError('Duplicate district identity')
  out[code]={'type':'Feature','properties':{'key':code,'name':str(props.get(job.get('name_field','name'),code)),'code_system':job['code_system']},'geometry':geom}
 if set(out)!=expected:raise ValueError('Incomplete official roster: missing '+','.join(sorted(expected-set(out))))
 return {'type':'FeatureCollection','features':list(out.values())}

def boundary(work,job,timeout):
 if not job.get('url'):return {'status':'endpoint_requires_review','rows':0}
 b=fetch(job['url'],work/'raw'/f"{job['id']}.json",timeout);g=validate_geometry(json.loads(b),job)
 note={'source_url':job['source_url'],'download_url':job['url'],'licence':job['licence'],'licence_url':job['licence_url'],'commercial_reuse_status':job['commercial_reuse_status'],'sha256':digest(b),'period':job['period'],'code_system':job['code_system'],'features':len(g['features']),'production_eligible':job['commercial_reuse_status']=='Green'}
 write(work/'stage'/f"{job['id']}.geojson",g);write(work/'stage'/f"{job['id']}.receipt.json",note)
 return {'status':'validated_staged' if note['production_eligible'] else 'held_rights','features':len(g['features']),'publication':'not automatic'}

def nuclear(work,url,timeout,input_file=None,release='2026-08'):
 import openpyxl
 b=Path(input_file).read_bytes() if input_file else fetch(url,work/'raw/GEM_nuclear_original.xlsx',timeout)
 if input_file:
  (work/'raw').mkdir(parents=True,exist_ok=True);(work/'raw/GEM_nuclear_original.xlsx').write_bytes(b)
 wb=openpyxl.load_workbook(io.BytesIO(b),read_only=True,data_only=True)
 aliases={'id':['GEM unit ID','GEM Unit ID','GEM ID'],'name':['Unit name','Unit Name','Project Name','Plant Name'],'country':['Country/Area','Country'],'status':['Status'],'mw':['Capacity (MW)','Capacity (MW) '],'lat':['Latitude'],'lon':['Longitude'],'start':['Start year','Start Year'],'owner':['Owner','Owner(s)']}
 rows=[];seen=set()
 for ws in wb:
  it=ws.iter_rows(values_only=True);cols=None
  for _ in range(12):
   row=next(it,())
   if any(x in row for x in aliases['id']) and 'Status' in row:cols=[str(x or '').strip() for x in row];break
  if not cols:continue
  idx={k:next((cols.index(x) for x in names if x in cols),None) for k,names in aliases.items()}
  if any(idx[k] is None for k in ['id','name','country','status','mw','lat','lon']):continue
  typecol=next((cols.index(x) for x in ['Type','Technology','Fuel'] if x in cols),None)
  for row in it:
   if not row or all(v is None for v in row):continue
   if typecol is not None and 'nuclear' not in str(row[typecol]).lower() and 'nuclear' not in ws.title.lower():continue
   if typecol is None and 'nuclear' not in ws.title.lower() and 'gnpt' not in ws.title.lower():raise ValueError('Cannot establish this sheet is the nuclear tracker')
   d={k:row[i] if i is not None and i<len(row) else None for k,i in idx.items()};code=str(d['id'] or '').strip()
   if not code:continue
   if code in seen:raise ValueError('Duplicate GEM unit ID')
   seen.add(code);status=str(d['status'] or '').strip().lower()
   mapping={'operating':'operating','construction':'under_construction','pre-construction':'planned','announced':'planned','retired':'shut_down','mothballed':'mothballed','shelved':'shelved','shelved - inferred 2 y':'shelved','cancelled':'cancelled','cancelled - inferred 4 y':'cancelled'}
   norm=mapping.get(status);hold=[]
   if not norm:hold.append('status_requires_review')
   try:lat=float(d['lat']);lon=float(d['lon']);valid=-90<=lat<=90 and -180<=lon<=180
   except (TypeError,ValueError):lat=lon=None;valid=False
   if not valid:hold.append('coordinates_unresolved')
   dims={**d,'normalized_status':norm,'latitude':lat,'longitude':lon,'source_release':release,'note':'Status is not a radiological-risk estimate.'}
   rows.append(dict(zip(FIELDS,[digest(f'GEM|{code}|{release}'.encode())[:24],'nuclear_unit_capacity','nuclear unit',code,'GEM unit ID',number(d['mw']) if number(d['mw']) is not None else '', 'MW',release,url,'CC BY 4.0','https://globalenergymonitor.org/projects/global-nuclear-power-tracker/','Yellow',';'.join(hold+['confirm_download_release_and_dataset_reuse_clause']),'publisher_record',digest(b),json.dumps(dims,default=str)])))
 if len(rows)<100:raise ValueError('Unexpectedly small nuclear dataset; refuse incomplete global refresh')
 savecsv(work/'stage/GEM_nuclear_units.csv.gz',rows);return {'status':'acquired_held_release_rights','rows':len(rows),'publication':'not automatically enabled'}

def main():
 p=argparse.ArgumentParser();p.add_argument('--work',required=True);p.add_argument('--jobs',default='migration,districts,nuclear');p.add_argument('--year',type=int,default=2024);p.add_argument('--timeout',type=int,default=20);p.add_argument('--nuclear-input');p.add_argument('--nuclear-url',default='https://raw.githubusercontent.com/GlobalEnergyMonitor/gipt-dashboard/main/Global%20Integrated%20Power%20August%202026.xlsx');a=p.parse_args();work=Path(a.work);work.mkdir(parents=True,exist_ok=True);requested=a.jobs.split(',');results=[]
 jobs=[]
 if 'migration' in requested:jobs.append(('us_county_age_migration',lambda:migration(work/'migration',a.year,a.timeout)))
 if 'districts' in requested:
  for j in json.loads((HERE/'district_jobs.json').read_text()):jobs.append((j['id'],lambda j=j:boundary(work/j['id'],j,a.timeout)))
 if 'nuclear' in requested:jobs.append(('gem_nuclear',lambda:nuclear(work/'nuclear',a.nuclear_url,a.timeout,a.nuclear_input)))
 for name,fn in jobs:
  try:x=fn()
  except Exception as e:x={'status':'failed','error':type(e).__name__+': '+str(e),'rows':0}
  x['job']=name;results.append(x);write(work/'run_status.json',{'date':dt.datetime.now(dt.timezone.utc).isoformat(),'jobs':results,'complete':len(results)==len(jobs) and all(x['status'] in ['acquired_staged','validated_staged'] for x in results)});print(name,x['status'])
 return 0 if all(x['status'] in ['acquired_staged','validated_staged'] for x in results) else 2
if __name__=='__main__':sys.exit(main())
