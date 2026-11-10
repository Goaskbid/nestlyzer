"""Offline fixtures only. Synthetic rows never constitute acquired official data."""
import csv, io, json, tempfile, unittest, zipfile
from pathlib import Path
from nz_core import *
from nz_countries import *
from nz_swiss import candidate_rows,coverage_gate,tax_value,scenario_payload,detail_payload,INC,WEALTH
from nz_integrate import stage,report,master,eligible_evidence,qualifies,export_master

class Base(unittest.TestCase):
    def setUp(self):self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
    def tearDown(self):self.tmp.cleanup()
    def file(self,name,headers,rows,sep=','):
        p=self.root/name
        with p.open('w',encoding='utf-8',newline='') as f:w=csv.writer(f,delimiter=sep);w.writerow(headers);w.writerows(rows)
        return p
    def obs(self,value=10,**kw):
        args=dict(cc='FR',geo_id='INSEE_COM:01001',geo_name='Synthetic fixture',geo_level='municipality',boundary='2026',indicator='test:population',label='Synthetic population',period='2023',value=value,unit='persons',source='TEST_ONLY',url='https://www.insee.fr/',release='fixture',dims={})
        args.update(kw);return observation(**args)

class CoreTests(Base):
    def test_zero_not_missing(self):self.assertEqual(number('0'),(0.0,'published'))
    def test_blank_is_null(self):self.assertIsNone(number('')[0])
    def test_suppression(self):self.assertEqual(number('*')[1],'suppressed')
    def test_nonfinite(self):self.assertIsNone(number('Infinity')[0])
    def test_census_negative_sentinel(self):self.assertIsNone(number('-666666666',nonnegative=True)[0])
    def test_decimal_comma(self):self.assertEqual(number('12,5',decimal_comma=True)[0],12.5)
    def test_nonnegative_optional(self):self.assertEqual(number('-2.4')[0],-2.4)
    def test_leading_zero(self):self.assertEqual(clean_code('1',3),'001')
    def test_codes_no_name_guessing(self):self.assertRaises(ValueError,clean_code,'New York')
    def test_stable_id_ignores_value(self):self.assertEqual(self.obs(1)['record_id'],self.obs(2)['record_id'])
    def test_period_is_identity(self):self.assertNotEqual(self.obs()['record_id'],self.obs(period='2024')['record_id'])
    def test_boundary_is_identity(self):self.assertNotEqual(self.obs()['record_id'],self.obs(boundary='2025')['record_id'])
    def test_null_status_required(self):self.assertRaises(ValueError,self.obs,None)
    def test_all_staged(self):
        r=self.obs();self.assertEqual(r['publication_approved'],'False');self.assertEqual(r['score_eligible'],'False')
    def test_gzip_roundtrip(self):
        p=self.root/'rows.csv.gz';writecsv(p,[self.obs()]);self.assertEqual(list(readcsv(p))[0]['value'],'10')
    def test_duplicate_fails_atomic(self):
        p=self.root/'rows.csv';self.assertRaises(ValueError,writecsv,p,[self.obs(),self.obs()],check_ids=True);self.assertFalse(p.exists())
    def test_empty_release_fails(self):self.assertRaises(ValueError,writecsv,self.root/'empty.csv',[])
    def test_no_overwrite(self):
        p=self.root/'rows.csv';writecsv(p,[self.obs()]);self.assertRaises(FileExistsError,writecsv,p,[self.obs()])
    def test_nonofficial_url_refused(self):self.assertRaises(ValueError,Client(self.root).request,'https://example.com/data')
    def test_http_refused(self):self.assertRaises(ValueError,Client(self.root).request,'http://www.insee.fr/data')

class FranceTests(Base):
    def row(self,**kw):
        r=dict(GEO_REF='2026',GEO_OBJECT='COM',GEO='01001',GEO_LABEL='Fixture',TIME_PERIOD='2023',DS='TEST',ID_TAB='POP',TAB_MEASURE='P',OBS_VALUE='12',UNIT_MULT='3',UNIT_MEASURE='persons',CONF_STATUS='F',OBS_STATUS='A');r.update(kw);return r
    def test_scaling(self):self.assertEqual(fr_row(self.row(),'h')['value'],'12000')
    def test_boundary_preserved(self):self.assertEqual(fr_row(self.row(),'h')['boundary_vintage'],'2026')
    def test_not_regional(self):self.assertIsNone(fr_row(self.row(GEO_OBJECT='DEP'),'h'))
    def test_confidentiality(self):self.assertEqual(fr_row(self.row(CONF_STATUS='C'),'h')['value'],'')
    def test_multiplier_unknown(self):self.assertEqual(fr_row(self.row(UNIT_MULT=''),'h')['value'],'')
    def test_corsica_code(self):self.assertEqual(fr_row(self.row(GEO='2A004'),'h')['geo_id'],'INSEE_COM:2A004')
    def test_no_old_wide_guess(self):
        p=self.file('bad.csv',['CODGEO','P21_POP'],[['01001','100']]);self.assertRaises(ValueError,list,france(p))
    def test_zip_stream(self):
        r=self.row();p=self.file('valid.csv',list(r),[list(r.values())],';');z=self.root/'valid.zip'
        with zipfile.ZipFile(z,'w') as f:f.write(p,'data.csv')
        self.assertEqual(len(list(france(z))),1)

class USCanadaTests(Base):
    def test_US_moe_paired_and_not_factor(self):
        p=self.file('B01003.dat',['GEO_ID','B01003_E001','B01003_M001'],[['1600000US0100100','100','8'],['0400000US01','200','7']],'|')
        geos={'1600000US0100100':{'NAME':'Fixture'}};rows=list(acs_rows(p,'B01003',geos));self.assertEqual(len(rows),1);self.assertEqual(json.loads(rows[0]['dimensions'])['moe90'],8)
    def test_US_missing_moe_column_fails(self):
        p=self.file('B01003.dat',['GEO_ID','B01003_E001'],[['1600000US0100100','100']],'|');self.assertRaises(ValueError,list,acs_rows(p,'B01003',{}))
    def test_US_sentinel_missing(self):
        p=self.file('B01003.dat',['GEO_ID','B01003_E001','B01003_M001'],[['1600000US0100100','-666666666','-222222222']],'|');r=list(acs_rows(p,'B01003',{'1600000US0100100':{'NAME':'F'}}))[0];self.assertEqual(r['value'],'');self.assertIsNone(json.loads(r['dimensions'])['moe90'])
    def test_US_unknown_geo_fails(self):
        p=self.file('B01003.dat',['GEO_ID','B01003_E001','B01003_M001'],[['1600000US0100100','100','8']],'|');self.assertRaises(ValueError,list,acs_rows(p,'B01003',{}))
    def test_US_geography_filter(self):
        p=self.file('geo.txt',['GEO_ID','NAME'],[['1600000US0100100','F'],['0500000US01001','County']],'|');self.assertEqual(len(us_geographies(p)),1)
    def ca(self,total_symbol='',second_symbol='x',dg='2021A00053520005',label='Population, 2021'):
        h=['DGUID','GEO_NAME','CHARACTERISTIC_ID','CHARACTERISTIC_NAME','C1_COUNT_TOTAL','SYMBOL','C2_COUNT_MEN+','SYMBOL']
        return self.file('ca.csv',h,[[dg,'Fixture','1',label,'100',total_symbol,'40',second_symbol]])
    def test_CA_duplicate_SYMBOL_not_overwritten(self):self.assertEqual(list(canada(self.ca()))[0]['value'],'100')
    def test_CA_C1_suppression(self):self.assertEqual(list(canada(self.ca('x','')))[0]['value'],'')
    def test_CA_not_province(self):self.assertEqual(list(canada(self.ca(dg='2021A000235'))),[])
    def test_CA_income_2020(self):self.assertEqual(list(canada(self.ca(label='Median total income of households in 2020 ($)')))[0]['period'],'2020')
    def test_CA_population_decline_is_valid(self):
        p=self.ca(label='Population percentage change, 2016 to 2021')
        p.write_text(p.read_text().replace(',100,',',-2.4,'))
        self.assertEqual(list(canada(p))[0]['value'],'-2.4')
    def test_CA_protected_demographics_excluded(self):self.assertEqual(list(canada(self.ca(label='Ethnic or cultural origin'))),[])

class MexicoAustraliaBrazilTests(Base):
    def test_MX_municipal_totals_only(self):
        h=['ENTIDAD','NOM_ENT','MUN','NOM_MUN','LOC']+list(MX_FIELDS)
        base=['01','Fixture state','001','Fixture municipality']
        rows=[base+['0000']+['10']*len(MX_FIELDS),base+['0001']+['9']*len(MX_FIELDS),base+['9998']+['1']*len(MX_FIELDS)]
        p=self.file('mx.csv',h,rows);obs=list(mexico(p));self.assertEqual(len(obs),len(MX_FIELDS));self.assertTrue(all(x['geo_id']=='MX:INEGI_MUN:01001' for x in obs))
    def test_MX_zero_not_suppressed(self):
        h=['ENTIDAD','NOM_ENT','MUN','NOM_MUN','LOC']+list(MX_FIELDS);vals=['01','S','001','M','0000']+['0']*len(MX_FIELDS);p=self.file('mx.csv',h,[vals]);self.assertEqual(list(mexico(p))[0]['value'],'0')
    def test_MX_star_not_zero(self):
        h=['ENTIDAD','NOM_ENT','MUN','NOM_MUN','LOC']+list(MX_FIELDS);p=self.file('mx.csv',h,[['01','S','001','M','0000']+['*']*len(MX_FIELDS)]);self.assertTrue(all(x['value']=='' for x in mexico(p)))
    def test_AU_LGA_identity(self):
        p=self.file('au.csv',['REGION','MEASURE','TIME_PERIOD','OBS_VALUE','UNIT_MEASURE','UNIT_MULT'],[['10050','TEST','2025','2','persons','3']]);r=list(australia(p))[0];self.assertEqual(r['value'],'2000');self.assertEqual(r['geo_id'],'AU:LGA2021:10050')
    def test_AU_unknown_header_fails(self):
        p=self.file('au.csv',['weird','MEASURE','TIME_PERIOD','OBS_VALUE'],[['10050','TEST','2025','2']]);self.assertRaises(ValueError,list,australia(p))
    def test_AU_unresolved_units_flagged(self):
        p=self.file('au.csv',['REGION','MEASURE','TIME_PERIOD','OBS_VALUE'],[['10050','TEST','2025','2']]);self.assertTrue(list(australia(p))[0]['unit'].startswith('unresolved'))
    def ibge(self,level='N6',value='100'):
        return [{'id':'93','variavel':'Population fixture','unidade':'Pessoas','resultados':[{'classificacoes':[],'series':[{'localidade':{'id':'3550308','nome':'Fixture','nivel':{'id':level}},'serie':{'2022':value}}]}]}]
    def test_BR_native_code(self):self.assertEqual(list(ibge_results(self.ibge(),'4714','h','https://sidra.ibge.gov.br/'))[0]['geo_id'],'BR:IBGE_MUN:3550308')
    def test_BR_state_not_local(self):self.assertRaises(ValueError,list,ibge_results(self.ibge('N3'),'4714','h','https://sidra.ibge.gov.br/'))
    def test_BR_source_dash_is_absolute_zero(self):self.assertEqual(list(ibge_results(self.ibge(value='-'),'4714','h','https://sidra.ibge.gov.br/'))[0]['value'],'0')
    def test_BR_suppression(self):self.assertEqual(list(ibge_results(self.ibge(value='...'),'4714','h','https://sidra.ibge.gov.br/'))[0]['value'],'')

class SwissTests(Base):
    def setUp(self):
        super().setUp();self.s=json.loads((HERE/'03_scenarios.json').read_text())['scenarios'];self.roster={'1':{'Name':'Fixture'}}
    def result(self,val=100):
        return {'Location':{'BfsID':1,'BfsName':'Fixture','TaxLocationID':123},**{k:val for k in INC},**{k:val for k in WEALTH},'IncomeTaxFed':99999,'TotalTax':100299}
    def test_six_scenarios(self):self.assertEqual(len(self.s),6)
    def test_federal_not_in_burden(self):self.assertAlmostEqual(tax_value(self.result(),self.s[0])[0],0.3)
    def test_wealth_permille(self):self.assertAlmostEqual(tax_value(self.result(),self.s[4])[0],0.3)
    def test_income_percent(self):self.assertEqual(self.s[0]['denominator_chf'],100000)
    def test_missing_component_not_zero(self):
        r=self.result();del r['IncomeTaxChurch'];self.assertIsNone(tax_value(r,self.s[0])[0])
    def test_conflicting_parishes_held(self):
        r=self.result();q=self.result(200);q['Location']['TaxLocationID']=124
        self.assertEqual(list(candidate_rows([r,q],self.s[0],2026,'v',self.roster,'h'))[0]['value'],'')
    def test_agreeing_locations_one_candidate(self):
        r=self.result();q=self.result();q['Location']['TaxLocationID']=124
        self.assertEqual(len(list(candidate_rows([r,q],self.s[0],2026,'v',self.roster,'h'))),1)
    def test_no_missing_commune_silently_dropped(self):
        rows=list(candidate_rows([],self.s[0],2026,'v',self.roster,'h'));self.assertEqual(len(rows),1);self.assertEqual(rows[0]['observation_status'],'missing_calculator_location')
    def test_partial_cannot_retire(self):
        rows=list(candidate_rows([self.result()],self.s[0],2026,'v',self.roster,'h'));g=coverage_gate(rows,self.roster,self.s);self.assertFalse(g['technical_coverage_complete']);self.assertFalse(g['retire_2018_authorised'])
    def test_complete_not_automatically_approved(self):
        rows=[r for s in self.s for r in candidate_rows([self.result()],s,2026,'v',self.roster,'h')];g=coverage_gate(rows,self.roster,self.s);self.assertTrue(g['technical_coverage_complete']);self.assertFalse(g['scenario_assumptions_approved']);self.assertFalse(g['retire_2018_authorised'])
    def test_duplicate_tax_candidate_fails(self):
        rows=[r for s in self.s for r in candidate_rows([self.result()],s,2026,'v',self.roster,'h')];rows.append(rows[0]);self.assertFalse(coverage_gate(rows,self.roster,self.s)['technical_coverage_complete'])
    def test_no_mixed_versions(self):
        rows=[r for i,s in enumerate(self.s) for r in candidate_rows([self.result()],s,2026,'v'+str(i),self.roster,'h')];self.assertFalse(coverage_gate(rows,self.roster,self.s)['technical_coverage_complete'])
    def test_no_double_wealth_in_detail(self):
        p=scenario_payload(self.s[4],2026);q=detail_payload(p,123,[{'Ident':'NETTO_VM','Value':1000000}]);self.assertEqual(q['Fortune'],0);self.assertEqual(q['Budget'][0]['Value'],1000000)
    def test_wealth_budget_missing_fails(self):self.assertRaises(ValueError,detail_payload,scenario_payload(self.s[4],2026),123,[])
    def test_single_second_person_fails(self):
        s=json.loads(json.dumps(self.s[0]));s['request']['Age2']=40;self.assertRaises(ValueError,scenario_payload,s,2026)

class IntegrationTests(Base):
    def test_sqlite_idempotent(self):
        p=self.root/'rows.csv';writecsv(p,[self.obs()]);db=self.root/'db.sqlite';self.assertEqual(stage(db,[p])['added'],1);self.assertEqual(stage(db,[p])['identical_observations'],1)
    def test_revision_conflict_not_overwrite(self):
        p=self.root/'one.csv';q=self.root/'two.csv';writecsv(p,[self.obs(1)]);writecsv(q,[self.obs(2)]);db=self.root/'db.sqlite';stage(db,[p]);self.assertRaises(ValueError,stage,db,[q]);self.assertEqual(report(db)[0]['observations'],1)
    def test_master_native_fields(self):
        r=master(self.obs());self.assertEqual(r['source_geo_id'],'INSEE_COM:01001');self.assertEqual(r['country_codes'],'["FR"]');self.assertEqual(r['score_eligible'],'False')
    def test_export_limit(self):
        p=self.root/'one.csv';writecsv(p,[self.obs()]);db=self.root/'db.sqlite';stage(db,[p]);self.assertRaises(ValueError,export_master,db,self.root/'out.csv','FR',['test:population'],0)
    def test_no_unreviewed_evidence(self):self.assertFalse(eligible_evidence(self.obs(),{},{}))
    def test_containment_not_local(self):
        r=self.obs();a={k:r[k] for k in ('source_id','indicator_id','period','unit','boundary_vintage')};a.update(publication_approved=True,score_eligible=True,current_for_purpose=True,reviewer='Fixture',evidence='Fixture')
        m={'approved':True,'relationship':'contains','boundary_vintage':'2026','source_geo_id':r['geo_id'],'evidence':'point_in_polygon'};self.assertFalse(eligible_evidence(r,a,m));m['relationship']='exact_boundary';self.assertTrue(eligible_evidence(r,a,m))
    def test_missing_critical_domain_blocks(self):self.assertFalse(qualifies(['population','housing'],['health'],{'population':0.5,'housing':0.5})['eligible'])
    def test_duplicate_indicators_do_not_inflate_domains(self):self.assertEqual(qualifies(['income']*100,[],{'income':1,'housing':1})['weighted_direct_current_local_coverage'],0.5)
    def test_same_country_neutral_threshold(self):
        outputs=[qualifies(['income'],['income'],{'income':1,'housing':1}) for cc in ['CH','FR','US','CA','AU','BR','MX']];self.assertTrue(all(x==outputs[0] for x in outputs));self.assertFalse(outputs[0]['eligible'])
    def test_valid_weighted_domain_coverage(self):self.assertTrue(qualifies(['income','housing'],['income'],{'income':4,'housing':3,'health':3})['eligible'])

if __name__=='__main__':unittest.main(verbosity=2)
