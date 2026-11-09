/** Build-time integrity check. It verifies recorded decisions, not their legal correctness. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
export function validateEmblems(root) {
 const file=path.join(root,'data/emblems-reviewed.json');
 const m=JSON.parse(fs.readFileSync(file,'utf8'));
 if(m.schema!=='nestlyzer-reviewed-emblems-1'||!m.items||Array.isArray(m.items))throw Error('Invalid emblem manifest');
 let count=0;
 for(const [id,x]of Object.entries(m.items)) {
  if(x.place_id!==id||x.permitted_use_reviewed!==true||!x.attribution||!x.licence||!x.reviewed_by||!/^\d{4}-\d{2}-\d{2}$/.test(x.reviewed_on||'')||!/^https?:\/\//.test(x.source_url||''))throw Error('Incomplete emblem review '+id);
  if(!/^\/assets\/arms\/[A-Za-z0-9_.-]+\.(png|webp|svg)$/.test(x.asset||'')||x.asset.includes('..'))throw Error('Invalid asset path '+id);
  const f=path.join(root,x.asset.slice(1));if(!fs.existsSync(f)||fs.lstatSync(f).isSymbolicLink())throw Error('Missing or linked asset '+id);
  const bytes=fs.readFileSync(f);if(bytes.length>150000)throw Error('Emblem exceeds 150 kB '+id);
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==x.sha256)throw Error('Emblem hash mismatch '+id);
  if(x.asset.endsWith('.svg')){
   const s=bytes.toString('utf8');
   if(!/<svg[\s>]/i.test(s)||/<(?:script|foreignObject|iframe|image|use|style)\b|\bon[a-z]+\s*=|(?:xlink:)?href\s*=|url\s*\(|<!ENTITY|<!DOCTYPE/i.test(s))throw Error('External or active SVG content '+id);
  } else if(x.asset.endsWith('.png')) {
   if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Not a PNG '+id);
  } else if(bytes.subarray(0,4).toString()!=='RIFF'||bytes.subarray(8,12).toString()!=='WEBP')throw Error('Not a WebP '+id);
  count++;
 }
 return {records:count,scope:'Recorded review and file-integrity check; no rights or official endorsement certification.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(validateEmblems(path.resolve(process.argv[2]||'.'))));}catch(e){console.error(e.message);process.exit(1);}
}
