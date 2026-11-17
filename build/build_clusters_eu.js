'use strict';
/* Repair: stage source-valid context, never rewrite production country supplements implicitly.
   Usage: node build/build_clusters_eu.js [--source-dir build/source/clusters] [--out docs/audit/clusters]
   Optional cohort_contracts.json enables candidate indices only after complete native geography validation.
   Publication/mapping remains a separate reviewed operation. */
const fs=require('node:fs'),path=require('node:path'),C=require('./cluster_source_contract.cjs');
function main(argv=process.argv.slice(2)){
 const root=path.resolve(__dirname,'..'),opt=k=>{const i=argv.indexOf(k);return i<0?null:argv[i+1];};
 if(argv.includes('--apply'))throw Error('Implicit production overwrite removed. Review staged metadata and use a controlled publication change.');
 const dir=path.resolve(root,opt('--source-dir')||'build/source/clusters'),out=path.resolve(root,opt('--out')||'docs/audit/clusters');
 if(out===dir||out.startsWith(path.join(root,'data')+path.sep))throw Error('Staging must not overwrite source or public data');
 const sources=[],records=[],held=[],missing=[];const files=[['FR','FR_local.csv.gz','local'],['NL','NL_local.csv.gz','local'],['EU','eurostat_nama_10r_3empers.tsv.gz','eurostat']];
 for(const [cc,name,type]of files){const file=path.join(dir,name);if(!fs.existsSync(file)){missing.push(name);continue;}const input=C.textFile(file),parsed=type==='local'?C.parseLocal(input.text):C.parseEurostat(input.text);sources.push({name,sha256:input.sha256,bytes:fs.statSync(file).size,records:parsed.records.length,held:parsed.held.length});records.push(...parsed.records.map(r=>({...r,country:r.country||cc,source_sha256:input.sha256,score_eligible:false})));held.push(...parsed.held.map(r=>({...r,country:r.country||cc,source_sha256:input.sha256})));}
 const cf=path.join(dir,'cohort_contracts.json'),contracts=fs.existsSync(cf)?JSON.parse(fs.readFileSync(cf)):[],candidates=[];
 for(const contract of contracts){if(contract.review_status!=='approved-for-candidate'||!sources.some(s=>s.sha256===contract.source_sha256))throw Error('Unreviewed or mismatched cohort contract');candidates.push(...C.cohort(records.filter(r=>r.country===contract.country&&r.source_sha256===contract.source_sha256),contract));}
 fs.mkdirSync(out,{recursive:true});for(const [name,value]of [['facts',records],['held',held],['candidate_indices',candidates]])fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(value));
 const receipt={schema:'nz-cluster-intake-2',sources,missing,facts:records.length,held:held.length,candidate_indices:candidates.length,production_files_changed:0,score_eligible_records:0};fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));return receipt;
}
module.exports={main};if(require.main===module){try{main();}catch(e){console.error(e.stack);process.exitCode=1;}}
