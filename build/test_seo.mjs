import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {esc,isIndexPath,splitSitemaps,publicProfiles,sourceOf,factRows,pagesNav,loadEnv,prepare,buildCountries,finalize} from './seo_expand.mjs';
const baseConfig=JSON.parse(fs.readFileSync(new URL('./seo.config.json',import.meta.url),'utf8'));
test('HTML and XML escaping',()=>assert.equal(esc('&<>"\''),'&amp;&lt;&gt;&quot;&#39;'));
test('Canonical path rejects queries, fragments and traversal',()=>{
 for(const p of ['//evil.test/','/../x/','/x?sort=a','/#/map','/a\\b','/%2e%2e/','/%2fetc/'])assert.equal(isIndexPath(p),false,p);
 for(const p of ['/','/places/ch/261/','/rankings/business/fr/biz-logistics/page/2/'])assert.equal(isIndexPath(p),true,p);
});
test('Sitemap respects URL and Unicode byte limits',()=>{
 let x=splitSitemaps(Array.from({length:5},(_,i)=>({path:'/x/'+i+'/'})),'https://nestlyzer.com',2,1000);assert.equal(x.length,3);assert.equal((x.join('').match(/<url>/g)||[]).length,5);
 x=splitSitemaps(Array.from({length:20},(_,i)=>({path:'/places/'+encodeURIComponent('\u6771\u4eac')+i+'/'})),'https://nestlyzer.com',50000,500);assert(x.length>1);for(const s of x)assert(Buffer.byteLength(s)<=500);
});
test('Invalid sitemap limits fail',()=>{assert.throws(()=>splitSitemaps([],'https://a.test',0,500));assert.throws(()=>splitSitemaps([],'https://a.test',50001,500));});
test('XML source URLs escape literal ampersands',()=>assert(splitSitemaps([{path:'/a&b/'}],'https://nestlyzer.com')[0].includes('a&amp;b')));
test('Public profile registry does not invent or enable dormant cases',()=>{
 const meta={config:{order:['young_family','self_fit','disabled'],bizOrder:['biz_logistics','dormant'],bizDormant:['dormant'],profiles:{young_family:{},self_fit:{},disabled:{disabled:true},biz_logistics:{business:true},dormant:{business:true},extra:{business:true}}}};
 assert.deepEqual(publicProfiles(meta,{profiles:{extra:{},dormant:{},unknown:{}}}),['young_family','biz_logistics','extra']);
});
test('Country-specific url, unit and period override the shared source',()=>{
 const x=sourceOf({meta:{sources:{}}},{source_name:'Shared',source_url:'https://wrong.test',source_period:2018,unit:'wrong',by_country:{US:{source_name:'US source',url:'https://census.gov/',period:2024,unit:'USD'}}},'US');
 assert.equal(x.name,'US source');assert.equal(x.url,'https://census.gov/');assert.equal(x.period,2024);assert.equal(x.unit,'USD');
});
test('Missing country source is not replaced with unrelated shared URL',()=>{
 const x=sourceOf({meta:{sources:{}}},{source_url:'https://wrong.test',by_country:{US:{source_name:'Unknown'}}},'US');assert.equal(x.url,null);assert.equal(x.period,'Reference period not supplied');
});
test('Unsafe and composite source strings are omitted',()=>{
 for(const url of ['javascript:alert(1)','https://a.test (extra https://b.test)','https://u:p@a.test'])assert.equal(sourceOf({meta:{sources:{}}},{source_url:url},'CH').url,null);
});
test('Pagination has actual hrefs and its own page paths',()=>{
 const h=pagesNav('/places/fr/',2,4);assert(h.includes('href="/places/fr/page/3/"'));assert(h.includes('href="/places/fr/"'));assert(!h.includes('#page'));assert.equal(pagesNav('/x/',1,1),'');
});
test('Fact builder excludes explicit publication holds',()=>{
 const f={id:'n_income',name:'Income',unit:'CHF',source_url:'https://example.test/',source_period:2024,publication_approved:false};const env={meta:{sources:{}},factorById:{n_income:f},config:{factLimit:2}};
 assert.equal(factRows(env,{country:'CH',factorRaw:{n_income:100}}),'');
});

function fixture(){
 const top=fs.mkdtempSync(path.join(os.tmpdir(),'nz-seo-'));const root=path.join(top,'repo'),out=path.join(top,'site'),cache=path.join(top,'cache');
 const json=(f,x)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(x));};
 const raw=(f,x)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,x);};
 const meta={v:'fixture-only',countries:[{cc:'CH',name:'Switzerland'},{cc:'US',name:'United States'}],sources:{},categoryLabels:{cost:'Cost'},factors:[{id:'common_population_scale',name:'Population',unit:'people',source_name:'Test source',source_url:'https://example.test/',source_period:2024},{id:'n_income',name:'Income',unit:'USD',source_name:'Test source',source_url:'https://example.test/',source_period:2024}],config:{order:['young_family','pensioner'],bizOrder:['biz_logistics'],bizDormant:[],profiles:{young_family:{name:'Young family',weights:{cost:20}},pensioner:{name:'Retired couple',weights:{cost:30}},biz_logistics:{name:'Road distribution',business:true,weights:{cost:10}}}}};
 json(path.join(root,'data/meta.json'),meta);
 function rec(cc,id,name,pop){return {id:cc+':'+id,oid:id,name,country:cc,canton:'ZH',cantonName:'Zurich',region:'',population:pop,popNow:pop,popYear:2024,lat:47,lon:8,area_km2:10,factorRaw:{n_income:100},factorLevel:{n_income:9}};}
 json(path.join(root,'data/c/CH.json'),{recs:[rec('CH','1','One',40000),rec('CH','2','Two',2000),rec('CH','3','Three',1000)]});
 json(path.join(root,'data/c/US.json'),{recs:[rec('US','4','Large',50000),rec('US','5','Small',500)]});
 json(path.join(root,'data/x/CH.json'),{strs:[],cols:{example:[null,null,null]}});
 json(path.join(root,'data/x/US.json'),{strs:[],cols:{example:[null,null]}});
 raw(path.join(root,'src/data.js'),'exports.hydrate=s=>s.recs;exports.translit=s=>s;');
 raw(path.join(root,'src/engine.js'),"module.exports=class{categories(){return {cost:70}}rank(recs,p){return{scored:p==='pensioner'&&recs[0].country==='US'?[]:recs.map((r,i)=>({id:r.id,r,rank:i+1,overall:70-i,thin:false}))}}}");
 json(path.join(root,'data/rank/world.json'),{version:'fixture',profiles:{young_family:{ranked:5,top:[['CH:1','One',70]]},biz_logistics:{ranked:5,top:[['US:4','Large',65]]}}});
 for(const p of ['/','/legal/','/method/','/insights/','/world/','/incentives/'])raw(path.join(out,p.slice(1),'index.html'),'<html><head><title>'+p+'</title><meta name="description" content="Fixture"><link rel="canonical" href="https://nestlyzer.com'+p+'"></head><body><h1>'+p+'</h1><footer>Footer</footer></body></html>');
 raw(path.join(out,'sitemap.xml'),splitSitemaps(['/','/legal/','/method/','/insights/','/world/','/incentives/'].map(p=>({path:p})),'https://nestlyzer.com')[0]);
 for(const f of ['place.js','place.css'])raw(path.join(root,'src/place',f),fs.readFileSync(new URL('../src/place/'+f,import.meta.url),'utf8'));
 raw(path.join(out,'assets/site.css'),'body{font-family:system-ui}');raw(path.join(out,'favicon.ico'),'fixture');
 const cfg={...baseConfig,minNewPlacePopulation:0,maxRankingResults:0,excludedExactPaths:['/incentives/'],legacyRegistry:null,rankingPageSize:2,placePageSize:2,maxSitemapUrls:5};
 return {top,root,out,cache,meta,json,env:loadEnv(root,out,cache,cfg),clean(){fs.rmSync(top,{recursive:true,force:true});}};
}
test('Fixture builds every active place, includes small US location, preserves legacy identity',()=>{
 const f=fixture();try{const a=prepare(f.env);assert.equal(a.active,5);assert.equal(a.legacyPages,4);assert.equal(a.previouslyExcluded,1);buildCountries(f.env);const r=finalize(f.env);assert.equal(r.activePlaces,5);assert.equal(r.emptyCountryRankContexts,1);
 const registry=JSON.parse(fs.readFileSync(path.join(f.cache,'registry.json')));assert.equal(registry.byId['US:5'].url,'/places/us/5/');assert.equal(registry.byId['CH:1'].url,'/switzerland/zurich/one/');
 const small=fs.readFileSync(path.join(f.out,'places/us/5/index.html'),'utf8');assert(small.includes('Small'));assert(small.includes('country; 2024'));assert(!small.includes('2018'));
 }finally{f.clean();}
});
test('Full rankings paginate without truncating rows, empty results are noindex',()=>{
 const f=fixture();try{prepare(f.env);const stats=buildCountries(f.env);assert.equal(stats.find(x=>x.cc==='CH').rankingRows,9);finalize(f.env);
 let h=fs.readFileSync(path.join(f.out,'rankings/households/ch/young-family/page/2/index.html'),'utf8');assert(h.includes('rel="canonical" href="https://nestlyzer.com/rankings/households/ch/young-family/page/2/"'));assert(h.includes('<ol class="rows" start="3">'));assert(h.includes('Three'));
 h=fs.readFileSync(path.join(f.out,'rankings/households/us/pensioner/index.html'),'utf8');assert(h.includes('noindex,follow'));
 assert(!fs.readFileSync(path.join(f.out,'sitemap-rankings-households.xml'),'utf8').includes('/us/pensioner/'));
 }finally{f.clean();}
});
test('Finalization preserves native URLs and links and excludes held context',()=>{
 const f=fixture();try{prepare(f.env);buildCountries(f.env);const r=finalize(f.env);assert.equal(r.completeNativeBuild,true);assert.equal(r.nativeNoindex.length,1);assert.equal(r.navigationAmended,6);const h=fs.readFileSync(path.join(f.out,'index.html'),'utf8');assert(h.includes('/rankings/business/'));assert(fs.readFileSync(path.join(f.out,'incentives/index.html'),'utf8').includes('noindex,follow'));assert(!fs.readFileSync(path.join(f.out,'sitemap-existing.xml'),'utf8').includes('/incentives/'));
 }finally{f.clean();}
});
test('An incomplete country build fails rather than inventing complete coverage',()=>{
 const f=fixture();try{prepare(f.env);buildCountries(f.env,['CH']);assert.throws(()=>finalize(f.env),/Incomplete SEO country/);}finally{f.clean();}
});
test('Starting a new run removes stale per-country success records',()=>{
 const f=fixture();try{prepare(f.env);buildCountries(f.env);assert(fs.existsSync(path.join(f.cache,'results-US.json')));prepare(f.env);assert(!fs.existsSync(path.join(f.cache,'results-US.json')));assert.throws(()=>finalize(f.env),/Incomplete/);}finally{f.clean();}
});
test('Unknown first modification dates stay omitted and no-change reruns retain them',()=>{
 const f=fixture();try{prepare(f.env);buildCountries(f.env);finalize(f.env);const a=JSON.parse(fs.readFileSync(path.join(f.cache,'state.json')));assert(Object.values(a).every(x=>x.lastmod===null));prepare(f.env);buildCountries(f.env);finalize(f.env);const b=JSON.parse(fs.readFileSync(path.join(f.cache,'state.json')));assert.deepEqual(b,a);}finally{f.clean();}
});
test('Source .cache is allowed for a root build, but not inside the published tree',()=>{
 const f=fixture();try{assert.doesNotThrow(()=>loadEnv(f.root,f.root,path.join(f.root,'.cache/seo'),baseConfig));assert.throws(()=>loadEnv(f.root,f.out,path.join(f.out,'private'),baseConfig),/Cache must/);}finally{f.clean();}
});

test('Missing supplemental file fails a static ranking build',()=>{const f=fixture();try{fs.unlinkSync(path.join(f.root,'data/x/CH.json'));assert.throws(()=>prepare(f.env),/supplement missing/);}finally{f.clean();}});
test('Wrong supplemental row count fails a static ranking build',()=>{const f=fixture();try{f.json(path.join(f.root,'data/x/CH.json'),{strs:[],cols:{example:[null]}});assert.throws(()=>prepare(f.env),/Invalid country supplement/);}finally{f.clean();}});

test('Size budget: small new places stay in the app, not as pages; legacy pages stay (2.15.16)',()=>{
 const f=fixture();try{f.env.config.minNewPlacePopulation=1e9;prepare(f.env);buildCountries(f.env);finalize(f.env);
 assert(!fs.existsSync(path.join(f.out,'places/us/5/index.html')));
 const pages=JSON.parse(fs.readFileSync(path.join(f.out,'data/pages.json')));assert.equal(pages['US:5'],undefined);assert.equal(pages['CH:1'],'/switzerland/zurich/one/');
 }finally{f.clean();}
});
