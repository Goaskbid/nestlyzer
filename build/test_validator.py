import importlib.util,json,tempfile,unittest
from pathlib import Path
SPEC=importlib.util.spec_from_file_location('v',Path(__file__).with_name('validate_seo.py'));V=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(V)
ORIGIN='https://nestlyzer.com'
class ValidatorTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
  (self.root/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+ORIGIN+'/sitemap.xml\n')
  self.write('/', '<a href="/page/">Page</a>');self.write('/page/','<a href="/">Home</a>')
  self.sitemap(['/','/page/'])
 def tearDown(self):self.temp.cleanup()
 def sitemap(self,paths):
  (self.root/'sitemap.xml').write_text('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+ORIGIN+p+'</loc></url>'for p in paths)+'</urlset>')
 def write(self,p,body='',head=''):
  f=self.root/p.lstrip('/')/'index.html';f.parent.mkdir(parents=True,exist_ok=True);f.write_text('<html><head><title>'+p+'</title><meta content="description" name="description"><link href="'+ORIGIN+p+'" rel="canonical">'+head+'</head><body><h1>Heading</h1>'+body+'</body></html>')
 def run_validation(self,**kw):return V.validate(self.root,ORIGIN,**kw)
 def test_valid(self):
  r=self.run_validation();self.assertTrue(r['passed']);self.assertEqual(r['reachable_sitemap_urls'],2)
 def test_noindex_rejected(self):
  self.write('/page/',head='<meta content="noindex" name="robots">');self.assertFalse(self.run_validation()['passed'])
 def test_canonical_mismatch(self):
  f=self.root/'page/index.html';f.write_text(f.read_text().replace(ORIGIN+'/page/',ORIGIN+'/different/'));self.assertFalse(self.run_validation()['passed'])
 def test_orphan_rejected(self):
  self.write('/');self.assertFalse(self.run_validation()['passed'])
 def test_broken_link_rejected(self):
  self.write('/', '<a href="/page/">Page</a><a href="/absent/">Absent</a>');self.assertFalse(self.run_validation()['passed'])
 def test_diagnostic_allowance_is_explicit(self):
  self.write('/', '<a href="/page/">Page</a><a href="/absent/">Absent</a>');r=self.run_validation(allow_missing_native=True);self.assertTrue(r['passed']);self.assertTrue(r['diagnostic_only']);self.assertTrue(r['warnings'])
 def test_budget_rejected(self):self.assertFalse(self.run_validation(max_bytes=50)['passed'])
 def test_duplicate_sitemap_url_rejected(self):
  self.sitemap(['/','/page/','/page/']);self.assertFalse(self.run_validation()['passed'])
 def test_foreign_and_traversal_rejected(self):
  for s in ['https://other.test/x','https://nestlyzer.com/%2e%2e/x','https://nestlyzer.com/page/?x=y','https://nestlyzer.com/page/#state']:
   with self.assertRaises(ValueError):V.safe_path(s,ORIGIN)
 def test_root_block_rejected(self):
  (self.root/'robots.txt').write_text('User-agent: *\nDisallow: /\nSitemap: '+ORIGIN+'/sitemap.xml\n');self.assertFalse(self.run_validation()['passed'])
 def test_metadata_order_is_supported(self):
  self.assertTrue(self.run_validation()['passed'])
 def test_pagination_canonical_not_first(self):
  self.write('/page/2/','<a href="/page/">Previous</a>');self.write('/page/','<a href="/page/2/">Next</a>');self.sitemap(['/','/page/','/page/2/']);self.assertTrue(self.run_validation()['passed'])
if __name__=='__main__':unittest.main(verbosity=2)
