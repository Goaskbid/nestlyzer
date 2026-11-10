import unittest,json,sys,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent));from acquire import census_variables,census_rows,validate_geometry,topo_features,number,fetch
class Tests(unittest.TestCase):
 def test_numeric_zero(self):self.assertEqual(number('0'),0)
 def test_missing(self):self.assertIsNone(number(None))
 def test_sentinel(self):self.assertIsNone(number('-666666666'))
 def test_nan(self):self.assertIsNone(number('NaN'))
 def test_non_numeric(self):self.assertIsNone(number('suppressed'))
 def vars(self):
  return {f'B07001_{i:03}E':{'label':'Estimate!!Total:!!'+m+'!!'+a} for i,(m,a) in enumerate([(m,a) for m in ['Moved from different county within same state','Moved from different state','Moved from abroad'] for a in ['65 to 69 years','70 to 74 years','75 years and over']],1)}
 def test_labels(self):self.assertEqual(len(census_variables({'variables':self.vars()},'B07001')),9)
 def test_wrong_cohort(self):self.assertRaises(ValueError,census_variables,{'variables':{}},'B07001')
 def data(self):
  v=census_variables({'variables':self.vars()},'B07001');h=['NAME','state','county']+list(v);return v,[h,['Example','12','119']+['10']*9]
 def test_fips(self):
  v,d=self.data();rows,c=census_rows(d,v,2024,'B07001','https://api.census.gov','abc');self.assertEqual(c,{'12119'});self.assertTrue(all(x['code_system']=='US Census county FIPS' for x in rows))
 def test_period(self):
  v,d=self.data();rows,_=census_rows(d,v,2024,'B07001','https://api.census.gov','abc');self.assertEqual(rows[0]['period'],'2020-2024')
 def test_duplicate(self):
  v,d=self.data();d.append(d[1]);self.assertRaises(ValueError,census_rows,d,v,2024,'B07001','u','h')
 def test_suppressed_not_zero(self):
  v,d=self.data();d[1][3]='-666666666';rows,_=census_rows(d,v,2024,'B07001','u','h');self.assertEqual(rows[0]['value'],'');self.assertEqual(rows[0]['observation_status'],'missing_or_suppressed')
 def test_no_net_label(self):
  v,d=self.data();rows,_=census_rows(d,v,2024,'B07001','u','h');self.assertTrue(all(x['indicator_id'].startswith('B07001') for x in rows))
 def job(self):return {'codes':['01'],'code_field':'code','pad':2,'bbox':[-1,-1,3,3],'code_system':'fixture official code'}
 def geometry(self):return {'type':'FeatureCollection','features':[{'type':'Feature','properties':{'code':'1'},'geometry':{'type':'Polygon','coordinates':[[[0,0],[2,0],[2,2],[0,2],[0,0]]]}}]}
 def test_polygon(self):self.assertEqual(validate_geometry(self.geometry(),self.job())['features'][0]['properties']['key'],'01')
 def test_points_not_boundaries(self):
  d=self.geometry();d['features'][0]['geometry']={'type':'Point','coordinates':[1,1]};self.assertRaises(ValueError,validate_geometry,d,self.job())
 def test_incomplete(self):
  j=self.job();j['codes'].append('02');self.assertRaises(ValueError,validate_geometry,self.geometry(),j)
 def test_duplicate_boundary(self):
  d=self.geometry();d['features'].append(d['features'][0]);self.assertRaises(ValueError,validate_geometry,d,self.job())
 def test_self_intersection(self):
  d=self.geometry();d['features'][0]['geometry']['coordinates']=[[[0,0],[2,2],[0,2],[2,0],[0,0]]];self.assertRaises(ValueError,validate_geometry,d,self.job())
 def test_projected(self):
  d=self.geometry();d['features'][0]['geometry']['coordinates']=[[[400000,0],[400002,0],[400002,2],[400000,2],[400000,0]]];self.assertRaises(ValueError,validate_geometry,d,self.job())
 def test_topology(self):
  d={'type':'Topology','transform':{'scale':[1,1],'translate':[0,0]},'arcs':[[[0,0],[2,0],[0,2],[-2,0],[0,-2]]],'objects':{'a':{'type':'GeometryCollection','geometries':[{'type':'Polygon','arcs':[[0]],'properties':{'code':'1'}}]}}};self.assertEqual(len(validate_geometry(d,self.job())['features']),1)
 def test_unapproved_endpoint(self):self.assertRaises(ValueError,fetch,'https://example.org/data',Path('/tmp/never-created-nz'))
 def test_plain_http_rejected(self):self.assertRaises(ValueError,fetch,'http://api.census.gov/data',Path('/tmp/never-created-nz'))
 def test_different_github_account_rejected(self):self.assertRaises(ValueError,fetch,'https://raw.githubusercontent.com/Other/account/file',Path('/tmp/never-created-nz'))
if __name__=='__main__':unittest.main()
