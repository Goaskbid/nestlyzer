#!/usr/bin/env python3
"""Idempotently expose reviewed station normals as context, never ranking inputs."""
from pathlib import Path
import argparse,csv,hashlib,json,math
SOURCE_ID='NOAA_NWS_TBW_NORMAL_1991_2020_TRANSCRIBED_20261110'

def distance(lat,lon,a,b):
 x,y=math.radians(lat),math.radians(a)
 return 2*6371.0088*math.asin(min(1,math.sqrt(math.sin((y-x)/2)**2+math.cos(x)*math.cos(y)*math.sin(math.radians(b-lon)/2)**2)))

def put(path,obj):
 text=json.dumps(obj,ensure_ascii=False,separators=(',',':'))
 if path.exists() and path.read_text()==text:return False
 path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_name(path.name+'.part');tmp.write_text(text);tmp.replace(path);return True

def run(root):
 root=Path(root);src=root/'build/source/measured-climate';catalog=json.loads((src/'NOAA_station_normals_transcription.json').read_text())
 stations=catalog['stations'];records=[]
 if len({s['station_id'] for s in stations})!=len(stations):raise ValueError('Duplicate station ID')
 for s in stations:
  if s['commercial_reuse_status']!='Green' or s['score_eligible'] is not False:raise ValueError('Only rights-cleared, non-scoring context accepted')
  if not (-90<=s['latitude']<=90 and -180<=s['longitude']<=180):raise ValueError('Invalid station coordinates')
  for key,values in s['original'].items():
   if key not in ['tmax','tmin','tavg','prcp'] or len(values)!=13 or not all(isinstance(v,(int,float)) and math.isfinite(v) for v in values):raise ValueError('Invalid normal series')
   for i,v in enumerate(values):
    month=i+1 if i<12 else 0;ident=f"{s['station_id']}|1991-2020|{key}|{month}"
    records.append({'record_id':hashlib.sha256(ident.encode()).hexdigest()[:24],
      'source_geo_id':'GHCND:'+s['station_id'],'source_geo_level':'climate_station','area_label':s['name'],
      'indicator_id':'climate_normal_'+key,'label':{'tmax':'Mean daily maximum temperature normal','tmin':'Mean daily minimum temperature normal','tavg':'Mean temperature normal','prcp':'Precipitation total normal'}[key],
      'value':v,'unit':s['original_units'][key],'reference_period':s['period'],'statistic':'published_annual_normal' if month==0 else 'published_monthly_normal',
      'dimensions':{'calendar_month':month,'normal_period':s['period'],'geographic_support':'station, not municipal average','latitude':s['latitude'],'longitude':s['longitude'],'score_eligible':False,'derived_si_value':s['series'][key][i],'derived_si_unit':s['series_units'][key]},
      'source_id':SOURCE_ID,'source_url':s['source_url'],'licence':s['licence'],'licence_url':s['licence_url'],
      'acquisition_method':s['acquisition_method'],'original_image_bytes_archived':False,'score_eligible':False,
      'quality_flags':['nearby_station_is_not_municipal_measure','transcription_not_original_bytes','normal_period_1991_2020','not_a_weather_forecast']})
 if len({r['record_id'] for r in records})!=len(records):raise ValueError('Duplicate observation identity')
 links={};updated=0;oldcount=0
 for cc in sorted({s['country'] for s in stations}):
  sh=json.loads((root/f'data/c/{cc}.json').read_text());xp=root/f'data/x/{cc}.json';x=json.loads(xp.read_text());ctx=x.setdefault('ctx',{});ctx.setdefault('records',[]);ctx.setdefault('places',{});ctx.setdefault('regions',{})
  oldcount+=sum(r.get('source_id')==SOURCE_ID for r in ctx['records']);ctx['records']=[r for r in ctx['records'] if r.get('source_id')!=SOURCE_ID]
  codes={'GHCND:'+s['station_id'] for s in stations if s['country']==cc}
  # Remove only our own station references; preserve all prior sources and associations.
  for oid,items in list(ctx['places'].items()):
   ctx['places'][oid]=[a for a in items if a[0] not in codes]
   if not ctx['places'][oid]:del ctx['places'][oid]
  ctx['records'].extend(r for r in records if r['source_geo_id'] in codes)
  for row in sh['rows']:
   d=dict(zip(sh['cols'],row));lat,lon=d.get('lat'),d.get('lon')
   if d.get('sup') or not isinstance(lat,(float,int)) or not isinstance(lon,(float,int)):continue
   near=sorted((distance(lat,lon,s['latitude'],s['longitude']),s['station_id']) for s in stations if s['country']==cc)
   if not near or near[0][0]>25:continue
   km,station=near[0];pid=cc+':'+str(d['oid']);links[pid]={'station_id':station,'distance_km':round(km,3),'relationship':'nearby_station_context_not_a_municipal_measure','score_eligible':False}
   ctx['places'].setdefault(str(d['oid']),[]).append(['GHCND:'+station,'station_context_within_25km'])
  updated+=int(put(xp,x))
  put(root/f'data/measured-climate/{cc}.json',{'schema':'station-links-1','links':{k:v for k,v in links.items() if k.startswith(cc+':')},'display_radius_km':25,'method':'nearest acquired station, not the nearest in the complete network','score_eligible':False})
 put(root/'data/measured-climate/stations.json',{'schema':'station-normals-1','stations':{s['station_id']:s for s in stations}})
 return {'unique_station_observations':len(records),'unique_stations':len(stations),'place_context_links':len(links),'prior_observations_replaced_same_identity':oldcount,'changed_country_files':updated,'municipal_observations_added':0,'ranking_inputs_added':0}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',default=str(Path(__file__).resolve().parent.parent));a=p.parse_args();print(json.dumps(run(a.root)))
