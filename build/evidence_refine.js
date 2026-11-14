'use strict';
/* Inspect a proposed experiment, never train on generic growth or edit production weights. */
const fs=require('node:fs'),path=require('node:path'),{assess,verifyArtifacts}=require('./evidence_lab_validation.cjs');
const args=process.argv.slice(2),i=args.indexOf('--experiment'),ROOT=path.resolve(__dirname,'..');
let receipt={},parseError=null;
try{if(i>=0&&args[i+1])receipt=JSON.parse(fs.readFileSync(path.resolve(args[i+1]),'utf8'));}catch(e){parseError=e.message;}
if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))receipt={};
const result=assess(receipt);
if(parseError)result.errors.push('Experiment receipt could not be parsed: '+parseError);
const artifactRoot=i>=0&&args[i+1]?path.dirname(path.resolve(args[i+1])):ROOT;
const integrity=verifyArtifacts(receipt,artifactRoot);result.artifacts=integrity;result.errors.push(...integrity.errors);
const profiles=JSON.parse(fs.readFileSync(path.join(ROOT,'data/meta.json'))).config.profiles;
if(receipt.profile&&!Object.hasOwn(profiles,receipt.profile))result.errors.push('Unknown profile identity');
if(result.errors.length)result.status='blocked';
result.checked_at=new Date().toISOString();result.profile=receipt.profile||null;
const out=path.join(ROOT,'docs/audit/evidence_lab_promotion.json');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out+'.tmp',JSON.stringify(result,null,2));fs.renameSync(out+'.tmp',out);
console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='blocked'?2:0;
