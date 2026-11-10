"""Streaming official-source adapters for FR, US, CA, AU, BR and MX.
Live source schemas are checked before output. Every result is staged, never published.
"""
from __future__ import annotations
import argparse, csv, json, re, sys, urllib.parse
from pathlib import Path
from nz_core import *

FR_URL='https://www.insee.fr/fr/statistiques/5359146'
US_BASE='https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/'
CA_URL='https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger/comp/getFile.cfm?Lang=E&GEONO=005&FILETYPE=CSV'
AU_BASE='https://data.api.abs.gov.au/rest/'
MX_URL='https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/iter/iter_00_cpv2020_csv.zip'

# Each line is an independent source measure, not a guaranteed scoring factor.
# Counts, denominators and MOEs must not inflate independent-domain coverage.
ACS={
 'B01003':('population','persons', ['001']),
 'B01002':('age','years',['001']),
 'B11001':('households','households',None),
 'B19013':('income','USD_2024/year',['001']),
 'B19301':('income','USD_2024/year',['001']),
 'B25064':('housing_cost','USD_2024/month',['001']),
 'B25077':('housing_value','USD_2024',['001']),
 'B25003':('housing_tenure','housing_units',None),
 'B23025':('employment','persons',None),
 'B15003':('education','persons',None),
 'B17001':('poverty','persons',['001','002']),
 'B08301':('transport','workers',None),
 'B08303':('transport','workers',None),
 'B28002':('connectivity','households',None),
}

MX_FIELDS={
 'POBTOT':('Resident population','persons','population'),
 'P_0A2':('Residents aged 0 to 2','persons','age'),
 'P_3A5':('Residents aged 3 to 5','persons','age'),
 'P_6A11':('Residents aged 6 to 11','persons','age'),
 'P_15YMAS':('Residents aged 15 and above','persons','education'),
 'P_18YMAS':('Residents aged 18 and above','persons','age'),
 'P_60YMAS':('Residents aged 60 and above','persons','age'),
 'P15YM_AN':('Illiterate residents aged 15 and above','persons','education'),
 'GRAPROES':('Average schooling of residents aged 15 and above','years','education'),
 'PEA':('Economically active population','persons','employment'),
 'PE_INAC':('Economically inactive population','persons','employment'),
 'POCUPADA':('Employed population','persons','employment'),
 'PDESOCUP':('Unemployed population','persons','employment'),
 'VIVTOT':('Total dwellings','dwellings','housing'),
 'TVIVHAB':('Inhabited dwellings','dwellings','housing'),
 'VIVPAR_HAB':('Inhabited private dwellings','dwellings','housing'),
 'VPH_PISOTI':('Inhabited private dwellings with earth floors','dwellings','housing_quality'),
 'VPH_C_ELEC':('Inhabited private dwellings with electricity','dwellings','utilities'),
 'VPH_AGUADV':('Inhabited private dwellings with piped water within dwelling','dwellings','utilities'),
 'VPH_DRENAJ':('Inhabited private dwellings with drainage','dwellings','utilities'),
 'VPH_INTER':('Inhabited private dwellings with internet','dwellings','connectivity'),
 'VPH_PC':('Inhabited private dwellings with computer','dwellings','connectivity'),
 'VPH_CEL':('Inhabited private dwellings with mobile telephone','dwellings','connectivity'),
}
# Do not infer availability of care from insurance affiliation or ethnic composition.

CA_RULES=[
 (r'^Population, 2021$','persons','population','2021'),
 (r'^Population, 2016$','persons','population','2016'),
 (r'^Population percentage change, 2016 to 2021$','percent','population','2016-2021'),
 (r'^Total private dwellings$','dwellings','housing','2021'),
 (r'^Private dwellings occupied by usual residents$','dwellings','housing','2021'),
 (r'^Population density per square kilometre$','persons/km2','population','2021'),
 (r'^Land area in square kilometres$','km2','geography','2021'),
 (r'^(Average|Median) age of the population$','years','age','2021'),
 (r'^Average (household size|size of census families)$','persons','households','2021'),
 (r'^(Median|Average) (total|after-tax) income of households in 2020','CAD_2020/year','income','2020'),
 (r'^(Median|Average) monthly shelter costs for (owned|rented) dwellings','CAD_2021/month','housing_cost','2021'),
 (r'^(Median|Average) value of dwellings','CAD_2021','housing_value','2021'),
 (r'^(Owner|Renter)$','households','housing_tenure','2021'),
 (r'^(Participation|Employment|Unemployment) rate$','percent','employment','2021'),
]

def fr_row(r,source_hash):
    if str(r.get('GEO_OBJECT'))!='COM':return None
    code=str(r['GEO'])
    if not re.fullmatch(r'[0-9A-Z]{5}',code):raise ValueError('Malformed INSEE commune code')
    value,status=number(r.get('OBS_VALUE'),decimal_comma=True);flags=[]
    conf=str(r.get('CONF_STATUS') or '').strip()
    obs_status=str(r.get('OBS_STATUS') or '').strip()
    if conf not in ('','F'):
        value=None;status='confidential_or_unknown_confidentiality';flags.append('confidentiality_dictionary_review')
    if obs_status not in ('','A'): flags.append('source_status_'+obs_status)
    mult,mstatus=number(r.get('UNIT_MULT'))
    if value is not None:
        if mult is None or not mult.is_integer() or abs(mult)>12:
            value=None;status='unit_multiplier_unresolved';flags.append(status)
        else:value*=10**int(mult)
    dims={k:str(r.get(k) or '') for k in ('DS','ID_TAB','TAB_MEASURE','OBS_STATUS','CONF_STATUS','UNIT_MULT')}
    return observation(cc='FR',geo_id='INSEE_COM:'+code,geo_name=str(r.get('GEO_LABEL') or ''),geo_level='municipality',boundary=r['GEO_REF'],indicator='insee:'+str(r['DS'])+':'+str(r['ID_TAB'])+':'+str(r['TAB_MEASURE']),label=str(r.get('TAB_MEASURE_LABEL') or r['TAB_MEASURE']),period=r['TIME_PERIOD'],value=value,unit=str(r.get('UNIT_MEASURE') or 'unresolved'),source='FR_INSEE_DOSSIER',url=FR_URL,release='long_schema_since_2026-07-22; live_revision_in_receipt',dims=dims,flags=flags,status=status,source_hash=source_hash)

def france(path):
    digest=sha(path)
    required={'GEO_REF','GEO_OBJECT','GEO','TIME_PERIOD','DS','ID_TAB','TAB_MEASURE','OBS_VALUE','UNIT_MULT','UNIT_MEASURE'}
    if Path(path).suffix=='.parquet':
        import pyarrow.parquet as pq
        pf=pq.ParquetFile(path)
        if not required.issubset(pf.schema_arrow.names):raise ValueError('INSEE long schema not found')
        for batch in pf.iter_batches(batch_size=10000):
            for r in batch.to_pylist():
                o=fr_row(r,digest)
                if o:yield o
    else:
        for header,values in csv_members(path,required):
            o=fr_row(dict(zip(header,values)),digest)
            if o:yield o

def us_geographies(path):
    result={}
    with Path(path).open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f,delimiter='|')
        if not {'GEO_ID','NAME'}.issubset(reader.fieldnames or []):raise ValueError('ACS geography schema mismatch')
        for r in reader:
            gid=r['GEO_ID']
            if re.fullmatch(r'1600000US\d{7}',gid):
                if gid in result:raise ValueError('Duplicate whole-place GEO_ID')
                result[gid]=r
    if not result:raise ValueError('No whole census places in geography file')
    return result

def acs_rows(path,table,geos,metadata=None):
    if table not in ACS:raise ValueError('Unselected ACS table')
    digest=sha(path);domain,unit,selected=ACS[table]
    with Path(path).open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f,delimiter='|');head=set(reader.fieldnames or [])
        estimates=sorted(x for x in head if re.fullmatch(table+r'_E\d{3}',x))
        if 'GEO_ID' not in head or not estimates:raise ValueError('ACS table schema mismatch')
        if selected:estimates=[x for x in estimates if x[-3:] in selected]
        for e in estimates:
            if e.replace('_E','_M') not in head:raise ValueError('Missing paired margin of error: '+e)
        for r in reader:
            gid=r['GEO_ID']
            if not re.fullmatch(r'1600000US\d{7}',gid):continue
            if gid not in geos:raise ValueError('ACS place absent from matching-year geography file')
            for e in estimates:
                v,status=number(r[e],nonnegative=True);moe,mstatus=number(r[e.replace('_E','_M')],nonnegative=True)
                api_var=table+'_'+e[-3:]+'E'
                meta=(metadata or {}).get('variables',{}).get(api_var,{})
                label=meta.get('label',api_var)
                dims={'table':table,'line':e[-3:],'estimate_window':'2020-2024','statistic':'estimate','domain_candidate':domain,'moe90':moe,'moe_status':mstatus,'raw_estimate':r[e],'raw_moe':r[e.replace('_E','_M')]}
                # MOE and raw values are data attributes, not identity dimensions.
                base_dims={k:v for k,v in dims.items() if k not in ('moe90','moe_status','raw_estimate','raw_moe')}
                o=observation(cc='US',geo_id='US:CENSUS_PLACE:'+gid[-7:],geo_name=geos[gid]['NAME'],geo_level='census_place',boundary='ACS2024',indicator='acs5:'+api_var,label=label,period='2020-2024',value=v,unit=unit,source='US_ACS_2024_5Y',url=US_BASE+'data/5YRData/acsdt5y2024-'+table.lower()+'.dat',release='ACS2024_5Y',dims=base_dims,flags=['survey_estimate','90_percent_MOE_in_dimensions','concept_label_unresolved'] if not meta else ['survey_estimate','90_percent_MOE_in_dimensions'],status=status,universe=meta.get('concept','see_table_shell_universe'),source_hash=digest)
                o['dimensions']=js(dims);yield o

def canada(path):
    digest=sha(path)
    required={'DGUID','GEO_NAME','CHARACTERISTIC_ID','CHARACTERISTIC_NAME','C1_COUNT_TOTAL'}
    for head,values in csv_members(path,required):
        r=dict(zip(head,values));dg=r['DGUID']
        if not re.fullmatch(r'2021A0005\d{7}',dg):continue
        label=r['CHARACTERISTIC_NAME'].strip()
        rule=next((x for x in CA_RULES if re.search(x[0],label,re.I)),None)
        if rule is None:continue
        _,unit,domain,period=rule
        # SYMBOL is repeated in the source header. Bind the adjacent symbol to C1,
        # never let DictReader silently overwrite it with women's/men's symbols.
        idx=head.index('C1_COUNT_TOTAL')
        symbol=values[idx+1].strip() if idx+1<len(head) and head[idx+1]=='SYMBOL' else ''
        value,status=number(r['C1_COUNT_TOTAL'],nonnegative=not label.lower().startswith('population percentage change'))
        if symbol.lower() in ('x','..','...'):
            value=None;status='suppressed_or_not_applicable'
        flags=['census_2021_not_2026','geography_crosswalk_required']
        if symbol:flags.append('statcan_symbol_'+symbol)
        if r.get('DATA_QUALITY_FLAG','').strip('0 '):flags.append('source_quality_flag_review')
        yield observation(cc='CA',geo_id='CA:CSD:'+dg[-7:],geo_name=r['GEO_NAME'],geo_level='census_subdivision',boundary='2021',indicator='statcan2021:'+r['CHARACTERISTIC_ID'],label=label,period=period,value=value,unit=unit,source='CA_CENSUS2021_PROFILE',url=CA_URL,release='2021_Census_Profile; live_revision_in_receipt',dims={'dguid':dg,'characteristic_id':r['CHARACTERISTIC_ID'],'statistic':'total_column','domain_candidate':domain,'symbol':symbol,'quality_flag':r.get('DATA_QUALITY_FLAG',''),'tnr_short':r.get('TNR_SF',''),'tnr_long':r.get('TNR_LF','')},flags=flags,status=status,source_hash=digest)

def australia(path,column_map=None):
    digest=sha(path);mapping=column_map or {}
    with Path(path).open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f);head=reader.fieldnames or []
        def col(role,choices,required=True):
            if role in mapping:
                if mapping[role] not in head:raise ValueError('Configured ABS column absent: '+mapping[role])
                return mapping[role]
            found=[x for x in choices if x in head]
            if len(found)==1:return found[0]
            if not required and not found:return None
            raise ValueError('ABS '+role+' column unresolved. Supply --column-map after inspecting header: '+repr(head))
        area=col('area',['LGA_2021','LGA2021','REGION','REGION_CODE','REF_AREA','ASGS_2021'])
        measure=col('measure',['MEASURE','DATA_ITEM','MEASURE_ID'])
        period=col('period',['TIME_PERIOD']);val=col('value',['OBS_VALUE'])
        unitcol=col('unit',['UNIT_MEASURE','UNIT'],False)
        multcol=col('multiplier',['UNIT_MULT'],False)
        namecol=col('name',['Region','REGION_LABEL','REF_AREA_LABEL','LGA_2021_LABEL'],False)
        for r in reader:
            code=r[area].split(':',1)[0].strip()
            if not re.fullmatch(r'\d{5}',code):continue
            value,status=number(r[val]);flags=['series_metadata_review','LGA2021_not_city_or_suburb']
            multiplier=None
            if multcol:multiplier,_=number(r[multcol])
            if value is not None and multiplier is not None:
                if not multiplier.is_integer() or abs(multiplier)>12:raise ValueError('ABS invalid unit multiplier')
                value*=10**int(multiplier)
            if multcol and multiplier is None and value is not None:
                value=None;status='unit_multiplier_unresolved'
            if unitcol is None:flags.append('unit_from_DSD_required')
            dims={k:v for k,v in r.items() if k not in (val,period,area,namecol)}
            # A flow can include sex/age/industry dimensions. Retain every dimension.
            yield observation(cc='AU',geo_id='AU:LGA2021:'+code,geo_name=r.get(namecol,'') if namecol else '',geo_level='local_government_area',boundary='ASGS_LGA2021',indicator='abs_dbr:'+r[measure],label=r.get('Measure',r[measure]),period=r[period],value=value,unit=r[unitcol] if unitcol and r[unitcol] else 'unresolved_DSD_unit',source='AU_DBR_LGA2021',url=AU_BASE+'data/ABS,ABS_REGIONAL_LGA2021,1.6.0/all?format=csv',release='Data_by_Region_2011-25; flow_1.6.0',dims=dims,flags=flags,status=status,source_hash=digest)

def mexico(path):
    digest=sha(path)
    for head,vals in csv_members(path,{'ENTIDAD','NOM_ENT','MUN','NOM_MUN','LOC','POBTOT'},encoding='utf-8-sig'):
        r=dict(zip(head,vals));ent=clean_code(r['ENTIDAD'],2);mun=clean_code(r['MUN'],3);loc=clean_code(r['LOC'],4)
        if ent=='00' or mun=='000' or loc!='0000':continue
        for field,(label,unit,domain) in MX_FIELDS.items():
            if field not in head:raise ValueError('INEGI expected field missing: '+field)
            v,status=number(r[field],nonnegative=True)
            yield observation(cc='MX',geo_id='MX:INEGI_MUN:'+ent+mun,geo_name=r['NOM_MUN'],geo_level='municipality_or_demarcation',boundary='Marco_Geoestadistico_2020',indicator='inegi2020:'+field,label=label,period='2020',value=v,unit=unit,source='MX_CPV2020_ITER',url=MX_URL,release='CPV2020_ITER; live_revision_in_receipt',dims={'variable':field,'entity_code':ent,'municipality_code':mun,'domain_candidate':domain},flags=['census_2020_not_current_prices','geonames_crosswalk_required'],status=status,source_hash=digest)

BR_TABLES={
 '4714':('population_density_area','2022'),
 '9514':('age_structure','2022'),
 '9543':('literacy','2022'),
 '6803':('water_supply','2022'),
 '6804':('water_piping','2022'),
 '6805':('sanitation','2022'),
 '6579':('annual_population','latest'),
 '5938':('municipal_economy','latest'),
}

def ibge_results(data,table,digest,url):
    """IBGE aggregates v3. Labels/units come from returned official metadata."""
    if not isinstance(data,list):raise ValueError('IBGE expected variable list')
    for variable in data:
        if not {'id','variavel','unidade','resultados'}.issubset(variable):raise ValueError('IBGE variable schema changed')
        for result in variable['resultados']:
            classes=result.get('classificacoes',[])
            for series in result.get('series',[]):
                loc=series.get('localidade',{});level=loc.get('nivel',{}).get('id')
                if level!='N6':raise ValueError('IBGE nonmunicipal series returned')
                code=clean_code(loc['id'],7)
                for period,raw in series.get('serie',{}).items():
                    v,status=(0.0,'published') if str(raw).strip()=='-' else number(raw,decimal_comma=True)
                    yield observation(cc='BR',geo_id='BR:IBGE_MUN:'+code,geo_name=loc['nome'],geo_level='municipality',boundary='source_table_'+table+'_period_'+str(period),indicator='ibge:'+table+':'+str(variable['id']),label=variable['variavel'],period=period,value=v,unit=variable['unidade'] or 'unresolved',source='BR_IBGE_'+table,url=url,release='live_IBGE_revision_in_receipt',dims={'table':table,'variable_id':str(variable['id']),'classifications':classes,'domain_candidate':BR_TABLES.get(table,('unreviewed',))[0]},flags=['boundary_vintage_from_metadata_required','native_IBGE_code_not_GeoNames'],status=status,source_hash=digest)

def fetch_brazil(client,table):
    base='https://servicodados.ibge.gov.br/api/v3/agregados/'+table
    meta,mreceipt=client.json(base+'/metadados',name='BR_'+table+'_metadata.json')
    periods,_=client.json(base+'/periodos',name='BR_'+table+'_periods.json')
    wanted=BR_TABLES[table][1]
    ids=[str(p['id']) for p in periods]
    if wanted=='latest':
        years=[p for p in ids if re.fullmatch(r'20\d{2}',p)]
        if not years:raise ValueError('No annual IBGE reference year')
        wanted=max(years)
    if wanted not in ids:raise ValueError('Requested IBGE period unavailable')
    levels=meta.get('nivelTerritorial',{})
    if 'N6' not in js(levels):raise ValueError('IBGE table has no municipality level')
    # Only all-population totals for protected demographic classifications.
    # For water/sanitation retain source categories. Each category stays explicit.
    selections=[]
    for c in meta.get('classificacoes',[]):
        name=c.get('nome','').lower();cats=c.get('categorias',[])
        totals=[str(x['id']) for x in cats if str(x.get('nome','')).strip().lower()=='total']
        sensitive=bool(re.search(r'sexo|cor ou ra\u00e7a|ra\u00e7a|relig|etni|idade',name))
        if sensitive:
            if not totals:raise ValueError('No verified all-population total for '+name)
            selected=totals
        elif table in ('6803','6804','6805'):selected=[str(x['id']) for x in cats]
        else:
            if not totals:raise ValueError('Classification requires reviewed selection: '+name)
            selected=totals
        selections.append(str(c['id'])+'['+','.join(selected)+']')
    # Table-specific geographic roster; batching protects the 100,000-cell limit.
    places,_=client.json(base+'/localidades/N6',name='BR_'+table+'_municipalities.json')
    codes=[str(x['id']) for x in places if x.get('nivel',{}).get('id')=='N6']
    if not codes:raise ValueError('IBGE table-specific municipal roster unavailable')
    combinations=1
    for selection in selections:
        combinations*=len(selection.split('[',1)[1].rstrip(']').split(','))
    if combinations>80000:raise ValueError('IBGE classifications too broad; select reviewed categories')
    batch_size=max(1,min(500,80000//combinations))
    for var in meta.get('variaveis',[]):
        for start in range(0,len(codes),batch_size):
            query={'localidades':'N6['+'|'.join(codes[start:start+batch_size])+']'}
            if selections:query['classificacao']='|'.join(selections)
            url=base+'/periodos/'+wanted+'/variaveis/'+str(var['id'])+'?'+urllib.parse.urlencode(query)
            data,receipt=client.json(url,name='BR_'+table+'_'+str(var['id'])+'_'+wanted+'_'+str(start)+'.json',max_bytes=150_000_000)
            yield from ibge_results(data,table,receipt['sha256'],url)

def run_country(cc,cache,out,input_path=None,column_map=None):
    client=Client(cache);out=Path(out);out.mkdir(parents=True,exist_ok=True)
    reports=[]
    if cc=='FR':
        p=Path(input_path) if input_path else client.request('https://www.insee.fr/fr/statistiques/fichier/5359146/dossier_complet.parquet',name='dossier_complet.parquet')[0]
        reports.append(writecsv(out/'FR_observations.csv.gz',france(p),check_ids=True))
    elif cc=='US':
        geo=client.request(US_BASE+'documentation/Geos20245YR.txt',name='Geos20245YR.txt')[0];geos=us_geographies(geo)
        for table in ACS:
            p=client.request(US_BASE+'data/5YRData/acsdt5y2024-'+table.lower()+'.dat',name=table+'.dat')[0]
            metadata={}
            # Metadata is optional for extraction, never optional for publication approval.
            try:metadata,_=client.json('https://api.census.gov/data/2024/acs/acs5/groups/'+table+'.json',name=table+'_metadata.json')
            except (OSError,ValueError) as e:print('Metadata held for '+table+': '+type(e).__name__,file=sys.stderr)
            reports.append(writecsv(out/('US_'+table+'.csv.gz'),acs_rows(p,table,geos,metadata),check_ids=True))
    elif cc=='CA':
        p=Path(input_path) if input_path else client.request(CA_URL,name='CA_CSD_2021.zip',max_bytes=4_000_000_000)[0]
        reports.append(writecsv(out/'CA_observations.csv.gz',canada(p),check_ids=True))
    elif cc=='AU':
        if input_path:p=Path(input_path)
        else:
            client.request(AU_BASE+'dataflow/ABS/ABS_REGIONAL_LGA2021/1.6.0?references=all',name='AU_structure.xml',headers={'Accept':'application/vnd.sdmx.structure+xml;version=2.1'})
            p=client.request(AU_BASE+'data/ABS,ABS_REGIONAL_LGA2021,1.6.0/all?format=csv',name='AU_LGA2021.csv',headers={'Accept':'application/vnd.sdmx.data+csv;labels=id'})[0]
        reports.append(writecsv(out/'AU_observations.csv.gz',australia(p,column_map),check_ids=True))
    elif cc=='MX':
        p=Path(input_path) if input_path else client.request(MX_URL,name='MX_ITER2020.zip')[0]
        reports.append(writecsv(out/'MX_observations.csv.gz',mexico(p),check_ids=True))
    elif cc=='BR':
        failures={}
        for table in BR_TABLES:
            try:reports.append(writecsv(out/('BR_'+table+'.csv.gz'),fetch_brazil(client,table),check_ids=True))
            except (OSError,ValueError,KeyError) as e:failures[table]=str(e)
        if failures:jsonwrite(out/'BR_failures.json',failures)
        if failures:raise ValueError('Incomplete BR acquisition; see BR_failures.json. Successful tables remain staged.')
    else:raise ValueError('Unsupported country')
    jsonwrite(out/(cc+'_acquisition.json'),{'country':cc,'reports':reports,'status':'staged_only','site_changed':False})
    return reports

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--country',choices=['FR','US','CA','AU','BR','MX'],required=True);p.add_argument('--cache',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--input',type=Path);p.add_argument('--column-map',type=Path)
    a=p.parse_args()
    try:print(json.dumps(run_country(a.country,a.cache,a.out,a.input,json.loads(a.column_map.read_text()) if a.column_map else None),indent=2))
    except Exception as e:print(type(e).__name__+': '+str(e),file=sys.stderr);raise SystemExit(2)
