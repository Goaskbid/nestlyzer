'use strict';
/* Evidence Lab v2. Read-only diagnostics; cohort validation never inferred from correlation. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('./evidence_lab_core.cjs');
const ROOT=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const NM=new Set(['kg','lake','river','port','iport','mport','chem','border','metro','land','sea','shore']);
function fingerprint(meta){
 const files=['src/engine.js','src/data.js','data/meta.json','data/evidence/profiles.json','data/evidence/outcomes.json',
  'build/build_evidence_lab.js','build/evidence_lab_core.cjs','build/evidence_lab_validation.cjs','build/evidence_lab_references.json',
  'build/build_clusters.py','build/lau_update.py','build/fix_provenance.py','build/source/industry/US_CBP_2023.csv','build/source/industry/US_place_area.csv'];
 for(const c of meta.countries)files.push('data/c/'+c.cc+'.json','data/x/'+c.cc+'.json');
 const hashes={};for(const p of files.sort()){hashes[p]=fs.existsSync(path.join(ROOT,p))?hash(fs.readFileSync(path.join(ROOT,p))):null;}
 return {sha256:hash(JSON.stringify(hashes)),files:hashes};
}
function swissChange(r){const a=r.trend?.annual_population;if(!Array.isArray(a))return null;
 const first=a.filter(x=>x.year===2019&&Number.isFinite(x.population)&&x.population>0),last=a.filter(x=>x.year===2024&&Number.isFinite(x.population)&&x.population>=0);
 return first.length===1&&last.length===1?(last[0].population/first[0].population-1)*100:null;
}
// Do not decode a missing factorLevel as municipality or level 1 as local.
// A local diagnostic unit requires the exact retained LAU contract AND a direct
// raw shard cell, untouched by regional/county fallback. This audits the retained
// binding; it does not certify the original publisher or boundary comparability.
function localGrowthBinding(r,sh,i,meta){
 const fid='common_population_growth_5y',f=meta?.factors?.find(x=>x.id===fid),c=meta?.countries?.find(x=>x.cc===r.country),b=f?.by_country?.[r.country];
 const raw=sh.fr?.[fid]?.[i],level=r.factorLevel?.[fid];
 return !!(c&&!c.world&&f?.source_id==='eurostat_gisco_lau_2019_2024'&&/Eurostat GISCO LAU/.test(b?.source_name||'')&&/local administrative units/.test(b?.dataset||'')&&
  Number.isFinite(raw)&&raw===r.factorRaw?.[fid]&&(level==null||level===0)&&r.official_id!=null&&String(r.official_id).length>0);
}
function load(cc,D,meta){const sh=read('data/c/'+cc+'.json'),all=D.hydrate(sh),xs=read('data/x/'+cc+'.json');
 if(!xs?.cols||!Array.isArray(xs.strs)||Object.values(xs.cols).some(v=>!Array.isArray(v)||v.length!==all.length))throw Error('Supplement alignment failed: '+cc);
 all.forEach((r,i)=>{r.x={};for(const [k,v] of Object.entries(xs.cols)){if(v[i]!=null)r.x[k]=NM.has(k)?xs.strs[v[i]]:v[i];}r._labCounty=sh.cly?.[i]||null;r._labGrowthSupport=localGrowthBinding(r,sh,i,meta)?'retained_direct_lau':null;});
 if(sh.world?.whole){const whole=new Set(sh.world.whole.map(String));for(const r of all)if(whole.has(String(r.oid)))r.whole=true;}
 return {sh,rows:all.filter(r=>!r.superseded)};
}
function basis(cc,biz,meta){
 if(biz)return {id:'industry_lq',label:'Retained industry concentration (derived LQ)',unit:'location quotient',period:cc==='US'?'2023':'unresolved',level:cc==='US'?'county':'unresolved',
  source:cc==='US'?'US_CBP_2023, retained County Business Patterns input':'No compatible industry-register binding',
  url:cc==='US'?'https://www.census.gov/programs-surveys/cbp.html':null,
  rawField:'cluster_<profile> in factorRaw',kind:'derived_indicator',provenance:'Raw industry counts are retained. Sector aggregation, suppression and national-denominator reconciliation remain a review requirement.',
  limits:'Existing employment concentration is not a move, opening, survival rate, profitability measure or site-capacity commitment. County support is not municipal support.'};
 if(cc==='CH')return {id:'population_change',label:'Resident population change',unit:'%',period:'2019-2024',level:'place',source:'Retained annual population series, Eurostat GISCO LAU, matched by Swiss BFS code',
  url:'https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/local-administrative-units',rawField:'trend.annual_population, exact 2019 and 2024 endpoints',kind:'derived_from_retained_counts',
  provenance:'Computed as 100 * (population_2024 / population_2019 - 1). Original series retained in the country shard; boundary-change comparability still needs review.',
  limits:'All-age population stocks. Births, deaths, migration and boundary changes can affect growth. Not retirement, family or remote-worker migration.'};
 const f=meta.factors.find(x=>x.id==='common_population_growth_5y'),b=f?.by_country?.[cc]||{};
 return {id:'population_change',label:'Retained population-change measure',unit:'%',period:/year varies/i.test(b.period||'')?'unresolved':'2019-2024 in factor definition; country-period reconciliation pending',level:'municipal LAU unit only with a matched retained direct-cell contract',
  source:b.source_name||f?.source_name||'Unresolved',url:b.url||(!/GeoNames/i.test(b.source_name||'')?f?.source_url:null),rawField:'factorRaw.common_population_growth_5y only',kind:'retained_raw_indicator',
  provenance:'Unit binding is checked against the direct raw shard cell, official identifier and retained LAU contract. No regional fallback is counted as a municipality. Country descriptor: '+(b.dataset||'not supplied')+'. Period: '+(b.period||'not supplied')+'. Normalised scores are never substituted for percentages.',
  limits:'All-age change is descriptive context, not cohort-specific movement or wellbeing. Source periods, reuse terms and boundary comparability require reconciliation before independent validation.'};
}
function outcome(r,biz,p){
 if(biz){const y=r.factorRaw?.['cluster_'+p];if(!Number.isFinite(y))return null;const level=r.factorLevel?.['cluster_'+p];
  return {y,group:level===3&&r._labCounty?r.country+':county:'+r._labCounty:null,
    groupName:level===3&&r._labCounty?'County '+r._labCounty:r.name};}
 const y=r.country==='CH'?swissChange(r):r.factorRaw?.common_population_growth_5y;
 if(!Number.isFinite(y))return null;
 const level=r.factorLevel?.common_population_growth_5y;
 return {y,group:r.country==='CH'||r._labGrowthSupport==='retained_direct_lau'?r.id:null,groupName:r.name};
}
function compactPoint(x){return [x.id,x.name,+x.x.toFixed(6),+x.y.toFixed(6),x.places,x.representative];}
function generate({ifNeeded=false,check=false}={}){
 const meta=read('data/meta.json'),fp=fingerprint(meta),target=path.join(ROOT,'data/evidence/lab.json');
 let previous=null;try{previous=read('data/evidence/lab.json');}catch(e){}
 const current=previous?.schema==='nz-evidence-lab-2'&&previous.input_sha256===fp.sha256&&Object.values(previous.details||{}).every(x=>{const p=path.join(ROOT,x.path.slice(1));return fs.existsSync(p)&&hash(fs.readFileSync(p))===x.sha256;});
 if(check){if(!current)throw Error('Evidence Lab missing, stale or corrupt; rebuild it before publication.');return previous;}
 if(ifNeeded&&current){console.log('Evidence Lab: current input and detail hashes match.');return previous;}
 const D=require('../src/data.js'),E=require('../src/engine.js'),cfg=meta.config;
 const eng=new E(meta,{method:'v2'}),original=eng.categories.bind(eng);let memo=new WeakMap();eng.categories=r=>{if(!memo.has(r))memo.set(r,original(r));return memo.get(r);};
 const contracts=read('data/evidence/profiles.json').profiles,active=[...new Set([...(cfg.order||[]),...(cfg.bizOrder||[])])].filter(k=>cfg.profiles[k]&&!cfg.profiles[k].disabled&&k!=='self_fit');
 const profiles={};for(const [id,c] of Object.entries(contracts)){const p=cfg.profiles[id];if(!p)continue;profiles[id]={id,name:p.name,business:!!p.business,active:active.includes(id),weights:p.weights,
   requiredEvidence:c.required_evidence,criticalGates:c.critical_gates||[],validation:'not_tested',explanation:'No matched independent outcome experiment has been supplied. The current profile weights are unchanged.'};}
 const out={schema:'nz-evidence-lab-2',version:2,built:new Date().toISOString().slice(0,10),release:read('package.json').version,
  input_sha256:fp.sha256,model:{method:'v2',evidenceMode:cfg.evidenceScoring?.mode||'legacy',semanticIntegrity:cfg.semanticIntegrity===true,weights_sha256:hash(JSON.stringify(Object.fromEntries(Object.entries(cfg.profiles).map(([k,p])=>[k,p.weights])))),weights_changed:false},
  policy:{minUnits:30,topFraction:.1,validation:'not_tested',outcomeFallback:false,scope:'Country-ranked eligible places only; complete active-place denominator also shown.',
    unitRule:'Repeated county observations are grouped. Median model score is compared with the single retained county value. Counties and places are not pooled.',
    noCausation:'Scores and correlated indicators cannot establish why people move or why a business succeeds.',
    promotion:'Blocked until matched outcomes, independent lineage, frozen geographic/time holdouts and benchmark receipts pass review.'},
  profiles,countryNames:Object.fromEntries(meta.countries.map(c=>[c.cc,c.name])),countries:{},bases:{},details:{},references:read('build/evidence_lab_references.json'),
  contextualFindings:read('data/evidence/outcomes.json').records.map(r=>({...r,source_family:'US_CENSUS',validation:'context_only',independent_corroboration:false}))};
 let totalPlaces=0;const details=[];
 for(const country of meta.countries){const cc=country.cc,{sh,rows}=load(cc,D,meta);memo=new WeakMap();totalPlaces+=rows.length;
  const bHH=basis(cc,false,meta),bBiz=basis(cc,true,meta);out.bases[cc]={household:bHH,business:bBiz};const detail={schema:'nz-evidence-lab-detail-2',input_sha256:fp.sha256,country:cc,profiles:{}};
  const summaries=out.countries[cc]={activePlaces:rows.length,profiles:{}};
  for(const p of active){const biz=!!cfg.profiles[p].business,base=biz?bBiz:bHH,allOutcome=rows.reduce((n,r)=>n+(outcome(r,biz,p)!==null),0),res=eng.rank(rows,p,{country:cc,subRanks:false}).scored;
   const pairs=[];for(const [i,s] of res.entries()){const o=outcome(s.r,biz,p);if(o&&Number.isFinite(s.overall??s.score))pairs.push({id:s.r.id,name:s.r.name,x:s.overall??s.score,y:o.y,group:o.group,groupName:o.groupName,rank:i+1});}
   const st=C.stats(pairs),overlap=C.inputOverlap(cfg.profiles[p],base.id,cc,cfg.semanticIntegrity===true);
   const ds={sample:st.sample.map(compactPoint),examples:st.examples.map(x=>({...x,x:+x.x.toFixed(6),y:+x.y.toFixed(6)}))};
   delete st.sample;delete st.examples;
   summaries.profiles[p]={...st,activePlaces:rows.length,rankedPlaces:res.length,excludedPlaces:rows.length-res.length,outcomePlaces:allOutcome,
     matchedShare:res.length?pairs.length/res.length:null,validation:'not_tested',overlap,unit:biz?'county / verified support unit':'municipal unit',status:pairs.length?st.status:'missing_outcome'};
   detail.profiles[p]=ds;
  }
  const rel='data/evidence/lab-detail/'+cc+'.json',text=JSON.stringify(detail);details.push([rel,text]);out.details[cc]={path:'/'+rel,sha256:hash(text),bytes:Buffer.byteLength(text)};
  console.log(cc+': '+rows.length+' places audited');
 }
 const cells=Object.values(out.countries).flatMap(c=>Object.values(c.profiles));out.summary={places:totalPlaces,countries:meta.countries.length,publicProfiles:active.length,configuredProfiles:Object.keys(profiles).length,
  countryProfileCells:cells.length,descriptive:cells.filter(x=>x.status==='descriptive').length,missing:cells.filter(x=>x.status==='missing_outcome').length,
  insufficient:cells.filter(x=>x.status==='insufficient_units').length,constant:cells.filter(x=>x.status==='constant_series').length,
  inputOverlap:cells.filter(x=>x.linkedPlaces>0&&x.overlap.known).length,independentlyValidated:0};
 for(const [rel,text] of details){fs.mkdirSync(path.dirname(path.join(ROOT,rel)),{recursive:true});fs.writeFileSync(path.join(ROOT,rel)+'.tmp',text);fs.renameSync(path.join(ROOT,rel)+'.tmp',path.join(ROOT,rel));}
 fs.writeFileSync(target+'.tmp',JSON.stringify(out));fs.renameSync(target+'.tmp',target);
 fs.mkdirSync(path.join(ROOT,'docs/audit'),{recursive:true});fs.writeFileSync(path.join(ROOT,'docs/audit/evidence_lab_inputs.json'),JSON.stringify(fp,null,2));
 console.log('Evidence Lab v2:',JSON.stringify(out.summary));return out;
}
module.exports={generate,fingerprint,swissChange,outcome,basis,load,localGrowthBinding};
if(require.main===module){try{generate({ifNeeded:process.argv.includes('--if-needed'),check:process.argv.includes('--check')});}catch(e){console.error(e.stack);process.exitCode=1;}}
