#!/usr/bin/env python3
"""Check final-artifact reachability, not one historical sitemap filename."""
import argparse,json,sys
from pathlib import Path
from urllib.parse import urlsplit,unquote
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
class RobotsParser(HTMLParser):
 def __init__(self):super().__init__();self.noindex=False
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag.lower()=="meta" and a.get("name","").lower() in {"robots","googlebot"} and "noindex" in a.get("content","").lower().replace(","," ").split():self.noindex=True

def check(root,origin='https://nestlyzer.com'):
 root=Path(root).resolve();base=urlsplit(origin);errors=[];visited=set();active=set();urls=set();duplicates=[]
 def local(url):
  u=urlsplit(url)
  if (u.scheme,u.netloc)!=(base.scheme,base.netloc) or u.query or u.fragment:raise ValueError('Noncanonical URL '+url)
  bits=unquote(u.path).split('/')
  if '..' in bits or '\\' in u.path:raise ValueError('Unsafe URL '+url)
  p=root.joinpath(*[b for b in bits if b])
  if not p.resolve().is_relative_to(root):raise ValueError('Escaped root')
  return p
 def walk(p):
  p=p.resolve()
  if p in active:errors.append('Sitemap cycle '+str(p));return
  if p in visited:return
  active.add(p);visited.add(p)
  try:
   tree=ET.parse(p).getroot();kind=tree.tag.rsplit('}',1)[-1]
   if kind not in {'sitemapindex','urlset'}:raise ValueError('Unknown XML root')
   for child in tree:
    loc=next((x.text.strip() for x in child if x.tag.rsplit('}',1)[-1]=='loc' and x.text),'')
    if not loc:raise ValueError('Missing loc')
    dest=local(loc)
    if kind=='sitemapindex':walk(dest)
    else:
     if loc in urls:duplicates.append(loc)
     urls.add(loc)
     if loc.endswith('/'):dest=dest/'index.html'
     if not dest.is_file():errors.append('Missing published page '+loc)
  except Exception as e:errors.append(str(e))
  finally:active.discard(p)
 walk(root/'sitemap.xml')
 # Exact set of all built, indexable Insights pages, including the hub.
 expected=set()
 for p in (root/'insights').rglob('index.html') if (root/'insights').exists() else []:
  h=p.read_text('utf-8')
  rp=RobotsParser();rp.feed(h)
  if rp.noindex:continue
  expected.add(origin+'/'+p.relative_to(root).parent.as_posix().strip('/')+'/')
 missing=sorted(expected-urls)
 if not expected:errors.append('No built indexable Insights pages: run the full build')
 if missing:errors.append(f'{len(missing)} Insights pages missing from reachable sitemaps')
 if duplicates:errors.append(f'{len(duplicates)} duplicate sitemap URLs')
 return {'passed':not errors,'sitemap_files':len(visited),'urls':len(urls),'insights_expected':len(expected),'insights_missing':missing,'duplicates':duplicates[:20],'errors':errors}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--site',required=True);p.add_argument('--origin',default='https://nestlyzer.com');a=p.parse_args();r=check(a.site,a.origin);print(json.dumps(r,indent=2));sys.exit(not r['passed'])
