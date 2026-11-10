"""Disk-backed staging, native-format export and country-neutral release checks.
This is a read-only bridge to Nestlyzer, not permission to publish unreviewed rows.
"""
from __future__ import annotations
import argparse, collections, csv, json, sqlite3, sys
from pathlib import Path
from nz_core import *

SCHEMA='''CREATE TABLE IF NOT EXISTS observations (
 record_id TEXT PRIMARY KEY, cc TEXT NOT NULL, geo_id TEXT NOT NULL,
 indicator_id TEXT NOT NULL, period TEXT NOT NULL, value TEXT, unit TEXT NOT NULL,
 boundary TEXT, source_id TEXT NOT NULL, payload TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS by_country ON observations(cc,geo_id);
 CREATE INDEX IF NOT EXISTS by_measure ON observations(cc,indicator_id,period);
 CREATE TABLE IF NOT EXISTS receipts(path TEXT PRIMARY KEY,sha256 TEXT NOT NULL,rows INTEGER NOT NULL);
'''

def stage(dbpath,paths):
    db=sqlite3.connect(dbpath);db.executescript(SCHEMA);stats={'added':0,'identical_observations':0,'files':[]}
    for p in paths:
        p=Path(p);digest=sha(p);added=0;identical=0
        try:
            db.execute('BEGIN')
            for r in readcsv(p):
                required={'record_id','cc','geo_id','indicator_id','period','unit','source_id','value','dimensions','source_sha256'}
                if not required.issubset(r):raise ValueError('Not a canonical observation file: '+str(p))
                if truth(r.get('publication_approved')) or truth(r.get('score_eligible')):raise ValueError('Staging input cannot self-approve')
                old=db.execute('SELECT payload FROM observations WHERE record_id=?',(r['record_id'],)).fetchone()
                if old:
                    previous=json.loads(old[0]);keys=('value','unit','observation_status','dimensions','boundary_vintage')
                    if any(previous.get(k)!=r.get(k) for k in keys):raise ValueError('Revision conflict for '+r['record_id']+'; retain previous release and review changes')
                    identical+=1;continue
                db.execute('INSERT INTO observations VALUES (?,?,?,?,?,?,?,?,?,?)',(r['record_id'],r['cc'],r['geo_id'],r['indicator_id'],r['period'],r['value'],r['unit'],r['boundary_vintage'],r['source_id'],js(r)));added+=1
            db.execute('INSERT OR REPLACE INTO receipts VALUES (?,?,?)',(str(p.resolve()),digest,added+identical));db.commit()
        except Exception:db.rollback();raise
        stats['added']+=added;stats['identical_observations']+=identical;stats['files'].append({'path':str(p),'sha256':digest,'added':added,'identical':identical})
    db.close();return stats

def report(dbpath):
    db=sqlite3.connect(dbpath);out=[]
    for row in db.execute("SELECT cc,COUNT(*),COUNT(DISTINCT geo_id),COUNT(DISTINCT indicator_id),SUM(CASE WHEN value<>'' THEN 1 ELSE 0 END),MIN(period),MAX(period) FROM observations GROUP BY cc ORDER BY cc"):
        cc,n,g,m,v,first,last=row
        out.append({'cc':cc,'observations':n,'official_native_geographies':g,'native_indicator_codes':m,'numeric':v,'period_min':first,'period_max':last,'published':0,'scored':0,'thin_status_changed':False,'note':'Source codes/years/denominators are not independent evidence domains.'})
    db.close();return out

def master(r):
    dims=json.loads(r['dimensions']);dims.update(observation_status=r['observation_status'],source_sha256=r.get('source_sha256',''))
    result={k:r[k] for k in ('record_id','indicator_id','label','period','value','unit','statistical_universe','boundary_vintage','source_id','source_url','source_release','retrieved_at','acquisition_method','quality_flags','hold_reasons')}
    result.update(country_codes=js([r['cc']]),source_geo_id=r['geo_id'],source_geo_name=r['geo_name'],source_geo_level=r['geo_level'],origin_packs='["nestlyzer-official-local-2026-11-02"]',original_variant_id=r['record_id'],purpose_tags='["household","business"]',statistic='published_value',dimensions=js(dims),ingestion_status='held_for_review',score_eligible='False',publication_approved='False')
    return result

def export_master(dbpath,out,cc,indicators,max_rows):
    if not indicators:raise ValueError('Select reviewed native indicators explicitly; refuse a national all-column dump into the memory-based legacy importer')
    db=sqlite3.connect(dbpath)
    sql='SELECT payload FROM observations WHERE cc=? AND indicator_id IN ('+','.join('?' for _ in indicators)+')'
    params=[cc]+indicators
    count=db.execute('SELECT COUNT(*) FROM ('+sql+')',params).fetchone()[0]
    if count>max_rows:raise ValueError(str(count)+' rows exceeds the memory-safety cap. Use the SQLite store in the new build or smaller indicator batches.')
    first=db.execute(sql+' LIMIT 1',params).fetchone()
    if not first:raise ValueError('No selected observations')
    fields=list(master(json.loads(first[0])))
    result=writecsv(out,(master(json.loads(x[0])) for x in db.execute(sql+' ORDER BY record_id',params)),fields)
    db.close();return result

def eligible_evidence(observation_row,approval,mapping):
    """A foreign country's missing evidence cannot receive a lower threshold."""
    if not approval or not mapping:return False
    if not all(truth(approval.get(k)) for k in ('publication_approved','score_eligible','current_for_purpose')):return False
    if not approval.get('reviewer') or not approval.get('evidence'):return False
    if not truth(mapping.get('approved')) or mapping.get('relationship')!='exact_boundary':return False
    if not mapping.get('evidence') or mapping.get('boundary_vintage')!=observation_row['boundary_vintage']:return False
    if mapping.get('source_geo_id')!=observation_row['geo_id']:return False
    for k in ('source_id','indicator_id','period','unit','boundary_vintage'):
        if approval.get(k)!=observation_row.get(k):return False
    if not observation_row.get('value') or observation_row.get('observation_status') not in ('published','calculated_from_official_components'):return False
    if observation_row['unit'].startswith('unresolved'):return False
    return True

def qualifies(domains,mandatory,weights,threshold=0.70):
    """Proposed product policy, not an official statistical quality standard."""
    if not weights or any(v<0 for v in weights.values()) or sum(weights.values())<=0:raise ValueError('Invalid domain weights')
    if not 0<=threshold<=1:raise ValueError('Threshold outside [0,1]')
    covered=set(domains);critical=set(mandatory)
    fraction=sum(v for k,v in weights.items() if k in covered)/sum(weights.values())
    return {'eligible':critical.issubset(covered) and fraction>=threshold,'weighted_direct_current_local_coverage':fraction,'missing_mandatory':sorted(critical-covered)}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);s=p.add_subparsers(dest='command',required=True)
    a=s.add_parser('stage');a.add_argument('--db',type=Path,required=True);a.add_argument('files',nargs='+',type=Path)
    a=s.add_parser('report');a.add_argument('--db',type=Path,required=True)
    a=s.add_parser('master');a.add_argument('--db',type=Path,required=True);a.add_argument('--cc',required=True);a.add_argument('--indicator',action='append',required=True);a.add_argument('--out',type=Path,required=True);a.add_argument('--max-rows',type=int,default=50000)
    args=p.parse_args()
    try:
        if args.command=='stage':result=stage(args.db,args.files)
        elif args.command=='report':result=report(args.db)
        else:result=export_master(args.db,args.out,args.cc,args.indicator,args.max_rows)
        print(json.dumps(result,indent=2))
    except (OSError,ValueError,sqlite3.Error,KeyError) as e:print(type(e).__name__+': '+str(e),file=sys.stderr);raise SystemExit(2)
