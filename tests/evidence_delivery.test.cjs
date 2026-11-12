'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=path.resolve(__dirname,'..'),A=require('../src/more/area_select.js'),E=require('../src/engine.js'),D=require('../src/data.js');
const meta=JSON.parse(fs.readFileSync(path.join(R,'data/meta.json')));
// 2.15.16: the evidence model is prepared but not live (owner rule: no ranking regressions until it passes the audits);
// PREP tests that prepared model, exactly as it would run once switched on
const PREP=structuredClone(meta);PREP.config.evidenceScoring={...PREP.config.evidenceScoring,mode:'fixed'};PREP.config.semanticIntegrity=true;
function model(w,cats={},p={}){const e=new E(structuredClone(meta));e.profiles.test={weights:w,...p};e.categoriesFor=()=>cats;return e;}
const r={id:'US:test',country:'US',factorScores:{},factorRaw:{},x:{}};
const sq=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d]];
const sel=(areas,operation='union')=>A.validate({v:2,operation,areas});
const poly=(rings,cc='US')=>({cc,type:'polygon',rings,label:'Test'});
const unit=(value,cc='US')=>({cc,type:'unit',field:'canton',value,label:value});
test('Missing category keeps declared weight and creates unresolved bound',()=>{const x=model({a:20,b:80},{a:90}).scoreEvidence(r,'test',0,'US');a.equal(x.score,18);a.equal(x.upper,98);a.equal(x.coverage,20);a.equal(x.missingWeight,80);});
test('Observed zero differs from absent evidence',()=>{const x=model({a:20,b:80},{a:0,b:50}).scoreEvidence(r,'test',0);a.equal(x.score,40);a.equal(x.upper,40);a.equal(x.coverage,100);});
test('All missing is not a rankable zero',()=>a.equal(model({a:100},{}).scoreEvidence(r,'test',0),null));
test('Non-100 weight totals normalize exactly once',()=>{const x=model({a:40,b:80},{a:25,b:75}).scoreEvidence(r,'test',0);a.ok(Math.abs(x.score-58.33333333333)<1e-8);a.ok(Math.abs(x.contributions.reduce((s,v)=>s+v.points,0)-x.score)<1e-9);});
test('Unknown nuisance components retain unresolved weight',()=>{const e=model({quiet:100},{quiet:100},{avoid:['mway','air','chem']});const x=e.scoreEvidence({...r,x:{mway_km:20}},'test',0);a.ok(Math.abs(x.score-100/3)<1e-9);a.equal(x.upper,100);});
test('Freight unknown rail and port do not become perfect complete evidence',()=>{const e=model({freight:100},{freight:100});const x=e.scoreEvidence({...r,x:{mway_km:0}},'test',0);a.equal(x.score,50);a.equal(x.upper,100);});
test('Focus respects missing component coefficients',()=>{const e=model({focus:100},{focus:80},{focus:{observed:2,missing:3}});const x=e.scoreEvidence({...r,factorScores:{observed:80}},'test',0);a.equal(x.score,32);a.equal(x.upper,92);});
test('Swiss 2018 tax stays scored, one explicit case per profile, in the prepared model',()=>{const e=new E(PREP);const q={...r,id:'CH:1',country:'CH',factorScores:{retiree_tax_100k:100,family_income_tax_100k:40},factorRaw:{retiree_tax_100k:5},x:{}};a.equal(e.categoriesFor(q,'pensioner').tax,100);a.equal(e.categoriesFor(q,'young_family').tax,40);a.equal(q.factorRaw.retiree_tax_100k,5);a.equal(meta.config.evidenceScoring.mode,'legacy');});
test('Population does not manufacture daily services',()=>{const e=new E(PREP);a.equal(e.categories({...r,population:100000,x:{pop10:1000000}}).services,undefined);});
test('Mutable daily-service evidence invalidates category cache',()=>{const e=new E(PREP),q={...r,evidence:{daily_access_score:20}};a.equal(e.categories(q).services,20);q.evidence.daily_access_score=70;a.equal(e.categories(q).services,70);});
test('Mutable factor scores invalidate category cache',()=>{const e=new E(meta),q={...r,x:{climate_s:30}};a.equal(e.categories(q).climate,30);q.x.climate_s=70;a.equal(e.categories(q).climate,70);});
test('Insurance and fund fields both execute',()=>{const c=new E(meta).categories({...r,x:{ins_s:42,fund_s:67}});a.equal(c.insurhub,42);a.equal(c.fundhub,67);});
test('No population-growth empirical certification survives',()=>a.ok(!fs.readFileSync(path.join(R,'tests/evidence_audit.js'),'utf8').includes('consistent: people move')));
test('All fixed profiles have individual evidence contracts',()=>{const c=JSON.parse(fs.readFileSync(path.join(R,'data/evidence/profiles.json'))).profiles;for(const [id,p] of Object.entries(meta.config.profiles)){if(!p.weights||id==='self_fit')continue;a.ok(c[id]?.required_evidence,id);a.ok(Array.isArray(c[id].critical_gates),id);a.ok(c[id].chain,id);}a.equal(Object.keys(c).length,65);});
// 2.15.19: weights may differ from the baseline only where the holdout gate in docs/audit/evidence_refine.json accepted the exact change
test('Source weights remain the owner baseline, except holdout-accepted changes',()=>{const old=JSON.parse(fs.readFileSync(path.join(R,'build/audit_baseline/meta.json'))),ref=JSON.parse(fs.readFileSync(path.join(R,'docs/audit/evidence_refine.json'))).profiles;for(const [id,p] of Object.entries(old.config.profiles)){const acc=ref[id]&&ref[id].accepted?ref[id].weights:null;a.deepEqual(meta.config.profiles[id].weights,acc||p.weights,id);}});
test('Union matches either selected administrative code',()=>{const s=sel([unit('FL'),unit('NC')]);a.ok(A.matches({country:'US',canton:'FL'},s));a.ok(A.matches({country:'US',canton:'NC'},s));a.ok(!A.matches({country:'CA',canton:'FL'},s));});
test('Intersection uses every polygon',()=>{const s=sel([poly([sq(0,0,4,4)]),poly([sq(2,2,6,6)])],'intersection');a.ok(A.matches({country:'US',lon:3,lat:3},s));a.ok(!A.matches({country:'US',lon:1,lat:1},s));});
test('Holes exclude interior and hole boundary',()=>{const s=sel([poly([sq(0,0,8,8),sq(2,2,4,4)])]);a.ok(A.matches({country:'US',lon:1,lat:1},s));a.ok(!A.matches({country:'US',lon:3,lat:3},s));a.ok(!A.matches({country:'US',lon:2,lat:3},s));});
test('Dateline shape accepts both sides, not Greenwich',()=>{const s=sel([poly([[[179,-2],[-179,-2],[-179,2],[179,2]]])]);a.ok(A.matches({country:'US',lon:179.5,lat:0},s));a.ok(A.matches({country:'US',lon:-179.5,lat:0},s));a.ok(!A.matches({country:'US',lon:0,lat:0},s));});
test('Duplicate administrative areas are removed',()=>a.equal(sel([unit('FL'),unit('FL')]).areas.length,1));
test('Same code in different countries remains distinct',()=>a.equal(sel([unit('01','FR'),unit('01','DE')]).areas.length,2));
test('Self-intersecting polygon is rejected',()=>a.throws(()=>sel([poly([[[0,0],[3,3],[0,3],[3,0]]])])));
test('Nested holes are rejected',()=>a.throws(()=>sel([poly([sq(0,0,10,10),sq(1,1,9,9),sq(2,2,3,3)])])));
test('Outside hole is rejected',()=>a.throws(()=>sel([poly([sq(0,0,4,4),sq(5,5,6,6)])])));
test('Invalid coordinates are rejected',()=>a.throws(()=>sel([poly([[[200,0],[3,3],[1,2]]])])));
test('Invalid share link fails closed, not world scope',()=>{const s=A.decode('{bad');a.ok(s.error);a.ok(!A.matches(r,s));});
test('Share state round trip preserves code and geometry',()=>{const s=sel([unit('FL'),poly([sq(0,0,2,2)])]);a.deepEqual(A.decode(A.encode(s)),s);});
test('Area limit is enforced',()=>a.throws(()=>sel(Array.from({length:25},(_,i)=>unit(String(i))))));
test('Unselected empty scope is unchanged',()=>a.ok(A.matches(r,null)));
test('Three pensioner variants expose observed destinations',()=>{const s=fs.readFileSync(path.join(R,'src/more/evidence_features.js'),'utf8');a.ok(s.includes("'sun_retiree'"));a.ok(s.includes('Observed retirement destinations'));a.ok(s.includes('The Villages'));});
test('Coats of arms require exact official IDs and licence checks',()=>{const s=fs.readFileSync(path.join(R,'src/more/evidence_features.js'),'utf8');for(const t of ['Official code mismatch','ids.length!==1','LicenseShortName','Restrictions','extOn()'])a.ok(s.includes(t),t);});
test('Deferred features do not enter startup sources',()=>{const s=fs.readFileSync(path.join(R,'src/js/58-data.js'),'utf8');a.ok(s.includes('featureClick'));a.ok(!s.includes('function areaDraw'));});
test('Lazy rich details use explicit compressed local payloads',()=>{const s=fs.readFileSync(path.join(R,'src/place/place.js'),'utf8');a.ok(s.includes("DecompressionStream('gzip')"));a.ok(s.includes('Retry details'));a.ok(s.includes('Population data table'));});
test('Expanded site is enabled in the integrated build',()=>a.ok(fs.existsSync(path.join(R,'build/seo.enabled'))));
test('Homepage transfer (gzip 6) is within 120 KB',()=>a.ok(require('zlib').gzipSync(fs.readFileSync(path.join(R,'index.html')),{level:6}).length<120*1024));   // owner rule = transferred size, as tests/regress.py measures it
