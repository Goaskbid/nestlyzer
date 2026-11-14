'use strict';
/* Offline release gate for future experiments. It does not train, approve or edit a ranking. */
const crypto=require('node:crypto');
const stable=o=>JSON.stringify(o,Object.keys(o||{}).sort());
const digest=o=>crypto.createHash('sha256').update(typeof o==='string'?o:stable(o)).digest('hex');
function assess(e={}){
 if(!e||typeof e!=='object'||Array.isArray(e))e={};
 const errors=[],need=(x,m)=>{if(x!==true)errors.push(m);},f=Number.isFinite;
 need(e.schema==='nz-heldout-experiment-1','Missing or unsupported experiment schema');
 need(typeof e.profile==='string'&&e.profile.length>0,'Profile identity missing');
 need(/^[a-f0-9]{64}$/.test(e.model_sha256||''),'Model hash missing');
 need(/^[a-f0-9]{64}$/.test(e.data_sha256||''),'Data hash missing');
 need(e.cohort_match===true,'Outcome does not match the profile cohort/activity');
 need(e.outcome_not_in_inputs===true,'Outcome/input separation is unresolved');
 need(e.preprocessing_train_only===true,'Preprocessing was not restricted to training data');
 need(e.protocol_frozen_before_test===true,'Protocol not frozen before test access');
 need(e.test_used_once===true,'Test set has been reused for selection');
 need(e.rights_reviewed===true,'Reuse rights unresolved');
 need(e.geography_reviewed===true,'Geographic support unresolved');
 const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
 const splits=e.splits||{},seen=new Map();
 for(const name of ['train','validation','test']){
  const s=splits[name]||{},ids=s.independent_units;
  need(Array.isArray(ids)&&ids.length>0,name+' independent-unit IDs missing');
  if(Array.isArray(ids)){need(ids.every(x=>typeof x==='string'&&x.trim()),name+' has invalid unit IDs');need(new Set(ids).size===ids.length,name+' has duplicate unit IDs');
   for(const id of ids){if(seen.has(id))errors.push('Unit leakage between '+seen.get(id)+' and '+name+': '+id);else seen.set(id,name);}}
  need(validDate(s.start)&&validDate(s.end)&&s.start<=s.end,name+' period missing or invalid');
 }
 if(splits.train&&splits.validation&&splits.test){need(splits.train.end<splits.validation.start&&splits.validation.end<splits.test.start,'Temporal windows overlap or are not forward ordered');}
 const families=e.source_families;
 need(Array.isArray(families)&&families.length>=2&&families.every(x=>typeof x==='string'&&x.trim())&&new Set(families).size>=2,'Two independent underlying source families required');
 need(e.lineage_independence_reviewed===true,'Distinct source IDs have not been reviewed for independence');
 const p=e.promotion_rule||{},m=e.metrics||{};
 need(Number.isInteger(p.minimum_test_units)&&p.minimum_test_units>=30,'Minimum independent test size must be prespecified and at least 30');
 need((splits.test?.independent_units?.length||0)>=p.minimum_test_units,'Too few independent test units');
 need(f(p.minimum_improvement)&&p.minimum_improvement>0,'Minimum improvement not prespecified');
 need(f(m.baseline)&&f(m.candidate)&&f(m.delta_lower_bound),'Independent test metrics or lower uncertainty bound missing');
 need(p.direction==='higher','Metric direction unsupported');
 need(f(m.candidate)&&f(m.baseline)&&m.candidate-m.baseline>=p.minimum_improvement,'Held-out improvement below the prespecified threshold');
 need(f(m.delta_lower_bound)&&m.delta_lower_bound>0,'Improvement uncertainty includes zero');
 need(e.benchmarks?.passed===true&&Array.isArray(e.benchmarks?.receipt_sha256)&&e.benchmarks.receipt_sha256.length>0&&e.benchmarks.receipt_sha256.every(x=>/^[a-f0-9]{64}$/.test(x)),'Matching benchmark receipts missing or failing');
 need(e.stability?.passed===true&&/^[a-f0-9]{64}$/.test(e.stability?.receipt_sha256||''),'Geographic and weight-sensitivity stability receipt missing');
 return {status:errors.length?'blocked':'eligible_for_review',errors:[...new Set(errors)],automatic_promotion:false,weights_changed:false,
  note:'Passing this contract is not independent assurance. A reviewer must inspect the actual observations, lineage and pinned test artifacts.'};
}
module.exports={assess,digest};

/* Byte-level evidence attachment checks for the CLI. These are integrity checks, not assurance of the declared experimental design. */
function verifyArtifacts(e,base){
 const fs=require('node:fs'),path=require('node:path'),errors=[],checked=[],roles=new Set();
 const needed=['model','data','outcome_panel','protocol','splits','predictions','benchmark','stability'];
 if(!base||!fs.existsSync(base))return {errors:['Artifact root does not exist'],checked};
 const root=fs.realpathSync(base),artifacts=e.artifacts;
 if(!Array.isArray(artifacts))return {errors:['Pinned experiment artifacts are missing'],checked};
 for(const a of artifacts){
  if(!a||!needed.includes(a.role)||typeof a.path!=='string'||!a.path||path.isAbsolute(a.path)||a.path.includes('\\')||a.path.split('/').some(x=>x==='..'||x==='.'||x==='')||!/^[a-f0-9]{64}$/.test(a.sha256||'')){errors.push('Invalid artifact reference');continue;}
  if(roles.has(a.role)){errors.push('Duplicate artifact role: '+a.role);continue;}roles.add(a.role);
  const target=path.resolve(root,a.path);
  try{const real=fs.realpathSync(target);if(!real.startsWith(root+path.sep)||fs.lstatSync(target).isSymbolicLink()||!fs.statSync(real).isFile())throw Error('unsafe path');
   let cursor=root;for(const part of a.path.split('/')){cursor=path.join(cursor,part);if(fs.lstatSync(cursor).isSymbolicLink())throw Error('symbolic link');}
   const h=crypto.createHash('sha256'),fd=fs.openSync(real,'r'),buf=Buffer.alloc(1024*1024);try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null))>0)h.update(buf.subarray(0,n));}finally{fs.closeSync(fd);}
   const sha=h.digest('hex');if(sha!==a.sha256)throw Error('checksum mismatch');
   if((a.role==='model'&&sha!==e.model_sha256)||(a.role==='data'&&sha!==e.data_sha256))throw Error('identity mismatch');
   if(a.role==='benchmark'&&!e.benchmarks?.receipt_sha256?.includes(sha))throw Error('benchmark receipt not pinned');
   if(a.role==='stability'&&sha!==e.stability?.receipt_sha256)throw Error('stability receipt not pinned');
   checked.push({role:a.role,path:a.path,sha256:sha,bytes:fs.statSync(real).size});
  }catch(x){errors.push(a.role+': missing, changed or unsafe artifact ('+x.message+')');}
 }
 for(const role of needed)if(!roles.has(role))errors.push('Required artifact missing: '+role);
 return {errors,checked,note:'Artifact bytes checked. Scientific claims, source independence and holdout design still require review.'};
}
module.exports.verifyArtifacts=verifyArtifacts;
