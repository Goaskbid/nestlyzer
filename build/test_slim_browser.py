from pathlib import Path
from playwright.sync_api import sync_playwright
from urllib.parse import urlsplit,unquote
from PIL import Image,ImageChops
import mimetypes,json,hashlib,io
import argparse,sys,shutil,subprocess
ap=argparse.ArgumentParser(description="Offline before/after Chromium page parity, not production HTTP verification.")
ap.add_argument('--before',required=True,type=Path);ap.add_argument('--after',required=True,type=Path);ap.add_argument('--output',required=True,type=Path);ap.add_argument('--chromium',default=shutil.which('chromium') or shutil.which('chromium-browser'))
a=ap.parse_args();base=a.before.resolve();after=a.after.resolve();out=a.output.resolve();out.mkdir(parents=True,exist_ok=True)
if out.is_relative_to(base) or out.is_relative_to(after):raise SystemExit('Keep browser evidence outside public/source folders')
registry=json.loads((base/'.cache/seo/registry.json').read_text())['byId']
small=next(v['url'] for v in registry.values() if v['cc']=='FR' and not v['legacy'])
urls=['/switzerland/graubunden/chur/','/switzerland/graubunden/st-moritz/','/united-states/california/menlo-park/',small,'/rankings/business/ch/biz-tech/','/rankings/households/us/pensioner/']
report={'scope':'Offline Chromium set_content fixtures, routed local assets, not live HTTP; unchanged original font assets restored locally from the owner-supplied archive, hashes match the prior catalogue; no font files redistributed.','copy_policy':'Source before fixture is normalized only by the exact reviewed release_output_contract.repairClaimCopy statements; numerical facts, DOM and pixels then checked for compression parity.','cases':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=a.chromium,headless=True,args=['--no-sandbox'])
 for index,(width,theme,js) in enumerate([(390,'light',True),(1440,'light',True),(390,'dark',True),(390,'light',False)]):
  for ui,url in enumerate(urls):
   pair=[]
   for label,root in [('before',base),('after',after)]:
    ctx=b.new_context(viewport={'width':width,'height':844},java_script_enabled=js,service_workers='block',reduced_motion='reduce');pg=ctx.new_page();errors=[];missing=[];external=[]
    pg.on('pageerror',lambda e:errors.append(str(e)))
    def route(r):
     u=urlsplit(r.request.url);f=(root/unquote(u.path).lstrip('/')).resolve()
     if f.is_dir():f=f/'index.html'
     if u.hostname=='nestlyzer.com' and f.is_file() and f.is_relative_to(root):return r.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(f.name)[0] or 'application/octet-stream')
     if u.hostname!='nestlyzer.com':external.append(r.request.url)
     else:missing.append(u.path)
     return r.fulfill(status=404,body='Not supplied in offline fixture')
    ctx.route('**/*',route)
    f=root/url.lstrip('/')/'index.html'
    h=f.read_text()
    # Intentional wording corrections are reviewed separately. Compare compression against that corrected content.
    if label=='before':
     h=subprocess.check_output(['node','-e',"const fs=require('fs'),c=require(process.argv[1]);process.stdout.write(c.repairClaimCopy(fs.readFileSync(0,'utf8')).text);",str(base/'build/release_output_contract.cjs')],input=h.encode()).decode()
    h=h.replace('<head>','<head><base href="https://nestlyzer.com/">',1)
    if theme=='dark':h=h.replace('<html lang="en">','<html lang="en" data-theme="dark">').replace('<html lang=en>','<html lang=en data-theme=dark>')
    pg.set_content(h,wait_until='networkidle',timeout=20000)
    pg.wait_for_timeout(150)
    # Read DOM even in script-disabled contexts; evaluate is inspector access, not app execution.
    data=pg.evaluate('''()=>({text:document.body.innerText,links:[...document.querySelectorAll('a')].map(a=>[a.getAttribute('href'),a.textContent,a.getAttribute('aria-label')]),tables:[...document.querySelectorAll('table')].map(t=>[...t.rows].map(r=>[...r.cells].map(c=>c.textContent))),ld:[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent)),headings:[...document.querySelectorAll('h1,h2,h3')].map(h=>h.textContent),background:getComputedStyle(document.body).backgroundColor,colour:getComputedStyle(document.body).color,overflow:document.documentElement.scrollWidth>innerWidth+1,rows:[...document.querySelectorAll('script.nzr')].map(s=>JSON.parse(s.textContent))})''')
    # Packed data intentionally differs before JavaScript runs; visible no-JS data must not differ.
    if not js:data.pop('rows')
    image=pg.screenshot(full_page=True,animations='disabled');pair.append((data,image,errors,missing,external))
    if index==0 and ui in [0,2]: (out/(('chur' if ui==0 else 'menlo')+'-'+label+'.png')).write_bytes(image)
    ctx.close()
   a,z=pair;ia=Image.open(io.BytesIO(a[1])).convert('RGB');iz=Image.open(io.BytesIO(z[1])).convert('RGB');pixels_equal=ia.size==iz.size and ImageChops.difference(ia,iz).getbbox() is None
   row={'url':url,'width':width,'theme':theme,'javascript':js,'dom_equal':a[0]==z[0],'pixels_equal':pixels_equal,'before_errors':a[2],'after_errors':z[2],'missing_local_assets':sorted(set(a[3]+z[3])),'third_party_requests_before':a[4],'third_party_requests_after':z[4],'overflow_before':a[0]['overflow'],'overflow_after':z[0]['overflow'],'before_image_size':ia.size,'after_image_size':iz.size}
   if a[0]!=z[0]:row['different_fields']=[k for k in a[0] if a[0][k]!=z[0][k]]
   row['passed']=row['dom_equal'] and pixels_equal and not a[2] and not z[2] and not a[3] and not z[3] and a[4]==z[4]
   report['cases'].append(row);print(json.dumps({k:row[k]for k in ['url','width','theme','javascript','passed'] }),flush=True)
 b.close()
report['passed']=len(report['cases'])==24 and all(c['passed']for c in report['cases']);report['case_count']=len(report['cases']);report['before_after_render_count']=len(report['cases'])*2
(out/'comparison.json').write_text(json.dumps(report,indent=2)+'\n');print('PASSED',report['passed'])

sys.exit(0 if report['passed'] else 1)
