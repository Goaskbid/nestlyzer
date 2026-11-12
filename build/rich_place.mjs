/* Full place views with shared code and bounded lazy data. No discarded native URLs. */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';
const round=x=>Number.isFinite(x)?Math.round(x*100)/100:null;
const fields=['common_population_growth_5y','single_income_tax_100k','family_income_tax_100k','retiree_tax_100k','wealth_tax_1m','geo_hub_airport_km','geo_major_city_km','geo_catchment_30km','geo_coast_km','geo_shore_km','n_hospital_km','n_general_hospital_km','n_gps_100k_us','n_rent_us','n_home_value_us','n_age65_us'];
function xyz(r){const a=r.lat*Math.PI/180,b=r.lon*Math.PI/180;return[Math.cos(a)*Math.cos(b),Math.cos(a)*Math.sin(b),Math.sin(a)];}
function tree(a,depth=0){if(!a.length)return null;const ax=depth%3;a.sort((p,q)=>p.v[ax]-q.v[ax]);const i=a.length>>1;return{p:a[i],ax,left:tree(a.slice(0,i),depth+1),right:tree(a.slice(i+1),depth+1)};}
function nearest(t,q,id,k=8){const best=[];function go(n){if(!n)return;const d=n.p.v.reduce((s,v,i)=>s+(v-q[i])**2,0),dx=q[n.ax]-n.p.v[n.ax];if(n.p.id!==id){best.push([n.p.id,d]);best.sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0]));if(best.length>k)best.pop();}go(dx<0?n.left:n.right);if(best.length<k||dx*dx<=best[best.length-1][1])go(dx<0?n.right:n.left);}go(t);return best.map(([i,d])=>[i,Math.round(6371*2*Math.asin(Math.min(1,Math.sqrt(d)/2))*10)/10]);}
export function installRichAssets(env){for(const f of ['place.js','place.css'])fs.copyFileSync(path.join(env.root,'src/place',f),path.join(env.out,'assets',f));const profiles=env.profiles.map(p=>{const x=env.meta.config.profiles[p];return[p,x.name,!!x.business]});const factors=Object.fromEntries(env.meta.factors.map(f=>[f.id,{n:f.name,u:f.unit||'',s:f.source_url||env.meta.sources?.[f.source_id]?.url||'',p:f.source_period||env.meta.sources?.[f.source_id]?.period||'',b:f.by_country||{}}]));fs.rmSync(path.join(env.out,'data/place-detail'),{recursive:true,force:true});/* 2.15.16: no stale buckets from earlier builds */fs.mkdirSync(path.join(env.out,'data/place-detail'),{recursive:true});fs.writeFileSync(path.join(env.out,'data/place-detail/meta.json'),JSON.stringify({version:'rich-place-1',model:env.meta.config.evidenceScoring?.mode==='fixed'?'evidence-fixed-1':'legacy-v2',fixedWeights:env.meta.config.evidenceScoring?.mode==='fixed',profiles,categories:env.meta.categoryLabels,factors}));}

export function injectLegacyClimate(env,a,link){
 if(!a.legacy||!link)return false;
 if(!a.url.startsWith('/')||a.url.includes('..')||a.url.includes('\\'))throw Error('Unsafe legacy path');
 const file=path.join(env.out,a.url.slice(1),'index.html');if(!fs.existsSync(file))throw Error('Missing native page');
 const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!/^USW[0-9]+$/.test(link.station_id)||!Number.isFinite(link.distance_km)||link.distance_km<0||link.distance_km>25)throw Error('Invalid station context');
 const old=fs.readFileSync(file,'utf8'),clean=old.replace(/<!--NZ-STATION-CONTEXT-->[\s\S]*?<!--NZ-STATION-CONTEXT-END-->/g,'');
 const block='<!--NZ-STATION-CONTEXT--><link rel="stylesheet" href="/assets/place.css"><div id="place-climate" data-country="'+esc(a.cc)+'" data-station="'+esc(link.station_id)+'" data-distance="'+link.distance_km+'"><p>Nearby weather-station normals load on this page; not municipal measurements or ranking inputs.</p></div><script defer src="/assets/place.js"></script><!--NZ-STATION-CONTEXT-END-->';
 const mark=clean.includes('</main>')?'</main>':'</body>';if(!clean.includes(mark))throw Error('Native page has no container');
 const result=clean.replace(mark,block+mark);if(result!==old)fs.writeFileSync(file,result);return result!==old;
}
export function detailCountry(env,cc,recs,registry,engine,fits){
 const climatePath=path.join(env.root,'data/measured-climate',cc+'.json');const climateLinks=fs.existsSync(climatePath)?JSON.parse(fs.readFileSync(climatePath,'utf8')).links:{};
 const dir=path.join(env.out,'data/place-detail',cc);fs.mkdirSync(dir,{recursive:true});const rows=registry.map(a=>[a.id,a.name,a.url,a.region]),refs=new Map(registry.map(a=>[a.id,a])),index=new Map(recs.map(r=>[r.id,r]));
 fs.writeFileSync(path.join(dir,'places.json.gz'),zlib.gzipSync(JSON.stringify(rows),{level:9}));fs.rmSync(path.join(dir,'places.json'),{force:true});
 const points=recs.filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lon)&&!r.whole).map(r=>({id:r.id,v:xyz(r)})),T=tree(points);
 const cats=Object.keys(env.meta.categoryLabels),buckets=[],count=128;let chartCount=0,localCount=0;
 for(let i=0;i<registry.length;i++){
  const a=registry[i],r=index.get(a.id),fr=r.factorRaw||{},data={q:(fits.get(r.id)||[]).map(([p,rank,s,n,thin,coverage,upper,rr,rn])=>[env.profiles.indexOf(p),round(s),rank,n,rr,rn,coverage,round(upper),thin?1:0]),k:Object.entries(engine.categories(r)).filter(([k,v])=>Number.isFinite(v)).map(([k,v])=>[k,round(v)]),f:fields.filter(k=>Number.isFinite(fr[k])).map(k=>[k,fr[k],r.factorLevel?.[k]??null]),p:r.trend?.annual_population||null,x:Object.fromEntries(['kg','alt','relief','lake','lake_km','land','river','river_km','sea','metro','metro_km','border','border_km'].filter(k=>r.x?.[k]!=null).map(k=>[k,r.x[k]])),n:Number.isFinite(r.lat)&&Number.isFinite(r.lon)?nearest(T,xyz(r),r.id):[]};
  // Non-ranking facts keep their raw values, support, unit and reference year.
  const extra=Object.keys(fr).filter(k=>!fields.includes(k)&&Number.isFinite(fr[k])&&env.factorById[k]&&!env.factorById[k].hold_reason);
  data.f.push(...extra.slice(0,24).map(k=>[k,fr[k],r.factorLevel?.[k]??null]));
  if(climateLinks[r.id]){data.weatherStation=climateLinks[r.id];injectLegacyClimate(env,a,climateLinks[r.id]);}
  data.l=cc==='CH'?(env.meta.config.placeNotes||{})[r.name.replace(/\s*\(.*?\)\s*/g,' ').trim()+'|'+r.canton]||null:null;
  if(data.p?.length>=2)chartCount++;if(data.l)localCount++;
  const b=Math.floor(i/count);(buckets[b]||=(Object.create(null)))[r.id]=data;a.detailBucket=b;
 }
 let bytes=0;for(let i=0;i<buckets.length;i++){const text=JSON.stringify(buckets[i]);const packed=zlib.gzipSync(text,{level:9});bytes+=packed.length;fs.writeFileSync(path.join(dir,i+'.json.gz'),packed);fs.rmSync(path.join(dir,i+'.json'),{force:true});}
 return{schema:'rich-place-1',records:registry.length,buckets:buckets.length,bytes,charts:chartCount,localNotes:localCount,features:['all-profile table','country and region ranks','raw facts and source support','strengths and trade-offs','local context when supplied','population chart when supplied','nearby places','interactive map links']};
}
export function richMarkup(env,a,r,allFits,esc,num,rankPath,sourceFacts){const featured=allFits.filter(x=>['young_family','pensioner','remote'].includes(x[0])).slice(0,a.legacy?3:1),pop=Number.isFinite(r.popNow)?r.popNow:r.population;return '<nav><a href="/places/'+a.cc.toLowerCase()+'/">'+esc(a.region||a.cc)+'</a></nav><h1>'+esc(a.name)+'</h1><p>'+esc(r.id)+'. <a href="/#/explore?cc='+a.cc+'&amp;sel='+encodeURIComponent(r.id)+'">Open map</a></p>'+sourceFacts+'<p class="notice">'+(env.meta.config.evidenceScoring?.mode==='fixed'?'Supported points; missing inputs unresolved.':'Legacy model score; missing inputs reweighted.')+' Not an empirically validated prediction.</p>'+ (featured.length?'<ul>'+featured.map(([p,rank,s,n])=>'<li><a href="'+rankPath(env,p,a.cc)+'">'+esc(env.meta.config.profiles[p].name)+'</a>: #'+num(rank)+'/'+num(n)+', '+num(s,1)+' points</li>').join('')+'</ul>':'')+'<div id="place-rich" data-country="'+a.cc+'" data-bucket="'+a.detailBucket+'" data-id="'+esc(r.id)+'"><p role="status">Loading details.</p></div><noscript>Enable JavaScript for all profiles and charts.</noscript><script defer src="/assets/place.js"></script>';}
