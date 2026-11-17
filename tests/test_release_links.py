"""Static link crawl must survive valid HTML quote removal, without JS false links."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('validator',Path(__file__).resolve().parents[1]/'build'/'validate_seo.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class LinkParsing(unittest.TestCase):
    def test_all_quote_forms(self):
        for markup in ['<a href=/a/>a</a>','<a href="/a/">a</a>',"<a href='/a/'>a</a>",'<A HREF = /a/ class=x>a</A>']:
            with self.subTest(markup=markup):self.assertEqual(m.static_links(markup),['/a/'])
    def test_fake_links_not_navigation(self):
        self.assertEqual(m.static_links('<script>const x="<a href=/fake/>";</script><!-- <a href=/wrong/> --><a data-href=/fake/>no</a><a href=/real/>yes</a>'),['/real/'])
    def test_inert_template_not_navigation(self):
        self.assertEqual(m.static_links('<template><a href=/inactive/>x</a></template><a href=/active/>x</a>'),['/active/'])
    def test_entities_and_area(self):
        self.assertEqual(m.static_links('<area href="/map/?a=1&amp;b=2"><a href="/x/">x</a>'),['/map/?a=1&b=2','/x/'])
    def test_other_href_not_navigation(self):
        self.assertEqual(m.static_links('<link href=/style.css rel=stylesheet><div href=/fake></div>'),[])
    def fixture(self,root,body):
        origin='https://nestlyzer.com'
        for slug,content in [('/',body),('/other/','<a href=/>Home</a>')]:
            target=root/slug.lstrip('/')/'index.html';target.parent.mkdir(parents=True,exist_ok=True)
            target.write_text(f'<html><head><title>{slug}</title><meta name=description content=description><link rel=canonical href={origin}{slug}></head><body><h1>{slug}</h1>{content}</body></html>')
        (root/'sitemap.xml').write_text(f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{origin}/</loc></url><url><loc>{origin}/other/</loc></url></urlset>')
        (root/'robots.txt').write_text(f'Sitemap: {origin}/sitemap.xml\n')
        return m.validate(root,origin,max_bytes=100000)
    def test_unquoted_real_site_passes(self):
        with tempfile.TemporaryDirectory() as d:self.assertTrue(self.fixture(Path(d),'<a href=/other/>Other</a>')['passed'])
    def test_fake_script_link_cannot_pass(self):
        with tempfile.TemporaryDirectory() as d:self.assertFalse(self.fixture(Path(d),'<script>"<a href=/other/>"</script>')['passed'])
    def test_unquoted_missing_target_fails(self):
        with tempfile.TemporaryDirectory() as d:
            result=self.fixture(Path(d),'<a href=/other/>Other</a><a href=/missing/>Missing</a>')
            self.assertFalse(result['passed']);self.assertIn('/missing/',result['missing_targets'])
if __name__=='__main__':unittest.main()
