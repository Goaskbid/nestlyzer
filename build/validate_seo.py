#!/usr/bin/env python3
"""Validate the exact static deployment tree, not URLs guessed from source data.
No network access. Does not establish Google indexing or HTTP response behaviour.
"""
from __future__ import annotations
import argparse, collections, html, json, re, sys, time, os
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

NS={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
HREF=re.compile(r'\bhref\s*=\s*[\"\']([^\"\']+)[\"\']',re.I)
H1=re.compile(r'<h1(?:\s[^>]*)?>',re.I)
TITLE=re.compile(r'<title[^>]*>(.*?)</title>',re.I|re.S)
class Head(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.canon=[];self.robots=[];self.description=[];self.assets=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='link':
            rel=a.get('rel','').lower().split()
            if 'canonical' in rel:self.canon.append(a.get('href',''))
            if 'stylesheet' in rel:self.assets.append(a.get('href',''))
        if tag=='meta':
            n=a.get('name','').lower()
            if n in ('robots','googlebot'):self.robots.append(a.get('content','').lower())
            if n=='description':self.description.append(a.get('content',''))

def safe_path(url: str, origin: str) -> str:
    if not url.startswith(origin+'/'):raise ValueError('Foreign or relative sitemap URL: '+url)
    p=url[len(origin):]
    if not p.startswith('/') or p.startswith('//') or any(c in p for c in ['?','#','\\','\x00']) or '..' in p.split('/') or re.search(r'%(2e|2f|5c)',p,re.I):raise ValueError('Unsafe canonical URL: '+url)
    return p

def local_file(root: Path,p: str) -> Path:
    return root / p.lstrip('/') / ('index.html' if p.endswith('/') else '')

def validate(root: Path, origin: str, *, allow_missing_native: bool=False, max_bytes: int=900000000, registry: Path|None=None) -> dict:
    t=time.monotonic();root=root.resolve();errors=[];warnings=[];counts=collections.Counter();sitemaps=[];paths=[];dates=[]
    def error(msg):
        if len(errors)<100:errors.append(msg)
        counts['errors']+=1
    idx=root/'sitemap.xml'
    if not idx.exists():return {'passed':False,'errors':['Missing sitemap.xml']}
    try:
        tree=ET.parse(idx);tag=tree.getroot().tag
        if tag.endswith('sitemapindex'):
            children=[n.text or '' for n in tree.findall('s:sitemap/s:loc',NS)]
            if len(children)>50000:error('Sitemap index exceeds 50,000 children')
        elif tag.endswith('urlset'):children=[origin+'/sitemap.xml']
        else:raise ValueError('Unexpected sitemap root')
        for url in children:
            p=safe_path(url,origin);f=local_file(root,p)
            if not f.is_file():error('Missing sitemap child '+p);continue
            size=f.stat().st_size
            if size>50_000_000:error('Sitemap exceeds 50 MB '+p)
            x=ET.parse(f);loc=x.findall('s:url/s:loc',NS)
            if len(loc)>50000:error('Sitemap exceeds 50,000 URLs '+p)
            sitemaps.append({'file':p,'urls':len(loc),'bytes':size})
            for n in loc:paths.append(safe_path(n.text or '',origin))
            for d in x.findall('s:url/s:lastmod',NS):
                text=d.text or ''
                if not re.fullmatch(r'\d{4}-\d{2}-\d{2}(T.*)?',text):error('Invalid lastmod '+text)
                dates.append(text)
    except (ValueError,ET.ParseError,OSError) as e:error(str(e))
    if len(paths)!=len(set(paths)):error('Duplicate sitemap URL')
    paths=list(dict.fromkeys(paths));ids={p:i for i,p in enumerate(paths)};graph=[[] for _ in paths];titles={};missing=set();assets=set();all_internal=set();bytes_html=0
    for p in paths:
        f=local_file(root,p)
        if not f.is_file():error('Sitemap URL has no file: '+p);continue
        raw=f.read_bytes();h=raw.decode('utf-8');bytes_html+=len(raw)
        head=Head();head.feed(h.split('</head>',1)[0])
        if head.canon!=[origin+p]:error('Canonical mismatch '+p)
        if any('noindex' in r for r in head.robots):error('noindex URL in sitemap '+p)
        if len(head.description)!=1 or not head.description[0].strip():error('Missing/duplicate description '+p)
        mt=TITLE.search(h);title=html.unescape(mt.group(1)).strip() if mt else ''
        if not title:error('Missing title '+p)
        elif title in titles:error('Duplicate title '+p+' = '+titles[title])
        else:titles[title]=p
        if len(H1.findall(h))!=1:error('H1 count not one '+p)
        edges=set()
        for v in HREF.findall(h):
            v=html.unescape(v)
            if v.startswith(origin+'/'):v=v[len(origin):]
            if not v.startswith('/') or v.startswith('//'):continue
            u=urlsplit(v);q=u.path
            if not q or q=='/':q='/'
            if any(z in q for z in ('\\','\x00')) or '..' in q.split('/'):error('Unsafe internal link '+p);continue
            all_internal.add(q)
            if q in ids:edges.add(ids[q])
        graph[ids[p]]=list(edges)
        for a in head.assets:
            if a.startswith('/'):assets.add(urlsplit(a).path)
        counts['html_checked']+=1
        if counts['html_checked']%20000==0: print('Checked',counts['html_checked'],'pages; seconds',round(time.monotonic()-t,1),flush=True)
    print('HTML scan finished',round(time.monotonic()-t,1),flush=True)
    for p in (all_internal | assets)-set(ids):
        if not local_file(root,p).is_file():missing.add(p)
    if missing:
        msg=str(len(missing))+' distinct missing internal targets: '+', '.join(sorted(missing)[:20])
        if allow_missing_native:warnings.append(msg+'; diagnostic-only allowance, strict deployment validation is still required.')
        else:error(msg)
    print('Link target check finished',round(time.monotonic()-t,1),flush=True)
    starts=[ids['/']] if '/' in ids else [ids[p] for p in ['/places/','/rankings/'] if p in ids]
    seen=set(starts);queue=collections.deque(starts)
    while queue:
        for j in graph[queue.popleft()]:
            if j not in seen:seen.add(j);queue.append(j)
    unreachable=[p for p,i in ids.items() if i not in seen]
    if unreachable:error(str(len(unreachable))+' sitemap pages not reachable through static HTML links: '+str(unreachable[:8]))
    coverage=None
    if registry:
        r=json.loads(registry.read_text());locs=r['byId'];missing_records=[k for k,v in locs.items() if v['url'] not in ids]
        if missing_records:error('Active place records absent from indexable sitemap: '+str(missing_records[:8]))
        coverage={'active_records':len(locs),'with_indexable_page':len(locs)-len(missing_records),'legacy_preserved':sum(bool(v['legacy']) for v in locs.values())}
    robots=(root/'robots.txt').read_text() if (root/'robots.txt').exists() else ''
    if 'Sitemap: '+origin+'/sitemap.xml' not in robots:error('robots.txt missing sitemap declaration')
    if re.search(r'^\s*Disallow:\s*/\s*$',robots,re.M):error('Root blocked in robots.txt')
    print('Graph and coverage finished',round(time.monotonic()-t,1),flush=True)
    total_bytes=0;files=0
    for directory,_,names in os.walk(root):
        for name in names:
            total_bytes+=os.stat(os.path.join(directory,name)).st_size;files+=1
    if total_bytes>max_bytes:error(f'Deploy tree {total_bytes} bytes exceeds budget {max_bytes}; do not silently omit content.')
    return {'passed':counts['errors']==0,'scope':'Static files and link graph only; no Google crawl, live HTTP or production JavaScript test.','diagnostic_only':allow_missing_native,'sitemaps':sitemaps,'sitemap_urls':len(paths),'html_checked':counts['html_checked'],'reachable_sitemap_urls':len(seen),'internal_targets':len(all_internal),'missing_targets':sorted(missing),'unique_titles':len(titles),'active_coverage':coverage,'lastmod_entries':len(dates),'html_bytes':bytes_html,'deploy_files':files,'deploy_bytes':total_bytes,'max_deploy_bytes':max_bytes,'errors_total':counts['errors'],'errors':errors,'warnings':warnings,'seconds':round(time.monotonic()-t,2)}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--site',required=True,type=Path);p.add_argument('--origin',default='https://nestlyzer.com');p.add_argument('--registry',type=Path);p.add_argument('--report',required=True,type=Path);p.add_argument('--allow-missing-native',action='store_true');p.add_argument('--max-bytes',type=int,default=900000000);a=p.parse_args()
    result=validate(a.site,a.origin.rstrip('/'),allow_missing_native=a.allow_missing_native,max_bytes=a.max_bytes,registry=a.registry)
    a.report.parent.mkdir(parents=True,exist_ok=True);a.report.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result.get(k) for k in ['passed','sitemap_urls','html_checked','reachable_sitemap_urls','deploy_bytes','errors_total','errors','warnings','seconds']},indent=2));return 0 if result['passed'] else 1
if __name__=='__main__':sys.exit(main())
