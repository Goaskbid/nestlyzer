"""Deterministic contract fixtures. These are not independent model validation."""
import copy,csv,gzip,hashlib,importlib.util,json,math,os,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'build/evidence_pipeline'))
sys.path.insert(0,str(ROOT/'build'))
import migration_v2 as m
import ingest_measured_climate as climate
import validate_profile_candidate as gate
import acquire

def metadata(table):
    v={};n=6 if table=='B07001' else 5
    for i in range(n):
        for a,age in enumerate(m.AGES):
            k=f'{table}_{i*3+a+1:03}E';v[k]={'label':'Estimate!!Total:!!group'+str(i)+'!!'+age};v[k[:-1]+'M']={'label':'Margin of Error!!'+age}
    return {'variables':v}

class MigrationTests(unittest.TestCase):
    def setUp(self):self.tmp=tempfile.TemporaryDirectory();self.p=Path(self.tmp.name)
    def tearDown(self):self.tmp.cleanup()
    def test_incoming_schema(self):self.assertEqual(len(m.select_variables(metadata('B07001'),'B07001')),18)
    def test_outgoing_schema(self):self.assertEqual(len(m.select_variables(metadata('B07401'),'B07401')),15)
    def test_wrong_table(self):self.assertRaises(ValueError,m.select_variables,metadata('B07001'),'B99999')
    def test_missing_moe_metadata(self):
        d=metadata('B07001');del d['variables']['B07001_001M'];self.assertRaises(ValueError,m.select_variables,d,'B07001')
    def test_wrong_age(self):
        d=metadata('B07001');d['variables']['B07001_001E']['label']='Estimate!!Under 5 years';self.assertRaises(ValueError,m.select_variables,d,'B07001')
    def test_zero_not_missing(self):self.assertEqual(m.published_number('0'),0)
    def test_suppressed(self):self.assertIsNone(m.published_number('-666666666'))
    def test_nan(self):self.assertIsNone(m.published_number('NaN'))
    def test_infinite(self):self.assertIsNone(m.published_number('inf'))
    def test_empty(self):self.assertIsNone(m.published_number(''))
    def test_header_transform(self):self.assertEqual(m.api_name('B07001_E014'),'B07001_014E')
    def test_moe_header_transform(self):self.assertEqual(m.api_name('B07001_M014'),'B07001_014M')
    def test_key_scrub(self):
        u=m.public_url('https://api.census.gov/data?get=NAME&key=SECRET&token=SECRET&API_KEY=SECRET');self.assertNotIn('SECRET',u);self.assertIn('get=NAME',u)
    def test_http_refused(self):self.assertRaises(ValueError,m.approved,'http://api.census.gov/data')
    def test_credentials_refused(self):self.assertRaises(ValueError,m.approved,'https://user:pass@api.census.gov/data')
    def test_foreign_host_refused(self):self.assertRaises(ValueError,m.approved,'https://api.census.gov.evil.invalid/data')
    def test_redirect_blocked_before_request(self):
        req=m.urllib.request.Request('https://api.census.gov/data?key=SECRET')
        self.assertRaises(ValueError,m.SafeRedirect().redirect_request,req,None,302,'',{},'https://www2.census.gov/file')
    def bulk(self,moe=True,extra=True):
        var={'B07001_001E':{'age_band':'65 to 69 years','label':'Estimate!!fixture','moe':'B07001_001M'}}
        text='GEO_ID|NAME|B07001_E001'+('|B07001_M001' if moe else '')+'\n'
        text+='0500000US12119|Example|10'+('|2' if moe else '')+'\n'
        if extra:text+='0600000US1211900000|Subdivision|11'+('|3' if moe else '')+'\n'
        p=self.p/'source.dat';p.write_text(text);return p,var
    def test_county_not_subdivision(self):
        p,v=self.bulk();r=list(m.bulk_rows(p,v));self.assertEqual([x[0] for x in r],['12119'])
    def test_bulk_moe_required(self):
        p,v=self.bulk(moe=False);self.assertRaises(ValueError,list,m.bulk_rows(p,v))
    def test_bulk_ragged(self):
        p,v=self.bulk();p.write_text(p.read_text()+'0500000US12001|Wrong\n');self.assertRaises(ValueError,list,m.bulk_rows(p,v))
    def test_county_zero_padding(self):
        p,v=self.bulk();p.write_text(p.read_text().replace('12119','01001'));r=list(m.observations(m.bulk_rows(p,v),v,2024,'B07001','https://www2.census.gov/x','abc'));self.assertEqual(r[0]['geographic_code'],'01001')
    def test_duplicate_county_refused(self):
        p,v=self.bulk(extra=False);p.write_text(p.read_text()+p.read_text().splitlines()[1]+'\n');self.assertRaises(ValueError,list,m.observations(m.bulk_rows(p,v),v,2024,'B07001','https://www2.census.gov/x','abc'))
    def test_age_not_retirement(self):
        p,v=self.bulk();r=list(m.observations(m.bulk_rows(p,v),v,2024,'B07001','https://www2.census.gov/x','abc'));d=json.loads(r[0]['dimensions']);self.assertFalse(d['retirement_status_observed']);self.assertFalse(d['municipality_allocation_allowed'])
    def test_no_net_claim(self):
        p,v=self.bulk();r=list(m.observations(m.bulk_rows(p,v),v,2024,'B07001','https://www2.census.gov/x','abc'));self.assertEqual(r[0]['indicator_id'],'B07001_001E');self.assertEqual(r[0]['period'],'2020-2024')
    def test_api_auth_required(self):
        with patch.dict(os.environ,{'CENSUS_API_KEY':''}):self.assertRaises(ValueError,m.acquire,self.p,2024,1,'api')
    def test_wrong_existing_receipt(self):
        p=self.p/'old';p.write_bytes(b'abc');m.write_json(p.with_name(p.name+'.receipt.json'),{'sha256':'wrong','source_url':'https://www2.census.gov/x'});self.assertRaises(ValueError,m.download,'https://www2.census.gov/x',p)
    def test_no_key_in_failure(self):
        with patch.object(m.urllib.request,'build_opener',side_effect=RuntimeError('SECRET')):
            try:m.download('https://api.census.gov/data?key=SECRET',self.p/'x')
            except RuntimeError as e:self.assertNotIn('SECRET',str(e))
            else:self.fail('must fail')

class ClimateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog=json.loads((ROOT/'build/source/measured-climate/NOAA_station_normals_transcription.json').read_text());cls.st=cls.catalog['stations']
        with (ROOT/'build/source/measured-climate/NOAA_station_normals_1991_2020.csv').open() as f:cls.rows=list(csv.DictReader(f))
    def test_three_stations(self):self.assertEqual(len(self.st),3)
    def test_156_unique(self):self.assertEqual(len(self.rows),156);self.assertEqual(len({r['record_id'] for r in self.rows}),156)
    def test_annual_not_new_period(self):self.assertTrue(all(s['period']=='1991-2020' for s in self.st))
    def test_not_scoring(self):self.assertTrue(all(s['score_eligible'] is False for s in self.st))
    def test_rights(self):self.assertTrue(all(s['commercial_reuse_status']=='Green' and s['licence_url'] for s in self.st))
    def test_si_temperature(self):
        for s in self.st:
            for k in ['tmax','tmin','tavg']:
                for a,b in zip(s['original'][k],s['series'][k]):self.assertEqual(round((a-32)*5/9,2),b)
    def test_si_precipitation(self):
        for s in self.st:
            for a,b in zip(s['original']['prcp'],s['series']['prcp']):self.assertEqual(round(a*25.4,3),b)
    def test_monthly_order(self):
        for s in self.st:
            for lo,avg,hi in zip(s['original']['tmin'],s['original']['tavg'],s['original']['tmax']):self.assertLessEqual(lo,avg);self.assertLessEqual(avg,hi)
    def test_annual_rain_rounding(self):
        for s in self.st:self.assertLess(abs(sum(s['original']['prcp'][:12])-s['original']['prcp'][12]),.1)
    def test_distance_identity(self):self.assertEqual(climate.distance(0,0,0,0),0)
    def test_distance_known(self):self.assertAlmostEqual(climate.distance(0,0,0,1),111.195,places=2)
    def test_links_within_radius(self):
        d=json.loads((ROOT/'data/measured-climate/US.json').read_text());self.assertEqual(len(d['links']),94);self.assertTrue(all(x['distance_km']<=25 and x['score_eligible'] is False for x in d['links'].values()))
    def test_ingestion_idempotent(self):
        p=ROOT/'data/x/US.json';before=p.read_bytes();r=climate.run(ROOT);self.assertEqual(p.read_bytes(),before);self.assertEqual(r['unique_station_observations'],156);self.assertEqual(r['changed_country_files'],0)
    def test_preserved_model(self):
        p=json.loads((ROOT/'data/evidence/model-policy.json').read_text());self.assertEqual(p['config']['evidenceScoring']['mode'],'legacy')

class GateTests(unittest.TestCase):
    def panel(self):
        rows=[]
        for split,year in [('train',2000),('validation',2005),('test',2010)]:
            for i in range(36):
                rows.append(dict(source_geo_id=split+str(i),spatial_block=split+str(i//6),period_start=year,period_end=year+3,profile_id='pensioner',cohort='age65',split=split,baseline_score=36-i,candidate_score=i,observed_outcome=i,source_url='https://example.invalid/SYNTHETIC_FIXTURE_ONLY',source_sha256='a'*64,source_geo_level='county',commercial_reuse_status='Green',candidate_eligible=True,baseline_eligible=True))
        spec=dict(profile_id='pensioner',cohort='age65',scope='SYNTHETIC_TEST_ONLY',candidate_weights={'x':50,'y':50},baseline_weights={'x':40,'y':60},split_registered_before_candidate_selection=True,test_used_for_candidate_selection=False,source_contract_approved=True,outcome_is_observed_moves_or_operating_activity=True,score_export_engine_sha256='b'*64,tested_engine_sha256='b'*64,baseline_publication_mode='legacy',candidate_publication_mode='legacy')
        spec['candidate_weights_sha256']=gate.digest(spec['candidate_weights']);spec['panel_sha256']=gate.digest(rows)
        benches=[dict(name=k,passed=True,candidate_weights_sha256=spec['candidate_weights_sha256'],engine_sha256=spec['tested_engine_sha256'],receipt_sha256='c'*64) for k in gate.REQUIRED_BENCHMARKS]
        return spec,rows,benches
    def test_tie_ranks(self):self.assertEqual(gate.ranks([3,1,1]),[3,1.5,1.5])
    def test_constant_undefined(self):self.assertIsNone(gate.spearman([1,1,1],[1,2,3]))
    def test_synthetic_positive(self):
        s,r,b=self.panel();g=gate.gate(s,r,b,bootstrap=100);self.assertTrue(g['promote']);self.assertFalse(g['weights_written'])
    def test_no_panel(self):
        s,r,b=self.panel();self.assertFalse(gate.gate(s,[],b)['promote'])
    def test_no_preregistration(self):
        s,r,b=self.panel();s['split_registered_before_candidate_selection']=False;self.assertFalse(gate.gate(s,r,b)['promote'])
    def test_benchmark_failure(self):
        s,r,b=self.panel();b[0]['passed']=False;self.assertFalse(gate.gate(s,r,b)['promote'])
    def test_test_leakage(self):
        s,r,b=self.panel();s['test_used_for_candidate_selection']=True;self.assertFalse(gate.gate(s,r,b)['promote'])
    def test_source_unapproved(self):
        s,r,b=self.panel();s['source_contract_approved']=False;self.assertFalse(gate.gate(s,r,b)['promote'])
    def test_geo_leakage(self):
        s,r,b=self.panel();r[-1]['spatial_block']=r[0]['spatial_block'];s['panel_sha256']=gate.digest(r);self.assertFalse(gate.gate(s,r,b)['promote'])
    def test_temporal_overlap(self):
        s,r,b=self.panel();r[-1]['period_start']=2006;s['panel_sha256']=gate.digest(r);self.assertFalse(gate.gate(s,r,b)['promote'])
    def test_bad_hash(self):
        s,r,b=self.panel();s['candidate_weights_sha256']='wrong';self.assertFalse(gate.gate(s,r,b)['promote'])
    def test_changed_eligibility(self):
        s,r,b=self.panel();r[-1]['candidate_eligible']=False;s['panel_sha256']=gate.digest(r);self.assertFalse(gate.gate(s,r,b)['promote'])
    def test_coarse_outcomes_not_town(self):
        s,r,b=self.panel();r[-1].update(place_id='US:1',allocated_from_larger_area=True);s['panel_sha256']=gate.digest(r);self.assertFalse(gate.gate(s,r,b)['promote'])
    def test_not_improving(self):
        s,r,b=self.panel()
        for x in r:x['candidate_score']=x['baseline_score']
        s['panel_sha256']=gate.digest(r);self.assertFalse(gate.gate(s,r,b,bootstrap=100)['promote'])
    def test_weight_total(self):
        s,r,b=self.panel();s['candidate_weights']['x']=80;self.assertFalse(gate.gate(s,r,b)['promote'])
    def test_not_ordinary_popularity(self):
        s,r,b=self.panel();s['outcome_is_observed_moves_or_operating_activity']=False;self.assertFalse(gate.gate(s,r,b)['promote'])
    def test_engine_mismatch(self):
        s,r,b=self.panel();s['score_export_engine_sha256']='different';self.assertFalse(gate.gate(s,r,b)['promote'])
    def test_duplicate_outcome(self):
        s,r,b=self.panel();r[-1]=copy.deepcopy(r[-2]);s['panel_sha256']=gate.digest(r);self.assertFalse(gate.gate(s,r,b)['promote'])

class PageTests(unittest.TestCase):
    def test_all_population_levels_enabled(self):
        d=json.loads((ROOT/'build/seo.config.json').read_text());self.assertEqual(d['minNewPlacePopulation'],0)
    def test_site_budget_not_relaxed(self):
        d=json.loads((ROOT/'build/seo.config.json').read_text());self.assertLessEqual(d['maxPublicBytes'],850000000)
    def test_legacy_description_honest(self):self.assertIn('Legacy model score', (ROOT/'build/rich_place.mjs').read_text())
    def test_context_not_prediction(self):self.assertIn('Not an empirically validated prediction',(ROOT/'build/rich_place.mjs').read_text())
    def test_no_inline_business_fonts(self):self.assertNotIn("data:font/woff2;base64,${fs.readFileSync",(ROOT/'build/build_site.mjs').read_text())
    def test_climate_lazy_internal(self):self.assertIn('/data/measured-climate/stations.json',(ROOT/'src/place/place.js').read_text())

if __name__=='__main__':unittest.main(verbosity=2)
