/* Reproduction harness from the owner's audit package nz-expansion-20261105-v2 (02_AUDIT.json), kept verbatim:
   counts repeated or contradictory reasons in the stored world top ten, and world scores above 100.
   node tests/explain_audit.cjs . /tmp/out.json */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=process.argv[2], out=process.argv[3];
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const E=require(path.resolve(root,'src/engine.js')),D=require(path.resolve(root,'src/data.js'));
const meta=read('data/meta.json'),eng=new E(meta,{method:'v2'}),profiles=meta.config.profiles;
const src=fs.readFileSync(path.join(root,'src/more/more.js'),'utf8');
const a=src.indexOf('var FIT_CAT ='),b=src.indexOf('function fitPhrase',a);
const ctx={ENGINE:eng,S:{profile:''},placeX:r=>r.x||{},profileDef:k=>profiles[k],demonym:cc=>cc,unitWord:()=> 'places',fin:x=>typeof x==='number'&&Number.isFinite(x),shPctOf:()=>null,hiLo:()=>'',adFmtRaw:()=>'',needEvidence:()=>'',shortCat:k=>k,catLabel:k=>k,NZ_TXT:{}};
vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
const NM={kg:1,lake:1,river:1,port:1,iport:1,mport:1,chem:1,fin:1,border:1,metro:1,land:1,sea:1,tz:1,shore:1};
let total=0,sameSide=0,both=0,active=0;const examples=[],country=[]; const world=read('data/rank/world.json'); const wanted={}; for(const [k,p] of Object.entries(world.profiles))for(const row of p.top.slice(0,10)){const cc=row[0].split(':')[0];(wanted[cc]??=[]).push({id:row[0],profile:k});}
for(const c of meta.countries){
 const shard=read('data/c/'+c.cc+'.json'), all=D.hydrate(shard);let xs=null;
 if(fs.existsSync(path.join(root,'data/x/'+c.cc+'.json')))xs=read('data/x/'+c.cc+'.json');
 if(xs)all.forEach((r,i)=>{let x={};for(const k in xs.cols){let v=xs.cols[k][i];if(v!=null)x[k]=NM[k]?xs.strs[v]:v;}r.x=x;});
 const rs=all.filter(r=>!r.superseded);active+=rs.length;let n=0,dup=0,cross=0;
 for(const [k,p]of Object.entries(profiles)){
  if(!p.weights)continue;ctx.S.profile=k;
  const select=(wanted[c.cc]||[]).filter(x=>x.profile===k).map(x=>rs.find(r=>r.id===x.id)).filter(Boolean);
  for(const r0 of select){ const s={r:r0,score:null};
   const it=ctx.fitItems(s.r),pro=it.filter(o=>o.s>=60).sort((a,b)=>b.imp*(b.s-50)-a.imp*(a.s-50)).slice(0,10),con=it.filter(o=>o.s<=40).sort((a,b)=>b.imp*(50-b.s)-a.imp*(50-a.s)).slice(0,3);
   const pL=pro.map(o=>o.lab),cL=con.map(o=>o.lab),du=new Set(pL).size<pL.length||new Set(cL).size<cL.length,cr=pL.some(l=>cL.includes(l));
   total++;n++;if(du){sameSide++;dup++;}if(cr){both++;cross++;}
   if((du||cr)&&examples.length<25)examples.push({cc:c.cc,profile:k,id:s.r.id,name:s.r.name,score:s.score,pro:pro.map(o=>({key:o.k,label:o.lab,value:o.s})),con:con.map(o=>({key:o.k,label:o.lab,value:o.s}))});
  }
 }
 country.push({cc:c.cc,active:rs.length,cases:n,duplicate_side:dup,both_sides:cross});
}
const scopeStats={};for(const scope of ['world','europe','americas','asia_pacific']){const d=read('data/rank/'+scope+'.json');let bad=[],count=0,thin=0;
 for(const[k,p]of Object.entries(d.profiles))for(const r of p.top){count++;if(r[6])thin++;if(r[2]>100)bad.push({profile:k,id:r[0],name:r[1],score:r[2]});}
 bad.sort((a,b)=>b.score-a.score);scopeStats[scope]={count,thin,above100:bad.length,max:bad[0]||null,examples:bad.slice(0,10)};
}
const ch=read('data/c/CH.json'),ci=Object.fromEntries(ch.cols.map((k,i)=>[k,i])), years={},mismatches=[];
ch.rows.forEach((r,i)=>{const ap=ch.trend[i]?.annual_population||[],last=ap.at(-1);if(last){years[last.year]=(years[last.year]||0)+1;if(r[ci.pop]!==last.population)mismatches.push({id:'CH:'+r[ci.oid],name:r[ci.name],baseline:r[ci.pop],latest:last});}});
const tax=meta.factors.filter(f=>f.source_id==='estv_tax_burden_2018');
const results={baseline:'2.13.2',active,profiles:Object.keys(profiles).length,factors:meta.factors.length,countries:country,explanations:{cases:total,duplicate_side:sameSide,both_sides:both,examples,scope:'stored world top ten per ranked profile; text helpers stubbed; source fitItems and source side-selection preserved; source category recomputation, no rank recomputation; not all place-profile prevalence'},global_rank:scopeStats,ch_population:{latest_series_years:years,mismatches,build_report:read('docs/audit/ch_population_refresh.json')},swiss_tax:{factors:tax.map(f=>f.id),numeric_cells:tax.reduce((n,f)=>n+(ch.fr[f.id]||[]).filter(x=>typeof x==='number').length,0)}};
fs.writeFileSync(out,JSON.stringify(results,null,2));console.log(JSON.stringify({...results,ch_population:{latest_series_years:years,mismatches},countries:country.length,explanations:{cases:total,duplicate_side:sameSide,both_sides:both}}));
