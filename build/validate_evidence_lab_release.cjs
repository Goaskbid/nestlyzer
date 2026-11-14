'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function verify(root,{checkSources=true}={}){
 const errors=[],get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
 const lab=get('data/evidence/lab.json');
 if(lab.schema!=='nz-evidence-lab-2')errors.push('Unsupported Lab schema');
 if(checkSources){const fresh=require('./build_evidence_lab.js').fingerprint(get('data/meta.json'));if(lab.input_sha256!==fresh.sha256)errors.push('Source inputs changed after the Lab build');}
 const active=Object.keys(lab.profiles||{}).filter(p=>lab.profiles[p].active),ccs=Object.keys(lab.countries||{});let count=0;
 for(const cc of ccs){
  const ref=lab.details?.[cc];if(!ref||!/^\/data\/evidence\/lab-detail\/[A-Z]{2}\.json$/.test(ref.path)){errors.push(cc+': unsafe or missing detail path');continue;}
  const file=path.join(root,ref.path.slice(1));if(!fs.existsSync(file)){errors.push(cc+': detail missing');continue;}
  const bytes=fs.readFileSync(file);if(sha(bytes)!==ref.sha256)errors.push(cc+': detail checksum changed');const d=JSON.parse(bytes);
  if(d.country!==cc||d.input_sha256!==lab.input_sha256||d.schema!=='nz-evidence-lab-detail-2')errors.push(cc+': mixed snapshot');
  for(const p of active){const x=lab.countries[cc].profiles[p];count++;if(!x||!d.profiles[p]){errors.push(cc+'/'+p+': missing cell');continue;}
   if(x.validation!=='not_tested')errors.push(cc+'/'+p+': unsupported validation claim');
   if(x.rho!==null&&(!Number.isFinite(x.rho)||Math.abs(x.rho)>1))errors.push(cc+'/'+p+': invalid correlation');
   if(x.rankedPlaces+x.excludedPlaces!==x.activePlaces||x.linkedPlaces>x.rankedPlaces||x.units>x.linkedPlaces)errors.push(cc+'/'+p+': inconsistent denominators');
   if(x.status==='missing_outcome'&&x.linkedPlaces!==0)errors.push(cc+'/'+p+': missing-state contradiction');
  }
 }
 const page=fs.readFileSync(path.join(root,'evidence-lab/index.html'),'utf8');if(!page.includes('data-input-sha="'+lab.input_sha256+'"')&&!page.includes('data-input-sha='+lab.input_sha256))errors.push('HTML and JSON snapshot differ');
 for(const f of ['assets/evidence-lab.js','assets/evidence-lab.css'])if(!fs.existsSync(path.join(root,f)))errors.push('Runtime asset missing: '+f);
 if(count!==lab.summary.countryProfileCells)errors.push('Summary cell count mismatch');
 if(lab.summary.independentlyValidated!==0||lab.model.weights_changed!==false)errors.push('Unsupported model promotion');
 if(errors.length)throw Error(errors.join('\n'));
 return {countries:ccs.length,profiles:active.length,cells:count,snapshot:lab.input_sha256,errors:0};
}
module.exports={verify};
if(require.main===module){try{console.log(JSON.stringify(verify(path.resolve(process.argv[2]||path.join(__dirname,'..')),{checkSources:!process.argv.includes('--published')})));}catch(e){console.error(e.message);process.exitCode=1;}}
