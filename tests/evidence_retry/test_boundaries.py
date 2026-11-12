import sys,unittest,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'build/evidence_pipeline'))
import acquire as a
class BoundaryIntegrity(unittest.TestCase):
 def setUp(self):
  self.job={'codes':['01'],'code_field':'code','code_system':'fixture','bbox':[0,0,4,4]}
  self.geo={'type':'FeatureCollection','features':[{'type':'Feature','properties':{'code':'01'},'geometry':{'type':'Polygon','coordinates':[[[1,1],[2,1],[2,2],[1,1]]]}}]}
 def test_valid(self):self.assertEqual(len(a.validate_geometry(self.geo,self.job)['features']),1)
 def test_unclosed_rejected(self):
  self.geo['features'][0]['geometry']['coordinates'][0].pop();self.assertRaises(ValueError,a.validate_geometry,self.geo,self.job)
 def test_nan_rejected(self):
  self.geo['features'][0]['geometry']['coordinates'][0][1][0]=float('nan');self.assertRaises(ValueError,a.validate_geometry,self.geo,self.job)
 def test_empty_ring_rejected(self):
  self.geo['features'][0]['geometry']['coordinates']=[[]];self.assertRaises(ValueError,a.validate_geometry,self.geo,self.job)
 def test_nonpublisher_github_rejected(self):self.assertRaises(ValueError,a.approved_url,'https://github.com/unrelated/data')
 def test_credentials_rejected(self):self.assertRaises(ValueError,a.approved_url,'https://user:password@api.census.gov/data')
 def test_redirect_blocked_before_request(self):
  req=a.urllib.request.Request('https://api.census.gov/data');self.assertRaises(ValueError,a.OfficialRedirect().redirect_request,req,None,302,'',{},'https://evil.invalid/x')
 def test_discontinuous_topology_rejected(self):
  t={'type':'Topology','arcs':[[[1,1],[2,1]],[[3,1],[1,1]]],'objects':{'x':{'type':'Polygon','arcs':[[0,1]],'properties':{'code':'01'}}}}
  self.assertRaises(ValueError,a.topo_features,t)
 def test_unclosed_topology_rejected(self):
  t={'type':'Topology','arcs':[[[1,1],[2,1],[2,2]]],'objects':{'x':{'type':'Polygon','arcs':[[0]],'properties':{'code':'01'}}}}
  self.assertRaises(ValueError,a.topo_features,t)
class DetailEvidence(unittest.TestCase):
 def test_missing_support_is_not_local(self):
  s=(Path(__file__).resolve().parents[2]/'build/rich_place.mjs').read_text();self.assertNotIn('r.factorLevel?.[k]??0',s);self.assertIn('r.factorLevel?.[k]??null',s)
 def test_country_source_cannot_fall_back_to_another_country(self):
  s=(Path(__file__).resolve().parents[2]/'src/place/place.js').read_text();self.assertIn("hasCountry?(c.source_url||c.url||''):f.s",s)
