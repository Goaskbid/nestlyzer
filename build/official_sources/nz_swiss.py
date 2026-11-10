"""Swiss official tax-calculator extraction and BFS roster reconciliation.
The calculator operation contract is undocumented and MUST pass a live preflight.
The tools never remove 2018 data or change scores. Raw requests and responses are retained.
"""
from __future__ import annotations
import argparse, collections, csv, json, sys, time, urllib.parse
from pathlib import Path
from nz_core import *

BASE='https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV/'
BFS='https://www.agvchapp.bfs.admin.ch/api/communes/'
INC=('IncomeTaxCanton','IncomeTaxCity','IncomeTaxChurch')
WEALTH=('FortuneTaxCanton','FortuneTaxCity','FortuneTaxChurch')
COMPONENTS=('IncomeTaxFed',)+INC+WEALTH+('PersonalTax','TaxCredit','TotalTax','TaxableIncomeFed','TaxableIncomeCanton','TaxableFortuneCanton')
FACTORS=('single_income_tax_100k','single_income_tax_150k','family_income_tax_100k','retiree_tax_100k','wealth_tax_1m','wealth_tax_5m')

class TaxClient:
    def __init__(self,cache):self.http=Client(cache,delay=1.0);self.version='preflight'
    def call(self,operation,payload,*,fresh=False):
        token=hashlib.sha256((self.version+js(payload)).encode()).hexdigest()[:18]
        name=operation+'_'+(str(time.time_ns()) if fresh else token)+'.json'
        data,receipt=self.http.json(BASE+operation,payload=payload,name=name,max_bytes=100_000_000)
        if not isinstance(data,dict) or 'response' not in data:raise ValueError('ESTV response envelope changed: '+operation)
        return data['response'],receipt
    def preflight(self):
        version,vr=self.call('API_getTaxVersion',{},fresh=True)
        if not version:raise ValueError('Missing calculator version')
        self.version=js(version)
        years,yr=self.call('API_getTaxYearRange',{'Calculator':1},fresh=True)
        if not isinstance(years,dict) or not {'MinYear','MaxYear'}.issubset(years):raise ValueError('Tax-year-range schema changed')
        return version,years


def table_rows(path,required):
    with Path(path).open(encoding='utf-8-sig',newline='') as f:
        first=f.readline();sep=';' if first.count(';')>first.count(',') else ','
        f.seek(0);reader=csv.DictReader(f,delimiter=sep)
        if not set(required).issubset(reader.fieldnames or []):raise ValueError('BFS CSV schema mismatch: '+repr(reader.fieldnames))
        yield from reader

def snapshot(client,date):
    url=BFS+'snapshot?'+urllib.parse.urlencode({'date':date,'format':'csv'})
    p,receipt=client.request(url,name='bfs_snapshot_'+date+'.csv')
    result={}
    for r in table_rows(p,{'BfsCode','Name','Level'}):
        if str(r['Level'])!='1':continue
        code=clean_code(r['BfsCode'])
        if code in result:raise ValueError('Duplicate BFS code in snapshot')
        result[code]=r
    if len(result)<1000:raise ValueError('BFS snapshot did not return a national commune roster')
    return result,receipt

def correspondence(client,start,end):
    url=BFS+'correspondances?'+urllib.parse.urlencode({'includeUnmodified':'true','includeTerritoryExchange':'true','startPeriod':start,'endPeriod':end,'format':'csv'})
    p,receipt=client.request(url,name='bfs_correspondence_'+start+'_'+end+'.csv')
    mapping=collections.defaultdict(set)
    for r in table_rows(p,{'InitialCode','TerminalCode'}):
        try:a=clean_code(r['InitialCode']);b=clean_code(r['TerminalCode'])
        except ValueError:continue
        mapping[a].add(b)
    return mapping,receipt

def scenario_payload(scenario,year):
    p=dict(scenario['request']);p.update(TaxYear=int(year),TaxGroupID=99,SimKey=None)
    required={'Relationship','Confession1','Age1','RevenueType1','Revenue1','Fortune','Children','Confession2','Age2','RevenueType2','Revenue2'}
    if not required.issubset(p):raise ValueError('Incomplete explicit household scenario')
    if p['Relationship']==1 and any(p[x] for x in ('Confession2','Age2','RevenueType2','Revenue2')):raise ValueError('Single household has second adult')
    if any(x['Age']<0 for x in p['Children']):raise ValueError('Invalid child age')
    return p

def location(row):
    loc=row.get('Location')
    if not isinstance(loc,dict) or 'BfsID' not in loc or 'TaxLocationID' not in loc:
        raise ValueError('ESTV location schema changed; inspect cached raw result before modifying adapter')
    return clean_code(loc['BfsID']),loc

def tax_value(result,scenario):
    fields=INC if scenario['kind']=='income' else WEALTH
    nums=[]
    for k in fields:
        if k not in result:return None,'missing_component_'+k
        v,status=number(result[k],nonnegative=True)
        if v is None:return None,'invalid_component_'+k
        nums.append(v)
    denominator=float(scenario['denominator_chf'])
    if denominator<=0:raise ValueError('Nonpositive tax denominator')
    scale=100 if scenario['kind']=='income' else 1000
    return sum(nums)/denominator*scale,'calculated_from_official_components'

def detail_payload(base,location_id,budget):
    if not isinstance(budget,list) or not all(isinstance(x,dict) for x in budget):raise ValueError('Unexpected ESTV budget schema')
    # Detailed calculator reads wealth from NETTO_VM in its budget, not Fortune.
    # Refuse a wealthy household without an explicit wealth budget line.
    if float(base['Fortune'])>0:
        lines=[x for x in budget if x.get('Ident')=='NETTO_VM']
        if len(lines)!=1:raise ValueError('Expected one NETTO_VM wealth budget line')
        value,_=number(lines[0].get('Value'))
        if value is None or abs(value-float(base['Fortune']))>0.01:raise ValueError('Wealth budget differs from requested net wealth')
    p={k:v for k,v in base.items() if k!='TaxGroupID'}
    p.update(TaxLocationID=location_id,Fortune=0,Budget=budget)
    return p

def candidate_rows(results,scenario,year,version,roster,rawhash):
    """One candidate per official commune; divergent parish/tax-location rows are held."""
    grouped=collections.defaultdict(list)
    for row in results:
        bfs,loc=location(row)
        if bfs in roster:grouped[bfs].append(row)
    for bfs,geo in sorted(roster.items(),key=lambda x:int(x[0])):
        group=grouped.get(bfs,[]);values=[tax_value(x,scenario) for x in group]
        missing=not group or any(v is None for v,_ in values)
        conflict=not missing and max(v for v,_ in values)-min(v for v,_ in values)>0.000001
        value=None if missing or conflict else values[0][0]
        status='missing_calculator_location' if not group else ('missing_or_invalid_components' if missing else ('conflicting_submunicipal_taxes' if conflict else 'calculated_from_official_components'))
        components=[{k:x[k] for k in COMPONENTS if k in x} for x in group]
        dims={'scenario_id':scenario['scenario_id'],'scenario_version':scenario['version'],'household_request':scenario_payload(scenario,year),'calculator_version':version,'included_components':list(INC if scenario['kind']=='income' else WEALTH),'excluded_components':['IncomeTaxFed','PersonalTax','TaxCredit'],'denominator_chf':scenario['denominator_chf'],'tax_location_ids':sorted(str(x['Location']['TaxLocationID']) for x in group),'kind':scenario['kind']}
        flags=['scenario_assumptions_require_approval','legacy_equivalence_not_assumed']
        if len(group)>1:flags.append('multiple_tax_locations_'+('agree' if not missing and not conflict else 'unresolved'))
        o=observation(cc='CH',geo_id='CH:BFS:'+bfs,geo_name=geo['Name'],geo_level='municipality',boundary='01-01-'+str(year),indicator='estv:'+scenario['scenario_id'],label=scenario['label'],period=year,value=value,unit='percent_gross_income' if scenario['kind']=='income' else 'permille_net_wealth',source='CH_ESTV_CALCULATOR',url='https://swisstaxcalculator.estv.admin.ch/',release=str(version),dims=dims,flags=flags,status=status,source_hash=rawhash,holds=['scenario_approval','live_UI_benchmark','source_component_review','BFS_coverage_and_alias_review'])
        # Values are provenance attributes, deliberately excluded from stable identity.
        dims['official_components_by_location']=components;dims['detail_response_sha256']=[x.get('_detail_response_sha256','') for x in group];o['dimensions']=js(dims)
        yield o

def coverage_gate(rows,roster,scenarios):
    expected={(code,s['scenario_id']) for code in roster for s in scenarios}
    seen={};failures=[];versions=set();years=set()
    for r in rows:
        d=json.loads(r['dimensions']);key=(r['geo_id'].split(':')[-1],d['scenario_id'])
        if key in seen:failures.append('duplicate_candidate:'+':'.join(key))
        seen[key]=r;versions.add(js(d['calculator_version']));years.add(r['period'])
        if r['value']=='':failures.append('missing_candidate:'+':'.join(key))
    missing=expected-set(seen);unexpected=set(seen)-expected
    if missing:failures.append('missing_cells:'+str(len(missing)))
    if unexpected:failures.append('unexpected_cells:'+str(len(unexpected)))
    if len(versions)!=1:failures.append('mixed_calculator_versions')
    if len(years)!=1:failures.append('mixed_tax_years')
    assumptions=all(s.get('scenario_approved') is True for s in scenarios)
    if not assumptions:failures.append('scenario_assumptions_not_approved')
    return {'expected_current_communes':len(roster),'expected_cells':len(expected),'received_cells':len(seen),'numeric_cells':sum(r['value']!='' for r in seen.values()),'technical_coverage_complete':not any(x.startswith('duplicate_candidate:') for x in failures) and not missing and not unexpected and len(seen)==len(expected) and all(r['value']!='' for r in seen.values()) and len(versions)==1 and len(years)==1,'scenario_assumptions_approved':assumptions,'failures':failures,'retire_2018_authorised':False,'remaining_release_checks':['live_UI_benchmarks','component_accounting','official_roster_alias_review','rank_diff_and_atomic_deploy']}

def run(repo,cache,out,config,year='latest',baseline='01-01-2021',detail_fallback=False,max_detail_calls=0):
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    conf=json.loads(Path(config).read_text());scenarios=conf['scenarios']
    if set(s['legacy_factor'] for s in scenarios)!=set(FACTORS) or len(scenarios)!=6:raise ValueError('All six tax factors require distinct scenarios')
    api=TaxClient(cache);version,years=api.preflight()
    selected=min(int(years['MaxYear']),dt.date.today().year) if year=='latest' else int(year)
    if selected<2019 or not int(years['MinYear'])<=selected<=int(years['MaxYear']):raise ValueError('Requested current-tax year unavailable')
    roster,rreceipt=snapshot(api.http,'01-01-'+str(selected))
    base,breceipt=snapshot(api.http,baseline)
    mapping,creceipt=correspondence(api.http,baseline,'01-01-'+str(selected))
    app=json.loads((Path(repo)/'data/c/CH.json').read_text());cols={x:i for i,x in enumerate(app['cols'])}
    active=[r for r in app['rows'] if not r[cols['sup']]]
    ids={clean_code(r[cols['oid']]) for r in active}
    mismatch=sorted(ids-set(base))
    if mismatch:raise ValueError('App codes absent from proposed baseline: '+str(mismatch[:20])+'. Correct --baseline-date; no guessed joins.')
    aliases=[]
    for r in active:
        old=clean_code(r[cols['oid']]);targets=sorted(mapping.get(old,set()))
        # Correspondence includes territory exchanges. One-to-one is a candidate,
        # not proof that taxes over old territory are homogeneous after a merger.
        status='review_boundary_and_successor' if len(targets)==1 else ('split_or_territory_exchange' if targets else 'unresolved')
        if len(targets)==1 and targets[0]==old and base[old].get('HistoricalCode')==roster.get(old,{}).get('HistoricalCode'):status='unchanged_historical_entity'
        aliases.append({'old_place_id':'CH:'+old,'old_name':r[cols['name']],'baseline_date':baseline,'tax_year':selected,'successor_bfs_codes':js(targets),'status':status,'publication_approved':'False'})
    writecsv(out/'CH_alias_review.csv',aliases,list(aliases[0]))
    jsonwrite(out/'CH_roster.json',{'tax_year':selected,'communes':roster,'raw_receipt':rreceipt,'baseline_receipt':breceipt,'correspondence_receipt':creceipt})
    detail_calls=0;allrows=[];unknown_locations=[]
    for s in scenarios:
        payload=scenario_payload(s,selected)
        results,receipt=api.call('API_calculateManySimpleTaxes',payload)
        if not isinstance(results,list) or not results:raise ValueError('Bulk calculator did not return a nonempty list')
        for item in results:
            bfs,loc=location(item)
            if bfs not in roster:unknown_locations.append({'scenario':s['scenario_id'],'bfs':bfs,'tax_location':loc['TaxLocationID']})
            val,status=tax_value(item,s)
            if val is None and detail_fallback:
                if detail_calls+2>max_detail_calls:raise ValueError('Detail request cap reached; resume from cache with explicit higher cap')
                p={k:v for k,v in payload.items() if k!='TaxGroupID'};p['TaxLocationID']=loc['TaxLocationID']
                budget,_=api.call('API_calculateTaxBudget',p);detail_calls+=1
                detailed,dreceipt=api.call('API_calculateDetailedTaxes',detail_payload(payload,loc['TaxLocationID'],budget));detail_calls+=1
                if not isinstance(detailed,dict):raise ValueError('Detailed calculator schema changed')
                item.update(detailed);item['Location']=loc
                item['_detail_response_sha256']=dreceipt['sha256']
        staged=list(candidate_rows(results,s,selected,version,roster,receipt['sha256']))
        allrows.extend(staged)
        writecsv(out/('CH_'+s['scenario_id']+'.csv'),staged,check_ids=True)
    after,_=api.call('API_getTaxVersion',{},fresh=True)
    gate=coverage_gate(allrows,roster,scenarios)
    gate.update(tax_year=selected,calculator_version=version,version_stable=(version==after),unmatched_old_places=sum(x['status']!='unchanged_historical_entity' for x in aliases),unknown_tax_locations=unknown_locations,detail_calls=detail_calls,site_changed=False)
    if version!=after:gate['failures'].append('calculator_changed_during_run');gate['technical_coverage_complete']=False
    if unknown_locations:gate['failures'].append('tax_locations_outside_BFS_roster');gate['technical_coverage_complete']=False
    jsonwrite(out/'CH_tax_gate.json',gate)
    return gate

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--repo',type=Path,required=True);p.add_argument('--cache',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--config',type=Path,default=HERE/'03_scenarios.json');p.add_argument('--year',default='latest');p.add_argument('--baseline-date',default='01-01-2021');p.add_argument('--detail-fallback',action='store_true');p.add_argument('--max-detail-calls',type=int,default=0)
    a=p.parse_args()
    try:
        report=run(a.repo,a.cache,a.out,a.config,a.year,a.baseline_date,a.detail_fallback,a.max_detail_calls);print(json.dumps(report,indent=2));raise SystemExit(0 if report['technical_coverage_complete'] else 2)
    except (OSError,ValueError,KeyError,TypeError) as e:print(type(e).__name__+': '+str(e),file=sys.stderr);raise SystemExit(2)
